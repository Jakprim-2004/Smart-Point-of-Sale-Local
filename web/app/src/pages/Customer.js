import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Template from "../components/Template";
import config from "../config";
import axios from "axios";
import Swal from "sweetalert2";


function Customer() {
    const navigate = useNavigate();
    const [customers, setCustomers] = useState([]);
    const [filteredCustomers, setFilteredCustomers] = useState([]);
    const [editCustomer, setEditCustomer] = useState(null);
    const [newCustomer, setNewCustomer] = useState({
        name: '',
        phone: '',
        email: '',
        address: ''
    });
    const [showForm, setShowForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 30;

    useEffect(() => {
        loadCustomers();
    }, []);

    // useEffect สำหรับการค้นหา
    useEffect(() => {
        handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchTerm, customers]);

    // ฟังก์ชันค้นหาลูกค้า
    const handleSearch = () => {
        if (!searchTerm) {
            setFilteredCustomers(customers);
            setCurrentPage(1);
            return;
        }

        const filtered = customers.filter(customer =>
            customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            customer.phone.includes(searchTerm) ||
            customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (customer.idcustomers && customer.idcustomers.toString().includes(searchTerm))
        );

        // เรียงลำดับผลลัพธ์การค้นหาตาม ID ลูกค้า
        const sortedFiltered = filtered.sort((a, b) => {
            const idA = parseInt(a.idcustomers) || 0;
            const idB = parseInt(b.idcustomers) || 0;
            return idA - idB;
        });

        setFilteredCustomers(sortedFiltered);
        setCurrentPage(1);
    };

    // คำนวณข้อมูลสำหรับ pagination
    const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentCustomers = filteredCustomers.slice(startIndex, endIndex);

    
    const handlePhoneChange = (e) => {
        const value = e.target.value.replace(/\D/g, ''); 
        if (value.length <= 10) {
            setNewCustomer(prev => ({ ...prev, phone: value }));
        }
    };

    const handleEditPhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // ลบทุกอย่างที่ไม่ใช่ตัวเลข
    if (value.length <= 10) {
        setEditCustomer(prev => ({ ...prev, phone: value }));
    }
};

    const loadCustomers = async () => {
        try {
            const response = await axios.get(
                config.api_path + "/customers", 
                config.headers()
            ); 
            if (response.data.result) {
                const sortedCustomers = response.data.result.sort((a, b) => {
                    const idA = parseInt(a.idcustomers) || 0;
                    const idB = parseInt(b.idcustomers) || 0;
                    return idA - idB;
                });
                
                setCustomers(sortedCustomers);
                setFilteredCustomers(sortedCustomers);
            }
        } catch (error) {
            console.error("Error loading customers:", error);
            Swal.fire({
                title: "Error",
                text: error.response?.data?.error || "Failed to load customers",
                icon: "error",
                timer: 3000,
            });
        }
    };

    const handleEdit = (customer) => {
        setEditCustomer(customer);
    };

    const handleSave = async () => {
        try {
            const response = await axios.put(
                config.api_path + "/customer/" + editCustomer.id, 
                editCustomer,
                config.headers()  
            );
            
            if (response.data.message === 'success') {
                setEditCustomer(null);
                loadCustomers();
                Swal.fire({
                    title: "สำเร็จ",
                    text: "อัปเดตข้อมูลลูกค้าเรียบร้อย",
                    icon: "success",
                    timer: 3000
                });
            }
        } catch (error) {
            console.error("Error updating customer:", error);
            if (error.response?.data?.error === "กรุณาเข้าสู่ระบบใหม่") {
                Swal.fire({
                    title: "เซสชันหมดอายุ",
                    text: "กรุณาเข้าสู่ระบบใหม่",
                    icon: "warning",
                    confirmButtonText: "เข้าสู่ระบบ",
                    timer: 3000
                }).then((result) => {
                    if (result.isConfirmed) {
                        // Redirect to login page or handle re-authentication
                        window.location.href = "/login";
                    }
                });
            } else {
                Swal.fire("Error", error.response?.data?.error || "ไม่สามารถอัปเดตข้อมูลลูกค้าได้", "error");
            }
        }
    };

    const handleGoToReward = (customer) => {
        navigate('/reward', { state: { selectedCustomer: customer } });
    };

    const handleCreateCustomer = async (e) => {
        e.preventDefault();
        
        // Validate phone number
        if (!/^\d{10}$/.test(newCustomer.phone)) {
            Swal.fire('Error', 'กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง (10 หลัก)', 'error');
            return;
        }

        try {
            const response = await axios.post(
                `${config.api_path}/customer`,
                newCustomer,
                config.headers()
            );

            if (response.data.message === 'success') {
                await loadCustomers();
                Swal.fire({
                    title: "สำเร็จ",
                    text: "เพิ่มข้อมูลลูกค้าเรียบร้อย",
                    icon: "success",
                    timer: 3000
                });
                setNewCustomer({ name: '', phone: '', email: '', address: '' });
                setShowForm(false);
            }
        } catch (error) {
            console.error('Error:', error);
            if (error.response?.data?.error === "กรุณาเข้าสู่ระบบใหม่") {
                Swal.fire('Error', 'กรุณาเข้าสู่ระบบใหม่', 'error');
            } else {
                Swal.fire('Error', error.response?.data?.error || 'ไม่สามารถเพิ่มข้อมูลลูกค้าได้', 'error');
            }
        }
    };

    return (
        <>
            <Template>
                <div className="container mt-4">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <div>
                            <h2>จัดการข้อมูลลูกค้า</h2>
                            <p className="text-muted mb-0">
                                <i className="fas fa-users me-2"></i>
                                จำนวนลูกค้าทั้งหมด: <span className="fw-bold text-primary">{customers.length}</span> คน
                                {searchTerm && (
                                    <span className="text-info ms-2">
                                        (แสดงผลลัพธ์: {filteredCustomers.length} คน)
                                    </span>
                                )}
                            </p>
                        </div>
                        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                            {showForm ? 'ปิดฟอร์ม' : 'เพิ่มลูกค้าใหม่'}
                        </button>
                    </div>

                    {/* ช่องค้นหา */}
                    <div className="row mb-4">
                        <div className="col-md-6">
                            <div className="input-group">
                                <span className="input-group-text">
                                    <i className="fas fa-search"></i>
                                </span>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="ค้นหาลูกค้า (รหัสลูกค้า, ชื่อ, เบอร์โทร, อีเมล)"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                {searchTerm && (
                                    <button
                                        className="btn btn-outline-secondary"
                                        type="button"
                                        onClick={() => setSearchTerm('')}
                                        title="ล้างการค้นหา"
                                    >
                                        <i className="fas fa-times"></i>
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div className="text-end">
                                <small className="text-muted">
                                    แสดง {startIndex + 1} - {Math.min(endIndex, filteredCustomers.length)} จาก {filteredCustomers.length} รายการ
                                </small>
                            </div>
                        </div>
                    </div>

                    {showForm && (
                        <div className="card mb-4">
                            <div className="card-body">
                                <h4 className="card-title">เพิ่มลูกค้าใหม่</h4>
                                <form onSubmit={handleCreateCustomer}>
                                    <div className="row">
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label">ชื่อลูกค้า *</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={newCustomer.name}
                                                onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                                                required
                                            />
                                        </div>
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label">เบอร์โทรศัพท์ *</label>
                                            <input
                                                type="tel"
                                                className="form-control"
                                                value={newCustomer.phone}
                                                onChange={handlePhoneChange}
                                                pattern="[0-9]{10}"
                                                title="กรุณากรอกเบอร์โทรศัพท์ 10 หลัก"
                                                required
                                            />
                                        </div>
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label">อีเมล *</label>
                                            <input
                                                type="email"
                                                className="form-control"
                                                value={newCustomer.email}
                                                onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                                                required
                                            />
                                        </div>
                                        
                                    </div>
                                    <button type="submit" className="btn btn-success">บันทึกข้อมูล</button>
                                </form>
                            </div>
                        </div>
                    )}

                    <table className="table table-striped">
                        <thead>
                            <tr>
                                <th width="80px">ลำดับ</th>
                                <th>รหัสลูกค้า</th>
                                <th>ชื่อ</th>
                                <th>เบอร์โทร</th>
                                <th>อีเมล</th>
                                <th>แต้ม</th>
                                <th>ยอดรวมที่ใช้</th>
                                <th>จัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentCustomers.map((customer, index) => (
                                <tr key={customer.id}>
                                    <td className="text-center fw-bold text-primary">
                                        {startIndex + index + 1}
                                    </td>
                                    <td className="text-center fw-bold text-info">
                                        {customer.idcustomers || 'ไม่มีรหัส'}
                                    </td>
                                    <td>
                                        {editCustomer?.id === customer.id ? (
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={editCustomer.name}
                                                onChange={(e) => setEditCustomer({...editCustomer, name: e.target.value})}
                                            />
                                        ) : customer.name}
                                    </td>
                                    <td>
                                        {editCustomer?.id === customer.id ? (
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={editCustomer.phone}
                                                onChange={handleEditPhoneChange}
                                            />
                                        ) : customer.phone}
                                    </td>
                                    <td>
                                        {editCustomer?.id === customer.id ? (
                                            <input
                                                type="email"
                                                className="form-control"
                                                value={editCustomer.email}
                                                onChange={(e) => setEditCustomer({...editCustomer, email: e.target.value})}
                                            />
                                        ) : customer.email}
                                    </td>
                                    <td>{customer.points}</td>
                                    <td>{customer.totalSpent}</td>
                                    <td>
                                        {editCustomer?.id === customer.id ? (
                                            <button className="btn btn-success me-2" onClick={handleSave}>
                                                บันทึก
                                            </button>
                                        ) : (
                                            <div className="d-flex gap-2">
                                                <button className="btn btn-primary btn-sm" onClick={() => handleEdit(customer)}>
                                                    แก้ไข
                                                </button>
                                                <button 
                                                    className="btn btn-warning btn-sm" 
                                                    onClick={() => handleGoToReward(customer)}
                                                    title="แลกของรางวัล"
                                                >
                                                    <i className="fas fa-gift me-1"></i>
                                                    แลกของรางวัล
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="d-flex justify-content-between align-items-center mt-4">
                            <div>
                                <p className="text-muted mb-0">
                                    หน้า {currentPage} จาก {totalPages} หน้า
                                </p>
                            </div>
                            <nav aria-label="Customer pagination">
                                <ul className="pagination pagination-sm mb-0">
                                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                        <button
                                            className="page-link"
                                            onClick={() => setCurrentPage(currentPage - 1)}
                                            disabled={currentPage === 1}
                                        >
                                            <i className="fas fa-chevron-left"></i> ก่อนหน้า
                                        </button>
                                    </li>
                                    
                                    {/* แสดงเลขหน้า */}
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let pageNum;
                                        if (totalPages <= 5) {
                                            pageNum = i + 1;
                                        } else if (currentPage <= 3) {
                                            pageNum = i + 1;
                                        } else if (currentPage >= totalPages - 2) {
                                            pageNum = totalPages - 4 + i;
                                        } else {
                                            pageNum = currentPage - 2 + i;
                                        }
                                        
                                        return (
                                            <li key={pageNum} className={`page-item ${currentPage === pageNum ? 'active' : ''}`}>
                                                <button
                                                    className="page-link"
                                                    onClick={() => setCurrentPage(pageNum)}
                                                >
                                                    {pageNum}
                                                </button>
                                            </li>
                                        );
                                    })}
                                    
                                    <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                                        <button
                                            className="page-link"
                                            onClick={() => setCurrentPage(currentPage + 1)}
                                            disabled={currentPage === totalPages}
                                        >
                                            ถัดไป <i className="fas fa-chevron-right"></i>
                                        </button>
                                    </li>
                                </ul>
                            </nav>
                        </div>
                    )}
                </div>
            </Template>

            <style jsx>{`
                @import url("https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&family=Sarabun:wght@300;400;500;600;700&family=Prompt:wght@300;400;500;600;700&display=swap");

                body,
                .card,
                .btn,
                .form-control,
                .table,
                input,
                select,
                textarea {
                    font-family: "Kanit", sans-serif !important;
                }

                h2, h4,
                .card-title {
                    font-family: "Kanit", sans-serif !important;
                    font-weight: 600 !important;
                }

                .table th {
                    font-family: "Kanit", sans-serif !important;
                    font-weight: 700 !important;
                }

                .form-label {
                    font-family: "Kanit", sans-serif !important;
                    font-weight: 600 !important;
                }

                .text-primary {
                    font-weight: 600 !important;
                }

                .fw-bold {
                    font-family: "Kanit", sans-serif !important;
                    font-weight: 700 !important;
                }

                /* Search input styling */
                .input-group {
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                    border-radius: 8px;
                    overflow: hidden;
                }

                .input-group-text {
                    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                    border: none;
                    color: #6c757d;
                }

                .input-group .form-control {
                    border: none;
                    box-shadow: none;
                }

                .input-group .form-control:focus {
                    box-shadow: none;
                    border-color: transparent;
                }

                /* Pagination styling */
                .pagination .page-link {
                    font-family: "Kanit", sans-serif !important;
                    font-weight: 600;
                    border: 1px solid #dee2e6;
                    color: #6c757d;
                    padding: 8px 12px;
                    transition: all 0.2s ease;
                }

                .pagination .page-link:hover {
                    background-color: #f8f9fa;
                    border-color: #adb5bd;
                    color: #495057;
                    transform: translateY(-1px);
                }

                .pagination .page-item.active .page-link {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-color: #667eea;
                    color: white;
                    box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
                }

                .pagination .page-item.disabled .page-link {
                    background-color: #f8f9fa;
                    border-color: #dee2e6;
                    color: #adb5bd;
                    cursor: not-allowed;
                }

                /* Search result info */
                .text-info {
                    color: #17a2b8 !important;
                    font-weight: 600;
                }

                /* Button improvements */
                .btn-outline-secondary {
                    border-color: #6c757d;
                    color: #6c757d;
                }

                .btn-outline-secondary:hover {
                    background-color: #6c757d;
                    border-color: #6c757d;
                    color: white;
                }
            `}</style>
        </>
    );
}

export default Customer;