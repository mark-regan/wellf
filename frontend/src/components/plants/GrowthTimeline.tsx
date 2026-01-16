import { PlantPhoto } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Camera,
  TrendingUp,
  AlertTriangle,
  Pill,
  Award,
  Calendar,
  ChevronRight,
} from 'lucide-react';

interface GrowthTimelineProps {
  photos: PlantPhoto[];
  onPhotoClick?: (photo: PlantPhoto) => void;
}

export function GrowthTimeline({ photos, onPhotoClick }: GrowthTimelineProps) {
  // Group photos by month/year
  const groupedPhotos = photos.reduce((groups, photo) => {
    const date = new Date(photo.taken_at);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(photo);
    return groups;
  }, {} as Record<string, PlantPhoto[]>);

  // Sort groups by date (newest first)
  const sortedGroups = Object.entries(groupedPhotos).sort((a, b) => b[0].localeCompare(a[0]));

  const getPhotoTypeIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      general: <Camera className="h-4 w-4" />,
      growth: <TrendingUp className="h-4 w-4 text-green-500" />,
      problem: <AlertTriangle className="h-4 w-4 text-red-500" />,
      treatment: <Pill className="h-4 w-4 text-purple-500" />,
      milestone: <Award className="h-4 w-4 text-yellow-500" />,
    };
    return icons[type] || <Camera className="h-4 w-4" />;
  };

  const getPhotoTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      general: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      growth: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      problem: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
      treatment: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
      milestone: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
    };
    return styles[type] || styles.general;
  };

  const formatMonthYear = (key: string) => {
    const [year, month] = key.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  };

  if (photos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Growth Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <TrendingUp className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="font-medium mb-2">No growth photos yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Upload photos with the "Growth Progress" type to track your plant's development over time.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Growth Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-8">
            {sortedGroups.map(([monthKey, monthPhotos]) => (
              <div key={monthKey} className="relative">
                {/* Month header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative z-10 w-8 h-8 rounded-full bg-plants flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="font-medium">{formatMonthYear(monthKey)}</h3>
                  <Badge variant="secondary" className="ml-auto">
                    {monthPhotos.length} photo{monthPhotos.length !== 1 ? 's' : ''}
                  </Badge>
                </div>

                {/* Photos for this month */}
                <div className="ml-11 space-y-4">
                  {monthPhotos
                    .sort((a, b) => new Date(b.taken_at).getTime() - new Date(a.taken_at).getTime())
                    .map((photo) => (
                      <div
                        key={photo.id}
                        className="flex gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                        onClick={() => onPhotoClick?.(photo)}
                      >
                        <img
                          src={photo.photo_url}
                          alt={photo.caption || 'Plant photo'}
                          className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={getPhotoTypeBadge(photo.photo_type)}>
                              <span className="flex items-center gap-1">
                                {getPhotoTypeIcon(photo.photo_type)}
                                <span className="capitalize">{photo.photo_type}</span>
                              </span>
                            </Badge>
                          </div>
                          {photo.caption && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-1">
                              {photo.caption}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {new Date(photo.taken_at).toLocaleDateString(undefined, {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground self-center flex-shrink-0" />
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
