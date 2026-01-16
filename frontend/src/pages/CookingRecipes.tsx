import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CookingLayout } from './Cooking';
import { AddRecipeModal } from '@/components/cooking/AddRecipeModal';
import {
  Plus,
  Search,
  ChefHat,
  Clock,
  Star,
  Heart,
  Filter,
  Grid3X3,
  List,
  Carrot,
  X,
  Loader2,
} from 'lucide-react';
import { cookingApi } from '@/api/cooking';
import { Recipe } from '@/types';

type ViewMode = 'grid' | 'list';
type SortOption = 'created' | 'title' | 'rating' | 'times_cooked' | 'last_cooked';
type SearchMode = 'name' | 'ingredients';

interface RecipeMatch {
  recipe: Recipe;
  matching_count: number;
  total_ingredients: number;
}

const courses = [
  { value: 'all', label: 'All Courses' },
  { value: 'starter', label: 'Starter' },
  { value: 'main', label: 'Main' },
  { value: 'dessert', label: 'Dessert' },
  { value: 'side', label: 'Side' },
  { value: 'snack', label: 'Snack' },
  { value: 'drink', label: 'Drink' },
];

const sortOptions = [
  { value: 'created', label: 'Recently Added' },
  { value: 'title', label: 'Alphabetical' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'times_cooked', label: 'Most Cooked' },
  { value: 'last_cooked', label: 'Recently Cooked' },
];

