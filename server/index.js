import express from 'express';
import cors from 'cors';
import multer from 'multer';
import QRCode from 'qrcode';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Database 설정
const dbPath = path.join(__dirname, '../data/qrcodes.db');
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// 테이블 생성
db.exec(`
  CREATE TABLE IF NOT EXISTS qr_codes (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    name TEXT,
    content TEXT NOT NULL,
    data_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS batch_jobs (
    id TEXT PRIMARY KEY,
    name TEXT,
    total_count INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS batch_items (
    id TEXT PRIMARY KEY,
    batch_id TEXT,
    qr_id TEXT,
    FOREIGN KEY (batch_id) REFERENCES batch_jobs(id),
    FOREIGN KEY (qr_id) REFERENCES qr_codes(id)
  );
`);

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
  // 일반 URL
  url: (data) => data.url,

  // 일반 텍스트
  text: (data) => data.text,

  // vCard (연락처)
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

  // WiFi
  wifi: (data) => {
    const encryption = data.encryption || 'WPA';
    const hidden = data.hidden ? 'true' : 'false';
    return `WIFI:T:${encryption};S:${data.ssid};P:${data.password};H:${hidden};;`;
  },

  // 이메일
  email: (data) => {
    return `mailto:${data.email}?subject=${encodeURIComponent(data.subject || '')}&body=${encodeURIComponent(data.body || '')}`;
  },

  // SMS
  sms: (data) => {
    return `sms:${data.phone}${data.message ? `?body=${encodeURIComponent(data.message)}` : ''}`;
  },

  // 전화
  phone: (data) => `tel:${data.phone}`,

  // 지도 위치
  geo: (data) => `geo:${data.latitude},${data.longitude}`,

  // 이벤트/캘린더
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

    // DB에 저장
    const stmt = db.prepare(`
      INSERT INTO qr_codes (id, type, name, content, data_url, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `);
    stmt.run(id, type, name || `${type}-${Date.now()}`, content, dataUrl);

    res.json({
      id,
      type,
      name,
      content,
      dataUrl,
      createdAt: new Date().toISOString()
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

    // 배치 작업 저장
    db.prepare(`
      INSERT INTO batch_jobs (id, name, total_count, created_at)
      VALUES (?, ?, ?, datetime('now'))
    `).run(batchId, batchName, rows.length);

    const results = [];
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

    for (const row of rows) {
      const id = uuidv4();
      const content = formatter(row);
      const dataUrl = await QRCode.toDataURL(content, qrOptions);
      const name = row.name || row.이름 || row.ssid || row.url || `item-${id.slice(0, 8)}`;

      // DB에 저장
      db.prepare(`
        INSERT INTO qr_codes (id, type, name, content, data_url, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `).run(id, type, name, content, dataUrl);

      // 배치 아이템 저장
      db.prepare(`
        INSERT INTO batch_items (id, batch_id, qr_id)
        VALUES (?, ?, ?)
      `).run(uuidv4(), batchId, id);

      results.push({
        id,
        name,
        dataUrl
      });
    }

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
app.get('/api/qr/history', (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM qr_codes';
    let countQuery = 'SELECT COUNT(*) as total FROM qr_codes';
    const params = [];

    if (type) {
      query += ' WHERE type = ?';
      countQuery += ' WHERE type = ?';
      params.push(type);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';

    const items = db.prepare(query).all(...params, parseInt(limit), offset);
    const { total } = db.prepare(countQuery).get(...params);

    res.json({
      items,
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
app.get('/api/qr/:id', (req, res) => {
  try {
    const { id } = req.params;
    const qr = db.prepare('SELECT * FROM qr_codes WHERE id = ?').get(id);

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
app.delete('/api/qr/:id', (req, res) => {
  try {
    const { id } = req.params;

    // 배치 아이템에서도 삭제
    db.prepare('DELETE FROM batch_items WHERE qr_id = ?').run(id);
    const result = db.prepare('DELETE FROM qr_codes WHERE id = ?').run(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'QR 코드를 찾을 수 없습니다.' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('삭제 오류:', error);
    res.status(500).json({ error: 'QR 코드 삭제 중 오류가 발생했습니다.' });
  }
});

// 배치 작업 목록 조회
app.get('/api/batches', (req, res) => {
  try {
    const batches = db.prepare(`
      SELECT * FROM batch_jobs ORDER BY created_at DESC
    `).all();

    res.json(batches);
  } catch (error) {
    console.error('배치 목록 조회 오류:', error);
    res.status(500).json({ error: '배치 목록 조회 중 오류가 발생했습니다.' });
  }
});

// 배치 작업 상세 조회
app.get('/api/batches/:id', (req, res) => {
  try {
    const { id } = req.params;

    const batch = db.prepare('SELECT * FROM batch_jobs WHERE id = ?').get(id);
    if (!batch) {
      return res.status(404).json({ error: '배치 작업을 찾을 수 없습니다.' });
    }

    const items = db.prepare(`
      SELECT qr.* FROM qr_codes qr
      JOIN batch_items bi ON bi.qr_id = qr.id
      WHERE bi.batch_id = ?
    `).all(id);

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
app.get('/api/stats', (req, res) => {
  try {
    const totalQRs = db.prepare('SELECT COUNT(*) as count FROM qr_codes').get();
    const typeStats = db.prepare(`
      SELECT type, COUNT(*) as count FROM qr_codes GROUP BY type
    `).all();
    const recentQRs = db.prepare(`
      SELECT * FROM qr_codes ORDER BY created_at DESC LIMIT 5
    `).all();
    const totalBatches = db.prepare('SELECT COUNT(*) as count FROM batch_jobs').get();

    res.json({
      totalQRs: totalQRs.count,
      totalBatches: totalBatches.count,
      typeStats,
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
