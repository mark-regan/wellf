import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ReadingLayout } from './Reading';
import {
  BookOpen,
  Plus,
  BookMarked,
  CheckCircle2,
  ListTodo,
  MoreVertical,
  Trash2,
  Edit2,
  MoveRight,
  Star,
} from 'lucide-react';
import { readingApi } from '@/api/reading';
import { ReadingList, ReadingListBook } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export function ReadingLists() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [lists, setLists] = useState<ReadingList[]>([]);
  const [selectedList, setSelectedList] = useState<ReadingList | null>(null);
  const [listBooks, setListBooks] = useState<ReadingListBook[]>([]);
  const [loading, setLoading] = useState(true);

  // Create list dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [creating, setCreating] = useState(false);

  // Move book dialog
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [movingBook, setMovingBook] = useState<ReadingListBook | null>(null);

  const loadLists = async () => {
    try {
      const data = await readingApi.listReadingLists();
      setLists(data);
      return data;
    } catch (error) {
      console.error('Failed to load lists:', error);
      return [];
    }
  };

  const loadListBooks = async (listId: string) => {
    try {
      const books = await readingApi.getListBooks(listId);
      setListBooks(books);
    } catch (error) {
      console.error('Failed to load list books:', error);
      setListBooks([]);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const listsData = await loadLists();

      if (id) {
        const list = listsData.find((l) => l.id === id);
        if (list) {
          setSelectedList(list);
          await loadListBooks(id);
        }
      }
      setLoading(false);
    };
    init();
  }, [id]);

  const handleSelectList = async (list: ReadingList) => {
    setSelectedList(list);
    navigate(`/reading/lists/${list.id}`);
    await loadListBooks(list.id);
  };

  const handleCreateList = async () => {
    if (!newListName.trim()) return;

    setCreating(true);
    try {
      await readingApi.createReadingList({
        name: newListName,
        description: newListDescription,
      });
      setShowCreateDialog(false);
      setNewListName('');
      setNewListDescription('');
      await loadLists();
    } catch (error) {
      console.error('Failed to create list:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteList = async (listId: string) => {
    if (!confirm('Are you sure you want to delete this list?')) return;

    try {
      await readingApi.deleteReadingList(listId);
      if (selectedList?.id === listId) {
        setSelectedList(null);
        setListBooks([]);
        navigate('/reading/lists');
      }
      await loadLists();
    } catch (error) {
      console.error('Failed to delete list:', error);
    }
  };

  const handleRemoveBook = async (bookId: string) => {
    if (!selectedList) return;
    if (!confirm('Remove this book from the list?')) return;

    try {
      await readingApi.removeBookFromList(selectedList.id, bookId);
      await loadListBooks(selectedList.id);
      await loadLists();
    } catch (error) {
      console.error('Failed to remove book:', error);
    }
  };

  const handleMoveBook = async (toListId: string) => {
    if (!selectedList || !movingBook) return;

    try {
      await readingApi.moveBook(selectedList.id, toListId, movingBook.book_id);
      setShowMoveDialog(false);
      setMovingBook(null);
      await loadListBooks(selectedList.id);
      await loadLists();
    } catch (error) {
      console.error('Failed to move book:', error);
    }
  };

  const getListIcon = (listType: string, className = 'h-5 w-5') => {
    switch (listType) {
      case 'to_read':
        return <BookOpen className={className} />;
      case 'reading':
        return <BookMarked className={className} />;
      case 'read':
        return <CheckCircle2 className={className} />;
      default:
        return <ListTodo className={className} />;
    }
  };

  return (
    <ReadingLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Reading Lists</h1>
            <p className="text-muted-foreground">Organize your books into lists</p>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-reading hover:bg-reading/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            New List
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Lists Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Lists</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {loading ? (
                  <div className="text-center py-4 text-muted-foreground">Loading...</div>
                ) : lists.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No lists found
                  </div>
                ) : (
                  lists.map((list) => (
                    <button
                      key={list.id}
                      onClick={() => handleSelectList(list)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                        selectedList?.id === list.id
                          ? 'bg-reading/10 border-reading border'
                          : 'hover:bg-muted border border-transparent'
                      }`}
                    >
                      <div
                        className={`p-2 rounded-full ${
                          selectedList?.id === list.id
                            ? 'bg-reading/20 text-reading'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {getListIcon(list.list_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{list.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {list.book_count} {list.book_count === 1 ? 'book' : 'books'}
                        </p>
                      </div>
                      {!list.is_default && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                handleDeleteList(list.id);
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </button>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* List Contents */}
          <div className="lg:col-span-2">
            {selectedList ? (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-reading/10 text-reading">
                      {getListIcon(selectedList.list_type, 'h-6 w-6')}
                    </div>
                    <div>
                      <CardTitle>{selectedList.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {selectedList.book_count}{' '}
                        {selectedList.book_count === 1 ? 'book' : 'books'}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {listBooks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <BookOpen className="h-16 w-16 text-muted-foreground/30 mb-4" />
                      <h3 className="text-lg font-medium mb-2">No books in this list</h3>
                      <p className="text-muted-foreground max-w-sm mb-4">
                        Add books to this list from your library or by searching.
                      </p>
                      <Button asChild className="bg-reading hover:bg-reading/90">
                        <Link to="/reading/search">
                          <Plus className="mr-2 h-4 w-4" />
                          Add Books
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {listBooks.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-4 p-3 rounded-lg border hover:border-reading/50 transition-colors"
                        >
                          <Link
                            to={`/reading/library/${item.book_id}`}
                            className="flex items-center gap-4 flex-1 min-w-0"
                          >
                            {item.book?.thumbnail_url ? (
                              <img
                                src={item.book.thumbnail_url}
                                alt={item.book.title}
                                className="w-12 h-16 rounded object-cover shadow-sm"
                              />
                            ) : (
                              <div className="w-12 h-16 rounded bg-muted flex items-center justify-center">
                                <BookOpen className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium truncate">{item.book?.title}</h4>
                              <p className="text-sm text-muted-foreground truncate">
                                {item.book?.authors?.join(', ')}
                              </p>
                              {selectedList.list_type === 'reading' &&
                                item.book?.page_count &&
                                item.current_page > 0 && (
                                  <div className="flex items-center gap-2 mt-1">
                                    <Progress
                                      value={item.progress_percent}
                                      className="h-1.5 flex-1 max-w-32"
                                    />
                                    <span className="text-xs text-muted-foreground">
                                      {item.progress_percent}%
                                    </span>
                                  </div>
                                )}
                              {selectedList.list_type === 'read' && item.rating && (
                                <div className="flex items-center gap-1 mt-1">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`h-3 w-3 ${
                                        i < item.rating!
                                          ? 'fill-reading text-reading'
                                          : 'text-muted-foreground'
                                      }`}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          </Link>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link to={`/reading/library/${item.book_id}`}>
                                  <Edit2 className="mr-2 h-4 w-4" />
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setMovingBook(item);
                                  setShowMoveDialog(true);
                                }}
                              >
                                <MoveRight className="mr-2 h-4 w-4" />
                                Move to List
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleRemoveBook(item.book_id)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remove from List
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <ListTodo className="h-16 w-16 text-muted-foreground/30 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Select a list</h3>
                  <p className="text-muted-foreground max-w-sm">
                    Choose a reading list from the sidebar to view its books.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Create List Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New List</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                placeholder="My reading list"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description (optional)</label>
              <Textarea
                placeholder="A collection of books about..."
                value={newListDescription}
                onChange={(e) => setNewListDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateList}
              disabled={creating || !newListName.trim()}
              className="bg-reading hover:bg-reading/90"
            >
              {creating ? 'Creating...' : 'Create List'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Book Dialog */}
      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move to List</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Move "{movingBook?.book?.title}" to:
            </p>
            {lists
              .filter((l) => l.id !== selectedList?.id)
              .map((list) => (
                <button
                  key={list.id}
                  onClick={() => handleMoveBook(list.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border hover:border-reading hover:bg-reading/5 transition-colors text-left"
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
                </button>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </ReadingLayout>
  );
}
