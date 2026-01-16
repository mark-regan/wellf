import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
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
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  ChefHat,
  CheckCircle2,
  ShoppingCart,
  Search,
  Loader2,
} from 'lucide-react';
import { cookingApi } from '@/api/cooking';
import { MealPlan, Recipe, MealType } from '@/types';

interface DayMeals {
  date: string;
  dayName: string;
  dayNumber: number;
  isToday: boolean;
  meals: {
    breakfast: MealPlan | null;
    lunch: MealPlan | null;
    dinner: MealPlan | null;
    snack: MealPlan | null;
  };
}

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

export function CookingMealPlan() {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
    return new Date(now.setDate(diff));
  });
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedMealType, setSelectedMealType] = useState<MealType>('dinner');

  // Recipe search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Recipe[]>([]);
  const [searching, setSearching] = useState(false);
  const [customMeal, setCustomMeal] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const getWeekDates = (): DayMeals[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days: DayMeals[] = [];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      const dayMeals = mealPlans.filter((mp) => mp.plan_date === dateStr);

      days.push({
        date: dateStr,
        dayName: dayNames[i],
        dayNumber: date.getDate(),
        isToday: date.getTime() === today.getTime(),
        meals: {
          breakfast: dayMeals.find((mp) => mp.meal_type === 'breakfast') || null,
          lunch: dayMeals.find((mp) => mp.meal_type === 'lunch') || null,
          dinner: dayMeals.find((mp) => mp.meal_type === 'dinner') || null,
          snack: dayMeals.find((mp) => mp.meal_type === 'snack') || null,
        },
      });
    }

    return days;
  };

  const loadMealPlans = async () => {
    try {
      const endDate = new Date(currentWeekStart);
      endDate.setDate(endDate.getDate() + 6);

      const response = await cookingApi.getMealPlans(
        currentWeekStart.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );
      setMealPlans(response.meal_plans || []);
    } catch (err) {
      console.error('Failed to load meal plans:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadMealPlans();
  }, [currentWeekStart]);

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeekStart((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
      return newDate;
    });
  };

  const goToThisWeek = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    setCurrentWeekStart(new Date(now.setDate(diff)));
  };

  const formatWeekRange = () => {
    const endDate = new Date(currentWeekStart);
    endDate.setDate(endDate.getDate() + 6);

    const startMonth = currentWeekStart.toLocaleDateString('en-GB', { month: 'short' });
    const endMonth = endDate.toLocaleDateString('en-GB', { month: 'short' });

    if (startMonth === endMonth) {
      return `${currentWeekStart.getDate()} - ${endDate.getDate()} ${startMonth} ${currentWeekStart.getFullYear()}`;
    }
    return `${currentWeekStart.getDate()} ${startMonth} - ${endDate.getDate()} ${endMonth} ${currentWeekStart.getFullYear()}`;
  };

  const openAddModal = (date: string, mealType: MealType) => {
    setSelectedDate(date);
    setSelectedMealType(mealType);
    setSearchQuery('');
    setSearchResults([]);
    setCustomMeal('');
    setShowAddModal(true);
  };

  const handleSearch = async () => {
    if (searchQuery.length < 2) return;
    setSearching(true);
    try {
      const results = await cookingApi.listRecipes({ search: searchQuery, limit: 10 });
      setSearchResults(results);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleAddMeal = async (recipeId?: string) => {
    if (!recipeId && !customMeal.trim()) return;
    setSubmitting(true);
    try {
      await cookingApi.createMealPlan({
        plan_date: selectedDate,
        meal_type: selectedMealType,
        recipe_id: recipeId,
        custom_meal: recipeId ? undefined : customMeal.trim(),
        servings: 2,
      });
      await loadMealPlans();
      setShowAddModal(false);
    } catch (err) {
      console.error('Failed to add meal:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMeal = async (mealPlanId: string) => {
    if (!confirm('Remove this meal from the plan?')) return;
    try {
      await cookingApi.deleteMealPlan(mealPlanId);
      await loadMealPlans();
    } catch (err) {
      console.error('Failed to delete meal:', err);
    }
  };

  const handleMarkCooked = async (mealPlanId: string) => {
    try {
      await cookingApi.markMealCooked(mealPlanId);
      await loadMealPlans();
    } catch (err) {
      console.error('Failed to mark as cooked:', err);
    }
  };

  const handleGenerateShoppingList = async () => {
    const endDate = new Date(currentWeekStart);
    endDate.setDate(endDate.getDate() + 6);

    try {
      const result = await cookingApi.generateShoppingList(
        currentWeekStart.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );
      alert(`Added ${result.items_added} items to your shopping list!`);
    } catch (err) {
      console.error('Failed to generate shopping list:', err);
    }
  };

  const weekDays = getWeekDates();

  return (
    <CookingLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold">Meal Plan</h1>
            <p className="text-muted-foreground">Plan your weekly meals</p>
          </div>
          <Button onClick={handleGenerateShoppingList} className="bg-cooking hover:bg-cooking/90">
            <ShoppingCart className="mr-2 h-4 w-4" />
            Generate Shopping List
          </Button>
        </div>

        {/* Week Navigation */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={() => navigateWeek('prev')}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold">{formatWeekRange()}</h2>
                <Button variant="outline" size="sm" onClick={goToThisWeek}>
                  Today
                </Button>
              </div>
              <Button variant="ghost" size="icon" onClick={() => navigateWeek('next')}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Calendar Grid */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading meal plans...</div>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {/* Day Headers */}
            {weekDays.map((day) => (
              <div
                key={day.date}
                className={`text-center p-3 rounded-lg ${
                  day.isToday ? 'bg-cooking text-cooking-foreground' : 'bg-muted'
                }`}
              >
                <div className="text-sm font-medium">{day.dayName}</div>
                <div className="text-2xl font-bold">{day.dayNumber}</div>
              </div>
            ))}

            {/* Meal Rows */}
            {MEAL_TYPES.map((mealType) => (
              <>
                {/* Meal Type Label - spans full width on mobile */}
                <div className="col-span-7 text-sm font-medium text-muted-foreground mt-4 mb-1">
                  {MEAL_LABELS[mealType]}
                </div>
                {weekDays.map((day) => {
                  const meal = day.meals[mealType];
                  return (
                    <div
                      key={`${day.date}-${mealType}`}
                      className="min-h-[80px] border rounded-lg p-2 bg-card hover:border-cooking/50 transition-colors"
                    >
                      {meal ? (
                        <div className="h-full flex flex-col">
                          <div className="flex-1">
                            {meal.recipe ? (
                              <Link
                                to={`/cooking/recipes/${meal.recipe.id}`}
                                className="text-sm font-medium hover:text-cooking line-clamp-2"
                              >
                                {meal.recipe.title}
                              </Link>
                            ) : (
                              <span className="text-sm font-medium line-clamp-2">
                                {meal.custom_meal}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 mt-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleMarkCooked(meal.id)}
                              disabled={meal.is_cooked}
                            >
                              <CheckCircle2
                                className={`h-4 w-4 ${
                                  meal.is_cooked ? 'text-green-500' : 'text-muted-foreground'
                                }`}
                              />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleDeleteMeal(meal.id)}
                            >
                              <X className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => openAddModal(day.date, mealType)}
                          className="w-full h-full flex items-center justify-center text-muted-foreground hover:text-cooking transition-colors"
                        >
                          <Plus className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </>
            ))}
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span>Cooked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-cooking" />
            <span>Today</span>
          </div>
        </div>
      </div>

      {/* Add Meal Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Add {MEAL_LABELS[selectedMealType]} -{' '}
              {new Date(selectedDate).toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'short',
              })}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search for Recipe */}
            <div>
              <label className="text-sm font-medium mb-2 block">Search Recipes</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Search your recipes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
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

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                {searchResults.map((recipe) => (
                  <button
                    key={recipe.id}
                    className="w-full p-3 text-left hover:bg-muted flex items-center gap-3"
                    onClick={() => handleAddMeal(recipe.id)}
                    disabled={submitting}
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
                    <span className="font-medium">{recipe.title}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            {/* Custom Meal */}
            <div>
              <label className="text-sm font-medium mb-2 block">Custom Meal</label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., Leftovers, Eating out..."
                  value={customMeal}
                  onChange={(e) => setCustomMeal(e.target.value)}
                />
                <Button
                  onClick={() => handleAddMeal()}
                  disabled={submitting || !customMeal.trim()}
                  className="bg-cooking hover:bg-cooking/90"
                >
                  Add
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </CookingLayout>
  );
}
