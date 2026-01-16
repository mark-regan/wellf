import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fixedAssetApi } from '@/api/assets';
import { FixedAsset } from '@/types';

const CATEGORIES = [
  { value: 'PROPERTY', label: 'Property' },
  { value: 'VEHICLE', label: 'Vehicle' },
  { value: 'COLLECTIBLE', label: 'Collectible' },
  { value: 'OTHER', label: 'Other' },
];

interface AddFixedAssetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset?: FixedAsset | null; // If provided, we're editing
  onSuccess: () => void;
}

export function AddFixedAssetModal({
  open,
  onOpenChange,
  asset,
  onSuccess,
}: AddFixedAssetModalProps) {
  const isEditing = !!asset;

  // Form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState('PROPERTY');
  const [currentValue, setCurrentValue] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState('GBP');

  // Loading state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset/populate form when modal opens
  useEffect(() => {
    if (open) {
      if (asset) {
        // Editing mode - populate form
        setName(asset.name);
        setCategory(asset.category);
        setCurrentValue(asset.current_value.toString());
        setPurchasePrice(asset.purchase_price?.toString() || '');
        setPurchaseDate(asset.purchase_date || '');
        setDescription(asset.description || '');
        setCurrency(asset.currency || 'GBP');
      } else {
        // Add mode - reset form
        setName('');
        setCategory('PROPERTY');
        setCurrentValue('');
        setPurchasePrice('');
        setPurchaseDate('');
        setDescription('');
        setCurrency('GBP');
      }
      setError(null);
    }
  }, [open, asset]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !currentValue) return;

    setSubmitting(true);
    setError(null);

    try {
      const data = {
        name,
        category,
        current_value: parseFloat(currentValue),
        purchase_price: purchasePrice ? parseFloat(purchasePrice) : undefined,
        purchase_date: purchaseDate || undefined,
        description: description || undefined,
        currency,
      };

      if (isEditing && asset) {
        await fixedAssetApi.update(asset.id, data);
      } else {
        await fixedAssetApi.create(data);
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      const message = err.response?.data?.error || err.message || `Failed to ${isEditing ? 'update' : 'create'} asset`;
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Fixed Asset' : 'Add Fixed Asset'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                placeholder="e.g., Main Residence"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Current Value</label>
              <Input
                type="number"
                step="any"
                placeholder="425000"
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="GBP">GBP</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Purchase Price (optional)</label>
              <Input
                type="number"
                step="any"
                placeholder="350000"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Purchase Date (optional)</label>
              <Input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Description (optional)</label>
            <Input
              placeholder="Additional notes about this asset"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !name.trim() || !currentValue}>
              {submitting ? (isEditing ? 'Saving...' : 'Adding...') : (isEditing ? 'Save Changes' : 'Add Asset')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
