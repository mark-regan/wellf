package services

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// DataExportService handles exporting user data
type DataExportService struct {
	pool *pgxpool.Pool
}

// NewDataExportService creates a new data export service
func NewDataExportService(pool *pgxpool.Pool) *DataExportService {
	return &DataExportService{pool: pool}
}

// ExportFormat specifies the export format
type ExportFormat string

const (
	ExportFormatJSON ExportFormat = "json"
	ExportFormatCSV  ExportFormat = "csv"
)

// UserDataExport contains all exported user data
type UserDataExport struct {
	ExportedAt   time.Time              `json:"exported_at"`
	User         map[string]interface{} `json:"user"`
	Portfolios   []map[string]interface{} `json:"portfolios,omitempty"`
	Holdings     []map[string]interface{} `json:"holdings,omitempty"`
	Transactions []map[string]interface{} `json:"transactions,omitempty"`
	Recipes      []map[string]interface{} `json:"recipes,omitempty"`
	MealPlans    []map[string]interface{} `json:"meal_plans,omitempty"`
	Books        []map[string]interface{} `json:"books,omitempty"`
	ReadingLists []map[string]interface{} `json:"reading_lists,omitempty"`
	Plants       []map[string]interface{} `json:"plants,omitempty"`
	PlantCareLogs []map[string]interface{} `json:"plant_care_logs,omitempty"`
	Bills        []map[string]interface{} `json:"bills,omitempty"`
	Subscriptions []map[string]interface{} `json:"subscriptions,omitempty"`
	Insurance    []map[string]interface{} `json:"insurance_policies,omitempty"`
	Maintenance  []map[string]interface{} `json:"maintenance_tasks,omitempty"`
	Reminders    []map[string]interface{} `json:"reminders,omitempty"`
	Snippets     []map[string]interface{} `json:"code_snippets,omitempty"`
	Templates    []map[string]interface{} `json:"project_templates,omitempty"`
}

// ExportUserData exports all user data as JSON
func (s *DataExportService) ExportUserData(ctx context.Context, userID uuid.UUID) (*UserDataExport, error) {
	export := &UserDataExport{
		ExportedAt: time.Now().UTC(),
	}

	// Export user profile
	user, err := s.exportUser(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to export user: %w", err)
	}
	export.User = user

	// Export portfolios and holdings
	export.Portfolios, _ = s.exportTable(ctx, userID, "portfolios", "user_id")
	export.Holdings, _ = s.exportHoldings(ctx, userID)
	export.Transactions, _ = s.exportTransactions(ctx, userID)

	// Export cooking data
	export.Recipes, _ = s.exportTable(ctx, userID, "recipes", "user_id")
	export.MealPlans, _ = s.exportTable(ctx, userID, "meal_plans", "user_id")

	// Export reading data
	export.Books, _ = s.exportTable(ctx, userID, "books", "user_id")
	export.ReadingLists, _ = s.exportTable(ctx, userID, "reading_lists", "user_id")

	// Export plants data
	export.Plants, _ = s.exportTable(ctx, userID, "plants", "user_id")
	export.PlantCareLogs, _ = s.exportPlantCareLogs(ctx, userID)

	// Export household data
	export.Bills, _ = s.exportTable(ctx, userID, "bills", "user_id")
	export.Subscriptions, _ = s.exportTable(ctx, userID, "subscriptions", "user_id")
	export.Insurance, _ = s.exportTable(ctx, userID, "insurance_policies", "user_id")
	export.Maintenance, _ = s.exportTable(ctx, userID, "maintenance_tasks", "user_id")

	// Export calendar data
	export.Reminders, _ = s.exportTable(ctx, userID, "reminders", "user_id")

	// Export coding data
	export.Snippets, _ = s.exportTable(ctx, userID, "code_snippets", "user_id")
	export.Templates, _ = s.exportTable(ctx, userID, "project_templates", "user_id")

	return export, nil
}

