import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import { useThemeStore } from '@/store/theme';
import { Layout } from '@/components/layout/Layout';
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { Dashboard } from '@/pages/Dashboard';
import { Portfolios } from '@/pages/Portfolios';
import { PortfolioDetail } from '@/pages/PortfolioDetail';
import { Holdings } from '@/pages/Holdings';
import { Charts } from '@/pages/Charts';
import { Prices } from '@/pages/Prices';
import { FixedAssets } from '@/pages/FixedAssets';
import { Settings } from '@/pages/Settings';
import { Admin } from '@/pages/Admin';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const fetchUser = useAuthStore((state) => state.fetchUser);

  useEffect(() => {
    if (isAuthenticated) {
      fetchUser();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const initTheme = useThemeStore((state) => state.initTheme);

  // Initialize theme on app load
  useEffect(() => {
    initTheme();
  }, [initTheme]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            }
          />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/portfolios"
            element={
              <ProtectedRoute>
                <Portfolios />
              </ProtectedRoute>
            }
          />
          <Route
            path="/portfolios/:id"
            element={
              <ProtectedRoute>
                <PortfolioDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/holdings"
            element={
              <ProtectedRoute>
                <Holdings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/charts"
            element={
              <ProtectedRoute>
                <Charts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/prices"
            element={
              <ProtectedRoute>
                <Prices />
              </ProtectedRoute>
            }
          />
          <Route
            path="/fixed-assets"
            element={
              <ProtectedRoute>
                <FixedAssets />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            }
          />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
