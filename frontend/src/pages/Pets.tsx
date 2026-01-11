import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { Collapsible, FormSection, FormRow, FormField } from '@/components/ui/collapsible';
import { useHouseholdStore } from '@/store/household';
import { petApi } from '@/api/pet';
import { insuranceApi } from '@/api/insurance';
import { Pet, PetType, PetGender, InsurancePolicy } from '@/types';
import {
  Plus,
  PawPrint,
  Pencil,
  Trash2,
  Calendar,
  Phone,
  MapPin,
  X,
  Stethoscope,
  Shield,
  Hash,
  Info,
  FileText,
} from 'lucide-react';

const PET_TYPES: { value: PetType; label: string; emoji: string }[] = [
  { value: 'DOG', label: 'Dog', emoji: '🐕' },
  { value: 'CAT', label: 'Cat', emoji: '🐈' },
  { value: 'BIRD', label: 'Bird', emoji: '🐦' },
  { value: 'FISH', label: 'Fish', emoji: '🐟' },
  { value: 'REPTILE', label: 'Reptile', emoji: '🦎' },
  { value: 'RABBIT', label: 'Rabbit', emoji: '🐰' },
  { value: 'HAMSTER', label: 'Hamster', emoji: '🐹' },
  { value: 'OTHER', label: 'Other', emoji: '🐾' },
];

const PET_GENDERS: { value: PetGender; label: string }[] = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'UNKNOWN', label: 'Unknown' },
];

interface PetFormData {
  name: string;
  pet_type: PetType;
  breed: string;
  date_of_birth: string;
  gender: PetGender | '';
  microchip_number: string;
  vet_name: string;
  vet_phone: string;
  vet_address: string;
  insurance_policy_id: string;
  notes: string;
}

const emptyFormData: PetFormData = {
  name: '',
  pet_type: 'DOG',
  breed: '',
  date_of_birth: '',
  gender: '',
  microchip_number: '',
  vet_name: '',
  vet_phone: '',
  vet_address: '',
  insurance_policy_id: '',
  notes: '',
};

function formatAge(dateOfBirth?: string): string {
  if (!dateOfBirth) return '';
  const today = new Date();
  const birth = new Date(dateOfBirth);
  const years = today.getFullYear() - birth.getFullYear();
  const months = today.getMonth() - birth.getMonth();

  let totalMonths = years * 12 + months;
  if (today.getDate() < birth.getDate()) totalMonths--;

  if (totalMonths < 12) {
    return `${totalMonths} month${totalMonths !== 1 ? 's' : ''} old`;
  }

  const ageYears = Math.floor(totalMonths / 12);
  return `${ageYears} year${ageYears !== 1 ? 's' : ''} old`;
}

function getPetEmoji(type: PetType): string {
  return PET_TYPES.find(t => t.value === type)?.emoji || '🐾';
}

