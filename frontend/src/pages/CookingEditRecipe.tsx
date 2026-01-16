import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
import { CookingLayout } from './Cooking';
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChefHat,
  Clock,
  Users,
  Globe,
  Star,
} from 'lucide-react';
import { cookingApi } from '@/api/cooking';
import { UpdateRecipeRequest, Ingredient, Instruction, Course, Recipe } from '@/types';

const courses: { value: Course; label: string }[] = [
  { value: 'starter', label: 'Starter' },
  { value: 'main', label: 'Main Course' },
  { value: 'dessert', label: 'Dessert' },
  { value: 'side', label: 'Side Dish' },
  { value: 'snack', label: 'Snack' },
  { value: 'drink', label: 'Drink' },
];

const commonCuisines = [
  'British', 'Italian', 'French', 'Chinese', 'Japanese', 'Thai', 'Indian',
  'Mexican', 'American', 'Greek', 'Spanish', 'Vietnamese', 'Korean', 'Other'
];

export function CookingEditRecipe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [originalRecipe, setOriginalRecipe] = useState<Recipe | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [servings, setServings] = useState('');
  const [course, setCourse] = useState<Course | undefined>(undefined);
  const [cuisine, setCuisine] = useState<string | undefined>(undefined);
  const [ingredients, setIngredients] = useState<Ingredient[]>([{ name: '', amount: '', unit: '' }]);
  const [instructions, setInstructions] = useState<Instruction[]>([{ step: 1, text: '' }]);
  const [dietTags, setDietTags] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [rating, setRating] = useState<number | null>(null);

  useEffect(() => {
    const loadRecipe = async () => {
      if (!id) return;
      try {
        const data = await cookingApi.getRecipe(id);
        const recipe = data.recipe;
        setOriginalRecipe(recipe);

        // Populate form
        setTitle(recipe.title);
        setDescription(recipe.description || '');
        setSourceUrl(recipe.source_url || '');
        setSourceName(recipe.source_name || '');
        setImageUrl(recipe.image_url || '');
        setPrepTime(recipe.prep_time_minutes?.toString() || '');
        setCookTime(recipe.cook_time_minutes?.toString() || '');
        setServings(recipe.servings?.toString() || '');
        setCourse(recipe.course || undefined);
        setCuisine(recipe.cuisine || undefined);
        setIngredients(recipe.ingredients.length > 0 ? recipe.ingredients : [{ name: '', amount: '', unit: '' }]);
        setInstructions(recipe.instructions.length > 0 ? recipe.instructions : [{ step: 1, text: '' }]);
        setDietTags(recipe.diet_tags || []);
        setNotes(recipe.notes || '');
        setRating(recipe.rating || null);
      } catch (err) {
        setError('Recipe not found');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadRecipe();
  }, [id]);

  const addIngredient = () => {
    setIngredients([...ingredients, { name: '', amount: '', unit: '' }]);
  };

  const removeIngredient = (index: number) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((_, i) => i !== index));
    }
  };

  const updateIngredient = (index: number, field: keyof Ingredient, value: string) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  const addInstruction = () => {
    setInstructions([...instructions, { step: instructions.length + 1, text: '' }]);
  };

  const removeInstruction = (index: number) => {
    if (instructions.length > 1) {
      const updated = instructions.filter((_, i) => i !== index);
      setInstructions(updated.map((inst, i) => ({ ...inst, step: i + 1 })));
    }
  };

  const updateInstruction = (index: number, text: string) => {
    const updated = [...instructions];
    updated[index] = { ...updated[index], text };
    setInstructions(updated);
  };

  const toggleDietTag = (tag: string) => {
    if (dietTags.includes(tag)) {
      setDietTags(dietTags.filter(t => t !== tag));
    } else {
      setDietTags([...dietTags, tag]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !title.trim()) {
      setError('Recipe title is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const recipeData: UpdateRecipeRequest = {
        title: title.trim(),
        description: description.trim() || undefined,
        source_url: sourceUrl.trim() || undefined,
        source_name: sourceName.trim() || undefined,
        image_url: imageUrl.trim() || undefined,
        prep_time_minutes: prepTime ? parseInt(prepTime) : undefined,
        cook_time_minutes: cookTime ? parseInt(cookTime) : undefined,
        total_time_minutes: prepTime || cookTime
          ? (parseInt(prepTime || '0') + parseInt(cookTime || '0')) || undefined
          : undefined,
        servings: servings ? parseInt(servings) : undefined,
        course: course,
        cuisine: cuisine,
        ingredients: ingredients.filter(i => i.name.trim()),
        instructions: instructions.filter(i => i.text.trim()),
        diet_tags: dietTags.length > 0 ? dietTags : undefined,
        notes: notes.trim() || undefined,
        rating: rating || undefined,
      };

      await cookingApi.updateRecipe(id, recipeData);
      navigate(`/cooking/recipes/${id}`);
    } catch (err) {
      setError('Failed to update recipe. Please try again.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const dietTagOptions = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Nut-Free', 'Low-Carb', 'Keto', 'Paleo'];

  if (loading) {
    return (
      <CookingLayout>
        <div className="text-center py-12 text-muted-foreground">Loading recipe...</div>
      </CookingLayout>
    );
  }

  if (error && !originalRecipe) {
    return (
      <CookingLayout>
        <div className="text-center py-12">
          <ChefHat className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-xl font-medium mb-2">{error}</h2>
          <Button asChild variant="outline">
            <Link to="/cooking/recipes">Back to Recipes</Link>
          </Button>
        </div>
      </CookingLayout>
    );
  }

  return (
    <CookingLayout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-display text-2xl font-bold">Edit Recipe</h1>
            <p className="text-muted-foreground">Update "{originalRecipe?.title}"</p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChefHat className="h-5 w-5 text-cooking" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Recipe Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter recipe title"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the recipe"
                  rows={3}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="course">Course</Label>
                  <Select value={course} onValueChange={(v) => setCourse(v as Course)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="cuisine">Cuisine</Label>
                  <Select value={cuisine} onValueChange={setCuisine}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select cuisine" />
                    </SelectTrigger>
                    <SelectContent>
                      {commonCuisines.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Time & Servings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-cooking" />
                Time & Servings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label htmlFor="prepTime">Prep Time (mins)</Label>
                  <Input
                    id="prepTime"
                    type="number"
                    min="0"
                    value={prepTime}
                    onChange={(e) => setPrepTime(e.target.value)}
                    placeholder="15"
                  />
                </div>
                <div>
                  <Label htmlFor="cookTime">Cook Time (mins)</Label>
                  <Input
                    id="cookTime"
                    type="number"
                    min="0"
                    value={cookTime}
                    onChange={(e) => setCookTime(e.target.value)}
                    placeholder="30"
                  />
                </div>
                <div>
                  <Label htmlFor="servings" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Servings
                  </Label>
                  <Input
                    id="servings"
                    type="number"
                    min="1"
                    value={servings}
                    onChange={(e) => setServings(e.target.value)}
                    placeholder="4"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rating */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-cooking" />
                Rating
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <Button
                    key={value}
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10"
                    onClick={() => setRating(rating === value ? null : value)}
                  >
                    <Star
                      className={`h-6 w-6 ${
                        rating && value <= rating
                          ? 'fill-cooking text-cooking'
                          : 'text-muted-foreground'
                      }`}
                    />
                  </Button>
                ))}
                {rating && (
                  <span className="text-sm text-muted-foreground ml-2">
                    {rating}/5
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Source & Image */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-cooking" />
                Source & Image
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="sourceUrl">Source URL</Label>
                  <Input
                    id="sourceUrl"
                    type="url"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label htmlFor="sourceName">Source Name</Label>
                  <Input
                    id="sourceName"
                    value={sourceName}
                    onChange={(e) => setSourceName(e.target.value)}
                    placeholder="e.g., BBC Good Food"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="imageUrl">Image URL</Label>
                <Input
                  id="imageUrl"
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                />
                {imageUrl && (
                  <div className="mt-2">
                    <img
                      src={imageUrl}
                      alt="Recipe preview"
                      className="w-32 h-32 object-cover rounded"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Ingredients */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Ingredients</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addIngredient}>
                <Plus className="mr-1 h-4 w-4" />
                Add
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {ingredients.map((ing, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <Input
                    placeholder="Amount"
                    value={ing.amount}
                    onChange={(e) => updateIngredient(index, 'amount', e.target.value)}
                    className="w-20"
                  />
                  <Input
                    placeholder="Unit"
                    value={ing.unit}
                    onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                    className="w-24"
                  />
                  <Input
                    placeholder="Ingredient name"
                    value={ing.name}
                    onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeIngredient(index)}
                    disabled={ingredients.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Instructions</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addInstruction}>
                <Plus className="mr-1 h-4 w-4" />
                Add Step
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {instructions.map((inst, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <div className="w-8 h-8 rounded-full bg-cooking/10 text-cooking flex items-center justify-center font-medium text-sm flex-shrink-0">
                    {inst.step}
                  </div>
                  <Textarea
                    placeholder={`Step ${inst.step} instructions...`}
                    value={inst.text}
                    onChange={(e) => updateInstruction(index, e.target.value)}
                    className="flex-1"
                    rows={2}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeInstruction(index)}
                    disabled={instructions.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Diet Tags */}
          <Card>
            <CardHeader>
              <CardTitle>Dietary Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {dietTagOptions.map((tag) => (
                  <Button
                    key={tag}
                    type="button"
                    variant={dietTags.includes(tag) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleDietTag(tag)}
                    className={dietTags.includes(tag) ? 'bg-cooking hover:bg-cooking/90' : ''}
                  >
                    {tag}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes, tips, or variations..."
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex gap-4 justify-end">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-cooking hover:bg-cooking/90" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </CookingLayout>
  );
}
