import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Github,
  Check,
  ExternalLink,
  AlertTriangle,
  Loader2,
  Eye,
  EyeOff,
  Trash2,
} from 'lucide-react';
import { CodingLayout } from './Coding';
import { codingApi } from '@/api/coding';
import { GitHubConfig, UpdateGitHubConfigRequest } from '@/types';

export function CodingSettings() {
  const [config, setConfig] = useState<GitHubConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [showToken, setShowToken] = useState(false);

  const [formData, setFormData] = useState<UpdateGitHubConfigRequest>({
    github_username: '',
    github_token: '',
    default_visibility: 'private',
    show_archived: false,
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await codingApi.getGitHubConfig();
      setConfig(data);
      if (data) {
        setFormData({
          github_username: data.github_username ?? '',
          github_token: '', // Don't show existing token
          default_visibility: data.default_visibility ?? 'private',
          show_archived: data.show_archived ?? false,
        });
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setTestResult(null);
    try {
      // Only send token if it was changed
      const dataToSave = { ...formData };
      if (!dataToSave.github_token) {
        delete dataToSave.github_token;
      }

      await codingApi.updateGitHubConfig(dataToSave);
      await loadConfig();
      setTestResult({ success: true, message: 'Settings saved successfully!' });
    } catch (error) {
      console.error('Failed to save config:', error);
      setTestResult({ success: false, message: 'Failed to save settings.' });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await codingApi.testGitHubConnection();
      if (result.connected) {
        setTestResult({
          success: true,
          message: `Connected as ${result.username}`,
        });
      } else {
        setTestResult({
          success: false,
          message: result.error || 'Connection failed',
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Failed to test connection.',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to disconnect GitHub? This will delete your synced repositories.')) {
      return;
    }

    try {
      await codingApi.deleteGitHubConfig();
      setConfig(null);
      setFormData({
        github_username: '',
        github_token: '',
        default_visibility: 'private',
        show_archived: false,
      });
      setTestResult({ success: true, message: 'GitHub disconnected successfully.' });
    } catch (error) {
      console.error('Failed to delete config:', error);
      setTestResult({ success: false, message: 'Failed to disconnect GitHub.' });
    }
  };

  if (loading) {
    return (
      <CodingLayout>
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      </CodingLayout>
    );
  }

  return (
    <CodingLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="font-display text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Configure your coding module settings</p>
        </div>

        {/* GitHub Connection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Github className="h-5 w-5" />
              GitHub Connection
            </CardTitle>
            <CardDescription>
              Connect your GitHub account to sync and manage repositories.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {testResult && (
              <Alert variant={testResult.success ? 'default' : 'destructive'}>
                {testResult.success ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                <AlertDescription>{testResult.message}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">GitHub Username</Label>
              <Input
                id="username"
                value={formData.github_username}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, github_username: e.target.value }))
                }
                placeholder="your-username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="token">Personal Access Token</Label>
              <div className="relative">
                <Input
                  id="token"
                  type={showToken ? 'text' : 'password'}
                  value={formData.github_token}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, github_token: e.target.value }))
                  }
                  placeholder={config?.github_token ? '••••••••••••••••' : 'ghp_xxxxxxxxxxxxx'}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowToken(!showToken)}
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Create a{' '}
                <a
                  href="https://github.com/settings/tokens/new?scopes=repo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-coding hover:underline"
                >
                  Personal Access Token
                  <ExternalLink className="inline ml-1 h-3 w-3" />
                </a>{' '}
                with <code className="bg-muted px-1 rounded">repo</code> scope.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Default Visibility</Label>
                <p className="text-xs text-muted-foreground">
                  Filter repos by visibility when syncing
                </p>
              </div>
              <Select
                value={formData.default_visibility}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    default_visibility: value as 'public' | 'private',
                  }))
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Show Archived</Label>
                <p className="text-xs text-muted-foreground">
                  Include archived repositories
                </p>
              </div>
              <Switch
                checked={formData.show_archived}
                onCheckedChange={(checked: boolean) =>
                  setFormData((prev) => ({ ...prev, show_archived: checked }))
                }
              />
            </div>

            <div className="flex items-center gap-2 pt-4 border-t">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-coding hover:bg-coding/90"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Settings'
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleTest}
                disabled={testing || !config?.github_token}
              >
                {testing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Test Connection
                  </>
                )}
              </Button>
              {config?.github_token && (
                <Button variant="destructive" onClick={handleDelete}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Disconnect
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Help */}
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div>
              <h4 className="font-medium text-foreground mb-1">1. Create a Personal Access Token</h4>
              <p>
                Go to{' '}
                <a
                  href="https://github.com/settings/tokens/new?scopes=repo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-coding hover:underline"
                >
                  GitHub Settings → Developer settings → Personal access tokens
                </a>{' '}
                and create a new token with the <code className="bg-muted px-1 rounded">repo</code>{' '}
                scope.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-1">2. Enter your credentials</h4>
              <p>
                Enter your GitHub username and the personal access token above, then click "Save
                Settings".
              </p>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-1">3. Sync your repositories</h4>
              <p>
                Once connected, go to the{' '}
                <Link to="/code/repos" className="text-coding hover:underline">
                  Repositories
                </Link>{' '}
                page and click "Sync Repos" to fetch your GitHub repositories.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </CodingLayout>
  );
}
