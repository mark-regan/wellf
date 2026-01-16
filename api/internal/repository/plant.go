package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/mark-regan/wellf/internal/models"
)

// PlantRepository handles plant database operations
type PlantRepository struct {
	pool *pgxpool.Pool
}

// NewPlantRepository creates a new plant repository
func NewPlantRepository(pool *pgxpool.Pool) *PlantRepository {
	return &PlantRepository{pool: pool}
}

// Create adds a new plant
func (r *PlantRepository) Create(ctx context.Context, plant *models.Plant) error {
	query := `
		INSERT INTO plants (
			user_id, name, species, variety, nickname, room, location_detail,
			photo_url, acquired_date, acquired_from, purchase_price,
			watering_frequency_days, light_requirement, humidity_preference,
			fertilizing_frequency_days, health_status, is_active, notes, care_notes
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
		RETURNING id, created_at, updated_at`

	// Set defaults
	if plant.WateringFrequencyDays == 0 {
		plant.WateringFrequencyDays = 7
	}
	if plant.LightRequirement == "" {
		plant.LightRequirement = models.PlantLightMedium
	}
	if plant.HumidityPreference == "" {
		plant.HumidityPreference = models.PlantHumidityMedium
	}
	if plant.HealthStatus == "" {
		plant.HealthStatus = models.PlantHealthHealthy
	}
	plant.IsActive = true

	return r.pool.QueryRow(ctx, query,
		plant.UserID,
		plant.Name,
		nullString(plant.Species),
		nullString(plant.Variety),
		nullString(plant.Nickname),
		nullString(plant.Room),
		nullString(plant.LocationDetail),
		nullString(plant.PhotoURL),
		plant.AcquiredDate,
		nullString(plant.AcquiredFrom),
		plant.PurchasePrice,
		plant.WateringFrequencyDays,
		plant.LightRequirement,
		plant.HumidityPreference,
		plant.FertilizingFrequencyDays,
		plant.HealthStatus,
		plant.IsActive,
		nullString(plant.Notes),
		nullString(plant.CareNotes),
	).Scan(&plant.ID, &plant.CreatedAt, &plant.UpdatedAt)
}

// GetByID retrieves a plant by ID
func (r *PlantRepository) GetByID(ctx context.Context, userID, plantID uuid.UUID) (*models.Plant, error) {
	query := `
		SELECT id, user_id, name, species, variety, nickname, room, location_detail,
			photo_url, acquired_date, acquired_from, purchase_price,
			watering_frequency_days, light_requirement, humidity_preference,
			fertilizing_frequency_days, last_fertilized_at, health_status, is_active,
			last_watered_at, last_repotted_at, last_pruned_at,
			next_water_date, next_fertilize_date, notes, care_notes,
			created_at, updated_at
		FROM plants
		WHERE id = $1 AND user_id = $2`

	return r.scanPlant(r.pool.QueryRow(ctx, query, plantID, userID))
}

// scanPlant scans a single plant row
func (r *PlantRepository) scanPlant(row pgx.Row) (*models.Plant, error) {
	plant := &models.Plant{}
	var species, variety, nickname, room, locationDetail, photoURL *string
	var acquiredFrom, notes, careNotes *string
	var lightReq, humidityPref, healthStatus *string

	err := row.Scan(
		&plant.ID, &plant.UserID, &plant.Name, &species, &variety, &nickname,
		&room, &locationDetail, &photoURL, &plant.AcquiredDate, &acquiredFrom,
		&plant.PurchasePrice, &plant.WateringFrequencyDays, &lightReq, &humidityPref,
		&plant.FertilizingFrequencyDays, &plant.LastFertilizedAt, &healthStatus,
		&plant.IsActive, &plant.LastWateredAt, &plant.LastRepottedAt, &plant.LastPrunedAt,
		&plant.NextWaterDate, &plant.NextFertilizeDate, &notes, &careNotes,
		&plant.CreatedAt, &plant.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	// Assign optional string fields
	if species != nil {
		plant.Species = *species
	}
	if variety != nil {
		plant.Variety = *variety
	}
	if nickname != nil {
		plant.Nickname = *nickname
	}
	if room != nil {
		plant.Room = *room
	}
	if locationDetail != nil {
		plant.LocationDetail = *locationDetail
	}
	if photoURL != nil {
		plant.PhotoURL = *photoURL
	}
	if acquiredFrom != nil {
		plant.AcquiredFrom = *acquiredFrom
	}
	if notes != nil {
		plant.Notes = *notes
	}
	if careNotes != nil {
		plant.CareNotes = *careNotes
	}
	if lightReq != nil {
		plant.LightRequirement = *lightReq
	}
	if humidityPref != nil {
		plant.HumidityPreference = *humidityPref
	}
	if healthStatus != nil {
		plant.HealthStatus = *healthStatus
	}

	// Calculate days until/since water
	r.calculateWaterDays(plant)

	return plant, nil
}

// calculateWaterDays sets the computed water day fields
func (r *PlantRepository) calculateWaterDays(plant *models.Plant) {
	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.Local)

	if plant.LastWateredAt != nil {
		plant.DaysSinceWater = int(today.Sub(*plant.LastWateredAt).Hours() / 24)
	}

	if plant.NextWaterDate != nil {
		plant.DaysUntilWater = int(plant.NextWaterDate.Sub(today).Hours() / 24)
	}
}

