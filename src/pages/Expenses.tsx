"use client";

import { useState, useEffect } from "react";
import { 
  Receipt, 
  Search, 
  Filter,
  Plus,
  CheckCircle,
  XCircle,
  DollarSign,
  Clock,
  TrendingUp,
  X,
  Upload
} from "lucide-react";
import { get, post, put, del } from "../utils/service";
import { toast } from "sonner";
import { DataTable } from "../components/shared/DataTable";
import { DeleteModal } from "../components/shared/Modals";

interface Expense {
  id: string;
  project_id: string;
  amount: number;
  description: string;
  category?: string;
  status: 'pending' | 'approved' | 'rejected';
  receipt_image?: string;
  created_at: string;
  project_name?: string;
  project_code?: string;
}

interface Project {
  id: string;
  project_code: string;
  name: string;
  status: 'planning' | 'active' | 'completed' | 'cancelled' | 'closed';
}

interface CreateExpenseData {
  project_id: string;
  amount: number;
  description: string;
  category?: string;
  receipt_image?: File;
}

interface UpdateExpenseData {
  project_id?: string;
  amount?: number;
  description?: string;
  category?: string;
  status?: 'pending' | 'approved' | 'rejected';
}

// Expense Modals Components
interface CreateExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateExpenseData) => void;
  projects: Project[];
  loading?: boolean;
}

