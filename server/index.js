import express from 'express';
import cors from 'cors';
import multer from 'multer';
import QRCode from 'qrcode';
import { read, utils, write } from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'qrcode-generator-secret-key-2024';

// 카카오 OAuth 설정 (환경변수 또는 기본값)
const KAKAO_CLIENT_ID = process.env.KAKAO_CLIENT_ID || 'YOUR_KAKAO_CLIENT_ID';
const KAKAO_REDIRECT_URI = process.env.KAKAO_REDIRECT_URI || 'http://localhost:5173/auth/kakao/callback';

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
  users: [],
  qr_codes: [],
  batch_jobs: []
};

const adapter = new JSONFile(path.join(dataDir, 'db.json'));
const db = new Low(adapter, defaultData);

// DB 초기화
await db.read();
db.data ||= defaultData;
// users 배열이 없으면 추가
if (!db.data.users) {
  db.data.users = [];
}
await db.write();

// 기본 관리자 계정 생성 (없으면)
await db.read();
const adminExists = db.data.users.find(u => u.role === 'admin');
if (!adminExists) {
  const hashedPassword = await bcrypt.hash('admin1234', 10);
  db.data.users.push({
    id: uuidv4(),
    email: 'admin@qrcode.com',
    password: hashedPassword,
    name: '관리자',
    role: 'admin',
    created_at: new Date().toISOString()
  });
  await db.write();
  console.log('기본 관리자 계정 생성: admin@qrcode.com / admin1234');
}

// 인증 미들웨어
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '로그인이 필요합니다.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    await db.read();
    const user = db.data.users.find(u => u.id === decoded.userId);
    if (!user) {
      return res.status(401).json({ error: '유효하지 않은 사용자입니다.' });
    }
    req.user = { id: user.id, email: user.email, name: user.name, role: user.role };
    next();
  } catch (error) {
    return res.status(401).json({ error: '토큰이 만료되었거나 유효하지 않습니다.' });
  }
};

// 관리자 권한 확인 미들웨어
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
  }
  next();
};

// 선택적 인증 미들웨어 (로그인 안해도 됨, 했으면 사용자 정보 추가)
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      await db.read();
      const user = db.data.users.find(u => u.id === decoded.userId);
      if (user) {
        req.user = { id: user.id, email: user.email, name: user.name, role: user.role };
      }
    } catch (error) {
      // 토큰이 유효하지 않아도 계속 진행
    }
  }
  next();
};

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

    // 이름과 전화번호 모두 없으면 빈 문자열 반환
    if (!name && !phone) {
      return '';
    }

    // 접미사 처리 (이름 뒤에 추가)
    const suffix = data.접미사 || data.suffix || '';
    const displayName = suffix ? `${name} (${suffix})` : name;

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
      lines.push(`FN:${displayName}`);
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
    // 그룹/카테고리 (삼성 연락처 그룹 지정)
    const group = data.그룹 || data.group || data.category || data.카테고리 || '';
    if (group) {
      // 표준 vCard CATEGORIES
      lines.push(`CATEGORIES:${group}`);
      // 안드로이드/삼성 전용 그룹 필드
      lines.push(`X-ANDROID-CUSTOM:vnd.android.cursor.item/group_membership;${group}`);
    }
    lines.push('END:VCARD');
    return lines.join('\n');
  },
  wifi: (data) => {
    const ssid = data.ssid || data.SSID || data.네트워크이름 || data.와이파이이름 || '';
    if (!ssid) return '';
    const password = data.password || data.비밀번호 || '';
    const encryption = data.encryption || data.암호화 || 'WPA';
    const hidden = (data.hidden || data.숨김) ? 'true' : 'false';
    return `WIFI:T:${encryption};S:${ssid};P:${password};H:${hidden};;`;
  },
  email: (data) => {
    const email = data.email || data.이메일 || '';
    if (!email) return '';
    const subject = data.subject || data.제목 || '';
    const body = data.body || data.본문 || data.내용 || '';
    return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  },
  sms: (data) => {
    const phone = getPhone(data);
    if (!phone) return '';
    const message = data.message || data.메시지 || data.내용 || '';
    return `sms:${phone}${message ? `?body=${encodeURIComponent(message)}` : ''}`;
  },
  phone: (data) => {
    const phone = getPhone(data);
    if (!phone) return '';
    return `tel:${phone}`;
  },
  geo: (data) => {
    const lat = data.latitude || data.위도 || '';
    const lng = data.longitude || data.경도 || '';
    if (!lat || !lng) return '';
    return `geo:${lat},${lng}`;
  },
  event: (data) => {
    const title = data.title || data.제목 || data.이벤트명 || '';
    const startDate = data.startDate || data.시작일 || data.시작 || '';
    // 제목과 시작일이 없으면 빈 문자열 반환
    if (!title || !startDate) return '';

    const formatDate = (date) => {
      if (!date) return '';
      try {
        return new Date(date).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      } catch {
        return '';
      }
    };
    const endDate = data.endDate || data.종료일 || data.종료 || startDate;
    const location = data.location || data.장소 || data.위치 || '';
    const description = data.description || data.설명 || data.내용 || '';

    const lines = ['BEGIN:VEVENT'];
    lines.push(`SUMMARY:${title}`);
    lines.push(`DTSTART:${formatDate(startDate)}`);
    if (endDate) lines.push(`DTEND:${formatDate(endDate)}`);
    if (location) lines.push(`LOCATION:${location}`);
    if (description) lines.push(`DESCRIPTION:${description}`);
    lines.push('END:VEVENT');
    return lines.join('\n');
  }
};