// List retrieves all plants for a user
func (r *PlantRepository) List(ctx context.Context, userID uuid.UUID, activeOnly bool) ([]models.Plant, error) {
	query := `
		SELECT id, user_id, name, species, variety, nickname, room, location_detail,
			photo_url, acquired_date, acquired_from, purchase_price,
			watering_frequency_days, light_requirement, humidity_preference,
			fertilizing_frequency_days, last_fertilized_at, health_status, is_active,
			last_watered_at, last_repotted_at, last_pruned_at,
			next_water_date, next_fertilize_date, notes, care_notes,
			created_at, updated_at
		FROM plants
		WHERE user_id = $1`

	if activeOnly {
		query += " AND is_active = true"
	}

	query += " ORDER BY name ASC"

	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var plants []models.Plant
	for rows.Next() {
		plant, err := r.scanPlantFromRows(rows)
		if err != nil {
			return nil, err
		}
		plants = append(plants, *plant)
	}

	return plants, nil
}

// scanPlantFromRows scans a plant from rows iterator
func (r *PlantRepository) scanPlantFromRows(rows pgx.Rows) (*models.Plant, error) {
	plant := &models.Plant{}
	var species, variety, nickname, room, locationDetail, photoURL *string
	var acquiredFrom, notes, careNotes *string
	var lightReq, humidityPref, healthStatus *string

	err := rows.Scan(
		&plant.ID, &plant.UserID, &plant.Name, &species, &variety, &nickname,
		&room, &locationDetail, &photoURL, &plant.AcquiredDate, &acquiredFrom,
		&plant.PurchasePrice, &plant.WateringFrequencyDays, &lightReq, &humidityPref,
		&plant.FertilizingFrequencyDays, &plant.LastFertilizedAt, &healthStatus,
		&plant.IsActive, &plant.LastWateredAt, &plant.LastRepottedAt, &plant.LastPrunedAt,
		&plant.NextWaterDate, &plant.NextFertilizeDate, &notes, &careNotes,
		&plant.CreatedAt, &plant.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	if species != nil {
		plant.Species = *species
	}
	if variety != nil {
		plant.Variety = *variety
	}
	if nickname != nil {
		plant.Nickname = *nickname
	}
	if room != nil {
		plant.Room = *room
	}
	if locationDetail != nil {
		plant.LocationDetail = *locationDetail
	}
	if photoURL != nil {
		plant.PhotoURL = *photoURL
	}
	if acquiredFrom != nil {
		plant.AcquiredFrom = *acquiredFrom
	}
	if notes != nil {
		plant.Notes = *notes
	}
	if careNotes != nil {
		plant.CareNotes = *careNotes
	}
	if lightReq != nil {
		plant.LightRequirement = *lightReq
	}
	if humidityPref != nil {
		plant.HumidityPreference = *humidityPref
	}
	if healthStatus != nil {
		plant.HealthStatus = *healthStatus
	}

	r.calculateWaterDays(plant)

	return plant, nil
}

// Update updates a plant
func (r *PlantRepository) Update(ctx context.Context, plant *models.Plant) error {
	query := `
		UPDATE plants SET
			name = $1, species = $2, variety = $3, nickname = $4,
			room = $5, location_detail = $6, photo_url = $7,
			acquired_date = $8, acquired_from = $9, purchase_price = $10,
			watering_frequency_days = $11, light_requirement = $12, humidity_preference = $13,
			fertilizing_frequency_days = $14, health_status = $15, is_active = $16,
			notes = $17, care_notes = $18
		WHERE id = $19 AND user_id = $20`

	_, err := r.pool.Exec(ctx, query,
		plant.Name,
		nullString(plant.Species),
		nullString(plant.Variety),
		nullString(plant.Nickname),
		nullString(plant.Room),
		nullString(plant.LocationDetail),
		nullString(plant.PhotoURL),
		plant.AcquiredDate,
		nullString(plant.AcquiredFrom),
		plant.PurchasePrice,
		plant.WateringFrequencyDays,
		plant.LightRequirement,
		plant.HumidityPreference,
		plant.FertilizingFrequencyDays,
		plant.HealthStatus,
		plant.IsActive,
		nullString(plant.Notes),
		nullString(plant.CareNotes),
		plant.ID,
		plant.UserID,
	)
	return err
}

// Delete removes a plant (soft delete by setting is_active = false)
func (r *PlantRepository) Delete(ctx context.Context, userID, plantID uuid.UUID) error {
	query := `UPDATE plants SET is_active = false WHERE id = $1 AND user_id = $2`
	_, err := r.pool.Exec(ctx, query, plantID, userID)
	return err
}

// HardDelete permanently removes a plant
func (r *PlantRepository) HardDelete(ctx context.Context, userID, plantID uuid.UUID) error {
	query := `DELETE FROM plants WHERE id = $1 AND user_id = $2`
	_, err := r.pool.Exec(ctx, query, plantID, userID)
	return err
}

// GetNeedingWater returns plants that need watering today or are overdue
func (r *PlantRepository) GetNeedingWater(ctx context.Context, userID uuid.UUID, daysAhead int) ([]models.Plant, error) {
	query := `
		SELECT id, user_id, name, species, variety, nickname, room, location_detail,
			photo_url, acquired_date, acquired_from, purchase_price,
			watering_frequency_days, light_requirement, humidity_preference,
			fertilizing_frequency_days, last_fertilized_at, health_status, is_active,
			last_watered_at, last_repotted_at, last_pruned_at,
			next_water_date, next_fertilize_date, notes, care_notes,
			created_at, updated_at
		FROM plants
		WHERE user_id = $1 AND is_active = true
			AND (next_water_date IS NULL OR next_water_date <= CURRENT_DATE + $2)
		ORDER BY next_water_date ASC NULLS FIRST, last_watered_at ASC NULLS FIRST`

	rows, err := r.pool.Query(ctx, query, userID, daysAhead)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var plants []models.Plant
	for rows.Next() {
		plant, err := r.scanPlantFromRows(rows)
		if err != nil {
			return nil, err
		}
		plants = append(plants, *plant)
	}

	return plants, nil
}

// GetNeedingFertilizer returns plants that need fertilizing within the given number of days
func (r *PlantRepository) GetNeedingFertilizer(ctx context.Context, userID uuid.UUID, daysAhead int) ([]models.Plant, error) {
	query := `
		SELECT id, user_id, name, species, variety, nickname, room, location_detail,
			photo_url, acquired_date, acquired_from, purchase_price,
			watering_frequency_days, light_requirement, humidity_preference,
			fertilizing_frequency_days, last_fertilized_at, health_status, is_active,
			last_watered_at, last_repotted_at, last_pruned_at,
			next_water_date, next_fertilize_date, notes, care_notes,
			created_at, updated_at
		FROM plants
		WHERE user_id = $1 AND is_active = true
			AND fertilizing_frequency_days IS NOT NULL
			AND (next_fertilize_date IS NULL OR next_fertilize_date <= CURRENT_DATE + $2)
		ORDER BY next_fertilize_date ASC NULLS FIRST, last_fertilized_at ASC NULLS FIRST`

	rows, err := r.pool.Query(ctx, query, userID, daysAhead)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var plants []models.Plant
	for rows.Next() {
		plant, err := r.scanPlantFromRows(rows)
		if err != nil {
			return nil, err
		}
		plants = append(plants, *plant)
	}

	return plants, nil
}

// GetByRoom returns plants grouped by room
func (r *PlantRepository) GetByRoom(ctx context.Context, userID uuid.UUID) ([]models.PlantsByRoom, error) {
	query := `
		SELECT COALESCE(room, 'Unassigned') as room_name
		FROM plants
		WHERE user_id = $1 AND is_active = true
		GROUP BY room
		ORDER BY room_name`

	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var rooms []string
	for rows.Next() {
		var room string
		if err := rows.Scan(&room); err != nil {
			return nil, err
		}
		rooms = append(rooms, room)
	}

	var result []models.PlantsByRoom
	for _, room := range rooms {
		roomPlants, err := r.getPlantsByRoom(ctx, userID, room)
		if err != nil {
			return nil, err
		}
		result = append(result, models.PlantsByRoom{
			Room:   room,
			Plants: roomPlants,
			Count:  len(roomPlants),
		})
	}

	return result, nil
}

func (r *PlantRepository) getPlantsByRoom(ctx context.Context, userID uuid.UUID, room string) ([]models.Plant, error) {
	query := `
		SELECT id, user_id, name, species, variety, nickname, room, location_detail,
			photo_url, acquired_date, acquired_from, purchase_price,
			watering_frequency_days, light_requirement, humidity_preference,
			fertilizing_frequency_days, last_fertilized_at, health_status, is_active,
			last_watered_at, last_repotted_at, last_pruned_at,
			next_water_date, next_fertilize_date, notes, care_notes,
			created_at, updated_at
		FROM plants
		WHERE user_id = $1 AND is_active = true AND COALESCE(room, 'Unassigned') = $2
		ORDER BY name`

	rows, err := r.pool.Query(ctx, query, userID, room)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var plants []models.Plant
	for rows.Next() {
		plant, err := r.scanPlantFromRows(rows)
		if err != nil {
			return nil, err
		}
		plants = append(plants, *plant)
	}

	return plants, nil
}

// Count returns the total number of plants for a user
func (r *PlantRepository) Count(ctx context.Context, userID uuid.UUID, activeOnly bool) (int, error) {
	query := `SELECT COUNT(*) FROM plants WHERE user_id = $1`
	if activeOnly {
		query += " AND is_active = true"
	}
	var count int
	err := r.pool.QueryRow(ctx, query, userID).Scan(&count)
	return count, err
}

// CountByHealth returns count of plants by health status
func (r *PlantRepository) CountByHealth(ctx context.Context, userID uuid.UUID) (map[string]int, error) {
	query := `
		SELECT health_status, COUNT(*)
		FROM plants
		WHERE user_id = $1 AND is_active = true
		GROUP BY health_status`

	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[string]int)
	for rows.Next() {
		var status string
		var count int
		if err := rows.Scan(&status, &count); err != nil {
			return nil, err
		}
		result[status] = count
	}

	return result, nil
}

