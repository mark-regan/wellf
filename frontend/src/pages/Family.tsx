import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useHouseholdStore } from '@/store/household';
import { Person, Gender, RelationshipType } from '@/types';
import {
  Plus,
  Users,
  User,
  Pencil,
  Trash2,
  Calendar,
  Mail,
  Phone,
  Heart,
  X,
  UserPlus,
  Crown,
} from 'lucide-react';

const GENDERS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
  { value: 'other', label: 'Other' },
];

const RELATIONSHIP_TYPES: { value: RelationshipType; label: string }[] = [
  { value: 'spouse', label: 'Spouse' },
  { value: 'partner', label: 'Partner' },
  { value: 'parent', label: 'Parent' },
  { value: 'child', label: 'Child' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'grandparent', label: 'Grandparent' },
  { value: 'grandchild', label: 'Grandchild' },
  { value: 'aunt_uncle', label: 'Aunt/Uncle' },
  { value: 'niece_nephew', label: 'Niece/Nephew' },
  { value: 'cousin', label: 'Cousin' },
  { value: 'step_parent', label: 'Step-parent' },
  { value: 'step_child', label: 'Step-child' },
  { value: 'step_sibling', label: 'Step-sibling' },
  { value: 'in_law', label: 'In-law' },
  { value: 'guardian', label: 'Guardian' },
  { value: 'ward', label: 'Ward' },
  { value: 'other', label: 'Other' },
];

interface PersonFormData {
  first_name: string;
  last_name: string;
  nickname: string;
  date_of_birth: string;
  gender: Gender | '';
  email: string;
  phone: string;
  is_primary_account_holder: boolean;
}

const emptyFormData: PersonFormData = {
  first_name: '',
  last_name: '',
  nickname: '',
  date_of_birth: '',
  gender: '',
  email: '',
  phone: '',
  is_primary_account_holder: false,
};

function formatAge(dateOfBirth?: string): string {
  if (!dateOfBirth) return '';
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return `${age} years old`;
}

function getRelationshipLabel(type: string): string {
  const found = RELATIONSHIP_TYPES.find(r => r.value === type);
  return found?.label || type;
}

