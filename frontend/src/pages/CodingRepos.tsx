import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  FolderGit2,
  Search,
  Star,
  GitFork,
  ExternalLink,
  RefreshCw,
  Github,
  Settings,
  Filter,
  Lock,
  Archive,
} from 'lucide-react';
import { CodingLayout } from './Coding';
import { codingApi, getLanguageColor } from '@/api/coding';
import { GitHubRepo } from '@/types';

export function CodingRepos() {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [languageFilter, setLanguageFilter] = useState<string>('');
  const [showArchived, setShowArchived] = useState(false);
  const [showForks, setShowForks] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [languages, setLanguages] = useState<string[]>([]);

  const loadRepos = async () => {
    setLoading(true);
    try {
      // Check if connected
      const config = await codingApi.getGitHubConfig();
      setIsConnected(!!config?.github_token);

      if (config?.github_token) {
        const data = await codingApi.listRepos({
          search: search || undefined,
          language: languageFilter || undefined,
          show_archived: showArchived,
          show_forks: showForks,
        });
        setRepos(data);

        // Extract unique languages
        const langs = [...new Set(data.map((r) => r.language).filter(Boolean))] as string[];
        setLanguages(langs.sort());
      }
    } catch (error) {
      console.error('Failed to load repos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRepos();
  }, [languageFilter, showArchived, showForks]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadRepos();
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await codingApi.syncRepos();
      await loadRepos();
    } catch (error) {
      console.error('Failed to sync:', error);
    } finally {
      setSyncing(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Unknown';
    return new Date(dateStr).toLocaleDateString();
  };

  if (!loading && !isConnected) {
    return (
      <CodingLayout>
        <div className="space-y-6">
          <div>
            <h1 className="font-display text-2xl font-bold">Repositories</h1>
            <p className="text-muted-foreground">Your GitHub repositories</p>
          </div>

          <Card className="border-coding/50 bg-coding/5">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Github className="h-16 w-16 text-coding/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">Connect GitHub</h3>
                <p className="text-muted-foreground max-w-md mb-6">
                  Connect your GitHub account to sync and browse your repositories. You'll need a
                  Personal Access Token with repo access.
                </p>
                <Button asChild className="bg-coding hover:bg-coding/90">
                  <Link to="/code/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Configure GitHub
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </CodingLayout>
    );
  }

  return (
    <CodingLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Repositories</h1>
            <p className="text-muted-foreground">
              {repos.length} repositories synced
            </p>
          </div>
          <Button
            onClick={handleSync}
            disabled={syncing}
            className="bg-coding hover:bg-coding/90"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Repos'}
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search repositories..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select value={languageFilter} onValueChange={setLanguageFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Languages</SelectItem>
                  {languages.map((lang) => (
                    <SelectItem key={lang} value={lang}>
                      {lang}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={showArchived}
                    onCheckedChange={(checked) => setShowArchived(checked as boolean)}
                  />
                  Archived
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={showForks}
                    onCheckedChange={(checked) => setShowForks(checked as boolean)}
                  />
                  Forks
                </label>
              </div>
              <Button type="submit">
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Repos List */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : repos.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FolderGit2 className="h-16 w-16 text-coding/30 mb-4" />
                <h3 className="text-lg font-medium mb-2">No repositories found</h3>
                <p className="text-muted-foreground max-w-sm mb-4">
                  {search || languageFilter
                    ? 'Try adjusting your filters.'
                    : 'Click "Sync Repos" to fetch your GitHub repositories.'}
                </p>
                <Button onClick={handleSync} disabled={syncing}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                  Sync Now
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {repos.map((repo) => (
              <Card key={repo.id} className="hover:border-coding/50 transition-colors">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div
                      className="w-3 h-12 rounded-full shrink-0 mt-1"
                      style={{ backgroundColor: getLanguageColor(repo.language || 'other') }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-medium text-lg truncate">{repo.name}</h3>
                            {repo.is_private && (
                              <Badge variant="outline" className="gap-1">
                                <Lock className="h-3 w-3" />
                                Private
                              </Badge>
                            )}
                            {repo.is_fork && (
                              <Badge variant="secondary" className="gap-1">
                                <GitFork className="h-3 w-3" />
                                Fork
                              </Badge>
                            )}
                            {repo.is_archived && (
                              <Badge variant="secondary" className="gap-1">
                                <Archive className="h-3 w-3" />
                                Archived
                              </Badge>
                            )}
                          </div>
                          {repo.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {repo.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground flex-wrap">
                            {repo.language && (
                              <span className="flex items-center gap-1">
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: getLanguageColor(repo.language) }}
                                />
                                {repo.language}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Star className="h-3 w-3" />
                              {repo.stargazers_count}
                            </span>
                            <span className="flex items-center gap-1">
                              <GitFork className="h-3 w-3" />
                              {repo.forks_count}
                            </span>
                            <span>Updated {formatDate(repo.pushed_at)}</span>
                          </div>
                          {repo.topics && repo.topics.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {repo.topics.slice(0, 5).map((topic) => (
                                <Badge key={topic} variant="outline" className="text-xs">
                                  {topic}
                                </Badge>
                              ))}
                              {repo.topics.length > 5 && (
                                <Badge variant="outline" className="text-xs">
                                  +{repo.topics.length - 5}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`/code/repos/${repo.full_name}`}>
                              View Details
                            </Link>
                          </Button>
                          <Button variant="outline" size="sm" asChild>
                            <a href={repo.html_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </CodingLayout>
  );
}
