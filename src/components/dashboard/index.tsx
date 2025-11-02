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
  RefreshCw,
  FolderOpen,
  CreditCard,
  ArrowRight,
  Zap
} from "lucide-react";
import { get, getCurrentUser } from "../../utils/service.js";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

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

interface AdminDashboardData {
  stats: {
    total_projects: number;
    active_projects: number;
    total_users: number;
    total_deposits: number;
    total_allocated: number;
    total_spent: number;
    pending_expenses: number;
    budget_utilization: number;
  };
  recent_projects: Array<{
    id: string;
    project_code: string;
    name: string;
    description: string;
    status: string;
    start_date: string;
    end_date: string;
    created_at: string;
    updated_at: string;
  }>;
  pending_expenses: Array<{
    id: string;
    amount: number;
    description: string;
    status: string;
    project_name: string;
  }>;
  recent_allocations: Array<{
    id: string;
    amount: string;
    description: string;
    status: string;
    allocated_at: string;
    project_name: string;
    project_code: string;
    first_name: string;
    last_name: string;
    email: string;
  }>;
  top_spending_users: Array<{
    id: string;
    first_name: string;
    last_name: string;
    total_spent: number;
  }>;
  monthly_spending: Array<{
    month: string;
    month_name: string;
    total: number;
  }>;
}

interface UserDashboardData {
  stats: {
    my_projects: number;
    total_allocated: number;
    total_spent: number;
    remaining_balance: number;
    pending_expenses: number;
  };
  my_projects: Array<{
    id: string;
    project_code: string;
    name: string;
    description: string;
    status: string;
    start_date: string;
    end_date: string;
    assigned_at: string;
  }>;
  recent_expenses: Array<any>;
  recent_allocations: Array<{
    id: string;
    amount: string;
    description: string;
    status: string;
    allocated_at: string;
    project_name: string;
    project_code: string;
  }>;
  monthly_expenses: Array<{
    month: string;
    month_name: string;
    total: number;
  }>;
}

type DashboardData = AdminDashboardData | UserDashboardData | null;

// Get current user role from localStorage
const getCurrentUserRole = () => {
  try {
    const userStr = localStorage.getItem('truray_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.role || 'user';
    }
  } catch (error) {
    console.error('Error getting user role:', error);
  }
  return 'user';
};