function CreateExpenseModal({ isOpen, onClose, onSubmit, projects, loading = false }: CreateExpenseModalProps) {
  const [form, setForm] = useState<CreateExpenseData>({
    project_id: "",
    amount: 0,
    description: "",
    category: "",
    receipt_image: undefined
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  const handleClose = () => {
    setForm({
      project_id: "",
      amount: 0,
      description: "",
      category: "",
      receipt_image: undefined
    });
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setForm({ ...form, receipt_image: file });
    }
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
          <h2 className="text-xs font-semibold text-gray-900">Record New Expense</h2>
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
              Description *
            </label>
            <textarea
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-xs"
              placeholder="Expense description..."
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-xs"
              disabled={loading}
            >
              <option value="">Select category</option>
              <option value="travel">Travel</option>
              <option value="supplies">Supplies</option>
              <option value="equipment">Equipment</option>
              <option value="services">Services</option>
              <option value="software">Software</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Receipt Image *
            </label>
            <input
              type="file"
              required
              accept="image/*"
              onChange={handleFileChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-xs"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Upload receipt or proof of expense
            </p>
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
              disabled={loading || !form.receipt_image}
              className="flex-1 px-4 py-2 bg-primary text-black rounded-lg hover:bg-primary/90 transition-colors text-xs font-medium disabled:opacity-50"
            >
              {loading ? "Recording..." : "Record Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface EditExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UpdateExpenseData) => void;
  expense: Expense | null;
  projects: Project[];
  loading?: boolean;
}

function EditExpenseModal({ isOpen, onClose, onSubmit, expense, projects, loading = false }: EditExpenseModalProps) {
  const [form, setForm] = useState<UpdateExpenseData>({
    project_id: "",
    amount: 0,
    description: "",
    category: "",
    status: "pending"
  });

  useEffect(() => {
    if (expense) {
      setForm({
        project_id: expense.project_id,
        amount: expense.amount,
        description: expense.description,
        category: expense.category || "",
        status: expense.status
      });
    }
  }, [expense]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  const handleClose = () => {
    onClose();
  };

  if (!expense) return null;

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
          <h2 className="text-xs font-semibold text-gray-900">Edit Expense</h2>
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

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-xs"
              disabled={loading}
            >
              <option value="">Select category</option>
              <option value="travel">Travel</option>
              <option value="supplies">Supplies</option>
              <option value="equipment">Equipment</option>
              <option value="services">Services</option>
              <option value="software">Software</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-xs"
              disabled={loading}
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
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
              {loading ? "Updating..." : "Update Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const ExpensesPage = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  useEffect(() => {
    fetchExpenses();
    fetchProjects();
  }, []);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const response = await get('/expenses');
      if (response.success) {
        setExpenses(response.data);
      } else {
        toast.error('Failed to fetch expenses');
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast.error('Error loading expenses');
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

  const handleCreateExpense = async (data: CreateExpenseData) => {
    setActionLoading(true);
    try {
      const formData = new FormData();
      formData.append('project_id', data.project_id);
      formData.append('amount', data.amount.toString());
      formData.append('description', data.description);
      if (data.category) formData.append('category', data.category);
      if (data.receipt_image) formData.append('receipt_image', data.receipt_image);

      const response = await post('/expenses', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (response.success) {
        toast.success('Expense recorded successfully');
        setShowCreateModal(false);
        fetchExpenses();
      } else {
        toast.error(response.message || 'Failed to record expense');
      }
    } catch (error: any) {
      console.error('Error creating expense:', error);
      toast.error(error.response?.data?.message || 'Error recording expense');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditExpense = async (data: UpdateExpenseData) => {
    if (!selectedExpense) return;
    
    setActionLoading(true);
    try {
      const response = await put(`/expenses/${selectedExpense.id}`, data);
      if (response.success) {
        toast.success('Expense updated successfully');
        setShowEditModal(false);
        setSelectedExpense(null);
        fetchExpenses();
      } else {
        toast.error(response.message || 'Failed to update expense');
      }
    } catch (error: any) {
      console.error('Error updating expense:', error);
      toast.error(error.response?.data?.message || 'Error updating expense');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteExpense = async () => {
    if (!selectedExpense) return;
    
    setActionLoading(true);
    try {
      const response = await del(`/expenses/${selectedExpense.id}`);
      if (response.success) {
        toast.success('Expense deleted successfully');
        setShowDeleteModal(false);
        setSelectedExpense(null);
        fetchExpenses();
      } else {
        toast.error(response.message || 'Failed to delete expense');
      }
    } catch (error: any) {
      console.error('Error deleting expense:', error);
      toast.error(error.response?.data?.message || 'Error deleting expense');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveExpense = async (expenseId: string) => {
    setActionLoading(true);
    try {
      const response = await post(`/expenses/${expenseId}/approve`);
      if (response.success) {
        toast.success('Expense approved successfully');
        fetchExpenses();
      } else {
        toast.error(response.message || 'Failed to approve expense');
      }
    } catch (error: any) {
      console.error('Error approving expense:', error);
      toast.error(error.response?.data?.message || 'Error approving expense');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectExpense = async (expenseId: string) => {
    setActionLoading(true);
    try {
      const response = await post(`/expenses/${expenseId}/reject`);
      if (response.success) {
        toast.success('Expense rejected successfully');
        fetchExpenses();
      } else {
        toast.error(response.message || 'Failed to reject expense');
      }
    } catch (error: any) {
      console.error('Error rejecting expense:', error);
      toast.error(error.response?.data?.message || 'Error rejecting expense');
    } finally {
      setActionLoading(false);
    }
  };

  const openCreateModal = () => {
    setShowCreateModal(true);
  };

  const openEditModal = (expense: Expense) => {
    setSelectedExpense(expense);
    setShowEditModal(true);
  };

  const openDeleteModal = (expense: Expense) => {
    setSelectedExpense(expense);
    setShowDeleteModal(true);
  };

  const closeModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    setSelectedExpense(null);
  };

  // Filter expenses based on search and filters
  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = 
      expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (expense.category && expense.category.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || expense.status === statusFilter;
    const matchesProject = projectFilter === "all" || expense.project_id === projectFilter;

    return matchesSearch && matchesStatus && matchesProject;
  });

  // Calculate expense statistics
  const expenseStats = {
    totalExpenses: expenses.reduce((sum, expense) => sum + expense.amount, 0),
    totalRecords: expenses.length,
    pendingExpenses: expenses.filter(e => e.status === 'pending').length,
    approvedExpenses: expenses.filter(e => e.status === 'approved').length,
    averageExpense: expenses.length > 0 ? expenses.reduce((sum, expense) => sum + expense.amount, 0) / expenses.length : 0
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Expense Management</h1>
              <p className="text-xs text-gray-600 mt-1">Track and manage project expenses</p>
            </div>
            <button
              onClick={openCreateModal}
              className="mt-4 sm:mt-0 flex items-center gap-2 px-4 py-2 bg-primary text-black rounded-lg hover:bg-primary/90 transition-colors text-xs font-medium"
            >
              <Plus className="h-4 w-4" />
              New Expense
            </button>
          </div>
        </div>

        {/* Expense Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Total Expenses</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(expenseStats.totalExpenses)}</p>
              </div>
              <Receipt className="h-8 w-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Total Records</p>
                <p className="text-2xl font-bold text-gray-900">{expenseStats.totalRecords}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{expenseStats.pendingExpenses}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Average</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(expenseStats.averageExpense)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search expenses by description, project, or category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-xs"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-xs"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
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

        {/* Expenses Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Table Header */}
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-gray-900">
                Expenses ({filteredExpenses.length})
              </h2>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Filter className="h-4 w-4" />
                <span>Filtered</span>
              </div>
            </div>
          </div>

          {/* Data Table Component */}
          <DataTable
            data={filteredExpenses}
            loading={loading}
            type="expenses"
            onEdit={openEditModal}
            onDelete={openDeleteModal}
            onApprove={handleApproveExpense}
            onReject={handleRejectExpense}
          />
        </div>
      </div>

      {/* Create Expense Modal */}
      <CreateExpenseModal
        isOpen={showCreateModal}
        onClose={closeModals}
        onSubmit={handleCreateExpense}
        projects={projects}
        loading={actionLoading}
      />

      {/* Edit Expense Modal */}
      <EditExpenseModal
        isOpen={showEditModal}
        onClose={closeModals}
        onSubmit={handleEditExpense}
        expense={selectedExpense}
        projects={projects}
        loading={actionLoading}
      />

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={showDeleteModal}
        onClose={closeModals}
        onConfirm={handleDeleteExpense}
        title="Delete Expense"
        description="Are you sure you want to delete this expense? This action cannot be undone."
        loading={actionLoading}
      />
    </div>
  );
};

export default ExpensesPage;