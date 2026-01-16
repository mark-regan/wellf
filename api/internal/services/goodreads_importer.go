package services

import (
	"encoding/csv"
	"fmt"
	"io"
	"strconv"
	"strings"
	"time"

	"github.com/mark-regan/wellf/internal/models"
)

// GoodreadsImporter handles parsing and importing Goodreads CSV exports
type GoodreadsImporter struct{}

// NewGoodreadsImporter creates a new Goodreads importer
func NewGoodreadsImporter() *GoodreadsImporter {
	return &GoodreadsImporter{}
}

// GoodreadsBook represents a parsed book from Goodreads CSV
type GoodreadsBook struct {
	BookID             string
	Title              string
	Author             string
	AdditionalAuthors  string
	ISBN               string
	ISBN13             string
	MyRating           int
	AverageRating      float64
	Publisher          string
	Binding            string
	NumberOfPages      int
	YearPublished      int
	OriginalPubYear    int
	DateRead           *time.Time
	DateAdded          *time.Time
	Bookshelves        []string
	ExclusiveShelf     string // read, currently-reading, to-read
	MyReview           string
	OwnedCopies        int
}

// ImportResult contains the results of an import operation
type ImportResult struct {
	BooksImported     int                `json:"books_imported"`
	BooksSkipped      int                `json:"books_skipped"`
	BooksUpdated      int                `json:"books_updated"`
	Errors            []string           `json:"errors,omitempty"`
	ImportedBooks     []*GoodreadsBook   `json:"-"`
}

// ParseCSV parses a Goodreads CSV export file
func (g *GoodreadsImporter) ParseCSV(reader io.Reader) ([]*GoodreadsBook, error) {
	csvReader := csv.NewReader(reader)
	csvReader.LazyQuotes = true

	// Read header row
	header, err := csvReader.Read()
	if err != nil {
		return nil, fmt.Errorf("failed to read CSV header: %w", err)
	}

	// Build column index map
	colIndex := make(map[string]int)
	for i, col := range header {
		colIndex[strings.TrimSpace(col)] = i
	}

	// Validate required columns
	requiredCols := []string{"Title", "Author"}
	for _, col := range requiredCols {
		if _, ok := colIndex[col]; !ok {
			return nil, fmt.Errorf("missing required column: %s", col)
		}
	}

	var books []*GoodreadsBook

	lineNum := 1
	for {
		record, err := csvReader.Read()
		if err == io.EOF {
			break
		}
		lineNum++
		if err != nil {
			// Skip malformed rows but continue
			continue
		}

		book := g.parseRecord(record, colIndex)
		if book != nil && book.Title != "" {
			books = append(books, book)
		}
	}

	return books, nil
}

// parseRecord converts a CSV record to a GoodreadsBook
func (g *GoodreadsImporter) parseRecord(record []string, colIndex map[string]int) *GoodreadsBook {
	getCol := func(name string) string {
		if idx, ok := colIndex[name]; ok && idx < len(record) {
			return strings.TrimSpace(record[idx])
		}
		return ""
	}

	book := &GoodreadsBook{
		BookID:            getCol("Book Id"),
		Title:             getCol("Title"),
		Author:            getCol("Author"),
		AdditionalAuthors: getCol("Additional Authors"),
		ISBN:              cleanISBN(getCol("ISBN")),
		ISBN13:            cleanISBN(getCol("ISBN13")),
		Publisher:         getCol("Publisher"),
		Binding:           getCol("Binding"),
		ExclusiveShelf:    getCol("Exclusive Shelf"),
		MyReview:          getCol("My Review"),
	}

	// Parse numeric fields
	if rating := getCol("My Rating"); rating != "" {
		if r, err := strconv.Atoi(rating); err == nil {
			book.MyRating = r
		}
	}

	if avgRating := getCol("Average Rating"); avgRating != "" {
		if r, err := strconv.ParseFloat(avgRating, 64); err == nil {
			book.AverageRating = r
		}
	}

	if pages := getCol("Number of Pages"); pages != "" {
		if p, err := strconv.Atoi(pages); err == nil {
			book.NumberOfPages = p
		}
	}

	if year := getCol("Year Published"); year != "" {
		if y, err := strconv.Atoi(year); err == nil {
			book.YearPublished = y
		}
	}

	if year := getCol("Original Publication Year"); year != "" {
		if y, err := strconv.Atoi(year); err == nil {
			book.OriginalPubYear = y
		}
	}

	if owned := getCol("Owned Copies"); owned != "" {
		if o, err := strconv.Atoi(owned); err == nil {
			book.OwnedCopies = o
		}
	}

	// Parse dates
	if dateRead := getCol("Date Read"); dateRead != "" {
		if t := parseGoodreadsDate(dateRead); t != nil {
			book.DateRead = t
		}
	}

	if dateAdded := getCol("Date Added"); dateAdded != "" {
		if t := parseGoodreadsDate(dateAdded); t != nil {
			book.DateAdded = t
		}
	}

	// Parse bookshelves
	if shelves := getCol("Bookshelves"); shelves != "" {
		book.Bookshelves = parseCommaList(shelves)
	}

	return book
}

