import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { HouseholdLayout } from './Household';
import {
  CreditCard,
  Plus,
  Tv,
  Cloud,
  Gamepad2,
  Code,
  Newspaper,
  RefreshCw,
  TrendingUp,
  Trash2,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import { householdApi } from '@/api/household';
import { Subscription, CreateSubscriptionRequest, SubscriptionCategory, BillFrequency } from '@/types';
import { formatCurrency } from '@/utils/format';

const SUBSCRIPTION_CATEGORIES: { value: SubscriptionCategory; label: string; icon: React.ReactNode }[] = [
  { value: 'streaming', label: 'Streaming', icon: <Tv className="h-4 w-4" /> },
  { value: 'software', label: 'Software', icon: <Code className="h-4 w-4" /> },
  { value: 'news', label: 'News & Media', icon: <Newspaper className="h-4 w-4" /> },
  { value: 'fitness', label: 'Fitness', icon: <RefreshCw className="h-4 w-4" /> },
  { value: 'gaming', label: 'Gaming', icon: <Gamepad2 className="h-4 w-4" /> },
  { value: 'cloud', label: 'Cloud Storage', icon: <Cloud className="h-4 w-4" /> },
  { value: 'other', label: 'Other', icon: <CreditCard className="h-4 w-4" /> },
];

const FREQUENCIES: { value: BillFrequency; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
];

const getCategoryIcon = (category: SubscriptionCategory) => {
  const cat = SUBSCRIPTION_CATEGORIES.find((c) => c.value === category);
  return cat?.icon || <CreditCard className="h-4 w-4" />;
};

export function HouseholdSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [filter, setFilter] = useState<'active' | 'trial' | 'all'>('active');
  const [newSub, setNewSub] = useState<CreateSubscriptionRequest>({
    name: '',
    category: 'streaming',
    amount: 0,
    frequency: 'monthly',
  });

  const loadSubscriptions = async () => {
    try {
      const data = await householdApi.listSubscriptions({ all: filter === 'all' });
      setSubscriptions(data);
    } catch (error) {
      console.error('Failed to load subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptions();
  }, [filter]);

  const handleAddSubscription = async () => {
    try {
      await householdApi.createSubscription(newSub);
      setShowAddDialog(false);
      setNewSub({ name: '', category: 'streaming', amount: 0, frequency: 'monthly' });
      loadSubscriptions();
    } catch (error) {
      console.error('Failed to add subscription:', error);
    }
  };

  const handleDeleteSubscription = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subscription?')) return;
    try {
      await householdApi.deleteSubscription(id);
      loadSubscriptions();
    } catch (error) {
      console.error('Failed to delete subscription:', error);
    }
  };

  const handleCancelSubscription = async (sub: Subscription) => {
    try {
      await householdApi.updateSubscription(sub.id, {
        is_active: false,
        cancelled_date: new Date().toISOString().split('T')[0],
      });
      loadSubscriptions();
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
    }
  };

  const filteredSubs = subscriptions.filter((sub) => {
    if (filter === 'trial') return sub.is_trial;
    if (filter === 'active') return sub.is_active;
    return true;
  });

  const activeSubs = subscriptions.filter((s) => s.is_active);
  const totalMonthly = activeSubs.reduce((sum, s) => sum + (s.monthly_equivalent ?? 0), 0);
  const totalAnnual = activeSubs.reduce((sum, s) => sum + (s.annual_cost ?? 0), 0);
  const trialSubs = subscriptions.filter((s) => s.is_trial);

  return (
    <HouseholdLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Subscriptions</h1>
            <p className="text-muted-foreground">Monitor all your recurring subscriptions</p>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="bg-household hover:bg-household/90">
                <Plus className="mr-2 h-4 w-4" /> Add Subscription
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Subscription</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={newSub.name}
                    onChange={(e) => setNewSub({ ...newSub, name: e.target.value })}
                    placeholder="e.g., Netflix"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={newSub.category}
                      onValueChange={(v) => setNewSub({ ...newSub, category: v as SubscriptionCategory })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SUBSCRIPTION_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            <span className="flex items-center gap-2">
                              {cat.icon}
                              {cat.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="frequency">Billing Frequency</Label>
                    <Select
                      value={newSub.frequency}
                      onValueChange={(v) => setNewSub({ ...newSub, frequency: v as BillFrequency })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FREQUENCIES.map((freq) => (
                          <SelectItem key={freq.value} value={freq.value}>
                            {freq.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={newSub.amount || ''}
                      onChange={(e) => setNewSub({ ...newSub, amount: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="next_billing">Next Billing Date</Label>
                    <Input
                      id="next_billing"
                      type="date"
                      value={newSub.next_billing_date || ''}
                      onChange={(e) => setNewSub({ ...newSub, next_billing_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="provider">Provider / Company</Label>
                  <Input
                    id="provider"
                    value={newSub.provider || ''}
                    onChange={(e) => setNewSub({ ...newSub, provider: e.target.value })}
                    placeholder="e.g., Netflix Inc."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website URL</Label>
                  <Input
                    id="website"
                    value={newSub.website_url || ''}
                    onChange={(e) => setNewSub({ ...newSub, website_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddSubscription} disabled={!newSub.name || newSub.amount <= 0}>
                    Add Subscription
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Active Subscriptions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '--' : activeSubs.length}</div>
              <p className="text-xs text-muted-foreground">Active services</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Monthly Cost
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '--' : formatCurrency(totalMonthly, 'GBP')}
              </div>
              <p className="text-xs text-muted-foreground">Per month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Annual Cost
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '--' : formatCurrency(totalAnnual, 'GBP')}
              </div>
              <p className="text-xs text-muted-foreground">Per year</p>
            </CardContent>
          </Card>
          <Card className={trialSubs.length > 0 ? 'border-yellow-500' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                On Trial
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${trialSubs.length > 0 ? 'text-yellow-600' : ''}`}>
                {loading ? '--' : trialSubs.length}
              </div>
              <p className="text-xs text-muted-foreground">Free trials active</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          <Button
            variant={filter === 'active' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('active')}
          >
            Active ({activeSubs.length})
          </Button>
          <Button
            variant={filter === 'trial' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('trial')}
          >
            On Trial ({trialSubs.length})
          </Button>
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
        </div>

        {/* Subscriptions Grid */}
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading subscriptions...</div>
        ) : filteredSubs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CreditCard className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">
                {filter === 'trial' ? 'No active trials' : 'No subscriptions yet'}
              </p>
              {filter !== 'trial' && (
                <Button className="mt-4" onClick={() => setShowAddDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Add Your First Subscription
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredSubs.map((sub) => (
              <Card
                key={sub.id}
                className={`${!sub.is_active ? 'opacity-60' : ''} ${sub.is_trial ? 'border-yellow-500' : ''}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-household/20 flex items-center justify-center text-household">
                        {getCategoryIcon(sub.category)}
                      </div>
                      <div>
                        <CardTitle className="text-base">{sub.name}</CardTitle>
                        <p className="text-sm text-muted-foreground capitalize">{sub.category}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {sub.website_url && (
                        <Button size="icon" variant="ghost" asChild>
                          <a href={sub.website_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => handleDeleteSubscription(sub.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-2xl font-bold">
                        {formatCurrency(sub.amount, sub.currency)}
                      </span>
                      <span className="text-sm text-muted-foreground capitalize">/{sub.frequency}</span>
                    </div>
                    {sub.is_trial && sub.trial_end_date && (
                      <div className="p-2 bg-yellow-500/10 rounded text-sm text-yellow-600">
                        Trial ends: {new Date(sub.trial_end_date).toLocaleDateString()}
                      </div>
                    )}
                    {sub.next_billing_date && !sub.is_trial && (
                      <p className="text-sm text-muted-foreground">
                        Next billing: {new Date(sub.next_billing_date).toLocaleDateString()}
                      </p>
                    )}
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Monthly equiv:</span>
                      <span>{formatCurrency(sub.monthly_equivalent ?? 0, sub.currency)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Annual cost:</span>
                      <span>{formatCurrency(sub.annual_cost ?? 0, sub.currency)}</span>
                    </div>
                    {sub.is_shared && (
                      <span className="inline-block px-2 py-0.5 text-xs bg-muted rounded-full">
                        Shared
                      </span>
                    )}
                    {sub.is_active && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => handleCancelSubscription(sub)}
                      >
                        Cancel Subscription
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </HouseholdLayout>
  );
}
