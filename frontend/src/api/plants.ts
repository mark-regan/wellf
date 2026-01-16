import api from './client';
import {
  Plant,
  PlantCareLog,
  PlantHealthLog,
  PlantPhoto,
  PlantPhotoType,
  PlantSummary,
  PlantsByRoom,
  CreatePlantRequest,
  UpdatePlantRequest,
  LogCareRequest,
  LogHealthRequest,
  WaterMultipleRequest,
} from '@/types';

// Photo upload options
interface UploadPhotoOptions {
  caption?: string;
  photoType?: PlantPhotoType;
  isPrimary?: boolean;
  takenAt?: string;
}

// Plant filters
interface PlantFilters {
  all?: boolean; // Include inactive plants
}

export const plantsApi = {
  // =============================================================================
  // Plants CRUD
  // =============================================================================

  listPlants: async (filters?: PlantFilters): Promise<Plant[]> => {
    const params = new URLSearchParams();
    if (filters?.all) params.append('all', 'true');

    const queryString = params.toString();
    const url = queryString ? `/plants?${queryString}` : '/plants';
    const response = await api.get<Plant[]>(url);
    return response.data;
  },

  getPlant: async (id: string): Promise<Plant> => {
    const response = await api.get<Plant>(`/plants/${id}`);
    return response.data;
  },

  createPlant: async (data: CreatePlantRequest): Promise<Plant> => {
    const response = await api.post<Plant>('/plants', data);
    return response.data;
  },

  updatePlant: async (id: string, data: UpdatePlantRequest): Promise<Plant> => {
    const response = await api.put<Plant>(`/plants/${id}`, data);
    return response.data;
  },

  deletePlant: async (id: string): Promise<void> => {
    await api.delete(`/plants/${id}`);
  },

  // =============================================================================
  // Watering
  // =============================================================================

  waterPlant: async (id: string): Promise<Plant> => {
    const response = await api.post<Plant>(`/plants/${id}/water`);
    return response.data;
  },

  waterMultiplePlants: async (plantIds: string[]): Promise<{ watered: number }> => {
    const data: WaterMultipleRequest = { plant_ids: plantIds };
    const response = await api.post<{ watered: number }>('/plants/water-multiple', data);
    return response.data;
  },

  getPlantsNeedingWater: async (daysAhead = 0): Promise<Plant[]> => {
    const params = new URLSearchParams();
    if (daysAhead > 0) params.append('days', daysAhead.toString());

    const queryString = params.toString();
    const url = queryString ? `/plants/needing-water?${queryString}` : '/plants/needing-water';
    const response = await api.get<Plant[]>(url);
    return response.data;
  },

  // =============================================================================
  // Organization
  // =============================================================================

  getPlantsByRoom: async (): Promise<PlantsByRoom[]> => {
    const response = await api.get<PlantsByRoom[]>('/plants/by-room');
    return response.data;
  },

  // =============================================================================
  // Care Logs
  // =============================================================================

  getPlantCareLogs: async (plantId: string, limit = 50): Promise<PlantCareLog[]> => {
    const response = await api.get<PlantCareLog[]>(`/plants/${plantId}/care-logs?limit=${limit}`);
    return response.data;
  },

  createCareLog: async (plantId: string, data: LogCareRequest): Promise<PlantCareLog> => {
    const response = await api.post<PlantCareLog>(`/plants/${plantId}/care-logs`, data);
    return response.data;
  },

  getRecentCareLogs: async (limit = 20): Promise<PlantCareLog[]> => {
    const response = await api.get<PlantCareLog[]>(`/plants/care-logs/recent?limit=${limit}`);
    return response.data;
  },

  deleteCareLog: async (logId: string): Promise<void> => {
    await api.delete(`/plants/care-logs/${logId}`);
  },

  // =============================================================================
  // Health Logs
  // =============================================================================

  getPlantHealthLogs: async (plantId: string, limit = 50): Promise<PlantHealthLog[]> => {
    const response = await api.get<PlantHealthLog[]>(`/plants/${plantId}/health-logs?limit=${limit}`);
    return response.data;
  },

  createHealthLog: async (plantId: string, data: LogHealthRequest): Promise<PlantHealthLog> => {
    const response = await api.post<PlantHealthLog>(`/plants/${plantId}/health-logs`, data);
    return response.data;
  },

  deleteHealthLog: async (logId: string): Promise<void> => {
    await api.delete(`/plants/health-logs/${logId}`);
  },

  // =============================================================================
  // Summary
  // =============================================================================

  getSummary: async (): Promise<PlantSummary> => {
    const response = await api.get<PlantSummary>('/plants/summary');
    return response.data;
  },

  // =============================================================================
  // Photos
  // =============================================================================

  getPlantPhotos: async (plantId: string): Promise<PlantPhoto[]> => {
    const response = await api.get<PlantPhoto[]>(`/plants/${plantId}/photos`);
    return response.data;
  },

  uploadPlantPhoto: async (
    plantId: string,
    file: File,
    options?: UploadPhotoOptions
  ): Promise<PlantPhoto> => {
    const formData = new FormData();
    formData.append('photo', file);

    if (options?.caption) {
      formData.append('caption', options.caption);
    }
    if (options?.photoType) {
      formData.append('photo_type', options.photoType);
    }
    if (options?.isPrimary) {
      formData.append('is_primary', 'true');
    }
    if (options?.takenAt) {
      formData.append('taken_at', options.takenAt);
    }

    const response = await api.post<PlantPhoto>(`/plants/${plantId}/photos`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  updatePhotoCaption: async (photoId: string, caption: string): Promise<PlantPhoto> => {
    const response = await api.put<PlantPhoto>(`/plants/photos/${photoId}`, { caption });
    return response.data;
  },

  setPhotoPrimary: async (photoId: string): Promise<PlantPhoto> => {
    const response = await api.post<PlantPhoto>(`/plants/photos/${photoId}/primary`);
    return response.data;
  },

  deletePhoto: async (photoId: string): Promise<void> => {
    await api.delete(`/plants/photos/${photoId}`);
  },
};

// Helper constants for UI
export const PLANT_HEALTH_OPTIONS = [
  { value: 'thriving', label: 'Thriving', color: 'emerald' },
  { value: 'healthy', label: 'Healthy', color: 'green' },
  { value: 'fair', label: 'Fair', color: 'yellow' },
  { value: 'struggling', label: 'Struggling', color: 'orange' },
  { value: 'critical', label: 'Critical', color: 'red' },
] as const;

export const PLANT_LIGHT_OPTIONS = [
  { value: 'low', label: 'Low Light' },
  { value: 'medium', label: 'Medium Light' },
  { value: 'bright_indirect', label: 'Bright Indirect' },
  { value: 'direct', label: 'Direct Sunlight' },
] as const;

export const PLANT_HUMIDITY_OPTIONS = [
  { value: 'low', label: 'Low Humidity' },
  { value: 'medium', label: 'Medium Humidity' },
  { value: 'high', label: 'High Humidity' },
] as const;

export const PLANT_CARE_TYPES = [
  { value: 'watered', label: 'Watered', icon: 'Droplets' },
  { value: 'fertilized', label: 'Fertilized', icon: 'Leaf' },
  { value: 'pruned', label: 'Pruned', icon: 'Scissors' },
  { value: 'repotted', label: 'Repotted', icon: 'Package' },
  { value: 'treated', label: 'Treated', icon: 'ShieldCheck' },
  { value: 'misted', label: 'Misted', icon: 'CloudRain' },
  { value: 'rotated', label: 'Rotated', icon: 'RotateCcw' },
  { value: 'cleaned', label: 'Cleaned', icon: 'Sparkles' },
] as const;

export const COMMON_ROOMS = [
  'Living Room',
  'Bedroom',
  'Bathroom',
  'Kitchen',
  'Office',
  'Balcony',
  'Patio',
  'Garden',
  'Greenhouse',
] as const;

export const PLANT_PHOTO_TYPES = [
  { value: 'general', label: 'General', icon: 'Camera' },
  { value: 'growth', label: 'Growth Progress', icon: 'TrendingUp' },
  { value: 'problem', label: 'Problem/Issue', icon: 'AlertTriangle' },
  { value: 'treatment', label: 'Treatment', icon: 'Pill' },
  { value: 'milestone', label: 'Milestone', icon: 'Award' },
] as const;
