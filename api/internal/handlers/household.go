package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/mark-regan/wellf/internal/middleware"
	"github.com/mark-regan/wellf/internal/models"
	"github.com/mark-regan/wellf/internal/repository"
)

// HouseholdHandler handles household-related HTTP requests
type HouseholdHandler struct {
	householdRepo *repository.HouseholdRepository
}

// NewHouseholdHandler creates a new household handler
func NewHouseholdHandler(householdRepo *repository.HouseholdRepository) *HouseholdHandler {
	return &HouseholdHandler{householdRepo: householdRepo}
}

// Routes returns the household routes
func (h *HouseholdHandler) Routes() chi.Router {
	r := chi.NewRouter()

	// Summary
	r.Get("/summary", h.getSummary)

	// Bills
	r.Route("/bills", func(r chi.Router) {
		r.Get("/", h.listBills)
		r.Post("/", h.createBill)
		r.Get("/{id}", h.getBill)
		r.Put("/{id}", h.updateBill)
		r.Delete("/{id}", h.deleteBill)
		r.Post("/{id}/pay", h.recordBillPayment)
		r.Get("/{id}/payments", h.getBillPayments)
	})

	// Subscriptions
	r.Route("/subscriptions", func(r chi.Router) {
		r.Get("/", h.listSubscriptions)
		r.Post("/", h.createSubscription)
		r.Get("/{id}", h.getSubscription)
		r.Put("/{id}", h.updateSubscription)
		r.Delete("/{id}", h.deleteSubscription)
	})

	// Insurance
	r.Route("/insurance", func(r chi.Router) {
		r.Get("/", h.listInsurancePolicies)
		r.Post("/", h.createInsurancePolicy)
		r.Get("/{id}", h.getInsurancePolicy)
		r.Put("/{id}", h.updateInsurancePolicy)
		r.Delete("/{id}", h.deleteInsurancePolicy)
	})

	// Maintenance
	r.Route("/maintenance", func(r chi.Router) {
		r.Get("/", h.listMaintenanceTasks)
		r.Post("/", h.createMaintenanceTask)
		r.Get("/logs", h.getMaintenanceLogs)
		r.Get("/{id}", h.getMaintenanceTask)
		r.Put("/{id}", h.updateMaintenanceTask)
		r.Delete("/{id}", h.deleteMaintenanceTask)
		r.Post("/{id}/complete", h.completeMaintenanceTask)
	})

	return r
}

// =============================================================================
// Summary
// =============================================================================

func (h *HouseholdHandler) getSummary(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	// Get user's currency preference (default to GBP)
	currency := "GBP"
	if c := r.URL.Query().Get("currency"); c != "" {
		currency = c
	}

	summary, err := h.householdRepo.GetHouseholdSummary(r.Context(), userID, currency)
	if err != nil {
		http.Error(w, "failed to get summary: "+err.Error(), http.StatusInternalServerError)
		return
	}

	JSON(w, http.StatusOK, summary)
}

// =============================================================================
// Bills
// =============================================================================

