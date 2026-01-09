import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import {
  Users, Shield, Trash2, BarChart3, QrCode,
  FolderOpen, AlertCircle, Check, Crown, Gift,
  Ticket, Building2, Calendar, X
} from 'lucide-react'

const PLANS = {
  basic: { name: '베이직', price: 4900 },
  pro: { name: '프로', price: 9900 },
  business: { name: '비즈니스', price: 29900 }
}

export default function AdminPage() {
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState(null)
  const [promoCodes, setPromoCodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('users')

  // 모달 상태
  const [grantModal, setGrantModal] = useState({ open: false, user: null })
  const [teamModal, setTeamModal] = useState(false)
  const [promoModal, setPromoModal] = useState(false)

  // 폼 상태
  const [grantForm, setGrantForm] = useState({ plan: 'pro', months: 1, reason: '' })
  const [teamForm, setTeamForm] = useState({ teamName: '', plan: 'pro', months: 12, memberEmails: '', discount: 20 })
  const [promoForm, setPromoForm] = useState({ code: '', plan: 'pro', months: 1, maxUses: '', description: '' })

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
      const [usersRes, statsRes, promoRes] = await Promise.all([
        axios.get('/api/admin/users'),
        axios.get('/api/admin/stats'),
        axios.get('/api/admin/promo-codes').catch(() => ({ data: [] }))
      ])
      setUsers(usersRes.data)
      setStats(statsRes.data)
      setPromoCodes(promoRes.data)
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
      fetchData()
    } catch (err) {
      alert(err.response?.data?.error || '사용자 삭제에 실패했습니다.')
    }
  }

  // 구독 부여
  const handleGrantSubscription = async () => {
    try {
      const res = await axios.post(`/api/admin/users/${grantModal.user.id}/grant-subscription`, grantForm)
      alert(res.data.message)
      setGrantModal({ open: false, user: null })
      setGrantForm({ plan: 'pro', months: 1, reason: '' })
    } catch (err) {
      alert(err.response?.data?.error || '구독 부여에 실패했습니다.')
    }
  }

  // 팀 구독 생성
  const handleTeamSubscription = async () => {
    try {
      const emails = teamForm.memberEmails.split('\n').map(e => e.trim()).filter(e => e)
      const res = await axios.post('/api/admin/team-subscription', {
        ...teamForm,
        memberEmails: emails
      })
      alert(`${res.data.message}\n\n성공: ${res.data.results.success.length}명\n미가입: ${res.data.results.notFound.length}명\n\n예상 결제금액: ${res.data.pricing.finalPrice.toLocaleString()}원`)
      setTeamModal(false)
      setTeamForm({ teamName: '', plan: 'pro', months: 12, memberEmails: '', discount: 20 })
    } catch (err) {
      alert(err.response?.data?.error || '팀 구독 생성에 실패했습니다.')
    }
  }

  // 프로모션 코드 생성
  const handleCreatePromoCode = async () => {
    try {
      const res = await axios.post('/api/admin/promo-codes', promoForm)
      alert(res.data.message)
      setPromoModal(false)
      setPromoForm({ code: '', plan: 'pro', months: 1, maxUses: '', description: '' })
      fetchData()
    } catch (err) {
      alert(err.response?.data?.error || '프로모션 코드 생성에 실패했습니다.')
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
        <p className="text-gray-600 mt-2">사용자 관리, 구독 부여, 프로모션 코드를 관리합니다.</p>
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

      {/* 빠른 작업 버튼 */}
      <div className="flex flex-wrap gap-4 mb-8">
        <button
          onClick={() => setTeamModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Building2 className="w-5 h-5" />
          팀/지점 구독 생성
        </button>
        <button
          onClick={() => setPromoModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Ticket className="w-5 h-5" />
          프로모션 코드 생성
        </button>
      </div>

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
            onClick={() => setActiveTab('promo')}
            className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
              activeTab === 'promo'
                ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Ticket className="w-5 h-5 inline-block mr-2" />
            프로모션 코드
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
                        <div className="flex items-center justify-center gap-2">
                          {u.id !== user.id && (
                            <>
                              <button
                                onClick={() => setGrantModal({ open: true, user: u })}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="무료 구독 부여"
                              >
                                <Gift className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u.id, u.name)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="사용자 삭제"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'promo' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">프로모션 코드 목록</h3>
              {promoCodes.length === 0 ? (
                <p className="text-gray-500">생성된 프로모션 코드가 없습니다.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">코드</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">요금제</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">기간</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">사용/제한</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">설명</th>
                      </tr>
                    </thead>
                    <tbody>
                      {promoCodes.map((code) => (
                        <tr key={code.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-mono font-bold text-purple-600">{code.code}</td>
                          <td className="py-3 px-4">{PLANS[code.plan]?.name || code.plan}</td>
                          <td className="py-3 px-4">{code.months}개월</td>
                          <td className="py-3 px-4">
                            {code.used_count} / {code.max_uses || '무제한'}
                          </td>
                          <td className="py-3 px-4 text-gray-600">{code.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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

      {/* 구독 부여 모달 */}
      {grantModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">무료 구독 부여</h3>
              <button onClick={() => setGrantModal({ open: false, user: null })} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-gray-600 mb-4">
              <strong>{grantModal.user?.name}</strong>님에게 무료 구독을 부여합니다.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">요금제</label>
                <select
                  value={grantForm.plan}
                  onChange={(e) => setGrantForm({ ...grantForm, plan: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="basic">베이직 (4,900원/월)</option>
                  <option value="pro">프로 (9,900원/월)</option>
                  <option value="business">비즈니스 (29,900원/월)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">기간 (개월)</label>
                <select
                  value={grantForm.months}
                  onChange={(e) => setGrantForm({ ...grantForm, months: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  {[1, 2, 3, 6, 12].map(m => (
                    <option key={m} value={m}>{m}개월</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">사유</label>
                <input
                  type="text"
                  value={grantForm.reason}
                  onChange={(e) => setGrantForm({ ...grantForm, reason: e.target.value })}
                  placeholder="예: 파일럿 테스트, 교보생명 지점"
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setGrantModal({ open: false, user: null })}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleGrantSubscription}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                부여하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 팀 구독 모달 */}
      {teamModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">팀/지점 구독 생성</h3>
              <button onClick={() => setTeamModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">팀/지점 이름</label>
                <input
                  type="text"
                  value={teamForm.teamName}
                  onChange={(e) => setTeamForm({ ...teamForm, teamName: e.target.value })}
                  placeholder="예: 교보생명 강남지점"
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">요금제</label>
                  <select
                    value={teamForm.plan}
                    onChange={(e) => setTeamForm({ ...teamForm, plan: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    <option value="basic">베이직</option>
                    <option value="pro">프로</option>
                    <option value="business">비즈니스</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">기간</label>
                  <select
                    value={teamForm.months}
                    onChange={(e) => setTeamForm({ ...teamForm, months: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    {[1, 3, 6, 12].map(m => (
                      <option key={m} value={m}>{m}개월</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">할인율 (%)</label>
                <input
                  type="number"
                  value={teamForm.discount}
                  onChange={(e) => setTeamForm({ ...teamForm, discount: parseInt(e.target.value) })}
                  placeholder="20"
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">멤버 이메일 (줄바꿈으로 구분)</label>
                <textarea
                  value={teamForm.memberEmails}
                  onChange={(e) => setTeamForm({ ...teamForm, memberEmails: e.target.value })}
                  placeholder="user1@example.com
user2@example.com
user3@example.com"
                  rows={6}
                  className="w-full px-4 py-2 border rounded-lg font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  * 회원가입된 이메일만 적용됩니다.
                </p>
              </div>

              {/* 가격 미리보기 */}
              {teamForm.memberEmails && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    예상 인원: {teamForm.memberEmails.split('\n').filter(e => e.trim()).length}명<br />
                    기본가: {(PLANS[teamForm.plan]?.price * teamForm.months * teamForm.memberEmails.split('\n').filter(e => e.trim()).length).toLocaleString()}원<br />
                    할인 ({teamForm.discount}%): -{((PLANS[teamForm.plan]?.price * teamForm.months * teamForm.memberEmails.split('\n').filter(e => e.trim()).length) * teamForm.discount / 100).toLocaleString()}원<br />
                    <strong>최종가: {((PLANS[teamForm.plan]?.price * teamForm.months * teamForm.memberEmails.split('\n').filter(e => e.trim()).length) * (100 - teamForm.discount) / 100).toLocaleString()}원</strong>
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setTeamModal(false)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleTeamSubscription}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                생성하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 프로모션 코드 모달 */}
      {promoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">프로모션 코드 생성</h3>
              <button onClick={() => setPromoModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">코드</label>
                <input
                  type="text"
                  value={promoForm.code}
                  onChange={(e) => setPromoForm({ ...promoForm, code: e.target.value.toUpperCase() })}
                  placeholder="예: KYOBO2024"
                  className="w-full px-4 py-2 border rounded-lg font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">요금제</label>
                  <select
                    value={promoForm.plan}
                    onChange={(e) => setPromoForm({ ...promoForm, plan: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    <option value="basic">베이직</option>
                    <option value="pro">프로</option>
                    <option value="business">비즈니스</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">기간</label>
                  <select
                    value={promoForm.months}
                    onChange={(e) => setPromoForm({ ...promoForm, months: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    {[1, 2, 3, 6, 12].map(m => (
                      <option key={m} value={m}>{m}개월</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">사용 제한 (빈칸=무제한)</label>
                <input
                  type="number"
                  value={promoForm.maxUses}
                  onChange={(e) => setPromoForm({ ...promoForm, maxUses: e.target.value })}
                  placeholder="무제한"
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                <input
                  type="text"
                  value={promoForm.description}
                  onChange={(e) => setPromoForm({ ...promoForm, description: e.target.value })}
                  placeholder="예: 교보생명 파일럿용"
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setPromoModal(false)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleCreatePromoCode}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                생성하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
