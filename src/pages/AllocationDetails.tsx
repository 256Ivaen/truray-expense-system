"use client";

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  DollarSign,
  Calendar,
  FileText,
  Clock,
  Tag,
  User,
  CheckCircle,
  Folder,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import { get } from "../utils/service";
import { toast } from "sonner";
import { StatCard } from "../components/shared/StatCard";

interface Allocation {
  id: string;
  project_id: string;
  amount: string;
  description?: string;
  proof_image: string | null;
  allocated_by: string;
  allocated_at: string;
  status: string;
  created_at: string;
  updated_at: string;
  project_code?: string;
  project_name?: string;
  project_status?: string;
  allocated_by_first_name?: string;
  allocated_by_last_name?: string;
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

const AllocationDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const allocationId = id as string;

  const [allocation, setAllocation] = useState<Allocation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (allocationId) {
      fetchAllocationDetails();
    }
  }, [allocationId]);

  const fetchAllocationDetails = async () => {
    setLoading(true);
    try {
      const response = await get(`/allocations/${allocationId}`);
      if (response.success) {
        setAllocation(response.data);
      } else {
        toast.error("Failed to fetch allocation details");
        navigate("/allocations");
      }
    } catch (error) {
      console.error("Error fetching allocation:", error);
      toast.error("Error loading allocation details");
      navigate("/allocations");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "UGX",
    }).format(parseFloat(amount));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getProjectStatusColor = (status: string) => {
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 w-full">
              <button
                onClick={() => navigate("/allocations")}
                className="p-2 bg-primary/40 rounded-full transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-secondary" />
              </button>
              {loading ? (
                <HeaderSkeleton />
              ) : allocation ? (
                <div className="flex items-center justify-between w-full gap-4 px-3 py-2">
                  <h1 className="text-xl font-bold text-gray-900 flex-1 min-w-0 truncate">
                    Allocation Details
                  </h1>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`inline-flex items-center gap-2 px-3 py-1 text-xs font-medium rounded-full capitalize ${getStatusColor(
                        allocation.status
                      )}`}
                    >
                      <CheckCircle className="h-4 w-4" />
                      {allocation.status}
                    </span>
                    <span className="text-xs text-gray-500">
                      Allocated {formatDate(allocation.allocated_at)}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

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
                <StatCard title="" value="" subtitle="" icon={Folder} loading />
                <StatCard title="" value="" subtitle="" icon={Clock} loading />
                <StatCard title="" value="" subtitle="" icon={User} loading />
              </>
            ) : allocation ? (
              <>
                <StatCard
                  title="Amount Allocated"
                  value={formatCurrency(allocation.amount)}
                  subtitle="Total allocation"
                  icon={DollarSign}
                />
                <StatCard
                  title="Project"
                  value={allocation.project_code || "N/A"}
                  subtitle={allocation.project_name || ""}
                  icon={Folder}
                />
                <StatCard
                  title="Status"
                  value={allocation.status.toUpperCase()}
                  subtitle="Current status"
                  icon={Clock}
                />
                <StatCard
                  title="Allocated By"
                  value={`${allocation.allocated_by_first_name} ${allocation.allocated_by_last_name}`}
                  subtitle="Administrator"
                  icon={User}
                />
              </>
            ) : null}
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Allocation Information
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
              ) : allocation ? (
                <>
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-primary" />
                      </div>
                      <h3 className="text-xs font-medium text-gray-700">
                        Amount
                      </h3>
                    </div>
                    <p className="text-lg font-bold text-gray-900">
                      {formatCurrency(allocation.amount)}
                    </p>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <h3 className="text-xs font-medium text-gray-700">
                        Status
                      </h3>
                    </div>
                    <span
                      className={`inline-flex px-3 py-1.5 text-xs font-medium rounded-full capitalize ${getStatusColor(
                        allocation.status
                      )}`}
                    >
                      {allocation.status}
                    </span>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-orange-600" />
                      </div>
                      <h3 className="text-xs font-medium text-gray-700">
                        Allocated At
                      </h3>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatDate(allocation.allocated_at)}
                    </p>
                  </div>

                  {allocation.description && (
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
                        {allocation.description}
                      </p>
                    </div>
                  )}

                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                        <Folder className="h-5 w-5 text-indigo-600" />
                      </div>
                      <h3 className="text-xs font-medium text-gray-700">
                        Project Code
                      </h3>
                    </div>
                    <p className="text-sm font-bold text-gray-900">
                      {allocation.project_code}
                    </p>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Folder className="h-5 w-5 text-blue-600" />
                      </div>
                      <h3 className="text-xs font-medium text-gray-700">
                        Project Name
                      </h3>
                    </div>
                    <p className="text-sm font-bold text-gray-900">
                      {allocation.project_name}
                    </p>
                  </div>

                  {allocation.project_status && (
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-10 w-10 bg-teal-100 rounded-full flex items-center justify-center">
                          <Tag className="h-5 w-5 text-teal-600" />
                        </div>
                        <h3 className="text-xs font-medium text-gray-700">
                          Project Status
                        </h3>
                      </div>
                      <span
                        className={`inline-flex px-3 py-1.5 text-xs font-medium rounded-full capitalize ${getProjectStatusColor(
                          allocation.project_status
                        )}`}
                      >
                        {allocation.project_status}
                      </span>
                    </div>
                  )}

                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 bg-yellow-100 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-yellow-600" />
                      </div>
                      <h3 className="text-xs font-medium text-gray-700">
                        Allocated By
                      </h3>
                    </div>
                    <p className="text-sm font-bold text-gray-900">
                      {allocation.allocated_by_first_name}{" "}
                      {allocation.allocated_by_last_name}
                    </p>
                  </div>

                  {allocation.proof_image && (
                    <div className="bg-white rounded-xl border border-gray-200 p-6 sm:col-span-2 lg:col-span-3">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-10 w-10 bg-pink-100 rounded-full flex items-center justify-center">
                          <ImageIcon className="h-5 w-5 text-pink-600" />
                        </div>
                        <h3 className="text-xs font-medium text-gray-700">
                          Proof Image
                        </h3>
                      </div>
                      <img
                        src={allocation.proof_image}
                        alt="Proof"
                        className="w-full max-w-md rounded-lg border border-gray-200"
                      />
                    </div>
                  )}

                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <Clock className="h-5 w-5 text-gray-600" />
                      </div>
                      <h3 className="text-xs font-medium text-gray-700">
                        Created At
                      </h3>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatDate(allocation.created_at)}
                    </p>
                  </div>

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
                      {formatDate(allocation.updated_at)}
                    </p>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AllocationDetailsPage;