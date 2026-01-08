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

// QR 코드 타입별 데이터 포맷터
const formatters = {
  url: (data) => data.url,
  text: (data) => data.text,
  vcard: (data) => {
    return `BEGIN:VCARD
VERSION:3.0
N:${data.lastName || ''};${data.firstName || ''}
FN:${data.firstName || ''} ${data.lastName || ''}
ORG:${data.organization || ''}
TITLE:${data.title || ''}
TEL;TYPE=CELL:${data.phone || ''}
TEL;TYPE=WORK:${data.workPhone || ''}
EMAIL:${data.email || ''}
ADR;TYPE=WORK:;;${data.address || ''}
URL:${data.website || ''}
NOTE:${data.note || ''}
END:VCARD`;
  },
  wifi: (data) => {
    const encryption = data.encryption || 'WPA';
    const hidden = data.hidden ? 'true' : 'false';
    return `WIFI:T:${encryption};S:${data.ssid};P:${data.password};H:${hidden};;`;
  },
  email: (data) => {
    return `mailto:${data.email}?subject=${encodeURIComponent(data.subject || '')}&body=${encodeURIComponent(data.body || '')}`;
  },
  sms: (data) => {
    return `sms:${data.phone}${data.message ? `?body=${encodeURIComponent(data.message)}` : ''}`;
  },
  phone: (data) => `tel:${data.phone}`,
  geo: (data) => `geo:${data.latitude},${data.longitude}`,
  event: (data) => {
    const formatDate = (date) => {
      return new Date(date).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };
    return `BEGIN:VEVENT
SUMMARY:${data.title || ''}
DTSTART:${formatDate(data.startDate)}
DTEND:${formatDate(data.endDate)}
LOCATION:${data.location || ''}
DESCRIPTION:${data.description || ''}
END:VEVENT`;
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
      const name = row.name || row.이름 || row.ssid || row.url || `item-${id.slice(0, 8)}`;

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

// 샘플 템플릿 다운로드
app.get('/api/templates/:type', (req, res) => {
  const { type } = req.params;

  const templates = {
    vcard: [
      { firstName: '홍', lastName: '길동', phone: '010-1234-5678', email: 'hong@example.com', organization: '회사명', title: '직책' },
      { firstName: '김', lastName: '철수', phone: '010-9876-5432', email: 'kim@example.com', organization: '회사명2', title: '대리' }
    ],
    wifi: [
      { ssid: 'MyWiFi', password: 'password123', encryption: 'WPA' },
      { ssid: 'GuestWiFi', password: 'guest123', encryption: 'WPA2' }
    ],
    url: [
      { name: '네이버', url: 'https://www.naver.com' },
      { name: '구글', url: 'https://www.google.com' }
    ],
    email: [
      { name: '문의', email: 'contact@example.com', subject: '문의합니다', body: '안녕하세요' }
    ]
  };

  const data = templates[type];
  if (!data) {
    return res.status(400).json({ error: '지원하지 않는 템플릿 타입입니다.' });
  }

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Disposition', `attachment; filename=${type}_template.xlsx`);
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
