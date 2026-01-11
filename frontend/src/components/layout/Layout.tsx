import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import {
  Briefcase,
  PieChart,
  LineChart,
  LogOut,
  User,
  TrendingUp,
  Settings,
  DollarSign,
  ChevronDown,
  Shield,
  Users,
  Home as HomeIcon,
  Car,
  FileCheck,
  FileText,
  Calendar,
  LayoutDashboard,
  PawPrint,
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
}

interface NavDropdownItem {
  id: string;
  label: string;
  icon: React.ElementType;
  items: NavItem[];
}

// Dropdown menus
const householdMenu: NavDropdownItem = {
  id: 'household',
  label: 'Household',
  icon: HomeIcon,
  items: [
    { path: '/people', label: 'People', icon: Users },
    { path: '/pets', label: 'Pets', icon: PawPrint },
    { path: '/properties', label: 'Property', icon: HomeIcon },
    { path: '/vehicles', label: 'Vehicles', icon: Car },
  ],
};

const financeMenu: NavDropdownItem = {
  id: 'finance',
  label: 'Finance',
  icon: DollarSign,
  items: [
    { path: '/finance', label: 'Finance Hub', icon: LayoutDashboard },
    { path: '/portfolios', label: 'Portfolios', icon: Briefcase },
    { path: '/holdings', label: 'Holdings', icon: PieChart },
    { path: '/prices', label: 'Prices', icon: DollarSign },
    { path: '/charts', label: 'Charts', icon: LineChart },
  ],
};

// Single nav items
const singleNavItems: NavItem[] = [
  { path: '/', label: 'HouseHub', icon: TrendingUp },
  { path: '/insurance', label: 'Insurance', icon: FileCheck },
  { path: '/documents', label: 'Documents', icon: FileText },
  { path: '/calendar', label: 'Calendar', icon: Calendar },
];

// Admin nav item is rendered inline in the nav bar

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setShowUserMenu(false);
    setOpenDropdown(null);
  }, [location.pathname]);

  const isPathActive = (path: string) => location.pathname === path;
  const isDropdownActive = (items: NavItem[]) => items.some((item) => location.pathname === item.path);

  const toggleDropdown = (id: string) => {
    setOpenDropdown(openDropdown === id ? null : id);
  };

  const renderDropdown = (menu: NavDropdownItem) => {
    const Icon = menu.icon;
    const isActive = isDropdownActive(menu.items);
    const isOpen = openDropdown === menu.id;

    return (
      <div key={menu.id} className="relative">
        <Button
          variant={isActive ? 'secondary' : 'ghost'}
          className="gap-2"
          onClick={() => toggleDropdown(menu.id)}
        >
          <Icon className="h-4 w-4" />
          {menu.label}
          <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </Button>

        {isOpen && (
          <div className="absolute left-0 mt-1 w-48 rounded-md border bg-background shadow-lg py-1 z-50">
            {menu.items.map((item) => {
              const ItemIcon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors ${
                    isPathActive(item.path) ? 'bg-muted font-medium' : ''
                  }`}
                >
                  <ItemIcon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">wellf</span>
            </Link>
            <nav className="hidden md:flex items-center gap-1" ref={navRef}>
              {/* HouseHub - Home */}
              <Link to="/">
                <Button
                  variant={isPathActive('/') ? 'secondary' : 'ghost'}
                  className="gap-2"
                >
                  <TrendingUp className="h-4 w-4" />
                  HouseHub
                </Button>
              </Link>

              {/* Household Dropdown */}
              {renderDropdown(householdMenu)}

              {/* Finance Dropdown */}
              {renderDropdown(financeMenu)}

              {/* Single nav items (Insurance, Documents, Calendar) */}
              {singleNavItems.slice(1).map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.path} to={item.path}>
                    <Button
                      variant={isPathActive(item.path) ? 'secondary' : 'ghost'}
                      className="gap-2"
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}

              {/* Admin link */}
              {user?.is_admin && (
                <Link to="/admin">
                  <Button
                    variant={isPathActive('/admin') ? 'secondary' : 'ghost'}
                    className="gap-2"
                  >
                    <Shield className="h-4 w-4" />
                    Admin
                  </Button>
                </Link>
              )}
            </nav>
          </div>

          {/* User Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors"
            >
              <User className="h-4 w-4" />
              <span>{user?.display_name || user?.email}</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 rounded-md border bg-background shadow-lg py-1 z-50">
                <Link
                  to="/settings"
                  className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors w-full text-left text-red-600"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6">{children}</main>
    </div>
  );
}
