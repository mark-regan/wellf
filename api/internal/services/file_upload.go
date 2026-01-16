package services

import (
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
)

// FileUploadService handles file uploads and storage
type FileUploadService struct {
	uploadDir string
	baseURL   string
}

// NewFileUploadService creates a new file upload service
func NewFileUploadService(uploadDir, baseURL string) *FileUploadService {
	return &FileUploadService{
		uploadDir: uploadDir,
		baseURL:   baseURL,
	}
}

// UploadResult contains the result of an upload operation
type UploadResult struct {
	Filename    string `json:"filename"`
	FileSize    int64  `json:"file_size"`
	ContentType string `json:"content_type"`
	URL         string `json:"url"`
	Path        string `json:"path"`
}

// AllowedImageTypes defines allowed image MIME types
var AllowedImageTypes = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/gif":  ".gif",
	"image/webp": ".webp",
}

// MaxFileSize is the maximum allowed file size (10MB)
const MaxFileSize = 10 * 1024 * 1024

// UploadImage uploads an image file and returns the result
func (s *FileUploadService) UploadImage(file multipart.File, header *multipart.FileHeader, subdir string) (*UploadResult, error) {
	// Validate file size
	if header.Size > MaxFileSize {
		return nil, fmt.Errorf("file size exceeds maximum allowed size of %d bytes", MaxFileSize)
	}

	// Validate content type
	contentType := header.Header.Get("Content-Type")
	ext, ok := AllowedImageTypes[contentType]
	if !ok {
		return nil, fmt.Errorf("unsupported image type: %s", contentType)
	}

	// Generate unique filename
	filename := fmt.Sprintf("%s_%s%s",
		time.Now().Format("20060102150405"),
		uuid.New().String()[:8],
		ext,
	)

	// Create subdirectory if needed
	uploadPath := filepath.Join(s.uploadDir, subdir)
	if err := os.MkdirAll(uploadPath, 0755); err != nil {
		return nil, fmt.Errorf("failed to create upload directory: %w", err)
	}

	// Create the file
	filePath := filepath.Join(uploadPath, filename)
	dst, err := os.Create(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to create file: %w", err)
	}
	defer dst.Close()

	// Copy the uploaded file
	written, err := io.Copy(dst, file)
	if err != nil {
		os.Remove(filePath)
		return nil, fmt.Errorf("failed to save file: %w", err)
	}

	// Generate URL
	url := fmt.Sprintf("%s/%s/%s", s.baseURL, subdir, filename)

	return &UploadResult{
		Filename:    filename,
		FileSize:    written,
		ContentType: contentType,
		URL:         url,
		Path:        filePath,
	}, nil
}

// DeleteFile deletes a file from storage
func (s *FileUploadService) DeleteFile(url string) error {
	// Extract path from URL
	if !strings.HasPrefix(url, s.baseURL) {
		return fmt.Errorf("invalid file URL")
	}

	relativePath := strings.TrimPrefix(url, s.baseURL+"/")
	filePath := filepath.Join(s.uploadDir, relativePath)

	// Check if file exists
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		return nil // File doesn't exist, nothing to delete
	}

	return os.Remove(filePath)
}

// GetFilePath returns the full path for a stored file
func (s *FileUploadService) GetFilePath(url string) (string, error) {
	if !strings.HasPrefix(url, s.baseURL) {
		return "", fmt.Errorf("invalid file URL")
	}

	relativePath := strings.TrimPrefix(url, s.baseURL+"/")
	return filepath.Join(s.uploadDir, relativePath), nil
}
