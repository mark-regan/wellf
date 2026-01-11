package handlers

import (
	"net/http"

	"github.com/mark-regan/wellf/internal/middleware"
	"github.com/mark-regan/wellf/internal/repository"
	"github.com/mark-regan/wellf/internal/services"
)

type ReportHandler struct {
	reportService *services.ReportService
	householdRepo *repository.HouseholdRepository
	userRepo      *repository.UserRepository
}

func NewReportHandler(reportService *services.ReportService, householdRepo *repository.HouseholdRepository, userRepo *repository.UserRepository) *ReportHandler {
	return &ReportHandler{
		reportService: reportService,
		householdRepo: householdRepo,
		userRepo:      userRepo,
	}
}

// GetHouseholdOverview returns comprehensive household overview
func (h *ReportHandler) GetHouseholdOverview(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	user, err := h.userRepo.GetByID(r.Context(), userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to fetch user")
		return
	}

	household, err := h.householdRepo.GetDefaultHousehold(r.Context(), userID)
	if err != nil {
		if err == repository.ErrHouseholdNotFound {
			// Return empty overview if no household
			JSON(w, http.StatusOK, map[string]interface{}{
				"member_count":          0,
				"property_count":        0,
				"vehicle_count":         0,
				"insurance_policy_count": 0,
				"document_count":        0,
				"currency":              user.BaseCurrency,
			})
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch household")
		return
	}

	overview, err := h.reportService.GetHouseholdOverview(r.Context(), household.ID, userID, user.BaseCurrency)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to generate overview")
		return
	}

	JSON(w, http.StatusOK, overview)
}

// GetNetWorthBreakdown returns detailed net worth breakdown
func (h *ReportHandler) GetNetWorthBreakdown(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	user, err := h.userRepo.GetByID(r.Context(), userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to fetch user")
		return
	}

	household, err := h.householdRepo.GetDefaultHousehold(r.Context(), userID)
	if err != nil {
		if err == repository.ErrHouseholdNotFound {
			// Return zero breakdown if no household
			JSON(w, http.StatusOK, map[string]interface{}{
				"investments":       "0",
				"cash":              "0",
				"properties":        "0",
				"vehicles":          "0",
				"other_assets":      "0",
				"total_assets":      "0",
				"mortgages":         "0",
				"vehicle_finance":   "0",
				"total_liabilities": "0",
				"net_worth":         "0",
				"currency":          user.BaseCurrency,
			})
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch household")
		return
	}

	breakdown, err := h.reportService.GetNetWorthBreakdown(r.Context(), household.ID, userID, user.BaseCurrency)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to generate breakdown")
		return
	}

	JSON(w, http.StatusOK, breakdown)
}

// GetInsuranceCoverage returns insurance coverage report
func (h *ReportHandler) GetInsuranceCoverage(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	user, err := h.userRepo.GetByID(r.Context(), userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to fetch user")
		return
	}

	household, err := h.householdRepo.GetDefaultHousehold(r.Context(), userID)
	if err != nil {
		if err == repository.ErrHouseholdNotFound {
			JSON(w, http.StatusOK, map[string]interface{}{
				"total_policies":    0,
				"total_coverage":    "0",
				"annual_premiums":   "0",
				"by_type":           []interface{}{},
				"upcoming_renewals": 0,
				"currency":          user.BaseCurrency,
			})
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch household")
		return
	}

	report, err := h.reportService.GetInsuranceCoverage(r.Context(), household.ID, user.BaseCurrency)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to generate report")
		return
	}

	JSON(w, http.StatusOK, report)
}

// GetAssetAllocation returns asset allocation report
func (h *ReportHandler) GetAssetAllocation(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	user, err := h.userRepo.GetByID(r.Context(), userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to fetch user")
		return
	}

	household, err := h.householdRepo.GetDefaultHousehold(r.Context(), userID)
	if err != nil {
		if err == repository.ErrHouseholdNotFound {
			JSON(w, http.StatusOK, map[string]interface{}{
				"by_category": []interface{}{},
				"total":       "0",
				"currency":    user.BaseCurrency,
			})
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch household")
		return
	}

	report, err := h.reportService.GetAssetAllocation(r.Context(), household.ID, userID, user.BaseCurrency)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to generate report")
		return
	}

	JSON(w, http.StatusOK, report)
}

// GetUpcomingEvents returns upcoming events summary
func (h *ReportHandler) GetUpcomingEvents(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	household, err := h.householdRepo.GetDefaultHousehold(r.Context(), userID)
	if err != nil {
		if err == repository.ErrHouseholdNotFound {
			JSON(w, http.StatusOK, map[string]interface{}{
				"total_events":     0,
				"overdue_events":   0,
				"by_type":          map[string]int{},
				"next_seven_days":  0,
				"next_thirty_days": 0,
			})
			return
		}
		Error(w, http.StatusInternalServerError, "Failed to fetch household")
		return
	}

	report, err := h.reportService.GetUpcomingEvents(r.Context(), household.ID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to generate report")
		return
	}

	JSON(w, http.StatusOK, report)
}
