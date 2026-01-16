import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  Receipt,
  Plus,
  CalendarDays,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Edit,
  CreditCard,
} from 'lucide-react';
import { householdApi } from '@/api/household';
import { Bill, CreateBillRequest, BillCategory, BillFrequency } from '@/types';
import { formatCurrency } from '@/utils/format';

const BILL_CATEGORIES: { value: BillCategory; label: string }[] = [
  { value: 'utilities', label: 'Utilities' },
  { value: 'housing', label: 'Housing' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'tax', label: 'Tax' },
  { value: 'other', label: 'Other' },
];

const BILL_FREQUENCIES: { value: BillFrequency; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
  { value: 'one_time', label: 'One Time' },
];

export function HouseholdBills() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'overdue'>('active');
  const [newBill, setNewBill] = useState<CreateBillRequest>({
    name: '',
    category: 'utilities',
    amount: 0,
    frequency: 'monthly',
  });

  const loadBills = async () => {
    try {
      const data = await householdApi.listBills({ all: filter === 'all' });
      setBills(data);
    } catch (error) {
      console.error('Failed to load bills:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBills();
  }, [filter]);

  const handleAddBill = async () => {
    try {
      await householdApi.createBill(newBill);
      setShowAddDialog(false);
      setNewBill({ name: '', category: 'utilities', amount: 0, frequency: 'monthly' });
      loadBills();
    } catch (error) {
      console.error('Failed to add bill:', error);
    }
  };

  const handleDeleteBill = async (id: string) => {
    if (!confirm('Are you sure you want to delete this bill?')) return;
    try {
      await householdApi.deleteBill(id);
      loadBills();
    } catch (error) {
      console.error('Failed to delete bill:', error);
    }
  };

  const handlePayBill = async (bill: Bill) => {
    try {
      await householdApi.recordBillPayment(bill.id, { amount: bill.amount });
      loadBills();
    } catch (error) {
      console.error('Failed to record payment:', error);
    }
  };

  const filteredBills = bills.filter((bill) => {
    if (filter === 'overdue') return bill.is_overdue;
    if (filter === 'active') return bill.is_active;
    return true;
  });

  const overdueBills = bills.filter((b) => b.is_overdue);
  const totalMonthly = bills.reduce((sum, b) => sum + (b.monthly_equivalent ?? 0), 0);

  return (
    <HouseholdLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Bills</h1>
            <p className="text-muted-foreground">Track and manage recurring bills</p>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="bg-household hover:bg-household/90">
                <Plus className="mr-2 h-4 w-4" /> Add Bill
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Bill</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={newBill.name}
                    onChange={(e) => setNewBill({ ...newBill, name: e.target.value })}
                    placeholder="e.g., Electricity"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={newBill.category}
                      onValueChange={(v) => setNewBill({ ...newBill, category: v as BillCategory })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BILL_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="frequency">Frequency</Label>
                    <Select
                      value={newBill.frequency}
                      onValueChange={(v) => setNewBill({ ...newBill, frequency: v as BillFrequency })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BILL_FREQUENCIES.map((freq) => (
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
                      value={newBill.amount || ''}
                      onChange={(e) => setNewBill({ ...newBill, amount: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="due_day">Due Day</Label>
                    <Input
                      id="due_day"
                      type="number"
                      min="1"
                      max="31"
                      value={newBill.due_day || ''}
                      onChange={(e) => setNewBill({ ...newBill, due_day: parseInt(e.target.value) || undefined })}
                      placeholder="Day of month"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="provider">Provider</Label>
                  <Input
                    id="provider"
                    value={newBill.provider || ''}
                    onChange={(e) => setNewBill({ ...newBill, provider: e.target.value })}
                    placeholder="e.g., British Gas"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="next_due">Next Due Date</Label>
                  <Input
                    id="next_due"
                    type="date"
                    value={newBill.next_due_date || ''}
                    onChange={(e) => setNewBill({ ...newBill, next_due_date: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddBill} disabled={!newBill.name || newBill.amount <= 0}>
                    Add Bill
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Total Bills
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '--' : bills.length}</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(totalMonthly, 'GBP')}/month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Auto-Pay
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '--' : bills.filter((b) => b.auto_pay).length}
              </div>
              <p className="text-xs text-muted-foreground">Bills on auto-pay</p>
            </CardContent>
          </Card>
          <Card className={overdueBills.length > 0 ? 'border-destructive' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Overdue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${overdueBills.length > 0 ? 'text-destructive' : ''}`}>
                {loading ? '--' : overdueBills.length}
              </div>
              <p className="text-xs text-muted-foreground">
                {overdueBills.length > 0
                  ? formatCurrency(overdueBills.reduce((s, b) => s + b.amount, 0), 'GBP') + ' overdue'
                  : 'All caught up'}
              </p>
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
            Active
          </Button>
          <Button
            variant={filter === 'overdue' ? 'destructive' : 'outline'}
            size="sm"
            onClick={() => setFilter('overdue')}
          >
            Overdue ({overdueBills.length})
          </Button>
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
        </div>

        {/* Bills List */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading bills...</div>
            ) : filteredBills.length === 0 ? (
              <div className="p-8 text-center">
                <Receipt className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {filter === 'overdue' ? 'No overdue bills' : 'No bills yet'}
                </p>
                {filter !== 'overdue' && (
                  <Button className="mt-4" onClick={() => setShowAddDialog(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Add Your First Bill
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y">
                {filteredBills.map((bill) => (
                  <div
                    key={bill.id}
                    className={`flex items-center justify-between p-4 hover:bg-muted/50 ${
                      bill.is_overdue ? 'bg-destructive/5' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          bill.is_overdue
                            ? 'bg-destructive/20 text-destructive'
                            : 'bg-household/20 text-household'
                        }`}
                      >
                        <Receipt className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{bill.name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="capitalize">{bill.category}</span>
                          {bill.provider && (
                            <>
                              <span>·</span>
                              <span>{bill.provider}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(bill.amount, bill.currency)}</p>
                        <p className="text-sm text-muted-foreground capitalize">{bill.frequency}</p>
                      </div>
                      <div className="text-right min-w-[100px]">
                        {bill.is_overdue ? (
                          <span className="text-sm font-medium text-destructive">
                            {Math.abs(bill.days_until_due ?? 0)} days overdue
                          </span>
                        ) : bill.days_until_due !== undefined ? (
                          <span className="text-sm text-muted-foreground">
                            {bill.days_until_due === 0
                              ? 'Due today'
                              : bill.days_until_due === 1
                                ? 'Due tomorrow'
                                : `Due in ${bill.days_until_due} days`}
                          </span>
                        ) : null}
                        {bill.auto_pay && (
                          <p className="text-xs text-green-600">Auto-pay</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {!bill.auto_pay && (
                          <Button
                            size="sm"
                            variant={bill.is_overdue ? 'destructive' : 'outline'}
                            onClick={() => handlePayBill(bill)}
                          >
                            <CreditCard className="h-4 w-4 mr-1" />
                            Pay
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" asChild>
                          <Link to={`/household/bills/${bill.id}`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => handleDeleteBill(bill.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </HouseholdLayout>
  );
}
