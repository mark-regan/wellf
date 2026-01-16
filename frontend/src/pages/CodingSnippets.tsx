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
  FileCode,
  Plus,
  Search,
  Star,
  Copy,
  Trash2,
  Edit,
  ArrowLeft,
  Check,
  X,
  Filter,
} from 'lucide-react';
import { CodingLayout } from './Coding';
import { codingApi, SNIPPET_LANGUAGES, SNIPPET_CATEGORIES, getLanguageColor } from '@/api/coding';
import { CodeSnippet, CreateSnippetRequest, UpdateSnippetRequest, SnippetLanguage, SnippetCategory } from '@/types';

// =============================================================================
// Snippets List
// =============================================================================

export function CodingSnippetsList() {
  const [snippets, setSnippets] = useState<CodeSnippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [languageFilter, setLanguageFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [favouriteFilter, setFavouriteFilter] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const loadSnippets = async () => {
    setLoading(true);
    try {
      const data = await codingApi.listSnippets({
        search: search || undefined,
        language: languageFilter || undefined,
        category: categoryFilter || undefined,
        favourite: favouriteFilter || undefined,
      });
      setSnippets(data);
    } catch (error) {
      console.error('Failed to load snippets:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSnippets();
  }, [languageFilter, categoryFilter, favouriteFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadSnippets();
  };

  const handleCopy = async (snippet: CodeSnippet) => {
    try {
      await navigator.clipboard.writeText(snippet.code);
      setCopied(snippet.id);
      await codingApi.recordSnippetUsage(snippet.id);
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleToggleFavourite = async (snippet: CodeSnippet) => {
    try {
      await codingApi.toggleSnippetFavourite(snippet.id);
      await loadSnippets();
    } catch (error) {
      console.error('Failed to toggle favourite:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this snippet?')) return;
    try {
      await codingApi.deleteSnippet(id);
      await loadSnippets();
    } catch (error) {
      console.error('Failed to delete snippet:', error);
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
            <h1 className="font-display text-2xl font-bold">Snippets</h1>
            <p className="text-muted-foreground">Your saved code snippets</p>
          </div>
          <Button asChild className="bg-coding hover:bg-coding/90">
            <Link to="/code/snippets/new">
              <Plus className="mr-2 h-4 w-4" />
              New Snippet
            </Link>
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search snippets..."
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
                  {SNIPPET_LANGUAGES.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Categories</SelectItem>
                  {SNIPPET_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant={favouriteFilter ? 'default' : 'outline'}
                onClick={() => setFavouriteFilter(!favouriteFilter)}
              >
                <Star className={`h-4 w-4 ${favouriteFilter ? 'fill-current' : ''}`} />
              </Button>
              <Button type="submit">
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Snippets Grid */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : snippets.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileCode className="h-16 w-16 text-coding/30 mb-4" />
                <h3 className="text-lg font-medium mb-2">No snippets found</h3>
                <p className="text-muted-foreground max-w-sm mb-4">
                  {search || languageFilter || categoryFilter || favouriteFilter
                    ? 'Try adjusting your filters.'
                    : 'Create your first snippet to get started.'}
                </p>
                <Button asChild>
                  <Link to="/code/snippets/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Snippet
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {snippets.map((snippet) => (
              <Card key={snippet.id} className="group">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: getLanguageColor(snippet.language) }}
                      />
                      <CardTitle className="text-base truncate">{snippet.title}</CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 h-8 w-8 p-0"
                      onClick={() => handleToggleFavourite(snippet)}
                    >
                      <Star
                        className={`h-4 w-4 ${
                          snippet.is_favourite ? 'fill-yellow-500 text-yellow-500' : ''
                        }`}
                      />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {snippet.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {snippet.description}
                    </p>
                  )}
                  <pre className="bg-muted p-3 rounded-md text-xs overflow-hidden mb-3 max-h-24">
                    <code className="line-clamp-4">{snippet.code}</code>
                  </pre>
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <Badge variant="outline">{getLanguageLabel(snippet.language)}</Badge>
                    {snippet.category && (
                      <Badge variant="secondary">
                        {SNIPPET_CATEGORIES.find((c) => c.value === snippet.category)?.label}
                      </Badge>
                    )}
                    {snippet.tags?.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleCopy(snippet)}
                    >
                      {copied === snippet.id ? (
                        <>
                          <Check className="mr-2 h-4 w-4 text-green-500" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="mr-2 h-4 w-4" />
                          Copy
                        </>
                      )}
                    </Button>
                    <Button size="sm" variant="ghost" asChild>
                      <Link to={`/code/snippets/${snippet.id}/edit`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(snippet.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
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

// =============================================================================
// Snippet Form (Create/Edit)
// =============================================================================

export function CodingSnippetForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<CreateSnippetRequest>({
    title: '',
    description: '',
    code: '',
    language: 'javascript' as SnippetLanguage,
    category: undefined,
    tags: [],
  });
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (isEdit && id) {
      loadSnippet(id);
    }
  }, [id, isEdit]);

  const loadSnippet = async (snippetId: string) => {
    setLoading(true);
    try {
      const snippet = await codingApi.getSnippet(snippetId);
      setFormData({
        title: snippet.title,
        description: snippet.description ?? '',
        code: snippet.code,
        language: snippet.language,
        category: snippet.category,
        tags: snippet.tags ?? [],
      });
    } catch (error) {
      console.error('Failed to load snippet:', error);
      navigate('/code/snippets');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit && id) {
        await codingApi.updateSnippet(id, formData as UpdateSnippetRequest);
      } else {
        await codingApi.createSnippet(formData);
      }
      navigate('/code/snippets');
    } catch (error) {
      console.error('Failed to save snippet:', error);
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
            <Link to="/code/snippets">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="font-display text-2xl font-bold">
              {isEdit ? 'Edit Snippet' : 'New Snippet'}
            </h1>
            <p className="text-muted-foreground">
              {isEdit ? 'Update your code snippet' : 'Create a new code snippet'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Debounce Function"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="What does this snippet do?"
                  rows={2}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Language *</Label>
                  <Select
                    value={formData.language}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, language: value as SnippetLanguage }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SNIPPET_LANGUAGES.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={formData.category ?? ''}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        category: value ? (value as SnippetCategory) : undefined,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {SNIPPET_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Code *</Label>
                <Textarea
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value }))}
                  placeholder="Paste your code here..."
                  rows={12}
                  className="font-mono text-sm"
                  required
                />
              </div>

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
                  <Link to="/code/snippets">Cancel</Link>
                </Button>
                <Button type="submit" disabled={saving} className="bg-coding hover:bg-coding/90">
                  {saving ? 'Saving...' : isEdit ? 'Update Snippet' : 'Create Snippet'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </CodingLayout>
  );
}
