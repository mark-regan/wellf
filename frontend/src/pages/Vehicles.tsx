import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { vehicleApi } from '@/api/vehicle';
import { personApi } from '@/api/person';
import { Vehicle, VehicleType, FuelType, ServiceType, VehicleServiceRecord, Person } from '@/types';
import {
  Plus,
  Car,
  Bike,
  Truck,
  Pencil,
  Trash2,
  X,
  Calendar,
  Gauge,
  UserPlus,
  Wrench,
  AlertTriangle,
  CheckCircle,
  Fuel,
} from 'lucide-react';

const VEHICLE_TYPES: { value: VehicleType; label: string }[] = [
  { value: 'CAR', label: 'Car' },
  { value: 'MOTORCYCLE', label: 'Motorcycle' },
  { value: 'VAN', label: 'Van' },
  { value: 'BOAT', label: 'Boat' },
  { value: 'CARAVAN', label: 'Caravan' },
  { value: 'OTHER', label: 'Other' },
];

const FUEL_TYPES: { value: FuelType; label: string }[] = [
  { value: 'PETROL', label: 'Petrol' },
  { value: 'DIESEL', label: 'Diesel' },
  { value: 'ELECTRIC', label: 'Electric' },
  { value: 'HYBRID', label: 'Hybrid' },
  { value: 'OTHER', label: 'Other' },
];

const SERVICE_TYPES: { value: ServiceType; label: string }[] = [
  { value: 'MOT', label: 'MOT' },
  { value: 'SERVICE', label: 'Service' },
  { value: 'REPAIR', label: 'Repair' },
  { value: 'TYRE', label: 'Tyre Change' },
  { value: 'OTHER', label: 'Other' },
];

interface VehicleFormData {
  name: string;
  vehicle_type: VehicleType;
  make: string;
  model: string;
  year: string;
  registration: string;
  color: string;
  fuel_type: FuelType | '';
  mileage: string;
  purchase_date: string;
  purchase_price: string;
  current_value: string;
  currency: string;
  mot_expiry: string;
  tax_expiry: string;
  insurance_expiry: string;
  insurance_provider: string;
  notes: string;
}

const emptyFormData: VehicleFormData = {
  name: '',
  vehicle_type: 'CAR',
  make: '',
  model: '',
  year: '',
  registration: '',
  color: '',
  fuel_type: '',
  mileage: '',
  purchase_date: '',
  purchase_price: '',
  current_value: '',
  currency: 'GBP',
  mot_expiry: '',
  tax_expiry: '',
  insurance_expiry: '',
  insurance_provider: '',
  notes: '',
};

interface ServiceRecordFormData {
  service_type: ServiceType;
  service_date: string;
  mileage: string;
  provider: string;
  description: string;
  cost: string;
  notes: string;
}

const emptyServiceFormData: ServiceRecordFormData = {
  service_type: 'SERVICE',
  service_date: '',
  mileage: '',
  provider: '',
  description: '',
  cost: '',
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

function formatDate(date: string | undefined): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-GB');
}

