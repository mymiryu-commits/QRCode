import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import {
  QrCode, User, Wifi, Link as LinkIcon, Mail, Phone,
  MessageSquare, MapPin, Calendar, Upload, ArrowRight,
  Sparkles, Shield, Zap, Building2, UtensilsCrossed,
  Home, CreditCard, Users, BarChart3, Award, CheckCircle2,
  Star, TrendingUp, Globe, Palette, Play, Car, Store, CreditCard as CardIcon,
  Table2, Package, ShoppingBag
} from 'lucide-react'

// 니치 타겟 산업별 활용 사례 (이미지 포함)
const useCases = [
  {
    icon: UtensilsCrossed,
    industry: '요식업',
    title: '스마트 메뉴판',
    description: '테이블마다 QR코드를 배치하여 고객이 스마트폰으로 메뉴를 확인하고 주문할 수 있습니다.',
    benefits: ['인쇄비 절감', '메뉴 실시간 업데이트', '위생적인 비대면 주문'],
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop',
    color: 'from-orange-500 to-red-500',
    bgColor: 'bg-orange-50'
  },
  {
    icon: Home,
    industry: '부동산',
    title: '매물 정보 QR',
    description: '현수막, 명함에 QR코드를 넣어 매물 상세 정보와 연락처를 즉시 전달합니다.',
    benefits: ['24시간 매물 노출', '고객 문의 증가', '전문적인 이미지'],
    image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&h=400&fit=crop',
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-50'
  },
  {
    icon: Building2,
    industry: '기업/사무실',
    title: '디지털 명함',
    description: '종이 명함 대신 QR코드로 연락처를 전달하여 환경도 보호하고 전문성도 높입니다.',
    benefits: ['원터치 연락처 저장', '친환경 이미지', '정보 업데이트 용이'],
    image: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=600&h=400&fit=crop',
    color: 'from-slate-600 to-slate-800',
    bgColor: 'bg-slate-50'
  },
  {
    icon: Calendar,
    industry: '이벤트/행사',
    title: '행사 안내 QR',
    description: '초대장, 포스터에 QR코드를 넣어 행사 정보와 참가 신청을 간편하게 처리합니다.',
    benefits: ['참가자 관리 용이', '실시간 정보 전달', '데이터 수집'],
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop',
    color: 'from-purple-500 to-pink-500',
    bgColor: 'bg-purple-50'
  },
]

// 프리미엄 기능
const premiumFeatures = [
  {
    icon: Palette,
    title: '브랜드 커스터마이징',
    description: '로고 삽입, 색상 변경으로 브랜드 아이덴티티를 유지한 QR코드',
    image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=300&fit=crop'
  },
  {
    icon: BarChart3,
    title: '스캔 분석 리포트',
    description: '언제, 어디서, 몇 명이 스캔했는지 실시간 데이터 확인',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop'
  },
  {
    icon: TrendingUp,
    title: '동적 QR코드',
    description: '인쇄 후에도 연결 URL 변경 가능, 캠페인별 관리',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop'
  },
  {
    icon: Globe,
    title: 'API 연동',
    description: '자체 시스템과 연동하여 자동화된 QR코드 생성',
    image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&h=300&fit=crop'
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
    rating: 5,
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face'
  },
  {
    name: '이과장',
    role: '○○부동산 팀장',
    content: '현수막에 QR코드를 넣으니 밤에도 고객이 매물 정보를 확인하고 연락이 와요. 문의가 30% 이상 늘었습니다.',
    rating: 5,
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face'
  },
  {
    name: '박대리',
    role: 'IT 스타트업',
    content: '대량 생성 기능으로 직원 200명 명함 QR코드를 10분 만에 만들었어요. API 연동도 깔끔합니다.',
    rating: 5,
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face'
  },
]

// 로고 클라이언트 (가상)
const clientLogos = [
  { name: '삼성', initial: 'S' },
  { name: 'LG', initial: 'LG' },
  { name: '현대', initial: 'H' },
  { name: 'SK', initial: 'SK' },
  { name: '롯데', initial: 'L' },
  { name: 'CJ', initial: 'CJ' },
]

