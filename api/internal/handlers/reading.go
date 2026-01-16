package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/mark-regan/wellf/internal/middleware"
	"github.com/mark-regan/wellf/internal/models"
	"github.com/mark-regan/wellf/internal/repository"
	"github.com/mark-regan/wellf/internal/services"
)

// ReadingHandler handles reading-related HTTP requests
type ReadingHandler struct {
	bookRepo           *repository.BookRepository
	readingListRepo    *repository.ReadingListRepository
	goalRepo           *repository.ReadingGoalRepository
	goodreadsImporter  *services.GoodreadsImporter
	httpClient         *http.Client
}

// NewReadingHandler creates a new reading handler
func NewReadingHandler(
	bookRepo *repository.BookRepository,
	readingListRepo *repository.ReadingListRepository,
	goalRepo *repository.ReadingGoalRepository,
) *ReadingHandler {
	return &ReadingHandler{
		bookRepo:          bookRepo,
		readingListRepo:   readingListRepo,
		goalRepo:          goalRepo,
		goodreadsImporter: services.NewGoodreadsImporter(),
		httpClient:        &http.Client{Timeout: 10 * time.Second},
	}
}

// Routes returns the reading routes
func (h *ReadingHandler) Routes() chi.Router {
	r := chi.NewRouter()

	// Book search (Google Books)
	r.Get("/search", h.searchBooks)
	r.Get("/search/isbn/{isbn}", h.searchByISBN)

	// Library (user's books)
	r.Get("/", h.listBooks)
	r.Post("/", h.createBook)
	r.Get("/{id}", h.getBook)
	r.Put("/{id}", h.updateBook)
	r.Delete("/{id}", h.deleteBook)

	// Import
	r.Post("/import/goodreads", h.importGoodreads)

	// Reading lists
	r.Get("/lists", h.listReadingLists)
	r.Post("/lists", h.createReadingList)
	r.Get("/lists/{id}", h.getReadingList)
	r.Put("/lists/{id}", h.updateReadingList)
	r.Delete("/lists/{id}", h.deleteReadingList)
	r.Get("/lists/{id}/books", h.getListBooks)
	r.Post("/lists/{id}/books", h.addBookToList)
	r.Put("/lists/{id}/books/{bookId}", h.updateBookProgress)
	r.Delete("/lists/{id}/books/{bookId}", h.removeBookFromList)
	r.Post("/lists/{id}/books/{bookId}/move/{toListId}", h.moveBook)

	// Reading goals
	r.Get("/goals", h.listGoals)
	r.Post("/goals", h.setGoal)
	r.Get("/goals/{year}", h.getGoal)
	r.Delete("/goals/{year}", h.deleteGoal)

	// Summary and Stats
	r.Get("/summary", h.getSummary)
	r.Get("/stats", h.getStats)

	return r
}

// searchBooks searches Google Books API
func (h *ReadingHandler) searchBooks(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	if query == "" {
		http.Error(w, "query parameter 'q' is required", http.StatusBadRequest)
		return
	}

	maxResults := 10
	if max := r.URL.Query().Get("maxResults"); max != "" {
		if n, err := strconv.Atoi(max); err == nil && n > 0 && n <= 40 {
			maxResults = n
		}
	}

	results, err := h.searchGoogleBooks(r.Context(), query, maxResults)
	if err != nil {
		http.Error(w, "failed to search books: "+err.Error(), http.StatusInternalServerError)
		return
	}

	JSON(w, http.StatusOK, results)
}

// searchByISBN searches for a book by ISBN
func (h *ReadingHandler) searchByISBN(w http.ResponseWriter, r *http.Request) {
	isbn := chi.URLParam(r, "isbn")
	if isbn == "" {
		http.Error(w, "ISBN is required", http.StatusBadRequest)
		return
	}

	results, err := h.searchGoogleBooks(r.Context(), "isbn:"+isbn, 1)
	if err != nil {
		http.Error(w, "failed to search by ISBN: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if len(results.Items) == 0 {
		http.Error(w, "book not found", http.StatusNotFound)
		return
	}

	JSON(w, http.StatusOK, results.Items[0])
}

// searchGoogleBooks performs a search against the Google Books API
func (h *ReadingHandler) searchGoogleBooks(ctx context.Context, query string, maxResults int) (*models.GoogleBooksSearchResult, error) {
	apiURL := fmt.Sprintf(
		"https://www.googleapis.com/books/v1/volumes?q=%s&maxResults=%d",
		url.QueryEscape(query),
		maxResults,
	)

	req, err := http.NewRequestWithContext(ctx, "GET", apiURL, nil)
	if err != nil {
		return nil, err
	}

	resp, err := h.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Google Books API returned status %d", resp.StatusCode)
	}

	var result models.GoogleBooksSearchResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	return &result, nil
}

