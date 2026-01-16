package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/mark-regan/wellf/internal/middleware"
	"github.com/mark-regan/wellf/internal/models"
	"github.com/mark-regan/wellf/internal/repository"
	"github.com/mark-regan/wellf/internal/services"
)

// PlantHandler handles plant-related HTTP requests
type PlantHandler struct {
	plantRepo     *repository.PlantRepository
	careLogRepo   *repository.PlantCareLogRepository
	healthLogRepo *repository.PlantHealthLogRepository
	photoRepo     *repository.PlantPhotoRepository
	uploadService *services.FileUploadService
}

// NewPlantHandler creates a new plant handler
func NewPlantHandler(
	plantRepo *repository.PlantRepository,
	careLogRepo *repository.PlantCareLogRepository,
	healthLogRepo *repository.PlantHealthLogRepository,
) *PlantHandler {
	return &PlantHandler{
		plantRepo:     plantRepo,
		careLogRepo:   careLogRepo,
		healthLogRepo: healthLogRepo,
	}
}

// SetPhotoRepo sets the photo repository
func (h *PlantHandler) SetPhotoRepo(repo *repository.PlantPhotoRepository) {
	h.photoRepo = repo
}

// SetUploadService sets the file upload service
func (h *PlantHandler) SetUploadService(svc *services.FileUploadService) {
	h.uploadService = svc
}

// Routes returns the plant routes
func (h *PlantHandler) Routes() chi.Router {
	r := chi.NewRouter()

	// Plants
	r.Get("/", h.listPlants)
	r.Post("/", h.createPlant)
	r.Get("/needing-water", h.getPlantsNeedingWater)
	r.Get("/by-room", h.getPlantsByRoom)
	r.Post("/water-multiple", h.waterMultiplePlants)
	r.Get("/{id}", h.getPlant)
	r.Put("/{id}", h.updatePlant)
	r.Delete("/{id}", h.deletePlant)
	r.Post("/{id}/water", h.waterPlant)

	// Care logs
	r.Get("/{id}/care-logs", h.getPlantCareLogs)
	r.Post("/{id}/care-logs", h.createCareLog)
	r.Get("/care-logs/recent", h.getRecentCareLogs)
	r.Delete("/care-logs/{logId}", h.deleteCareLog)

	// Health logs
	r.Get("/{id}/health-logs", h.getPlantHealthLogs)
	r.Post("/{id}/health-logs", h.createHealthLog)
	r.Delete("/health-logs/{logId}", h.deleteHealthLog)

	// Photos
	r.Get("/{id}/photos", h.getPlantPhotos)
	r.Post("/{id}/photos", h.uploadPlantPhoto)
	r.Put("/photos/{photoId}", h.updatePhoto)
	r.Post("/photos/{photoId}/primary", h.setPhotoPrimary)
	r.Delete("/photos/{photoId}", h.deletePhoto)

	// Summary
	r.Get("/summary", h.getSummary)

	return r
}

// listPlants returns all plants for the user
func (h *PlantHandler) listPlants(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	activeOnly := true
	if all := r.URL.Query().Get("all"); all == "true" {
		activeOnly = false
	}

	plants, err := h.plantRepo.List(r.Context(), userID, activeOnly)
	if err != nil {
		http.Error(w, "failed to list plants: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if plants == nil {
		plants = []models.Plant{}
	}

	JSON(w, http.StatusOK, plants)
}

// createPlant adds a new plant
func (h *PlantHandler) createPlant(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	var req models.CreatePlantRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Name == "" {
		http.Error(w, "name is required", http.StatusBadRequest)
		return
	}

	plant := &models.Plant{
		UserID:                  userID,
		Name:                    req.Name,
		Species:                 req.Species,
		Variety:                 req.Variety,
		Nickname:                req.Nickname,
		Room:                    req.Room,
		LocationDetail:          req.LocationDetail,
		PhotoURL:                req.PhotoURL,
		AcquiredDate:            req.AcquiredDate,
		AcquiredFrom:            req.AcquiredFrom,
		PurchasePrice:           req.PurchasePrice,
		WateringFrequencyDays:   req.WateringFrequencyDays,
		LightRequirement:        req.LightRequirement,
		HumidityPreference:      req.HumidityPreference,
		FertilizingFrequencyDays: req.FertilizingFrequencyDays,
		Notes:                   req.Notes,
		CareNotes:               req.CareNotes,
	}

	if err := h.plantRepo.Create(r.Context(), plant); err != nil {
		http.Error(w, "failed to create plant: "+err.Error(), http.StatusInternalServerError)
		return
	}

	JSON(w, http.StatusCreated, plant)
}

// getPlant returns a single plant
func (h *PlantHandler) getPlant(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	plantID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid plant ID", http.StatusBadRequest)
		return
	}

	plant, err := h.plantRepo.GetByID(r.Context(), userID, plantID)
	if err != nil {
		if err == pgx.ErrNoRows {
			http.Error(w, "plant not found", http.StatusNotFound)
			return
		}
		http.Error(w, "failed to get plant: "+err.Error(), http.StatusInternalServerError)
		return
	}

	JSON(w, http.StatusOK, plant)
}

