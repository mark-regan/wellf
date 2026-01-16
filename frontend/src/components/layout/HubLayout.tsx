import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header } from './Header';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export type ModuleColor = 'finance' | 'household' | 'cooking' | 'reading' | 'coding' | 'plants' | 'calendar';

interface HubLayoutProps {
  title: string;
  description: string;
  icon: LucideIcon;
  color: ModuleColor;
  navItems: NavItem[];
  children: ReactNode;
}

const colorClasses = {
  finance: {
    bg: 'bg-finance-light',
    text: 'text-finance',
    icon: 'bg-finance text-primary-foreground',
    accent: 'bg-finance/10 hover:bg-finance/20 text-finance',
    active: 'bg-finance text-primary-foreground',
  },
  household: {
    bg: 'bg-household-light',
    text: 'text-household',
    icon: 'bg-household text-primary-foreground',
    accent: 'bg-household/10 hover:bg-household/20 text-household',
    active: 'bg-household text-primary-foreground',
  },
  cooking: {
    bg: 'bg-cooking-light',
    text: 'text-cooking',
    icon: 'bg-cooking text-primary-foreground',
    accent: 'bg-cooking/10 hover:bg-cooking/20 text-cooking',
    active: 'bg-cooking text-primary-foreground',
  },
  reading: {
    bg: 'bg-reading-light',
    text: 'text-reading',
    icon: 'bg-reading text-primary-foreground',
    accent: 'bg-reading/10 hover:bg-reading/20 text-reading',
    active: 'bg-reading text-primary-foreground',
  },
  coding: {
    bg: 'bg-coding-light',
    text: 'text-coding',
    icon: 'bg-coding text-primary-foreground',
    accent: 'bg-coding/10 hover:bg-coding/20 text-coding',
    active: 'bg-coding text-primary-foreground',
  },
  plants: {
    bg: 'bg-plants-light',
    text: 'text-plants',
    icon: 'bg-plants text-primary-foreground',
    accent: 'bg-plants/10 hover:bg-plants/20 text-plants',
    active: 'bg-plants text-primary-foreground',
  },
  calendar: {
    bg: 'bg-calendar-light',
    text: 'text-calendar',
    icon: 'bg-calendar text-primary-foreground',
    accent: 'bg-calendar/10 hover:bg-calendar/20 text-calendar',
    active: 'bg-calendar text-primary-foreground',
  },
};

export function HubLayout({
  title,
  description,
  icon: Icon,
  color,
  navItems,
  children,
}: HubLayoutProps) {
  const location = useLocation();
  const colors = colorClasses[color];

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Header />

      {/* Hub Header */}
      <div className={cn('border-b border-border/50', colors.bg)}>
        <div className="container py-6">
          <Link to="/">
            <Button variant="ghost" size="sm" className="mb-4 -ml-2">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Dashboard
            </Button>
          </Link>

          <div className="flex items-center gap-4">
            <div
              className={cn(
                'flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg',
                colors.icon
              )}
            >
              <Icon className="h-7 w-7" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1>
              <p className="text-muted-foreground">{description}</p>
            </div>
          </div>

          {/* Sub Navigation */}
          <nav className="mt-6 flex gap-2 overflow-x-auto pb-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link key={item.href} to={item.href}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'rounded-full font-medium transition-all',
                      isActive ? colors.active : colors.accent
                    )}
                  >
                    <item.icon className="h-4 w-4 mr-1.5" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <main className="container py-8">{children}</main>
    </div>
  );
}
