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
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'qrcode-generator-secret-key-2024';

// 카카오 OAuth 설정 (환경변수 또는 기본값 - 대소문자 모두 지원)
const KAKAO_CLIENT_ID = process.env.KAKAO_CLIENT_ID || process.env.kakao_client_id || 'YOUR_KAKAO_CLIENT_ID';
const KAKAO_CLIENT_SECRET = process.env.KAKAO_CLIENT_SECRET || process.env.kakao_client_secret || '';
const KAKAO_REDIRECT_URI = process.env.KAKAO_REDIRECT_URI || process.env.kakao_redirect_uri || 'https://30daysliving.com/auth/kakao/callback';

// 토스페이먼츠 설정
const TOSS_CLIENT_KEY = process.env.TOSS_CLIENT_KEY || process.env.toss_client_key || '';
const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY || process.env.toss_secret_key || '';
const APP_URL = process.env.APP_URL || 'https://qrcode-production-c33d.up.railway.app';

// 요금제 정의
const PLANS = {
  free: {
    name: '무료',
    price: 0,
    monthlyLimit: 10,
    maxSize: 300,
    features: ['basic_qr', 'basic_colors']
  },
  basic: {
    name: '베이직',
    monthlyPrice: 4900,
    yearlyPrice: 49000,
    monthlyLimit: 100,
    maxSize: 1000,
    features: ['basic_qr', 'basic_colors', 'high_resolution', 'color_custom']
  },
  pro: {
    name: '프로',
    monthlyPrice: 9900,
    yearlyPrice: 99000,
    monthlyLimit: -1, // 무제한
    maxSize: 2000,
    features: ['basic_qr', 'basic_colors', 'high_resolution', 'color_custom', 'logo_insert', 'batch_upload', 'analytics']
  },
  business: {
    name: '비즈니스',
    monthlyPrice: 29900,
    yearlyPrice: 299000,
    monthlyLimit: -1,
    maxSize: 4000,
    features: ['basic_qr', 'basic_colors', 'high_resolution', 'color_custom', 'logo_insert', 'batch_upload', 'analytics', 'dynamic_qr', 'api_access', 'priority_support']
  }
};

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
  batch_jobs: [],
  subscriptions: [],
  payments: [],
  dynamic_qr: [],
  qr_scans: []
};

const adapter = new JSONFile(path.join(dataDir, 'db.json'));
const db = new Low(adapter, defaultData);

// DB 초기화
await db.read();
db.data ||= defaultData;
// 필요한 배열 초기화
if (!db.data.users) db.data.users = [];
if (!db.data.subscriptions) db.data.subscriptions = [];
if (!db.data.payments) db.data.payments = [];
if (!db.data.dynamic_qr) db.data.dynamic_qr = [];
if (!db.data.qr_scans) db.data.qr_scans = [];
await db.write();

// 사용자 구독 정보 조회 헬퍼
const getUserSubscription = async (userId) => {
  await db.read();
  const subscription = db.data.subscriptions.find(s =>
    s.user_id === userId &&
    s.status === 'active' &&
    new Date(s.expires_at) > new Date()
  );
  return subscription ? subscription.plan : 'free';
};

// 사용자의 현재 월 QR 생성 수 조회
const getMonthlyQRCount = async (userId) => {
  await db.read();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return db.data.qr_codes.filter(qr =>
    qr.user_id === userId &&
    new Date(qr.created_at) >= startOfMonth
  ).length;
};

// 기능 접근 권한 확인
const hasFeature = (plan, feature) => {
  return PLANS[plan]?.features?.includes(feature) || false;
};

// 프리미엄 기능 확인 미들웨어
const checkPremiumFeature = (feature) => async (req, res, next) => {
  const plan = await getUserSubscription(req.user.id);
  if (!hasFeature(plan, feature)) {
    return res.status(403).json({
      error: '이 기능은 유료 플랜에서만 사용할 수 있습니다.',
      requiredPlan: feature === 'dynamic_qr' || feature === 'api_access' ? 'business' :
                    feature === 'logo_insert' || feature === 'analytics' ? 'pro' : 'basic',
      currentPlan: plan
    });
  }
  req.userPlan = plan;
  next();
};

// 기본 관리자 계정 생성 (없으면)
await db.read();
const adminExists = db.data.users.find(u => u.role === 'admin');
if (!adminExists) {
  const hashedPassword = await bcrypt.hash('gudtjr2', 10);
  db.data.users.push({
    id: uuidv4(),
    email: 'mymiryu@naver.com',
    password: hashedPassword,
    name: '관리자',
    role: 'admin',
    created_at: new Date().toISOString()
  });
  await db.write();
  console.log('기본 관리자 계정 생성: mymiryu@naver.com');
}