// Water records watering and updates next water date
func (r *PlantRepository) Water(ctx context.Context, userID, plantID uuid.UUID) error {
	query := `
		UPDATE plants SET
			last_watered_at = CURRENT_DATE,
			next_water_date = CURRENT_DATE + watering_frequency_days
		WHERE id = $1 AND user_id = $2`

	_, err := r.pool.Exec(ctx, query, plantID, userID)
	return err
}

// WaterMultiple waters multiple plants at once
func (r *PlantRepository) WaterMultiple(ctx context.Context, userID uuid.UUID, plantIDs []uuid.UUID) error {
	query := `
		UPDATE plants SET
			last_watered_at = CURRENT_DATE,
			next_water_date = CURRENT_DATE + watering_frequency_days
		WHERE user_id = $1 AND id = ANY($2)`

	_, err := r.pool.Exec(ctx, query, userID, plantIDs)
	return err
}

// PlantCareLogRepository handles plant care log database operations
type PlantCareLogRepository struct {
	pool *pgxpool.Pool
}

// NewPlantCareLogRepository creates a new plant care log repository
func NewPlantCareLogRepository(pool *pgxpool.Pool) *PlantCareLogRepository {
	return &PlantCareLogRepository{pool: pool}
}

// Create adds a new care log entry
func (r *PlantCareLogRepository) Create(ctx context.Context, log *models.PlantCareLog) error {
	query := `
		INSERT INTO plant_care_logs (plant_id, user_id, care_type, care_date, notes, photo_url)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at`

	if log.CareDate.IsZero() {
		log.CareDate = time.Now()
	}

	return r.pool.QueryRow(ctx, query,
		log.PlantID,
		log.UserID,
		log.CareType,
		log.CareDate,
		nullString(log.Notes),
		nullString(log.PhotoURL),
	).Scan(&log.ID, &log.CreatedAt)
}

