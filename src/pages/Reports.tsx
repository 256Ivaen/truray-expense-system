"use client";

import { useState, useEffect } from "react";
import { 
  FileText, 
  TrendingUp,
  Users,
  Folder,
  BarChart3,
  RefreshCw,
  Download
} from "lucide-react";
import { MdOutlineAttachMoney } from "react-icons/md";
import { get } from "../utils/service";
import { toast } from "sonner";
import { StatCard } from "../components/shared/StatCard";
import { DataTable } from "../components/shared/DataTable";
import { CalendarPicker } from "../components/shared/CalendarPicker";

interface ProjectSummary {
  id: string;
  project_code: string;
  name: string;
  total_deposits: string;
  total_allocated: string;
  total_spent: string;
  unallocated_balance: string;
  allocated_balance: string;
  created_at: string;
}

interface UserSpending {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  total_projects: number;
  total_allocated: string;
  total_spent: string;
  remaining_balance: string;
}

interface FinancialOverview {
  total_deposits: number;
  total_allocated: number;
  total_spent: number;
  unallocated_funds: number;
  allocated_balance: number;
  projects_by_status: Array<{ status: string; count: number }>;
  expenses_by_status: Array<{ status: string; count: number }>;
  monthly_spending: Array<{ month: string; total: string }>;
}

