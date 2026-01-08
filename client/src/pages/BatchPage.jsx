import { useState, useRef } from 'react'
import axios from 'axios'
import { saveAs } from 'file-saver'
import JSZip from 'jszip'
import {
  Upload, FileSpreadsheet, Download, Loader2, Check,
  User, Wifi, Link as LinkIcon, Mail, AlertCircle,
  Package, X, FileDown, Phone, MessageSquare, Info
} from 'lucide-react'

const batchTypes = [
  { id: 'vcard', name: '연락처', icon: User, description: '이름, 전화번호만 필수', required: '이름, 전화번호', optional: '이메일, 회사, 직책, 주소, 메모, 접미사, 그룹' },
  { id: 'wifi', name: 'WiFi', icon: Wifi, description: '네트워크이름, 비밀번호', required: '네트워크이름, 비밀번호', optional: '암호화(기본:WPA)' },
  { id: 'url', name: 'URL', icon: LinkIcon, description: 'URL 주소 목록', required: '주소', optional: '이름' },
  { id: 'email', name: '이메일', icon: Mail, description: '이메일 주소', required: '이메일', optional: '이름, 제목, 내용' },
  { id: 'phone', name: '전화', icon: Phone, description: '전화번호', required: '전화번호', optional: '이름' },
  { id: 'sms', name: 'SMS', icon: MessageSquare, description: '문자 메시지', required: '전화번호', optional: '이름, 내용' },
]

