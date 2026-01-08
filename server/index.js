import express from 'express';
import cors from 'cors';
import multer from 'multer';
import QRCode from 'qrcode';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Database 설정 (LowDB - JSON 파일 기반)
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const defaultData = {
  qr_codes: [],
  batch_jobs: []
};

const adapter = new JSONFile(path.join(dataDir, 'db.json'));
const db = new Low(adapter, defaultData);

// DB 초기화
await db.read();
db.data ||= defaultData;
await db.write();

// Multer 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

// 이름 필드 통합 헬퍼 (이름, name, firstName+lastName 모두 지원)
const getName = (data) => {
  if (data.이름) return data.이름;
  if (data.name) return data.name;
  if (data.firstName || data.lastName) {
    return `${data.firstName || ''} ${data.lastName || ''}`.trim();
  }
  return '';
};

// 전화번호 필드 통합 헬퍼
const getPhone = (data) => {
  return data.전화번호 || data.phone || data.휴대폰 || data.연락처 || '';
};

// QR 코드 타입별 데이터 포맷터 (최소 정보만으로도 생성 가능)
const formatters = {
  url: (data) => data.url || data.URL || data.주소 || '',
  text: (data) => data.text || data.텍스트 || data.내용 || '',
  vcard: (data) => {
    const name = getName(data);
    const phone = getPhone(data);
    // 이름에서 성/이름 분리 시도 (한글은 첫 글자가 성)
    let firstName = '', lastName = '';
    if (name) {
      if (data.firstName || data.lastName) {
        firstName = data.firstName || '';
        lastName = data.lastName || '';
      } else if (/^[가-힣]/.test(name)) {
        // 한글 이름: 첫 글자가 성
        lastName = name.charAt(0);
        firstName = name.slice(1);
      } else {
        // 영문 이름: 전체를 firstName으로
        firstName = name;
      }
    }

    const lines = ['BEGIN:VCARD', 'VERSION:3.0'];
    if (name) {
      lines.push(`N:${lastName};${firstName}`);
      lines.push(`FN:${name}`);
    }
    if (data.organization || data.회사 || data.조직) {
      lines.push(`ORG:${data.organization || data.회사 || data.조직}`);
    }
    if (data.title || data.직책 || data.직위) {
      lines.push(`TITLE:${data.title || data.직책 || data.직위}`);
    }
    if (phone) {
      lines.push(`TEL;TYPE=CELL:${phone}`);
    }
    if (data.workPhone || data.직장전화 || data.회사전화) {
      lines.push(`TEL;TYPE=WORK:${data.workPhone || data.직장전화 || data.회사전화}`);
    }
    if (data.email || data.이메일) {
      lines.push(`EMAIL:${data.email || data.이메일}`);
    }
    if (data.address || data.주소) {
      lines.push(`ADR;TYPE=WORK:;;${data.address || data.주소}`);
    }
    if (data.website || data.웹사이트 || data.홈페이지) {
      lines.push(`URL:${data.website || data.웹사이트 || data.홈페이지}`);
    }
    if (data.note || data.메모 || data.비고) {
      lines.push(`NOTE:${data.note || data.메모 || data.비고}`);
    }
    lines.push('END:VCARD');
    return lines.join('\n');
  },
  wifi: (data) => {
    const ssid = data.ssid || data.SSID || data.네트워크이름 || data.와이파이이름 || '';
    const password = data.password || data.비밀번호 || '';
    const encryption = data.encryption || data.암호화 || 'WPA';
    const hidden = (data.hidden || data.숨김) ? 'true' : 'false';
    return `WIFI:T:${encryption};S:${ssid};P:${password};H:${hidden};;`;
  },
  email: (data) => {
    const email = data.email || data.이메일 || '';
    const subject = data.subject || data.제목 || '';
    const body = data.body || data.본문 || data.내용 || '';
    return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  },
  sms: (data) => {
    const phone = getPhone(data);
    const message = data.message || data.메시지 || data.내용 || '';
    return `sms:${phone}${message ? `?body=${encodeURIComponent(message)}` : ''}`;
  },
  phone: (data) => `tel:${getPhone(data)}`,
  geo: (data) => {
    const lat = data.latitude || data.위도 || '';
    const lng = data.longitude || data.경도 || '';
    return `geo:${lat},${lng}`;
  },
  event: (data) => {
    const formatDate = (date) => {
      if (!date) return '';
      return new Date(date).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };
    const title = data.title || data.제목 || data.이벤트명 || '';
    const startDate = data.startDate || data.시작일 || data.시작 || '';
    const endDate = data.endDate || data.종료일 || data.종료 || startDate;
    const location = data.location || data.장소 || data.위치 || '';
    const description = data.description || data.설명 || data.내용 || '';

    const lines = ['BEGIN:VEVENT'];
    if (title) lines.push(`SUMMARY:${title}`);
    if (startDate) lines.push(`DTSTART:${formatDate(startDate)}`);
    if (endDate) lines.push(`DTEND:${formatDate(endDate)}`);
    if (location) lines.push(`LOCATION:${location}`);
    if (description) lines.push(`DESCRIPTION:${description}`);
    lines.push('END:VEVENT');
    return lines.join('\n');
  }
};

