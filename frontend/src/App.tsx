import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import { ThemeProvider } from '@/hooks/useTheme';
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { Hub } from '@/pages/Hub';
import { Dashboard } from '@/pages/Dashboard';
import { Portfolios } from '@/pages/Portfolios';
import { PortfolioDetail } from '@/pages/PortfolioDetail';
import { Holdings } from '@/pages/Holdings';
import { Charts } from '@/pages/Charts';
import { Prices } from '@/pages/Prices';
import { FixedAssets } from '@/pages/FixedAssets';
import { Household } from '@/pages/Household';
import { HouseholdBills } from '@/pages/HouseholdBills';
import { HouseholdSubscriptions } from '@/pages/HouseholdSubscriptions';
import { HouseholdInsurance } from '@/pages/HouseholdInsurance';
import { HouseholdMaintenance } from '@/pages/HouseholdMaintenance';
import { Cooking } from '@/pages/Cooking';
import { CookingRecipes } from '@/pages/CookingRecipes';
import { CookingAddRecipe } from '@/pages/CookingAddRecipe';
import { CookingRecipeDetail } from '@/pages/CookingRecipeDetail';
import { CookingEditRecipe } from '@/pages/CookingEditRecipe';
import { CookingCollections } from '@/pages/CookingCollections';
import { CookingCollectionDetail } from '@/pages/CookingCollectionDetail';
import { CookingMealPlan } from '@/pages/CookingMealPlan';
import { CookingShoppingList } from '@/pages/CookingShoppingList';
import { Reading } from '@/pages/Reading';
import { ReadingLibrary } from '@/pages/ReadingLibrary';
import { ReadingSearch } from '@/pages/ReadingSearch';
import { ReadingLists } from '@/pages/ReadingLists';
import { ReadingStatsPage } from '@/pages/ReadingStats';
import { BookDetail } from '@/pages/BookDetail';
import { Plants } from '@/pages/Plants';
import { PlantsList } from '@/pages/PlantsList';
import { PlantDetail } from '@/pages/PlantDetail';
import { PlantForm } from '@/pages/PlantForm';
import { Coding } from '@/pages/Coding';
import { CodingSnippetsList, CodingSnippetForm } from '@/pages/CodingSnippets';
import { CodingRepos } from '@/pages/CodingRepos';
import { CodingRepoDetail } from '@/pages/CodingRepoDetail';
import { CodingTemplatesList, CodingTemplateForm } from '@/pages/CodingTemplates';
import { CodingSettings } from '@/pages/CodingSettings';
import { Calendar } from '@/pages/Calendar';
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

