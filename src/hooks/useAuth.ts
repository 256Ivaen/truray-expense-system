import { useState, useEffect } from 'react'
import { toast } from 'sonner'

interface User {
  id: string
  name: string
  email: string
  role: string
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initializeAuth = () => {
      try {
        const token = localStorage.getItem('truray_jwt')
        const userData = localStorage.getItem('truray_user')
        
        if (token && userData) {
          const parsedUser = JSON.parse(userData)
          setUser(parsedUser)
        }
      } catch (error) {
        console.error('Error parsing user data:', error)
        localStorage.removeItem('truray_jwt')
        localStorage.removeItem('truray_user')
        localStorage.removeItem('truray_isLoggedIn')
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()
  }, [])

  const login = (userData: User) => {
    setUser(userData)
    try {
      localStorage.setItem('truray_user', JSON.stringify(userData))
      localStorage.setItem('truray_isLoggedIn', 'true')
    } catch (error) {
      console.error('Failed to persist user data:', error)
      toast.error('Failed to persist session data locally')
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('truray_jwt')
    localStorage.removeItem('truray_user')
    localStorage.removeItem('truray_isLoggedIn')
    setUser(null)
    // DON'T refresh the page - let React Router handle navigation
  }

  const hasRole = (roles: string | string[]): boolean => {
    if (!user) return false
    const roleArray = Array.isArray(roles) ? roles : [roles]
    if (user.role === 'super_admin') return true
    return roleArray.includes(user.role)
  }

  return {
    user,
    loading,
    login,
    logout,
    hasRole,
    isAdmin: () => hasRole(['admin', 'super_admin']),
    isSuperAdmin: () => hasRole(['super_admin']),
    isAuthenticated: !!user
  }
}