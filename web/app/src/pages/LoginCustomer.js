import { useState } from "react";
import axios from 'axios';
import config from "../config";
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import mochiGif from '../assets/mochi-young-woman.gif';

function LoginCustomer() {
    const [loginData, setLoginData] = useState({
        email: "",
        phone: ""
    });
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        
        // สำหรับเบอร์โทรศัพท์ ให้รับแค่ตัวเลขและไม่เกิน 10 ตัว
        if (name === 'phone') {
            const numericValue = value.replace(/\D/g, ''); // ลบทุกอย่างที่ไม่ใช่ตัวเลข
            if (numericValue.length <= 10) {
                setLoginData({
                    ...loginData,
                    [name]: numericValue
                });
            }
        } else {
            setLoginData({
                ...loginData,
                [name]: value
            });
        }
    };

    // ฟังก์ชันตรวจสอบรูปแบบอีเมล
    const isValidEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!loginData.email || !loginData.phone) {
            Swal.fire({
                title: 'แจ้งเตือน',
                text: 'กรุณากรอกทั้งอีเมลและเบอร์โทรศัพท์',
                icon: 'warning'
            });
            return;
        }

        // ตรวจสอบรูปแบบอีเมล
        if (!isValidEmail(loginData.email)) {
            Swal.fire({
                title: 'แจ้งเตือน',
                text: 'กรุณากรอกอีเมลให้ถูกต้อง เช่น example@email.com',
                icon: 'warning'
            });
            return;
        }

        // ตรวจสอบเบอร์โทรศัพท์ว่าต้องเป็น 10 หลัก
        if (loginData.phone.length !== 10) {
            Swal.fire({
                title: 'แจ้งเตือน',
                text: 'กรุณากรอกเบอร์โทรศัพท์ให้ครบ 10 หลัก',
                icon: 'warning'
            });
            return;
        }

        try {
            const response = await axios.post(config.api_path + '/login/customer', loginData);
            if (response.data.success === false) {
                Swal.fire({
                    title: 'เกิดข้อผิดพลาด',
                    text: response.data.message || 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง',
                    icon: 'error'
                });
                return;
            }

           if (response.data.result) {
                localStorage.setItem('customerData', JSON.stringify(response.data.result));
                navigate('/DetailCustomer');
            }
        } catch (error) {
            let errorMessage = 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง';
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            }
            
            Swal.fire({
                title: 'เกิดข้อผิดพลาด',
                text: errorMessage,
                icon: 'error'
            });
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(120deg, #e0c3fc 0%, #8ec5fc 100%)',
            padding: '2rem 0'
        }}>
            <div className="container">
                <div className="row justify-content-center align-items-center min-vh-100">
                    <div className="col-md-8">
                        <div className="card" style={{
                            borderRadius: '20px',
                            border: 'none',
                            boxShadow: '0 15px 35px rgba(0,0,0,0.15)',
                            overflow: 'hidden',
                            background: 'rgba(255,255,255,0.95)'
                        }}>
                            <div className="card-body p-0">
                                <div className="row g-0">
                                    {/* Image Section - Now on the left */}
                                    <div className="col-md-6 d-none d-md-block" style={{
                                        background: 'linear-gradient(135deg, #8BC6EC 0%, #9599E2 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '2rem'
                                    }}>
                                        <img 
                                            src={mochiGif} 
                                            alt="Mochi woman" 
                                            style={{
                                                maxWidth: '100%',
                                                borderRadius: '15px',
                                                boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                                            }}
                                        />
                                    </div>
                                    {/* Form Section - Now on the right */}
                                    <div className="col-md-6 p-5">
                                        <h2 className="text-center mb-4" style={{
                                            color: '#2c3e50',
                                            fontWeight: '600'
                                        }}>เข้าสู่ระบบ</h2>
                                        <form onSubmit={handleSubmit}>
                                            <div className="mb-4">
                                                <label className="form-label" style={{fontWeight: '500'}}>
                                                    อีเมล <span className="text-danger">*</span>
                                                </label>
                                                <input
                                                    type="email"
                                                    className={`form-control ${loginData.email && !isValidEmail(loginData.email) ? 'is-invalid' : loginData.email && isValidEmail(loginData.email) ? 'is-valid' : ''}`}
                                                    name="email"
                                                    value={loginData.email}
                                                    onChange={handleChange}
                                                    placeholder="example@email.com"
                                                    required
                                                    style={{
                                                        padding: '0.75rem',
                                                        borderRadius: '10px',
                                                        border: '2px solid #e2e8f0',
                                                        transition: 'all 0.3s ease'
                                                    }}
                                                />
                                                {loginData.email && !isValidEmail(loginData.email) && (
                                                    <small className="text-danger">
                                                        รูปแบบอีเมลไม่ถูกต้อง
                                                    </small>
                                                )}
                                                {loginData.email && isValidEmail(loginData.email) && (
                                                    <small className="text-success">
                                                        ✓ รูปแบบอีเมลถูกต้อง
                                                    </small>
                                                )}
                                            </div>
                                            <div className="mb-4">
                                                <label className="form-label" style={{fontWeight: '500'}}>
                                                    เบอร์โทรศัพท์ <span className="text-danger">*</span>
                                                </label>
                                                <input
                                                    type="tel"
                                                    className="form-control"
                                                    name="phone"
                                                    value={loginData.phone}
                                                    onChange={handleChange}
                                                    placeholder="กรอกเบอร์โทรศัพท์ 10 หลัก"
                                                    maxLength="10"
                                                    pattern="[0-9]{10}"
                                                    title="กรุณากรอกเบอร์โทรศัพท์ 10 หลัก"
                                                    required
                                                    style={{
                                                        padding: '0.75rem',
                                                        borderRadius: '10px',
                                                        border: '2px solid #e2e8f0',
                                                        transition: 'all 0.3s ease'
                                                    }}
                                                />
                                                <small className="text-muted">
                                                    {loginData.phone.length}/10 หลัก
                                                </small>
                                            </div>
                                            <div className="text-muted mb-4 small">
                                                * กรุณากรอกข้อมูลให้ครบทุกช่อง
                                            </div>
                                            <button 
                                                type="submit" 
                                                className="btn btn-primary w-100"
                                                style={{
                                                    padding: '0.75rem',
                                                    borderRadius: '10px',
                                                    background: 'linear-gradient(45deg, #4776E6, #8E54E9)',
                                                    border: 'none',
                                                    fontWeight: '500',
                                                    transition: 'all 0.3s ease',
                                                    boxShadow: '0 4px 15px rgba(71, 118, 230, 0.2)'
                                                }}
                                                onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                                                onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                                            >
                                                เข้าสู่ระบบ
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                @import url("https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&family=Sarabun:wght@300;400;500;600;700&family=Prompt:wght@300;400;500;600;700&display=swap");

                * {
                    font-family: "Kanit", sans-serif !important;
                }

                body,
                .container,
                .card,
                .card-body,
                .btn,
                .form-control,
                input,
                small,
                div,
                p {
                    font-family: "Kanit", sans-serif !important;
                }

                h1, h2, h3, h4, h5, h6 {
                    font-family: "Kanit", sans-serif !important;
                    font-weight: 600 !important;
                }

                .form-label,
                label {
                    font-family: "Kanit", sans-serif !important;
                    font-weight: 600 !important;
                }

                .btn {
                    font-family: "Kanit", sans-serif !important;
                    font-weight: 600 !important;
                }

                .text-muted,
                small {
                    font-family: "Kanit", sans-serif !important;
                }

                /* Placeholder text */
                .form-control::placeholder {
                    font-family: "Kanit", sans-serif !important;
                    color: #9ca3af !important;
                    font-style: italic;
                }

                /* Validation styles */
                .form-control.is-valid {
                    border-color: #28a745 !important;
                    box-shadow: 0 0 0 0.2rem rgba(40, 167, 69, 0.25) !important;
                }

                .form-control.is-invalid {
                    border-color: #dc3545 !important;
                    box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25) !important;
                }

                .text-success {
                    color: #28a745 !important;
                    font-weight: 600 !important;
                    font-family: "Kanit", sans-serif !important;
                }

                .text-danger {
                    color: #dc3545 !important;
                    font-weight: 600 !important;
                    font-family: "Kanit", sans-serif !important;
                }

                /* Hover effects for inputs */
                .form-control:hover {
                    border-color: #b3d9ff !important;
                    box-shadow: 0 2px 5px rgba(0, 123, 255, 0.1) !important;
                    transition: all 0.3s ease;
                }

                .form-control:focus {
                    border-color: #007bff !important;
                    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25) !important;
                    transition: all 0.3s ease;
                }

                /* Card and button improvements */
                .card {
                    font-family: "Kanit", sans-serif !important;
                }

                .btn-primary {
                    font-size: 16px !important;
                    letter-spacing: 0.5px;
                }

                /* Container and layout */
                .container * {
                    font-family: "Kanit", sans-serif !important;
                }

                /* Required asterisk */
                .text-danger {
                    font-family: "Kanit", sans-serif !important;
                }
            `}</style>
        </div>
    );
}

export default LoginCustomer;