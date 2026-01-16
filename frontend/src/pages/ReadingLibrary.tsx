import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ReadingLayout } from './Reading';
import {
  BookOpen,
  Search,
  Plus,
  Grid,
  List,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { readingApi } from '@/api/reading';
import { Book, GoodreadsImportResult } from '@/types';

export function ReadingLibrary() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Import state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<GoodreadsImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadBooks = async () => {
    try {
      setLoading(true);
      const data = await readingApi.listBooks({ search: search || undefined });
      setBooks(data);
    } catch (error) {
      console.error('Failed to load books:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBooks();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadBooks();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
      setImportResult(null);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;

    try {
      setImporting(true);
      const result = await readingApi.importGoodreads(importFile);
      setImportResult(result);
      // Reload books after successful import
      if (result.books_imported > 0) {
        loadBooks();
      }
    } catch (error) {
      console.error('Import failed:', error);
      setImportResult({
        books_imported: 0,
        books_skipped: 0,
        books_updated: 0,
        errors: ['Failed to import file. Please check the file format and try again.'],
      });
    } finally {
      setImporting(false);
    }
  };

  const handleCloseImportModal = () => {
    setImportModalOpen(false);
    setImportFile(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <ReadingLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Library</h1>
            <p className="text-muted-foreground">
              {books.length} {books.length === 1 ? 'book' : 'books'} in your library
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportModalOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Button>
            <Button asChild className="bg-reading hover:bg-reading/90">
              <Link to="/reading/search">
                <Plus className="mr-2 h-4 w-4" />
                Add Book
              </Link>
            </Button>
          </div>
        </div>

        {/* Search and View Toggle */}
        <div className="flex items-center gap-4">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search your library..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit" variant="outline">
              Search
            </Button>
          </form>
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Books Display */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : books.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <BookOpen className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium mb-2">Your library is empty</h3>
              <p className="text-muted-foreground max-w-sm mb-4">
                Start building your library by searching for books and adding them.
              </p>
              <Button asChild className="bg-reading hover:bg-reading/90">
                <Link to="/reading/search">
                  <Search className="mr-2 h-4 w-4" />
                  Search for Books
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : viewMode === 'grid' ? (
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {books.map((book) => (
              <Link
                key={book.id}
                to={`/reading/library/${book.id}`}
                className="group"
              >
                <div className="aspect-[2/3] rounded-lg overflow-hidden mb-2 shadow-sm hover:shadow-md transition-shadow">
                  {book.thumbnail_url ? (
                    <img
                      src={book.thumbnail_url}
                      alt={book.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <BookOpen className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <h4 className="font-medium text-sm line-clamp-2 group-hover:text-reading transition-colors">
                  {book.title}
                </h4>
                <p className="text-xs text-muted-foreground truncate">
                  {book.authors?.join(', ') || 'Unknown author'}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {books.map((book) => (
              <Link
                key={book.id}
                to={`/reading/library/${book.id}`}
                className="flex items-center gap-4 p-4 rounded-lg border hover:border-reading hover:bg-reading/5 transition-colors"
              >
                {book.thumbnail_url ? (
                  <img
                    src={book.thumbnail_url}
                    alt={book.title}
                    className="w-12 h-16 rounded object-cover shadow-sm"
                  />
                ) : (
                  <div className="w-12 h-16 rounded bg-muted flex items-center justify-center">
                    <BookOpen className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{book.title}</h4>
                  <p className="text-sm text-muted-foreground truncate">
                    {book.authors?.join(', ') || 'Unknown author'}
                  </p>
                  {book.page_count && (
                    <p className="text-xs text-muted-foreground">
                      {book.page_count} pages
                    </p>
                  )}
                </div>
                {book.format && (
                  <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground capitalize">
                    {book.format}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Import Modal */}
      <Dialog open={importModalOpen} onOpenChange={handleCloseImportModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import from Goodreads</DialogTitle>
            <DialogDescription>
              Import your books from a Goodreads CSV export file.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!importResult ? (
              <>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    To export your Goodreads library:
                  </p>
                  <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                    <li>Go to Goodreads &rarr; My Books</li>
                    <li>Click "Import and export" in the sidebar</li>
                    <li>Click "Export Library"</li>
                    <li>Upload the downloaded CSV file below</li>
                  </ol>
                </div>

                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    importFile ? 'border-reading bg-reading/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const file = e.dataTransfer.files[0];
                    if (file && file.name.endsWith('.csv')) {
                      setImportFile(file);
                      setImportResult(null);
                    }
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  {importFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="h-5 w-5 text-reading" />
                      <span className="font-medium">{importFile.name}</span>
                    </div>
                  ) : (
                    <div className="space-y-2 cursor-pointer">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Click to select or drag and drop your CSV file
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={handleCloseImportModal}>
                    Cancel
                  </Button>
                  <Button
                    className="bg-reading hover:bg-reading/90"
                    onClick={handleImport}
                    disabled={!importFile || importing}
                  >
                    {importing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Import
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                {importResult.errors && importResult.errors.length > 0 ? (
                  <div className="flex items-start gap-3 p-4 bg-destructive/10 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-medium text-destructive">Import completed with errors</p>
                      <ul className="text-sm text-muted-foreground list-disc list-inside">
                        {importResult.errors.slice(0, 5).map((error, i) => (
                          <li key={i}>{error}</li>
                        ))}
                        {importResult.errors.length > 5 && (
                          <li>...and {importResult.errors.length - 5} more errors</li>
                        )}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-4 bg-green-500/10 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <p className="font-medium text-green-700 dark:text-green-400">
                      Import completed successfully!
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-2xl font-bold text-reading">
                      {importResult.books_imported}
                    </p>
                    <p className="text-xs text-muted-foreground">Imported</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">
                      {importResult.books_skipped}
                    </p>
                    <p className="text-xs text-muted-foreground">Already Exist</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">
                      {importResult.books_updated}
                    </p>
                    <p className="text-xs text-muted-foreground">Updated</p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleCloseImportModal}>
                    Done
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </ReadingLayout>
  );
}