// ExportAsZip creates a ZIP file containing JSON and CSV exports
func (s *DataExportService) ExportAsZip(ctx context.Context, userID uuid.UUID) ([]byte, error) {
	export, err := s.ExportUserData(ctx, userID)
	if err != nil {
		return nil, err
	}

	var buf bytes.Buffer
	zipWriter := zip.NewWriter(&buf)

	// Add full JSON export
	jsonData, err := json.MarshalIndent(export, "", "  ")
	if err != nil {
		return nil, fmt.Errorf("failed to marshal JSON: %w", err)
	}
	jsonFile, _ := zipWriter.Create("full_export.json")
	jsonFile.Write(jsonData)

	// Add individual CSV files for major data types
	if len(export.Portfolios) > 0 {
		s.addCSVToZip(zipWriter, "portfolios.csv", export.Portfolios)
	}
	if len(export.Holdings) > 0 {
		s.addCSVToZip(zipWriter, "holdings.csv", export.Holdings)
	}
	if len(export.Transactions) > 0 {
		s.addCSVToZip(zipWriter, "transactions.csv", export.Transactions)
	}
	if len(export.Recipes) > 0 {
		s.addCSVToZip(zipWriter, "recipes.csv", export.Recipes)
	}
	if len(export.Books) > 0 {
		s.addCSVToZip(zipWriter, "books.csv", export.Books)
	}
	if len(export.Plants) > 0 {
		s.addCSVToZip(zipWriter, "plants.csv", export.Plants)
	}
	if len(export.Bills) > 0 {
		s.addCSVToZip(zipWriter, "bills.csv", export.Bills)
	}
	if len(export.Subscriptions) > 0 {
		s.addCSVToZip(zipWriter, "subscriptions.csv", export.Subscriptions)
	}
	if len(export.Reminders) > 0 {
		s.addCSVToZip(zipWriter, "reminders.csv", export.Reminders)
	}

	// Add metadata
	metadata := map[string]interface{}{
		"exported_at":    export.ExportedAt,
		"user_email":     export.User["email"],
		"export_version": "1.0",
	}
	metaData, _ := json.MarshalIndent(metadata, "", "  ")
	metaFile, _ := zipWriter.Create("metadata.json")
	metaFile.Write(metaData)

	if err := zipWriter.Close(); err != nil {
		return nil, fmt.Errorf("failed to close zip: %w", err)
	}

	return buf.Bytes(), nil
}

func (s *DataExportService) exportUser(ctx context.Context, userID uuid.UUID) (map[string]interface{}, error) {
	query := `
		SELECT id, email, display_name, base_currency, date_format, locale,
			fire_target, fire_enabled, theme, phone_number, date_of_birth,
			notify_email, notify_price_alerts, notify_weekly, notify_monthly,
			watchlist, created_at, last_login_at
		FROM users WHERE id = $1`

	row := s.pool.QueryRow(ctx, query, userID)

	var user map[string]interface{}
	var id, email, displayName, baseCurrency, dateFormat, locale, theme string
	var fireTarget *float64
	var fireEnabled, notifyEmail, notifyPriceAlerts, notifyWeekly, notifyMonthly bool
	var phoneNumber, watchlist *string
	var dateOfBirth, createdAt, lastLoginAt *time.Time

	err := row.Scan(&id, &email, &displayName, &baseCurrency, &dateFormat, &locale,
		&fireTarget, &fireEnabled, &theme, &phoneNumber, &dateOfBirth,
		&notifyEmail, &notifyPriceAlerts, &notifyWeekly, &notifyMonthly,
		&watchlist, &createdAt, &lastLoginAt)
	if err != nil {
		return nil, err
	}

	user = map[string]interface{}{
		"id":            id,
		"email":         email,
		"display_name":  displayName,
		"base_currency": baseCurrency,
		"date_format":   dateFormat,
		"locale":        locale,
		"fire_target":   fireTarget,
		"fire_enabled":  fireEnabled,
		"theme":         theme,
		"phone_number":  phoneNumber,
		"date_of_birth": dateOfBirth,
		"created_at":    createdAt,
	}

	return user, nil
}

