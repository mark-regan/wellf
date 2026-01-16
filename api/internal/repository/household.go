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

// HouseholdRepository handles household database operations
type HouseholdRepository struct {
	pool *pgxpool.Pool
}

// NewHouseholdRepository creates a new household repository
func NewHouseholdRepository(pool *pgxpool.Pool) *HouseholdRepository {
	return &HouseholdRepository{pool: pool}
}

// =============================================================================
// Bills
// =============================================================================

// CreateBill adds a new bill
func (r *HouseholdRepository) CreateBill(ctx context.Context, bill *models.Bill) error {
	query := `
		INSERT INTO bills (
			user_id, name, description, category, amount, currency,
			provider, account_number, reference, frequency, due_day,
			start_date, end_date, next_due_date, payment_method,
			is_active, auto_pay, reminder_days, notes
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
		RETURNING id, created_at, updated_at`

	// Set defaults
	if bill.Currency == "" {
		bill.Currency = "GBP"
	}
	if bill.Frequency == "" {
		bill.Frequency = models.BillFrequencyMonthly
	}
	if bill.ReminderDays == 0 {
		bill.ReminderDays = 3
	}
	bill.IsActive = true

	return r.pool.QueryRow(ctx, query,
		bill.UserID,
		bill.Name,
		nullString(bill.Description),
		bill.Category,
		bill.Amount,
		bill.Currency,
		nullString(bill.Provider),
		nullString(bill.AccountNumber),
		nullString(bill.Reference),
		bill.Frequency,
		bill.DueDay,
		bill.StartDate,
		bill.EndDate,
		bill.NextDueDate,
		nullString(bill.PaymentMethod),
		bill.IsActive,
		bill.AutoPay,
		bill.ReminderDays,
		nullString(bill.Notes),
	).Scan(&bill.ID, &bill.CreatedAt, &bill.UpdatedAt)
}

// GetBillByID retrieves a bill by ID
func (r *HouseholdRepository) GetBillByID(ctx context.Context, userID, billID uuid.UUID) (*models.Bill, error) {
	query := `
		SELECT b.id, b.user_id, b.name, b.description, b.category, b.amount, b.currency,
			b.provider, b.account_number, b.reference, b.frequency, b.due_day,
			b.start_date, b.end_date, b.next_due_date, b.payment_method,
			b.is_active, b.auto_pay, b.reminder_days, b.notes,
			b.created_at, b.updated_at,
			(SELECT MAX(paid_date) FROM bill_payments WHERE bill_id = b.id) as last_payment_date
		FROM bills b
		WHERE b.id = $1 AND b.user_id = $2`

	return r.scanBill(r.pool.QueryRow(ctx, query, billID, userID))
}

// ListBills retrieves all bills for a user
func (r *HouseholdRepository) ListBills(ctx context.Context, userID uuid.UUID, activeOnly bool) ([]models.Bill, error) {
	query := `
		SELECT b.id, b.user_id, b.name, b.description, b.category, b.amount, b.currency,
			b.provider, b.account_number, b.reference, b.frequency, b.due_day,
			b.start_date, b.end_date, b.next_due_date, b.payment_method,
			b.is_active, b.auto_pay, b.reminder_days, b.notes,
			b.created_at, b.updated_at,
			(SELECT MAX(paid_date) FROM bill_payments WHERE bill_id = b.id) as last_payment_date
		FROM bills b
		WHERE b.user_id = $1`

	if activeOnly {
		query += " AND b.is_active = true"
	}

	query += " ORDER BY b.next_due_date ASC NULLS LAST, b.name ASC"

	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var bills []models.Bill
	for rows.Next() {
		bill, err := r.scanBillFromRows(rows)
		if err != nil {
			return nil, err
		}
		bills = append(bills, *bill)
	}

	return bills, nil
}

// UpdateBill updates a bill
func (r *HouseholdRepository) UpdateBill(ctx context.Context, bill *models.Bill) error {
	query := `
		UPDATE bills SET
			name = $3, description = $4, category = $5, amount = $6, currency = $7,
			provider = $8, account_number = $9, reference = $10, frequency = $11, due_day = $12,
			start_date = $13, end_date = $14, next_due_date = $15, payment_method = $16,
			is_active = $17, auto_pay = $18, reminder_days = $19, notes = $20
		WHERE id = $1 AND user_id = $2
		RETURNING updated_at`

	return r.pool.QueryRow(ctx, query,
		bill.ID,
		bill.UserID,
		bill.Name,
		nullString(bill.Description),
		bill.Category,
		bill.Amount,
		bill.Currency,
		nullString(bill.Provider),
		nullString(bill.AccountNumber),
		nullString(bill.Reference),
		bill.Frequency,
		bill.DueDay,
		bill.StartDate,
		bill.EndDate,
		bill.NextDueDate,
		nullString(bill.PaymentMethod),
		bill.IsActive,
		bill.AutoPay,
		bill.ReminderDays,
		nullString(bill.Notes),
	).Scan(&bill.UpdatedAt)
}

// DeleteBill deletes a bill
func (r *HouseholdRepository) DeleteBill(ctx context.Context, userID, billID uuid.UUID) error {
	_, err := r.pool.Exec(ctx, "DELETE FROM bills WHERE id = $1 AND user_id = $2", billID, userID)
	return err
}