func (h *HouseholdHandler) listBills(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	activeOnly := true
	if all := r.URL.Query().Get("all"); all == "true" {
		activeOnly = false
	}

	bills, err := h.householdRepo.ListBills(r.Context(), userID, activeOnly)
	if err != nil {
		http.Error(w, "failed to list bills: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if bills == nil {
		bills = []models.Bill{}
	}

	JSON(w, http.StatusOK, bills)
}

func (h *HouseholdHandler) createBill(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	var req models.CreateBillRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Name == "" || req.Category == "" || req.Amount <= 0 {
		http.Error(w, "name, category, and amount are required", http.StatusBadRequest)
		return
	}

	bill := &models.Bill{
		UserID:        userID,
		Name:          req.Name,
		Description:   req.Description,
		Category:      req.Category,
		Amount:        req.Amount,
		Currency:      req.Currency,
		Provider:      req.Provider,
		AccountNumber: req.AccountNumber,
		Reference:     req.Reference,
		Frequency:     req.Frequency,
		DueDay:        req.DueDay,
		PaymentMethod: req.PaymentMethod,
		AutoPay:       req.AutoPay,
		Notes:         req.Notes,
	}

	if req.ReminderDays != nil {
		bill.ReminderDays = *req.ReminderDays
	}

	// Parse dates
	if req.StartDate != nil {
		if t, err := time.Parse("2006-01-02", *req.StartDate); err == nil {
			bill.StartDate = &t
		}
	}
	if req.EndDate != nil {
		if t, err := time.Parse("2006-01-02", *req.EndDate); err == nil {
			bill.EndDate = &t
		}
	}
	if req.NextDueDate != nil {
		if t, err := time.Parse("2006-01-02", *req.NextDueDate); err == nil {
			bill.NextDueDate = &t
		}
	}

	if err := h.householdRepo.CreateBill(r.Context(), bill); err != nil {
		http.Error(w, "failed to create bill: "+err.Error(), http.StatusInternalServerError)
		return
	}

	JSON(w, http.StatusCreated, bill)
}

func (h *HouseholdHandler) getBill(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	billID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid bill ID", http.StatusBadRequest)
		return
	}

	bill, err := h.householdRepo.GetBillByID(r.Context(), userID, billID)
	if err != nil {
		if err == pgx.ErrNoRows {
			http.Error(w, "bill not found", http.StatusNotFound)
			return
		}
		http.Error(w, "failed to get bill: "+err.Error(), http.StatusInternalServerError)
		return
	}

	JSON(w, http.StatusOK, bill)
}

func (h *HouseholdHandler) updateBill(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	billID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid bill ID", http.StatusBadRequest)
		return
	}

	bill, err := h.householdRepo.GetBillByID(r.Context(), userID, billID)
	if err != nil {
		if err == pgx.ErrNoRows {
			http.Error(w, "bill not found", http.StatusNotFound)
			return
		}
		http.Error(w, "failed to get bill: "+err.Error(), http.StatusInternalServerError)
		return
	}

	var req models.UpdateBillRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	// Apply updates
	if req.Name != nil {
		bill.Name = *req.Name
	}
	if req.Description != nil {
		bill.Description = *req.Description
	}
	if req.Category != nil {
		bill.Category = *req.Category
	}
	if req.Amount != nil {
		bill.Amount = *req.Amount
	}
	if req.Currency != nil {
		bill.Currency = *req.Currency
	}
	if req.Provider != nil {
		bill.Provider = *req.Provider
	}
	if req.AccountNumber != nil {
		bill.AccountNumber = *req.AccountNumber
	}
	if req.Reference != nil {
		bill.Reference = *req.Reference
	}
	if req.Frequency != nil {
		bill.Frequency = *req.Frequency
	}
	if req.DueDay != nil {
		bill.DueDay = req.DueDay
	}
	if req.PaymentMethod != nil {
		bill.PaymentMethod = *req.PaymentMethod
	}
	if req.IsActive != nil {
		bill.IsActive = *req.IsActive
	}
	if req.AutoPay != nil {
		bill.AutoPay = *req.AutoPay
	}
	if req.ReminderDays != nil {
		bill.ReminderDays = *req.ReminderDays
	}
	if req.Notes != nil {
		bill.Notes = *req.Notes
	}

	// Parse dates
	if req.StartDate != nil {
		if t, err := time.Parse("2006-01-02", *req.StartDate); err == nil {
			bill.StartDate = &t
		}
	}
	if req.EndDate != nil {
		if t, err := time.Parse("2006-01-02", *req.EndDate); err == nil {
			bill.EndDate = &t
		}
	}
	if req.NextDueDate != nil {
		if t, err := time.Parse("2006-01-02", *req.NextDueDate); err == nil {
			bill.NextDueDate = &t
		}
	}

	if err := h.householdRepo.UpdateBill(r.Context(), bill); err != nil {
		http.Error(w, "failed to update bill: "+err.Error(), http.StatusInternalServerError)
		return
	}

	JSON(w, http.StatusOK, bill)
}

