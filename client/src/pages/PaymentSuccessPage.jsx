import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const API_URL = import.meta.env.VITE_API_URL || ''

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { token } = useAuth()
  const [status, setStatus] = useState('processing')
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    confirmPayment()
  }, [])

  const confirmPayment = async () => {
    const paymentKey = searchParams.get('paymentKey')
    const orderId = searchParams.get('orderId')
    const amount = parseInt(searchParams.get('amount'))

    if (!paymentKey || !orderId || !amount) {
      setStatus('error')
      setError('결제 정보가 올바르지 않습니다.')
      return
    }

    try {
      const res = await fetch(`${API_URL}/api/payments/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ paymentKey, orderId, amount })
      })

      const data = await res.json()

      if (res.ok) {
        setStatus('success')
        setResult(data)
      } else {
        setStatus('error')
        setError(data.error || '결제 승인에 실패했습니다.')
      }
    } catch (err) {
      setStatus('error')
      setError('결제 처리 중 오류가 발생했습니다.')
    }
  }

  return (
    <div className="max-w-lg mx-auto text-center py-16">
      {status === 'processing' && (
        <div>
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">결제 승인 중...</h1>
          <p className="text-gray-600">잠시만 기다려주세요.</p>
        </div>
      )}

      {status === 'success' && (
        <div>
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">결제가 완료되었습니다!</h1>
          <p className="text-gray-600 mb-6">
            {result?.subscription?.plan} 플랜이 활성화되었습니다.
          </p>
          {result?.subscription?.expiresAt && (
            <p className="text-sm text-gray-500 mb-8">
              만료일: {new Date(result.subscription.expiresAt).toLocaleDateString('ko-KR')}
            </p>
          )}
          <div className="space-x-4">
            <Link
              to="/generate"
              className="inline-block bg-blue-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-600 transition-colors"
            >
              QR코드 생성하기
            </Link>
            <Link
              to="/pricing"
              className="inline-block bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              구독 정보 확인
            </Link>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div>
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">결제 승인 실패</h1>
          <p className="text-red-600 mb-6">{error}</p>
          <div className="space-x-4">
            <Link
              to="/pricing"
              className="inline-block bg-blue-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-600 transition-colors"
            >
              다시 시도하기
            </Link>
            <Link
              to="/"
              className="inline-block bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              홈으로
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