// Skeleton Components
const SkeletonBox = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`}></div>
);

// New Card Components with Marketing Dashboard Design
const StatCard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  color = "default",
  loading = false 
}: { 
  title: string;
  value: string | number;
  subtitle: string;
  icon: any;
  color?: "default" | "lime";
  loading?: boolean;
}) => {
  const cardClasses = color === "lime" 
    ? "bg-lime-50 dark:bg-lime-900/30 border-lime-200 dark:border-lime-800"
    : "bg-white border-gray-200";

  const textClasses = color === "lime"
    ? "text-lime-900 dark:text-lime-200"
    : "text-gray-500";

  const valueClasses = color === "lime"
    ? "text-lime-950 dark:text-lime-50"
    : "text-gray-900";

  const iconClasses = color === "lime"
    ? "text-lime-900 dark:text-lime-200"
    : "text-gray-400";

  return (
    <div className={`rounded-xl border p-4 h-full overflow-hidden ${cardClasses}`}>
      <div className="p-2">
        <div className="flex items-center justify-between mb-4">
          <p className={`font-medium text-xs ${textClasses}`}>
            {loading ? <SkeletonBox className="h-3 w-16" /> : title}
          </p>
          {loading ? (
            <SkeletonBox className="h-4 w-4 rounded-full" />
          ) : (
            <Icon className={`w-4 h-4 ${iconClasses}`} />
          )}
        </div>
        <div className="mb-2">
          {loading ? (
            <SkeletonBox className="h-6 w-12 mb-1" />
          ) : (
            <span className={`text-xl font-bold ${valueClasses}`}>
              {value}
            </span>
          )}
        </div>
        {loading ? (
          <SkeletonBox className="h-3 w-20" />
        ) : (
          <p className={`text-xs ${textClasses}`}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

const ProgressCard = ({ 
  title, 
  total, 
  unit, 
  stats, 
  icon: Icon, 
  loading = false 
}: { 
  title: string;
  total: string | number;
  unit: string;
  stats: Array<{ label: string; value: number; color: string }>;
  icon: any;
  loading?: boolean;
}) => {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 h-full overflow-hidden">
      <div className="p-2">
        <div className="flex items-center justify-between mb-4">
          <p className="font-medium text-xs text-gray-500">
            {loading ? <SkeletonBox className="h-3 w-16" /> : title}
          </p>
          {loading ? (
            <SkeletonBox className="h-4 w-4 rounded-full" />
          ) : (
            <Icon className="w-4 h-4 text-gray-400" />
          )}
        </div>
        <div className="mb-4">
          {loading ? (
            <SkeletonBox className="h-6 w-12 mb-1" />
          ) : (
            <span className="text-xl font-bold text-gray-900">
              {total}
            </span>
          )}
          {loading ? (
            <SkeletonBox className="h-3 w-8 ml-1" />
          ) : (
            <span className="ml-1 text-xs text-gray-500">{unit}</span>
          )}
        </div>
        
        {/* Progress Bar */}
        {loading ? (
          <SkeletonBox className="w-full h-2 mb-2 rounded-full" />
        ) : (
          <div className="w-full h-2 mb-2 overflow-hidden rounded-full bg-gray-100 flex">
            {stats.map((stat, index) => (
              <div
                key={index}
                className={`h-full ${stat.color}`}
                style={{ width: `${stat.value}%` }}
              />
            ))}
          </div>
        )}
        
        {/* Legend */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-center gap-1.5">
                <SkeletonBox className="w-2 h-2 rounded-full" />
                <SkeletonBox className="h-3 w-8" />
              </div>
            ))
          ) : (
            stats.map((stat) => (
              <div key={stat.label} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${stat.color}`}></span>
                <span>{stat.label}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const CTABanner = ({ 
  text, 
  buttonText, 
  onButtonClick, 
  loading = false 
}: { 
  text: string;
  buttonText: string;
  onButtonClick: () => void;
  loading?: boolean;
}) => {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50/60 border border-gray-200">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-full bg-white border border-gray-200">
          <Zap className="w-4 h-4 text-gray-700" />
        </div>
        {loading ? (
          <SkeletonBox className="h-4 w-48" />
        ) : (
          <p className="text-xs font-medium text-gray-600">{text}</p>
        )}
      </div>
      {loading ? (
        <SkeletonBox className="h-8 w-20 rounded-md" />
      ) : (
        <button 
          onClick={onButtonClick}
          className="shrink-0 flex items-center gap-2 px-3 py-2 bg-primary text-black text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors"
        >
          {buttonText}
          <ArrowRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};

// Welcome Card Component
const WelcomeCard = ({ userName, loading = false }: { userName: string; loading?: boolean }) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-secondary p-6">
      {loading ? (
        <>
          <SkeletonBox className="h-8 w-64 mb-2" />
          <SkeletonBox className="h-4 w-48" />
        </>
      ) : (
        <>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            {getGreeting()}, {userName}
          </h1>
          <p className="text-xs text-white">
            Here's what's happening with your projects today
          </p>
        </>
      )}
    </div>
  );
};

// Skeleton components for different sections
const ListItemSkeleton = () => (
  <div className="bg-white rounded-lg border border-gray-200 p-3">
    <div className="flex justify-between items-start">
      <div className="flex-1">
        <SkeletonBox className="h-4 w-3/4 mb-2" />
        <SkeletonBox className="h-3 w-1/2 mb-1" />
        <SkeletonBox className="h-3 w-2/3" />
      </div>
      <SkeletonBox className="h-6 w-16 rounded-lg" />
    </div>
  </div>
);

const BudgetUtilizationSkeleton = () => (
  <div className="bg-white rounded-xl border border-gray-200 p-4">
    <div className="border-b border-gray-100 pb-3 mb-4">
      <SkeletonBox className="h-4 w-32 mb-1" />
      <SkeletonBox className="h-3 w-24" />
    </div>
    <div className="p-2">
      <div className="flex items-center justify-center">
        <SkeletonBox className="h-16 w-16 rounded-full" />
      </div>
      <div className="mt-4 text-center">
        <SkeletonBox className="h-3 w-40 mx-auto" />
      </div>
    </div>
  </div>
);