// QR 코드 생성 API
app.post('/api/qr/generate', async (req, res) => {
  try {
    const { type, data, name, options = {} } = req.body;

    const formatter = formatters[type];
    if (!formatter) {
      return res.status(400).json({ error: '지원하지 않는 QR 코드 타입입니다.' });
    }

    const content = formatter(data);
    const id = uuidv4();

    const qrOptions = {
      errorCorrectionLevel: options.errorCorrectionLevel || 'M',
      type: 'image/png',
      quality: 0.92,
      margin: options.margin || 2,
      color: {
        dark: options.darkColor || '#000000',
        light: options.lightColor || '#FFFFFF'
      },
      width: options.size || 300
    };

    const dataUrl = await QRCode.toDataURL(content, qrOptions);
    const createdAt = new Date().toISOString();

    // DB에 저장
    const qrCode = {
      id,
      type,
      name: name || `${type}-${Date.now()}`,
      content,
      data_url: dataUrl,
      created_at: createdAt
    };

    await db.read();
    db.data.qr_codes.push(qrCode);
    await db.write();

    res.json({
      id,
      type,
      name: qrCode.name,
      content,
      dataUrl,
      createdAt
    });
  } catch (error) {
    console.error('QR 생성 오류:', error);
    res.status(500).json({ error: 'QR 코드 생성 중 오류가 발생했습니다.' });
  }
});

// 대량 QR 생성 (엑셀/CSV 업로드)
app.post('/api/qr/batch', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '파일이 업로드되지 않았습니다.' });
    }

    const { type } = req.body;
    const options = req.body.options ? JSON.parse(req.body.options) : {};

    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet);

    if (rows.length === 0) {
      return res.status(400).json({ error: '파일에 데이터가 없습니다.' });
    }

    const batchId = uuidv4();
    const batchName = req.file.originalname;
    const createdAt = new Date().toISOString();

    const formatter = formatters[type];
    if (!formatter) {
      return res.status(400).json({ error: '지원하지 않는 QR 코드 타입입니다.' });
    }

    const qrOptions = {
      errorCorrectionLevel: options.errorCorrectionLevel || 'M',
      type: 'image/png',
      quality: 0.92,
      margin: options.margin || 2,
      color: {
        dark: options.darkColor || '#000000',
        light: options.lightColor || '#FFFFFF'
      },
      width: options.size || 300
    };

    const results = [];
    const qrCodes = [];

    for (const row of rows) {
      const id = uuidv4();
      const content = formatter(row);
      const dataUrl = await QRCode.toDataURL(content, qrOptions);
      // 통합된 이름 필드 지원
      const name = getName(row) || row.ssid || row.SSID || row.네트워크이름 ||
                   row.url || row.URL || row.제목 || `item-${id.slice(0, 8)}`;

      const qrCode = {
        id,
        type,
        name,
        content,
        data_url: dataUrl,
        created_at: createdAt,
        batch_id: batchId
      };

      qrCodes.push(qrCode);
      results.push({
        id,
        name,
        dataUrl
      });
    }

    // DB에 저장
    await db.read();
    db.data.qr_codes.push(...qrCodes);
    db.data.batch_jobs.push({
      id: batchId,
      name: batchName,
      total_count: results.length,
      created_at: createdAt
    });
    await db.write();

    // 업로드 파일 삭제
    fs.unlinkSync(req.file.path);

    res.json({
      batchId,
      batchName,
      totalCount: results.length,
      items: results
    });
  } catch (error) {
    console.error('대량 생성 오류:', error);
    res.status(500).json({ error: '대량 QR 코드 생성 중 오류가 발생했습니다.' });
  }
});

// QR 코드 히스토리 조회
app.get('/api/qr/history', async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const offset = (page - 1) * limit;

    await db.read();
    let items = [...db.data.qr_codes];

    if (type) {
      items = items.filter(qr => qr.type === type);
    }

    // 최신순 정렬
    items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const total = items.length;
    const paginatedItems = items.slice(offset, offset + parseInt(limit));

    res.json({
      items: paginatedItems,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('히스토리 조회 오류:', error);
    res.status(500).json({ error: '히스토리 조회 중 오류가 발생했습니다.' });
  }
});

// 단일 QR 코드 조회
app.get('/api/qr/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.read();
    const qr = db.data.qr_codes.find(q => q.id === id);

    if (!qr) {
      return res.status(404).json({ error: 'QR 코드를 찾을 수 없습니다.' });
    }

    res.json(qr);
  } catch (error) {
    console.error('QR 조회 오류:', error);
    res.status(500).json({ error: 'QR 코드 조회 중 오류가 발생했습니다.' });
  }
});