// GetByPlant retrieves care logs for a plant
func (r *PlantCareLogRepository) GetByPlant(ctx context.Context, plantID uuid.UUID, limit int) ([]models.PlantCareLog, error) {
	query := `
		SELECT cl.id, cl.plant_id, cl.user_id, cl.care_type, cl.care_date, cl.notes, cl.photo_url, cl.created_at, p.name
		FROM plant_care_logs cl
		JOIN plants p ON cl.plant_id = p.id
		WHERE cl.plant_id = $1
		ORDER BY cl.care_date DESC, cl.created_at DESC`

	if limit > 0 {
		query += fmt.Sprintf(" LIMIT %d", limit)
	}

	rows, err := r.pool.Query(ctx, query, plantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return r.scanCareLogs(rows)
}

// GetByUser retrieves recent care logs for a user
func (r *PlantCareLogRepository) GetByUser(ctx context.Context, userID uuid.UUID, limit int) ([]models.PlantCareLog, error) {
	query := `
		SELECT cl.id, cl.plant_id, cl.user_id, cl.care_type, cl.care_date, cl.notes, cl.photo_url, cl.created_at, p.name
		FROM plant_care_logs cl
		JOIN plants p ON cl.plant_id = p.id
		WHERE cl.user_id = $1
		ORDER BY cl.care_date DESC, cl.created_at DESC`

	if limit > 0 {
		query += fmt.Sprintf(" LIMIT %d", limit)
	}

	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return r.scanCareLogs(rows)
}

func (r *PlantCareLogRepository) scanCareLogs(rows pgx.Rows) ([]models.PlantCareLog, error) {
	var logs []models.PlantCareLog
	for rows.Next() {
		var log models.PlantCareLog
		var notes, photoURL *string

		err := rows.Scan(
			&log.ID, &log.PlantID, &log.UserID, &log.CareType,
			&log.CareDate, &notes, &photoURL, &log.CreatedAt, &log.PlantName,
		)
		if err != nil {
			return nil, err
		}

		if notes != nil {
			log.Notes = *notes
		}
		if photoURL != nil {
			log.PhotoURL = *photoURL
		}

		logs = append(logs, log)
	}

	return logs, nil
}

// Delete removes a care log entry
func (r *PlantCareLogRepository) Delete(ctx context.Context, userID, logID uuid.UUID) error {
	query := `DELETE FROM plant_care_logs WHERE id = $1 AND user_id = $2`
	_, err := r.pool.Exec(ctx, query, logID, userID)
	return err
}

// PlantHealthLogRepository handles plant health log database operations
type PlantHealthLogRepository struct {
	pool *pgxpool.Pool
}

// NewPlantHealthLogRepository creates a new plant health log repository
func NewPlantHealthLogRepository(pool *pgxpool.Pool) *PlantHealthLogRepository {
	return &PlantHealthLogRepository{pool: pool}
}

// Create adds a new health log entry
func (r *PlantHealthLogRepository) Create(ctx context.Context, log *models.PlantHealthLog) error {
	query := `
		INSERT INTO plant_health_logs (plant_id, user_id, log_date, health_status, observations, actions_taken, notes, photo_url)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, created_at`

	if log.LogDate.IsZero() {
		log.LogDate = time.Now()
	}

	return r.pool.QueryRow(ctx, query,
		log.PlantID,
		log.UserID,
		log.LogDate,
		log.HealthStatus,
		log.Observations,
		log.ActionsTaken,
		nullString(log.Notes),
		nullString(log.PhotoURL),
	).Scan(&log.ID, &log.CreatedAt)
}

// GetByPlant retrieves health logs for a plant
func (r *PlantHealthLogRepository) GetByPlant(ctx context.Context, plantID uuid.UUID, limit int) ([]models.PlantHealthLog, error) {
	query := `
		SELECT id, plant_id, user_id, log_date, health_status, observations, actions_taken, notes, photo_url, created_at
		FROM plant_health_logs
		WHERE plant_id = $1
		ORDER BY log_date DESC, created_at DESC`

	if limit > 0 {
		query += fmt.Sprintf(" LIMIT %d", limit)
	}

	rows, err := r.pool.Query(ctx, query, plantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []models.PlantHealthLog
	for rows.Next() {
		var log models.PlantHealthLog
		var notes, photoURL *string

		err := rows.Scan(
			&log.ID, &log.PlantID, &log.UserID, &log.LogDate,
			&log.HealthStatus, &log.Observations, &log.ActionsTaken,
			&notes, &photoURL, &log.CreatedAt,
		)
		if err != nil {
			return nil, err
		}

		if notes != nil {
			log.Notes = *notes
		}
		if photoURL != nil {
			log.PhotoURL = *photoURL
		}

		logs = append(logs, log)
	}

	return logs, nil
}

// Delete removes a health log entry
func (r *PlantHealthLogRepository) Delete(ctx context.Context, userID, logID uuid.UUID) error {
	query := `DELETE FROM plant_health_logs WHERE id = $1 AND user_id = $2`
	_, err := r.pool.Exec(ctx, query, logID, userID)
	return err
}

// PlantPhotoRepository handles plant photo database operations
type PlantPhotoRepository struct {
	pool *pgxpool.Pool
}

// NewPlantPhotoRepository creates a new plant photo repository
func NewPlantPhotoRepository(pool *pgxpool.Pool) *PlantPhotoRepository {
	return &PlantPhotoRepository{pool: pool}
}

// Create adds a new photo to a plant's gallery
func (r *PlantPhotoRepository) Create(ctx context.Context, photo *models.PlantPhoto) error {
	query := `
		INSERT INTO plant_photos (
			plant_id, user_id, filename, original_filename, content_type, file_size,
			photo_url, thumbnail_url, taken_at, caption, is_primary, photo_type
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING id, created_at`

	if photo.TakenAt.IsZero() {
		photo.TakenAt = time.Now()
	}
	if photo.PhotoType == "" {
		photo.PhotoType = models.PlantPhotoTypeGeneral
	}

	return r.pool.QueryRow(ctx, query,
		photo.PlantID,
		photo.UserID,
		photo.Filename,
		nullString(photo.OriginalFilename),
		photo.ContentType,
		photo.FileSize,
		photo.PhotoURL,
		nullString(photo.ThumbnailURL),
		photo.TakenAt,
		nullString(photo.Caption),
		photo.IsPrimary,
		photo.PhotoType,
	).Scan(&photo.ID, &photo.CreatedAt)
}

// GetByID retrieves a photo by ID
func (r *PlantPhotoRepository) GetByID(ctx context.Context, userID, photoID uuid.UUID) (*models.PlantPhoto, error) {
	query := `
		SELECT id, plant_id, user_id, filename, original_filename, content_type, file_size,
			photo_url, thumbnail_url, taken_at, caption, is_primary, photo_type, created_at
		FROM plant_photos
		WHERE id = $1 AND user_id = $2`

	photo := &models.PlantPhoto{}
	var originalFilename, thumbnailURL, caption *string

	err := r.pool.QueryRow(ctx, query, photoID, userID).Scan(
		&photo.ID, &photo.PlantID, &photo.UserID, &photo.Filename,
		&originalFilename, &photo.ContentType, &photo.FileSize,
		&photo.PhotoURL, &thumbnailURL, &photo.TakenAt, &caption,
		&photo.IsPrimary, &photo.PhotoType, &photo.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	if originalFilename != nil {
		photo.OriginalFilename = *originalFilename
	}
	if thumbnailURL != nil {
		photo.ThumbnailURL = *thumbnailURL
	}
	if caption != nil {
		photo.Caption = *caption
	}

	return photo, nil
}

// GetByPlant retrieves all photos for a plant
func (r *PlantPhotoRepository) GetByPlant(ctx context.Context, plantID uuid.UUID, limit int) ([]models.PlantPhoto, error) {
	query := `
		SELECT id, plant_id, user_id, filename, original_filename, content_type, file_size,
			photo_url, thumbnail_url, taken_at, caption, is_primary, photo_type, created_at
		FROM plant_photos
		WHERE plant_id = $1
		ORDER BY taken_at DESC, created_at DESC`

	if limit > 0 {
		query += fmt.Sprintf(" LIMIT %d", limit)
	}

	rows, err := r.pool.Query(ctx, query, plantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var photos []models.PlantPhoto
	for rows.Next() {
		var photo models.PlantPhoto
		var originalFilename, thumbnailURL, caption *string

		err := rows.Scan(
			&photo.ID, &photo.PlantID, &photo.UserID, &photo.Filename,
			&originalFilename, &photo.ContentType, &photo.FileSize,
			&photo.PhotoURL, &thumbnailURL, &photo.TakenAt, &caption,
			&photo.IsPrimary, &photo.PhotoType, &photo.CreatedAt,
		)
		if err != nil {
			return nil, err
		}

		if originalFilename != nil {
			photo.OriginalFilename = *originalFilename
		}
		if thumbnailURL != nil {
			photo.ThumbnailURL = *thumbnailURL
		}
		if caption != nil {
			photo.Caption = *caption
		}

		photos = append(photos, photo)
	}

	return photos, nil
}

// GetPrimary retrieves the primary photo for a plant
func (r *PlantPhotoRepository) GetPrimary(ctx context.Context, plantID uuid.UUID) (*models.PlantPhoto, error) {
	query := `
		SELECT id, plant_id, user_id, filename, original_filename, content_type, file_size,
			photo_url, thumbnail_url, taken_at, caption, is_primary, photo_type, created_at
		FROM plant_photos
		WHERE plant_id = $1 AND is_primary = true
		LIMIT 1`

	photo := &models.PlantPhoto{}
	var originalFilename, thumbnailURL, caption *string

	err := r.pool.QueryRow(ctx, query, plantID).Scan(
		&photo.ID, &photo.PlantID, &photo.UserID, &photo.Filename,
		&originalFilename, &photo.ContentType, &photo.FileSize,
		&photo.PhotoURL, &thumbnailURL, &photo.TakenAt, &caption,
		&photo.IsPrimary, &photo.PhotoType, &photo.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	if originalFilename != nil {
		photo.OriginalFilename = *originalFilename
	}
	if thumbnailURL != nil {
		photo.ThumbnailURL = *thumbnailURL
	}
	if caption != nil {
		photo.Caption = *caption
	}

	return photo, nil
}

// SetPrimary sets a photo as the primary for its plant
func (r *PlantPhotoRepository) SetPrimary(ctx context.Context, userID, photoID uuid.UUID) error {
	// The database trigger handles unsetting other primary photos
	query := `UPDATE plant_photos SET is_primary = true WHERE id = $1 AND user_id = $2`
	_, err := r.pool.Exec(ctx, query, photoID, userID)
	return err
}

// UpdateCaption updates a photo's caption
func (r *PlantPhotoRepository) UpdateCaption(ctx context.Context, userID, photoID uuid.UUID, caption string) error {
	query := `UPDATE plant_photos SET caption = $1 WHERE id = $2 AND user_id = $3`
	_, err := r.pool.Exec(ctx, query, nullString(caption), photoID, userID)
	return err
}

// Delete removes a photo
func (r *PlantPhotoRepository) Delete(ctx context.Context, userID, photoID uuid.UUID) error {
	query := `DELETE FROM plant_photos WHERE id = $1 AND user_id = $2`
	_, err := r.pool.Exec(ctx, query, photoID, userID)
	return err
}

// Count returns the number of photos for a plant
func (r *PlantPhotoRepository) Count(ctx context.Context, plantID uuid.UUID) (int, error) {
	query := `SELECT COUNT(*) FROM plant_photos WHERE plant_id = $1`
	var count int
	err := r.pool.QueryRow(ctx, query, plantID).Scan(&count)
	return count, err
}
