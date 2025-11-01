"use client";

import { useState, useEffect } from "react";
import { 
  TrendingUp, 
  Users, 
  Building2, 
  DollarSign,
  PieChart,
  Wallet,
  AlertTriangle,
  RefreshCw 
} from "lucide-react";
import { get } from "../../utils/service.js";

interface DashboardProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
  selectedCompany: string;
  setSelectedCompany: (companyId: string) => void;
  businesses: any[];
  setBusinesses: React.Dispatch<React.SetStateAction<any[]>>;
  loading: boolean;
  onRefresh: () => void;
}

interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  totalUsers: number;
  totalExpenses: number;
  totalAllocations: number;
  pendingApprovals: number;
  budgetUtilization: number;
}

interface Project {
  id: string;
  project_code: string;
  name: string;
  description: string;
  status: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

interface Expense {
  id: string;
  project_id: string;
  amount: number;
  description: string;
  status: string;
  created_at: string;
  project?: {
    name: string;
  };
  user?: {
    first_name: string;
    last_name: string;
  };
}

interface Allocation {
  id: string;
  project_id: string;
  user_id: string;
  amount: number;
  description: string;
  status: string;
  created_at: string;
  project?: {
    name: string;
  };
  user?: {
    first_name: string;
    last_name: string;
  };
}

const SkeletonBox = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`}></div>
);

function EnhancedDashboardContent({
  loading,
  onRefresh,
}: any) {
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalProjects: 0,
    activeProjects: 0,
    totalUsers: 0,
    totalExpenses: 0,
    totalAllocations: 0,
    pendingApprovals: 0,
    budgetUtilization: 0
  });
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [pendingExpenses, setPendingExpenses] = useState<Expense[]>([]);
  const [recentAllocations, setRecentAllocations] = useState<Allocation[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setDataLoading(true);
    try {
      // Fetch dashboard stats from reports endpoint
      const statsResponse = await get('/reports/dashboard');
      if (statsResponse.success) {
        setDashboardStats(statsResponse.data);
      }

      // Fetch recent projects
      const projectsResponse = await get('/projects');
      if (projectsResponse.success) {
        const projects = projectsResponse.data.slice(0, 3); // Get latest 3 projects
        setRecentProjects(projects);
        setDashboardStats(prev => ({
          ...prev,
          totalProjects: projectsResponse.data.length,
          activeProjects: projectsResponse.data.filter((p: Project) => p.status === 'active').length
        }));
      }

      // Fetch users count
      const usersResponse = await get('/users');
      if (usersResponse.success) {
        setDashboardStats(prev => ({
          ...prev,
          totalUsers: usersResponse.data.length
        }));
      }

      // Fetch expenses
      const expensesResponse = await get('/expenses');
      if (expensesResponse.success) {
        const expenses = expensesResponse.data;
        const pending = expenses.filter((e: Expense) => e.status === 'pending');
        const totalExpenses = expenses.reduce((sum: number, e: Expense) => sum + e.amount, 0);
        
        setPendingExpenses(pending.slice(0, 2)); // Get latest 2 pending expenses
        setDashboardStats(prev => ({
          ...prev,
          totalExpenses,
          pendingApprovals: pending.length
        }));
      }

      // Fetch allocations
      const allocationsResponse = await get('/allocations');
      if (allocationsResponse.success) {
        const allocations = allocationsResponse.data;
        const totalAllocations = allocations.reduce((sum: number, a: Allocation) => sum + a.amount, 0);
        
        setRecentAllocations(allocations.slice(0, 2)); // Get latest 2 allocations
        setDashboardStats(prev => ({
          ...prev,
          totalAllocations
        }));
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchDashboardData();
    onRefresh?.();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isLoading = loading || dataLoading;

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="p-2 sm:p-4 lg:p-6">
        <div className="max-w-7xl mx-auto space-y-3 sm:space-y-4 lg:space-y-6">
          {/* Header with Refresh */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                Expense Management Overview
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Top Stats - Responsive Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
            {/* Total Projects */}
            <div className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <Building2 className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500 mr-1" />
                    <p className="text-xs text-gray-500 font-medium">
                      Total Projects
                    </p>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                    {isLoading ? (
                      <SkeletonBox className="h-5 sm:h-6 w-10 sm:w-12" />
                    ) : (
                      dashboardStats.totalProjects
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    {dashboardStats.activeProjects} active
                  </p>
                </div>
              </div>
            </div>

            {/* Total Users */}
            <div className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <Users className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 mr-1" />
                    <p className="text-xs text-gray-500 font-medium">
                      Total Users
                    </p>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                    {isLoading ? (
                      <SkeletonBox className="h-5 sm:h-6 w-10 sm:w-12" />
                    ) : (
                      dashboardStats.totalUsers
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    System users
                  </p>
                </div>
              </div>
            </div>

            {/* Total Expenses */}
            <div className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <Wallet className="h-3 w-3 sm:h-4 sm:w-4 text-red-500 mr-1" />
                    <p className="text-xs text-gray-500 font-medium">
                      Total Expenses
                    </p>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                    {isLoading ? (
                      <SkeletonBox className="h-5 sm:h-6 w-12 sm:w-16" />
                    ) : (
                      formatCurrency(dashboardStats.totalExpenses)
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    All time expenses
                  </p>
                </div>
              </div>
            </div>

            {/* Total Allocations */}
            <div className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 mr-1" />
                    <p className="text-xs text-gray-500 font-medium">
                      Total Allocations
                    </p>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                    {isLoading ? (
                      <SkeletonBox className="h-5 sm:h-6 w-12 sm:w-16" />
                    ) : (
                      formatCurrency(dashboardStats.totalAllocations)
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    Money allocated
                  </p>
                </div>
              </div>
            </div>

            {/* Pending Approvals */}
            <div className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500 mr-1" />
                    <p className="text-xs text-gray-500 font-medium">
                      Pending Approvals
                    </p>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                    {isLoading ? (
                      <SkeletonBox className="h-5 sm:h-6 w-8 sm:w-10" />
                    ) : (
                      dashboardStats.pendingApprovals
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    Awaiting review
                  </p>
                </div>
              </div>
            </div>

            {/* Budget Utilization */}
            <div className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <PieChart className="h-3 w-3 sm:h-4 sm:w-4 text-purple-500 mr-1" />
                    <p className="text-xs text-gray-500 font-medium">
                      Budget Used
                    </p>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                    {isLoading ? (
                      <SkeletonBox className="h-5 sm:h-6 w-10 sm:w-12" />
                    ) : (
                      `${dashboardStats.budgetUtilization || 0}%`
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    Of total budget
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
            {/* Recent Projects */}
            <div className="bg-white rounded-lg border border-gray-200 lg:col-span-2 xl:col-span-1">
              <div className="p-3 sm:p-4 border-b border-gray-100">
                <h2 className="text-sm sm:text-base font-bold text-gray-900">
                  Recent Projects
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Latest project activities
                </p>
              </div>
              <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="bg-white rounded-lg border border-gray-200 p-3">
                      <SkeletonBox className="h-4 w-3/4 mb-2" />
                      <SkeletonBox className="h-3 w-1/2" />
                    </div>
                  ))
                ) : recentProjects.length > 0 ? (
                  recentProjects.map((project) => (
                    <div
                      key={project.id}
                      className="bg-white rounded-lg border border-gray-200 p-2 sm:p-3"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1">
                            {project.name}
                          </h3>
                          <p className="text-xs text-gray-500 mb-1">
                            Code: {project.project_code}
                          </p>
                          <p className="text-xs text-gray-400">
                            Created: {formatDate(project.created_at)}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-lg ${getStatusColor(project.status)}`}
                        >
                          {project.status}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500 text-center py-4">No projects found</p>
                )}
              </div>
            </div>

            {/* Pending Expenses */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-3 sm:p-4 border-b border-gray-100">
                <h2 className="text-sm sm:text-base font-bold text-gray-900">
                  Pending Expenses
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Awaiting approval
                </p>
              </div>
              <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                {isLoading ? (
                  Array.from({ length: 2 }).map((_, index) => (
                    <div key={index} className="bg-white rounded-lg border border-gray-200 p-3">
                      <SkeletonBox className="h-4 w-3/4 mb-2" />
                      <SkeletonBox className="h-3 w-1/2" />
                    </div>
                  ))
                ) : pendingExpenses.length > 0 ? (
                  pendingExpenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="bg-white rounded-lg border border-gray-200 p-2 sm:p-3"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1">
                            {expense.description}
                          </h3>
                          <p className="text-xs text-gray-500 mb-1">
                            Amount: {formatCurrency(expense.amount)}
                          </p>
                          <p className="text-xs text-gray-400">
                            Submitted: {formatDate(expense.created_at)}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-lg ${getStatusColor(expense.status)}`}
                        >
                          {expense.status}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500 text-center py-4">No pending expenses</p>
                )}
              </div>
            </div>

            {/* Recent Allocations */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-3 sm:p-4 border-b border-gray-100">
                <h2 className="text-sm sm:text-base font-bold text-gray-900">
                  Recent Allocations
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Latest money allocations
                </p>
              </div>
              <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                {isLoading ? (
                  Array.from({ length: 2 }).map((_, index) => (
                    <div key={index} className="bg-white rounded-lg border border-gray-200 p-3">
                      <SkeletonBox className="h-4 w-3/4 mb-2" />
                      <SkeletonBox className="h-3 w-1/2" />
                    </div>
                  ))
                ) : recentAllocations.length > 0 ? (
                  recentAllocations.map((allocation) => (
                    <div
                      key={allocation.id}
                      className="bg-white rounded-lg border border-gray-200 p-2 sm:p-3"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1">
                            {allocation.description}
                          </h3>
                          <p className="text-xs text-gray-500 mb-1">
                            Amount: {formatCurrency(allocation.amount)}
                          </p>
                          <p className="text-xs text-gray-400">
                            Allocated: {formatDate(allocation.created_at)}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-lg ${getStatusColor(allocation.status)}`}
                        >
                          {allocation.status}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500 text-center py-4">No allocations found</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Dashboard({
  businesses,
  setBusinesses,
  activeSection,
  setActiveSection,
  selectedCompany,
  setSelectedCompany,
  loading,
  onRefresh,
}: DashboardProps) {
  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return (
          <EnhancedDashboardContent
            loading={loading}
            onRefresh={onRefresh}
          />
        );
      default:
        return (
          <EnhancedDashboardContent
            loading={loading}
            onRefresh={onRefresh}
          />
        );
    }
  };

  return renderContent();
}