"use client";

import { useState, useEffect } from "react";
import { 
  TrendingUp, 
  Users, 
  Building2, 
  PieChart,
  Wallet,
  AlertTriangle,
  RefreshCw,
  FolderOpen,
  CreditCard,
  ArrowUp,
  ArrowDown,
  MoreVertical,
  Receipt,
  Calendar
} from "lucide-react";
import { MdOutlineAttachMoney } from "react-icons/md";
import { get, getCurrentUser } from "../../utils/service.js";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, Tooltip } from "recharts";
import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

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
  pending_expenses: Array<any>;
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
    email: string;
    total_spent: string;
    expense_count: number;
  }>;
  monthly_spending: Array<{
    month: string;
    month_name: string;
    total: string;
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
  recent_expenses: Array<{
    id: string;
    amount: string;
    description: string;
    status: string;
    spent_at: string;
    project_name: string;
    project_code: string;
  }>;
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
    total: string;
  }>;
}

type DashboardData = AdminDashboardData | UserDashboardData | null;

// Donut Chart Component
export interface DonutChartSegment {
  value: number;
  color: string;
  label: string;
  [key: string]: any;
}

interface DonutChartProps extends React.HTMLAttributes<HTMLDivElement> {
  data: DonutChartSegment[];
  totalValue?: number;
  size?: number;
  strokeWidth?: number;
  animationDuration?: number;
  animationDelayPerSegment?: number;
  highlightOnHover?: boolean;
  centerContent?: React.ReactNode;
  onSegmentHover?: (segment: DonutChartSegment | null) => void;
}

const DonutChart = React.forwardRef<HTMLDivElement, DonutChartProps>(
  (
    {
      data,
      totalValue: propTotalValue,
      size = 200,
      strokeWidth = 20,
      animationDuration = 1,
      animationDelayPerSegment = 0.05,
      highlightOnHover = true,
      centerContent,
      onSegmentHover,
      className,
      ...props
    },
    ref
  ) => {
    const [hoveredSegment, setHoveredSegment] =
      React.useState<DonutChartSegment | null>(null);

    const internalTotalValue = React.useMemo(
      () =>
        propTotalValue || data.reduce((sum, segment) => sum + segment.value, 0),
      [data, propTotalValue]
    );

    const radius = size / 2 - strokeWidth / 2;
    const circumference = 2 * Math.PI * radius;
    let cumulativePercentage = 0;

    React.useEffect(() => {
      onSegmentHover?.(hoveredSegment);
    }, [hoveredSegment, onSegmentHover]);

    const handleMouseLeave = () => {
      setHoveredSegment(null);
    };

    return (
      <div
        ref={ref}
        className={cn("relative flex items-center justify-center", className)}
        style={{ width: size, height: size }}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="overflow-visible -rotate-90"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
          />
          
          <AnimatePresence>
            {data.map((segment, index) => {
              if (segment.value === 0) return null;

              const percentage =
                internalTotalValue === 0
                  ? 0
                  : (segment.value / internalTotalValue) * 100;
              
              const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
              const strokeDashoffset = (cumulativePercentage / 100) * circumference;
              
              const isActive = hoveredSegment?.label === segment.label;
              
              cumulativePercentage += percentage;

              return (
                <motion.circle
                  key={segment.label || index}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke={segment.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={-strokeDashoffset}
                  strokeLinecap="round"
                  initial={{ opacity: 0, strokeDashoffset: circumference }}
                  animate={{ 
                    opacity: 1, 
                    strokeDashoffset: -strokeDashoffset,
                  }}
                  transition={{
                    opacity: { duration: 0.3, delay: index * animationDelayPerSegment },
                    strokeDashoffset: {
                      duration: animationDuration,
                      delay: index * animationDelayPerSegment,
                      ease: "easeOut",
                    },
                  }}
                  className={cn(
                    "origin-center transition-transform duration-200",
                    highlightOnHover && "cursor-pointer"
                  )}
                  style={{
                    filter: isActive
                      ? `drop-shadow(0px 0px 6px ${segment.color}) brightness(1.1)`
                      : 'none',
                    transform: isActive ? 'scale(1.03)' : 'scale(1)',
                    transition: "filter 0.2s ease-out, transform 0.2s ease-out",
                  }}
                  onMouseEnter={() => setHoveredSegment(segment)}
                />
              );
            })}
          </AnimatePresence>
        </svg>

        {centerContent && (
          <div
            className="absolute flex flex-col items-center justify-center pointer-events-none"
            style={{
              width: size - strokeWidth * 2.5,
              height: size - strokeWidth * 2.5,
            }}
          >
            {centerContent}
          </div>
        )}
      </div>
    );
  }
);

DonutChart.displayName = "DonutChart";

// Custom Tooltip Component
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg text-xs">
        <p className="font-semibold">{payload[0].payload.month_name}</p>
        <p className="text-primary">${(payload[0].value / 1000).toFixed(1)}k</p>
      </div>
    );
  }
  return null;
};

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

