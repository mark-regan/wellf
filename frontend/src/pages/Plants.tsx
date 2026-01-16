import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HubLayout } from '@/components/layout/HubLayout';
import {
  Leaf,
  LayoutDashboard,
  List,
  Droplets,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Heart,
  Home,
  Sprout,
  Bell,
  Calendar,
} from 'lucide-react';
import { plantsApi } from '@/api/plants';
import { calendarApi } from '@/api/calendar';
import { PlantSummary, PlantCareLog, PlantsByRoom, Reminder } from '@/types';

const plantsNavItems = [
  { label: 'Overview', href: '/plants', icon: LayoutDashboard },
  { label: 'All Plants', href: '/plants/list', icon: List },
  { label: 'Rooms', href: '/plants/rooms', icon: Home },
  { label: 'Watering', href: '/plants/watering', icon: Droplets },
];

const PlantsLayout = ({ children }: { children: React.ReactNode }) => (
  <HubLayout
    title="Plants"
    description="Track your plants, care schedules & health"
    icon={Leaf}
    color="plants"
    navItems={plantsNavItems}
  >
    {children}
  </HubLayout>
);

export function Plants() {
  const [summary, setSummary] = useState<PlantSummary | null>(null);
  const [recentCare, setRecentCare] = useState<PlantCareLog[]>([]);
  const [rooms, setRooms] = useState<PlantsByRoom[]>([]);
  const [upcomingReminders, setUpcomingReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [summaryData, roomsData, careData, remindersData] = await Promise.all([
        plantsApi.getSummary(),
        plantsApi.getPlantsByRoom(),
        plantsApi.getRecentCareLogs(5),
        calendarApi.listReminders({ domain: 'plants', completed: false, limit: 5 }),
      ]);
      setSummary(summaryData);
      setRooms(roomsData);
      setRecentCare(careData);
      setUpcomingReminders(remindersData);
    } catch (error) {
      console.error('Failed to load plants data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleQuickWater = async (plantId: string) => {
    try {
      await plantsApi.waterPlant(plantId);
      await loadData();
    } catch (error) {
      console.error('Failed to water plant:', error);
    }
  };

  return (
    <PlantsLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Plants</h1>
            <p className="text-muted-foreground">Track your plants, care schedules & health</p>
          </div>
          <Button asChild className="bg-plants hover:bg-plants/90">
            <Link to="/plants/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Plant
            </Link>
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Leaf className="h-4 w-4" />
                Total Plants
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '--' : summary?.total_plants ?? 0}</div>
              <p className="text-xs text-muted-foreground">In your collection</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Droplets className="h-4 w-4" />
                Need Water
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '--' : summary?.needing_water ?? 0}</div>
              <p className="text-xs text-muted-foreground">Today or overdue</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Healthy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '--' : summary?.healthy_count ?? 0}</div>
              <p className="text-xs text-muted-foreground">Thriving & healthy</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Needs Attention
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '--' : summary?.needs_attention ?? 0}</div>
              <p className="text-xs text-muted-foreground">Fair to critical</p>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Care Reminders */}
        {upcomingReminders.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-plants" />
                Upcoming Care
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/calendar">View all</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingReminders.map((reminder) => (
                  <div
                    key={reminder.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    <div className="w-10 h-10 rounded-full bg-plants/10 flex items-center justify-center">
                      {reminder.title.toLowerCase().includes('water') ? (
                        <Droplets className="h-5 w-5 text-blue-500" />
                      ) : reminder.title.toLowerCase().includes('fertilize') ? (
                        <Leaf className="h-5 w-5 text-green-500" />
                      ) : (
                        <Bell className="h-5 w-5 text-plants" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{reminder.title}</h4>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(reminder.reminder_date).toLocaleDateString()}
                        {reminder.entity_name && (
                          <span className="ml-1">- {reminder.entity_name}</span>
                        )}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={
                        reminder.priority === 'urgent'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                          : reminder.priority === 'high'
                          ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
                          : 'bg-plants/10 text-plants'
                      }
                    >
                      {reminder.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Needing Water */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Droplets className="h-5 w-5 text-plants" />
                Needs Watering
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/plants/watering">View all</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : !summary?.needing_water_plants?.length ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle2 className="h-12 w-12 text-plants/30 mb-4" />
                  <h3 className="font-medium mb-2">All plants watered!</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    No plants need watering right now. Great job keeping them happy!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {summary.needing_water_plants.slice(0, 5).map((plant) => (
                    <div
                      key={plant.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                    >
                      <Link to={`/plants/${plant.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                        {plant.photo_url ? (
                          <img
                            src={plant.photo_url}
                            alt={plant.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-plants/10 flex items-center justify-center">
                            <Leaf className="h-5 w-5 text-plants" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{plant.name}</h4>
                          <p className="text-xs text-muted-foreground truncate">
                            {plant.room || 'No room'}
                            {plant.days_since_water !== undefined && (
                              <span className="text-orange-600 ml-2">
                                {plant.days_since_water > 0 ? `${plant.days_since_water}d overdue` : 'Due today'}
                              </span>
                            )}
                          </p>
                        </div>
                      </Link>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                        onClick={() => handleQuickWater(plant.id)}
                      >
                        <Droplets className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Care Activity */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Sprout className="h-5 w-5 text-plants" />
                Recent Care
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/plants/list">View all</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : recentCare.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Sprout className="h-12 w-12 text-plants/30 mb-4" />
                  <h3 className="font-medium mb-2">No care logged yet</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Care activities will appear here as you water, fertilize, and tend to your plants.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentCare.map((log) => (
                    <Link
                      key={log.id}
                      to={`/plants/${log.plant_id}`}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-plants/10 flex items-center justify-center">
                        {log.care_type === 'watered' && <Droplets className="h-4 w-4 text-blue-500" />}
                        {log.care_type === 'fertilized' && <Leaf className="h-4 w-4 text-green-500" />}
                        {log.care_type === 'pruned' && <Leaf className="h-4 w-4 text-orange-500" />}
                        {!['watered', 'fertilized', 'pruned'].includes(log.care_type) && (
                          <Sprout className="h-4 w-4 text-plants" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{log.plant_name}</h4>
                        <p className="text-xs text-muted-foreground capitalize">
                          {log.care_type} - {new Date(log.care_date).toLocaleDateString()}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Plants by Room */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5 text-plants" />
              Plants by Room
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/plants/rooms">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : rooms.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No plants found. Add your first plant to get started!
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                {rooms.slice(0, 6).map((room) => (
                  <Link
                    key={room.room}
                    to={`/plants/rooms?room=${encodeURIComponent(room.room)}`}
                    className="flex items-center gap-4 p-4 rounded-lg border hover:border-plants hover:bg-plants/5 transition-colors"
                  >
                    <div className="p-3 rounded-full bg-plants/10">
                      <Home className="h-6 w-6 text-plants" />
                    </div>
                    <div>
                      <h4 className="font-medium">{room.room}</h4>
                      <p className="text-sm text-muted-foreground">
                        {room.count} {room.count === 1 ? 'plant' : 'plants'}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <Link
                to="/plants/new"
                className="flex items-center gap-4 p-4 rounded-lg border hover:border-plants hover:bg-plants/5 transition-colors"
              >
                <div className="p-3 rounded-full bg-plants/10">
                  <Plus className="h-6 w-6 text-plants" />
                </div>
                <div>
                  <h4 className="font-medium">Add Plant</h4>
                  <p className="text-sm text-muted-foreground">Add a new plant</p>
                </div>
              </Link>
              <Link
                to="/plants/watering"
                className="flex items-center gap-4 p-4 rounded-lg border hover:border-plants hover:bg-plants/5 transition-colors"
              >
                <div className="p-3 rounded-full bg-plants/10">
                  <Droplets className="h-6 w-6 text-plants" />
                </div>
                <div>
                  <h4 className="font-medium">Watering Schedule</h4>
                  <p className="text-sm text-muted-foreground">View watering needs</p>
                </div>
              </Link>
              <Link
                to="/plants/list"
                className="flex items-center gap-4 p-4 rounded-lg border hover:border-plants hover:bg-plants/5 transition-colors"
              >
                <div className="p-3 rounded-full bg-plants/10">
                  <List className="h-6 w-6 text-plants" />
                </div>
                <div>
                  <h4 className="font-medium">Browse Collection</h4>
                  <p className="text-sm text-muted-foreground">View all plants</p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </PlantsLayout>
  );
}

export { PlantsLayout, plantsNavItems };
