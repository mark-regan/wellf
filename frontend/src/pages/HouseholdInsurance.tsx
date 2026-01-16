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
  Shield,
  Plus,
  Home,
  Car,
  Heart,
  Briefcase,
  CalendarDays,
  TrendingUp,
  Trash2,
  Phone,
  ExternalLink,
  PawPrint,
  Smartphone,
  Plane,
} from 'lucide-react';
import { householdApi } from '@/api/household';
import { InsurancePolicy, CreateInsurancePolicyRequest, InsuranceType, PaymentFrequency } from '@/types';
import { formatCurrency } from '@/utils/format';

const INSURANCE_TYPES: { value: InsuranceType; label: string; icon: React.ReactNode }[] = [
  { value: 'home', label: 'Home', icon: <Home className="h-4 w-4" /> },
  { value: 'car', label: 'Car', icon: <Car className="h-4 w-4" /> },
  { value: 'life', label: 'Life', icon: <Briefcase className="h-4 w-4" /> },
  { value: 'health', label: 'Health', icon: <Heart className="h-4 w-4" /> },
  { value: 'travel', label: 'Travel', icon: <Plane className="h-4 w-4" /> },
  { value: 'pet', label: 'Pet', icon: <PawPrint className="h-4 w-4" /> },
  { value: 'gadget', label: 'Gadget', icon: <Smartphone className="h-4 w-4" /> },
  { value: 'other', label: 'Other', icon: <Shield className="h-4 w-4" /> },
];

const getPolicyIcon = (type: InsuranceType) => {
  const t = INSURANCE_TYPES.find((i) => i.value === type);
  return t?.icon || <Shield className="h-4 w-4" />;
};

