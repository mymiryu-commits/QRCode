import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { Loader2, AlertCircle } from 'lucide-react'

export default function KakaoCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { login } = useAuth()
  const [error, setError] = useState('')

  useEffect(() => {
    const code = searchParams.get('code')
    const errorParam = searchParams.get('error')

    if (errorParam) {
      setError('카카오 로그인이 취소되었습니다.')
      setTimeout(() => navigate('/login'), 2000)
      return
    }

    if (!code) {
      setError('인가 코드가 없습니다.')
      setTimeout(() => navigate('/login'), 2000)
      return
    }

    // 백엔드로 인가 코드 전송
    const handleKakaoCallback = async () => {
      try {
        const response = await axios.post('/api/auth/kakao/callback', { code })
        const { token, user } = response.data

        // 로컬스토리지에 토큰 저장 및 상태 업데이트
        localStorage.setItem('token', token)
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`

        // 홈으로 이동 후 페이지 새로고침으로 상태 반영
        window.location.href = '/'
      } catch (err) {
        console.error('카카오 로그인 오류:', err)
        setError(err.response?.data?.error || '카카오 로그인에 실패했습니다.')
        setTimeout(() => navigate('/login'), 3000)
      }
    }

    handleKakaoCallback()
  }, [searchParams, navigate])

  if (error) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-red-600 font-medium">{error}</p>
          <p className="text-gray-500 mt-2 text-sm">로그인 페이지로 이동합니다...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-yellow-500 animate-spin mx-auto mb-4" />
        <p className="text-gray-700 font-medium">카카오 로그인 처리 중...</p>
        <p className="text-gray-500 mt-2 text-sm">잠시만 기다려주세요</p>
      </div>
    </div>
  )
}
