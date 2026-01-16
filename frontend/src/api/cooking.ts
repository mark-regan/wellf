import api from './client';
import {
  Recipe,
  RecipeCollection,
  MealPlan,
  ShoppingListItem,
  CookingSummary,
  CreateRecipeRequest,
  UpdateRecipeRequest,
  CreateMealPlanRequest,
  AddShoppingItemRequest,
} from '@/types';

// Response types
interface RecipesResponse {
  recipes: Recipe[];
}

interface RecipeMatch {
  recipe: Recipe;
  matching_count: number;
  total_ingredients: number;
}

interface IngredientSearchResponse {
  results: RecipeMatch[];
  searched_for: string[];
  total_results: number;
}

interface RecipeResponse {
  recipe: Recipe;
  collections?: RecipeCollection[];
}

interface CollectionsResponse {
  collections: RecipeCollection[];
}

interface CollectionResponse {
  collection: RecipeCollection;
  recipes: Recipe[];
}

interface MealPlansResponse {
  meal_plans: MealPlan[];
  start_date: string;
  end_date: string;
}

interface ShoppingListResponse {
  items: ShoppingListItem[];
  total: number;
  unchecked: number;
}

// Recipe filters
interface RecipeFilters {
  search?: string;
  course?: string;
  cuisine?: string;
  favourites?: boolean;
  sort?: 'created' | 'title' | 'rating' | 'times_cooked' | 'last_cooked';
  limit?: number;
}

export const cookingApi = {
  // =============================================================================
  // Recipes
  // =============================================================================

  listRecipes: async (filters?: RecipeFilters): Promise<Recipe[]> => {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.course) params.append('course', filters.course);
    if (filters?.cuisine) params.append('cuisine', filters.cuisine);
    if (filters?.favourites) params.append('favourites', 'true');
    if (filters?.sort) params.append('sort', filters.sort);
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const url = queryString ? `/recipes?${queryString}` : '/recipes';
    const response = await api.get<RecipesResponse>(url);
    return response.data.recipes;
  },

  getRecipe: async (id: string): Promise<RecipeResponse> => {
    const response = await api.get<RecipeResponse>(`/recipes/${id}`);
    return response.data;
  },

  createRecipe: async (data: CreateRecipeRequest): Promise<Recipe> => {
    const response = await api.post<Recipe>('/recipes', data);
    return response.data;
  },

  updateRecipe: async (id: string, data: UpdateRecipeRequest): Promise<Recipe> => {
    const response = await api.put<Recipe>(`/recipes/${id}`, data);
    return response.data;
  },

  deleteRecipe: async (id: string): Promise<void> => {
    await api.delete(`/recipes/${id}`);
  },

  markRecipeCooked: async (id: string): Promise<void> => {
    await api.post(`/recipes/${id}/cook`);
  },

  toggleFavourite: async (id: string): Promise<boolean> => {
    const response = await api.post<{ is_favourite: boolean }>(`/recipes/${id}/favourite`);
    return response.data.is_favourite;
  },

  importFromURL: async (url: string): Promise<Recipe> => {
    const response = await api.post<Recipe>('/recipes/import-url', { url });
    return response.data;
  },

  searchByIngredients: async (ingredients: string[], limit?: number): Promise<IngredientSearchResponse> => {
    const params = new URLSearchParams();
    params.append('ingredients', ingredients.join(','));
    if (limit) params.append('limit', limit.toString());
    const response = await api.get<IngredientSearchResponse>(`/recipes/search-by-ingredients?${params.toString()}`);
    return response.data;
  },

  // =============================================================================
  // Collections
  // =============================================================================

  listCollections: async (): Promise<RecipeCollection[]> => {
    const response = await api.get<CollectionsResponse>('/recipe-collections');
    return response.data.collections;
  },

  getCollection: async (id: string): Promise<CollectionResponse> => {
    const response = await api.get<CollectionResponse>(`/recipe-collections/${id}`);
    return response.data;
  },

  createCollection: async (name: string, description?: string): Promise<RecipeCollection> => {
    const response = await api.post<RecipeCollection>('/recipe-collections', { name, description });
    return response.data;
  },

  updateCollection: async (id: string, name: string, description?: string): Promise<RecipeCollection> => {
    const response = await api.put<RecipeCollection>(`/recipe-collections/${id}`, { name, description });
    return response.data;
  },

  deleteCollection: async (id: string): Promise<void> => {
    await api.delete(`/recipe-collections/${id}`);
  },

  addRecipeToCollection: async (collectionId: string, recipeId: string): Promise<void> => {
    await api.post(`/recipe-collections/${collectionId}/recipes`, { recipe_id: recipeId });
  },

  removeRecipeFromCollection: async (collectionId: string, recipeId: string): Promise<void> => {
    await api.delete(`/recipe-collections/${collectionId}/recipes/${recipeId}`);
  },

  // =============================================================================
  // Meal Plans
  // =============================================================================

  getMealPlans: async (startDate?: string, endDate?: string): Promise<MealPlansResponse> => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const queryString = params.toString();
    const url = queryString ? `/meal-plans?${queryString}` : '/meal-plans';
    const response = await api.get<MealPlansResponse>(url);
    return response.data;
  },

  createMealPlan: async (data: CreateMealPlanRequest): Promise<MealPlan> => {
    const response = await api.post<MealPlan>('/meal-plans', data);
    return response.data;
  },

  deleteMealPlan: async (id: string): Promise<void> => {
    await api.delete(`/meal-plans/${id}`);
  },

  markMealCooked: async (id: string): Promise<void> => {
    await api.post(`/meal-plans/${id}/cook`);
  },

  generateShoppingList: async (startDate: string, endDate: string): Promise<{ items_added: number }> => {
    const response = await api.post<{ items_added: number; message: string }>('/meal-plans/generate-list', {
      start_date: startDate,
      end_date: endDate,
    });
    return response.data;
  },

  // =============================================================================
  // Shopping List
  // =============================================================================

  getShoppingList: async (): Promise<ShoppingListResponse> => {
    const response = await api.get<ShoppingListResponse>('/shopping-list');
    return response.data;
  },

  addShoppingItem: async (data: AddShoppingItemRequest): Promise<ShoppingListItem> => {
    const response = await api.post<ShoppingListItem>('/shopping-list', data);
    return response.data;
  },

  toggleShoppingItem: async (id: string): Promise<boolean> => {
    const response = await api.put<{ is_checked: boolean }>(`/shopping-list/${id}`);
    return response.data.is_checked;
  },

  deleteShoppingItem: async (id: string): Promise<void> => {
    await api.delete(`/shopping-list/${id}`);
  },

  clearCheckedItems: async (): Promise<number> => {
    const response = await api.delete<{ message: string; items_removed: number }>('/shopping-list/checked');
    return response.data.items_removed;
  },

  // =============================================================================
  // Summary
  // =============================================================================

  getSummary: async (): Promise<CookingSummary> => {
    const response = await api.get<CookingSummary>('/cooking/summary');
    return response.data;
  },
};
