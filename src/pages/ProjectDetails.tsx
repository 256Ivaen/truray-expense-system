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
  UserMinus,
  Mail,
  Loader2,
  Calendar,
  FileText,
  Clock,
  Tag,
} from "lucide-react";
import { get, post, del } from "../utils/service";
import { toast } from "sonner";
import { StatCard } from "../components/shared/StatCard";
import { DataTable } from "../components/shared/DataTable";

interface Project {
  id: string;
  project_code: string;
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  status: "planning" | "active" | "completed" | "cancelled" | "closed";
  created_at: string;
  updated_at: string;
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
  role: "admin" | "finance_manager" | "user";
}

// Skeleton Components
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

const ProjectDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const projectId = id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState("");

  // Get current user role
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
  const isAdmin = currentUserRole === "admin";
  const isFinanceManager = currentUserRole === "finance_manager";
  const canManageUsers = isAdmin || isFinanceManager;

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

  const handleAssignUser = async () => {
    if (!selectedUser || !project) return;

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
      currency: "USD",
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
      case "planning":
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

  // Transform project users to match DataTable user format
  const transformedUsers =
    project?.users?.map((user) => ({
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role as "admin" | "finance_manager" | "user",
      status: "active" as const,
      created_at: user.assigned_at,
      updated_at: user.assigned_at,
    })) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Global Loading Overlay */}
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
          {/* Header */}
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
                  <h1 className="text-xl font-bold text-gray-900 flex-1 min-w-0 truncate">
                    {project.project_code} - {project.name}
                  </h1>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`inline-flex px-3 py-1 text-xs font-medium rounded-full capitalize ${getStatusColor(
                        project.status
                      )}`}
                    >
                      {project.status}
                    </span>
                    <span className="text-xs text-gray-500">
                      Created {formatDate(project.created_at)}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Financial Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {loading ? (
              <>
                <StatCard
                  title=""
                  value=""
                  subtitle=""
                  icon={DollarSign}
                  loading
                />
                <StatCard
                  title=""
                  value=""
                  subtitle=""
                  icon={TrendingUp}
                  loading
                />
                <StatCard title="" value="" subtitle="" icon={Wallet} loading />
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
                  title="Total Deposits"
                  value={formatCurrency(project.balance.total_deposits)}
                  subtitle="Money deposited"
                  icon={DollarSign}
                />
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
                  title="Unallocated Balance"
                  value={formatCurrency(project.balance.unallocated_balance)}
                  subtitle="Available funds"
                  icon={DollarSign}
                />
              </>
            ) : null}
          </div>

          {/* Project Information Cards */}
          <div>
            <h2 className="text-xsm font-bold text-gray-900 mb-4">
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
                  {/* Project Code Card */}
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

                  {/* Project Name Card */}
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

                  {/* Status Card */}
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

                  {/* Description Card */}
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

                  {/* Start Date Card */}
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

                  {/* End Date Card */}
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

                  {/* Last Updated Card */}
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

            {/* User Assignment Section - Only for admins and finance managers */}
            {canManageUsers && !loading && (
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
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
                    Assign User
                  </button>
                </div>
              </div>
            )}

            {/* Users Table */}
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
    </div>
  );
};

export default ProjectDetailsPage;
