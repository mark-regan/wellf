package services

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/mark-regan/wellf/internal/models"
)

// RecipeScraper extracts recipe data from URLs
type RecipeScraper struct {
	client *http.Client
}

// NewRecipeScraper creates a new recipe scraper
func NewRecipeScraper() *RecipeScraper {
	return &RecipeScraper{
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// ScrapedRecipe represents recipe data extracted from a URL
type ScrapedRecipe struct {
	Title            string              `json:"title"`
	Description      string              `json:"description,omitempty"`
	ImageURL         string              `json:"image_url,omitempty"`
	SourceURL        string              `json:"source_url"`
	SourceName       string              `json:"source_name"`
	PrepTimeMinutes  *int                `json:"prep_time_minutes,omitempty"`
	CookTimeMinutes  *int                `json:"cook_time_minutes,omitempty"`
	TotalTimeMinutes *int                `json:"total_time_minutes,omitempty"`
	Servings         *int                `json:"servings,omitempty"`
	ServingsUnit     string              `json:"servings_unit,omitempty"`
	Ingredients      []models.Ingredient `json:"ingredients"`
	Instructions     []models.Instruction `json:"instructions"`
	Cuisine          string              `json:"cuisine,omitempty"`
	Course           string              `json:"course,omitempty"`
	DietTags         []string            `json:"diet_tags,omitempty"`
	Nutrition        *models.Nutrition   `json:"nutrition,omitempty"`
}

// SchemaOrgRecipe represents a schema.org/Recipe JSON-LD object
type SchemaOrgRecipe struct {
	Context           interface{} `json:"@context"`
	Type              interface{} `json:"@type"`
	Name              string      `json:"name"`
	Description       string      `json:"description"`
	Image             interface{} `json:"image"` // can be string or object or array
	Author            interface{} `json:"author"`
	PrepTime          string      `json:"prepTime"`
	CookTime          string      `json:"cookTime"`
	TotalTime         string      `json:"totalTime"`
	RecipeYield       interface{} `json:"recipeYield"` // can be string or array
	RecipeIngredient  []string    `json:"recipeIngredient"`
	RecipeInstructions interface{} `json:"recipeInstructions"` // can be string, array of strings, or array of HowToStep
	RecipeCategory    interface{} `json:"recipeCategory"` // can be string or array
	RecipeCuisine     interface{} `json:"recipeCuisine"` // can be string or array
	Keywords          interface{} `json:"keywords"`
	Nutrition         *struct {
		Calories       string `json:"calories"`
		Carbohydrates  string `json:"carbohydrateContent"`
		Protein        string `json:"proteinContent"`
		Fat            string `json:"fatContent"`
		Fiber          string `json:"fiberContent"`
		Sugar          string `json:"sugarContent"`
		Sodium         string `json:"sodiumContent"`
		SaturatedFat   string `json:"saturatedFatContent"`
		Cholesterol    string `json:"cholesterolContent"`
	} `json:"nutrition"`
}

// ScrapeRecipe fetches and parses recipe data from a URL
func (s *RecipeScraper) ScrapeRecipe(recipeURL string) (*ScrapedRecipe, error) {
	// Validate URL
	parsedURL, err := url.Parse(recipeURL)
	if err != nil {
		return nil, fmt.Errorf("invalid URL: %w", err)
	}

	if parsedURL.Scheme != "http" && parsedURL.Scheme != "https" {
		return nil, fmt.Errorf("URL must use http or https scheme")
	}

	// Fetch the page
	req, err := http.NewRequest("GET", recipeURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers to mimic a browser
	req.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
	req.Header.Set("Accept-Language", "en-GB,en;q=0.9")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch URL: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("received status code %d", resp.StatusCode)
	}

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	html := string(body)

	// Try to extract JSON-LD structured data
	recipe, err := s.extractJSONLD(html)
	if err == nil && recipe.Title != "" {
		recipe.SourceURL = recipeURL
		recipe.SourceName = parsedURL.Host
		return recipe, nil
	}

	// Fallback: basic HTML parsing
	recipe, err = s.extractFromHTML(html)
	if err == nil && recipe.Title != "" {
		recipe.SourceURL = recipeURL
		recipe.SourceName = parsedURL.Host
		return recipe, nil
	}

	return nil, fmt.Errorf("could not extract recipe data from page")
}

// extractJSONLD extracts recipe data from JSON-LD script tags
func (s *RecipeScraper) extractJSONLD(html string) (*ScrapedRecipe, error) {
	// Find JSON-LD script tags
	re := regexp.MustCompile(`<script[^>]*type="application/ld\+json"[^>]*>([\s\S]*?)</script>`)
	matches := re.FindAllStringSubmatch(html, -1)

	for _, match := range matches {
		if len(match) < 2 {
			continue
		}

		jsonStr := strings.TrimSpace(match[1])

		// Try to parse as single object
		var schemaRecipe SchemaOrgRecipe
		if err := json.Unmarshal([]byte(jsonStr), &schemaRecipe); err == nil {
			if s.isRecipeType(schemaRecipe.Type) {
				return s.convertSchemaRecipe(&schemaRecipe), nil
			}
		}

		// Try to parse as array (some sites return an array of schema objects)
		var schemaArray []json.RawMessage
		if err := json.Unmarshal([]byte(jsonStr), &schemaArray); err == nil {
			for _, item := range schemaArray {
				var sr SchemaOrgRecipe
				if err := json.Unmarshal(item, &sr); err == nil {
					if s.isRecipeType(sr.Type) {
						return s.convertSchemaRecipe(&sr), nil
					}
				}
			}
		}

		// Try to parse as @graph (some sites use this format)
		var graphObj struct {
			Graph []json.RawMessage `json:"@graph"`
		}
		if err := json.Unmarshal([]byte(jsonStr), &graphObj); err == nil {
			for _, item := range graphObj.Graph {
				var sr SchemaOrgRecipe
				if err := json.Unmarshal(item, &sr); err == nil {
					if s.isRecipeType(sr.Type) {
						return s.convertSchemaRecipe(&sr), nil
					}
				}
			}
		}
	}

	return nil, fmt.Errorf("no recipe JSON-LD found")
}

// isRecipeType checks if the @type is Recipe
func (s *RecipeScraper) isRecipeType(t interface{}) bool {
	switch v := t.(type) {
	case string:
		return strings.Contains(strings.ToLower(v), "recipe")
	case []interface{}:
		for _, item := range v {
			if str, ok := item.(string); ok {
				if strings.Contains(strings.ToLower(str), "recipe") {
					return true
				}
			}
		}
	}
	return false
}

// convertSchemaRecipe converts schema.org recipe to our format
func (s *RecipeScraper) convertSchemaRecipe(sr *SchemaOrgRecipe) *ScrapedRecipe {
	recipe := &ScrapedRecipe{
		Title:       sr.Name,
		Description: sr.Description,
	}

	// Extract image
	recipe.ImageURL = s.extractImage(sr.Image)

	// Parse times
	recipe.PrepTimeMinutes = s.parseDuration(sr.PrepTime)
	recipe.CookTimeMinutes = s.parseDuration(sr.CookTime)
	recipe.TotalTimeMinutes = s.parseDuration(sr.TotalTime)

	// Parse servings
	recipe.Servings, recipe.ServingsUnit = s.parseServings(sr.RecipeYield)

	// Convert ingredients
	for _, ing := range sr.RecipeIngredient {
		parsed := s.parseIngredient(ing)
		recipe.Ingredients = append(recipe.Ingredients, parsed)
	}

	// Convert instructions
	recipe.Instructions = s.parseInstructions(sr.RecipeInstructions)

	// Extract cuisine
	recipe.Cuisine = s.extractStringOrFirst(sr.RecipeCuisine)

	// Extract course/category
	recipe.Course = s.extractStringOrFirst(sr.RecipeCategory)

	// Extract nutrition
	if sr.Nutrition != nil {
		recipe.Nutrition = &models.Nutrition{
			Calories:      s.parseNutritionValue(sr.Nutrition.Calories),
			Carbohydrates: s.parseNutritionValue(sr.Nutrition.Carbohydrates),
			Protein:       s.parseNutritionValue(sr.Nutrition.Protein),
			Fat:           s.parseNutritionValue(sr.Nutrition.Fat),
			Fiber:         s.parseNutritionValue(sr.Nutrition.Fiber),
			Sugar:         s.parseNutritionValue(sr.Nutrition.Sugar),
			Sodium:        s.parseNutritionValue(sr.Nutrition.Sodium),
		}
	}

	return recipe
}

// extractImage extracts image URL from various formats
func (s *RecipeScraper) extractImage(img interface{}) string {
	switch v := img.(type) {
	case string:
		return v
	case []interface{}:
		if len(v) > 0 {
			if str, ok := v[0].(string); ok {
				return str
			}
			if obj, ok := v[0].(map[string]interface{}); ok {
				if url, ok := obj["url"].(string); ok {
					return url
				}
			}
		}
	case map[string]interface{}:
		if url, ok := v["url"].(string); ok {
			return url
		}
	}
	return ""
}

// parseDuration parses ISO 8601 duration to minutes
func (s *RecipeScraper) parseDuration(duration string) *int {
	if duration == "" {
		return nil
	}

	// Handle ISO 8601 duration format (PT30M, PT1H30M, etc.)
	re := regexp.MustCompile(`PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?`)
	matches := re.FindStringSubmatch(duration)

	if len(matches) > 0 {
		var minutes int
		if matches[1] != "" {
			hours, _ := strconv.Atoi(matches[1])
			minutes += hours * 60
		}
		if matches[2] != "" {
			mins, _ := strconv.Atoi(matches[2])
			minutes += mins
		}
		if minutes > 0 {
			return &minutes
		}
	}

	// Try simple number
	if mins, err := strconv.Atoi(duration); err == nil {
		return &mins
	}

	return nil
}

// parseServings parses serving information
func (s *RecipeScraper) parseServings(yield interface{}) (*int, string) {
	var servingsStr string

	switch v := yield.(type) {
	case string:
		servingsStr = v
	case []interface{}:
		if len(v) > 0 {
			if str, ok := v[0].(string); ok {
				servingsStr = str
			}
		}
	case float64:
		num := int(v)
		return &num, "servings"
	}

	if servingsStr == "" {
		return nil, ""
	}

	// Extract number from string like "4 servings" or "Makes 12"
	re := regexp.MustCompile(`(\d+)`)
	if matches := re.FindStringSubmatch(servingsStr); len(matches) > 1 {
		num, _ := strconv.Atoi(matches[1])

		// Try to determine unit
		unit := "servings"
		lower := strings.ToLower(servingsStr)
		if strings.Contains(lower, "cup") {
			unit = "cups"
		} else if strings.Contains(lower, "portion") {
			unit = "portions"
		} else if strings.Contains(lower, "piece") {
			unit = "pieces"
		} else if strings.Contains(lower, "cookie") || strings.Contains(lower, "biscuit") {
			unit = "cookies"
		}

		return &num, unit
	}

	return nil, ""
}

// parseIngredient parses an ingredient string into structured format
func (s *RecipeScraper) parseIngredient(ing string) models.Ingredient {
	ing = strings.TrimSpace(ing)

	// Try to extract amount and unit from the beginning
	// Pattern: "2 cups flour" or "1/2 tsp salt" or "3-4 medium tomatoes"
	amountRe := regexp.MustCompile(`^([\d\s/\-\.]+)\s*(cup|cups|tbsp|tablespoon|tablespoons|tsp|teaspoon|teaspoons|oz|ounce|ounces|g|gram|grams|kg|kilogram|kilograms|lb|lbs|pound|pounds|ml|millilitre|millilitres|l|litre|litres|small|medium|large|clove|cloves|head|heads|bunch|bunches|can|cans|tin|tins|pack|packs|packet|packets|slice|slices|piece|pieces)?\s*(.*)`)

	if matches := amountRe.FindStringSubmatch(ing); len(matches) == 4 {
		amount := strings.TrimSpace(matches[1])
		unit := strings.TrimSpace(matches[2])
		name := strings.TrimSpace(matches[3])

		if name != "" {
			return models.Ingredient{
				Name:   name,
				Amount: amount,
				Unit:   unit,
			}
		}
	}

	// Fallback: just use the whole string as the name
	return models.Ingredient{
		Name: ing,
	}
}

// parseInstructions parses instructions from various formats
func (s *RecipeScraper) parseInstructions(instr interface{}) []models.Instruction {
	var instructions []models.Instruction

	switch v := instr.(type) {
	case string:
		// Single string, split by newlines or numbered steps
		steps := s.splitInstructions(v)
		for i, step := range steps {
			instructions = append(instructions, models.Instruction{
				Step: i + 1,
				Text: step,
			})
		}

	case []interface{}:
		for i, item := range v {
			switch inst := item.(type) {
			case string:
				instructions = append(instructions, models.Instruction{
					Step: i + 1,
					Text: strings.TrimSpace(inst),
				})
			case map[string]interface{}:
				// HowToStep or HowToSection
				if text, ok := inst["text"].(string); ok {
					instructions = append(instructions, models.Instruction{
						Step: len(instructions) + 1,
						Text: strings.TrimSpace(text),
					})
				} else if itemListElement, ok := inst["itemListElement"].([]interface{}); ok {
					// HowToSection with nested steps
					for _, subItem := range itemListElement {
						if subMap, ok := subItem.(map[string]interface{}); ok {
							if text, ok := subMap["text"].(string); ok {
								instructions = append(instructions, models.Instruction{
									Step: len(instructions) + 1,
									Text: strings.TrimSpace(text),
								})
							}
						}
					}
				}
			}
		}
	}

	return instructions
}

// splitInstructions splits a single instruction string into steps
func (s *RecipeScraper) splitInstructions(text string) []string {
	text = strings.TrimSpace(text)
	var steps []string

	// Try splitting by numbered pattern "1." or "Step 1:"
	numberedRe := regexp.MustCompile(`(?m)^\s*(?:Step\s+)?(\d+)[\.\):\s]+(.+)`)
	if matches := numberedRe.FindAllStringSubmatch(text, -1); len(matches) > 1 {
		for _, m := range matches {
			if step := strings.TrimSpace(m[2]); step != "" {
				steps = append(steps, step)
			}
		}
		return steps
	}

	// Split by double newlines or periods followed by newlines
	parts := regexp.MustCompile(`\n\n+|\.\s*\n`).Split(text, -1)
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part != "" {
			// Remove leading numbers if present
			part = regexp.MustCompile(`^\d+[\.\):\s]+`).ReplaceAllString(part, "")
			if part != "" {
				steps = append(steps, part)
			}
		}
	}

	if len(steps) == 0 && text != "" {
		steps = append(steps, text)
	}

	return steps
}

// extractStringOrFirst extracts a string or first element from array
func (s *RecipeScraper) extractStringOrFirst(v interface{}) string {
	switch val := v.(type) {
	case string:
		return val
	case []interface{}:
		if len(val) > 0 {
			if str, ok := val[0].(string); ok {
				return str
			}
		}
	}
	return ""
}

// parseNutritionValue extracts numeric value from nutrition string
func (s *RecipeScraper) parseNutritionValue(v string) string {
	// Return the nutrition value as-is (e.g., "250 calories", "10g")
	return v
}

// extractFromHTML is a fallback method that tries basic HTML parsing
func (s *RecipeScraper) extractFromHTML(html string) (*ScrapedRecipe, error) {
	recipe := &ScrapedRecipe{}

	// Try to extract title from various sources
	titlePatterns := []string{
		`<meta property="og:title" content="([^"]+)"`,
		`<title>([^<]+)</title>`,
		`<h1[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)</h1>`,
		`<h1[^>]*>([^<]+)</h1>`,
	}

	for _, pattern := range titlePatterns {
		re := regexp.MustCompile(pattern)
		if matches := re.FindStringSubmatch(html); len(matches) > 1 {
			recipe.Title = strings.TrimSpace(matches[1])
			break
		}
	}

	// Try to extract image
	imagePatterns := []string{
		`<meta property="og:image" content="([^"]+)"`,
		`<img[^>]*class="[^"]*recipe[^"]*"[^>]*src="([^"]+)"`,
	}

	for _, pattern := range imagePatterns {
		re := regexp.MustCompile(pattern)
		if matches := re.FindStringSubmatch(html); len(matches) > 1 {
			recipe.ImageURL = matches[1]
			break
		}
	}

	// Try to extract description
	descPatterns := []string{
		`<meta property="og:description" content="([^"]+)"`,
		`<meta name="description" content="([^"]+)"`,
	}

	for _, pattern := range descPatterns {
		re := regexp.MustCompile(pattern)
		if matches := re.FindStringSubmatch(html); len(matches) > 1 {
			recipe.Description = strings.TrimSpace(matches[1])
			break
		}
	}

	if recipe.Title == "" {
		return nil, fmt.Errorf("could not extract recipe title")
	}

	return recipe, nil
}