export function CookingRecipes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchMode, setSearchMode] = useState<SearchMode>('name');
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [course, setCourse] = useState(searchParams.get('course') || 'all');
  const [sort, setSort] = useState<SortOption>((searchParams.get('sort') as SortOption) || 'created');
  const [showFavourites, setShowFavourites] = useState(searchParams.get('favourites') === 'true');
  const [showAddRecipe, setShowAddRecipe] = useState(false);

  // Ingredient search state
  const [ingredientInput, setIngredientInput] = useState('');
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [ingredientMatches, setIngredientMatches] = useState<RecipeMatch[]>([]);
  const [ingredientSearchLoading, setIngredientSearchLoading] = useState(false);

  const loadRecipes = async () => {
    setLoading(true);
    try {
      const data = await cookingApi.listRecipes({
        search: search || undefined,
        course: course && course !== 'all' ? course : undefined,
        sort,
        favourites: showFavourites || undefined,
      });
      setRecipes(data);
    } catch (error) {
      console.error('Failed to load recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchByIngredients = async () => {
    if (selectedIngredients.length === 0) return;

    setIngredientSearchLoading(true);
    try {
      const result = await cookingApi.searchByIngredients(selectedIngredients);
      setIngredientMatches(result.results);
    } catch (error) {
      console.error('Failed to search by ingredients:', error);
    } finally {
      setIngredientSearchLoading(false);
    }
  };

  const addIngredient = () => {
    const trimmed = ingredientInput.trim().toLowerCase();
    if (trimmed && !selectedIngredients.includes(trimmed)) {
      setSelectedIngredients([...selectedIngredients, trimmed]);
      setIngredientInput('');
    }
  };

  const removeIngredient = (ingredient: string) => {
    setSelectedIngredients(selectedIngredients.filter(i => i !== ingredient));
  };

  useEffect(() => {
    if (searchMode === 'name') {
      loadRecipes();
    }
  }, [search, course, sort, showFavourites, searchMode]);

  useEffect(() => {
    if (searchMode === 'ingredients' && selectedIngredients.length > 0) {
      searchByIngredients();
    } else if (searchMode === 'ingredients') {
      setIngredientMatches([]);
    }
  }, [selectedIngredients, searchMode]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (course && course !== 'all') params.set('course', course);
    if (sort !== 'created') params.set('sort', sort);
    if (showFavourites) params.set('favourites', 'true');
    setSearchParams(params);
  };

  const toggleFavourite = async (recipeId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const isFavourite = await cookingApi.toggleFavourite(recipeId);
      setRecipes(recipes.map(r => r.id === recipeId ? { ...r, is_favourite: isFavourite } : r));
    } catch (error) {
      console.error('Failed to toggle favourite:', error);
    }
  };

  const formatTime = (minutes?: number) => {
    if (!minutes) return null;
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <CookingLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Recipes</h1>
            <p className="text-muted-foreground">Browse and manage your recipe collection</p>
          </div>
          <Button onClick={() => setShowAddRecipe(true)} className="bg-cooking hover:bg-cooking/90">
            <Plus className="mr-2 h-4 w-4" />
            Add Recipe
          </Button>
        </div>

        {/* Search Mode Toggle */}
        <div className="flex gap-2">
          <Button
            variant={searchMode === 'name' ? 'default' : 'outline'}
            onClick={() => setSearchMode('name')}
            className={searchMode === 'name' ? 'bg-cooking hover:bg-cooking/90' : ''}
          >
            <Search className="mr-2 h-4 w-4" />
            Search by Name
          </Button>
          <Button
            variant={searchMode === 'ingredients' ? 'default' : 'outline'}
            onClick={() => setSearchMode('ingredients')}
            className={searchMode === 'ingredients' ? 'bg-cooking hover:bg-cooking/90' : ''}
          >
            <Carrot className="mr-2 h-4 w-4" />
            What Can I Make?
          </Button>
        </div>

        {/* Filters - Name Search */}
        {searchMode === 'name' && (
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSearchSubmit} className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search recipes..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <Select value={course} onValueChange={setCourse}>
                  <SelectTrigger className="w-[150px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
                  <SelectTrigger className="w-[170px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortOptions.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant={showFavourites ? 'default' : 'outline'}
                  onClick={() => setShowFavourites(!showFavourites)}
                  className={showFavourites ? 'bg-cooking hover:bg-cooking/90' : ''}
                >
                  <Heart className={`mr-2 h-4 w-4 ${showFavourites ? 'fill-current' : ''}`} />
                  Favourites
                </Button>
                <div className="flex gap-1 border rounded-md p-1">
                  <Button
                    type="button"
                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                    size="icon"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                    size="icon"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Ingredient Search */}
        {searchMode === 'ingredients' && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Carrot className="h-5 w-5 text-cooking" />
                What ingredients do you have?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter an ingredient (e.g., chicken, rice, tomato)"
                  value={ingredientInput}
                  onChange={(e) => setIngredientInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addIngredient())}
                />
                <Button onClick={addIngredient} disabled={!ingredientInput.trim()}>
                  <Plus className="mr-1 h-4 w-4" />
                  Add
                </Button>
              </div>

              {selectedIngredients.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedIngredients.map((ingredient) => (
                    <Badge
                      key={ingredient}
                      variant="secondary"
                      className="px-3 py-1 text-sm flex items-center gap-1"
                    >
                      {ingredient}
                      <button
                        onClick={() => removeIngredient(ingredient)}
                        className="ml-1 hover:bg-muted rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedIngredients([])}
                    className="text-muted-foreground"
                  >
                    Clear all
                  </Button>
                </div>
              )}

              {selectedIngredients.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Add ingredients you have on hand to find matching recipes
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Recipe List/Grid */}
        {searchMode === 'name' && loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading recipes...</div>
        ) : searchMode === 'ingredients' && ingredientSearchLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Searching for recipes...
          </div>
        ) : searchMode === 'ingredients' && selectedIngredients.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Carrot className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="font-medium text-lg mb-2">Add some ingredients</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Enter the ingredients you have available and we'll show you what you can cook.
              </p>
            </CardContent>
          </Card>
        ) : searchMode === 'ingredients' && ingredientMatches.length === 0 && selectedIngredients.length > 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <ChefHat className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="font-medium text-lg mb-2">No matching recipes</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                We couldn't find any recipes with those ingredients. Try adding more ingredients or adjusting your selection.
              </p>
            </CardContent>
          </Card>
        ) : searchMode === 'ingredients' && ingredientMatches.length > 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Found {ingredientMatches.length} recipes using your ingredients
            </p>
            <div className="space-y-3">
              {ingredientMatches.map((match) => (
                <Link key={match.recipe.id} to={`/cooking/recipes/${match.recipe.id}`}>
                  <Card className="hover:border-cooking transition-colors">
                    <CardContent className="flex items-center gap-4 p-4">
                      {match.recipe.image_url ? (
                        <img
                          src={match.recipe.image_url}
                          alt={match.recipe.title}
                          className="w-20 h-20 rounded object-cover"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded bg-muted flex items-center justify-center">
                          <ChefHat className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{match.recipe.title}</h3>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span className="text-cooking font-medium">
                            {match.matching_count} of {match.total_ingredients} ingredients matched
                          </span>
                          {formatTime(match.recipe.total_time_minutes) && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTime(match.recipe.total_time_minutes)}
                            </span>
                          )}
                        </div>
                        {match.recipe.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                            {match.recipe.description}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={(e) => toggleFavourite(match.recipe.id, e)}
                        className="p-2 hover:bg-muted rounded-full transition-colors"
                      >
                        <Heart
                          className={`h-5 w-5 ${
                            match.recipe.is_favourite ? 'fill-cooking text-cooking' : 'text-muted-foreground'
                          }`}
                        />
                      </button>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        ) : searchMode === 'name' && recipes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <ChefHat className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="font-medium text-lg mb-2">No recipes found</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-6">
                {search || (course && course !== 'all') || showFavourites
                  ? 'Try adjusting your filters to find more recipes.'
                  : 'Start building your recipe collection by adding your first recipe.'}
              </p>
              {!search && (!course || course === 'all') && !showFavourites && (
                <Button onClick={() => setShowAddRecipe(true)} className="bg-cooking hover:bg-cooking/90">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Recipe
                </Button>
              )}
            </CardContent>
          </Card>
        ) : searchMode === 'name' && viewMode === 'grid' ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {recipes.map((recipe) => (
              <Link
                key={recipe.id}
                to={`/cooking/recipes/${recipe.id}`}
                className="group"
              >
                <Card className="overflow-hidden hover:border-cooking transition-colors h-full">
                  <div className="relative aspect-video">
                    {recipe.image_url ? (
                      <img
                        src={recipe.image_url}
                        alt={recipe.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <ChefHat className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                    <button
                      onClick={(e) => toggleFavourite(recipe.id, e)}
                      className="absolute top-2 right-2 p-2 rounded-full bg-background/80 hover:bg-background transition-colors"
                    >
                      <Heart
                        className={`h-4 w-4 ${
                          recipe.is_favourite ? 'fill-cooking text-cooking' : 'text-muted-foreground'
                        }`}
                      />
                    </button>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-medium truncate group-hover:text-cooking transition-colors">
                      {recipe.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      {formatTime(recipe.total_time_minutes) && (
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
                      {recipe.course && (
                        <span className="capitalize">{recipe.course}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : searchMode === 'name' ? (
          <div className="space-y-2">
            {recipes.map((recipe) => (
              <Link key={recipe.id} to={`/cooking/recipes/${recipe.id}`}>
                <Card className="hover:border-cooking transition-colors">
                  <CardContent className="flex items-center gap-4 p-4">
                    {recipe.image_url ? (
                      <img
                        src={recipe.image_url}
                        alt={recipe.title}
                        className="w-16 h-16 rounded object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded bg-muted flex items-center justify-center">
                        <ChefHat className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{recipe.title}</h3>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        {formatTime(recipe.total_time_minutes) && (
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
                        {recipe.course && (
                          <span className="capitalize">{recipe.course}</span>
                        )}
                        {recipe.times_cooked > 0 && (
                          <span>Cooked {recipe.times_cooked}x</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => toggleFavourite(recipe.id, e)}
                      className="p-2 hover:bg-muted rounded-full transition-colors"
                    >
                      <Heart
                        className={`h-5 w-5 ${
                          recipe.is_favourite ? 'fill-cooking text-cooking' : 'text-muted-foreground'
                        }`}
                      />
                    </button>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      <AddRecipeModal
        open={showAddRecipe}
        onOpenChange={setShowAddRecipe}
        onSuccess={loadRecipes}
      />
    </CookingLayout>
  );
}