// Simple protected route - pages now handle their own layout
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const user = useAuthStore((state) => state.user);
  const fetchUser = useAuthStore((state) => state.fetchUser);

  useEffect(() => {
    if (isAuthenticated && !user) {
      fetchUser();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if user is admin - redirect to home if not
  if (user && !user.is_admin) {
    return <Navigate to="/" replace />;
  }

  // Still loading user data
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
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
                  <Hub />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/finance"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/finance/*"
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

            {/* Household routes */}
            <Route
              path="/household"
              element={
                <ProtectedRoute>
                  <Household />
                </ProtectedRoute>
              }
            />
            <Route
              path="/household/bills"
              element={
                <ProtectedRoute>
                  <HouseholdBills />
                </ProtectedRoute>
              }
            />
            <Route
              path="/household/subscriptions"
              element={
                <ProtectedRoute>
                  <HouseholdSubscriptions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/household/insurance"
              element={
                <ProtectedRoute>
                  <HouseholdInsurance />
                </ProtectedRoute>
              }
            />
            <Route
              path="/household/maintenance"
              element={
                <ProtectedRoute>
                  <HouseholdMaintenance />
                </ProtectedRoute>
              }
            />

            {/* Cooking routes */}
            <Route
              path="/cooking"
              element={
                <ProtectedRoute>
                  <Cooking />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cooking/recipes"
              element={
                <ProtectedRoute>
                  <CookingRecipes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cooking/recipes/new"
              element={
                <ProtectedRoute>
                  <CookingAddRecipe />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cooking/recipes/:id"
              element={
                <ProtectedRoute>
                  <CookingRecipeDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cooking/recipes/:id/edit"
              element={
                <ProtectedRoute>
                  <CookingEditRecipe />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cooking/collections"
              element={
                <ProtectedRoute>
                  <CookingCollections />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cooking/collections/:id"
              element={
                <ProtectedRoute>
                  <CookingCollectionDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cooking/meal-plan"
              element={
                <ProtectedRoute>
                  <CookingMealPlan />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cooking/shopping-list"
              element={
                <ProtectedRoute>
                  <CookingShoppingList />
                </ProtectedRoute>
              }
            />

            {/* Reading routes */}
            <Route
              path="/reading"
              element={
                <ProtectedRoute>
                  <Reading />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reading/library"
              element={
                <ProtectedRoute>
                  <ReadingLibrary />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reading/library/:id"
              element={
                <ProtectedRoute>
                  <BookDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reading/search"
              element={
                <ProtectedRoute>
                  <ReadingSearch />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reading/lists"
              element={
                <ProtectedRoute>
                  <ReadingLists />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reading/lists/:id"
              element={
                <ProtectedRoute>
                  <ReadingLists />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reading/stats"
              element={
                <ProtectedRoute>
                  <ReadingStatsPage />
                </ProtectedRoute>
              }
            />

            {/* Plants routes */}
            <Route
              path="/plants"
              element={
                <ProtectedRoute>
                  <Plants />
                </ProtectedRoute>
              }
            />
            <Route
              path="/plants/list"
              element={
                <ProtectedRoute>
                  <PlantsList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/plants/new"
              element={
                <ProtectedRoute>
                  <PlantForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/plants/rooms"
              element={
                <ProtectedRoute>
                  <PlantsList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/plants/watering"
              element={
                <ProtectedRoute>
                  <PlantsList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/plants/:id"
              element={
                <ProtectedRoute>
                  <PlantDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/plants/:id/edit"
              element={
                <ProtectedRoute>
                  <PlantForm />
                </ProtectedRoute>
              }
            />

            {/* Coding routes */}
            <Route
              path="/code"
              element={
                <ProtectedRoute>
                  <Coding />
                </ProtectedRoute>
              }
            />
            <Route
              path="/code/snippets"
              element={
                <ProtectedRoute>
                  <CodingSnippetsList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/code/snippets/new"
              element={
                <ProtectedRoute>
                  <CodingSnippetForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/code/snippets/:id"
              element={
                <ProtectedRoute>
                  <CodingSnippetForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/code/snippets/:id/edit"
              element={
                <ProtectedRoute>
                  <CodingSnippetForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/code/repos"
              element={
                <ProtectedRoute>
                  <CodingRepos />
                </ProtectedRoute>
              }
            />
            <Route
              path="/code/repos/:owner/:repo"
              element={
                <ProtectedRoute>
                  <CodingRepoDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/code/templates"
              element={
                <ProtectedRoute>
                  <CodingTemplatesList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/code/templates/new"
              element={
                <ProtectedRoute>
                  <CodingTemplateForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/code/templates/:id/edit"
              element={
                <ProtectedRoute>
                  <CodingTemplateForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/code/settings"
              element={
                <ProtectedRoute>
                  <CodingSettings />
                </ProtectedRoute>
              }
            />

            {/* Calendar routes */}
            <Route
              path="/calendar"
              element={
                <ProtectedRoute>
                  <Calendar />
                </ProtectedRoute>
              }
            />
            <Route
              path="/calendar/reminders"
              element={
                <ProtectedRoute>
                  <Calendar />
                </ProtectedRoute>
              }
            />
            <Route
              path="/calendar/reminders/new"
              element={
                <ProtectedRoute>
                  <Calendar />
                </ProtectedRoute>
              }
            />
            <Route
              path="/calendar/settings"
              element={
                <ProtectedRoute>
                  <Calendar />
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
                <AdminRoute>
                  <Admin />
                </AdminRoute>
              }
            />

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
