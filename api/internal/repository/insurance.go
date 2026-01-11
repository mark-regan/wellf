package repository

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/mark-regan/wellf/internal/models"
)

var (
	ErrPolicyNotFound        = errors.New("policy not found")
	ErrCoveredPersonNotFound = errors.New("covered person not found")
	ErrClaimNotFound         = errors.New("claim not found")
)

type InsuranceRepository struct {
	pool *pgxpool.Pool
}

func NewInsuranceRepository(pool *pgxpool.Pool) *InsuranceRepository {
	return &InsuranceRepository{pool: pool}
}

// Policy CRUD operations

func (r *InsuranceRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.InsurancePolicy, error) {
	query := `
		SELECT id, household_id, policy_name, policy_type, provider, policy_number,
			start_date, end_date, renewal_date,
			premium_amount, premium_frequency, excess_amount, cover_amount, currency,
			auto_renewal, property_id, vehicle_id,
			broker_name, broker_phone, broker_email, notes,
			created_at, updated_at
		FROM insurance_policies
		WHERE id = $1
	`

	var policy models.InsurancePolicy
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&policy.ID, &policy.HouseholdID, &policy.PolicyName, &policy.PolicyType,
		&policy.Provider, &policy.PolicyNumber,
		&policy.StartDate, &policy.EndDate, &policy.RenewalDate,
		&policy.PremiumAmount, &policy.PremiumFrequency, &policy.ExcessAmount,
		&policy.CoverAmount, &policy.Currency,
		&policy.AutoRenewal, &policy.PropertyID, &policy.VehicleID,
		&policy.BrokerName, &policy.BrokerPhone, &policy.BrokerEmail, &policy.Notes,
		&policy.CreatedAt, &policy.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrPolicyNotFound
		}
		return nil, err
	}

	// Populate computed fields
	policy.PopulateComputedFields()

	// Load covered people
	coveredPeople, err := r.GetCoveredPeople(ctx, id)
	if err == nil {
		policy.CoveredPeople = coveredPeople
	}

	return &policy, nil
}