func (h *HouseholdHandler) deleteBill(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	billID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid bill ID", http.StatusBadRequest)
		return
	}

	if err := h.householdRepo.DeleteBill(r.Context(), userID, billID); err != nil {
		http.Error(w, "failed to delete bill: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *HouseholdHandler) recordBillPayment(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	billID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid bill ID", http.StatusBadRequest)
		return
	}

	var req models.RecordBillPaymentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Amount <= 0 {
		http.Error(w, "amount is required", http.StatusBadRequest)
		return
	}

	payment := &models.BillPayment{
		BillID:             billID,
		UserID:             userID,
		Amount:             req.Amount,
		PaidDate:           time.Now(),
		PaymentMethod:      req.PaymentMethod,
		ConfirmationNumber: req.ConfirmationNumber,
		Notes:              req.Notes,
	}

	if req.PaidDate != nil {
		if t, err := time.Parse("2006-01-02", *req.PaidDate); err == nil {
			payment.PaidDate = t
		}
	}

	if err := h.householdRepo.RecordBillPayment(r.Context(), payment); err != nil {
		http.Error(w, "failed to record payment: "+err.Error(), http.StatusInternalServerError)
		return
	}

	JSON(w, http.StatusCreated, payment)
}

func (h *HouseholdHandler) getBillPayments(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	billID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid bill ID", http.StatusBadRequest)
		return
	}

	payments, err := h.householdRepo.GetBillPayments(r.Context(), userID, billID)
	if err != nil {
		http.Error(w, "failed to get payments: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if payments == nil {
		payments = []models.BillPayment{}
	}

	JSON(w, http.StatusOK, payments)
}

// =============================================================================
// Subscriptions
// =============================================================================

func (h *HouseholdHandler) listSubscriptions(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	activeOnly := true
	if all := r.URL.Query().Get("all"); all == "true" {
		activeOnly = false
	}

	subs, err := h.householdRepo.ListSubscriptions(r.Context(), userID, activeOnly)
	if err != nil {
		http.Error(w, "failed to list subscriptions: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if subs == nil {
		subs = []models.Subscription{}
	}

	JSON(w, http.StatusOK, subs)
}

func (h *HouseholdHandler) createSubscription(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	var req models.CreateSubscriptionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Name == "" || req.Category == "" || req.Amount <= 0 {
		http.Error(w, "name, category, and amount are required", http.StatusBadRequest)
		return
	}

	sub := &models.Subscription{
		UserID:     userID,
		Name:       req.Name,
		Description: req.Description,
		Category:   req.Category,
		Amount:     req.Amount,
		Currency:   req.Currency,
		Provider:   req.Provider,
		WebsiteURL: req.WebsiteURL,
		CancelURL:  req.CancelURL,
		Frequency:  req.Frequency,
		BillingDay: req.BillingDay,
		IsShared:   req.IsShared,
		IsTrial:    req.IsTrial,
		Notes:      req.Notes,
	}

	// Parse dates
	if req.NextBillingDate != nil {
		if t, err := time.Parse("2006-01-02", *req.NextBillingDate); err == nil {
			sub.NextBillingDate = &t
		}
	}
	if req.TrialEndDate != nil {
		if t, err := time.Parse("2006-01-02", *req.TrialEndDate); err == nil {
			sub.TrialEndDate = &t
		}
	}
	if req.StartDate != nil {
		if t, err := time.Parse("2006-01-02", *req.StartDate); err == nil {
			sub.StartDate = &t
		}
	}

	if err := h.householdRepo.CreateSubscription(r.Context(), sub); err != nil {
		http.Error(w, "failed to create subscription: "+err.Error(), http.StatusInternalServerError)
		return
	}

	JSON(w, http.StatusCreated, sub)
}

func (h *HouseholdHandler) getSubscription(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	subID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid subscription ID", http.StatusBadRequest)
		return
	}

	sub, err := h.householdRepo.GetSubscriptionByID(r.Context(), userID, subID)
	if err != nil {
		if err == pgx.ErrNoRows {
			http.Error(w, "subscription not found", http.StatusNotFound)
			return
		}
		http.Error(w, "failed to get subscription: "+err.Error(), http.StatusInternalServerError)
		return
	}

	JSON(w, http.StatusOK, sub)
}