function EnhancedDashboardContent({
  loading,
  onRefresh,
}: any) {
  const [dashboardData, setDashboardData] = useState<DashboardData>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [userRole, setUserRole] = useState<'admin' | 'finance_manager' | 'user'>('user');
  const [userName, setUserName] = useState<string>('User');

  useEffect(() => {
    const role = getCurrentUserRole();
    setUserRole(role);
    
    // Get user name
    const user = getCurrentUser();
    if (user && user.first_name) {
      setUserName(user.first_name);
    }
    
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setDataLoading(true);
    try {
      const response = await get('/dashboard');
      if (response.success) {
        setDashboardData(response.data);
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

  const handleCTAClick = () => {
    // Navigate to appropriate page based on user role
    if (userRole === 'user') {
      window.location.href = '/projects';
    } else {
      window.location.href = '/reports';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
      case "approved":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-primary/20 text-primary";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "planning":
        return "bg-gray-100 text-gray-800";
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
  const isAdmin = userRole === 'admin' || userRole === 'finance_manager';

  // Chart config
  const chartConfig = {
    total: {
      label: "Monthly Spend",
      color: "#10b981",
    },
  };

  // Prepare chart data
  const getChartData = () => {
    const rawData = isAdmin 
      ? (dashboardData as AdminDashboardData)?.monthly_spending || []
      : (dashboardData as UserDashboardData)?.monthly_expenses || [];
    
    // Get last 4 months of data
    return rawData.slice(-4);
  };

  // Admin Stats Grid
  const renderAdminStats = () => {
    const data = dashboardData as AdminDashboardData;
    
    if (isLoading) {
      return (
        <>
          <StatCard
            title="Total Projects"
            value="0"
            subtitle="0 active"
            icon={Building2}
            loading={true}
          />
          <StatCard
            title="Total Users"
            value="0"
            subtitle="System users"
            icon={Users}
            loading={true}
          />
          <StatCard
            title="Total Deposits"
            value="$0"
            subtitle="Money deposited"
            icon={DollarSign}
            loading={true}
          />
          <StatCard
            title="Total Allocated"
            value="$0"
            subtitle="Money allocated"
            icon={TrendingUp}
            loading={true}
          />
          <StatCard
            title="Total Spent"
            value="$0"
            subtitle="Expenses paid"
            icon={Wallet}
            loading={true}
          />
          <StatCard
            title="Pending Approvals"
            value="0"
            subtitle="Awaiting review"
            icon={AlertTriangle}
            loading={true}
          />
        </>
      );
    }

    return (
      <>
        <StatCard
          title="Total Projects"
          value={data?.stats.total_projects || 0}
          subtitle={`${data?.stats.active_projects || 0} active`}
          icon={Building2}
        />
        <StatCard
          title="Total Users"
          value={data?.stats.total_users || 0}
          subtitle="System users"
          icon={Users}
        />
        <StatCard
          title="Total Deposits"
          value={formatCurrency(data?.stats.total_deposits || 0)}
          subtitle="Money deposited"
          icon={DollarSign}
        />
        <StatCard
          title="Total Allocated"
          value={formatCurrency(data?.stats.total_allocated || 0)}
          subtitle="Money allocated"
          icon={TrendingUp}
        />
        <StatCard
          title="Total Spent"
          value={formatCurrency(data?.stats.total_spent || 0)}
          subtitle="Expenses paid"
          icon={Wallet}
        />
        <StatCard
          title="Pending Approvals"
          value={data?.stats.pending_expenses || 0}
          subtitle="Awaiting review"
          icon={AlertTriangle}
        />
      </>
    );
  };

  // User Stats Grid
  const renderUserStats = () => {
    const data = dashboardData as UserDashboardData;
    
    if (isLoading) {
      return (
        <>
          <StatCard
            title="My Projects"
            value="0"
            subtitle="Assigned to me"
            icon={FolderOpen}
            loading={true}
          />
          <StatCard
            title="Total Allocated"
            value="$0"
            subtitle="My budget"
            icon={CreditCard}
            loading={true}
          />
          <StatCard
            title="Total Spent"
            value="$0"
            subtitle="My expenses"
            icon={Wallet}
            loading={true}
          />
          <StatCard
            title="Remaining Balance"
            value="$0"
            subtitle="Available to spend"
            icon={DollarSign}
            loading={true}
          />
          <StatCard
            title="Pending Expenses"
            value="0"
            subtitle="Awaiting approval"
            icon={AlertTriangle}
            loading={true}
          />
          <ProgressCard
            title="Budget Used"
            total="0%"
            unit=""
            stats={[
              { label: "Used", value: 0, color: "bg-secondary" },
              { label: "Available", value: 100, color: "bg-gray-200" }
            ]}
            icon={PieChart}
            loading={true}
          />
        </>
      );
    }

    const budgetUsed = data?.stats.total_allocated ? 
      Math.round((data.stats.total_spent / data.stats.total_allocated) * 100) : 0;
    const budgetAvailable = 100 - budgetUsed;

    return (
      <>
        <StatCard
          title="My Projects"
          value={data?.stats.my_projects || 0}
          subtitle="Assigned to me"
          icon={FolderOpen}
        />
        <StatCard
          title="Total Allocated"
          value={formatCurrency(data?.stats.total_allocated || 0)}
          subtitle="My budget"
          icon={CreditCard}
        />
        <StatCard
          title="Total Spent"
          value={formatCurrency(data?.stats.total_spent || 0)}
          subtitle="My expenses"
          icon={Wallet}
        />
        <StatCard
          title="Remaining Balance"
          value={formatCurrency(data?.stats.remaining_balance || 0)}
          subtitle="Available to spend"
          icon={DollarSign}
        />
        <StatCard
          title="Pending Expenses"
          value={data?.stats.pending_expenses || 0}
          subtitle="Awaiting approval"
          icon={AlertTriangle}
        />
        <ProgressCard
          title="Budget Used"
          total={`${budgetUsed}%`}
          unit=""
          stats={[
            { label: "Used", value: budgetUsed, color: "bg-secondary" },
            { label: "Available", value: budgetAvailable, color: "bg-gray-200" }
          ]}
          icon={PieChart}
        />
      </>
    );
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header with Refresh */}
          <div className="flex justify-end items-center">
            {isLoading ? (
              <SkeletonBox className="h-9 w-24 rounded-lg" />
            ) : (
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 text-xs bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            )}
          </div>

          {/* Welcome Card */}
          <WelcomeCard userName={userName} loading={isLoading} />

          {/* Top Stats - Responsive Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {isAdmin ? renderAdminStats() : renderUserStats()}
          </div>

          {/* CTA Banner */}
          <CTABanner
            text={isAdmin ? "Manage your system and view detailed reports" : "Manage your activities and project expenses"}
            buttonText="See All"
            onButtonClick={handleCTAClick}
            loading={isLoading}
          />

          {/* Monthly Spending Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="border-b border-gray-100 pb-3 mb-4">
              {isLoading ? (
                <>
                  <SkeletonBox className="h-5 w-32 mb-1" />
                  <SkeletonBox className="h-3 w-24" />
                </>
              ) : (
                <>
                  <h2 className="text-lg font-bold text-gray-900">
                    Monthly Spending
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {isAdmin ? 'Total spending by month' : 'My spending by month'}
                  </p>
                </>
              )}
            </div>
            <div className="h-80">
              {isLoading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <SkeletonBox className="w-full h-64" />
                </div>
              ) : (
                <ChartContainer config={chartConfig} className="h-full w-full">
                  <BarChart data={getChartData()} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="month_name" 
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                      axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <YAxis 
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                      axisLine={{ stroke: '#e5e7eb' }}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <ChartTooltip 
                      content={
                        <ChartTooltipContent 
                          className="text-xs"
                          formatter={(value) => formatCurrency(Number(value))}
                        />
                      } 
                    />
                    <Bar 
                      dataKey="total" 
                      fill="var(--color-total)"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              )}
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Projects Section */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-4 border-b border-gray-100">
                {isLoading ? (
                  <>
                    <SkeletonBox className="h-5 w-32 mb-1" />
                    <SkeletonBox className="h-3 w-24" />
                  </>
                ) : (
                  <>
                    <h2 className="text-lg font-bold text-gray-900">
                      {isAdmin ? 'Recent Projects' : 'My Projects'}
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {isAdmin ? 'Latest project activities' : 'Projects assigned to me'}
                    </p>
                  </>
                )}
              </div>
              <div className="p-4 space-y-3">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <ListItemSkeleton key={index} />
                  ))
                ) : isAdmin ? (
                  (dashboardData as AdminDashboardData)?.recent_projects && 
                  (dashboardData as AdminDashboardData).recent_projects.length > 0 ? (
                    (dashboardData as AdminDashboardData).recent_projects.map((project) => (
                      <div key={project.id} className="bg-white rounded-lg border border-gray-200 p-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="text-xs font-semibold text-gray-900 mb-1">
                              {project.name}
                            </h3>
                            <p className="text-xs text-gray-500 mb-1">
                              Code: {project.project_code}
                            </p>
                            <p className="text-xs text-gray-400">
                              Created: {formatDate(project.created_at)}
                            </p>
                          </div>
                          <span className={`px-2 py-1 text-xs font-medium rounded-lg ${getStatusColor(project.status)}`}>
                            {project.status}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-500 text-center py-6">No projects found</p>
                  )
                ) : (
                  (dashboardData as UserDashboardData)?.my_projects && 
                  (dashboardData as UserDashboardData).my_projects.length > 0 ? (
                    (dashboardData as UserDashboardData).my_projects.map((project) => (
                      <div key={project.id} className="bg-white rounded-lg border border-gray-200 p-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="text-xs font-semibold text-gray-900 mb-1">
                              {project.name}
                            </h3>
                            <p className="text-xs text-gray-500 mb-1">
                              Code: {project.project_code}
                            </p>
                            <p className="text-xs text-gray-400">
                              Assigned: {formatDate(project.assigned_at)}
                            </p>
                          </div>
                          <span className={`px-2 py-1 text-xs font-medium rounded-lg ${getStatusColor(project.status)}`}>
                            {project.status}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-500 text-center py-6">No projects assigned</p>
                  )
                )}
              </div>
            </div>

            {/* Allocations Section */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-4 border-b border-gray-100">
                {isLoading ? (
                  <>
                    <SkeletonBox className="h-5 w-32 mb-1" />
                    <SkeletonBox className="h-3 w-24" />
                  </>
                ) : (
                  <>
                    <h2 className="text-lg font-bold text-gray-900">
                      Recent Allocations
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {isAdmin ? 'Latest money allocations' : 'My recent allocations'}
                    </p>
                  </>
                )}
              </div>
              <div className="p-4 space-y-3">
                {isLoading ? (
                  Array.from({ length: 2 }).map((_, index) => (
                    <ListItemSkeleton key={index} />
                  ))
                ) : (
                  dashboardData && 'recent_allocations' in dashboardData && 
                  dashboardData.recent_allocations.length > 0 ? (
                    dashboardData.recent_allocations.map((allocation: any) => (
                      <div key={allocation.id} className="bg-white rounded-lg border border-gray-200 p-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="text-xs font-semibold text-gray-900 mb-1">
                              {allocation.description}
                            </h3>
                            <p className="text-xs text-gray-500 mb-1">
                              Amount: {formatCurrency(parseFloat(allocation.amount))}
                            </p>
                            <p className="text-xs text-gray-500">
                              Project: {allocation.project_name}
                            </p>
                            {isAdmin && allocation.first_name && (
                              <p className="text-xs text-gray-400">
                                User: {allocation.first_name} {allocation.last_name}
                              </p>
                            )}
                          </div>
                          <span className={`px-2 py-1 text-xs font-medium rounded-lg ${getStatusColor(allocation.status)}`}>
                            {allocation.status}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-500 text-center py-6">No allocations found</p>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Additional Sections for Admin */}
          {isAdmin && !isLoading && (dashboardData as AdminDashboardData)?.top_spending_users && 
           (dashboardData as AdminDashboardData).top_spending_users.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Spending Users */}
              <div className="bg-white rounded-xl border border-gray-200">
                <div className="p-4 border-b border-gray-100">
                  <h2 className="text-lg font-bold text-gray-900">
                    Top Spending Users
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Highest expenses by user
                  </p>
                </div>
                <div className="p-4 space-y-3">
                  {(dashboardData as AdminDashboardData).top_spending_users.map((user) => (
                    <div key={user.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-xs font-medium text-gray-900">
                          {user.first_name} {user.last_name}
                        </p>
                      </div>
                      <p className="text-xs font-semibold text-red-600">
                        {formatCurrency(user.total_spent)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Budget Utilization */}
              {isLoading ? (
                <BudgetUtilizationSkeleton />
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="border-b border-gray-100 pb-4 mb-4">
                    <h2 className="text-lg font-bold text-gray-900">
                      Budget Utilization
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Overall budget usage
                    </p>
                  </div>
                  <div className="p-2">
                    <div className="flex items-center justify-center">
                      <div className="relative">
                        <PieChart className="h-16 w-16 text-purple-500" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-lg font-bold text-gray-900">
                            {`${(dashboardData as AdminDashboardData)?.stats.budget_utilization || 0}%`}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 text-center">
                      <p className="text-xs text-gray-600">
                        {formatCurrency((dashboardData as AdminDashboardData)?.stats.total_spent || 0)} spent of{' '}
                        {formatCurrency((dashboardData as AdminDashboardData)?.stats.total_deposits || 0)} deposited
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
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