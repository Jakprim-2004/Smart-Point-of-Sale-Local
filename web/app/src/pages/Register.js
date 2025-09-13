import { useState,  } from "react";
import axios from 'axios';
import config from "../config";
import Swal from 'sweetalert2';
import { useNavigate } from "react-router-dom";
import { FaUser, FaEnvelope, FaPhone, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';

function Register() {
    const [formData, setFormData] = useState({
        password: '',
        firstname: '',
        lastname: '',
        email: '',
        phone: '',
        
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordMatch, setPasswordMatch] = useState(true);

    const navigate = useNavigate();

   

   

    const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const allowedDomains = [
        'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'
    ];
    const domain = email.split('@')[1];
    return re.test(email) && allowedDomains.includes(domain);
};

    const handlePhoneChange = (e) => {
        const value = e.target.value.replace(/\D/g, ''); 
        if (value.length <= 10) {
            setFormData(prev => ({ ...prev, phone: value }));
        }
    };

    const validatePassword = (password) => {
        const numberCount = (password.match(/\d/g) || []).length;
        const lowerCaseCount = (password.match(/[a-z]/g) || []).length;
        const upperCaseCount = (password.match(/[A-Z]/g) || []).length;
        const hasSpecialChar = /[!@#$%^&*()_+|~\-=`{}[\]:";'<>?,./]/.test(password);
        const isLongEnough = password.length >= 8;

        if (!isLongEnough) return { isValid: false, message: 'รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัว' };
        if (numberCount < 8) return { isValid: false, message: 'รหัสผ่านต้องมีตัวเลขอย่างน้อย 8 ตัว' };
        if (lowerCaseCount < 1) return { isValid: false, message: 'รหัสผ่านต้องมีตัวอักษรตัวเล็ก a-z อย่างน้อย 1 ตัว' };
        if (upperCaseCount < 1) return { isValid: false, message: 'รหัสผ่านต้องมีตัวอักษรตัวใหญ่ A-Z อย่างน้อย 1 ตัว' };
        if (!hasSpecialChar) return { isValid: false, message: 'รหัสผ่านต้องมีอักขระพิเศษอย่างน้อย 1 ตัว เช่น !@#$%^&*()_+' };

        return { isValid: true, message: '' };
    };

    const handlePasswordChange = (e) => {
        const newPassword = e.target.value;
        setFormData(prev => ({ ...prev, password: newPassword }));
        setPasswordMatch(newPassword === formData.confirmPassword);
    };

    const handleConfirmPasswordChange = (e) => {
        const newConfirmPass = e.target.value;
        setFormData(prev => ({ ...prev, confirmPassword: newConfirmPass }));
        setPasswordMatch(formData.password === newConfirmPass);
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const toggleConfirmPasswordVisibility = () => {
        setShowConfirmPassword(!showConfirmPassword);
    };

    const checkDuplicate = async (type, value) => {
        try {
            const response = await axios.post(config.api_path + '/member/check-duplicate', 
                type === 'email' ? { email: value } : { phone: value }
            );
            return response.data;
        } catch (error) {
            throw error.response?.data?.message || 'เกิดข้อผิดพลาดในการตรวจสอบข้อมูล';
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Check email duplicate
            const emailCheck = await checkDuplicate('email', formData.email);
            if (emailCheck.isDuplicate) {
                Swal.fire({
                    title: 'Error',
                    text: 'อีเมลนี้มีผู้ใช้งานแล้ว',
                    icon: 'error'
                });
                return;
            }

            // Check phone duplicate
            const phoneCheck = await checkDuplicate('phone', formData.phone);
            if (phoneCheck.isDuplicate) {
                Swal.fire({
                    title: 'Error',
                    text: 'เบอร์โทรศัพท์นี้มีผู้ใช้งานแล้ว',
                    icon: 'error'
                });
                return;
            }

            // Continue with existing validation
            if (!validateEmail(formData.email)) {
                Swal.fire({
                    title: 'Error',
                    text: 'กรุณากรอกอีเมลให้ถูกต้อง',
                    icon: 'error'
                });
                return;
            }

            if (formData.phone.length !== 10) {
                Swal.fire({
                    title: 'Error',
                    text: 'กรุณากรอกเบอร์โทรศัพท์ให้ครบ 10 หลัก',
                    icon: 'error'
                });
                return;
            }

            const passwordValidation = validatePassword(formData.password);
            if (!passwordValidation.isValid) {
                Swal.fire({
                    title: 'Error',
                    text: passwordValidation.message,
                    icon: 'error'
                });
                return;
            }

            if (formData.password !== formData.confirmPassword) {
                Swal.fire({
                    title: 'Error',
                    text: 'กรุณากรอกรหัสผ่านให้ตรงกัน',
                    icon: 'error'
                });
                return;
            }

            const response = await axios.post(config.api_path + '/member/register', {
                email: formData.email,
                phone: formData.phone,
                password: formData.password,
                firstName: formData.firstname,
                lastName: formData.lastname,
            });

            if (response.data.message === 'success') {
                Swal.fire({
                    title: 'บันทึกข้อมูล',
                    text: 'บันทึกข้อมูลการสมัครเรียบร้อยแล้ว',
                    icon: 'success',
                    timer: 2000
                });
                navigate('/');
            }
        } catch (error) {
            Swal.fire({
                title: 'Error',
                text: error.message || 'เกิดข้อผิดพลาดในการตรวจสอบข้อมูล',
                icon: 'error'
            });
        }
    };

    return (
        <div className="container py-5">
            <div className="card shadow-lg rounded-3 border-0">
                <div className="card-body p-4">
                    <h2 className="text-center mb-4 text-primary">สมัครสมาชิก</h2>
                    <form onSubmit={handleSubmit} className="row g-4">
                        {/* Basic Information Section */}
                        <div className="col-12">
                            <h5 className="text-secondary mb-3">ข้อมูลพื้นฐาน</h5>
                            <div className="row g-3">
                                <div className="col-md-6">
                                    <div className="input-group">
                                        <span className="input-group-text bg-light"><FaEnvelope /></span>
                                        <input type="email" className="form-control" placeholder="อีเมล" value={formData.email} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} required />
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <div className="input-group">
                                        <span className="input-group-text bg-light"><FaPhone /></span>
                                        <input type="tel" 
                                            className="form-control" 
                                            placeholder="เบอร์โทรศัพท์" 
                                            value={formData.phone} 
                                            onChange={handlePhoneChange}
                                            required />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Password Section */}
                        <div className="col-12">
                            <h5 className="text-secondary mb-3">รหัสผ่าน</h5>
                            <div className="row g-3">
                                <div className="col-md-6">
                                    <div className="input-group">
                                        <span className="input-group-text bg-light"><FaLock /></span>
                                        <input 
                                            type={showPassword ? "text" : "password"}
                                            className="form-control" 
                                            placeholder="รหัสผ่าน (8+ ตัว, A-Z 1-2 ตัว, อักขระพิเศษเช่น !@#$%^&*)" 
                                            value={formData.password} 
                                            onChange={handlePasswordChange}
                                            required 
                                        />
                                        <button 
                                            type="button" 
                                            className="btn btn-outline-secondary" 
                                            onClick={togglePasswordVisibility} 
                                        >
                                            {showPassword ? <FaEyeSlash /> : <FaEye />}
                                        </button>
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <div className="input-group">
                                        <span className="input-group-text bg-light"><FaLock /></span>
                                        <input 
                                            type={showConfirmPassword ? "text" : "password"}
                                            className={`form-control ${formData.confirmPassword && !passwordMatch ? 'is-invalid' : ''}`}
                                            placeholder="ยืนยันรหัสผ่าน" 
                                            value={formData.confirmPassword} 
                                            onChange={handleConfirmPasswordChange}
                                            required 
                                        />
                                        <button 
                                            type="button" 
                                            className="btn btn-outline-secondary" 
                                            onClick={toggleConfirmPasswordVisibility}
                                        >
                                            {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                                        </button>
                                    </div>
                                    {formData.confirmPassword && !passwordMatch && (
                                        <div className="invalid-feedback d-block">
                                            รหัสผ่านไม่ตรงกัน
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Personal Information Section */}
                        <div className="col-12">
                            <h5 className="text-secondary mb-3">ข้อมูลส่วนตัว</h5>
                            <div className="row g-3">
                                <div className="col-md-6">
                                    <div className="input-group">
                                        <span className="input-group-text bg-light"><FaUser /></span>
                                        <input type="text" className="form-control" placeholder="ชื่อ" value={formData.firstname} onChange={(e) => setFormData(prev => ({ ...prev, firstname: e.target.value }))} required />
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <div className="input-group">
                                        <span className="input-group-text bg-light"><FaUser /></span>
                                        <input type="text" className="form-control" placeholder="นามสกุล" value={formData.lastname} onChange={(e) => setFormData(prev => ({ ...prev, lastname: e.target.value }))} required />
                                    </div>
                                </div>
                            </div>
                        </div>

                      

                        <div className="col-12 text-center mt-4">
                            <button type="submit" className="btn btn-primary btn-lg px-5 rounded-pill">
                                ยืนยันการสมัคร
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default Register;
