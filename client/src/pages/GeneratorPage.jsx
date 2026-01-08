import { useState } from 'react'
import axios from 'axios'
import { saveAs } from 'file-saver'
import {
  QrCode, User, Wifi, Link as LinkIcon, Mail, Phone,
  MessageSquare, MapPin, Calendar, FileText, Download,
  Check, Loader2, Settings, RefreshCw
} from 'lucide-react'

const qrTypes = [
  { id: 'vcard', name: '연락처', icon: User, description: '핸드폰 연락처 자동 저장' },
  { id: 'wifi', name: 'WiFi', icon: Wifi, description: '비밀번호 없이 WiFi 연결' },
  { id: 'url', name: 'URL', icon: LinkIcon, description: '웹사이트 링크' },
  { id: 'email', name: '이메일', icon: Mail, description: '이메일 작성 화면 열기' },
  { id: 'phone', name: '전화', icon: Phone, description: '바로 전화 걸기' },
  { id: 'sms', name: 'SMS', icon: MessageSquare, description: '문자 메시지 보내기' },
  { id: 'geo', name: '위치', icon: MapPin, description: '지도에서 위치 확인' },
  { id: 'event', name: '이벤트', icon: Calendar, description: '캘린더에 일정 추가' },
  { id: 'text', name: '텍스트', icon: FileText, description: '일반 텍스트' },
]

const initialFormData = {
  // vCard
  firstName: '', lastName: '', phone: '', workPhone: '', email: '',
  organization: '', title: '', address: '', website: '', note: '',
  // WiFi
  ssid: '', password: '', encryption: 'WPA', hidden: false,
  // URL
  url: '',
  // Email
  emailTo: '', subject: '', body: '',
  // Phone/SMS
  phoneNumber: '', message: '',
  // Geo
  latitude: '', longitude: '',
  // Event
  eventTitle: '', startDate: '', endDate: '', location: '', description: '',
  // Text
  text: '',
}

