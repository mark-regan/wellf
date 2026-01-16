import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ReadingLayout } from './Reading';
import {
  BookOpen,
  ArrowLeft,
  Edit2,
  Trash2,
  Plus,
  Star,
  Calendar,
  BookMarked,
  CheckCircle2,
  ListTodo,
  Save,
  FileText,
  Clock,
  User,
  Building,
} from 'lucide-react';
import { readingApi } from '@/api/reading';
import { Book, ReadingList, ReadingListBook, UpdateReadingProgressRequest } from '@/types';

export function BookDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<Book | null>(null);
  const [readingLists, setReadingLists] = useState<ReadingList[]>([]);
  const [bookInLists, setBookInLists] = useState<Map<string, ReadingListBook>>(new Map());
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  // Add to list dialog
  const [addToListOpen, setAddToListOpen] = useState(false);
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [addingToList, setAddingToList] = useState(false);

  // Progress update dialog
  const [progressOpen, setProgressOpen] = useState(false);
  const [progressForm, setProgressForm] = useState<UpdateReadingProgressRequest>({});

  const loadData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [bookData, listsData] = await Promise.all([
        readingApi.getBook(id),
        readingApi.listReadingLists(),
      ]);
      setBook(bookData);
      setReadingLists(listsData);

      // Check which lists contain this book
      const listBookMap = new Map<string, ReadingListBook>();
      for (const list of listsData) {
        try {
          const listBooks = await readingApi.getListBooks(list.id);
          const bookInList = listBooks.find((b) => b.book_id === id);
          if (bookInList) {
            listBookMap.set(list.id, bookInList);
          }
        } catch {
          // Ignore errors for individual lists
        }
      }
      setBookInLists(listBookMap);
    } catch (error) {
      console.error('Failed to load book:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleDelete = async () => {
    if (!id || !confirm('Are you sure you want to delete this book?')) return;
    try {
      setDeleting(true);
      await readingApi.deleteBook(id);
      navigate('/reading/library');
    } catch (error) {
      console.error('Failed to delete book:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleAddToList = async () => {
    if (!id || !selectedListId) return;
    try {
      setAddingToList(true);
      await readingApi.addBookToList(selectedListId, id);
      setAddToListOpen(false);
      setSelectedListId('');
      loadData();
    } catch (error) {
      console.error('Failed to add to list:', error);
    } finally {
      setAddingToList(false);
    }
  };

  const handleRemoveFromList = async (listId: string) => {
    if (!id) return;
    try {
      await readingApi.removeBookFromList(listId, id);
      loadData();
    } catch (error) {
      console.error('Failed to remove from list:', error);
    }
  };

  const handleUpdateProgress = async () => {
    if (!id) return;
    // Find the list this book is in (prefer currently reading)
    const readingList = readingLists.find((l) => l.list_type === 'reading' && bookInLists.has(l.id));
    const anyList = Array.from(bookInLists.keys())[0];
    const listId = readingList?.id || anyList;

    if (!listId) {
      alert('Please add this book to a reading list first.');
      return;
    }

    try {
      await readingApi.updateBookProgress(listId, id, progressForm);
      setProgressOpen(false);
      setProgressForm({});
      loadData();
    } catch (error) {
      console.error('Failed to update progress:', error);
    }
  };

  const handleMoveToList = async (fromListId: string, toListId: string) => {
    if (!id) return;
    try {
      await readingApi.moveBook(fromListId, toListId, id);
      loadData();
    } catch (error) {
      console.error('Failed to move book:', error);
    }
  };

  const getListIcon = (listType: string) => {
    switch (listType) {
      case 'to_read':
        return BookOpen;
      case 'reading':
        return BookMarked;
      case 'read':
        return CheckCircle2;
      default:
        return ListTodo;
    }
  };

  const currentListEntry = Array.from(bookInLists.values())[0];
  const isInAnyList = bookInLists.size > 0;
  const listsNotContainingBook = readingLists.filter((l) => !bookInLists.has(l.id));

  if (loading) {
    return (
      <ReadingLayout>
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      </ReadingLayout>
    );
  }

  if (!book) {
    return (
      <ReadingLayout>
        <div className="text-center py-12">
          <BookOpen className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Book not found</h3>
          <Button asChild>
            <Link to="/reading/library">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Library
            </Link>
          </Button>
        </div>
      </ReadingLayout>
    );
  }

  return (
    <ReadingLayout>
      <div className="space-y-6">
        {/* Header with back button */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/reading/library">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="font-display text-2xl font-bold flex-1 truncate">{book.title}</h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleDelete}
              disabled={deleting}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Main content */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left column - Book info */}
          <div className="lg:col-span-1 space-y-4">
            {/* Cover */}
            <div className="aspect-[2/3] rounded-lg overflow-hidden shadow-md">
              {book.thumbnail_url ? (
                <img
                  src={book.thumbnail_url}
                  alt={book.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <BookOpen className="h-20 w-20 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Quick actions */}
            <div className="space-y-2">
              {listsNotContainingBook.length > 0 && (
                <Button
                  className="w-full bg-reading hover:bg-reading/90"
                  onClick={() => setAddToListOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add to List
                </Button>
              )}
              {isInAnyList && (
                <Button variant="outline" className="w-full" onClick={() => setProgressOpen(true)}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Update Progress
                </Button>
              )}
            </div>

            {/* Book metadata */}
            <Card>
              <CardContent className="pt-4 space-y-3">
                {book.authors && book.authors.length > 0 && (
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Author</p>
                      <p className="text-sm">{book.authors.join(', ')}</p>
                    </div>
                  </div>
                )}
                {book.publisher && (
                  <div className="flex items-start gap-2">
                    <Building className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Publisher</p>
                      <p className="text-sm">{book.publisher}</p>
                    </div>
                  </div>
                )}
                {book.published_date && (
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Published</p>
                      <p className="text-sm">{book.published_date}</p>
                    </div>
                  </div>
                )}
                {book.page_count && (
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Pages</p>
                      <p className="text-sm">{book.page_count}</p>
                    </div>
                  </div>
                )}
                {book.format && (
                  <div className="flex items-start gap-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Format</p>
                      <p className="text-sm capitalize">{book.format}</p>
                    </div>
                  </div>
                )}
                {(book.isbn_13 || book.isbn_10) && (
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">ISBN</p>
                      <p className="text-sm font-mono text-xs">{book.isbn_13 || book.isbn_10}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right column - Details and progress */}
          <div className="lg:col-span-2 space-y-6">
            {/* Subtitle */}
            {book.subtitle && (
              <p className="text-lg text-muted-foreground">{book.subtitle}</p>
            )}

            {/* Categories */}
            {book.categories && book.categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {book.categories.map((category) => (
                  <span
                    key={category}
                    className="px-3 py-1 rounded-full text-xs bg-reading/10 text-reading"
                  >
                    {category}
                  </span>
                ))}
              </div>
            )}

            {/* Reading Lists */}
            {isInAnyList && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ListTodo className="h-5 w-5 text-reading" />
                    In Your Lists
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Array.from(bookInLists.entries()).map(([listId, listBook]) => {
                    const list = readingLists.find((l) => l.id === listId);
                    if (!list) return null;
                    const Icon = getListIcon(list.list_type);
                    return (
                      <div
                        key={listId}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-reading/10">
                            <Icon className="h-4 w-4 text-reading" />
                          </div>
                          <div>
                            <p className="font-medium">{list.name}</p>
                            {listBook.progress_percent > 0 && (
                              <div className="flex items-center gap-2 mt-1">
                                <Progress value={listBook.progress_percent} className="h-2 w-24" />
                                <span className="text-xs text-muted-foreground">
                                  {listBook.progress_percent}%
                                </span>
                              </div>
                            )}
                            {listBook.rating && (
                              <div className="flex items-center gap-1 mt-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`h-3 w-3 ${
                                      star <= listBook.rating!
                                        ? 'fill-reading text-reading'
                                        : 'text-muted-foreground/30'
                                    }`}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select
                            value=""
                            onValueChange={(toListId) => handleMoveToList(listId, toListId)}
                          >
                            <SelectTrigger className="w-32 h-8 text-xs">
                              <SelectValue placeholder="Move to..." />
                            </SelectTrigger>
                            <SelectContent>
                              {listsNotContainingBook.map((l) => (
                                <SelectItem key={l.id} value={l.id}>
                                  {l.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemoveFromList(listId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Reading Progress Details */}
            {currentListEntry && (currentListEntry.date_started || currentListEntry.date_finished || currentListEntry.review) && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BookMarked className="h-5 w-5 text-reading" />
                    Reading Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {currentListEntry.date_started && (
                      <div>
                        <p className="text-xs text-muted-foreground">Started</p>
                        <p className="text-sm font-medium">
                          {new Date(currentListEntry.date_started).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {currentListEntry.date_finished && (
                      <div>
                        <p className="text-xs text-muted-foreground">Finished</p>
                        <p className="text-sm font-medium">
                          {new Date(currentListEntry.date_finished).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {currentListEntry.current_page > 0 && book.page_count && (
                      <div>
                        <p className="text-xs text-muted-foreground">Progress</p>
                        <p className="text-sm font-medium">
                          Page {currentListEntry.current_page} of {book.page_count}
                        </p>
                      </div>
                    )}
                  </div>
                  {currentListEntry.review && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Review</p>
                      <p className="text-sm bg-muted p-3 rounded-lg whitespace-pre-wrap">
                        {currentListEntry.review}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Description */}
            {book.description && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {book.description}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Add to List Dialog */}
      <Dialog open={addToListOpen} onOpenChange={setAddToListOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Reading List</DialogTitle>
            <DialogDescription>Choose a list to add this book to.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select value={selectedListId} onValueChange={setSelectedListId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a list" />
              </SelectTrigger>
              <SelectContent>
                {listsNotContainingBook.map((list) => (
                  <SelectItem key={list.id} value={list.id}>
                    {list.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddToListOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-reading hover:bg-reading/90"
                onClick={handleAddToList}
                disabled={!selectedListId || addingToList}
              >
                {addingToList ? 'Adding...' : 'Add to List'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Update Progress Dialog */}
      <Dialog open={progressOpen} onOpenChange={setProgressOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Reading Progress</DialogTitle>
            <DialogDescription>Track your progress for this book.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {book.page_count && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Current Page</label>
                <Input
                  type="number"
                  min={0}
                  max={book.page_count}
                  value={progressForm.current_page || ''}
                  onChange={(e) =>
                    setProgressForm({
                      ...progressForm,
                      current_page: parseInt(e.target.value) || undefined,
                      progress_percent: Math.round((parseInt(e.target.value) / book.page_count!) * 100),
                    })
                  }
                  placeholder={`of ${book.page_count} pages`}
                />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Rating</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setProgressForm({ ...progressForm, rating: star })}
                    className="p-1"
                  >
                    <Star
                      className={`h-6 w-6 transition-colors ${
                        star <= (progressForm.rating || 0)
                          ? 'fill-reading text-reading'
                          : 'text-muted-foreground/30 hover:text-muted-foreground'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Started</label>
              <Input
                type="date"
                value={
                  progressForm.date_started
                    ? new Date(progressForm.date_started).toISOString().split('T')[0]
                    : ''
                }
                onChange={(e) =>
                  setProgressForm({
                    ...progressForm,
                    date_started: e.target.value || undefined,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Finished</label>
              <Input
                type="date"
                value={
                  progressForm.date_finished
                    ? new Date(progressForm.date_finished).toISOString().split('T')[0]
                    : ''
                }
                onChange={(e) =>
                  setProgressForm({
                    ...progressForm,
                    date_finished: e.target.value || undefined,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Review / Notes</label>
              <Textarea
                value={progressForm.review || ''}
                onChange={(e) => setProgressForm({ ...progressForm, review: e.target.value })}
                placeholder="Write your thoughts about this book..."
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setProgressOpen(false)}>
                Cancel
              </Button>
              <Button className="bg-reading hover:bg-reading/90" onClick={handleUpdateProgress}>
                <Save className="mr-2 h-4 w-4" />
                Save Progress
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </ReadingLayout>
  );
}
