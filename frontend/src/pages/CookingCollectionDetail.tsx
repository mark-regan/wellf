import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CookingLayout } from './Cooking';
import {
  ArrowLeft,
  FolderOpen,
  Plus,
  ChefHat,
  Clock,
  Heart,
  Star,
  X,
  Search,
  Loader2,
} from 'lucide-react';
import { cookingApi } from '@/api/cooking';
import { RecipeCollection, Recipe } from '@/types';

export function CookingCollectionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [collection, setCollection] = useState<RecipeCollection | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add recipe modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Recipe[]>([]);
  const [searching, setSearching] = useState(false);

  const loadCollection = async () => {
    if (!id) return;
    try {
      const data = await cookingApi.getCollection(id);
      setCollection(data.collection);
      setRecipes(data.recipes || []);
    } catch (err) {
      setError('Collection not found');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCollection();
  }, [id]);

  const handleSearch = async () => {
    if (searchQuery.length < 2) return;
    setSearching(true);
    try {
      const results = await cookingApi.listRecipes({ search: searchQuery, limit: 10 });
      // Filter out recipes already in the collection
      const recipeIds = recipes.map((r) => r.id);
      setSearchResults(results.filter((r) => !recipeIds.includes(r.id)));
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleAddRecipe = async (recipeId: string) => {
    if (!id) return;
    try {
      await cookingApi.addRecipeToCollection(id, recipeId);
      await loadCollection();
      setShowAddModal(false);
      setSearchQuery('');
      setSearchResults([]);
    } catch (err) {
      console.error('Failed to add recipe:', err);
    }
  };

  const handleRemoveRecipe = async (recipeId: string) => {
    if (!id || !confirm('Remove this recipe from the collection?')) return;
    try {
      await cookingApi.removeRecipeFromCollection(id, recipeId);
      await loadCollection();
    } catch (err) {
      console.error('Failed to remove recipe:', err);
    }
  };

  const formatTime = (minutes?: number) => {
    if (!minutes) return null;
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  if (loading) {
    return (
      <CookingLayout>
        <div className="text-center py-12 text-muted-foreground">Loading collection...</div>
      </CookingLayout>
    );
  }

  if (error || !collection) {
    return (
      <CookingLayout>
        <div className="text-center py-12">
          <FolderOpen className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-xl font-medium mb-2">{error || 'Collection not found'}</h2>
          <Button asChild variant="outline">
            <Link to="/cooking/collections">Back to Collections</Link>
          </Button>
        </div>
      </CookingLayout>
    );
  }

  return (
    <CookingLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-cooking/10">
                <FolderOpen className="h-5 w-5 text-cooking" />
              </div>
              <h1 className="font-display text-2xl font-bold">{collection.name}</h1>
            </div>
            {collection.description && (
              <p className="text-muted-foreground">{collection.description}</p>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              {recipes.length} recipe{recipes.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button onClick={() => setShowAddModal(true)} className="bg-cooking hover:bg-cooking/90">
            <Plus className="mr-2 h-4 w-4" />
            Add Recipes
          </Button>
        </div>

        {/* Recipes Grid */}
        {recipes.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center text-center">
                <ChefHat className="h-16 w-16 text-muted-foreground/30 mb-4" />
                <h3 className="font-medium text-lg mb-2">No recipes in this collection</h3>
                <p className="text-muted-foreground max-w-sm mb-4">
                  Add your favourite recipes to this collection for easy access.
                </p>
                <Button onClick={() => setShowAddModal(true)} className="bg-cooking hover:bg-cooking/90">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Recipes
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recipes.map((recipe) => (
              <Card key={recipe.id} className="group overflow-hidden hover:border-cooking/50 transition-colors">
                <div className="relative">
                  {recipe.image_url ? (
                    <Link to={`/cooking/recipes/${recipe.id}`}>
                      <img
                        src={recipe.image_url}
                        alt={recipe.title}
                        className="w-full h-40 object-cover"
                      />
                    </Link>
                  ) : (
                    <Link
                      to={`/cooking/recipes/${recipe.id}`}
                      className="w-full h-40 bg-muted flex items-center justify-center"
                    >
                      <ChefHat className="h-12 w-12 text-muted-foreground" />
                    </Link>
                  )}
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleRemoveRecipe(recipe.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <CardHeader className="pb-2">
                  <Link to={`/cooking/recipes/${recipe.id}`}>
                    <CardTitle className="text-lg group-hover:text-cooking transition-colors line-clamp-1">
                      {recipe.title}
                    </CardTitle>
                  </Link>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {recipe.total_time_minutes && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(recipe.total_time_minutes)}
                      </span>
                    )}
                    {recipe.rating && (
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-cooking text-cooking" />
                        {recipe.rating}
                      </span>
                    )}
                    {recipe.is_favourite && (
                      <Heart className="h-3 w-3 fill-cooking text-cooking" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Recipe Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Recipes to Collection</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Search Recipes</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Search your recipes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  autoFocus
                />
                <Button onClick={handleSearch} disabled={searching || searchQuery.length < 2}>
                  {searching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {searchResults.length > 0 && (
              <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                {searchResults.map((recipe) => (
                  <button
                    key={recipe.id}
                    className="w-full p-3 text-left hover:bg-muted flex items-center gap-3"
                    onClick={() => handleAddRecipe(recipe.id)}
                  >
                    {recipe.image_url ? (
                      <img
                        src={recipe.image_url}
                        alt={recipe.title}
                        className="w-10 h-10 rounded object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                        <ChefHat className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="font-medium">{recipe.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {recipe.course && <span className="capitalize">{recipe.course}</span>}
                        {recipe.cuisine && recipe.course && ' - '}
                        {recipe.cuisine}
                      </div>
                    </div>
                    <Plus className="h-4 w-4 text-cooking" />
                  </button>
                ))}
              </div>
            )}

            {searchQuery.length >= 2 && searchResults.length === 0 && !searching && (
              <div className="text-center py-8 text-muted-foreground">
                No recipes found matching "{searchQuery}"
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </CookingLayout>
  );
}
