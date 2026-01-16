import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cookingApi } from '@/api/cooking';
import { ShoppingListItem, ShoppingCategory } from '@/types';

const categories: { value: ShoppingCategory | ''; label: string }[] = [
  { value: '', label: 'No category' },
  { value: 'produce', label: 'Produce' },
  { value: 'dairy', label: 'Dairy' },
  { value: 'meat', label: 'Meat' },
  { value: 'bakery', label: 'Bakery' },
  { value: 'frozen', label: 'Frozen' },
  { value: 'pantry', label: 'Pantry' },
  { value: 'other', label: 'Other' },
];

interface AddShoppingItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (item: ShoppingListItem) => void;
}

export function AddShoppingItemModal({
  open,
  onOpenChange,
  onSuccess,
}: AddShoppingItemModalProps) {
  // Form state
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState('');
  const [category, setCategory] = useState<ShoppingCategory | ''>('');

  // Loading state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setName('');
      setAmount('');
      setUnit('');
      setCategory('');
      setError(null);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const newItem = await cookingApi.addShoppingItem({
        ingredient_name: name.trim(),
        amount: amount.trim() || undefined,
        unit: unit.trim() || undefined,
        category: category || undefined,
      });
      onSuccess(newItem);
      onOpenChange(false);
    } catch (err: any) {
      const message = err.response?.data?.error || err.message || 'Failed to add item';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Shopping Item</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}

          <div>
            <label className="text-sm font-medium">Item Name</label>
            <Input
              placeholder="e.g., Chicken breast"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="grid gap-4 grid-cols-2">
            <div>
              <label className="text-sm font-medium">Amount (optional)</label>
              <Input
                placeholder="e.g., 500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Unit (optional)</label>
              <Input
                placeholder="e.g., g, kg, ml"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Category (optional)</label>
            <Select value={category} onValueChange={(v) => setCategory(v as ShoppingCategory | '')}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.value || 'none'} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-cooking hover:bg-cooking/90"
              disabled={submitting || !name.trim()}
            >
              {submitting ? 'Adding...' : 'Add Item'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
