import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PlantsLayout } from './Plants';
import {
  Leaf,
  Plus,
  Search,
  Droplets,
  Sun,
  Grid,
  List as ListIcon,
  MoreVertical,
  Trash2,
  Edit2,
} from 'lucide-react';
import { plantsApi, PLANT_HEALTH_OPTIONS } from '@/api/plants';
import { Plant } from '@/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

type ViewMode = 'grid' | 'list';

export function PlantsList() {
  const navigate = useNavigate();
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const loadPlants = async () => {
    try {
      const data = await plantsApi.listPlants();
      setPlants(data);
    } catch (error) {
      console.error('Failed to load plants:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlants();
  }, []);

  const handleDelete = async (plantId: string) => {
    if (!confirm('Are you sure you want to archive this plant?')) return;

    try {
      await plantsApi.deletePlant(plantId);
      await loadPlants();
    } catch (error) {
      console.error('Failed to delete plant:', error);
    }
  };

  const handleQuickWater = async (plantId: string) => {
    try {
      await plantsApi.waterPlant(plantId);
      await loadPlants();
    } catch (error) {
      console.error('Failed to water plant:', error);
    }
  };

  const filteredPlants = plants.filter(
    (plant) =>
      plant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plant.species?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plant.room?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const getLightIcon = (light: string) => {
    const colors = {
      low: 'text-gray-400',
      medium: 'text-yellow-400',
      bright_indirect: 'text-yellow-500',
      direct: 'text-orange-500',
    };
    return <Sun className={`h-4 w-4 ${colors[light as keyof typeof colors] ?? 'text-yellow-400'}`} />;
  };

  return (
    <PlantsLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">All Plants</h1>
            <p className="text-muted-foreground">
              {plants.length} {plants.length === 1 ? 'plant' : 'plants'} in your collection
            </p>
          </div>
          <Button asChild className="bg-plants hover:bg-plants/90">
            <Link to="/plants/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Plant
            </Link>
          </Button>
        </div>

        {/* Search and View Toggle */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search plants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-1 border rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <ListIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Plants Display */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading plants...</div>
        ) : filteredPlants.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Leaf className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchTerm ? 'No plants found' : 'No plants yet'}
              </h3>
              <p className="text-muted-foreground max-w-sm mb-4">
                {searchTerm
                  ? 'Try adjusting your search terms.'
                  : 'Add your first plant to start tracking your collection.'}
              </p>
              {!searchTerm && (
                <Button asChild className="bg-plants hover:bg-plants/90">
                  <Link to="/plants/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Plant
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : viewMode === 'grid' ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredPlants.map((plant) => (
              <Card
                key={plant.id}
                className="group hover:border-plants transition-colors cursor-pointer"
                onClick={() => navigate(`/plants/${plant.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
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
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium truncate group-hover:text-plants transition-colors">
                            {plant.name}
                          </h3>
                          {plant.species && (
                            <p className="text-xs text-muted-foreground truncate italic">
                              {plant.species}
                            </p>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/plants/${plant.id}/edit`);
                              }}
                            >
                              <Edit2 className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuickWater(plant.id);
                              }}
                            >
                              <Droplets className="mr-2 h-4 w-4" />
                              Water
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(plant.id);
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Archive
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getHealthBadge(plant.health_status)}
                      {getLightIcon(plant.light_requirement)}
                    </div>
                    {plant.days_until_water !== undefined && (
                      <span
                        className={`text-xs ${
                          plant.days_until_water <= 0
                            ? 'text-orange-600 font-medium'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {plant.days_until_water <= 0
                          ? 'Water now'
                          : `Water in ${plant.days_until_water}d`}
                      </span>
                    )}
                  </div>
                  {plant.room && (
                    <p className="mt-2 text-xs text-muted-foreground truncate">{plant.room}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {filteredPlants.map((plant) => (
                  <div
                    key={plant.id}
                    className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/plants/${plant.id}`)}
                  >
                    {plant.photo_url ? (
                      <img
                        src={plant.photo_url}
                        alt={plant.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-plants/10 flex items-center justify-center">
                        <Leaf className="h-6 w-6 text-plants" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{plant.name}</h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {plant.species && <span className="italic">{plant.species}</span>}
                        {plant.species && plant.room && ' - '}
                        {plant.room}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      {getHealthBadge(plant.health_status)}
                      {plant.days_until_water !== undefined && (
                        <span
                          className={`text-sm whitespace-nowrap ${
                            plant.days_until_water <= 0
                              ? 'text-orange-600 font-medium'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {plant.days_until_water <= 0
                            ? 'Water now'
                            : `${plant.days_until_water}d`}
                        </span>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickWater(plant.id);
                        }}
                      >
                        <Droplets className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/plants/${plant.id}/edit`);
                            }}
                          >
                            <Edit2 className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(plant.id);
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Archive
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PlantsLayout>
  );
}
