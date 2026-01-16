import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HubLayout } from '@/components/layout/HubLayout';
import { Badge } from '@/components/ui/badge';
import {
  Code,
  LayoutDashboard,
  List,
  FileCode,
  FolderGit2,
  Plus,
  Star,
  GitBranch,
  RefreshCw,
  Settings,
  ExternalLink,
  Copy,
  Github,
} from 'lucide-react';
import { codingApi, SNIPPET_LANGUAGES, getLanguageColor } from '@/api/coding';
import { CodingSummary, CodeSnippet, GitHubRepo } from '@/types';

const codingNavItems = [
  { label: 'Overview', href: '/code', icon: LayoutDashboard },
  { label: 'Snippets', href: '/code/snippets', icon: FileCode },
  { label: 'Repos', href: '/code/repos', icon: FolderGit2 },
  { label: 'Templates', href: '/code/templates', icon: List },
  { label: 'Settings', href: '/code/settings', icon: Settings },
];

const CodingLayout = ({ children }: { children: React.ReactNode }) => (
  <HubLayout
    title="Code"
    description="Manage GitHub repos, snippets & templates"
    icon={Code}
    color="coding"
    navItems={codingNavItems}
  >
    {children}
  </HubLayout>
);

export function Coding() {
  const [summary, setSummary] = useState<CodingSummary | null>(null);
  const [recentSnippets, setRecentSnippets] = useState<CodeSnippet[]>([]);
  const [recentRepos, setRecentRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const loadData = async () => {
    try {
      const [summaryData, snippetsData, reposData] = await Promise.all([
        codingApi.getSummary(),
        codingApi.listSnippets({ limit: 5 }),
        codingApi.listRepos({ limit: 5 }),
      ]);
      setSummary(summaryData);
      setRecentSnippets(snippetsData);
      setRecentRepos(reposData);
    } catch (error) {
      console.error('Failed to load coding data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSyncRepos = async () => {
    setSyncing(true);
    try {
      await codingApi.syncRepos();
      await loadData();
    } catch (error) {
      console.error('Failed to sync repos:', error);
    } finally {
      setSyncing(false);
    }
  };

  const handleCopySnippet = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
    } catch (error) {
      console.error('Failed to copy snippet:', error);
    }
  };

  const getLanguageLabel = (lang: string) => {
    return SNIPPET_LANGUAGES.find((l) => l.value === lang)?.label ?? lang;
  };

  return (
    <CodingLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Code</h1>
            <p className="text-muted-foreground">Manage GitHub repos, snippets & templates</p>
          </div>
          <div className="flex gap-2">
            {summary?.github_connected && (
              <Button
                variant="outline"
                onClick={handleSyncRepos}
                disabled={syncing}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                Sync Repos
              </Button>
            )}
            <Button asChild className="bg-coding hover:bg-coding/90">
              <Link to="/code/snippets/new">
                <Plus className="mr-2 h-4 w-4" />
                Add Snippet
              </Link>
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <FileCode className="h-4 w-4" />
                Snippets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '--' : summary?.total_snippets ?? 0}</div>
              <p className="text-xs text-muted-foreground">Code snippets saved</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Star className="h-4 w-4" />
                Favourites
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '--' : summary?.favourite_snippets ?? 0}</div>
              <p className="text-xs text-muted-foreground">Favourite snippets</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <FolderGit2 className="h-4 w-4" />
                Repositories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '--' : summary?.total_repos ?? 0}</div>
              <p className="text-xs text-muted-foreground">GitHub repos synced</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <List className="h-4 w-4" />
                Templates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '--' : summary?.total_templates ?? 0}</div>
              <p className="text-xs text-muted-foreground">Project templates</p>
            </CardContent>
          </Card>
        </div>

        {/* GitHub Connection Notice */}
        {!loading && !summary?.github_connected && (
          <Card className="border-coding/50 bg-coding/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-coding/10">
                  <Github className="h-6 w-6 text-coding" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">Connect GitHub</h3>
                  <p className="text-sm text-muted-foreground">
                    Connect your GitHub account to sync repositories and access your code from anywhere.
                  </p>
                </div>
                <Button asChild>
                  <Link to="/code/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Configure
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Snippets */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileCode className="h-5 w-5 text-coding" />
                Recent Snippets
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/code/snippets">View all</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : recentSnippets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FileCode className="h-12 w-12 text-coding/30 mb-4" />
                  <h3 className="font-medium mb-2">No snippets yet</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Save code snippets for quick access and reuse across projects.
                  </p>
                  <Button asChild className="mt-4" size="sm">
                    <Link to="/code/snippets/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Snippet
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentSnippets.map((snippet) => (
                    <div
                      key={snippet.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                    >
                      <Link to={`/code/snippets/${snippet.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                        <div
                          className="w-2 h-8 rounded-full"
                          style={{ backgroundColor: getLanguageColor(snippet.language) }}
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{snippet.title}</h4>
                          <p className="text-xs text-muted-foreground flex items-center gap-2">
                            <span>{getLanguageLabel(snippet.language)}</span>
                            {snippet.is_favourite && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                          </p>
                        </div>
                      </Link>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="shrink-0"
                        onClick={() => handleCopySnippet(snippet.code)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Repos */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FolderGit2 className="h-5 w-5 text-coding" />
                Recent Repositories
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/code/repos">View all</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : recentRepos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FolderGit2 className="h-12 w-12 text-coding/30 mb-4" />
                  <h3 className="font-medium mb-2">No repos synced</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    {summary?.github_connected
                      ? 'Sync your GitHub repos to see them here.'
                      : 'Connect GitHub to sync your repositories.'}
                  </p>
                  {summary?.github_connected ? (
                    <Button className="mt-4" size="sm" onClick={handleSyncRepos} disabled={syncing}>
                      <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                      Sync Now
                    </Button>
                  ) : (
                    <Button asChild className="mt-4" size="sm">
                      <Link to="/code/settings">
                        <Github className="mr-2 h-4 w-4" />
                        Connect GitHub
                      </Link>
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {recentRepos.map((repo) => (
                    <div
                      key={repo.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div
                          className="w-2 h-8 rounded-full"
                          style={{ backgroundColor: getLanguageColor(repo.language || 'other') }}
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{repo.name}</h4>
                          <p className="text-xs text-muted-foreground flex items-center gap-2">
                            <span>{repo.language || 'Unknown'}</span>
                            {repo.is_private && <Badge variant="outline" className="text-xs py-0">Private</Badge>}
                            <span className="flex items-center gap-1">
                              <Star className="h-3 w-3" /> {repo.stargazers_count}
                            </span>
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="shrink-0"
                        asChild
                      >
                        <a href={repo.html_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Language Distribution */}
        {summary?.repos_by_language && summary.repos_by_language.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-coding" />
                Languages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {summary.repos_by_language.map((item) => (
                  <Badge
                    key={item.language}
                    variant="outline"
                    className="text-sm py-1 px-3"
                    style={{ borderColor: getLanguageColor(item.language) }}
                  >
                    <div
                      className="w-2 h-2 rounded-full mr-2"
                      style={{ backgroundColor: getLanguageColor(item.language) }}
                    />
                    {item.language} ({item.count})
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <Link
                to="/code/snippets/new"
                className="flex items-center gap-4 p-4 rounded-lg border hover:border-coding hover:bg-coding/5 transition-colors"
              >
                <div className="p-3 rounded-full bg-coding/10">
                  <Plus className="h-6 w-6 text-coding" />
                </div>
                <div>
                  <h4 className="font-medium">New Snippet</h4>
                  <p className="text-sm text-muted-foreground">Save a code snippet</p>
                </div>
              </Link>
              <Link
                to="/code/repos"
                className="flex items-center gap-4 p-4 rounded-lg border hover:border-coding hover:bg-coding/5 transition-colors"
              >
                <div className="p-3 rounded-full bg-coding/10">
                  <FolderGit2 className="h-6 w-6 text-coding" />
                </div>
                <div>
                  <h4 className="font-medium">Browse Repos</h4>
                  <p className="text-sm text-muted-foreground">View GitHub repos</p>
                </div>
              </Link>
              <Link
                to="/code/templates"
                className="flex items-center gap-4 p-4 rounded-lg border hover:border-coding hover:bg-coding/5 transition-colors"
              >
                <div className="p-3 rounded-full bg-coding/10">
                  <List className="h-6 w-6 text-coding" />
                </div>
                <div>
                  <h4 className="font-medium">Project Templates</h4>
                  <p className="text-sm text-muted-foreground">Manage templates</p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </CodingLayout>
  );
}

export { CodingLayout, codingNavItems };
