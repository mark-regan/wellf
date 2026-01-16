import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HubLayout } from '@/components/layout/HubLayout';
import { AddFixedAssetModal } from '@/components/finance/AddFixedAssetModal';
import { fixedAssetApi } from '@/api/assets';
import { FixedAsset } from '@/types';
import { formatCurrency, formatPercentage, formatDate, getChangeColor } from '@/utils/format';
import {
  Plus,
  Building2,
  Trash2,
  Edit2,
  Wallet,
  LayoutDashboard,
  FolderKanban,
  PieChart,
  TrendingUp,
  CircleDollarSign,
  Landmark,
} from 'lucide-react';

const financeNavItems = [
  { label: 'Overview', href: '/finance', icon: LayoutDashboard },
  { label: 'Portfolios', href: '/portfolios', icon: FolderKanban },
  { label: 'Holdings', href: '/holdings', icon: PieChart },
  { label: 'Charts', href: '/charts', icon: TrendingUp },
  { label: 'Prices', href: '/prices', icon: CircleDollarSign },
  { label: 'Fixed Assets', href: '/fixed-assets', icon: Landmark },
];

const FinanceLayout = ({ children }: { children: React.ReactNode }) => (
  <HubLayout
    title="Finance"
    description="Track portfolios, investments, and financial goals"
    icon={Wallet}
    color="finance"
    navItems={financeNavItems}
  >
    {children}
  </HubLayout>
);

export function FixedAssets() {
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<FixedAsset | null>(null);

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

  const handleEdit = (asset: FixedAsset) => {
    setEditingAsset(asset);
    setShowAddModal(true);
  };

  const handleModalClose = (open: boolean) => {
    setShowAddModal(open);
    if (!open) {
      setEditingAsset(null);
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
      <FinanceLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </FinanceLayout>
    );
  }

  return (
    <FinanceLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Fixed Assets</h1>
            <p className="text-muted-foreground">Property, vehicles, and other valuables</p>
          </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Asset
        </Button>
      </div>

      {/* Add/Edit Fixed Asset Modal */}
      <AddFixedAssetModal
        open={showAddModal}
        onOpenChange={handleModalClose}
        asset={editingAsset}
        onSuccess={loadAssets}
      />

      {/* Total Value Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Total Fixed Assets Value</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{formatCurrency(totalValue)}</div>
        </CardContent>
      </Card>

      {/* Assets List */}
      {assets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No fixed assets yet</h3>
            <p className="text-muted-foreground mb-4">
              Add properties, vehicles, or other valuables to track
            </p>
            <Button onClick={() => setShowAddModal(true)}>
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
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(asset)}>
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
    </FinanceLayout>
  );
}