// 기존 사용자를 관리자로 승격 (이미 가입한 경우)
const adminEmails = ['mymiryu@naver.com', 'ceohs@kakao.com'];
for (const email of adminEmails) {
  const targetAdmin = db.data.users.find(u => u.email === email);
  if (targetAdmin && targetAdmin.role !== 'admin') {
    targetAdmin.role = 'admin';
    await db.write();
    console.log(`관리자 권한 부여: ${email}`);
  }
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

    // 관리자 이메일 체크 및 권한 부여
    const adminEmails = ['mymiryu@naver.com', 'ceohs@kakao.com'];
    if (adminEmails.includes(user.email) && user.role !== 'admin') {
      user.role = 'admin';
      await db.write();
      console.log(`로그인 시 관리자 권한 부여: ${user.email}`);
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
    const tokenParams = {
      grant_type: 'authorization_code',
      client_id: KAKAO_CLIENT_ID,
      redirect_uri: KAKAO_REDIRECT_URI,
      code: code
    };

    // client_secret이 설정된 경우 추가
    if (KAKAO_CLIENT_SECRET) {
      tokenParams.client_secret = KAKAO_CLIENT_SECRET;
    }

    const tokenResponse = await axios.post(
      'https://kauth.kakao.com/oauth/token',
      new URLSearchParams(tokenParams),
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

    // 관리자 이메일 체크 및 권한 부여
    const adminEmails = ['mymiryu@naver.com', 'ceohs@kakao.com'];
    if (adminEmails.includes(user.email) && user.role !== 'admin') {
      user.role = 'admin';
      await db.write();
      console.log(`카카오 로그인 시 관리자 권한 부여: ${user.email}`);
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

// 멀티 vCard 다운로드 - 배치의 모든 연락처를 하나의 .vcf 파일로 다운로드
app.get('/api/batches/:id/vcf', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    await db.read();

    const batch = db.data.batch_jobs.find(b => b.id === id);
    if (!batch) {
      return res.status(404).json({ error: '배치 작업을 찾을 수 없습니다.' });
    }

    if (batch.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: '접근 권한이 없습니다.' });
    }

    // vCard 타입 배치만 지원
    if (batch.type !== 'vcard') {
      return res.status(400).json({ error: 'vCard 타입 배치만 VCF 다운로드가 가능합니다.' });
    }

    const items = db.data.qr_codes.filter(qr => qr.batch_id === id);

    if (items.length === 0) {
      return res.status(404).json({ error: '연락처가 없습니다.' });
    }

    // 모든 연락처를 하나의 VCF 파일로 결합
    let vcfContent = '';

    for (const item of items) {
      const data = item.data || {};

      // vCard 3.0 형식
      let vcard = 'BEGIN:VCARD\r\n';
      vcard += 'VERSION:3.0\r\n';

      // 이름 (FN: 전체 이름, N: 구조화된 이름)
      const name = data.name || data.이름 || '이름없음';
      vcard += `FN:${name}\r\n`;
      vcard += `N:${name};;;;\r\n`;

      // 전화번호
      const tel = data.tel || data.phone || data.전화번호 || '';
      if (tel) {
        vcard += `TEL;TYPE=CELL:${tel}\r\n`;
      }

      // 이메일
      const email = data.email || data.이메일 || '';
      if (email) {
        vcard += `EMAIL:${email}\r\n`;
      }

      // 회사
      const org = data.org || data.company || data.회사 || '';
      if (org) {
        vcard += `ORG:${org}\r\n`;
      }

      // 직책
      const title = data.title || data.직책 || '';
      if (title) {
        vcard += `TITLE:${title}\r\n`;
      }

      // 주소
      const addr = data.address || data.주소 || '';
      if (addr) {
        vcard += `ADR;TYPE=WORK:;;${addr};;;;\r\n`;
      }

      // 메모
      const note = data.note || data.메모 || '';
      if (note) {
        vcard += `NOTE:${note}\r\n`;
      }

      // 웹사이트
      const url = data.url || data.website || '';
      if (url) {
        vcard += `URL:${url}\r\n`;
      }

      vcard += 'END:VCARD\r\n';
      vcfContent += vcard;
    }

    // 파일명 생성 (한글 지원)
    const fileName = `${batch.name.replace(/\.[^/.]+$/, '')}_연락처_${items.length}명.vcf`;
    const encodedFileName = encodeURIComponent(fileName);

    res.setHeader('Content-Type', 'text/vcard; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodedFileName}"; filename*=UTF-8''${encodedFileName}`);
    res.send(vcfContent);

  } catch (error) {
    console.error('VCF 다운로드 오류:', error);
    res.status(500).json({ error: 'VCF 파일 생성 중 오류가 발생했습니다.' });
  }
});

// 개별 연락처 vCard 다운로드
app.get('/api/qr/:id/vcf', async (req, res) => {
  try {
    const { id } = req.params;
    await db.read();

    const qrCode = db.data.qr_codes.find(qr => qr.id === id);
    if (!qrCode) {
      return res.status(404).json({ error: 'QR코드를 찾을 수 없습니다.' });
    }

    if (qrCode.type !== 'vcard') {
      return res.status(400).json({ error: 'vCard 타입 QR코드만 VCF 다운로드가 가능합니다.' });
    }

    const data = qrCode.data || {};

    let vcard = 'BEGIN:VCARD\r\n';
    vcard += 'VERSION:3.0\r\n';

    const name = data.name || data.이름 || '이름없음';
    vcard += `FN:${name}\r\n`;
    vcard += `N:${name};;;;\r\n`;

    const tel = data.tel || data.phone || data.전화번호 || '';
    if (tel) vcard += `TEL;TYPE=CELL:${tel}\r\n`;

    const email = data.email || data.이메일 || '';
    if (email) vcard += `EMAIL:${email}\r\n`;

    const org = data.org || data.company || data.회사 || '';
    if (org) vcard += `ORG:${org}\r\n`;

    const title = data.title || data.직책 || '';
    if (title) vcard += `TITLE:${title}\r\n`;

    vcard += 'END:VCARD\r\n';

    const fileName = `${name}.vcf`;
    const encodedFileName = encodeURIComponent(fileName);

    res.setHeader('Content-Type', 'text/vcard; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodedFileName}"; filename*=UTF-8''${encodedFileName}`);
    res.send(vcard);

  } catch (error) {
    console.error('개별 VCF 다운로드 오류:', error);
    res.status(500).json({ error: 'VCF 파일 생성 중 오류가 발생했습니다.' });
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
    const totalScans = (db.data.qr_scans || []).length;

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

    // 일별 스캔 통계 (최근 7일)
    const dailyScans = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dailyScans[dateStr] = 0;
    }

    (db.data.qr_scans || []).forEach(scan => {
      if (scan.scanned_at) {
        const dateStr = scan.scanned_at.split('T')[0];
        if (dailyScans.hasOwnProperty(dateStr)) {
          dailyScans[dateStr]++;
        }
      }
    });

    const dailyScansArray = Object.entries(dailyScans).map(([date, count]) => ({
      date,
      count
    }));

    // 최근 활동 (QR 생성 + 스캔)
    const recentActivities = [];

    // QR 생성 활동
    db.data.qr_codes.slice(-10).reverse().forEach(qr => {
      const user = db.data.users.find(u => u.id === qr.user_id);
      recentActivities.push({
        type: 'qr_created',
        userName: user?.name || '알 수 없음',
        qrType: qr.type || 'url',
        timestamp: qr.created_at,
        description: `${user?.name || '알 수 없음'}님이 QR코드를 생성했습니다`
      });
    });

    // 스캔 활동
    (db.data.qr_scans || []).slice(-10).reverse().forEach(scan => {
      const qr = db.data.qr_codes.find(q => q.id === scan.qr_id);
      const user = qr ? db.data.users.find(u => u.id === qr.user_id) : null;
      recentActivities.push({
        type: 'qr_scanned',
        userName: user?.name || '알 수 없음',
        qrType: qr?.type || 'url',
        timestamp: scan.scanned_at,
        description: `${user?.name || '알 수 없음'}님의 QR코드가 스캔되었습니다`
      });
    });

    // 시간순 정렬 (최신순)
    recentActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      totalUsers,
      totalQRs,
      totalBatches,
      totalScans,
      userStats: userStatsArray,
      dailyScans: dailyScansArray,
      recentActivities: recentActivities.slice(0, 15)
    });
  } catch (error) {
    console.error('관리자 통계 조회 오류:', error);
    res.status(500).json({ error: '통계 조회 중 오류가 발생했습니다.' });
  }
});

