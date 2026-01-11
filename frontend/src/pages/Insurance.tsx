import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { Collapsible, FormSection, FormRow, FormField } from '@/components/ui/collapsible';
import { insuranceApi } from '@/api/insurance';
import { personApi } from '@/api/person';
import { propertyApi } from '@/api/property';
import { vehicleApi } from '@/api/vehicle';
import { LinkedDocumentsList } from '@/components/LinkedDocumentsList';
import {
  InsurancePolicy,
  InsurancePolicyType,
  PremiumFrequency,
  CoverageType,
  InsuranceClaimType,
  InsuranceClaimStatus,
  InsuranceClaim,
  Person,
  Property,
  Vehicle,
} from '@/types';
import {
  Plus,
  Shield,
  Pencil,
  Trash2,
  X,
  Calendar,
  AlertTriangle,
  CheckCircle,
  UserPlus,
  FileText,
  Home,
  Car,
  Heart,
  Plane,
  Briefcase,
  Info,
  PoundSterling,
  Link,
  Phone,
} from 'lucide-react';

const POLICY_TYPES: { value: InsurancePolicyType; label: string; icon: typeof Shield }[] = [
  { value: 'HOME', label: 'Home', icon: Home },
  { value: 'MOTOR', label: 'Motor', icon: Car },
  { value: 'LIFE', label: 'Life', icon: Heart },
  { value: 'HEALTH', label: 'Health', icon: Heart },
  { value: 'TRAVEL', label: 'Travel', icon: Plane },
  { value: 'PET', label: 'Pet', icon: Heart },
  { value: 'CONTENTS', label: 'Contents', icon: Briefcase },
  { value: 'LANDLORD', label: 'Landlord', icon: Home },
  { value: 'OTHER', label: 'Other', icon: Shield },
];

const PREMIUM_FREQUENCIES: { value: PremiumFrequency; label: string }[] = [
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'ANNUALLY', label: 'Annually' },
];

const COVERAGE_TYPES: { value: CoverageType; label: string }[] = [
  { value: 'PRIMARY', label: 'Primary' },
  { value: 'NAMED', label: 'Named' },
  { value: 'DEPENDENT', label: 'Dependent' },
];

const CLAIM_TYPES: { value: InsuranceClaimType; label: string }[] = [
  { value: 'THEFT', label: 'Theft' },
  { value: 'DAMAGE', label: 'Damage' },
  { value: 'ACCIDENT', label: 'Accident' },
  { value: 'MEDICAL', label: 'Medical' },
  { value: 'OTHER', label: 'Other' },
];

const CLAIM_STATUSES: { value: InsuranceClaimStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'SETTLED', label: 'Settled' },
];

interface PolicyFormData {
  policy_name: string;
  policy_type: InsurancePolicyType;
  provider: string;
  policy_number: string;
  start_date: string;
  end_date: string;
  renewal_date: string;
  premium_amount: string;
  premium_frequency: PremiumFrequency | '';
  excess_amount: string;
  cover_amount: string;
  currency: string;
  auto_renewal: boolean;
  property_id: string;
  vehicle_id: string;
  broker_name: string;
  broker_phone: string;
  broker_email: string;
  notes: string;
}

const emptyFormData: PolicyFormData = {
  policy_name: '',
  policy_type: 'HOME',
  provider: '',
  policy_number: '',
  start_date: '',
  end_date: '',
  renewal_date: '',
  premium_amount: '',
  premium_frequency: '',
  excess_amount: '',
  cover_amount: '',
  currency: 'GBP',
  auto_renewal: false,
  property_id: '',
  vehicle_id: '',
  broker_name: '',
  broker_phone: '',
  broker_email: '',
  notes: '',
};

interface ClaimFormData {
  claim_reference: string;
  claim_date: string;
  incident_date: string;
  claim_type: InsuranceClaimType | '';
  description: string;
  claim_amount: string;
  status: InsuranceClaimStatus;
}