// RecordBillPayment records a payment for a bill
func (r *HouseholdRepository) RecordBillPayment(ctx context.Context, payment *models.BillPayment) error {
	// Get the bill to check ownership and get currency
	bill, err := r.GetBillByID(ctx, payment.UserID, payment.BillID)
	if err != nil {
		return fmt.Errorf("bill not found: %w", err)
	}

	if payment.Currency == "" {
		payment.Currency = bill.Currency
	}

	// Check if payment is late
	if bill.NextDueDate != nil && payment.PaidDate.After(*bill.NextDueDate) {
		payment.IsLate = true
	}
	payment.DueDate = bill.NextDueDate

	query := `
		INSERT INTO bill_payments (
			bill_id, user_id, amount, currency, paid_date, due_date,
			payment_method, confirmation_number, is_late, notes
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, created_at`

	err = r.pool.QueryRow(ctx, query,
		payment.BillID,
		payment.UserID,
		payment.Amount,
		payment.Currency,
		payment.PaidDate,
		payment.DueDate,
		nullString(payment.PaymentMethod),
		nullString(payment.ConfirmationNumber),
		payment.IsLate,
		nullString(payment.Notes),
	).Scan(&payment.ID, &payment.CreatedAt)

	if err != nil {
		return err
	}

	// Update next due date on the bill
	return r.advanceBillDueDate(ctx, payment.UserID, payment.BillID)
}

// advanceBillDueDate calculates and sets the next due date for a bill
func (r *HouseholdRepository) advanceBillDueDate(ctx context.Context, userID, billID uuid.UUID) error {
	bill, err := r.GetBillByID(ctx, userID, billID)
	if err != nil {
		return err
	}

	if bill.NextDueDate == nil || bill.Frequency == models.BillFrequencyOneTime {
		return nil
	}

	next := *bill.NextDueDate
	switch bill.Frequency {
	case models.BillFrequencyWeekly:
		next = next.AddDate(0, 0, 7)
	case models.BillFrequencyFortnightly:
		next = next.AddDate(0, 0, 14)
	case models.BillFrequencyMonthly:
		next = next.AddDate(0, 1, 0)
	case models.BillFrequencyQuarterly:
		next = next.AddDate(0, 3, 0)
	case models.BillFrequencyAnnually:
		next = next.AddDate(1, 0, 0)
	}

	_, err = r.pool.Exec(ctx,
		"UPDATE bills SET next_due_date = $3 WHERE id = $1 AND user_id = $2",
		billID, userID, next)
	return err
}

// GetBillPayments retrieves payment history for a bill
func (r *HouseholdRepository) GetBillPayments(ctx context.Context, userID, billID uuid.UUID) ([]models.BillPayment, error) {
	query := `
		SELECT bp.id, bp.bill_id, bp.user_id, bp.amount, bp.currency, bp.paid_date, bp.due_date,
			bp.payment_method, bp.confirmation_number, bp.is_late, bp.notes, bp.created_at,
			b.name as bill_name
		FROM bill_payments bp
		JOIN bills b ON bp.bill_id = b.id
		WHERE bp.bill_id = $1 AND bp.user_id = $2
		ORDER BY bp.paid_date DESC`

	rows, err := r.pool.Query(ctx, query, billID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var payments []models.BillPayment
	for rows.Next() {
		var payment models.BillPayment
		var paymentMethod, confirmationNumber, notes, billName *string

		err := rows.Scan(
			&payment.ID, &payment.BillID, &payment.UserID, &payment.Amount, &payment.Currency,
			&payment.PaidDate, &payment.DueDate, &paymentMethod, &confirmationNumber,
			&payment.IsLate, &notes, &payment.CreatedAt, &billName,
		)
		if err != nil {
			return nil, err
		}

		if paymentMethod != nil {
			payment.PaymentMethod = *paymentMethod
		}
		if confirmationNumber != nil {
			payment.ConfirmationNumber = *confirmationNumber
		}
		if notes != nil {
			payment.Notes = *notes
		}
		if billName != nil {
			payment.BillName = *billName
		}

		payments = append(payments, payment)
	}

	return payments, nil
}

func (r *HouseholdRepository) scanBill(row pgx.Row) (*models.Bill, error) {
	bill := &models.Bill{}
	var description, provider, accountNumber, reference, paymentMethod, notes *string

	err := row.Scan(
		&bill.ID, &bill.UserID, &bill.Name, &description, &bill.Category, &bill.Amount, &bill.Currency,
		&provider, &accountNumber, &reference, &bill.Frequency, &bill.DueDay,
		&bill.StartDate, &bill.EndDate, &bill.NextDueDate, &paymentMethod,
		&bill.IsActive, &bill.AutoPay, &bill.ReminderDays, &notes,
		&bill.CreatedAt, &bill.UpdatedAt, &bill.LastPaymentDate,
	)
	if err != nil {
		return nil, err
	}

	if description != nil {
		bill.Description = *description
	}
	if provider != nil {
		bill.Provider = *provider
	}
	if accountNumber != nil {
		bill.AccountNumber = *accountNumber
	}
	if reference != nil {
		bill.Reference = *reference
	}
	if paymentMethod != nil {
		bill.PaymentMethod = *paymentMethod
	}
	if notes != nil {
		bill.Notes = *notes
	}

	r.calculateBillDays(bill)
	return bill, nil
}

func (r *HouseholdRepository) scanBillFromRows(rows pgx.Rows) (*models.Bill, error) {
	bill := &models.Bill{}
	var description, provider, accountNumber, reference, paymentMethod, notes *string

	err := rows.Scan(
		&bill.ID, &bill.UserID, &bill.Name, &description, &bill.Category, &bill.Amount, &bill.Currency,
		&provider, &accountNumber, &reference, &bill.Frequency, &bill.DueDay,
		&bill.StartDate, &bill.EndDate, &bill.NextDueDate, &paymentMethod,
		&bill.IsActive, &bill.AutoPay, &bill.ReminderDays, &notes,
		&bill.CreatedAt, &bill.UpdatedAt, &bill.LastPaymentDate,
	)
	if err != nil {
		return nil, err
	}

	if description != nil {
		bill.Description = *description
	}
	if provider != nil {
		bill.Provider = *provider
	}
	if accountNumber != nil {
		bill.AccountNumber = *accountNumber
	}
	if reference != nil {
		bill.Reference = *reference
	}
	if paymentMethod != nil {
		bill.PaymentMethod = *paymentMethod
	}
	if notes != nil {
		bill.Notes = *notes
	}

	r.calculateBillDays(bill)
	return bill, nil
}

func (r *HouseholdRepository) calculateBillDays(bill *models.Bill) {
	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.Local)

	if bill.NextDueDate != nil {
		days := int(bill.NextDueDate.Sub(today).Hours() / 24)
		bill.DaysUntilDue = &days
		bill.IsOverdue = days < 0
	}
}