export default function GeneratorPage() {
  const [selectedType, setSelectedType] = useState('vcard')
  const [formData, setFormData] = useState(initialFormData)
  const [qrOptions, setQrOptions] = useState({
    size: 300,
    darkColor: '#000000',
    lightColor: '#FFFFFF',
    errorCorrectionLevel: 'M',
    margin: 2
  })
  const [generatedQR, setGeneratedQR] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showOptions, setShowOptions] = useState(false)

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleOptionChange = (e) => {
    const { name, value } = e.target
    setQrOptions(prev => ({
      ...prev,
      [name]: name === 'size' || name === 'margin' ? parseInt(value) : value
    }))
  }

  const prepareData = () => {
    switch (selectedType) {
      case 'vcard':
        return {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          workPhone: formData.workPhone,
          email: formData.email,
          organization: formData.organization,
          title: formData.title,
          address: formData.address,
          website: formData.website,
          note: formData.note
        }
      case 'wifi':
        return {
          ssid: formData.ssid,
          password: formData.password,
          encryption: formData.encryption,
          hidden: formData.hidden
        }
      case 'url':
        return { url: formData.url }
      case 'email':
        return {
          email: formData.emailTo,
          subject: formData.subject,
          body: formData.body
        }
      case 'phone':
        return { phone: formData.phoneNumber }
      case 'sms':
        return {
          phone: formData.phoneNumber,
          message: formData.message
        }
      case 'geo':
        return {
          latitude: formData.latitude,
          longitude: formData.longitude
        }
      case 'event':
        return {
          title: formData.eventTitle,
          startDate: formData.startDate,
          endDate: formData.endDate,
          location: formData.location,
          description: formData.description
        }
      case 'text':
        return { text: formData.text }
      default:
        return {}
    }
  }

  const generateQR = async () => {
    setLoading(true)
    try {
      const response = await axios.post('/api/qr/generate', {
        type: selectedType,
        data: prepareData(),
        name: formData.firstName || formData.ssid || formData.url || formData.eventTitle || 'QR Code',
        options: qrOptions
      })
      setGeneratedQR(response.data)
    } catch (error) {
      console.error('QR 생성 오류:', error)
      alert('QR 코드 생성 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const downloadQR = () => {
    if (!generatedQR) return

    // Base64 데이터 URL을 Blob으로 변환
    const byteString = atob(generatedQR.dataUrl.split(',')[1])
    const mimeString = generatedQR.dataUrl.split(',')[0].split(':')[1].split(';')[0]
    const ab = new ArrayBuffer(byteString.length)
    const ia = new Uint8Array(ab)
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i)
    }
    const blob = new Blob([ab], { type: mimeString })

    saveAs(blob, `${generatedQR.name || 'qrcode'}.png`)
  }

  const resetForm = () => {
    setFormData(initialFormData)
    setGeneratedQR(null)
  }

  const renderForm = () => {
    switch (selectedType) {
      case 'vcard':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">성</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="홍"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">이름</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="길동"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">휴대폰</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="010-1234-5678"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">직장 전화</label>
                <input
                  type="tel"
                  name="workPhone"
                  value={formData.workPhone}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="02-123-4567"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">이메일</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="input-field"
                placeholder="example@email.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">회사/조직</label>
                <input
                  type="text"
                  name="organization"
                  value={formData.organization}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="회사명"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">직책</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="대리"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">주소</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="input-field"
                placeholder="서울시 강남구..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">웹사이트</label>
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleInputChange}
                className="input-field"
                placeholder="https://example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">메모</label>
              <textarea
                name="note"
                value={formData.note}
                onChange={handleInputChange}
                className="input-field resize-none"
                rows={2}
                placeholder="추가 메모..."
              />
            </div>
          </div>
        )

      case 'wifi':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">네트워크 이름 (SSID)</label>
              <input
                type="text"
                name="ssid"
                value={formData.ssid}
                onChange={handleInputChange}
                className="input-field"
                placeholder="MyWiFi"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">비밀번호</label>
              <input
                type="text"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="input-field"
                placeholder="WiFi 비밀번호"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">암호화 방식</label>
              <select
                name="encryption"
                value={formData.encryption}
                onChange={handleInputChange}
                className="input-field"
              >
                <option value="WPA">WPA/WPA2</option>
                <option value="WEP">WEP</option>
                <option value="nopass">암호 없음</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                name="hidden"
                id="hidden"
                checked={formData.hidden}
                onChange={handleInputChange}
                className="w-4 h-4 text-primary-500 rounded focus:ring-primary-500"
              />
              <label htmlFor="hidden" className="text-sm text-slate-700">숨겨진 네트워크</label>
            </div>
          </div>
        )

      case 'url':
        return (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">URL 주소</label>
            <input
              type="url"
              name="url"
              value={formData.url}
              onChange={handleInputChange}
              className="input-field"
              placeholder="https://example.com"
            />
          </div>
        )

      case 'email':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">받는 사람 이메일</label>
              <input
                type="email"
                name="emailTo"
                value={formData.emailTo}
                onChange={handleInputChange}
                className="input-field"
                placeholder="recipient@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">제목</label>
              <input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleInputChange}
                className="input-field"
                placeholder="이메일 제목"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">본문</label>
              <textarea
                name="body"
                value={formData.body}
                onChange={handleInputChange}
                className="input-field resize-none"
                rows={3}
                placeholder="이메일 내용..."
              />
            </div>
          </div>
        )

      case 'phone':
        return (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">전화번호</label>
            <input
              type="tel"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleInputChange}
              className="input-field"
              placeholder="010-1234-5678"
            />
          </div>
        )

      case 'sms':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">전화번호</label>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                className="input-field"
                placeholder="010-1234-5678"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">메시지</label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleInputChange}
                className="input-field resize-none"
                rows={3}
                placeholder="보낼 메시지 내용..."
              />
            </div>
          </div>
        )

      case 'geo':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">위도</label>
              <input
                type="text"
                name="latitude"
                value={formData.latitude}
                onChange={handleInputChange}
                className="input-field"
                placeholder="37.5665"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">경도</label>
              <input
                type="text"
                name="longitude"
                value={formData.longitude}
                onChange={handleInputChange}
                className="input-field"
                placeholder="126.9780"
              />
            </div>
          </div>
        )

      case 'event':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">이벤트 제목</label>
              <input
                type="text"
                name="eventTitle"
                value={formData.eventTitle}
                onChange={handleInputChange}
                className="input-field"
                placeholder="회의"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">시작 일시</label>
                <input
                  type="datetime-local"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">종료 일시</label>
                <input
                  type="datetime-local"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  className="input-field"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">장소</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                className="input-field"
                placeholder="회의실 A"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">설명</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="input-field resize-none"
                rows={2}
                placeholder="이벤트 설명..."
              />
            </div>
          </div>
        )

      case 'text':
        return (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">텍스트</label>
            <textarea
              name="text"
              value={formData.text}
              onChange={handleInputChange}
              className="input-field resize-none"
              rows={5}
              placeholder="QR코드에 담을 텍스트를 입력하세요..."
            />
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">QR코드 생성</h1>
        <p className="text-slate-600">원하는 유형을 선택하고 정보를 입력하세요</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* 좌측: 타입 선택 & 폼 */}
        <div className="lg:col-span-2 space-y-6">
          {/* QR 타입 선택 */}
          <div className="card">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">QR코드 유형 선택</h2>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {qrTypes.map((type) => {
                const Icon = type.icon
                const isSelected = selectedType === type.id
                return (
                  <button
                    key={type.id}
                    onClick={() => {
                      setSelectedType(type.id)
                      setGeneratedQR(null)
                    }}
                    className={`qr-type-card text-center ${isSelected ? 'active' : ''}`}
                  >
                    <Icon className={`w-6 h-6 mx-auto mb-2 ${isSelected ? 'text-primary-600' : 'text-slate-400'}`} />
                    <span className={`text-sm font-medium ${isSelected ? 'text-primary-600' : 'text-slate-600'}`}>
                      {type.name}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 정보 입력 폼 */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">
                {qrTypes.find(t => t.id === selectedType)?.description}
              </h2>
              <button
                onClick={() => setShowOptions(!showOptions)}
                className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
              >
                <Settings className="w-4 h-4" />
                옵션
              </button>
            </div>

            {/* 고급 옵션 */}
            {showOptions && (
              <div className="mb-6 p-4 bg-slate-50 rounded-xl space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">크기 (px)</label>
                    <input
                      type="number"
                      name="size"
                      value={qrOptions.size}
                      onChange={handleOptionChange}
                      className="input-field text-sm py-2"
                      min="100"
                      max="1000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">여백</label>
                    <input
                      type="number"
                      name="margin"
                      value={qrOptions.margin}
                      onChange={handleOptionChange}
                      className="input-field text-sm py-2"
                      min="0"
                      max="10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">QR 색상</label>
                    <input
                      type="color"
                      name="darkColor"
                      value={qrOptions.darkColor}
                      onChange={handleOptionChange}
                      className="w-full h-10 rounded-lg cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">배경색</label>
                    <input
                      type="color"
                      name="lightColor"
                      value={qrOptions.lightColor}
                      onChange={handleOptionChange}
                      className="w-full h-10 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">오류 정정 수준</label>
                  <select
                    name="errorCorrectionLevel"
                    value={qrOptions.errorCorrectionLevel}
                    onChange={handleOptionChange}
                    className="input-field text-sm py-2"
                  >
                    <option value="L">낮음 (L) - 7%</option>
                    <option value="M">중간 (M) - 15%</option>
                    <option value="Q">높음 (Q) - 25%</option>
                    <option value="H">최고 (H) - 30%</option>
                  </select>
                </div>
              </div>
            )}

            {renderForm()}

            <div className="flex gap-3 mt-6">
              <button
                onClick={generateQR}
                disabled={loading}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <QrCode className="w-5 h-5" />
                )}
                {loading ? '생성 중...' : 'QR코드 생성'}
              </button>
              <button
                onClick={resetForm}
                className="btn-secondary flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                초기화
              </button>
            </div>
          </div>
        </div>

        {/* 우측: QR 코드 미리보기 */}
        <div className="lg:col-span-1">
          <div className="card sticky top-24">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">미리보기</h2>

            <div className="qr-preview flex items-center justify-center min-h-[300px]">
              {generatedQR ? (
                <div className="text-center animate-fade-in">
                  <img
                    src={generatedQR.dataUrl}
                    alt="Generated QR Code"
                    className="mx-auto rounded-lg shadow-lg"
                    style={{ maxWidth: '100%', height: 'auto' }}
                  />
                </div>
              ) : (
                <div className="text-center text-slate-400">
                  <QrCode className="w-16 h-16 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">QR코드가 여기에 표시됩니다</p>
                </div>
              )}
            </div>

            {generatedQR && (
              <div className="mt-4 space-y-3">
                <button
                  onClick={downloadQR}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  PNG로 다운로드
                </button>

                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-lg">
                  <Check className="w-4 h-4" />
                  DB에 자동 저장되었습니다
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