function getDaysUntil(date: string | undefined): number | null {
  if (!date) return null;
  const target = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function ExpiryBadge({ label, date }: { label: string; date?: string }) {
  const days = getDaysUntil(date);
  if (days === null) return null;

  let colorClass = 'bg-green-100 text-green-700';
  let Icon = CheckCircle;

  if (days < 0) {
    colorClass = 'bg-red-100 text-red-700';
    Icon = AlertTriangle;
  } else if (days <= 30) {
    colorClass = 'bg-amber-100 text-amber-700';
    Icon = AlertTriangle;
  }

  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${colorClass}`}>
      <Icon className="h-3 w-3" />
      <span>{label}:</span>
      <span className="font-medium">
        {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today' : `${days}d`}
      </span>
    </div>
  );
}

export function Vehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [deletingVehicle, setDeletingVehicle] = useState<Vehicle | null>(null);
  const [formData, setFormData] = useState<VehicleFormData>(emptyFormData);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // User modal state
  const [showUserModal, setShowUserModal] = useState(false);
  const [userVehicle, setUserVehicle] = useState<Vehicle | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<string>('');
  const [isPrimaryDriver, setIsPrimaryDriver] = useState(false);
  const [isNamedOnInsurance, setIsNamedOnInsurance] = useState(false);

  // Service record modal state
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [serviceVehicle, setServiceVehicle] = useState<Vehicle | null>(null);
  const [serviceFormData, setServiceFormData] = useState<ServiceRecordFormData>(emptyServiceFormData);
  const [serviceRecords, setServiceRecords] = useState<VehicleServiceRecord[]>([]);
  const [showServiceRecords, setShowServiceRecords] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [vehiclesData, peopleData] = await Promise.all([
        vehicleApi.list(),
        personApi.list(),
      ]);
      setVehicles(vehiclesData);
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
    setEditingVehicle(null);
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
        vehicle_type: formData.vehicle_type,
        make: formData.make || undefined,
        model: formData.model || undefined,
        year: formData.year ? parseInt(formData.year) : undefined,
        registration: formData.registration || undefined,
        color: formData.color || undefined,
        fuel_type: formData.fuel_type || undefined,
        mileage: formData.mileage ? parseInt(formData.mileage) : undefined,
        purchase_date: formData.purchase_date || undefined,
        purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : undefined,
        current_value: formData.current_value ? parseFloat(formData.current_value) : undefined,
        currency: formData.currency,
        mot_expiry: formData.mot_expiry || undefined,
        tax_expiry: formData.tax_expiry || undefined,
        insurance_expiry: formData.insurance_expiry || undefined,
        insurance_provider: formData.insurance_provider || undefined,
        notes: formData.notes || undefined,
      };

      if (editingVehicle) {
        await vehicleApi.update(editingVehicle.id, payload);
      } else {
        await vehicleApi.create(payload);
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
    if (!deletingVehicle) return;
    setSaving(true);
    try {
      await vehicleApi.delete(deletingVehicle.id);
      await fetchData();
      setDeletingVehicle(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      name: vehicle.name,
      vehicle_type: vehicle.vehicle_type,
      make: vehicle.make || '',
      model: vehicle.model || '',
      year: vehicle.year?.toString() || '',
      registration: vehicle.registration || '',
      color: vehicle.color || '',
      fuel_type: vehicle.fuel_type || '',
      mileage: vehicle.mileage?.toString() || '',
      purchase_date: vehicle.purchase_date || '',
      purchase_price: vehicle.purchase_price?.toString() || '',
      current_value: vehicle.current_value?.toString() || '',
      currency: vehicle.currency,
      mot_expiry: vehicle.mot_expiry || '',
      tax_expiry: vehicle.tax_expiry || '',
      insurance_expiry: vehicle.insurance_expiry || '',
      insurance_provider: vehicle.insurance_provider || '',
      notes: vehicle.notes || '',
    });
    setShowCreate(false);
  };

  const openUserModal = (vehicle: Vehicle) => {
    setUserVehicle(vehicle);
    setSelectedPerson('');
    setIsPrimaryDriver(false);
    setIsNamedOnInsurance(false);
    setShowUserModal(true);
  };

  const handleAddUser = async () => {
    if (!userVehicle || !selectedPerson) return;

    setSaving(true);
    try {
      await vehicleApi.addUser(userVehicle.id, {
        person_id: selectedPerson,
        is_primary_driver: isPrimaryDriver,
        is_named_on_insurance: isNamedOnInsurance,
      });
      await fetchData();
      setShowUserModal(false);
      setUserVehicle(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add user');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveUser = async (vehicleId: string, personId: string) => {
    setSaving(true);
    try {
      await vehicleApi.removeUser(vehicleId, personId);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to remove user');
    } finally {
      setSaving(false);
    }
  };

  const openServiceModal = (vehicle: Vehicle) => {
    setServiceVehicle(vehicle);
    setServiceFormData({
      ...emptyServiceFormData,
      mileage: vehicle.mileage?.toString() || '',
    });
    setShowServiceModal(true);
  };

  const handleAddServiceRecord = async () => {
    if (!serviceVehicle || !serviceFormData.service_date) return;

    setSaving(true);
    try {
      await vehicleApi.addServiceRecord(serviceVehicle.id, {
        service_type: serviceFormData.service_type,
        service_date: serviceFormData.service_date,
        mileage: serviceFormData.mileage ? parseInt(serviceFormData.mileage) : undefined,
        provider: serviceFormData.provider || undefined,
        description: serviceFormData.description || undefined,
        cost: serviceFormData.cost ? parseFloat(serviceFormData.cost) : undefined,
        currency: 'GBP',
        notes: serviceFormData.notes || undefined,
      });
      await fetchData();
      setShowServiceModal(false);
      setServiceVehicle(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add service record');
    } finally {
      setSaving(false);
    }
  };

  const loadServiceRecords = async (vehicleId: string) => {
    if (showServiceRecords === vehicleId) {
      setShowServiceRecords(null);
      return;
    }
    try {
      const records = await vehicleApi.getServiceRecords(vehicleId);
      setServiceRecords(records);
      setShowServiceRecords(vehicleId);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load service records');
    }
  };

  const handleDeleteServiceRecord = async (vehicleId: string, recordId: string) => {
    setSaving(true);
    try {
      await vehicleApi.deleteServiceRecord(vehicleId, recordId);
      const records = await vehicleApi.getServiceRecords(vehicleId);
      setServiceRecords(records);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete service record');
    } finally {
      setSaving(false);
    }
  };

  const getVehicleIcon = (type: VehicleType) => {
    switch (type) {
      case 'CAR':
        return Car;
      case 'MOTORCYCLE':
        return Bike;
      case 'VAN':
        return Truck;
      default:
        return Car;
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
          <h1 className="text-3xl font-bold">Vehicles</h1>
          <p className="text-muted-foreground">Manage your vehicle fleet</p>
        </div>
        <Button onClick={() => { setShowCreate(true); setEditingVehicle(null); setFormData(emptyFormData); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Vehicle
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
      {(showCreate || editingVehicle) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">
                  {editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'}
                </h2>
                <button
                  onClick={resetForm}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {formError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                    {formError}
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-4">
                  <div>
                    <label className="text-sm font-medium">Name *</label>
                    <Input
                      placeholder="e.g. Family Car"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Vehicle Type *</label>
                    <select
                      value={formData.vehicle_type}
                      onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value as VehicleType })}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {VEHICLE_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Make</label>
                    <Input
                      placeholder="e.g. Toyota"
                      value={formData.make}
                      onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Model</label>
                    <Input
                      placeholder="e.g. Corolla"
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-5">
                  <div>
                    <label className="text-sm font-medium">Year</label>
                    <Input
                      type="number"
                      placeholder="2020"
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Registration</label>
                    <Input
                      placeholder="AB12 CDE"
                      value={formData.registration}
                      onChange={(e) => setFormData({ ...formData, registration: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Color</label>
                    <Input
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Fuel Type</label>
                    <select
                      value={formData.fuel_type}
                      onChange={(e) => setFormData({ ...formData, fuel_type: e.target.value as FuelType })}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select...</option>
                      {FUEL_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Mileage</label>
                    <Input
                      type="number"
                      value={formData.mileage}
                      onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  <div>
                    <label className="text-sm font-medium">Purchase Date</label>
                    <Input
                      type="date"
                      value={formData.purchase_date}
                      onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Purchase Price</label>
                    <Input
                      type="number"
                      value={formData.purchase_price}
                      onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Current Value</label>
                    <Input
                      type="number"
                      value={formData.current_value}
                      onChange={(e) => setFormData({ ...formData, current_value: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Currency</label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="GBP">GBP</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  <div>
                    <label className="text-sm font-medium">MOT Expiry</label>
                    <Input
                      type="date"
                      value={formData.mot_expiry}
                      onChange={(e) => setFormData({ ...formData, mot_expiry: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Tax Expiry</label>
                    <Input
                      type="date"
                      value={formData.tax_expiry}
                      onChange={(e) => setFormData({ ...formData, tax_expiry: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Insurance Expiry</label>
                    <Input
                      type="date"
                      value={formData.insurance_expiry}
                      onChange={(e) => setFormData({ ...formData, insurance_expiry: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Insurance Provider</label>
                    <Input
                      value={formData.insurance_provider}
                      onChange={(e) => setFormData({ ...formData, insurance_provider: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
                    placeholder="Additional notes..."
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Saving...' : editingVehicle ? 'Save Changes' : 'Add Vehicle'}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deletingVehicle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Delete Vehicle</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Are you sure you want to delete <strong>{deletingVehicle.name}</strong>?
              </p>
              <p className="text-sm text-muted-foreground">
                This will also remove all service records. This action cannot be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setDeletingVehicle(null)} disabled={saving}>
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

      {/* Add User Modal */}
      {showUserModal && userVehicle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Add Driver</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Add a driver to <strong>{userVehicle.name}</strong>.
              </p>
              <div>
                <label className="text-sm font-medium">Person</label>
                <select
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
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="primary_driver"
                    checked={isPrimaryDriver}
                    onChange={(e) => setIsPrimaryDriver(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <label htmlFor="primary_driver" className="text-sm">Primary Driver</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="named_insurance"
                    checked={isNamedOnInsurance}
                    onChange={(e) => setIsNamedOnInsurance(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <label htmlFor="named_insurance" className="text-sm">Named on Insurance</label>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowUserModal(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={handleAddUser} disabled={saving || !selectedPerson}>
                  {saving ? 'Adding...' : 'Add Driver'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Service Record Modal */}
      {showServiceModal && serviceVehicle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg mx-4">
            <CardHeader>
              <CardTitle>Add Service Record</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Service Type *</label>
                  <select
                    value={serviceFormData.service_type}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, service_type: e.target.value as ServiceType })}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {SERVICE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Date *</label>
                  <Input
                    type="date"
                    value={serviceFormData.service_date}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, service_date: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Mileage</label>
                  <Input
                    type="number"
                    value={serviceFormData.mileage}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, mileage: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Cost</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={serviceFormData.cost}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, cost: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Provider</label>
                <Input
                  value={serviceFormData.provider}
                  onChange={(e) => setServiceFormData({ ...serviceFormData, provider: e.target.value })}
                  placeholder="e.g. Kwik Fit"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <textarea
                  value={serviceFormData.description}
                  onChange={(e) => setServiceFormData({ ...serviceFormData, description: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px]"
                  placeholder="What was done..."
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowServiceModal(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={handleAddServiceRecord} disabled={saving || !serviceFormData.service_date}>
                  {saving ? 'Adding...' : 'Add Record'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Vehicles List */}
      {vehicles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Car className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No vehicles yet</h3>
            <p className="text-muted-foreground mb-4">
              Add your first vehicle to start tracking your fleet
            </p>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Vehicle
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {vehicles.map((vehicle) => {
            const Icon = getVehicleIcon(vehicle.vehicle_type);

            return (
              <Card key={vehicle.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{vehicle.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {[vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' ') || VEHICLE_TYPES.find(t => t.value === vehicle.vehicle_type)?.label}
                      </p>
                      {vehicle.registration && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-muted rounded text-xs font-mono">
                          {vehicle.registration}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expiry Badges */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <ExpiryBadge label="MOT" date={vehicle.mot_expiry} />
                    <ExpiryBadge label="Tax" date={vehicle.tax_expiry} />
                    <ExpiryBadge label="Insurance" date={vehicle.insurance_expiry} />
                  </div>

                  {/* Vehicle Details */}
                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    {vehicle.mileage !== undefined && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Gauge className="h-4 w-4" />
                        <span>{vehicle.mileage.toLocaleString()} miles</span>
                      </div>
                    )}
                    {vehicle.fuel_type && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Fuel className="h-4 w-4" />
                        <span>{FUEL_TYPES.find(t => t.value === vehicle.fuel_type)?.label}</span>
                      </div>
                    )}
                    {vehicle.current_value !== undefined && (
                      <div>
                        <div className="text-muted-foreground">Value</div>
                        <div className="font-semibold">{formatCurrency(vehicle.current_value, vehicle.currency)}</div>
                      </div>
                    )}
                  </div>

                  {/* Drivers */}
                  {vehicle.users && vehicle.users.length > 0 && (
                    <div className="mt-4 pt-3 border-t">
                      <div className="text-xs font-medium text-muted-foreground mb-2">Drivers</div>
                      <div className="flex flex-wrap gap-1">
                        {vehicle.users.map((user) => (
                          <span
                            key={user.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs group"
                          >
                            {user.person?.first_name} {user.person?.last_name}
                            {user.is_primary_driver && (
                              <span className="text-primary">(Primary)</span>
                            )}
                            <button
                              onClick={() => handleRemoveUser(vehicle.id, user.person_id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 text-red-500 hover:text-red-700"
                              title="Remove driver"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Service Records */}
                  {showServiceRecords === vehicle.id && serviceRecords.length > 0 && (
                    <div className="mt-4 pt-3 border-t">
                      <div className="text-xs font-medium text-muted-foreground mb-2">Service History</div>
                      <div className="space-y-2">
                        {serviceRecords.map((record) => (
                          <div key={record.id} className="flex items-center justify-between text-xs bg-muted rounded p-2 group">
                            <div>
                              <span className="font-medium">{SERVICE_TYPES.find(t => t.value === record.service_type)?.label}</span>
                              <span className="text-muted-foreground ml-2">{formatDate(record.service_date)}</span>
                              {record.mileage && (
                                <span className="text-muted-foreground ml-2">{record.mileage.toLocaleString()} mi</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {record.cost !== undefined && (
                                <span className="font-medium">{formatCurrency(record.cost, record.currency)}</span>
                              )}
                              <button
                                onClick={() => handleDeleteServiceRecord(vehicle.id, record.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700"
                                title="Delete record"
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
                        onClick={() => openUserModal(vehicle)}
                        className="text-xs"
                      >
                        <UserPlus className="h-3 w-3 mr-1" /> Driver
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openServiceModal(vehicle)}
                        className="text-xs"
                      >
                        <Wrench className="h-3 w-3 mr-1" /> Service
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => loadServiceRecords(vehicle.id)}
                        className="text-xs"
                      >
                        <Calendar className="h-3 w-3 mr-1" /> History
                      </Button>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEdit(vehicle)}
                        className="h-8 w-8 p-0"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingVehicle(vehicle)}
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