// 사용자에게 무료 구독 기간 부여 (관리자 전용)
app.post('/api/admin/users/:id/grant-subscription', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { plan, months, reason } = req.body;

    if (!plan || !months) {
      return res.status(400).json({ error: '요금제와 기간을 입력해주세요.' });
    }

    if (!PLANS[plan]) {
      return res.status(400).json({ error: '유효하지 않은 요금제입니다.' });
    }

    if (months < 1 || months > 24) {
      return res.status(400).json({ error: '기간은 1~24개월 사이로 입력해주세요.' });
    }

    await db.read();

    const user = db.data.users.find(u => u.id === id);
    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    // 기존 구독 만료 처리
    const existingSubscription = db.data.subscriptions.find(
      s => s.user_id === id && s.status === 'active'
    );
    if (existingSubscription) {
      existingSubscription.status = 'cancelled';
      existingSubscription.cancelled_at = new Date().toISOString();
    }

    // 새 무료 구독 생성
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + parseInt(months));

    const newSubscription = {
      id: uuidv4(),
      user_id: id,
      plan: plan,
      billing_cycle: 'admin_grant',
      status: 'active',
      payment_key: null,
      order_id: `ADMIN_GRANT_${Date.now()}`,
      amount: 0,
      starts_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      auto_renew: false,
      created_at: now.toISOString(),
      granted_by: req.user.id,
      grant_reason: reason || '관리자 부여'
    };

    db.data.subscriptions.push(newSubscription);
    await db.write();

    res.json({
      success: true,
      message: `${user.name}님에게 ${PLANS[plan].name} 요금제 ${months}개월이 부여되었습니다.`,
      subscription: newSubscription
    });
  } catch (error) {
    console.error('구독 부여 오류:', error);
    res.status(500).json({ error: '구독 부여 중 오류가 발생했습니다.' });
  }
});

// 단체(팀) 구독 생성 (관리자 전용)
app.post('/api/admin/team-subscription', authenticate, requireAdmin, async (req, res) => {
  try {
    const { teamName, plan, months, memberEmails, discount } = req.body;

    if (!teamName || !plan || !months || !memberEmails || memberEmails.length === 0) {
      return res.status(400).json({ error: '팀 이름, 요금제, 기간, 멤버 이메일을 입력해주세요.' });
    }

    if (!PLANS[plan]) {
      return res.status(400).json({ error: '유효하지 않은 요금제입니다.' });
    }

    await db.read();

    const results = {
      success: [],
      notFound: [],
      alreadyActive: []
    };

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + parseInt(months));

    for (const email of memberEmails) {
      const user = db.data.users.find(u => u.email === email.trim().toLowerCase());

      if (!user) {
        results.notFound.push(email);
        continue;
      }

      // 기존 활성 구독 확인
      const existingSubscription = db.data.subscriptions.find(
        s => s.user_id === user.id && s.status === 'active'
      );

      if (existingSubscription) {
        existingSubscription.status = 'cancelled';
        existingSubscription.cancelled_at = now.toISOString();
      }

      // 새 구독 생성
      const newSubscription = {
        id: uuidv4(),
        user_id: user.id,
        plan: plan,
        billing_cycle: 'team',
        status: 'active',
        payment_key: null,
        order_id: `TEAM_${teamName}_${Date.now()}`,
        amount: 0,
        starts_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        auto_renew: false,
        created_at: now.toISOString(),
        team_name: teamName,
        granted_by: req.user.id,
        discount_percent: discount || 0
      };

      db.data.subscriptions.push(newSubscription);
      results.success.push({ email, userName: user.name });
    }

    await db.write();

    // 단체 가격 계산
    const basePrice = PLANS[plan].monthlyPrice * months * results.success.length;
    const discountAmount = basePrice * (discount || 0) / 100;
    const finalPrice = basePrice - discountAmount;

    res.json({
      success: true,
      message: `${teamName} 팀 구독이 생성되었습니다.`,
      teamName,
      plan: PLANS[plan].name,
      months,
      results,
      pricing: {
        memberCount: results.success.length,
        basePrice,
        discountPercent: discount || 0,
        discountAmount,
        finalPrice
      }
    });
  } catch (error) {
    console.error('팀 구독 생성 오류:', error);
    res.status(500).json({ error: '팀 구독 생성 중 오류가 발생했습니다.' });
  }
});

// 프로모션 코드 생성 (관리자 전용)
app.post('/api/admin/promo-codes', authenticate, requireAdmin, async (req, res) => {
  try {
    const { code, plan, months, maxUses, expiresAt, description } = req.body;

    if (!code || !plan || !months) {
      return res.status(400).json({ error: '코드, 요금제, 기간을 입력해주세요.' });
    }

    await db.read();

    // promo_codes 배열이 없으면 생성
    if (!db.data.promo_codes) {
      db.data.promo_codes = [];
    }

    // 중복 코드 확인
    const existingCode = db.data.promo_codes.find(p => p.code === code.toUpperCase());
    if (existingCode) {
      return res.status(400).json({ error: '이미 존재하는 프로모션 코드입니다.' });
    }

    const promoCode = {
      id: uuidv4(),
      code: code.toUpperCase(),
      plan,
      months: parseInt(months),
      max_uses: maxUses || null,
      used_count: 0,
      expires_at: expiresAt || null,
      description: description || '',
      created_at: new Date().toISOString(),
      created_by: req.user.id,
      is_active: true
    };

    db.data.promo_codes.push(promoCode);
    await db.write();

    res.json({
      success: true,
      message: '프로모션 코드가 생성되었습니다.',
      promoCode
    });
  } catch (error) {
    console.error('프로모션 코드 생성 오류:', error);
    res.status(500).json({ error: '프로모션 코드 생성 중 오류가 발생했습니다.' });
  }
});