func (s *DataExportService) exportTable(ctx context.Context, userID uuid.UUID, tableName, userColumn string) ([]map[string]interface{}, error) {
	query := fmt.Sprintf("SELECT * FROM %s WHERE %s = $1", tableName, userColumn)

	rows, err := s.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	fieldDescs := rows.FieldDescriptions()
	var results []map[string]interface{}

	for rows.Next() {
		values, err := rows.Values()
		if err != nil {
			continue
		}

		row := make(map[string]interface{})
		for i, fd := range fieldDescs {
			// Skip password_hash and sensitive fields
			fieldName := string(fd.Name)
			if fieldName == "password_hash" || fieldName == "totp_secret" {
				continue
			}
			row[fieldName] = values[i]
		}
		results = append(results, row)
	}

	return results, nil
}

func (s *DataExportService) exportHoldings(ctx context.Context, userID uuid.UUID) ([]map[string]interface{}, error) {
	query := `
		SELECT h.* FROM holdings h
		JOIN portfolios p ON h.portfolio_id = p.id
		WHERE p.user_id = $1`

	rows, err := s.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	fieldDescs := rows.FieldDescriptions()
	var results []map[string]interface{}

	for rows.Next() {
		values, err := rows.Values()
		if err != nil {
			continue
		}

		row := make(map[string]interface{})
		for i, fd := range fieldDescs {
			row[string(fd.Name)] = values[i]
		}
		results = append(results, row)
	}

	return results, nil
}

func (s *DataExportService) exportTransactions(ctx context.Context, userID uuid.UUID) ([]map[string]interface{}, error) {
	query := `
		SELECT t.* FROM transactions t
		JOIN portfolios p ON t.portfolio_id = p.id
		WHERE p.user_id = $1
		ORDER BY t.transaction_date DESC`

	rows, err := s.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	fieldDescs := rows.FieldDescriptions()
	var results []map[string]interface{}

	for rows.Next() {
		values, err := rows.Values()
		if err != nil {
			continue
		}

		row := make(map[string]interface{})
		for i, fd := range fieldDescs {
			row[string(fd.Name)] = values[i]
		}
		results = append(results, row)
	}

	return results, nil
}

func (s *DataExportService) exportPlantCareLogs(ctx context.Context, userID uuid.UUID) ([]map[string]interface{}, error) {
	query := `
		SELECT c.* FROM plant_care_logs c
		JOIN plants p ON c.plant_id = p.id
		WHERE p.user_id = $1
		ORDER BY c.care_date DESC`

	rows, err := s.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	fieldDescs := rows.FieldDescriptions()
	var results []map[string]interface{}

	for rows.Next() {
		values, err := rows.Values()
		if err != nil {
			continue
		}

		row := make(map[string]interface{})
		for i, fd := range fieldDescs {
			row[string(fd.Name)] = values[i]
		}
		results = append(results, row)
	}

	return results, nil
}

func (s *DataExportService) addCSVToZip(zipWriter *zip.Writer, filename string, data []map[string]interface{}) error {
	if len(data) == 0 {
		return nil
	}

	csvFile, err := zipWriter.Create(filename)
	if err != nil {
		return err
	}

	csvWriter := csv.NewWriter(csvFile)

	// Get headers from first row
	var headers []string
	for key := range data[0] {
		headers = append(headers, key)
	}
	csvWriter.Write(headers)

	// Write data rows
	for _, row := range data {
		var values []string
		for _, header := range headers {
			val := row[header]
			if val == nil {
				values = append(values, "")
			} else {
				values = append(values, fmt.Sprintf("%v", val))
			}
		}
		csvWriter.Write(values)
	}

	csvWriter.Flush()
	return csvWriter.Error()
}