func (h *HouseholdHandler) updateSubscription(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	subID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid subscription ID", http.StatusBadRequest)
		return
	}

	sub, err := h.householdRepo.GetSubscriptionByID(r.Context(), userID, subID)
	if err != nil {
		if err == pgx.ErrNoRows {
			http.Error(w, "subscription not found", http.StatusNotFound)
			return
		}
		http.Error(w, "failed to get subscription: "+err.Error(), http.StatusInternalServerError)
		return
	}

	var req models.UpdateSubscriptionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	// Apply updates
	if req.Name != nil {
		sub.Name = *req.Name
	}
	if req.Description != nil {
		sub.Description = *req.Description
	}
	if req.Category != nil {
		sub.Category = *req.Category
	}
	if req.Amount != nil {
		sub.Amount = *req.Amount
	}
	if req.Currency != nil {
		sub.Currency = *req.Currency
	}
	if req.Provider != nil {
		sub.Provider = *req.Provider
	}
	if req.WebsiteURL != nil {
		sub.WebsiteURL = *req.WebsiteURL
	}
	if req.CancelURL != nil {
		sub.CancelURL = *req.CancelURL
	}
	if req.Frequency != nil {
		sub.Frequency = *req.Frequency
	}
	if req.BillingDay != nil {
		sub.BillingDay = req.BillingDay
	}
	if req.IsActive != nil {
		sub.IsActive = *req.IsActive
	}
	if req.IsShared != nil {
		sub.IsShared = *req.IsShared
	}
	if req.IsTrial != nil {
		sub.IsTrial = *req.IsTrial
	}
	if req.Notes != nil {
		sub.Notes = *req.Notes
	}

	// Parse dates
	if req.NextBillingDate != nil {
		if t, err := time.Parse("2006-01-02", *req.NextBillingDate); err == nil {
			sub.NextBillingDate = &t
		}
	}
	if req.TrialEndDate != nil {
		if t, err := time.Parse("2006-01-02", *req.TrialEndDate); err == nil {
			sub.TrialEndDate = &t
		}
	}
	if req.CancelledDate != nil {
		if t, err := time.Parse("2006-01-02", *req.CancelledDate); err == nil {
			sub.CancelledDate = &t
		}
	}

	if err := h.householdRepo.UpdateSubscription(r.Context(), sub); err != nil {
		http.Error(w, "failed to update subscription: "+err.Error(), http.StatusInternalServerError)
		return
	}

	JSON(w, http.StatusOK, sub)
}

