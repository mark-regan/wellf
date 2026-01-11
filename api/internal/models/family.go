package models

import (
	"time"

	"github.com/google/uuid"
)

// Household roles
const (
	HouseholdRoleOwner  = "owner"
	HouseholdRoleAdmin  = "admin"
	HouseholdRoleMember = "member"
	HouseholdRoleViewer = "viewer"
)

// Invite status
const (
	InviteStatusPending  = "pending"
	InviteStatusAccepted = "accepted"
	InviteStatusDeclined = "declined"
)

// Relationship types
const (
	RelationshipSpouse      = "SPOUSE"
	RelationshipPartner     = "PARTNER"
	RelationshipChild       = "CHILD"
	RelationshipParent      = "PARENT"
	RelationshipSibling     = "SIBLING"
	RelationshipGrandchild  = "GRANDCHILD"
	RelationshipGrandparent = "GRANDPARENT"
	RelationshipOther       = "OTHER"
)

// Gender options
const (
	GenderMale        = "MALE"
	GenderFemale      = "FEMALE"
	GenderNonBinary   = "NON_BINARY"
	GenderOther       = "OTHER"
	GenderNotSpecified = "NOT_SPECIFIED"
)

// Household represents a family unit that can share data
type Household struct {
	ID          uuid.UUID          `json:"id"`
	Name        string             `json:"name"`
	OwnerUserID uuid.UUID          `json:"owner_user_id"`
	CreatedAt   time.Time          `json:"created_at"`
	UpdatedAt   time.Time          `json:"updated_at"`
	Members     []HouseholdMember  `json:"members,omitempty"`
	MemberCount int                `json:"member_count,omitempty"`
}

// HouseholdMember links users to households with roles
type HouseholdMember struct {
	ID           uuid.UUID  `json:"id"`
	HouseholdID  uuid.UUID  `json:"household_id"`
	UserID       *uuid.UUID `json:"user_id,omitempty"`
	Role         string     `json:"role"`
	InvitedEmail string     `json:"invited_email,omitempty"`
	InviteStatus string     `json:"invite_status"`
	CreatedAt    time.Time  `json:"created_at"`
	// Joined fields
	User         *User      `json:"user,omitempty"`
}

// Person represents a family member (may or may not have a user account)
type Person struct {
	ID                      uuid.UUID        `json:"id"`
	HouseholdID             uuid.UUID        `json:"household_id"`
	UserID                  *uuid.UUID       `json:"user_id,omitempty"`
	FirstName               string           `json:"first_name"`
	LastName                string           `json:"last_name,omitempty"`
	Nickname                string           `json:"nickname,omitempty"`
	DateOfBirth             *time.Time       `json:"date_of_birth,omitempty"`
	Gender                  string           `json:"gender,omitempty"`
	Email                   string           `json:"email,omitempty"`
	Phone                   string           `json:"phone,omitempty"`
	NationalInsuranceNumber string           `json:"national_insurance_number,omitempty"`
	PassportNumber          string           `json:"passport_number,omitempty"`
	DrivingLicenceNumber    string           `json:"driving_licence_number,omitempty"`
	BloodType               string           `json:"blood_type,omitempty"`
	MedicalNotes            string           `json:"medical_notes,omitempty"`
	EmergencyContactName    string           `json:"emergency_contact_name,omitempty"`
	EmergencyContactPhone   string           `json:"emergency_contact_phone,omitempty"`
	AvatarURL               string           `json:"avatar_url,omitempty"`
	IsPrimaryAccountHolder  bool             `json:"is_primary_account_holder"`
	Metadata                *PersonMetadata  `json:"metadata,omitempty"`
	CreatedAt               time.Time        `json:"created_at"`
	UpdatedAt               time.Time        `json:"updated_at"`
	// Computed fields
	Age                     int              `json:"age,omitempty"`
	FullName                string           `json:"full_name,omitempty"`
	// Joined fields
	Relationships           []FamilyRelationship `json:"relationships,omitempty"`
}

// PersonMetadata contains additional optional information about a person
type PersonMetadata struct {
	Occupation   string   `json:"occupation,omitempty"`
	Employer     string   `json:"employer,omitempty"`
	Allergies    []string `json:"allergies,omitempty"`
	Medications  []string `json:"medications,omitempty"`
	DoctorName   string   `json:"doctor_name,omitempty"`
	DoctorPhone  string   `json:"doctor_phone,omitempty"`
	DentistName  string   `json:"dentist_name,omitempty"`
	DentistPhone string   `json:"dentist_phone,omitempty"`
	SchoolName   string   `json:"school_name,omitempty"`
	Notes        string   `json:"notes,omitempty"`
}

// FamilyRelationship defines a relationship between two people
type FamilyRelationship struct {
	ID               uuid.UUID `json:"id"`
	HouseholdID      uuid.UUID `json:"household_id"`
	PersonID         uuid.UUID `json:"person_id"`
	RelatedPersonID  uuid.UUID `json:"related_person_id"`
	RelationshipType string    `json:"relationship_type"`
	CreatedAt        time.Time `json:"created_at"`
	// Joined fields
	RelatedPerson    *Person   `json:"related_person,omitempty"`
}

// CalculateAge calculates age from date of birth
func (p *Person) CalculateAge() int {
	if p.DateOfBirth == nil {
		return 0
	}
	now := time.Now()
	age := now.Year() - p.DateOfBirth.Year()
	if now.YearDay() < p.DateOfBirth.YearDay() {
		age--
	}
	return age
}

// GetFullName returns the person's full name
func (p *Person) GetFullName() string {
	if p.LastName != "" {
		return p.FirstName + " " + p.LastName
	}
	return p.FirstName
}

// GetInverseRelationship returns the inverse relationship type
// e.g., if A is PARENT of B, then B is CHILD of A
func GetInverseRelationship(relType string) string {
	switch relType {
	case RelationshipParent:
		return RelationshipChild
	case RelationshipChild:
		return RelationshipParent
	case RelationshipGrandparent:
		return RelationshipGrandchild
	case RelationshipGrandchild:
		return RelationshipGrandparent
	case RelationshipSpouse, RelationshipPartner, RelationshipSibling:
		return relType // Symmetric relationships
	default:
		return RelationshipOther
	}
}

// ValidRelationshipTypes returns all valid relationship types
func ValidRelationshipTypes() []string {
	return []string{
		RelationshipSpouse,
		RelationshipPartner,
		RelationshipChild,
		RelationshipParent,
		RelationshipSibling,
		RelationshipGrandchild,
		RelationshipGrandparent,
		RelationshipOther,
	}
}

// ValidHouseholdRoles returns all valid household roles
func ValidHouseholdRoles() []string {
	return []string{
		HouseholdRoleOwner,
		HouseholdRoleAdmin,
		HouseholdRoleMember,
		HouseholdRoleViewer,
	}
}

// ValidGenders returns all valid gender options
func ValidGenders() []string {
	return []string{
		GenderMale,
		GenderFemale,
		GenderNonBinary,
		GenderOther,
		GenderNotSpecified,
	}
}
