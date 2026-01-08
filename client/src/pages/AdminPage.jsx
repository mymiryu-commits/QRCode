import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import {
  Users, Shield, Trash2, BarChart3, QrCode,
  FolderOpen, AlertCircle, Check, Crown
} from 'lucide-react'

export default function AdminPage() {
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('users')

  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isAdmin()) {
      navigate('/')
      return
    }
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [usersRes, statsRes] = await Promise.all([
        axios.get('/api/admin/users'),
        axios.get('/api/admin/stats')
      ])
      setUsers(usersRes.data)
      setStats(statsRes.data)
    } catch (err) {
      setError(err.response?.data?.error || '데이터를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async (userId, newRole) => {
    try {
      await axios.patch(`/api/admin/users/${userId}/role`, { role: newRole })
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u))
    } catch (err) {
      alert(err.response?.data?.error || '역할 변경에 실패했습니다.')
    }
  }

  const handleDeleteUser = async (userId, userName) => {
    if (!confirm(`정말 "${userName}" 사용자를 삭제하시겠습니까?\n해당 사용자의 모든 QR코드도 함께 삭제됩니다.`)) {
      return
    }

    try {
      await axios.delete(`/api/admin/users/${userId}`)
      setUsers(users.filter(u => u.id !== userId))
      fetchData() // 통계 갱신
    } catch (err) {
      alert(err.response?.data?.error || '사용자 삭제에 실패했습니다.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-500" />
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Shield className="w-8 h-8 text-purple-600" />
          관리자 페이지
        </h1>
        <p className="text-gray-600 mt-2">사용자 관리 및 전체 통계를 확인합니다.</p>
      </div>

      {/* 통계 카드 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">전체 사용자</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <QrCode className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">전체 QR코드</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalQRs}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <FolderOpen className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">전체 배치 작업</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalBatches}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 탭 */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
              activeTab === 'users'
                ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Users className="w-5 h-5 inline-block mr-2" />
            사용자 관리
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
              activeTab === 'stats'
                ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <BarChart3 className="w-5 h-5 inline-block mr-2" />
            사용자별 통계
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'users' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">이름</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">이메일</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">역할</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">가입일</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {u.name}
                          {u.role === 'admin' && (
                            <Crown className="w-4 h-4 text-yellow-500" />
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{u.email}</td>
                      <td className="py-3 px-4">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          disabled={u.id === user.id}
                          className="px-3 py-1 border rounded-lg text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                        >
                          <option value="user">일반 사용자</option>
                          <option value="admin">관리자</option>
                        </select>
                      </td>
                      <td className="py-3 px-4 text-gray-600 text-sm">
                        {new Date(u.created_at).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {u.id !== user.id && (
                          <button
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="사용자 삭제"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'stats' && stats && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">사용자별 QR코드 생성 수</h3>
              {stats.userStats.length === 0 ? (
                <p className="text-gray-500">아직 QR코드가 생성되지 않았습니다.</p>
              ) : (
                <div className="space-y-3">
                  {stats.userStats.map((item, index) => (
                    <div key={item.userId} className="flex items-center gap-4">
                      <div className="w-8 text-center font-bold text-gray-500">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-900">{item.userName}</span>
                          <span className="text-sm text-gray-600">{item.count}개</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                            style={{
                              width: `${(item.count / stats.totalQRs) * 100}%`
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
