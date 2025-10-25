import Template from "../components/Template";
import Swal from "sweetalert2";
import config from "../config";
import axios from "axios";
import { useState, useEffect, useCallback } from "react";
import Modal from "../components/Modal";
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";


function BillSales() {
  const [billSales, setBillSales] = useState([]);
  const [selectBill, setSelectBill] = useState({});
  const [searchBillNo, setSearchBillNo] = useState("");
  const [dateRange, setDateRange] = useState([null, null]);
  const [startDate, endDate] = dateRange;
  const [filteredBills, setFilteredBills] = useState([]);
  const [showBillDetailModal, setShowBillDetailModal] = useState(false);
  const [itemsPerPage] = useState(30);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState("id"); 
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      await axios
        .get(config.api_path + "/billSale/list", config.headers())
        .then((res) => {
          if (res.data.message === "success") {
            setBillSales(res.data.results);
          }
        })
        .catch((err) => {
          throw err.response.data;
        });
    } catch (e) {
      Swal.fire({
        title: "error",
        text: e.message,
        icon: "error",
      });
    }
  };

  const filterBills = useCallback(() => {
    let filtered = [...billSales];

    // กรองตามเลขบิล
    if (searchBillNo) {
      filtered = filtered.filter(bill => 
        bill.id.toString().includes(searchBillNo)
      );
    }

    // กรองตามช่วงวันที่
    if (startDate && endDate) {
      filtered = filtered.filter(bill => {
        const isoString = bill.payDate;
        if (!isoString) return false; // ตรวจสอบว่ามี payDate

        const [datePart] = isoString.split('T');
        const [year, month, day] = datePart.split('-');
        const billDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        return billDate >= start && billDate <= end;
      });
    }

    // เรียงลำดับ
    filtered.sort((a, b) => {
      if (sortBy === "id") {
        return a.id - b.id; // เรียงตามเลขบิล
      } else if (sortBy === "payDate") {
        return new Date(a.payDate) - new Date(b.payDate); // เรียงตามวันที่
      }
      return 0;
    });

    setFilteredBills(filtered);
  }, [billSales, searchBillNo, startDate, endDate, sortBy]);

  useEffect(() => {
    filterBills();
    setCurrentPage(1); // รีเซ็ตหน้าเมื่อมีการกรองข้อมูล
  }, [filterBills]);

  const formatDateTime = (isoString) => {
    if (!isoString) return '';
    
    // แปลงจาก ISO string เป็น Date object
    const date = new Date(isoString);
    
    // ดึงข้อมูลวันที่และเวลาตามเขตเวลาไทย
    const options = { 
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: 'numeric', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    
    const formatter = new Intl.DateTimeFormat('en-US', options);
    const parts = formatter.formatToParts(date);
    
    const day = parts.find(part => part.type === 'day').value;
    const month = parts.find(part => part.type === 'month').value;
    const year = parts.find(part => part.type === 'year').value;
    const hour = parts.find(part => part.type === 'hour').value;
    const minute = parts.find(part => part.type === 'minute').value;
    
    const months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
                   'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    
    const monthName = months[parseInt(month) - 1];
    const thaiYear = parseInt(year) + 543;
    
    return `${parseInt(day)} ${monthName} ${thaiYear} เวลา ${hour}:${minute}`;
  };

  return (
    <>
      <Template>
        <div className="container-fluid p-4">
          <div className="card shadow-sm">
            <div className="card-header bg-primary text-white py-3">
              <h5 className="card-title mb-0">
                <i className="fas fa-file-invoice me-2"></i>
                รายงานบิลขาย
              </h5>
            </div>
            <div className="card-body">
              <div className="row g-3 mb-4">
                <div className="col-md-4">
                  <div className="input-group shadow-sm">
                    <span className="input-group-text bg-light">
                      <i className="fas fa-search text-primary"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control border-start-0"
                      value={searchBillNo}
                      onChange={(e) => setSearchBillNo(e.target.value)}
                      placeholder="ค้นหาเลขบิล..."
                    />
                  </div>
                </div>
                <div className="col-md-8">
                  <div className="input-group shadow-sm">
                    <span className="input-group-text bg-light">
                      <i className="far fa-calendar-alt text-primary"></i>
                    </span>
                    <DatePicker
                      selectsRange={true}
                      startDate={startDate}
                      endDate={endDate}
                      onChange={(update) => setDateRange(update)}
                      className="form-control border-start-0"
                      dateFormat="dd/MM/yyyy"
                      placeholderText="เลือกช่วงวันที่"
                      isClearable={true}
                    />
                  </div>
                </div>
              </div>

            

              <div className="table-responsive">
                <table className="table table-hover border">
                  <thead className="bg-light">
                    <tr>
                      <th width="60px" className="border-0">ลำดับ</th>
                      <th width="100px" className="border-0">เลขบิล</th>
                      <th className="border-0">วันที่</th>
                      <th width="200px" className="border-0">รายละเอียด</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBills.length > 0 ? (
                      (() => {
                        const startIndex = (currentPage - 1) * itemsPerPage;
                        const endIndex = startIndex + itemsPerPage;
                        const currentItems = filteredBills.slice(startIndex, endIndex);
                        
                        return currentItems.map((item, index) =>
                          item ? (
                            <tr key={index}>
                              <td className="fw-bold text-secondary">{startIndex + index + 1}</td>
                              <td className="fw-bold text-primary">{item.id}</td>
                              <td>
                                {formatDateTime(item.payDate)}
                              </td>
                              <td className="#">
                                <button
                                  onClick={() => {
                                    setSelectBill(item);
                                    setShowBillDetailModal(true);
                                  }}
                                  className="btn btn-outline-primary btn-sm"
                                >
                                  <i className="fa fa-file-alt me-2"></i>
                                  รายการบิลขาย
                                </button>
                              </td>
                            </tr>
                          ) : null
                        );
                      })()
                    ) : (
                      <tr>
                        <td colSpan="4" className="text-center py-4 text-muted">
                          <i className="fas fa-inbox fa-2x mb-3 d-block"></i>
                          ไม่พบข้อมูล
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {filteredBills.length > itemsPerPage && (
                <div className="d-flex justify-content-between align-items-center mt-3">
                  <div className="text-muted">
                    แสดง {Math.min((currentPage - 1) * itemsPerPage + 1, filteredBills.length)} - {Math.min(currentPage * itemsPerPage, filteredBills.length)} จาก {filteredBills.length} รายการ
                  </div>
                  <nav>
                    <ul className="pagination pagination-sm mb-0">
                      <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                        <button 
                          className="page-link"
                          onClick={() => setCurrentPage(currentPage - 1)}
                          disabled={currentPage === 1}
                        >
                          <i className="fas fa-chevron-left"></i>
                        </button>
                      </li>
                      
                      {(() => {
                        const totalPages = Math.ceil(filteredBills.length / itemsPerPage);
                        const pages = [];
                        
                        for (let i = 1; i <= totalPages; i++) {
                          if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
                            pages.push(
                              <li key={i} className={`page-item ${currentPage === i ? 'active' : ''}`}>
                                <button 
                                  className="page-link"
                                  onClick={() => setCurrentPage(i)}
                                >
                                  {i}
                                </button>
                              </li>
                            );
                          } else if (i === currentPage - 3 || i === currentPage + 3) {
                            pages.push(
                              <li key={i} className="page-item disabled">
                                <span className="page-link">...</span>
                              </li>
                            );
                          }
                        }
                        
                        return pages;
                      })()}
                      
                      <li className={`page-item ${currentPage === Math.ceil(filteredBills.length / itemsPerPage) ? 'disabled' : ''}`}>
                        <button 
                          className="page-link"
                          onClick={() => setCurrentPage(currentPage + 1)}
                          disabled={currentPage === Math.ceil(filteredBills.length / itemsPerPage)}
                        >
                          <i className="fas fa-chevron-right"></i>
                        </button>
                      </li>
                    </ul>
                  </nav>
                </div>
              )}
            </div>
          </div>
        </div>
      </Template>

      <Modal 
        show={showBillDetailModal}
        onHide={() => setShowBillDetailModal(false)}
        title={`รายละเอียดบิล #${selectBill?.id}`}
        modalSize="modal-lg"
      >
        <div className="modal-header border-0 pb-0">
          <h5 className="modal-title">
            <i className="fas fa-receipt text-primary me-2"></i>
            รายละเอียดบิล #{selectBill?.id}
          </h5>
        </div>
        <div className="modal-body">
          {/* Bill Summary */}
          <div className="row mb-4">
            <div className="col-md-4">
              <div className="card bg-light border-0">
                <div className="card-body p-3">
                  <h6 className="text-muted mb-2">วันที่ออกบิล</h6>
                  <p className="mb-0">
                    {selectBill?.payDate && formatDateTime(selectBill.payDate)}
                  </p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card bg-light border-0">
                <div className="card-body p-3">
                  <h6 className="text-muted mb-2">ชำระโดย</h6>
                  <p className="mb-0 fw-bold">
                    {(() => {
                      const payment = selectBill?.paymentMethod;
                      
                      if (payment === 'Cash' || payment === 'Cash ') {
                        return <span className="text-success">
                          <i className="fas fa-money-bill me-2"></i>Cash (เงินสด)
                        </span>;
                      } else if (payment === 'PromptPay') {
                        return <span className="text-primary">
                          <i className="fas fa-exchange-alt me-2"></i>PromptPay (พร้อมเพย์)
                        </span>;
                      } else if (payment === 'Split') {
                        return <span className="text-warning">
                          <i className="fas fa-credit-card me-2"></i>Split Payment (ชำระแบบผสม)
                        </span>;
                      } else {
                        return <span className="text-success">
                           <i className="fas fa-money-bill me-2"></i>Cash (เงินสด)
                        </span>;
                      }
                    })()}
                  </p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card bg-primary text-white border-0">
                <div className="card-body p-3">
                  <h6 className="mb-2">ยอดรวมทั้งสิ้น (บาท)</h6>
                  <h4 className="mb-0">
                    {parseFloat(selectBill?.totalAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h4>
                </div>
              </div>
            </div>
            {/* เพิ่มส่วนแสดง description */}
            {selectBill?.description && (
              <div className="col-12 mt-3">
                <div className="card bg-light border-0">
                  <div className="card-body p-3">
                    <h6 className="text-muted mb-2">
                      {selectBill.description.includes('ชำระแบบผสม') ? 'รายละเอียดการชำระเงิน' : 'ใช้แต้มแลกส่วนลด'}
                    </h6>
                    <div>
                      {selectBill.description.split(' | ').map((part, index) => (
                        <div key={index} className="mb-1">
                          {part.includes('ชำระแบบผสม') ? (
                            <div className="d-flex align-items-center">
                              <i className="fas fa-credit-card text-warning me-2"></i>
                              <strong>{part.replace('ชำระแบบผสม - ', 'การชำระแบบผสม: ')}</strong>
                            </div>
                          ) : part.includes('ใช้แต้มสะสม') ? (
                            <div className="d-flex align-items-center">
                              <i className="fas fa-star text-success me-2"></i>
                              <span>{part}</span>
                            </div>
                          ) : (
                            <span>{part}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bill Details Table */}
          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead className="bg-light">
                <tr>
                  <th className="py-3" style={{width: '50px'}}>#</th>
                  <th>รายการสินค้า</th>
                  <th className="text-end" style={{width: '180px'}}>ราคา/หน่วย</th>
                  <th className="text-end" style={{width: '100px'}}>จำนวน</th>
                  
                </tr>
              </thead>
              <tbody>
                {selectBill?.billSaleDetails?.length > 0 ? (
                  selectBill.billSaleDetails.map((item, index) =>
                    item?.product ? (
                      <tr key={index}>
                        <td>{index + 1}</td>
                        <td>
                          <div className="d-flex align-items-center">
                            <div className="ms-2">
                              <h6 className="mb-0">{item.product.name}</h6>
                              <small className="text-muted">บาร์โค้ด: {item.product.id}</small>
                            </div>
                          </div>
                        </td>
                        <td className="text-end">
                          <div>฿{parseInt(item.price).toLocaleString("th-TH")}</div>
                        </td>
                        <td className="text-end">{item.qty} ชิ้น</td>
                      </tr>
                    ) : null
                  )
                ) : (
                  <tr>
                    <td colSpan="5" className="text-center py-5">
                      <div className="text-muted">
                        <i className="fas fa-box-open fa-3x mb-3"></i>
                        <p className="mb-0">ไม่พบข้อมูลรายการ</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
             
            </table>
          </div>

          
          
        </div>
      </Modal>

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

        .card-title {
          font-family: "Kanit", sans-serif !important;
          font-weight: 600 !important;
        }

        .table th {
          font-family: "Kanit", sans-serif !important;
          font-weight: 700 !important;
        }

        .modal-title {
          font-family: "Kanit", sans-serif !important;
          font-weight: 700 !important;
        }

        .card-body h6 {
          font-family: "Kanit", sans-serif !important;
          font-weight: 600 !important;
        }

        .card-body p,
        .card-body h4 {
          font-family: "Kanit", sans-serif !important;
        }

        .modal .table h6 {
          font-family: "Kanit", sans-serif !important;
          font-weight: 600 !important;
        }
      `}</style>
    </>
  );
}

export default BillSales;
