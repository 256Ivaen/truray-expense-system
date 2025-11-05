"use client";

import { useState, useEffect } from "react";
import { 
  Search, 
  Filter,
  Plus,
  Wallet,
  CreditCard,
  X,
  Upload
} from "lucide-react";
import { get, post, put, del } from "../utils/service";
import { toast } from "sonner";
import { DataTable } from "../components/shared/DataTable";
import { DeleteModal } from "../components/shared/Modals";
import { StatCard } from "../components/shared/StatCard";
import { TbSubtask } from "react-icons/tb";
import { MdOutlineAttachMoney } from "react-icons/md";

interface Allocation {
  id: string;
  project_id: string;
  user_id: string;
  amount: string;
  description?: string;
  status: string;
  proof_image?: string;
  allocated_at: string;
  project_code?: string;
  project_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

interface ProjectBalance {
  id: string;
  project_code: string;
  name: string;
  status: string;
  total_deposits: string;
  total_allocated: string;
  total_spent: string;
  unallocated_balance: string;
  allocated_balance: string;
  remaining_balance: number;
}

interface Project {
  id: string;
  project_code: string;
  name: string;
  description: string;
  status: 'planning' | 'active' | 'completed' | 'cancelled' | 'closed';
  balance?: ProjectBalance;
}

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

interface CreateAllocationData {
  project_id: string;
  user_id: string;
  amount: number;
  description?: string;
  proof_image?: File;
}

interface UpdateAllocationData {
  project_id?: string;
  user_id?: string;
  amount?: number;
  description?: string;
  status?: string;
}

// Get current user info from localStorage
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

// Permission checks
const canCreateAllocations = (userRole: string) => {
  return ['admin', 'finance_manager'].includes(userRole);
};

const canEditAllocations = (userRole: string) => {
  return ['admin', 'finance_manager'].includes(userRole);
};

const canDeleteAllocations = (userRole: string) => {
  return ['admin'].includes(userRole);
};

const canViewAllData = (userRole: string) => {
  return ['admin', 'finance_manager'].includes(userRole);
};

// Allocation Modals Components
interface CreateAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateAllocationData) => void;
  projects: Project[];
  users: User[];
  loading?: boolean;
}

