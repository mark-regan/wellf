import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  ChefHat,
  Clock,
  ListOrdered,
  Tags,
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Check,
  Link2,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { cookingApi } from '@/api/cooking';
import { CreateRecipeRequest, Ingredient, Instruction, Course, Recipe } from '@/types';

type AddMode = 'choose' | 'url' | 'manual';

interface AddRecipeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

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
  'Mexican', 'American', 'Greek', 'Spanish', 'Vietnamese', 'Korean', 'Mediterranean'
];

const dietTagOptions = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Nut-Free', 'Low-Carb', 'Keto', 'Paleo'];

const STEPS = [
  { id: 1, label: 'Basic Info', icon: ChefHat },
  { id: 2, label: 'Time & Details', icon: Clock },
  { id: 3, label: 'Ingredients', icon: ListOrdered },
  { id: 4, label: 'Instructions', icon: ListOrdered },
  { id: 5, label: 'Tags & Notes', icon: Tags },
];

export function AddRecipeModal({ open, onOpenChange, onSuccess }: AddRecipeModalProps) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AddMode>('choose');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // URL import state
  const [importUrl, setImportUrl] = useState('');
  const [importedRecipe, setImportedRecipe] = useState<Recipe | null>(null);

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

  const resetForm = () => {
    setMode('choose');
    setStep(1);
    setImportUrl('');
    setImportedRecipe(null);
    setTitle('');
    setDescription('');
    setSourceUrl('');
    setSourceName('');
    setImageUrl('');
    setPrepTime('');
    setCookTime('');
    setServings('');
    setCourse(undefined);
    setCuisine(undefined);
    setIngredients([{ name: '', amount: '', unit: '' }]);
    setInstructions([{ step: 1, text: '' }]);
    setDietTags([]);
    setNotes('');
    setError(null);
  };

  const handleImportFromUrl = async () => {
    if (!importUrl.trim()) {
      setError('Please enter a URL');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const recipe = await cookingApi.importFromURL(importUrl.trim());
      setImportedRecipe(recipe);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import recipe';
      setError(errorMessage.includes('Failed to import') ? errorMessage : 'Failed to import recipe. Make sure the URL contains recipe data.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewImportedRecipe = () => {
    if (importedRecipe) {
      onSuccess();
      handleClose();
      navigate(`/cooking/recipes/${importedRecipe.id}`);
    }
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  // Ingredient helpers
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

  // Instruction helpers
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

  const canProceed = () => {
    switch (step) {
      case 1:
        return title.trim().length > 0;
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Recipe title is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const recipeData: CreateRecipeRequest = {
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
        course,
        cuisine,
        ingredients: ingredients.filter(i => i.name.trim()),
        instructions: instructions.filter(i => i.text.trim()),
        diet_tags: dietTags.length > 0 ? dietTags : undefined,
        notes: notes.trim() || undefined,
      };

      await cookingApi.createRecipe(recipeData);
      onSuccess();
      handleClose();
    } catch (err) {
      setError('Failed to create recipe. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderModeSelector = () => (
    <div className="space-y-6 py-4">
      <div className="text-center">
        <ChefHat className="h-12 w-12 mx-auto text-cooking mb-3" />
        <h3 className="font-medium text-lg">How would you like to add a recipe?</h3>
        <p className="text-sm text-muted-foreground">Choose your preferred method</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <button
          onClick={() => setMode('url')}
          className="flex flex-col items-center p-6 border-2 rounded-lg hover:border-cooking hover:bg-cooking/5 transition-colors text-left"
        >
          <Link2 className="h-10 w-10 text-cooking mb-3" />
          <span className="font-medium">Import from URL</span>
          <span className="text-sm text-muted-foreground text-center mt-1">
            Paste a link to automatically extract recipe details
          </span>
        </button>

        <button
          onClick={() => setMode('manual')}
          className="flex flex-col items-center p-6 border-2 rounded-lg hover:border-cooking hover:bg-cooking/5 transition-colors text-left"
        >
          <Plus className="h-10 w-10 text-cooking mb-3" />
          <span className="font-medium">Add Manually</span>
          <span className="text-sm text-muted-foreground text-center mt-1">
            Enter the recipe details step by step
          </span>
        </button>
      </div>
    </div>
  );

  const renderUrlImport = () => (
    <div className="space-y-6 py-4">
      {!importedRecipe ? (
        <>
          <div className="text-center">
            <Link2 className="h-12 w-12 mx-auto text-cooking mb-3" />
            <h3 className="font-medium text-lg">Import from URL</h3>
            <p className="text-sm text-muted-foreground">
              Paste a recipe URL from sites like BBC Good Food, AllRecipes, or similar
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="importUrl">Recipe URL</Label>
              <Input
                id="importUrl"
                type="url"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://www.bbcgoodfood.com/recipes/..."
                autoFocus
              />
            </div>

            <Button
              onClick={handleImportFromUrl}
              disabled={loading || !importUrl.trim()}
              className="w-full bg-cooking hover:bg-cooking/90"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Import Recipe
                </>
              )}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            <p className="font-medium mb-1">Supported sites include:</p>
            <p>BBC Good Food, AllRecipes, Food Network, Taste.com.au, and most recipe websites with structured data</p>
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <div className="text-center">
            <Check className="h-12 w-12 mx-auto text-green-500 mb-3" />
            <h3 className="font-medium text-lg">Recipe Imported!</h3>
            <p className="text-sm text-muted-foreground">
              Your recipe has been saved to your collection
            </p>
          </div>

          <div className="border rounded-lg p-4 space-y-3">
            {importedRecipe.image_url && (
              <img
                src={importedRecipe.image_url}
                alt={importedRecipe.title}
                className="w-full h-48 object-cover rounded"
              />
            )}
            <h4 className="font-medium">{importedRecipe.title}</h4>
            {importedRecipe.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {importedRecipe.description}
              </p>
            )}
            <div className="flex gap-4 text-sm text-muted-foreground">
              {importedRecipe.total_time_minutes && (
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {importedRecipe.total_time_minutes}min
                </span>
              )}
              {importedRecipe.servings && (
                <span>{importedRecipe.servings} servings</span>
              )}
              {importedRecipe.source_name && (
                <span>from {importedRecipe.source_name}</span>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setImportedRecipe(null);
                setImportUrl('');
              }}
              className="flex-1"
            >
              Import Another
            </Button>
            <Button
              onClick={handleViewImportedRecipe}
              className="flex-1 bg-cooking hover:bg-cooking/90"
            >
              View Recipe
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {STEPS.map((s, index) => (
        <div key={s.id} className="flex items-center">
          <button
            onClick={() => step > s.id && setStep(s.id)}
            disabled={step < s.id}
            className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
              step === s.id
                ? 'bg-cooking text-white'
                : step > s.id
                ? 'bg-cooking/20 text-cooking cursor-pointer hover:bg-cooking/30'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {step > s.id ? <Check className="h-4 w-4" /> : s.id}
          </button>
          {index < STEPS.length - 1 && (
            <div className={`w-8 h-0.5 mx-1 ${step > s.id ? 'bg-cooking' : 'bg-muted'}`} />
          )}
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <ChefHat className="h-10 w-10 mx-auto text-cooking mb-2" />
        <h3 className="font-medium">Basic Information</h3>
        <p className="text-sm text-muted-foreground">Start with the recipe essentials</p>
      </div>

      <div>
        <Label htmlFor="title">Recipe Title *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Spaghetti Bolognese"
          autoFocus
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="A brief description of the dish..."
          rows={3}
        />
      </div>

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
              className="w-24 h-24 object-cover rounded"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          </div>
        )}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <Clock className="h-10 w-10 mx-auto text-cooking mb-2" />
        <h3 className="font-medium">Time & Details</h3>
        <p className="text-sm text-muted-foreground">How long does it take?</p>
      </div>

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
          <Label htmlFor="servings">Servings</Label>
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Course</Label>
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
          <Label>Cuisine</Label>
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
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <ListOrdered className="h-10 w-10 mx-auto text-cooking mb-2" />
        <h3 className="font-medium">Ingredients</h3>
        <p className="text-sm text-muted-foreground">What do you need?</p>
      </div>

      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
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
              className="w-20"
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
      </div>

      <Button type="button" variant="outline" size="sm" onClick={addIngredient} className="w-full">
        <Plus className="mr-1 h-4 w-4" />
        Add Ingredient
      </Button>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <ListOrdered className="h-10 w-10 mx-auto text-cooking mb-2" />
        <h3 className="font-medium">Instructions</h3>
        <p className="text-sm text-muted-foreground">How do you make it?</p>
      </div>

      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
        {instructions.map((inst, index) => (
          <div key={index} className="flex gap-2 items-start">
            <div className="w-8 h-8 rounded-full bg-cooking/10 text-cooking flex items-center justify-center font-medium text-sm flex-shrink-0">
              {inst.step}
            </div>
            <Textarea
              placeholder={`Step ${inst.step}...`}
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
      </div>

      <Button type="button" variant="outline" size="sm" onClick={addInstruction} className="w-full">
        <Plus className="mr-1 h-4 w-4" />
        Add Step
      </Button>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <Tags className="h-10 w-10 mx-auto text-cooking mb-2" />
        <h3 className="font-medium">Tags & Notes</h3>
        <p className="text-sm text-muted-foreground">Add dietary info and notes</p>
      </div>

      <div>
        <Label className="mb-3 block">Dietary Tags</Label>
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
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any tips, variations, or additional notes..."
          rows={4}
        />
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center">
            {mode === 'choose' ? 'Add New Recipe' : mode === 'url' ? 'Import from URL' : 'Add Recipe'}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md mb-4">
            {error}
          </div>
        )}

        {mode === 'choose' && renderModeSelector()}

        {mode === 'url' && (
          <>
            {renderUrlImport()}
            {!importedRecipe && (
              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={() => setMode('choose')}>
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Back
                </Button>
              </div>
            )}
          </>
        )}

        {mode === 'manual' && (
          <>
            {renderStepIndicator()}

            <div className="min-h-[350px]">
              {step === 1 && renderStep1()}
              {step === 2 && renderStep2()}
              {step === 3 && renderStep3()}
              {step === 4 && renderStep4()}
              {step === 5 && renderStep5()}
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => step > 1 ? setStep(step - 1) : setMode('choose')}
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                {step === 1 ? 'Back' : 'Previous'}
              </Button>

              {step < 5 ? (
                <Button
                  onClick={() => setStep(step + 1)}
                  disabled={!canProceed()}
                  className="bg-cooking hover:bg-cooking/90"
                >
                  Next
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={loading || !title.trim()}
                  className="bg-cooking hover:bg-cooking/90"
                >
                  {loading ? 'Saving...' : 'Save Recipe'}
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
