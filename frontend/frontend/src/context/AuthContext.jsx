import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react'
import axiosClient from '../api/axiosClient'

export const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem('smartmaintain_user')
      return cached ? JSON.parse(cached) : null
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(null)

  const clearAuthError = useCallback(() => {
    setAuthError(null)
  }, [])

  // Check existing session with Flask backend on mount
  useEffect(() => {
    let isMounted = true

    const checkSession = async () => {
      try {
        const response = await axiosClient.get('/api/auth/me')
        if (!isMounted) return

        if (response.data?.authenticated && response.data?.user) {
          setUser(response.data.user)
          localStorage.setItem('smartmaintain_user', JSON.stringify(response.data.user))
        } else {
          // If session expired on backend, clear cached user and token
          setUser(null)
          localStorage.removeItem('smartmaintain_user')
          localStorage.removeItem('smartmaintain_token')
        }
      } catch (err) {
        // If server is temporarily unreachable, retain cached user for offline viewing
        if (isMounted) {
          console.warn('Session check warning:', err.normalizedMessage || err.message)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    checkSession()

    return () => {
      isMounted = false
    }
  }, [])

  const signup = useCallback(async (usernameOrEmail, password, fullName) => {
    setAuthError(null)
    setLoading(true)
    try {
      const payload = {
        username: usernameOrEmail.trim(),
        password,
        fullName: fullName ? fullName.trim() : undefined,
      }
      const response = await axiosClient.post('/api/auth/register', payload)
      const newUser = response.data?.user || { username: usernameOrEmail.trim() }
      const token = response.data?.token || null

      setUser(newUser)
      localStorage.setItem('smartmaintain_user', JSON.stringify(newUser))
      if (token) {
        localStorage.setItem('smartmaintain_token', token)
      }
      return newUser
    } catch (error) {
      const message = error.normalizedMessage || error.response?.data?.error || 'Failed to create account.'
      setAuthError(message)
      throw new Error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  const login = useCallback(async (usernameOrEmail, password) => {
    setAuthError(null)
    setLoading(true)
    try {
      const payload = {
        username: usernameOrEmail.trim(),
        password,
      }
      const response = await axiosClient.post('/api/auth/login', payload)
      const loggedUser = response.data?.user || { username: usernameOrEmail.trim() }
      const token = response.data?.token || null

      setUser(loggedUser)
      localStorage.setItem('smartmaintain_user', JSON.stringify(loggedUser))
      if (token) {
        localStorage.setItem('smartmaintain_token', token)
      }
      return loggedUser
    } catch (error) {
      const message = error.normalizedMessage || error.response?.data?.error || 'Invalid credentials. Please verify your username and password.'
      setAuthError(message)
      throw new Error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    setAuthError(null)
    setLoading(true)
    try {
      await axiosClient.post('/api/auth/logout')
    } catch (err) {
      console.warn('Backend logout warning:', err)
    } finally {
      setUser(null)
      localStorage.removeItem('smartmaintain_user')
      localStorage.removeItem('smartmaintain_token')
      setLoading(false)
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      authError,
      isFirebaseConfigured: true,
      signup,
      login,
      logout,
      clearAuthError,
    }),
    [user, loading, authError, signup, login, logout, clearAuthError]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider
