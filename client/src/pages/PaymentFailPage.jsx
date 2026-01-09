import { useSearchParams, Link } from 'react-router-dom'

export default function PaymentFailPage() {
  const [searchParams] = useSearchParams()
  const errorCode = searchParams.get('code')
  const errorMessage = searchParams.get('message')

  const getErrorDescription = (code) => {
    const errors = {
      PAY_PROCESS_CANCELED: '결제가 취소되었습니다.',
      PAY_PROCESS_ABORTED: '결제 진행 중 오류가 발생했습니다.',
      REJECT_CARD_COMPANY: '카드사에서 결제를 거절했습니다.',
      INVALID_CARD_NUMBER: '카드 번호가 올바르지 않습니다.',
      EXCEED_MAX_AMOUNT: '결제 한도를 초과했습니다.'
    }
    return errors[code] || errorMessage || '알 수 없는 오류가 발생했습니다.'
  }

  return (
    <div className="max-w-lg mx-auto text-center py-16">
      <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">결제에 실패했습니다</h1>
      <p className="text-red-600 mb-2">{getErrorDescription(errorCode)}</p>
      {errorCode && (
        <p className="text-sm text-gray-500 mb-8">오류 코드: {errorCode}</p>
      )}

      <div className="space-x-4">
        <Link
          to="/pricing"
          className="inline-block bg-blue-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-600 transition-colors"
        >
          다시 시도하기
        </Link>
        <Link
          to="/"
          className="inline-block bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
        >
          홈으로
        </Link>
      </div>

      <div className="mt-12 text-left bg-gray-50 p-6 rounded-lg">
        <h3 className="font-bold mb-3">결제 실패 시 확인사항</h3>
        <ul className="text-sm text-gray-600 space-y-2">
          <li>- 카드 잔액이 충분한지 확인해주세요</li>
          <li>- 카드 유효기간이 지나지 않았는지 확인해주세요</li>
          <li>- 해외결제 차단 설정이 되어있지 않은지 확인해주세요</li>
          <li>- 일일 결제 한도를 초과하지 않았는지 확인해주세요</li>
        </ul>
        <p className="mt-4 text-sm text-gray-500">
          문제가 계속되면 고객센터로 문의해주세요.
        </p>
      </div>
    </div>
  )
}