const emptyClaimFormData: ClaimFormData = {
  claim_reference: '',
  claim_date: '',
  incident_date: '',
  claim_type: '',
  description: '',
  claim_amount: '',
  status: 'PENDING',
};

function formatCurrency(amount: number | undefined, currency: string = 'GBP'): string {
  if (amount === undefined || amount === null) return '-';
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(date: string | undefined): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-GB');
}

function RenewalBadge({ daysUntil, isExpired }: { daysUntil?: number; isExpired?: boolean }) {
  if (isExpired) {
    return (
      <div className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-red-100 text-red-700">
        <AlertTriangle className="h-3 w-3" />
        <span>Expired</span>
      </div>
    );
  }

  if (daysUntil === undefined || daysUntil === null) return null;

  let colorClass = 'bg-green-100 text-green-700';
  let Icon = CheckCircle;

  if (daysUntil < 0) {
    colorClass = 'bg-red-100 text-red-700';
    Icon = AlertTriangle;
  } else if (daysUntil <= 30) {
    colorClass = 'bg-amber-100 text-amber-700';
    Icon = AlertTriangle;
  }

  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${colorClass}`}>
      <Icon className="h-3 w-3" />
      <span>
        {daysUntil < 0 ? `${Math.abs(daysUntil)}d overdue` : daysUntil === 0 ? 'Today' : `${daysUntil}d to renewal`}
      </span>
    </div>
  );
}

export function Insurance() {
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<InsurancePolicy | null>(null);
  const [deletingPolicy, setDeletingPolicy] = useState<InsurancePolicy | null>(null);
  const [formData, setFormData] = useState<PolicyFormData>(emptyFormData);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Covered person modal state
  const [showCoveredModal, setShowCoveredModal] = useState(false);
  const [coveredPolicy, setCoveredPolicy] = useState<InsurancePolicy | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<string>('');
  const [coverageType, setCoverageType] = useState<CoverageType>('PRIMARY');

  // Claims modal state
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimPolicy, setClaimPolicy] = useState<InsurancePolicy | null>(null);
  const [claimFormData, setClaimFormData] = useState<ClaimFormData>(emptyClaimFormData);
  const [showClaims, setShowClaims] = useState<string | null>(null);
  const [claims, setClaims] = useState<InsuranceClaim[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [policiesData, peopleData, propsData, vehiclesData] = await Promise.all([
        insuranceApi.list(),
        personApi.list(),
        propertyApi.list(),
        vehicleApi.list(),
      ]);
      setPolicies(policiesData);
      setPeople(peopleData);
      setProperties(propsData);
      setVehicles(vehiclesData);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(emptyFormData);
    setFormError(null);
    setShowCreate(false);
    setEditingPolicy(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.policy_name.trim()) {
      setFormError('Policy name is required');
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const payload = {
        policy_name: formData.policy_name,
        policy_type: formData.policy_type,
        provider: formData.provider || undefined,
        policy_number: formData.policy_number || undefined,
        start_date: formData.start_date || undefined,
        end_date: formData.end_date || undefined,
        renewal_date: formData.renewal_date || undefined,
        premium_amount: formData.premium_amount ? parseFloat(formData.premium_amount) : undefined,
        premium_frequency: formData.premium_frequency || undefined,
        excess_amount: formData.excess_amount ? parseFloat(formData.excess_amount) : undefined,
        cover_amount: formData.cover_amount ? parseFloat(formData.cover_amount) : undefined,
        currency: formData.currency,
        auto_renewal: formData.auto_renewal,
        property_id: formData.property_id || undefined,
        vehicle_id: formData.vehicle_id || undefined,
        broker_name: formData.broker_name || undefined,
        broker_phone: formData.broker_phone || undefined,
        broker_email: formData.broker_email || undefined,
        notes: formData.notes || undefined,
      };

      if (editingPolicy) {
        await insuranceApi.update(editingPolicy.id, payload);
      } else {
        await insuranceApi.create(payload);
      }
      await fetchData();
      resetForm();
    } catch (err: any) {
      setFormError(err.response?.data?.error || err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingPolicy) return;
    setSaving(true);
    try {
      await insuranceApi.delete(deletingPolicy.id);
      await fetchData();
      setDeletingPolicy(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (policy: InsurancePolicy) => {
    setEditingPolicy(policy);
    setFormData({
      policy_name: policy.policy_name,
      policy_type: policy.policy_type,
      provider: policy.provider || '',
      policy_number: policy.policy_number || '',
      start_date: policy.start_date || '',
      end_date: policy.end_date || '',
      renewal_date: policy.renewal_date || '',
      premium_amount: policy.premium_amount?.toString() || '',
      premium_frequency: policy.premium_frequency || '',
      excess_amount: policy.excess_amount?.toString() || '',
      cover_amount: policy.cover_amount?.toString() || '',
      currency: policy.currency,
      auto_renewal: policy.auto_renewal,
      property_id: policy.property_id || '',
      vehicle_id: policy.vehicle_id || '',
      broker_name: policy.broker_name || '',
      broker_phone: policy.broker_phone || '',
      broker_email: policy.broker_email || '',
      notes: policy.notes || '',
    });
    setShowCreate(false);
  };

  const openCoveredModal = (policy: InsurancePolicy) => {
    setCoveredPolicy(policy);
    setSelectedPerson('');
    setCoverageType('PRIMARY');
    setShowCoveredModal(true);
  };

  const handleAddCovered = async () => {
    if (!coveredPolicy || !selectedPerson) return;

    setSaving(true);
    try {
      await insuranceApi.addCoveredPerson(coveredPolicy.id, {
        person_id: selectedPerson,
        coverage_type: coverageType,
      });
      await fetchData();
      setShowCoveredModal(false);
      setCoveredPolicy(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add covered person');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveCovered = async (policyId: string, personId: string) => {
    setSaving(true);
    try {
      await insuranceApi.removeCoveredPerson(policyId, personId);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to remove covered person');
    } finally {
      setSaving(false);
    }
  };

  const openClaimModal = (policy: InsurancePolicy) => {
    setClaimPolicy(policy);
    setClaimFormData(emptyClaimFormData);
    setShowClaimModal(true);
  };

  const handleAddClaim = async () => {
    if (!claimPolicy || !claimFormData.claim_date) return;

    setSaving(true);
    try {
      await insuranceApi.addClaim(claimPolicy.id, {
        claim_reference: claimFormData.claim_reference || undefined,
        claim_date: claimFormData.claim_date,
        incident_date: claimFormData.incident_date || undefined,
        claim_type: claimFormData.claim_type || undefined,
        description: claimFormData.description || undefined,
        claim_amount: claimFormData.claim_amount ? parseFloat(claimFormData.claim_amount) : undefined,
        status: claimFormData.status,
      });
      await fetchData();
      setShowClaimModal(false);
      setClaimPolicy(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add claim');
    } finally {
      setSaving(false);
    }
  };

  const loadClaims = async (policyId: string) => {
    if (showClaims === policyId) {
      setShowClaims(null);
      return;
    }
    try {
      const claimsData = await insuranceApi.getClaims(policyId);
      setClaims(claimsData);
      setShowClaims(policyId);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load claims');
    }
  };

  const handleDeleteClaim = async (policyId: string, claimId: string) => {
    setSaving(true);
    try {
      await insuranceApi.deleteClaim(policyId, claimId);
      const claimsData = await insuranceApi.getClaims(policyId);
      setClaims(claimsData);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete claim');
    } finally {
      setSaving(false);
    }
  };

  const getPolicyIcon = (type: InsurancePolicyType) => {
    const found = POLICY_TYPES.find(t => t.value === type);
    return found?.icon || Shield;
  };

  const getClaimStatusColor = (status: InsuranceClaimStatus) => {
    switch (status) {
      case 'PENDING': return 'bg-amber-100 text-amber-700';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-700';
      case 'APPROVED': return 'bg-green-100 text-green-700';
      case 'REJECTED': return 'bg-red-100 text-red-700';
      case 'SETTLED': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const showPolicyModal = showCreate || editingPolicy;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Insurance</h1>
          <p className="text-muted-foreground">Manage your insurance policies</p>
        </div>
        <Button onClick={() => { setShowCreate(true); setEditingPolicy(null); setFormData(emptyFormData); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Policy
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-700 hover:text-red-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={!!showPolicyModal}
        onClose={resetForm}
        title={editingPolicy ? 'Edit Policy' : 'Add Policy'}
        description={editingPolicy ? 'Update your insurance policy details' : 'Add a new insurance policy'}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
              {formError}
            </div>
          )}

          {/* Basic Information */}
          <FormSection
            title="Basic Information"
            icon={<Info className="h-4 w-4 text-muted-foreground" />}
            description="Essential policy details"
          >
            <FormRow>
              <FormField label="Policy Name" htmlFor="policy-name" required>
                <Input
                  id="policy-name"
                  placeholder="e.g., Home Insurance 2024"
                  value={formData.policy_name}
                  onChange={(e) => setFormData({ ...formData, policy_name: e.target.value })}
                  required
                />
              </FormField>
              <FormField label="Policy Type" htmlFor="policy-type" required>
                <select
                  id="policy-type"
                  value={formData.policy_type}
                  onChange={(e) => setFormData({ ...formData, policy_type: e.target.value as InsurancePolicyType })}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {POLICY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </FormField>
            </FormRow>
            <FormRow>
              <FormField label="Provider" htmlFor="policy-provider" hint="Insurance company name">
                <Input
                  id="policy-provider"
                  placeholder="e.g., Aviva, Admiral"
                  value={formData.provider}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                />
              </FormField>
              <FormField label="Policy Number" htmlFor="policy-number">
                <Input
                  id="policy-number"
                  placeholder="Policy reference number"
                  value={formData.policy_number}
                  onChange={(e) => setFormData({ ...formData, policy_number: e.target.value })}
                />
              </FormField>
            </FormRow>
          </FormSection>

          {/* Policy Dates */}
          <Collapsible
            title="Policy Dates"
            icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
            defaultOpen={!!(formData.start_date || formData.end_date || formData.renewal_date)}
          >
            <div className="space-y-4">
              <FormRow>
                <FormField label="Start Date" htmlFor="policy-start">
                  <Input
                    id="policy-start"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </FormField>
                <FormField label="End Date" htmlFor="policy-end">
                  <Input
                    id="policy-end"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </FormField>
                <FormField label="Renewal Date" htmlFor="policy-renewal">
                  <Input
                    id="policy-renewal"
                    type="date"
                    value={formData.renewal_date}
                    onChange={(e) => setFormData({ ...formData, renewal_date: e.target.value })}
                  />
                </FormField>
              </FormRow>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="auto_renewal"
                  checked={formData.auto_renewal}
                  onChange={(e) => setFormData({ ...formData, auto_renewal: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="auto_renewal" className="text-sm">Auto-renewal enabled</label>
              </div>
            </div>
          </Collapsible>

          {/* Premium & Coverage */}
          <Collapsible
            title="Premium & Coverage"
            icon={<PoundSterling className="h-4 w-4 text-muted-foreground" />}
            defaultOpen={!!(formData.premium_amount || formData.cover_amount || formData.excess_amount)}
          >
            <div className="space-y-4">
              <FormRow>
                <FormField label="Premium Amount" htmlFor="policy-premium">
                  <Input
                    id="policy-premium"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.premium_amount}
                    onChange={(e) => setFormData({ ...formData, premium_amount: e.target.value })}
                  />
                </FormField>
                <FormField label="Premium Frequency" htmlFor="policy-frequency">
                  <select
                    id="policy-frequency"
                    value={formData.premium_frequency}
                    onChange={(e) => setFormData({ ...formData, premium_frequency: e.target.value as PremiumFrequency })}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select...</option>
                    {PREMIUM_FREQUENCIES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Currency" htmlFor="policy-currency">
                  <select
                    id="policy-currency"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="GBP">GBP (£)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </FormField>
              </FormRow>
              <FormRow>
                <FormField label="Cover Amount" htmlFor="policy-cover" hint="Maximum payout amount">
                  <Input
                    id="policy-cover"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.cover_amount}
                    onChange={(e) => setFormData({ ...formData, cover_amount: e.target.value })}
                  />
                </FormField>
                <FormField label="Excess Amount" htmlFor="policy-excess" hint="Amount you pay per claim">
                  <Input
                    id="policy-excess"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.excess_amount}
                    onChange={(e) => setFormData({ ...formData, excess_amount: e.target.value })}
                  />
                </FormField>
              </FormRow>
            </div>
          </Collapsible>

          {/* Linked Assets */}
          <Collapsible
            title="Linked Assets"
            icon={<Link className="h-4 w-4 text-muted-foreground" />}
            defaultOpen={!!(formData.property_id || formData.vehicle_id)}
          >
            <FormRow>
              <FormField label="Link to Property" htmlFor="policy-property">
                <select
                  id="policy-property"
                  value={formData.property_id}
                  onChange={(e) => setFormData({ ...formData, property_id: e.target.value })}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">None</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Link to Vehicle" htmlFor="policy-vehicle">
                <select
                  id="policy-vehicle"
                  value={formData.vehicle_id}
                  onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">None</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </FormField>
            </FormRow>
          </Collapsible>

          {/* Broker Information */}
          <Collapsible
            title="Broker Information"
            icon={<Phone className="h-4 w-4 text-muted-foreground" />}
            defaultOpen={!!(formData.broker_name || formData.broker_phone || formData.broker_email)}
          >
            <FormRow>
              <FormField label="Broker Name" htmlFor="broker-name">
                <Input
                  id="broker-name"
                  placeholder="Name of broker or agent"
                  value={formData.broker_name}
                  onChange={(e) => setFormData({ ...formData, broker_name: e.target.value })}
                />
              </FormField>
              <FormField label="Phone" htmlFor="broker-phone">
                <Input
                  id="broker-phone"
                  placeholder="+44 1234 567890"
                  value={formData.broker_phone}
                  onChange={(e) => setFormData({ ...formData, broker_phone: e.target.value })}
                />
              </FormField>
              <FormField label="Email" htmlFor="broker-email">
                <Input
                  id="broker-email"
                  type="email"
                  placeholder="broker@example.com"
                  value={formData.broker_email}
                  onChange={(e) => setFormData({ ...formData, broker_email: e.target.value })}
                />
              </FormField>
            </FormRow>
          </Collapsible>

          {/* Notes */}
          <Collapsible
            title="Notes"
            icon={<FileText className="h-4 w-4 text-muted-foreground" />}
            defaultOpen={!!formData.notes}
          >
            <FormField label="Additional Notes" htmlFor="policy-notes">
              <textarea
                id="policy-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[100px] resize-y"
                placeholder="Any additional information about this policy..."
              />
            </FormField>
          </Collapsible>

          {/* Linked Documents - only shown when editing an existing policy */}
          {editingPolicy && (
            <Collapsible
              title="Linked Documents"
              icon={<FileText className="h-4 w-4 text-muted-foreground" />}
              defaultOpen={false}
            >
              <LinkedDocumentsList entityType="policy" entityId={editingPolicy.id} category="INSURANCE" />
            </Collapsible>
          )}

          <ModalFooter>
            <Button type="button" variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : editingPolicy ? 'Save Changes' : 'Add Policy'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      {deletingPolicy && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Delete Policy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Are you sure you want to delete <strong>{deletingPolicy.policy_name}</strong>?
              </p>
              <p className="text-sm text-muted-foreground">
                This will also remove all claims and covered people. This action cannot be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setDeletingPolicy(null)} disabled={saving}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDelete} disabled={saving}>
                  {saving ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Covered Person Modal */}
      <Modal
        isOpen={showCoveredModal && !!coveredPolicy}
        onClose={() => setShowCoveredModal(false)}
        title="Add Covered Person"
        description={coveredPolicy ? `Add a person covered by ${coveredPolicy.policy_name}` : ''}
        size="sm"
      >
        <div className="space-y-4">
          <FormField label="Person" htmlFor="covered-person" required>
            <select
              id="covered-person"
              value={selectedPerson}
              onChange={(e) => setSelectedPerson(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Select person...</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.first_name} {p.last_name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Coverage Type" htmlFor="coverage-type">
            <select
              id="coverage-type"
              value={coverageType}
              onChange={(e) => setCoverageType(e.target.value as CoverageType)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {COVERAGE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </FormField>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowCoveredModal(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleAddCovered} disabled={saving || !selectedPerson}>
              {saving ? 'Adding...' : 'Add Person'}
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* Add Claim Modal */}
      <Modal
        isOpen={showClaimModal && !!claimPolicy}
        onClose={() => setShowClaimModal(false)}
        title="Add Claim"
        description={claimPolicy ? `Record a claim for ${claimPolicy.policy_name}` : ''}
        size="md"
      >
        <div className="space-y-4">
          <FormRow>
            <FormField label="Claim Date" htmlFor="claim-date" required>
              <Input
                id="claim-date"
                type="date"
                value={claimFormData.claim_date}
                onChange={(e) => setClaimFormData({ ...claimFormData, claim_date: e.target.value })}
                required
              />
            </FormField>
            <FormField label="Incident Date" htmlFor="claim-incident">
              <Input
                id="claim-incident"
                type="date"
                value={claimFormData.incident_date}
                onChange={(e) => setClaimFormData({ ...claimFormData, incident_date: e.target.value })}
              />
            </FormField>
          </FormRow>
          <FormRow>
            <FormField label="Claim Reference" htmlFor="claim-ref">
              <Input
                id="claim-ref"
                placeholder="Reference number"
                value={claimFormData.claim_reference}
                onChange={(e) => setClaimFormData({ ...claimFormData, claim_reference: e.target.value })}
              />
            </FormField>
            <FormField label="Claim Type" htmlFor="claim-type">
              <select
                id="claim-type"
                value={claimFormData.claim_type}
                onChange={(e) => setClaimFormData({ ...claimFormData, claim_type: e.target.value as InsuranceClaimType })}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select...</option>
                {CLAIM_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </FormField>
          </FormRow>
          <FormRow>
            <FormField label="Claim Amount" htmlFor="claim-amount">
              <Input
                id="claim-amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={claimFormData.claim_amount}
                onChange={(e) => setClaimFormData({ ...claimFormData, claim_amount: e.target.value })}
              />
            </FormField>
            <FormField label="Status" htmlFor="claim-status">
              <select
                id="claim-status"
                value={claimFormData.status}
                onChange={(e) => setClaimFormData({ ...claimFormData, status: e.target.value as InsuranceClaimStatus })}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {CLAIM_STATUSES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </FormField>
          </FormRow>
          <FormField label="Description" htmlFor="claim-description">
            <textarea
              id="claim-description"
              value={claimFormData.description}
              onChange={(e) => setClaimFormData({ ...claimFormData, description: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-y"
              placeholder="Describe what happened..."
            />
          </FormField>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowClaimModal(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleAddClaim} disabled={saving || !claimFormData.claim_date}>
              {saving ? 'Adding...' : 'Add Claim'}
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* Policies List */}
      {policies.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No insurance policies yet</h3>
            <p className="text-muted-foreground mb-4">
              Add your first policy to start tracking your insurance
            </p>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Policy
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {policies.map((policy) => {
            const Icon = getPolicyIcon(policy.policy_type);

            return (
              <Card key={policy.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{policy.policy_name}</h3>
                        {policy.auto_renewal && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs">
                            Auto
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {POLICY_TYPES.find(t => t.value === policy.policy_type)?.label}
                        {policy.provider && ` - ${policy.provider}`}
                      </p>
                      {policy.policy_number && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Policy #{policy.policy_number}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Renewal Badge */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <RenewalBadge daysUntil={policy.days_until_renewal} isExpired={policy.is_expired} />
                    {policy.renewal_date && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>Renews: {formatDate(policy.renewal_date)}</span>
                      </div>
                    )}
                  </div>

                  {/* Policy Details */}
                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    {policy.premium_amount !== undefined && (
                      <div>
                        <div className="text-muted-foreground">Premium</div>
                        <div className="font-semibold">
                          {formatCurrency(policy.premium_amount, policy.currency)}
                          {policy.premium_frequency && (
                            <span className="text-muted-foreground font-normal">
                              /{policy.premium_frequency.toLowerCase().replace('ly', '')}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {policy.cover_amount !== undefined && (
                      <div>
                        <div className="text-muted-foreground">Cover</div>
                        <div className="font-semibold">{formatCurrency(policy.cover_amount, policy.currency)}</div>
                      </div>
                    )}
                    {policy.excess_amount !== undefined && (
                      <div>
                        <div className="text-muted-foreground">Excess</div>
                        <div className="font-semibold">{formatCurrency(policy.excess_amount, policy.currency)}</div>
                      </div>
                    )}
                  </div>

                  {/* Covered People */}
                  {policy.covered_people && policy.covered_people.length > 0 && (
                    <div className="mt-4 pt-3 border-t">
                      <div className="text-xs font-medium text-muted-foreground mb-2">Covered People</div>
                      <div className="flex flex-wrap gap-1">
                        {policy.covered_people.map((cp) => (
                          <span
                            key={cp.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs group"
                          >
                            {cp.person?.first_name} {cp.person?.last_name}
                            {cp.coverage_type && (
                              <span className="text-muted-foreground">({cp.coverage_type.toLowerCase()})</span>
                            )}
                            <button
                              onClick={() => handleRemoveCovered(policy.id, cp.person_id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 text-red-500 hover:text-red-700"
                              title="Remove"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Claims */}
                  {showClaims === policy.id && claims.length > 0 && (
                    <div className="mt-4 pt-3 border-t">
                      <div className="text-xs font-medium text-muted-foreground mb-2">Claims</div>
                      <div className="space-y-2">
                        {claims.map((claim) => (
                          <div key={claim.id} className="flex items-center justify-between text-xs bg-muted rounded p-2 group">
                            <div>
                              <span className={`px-1.5 py-0.5 rounded ${getClaimStatusColor(claim.status)}`}>
                                {CLAIM_STATUSES.find(s => s.value === claim.status)?.label}
                              </span>
                              <span className="ml-2">{formatDate(claim.claim_date)}</span>
                              {claim.claim_type && (
                                <span className="text-muted-foreground ml-2">
                                  {CLAIM_TYPES.find(t => t.value === claim.claim_type)?.label}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {claim.claim_amount !== undefined && (
                                <span className="font-medium">{formatCurrency(claim.claim_amount, claim.currency)}</span>
                              )}
                              <button
                                onClick={() => handleDeleteClaim(policy.id, claim.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700"
                                title="Delete"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t flex items-center justify-between">
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openCoveredModal(policy)}
                        className="text-xs"
                      >
                        <UserPlus className="h-3 w-3 mr-1" /> Person
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openClaimModal(policy)}
                        className="text-xs"
                      >
                        <FileText className="h-3 w-3 mr-1" /> Claim
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => loadClaims(policy.id)}
                        className="text-xs"
                      >
                        <Calendar className="h-3 w-3 mr-1" /> History
                      </Button>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEdit(policy)}
                        className="h-8 w-8 p-0"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingPolicy(policy)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
