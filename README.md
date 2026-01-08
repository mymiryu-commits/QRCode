# QR Studio - 다기능 QR코드 생성기

다양한 유형의 QR코드를 쉽고 빠르게 생성할 수 있는 웹 애플리케이션입니다.

## 주요 기능

### QR코드 유형
- **연락처 (vCard)**: 스캔하면 핸드폰에 연락처가 자동 저장됩니다
- **WiFi 연결**: 비밀번호 입력 없이 WiFi에 바로 연결됩니다
- **URL 링크**: 웹사이트 주소를 QR코드로 변환
- **이메일**: 이메일 작성 화면이 바로 열립니다
- **전화**: 스캔하면 바로 전화 연결
- **SMS 문자**: 미리 작성된 문자 메시지 전송
- **위치**: 지도에서 위치 확인
- **이벤트**: 캘린더에 일정 자동 추가

### 대량 생성
- 엑셀(.xlsx, .xls) 또는 CSV 파일 업로드로 대량 QR코드 생성
- 샘플 템플릿 다운로드 지원
- ZIP 파일로 일괄 다운로드

### 히스토리 관리
- 생성한 모든 QR코드 자동 저장 (SQLite DB)
- 유형별 필터링
- 개별 다운로드 및 삭제

### 커스터마이징
- QR코드 크기 조절
- 색상 변경 (QR 색상, 배경색)
- 오류 정정 수준 설정
- 여백 조절

## 기술 스택

### 백엔드
- Node.js + Express
- SQLite (better-sqlite3)
- QRCode (qrcode)
- XLSX (엑셀 파일 처리)
- Multer (파일 업로드)

### 프론트엔드
- React 18
- React Router
- Tailwind CSS
- Vite
- Axios
- Lucide React (아이콘)
- JSZip (ZIP 다운로드)
- FileSaver.js

## 설치 및 실행

```bash
# 의존성 설치
npm run install:all

# 개발 서버 실행 (백엔드 + 프론트엔드)
npm run dev
```

- 프론트엔드: http://localhost:5173
- 백엔드 API: http://localhost:3001

## API 엔드포인트

### QR코드 생성
```
POST /api/qr/generate
```

### 대량 QR코드 생성
```
POST /api/qr/batch (multipart/form-data)
```

### 히스토리 조회
```
GET /api/qr/history?page=1&limit=20&type=vcard
```

### 단일 QR코드 조회
```
GET /api/qr/:id
```

### QR코드 삭제
```
DELETE /api/qr/:id
```

### 샘플 템플릿 다운로드
```
GET /api/templates/:type (vcard, wifi, url, email)
```

### 통계
```
GET /api/stats
```

## 프로젝트 구조

```
QRCode/
├── server/
│   └── index.js         # Express 서버 & API
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   └── Layout.jsx
│   │   ├── pages/
│   │   │   ├── HomePage.jsx
│   │   │   ├── GeneratorPage.jsx
│   │   │   ├── BatchPage.jsx
│   │   │   └── HistoryPage.jsx
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   └── public/
├── data/                # SQLite DB 저장 위치
├── uploads/             # 임시 업로드 파일
└── package.json
```
