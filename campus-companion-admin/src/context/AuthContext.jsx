import React, { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cc_admin_user')) } catch { return null }
  })
  const [token, setToken] = useState(() => localStorage.getItem('cc_admin_token'))

  const login = (tokenVal, userVal) => {
    localStorage.setItem('cc_admin_token', tokenVal)
    localStorage.setItem('cc_admin_user', JSON.stringify(userVal))
    setToken(tokenVal)
    setUser(userVal)
  }

  const logout = () => {
    localStorage.removeItem('cc_admin_token')
    localStorage.removeItem('cc_admin_user')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAdmin: user?.role === 'ADMIN' }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
