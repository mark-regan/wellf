import { useState, useEffect } from 'react';
import { Cloud, Check, AlertCircle, Loader2, Link, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';
import { paperlessApi } from '../api/paperless';
import type { PaperlessConfig } from '../types/paperless';

export function PaperlessConfigForm() {
  const [config, setConfig] = useState<PaperlessConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const cfg = await paperlessApi.getConfig();
      setConfig(cfg);
    } catch (err: any) {
      console.error('Failed to load config:', err);
      setError('Failed to load Paperless configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setError(null);
    setSuccess(null);
    setTesting(true);

    try {
      const result = await paperlessApi.testConnection();
      if (result.success) {
        setSuccess('Connection successful! Paperless is ready to use.');
      } else {
        setError(result.message || 'Connection test failed');
      }
    } catch (err: any) {
      console.error('Connection test failed:', err);
      setError(err.response?.data?.error || 'Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      {config?.is_configured ? (
        <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
            <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-green-800 dark:text-green-200">
              Paperless Connected
            </h4>
            <p className="text-sm text-green-600 dark:text-green-400">
              Your Paperless-ngx server is configured and ready to use
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full">
            <Cloud className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-amber-800 dark:text-amber-200">
              Not Configured
            </h4>
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Set PAPERLESS_URL and PAPERLESS_API_KEY environment variables to enable document linking
            </p>
          </div>
        </div>
      )}

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-600 dark:text-green-400">
          <Check className="h-4 w-4" />
          <span className="text-sm">{success}</span>
        </div>
      )}

      {/* Configuration Details */}
      {config?.is_configured && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Paperless URL
            </label>
            <div className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-muted/50">
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{config.paperless_url}</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">
              API Token
            </label>
            <div className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-muted/50">
              <span className="text-sm text-muted-foreground">Configured via environment variable</span>
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleTestConnection}
              disabled={testing}
            >
              {testing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Link className="h-4 w-4 mr-2" />
                  Test Connection
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="pt-4 border-t">
        <h4 className="text-sm font-medium mb-2">Configuration</h4>
        <p className="text-sm text-muted-foreground mb-3">
          Paperless-ngx integration is configured via environment variables in your deployment.
          Set the following variables:
        </p>
        <div className="bg-muted/50 p-3 rounded-lg space-y-1 font-mono text-xs">
          <div>PAPERLESS_URL=https://paperless.example.com</div>
          <div>PAPERLESS_API_KEY=your-api-token</div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Generate a token in Paperless: Settings &rarr; Users &rarr; Your User &rarr; Auth Tokens
        </p>
      </div>

      {/* About */}
      <div className="pt-4 border-t">
        <h4 className="text-sm font-medium mb-2">About Paperless-ngx</h4>
        <p className="text-sm text-muted-foreground">
          Paperless-ngx is a self-hosted document management system that transforms your
          physical documents into a searchable online archive. By connecting your Paperless
          instance, you can link documents to people, properties, vehicles, and insurance
          policies in Wellf.
        </p>
      </div>
    </div>
  );
}
