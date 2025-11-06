"use client";

import { useState, useEffect, useRef } from "react";
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
  MoreVertical,
  Check,
  X,
  Loader2,
} from "lucide-react";

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: "admin" | "user";
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
  amount: string;
  description?: string;
  proof_image?: string;
  allocated_by?: string;
  allocated_at: string;
  status: string;
  project_code?: string;
  project_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
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
  onDelete?: (item: TableData) => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onAssign?: (item: TableData) => void;
  onView?: (item: TableData) => void;
  showActions?: boolean;
  currentUserRole?: string;
  currentUserId?: string;
  pagination?: {
    current_page: number;
    per_page: number;
    total: number;
    total_pages: number;
    has_next_page: boolean;
    has_previous_page: boolean;
  };
  onPageChange?: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
  actionLoading?: boolean;
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

// Actions Dropdown Component
interface ActionsDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  actions: Array<{
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    color?: string;
  }>;
  loading?: boolean;
  position: { top: number; left: number };
}

function ActionsDropdown({ isOpen, onClose, actions, loading, position }: ActionsDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="fixed z-[100] bg-white rounded-lg shadow-xl border border-secondary py-1 min-w-[160px]"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      {loading ? (
        <div className="px-4 py-3 flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="ml-2 text-xs text-gray-600">Processing...</span>
        </div>
      ) : (
        actions.map((action, index) => (
          <button
            key={index}
            onClick={() => {
              action.onClick();
              onClose();
            }}
            className={`w-full px-4 py-2 text-left text-xs flex items-center gap-2 hover:bg-gray-50 transition-colors ${
              action.color || 'text-gray-700'
            }`}
          >
            {action.icon}
            {action.label}
          </button>
        ))
      )}
    </div>
  );
}

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
  pagination,
  onPageChange,
  onPerPageChange,
  actionLoading = false,
}: DataTableProps) {
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

  // Get current user info if not provided
  const userRole = currentUserRole || getCurrentUserRole();
  const userId = currentUserId || getCurrentUserId();
  
  const isAdmin = userRole === 'admin';
  const isFinanceManager = false;
  const isNormalUser = userRole === 'user';

  const handleOpenDropdown = (itemId: string, event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation(); // Prevent event bubbling
    
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    const tableContainer = button.closest('.overflow-x-auto');
    const scrollLeft = tableContainer?.scrollLeft || 0;
    
    // Calculate position relative to viewport
    const left = rect.left + window.scrollX - 120 + scrollLeft;
    const top = rect.bottom + window.scrollY + 4;
    
    setDropdownPosition({
      top: top,
      left: left,
    });
    setOpenDropdownId(itemId);
  };

  const handleCloseDropdown = () => {
    setOpenDropdownId(null);
  };

  // Close dropdown when clicking outside or scrolling
  useEffect(() => {
    const handleScroll = () => {
      if (openDropdownId) {
        handleCloseDropdown();
      }
    };

    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [openDropdownId]);

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    if (!pagination) return [];
    
    const { current_page, total_pages } = pagination;
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;
    
    if (total_pages <= maxVisiblePages + 2) {
      for (let i = 1; i <= total_pages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      if (current_page > 3) {
        pages.push('...');
      }
      
      const start = Math.max(2, current_page - 1);
      const end = Math.min(total_pages - 1, current_page + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (current_page < total_pages - 2) {
        pages.push('...');
      }
      
      pages.push(total_pages);
    }
    
    return pages;
  };

  const getItemActions = (item: TableData) => {
    const actions: Array<{
      label: string;
      icon: React.ReactNode;
      onClick: () => void;
      color?: string;
    }> = [];
  
    switch (type) {
      case "users":
        const user = item as User;
        if (canView(user) && onView) {
          actions.push({
            label: 'View Details',
            icon: <Eye className="h-4 w-4" />,
            onClick: () => onView(user),
            color: 'text-blue-600',
          });
        }
        if (canEdit(user) && onEdit) {
          actions.push({
            label: 'Edit User',
            icon: <Edit3 className="h-4 w-4" />,
            onClick: () => onEdit(user),
            color: 'text-primary',
          });
        }
        if (canAssign(user) && onAssign) {
          actions.push({
            label: 'Assign Projects',
            icon: <Folder className="h-4 w-4" />,
            onClick: () => onAssign(user),
            color: 'text-blue-600',
          });
        }
        if (canDelete(user) && onDelete) {
          actions.push({
            label: 'Delete User',
            icon: <Trash2 className="h-4 w-4" />,
            onClick: () => onDelete(user),
            color: 'text-red-600',
          });
        }
        break;
  
      case "projects":
        const project = item as Project;
        if (canView(project) && onView) {
          actions.push({
            label: 'View Details',
            icon: <Eye className="h-4 w-4" />,
            onClick: () => onView(project),
            color: 'text-blue-600',
          });
        }
        if (canEdit(project) && onEdit) {
          actions.push({
            label: 'Edit Project',
            icon: <Edit3 className="h-4 w-4" />,
            onClick: () => onEdit(project),
            color: 'text-primary',
          });
        }
        if (canDelete(project) && onDelete) {
          actions.push({
            label: 'Delete Project',
            icon: <Trash2 className="h-4 w-4" />,
            onClick: () => onDelete(project),
            color: 'text-red-600',
          });
        }
        break;
  
      case "expenses":
        const expense = item as Expense;
        if (canView(expense) && onView) {
          actions.push({
            label: 'View Details',
            icon: <Eye className="h-4 w-4" />,
            onClick: () => onView(expense),
            color: 'text-blue-600',
          });
        }
        if (canApproveReject(expense)) {
          if (onApprove) {
            actions.push({
              label: 'Approve',
              icon: <Check className="h-4 w-4" />,
              onClick: () => onApprove(expense.id),
              color: 'text-green-600',
            });
          }
          if (onReject) {
            actions.push({
              label: 'Reject',
              icon: <X className="h-4 w-4" />,
              onClick: () => onReject(expense.id),
              color: 'text-red-600',
            });
          }
        }
        if (canEdit(expense) && onEdit) {
          actions.push({
            label: 'Edit Expense',
            icon: <Edit3 className="h-4 w-4" />,
            onClick: () => onEdit(expense),
            color: 'text-primary',
          });
        }
        if (canDelete(expense) && onDelete) {
          actions.push({
            label: 'Delete Expense',
            icon: <Trash2 className="h-4 w-4" />,
            onClick: () => onDelete(expense),
            color: 'text-red-600',
          });
        }
        break;
  
        case "allocations":
          const allocation = item as Allocation;
          if (canView(allocation) && onView) {
            actions.push({
              label: 'View Details',
              icon: <Eye className="h-4 w-4" />,
              onClick: () => onView(allocation),
              color: 'text-blue-600',
            });
          }
          if (canEdit(allocation) && onEdit) {
            actions.push({
              label: 'Edit Allocation',
              icon: <Edit3 className="h-4 w-4" />,
              onClick: () => onEdit(allocation),
              color: 'text-primary',
            });
          }
          if (canDelete(allocation) && onDelete) {
            actions.push({
              label: 'Delete Allocation',
              icon: <Trash2 className="h-4 w-4" />,
              onClick: () => onDelete(allocation),
              color: 'text-red-600',
            });
          }
          break;
      case "finances":
        const finance = item as Finance;
        if (canEdit(finance) && onEdit) {
          actions.push({
            label: 'Edit Finance',
            icon: <Edit3 className="h-4 w-4" />,
            onClick: () => onEdit(finance),
            color: 'text-primary',
          });
        }
        break;
    }
  
    return actions;
  };

  // Check if user can perform actions based on type and role
  const canEdit = (item: TableData): boolean => {
    if (!showActions) return false;
    
    switch (type) {
      case "users":
        return isAdmin;
      case "projects":
        return isAdmin;
      case "expenses":
        const expense = item as Expense;
        if (isNormalUser && expense.user_id === userId && expense.status === 'pending') {
          return true;
        }
        return isAdmin;
      case "allocations":
        return isAdmin;
      case "finances":
        return isAdmin;
      default:
        return false;
    }
  };

  const canDelete = (item: TableData): boolean => {
    if (!showActions) return false;
    
    switch (type) {
      case "users":
        return isAdmin;
      case "projects":
        return isAdmin;
      case "expenses":
        const expense = item as Expense;
        if (isNormalUser && expense.user_id === userId && expense.status === 'pending') {
          return true;
        }
        return isAdmin;
      case "allocations":
        return isAdmin || isFinanceManager;
      case "finances":
        return isAdmin;
      default:
        return false;
    }
  };

  const canApproveReject = (item: TableData): boolean => {
    if (!showActions) return false;
    
    switch (type) {
      case "expenses":
        return (isAdmin) && (item as Expense).status === 'pending';
      default:
        return false;
    }
  };

  const canAssign = (item: TableData): boolean => {
    if (!showActions) return false;
    
    switch (type) {
      case "users":
        return isAdmin;
      default:
        return false;
    }
  };

  const canView = (item: TableData): boolean => {
    return true;
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800";
      case "finance_manager":
        return "bg-gray-100 text-gray-800";
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

  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "UGX",
    }).format(numAmount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
              Project
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              User
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Amount
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Description
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
            <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
              Description
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
              Project
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
              Amount
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
              Date
            </th>
            {showActions && (isAdmin || isFinanceManager) && (
              <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
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
    const actions = getItemActions(item);
    const itemId = (item as any).id;

    switch (type) {
      case "users":
        const user = item as User;
        return (
          <tr
            key={user.id}
            className="border-b border-secondary hover:bg-gray-50 transition-colors"
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
            {showActions && actions.length > 0 && (
              <td className="px-4 py-3 whitespace-nowrap text-xs relative">
                <button
                  onClick={(e) => handleOpenDropdown(itemId, e)}
                  disabled={actionLoading}
                  className="p-1 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                >
                  {actionLoading && openDropdownId === itemId ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : (
                    <MoreVertical className="h-4 w-4 text-gray-600" />
                  )}
                </button>
              </td>
            )}
          </tr>
        );

      case "projects":
        const project = item as Project;
        return (
          <tr
            key={project.id}
            className="border-b border-secondary hover:bg-gray-50 transition-colors"
          >
            <td className="px-4 py-3 whitespace-nowrap text-xs font-medium text-gray-900">
              {project.project_code}
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900">
              {project.name}
            </td>
            <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">
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
            {showActions && actions.length > 0 && (
              <td className="px-4 py-3 whitespace-nowrap text-xs relative">
                <button
                  onClick={(e) => handleOpenDropdown(itemId, e)}
                  disabled={actionLoading}
                  className="p-1 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                >
                  {actionLoading && openDropdownId === itemId ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : (
                    <MoreVertical className="h-4 w-4 text-gray-600" />
                  )}
                </button>
              </td>
            )}
          </tr>
        );

      case "expenses":
        const expense = item as Expense;
        return (
          <tr
            key={expense.id}
            className="border-b border-secondary hover:bg-gray-50 transition-colors"
          >
            <td className="px-4 py-3 text-xs text-gray-900 max-w-xs truncate">
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
            {showActions && actions.length > 0 && (
              <td className="px-4 py-3 whitespace-nowrap text-xs relative">
                <button
                  onClick={(e) => handleOpenDropdown(itemId, e)}
                  disabled={actionLoading}
                  className="p-1 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                >
                  {actionLoading && openDropdownId === itemId ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : (
                    <MoreVertical className="h-4 w-4 text-gray-600" />
                  )}
                </button>
              </td>
            )}
          </tr>
        );

      case "allocations":
        const allocation = item as Allocation;
        return (
          <tr
            key={allocation.id}
            className="border-b border-secondary hover:bg-gray-50 transition-colors"
          >
            <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900">
              <div className="flex flex-col">
                <span className="font-medium">{allocation.project_code || "-"}</span>
                <span className="text-gray-500">{allocation.project_name || "-"}</span>
              </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900">
              <div className="flex flex-col">
                <span className="font-medium">
                  {allocation.first_name} {allocation.last_name}
                </span>
                <span className="text-gray-500">{allocation.email || "-"}</span>
              </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-xs font-medium text-gray-900">
              {formatCurrency(allocation.amount)}
            </td>
            <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">
              {allocation.description || "-"}
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
              {formatDate(allocation.allocated_at)}
            </td>
            {showActions && actions.length > 0 && (
              <td className="px-4 py-3 whitespace-nowrap text-xs relative">
                <button
                  onClick={(e) => handleOpenDropdown(itemId, e)}
                  disabled={actionLoading}
                  className="p-1 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                >
                  {actionLoading && openDropdownId === itemId ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : (
                    <MoreVertical className="h-4 w-4 text-gray-600" />
                  )}
                </button>
              </td>
            )}
          </tr>
        );

      case "finances":
        const finance = item as Finance;
        return (
          <tr
            key={finance.id}
            className="border-b border-secondary hover:bg-gray-50 transition-colors"
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
            {showActions && (isAdmin || isFinanceManager) && actions.length > 0 && (
              <td className="px-4 py-3 whitespace-nowrap text-xs relative">
                <button
                  onClick={(e) => handleOpenDropdown(itemId, e)}
                  disabled={actionLoading}
                  className="p-1 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                >
                  {actionLoading && openDropdownId === itemId ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : (
                    <MoreVertical className="h-4 w-4 text-gray-600" />
                  )}
                </button>
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
          return showActions ? 6 : 5;
        case "projects":
          return showActions ? 6 : 5;
        case "expenses":
          return showActions ? 7 : 6;
        case "allocations":
          return showActions ? 7 : 6;
        case "finances":
          return showActions && (isAdmin || isFinanceManager) ? 5 : 4;
        default:
          return 6;
      }
    };

    return (
      <tr className="border-b border-secondary">
        {Array.from({ length: getSkeletonCols() }).map((_, index) => (
          <td key={index} className="px-4 py-3">
            <div className="animate-pulse bg-gray-200 rounded h-4"></div>
          </td>
        ))}
      </tr>
    );
  };

  return (
    <div className="bg-white overflow-hidden">
      {/* Global Loading Overlay */}
      {actionLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex flex-col items-center gap-3 shadow-xl">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-gray-900">Processing...</p>
            <p className="text-xs text-gray-500">Please wait</p>
          </div>
        </div>
      )}

      {/* Actions Dropdown */}
      {openDropdownId && (
        <ActionsDropdown
          isOpen={!!openDropdownId}
          onClose={handleCloseDropdown}
          actions={getItemActions(data.find((item: any) => item.id === openDropdownId)!)}
          loading={actionLoading}
          position={dropdownPosition}
        />
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-secondary">
            <tr>{renderTableHeaders()}</tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <SkeletonRow key={index} />
              ))
            ) : data.length > 0 ? (
              data.map((item) => renderTableRow(item))
            ) : (
              <tr>
                <td 
                  colSpan={
                    type === "users" ? (showActions ? 6 : 5) :
                    type === "projects" ? (showActions ? 6 : 5) :
                    type === "expenses" ? (showActions ? 7 : 6) :
                    type === "allocations" ? (showActions ? 7 : 6) :
                    type === "finances" ? (showActions && (isAdmin || isFinanceManager) ? 5 : 4) :
                    6
                  } 
                  className="px-4 py-12 text-center"
                >
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
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
                          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">No data found</p>
                      <p className="text-xs text-gray-500 mt-1">There are no records to display</p>
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Professional Pagination */}
      {pagination && pagination.total > 0 && (
        <div className="bg-white px-4 py-4 border-t border-secondary">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Results Info */}
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-700">
                Showing <span className="font-medium">{((pagination.current_page - 1) * pagination.per_page) + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min(pagination.current_page * pagination.per_page, pagination.total)}
                </span>{' '}
                of <span className="font-medium">{pagination.total}</span> results
              </span>
              
              {/* Per Page Selector */}
              {onPerPageChange && (
                <select
                  value={pagination.per_page}
                  onChange={(e) => onPerPageChange(Number(e.target.value))}
                  className="border border-secondary rounded-md px-3 py-1.5 text-xs focus:ring-2 focus:ring-primary focus:border-primary"
                  disabled={loading || actionLoading}
                >
                  <option value={5}>5 per page</option>
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page</option>
                  <option value={50}>50 per page</option>
                </select>
              )}
            </div>

            {/* Pagination Controls */}
            {onPageChange && (
              <div className="flex items-center gap-1">
                {/* First Page */}
                <button
                  onClick={() => onPageChange(1)}
                  disabled={!pagination.has_previous_page || loading || actionLoading}
                  className="p-2 rounded-md border border-secondary bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="First page"
                >
                  <ChevronsLeft className="h-4 w-4 text-gray-600" />
                </button>

                {/* Previous Page */}
                <button
                  onClick={() => onPageChange(pagination.current_page - 1)}
                  disabled={!pagination.has_previous_page || loading || actionLoading}
                  className="p-2 rounded-md border border-secondary bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Previous page"
                >
                  <ChevronLeft className="h-4 w-4 text-gray-600" />
                </button>

                {/* Page Numbers */}
                <div className="hidden sm:flex items-center gap-1">
                  {getPageNumbers().map((page, index) => (
                    page === '...' ? (
                      <span key={`ellipsis-${index}`} className="px-3 py-1.5 text-xs text-gray-500">
                        ...
                      </span>
                    ) : (
                      <button
                        key={page}
                        onClick={() => onPageChange(page as number)}
                        disabled={loading || actionLoading}
                        className={`min-w-[32px] px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                          page === pagination.current_page
                            ? 'bg-primary text-black border border-primary'
                            : 'border border-secondary bg-white hover:bg-gray-50 text-gray-700'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {page}
                      </button>
                    )
                  ))}
                </div>

                {/* Mobile Page Info */}
                <div className="sm:hidden px-3 py-1.5 border border-secondary rounded-md bg-white text-xs font-medium">
                  {pagination.current_page} / {pagination.total_pages}
                </div>

                {/* Next Page */}
                <button
                  onClick={() => onPageChange(pagination.current_page + 1)}
                  disabled={!pagination.has_next_page || loading || actionLoading}
                  className="p-2 rounded-md border border-secondary bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Next page"
                >
                  <ChevronRight className="h-4 w-4 text-gray-600" />
                </button>

                {/* Last Page */}
                <button
                  onClick={() => onPageChange(pagination.total_pages)}
                  disabled={!pagination.has_next_page || loading || actionLoading}
                  className="p-2 rounded-md border border-secondary bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Last page"
                >
                  <ChevronsRight className="h-4 w-4 text-gray-600" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}