export function Family() {
  const {
    currentHousehold,
    people,
    isLoading,
    error,
    fetchDefaultHousehold,
    fetchPeople,
    createHousehold,
    updateHousehold,
    createPerson,
    updatePerson,
    deletePerson,
    addRelationship,
    removeRelationship,
    clearError,
  } = useHouseholdStore();

  const [showCreate, setShowCreate] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [deletingPerson, setDeletingPerson] = useState<Person | null>(null);
  const [formData, setFormData] = useState<PersonFormData>(emptyFormData);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Household name editing state
  const [editingHouseholdName, setEditingHouseholdName] = useState(false);
  const [householdName, setHouseholdName] = useState('');

  // Relationship modal state
  const [showRelationshipModal, setShowRelationshipModal] = useState(false);
  const [relationshipPerson, setRelationshipPerson] = useState<Person | null>(null);
  const [selectedRelatedPerson, setSelectedRelatedPerson] = useState<string>('');
  const [selectedRelationshipType, setSelectedRelationshipType] = useState<RelationshipType | ''>('');

  useEffect(() => {
    const initHousehold = async () => {
      try {
        await fetchDefaultHousehold();
        clearError();
      } catch {
        // No household exists - create one automatically
        try {
          await createHousehold('My Household');
          // Fetch it again to set as current
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
      fetchPeople(currentHousehold.id);
    }
  }, [currentHousehold, fetchPeople]);

  const resetForm = () => {
    setFormData(emptyFormData);
    setFormError(null);
    setShowCreate(false);
    setEditingPerson(null);
  };

  const startEditingHouseholdName = () => {
    if (currentHousehold) {
      setHouseholdName(currentHousehold.name);
      setEditingHouseholdName(true);
    }
  };

  const saveHouseholdName = async () => {
    if (!currentHousehold || !householdName.trim()) return;
    setSaving(true);
    try {
      await updateHousehold(currentHousehold.id, householdName.trim());
      setEditingHouseholdName(false);
    } catch (err) {
      console.error('Failed to update household name:', err);
    } finally {
      setSaving(false);
    }
  };

  const cancelEditingHouseholdName = () => {
    setEditingHouseholdName(false);
    setHouseholdName('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.first_name.trim()) {
      setFormError('First name is required');
      return;
    }
    if (!currentHousehold) {
      setFormError('No household found');
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      if (editingPerson) {
        await updatePerson(editingPerson.id, {
          first_name: formData.first_name,
          last_name: formData.last_name || undefined,
          nickname: formData.nickname || undefined,
          date_of_birth: formData.date_of_birth || undefined,
          gender: formData.gender || undefined,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          is_primary_account_holder: formData.is_primary_account_holder,
        });
      } else {
        await createPerson({
          household_id: currentHousehold.id,
          first_name: formData.first_name,
          last_name: formData.last_name || undefined,
          nickname: formData.nickname || undefined,
          date_of_birth: formData.date_of_birth || undefined,
          gender: formData.gender || undefined,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          is_primary_account_holder: formData.is_primary_account_holder,
        });
      }
      resetForm();
    } catch (err: any) {
      setFormError(err.response?.data?.error || err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingPerson) return;
    setSaving(true);
    try {
      await deletePerson(deletingPerson.id);
      setDeletingPerson(null);
    } catch (err) {
      console.error('Failed to delete:', err);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (person: Person) => {
    setEditingPerson(person);
    setFormData({
      first_name: person.first_name,
      last_name: person.last_name || '',
      nickname: person.nickname || '',
      date_of_birth: person.date_of_birth || '',
      gender: person.gender || '',
      email: person.email || '',
      phone: person.phone || '',
      is_primary_account_holder: person.is_primary_account_holder,
    });
    setShowCreate(false);
  };

  const openRelationshipModal = (person: Person) => {
    setRelationshipPerson(person);
    setSelectedRelatedPerson('');
    setSelectedRelationshipType('');
    setShowRelationshipModal(true);
  };

  const handleAddRelationship = async () => {
    if (!relationshipPerson || !selectedRelatedPerson || !selectedRelationshipType) return;

    setSaving(true);
    try {
      await addRelationship(relationshipPerson.id, selectedRelatedPerson, selectedRelationshipType);
      setShowRelationshipModal(false);
      setRelationshipPerson(null);
    } catch (err) {
      console.error('Failed to add relationship:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveRelationship = async (personId: string, relationshipId: string) => {
    setSaving(true);
    try {
      await removeRelationship(personId, relationshipId);
    } catch (err) {
      console.error('Failed to remove relationship:', err);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading && !people.length) {
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
          <h1 className="text-3xl font-bold">Family</h1>
          {editingHouseholdName ? (
            <div className="flex items-center gap-2 mt-1">
              <Input
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                className="h-8 w-64"
                placeholder="Household name"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveHouseholdName();
                  if (e.key === 'Escape') cancelEditingHouseholdName();
                }}
              />
              <Button size="sm" onClick={saveHouseholdName} disabled={saving || !householdName.trim()}>
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={cancelEditingHouseholdName}>
                Cancel
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground group flex items-center gap-2">
              {currentHousehold ? (
                <>
                  <span>{currentHousehold.name}</span>
                  <button
                    onClick={startEditingHouseholdName}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                    title="Edit household name"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                </>
              ) : (
                'Manage your family members'
              )}
            </p>
          )}
        </div>
        <Button onClick={() => { setShowCreate(true); setEditingPerson(null); setFormData(emptyFormData); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Family Member
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center justify-between">
          <span>{error}</span>
          <button onClick={clearError} className="text-red-700 hover:text-red-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Create/Edit Form */}
      {(showCreate || editingPerson) && (
        <Card>
          <CardHeader>
            <CardTitle>{editingPerson ? 'Edit Family Member' : 'Add Family Member'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                  {formError}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-sm font-medium">First Name *</label>
                  <Input
                    placeholder="First name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Last Name</label>
                  <Input
                    placeholder="Last name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Nickname</label>
                  <Input
                    placeholder="Nickname"
                    value={formData.nickname}
                    onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-sm font-medium">Date of Birth</label>
                  <Input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as Gender })}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select...</option>
                    {GENDERS.map((g) => (
                      <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="primary"
                    checked={formData.is_primary_account_holder}
                    onChange={(e) => setFormData({ ...formData, is_primary_account_holder: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <label htmlFor="primary" className="text-sm">Primary Account Holder</label>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Phone</label>
                  <Input
                    type="tel"
                    placeholder="+44 7700 900000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : editingPerson ? 'Save Changes' : 'Add Member'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation */}
      {deletingPerson && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Delete Family Member</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Are you sure you want to remove <strong>{deletingPerson.first_name} {deletingPerson.last_name}</strong>?
              </p>
              <p className="text-sm text-muted-foreground">
                This will also remove all their relationships. This action cannot be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setDeletingPerson(null)} disabled={saving}>
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

      {/* Add Relationship Modal */}
      {showRelationshipModal && relationshipPerson && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Add Relationship</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Define how <strong>{relationshipPerson.first_name}</strong> is related to another family member.
              </p>
              <div>
                <label className="text-sm font-medium">Related Person</label>
                <select
                  value={selectedRelatedPerson}
                  onChange={(e) => setSelectedRelatedPerson(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select person...</option>
                  {people
                    .filter(p => p.id !== relationshipPerson.id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.first_name} {p.last_name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">
                  {relationshipPerson.first_name} is the ___ of the selected person
                </label>
                <select
                  value={selectedRelationshipType}
                  onChange={(e) => setSelectedRelationshipType(e.target.value as RelationshipType)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select relationship...</option>
                  {RELATIONSHIP_TYPES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowRelationshipModal(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAddRelationship}
                  disabled={saving || !selectedRelatedPerson || !selectedRelationshipType}
                >
                  {saving ? 'Adding...' : 'Add Relationship'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Family Members List */}
      {people.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No family members yet</h3>
            <p className="text-muted-foreground mb-4">
              Add your first family member to start tracking your household
            </p>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Family Member
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {people.map((person) => (
            <Card key={person.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {person.avatar_url ? (
                      <img src={person.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <User className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">
                        {person.first_name} {person.last_name}
                      </h3>
                      {person.is_primary_account_holder && (
                        <span title="Primary Account Holder">
                          <Crown className="h-4 w-4 text-amber-500 flex-shrink-0" />
                        </span>
                      )}
                    </div>
                    {person.nickname && (
                      <p className="text-sm text-muted-foreground">"{person.nickname}"</p>
                    )}
                    {person.date_of_birth && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatAge(person.date_of_birth)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact Info */}
                <div className="mt-4 space-y-1">
                  {person.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{person.email}</span>
                    </div>
                  )}
                  {person.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span>{person.phone}</span>
                    </div>
                  )}
                </div>

                {/* Relationships */}
                {person.relationships && person.relationships.length > 0 && (
                  <div className="mt-4 pt-3 border-t">
                    <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-2">
                      <Heart className="h-3 w-3" /> Relationships
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {person.relationships.map((rel) => (
                        <span
                          key={rel.id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs group"
                        >
                          {getRelationshipLabel(rel.relationship_type)}
                          {rel.related_person && (
                            <span className="text-muted-foreground">of {rel.related_person.first_name}</span>
                          )}
                          <button
                            onClick={() => handleRemoveRelationship(person.id, rel.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 text-red-500 hover:text-red-700"
                            title="Remove relationship"
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
                    onClick={() => openRelationshipModal(person)}
                    className="text-xs"
                  >
                    <UserPlus className="h-3 w-3 mr-1" /> Add Relationship
                  </Button>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEdit(person)}
                      className="h-8 w-8 p-0"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingPerson(person)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
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
