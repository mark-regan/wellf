package validator

import (
	"regexp"
	"unicode"

	"github.com/go-playground/validator/v10"
)

type Validator struct {
	validate *validator.Validate
}

func New() *Validator {
	v := validator.New()

	// Register custom validation for password strength
	v.RegisterValidation("strongpassword", validateStrongPassword)

	return &Validator{validate: v}
}

func (v *Validator) Validate(i interface{}) error {
	return v.validate.Struct(i)
}

// validateStrongPassword checks that password meets requirements:
// - Minimum 12 characters
// - At least one uppercase letter
// - At least one lowercase letter
// - At least one number
// - At least one special character
func validateStrongPassword(fl validator.FieldLevel) bool {
	password := fl.Field().String()

	if len(password) < 12 {
		return false
	}

	var (
		hasUpper   bool
		hasLower   bool
		hasNumber  bool
		hasSpecial bool
	)

	for _, char := range password {
		switch {
		case unicode.IsUpper(char):
			hasUpper = true
		case unicode.IsLower(char):
			hasLower = true
		case unicode.IsNumber(char):
			hasNumber = true
		case unicode.IsPunct(char) || unicode.IsSymbol(char):
			hasSpecial = true
		}
	}

	return hasUpper && hasLower && hasNumber && hasSpecial
}

// Email validation helper
func IsValidEmail(email string) bool {
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	return emailRegex.MatchString(email)
}

// Currency validation helper
var validCurrencies = map[string]bool{
	"GBP": true, "USD": true, "EUR": true, "JPY": true, "CHF": true,
	"AUD": true, "CAD": true, "NZD": true, "SEK": true, "NOK": true,
	"DKK": true, "HKD": true, "SGD": true, "CNY": true, "INR": true,
}

func IsValidCurrency(currency string) bool {
	return validCurrencies[currency]
}

// Portfolio type validation
var validPortfolioTypes = map[string]bool{
	"GIA": true, "ISA": true, "SIPP": true, "LISA": true,
	"JISA": true, "CRYPTO": true, "SAVINGS": true, "CASH": true,
}

func IsValidPortfolioType(portfolioType string) bool {
	return validPortfolioTypes[portfolioType]
}

// ISA type validation
var validISATypes = map[string]bool{
	"STOCKS_AND_SHARES": true, "CASH": true,
}

func IsValidISAType(isaType string) bool {
	return validISATypes[isaType]
}

// Savings type validation
var validSavingsTypes = map[string]bool{
	"EASY_ACCESS": true, "NOTICE": true, "FIXED_TERM": true, "REGULAR_SAVER": true,
}

func IsValidSavingsType(savingsType string) bool {
	return validSavingsTypes[savingsType]
}

// Crypto wallet type validation
var validCryptoWalletTypes = map[string]bool{
	"EXCHANGE": true, "HARDWARE": true, "SOFTWARE": true,
}

func IsValidCryptoWalletType(walletType string) bool {
	return validCryptoWalletTypes[walletType]
}

// Asset type validation
var validAssetTypes = map[string]bool{
	"STOCK": true, "ETF": true, "FUND": true, "CRYPTO": true, "BOND": true,
}

func IsValidAssetType(assetType string) bool {
	return validAssetTypes[assetType]
}

// Transaction type validation
var validTransactionTypes = map[string]bool{
	"BUY": true, "SELL": true, "DIVIDEND": true, "INTEREST": true,
	"FEE": true, "TRANSFER_IN": true, "TRANSFER_OUT": true,
	"DEPOSIT": true, "WITHDRAWAL": true,
}

func IsValidTransactionType(txType string) bool {
	return validTransactionTypes[txType]
}
