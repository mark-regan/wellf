import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ActivityLog, Domain } from '@/types';
import {
  Wallet,
  Home,
  ChefHat,
  BookOpen,
  Code2,
  Leaf,
  Plus,
  Pencil,
  Trash2,
  Check,
  LucideIcon,
} from 'lucide-react';
import { formatDistanceToNow } from '@/utils/format';

const domainIconMap: Record<Domain, LucideIcon> = {
  finance: Wallet,
  household: Home,
  cooking: ChefHat,
  reading: BookOpen,
  coding: Code2,
  plants: Leaf,
};

const actionIconMap: Record<string, LucideIcon> = {
  created: Plus,
  updated: Pencil,
  deleted: Trash2,
  completed: Check,
};

interface ActivityFeedProps {
  activities: ActivityLog[];
  loading?: boolean;
}

export function ActivityFeed({ activities, loading }: ActivityFeedProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            No recent activity
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => {
              const DomainIcon = domainIconMap[activity.domain] || Wallet;
              const ActionIcon = actionIconMap[activity.action] || Plus;

              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0"
                >
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <DomainIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-background border flex items-center justify-center">
                      <ActionIcon className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {activity.description || `${activity.action} ${activity.entity_type}`}
                    </p>
                    {activity.entity_name && (
                      <p className="text-sm text-muted-foreground truncate">
                        {activity.entity_name}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(activity.created_at))}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
