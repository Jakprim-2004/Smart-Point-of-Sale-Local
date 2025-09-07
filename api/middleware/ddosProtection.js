const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const helmet = require('helmet');
const hpp = require('hpp');
const compression = require('compression');

// IP Whitelist (เพิ่ม IP ที่ไว้ใจได้)
const TRUSTED_IPS = [
  '127.0.0.1',
  '::1',
  'localhost',
  // เพิ่ม IP ของ office หรือ admin ที่ไว้ใจได้
];

// IP Blacklist (IP ที่ถูกแบน)
let BLOCKED_IPS = new Set([
  // เพิ่ม IP ที่ต้องการบล็อค
]);

// Rate Limiter สำหรับ API ทั่วไป
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 นาที
  max: 100, // จำกัด 100 requests ต่อ IP ใน 15 นาที
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // ข้าม rate limit สำหรับ IP ที่ไว้ใจได้
    const clientIP = getClientIP(req);
    return TRUSTED_IPS.includes(clientIP);
  },
  keyGenerator: (req) => {
    return getClientIP(req);
  }
});

// Rate Limiter สำหรับ Login (เข้มงวดกว่า)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 นาที
  max: 5, // จำกัด 5 ครั้งต่อ IP สำหรับ login
  message: {
    error: 'Too many login attempts, please try again later.',
    retryAfter: '15 minutes',
    code: 'AUTH_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const clientIP = getClientIP(req);
    return TRUSTED_IPS.includes(clientIP);
  },
  keyGenerator: (req) => {
    return getClientIP(req);
  }
});

// Slow Down สำหรับการชะลอ request
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 นาที
  delayAfter: 50, // ชะลอหลังจาก 50 requests
  delayMs: () => 500, // เพิ่ม delay 500ms ต่อ request (ปรับตาม warning)
  maxDelayMs: 5000, // delay สูงสุด 5 วินาที
  validate: {
    delayMs: false // ปิด warning message
  },
  skip: (req) => {
    const clientIP = getClientIP(req);
    return TRUSTED_IPS.includes(clientIP);
  },
  keyGenerator: (req) => {
    return getClientIP(req);
  }
});

// Middleware สำหรับตรวจสอบ IP ที่ถูกบล็อค
const ipBlocker = (req, res, next) => {
  const clientIP = getClientIP(req);
  
  if (BLOCKED_IPS.has(clientIP)) {
    console.warn(`🚫 Blocked IP attempt: ${clientIP} - ${req.method} ${req.path}`);
    return res.status(403).json({
      error: 'Access denied',
      code: 'IP_BLOCKED'
    });
  }
  
  next();
};

// Security Headers
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false, // ปิดเพื่อความเข้ากันได้
  crossOriginResourcePolicy: { policy: "cross-origin" }
});

// Request Size Limiter
const requestSizeLimiter = (req, res, next) => {
  const maxSize = 50 * 1024 * 1024; // 50MB
  
  if (req.headers['content-length'] && parseInt(req.headers['content-length']) > maxSize) {
    return res.status(413).json({
      error: 'Request too large',
      maxSize: '50MB',
      code: 'REQUEST_TOO_LARGE'
    });
  }
  
  next();
};

// Anti-DDoS Monitoring
const ddosMonitor = (req, res, next) => {
  const clientIP = getClientIP(req);
  const timestamp = Date.now();
  const userAgent = req.get('User-Agent') || 'Unknown';
  
  // Log suspicious activity
  if (req.headers['x-forwarded-for']?.includes(',')) {
    console.warn(`🚨 Suspicious forwarded headers from ${clientIP}: ${req.headers['x-forwarded-for']}`);
  }
  
  // ตรวจสอบ User-Agent ที่น่าสงสัย
  const suspiciousAgents = ['bot', 'crawler', 'spider', 'scraper'];
  const isSuspicious = suspiciousAgents.some(agent => 
    userAgent.toLowerCase().includes(agent)
  );
  
  if (isSuspicious && !TRUSTED_IPS.includes(clientIP)) {
    console.warn(`🤖 Suspicious User-Agent from ${clientIP}: ${userAgent}`);
  }
  
  // เก็บข้อมูลสถิติ (สำหรับการวิเคราะห์)
  req.ddosInfo = {
    ip: clientIP,
    timestamp,
    userAgent,
    isSuspicious
  };
  
  next();
};

// ฟังก์ชันสำหรับดึง IP ที่แท้จริง
function getClientIP(req) {
  return req.ip || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress ||
         req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         'unknown';
}

// ฟังก์ชันสำหรับเพิ่ม IP ลงใน blacklist
function blockIP(ip, reason = 'Manual block') {
  BLOCKED_IPS.add(ip);
  console.warn(`🚫 IP Blocked: ${ip} - Reason: ${reason}`);
}

// ฟังก์ชันสำหรับลบ IP ออกจาก blacklist
function unblockIP(ip) {
  BLOCKED_IPS.delete(ip);
  // IP unblocked (details hidden for security)
}

// ฟังก์ชันสำหรับดู IP ที่ถูกบล็อค
function getBlockedIPs() {
  return Array.from(BLOCKED_IPS);
}

// Compression middleware
const compressionMiddleware = compression({
  filter: (req, res) => {
    // ไม่ compress ถ้าเป็น streaming data
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6,
  threshold: 1024
});

module.exports = {
  // Basic Protection
  generalLimiter,
  authLimiter,
  speedLimiter,
  ipBlocker,
  securityHeaders,
  requestSizeLimiter,
  ddosMonitor,
  compressionMiddleware,
  
  // Parameter Pollution Protection
  hppProtection: hpp({
    whitelist: ['tags', 'categories', 'filters'] // อนุญาต duplicate parameters เหล่านี้
  }),
  
  // Utility Functions
  blockIP,
  unblockIP,
  getBlockedIPs,
  getClientIP,
  
  // Combined middleware สำหรับใช้งานง่าย
  basicProtection: [
    compressionMiddleware,
    securityHeaders,
    ipBlocker,
    requestSizeLimiter,
    ddosMonitor,
    hpp({
      whitelist: ['tags', 'categories', 'filters']
    })
  ],
  
  // Full protection (รวม rate limiting)
  fullProtection: [
    compressionMiddleware,
    securityHeaders,
    ipBlocker,
    requestSizeLimiter,
    generalLimiter,
    speedLimiter,
    ddosMonitor,
    hpp({
      whitelist: ['tags', 'categories', 'filters']
    })
  ]
};