function CreateAllocationModal({ isOpen, onClose, onSubmit, projects, users, loading = false }: CreateAllocationModalProps) {
  const [form, setForm] = useState<CreateAllocationData>({
    project_id: "",
    user_id: "",
    amount: 0,
    description: "",
    proof_image: undefined
  });

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  const handleClose = () => {
    setForm({
      project_id: "",
      user_id: "",
      amount: 0,
      description: "",
      proof_image: undefined
    });
    setSelectedProject(null);
    onClose();
  };

  const handleProjectChange = (projectId: string) => {
    setForm({ ...form, project_id: projectId });
    const project = projects.find(p => p.id === projectId);
    setSelectedProject(project || null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setForm({ ...form, proof_image: file });
    }
  };

  const availableBalance = selectedProject?.balance?.unallocated_balance 
    ? parseFloat(selectedProject.balance.unallocated_balance) 
    : 0;

  return (
    <div 
      className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto transform transition-transform duration-300 scale-100 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">Create New Allocation</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project *
            </label>
            <select
              required
              value={form.project_id}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm transition-all duration-200 hover:border-gray-400"
              disabled={loading}
            >
              <option value="">Select a project</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.project_code} - {project.name}
                </option>
              ))}
            </select>
            {selectedProject && (
              <p className="text-sm text-gray-500 mt-2">
                Available balance: <span className="font-semibold">${availableBalance.toLocaleString()}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              User *
            </label>
            <select
              required
              value={form.user_id}
              onChange={(e) => setForm({ ...form, user_id: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm transition-all duration-200 hover:border-gray-400"
              disabled={loading}
            >
              <option value="">Select a user</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.first_name} {user.last_name} ({user.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount (USD) *
            </label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              max={availableBalance}
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm transition-all duration-200 hover:border-gray-400"
              placeholder="0.00"
              disabled={loading}
            />
            {form.amount > availableBalance && (
              <p className="text-sm text-red-600 mt-2 font-medium">
                Amount exceeds available balance
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm transition-all duration-200 hover:border-gray-400 resize-none"
              placeholder="Allocation description..."
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Proof Image *
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors duration-200">
              <input
                type="file"
                required
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="proof-image"
                disabled={loading}
              />
              <label 
                htmlFor="proof-image" 
                className="cursor-pointer block"
              >
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <span className="text-sm text-gray-600 font-medium">
                  {form.proof_image ? form.proof_image.name : 'Click to upload proof image'}
                </span>
                <p className="text-xs text-gray-500 mt-1">
                  Upload proof of allocation (receipt, transfer confirmation, etc.)
                </p>
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || form.amount > availableBalance || !form.proof_image}
              className="flex-1 px-6 py-3 bg-primary text-black rounded-lg hover:bg-primary/90 transition-all duration-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transform hover:scale-105"
            >
              {loading ? "Creating..." : "Create Allocation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface EditAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UpdateAllocationData) => void;
  allocation: Allocation | null;
  projects: Project[];
  users: User[];
  loading?: boolean;
}

function EditAllocationModal({ isOpen, onClose, onSubmit, allocation, projects, users, loading = false }: EditAllocationModalProps) {
  const [form, setForm] = useState<UpdateAllocationData>({
    project_id: "",
    user_id: "",
    amount: 0,
    description: "",
    status: "approved"
  });

  useEffect(() => {
    if (allocation) {
      setForm({
        project_id: allocation.project_id,
        user_id: allocation.user_id,
        amount: parseFloat(allocation.amount),
        description: allocation.description || "",
        status: allocation.status
      });
    }
  }, [allocation]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  const handleClose = () => {
    onClose();
  };

  if (!allocation) return null;

  return (
    <div 
      className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto transform transition-transform duration-300 scale-100 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Edit Allocation</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project
            </label>
            <select
              value={form.project_id}
              onChange={(e) => setForm({ ...form, project_id: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm transition-all duration-200 hover:border-gray-400"
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              User
            </label>
            <select
              value={form.user_id}
              onChange={(e) => setForm({ ...form, user_id: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm transition-all duration-200 hover:border-gray-400"
              disabled={loading}
            >
              <option value="">Select a user</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.first_name} {user.last_name} ({user.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount (USD)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm transition-all duration-200 hover:border-gray-400"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm transition-all duration-200 hover:border-gray-400 resize-none"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm transition-all duration-200 hover:border-gray-400"
              disabled={loading}
            >
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-primary text-black rounded-lg hover:bg-primary/90 transition-all duration-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transform hover:scale-105"
            >
              {loading ? "Updating..." : "Update Allocation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const AllocationsPage = () => {
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAllocation, setSelectedAllocation] = useState<Allocation | null>(null);

  // Get current user info
  const currentUserRole = getCurrentUserRole();
  const currentUserId = getCurrentUserId();
  const canCreate = canCreateAllocations(currentUserRole);
  const canEdit = canEditAllocations(currentUserRole);
  const canDelete = canDeleteAllocations(currentUserRole);
  const canViewAll = canViewAllData(currentUserRole);

  useEffect(() => {
    fetchAllocations();
    
    // Only fetch projects and users if user has permission to create allocations
    if (canCreate) {
      fetchProjects();
      fetchUsers();
    }
  }, [currentUserRole]);

  const fetchAllocations = async () => {
    setLoading(true);
    try {
      const response = await get('/allocations');
      if (response.success) {
        setAllocations(response.data);
      } else {
        toast.error('Failed to fetch allocations');
      }
    } catch (error) {
      console.error('Error fetching allocations:', error);
      toast.error('Error loading allocations');
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

  const fetchUsers = async () => {
    try {
      const response = await get('/users');
      if (response.success) {
        setUsers(response.data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleCreateAllocation = async (data: CreateAllocationData) => {
    setActionLoading(true);
    try {
      const formData = new FormData();
      formData.append('project_id', data.project_id);
      formData.append('user_id', data.user_id);
      formData.append('amount', data.amount.toString());
      if (data.description) formData.append('description', data.description);
      if (data.proof_image) formData.append('proof_image', data.proof_image);

      const response = await post('/allocations', formData);
      
      if (response.success) {
        toast.success('Allocation created successfully');
        setShowCreateModal(false);
        fetchAllocations();
        fetchProjects();
      } else {
        toast.error(response.message || 'Failed to create allocation');
      }
    } catch (error: any) {
      console.error('Error creating allocation:', error);
      toast.error(error.response?.data?.message || 'Error creating allocation');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditAllocation = async (data: UpdateAllocationData) => {
    if (!selectedAllocation) return;
    
    setActionLoading(true);
    try {
      const response = await put(`/allocations/${selectedAllocation.id}`, data);
      if (response.success) {
        toast.success('Allocation updated successfully');
        setShowEditModal(false);
        setSelectedAllocation(null);
        fetchAllocations();
        fetchProjects();
      } else {
        toast.error(response.message || 'Failed to update allocation');
      }
    } catch (error: any) {
      console.error('Error updating allocation:', error);
      toast.error(error.response?.data?.message || 'Error updating allocation');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAllocation = async () => {
    if (!selectedAllocation) return;
    
    setActionLoading(true);
    try {
      const response = await del(`/allocations/${selectedAllocation.id}`);
      if (response.success) {
        toast.success('Allocation deleted successfully');
        setShowDeleteModal(false);
        setSelectedAllocation(null);
        fetchAllocations();
        fetchProjects();
      } else {
        toast.error(response.message || 'Failed to delete allocation');
      }
    } catch (error: any) {
      console.error('Error deleting allocation:', error);
      toast.error(error.response?.data?.message || 'Error deleting allocation');
    } finally {
      setActionLoading(false);
    }
  };

  const openCreateModal = () => {
    setShowCreateModal(true);
  };

  const openEditModal = (allocation: Allocation) => {
    setSelectedAllocation(allocation);
    setShowEditModal(true);
  };

  const openDeleteModal = (allocation: Allocation) => {
    setSelectedAllocation(allocation);
    setShowDeleteModal(true);
  };

  const closeModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    setSelectedAllocation(null);
  };

  // Filter allocations based on search and filters
  const filteredAllocations = allocations.filter(allocation => {
    const matchesSearch = 
      allocation.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      allocation.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      allocation.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      allocation.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      allocation.project_code?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || allocation.status === statusFilter;
    const matchesUser = canViewAll ? true : allocation.user_id === currentUserId;
    const matchesProject = selectedProjectId === "all" || allocation.project_id === selectedProjectId;

    return matchesSearch && matchesStatus && matchesUser && matchesProject;
  });

  // Get current project details for stats
  const currentProject = selectedProjectId !== "all" 
    ? projects.find(p => p.id === selectedProjectId)
    : null;

  // Calculate allocation statistics
  const allocationStats = {
    totalAllocated: filteredAllocations.reduce((sum, allocation) => sum + parseFloat(allocation.amount), 0),
    totalAllocations: filteredAllocations.length,
    activeAllocations: filteredAllocations.filter(a => a.status === 'approved').length,
    availableBalance: currentProject?.balance?.unallocated_balance 
      ? parseFloat(currentProject.balance.unallocated_balance) 
      : projects.reduce((sum, project) => sum + parseFloat(project.balance?.unallocated_balance || "0"), 0)
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Determine which stats cards to show based on user role
  const statsCards = [
    {
      title: canViewAll ? "Total Allocated" : "My Total Allocated",
      value: formatCurrency(allocationStats.totalAllocated),
      subtitle: canViewAll ? "Total allocated funds" : "Your total allocated funds",
      icon: MdOutlineAttachMoney,
    },
    ...(canViewAll ? [{
      title: "Available Balance",
      value: formatCurrency(allocationStats.availableBalance),
      subtitle: "Remaining balance",
      icon: Wallet,
    }] : []),
    {
      title: canViewAll ? "Total Allocations" : "My Allocations",
      value: allocationStats.totalAllocations,
      subtitle: canViewAll ? "Allocation records" : "Your allocation records",
      icon: TbSubtask,
    },
    {
      title: canViewAll ? "Active" : "My Active",
      value: allocationStats.activeAllocations,
      subtitle: canViewAll ? "Active allocations" : "Your active allocations",
      icon: CreditCard,
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50/30 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6 lg:space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="text-center lg:text-left">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight">
              {canViewAll ? 'Fund Allocations' : 'My Allocations'}
            </h1>
            <p className="text-sm text-gray-600 mt-2 max-w-2xl">
              {canViewAll 
                ? 'Manage and track fund allocations across all projects and users' 
                : 'View and manage your allocated funds for assigned projects'
              }
            </p>
          </div>
          {canCreate && (
            <button
              onClick={openCreateModal}
              className="flex items-center justify-center gap-2 px-5 py-2 bg-primary text-black rounded-lg hover:bg-primary/90 transition-all duration-200 text-xs font-semibold w-full lg:w-auto transform hover:scale-105"
            >
              <Plus className="h-3 w-3" />
              New Allocation
            </button>
          )}
        </div>

        {/* Project Tabs - Only show if user can view all data and has projects */}
        {canViewAll && projects.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200/60 p-6 shadow-sm">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setSelectedProjectId("all")}
                className={`px-5 py-1 rounded-sm text-xs font-normal transition-all duration-200 ${
                  selectedProjectId === "all" 
                    ? "bg-primary text-black shadow-md" 
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm"
                }`}
              >
                All Projects
              </button>
              {projects.map(project => (
                <button
                  key={project.id}
                  onClick={() => setSelectedProjectId(project.id)}
                  className={`px-5 py-1 rounded-sm text-xs font-normal transition-all duration-200 ${
                    selectedProjectId === project.id 
                      ? "bg-primary text-secondary font-semibold" 
                      : "bg-secondary/30 text-secondary hover:bg-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{project.project_code} - {project.name}</span>
                    {project.balance && (
                      <span className="px-3 py-1 bg-secondary rounded-full text-xs font-light text-white">
                        UGX {parseFloat(project.balance.unallocated_balance).toLocaleString()}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Stats Cards - Responsive grid that stretches to fill width */}
        <div className={`grid gap-4 sm:gap-6 
          ${statsCards.length === 1 ? 'grid-cols-1 max-w-md mx-auto' : ''}
          ${statsCards.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : ''}
          ${statsCards.length === 3 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : ''}
          ${statsCards.length >= 4 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : ''}
        `}>
          {statsCards.map((stat, index) => (
            <StatCard
              key={index}
              title={stat.title}
              value={stat.value}
              subtitle={stat.subtitle}
              icon={stat.icon}
              loading={loading}
              className="h-full"
            />
          ))}
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-2xl border border-gray-200/60 p-6 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder={
                    canViewAll 
                      ? "Search allocations by description, user, or project..." 
                      : "Search your allocations by description or project..."
                  }
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-xs transition-all duration-200 hover:border-gray-400"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-xs transition-all duration-200 hover:border-gray-400"
              >
                <option value="all">All Status</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Allocations Table */}
        <div className="bg-white rounded-2xl border border-gray-200/60 overflow-hidden shadow-sm">
          {/* Table Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-900">
                {canViewAll 
                  ? selectedProjectId === "all" 
                    ? `All Allocations (${filteredAllocations.length})`
                    : `Allocations for ${currentProject?.project_code} - ${currentProject?.name} (${filteredAllocations.length})`
                  : `My Allocations (${filteredAllocations.length})`
                }
              </h2>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Filter className="h-4 w-4" />
                <span>Filtered Results</span>
              </div>
            </div>
          </div>

          {/* Data Table Component */}
          <DataTable
            data={filteredAllocations}
            loading={loading}
            type="allocations"
            onEdit={canEdit ? openEditModal : undefined}
            onDelete={canDelete ? openDeleteModal : undefined}
            showActions={canEdit || canDelete}
            currentUserRole={currentUserRole}
            currentUserId={currentUserId}
          />
        </div>
      </div>

      {/* Create Allocation Modal */}
      {canCreate && (
        <CreateAllocationModal
          isOpen={showCreateModal}
          onClose={closeModals}
          onSubmit={handleCreateAllocation}
          projects={projects}
          users={users}
          loading={actionLoading}
        />
      )}

      {/* Edit Allocation Modal */}
      {canEdit && (
        <EditAllocationModal
          isOpen={showEditModal}
          onClose={closeModals}
          onSubmit={handleEditAllocation}
          allocation={selectedAllocation}
          projects={projects}
          users={users}
          loading={actionLoading}
        />
      )}

      {/* Delete Confirmation Modal */}
      {canDelete && (
        <DeleteModal
          isOpen={showDeleteModal}
          onClose={closeModals}
          onConfirm={handleDeleteAllocation}
          title="Delete Allocation"
          description="Are you sure you want to delete this allocation? This action cannot be undone and will permanently remove the allocation record."
          loading={actionLoading}
        />
      )}
    </div>
  );
};

export default AllocationsPage;