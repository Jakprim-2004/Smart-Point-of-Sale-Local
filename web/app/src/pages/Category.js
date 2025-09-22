import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";  // Add this import
import Template from "../components/Template";
import Swal from "sweetalert2";
import config from "../config";
import axios from "axios";
import Modal from "../components/Modal";

function Category() {
  const navigate = useNavigate();  // Add this line
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(30);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await axios.get(config.api_path + "/category/list", config.headers());
      if (res.data.message === "success") {
        // เรียงลำดับตามชื่อหมวดหมู่ภาษาไทย (ก-ฮ)
        const collator = new Intl.Collator("th-TH", {
          numeric: true,
          caseFirst: "lower",
        });

        const sortedCategories = res.data.results.sort((a, b) => {
          return collator.compare(a.name, b.name);
        });

        setCategories(sortedCategories);
      }
    } catch (error) {
      Swal.fire({
        title: "Error",
        text: error.message,
        icon: "error"
      });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    // ตรวจสอบชื่อซ้ำ
    const duplicateCategory = categories.find(cat =>
      cat.name.toLowerCase().trim() === category.name.toLowerCase().trim() &&
      cat.id !== category.id
    );

    if (duplicateCategory) {
      Swal.fire({
        title: "ชื่อซ้ำ",
        text: `ชื่อหมวดหมู่ "${category.name}" มีอยู่แล้ว กรุณาใช้ชื่ออื่น`,
        icon: "warning",
        confirmButtonText: "ตกลง"
      });
      return;
    }

    // ตรวจสอบชื่อว่างหรือมีเฉพาะช่องว่าง
    if (!category.name || category.name.trim() === "") {
      Swal.fire({
        title: "กรุณาระบุชื่อหมวดหมู่",
        text: "กรุณากรอกชื่อหมวดหมู่",
        icon: "warning",
        confirmButtonText: "ตกลง"
      });
      return;
    }

    try {
      const url = category.id
        ? `${config.api_path}/category/update/${category.id}`
        : `${config.api_path}/category/insert`;

      // ตัดช่องว่างหน้าและหลังออก
      const categoryToSave = {
        ...category,
        name: category.name.trim()
      };

      const res = await axios.post(url, categoryToSave, config.headers());
      if (res.data.message === "success") {
        Swal.fire({
          title: "บันทึกข้อมูล",
          text: "บันทึกข้อมูลหมวดหมู่สำเร็จ",
          icon: "success",
          timer: 2000
        });
        fetchCategories();
        setShowModal(false);
        setCategory({});
      }
    } catch (error) {
      Swal.fire({
        title: "Error",
        text: error.message,
        icon: "error"
      });
    }
  };

  const handleDelete = (item) => {
    Swal.fire({
      title: "ลบหมวดหมู่",
      text: `ยืนยันการลบ ${item.name || "รายการนี้"} จากรายการสินค้า`,
      icon: "warning",
      showCancelButton: true,
      showConfirmButton: true,
      confirmButtonText: "ยืนยัน",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: '#f44336',
      customClass: {
        confirmButton: 'btn btn-danger mx-2 px-4',
        cancelButton: 'btn btn-secondary mx-2 px-4'
      }   // Red color
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await axios.delete(
            `${config.api_path}/category/delete/${item.id}`,
            config.headers()
          );
          if (res.data.message === "success") {
            Swal.fire({
              title: "ลบข้อมูล",
              text: "ลบข้อมูลหมวดหมู่สำเร็จ",
              icon: "success",
              timer: 2000
            });
            fetchCategories();
          }
        } catch (error) {
          Swal.fire({
            title: "Error",
            text: error.message,
            icon: "error"
          });
        }
      }
    });
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // รีเซ็ตไปหน้าแรกเมื่อค้นหา
  };

  const handleBack = () => {
    navigate('/product');
  };

  return (
    <Template>
      <div className="card shadow-sm">
        <div className="card-header bg-primary text-white">
          <h4 className="mb-0">จัดการหมวดหมู่สินค้า</h4>
        </div>
        <div className="card-body">
          <div className="d-flex flex-wrap align-items-center mb-3 gap-2">
            <button
              className="btn btn-primary d-flex align-items-center shadow-sm"
              style={{ borderRadius: 20, fontWeight: 500, padding: '8px 20px' }}
              onClick={() => {
                setCategory({});
                setShowModal(true);
              }}
            >
              <i className="fa fa-plus mr-2"></i> เพิ่มหมวดหมู่
            </button>
            <button
              onClick={handleBack}
              className="btn btn-outline-primary d-flex align-items-center shadow-sm"
              style={{ borderRadius: 20, fontWeight: 500, padding: '8px 20px' }}
              title="กลับไปหน้าสินค้า"
            >
              <i className="fa fa-shopping-cart mr-2"></i> กลับไปหน้าสินค้า
            </button>
            <div className="ml-auto" style={{ minWidth: 220 }}>
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
                  placeholder="ค้นหาหมวดหมู่"
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
            <table className="table table-hover table-bordered shadow-sm bg-white" style={{ borderRadius: "12px", overflow: "hidden" }}>
              <thead className="thead-light">
                <tr style={{ background: "#f1f3f6" }}>
                  <th className="py-3" style={{ fontFamily: "Kanit, sans-serif", fontWeight: 600 }} width="80px">
                    ลำดับ
                  </th>
                  <th className="py-3" style={{ fontFamily: "Kanit, sans-serif", fontWeight: 600 }}>
                    ชื่อหมวดหมู่
                  </th>
                  <th className="py-3" style={{ fontFamily: "Kanit, sans-serif", fontWeight: 600 }} width="150">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody>
                {categories.length > 0 ? (
                  (() => {
                    const filteredCategories = categories.filter((item) =>
                      item.name.includes(searchTerm)
                    );

                    // คำนวณ pagination
                    const totalItems = filteredCategories.length;
                    const totalPages = Math.ceil(totalItems / itemsPerPage);
                    const startIndex = (currentPage - 1) * itemsPerPage;
                    const endIndex = startIndex + itemsPerPage;
                    const currentItems = filteredCategories.slice(startIndex, endIndex);

                    return currentItems.length > 0 ? (
                      currentItems.map((item, index) => (
                        <tr key={item.id}>
                          <td className="text-center py-2">
                            <span className="badge badge-secondary" style={{ fontSize: '12px' }}>
                              {startIndex + index + 1}
                            </span>
                          </td>
                          <td style={{ fontWeight: 500 }} className="py-2">{item.name}</td>
                          <td className="py-2">
                            <button
                              className="btn btn-info btn-sm mr-2"
                              style={{ borderRadius: 8, fontWeight: 500 }}
                              onClick={() => {
                                setCategory(item);
                                setShowModal(true);
                              }}
                              title="แก้ไข"
                            >
                              <i className="fa fa-edit"></i>
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              style={{ borderRadius: 8, fontWeight: 500 }}
                              onClick={() => handleDelete(item)}
                              title="ลบ"
                            >
                              <i className="fa fa-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3" className="text-center text-muted py-4">
                          <i className="fa fa-search mb-2 fa-2x"></i>
                          <p>ไม่พบหมวดหมู่ที่ค้นหา</p>
                        </td>
                      </tr>
                    );
                  })()
                ) : (
                  <tr>
                    <td colSpan="3" className="text-center text-muted py-4">
                      <i className="fa fa-box-open mb-2 fa-2x"></i>
                      <p>ไม่มีหมวดหมู่</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* แสดงข้อมูลจำนวนรายการและ Pagination */}
          {(() => {
            const filteredCategories = categories.filter((item) =>
              item.name.includes(searchTerm)
            );

            const totalItems = filteredCategories.length;
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
                  <nav aria-label="Category pagination">
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
        
        .table th, .table td {
          vertical-align: middle !important;
          font-family: "Kanit", sans-serif !important;
        }
        .table th {
          color: #495057;
          font-weight: 600;
          background: #f1f3f6 !important;
        }
        .btn {
          font-size: 15px;
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
      `}</style>

      <Modal
        show={showModal}
        onHide={() => setShowModal(false)}
        title={category.id ? "แก้ไขหมวดหมู่" : "เพิ่มหมวดหมู่"}
      >
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label>ชื่อหมวดหมู่ <span className="text-danger">*</span></label>
            <input
              type="text"
              className="form-control"
              value={category.name || ""}
              onChange={(e) => setCategory({ ...category, name: e.target.value })}
              placeholder="กรุณาระบุชื่อหมวดหมู่"
              maxLength={100}
              required
            />
            <small className="form-text text-muted">
              ชื่อหมวดหมู่ต้องไม่เกิน 100 ตัวอักษร และไม่ซ้ำกับที่มีอยู่แล้ว
            </small>
          </div>
          <div className="d-flex ">
            <button
              type="button"
              className="btn btn-secondary mr-2"
              onClick={() => {
                setShowModal(false);
                setCategory({});
              }}
            >
              <i className="fa fa-times mr-2"></i>ยกเลิก
            </button>
            <button type="submit" className="btn btn-success">
              <i className="fa fa-save mr-2"></i>บันทึก
            </button>
          </div>
        </form>
      </Modal>
    </Template>
  );
}

export default Category;
