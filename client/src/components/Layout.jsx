import { Link, useLocation, useNavigate } from 'react-router-dom'
import { QrCode, Home, PlusCircle, Upload, History, Menu, X, LogIn, LogOut, User, Shield, CreditCard } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

const navigation = [
  { name: '홈', href: '/', icon: Home, requiresAuth: false },
  { name: 'QR 생성', href: '/generate', icon: PlusCircle, requiresAuth: true },
  { name: '대량 생성', href: '/batch', icon: Upload, requiresAuth: true },
  { name: '히스토리', href: '/history', icon: History, requiresAuth: true },
  { name: '요금제', href: '/pricing', icon: CreditCard, requiresAuth: false },
]

export default function Layout({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, isAuthenticated, logout, isAdmin } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/')
    setMobileMenuOpen(false)
  }

  const visibleNavigation = navigation.filter(
    item => !item.requiresAuth || isAuthenticated
  )

  return (
    <div className="min-h-screen">
      {/* 헤더 */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-amber-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* 로고 */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/25 group-hover:shadow-primary-500/40 transition-shadow">
                <QrCode className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-stone-800 to-amber-700 bg-clip-text text-transparent">
                PlanX QR
              </span>
            </Link>

            {/* 데스크톱 네비게이션 */}
            <nav className="hidden md:flex items-center gap-1">
              {visibleNavigation.map((item) => {
                const isActive = location.pathname === item.href
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-amber-50 text-primary-600'
                        : 'text-stone-600 hover:bg-amber-50 hover:text-stone-900'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                )
              })}

              {/* 관리자 메뉴 */}
              {isAuthenticated && isAdmin() && (
                <Link
                  to="/admin"
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    location.pathname === '/admin'
                      ? 'bg-amber-100 text-amber-700'
                      : 'text-stone-600 hover:bg-amber-50 hover:text-stone-900'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  관리자
                </Link>
              )}
            </nav>

            {/* 사용자 메뉴 */}
            <div className="hidden md:flex items-center gap-3">
              {isAuthenticated ? (
                <>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-lg">
                    <User className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-medium text-stone-700">{user?.name}</span>
                    {isAdmin() && (
                      <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded">
                        관리자
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 text-stone-600 hover:bg-red-50 hover:text-red-600 rounded-lg font-medium transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                    로그아웃
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="flex items-center gap-2 px-4 py-2 text-stone-600 hover:bg-amber-50 rounded-lg font-medium transition-all"
                  >
                    <LogIn className="w-4 h-4" />
                    로그인
                  </Link>
                  <Link
                    to="/register"
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-amber-600 text-white rounded-lg font-medium hover:from-primary-600 hover:to-amber-700 transition-all"
                  >
                    회원가입
                  </Link>
                </>
              )}
            </div>

            {/* 모바일 메뉴 버튼 */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-stone-600 hover:bg-amber-50"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* 모바일 메뉴 */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-amber-200/50 bg-white">
            <nav className="px-4 py-3 space-y-1">
              {visibleNavigation.map((item) => {
                const isActive = location.pathname === item.href
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-amber-50 text-primary-600'
                        : 'text-stone-600 hover:bg-amber-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                )
              })}

              {/* 관리자 메뉴 (모바일) */}
              {isAuthenticated && isAdmin() && (
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                    location.pathname === '/admin'
                      ? 'bg-amber-100 text-amber-700'
                      : 'text-stone-600 hover:bg-amber-50'
                  }`}
                >
                  <Shield className="w-5 h-5" />
                  관리자
                </Link>
              )}

              <div className="border-t border-amber-200 my-2 pt-2">
                {isAuthenticated ? (
                  <>
                    <div className="flex items-center gap-2 px-4 py-3 text-stone-700">
                      <User className="w-5 h-5 text-amber-600" />
                      <span className="font-medium">{user?.name}</span>
                      {isAdmin() && (
                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded">
                          관리자
                        </span>
                      )}
                    </div>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 px-4 py-3 w-full text-left text-red-600 hover:bg-red-50 rounded-lg font-medium"
                    >
                      <LogOut className="w-5 h-5" />
                      로그아웃
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-stone-600 hover:bg-amber-50 rounded-lg font-medium"
                    >
                      <LogIn className="w-5 h-5" />
                      로그인
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-primary-600 hover:bg-amber-50 rounded-lg font-medium"
                    >
                      <User className="w-5 h-5" />
                      회원가입
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* 푸터 */}
      <footer className="border-t border-amber-200/50 bg-amber-50/50 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-stone-500 text-sm">
            <p>PlanX QR - 다기능 QR코드 생성기</p>
            <p className="mt-1">연락처, WiFi, URL 등 다양한 QR코드를 쉽고 빠르게 생성하세요</p>
            <p className="mt-3 text-stone-400">
              고객센터: <a href="tel:1588-5617" className="hover:text-primary-500">1588-5617</a>
              <span className="mx-2">|</span>
              <a href="mailto:mymiryu@gmail.com" className="hover:text-primary-500">mymiryu@gmail.com</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
