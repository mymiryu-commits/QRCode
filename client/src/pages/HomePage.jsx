import { Link } from 'react-router-dom'
import {
  QrCode, User, Wifi, Link as LinkIcon, Mail, Phone,
  MessageSquare, MapPin, Calendar, Upload, ArrowRight,
  Sparkles, Shield, Zap
} from 'lucide-react'

const qrTypes = [
  {
    icon: User,
    name: '연락처 (vCard)',
    description: '스캔하면 연락처가 자동 저장됩니다',
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50'
  },
  {
    icon: Wifi,
    name: 'WiFi 연결',
    description: '비밀번호 입력 없이 WiFi 연결',
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-50'
  },
  {
    icon: LinkIcon,
    name: 'URL 링크',
    description: '웹사이트 주소를 QR코드로',
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-50'
  },
  {
    icon: Mail,
    name: '이메일',
    description: '이메일 작성 화면이 바로 열립니다',
    color: 'from-orange-500 to-orange-600',
    bgColor: 'bg-orange-50'
  },
  {
    icon: Phone,
    name: '전화',
    description: '스캔하면 바로 전화 연결',
    color: 'from-red-500 to-red-600',
    bgColor: 'bg-red-50'
  },
  {
    icon: MessageSquare,
    name: 'SMS 문자',
    description: '미리 작성된 문자 메시지 전송',
    color: 'from-cyan-500 to-cyan-600',
    bgColor: 'bg-cyan-50'
  },
  {
    icon: MapPin,
    name: '위치',
    description: '지도에서 위치 확인',
    color: 'from-pink-500 to-pink-600',
    bgColor: 'bg-pink-50'
  },
  {
    icon: Calendar,
    name: '이벤트',
    description: '캘린더에 일정 추가',
    color: 'from-indigo-500 to-indigo-600',
    bgColor: 'bg-indigo-50'
  },
]

const features = [
  {
    icon: Sparkles,
    title: '다양한 QR 유형',
    description: '연락처, WiFi, URL, 이메일 등 생활에 필요한 모든 QR코드 유형을 지원합니다.'
  },
  {
    icon: Upload,
    title: '대량 생성',
    description: '엑셀/CSV 파일을 업로드하여 수백 개의 QR코드를 한 번에 생성하세요.'
  },
  {
    icon: Shield,
    title: 'DB 저장',
    description: '생성한 QR코드가 자동으로 저장되어 언제든 다시 다운로드할 수 있습니다.'
  },
  {
    icon: Zap,
    title: '빠르고 간편',
    description: '복잡한 설정 없이 몇 번의 클릭만으로 QR코드를 생성합니다.'
  },
]

export default function HomePage() {
  return (
    <div className="space-y-16 animate-fade-in">
      {/* 히어로 섹션 */}
      <section className="text-center py-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-600 rounded-full text-sm font-medium mb-6">
          <Sparkles className="w-4 h-4" />
          다기능 QR코드 생성기
        </div>

        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-6">
          QR코드를 더 쉽고
          <span className="block bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent">
            스마트하게
          </span>
        </h1>

        <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-8">
          연락처, WiFi 비밀번호, URL 등 다양한 정보를 QR코드로 만들어보세요.
          <br className="hidden sm:block" />
          엑셀 파일로 대량 생성도 가능합니다.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/generate" className="btn-primary flex items-center gap-2 text-lg">
            <QrCode className="w-5 h-5" />
            QR코드 만들기
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link to="/batch" className="btn-secondary flex items-center gap-2">
            <Upload className="w-5 h-5" />
            대량 생성하기
          </Link>
        </div>
      </section>

      {/* QR 타입 그리드 */}
      <section>
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">
            지원하는 QR코드 유형
          </h2>
          <p className="text-slate-600">
            다양한 상황에서 활용할 수 있는 QR코드를 제공합니다
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {qrTypes.map((type) => {
            const Icon = type.icon
            return (
              <Link
                key={type.name}
                to="/generate"
                className="group card hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`w-12 h-12 ${type.bgColor} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-6 h-6 bg-gradient-to-r ${type.color} bg-clip-text`} style={{ color: type.color.includes('blue') ? '#3b82f6' : type.color.includes('green') ? '#22c55e' : type.color.includes('purple') ? '#a855f7' : type.color.includes('orange') ? '#f97316' : type.color.includes('red') ? '#ef4444' : type.color.includes('cyan') ? '#06b6d4' : type.color.includes('pink') ? '#ec4899' : '#6366f1' }} />
                </div>
                <h3 className="font-semibold text-slate-900 mb-1">{type.name}</h3>
                <p className="text-sm text-slate-500">{type.description}</p>
              </Link>
            )
          })}
        </div>
      </section>

      {/* 특징 섹션 */}
      <section className="bg-white rounded-3xl p-8 md:p-12 shadow-xl shadow-slate-200/50">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">
            왜 PlanX QR인가요?
          </h2>
          <p className="text-slate-600">
            누구나 쉽게 사용할 수 있는 강력한 기능
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <div key={feature.title} className="text-center">
                <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/25">
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-500">{feature.description}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* CTA 섹션 */}
      <section className="text-center py-12 bg-gradient-to-r from-primary-500 to-primary-600 rounded-3xl text-white">
        <h2 className="text-2xl md:text-3xl font-bold mb-4">
          지금 바로 시작하세요
        </h2>
        <p className="text-primary-100 mb-8 max-w-xl mx-auto">
          복잡한 가입 절차 없이 바로 QR코드를 생성할 수 있습니다.
          생성된 QR코드는 자동으로 저장됩니다.
        </p>
        <Link
          to="/generate"
          className="inline-flex items-center gap-2 px-8 py-4 bg-white text-primary-600 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
        >
          <QrCode className="w-5 h-5" />
          무료로 QR코드 만들기
          <ArrowRight className="w-5 h-5" />
        </Link>
      </section>
    </div>
  )
}
