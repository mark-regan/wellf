package models

import (
	"time"

	"github.com/google/uuid"
)

// Pet types
const (
	PetTypeDog     = "DOG"
	PetTypeCat     = "CAT"
	PetTypeBird    = "BIRD"
	PetTypeFish    = "FISH"
	PetTypeReptile = "REPTILE"
	PetTypeRabbit  = "RABBIT"
	PetTypeHamster = "HAMSTER"
	PetTypeOther   = "OTHER"
)

// Pet genders
const (
	PetGenderMale    = "MALE"
	PetGenderFemale  = "FEMALE"
	PetGenderUnknown = "UNKNOWN"
)

// Pet represents a pet owned by the household
type Pet struct {
	ID                uuid.UUID  `json:"id"`
	HouseholdID       uuid.UUID  `json:"household_id"`
	Name              string     `json:"name"`
	PetType           string     `json:"pet_type"`
	Breed             string     `json:"breed,omitempty"`
	DateOfBirth       *time.Time `json:"date_of_birth,omitempty"`
	Gender            string     `json:"gender,omitempty"`
	MicrochipNumber   string     `json:"microchip_number,omitempty"`
	VetName           string     `json:"vet_name,omitempty"`
	VetPhone          string     `json:"vet_phone,omitempty"`
	VetAddress        string     `json:"vet_address,omitempty"`
	InsurancePolicyID *uuid.UUID `json:"insurance_policy_id,omitempty"`
	Notes             string     `json:"notes,omitempty"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
	// Computed fields
	Age               *int       `json:"age,omitempty"`
}

// CalculateAge calculates the pet's age in years
func (p *Pet) CalculateAge() {
	if p.DateOfBirth == nil {
		p.Age = nil
		return
	}
	now := time.Now()
	years := now.Year() - p.DateOfBirth.Year()
	if now.YearDay() < p.DateOfBirth.YearDay() {
		years--
	}
	p.Age = &years
}

// ValidPetTypes returns all valid pet types
func ValidPetTypes() []string {
	return []string{
		PetTypeDog,
		PetTypeCat,
		PetTypeBird,
		PetTypeFish,
		PetTypeReptile,
		PetTypeRabbit,
		PetTypeHamster,
		PetTypeOther,
	}
}

// ValidPetGenders returns all valid pet genders
func ValidPetGenders() []string {
	return []string{
		PetGenderMale,
		PetGenderFemale,
		PetGenderUnknown,
	}
}
