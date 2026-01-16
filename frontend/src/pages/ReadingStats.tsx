import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ReadingLayout } from './Reading';
import {
  BookOpen,
  FileText,
  TrendingUp,
  Star,
  Calendar,
  Users,
  Tag,
  Trophy,
} from 'lucide-react';
import { readingApi } from '@/api/reading';
import { ReadingStats } from '@/types';

export function ReadingStatsPage() {
  const [stats, setStats] = useState<ReadingStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await readingApi.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load reading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const maxMonthlyCount = Math.max(...(stats?.books_read_by_month?.map((m) => m.count) || [1]));
  const maxGenreCount = Math.max(...(stats?.genre_breakdown?.map((g) => g.count) || [1]));
  const maxAuthorCount = Math.max(...(stats?.author_stats?.map((a) => a.count) || [1]));

  return (
    <ReadingLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Reading Statistics</h1>
          <p className="text-muted-foreground">Your reading journey in numbers</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading statistics...</div>
        ) : !stats ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <TrendingUp className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium mb-2">No statistics available</h3>
              <p className="text-muted-foreground max-w-sm">
                Start reading and marking books as finished to see your reading statistics here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Books Read
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-reading">
                    {formatNumber(stats.total_books_read)}
                  </div>
                  <p className="text-xs text-muted-foreground">Total books completed</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Pages Read
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-reading">
                    {formatNumber(stats.total_pages_read)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Avg {formatNumber(stats.average_page_count)} per book
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    Average Rating
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-reading">
                    {stats.average_rating.toFixed(1)}
                  </div>
                  <div className="flex gap-0.5 mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star <= Math.round(stats.average_rating)
                            ? 'fill-reading text-reading'
                            : 'text-muted-foreground/30'
                        }`}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Reading Pace
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-reading">
                    {stats.average_books_per_month.toFixed(1)}
                  </div>
                  <p className="text-xs text-muted-foreground">Books per month (avg)</p>
                </CardContent>
              </Card>
            </div>

            {/* Books by Year */}
            {stats.books_read_by_year && stats.books_read_by_year.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-reading" />
                    Books by Year
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.books_read_by_year.slice(0, 5).map((year) => (
                      <div key={year.year} className="flex items-center gap-4">
                        <span className="text-sm font-medium w-12">{year.year}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Progress
                              value={
                                (year.count /
                                  Math.max(...stats.books_read_by_year.map((y) => y.count))) *
                                100
                              }
                              className="h-4 flex-1"
                            />
                            <span className="text-sm font-medium w-20 text-right">
                              {year.count} {year.count === 1 ? 'book' : 'books'}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatNumber(year.pages)} pages
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Monthly Reading Chart */}
            {stats.books_read_by_month && stats.books_read_by_month.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-reading" />
                    Last 12 Months
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-2 h-40">
                    {stats.books_read_by_month.map((month) => (
                      <div
                        key={`${month.year}-${month.month}`}
                        className="flex-1 flex flex-col items-center"
                      >
                        <div
                          className="w-full bg-reading rounded-t transition-all"
                          style={{
                            height: `${Math.max(8, (month.count / maxMonthlyCount) * 120)}px`,
                          }}
                          title={`${month.count} ${month.count === 1 ? 'book' : 'books'}`}
                        />
                        <span className="text-xs text-muted-foreground mt-2">{month.label}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Genre and Authors */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Genre Breakdown */}
              {stats.genre_breakdown && stats.genre_breakdown.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Tag className="h-5 w-5 text-reading" />
                      Top Genres
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {stats.genre_breakdown.slice(0, 8).map((genre) => (
                        <div key={genre.genre} className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium truncate">{genre.genre}</span>
                              <span className="text-sm text-muted-foreground ml-2">
                                {genre.count}
                              </span>
                            </div>
                            <Progress
                              value={(genre.count / maxGenreCount) * 100}
                              className="h-2"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Top Authors */}
              {stats.author_stats && stats.author_stats.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-reading" />
                      Most Read Authors
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {stats.author_stats.slice(0, 8).map((author, i) => (
                        <div key={author.author} className="flex items-center gap-3">
                          <span className="w-6 text-sm font-medium text-muted-foreground">
                            {i + 1}.
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium truncate">{author.author}</span>
                              <span className="text-sm text-muted-foreground ml-2">
                                {author.count} {author.count === 1 ? 'book' : 'books'}
                              </span>
                            </div>
                            <Progress
                              value={(author.count / maxAuthorCount) * 100}
                              className="h-2"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Book Records */}
            {(stats.longest_book || stats.shortest_book) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-reading" />
                    Book Records
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    {stats.longest_book && (
                      <div className="p-4 rounded-lg border">
                        <p className="text-sm text-muted-foreground mb-2">Longest Book</p>
                        <h4 className="font-medium">{stats.longest_book.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {stats.longest_book.authors}
                        </p>
                        <p className="text-sm font-medium text-reading mt-2">
                          {formatNumber(stats.longest_book.page_count)} pages
                        </p>
                      </div>
                    )}
                    {stats.shortest_book && (
                      <div className="p-4 rounded-lg border">
                        <p className="text-sm text-muted-foreground mb-2">Shortest Book</p>
                        <h4 className="font-medium">{stats.shortest_book.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {stats.shortest_book.authors}
                        </p>
                        <p className="text-sm font-medium text-reading mt-2">
                          {formatNumber(stats.shortest_book.page_count)} pages
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </ReadingLayout>
  );
}
