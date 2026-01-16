package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/mark-regan/wellf/internal/models"
)

// BookRepository handles book database operations
type BookRepository struct {
	pool *pgxpool.Pool
}

// NewBookRepository creates a new book repository
func NewBookRepository(pool *pgxpool.Pool) *BookRepository {
	return &BookRepository{pool: pool}
}

// Create adds a new book to the user's library
func (r *BookRepository) Create(ctx context.Context, book *models.Book) error {
	query := `
		INSERT INTO books (
			user_id, google_books_id, isbn_10, isbn_13, title, subtitle,
			authors, publisher, published_date, description, page_count,
			categories, language, thumbnail_url, format, owned
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
		RETURNING id, created_at, updated_at`

	return r.pool.QueryRow(ctx, query,
		book.UserID,
		nullString(book.GoogleBooksID),
		nullString(book.ISBN10),
		nullString(book.ISBN13),
		book.Title,
		nullString(book.Subtitle),
		book.Authors,
		nullString(book.Publisher),
		nullString(book.PublishedDate),
		nullString(book.Description),
		book.PageCount,
		book.Categories,
		nullString(book.Language),
		nullString(book.ThumbnailURL),
		nullString(book.Format),
		book.Owned,
	).Scan(&book.ID, &book.CreatedAt, &book.UpdatedAt)
}

// GetByID retrieves a book by ID
func (r *BookRepository) GetByID(ctx context.Context, userID, bookID uuid.UUID) (*models.Book, error) {
	query := `
		SELECT id, user_id, google_books_id, isbn_10, isbn_13, title, subtitle,
			authors, publisher, published_date, description, page_count,
			categories, language, thumbnail_url, format, owned, created_at, updated_at
		FROM books
		WHERE id = $1 AND user_id = $2`

	return r.scanBook(r.pool.QueryRow(ctx, query, bookID, userID))
}

// GetByGoogleBooksID retrieves a book by Google Books ID
func (r *BookRepository) GetByGoogleBooksID(ctx context.Context, userID uuid.UUID, googleBooksID string) (*models.Book, error) {
	query := `
		SELECT id, user_id, google_books_id, isbn_10, isbn_13, title, subtitle,
			authors, publisher, published_date, description, page_count,
			categories, language, thumbnail_url, format, owned, created_at, updated_at
		FROM books
		WHERE google_books_id = $1 AND user_id = $2`

	return r.scanBook(r.pool.QueryRow(ctx, query, googleBooksID, userID))
}