// updatePlant updates a plant
func (h *PlantHandler) updatePlant(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	plantID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid plant ID", http.StatusBadRequest)
		return
	}

	plant, err := h.plantRepo.GetByID(r.Context(), userID, plantID)
	if err != nil {
		if err == pgx.ErrNoRows {
			http.Error(w, "plant not found", http.StatusNotFound)
			return
		}
		http.Error(w, "failed to get plant: "+err.Error(), http.StatusInternalServerError)
		return
	}

	var req models.UpdatePlantRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	// Apply updates
	if req.Name != nil {
		plant.Name = *req.Name
	}
	if req.Species != nil {
		plant.Species = *req.Species
	}
	if req.Variety != nil {
		plant.Variety = *req.Variety
	}
	if req.Nickname != nil {
		plant.Nickname = *req.Nickname
	}
	if req.Room != nil {
		plant.Room = *req.Room
	}
	if req.LocationDetail != nil {
		plant.LocationDetail = *req.LocationDetail
	}
	if req.PhotoURL != nil {
		plant.PhotoURL = *req.PhotoURL
	}
	if req.AcquiredDate != nil {
		plant.AcquiredDate = req.AcquiredDate
	}
	if req.AcquiredFrom != nil {
		plant.AcquiredFrom = *req.AcquiredFrom
	}
	if req.PurchasePrice != nil {
		plant.PurchasePrice = req.PurchasePrice
	}
	if req.WateringFrequencyDays != nil {
		plant.WateringFrequencyDays = *req.WateringFrequencyDays
	}
	if req.LightRequirement != nil {
		plant.LightRequirement = *req.LightRequirement
	}
	if req.HumidityPreference != nil {
		plant.HumidityPreference = *req.HumidityPreference
	}
	if req.FertilizingFrequencyDays != nil {
		plant.FertilizingFrequencyDays = req.FertilizingFrequencyDays
	}
	if req.HealthStatus != nil {
		plant.HealthStatus = *req.HealthStatus
	}
	if req.IsActive != nil {
		plant.IsActive = *req.IsActive
	}
	if req.Notes != nil {
		plant.Notes = *req.Notes
	}
	if req.CareNotes != nil {
		plant.CareNotes = *req.CareNotes
	}

	if err := h.plantRepo.Update(r.Context(), plant); err != nil {
		http.Error(w, "failed to update plant: "+err.Error(), http.StatusInternalServerError)
		return
	}

	JSON(w, http.StatusOK, plant)
}

