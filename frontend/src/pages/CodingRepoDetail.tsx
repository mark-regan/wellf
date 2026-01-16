import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  ExternalLink,
  Star,
  GitFork,
  Eye,
  Lock,
  Archive,
  GitBranch,
  Clock,
  CheckCircle2,
  XCircle,
  Circle,
  Loader2,
  AlertCircle,
  PlayCircle,
  Activity,
} from 'lucide-react';
import { CodingLayout } from './Coding';
import { codingApi, getLanguageColor, CommitActivity, Workflow, WorkflowRun } from '@/api/coding';
import { GitHubRepo } from '@/types';

export function CodingRepoDetail() {
  const { owner, repo } = useParams<{ owner: string; repo: string }>();
  const [repoData, setRepoData] = useState<GitHubRepo | null>(null);
  const [commitActivity, setCommitActivity] = useState<CommitActivity[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [workflowRuns, setWorkflowRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    if (!owner || !repo) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const data = await codingApi.getRepo(owner, repo);
        setRepoData(data);
      } catch (error) {
        console.error('Failed to load repo:', error);
      } finally {
        setLoading(false);
      }
    };

    const loadActivity = async () => {
      setActivityLoading(true);
      try {
        const [activity, wfs, runs] = await Promise.all([
          codingApi.getRepoCommitActivity(owner, repo).catch(() => []),
          codingApi.getRepoWorkflows(owner, repo).catch(() => []),
          codingApi.getRepoWorkflowRuns(owner, repo, 10).catch(() => []),
        ]);
        setCommitActivity(activity);
        setWorkflows(wfs);
        setWorkflowRuns(runs);
      } catch (error) {
        console.error('Failed to load activity:', error);
      } finally {
        setActivityLoading(false);
      }
    };

    loadData();
    loadActivity();
  }, [owner, repo]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Unknown';
    return new Date(dateStr).toLocaleDateString();
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getRunStatusIcon = (run: WorkflowRun) => {
    if (run.status === 'in_progress') {
      return <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />;
    }
    if (run.status === 'queued') {
      return <Circle className="h-4 w-4 text-gray-400" />;
    }
    switch (run.conclusion) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failure':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled':
        return <Circle className="h-4 w-4 text-gray-400" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getRunStatusBadge = (run: WorkflowRun) => {
    if (run.status === 'in_progress') {
      return <Badge className="bg-yellow-100 text-yellow-700">In Progress</Badge>;
    }
    if (run.status === 'queued') {
      return <Badge variant="secondary">Queued</Badge>;
    }
    switch (run.conclusion) {
      case 'success':
        return <Badge className="bg-green-100 text-green-700">Success</Badge>;
      case 'failure':
        return <Badge className="bg-red-100 text-red-700">Failed</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{run.conclusion || 'Unknown'}</Badge>;
    }
  };

  // Calculate commit activity stats
  const totalCommits = commitActivity.reduce((sum, week) => sum + week.total, 0);
  const last4WeeksCommits = commitActivity.slice(-4).reduce((sum, week) => sum + week.total, 0);

  if (loading) {
    return (
      <CodingLayout>
        <div className="text-center py-12 text-muted-foreground">Loading repository...</div>
      </CodingLayout>
    );
  }

  if (!repoData) {
    return (
      <CodingLayout>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <h3 className="text-lg font-medium mb-2">Repository not found</h3>
            <Button asChild variant="outline">
              <Link to="/code/repos">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Repositories
              </Link>
            </Button>
          </CardContent>
        </Card>
      </CodingLayout>
    );
  }

  return (
    <CodingLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/code/repos">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-2xl font-bold">{repoData.full_name}</h1>
                {repoData.is_private && (
                  <Badge variant="outline" className="gap-1">
                    <Lock className="h-3 w-3" />
                    Private
                  </Badge>
                )}
                {repoData.is_archived && (
                  <Badge variant="secondary" className="gap-1">
                    <Archive className="h-3 w-3" />
                    Archived
                  </Badge>
                )}
              </div>
              {repoData.description && (
                <p className="text-muted-foreground mt-1">{repoData.description}</p>
              )}
            </div>
          </div>
          <Button asChild>
            <a href={repoData.html_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Open on GitHub
            </a>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Star className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Stars</p>
                  <p className="text-xl font-bold">{repoData.stargazers_count}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <GitFork className="h-5 w-5 text-coding" />
                <div>
                  <p className="text-sm text-muted-foreground">Forks</p>
                  <p className="text-xl font-bold">{repoData.forks_count}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Eye className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Open Issues</p>
                  <p className="text-xl font-bold">{repoData.open_issues_count}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <GitBranch className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Default Branch</p>
                  <p className="text-xl font-bold">{repoData.default_branch}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info and Topics */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Repository Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {repoData.language && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Primary Language</span>
                  <span className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getLanguageColor(repoData.language) }}
                    />
                    {repoData.language}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{formatDate(repoData.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Push</span>
                <span>{formatDate(repoData.pushed_at)}</span>
              </div>
            </CardContent>
          </Card>

          {repoData.topics && repoData.topics.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Topics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {repoData.topics.map((topic) => (
                    <Badge key={topic} variant="secondary">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Commit Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Commit Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading activity...</div>
            ) : commitActivity.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No commit activity available
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex gap-8 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total commits (52 weeks): </span>
                    <span className="font-medium">{totalCommits}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Last 4 weeks: </span>
                    <span className="font-medium">{last4WeeksCommits}</span>
                  </div>
                </div>

                {/* Commit Graph */}
                <div className="overflow-x-auto">
                  <div className="flex gap-1 min-w-max">
                    {commitActivity.slice(-26).map((week, i) => (
                      <div key={i} className="flex flex-col gap-1">
                        {week.days.map((count, d) => (
                          <div
                            key={d}
                            className="w-3 h-3 rounded-sm"
                            style={{
                              backgroundColor:
                                count === 0
                                  ? 'var(--muted)'
                                  : count < 3
                                  ? 'hsl(var(--coding) / 0.3)'
                                  : count < 6
                                  ? 'hsl(var(--coding) / 0.6)'
                                  : 'hsl(var(--coding))',
                            }}
                            title={`${count} commits`}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Less</span>
                  <div className="flex gap-1">
                    <div className="w-3 h-3 rounded-sm bg-muted" />
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(var(--coding) / 0.3)' }} />
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(var(--coding) / 0.6)' }} />
                    <div className="w-3 h-3 rounded-sm bg-coding" />
                  </div>
                  <span>More</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* GitHub Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5" />
              GitHub Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading workflows...</div>
            ) : workflows.length === 0 && workflowRuns.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No GitHub Actions workflows configured
              </div>
            ) : (
              <div className="space-y-6">
                {/* Workflows */}
                {workflows.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-3">Workflows ({workflows.length})</h4>
                    <div className="flex flex-wrap gap-2">
                      {workflows.map((wf) => (
                        <Badge
                          key={wf.id}
                          variant={wf.state === 'active' ? 'default' : 'secondary'}
                          className="gap-1"
                        >
                          {wf.state === 'active' ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <Circle className="h-3 w-3" />
                          )}
                          {wf.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Runs */}
                {workflowRuns.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-3">Recent Runs</h4>
                    <div className="space-y-2">
                      {workflowRuns.slice(0, 5).map((run) => (
                        <a
                          key={run.id}
                          href={run.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {getRunStatusIcon(run)}
                            <div>
                              <p className="font-medium text-sm">{run.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {run.head_branch} - {run.event} #{run.run_number}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {getRunStatusBadge(run)}
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatRelativeTime(run.created_at)}
                            </span>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </CodingLayout>
  );
}