// scanBook scans a single book row
func (r *BookRepository) scanBook(row pgx.Row) (*models.Book, error) {
	book := &models.Book{}
	var googleBooksID, isbn10, isbn13, subtitle, publisher, publishedDate, description *string
	var language, thumbnailURL, format *string

	err := row.Scan(
		&book.ID, &book.UserID, &googleBooksID, &isbn10, &isbn13, &book.Title, &subtitle,
		&book.Authors, &publisher, &publishedDate, &description, &book.PageCount,
		&book.Categories, &language, &thumbnailURL, &format, &book.Owned,
		&book.CreatedAt, &book.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	if googleBooksID != nil {
		book.GoogleBooksID = *googleBooksID
	}
	if isbn10 != nil {
		book.ISBN10 = *isbn10
	}
	if isbn13 != nil {
		book.ISBN13 = *isbn13
	}
	if subtitle != nil {
		book.Subtitle = *subtitle
	}
	if publisher != nil {
		book.Publisher = *publisher
	}
	if publishedDate != nil {
		book.PublishedDate = *publishedDate
	}
	if description != nil {
		book.Description = *description
	}
	if language != nil {
		book.Language = *language
	}
	if thumbnailURL != nil {
		book.ThumbnailURL = *thumbnailURL
	}
	if format != nil {
		book.Format = *format
	}

	return book, nil
}

// List retrieves all books for a user with optional filtering
func (r *BookRepository) List(ctx context.Context, userID uuid.UUID, search string, limit, offset int) ([]models.Book, error) {
	query := `
		SELECT id, user_id, google_books_id, isbn_10, isbn_13, title, subtitle,
			authors, publisher, published_date, description, page_count,
			categories, language, thumbnail_url, format, owned, created_at, updated_at
		FROM books
		WHERE user_id = $1`

	args := []interface{}{userID}
	argNum := 2

	if search != "" {
		query += fmt.Sprintf(` AND (LOWER(title) LIKE $%d OR LOWER(array_to_string(authors, ', ')) LIKE $%d)`, argNum, argNum)
		args = append(args, "%"+strings.ToLower(search)+"%")
		argNum++
	}

	query += " ORDER BY created_at DESC"

	if limit > 0 {
		query += fmt.Sprintf(" LIMIT $%d", argNum)
		args = append(args, limit)
		argNum++
	}
	if offset > 0 {
		query += fmt.Sprintf(" OFFSET $%d", argNum)
		args = append(args, offset)
	}

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var books []models.Book
	for rows.Next() {
		var book models.Book
		var googleBooksID, isbn10, isbn13, subtitle, publisher, publishedDate, description *string
		var language, thumbnailURL, format *string

		err := rows.Scan(
			&book.ID, &book.UserID, &googleBooksID, &isbn10, &isbn13, &book.Title, &subtitle,
			&book.Authors, &publisher, &publishedDate, &description, &book.PageCount,
			&book.Categories, &language, &thumbnailURL, &format, &book.Owned,
			&book.CreatedAt, &book.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		if googleBooksID != nil {
			book.GoogleBooksID = *googleBooksID
		}
		if isbn10 != nil {
			book.ISBN10 = *isbn10
		}
		if isbn13 != nil {
			book.ISBN13 = *isbn13
		}
		if subtitle != nil {
			book.Subtitle = *subtitle
		}
		if publisher != nil {
			book.Publisher = *publisher
		}
		if publishedDate != nil {
			book.PublishedDate = *publishedDate
		}
		if description != nil {
			book.Description = *description
		}
		if language != nil {
			book.Language = *language
		}
		if thumbnailURL != nil {
			book.ThumbnailURL = *thumbnailURL
		}
		if format != nil {
			book.Format = *format
		}

		books = append(books, book)
	}

	return books, nil
}

// Update updates a book
func (r *BookRepository) Update(ctx context.Context, book *models.Book) error {
	query := `
		UPDATE books SET
			title = $1, subtitle = $2, authors = $3, publisher = $4,
			published_date = $5, description = $6, page_count = $7,
			categories = $8, thumbnail_url = $9, format = $10, owned = $11,
			updated_at = NOW()
		WHERE id = $12 AND user_id = $13`

	_, err := r.pool.Exec(ctx, query,
		book.Title,
		nullString(book.Subtitle),
		book.Authors,
		nullString(book.Publisher),
		nullString(book.PublishedDate),
		nullString(book.Description),
		book.PageCount,
		book.Categories,
		nullString(book.ThumbnailURL),
		nullString(book.Format),
		book.Owned,
		book.ID,
		book.UserID,
	)
	return err
}

// Delete removes a book from the library
func (r *BookRepository) Delete(ctx context.Context, userID, bookID uuid.UUID) error {
	query := `DELETE FROM books WHERE id = $1 AND user_id = $2`
	_, err := r.pool.Exec(ctx, query, bookID, userID)
	return err
}

// Count returns the total number of books for a user
func (r *BookRepository) Count(ctx context.Context, userID uuid.UUID) (int, error) {
	query := `SELECT COUNT(*) FROM books WHERE user_id = $1`
	var count int
	err := r.pool.QueryRow(ctx, query, userID).Scan(&count)
	return count, err
}

// GetByISBN retrieves a book by ISBN (10 or 13)
func (r *BookRepository) GetByISBN(ctx context.Context, userID uuid.UUID, isbn string) (*models.Book, error) {
	query := `
		SELECT id, user_id, google_books_id, isbn_10, isbn_13, title, subtitle,
			authors, publisher, published_date, description, page_count,
			categories, language, thumbnail_url, format, owned, created_at, updated_at
		FROM books
		WHERE user_id = $1 AND (isbn_10 = $2 OR isbn_13 = $2)`

	return r.scanBook(r.pool.QueryRow(ctx, query, userID, isbn))
}

// ReadingListRepository handles reading list database operations
type ReadingListRepository struct {
	pool *pgxpool.Pool
}

// NewReadingListRepository creates a new reading list repository
func NewReadingListRepository(pool *pgxpool.Pool) *ReadingListRepository {
	return &ReadingListRepository{pool: pool}
}

// Create adds a new reading list
func (r *ReadingListRepository) Create(ctx context.Context, list *models.ReadingList) error {
	query := `
		INSERT INTO reading_lists (user_id, name, description, list_type, is_default, sort_order)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at, updated_at`

	return r.pool.QueryRow(ctx, query,
		list.UserID,
		list.Name,
		nullString(list.Description),
		list.ListType,
		list.IsDefault,
		list.SortOrder,
	).Scan(&list.ID, &list.CreatedAt, &list.UpdatedAt)
}

// GetByID retrieves a reading list by ID with book count
func (r *ReadingListRepository) GetByID(ctx context.Context, userID, listID uuid.UUID) (*models.ReadingList, error) {
	query := `
		SELECT rl.id, rl.user_id, rl.name, rl.description, rl.list_type,
			rl.is_default, rl.sort_order, rl.created_at, rl.updated_at,
			COUNT(rlb.id) as book_count
		FROM reading_lists rl
		LEFT JOIN reading_list_books rlb ON rl.id = rlb.reading_list_id
		WHERE rl.id = $1 AND rl.user_id = $2
		GROUP BY rl.id`

	list := &models.ReadingList{}
	var description *string

	err := r.pool.QueryRow(ctx, query, listID, userID).Scan(
		&list.ID, &list.UserID, &list.Name, &description, &list.ListType,
		&list.IsDefault, &list.SortOrder, &list.CreatedAt, &list.UpdatedAt,
		&list.BookCount,
	)
	if err != nil {
		return nil, err
	}

	if description != nil {
		list.Description = *description
	}
	return list, nil
}

// GetByType retrieves a reading list by type (for default lists)
func (r *ReadingListRepository) GetByType(ctx context.Context, userID uuid.UUID, listType string) (*models.ReadingList, error) {
	query := `
		SELECT rl.id, rl.user_id, rl.name, rl.description, rl.list_type,
			rl.is_default, rl.sort_order, rl.created_at, rl.updated_at,
			COUNT(rlb.id) as book_count
		FROM reading_lists rl
		LEFT JOIN reading_list_books rlb ON rl.id = rlb.reading_list_id
		WHERE rl.user_id = $1 AND rl.list_type = $2 AND rl.is_default = true
		GROUP BY rl.id`

	list := &models.ReadingList{}
	var description *string

	err := r.pool.QueryRow(ctx, query, userID, listType).Scan(
		&list.ID, &list.UserID, &list.Name, &description, &list.ListType,
		&list.IsDefault, &list.SortOrder, &list.CreatedAt, &list.UpdatedAt,
		&list.BookCount,
	)
	if err != nil {
		return nil, err
	}

	if description != nil {
		list.Description = *description
	}
	return list, nil
}

// List retrieves all reading lists for a user
func (r *ReadingListRepository) List(ctx context.Context, userID uuid.UUID) ([]models.ReadingList, error) {
	query := `
		SELECT rl.id, rl.user_id, rl.name, rl.description, rl.list_type,
			rl.is_default, rl.sort_order, rl.created_at, rl.updated_at,
			COUNT(rlb.id) as book_count
		FROM reading_lists rl
		LEFT JOIN reading_list_books rlb ON rl.id = rlb.reading_list_id
		WHERE rl.user_id = $1
		GROUP BY rl.id
		ORDER BY rl.sort_order, rl.created_at`

	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var lists []models.ReadingList
	for rows.Next() {
		var list models.ReadingList
		var description *string

		err := rows.Scan(
			&list.ID, &list.UserID, &list.Name, &description, &list.ListType,
			&list.IsDefault, &list.SortOrder, &list.CreatedAt, &list.UpdatedAt,
			&list.BookCount,
		)
		if err != nil {
			return nil, err
		}

		if description != nil {
			list.Description = *description
		}
		lists = append(lists, list)
	}

	return lists, nil
}

// Update updates a reading list
func (r *ReadingListRepository) Update(ctx context.Context, list *models.ReadingList) error {
	query := `
		UPDATE reading_lists SET
			name = $1, description = $2, updated_at = NOW()
		WHERE id = $3 AND user_id = $4 AND is_default = false`

	_, err := r.pool.Exec(ctx, query,
		list.Name,
		nullString(list.Description),
		list.ID,
		list.UserID,
	)
	return err
}

// Delete removes a reading list (only custom lists)
func (r *ReadingListRepository) Delete(ctx context.Context, userID, listID uuid.UUID) error {
	query := `DELETE FROM reading_lists WHERE id = $1 AND user_id = $2 AND is_default = false`
	_, err := r.pool.Exec(ctx, query, listID, userID)
	return err
}

// AddBook adds a book to a reading list
func (r *ReadingListRepository) AddBook(ctx context.Context, listID, bookID uuid.UUID) error {
	query := `
		INSERT INTO reading_list_books (reading_list_id, book_id, date_added)
		VALUES ($1, $2, NOW())
		ON CONFLICT (reading_list_id, book_id) DO NOTHING`

	_, err := r.pool.Exec(ctx, query, listID, bookID)
	return err
}

// RemoveBook removes a book from a reading list
func (r *ReadingListRepository) RemoveBook(ctx context.Context, listID, bookID uuid.UUID) error {
	query := `DELETE FROM reading_list_books WHERE reading_list_id = $1 AND book_id = $2`
	_, err := r.pool.Exec(ctx, query, listID, bookID)
	return err
}

// MoveBook moves a book from one list to another
func (r *ReadingListRepository) MoveBook(ctx context.Context, fromListID, toListID, bookID uuid.UUID) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Get current progress data
	var currentPage, progressPct, sortOrder int
	var dateStarted, dateFinished, reviewDate *time.Time
	var rating *int
	var review *string

	selectQuery := `
		SELECT current_page, progress_percent, date_started, date_finished,
			rating, review, review_date, sort_order
		FROM reading_list_books
		WHERE reading_list_id = $1 AND book_id = $2`

	err = tx.QueryRow(ctx, selectQuery, fromListID, bookID).Scan(
		&currentPage, &progressPct, &dateStarted, &dateFinished,
		&rating, &review, &reviewDate, &sortOrder,
	)
	if err != nil {
		return err
	}

	// Delete from old list
	deleteQuery := `DELETE FROM reading_list_books WHERE reading_list_id = $1 AND book_id = $2`
	_, err = tx.Exec(ctx, deleteQuery, fromListID, bookID)
	if err != nil {
		return err
	}

	// Insert into new list with preserved data
	insertQuery := `
		INSERT INTO reading_list_books (
			reading_list_id, book_id, current_page, progress_percent,
			date_started, date_finished, rating, review, review_date, sort_order
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`

	_, err = tx.Exec(ctx, insertQuery,
		toListID, bookID, currentPage, progressPct,
		dateStarted, dateFinished, rating, review, reviewDate, sortOrder,
	)
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}

// GetListBooks retrieves all books in a reading list with their progress
func (r *ReadingListRepository) GetListBooks(ctx context.Context, listID uuid.UUID) ([]models.ReadingListBook, error) {
	query := `
		SELECT rlb.id, rlb.reading_list_id, rlb.book_id, rlb.current_page,
			rlb.progress_percent, rlb.date_added, rlb.date_started, rlb.date_finished,
			rlb.rating, rlb.review, rlb.review_date, rlb.sort_order,
			b.id, b.user_id, b.google_books_id, b.isbn_10, b.isbn_13, b.title, b.subtitle,
			b.authors, b.publisher, b.published_date, b.description, b.page_count,
			b.categories, b.language, b.thumbnail_url, b.format, b.owned,
			b.created_at, b.updated_at
		FROM reading_list_books rlb
		JOIN books b ON rlb.book_id = b.id
		WHERE rlb.reading_list_id = $1
		ORDER BY rlb.sort_order, rlb.date_added DESC`

	rows, err := r.pool.Query(ctx, query, listID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return r.scanReadingListBooks(rows)
}

// UpdateProgress updates reading progress for a book in a list
func (r *ReadingListRepository) UpdateProgress(ctx context.Context, listID, bookID uuid.UUID, req *models.UpdateReadingProgressRequest) error {
	query := `
		UPDATE reading_list_books SET
			current_page = COALESCE($1, current_page),
			progress_percent = COALESCE($2, progress_percent),
			date_started = COALESCE($3, date_started),
			date_finished = COALESCE($4, date_finished),
			rating = COALESCE($5, rating),
			review = COALESCE($6, review),
			review_date = CASE WHEN $6 IS NOT NULL THEN NOW() ELSE review_date END
		WHERE reading_list_id = $7 AND book_id = $8`

	_, err := r.pool.Exec(ctx, query,
		req.CurrentPage,
		req.ProgressPct,
		req.DateStarted,
		req.DateFinished,
		req.Rating,
		req.Review,
		listID,
		bookID,
	)
	return err
}

// GetCurrentlyReading returns books currently being read
func (r *ReadingListRepository) GetCurrentlyReading(ctx context.Context, userID uuid.UUID, limit int) ([]models.ReadingListBook, error) {
	query := `
		SELECT rlb.id, rlb.reading_list_id, rlb.book_id, rlb.current_page,
			rlb.progress_percent, rlb.date_added, rlb.date_started, rlb.date_finished,
			rlb.rating, rlb.review, rlb.review_date, rlb.sort_order,
			b.id, b.user_id, b.google_books_id, b.isbn_10, b.isbn_13, b.title, b.subtitle,
			b.authors, b.publisher, b.published_date, b.description, b.page_count,
			b.categories, b.language, b.thumbnail_url, b.format, b.owned,
			b.created_at, b.updated_at
		FROM reading_list_books rlb
		JOIN reading_lists rl ON rlb.reading_list_id = rl.id
		JOIN books b ON rlb.book_id = b.id
		WHERE rl.user_id = $1 AND rl.list_type = 'reading'
		ORDER BY rlb.date_started DESC NULLS LAST, rlb.date_added DESC
		LIMIT $2`

	rows, err := r.pool.Query(ctx, query, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return r.scanReadingListBooks(rows)
}

// GetRecentlyFinished returns recently finished books
func (r *ReadingListRepository) GetRecentlyFinished(ctx context.Context, userID uuid.UUID, limit int) ([]models.ReadingListBook, error) {
	query := `
		SELECT rlb.id, rlb.reading_list_id, rlb.book_id, rlb.current_page,
			rlb.progress_percent, rlb.date_added, rlb.date_started, rlb.date_finished,
			rlb.rating, rlb.review, rlb.review_date, rlb.sort_order,
			b.id, b.user_id, b.google_books_id, b.isbn_10, b.isbn_13, b.title, b.subtitle,
			b.authors, b.publisher, b.published_date, b.description, b.page_count,
			b.categories, b.language, b.thumbnail_url, b.format, b.owned,
			b.created_at, b.updated_at
		FROM reading_list_books rlb
		JOIN reading_lists rl ON rlb.reading_list_id = rl.id
		JOIN books b ON rlb.book_id = b.id
		WHERE rl.user_id = $1 AND rl.list_type = 'read' AND rlb.date_finished IS NOT NULL
		ORDER BY rlb.date_finished DESC
		LIMIT $2`

	rows, err := r.pool.Query(ctx, query, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return r.scanReadingListBooks(rows)
}

// CountBooksReadInYear returns the number of books finished in a given year
func (r *ReadingListRepository) CountBooksReadInYear(ctx context.Context, userID uuid.UUID, year int) (int, error) {
	query := `
		SELECT COUNT(*)
		FROM reading_list_books rlb
		JOIN reading_lists rl ON rlb.reading_list_id = rl.id
		WHERE rl.user_id = $1 AND rl.list_type = 'read'
			AND EXTRACT(YEAR FROM rlb.date_finished) = $2`

	var count int
	err := r.pool.QueryRow(ctx, query, userID, year).Scan(&count)
	return count, err
}

// GetReadingStats returns detailed reading statistics for a user
func (r *ReadingListRepository) GetReadingStats(ctx context.Context, userID uuid.UUID) (*models.ReadingStats, error) {
	stats := &models.ReadingStats{}

	// Get total books read and pages
	totalQuery := `
		SELECT COUNT(*), COALESCE(SUM(COALESCE(b.page_count, 0)), 0)
		FROM reading_list_books rlb
		JOIN reading_lists rl ON rlb.reading_list_id = rl.id
		JOIN books b ON rlb.book_id = b.id
		WHERE rl.user_id = $1 AND rl.list_type = 'read'`

	err := r.pool.QueryRow(ctx, totalQuery, userID).Scan(&stats.TotalBooksRead, &stats.TotalPagesRead)
	if err != nil {
		return nil, fmt.Errorf("failed to get totals: %w", err)
	}

	// Calculate average page count
	if stats.TotalBooksRead > 0 {
		stats.AveragePageCount = stats.TotalPagesRead / stats.TotalBooksRead
	}

	// Get average rating
	ratingQuery := `
		SELECT COALESCE(AVG(rlb.rating), 0)
		FROM reading_list_books rlb
		JOIN reading_lists rl ON rlb.reading_list_id = rl.id
		WHERE rl.user_id = $1 AND rl.list_type = 'read' AND rlb.rating IS NOT NULL`

	err = r.pool.QueryRow(ctx, ratingQuery, userID).Scan(&stats.AverageRating)
	if err != nil {
		stats.AverageRating = 0
	}

	// Get books read by year
	yearQuery := `
		SELECT EXTRACT(YEAR FROM rlb.date_finished)::int as year, COUNT(*) as count,
			COALESCE(SUM(COALESCE(b.page_count, 0)), 0) as pages
		FROM reading_list_books rlb
		JOIN reading_lists rl ON rlb.reading_list_id = rl.id
		JOIN books b ON rlb.book_id = b.id
		WHERE rl.user_id = $1 AND rl.list_type = 'read' AND rlb.date_finished IS NOT NULL
		GROUP BY EXTRACT(YEAR FROM rlb.date_finished)
		ORDER BY year DESC`

	yearRows, err := r.pool.Query(ctx, yearQuery, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get yearly stats: %w", err)
	}
	defer yearRows.Close()

	for yearRows.Next() {
		var yc models.YearlyBookCount
		if err := yearRows.Scan(&yc.Year, &yc.Count, &yc.Pages); err != nil {
			continue
		}
		stats.BooksReadByYear = append(stats.BooksReadByYear, yc)
	}

	// Get books read by month (last 12 months)
	monthQuery := `
		SELECT EXTRACT(YEAR FROM rlb.date_finished)::int as year,
			EXTRACT(MONTH FROM rlb.date_finished)::int as month, COUNT(*) as count
		FROM reading_list_books rlb
		JOIN reading_lists rl ON rlb.reading_list_id = rl.id
		WHERE rl.user_id = $1 AND rl.list_type = 'read'
			AND rlb.date_finished >= NOW() - INTERVAL '12 months'
		GROUP BY EXTRACT(YEAR FROM rlb.date_finished), EXTRACT(MONTH FROM rlb.date_finished)
		ORDER BY year, month`

	monthRows, err := r.pool.Query(ctx, monthQuery, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get monthly stats: %w", err)
	}
	defer monthRows.Close()

	monthNames := []string{"", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"}
	monthCount := 0
	for monthRows.Next() {
		var mc models.MonthlyBookCount
		if err := monthRows.Scan(&mc.Year, &mc.Month, &mc.Count); err != nil {
			continue
		}
		mc.Label = monthNames[mc.Month]
		stats.BooksReadByMonth = append(stats.BooksReadByMonth, mc)
		monthCount++
	}

	// Calculate average books per month
	if monthCount > 0 {
		totalBooks := 0
		for _, mc := range stats.BooksReadByMonth {
			totalBooks += mc.Count
		}
		stats.AverageBooksPerMonth = float64(totalBooks) / float64(monthCount)
	}

	// Get genre breakdown
	genreQuery := `
		SELECT UNNEST(b.categories) as genre, COUNT(*) as count
		FROM reading_list_books rlb
		JOIN reading_lists rl ON rlb.reading_list_id = rl.id
		JOIN books b ON rlb.book_id = b.id
		WHERE rl.user_id = $1 AND rl.list_type = 'read' AND b.categories IS NOT NULL AND array_length(b.categories, 1) > 0
		GROUP BY UNNEST(b.categories)
		ORDER BY count DESC
		LIMIT 10`

	genreRows, err := r.pool.Query(ctx, genreQuery, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get genre stats: %w", err)
	}
	defer genreRows.Close()

	for genreRows.Next() {
		var gc models.GenreCount
		if err := genreRows.Scan(&gc.Genre, &gc.Count); err != nil {
			continue
		}
		stats.GenreBreakdown = append(stats.GenreBreakdown, gc)
	}

	// Get top authors
	authorQuery := `
		SELECT UNNEST(b.authors) as author, COUNT(*) as count
		FROM reading_list_books rlb
		JOIN reading_lists rl ON rlb.reading_list_id = rl.id
		JOIN books b ON rlb.book_id = b.id
		WHERE rl.user_id = $1 AND rl.list_type = 'read' AND b.authors IS NOT NULL AND array_length(b.authors, 1) > 0
		GROUP BY UNNEST(b.authors)
		ORDER BY count DESC
		LIMIT 10`

	authorRows, err := r.pool.Query(ctx, authorQuery, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get author stats: %w", err)
	}
	defer authorRows.Close()

	for authorRows.Next() {
		var ac models.AuthorCount
		if err := authorRows.Scan(&ac.Author, &ac.Count); err != nil {
			continue
		}
		stats.AuthorStats = append(stats.AuthorStats, ac)
	}

	// Get longest book
	longestQuery := `
		SELECT b.title, array_to_string(b.authors, ', '), b.page_count
		FROM reading_list_books rlb
		JOIN reading_lists rl ON rlb.reading_list_id = rl.id
		JOIN books b ON rlb.book_id = b.id
		WHERE rl.user_id = $1 AND rl.list_type = 'read' AND b.page_count IS NOT NULL
		ORDER BY b.page_count DESC
		LIMIT 1`

	var longestBook models.BookStat
	err = r.pool.QueryRow(ctx, longestQuery, userID).Scan(&longestBook.Title, &longestBook.Authors, &longestBook.PageCount)
	if err == nil {
		stats.LongestBook = &longestBook
	}

	// Get shortest book
	shortestQuery := `
		SELECT b.title, array_to_string(b.authors, ', '), b.page_count
		FROM reading_list_books rlb
		JOIN reading_lists rl ON rlb.reading_list_id = rl.id
		JOIN books b ON rlb.book_id = b.id
		WHERE rl.user_id = $1 AND rl.list_type = 'read' AND b.page_count IS NOT NULL AND b.page_count > 0
		ORDER BY b.page_count ASC
		LIMIT 1`

	var shortestBook models.BookStat
	err = r.pool.QueryRow(ctx, shortestQuery, userID).Scan(&shortestBook.Title, &shortestBook.Authors, &shortestBook.PageCount)
	if err == nil {
		stats.ShortestBook = &shortestBook
	}

	return stats, nil
}

// Helper function to scan reading list books
func (r *ReadingListRepository) scanReadingListBooks(rows pgx.Rows) ([]models.ReadingListBook, error) {
	var items []models.ReadingListBook
	for rows.Next() {
		var item models.ReadingListBook
		var book models.Book
		var dateStarted, dateFinished, reviewDate *time.Time
		var rating *int
		var review *string
		var googleBooksID, isbn10, isbn13, subtitle, publisher, publishedDate, description *string
		var language, thumbnailURL, format *string

		err := rows.Scan(
			&item.ID, &item.ReadingListID, &item.BookID, &item.CurrentPage,
			&item.ProgressPct, &item.DateAdded, &dateStarted, &dateFinished,
			&rating, &review, &reviewDate, &item.SortOrder,
			&book.ID, &book.UserID, &googleBooksID, &isbn10, &isbn13, &book.Title, &subtitle,
			&book.Authors, &publisher, &publishedDate, &description, &book.PageCount,
			&book.Categories, &language, &thumbnailURL, &format, &book.Owned,
			&book.CreatedAt, &book.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		item.DateStarted = dateStarted
		item.DateFinished = dateFinished
		item.ReviewDate = reviewDate
		item.Rating = rating
		if review != nil {
			item.Review = *review
		}

		if googleBooksID != nil {
			book.GoogleBooksID = *googleBooksID
		}
		if isbn10 != nil {
			book.ISBN10 = *isbn10
		}
		if isbn13 != nil {
			book.ISBN13 = *isbn13
		}
		if subtitle != nil {
			book.Subtitle = *subtitle
		}
		if publisher != nil {
			book.Publisher = *publisher
		}
		if publishedDate != nil {
			book.PublishedDate = *publishedDate
		}
		if description != nil {
			book.Description = *description
		}
		if language != nil {
			book.Language = *language
		}
		if thumbnailURL != nil {
			book.ThumbnailURL = *thumbnailURL
		}
		if format != nil {
			book.Format = *format
		}

		item.Book = &book
		items = append(items, item)
	}
	return items, nil
}

// ReadingGoalRepository handles reading goal database operations
type ReadingGoalRepository struct {
	pool *pgxpool.Pool
}

// NewReadingGoalRepository creates a new reading goal repository
func NewReadingGoalRepository(pool *pgxpool.Pool) *ReadingGoalRepository {
	return &ReadingGoalRepository{pool: pool}
}

// Upsert creates or updates a reading goal for a year
func (r *ReadingGoalRepository) Upsert(ctx context.Context, goal *models.ReadingGoal) error {
	query := `
		INSERT INTO reading_goals (user_id, year, target_books)
		VALUES ($1, $2, $3)
		ON CONFLICT (user_id, year) DO UPDATE SET target_books = $3
		RETURNING id, created_at`

	return r.pool.QueryRow(ctx, query,
		goal.UserID,
		goal.Year,
		goal.TargetBooks,
	).Scan(&goal.ID, &goal.CreatedAt)
}

// GetByYear retrieves a reading goal for a specific year
func (r *ReadingGoalRepository) GetByYear(ctx context.Context, userID uuid.UUID, year int) (*models.ReadingGoal, error) {
	query := `
		SELECT id, user_id, year, target_books, created_at
		FROM reading_goals
		WHERE user_id = $1 AND year = $2`

	goal := &models.ReadingGoal{}
	err := r.pool.QueryRow(ctx, query, userID, year).Scan(
		&goal.ID, &goal.UserID, &goal.Year, &goal.TargetBooks, &goal.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	return goal, nil
}

// GetCurrentYear retrieves the reading goal for the current year
func (r *ReadingGoalRepository) GetCurrentYear(ctx context.Context, userID uuid.UUID) (*models.ReadingGoal, error) {
	return r.GetByYear(ctx, userID, time.Now().Year())
}

// List retrieves all reading goals for a user
func (r *ReadingGoalRepository) List(ctx context.Context, userID uuid.UUID) ([]models.ReadingGoal, error) {
	query := `
		SELECT id, user_id, year, target_books, created_at
		FROM reading_goals
		WHERE user_id = $1
		ORDER BY year DESC`

	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var goals []models.ReadingGoal
	for rows.Next() {
		var goal models.ReadingGoal
		err := rows.Scan(&goal.ID, &goal.UserID, &goal.Year, &goal.TargetBooks, &goal.CreatedAt)
		if err != nil {
			return nil, err
		}
		goals = append(goals, goal)
	}

	return goals, nil
}

// Delete removes a reading goal
func (r *ReadingGoalRepository) Delete(ctx context.Context, userID uuid.UUID, year int) error {
	query := `DELETE FROM reading_goals WHERE user_id = $1 AND year = $2`
	_, err := r.pool.Exec(ctx, query, userID, year)
	return err
}

// nullString returns nil for empty strings, otherwise returns a pointer to the string
// This is used for nullable database columns
func nullString(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// EnsureDefaultLists creates the default reading lists for a user if they don't exist
func (r *ReadingListRepository) EnsureDefaultLists(ctx context.Context, userID uuid.UUID) error {
	defaults := []struct {
		name      string
		listType  string
		sortOrder int
	}{
		{"Want to Read", models.ReadingListTypeToRead, 0},
		{"Currently Reading", models.ReadingListTypeReading, 1},
		{"Read", models.ReadingListTypeRead, 2},
	}

	for _, d := range defaults {
		query := `
			INSERT INTO reading_lists (user_id, name, list_type, is_default, sort_order)
			VALUES ($1, $2, $3, true, $4)
			ON CONFLICT DO NOTHING`

		_, err := r.pool.Exec(ctx, query, userID, d.name, d.listType, d.sortOrder)
		if err != nil {
			return err
		}
	}

	return nil
}
