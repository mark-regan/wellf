import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { Collapsible, FormSection, FormRow, FormField } from '@/components/ui/collapsible';
import { propertyApi } from '@/api/property';
import { personApi } from '@/api/person';
import { fixedAssetApi } from '@/api/assets';
import { Property, PropertyType, OwnershipType, Person } from '@/types';
import {
  Plus,
  Home,
  Building2,
  Pencil,
  Trash2,
  X,
  MapPin,
  UserPlus,
  Landmark,
  Bed,
  Bath,
  DollarSign,
  FileText,
} from 'lucide-react';

const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: 'HOUSE', label: 'House' },
  { value: 'FLAT', label: 'Flat/Apartment' },
  { value: 'LAND', label: 'Land' },
  { value: 'COMMERCIAL', label: 'Commercial' },
  { value: 'OTHER', label: 'Other' },
];

const OWNERSHIP_TYPES: { value: OwnershipType; label: string }[] = [
  { value: 'SOLE', label: 'Sole Owner' },
  { value: 'JOINT_TENANTS', label: 'Joint Tenants' },
  { value: 'TENANTS_IN_COMMON', label: 'Tenants in Common' },
];

interface PropertyFormData {
  name: string;
  property_type: PropertyType;
  address_line1: string;
  address_line2: string;
  city: string;
  county: string;
  postcode: string;
  country: string;
  purchase_date: string;
  purchase_price: string;
  current_value: string;
  currency: string;
  bedrooms: string;
  bathrooms: string;
  is_primary_residence: boolean;
  is_rental: boolean;
  rental_income: string;
  mortgage_provider: string;
  mortgage_balance: string;
  mortgage_rate: string;
  mortgage_monthly_payment: string;
  notes: string;
}

const emptyFormData: PropertyFormData = {
  name: '',
  property_type: 'HOUSE',
  address_line1: '',
  address_line2: '',
  city: '',
  county: '',
  postcode: '',
  country: 'United Kingdom',
  purchase_date: '',
  purchase_price: '',
  current_value: '',
  currency: 'GBP',
  bedrooms: '',
  bathrooms: '',
  is_primary_residence: false,
  is_rental: false,
  rental_income: '',
  mortgage_provider: '',
  mortgage_balance: '',
  mortgage_rate: '',
  mortgage_monthly_payment: '',
  notes: '',
};

