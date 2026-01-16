import { Link } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ModuleColor } from '@/components/layout/HubLayout';

interface ModuleCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  color: ModuleColor;
  stats?: { label: string; value: string }[];
  delay?: number;
}

const colorClasses = {
  finance: {
    bg: 'bg-finance-light',
    icon: 'bg-finance text-primary-foreground',
    border: 'hover:border-finance/50',
    glow: 'group-hover:shadow-[0_0_30px_-10px_hsl(var(--finance)/0.4)]',
  },
  household: {
    bg: 'bg-household-light',
    icon: 'bg-household text-primary-foreground',
    border: 'hover:border-household/50',
    glow: 'group-hover:shadow-[0_0_30px_-10px_hsl(var(--household)/0.4)]',
  },
  cooking: {
    bg: 'bg-cooking-light',
    icon: 'bg-cooking text-primary-foreground',
    border: 'hover:border-cooking/50',
    glow: 'group-hover:shadow-[0_0_30px_-10px_hsl(var(--cooking)/0.4)]',
  },
  reading: {
    bg: 'bg-reading-light',
    icon: 'bg-reading text-primary-foreground',
    border: 'hover:border-reading/50',
    glow: 'group-hover:shadow-[0_0_30px_-10px_hsl(var(--reading)/0.4)]',
  },
  coding: {
    bg: 'bg-coding-light',
    icon: 'bg-coding text-primary-foreground',
    border: 'hover:border-coding/50',
    glow: 'group-hover:shadow-[0_0_30px_-10px_hsl(var(--coding)/0.4)]',
  },
  plants: {
    bg: 'bg-plants-light',
    icon: 'bg-plants text-primary-foreground',
    border: 'hover:border-plants/50',
    glow: 'group-hover:shadow-[0_0_30px_-10px_hsl(var(--plants)/0.4)]',
  },
  calendar: {
    bg: 'bg-calendar-light',
    icon: 'bg-calendar text-primary-foreground',
    border: 'hover:border-calendar/50',
    glow: 'group-hover:shadow-[0_0_30px_-10px_hsl(var(--calendar)/0.4)]',
  },
};

export function ModuleCard({
  title,
  description,
  icon: Icon,
  href,
  color,
  stats,
  delay = 0,
}: ModuleCardProps) {
  const colors = colorClasses[color];

  return (
    <Link
      to={href}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all duration-300',
        'hover:-translate-y-1 hover:shadow-lg',
        colors.border,
        colors.glow,
        'animate-slide-up'
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Background accent */}
      <div
        className={cn(
          'absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-50 blur-3xl transition-opacity duration-300 group-hover:opacity-70',
          colors.bg
        )}
      />

      <div className="relative z-10">
        {/* Icon */}
        <div
          className={cn(
            'mb-4 flex h-12 w-12 items-center justify-center rounded-xl shadow-md transition-transform duration-300 group-hover:scale-110',
            colors.icon
          )}
        >
          <Icon className="h-6 w-6" />
        </div>

        {/* Content */}
        <h3 className="mb-2 font-display text-lg font-semibold tracking-tight">
          {title}
        </h3>
        <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>

        {/* Stats */}
        {stats && stats.length > 0 && (
          <div className="mt-auto flex gap-4 pt-4 border-t border-border/50">
            {stats.map((stat) => (
              <div key={stat.label}>
                <p className="text-lg font-semibold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
