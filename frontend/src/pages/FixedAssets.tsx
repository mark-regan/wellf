import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fixedAssetApi } from '@/api/assets';
import { FixedAsset } from '@/types';
import { formatCurrency, formatPercentage, formatDate, getChangeColor } from '@/utils/format';
import { Plus, Building2, Trash2, Edit2, X } from 'lucide-react';

const CATEGORIES = ['PROPERTY', 'VEHICLE', 'COLLECTIBLE', 'OTHER'];

export function FixedAssets() {
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState('PROPERTY');
  const [currentValue, setCurrentValue] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [description, setDescription] = useState('');

  const loadAssets = async () => {
    try {
      const data = await fixedAssetApi.list();
      setAssets(data);
    } catch (error) {
      console.error('Failed to load fixed assets:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, []);

  const resetForm = () => {
    setName('');
    setCategory('PROPERTY');
    setCurrentValue('');
    setPurchasePrice('');
    setPurchaseDate('');
    setDescription('');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !currentValue) return;

    setCreating(true);
    try {
      await fixedAssetApi.create({
        name,
        category,
        current_value: parseFloat(currentValue),
        purchase_price: purchasePrice ? parseFloat(purchasePrice) : undefined,
        purchase_date: purchaseDate || undefined,
        description: description || undefined,
      });
      resetForm();
      setShowCreate(false);
      loadAssets();
    } catch (error) {
      console.error('Failed to create fixed asset:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this asset?')) return;
    try {
      await fixedAssetApi.delete(id);
      loadAssets();
    } catch (error) {
      console.error('Failed to delete asset:', error);
    }
  };

  const totalValue = assets.reduce((sum, a) => sum + a.current_value, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fixed Assets</h1>
          <p className="text-muted-foreground">Property, vehicles, and other valuables</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Asset
        </Button>
      </div>

      {/* Total Value Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Total Fixed Assets Value</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{formatCurrency(totalValue)}</div>
        </CardContent>
      </Card>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Add Fixed Asset</h2>
                <button
                  onClick={() => setShowCreate(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
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
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
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
                  <div>
                    <label className="text-sm font-medium">Description (optional)</label>
                    <Input
                      placeholder="Additional notes"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="submit" disabled={creating}>
                    {creating ? 'Creating...' : 'Add Asset'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Assets List */}
      {assets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No fixed assets yet</h3>
            <p className="text-muted-foreground mb-4">
              Add properties, vehicles, or other valuables to track
            </p>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Asset
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {assets.map((asset) => (
            <Card key={asset.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{asset.name}</CardTitle>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                    {asset.category}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="text-2xl font-bold">
                      {formatCurrency(asset.current_value, asset.currency)}
                    </div>
                    {asset.appreciation !== undefined && (
                      <div className={`text-sm ${getChangeColor(asset.appreciation)}`}>
                        {formatCurrency(asset.appreciation, asset.currency)} (
                        {formatPercentage(asset.appreciation_pct || 0)})
                      </div>
                    )}
                  </div>
                  {asset.purchase_price && (
                    <div className="text-sm text-muted-foreground">
                      Purchased for {formatCurrency(asset.purchase_price, asset.currency)}
                      {asset.purchase_date && ` on ${formatDate(asset.purchase_date)}`}
                    </div>
                  )}
                  {asset.description && (
                    <div className="text-sm text-muted-foreground">{asset.description}</div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button variant="ghost" size="sm" disabled>
                      <Edit2 className="h-4 w-4 mr-1" /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => handleDelete(asset.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
