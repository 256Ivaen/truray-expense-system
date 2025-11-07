import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { Toaster } from "sonner";
import DashboardPage from "@/pages/DashboardPage";
import Login from "@/pages/Login";
import MainLayout from "@/components/layout/MainLayout";
import { isLoggedIn } from "./utils/service.js";
import { useEffect, useState } from "react";
import UsersPage from "./pages/Users.js";
import ProjectsPage from "./pages/Projects.js";
import FinancesPage from "./pages/Finance.js";
import AllocationsPage from "./pages/Allocations.js";
import ExpensesPage from "./pages/Expenses.js";
import ReportsPage from "./pages/Reports";
import SettingsPage from "./pages/Settings";
import ProjectDetailsPage from "./pages/ProjectDetails.js";
import ExpenseDetailsPage from "./pages/ExpenseDetails.js";
import AllocationDetailsPage from "./pages/AllocationDetails.js";
import SearchResults from "./pages/SearchResults.js";

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Public Route Component (redirects to dashboard if already logged in)
const PublicRoute = ({ children }) => {
  if (isLoggedIn()) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const UnderConstructionPage = ({ title }) => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate(-1); // Go back to previous page
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl text-yellow-600 font-bold">!</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-600 mb-4">This page is under development</p>
        <p className="text-xs text-gray-500 mb-6">
          Redirecting back in {countdown} seconds...
        </p>
        <button
          onClick={() => navigate(-1)}
          className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary transition-colors font-medium"
        >
          Go Back Now
        </button>
      </div>
    </div>
  );
};

// Wrapper component to ensure all pages use MainLayout
const LayoutWrapper = ({ children, title = "Truray" }) => {
  return <MainLayout>{children}</MainLayout>;
};

// Placeholder components for each page

function AppContent() {
  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Routes>
          {/* Public Routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />

          {/* Protected Routes - All wrapped with MainLayout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <LayoutWrapper>
                  <DashboardPage />
                </LayoutWrapper>
              </ProtectedRoute>
            }
          />

          {/* Users Management */}
          <Route
            path="/users"
            element={
              <ProtectedRoute>
                <LayoutWrapper>
                  <UsersPage />
                </LayoutWrapper>
              </ProtectedRoute>
            }
          />

          {/* Projects Management */}
          <Route
            path="/projects"
            element={
              <ProtectedRoute>
                <LayoutWrapper>
                  <ProjectsPage />
                </LayoutWrapper>
              </ProtectedRoute>
            }
          />

          <Route
            path="/projects/:id"
            element={
              <ProtectedRoute>
                <LayoutWrapper>
                  <ProjectDetailsPage />
                </LayoutWrapper>
              </ProtectedRoute>
            }
          />

          {/* Finance Deposits */}
          <Route
            path="/finance"
            element={
              <ProtectedRoute>
                <LayoutWrapper>
                  <FinancesPage />
                </LayoutWrapper>
              </ProtectedRoute>
            }
          />

          {/* Money Allocations */}
          <Route
            path="/allocations"
            element={
              <ProtectedRoute>
                <LayoutWrapper>
                  <AllocationsPage />
                </LayoutWrapper>
              </ProtectedRoute>
            }
          />

          <Route
            path="/allocations/:id"
            element={
              <ProtectedRoute>
                <LayoutWrapper>
                  <AllocationDetailsPage />
                </LayoutWrapper>
              </ProtectedRoute>
            }
          />

          {/* Expense Tracking */}
          <Route
            path="/expenses"
            element={
              <ProtectedRoute>
                <LayoutWrapper>
                  <ExpensesPage />
                </LayoutWrapper>
              </ProtectedRoute>
            }
          />

          <Route
            path="/expenses/:id"
            element={
              <ProtectedRoute>
                <LayoutWrapper>
                  <ExpenseDetailsPage />
                </LayoutWrapper>
              </ProtectedRoute>
            }
          />

          {/* Reports & Analytics */}
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <LayoutWrapper>
                  <ReportsPage />
                </LayoutWrapper>
              </ProtectedRoute>
            }
          />

          {/* Settings */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <LayoutWrapper>
                  <SettingsPage />
                </LayoutWrapper>
              </ProtectedRoute>
            }
          />

          <Route
            path="/search"
            element={
              <ProtectedRoute>
                <LayoutWrapper>
                  <SearchResults />
                </LayoutWrapper>
              </ProtectedRoute>
            }
          />

          {/* Catch all - redirect to login if not authenticated, dashboard if authenticated */}
          <Route
            path="*"
            element={
              isLoggedIn() ? (
                <Navigate to="/" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
        </Routes>

        <Toaster position="top-right" richColors closeButton duration={4000} />
      </div>
    </Router>
  );
}

function App() {
  return <AppContent />;
}

export default App;
