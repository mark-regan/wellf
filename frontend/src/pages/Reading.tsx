import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HubLayout } from '@/components/layout/HubLayout';
import { Progress } from '@/components/ui/progress';
import {
  BookOpen,
  LayoutDashboard,
  Library,
  Search,
  ListTodo,
  Target,
  Plus,
  BookMarked,
  CheckCircle2,
  Star,
  BarChart2,
} from 'lucide-react';
import { readingApi } from '@/api/reading';
import { ReadingSummary, ReadingListBook, ReadingList } from '@/types';

const readingNavItems = [
  { label: 'Overview', href: '/reading', icon: LayoutDashboard },
  { label: 'Library', href: '/reading/library', icon: Library },
  { label: 'Search', href: '/reading/search', icon: Search },
  { label: 'Lists', href: '/reading/lists', icon: ListTodo },
  { label: 'Stats', href: '/reading/stats', icon: BarChart2 },
];

const ReadingLayout = ({ children }: { children: React.ReactNode }) => (
  <HubLayout
    title="Reading"
    description="Track your books, reading lists & goals"
    icon={BookOpen}
    color="reading"
    navItems={readingNavItems}
  >
    {children}
  </HubLayout>
);

export function Reading() {
  const [summary, setSummary] = useState<ReadingSummary | null>(null);
  const [currentlyReading, setCurrentlyReading] = useState<ReadingListBook[]>([]);
  const [readingLists, setReadingLists] = useState<ReadingList[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [summaryData, listsData] = await Promise.all([
        readingApi.getSummary(),
        readingApi.listReadingLists(),
      ]);
      setSummary(summaryData);
      setReadingLists(listsData);

      // Get currently reading books from the reading list
      const readingList = listsData.find((l) => l.list_type === 'reading');
      if (readingList) {
        const books = await readingApi.getListBooks(readingList.id);
        setCurrentlyReading(books.slice(0, 5));
      }
    } catch (error) {
      console.error('Failed to load reading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const goalProgress = summary?.yearly_goal
    ? Math.round(((summary.yearly_goal.books_read || 0) / summary.yearly_goal.target_books) * 100)
    : 0;

  return (
    <ReadingLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Reading</h1>
            <p className="text-muted-foreground">Track your books, reading lists & goals</p>
          </div>
          <Button asChild className="bg-reading hover:bg-reading/90">
            <Link to="/reading/search">
              <Plus className="mr-2 h-4 w-4" />
              Add Book
            </Link>
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Library className="h-4 w-4" />
                Total Books
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '--' : summary?.total_books ?? 0}</div>
              <p className="text-xs text-muted-foreground">In your library</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <BookMarked className="h-4 w-4" />
                Currently Reading
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '--' : summary?.currently_reading ?? 0}</div>
              <p className="text-xs text-muted-foreground">Books in progress</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Read This Year
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '--' : summary?.books_this_year ?? 0}</div>
              <p className="text-xs text-muted-foreground">Books completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Target className="h-4 w-4" />
                Yearly Goal
              </CardTitle>
            </CardHeader>
            <CardContent>
              {summary?.yearly_goal ? (
                <>
                  <div className="text-2xl font-bold">
                    {summary.yearly_goal.books_read || 0}/{summary.yearly_goal.target_books}
                  </div>
                  <Progress value={goalProgress} className="h-2 mt-2" />
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold">--</div>
                  <p className="text-xs text-muted-foreground">No goal set</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Currently Reading */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BookMarked className="h-5 w-5 text-reading" />
                Currently Reading
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/reading/lists">View all</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : currentlyReading.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <h3 className="font-medium mb-2">No books in progress</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mb-4">
                    Start reading a book to track your progress here.
                  </p>
                  <Button asChild className="bg-reading hover:bg-reading/90">
                    <Link to="/reading/search">
                      <Search className="mr-2 h-4 w-4" />
                      Find a Book
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {currentlyReading.map((item) => (
                    <Link
                      key={item.id}
                      to={`/reading/library/${item.book_id}`}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                    >
                      {item.book?.thumbnail_url ? (
                        <img
                          src={item.book.thumbnail_url}
                          alt={item.book.title}
                          className="w-10 h-14 rounded object-cover shadow-sm"
                        />
                      ) : (
                        <div className="w-10 h-14 rounded bg-muted flex items-center justify-center">
                          <BookOpen className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{item.book?.title}</h4>
                        <p className="text-xs text-muted-foreground truncate">
                          {item.book?.authors?.join(', ')}
                        </p>
                        {item.book?.page_count && item.current_page > 0 && (
                          <div className="flex items-center gap-2 mt-1">
                            <Progress
                              value={item.progress_percent}
                              className="h-1.5 flex-1"
                            />
                            <span className="text-xs text-muted-foreground">
                              {item.progress_percent}%
                            </span>
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recently Finished */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-reading" />
                Recently Finished
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/reading/lists">View all</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : !summary?.recently_finished?.length ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle2 className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <h3 className="font-medium mb-2">No books finished yet</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Finished books will appear here with your ratings and reviews.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {summary.recently_finished.slice(0, 4).map((item) => (
                    <Link
                      key={item.id}
                      to={`/reading/library/${item.book_id}`}
                      className="group p-3 rounded-lg border hover:border-reading transition-colors"
                    >
                      {item.book?.thumbnail_url ? (
                        <img
                          src={item.book.thumbnail_url}
                          alt={item.book.title}
                          className="w-full h-28 rounded object-cover mb-2 shadow-sm"
                        />
                      ) : (
                        <div className="w-full h-28 rounded bg-muted flex items-center justify-center mb-2">
                          <BookOpen className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <h4 className="font-medium text-sm truncate group-hover:text-reading transition-colors">
                        {item.book?.title}
                      </h4>
                      {item.rating && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Star className="h-3 w-3 fill-reading text-reading" />
                          {item.rating}/5
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Reading Lists */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ListTodo className="h-5 w-5 text-reading" />
              Reading Lists
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/reading/lists">Manage lists</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : readingLists.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No reading lists found
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                {readingLists.slice(0, 3).map((list) => (
                  <Link
                    key={list.id}
                    to={`/reading/lists/${list.id}`}
                    className="flex items-center gap-4 p-4 rounded-lg border hover:border-reading hover:bg-reading/5 transition-colors"
                  >
                    <div className="p-3 rounded-full bg-reading/10">
                      {list.list_type === 'to_read' && <BookOpen className="h-6 w-6 text-reading" />}
                      {list.list_type === 'reading' && <BookMarked className="h-6 w-6 text-reading" />}
                      {list.list_type === 'read' && <CheckCircle2 className="h-6 w-6 text-reading" />}
                      {list.list_type === 'custom' && <ListTodo className="h-6 w-6 text-reading" />}
                    </div>
                    <div>
                      <h4 className="font-medium">{list.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {list.book_count} {list.book_count === 1 ? 'book' : 'books'}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <Link
                to="/reading/search"
                className="flex items-center gap-4 p-4 rounded-lg border hover:border-reading hover:bg-reading/5 transition-colors"
              >
                <div className="p-3 rounded-full bg-reading/10">
                  <Search className="h-6 w-6 text-reading" />
                </div>
                <div>
                  <h4 className="font-medium">Find a Book</h4>
                  <p className="text-sm text-muted-foreground">Search for books to add</p>
                </div>
              </Link>
              <Link
                to="/reading/library"
                className="flex items-center gap-4 p-4 rounded-lg border hover:border-reading hover:bg-reading/5 transition-colors"
              >
                <div className="p-3 rounded-full bg-reading/10">
                  <Library className="h-6 w-6 text-reading" />
                </div>
                <div>
                  <h4 className="font-medium">Browse Library</h4>
                  <p className="text-sm text-muted-foreground">View all your books</p>
                </div>
              </Link>
              <Link
                to="/reading/lists"
                className="flex items-center gap-4 p-4 rounded-lg border hover:border-reading hover:bg-reading/5 transition-colors"
              >
                <div className="p-3 rounded-full bg-reading/10">
                  <Target className="h-6 w-6 text-reading" />
                </div>
                <div>
                  <h4 className="font-medium">Set Reading Goal</h4>
                  <p className="text-sm text-muted-foreground">Track your yearly progress</p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </ReadingLayout>
  );
}

export { ReadingLayout, readingNavItems };