export default function Pets() {
  const { currentHousehold, fetchDefaultHousehold, createHousehold, clearError } = useHouseholdStore();

  const [pets, setPets] = useState<Pet[]>([]);
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [deletingPet, setDeletingPet] = useState<Pet | null>(null);
  const [formData, setFormData] = useState<PetFormData>(emptyFormData);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const initHousehold = async () => {
      try {
        await fetchDefaultHousehold();
        clearError();
      } catch {
        try {
          await createHousehold('My Household');
          await fetchDefaultHousehold();
          clearError();
        } catch (createErr) {
          console.error('Failed to create default household:', createErr);
        }
      }
    };
    initHousehold();
  }, [fetchDefaultHousehold, createHousehold, clearError]);

  useEffect(() => {
    if (currentHousehold) {
      loadData();
    }
  }, [currentHousehold]);

  const loadData = async () => {
    if (!currentHousehold) return;
    setIsLoading(true);
    try {
      const [petsData, policiesData] = await Promise.all([
        petApi.list(currentHousehold.id),
        insuranceApi.list(),
      ]);
      setPets(petsData);
      // Filter to only show PET type insurance policies
      setPolicies(policiesData.filter(p => p.policy_type === 'PET'));
      setError(null);
    } catch (err) {
      console.error('Failed to load pets:', err);
      setError('Failed to load pets');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(emptyFormData);
    setFormError(null);
    setShowModal(false);
    setEditingPet(null);
  };

  const openCreateModal = () => {
    setEditingPet(null);
    setFormData(emptyFormData);
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (pet: Pet) => {
    setEditingPet(pet);
    setFormData({
      name: pet.name,
      pet_type: pet.pet_type,
      breed: pet.breed || '',
      date_of_birth: pet.date_of_birth || '',
      gender: pet.gender || '',
      microchip_number: pet.microchip_number || '',
      vet_name: pet.vet_name || '',
      vet_phone: pet.vet_phone || '',
      vet_address: pet.vet_address || '',
      insurance_policy_id: pet.insurance_policy_id || '',
      notes: pet.notes || '',
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Pet name is required');
      return;
    }
    if (!currentHousehold) {
      setFormError('No household found');
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      if (editingPet) {
        const updated = await petApi.update(editingPet.id, {
          name: formData.name,
          pet_type: formData.pet_type,
          breed: formData.breed || undefined,
          date_of_birth: formData.date_of_birth || undefined,
          gender: formData.gender || undefined,
          microchip_number: formData.microchip_number || undefined,
          vet_name: formData.vet_name || undefined,
          vet_phone: formData.vet_phone || undefined,
          vet_address: formData.vet_address || undefined,
          insurance_policy_id: formData.insurance_policy_id || undefined,
          notes: formData.notes || undefined,
        });
        setPets(pets.map(p => p.id === updated.id ? updated : p));
      } else {
        const created = await petApi.create({
          household_id: currentHousehold.id,
          name: formData.name,
          pet_type: formData.pet_type,
          breed: formData.breed || undefined,
          date_of_birth: formData.date_of_birth || undefined,
          gender: formData.gender || undefined,
          microchip_number: formData.microchip_number || undefined,
          vet_name: formData.vet_name || undefined,
          vet_phone: formData.vet_phone || undefined,
          vet_address: formData.vet_address || undefined,
          insurance_policy_id: formData.insurance_policy_id || undefined,
          notes: formData.notes || undefined,
        });
        setPets([...pets, created]);
      }
      resetForm();
    } catch (err: any) {
      setFormError(err.response?.data?.error || err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingPet) return;
    setSaving(true);
    try {
      await petApi.delete(deletingPet.id);
      setPets(pets.filter(p => p.id !== deletingPet.id));
      setDeletingPet(null);
    } catch (err) {
      console.error('Failed to delete pet:', err);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading && !pets.length) {
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
          <h1 className="text-3xl font-bold">Pets</h1>
          <p className="text-muted-foreground">
            Manage your furry, feathered, and scaly family members
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="mr-2 h-4 w-4" /> Add Pet
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

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={resetForm}
        title={editingPet ? 'Edit Pet' : 'Add Pet'}
        description={editingPet ? 'Update your pet\'s information' : 'Add a new pet to your household'}
        size="lg"
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
            description="Essential details about your pet"
          >
            <FormRow>
              <FormField label="Name" htmlFor="pet-name" required>
                <Input
                  id="pet-name"
                  placeholder="e.g., Max, Bella, Whiskers"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </FormField>
              <FormField label="Type" htmlFor="pet-type" required>
                <select
                  id="pet-type"
                  value={formData.pet_type}
                  onChange={(e) => setFormData({ ...formData, pet_type: e.target.value as PetType })}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                >
                  {PET_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.emoji} {t.label}
                    </option>
                  ))}
                </select>
              </FormField>
            </FormRow>

            <FormRow>
              <FormField label="Breed" htmlFor="pet-breed">
                <Input
                  id="pet-breed"
                  placeholder="e.g., Golden Retriever, Siamese"
                  value={formData.breed}
                  onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                />
              </FormField>
              <FormField label="Date of Birth" htmlFor="pet-dob">
                <Input
                  id="pet-dob"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                />
              </FormField>
              <FormField label="Gender" htmlFor="pet-gender">
                <select
                  id="pet-gender"
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value as PetGender })}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select...</option>
                  {PET_GENDERS.map((g) => (
                    <option key={g.value} value={g.value}>{g.label}</option>
                  ))}
                </select>
              </FormField>
            </FormRow>
          </FormSection>

          {/* Identification */}
          <Collapsible
            title="Identification"
            icon={<Hash className="h-4 w-4 text-muted-foreground" />}
            defaultOpen={!!formData.microchip_number}
          >
            <FormField label="Microchip Number" htmlFor="pet-microchip" hint="15-digit microchip identification number">
              <Input
                id="pet-microchip"
                placeholder="e.g., 123456789012345"
                value={formData.microchip_number}
                onChange={(e) => setFormData({ ...formData, microchip_number: e.target.value })}
              />
            </FormField>
          </Collapsible>

          {/* Vet Information */}
          <Collapsible
            title="Veterinary Information"
            icon={<Stethoscope className="h-4 w-4 text-muted-foreground" />}
            defaultOpen={!!(formData.vet_name || formData.vet_phone || formData.vet_address)}
          >
            <div className="space-y-4">
              <FormRow>
                <FormField label="Vet/Practice Name" htmlFor="vet-name">
                  <Input
                    id="vet-name"
                    placeholder="e.g., Happy Paws Veterinary"
                    value={formData.vet_name}
                    onChange={(e) => setFormData({ ...formData, vet_name: e.target.value })}
                  />
                </FormField>
                <FormField label="Phone Number" htmlFor="vet-phone">
                  <Input
                    id="vet-phone"
                    placeholder="+44 1234 567890"
                    value={formData.vet_phone}
                    onChange={(e) => setFormData({ ...formData, vet_phone: e.target.value })}
                  />
                </FormField>
              </FormRow>
              <FormField label="Address" htmlFor="vet-address">
                <Input
                  id="vet-address"
                  placeholder="Full address of the veterinary practice"
                  value={formData.vet_address}
                  onChange={(e) => setFormData({ ...formData, vet_address: e.target.value })}
                />
              </FormField>
            </div>
          </Collapsible>

          {/* Insurance */}
          <Collapsible
            title="Insurance"
            icon={<Shield className="h-4 w-4 text-muted-foreground" />}
            defaultOpen={!!formData.insurance_policy_id}
          >
            <FormField label="Insurance Policy" htmlFor="pet-insurance">
              <select
                id="pet-insurance"
                value={formData.insurance_policy_id}
                onChange={(e) => setFormData({ ...formData, insurance_policy_id: e.target.value })}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">No insurance policy linked</option>
                {policies.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.policy_name} ({p.provider})
                  </option>
                ))}
              </select>
            </FormField>
            {policies.length === 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                No pet insurance policies found. You can add one in the Insurance section.
              </p>
            )}
          </Collapsible>

          {/* Notes */}
          <Collapsible
            title="Notes"
            icon={<FileText className="h-4 w-4 text-muted-foreground" />}
            defaultOpen={!!formData.notes}
          >
            <FormField label="Additional Notes" htmlFor="pet-notes">
              <textarea
                id="pet-notes"
                placeholder="Any additional information about your pet (dietary requirements, allergies, medical conditions, etc.)"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-y"
              />
            </FormField>
          </Collapsible>

          <ModalFooter>
            <Button type="button" variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : editingPet ? 'Save Changes' : 'Add Pet'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      {deletingPet && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Delete Pet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Are you sure you want to remove <strong>{deletingPet.name}</strong>?
              </p>
              <p className="text-sm text-muted-foreground">
                This action cannot be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setDeletingPet(null)} disabled={saving}>
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

      {/* Pets List */}
      {pets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <PawPrint className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No pets yet</h3>
            <p className="text-muted-foreground mb-4">
              Add your first pet to start tracking their information
            </p>
            <Button onClick={openCreateModal}>
              <Plus className="mr-2 h-4 w-4" /> Add Pet
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pets.map((pet) => (
            <Card key={pet.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center flex-shrink-0 text-2xl">
                    {getPetEmoji(pet.pet_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{pet.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {PET_TYPES.find(t => t.value === pet.pet_type)?.label}
                      {pet.breed && ` - ${pet.breed}`}
                    </p>
                    {pet.date_of_birth && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatAge(pet.date_of_birth)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pet Details */}
                <div className="mt-4 space-y-2">
                  {pet.gender && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="w-4 text-center">
                        {pet.gender === 'MALE' ? '♂️' : pet.gender === 'FEMALE' ? '♀️' : '?'}
                      </span>
                      <span>{PET_GENDERS.find(g => g.value === pet.gender)?.label}</span>
                    </div>
                  )}
                  {pet.microchip_number && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Hash className="h-3 w-3" />
                      <span className="truncate">{pet.microchip_number}</span>
                    </div>
                  )}
                </div>

                {/* Vet Info */}
                {(pet.vet_name || pet.vet_phone) && (
                  <div className="mt-4 pt-3 border-t">
                    <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-2">
                      <Stethoscope className="h-3 w-3" /> Vet
                    </div>
                    {pet.vet_name && (
                      <p className="text-sm">{pet.vet_name}</p>
                    )}
                    {pet.vet_phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <span>{pet.vet_phone}</span>
                      </div>
                    )}
                    {pet.vet_address && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{pet.vet_address}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Insurance */}
                {pet.insurance_policy_id && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-600">Insured</span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-4 pt-3 border-t flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditModal(pet)}
                    className="h-8 w-8 p-0"
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeletingPet(pet)}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
