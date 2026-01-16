import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AddShoppingItemModal } from '@/components/cooking/AddShoppingItemModal';
import { CookingLayout } from './Cooking';
import {
  Plus,
  Trash2,
  ShoppingCart,
  Check,
} from 'lucide-react';
import { cookingApi } from '@/api/cooking';
import { ShoppingListItem } from '@/types';

const categoryColors: Record<string, string> = {
  produce: 'bg-green-500',
  dairy: 'bg-blue-500',
  meat: 'bg-red-500',
  bakery: 'bg-amber-500',
  frozen: 'bg-cyan-500',
  pantry: 'bg-orange-500',
  other: 'bg-gray-500',
};

export function CookingShoppingList() {
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [uncheckedCount, setUncheckedCount] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const data = await cookingApi.getShoppingList();
      setItems(data.items);
      setTotalCount(data.total);
      setUncheckedCount(data.unchecked);
    } catch (error) {
      console.error('Failed to load shopping list:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSuccess = (newItem: ShoppingListItem) => {
    setItems([...items, newItem]);
    setTotalCount(totalCount + 1);
    setUncheckedCount(uncheckedCount + 1);
  };

  const handleToggleItem = async (id: string) => {
    try {
      const isChecked = await cookingApi.toggleShoppingItem(id);
      setItems(items.map(item =>
        item.id === id ? { ...item, is_checked: isChecked } : item
      ));
      setUncheckedCount(isChecked ? uncheckedCount - 1 : uncheckedCount + 1);
    } catch (error) {
      console.error('Failed to toggle item:', error);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await cookingApi.deleteShoppingItem(id);
      const item = items.find(i => i.id === id);
      setItems(items.filter(i => i.id !== id));
      setTotalCount(totalCount - 1);
      if (item && !item.is_checked) {
        setUncheckedCount(uncheckedCount - 1);
      }
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  const handleClearChecked = async () => {
    if (!confirm('Clear all checked items?')) return;
    try {
      const removed = await cookingApi.clearCheckedItems();
      setItems(items.filter(i => !i.is_checked));
      setTotalCount(totalCount - removed);
    } catch (error) {
      console.error('Failed to clear checked items:', error);
    }
  };

  // Group items by category
  const groupedItems = items.reduce((acc, item) => {
    const category = item.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, ShoppingListItem[]>);

  // Sort categories
  const sortedCategories = Object.keys(groupedItems).sort((a, b) => {
    const order = ['produce', 'dairy', 'meat', 'bakery', 'frozen', 'pantry', 'other'];
    return order.indexOf(a) - order.indexOf(b);
  });

  const checkedCount = totalCount - uncheckedCount;

  return (
    <CookingLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Shopping List</h1>
            <p className="text-muted-foreground">
              {uncheckedCount} item{uncheckedCount !== 1 ? 's' : ''} remaining
              {checkedCount > 0 && ` • ${checkedCount} checked`}
            </p>
          </div>
          {checkedCount > 0 && (
            <Button variant="outline" onClick={handleClearChecked}>
              <Check className="mr-2 h-4 w-4" />
              Clear Checked
            </Button>
          )}
        </div>

        {/* Add Shopping Item Modal */}
        <AddShoppingItemModal
          open={showAddModal}
          onOpenChange={setShowAddModal}
          onSuccess={handleAddSuccess}
        />

        {/* Add Item Button */}
        <Button onClick={() => setShowAddModal(true)} className="bg-cooking hover:bg-cooking/90">
          <Plus className="mr-2 h-4 w-4" />
          Add Item
        </Button>

        {/* Shopping List */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <ShoppingCart className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="font-medium text-lg mb-2">Your shopping list is empty</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Add items manually above, or generate a list from your meal plan.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sortedCategories.map((category) => (
              <Card key={category}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className={`w-3 h-3 rounded-full ${categoryColors[category] || 'bg-gray-500'}`} />
                    <span className="capitalize">{category}</span>
                    <span className="text-muted-foreground font-normal">
                      ({groupedItems[category].filter(i => !i.is_checked).length})
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-1">
                    {groupedItems[category].map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center gap-3 p-2 rounded hover:bg-muted/50 transition-colors ${
                          item.is_checked ? 'opacity-50' : ''
                        }`}
                      >
                        <Checkbox
                          checked={item.is_checked}
                          onCheckedChange={() => handleToggleItem(item.id)}
                        />
                        <div className={`flex-1 ${item.is_checked ? 'line-through' : ''}`}>
                          <span className="font-medium">{item.ingredient_name}</span>
                          {(item.amount || item.unit) && (
                            <span className="text-muted-foreground ml-2">
                              {item.amount} {item.unit}
                            </span>
                          )}
                          {item.recipe_name && (
                            <span className="text-xs text-muted-foreground ml-2">
                              ({item.recipe_name})
                            </span>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteItem(item.id)}
                          className="h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </CookingLayout>
  );
}
