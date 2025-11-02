"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  Search, 
  Filter,
  UserPlus,
  X,
  Folder,
  UserMinus,
  UserCheck,
  UserX
} from "lucide-react";
import { get, post, put, del } from "../utils/service";
import { toast } from "sonner";
import { DataTable } from "../components/shared/DataTable";
import { DeleteModal } from "../components/shared/Modals";
import { StatCard } from "../components/shared/StatCard";
import { Loader2 } from "lucide-react";

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: 'admin' | 'finance_manager' | 'user';
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
  assigned_projects?: Project[];
}

interface Project {
  id: string;
  project_code: string;
  name: string;
  status: 'planning' | 'active' | 'completed' | 'cancelled' | 'closed';
}

interface CreateUserData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: 'admin' | 'finance_manager' | 'user';
}

interface UpdateUserData {
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  role?: 'admin' | 'finance_manager' | 'user';
  status?: 'active' | 'inactive' | 'suspended';
}

// User Modals Components - Using same approach as Projects page
interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateUserData) => void;
  loading?: boolean;
}

function CreateUserModal({ isOpen, onClose, onSubmit, loading = false }: CreateUserModalProps) {
  const [form, setForm] = useState<CreateUserData>({
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    phone: "",
    role: "user"
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  const handleClose = () => {
    setForm({
      email: "",
      password: "",
      first_name: "",
      last_name: "",
      phone: "",
      role: "user"
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
          <h2 className="text-lg font-semibold text-gray-900">Create New User</h2>
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
              Email Address *
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-xs"
              placeholder="user@example.com"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Password *
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-xs"
              placeholder="Minimum 8 characters"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                First Name *
              </label>
              <input
                type="text"
                required
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-xs"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Last Name *
              </label>
              <input
                type="text"
                required
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-xs"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-xs"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Role *
            </label>
            <select
              required
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-xs"
              disabled={loading}
            >
              <option value="user">User</option>
              <option value="finance_manager">Finance Manager</option>
              <option value="admin">Admin</option>
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
              {loading ? "Creating..." : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UpdateUserData) => void;
  user: User | null;
  loading?: boolean;
}

function EditUserModal({ isOpen, onClose, onSubmit, user, loading = false }: EditUserModalProps) {
  const [form, setForm] = useState<UpdateUserData>({
    email: "",
    first_name: "",
    last_name: "",
    phone: "",
    role: "user",
    status: "active"
  });

  useEffect(() => {
    if (user) {
      setForm({
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone || "",
        role: user.role,
        status: user.status
      });
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  const handleClose = () => {
    onClose();
  };

  if (!user) return null;

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
          <h2 className="text-lg font-semibold text-gray-900">Edit User</h2>
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
              Email Address
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-xs"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                First Name
              </label>
              <input
                type="text"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-xs"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Last Name
              </label>
              <input
                type="text"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-xs"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-xs"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-xs"
                disabled={loading}
              >
                <option value="user">User</option>
                <option value="finance_manager">Finance Manager</option>
                <option value="admin">Admin</option>
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
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
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
              {loading ? "Updating..." : "Update User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface AssignProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (projectId: string) => void;
  onRemove: (projectId: string) => void;
  user: User | null;
  projects: Project[];
  loading?: boolean;
}

function AssignProjectModal({ isOpen, onClose, onAssign, onRemove, user, projects, loading = false }: AssignProjectModalProps) {
  const [selectedProject, setSelectedProject] = useState("");

  const handleAssign = () => {
    if (selectedProject) {
      onAssign(selectedProject);
      setSelectedProject("");
    }
  };

  const handleClose = () => {
    setSelectedProject("");
    onClose();
  };

  if (!user) return null;

  const assignedProjectIds = user.assigned_projects?.map(p => p.id) || [];
  const availableProjects = projects.filter(p => !assignedProjectIds.includes(p.id));

  return (
    <div 
      className={`fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50 ${isOpen ? 'block' : 'hidden'}`}
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Manage Projects for {user.first_name} {user.last_name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {/* Assign Project Section */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Assign to Project
            </label>
            <div className="flex gap-2">
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-xs"
                disabled={loading || availableProjects.length === 0}
              >
                <option value="">Select a project</option>
                {availableProjects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.project_code} - {project.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleAssign}
                disabled={!selectedProject || loading}
                className="px-4 py-2 bg-primary text-secondary rounded-lg hover:bg-primary/90 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? "Assigning..." : "Assign"}
              </button>
            </div>
          </div>

          {/* Assigned Projects List */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Assigned Projects ({user.assigned_projects?.length || 0})
            </label>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {user.assigned_projects?.map(project => (
                <div key={project.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="text-xs font-medium text-gray-900">
                      {project.project_code} - {project.name}
                    </div>
                    <div className="text-xs text-gray-500 capitalize">{project.status}</div>
                  </div>
                  <button
                    onClick={() => onRemove(project.id)}
                    disabled={loading}
                    className="text-red-600 hover:text-red-800 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed p-1"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserMinus className="h-4 w-4" />}
                  </button>
                </div>
              ))}
              {(!user.assigned_projects || user.assigned_projects.length === 0) && (
                <div className="text-center py-4 text-xs text-gray-500">
                  No projects assigned
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// The rest of your UsersPage component remains exactly the same...
const UsersPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    fetchUsers(currentPage, perPage);
    fetchProjects();
  }, [currentPage, perPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePerPageChange = (newPerPage: number) => {
    setPerPage(newPerPage);
    setCurrentPage(1);
  };

  const fetchUsers = async (page = currentPage, pageSize = perPage) => {
    setLoading(true);
    try {
      const response: any = await get('/users', { page, per_page: pageSize });
      if (response.success) {
        // Handle paginated response
        if (response.pagination) {
          setUsers(response.data || []);
          setTotalItems(response.pagination.total || 0);
          setTotalPages(response.pagination.total_pages || 1);
          setCurrentPage(response.pagination.current_page || 1);
        } else {
          // Fallback for non-paginated response
          setUsers(response.data || []);
        }
      } else {
        toast.error('Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Error loading users');
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

  const handleCreateUser = async (data: CreateUserData) => {
    setActionLoading(true);
    try {
      const response = await post('/users', data);
      if (response.success) {
        toast.success('User created successfully');
        setShowCreateModal(false);
        fetchUsers();
      } else {
        toast.error(response.message || 'Failed to create user');
      }
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.response?.data?.message || 'Error creating user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditUser = async (data: UpdateUserData) => {
    if (!selectedUser) return;
    
    setActionLoading(true);
    try {
      const response = await put(`/users/${selectedUser.id}`, data);
      if (response.success) {
        toast.success('User updated successfully');
        setShowEditModal(false);
        setSelectedUser(null);
        fetchUsers();
      } else {
        toast.error(response.message || 'Failed to update user');
      }
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error(error.response?.data?.message || 'Error updating user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    setActionLoading(true);
    try {
      const response = await del(`/users/${selectedUser.id}`);
      if (response.success) {
        toast.success('User deleted successfully');
        setShowDeleteModal(false);
        setSelectedUser(null);
        fetchUsers();
      } else {
        toast.error(response.message || 'Failed to delete user');
      }
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.response?.data?.message || 'Error deleting user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignUserToProject = async (projectId: string) => {
    if (!selectedUser) return;
    
    setActionLoading(true);
    try {
      const response = await post(`/projects/${projectId}/assign-user`, { user_id: selectedUser.id });
      if (response.success) {
        toast.success('User assigned to project successfully');
        fetchUsers(); // Refresh to get updated project assignments
      } else {
        toast.error(response.message || 'Failed to assign user to project');
      }
    } catch (error: any) {
      console.error('Error assigning user to project:', error);
      toast.error(error.response?.data?.message || 'Error assigning user to project');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveUserFromProject = async (projectId: string) => {
    if (!selectedUser) return;
    
    setActionLoading(true);
    try {
      const response = await del(`/projects/${projectId}/remove-user/${selectedUser.id}`);
      if (response.success) {
        toast.success('User removed from project successfully');
        fetchUsers(); // Refresh to get updated project assignments
      } else {
        toast.error(response.message || 'Failed to remove user from project');
      }
    } catch (error: any) {
      console.error('Error removing user from project:', error);
      toast.error(error.response?.data?.message || 'Error removing user from project');
    } finally {
      setActionLoading(false);
    }
  };

  const openCreateModal = () => {
    setShowCreateModal(true);
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const openDeleteModal = (user: User) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const openAssignModal = (user: User) => {
    setSelectedUser(user);
    setShowAssignModal(true);
  };

  const closeModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    setShowAssignModal(false);
    setSelectedUser(null);
  };

  // Filter users based on search and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus = statusFilter === "all" || user.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Calculate stats
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.status === 'active').length;
  const adminUsers = users.filter(u => u.role === 'admin').length;
  const regularUsers = users.filter(u => u.role === 'user').length;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Users Management</h1>
            <p className="text-xs text-gray-600 mt-1">Manage system users and their project assignments</p>
          </div>
          <button
            onClick={openCreateModal}
            className="mt-4 sm:mt-0 flex items-center gap-2 px-4 py-2 bg-primary text-black rounded-lg hover:bg-primary/90 transition-colors text-xs font-medium"
          >
            <UserPlus className="h-4 w-4" />
            Add User
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Users"
            value={totalUsers}
            subtitle="All registered users"
            icon={Users}
            loading={loading}
          />
          <StatCard
            title="Active Users"
            value={activeUsers}
            subtitle="Currently active"
            icon={UserCheck}
            loading={loading}
          />
          <StatCard
            title="Admins"
            value={adminUsers}
            subtitle="Administrators"
            icon={Users}
            loading={loading}
          />
          <StatCard
            title="Regular Users"
            value={regularUsers}
            subtitle="Standard users"
            icon={UserX}
            loading={loading}
          />
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search users by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-xs"
                />
              </div>
            </div>

            {/* Role Filter */}
            <div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-xs"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="finance_manager">Finance Manager</option>
                <option value="user">User</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-xs"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Table Header */}
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-gray-900">
                Users ({filteredUsers.length})
              </h2>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Filter className="h-4 w-4" />
                <span>Filtered</span>
              </div>
            </div>
          </div>

          {/* Data Table Component */}
          <DataTable
            data={users}
            loading={loading}
            type="users"
            onEdit={openEditModal}
            onDelete={openDeleteModal}
            onAssign={openAssignModal}
            useServerPagination={true}
            pagination={{
              currentPage,
              totalPages,
              totalItems,
              perPage,
              onPageChange: handlePageChange,
              onPerPageChange: handlePerPageChange,
            }}
          />
        </div>
      </div>

      {/* Create User Modal */}
      <CreateUserModal
        isOpen={showCreateModal}
        onClose={closeModals}
        onSubmit={handleCreateUser}
        loading={actionLoading}
      />

      {/* Edit User Modal */}
      <EditUserModal
        isOpen={showEditModal}
        onClose={closeModals}
        onSubmit={handleEditUser}
        user={selectedUser}
        loading={actionLoading}
      />

      {/* Assign Project Modal */}
      <AssignProjectModal
        isOpen={showAssignModal}
        onClose={closeModals}
        onAssign={handleAssignUserToProject}
        onRemove={handleRemoveUserFromProject}
        user={selectedUser}
        projects={projects}
        loading={actionLoading}
      />

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={showDeleteModal}
        onClose={closeModals}
        onConfirm={handleDeleteUser}
        title="Delete User"
        description="Are you sure you want to delete this user? This action cannot be undone."
        loading={actionLoading}
      />
    </div>
  );
};

export default UsersPage;