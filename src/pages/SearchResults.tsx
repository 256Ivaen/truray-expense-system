"use client"

import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { 
  Search, 
  Filter, 
  ChevronDown, 
  Calendar, 
  User, 
  Folder, 
  CreditCard, 
  Building, 
  FileText,
  Wallet,
  Users
} from 'lucide-react'
import { get } from '../utils/service.js'

const SearchResults = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchResults, setSearchResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState('all')
  const [showTypeFilter, setShowTypeFilter] = useState(false)

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search)
    const q = queryParams.get('q') || location.state?.q || ''
    const type = queryParams.get('type') || 'all'
    
    setSearchQuery(q)
    setSearchType(type)
    
    if (q) {
      performSearch(q, type)
    }
  }, [location])

  const performSearch = async (query, type = 'all') => {
    if (!query.trim()) return
    
    setLoading(true)
    try {
      const response = await get('/search', { 
        q: query,
        type: type,
        per_page: 50 
      })
      
      if (response.success) {
        setSearchResults(response.data)
      } else {
        setSearchResults([])
      }
    } catch (error) {
      console.error('Search error:', error)
      setSearchResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearchSubmit = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}&type=${searchType}`, { 
        replace: true 
      })
      performSearch(searchQuery, searchType)
    }
  }

  const handleTypeChange = (type) => {
    setSearchType(type)
    setShowTypeFilter(false)
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}&type=${type}`, { 
        replace: true 
      })
      performSearch(searchQuery, type)
    }
  }

  const handleResultClick = (result) => {
    let path = ''
    switch (result.type) {
      case 'project':
        path = '/projects'
        break
      case 'allocation':
        path = '/allocations'
        break
      case 'expense':
        path = '/expenses'
        break
      case 'user':
        path = '/users'
        break
      case 'finance':
        path = '/finances'
        break
      default:
        return
    }
    navigate(path, { state: { highlight: result.id } })
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'project': return <Building className="h-3 w-3" />
      case 'allocation': return <CreditCard className="h-3 w-3" />
      case 'expense': return <FileText className="h-3 w-3" />
      case 'finance': return <Wallet className="h-3 w-3" />
      case 'user': return <Users className="h-3 w-3" />
      default: return <Folder className="h-3 w-3" />
    }
  }

  const getTypeColor = (type) => {
    switch (type) {
      case 'project': return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'allocation': return 'bg-green-50 text-green-700 border-green-200'
      case 'expense': return 'bg-orange-50 text-orange-700 border-orange-200'
      case 'finance': return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'user': return 'bg-gray-50 text-gray-700 border-gray-200'
      default: return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const typeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'projects', label: 'Projects' },
    { value: 'allocations', label: 'Allocations' },
    { value: 'expenses', label: 'Expenses' },
    { value: 'users', label: 'Users' },
    { value: 'finance', label: 'Finances' }
  ]

  const SearchSkeleton = () => (
    <div className="p-4 border-b border-gray-100 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-16 h-4 bg-gray-200 rounded"></div>
            <div className="w-48 h-4 bg-gray-200 rounded"></div>
          </div>
          <div className="w-64 h-3 bg-gray-200 rounded mb-3"></div>
          <div className="flex items-center gap-3">
            <div className="w-20 h-3 bg-gray-200 rounded"></div>
            <div className="w-16 h-4 bg-gray-200 rounded"></div>
            <div className="w-24 h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xs font-semibold text-secondary uppercase tracking-wide mb-1">Search Results</h1>
              {searchQuery && (
                <p className="text-xs text-gray-600">
                  Showing results for "<span className="text-secondary">{searchQuery}</span>"
                </p>
              )}
            </div>
            {searchQuery && (
              <span className="text-xs text-secondary bg-white px-2 py-1 rounded border border-gray-300">
                {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'}
              </span>
            )}
          </div>
          
          {/* Search Bar */}
          <div className="flex gap-3 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search projects, allocations, expenses, users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleSearchSubmit}
                className="w-full pl-9 pr-4 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent bg-white text-secondary"
              />
            </div>
            
            <div className="relative">
              <button
                onClick={() => setShowTypeFilter(!showTypeFilter)}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-xs bg-white text-secondary"
              >
                <Filter className="h-3 w-3" />
                <span>{typeOptions.find(opt => opt.value === searchType)?.label}</span>
                <ChevronDown className="h-3 w-3" />
              </button>
              
              {showTypeFilter && (
                <div className="absolute right-0 mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  {typeOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleTypeChange(option.value)}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 transition-colors flex items-center gap-2 ${
                        searchType === option.value ? 'bg-primary/20 text-secondary' : 'text-secondary'
                      }`}
                    >
                      {getTypeIcon(option.value)}
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Results Section */}
        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-100">
              {Array.from({ length: 5 }).map((_, index) => (
                <SearchSkeleton key={index} />
              ))}
            </div>
          </div>
        ) : searchQuery ? (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {searchResults.length === 0 ? (
              <div className="p-8 text-center">
                <Search className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                <h3 className="text-xs font-semibold text-secondary mb-1">No results found</h3>
                <p className="text-xs text-gray-500">Try adjusting your search terms or filters</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {searchResults.map((result) => (
                  <div
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleResultClick(result)}
                    className="p-4 hover:bg-secondary/5 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0 group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Header with type and title */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-medium ${getTypeColor(result.type)}`}>
                            {getTypeIcon(result.type)}
                            {result.type}
                          </span>
                          <h3 className="text-xs font-semibold text-secondary flex-1 group-hover:text-secondary transition-colors">
                            {result.display_text}
                          </h3>
                        </div>
                        
                        {/* Description */}
                        {result.description && (
                          <p className="text-xs text-gray-600 mb-3 line-clamp-2">{result.description}</p>
                        )}
                        
                        {/* Metadata */}
                        <div className="flex items-center gap-4 flex-wrap">
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Calendar className="h-3 w-3" />
                            {new Date(result.created_at).toLocaleDateString()}
                          </div>
                          
                          <span className={`text-xs font-medium px-2 py-1 rounded ${getStatusColor(result.status)}`}>
                            {result.status}
                          </span>
                          
                          {result.amount && (
                            <div className="flex items-center gap-1 text-xs font-semibold text-secondary">
                              UGX {parseFloat(result.amount).toLocaleString()}
                            </div>
                          )}
                          
                          {result.code && result.code !== 'FINANCE' && (
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              {result.code}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* View Details Button */}
                      <div className="text-right ml-4">
                        <span className="text-xs text-secondary font-medium group-hover:underline transition-all">
                          View Details
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <Search className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-xs font-semibold text-secondary mb-1">Search Across the System</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              Enter keywords to search for projects, allocations, expenses, users, and financial records.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default SearchResults