// listBooks returns all books in the user's library
func (h *ReadingHandler) listBooks(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	search := r.URL.Query().Get("search")
	limit := 50
	if l := r.URL.Query().Get("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 {
			limit = n
		}
	}
	offset := 0
	if o := r.URL.Query().Get("offset"); o != "" {
		if n, err := strconv.Atoi(o); err == nil && n >= 0 {
			offset = n
		}
	}

	books, err := h.bookRepo.List(r.Context(), userID, search, limit, offset)
	if err != nil {
		http.Error(w, "failed to list books: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if books == nil {
		books = []models.Book{}
	}

	JSON(w, http.StatusOK, books)
}

// createBook adds a book to the user's library
func (h *ReadingHandler) createBook(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	var req models.CreateBookRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Title == "" {
		http.Error(w, "title is required", http.StatusBadRequest)
		return
	}

	// Check if book already exists by Google Books ID
	if req.GoogleBooksID != "" {
		existing, _ := h.bookRepo.GetByGoogleBooksID(r.Context(), userID, req.GoogleBooksID)
		if existing != nil {
			JSON(w, http.StatusOK, existing)
			return
		}
	}

	book := &models.Book{
		UserID:        userID,
		GoogleBooksID: req.GoogleBooksID,
		ISBN10:        req.ISBN10,
		ISBN13:        req.ISBN13,
		Title:         req.Title,
		Subtitle:      req.Subtitle,
		Authors:       req.Authors,
		Publisher:     req.Publisher,
		PublishedDate: req.PublishedDate,
		Description:   req.Description,
		PageCount:     req.PageCount,
		Categories:    req.Categories,
		Language:      req.Language,
		ThumbnailURL:  req.ThumbnailURL,
		Format:        req.Format,
		Owned:         req.Owned,
	}

	if book.Authors == nil {
		book.Authors = []string{}
	}
	if book.Categories == nil {
		book.Categories = []string{}
	}
	if book.Format == "" {
		book.Format = models.BookFormatPhysical
	}

	if err := h.bookRepo.Create(r.Context(), book); err != nil {
		http.Error(w, "failed to create book: "+err.Error(), http.StatusInternalServerError)
		return
	}

	JSON(w, http.StatusCreated, book)
}

// getBook returns a single book
func (h *ReadingHandler) getBook(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	bookID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid book ID", http.StatusBadRequest)
		return
	}

	book, err := h.bookRepo.GetByID(r.Context(), userID, bookID)
	if err != nil {
		if err == pgx.ErrNoRows {
			http.Error(w, "book not found", http.StatusNotFound)
			return
		}
		http.Error(w, "failed to get book: "+err.Error(), http.StatusInternalServerError)
		return
	}

	JSON(w, http.StatusOK, book)
}

// updateBook updates a book
func (h *ReadingHandler) updateBook(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	bookID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid book ID", http.StatusBadRequest)
		return
	}

	book, err := h.bookRepo.GetByID(r.Context(), userID, bookID)
	if err != nil {
		if err == pgx.ErrNoRows {
			http.Error(w, "book not found", http.StatusNotFound)
			return
		}
		http.Error(w, "failed to get book: "+err.Error(), http.StatusInternalServerError)
		return
	}

	var req models.UpdateBookRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Title != nil {
		book.Title = *req.Title
	}
	if req.Subtitle != nil {
		book.Subtitle = *req.Subtitle
	}
	if req.Authors != nil {
		book.Authors = req.Authors
	}
	if req.Publisher != nil {
		book.Publisher = *req.Publisher
	}
	if req.PublishedDate != nil {
		book.PublishedDate = *req.PublishedDate
	}
	if req.Description != nil {
		book.Description = *req.Description
	}
	if req.PageCount != nil {
		book.PageCount = req.PageCount
	}
	if req.Categories != nil {
		book.Categories = req.Categories
	}
	if req.ThumbnailURL != nil {
		book.ThumbnailURL = *req.ThumbnailURL
	}
	if req.Format != nil {
		book.Format = *req.Format
	}
	if req.Owned != nil {
		book.Owned = *req.Owned
	}

	if err := h.bookRepo.Update(r.Context(), book); err != nil {
		http.Error(w, "failed to update book: "+err.Error(), http.StatusInternalServerError)
		return
	}

	JSON(w, http.StatusOK, book)
}

