import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PlantsLayout } from './Plants';
import {
  Leaf,
  Droplets,
  Sun,
  Thermometer,
  Edit2,
  Trash2,
  ArrowLeft,
  Heart,
  Sprout,
  CloudRain,
  Scissors,
  Package,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Plus,
  Camera,
  Upload,
  Star,
  X,
  TrendingUp,
  AlertTriangle,
  Pill,
  Award,
  ImageIcon,
} from 'lucide-react';
import { plantsApi, PLANT_HEALTH_OPTIONS, PLANT_LIGHT_OPTIONS, PLANT_HUMIDITY_OPTIONS, PLANT_CARE_TYPES, PLANT_PHOTO_TYPES } from '@/api/plants';
import { Plant, PlantCareLog, PlantPhoto, PlantPhotoType, LogCareRequest } from '@/types';
import { GrowthTimeline } from '@/components/plants/GrowthTimeline';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function PlantDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [plant, setPlant] = useState<Plant | null>(null);
  const [careLogs, setCareLogs] = useState<PlantCareLog[]>([]);
  const [photos, setPhotos] = useState<PlantPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  // Log care dialog
  const [showCareDialog, setShowCareDialog] = useState(false);
  const [careType, setCareType] = useState<string>('watered');
  const [careNotes, setCareNotes] = useState('');
  const [loggingCare, setLoggingCare] = useState(false);

  // Photo upload dialog
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [photoCaption, setPhotoCaption] = useState('');
  const [photoType, setPhotoType] = useState<PlantPhotoType>('general');
  const [isPrimaryPhoto, setIsPrimaryPhoto] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Photo viewer
  const [viewingPhoto, setViewingPhoto] = useState<PlantPhoto | null>(null);

  const loadData = async () => {
    if (!id) return;

    try {
      const [plantData, careData, photoData] = await Promise.all([
        plantsApi.getPlant(id),
        plantsApi.getPlantCareLogs(id, 10),
        plantsApi.getPlantPhotos(id),
      ]);
      setPlant(plantData);
      setCareLogs(careData);
      setPhotos(photoData);
    } catch (error) {
      console.error('Failed to load plant:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleWater = async () => {
    if (!id) return;
    try {
      const updated = await plantsApi.waterPlant(id);
      setPlant(updated);
      await loadData();
    } catch (error) {
      console.error('Failed to water plant:', error);
    }
  };

  const handleLogCare = async () => {
    if (!id) return;

    setLoggingCare(true);
    try {
      const data: LogCareRequest = {
        care_type: careType as LogCareRequest['care_type'],
        notes: careNotes || undefined,
      };
      await plantsApi.createCareLog(id, data);
      setShowCareDialog(false);
      setCareType('watered');
      setCareNotes('');
      await loadData();
    } catch (error) {
      console.error('Failed to log care:', error);
    } finally {
      setLoggingCare(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm('Are you sure you want to archive this plant?')) return;

    try {
      await plantsApi.deletePlant(id);
      navigate('/plants/list');
    } catch (error) {
      console.error('Failed to delete plant:', error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoUpload = async () => {
    if (!id || !photoFile) return;

    setUploadingPhoto(true);
    try {
      await plantsApi.uploadPlantPhoto(id, photoFile, {
        caption: photoCaption || undefined,
        photoType,
        isPrimary: isPrimaryPhoto,
      });
      setShowPhotoDialog(false);
      resetPhotoForm();
      await loadData();
    } catch (error) {
      console.error('Failed to upload photo:', error);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const resetPhotoForm = () => {
    setPhotoFile(null);
    setPhotoPreview('');
    setPhotoCaption('');
    setPhotoType('general');
    setIsPrimaryPhoto(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSetPrimary = async (photoId: string) => {
    try {
      await plantsApi.setPhotoPrimary(photoId);
      await loadData();
    } catch (error) {
      console.error('Failed to set primary photo:', error);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) return;

    try {
      await plantsApi.deletePhoto(photoId);
      setViewingPhoto(null);
      await loadData();
    } catch (error) {
      console.error('Failed to delete photo:', error);
    }
  };

  const getPhotoTypeIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      general: <Camera className="h-3 w-3" />,
      growth: <TrendingUp className="h-3 w-3" />,
      problem: <AlertTriangle className="h-3 w-3" />,
      treatment: <Pill className="h-3 w-3" />,
      milestone: <Award className="h-3 w-3" />,
    };
    return icons[type] || <Camera className="h-3 w-3" />;
  };

  const getCareIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      watered: <Droplets className="h-4 w-4 text-blue-500" />,
      fertilized: <Leaf className="h-4 w-4 text-green-500" />,
      pruned: <Scissors className="h-4 w-4 text-orange-500" />,
      repotted: <Package className="h-4 w-4 text-amber-600" />,
      treated: <ShieldCheck className="h-4 w-4 text-purple-500" />,
      misted: <CloudRain className="h-4 w-4 text-sky-500" />,
      rotated: <RotateCcw className="h-4 w-4 text-gray-500" />,
      cleaned: <Sparkles className="h-4 w-4 text-yellow-500" />,
    };
    return icons[type] || <Sprout className="h-4 w-4 text-plants" />;
  };

  const getHealthBadge = (status: string) => {
    const option = PLANT_HEALTH_OPTIONS.find((o) => o.value === status);
    const colorClass = {
      emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
      green: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
      orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
      red: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    }[option?.color ?? 'green'];

    return (
      <Badge variant="secondary" className={colorClass}>
        {option?.label ?? status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <PlantsLayout>
        <div className="text-center py-12 text-muted-foreground">Loading plant...</div>
      </PlantsLayout>
    );
  }

  if (!plant) {
    return (
      <PlantsLayout>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Leaf className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium mb-2">Plant not found</h3>
            <p className="text-muted-foreground max-w-sm mb-4">
              This plant may have been deleted or doesn't exist.
            </p>
            <Button asChild variant="outline">
              <Link to="/plants/list">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Plants
              </Link>
            </Button>
          </CardContent>
        </Card>
      </PlantsLayout>
    );
  }

  return (
    <PlantsLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/plants/list">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="flex items-center gap-4">
              {plant.photo_url ? (
                <img
                  src={plant.photo_url}
                  alt={plant.name}
                  className="w-16 h-16 rounded-lg object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-plants/10 flex items-center justify-center">
                  <Leaf className="h-8 w-8 text-plants" />
                </div>
              )}
              <div>
                <h1 className="font-display text-2xl font-bold">{plant.name}</h1>
                {plant.species && (
                  <p className="text-muted-foreground italic">{plant.species}</p>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowCareDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Log Care
            </Button>
            <Button onClick={handleWater} className="bg-blue-500 hover:bg-blue-600">
              <Droplets className="mr-2 h-4 w-4" />
              Water
            </Button>
            <Button variant="outline" asChild>
              <Link to={`/plants/${id}/edit`}>
                <Edit2 className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Heart className="h-5 w-5 text-plants" />
                <div>
                  <p className="text-sm text-muted-foreground">Health</p>
                  {getHealthBadge(plant.health_status)}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Droplets className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Watering</p>
                  <p className="font-medium">
                    {plant.days_until_water !== undefined ? (
                      plant.days_until_water <= 0 ? (
                        <span className="text-orange-600">Water now</span>
                      ) : (
                        `In ${plant.days_until_water} days`
                      )
                    ) : (
                      'Every ' + plant.watering_frequency_days + ' days'
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Sun className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Light</p>
                  <p className="font-medium">
                    {PLANT_LIGHT_OPTIONS.find((o) => o.value === plant.light_requirement)?.label ?? plant.light_requirement}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Thermometer className="h-5 w-5 text-cyan-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Humidity</p>
                  <p className="font-medium">
                    {PLANT_HUMIDITY_OPTIONS.find((o) => o.value === plant.humidity_preference)?.label ?? plant.humidity_preference}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Details Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Plant Details */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {plant.room && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Location</span>
                  <span>{plant.room}{plant.location_detail && ` - ${plant.location_detail}`}</span>
                </div>
              )}
              {plant.variety && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Variety</span>
                  <span>{plant.variety}</span>
                </div>
              )}
              {plant.nickname && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nickname</span>
                  <span>{plant.nickname}</span>
                </div>
              )}
              {plant.acquired_date && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Acquired</span>
                  <span>{new Date(plant.acquired_date).toLocaleDateString()}</span>
                </div>
              )}
              {plant.acquired_from && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">From</span>
                  <span>{plant.acquired_from}</span>
                </div>
              )}
              {plant.purchase_price && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price</span>
                  <span>${plant.purchase_price.toFixed(2)}</span>
                </div>
              )}
              {plant.last_watered_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Watered</span>
                  <span>{new Date(plant.last_watered_at).toLocaleDateString()}</span>
                </div>
              )}
              {plant.last_fertilized_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Fertilized</span>
                  <span>{new Date(plant.last_fertilized_at).toLocaleDateString()}</span>
                </div>
              )}
              {plant.last_repotted_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Repotted</span>
                  <span>{new Date(plant.last_repotted_at).toLocaleDateString()}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Care History */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Care History</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowCareDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Log Care
              </Button>
            </CardHeader>
            <CardContent>
              {careLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Sprout className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <h3 className="font-medium mb-2">No care logged yet</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Log watering, fertilizing, and other care activities to track your plant's history.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {careLogs.map((log) => (
                    <div key={log.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        {getCareIcon(log.care_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium capitalize">{log.care_type}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(log.care_date).toLocaleDateString()}
                          {log.notes && ` - ${log.notes}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Photo Gallery */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Photos</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setShowPhotoDialog(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Add Photo
            </Button>
          </CardHeader>
          <CardContent>
            {photos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <ImageIcon className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="font-medium mb-2">No photos yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm mb-4">
                  Track your plant's growth by adding photos over time.
                </p>
                <Button variant="outline" onClick={() => setShowPhotoDialog(true)}>
                  <Camera className="mr-2 h-4 w-4" />
                  Add First Photo
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group"
                    onClick={() => setViewingPhoto(photo)}
                  >
                    <img
                      src={photo.photo_url}
                      alt={photo.caption || 'Plant photo'}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    {photo.is_primary && (
                      <div className="absolute top-2 left-2">
                        <Badge className="bg-yellow-500 text-white">
                          <Star className="h-3 w-3 mr-1" />
                          Primary
                        </Badge>
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex items-center gap-1 text-white text-xs">
                        {getPhotoTypeIcon(photo.photo_type)}
                        <span className="capitalize">{photo.photo_type}</span>
                      </div>
                      <p className="text-white text-xs mt-1">
                        {new Date(photo.taken_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Growth Timeline */}
        {photos.length > 0 && (
          <GrowthTimeline
            photos={photos}
            onPhotoClick={(photo) => setViewingPhoto(photo)}
          />
        )}

        {/* Notes */}
        {(plant.notes || plant.care_notes) && (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {plant.notes && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">General Notes</h4>
                  <p className="text-sm whitespace-pre-wrap">{plant.notes}</p>
                </div>
              )}
              {plant.care_notes && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Care Notes</h4>
                  <p className="text-sm whitespace-pre-wrap">{plant.care_notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Log Care Dialog */}
      <Dialog open={showCareDialog} onOpenChange={setShowCareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Plant Care</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Care Type</label>
              <Select value={careType} onValueChange={setCareType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLANT_CARE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes (optional)</label>
              <Textarea
                placeholder="Any notes about this care activity..."
                value={careNotes}
                onChange={(e) => setCareNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCareDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleLogCare}
              disabled={loggingCare}
              className="bg-plants hover:bg-plants/90"
            >
              {loggingCare ? 'Logging...' : 'Log Care'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Photo Upload Dialog */}
      <Dialog open={showPhotoDialog} onOpenChange={(open) => {
        setShowPhotoDialog(open);
        if (!open) resetPhotoForm();
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Plant Photo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {photoPreview ? (
              <div className="relative">
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-full aspect-video object-cover rounded-lg"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    setPhotoFile(null);
                    setPhotoPreview('');
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
              >
                <Camera className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-sm text-muted-foreground">
                  Click to select a photo
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  JPEG, PNG, GIF, or WebP up to 10MB
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Photo Type</label>
              <Select value={photoType} onValueChange={(v) => setPhotoType(v as PlantPhotoType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLANT_PHOTO_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Caption (optional)</label>
              <Input
                placeholder="Add a caption..."
                value={photoCaption}
                onChange={(e) => setPhotoCaption(e.target.value)}
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPrimaryPhoto}
                onChange={(e) => setIsPrimaryPhoto(e.target.checked)}
                className="rounded border-muted-foreground/25"
              />
              <span className="text-sm">Set as primary photo</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowPhotoDialog(false);
              resetPhotoForm();
            }}>
              Cancel
            </Button>
            <Button
              onClick={handlePhotoUpload}
              disabled={!photoFile || uploadingPhoto}
              className="bg-plants hover:bg-plants/90"
            >
              {uploadingPhoto ? 'Uploading...' : 'Upload Photo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Photo Viewer Dialog */}
      <Dialog open={!!viewingPhoto} onOpenChange={(open) => !open && setViewingPhoto(null)}>
        <DialogContent className="max-w-3xl">
          {viewingPhoto && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {getPhotoTypeIcon(viewingPhoto.photo_type)}
                  <span className="capitalize">{viewingPhoto.photo_type}</span>
                  {viewingPhoto.is_primary && (
                    <Badge className="bg-yellow-500 text-white ml-2">
                      <Star className="h-3 w-3 mr-1" />
                      Primary
                    </Badge>
                  )}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <img
                  src={viewingPhoto.photo_url}
                  alt={viewingPhoto.caption || 'Plant photo'}
                  className="w-full rounded-lg"
                />
                {viewingPhoto.caption && (
                  <p className="text-sm">{viewingPhoto.caption}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Taken {new Date(viewingPhoto.taken_at).toLocaleDateString()}
                </p>
              </div>
              <DialogFooter className="flex-row justify-between sm:justify-between">
                <Button
                  variant="destructive"
                  onClick={() => handleDeletePhoto(viewingPhoto.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
                <div className="flex gap-2">
                  {!viewingPhoto.is_primary && (
                    <Button
                      variant="outline"
                      onClick={() => handleSetPrimary(viewingPhoto.id)}
                    >
                      <Star className="mr-2 h-4 w-4" />
                      Set as Primary
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setViewingPhoto(null)}>
                    Close
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PlantsLayout>
  );
}
