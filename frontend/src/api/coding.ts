import api from './client';
import {
  GitHubConfig,
  CodeSnippet,
  ProjectTemplate,
  GitHubRepo,
  CodingSummary,
  UpdateGitHubConfigRequest,
  CreateSnippetRequest,
  UpdateSnippetRequest,
  CreateTemplateRequest,
  UpdateTemplateRequest,
} from '@/types';

// =============================================================================
// GitHub Activity Types
// =============================================================================

export interface CommitActivity {
  days: number[];  // Sun-Sat commit counts
  total: number;   // Total commits for the week
  week: number;    // Unix timestamp for start of week
}

export interface Workflow {
  id: number;
  name: string;
  path: string;
  state: string;
  html_url: string;
  badge_url: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowRun {
  id: number;
  name: string;
  head_branch: string;
  head_sha: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: 'success' | 'failure' | 'cancelled' | 'skipped' | 'neutral' | 'timed_out' | 'action_required' | null;
  workflow_id: number;
  html_url: string;
  event: string;
  created_at: string;
  updated_at: string;
  run_started_at: string;
  actor: {
    login: string;
    avatar_url: string;
  };
  triggering_actor: {
    login: string;
    avatar_url: string;
  };
  run_number: number;
  run_attempt: number;
}

// Snippet filters
interface SnippetFilters {
  language?: string;
  category?: string;
  tag?: string;
  favourite?: boolean;
  search?: string;
  limit?: number;
}

// Template filters
interface TemplateFilters {
  template_type?: string;
  language?: string;
  search?: string;
  limit?: number;
}

// Repo filters
interface RepoFilters {
  language?: string;
  search?: string;
  show_archived?: boolean;
  show_forks?: boolean;
  limit?: number;
}

export const codingApi = {
  // =============================================================================
  // GitHub Config
  // =============================================================================

  getGitHubConfig: async (): Promise<GitHubConfig | null> => {
    try {
      const response = await api.get<GitHubConfig>('/coding/github/config');
      return response.data;
    } catch {
      return null;
    }
  },

  updateGitHubConfig: async (data: UpdateGitHubConfigRequest): Promise<GitHubConfig> => {
    const response = await api.put<GitHubConfig>('/coding/github/config', data);
    return response.data;
  },

  testGitHubConnection: async (): Promise<{ connected: boolean; username?: string; error?: string }> => {
    const response = await api.post<{ connected: boolean; username?: string; error?: string }>('/coding/github/config/test');
    return response.data;
  },

  deleteGitHubConfig: async (): Promise<void> => {
    await api.delete('/coding/github/config');
  },

  // =============================================================================
  // GitHub Repos
  // =============================================================================

  listRepos: async (filters?: RepoFilters): Promise<GitHubRepo[]> => {
    const params = new URLSearchParams();
    if (filters?.language) params.append('language', filters.language);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.show_archived) params.append('show_archived', 'true');
    if (filters?.show_forks) params.append('show_forks', 'true');
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const url = queryString ? `/coding/github/repos?${queryString}` : '/coding/github/repos';
    const response = await api.get<GitHubRepo[]>(url);
    return response.data;
  },

  syncRepos: async (): Promise<{ synced: number; message: string }> => {
    const response = await api.post<{ synced: number; message: string }>('/coding/github/repos/sync');
    return response.data;
  },

  getRepo: async (owner: string, repo: string): Promise<GitHubRepo> => {
    const response = await api.get<GitHubRepo>(`/coding/github/repos/${owner}/${repo}`);
    return response.data;
  },

  getRepoCommitActivity: async (owner: string, repo: string): Promise<CommitActivity[]> => {
    const response = await api.get<CommitActivity[]>(`/coding/github/repos/${owner}/${repo}/commits`);
    return response.data;
  },

  getRepoWorkflows: async (owner: string, repo: string): Promise<Workflow[]> => {
    const response = await api.get<Workflow[]>(`/coding/github/repos/${owner}/${repo}/workflows`);
    return response.data;
  },

  getRepoWorkflowRuns: async (owner: string, repo: string, limit?: number): Promise<WorkflowRun[]> => {
    const params = limit ? `?limit=${limit}` : '';
    const response = await api.get<WorkflowRun[]>(`/coding/github/repos/${owner}/${repo}/runs${params}`);
    return response.data;
  },

  // =============================================================================
  // Snippets
  // =============================================================================

