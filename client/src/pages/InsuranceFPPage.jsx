import { Link } from 'react-router-dom'
import {
  Upload, Users, Smartphone, CheckCircle2, ArrowRight,
  Clock, Shield, Zap, FileSpreadsheet, Download, Star,
  Phone, Mail, Building2, Award, TrendingUp
} from 'lucide-react'

const benefits = [
  {
    icon: Clock,
    title: '8시간 → 10분',
    description: '500명 고객 연락처 수동 입력 시간을 대폭 단축'
  },
  {
    icon: Smartphone,
    title: '원클릭 저장',
    description: 'VCF 파일 하나로 수백 명 연락처를 스마트폰에 일괄 저장'
  },
  {
    icon: Shield,
    title: '정보 보안',
    description: '개인정보를 안전하게 처리, 서버에 저장되지 않는 옵션 제공'
  },
  {
    icon: Zap,
    title: '간편한 사용',
    description: '기존 엑셀 파일 그대로 업로드, 추가 작업 불필요'
  },
]

const steps = [
  {
    step: '01',
    title: '엑셀 파일 준비',
    description: '회사에서 받은 소관고객 명단 엑셀 파일 준비',
    image: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400&h=300&fit=crop'
  },
  {
    step: '02',
    title: '파일 업로드',
    description: '엑셀 파일을 업로드하면 자동으로 연락처 QR 생성',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop'
  },
  {
    step: '03',
    title: 'VCF 다운로드',
    description: '"연락처 일괄저장" 버튼 클릭하여 VCF 파일 다운로드',
    image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400&h=300&fit=crop'
  },
  {
    step: '04',
    title: '스마트폰 저장',
    description: 'VCF 파일을 스마트폰에서 열면 전체 연락처 일괄 저장 완료!',
    image: 'https://images.unsplash.com/photo-1556656793-08538906a9f8?w=400&h=300&fit=crop'
  },
]

const testimonials = [
  {
    name: '김○○ 설계사',
    company: '교보생명',
    content: '매달 신규 배정 고객 연락처 입력하느라 반나절씩 걸렸는데, 이제 10분이면 끝나요. 정말 혁신적입니다.',
    rating: 5
  },
  {
    name: '이○○ 지점장',
    company: '삼성생명',
    content: '우리 지점 설계사 30명 전원 사용 중입니다. 업무 효율이 확 올라갔어요.',
    rating: 5
  },
  {
    name: '박○○ FP',
    company: '한화생명',
    content: '고객 연락처 500개 이상 관리하는데, VCF 일괄 저장 기능이 정말 편해요.',
    rating: 5
  },
]

const faqs = [
  {
    question: '어떤 엑셀 양식을 사용해야 하나요?',
    answer: '이름과 전화번호 컬럼만 있으면 됩니다. 회사에서 받은 고객 명단 엑셀을 그대로 사용할 수 있으며, 필요시 저희 템플릿을 다운로드하여 맞춰서 사용하세요.'
  },
  {
    question: 'iOS와 Android 모두 지원하나요?',
    answer: '네, VCF(vCard) 형식은 iOS와 Android 모두 기본 지원합니다. 파일을 열기만 하면 연락처 앱에서 자동으로 불러옵니다.'
  },
  {
    question: '개인정보 보안은 안전한가요?',
    answer: '파일 처리는 암호화된 연결(HTTPS)로 진행되며, QR 이미지 생성 후 원본 데이터는 선택에 따라 서버에서 삭제할 수 있습니다.'
  },
  {
    question: '한 번에 몇 명까지 처리할 수 있나요?',
    answer: '프로 요금제 기준 한 번에 1,000명까지 처리 가능합니다. 더 많은 인원이 필요하시면 비즈니스 요금제를 이용해주세요.'
  },
]

const insuranceCompanies = [
  '삼성생명', '한화생명', '교보생명', 'DB생명', '신한라이프',
  'NH농협생명', 'KB라이프', '미래에셋생명', 'ABL생명', '흥국생명'
]

