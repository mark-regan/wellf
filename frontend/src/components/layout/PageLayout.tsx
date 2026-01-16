import { ReactNode } from 'react';
import { Header } from './Header';
import { cn } from '@/lib/utils';

interface PageLayoutProps {
  children: ReactNode;
  className?: string;
}

export function PageLayout({ children, className }: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-hero">
      <Header />
      <main className={cn('container py-8', className)}>{children}</main>
    </div>
  );
}
