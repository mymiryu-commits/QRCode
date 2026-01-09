import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import {
  Download, Users, Smartphone, Check, AlertCircle,
  Loader2, Phone, Mail, Building2, UserCircle
} from 'lucide-react'

export default function SharePage() {
  const { batchId } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [batchInfo, setBatchInfo] = useState(null)
  const [downloading, setDownloading] = useState(false)
  const [downloaded, setDownloaded] = useState(false)

  useEffect(() => {
    fetchBatchInfo()
  }, [batchId])

  const fetchBatchInfo = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`/api/share/${batchId}`)
      setBatchInfo(response.data)
    } catch (error) {
      console.error('배치 정보 조회 오류:', error)
      setError(error.response?.data?.error || '연락처 정보를 불러올 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  const downloadVcf = async () => {
    try {
      setDownloading(true)
      const response = await axios.get(`/api/share/${batchId}/vcf`, {
        responseType: 'blob'
      })

      // 파일 다운로드
      const blob = new Blob([response.data], { type: 'text/vcard' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `연락처_${batchInfo?.totalCount || ''}명.vcf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setDownloaded(true)
    } catch (error) {
      console.error('다운로드 오류:', error)
      alert('다운로드 중 오류가 발생했습니다.')
    } finally {
      setDownloading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">연락처 정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">오류 발생</h1>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        {/* 메인 카드 */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          {/* 헤더 */}
          <div className="bg-gradient-to-r from-primary-500 via-purple-500 to-pink-500 p-6 text-white text-center">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold mb-1">연락처 일괄 저장</h1>
            <p className="text-white/80 text-sm">
              {batchInfo?.ownerName && `${batchInfo.ownerName}님이 공유한 연락처`}
            </p>
          </div>

          {/* 정보 */}
          <div className="p-6">
            {/* 연락처 수 */}
            <div className="bg-slate-50 rounded-2xl p-4 mb-6 text-center">
              <p className="text-4xl font-bold text-primary-600 mb-1">
                {batchInfo?.totalCount || 0}명
              </p>
              <p className="text-slate-500 text-sm">의 연락처가 포함되어 있습니다</p>
            </div>

            {/* 미리보기 */}
            {batchInfo?.preview && batchInfo.preview.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-slate-700 mb-3">포함된 연락처 미리보기</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {batchInfo.preview.map((contact, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl"
                    >
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <UserCircle className="w-5 h-5 text-primary-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{contact.name}</p>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          {contact.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {contact.phone}
                            </span>
                          )}
                          {contact.company && (
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {contact.company}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {batchInfo.totalCount > 5 && (
                    <p className="text-center text-sm text-slate-400 py-2">
                      외 {batchInfo.totalCount - 5}명 더...
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* 다운로드 버튼 */}
            {!downloaded ? (
              <button
                onClick={downloadVcf}
                disabled={downloading}
                className="w-full bg-gradient-to-r from-primary-500 to-purple-500 text-white py-4 px-6 rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-70"
              >
                {downloading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    다운로드 중...
                  </>
                ) : (
                  <>
                    <Download className="w-6 h-6" />
                    연락처 전체 다운로드
                  </>
                )}
              </button>
            ) : (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-500" />
                </div>
                <p className="font-semibold text-green-600 mb-2">다운로드 완료!</p>
                <p className="text-sm text-slate-500 mb-4">
                  다운로드된 .vcf 파일을 열어서<br />연락처를 저장하세요
                </p>
                <button
                  onClick={downloadVcf}
                  className="text-primary-600 text-sm hover:underline"
                >
                  다시 다운로드
                </button>
              </div>
            )}

            {/* 안내 */}
            <div className="mt-6 p-4 bg-blue-50 rounded-xl">
              <div className="flex items-start gap-3">
                <Smartphone className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <p className="font-medium mb-1">저장 방법</p>
                  <ol className="list-decimal list-inside space-y-1 text-blue-600">
                    <li>위 버튼을 눌러 .vcf 파일 다운로드</li>
                    <li>다운로드된 파일 열기</li>
                    <li>"모든 연락처 추가" 선택</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <p className="text-center text-sm text-slate-400 mt-6">
          Powered by PlanX QR
        </p>
      </div>
    </div>
  )
}
