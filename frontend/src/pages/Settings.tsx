import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageLayout } from '@/components/layout/PageLayout';
import { authApi } from '@/api/auth';
import { securityApi } from '@/api/security';
import { useAuthStore } from '@/store/auth';
import { useThemeStore } from '@/store/theme';
import { Theme } from '@/types';
import { User, Palette, DollarSign, Bell, Shield, Sun, Moon, Monitor, Download, Trash2, Star, X, Plus, Search, LogOut, Building2, RotateCcw, Settings as SettingsIcon, ArrowLeft, LayoutGrid, Wallet, Home, ChefHat, BookOpen, Code2, Leaf, Key, Copy, Check, AlertTriangle } from 'lucide-react';
import { assetApi } from '@/api/assets';
import { AssetSearchResult, ProviderLists, PortfolioType } from '@/types';
import { DEFAULT_PROVIDERS, PORTFOLIO_TYPE_LABELS, parseProviderLists, stringifyProviderLists } from '@/constants/providers';

const CURRENCIES = [
  { code: 'GBP', name: 'British Pound' },
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'NZD', name: 'New Zealand Dollar' },
  { code: 'SEK', name: 'Swedish Krona' },
  { code: 'NOK', name: 'Norwegian Krone' },
  { code: 'DKK', name: 'Danish Krone' },
  { code: 'HKD', name: 'Hong Kong Dollar' },
  { code: 'SGD', name: 'Singapore Dollar' },
  { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'INR', name: 'Indian Rupee' },
];

const DATE_FORMATS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (31/12/2024)' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (12/31/2024)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2024-12-31)' },
  { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY (31-12-2024)' },
  { value: 'DD.MM.YYYY', label: 'DD.MM.YYYY (31.12.2024)' },
];

const LOCALES = [
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'de-DE', label: 'German (Germany)' },
  { value: 'fr-FR', label: 'French (France)' },
  { value: 'es-ES', label: 'Spanish (Spain)' },
  { value: 'it-IT', label: 'Italian (Italy)' },
  { value: 'ja-JP', label: 'Japanese (Japan)' },
  { value: 'zh-CN', label: 'Chinese (Simplified)' },
];

type Section = 'profile' | 'appearance' | 'financial' | 'notifications' | 'security' | 'watchlist' | 'providers' | 'modules';

const SETTINGS_SECTIONS: { id: Section; label: string; description: string; icon: React.ElementType }[] = [
  { id: 'profile', label: 'Profile', description: 'Manage your account details', icon: User },
  { id: 'appearance', label: 'Appearance', description: 'Customize the look and feel', icon: Palette },
  { id: 'modules', label: 'Modules', description: 'Enable or disable app modules', icon: LayoutGrid },
  { id: 'financial', label: 'Financial', description: 'Configure money preferences', icon: DollarSign },
  { id: 'providers', label: 'Providers', description: 'Manage portfolio providers', icon: Building2 },
  { id: 'notifications', label: 'Notifications', description: 'Configure alerts and reminders', icon: Bell },
  { id: 'security', label: 'Security', description: 'Manage access and data', icon: Shield },
  { id: 'watchlist', label: 'Watchlist', description: 'Track additional tickers', icon: Star },
];

// Module definitions
const AVAILABLE_MODULES = [
  { id: 'finance', label: 'Finance', description: 'Track portfolios, investments, and financial goals', icon: Wallet },
  { id: 'household', label: 'Household', description: 'Manage bills, subscriptions, insurance & maintenance', icon: Home },
  { id: 'cooking', label: 'Cooking', description: 'Recipes, shopping lists, and meal planning', icon: ChefHat },
  { id: 'reading', label: 'Reading', description: 'Book reviews, reading lists, and recommendations', icon: BookOpen },
  { id: 'coding', label: 'Coding', description: 'GitHub repos, projects, and development notes', icon: Code2 },
  { id: 'plants', label: 'Plants', description: 'Plant catalog, care schedules, and gardening tasks', icon: Leaf },
];

