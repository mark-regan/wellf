import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet,
  Home,
  ChefHat,
  BookOpen,
  Code2,
  Leaf,
  CalendarDays,
  Bell,
  GripVertical,
  Settings,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PageLayout } from '@/components/layout/PageLayout';
import { ModuleCard } from '@/components/dashboard/ModuleCard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { hubApi } from '@/api/hub';
import { useAuthStore } from '@/store/auth';
import { HubSummary, UpcomingReminder } from '@/types';
import { formatDate } from '@/utils/format';
import { ModuleColor } from '@/components/layout/HubLayout';
import { cn } from '@/lib/utils';

interface Module {
  id: string;
  title: string;
  description: string;
  icon: typeof Wallet;
  href: string;
  color: ModuleColor;
  stats: { label: string; value: string }[];
}

const DEFAULT_ENABLED_MODULES = ['finance', 'household', 'cooking', 'reading', 'coding', 'plants'];
const DEFAULT_MODULE_ORDER = ['finance', 'household', 'cooking', 'reading', 'coding', 'plants'];

// Sortable wrapper for ModuleCard
function SortableModuleCard({ module, index, isEditMode }: { module: Module; index: number; isEditMode: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: module.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {isEditMode && (
        <div
          {...attributes}
          {...listeners}
          className={cn(
            'absolute -top-2 -left-2 z-20 flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground shadow-lg cursor-grab active:cursor-grabbing',
            isDragging && 'cursor-grabbing'
          )}
        >
          <GripVertical className="h-4 w-4" />
        </div>
      )}
      <ModuleCard
        {...module}
        delay={isEditMode ? 0 : index * 50}
      />
    </div>
  );
}