// ========== 인증 API ==========

// 회원가입
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: '이메일, 비밀번호, 이름을 모두 입력해주세요.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: '비밀번호는 6자 이상이어야 합니다.' });
    }

    await db.read();
    const existingUser = db.data.users.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({ error: '이미 등록된 이메일입니다.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = {
      id: uuidv4(),
      email,
      password: hashedPassword,
      name,
      role: 'user',
      created_at: new Date().toISOString()
    };

    db.data.users.push(user);
    await db.write();

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: '회원가입이 완료되었습니다.',
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    });
  } catch (error) {
    console.error('회원가입 오류:', error);
    res.status(500).json({ error: '회원가입 중 오류가 발생했습니다.' });
  }
});

// 로그인
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: '이메일과 비밀번호를 입력해주세요.' });
    }

    await db.read();
    const user = db.data.users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: '로그인 성공',
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    });
  } catch (error) {
    console.error('로그인 오류:', error);
    res.status(500).json({ error: '로그인 중 오류가 발생했습니다.' });
  }
});

// 현재 사용자 정보 조회
app.get('/api/auth/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// ========== 소셜 로그인 API ==========

// 카카오 로그인 URL 반환
app.get('/api/auth/kakao', (req, res) => {
  const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_CLIENT_ID}&redirect_uri=${encodeURIComponent(KAKAO_REDIRECT_URI)}&response_type=code`;
  res.json({ url: kakaoAuthUrl });
});

// 카카오 콜백 처리 (인가 코드로 토큰 교환)
app.post('/api/auth/kakao/callback', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: '인가 코드가 필요합니다.' });
    }

    // 1. 인가 코드로 액세스 토큰 받기
    const tokenResponse = await axios.post(
      'https://kauth.kakao.com/oauth/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: KAKAO_CLIENT_ID,
        redirect_uri: KAKAO_REDIRECT_URI,
        code: code
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const { access_token } = tokenResponse.data;

    // 2. 액세스 토큰으로 사용자 정보 받기
    const userResponse = await axios.get('https://kapi.kakao.com/v2/user/me', {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    });

    const kakaoUser = userResponse.data;
    const kakaoId = kakaoUser.id.toString();
    const kakaoEmail = kakaoUser.kakao_account?.email || `kakao_${kakaoId}@kakao.local`;
    const kakaoName = kakaoUser.properties?.nickname || kakaoUser.kakao_account?.profile?.nickname || '카카오 사용자';

    // 3. DB에서 사용자 찾기 또는 생성
    await db.read();
    let user = db.data.users.find(u => u.kakao_id === kakaoId || u.email === kakaoEmail);

    if (!user) {
      // 새 사용자 생성
      user = {
        id: uuidv4(),
        email: kakaoEmail,
        name: kakaoName,
        role: 'user',
        kakao_id: kakaoId,
        provider: 'kakao',
        created_at: new Date().toISOString()
      };
      db.data.users.push(user);
      await db.write();
    } else if (!user.kakao_id) {
      // 기존 이메일 사용자에 카카오 연동
      user.kakao_id = kakaoId;
      user.provider = user.provider ? `${user.provider},kakao` : 'kakao';
      await db.write();
    }

    // 4. JWT 토큰 발급
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: '카카오 로그인 성공',
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    });
  } catch (error) {
    console.error('카카오 로그인 오류:', error.response?.data || error.message);
    res.status(500).json({ error: '카카오 로그인 중 오류가 발생했습니다.' });
  }
});

// ========== QR 코드 API ==========

// QR 코드 생성 API (로그인 필수)
app.post('/api/qr/generate', authenticate, async (req, res) => {
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

    // DB에 저장 (사용자 ID 포함)
    const qrCode = {
      id,
      type,
      name: name || `${type}-${Date.now()}`,
      content,
      data_url: dataUrl,
      created_at: createdAt,
      user_id: req.user.id
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

// 대량 QR 생성 (엑셀/CSV 업로드, 로그인 필수)
app.post('/api/qr/batch', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '파일이 업로드되지 않았습니다.' });
    }

    const { type } = req.body;
    const options = req.body.options ? JSON.parse(req.body.options) : {};

    const fileBuffer = fs.readFileSync(req.file.path);
    const workbook = read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    // 빈 셀도 빈 문자열로 처리
    const rows = utils.sheet_to_json(sheet, { defval: '' });

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

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const id = uuidv4();

      try {
        const content = formatter(row);

        // 내용이 비어있거나 유효하지 않으면 건너뛰기
        if (!content || content.trim() === '' || content === 'tel:' || content === 'sms:' || content === 'mailto:?subject=&body=' || content === 'geo:,') {
          console.log(`Row ${i + 1} skipped: empty content`);
          continue;
        }

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
          batch_id: batchId,
          user_id: req.user.id
        };

        qrCodes.push(qrCode);
        results.push({
          id,
          name,
          dataUrl
        });
      } catch (rowError) {
        console.error(`Row ${i + 1} error:`, rowError.message);
        // 개별 행 오류는 건너뛰고 계속 진행
        continue;
      }
    }

    // 업로드 파일 삭제
    try {
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    } catch (e) {
      console.error('파일 삭제 오류:', e.message);
    }

    // 생성된 QR이 없으면 오류
    if (results.length === 0) {
      return res.status(400).json({
        error: '유효한 데이터가 없어 QR코드를 생성할 수 없습니다. 필수 필드를 확인해주세요.',
        hint: type === 'vcard' ? '이름 또는 전화번호가 필요합니다' :
              type === 'wifi' ? '네트워크이름이 필요합니다' :
              type === 'url' ? '주소(URL)가 필요합니다' :
              type === 'email' ? '이메일 주소가 필요합니다' :
              type === 'phone' || type === 'sms' ? '전화번호가 필요합니다' : '필수 필드를 확인하세요'
      });
    }

    // DB에 저장
    await db.read();
    db.data.qr_codes.push(...qrCodes);
    db.data.batch_jobs.push({
      id: batchId,
      name: batchName,
      total_count: results.length,
      created_at: createdAt,
      user_id: req.user.id
    });
    await db.write();

    res.json({
      batchId,
      batchName,
      totalCount: results.length,
      items: results
    });
  } catch (error) {
    console.error('대량 생성 오류:', error);
    // 오류 시 업로드 파일 정리
    try {
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    } catch (e) { /* ignore */ }
    res.status(500).json({ error: `대량 QR 코드 생성 중 오류: ${error.message}` });
  }
});

// QR 코드 히스토리 조회 (로그인 필수, 본인 것만 조회)
app.get('/api/qr/history', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const offset = (page - 1) * limit;

    await db.read();
    // 관리자는 전체 조회, 일반 사용자는 본인 것만
    let items = req.user.role === 'admin'
      ? [...db.data.qr_codes]
      : db.data.qr_codes.filter(qr => qr.user_id === req.user.id);

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

// 단일 QR 코드 조회 (로그인 필수, 본인 것만)
app.get('/api/qr/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    await db.read();
    const qr = db.data.qr_codes.find(q => q.id === id);

    if (!qr) {
      return res.status(404).json({ error: 'QR 코드를 찾을 수 없습니다.' });
    }

    // 본인 것이거나 관리자만 조회 가능
    if (qr.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: '접근 권한이 없습니다.' });
    }

    res.json(qr);
  } catch (error) {
    console.error('QR 조회 오류:', error);
    res.status(500).json({ error: 'QR 코드 조회 중 오류가 발생했습니다.' });
  }
});

// QR 코드 삭제 (로그인 필수, 본인 것만)
app.delete('/api/qr/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    await db.read();

    const index = db.data.qr_codes.findIndex(q => q.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'QR 코드를 찾을 수 없습니다.' });
    }

    const qr = db.data.qr_codes[index];
    // 본인 것이거나 관리자만 삭제 가능
    if (qr.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: '삭제 권한이 없습니다.' });
    }

    db.data.qr_codes.splice(index, 1);
    await db.write();

    res.json({ success: true });
  } catch (error) {
    console.error('삭제 오류:', error);
    res.status(500).json({ error: 'QR 코드 삭제 중 오류가 발생했습니다.' });
  }
});

// 배치 작업 목록 조회 (로그인 필수, 본인 것만)
app.get('/api/batches', authenticate, async (req, res) => {
  try {
    await db.read();
    // 관리자는 전체, 일반 사용자는 본인 것만
    let batches = req.user.role === 'admin'
      ? [...db.data.batch_jobs]
      : db.data.batch_jobs.filter(b => b.user_id === req.user.id);

    batches.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json(batches);
  } catch (error) {
    console.error('배치 목록 조회 오류:', error);
    res.status(500).json({ error: '배치 목록 조회 중 오류가 발생했습니다.' });
  }
});

// 배치 작업 상세 조회 (로그인 필수, 본인 것만)
app.get('/api/batches/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    await db.read();

    const batch = db.data.batch_jobs.find(b => b.id === id);
    if (!batch) {
      return res.status(404).json({ error: '배치 작업을 찾을 수 없습니다.' });
    }

    // 본인 것이거나 관리자만 조회 가능
    if (batch.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: '접근 권한이 없습니다.' });
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
      { 이름: '홍길동', 전화번호: '010-1234-5678', 이메일: '', 회사: '플랜엑스', 직책: '대표', 주소: '', 메모: 'VIP고객', 접미사: '플랜엑스 대표' },
      { 이름: '김철수', 전화번호: '010-9876-5432', 이메일: 'kim@example.com', 회사: '(주)테크솔루션', 직책: '과장', 주소: '', 메모: '협력업체', 접미사: '' },
      { 이름: '이영희', 전화번호: '010-5555-1234', 이메일: '', 회사: '', 직책: '', 주소: '', 메모: '고객', 접미사: '' }
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

  const workbook = utils.book_new();
  const worksheet = utils.json_to_sheet(data);

  // 컬럼 너비 자동 조정
  const colWidths = Object.keys(data[0]).map(key => ({ wch: Math.max(key.length * 2, 15) }));
  worksheet['!cols'] = colWidths;

  utils.book_append_sheet(workbook, worksheet, '데이터');

  const buffer = write(workbook, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Disposition', `attachment; filename=qr_${type}_template.xlsx`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
});

// 통계 API (로그인 필수, 본인 것만)
app.get('/api/stats', authenticate, async (req, res) => {
  try {
    await db.read();

    // 관리자는 전체, 일반 사용자는 본인 것만
    const qrCodes = req.user.role === 'admin'
      ? db.data.qr_codes
      : db.data.qr_codes.filter(qr => qr.user_id === req.user.id);

    const batchJobs = req.user.role === 'admin'
      ? db.data.batch_jobs
      : db.data.batch_jobs.filter(b => b.user_id === req.user.id);

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

    const totalBatches = batchJobs.length;

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

// ========== 관리자 전용 API ==========

// 전체 사용자 목록 조회 (관리자 전용)
app.get('/api/admin/users', authenticate, requireAdmin, async (req, res) => {
  try {
    await db.read();
    const users = db.data.users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      created_at: u.created_at
    }));
    res.json(users);
  } catch (error) {
    console.error('사용자 목록 조회 오류:', error);
    res.status(500).json({ error: '사용자 목록 조회 중 오류가 발생했습니다.' });
  }
});

// 사용자 역할 변경 (관리자 전용)
app.patch('/api/admin/users/:id/role', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: '유효하지 않은 역할입니다.' });
    }

    await db.read();
    const user = db.data.users.find(u => u.id === id);
    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    user.role = role;
    await db.write();

    res.json({ message: '역할이 변경되었습니다.', user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (error) {
    console.error('역할 변경 오류:', error);
    res.status(500).json({ error: '역할 변경 중 오류가 발생했습니다.' });
  }
});

// 사용자 삭제 (관리자 전용)
app.delete('/api/admin/users/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ error: '자기 자신은 삭제할 수 없습니다.' });
    }

    await db.read();
    const index = db.data.users.findIndex(u => u.id === id);
    if (index === -1) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    // 사용자의 QR코드도 함께 삭제
    db.data.qr_codes = db.data.qr_codes.filter(qr => qr.user_id !== id);
    db.data.batch_jobs = db.data.batch_jobs.filter(b => b.user_id !== id);
    db.data.users.splice(index, 1);
    await db.write();

    res.json({ success: true, message: '사용자가 삭제되었습니다.' });
  } catch (error) {
    console.error('사용자 삭제 오류:', error);
    res.status(500).json({ error: '사용자 삭제 중 오류가 발생했습니다.' });
  }
});

// 전체 통계 (관리자 전용)
app.get('/api/admin/stats', authenticate, requireAdmin, async (req, res) => {
  try {
    await db.read();

    const totalUsers = db.data.users.length;
    const totalQRs = db.data.qr_codes.length;
    const totalBatches = db.data.batch_jobs.length;

    // 사용자별 QR 생성 통계
    const userStats = {};
    db.data.qr_codes.forEach(qr => {
      userStats[qr.user_id] = (userStats[qr.user_id] || 0) + 1;
    });

    const userStatsArray = Object.entries(userStats).map(([userId, count]) => {
      const user = db.data.users.find(u => u.id === userId);
      return {
        userId,
        userName: user ? user.name : '알 수 없음',
        userEmail: user ? user.email : '알 수 없음',
        count
      };
    }).sort((a, b) => b.count - a.count);

    res.json({
      totalUsers,
      totalQRs,
      totalBatches,
      userStats: userStatsArray
    });
  } catch (error) {
    console.error('관리자 통계 조회 오류:', error);
    res.status(500).json({ error: '통계 조회 중 오류가 발생했습니다.' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 QR 코드 생성기 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});
