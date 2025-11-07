"use client"

import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Search, Filter, ChevronDown } from 'lucide-react'
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

  const getTypeColor = (type) => {
    switch (type) {
      case 'project': return 'bg-blue-100 text-blue-800'
      case 'allocation': return 'bg-green-100 text-green-800'
      case 'expense': return 'bg-orange-100 text-orange-800'
      case 'finance': return 'bg-purple-100 text-purple-800'
      case 'user': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Search Results</h1>
          
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search projects, allocations, expenses, users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleSearchSubmit}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            
            <div className="relative">
              <button
                onClick={() => setShowTypeFilter(!showTypeFilter)}
                className="flex items-center gap-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Filter className="h-4 w-4" />
                <span>{typeOptions.find(opt => opt.value === searchType)?.label}</span>
                <ChevronDown className="h-4 w-4" />
              </button>
              
              {showTypeFilter && (
                <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  {typeOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleTypeChange(option.value)}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                        searchType === option.value ? 'bg-primary/10 text-primary' : 'text-gray-900'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : searchQuery ? (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-semibold text-gray-900">
                  {searchResults.length} results for "{searchQuery}"
                </h2>
                <span className="text-xs text-gray-500 capitalize">
                  {searchType === 'all' ? 'All Types' : searchType}
                </span>
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {searchResults.length === 0 ? (
                <div className="p-8 text-center">
                  <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
                  <p className="text-gray-500">Try adjusting your search terms or filters</p>
                </div>
              ) : (
                searchResults.map((result) => (
                  <div
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleResultClick(result)}
                    className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`text-xs font-medium px-3 py-1 rounded-full ${getTypeColor(result.type)}`}>
                            {result.type}
                          </span>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {result.display_text}
                          </h3>
                        </div>
                        
                        {result.description && (
                          <p className="text-gray-600 mb-3">{result.description}</p>
                        )}
                        
                        <div className="flex items-center gap-4 flex-wrap">
                          <span className="text-sm text-gray-500">
                            {new Date(result.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </span>
                          
                          <span className={`text-xs font-medium px-2 py-1 rounded ${getStatusColor(result.status)}`}>
                            {result.status}
                          </span>
                          
                          {result.amount && (
                            <span className="text-sm font-semibold text-gray-900">
                              UGX {parseFloat(result.amount).toLocaleString()}
                            </span>
                          )}
                          
                          {result.code && result.code !== 'FINANCE' && (
                            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              {result.code}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <span className="text-xs text-gray-400 capitalize">
                          {result.type}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">Search across the system</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Enter keywords to search for projects, allocations, expenses, users, and financial records.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default SearchResults