func (h *HouseholdHandler) deleteSubscription(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	subID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid subscription ID", http.StatusBadRequest)
		return
	}

	if err := h.householdRepo.DeleteSubscription(r.Context(), userID, subID); err != nil {
		http.Error(w, "failed to delete subscription: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// =============================================================================
// Insurance
// =============================================================================

func (h *HouseholdHandler) listInsurancePolicies(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	activeOnly := true
	if all := r.URL.Query().Get("all"); all == "true" {
		activeOnly = false
	}

	policies, err := h.householdRepo.ListInsurancePolicies(r.Context(), userID, activeOnly)
	if err != nil {
		http.Error(w, "failed to list insurance policies: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if policies == nil {
		policies = []models.InsurancePolicy{}
	}

	JSON(w, http.StatusOK, policies)
}

func (h *HouseholdHandler) createInsurancePolicy(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	var req models.CreateInsurancePolicyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Name == "" || req.PolicyType == "" || req.Provider == "" || req.PremiumAmount <= 0 {
		http.Error(w, "name, policy_type, provider, and premium_amount are required", http.StatusBadRequest)
		return
	}

	startDate, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		http.Error(w, "invalid start_date format (use YYYY-MM-DD)", http.StatusBadRequest)
		return
	}

	policy := &models.InsurancePolicy{
		UserID:           userID,
		Name:             req.Name,
		PolicyType:       req.PolicyType,
		Provider:         req.Provider,
		PolicyNumber:     req.PolicyNumber,
		Phone:            req.Phone,
		WebsiteURL:       req.WebsiteURL,
		CoverageAmount:   req.CoverageAmount,
		ExcessAmount:     req.ExcessAmount,
		CoverageDetails:  req.CoverageDetails,
		PremiumAmount:    req.PremiumAmount,
		Currency:         req.Currency,
		PaymentFrequency: req.PaymentFrequency,
		StartDate:        startDate,
		AutoRenew:        req.AutoRenew,
		DocumentURL:      req.DocumentURL,
		Notes:            req.Notes,
	}

	// Parse optional dates
	if req.EndDate != nil {
		if t, err := time.Parse("2006-01-02", *req.EndDate); err == nil {
			policy.EndDate = &t
		}
	}
	if req.RenewalDate != nil {
		if t, err := time.Parse("2006-01-02", *req.RenewalDate); err == nil {
			policy.RenewalDate = &t
		}
	}
	if req.NextPaymentDate != nil {
		if t, err := time.Parse("2006-01-02", *req.NextPaymentDate); err == nil {
			policy.NextPaymentDate = &t
		}
	}

	if err := h.householdRepo.CreateInsurancePolicy(r.Context(), policy); err != nil {
		http.Error(w, "failed to create insurance policy: "+err.Error(), http.StatusInternalServerError)
		return
	}

	JSON(w, http.StatusCreated, policy)
}

func (h *HouseholdHandler) getInsurancePolicy(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	policyID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid policy ID", http.StatusBadRequest)
		return
	}

	policy, err := h.householdRepo.GetInsurancePolicyByID(r.Context(), userID, policyID)
	if err != nil {
		if err == pgx.ErrNoRows {
			http.Error(w, "insurance policy not found", http.StatusNotFound)
			return
		}
		http.Error(w, "failed to get insurance policy: "+err.Error(), http.StatusInternalServerError)
		return
	}

	JSON(w, http.StatusOK, policy)
}

func (h *HouseholdHandler) updateInsurancePolicy(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	policyID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid policy ID", http.StatusBadRequest)
		return
	}

	policy, err := h.householdRepo.GetInsurancePolicyByID(r.Context(), userID, policyID)
	if err != nil {
		if err == pgx.ErrNoRows {
			http.Error(w, "insurance policy not found", http.StatusNotFound)
			return
		}
		http.Error(w, "failed to get insurance policy: "+err.Error(), http.StatusInternalServerError)
		return
	}

	var req models.UpdateInsurancePolicyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	// Apply updates
	if req.Name != nil {
		policy.Name = *req.Name
	}
	if req.PolicyType != nil {
		policy.PolicyType = *req.PolicyType
	}
	if req.Provider != nil {
		policy.Provider = *req.Provider
	}
	if req.PolicyNumber != nil {
		policy.PolicyNumber = *req.PolicyNumber
	}
	if req.Phone != nil {
		policy.Phone = *req.Phone
	}
	if req.WebsiteURL != nil {
		policy.WebsiteURL = *req.WebsiteURL
	}
	if req.CoverageAmount != nil {
		policy.CoverageAmount = req.CoverageAmount
	}
	if req.ExcessAmount != nil {
		policy.ExcessAmount = req.ExcessAmount
	}
	if req.CoverageDetails != nil {
		policy.CoverageDetails = *req.CoverageDetails
	}
	if req.PremiumAmount != nil {
		policy.PremiumAmount = *req.PremiumAmount
	}
	if req.Currency != nil {
		policy.Currency = *req.Currency
	}
	if req.PaymentFrequency != nil {
		policy.PaymentFrequency = *req.PaymentFrequency
	}
	if req.IsActive != nil {
		policy.IsActive = *req.IsActive
	}
	if req.AutoRenew != nil {
		policy.AutoRenew = *req.AutoRenew
	}
	if req.DocumentURL != nil {
		policy.DocumentURL = *req.DocumentURL
	}
	if req.Notes != nil {
		policy.Notes = *req.Notes
	}

	// Parse dates
	if req.StartDate != nil {
		if t, err := time.Parse("2006-01-02", *req.StartDate); err == nil {
			policy.StartDate = t
		}
	}
	if req.EndDate != nil {
		if t, err := time.Parse("2006-01-02", *req.EndDate); err == nil {
			policy.EndDate = &t
		}
	}
	if req.RenewalDate != nil {
		if t, err := time.Parse("2006-01-02", *req.RenewalDate); err == nil {
			policy.RenewalDate = &t
		}
	}
	if req.NextPaymentDate != nil {
		if t, err := time.Parse("2006-01-02", *req.NextPaymentDate); err == nil {
			policy.NextPaymentDate = &t
		}
	}

	if err := h.householdRepo.UpdateInsurancePolicy(r.Context(), policy); err != nil {
		http.Error(w, "failed to update insurance policy: "+err.Error(), http.StatusInternalServerError)
		return
	}

	JSON(w, http.StatusOK, policy)
}