// 프로모션 코드 목록 (관리자 전용)
app.get('/api/admin/promo-codes', authenticate, requireAdmin, async (req, res) => {
  try {
    await db.read();
    const promoCodes = db.data.promo_codes || [];
    res.json(promoCodes);
  } catch (error) {
    console.error('프로모션 코드 목록 조회 오류:', error);
    res.status(500).json({ error: '프로모션 코드 목록 조회 중 오류가 발생했습니다.' });
  }
});

// 프로모션 코드 사용 (사용자)
app.post('/api/promo-codes/redeem', authenticate, async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: '프로모션 코드를 입력해주세요.' });
    }

    await db.read();

    if (!db.data.promo_codes) {
      return res.status(404).json({ error: '유효하지 않은 프로모션 코드입니다.' });
    }

    const promoCode = db.data.promo_codes.find(p => p.code === code.toUpperCase() && p.is_active);

    if (!promoCode) {
      return res.status(404).json({ error: '유효하지 않은 프로모션 코드입니다.' });
    }

    // 만료 확인
    if (promoCode.expires_at && new Date(promoCode.expires_at) < new Date()) {
      return res.status(400).json({ error: '만료된 프로모션 코드입니다.' });
    }

    // 사용 횟수 확인
    if (promoCode.max_uses && promoCode.used_count >= promoCode.max_uses) {
      return res.status(400).json({ error: '사용 한도를 초과한 프로모션 코드입니다.' });
    }

    // 이미 사용한 사용자인지 확인
    if (!db.data.promo_code_uses) {
      db.data.promo_code_uses = [];
    }

    const alreadyUsed = db.data.promo_code_uses.find(
      u => u.promo_code_id === promoCode.id && u.user_id === req.user.id
    );

    if (alreadyUsed) {
      return res.status(400).json({ error: '이미 사용한 프로모션 코드입니다.' });
    }

    // 기존 구독 만료 처리
    const existingSubscription = db.data.subscriptions.find(
      s => s.user_id === req.user.id && s.status === 'active'
    );
    if (existingSubscription) {
      existingSubscription.status = 'cancelled';
      existingSubscription.cancelled_at = new Date().toISOString();
    }

    // 새 구독 생성
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + promoCode.months);

    const newSubscription = {
      id: uuidv4(),
      user_id: req.user.id,
      plan: promoCode.plan,
      billing_cycle: 'promo',
      status: 'active',
      payment_key: null,
      order_id: `PROMO_${promoCode.code}_${Date.now()}`,
      amount: 0,
      starts_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      auto_renew: false,
      created_at: now.toISOString(),
      promo_code: promoCode.code
    };

    db.data.subscriptions.push(newSubscription);

    // 사용 기록 추가
    db.data.promo_code_uses.push({
      id: uuidv4(),
      promo_code_id: promoCode.id,
      user_id: req.user.id,
      used_at: now.toISOString()
    });

    // 사용 횟수 증가
    promoCode.used_count++;

    await db.write();

    res.json({
      success: true,
      message: `${PLANS[promoCode.plan].name} 요금제 ${promoCode.months}개월이 적용되었습니다!`,
      subscription: newSubscription
    });
  } catch (error) {
    console.error('프로모션 코드 사용 오류:', error);
    res.status(500).json({ error: '프로모션 코드 사용 중 오류가 발생했습니다.' });
  }
});

// ========== 결제 API (토스페이먼츠) ==========

// 요금제 목록 조회
app.get('/api/plans', (req, res) => {
  res.json(PLANS);
});

// 내 구독 정보 조회
app.get('/api/subscription', authenticate, async (req, res) => {
  try {
    const plan = await getUserSubscription(req.user.id);
    const monthlyCount = await getMonthlyQRCount(req.user.id);
    const planInfo = PLANS[plan];

    await db.read();
    const subscription = db.data.subscriptions.find(s =>
      s.user_id === req.user.id && s.status === 'active'
    );

    res.json({
      plan,
      planName: planInfo.name,
      monthlyLimit: planInfo.monthlyLimit,
      monthlyCount,
      remaining: planInfo.monthlyLimit === -1 ? '무제한' : planInfo.monthlyLimit - monthlyCount,
      maxSize: planInfo.maxSize,
      features: planInfo.features,
      subscription: subscription ? {
        expiresAt: subscription.expires_at,
        billingCycle: subscription.billing_cycle,
        autoRenew: subscription.auto_renew
      } : null
    });
  } catch (error) {
    console.error('구독 정보 조회 오류:', error);
    res.status(500).json({ error: '구독 정보 조회 중 오류가 발생했습니다.' });
  }
});

// 결제 요청 준비 (주문 생성)
app.post('/api/payments/prepare', authenticate, async (req, res) => {
  try {
    const { plan, billingCycle } = req.body; // billingCycle: 'monthly' or 'yearly'

    if (!PLANS[plan] || plan === 'free') {
      return res.status(400).json({ error: '유효하지 않은 요금제입니다.' });
    }

    const planInfo = PLANS[plan];
    const amount = billingCycle === 'yearly' ? planInfo.yearlyPrice : planInfo.monthlyPrice;
    const orderId = `ORDER_${req.user.id}_${Date.now()}`;
    const orderName = `QR코드 생성기 ${planInfo.name} (${billingCycle === 'yearly' ? '연간' : '월간'})`;

    // 주문 정보 임시 저장
    await db.read();
    db.data.payments.push({
      id: orderId,
      user_id: req.user.id,
      plan,
      billing_cycle: billingCycle,
      amount,
      status: 'pending',
      created_at: new Date().toISOString()
    });
    await db.write();

    res.json({
      orderId,
      orderName,
      amount,
      customerEmail: req.user.email,
      customerName: req.user.name,
      clientKey: TOSS_CLIENT_KEY,
      successUrl: `${APP_URL}/payment/success`,
      failUrl: `${APP_URL}/payment/fail`
    });
  } catch (error) {
    console.error('결제 준비 오류:', error);
    res.status(500).json({ error: '결제 준비 중 오류가 발생했습니다.' });
  }
});

