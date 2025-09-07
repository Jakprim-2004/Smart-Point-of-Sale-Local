import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import axios from 'axios';
import config from "../config";

function DetailCustomer() {
    const [customer, setCustomer] = useState(null);
    const [activeTab, setActiveTab] = useState('purchase'); // เปลี่ยนจาก 'info' เป็น 'purchase'
    const [purchases, setPurchases] = useState([]);
    const [selectedBill, setSelectedBill] = useState(null);
    const [showBillModal, setShowBillModal] = useState(false);
    const [pointHistory, setPointHistory] = useState([]);
    const navigate = useNavigate();

    

    useEffect(() => {
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
        setCustomer(JSON.parse(customerData));
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
        switch(method?.toLowerCase()) {
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
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'ใช่, ออกจากระบบ',
            cancelButtonText: 'ยกเลิก'
        }).then((result) => {
            if (result.isConfirmed) {
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
            <div className="modal-dialog modal-lg">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">รายละเอียดบิล {selectedBill?.id}</h5>
                        <button type="button" className="btn-close" onClick={() => setShowBillModal(false)}></button>
                    </div>
                    <div className="modal-body">
                        {selectedBill && (
                            <>
                                <div className="mb-3">
                                    <p><strong>วันที่:</strong> {new Date(selectedBill.createdAt).toLocaleString()}</p>
                                    <p><strong>ชำระผ่าน:</strong> {getPaymentMethodThai(selectedBill.paymentMethod, selectedBill.description)}</p>
                                    <p><strong>ยอดรวม:</strong> {selectedBill.totalAmount?.toLocaleString()} บาท</p>
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
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>สินค้า</th>
                                            <th className="text-end">ราคา/หน่วย</th>
                                            <th className="text-end">จำนวน</th>
                                            <th className="text-end">รวม</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedBill.details?.map(detail => (
                                            <tr key={detail.id}>
                                                <td>{detail.productName || detail.Product?.name || 'ไม่พบชื่อสินค้า'}</td>
                                                <td className="text-end">
                                                    {parseFloat(detail.price || 0).toLocaleString()} บาท
                                                </td>
                                                <td className="text-end">
                                                    {detail.qty || 0}
                                                </td>
                                                <td className="text-end">
                                                    {detail.subtotal?.toLocaleString()} บาท
                                                </td>
                                            </tr>
                                        ))}
                                       
                                    </tbody>
                                    <tbody>
                                        
                                    </tbody>
                                </table>
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
                <div className="table-responsive">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>วันที่</th>
                                <th>เลขที่บิล</th>
                                <th>วิธีชำระ</th>
                                <th>ยอดซื้อ</th>
                                <th>แต้มที่ได้รับ</th>
                                <th>การจัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {purchases.map(bill => (
                                <tr key={bill.id}>
                                    <td>{new Date(bill.createdAt).toLocaleString()}</td>
                                    <td>{bill.id}</td>
                                    <td>
                                        <small>{getPaymentMethodThai(bill.paymentMethod, bill.description)}</small>
                                    </td>
                                    <td>{bill.totalAmount?.toLocaleString()} บาท</td>
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
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    if (!customer) return <div>Loading...</div>;

    return (
        <div className="container mt-5">
            {/* ข้อมูลลูกค้า */}
            <div className="card mb-4">
                <div className="card-header">
                    <div className="d-flex justify-content-between align-items-center">
                        <h3 className="mb-0">ข้อมูลลูกค้า</h3>
                        <div>
                            <button className="btn btn-danger ms-auto" onClick={handleLogout}>ออกจากระบบ</button>
                        </div>
                    </div>
                </div>
                <div className="card-body">
                    <div className="row">
                        <div className="col-md-6">
                            <p><strong>ชื่อ:</strong> {customer.name}</p>
                            <p><strong>เบอร์โทร:</strong> {customer.phone}</p>
                            <p><strong>อีเมล:</strong> {customer.email || '-'}</p>
                        </div>
                        <div className="col-md-6">
                            <p><strong>แต้มสะสม:</strong> {customer.points}</p>
                            <p><strong>ระดับสมาชิก:</strong> {customer.membershipTier}</p>
                            <p><strong>ยอดใช้จ่ายสะสม:</strong> {customer.totalSpent}</p>
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
                        onClick={() => setActiveTab('points')}
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
                        <div className="table-responsive">
                            <table className="table">
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
                                                        ? `-${transaction.points}`
                                                        : `+${transaction.points}`}
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

                .container {
                    font-family: "Kanit", sans-serif !important;
                }
            `}</style>
        </div>
    );
}

export default DetailCustomer;
