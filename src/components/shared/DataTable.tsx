"use client";

import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Edit3,
  Trash2,
  Phone,
  CheckCircle,
  XCircle,
  Clock,
  Folder,
  Eye,
} from "lucide-react";

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: "admin" | "finance_manager" | "user";
  status: "active" | "inactive" | "suspended";
  created_at: string;
  updated_at: string;
  assigned_projects?: Project[];
}

interface Project {
  id: string;
  project_code: string;
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  status: "planning" | "active" | "completed" | "cancelled" | "closed";
  created_at: string;
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

interface Expense {
  id: string;
  project_id: string;
  amount: number;
  description: string;
  category?: string;
  status: "pending" | "approved" | "rejected";
  receipt_image?: string;
  created_at: string;
  project_name?: string;
  user_id?: string;
}

interface Allocation {
  id: string;
  project_id: string;
  user_id: string;
  amount: number;
  description?: string;
  status: "active" | "completed" | "cancelled";
  proof_image?: string;
  created_at: string;
  user_name?: string;
  project_name?: string;
}

interface Finance {
  id: string;
  project_id: string;
  amount: number;
  description?: string;
  created_at: string;
  project_name?: string;
}

type TableData = User | Project | Expense | Allocation | Finance;

interface DataTableProps {
  data: TableData[];
  loading: boolean;
  type: "users" | "projects" | "expenses" | "allocations" | "finances";
  onEdit?: (item: TableData) => void;
  onDelete?: (id: string) => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onAssign?: (item: TableData) => void;
  onView?: (item: TableData) => void;
  showActions?: boolean;
  currentUserRole?: string;
  currentUserId?: string;
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

export function DataTable({
  data,
  loading,
  type,
  onEdit,
  onDelete,
  onApprove,
  onReject,
  onAssign,
  onView,
  showActions = true,
  currentUserRole,
  currentUserId,
}: DataTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // Get current user info if not provided
  const userRole = currentUserRole || getCurrentUserRole();
  const userId = currentUserId || getCurrentUserId();
  
  const isAdmin = userRole === 'admin';
  const isFinanceManager = userRole === 'finance_manager';
  const isNormalUser = userRole === 'user';

  // Calculate pagination
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = data.slice(startIndex, endIndex);

  // Reset to first page when data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [data.length]);

  // Check if user can perform actions based on type and role
  const canEdit = (item: TableData): boolean => {
    if (!showActions) return false;
    
    switch (type) {
      case "users":
        return isAdmin; // Only admin can edit users
      case "projects":
        return isAdmin || isFinanceManager; // Admin and finance managers can edit projects
      case "expenses":
        const expense = item as Expense;
        // Users can only edit their own pending expenses
        if (isNormalUser && expense.user_id === userId && expense.status === 'pending') {
          return true;
        }
        // Admin and finance managers can edit any expense
        return isAdmin || isFinanceManager;
      case "allocations":
        return isAdmin || isFinanceManager; // Only admin/finance managers can edit allocations
      case "finances":
        return isAdmin || isFinanceManager; // Only admin/finance managers can edit finances
      default:
        return false;
    }
  };

  const canDelete = (item: TableData): boolean => {
    if (!showActions) return false;
    
    switch (type) {
      case "users":
        return isAdmin; // Only admin can delete users
      case "projects":
        return isAdmin; // Only admin can delete projects
      case "expenses":
        const expense = item as Expense;
        // Users can only delete their own pending expenses
        if (isNormalUser && expense.user_id === userId && expense.status === 'pending') {
          return true;
        }
        // Admin and finance managers can delete any expense
        return isAdmin || isFinanceManager;
      case "allocations":
        return isAdmin || isFinanceManager; // Only admin/finance managers can delete allocations
      case "finances":
        return isAdmin; // Only admin can delete finances
      default:
        return false;
    }
  };

  const canApproveReject = (item: TableData): boolean => {
    if (!showActions) return false;
    
    switch (type) {
      case "expenses":
        // Only admin and finance managers can approve/reject expenses
        return (isAdmin || isFinanceManager) && (item as Expense).status === 'pending';
      default:
        return false;
    }
  };

  const canAssign = (item: TableData): boolean => {
    if (!showActions) return false;
    
    switch (type) {
      case "users":
        // Only admin and finance managers can assign users to projects
        return isAdmin || isFinanceManager;
      default:
        return false;
    }
  };

  const canView = (item: TableData): boolean => {
    // Everyone can view details
    return true;
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800";
      case "finance_manager":
        return "bg-primary/20 text-primary";
      case "user":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
      case "approved":
      case "completed":
        return "bg-green-100 text-green-800";
      case "inactive":
      case "cancelled":
      case "rejected":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "planning":
        return "bg-primary/20 text-primary";
      case "closed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
      case "approved":
      case "completed":
        return <CheckCircle className="h-3 w-3" />;
      case "inactive":
      case "cancelled":
      case "rejected":
        return <XCircle className="h-3 w-3" />;
      case "pending":
      case "planning":
        return <Clock className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Render different columns based on data type
  const renderTableHeaders = () => {
    switch (type) {
      case "users":
        return (
          <>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              User
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Contact
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Role
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Created
            </th>
            {showActions && (
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            )}
          </>
        );
      case "projects":
        return (
          <>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Project Code
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Description
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Start Date
            </th>
            {showActions && (
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            )}
          </>
        );
      case "expenses":
        return (
          <>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Description
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Project
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Amount
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Category
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            {showActions && (
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            )}
          </>
        );
      case "allocations":
        return (
          <>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Description
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Project
            </th>
            {isAdmin || isFinanceManager ? (
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
            ) : null}
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Amount
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            {showActions && (
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            )}
          </>
        );
      case "finances":
        return (
          <>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Description
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Project
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Amount
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            {showActions && (isAdmin || isFinanceManager) && (
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            )}
          </>
        );
      default:
        return null;
    }
  };

  const renderTableRow = (item: TableData) => {
    switch (type) {
      case "users":
        const user = item as User;
        return (
          <tr
            key={user.id}
            className="border-b border-gray-200 hover:bg-gray-50"
          >
            <td className="px-4 py-3 whitespace-nowrap">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-primary/20 rounded-full flex items-center justify-center mr-3">
                  <span className="text-black font-medium text-xs">
                    {user.first_name[0]}
                    {user.last_name[0]}
                  </span>
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-900">
                    {user.first_name} {user.last_name}
                  </div>
                  <div className="text-xs text-gray-500">{user.email}</div>
                </div>
              </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
              {user.phone ? (
                <div className="flex items-center text-xs text-gray-900">
                  <Phone className="h-3 w-3 mr-1" />
                  {user.phone}
                </div>
              ) : (
                <span className="text-xs text-gray-400">-</span>
              )}
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
              <span
                className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(
                  user.role
                )}`}
              >
                {user.role.replace("_", " ")}
              </span>
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
              <div
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                  user.status
                )}`}
              >
                {getStatusIcon(user.status)}
                <span className="ml-1">{user.status}</span>
              </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
              {formatDate(user.created_at)}
            </td>
            {showActions && (
              <td className="px-4 py-3 whitespace-nowrap text-xs">
                <div className="flex items-center space-x-2">
                  {canEdit(user) && (
                    <button
                      onClick={() => onEdit?.(user)}
                      className="text-black hover:text-primary"
                      title="Edit user"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                  )}
                  {canAssign(user) && (
                    <button
                      onClick={() => onAssign?.(user)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Assign to projects"
                    >
                      <Folder className="h-4 w-4" />
                    </button>
                  )}
                  {canDelete(user) && (
                    <button
                      onClick={() => onDelete?.(user.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete user"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </td>
            )}
          </tr>
        );

      case "projects":
        const project = item as Project;
        return (
          <tr
            key={project.id}
            className="border-b border-gray-200 hover:bg-gray-50"
          >
            <td className="px-4 py-3 whitespace-nowrap text-xs font-medium text-gray-900">
              {project.project_code}
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900">
              {project.name}
            </td>
            <td className="px-4 py-3 text-xs text-gray-500">
              {project.description || "-"}
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
              <div
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                  project.status
                )}`}
              >
                {getStatusIcon(project.status)}
                <span className="ml-1">{project.status}</span>
              </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
              {project.start_date ? formatDate(project.start_date) : "-"}
            </td>
            {showActions && (
              <td className="px-4 py-3 whitespace-nowrap text-xs">
                <div className="flex items-center space-x-2">
                  {canView(project) && (
                    <button
                      onClick={() => onView?.(project)}
                      className="text-blue-600 hover:text-blue-800"
                      title="View details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  )}
                  {canEdit(project) && (
                    <button
                      onClick={() => onEdit?.(project)}
                      className="text-primary hover:text-primary"
                      title="Edit project"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                  )}
                  {canDelete(project) && (
                    <button
                      onClick={() => onDelete?.(project.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete project"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </td>
            )}
          </tr>
        );

      case "expenses":
        const expense = item as Expense;
        return (
          <tr
            key={expense.id}
            className="border-b border-gray-200 hover:bg-gray-50"
          >
            <td className="px-4 py-3 text-xs text-gray-900">
              {expense.description}
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
              {expense.project_name || "-"}
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-xs font-medium text-gray-900">
              {formatCurrency(expense.amount)}
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
              {expense.category || "-"}
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
              <div
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                  expense.status
                )}`}
              >
                {getStatusIcon(expense.status)}
                <span className="ml-1">{expense.status}</span>
              </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
              {formatDate(expense.created_at)}
            </td>
            {showActions && (
              <td className="px-4 py-3 whitespace-nowrap text-xs">
                <div className="flex items-center space-x-2">
                  {canApproveReject(expense) && (
                    <>
                      <button
                        onClick={() => onApprove?.(expense.id)}
                        className="text-green-600 hover:text-green-900 text-xs"
                        title="Approve expense"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => onReject?.(expense.id)}
                        className="text-red-600 hover:text-red-900 text-xs"
                        title="Reject expense"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {canEdit(expense) && (
                    <button
                      onClick={() => onEdit?.(expense)}
                      className="text-primary hover:text-primary"
                      title="Edit expense"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                  )}
                  {canDelete(expense) && (
                    <button
                      onClick={() => onDelete?.(expense.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete expense"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </td>
            )}
          </tr>
        );

      case "allocations":
        const allocation = item as Allocation;
        return (
          <tr
            key={allocation.id}
            className="border-b border-gray-200 hover:bg-gray-50"
          >
            <td className="px-4 py-3 text-xs text-gray-900">
              {allocation.description || "-"}
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
              {allocation.project_name || "-"}
            </td>
            {(isAdmin || isFinanceManager) && (
              <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                {allocation.user_name || "-"}
              </td>
            )}
            <td className="px-4 py-3 whitespace-nowrap text-xs font-medium text-gray-900">
              {formatCurrency(allocation.amount)}
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
              <div
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                  allocation.status
                )}`}
              >
                {getStatusIcon(allocation.status)}
                <span className="ml-1">{allocation.status}</span>
              </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
              {formatDate(allocation.created_at)}
            </td>
            {showActions && (
              <td className="px-4 py-3 whitespace-nowrap text-xs">
                <div className="flex items-center space-x-2">
                  {canEdit(allocation) && (
                    <button
                      onClick={() => onEdit?.(allocation)}
                      className="text-primary hover:text-primary"
                      title="Edit allocation"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                  )}
                  {canDelete(allocation) && (
                    <button
                      onClick={() => onDelete?.(allocation.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete allocation"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </td>
            )}
          </tr>
        );

      case "finances":
        const finance = item as Finance;
        return (
          <tr
            key={finance.id}
            className="border-b border-gray-200 hover:bg-gray-50"
          >
            <td className="px-4 py-3 text-xs text-gray-900">
              {finance.description || "Deposit"}
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
              {finance.project_name || "-"}
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-xs font-medium text-gray-900">
              {formatCurrency(finance.amount)}
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
              {formatDate(finance.created_at)}
            </td>
            {showActions && (isAdmin || isFinanceManager) && (
              <td className="px-4 py-3 whitespace-nowrap text-xs">
                <div className="flex items-center space-x-2">
                  {canEdit(finance) && (
                    <button
                      onClick={() => onEdit?.(finance)}
                      className="text-primary hover:text-primary"
                      title="Edit finance"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </td>
            )}
          </tr>
        );

      default:
        return null;
    }
  };

  const SkeletonRow = () => {
    const getSkeletonCols = () => {
      switch (type) {
        case "users":
          return 6;
        case "projects":
          return 6;
        case "expenses":
          return 7;
        case "allocations":
          return (isAdmin || isFinanceManager) ? 7 : 6;
        case "finances":
          return (isAdmin || isFinanceManager) ? 5 : 4;
        default:
          return 6;
      }
    };

    return (
      <tr className="border-b border-gray-200">
        {Array.from({ length: getSkeletonCols() }).map((_, index) => (
          <td key={index} className="px-4 py-3">
            <div className="animate-pulse bg-gray-200 rounded h-4"></div>
          </td>
        ))}
      </tr>
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-xs">
          <thead className="bg-gray-50">
            <tr>{renderTableHeaders()}</tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <SkeletonRow key={index} />
              ))
            ) : currentData.length > 0 ? (
              currentData.map((item) => renderTableRow(item))
            ) : (
              <tr>
                <td 
                  colSpan={
                    type === "users" ? (showActions ? 6 : 5) :
                    type === "projects" ? (showActions ? 6 : 5) :
                    type === "expenses" ? (showActions ? 7 : 6) :
                    type === "allocations" ? ((isAdmin || isFinanceManager) ? (showActions ? 7 : 6) : (showActions ? 6 : 5)) :
                    type === "finances" ? ((isAdmin || isFinanceManager) ? (showActions ? 5 : 4) : 4) :
                    6
                  } 
                  className="px-4 py-8 text-center"
                >
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <svg
                      className="w-8 h-8 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"
                      />
                    </svg>
                    <span className="text-xs text-gray-500">No data found</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data.length > 0 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex items-center space-x-4">
            <span className="text-xs text-gray-700">
              Showing {startIndex + 1} to {Math.min(endIndex, data.length)} of{" "}
              {data.length} results
            </span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1 text-xs"
            >
              <option value={5}>5 per page</option>
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
            </select>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-2 py-1 rounded-l-md border border-gray-300 bg-white text-xs font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronsLeft className="h-3 w-3" />
            </button>
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-2 py-1 border border-gray-300 bg-white text-xs font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-3 w-3" />
            </button>

            <span className="relative inline-flex items-center px-3 py-1 border border-gray-300 bg-white text-xs font-medium text-gray-700">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center px-2 py-1 border border-gray-300 bg-white text-xs font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-3 w-3" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center px-2 py-1 rounded-r-md border border-gray-300 bg-white text-xs font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronsRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}