export default function BatchPage() {
  const [selectedType, setSelectedType] = useState('vcard')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv'
      ]
      if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.csv')) {
        setError('엑셀(.xlsx, .xls) 또는 CSV 파일만 업로드 가능합니다.')
        return
      }
      setFile(selectedFile)
      setError(null)
      setResults(null)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      setFile(droppedFile)
      setError(null)
      setResults(null)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const downloadTemplate = async () => {
    try {
      const response = await axios.get(`/api/templates/${selectedType}`, {
        responseType: 'blob'
      })
      saveAs(response.data, `${selectedType}_template.xlsx`)
    } catch (error) {
      console.error('템플릿 다운로드 오류:', error)
      alert('템플릿 다운로드 중 오류가 발생했습니다.')
    }
  }

  const generateBatch = async () => {
    if (!file) {
      setError('파일을 선택해주세요.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', selectedType)
      formData.append('options', JSON.stringify({
        size: 300,
        errorCorrectionLevel: 'M'
      }))

      const response = await axios.post('/api/qr/batch', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      setResults(response.data)
    } catch (error) {
      console.error('대량 생성 오류:', error)
      setError(error.response?.data?.error || '대량 생성 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const downloadAll = async () => {
    if (!results || results.items.length === 0) return

    const zip = new JSZip()

    results.items.forEach((item, index) => {
      const base64Data = item.dataUrl.split(',')[1]
      zip.file(`${item.name || `qr_${index + 1}`}.png`, base64Data, { base64: true })
    })

    const content = await zip.generateAsync({ type: 'blob' })
    saveAs(content, `qr_batch_${results.batchId.slice(0, 8)}.zip`)
  }

  const downloadSingle = (item) => {
    const byteString = atob(item.dataUrl.split(',')[1])
    const mimeString = item.dataUrl.split(',')[0].split(':')[1].split(';')[0]
    const ab = new ArrayBuffer(byteString.length)
    const ia = new Uint8Array(ab)
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i)
    }
    const blob = new Blob([ab], { type: mimeString })
    saveAs(blob, `${item.name || 'qrcode'}.png`)
  }

  const resetUpload = () => {
    setFile(null)
    setResults(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">대량 QR코드 생성</h1>
        <p className="text-slate-600">엑셀 또는 CSV 파일로 수백 개의 QR코드를 한 번에 생성하세요</p>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* 타입 선택 */}
        <div className="card">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">1. QR코드 유형 선택</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {batchTypes.map((type) => {
              const Icon = type.icon
              const isSelected = selectedType === type.id
              return (
                <button
                  key={type.id}
                  onClick={() => {
                    setSelectedType(type.id)
                    setResults(null)
                  }}
                  className={`qr-type-card ${isSelected ? 'active' : ''}`}
                >
                  <Icon className={`w-8 h-8 mb-2 ${isSelected ? 'text-primary-600' : 'text-slate-400'}`} />
                  <h3 className={`font-medium ${isSelected ? 'text-primary-600' : 'text-slate-700'}`}>
                    {type.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">{type.description}</p>
                </button>
              )
            })}
          </div>

          {/* 선택된 타입의 필드 정보 */}
          {selectedType && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 mb-1">
                    {batchTypes.find(t => t.id === selectedType)?.name} 템플릿 필드 안내
                  </p>
                  <p className="text-blue-700">
                    <span className="font-medium">필수:</span> {batchTypes.find(t => t.id === selectedType)?.required}
                  </p>
                  <p className="text-blue-600">
                    <span className="font-medium">선택:</span> {batchTypes.find(t => t.id === selectedType)?.optional} (빈칸 가능)
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 파일 업로드 */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">2. 파일 업로드</h2>
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
            >
              <FileDown className="w-4 h-4" />
              샘플 템플릿 다운로드
            </button>
          </div>

          {!results && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                file
                  ? 'border-primary-300 bg-primary-50'
                  : 'border-slate-200 hover:border-primary-300 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />

              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileSpreadsheet className="w-10 h-10 text-primary-500" />
                  <div className="text-left">
                    <p className="font-medium text-slate-900">{file.name}</p>
                    <p className="text-sm text-slate-500">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      resetUpload()
                    }}
                    className="p-1 hover:bg-slate-200 rounded-full"
                  >
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600 mb-1">
                    파일을 드래그하거나 클릭하여 업로드
                  </p>
                  <p className="text-sm text-slate-400">
                    Excel (.xlsx, .xls) 또는 CSV 파일
                  </p>
                </>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 mt-4 p-3 bg-red-50 text-red-600 rounded-lg">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {!results && (
            <button
              onClick={generateBatch}
              disabled={!file || loading}
              className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  생성 중...
                </>
              ) : (
                <>
                  <Package className="w-5 h-5" />
                  대량 QR코드 생성
                </>
              )}
            </button>
          )}
        </div>

        {/* 결과 */}
        {results && (
          <div className="card animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">생성 완료</h2>
                <p className="text-sm text-slate-500">
                  총 {results.totalCount}개의 QR코드가 생성되었습니다
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={downloadAll}
                  className="btn-primary flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  전체 다운로드 (ZIP)
                </button>
                <button
                  onClick={resetUpload}
                  className="btn-secondary"
                >
                  새로 만들기
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {results.items.map((item, index) => (
                <div
                  key={item.id}
                  className="bg-slate-50 rounded-xl p-3 text-center group"
                >
                  <img
                    src={item.dataUrl}
                    alt={item.name}
                    className="w-full aspect-square object-contain bg-white rounded-lg mb-2"
                  />
                  <p className="text-sm font-medium text-slate-700 truncate mb-2">
                    {item.name || `QR ${index + 1}`}
                  </p>
                  <button
                    onClick={() => downloadSingle(item)}
                    className="text-xs text-primary-600 hover:text-primary-700 flex items-center justify-center gap-1 w-full"
                  >
                    <Download className="w-3 h-3" />
                    다운로드
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 mt-6 p-3 bg-green-50 text-green-600 rounded-lg">
              <Check className="w-5 h-5" />
              <span className="text-sm">모든 QR코드가 DB에 자동 저장되었습니다</span>
            </div>
          </div>
        )}

        {/* 사용 가이드 */}
        <div className="card bg-gradient-to-br from-slate-50 to-slate-100">
          <h3 className="font-semibold text-slate-900 mb-4">사용 가이드</h3>
          <div className="space-y-3 text-sm text-slate-600">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-medium">1</span>
              <p>위에서 생성할 QR코드 유형을 선택합니다.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-medium">2</span>
              <p>"샘플 템플릿 다운로드"를 클릭하여 양식을 받습니다.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-medium">3</span>
              <p><strong>필수 정보만 입력하면 됩니다.</strong> 나머지 항목은 빈칸으로 두어도 됩니다.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-medium">4</span>
              <p>"대량 QR코드 생성" 버튼을 클릭하면 자동으로 생성됩니다.</p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200">
            <p className="text-xs text-slate-500">
              <strong>팁:</strong> 한글 필드명(이름, 전화번호, 이메일 등)과 영문 필드명(name, phone, email 등) 모두 지원합니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
