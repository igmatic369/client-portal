import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Keep session in sync with Supabase auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  /**
   * Sign in with email and password.
   * Returns { error } on failure, { data } on success.
   */
  const login = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  /**
   * Sign in with Google OAuth.
   * Redirects to Google; on return, Supabase updates the session.
   */
  const loginWithGoogle = () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })

  /**
   * Sign out the current user and clear the session.
   */
  const logout = () => supabase.auth.signOut()

  /**
   * Send a password-reset magic link to the given email.
   * The link redirects to /reset-password where the user sets a new password.
   */
  const resetPassword = (email) =>
    supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

  return (
    <AuthContext.Provider value={{ session, user, loading, login, loginWithGoogle, logout, resetPassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
