import { useState, useEffect } from 'react'
import axios from 'axios'
import { saveAs } from 'file-saver'
import {
  History, Download, Trash2, ChevronLeft, ChevronRight,
  Search, Filter, Loader2, QrCode, Calendar, Tag
} from 'lucide-react'

const typeLabels = {
  vcard: { name: '연락처', color: 'bg-blue-100 text-blue-700' },
  wifi: { name: 'WiFi', color: 'bg-green-100 text-green-700' },
  url: { name: 'URL', color: 'bg-purple-100 text-purple-700' },
  email: { name: '이메일', color: 'bg-orange-100 text-orange-700' },
  phone: { name: '전화', color: 'bg-red-100 text-red-700' },
  sms: { name: 'SMS', color: 'bg-cyan-100 text-cyan-700' },
  geo: { name: '위치', color: 'bg-pink-100 text-pink-700' },
  event: { name: '이벤트', color: 'bg-indigo-100 text-indigo-700' },
  text: { name: '텍스트', color: 'bg-slate-100 text-slate-700' },
}

export default function HistoryPage() {
  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [selectedType, setSelectedType] = useState('')
  const [stats, setStats] = useState(null)
  const [selectedItem, setSelectedItem] = useState(null)

  useEffect(() => {
    fetchHistory()
    fetchStats()
  }, [pagination.page, selectedType])

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const params = { page: pagination.page, limit: 12 }
      if (selectedType) params.type = selectedType

      const response = await axios.get('/api/qr/history', { params })
      setItems(response.data.items)
      setPagination(response.data.pagination)
    } catch (error) {
      console.error('히스토리 조회 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/stats')
      setStats(response.data)
    } catch (error) {
      console.error('통계 조회 오류:', error)
    }
  }

  const downloadQR = (item) => {
    const byteString = atob(item.data_url.split(',')[1])
    const mimeString = item.data_url.split(',')[0].split(':')[1].split(';')[0]
    const ab = new ArrayBuffer(byteString.length)
    const ia = new Uint8Array(ab)
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i)
    }
    const blob = new Blob([ab], { type: mimeString })
    saveAs(blob, `${item.name || 'qrcode'}.png`)
  }

  const deleteQR = async (id) => {
    if (!confirm('이 QR코드를 삭제하시겠습니까?')) return

    try {
      await axios.delete(`/api/qr/${id}`)
      fetchHistory()
      fetchStats()
      setSelectedItem(null)
    } catch (error) {
      console.error('삭제 오류:', error)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">QR코드 히스토리</h1>
        <p className="text-slate-600">생성한 모든 QR코드를 확인하고 관리하세요</p>
      </div>

      {/* 통계 카드 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card text-center">
            <QrCode className="w-8 h-8 text-primary-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-900">{stats.totalQRs}</p>
            <p className="text-sm text-slate-500">총 QR코드</p>
          </div>
          <div className="card text-center">
            <History className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-900">{stats.totalBatches}</p>
            <p className="text-sm text-slate-500">배치 작업</p>
          </div>
          {stats.typeStats.slice(0, 2).map((stat) => (
            <div key={stat.type} className="card text-center">
              <Tag className="w-8 h-8 text-purple-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-slate-900">{stat.count}</p>
              <p className="text-sm text-slate-500">{typeLabels[stat.type]?.name || stat.type}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* 메인 리스트 */}
        <div className="flex-1">
          {/* 필터 */}
          <div className="card mb-4">
            <div className="flex flex-wrap items-center gap-3">
              <Filter className="w-5 h-5 text-slate-400" />
              <button
                onClick={() => {
                  setSelectedType('')
                  setPagination(p => ({ ...p, page: 1 }))
                }}
                className={`tab-button ${!selectedType ? 'active' : ''}`}
              >
                전체
              </button>
              {Object.entries(typeLabels).map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => {
                    setSelectedType(key)
                    setPagination(p => ({ ...p, page: 1 }))
                  }}
                  className={`tab-button ${selectedType === key ? 'active' : ''}`}
                >
                  {value.name}
                </button>
              ))}
            </div>
          </div>

          {/* QR 코드 그리드 */}
          {loading ? (
            <div className="card flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="card text-center py-20">
              <QrCode className="w-16 h-16 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-500">생성된 QR코드가 없습니다</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`card p-4 cursor-pointer hover:shadow-lg transition-all duration-200 ${
                    selectedItem?.id === item.id ? 'ring-2 ring-primary-500' : ''
                  }`}
                >
                  <img
                    src={item.data_url}
                    alt={item.name}
                    className="w-full aspect-square object-contain bg-slate-50 rounded-lg mb-3"
                  />
                  <p className="font-medium text-slate-900 truncate text-sm">
                    {item.name}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${typeLabels[item.type]?.color || 'bg-slate-100 text-slate-600'}`}>
                      {typeLabels[item.type]?.name || item.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 페이지네이션 */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                disabled={pagination.page === 1}
                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-slate-600">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                disabled={pagination.page === pagination.totalPages}
                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* 상세 패널 */}
        {selectedItem && (
          <div className="lg:w-80">
            <div className="card sticky top-24">
              <h3 className="font-semibold text-slate-900 mb-4">QR코드 상세</h3>

              <div className="bg-slate-50 rounded-xl p-4 mb-4">
                <img
                  src={selectedItem.data_url}
                  alt={selectedItem.name}
                  className="w-full aspect-square object-contain bg-white rounded-lg"
                />
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-slate-500">이름</p>
                  <p className="font-medium text-slate-900">{selectedItem.name}</p>
                </div>
                <div>
                  <p className="text-slate-500">유형</p>
                  <span className={`inline-block text-xs px-2 py-1 rounded-full ${typeLabels[selectedItem.type]?.color}`}>
                    {typeLabels[selectedItem.type]?.name || selectedItem.type}
                  </span>
                </div>
                <div>
                  <p className="text-slate-500">생성일</p>
                  <p className="font-medium text-slate-900">
                    {formatDate(selectedItem.created_at)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">내용</p>
                  <p className="font-mono text-xs bg-slate-100 p-2 rounded-lg break-all max-h-32 overflow-auto">
                    {selectedItem.content}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => downloadQR(selectedItem)}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm"
                >
                  <Download className="w-4 h-4" />
                  다운로드
                </button>
                <button
                  onClick={() => deleteQR(selectedItem.id)}
                  className="btn-secondary flex items-center justify-center gap-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
