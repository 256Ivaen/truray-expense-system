"use client";

import { useState, useEffect } from "react";
import { 
  Folder, 
  Search, 
  Filter,
  Plus,
  Users,
  Calendar,
  DollarSign,
  X,
  UserPlus,
  UserMinus,
  Mail,
} from "lucide-react";
import { get, post, put, del } from "../utils/service";
import { toast } from "sonner";
import { DataTable } from "../components/shared/DataTable";
import { DeleteModal } from "../components/shared/Modals";

interface Project {
  id: string;
  project_code: string;
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  status: 'planning' | 'active' | 'completed' | 'cancelled' | 'closed';
  created_at: string;
  updated_at: string;
  created_by: string;
  deleted_at: string | null;
  balance?: {
    total_deposits: string;
    total_allocated: string;
    total_spent: string;
    unallocated_balance: string;
    allocated_balance: string;
  };
  users?: Array<{
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    assigned_at: string;
  }>;
}

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: 'admin' | 'finance_manager' | 'user';
}

interface CreateProjectData {
  project_code: string;
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
}

interface UpdateProjectData {
  project_code?: string;
  name?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  status?: 'planning' | 'active' | 'completed' | 'cancelled' | 'closed';
}

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

// Skeleton Components
const SkeletonBox = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`}></div>
);

const StatCardSkeleton = () => (
  <div className="bg-white rounded-lg border border-gray-200 p-4">
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <SkeletonBox className="h-3 w-16 mb-2" />
        <SkeletonBox className="h-6 w-12 mb-1" />
        <SkeletonBox className="h-3 w-10" />
      </div>
      <SkeletonBox className="h-8 w-8 rounded-full" />
    </div>
  </div>
);

const SearchSkeleton = () => (
  <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2">
        <div className="relative">
          <SkeletonBox className="h-10 w-full rounded-lg" />
        </div>
      </div>
      <div>
        <SkeletonBox className="h-10 w-full rounded-lg" />
      </div>
    </div>
  </div>
);

// Project Modals Components
interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateProjectData) => void;
  loading?: boolean;
}

function CreateProjectModal({ isOpen, onClose, onSubmit, loading = false }: CreateProjectModalProps) {
  const [form, setForm] = useState<CreateProjectData>({
    project_code: "",
    name: "",
    description: "",
    start_date: "",
    end_date: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  const handleClose = () => {
    setForm({
      project_code: "",
      name: "",
      description: "",
      start_date: "",
      end_date: ""
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
          <h2 className="text-xs font-semibold text-gray-900">Create New Project</h2>
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
              Project Code *
            </label>
            <input
              type="text"
              required
              value={form.project_code}
              onChange={(e) => setForm({ ...form, project_code: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-xs"
              placeholder="PRJ001"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Project Name *
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-xs"
              placeholder="Office Renovation"
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
              placeholder="Project description..."
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-xs"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-xs"
                disabled={loading}
              />
            </div>
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
              {loading ? "Creating..." : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UpdateProjectData) => void;
  project: Project | null;
  loading?: boolean;
}

function EditProjectModal({ isOpen, onClose, onSubmit, project, loading = false }: EditProjectModalProps) {
  const [form, setForm] = useState<UpdateProjectData>({
    project_code: "",
    name: "",
    description: "",
    start_date: "",
    end_date: "",
    status: "planning"
  });

  useEffect(() => {
    if (project) {
      setForm({
        project_code: project.project_code,
        name: project.name,
        description: project.description || "",
        start_date: project.start_date || "",
        end_date: project.end_date || "",
        status: project.status
      });
    }
  }, [project]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  const handleClose = () => {
    onClose();
  };

  if (!project) return null;

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
          <h2 className="text-xs font-semibold text-gray-900">Edit Project</h2>
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
              Project Code
            </label>
            <input
              type="text"
              required
              value={form.project_code}
              onChange={(e) => setForm({ ...form, project_code: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-xs"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Project Name
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-xs"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-xs"
                disabled={loading}
              />
            </div>
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
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="closed">Closed</option>
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
              {loading ? "Updating..." : "Update Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface ViewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssignUser: (userId: string) => void;
  onRemoveUser: (userId: string) => void;
  project: Project | null;
  users: User[];
  loading?: boolean;
  currentUserRole: string;
}

function ViewProjectModal({ isOpen, onClose, onAssignUser, onRemoveUser, project, users, loading = false, currentUserRole }: ViewProjectModalProps) {
  const [selectedUser, setSelectedUser] = useState("");

  const handleAssignUser = () => {
    if (selectedUser) {
      onAssignUser(selectedUser);
      setSelectedUser("");
    }
  };

  const handleClose = () => {
    setSelectedUser("");
    onClose();
  };

  if (!project) return null;

  const assignedUserIds = project.users?.map(u => u.id) || [];
  const availableUsers = users.filter(u => !assignedUserIds.includes(u.id));

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(parseFloat(amount));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const canManageUsers = currentUserRole === 'admin' || currentUserRole === 'finance_manager';

  return (
    <div 
      className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 ${isOpen ? 'block' : 'hidden'}`}
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xs font-semibold text-gray-900">
            Project Details: {project.project_code} - {project.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Project Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-xs font-semibold text-gray-900 mb-4">Project Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-700">Project Code</label>
                  <p className="text-xs text-gray-900">{project.project_code}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Project Name</label>
                  <p className="text-xs text-gray-900">{project.name}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Description</label>
                  <p className="text-xs text-gray-900">{project.description || 'No description'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Status</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${
                    project.status === 'active' ? 'bg-green-100 text-green-800' :
                    project.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                    project.status === 'planning' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {project.status}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-gray-900 mb-4">Financial Overview</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-700">Total Deposits</label>
                  <p className="text-xs text-gray-900">{formatCurrency(project.balance?.total_deposits || '0')}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Total Allocated</label>
                  <p className="text-xs text-gray-900">{formatCurrency(project.balance?.total_allocated || '0')}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Total Spent</label>
                  <p className="text-xs text-gray-900">{formatCurrency(project.balance?.total_spent || '0')}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Unallocated Balance</label>
                  <p className="text-xs text-gray-900">{formatCurrency(project.balance?.unallocated_balance || '0')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* User Assignment Section - Only show for admins and finance managers */}
          {canManageUsers && (
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold text-gray-900">Team Members ({project.users?.length || 0})</h3>
                <div className="flex gap-2">
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-xs"
                    disabled={loading || availableUsers.length === 0}
                  >
                    <option value="">Select user to assign</option>
                    {availableUsers.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.first_name} {user.last_name} ({user.email})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleAssignUser}
                    disabled={!selectedUser || loading}
                    className="px-4 py-2 bg-primary text-black rounded-lg hover:bg-primary/90 transition-colors text-xs font-medium disabled:opacity-50 flex items-center gap-2"
                  >
                    <UserPlus className="h-4 w-4" />
                    Assign
                  </button>
                </div>
              </div>

              {/* Assigned Users List */}
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {project.users?.map(user => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 bg-primary/20 rounded-full flex items-center justify-center">
                        <span className="text-black font-medium text-xs">
                          {user.first_name[0]}{user.last_name[0]}
                        </span>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-900">
                          {user.first_name} {user.last_name}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </div>
                        <div className="text-xs text-gray-500">
                          Assigned: {formatDate(user.assigned_at)}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => onRemoveUser(user.id)}
                      disabled={loading}
                      className="text-red-600 hover:text-red-800 transition-colors text-xs font-medium disabled:opacity-50 flex items-center gap-1"
                    >
                      <UserMinus className="h-4 w-4" />
                      Remove
                    </button>
                  </div>
                ))}
                {(!project.users || project.users.length === 0) && (
                  <div className="text-center py-8 text-xs text-gray-500">
                    <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    No users assigned to this project
                  </div>
                )}
              </div>
            </div>
          )}

          {/* For normal users, show assigned team members without management options */}
          {!canManageUsers && project.users && project.users.length > 0 && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-xs font-semibold text-gray-900 mb-4">Team Members ({project.users.length})</h3>
              <div className="space-y-3">
                {project.users.map(user => (
                  <div key={user.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="h-8 w-8 bg-primary/20 rounded-full flex items-center justify-center">
                      <span className="text-black font-medium text-xs">
                        {user.first_name[0]}{user.last_name[0]}
                      </span>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-gray-900">
                        {user.first_name} {user.last_name}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {user.email}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-xs font-medium disabled:opacity-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const ProjectsPage = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [userProjects, setUserProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Get current user info
  const currentUserRole = getCurrentUserRole();
  const currentUserId = getCurrentUserId();
  const isAdmin = currentUserRole === 'admin';
  const isFinanceManager = currentUserRole === 'finance_manager';
  const canManageProjects = isAdmin || isFinanceManager;

  useEffect(() => {
    fetchProjects();
    if (canManageProjects) {
      fetchUsers();
    }
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const response = await get('/projects');
      if (response.success) {
        const allProjects = response.data;
        setProjects(allProjects);
        
        // For normal users, filter projects to only show assigned ones
        if (currentUserRole === 'user') {
          // Fetch detailed project info to check user assignments
          const userAssignedProjects = await fetchUserAssignedProjects(allProjects);
          setUserProjects(userAssignedProjects);
        } else {
          setUserProjects(allProjects);
        }
      } else {
        toast.error('Failed to fetch projects');
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Error loading projects');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserAssignedProjects = async (allProjects: Project[]): Promise<Project[]> => {
    try {
      const assignedProjects: Project[] = [];
      
      // Check each project to see if current user is assigned
      for (const project of allProjects) {
        try {
          const projectDetails = await get(`/projects/${project.id}`);
          if (projectDetails.success && projectDetails.data.users) {
            const isUserAssigned = projectDetails.data.users.some(
              (user: any) => user.id === currentUserId
            );
            if (isUserAssigned) {
              assignedProjects.push(projectDetails.data);
            }
          }
        } catch (error) {
          console.error(`Error fetching project ${project.id}:`, error);
        }
      }
      
      return assignedProjects;
    } catch (error) {
      console.error('Error fetching user assigned projects:', error);
      return [];
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

  const fetchProjectById = async (projectId: string): Promise<Project | null> => {
    try {
      const response = await get(`/projects/${projectId}`);
      if (response.success) {
        return response.data;
      } else {
        toast.error('Failed to fetch project details');
        return null;
      }
    } catch (error) {
      console.error('Error fetching project:', error);
      toast.error('Error loading project details');
      return null;
    }
  };

  const handleCreateProject = async (data: CreateProjectData) => {
    setActionLoading(true);
    try {
      const response = await post('/projects', data);
      if (response.success) {
        toast.success('Project created successfully');
        setShowCreateModal(false);
        fetchProjects();
      } else {
        toast.error(response.message || 'Failed to create project');
      }
    } catch (error: any) {
      console.error('Error creating project:', error);
      toast.error(error.response?.data?.message || 'Error creating project');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditProject = async (data: UpdateProjectData) => {
    if (!selectedProject) return;
    
    setActionLoading(true);
    try {
      const response = await put(`/projects/${selectedProject.id}`, data);
      if (response.success) {
        toast.success('Project updated successfully');
        setShowEditModal(false);
        setSelectedProject(null);
        fetchProjects();
      } else {
        toast.error(response.message || 'Failed to update project');
      }
    } catch (error: any) {
      console.error('Error updating project:', error);
      toast.error(error.response?.data?.message || 'Error updating project');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!selectedProject) return;
    
    setActionLoading(true);
    try {
      const response = await del(`/projects/${selectedProject.id}`);
      if (response.success) {
        toast.success('Project deleted successfully');
        setShowDeleteModal(false);
        setSelectedProject(null);
        fetchProjects();
      } else {
        toast.error(response.message || 'Failed to delete project');
      }
    } catch (error: any) {
      console.error('Error deleting project:', error);
      toast.error(error.response?.data?.message || 'Error deleting project');
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewProject = async (project: Project) => {
    setActionLoading(true);
    try {
      const projectDetails = await fetchProjectById(project.id);
      if (projectDetails) {
        setSelectedProject(projectDetails);
        setShowViewModal(true);
      }
    } catch (error) {
      console.error('Error viewing project:', error);
      toast.error('Error loading project details');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignUserToProject = async (userId: string) => {
    if (!selectedProject) return;
    
    setActionLoading(true);
    try {
      const response = await post(`/projects/${selectedProject.id}/assign-user`, { user_id: userId });
      if (response.success) {
        toast.success('User assigned to project successfully');
        // Refresh project details
        const projectDetails = await fetchProjectById(selectedProject.id);
        if (projectDetails) {
          setSelectedProject(projectDetails);
        }
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

  const handleRemoveUserFromProject = async (userId: string) => {
    if (!selectedProject) return;
    
    setActionLoading(true);
    try {
      const response = await del(`/projects/${selectedProject.id}/remove-user/${userId}`);
      if (response.success) {
        toast.success('User removed from project successfully');
        // Refresh project details
        const projectDetails = await fetchProjectById(selectedProject.id);
        if (projectDetails) {
          setSelectedProject(projectDetails);
        }
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

  const openEditModal = (project: Project) => {
    setSelectedProject(project);
    setShowEditModal(true);
  };

  const openDeleteModal = (project: Project) => {
    setSelectedProject(project);
    setShowDeleteModal(true);
  };

  const closeModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowViewModal(false);
    setShowDeleteModal(false);
    setSelectedProject(null);
  };

  // Determine which projects to display based on user role
  const displayProjects = currentUserRole === 'user' ? userProjects : projects;

  // Filter projects based on search and filters
  const filteredProjects = displayProjects.filter(project => {
    const matchesSearch = 
      project.project_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || project.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Calculate project statistics based on displayed projects
  const projectStats = {
    total: displayProjects.length,
    active: displayProjects.filter(p => p.status === 'active').length,
    completed: displayProjects.filter(p => p.status === 'completed').length,
    planning: displayProjects.filter(p => p.status === 'planning').length,
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
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
                    {currentUserRole === 'user' ? 'My Projects' : 'Projects Management'}
                  </h1>
                  <p className="text-xs text-gray-600 mt-1">
                    {currentUserRole === 'user' 
                      ? 'View and manage your assigned projects' 
                      : 'Manage and track all projects'
                    }
                  </p>
                </>
              )}
            </div>
            {canManageProjects && (
              loading ? (
                <SkeletonBox className="h-10 w-32 rounded-lg" />
              ) : (
                <button
                  onClick={openCreateModal}
                  className="mt-4 sm:mt-0 flex items-center gap-2 px-4 py-2 bg-primary text-black rounded-lg hover:bg-primary/90 transition-colors text-xs font-medium"
                >
                  <Plus className="h-4 w-4" />
                  New Project
                </button>
              )
            )}
          </div>
        </div>

        {/* Project Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <StatCardSkeleton key={index} />
            ))
          ) : (
            <>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-600">Total Projects</p>
                    <p className="text-2xl font-bold text-gray-900">{projectStats.total}</p>
                  </div>
                  <Folder className="h-8 w-8 text-primary" />
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-600">Active</p>
                    <p className="text-2xl font-bold text-gray-900">{projectStats.active}</p>
                  </div>
                  <Users className="h-8 w-8 text-green-500" />
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-600">Completed</p>
                    <p className="text-2xl font-bold text-gray-900">{projectStats.completed}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-blue-500" />
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-600">Planning</p>
                    <p className="text-2xl font-bold text-gray-900">{projectStats.planning}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-yellow-500" />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Filters and Search */}
        {loading ? (
          <SearchSkeleton />
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Search */}
              <div className="lg:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder={
                      currentUserRole === 'user' 
                        ? "Search your projects by code, name, or description..." 
                        : "Search projects by code, name, or description..."
                    }
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
                  <option value="planning">Planning</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Projects Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Table Header */}
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gray-50">
            {loading ? (
              <div className="flex items-center justify-between">
                <SkeletonBox className="h-4 w-32" />
                <SkeletonBox className="h-4 w-16" />
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold text-gray-900">
                  {currentUserRole === 'user' ? 'My Projects' : 'Projects'} ({filteredProjects.length})
                </h2>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Filter className="h-4 w-4" />
                  <span>Filtered</span>
                </div>
              </div>
            )}
          </div>

          {/* Data Table Component */}
          <DataTable
            data={filteredProjects}
            loading={loading}
            type="projects"
            onEdit={canManageProjects ? openEditModal : undefined}
            onDelete={canManageProjects ? openDeleteModal : undefined}
            onView={handleViewProject}
            showActions={canManageProjects}
            currentUserRole={currentUserRole}
            currentUserId={currentUserId}
          />
        </div>
      </div>

      {/* Create Project Modal - Only for admins and finance managers */}
      {canManageProjects && (
        <CreateProjectModal
          isOpen={showCreateModal}
          onClose={closeModals}
          onSubmit={handleCreateProject}
          loading={actionLoading}
        />
      )}

      {/* Edit Project Modal - Only for admins and finance managers */}
      {canManageProjects && (
        <EditProjectModal
          isOpen={showEditModal}
          onClose={closeModals}
          onSubmit={handleEditProject}
          project={selectedProject}
          loading={actionLoading}
        />
      )}

      {/* View Project Modal */}
      <ViewProjectModal
        isOpen={showViewModal}
        onClose={closeModals}
        onAssignUser={handleAssignUserToProject}
        onRemoveUser={handleRemoveUserFromProject}
        project={selectedProject}
        users={users}
        loading={actionLoading}
        currentUserRole={currentUserRole}
      />

      {/* Delete Confirmation Modal - Only for admins and finance managers */}
      {canManageProjects && (
        <DeleteModal
          isOpen={showDeleteModal}
          onClose={closeModals}
          onConfirm={handleDeleteProject}
          title="Delete Project"
          description="Are you sure you want to delete this project? This action cannot be undone and will remove all associated data."
          loading={actionLoading}
        />
      )}
    </div>
  );
};

export default ProjectsPage;