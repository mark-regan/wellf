import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PlantsLayout } from './Plants';
import {
  ArrowLeft,
  Save,
} from 'lucide-react';
import { plantsApi, PLANT_HEALTH_OPTIONS, PLANT_LIGHT_OPTIONS, PLANT_HUMIDITY_OPTIONS, COMMON_ROOMS } from '@/api/plants';
import { CreatePlantRequest, UpdatePlantRequest } from '@/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function PlantForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [species, setSpecies] = useState('');
  const [variety, setVariety] = useState('');
  const [nickname, setNickname] = useState('');
  const [room, setRoom] = useState('');
  const [locationDetail, setLocationDetail] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [acquiredDate, setAcquiredDate] = useState('');
  const [acquiredFrom, setAcquiredFrom] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [wateringFrequencyDays, setWateringFrequencyDays] = useState('7');
  const [lightRequirement, setLightRequirement] = useState('medium');
  const [humidityPreference, setHumidityPreference] = useState('medium');
  const [fertilizingFrequencyDays, setFertilizingFrequencyDays] = useState('');
  const [healthStatus, setHealthStatus] = useState('healthy');
  const [notes, setNotes] = useState('');
  const [careNotes, setCareNotes] = useState('');

  useEffect(() => {
    const loadPlant = async () => {
      if (!id) return;

      try {
        const plant = await plantsApi.getPlant(id);
        setName(plant.name);
        setSpecies(plant.species || '');
        setVariety(plant.variety || '');
        setNickname(plant.nickname || '');
        setRoom(plant.room || '');
        setLocationDetail(plant.location_detail || '');
        setPhotoUrl(plant.photo_url || '');
        setAcquiredDate(plant.acquired_date ? plant.acquired_date.split('T')[0] : '');
        setAcquiredFrom(plant.acquired_from || '');
        setPurchasePrice(plant.purchase_price?.toString() || '');
        setWateringFrequencyDays(plant.watering_frequency_days.toString());
        setLightRequirement(plant.light_requirement);
        setHumidityPreference(plant.humidity_preference);
        setFertilizingFrequencyDays(plant.fertilizing_frequency_days?.toString() || '');
        setHealthStatus(plant.health_status);
        setNotes(plant.notes || '');
        setCareNotes(plant.care_notes || '');
      } catch (error) {
        console.error('Failed to load plant:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPlant();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      if (isEditing && id) {
        const data: UpdatePlantRequest = {
          name: name.trim(),
          species: species.trim() || undefined,
          variety: variety.trim() || undefined,
          nickname: nickname.trim() || undefined,
          room: room.trim() || undefined,
          location_detail: locationDetail.trim() || undefined,
          photo_url: photoUrl.trim() || undefined,
          acquired_date: acquiredDate || undefined,
          acquired_from: acquiredFrom.trim() || undefined,
          purchase_price: purchasePrice ? parseFloat(purchasePrice) : undefined,
          watering_frequency_days: parseInt(wateringFrequencyDays) || 7,
          light_requirement: lightRequirement as UpdatePlantRequest['light_requirement'],
          humidity_preference: humidityPreference as UpdatePlantRequest['humidity_preference'],
          fertilizing_frequency_days: fertilizingFrequencyDays ? parseInt(fertilizingFrequencyDays) : undefined,
          health_status: healthStatus as UpdatePlantRequest['health_status'],
          notes: notes.trim() || undefined,
          care_notes: careNotes.trim() || undefined,
        };
        await plantsApi.updatePlant(id, data);
        navigate(`/plants/${id}`);
      } else {
        const data: CreatePlantRequest = {
          name: name.trim(),
          species: species.trim() || undefined,
          variety: variety.trim() || undefined,
          nickname: nickname.trim() || undefined,
          room: room.trim() || undefined,
          location_detail: locationDetail.trim() || undefined,
          photo_url: photoUrl.trim() || undefined,
          acquired_date: acquiredDate || undefined,
          acquired_from: acquiredFrom.trim() || undefined,
          purchase_price: purchasePrice ? parseFloat(purchasePrice) : undefined,
          watering_frequency_days: parseInt(wateringFrequencyDays) || 7,
          light_requirement: lightRequirement as CreatePlantRequest['light_requirement'],
          humidity_preference: humidityPreference as CreatePlantRequest['humidity_preference'],
          fertilizing_frequency_days: fertilizingFrequencyDays ? parseInt(fertilizingFrequencyDays) : undefined,
          notes: notes.trim() || undefined,
          care_notes: careNotes.trim() || undefined,
        };
        const plant = await plantsApi.createPlant(data);
        navigate(`/plants/${plant.id}`);
      }
    } catch (error) {
      console.error('Failed to save plant:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PlantsLayout>
        <div className="text-center py-12 text-muted-foreground">Loading plant...</div>
      </PlantsLayout>
    );
  }

  return (
    <PlantsLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to={isEditing ? `/plants/${id}` : '/plants/list'}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="font-display text-2xl font-bold">
              {isEditing ? 'Edit Plant' : 'Add New Plant'}
            </h1>
            <p className="text-muted-foreground">
              {isEditing ? 'Update your plant details' : 'Add a new plant to your collection'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name *</label>
                  <Input
                    placeholder="e.g., Monstera Deliciosa"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nickname</label>
                  <Input
                    placeholder="e.g., Monty"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Species</label>
                  <Input
                    placeholder="e.g., Monstera"
                    value={species}
                    onChange={(e) => setSpecies(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Variety</label>
                  <Input
                    placeholder="e.g., Variegata"
                    value={variety}
                    onChange={(e) => setVariety(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Photo URL</label>
                <Input
                  placeholder="https://..."
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader>
              <CardTitle>Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Room</label>
                  <Select value={room} onValueChange={setRoom}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a room" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_ROOMS.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {room === 'other' && (
                    <Input
                      placeholder="Enter room name"
                      value={room === 'other' ? '' : room}
                      onChange={(e) => setRoom(e.target.value)}
                      className="mt-2"
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Location Detail</label>
                  <Input
                    placeholder="e.g., Near window, on bookshelf"
                    value={locationDetail}
                    onChange={(e) => setLocationDetail(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Care Requirements */}
          <Card>
            <CardHeader>
              <CardTitle>Care Requirements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Watering Frequency (days)</label>
                  <Input
                    type="number"
                    min="1"
                    max="60"
                    value={wateringFrequencyDays}
                    onChange={(e) => setWateringFrequencyDays(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Light Requirement</label>
                  <Select value={lightRequirement} onValueChange={setLightRequirement}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PLANT_LIGHT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Humidity Preference</label>
                  <Select value={humidityPreference} onValueChange={setHumidityPreference}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PLANT_HUMIDITY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fertilizing Frequency (days)</label>
                  <Input
                    type="number"
                    min="1"
                    max="365"
                    placeholder="e.g., 30"
                    value={fertilizingFrequencyDays}
                    onChange={(e) => setFertilizingFrequencyDays(e.target.value)}
                  />
                </div>
                {isEditing && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Health Status</label>
                    <Select value={healthStatus} onValueChange={setHealthStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PLANT_HEALTH_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Acquisition */}
          <Card>
            <CardHeader>
              <CardTitle>Acquisition</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Acquired Date</label>
                  <Input
                    type="date"
                    value={acquiredDate}
                    onChange={(e) => setAcquiredDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Acquired From</label>
                  <Input
                    placeholder="e.g., Local nursery"
                    value={acquiredFrom}
                    onChange={(e) => setAcquiredFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Purchase Price</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">General Notes</label>
                <Textarea
                  placeholder="Any notes about this plant..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Care Notes</label>
                <Textarea
                  placeholder="Specific care instructions or observations..."
                  value={careNotes}
                  onChange={(e) => setCareNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button variant="outline" type="button" asChild>
              <Link to={isEditing ? `/plants/${id}` : '/plants/list'}>Cancel</Link>
            </Button>
            <Button type="submit" disabled={saving || !name.trim()} className="bg-plants hover:bg-plants/90">
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Plant'}
            </Button>
          </div>
        </form>
      </div>
    </PlantsLayout>
  );
}
