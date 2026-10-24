import { useState, useEffect, useCallback } from 'react'
import { account, APPWRITE_CONFIG } from '../lib/appwrite'
import { ID } from 'appwrite'
import type { Models } from 'appwrite'

export interface User extends Models.User<Models.Preferences> {
  $id: string
  name: string
  email: string
}

export interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    error: null,
  })

  const handleAppwriteError = useCallback((err: unknown, context: string): string => {
    const message = err instanceof Error ? err.message : `${context} failed`
    // Check for session expiry (401)
    if (message.includes('401') || message.includes('session') || message.includes('unauthorized')) {
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: 'Session expired. Please log in again.',
      })
      return 'Session expired. Please log in again.'
    }
    return message
  }, [])

  const checkSession = useCallback(async () => {
    if (!account || !APPWRITE_CONFIG.isConfigured) {
      setState(prev => ({ ...prev, isLoading: false, error: 'Appwrite not configured' }))
      return
    }

    try {
      const _user = await account.get()
      setState({
        user: _user as User,
        isLoading: false,
        isAuthenticated: true,
        error: null,
      })
    } catch (err) {
      const message = handleAppwriteError(err, 'Session check')
      if (message !== 'Session expired. Please log in again.') {
        setState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
          error: null,
        })
      }
    }
  }, [handleAppwriteError])

  useEffect(() => {
    checkSession()
  }, [checkSession])

  const login = useCallback(async (email: string, password: string) => {
    if (!account || !APPWRITE_CONFIG.isConfigured) {
      throw new Error('Appwrite not configured')
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      await account.createEmailPasswordSession(email, password)
      const user = await account.get()
      setState({
        user: user as User,
        isLoading: false,
        isAuthenticated: true,
        error: null,
      })
    } catch (err) {
      const message = handleAppwriteError(err, 'Login')
      setState(prev => ({ ...prev, isLoading: false, error: message }))
      throw err
    }
  }, [handleAppwriteError])

  const signup = useCallback(async (name: string, email: string, password: string) => {
    if (!account || !APPWRITE_CONFIG.isConfigured) {
      throw new Error('Appwrite not configured')
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // Create account
      await account.create(ID.unique(), email, password, name)
      // Auto-login after signup
      await account.createEmailPasswordSession(email, password)
      const loggedInUser = await account.get()
      setState({
        user: loggedInUser as User,
        isLoading: false,
        isAuthenticated: true,
        error: null,
      })
    } catch (err) {
      const message = handleAppwriteError(err, 'Signup')
      setState(prev => ({ ...prev, isLoading: false, error: message }))
      throw err
    }
  }, [handleAppwriteError])

  const logout = useCallback(async () => {
    if (!account || !APPWRITE_CONFIG.isConfigured) {
      throw new Error('Appwrite not configured')
    }

    setState(prev => ({ ...prev, isLoading: true }))

    try {
      await account.deleteSession('current')
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: null,
      })
    } catch (err) {
      const message = handleAppwriteError(err, 'Logout')
      setState(prev => ({ ...prev, isLoading: false, error: message }))
      throw err
    }
  }, [handleAppwriteError])

  return { ...state, login, signup, logout, refresh: checkSession }
}