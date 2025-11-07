"use client"

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import Sidebar from './sidebar.js'
import { 
  Bell, 
  User,
  Menu,
  LogOut,
  Search,
  Filter,
  ChevronDown
} from 'lucide-react'
import { getCurrentUser, logout, getAuthToken, get, post, BASE_URL } from '../../utils/service.js'

const MainLayout = ({ 
  children,
  projects = [],
  selectedProject,
  setSelectedProject,
  companies = [],
  selectedCompany,
  setSelectedCompany,
  activeSection = 'dashboard',
  setActiveSection
}) => {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showSearchFilter, setShowSearchFilter] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState('all')
  const [user, setUser] = useState({
    name: '',
    email: '',
    initials: 'U',
    firstName: '',
    role: 'user'
  })

  const searchTimeoutRef = useRef(null)

  useEffect(() => {
    const currentUser = getCurrentUser()
    if (currentUser) {
      const userName = currentUser.first_name + ' ' + currentUser.last_name
      const userInitials = (currentUser.first_name?.[0] || '') + (currentUser.last_name?.[0] || '') || 'U'
      
      setUser({
        name: userName,
        email: currentUser.email,
        initials: userInitials.toUpperCase(),
        firstName: currentUser.first_name || 'User',
        role: currentUser.role || 'user'
      })
    }
  }, [])

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile) {
        setSidebarOpen(false)
      } else {
        setSidebarOpen(true)
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const toggleSidebar = (isOpen, userInitiated = false) => {
    setSidebarOpen(isOpen)
  }

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.user-menu-container')) {
        setShowUserMenu(false)
      }
      if (!e.target.closest('.notifications-container')) {
        setShowNotifications(false)
      }
      if (!e.target.closest('.search-container')) {
        setShowSearchFilter(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    logout()
  }

  const fetchNotifications = async () => {
    try {
      const response = await get('/notifications', { page: 1, per_page: 50 })
      if (response && response.data) {
        const formattedNotifications = response.data.map(notif => ({
          id: notif.id,
          title: notif.title,
          message: notif.message,
          time: new Date(notif.created_at).toLocaleString(),
          unread: !notif.is_read,
          type: notif.type
        }))
        setNotifications(formattedNotifications)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  useEffect(() => {
    const token = getAuthToken()
    if (!token) {
      return
    }

    fetchNotifications()
  }, [])

  const markNotificationAsRead = async (id) => {
    try {
      await post(`/notifications/${id}/read`, {})
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === id ? { ...notif, unread: false } : notif
        )
      )
    } catch (error) {
      console.error('Error marking notification as read:', error)
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === id ? { ...notif, unread: false } : notif
        )
      )
    }
  }

  const handleSearchChange = (query) => {
    setSearchQuery(query)
    
    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    // Navigate to search page after a short delay when user types
    if (query.trim().length > 0) {
      searchTimeoutRef.current = setTimeout(() => {
        navigate(`/search?q=${encodeURIComponent(query)}&type=${searchType}`)
        setActiveSection('search')
      }, 500) // 500ms delay before navigating
    }
  }

  const handleSearchSubmit = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      // Clear timeout if user presses Enter
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
      navigate(`/search?q=${encodeURIComponent(searchQuery)}&type=${searchType}`)
      setActiveSection('search')
    }
  }

  const handleTypeChange = (type) => {
    setSearchType(type)
    setShowSearchFilter(false)
    
    // If there's a search query, navigate to search page with new type
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}&type=${type}`)
      setActiveSection('search')
    }
  }

  const getTypeOptions = () => {
    const baseOptions = [
      { value: 'all', label: 'All' },
      { value: 'projects', label: 'Projects' },
      { value: 'allocations', label: 'Allocations' },
      { value: 'expenses', label: 'Expenses' }
    ]
    
    if (['admin', 'super_admin'].includes(user.role)) {
      baseOptions.push(
        { value: 'users', label: 'Users' },
        { value: 'finance', label: 'Finances' }
      )
    }
    
    return baseOptions
  }

  const unreadCount = notifications.filter(n => n.unread).length

  return (
    <div className="min-h-screen bg-gray-50">
      <AnimatePresence>
        {sidebarOpen && isMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <Sidebar 
        isOpen={sidebarOpen} 
        toggleSidebar={toggleSidebar}
        userRole={user.role}
        projects={projects}
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        isMobile={isMobile}
      />
      
      <div className={`transition-all duration-300 ${
        isMobile ? 'ml-0' : (sidebarOpen ? 'ml-64' : 'ml-16')
      }`}>
        <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 sticky top-0 z-20">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {isMobile && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Menu className="h-5 w-5 text-gray-600" />
                </button>
              )}
              
              <div className="hidden md:block">
                <h2 className="text-sm font-semibold text-gray-900">
                  Hello, {user.firstName}
                </h2>
              </div>
            </div>

            <div className="flex-1 search-container">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search projects, allocations, expenses, users..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onKeyPress={handleSearchSubmit}
                    className="w-full pl-10 pr-4 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                
                <div className="relative">
                  <button
                    onClick={() => setShowSearchFilter(!showSearchFilter)}
                    className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-xs"
                  >
                    <Filter className="h-3 w-3" />
                    <span>{getTypeOptions().find(opt => opt.value === searchType)?.label}</span>
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  
                  {showSearchFilter && (
                    <div className="absolute right-0 mt-1 w-32 bg-white border border-secondary overflow-hidden rounded-lg shadow-lg z-50">
                      {getTypeOptions().map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handleTypeChange(option.value)}
                          className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 transition-colors ${
                            searchType === option.value ? 'bg-secondary/10 text-secondary' : 'text-gray-900'
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
            
            <div className="flex items-center gap-2 md:gap-3">
              <div className="relative notifications-container">
                <button 
                  onClick={() => {
                    setShowNotifications(!showNotifications)
                    if (!showNotifications) {
                      fetchNotifications()
                    }
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg relative transition-colors"
                >
                  <Bell className="h-5 w-5 text-gray-600" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-w-[90vw]"
                    >
                      <div className="p-4 border-b border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-4 text-center text-xs text-gray-500">
                            No notifications
                          </div>
                        ) : (
                          notifications.map((notification) => (
                            <div 
                              key={notification.id}
                              onClick={() => {
                                if (notification.unread) {
                                  markNotificationAsRead(notification.id)
                                }
                              }}
                              className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                                notification.unread ? 'bg-primary/50' : ''
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <h4 className="text-xs font-medium text-gray-900">{notification.title}</h4>
                                  <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
                                  <p className="text-xs text-gray-400 mt-1">{notification.time}</p>
                                </div>
                                {notification.unread && (
                                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="relative user-menu-container">
                <button 
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 hover:bg-gray-100 rounded-lg p-1 transition-colors"
                >
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-secondary">{user.initials}</span>
                  </div>
                </button>

                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-w-[90vw]"
                    >
                      <div className="p-4 border-b border-gray-200">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-secondary">{user.initials}</span>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-900">{user.name}</p>
                            <p className="text-xs text-gray-600">{user.email}</p>
                            <p className="text-xs text-green-500 mt-1 flex items-center">
                              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                              Online
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="py-1">
                        <button
                          onClick={handleLogout}
                          className="flex w-full items-center px-4 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="mr-3 h-4 w-4" />
                          Sign out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>
        
        <main className="min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>
    </div>
  )
}

export default MainLayout