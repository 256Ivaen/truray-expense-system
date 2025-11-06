"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Folder, 
  Search, 
  Filter,
  Plus,
  X,
  CheckCircle,
  Clock,
  Loader2
} from "lucide-react";
import { get, post, put, del } from "../utils/service";
import { toast } from "sonner";
import { DataTable } from "../components/shared/DataTable";
import { DeleteModal } from "../components/shared/Modals";
import { StatCard } from "../components/shared/StatCard";
import { CalendarPicker } from "../components/shared/CalendarPicker";

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
  role: 'admin' | 'user';
}

interface CreateProjectData {
  project_code: string;
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  expense_types?: string[];
}

interface UpdateProjectData {
  project_code?: string;
  name?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  status?: 'planning' | 'active' | 'completed' | 'cancelled' | 'closed';
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

  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [expenseTypes, setExpenseTypes] = useState<string[]>([]);
  const [newExpenseType, setNewExpenseType] = useState<string>("");

  const formatDateForInput = (date: Date | null): string => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    setForm(prev => ({
      ...prev,
      start_date: formatDateForInput(startDate),
      end_date: formatDateForInput(endDate)
    }));
  }, [startDate, endDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!startDate) {
      toast.error('Please select a start date');
      return;
    }
    
    if (!endDate) {
      toast.error('Please select an end date');
      return;
    }
    
    const payload = {
      ...form,
      expense_types: expenseTypes.filter(t => t.trim() !== "")
    };
    onSubmit(payload as any);
  };

  const handleClose = () => {
    setForm({
      project_code: "",
      name: "",
      description: "",
      start_date: "",
      end_date: ""
    });
    setStartDate(null);
    setEndDate(null);
    setExpenseTypes([]);
    setNewExpenseType("");
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
          <h2 className="text-lg font-semibold text-gray-900">Create New Project</h2>
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

          <div className="pt-2">
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Expense Types
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newExpenseType}
                onChange={(e) => setNewExpenseType(e.target.value)}
                placeholder="e.g. Transport"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-xs"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => {
                  const name = newExpenseType.trim();
                  if (!name) return;
                  if (expenseTypes.includes(name)) return;
                  setExpenseTypes([...expenseTypes, name]);
                  setNewExpenseType("");
                }}
                disabled={loading || !newExpenseType.trim()}
                className="px-3 py-2 bg-primary text-secondary rounded-lg hover:bg-primary/90 transition-colors text-xs font-medium disabled:opacity-50"
              >
                Add
              </button>
            </div>
            {expenseTypes.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {expenseTypes.map((t, idx) => (
                  <span key={idx} className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-gray-100 text-gray-800 text-[11px]">
                    {t}
                    <button
                      type="button"
                      onClick={() => setExpenseTypes(expenseTypes.filter(x => x !== t))}
                      className="text-gray-500 hover:text-gray-700"
                      disabled={loading}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-gray-500">No expense types added yet.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Start Date *
              </label>
              <CalendarPicker
                value={startDate}
                onChange={setStartDate}
                placeholder="Select start date"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                End Date *
              </label>
              <CalendarPicker
                value={endDate}
                onChange={setEndDate}
                placeholder="Select end date"
                disabled={loading}
              />
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

  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const formatDateForInput = (date: Date | null): string => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

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
      
      if (project.start_date) {
        setStartDate(new Date(project.start_date));
      }
      if (project.end_date) {
        setEndDate(new Date(project.end_date));
      }
    }
  }, [project]);

  useEffect(() => {
    setForm(prev => ({
      ...prev,
      start_date: formatDateForInput(startDate),
      end_date: formatDateForInput(endDate)
    }));
  }, [startDate, endDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!startDate) {
      toast.error('Please select a start date');
      return;
    }
    
    if (!endDate) {
      toast.error('Please select an end date');
      return;
    }
    
    onSubmit(form);
  };

  const handleClose = () => {
    onClose();
  };

  if (!project) return null;

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
          <h2 className="text-lg font-semibold text-gray-900">Edit Project</h2>
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
                Start Date *
              </label>
              <CalendarPicker
                value={startDate}
                onChange={setStartDate}
                placeholder="Select start date"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                End Date *
              </label>
              <CalendarPicker
                value={endDate}
                onChange={setEndDate}
                placeholder="Select end date"
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
              {loading ? "Updating..." : "Update Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const ProjectsPage = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [userProjects, setUserProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const currentUserRole = getCurrentUserRole();
  const currentUserId = getCurrentUserId();
  const isAdmin = currentUserRole === 'admin';
  const isFinanceManager = false;
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
        
        if (currentUserRole === 'user') {
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

  const handleViewProject = (project: Project) => {
    navigate(`/projects/${project.id}`);
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
    setShowDeleteModal(false);
    setSelectedProject(null);
  };

  const displayProjects = currentUserRole === 'user' ? userProjects : projects;

  const filteredProjects = displayProjects.filter(project => {
    const matchesSearch = 
      project.project_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || project.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const projectStats = {
    total: displayProjects.length,
    active: displayProjects.filter(p => p.status === 'active').length,
    completed: displayProjects.filter(p => p.status === 'completed').length,
    planning: displayProjects.filter(p => p.status === 'planning').length,
  };

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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            title="Active Projects"
            value={projectStats.active}
            subtitle="Currently active"
            icon={CheckCircle}
            loading={loading}
          />
          <StatCard
            title="Completed"
            value={projectStats.completed}
            subtitle="Finished projects"
            icon={CheckCircle}
            loading={loading}
          />
          <StatCard
            title="Planning"
            value={projectStats.planning}
            subtitle="In planning phase"
            icon={Clock}
            loading={loading}
          />
        </div>

        {loading ? (
          <SearchSkeleton />
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
                  {currentUserRole === 'user' ? 'My Projects' : 'Projects'} ({filteredProjects.length})
                </h2>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Filter className="h-4 w-4" />
                  <span>Filtered</span>
                </div>
              </div>
            )}
          </div>

          <DataTable
            data={filteredProjects}
            loading={loading}
            type="projects"
            onEdit={canManageProjects ? openEditModal : undefined}
            onDelete={canManageProjects ? openDeleteModal : undefined}
            onView={handleViewProject}
            showActions={true}
            currentUserRole={currentUserRole}
            currentUserId={currentUserId}
            actionLoading={actionLoading}
          />
        </div>
      </div>

      {canManageProjects && (
        <CreateProjectModal
          isOpen={showCreateModal}
          onClose={closeModals}
          onSubmit={handleCreateProject}
          loading={actionLoading}
        />
      )}

      {canManageProjects && (
        <EditProjectModal
          isOpen={showEditModal}
          onClose={closeModals}
          onSubmit={handleEditProject}
          project={selectedProject}
          loading={actionLoading}
        />
      )}

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