// deletePlant soft-deletes a plant
func (h *PlantHandler) deletePlant(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	plantID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid plant ID", http.StatusBadRequest)
		return
	}

	if err := h.plantRepo.Delete(r.Context(), userID, plantID); err != nil {
		http.Error(w, "failed to delete plant: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// waterPlant records watering for a plant
func (h *PlantHandler) waterPlant(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	plantID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid plant ID", http.StatusBadRequest)
		return
	}

	// Water the plant
	if err := h.plantRepo.Water(r.Context(), userID, plantID); err != nil {
		http.Error(w, "failed to water plant: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Create care log entry
	careLog := &models.PlantCareLog{
		PlantID:  plantID,
		UserID:   userID,
		CareType: models.PlantCareTypeWatered,
		CareDate: time.Now(),
	}
	h.careLogRepo.Create(r.Context(), careLog)

	// Return updated plant
	plant, _ := h.plantRepo.GetByID(r.Context(), userID, plantID)
	JSON(w, http.StatusOK, plant)
}

// waterMultiplePlants waters multiple plants at once
func (h *PlantHandler) waterMultiplePlants(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	var req models.WaterMultipleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if len(req.PlantIDs) == 0 {
		http.Error(w, "at least one plant ID is required", http.StatusBadRequest)
		return
	}

	// Water all plants
	if err := h.plantRepo.WaterMultiple(r.Context(), userID, req.PlantIDs); err != nil {
		http.Error(w, "failed to water plants: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Create care log entries for each plant
	for _, plantID := range req.PlantIDs {
		careLog := &models.PlantCareLog{
			PlantID:  plantID,
			UserID:   userID,
			CareType: models.PlantCareTypeWatered,
			CareDate: time.Now(),
		}
		h.careLogRepo.Create(r.Context(), careLog)
	}

	JSON(w, http.StatusOK, map[string]int{"watered": len(req.PlantIDs)})
}

// getPlantsNeedingWater returns plants that need watering
func (h *PlantHandler) getPlantsNeedingWater(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	daysAhead := 0
	if d := r.URL.Query().Get("days"); d != "" {
		if n, err := strconv.Atoi(d); err == nil && n >= 0 {
			daysAhead = n
		}
	}

	plants, err := h.plantRepo.GetNeedingWater(r.Context(), userID, daysAhead)
	if err != nil {
		http.Error(w, "failed to get plants needing water: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if plants == nil {
		plants = []models.Plant{}
	}

	JSON(w, http.StatusOK, plants)
}

// getPlantsByRoom returns plants grouped by room
func (h *PlantHandler) getPlantsByRoom(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	rooms, err := h.plantRepo.GetByRoom(r.Context(), userID)
	if err != nil {
		http.Error(w, "failed to get plants by room: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if rooms == nil {
		rooms = []models.PlantsByRoom{}
	}

	JSON(w, http.StatusOK, rooms)
}

// getPlantCareLogs returns care logs for a plant
func (h *PlantHandler) getPlantCareLogs(w http.ResponseWriter, r *http.Request) {
	plantID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid plant ID", http.StatusBadRequest)
		return
	}

	limit := 50
	if l := r.URL.Query().Get("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 {
			limit = n
		}
	}

	logs, err := h.careLogRepo.GetByPlant(r.Context(), plantID, limit)
	if err != nil {
		http.Error(w, "failed to get care logs: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if logs == nil {
		logs = []models.PlantCareLog{}
	}

	JSON(w, http.StatusOK, logs)
}

// createCareLog creates a new care log entry
func (h *PlantHandler) createCareLog(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	plantID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid plant ID", http.StatusBadRequest)
		return
	}

	var req models.LogCareRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.CareType == "" {
		http.Error(w, "care_type is required", http.StatusBadRequest)
		return
	}

	careDate := time.Now()
	if req.CareDate != nil {
		careDate = *req.CareDate
	}

	log := &models.PlantCareLog{
		PlantID:  plantID,
		UserID:   userID,
		CareType: req.CareType,
		CareDate: careDate,
		Notes:    req.Notes,
		PhotoURL: req.PhotoURL,
	}

	if err := h.careLogRepo.Create(r.Context(), log); err != nil {
		http.Error(w, "failed to create care log: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Update plant fields based on care type
	switch req.CareType {
	case models.PlantCareTypeWatered:
		h.plantRepo.Water(r.Context(), userID, plantID)
	}

	JSON(w, http.StatusCreated, log)
}

// getRecentCareLogs returns recent care logs for the user
func (h *PlantHandler) getRecentCareLogs(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	limit := 20
	if l := r.URL.Query().Get("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 {
			limit = n
		}
	}

	logs, err := h.careLogRepo.GetByUser(r.Context(), userID, limit)
	if err != nil {
		http.Error(w, "failed to get care logs: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if logs == nil {
		logs = []models.PlantCareLog{}
	}

	JSON(w, http.StatusOK, logs)
}

// deleteCareLog deletes a care log entry
func (h *PlantHandler) deleteCareLog(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	logID, err := uuid.Parse(chi.URLParam(r, "logId"))
	if err != nil {
		http.Error(w, "invalid log ID", http.StatusBadRequest)
		return
	}

	if err := h.careLogRepo.Delete(r.Context(), userID, logID); err != nil {
		http.Error(w, "failed to delete care log: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// getPlantHealthLogs returns health logs for a plant
func (h *PlantHandler) getPlantHealthLogs(w http.ResponseWriter, r *http.Request) {
	plantID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid plant ID", http.StatusBadRequest)
		return
	}

	limit := 50
	if l := r.URL.Query().Get("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 {
			limit = n
		}
	}

	logs, err := h.healthLogRepo.GetByPlant(r.Context(), plantID, limit)
	if err != nil {
		http.Error(w, "failed to get health logs: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if logs == nil {
		logs = []models.PlantHealthLog{}
	}

	JSON(w, http.StatusOK, logs)
}

// createHealthLog creates a new health log entry
func (h *PlantHandler) createHealthLog(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	plantID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid plant ID", http.StatusBadRequest)
		return
	}

	var req models.LogHealthRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.HealthStatus == "" {
		http.Error(w, "health_status is required", http.StatusBadRequest)
		return
	}

	logDate := time.Now()
	if req.LogDate != nil {
		logDate = *req.LogDate
	}

	log := &models.PlantHealthLog{
		PlantID:      plantID,
		UserID:       userID,
		LogDate:      logDate,
		HealthStatus: req.HealthStatus,
		Observations: req.Observations,
		ActionsTaken: req.ActionsTaken,
		Notes:        req.Notes,
		PhotoURL:     req.PhotoURL,
	}

	if err := h.healthLogRepo.Create(r.Context(), log); err != nil {
		http.Error(w, "failed to create health log: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Update plant health status
	plant, _ := h.plantRepo.GetByID(r.Context(), userID, plantID)
	if plant != nil {
		plant.HealthStatus = req.HealthStatus
		h.plantRepo.Update(r.Context(), plant)
	}

	JSON(w, http.StatusCreated, log)
}

// deleteHealthLog deletes a health log entry
func (h *PlantHandler) deleteHealthLog(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	logID, err := uuid.Parse(chi.URLParam(r, "logId"))
	if err != nil {
		http.Error(w, "invalid log ID", http.StatusBadRequest)
		return
	}

	if err := h.healthLogRepo.Delete(r.Context(), userID, logID); err != nil {
		http.Error(w, "failed to delete health log: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// getSummary returns the plants module summary
func (h *PlantHandler) getSummary(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	summary := &models.PlantSummary{}

	// Get total plants
	totalPlants, _ := h.plantRepo.Count(r.Context(), userID, true)
	summary.TotalPlants = totalPlants

	// Get plants needing water today
	needingWater, _ := h.plantRepo.GetNeedingWater(r.Context(), userID, 0)
	summary.NeedingWater = len(needingWater)
	summary.NeedingWaterPlants = needingWater

	// Get health stats
	healthStats, _ := h.plantRepo.CountByHealth(r.Context(), userID)
	summary.HealthyCount = healthStats[models.PlantHealthHealthy] + healthStats[models.PlantHealthThriving]
	summary.NeedsAttention = healthStats[models.PlantHealthFair] + healthStats[models.PlantHealthStruggling] + healthStats[models.PlantHealthCritical]

	// Get recent care logs
	recentCare, _ := h.careLogRepo.GetByUser(r.Context(), userID, 5)
	summary.RecentCareLogs = recentCare

	JSON(w, http.StatusOK, summary)
}

// getPlantPhotos returns all photos for a plant
func (h *PlantHandler) getPlantPhotos(w http.ResponseWriter, r *http.Request) {
	plantID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid plant ID", http.StatusBadRequest)
		return
	}

	if h.photoRepo == nil {
		http.Error(w, "photo feature not configured", http.StatusNotImplemented)
		return
	}

	limit := 0
	if l := r.URL.Query().Get("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 {
			limit = n
		}
	}

	photos, err := h.photoRepo.GetByPlant(r.Context(), plantID, limit)
	if err != nil {
		http.Error(w, "failed to get photos: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if photos == nil {
		photos = []models.PlantPhoto{}
	}

	JSON(w, http.StatusOK, photos)
}

// uploadPlantPhoto uploads a photo for a plant
func (h *PlantHandler) uploadPlantPhoto(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	plantID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid plant ID", http.StatusBadRequest)
		return
	}

	if h.photoRepo == nil || h.uploadService == nil {
		http.Error(w, "photo feature not configured", http.StatusNotImplemented)
		return
	}

	// Verify plant exists and belongs to user
	_, err = h.plantRepo.GetByID(r.Context(), userID, plantID)
	if err != nil {
		if err == pgx.ErrNoRows {
			http.Error(w, "plant not found", http.StatusNotFound)
			return
		}
		http.Error(w, "failed to get plant: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Parse multipart form (max 10MB)
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		http.Error(w, "failed to parse form: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Get the file
	file, header, err := r.FormFile("photo")
	if err != nil {
		http.Error(w, "photo file is required", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Upload the file
	result, err := h.uploadService.UploadImage(file, header, "plants/"+plantID.String())
	if err != nil {
		http.Error(w, "failed to upload photo: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Get form fields
	caption := r.FormValue("caption")
	photoType := r.FormValue("photo_type")
	if photoType == "" {
		photoType = models.PlantPhotoTypeGeneral
	}
	isPrimary := r.FormValue("is_primary") == "true"

	var takenAt time.Time
	if takenAtStr := r.FormValue("taken_at"); takenAtStr != "" {
		if parsed, err := time.Parse("2006-01-02", takenAtStr); err == nil {
			takenAt = parsed
		}
	}
	if takenAt.IsZero() {
		takenAt = time.Now()
	}

	// Create photo record
	photo := &models.PlantPhoto{
		PlantID:          plantID,
		UserID:           userID,
		Filename:         result.Filename,
		OriginalFilename: header.Filename,
		ContentType:      result.ContentType,
		FileSize:         int(result.FileSize),
		PhotoURL:         result.URL,
		TakenAt:          takenAt,
		Caption:          caption,
		IsPrimary:        isPrimary,
		PhotoType:        photoType,
	}

	if err := h.photoRepo.Create(r.Context(), photo); err != nil {
		// Clean up uploaded file on error
		h.uploadService.DeleteFile(result.URL)
		http.Error(w, "failed to save photo: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// If this is the first photo or marked as primary, update plant's photo_url
	if isPrimary {
		plant, _ := h.plantRepo.GetByID(r.Context(), userID, plantID)
		if plant != nil {
			plant.PhotoURL = result.URL
			h.plantRepo.Update(r.Context(), plant)
		}
	}

	JSON(w, http.StatusCreated, photo)
}

// updatePhoto updates a photo's caption
func (h *PlantHandler) updatePhoto(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	photoID, err := uuid.Parse(chi.URLParam(r, "photoId"))
	if err != nil {
		http.Error(w, "invalid photo ID", http.StatusBadRequest)
		return
	}

	if h.photoRepo == nil {
		http.Error(w, "photo feature not configured", http.StatusNotImplemented)
		return
	}

	var req struct {
		Caption string `json:"caption"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.photoRepo.UpdateCaption(r.Context(), userID, photoID, req.Caption); err != nil {
		http.Error(w, "failed to update photo: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// setPhotoPrimary sets a photo as the primary photo for its plant
func (h *PlantHandler) setPhotoPrimary(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	photoID, err := uuid.Parse(chi.URLParam(r, "photoId"))
	if err != nil {
		http.Error(w, "invalid photo ID", http.StatusBadRequest)
		return
	}

	if h.photoRepo == nil {
		http.Error(w, "photo feature not configured", http.StatusNotImplemented)
		return
	}

	// Get the photo to find its plant
	photo, err := h.photoRepo.GetByID(r.Context(), userID, photoID)
	if err != nil {
		if err == pgx.ErrNoRows {
			http.Error(w, "photo not found", http.StatusNotFound)
			return
		}
		http.Error(w, "failed to get photo: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Set as primary
	if err := h.photoRepo.SetPrimary(r.Context(), userID, photoID); err != nil {
		http.Error(w, "failed to set primary photo: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Update plant's photo_url
	plant, _ := h.plantRepo.GetByID(r.Context(), userID, photo.PlantID)
	if plant != nil {
		plant.PhotoURL = photo.PhotoURL
		h.plantRepo.Update(r.Context(), plant)
	}

	w.WriteHeader(http.StatusOK)
}

// deletePhoto deletes a photo
func (h *PlantHandler) deletePhoto(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	photoID, err := uuid.Parse(chi.URLParam(r, "photoId"))
	if err != nil {
		http.Error(w, "invalid photo ID", http.StatusBadRequest)
		return
	}

	if h.photoRepo == nil || h.uploadService == nil {
		http.Error(w, "photo feature not configured", http.StatusNotImplemented)
		return
	}

	// Get the photo to delete the file
	photo, err := h.photoRepo.GetByID(r.Context(), userID, photoID)
	if err != nil {
		if err == pgx.ErrNoRows {
			http.Error(w, "photo not found", http.StatusNotFound)
			return
		}
		http.Error(w, "failed to get photo: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Delete from database
	if err := h.photoRepo.Delete(r.Context(), userID, photoID); err != nil {
		http.Error(w, "failed to delete photo: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Delete the file
	h.uploadService.DeleteFile(photo.PhotoURL)

	// If this was the primary photo, clear plant's photo_url
	if photo.IsPrimary {
		plant, _ := h.plantRepo.GetByID(r.Context(), userID, photo.PlantID)
		if plant != nil {
			// Try to find another photo to set as primary
			photos, _ := h.photoRepo.GetByPlant(r.Context(), photo.PlantID, 1)
			if len(photos) > 0 {
				plant.PhotoURL = photos[0].PhotoURL
				h.photoRepo.SetPrimary(r.Context(), userID, photos[0].ID)
			} else {
				plant.PhotoURL = ""
			}
			h.plantRepo.Update(r.Context(), plant)
		}
	}

	w.WriteHeader(http.StatusNoContent)
}