const ReportsPage = () => {
  const [activeTab, setActiveTab] = useState<'summary' | 'financial' | 'users' | 'projects'>('summary');
  const [loading, setLoading] = useState(false);
  const [projectSummary, setProjectSummary] = useState<ProjectSummary[]>([]);
  const [userSpending, setUserSpending] = useState<UserSpending[]>([]);
  const [financialOverview, setFinancialOverview] = useState<FinancialOverview | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // Get current user role
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

  const isAdmin = getCurrentUserRole() === 'admin';

  useEffect(() => {
    if (isAdmin) {
      fetchAllReports();
    }
  }, [isAdmin]);

  const fetchAllReports = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchProjectSummary(),
        fetchUserSpending(),
        fetchFinancialOverview(),
      ]);
    } catch (error: any) {
      console.error('Error fetching reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectSummary = async () => {
    try {
      const response = await get('/reports/project-summary');
      if (response && response.data) {
        setProjectSummary(response.data);
      }
    } catch (error: any) {
      console.error('Error fetching project summary:', error);
    }
  };

  const fetchUserSpending = async () => {
    try {
      const response = await get('/reports/user-spending');
      if (response && response.data) {
        setUserSpending(response.data);
      }
    } catch (error: any) {
      console.error('Error fetching user spending:', error);
    }
  };

  const fetchFinancialOverview = async () => {
    try {
      const response = await get('/reports/financial-overview');
      if (response && response.data) {
        setFinancialOverview(response.data);
      }
    } catch (error: any) {
      console.error('Error fetching financial overview:', error);
    }
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(num);
  };

  const handleExport = () => {
    toast.info('Export feature coming soon');
  };

  if (!isAdmin) {
    return (
      <div className="bg-gray-50 min-h-screen p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-sm text-gray-600">
              You don't have permission to view reports. Please contact an administrator.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Reports & Analytics</h1>
              <p className="text-sm text-gray-600 mt-1">Comprehensive system reports and insights</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchAllReports}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-secondary rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>

          {/* Date Filters */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                <CalendarPicker
                  value={startDate}
                  onChange={setStartDate}
                  placeholder="Select start date"
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                <CalendarPicker
                  value={endDate}
                  onChange={setEndDate}
                  placeholder="Select end date"
                />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                {[
                  { id: 'summary', label: 'Financial Overview', icon: BarChart3 },
                  { id: 'projects', label: 'Project Summary', icon: Folder },
                  { id: 'users', label: 'User Spending', icon: Users },
                  { id: 'financial', label: 'Financial Details', icon: MdOutlineAttachMoney },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`
                      flex items-center gap-2 px-6 py-3 text-xs font-medium border-b-2 transition-colors
                      ${
                        activeTab === tab.id
                          ? 'border-primary text-primary'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {/* Financial Overview Tab */}
              {activeTab === 'summary' && (
                <div className="space-y-6">
                  {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <StatCard key={i} title="" value="" subtitle="" icon={MdOutlineAttachMoney} loading />
                      ))}
                    </div>
                  ) : financialOverview ? (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <StatCard
                          title="Total Deposits"
                          value={formatCurrency(financialOverview.total_deposits)}
                          subtitle="All time deposits"
                          icon={MdOutlineAttachMoney}
                        />
                        <StatCard
                          title="Total Allocated"
                          value={formatCurrency(financialOverview.total_allocated)}
                          subtitle="Funds allocated to users"
                          icon={TrendingUp}
                        />
                        <StatCard
                          title="Total Spent"
                          value={formatCurrency(financialOverview.total_spent)}
                          subtitle="Approved expenses"
                          icon={FileText}
                        />
                        <StatCard
                          title="Unallocated Funds"
                          value={formatCurrency(financialOverview.unallocated_funds)}
                          subtitle="Available for allocation"
                          icon={BarChart3}
                        />
                        <StatCard
                          title="Allocated Balance"
                          value={formatCurrency(financialOverview.allocated_balance)}
                          subtitle="Remaining from allocations"
                          icon={MdOutlineAttachMoney}
                        />
                      </div>

                      {/* Projects by Status */}
                      <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4">Projects by Status</h3>
                        <div className="space-y-2">
                          {financialOverview.projects_by_status.map((item, index) => (
                            <div key={index} className="flex items-center justify-between">
                              <span className="text-xs text-gray-600 capitalize">{item.status}</span>
                              <span className="text-xs font-medium text-gray-900">{item.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Expenses by Status */}
                      <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4">Expenses by Status</h3>
                        <div className="space-y-2">
                          {financialOverview.expenses_by_status.map((item, index) => (
                            <div key={index} className="flex items-center justify-between">
                              <span className="text-xs text-gray-600 capitalize">{item.status}</span>
                              <span className="text-xs font-medium text-gray-900">{item.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-sm text-gray-500">No financial data available</p>
                    </div>
                  )}
                </div>
              )}

              {/* Project Summary Tab */}
              {activeTab === 'projects' && (
                <div>
                  {loading ? (
                    <div className="text-center py-12">
                      <div className="animate-pulse bg-gray-200 rounded h-4 w-32 mx-auto mb-2"></div>
                      <div className="animate-pulse bg-gray-200 rounded h-4 w-24 mx-auto"></div>
                    </div>
                  ) : (
                    <DataTable
                      data={projectSummary}
                      loading={loading}
                      type="projects"
                      showActions={false}
                    />
                  )}
                </div>
              )}

              {/* User Spending Tab */}
              {activeTab === 'users' && (
                <div>
                  {loading ? (
                    <div className="text-center py-12">
                      <div className="animate-pulse bg-gray-200 rounded h-4 w-32 mx-auto mb-2"></div>
                      <div className="animate-pulse bg-gray-200 rounded h-4 w-24 mx-auto"></div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto table-scrollbar">
                      <table className="min-w-full divide-y divide-gray-200 text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Projects</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Allocated</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Spent</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {userSpending.map((user) => (
                            <tr key={user.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div>
                                  <div className="text-xs font-medium text-gray-900">
                                    {user.first_name} {user.last_name}
                                  </div>
                                  <div className="text-xs text-gray-500">{user.email}</div>
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900">
                                {user.total_projects}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900">
                                {formatCurrency(user.total_allocated)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900">
                                {formatCurrency(user.total_spent)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900">
                                {formatCurrency(user.remaining_balance)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Financial Details Tab */}
              {activeTab === 'financial' && financialOverview && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-xs font-medium text-gray-700 mb-2">Monthly Spending</h4>
                      <div className="space-y-1 max-h-64 overflow-y-auto table-scrollbar">
                        {financialOverview.monthly_spending.map((item, index) => (
                          <div key={index} className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">{item.month}</span>
                            <span className="font-medium text-gray-900">{formatCurrency(item.total)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-xs font-medium text-gray-700 mb-2">Financial Summary</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600">Deposits</span>
                          <span className="font-medium text-gray-900">{formatCurrency(financialOverview.total_deposits)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600">Allocated</span>
                          <span className="font-medium text-gray-900">{formatCurrency(financialOverview.total_allocated)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600">Spent</span>
                          <span className="font-medium text-gray-900">{formatCurrency(financialOverview.total_spent)}</span>
                        </div>
                        <div className="pt-2 border-t border-gray-200">
                          <div className="flex justify-between text-xs">
                            <span className="font-medium text-gray-900">Net Balance</span>
                            <span className="font-bold text-gray-900">
                              {formatCurrency(financialOverview.total_deposits - financialOverview.total_spent)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;

