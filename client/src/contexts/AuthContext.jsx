import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)

  // axios 기본 헤더 설정
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    } else {
      delete axios.defaults.headers.common['Authorization']
    }
  }, [token])

  // 토큰으로 사용자 정보 조회
  useEffect(() => {
    const fetchUser = async () => {
      if (!token) {
        setLoading(false)
        return
      }

      try {
        const response = await axios.get('/api/auth/me')
        setUser(response.data.user)
      } catch (error) {
        console.error('사용자 정보 조회 실패:', error)
        // 토큰이 유효하지 않으면 로그아웃
        logout()
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [token])

  const login = async (email, password) => {
    const response = await axios.post('/api/auth/login', { email, password })
    const { token: newToken, user: userData } = response.data

    localStorage.setItem('token', newToken)
    setToken(newToken)
    setUser(userData)

    return response.data
  }

  const register = async (email, password, name) => {
    const response = await axios.post('/api/auth/register', { email, password, name })
    const { token: newToken, user: userData } = response.data

    localStorage.setItem('token', newToken)
    setToken(newToken)
    setUser(userData)

    return response.data
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }

  const isAdmin = () => {
    return user?.role === 'admin'
  }

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAdmin,
    isAuthenticated: !!user
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