// QR 굿즈 상품
const qrGoods = [
  {
    icon: Car,
    name: '차량용 스티커',
    description: '주차 연락처를 QR로! 개인정보 노출 없이 연락받기',
    price: '5,000원~',
    features: ['내구성 강한 UV 코팅', '방수 처리', '맞춤 디자인 가능'],
    image: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=400&h=300&fit=crop',
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-50'
  },
  {
    icon: Store,
    name: '매장용 스탠드',
    description: '테이블에 세워두는 고급 아크릴 QR 스탠드',
    price: '15,000원~',
    features: ['아크릴 프리미엄 소재', '양면 인쇄', '로고 각인 서비스'],
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=300&fit=crop',
    color: 'from-purple-500 to-pink-500',
    bgColor: 'bg-purple-50'
  },
  {
    icon: CreditCard,
    name: '명함형 카드',
    description: 'NFC + QR 스마트 명함으로 프로페셔널하게',
    price: '3,000원~',
    features: ['PVC 고급 카드', 'NFC 태그 내장', '100장 단위 주문'],
    image: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=300&fit=crop',
    color: 'from-slate-600 to-slate-800',
    bgColor: 'bg-slate-50'
  },
  {
    icon: Table2,
    name: '테이블 텐트',
    description: '음식점, 카페 테이블용 삼각 스탠드',
    price: '8,000원~',
    features: ['양면 인쇄', '접이식 구조', '방수 코팅'],
    image: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=400&h=300&fit=crop',
    color: 'from-orange-500 to-red-500',
    bgColor: 'bg-orange-50'
  }
]

