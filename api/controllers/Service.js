const jwt = require('jsonwebtoken');
require('dotenv').config();

// ฟังก์ชั่นตรวจสอบการล็อกอิน
// ตรวจสอบว่ามี token และ token ถูกต้องหรือไม่
const isLogin = (req, res, next) => {
    try {
        const token = getToken(req);
        if (token) {
            const decoded = jwt.verify(token, process.env.secret);
            
            // ตรวจสอบว่าเป็น access token
            if (decoded.type && decoded.type !== 'access') {
                return res.status(401).send({ 
                    message: 'Invalid token type',
                    error: 'TOKEN_TYPE_INVALID'
                });
            }
            
            next();
        } else {
            res.statusCode = 401;
            res.send({ 
                message: 'กรุณาเข้าสู่ระบบใหม่',
                error: 'TOKEN_NOT_FOUND'
            });
        }
    } catch (e) {
        // Token validation error - เขียน log ไปยัง system log แทน
        
        // ส่งข้อมูล error ที่เฉพาะเจาะจง
        if (e.name === 'TokenExpiredError') {
            res.statusCode = 401;
            res.send({ 
                message: 'Token หมดอายุ กรุณาเข้าสู่ระบบใหม่',
                error: 'TOKEN_EXPIRED'
            });
        } else if (e.name === 'JsonWebTokenError') {
            res.statusCode = 401;
            res.send({ 
                message: 'Token ไม่ถูกต้อง',
                error: 'TOKEN_INVALID'
            });
        } else {
            res.statusCode = 401;
            res.send({ 
                message: e.message,
                error: 'TOKEN_ERROR'
            });
        }
    }
}

// ฟังก์ชั่นตรวจสอบสิทธิ์เจ้าของร้าน
// อนุญาตเฉพาะเจ้าของร้านหรือพนักงานที่มีระดับ owner เท่านั้น
const ownerOnly = (req, res, next) => {
    try {
        const token = getToken(req);
        if (token) {
            const decoded = jwt.verify(token, process.env.secret);
            
            // ตรวจสอบว่าเป็น access token
            if (decoded.type && decoded.type !== 'access') {
                return res.status(401).send({ 
                    message: 'Invalid token type',
                    error: 'TOKEN_TYPE_INVALID'
                });
            }
            
            // Check if user is owner (no employeeId in token) or employee with admin level
            if (!decoded.employeeId || decoded.level === 'owner') {
                next();
            } else {
                res.status(403).send({ message: 'Access denied. Owner only.' });
            }
        } else {
            res.status(401).send({ 
                message: 'Please login again.',
                error: 'TOKEN_NOT_FOUND'
            });
        }
    } catch (e) {
        if (e.name === 'TokenExpiredError') {
            res.status(401).send({ 
                message: 'Token หมดอายุ กรุณาเข้าสู่ระบบใหม่',
                error: 'TOKEN_EXPIRED'
            });
        } else {
            res.status(401).send({ 
                message: e.message,
                error: 'TOKEN_ERROR'
            });
        }
    }
}

// รายการเส้นทาง (routes) ที่พนักงานสามารถเข้าถึงได้
const allowedEmployeeRoutes = [
  '/sale',
  '/product',
 
  
];

// ฟังก์ชั่นตรวจสอบสิทธิ์การเข้าถึงเส้นทาง
// ตรวจสอบว่าผู้ใช้มีสิทธิ์เข้าถึงเส้นทางที่ร้องขอหรือไม่
const checkRouteAccess = (req, res, next) => {
  try {
    const token = getToken(req);
    if (token) {
      const decoded = jwt.verify(token, process.env.secret);
      const path = req.path;

      // Owner has access to everything
      if (!decoded.employeeId || decoded.level === 'owner') {
        next();
        return;
      }

      // Check if employee has access to this route
      if (allowedEmployeeRoutes.some(route => path.startsWith(route))) {
        next();
      } else {
        res.status(403).send({ message: 'Access denied to this resource' });
      }
    } else {
      res.status(401).send({ message: 'Please login again' });
    }
  } catch (e) {
    res.status(401).send({ message: e.message });
  }
}

// ฟังก์ชั่นดึง ID ของสมาชิก
// ดึง ID ของสมาชิกจาก token
const getMemberId = (req) => {
    const token = getToken(req);
    const payload = jwt.decode(token);
    return payload.id;
}

// ฟังก์ชั่นดึง ID ของพนักงาน
// ดึง ID ของพนักงานจาก token
const getEmployeeId = (req) => {
    const token = getToken(req);
    const payload = jwt.decode(token);
    return payload.employeeId;
}
// ฟังก์ชั่นดึง ID ของลูกค้า
// ดึง ID ของลูกค้าจาก token
const getCustomerId = (req) => {
    const token = getToken(req);
    const payload = jwt.decode(token);
    return payload.customerId;
}

// ฟังก์ชั่นดึงระดับของผู้ใช้
// ดึงระดับ (level) ของผู้ใช้จาก token
const getUserLevel = (req) => {
    const token = getToken(req);
    const payload = jwt.decode(token);
    return payload.level;
}

// ฟังก์ชั่นดึง token
// แยก token จาก header ของ request
const getToken = (req) => {
    return req.headers.authorization?.split(' ')[1];
}

// ฟังก์ชั่นดึง ID ของผู้ดูแลระบบ
// ดึง ID ของ admin จาก token
const getAdminId = (req) => {
    const jwt = require('jsonwebtoken');
    const token = req.headers.authorization?.replace('Bearer ', '');
    const payLoad = jwt.decode(token);

    // ตรวจสอบว่ามี payLoad และมี id
    return payLoad && payLoad.id ? payLoad.id : null;
}


module.exports = {
    isLogin,
    ownerOnly,
    getMemberId,
    getEmployeeId,
    getCustomerId,
    getUserLevel,
    getToken,
    checkRouteAccess,
    getAdminId
}