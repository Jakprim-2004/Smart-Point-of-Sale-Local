# 🛒 Smart Point of Sale (Local Version)

ระบบจุดขายอัจฉริยะแบบ Full-Stack สำหรับร้านค้าปลีก พร้อมระบบสะสมแต้มและการจัดการสต็อกสินค้า

## 📺 Demo Video
[![Smart POS Demo](https://img.youtube.com/vi/i-GQ9EBBTOE/maxresdefault.jpg)](https://youtu.be/i-GQ9EBBTOE)

**วิดีโอสาธิตการใช้งาน:** [https://youtu.be/i-GQ9EBBTOE](https://youtu.be/i-GQ9EBBTOE)

---

## ✨ คุณสมบัติหลัก

### 🎯 ระบบจัดการหลัก
- **💼 ระบบจุดขาย (POS)** - ขายสินค้า รองรับหลายรายการ คำนวณราคาอัตโนมัติ
- **📦 จัดการสินค้า** - เพิ่ม แก้ไข ลบ และค้นหาสินค้า พร้อมอัปโหลดรูปภาพ
- **🏷️ จัดการหมวดหมู่** - จัดหมวดหมู่สินค้าอย่างเป็นระบบ
- **📊 จัดการสต็อก** - ตรวจสอบสต็อก เพิ่มสต็อก และแจ้งเตือนสินค้าใกล้หมด
- **📈 รายงานสต็อก** - รายงานการเคลื่อนไหวของสต็อกสินค้า

### 👥 ระบบสมาชิกและลูกค้า
- **🎁 ระบบสะสมแต้ม** - ลูกค้าได้รับแต้มจากการซื้อสินค้า
- **🏆 ระบบของรางวัล** - แลกแต้มรับของรางวัล
- **👤 จัดการลูกค้า** - ข้อมูลลูกค้า ประวัติการซื้อ และแต้มสะสม
- **📱 พอร์ทัลลูกค้า** - ลูกค้าสามารถเข้าดูแต้มและประวัติการแลกของรางวัล

### 📊 ระบบรายงานและการวิเคราะห์
- **📈 Dashboard** - สรุปยอดขาย รายได้ และสถิติการขายแบบ Real-time
- **🧾 ประวัติบิลขาย** - บันทึกและค้นหาบิลขายทั้งหมด
- **📉 รายงานสต็อก** - วิเคราะห์การเคลื่อนไหวของสินค้า
- **💹 กราฟและชาร์ต** - แสดงข้อมูลด้วยกราฟที่เข้าใจง่าย

### 🔒 ระบบความปลอดภัย
- **🔐 Authentication** - ระบบ Login/Register ด้วย JWT Token
- **👨‍💼 จัดการสมาชิก** - สำหรับพนักงานและผู้ดูแลระบบ
- **🛡️ Authorization Guard** - ป้องกันการเข้าถึงหน้าที่ไม่ได้รับอนุญาต

---

## 🏗️ สถาปัตยกรรมระบบ

```
Smart-Point-of-Sale-Local/
├── 🖥️ api/                    # Backend Server (Node.js + Express)
│   ├── controllers/          # Business Logic สำหรับแต่ละฟีเจอร์
│   ├── models/              # Database Models (Sequelize ORM)
│   ├── middleware/          # Security & Authentication
│   ├── utils/               # Helper Functions
│   └── uploads/             # ไฟล์ที่อัปโหลด
│
├── 🌐 web/app/               # Frontend (React.js)
│   ├── src/
│   │   ├── pages/          # หน้าเว็บต่างๆ
│   │   ├── components/     # React Components
│   │   ├── utils/          # Helper Functions
│   │   └── assets/         # รูปภาพและไฟล์สื่อ
│   └── build/              # Production Build
│
└── 📜 Command_Run_*.bat     # Scripts สำหรับรันระบบ
```

---

## 🚀 เทคโนโลยีที่ใช้

### Backend
- **Node.js & Express.js** - Framework สำหรับสร้าง RESTful API
- **PostgreSQL** - ระบบฐานข้อมูล
- **Sequelize ORM** - จัดการฐานข้อมูลแบบ Object-Relational Mapping
- **JWT (JSON Web Token)** - Authentication และ Authorization
- **Cloudinary** - จัดเก็บและจัดการรูปภาพ
- **Bcrypt** - เข้ารหัสรหัสผ่าน
- **Express Rate Limit** - ป้องกัน DDoS และ Brute Force
- **Helmet** - เพิ่มความปลอดภัยด้วย HTTP Headers

### Frontend
- **React.js 18** - UI Library
- **React Router DOM** - Navigation และ Routing
- **Axios** - HTTP Client
- **Chart.js & Recharts** - กราฟและการแสดงผลข้อมูล
- **Bootstrap 5 & Material-UI** - UI Components
- **SweetAlert2** - Alert และ Modal ที่สวยงาม
- **React DatePicker** - เลือกวันที่
- **QRCode React** - สร้าง QR Code (รองรับ PromptPay)
- **JSBarcode** - สร้าง Barcode
- **PrintJS** - พิมพ์เอกสาร

---

## 📋 ความต้องการของระบบ

- **Node.js** (v14 ขึ้นไป)
- **PostgreSQL** (v12 ขึ้นไป) หรือ NeonDB
- **npm** หรือ **yarn**
- **Git** (สำหรับ Clone โปรเจค)

---

## 🔧 การติดตั้งและการใช้งาน

### 1️⃣ Clone Repository
```bash
git clone https://github.com/Jakprim-2004/Smart-Point-of-Sale-Local.git
cd Smart-Point-of-Sale-Local
```

### 2️⃣ ติดตั้ง Dependencies

#### ติดตั้ง Backend
```bash
cd api
npm install
```

#### ติดตั้ง Frontend
```bash
cd web/app
npm install
```

### 3️⃣ ตั้งค่าฐานข้อมูล

สร้างไฟล์ `.env` ในโฟลเดอร์ `api/` และเพิ่มค่าต่อไปนี้:

```env
# Database Configuration
DB_HOST=your_database_host
DB_PORT=5432
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_database_password

# JWT Secret
JWT_SECRET=your_secret_key_here



# Server Configuration
PORT=3001
```

### 4️⃣ สร้างตารางฐานข้อมูล
```bash
cd api
node setup-database.js
```

### 5️⃣ รันระบบ

#### วิธีที่ 1: ใช้ Command Script (Windows)
```bash
# รัน Backend Server
Command_Run_Server.bat

# รัน Frontend (เปิด Terminal ใหม่)
Command_Run_Web.bat
```

#### วิธีที่ 2: รันแบบ Manual

**Backend:**
```bash
cd api
npm start
# หรือ
nodemon index.js
```

**Frontend:**
```bash
cd web/app
npm start
```

### 6️⃣ เข้าใช้งานระบบ

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001

---

## 📱 หน้าจอและฟีเจอร์

### 🔐 สำหรับพนักงาน/ผู้ดูแล
1. **Login** - เข้าสู่ระบบด้วย Username/Password
2. **Register** - ลงทะเบียนสมาชิกใหม่
3. **Dashboard** - ภาพรวมยอดขายและสถิติ
4. **Sale** - หน้าจอขายสินค้า (POS)
5. **Product** - จัดการสินค้า
6. **Category** - จัดการหมวดหมู่
7. **Stock** - จัดการสต็อกสินค้า
8. **Report Stock** - รายงานสต็อก
9. **Bill Sales** - ประวัติบิลขาย
10. **Customer** - จัดการข้อมูลลูกค้า
11. **Reward** - จัดการของรางวัล

### 👤 สำหรับลูกค้า
1. **Login Customer** - เข้าสู่ระบบลูกค้า
2. **Detail Customer** - ข้อมูลส่วนตัวและแต้มสะสม
3. **Point History** - ประวัติการได้รับและใช้แต้ม

---

## 🎯 การใช้งานหลัก

### 💰 ขายสินค้า
1. เลือกสินค้าที่ต้องการขาย
2. ระบุจำนวน
3. ระบบคำนวณราคาอัตโนมัติ
4. เลือกวิธีชำระเงิน (เงินสด/โอนเงิน/PromptPay QR)
5. พิมพ์ใบเสร็จ

### 📦 จัดการสินค้า
1. เพิ่มสินค้าใหม่พร้อมรูปภาพ
2. แก้ไขข้อมูลสินค้า (ชื่อ, ราคา, หมวดหมู่)
3. จัดการสต็อกสินค้า
4. ตั้งค่าแจ้งเตือนเมื่อสต็อกต่ำ

### 🎁 ระบบสะสมแต้ม
1. ลูกค้าได้แต้มอัตโนมัติเมื่อซื้อสินค้า
2. ลูกค้าสามารถแลกแต้มรับของรางวัล
3. ตรวจสอบประวัติการใช้แต้ม

---

## 🗄️ โครงสร้างฐานข้อมูล

- **Member** - ข้อมูลพนักงาน/ผู้ดูแล
- **Customer** - ข้อมูลลูกค้า
- **Category** - หมวดหมู่สินค้า
- **Product** - ข้อมูลสินค้า
- **ProductImage** - รูปภาพสินค้า
- **Stock** - ข้อมูลสต็อกสินค้า
- **BillSale** - บิลขาย
- **BillSaleDetail** - รายละเอียดบิลขาย
- **Reward** - ของรางวัล
- **PointTransaction** - ประวัติการใช้แต้ม
- **Defer_payment** - การผ่อนชำระ

---

## 🔒 ความปลอดภัย

- ✅ เข้ารหัสรหัสผ่านด้วย Bcrypt
- ✅ Authentication ด้วย JWT Token
- ✅ Protected Routes ด้วย AuthGuard
- ✅ Rate Limiting ป้องกัน DDoS
- ✅ Helmet.js เพิ่มความปลอดภัย HTTP Headers
- ✅ CORS Configuration
- ✅ Input Validation

---

## 📝 API Endpoints

### Authentication
- `POST /api/member/register` - ลงทะเบียนสมาชิก
- `POST /api/member/login` - เข้าสู่ระบบ

### Products
- `GET /api/product/list` - รายการสินค้าทั้งหมด
- `POST /api/product/create` - เพิ่มสินค้าใหม่
- `PUT /api/product/update/:id` - แก้ไขสินค้า
- `DELETE /api/product/delete/:id` - ลบสินค้า

### Sales
- `POST /api/billsale/create` - สร้างบิลขาย
- `GET /api/billsale/list` - รายการบิลขาย

### Stock
- `GET /api/stock/list` - รายการสต็อก
- `POST /api/stock/add` - เพิ่มสต็อก

### Customers
- `GET /api/customer/list` - รายการลูกค้า
- `POST /api/customer/login` - เข้าสู่ระบบลูกค้า

### Rewards
- `GET /api/reward/list` - รายการของรางวัล
- `POST /api/reward/redeem` - แลกของรางวัล

---

## 🤝 การมีส่วนร่วม

หากคุณต้องการมีส่วนร่วมในการพัฒนาโปรเจคนี้:

1. Fork โปรเจค
2. สร้าง Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit การเปลี่ยนแปลง (`git commit -m 'Add some AmazingFeature'`)
4. Push ไปยัง Branch (`git push origin feature/AmazingFeature`)
5. เปิด Pull Request

---

## 🐛 พบปัญหาหรือข้อเสนอแนะ?

หากคุณพบปัญหาหรือมีข้อเสนอแนะ กรุณาเปิด [Issue](https://github.com/Jakprim-2004/Smart-Point-of-Sale-Local/issues) ในโปรเจคนี้

---

## 📄 License

โปรเจคนี้เป็น Open Source และสามารถใช้งานได้ตามเงื่อนไขที่กำหนด

---

## 👨‍💻 ผู้พัฒนา

**Jakprim-2004**
- GitHub: [@Jakprim-2004](https://github.com/Jakprim-2004)
- Repository: [Smart-Point-of-Sale-Local](https://github.com/Jakprim-2004/Smart-Point-of-Sale-Local)

---

## 🙏 ขอบคุณ

ขอบคุณทุกคนที่ใช้งานและสนับสนุนโปรเจคนี้ หากชอบโปรเจคนี้ อย่าลืมกด ⭐ Star ให้ด้วยนะครับ!

---

## 📞 ติดต่อ

หากมีคำถามหรือต้องการความช่วยเหลือ สามารถติดต่อผ่าน:
- 📧 Email: [Create Issue on GitHub](https://github.com/Jakprim-2004/Smart-Point-of-Sale-Local/issues)
- 📺 วิดีโอสาธิต: [YouTube](https://youtu.be/i-GQ9EBBTOE) 
