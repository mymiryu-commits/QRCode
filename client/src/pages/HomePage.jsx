import { Link } from 'react-router-dom'
import {
  QrCode, User, Wifi, Link as LinkIcon, Mail, Phone,
  MessageSquare, MapPin, Calendar, Upload, ArrowRight,
  Sparkles, Shield, Zap, Building2, UtensilsCrossed,
  Home, CreditCard, Users, BarChart3, Award, CheckCircle2,
  Star, TrendingUp, Globe, Palette
} from 'lucide-react'

// 니치 타겟 산업별 활용 사례
const useCases = [
  {
    icon: UtensilsCrossed,
    industry: '요식업',
    title: '스마트 메뉴판',
    description: '테이블마다 QR코드를 배치하여 고객이 스마트폰으로 메뉴를 확인하고 주문할 수 있습니다.',
    benefits: ['인쇄비 절감', '메뉴 실시간 업데이트', '위생적인 비대면 주문'],
    image: 'restaurant',
    color: 'from-orange-500 to-red-500',
    bgColor: 'bg-orange-50'
  },
  {
    icon: Home,
    industry: '부동산',
    title: '매물 정보 QR',
    description: '현수막, 명함에 QR코드를 넣어 매물 상세 정보와 연락처를 즉시 전달합니다.',
    benefits: ['24시간 매물 노출', '고객 문의 증가', '전문적인 이미지'],
    image: 'realestate',
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-50'
  },
  {
    icon: Building2,
    industry: '기업/사무실',
    title: '디지털 명함',
    description: '종이 명함 대신 QR코드로 연락처를 전달하여 환경도 보호하고 전문성도 높입니다.',
    benefits: ['원터치 연락처 저장', '친환경 이미지', '정보 업데이트 용이'],
    image: 'business',
    color: 'from-slate-600 to-slate-800',
    bgColor: 'bg-slate-50'
  },
  {
    icon: Calendar,
    industry: '이벤트/행사',
    title: '행사 안내 QR',
    description: '초대장, 포스터에 QR코드를 넣어 행사 정보와 참가 신청을 간편하게 처리합니다.',
    benefits: ['참가자 관리 용이', '실시간 정보 전달', '데이터 수집'],
    image: 'event',
    color: 'from-purple-500 to-pink-500',
    bgColor: 'bg-purple-50'
  },
]

// 프리미엄 기능
const premiumFeatures = [
  {
    icon: Palette,
    title: '브랜드 커스터마이징',
    description: '로고 삽입, 색상 변경으로 브랜드 아이덴티티를 유지한 QR코드'
  },
  {
    icon: BarChart3,
    title: '스캔 분석 리포트',
    description: '언제, 어디서, 몇 명이 스캔했는지 실시간 데이터 확인'
  },
  {
    icon: TrendingUp,
    title: '동적 QR코드',
    description: '인쇄 후에도 연결 URL 변경 가능, 캠페인별 관리'
  },
  {
    icon: Globe,
    title: 'API 연동',
    description: '자체 시스템과 연동하여 자동화된 QR코드 생성'
  },
]

// 신뢰 지표
const trustBadges = [
  { number: '50,000+', label: 'QR코드 생성' },
  { number: '1,200+', label: '기업 고객' },
  { number: '99.9%', label: '서비스 가동률' },
  { number: '4.9/5', label: '고객 만족도' },
]

// 고객 후기
const testimonials = [
  {
    name: '김사장',
    role: '강남 레스토랑 대표',
    content: '메뉴판 QR코드 도입 후 인쇄비가 월 50만원 이상 절감됐어요. 메뉴 변경도 실시간으로 가능해서 너무 편합니다.',
    rating: 5
  },
  {
    name: '이과장',
    role: '○○부동산 팀장',
    content: '현수막에 QR코드를 넣으니 밤에도 고객이 매물 정보를 확인하고 연락이 와요. 문의가 30% 이상 늘었습니다.',
    rating: 5
  },
  {
    name: '박대리',
    role: 'IT 스타트업',
    content: '대량 생성 기능으로 직원 200명 명함 QR코드를 10분 만에 만들었어요. API 연동도 깔끔합니다.',
    rating: 5
  },
]

