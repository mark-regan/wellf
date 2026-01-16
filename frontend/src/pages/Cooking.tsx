import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HubLayout } from '@/components/layout/HubLayout';
import { AddRecipeModal } from '@/components/cooking/AddRecipeModal';
import {
  ChefHat,
  LayoutDashboard,
  BookOpen,
  Calendar,
  ShoppingCart,
  Heart,
  Plus,
  Clock,
  Utensils,
  Star,
  FolderOpen,
} from 'lucide-react';
import { cookingApi } from '@/api/cooking';
import { Recipe, CookingSummary } from '@/types';

const cookingNavItems = [
  { label: 'Overview', href: '/cooking', icon: LayoutDashboard },
  { label: 'Recipes', href: '/cooking/recipes', icon: BookOpen },
  { label: 'Collections', href: '/cooking/collections', icon: FolderOpen },
  { label: 'Meal Plan', href: '/cooking/meal-plan', icon: Calendar },
  { label: 'Shopping List', href: '/cooking/shopping-list', icon: ShoppingCart },
];

const CookingLayout = ({ children }: { children: React.ReactNode }) => (
  <HubLayout
    title="Cooking"
    description="Recipes, meal planning & shopping lists"
    icon={ChefHat}
    color="cooking"
    navItems={cookingNavItems}
  >
    {children}
  </HubLayout>
);

export function Cooking() {
  const [summary, setSummary] = useState<CookingSummary | null>(null);
  const [recentRecipes, setRecentRecipes] = useState<Recipe[]>([]);
  const [favourites, setFavourites] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddRecipe, setShowAddRecipe] = useState(false);

  const loadData = async () => {
      try {
        const [summaryData, recipesData, favouritesData] = await Promise.all([
          cookingApi.getSummary(),
          cookingApi.listRecipes({ sort: 'created', limit: 5 }),
          cookingApi.listRecipes({ favourites: true, limit: 4 }),
        ]);
        setSummary(summaryData);
        setRecentRecipes(recipesData);
        setFavourites(favouritesData);
      } catch (error) {
        console.error('Failed to load cooking data:', error);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadData();
  }, []);

  const formatTime = (minutes?: number) => {
    if (!minutes) return '--';
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
            <h1 className="font-display text-2xl font-bold">Cooking</h1>
            <p className="text-muted-foreground">Recipes, meal planning & shopping lists</p>
          </div>
          <Button onClick={() => setShowAddRecipe(true)} className="bg-cooking hover:bg-cooking/90">
            <Plus className="mr-2 h-4 w-4" />
            Add Recipe
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Total Recipes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '--' : summary?.total_recipes ?? 0}</div>
              <p className="text-xs text-muted-foreground">In your collection</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Favourites
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '--' : summary?.favourite_recipes ?? 0}</div>
              <p className="text-xs text-muted-foreground">Saved recipes</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Utensils className="h-4 w-4" />
                Cooked This Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '--' : summary?.recipes_this_week ?? 0}</div>
              <p className="text-xs text-muted-foreground">Meals prepared</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Today's Meals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '--' : summary?.meal_plans_today?.length ?? 0}</div>
              <p className="text-xs text-muted-foreground">Planned meals</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Recipes */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-cooking" />
                Recent Recipes
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/cooking/recipes">View all</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : recentRecipes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <h3 className="font-medium mb-2">No recipes yet</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mb-4">
                    Start building your recipe collection by adding your first recipe.
                  </p>
                  <Button onClick={() => setShowAddRecipe(true)} className="bg-cooking hover:bg-cooking/90">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Recipe
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentRecipes.map((recipe) => (
                    <Link
                      key={recipe.id}
                      to={`/cooking/recipes/${recipe.id}`}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                    >
                      {recipe.image_url ? (
                        <img
                          src={recipe.image_url}
                          alt={recipe.title}
                          className="w-12 h-12 rounded object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                          <ChefHat className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{recipe.title}</h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
                        </div>
                      </div>
                      {recipe.is_favourite && <Heart className="h-4 w-4 text-cooking fill-cooking" />}
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Favourites */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-cooking" />
                Favourites
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/cooking/recipes?favourites=true">View all</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : favourites.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Heart className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <h3 className="font-medium mb-2">No favourites yet</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Mark recipes as favourites to quickly find your most-loved dishes.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {favourites.map((recipe) => (
                    <Link
                      key={recipe.id}
                      to={`/cooking/recipes/${recipe.id}`}
                      className="group p-3 rounded-lg border hover:border-cooking transition-colors"
                    >
                      {recipe.image_url ? (
                        <img
                          src={recipe.image_url}
                          alt={recipe.title}
                          className="w-full h-20 rounded object-cover mb-2"
                        />
                      ) : (
                        <div className="w-full h-20 rounded bg-muted flex items-center justify-center mb-2">
                          <ChefHat className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <h4 className="font-medium text-sm truncate group-hover:text-cooking transition-colors">
                        {recipe.title}
                      </h4>
                      {recipe.total_time_minutes && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(recipe.total_time_minutes)}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <button
                onClick={() => setShowAddRecipe(true)}
                className="flex items-center gap-4 p-4 rounded-lg border hover:border-cooking hover:bg-cooking/5 transition-colors text-left w-full"
              >
                <div className="p-3 rounded-full bg-cooking/10">
                  <Plus className="h-6 w-6 text-cooking" />
                </div>
                <div>
                  <h4 className="font-medium">Add Recipe</h4>
                  <p className="text-sm text-muted-foreground">Add a new recipe to your collection</p>
                </div>
              </button>
              <Link
                to="/cooking/meal-plan"
                className="flex items-center gap-4 p-4 rounded-lg border hover:border-cooking hover:bg-cooking/5 transition-colors"
              >
                <div className="p-3 rounded-full bg-cooking/10">
                  <Calendar className="h-6 w-6 text-cooking" />
                </div>
                <div>
                  <h4 className="font-medium">Plan Meals</h4>
                  <p className="text-sm text-muted-foreground">Plan your weekly meals</p>
                </div>
              </Link>
              <Link
                to="/cooking/shopping-list"
                className="flex items-center gap-4 p-4 rounded-lg border hover:border-cooking hover:bg-cooking/5 transition-colors"
              >
                <div className="p-3 rounded-full bg-cooking/10">
                  <ShoppingCart className="h-6 w-6 text-cooking" />
                </div>
                <div>
                  <h4 className="font-medium">Shopping List</h4>
                  <p className="text-sm text-muted-foreground">View and manage your shopping list</p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <AddRecipeModal
        open={showAddRecipe}
        onOpenChange={setShowAddRecipe}
        onSuccess={loadData}
      />
    </CookingLayout>
  );
}

export { CookingLayout, cookingNavItems };