// cleanISBN removes quotes and equals signs from ISBN values
// Goodreads exports ISBNs like ="0123456789"
func cleanISBN(isbn string) string {
	isbn = strings.TrimSpace(isbn)
	isbn = strings.Trim(isbn, `="`)
	return isbn
}

// parseGoodreadsDate parses date strings from Goodreads
// Formats: "2024/01/15", "2024-01-15", "Jan 15, 2024"
func parseGoodreadsDate(dateStr string) *time.Time {
	dateStr = strings.TrimSpace(dateStr)
	if dateStr == "" {
		return nil
	}

	formats := []string{
		"2006/01/02",
		"2006-01-02",
		"Jan 2, 2006",
		"January 2, 2006",
		"01/02/2006",
		"02/01/2006",
	}

	for _, format := range formats {
		if t, err := time.Parse(format, dateStr); err == nil {
			return &t
		}
	}

	// Try parsing year only
	if len(dateStr) == 4 {
		if year, err := strconv.Atoi(dateStr); err == nil && year > 1900 && year < 2100 {
			t := time.Date(year, 1, 1, 0, 0, 0, 0, time.UTC)
			return &t
		}
	}

	return nil
}

// parseCommaList splits a comma-separated list
func parseCommaList(s string) []string {
	parts := strings.Split(s, ",")
	var result []string
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part != "" {
			result = append(result, part)
		}
	}
	return result
}

// ToCreateBookRequest converts a GoodreadsBook to a CreateBookRequest
func (g *GoodreadsBook) ToCreateBookRequest() *models.CreateBookRequest {
	var authors []string
	if g.Author != "" {
		authors = append(authors, g.Author)
	}
	if g.AdditionalAuthors != "" {
		for _, author := range parseCommaList(g.AdditionalAuthors) {
			authors = append(authors, author)
		}
	}

	var pageCount *int
	if g.NumberOfPages > 0 {
		pageCount = &g.NumberOfPages
	}

	var publishedDate string
	if g.YearPublished > 0 {
		publishedDate = strconv.Itoa(g.YearPublished)
	} else if g.OriginalPubYear > 0 {
		publishedDate = strconv.Itoa(g.OriginalPubYear)
	}

	// Determine format from binding
	format := models.BookFormatPhysical
	binding := strings.ToLower(g.Binding)
	if strings.Contains(binding, "kindle") || strings.Contains(binding, "ebook") || strings.Contains(binding, "e-book") {
		format = models.BookFormatEbook
	} else if strings.Contains(binding, "audio") {
		format = models.BookFormatAudiobook
	}

	return &models.CreateBookRequest{
		ISBN10:        g.ISBN,
		ISBN13:        g.ISBN13,
		Title:         g.Title,
		Authors:       authors,
		Publisher:     g.Publisher,
		PublishedDate: publishedDate,
		PageCount:     pageCount,
		Format:        format,
		Owned:         g.OwnedCopies > 0,
	}
}

// GetTargetListType returns the reading list type based on Goodreads shelf
func (g *GoodreadsBook) GetTargetListType() string {
	switch strings.ToLower(g.ExclusiveShelf) {
	case "read":
		return models.ReadingListTypeRead
	case "currently-reading":
		return models.ReadingListTypeReading
	case "to-read":
		return models.ReadingListTypeToRead
	default:
		return models.ReadingListTypeToRead
	}
}

// GetProgressUpdate returns the progress update for the book
func (g *GoodreadsBook) GetProgressUpdate() *models.UpdateReadingProgressRequest {
	update := &models.UpdateReadingProgressRequest{}

	if g.MyRating > 0 {
		update.Rating = &g.MyRating
	}

	if g.DateRead != nil {
		update.DateFinished = g.DateRead
	}

	if g.DateAdded != nil {
		update.DateStarted = g.DateAdded
	}

	if g.MyReview != "" {
		update.Review = &g.MyReview
	}

	// Set progress to 100% if book is in "read" shelf
	if g.ExclusiveShelf == "read" {
		pct := 100
		update.ProgressPct = &pct
		if g.NumberOfPages > 0 {
			update.CurrentPage = &g.NumberOfPages
		}
	}

	return update
}
