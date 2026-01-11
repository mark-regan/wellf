package models

import (
	"time"

	"github.com/google/uuid"
)

// Document categories
const (
	DocumentCategoryIdentity  = "IDENTITY"
	DocumentCategoryProperty  = "PROPERTY"
	DocumentCategoryVehicle   = "VEHICLE"
	DocumentCategoryInsurance = "INSURANCE"
	DocumentCategoryFinancial = "FINANCIAL"
	DocumentCategoryMedical   = "MEDICAL"
	DocumentCategoryLegal     = "LEGAL"
	DocumentCategoryOther     = "OTHER"
)

// Common file types
const (
	FileTypePDF  = "PDF"
	FileTypeDOC  = "DOC"
	FileTypeDOCX = "DOCX"
	FileTypeXLS  = "XLS"
	FileTypeXLSX = "XLSX"
	FileTypeJPG  = "JPG"
	FileTypePNG  = "PNG"
	FileTypeOther = "OTHER"
)

// Document represents a document link stored in the system
type Document struct {
	ID          uuid.UUID `json:"id" db:"id"`
	HouseholdID uuid.UUID `json:"household_id" db:"household_id"`

	// Document info
	Name        string  `json:"name" db:"name"`
	Description *string `json:"description,omitempty" db:"description"`
	Category    string  `json:"category" db:"category"`

	// Link to external storage
	URL      string  `json:"url" db:"url"`
	FileType *string `json:"file_type,omitempty" db:"file_type"`
	FileSize *int64  `json:"file_size,omitempty" db:"file_size"`

	// Dates
	DocumentDate *string `json:"document_date,omitempty" db:"document_date"`
	ExpiryDate   *string `json:"expiry_date,omitempty" db:"expiry_date"`

	// Tags
	Tags []string `json:"tags,omitempty" db:"tags"`

	// Linked entities
	PersonID          *uuid.UUID `json:"person_id,omitempty" db:"person_id"`
	PropertyID        *uuid.UUID `json:"property_id,omitempty" db:"property_id"`
	VehicleID         *uuid.UUID `json:"vehicle_id,omitempty" db:"vehicle_id"`
	InsurancePolicyID *uuid.UUID `json:"insurance_policy_id,omitempty" db:"insurance_policy_id"`

	Notes *string `json:"notes,omitempty" db:"notes"`

	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`

	// Computed fields
	DaysUntilExpiry *int  `json:"days_until_expiry,omitempty" db:"-"`
	IsExpired       *bool `json:"is_expired,omitempty" db:"-"`

	// Joined fields
	Person          *Person          `json:"person,omitempty" db:"-"`
	Property        *Property        `json:"property,omitempty" db:"-"`
	Vehicle         *Vehicle         `json:"vehicle,omitempty" db:"-"`
	InsurancePolicy *InsurancePolicy `json:"insurance_policy,omitempty" db:"-"`
}

// PopulateComputedFields calculates derived fields for the document
func (d *Document) PopulateComputedFields() {
	now := time.Now()

	// Calculate days until expiry
	if d.ExpiryDate != nil && *d.ExpiryDate != "" {
		if expiryDate, err := time.Parse("2006-01-02", *d.ExpiryDate); err == nil {
			days := int(expiryDate.Sub(now).Hours() / 24)
			d.DaysUntilExpiry = &days
			expired := expiryDate.Before(now)
			d.IsExpired = &expired
		}
	}
}

// ValidDocumentCategories returns valid document categories
func ValidDocumentCategories() []string {
	return []string{
		DocumentCategoryIdentity,
		DocumentCategoryProperty,
		DocumentCategoryVehicle,
		DocumentCategoryInsurance,
		DocumentCategoryFinancial,
		DocumentCategoryMedical,
		DocumentCategoryLegal,
		DocumentCategoryOther,
	}
}

// ValidFileTypes returns common file types
func ValidFileTypes() []string {
	return []string{
		FileTypePDF,
		FileTypeDOC,
		FileTypeDOCX,
		FileTypeXLS,
		FileTypeXLSX,
		FileTypeJPG,
		FileTypePNG,
		FileTypeOther,
	}
}
