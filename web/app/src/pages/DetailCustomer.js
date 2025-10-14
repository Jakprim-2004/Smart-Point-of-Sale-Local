import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import axios from 'axios';
import config from "../config";

function DetailCustomer() {
    const [customer, setCustomer] = useState(null);
    const [activeTab, setActiveTab] = useState('purchase'); 
    const [purchases, setPurchases] = useState([]);
    const [selectedBill, setSelectedBill] = useState(null);
    const [showBillModal, setShowBillModal] = useState(false);
    const [pointHistory, setPointHistory] = useState([]);
    const navigate = useNavigate();



    // ฟังก์ชันโหลดข้อมูลลูกค้าจาก API
    const loadCustomerData = async (customerId) => {
        try {
            const response = await axios.get(`${config.api_path}/customer/${customerId}`);
            if (response.data.result) {
                setCustomer(response.data.result);
            } else {
                throw new Error('ไม่พบข้อมูลลูกค้า');
            }
        } catch (error) {
            console.error('Error loading customer data:', error);
            Swal.fire({
                title: 'เกิดข้อผิดพลาด',
                text: 'ไม่สามารถโหลดข้อมูลลูกค้าได้',
                icon: 'error'
            }).then(() => {
                navigate('/login/customer');
            });
        }
    };

    useEffect(() => {
        // ตรวจสอบว่ามีข้อมูล customerId ใน localStorage หรือไม่
        const customerData = localStorage.getItem('customerData');
        if (!customerData) {
            Swal.fire({
                title: 'กรุณาเข้าสู่ระบบ',
                icon: 'warning'
            }).then(() => {
                navigate('/login/customer');
            });
            return;
        }

        // ใช้เฉพาะ ID จาก localStorage แล้วดึงข้อมูลจาก API
        const parsedCustomer = JSON.parse(customerData);
        loadCustomerData(parsedCustomer.id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [navigate]);

    // โหลดข้อมูลประวัติการซื้อ
    const loadPurchaseHistory = async () => {
        try {
            const response = await axios.get(`${config.api_path}/customer/${customer.id}/purchases`);
            // Remove /api from the path ----------------^
            if (response.data.success) {
                setPurchases(response.data.result);
            }
        } catch (error) {
            console.error('Load purchase history error:', error);
            Swal.fire({
                title: 'เกิดข้อผิดพลาด',
                text: 'ไม่สามารถโหลดประวัติการซื้อได้',
                icon: 'error'
            });
        }
    };

    useEffect(() => {
        if (customer) {
            loadPurchaseHistory();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [customer]);

    const handleViewBillDetail = async (billId) => {
        try {
            const response = await axios.get(`${config.api_path}/bill/${billId}`);
            // Remove /api from the path ----------^
            if (response.data.success) {
                setSelectedBill(response.data.result);
                setShowBillModal(true);
            }
        } catch (error) {
            console.error('View bill detail error:', error);
            Swal.fire({
                title: 'เกิดข้อผิดพลาด',
                text: 'ไม่สามารถดูรายละเอียดบิลได้',
                icon: 'error'
            });
        }
    };

    const getPaymentMethodThai = (method, description = '') => {
        switch (method?.toLowerCase()) {
            case 'promptpay':
                return 'พร้อมเพย์';
            case 'cash':
                return 'เงินสด';
            case 'split':
                // แยกข้อมูลการชำระแบบผสมจาก description
                if (description && description.includes('ชำระแบบผสม')) {
                    const splitInfo = description.split(' | ').find(part => part.includes('ชำระแบบผสม'));
                    if (splitInfo) {
                        const paymentDetails = splitInfo.replace('ชำระแบบผสม - ', '');
                        return `ชำระแบบผสม (${paymentDetails})`;
                    }
                }
                return 'ชำระแบบผสม';
            default:
                return method || '-';
        }
    };

    const handleLogout = () => {
        Swal.fire({
            title: 'ยืนยันการออกจากระบบ',
            text: "คุณต้องการออกจากระบบใช่หรือไม่?",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '',
            confirmButtonText: 'ออกจากระบบ',
            cancelButtonText: 'ยกเลิก'
        }).then((result) => {
            if (result.isConfirmed) {
                // ล้างข้อมูลใน localStorage
                localStorage.removeItem('customerData');

                Swal.fire({
                    title: 'ออกจากระบบสำเร็จ',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                }).then(() => {
                    navigate('/login/customer');
                });
            }
        });
    };

    // เพิ่ม useEffect สำหรับโหลดประวัติการใช้แต้ม
    const loadPointHistory = async () => {
        try {
            const response = await axios.get(
                `${config.api_path}/customer/${customer.id}/point-history`
            );
            if (response.data.success) {
                setPointHistory(response.data.result);
            }
        } catch (error) {
            console.error('Error loading point history:', error);
            Swal.fire({
                title: 'เกิดข้อผิดพลาด',
                text: 'ไม่สามารถโหลดประวัติการใช้แต้มได้',
                icon: 'error'
            });
        }
    };

    useEffect(() => {
        if (customer?.id) {
            loadPointHistory();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [customer]);

    // Component สำหรับแสดง Modal รายละเอียดบิล
    const BillDetailModal = () => (
        <div className={`modal fade ${showBillModal ? 'show' : ''}`}
            style={{ display: showBillModal ? 'block' : 'none' }}>
            <div className="modal-dialog modal-lg modal-dialog-scrollable">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">รายละเอียดบิล {selectedBill?.id}</h5>
                        <button type="button" className="btn-close" onClick={() => setShowBillModal(false)}></button>
                    </div>
                    <div className="modal-body">
                        {selectedBill && (
                            <>
                                <div className="mb-3 bill-info">
                                    <p><strong>วันที่:</strong> {new Date(selectedBill.createdAt).toLocaleString('th-TH')}</p>
                                    <p><strong>ชำระผ่าน:</strong> {getPaymentMethodThai(selectedBill.paymentMethod, selectedBill.description)}</p>
                                    <p><strong>ยอดรวม:</strong> {selectedBill.totalAmount?.toLocaleString("th-TH")} บาท</p>
                                    {/* แสดงรายละเอียดเพิ่มเติมสำหรับการใช้แต้ม */}
                                    {selectedBill.description && selectedBill.description.includes('ใช้แต้มสะสม') && (
                                        <div className="alert alert-info">
                                            <small>
                                                <i className="fas fa-star me-1"></i>
                                                {selectedBill.description.split(' | ').find(part => part.includes('ใช้แต้มสะสม'))}
                                            </small>
                                        </div>
                                    )}
                                </div>
                                <div className="table-responsive">
                                    <table className="table table-striped bill-detail-table">
                                        <thead>
                                            <tr>
                                                <th>สินค้า</th>
                                                <th className="text-center">ราคา/หน่วย</th>
                                                <th className="text-center">จำนวน</th>
                                                <th className="text-end">รวม</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedBill.details?.map(detail => (
                                                <tr key={detail.id}>
                                                    <td className="product-name">{detail.productName || detail.Product?.name || 'ไม่พบชื่อสินค้า'}</td>
                                                    <td className="text-center price-cell">
                                                        {parseFloat(detail.price || 0).toLocaleString("th-TH")} บาท
                                                    </td>
                                                    <td className="text-center qty-cell">
                                                        {detail.qty || 0}
                                                    </td>
                                                    <td className="text-end total-cell">
                                                        {detail.subtotal?.toLocaleString("th-TH")} บาท
                                                    </td>
                                                </tr>
                                            ))}

                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    // แทนที่ส่วนแสดงประวัติการซื้อเดิม
    const PurchaseHistory = () => (
        <div className="card">
            <div className="card-header">
                <h5>ประวัติการซื้อ</h5>
            </div>
            <div className="card-body">
                {/* แสดงแบบตารางสำหรับหน้าจอใหญ่ */}
                <div className="table-responsive d-none d-md-block">
                    <table className="table table-striped">
                        <thead>
                            <tr>
                                <th>วันที่</th>
                                <th>เลขที่บิล</th>
                                <th>วิธีชำระ</th>
                                <th>ยอดซื้อ (บาท)</th>
                                <th>แต้มที่ได้รับ</th>
                                <th>การจัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {purchases.length > 0 ? purchases.map(bill => (
                                <tr key={bill.id}>
                                    <td>{new Date(bill.createdAt).toLocaleString('th-TH')}</td>
                                    <td>{bill.id}</td>
                                    <td>
                                        <small>{getPaymentMethodThai(bill.paymentMethod, bill.description)}</small>
                                    </td>
                                    <td>{bill.totalAmount?.toLocaleString("th-TH")} บาท</td>
                                    <td>{Math.floor(bill.totalAmount / 100)}</td>
                                    <td>
                                        <button
                                            className="btn btn-info btn-sm"
                                            onClick={() => handleViewBillDetail(bill.id)}
                                        >
                                            ดูรายละเอียด
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="6" className="text-center">ไม่พบประวัติการซื้อ</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* แสดงแบบการ์ดสำหรับมือถือ */}
                <div className="d-md-none">
                    {purchases.length > 0 ? purchases.map(bill => (
                        <div key={bill.id} className="card mb-3 purchase-card">
                            <div className="card-body">
                                <div className="row mb-2">
                                    <div className="col-6">
                                        <small className="text-muted">เลขที่บิล</small>
                                        <div className="fw-bold">{bill.id}</div>
                                    </div>
                                    <div className="col-6 text-end">
                                        <small className="text-muted">แต้มที่ได้รับ</small>
                                        <div className="badge bg-success">{Math.floor(bill.totalAmount / 100)}</div>
                                    </div>
                                </div>
                                <div className="mb-2">
                                    <small className="text-muted d-block">
                                        <i className="fas fa-calendar me-1"></i>
                                        {new Date(bill.createdAt).toLocaleDateString('th-TH', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </small>
                                </div>
                                <div className="row mb-2">
                                    <div className="col-6">
                                        <small className="text-muted d-block">ชำระผ่าน</small>
                                        <small className="fw-bold">{getPaymentMethodThai(bill.paymentMethod, bill.description)}</small>
                                    </div>
                                    <div className="col-6 text-end">
                                        <small className="text-muted d-block">ยอดซื้อ</small>
                                        <div className="text-success fw-bold">{parseFloat(bill.totalAmount)?.toLocaleString("th-TH")}</div>
                                    </div>
                                </div>
                                <button
                                    className="btn btn-info btn-sm w-100"
                                    onClick={() => handleViewBillDetail(bill.id)}
                                >
                                    <i className="fas fa-receipt me-1"></i> ดูรายละเอียด
                                </button>
                            </div>
                        </div>
                    )) : (
                        <div className="text-center text-muted py-4">
                            <i className="fas fa-shopping-cart fa-3x mb-3"></i>
                            <p>ไม่พบประวัติการซื้อ</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    if (!customer) return (
        <div className="container mt-5">
            <div className="text-center">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-2">กำลังโหลดข้อมูลลูกค้า...</p>
            </div>
        </div>
    );

    return (
        <div className="container-fluid px-2 px-md-3 mt-3 mt-md-5">
            {/* ข้อมูลลูกค้า */}
            <div className="card mb-3 mb-md-4">
                <div className="card-header">
                    <div className="d-flex justify-content-between align-items-center flex-wrap">
                        <h3 className="mb-2 mb-md-0 customer-title">ข้อมูลลูกค้า</h3>
                        <div>
                            <button className="btn btn-danger btn-sm btn-md-normal" onClick={handleLogout}>
                                <i className="fas fa-sign-out-alt me-1"></i>ออกจากระบบ
                            </button>
                        </div>
                    </div>
                </div>
                <div className="card-body">
                    <div className="row">
                        <div className="col-12 col-md-6 mb-3 mb-md-0">
                            <p className="info-item"><strong>รหัสลูกค้า:</strong> {customer.idcustomers || 'ไม่มีรหัส'}</p>
                            <p className="info-item"><strong>ชื่อ:</strong> {customer.name}</p>
                            <p className="info-item"><strong>เบอร์โทร:</strong> {customer.phone}</p>
                            <p className="info-item"><strong>อีเมล:</strong> {customer.email || '-'}</p>
                        </div>
                        <div className="col-12 col-md-6">
                            <p className="info-item">
                                <strong>แต้มสะสม:</strong>
                                <span className="badge bg-primary ms-2 point-badge">
                                    <i className="fas fa-star me-1"></i>
                                    {customer.points} แต้ม
                                </span>
                            </p>
                            <p className="info-item">
                                <strong>ระดับสมาชิก:</strong>
                                <span className="badge bg-secondary ms-2">{customer.membershipTier}</span>
                            </p>
                            <p className="info-item">
                                <strong>ยอดใช้จ่ายสะสม:</strong>
                                <span className="text-success fw-bold d-block d-md-inline mt-1 mt-md-0">
                                    {parseFloat(customer.totalSpent).toLocaleString("th-TH")} บาท
                                </span>
                            </p>
                        </div>
                    </div>
                    <div className="row mt-2">
                        <div className="col-12">
                            <small className="text-muted update-time">
                                <i className="fas fa-clock me-1"></i>
                                อัพเดตล่าสุด: {new Date(customer.updatedAt).toLocaleString('th-TH', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </small>
                        </div>
                    </div>
                </div>
            </div>

            {/* แท็บเมนู */}
            <ul className="nav nav-tabs mb-4">
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === 'purchase' ? 'active' : ''}`}
                        onClick={() => setActiveTab('purchase')}
                    >
                        ประวัติการซื้อ
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === 'points' ? 'active' : ''}`}
                        onClick={() => {
                            setActiveTab('points');
                            // รีเฟรชข้อมูลลูกค้าแบบเงียบๆ ไม่แจ้งเตือน
                            loadCustomerData(customer.id);
                        }}
                    >
                        ประวัติการใช้แต้ม
                    </button>
                </li>
            </ul>

            {/* แสดงประวัติการซื้อ */}
            {activeTab === 'purchase' && <PurchaseHistory />}

            {/* แสดงประวัติการใช้แต้ม */}
            {activeTab === 'points' && (
                <div className="card">
                    <div className="card-header">
                        <h5>ประวัติการใช้แต้ม</h5>
                    </div>
                    <div className="card-body">
                        {/* แสดงแบบตารางสำหรับหน้าจอใหญ่ */}
                        <div className="table-responsive d-none d-md-block">
                            <table className="table table-striped">
                                <thead>
                                    <tr>
                                        <th>วันที่</th>
                                        <th>รายการ</th>
                                        <th>ประเภท</th>
                                        <th>แต้ม</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pointHistory.length > 0 ? (
                                        pointHistory.map((transaction) => (
                                            <tr key={transaction.id}>
                                                <td>
                                                    {new Date(transaction.transactionDate).toLocaleDateString('th-TH', {
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </td>
                                                <td>{transaction.description}</td>
                                                <td>
                                                    {transaction.transactionType === 'REDEEM_REWARD' ?
                                                        'แลกของรางวัล' : 'ส่วนลด'}
                                                </td>
                                                <td className={
                                                    transaction.transactionType === 'REDEEM_REWARD' ||
                                                        transaction.transactionType === 'DISCOUNT'
                                                        ? 'text-danger'
                                                        : 'text-success'
                                                }>
                                                    {transaction.transactionType === 'REDEEM_REWARD' ||
                                                        transaction.transactionType === 'DISCOUNT'
                                                        ? `-${transaction.points.toLocaleString("th-TH")}`
                                                        : `+${transaction.points.toLocaleString("th-TH")}`}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="text-center">
                                                ไม่พบประวัติการใช้แต้ม
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* แสดงแบบการ์ดสำหรับมือถือ */}
                        <div className="d-md-none">
                            {pointHistory.length > 0 ? pointHistory.map((transaction) => (
                                <div key={transaction.id} className="card mb-3 point-history-card">
                                    <div className="card-body">
                                        <div className="d-flex justify-content-between align-items-start mb-2">
                                            <div>
                                                <div className="fw-bold mb-1">{transaction.description}</div>
                                                <small className="text-muted">
                                                    <i className="fas fa-calendar me-1"></i>
                                                    {new Date(transaction.transactionDate).toLocaleDateString('th-TH', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </small>
                                            </div>
                                            <div className={`fs-5 fw-bold ${transaction.transactionType === 'REDEEM_REWARD' ||
                                                    transaction.transactionType === 'DISCOUNT'
                                                    ? 'text-danger'
                                                    : 'text-success'
                                                }`}>
                                                {transaction.transactionType === 'REDEEM_REWARD' ||
                                                    transaction.transactionType === 'DISCOUNT'
                                                    ? `-${transaction.points.toLocaleString("th-TH")}`
                                                    : `+${transaction.points.toLocaleString("th-TH")}`}
                                            </div>
                                        </div>
                                        <div className="mt-2">
                                            <span className="badge bg-secondary">
                                                {transaction.transactionType === 'REDEEM_REWARD' ?
                                                    'แลกของรางวัล' : 'ส่วนลด'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center text-muted py-4">
                                    <i className="fas fa-star fa-3x mb-3"></i>
                                    <p>ไม่พบประวัติการใช้แต้ม</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            <BillDetailModal />

            <style jsx>{`
                @import url("https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&family=Sarabun:wght@300;400;500;600;700&family=Prompt:wght@300;400;500;600;700&display=swap");

                body,
                .card,
                .btn,
                .form-control,
                .table,
                input,
                select,
                textarea,
                .modal-body,
                .modal-content {
                    font-family: "Kanit", sans-serif !important;
                }

                h3, h5,
                .card-title,
                .modal-title {
                    font-family: "Kanit", sans-serif !important;
                    font-weight: 600 !important;
                }

                .table th {
                    font-family: "Kanit", sans-serif !important;
                    font-weight: 700 !important;
                }

                .nav-link {
                    font-family: "Kanit", sans-serif !important;
                    font-weight: 600 !important;
                }

                strong {
                    font-family: "Kanit", sans-serif !important;
                    font-weight: 600 !important;
                }

                .text-success,
                .text-danger {
                    font-weight: 600 !important;
                }

                .container, .container-fluid {
                    font-family: "Kanit", sans-serif !important;
                }

                /* Mobile Responsive Styles */
                @media (max-width: 768px) {
                    .container-fluid {
                        padding-left: 10px !important;
                        padding-right: 10px !important;
                    }

                    .customer-title {
                        font-size: 1.3rem !important;
                    }

                    .info-item {
                        font-size: 0.9rem;
                        margin-bottom: 0.75rem;
                    }

                    .point-badge {
                        font-size: 0.85rem !important;
                        padding: 0.4rem 0.6rem !important;
                    }

                    .update-time {
                        font-size: 0.75rem;
                    }

                    .btn-sm {
                        font-size: 0.8rem;
                        padding: 0.4rem 0.8rem;
                    }

                    .nav-tabs {
                        border-bottom: 2px solid #dee2e6;
                        margin-bottom: 1rem !important;
                    }

                    .nav-tabs .nav-link {
                        font-size: 0.9rem;
                        padding: 0.5rem 0.75rem;
                    }

                    .card-header h5 {
                        font-size: 1.1rem !important;
                    }

                    /* Purchase Card Mobile Styles */
                    .purchase-card {
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        border-radius: 8px;
                    }

                    .purchase-card .card-body {
                        padding: 1rem;
                    }

                    /* Point History Card Mobile Styles */
                    .point-history-card {
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        border-radius: 8px;
                    }

                    .point-history-card .card-body {
                        padding: 1rem;
                    }

                    /* Modal Mobile Adjustments */
                    .modal-dialog {
                        margin: 0.5rem !important;
                        max-width: calc(100% - 1rem) !important;
                    }

                    .modal-content {
                        border-radius: 8px;
                    }

                    .modal-title {
                        font-size: 1.1rem !important;
                    }

                    .modal-body {
                        padding: 1rem;
                    }

                    .bill-info p {
                        font-size: 0.9rem;
                        margin-bottom: 0.5rem;
                    }

                    /* Bill Detail Table Mobile */
                    .bill-detail-table {
                        font-size: 0.85rem;
                    }

                    .bill-detail-table th {
                        padding: 0.5rem 0.3rem;
                        font-size: 0.8rem;
                    }

                    .bill-detail-table td {
                        padding: 0.5rem 0.3rem;
                    }

                    .bill-detail-table .product-name {
                        max-width: 120px;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    }

                    .bill-detail-table .price-cell,
                    .bill-detail-table .qty-cell,
                    .bill-detail-table .total-cell {
                        font-size: 0.75rem;
                        white-space: nowrap;
                    }

                    /* Alert Messages Mobile */
                    .alert {
                        font-size: 0.85rem;
                        padding: 0.6rem;
                    }

                    /* Badge Mobile Adjustments */
                    .badge {
                        font-size: 0.8rem;
                        padding: 0.35rem 0.5rem;
                    }

                    /* Empty State Icons */
                    .fa-3x {
                        font-size: 2rem !important;
                    }
                }

                /* Tablet Adjustments */
                @media (min-width: 769px) and (max-width: 991px) {
                    .customer-title {
                        font-size: 1.5rem !important;
                    }

                    .nav-tabs .nav-link {
                        font-size: 0.95rem;
                    }
                }

                /* Smooth Transitions */
                .card, .btn, .badge, .nav-link {
                    transition: all 0.3s ease;
                }

                .purchase-card:hover,
                .point-history-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
                }

                /* Better Touch Targets for Mobile */
                @media (max-width: 768px) {
                    .btn {
                        min-height: 38px;
                        min-width: 44px;
                    }

                    .nav-link {
                        min-height: 44px;
                    }
                }

                /* Improve readability on small screens */
                @media (max-width: 576px) {
                    body {
                        font-size: 14px;
                    }

                    .customer-title {
                        font-size: 1.2rem !important;
                    }

                    .card-header {
                        padding: 0.75rem;
                    }

                    .card-body {
                        padding: 0.75rem;
                    }
                }
            `}</style>
        </div>
    );
}

export default DetailCustomer;
