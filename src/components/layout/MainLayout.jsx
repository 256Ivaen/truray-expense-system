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
  Search
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
  const [isMobile, setIsMobile] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [user, setUser] = useState({
    name: '',
    email: '',
    initials: 'U',
    firstName: ''
  })
  const wsRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const isConnectingRef = useRef(false)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 10

  // Get user data from localStorage using service function
  useEffect(() => {
    const currentUser = getCurrentUser()
    if (currentUser) {
      const userName = currentUser.first_name + ' ' + currentUser.last_name
      const userInitials = (currentUser.first_name?.[0] || '') + (currentUser.last_name?.[0] || '') || 'U'
      
      setUser({
        name: userName,
        email: currentUser.email,
        initials: userInitials.toUpperCase(),
        firstName: currentUser.first_name || 'User'
      })
    }
  }, [])

  // Check for mobile screen size
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

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.user-menu-container')) {
        setShowUserMenu(false)
      }
      if (!e.target.closest('.notifications-container')) {
        setShowNotifications(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    logout()
  }

  // Fetch notifications from API
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

  // Get WebSocket URL - optimized for Hostinger hosting
  const getWebSocketUrl = () => {
    // Extract hostname from BASE_URL
    try {
      const url = new URL(BASE_URL)
      const host = url.hostname
      
      // For Hostinger/production, always use wss:// (secure WebSocket) when on HTTPS
      const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
      
      // Try port 8080 first (standard WebSocket port)
      // If that doesn't work, Hostinger might require using the same port as HTTPS
      // or a WebSocket endpoint path
      const port = url.protocol === 'https:' ? '' : ':8080'
      
      // For secure connections on Hostinger, try same port first
      // Some hosting providers require WebSocket on same port as HTTP(S)
      if (url.protocol === 'https:') {
        // Option 1: Try WebSocket on same domain with standard port
        // Option 2: Try WebSocket on port 8080
        // We'll use port 8080 as primary since that's what backend expects
        return `wss://${host}:8080`
      } else {
        return `ws://${host}:8080`
      }
    } catch (error) {
      // Fallback to using window location
      const host = window.location.hostname
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const port = window.location.protocol === 'https:' ? '' : ':8080'
      
      if (window.location.protocol === 'https:') {
        return `wss://${host}:8080`
      } else {
        return `ws://${host}:8080`
      }
    }
  }

  // Connect to WebSocket with exponential backoff retry
  const connectWebSocket = () => {
    if (isConnectingRef.current || !getAuthToken()) {
      return
    }

    // Don't attempt reconnect if we've exceeded max attempts
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.warn('Max WebSocket reconnect attempts reached. Falling back to polling.')
      // Fall back to periodic API polling instead
      startPolling()
      return
    }

    isConnectingRef.current = true
    const token = getAuthToken()
    
    if (!token) {
      isConnectingRef.current = false
      return
    }

    try {
      const wsUrl = getWebSocketUrl()
      console.log('Attempting to connect to WebSocket:', wsUrl)
      const ws = new WebSocket(wsUrl)
      
      // Set connection timeout
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          console.warn('WebSocket connection timeout')
          ws.close()
          handleReconnect()
        }
      }, 10000) // 10 second timeout
      
      ws.onopen = () => {
        clearTimeout(connectionTimeout)
        console.log('WebSocket connected successfully')
        isConnectingRef.current = false
        reconnectAttemptsRef.current = 0 // Reset on successful connection
        
        // Authenticate with token
        try {
          ws.send(JSON.stringify({
            type: 'authenticate',
            token: token
          }))
        } catch (error) {
          console.error('Error sending authentication:', error)
        }
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          
          if (message.type === 'authenticated') {
            console.log('WebSocket authenticated successfully')
          } else if (message.type === 'notifications') {
            // Initial notifications batch
            const formattedNotifications = message.data.map(notif => ({
              id: notif.id,
              title: notif.title,
              message: notif.message,
              time: new Date(notif.created_at).toLocaleString(),
              unread: !notif.is_read,
              type: notif.type
            }))
            setNotifications(formattedNotifications)
          } else if (message.type === 'notification') {
            // New notification received
            const newNotification = {
              id: message.data.id,
              title: message.data.title,
              message: message.data.message,
              time: new Date(message.data.created_at).toLocaleString(),
              unread: !message.data.is_read,
              type: message.data.type
            }
            setNotifications(prev => {
              // Avoid duplicates
              const exists = prev.find(n => n.id === newNotification.id)
              if (exists) return prev
              return [newNotification, ...prev]
            })
          } else if (message.type === 'error') {
            console.error('WebSocket error message:', message.message)
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      ws.onerror = (error) => {
        clearTimeout(connectionTimeout)
        console.error('WebSocket error:', error)
        isConnectingRef.current = false
        // Don't reconnect immediately on error, let onclose handle it
      }

      ws.onclose = (event) => {
        clearTimeout(connectionTimeout)
        const wasConnected = reconnectAttemptsRef.current === 0
        
        if (wasConnected) {
          console.log('WebSocket disconnected. Code:', event.code, 'Reason:', event.reason)
        } else {
          console.log('WebSocket connection failed. Attempt:', reconnectAttemptsRef.current + 1)
        }
        
        isConnectingRef.current = false
        wsRef.current = null
        
        // Only attempt reconnect if we still have auth token
        if (getAuthToken() && reconnectAttemptsRef.current < maxReconnectAttempts) {
          handleReconnect()
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          console.warn('WebSocket connection failed after max attempts. Using API polling fallback.')
          startPolling()
        }
      }

      wsRef.current = ws
    } catch (error) {
      console.error('Error creating WebSocket connection:', error)
      isConnectingRef.current = false
      handleReconnect()
    }
  }

  // Handle reconnection with exponential backoff
  const handleReconnect = () => {
    reconnectAttemptsRef.current++
    
    // Exponential backoff: 3s, 6s, 12s, 24s, etc. (max 60s)
    const delay = Math.min(3000 * Math.pow(2, reconnectAttemptsRef.current - 1), 60000)
    
    console.log(`Reconnecting WebSocket in ${delay / 1000} seconds (attempt ${reconnectAttemptsRef.current})`)
    
    reconnectTimeoutRef.current = setTimeout(() => {
      connectWebSocket()
    }, delay)
  }

  // Fallback polling when WebSocket fails
  const pollingIntervalRef = useRef(null)
  const startPolling = () => {
    // Only start polling if not already polling
    if (pollingIntervalRef.current) {
      return
    }
    
    console.log('Starting notification polling as WebSocket fallback')
    
    // Poll every 10 seconds for new notifications
    pollingIntervalRef.current = setInterval(() => {
      fetchNotifications()
    }, 10000)
  }

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
  }

  // Initialize WebSocket and fetch notifications
  useEffect(() => {
    const token = getAuthToken()
    if (!token) {
      return
    }

    // Fetch initial notifications
    fetchNotifications()

    // Connect WebSocket
    connectWebSocket()

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      stopPolling()
    }
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
      // Still update UI optimistically
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === id ? { ...notif, unread: false } : notif
        )
      )
    }
  }

  const unreadCount = notifications.filter(n => n.unread).length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Overlay */}
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
        userRole="admin"
        projects={projects}
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        isMobile={isMobile}
      />
      
      <div className={`transition-all duration-300 ${
        isMobile ? 'ml-0' : (sidebarOpen ? 'ml-64' : 'ml-16')
      }`}>
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 sticky top-0 z-20">
          <div className="flex items-center justify-between gap-4">
            {/* Left Section: Mobile Menu + Welcome Message */}
            <div className="flex items-center gap-4">
              {/* Mobile Menu Button */}
              {isMobile && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Menu className="h-5 w-5 text-gray-600" />
                </button>
              )}
              
              {/* Welcome Message */}
              <div className="hidden md:block">
                <h2 className="text-sm font-semibold text-gray-900">
                  Hello, {user.firstName}
                </h2>
              </div>
            </div>

            {/* Middle Section: Search Bar */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
            
            {/* Right Section: Notifications + Profile */}
            <div className="flex items-center gap-2 md:gap-3">
              {/* Notifications */}
              <div className="relative notifications-container">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
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

              {/* User Menu */}
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