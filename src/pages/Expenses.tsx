"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Receipt, 
  Search, 
  Filter,
  Plus,
  Clock,
  X,
  Upload,
  Loader2,
} from "lucide-react";
import { MdOutlineAttachMoney } from "react-icons/md";
import { get, post, put, del, upload } from "../utils/service";
import { toast } from "sonner";
import { DataTable } from "../components/shared/DataTable";
import { DeleteModal } from "../components/shared/Modals";
import { StatCard } from "../components/shared/StatCard";

interface Expense {
  id: string;
  project_id: string;
  user_id: string;
  allocation_id: string | null;
  amount: string;
  description: string;
  category?: string;
  receipt_image: string | null;
  spent_at: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by: string | null;
  approved_at: string | null;
  deleted_at: string | null;
  project_code?: string;
  project_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

interface Project {
  id: string;
  project_code: string;
  name: string;
  status: 'planning' | 'active' | 'completed' | 'cancelled' | 'closed';
  expense_types?: Array<{
    id: string;
    name: string;
  }>;
}

interface CreateExpenseData {
  project_id: string;
  amount: number;
  description: string;
  category: string;
  receipt_image?: string;
}

interface UpdateExpenseData {
  project_id?: string;
  amount?: number;
  description?: string;
  category?: string;
  status?: 'pending' | 'approved' | 'rejected';
}

interface ExpensesResponse {
  success: boolean;
  message: string;
  data: Expense[];
  pagination: any;
  allocation_summary: {
    total_allocated: string;
    total_expenses: string;
    allocation_balance: string;
  };
  expense_summary?: {
    total_expenses: number;
    total_approved: string;
    total_pending: string;
    total_rejected: string;
    total_amount: string;
    average_amount: string;
    highest_expense: string;
    lowest_expense: string;
  };
}

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

const getCurrentUserId = () => {
  try {
    const userStr = localStorage.getItem('truray_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.id;
    }
  } catch (error) {
    console.error('Error getting user ID:', error);
  }
  return null;
};

const SkeletonBox = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`}></div>
);

const SearchSkeleton = () => (
  <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <div className="lg:col-span-2">
        <SkeletonBox className="h-10 w-full rounded-lg" />
      </div>
      <div>
        <SkeletonBox className="h-10 w-full rounded-lg" />
      </div>
      <div>
        <SkeletonBox className="h-10 w-full rounded-lg" />
      </div>
    </div>
  </div>
);

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
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  useEffect(() => {
    if (form.project_id) {
      const project = projects.find(p => p.id === form.project_id);
      setSelectedProject(project || null);
      if (project) {
        setForm(prev => ({ ...prev, category: "" }));
      }
    } else {
      setSelectedProject(null);
    }
  }, [form.project_id, projects]);

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await upload('/upload', formData);
    
    if (response.success) {
      return response.message.url;
    } else {
      throw new Error(response.message || 'Failed to upload image');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.category) {
      toast.error('Please select an expense type');
      return;
    }

    if (!selectedFile) {
      toast.error('Please upload a receipt image');
      return;
    }

    setUploadingImage(true);
    
    try {
      const imageUrl = await uploadImage(selectedFile);
      
      const expenseData = {
        project_id: form.project_id,
        amount: form.amount,
        description: form.description,
        category: form.category,
        receipt_image: imageUrl
      };
      
      onSubmit(expenseData);
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error(error.message || 'Failed to upload receipt image');
      setUploadingImage(false);
    }
  };

  const handleClose = () => {
    setForm({
      project_id: "",
      amount: 0,
      description: "",
      category: "",
    });
    setSelectedFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    setSelectedProject(null);
    setUploadingImage(false);
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const removeImage = () => {
    setSelectedFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
  };

  const isSubmitDisabled = loading || uploadingImage || !selectedProject || 
    (selectedProject.expense_types && selectedProject.expense_types.length > 0 && !form.category) || 
    !selectedFile;

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
          <h2 className="text-lg font-semibold text-gray-900">Record New Expense</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
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
              disabled={loading || uploadingImage}
            >
              <option value="">Select a project</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.project_code} - {project.name}
                </option>
              ))}
            </select>
          </div>

          {selectedProject && selectedProject.expense_types && selectedProject.expense_types.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Expense Type *
              </label>
              <select
                required
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-xs"
                disabled={loading || uploadingImage}
              >
                <option value="">Select expense type</option>
                {selectedProject.expense_types.map(type => (
                  <option key={type.id} value={type.name}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedProject && (!selectedProject.expense_types || selectedProject.expense_types.length === 0) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-xs text-yellow-800">
                <strong>Note:</strong> This project has no expense types defined. Please contact admin to add expense types.
              </p>
            </div>
          )}

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
              disabled={loading || uploadingImage}
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
              disabled={loading || uploadingImage}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Receipt Image *
            </label>
            
            {!selectedFile ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="receipt-image"
                  disabled={loading || uploadingImage}
                />
                <label 
                  htmlFor="receipt-image" 
                  className="cursor-pointer block"
                >
                  <Upload className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                  <span className="text-xs text-gray-600 font-medium">
                    Click to upload receipt
                  </span>
                  <p className="text-xs text-gray-500 mt-1">
                    Upload receipt or proof of expense (required)
                  </p>
                </label>
              </div>
            ) : (
              <div className="border border-gray-300 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-gray-600 font-medium">
                    {selectedFile.name}
                  </span>
                  <button
                    type="button"
                    onClick={removeImage}
                    className="text-red-500 hover:text-red-700 text-xs font-medium"
                    disabled={loading || uploadingImage}
                  >
                    Remove
                  </button>
                </div>
                
                {imagePreview && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-2">Preview:</p>
                    <img 
                      src={imagePreview} 
                      alt="Receipt preview" 
                      className="w-full max-w-xs mx-auto rounded-lg border border-gray-200 max-h-48 object-contain"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading || uploadingImage}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="flex-1 px-4 py-2 bg-primary text-secondary rounded-lg hover:bg-primary/90 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {(loading || uploadingImage) && <Loader2 className="w-4 h-4 animate-spin" />}
              {uploadingImage ? "Uploading..." : loading ? "Recording..." : "Record Expense"}
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

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  useEffect(() => {
    if (expense) {
      setForm({
        project_id: expense.project_id,
        amount: parseFloat(expense.amount),
        description: expense.description,
        category: expense.category || "",
        status: expense.status
      });
      
      const project = projects.find(p => p.id === expense.project_id);
      setSelectedProject(project || null);
    }
  }, [expense, projects]);

  useEffect(() => {
    if (form.project_id) {
      const project = projects.find(p => p.id === form.project_id);
      setSelectedProject(project || null);
    }
  }, [form.project_id, projects]);

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
      className={`fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50 ${isOpen ? 'block' : 'hidden'}`}
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Edit Expense</h2>
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

          {selectedProject && selectedProject.expense_types && selectedProject.expense_types.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Expense Type
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-xs"
                disabled={loading}
              >
                <option value="">Select expense type</option>
                {selectedProject.expense_types.map(type => (
                  <option key={type.id} value={type.name}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
          )}

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
              {loading ? "Updating..." : "Update Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const ExpensesPage = () => {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [allocationSummary, setAllocationSummary] = useState({
    total_allocated: "0.00",
    total_expenses: "0.00",
    allocation_balance: "0.00"
  });

  const currentUserRole = getCurrentUserRole();
  const currentUserId = getCurrentUserId();

  useEffect(() => {
    fetchExpenses();
    fetchProjects();
  }, []);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const response = await get('/expenses') as ExpensesResponse;
      if (response.success) {
        setExpenses(response.data);
        if (response.allocation_summary) {
          setAllocationSummary(response.allocation_summary);
        }
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
        const projectsWithTypes = await Promise.all(
          response.data.map(async (project: Project) => {
            try {
              const detailsResponse = await get(`/projects/${project.id}`);
              if (detailsResponse.success && detailsResponse.data.expense_types) {
                return {
                  ...project,
                  expense_types: detailsResponse.data.expense_types
                };
              }
            } catch (error) {
              console.error(`Error fetching expense types for project ${project.id}:`, error);
            }
            return project;
          })
        );
        setProjects(projectsWithTypes);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const handleCreateExpense = async (data: CreateExpenseData) => {
    setActionLoading(true);
    try {
      const response = await post('/expenses', data);
      
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

  const handleViewExpense = (expense: Expense) => {
    navigate(`/expenses/${expense.id}`);
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

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = 
      expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (expense.category && expense.category.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || expense.status === statusFilter;
    const matchesProject = projectFilter === "all" || expense.project_id === projectFilter;

    return matchesSearch && matchesStatus && matchesProject;
  });

  const formatCurrency = (amount: string) => {
    const numAmount = parseFloat(amount);
    return `UGX ${numAmount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`;
  };

  const transformedExpenses = filteredExpenses.map(expense => ({
    ...expense,
    amount: parseFloat(expense.amount),
    created_at: expense.spent_at
  }));

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            {loading ? (
              <>
                <SkeletonBox className="h-8 w-48 mb-1" />
                <SkeletonBox className="h-4 w-32" />
              </>
            ) : (
              <>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  Expense Management
                </h1>
                <p className="text-xs text-gray-600 mt-1">
                  Track and manage project expenses
                </p>
              </>
            )}
          </div>
          {loading ? (
            <SkeletonBox className="h-10 w-32 rounded-lg" />
          ) : (
            <button
              onClick={openCreateModal}
              className="mt-4 sm:mt-0 flex items-center gap-2 px-4 py-2 bg-primary text-black rounded-lg hover:bg-primary/90 transition-colors text-xs font-medium"
            >
              <Plus className="h-4 w-4" />
              New Expense
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            title="Total Allocated"
            value={formatCurrency(allocationSummary.total_allocated)}
            subtitle="Total budget allocated"
            icon={Receipt}
            loading={loading}
          />
          <StatCard
            title="Total Expenses"
            value={formatCurrency(allocationSummary.total_expenses)}
            subtitle="Amount spent so far"
            icon={Clock}
            loading={loading}
          />
          <StatCard
            title="Balance"
            value={formatCurrency(allocationSummary.allocation_balance)}
            subtitle="Remaining allocation"
            icon={MdOutlineAttachMoney}
            loading={loading}
          />
        </div>

        {loading ? (
          <SearchSkeleton />
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
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
        )}

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gray-50">
            {loading ? (
              <div className="flex items-center justify-between">
                <SkeletonBox className="h-4 w-32" />
                <SkeletonBox className="h-4 w-16" />
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold text-gray-900">
                  Expenses ({filteredExpenses.length})
                </h2>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Filter className="h-4 w-4" />
                  <span>Filtered</span>
                </div>
              </div>
            )}
          </div>

          <DataTable
            data={transformedExpenses}
            loading={loading}
            type="expenses"
            onEdit={openEditModal}
            onDelete={openDeleteModal}
            onApprove={handleApproveExpense}
            onReject={handleRejectExpense}
            onView={handleViewExpense}
            currentUserRole={currentUserRole}
            currentUserId={currentUserId}
            actionLoading={actionLoading}
          />
        </div>
      </div>

      <CreateExpenseModal
        isOpen={showCreateModal}
        onClose={closeModals}
        onSubmit={handleCreateExpense}
        projects={projects}
        loading={actionLoading}
      />

      <EditExpenseModal
        isOpen={showEditModal}
        onClose={closeModals}
        onSubmit={handleEditExpense}
        expense={selectedExpense}
        projects={projects}
        loading={actionLoading}
      />

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