  listSnippets: async (filters?: SnippetFilters): Promise<CodeSnippet[]> => {
    const params = new URLSearchParams();
    if (filters?.language) params.append('language', filters.language);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.tag) params.append('tag', filters.tag);
    if (filters?.favourite) params.append('favourite', 'true');
    if (filters?.search) params.append('search', filters.search);
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const url = queryString ? `/coding/snippets?${queryString}` : '/coding/snippets';
    const response = await api.get<CodeSnippet[]>(url);
    return response.data;
  },

  getSnippet: async (id: string): Promise<CodeSnippet> => {
    const response = await api.get<CodeSnippet>(`/coding/snippets/${id}`);
    return response.data;
  },

  createSnippet: async (data: CreateSnippetRequest): Promise<CodeSnippet> => {
    const response = await api.post<CodeSnippet>('/coding/snippets', data);
    return response.data;
  },

  updateSnippet: async (id: string, data: UpdateSnippetRequest): Promise<CodeSnippet> => {
    const response = await api.put<CodeSnippet>(`/coding/snippets/${id}`, data);
    return response.data;
  },

  deleteSnippet: async (id: string): Promise<void> => {
    await api.delete(`/coding/snippets/${id}`);
  },

  toggleSnippetFavourite: async (id: string): Promise<CodeSnippet> => {
    const response = await api.post<CodeSnippet>(`/coding/snippets/${id}/favourite`);
    return response.data;
  },

  recordSnippetUsage: async (id: string): Promise<CodeSnippet> => {
    const response = await api.post<CodeSnippet>(`/coding/snippets/${id}/use`);
    return response.data;
  },

  // =============================================================================
  // Templates
  // =============================================================================

  listTemplates: async (filters?: TemplateFilters): Promise<ProjectTemplate[]> => {
    const params = new URLSearchParams();
    if (filters?.template_type) params.append('type', filters.template_type);
    if (filters?.language) params.append('language', filters.language);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const url = queryString ? `/coding/templates?${queryString}` : '/coding/templates';
    const response = await api.get<ProjectTemplate[]>(url);
    return response.data;
  },

  getTemplate: async (id: string): Promise<ProjectTemplate> => {
    const response = await api.get<ProjectTemplate>(`/coding/templates/${id}`);
    return response.data;
  },

  createTemplate: async (data: CreateTemplateRequest): Promise<ProjectTemplate> => {
    const response = await api.post<ProjectTemplate>('/coding/templates', data);
    return response.data;
  },

  updateTemplate: async (id: string, data: UpdateTemplateRequest): Promise<ProjectTemplate> => {
    const response = await api.put<ProjectTemplate>(`/coding/templates/${id}`, data);
    return response.data;
  },

  deleteTemplate: async (id: string): Promise<void> => {
    await api.delete(`/coding/templates/${id}`);
  },

  downloadTemplate: async (id: string, variables?: Record<string, string>): Promise<Blob> => {
    const response = await api.post(`/coding/templates/${id}/download`, { variables }, {
      responseType: 'blob',
    });
    return response.data;
  },

  // =============================================================================
  // Summary
  // =============================================================================

  getSummary: async (): Promise<CodingSummary> => {
    const response = await api.get<CodingSummary>('/coding/summary');
    return response.data;
  },
};

// Helper constants for UI
export const SNIPPET_LANGUAGES = [
  { value: 'javascript', label: 'JavaScript', color: 'yellow' },
  { value: 'typescript', label: 'TypeScript', color: 'blue' },
  { value: 'python', label: 'Python', color: 'green' },
  { value: 'go', label: 'Go', color: 'cyan' },
  { value: 'rust', label: 'Rust', color: 'orange' },
  { value: 'sql', label: 'SQL', color: 'purple' },
  { value: 'bash', label: 'Bash', color: 'gray' },
  { value: 'css', label: 'CSS', color: 'pink' },
  { value: 'html', label: 'HTML', color: 'red' },
  { value: 'json', label: 'JSON', color: 'gray' },
  { value: 'yaml', label: 'YAML', color: 'gray' },
  { value: 'markdown', label: 'Markdown', color: 'gray' },
  { value: 'other', label: 'Other', color: 'gray' },
] as const;

export const SNIPPET_CATEGORIES = [
  { value: 'algorithm', label: 'Algorithm' },
  { value: 'data_structure', label: 'Data Structure' },
  { value: 'api', label: 'API' },
  { value: 'database', label: 'Database' },
  { value: 'testing', label: 'Testing' },
  { value: 'utility', label: 'Utility' },
  { value: 'config', label: 'Config' },
  { value: 'boilerplate', label: 'Boilerplate' },
  { value: 'other', label: 'Other' },
] as const;

export const TEMPLATE_TYPES = [
  { value: 'project', label: 'Project Template' },
  { value: 'file', label: 'File Template' },
  { value: 'component', label: 'Component Template' },
] as const;

export const getLanguageColor = (language: string): string => {
  const colorMap: Record<string, string> = {
    javascript: 'hsl(48, 89%, 50%)',
    typescript: 'hsl(211, 60%, 48%)',
    python: 'hsl(120, 40%, 45%)',
    go: 'hsl(190, 80%, 45%)',
    rust: 'hsl(24, 80%, 50%)',
    java: 'hsl(0, 70%, 50%)',
    ruby: 'hsl(0, 60%, 55%)',
    php: 'hsl(240, 50%, 60%)',
    csharp: 'hsl(270, 50%, 55%)',
    cpp: 'hsl(210, 50%, 55%)',
    c: 'hsl(200, 50%, 45%)',
    swift: 'hsl(15, 80%, 55%)',
    kotlin: 'hsl(270, 60%, 50%)',
    scala: 'hsl(0, 70%, 55%)',
    shell: 'hsl(120, 30%, 35%)',
    sql: 'hsl(260, 50%, 55%)',
    html: 'hsl(15, 80%, 55%)',
    css: 'hsl(210, 80%, 55%)',
  };
  return colorMap[language.toLowerCase()] || 'hsl(0, 0%, 50%)';
};