// deleteBook removes a book from the library
func (h *ReadingHandler) deleteBook(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	bookID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid book ID", http.StatusBadRequest)
		return
	}

	if err := h.bookRepo.Delete(r.Context(), userID, bookID); err != nil {
		http.Error(w, "failed to delete book: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// listReadingLists returns all reading lists
func (h *ReadingHandler) listReadingLists(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	// Ensure default lists exist
	if err := h.readingListRepo.EnsureDefaultLists(r.Context(), userID); err != nil {
		http.Error(w, "failed to ensure default lists: "+err.Error(), http.StatusInternalServerError)
		return
	}

	lists, err := h.readingListRepo.List(r.Context(), userID)
	if err != nil {
		http.Error(w, "failed to list reading lists: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if lists == nil {
		lists = []models.ReadingList{}
	}

	JSON(w, http.StatusOK, lists)
}

// createReadingList creates a new custom reading list
func (h *ReadingHandler) createReadingList(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	var req models.CreateReadingListRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Name == "" {
		http.Error(w, "name is required", http.StatusBadRequest)
		return
	}

	list := &models.ReadingList{
		UserID:      userID,
		Name:        req.Name,
		Description: req.Description,
		ListType:    models.ReadingListTypeCustom,
		IsDefault:   false,
		SortOrder:   100, // Custom lists at the end
	}

	if err := h.readingListRepo.Create(r.Context(), list); err != nil {
		http.Error(w, "failed to create reading list: "+err.Error(), http.StatusInternalServerError)
		return
	}

	JSON(w, http.StatusCreated, list)
}

// getReadingList returns a reading list
func (h *ReadingHandler) getReadingList(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	listID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid list ID", http.StatusBadRequest)
		return
	}

	list, err := h.readingListRepo.GetByID(r.Context(), userID, listID)
	if err != nil {
		if err == pgx.ErrNoRows {
			http.Error(w, "reading list not found", http.StatusNotFound)
			return
		}
		http.Error(w, "failed to get reading list: "+err.Error(), http.StatusInternalServerError)
		return
	}

	JSON(w, http.StatusOK, list)
}

// updateReadingList updates a reading list
func (h *ReadingHandler) updateReadingList(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	listID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid list ID", http.StatusBadRequest)
		return
	}

	list, err := h.readingListRepo.GetByID(r.Context(), userID, listID)
	if err != nil {
		if err == pgx.ErrNoRows {
			http.Error(w, "reading list not found", http.StatusNotFound)
			return
		}
		http.Error(w, "failed to get reading list: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if list.IsDefault {
		http.Error(w, "cannot modify default reading lists", http.StatusBadRequest)
		return
	}

	var req models.CreateReadingListRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Name != "" {
		list.Name = req.Name
	}
	list.Description = req.Description

	if err := h.readingListRepo.Update(r.Context(), list); err != nil {
		http.Error(w, "failed to update reading list: "+err.Error(), http.StatusInternalServerError)
		return
	}

	JSON(w, http.StatusOK, list)
}

// deleteReadingList deletes a custom reading list
func (h *ReadingHandler) deleteReadingList(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	listID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid list ID", http.StatusBadRequest)
		return
	}

	list, err := h.readingListRepo.GetByID(r.Context(), userID, listID)
	if err != nil {
		if err == pgx.ErrNoRows {
			http.Error(w, "reading list not found", http.StatusNotFound)
			return
		}
		http.Error(w, "failed to get reading list: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if list.IsDefault {
		http.Error(w, "cannot delete default reading lists", http.StatusBadRequest)
		return
	}

	if err := h.readingListRepo.Delete(r.Context(), userID, listID); err != nil {
		http.Error(w, "failed to delete reading list: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// getListBooks returns all books in a reading list
func (h *ReadingHandler) getListBooks(w http.ResponseWriter, r *http.Request) {
	listID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid list ID", http.StatusBadRequest)
		return
	}

	books, err := h.readingListRepo.GetListBooks(r.Context(), listID)
	if err != nil {
		http.Error(w, "failed to get list books: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if books == nil {
		books = []models.ReadingListBook{}
	}

	JSON(w, http.StatusOK, books)
}

// addBookToList adds a book to a reading list
func (h *ReadingHandler) addBookToList(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	listID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid list ID", http.StatusBadRequest)
		return
	}

	var req models.AddBookToListRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	// Verify book exists and belongs to user
	_, err = h.bookRepo.GetByID(r.Context(), userID, req.BookID)
	if err != nil {
		if err == pgx.ErrNoRows {
			http.Error(w, "book not found", http.StatusNotFound)
			return
		}
		http.Error(w, "failed to get book: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if err := h.readingListRepo.AddBook(r.Context(), listID, req.BookID); err != nil {
		http.Error(w, "failed to add book to list: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

// updateBookProgress updates reading progress for a book
func (h *ReadingHandler) updateBookProgress(w http.ResponseWriter, r *http.Request) {
	listID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid list ID", http.StatusBadRequest)
		return
	}
	bookID, err := uuid.Parse(chi.URLParam(r, "bookId"))
	if err != nil {
		http.Error(w, "invalid book ID", http.StatusBadRequest)
		return
	}

	var req models.UpdateReadingProgressRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.readingListRepo.UpdateProgress(r.Context(), listID, bookID, &req); err != nil {
		http.Error(w, "failed to update progress: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// removeBookFromList removes a book from a reading list
func (h *ReadingHandler) removeBookFromList(w http.ResponseWriter, r *http.Request) {
	listID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid list ID", http.StatusBadRequest)
		return
	}
	bookID, err := uuid.Parse(chi.URLParam(r, "bookId"))
	if err != nil {
		http.Error(w, "invalid book ID", http.StatusBadRequest)
		return
	}

	if err := h.readingListRepo.RemoveBook(r.Context(), listID, bookID); err != nil {
		http.Error(w, "failed to remove book from list: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// moveBook moves a book from one list to another
func (h *ReadingHandler) moveBook(w http.ResponseWriter, r *http.Request) {
	fromListID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid list ID", http.StatusBadRequest)
		return
	}
	bookID, err := uuid.Parse(chi.URLParam(r, "bookId"))
	if err != nil {
		http.Error(w, "invalid book ID", http.StatusBadRequest)
		return
	}
	toListID, err := uuid.Parse(chi.URLParam(r, "toListId"))
	if err != nil {
		http.Error(w, "invalid target list ID", http.StatusBadRequest)
		return
	}

	if err := h.readingListRepo.MoveBook(r.Context(), fromListID, toListID, bookID); err != nil {
		http.Error(w, "failed to move book: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// listGoals returns all reading goals
func (h *ReadingHandler) listGoals(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	goals, err := h.goalRepo.List(r.Context(), userID)
	if err != nil {
		http.Error(w, "failed to list goals: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Add books read count for each goal
	for i := range goals {
		count, _ := h.readingListRepo.CountBooksReadInYear(r.Context(), userID, goals[i].Year)
		goals[i].BooksRead = count
	}

	if goals == nil {
		goals = []models.ReadingGoal{}
	}

	JSON(w, http.StatusOK, goals)
}

// setGoal creates or updates a reading goal
func (h *ReadingHandler) setGoal(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	var req models.SetReadingGoalRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Year < 2000 || req.Year > 2100 {
		http.Error(w, "invalid year", http.StatusBadRequest)
		return
	}
	if req.TargetBooks < 1 {
		http.Error(w, "target must be at least 1", http.StatusBadRequest)
		return
	}

	goal := &models.ReadingGoal{
		UserID:      userID,
		Year:        req.Year,
		TargetBooks: req.TargetBooks,
	}

	if err := h.goalRepo.Upsert(r.Context(), goal); err != nil {
		http.Error(w, "failed to set goal: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Add books read count
	count, _ := h.readingListRepo.CountBooksReadInYear(r.Context(), userID, goal.Year)
	goal.BooksRead = count

	JSON(w, http.StatusOK, goal)
}

// getGoal returns a reading goal for a specific year
func (h *ReadingHandler) getGoal(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	year, err := strconv.Atoi(chi.URLParam(r, "year"))
	if err != nil {
		http.Error(w, "invalid year", http.StatusBadRequest)
		return
	}

	goal, err := h.goalRepo.GetByYear(r.Context(), userID, year)
	if err != nil {
		if err == pgx.ErrNoRows {
			http.Error(w, "goal not found", http.StatusNotFound)
			return
		}
		http.Error(w, "failed to get goal: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Add books read count
	count, _ := h.readingListRepo.CountBooksReadInYear(r.Context(), userID, goal.Year)
	goal.BooksRead = count

	JSON(w, http.StatusOK, goal)
}

// deleteGoal removes a reading goal
func (h *ReadingHandler) deleteGoal(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	year, err := strconv.Atoi(chi.URLParam(r, "year"))
	if err != nil {
		http.Error(w, "invalid year", http.StatusBadRequest)
		return
	}

	if err := h.goalRepo.Delete(r.Context(), userID, year); err != nil {
		http.Error(w, "failed to delete goal: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// getSummary returns the reading module summary
func (h *ReadingHandler) getSummary(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	summary := &models.ReadingSummary{}

	// Get total books
	totalBooks, _ := h.bookRepo.Count(r.Context(), userID)
	summary.TotalBooks = totalBooks

	// Get currently reading count
	currentlyReading, _ := h.readingListRepo.GetCurrentlyReading(r.Context(), userID, 10)
	summary.CurrentlyReading = len(currentlyReading)

	// Get books this year
	currentYear := time.Now().Year()
	booksThisYear, _ := h.readingListRepo.CountBooksReadInYear(r.Context(), userID, currentYear)
	summary.BooksThisYear = booksThisYear

	// Get current year goal
	goal, err := h.goalRepo.GetCurrentYear(r.Context(), userID)
	if err == nil {
		goal.BooksRead = booksThisYear
		summary.YearlyGoal = goal
	}

	// Get recently finished
	recentlyFinished, _ := h.readingListRepo.GetRecentlyFinished(r.Context(), userID, 5)
	summary.RecentlyFinished = recentlyFinished

	JSON(w, http.StatusOK, summary)
}

// importGoodreads handles importing books from a Goodreads CSV export
func (h *ReadingHandler) importGoodreads(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	// Parse multipart form (max 10MB)
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		http.Error(w, "failed to parse form: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Get the file from the form
	file, _, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "file is required", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Parse the CSV
	books, err := h.goodreadsImporter.ParseCSV(file)
	if err != nil {
		http.Error(w, "failed to parse CSV: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Ensure default lists exist
	if err := h.readingListRepo.EnsureDefaultLists(r.Context(), userID); err != nil {
		http.Error(w, "failed to ensure default lists: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Get reading lists for assignment
	lists, err := h.readingListRepo.List(r.Context(), userID)
	if err != nil {
		http.Error(w, "failed to get reading lists: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Build list type to ID map
	listMap := make(map[string]uuid.UUID)
	for _, list := range lists {
		if list.IsDefault {
			listMap[list.ListType] = list.ID
		}
	}

	result := &models.GoodreadsImportResult{}
	var errors []string

	for _, grBook := range books {
		// Convert to CreateBookRequest
		req := grBook.ToCreateBookRequest()

		// Check if book already exists by ISBN
		var existingBook *models.Book
		if req.ISBN13 != "" {
			existingBook, _ = h.findBookByISBN(r.Context(), userID, req.ISBN13)
		}
		if existingBook == nil && req.ISBN10 != "" {
			existingBook, _ = h.findBookByISBN(r.Context(), userID, req.ISBN10)
		}

		var book *models.Book
		if existingBook != nil {
			// Book already exists, update if needed
			book = existingBook
			result.BooksSkipped++
		} else {
			// Create new book
			book = &models.Book{
				UserID:        userID,
				ISBN10:        req.ISBN10,
				ISBN13:        req.ISBN13,
				Title:         req.Title,
				Authors:       req.Authors,
				Publisher:     req.Publisher,
				PublishedDate: req.PublishedDate,
				PageCount:     req.PageCount,
				Format:        req.Format,
				Owned:         req.Owned,
			}
			if book.Authors == nil {
				book.Authors = []string{}
			}
			if book.Categories == nil {
				book.Categories = []string{}
			}

			if err := h.bookRepo.Create(r.Context(), book); err != nil {
				errors = append(errors, fmt.Sprintf("Failed to import '%s': %v", req.Title, err))
				continue
			}
			result.BooksImported++
		}

		// Add book to appropriate reading list
		targetListType := grBook.GetTargetListType()
		if listID, ok := listMap[targetListType]; ok {
			// Add to list (ignore errors for duplicates)
			_ = h.readingListRepo.AddBook(r.Context(), listID, book.ID)

			// Update progress with rating, dates, review
			progressUpdate := grBook.GetProgressUpdate()
			if progressUpdate.Rating != nil || progressUpdate.DateFinished != nil ||
			   progressUpdate.DateStarted != nil || progressUpdate.Review != nil {
				_ = h.readingListRepo.UpdateProgress(r.Context(), listID, book.ID, progressUpdate)
			}
		}
	}

	result.Errors = errors
	JSON(w, http.StatusOK, result)
}

// findBookByISBN searches for an existing book by ISBN
func (h *ReadingHandler) findBookByISBN(ctx context.Context, userID uuid.UUID, isbn string) (*models.Book, error) {
	return h.bookRepo.GetByISBN(ctx, userID, isbn)
}

// getStats returns detailed reading statistics
func (h *ReadingHandler) getStats(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	stats, err := h.readingListRepo.GetReadingStats(r.Context(), userID)
	if err != nil {
		http.Error(w, "failed to get reading stats: "+err.Error(), http.StatusInternalServerError)
		return
	}

	JSON(w, http.StatusOK, stats)
}
