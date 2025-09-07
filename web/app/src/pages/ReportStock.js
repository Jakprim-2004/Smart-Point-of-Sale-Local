// ...existing code...
import { useEffect, useState } from "react";
import Template from "../components/Template";
import Swal from "sweetalert2";
import axios from "axios";
import config from "../config";
import Modal from "../components/Modal";
import * as dayjs from 'dayjs';

function ReportStock() {
    const [stocks, setStocks] = useState([]);
    const [currentStock, setCurrentStock] = useState({});
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(30);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            await axios.get(config.api_path + '/stock/report', config.headers()).then(res => {
                if (res.data.message === 'success') {
                    // เรียงลำดับตามชื่อสินค้าภาษาไทย (ก-ฮ)
                    const collator = new Intl.Collator("th-TH", {
                        numeric: true,
                        caseFirst: "lower",
                    });

                    const sortedStocks = res.data.results.sort((a, b) => {
                        return collator.compare(a.result.name, b.result.name);
                    });

                    setStocks(sortedStocks);
                }
            })
        } catch (e) {
            Swal.fire({
                title: 'error',
                text: e.message,
                icon: 'error'
            })
        }
    }

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1); // รีเซ็ตไปหน้าแรกเมื่อค้นหา
    };

    return (
        <>
            {/* ...existing code... */}
            <Template>
                <div className="card shadow-sm border-0">
                    <div className="card-header bg-primary text-white py-3">
                        <h4 className="card-title mb-0 font-weight-bold">
                            <i className="fas fa-chart-bar me-2"></i>
                            รายงาน Stock
                        </h4>
                    </div>
                    <div className="card-body bg-light">
                        <div className="d-flex flex-wrap align-items-center mb-4 gap-2">
                            <div className="ml-auto" style={{ minWidth: 300 }}>
                                <div className="input-group">
                                    <span
                                        className="input-group-text bg-white border-0"
                                        style={{ borderRadius: "20px 0 0 20px" }}
                                    >
                                        <i className="fa fa-search text-muted"></i>
                                    </span>
                                    <input
                                        type="text"
                                        className="form-control border-0 shadow-sm"
                                        placeholder="ค้นหาสินค้า, บาร์โค้ด, หมวดหมู่..."
                                        onChange={handleSearch}
                                        style={{
                                            borderRadius: "0 20px 20px 0",
                                            background: "#f8f9fa",
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="table-responsive">
                            <table
                                className="table table-hover table-bordered shadow-sm bg-white"
                                style={{ borderRadius: "12px", overflow: "hidden" }}
                            >
                                <thead className="thead-light">
                                    <tr style={{ background: "#f1f3f6" }}>
                                        <th
                                            className="py-3"
                                            style={{
                                                fontFamily: "Kanit, sans-serif",
                                                fontWeight: 600,
                                            }}
                                            width="80px"
                                        >
                                            ลำดับ
                                        </th>
                                        <th
                                            className="py-3"
                                            style={{
                                                fontFamily: "Kanit, sans-serif",
                                                fontWeight: 600,
                                            }}
                                        >
                                            บาร์โค้ด
                                        </th>
                                        <th
                                            className="py-3"
                                            style={{
                                                fontFamily: "Kanit, sans-serif",
                                                fontWeight: 600,
                                            }}
                                        >
                                            รายการ
                                        </th>
                                        <th
                                            className="py-3"
                                            style={{
                                                fontFamily: "Kanit, sans-serif",
                                                fontWeight: 600,
                                            }}
                                        >
                                            หน่วย
                                        </th>
                                        <th
                                            className="py-3 text-end"
                                            style={{
                                                fontFamily: "Kanit, sans-serif",
                                                fontWeight: 600,
                                            }}
                                        >
                                            รับเข้า
                                        </th>
                                        <th
                                            className="py-3 text-end"
                                            style={{
                                                fontFamily: "Kanit, sans-serif",
                                                fontWeight: 600,
                                            }}
                                        >
                                            ขายออก
                                        </th>
                                        <th
                                            className="py-3 text-end"
                                            style={{
                                                fontFamily: "Kanit, sans-serif",
                                                fontWeight: 600,
                                            }}
                                        >
                                            คงเหลือ
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {(() => {
                                        const filteredStocks = stocks.filter((item) =>
                                            item.result.name.includes(searchTerm) ||
                                            item.result.barcode.includes(searchTerm) ||
                                            (item.result.category && item.result.category.includes(searchTerm))
                                        );

                                        // คำนวณ pagination
                                        const totalItems = filteredStocks.length;
                                        const totalPages = Math.ceil(totalItems / itemsPerPage);
                                        const startIndex = (currentPage - 1) * itemsPerPage;
                                        const endIndex = startIndex + itemsPerPage;
                                        const currentItems = filteredStocks.slice(startIndex, endIndex);

                                        return currentItems.length > 0 ? (
                                            currentItems.map((item, index) => {
                                                const remaining = item.stockIn - item.stockOut;
                                                const isLowStock = remaining <= 10;
                                                const isOutOfStock = remaining === 0;
                                                
                                                return (
                                                    <tr key={index} className={`align-middle ${isOutOfStock ? 'table-danger' : isLowStock ? 'table-warning' : ''}`}>
                                                        <td className="py-2 text-center">
                                                            <span className="badge badge-secondary mr-2" style={{ fontSize: '12px' }}>
                                                                {startIndex + index + 1}
                                                            </span>
                                                        </td>
                                                        <td className="py-2">{item.result.barcode}</td>
                                                        <td className="py-2">
                                                            <div className="fw-bold">{item.result.name}</div>
                                                            {item.result.category && (
                                                                <small className="text-muted">{item.result.category}</small>
                                                            )}
                                                            {isOutOfStock && (
                                                                <span className="badge bg-danger ms-2">หมดสต็อก</span>
                                                            )}
                                                            {isLowStock && !isOutOfStock && (
                                                                <span className="badge bg-warning text-dark ms-2">เหลือน้อย</span>
                                                            )}
                                                        </td>
                                                        <td className="py-2">{item.result.units_of_measure}</td>
                                                        <td className="text-end py-2">
                                                            <button
                                                                onClick={e => setCurrentStock(item)}
                                                                data-bs-toggle="modal"
                                                                data-bs-target="#modalStockIn"
                                                                className="btn btn-link text-success p-0 fw-bold"
                                                                style={{ textDecoration: 'none' }}
                                                            >
                                                                {item.stockIn.toLocaleString('th-TH')}
                                                            </button>
                                                        </td>
                                                        <td className="text-end py-2">
                                                            <button
                                                                onClick={e => setCurrentStock(item)}
                                                                data-bs-toggle="modal"
                                                                data-bs-target="#modalStockOut"
                                                                className="btn btn-link text-danger p-0 fw-bold"
                                                                style={{ textDecoration: 'none' }}
                                                            >
                                                                {item.stockOut.toLocaleString('th-TH')}
                                                            </button>
                                                        </td>
                                                        <td className="text-end py-2">
                                                            <span className={`badge fs-6 ${isOutOfStock ? 'bg-danger' : isLowStock ? 'bg-warning text-dark' : 'bg-success text-white'}`}>
                                                                {remaining.toLocaleString('th-TH')}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan="7" className="text-center text-muted py-4">
                                                    <i className="fa fa-chart-bar mb-2 fa-2x"></i>
                                                    <p>{searchTerm ? `ไม่พบข้อมูลที่ตรงกับ "${searchTerm}"` : 'ไม่มีข้อมูลรายงาน'}</p>
                                                </td>
                                            </tr>
                                        );
                                    })()}
                                </tbody>
                            </table>
                        </div>

                        {/* แสดงข้อมูลจำนวนรายการและ Pagination */}
                        {(() => {
                            const filteredStocks = stocks.filter((item) =>
                                item.result.name.includes(searchTerm) ||
                                item.result.barcode.includes(searchTerm) ||
                                (item.result.category && item.result.category.includes(searchTerm))
                            );

                            const totalItems = filteredStocks.length;
                            const totalPages = Math.ceil(totalItems / itemsPerPage);
                            const startIndex = (currentPage - 1) * itemsPerPage;
                            const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

                            return totalItems > 0 ? (
                                <div className="d-flex justify-content-between align-items-center mt-4">
                                    <div className="text-muted">
                                        <small>
                                            แสดงรายการที่ {startIndex + 1} - {endIndex} จากทั้งหมด {totalItems} รายการ
                                        </small>
                                    </div>
                                    
                                    {totalPages > 1 && (
                                        <nav aria-label="Report pagination">
                                            <ul className="pagination pagination-sm mb-0">
                                                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                                    <button
                                                        className="page-link"
                                                        onClick={() => setCurrentPage(currentPage - 1)}
                                                        disabled={currentPage === 1}
                                                        title="หน้าก่อนหน้า"
                                                    >
                                                        <i className="fa fa-chevron-left"></i>
                                                    </button>
                                                </li>

                                                {/* แสดงหน้าแรก */}
                                                {currentPage > 3 && (
                                                    <>
                                                        <li className="page-item">
                                                            <button className="page-link" onClick={() => setCurrentPage(1)}>
                                                                1
                                                            </button>
                                                        </li>
                                                        {currentPage > 4 && (
                                                            <li className="page-item disabled">
                                                                <span className="page-link">...</span>
                                                            </li>
                                                        )}
                                                    </>
                                                )}

                                                {/* แสดงหน้าปัจจุบันและข้างเคียง */}
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

                                                    if (pageNum < 1 || pageNum > totalPages) return null;

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

                                                {/* แสดงหน้าสุดท้าย */}
                                                {currentPage < totalPages - 2 && (
                                                    <>
                                                        {currentPage < totalPages - 3 && (
                                                            <li className="page-item disabled">
                                                                <span className="page-link">...</span>
                                                            </li>
                                                        )}
                                                        <li className="page-item">
                                                            <button className="page-link" onClick={() => setCurrentPage(totalPages)}>
                                                                {totalPages}
                                                            </button>
                                                        </li>
                                                    </>
                                                )}

                                                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                                                    <button
                                                        className="page-link"
                                                        onClick={() => setCurrentPage(currentPage + 1)}
                                                        disabled={currentPage === totalPages}
                                                        title="หน้าถัดไป"
                                                    >
                                                        <i className="fa fa-chevron-right"></i>
                                                    </button>
                                                </li>
                                            </ul>
                                        </nav>
                                    )}
                                </div>
                            ) : null;
                        })()}
                    </div>
                </div>
            </Template>

            <Modal id="modalStockIn" title="ข้อมูลการรับเข้าสต้อก" modalSize="modal-lg">
                <table className="table table-bordered table-striped">
                    <thead>
                        <tr>
                            <th width="120px">barcode</th>
                            <th>รายการ</th>
                            <th width="100px" className="text-end">จำนวน</th>
                            <th width="150px" className="text-center">วันที่</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentStock.result !== undefined ? currentStock.result.stocks.map(item =>
                            <tr>
                                <td>{item.product.barcode}</td>
                                <td>{item.product.name}</td>
                                <td className="text-end">{item.qty}</td>
                                <td className="text-center">
                                    {dayjs(item.createdAt).format('DD/MM/YYYY HH:mm')}
                                </td>
                            </tr>
                        ) : ''}
                    </tbody>
                </table>
            </Modal>

            <Modal id="modalStockOut" title="ข้อมูลการขาย" modalSize="modal-lg">
                <table className="table table-bordered table-striped">
                    <thead>
                        <tr>
                            <th width="120px">barcode</th>
                            <th>รายการ</th>
                            <th width="100px" className="text-end">จำนวน</th>
                            <th width="150px" className="text-center">วันที่</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentStock.result !== undefined ? currentStock.result.billSaleDetails.map(item =>
                            <tr>
                                <td>{item.product.barcode}</td>
                                <td>{item.product.name}</td>
                                <td className="text-end">{item.qty}</td>
                                <td className="text-center">
                                    {dayjs(item.createdAt).format('DD/MM/YYYY HH:mm')}
                                </td>
                            </tr>
                        ) : ''}
                    </tbody>
                </table>
            </Modal>
            {/* ...existing code... */}

            <style jsx>{`
              @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&family=Sarabun:wght@300;400;500;600;700&family=Prompt:wght@300;400;500;600;700&display=swap');
              
              body, .card, .btn, .form-control, .table, input, select, textarea {
                font-family: 'Kanit', sans-serif !important;
              }
              
              .card-title {
                font-family: 'Kanit', sans-serif !important;
                font-weight: 600 !important;
              }
              
              .table th {
                font-family: 'Kanit', sans-serif !important;
                font-weight: 600 !important;
              }
              
              .pagination .page-link {
                font-family: "Kanit", sans-serif !important;
                font-size: 14px !important;
                border-radius: 6px !important;
                margin: 0 2px !important;
                border: 1px solid #dee2e6 !important;
              }
              
              .pagination .page-item.active .page-link {
                background-color: #007bff !important;
                border-color: #007bff !important;
              }
              
              .pagination .page-link:hover {
                background-color: #e9ecef !important;
                border-color: #dee2e6 !important;
                color: #007bff !important;
              }
              
              .hover-scale:hover {
                transform: scale(1.02);
              }
              .table {
                margin-bottom: 0;
              }
              .btn-group .btn {
                transition: all 0.2s;
              }
              .btn-group .btn:hover {
                transform: translateY(-2px);
              }
              .badge {
                font-weight: normal;
              }
              .table th, .table td {
                vertical-align: middle !important;
              }
              .table th {
                font-weight: 600;
                background: #f1f3f6 !important;
              }
              .btn, .badge {
                font-size: 15px;
              }
            `}</style>
        </>
    )
}

export default ReportStock;
// ...existing code...