export function HouseholdInsurance() {
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [filter, setFilter] = useState<'active' | 'all'>('active');
  const [newPolicy, setNewPolicy] = useState<CreateInsurancePolicyRequest>({
    name: '',
    policy_type: 'home',
    provider: '',
    premium_amount: 0,
    start_date: new Date().toISOString().split('T')[0],
    payment_frequency: 'monthly',
  });

  const loadPolicies = async () => {
    try {
      const data = await householdApi.listInsurance({ all: filter === 'all' });
      setPolicies(data);
    } catch (error) {
      console.error('Failed to load insurance policies:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolicies();
  }, [filter]);

  const handleAddPolicy = async () => {
    try {
      await householdApi.createInsurance(newPolicy);
      setShowAddDialog(false);
      setNewPolicy({
        name: '',
        policy_type: 'home',
        provider: '',
        premium_amount: 0,
        start_date: new Date().toISOString().split('T')[0],
        payment_frequency: 'monthly',
      });
      loadPolicies();
    } catch (error) {
      console.error('Failed to add insurance policy:', error);
    }
  };

  const handleDeletePolicy = async (id: string) => {
    if (!confirm('Are you sure you want to delete this policy?')) return;
    try {
      await householdApi.deleteInsurance(id);
      loadPolicies();
    } catch (error) {
      console.error('Failed to delete policy:', error);
    }
  };

  const activePolicies = policies.filter((p) => p.is_active);
  const totalMonthly = activePolicies.reduce((sum, p) => sum + (p.monthly_premium ?? 0), 0);
  const totalAnnual = activePolicies.reduce((sum, p) => sum + (p.annual_premium ?? 0), 0);
  const renewingSoon = activePolicies.filter(
    (p) => p.days_until_renewal !== undefined && p.days_until_renewal <= 30 && p.days_until_renewal >= 0
  );

  return (
    <HouseholdLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Insurance</h1>
            <p className="text-muted-foreground">Track all your insurance policies</p>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="bg-household hover:bg-household/90">
                <Plus className="mr-2 h-4 w-4" /> Add Policy
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Insurance Policy</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto">
                <div className="space-y-2">
                  <Label htmlFor="name">Policy Name</Label>
                  <Input
                    id="name"
                    value={newPolicy.name}
                    onChange={(e) => setNewPolicy({ ...newPolicy, name: e.target.value })}
                    placeholder="e.g., Home Insurance 2024"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Policy Type</Label>
                    <Select
                      value={newPolicy.policy_type}
                      onValueChange={(v) => setNewPolicy({ ...newPolicy, policy_type: v as InsuranceType })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INSURANCE_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <span className="flex items-center gap-2">
                              {type.icon}
                              {type.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="provider">Provider</Label>
                    <Input
                      id="provider"
                      value={newPolicy.provider}
                      onChange={(e) => setNewPolicy({ ...newPolicy, provider: e.target.value })}
                      placeholder="e.g., Aviva"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="premium">Premium Amount</Label>
                    <Input
                      id="premium"
                      type="number"
                      step="0.01"
                      value={newPolicy.premium_amount || ''}
                      onChange={(e) =>
                        setNewPolicy({ ...newPolicy, premium_amount: parseFloat(e.target.value) || 0 })
                      }
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="frequency">Payment Frequency</Label>
                    <Select
                      value={newPolicy.payment_frequency}
                      onValueChange={(v) =>
                        setNewPolicy({ ...newPolicy, payment_frequency: v as PaymentFrequency })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="annually">Annually</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={newPolicy.start_date}
                      onChange={(e) => setNewPolicy({ ...newPolicy, start_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="renewal_date">Renewal Date</Label>
                    <Input
                      id="renewal_date"
                      type="date"
                      value={newPolicy.renewal_date || ''}
                      onChange={(e) => setNewPolicy({ ...newPolicy, renewal_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="policy_number">Policy Number</Label>
                  <Input
                    id="policy_number"
                    value={newPolicy.policy_number || ''}
                    onChange={(e) => setNewPolicy({ ...newPolicy, policy_number: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="coverage">Coverage Amount</Label>
                    <Input
                      id="coverage"
                      type="number"
                      value={newPolicy.coverage_amount || ''}
                      onChange={(e) =>
                        setNewPolicy({ ...newPolicy, coverage_amount: parseFloat(e.target.value) || undefined })
                      }
                      placeholder="Optional"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="excess">Excess Amount</Label>
                    <Input
                      id="excess"
                      type="number"
                      value={newPolicy.excess_amount || ''}
                      onChange={(e) =>
                        setNewPolicy({ ...newPolicy, excess_amount: parseFloat(e.target.value) || undefined })
                      }
                      placeholder="Optional"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddPolicy}
                    disabled={!newPolicy.name || !newPolicy.provider || newPolicy.premium_amount <= 0}
                  >
                    Add Policy
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
                <Shield className="h-4 w-4" />
                Active Policies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '--' : activePolicies.length}</div>
              <p className="text-xs text-muted-foreground">Insurance policies</p>
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
                <TrendingUp className="h-4 w-4" />
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
          <Card className={renewingSoon.length > 0 ? 'border-yellow-500' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Renewing Soon
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${renewingSoon.length > 0 ? 'text-yellow-600' : ''}`}>
                {loading ? '--' : renewingSoon.length}
              </div>
              <p className="text-xs text-muted-foreground">Within 30 days</p>
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
            Active ({activePolicies.length})
          </Button>
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
        </div>

        {/* Policies Grid */}
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading insurance policies...</div>
        ) : policies.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Shield className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">No insurance policies yet</p>
              <Button className="mt-4" onClick={() => setShowAddDialog(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add Your First Policy
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {policies
              .filter((p) => filter === 'all' || p.is_active)
              .map((policy) => (
                <Card
                  key={policy.id}
                  className={`${!policy.is_active ? 'opacity-60' : ''} ${
                    policy.days_until_renewal !== undefined &&
                    policy.days_until_renewal <= 30 &&
                    policy.days_until_renewal >= 0
                      ? 'border-yellow-500'
                      : ''
                  }`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-household/20 flex items-center justify-center text-household">
                          {getPolicyIcon(policy.policy_type)}
                        </div>
                        <div>
                          <CardTitle className="text-base">{policy.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">{policy.provider}</p>
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => handleDeletePolicy(policy.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-2xl font-bold">
                          {formatCurrency(policy.premium_amount, policy.currency)}
                        </span>
                        <span className="text-sm text-muted-foreground capitalize">
                          /{policy.payment_frequency}
                        </span>
                      </div>
                      {policy.policy_number && (
                        <p className="text-sm text-muted-foreground">Policy #: {policy.policy_number}</p>
                      )}
                      {policy.renewal_date && (
                        <div
                          className={`flex items-center gap-2 text-sm ${
                            policy.days_until_renewal !== undefined && policy.days_until_renewal <= 30
                              ? 'text-yellow-600'
                              : 'text-muted-foreground'
                          }`}
                        >
                          <CalendarDays className="h-4 w-4" />
                          <span>
                            Renews: {new Date(policy.renewal_date).toLocaleDateString()}
                            {policy.days_until_renewal !== undefined && policy.days_until_renewal <= 30 && (
                              <span className="ml-1 font-medium">
                                ({policy.days_until_renewal} days)
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                      {policy.coverage_amount && (
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Coverage:</span>
                          <span>{formatCurrency(policy.coverage_amount, policy.currency)}</span>
                        </div>
                      )}
                      {policy.excess_amount && (
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Excess:</span>
                          <span>{formatCurrency(policy.excess_amount, policy.currency)}</span>
                        </div>
                      )}
                      <div className="flex gap-2 mt-3 pt-3 border-t">
                        {policy.phone && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={`tel:${policy.phone}`}>
                              <Phone className="h-4 w-4 mr-1" />
                              Call
                            </a>
                          </Button>
                        )}
                        {policy.website_url && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={policy.website_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4 mr-1" />
                              Website
                            </a>
                          </Button>
                        )}
                      </div>
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