func (r *InsuranceRepository) GetByHouseholdID(ctx context.Context, householdID uuid.UUID) ([]*models.InsurancePolicy, error) {
	query := `
		SELECT id, household_id, policy_name, policy_type, provider, policy_number,
			start_date, end_date, renewal_date,
			premium_amount, premium_frequency, excess_amount, cover_amount, currency,
			auto_renewal, property_id, vehicle_id,
			broker_name, broker_phone, broker_email, notes,
			created_at, updated_at
		FROM insurance_policies
		WHERE household_id = $1
		ORDER BY renewal_date ASC NULLS LAST, policy_name ASC
	`

	rows, err := r.pool.Query(ctx, query, householdID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var policies []*models.InsurancePolicy
	for rows.Next() {
		var policy models.InsurancePolicy
		err := rows.Scan(
			&policy.ID, &policy.HouseholdID, &policy.PolicyName, &policy.PolicyType,
			&policy.Provider, &policy.PolicyNumber,
			&policy.StartDate, &policy.EndDate, &policy.RenewalDate,
			&policy.PremiumAmount, &policy.PremiumFrequency, &policy.ExcessAmount,
			&policy.CoverAmount, &policy.Currency,
			&policy.AutoRenewal, &policy.PropertyID, &policy.VehicleID,
			&policy.BrokerName, &policy.BrokerPhone, &policy.BrokerEmail, &policy.Notes,
			&policy.CreatedAt, &policy.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		policy.PopulateComputedFields()
		policies = append(policies, &policy)
	}

	return policies, nil
}

func (r *InsuranceRepository) GetUpcomingRenewals(ctx context.Context, householdID uuid.UUID, daysAhead int) ([]*models.InsurancePolicy, error) {
	query := `
		SELECT id, household_id, policy_name, policy_type, provider, policy_number,
			start_date, end_date, renewal_date,
			premium_amount, premium_frequency, excess_amount, cover_amount, currency,
			auto_renewal, property_id, vehicle_id,
			broker_name, broker_phone, broker_email, notes,
			created_at, updated_at
		FROM insurance_policies
		WHERE household_id = $1
			AND renewal_date IS NOT NULL
			AND renewal_date >= CURRENT_DATE
			AND renewal_date <= CURRENT_DATE + $2 * INTERVAL '1 day'
		ORDER BY renewal_date ASC
	`

	rows, err := r.pool.Query(ctx, query, householdID, daysAhead)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var policies []*models.InsurancePolicy
	for rows.Next() {
		var policy models.InsurancePolicy
		err := rows.Scan(
			&policy.ID, &policy.HouseholdID, &policy.PolicyName, &policy.PolicyType,
			&policy.Provider, &policy.PolicyNumber,
			&policy.StartDate, &policy.EndDate, &policy.RenewalDate,
			&policy.PremiumAmount, &policy.PremiumFrequency, &policy.ExcessAmount,
			&policy.CoverAmount, &policy.Currency,
			&policy.AutoRenewal, &policy.PropertyID, &policy.VehicleID,
			&policy.BrokerName, &policy.BrokerPhone, &policy.BrokerEmail, &policy.Notes,
			&policy.CreatedAt, &policy.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		policy.PopulateComputedFields()
		policies = append(policies, &policy)
	}

	return policies, nil
}

func (r *InsuranceRepository) Create(ctx context.Context, policy *models.InsurancePolicy) error {
	query := `
		INSERT INTO insurance_policies (
			household_id, policy_name, policy_type, provider, policy_number,
			start_date, end_date, renewal_date,
			premium_amount, premium_frequency, excess_amount, cover_amount, currency,
			auto_renewal, property_id, vehicle_id,
			broker_name, broker_phone, broker_email, notes
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
		) RETURNING id, created_at, updated_at
	`

	return r.pool.QueryRow(ctx, query,
		policy.HouseholdID, policy.PolicyName, policy.PolicyType, policy.Provider, policy.PolicyNumber,
		policy.StartDate, policy.EndDate, policy.RenewalDate,
		policy.PremiumAmount, policy.PremiumFrequency, policy.ExcessAmount, policy.CoverAmount, policy.Currency,
		policy.AutoRenewal, policy.PropertyID, policy.VehicleID,
		policy.BrokerName, policy.BrokerPhone, policy.BrokerEmail, policy.Notes,
	).Scan(&policy.ID, &policy.CreatedAt, &policy.UpdatedAt)
}

func (r *InsuranceRepository) Update(ctx context.Context, policy *models.InsurancePolicy) error {
	query := `
		UPDATE insurance_policies SET
			policy_name = $2, policy_type = $3, provider = $4, policy_number = $5,
			start_date = $6, end_date = $7, renewal_date = $8,
			premium_amount = $9, premium_frequency = $10, excess_amount = $11,
			cover_amount = $12, currency = $13,
			auto_renewal = $14, property_id = $15, vehicle_id = $16,
			broker_name = $17, broker_phone = $18, broker_email = $19, notes = $20
		WHERE id = $1
	`

	result, err := r.pool.Exec(ctx, query,
		policy.ID,
		policy.PolicyName, policy.PolicyType, policy.Provider, policy.PolicyNumber,
		policy.StartDate, policy.EndDate, policy.RenewalDate,
		policy.PremiumAmount, policy.PremiumFrequency, policy.ExcessAmount,
		policy.CoverAmount, policy.Currency,
		policy.AutoRenewal, policy.PropertyID, policy.VehicleID,
		policy.BrokerName, policy.BrokerPhone, policy.BrokerEmail, policy.Notes,
	)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrPolicyNotFound
	}
	return nil
}

func (r *InsuranceRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM insurance_policies WHERE id = $1`
	result, err := r.pool.Exec(ctx, query, id)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrPolicyNotFound
	}
	return nil
}

// Covered People operations

func (r *InsuranceRepository) GetCoveredPeople(ctx context.Context, policyID uuid.UUID) ([]*models.InsuranceCoveredPerson, error) {
	query := `
		SELECT icp.id, icp.policy_id, icp.person_id, icp.coverage_type, icp.notes, icp.created_at,
			p.first_name, p.last_name
		FROM insurance_covered_people icp
		JOIN people p ON icp.person_id = p.id
		WHERE icp.policy_id = $1
		ORDER BY icp.created_at ASC
	`

	rows, err := r.pool.Query(ctx, query, policyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var people []*models.InsuranceCoveredPerson
	for rows.Next() {
		var cp models.InsuranceCoveredPerson
		var firstName, lastName *string
		err := rows.Scan(
			&cp.ID, &cp.PolicyID, &cp.PersonID, &cp.CoverageType, &cp.Notes, &cp.CreatedAt,
			&firstName, &lastName,
		)
		if err != nil {
			return nil, err
		}
		cp.Person = &models.Person{
			ID:        cp.PersonID,
			FirstName: *firstName,
		}
		if lastName != nil {
			cp.Person.LastName = *lastName
		}
		people = append(people, &cp)
	}

	return people, nil
}

func (r *InsuranceRepository) AddCoveredPerson(ctx context.Context, cp *models.InsuranceCoveredPerson) error {
	query := `
		INSERT INTO insurance_covered_people (policy_id, person_id, coverage_type, notes)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at
	`
	return r.pool.QueryRow(ctx, query,
		cp.PolicyID, cp.PersonID, cp.CoverageType, cp.Notes,
	).Scan(&cp.ID, &cp.CreatedAt)
}

func (r *InsuranceRepository) RemoveCoveredPerson(ctx context.Context, policyID, personID uuid.UUID) error {
	query := `DELETE FROM insurance_covered_people WHERE policy_id = $1 AND person_id = $2`
	result, err := r.pool.Exec(ctx, query, policyID, personID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrCoveredPersonNotFound
	}
	return nil
}

// Claims operations

func (r *InsuranceRepository) GetClaimByID(ctx context.Context, id uuid.UUID) (*models.InsuranceClaim, error) {
	query := `
		SELECT id, policy_id, claim_reference, claim_date, incident_date,
			claim_type, description,
			claim_amount, settled_amount, excess_paid, currency,
			status, resolution_date, resolution_notes,
			created_at, updated_at
		FROM insurance_claims
		WHERE id = $1
	`

	var claim models.InsuranceClaim
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&claim.ID, &claim.PolicyID, &claim.ClaimReference, &claim.ClaimDate, &claim.IncidentDate,
		&claim.ClaimType, &claim.Description,
		&claim.ClaimAmount, &claim.SettledAmount, &claim.ExcessPaid, &claim.Currency,
		&claim.Status, &claim.ResolutionDate, &claim.ResolutionNotes,
		&claim.CreatedAt, &claim.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrClaimNotFound
		}
		return nil, err
	}

	return &claim, nil
}

func (r *InsuranceRepository) GetClaimsByPolicyID(ctx context.Context, policyID uuid.UUID) ([]*models.InsuranceClaim, error) {
	query := `
		SELECT id, policy_id, claim_reference, claim_date, incident_date,
			claim_type, description,
			claim_amount, settled_amount, excess_paid, currency,
			status, resolution_date, resolution_notes,
			created_at, updated_at
		FROM insurance_claims
		WHERE policy_id = $1
		ORDER BY claim_date DESC
	`

	rows, err := r.pool.Query(ctx, query, policyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var claims []*models.InsuranceClaim
	for rows.Next() {
		var claim models.InsuranceClaim
		err := rows.Scan(
			&claim.ID, &claim.PolicyID, &claim.ClaimReference, &claim.ClaimDate, &claim.IncidentDate,
			&claim.ClaimType, &claim.Description,
			&claim.ClaimAmount, &claim.SettledAmount, &claim.ExcessPaid, &claim.Currency,
			&claim.Status, &claim.ResolutionDate, &claim.ResolutionNotes,
			&claim.CreatedAt, &claim.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		claims = append(claims, &claim)
	}

	return claims, nil
}

func (r *InsuranceRepository) CreateClaim(ctx context.Context, claim *models.InsuranceClaim) error {
	query := `
		INSERT INTO insurance_claims (
			policy_id, claim_reference, claim_date, incident_date,
			claim_type, description,
			claim_amount, settled_amount, excess_paid, currency,
			status, resolution_date, resolution_notes
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
		) RETURNING id, created_at, updated_at
	`

	return r.pool.QueryRow(ctx, query,
		claim.PolicyID, claim.ClaimReference, claim.ClaimDate, claim.IncidentDate,
		claim.ClaimType, claim.Description,
		claim.ClaimAmount, claim.SettledAmount, claim.ExcessPaid, claim.Currency,
		claim.Status, claim.ResolutionDate, claim.ResolutionNotes,
	).Scan(&claim.ID, &claim.CreatedAt, &claim.UpdatedAt)
}

func (r *InsuranceRepository) UpdateClaim(ctx context.Context, claim *models.InsuranceClaim) error {
	query := `
		UPDATE insurance_claims SET
			claim_reference = $2, claim_date = $3, incident_date = $4,
			claim_type = $5, description = $6,
			claim_amount = $7, settled_amount = $8, excess_paid = $9, currency = $10,
			status = $11, resolution_date = $12, resolution_notes = $13
		WHERE id = $1
	`

	result, err := r.pool.Exec(ctx, query,
		claim.ID,
		claim.ClaimReference, claim.ClaimDate, claim.IncidentDate,
		claim.ClaimType, claim.Description,
		claim.ClaimAmount, claim.SettledAmount, claim.ExcessPaid, claim.Currency,
		claim.Status, claim.ResolutionDate, claim.ResolutionNotes,
	)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrClaimNotFound
	}
	return nil
}

func (r *InsuranceRepository) DeleteClaim(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM insurance_claims WHERE id = $1`
	result, err := r.pool.Exec(ctx, query, id)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrClaimNotFound
	}
	return nil
}

// Summary/stats operations

func (r *InsuranceRepository) GetTotalPremiums(ctx context.Context, householdID uuid.UUID) (map[string]float64, error) {
	query := `
		SELECT premium_frequency, COALESCE(SUM(premium_amount), 0) as total
		FROM insurance_policies
		WHERE household_id = $1 AND premium_amount IS NOT NULL
		GROUP BY premium_frequency
	`

	rows, err := r.pool.Query(ctx, query, householdID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	totals := make(map[string]float64)
	for rows.Next() {
		var frequency *string
		var total float64
		if err := rows.Scan(&frequency, &total); err != nil {
			return nil, err
		}
		if frequency != nil {
			totals[*frequency] = total
		}
	}

	return totals, nil
}

func (r *InsuranceRepository) GetPolicyCountByType(ctx context.Context, householdID uuid.UUID) (map[string]int, error) {
	query := `
		SELECT policy_type, COUNT(*) as count
		FROM insurance_policies
		WHERE household_id = $1
		GROUP BY policy_type
	`

	rows, err := r.pool.Query(ctx, query, householdID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	counts := make(map[string]int)
	for rows.Next() {
		var policyType string
		var count int
		if err := rows.Scan(&policyType, &count); err != nil {
			return nil, err
		}
		counts[policyType] = count
	}

	return counts, nil
}