// 결제 승인 (토스페이먼츠 콜백)
app.post('/api/payments/confirm', authenticate, async (req, res) => {
  try {
    const { paymentKey, orderId, amount } = req.body;

    // 주문 정보 확인
    await db.read();
    const payment = db.data.payments.find(p => p.id === orderId && p.user_id === req.user.id);
    if (!payment) {
      return res.status(400).json({ error: '주문 정보를 찾을 수 없습니다.' });
    }

    if (payment.amount !== amount) {
      return res.status(400).json({ error: '결제 금액이 일치하지 않습니다.' });
    }

    // 토스페이먼츠 결제 승인 API 호출
    const confirmResponse = await axios.post(
      'https://api.tosspayments.com/v1/payments/confirm',
      { paymentKey, orderId, amount },
      {
        headers: {
          Authorization: `Basic ${Buffer.from(TOSS_SECRET_KEY + ':').toString('base64')}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // 결제 성공 - 구독 활성화
    const now = new Date();
    const expiresAt = new Date(now);
    if (payment.billing_cycle === 'yearly') {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    // 기존 구독 비활성화
    db.data.subscriptions.forEach(s => {
      if (s.user_id === req.user.id) {
        s.status = 'inactive';
      }
    });

    // 새 구독 추가
    db.data.subscriptions.push({
      id: uuidv4(),
      user_id: req.user.id,
      plan: payment.plan,
      billing_cycle: payment.billing_cycle,
      status: 'active',
      payment_key: paymentKey,
      starts_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      auto_renew: true,
      created_at: now.toISOString()
    });

    // 결제 상태 업데이트
    payment.status = 'completed';
    payment.payment_key = paymentKey;
    payment.completed_at = now.toISOString();

    await db.write();

    res.json({
      success: true,
      message: '결제가 완료되었습니다.',
      subscription: {
        plan: payment.plan,
        expiresAt: expiresAt.toISOString()
      }
    });
  } catch (error) {
    console.error('결제 승인 오류:', error.response?.data || error.message);

    // 결제 실패 처리
    if (error.response?.data) {
      return res.status(400).json({
        error: '결제 승인에 실패했습니다.',
        details: error.response.data.message
      });
    }
    res.status(500).json({ error: '결제 승인 중 오류가 발생했습니다.' });
  }
});

// 결제 내역 조회
app.get('/api/payments/history', authenticate, async (req, res) => {
  try {
    await db.read();
    const payments = db.data.payments
      .filter(p => p.user_id === req.user.id && p.status === 'completed')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json(payments);
  } catch (error) {
    console.error('결제 내역 조회 오류:', error);
    res.status(500).json({ error: '결제 내역 조회 중 오류가 발생했습니다.' });
  }
});

// ========== 다이나믹 QR코드 API ==========

// 다이나믹 QR 생성 (비즈니스 플랜)
app.post('/api/qr/dynamic', authenticate, checkPremiumFeature('dynamic_qr'), async (req, res) => {
  try {
    const { name, targetUrl, options = {} } = req.body;

    if (!targetUrl) {
      return res.status(400).json({ error: '대상 URL을 입력해주세요.' });
    }

    const id = uuidv4();
    const shortCode = id.slice(0, 8);
    const dynamicUrl = `${APP_URL}/r/${shortCode}`;

    const qrOptions = {
      errorCorrectionLevel: options.errorCorrectionLevel || 'M',
      type: 'image/png',
      quality: 0.92,
      margin: options.margin || 2,
      color: {
        dark: options.darkColor || '#000000',
        light: options.lightColor || '#FFFFFF'
      },
      width: Math.min(options.size || 300, PLANS[req.userPlan].maxSize)
    };

    const dataUrl = await QRCode.toDataURL(dynamicUrl, qrOptions);
    const createdAt = new Date().toISOString();

    // 다이나믹 QR 정보 저장
    const dynamicQR = {
      id,
      short_code: shortCode,
      user_id: req.user.id,
      name: name || `dynamic-${shortCode}`,
      target_url: targetUrl,
      dynamic_url: dynamicUrl,
      data_url: dataUrl,
      scan_count: 0,
      is_active: true,
      created_at: createdAt,
      updated_at: createdAt
    };

    await db.read();
    db.data.dynamic_qr.push(dynamicQR);
    await db.write();

    res.json({
      id,
      shortCode,
      name: dynamicQR.name,
      targetUrl,
      dynamicUrl,
      dataUrl,
      createdAt
    });
  } catch (error) {
    console.error('다이나믹 QR 생성 오류:', error);
    res.status(500).json({ error: '다이나믹 QR 생성 중 오류가 발생했습니다.' });
  }
});

// 다이나믹 QR 대상 URL 수정
app.patch('/api/qr/dynamic/:id', authenticate, checkPremiumFeature('dynamic_qr'), async (req, res) => {
  try {
    const { id } = req.params;
    const { targetUrl, name, isActive } = req.body;

    await db.read();
    const dynamicQR = db.data.dynamic_qr.find(d => d.id === id && d.user_id === req.user.id);

    if (!dynamicQR) {
      return res.status(404).json({ error: '다이나믹 QR을 찾을 수 없습니다.' });
    }

    if (targetUrl) dynamicQR.target_url = targetUrl;
    if (name) dynamicQR.name = name;
    if (typeof isActive === 'boolean') dynamicQR.is_active = isActive;
    dynamicQR.updated_at = new Date().toISOString();

    await db.write();

    res.json({
      success: true,
      message: '다이나믹 QR이 수정되었습니다.',
      dynamicQR
    });
  } catch (error) {
    console.error('다이나믹 QR 수정 오류:', error);
    res.status(500).json({ error: '다이나믹 QR 수정 중 오류가 발생했습니다.' });
  }
});

// 다이나믹 QR 목록 조회
app.get('/api/qr/dynamic', authenticate, async (req, res) => {
  try {
    await db.read();
    const dynamicQRs = db.data.dynamic_qr
      .filter(d => d.user_id === req.user.id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json(dynamicQRs);
  } catch (error) {
    console.error('다이나믹 QR 목록 조회 오류:', error);
    res.status(500).json({ error: '다이나믹 QR 목록 조회 중 오류가 발생했습니다.' });
  }
});

// 다이나믹 QR 리다이렉트 (공개 - 스캔 시 호출)
app.get('/r/:shortCode', async (req, res) => {
  try {
    const { shortCode } = req.params;

    await db.read();
    const dynamicQR = db.data.dynamic_qr.find(d => d.short_code === shortCode);

    if (!dynamicQR || !dynamicQR.is_active) {
      return res.status(404).send('QR코드를 찾을 수 없거나 비활성화되었습니다.');
    }

    // 스캔 기록
    dynamicQR.scan_count = (dynamicQR.scan_count || 0) + 1;

    db.data.qr_scans.push({
      id: uuidv4(),
      qr_id: dynamicQR.id,
      user_id: dynamicQR.user_id,
      user_agent: req.headers['user-agent'] || '',
      ip: req.ip || req.connection.remoteAddress,
      referer: req.headers.referer || '',
      scanned_at: new Date().toISOString()
    });

    await db.write();

    res.redirect(dynamicQR.target_url);
  } catch (error) {
    console.error('QR 리다이렉트 오류:', error);
    res.status(500).send('오류가 발생했습니다.');
  }
});

// ========== 스캔 분석 API ==========

// 스캔 통계 조회 (프로 플랜 이상)
app.get('/api/analytics/scans', authenticate, checkPremiumFeature('analytics'), async (req, res) => {
  try {
    const { period = '7d', qrId } = req.query;

    await db.read();

    // 기간 계산
    const now = new Date();
    let startDate = new Date();
    switch(period) {
      case '24h': startDate.setHours(startDate.getHours() - 24); break;
      case '7d': startDate.setDate(startDate.getDate() - 7); break;
      case '30d': startDate.setDate(startDate.getDate() - 30); break;
      case '90d': startDate.setDate(startDate.getDate() - 90); break;
      default: startDate.setDate(startDate.getDate() - 7);
    }

    let scans = db.data.qr_scans.filter(s =>
      s.user_id === req.user.id &&
      new Date(s.scanned_at) >= startDate
    );

    if (qrId) {
      scans = scans.filter(s => s.qr_id === qrId);
    }

    // 일별 통계
    const dailyStats = {};
    scans.forEach(scan => {
      const date = scan.scanned_at.split('T')[0];
      dailyStats[date] = (dailyStats[date] || 0) + 1;
    });

    // 기기별 통계 (User-Agent 파싱)
    const deviceStats = { mobile: 0, desktop: 0, tablet: 0, other: 0 };
    scans.forEach(scan => {
      const ua = scan.user_agent.toLowerCase();
      if (/mobile|android|iphone/.test(ua)) deviceStats.mobile++;
      else if (/tablet|ipad/.test(ua)) deviceStats.tablet++;
      else if (/windows|mac|linux/.test(ua)) deviceStats.desktop++;
      else deviceStats.other++;
    });

    res.json({
      totalScans: scans.length,
      period,
      dailyStats: Object.entries(dailyStats).map(([date, count]) => ({ date, count })),
      deviceStats
    });
  } catch (error) {
    console.error('스캔 통계 조회 오류:', error);
    res.status(500).json({ error: '스캔 통계 조회 중 오류가 발생했습니다.' });
  }
});

// ========== 고화질 QR 생성 API ==========

// 고화질 QR 다운로드 (베이직 플랜 이상)
app.post('/api/qr/high-resolution', authenticate, checkPremiumFeature('high_resolution'), async (req, res) => {
  try {
    const { qrId, size } = req.body;
    const plan = await getUserSubscription(req.user.id);
    const maxSize = PLANS[plan].maxSize;

    const requestedSize = Math.min(size || 1000, maxSize);

    await db.read();
    const qr = db.data.qr_codes.find(q => q.id === qrId && q.user_id === req.user.id);

    if (!qr) {
      return res.status(404).json({ error: 'QR 코드를 찾을 수 없습니다.' });
    }

    // 고화질로 재생성
    const qrOptions = {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 1,
      margin: 2,
      width: requestedSize
    };

    const dataUrl = await QRCode.toDataURL(qr.content, qrOptions);

    res.json({
      dataUrl,
      size: requestedSize,
      maxSize
    });
  } catch (error) {
    console.error('고화질 QR 생성 오류:', error);
    res.status(500).json({ error: '고화질 QR 생성 중 오류가 발생했습니다.' });
  }
});

// ========== 로고 삽입 QR API ==========

// 로고 업로드용 multer 설정
const logoStorage = multer.memoryStorage();
const logoUpload = multer({
  storage: logoStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB 제한
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('PNG, JPG, SVG 이미지만 업로드 가능합니다.'));
    }
  }
});

// 로고 삽입 QR 생성 (프로 플랜 이상)
app.post('/api/qr/with-logo', authenticate, checkPremiumFeature('logo_insert'), logoUpload.single('logo'), async (req, res) => {
  try {
    const { type, data, name, options = {} } = req.body;
    const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
    const parsedOptions = typeof options === 'string' ? JSON.parse(options) : options;

    if (!req.file) {
      return res.status(400).json({ error: '로고 이미지를 업로드해주세요.' });
    }

    const formatter = formatters[type];
    if (!formatter) {
      return res.status(400).json({ error: '지원하지 않는 QR 코드 타입입니다.' });
    }

    const content = formatter(parsedData);
    if (!content) {
      return res.status(400).json({ error: 'QR 코드 데이터가 올바르지 않습니다.' });
    }

    const plan = await getUserSubscription(req.user.id);
    const maxSize = PLANS[plan].maxSize;
    const qrSize = Math.min(parsedOptions.size || 500, maxSize);

    // 로고 삽입 시 오류 정정 레벨을 H(30%)로 설정해야 함
    const qrOptions = {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 1,
      margin: parsedOptions.margin || 2,
      color: {
        dark: parsedOptions.darkColor || '#000000',
        light: parsedOptions.lightColor || '#FFFFFF'
      },
      width: qrSize
    };

    // QR 코드 생성 (Buffer로)
    const qrBuffer = await QRCode.toBuffer(content, qrOptions);

    // 로고 크기 계산 (QR의 20-25% 정도가 적당)
    const logoSize = Math.round(qrSize * 0.22);
    const logoPosition = Math.round((qrSize - logoSize) / 2);

    // 로고 이미지 리사이즈
    const resizedLogo = await sharp(req.file.buffer)
      .resize(logoSize, logoSize, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toBuffer();

    // 로고 배경 (흰색 원형/사각형)
    const logoPadding = Math.round(logoSize * 0.1);
    const logoWithBg = await sharp({
      create: {
        width: logoSize + logoPadding * 2,
        height: logoSize + logoPadding * 2,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
      .composite([{
        input: resizedLogo,
        top: logoPadding,
        left: logoPadding
      }])
      .png()
      .toBuffer();

    // QR 코드 위에 로고 합성
    const finalQR = await sharp(qrBuffer)
      .composite([{
        input: logoWithBg,
        top: logoPosition - logoPadding,
        left: logoPosition - logoPadding
      }])
      .png()
      .toBuffer();

    // Base64 Data URL로 변환
    const dataUrl = `data:image/png;base64,${finalQR.toString('base64')}`;

    const id = uuidv4();
    const createdAt = new Date().toISOString();

    // DB에 저장
    const qrCode = {
      id,
      type,
      name: name || `${type}-logo-${Date.now()}`,
      content,
      data_url: dataUrl,
      has_logo: true,
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
      hasLogo: true,
      createdAt
    });
  } catch (error) {
    console.error('로고 QR 생성 오류:', error);
    res.status(500).json({ error: '로고 QR 생성 중 오류가 발생했습니다: ' + error.message });
  }
});

// 기존 QR에 로고 추가 (프로 플랜 이상)
app.post('/api/qr/:id/add-logo', authenticate, checkPremiumFeature('logo_insert'), logoUpload.single('logo'), async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: '로고 이미지를 업로드해주세요.' });
    }

    await db.read();
    const qr = db.data.qr_codes.find(q => q.id === id && q.user_id === req.user.id);

    if (!qr) {
      return res.status(404).json({ error: 'QR 코드를 찾을 수 없습니다.' });
    }

    const plan = await getUserSubscription(req.user.id);
    const maxSize = PLANS[plan].maxSize;
    const qrSize = Math.min(parseInt(req.body.size) || 500, maxSize);

    // QR 코드 재생성 (높은 오류 정정 레벨로)
    const qrOptions = {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 1,
      margin: 2,
      width: qrSize
    };

    const qrBuffer = await QRCode.toBuffer(qr.content, qrOptions);

    // 로고 크기 및 위치 계산
    const logoSize = Math.round(qrSize * 0.22);
    const logoPosition = Math.round((qrSize - logoSize) / 2);

    // 로고 이미지 처리
    const resizedLogo = await sharp(req.file.buffer)
      .resize(logoSize, logoSize, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toBuffer();

    // 로고 배경
    const logoPadding = Math.round(logoSize * 0.1);
    const logoWithBg = await sharp({
      create: {
        width: logoSize + logoPadding * 2,
        height: logoSize + logoPadding * 2,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
      .composite([{
        input: resizedLogo,
        top: logoPadding,
        left: logoPadding
      }])
      .png()
      .toBuffer();

    // 합성
    const finalQR = await sharp(qrBuffer)
      .composite([{
        input: logoWithBg,
        top: logoPosition - logoPadding,
        left: logoPosition - logoPadding
      }])
      .png()
      .toBuffer();

    const dataUrl = `data:image/png;base64,${finalQR.toString('base64')}`;

    res.json({
      id: qr.id,
      dataUrl,
      size: qrSize,
      hasLogo: true
    });
  } catch (error) {
    console.error('로고 추가 오류:', error);
    res.status(500).json({ error: '로고 추가 중 오류가 발생했습니다: ' + error.message });
  }
});

// ========== 사이트 설정 API ==========

// 사이트 설정 조회 (공개)
app.get('/api/settings', async (req, res) => {
  try {
    await db.read();

    // 기본 설정
    const defaultSettings = {
      heroImage: '/images/1.png',
      heroTitle: '10시간 → 10분으로',
      heroSubtitle: '연락처 일괄 저장',
      heroDescription: '엑셀로 관리하던 수백 명의 연락처, QR코드 하나로 고객 폰에 바로 저장하세요.'
    };

    const settings = db.data.site_settings || defaultSettings;
    res.json(settings);
  } catch (error) {
    console.error('설정 조회 오류:', error);
    res.status(500).json({ error: '설정을 불러오는 중 오류가 발생했습니다.' });
  }
});

// 사이트 설정 저장 (관리자 전용)
app.put('/api/admin/settings', authenticate, requireAdmin, async (req, res) => {
  try {
    const settings = req.body;

    await db.read();

    // 기존 설정과 병합
    db.data.site_settings = {
      ...db.data.site_settings,
      // 히어로 섹션
      heroImage: settings.heroImage || db.data.site_settings?.heroImage || '/images/1.png',
      heroTitle: settings.heroTitle || db.data.site_settings?.heroTitle || '10시간 → 10분으로',
      heroSubtitle: settings.heroSubtitle || db.data.site_settings?.heroSubtitle || '연락처 일괄 저장',
      heroDescription: settings.heroDescription || db.data.site_settings?.heroDescription || '',
      heroBadge: settings.heroBadge || db.data.site_settings?.heroBadge || '보험 FP · 영업팀을 위한 업무 자동화',
      // 섹션 활성화
      showUseCases: settings.showUseCases !== undefined ? settings.showUseCases : true,
      showTestimonials: settings.showTestimonials !== undefined ? settings.showTestimonials : true,
      showPremiumFeatures: settings.showPremiumFeatures !== undefined ? settings.showPremiumFeatures : true,
      showCharacterQR: settings.showCharacterQR !== undefined ? settings.showCharacterQR : true,
      // CTA 버튼
      ctaButtonText: settings.ctaButtonText || db.data.site_settings?.ctaButtonText || '무료로 시작하기',
      ctaButtonLink: settings.ctaButtonLink || db.data.site_settings?.ctaButtonLink || '/generate',
      // 업종별 활용 사례
      useCases: settings.useCases || db.data.site_settings?.useCases || null,
      // 고객 후기
      testimonials: settings.testimonials || db.data.site_settings?.testimonials || null,
      // 프리미엄 기능
      premiumFeatures: settings.premiumFeatures || db.data.site_settings?.premiumFeatures || null,
      // 캐릭터 QR 연락처
      characterQR: settings.characterQR || db.data.site_settings?.characterQR || null,
      // FAQ
      faq: settings.faq || db.data.site_settings?.faq || null,
      // 메타데이터
      updated_at: new Date().toISOString(),
      updated_by: req.user.id
    };

    await db.write();

    res.json({
      success: true,
      message: '설정이 저장되었습니다.',
      settings: db.data.site_settings
    });
  } catch (error) {
    console.error('설정 저장 오류:', error);
    res.status(500).json({ error: '설정 저장 중 오류가 발생했습니다.' });
  }
});

// 이미지 업로드 (관리자 전용)
app.post('/api/admin/upload-image', authenticate, requireAdmin, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '이미지 파일을 선택해주세요.' });
    }

    const imageUrl = `/uploads/${req.file.filename}`;

    res.json({
      success: true,
      imageUrl,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('이미지 업로드 오류:', error);
    res.status(500).json({ error: '이미지 업로드 중 오류가 발생했습니다.' });
  }
});

// 사용 가능한 이미지 목록 조회 (관리자 전용)
app.get('/api/admin/images', authenticate, requireAdmin, async (req, res) => {
  try {
    const imagesDir = path.join(__dirname, '../client/public/images');
    const uploadsDir = path.join(__dirname, 'uploads');

    const images = [];

    // public/images 폴더
    if (fs.existsSync(imagesDir)) {
      const publicImages = fs.readdirSync(imagesDir)
        .filter(f => /\.(png|jpg|jpeg|gif|webp)$/i.test(f))
        .map(f => ({
          name: f,
          url: `/images/${f}`,
          type: 'public'
        }));
      images.push(...publicImages);
    }

    // uploads 폴더
    if (fs.existsSync(uploadsDir)) {
      const uploadedImages = fs.readdirSync(uploadsDir)
        .filter(f => /\.(png|jpg|jpeg|gif|webp)$/i.test(f))
        .map(f => ({
          name: f,
          url: `/uploads/${f}`,
          type: 'uploaded'
        }));
      images.push(...uploadedImages);
    }

    res.json(images);
  } catch (error) {
    console.error('이미지 목록 조회 오류:', error);
    res.status(500).json({ error: '이미지 목록 조회 중 오류가 발생했습니다.' });
  }
});

// ========== 공유 API (로그인 불필요 - 공개 접근) ==========

// 배치 공유 정보 조회 (공개)
app.get('/api/share/:batchId', async (req, res) => {
  try {
    const { batchId } = req.params;
    await db.read();

    const batch = db.data.batch_jobs.find(b => b.id === batchId);
    if (!batch) {
      return res.status(404).json({ error: '공유된 연락처를 찾을 수 없습니다.' });
    }

    // vCard 타입만 지원
    if (batch.type !== 'vcard') {
      return res.status(400).json({ error: '연락처 타입만 공유 가능합니다.' });
    }

    const items = db.data.qr_codes.filter(qr => qr.batch_id === batchId);

    // 소유자 정보
    const owner = db.data.users.find(u => u.id === batch.user_id);

    // 미리보기 (최대 5개)
    const preview = items.slice(0, 5).map(item => {
      const data = item.data || {};
      return {
        name: data.name || data.이름 || '이름없음',
        phone: data.tel || data.phone || data.전화번호 || '',
        company: data.org || data.company || data.회사 || ''
      };
    });

    res.json({
      batchId: batch.id,
      totalCount: items.length,
      ownerName: owner?.name || '',
      preview,
      createdAt: batch.created_at
    });
  } catch (error) {
    console.error('공유 정보 조회 오류:', error);
    res.status(500).json({ error: '정보를 불러오는 중 오류가 발생했습니다.' });
  }
});

// 배치 VCF 다운로드 (공개)
app.get('/api/share/:batchId/vcf', async (req, res) => {
  try {
    const { batchId } = req.params;
    await db.read();

    const batch = db.data.batch_jobs.find(b => b.id === batchId);
    if (!batch) {
      return res.status(404).json({ error: '연락처를 찾을 수 없습니다.' });
    }

    if (batch.type !== 'vcard') {
      return res.status(400).json({ error: '연락처 타입만 다운로드 가능합니다.' });
    }

    const items = db.data.qr_codes.filter(qr => qr.batch_id === batchId);

    if (items.length === 0) {
      return res.status(404).json({ error: '연락처가 없습니다.' });
    }

    // 모든 연락처를 하나의 VCF 파일로 결합
    let vcfContent = '';

    for (const item of items) {
      const data = item.data || {};

      let vcard = 'BEGIN:VCARD\r\n';
      vcard += 'VERSION:3.0\r\n';

      const name = data.name || data.이름 || '이름없음';
      vcard += `FN:${name}\r\n`;
      vcard += `N:${name};;;;\r\n`;

      const tel = data.tel || data.phone || data.전화번호 || '';
      if (tel) vcard += `TEL;TYPE=CELL:${tel}\r\n`;

      const email = data.email || data.이메일 || '';
      if (email) vcard += `EMAIL:${email}\r\n`;

      const org = data.org || data.company || data.회사 || '';
      if (org) vcard += `ORG:${org}\r\n`;

      const title = data.title || data.직책 || '';
      if (title) vcard += `TITLE:${title}\r\n`;

      const addr = data.address || data.주소 || '';
      if (addr) vcard += `ADR;TYPE=WORK:;;${addr};;;;\r\n`;

      const note = data.note || data.메모 || '';
      if (note) vcard += `NOTE:${note}\r\n`;

      vcard += 'END:VCARD\r\n';
      vcfContent += vcard;
    }

    const fileName = `연락처_${items.length}명.vcf`;
    const encodedFileName = encodeURIComponent(fileName);

    res.setHeader('Content-Type', 'text/vcard; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodedFileName}"; filename*=UTF-8''${encodedFileName}`);
    res.send(vcfContent);

  } catch (error) {
    console.error('공유 VCF 다운로드 오류:', error);
    res.status(500).json({ error: 'VCF 파일 생성 중 오류가 발생했습니다.' });
  }
});

// 프로덕션에서 React 빌드 파일 서빙
const clientDistPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));

  // API 라우트가 아닌 모든 요청을 React 앱으로 라우팅
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/') && !req.path.startsWith('/uploads/')) {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    }
  });
}

app.listen(PORT, () => {
  console.log(`🚀 QR 코드 생성기 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});
