import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const API_URL = import.meta.env.VITE_API_URL || ''

export default function PricingPage() {
  const { isAuthenticated, token } = useAuth()
  const navigate = useNavigate()
  const [plans, setPlans] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [billingCycle, setBillingCycle] = useState('monthly')
  const [processingPlan, setProcessingPlan] = useState(null)

  useEffect(() => {
    fetchPlans()
    if (isAuthenticated) {
      fetchSubscription()
    }
  }, [isAuthenticated])

  const fetchPlans = async () => {
    try {
      const res = await fetch(`${API_URL}/api/plans`)
      const data = await res.json()
      setPlans(data)
    } catch (error) {
      console.error('요금제 조회 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSubscription = async () => {
    try {
      const res = await fetch(`${API_URL}/api/subscription`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setSubscription(data)
    } catch (error) {
      console.error('구독 정보 조회 오류:', error)
    }
  }

  const handleSubscribe = async (planKey) => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    if (planKey === 'free') return

    setProcessingPlan(planKey)

    try {
      // 결제 준비
      const prepareRes = await fetch(`${API_URL}/api/payments/prepare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ plan: planKey, billingCycle })
      })

      const paymentInfo = await prepareRes.json()

      if (!prepareRes.ok) {
        alert(paymentInfo.error || '결제 준비 중 오류가 발생했습니다.')
        setProcessingPlan(null)
        return
      }

      // 토스페이먼츠 SDK 로드 및 결제 요청
      const tossPayments = await loadTossPayments(paymentInfo.clientKey)

      await tossPayments.requestPayment('카드', {
        amount: paymentInfo.amount,
        orderId: paymentInfo.orderId,
        orderName: paymentInfo.orderName,
        customerEmail: paymentInfo.customerEmail,
        customerName: paymentInfo.customerName,
        successUrl: paymentInfo.successUrl,
        failUrl: paymentInfo.failUrl
      })
    } catch (error) {
      console.error('결제 오류:', error)
      if (error.code !== 'USER_CANCEL') {
        alert('결제 처리 중 오류가 발생했습니다.')
      }
    } finally {
      setProcessingPlan(null)
    }
  }

  // 토스페이먼츠 SDK 동적 로드
  const loadTossPayments = (clientKey) => {
    return new Promise((resolve, reject) => {
      if (window.TossPayments) {
        resolve(window.TossPayments(clientKey))
        return
      }

      const script = document.createElement('script')
      script.src = 'https://js.tosspayments.com/v1/payment'
      script.onload = () => resolve(window.TossPayments(clientKey))
      script.onerror = () => reject(new Error('토스페이먼츠 SDK 로드 실패'))
      document.head.appendChild(script)
    })
  }

  const formatPrice = (price) => {
    return price.toLocaleString('ko-KR')
  }

  const getFeatureLabel = (feature) => {
    const labels = {
      basic_qr: '기본 QR 생성',
      basic_colors: '기본 색상',
      high_resolution: '고화질 (최대 1000px)',
      color_custom: '색상 커스터마이징',
      logo_insert: '로고 삽입',
      batch_upload: '대량 업로드',
      analytics: '스캔 분석',
      dynamic_qr: '다이나믹 QR',
      api_access: 'API 접근',
      priority_support: '우선 지원'
    }
    return labels[feature] || feature
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const planOrder = ['free', 'basic', 'pro', 'business']

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">요금제</h1>
        <p className="text-xl text-gray-600 mb-8">
          필요에 맞는 플랜을 선택하세요
        </p>

        {/* 결제 주기 토글 */}
        <div className="inline-flex items-center bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              billingCycle === 'monthly'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            월간 결제
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              billingCycle === 'yearly'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            연간 결제
            <span className="ml-1 text-green-600 text-xs">2개월 무료</span>
          </button>
        </div>
      </div>

      {/* 현재 구독 상태 */}
      {subscription && (
        <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-blue-800 font-medium">
                현재 플랜: {subscription.planName}
              </span>
              {subscription.subscription && (
                <span className="ml-4 text-blue-600 text-sm">
                  만료일: {new Date(subscription.subscription.expiresAt).toLocaleDateString('ko-KR')}
                </span>
              )}
            </div>
            <div className="text-sm text-blue-600">
              이번 달 생성: {subscription.monthlyCount} / {subscription.monthlyLimit === -1 ? '무제한' : subscription.monthlyLimit}
            </div>
          </div>
        </div>
      )}

      {/* 요금제 카드 */}
      <div className="grid md:grid-cols-4 gap-6">
        {plans && planOrder.map((key) => {
          const plan = plans[key]
          if (!plan) return null

          const isCurrentPlan = subscription?.plan === key
          const price = key === 'free' ? 0 : (billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice)
          const isPopular = key === 'pro'

          return (
            <div
              key={key}
              className={`relative bg-white rounded-2xl shadow-lg p-6 ${
                isPopular ? 'ring-2 ring-blue-500' : ''
              } ${isCurrentPlan ? 'bg-blue-50' : ''}`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    인기
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <div className="text-3xl font-bold text-gray-900">
                  {price === 0 ? (
                    '무료'
                  ) : (
                    <>
                      {formatPrice(price)}
                      <span className="text-base font-normal text-gray-500">
                        원/{billingCycle === 'yearly' ? '년' : '월'}
                      </span>
                    </>
                  )}
                </div>
                {billingCycle === 'yearly' && key !== 'free' && (
                  <div className="text-sm text-green-600 mt-1">
                    월 {formatPrice(Math.round(price / 12))}원 (2개월 무료)
                  </div>
                )}
              </div>

              <ul className="space-y-3 mb-6">
                <li className="flex items-center text-sm">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  월 {plan.monthlyLimit === -1 ? '무제한' : `${plan.monthlyLimit}개`} 생성
                </li>
                <li className="flex items-center text-sm">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  최대 {plan.maxSize}px 해상도
                </li>
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center text-sm">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {getFeatureLabel(feature)}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(key)}
                disabled={isCurrentPlan || processingPlan === key}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                  isCurrentPlan
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : key === 'free'
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : isPopular
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                } ${processingPlan === key ? 'opacity-50' : ''}`}
              >
                {processingPlan === key ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    처리 중...
                  </span>
                ) : isCurrentPlan ? (
                  '현재 플랜'
                ) : key === 'free' ? (
                  '무료로 시작'
                ) : (
                  '구독하기'
                )}
              </button>
            </div>
          )
        })}
      </div>

      {/* FAQ 섹션 */}
      <div className="mt-16">
        <h2 className="text-2xl font-bold text-center mb-8">자주 묻는 질문</h2>
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="font-bold mb-2">다이나믹 QR코드란?</h3>
            <p className="text-gray-600 text-sm">
              QR코드는 그대로 두고 연결되는 URL을 언제든 변경할 수 있습니다.
              인쇄 후에도 목적지를 수정할 수 있어 재인쇄 비용을 절약할 수 있습니다.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="font-bold mb-2">스캔 분석이란?</h3>
            <p className="text-gray-600 text-sm">
              QR코드가 언제, 어디서, 어떤 기기로 스캔되었는지 통계를 제공합니다.
              마케팅 효과를 측정하는데 유용합니다.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="font-bold mb-2">언제든 플랜을 변경할 수 있나요?</h3>
            <p className="text-gray-600 text-sm">
              네, 언제든 상위 플랜으로 업그레이드할 수 있습니다.
              남은 기간에 대해 일할 계산됩니다.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="font-bold mb-2">환불 정책은?</h3>
            <p className="text-gray-600 text-sm">
              결제 후 7일 이내 환불 요청 시 전액 환불됩니다.
              7일 이후에는 남은 기간에 대해 일할 환불됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
