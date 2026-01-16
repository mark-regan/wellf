import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CookingLayout } from './Cooking';
import {
  ArrowLeft,
  ChefHat,
  Clock,
  Users,
  Heart,
  Edit,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Star,
} from 'lucide-react';
import { cookingApi } from '@/api/cooking';
import { Recipe, RecipeCollection } from '@/types';

export function CookingRecipeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [collections, setCollections] = useState<RecipeCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadRecipe = async () => {
      if (!id) return;
      try {
        const data = await cookingApi.getRecipe(id);
        setRecipe(data.recipe);
        setCollections(data.collections || []);
      } catch (err) {
        setError('Recipe not found');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadRecipe();
  }, [id]);

  const handleToggleFavourite = async () => {
    if (!recipe) return;
    try {
      const isFavourite = await cookingApi.toggleFavourite(recipe.id);
      setRecipe({ ...recipe, is_favourite: isFavourite });
    } catch (err) {
      console.error('Failed to toggle favourite:', err);
    }
  };

  const handleMarkCooked = async () => {
    if (!recipe) return;
    try {
      await cookingApi.markRecipeCooked(recipe.id);
      setRecipe({
        ...recipe,
        times_cooked: recipe.times_cooked + 1,
        last_cooked_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed to mark as cooked:', err);
    }
  };

  const handleDelete = async () => {
    if (!recipe || !confirm('Are you sure you want to delete this recipe?')) return;
    try {
      await cookingApi.deleteRecipe(recipe.id);
      navigate('/cooking/recipes');
    } catch (err) {
      console.error('Failed to delete recipe:', err);
    }
  };

  const formatTime = (minutes?: number) => {
    if (!minutes) return null;
    if (minutes < 60) return `${minutes} mins`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours} hours`;
  };

  if (loading) {
    return (
      <CookingLayout>
        <div className="text-center py-12 text-muted-foreground">Loading recipe...</div>
      </CookingLayout>
    );
  }

  if (error || !recipe) {
    return (
      <CookingLayout>
        <div className="text-center py-12">
          <ChefHat className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-xl font-medium mb-2">{error || 'Recipe not found'}</h2>
          <Button asChild variant="outline">
            <Link to="/cooking/recipes">Back to Recipes</Link>
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
              <h1 className="font-display text-2xl font-bold">{recipe.title}</h1>
              {recipe.is_favourite && (
                <Heart className="h-5 w-5 fill-cooking text-cooking" />
              )}
            </div>
            {recipe.description && (
              <p className="text-muted-foreground">{recipe.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleToggleFavourite}
              className={recipe.is_favourite ? 'text-cooking' : ''}
            >
              <Heart className={`h-5 w-5 ${recipe.is_favourite ? 'fill-current' : ''}`} />
            </Button>
            <Button variant="outline" size="icon" asChild>
              <Link to={`/cooking/recipes/${recipe.id}/edit`}>
                <Edit className="h-5 w-5" />
              </Link>
            </Button>
            <Button variant="outline" size="icon" onClick={handleDelete}>
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image */}
            {recipe.image_url && (
              <div className="rounded-lg overflow-hidden">
                <img
                  src={recipe.image_url}
                  alt={recipe.title}
                  className="w-full h-64 object-cover"
                />
              </div>
            )}

            {/* Quick Info Cards */}
            <div className="grid gap-4 sm:grid-cols-4">
              {recipe.prep_time_minutes && (
                <Card>
                  <CardContent className="pt-4 text-center">
                    <Clock className="h-5 w-5 mx-auto mb-1 text-cooking" />
                    <div className="text-sm font-medium">Prep</div>
                    <div className="text-lg font-bold">{formatTime(recipe.prep_time_minutes)}</div>
                  </CardContent>
                </Card>
              )}
              {recipe.cook_time_minutes && (
                <Card>
                  <CardContent className="pt-4 text-center">
                    <Clock className="h-5 w-5 mx-auto mb-1 text-cooking" />
                    <div className="text-sm font-medium">Cook</div>
                    <div className="text-lg font-bold">{formatTime(recipe.cook_time_minutes)}</div>
                  </CardContent>
                </Card>
              )}
              {recipe.servings && (
                <Card>
                  <CardContent className="pt-4 text-center">
                    <Users className="h-5 w-5 mx-auto mb-1 text-cooking" />
                    <div className="text-sm font-medium">Servings</div>
                    <div className="text-lg font-bold">{recipe.servings}</div>
                  </CardContent>
                </Card>
              )}
              {recipe.rating && (
                <Card>
                  <CardContent className="pt-4 text-center">
                    <Star className="h-5 w-5 mx-auto mb-1 text-cooking fill-cooking" />
                    <div className="text-sm font-medium">Rating</div>
                    <div className="text-lg font-bold">{recipe.rating}/5</div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Ingredients */}
            <Card>
              <CardHeader>
                <CardTitle>Ingredients</CardTitle>
              </CardHeader>
              <CardContent>
                {recipe.ingredients.length === 0 ? (
                  <p className="text-muted-foreground">No ingredients added</p>
                ) : (
                  <ul className="space-y-2">
                    {recipe.ingredients.map((ing, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-cooking" />
                        <span>
                          {ing.amount && <span className="font-medium">{ing.amount} </span>}
                          {ing.unit && <span>{ing.unit} </span>}
                          {ing.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Instructions */}
            <Card>
              <CardHeader>
                <CardTitle>Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                {recipe.instructions.length === 0 ? (
                  <p className="text-muted-foreground">No instructions added</p>
                ) : (
                  <ol className="space-y-4">
                    {recipe.instructions.map((inst, index) => (
                      <li key={index} className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-cooking/10 text-cooking flex items-center justify-center font-medium flex-shrink-0">
                          {inst.step}
                        </div>
                        <p className="pt-1">{inst.text}</p>
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            {recipe.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">{recipe.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={handleMarkCooked}
                  className="w-full bg-cooking hover:bg-cooking/90"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Mark as Cooked
                </Button>
                <div className="text-center text-sm text-muted-foreground">
                  Cooked {recipe.times_cooked} time{recipe.times_cooked !== 1 ? 's' : ''}
                  {recipe.last_cooked_at && (
                    <>
                      <br />
                      Last: {new Date(recipe.last_cooked_at).toLocaleDateString()}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Meta Info */}
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {recipe.course && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Course</span>
                    <span className="capitalize font-medium">{recipe.course}</span>
                  </div>
                )}
                {recipe.cuisine && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cuisine</span>
                    <span className="font-medium">{recipe.cuisine}</span>
                  </div>
                )}
                {recipe.source_name && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Source</span>
                    {recipe.source_url ? (
                      <a
                        href={recipe.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-cooking hover:underline flex items-center gap-1"
                      >
                        {recipe.source_name}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="font-medium">{recipe.source_name}</span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Diet Tags */}
            {recipe.diet_tags && recipe.diet_tags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Dietary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {recipe.diet_tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 rounded-full bg-cooking/10 text-cooking text-xs font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Collections */}
            {collections.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Collections</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {collections.map((col) => (
                      <Link
                        key={col.id}
                        to={`/cooking/collections/${col.id}`}
                        className="block p-2 rounded hover:bg-muted transition-colors"
                      >
                        {col.name}
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </CookingLayout>
  );
}
