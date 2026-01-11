package models

import (
	"time"

	"github.com/google/uuid"
)

// Document link categories
const (
	DocLinkCategoryIdentity  = "IDENTITY"
	DocLinkCategoryInsurance = "INSURANCE"
	DocLinkCategoryProperty  = "PROPERTY"
	DocLinkCategoryVehicle   = "VEHICLE"
	DocLinkCategoryFinancial = "FINANCIAL"
	DocLinkCategoryMedical   = "MEDICAL"
	DocLinkCategoryLegal     = "LEGAL"
	DocLinkCategoryOther     = "OTHER"
)

// DocumentLink represents a link to a document stored in Paperless-ngx
type DocumentLink struct {
	ID          uuid.UUID `json:"id" db:"id"`
	HouseholdID uuid.UUID `json:"household_id" db:"household_id"`

	// Paperless reference
	PaperlessDocumentID    int        `json:"paperless_document_id" db:"paperless_document_id"`
	PaperlessTitle         *string    `json:"paperless_title,omitempty" db:"paperless_title"`
	PaperlessCorrespondent *string    `json:"paperless_correspondent,omitempty" db:"paperless_correspondent"`
	PaperlessDocumentType  *string    `json:"paperless_document_type,omitempty" db:"paperless_document_type"`
	PaperlessCreated       *time.Time `json:"paperless_created,omitempty" db:"paperless_created"`
	CachedAt               time.Time  `json:"cached_at" db:"cached_at"`

	// Local categorisation
	Category    *string `json:"category,omitempty" db:"category"`
	Description *string `json:"description,omitempty" db:"description"`

	// Polymorphic links to entities
	LinkedPersonID   *uuid.UUID `json:"linked_person_id,omitempty" db:"linked_person_id"`
	LinkedPropertyID *uuid.UUID `json:"linked_property_id,omitempty" db:"linked_property_id"`
	LinkedVehicleID  *uuid.UUID `json:"linked_vehicle_id,omitempty" db:"linked_vehicle_id"`
	LinkedPolicyID   *uuid.UUID `json:"linked_policy_id,omitempty" db:"linked_policy_id"`

	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`

	// Computed fields (not stored in DB)
	ThumbnailURL string `json:"thumbnail_url,omitempty" db:"-"`
	PreviewURL   string `json:"preview_url,omitempty" db:"-"`
	DownloadURL  string `json:"download_url,omitempty" db:"-"`
}

// PopulateURLs sets the thumbnail, preview, and download URLs based on the API base URL
func (dl *DocumentLink) PopulateURLs(apiBaseURL string) {
	dl.ThumbnailURL = apiBaseURL + "/paperless/documents/" + itoa(dl.PaperlessDocumentID) + "/thumb"
	dl.PreviewURL = apiBaseURL + "/paperless/documents/" + itoa(dl.PaperlessDocumentID) + "/preview"
	dl.DownloadURL = apiBaseURL + "/paperless/documents/" + itoa(dl.PaperlessDocumentID) + "/download"
}

// itoa converts an int to a string (simple helper to avoid import strconv)
func itoa(i int) string {
	if i == 0 {
		return "0"
	}
	s := ""
	neg := false
	if i < 0 {
		neg = true
		i = -i
	}
	for i > 0 {
		s = string(rune('0'+i%10)) + s
		i /= 10
	}
	if neg {
		s = "-" + s
	}
	return s
}

// ValidDocLinkCategories returns valid document link categories
func ValidDocLinkCategories() []string {
	return []string{
		DocLinkCategoryIdentity,
		DocLinkCategoryInsurance,
		DocLinkCategoryProperty,
		DocLinkCategoryVehicle,
		DocLinkCategoryFinancial,
		DocLinkCategoryMedical,
		DocLinkCategoryLegal,
		DocLinkCategoryOther,
	}
}

// CreateDocumentLinkRequest represents the request to create a document link
type CreateDocumentLinkRequest struct {
	PaperlessDocumentID int     `json:"paperless_document_id"`
	Category            *string `json:"category,omitempty"`
	Description         *string `json:"description,omitempty"`
	LinkedPersonID      *string `json:"linked_person_id,omitempty"`
	LinkedPropertyID    *string `json:"linked_property_id,omitempty"`
	LinkedVehicleID     *string `json:"linked_vehicle_id,omitempty"`
	LinkedPolicyID      *string `json:"linked_policy_id,omitempty"`
}

// PaperlessConfig represents the Paperless configuration for a household
type PaperlessConfig struct {
	PaperlessURL      *string `json:"paperless_url,omitempty" db:"paperless_url"`
	PaperlessAPIToken *string `json:"-" db:"paperless_api_token"` // Never send to frontend
	IsConfigured      bool    `json:"is_configured" db:"-"`
}
