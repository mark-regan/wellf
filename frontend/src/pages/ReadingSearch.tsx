import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ReadingLayout } from './Reading';
import {
  BookOpen,
  Search,
  Plus,
  Check,
  Loader2,
  BookMarked,
  Library,
} from 'lucide-react';
import { readingApi, googleBooksToCreateRequest } from '@/api/reading';
import { GoogleBooksVolume, ReadingList } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function ReadingSearch() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<GoogleBooksVolume[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // For adding book to list
  const [selectedBook, setSelectedBook] = useState<GoogleBooksVolume | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [lists, setLists] = useState<ReadingList[]>([]);
  const [addingToList, setAddingToList] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setHasSearched(true);
    try {
      const data = await readingApi.searchBooks(searchQuery, 20);
      setResults(data.items || []);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBook = async (volume: GoogleBooksVolume) => {
    setSelectedBook(volume);
    try {
      const listsData = await readingApi.listReadingLists();
      setLists(listsData);
      setShowAddDialog(true);
    } catch (error) {
      console.error('Failed to load lists:', error);
    }
  };

  const handleAddToList = async (listId: string) => {
    if (!selectedBook) return;

    setAddingToList(listId);
    try {
      // First, create the book in the library
      const bookRequest = googleBooksToCreateRequest(selectedBook);
      const book = await readingApi.createBook(bookRequest);

      // Then add it to the selected list
      await readingApi.addBookToList(listId, book.id);

      setShowAddDialog(false);
      setSelectedBook(null);
      navigate(`/reading/library/${book.id}`);
    } catch (error) {
      console.error('Failed to add book:', error);
    } finally {
      setAddingToList(null);
    }
  };

  const handleAddToLibraryOnly = async () => {
    if (!selectedBook) return;

    setAddingToList('library');
    try {
      const bookRequest = googleBooksToCreateRequest(selectedBook);
      const book = await readingApi.createBook(bookRequest);
      setShowAddDialog(false);
      setSelectedBook(null);
      navigate(`/reading/library/${book.id}`);
    } catch (error) {
      console.error('Failed to add book:', error);
    } finally {
      setAddingToList(null);
    }
  };

  const getListIcon = (listType: string) => {
    switch (listType) {
      case 'to_read':
        return <BookOpen className="h-5 w-5" />;
      case 'reading':
        return <BookMarked className="h-5 w-5" />;
      case 'read':
        return <Check className="h-5 w-5" />;
      default:
        return <Library className="h-5 w-5" />;
    }
  };

  return (
    <ReadingLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Search Books</h1>
          <p className="text-muted-foreground">Find books to add to your library</p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title, author, or ISBN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit" disabled={loading} className="bg-reading hover:bg-reading/90">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Search
              </>
            )}
          </Button>
        </form>

        {/* Search Results */}
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-reading" />
            <p className="text-muted-foreground mt-2">Searching...</p>
          </div>
        ) : results.length === 0 && hasSearched ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium mb-2">No books found</h3>
              <p className="text-muted-foreground max-w-sm">
                Try searching with different keywords or check your spelling.
              </p>
            </CardContent>
          </Card>
        ) : results.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <BookOpen className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium mb-2">Search for books</h3>
              <p className="text-muted-foreground max-w-sm">
                Enter a title, author name, or ISBN to find books to add to your library.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Found {results.length} results
            </p>
            <div className="grid gap-4">
              {results.map((volume) => (
                <Card key={volume.id}>
                  <CardContent className="flex gap-4 p-4">
                    {volume.volumeInfo.imageLinks?.thumbnail ? (
                      <img
                        src={volume.volumeInfo.imageLinks.thumbnail.replace('http://', 'https://')}
                        alt={volume.volumeInfo.title}
                        className="w-20 h-28 rounded object-cover shadow-sm flex-shrink-0"
                      />
                    ) : (
                      <div className="w-20 h-28 rounded bg-muted flex items-center justify-center flex-shrink-0">
                        <BookOpen className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium line-clamp-1">{volume.volumeInfo.title}</h3>
                      {volume.volumeInfo.subtitle && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {volume.volumeInfo.subtitle}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground mt-1">
                        {volume.volumeInfo.authors?.join(', ') || 'Unknown author'}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {volume.volumeInfo.publishedDate && (
                          <span>{volume.volumeInfo.publishedDate.substring(0, 4)}</span>
                        )}
                        {volume.volumeInfo.pageCount && (
                          <span>{volume.volumeInfo.pageCount} pages</span>
                        )}
                      </div>
                      {volume.volumeInfo.description && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {volume.volumeInfo.description}
                        </p>
                      )}
                    </div>
                    <Button
                      onClick={() => handleAddBook(volume)}
                      className="flex-shrink-0 bg-reading hover:bg-reading/90"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add to List Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Reading List</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            <p className="text-sm text-muted-foreground">
              Choose a list to add "{selectedBook?.volumeInfo.title}" to:
            </p>

            {/* Library only option */}
            <button
              onClick={handleAddToLibraryOnly}
              disabled={addingToList !== null}
              className="w-full flex items-center gap-3 p-3 rounded-lg border hover:border-reading hover:bg-reading/5 transition-colors text-left"
            >
              <div className="p-2 rounded-full bg-muted">
                <Library className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Library only</p>
                <p className="text-sm text-muted-foreground">Add without adding to a list</p>
              </div>
              {addingToList === 'library' && (
                <Loader2 className="h-5 w-5 animate-spin text-reading" />
              )}
            </button>

            <div className="border-t pt-3">
              <p className="text-xs text-muted-foreground mb-2">Or add to a list:</p>
              {lists.map((list) => (
                <button
                  key={list.id}
                  onClick={() => handleAddToList(list.id)}
                  disabled={addingToList !== null}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border hover:border-reading hover:bg-reading/5 transition-colors text-left mb-2"
                >
                  <div className="p-2 rounded-full bg-reading/10 text-reading">
                    {getListIcon(list.list_type)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{list.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {list.book_count} {list.book_count === 1 ? 'book' : 'books'}
                    </p>
                  </div>
                  {addingToList === list.id && (
                    <Loader2 className="h-5 w-5 animate-spin text-reading" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </ReadingLayout>
  );
}
