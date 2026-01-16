import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { DomainSummary } from '@/types';
import {
  Wallet,
  ChefHat,
  BookOpen,
  Leaf,
  Code,
  LucideIcon,
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  Wallet,
  ChefHat,
  BookOpen,
  Leaf,
  Code,
};

interface DomainCardProps {
  domain: DomainSummary;
}

export function DomainCard({ domain }: DomainCardProps) {
  const Icon = iconMap[domain.icon] || Wallet;
  const isAvailable = domain.is_available;

  const cardContent = (
    <Card
      className={`transition-all duration-200 ${
        isAvailable
          ? 'hover:shadow-md hover:border-primary/50 cursor-pointer'
          : 'opacity-60'
      }`}
    >
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Icon className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">{domain.title}</h3>
            </div>
            <div className="text-2xl font-bold mb-1">{domain.value}</div>
            <p className="text-sm text-muted-foreground">{domain.subtitle}</p>
          </div>
        </div>
        {!isAvailable && (
          <div className="mt-4 text-xs text-muted-foreground bg-muted rounded px-2 py-1 inline-block">
            Coming Soon
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (isAvailable) {
    return <Link to={domain.link}>{cardContent}</Link>;
  }

  return cardContent;
}
