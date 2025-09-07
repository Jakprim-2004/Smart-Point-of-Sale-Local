import { useEffect, useState } from "react";
import Template from "../components/Template";
import Swal from "sweetalert2";
import axios from "axios";
import config from "../config";
import Modal from "../components/Modal";
import * as dayjs from "dayjs";

function Stock() {
  const [products, setProducts] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [stockReport, setStockReport] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState("notInStock"); // 'notInStock', 'inStock', 'addStock', 'lowStock'
  const [lowStockThreshold, setLowStockThreshold] = useState(10); // เกณฑ์สินค้าเหลือน้อย
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState();
  const [itemsPerPage] = useState(30);

  // ฟังก์ชันจัดรูปแบบเงินด้วยเครื่องหมายจุลภาค
  const formatPrice = (price) => {
    if (!price && price !== 0) return "0";
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  useEffect(() => {
    fetchDataStock();
    fetchProducts();
    fetchStockReport(); // เพิ่มการเรียก API รายงานสต็อก
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await axios.get(
        config.api_path + "/product/list",
        config.headers()
      );
      if (res.data.message === "success") {
        setProducts(res.data.results);
      }
    } catch (e) {
    }
  };

  const fetchDataStock = async () => {
    try {
      const res = await axios.get(
        config.api_path + "/stock/list",
        config.headers()
      );
      if (res.data.message === "success") {
        setStocks(res.data.results);
      }
    } catch (e) {
      Swal.fire({
        title: "Error",
        text: e.message,
        icon: "error",
      });
    }
  };

  // ฟังก์ชันดึงข้อมูลรายงานสต็อกจาก /stock/report
  const fetchStockReport = async () => {
    try {
      const res = await axios.get(
        config.api_path + "/stock/report",
        config.headers()
      );
      if (res.data.message === "success") {
        setStockReport(res.data.results);
      }
    } catch (e) {
    }
  };

  // สินค้าที่ยังไม่มีในสต็อก
  const getProductsNotInStock = () => {
    // หา ID ของสินค้าที่มีสต๊อกคงเหลือ > 0
    const inStockProductIds = stockReport
      .filter((report) => {
        const stockIn = parseInt(report.stockIn) || 0;
        const stockOut = parseInt(report.stockOut) || 0;
        const remaining = stockIn - stockOut;
        return remaining > 0; // มีสต๊อกคงเหลือ
      })
      .map((report) => parseInt(report.result?.id))
      .filter((id) => !isNaN(id));
    
    // กรองสินค้าที่ยังไม่มีในสต๊อก (ไม่อยู่ใน inStockProductIds)
    const notInStock = products.filter((product) => !inStockProductIds.includes(parseInt(product.id)));
    
    return notInStock;
  };

  // สินค้าที่มีในสต็อกแล้ว
  const getProductsInStock = () => {
    // หา ID ของสินค้าที่มีสต๊อกคงเหลือ > 0
    const inStockProductIds = stockReport
      .filter((report) => {
        const stockIn = parseInt(report.stockIn) || 0;
        const stockOut = parseInt(report.stockOut) || 0;
        const remaining = stockIn - stockOut;
        return remaining > 0; // มีสต๊อกคงเหลือ
      })
      .map((report) => parseInt(report.result?.id))
      .filter((id) => !isNaN(id));
    
    // กรองสินค้าที่มีในสต๊อก (อยู่ใน inStockProductIds)
    const inStock = products.filter((product) => inStockProductIds.includes(parseInt(product.id)));
    
    return inStock;
  };

  // คำนวณสต็อกรวมของสินค้าแต่ละชิ้นจากรายงาน
  const getTotalStock = (productId) => {
    const report = stockReport.find((item) => item.result?.id === productId);
    if (!report) {
      return 0;
    }

    const stockIn = parseInt(report.stockIn) || 0;
    const stockOut = parseInt(report.stockOut) || 0;
    const totalStock = Math.max(0, stockIn - stockOut);
    
    return totalStock;
  };

  // สินค้าที่เหลือน้อยหรือหมด
  const getLowStockProducts = () => {
    return getProductsInStock().filter((product) => {
      const totalStock = getTotalStock(product.id);
      return totalStock <= lowStockThreshold;
    });
  };

  // ฟิลเตอร์ตามการค้นหา
  const filterProducts = (productList) => {
    if (!searchQuery) return productList;

    return productList.filter(
      (product) =>
        (product.name &&
          product.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (product.barcode && product.barcode.includes(searchQuery)) ||
        (product.category &&
          product.category.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  };

  // Pagination helper function
  const getPaginatedData = (data) => {
    const totalItems = data.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    const paginatedData = data.slice(startIndex, endIndex);

    return {
      data: paginatedData,
      totalItems,
      totalPages,
      startIndex,
      endIndex,
      currentPage
    };
  };

  // Handle tab change with pagination reset
  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    setCurrentPage(1);
  };

  // Handle search with pagination reset  
  const handleSearchChange = (value) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  // Pagination component
  const PaginationControls = ({ paginationInfo }) => {
    const { totalPages, totalItems, startIndex, endIndex } = paginationInfo;
    
    if (totalPages <= 1) return null;

    const getPageNumbers = () => {
      const pages = [];
      const maxVisiblePages = 5;
      
      let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
      let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      
      if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      
      return pages;
    };

    return (
      <div className="d-flex justify-content-between align-items-center mt-4">
        <div className="text-muted">
          <small>
            แสดงรายการที่ {startIndex + 1} - {endIndex} จากทั้งหมด {totalItems} รายการ
          </small>
        </div>
        
        <nav aria-label="Stock pagination">
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

            {currentPage > 3 && (
              <>
                <li className="page-item">
                  <button className="page-link" onClick={() => setCurrentPage(1)}>1</button>
                </li>
                {currentPage > 4 && <li className="page-item disabled"><span className="page-link">...</span></li>}
              </>
            )}

            {getPageNumbers().map(page => (
              <li key={page} className={`page-item ${page === currentPage ? 'active' : ''}`}>
                <button
                  className="page-link"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              </li>
            ))}

            {currentPage < totalPages - 2 && (
              <>
                {currentPage < totalPages - 3 && <li className="page-item disabled"><span className="page-link">...</span></li>}
                <li className="page-item">
                  <button className="page-link" onClick={() => setCurrentPage(totalPages)}>{totalPages}</button>
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
      </div>
    );
  };

  // เพิ่มสินค้าแบบรายตัว
  const handleAddSingleProduct = async (product, qty = 1) => {
    try {
      // แสดง prompt ให้ผู้ใช้ใส่จำนวน
      const { value: quantity } = await Swal.fire({
        title: `เพิ่มสต็อก: ${product.name}`,
        text: "กรุณาระบุจำนวนที่ต้องการเพิ่ม",
        input: "number",
        inputValue: qty,
        inputAttributes: {
          min: 1,
          step: 1,
          placeholder: "จำนวน (ชิ้น)",
        },
        showCancelButton: true,
        confirmButtonText: "เพิ่มสต็อก",
        cancelButtonText: "ยกเลิก",
        confirmButtonColor: "#28a745",
        inputValidator: (value) => {
          if (!value || value <= 0) {
            return "กรุณาใส่จำนวนที่มากกว่า 0";
          }
          if (value > 10000) {
            return "จำนวนไม่ควรเกิน 10,000 ชิ้น";
          }
        },
      });

      if (quantity) {
        const payload = {
          qty: parseInt(quantity),
          productId: product.id,
        };

        const res = await axios.post(
          config.api_path + "/stock/save",
          payload,
          config.headers()
        );

        if (res.data.message === "success") {
          fetchDataStock();
          fetchStockReport(); // อัพเดตข้อมูลรายงานสต็อก
          Swal.fire({
            title: "เพิ่มสต็อกสำเร็จ!",
            html: `เพิ่มสินค้า <strong>"${product.name}"</strong><br>จำนวน <strong>${quantity} ชิ้น</strong> เข้าสต็อกแล้ว`,
            icon: "success",
            timer: 2000,
            showConfirmButton: false,
          });
        }
      }
    } catch (e) {
      Swal.fire({
        title: "Error",
        text: e.response?.data?.message || "เกิดข้อผิดพลาด",
        icon: "error",
      });
    }
  };

  // เพิ่มสินค้าหลายรายการ
  const handleBulkAdd = () => {
    if (selectedProducts.length === 0) {
      Swal.fire({
        title: "กรุณาเลือกสินค้า",
        text: "กรุณาเลือกสินค้าที่ต้องการเพิ่มเข้าสต็อก",
        icon: "warning",
      });
      return;
    }
    setShowBulkAddModal(true);
  };

  // บันทึกการเพิ่มหลายรายการ
  const handleSaveBulkAdd = async () => {
    try {
      const promises = selectedProducts.map((item) =>
        axios.post(
          config.api_path + "/stock/save",
          {
            qty: parseInt(item.qty),
            productId: item.product.id,
          },
          config.headers()
        )
      );

      await Promise.all(promises);

      fetchDataStock();
      fetchStockReport(); // อัพเดตข้อมูลรายงานสต็อก
      setSelectedProducts([]);
      setShowBulkAddModal(false);

      Swal.fire({
        title: "เพิ่มสต็อกสำเร็จ",
        text: `เพิ่มสินค้า ${selectedProducts.length} รายการเข้าสต็อกแล้ว`,
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (e) {
      Swal.fire({
        title: "Error",
        text: "เกิดข้อผิดพลาดในการเพิ่มสต็อก",
        icon: "error",
      });
    }
  };

  // เพิ่ม/ลบสินค้าในรายการที่เลือก
  const toggleProductSelection = (product) => {
    const exists = selectedProducts.find(
      (item) => item.product.id === product.id
    );

    if (exists) {
      setSelectedProducts(
        selectedProducts.filter((item) => item.product.id !== product.id)
      );
    } else {
      setSelectedProducts([...selectedProducts, { product, qty: 1 }]);
    }
  };

  // อัปเดตจำนวนสินค้าที่เลือก
  const updateSelectedProductQty = (productId, qty) => {
    setSelectedProducts(
      selectedProducts.map((item) =>
        item.product.id === productId
          ? { ...item, qty: parseInt(qty) || 1 }
          : item
      )
    );
  };

  // ลบสต็อก
  const handleDeleteStock = (item) => {
    Swal.fire({
      title: "ลบรายการสต็อก",
      text: `ยืนยันการลบ "${item.product?.name || "รายการนี้"}" จากสต็อก`,
        icon: "warning",
      showCancelButton: true,
      showConfirmButton: true,
      confirmButtonText: "Confirm",
      cancelButtonText: "Cancel",
      confirmButtonColor: '#f44336'   // Red color
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axios.delete(
            config.api_path + "/stock/delete/" + item.id,
            config.headers()
          );
          fetchDataStock();
          fetchStockReport(); // อัพเดตข้อมูลรายงานสต็อก
          Swal.fire({
            title: "ลบสำเร็จ",
            text: "ลบรายการสต็อกแล้ว",
            icon: "success",
            timer: 1500,
            showConfirmButton: false,
          });
        } catch (e) {
          Swal.fire({
            title: "Error",
            text: e.response?.data?.message || "เกิดข้อผิดพลาด",
            icon: "error",
          });
        }
      }
    });
  };

  return (
    <>
      <Template>
        <div className="container-fluid p-4">
          <div className="card shadow-sm">
            <div className="card-header bg-primary text-white py-3">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">
                  <i className="fas fa-boxes me-2"></i>
                  จัดการสต็อกสินค้า
                </h5>
                <div className="d-flex gap-2 align-items-center">
                  {/* แสดงการแจ้งเตือนสินค้าเหลือน้อย */}
                  {getLowStockProducts().length > 0 && (
                    <div
                      className="alert alert-warning mb-0 py-2 px-3 d-flex align-items-center"
                      style={{ fontSize: "0.875rem" }}
                    >
                      <i className="fas fa-exclamation-triangle me-2"></i>
                      <span>
                        มีสินค้าเหลือน้อย/หมด{" "}
                        <strong>{getLowStockProducts().length}</strong> รายการ
                      </span>
                      <button
                        onClick={() => setActiveTab("lowStock")}
                        className="btn btn-warning btn-sm ms-2"
                        style={{ fontSize: "0.75rem" }}
                      >
                        ดูรายการ
                      </button>
                    </div>
                  )}

                  {selectedProducts.length > 0 && (
                    <button
                      onClick={handleBulkAdd}
                      className="btn btn-warning btn-sm"
                    >
                      <i className="fas fa-plus-circle me-1"></i>
                      เพิ่มที่เลือก ({selectedProducts.length})
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="card-body">
              {/* Tab Navigation */}
              <ul className="nav nav-pills mb-4">
                <li className="nav-item">
                  <button
                    className={`nav-link ${
                      activeTab === "notInStock" ? "active" : ""
                    }`}
                    onClick={() => handleTabChange("notInStock")}
                  >
                    <i className="fas fa-plus-circle me-2"></i>
                    เพิ่มสต็อก ({getProductsNotInStock().length})
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link ${
                      activeTab === "inStock" ? "active" : ""
                    }`}
                    onClick={() => handleTabChange("inStock")}
                  >
                    <i className="fas fa-check-circle me-2"></i>
                    มีในสต็อก ({getProductsInStock().length})
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link ${
                      activeTab === "lowStock" ? "active" : ""
                    } ${
                      getLowStockProducts().length > 0
                        ? "border-warning text-warning"
                        : ""
                    }`}
                    onClick={() => handleTabChange("lowStock")}
                  >
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    เหลือน้อย/หมด ({getLowStockProducts().length})
                    {getLowStockProducts().length > 0 && (
                      <span className="badge bg-warning text-dark ms-1">!</span>
                    )}
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link ${
                      activeTab === "addStock" ? "active" : ""
                    }`}
                    onClick={() => handleTabChange("addStock")}
                  >
                    <i className="fas fa-history me-2"></i>
                    ประวัติเพิ่มสต็อก ({stocks.length})
                  </button>
                </li>
              </ul>

              {/* Search Bar */}
              <div className="row mb-4">
                <div className="col-md-6">
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="fas fa-search"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="ค้นหาด้วยชื่อสินค้า, บาร์โค้ด, หมวดหมู่..."
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                    />
                    {searchQuery && (
                      <button
                        className="btn btn-outline-secondary"
                        onClick={() => handleSearchChange("")}
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    )}
                  </div>
                </div>
                
              </div>

              {/* Tab Content */}
              {activeTab === "notInStock" && (
                <div className="tab-content">
                  <div className="alert alert-info border-0">
                    <i className="fas fa-info-circle me-2"></i>
                    สินค้าที่ยังไม่ได้เพิ่มเข้าสต็อก - คลิกเพื่อเพิ่มรายการ
                    หรือเลือกหลายรายการแล้วเพิ่มพร้อมกัน
                  </div>

                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead className="bg-light">
                        <tr>
                          <th width="40px">ลำดับ</th>
                          <th width="50px">
                            <input
                              type="checkbox"
                              className="form-check-input"
                              onChange={(e) => {
                                const filteredData = filterProducts(getProductsNotInStock());
                                const paginatedInfo = getPaginatedData(filteredData);
                                
                                if (e.target.checked) {
                                  const newSelections = paginatedInfo.data
                                    .filter(
                                      (product) =>
                                        !selectedProducts.find(
                                          (item) =>
                                            item.product.id === product.id
                                        )
                                    )
                                    .map((product) => ({ product, qty: 1 }));
                                  setSelectedProducts([
                                    ...selectedProducts,
                                    ...newSelections,
                                  ]);
                                } else {
                                  const currentPageIds = paginatedInfo.data.map((p) => p.id);
                                  setSelectedProducts(
                                    selectedProducts.filter(
                                      (item) =>
                                        !currentPageIds.includes(
                                          item.product.id
                                        )
                                    )
                                  );
                                }
                              }}
                            />
                          </th>
                          <th width="120px">บาร์โค้ด</th>
                          <th>ชื่อสินค้า</th>
                          <th width="220px">หมวดหมู่</th>
                          <th width="100px">ราคา (บาท) </th>
                          <th width="150px">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const filteredData = filterProducts(getProductsNotInStock());
                          const paginationInfo = getPaginatedData(filteredData);
                          
                          return paginationInfo.data.length > 0 ? (
                            <>
                              {paginationInfo.data.map((product, index) => {
                                const globalIndex = paginationInfo.startIndex + index + 1;
                                return (
                                  <tr key={product.id}>
                                    <td className="text-center">
                                      <span className="badge bg-secondary">{globalIndex}</span>
                                    </td>
                                    <td>
                                      <input
                                        type="checkbox"
                                        className="form-check-input"
                                        checked={selectedProducts.some(
                                          (item) => item.product.id === product.id
                                        )}
                                        onChange={() =>
                                          toggleProductSelection(product)
                                        }
                                      />
                                    </td>
                                    <td>
                                      <code className="bg-light p-1 rounded">
                                        {product.barcode || "-"}
                                      </code>
                                    </td>
                                    <td>
                                      <div className="fw-bold">{product.name}</div>
                                      {product.description && (
                                        <small className="text-muted">
                                          {product.description}
                                        </small>
                                      )}
                                    </td>
                                    <td>
                                      <span className="">
                                        {product.category || "ไม่ระบุ"}
                                      </span>
                                    </td>
                                    <td>
                                      <span className="fw-bold text-success">
                                        {formatPrice(product.price || 0)}
                                      </span>
                                    </td>
                                    <td>
                                      <button
                                        onClick={() =>
                                          handleAddSingleProduct(product)
                                        }
                                        className="btn btn-primary btn-sm"
                                        title="คลิกเพื่อระบุจำนวนและเพิ่มเข้าสต็อก"
                                      >
                                        <i className="fas fa-plus me-1"></i>
                                        เพิ่มสต็อก
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                              <tr>
                                <td colSpan="7">
                                  <PaginationControls paginationInfo={paginationInfo} />
                                </td>
                              </tr>
                            </>
                          ) : (
                            <tr>
                              <td
                                colSpan="7"
                                className="text-center py-4 text-muted"
                              >
                                <i className="fas fa-check-circle fa-2x mb-2 d-block text-success"></i>
                                {searchQuery
                                  ? `ไม่พบสินค้าที่ตรงกับ "${searchQuery}"`
                                  : "สินค้าทั้งหมดมีในสต็อกแล้ว"}
                              </td>
                            </tr>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === "inStock" && (
                <div className="tab-content">
                  <div className="alert alert-success border-0">
                    <i className="fas fa-check-circle me-2"></i>
                    สินค้าที่มีในสต็อกแล้ว - สามารถเพิ่มจำนวนเพิ่มเติมได้
                  </div>

                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead className="bg-light">
                        <tr>
                          <th width="40px">ลำดับ</th>
                          <th width="120px">บาร์โค้ด</th>
                          <th>ชื่อสินค้า</th>
                          <th width="220px">หมวดหมู่</th>
                          <th width="100px">ราคา (บาท)</th>
                          <th width="100px">สต็อกรวม</th>
                          <th width="150px">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const filteredData = filterProducts(getProductsInStock());
                          const paginationInfo = getPaginatedData(filteredData);
                          
                          return paginationInfo.data.length > 0 ? (
                            <>
                              {paginationInfo.data.map((product, index) => {
                                const globalIndex = paginationInfo.startIndex + index + 1;
                                const totalStock = getTotalStock(product.id);
                                const isLowStock = totalStock <= lowStockThreshold;
                                const isOutOfStock = totalStock === 0;

                                return (
                                  <tr
                                    key={product.id}
                                    className={
                                      isOutOfStock
                                        ? "table-danger"
                                        : isLowStock
                                        ? "table-warning"
                                        : ""
                                    }
                                  >
                                    <td className="text-center">
                                      <span className="badge bg-secondary">{globalIndex}</span>
                                    </td>
                                    <td>
                                      <code className="bg-light p-1 rounded ">
                                        {product.barcode || "-"}
                                      </code>
                                    </td>
                                    <td>
                                      <div className="fw-bold">
                                        {product.name}
                                      </div>
                                      {product.description && (
                                        <small className="text-muted">
                                          {product.description}
                                        </small>
                                      )}
                                      {isOutOfStock && (
                                        <span className="badge bg-danger ms-2">
                                          หมดสต็อก
                                        </span>
                                      )}
                                      {isLowStock && !isOutOfStock && (
                                        <span className="badge bg-warning text-dark ms-2">
                                          เหลือน้อย
                                        </span>
                                      )}
                                    </td>
                                    <td>
                                      <span className="">
                                        {product.category || "ไม่ระบุ"}
                                      </span>
                                    </td>
                                    <td>
                                      <span className="fw-bold text-success ">
                                        {formatPrice(product.price || 0)}
                                      </span>
                                    </td>
                                    <td>
                                      <span
                                        className={`badge fs-6 ${
                                          isOutOfStock
                                            ? "bg-danger"
                                            : isLowStock
                                            ? "bg-warning text-dark"
                                            : "bg-info"
                                        }`}
                                      >
                                        {Number(totalStock).toLocaleString()} ชิ้น
                                      </span>
                                    </td>
                                    <td>
                                      <button
                                        onClick={() =>
                                          handleAddSingleProduct(product)
                                        }
                                        className={`btn btn-sm ${
                                          isOutOfStock
                                            ? "btn-danger"
                                            : isLowStock
                                            ? "btn-warning"
                                            : "btn-outline-primary"
                                        }`}
                                        title="เพิ่มสต็อกเพิ่มเติม"
                                      >
                                        <i className="fas fa-plus me-1"></i>
                                        {isOutOfStock ? "เติมด่วน" : "เพิ่ม"}
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                              <tr>
                                <td colSpan="7">
                                  <PaginationControls paginationInfo={paginationInfo} />
                                </td>
                              </tr>
                            </>
                          ) : (
                            <tr>
                              <td
                                colSpan="7"
                                className="text-center py-4 text-muted"
                              >
                                <i className="fas fa-box-open fa-2x mb-2 d-block"></i>
                                {searchQuery
                                  ? `ไม่พบสินค้าที่ตรงกับ "${searchQuery}"`
                                  : "ยังไม่มีสินค้าในสต็อก"}
                              </td>
                            </tr>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === "lowStock" && (
                <div className="tab-content">
                  <div className="alert alert-warning border-0">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    สินค้าที่เหลือน้อยหรือหมดสต็อก (เกณฑ์: ≤ {
                      lowStockThreshold
                    }{" "}
                    ชิ้น)
                    <div className="mt-2">
                      <label className="form-label small">
                        ปรับเกณฑ์สินค้าเหลือน้อย:
                      </label>
                      <input
                        type="number"
                        className="form-control form-control-sm d-inline-block ms-2"
                        style={{ width: "80px" }}
                        value={lowStockThreshold}
                        min="1"
                        max="100"
                        onChange={(e) =>
                          setLowStockThreshold(parseInt(e.target.value) || 10)
                        }
                      />
                      <span className="ms-1 small text-muted">ชิ้น</span>
                    </div>
                  </div>

                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead className="bg-light">
                        <tr>
                          <th width="40px">ลำดับ</th>
                          <th width="120px">บาร์โค้ด</th>
                          <th>ชื่อสินค้า</th>
                          <th width="220px">หมวดหมู่</th>
                          <th width="100px">ราคา (บาท)</th>
                          <th width="120px">สถานะสต็อก</th>
                          <th width="150px">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const filteredData = filterProducts(getLowStockProducts());
                          const paginationInfo = getPaginatedData(filteredData);
                          
                          return paginationInfo.data.length > 0 ? (
                            <>
                              {paginationInfo.data.map((product, index) => {
                                const globalIndex = paginationInfo.startIndex + index + 1;
                                const totalStock = getTotalStock(product.id);
                                const isOutOfStock = totalStock === 0;

                                return (
                                  <tr
                                    key={product.id}
                                    className={
                                      isOutOfStock
                                        ? "table-danger"
                                        : "table-warning"
                                    }
                                  >
                                    <td className="text-center">
                                      <span className="badge bg-secondary">{globalIndex}</span>
                                    </td>
                                    <td>
                                      <code className="bg-light p-1 rounded">
                                        {product.barcode || "-"}
                                      </code>
                                    </td>
                                    <td>
                                      <div className="fw-bold">
                                        {product.name}
                                      </div>
                                      {product.description && (
                                        <small className="text-muted">
                                          {product.description}
                                        </small>
                                      )}
                                    </td>
                                    <td>
                                      <span className="">
                                        {product.category || "ไม่ระบุ"}
                                      </span>
                                    </td>
                                    <td>
                                      <span className="fw-bold text-success">
                                        {formatPrice(product.price || 0)}
                                      </span>
                                    </td>
                                    <td>
                                      {isOutOfStock ? (
                                        <span className="badge bg-danger fs-6">
                                          <i className="fas fa-times me-1"></i>
                                          หมดสต็อก
                                        </span>
                                      ) : (
                                        <span className="badge bg-warning text-dark fs-6">
                                          <i className="fas fa-exclamation-triangle me-1"></i>
                                          เหลือ{" "}
                                          {Number(totalStock).toLocaleString()}{" "}
                                          ชิ้น
                                        </span>
                                      )}
                                    </td>
                                    <td>
                                      <button
                                        onClick={() =>
                                          handleAddSingleProduct(product)
                                        }
                                        className={`btn btn-sm ${
                                          isOutOfStock
                                            ? "btn-danger"
                                            : "btn-warning"
                                        }`}
                                        title={
                                          isOutOfStock
                                            ? "เติมสต็อกด่วน"
                                            : "เพิ่มสต็อก"
                                        }
                                      >
                                        <i className="fas fa-plus me-1"></i>
                                        {isOutOfStock ? "เติมด่วน!" : "เติมสต็อก"}
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                              <tr>
                                <td colSpan="7">
                                  <PaginationControls paginationInfo={paginationInfo} />
                                </td>
                              </tr>
                            </>
                          ) : (
                            <tr>
                              <td
                                colSpan="7"
                                className="text-center py-4 text-muted"
                              >
                                <i className="fas fa-check-circle fa-2x mb-2 d-block text-success"></i>
                                {searchQuery
                                  ? `ไม่พบสินค้าเหลือน้อยที่ตรงกับ "${searchQuery}"`
                                  : "ยินดีด้วย! ไม่มีสินค้าเหลือน้อยหรือหมดสต็อก"}
                              </td>
                            </tr>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === "addStock" && (
                <div className="tab-content">
                  <div className="alert alert-secondary border-0">
                    <i className="fas fa-history me-2"></i>
                    ประวัติการเพิ่มสต็อกทั้งหมด
                  </div>

                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead className="bg-light">
                        <tr>
                          <th width="40px">ลำดับ</th>
                          <th width="120px">บาร์โค้ด</th>
                          <th>ชื่อสินค้า</th>
                          <th width="100px" className="text-end">
                            จำนวน
                          </th>
                          <th width="180px">วันที่เพิ่ม</th>
                          <th width="100px">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const filteredStocks = stocks.filter((stock) => {
                            if (!searchQuery) return true;
                            const product = stock.product;
                            return (
                              product &&
                              (product.name
                                ?.toLowerCase()
                                .includes(searchQuery.toLowerCase()) ||
                                product.barcode?.includes(searchQuery) ||
                                product.category
                                  ?.toLowerCase()
                                  .includes(searchQuery.toLowerCase()))
                            );
                          });
                          
                          const paginationInfo = getPaginatedData(filteredStocks);
                          
                          return paginationInfo.data.length > 0 ? (
                            <>
                              {paginationInfo.data.map((item, index) => {
                                const globalIndex = paginationInfo.startIndex + index + 1;
                                return (
                                  <tr key={index}>
                                    {item && item.product ? (
                                      <>
                                        <td className="text-center">
                                          <span className="badge bg-secondary">{globalIndex}</span>
                                        </td>
                                        <td>
                                          <code className="bg-light p-1 rounded">
                                            {item.product.barcode || "-"}
                                          </code>
                                        </td>
                                        <td>
                                          <div className="fw-bold">
                                            {item.product.name}
                                          </div>
                                          <small className="text-muted">
                                            {item.product.category ||
                                              "ไม่ระบุหมวดหมู่"}
                                          </small>
                                        </td>
                                        <td className="text-end">
                                          <span className="fw-bold">
                                            {formatPrice(item.qty)} ชิ้น
                                          </span>
                                        </td>
                                        <td>
                                          <div>
                                            {dayjs(item.createdAt).format(
                                              "DD/MM/YYYY"
                                            )}
                                          </div>
                                          <small className="text-muted">
                                            {dayjs(item.createdAt).format(
                                              "HH:mm น."
                                            )}
                                          </small>
                                        </td>
                                        <td>
                                          <button
                                            onClick={() => handleDeleteStock(item)}
                                            className="btn btn-outline-danger btn-sm"
                                            title="ลบรายการนี้"
                                          >
                                            <i className="fas fa-trash"></i>
                                          </button>
                                        </td>
                                      </>
                                    ) : (
                                      <td
                                        colSpan="6"
                                        className="text-center text-muted"
                                      >
                                        ข้อมูลสินค้าไม่สมบูรณ์
                                      </td>
                                    )}
                                  </tr>
                                );
                              })}
                              <tr>
                                <td colSpan="6">
                                  <PaginationControls paginationInfo={paginationInfo} />
                                </td>
                              </tr>
                            </>
                          ) : (
                            <tr>
                              <td
                                colSpan="6"
                                className="text-center py-4 text-muted"
                              >
                                <i className="fas fa-inbox fa-2x mb-2 d-block"></i>
                                ยังไม่มีประวัติการเพิ่มสต็อก
                              </td>
                            </tr>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Template>

      {/* Modal สำหรับเพิ่มหลายรายการ */}
      <Modal
        show={showBulkAddModal}
        onHide={() => setShowBulkAddModal(false)}
        title={`เพิ่มสต็อกสินค้า ${selectedProducts.length} รายการ`}
        modalSize="modal-lg"
      >
        <div className="table-responsive">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>สินค้า</th>
                <th width="120px">จำนวน</th>
                <th width="80px">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {selectedProducts.map((item, index) => (
                <tr key={index}>
                  <td>
                    <div className="fw-bold">{item.product.name}</div>
                    <small className="text-muted">
                      {item.product.barcode || "-"}
                    </small>
                  </td>
                  <td>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      value={item.qty}
                      min="1"
                      onChange={(e) =>
                        updateSelectedProductQty(
                          item.product.id,
                          e.target.value
                        )
                      }
                    />
                  </td>
                  <td>
                    <button
                      onClick={() => toggleProductSelection(item.product)}
                      className="btn btn-outline-danger btn-sm"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="d-flex justify-content-end gap-2 mt-3">
          <button
            onClick={() => setShowBulkAddModal(false)}
            className="btn btn-secondary"
          >
            ยกเลิก
          </button>
          <button onClick={handleSaveBulkAdd} className="btn btn-primary">
            <i className="fas fa-save me-2"></i>
            บันทึกทั้งหมด
          </button>
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
          color: #212529 !important;
          background: #f1f3f6 !important;
          vertical-align: middle !important;
          font-size: 16px !important;
        }

        .table td {
          vertical-align: middle !important;
          color: #333 !important;
        }

        .table {
          margin-bottom: 0;
        }

        .btn,
        .badge {
          font-size: 15px;
        }

        .badge {
          font-weight: normal;
        }

        .btn-group .btn {
          transition: all 0.2s;
        }

        .btn-group .btn:hover {
          transform: translateY(-2px);
        }

        .hover-scale:hover {
          transform: scale(1.02);
        }

        /* Stock page specific styles */
        .card {
          transition: box-shadow 0.3s ease;
          border: none;
        }

        .card:hover {
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);
        }

        .nav-pills .nav-link {
          font-family: "Kanit", sans-serif !important;
          font-weight: 600 !important;
          border-radius: 25px;
          padding: 10px 20px;
          margin-right: 8px;
          transition: all 0.3s ease;
          border: 2px solid transparent;
        }

        .nav-pills .nav-link:hover {
          transform: translateY(-2px);
          background: #f8f9fa;
        }

        .nav-pills .nav-link.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-color: #667eea;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .input-group .form-control {
          border-radius: 25px 0 0 25px;
          border: 2px solid #e5e7eb;
          padding: 12px 20px;
          font-size: 16px;
          transition: all 0.3s ease;
        }

        .input-group .form-control:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .input-group-text {
          background: #f8f9fa;
          border: 2px solid #e5e7eb;
          border-right: none;
          border-radius: 25px 0 0 25px;
        }

        .table-hover tbody tr:hover {
          background-color: #f8fafc;
          transform: scale(1.01);
          transition: all 0.2s ease;
        }

        .table-responsive {
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          border-radius: 8px;
          padding: 8px 16px;
          font-weight: 600;
          transition: all 0.3s ease;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 15px rgba(102, 126, 234, 0.4);
        }

        .btn-warning {
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          border: none;
          color: #1f2937;
          font-weight: 600;
          transition: all 0.3s ease;
        }

        .btn-warning:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 15px rgba(251, 191, 36, 0.4);
          color: #1f2937;
        }

        .btn-danger {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          border: none;
          font-weight: 600;
          transition: all 0.3s ease;
        }

        .btn-danger:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 15px rgba(239, 68, 68, 0.4);
        }

        .alert {
          border-radius: 12px;
          border: none;
          padding: 16px 20px;
          font-weight: 500;
        }

        .alert-info {
          background: linear-gradient(135deg, #e0f2fe 0%, #b3e5fc 100%);
          color: #0277bd;
        }

        .alert-success {
          background: linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%);
          color: #2e7d32;
        }

        .alert-warning {
          background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
          color: #ef6c00;
        }

        .badge {
          border-radius: 20px;
          padding: 6px 12px;
          font-weight: 600;
          font-size: 13px;
        }

        code {
          background: #f1f5f9 !important;
          color: #475569 !important;
          padding: 4px 8px !important;
          border-radius: 6px !important;
          font-family: "Kanit", sans-serif !important;
        }

        .fw-bold {
          font-family: "Kanit", sans-serif !important;
        }

        .text-success {
          color: #059669 !important;
          font-weight: 600 !important;
        }

        .modal-content {
          border-radius: 16px;
          border: none;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
        }

        .modal-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 16px 16px 0 0;
          padding: 20px;
        }

        .modal-title {
          font-family: "Kanit", sans-serif !important;
          font-weight: 600 !important;
        }

        .form-label {
          font-family: "Kanit", sans-serif !important;
          font-weight: 600 !important;
        }

        h5 {
          font-family: "Kanit", sans-serif !important;
        }

        .bg-gradient-dark {
          background: linear-gradient(
            135deg,
            #1f2937 0%,
            #111827 100%
          ) !important;
        }

        /* Pagination Styles */
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

        /* Animation for table rows */
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        tbody tr {
          animation: fadeInUp 0.5s ease-out;
        }

        /* Custom scrollbar */
        .table-responsive::-webkit-scrollbar {
          height: 6px;
        }

        .table-responsive::-webkit-scrollbar-track {
          background: #f1f1f1;
        }

        .table-responsive::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 3px;
        }

        .table-responsive::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
      `}</style>
    </>
  );
}

export default Stock;