// =============================================================================
// Subscriptions
// =============================================================================

// CreateSubscription adds a new subscription
func (r *HouseholdRepository) CreateSubscription(ctx context.Context, sub *models.Subscription) error {
	query := `
		INSERT INTO subscriptions (
			user_id, name, description, category, amount, currency,
			provider, website_url, cancel_url, frequency, billing_day,
			next_billing_date, is_active, is_shared, is_trial, trial_end_date,
			start_date, notes
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
		RETURNING id, created_at, updated_at`

	if sub.Currency == "" {
		sub.Currency = "GBP"
	}
	if sub.Frequency == "" {
		sub.Frequency = models.BillFrequencyMonthly
	}
	sub.IsActive = true

	return r.pool.QueryRow(ctx, query,
		sub.UserID,
		sub.Name,
		nullString(sub.Description),
		sub.Category,
		sub.Amount,
		sub.Currency,
		nullString(sub.Provider),
		nullString(sub.WebsiteURL),
		nullString(sub.CancelURL),
		sub.Frequency,
		sub.BillingDay,
		sub.NextBillingDate,
		sub.IsActive,
		sub.IsShared,
		sub.IsTrial,
		sub.TrialEndDate,
		sub.StartDate,
		nullString(sub.Notes),
	).Scan(&sub.ID, &sub.CreatedAt, &sub.UpdatedAt)
}

// GetSubscriptionByID retrieves a subscription by ID
func (r *HouseholdRepository) GetSubscriptionByID(ctx context.Context, userID, subID uuid.UUID) (*models.Subscription, error) {
	query := `
		SELECT id, user_id, name, description, category, amount, currency,
			provider, website_url, cancel_url, frequency, billing_day,
			next_billing_date, is_active, is_shared, is_trial, trial_end_date,
			start_date, cancelled_date, notes, created_at, updated_at
		FROM subscriptions
		WHERE id = $1 AND user_id = $2`

	return r.scanSubscription(r.pool.QueryRow(ctx, query, subID, userID))
}