// QR 코드 삭제
app.delete('/api/qr/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.read();

    const index = db.data.qr_codes.findIndex(q => q.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'QR 코드를 찾을 수 없습니다.' });
    }

    db.data.qr_codes.splice(index, 1);
    await db.write();

    res.json({ success: true });
  } catch (error) {
    console.error('삭제 오류:', error);
    res.status(500).json({ error: 'QR 코드 삭제 중 오류가 발생했습니다.' });
  }
});

// 배치 작업 목록 조회
app.get('/api/batches', async (req, res) => {
  try {
    await db.read();
    const batches = [...db.data.batch_jobs].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
    res.json(batches);
  } catch (error) {
    console.error('배치 목록 조회 오류:', error);
    res.status(500).json({ error: '배치 목록 조회 중 오류가 발생했습니다.' });
  }
});

// 배치 작업 상세 조회
app.get('/api/batches/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.read();

    const batch = db.data.batch_jobs.find(b => b.id === id);
    if (!batch) {
      return res.status(404).json({ error: '배치 작업을 찾을 수 없습니다.' });
    }

    const items = db.data.qr_codes.filter(qr => qr.batch_id === id);
    res.json({ ...batch, items });
  } catch (error) {
    console.error('배치 상세 조회 오류:', error);
    res.status(500).json({ error: '배치 상세 조회 중 오류가 발생했습니다.' });
  }
});

// 샘플 템플릿 다운로드 (한글 필드명, 최소 정보만으로도 생성 가능)
app.get('/api/templates/:type', (req, res) => {
  const { type } = req.params;

  // 통합 템플릿 - 한글 필드명 지원, 필수 필드만 채우면 됨
  const templates = {
    vcard: [
      { 이름: '홍길동', 전화번호: '010-1234-5678', 이메일: '', 회사: '', 직책: '', 주소: '', 메모: '' },
      { 이름: '김철수', 전화번호: '010-9876-5432', 이메일: 'kim@example.com', 회사: '(주)회사', 직책: '대리', 주소: '', 메모: '' },
      { 이름: '이영희', 전화번호: '010-5555-1234', 이메일: '', 회사: '', 직책: '', 주소: '', 메모: '친구' }
    ],
    wifi: [
      { 네트워크이름: 'MyWiFi', 비밀번호: 'password123', 암호화: 'WPA' },
      { 네트워크이름: 'GuestWiFi', 비밀번호: 'guest2024', 암호화: 'WPA2' },
      { 네트워크이름: 'Office_5G', 비밀번호: 'office#1234', 암호화: 'WPA' }
    ],
    url: [
      { 이름: '네이버', 주소: 'https://www.naver.com' },
      { 이름: '구글', 주소: 'https://www.google.com' },
      { 이름: '회사 홈페이지', 주소: 'https://company.co.kr' }
    ],
    email: [
      { 이름: '고객문의', 이메일: 'contact@example.com', 제목: '문의합니다', 내용: '' },
      { 이름: '기술지원', 이메일: 'support@example.com', 제목: '기술지원 요청', 내용: '' }
    ],
    phone: [
      { 이름: '대표전화', 전화번호: '02-1234-5678' },
      { 이름: '고객센터', 전화번호: '1588-1234' }
    ],
    sms: [
      { 이름: '예약문의', 전화번호: '010-1234-5678', 내용: '예약 문의드립니다.' },
      { 이름: '주문확인', 전화번호: '010-9876-5432', 내용: '' }
    ]
  };

  const data = templates[type];
  if (!data) {
    return res.status(400).json({ error: '지원하지 않는 템플릿 타입입니다. (vcard, wifi, url, email, phone, sms 지원)' });
  }

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(data);

  // 컬럼 너비 자동 조정
  const colWidths = Object.keys(data[0]).map(key => ({ wch: Math.max(key.length * 2, 15) }));
  worksheet['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(workbook, worksheet, '데이터');

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Disposition', `attachment; filename=qr_${type}_template.xlsx`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
});

// 통계 API
app.get('/api/stats', async (req, res) => {
  try {
    await db.read();

    const qrCodes = db.data.qr_codes;
    const totalQRs = qrCodes.length;

    // 타입별 통계
    const typeStats = {};
    qrCodes.forEach(qr => {
      typeStats[qr.type] = (typeStats[qr.type] || 0) + 1;
    });

    const typeStatsArray = Object.entries(typeStats).map(([type, count]) => ({
      type,
      count
    }));

    // 최근 QR코드
    const recentQRs = [...qrCodes]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);

    const totalBatches = db.data.batch_jobs.length;

    res.json({
      totalQRs,
      totalBatches,
      typeStats: typeStatsArray,
      recentQRs
    });
  } catch (error) {
    console.error('통계 조회 오류:', error);
    res.status(500).json({ error: '통계 조회 중 오류가 발생했습니다.' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 QR 코드 생성기 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});