func (h *HouseholdHandler) deleteInsurancePolicy(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	policyID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid policy ID", http.StatusBadRequest)
		return
	}

	if err := h.householdRepo.DeleteInsurancePolicy(r.Context(), userID, policyID); err != nil {
		http.Error(w, "failed to delete insurance policy: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// =============================================================================
// Maintenance
// =============================================================================

func (h *HouseholdHandler) listMaintenanceTasks(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	activeOnly := true
	if all := r.URL.Query().Get("all"); all == "true" {
		activeOnly = false
	}

	tasks, err := h.householdRepo.ListMaintenanceTasks(r.Context(), userID, activeOnly)
	if err != nil {
		http.Error(w, "failed to list maintenance tasks: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if tasks == nil {
		tasks = []models.MaintenanceTask{}
	}

	JSON(w, http.StatusOK, tasks)
}

func (h *HouseholdHandler) createMaintenanceTask(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	var req models.CreateMaintenanceTaskRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Name == "" || req.Category == "" {
		http.Error(w, "name and category are required", http.StatusBadRequest)
		return
	}

	task := &models.MaintenanceTask{
		UserID:          userID,
		Name:            req.Name,
		Description:     req.Description,
		Category:        req.Category,
		Frequency:       req.Frequency,
		FrequencyMonths: req.FrequencyMonths,
		Priority:        req.Priority,
		EstimatedCost:   req.EstimatedCost,
		TypicalProvider: req.TypicalProvider,
		Notes:           req.Notes,
	}

	if req.ReminderDays != nil {
		task.ReminderDays = *req.ReminderDays
	}

	if req.NextDueDate != nil {
		if t, err := time.Parse("2006-01-02", *req.NextDueDate); err == nil {
			task.NextDueDate = &t
		}
	}

	if err := h.householdRepo.CreateMaintenanceTask(r.Context(), task); err != nil {
		http.Error(w, "failed to create maintenance task: "+err.Error(), http.StatusInternalServerError)
		return
	}

	JSON(w, http.StatusCreated, task)
}

func (h *HouseholdHandler) getMaintenanceTask(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	taskID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid task ID", http.StatusBadRequest)
		return
	}

	task, err := h.householdRepo.GetMaintenanceTaskByID(r.Context(), userID, taskID)
	if err != nil {
		if err == pgx.ErrNoRows {
			http.Error(w, "maintenance task not found", http.StatusNotFound)
			return
		}
		http.Error(w, "failed to get maintenance task: "+err.Error(), http.StatusInternalServerError)
		return
	}

	JSON(w, http.StatusOK, task)
}

func (h *HouseholdHandler) updateMaintenanceTask(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	taskID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid task ID", http.StatusBadRequest)
		return
	}

	task, err := h.householdRepo.GetMaintenanceTaskByID(r.Context(), userID, taskID)
	if err != nil {
		if err == pgx.ErrNoRows {
			http.Error(w, "maintenance task not found", http.StatusNotFound)
			return
		}
		http.Error(w, "failed to get maintenance task: "+err.Error(), http.StatusInternalServerError)
		return
	}

	var req models.UpdateMaintenanceTaskRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	// Apply updates
	if req.Name != nil {
		task.Name = *req.Name
	}
	if req.Description != nil {
		task.Description = *req.Description
	}
	if req.Category != nil {
		task.Category = *req.Category
	}
	if req.Frequency != nil {
		task.Frequency = *req.Frequency
	}
	if req.FrequencyMonths != nil {
		task.FrequencyMonths = req.FrequencyMonths
	}
	if req.Priority != nil {
		task.Priority = *req.Priority
	}
	if req.ReminderDays != nil {
		task.ReminderDays = *req.ReminderDays
	}
	if req.EstimatedCost != nil {
		task.EstimatedCost = req.EstimatedCost
	}
	if req.TypicalProvider != nil {
		task.TypicalProvider = *req.TypicalProvider
	}
	if req.IsActive != nil {
		task.IsActive = *req.IsActive
	}
	if req.Notes != nil {
		task.Notes = *req.Notes
	}

	if req.NextDueDate != nil {
		if t, err := time.Parse("2006-01-02", *req.NextDueDate); err == nil {
			task.NextDueDate = &t
		}
	}

	if err := h.householdRepo.UpdateMaintenanceTask(r.Context(), task); err != nil {
		http.Error(w, "failed to update maintenance task: "+err.Error(), http.StatusInternalServerError)
		return
	}

	JSON(w, http.StatusOK, task)
}

func (h *HouseholdHandler) deleteMaintenanceTask(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	taskID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid task ID", http.StatusBadRequest)
		return
	}

	if err := h.householdRepo.DeleteMaintenanceTask(r.Context(), userID, taskID); err != nil {
		http.Error(w, "failed to delete maintenance task: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *HouseholdHandler) completeMaintenanceTask(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	taskID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid task ID", http.StatusBadRequest)
		return
	}

	var req models.LogMaintenanceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	log := &models.MaintenanceLog{
		CompletedDate:   time.Now(),
		Cost:            req.Cost,
		Currency:        req.Currency,
		Provider:        req.Provider,
		ProviderContact: req.ProviderContact,
		WorkDone:        req.WorkDone,
		PartsUsed:       req.PartsUsed,
		DurationMinutes: req.DurationMinutes,
		ReceiptURL:      req.ReceiptURL,
		PhotoURL:        req.PhotoURL,
		Notes:           req.Notes,
	}

	if req.CompletedDate != nil {
		if t, err := time.Parse("2006-01-02", *req.CompletedDate); err == nil {
			log.CompletedDate = t
		}
	}

	if err := h.householdRepo.CompleteMaintenanceTask(r.Context(), userID, taskID, log); err != nil {
		http.Error(w, "failed to complete task: "+err.Error(), http.StatusInternalServerError)
		return
	}

	JSON(w, http.StatusCreated, log)
}

func (h *HouseholdHandler) getMaintenanceLogs(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	var taskID *uuid.UUID
	if tidStr := r.URL.Query().Get("task_id"); tidStr != "" {
		if tid, err := uuid.Parse(tidStr); err == nil {
			taskID = &tid
		}
	}

	limit := 50 // Default limit
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := parseIntParam(l); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	logs, err := h.householdRepo.GetMaintenanceLogs(r.Context(), userID, taskID, limit)
	if err != nil {
		http.Error(w, "failed to get maintenance logs: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if logs == nil {
		logs = []models.MaintenanceLog{}
	}

	JSON(w, http.StatusOK, logs)
}

// parseIntParam parses an integer from a query parameter
func parseIntParam(s string) (int, error) {
	var i int
	err := json.Unmarshal([]byte(s), &i)
	return i, err
}
