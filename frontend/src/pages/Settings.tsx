import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/store/auth';
import { useThemeStore } from '@/store/theme';
import { Theme } from '@/types';
import { User, Palette, DollarSign, Bell, Shield, Sun, Moon, Monitor, Download, Trash2, Star, X, Plus, Search } from 'lucide-react';
import { assetApi } from '@/api/assets';
import { AssetSearchResult } from '@/types';

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

type Section = 'profile' | 'appearance' | 'financial' | 'notifications' | 'security' | 'watchlist';

const NAV_ITEMS: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'financial', label: 'Financial', icon: DollarSign },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'watchlist', label: 'Watchlist', icon: Star },
];

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
  const activeSection = (searchParams.get('section') as Section) || 'profile';
  const { user, setUser } = useAuthStore();
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

  // UI state
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
    }
  }, [user]);

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

  const handleExportData = () => {
    // TODO: Implement data export
    setMessage({ type: 'success', text: 'Data export will be sent to your email' });
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

  const setSection = (section: Section) => {
    setSearchParams({ section });
    setMessage(null);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Sidebar Navigation */}
      <div className="lg:w-64 flex-shrink-0">
        <Card>
          <CardContent className="p-2">
            <nav className="space-y-1">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSection(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
                    activeSection === item.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              ))}
            </nav>
          </CardContent>
        </Card>
      </div>

      {/* Content Area */}
      <div className="flex-1 max-w-2xl">
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
                <CardTitle>Two-Factor Authentication</CardTitle>
                <CardDescription>Add an extra layer of security to your account</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Two-factor authentication adds an additional layer of security to your account by requiring a code from your phone in addition to your password.
                </p>
                <Button variant="outline" disabled>
                  Coming Soon
                </Button>
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
                      Download a copy of all your data
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleExportData}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>

                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-red-600">Delete Account</p>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete your account and all data
                    </p>
                  </div>
                  <Button variant="destructive" size="sm" disabled>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
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
    </div>
  );
}
