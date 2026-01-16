import api from './client';
import {
  Book,
  ReadingList,
  ReadingListBook,
  ReadingGoal,
  ReadingSummary,
  ReadingStats,
  GoogleBooksSearchResult,
  GoogleBooksVolume,
  CreateBookRequest,
  UpdateBookRequest,
  CreateReadingListRequest,
  UpdateReadingProgressRequest,
  SetReadingGoalRequest,
  GoodreadsImportResult,
} from '@/types';

// Book filters
interface BookFilters {
  search?: string;
  limit?: number;
  offset?: number;
}

export const readingApi = {
  // =============================================================================
  // Google Books Search
  // =============================================================================

  searchBooks: async (query: string, maxResults = 10): Promise<GoogleBooksSearchResult> => {
    const params = new URLSearchParams({
      q: query,
      maxResults: maxResults.toString(),
    });
    const response = await api.get<GoogleBooksSearchResult>(`/books/search?${params}`);
    return response.data;
  },

  searchByISBN: async (isbn: string): Promise<GoogleBooksVolume> => {
    const response = await api.get<GoogleBooksVolume>(`/books/search/isbn/${isbn}`);
    return response.data;
  },

  // =============================================================================
  // Library (User's Books)
  // =============================================================================

  listBooks: async (filters?: BookFilters): Promise<Book[]> => {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    const queryString = params.toString();
    const url = queryString ? `/books?${queryString}` : '/books';
    const response = await api.get<Book[]>(url);
    return response.data;
  },

  getBook: async (id: string): Promise<Book> => {
    const response = await api.get<Book>(`/books/${id}`);
    return response.data;
  },

  createBook: async (data: CreateBookRequest): Promise<Book> => {
    const response = await api.post<Book>('/books', data);
    return response.data;
  },

  updateBook: async (id: string, data: UpdateBookRequest): Promise<Book> => {
    const response = await api.put<Book>(`/books/${id}`, data);
    return response.data;
  },

  deleteBook: async (id: string): Promise<void> => {
    await api.delete(`/books/${id}`);
  },

  // =============================================================================
  // Import
  // =============================================================================

  importGoodreads: async (file: File): Promise<GoodreadsImportResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<GoodreadsImportResult>('/books/import/goodreads', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // =============================================================================
  // Reading Lists
  // =============================================================================

  listReadingLists: async (): Promise<ReadingList[]> => {
    const response = await api.get<ReadingList[]>('/books/lists');
    return response.data;
  },

  getReadingList: async (id: string): Promise<ReadingList> => {
    const response = await api.get<ReadingList>(`/books/lists/${id}`);
    return response.data;
  },

  createReadingList: async (data: CreateReadingListRequest): Promise<ReadingList> => {
    const response = await api.post<ReadingList>('/books/lists', data);
    return response.data;
  },

  updateReadingList: async (id: string, data: CreateReadingListRequest): Promise<ReadingList> => {
    const response = await api.put<ReadingList>(`/books/lists/${id}`, data);
    return response.data;
  },

  deleteReadingList: async (id: string): Promise<void> => {
    await api.delete(`/books/lists/${id}`);
  },

  getListBooks: async (listId: string): Promise<ReadingListBook[]> => {
    const response = await api.get<ReadingListBook[]>(`/books/lists/${listId}/books`);
    return response.data;
  },

  addBookToList: async (listId: string, bookId: string): Promise<void> => {
    await api.post(`/books/lists/${listId}/books`, { book_id: bookId });
  },

  updateBookProgress: async (
    listId: string,
    bookId: string,
    data: UpdateReadingProgressRequest
  ): Promise<void> => {
    await api.put(`/books/lists/${listId}/books/${bookId}`, data);
  },

  removeBookFromList: async (listId: string, bookId: string): Promise<void> => {
    await api.delete(`/books/lists/${listId}/books/${bookId}`);
  },

  moveBook: async (fromListId: string, toListId: string, bookId: string): Promise<void> => {
    await api.post(`/books/lists/${fromListId}/books/${bookId}/move/${toListId}`);
  },

  // =============================================================================
  // Reading Goals
  // =============================================================================

  listGoals: async (): Promise<ReadingGoal[]> => {
    const response = await api.get<ReadingGoal[]>('/books/goals');
    return response.data;
  },

  getGoal: async (year: number): Promise<ReadingGoal> => {
    const response = await api.get<ReadingGoal>(`/books/goals/${year}`);
    return response.data;
  },

  setGoal: async (data: SetReadingGoalRequest): Promise<ReadingGoal> => {
    const response = await api.post<ReadingGoal>('/books/goals', data);
    return response.data;
  },

  deleteGoal: async (year: number): Promise<void> => {
    await api.delete(`/books/goals/${year}`);
  },

  // =============================================================================
  // Summary and Stats
  // =============================================================================

  getSummary: async (): Promise<ReadingSummary> => {
    const response = await api.get<ReadingSummary>('/books/summary');
    return response.data;
  },

  getStats: async (): Promise<ReadingStats> => {
    const response = await api.get<ReadingStats>('/books/stats');
    return response.data;
  },
};

// Helper function to convert Google Books volume to CreateBookRequest
export function googleBooksToCreateRequest(volume: GoogleBooksVolume): CreateBookRequest {
  const info = volume.volumeInfo;
  const identifiers = info.industryIdentifiers || [];
  const isbn10 = identifiers.find((i) => i.type === 'ISBN_10')?.identifier;
  const isbn13 = identifiers.find((i) => i.type === 'ISBN_13')?.identifier;

  return {
    google_books_id: volume.id,
    isbn_10: isbn10,
    isbn_13: isbn13,
    title: info.title,
    subtitle: info.subtitle,
    authors: info.authors || [],
    publisher: info.publisher,
    published_date: info.publishedDate,
    description: info.description,
    page_count: info.pageCount,
    categories: info.categories || [],
    language: info.language,
    thumbnail_url: info.imageLinks?.thumbnail?.replace('http://', 'https://'),
  };
}
