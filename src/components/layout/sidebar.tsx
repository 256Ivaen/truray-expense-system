"use client"

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'
import { 
  FiChevronRight,
  FiUsers,
  FiSettings,
} from 'react-icons/fi'
import { ChevronLeft, X, LogOut } from 'react-feather'
import { Building2 } from "lucide-react"
import { TbReportAnalytics } from "react-icons/tb";
import { GiMoneyStack } from "react-icons/gi";
import { LuLayoutDashboard } from "react-icons/lu"
import { TbSubtask } from "react-icons/tb";
import { MdOutlineAttachMoney } from "react-icons/md";
import { logout, getCurrentUser } from '../../utils/service.js'
import { assets } from "../../assets/assets";

const Sidebar = ({ 
  isOpen, 
  toggleSidebar, 
  userRole = 'admin',
  activeSection = 'dashboard',
  setActiveSection,
  isMobile = false
}) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [expandedItems, setExpandedItems] = useState({})

  // Get user info from localStorage
  const getUserInfo = () => {
    try {
      const user = getCurrentUser()
      if (user) {
        return {
          firstName: user.first_name || 'User',
          lastName: user.last_name || '',
          role: user.role || 'user'
        }
      }
    } catch (error) {
      console.error('Error getting user info from localStorage:', error)
    }
    return {
      firstName: 'User',
      lastName: '',
      role: 'user'
    }
  }

  const currentUser = getUserInfo()
  const currentUserRole = currentUser.role

  const navData = useMemo(() => {
    const baseNav = [
      {
        title: 'Dashboard',
        path: '/',
        section: 'dashboard',
        icon: <LuLayoutDashboard className="h-4 w-4" />,
        roles: ['admin', 'user'] // All roles can access dashboard
      }
    ]

    // Users section - Admin and Super Admin
    if (currentUserRole === 'admin' || currentUserRole === 'super_admin') {
      baseNav.push({
        title: 'Users',
        path: '/users',
        section: 'users',
        icon: <FiUsers className="h-4 w-4" />,
        roles: ['admin','super_admin']
      })
    }

    // Projects section - All roles can access
    baseNav.push({
      title: 'Projects',
      path: '/projects',
      section: 'projects',
      icon: <Building2 className="h-4 w-4" />,
      roles: ['admin', 'user']
    })

    // Finance section - Admin and Super Admin
    if (currentUserRole === 'admin' || currentUserRole === 'super_admin') {
      baseNav.push({
        title: 'Finance',
        path: '/finance',
        section: 'finance',
        icon: <MdOutlineAttachMoney className="h-4 w-4" />,
        roles: ['admin','super_admin']
      })
    }

    // Allocations - Admin and Super Admin; users should not see this
    if (currentUserRole === 'admin' || currentUserRole === 'super_admin') {
      baseNav.push({
        title: 'Allocations',
        path: '/allocations',
        section: 'allocations',
        icon: <TbSubtask className="h-4 w-4" />,
        roles: ['admin','super_admin']
      })
    }

    // Expenses section - All roles can access
    baseNav.push({
      title: 'Expenses',
      path: '/expenses',
      section: 'expenses',
      icon: <GiMoneyStack className="h-4 w-4" />,
      roles: ['admin', 'user']
    })

    // Reports section - Admin only
    if (currentUserRole === 'admin') {
      baseNav.push({
        title: 'Reports',
        path: '/reports',
        section: 'reports',
        icon: <TbReportAnalytics className="h-4 w-4" />,
        roles: ['admin']
      })
    }

    // Settings section - All roles can access (personal settings)
    baseNav.push({
      title: 'Settings',
      path: '/settings',
      section: 'settings',
      icon: <FiSettings className="h-4 w-4" />,
      roles: ['admin', 'user']
    })

    return baseNav
  }, [currentUserRole]) // Recompute when user role changes

  const toggleExpanded = (title) => {
    setExpandedItems(prev => ({
      ...prev,
      [title.toLowerCase()]: !prev[title.toLowerCase()]
    }))
  }

  const handleNavClick = (item) => {
    if (item.children) {
      toggleExpanded(item.title)
    } else if (item.path) {
      navigate(item.path)
      if (item.section && setActiveSection) {
        setActiveSection(item.section)
      }
      if (isMobile) {
        toggleSidebar(false)
      }
    }
  }

  const handleLogout = () => {
    logout()
  }

  const isActiveRoute = (path, section) => {
    if (!location || !location.pathname) return false
    
    if (path === location.pathname) {
      return true
    }
    if (path && path.includes && path.includes('?') && location.pathname === path.split('?')[0]) {
      return true
    }
    return false
  }

  const isParentActive = (item) => {
    if (!item.children) return false
    return item.children.some(child => isActiveRoute(child.path, child.section))
  }

  // Filter navigation items based on user role
  const filteredNavData = navData.filter(item => {
    // Check if user has permission for this item
    const hasPermission = item.roles && item.roles.includes(currentUserRole)
    
    // For items with children, also check if any child is accessible
    if (item.children) {
      const hasAccessibleChildren = item.children.some(child => 
        child.roles && child.roles.includes(currentUserRole)
      )
      return hasPermission && hasAccessibleChildren
    }
    
    return hasPermission
  })

  return (
    <aside className={`
      bg-secondary text-gray-700 fixed left-0 top-0 bottom-0 
      ${isOpen ? 'w-64' : (isMobile ? '-translate-x-full w-64' : 'w-16')} 
      transition-all duration-300 shadow-lg border-r border-gray-200 flex flex-col z-40
      ${isMobile ? 'md:translate-x-0' : ''}
    `}>
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="expanded-logo"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex items-center gap-3"
            >
              {/* Replace with your logo image */}
              <img 
                src={assets.SidebarOpen}
                alt="TruRay Logo" 
                className="h-8 w-auto"
              />
            </motion.div>
          ) : (
            <motion.div
              key="collapsed-logo"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center justify-center"
            >
              {/* Replace with your compact logo image */}
              <img 
                src={assets.MainLogo}
                alt="TruRay" 
                className="h-8 w-8"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {isOpen && (
          <button
            onClick={() => toggleSidebar(false, true)}
            className="p-2 rounded-lg text-primary hover:bg-primary/10 transition-colors"
          >
            {isMobile ? <X size={16} /> : <ChevronLeft size={16} />}
          </button>
        )}
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto bg-secondary">
        {filteredNavData.map((item, index) => (
          <div key={item.title} className="space-y-1">
            <div className="relative group">
              <button
                onClick={() => handleNavClick(item)}
                className={`w-full flex items-center ${isOpen ? 'px-3' : 'justify-center px-2'} py-2.5 rounded-lg transition-all text-xs ${
                  isActiveRoute(item.path, item.section)
                    ? 'bg-primary text-secondary font-medium'
                    : isParentActive(item)
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-white hover:text-secondary hover:bg-primary'
                }`}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {isOpen && (
                  <div className="flex items-center justify-between flex-1 ml-3">
                    <span className="font-medium text-xs">{item.title}</span>
                    {item.children && (
                      <FiChevronRight 
                        className={`w-3 h-3 transition-transform ${
                          expandedItems[item.title.toLowerCase()] ? 'rotate-90' : ''
                        }`} 
                      />
                    )}
                  </div>
                )}
              </button>

              {!isOpen && !isMobile && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50 pointer-events-none">
                  {item.title}
                </div>
              )}
            </div>

            {/* Remove the children rendering section since Reports no longer has children */}
          </div>
        ))}
      </nav>

      {/* Logout Button in Footer */}
      <div className="border-t border-primary p-3 bg-secondary">
        <button
          onClick={handleLogout}
          className={`w-full flex items-center ${
            isOpen ? 'px-3 justify-start' : 'justify-center px-2'
          } py-2.5 rounded-lg text-xs text-primary hover:bg-red-50 transition-all`}
        >
          <LogOut size={16} className="flex-shrink-0" />
          {isOpen && <span className="ml-3 font-medium">Sign Out</span>}
        </button>
      </div>

      {!isOpen && !isMobile && (
        <div className="p-3 border-t border-gray-200">
          <button
            onClick={() => toggleSidebar(true, true)}
            className="w-full p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors flex items-center justify-center"
          >
            <FiChevronRight size={16} />
          </button>
        </div>
      )}
    </aside>
  )
}

export default Sidebar