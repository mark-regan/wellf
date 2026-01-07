import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { adminApi } from '@/api/admin';
import { AdminUser } from '@/types';
import { useAuthStore } from '@/store/auth';
import {
  Shield,
  ShieldOff,
  Lock,
  Unlock,
  Trash2,
  Key,
  Users,
  AlertTriangle,
  Copy,
  Check
} from 'lucide-react';

function formatDate(dateString: string | undefined): string {
  if (!dateString) return 'Never';
  return new Date(dateString).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function Admin() {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Confirmation dialog state
  const [confirmAction, setConfirmAction] = useState<{
    type: 'delete' | 'lock' | 'unlock' | 'admin' | 'reset';
    userId: string;
    userName: string;
    newAdminStatus?: boolean;
  } | null>(null);

  // Password reset result
  const [resetPassword, setResetPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await adminApi.listUsers();
      setUsers(data);
      setError(null);
    } catch (err) {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleAction = async () => {
    if (!confirmAction) return;

    try {
      switch (confirmAction.type) {
        case 'delete':
          await adminApi.deleteUser(confirmAction.userId);
          break;
        case 'lock':
          await adminApi.lockUser(confirmAction.userId);
          break;
        case 'unlock':
          await adminApi.unlockUser(confirmAction.userId);
          break;
        case 'admin':
          await adminApi.setAdmin(confirmAction.userId, confirmAction.newAdminStatus!);
          break;
        case 'reset':
          const result = await adminApi.resetPassword(confirmAction.userId);
          setResetPassword(result.password);
          setConfirmAction(null);
          await loadUsers();
          return;
      }
      setConfirmAction(null);
      await loadUsers();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message :
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Action failed';
      setError(errorMessage);
      setConfirmAction(null);
    }
  };

  const copyPassword = () => {
    if (resetPassword) {
      navigator.clipboard.writeText(resetPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-6xl">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" />
          User Administration
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage users, permissions, and account access
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          {error}
          <Button variant="ghost" size="sm" onClick={() => setError(null)} className="ml-auto">
            Dismiss
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>{users.length} registered users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium">User</th>
                  <th className="text-left py-3 px-2 font-medium">Status</th>
                  <th className="text-left py-3 px-2 font-medium">Created</th>
                  <th className="text-left py-3 px-2 font-medium">Last Login</th>
                  <th className="text-right py-3 px-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="py-3 px-2">
                      <div>
                        <div className="font-medium">{u.display_name || u.email}</div>
                        <div className="text-sm text-muted-foreground">{u.email}</div>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex gap-2">
                        {u.is_admin && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">
                            <Shield className="h-3 w-3" /> Admin
                          </span>
                        )}
                        {u.is_locked && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-destructive/10 text-destructive">
                            <Lock className="h-3 w-3" /> Locked
                          </span>
                        )}
                        {!u.is_admin && !u.is_locked && (
                          <span className="text-sm text-muted-foreground">Active</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-sm text-muted-foreground">
                      {formatDate(u.created_at)}
                    </td>
                    <td className="py-3 px-2 text-sm text-muted-foreground">
                      {formatDate(u.last_login_at)}
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex justify-end gap-1">
                        {/* Lock/Unlock */}
                        {u.id !== currentUser?.id && (
                          u.is_locked ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Unlock user"
                              onClick={() => setConfirmAction({
                                type: 'unlock',
                                userId: u.id,
                                userName: u.display_name || u.email,
                              })}
                            >
                              <Unlock className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Lock user"
                              onClick={() => setConfirmAction({
                                type: 'lock',
                                userId: u.id,
                                userName: u.display_name || u.email,
                              })}
                            >
                              <Lock className="h-4 w-4" />
                            </Button>
                          )
                        )}

                        {/* Admin toggle */}
                        {u.id !== currentUser?.id && (
                          u.is_admin ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Remove admin"
                              onClick={() => setConfirmAction({
                                type: 'admin',
                                userId: u.id,
                                userName: u.display_name || u.email,
                                newAdminStatus: false,
                              })}
                            >
                              <ShieldOff className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Make admin"
                              onClick={() => setConfirmAction({
                                type: 'admin',
                                userId: u.id,
                                userName: u.display_name || u.email,
                                newAdminStatus: true,
                              })}
                            >
                              <Shield className="h-4 w-4" />
                            </Button>
                          )
                        )}

                        {/* Reset password */}
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Reset password"
                          onClick={() => setConfirmAction({
                            type: 'reset',
                            userId: u.id,
                            userName: u.display_name || u.email,
                          })}
                        >
                          <Key className="h-4 w-4" />
                        </Button>

                        {/* Delete */}
                        {u.id !== currentUser?.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            title="Delete user"
                            onClick={() => setConfirmAction({
                              type: 'delete',
                              userId: u.id,
                              userName: u.display_name || u.email,
                            })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}

                        {u.id === currentUser?.id && (
                          <span className="text-xs text-muted-foreground px-2 py-1">(You)</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Confirm Action
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                {confirmAction.type === 'delete' && (
                  <>Are you sure you want to <strong>delete</strong> user <strong>{confirmAction.userName}</strong>? This will remove all their data and cannot be undone.</>
                )}
                {confirmAction.type === 'lock' && (
                  <>Are you sure you want to <strong>lock</strong> <strong>{confirmAction.userName}</strong>? They will not be able to log in.</>
                )}
                {confirmAction.type === 'unlock' && (
                  <>Are you sure you want to <strong>unlock</strong> <strong>{confirmAction.userName}</strong>?</>
                )}
                {confirmAction.type === 'admin' && confirmAction.newAdminStatus && (
                  <>Are you sure you want to grant <strong>admin privileges</strong> to <strong>{confirmAction.userName}</strong>?</>
                )}
                {confirmAction.type === 'admin' && !confirmAction.newAdminStatus && (
                  <>Are you sure you want to remove <strong>admin privileges</strong> from <strong>{confirmAction.userName}</strong>?</>
                )}
                {confirmAction.type === 'reset' && (
                  <>Are you sure you want to <strong>reset the password</strong> for <strong>{confirmAction.userName}</strong>? A new random password will be generated.</>
                )}
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setConfirmAction(null)}>
                  Cancel
                </Button>
                <Button
                  variant={confirmAction.type === 'delete' ? 'destructive' : 'default'}
                  onClick={handleAction}
                >
                  {confirmAction.type === 'delete' && 'Delete'}
                  {confirmAction.type === 'lock' && 'Lock'}
                  {confirmAction.type === 'unlock' && 'Unlock'}
                  {confirmAction.type === 'admin' && (confirmAction.newAdminStatus ? 'Grant Admin' : 'Remove Admin')}
                  {confirmAction.type === 'reset' && 'Reset Password'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Password Reset Result Dialog */}
      {resetPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                Password Reset
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                The password has been reset. Please share this with the user securely. This password will only be shown once.
              </p>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg mb-4">
                <code className="flex-1 font-mono text-sm break-all">{resetPassword}</code>
                <Button variant="ghost" size="sm" onClick={copyPassword}>
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setResetPassword(null)}>
                  Done
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
