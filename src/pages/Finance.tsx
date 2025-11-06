"use client";

import { useState, useEffect } from "react";
import { 
  Search, 
  Filter,
  Plus,
  TrendingUp,
  X,
  Calendar,
  ChevronDown,
  Loader2
} from "lucide-react";
import { MdOutlineAttachMoney } from "react-icons/md";
import { get, post, put, del } from "../utils/service";
import { toast } from "sonner";
import { DataTable } from "../components/shared/DataTable";
import { DeleteModal } from "../components/shared/Modals";
import { StatCard } from "../components/shared/StatCard";

interface Finance {
  id: string;
  amount: string;
  description?: string;
  deposited_at: string;
  deposited_by?: string;
  status?: string;
}

interface CreateFinanceData {
  amount: number;
  description?: string;
}

interface UpdateFinanceData {
  amount?: number;
  description?: string;
}

interface SystemBalance {
  total_deposits: string;
  total_allocated: string;
  available_balance: string;
  this_month_deposits: string;
}

interface CreateFinanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateFinanceData) => void;
  loading?: boolean;
}

function CreateFinanceModal({ isOpen, onClose, onSubmit, loading = false }: CreateFinanceModalProps) {
  const [form, setForm] = useState<CreateFinanceData>({
    amount: 0,
    description: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  const handleClose = () => {
    setForm({
      amount: 0,
      description: ""
    });
    onClose();
  };

  return (
    <div 
      className={`fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50 ${isOpen ? 'block' : 'hidden'}`}
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Record New Deposit</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Amount (UGX) *
            </label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={form.amount === 0 ? '' : form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-xs"
              placeholder="0.00"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-xs"
              placeholder="Deposit description..."
              disabled={loading}
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>Note:</strong> This deposit will be added to the system. Use the Allocations page to assign funds to projects.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-primary text-secondary rounded-lg hover:bg-primary/90 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Processing..." : "Record Deposit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface EditFinanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UpdateFinanceData) => void;
  finance: Finance | null;
  loading?: boolean;
}

function EditFinanceModal({ isOpen, onClose, onSubmit, finance, loading = false }: EditFinanceModalProps) {
  const [form, setForm] = useState<UpdateFinanceData>({
    amount: 0,
    description: ""
  });

  useEffect(() => {
    if (finance) {
      setForm({
        amount: parseFloat(finance.amount),
        description: finance.description || ""
      });
    }
  }, [finance]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  const handleClose = () => {
    onClose();
  };

  if (!finance) return null;

  return (
    <div 
      className={`fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50 ${isOpen ? 'block' : 'hidden'}`}
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Edit Deposit</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Amount (UGX)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.amount === 0 ? '' : form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-xs"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-xs"
              disabled={loading}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-primary text-secondary rounded-lg hover:bg-primary/90 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Updating..." : "Update Deposit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const FinancesPage = () => {
  const [finances, setFinances] = useState<Finance[]>([]);
  const [systemBalance, setSystemBalance] = useState<SystemBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'week' | 'month' | 'year'>('all');
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedFinance, setSelectedFinance] = useState<Finance | null>(null);

  useEffect(() => {
    fetchFinances();
    fetchSystemBalance();
  }, []);

  const fetchFinances = async () => {
    setLoading(true);
    try {
      const response = await get('/finances');
      if (response.success) {
        setFinances(response.data);
      } else {
        toast.error('Failed to fetch finances');
      }
    } catch (error) {
      console.error('Error fetching finances:', error);
      toast.error('Error loading finances');
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemBalance = async () => {
    setBalanceLoading(true);
    try {
      const response = await get('/finances/system-balance');
      if (response.success) {
        setSystemBalance(response.data);
      } else {
        toast.error('Failed to fetch system balance');
      }
    } catch (error) {
      console.error('Error fetching system balance:', error);
      toast.error('Error loading system balance');
    } finally {
      setBalanceLoading(false);
    }
  };

  const handleCreateFinance = async (data: CreateFinanceData) => {
    setActionLoading(true);
    try {
      const response = await post('/finances', data);
      if (response.success) {
        toast.success('Deposit recorded successfully');
        setShowCreateModal(false);
        fetchFinances();
        fetchSystemBalance();
      } else {
        toast.error(response.message || 'Failed to record deposit');
      }
    } catch (error: any) {
      console.error('Error creating deposit:', error);
      toast.error(error.response?.data?.message || 'Error recording deposit');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditFinance = async (data: UpdateFinanceData) => {
    if (!selectedFinance) return;
    
    setActionLoading(true);
    try {
      const response = await put(`/finances/${selectedFinance.id}`, data);
      if (response.success) {
        toast.success('Deposit updated successfully');
        setShowEditModal(false);
        setSelectedFinance(null);
        fetchFinances();
        fetchSystemBalance();
      } else {
        toast.error(response.message || 'Failed to update deposit');
      }
    } catch (error: any) {
      console.error('Error updating deposit:', error);
      toast.error(error.response?.data?.message || 'Error updating deposit');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteFinance = async () => {
    if (!selectedFinance) return;
    
    setActionLoading(true);
    try {
      const response = await del(`/finances/${selectedFinance.id}`);
      if (response.success) {
        toast.success('Deposit deleted successfully');
        setShowDeleteModal(false);
        setSelectedFinance(null);
        fetchFinances();
        fetchSystemBalance();
      } else {
        toast.error(response.message || 'Failed to delete deposit');
      }
    } catch (error: any) {
      console.error('Error deleting deposit:', error);
      toast.error(error.response?.data?.message || 'Error deleting deposit');
    } finally {
      setActionLoading(false);
    }
  };

  const openCreateModal = () => {
    setShowCreateModal(true);
  };

  const openEditModal = (finance: Finance) => {
    setSelectedFinance(finance);
    setShowEditModal(true);
  };

  const openDeleteModal = (finance: Finance) => {
    setSelectedFinance(finance);
    setShowDeleteModal(true);
  };

  const closeModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    setSelectedFinance(null);
  };

  const getFilteredFinancesByPeriod = () => {
    const now = new Date();
    return finances.filter(finance => {
      const financeDate = new Date(finance.deposited_at);
      
      switch (selectedPeriod) {
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return financeDate >= weekAgo;
        case 'month':
          return financeDate.getMonth() === now.getMonth() && 
                 financeDate.getFullYear() === now.getFullYear();
        case 'year':
          return financeDate.getFullYear() === now.getFullYear();
        case 'all':
        default:
          return true;
      }
    });
  };

  const filteredFinances = getFilteredFinancesByPeriod().filter(finance => {
    const matchesSearch = 
      finance.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      finance.amount?.toString().includes(searchTerm);

    return matchesSearch;
  });

  const periodTotal = getFilteredFinancesByPeriod().reduce(
    (sum, finance) => sum + parseFloat(finance.amount), 
    0
  );

  const thisMonthDeposits = finances.filter(f => {
    const financeDate = new Date(f.deposited_at);
    const now = new Date();
    return financeDate.getMonth() === now.getMonth() && financeDate.getFullYear() === now.getFullYear();
  }).reduce((sum, finance) => sum + parseFloat(finance.amount), 0);

  const formatCurrency = (amount: number) => {
    return `UGX ${amount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`;
  };

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      case 'year': return 'This Year';
      case 'all': return 'All Time';
      default: return 'All Time';
    }
  };

  const transformedFinances = filteredFinances.map(finance => ({
    ...finance,
    amount: parseFloat(finance.amount),
    created_at: finance.deposited_at
  }));

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Financial Management</h1>
              <p className="text-xs text-gray-600 mt-1">Manage system deposits. Use Allocations to assign to projects.</p>
            </div>
            <button
              onClick={openCreateModal}
              className="mt-4 sm:mt-0 flex items-center gap-2 px-4 py-2 bg-primary text-black rounded-lg hover:bg-primary/90 transition-colors text-xs font-medium"
            >
              <Plus className="h-4 w-4" />
              New Deposit
            </button>
          </div>
        </div>

        <div className="mb-6">
          <div 
            className="relative h-56 w-full bg-secondary rounded-2xl p-6 shadow-2xl text-white flex flex-col justify-between overflow-hidden"
          >
            <div className="absolute inset-0 bg-black/40 rounded-2xl" />
            
            <div className="relative z-10 flex justify-between items-start">
              <div className="h-10 w-14 bg-yellow-400 rounded-sm" />
              <div className="relative">
                <button
                  onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors text-xs font-medium backdrop-blur-sm"
                >
                  <Calendar className="h-3 w-3" />
                  <span>{getPeriodLabel()}</span>
                  <ChevronDown className="h-3 w-3" />
                </button>
                
                {showPeriodDropdown && (
                  <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                    {(['all', 'week', 'month', 'year'] as const).map((period) => (
                      <button
                        key={period}
                        onClick={() => {
                          setSelectedPeriod(period);
                          setShowPeriodDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-xs hover:bg-gray-50 transition-colors text-gray-900 ${
                          selectedPeriod === period ? 'bg-gray-100 font-medium' : ''
                        }`}
                      >
                        {period === 'all' && 'All Time'}
                        {period === 'week' && 'This Week'}
                        {period === 'month' && 'This Month'}
                        {period === 'year' && 'This Year'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="relative z-10">
              <p className="text-xs font-medium tracking-wider mb-2">TOTAL DEPOSITS</p>
              <p className="text-3xl sm:text-4xl tracking-wide font-semibold mb-4">
                {balanceLoading ? (
                  <div className="h-8 w-36 bg-gray-300 rounded-lg animate-pulse"></div>
                ) : (
                  formatCurrency(periodTotal)
                )}
              </p>
              <div className="flex justify-between text-xs">
                <span>TruRay Expense System</span>
                <span>{new Date().toLocaleDateString('en-US', { month: '2-digit', year: '2-digit' })}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <StatCard
            title="Available Balance"
            value={systemBalance ? formatCurrency(parseFloat(systemBalance.available_balance)) : formatCurrency(0)}
            subtitle="Unallocated funds"
            icon={MdOutlineAttachMoney}
            loading={balanceLoading}
          />
          <StatCard
            title="This Month"
            value={formatCurrency(thisMonthDeposits)}
            subtitle="Monthly deposits"
            icon={Calendar}
            loading={loading}
          />
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search deposits by description or amount..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-xs"
            />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-gray-900">
                Deposit Records ({filteredFinances.length})
              </h2>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Filter className="h-4 w-4" />
                <span>{getPeriodLabel()}</span>
              </div>
            </div>
          </div>

          <DataTable
            data={transformedFinances}
            loading={loading}
            type="finances"
            onEdit={openEditModal}
            onDelete={openDeleteModal}
            actionLoading={actionLoading}
          />
        </div>
      </div>

      <CreateFinanceModal
        isOpen={showCreateModal}
        onClose={closeModals}
        onSubmit={handleCreateFinance}
        loading={actionLoading}
      />

      <EditFinanceModal
        isOpen={showEditModal}
        onClose={closeModals}
        onSubmit={handleEditFinance}
        finance={selectedFinance}
        loading={actionLoading}
      />

      <DeleteModal
        isOpen={showDeleteModal}
        onClose={closeModals}
        onConfirm={handleDeleteFinance}
        title="Delete Deposit Record"
        description="Are you sure you want to delete this deposit record? This action cannot be undone."
        loading={actionLoading}
      />
    </div>
  );
};

export default FinancesPage;