export default function InsuranceFPPage() {
  return (
    <div className="animate-fade-in">
      {/* 히어로 섹션 */}
      <section className="relative py-16 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200 rounded-full blur-3xl opacity-40"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-green-200 rounded-full blur-3xl opacity-40"></div>
        </div>

        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-sm font-medium mb-6">
            <Shield className="w-4 h-4" />
            보험설계사 전용 서비스
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-tight">
            500명 고객 연락처
            <span className="block text-blue-600">10분 만에 저장</span>
          </h1>

          <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
            소관고객 엑셀 명단을 업로드하면,
            <strong className="text-slate-800"> 스마트폰에 한 번에 저장</strong>할 수 있는
            VCF 파일을 생성해드립니다.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link
              to="/batch"
              className="group px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold shadow-xl shadow-blue-500/25 hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2"
            >
              <Upload className="w-5 h-5" />
              무료로 시작하기
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="#how-it-works"
              className="px-8 py-4 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-semibold hover:border-blue-300 transition-all duration-200"
            >
              사용 방법 보기
            </a>
          </div>

          {/* 지원 보험사 */}
          <div className="flex flex-wrap justify-center gap-3">
            {insuranceCompanies.slice(0, 6).map((company) => (
              <span key={company} className="px-3 py-1 bg-white border border-slate-200 rounded-full text-sm text-slate-600">
                {company}
              </span>
            ))}
            <span className="px-3 py-1 bg-slate-100 rounded-full text-sm text-slate-500">
              +4개 보험사
            </span>
          </div>
        </div>
      </section>

      {/* 문제점 & 해결책 */}
      <section className="py-16 bg-slate-50 rounded-3xl my-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* 문제점 */}
            <div className="bg-red-50 border border-red-200 rounded-2xl p-8">
              <h3 className="text-xl font-bold text-red-800 mb-4 flex items-center gap-2">
                <span className="text-2xl">😫</span> 기존 방식의 문제점
              </h3>
              <ul className="space-y-3 text-red-700">
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">✗</span>
                  매달 수십~수백 명의 신규 고객 연락처 수동 입력
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">✗</span>
                  한 명당 1분씩, 500명이면 8시간 이상 소요
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">✗</span>
                  입력 오류로 인한 연락 실패 발생
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">✗</span>
                  반복 작업으로 인한 업무 피로도 증가
                </li>
              </ul>
            </div>

            {/* 해결책 */}
            <div className="bg-green-50 border border-green-200 rounded-2xl p-8">
              <h3 className="text-xl font-bold text-green-800 mb-4 flex items-center gap-2">
                <span className="text-2xl">🎉</span> PlanX QR 솔루션
              </h3>
              <ul className="space-y-3 text-green-700">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  엑셀 파일 업로드 한 번으로 전체 처리
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  500명 기준 10분 이내 완료
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  VCF 파일로 스마트폰 일괄 저장
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  오타 걱정 없는 정확한 데이터 처리
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 핵심 혜택 */}
      <section className="py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">왜 PlanX QR인가요?</h2>
          <p className="text-slate-600">보험설계사를 위해 설계된 최적의 솔루션</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((benefit) => {
            const Icon = benefit.icon
            return (
              <div key={benefit.title} className="bg-white border border-slate-200 rounded-2xl p-6 text-center hover:shadow-lg transition-shadow">
                <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-7 h-7 text-blue-600" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">{benefit.title}</h3>
                <p className="text-sm text-slate-600">{benefit.description}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* 사용 방법 */}
      <section id="how-it-works" className="py-16 bg-gradient-to-br from-blue-900 to-slate-900 rounded-3xl text-white my-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">사용 방법</h2>
            <p className="text-blue-200">4단계로 간단하게 완료</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((item) => (
              <div key={item.step} className="text-center">
                <div className="relative mb-4">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="rounded-xl w-full aspect-[4/3] object-cover"
                  />
                  <div className="absolute -top-3 -left-3 w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold shadow-lg">
                    {item.step}
                  </div>
                </div>
                <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-blue-200">{item.description}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              to="/batch"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-900 rounded-xl font-semibold shadow-xl hover:shadow-2xl transition-all"
            >
              <FileSpreadsheet className="w-5 h-5" />
              지금 바로 시작하기
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* 고객 후기 */}
      <section className="py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">설계사들의 실제 후기</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-lg transition-shadow">
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-slate-600 mb-6">"{testimonial.content}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                  {testimonial.name[0]}
                </div>
                <div>
                  <div className="font-semibold text-slate-900">{testimonial.name}</div>
                  <div className="text-sm text-slate-500">{testimonial.company}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-slate-50 rounded-3xl my-16">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">자주 묻는 질문</h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-white border border-slate-200 rounded-xl p-6">
                <h3 className="font-semibold text-slate-900 mb-2">{faq.question}</h3>
                <p className="text-slate-600 text-sm">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 text-center">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-3xl p-12 text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            지금 바로 업무 효율을 높이세요
          </h2>
          <p className="text-blue-100 mb-8 text-lg">
            월 10개 무료 생성, 신용카드 없이 시작 가능
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/batch"
              className="px-8 py-4 bg-white text-blue-600 rounded-xl font-semibold shadow-xl hover:shadow-2xl transition-all flex items-center gap-2"
            >
              <Upload className="w-5 h-5" />
              무료로 시작하기
            </Link>
            <Link
              to="/pricing"
              className="px-8 py-4 bg-blue-500 text-white border-2 border-blue-400 rounded-xl font-semibold hover:bg-blue-400 transition-all flex items-center gap-2"
            >
              요금제 보기
            </Link>
          </div>
        </div>

        {/* 고객센터 */}
        <div className="mt-12 text-slate-500">
          <p>도입 문의</p>
          <div className="flex items-center justify-center gap-6 mt-2">
            <a href="tel:1588-5617" className="flex items-center gap-2 text-slate-700 hover:text-blue-600">
              <Phone className="w-4 h-4" />
              1588-5617
            </a>
            <a href="mailto:mymiryu@gmail.com" className="flex items-center gap-2 text-slate-700 hover:text-blue-600">
              <Mail className="w-4 h-4" />
              mymiryu@gmail.com
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
