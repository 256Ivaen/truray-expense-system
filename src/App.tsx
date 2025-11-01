import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import DashboardPage from '@/pages/DashboardPage'
import Login from '@/pages/Login'
import MainLayout from '@/components/layout/MainLayout'
import { isLoggedIn } from './utils/service.js'
import { useEffect, useState } from 'react'

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />
  }
  
  return children
}

// Public Route Component (redirects to dashboard if already logged in)
const PublicRoute = ({ children }) => {
  if (isLoggedIn()) {
    return <Navigate to="/" replace />
  }
  
  return children
}

const UnderConstructionPage = ({ title }) => {
  const navigate = useNavigate()
  const [countdown, setCountdown] = useState(10)

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          navigate(-1) // Go back to previous page
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [navigate])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl text-yellow-600 font-bold">!</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-600 mb-4">This page is under development</p>
        <p className="text-sm text-gray-500 mb-6">
          Redirecting back in {countdown} seconds...
        </p>
        <button 
          onClick={() => navigate(-1)} 
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Go Back Now
        </button>
      </div>
    </div>
  )
}

// Wrapper component to ensure all pages use MainLayout
const LayoutWrapper = ({ children, title = 'Truray' }) => {
  return (
    <MainLayout>
      {children}
    </MainLayout>
  )
}

// Placeholder components for each page
const UsersPage = () => <UnderConstructionPage title="Users Management" />
const ProjectsPage = () => <UnderConstructionPage title="Projects Management" />
const FinancePage = () => <UnderConstructionPage title="Finance Deposits" />
const AllocationsPage = () => <UnderConstructionPage title="Money Allocations" />
const ExpensesPage = () => <UnderConstructionPage title="Expense Tracking" />
const ReportsDashboardPage = () => <UnderConstructionPage title="Dashboard Statistics" />
const ReportsProjectSummaryPage = () => <UnderConstructionPage title="Project Summary Report" />
const ReportsUserSpendingPage = () => <UnderConstructionPage title="User Spending Report" />
const ReportsFinancialOverviewPage = () => <UnderConstructionPage title="Financial Overview" />
const SettingsPage = () => <UnderConstructionPage title="Settings" />

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
          
          {/* Finance Deposits */}
          <Route 
            path="/finance" 
            element={
              <ProtectedRoute>
                <LayoutWrapper>
                  <FinancePage />
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
          
          {/* Reports & Analytics */}
          <Route 
            path="/reports/dashboard" 
            element={
              <ProtectedRoute>
                <LayoutWrapper>
                  <ReportsDashboardPage />
                </LayoutWrapper>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/reports/project-summary" 
            element={
              <ProtectedRoute>
                <LayoutWrapper>
                  <ReportsProjectSummaryPage />
                </LayoutWrapper>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/reports/user-spending" 
            element={
              <ProtectedRoute>
                <LayoutWrapper>
                  <ReportsUserSpendingPage />
                </LayoutWrapper>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/reports/financial-overview" 
            element={
              <ProtectedRoute>
                <LayoutWrapper>
                  <ReportsFinancialOverviewPage />
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
          
          {/* Catch all - redirect to login if not authenticated, dashboard if authenticated */}
          <Route 
            path="*" 
            element={
              isLoggedIn() 
                ? <Navigate to="/" replace /> 
                : <Navigate to="/login" replace />
            } 
          />
        </Routes>
        
        <Toaster 
          position="top-right" 
          richColors 
          closeButton
          duration={4000}
        />
      </div>
    </Router>
  )
}

function App() {
  return <AppContent />
}

export default App