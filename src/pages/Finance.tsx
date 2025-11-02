"use client";

import { useState, useEffect } from "react";
import { 
  DollarSign, 
  Search, 
  Filter,
  Plus,
  TrendingUp,
  Wallet,
  CreditCard,
  PiggyBank,
  X,
  Calendar
} from "lucide-react";
import { get, post, put, del } from "../utils/service";
import { toast } from "sonner";
import { DataTable } from "../components/shared/DataTable";
import { DeleteModal } from "../components/shared/Modals";
import { StatCard } from "../components/shared/StatCard";

interface Finance {
  id: string;
  project_id: string;
  amount: string; // Changed from number to string to match API
  description?: string;
  deposited_at: string; // Changed from created_at to match API
  project_name?: string;
  project_code?: string;
}

interface Project {
  id: string;
  project_code: string;
  name: string;
  status: 'planning' | 'active' | 'completed' | 'cancelled' | 'closed';
}

interface CreateFinanceData {
  project_id: string;
  amount: number;
  description?: string;
}

interface UpdateFinanceData {
  project_id?: string;
  amount?: number;
  description?: string;
}

// Finance Modals Components
interface CreateFinanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateFinanceData) => void;
  projects: Project[];
  loading?: boolean;
}

function CreateFinanceModal({ isOpen, onClose, onSubmit, projects, loading = false }: CreateFinanceModalProps) {
  const [form, setForm] = useState<CreateFinanceData>({
    project_id: "",
    amount: 0,
    description: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  const handleClose = () => {
    setForm({
      project_id: "",
      amount: 0,
      description: ""
    });
    onClose();
  };

  return (
    <div 
      className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 ${isOpen ? 'block' : 'hidden'}`}
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xs font-semibold text-gray-900">Record New Deposit</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Project *
            </label>
            <select
              required
              value={form.project_id}
              onChange={(e) => setForm({ ...form, project_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-xs"
              disabled={loading}
            >
              <option value="">Select a project</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.project_code} - {project.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Amount (USD) *
            </label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
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

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-xs font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-primary text-black rounded-lg hover:bg-primary/90 transition-colors text-xs font-medium disabled:opacity-50"
            >
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
  projects: Project[];
  loading?: boolean;
}

function EditFinanceModal({ isOpen, onClose, onSubmit, finance, projects, loading = false }: EditFinanceModalProps) {
  const [form, setForm] = useState<UpdateFinanceData>({
    project_id: "",
    amount: 0,
    description: ""
  });

  useEffect(() => {
    if (finance) {
      setForm({
        project_id: finance.project_id,
        amount: parseFloat(finance.amount), // Convert string to number
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
      className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 ${isOpen ? 'block' : 'hidden'}`}
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xs font-semibold text-gray-900">Edit Deposit</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Project
            </label>
            <select
              value={form.project_id}
              onChange={(e) => setForm({ ...form, project_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-xs"
              disabled={loading}
            >
              <option value="">Select a project</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.project_code} - {project.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Amount (USD)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
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
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-xs font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-primary text-black rounded-lg hover:bg-primary/90 transition-colors text-xs font-medium disabled:opacity-50"
            >
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
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedFinance, setSelectedFinance] = useState<Finance | null>(null);

  useEffect(() => {
    fetchFinances();
    fetchProjects();
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

  const fetchProjects = async () => {
    try {
      const response = await get('/projects');
      if (response.success) {
        setProjects(response.data);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
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

  // Filter finances based on search and filters
  const filteredFinances = finances.filter(finance => {
    const matchesSearch = 
      finance.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      finance.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      finance.project_code?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesProject = projectFilter === "all" || finance.project_id === projectFilter;

    return matchesSearch && matchesProject;
  });

  // Calculate finance statistics - FIXED: Parse string amounts to numbers
  const financeStats = {
    totalDeposits: finances.reduce((sum, finance) => sum + parseFloat(finance.amount), 0),
    totalTransactions: finances.length,
    averageDeposit: finances.length > 0 
      ? finances.reduce((sum, finance) => sum + parseFloat(finance.amount), 0) / finances.length 
      : 0,
    thisMonthDeposits: finances.filter(f => {
      const financeDate = new Date(f.deposited_at); // FIXED: Use deposited_at instead of created_at
      const now = new Date();
      return financeDate.getMonth() === now.getMonth() && financeDate.getFullYear() === now.getFullYear();
    }).reduce((sum, finance) => sum + parseFloat(finance.amount), 0)
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Transform finances for DataTable - FIXED: Convert amount to number and map deposited_at to created_at
  const transformedFinances = filteredFinances.map(finance => ({
    ...finance,
    amount: parseFloat(finance.amount),
    created_at: finance.deposited_at
  }));

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Financial Management</h1>
              <p className="text-xs text-gray-600 mt-1">Manage project deposits and financial transactions</p>
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Deposits"
            value={formatCurrency(financeStats.totalDeposits)}
            subtitle="All time deposits"
            icon={DollarSign}
            loading={loading}
          />
          <StatCard
            title="Total Records"
            value={financeStats.totalTransactions}
            subtitle="Deposit entries"
            icon={CreditCard}
            loading={loading}
          />
          <StatCard
            title="Average Deposit"
            value={formatCurrency(financeStats.averageDeposit)}
            subtitle="Per deposit"
            icon={TrendingUp}
            loading={loading}
          />
          <StatCard
            title="This Month"
            value={formatCurrency(financeStats.thisMonthDeposits)}
            subtitle="Monthly deposits"
            icon={Calendar}
            loading={loading}
          />
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 my-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search deposits by description or project..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-xs"
                />
              </div>
            </div>

            {/* Project Filter */}
            <div>
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-xs"
              >
                <option value="all">All Projects</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.project_code} - {project.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Finances Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Table Header */}
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-gray-900">
                Deposit Records ({filteredFinances.length})
              </h2>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Filter className="h-4 w-4" />
                <span>Filtered</span>
              </div>
            </div>
          </div>

          {/* Data Table Component */}
          <DataTable
            data={transformedFinances}
            loading={loading}
            type="finances"
            onEdit={openEditModal}
            actionLoading={actionLoading}
          />
        </div>
      </div>

      {/* Create Finance Modal */}
      <CreateFinanceModal
        isOpen={showCreateModal}
        onClose={closeModals}
        onSubmit={handleCreateFinance}
        projects={projects}
        loading={actionLoading}
      />

      {/* Edit Finance Modal */}
      <EditFinanceModal
        isOpen={showEditModal}
        onClose={closeModals}
        onSubmit={handleEditFinance}
        finance={selectedFinance}
        projects={projects}
        loading={actionLoading}
      />

      {/* Delete Confirmation Modal */}
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