function formatCurrency(amount: number | undefined, currency: string = 'GBP'): string {
  if (amount === undefined || amount === null) return '-';
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function Properties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [deletingProperty, setDeletingProperty] = useState<Property | null>(null);
  const [formData, setFormData] = useState<PropertyFormData>(emptyFormData);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Owner modal state
  const [showOwnerModal, setShowOwnerModal] = useState(false);
  const [ownerProperty, setOwnerProperty] = useState<Property | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<string>('');
  const [ownershipPercentage, setOwnershipPercentage] = useState<string>('100');
  const [ownershipType, setOwnershipType] = useState<OwnershipType>('SOLE');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [propsData, peopleData] = await Promise.all([
        propertyApi.list(),
        personApi.list(),
      ]);
      setProperties(propsData);
      setPeople(peopleData);
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
    setEditingProperty(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Name is required');
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const payload = {
        name: formData.name,
        property_type: formData.property_type,
        address_line1: formData.address_line1 || undefined,
        address_line2: formData.address_line2 || undefined,
        city: formData.city || undefined,
        county: formData.county || undefined,
        postcode: formData.postcode || undefined,
        country: formData.country || undefined,
        purchase_date: formData.purchase_date || undefined,
        purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : undefined,
        current_value: formData.current_value ? parseFloat(formData.current_value) : undefined,
        currency: formData.currency,
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : undefined,
        bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : undefined,
        is_primary_residence: formData.is_primary_residence,
        is_rental: formData.is_rental,
        rental_income: formData.rental_income ? parseFloat(formData.rental_income) : undefined,
        mortgage_provider: formData.mortgage_provider || undefined,
        mortgage_balance: formData.mortgage_balance ? parseFloat(formData.mortgage_balance) : undefined,
        mortgage_rate: formData.mortgage_rate ? parseFloat(formData.mortgage_rate) : undefined,
        mortgage_monthly_payment: formData.mortgage_monthly_payment ? parseFloat(formData.mortgage_monthly_payment) : undefined,
        notes: formData.notes || undefined,
      };

      if (editingProperty) {
        await propertyApi.update(editingProperty.id, payload);
      } else {
        const createdProperty = await propertyApi.create(payload);

        if (createdProperty && formData.current_value) {
          try {
            await fixedAssetApi.create({
              name: formData.name,
              category: 'PROPERTY',
              current_value: parseFloat(formData.current_value),
              purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : undefined,
              purchase_date: formData.purchase_date || undefined,
              currency: formData.currency,
              description: `Linked to Property: ${createdProperty.id}`,
            });
          } catch (assetErr) {
            console.error('Failed to create linked fixed asset:', assetErr);
          }
        }
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
    if (!deletingProperty) return;
    setSaving(true);
    try {
      await propertyApi.delete(deletingProperty.id);
      await fetchData();
      setDeletingProperty(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (property: Property) => {
    setEditingProperty(property);
    setFormData({
      name: property.name,
      property_type: property.property_type,
      address_line1: property.address_line1 || '',
      address_line2: property.address_line2 || '',
      city: property.city || '',
      county: property.county || '',
      postcode: property.postcode || '',
      country: property.country || 'United Kingdom',
      purchase_date: property.purchase_date || '',
      purchase_price: property.purchase_price?.toString() || '',
      current_value: property.current_value?.toString() || '',
      currency: property.currency,
      bedrooms: property.bedrooms?.toString() || '',
      bathrooms: property.bathrooms?.toString() || '',
      is_primary_residence: property.is_primary_residence,
      is_rental: property.is_rental,
      rental_income: property.rental_income?.toString() || '',
      mortgage_provider: property.mortgage_provider || '',
      mortgage_balance: property.mortgage_balance?.toString() || '',
      mortgage_rate: property.mortgage_rate?.toString() || '',
      mortgage_monthly_payment: property.mortgage_monthly_payment?.toString() || '',
      notes: property.notes || '',
    });
    setShowCreate(false);
  };

  const openOwnerModal = (property: Property) => {
    setOwnerProperty(property);
    setSelectedPerson('');
    setOwnershipPercentage('100');
    setOwnershipType('SOLE');
    setShowOwnerModal(true);
  };

  const handleAddOwner = async () => {
    if (!ownerProperty || !selectedPerson) return;

    setSaving(true);
    try {
      await propertyApi.addOwner(ownerProperty.id, {
        person_id: selectedPerson,
        ownership_percentage: parseFloat(ownershipPercentage),
        ownership_type: ownershipType,
      });
      await fetchData();
      setShowOwnerModal(false);
      setOwnerProperty(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add owner');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveOwner = async (propertyId: string, personId: string) => {
    setSaving(true);
    try {
      await propertyApi.removeOwner(propertyId, personId);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to remove owner');
    } finally {
      setSaving(false);
    }
  };

  const getPropertyIcon = (type: PropertyType) => {
    switch (type) {
      case 'HOUSE':
        return Home;
      case 'FLAT':
        return Building2;
      case 'COMMERCIAL':
        return Landmark;
      default:
        return Home;
    }
  };

  if (isLoading) {
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
          <h1 className="text-3xl font-bold">Properties</h1>
          <p className="text-muted-foreground">Manage your property portfolio</p>
        </div>
        <Button onClick={() => { setShowCreate(true); setEditingProperty(null); setFormData(emptyFormData); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Property
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
        isOpen={showCreate || !!editingProperty}
        onClose={resetForm}
        title={editingProperty ? 'Edit Property' : 'Add Property'}
        description={editingProperty ? 'Update property details' : 'Add a new property to your portfolio'}
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
            icon={<Home className="h-4 w-4 text-muted-foreground" />}
          >
            <FormRow>
              <FormField label="Property Name" htmlFor="name" required>
                <Input
                  id="name"
                  placeholder="e.g. Family Home, City Apartment"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </FormField>
              <FormField label="Property Type" htmlFor="property_type" required>
                <select
                  id="property_type"
                  value={formData.property_type}
                  onChange={(e) => setFormData({ ...formData, property_type: e.target.value as PropertyType })}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {PROPERTY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </FormField>
            </FormRow>

            <FormRow>
              <FormField label="Bedrooms" htmlFor="bedrooms">
                <Input
                  id="bedrooms"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.bedrooms}
                  onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                />
              </FormField>
              <FormField label="Bathrooms" htmlFor="bathrooms">
                <Input
                  id="bathrooms"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.bathrooms}
                  onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                />
              </FormField>
            </FormRow>

            <div className="flex flex-wrap gap-6 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_primary_residence}
                  onChange={(e) => setFormData({ ...formData, is_primary_residence: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm">Primary Residence</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_rental}
                  onChange={(e) => setFormData({ ...formData, is_rental: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm">Rental Property</span>
              </label>
            </div>
          </FormSection>

          {/* Address */}
          <Collapsible
            title="Address"
            icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
            defaultOpen={true}
          >
            <div className="space-y-4">
              <FormField label="Address Line 1" htmlFor="address_line1">
                <Input
                  id="address_line1"
                  placeholder="123 Main Street"
                  value={formData.address_line1}
                  onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                />
              </FormField>
              <FormField label="Address Line 2" htmlFor="address_line2">
                <Input
                  id="address_line2"
                  placeholder="Apartment, suite, unit, etc. (optional)"
                  value={formData.address_line2}
                  onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                />
              </FormField>
              <FormRow>
                <FormField label="City" htmlFor="city">
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </FormField>
                <FormField label="County/State" htmlFor="county">
                  <Input
                    id="county"
                    value={formData.county}
                    onChange={(e) => setFormData({ ...formData, county: e.target.value })}
                  />
                </FormField>
              </FormRow>
              <FormRow>
                <FormField label="Postcode" htmlFor="postcode">
                  <Input
                    id="postcode"
                    value={formData.postcode}
                    onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                  />
                </FormField>
                <FormField label="Country" htmlFor="country">
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  />
                </FormField>
              </FormRow>
            </div>
          </Collapsible>

          {/* Financial Details */}
          <Collapsible
            title="Financial Details"
            icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
            defaultOpen={true}
          >
            <div className="space-y-4">
              <FormRow>
                <FormField label="Currency" htmlFor="currency">
                  <select
                    id="currency"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="GBP">GBP (£)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </FormField>
                <FormField label="Purchase Date" htmlFor="purchase_date">
                  <Input
                    id="purchase_date"
                    type="date"
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                  />
                </FormField>
              </FormRow>
              <FormRow>
                <FormField label="Purchase Price" htmlFor="purchase_price">
                  <Input
                    id="purchase_price"
                    type="number"
                    placeholder="0"
                    value={formData.purchase_price}
                    onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                  />
                </FormField>
                <FormField label="Current Value" htmlFor="current_value">
                  <Input
                    id="current_value"
                    type="number"
                    placeholder="0"
                    value={formData.current_value}
                    onChange={(e) => setFormData({ ...formData, current_value: e.target.value })}
                  />
                </FormField>
              </FormRow>

              {formData.is_rental && (
                <FormField label="Monthly Rental Income" htmlFor="rental_income">
                  <Input
                    id="rental_income"
                    type="number"
                    placeholder="0"
                    value={formData.rental_income}
                    onChange={(e) => setFormData({ ...formData, rental_income: e.target.value })}
                  />
                </FormField>
              )}
            </div>
          </Collapsible>

          {/* Mortgage Details */}
          <Collapsible
            title="Mortgage Details"
            icon={<Landmark className="h-4 w-4 text-muted-foreground" />}
            defaultOpen={false}
          >
            <div className="space-y-4">
              <FormField label="Mortgage Provider" htmlFor="mortgage_provider">
                <Input
                  id="mortgage_provider"
                  placeholder="e.g. Nationwide, HSBC"
                  value={formData.mortgage_provider}
                  onChange={(e) => setFormData({ ...formData, mortgage_provider: e.target.value })}
                />
              </FormField>
              <FormRow>
                <FormField label="Outstanding Balance" htmlFor="mortgage_balance">
                  <Input
                    id="mortgage_balance"
                    type="number"
                    placeholder="0"
                    value={formData.mortgage_balance}
                    onChange={(e) => setFormData({ ...formData, mortgage_balance: e.target.value })}
                  />
                </FormField>
                <FormField label="Interest Rate (%)" htmlFor="mortgage_rate">
                  <Input
                    id="mortgage_rate"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.mortgage_rate}
                    onChange={(e) => setFormData({ ...formData, mortgage_rate: e.target.value })}
                  />
                </FormField>
              </FormRow>
              <FormField label="Monthly Payment" htmlFor="mortgage_monthly_payment">
                <Input
                  id="mortgage_monthly_payment"
                  type="number"
                  placeholder="0"
                  value={formData.mortgage_monthly_payment}
                  onChange={(e) => setFormData({ ...formData, mortgage_monthly_payment: e.target.value })}
                />
              </FormField>
            </div>
          </Collapsible>

          {/* Notes */}
          <Collapsible
            title="Notes"
            icon={<FileText className="h-4 w-4 text-muted-foreground" />}
            defaultOpen={false}
          >
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[100px]"
              placeholder="Additional notes about this property..."
            />
          </Collapsible>

          <ModalFooter>
            <Button type="button" variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : editingProperty ? 'Save Changes' : 'Add Property'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deletingProperty}
        onClose={() => setDeletingProperty(null)}
        title="Delete Property"
        size="sm"
      >
        <div className="space-y-4">
          <p>
            Are you sure you want to delete <strong>{deletingProperty?.name}</strong>?
          </p>
          <p className="text-sm text-muted-foreground">
            This will also remove all ownership records. This action cannot be undone.
          </p>
          <ModalFooter>
            <Button variant="outline" onClick={() => setDeletingProperty(null)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? 'Deleting...' : 'Delete'}
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* Add Owner Modal */}
      <Modal
        isOpen={showOwnerModal && !!ownerProperty}
        onClose={() => setShowOwnerModal(false)}
        title="Add Owner"
        description={`Add an owner to ${ownerProperty?.name}`}
        size="sm"
      >
        <div className="space-y-4">
          <FormField label="Person" htmlFor="owner_person" required>
            <select
              id="owner_person"
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
          <FormRow>
            <FormField label="Ownership %" htmlFor="ownership_percentage">
              <Input
                id="ownership_percentage"
                type="number"
                min="0"
                max="100"
                value={ownershipPercentage}
                onChange={(e) => setOwnershipPercentage(e.target.value)}
              />
            </FormField>
            <FormField label="Ownership Type" htmlFor="ownership_type">
              <select
                id="ownership_type"
                value={ownershipType}
                onChange={(e) => setOwnershipType(e.target.value as OwnershipType)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {OWNERSHIP_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </FormField>
          </FormRow>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowOwnerModal(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleAddOwner} disabled={saving || !selectedPerson}>
              {saving ? 'Adding...' : 'Add Owner'}
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* Properties List */}
      {properties.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Home className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No properties yet</h3>
            <p className="text-muted-foreground mb-4">
              Add your first property to start tracking your real estate portfolio
            </p>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Property
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {properties.map((property) => {
            const Icon = getPropertyIcon(property.property_type);
            const equity = property.equity ?? (
              property.current_value && property.mortgage_balance
                ? property.current_value - property.mortgage_balance
                : property.current_value
            );

            return (
              <Card key={property.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{property.name}</h3>
                        {property.is_primary_residence && (
                          <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs">
                            Primary
                          </span>
                        )}
                        {property.is_rental && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs">
                            Rental
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {PROPERTY_TYPES.find(t => t.value === property.property_type)?.label}
                      </p>
                    </div>
                  </div>

                  {/* Address */}
                  {(property.address_line1 || property.city || property.postcode) && (
                    <div className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div>
                        {property.address_line1 && <div>{property.address_line1}</div>}
                        {(property.city || property.postcode) && (
                          <div>{[property.city, property.postcode].filter(Boolean).join(', ')}</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Property Details */}
                  {(property.bedrooms || property.bathrooms) && (
                    <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                      {property.bedrooms && (
                        <div className="flex items-center gap-1">
                          <Bed className="h-4 w-4" />
                          <span>{property.bedrooms} bed</span>
                        </div>
                      )}
                      {property.bathrooms && (
                        <div className="flex items-center gap-1">
                          <Bath className="h-4 w-4" />
                          <span>{property.bathrooms} bath</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Values */}
                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    {property.current_value !== undefined && (
                      <div>
                        <div className="text-muted-foreground">Value</div>
                        <div className="font-semibold">{formatCurrency(property.current_value, property.currency)}</div>
                      </div>
                    )}
                    {property.mortgage_balance !== undefined && (
                      <div>
                        <div className="text-muted-foreground">Mortgage</div>
                        <div className="font-semibold text-red-600">
                          {formatCurrency(property.mortgage_balance, property.currency)}
                        </div>
                      </div>
                    )}
                    {equity !== undefined && equity !== null && (
                      <div>
                        <div className="text-muted-foreground">Equity</div>
                        <div className="font-semibold text-green-600">
                          {formatCurrency(equity, property.currency)}
                        </div>
                      </div>
                    )}
                    {property.rental_income !== undefined && property.is_rental && (
                      <div>
                        <div className="text-muted-foreground">Rental Income</div>
                        <div className="font-semibold">{formatCurrency(property.rental_income, property.currency)}/mo</div>
                      </div>
                    )}
                  </div>

                  {/* Owners */}
                  {property.owners && property.owners.length > 0 && (
                    <div className="mt-4 pt-3 border-t">
                      <div className="text-xs font-medium text-muted-foreground mb-2">Owners</div>
                      <div className="flex flex-wrap gap-1">
                        {property.owners.map((owner) => (
                          <span
                            key={owner.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs group"
                          >
                            {owner.person?.first_name} {owner.person?.last_name}
                            <span className="text-muted-foreground">({owner.ownership_percentage}%)</span>
                            <button
                              onClick={() => handleRemoveOwner(property.id, owner.person_id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 text-red-500 hover:text-red-700"
                              title="Remove owner"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openOwnerModal(property)}
                      className="text-xs"
                    >
                      <UserPlus className="h-3 w-3 mr-1" /> Add Owner
                    </Button>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEdit(property)}
                        className="h-8 w-8 p-0"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingProperty(property)}
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
