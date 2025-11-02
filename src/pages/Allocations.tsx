"use client";

import { useState, useEffect } from "react";
import { 
  Share2, 
  Search, 
  Filter,
  Plus,
  Users,
  DollarSign,
  Building,
  TrendingUp,
  X,
  Upload,
  Wallet,
  CreditCard
} from "lucide-react";
import { get, post, put, del } from "../utils/service";
import { toast } from "sonner";
import { DataTable } from "../components/shared/DataTable";
import { DeleteModal } from "../components/shared/Modals";
import { StatCard } from "../components/shared/StatCard";

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
  start_date: string;
  end_date: string;
  status: 'planning' | 'active' | 'completed' | 'cancelled' | 'closed';
  created_at: string;
  updated_at: string;
  created_by: string;
  deleted_at: string | null;
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
      className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 ${isOpen ? 'block' : 'hidden'}`}
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xs font-semibold text-gray-900">Create New Allocation</h2>
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
              onChange={(e) => handleProjectChange(e.target.value)}
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
            {selectedProject && (
              <p className="text-xs text-gray-500 mt-1">
                Available balance: ${availableBalance.toLocaleString()}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              User *
            </label>
            <select
              required
              value={form.user_id}
              onChange={(e) => setForm({ ...form, user_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-xs"
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
            <label className="block text-xs font-medium text-gray-700 mb-1">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-xs"
              placeholder="0.00"
              disabled={loading}
            />
            {form.amount > availableBalance && (
              <p className="text-xs text-red-600 mt-1">
                Amount exceeds available balance
              </p>
            )}
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
              placeholder="Allocation description..."
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Proof Image *
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
              Upload proof of allocation (receipt, transfer confirmation, etc.)
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
              disabled={loading || form.amount > availableBalance || !form.proof_image}
              className="flex-1 px-4 py-2 bg-primary text-black rounded-lg hover:bg-primary/90 transition-colors text-xs font-medium disabled:opacity-50"
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
      className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 ${isOpen ? 'block' : 'hidden'}`}
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xs font-semibold text-gray-900">Edit Allocation</h2>
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
              User
            </label>
            <select
              value={form.user_id}
              onChange={(e) => setForm({ ...form, user_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-xs"
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
              Status
            </label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-xs"
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
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-xs font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-primary text-black rounded-lg hover:bg-primary/90 transition-colors text-xs font-medium disabled:opacity-50"
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

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchProjects(),
        fetchUsers(),
        fetchAllocations()
      ]);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      toast.error('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllocations = async () => {
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
        fetchProjects(); // Refresh projects to update balances
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
        fetchProjects(); // Refresh projects to update balances
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
        fetchProjects(); // Refresh projects to update balances
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
    const matchesProject = selectedProjectId === "all" || allocation.project_id === selectedProjectId;

    return matchesSearch && matchesStatus && matchesProject;
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
    averageAllocation: filteredAllocations.length > 0 ? 
      filteredAllocations.reduce((sum, allocation) => sum + parseFloat(allocation.amount), 0) / filteredAllocations.length : 0,
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

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Fund Allocations</h1>
              <p className="text-xs text-gray-600 mt-1">Manage fund allocations to users for projects</p>
            </div>
            <button
              onClick={openCreateModal}
              className="mt-4 sm:mt-0 flex items-center gap-2 px-4 py-2 bg-primary text-black rounded-lg hover:bg-primary/90 transition-colors text-xs font-medium"
            >
              <Plus className="h-4 w-4" />
              New Allocation
            </button>
          </div>
        </div>

        {/* Project Tabs */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedProjectId("all")}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                selectedProjectId === "all" 
                  ? "bg-primary text-black" 
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              All Projects
            </button>
            {projects.map(project => (
              <button
                key={project.id}
                onClick={() => setSelectedProjectId(project.id)}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                  selectedProjectId === project.id 
                    ? "bg-primary text-black" 
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {project.project_code} - {project.name}
                {project.balance && (
                  <span className="ml-2 text-xs opacity-75">
                    ${parseFloat(project.balance.unallocated_balance).toLocaleString()}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Total Allocated"
            value={formatCurrency(allocationStats.totalAllocated)}
            subtitle="Total allocated funds"
            icon={DollarSign}
            loading={loading}
          />
          <StatCard
            title="Available Balance"
            value={formatCurrency(allocationStats.availableBalance)}
            subtitle="Remaining balance"
            icon={Wallet}
            loading={loading}
          />
          <StatCard
            title="Total Allocations"
            value={allocationStats.totalAllocations}
            subtitle="Allocation records"
            icon={Share2}
            loading={loading}
          />
          <StatCard
            title="Active"
            value={allocationStats.activeAllocations}
            subtitle="Active allocations"
            icon={CreditCard}
            loading={loading}
          />
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search allocations by description, user, or project..."
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
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Allocations Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Table Header */}
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-gray-900">
                {selectedProjectId === "all" 
                  ? `All Allocations (${filteredAllocations.length})`
                  : `Allocations for ${currentProject?.project_code} - ${currentProject?.name} (${filteredAllocations.length})`
                }
              </h2>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Filter className="h-4 w-4" />
                <span>Filtered</span>
              </div>
            </div>
          </div>

          {/* Data Table Component */}
          <DataTable
            data={filteredAllocations}
            loading={loading}
            type="allocations"
            onEdit={openEditModal}
            onDelete={openDeleteModal}
          />
        </div>
      </div>

      {/* Create Allocation Modal */}
      <CreateAllocationModal
        isOpen={showCreateModal}
        onClose={closeModals}
        onSubmit={handleCreateAllocation}
        projects={projects}
        users={users}
        loading={actionLoading}
      />

      {/* Edit Allocation Modal */}
      <EditAllocationModal
        isOpen={showEditModal}
        onClose={closeModals}
        onSubmit={handleEditAllocation}
        allocation={selectedAllocation}
        projects={projects}
        users={users}
        loading={actionLoading}
      />

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={showDeleteModal}
        onClose={closeModals}
        onConfirm={handleDeleteAllocation}
        title="Delete Allocation"
        description="Are you sure you want to delete this allocation? This action cannot be undone."
        loading={actionLoading}
      />
    </div>
  );
};

export default AllocationsPage;