function EnhancedDashboardContent({
  loading,
  onRefresh,
}: any) {
  const [dashboardData, setDashboardData] = useState<DashboardData>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [userRole, setUserRole] = useState<'admin' | 'finance_manager' | 'user'>('user');
  const [userName, setUserName] = useState<string>('User');
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);

  useEffect(() => {
    const role = getCurrentUserRole();
    setUserRole(role);
    
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const suffix = day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th';
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).replace(/\d+/, `${day}${suffix}`);
  };

  const isLoading = loading || dataLoading;
  const isAdmin = userRole === 'admin' || userRole === 'finance_manager';

  // Calculate percentage changes based on monthly data
  const calculatePercentageChange = (type: 'deposits' | 'spent' | 'allocated' | 'projects') => {
    if (!dashboardData) return { percentage: 0, isPositive: true };

    const monthlyData = isAdmin 
      ? (dashboardData as AdminDashboardData)?.monthly_spending || []
      : (dashboardData as UserDashboardData)?.monthly_expenses || [];

    if (monthlyData.length < 2) return { percentage: 0, isPositive: true };

    // Get current month and previous month
    const sortedData = [...monthlyData].sort((a, b) => a.month.localeCompare(b.month));
    const currentMonth = sortedData[sortedData.length - 1];
    const previousMonth = sortedData[sortedData.length - 2];

    const currentValue = parseFloat(currentMonth.total);
    const previousValue = parseFloat(previousMonth.total);

    if (previousValue === 0) return { percentage: 0, isPositive: true };

    const change = ((currentValue - previousValue) / previousValue) * 100;
    
    return {
      percentage: Math.abs(Math.round(change)),
      isPositive: change > 0
    };
  };

  // Prepare chart data
  const getChartData = () => {
    const rawData = isAdmin 
      ? (dashboardData as AdminDashboardData)?.monthly_spending || []
      : (dashboardData as UserDashboardData)?.monthly_expenses || [];
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const startDate = new Date(currentYear, currentMonth - 5, 1);
    
    const filteredData = rawData.filter((item) => {
      const [year, month] = item.month.split('-').map(Number);
      const itemDate = new Date(year, month - 1, 1);
      return itemDate >= startDate && itemDate <= now;
    });
    
    if (filteredData.length < 6) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const paddedData = [];
      
      for (let i = 5; i >= 0; i--) {
        const targetDate = new Date(currentYear, currentMonth - i, 1);
        const targetYear = targetDate.getFullYear();
        const targetMonth = targetDate.getMonth() + 1;
        const targetMonthKey = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;
        
        const existingData = filteredData.find(item => item.month === targetMonthKey);
        
        if (existingData) {
          paddedData.push({
            ...existingData,
            total: parseFloat(existingData.total)
          });
        } else {
          paddedData.push({
            month: targetMonthKey,
            month_name: monthNames[targetDate.getMonth()],
            total: 0
          });
        }
      }
      
      return paddedData;
    }
    
    return filteredData.slice(-6).map(item => ({
      ...item,
      total: parseFloat(item.total)
    }));
  };

  // Prepare donut chart data with DISTINCT colors
  const financialData = React.useMemo(() => {
    if (!dashboardData) return [];
    
    if (isAdmin) {
      const data = dashboardData as AdminDashboardData;
      const Total_Deposits = data.stats.total_deposits;
      const expense = data.stats.total_spent;
      const Balance = data.stats.total_allocated - data.stats.total_spent;

      return [
        { value: Total_Deposits, color: "#10b981", label: "Total Deposits" },
        { value: expense, color: "#1e293b", label: "Expense" },
        { value: Math.max(Balance, 0), color: "#22c55e", label: "Balance" },
      ];
    } else {
      const data = dashboardData as UserDashboardData;
      const allocated = data.stats.total_allocated;
      const spent = data.stats.total_spent;
      const remaining = data.stats.remaining_balance;

      return [
        { value: allocated, color: "#10b981", label: "Allocated" },
        { value: spent, color: "#1e293b", label: "Spent" },
        { value: remaining, color: "#22c55e", label: "Remaining" },
      ];
    }
  }, [dashboardData, isAdmin]);

  const totalFinancialValue = financialData.reduce((sum, d) => sum + d.value, 0);

  const activeSegment = financialData.find(
    (segment) => segment.label === hoveredSegment
  );
  
  const displayValue = activeSegment?.value ?? totalFinancialValue;
  const displayLabel = activeSegment?.label ?? "";
  const displayPercentage = activeSegment 
    ? Math.round((activeSegment.value / totalFinancialValue) * 100)
    : 100;

  // Get percentage changes
  const depositsChange = calculatePercentageChange('deposits');
  const spentChange = calculatePercentageChange('spent');
  const allocatedChange = calculatePercentageChange('allocated');

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Income/Deposits Card - WHITE */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 relative">
            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <MoreVertical className="w-4 h-4" />
            </button>
            <div className="mb-4">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <MdOutlineAttachMoney className="w-6 h-6 text-gray-600" />
              </div>
            </div>
            {isLoading ? (
              <>
                <SkeletonBox className="h-3 w-24 mb-2" />
                <SkeletonBox className="h-6 w-32 mb-2" />
                <SkeletonBox className="h-3 w-28" />
              </>
            ) : (
              <>
                <p className="text-xs text-gray-500 uppercase mb-1">
                  {isAdmin ? 'Total Deposits' : 'Total Allocated'}
                </p>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {isAdmin 
                    ? formatCurrency((dashboardData as AdminDashboardData)?.stats.total_deposits || 0)
                    : formatCurrency((dashboardData as UserDashboardData)?.stats.total_allocated || 0)
                  }
                </h3>
                <div className={`flex items-center gap-1 text-xs ${depositsChange.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {depositsChange.isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                  <span>{depositsChange.percentage}% vs last 30 days</span>
                </div>
              </>
            )}
          </div>

          {/* Total Expense/Spent Card - SECONDARY COLOR */}
          <div className="bg-secondary rounded-xl shadow-sm p-6 relative text-white">
            <button className="absolute top-4 right-4 text-white/80 hover:text-white">
              <MoreVertical className="w-4 h-4" />
            </button>
            <div className="mb-4">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-4">
                <RefreshCw className="w-6 h-6 text-white" />
              </div>
            </div>
            {isLoading ? (
              <>
                <SkeletonBox className="h-3 w-24 mb-2 bg-white/30" />
                <SkeletonBox className="h-6 w-32 mb-2 bg-white/30" />
                <SkeletonBox className="h-3 w-28 bg-white/30" />
              </>
            ) : (
              <>
                <p className="text-xs uppercase mb-1 text-white/90">
                  Total Expense
                </p>
                <h3 className="text-2xl font-bold mb-2">
                  {isAdmin 
                    ? formatCurrency((dashboardData as AdminDashboardData)?.stats.total_spent || 0)
                    : formatCurrency((dashboardData as UserDashboardData)?.stats.total_spent || 0)
                  }
                </h3>
                <div className="flex items-center gap-1 text-xs text-white/90">
                  {spentChange.isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                  <span>{spentChange.percentage}% vs last 30 days</span>
                </div>
              </>
            )}
          </div>

          {/* Total Savings/Remaining Card - WHITE */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 relative">
            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <MoreVertical className="w-4 h-4" />
            </button>
            <div className="mb-4">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <PieChart className="w-6 h-6 text-gray-600" />
              </div>
            </div>
            {isLoading ? (
              <>
                <SkeletonBox className="h-3 w-24 mb-2" />
                <SkeletonBox className="h-6 w-32 mb-2" />
                <SkeletonBox className="h-3 w-28" />
              </>
            ) : (
              <>
                <p className="text-xs text-gray-500 uppercase mb-1">
                  {isAdmin ? 'Total Allocated' : 'Remaining Balance'}
                </p>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {isAdmin 
                    ? formatCurrency((dashboardData as AdminDashboardData)?.stats.total_allocated || 0)
                    : formatCurrency((dashboardData as UserDashboardData)?.stats.remaining_balance || 0)
                  }
                </h3>
                <div className={`flex items-center gap-1 text-xs ${allocatedChange.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {allocatedChange.isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                  <span>{allocatedChange.percentage}% vs last 30 days</span>
                </div>
              </>
            )}
          </div>

          {/* Most Spending/Projects Card - WHITE */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 relative">
            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <MoreVertical className="w-4 h-4" />
            </button>
            <div className="mb-4">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <Building2 className="w-6 h-6 text-gray-600" />
              </div>
            </div>
            {isLoading ? (
              <>
                <SkeletonBox className="h-3 w-24 mb-2" />
                <SkeletonBox className="h-5 w-28 mb-2" />
                <SkeletonBox className="h-3 w-20" />
              </>
            ) : (
              <>
                <p className="text-xs text-gray-500 uppercase mb-1">
                  {isAdmin ? 'Total Projects' : 'My Projects'}
                </p>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {isAdmin 
                    ? (dashboardData as AdminDashboardData)?.stats.total_projects || 0
                    : (dashboardData as UserDashboardData)?.stats.my_projects || 0
                  }
                </h3>
                <p className="text-xs text-gray-500">
                  {isAdmin 
                    ? `${(dashboardData as AdminDashboardData)?.stats.active_projects || 0} active`
                    : 'Active projects'
                  }
                </p>
              </>
            )}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Monthly Spending Bar Chart */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xs font-bold text-gray-900">
                {isAdmin ? 'Monthly Spending by Project' : 'Top 5 Expense Source'}
              </h2>
              <button className="text-gray-400 hover:text-gray-600">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
            <div className="h-80">
              {isLoading ? (
                <SkeletonBox className="w-full h-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getChartData()} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis 
                      dataKey="month_name" 
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                      dataKey="total" 
                      fill="hsl(var(--secondary))"
                      radius={[8, 8, 0, 0]}
                      maxBarSize={60}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Recent Expenses / Allocations */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xs font-bold text-gray-900">
                {isAdmin ? 'Recent Allocations' : 'Recent Expenses'}
              </h2>
              <button className="text-gray-400 hover:text-gray-600">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <SkeletonBox className="w-1 h-12 rounded-full" />
                    <div className="flex-1">
                      <SkeletonBox className="h-3 w-24 mb-2" />
                      <SkeletonBox className="h-2 w-32" />
                    </div>
                    <SkeletonBox className="h-3 w-12" />
                  </div>
                ))
              ) : isAdmin ? (
                (dashboardData as AdminDashboardData)?.recent_allocations?.slice(0, 4).map((allocation, index) => (
                  <div key={allocation.id} className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-2 h-2 rounded-full bg-secondary"></div>
                      {index < 3 && <div className="w-0.5 h-8 bg-secondary mx-auto mt-1"></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 truncate">
                        {allocation.description}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(allocation.allocated_at)}
                      </p>
                    </div>
                    <div className="text-xs font-semibold text-gray-900">
                      {formatCurrency(parseFloat(allocation.amount))}
                    </div>
                  </div>
                ))
              ) : (
                (dashboardData as UserDashboardData)?.recent_expenses?.slice(0, 4).map((expense, index) => (
                  <div key={expense.id} className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-2 h-2 rounded-full bg-secondary"></div>
                      {index < 3 && <div className="w-0.5 h-8 bg-secondary mx-auto mt-1"></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 truncate">
                        {expense.description}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(expense.spent_at)}
                      </p>
                    </div>
                    <div className="text-xs font-semibold text-gray-900">
                      {formatCurrency(parseFloat(expense.amount))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Report Overview / Donut Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xs font-bold text-gray-900">Report Overview</h2>
              <button className="text-gray-400 hover:text-gray-600">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <SkeletonBox className="w-48 h-48 rounded-full" />
              </div>
            ) : (
              <div className="flex flex-col lg:flex-row items-center gap-8">
                <div className="relative">
                  <DonutChart
                    data={financialData}
                    size={180}
                    strokeWidth={20}
                    animationDuration={1}
                    animationDelayPerSegment={0.1}
                    highlightOnHover={true}
                    onSegmentHover={(segment) => setHoveredSegment(segment?.label || null)}
                    centerContent={
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={displayLabel || 'default'}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.2 }}
                          className="flex flex-col items-center justify-center text-center"
                        >
                          {displayLabel && (
                            <p className="text-xl font-bold text-gray-900">
                              {displayPercentage}%
                            </p>
                          )}
                        </motion.div>
                      </AnimatePresence>
                    }
                  />
                </div>
                <div className="space-y-4 flex-1">
                  {financialData.map((segment) => (
                    <div 
                      key={segment.label}
                      className={cn(
                        "flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer",
                        hoveredSegment === segment.label && "bg-gray-50"
                      )}
                      onMouseEnter={() => setHoveredSegment(segment.label)}
                      onMouseLeave={() => setHoveredSegment(null)}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: segment.color }}
                        />
                        <span className="text-xs font-medium text-gray-700">{segment.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-900">
                          {formatCurrency(segment.value)}
                        </span>
                        <ArrowUp className="w-3 h-3 text-green-600" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Expense Activity / Line Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xs font-bold text-gray-900">Expense Activity</h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-secondary"></div>
                  <span className="text-xs text-gray-500">Actual expense</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full border-2 border-secondary bg-transparent"></div>
                  <span className="text-xs text-gray-500">Projected expense</span>
                </div>
              </div>
            </div>
            <div className="h-64">
              {isLoading ? (
                <SkeletonBox className="w-full h-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={getChartData()} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="month_name" 
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey="total" 
                      stroke="hsl(var(--secondary))" 
                      strokeWidth={3}
                      dot={{ fill: 'hsl(var(--secondary))', r: 5 }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
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
  return <EnhancedDashboardContent loading={loading} onRefresh={onRefresh} />;
}