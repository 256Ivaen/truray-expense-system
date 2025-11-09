"use client";

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Users,
  DollarSign,
  TrendingUp,
  Wallet,
  UserPlus,
  X,
  Loader2,
  Calendar,
  FileText,
  Clock,
  Tag,
  Edit3,
} from "lucide-react";
import { get, post, del, put } from "../utils/service";
import { toast } from "sonner";
import { StatCard } from "../components/shared/StatCard";
import { DataTable } from "../components/shared/DataTable";
import { DeleteModal } from "../components/shared/Modals";

interface Project {
  id: string;
  project_code: string;
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  status: "pending" | "active" | "completed" | "cancelled" | "closed";
  created_at: string;
  updated_at: string;
  balance?: {
    total_deposits: string;
    total_allocated: string;
    total_spent: string;
    unallocated_balance: string;
    allocated_balance: string;
  };
  expense_types?: Array<{
    id: string;
    name: string;
    created_at: string;
  }>;
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
  role: "admin" | "user";
}

interface UpdateProjectData {
  project_code?: string;
  name?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  status?: "pending" | "active" | "completed" | "cancelled" | "closed";
  expense_types?: string[];
}

const SkeletonBox = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`}></div>
);

const HeaderSkeleton = () => (
  <div className="space-y-4">
    <SkeletonBox className="h-8 w-48" />
    <div className="flex items-center gap-4">
      <SkeletonBox className="h-6 w-32" />
      <SkeletonBox className="h-6 w-24" />
    </div>
  </div>
);

const CardSkeleton = () => (
  <div className="bg-white rounded-xl border border-gray-200 p-6">
    <div className="flex items-center gap-3 mb-4">
      <SkeletonBox className="h-10 w-10 rounded-full" />
      <SkeletonBox className="h-5 w-32" />
    </div>
    <SkeletonBox className="h-6 w-full mb-2" />
    <SkeletonBox className="h-4 w-24" />
  </div>
);

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
    status: "pending"
  });

  const [expenseTypes, setExpenseTypes] = useState<string[]>([]);
  const [newExpenseType, setNewExpenseType] = useState<string>("");

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
      
      // Set expense types from project data
      if (project.expense_types) {
        setExpenseTypes(project.expense_types.map(et => et.name));
      } else {
        setExpenseTypes([]);
      }
    }
  }, [project]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = {
      ...form,
      expense_types: expenseTypes.filter(t => t.trim() !== "")
    };
    onSubmit(payload);
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
              value={form.project_code}
              className="w-full px-3 py-2 border border-gray-200 bg-gray-100 rounded-lg text-xs"
              disabled
              readOnly
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

          {/* EXPENSE TYPES SECTION */}
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
              <option value="pending">Pending</option>
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

const ProjectDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const projectId = id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const getCurrentUserRole = () => {
    try {
      const userStr = localStorage.getItem("truray_user");
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.role || "user";
      }
    } catch (error) {
      console.error("Error getting user role:", error);
    }
    return "user";
  };

  const currentUserRole = getCurrentUserRole();
  const isAdmin = currentUserRole === "admin" || currentUserRole === "super_admin";
  const isFinanceManager = false;
  const canManageUsers = isAdmin || isFinanceManager;
  const canEditProject = isAdmin || isFinanceManager;

  useEffect(() => {
    if (projectId) {
      fetchProjectDetails();
      if (canManageUsers) {
        fetchUsers();
      }
    }
  }, [projectId]);

  const fetchProjectDetails = async () => {
    setLoading(true);
    try {
      const response = await get(`/projects/${projectId}`);
      if (response.success) {
        setProject(response.data);
      } else {
        toast.error("Failed to fetch project details");
        navigate("/projects");
      }
    } catch (error) {
      console.error("Error fetching project:", error);
      toast.error("Error loading project details");
      navigate("/projects");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await get("/users");
      if (response.success) {
        setUsers(response.data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const handleEditProject = async (data: UpdateProjectData) => {
    if (!project) return;
    
    setActionLoading(true);
    try {
      const response = await put(`/projects/${project.id}`, data);
      if (response.success) {
        toast.success('Project updated successfully');
        setShowEditModal(false);
        fetchProjectDetails();
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

  const handleAssignUser = async () => {
    if (!selectedUser || !project) return;

    // Check if there's already a user assigned
    const currentUser = project.users && project.users.length > 0 ? project.users[0] : null;
    
    if (currentUser) {
      if (!confirm(`You are reassigning a new user to this project. This will remove ${currentUser.first_name} ${currentUser.last_name} from the project. Continue?`)) {
        return;
      }
    }

    setActionLoading(true);
    try {
      const response = await post(`/projects/${project.id}/assign-user`, {
        user_id: selectedUser,
      });
      if (response.success) {
        toast.success("User assigned to project successfully");
        setSelectedUser("");
        fetchProjectDetails();
      } else {
        toast.error(response.message || "Failed to assign user to project");
      }
    } catch (error: any) {
      console.error("Error assigning user to project:", error);
      toast.error(
        error.response?.data?.message || "Error assigning user to project"
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!project) return;

    setActionLoading(true);
    try {
      const response = await del(
        `/projects/${project.id}/remove-user/${userId}`
      );
      if (response.success) {
        toast.success("User removed from project successfully");
        fetchProjectDetails();
      } else {
        toast.error(response.message || "Failed to remove user from project");
      }
    } catch (error: any) {
      console.error("Error removing user from project:", error);
      toast.error(
        error.response?.data?.message || "Error removing user from project"
      );
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "UGX",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(parseFloat(amount));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "closed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const assignedUserIds = project?.users?.map((u) => u.id) || [];
  const availableUsers = users.filter((u) => !assignedUserIds.includes(u.id));

  const transformedUsers =
    project?.users?.map((user) => ({
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role as "admin" | "user",
      status: "active" as const,
      created_at: user.assigned_at,
      updated_at: user.assigned_at,
    })) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {actionLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex flex-col items-center gap-3 shadow-xl">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-gray-900">Processing...</p>
          </div>
        </div>
      )}

      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header Section */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 w-full">
              <button
                onClick={() => navigate("/projects")}
                className="p-2 bg-primary/40 rounded-full transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-secondary" />
              </button>
              {loading ? (
                <HeaderSkeleton />
              ) : project ? (
                <div className="flex items-center justify-between w-full gap-4 px-3 py-2">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <h1 className="text-xl font-bold text-gray-900 truncate">
                      {project.project_code} - {project.name}
                    </h1>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                  {canEditProject && (
                      <button
                        onClick={() => setShowEditModal(true)}
                        className="px-5 py-1.5  text-white text-xs bg-secondary flex gap-4 rounded-lg transition-colors"
                        title="Edit Project"
                      >
                        Edit Project
                        <Edit3 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Financial Cards - Only 3 cards like Finance page */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {loading ? (
              <>
                <StatCard
                  title=""
                  value=""
                  subtitle=""
                  icon={TrendingUp}
                  loading
                />
                <StatCard
                  title=""
                  value=""
                  subtitle=""
                  icon={Wallet}
                  loading
                />
                <StatCard
                  title=""
                  value=""
                  subtitle=""
                  icon={DollarSign}
                  loading
                />
              </>
            ) : project?.balance ? (
              <>
                <StatCard
                  title="Total Allocated"
                  value={formatCurrency(project.balance.total_allocated)}
                  subtitle="Allocated to users"
                  icon={TrendingUp}
                />
                <StatCard
                  title="Total Spent"
                  value={formatCurrency(project.balance.total_spent)}
                  subtitle="Approved expenses"
                  icon={Wallet}
                />
                <StatCard
                  title="Allocated Balance"
                  value={formatCurrency(project.balance.allocated_balance)}
                  subtitle="Remaining allocated funds"
                  icon={DollarSign}
                />
              </>
            ) : null}
          </div>

          {/* Project Information */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Project Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {loading ? (
                <>
                  <CardSkeleton />
                  <CardSkeleton />
                  <CardSkeleton />
                  <CardSkeleton />
                  <CardSkeleton />
                  <CardSkeleton />
                </>
              ) : project ? (
                <>
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Tag className="h-5 w-5 text-primary" />
                      </div>
                      <h3 className="text-xs font-medium text-gray-700">
                        Project Code
                      </h3>
                    </div>
                    <p className="text-sm font-bold text-gray-900">
                      {project.project_code}
                    </p>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                      <h3 className="text-xs font-medium text-gray-700">
                        Project Name
                      </h3>
                    </div>
                    <p className="text-sm font-bold text-gray-900">
                      {project.name}
                    </p>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                        <Clock className="h-5 w-5 text-green-600" />
                      </div>
                      <h3 className="text-xs font-medium text-gray-700">
                        Status
                      </h3>
                    </div>
                    <span
                      className={`inline-flex px-3 py-1.5 text-xs font-medium rounded-full capitalize ${getStatusColor(
                        project.status
                      )}`}
                    >
                      {project.status}
                    </span>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 p-6 sm:col-span-2 lg:col-span-3">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <FileText className="h-5 w-5 text-purple-600" />
                      </div>
                      <h3 className="text-xs font-medium text-gray-700">
                        Description
                      </h3>
                    </div>
                    <p className="text-sm text-gray-900">
                      {project.description || "No description provided"}
                    </p>
                  </div>

                  {project.start_date && (
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center">
                          <Calendar className="h-5 w-5 text-orange-600" />
                        </div>
                        <h3 className="text-xs font-medium text-gray-700">
                          Start Date
                        </h3>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">
                        {formatDate(project.start_date)}
                      </p>
                    </div>
                  )}

                  {project.end_date && (
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center">
                          <Calendar className="h-5 w-5 text-red-600" />
                        </div>
                        <h3 className="text-xs font-medium text-gray-700">
                          End Date
                        </h3>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">
                        {formatDate(project.end_date)}
                      </p>
                    </div>
                  )}

                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <Clock className="h-5 w-5 text-gray-600" />
                      </div>
                      <h3 className="text-xs font-medium text-gray-700">
                        Last Updated
                      </h3>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatDate(project.updated_at)}
                    </p>
                  </div>

                  {project.expense_types && project.expense_types.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 p-6 sm:col-span-2 lg:col-span-3">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-10 w-10 bg-primary/20 rounded-full flex items-center justify-center">
                          <Tag className="h-5 w-5 text-secondary" />
                        </div>
                        <h3 className="text-xs font-medium text-secondary">
                          Expense Types ({project.expense_types.length})
                        </h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {project.expense_types.map((type) => (
                          <span
                            key={type.id}
                            className="inline-flex px-5 py-1 text-xs font-medium rounded-full bg-primary/20 text-secondary border border-secondary"
                          >
                            {type.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>

          {/* Team Members Section */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">
                  Team Members ({loading ? "..." : project?.users?.length || 0})
                </h2>
              </div>
            </div>

            {canManageUsers && !loading && (
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <select
                      value={selectedUser}
                      onChange={(e) => setSelectedUser(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-xs"
                      disabled={actionLoading || availableUsers.length === 0}
                    >
                      <option value="">
                        {availableUsers.length === 0
                          ? "All users assigned"
                          : "Select user to assign"}
                      </option>
                      {availableUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.first_name} {user.last_name} ({user.email})
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleAssignUser}
                      disabled={!selectedUser || actionLoading}
                      className="px-4 py-2 bg-primary text-black rounded-lg hover:bg-primary/90 transition-colors text-xs font-medium disabled:opacity-50 flex items-center gap-2"
                    >
                      <UserPlus className="h-4 w-4" />
                      {project?.users && project.users.length > 0 ? 'Reassign User' : 'Assign User'}
                    </button>
                  </div>
                  
                  {/* Warning message when reassigning */}
                  {project?.users && project.users.length > 0 && (
                    <div className="bg-secondary border border-secondary rounded-lg p-3">
                      <p className="text-xs text-white">
                        <strong>Note:</strong> Assigning a new user will remove the current user ({project.users[0].first_name} {project.users[0].last_name}) from this project.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {loading ? (
              <div className="p-12 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : transformedUsers.length > 0 ? (
              <DataTable
                data={transformedUsers}
                loading={false}
                type="users"
                showActions={canManageUsers}
                onDelete={
                  canManageUsers
                    ? (user: any) => handleRemoveUser(user.id)
                    : undefined
                }
                currentUserRole={currentUserRole}
                actionLoading={actionLoading}
              />
            ) : (
              <div className="p-12 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-sm font-medium text-gray-900 mb-2">
                  No Team Members
                </h3>
                <p className="text-xs text-gray-500">
                  {canManageUsers
                    ? "Assign users to this project using the form above"
                    : "No users have been assigned to this project yet"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Project Modal */}
      {canEditProject && (
        <EditProjectModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSubmit={handleEditProject}
          project={project}
          loading={actionLoading}
        />
      )}
    </div>
  );
};

export default ProjectDetailsPage;