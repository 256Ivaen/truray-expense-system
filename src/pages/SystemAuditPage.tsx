"use client"

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronUp,
  Eye,
  Calendar,
  User,
  Shield,
  Database,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  X,
  FileText,
  Globe,
  Monitor
} from 'lucide-react'
import { get } from '../utils/service.js'

const SystemAuditPage = () => {
  const [auditLogs, setAuditLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({
    action: '',
    table_name: '',
    date_from: '',
    date_to: ''
  })
  const [showFilters, setShowFilters] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 20,
    total: 0,
    total_pages: 0
  })
  const [selectedLog, setSelectedLog] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  useEffect(() => {
    fetchAuditLogs()
  }, [pagination.page, filters])

  const fetchAuditLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        per_page: pagination.per_page,
        ...filters
      }).toString()

      const response = await get(`/audit/logs?${params}`)
      
      // Use the correct response structure from your data
      if (response && response.success && response.message) {
        const data = response.message.data || []
        const total = response.message.total || 0
        const totalPages = response.message.total_pages || 1
        
        setAuditLogs(Array.isArray(data) ? data : [])
        setPagination(prev => ({
          ...prev,
          total: total,
          total_pages: totalPages
        }))
      } else {
        // If response structure is unexpected, set empty array
        setAuditLogs([])
        setPagination(prev => ({
          ...prev,
          total: 0,
          total_pages: 0
        }))
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error)
      setAuditLogs([])
      setPagination(prev => ({
        ...prev,
        total: 0,
        total_pages: 0
      }))
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    fetchAuditLogs()
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const clearFilters = () => {
    setFilters({
      action: '',
      table_name: '',
      date_from: '',
      date_to: ''
    })
    setSearchQuery('')
  }

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }))
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const getActionIcon = (action) => {
    if (!action) return <Database className="w-4 h-4 text-gray-500" />
    if (action.includes('CREATE')) return <CheckCircle className="w-4 h-4 text-green-500" />
    if (action.includes('UPDATE')) return <RefreshCw className="w-4 h-4 text-blue-500" />
    if (action.includes('DELETE')) return <XCircle className="w-4 h-4 text-red-500" />
    if (action.includes('LOGIN')) return <Shield className="w-4 h-4 text-purple-500" />
    if (action.includes('LOGOUT')) return <Shield className="w-4 h-4 text-gray-500" />
    if (action.includes('APPROVE')) return <CheckCircle className="w-4 h-4 text-green-500" />
    if (action.includes('ASSIGN')) return <User className="w-4 h-4 text-orange-500" />
    return <Database className="w-4 h-4 text-gray-500" />
  }

  const getActionColor = (action) => {
    if (!action) return 'text-gray-600 bg-gray-50 border-gray-200'
    if (action.includes('CREATE')) return 'text-green-600 bg-green-50 border-green-200'
    if (action.includes('UPDATE')) return 'text-blue-600 bg-blue-50 border-blue-200'
    if (action.includes('DELETE')) return 'text-red-600 bg-red-50 border-red-200'
    if (action.includes('LOGIN')) return 'text-purple-600 bg-purple-50 border-purple-200'
    if (action.includes('LOGOUT')) return 'text-gray-600 bg-gray-50 border-gray-200'
    if (action.includes('APPROVE')) return 'text-green-600 bg-green-50 border-green-200'
    if (action.includes('ASSIGN')) return 'text-orange-600 bg-orange-50 border-orange-200'
    return 'text-gray-600 bg-gray-50 border-gray-200'
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date'
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (error) {
      return 'Invalid date'
    }
  }

  const formatActionText = (action) => {
    if (!action) return 'unknown action'
    return action.toLowerCase().replace(/_/g, ' ')
  }

  const getRecordDescription = (log) => {
    if (!log) return 'System action'
    
    // Use the description from the API response
    if (log.description) {
      return log.description
    }
    
    // Fallback to generating description
    if (log.table_name && log.record_id) {
      return `${log.table_name} record ${log.record_id}`
    }
    return 'System action'
  }

  const getUserDisplayName = (log) => {
    // Use user_name if available
    if (log.user_name) return log.user_name
    
    // Use record_details for login actions
    if (log.record_details && log.record_details.first_name && log.record_details.last_name) {
      return `${log.record_details.first_name} ${log.record_details.last_name}`
    }
    
    return 'System'
  }

  const handleViewDetails = (log) => {
    setSelectedLog(log)
    setShowDetailModal(true)
  }

  const closeDetailModal = () => {
    setShowDetailModal(false)
    setSelectedLog(null)
  }

  const Pagination = () => (
    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
      <div className="text-xs text-gray-700">
        Showing {((pagination.page - 1) * pagination.per_page) + 1} to{' '}
        {Math.min(pagination.page * pagination.per_page, pagination.total)} of{' '}
        {pagination.total} results
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => handlePageChange(pagination.page - 1)}
          disabled={pagination.page === 1}
          className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="px-3 py-1 text-xs text-gray-700">
          Page {pagination.page} of {pagination.total_pages || 1}
        </span>
        <button
          onClick={() => handlePageChange(pagination.page + 1)}
          disabled={pagination.page === pagination.total_pages}
          className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )

  // Detail Modal Component
  const DetailModal = () => {
    if (!selectedLog) return null

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Audit Log Details</h2>
            <button
              onClick={closeDetailModal}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Action</label>
                  <div className="flex items-center gap-2">
                    {getActionIcon(selectedLog.action)}
                    <span className="text-sm text-gray-900 capitalize">
                      {formatActionText(selectedLog.action)}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Table</label>
                  <p className="text-sm text-gray-900">{selectedLog.table_name || 'System'}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">User</label>
                  <p className="text-sm text-gray-900">{getUserDisplayName(selectedLog)}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Record ID</label>
                  <p className="text-sm text-gray-900 font-mono">{selectedLog.record_id || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Timestamp</label>
                  <p className="text-sm text-gray-900">{formatDate(selectedLog.created_at)}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">IP Address</label>
                  <p className="text-sm text-gray-900 font-mono">{selectedLog.ip_address || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">Description</label>
              <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                {getRecordDescription(selectedLog)}
              </p>
            </div>

            {/* User Agent */}
            {selectedLog.user_agent && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">User Agent</label>
                <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg font-mono text-xs">
                  {selectedLog.user_agent}
                </p>
              </div>
            )}

            {/* Record Details */}
            {selectedLog.record_details && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Record Details</label>
                <pre className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg overflow-x-auto">
                  {JSON.stringify(selectedLog.record_details, null, 2)}
                </pre>
              </div>
            )}

            {/* Old Values */}
            {selectedLog.old_values_parsed && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Old Values</label>
                <pre className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg overflow-x-auto">
                  {JSON.stringify(selectedLog.old_values_parsed, null, 2)}
                </pre>
              </div>
            )}

            {/* New Values */}
            {selectedLog.new_values_parsed && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">New Values</label>
                <pre className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg overflow-x-auto">
                  {JSON.stringify(selectedLog.new_values_parsed, null, 2)}
                </pre>
              </div>
            )}

            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={closeDetailModal}
                className="w-full px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary transition-colors text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">System Audit</h1>
          <p className="text-gray-600">Monitor all system activities and user actions</p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search audit logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent text-xs"
                />
              </div>
            </form>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-xs"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
              {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {/* Refresh */}
            <button
              onClick={fetchAuditLogs}
              className="flex items-center gap-2 px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary transition-colors text-xs"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-200"
            >
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Action</label>
                <select
                  value={filters.action}
                  onChange={(e) => handleFilterChange('action', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-secondary focus:border-transparent text-xs"
                >
                  <option value="">All Actions</option>
                  <option value="CREATE">Create</option>
                  <option value="UPDATE">Update</option>
                  <option value="DELETE">Delete</option>
                  <option value="LOGIN">Login</option>
                  <option value="LOGOUT">Logout</option>
                  <option value="APPROVE">Approve</option>
                  <option value="ASSIGN">Assign</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Table</label>
                <select
                  value={filters.table_name}
                  onChange={(e) => handleFilterChange('table_name', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-secondary focus:border-transparent text-xs"
                >
                  <option value="">All Tables</option>
                  <option value="users">Users</option>
                  <option value="projects">Projects</option>
                  <option value="allocations">Allocations</option>
                  <option value="expenses">Expenses</option>
                  <option value="finances">Finances</option>
                  <option value="project_users">Project Users</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">From Date</label>
                <input
                  type="date"
                  value={filters.date_from}
                  onChange={(e) => handleFilterChange('date_from', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-secondary focus:border-transparent text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">To Date</label>
                <input
                  type="date"
                  value={filters.date_to}
                  onChange={(e) => handleFilterChange('date_to', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-secondary focus:border-transparent text-xs"
                />
              </div>

              <div className="lg:col-span-4 flex justify-end gap-2">
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-xs"
                >
                  Clear Filters
                </button>
                <button
                  onClick={fetchAuditLogs}
                  className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary transition-colors text-xs"
                >
                  Apply Filters
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Audit Logs List - EXACTLY like Recent Expenses in Dashboard */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Audit Logs</h2>
              <button className="text-gray-400 hover:text-gray-600">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Audit Logs List */}
          <div className="divide-y divide-gray-100">
            {loading ? (
              // Loading Skeleton - exactly like expenses
              Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className={`px-6 py-4 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-300'}`}>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-2 h-2 rounded-full bg-gray-300 animate-pulse"></div>
                      {index < 7 && (
                        <div className="w-0.5 h-8 bg-gray-300 mx-auto mt-1 animate-pulse"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="h-4 bg-gray-300 rounded w-3/4 mb-2 animate-pulse"></div>
                      <div className="h-3 bg-gray-300 rounded w-1/2 animate-pulse"></div>
                    </div>
                    <div className="h-4 bg-gray-300 rounded w-16 animate-pulse"></div>
                  </div>
                </div>
              ))
            ) : !auditLogs || auditLogs.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No audit logs found</h3>
                <p className="text-gray-500">No system activities match your current filters.</p>
              </div>
            ) : (
              auditLogs.map((log, index) => (
                <div 
                  key={log?.id || index} 
                  className={`px-6 py-4 transition-colors hover:bg-gray-50 ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Timeline indicator */}
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-2 h-2 rounded-full bg-secondary"></div>
                      {index < auditLogs.length - 1 && (
                        <div className="w-0.5 h-12 bg-secondary mx-auto mt-1"></div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        {getActionIcon(log?.action)}
                        <span className="text-xs font-semibold text-gray-900 capitalize">
                          {formatActionText(log?.action)}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getActionColor(log?.action)}`}>
                          {log?.table_name || 'System'}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>{getUserDisplayName(log)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Database className="w-3 h-3" />
                          <span>{getRecordDescription(log)}</span>
                        </div>
                        {log?.ip_address && (
                          <div className="flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            <span>{log.ip_address}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Timestamp and Actions */}
                    <div className="flex-shrink-0 text-right flex flex-col items-end gap-2">
                      <div className="text-xs font-medium text-gray-900 whitespace-nowrap">
                        {formatDate(log?.created_at)}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        {log?.created_at ? new Date(log.created_at).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'Unknown time'}
                      </div>
                      <button
                        onClick={() => handleViewDetails(log)}
                        className="flex items-center gap-1 px-3 py-1 bg-secondary text-white rounded-lg hover:bg-secondary transition-colors text-xs"
                      >
                        <Eye className="w-3 h-3" />
                        View
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {!loading && auditLogs && auditLogs.length > 0 && <Pagination />}
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && <DetailModal />}
    </div>
  )
}

export default SystemAuditPage