const DEFAULT_ENABLED_MODULES = ['finance', 'household', 'cooking', 'reading', 'coding', 'plants'];

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? 'bg-primary' : 'bg-muted'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeSection = (searchParams.get('section') as Section) || 'profile';
  const { user, setUser, logout } = useAuthStore();
  const { theme, setTheme } = useThemeStore();

  // Profile state
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');

  // Appearance state
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [locale, setLocale] = useState('en-GB');

  // Financial state
  const [baseCurrency, setBaseCurrency] = useState('GBP');
  const [fireTarget, setFireTarget] = useState('');
  const [fireEnabled, setFireEnabled] = useState(false);

  // Notification state
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyPriceAlerts, setNotifyPriceAlerts] = useState(false);
  const [notifyWeekly, setNotifyWeekly] = useState(false);
  const [notifyMonthly, setNotifyMonthly] = useState(false);

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Watchlist state
  const [watchlistItems, setWatchlistItems] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AssetSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Providers state
  const [providerLists, setProviderLists] = useState<ProviderLists>({});
  const [newProvider, setNewProvider] = useState<Record<string, string>>({});

  // Modules state
  const [enabledModules, setEnabledModules] = useState<string[]>(() => {
    const saved = localStorage.getItem('enabledModules');
    return saved ? JSON.parse(saved) : DEFAULT_ENABLED_MODULES;
  });

  // UI state
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 2FA state
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [showTwoFASetup, setShowTwoFASetup] = useState(false);
  const [totpSecret, setTotpSecret] = useState('');
  const [totpQRUrl, setTotpQRUrl] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Data export state
  const [exporting, setExporting] = useState(false);

  // Account deletion state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || '');
      setPhoneNumber(user.phone_number || '');
      setDateOfBirth(user.date_of_birth?.split('T')[0] || '');
      setBaseCurrency(user.base_currency || 'GBP');
      setDateFormat(user.date_format || 'DD/MM/YYYY');
      setLocale(user.locale || 'en-GB');
      setFireTarget(user.fire_target?.toString() || '');
      setFireEnabled(user.fire_enabled || false);
      setNotifyEmail(user.notify_email ?? true);
      setNotifyPriceAlerts(user.notify_price_alerts ?? false);
      setNotifyWeekly(user.notify_weekly ?? false);
      setNotifyMonthly(user.notify_monthly ?? false);
      setWatchlistItems(user.watchlist ? user.watchlist.split(',').filter(s => s.trim()) : []);
      setProviderLists(parseProviderLists(user.provider_lists));
    }
  }, [user]);

  // Fetch 2FA status on mount
  useEffect(() => {
    const fetch2FAStatus = async () => {
      try {
        const status = await securityApi.get2FAStatus();
        setTwoFAEnabled(status.enabled);
      } catch {
        // 2FA not configured or error - ignore
      }
    };
    fetch2FAStatus();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const updated = await authApi.updateMe({
        display_name: displayName,
        phone_number: phoneNumber,
        date_of_birth: dateOfBirth || undefined,
        base_currency: baseCurrency,
        date_format: dateFormat,
        locale: locale,
        fire_target: fireTarget ? parseFloat(fireTarget) : undefined,
        fire_enabled: fireEnabled,
        theme: theme,
        notify_email: notifyEmail,
        notify_price_alerts: notifyPriceAlerts,
        notify_weekly: notifyWeekly,
        notify_monthly: notifyMonthly,
      });
      setUser(updated);
      setMessage({ type: 'success', text: 'Settings saved successfully' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleThemeChange = async (newTheme: Theme) => {
    setTheme(newTheme);
    // Also save to server
    try {
      const updated = await authApi.updateMe({ theme: newTheme });
      setUser(updated);
    } catch {
      // Theme is already applied locally, just log the error
      console.error('Failed to save theme preference to server');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    setChangingPassword(true);
    setMessage(null);

    try {
      await authApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setMessage({ type: 'success', text: 'Password changed successfully' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setMessage({ type: 'error', text: 'Failed to change password. Check your current password.' });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleExportData = async () => {
    setExporting(true);
    setMessage(null);
    try {
      const blob = await securityApi.downloadExport();
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `liyf-export-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setMessage({ type: 'success', text: 'Data exported successfully' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to export data' });
    } finally {
      setExporting(false);
    }
  };

  // 2FA functions
  const handleSetup2FA = async () => {
    setTwoFALoading(true);
    setMessage(null);
    try {
      const setup = await securityApi.setup2FA();
      setTotpSecret(setup.secret);
      setTotpQRUrl(setup.otp_auth_url);
      setShowTwoFASetup(true);
    } catch {
      setMessage({ type: 'error', text: 'Failed to setup 2FA' });
    } finally {
      setTwoFALoading(false);
    }
  };

  const handleEnable2FA = async () => {
    if (verificationCode.length !== 6) {
      setMessage({ type: 'error', text: 'Please enter a 6-digit code' });
      return;
    }
    setTwoFALoading(true);
    setMessage(null);
    try {
      const result = await securityApi.enable2FA(totpSecret, verificationCode);
      if (result.success) {
        setTwoFAEnabled(true);
        setBackupCodes(result.backup_codes);
        setShowBackupCodes(true);
        setShowTwoFASetup(false);
        setVerificationCode('');
        setMessage({ type: 'success', text: '2FA enabled successfully! Save your backup codes.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Invalid verification code' });
    } finally {
      setTwoFALoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (verificationCode.length !== 6) {
      setMessage({ type: 'error', text: 'Please enter a 6-digit code' });
      return;
    }
    setTwoFALoading(true);
    setMessage(null);
    try {
      await securityApi.disable2FA(verificationCode);
      setTwoFAEnabled(false);
      setVerificationCode('');
      setMessage({ type: 'success', text: '2FA disabled successfully' });
    } catch {
      setMessage({ type: 'error', text: 'Invalid verification code' });
    } finally {
      setTwoFALoading(false);
    }
  };

  const handleGenerateBackupCodes = async () => {
    if (verificationCode.length !== 6) {
      setMessage({ type: 'error', text: 'Please enter a 6-digit code' });
      return;
    }
    setTwoFALoading(true);
    setMessage(null);
    try {
      const result = await securityApi.generateBackupCodes(verificationCode);
      setBackupCodes(result.backup_codes);
      setShowBackupCodes(true);
      setVerificationCode('');
      setMessage({ type: 'success', text: 'New backup codes generated' });
    } catch {
      setMessage({ type: 'error', text: 'Invalid verification code' });
    } finally {
      setTwoFALoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Account deletion functions
  const handleRequestDeletion = async () => {
    if (!deletePassword) {
      setMessage({ type: 'error', text: 'Please enter your password' });
      return;
    }
    setDeleting(true);
    setMessage(null);
    try {
      await securityApi.requestAccountDeletion(deletePassword);
      setShowDeleteConfirm(true);
    } catch {
      setMessage({ type: 'error', text: 'Invalid password' });
    } finally {
      setDeleting(false);
    }
  };

  const handleConfirmDeletion = async () => {
    if (deleteConfirmText !== 'DELETE MY ACCOUNT') {
      setMessage({ type: 'error', text: 'Please type "DELETE MY ACCOUNT" to confirm' });
      return;
    }
    setDeleting(true);
    setMessage(null);
    try {
      await securityApi.confirmAccountDeletion(deletePassword, deleteConfirmText);
      await logout();
      navigate('/login');
    } catch {
      setMessage({ type: 'error', text: 'Failed to delete account' });
    } finally {
      setDeleting(false);
    }
  };

  // Watchlist functions
  const handleWatchlistSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const results = await assetApi.search(query);
      // Filter out already watched items
      setSearchResults(results.filter(r => !watchlistItems.includes(r.symbol)));
    } catch {
      console.error('Failed to search assets');
    } finally {
      setSearching(false);
    }
  };

  const handleAddToWatchlist = async (symbol: string) => {
    if (watchlistItems.includes(symbol)) return;
    const newItems = [...watchlistItems, symbol];
    setWatchlistItems(newItems);
    setSearchQuery('');
    setSearchResults([]);

    // Save to server
    try {
      const updated = await authApi.updateMe({ watchlist: newItems.join(',') });
      setUser(updated);
      setMessage({ type: 'success', text: `Added ${symbol} to watchlist` });
    } catch {
      setWatchlistItems(watchlistItems); // revert
      setMessage({ type: 'error', text: 'Failed to update watchlist' });
    }
  };

  const handleRemoveFromWatchlist = async (symbol: string) => {
    const newItems = watchlistItems.filter(s => s !== symbol);
    setWatchlistItems(newItems);

    // Save to server
    try {
      const updated = await authApi.updateMe({ watchlist: newItems.join(',') });
      setUser(updated);
      setMessage({ type: 'success', text: `Removed ${symbol} from watchlist` });
    } catch {
      setWatchlistItems(watchlistItems); // revert
      setMessage({ type: 'error', text: 'Failed to update watchlist' });
    }
  };

  // Provider list functions
  const handleAddProvider = async (type: PortfolioType) => {
    const provider = newProvider[type]?.trim();
    if (!provider) return;

    const currentList = providerLists[type] || DEFAULT_PROVIDERS[type] || [];
    if (currentList.includes(provider)) {
      setMessage({ type: 'error', text: 'Provider already exists' });
      return;
    }

    const updatedLists: ProviderLists = {
      ...providerLists,
      [type]: [...currentList, provider],
    };
    setProviderLists(updatedLists);
    setNewProvider({ ...newProvider, [type]: '' });

    try {
      const updated = await authApi.updateMe({ provider_lists: stringifyProviderLists(updatedLists) });
      setUser(updated);
      setMessage({ type: 'success', text: `Added ${provider} to ${type} providers` });
    } catch {
      setProviderLists(providerLists);
      setMessage({ type: 'error', text: 'Failed to update providers' });
    }
  };

  const handleRemoveProvider = async (type: PortfolioType, provider: string) => {
    const currentList = providerLists[type] || DEFAULT_PROVIDERS[type] || [];
    const updatedList = currentList.filter(p => p !== provider);

    const updatedLists: ProviderLists = {
      ...providerLists,
      [type]: updatedList,
    };
    setProviderLists(updatedLists);

    try {
      const updated = await authApi.updateMe({ provider_lists: stringifyProviderLists(updatedLists) });
      setUser(updated);
      setMessage({ type: 'success', text: `Removed ${provider} from ${type} providers` });
    } catch {
      setProviderLists(providerLists);
      setMessage({ type: 'error', text: 'Failed to update providers' });
    }
  };

  const handleResetProviders = async (type: PortfolioType) => {
    const updatedLists: ProviderLists = {
      ...providerLists,
    };
    delete updatedLists[type];
    setProviderLists(updatedLists);

    try {
      const updated = await authApi.updateMe({ provider_lists: stringifyProviderLists(updatedLists) });
      setUser(updated);
      setMessage({ type: 'success', text: `Reset ${type} providers to defaults` });
    } catch {
      setProviderLists(providerLists);
      setMessage({ type: 'error', text: 'Failed to reset providers' });
    }
  };

  const getProvidersForTypeLocal = (type: PortfolioType): string[] => {
    return providerLists[type] || DEFAULT_PROVIDERS[type] || [];
  };

  const setSection = (section: Section) => {
    setSearchParams({ section });
    setMessage(null);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Module toggle handler
  const handleToggleModule = (moduleId: string) => {
    const newEnabled = enabledModules.includes(moduleId)
      ? enabledModules.filter(id => id !== moduleId)
      : [...enabledModules, moduleId];
    setEnabledModules(newEnabled);
    localStorage.setItem('enabledModules', JSON.stringify(newEnabled));
    setMessage({ type: 'success', text: `Module ${enabledModules.includes(moduleId) ? 'disabled' : 'enabled'}` });
  };

  // Check if we're on the overview or a specific section
  const isOverview = !searchParams.get('section');

  return (
    <PageLayout>
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        {!isOverview && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSearchParams({})}
            className="mr-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary">
          <SettingsIcon className="h-6 w-6 text-secondary-foreground" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">
            {isOverview ? 'Settings' : SETTINGS_SECTIONS.find(s => s.id === activeSection)?.label}
          </h1>
          <p className="text-muted-foreground">
            {isOverview ? 'Configure your LIYF experience' : SETTINGS_SECTIONS.find(s => s.id === activeSection)?.description}
          </p>
        </div>
      </div>

      {/* Overview Mode - Card Grid */}
      {isOverview ? (
        <>
          {/* Quick Actions */}
          <Card className="p-4 bg-card border-border/50 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Dark Mode</p>
                <p className="text-sm text-muted-foreground">
                  Currently using {theme === 'dark' ? 'dark' : theme === 'light' ? 'light' : 'system'} theme
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => handleThemeChange(theme === 'dark' ? 'light' : 'dark')}
              >
                {theme === 'dark' ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
                Switch to {theme === 'dark' ? 'Light' : 'Dark'}
              </Button>
            </div>
          </Card>

          {/* Settings Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
            {SETTINGS_SECTIONS.map((section) => (
              <Card
                key={section.id}
                onClick={() => setSection(section.id)}
                className="p-5 bg-card border-border/50 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                    <section.icon className="h-5 w-5 text-secondary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{section.label}</h3>
                    <p className="text-sm text-muted-foreground">{section.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Logout Button */}
          <Card className="p-4 bg-card border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-red-600">Sign Out</p>
                <p className="text-sm text-muted-foreground">
                  Log out of your account
                </p>
              </div>
              <Button variant="destructive" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </Card>
        </>
      ) : (
        /* Detail Mode - Section Content */
        <div className="max-w-2xl">
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Profile Section */}
        {activeSection === 'profile' && (
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Manage your personal information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input value={user?.email || ''} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
              </div>

              <div>
                <label className="text-sm font-medium">Display Name</label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Phone Number</label>
                <Input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+44 7700 900000"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Date of Birth</label>
                <Input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                />
              </div>

              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Appearance Section */}
        {activeSection === 'appearance' && (
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize how the app looks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-sm font-medium mb-3 block">Theme</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'light' as Theme, label: 'Light', icon: Sun },
                    { value: 'dark' as Theme, label: 'Dark', icon: Moon },
                    { value: 'system' as Theme, label: 'System', icon: Monitor },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleThemeChange(option.value)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                        theme === option.value
                          ? 'border-primary bg-primary/5'
                          : 'border-muted hover:border-muted-foreground/50'
                      }`}
                    >
                      <option.icon className={`h-6 w-6 ${theme === option.value ? 'text-primary' : ''}`} />
                      <span className="text-sm font-medium">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Date Format</label>
                <select
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  {DATE_FORMATS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Locale</label>
                <select
                  value={locale}
                  onChange={(e) => setLocale(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  {LOCALES.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  Affects number and currency formatting
                </p>
              </div>

              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Modules Section */}
        {activeSection === 'modules' && (
          <Card>
            <CardHeader>
              <CardTitle>Modules</CardTitle>
              <CardDescription>Enable or disable app modules to customize your experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {AVAILABLE_MODULES.map((module) => (
                <div
                  key={module.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                      <module.icon className="h-5 w-5 text-secondary-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{module.label}</p>
                      <p className="text-sm text-muted-foreground">{module.description}</p>
                    </div>
                  </div>
                  <Toggle
                    checked={enabledModules.includes(module.id)}
                    onChange={() => handleToggleModule(module.id)}
                  />
                </div>
              ))}
              <p className="text-xs text-muted-foreground pt-2">
                Disabled modules will be hidden from the home page. You can re-enable them at any time.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Financial Section */}
        {activeSection === 'financial' && (
          <Card>
            <CardHeader>
              <CardTitle>Financial Settings</CardTitle>
              <CardDescription>Configure your financial preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Base Currency</label>
                <select
                  value={baseCurrency}
                  onChange={(e) => setBaseCurrency(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} - {c.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  All values will be converted to this currency on the dashboard
                </p>
              </div>

              <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">FIRE Tracking</label>
                    <p className="text-xs text-muted-foreground">
                      Show FIRE progress on your dashboard
                    </p>
                  </div>
                  <Toggle checked={fireEnabled} onChange={setFireEnabled} />
                </div>

                {fireEnabled && (
                  <div>
                    <label className="text-sm font-medium">Target Amount</label>
                    <Input
                      type="number"
                      value={fireTarget}
                      onChange={(e) => setFireTarget(e.target.value)}
                      placeholder="e.g. 1000000"
                      min="0"
                      step="1000"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Your target net worth for Financial Independence / Retire Early
                    </p>
                  </div>
                )}
              </div>

              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Notifications Section */}
        {activeSection === 'notifications' && (
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Manage your notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Receive important updates via email
                  </p>
                </div>
                <Toggle checked={notifyEmail} onChange={setNotifyEmail} />
              </div>

              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <p className="font-medium">Price Alerts</p>
                  <p className="text-sm text-muted-foreground">
                    Get notified when assets hit target prices
                  </p>
                </div>
                <Toggle checked={notifyPriceAlerts} onChange={setNotifyPriceAlerts} />
              </div>

              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <p className="font-medium">Weekly Summary</p>
                  <p className="text-sm text-muted-foreground">
                    Receive a weekly portfolio performance summary
                  </p>
                </div>
                <Toggle checked={notifyWeekly} onChange={setNotifyWeekly} />
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">Monthly Report</p>
                  <p className="text-sm text-muted-foreground">
                    Receive a detailed monthly performance report
                  </p>
                </div>
                <Toggle checked={notifyMonthly} onChange={setNotifyMonthly} />
              </div>

              <Button onClick={handleSave} disabled={saving} className="mt-4">
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Security Section */}
        {activeSection === 'security' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your account password</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Current Password</label>
                    <Input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">New Password</label>
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      At least 12 characters with uppercase, lowercase, number, and special character
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Confirm New Password</label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>

                  <Button type="submit" disabled={changingPassword}>
                    {changingPassword ? 'Changing...' : 'Change Password'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Two-Factor Authentication
                </CardTitle>
                <CardDescription>Add an extra layer of security to your account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!twoFAEnabled && !showTwoFASetup && (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Two-factor authentication adds an additional layer of security to your account by requiring a code from your authenticator app.
                    </p>
                    <Button onClick={handleSetup2FA} disabled={twoFALoading}>
                      {twoFALoading ? 'Setting up...' : 'Enable 2FA'}
                    </Button>
                  </>
                )}

                {showTwoFASetup && (
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg bg-muted/30">
                      <p className="text-sm font-medium mb-3">1. Scan this QR code with your authenticator app:</p>
                      <div className="flex justify-center mb-4">
                        <div className="p-4 bg-white rounded-lg">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(totpQRUrl)}`}
                            alt="2FA QR Code"
                            className="w-48 h-48"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground text-center mb-2">Or enter this secret manually:</p>
                      <div className="flex items-center gap-2 justify-center">
                        <code className="px-3 py-2 bg-muted rounded text-sm font-mono">{totpSecret}</code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(totpSecret)}
                        >
                          {copiedCode === totpSecret ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-2">2. Enter the 6-digit code from your app:</p>
                      <div className="flex gap-2">
                        <Input
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="000000"
                          className="font-mono text-center text-lg tracking-widest"
                          maxLength={6}
                        />
                        <Button onClick={handleEnable2FA} disabled={twoFALoading || verificationCode.length !== 6}>
                          {twoFALoading ? 'Verifying...' : 'Verify'}
                        </Button>
                      </div>
                    </div>

                    <Button variant="outline" onClick={() => setShowTwoFASetup(false)}>
                      Cancel
                    </Button>
                  </div>
                )}

                {twoFAEnabled && !showTwoFASetup && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-green-600">
                      <Check className="h-5 w-5" />
                      <span className="font-medium">2FA is enabled</span>
                    </div>

                    <div className="space-y-3 p-4 border rounded-lg">
                      <p className="text-sm font-medium">Manage 2FA:</p>
                      <div className="flex gap-2">
                        <Input
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="Enter code to manage"
                          className="font-mono"
                          maxLength={6}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleGenerateBackupCodes}
                          disabled={twoFALoading || verificationCode.length !== 6}
                        >
                          Generate New Backup Codes
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleDisable2FA}
                          disabled={twoFALoading || verificationCode.length !== 6}
                        >
                          Disable 2FA
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {showBackupCodes && backupCodes.length > 0 && (
                  <div className="p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      <p className="font-medium text-yellow-800 dark:text-yellow-200">Save your backup codes!</p>
                    </div>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                      These codes can be used to access your account if you lose your authenticator device. Each code can only be used once.
                    </p>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {backupCodes.map((code, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between px-3 py-2 bg-white dark:bg-muted rounded font-mono text-sm"
                        >
                          <span>{code}</span>
                          <button
                            onClick={() => copyToClipboard(code)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            {copiedCode === code ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(backupCodes.join('\n'))}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy All Codes
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-2"
                      onClick={() => setShowBackupCodes(false)}
                    >
                      I've saved them
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Data & Privacy</CardTitle>
                <CardDescription>Manage your data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <p className="font-medium">Export Data</p>
                    <p className="text-sm text-muted-foreground">
                      Download a ZIP file with all your data (JSON & CSV formats)
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleExportData} disabled={exporting}>
                    <Download className="h-4 w-4 mr-2" />
                    {exporting ? 'Exporting...' : 'Export'}
                  </Button>
                </div>

                <div className="py-3">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-medium text-red-600">Delete Account</p>
                      <p className="text-sm text-muted-foreground">
                        Permanently delete your account and all data
                      </p>
                    </div>
                    {!showDeleteConfirm && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setDeletePassword('');
                          setDeleteConfirmText('');
                          setShowDeleteConfirm(false);
                        }}
                        disabled={deleting}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Account
                      </Button>
                    )}
                  </div>

                  {!showDeleteConfirm ? (
                    <div className="p-4 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20">
                      <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                        Enter your password to begin the account deletion process:
                      </p>
                      <div className="flex gap-2">
                        <Input
                          type="password"
                          value={deletePassword}
                          onChange={(e) => setDeletePassword(e.target.value)}
                          placeholder="Your password"
                          className="flex-1"
                        />
                        <Button
                          variant="destructive"
                          onClick={handleRequestDeletion}
                          disabled={deleting || !deletePassword}
                        >
                          {deleting ? 'Verifying...' : 'Continue'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 border border-red-500 rounded-lg bg-red-50 dark:bg-red-900/30">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        <p className="font-medium text-red-700 dark:text-red-300">Final Confirmation</p>
                      </div>
                      <p className="text-sm text-red-600 dark:text-red-400 mb-4">
                        This action cannot be undone. All your data including portfolios, recipes, books, plants, and settings will be permanently deleted.
                      </p>
                      <p className="text-sm font-medium mb-2">
                        Type <code className="px-2 py-1 bg-red-100 dark:bg-red-900 rounded">DELETE MY ACCOUNT</code> to confirm:
                      </p>
                      <Input
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder="DELETE MY ACCOUNT"
                        className="mb-3"
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowDeleteConfirm(false);
                            setDeletePassword('');
                            setDeleteConfirmText('');
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={handleConfirmDeletion}
                          disabled={deleting || deleteConfirmText !== 'DELETE MY ACCOUNT'}
                        >
                          {deleting ? 'Deleting...' : 'Permanently Delete Account'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Providers Section */}
        {activeSection === 'providers' && (
          <Card>
            <CardHeader>
              <CardTitle>Provider Lists</CardTitle>
              <CardDescription>Customize the provider options shown when creating portfolios</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {(['GIA', 'ISA', 'SIPP', 'LISA', 'JISA', 'CRYPTO', 'SAVINGS', 'CASH'] as PortfolioType[]).map((type) => (
                <div key={type} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium">{PORTFOLIO_TYPE_LABELS[type] || type}</h4>
                      <p className="text-xs text-muted-foreground">
                        {providerLists[type] ? 'Custom list' : 'Using defaults'}
                      </p>
                    </div>
                    {providerLists[type] && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleResetProviders(type)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Reset
                      </Button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {getProvidersForTypeLocal(type).map((provider) => (
                      <div
                        key={provider}
                        className="flex items-center gap-1 px-3 py-1.5 bg-muted rounded-full text-sm"
                      >
                        <span>{provider}</span>
                        <button
                          onClick={() => handleRemoveProvider(type, provider)}
                          className="ml-1 hover:text-destructive transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Input
                      placeholder="Add provider..."
                      value={newProvider[type] || ''}
                      onChange={(e) => setNewProvider({ ...newProvider, [type]: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddProvider(type);
                        }
                      }}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddProvider(type)}
                      disabled={!newProvider[type]?.trim()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Watchlist Section */}
        {activeSection === 'watchlist' && (
          <Card>
            <CardHeader>
              <CardTitle>Watchlist</CardTitle>
              <CardDescription>Track additional tickers on the Prices page</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search for a ticker to add..."
                  value={searchQuery}
                  onChange={(e) => handleWatchlistSearch(e.target.value)}
                  className="pl-9"
                />
                {searching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    Searching...
                  </div>
                )}
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                  {searchResults.map((result) => (
                    <button
                      key={result.symbol}
                      onClick={() => handleAddToWatchlist(result.symbol)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors text-left"
                    >
                      <div>
                        <div className="font-medium">{result.symbol}</div>
                        <div className="text-sm text-muted-foreground">{result.name}</div>
                      </div>
                      <Plus className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}

              {/* Current Watchlist */}
              <div>
                <label className="text-sm font-medium mb-2 block">Your Watchlist</label>
                {watchlistItems.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {watchlistItems.map((symbol) => (
                      <div
                        key={symbol}
                        className="flex items-center gap-1 px-3 py-1.5 bg-muted rounded-full text-sm"
                      >
                        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                        <span>{symbol}</span>
                        <button
                          onClick={() => handleRemoveFromWatchlist(symbol)}
                          className="ml-1 hover:text-destructive transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No items in your watchlist. Search above to add tickers.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        </div>
      )}
    </PageLayout>
  );
}