// ListSubscriptions retrieves all subscriptions for a user
func (r *HouseholdRepository) ListSubscriptions(ctx context.Context, userID uuid.UUID, activeOnly bool) ([]models.Subscription, error) {
	query := `
		SELECT id, user_id, name, description, category, amount, currency,
			provider, website_url, cancel_url, frequency, billing_day,
			next_billing_date, is_active, is_shared, is_trial, trial_end_date,
			start_date, cancelled_date, notes, created_at, updated_at
		FROM subscriptions
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

	var subs []models.Subscription
	for rows.Next() {
		sub, err := r.scanSubscriptionFromRows(rows)
		if err != nil {
			return nil, err
		}
		subs = append(subs, *sub)
	}

	return subs, nil
}

// UpdateSubscription updates a subscription
func (r *HouseholdRepository) UpdateSubscription(ctx context.Context, sub *models.Subscription) error {
	query := `
		UPDATE subscriptions SET
			name = $3, description = $4, category = $5, amount = $6, currency = $7,
			provider = $8, website_url = $9, cancel_url = $10, frequency = $11, billing_day = $12,
			next_billing_date = $13, is_active = $14, is_shared = $15, is_trial = $16,
			trial_end_date = $17, cancelled_date = $18, notes = $19
		WHERE id = $1 AND user_id = $2
		RETURNING updated_at`

	return r.pool.QueryRow(ctx, query,
		sub.ID,
		sub.UserID,
		sub.Name,
		nullString(sub.Description),
		sub.Category,
		sub.Amount,
		sub.Currency,
		nullString(sub.Provider),
		nullString(sub.WebsiteURL),
		nullString(sub.CancelURL),
		sub.Frequency,
		sub.BillingDay,
		sub.NextBillingDate,
		sub.IsActive,
		sub.IsShared,
		sub.IsTrial,
		sub.TrialEndDate,
		sub.CancelledDate,
		nullString(sub.Notes),
	).Scan(&sub.UpdatedAt)
}

// DeleteSubscription deletes a subscription
func (r *HouseholdRepository) DeleteSubscription(ctx context.Context, userID, subID uuid.UUID) error {
	_, err := r.pool.Exec(ctx, "DELETE FROM subscriptions WHERE id = $1 AND user_id = $2", subID, userID)
	return err
}

func (r *HouseholdRepository) scanSubscription(row pgx.Row) (*models.Subscription, error) {
	sub := &models.Subscription{}
	var description, provider, websiteURL, cancelURL, notes *string

	err := row.Scan(
		&sub.ID, &sub.UserID, &sub.Name, &description, &sub.Category, &sub.Amount, &sub.Currency,
		&provider, &websiteURL, &cancelURL, &sub.Frequency, &sub.BillingDay,
		&sub.NextBillingDate, &sub.IsActive, &sub.IsShared, &sub.IsTrial, &sub.TrialEndDate,
		&sub.StartDate, &sub.CancelledDate, &notes, &sub.CreatedAt, &sub.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	if description != nil {
		sub.Description = *description
	}
	if provider != nil {
		sub.Provider = *provider
	}
	if websiteURL != nil {
		sub.WebsiteURL = *websiteURL
	}
	if cancelURL != nil {
		sub.CancelURL = *cancelURL
	}
	if notes != nil {
		sub.Notes = *notes
	}

	r.calculateSubscriptionCosts(sub)
	return sub, nil
}

func (r *HouseholdRepository) scanSubscriptionFromRows(rows pgx.Rows) (*models.Subscription, error) {
	sub := &models.Subscription{}
	var description, provider, websiteURL, cancelURL, notes *string

	err := rows.Scan(
		&sub.ID, &sub.UserID, &sub.Name, &description, &sub.Category, &sub.Amount, &sub.Currency,
		&provider, &websiteURL, &cancelURL, &sub.Frequency, &sub.BillingDay,
		&sub.NextBillingDate, &sub.IsActive, &sub.IsShared, &sub.IsTrial, &sub.TrialEndDate,
		&sub.StartDate, &sub.CancelledDate, &notes, &sub.CreatedAt, &sub.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	if description != nil {
		sub.Description = *description
	}
	if provider != nil {
		sub.Provider = *provider
	}
	if websiteURL != nil {
		sub.WebsiteURL = *websiteURL
	}
	if cancelURL != nil {
		sub.CancelURL = *cancelURL
	}
	if notes != nil {
		sub.Notes = *notes
	}

	r.calculateSubscriptionCosts(sub)
	return sub, nil
}

func (r *HouseholdRepository) calculateSubscriptionCosts(sub *models.Subscription) {
	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.Local)

	if sub.NextBillingDate != nil {
		days := int(sub.NextBillingDate.Sub(today).Hours() / 24)
		sub.DaysUntilBilling = &days
	}

	// Calculate monthly equivalent
	switch sub.Frequency {
	case models.BillFrequencyWeekly:
		sub.MonthlyEquivalent = sub.Amount * 52 / 12
		sub.AnnualCost = sub.Amount * 52
	case models.BillFrequencyMonthly:
		sub.MonthlyEquivalent = sub.Amount
		sub.AnnualCost = sub.Amount * 12
	case models.BillFrequencyQuarterly:
		sub.MonthlyEquivalent = sub.Amount / 3
		sub.AnnualCost = sub.Amount * 4
	case models.BillFrequencyAnnually:
		sub.MonthlyEquivalent = sub.Amount / 12
		sub.AnnualCost = sub.Amount
	}
}

// =============================================================================
// Insurance Policies
// =============================================================================

// CreateInsurancePolicy adds a new insurance policy
func (r *HouseholdRepository) CreateInsurancePolicy(ctx context.Context, policy *models.InsurancePolicy) error {
	query := `
		INSERT INTO insurance_policies (
			user_id, name, policy_type, provider, policy_number, phone, website_url,
			coverage_amount, excess_amount, coverage_details, premium_amount, currency,
			payment_frequency, start_date, end_date, renewal_date, next_payment_date,
			is_active, auto_renew, document_url, notes
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
		RETURNING id, created_at, updated_at`

	if policy.Currency == "" {
		policy.Currency = "GBP"
	}
	if policy.PaymentFrequency == "" {
		policy.PaymentFrequency = models.BillFrequencyMonthly
	}
	policy.IsActive = true

	return r.pool.QueryRow(ctx, query,
		policy.UserID,
		policy.Name,
		policy.PolicyType,
		policy.Provider,
		nullString(policy.PolicyNumber),
		nullString(policy.Phone),
		nullString(policy.WebsiteURL),
		policy.CoverageAmount,
		policy.ExcessAmount,
		nullString(policy.CoverageDetails),
		policy.PremiumAmount,
		policy.Currency,
		policy.PaymentFrequency,
		policy.StartDate,
		policy.EndDate,
		policy.RenewalDate,
		policy.NextPaymentDate,
		policy.IsActive,
		policy.AutoRenew,
		nullString(policy.DocumentURL),
		nullString(policy.Notes),
	).Scan(&policy.ID, &policy.CreatedAt, &policy.UpdatedAt)
}

// GetInsurancePolicyByID retrieves a policy by ID
func (r *HouseholdRepository) GetInsurancePolicyByID(ctx context.Context, userID, policyID uuid.UUID) (*models.InsurancePolicy, error) {
	query := `
		SELECT id, user_id, name, policy_type, provider, policy_number, phone, website_url,
			coverage_amount, excess_amount, coverage_details, premium_amount, currency,
			payment_frequency, start_date, end_date, renewal_date, next_payment_date,
			is_active, auto_renew, document_url, notes, created_at, updated_at
		FROM insurance_policies
		WHERE id = $1 AND user_id = $2`

	return r.scanInsurancePolicy(r.pool.QueryRow(ctx, query, policyID, userID))
}

// ListInsurancePolicies retrieves all policies for a user
func (r *HouseholdRepository) ListInsurancePolicies(ctx context.Context, userID uuid.UUID, activeOnly bool) ([]models.InsurancePolicy, error) {
	query := `
		SELECT id, user_id, name, policy_type, provider, policy_number, phone, website_url,
			coverage_amount, excess_amount, coverage_details, premium_amount, currency,
			payment_frequency, start_date, end_date, renewal_date, next_payment_date,
			is_active, auto_renew, document_url, notes, created_at, updated_at
		FROM insurance_policies
		WHERE user_id = $1`

	if activeOnly {
		query += " AND is_active = true"
	}

	query += " ORDER BY renewal_date ASC NULLS LAST, name ASC"

	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var policies []models.InsurancePolicy
	for rows.Next() {
		policy, err := r.scanInsurancePolicyFromRows(rows)
		if err != nil {
			return nil, err
		}
		policies = append(policies, *policy)
	}

	return policies, nil
}

// UpdateInsurancePolicy updates a policy
func (r *HouseholdRepository) UpdateInsurancePolicy(ctx context.Context, policy *models.InsurancePolicy) error {
	query := `
		UPDATE insurance_policies SET
			name = $3, policy_type = $4, provider = $5, policy_number = $6, phone = $7,
			website_url = $8, coverage_amount = $9, excess_amount = $10, coverage_details = $11,
			premium_amount = $12, currency = $13, payment_frequency = $14, start_date = $15,
			end_date = $16, renewal_date = $17, next_payment_date = $18, is_active = $19,
			auto_renew = $20, document_url = $21, notes = $22
		WHERE id = $1 AND user_id = $2
		RETURNING updated_at`

	return r.pool.QueryRow(ctx, query,
		policy.ID,
		policy.UserID,
		policy.Name,
		policy.PolicyType,
		policy.Provider,
		nullString(policy.PolicyNumber),
		nullString(policy.Phone),
		nullString(policy.WebsiteURL),
		policy.CoverageAmount,
		policy.ExcessAmount,
		nullString(policy.CoverageDetails),
		policy.PremiumAmount,
		policy.Currency,
		policy.PaymentFrequency,
		policy.StartDate,
		policy.EndDate,
		policy.RenewalDate,
		policy.NextPaymentDate,
		policy.IsActive,
		policy.AutoRenew,
		nullString(policy.DocumentURL),
		nullString(policy.Notes),
	).Scan(&policy.UpdatedAt)
}

// DeleteInsurancePolicy deletes a policy
func (r *HouseholdRepository) DeleteInsurancePolicy(ctx context.Context, userID, policyID uuid.UUID) error {
	_, err := r.pool.Exec(ctx, "DELETE FROM insurance_policies WHERE id = $1 AND user_id = $2", policyID, userID)
	return err
}

func (r *HouseholdRepository) scanInsurancePolicy(row pgx.Row) (*models.InsurancePolicy, error) {
	policy := &models.InsurancePolicy{}
	var policyNumber, phone, websiteURL, coverageDetails, documentURL, notes *string

	err := row.Scan(
		&policy.ID, &policy.UserID, &policy.Name, &policy.PolicyType, &policy.Provider,
		&policyNumber, &phone, &websiteURL, &policy.CoverageAmount, &policy.ExcessAmount,
		&coverageDetails, &policy.PremiumAmount, &policy.Currency, &policy.PaymentFrequency,
		&policy.StartDate, &policy.EndDate, &policy.RenewalDate, &policy.NextPaymentDate,
		&policy.IsActive, &policy.AutoRenew, &documentURL, &notes, &policy.CreatedAt, &policy.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	if policyNumber != nil {
		policy.PolicyNumber = *policyNumber
	}
	if phone != nil {
		policy.Phone = *phone
	}
	if websiteURL != nil {
		policy.WebsiteURL = *websiteURL
	}
	if coverageDetails != nil {
		policy.CoverageDetails = *coverageDetails
	}
	if documentURL != nil {
		policy.DocumentURL = *documentURL
	}
	if notes != nil {
		policy.Notes = *notes
	}

	r.calculateInsuranceDays(policy)
	return policy, nil
}

func (r *HouseholdRepository) scanInsurancePolicyFromRows(rows pgx.Rows) (*models.InsurancePolicy, error) {
	policy := &models.InsurancePolicy{}
	var policyNumber, phone, websiteURL, coverageDetails, documentURL, notes *string

	err := rows.Scan(
		&policy.ID, &policy.UserID, &policy.Name, &policy.PolicyType, &policy.Provider,
		&policyNumber, &phone, &websiteURL, &policy.CoverageAmount, &policy.ExcessAmount,
		&coverageDetails, &policy.PremiumAmount, &policy.Currency, &policy.PaymentFrequency,
		&policy.StartDate, &policy.EndDate, &policy.RenewalDate, &policy.NextPaymentDate,
		&policy.IsActive, &policy.AutoRenew, &documentURL, &notes, &policy.CreatedAt, &policy.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	if policyNumber != nil {
		policy.PolicyNumber = *policyNumber
	}
	if phone != nil {
		policy.Phone = *phone
	}
	if websiteURL != nil {
		policy.WebsiteURL = *websiteURL
	}
	if coverageDetails != nil {
		policy.CoverageDetails = *coverageDetails
	}
	if documentURL != nil {
		policy.DocumentURL = *documentURL
	}
	if notes != nil {
		policy.Notes = *notes
	}

	r.calculateInsuranceDays(policy)
	return policy, nil
}

func (r *HouseholdRepository) calculateInsuranceDays(policy *models.InsurancePolicy) {
	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.Local)

	if policy.RenewalDate != nil {
		days := int(policy.RenewalDate.Sub(today).Hours() / 24)
		policy.DaysUntilRenewal = &days
	}

	// Calculate annual premium
	switch policy.PaymentFrequency {
	case models.BillFrequencyMonthly:
		policy.AnnualPremium = policy.PremiumAmount * 12
	case models.BillFrequencyAnnually:
		policy.AnnualPremium = policy.PremiumAmount
	}
}

// =============================================================================
// Maintenance Tasks
// =============================================================================

// CreateMaintenanceTask adds a new maintenance task
func (r *HouseholdRepository) CreateMaintenanceTask(ctx context.Context, task *models.MaintenanceTask) error {
	query := `
		INSERT INTO maintenance_tasks (
			user_id, name, description, category, frequency, frequency_months,
			priority, next_due_date, reminder_days, estimated_cost,
			typical_provider, is_active, notes
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		RETURNING id, created_at, updated_at`

	if task.Priority == "" {
		task.Priority = models.MaintenancePriorityMedium
	}
	if task.ReminderDays == 0 {
		task.ReminderDays = 7
	}
	task.IsActive = true

	return r.pool.QueryRow(ctx, query,
		task.UserID,
		task.Name,
		nullString(task.Description),
		task.Category,
		nullString(task.Frequency),
		task.FrequencyMonths,
		task.Priority,
		task.NextDueDate,
		task.ReminderDays,
		task.EstimatedCost,
		nullString(task.TypicalProvider),
		task.IsActive,
		nullString(task.Notes),
	).Scan(&task.ID, &task.CreatedAt, &task.UpdatedAt)
}

// GetMaintenanceTaskByID retrieves a task by ID
func (r *HouseholdRepository) GetMaintenanceTaskByID(ctx context.Context, userID, taskID uuid.UUID) (*models.MaintenanceTask, error) {
	query := `
		SELECT id, user_id, name, description, category, frequency, frequency_months,
			priority, last_completed_date, next_due_date, reminder_days, estimated_cost,
			typical_provider, is_active, notes, created_at, updated_at
		FROM maintenance_tasks
		WHERE id = $1 AND user_id = $2`

	return r.scanMaintenanceTask(r.pool.QueryRow(ctx, query, taskID, userID))
}

// ListMaintenanceTasks retrieves all tasks for a user
func (r *HouseholdRepository) ListMaintenanceTasks(ctx context.Context, userID uuid.UUID, activeOnly bool) ([]models.MaintenanceTask, error) {
	query := `
		SELECT id, user_id, name, description, category, frequency, frequency_months,
			priority, last_completed_date, next_due_date, reminder_days, estimated_cost,
			typical_provider, is_active, notes, created_at, updated_at
		FROM maintenance_tasks
		WHERE user_id = $1`

	if activeOnly {
		query += " AND is_active = true"
	}

	query += " ORDER BY next_due_date ASC NULLS LAST, priority DESC, name ASC"

	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tasks []models.MaintenanceTask
	for rows.Next() {
		task, err := r.scanMaintenanceTaskFromRows(rows)
		if err != nil {
			return nil, err
		}
		tasks = append(tasks, *task)
	}

	return tasks, nil
}

// UpdateMaintenanceTask updates a task
func (r *HouseholdRepository) UpdateMaintenanceTask(ctx context.Context, task *models.MaintenanceTask) error {
	query := `
		UPDATE maintenance_tasks SET
			name = $3, description = $4, category = $5, frequency = $6, frequency_months = $7,
			priority = $8, last_completed_date = $9, next_due_date = $10, reminder_days = $11,
			estimated_cost = $12, typical_provider = $13, is_active = $14, notes = $15
		WHERE id = $1 AND user_id = $2
		RETURNING updated_at`

	return r.pool.QueryRow(ctx, query,
		task.ID,
		task.UserID,
		task.Name,
		nullString(task.Description),
		task.Category,
		nullString(task.Frequency),
		task.FrequencyMonths,
		task.Priority,
		task.LastCompletedDate,
		task.NextDueDate,
		task.ReminderDays,
		task.EstimatedCost,
		nullString(task.TypicalProvider),
		task.IsActive,
		nullString(task.Notes),
	).Scan(&task.UpdatedAt)
}

// DeleteMaintenanceTask deletes a task
func (r *HouseholdRepository) DeleteMaintenanceTask(ctx context.Context, userID, taskID uuid.UUID) error {
	_, err := r.pool.Exec(ctx, "DELETE FROM maintenance_tasks WHERE id = $1 AND user_id = $2", taskID, userID)
	return err
}

// CompleteMaintenanceTask marks a task as completed and schedules the next occurrence
func (r *HouseholdRepository) CompleteMaintenanceTask(ctx context.Context, userID, taskID uuid.UUID, log *models.MaintenanceLog) error {
	task, err := r.GetMaintenanceTaskByID(ctx, userID, taskID)
	if err != nil {
		return fmt.Errorf("task not found: %w", err)
	}

	// Create the log entry
	log.TaskID = &taskID
	log.UserID = userID
	log.TaskName = task.Name
	log.Category = task.Category
	if log.Currency == "" {
		log.Currency = "GBP"
	}

	logQuery := `
		INSERT INTO maintenance_logs (
			task_id, user_id, task_name, category, completed_date, cost, currency,
			provider, provider_contact, work_done, parts_used, duration_minutes,
			receipt_url, photo_url, notes
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
		RETURNING id, created_at`

	err = r.pool.QueryRow(ctx, logQuery,
		log.TaskID,
		log.UserID,
		log.TaskName,
		nullString(log.Category),
		log.CompletedDate,
		log.Cost,
		log.Currency,
		nullString(log.Provider),
		nullString(log.ProviderContact),
		nullString(log.WorkDone),
		nullString(log.PartsUsed),
		log.DurationMinutes,
		nullString(log.ReceiptURL),
		nullString(log.PhotoURL),
		nullString(log.Notes),
	).Scan(&log.ID, &log.CreatedAt)

	if err != nil {
		return err
	}

	// Update task with last completed date and calculate next due date
	task.LastCompletedDate = &log.CompletedDate

	if task.FrequencyMonths != nil && *task.FrequencyMonths > 0 {
		next := log.CompletedDate.AddDate(0, *task.FrequencyMonths, 0)
		task.NextDueDate = &next
	} else if task.Frequency != "" {
		next := log.CompletedDate
		switch task.Frequency {
		case models.BillFrequencyWeekly:
			next = next.AddDate(0, 0, 7)
		case models.BillFrequencyMonthly:
			next = next.AddDate(0, 1, 0)
		case models.BillFrequencyQuarterly:
			next = next.AddDate(0, 3, 0)
		case "biannually":
			next = next.AddDate(0, 6, 0)
		case models.BillFrequencyAnnually:
			next = next.AddDate(1, 0, 0)
		}
		task.NextDueDate = &next
	}

	return r.UpdateMaintenanceTask(ctx, task)
}

// GetMaintenanceLogs retrieves maintenance logs for a user
func (r *HouseholdRepository) GetMaintenanceLogs(ctx context.Context, userID uuid.UUID, taskID *uuid.UUID, limit int) ([]models.MaintenanceLog, error) {
	query := `
		SELECT id, task_id, user_id, task_name, category, completed_date, cost, currency,
			provider, provider_contact, work_done, parts_used, duration_minutes,
			receipt_url, photo_url, notes, created_at
		FROM maintenance_logs
		WHERE user_id = $1`

	args := []interface{}{userID}
	if taskID != nil {
		query += " AND task_id = $2"
		args = append(args, *taskID)
	}

	query += " ORDER BY completed_date DESC"

	if limit > 0 {
		query += fmt.Sprintf(" LIMIT %d", limit)
	}

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []models.MaintenanceLog
	for rows.Next() {
		var log models.MaintenanceLog
		var category, provider, providerContact, workDone, partsUsed, receiptURL, photoURL, notes *string

		err := rows.Scan(
			&log.ID, &log.TaskID, &log.UserID, &log.TaskName, &category, &log.CompletedDate,
			&log.Cost, &log.Currency, &provider, &providerContact, &workDone, &partsUsed,
			&log.DurationMinutes, &receiptURL, &photoURL, &notes, &log.CreatedAt,
		)
		if err != nil {
			return nil, err
		}

		if category != nil {
			log.Category = *category
		}
		if provider != nil {
			log.Provider = *provider
		}
		if providerContact != nil {
			log.ProviderContact = *providerContact
		}
		if workDone != nil {
			log.WorkDone = *workDone
		}
		if partsUsed != nil {
			log.PartsUsed = *partsUsed
		}
		if receiptURL != nil {
			log.ReceiptURL = *receiptURL
		}
		if photoURL != nil {
			log.PhotoURL = *photoURL
		}
		if notes != nil {
			log.Notes = *notes
		}

		logs = append(logs, log)
	}

	return logs, nil
}

func (r *HouseholdRepository) scanMaintenanceTask(row pgx.Row) (*models.MaintenanceTask, error) {
	task := &models.MaintenanceTask{}
	var description, frequency, typicalProvider, notes *string

	err := row.Scan(
		&task.ID, &task.UserID, &task.Name, &description, &task.Category, &frequency,
		&task.FrequencyMonths, &task.Priority, &task.LastCompletedDate, &task.NextDueDate,
		&task.ReminderDays, &task.EstimatedCost, &typicalProvider, &task.IsActive, &notes,
		&task.CreatedAt, &task.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	if description != nil {
		task.Description = *description
	}
	if frequency != nil {
		task.Frequency = *frequency
	}
	if typicalProvider != nil {
		task.TypicalProvider = *typicalProvider
	}
	if notes != nil {
		task.Notes = *notes
	}

	r.calculateMaintenanceDays(task)
	return task, nil
}

func (r *HouseholdRepository) scanMaintenanceTaskFromRows(rows pgx.Rows) (*models.MaintenanceTask, error) {
	task := &models.MaintenanceTask{}
	var description, frequency, typicalProvider, notes *string

	err := rows.Scan(
		&task.ID, &task.UserID, &task.Name, &description, &task.Category, &frequency,
		&task.FrequencyMonths, &task.Priority, &task.LastCompletedDate, &task.NextDueDate,
		&task.ReminderDays, &task.EstimatedCost, &typicalProvider, &task.IsActive, &notes,
		&task.CreatedAt, &task.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	if description != nil {
		task.Description = *description
	}
	if frequency != nil {
		task.Frequency = *frequency
	}
	if typicalProvider != nil {
		task.TypicalProvider = *typicalProvider
	}
	if notes != nil {
		task.Notes = *notes
	}

	r.calculateMaintenanceDays(task)
	return task, nil
}

func (r *HouseholdRepository) calculateMaintenanceDays(task *models.MaintenanceTask) {
	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.Local)

	if task.NextDueDate != nil {
		days := int(task.NextDueDate.Sub(today).Hours() / 24)
		task.DaysUntilDue = &days
		task.IsOverdue = days < 0
	}
}

// =============================================================================
// Summary
// =============================================================================

// GetHouseholdSummary retrieves summary stats for a user's household
func (r *HouseholdRepository) GetHouseholdSummary(ctx context.Context, userID uuid.UUID, currency string) (*models.HouseholdSummary, error) {
	summary := &models.HouseholdSummary{Currency: currency}
	now := time.Now()
	startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.Local)
	endOfMonth := startOfMonth.AddDate(0, 1, 0).Add(-time.Second)

	// Bills stats
	err := r.pool.QueryRow(ctx, `
		SELECT
			COUNT(*) as total,
			COUNT(*) FILTER (WHERE is_active = true AND next_due_date >= $2 AND next_due_date <= $3) as due_this_month,
			COALESCE(SUM(CASE WHEN is_active = true AND frequency = 'monthly' THEN amount ELSE 0 END), 0) as monthly_total,
			COUNT(*) FILTER (WHERE is_active = true AND next_due_date < $4) as overdue
		FROM bills WHERE user_id = $1`,
		userID, startOfMonth, endOfMonth, now,
	).Scan(&summary.TotalBills, &summary.BillsDueThisMonth, &summary.MonthlyBillsTotal, &summary.OverdueBills)
	if err != nil {
		return nil, err
	}

	// Subscriptions stats
	trialEndingSoon := now.AddDate(0, 0, 7) // Trials ending in next 7 days
	err = r.pool.QueryRow(ctx, `
		SELECT
			COUNT(*) as total,
			COUNT(*) FILTER (WHERE is_active = true) as active,
			COALESCE(SUM(CASE
				WHEN is_active = true AND frequency = 'monthly' THEN amount
				WHEN is_active = true AND frequency = 'annually' THEN amount / 12
				WHEN is_active = true AND frequency = 'quarterly' THEN amount / 3
				WHEN is_active = true AND frequency = 'weekly' THEN amount * 52 / 12
				ELSE 0
			END), 0) as monthly_total,
			COUNT(*) FILTER (WHERE is_active = true AND is_trial = true AND trial_end_date <= $2) as trials_ending
		FROM subscriptions WHERE user_id = $1`,
		userID, trialEndingSoon,
	).Scan(&summary.TotalSubscriptions, &summary.ActiveSubscriptions, &summary.MonthlySubsTotal, &summary.TrialsEndingSoon)
	if err != nil {
		return nil, err
	}

	// Insurance stats
	err = r.pool.QueryRow(ctx, `
		SELECT
			COUNT(*) as total,
			COUNT(*) FILTER (WHERE is_active = true) as active,
			COUNT(*) FILTER (WHERE is_active = true AND renewal_date >= $2 AND renewal_date <= $3) as renewals_this_month,
			COALESCE(SUM(CASE
				WHEN is_active = true AND payment_frequency = 'annually' THEN premium_amount
				WHEN is_active = true AND payment_frequency = 'monthly' THEN premium_amount * 12
				ELSE 0
			END), 0) as annual_premiums
		FROM insurance_policies WHERE user_id = $1`,
		userID, startOfMonth, endOfMonth,
	).Scan(&summary.TotalPolicies, &summary.ActivePolicies, &summary.RenewalsThisMonth, &summary.AnnualPremiumsTotal)
	if err != nil {
		return nil, err
	}

	// Maintenance stats
	err = r.pool.QueryRow(ctx, `
		SELECT
			COUNT(*) as total,
			COUNT(*) FILTER (WHERE is_active = true AND next_due_date < $2) as overdue,
			COUNT(*) FILTER (WHERE is_active = true AND next_due_date >= $3 AND next_due_date <= $4) as due_this_month
		FROM maintenance_tasks WHERE user_id = $1`,
		userID, now, startOfMonth, endOfMonth,
	).Scan(&summary.TotalTasks, &summary.OverdueTasks, &summary.TasksDueThisMonth)
	if err != nil {
		return nil, err
	}

	// Yearly maintenance cost from logs
	startOfYear := time.Date(now.Year(), 1, 1, 0, 0, 0, 0, time.Local)
	err = r.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(cost), 0) FROM maintenance_logs
		WHERE user_id = $1 AND completed_date >= $2`,
		userID, startOfYear,
	).Scan(&summary.YearlyMaintenanceCost)
	if err != nil {
		return nil, err
	}

	// Calculate totals
	summary.MonthlyTotal = summary.MonthlyBillsTotal + summary.MonthlySubsTotal + (summary.AnnualPremiumsTotal / 12)
	summary.AnnualTotal = (summary.MonthlyBillsTotal * 12) + (summary.MonthlySubsTotal * 12) + summary.AnnualPremiumsTotal

	return summary, nil
}
