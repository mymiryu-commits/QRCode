import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import {
  Users, Shield, Trash2, BarChart3, QrCode,
  FolderOpen, AlertCircle, Check, Crown, Gift,
  Ticket, Building2, Calendar, X, Settings, Image,
  Upload, Loader2, Save
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

  // 사이트 설정 상태
  const [siteSettings, setSiteSettings] = useState({
    // 히어로 섹션
    heroImage: '/images/1.png',
    heroTitle: '10시간 → 10분으로',
    heroSubtitle: '연락처 일괄 저장',
    heroDescription: '엑셀로 관리하던 수백 명의 연락처, QR코드 하나로 고객 폰에 바로 저장하세요.',
    heroBadge: '보험 FP · 영업팀을 위한 업무 자동화',
    // 섹션 표시 설정
    showUseCases: true,
    showTestimonials: true,
    showPremiumFeatures: true,
    showCharacterQR: true,
    // CTA 버튼
    ctaButtonText: '무료로 시작하기',
    ctaButtonLink: '/generate',
    // 업종별 활용 사례
    useCases: [
      { industry: '요식업', title: '스마트 메뉴판', description: '테이블마다 QR코드를 배치하여 고객이 스마트폰으로 메뉴를 확인하고 주문할 수 있습니다.', image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop' },
      { industry: '부동산', title: '매물 정보 QR', description: '현수막, 명함에 QR코드를 넣어 매물 상세 정보와 연락처를 즉시 전달합니다.', image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&h=400&fit=crop' },
      { industry: '기업/사무실', title: '디지털 명함', description: '종이 명함 대신 QR코드로 연락처를 전달하여 환경도 보호하고 전문성도 높입니다.', image: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=600&h=400&fit=crop' },
      { industry: '이벤트/행사', title: '행사 안내 QR', description: '초대장, 포스터에 QR코드를 넣어 행사 정보와 참가 신청을 간편하게 처리합니다.', image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop' }
    ],
    // 고객 후기
    testimonials: [
      { name: '김사장', role: '강남 레스토랑 대표', content: '메뉴판 QR코드 도입 후 인쇄비가 월 50만원 이상 절감됐어요. 메뉴 변경도 실시간으로 가능해서 너무 편합니다.', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face' },
      { name: '이과장', role: '○○부동산 팀장', content: '현수막에 QR코드를 넣으니 밤에도 고객이 매물 정보를 확인하고 연락이 와요. 문의가 30% 이상 늘었습니다.', image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face' },
      { name: '박대리', role: 'IT 스타트업', content: '대량 생성 기능으로 직원 200명 명함 QR코드를 10분 만에 만들었어요. API 연동도 깔끔합니다.', image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face' }
    ],
    // 프리미엄 기능
    premiumFeatures: [
      { title: '브랜드 커스터마이징', description: '로고 삽입, 색상 변경으로 브랜드 아이덴티티를 유지한 QR코드', image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=300&fit=crop' },
      { title: '스캔 분석 리포트', description: '언제, 어디서, 몇 명이 스캔했는지 실시간 데이터 확인', image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop' },
      { title: '동적 QR코드', description: '인쇄 후에도 연결 URL 변경 가능, 캠페인별 관리', image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop' },
      { title: 'API 연동', description: '자체 시스템과 연동하여 자동화된 QR코드 생성', image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&h=300&fit=crop' }
    ],
    // 캐릭터 QR 연락처
    characterQR: {
      phone: '1588-5617',
      email: 'mymiryu@gmail.com',
      contactName: 'PlanX QR 고객센터',
      website: 'https://30daysliving.com'
    }
  })
  const [availableImages, setAvailableImages] = useState([])
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)

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
      const [usersRes, statsRes, promoRes, settingsRes, imagesRes] = await Promise.all([
        axios.get('/api/admin/users'),
        axios.get('/api/admin/stats'),
        axios.get('/api/admin/promo-codes').catch(() => ({ data: [] })),
        axios.get('/api/settings').catch(() => ({ data: {} })),
        axios.get('/api/admin/images').catch(() => ({ data: [] }))
      ])
      setUsers(usersRes.data)
      setStats(statsRes.data)
      setPromoCodes(promoRes.data)
      if (settingsRes.data) {
        setSiteSettings(prev => ({ ...prev, ...settingsRes.data }))
      }
      setAvailableImages(imagesRes.data || [])
    } catch (err) {
      setError(err.response?.data?.error || '데이터를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 사이트 설정 저장
  const handleSaveSettings = async () => {
    setSettingsLoading(true)
    try {
      await axios.put('/api/admin/settings', siteSettings)
      setSettingsSaved(true)
      setTimeout(() => setSettingsSaved(false), 3000)
    } catch (err) {
      alert(err.response?.data?.error || '설정 저장에 실패했습니다.')
    } finally {
      setSettingsLoading(false)
    }
  }

  // 이미지 업로드 (히어로)
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('image', file)

    try {
      setSettingsLoading(true)
      const res = await axios.post('/api/admin/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setSiteSettings(prev => ({ ...prev, heroImage: res.data.imageUrl }))
      // 이미지 목록 새로고침
      const imagesRes = await axios.get('/api/admin/images')
      setAvailableImages(imagesRes.data || [])
    } catch (err) {
      alert(err.response?.data?.error || '이미지 업로드에 실패했습니다.')
    } finally {
      setSettingsLoading(false)
    }
  }

  // 범용 이미지 업로드 핸들러
  const handleSectionImageUpload = async (e, sectionType, index) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('image', file)

    try {
      setSettingsLoading(true)
      const res = await axios.post('/api/admin/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      const imageUrl = res.data.imageUrl

      if (sectionType === 'useCases') {
        const newUseCases = [...siteSettings.useCases]
        newUseCases[index] = { ...newUseCases[index], image: imageUrl }
        setSiteSettings(prev => ({ ...prev, useCases: newUseCases }))
      } else if (sectionType === 'testimonials') {
        const newTestimonials = [...siteSettings.testimonials]
        newTestimonials[index] = { ...newTestimonials[index], image: imageUrl }
        setSiteSettings(prev => ({ ...prev, testimonials: newTestimonials }))
      } else if (sectionType === 'premiumFeatures') {
        const newFeatures = [...siteSettings.premiumFeatures]
        newFeatures[index] = { ...newFeatures[index], image: imageUrl }
        setSiteSettings(prev => ({ ...prev, premiumFeatures: newFeatures }))
      }

      // 이미지 목록 새로고침
      const imagesRes = await axios.get('/api/admin/images')
      setAvailableImages(imagesRes.data || [])
    } catch (err) {
      alert(err.response?.data?.error || '이미지 업로드에 실패했습니다.')
    } finally {
      setSettingsLoading(false)
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
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
              activeTab === 'settings'
                ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Settings className="w-5 h-5 inline-block mr-2" />
            사이트 설정
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

          {/* 사이트 설정 탭 */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">홈페이지 설정</h3>
                <button
                  onClick={handleSaveSettings}
                  disabled={settingsLoading}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    settingsSaved
                      ? 'bg-green-100 text-green-700'
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  }`}
                >
                  {settingsLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : settingsSaved ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {settingsSaved ? '저장됨!' : '설정 저장'}
                </button>
              </div>

              {/* 히어로 이미지 선택 */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Image className="w-5 h-5 text-purple-600" />
                  히어로 섹션 이미지
                </h4>

                {/* 현재 선택된 이미지 미리보기 */}
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">현재 이미지:</p>
                  <div className="relative inline-block">
                    <img
                      src={siteSettings.heroImage}
                      alt="히어로 이미지"
                      className="h-40 rounded-lg shadow-lg object-cover"
                    />
                    <span className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      {siteSettings.heroImage}
                    </span>
                  </div>
                </div>

                {/* 이미지 업로드 */}
                <div className="mb-4">
                  <label className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-purple-400 transition-colors w-fit">
                    <Upload className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">새 이미지 업로드</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* 사용 가능한 이미지 목록 */}
                {availableImages.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">또는 기존 이미지 선택:</p>
                    <div className="grid grid-cols-4 md:grid-cols-6 gap-3 max-h-60 overflow-y-auto">
                      {availableImages.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSiteSettings(prev => ({ ...prev, heroImage: img.url }))}
                          className={`relative group rounded-lg overflow-hidden border-2 transition-all ${
                            siteSettings.heroImage === img.url
                              ? 'border-purple-500 ring-2 ring-purple-200'
                              : 'border-transparent hover:border-gray-300'
                          }`}
                        >
                          <img
                            src={img.url}
                            alt={img.name}
                            className="w-full h-20 object-cover"
                          />
                          {siteSettings.heroImage === img.url && (
                            <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
                              <Check className="w-6 h-6 text-purple-600" />
                            </div>
                          )}
                          <span className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                            {img.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 히어로 텍스트 설정 */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h4 className="font-medium text-gray-900 mb-4">히어로 섹션 텍스트</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">상단 배지 문구</label>
                    <input
                      type="text"
                      value={siteSettings.heroBadge || ''}
                      onChange={(e) => setSiteSettings(prev => ({ ...prev, heroBadge: e.target.value }))}
                      placeholder="보험 FP · 영업팀을 위한 업무 자동화"
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">메인 타이틀</label>
                    <input
                      type="text"
                      value={siteSettings.heroTitle}
                      onChange={(e) => setSiteSettings(prev => ({ ...prev, heroTitle: e.target.value }))}
                      placeholder="10시간 → 10분으로"
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">서브 타이틀</label>
                    <input
                      type="text"
                      value={siteSettings.heroSubtitle}
                      onChange={(e) => setSiteSettings(prev => ({ ...prev, heroSubtitle: e.target.value }))}
                      placeholder="연락처 일괄 저장"
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">설명 문구</label>
                    <textarea
                      value={siteSettings.heroDescription}
                      onChange={(e) => setSiteSettings(prev => ({ ...prev, heroDescription: e.target.value }))}
                      placeholder="엑셀로 관리하던 수백 명의 연락처..."
                      rows={3}
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* CTA 버튼 설정 */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h4 className="font-medium text-gray-900 mb-4">CTA 버튼 설정</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">버튼 텍스트</label>
                    <input
                      type="text"
                      value={siteSettings.ctaButtonText || ''}
                      onChange={(e) => setSiteSettings(prev => ({ ...prev, ctaButtonText: e.target.value }))}
                      placeholder="무료로 시작하기"
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">버튼 링크</label>
                    <input
                      type="text"
                      value={siteSettings.ctaButtonLink || ''}
                      onChange={(e) => setSiteSettings(prev => ({ ...prev, ctaButtonLink: e.target.value }))}
                      placeholder="/generate"
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* 섹션 표시 설정 */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h4 className="font-medium text-gray-900 mb-4">섹션 표시 설정</h4>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={siteSettings.showCharacterQR !== false}
                      onChange={(e) => setSiteSettings(prev => ({ ...prev, showCharacterQR: e.target.checked }))}
                      className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-gray-700">캐릭터 QR 섹션 표시</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={siteSettings.showUseCases !== false}
                      onChange={(e) => setSiteSettings(prev => ({ ...prev, showUseCases: e.target.checked }))}
                      className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-gray-700">업종별 활용 사례 섹션 표시</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={siteSettings.showTestimonials !== false}
                      onChange={(e) => setSiteSettings(prev => ({ ...prev, showTestimonials: e.target.checked }))}
                      className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-gray-700">고객 후기 섹션 표시</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={siteSettings.showPremiumFeatures !== false}
                      onChange={(e) => setSiteSettings(prev => ({ ...prev, showPremiumFeatures: e.target.checked }))}
                      className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-gray-700">프리미엄 기능 섹션 표시</span>
                  </label>
                </div>
              </div>

              {/* 캐릭터 QR 연락처 설정 */}
              {siteSettings.showCharacterQR !== false && (
              <div className="bg-amber-50 rounded-xl p-6">
                <h4 className="font-medium text-gray-900 mb-4">캐릭터 QR 연락처</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">전화번호</label>
                    <input
                      type="text"
                      value={siteSettings.characterQR?.phone || ''}
                      onChange={(e) => setSiteSettings(prev => ({ ...prev, characterQR: { ...prev.characterQR, phone: e.target.value } }))}
                      placeholder="1588-5617"
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                    <input
                      type="email"
                      value={siteSettings.characterQR?.email || ''}
                      onChange={(e) => setSiteSettings(prev => ({ ...prev, characterQR: { ...prev.characterQR, email: e.target.value } }))}
                      placeholder="support@example.com"
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">연락처 이름</label>
                    <input
                      type="text"
                      value={siteSettings.characterQR?.contactName || ''}
                      onChange={(e) => setSiteSettings(prev => ({ ...prev, characterQR: { ...prev.characterQR, contactName: e.target.value } }))}
                      placeholder="PlanX QR 고객센터"
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">웹사이트</label>
                    <input
                      type="url"
                      value={siteSettings.characterQR?.website || ''}
                      onChange={(e) => setSiteSettings(prev => ({ ...prev, characterQR: { ...prev.characterQR, website: e.target.value } }))}
                      placeholder="https://example.com"
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                </div>
              </div>
              )}

              {/* 업종별 활용 사례 설정 */}
              {siteSettings.showUseCases !== false && (
              <div className="bg-blue-50 rounded-xl p-6">
                <h4 className="font-medium text-gray-900 mb-4">업종별 활용 사례</h4>
                <div className="space-y-4">
                  {(siteSettings.useCases || []).map((useCase, index) => (
                    <div key={index} className="bg-white p-4 rounded-lg border">
                      <div className="flex items-center gap-4 mb-3">
                        <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                        <input
                          type="text"
                          value={useCase.industry}
                          onChange={(e) => {
                            const newUseCases = [...siteSettings.useCases]
                            newUseCases[index] = { ...newUseCases[index], industry: e.target.value }
                            setSiteSettings(prev => ({ ...prev, useCases: newUseCases }))
                          }}
                          placeholder="업종명"
                          className="flex-1 px-3 py-1.5 border rounded text-sm"
                        />
                      </div>
                      <input
                        type="text"
                        value={useCase.title}
                        onChange={(e) => {
                          const newUseCases = [...siteSettings.useCases]
                          newUseCases[index] = { ...newUseCases[index], title: e.target.value }
                          setSiteSettings(prev => ({ ...prev, useCases: newUseCases }))
                        }}
                        placeholder="제목"
                        className="w-full px-3 py-1.5 border rounded text-sm"
                      />
                      <textarea
                        value={useCase.description}
                        onChange={(e) => {
                          const newUseCases = [...siteSettings.useCases]
                          newUseCases[index] = { ...newUseCases[index], description: e.target.value }
                          setSiteSettings(prev => ({ ...prev, useCases: newUseCases }))
                        }}
                        placeholder="설명"
                        rows={2}
                        className="w-full mt-3 px-3 py-1.5 border rounded text-sm"
                      />
                      <div className="mt-3 flex items-center gap-3">
                        <label className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded cursor-pointer hover:bg-blue-200 transition-colors text-sm">
                          <Upload className="w-4 h-4" />
                          이미지 업로드
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleSectionImageUpload(e, 'useCases', index)}
                            className="hidden"
                          />
                        </label>
                        {useCase.image && (
                          <img src={useCase.image} alt={useCase.title} className="h-16 rounded object-cover" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              )}

              {/* 고객 후기 설정 */}
              {siteSettings.showTestimonials !== false && (
              <div className="bg-yellow-50 rounded-xl p-6">
                <h4 className="font-medium text-gray-900 mb-4">고객 후기</h4>
                <div className="space-y-4">
                  {(siteSettings.testimonials || []).map((testimonial, index) => (
                    <div key={index} className="bg-white p-4 rounded-lg border">
                      <div className="flex items-center gap-4 mb-3">
                        <span className="text-sm font-bold text-yellow-600">#{index + 1}</span>
                        <input
                          type="text"
                          value={testimonial.name}
                          onChange={(e) => {
                            const newTestimonials = [...siteSettings.testimonials]
                            newTestimonials[index] = { ...newTestimonials[index], name: e.target.value }
                            setSiteSettings(prev => ({ ...prev, testimonials: newTestimonials }))
                          }}
                          placeholder="이름"
                          className="flex-1 px-3 py-1.5 border rounded text-sm"
                        />
                        <input
                          type="text"
                          value={testimonial.role}
                          onChange={(e) => {
                            const newTestimonials = [...siteSettings.testimonials]
                            newTestimonials[index] = { ...newTestimonials[index], role: e.target.value }
                            setSiteSettings(prev => ({ ...prev, testimonials: newTestimonials }))
                          }}
                          placeholder="직책/회사"
                          className="flex-1 px-3 py-1.5 border rounded text-sm"
                        />
                      </div>
                      <textarea
                        value={testimonial.content}
                        onChange={(e) => {
                          const newTestimonials = [...siteSettings.testimonials]
                          newTestimonials[index] = { ...newTestimonials[index], content: e.target.value }
                          setSiteSettings(prev => ({ ...prev, testimonials: newTestimonials }))
                        }}
                        placeholder="후기 내용"
                        rows={2}
                        className="w-full px-3 py-1.5 border rounded text-sm"
                      />
                      <div className="mt-3 flex items-center gap-3">
                        <label className="flex items-center gap-2 px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded cursor-pointer hover:bg-yellow-200 transition-colors text-sm">
                          <Upload className="w-4 h-4" />
                          프로필 이미지
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleSectionImageUpload(e, 'testimonials', index)}
                            className="hidden"
                          />
                        </label>
                        {testimonial.image && (
                          <img src={testimonial.image} alt={testimonial.name} className="w-16 h-16 rounded-full object-cover" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              )}

              {/* 프리미엄 기능 설정 */}
              {siteSettings.showPremiumFeatures !== false && (
              <div className="bg-purple-50 rounded-xl p-6">
                <h4 className="font-medium text-gray-900 mb-4">프리미엄 기능</h4>
                <div className="space-y-4">
                  {(siteSettings.premiumFeatures || []).map((feature, index) => (
                    <div key={index} className="bg-white p-4 rounded-lg border">
                      <div className="flex items-center gap-4 mb-3">
                        <span className="text-sm font-bold text-purple-600">#{index + 1}</span>
                        <input
                          type="text"
                          value={feature.title}
                          onChange={(e) => {
                            const newFeatures = [...siteSettings.premiumFeatures]
                            newFeatures[index] = { ...newFeatures[index], title: e.target.value }
                            setSiteSettings(prev => ({ ...prev, premiumFeatures: newFeatures }))
                          }}
                          placeholder="기능 제목"
                          className="flex-1 px-3 py-1.5 border rounded text-sm"
                        />
                      </div>
                      <textarea
                        value={feature.description}
                        onChange={(e) => {
                          const newFeatures = [...siteSettings.premiumFeatures]
                          newFeatures[index] = { ...newFeatures[index], description: e.target.value }
                          setSiteSettings(prev => ({ ...prev, premiumFeatures: newFeatures }))
                        }}
                        placeholder="설명"
                        rows={2}
                        className="w-full px-3 py-1.5 border rounded text-sm"
                      />
                      <div className="mt-3 flex items-center gap-3">
                        <label className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded cursor-pointer hover:bg-purple-200 transition-colors text-sm">
                          <Upload className="w-4 h-4" />
                          이미지 업로드
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleSectionImageUpload(e, 'premiumFeatures', index)}
                            className="hidden"
                          />
                        </label>
                        {feature.image && (
                          <img src={feature.image} alt={feature.title} className="h-16 rounded object-cover" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              )}

              {/* 미리보기 */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6">
                <h4 className="font-medium text-gray-900 mb-4">미리보기</h4>
                <div className="bg-white rounded-lg p-4 shadow-inner">
                  <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="flex-1">
                      <p className="text-sm text-gray-400 line-through">10시간</p>
                      <h2 className="text-xl font-bold text-purple-600">{siteSettings.heroTitle}</h2>
                      <p className="text-lg font-semibold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                        {siteSettings.heroSubtitle}
                      </p>
                      <p className="text-sm text-gray-600 mt-2">{siteSettings.heroDescription}</p>
                    </div>
                    <img
                      src={siteSettings.heroImage}
                      alt="미리보기"
                      className="w-32 h-24 object-cover rounded-lg"
                    />
                  </div>
                </div>
              </div>
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