const Hub = () => {
  const { user } = useAuthStore();
  const [summary, setSummary] = useState<HubSummary | null>(null);
  const [upcoming, setUpcoming] = useState<UpcomingReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [enabledModules, setEnabledModules] = useState<string[]>(() => {
    const saved = localStorage.getItem('enabledModules');
    return saved ? JSON.parse(saved) : DEFAULT_ENABLED_MODULES;
  });
  const [moduleOrder, setModuleOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('moduleOrder');
    return saved ? JSON.parse(saved) : DEFAULT_MODULE_ORDER;
  });

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Listen for storage changes (when settings are updated)
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('enabledModules');
      setEnabledModules(saved ? JSON.parse(saved) : DEFAULT_ENABLED_MODULES);
      const savedOrder = localStorage.getItem('moduleOrder');
      setModuleOrder(savedOrder ? JSON.parse(savedOrder) : DEFAULT_MODULE_ORDER);
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      setModuleOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem('moduleOrder', JSON.stringify(newOrder));
        return newOrder;
      });
    }
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const [summaryData, upcomingData] = await Promise.all([
          hubApi.getSummary(),
          hubApi.getUpcoming(),
        ]);
        setSummary(summaryData);
        setUpcoming(upcomingData);
      } catch (error) {
        console.error('Failed to load hub data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Helper to get domain data from summary
  const getDomainData = (domain: string) => {
    const data = summary?.domains.find(d => d.domain === domain);
    return {
      value: data?.value || '...',
      subtitle: data?.subtitle || '',
      isAvailable: data?.is_available ?? true,
    };
  };

  // Helper to build stats array, filtering out empty values
  const buildStats = (mainLabel: string, domain: string) => {
    const data = getDomainData(domain);
    const stats: { label: string; value: string }[] = [
      { label: mainLabel, value: data.value },
    ];
    if (data.subtitle) {
      stats.push({ label: 'Status', value: data.subtitle });
    }
    return stats;
  };

  // Build modules array with real data from summary
  const allModules: Module[] = [
    {
      id: 'finance',
      title: 'Finance',
      description: 'Track portfolios, investments, and financial goals',
      icon: Wallet,
      href: '/finance',
      color: 'finance',
      stats: buildStats('Net Worth', 'finance'),
    },
    {
      id: 'household',
      title: 'Household',
      description: 'Manage bills, subscriptions, insurance & maintenance',
      icon: Home,
      href: '/household',
      color: 'household',
      stats: buildStats('Spending', 'household'),
    },
    {
      id: 'cooking',
      title: 'Cooking',
      description: 'Recipes, shopping lists, and meal planning',
      icon: ChefHat,
      href: '/cooking',
      color: 'cooking',
      stats: buildStats('Collection', 'cooking'),
    },
    {
      id: 'reading',
      title: 'Reading',
      description: 'Book reviews, reading lists, and recommendations',
      icon: BookOpen,
      href: '/reading',
      color: 'reading',
      stats: buildStats('Library', 'books'),
    },
    {
      id: 'coding',
      title: 'Coding',
      description: 'GitHub repos, projects, and development notes',
      icon: Code2,
      href: '/coding',
      color: 'coding',
      stats: buildStats('Snippets', 'code'),
    },
    {
      id: 'plants',
      title: 'Plants',
      description: 'Plant catalog, care schedules, and gardening tasks',
      icon: Leaf,
      href: '/plants',
      color: 'plants',
      stats: buildStats('Garden', 'plants'),
    },
  ];

  // Filter modules based on enabled settings and sort by user-defined order
  const modules = allModules
    .filter(m => enabledModules.includes(m.id))
    .sort((a, b) => {
      const aIndex = moduleOrder.indexOf(a.id);
      const bIndex = moduleOrder.indexOf(b.id);
      // If not in order array, put at end
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

  // Get the active module for drag overlay
  const activeModule = activeId ? modules.find(m => m.id === activeId) : null;

  // Sample upcoming events (will come from API later)
  const upcomingEvents = upcoming.length > 0 ? upcoming : [
    { id: '1', title: 'No upcoming reminders', domain: 'finance' as const, due_date: new Date().toISOString() },
  ];

  const displayName = user?.display_name || user?.email?.split('@')[0] || 'Captain';
  const today = new Date();
  const dateString = today.toLocaleDateString('en-GB', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  if (loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      {/* Hero Section */}
      <section className="mb-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-2">
          <div>
            <p className="text-muted-foreground mb-1">Welcome back,</p>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
              Captain <span className="text-gradient-ocean">{displayName}</span>
            </h1>
          </div>
          <Link to="/calendar">
            <Card className="flex items-center gap-3 px-4 py-3 bg-card/80 backdrop-blur border-border/50 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
              <CalendarDays className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">{dateString}</p>
                <p className="text-xs text-muted-foreground">
                  {upcoming.length} tasks due today
                </p>
              </div>
            </Card>
          </Link>
        </div>
      </section>

      {/* Upcoming Events */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-5 w-5 text-accent" />
          <h2 className="font-display text-lg font-semibold">Upcoming Reminders</h2>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {upcomingEvents.map((event, i) => (
            <Card
              key={event.id || i}
              className="flex-shrink-0 px-4 py-3 bg-card/80 backdrop-blur border-border/50 min-w-[200px]"
            >
              <p className="text-sm font-medium truncate">{event.title}</p>
              <p className="text-xs text-muted-foreground">
                {event.due_date ? formatDate(event.due_date) : 'No date'}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* Module Grid */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl font-semibold">Your Modules</h2>
          <Button
            variant={isEditMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => setIsEditMode(!isEditMode)}
            className="gap-2"
          >
            <Settings className={cn('h-4 w-4', isEditMode && 'animate-spin')} />
            {isEditMode ? 'Done' : 'Customize'}
          </Button>
        </div>

        {isEditMode && (
          <div className="mb-4 p-3 rounded-lg bg-muted/50 border border-dashed border-border text-sm text-muted-foreground">
            Drag the grip handles to reorder your modules. Your layout is saved automatically.
          </div>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={modules.map(m => m.id)} strategy={rectSortingStrategy}>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {modules.map((module, index) => (
                <SortableModuleCard
                  key={module.id}
                  module={module}
                  index={index}
                  isEditMode={isEditMode}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeModule ? (
              <div className="opacity-80 rotate-3 scale-105">
                <ModuleCard {...activeModule} delay={0} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </section>
    </PageLayout>
  );
};

export { Hub };