export default function HomePage() {
  // 사이트 설정 상태
  const [settings, setSettings] = useState({
    heroImage: '/images/1.png',
    heroTitle: '10시간 → 10분으로',
    heroSubtitle: '연락처 일괄 저장',
    heroDescription: '엑셀로 관리하던 수백 명의 연락처, QR코드 하나로 고객 폰에 바로 저장하세요.',
    heroBadge: '보험 FP · 영업팀을 위한 업무 자동화',
    showUseCases: true,
    showTestimonials: true,
    showPremiumFeatures: true,
    showCharacterQR: true,
    ctaButtonText: '무료로 시작하기',
    ctaButtonLink: '/generate',
    // 섹션 데이터
    useCases: null,
    testimonials: null,
    premiumFeatures: null,
    characterQR: null
  })

  // 동적 섹션 데이터 (설정에서 가져오거나 기본값 사용)
  const displayUseCases = settings.useCases || useCases
  const displayTestimonials = settings.testimonials || testimonials
  const displayPremiumFeatures = settings.premiumFeatures || premiumFeatures
  const displayCharacterQR = settings.characterQR || {
    phone: '1588-5617',
    email: 'mymiryu@gmail.com',
    contactName: 'PlanX QR 고객센터',
    website: 'https://30daysliving.com'
  }

  // 설정 로드
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get('/api/settings')
        if (res.data) {
          setSettings(prev => ({ ...prev, ...res.data }))
        }
      } catch (err) {
        console.error('설정 로드 실패:', err)
      }
    }
    fetchSettings()
  }, [])

  return (
    <div className="space-y-24 animate-fade-in">
      {/* 히어로 섹션 - 워크플로우 이미지 */}
      <section className="relative overflow-hidden">
        <div className="grid lg:grid-cols-2 gap-12 items-center py-12">
          {/* 텍스트 영역 */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500/10 to-purple-500/10 border border-primary-200 text-primary-700 rounded-full text-sm font-medium mb-6">
              <Award className="w-4 h-4" />
              {settings.heroBadge}
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-tight">
              <span className="line-through text-slate-400 text-3xl md:text-4xl">10시간</span>
              <span className="text-primary-500 mx-2">→</span>
              <span className="text-primary-600">{settings.heroTitle.split('→')[1]?.trim() || '10분'}</span>으로
              <span className="block bg-gradient-to-r from-primary-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                {settings.heroSubtitle}
              </span>
            </h1>

            <p className="text-lg md:text-xl text-slate-600 max-w-xl mb-8">
              {settings.heroDescription || '엑셀로 받은 수백 명의 고객 연락처를 일일이 입력하지 마세요. QR코드 하나로 한 번에 저장합니다.'}
            </p>

            <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-4 mb-8">
              <Link to={settings.ctaButtonLink} className="group relative px-8 py-4 bg-gradient-to-r from-primary-500 to-purple-500 text-white rounded-xl font-semibold shadow-xl shadow-primary-500/25 hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                {settings.ctaButtonText}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/insurance" className="px-8 py-4 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-semibold hover:border-primary-300 hover:text-primary-600 transition-all duration-200 flex items-center gap-2">
                <Users className="w-5 h-5" />
                보험 FP 전용
              </Link>
            </div>

            {/* 신뢰 지표 - 작게 */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-6 text-sm">
              {trustBadges.slice(0, 3).map((badge) => (
                <div key={badge.label} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-slate-600"><strong className="text-slate-900">{badge.number}</strong> {badge.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 이미지 영역 - 워크플로우 이미지 */}
          <div className="relative">
            <div className="relative z-10">
              <img
                src={settings.heroImage}
                alt="엑셀에서 QR코드로, 10시간 작업을 10분으로"
                className="rounded-3xl shadow-2xl shadow-slate-300/50 w-full"
              />
              {/* 워크플로우 설명 */}
              <div className="mt-6 bg-white/90 backdrop-blur rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <div className="flex-1 text-center">
                    <div className="w-10 h-10 mx-auto mb-2 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <Upload className="w-5 h-5 text-emerald-600" />
                    </div>
                    <p className="font-semibold text-slate-800">엑셀 업로드</p>
                    <p className="text-xs text-slate-500">대량 연락처</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-300 flex-shrink-0" />
                  <div className="flex-1 text-center">
                    <div className="w-10 h-10 mx-auto mb-2 bg-amber-100 rounded-xl flex items-center justify-center">
                      <QrCode className="w-5 h-5 text-amber-600" />
                    </div>
                    <p className="font-semibold text-slate-800">QR 자동생성</p>
                    <p className="text-xs text-slate-500">개별 vCard</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-300 flex-shrink-0" />
                  <div className="flex-1 text-center">
                    <div className="w-10 h-10 mx-auto mb-2 bg-primary-100 rounded-xl flex items-center justify-center">
                      <Phone className="w-5 h-5 text-primary-600" />
                    </div>
                    <p className="font-semibold text-slate-800">한 번에 저장</p>
                    <p className="text-xs text-slate-500">스캔 1회</p>
                  </div>
                </div>
              </div>
            </div>
            {/* 배경 장식 */}
            <div className="absolute top-10 right-10 w-72 h-72 bg-emerald-200 rounded-full blur-3xl opacity-40 -z-10"></div>
            <div className="absolute bottom-10 left-10 w-56 h-56 bg-amber-200 rounded-full blur-3xl opacity-40 -z-10"></div>
          </div>
        </div>
      </section>

      {/* 클라이언트 로고 */}
      <section className="py-8 border-y border-slate-200">
        <p className="text-center text-sm text-slate-500 mb-6">국내 주요 기업들이 선택한 QR코드 솔루션</p>
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
          {clientLogos.map((logo) => (
            <div key={logo.name} className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-bold text-lg hover:bg-slate-200 transition-colors">
              {logo.initial}
            </div>
          ))}
        </div>
      </section>

      {/* 업종별 활용 사례 - 이미지 카드 */}
      {settings.showUseCases !== false && (
      <section>
        <div className="text-center mb-16">
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

        <div className="space-y-20">
          {displayUseCases.map((useCase, index) => {
            const Icon = useCase.icon || Building2
            const isReversed = index % 2 === 1
            const colorClasses = ['from-orange-500 to-red-500', 'from-blue-500 to-cyan-500', 'from-slate-600 to-slate-800', 'from-purple-500 to-pink-500']
            const color = useCase.color || colorClasses[index % 4]
            return (
              <div
                key={useCase.industry}
                className={`grid lg:grid-cols-2 gap-12 items-center ${isReversed ? 'lg:flex-row-reverse' : ''}`}
              >
                {/* 이미지 */}
                <div className={`relative ${isReversed ? 'lg:order-2' : ''}`}>
                  <img
                    src={useCase.image}
                    alt={useCase.title}
                    className="rounded-3xl shadow-2xl shadow-slate-300/50 w-full object-cover aspect-[4/3]"
                  />
                  <div className={`absolute -bottom-4 ${isReversed ? '-left-4' : '-right-4'} bg-gradient-to-r ${color} p-4 rounded-2xl shadow-xl`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                </div>

                {/* 텍스트 */}
                <div className={`${isReversed ? 'lg:order-1' : ''}`}>
                  <span className={`inline-block px-4 py-1.5 bg-gradient-to-r ${color} text-white text-sm font-semibold rounded-full mb-4`}>
                    {useCase.industry}
                  </span>
                  <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">{useCase.title}</h3>
                  <p className="text-lg text-slate-600 mb-6">{useCase.description}</p>

                  {useCase.benefits && useCase.benefits.length > 0 && (
                  <div className="space-y-3 mb-8">
                    {useCase.benefits.map((benefit) => (
                      <div key={benefit} className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${color} flex items-center justify-center flex-shrink-0`}>
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-slate-700">{benefit}</span>
                      </div>
                    ))}
                  </div>
                  )}

                  <Link
                    to="/generate"
                    className={`inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r ${color} text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-200`}
                  >
                    {useCase.industry} QR 만들기
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </section>
      )}

      {/* 프리미엄 기능 - 이미지 카드 */}
      {settings.showPremiumFeatures !== false && (
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 md:p-16 text-white">
        <div className="text-center mb-16">
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

        <div className="grid md:grid-cols-2 gap-8">
          {displayPremiumFeatures.map((feature) => {
            const Icon = feature.icon || Sparkles
            return (
              <div
                key={feature.title}
                className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden hover:bg-white/10 transition-colors"
              >
                <div className="aspect-[16/9] overflow-hidden">
                  <img
                    src={feature.image}
                    alt={feature.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-purple-400 rounded-xl flex items-center justify-center mb-4 -mt-12 relative z-10 shadow-lg">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-xl mb-2">{feature.title}</h3>
                  <p className="text-slate-400">{feature.description}</p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="text-center mt-12">
          <Link
            to="/pricing"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-slate-900 rounded-xl font-semibold hover:bg-slate-100 transition-colors shadow-xl"
          >
            프리미엄 시작하기
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
      )}

      {/* 고객 후기 - 사진 포함 */}
      {settings.showTestimonials !== false && (
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

        <div className="grid md:grid-cols-3 gap-8">
          {displayTestimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-slate-100 hover:shadow-2xl transition-shadow"
            >
              <div className="flex gap-1 mb-6">
                {[...Array(testimonial.rating || 5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-slate-600 mb-8 leading-relaxed text-lg">"{testimonial.content}"</p>
              <div className="flex items-center gap-4">
                <img
                  src={testimonial.image}
                  alt={testimonial.name}
                  className="w-14 h-14 rounded-full object-cover ring-4 ring-slate-100"
                />
                <div>
                  <div className="font-semibold text-slate-900 text-lg">{testimonial.name}</div>
                  <div className="text-slate-500">{testimonial.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      )}

      {/* 사용 방법 - 비주얼 스텝 */}
      <section className="bg-slate-50 rounded-3xl p-8 md:p-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            3단계로 간단하게
          </h2>
          <p className="text-slate-600">복잡한 설정 없이 바로 시작하세요</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            { step: '01', title: 'QR 유형 선택', desc: 'URL, 연락처, WiFi 등 원하는 유형을 선택하세요', image: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400&h=300&fit=crop' },
            { step: '02', title: '정보 입력', desc: 'QR코드에 담을 정보를 간단히 입력하세요', image: 'https://images.unsplash.com/photo-1531538606174-0f90ff5dce83?w=400&h=300&fit=crop' },
            { step: '03', title: '다운로드', desc: '생성된 QR코드를 고해상도로 다운로드하세요', image: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=300&fit=crop' },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="relative mb-6">
                <img
                  src={item.image}
                  alt={item.title}
                  className="rounded-2xl shadow-lg w-full aspect-[4/3] object-cover"
                />
                <div className="absolute -top-3 -left-3 w-12 h-12 bg-gradient-to-br from-primary-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold shadow-lg">
                  {item.step}
                </div>
              </div>
              <h3 className="font-bold text-xl text-slate-900 mb-2">{item.title}</h3>
              <p className="text-slate-600">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link
            to="/generate"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-primary-500 to-purple-500 text-white rounded-xl font-semibold shadow-xl hover:shadow-2xl transition-all"
          >
            <Play className="w-5 h-5" />
            지금 시작하기
          </Link>
        </div>
      </section>

      {/* QR 굿즈 제작 */}
      <section>
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 rounded-full text-sm font-medium mb-4">
            <ShoppingBag className="w-4 h-4" />
            QR 굿즈 제작
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            QR코드를 실물로 만나보세요
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            고급 인쇄로 제작된 QR 스티커와 스탠드로 비즈니스를 더욱 프로페셔널하게
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {qrGoods.map((product) => {
            const Icon = product.icon
            return (
              <div
                key={product.name}
                className="group bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="aspect-[4/3] overflow-hidden relative">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className={`absolute top-3 left-3 w-10 h-10 bg-gradient-to-r ${product.color} rounded-xl flex items-center justify-center shadow-lg`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-lg text-slate-900 mb-1">{product.name}</h3>
                  <p className="text-slate-600 text-sm mb-3">{product.description}</p>
                  <div className="space-y-1.5 mb-4">
                    {product.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-2 text-xs text-slate-500">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        {feature}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-lg font-bold bg-gradient-to-r ${product.color} bg-clip-text text-transparent`}>
                      {product.price}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-10 text-center">
          <div className="inline-flex flex-col sm:flex-row items-center gap-4 p-6 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200">
            <div className="text-center sm:text-left">
              <p className="font-semibold text-slate-900">대량 주문 및 맞춤 제작 문의</p>
              <p className="text-sm text-slate-600">로고, 디자인, 수량에 맞춤 견적을 받아보세요</p>
            </div>
            <a
              href="mailto:mymiryu@gmail.com?subject=QR 굿즈 제작 문의"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              <Mail className="w-5 h-5" />
              견적 문의하기
            </a>
          </div>
        </div>
      </section>

      {/* QR 타입 - 아이콘 뱃지 */}
      <section>
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">
            지원하는 QR코드 유형
          </h2>
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
              <Link
                key={type.name}
                to="/generate"
                className="flex items-center gap-3 px-5 py-3 bg-white rounded-xl shadow-md border border-slate-200 hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${type.color}15` }}>
                  <Icon className="w-5 h-5" style={{ color: type.color }} />
                </div>
                <span className="font-medium text-slate-700">{type.name}</span>
              </Link>
            )
          })}
        </div>
      </section>

      {/* CTA 섹션 */}
      <section className="relative text-center py-20 bg-gradient-to-r from-primary-500 via-purple-500 to-pink-500 rounded-3xl text-white overflow-hidden">
        {/* 배경 이미지 */}
        <div className="absolute inset-0 opacity-10">
          <img
            src="https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&h=600&fit=crop"
            alt=""
            className="w-full h-full object-cover"
          />
        </div>

        <div className="relative">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            지금 바로 시작하세요
          </h2>
          <p className="text-white/80 mb-10 max-w-xl mx-auto text-xl">
            무료 플랜으로 시작하고, 비즈니스가 성장하면 업그레이드하세요.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/generate"
              className="inline-flex items-center gap-2 px-10 py-5 bg-white text-primary-600 rounded-xl font-semibold shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-200 text-lg"
            >
              <QrCode className="w-6 h-6" />
              무료로 QR코드 만들기
              <ArrowRight className="w-6 h-6" />
            </Link>
          </div>
          <p className="mt-6 text-white/60 text-sm">신용카드 없이 바로 시작 가능</p>
        </div>
      </section>

      {/* 고객센터 안내 - 귀여운 캐릭터 QR코드 */}
      {settings.showCharacterQR !== false && (
      <section className="bg-gradient-to-br from-amber-50 via-pink-50 to-purple-50 rounded-3xl p-8 md:p-12">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
            도입 상담이 필요하신가요?
          </h2>
          <p className="text-slate-600">귀여운 친구들 배를 카메라로 찍어보세요! 📸</p>
        </div>

        <div className="flex flex-col md:flex-row items-start justify-center gap-6 md:gap-12">

          {/* 곰 캐릭터 - 전화 */}
          <div className="text-center group">
            <div className="relative">
              {/* 말풍선 */}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap shadow-sm z-10">
                찍으면 바로 전화! 📞
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-amber-100"></div>
              </div>

              {/* 곰 캐릭터 SVG */}
              <div className="relative w-48 h-60 group-hover:scale-105 transition-transform duration-300 cursor-pointer">
                <svg viewBox="0 0 180 220" className="w-full h-full drop-shadow-lg">
                  {/* 귀 */}
                  <circle cx="45" cy="32" r="24" fill="#D4A574" />
                  <circle cx="45" cy="32" r="15" fill="#C4956A" />
                  <circle cx="135" cy="32" r="24" fill="#D4A574" />
                  <circle cx="135" cy="32" r="15" fill="#C4956A" />

                  {/* 얼굴 */}
                  <ellipse cx="90" cy="75" rx="55" ry="48" fill="#D4A574" />

                  {/* 눈 */}
                  <ellipse cx="65" cy="68" rx="6" ry="8" fill="#3D2914" />
                  <ellipse cx="115" cy="68" rx="6" ry="8" fill="#3D2914" />
                  <circle cx="67" cy="66" r="2" fill="white" />
                  <circle cx="117" cy="66" r="2" fill="white" />

                  {/* 볼터치 */}
                  <ellipse cx="42" cy="85" rx="10" ry="6" fill="#FFB5B5" opacity="0.6" />
                  <ellipse cx="138" cy="85" rx="10" ry="6" fill="#FFB5B5" opacity="0.6" />

                  {/* 코 */}
                  <ellipse cx="90" cy="85" rx="14" ry="10" fill="#C4956A" />
                  <ellipse cx="90" cy="83" rx="8" ry="5" fill="#3D2914" />

                  {/* 입 - 웃는 표정 */}
                  <path d="M 80 95 Q 90 105 100 95" stroke="#3D2914" strokeWidth="2.5" fill="none" strokeLinecap="round" />

                  {/* 몸통 */}
                  <ellipse cx="90" cy="165" rx="50" ry="48" fill="#D4A574" />

                  {/* 배 (QR 영역) - 흰색 */}
                  <ellipse cx="90" cy="165" rx="40" ry="38" fill="#FFF8F0" stroke="#E8D5C4" strokeWidth="2" />

                  {/* 손 */}
                  <ellipse cx="38" cy="148" rx="12" ry="16" fill="#D4A574" transform="rotate(-20 38 148)" />
                  <ellipse cx="142" cy="148" rx="12" ry="16" fill="#D4A574" transform="rotate(20 142 148)" />
                </svg>

                {/* QR코드 - 곰 배 위에 */}
                <div className="absolute top-[149px] left-1/2 -translate-x-1/2">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=tel:${displayCharacterQR.phone}&color=92400E&bgcolor=FFF8F0`}
                    alt="전화 QR코드"
                    className="w-[62px] h-[62px] rounded"
                  />
                </div>
              </div>
            </div>
            <div className="mt-1 flex items-center justify-center gap-2 text-amber-700 font-semibold">
              <Phone className="w-4 h-4" />
              <a href={`tel:${displayCharacterQR.phone}`} className="hover:text-amber-500 transition-colors">{displayCharacterQR.phone}</a>
            </div>
          </div>

          {/* 토끼 캐릭터 - 이메일 */}
          <div className="text-center group">
            <div className="relative">
              {/* 말풍선 */}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-pink-100 text-pink-800 text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap shadow-sm z-10">
                메일이 슝~! 💌
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-pink-100"></div>
              </div>

              {/* 토끼 캐릭터 SVG */}
              <div className="relative w-48 h-60 group-hover:scale-105 transition-transform duration-300 cursor-pointer">
                <svg viewBox="0 0 180 220" className="w-full h-full drop-shadow-lg">
                  {/* 귀 */}
                  <ellipse cx="55" cy="38" rx="16" ry="42" fill="#FFF0F5" stroke="#FFB6C1" strokeWidth="2" />
                  <ellipse cx="55" cy="38" rx="9" ry="28" fill="#FFD1DC" opacity="0.6" />
                  <ellipse cx="125" cy="38" rx="16" ry="42" fill="#FFF0F5" stroke="#FFB6C1" strokeWidth="2" />
                  <ellipse cx="125" cy="38" rx="9" ry="28" fill="#FFD1DC" opacity="0.6" />

                  {/* 얼굴 */}
                  <ellipse cx="90" cy="92" rx="48" ry="42" fill="#FFF0F5" stroke="#FFB6C1" strokeWidth="2" />

                  {/* 눈 */}
                  <ellipse cx="70" cy="85" rx="5" ry="7" fill="#3D2914" />
                  <ellipse cx="110" cy="85" rx="5" ry="7" fill="#3D2914" />
                  <circle cx="72" cy="83" r="2" fill="white" />
                  <circle cx="112" cy="83" r="2" fill="white" />

                  {/* 볼터치 */}
                  <ellipse cx="48" cy="98" rx="8" ry="5" fill="#FFB6C1" opacity="0.6" />
                  <ellipse cx="132" cy="98" rx="8" ry="5" fill="#FFB6C1" opacity="0.6" />

                  {/* 코 */}
                  <ellipse cx="90" cy="98" rx="5" ry="4" fill="#FFB6C1" />

                  {/* 입 */}
                  <path d="M 83 107 Q 90 114 97 107" stroke="#3D2914" strokeWidth="2" fill="none" strokeLinecap="round" />
                  <line x1="90" y1="98" x2="90" y2="107" stroke="#3D2914" strokeWidth="1.5" />

                  {/* 몸통 */}
                  <ellipse cx="90" cy="168" rx="46" ry="46" fill="#FFF0F5" stroke="#FFB6C1" strokeWidth="2" />

                  {/* 배 (QR 영역) */}
                  <ellipse cx="90" cy="168" rx="38" ry="36" fill="white" stroke="#FFD1DC" strokeWidth="2" />

                  {/* 손 */}
                  <ellipse cx="42" cy="152" rx="10" ry="14" fill="#FFF0F5" stroke="#FFB6C1" strokeWidth="1.5" transform="rotate(-15 42 152)" />
                  <ellipse cx="138" cy="152" rx="10" ry="14" fill="#FFF0F5" stroke="#FFB6C1" strokeWidth="1.5" transform="rotate(15 138 152)" />
                </svg>

                {/* QR코드 - 토끼 배 위에 */}
                <div className="absolute top-[153px] left-1/2 -translate-x-1/2">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=mailto:${displayCharacterQR.email}&color=DB2777&bgcolor=FFFFFF`}
                    alt="이메일 QR코드"
                    className="w-[58px] h-[58px] rounded"
                  />
                </div>
              </div>
            </div>
            <div className="mt-1 flex items-center justify-center gap-2 text-pink-700 font-semibold text-sm">
              <Mail className="w-4 h-4" />
              <a href={`mailto:${displayCharacterQR.email}`} className="hover:text-pink-500 transition-colors">{displayCharacterQR.email}</a>
            </div>
          </div>

          {/* 고양이 캐릭터 - 연락처 저장 */}
          <div className="text-center group">
            <div className="relative">
              {/* 말풍선 */}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-purple-100 text-purple-800 text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap shadow-sm z-10">
                연락처 저장 냥~! 😺
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-purple-100"></div>
              </div>

              {/* 고양이 캐릭터 SVG */}
              <div className="relative w-48 h-60 group-hover:scale-105 transition-transform duration-300 cursor-pointer">
                <svg viewBox="0 0 180 220" className="w-full h-full drop-shadow-lg">
                  {/* 귀 */}
                  <polygon points="42,68 28,18 68,50" fill="#E9D5FF" stroke="#C084FC" strokeWidth="2" />
                  <polygon points="46,58 36,28 62,48" fill="#F3E8FF" />
                  <polygon points="138,68 152,18 112,50" fill="#E9D5FF" stroke="#C084FC" strokeWidth="2" />
                  <polygon points="134,58 144,28 118,48" fill="#F3E8FF" />

                  {/* 얼굴 */}
                  <ellipse cx="90" cy="88" rx="50" ry="44" fill="#E9D5FF" stroke="#C084FC" strokeWidth="2" />

                  {/* 눈 - 고양이 눈 */}
                  <ellipse cx="68" cy="80" rx="8" ry="12" fill="#3D2914" />
                  <ellipse cx="112" cy="80" rx="8" ry="12" fill="#3D2914" />
                  <ellipse cx="68" cy="80" rx="4" ry="8" fill="#1a1a2e" />
                  <ellipse cx="112" cy="80" rx="4" ry="8" fill="#1a1a2e" />
                  <circle cx="71" cy="77" r="2.5" fill="white" />
                  <circle cx="115" cy="77" r="2.5" fill="white" />

                  {/* 볼터치 */}
                  <ellipse cx="45" cy="95" rx="8" ry="5" fill="#FFB6C1" opacity="0.5" />
                  <ellipse cx="135" cy="95" rx="8" ry="5" fill="#FFB6C1" opacity="0.5" />

                  {/* 코 */}
                  <polygon points="90,95 85,102 95,102" fill="#C084FC" />

                  {/* 수염 */}
                  <line x1="52" y1="98" x2="30" y2="94" stroke="#A855F7" strokeWidth="1.5" opacity="0.7" />
                  <line x1="52" y1="103" x2="30" y2="105" stroke="#A855F7" strokeWidth="1.5" opacity="0.7" />
                  <line x1="128" y1="98" x2="150" y2="94" stroke="#A855F7" strokeWidth="1.5" opacity="0.7" />
                  <line x1="128" y1="103" x2="150" y2="105" stroke="#A855F7" strokeWidth="1.5" opacity="0.7" />

                  {/* 입 - ω 모양 */}
                  <path d="M 82 110 Q 86 115 90 110 Q 94 115 98 110" stroke="#3D2914" strokeWidth="2" fill="none" strokeLinecap="round" />

                  {/* 몸통 */}
                  <ellipse cx="90" cy="168" rx="48" ry="46" fill="#E9D5FF" stroke="#C084FC" strokeWidth="2" />

                  {/* 배 (QR 영역) */}
                  <ellipse cx="90" cy="168" rx="38" ry="36" fill="#FAF5FF" stroke="#DDD6FE" strokeWidth="2" />

                  {/* 손 */}
                  <ellipse cx="40" cy="152" rx="10" ry="14" fill="#E9D5FF" stroke="#C084FC" strokeWidth="1.5" transform="rotate(-20 40 152)" />
                  <ellipse cx="140" cy="152" rx="10" ry="14" fill="#E9D5FF" stroke="#C084FC" strokeWidth="1.5" transform="rotate(20 140 152)" />

                  {/* 꼬리 */}
                  <path d="M 138 185 Q 168 170 158 145" stroke="#C084FC" strokeWidth="8" fill="none" strokeLinecap="round" />
                </svg>

                {/* QR코드 - 고양이 배 위에 */}
                <div className="absolute top-[153px] left-1/2 -translate-x-1/2">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`BEGIN:VCARD\nVERSION:3.0\nFN:${displayCharacterQR.contactName}\nTEL:${displayCharacterQR.phone}\nEMAIL:${displayCharacterQR.email}\nURL:${displayCharacterQR.website}\nEND:VCARD`)}&color=7C3AED&bgcolor=FAF5FF`}
                    alt="연락처 저장 QR코드"
                    className="w-[58px] h-[58px] rounded"
                  />
                </div>
              </div>
            </div>
            <div className="mt-1 flex items-center justify-center gap-2 text-purple-700 font-semibold">
              <User className="w-4 h-4" />
              연락처 저장
            </div>
          </div>
        </div>

        {/* 하단 안내 */}
        <div className="mt-8 text-center">
          <p className="text-slate-500 text-sm bg-white/60 inline-block px-4 py-2 rounded-full">
            💡 스마트폰 카메라로 캐릭터의 <span className="font-semibold text-slate-700">배</span>를 스캔하세요!
          </p>
        </div>
      </section>
      )}
    </div>
  )
}
