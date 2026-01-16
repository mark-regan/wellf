import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  List,
  Plus,
  Search,
  Edit,
  Trash2,
  ArrowLeft,
  FolderPlus,
  FileCode,
  X,
  Download,
} from 'lucide-react';
import { CodingLayout } from './Coding';
import { codingApi, TEMPLATE_TYPES, SNIPPET_LANGUAGES } from '@/api/coding';
import { ProjectTemplate, CreateTemplateRequest, UpdateTemplateRequest, TemplateType, SnippetLanguage } from '@/types';

// =============================================================================
// Templates List
// =============================================================================

export function CodingTemplatesList() {
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [downloadTemplate, setDownloadTemplate] = useState<ProjectTemplate | null>(null);
  const [downloadVariables, setDownloadVariables] = useState<Record<string, string>>({});
  const [downloading, setDownloading] = useState(false);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await codingApi.listTemplates({
        search: search || undefined,
        template_type: typeFilter || undefined,
      });
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [typeFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadTemplates();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      await codingApi.deleteTemplate(id);
      await loadTemplates();
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const openDownloadDialog = (template: ProjectTemplate) => {
    // Initialize variables with defaults
    const vars: Record<string, string> = {};
    template.variables?.forEach((v) => {
      vars[v.name] = v.default_value || '';
    });
    setDownloadVariables(vars);
    setDownloadTemplate(template);
  };

  const handleDownload = async () => {
    if (!downloadTemplate) return;

    setDownloading(true);
    try {
      const blob = await codingApi.downloadTemplate(downloadTemplate.id, downloadVariables);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${downloadTemplate.name.toLowerCase().replace(/\s+/g, '-')}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setDownloadTemplate(null);
    } catch (error) {
      console.error('Failed to download template:', error);
    } finally {
      setDownloading(false);
    }
  };

  const getTypeLabel = (type: string) => {
    return TEMPLATE_TYPES.find((t) => t.value === type)?.label ?? type;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'project':
        return <FolderPlus className="h-4 w-4" />;
      case 'file':
        return <FileCode className="h-4 w-4" />;
      case 'component':
        return <List className="h-4 w-4" />;
      default:
        return <List className="h-4 w-4" />;
    }
  };

  return (
    <CodingLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Templates</h1>
            <p className="text-muted-foreground">Project and file templates</p>
          </div>
          <Button asChild className="bg-coding hover:bg-coding/90">
            <Link to="/code/templates/new">
              <Plus className="mr-2 h-4 w-4" />
              New Template
            </Link>
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search templates..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  {TEMPLATE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="submit">Search</Button>
            </form>
          </CardContent>
        </Card>

        {/* Templates Grid */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <List className="h-16 w-16 text-coding/30 mb-4" />
                <h3 className="text-lg font-medium mb-2">No templates found</h3>
                <p className="text-muted-foreground max-w-sm mb-4">
                  {search || typeFilter
                    ? 'Try adjusting your filters.'
                    : 'Create your first template to get started.'}
                </p>
                <Button asChild>
                  <Link to="/code/templates/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Template
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card key={template.id} className="group">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      {getTypeIcon(template.template_type)}
                      <CardTitle className="text-base truncate">{template.name}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {template.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {template.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <Badge variant="outline">{getTypeLabel(template.template_type)}</Badge>
                    {template.language && (
                      <Badge variant="secondary">
                        {SNIPPET_LANGUAGES.find((l) => l.value === template.language)?.label ?? template.language}
                      </Badge>
                    )}
                    {template.framework && (
                      <Badge variant="outline">{template.framework}</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mb-3">
                    {template.files?.length ?? 0} files • Used {template.usage_count} times
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      className="flex-1 bg-coding hover:bg-coding/90"
                      onClick={() => openDownloadDialog(template)}
                      disabled={!template.files || template.files.length === 0}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/code/templates/${template.id}/edit`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(template.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Download Dialog */}
        <Dialog open={!!downloadTemplate} onOpenChange={(open) => !open && setDownloadTemplate(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Download Template</DialogTitle>
            </DialogHeader>
            {downloadTemplate && (
              <div className="space-y-4 py-4">
                <p className="text-sm text-muted-foreground">
                  Configure variables for <strong>{downloadTemplate.name}</strong>
                </p>

                {downloadTemplate.variables && downloadTemplate.variables.length > 0 ? (
                  <div className="space-y-4">
                    {downloadTemplate.variables.map((variable) => (
                      <div key={variable.name} className="space-y-2">
                        <Label htmlFor={`var-${variable.name}`}>
                          {variable.name}
                          {variable.description && (
                            <span className="ml-2 text-xs text-muted-foreground font-normal">
                              {variable.description}
                            </span>
                          )}
                        </Label>
                        <Input
                          id={`var-${variable.name}`}
                          value={downloadVariables[variable.name] || ''}
                          onChange={(e) =>
                            setDownloadVariables((prev) => ({
                              ...prev,
                              [variable.name]: e.target.value,
                            }))
                          }
                          placeholder={variable.default_value || `Enter ${variable.name}`}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg">
                    No variables to configure. Click download to get the template files.
                  </p>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDownloadTemplate(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleDownload}
                disabled={downloading}
                className="bg-coding hover:bg-coding/90"
              >
                {downloading ? 'Downloading...' : 'Download ZIP'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </CodingLayout>
  );
}

// =============================================================================
// Template Form (Create/Edit)
// =============================================================================

export function CodingTemplateForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<CreateTemplateRequest>({
    name: '',
    description: '',
    template_type: 'file' as TemplateType,
    language: undefined,
    framework: '',
    files: [],
    variables: [],
    tags: [],
  });
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (isEdit && id) {
      loadTemplate(id);
    }
  }, [id, isEdit]);

  const loadTemplate = async (templateId: string) => {
    setLoading(true);
    try {
      const template = await codingApi.getTemplate(templateId);
      setFormData({
        name: template.name,
        description: template.description ?? '',
        template_type: template.template_type,
        language: template.language,
        framework: template.framework ?? '',
        files: template.files ?? [],
        variables: template.variables ?? [],
        tags: template.tags ?? [],
      });
    } catch (error) {
      console.error('Failed to load template:', error);
      navigate('/code/templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit && id) {
        await codingApi.updateTemplate(id, formData as UpdateTemplateRequest);
      } else {
        await codingApi.createTemplate(formData);
      }
      navigate('/code/templates');
    } catch (error) {
      console.error('Failed to save template:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...(prev.tags ?? []), tagInput.trim()],
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags?.filter((t) => t !== tag) ?? [],
    }));
  };

  const handleAddFile = () => {
    setFormData((prev) => ({
      ...prev,
      files: [
        ...(prev.files ?? []),
        { path: '', content: '', is_template: true },
      ],
    }));
  };

  const handleUpdateFile = (index: number, field: string, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      files: prev.files?.map((f, i) =>
        i === index ? { ...f, [field]: value } : f
      ) ?? [],
    }));
  };

  const handleRemoveFile = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      files: prev.files?.filter((_, i) => i !== index) ?? [],
    }));
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
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/code/templates">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="font-display text-2xl font-bold">
              {isEdit ? 'Edit Template' : 'New Template'}
            </h1>
            <p className="text-muted-foreground">
              {isEdit ? 'Update your template' : 'Create a new project or file template'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., React Component"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="What is this template for?"
                  rows={2}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Type *</Label>
                  <Select
                    value={formData.template_type}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, template_type: value as TemplateType }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TEMPLATE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select
                    value={formData.language ?? ''}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        language: value ? (value as SnippetLanguage) : undefined,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {SNIPPET_LANGUAGES.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="framework">Framework</Label>
                  <Input
                    id="framework"
                    value={formData.framework}
                    onChange={(e) => setFormData((prev) => ({ ...prev, framework: e.target.value }))}
                    placeholder="e.g., React, Next.js"
                  />
                </div>
              </div>

              {/* Files */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Template Files</Label>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddFile}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add File
                  </Button>
                </div>
                {formData.files && formData.files.length > 0 ? (
                  <div className="space-y-4">
                    {formData.files.map((file, index) => (
                      <Card key={index}>
                        <CardContent className="pt-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder="File path (e.g., src/components/{{name}}.tsx)"
                              value={file.path}
                              onChange={(e) => handleUpdateFile(index, 'path', e.target.value)}
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveFile(index)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                          <Textarea
                            placeholder="File content (use {{variable}} for placeholders)"
                            value={file.content}
                            onChange={(e) => handleUpdateFile(index, 'content', e.target.value)}
                            rows={6}
                            className="font-mono text-sm"
                          />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg">
                    No files added yet. Click "Add File" to add template files.
                  </p>
                )}
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Add a tag"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={handleAddTag}>
                    Add
                  </Button>
                </div>
                {formData.tags && formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" asChild>
                  <Link to="/code/templates">Cancel</Link>
                </Button>
                <Button type="submit" disabled={saving} className="bg-coding hover:bg-coding/90">
                  {saving ? 'Saving...' : isEdit ? 'Update Template' : 'Create Template'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </CodingLayout>
  );
}