export default function HomePage() {
  return (
    <div className="space-y-20 animate-fade-in">
      {/* 히어로 섹션 - 프리미엄 */}
      <section className="text-center py-16 relative overflow-hidden">
        {/* 배경 장식 */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary-200 rounded-full blur-3xl opacity-30"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-200 rounded-full blur-3xl opacity-30"></div>
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500/10 to-purple-500/10 border border-primary-200 text-primary-700 rounded-full text-sm font-medium mb-6">
          <Award className="w-4 h-4" />
          기업을 위한 프리미엄 QR코드 솔루션
        </div>

        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-tight">
          비즈니스를 연결하는
          <span className="block bg-gradient-to-r from-primary-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            스마트 QR코드
          </span>
        </h1>

        <p className="text-lg md:text-xl text-slate-600 max-w-3xl mx-auto mb-10">
          식당 메뉴, 부동산 매물, 디지털 명함, 이벤트 안내까지
          <br className="hidden sm:block" />
          <strong className="text-slate-800">업종별 맞춤 QR코드</strong>로 고객 접점을 혁신하세요.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <Link to="/generate" className="group relative px-8 py-4 bg-gradient-to-r from-primary-500 to-purple-500 text-white rounded-xl font-semibold shadow-xl shadow-primary-500/25 hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            무료로 시작하기
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link to="/pricing" className="px-8 py-4 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-semibold hover:border-primary-300 hover:text-primary-600 transition-all duration-200 flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            요금제 보기
          </Link>
        </div>

        {/* 신뢰 지표 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          {trustBadges.map((badge) => (
            <div key={badge.label} className="text-center">
              <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                {badge.number}
              </div>
              <div className="text-sm text-slate-500 mt-1">{badge.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 업종별 활용 사례 - 니치 타겟팅 */}
      <section>
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm font-medium mb-4">
            <Building2 className="w-4 h-4" />
            업종별 맞춤 솔루션
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            우리 업종에 딱 맞는 QR코드
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            각 산업의 특성을 고려한 맞춤형 QR코드 솔루션으로 비즈니스 효율을 높이세요
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {useCases.map((useCase) => {
            const Icon = useCase.icon
            return (
              <div
                key={useCase.industry}
                className="group relative bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 hover:shadow-2xl transition-all duration-300 overflow-hidden"
              >
                {/* 배경 그라데이션 */}
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${useCase.color} opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition-opacity`}></div>

                <div className="relative">
                  <div className="flex items-start gap-4 mb-6">
                    <div className={`w-16 h-16 ${useCase.bgColor} rounded-2xl flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-8 h-8 bg-gradient-to-r ${useCase.color} bg-clip-text`} style={{ color: useCase.color.includes('orange') ? '#f97316' : useCase.color.includes('blue') ? '#3b82f6' : useCase.color.includes('slate') ? '#475569' : '#a855f7' }} />
                    </div>
                    <div>
                      <span className={`inline-block px-3 py-1 bg-gradient-to-r ${useCase.color} text-white text-xs font-semibold rounded-full mb-2`}>
                        {useCase.industry}
                      </span>
                      <h3 className="text-xl font-bold text-slate-900">{useCase.title}</h3>
                    </div>
                  </div>

                  <p className="text-slate-600 mb-6">{useCase.description}</p>

                  <div className="space-y-2">
                    {useCase.benefits.map((benefit) => (
                      <div key={benefit} className="flex items-center gap-2 text-sm text-slate-700">
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                        {benefit}
                      </div>
                    ))}
                  </div>

                  <Link
                    to="/generate"
                    className={`inline-flex items-center gap-2 mt-6 px-5 py-2.5 bg-gradient-to-r ${useCase.color} text-white rounded-xl font-medium text-sm hover:shadow-lg transition-all duration-200`}
                  >
                    {useCase.industry} QR 만들기
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* 프리미엄 기능 */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 md:p-12 text-white">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 text-white/80 rounded-full text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            프리미엄 기능
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            단순한 QR코드 그 이상
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            마케팅 효과를 극대화하는 고급 기능을 경험하세요
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {premiumFeatures.map((feature) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-purple-400 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-400">{feature.description}</p>
              </div>
            )
          })}
        </div>

        <div className="text-center mt-10">
          <Link
            to="/pricing"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-slate-900 rounded-xl font-semibold hover:bg-slate-100 transition-colors"
          >
            프리미엄 시작하기
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* 고객 후기 */}
      <section>
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-50 text-yellow-700 rounded-full text-sm font-medium mb-4">
            <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
            고객 후기
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            이미 많은 기업이 사용 중입니다
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-6 shadow-lg shadow-slate-200/50 border border-slate-100"
            >
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-slate-600 mb-6 leading-relaxed">"{testimonial.content}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-purple-400 rounded-full flex items-center justify-center text-white font-semibold">
                  {testimonial.name[0]}
                </div>
                <div>
                  <div className="font-semibold text-slate-900">{testimonial.name}</div>
                  <div className="text-sm text-slate-500">{testimonial.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* QR 타입 그리드 - 간소화 */}
      <section className="bg-slate-50 rounded-3xl p-8 md:p-12">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">
            지원하는 QR코드 유형
          </h2>
          <p className="text-slate-600">
            URL, 연락처, WiFi, 이메일, SMS, 전화, 위치, 일정 등 8가지 유형 지원
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-4">
          {[
            { icon: LinkIcon, name: 'URL', color: '#a855f7' },
            { icon: User, name: '연락처', color: '#3b82f6' },
            { icon: Wifi, name: 'WiFi', color: '#22c55e' },
            { icon: Mail, name: '이메일', color: '#f97316' },
            { icon: MessageSquare, name: 'SMS', color: '#06b6d4' },
            { icon: Phone, name: '전화', color: '#ef4444' },
            { icon: MapPin, name: '위치', color: '#ec4899' },
            { icon: Calendar, name: '일정', color: '#6366f1' },
          ].map((type) => {
            const Icon = type.icon
            return (
              <div
                key={type.name}
                className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-slate-200"
              >
                <Icon className="w-4 h-4" style={{ color: type.color }} />
                <span className="text-sm font-medium text-slate-700">{type.name}</span>
              </div>
            )
          })}
        </div>

        <div className="text-center mt-8">
          <Link
            to="/generate"
            className="inline-flex items-center gap-2 text-primary-600 font-medium hover:text-primary-700"
          >
            모든 유형 살펴보기
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* CTA 섹션 */}
      <section className="relative text-center py-16 bg-gradient-to-r from-primary-500 via-purple-500 to-pink-500 rounded-3xl text-white overflow-hidden">
        {/* 배경 패턴 */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-20 h-20 border-4 border-white rounded-lg rotate-12"></div>
          <div className="absolute top-20 right-20 w-16 h-16 border-4 border-white rounded-lg -rotate-12"></div>
          <div className="absolute bottom-10 left-1/4 w-12 h-12 border-4 border-white rounded-lg rotate-45"></div>
          <div className="absolute bottom-20 right-1/3 w-24 h-24 border-4 border-white rounded-lg -rotate-6"></div>
        </div>

        <div className="relative">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            지금 바로 시작하세요
          </h2>
          <p className="text-white/80 mb-8 max-w-xl mx-auto text-lg">
            무료 플랜으로 시작하고, 비즈니스가 성장하면 업그레이드하세요.
            <br />
            신용카드 없이 바로 시작할 수 있습니다.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/generate"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-primary-600 rounded-xl font-semibold shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-200"
            >
              <QrCode className="w-5 h-5" />
              무료로 QR코드 만들기
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/batch"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white/20 backdrop-blur-sm text-white border border-white/30 rounded-xl font-semibold hover:bg-white/30 transition-all duration-200"
            >
              <Upload className="w-5 h-5" />
              대량 생성하기
            </Link>
          </div>
        </div>
      </section>

      {/* 고객센터 안내 */}
      <section className="text-center py-8">
        <p className="text-slate-500">
          도입 상담이 필요하신가요?{' '}
          <a href="tel:1588-5617" className="text-primary-600 font-medium hover:text-primary-700">
            1588-5617
          </a>
          {' '}또는{' '}
          <a href="mailto:mymiryu@gmail.com" className="text-primary-600 font-medium hover:text-primary-700">
            mymiryu@gmail.com
          </a>
          으로 연락주세요.
        </p>
      </section>
    </div>
  )
}
