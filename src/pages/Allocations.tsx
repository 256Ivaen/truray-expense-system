"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wallet,
  Search,
  Filter,
  Plus,
  Clock,
  TrendingUp,
  CheckCircle,
  X,
  Upload,
  Loader2,
} from "lucide-react";
import { get, post, put, del, upload } from "../utils/service";
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

interface Project {
  id: string;
  project_code: string;
  name: string;
  status: "planning" | "active" | "completed" | "cancelled" | "closed";
}

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

interface CreateAllocationData {
  project_id: string;
  amount: number;
  description?: string;
  proof_image?: string;
}

interface UpdateAllocationData {
  project_id?: string;
  amount?: number;
  description?: string;
  status?: string;
}

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

const getCurrentUserId = () => {
  try {
    const userStr = localStorage.getItem("truray_user");
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.id;
    }
  } catch (error) {
    console.error("Error getting user ID:", error);
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

interface CreateAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateAllocationData) => void;
  projects: Project[];
  loading?: boolean;
}

function CreateAllocationModal({
  isOpen,
  onClose,
  onSubmit,
  projects,
  loading = false,
}: CreateAllocationModalProps) {
  const [form, setForm] = useState<CreateAllocationData>({
    project_id: "",
    amount: 0,
    description: "",
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

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

    if (selectedFile) {
      setUploadingImage(true);
      
      try {
        const imageUrl = await uploadImage(selectedFile);
        
        const allocationData = {
          project_id: form.project_id,
          amount: form.amount,
          description: form.description,
          proof_image: imageUrl
        };
        
        onSubmit(allocationData);
      } catch (error: any) {
        console.error('Error uploading image:', error);
        toast.error(error.message || 'Failed to upload proof image');
        setUploadingImage(false);
      }
    } else {
      onSubmit(form);
    }
  };

  const handleClose = () => {
    setForm({
      project_id: "",
      amount: 0,
      description: "",
    });
    setSelectedFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
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

  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50 ${
        isOpen ? "block" : "hidden"
      }`}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Create New Allocation
          </h2>
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
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.project_code} - {project.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Amount (UGX) *
            </label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={form.amount === 0 ? "" : form.amount}
              onChange={(e) =>
                setForm({
                  ...form,
                  amount: e.target.value === "" ? 0 : parseFloat(e.target.value),
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-xs"
              placeholder="0.00"
              disabled={loading || uploadingImage}
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
              placeholder="Allocation description..."
              disabled={loading || uploadingImage}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Proof Image
            </label>
            
            {!selectedFile ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="proof-image"
                  disabled={loading || uploadingImage}
                />
                <label htmlFor="proof-image" className="cursor-pointer block">
                  <Upload className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                  <span className="text-xs text-gray-600 font-medium">
                    Click to upload proof
                  </span>
                  <p className="text-xs text-gray-500 mt-1">
                    Upload proof of allocation (optional)
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
                      alt="Proof preview" 
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
              disabled={loading || uploadingImage}
              className="flex-1 px-4 py-2 bg-primary text-secondary rounded-lg hover:bg-primary/90 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {(loading || uploadingImage) && <Loader2 className="w-4 h-4 animate-spin" />}
              {uploadingImage ? "Uploading..." : loading ? "Creating..." : "Create Allocation"}
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
  loading?: boolean;
}

function EditAllocationModal({
  isOpen,
  onClose,
  onSubmit,
  allocation,
  projects,
  loading = false,
}: EditAllocationModalProps) {
  const [form, setForm] = useState<UpdateAllocationData>({
    project_id: "",
    amount: 0,
    description: "",
    status: "pending",
  });

  useEffect(() => {
    if (allocation) {
      setForm({
        project_id: allocation.project_id,
        amount: parseFloat(allocation.amount),
        description: allocation.description || "",
        status: allocation.status,
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
      className={`fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50 ${
        isOpen ? "block" : "hidden"
      }`}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Edit Allocation
          </h2>
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
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.project_code} - {project.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Amount (UGX)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.amount === 0 ? "" : form.amount}
              onChange={(e) =>
                setForm({
                  ...form,
                  amount: e.target.value === "" ? 0 : parseFloat(e.target.value),
                })
              }
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
              {loading ? "Updating..." : "Update Allocation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const AllocationsPage = () => {
  const navigate = useNavigate();
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAllocation, setSelectedAllocation] =
    useState<Allocation | null>(null);

  const currentUserRole = getCurrentUserRole();
  const currentUserId = getCurrentUserId();

  useEffect(() => {
    fetchAllocations();
    fetchProjects();
  }, []);

  const fetchAllocations = async () => {
    setLoading(true);
    try {
      const response = await get("/allocations");
      if (response.success) {
        setAllocations(response.data);
      } else {
        toast.error("Failed to fetch allocations");
      }
    } catch (error) {
      console.error("Error fetching allocations:", error);
      toast.error("Error loading allocations");
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await get("/projects");
      if (response.success) {
        setProjects(response.data);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  const handleCreateAllocation = async (data: CreateAllocationData) => {
    setActionLoading(true);
    try {
      const response = await post("/allocations", data);

      if (response.success) {
        toast.success("Allocation created successfully");
        setShowCreateModal(false);
        fetchAllocations();
      } else {
        toast.error(response.message || "Failed to create allocation");
      }
    } catch (error: any) {
      console.error("Error creating allocation:", error);
      toast.error(error.response?.data?.message || "Error creating allocation");
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
        toast.success("Allocation updated successfully");
        setShowEditModal(false);
        setSelectedAllocation(null);
        fetchAllocations();
      } else {
        toast.error(response.message || "Failed to update allocation");
      }
    } catch (error: any) {
      console.error("Error updating allocation:", error);
      toast.error(error.response?.data?.message || "Error updating allocation");
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
        toast.success("Allocation deleted successfully");
        setShowDeleteModal(false);
        setSelectedAllocation(null);
        fetchAllocations();
      } else {
        toast.error(response.message || "Failed to delete allocation");
      }
    } catch (error: any) {
      console.error("Error deleting allocation:", error);
      toast.error(error.response?.data?.message || "Error deleting allocation");
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewAllocation = (allocation: Allocation) => {
    navigate(`/allocations/${allocation.id}`);
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

  const filteredAllocations = allocations.filter((allocation) => {
    const matchesSearch =
      allocation.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      allocation.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      allocation.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      allocation.last_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || allocation.status === statusFilter;
    const matchesProject =
      projectFilter === "all" || allocation.project_id === projectFilter;

    return matchesSearch && matchesStatus && matchesProject;
  });

  const allocationStats = {
    totalAllocations: allocations.reduce(
      (sum, allocation) => sum + parseFloat(allocation.amount),
      0
    ),
    totalRecords: allocations.length,
    pendingAllocations: allocations.filter((a) => a.status === "pending").length,
    approvedAllocations: allocations.filter((a) => a.status === "approved")
      .length,
  };

  const formatCurrency = (amount: number) => {
    return `UGX ${amount.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  const transformedAllocations = filteredAllocations.map((allocation) => ({
    ...allocation,
    created_at: allocation.allocated_at,
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
                  Allocation Management
                </h1>
                <p className="text-xs text-gray-600 mt-1">
                  Track and manage fund allocations
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
              New Allocation
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            title="Total Allocations"
            value={formatCurrency(allocationStats.totalAllocations)}
            subtitle="All time total"
            icon={Wallet}
            loading={loading}
          />
          <StatCard
            title="Pending"
            value={allocationStats.pendingAllocations}
            subtitle="Awaiting approval"
            icon={Clock}
            loading={loading}
          />
          <StatCard
            title="Approved"
            value={allocationStats.approvedAllocations}
            subtitle="Completed allocations"
            icon={CheckCircle}
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
                    placeholder="Search allocations by description, project, or user..."
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
                  {projects.map((project) => (
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
                  Allocations ({filteredAllocations.length})
                </h2>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Filter className="h-4 w-4" />
                  <span>Filtered</span>
                </div>
              </div>
            )}
          </div>

          <DataTable
            data={transformedAllocations}
            loading={loading}
            type="allocations"
            onEdit={openEditModal}
            onDelete={openDeleteModal}
            onView={handleViewAllocation}
            currentUserRole={currentUserRole}
            currentUserId={currentUserId}
            actionLoading={actionLoading}
          />
        </div>
      </div>

      <CreateAllocationModal
        isOpen={showCreateModal}
        onClose={closeModals}
        onSubmit={handleCreateAllocation}
        projects={projects}
        loading={actionLoading}
      />

      <EditAllocationModal
        isOpen={showEditModal}
        onClose={closeModals}
        onSubmit={handleEditAllocation}
        allocation={selectedAllocation}
        projects={projects}
        loading={actionLoading}
      />

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