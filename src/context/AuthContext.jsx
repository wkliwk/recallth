import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const TOKEN_KEY = 'recallth_token'
const EMAIL_KEY = 'recallth_email'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null)
  const [email, setEmail] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isNewUser, setIsNewUser] = useState(false)

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY)
    const storedEmail = localStorage.getItem(EMAIL_KEY)
    if (storedToken) setToken(storedToken)
    if (storedEmail) setEmail(storedEmail)
    setIsLoading(false)
  }, [])

  const setAuth = useCallback((newToken, newEmail, newUser = false) => {
    localStorage.setItem(TOKEN_KEY, newToken)
    localStorage.setItem(EMAIL_KEY, newEmail)
    setToken(newToken)
    setEmail(newEmail)
    setIsNewUser(newUser)
  }, [])

  const clearNewUser = useCallback(() => setIsNewUser(false), [])

  const clearAuth = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(EMAIL_KEY)
    setToken(null)
    setEmail(null)
    setIsNewUser(false)
  }, [])

  return (
    <AuthContext.Provider value={{ token, email, isAuthenticated: !!token, isLoading, isNewUser, setAuth, clearNewUser, clearAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
