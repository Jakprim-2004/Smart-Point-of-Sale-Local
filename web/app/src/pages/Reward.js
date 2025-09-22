import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Template from "../components/Template";
import config from "../config";
import axios from "axios";
import Swal from "sweetalert2";
import Modal from "../components/Modal";

function Reward() {
  const location = useLocation();
  const [rewards, setRewards] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  // Add new state for reward form
  const [newReward, setNewReward] = useState({
    name: "",
    description: "",
    pointsCost: "",
    stock: "",
  });

  const [editingReward, setEditingReward] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    loadRewards();
    loadCustomers();

    // ตรวจสอบว่ามีข้อมูลลูกค้าที่ส่งมาจากหน้าอื่นหรือไม่
    if (location.state && location.state.selectedCustomer) {
      const customer = location.state.selectedCustomer;
      setSelectedCustomer(customer);
      setSearchQuery(`${customer.name} (${customer.phone})`);
    }
  }, [location]);

  // ฟังก์ชันตรวจสอบสถานะการแลก
  const getRedeemButtonStatus = (reward) => {
    if (!selectedCustomer) {
      return {
        disabled: true,
        className: "btn btn-secondary", // สีเทา
        text: "กรุณาเลือกลูกค้า",
      };
    }
    if (reward.stock <= 0) {
      return {
        disabled: true,
        className: "btn btn-secondary",
        text: "สินค้าหมด",
      };
    }
    if (selectedCustomer.points < reward.pointsCost) {
      return {
        disabled: true,
        className: "btn btn-secondary",
        text: "แต้มไม่พอ",
      };
    }
    return {
      disabled: false,
      className: "btn btn-primary", // สีฟ้า
      text: "แลกของรางวัล",
    };
  };

  // ฟังก์ชันกรองของรางวัลที่แสดงผล
  const getFilteredRewards = () => {
    let filteredRewards = rewards;
    
    if (selectedCustomer) {
      // กรองเฉพาะของรางวัลที่แต้มพอและมีสต็อก
      filteredRewards = rewards.filter(reward => 
        selectedCustomer.points >= reward.pointsCost && reward.stock > 0
      );
    }
    
    // เรียงตามชื่อ ก-ฮ (เรียงตัวอักษรไทย) โดยอัตโนมัติ
    return filteredRewards.sort((a, b) => {
      return a.name.localeCompare(b.name, 'th', { numeric: true });
    });
  };

  const loadRewards = async () => {
    try {
      const response = await axios.get(
        config.api_path + "/rewards",
        config.headers()
      );
      setRewards(response.data.results);
    } catch (error) {
      console.error("Error loading rewards:", error);
      Swal.fire("Error", "ไม่สามารถโหลดข้อมูลของรางวัลได้", "error");
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await axios.get(
        config.api_path + "/customers",
        config.headers()
      );
      setCustomers(response.data.result);
    } catch (error) {
      console.error("Error loading customers:", error);
    }
  };

  const handleRedeem = async (reward) => {
    if (!selectedCustomer) {
      Swal.fire(
        "กรุณาเลือกลูกค้า",
        "โปรดเลือกลูกค้าก่อนแลกของรางวัล",
        "warning"
      );
      return;
    }

    if (selectedCustomer.points < reward.pointsCost) {
      Swal.fire(
        "แต้มไม่พอ",
        "ลูกค้ามีแต้มไม่เพียงพอสำหรับแลกของรางวัลนี้",
        "warning"
      );
      return;
    }

    try {
      setLoading(true);

      // สร้างข้อความอธิบายการแลกของรางวัลที่ละเอียดขึ้น
      const detailedDescription = [
        `แลกของรางวัล: ${reward.name}`,
        reward.description ? ` ${reward.description}` : "",
      ]
        .filter(Boolean)
        .join(" | "); // กรองข้อความว่างออก

      const response = await axios.post(
        config.api_path + "/rewards/redeem",
        {
          customerId: selectedCustomer.id,
          rewardId: reward.id,
          pointTransaction: {
            customerId: selectedCustomer.id,
            points: reward.pointsCost,
            transactionType: "REDEEM_REWARD",
            description: detailedDescription,
          },
        },
        config.headers()
      );

      if (response.data.message === "success") {
        // อัพเดทข้อมูลของรางวัลในหน้าจอทันที
        setRewards(response.data.result.updatedRewards);

        // อัพเดทข้อมูลลูกค้าที่เลือกไว้
        setSelectedCustomer(response.data.result.customer);

        // อัพเดทข้อมูลในรายการลูกค้าทั้งหมด
        setCustomers((prevCustomers) =>
          prevCustomers.map((customer) =>
            customer.id === response.data.result.customer.id
              ? response.data.result.customer
              : customer
          )
        );

        // ปรับปรุงรายการลูกค้าที่กรองไว้
        setFilteredCustomers((prevFiltered) =>
          prevFiltered.map((customer) =>
            customer.id === response.data.result.customer.id
              ? response.data.result.customer
              : customer
          )
        );

        Swal.fire({
          title: "สำเร็จ",
          text: "แลกของรางวัลเรียบร้อยแล้ว",
          icon: "success",
          timer: 1500,
        });
      }
    } catch (error) {
      Swal.fire(
        "Error",
        error.response?.data?.message || "ไม่สามารถแลกของรางวัลได้",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSearchCustomer = (query) => {
    setSearchQuery(query);
    if (!query) {
      setFilteredCustomers([]);
      return;
    }

    const filtered = customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(query.toLowerCase()) ||
        customer.phone.includes(query)
    );
    
    // เรียงลูกค้าตามชื่อ ก-ฮ
    const sortedFiltered = filtered.sort((a, b) => {
      return a.name.localeCompare(b.name, 'th', { numeric: true });
    });
    
    setFilteredCustomers(sortedFiltered);
  };

  // Add new handler for reward creation
  const handleCreateReward = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post(
        `${config.api_path}/rewards`,
        newReward,
        config.headers()
      );

      if (response.data.message === "success") {
        await loadRewards();
        Swal.fire("สำเร็จ", "เพิ่มของรางวัลเรียบร้อยแล้ว", "success");
        setUploadModalOpen(false);
        setNewReward({ name: "", description: "", pointsCost: "", stock: "" });
      }
    } catch (error) {
      console.error("Error:", error);
      if (error.response?.data?.error === "กรุณาเข้าสู่ระบบใหม่") {
        Swal.fire("Error", "กรุณาเข้าสู่ระบบใหม่", "error");
      } else {
        Swal.fire("Error", "ไม่สามารถเพิ่มของรางวัลได้", "error");
      }
    }
  };

  const handleEditClick = (reward) => {
    setEditingReward({ ...reward });
    setShowEditModal(true);
  };

  const handleUpdateReward = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.put(
        `${config.api_path}/rewards/${editingReward.id}`,
        editingReward,
        config.headers()
      );

      if (response.data.message === "success") {
        await loadRewards();
        Swal.fire("สำเร็จ", "แก้ไขของรางวัลเรียบร้อยแล้ว", "success");
        setShowEditModal(false);
        setEditingReward(null);
      }
    } catch (error) {
      Swal.fire("Error", "ไม่สามารถแก้ไขของรางวัลได้", "error");
    }
  };

  const handleDeleteReward = (reward) => {
    Swal.fire({
      title: "ยืนยันการลบ",
      text: `ต้องการลบของรางวัล ${reward.name} ใช่หรือไม่?`,
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
            `${config.api_path}/rewards/${reward.id}`,
            config.headers()
          );
          await loadRewards();
          Swal.fire("สำเร็จ", "ลบของรางวัลเรียบร้อยแล้ว", "success");
        } catch (error) {
          Swal.fire("Error", "ไม่สามารถลบของรางวัลได้", "error");
        }
      }
    });
  };

  return (
    <Template>
      <div className="container mt-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2>แลกของรางวัล</h2>
          <div className="d-flex gap-2">
            {!selectedCustomer && (
              <button
                className="btn btn-success"
                onClick={() => setShowCustomerSearch(!showCustomerSearch)}
              >
                <i className="fas fa-user-plus me-2"></i>
                เลือกลูกค้า
              </button>
            )}
            <button
              className="btn btn-primary"
              onClick={() => setUploadModalOpen(true)}
            >
              <i className="fas fa-sitemap me-2"></i>
              เพิ่มของรางวัล
            </button>
          </div>
        </div>

        {/* Customer Search Section */}
        {showCustomerSearch && (
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">ค้นหาและเลือกลูกค้า</h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="ค้นหาด้วยชื่อหรือเบอร์โทร..."
                    value={searchQuery}
                    onChange={(e) => handleSearchCustomer(e.target.value)}
                  />
                </div>
              </div>
              {filteredCustomers.length > 0 && (
                <div className="mt-3">
                  <div className="list-group" style={{maxHeight: '300px', overflowY: 'auto'}}>
                    {filteredCustomers.map((customer) => (
                      <button
                        key={customer.id}
                        className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setSearchQuery(`${customer.name} (${customer.phone})`);
                          setShowCustomerSearch(false);
                          setFilteredCustomers([]);
                        }}
                      >
                        <div>
                          <h6 className="mb-1">{customer.name}</h6>
                          <small className="text-muted">{customer.phone}</small>
                        </div>
                        <span className="badge bg-primary rounded-pill">
                          {customer.points} แต้ม
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {searchQuery && filteredCustomers.length === 0 && (
                <div className="mt-3 text-center text-muted">
                  <i className="fas fa-search fa-2x mb-2"></i>
                  <p>ไม่พบลูกค้าที่ตรงกับการค้นหา</p>
                </div>
              )}
            </div>
          </div>
        )}

        {selectedCustomer && (
          <div className="alert alert-info mb-4">
            <h5>ข้อมูลลูกค้า</h5>
            <p className="mb-1">ชื่อ: {selectedCustomer.name}</p>
            <p className="mb-1">แต้มสะสม: {selectedCustomer.points} แต้ม</p>
            <p className="mb-0">
              ระดับสมาชิก: {selectedCustomer.membershipTier}
            </p>
            <hr className="my-3" />
            <div className="d-flex justify-content-between align-items-center">
              <span className="text-success fw-bold">
                <i className="fas fa-gift me-2"></i>
                ของรางวัลที่แลกได้: {getFilteredRewards().length} รายการ
              </span>
              <span className="text-muted">
                จากทั้งหมด {rewards.length} รายการ
              </span>
            </div>
          </div>
        )}

        {!selectedCustomer && (
          <div className="alert alert-warning mb-4">
            <div className="d-flex align-items-center">
              <i className="fas fa-user-plus fa-2x me-3"></i>
              <div>
                <h5 className="mb-1">กรุณาเลือกลูกค้าก่อน</h5>
                <p className="mb-0">เพื่อดูของรางวัลที่สามารถแลกได้</p>
              </div>
            </div>
          </div>
        )}

        <div className="row">
          {getFilteredRewards().length > 0 ? (
            getFilteredRewards().map((reward) => (
              <div key={reward.id} className="col-md-4 mb-4">
                <div className="card h-100">
                  <div className="card-body">
                    <h5 className="card-title">{reward.name}</h5>
                    <p className="card-text">{reward.description}</p>
                    <p className="card-text">
                      <small className="text-muted">
                        ใช้แต้ม: {reward.pointsCost} แต้ม
                      </small>
                    </p>
                    <p className="card-text">
                      <small className="text-muted">
                        คงเหลือ: {reward.stock} ชิ้น
                      </small>
                    </p>
                    <div className="d-flex gap-2">
                      {/* แทนที่ปุ่มเดิม */}
                      {(() => {
                        const buttonStatus = getRedeemButtonStatus(reward);
                        return (
                          <button
                            className={buttonStatus.className}
                            onClick={() => handleRedeem(reward)}
                            disabled={buttonStatus.disabled || loading}
                            title={buttonStatus.text}
                          >
                            {buttonStatus.text}
                          </button>
                        );
                      })()}
                      <button
                        className="btn btn-warning"
                        onClick={() => handleEditClick(reward)}
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleDeleteReward(reward)}
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-12">
              <div className="text-center py-5">
                {selectedCustomer ? (
                  <div className="empty-state">
                    <i className="fas fa-sad-tear fa-4x text-muted mb-3"></i>
                    <h4 className="text-muted mb-2">ไม่มีของรางวัลที่แลกได้</h4>
                    <p className="text-muted">
                      ลูกค้าต้องการแต้มเพิ่มเติมเพื่อแลกของรางวัล<br />
                      หรือของรางวัลทั้งหมดอาจหมดสต็อกแล้ว
                    </p>
                    <div className="mt-3">
                      <small className="text-info">
                        แต้มปัจจุบัน: {selectedCustomer.points} แต้ม
                      </small>
                    </div>
                  </div>
                ) : (
                  <div className="empty-state">
                    <i className="fas fa-users fa-4x text-muted mb-3"></i>
                    <h4 className="text-muted mb-2">เลือกลูกค้าเพื่อดูของรางวัล</h4>
                    <p className="text-muted">
                      กรุณาเลือกลูกค้าก่อนเพื่อดูของรางวัลที่สามารถแลกได้
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal
        show={uploadModalOpen}
        onHide={() => setUploadModalOpen(false)}
        title="เพิ่มของรางวัลใหม่"
      >
        <form onSubmit={handleCreateReward}>
          <div className="modal-body" style={{overflow: 'hidden', maxHeight: '350px'}}>
            <div className="mb-3">
              <label className="form-label">
                ชื่อของรางวัล <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                value={newReward.name}
                onChange={(e) =>
                  setNewReward({ ...newReward, name: e.target.value })
                }
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label">รายละเอียด</label>
              <textarea
                className="form-control"
                value={newReward.description}
                onChange={(e) =>
                  setNewReward({ ...newReward, description: e.target.value })
                }
                rows="3"
              />
            </div>
            <div className="mb-3">
              <label className="form-label">
                แต้มที่ใช้แลก <span className="text-danger">*</span>
              </label>
              <input
                type="number"
                className="form-control"
                value={newReward.pointsCost}
                onChange={(e) =>
                  setNewReward({ ...newReward, pointsCost: e.target.value })
                }
                required
                min="1"
              />
            </div>
            <div className="mb-3">
              <label className="form-label">
                จำนวนของรางวัล <span className="text-danger">*</span>
              </label>
              <input
                type="number"
                className="form-control"
                value={newReward.stock}
                onChange={(e) =>
                  setNewReward({ ...newReward, stock: e.target.value })
                }
                required
                min="0"
              />
            </div>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setUploadModalOpen(false)}
            >
              ยกเลิก
            </button>
            <button type="submit" className="btn btn-success px-4 py-2">
              บันทึก
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        title="แก้ไขของรางวัล"
      >
        <form onSubmit={handleUpdateReward}>
          <div className="modal-body" style={{overflow: 'hidden', maxHeight: '350px'}}>
            <div className="mb-3">
              <label className="form-label">ชื่อของรางวัล</label>
              <input
                type="text"
                className="form-control"
                value={editingReward?.name || ""}
                onChange={(e) =>
                  setEditingReward({ ...editingReward, name: e.target.value })
                }
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label">รายละเอียด</label>
              <textarea
                className="form-control"
                value={editingReward?.description || ""}
                onChange={(e) =>
                  setEditingReward({
                    ...editingReward,
                    description: e.target.value,
                  })
                }
                rows="3"
              />
            </div>
            <div className="mb-3">
              <label className="form-label">แต้มที่ใช้แลก</label>
              <input
                type="number"
                className="form-control"
                value={editingReward?.pointsCost || ""}
                onChange={(e) =>
                  setEditingReward({
                    ...editingReward,
                    pointsCost: e.target.value,
                  })
                }
                required
                min="1"
              />
            </div>
            <div className="mb-3">
              <label className="form-label">จำนวนของรางวัล</label>
              <input
                type="number"
                className="form-control"
                value={editingReward?.stock || ""}
                onChange={(e) =>
                  setEditingReward({ ...editingReward, stock: e.target.value })
                }
                required
                min="0"
              />
            </div>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowEditModal(false)}
            >
              ยกเลิก
            </button>
            <button type="submit" className="btn btn-primary">
              บันทึก
            </button>
          </div>
        </form>
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

        /* Reward page specific styles */
        .container {
          max-width: 1200px;
          padding: 30px 20px;
        }

        h2 {
          font-family: "Kanit", sans-serif !important;
          font-weight: 700 !important;
          font-size: 2.5rem !important;
          color: #2d3748;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          margin-bottom: 30px !important;
        }

        /* Header buttons */
        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          border-radius: 12px;
          padding: 12px 24px;
          font-weight: 600;
          font-size: 16px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .btn-primary:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
        }

        .btn-warning {
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          border: none;
          border-radius: 8px;
          padding: 8px 12px;
          font-weight: 600;
          color: #1f2937;
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
          border-radius: 8px;
          padding: 8px 12px;
          font-weight: 600;
          transition: all 0.3s ease;
        }

        .btn-danger:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 15px rgba(239, 68, 68, 0.4);
        }

        .btn-secondary {
          background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
          border: none;
          border-radius: 8px;
          padding: 8px 16px;
          font-weight: 600;
          transition: all 0.3s ease;
        }

        .btn-success {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border: none;
          border-radius: 12px;
          padding: 12px 24px;
          font-weight: 600;
          font-size: 16px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .btn-success:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 20px rgba(16, 185, 129, 0.4);
        }

        /* Customer info alert improvements */
        .alert-info hr {
          border-color: rgba(1, 87, 155, 0.2);
          margin: 16px 0;
        }

        .alert-info .text-success {
          color: #047857 !important;
          font-size: 16px;
        }

        .alert-warning {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border: none;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 30px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
          border-left: 5px solid #f59e0b;
        }

        .alert-warning h5 {
          font-family: "Kanit", sans-serif !important;
          font-weight: 700 !important;
          color: #92400e;
          margin-bottom: 8px;
          font-size: 1.25rem;
        }

        .alert-warning p {
          color: #b45309;
          font-size: 16px;
          margin: 0;
        }

        .alert-warning .fas {
          color: #f59e0b;
        }

        /* Customer search section */
        .card-header {
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          border-bottom: 2px solid #e5e7eb;
          padding: 20px 24px;
        }

        .card-header h5 {
          font-family: "Kanit", sans-serif !important;
          font-weight: 600 !important;
          color: #374151;
          margin: 0;
        }

        .list-group {
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        .list-group-item {
          border: none;
          border-bottom: 1px solid #f1f5f9;
          padding: 16px 20px;
          transition: all 0.2s ease;
        }

        .list-group-item:hover {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          transform: translateX(5px);
        }

        .list-group-item h6 {
          font-family: "Kanit", sans-serif !important;
          font-weight: 600 !important;
          color: #374151;
          margin-bottom: 4px;
        }

        .badge.bg-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
          font-size: 13px;
          padding: 6px 12px;
          font-weight: 600;
        }

        /* Empty state styles */
        .empty-state {
          padding: 60px 30px;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border-radius: 20px;
          border: 2px dashed #cbd5e1;
          margin: 30px;
          transition: all 0.3s ease;
        }

        .empty-state:hover {
          border-color: #94a3b8;
          transform: translateY(-2px);
        }

        .empty-state .fas {
          color: #94a3b8 !important;
          margin-bottom: 20px;
          transition: color 0.3s ease;
        }

        .empty-state:hover .fas {
          color: #667eea !important;
        }

        .empty-state h4 {
          font-family: "Kanit", sans-serif !important;
          font-weight: 600 !important;
          color: #6b7280;
          margin-bottom: 12px;
        }

        .empty-state p {
          color: #9ca3af;
          font-size: 16px;
          line-height: 1.6;
          margin-bottom: 16px;
        }

        .empty-state .text-info {
          background: rgba(59, 130, 246, 0.1);
          color: #2563eb !important;
          padding: 8px 16px;
          border-radius: 20px;
          display: inline-block;
          font-weight: 600;
        }

        /* Search section improvements */
        .card .card-body {
          background: white;
        }

        /* Customer counter styling */
        .d-flex.justify-content-between .text-success {
          background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
          padding: 8px 16px;
          border-radius: 20px;
          border: 2px solid #34d399;
        }

        .d-flex.justify-content-between .text-muted {
          font-style: italic;
        }

        /* Customer info alert */
        .alert-info {
          background: linear-gradient(135deg, #e0f2fe 0%, #b3e5fc 100%);
          border: none;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 30px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
          border-left: 5px solid #0277bd;
        }

        .alert-info h5 {
          font-family: "Kanit", sans-serif !important;
          font-weight: 700 !important;
          color: #0277bd;
          margin-bottom: 16px;
          font-size: 1.25rem;
        }

        .alert-info p {
          font-size: 16px;
          font-weight: 500;
          color: #01579b;
          margin-bottom: 8px;
        }

        /* Reward cards */
        .card {
          border: none;
          border-radius: 20px;
          overflow: hidden;
          transition: all 0.3s ease;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          background: white;
          height: 100%;
        }

        .card:hover {
          transform: translateY(-8px);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
        }

        .card-body {
          padding: 30px;
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .card-title {
          font-family: "Kanit", sans-serif !important;
          font-weight: 700 !important;
          font-size: 1.5rem !important;
          color: #2d3748;
          margin-bottom: 16px;
          line-height: 1.3;
        }

        .card-text {
          font-size: 16px;
          color: #4a5568;
          line-height: 1.6;
          margin-bottom: 12px;
        }

        .card-text:last-of-type {
          margin-bottom: 24px;
        }

        .text-muted {
          color: #6b7280 !important;
          font-weight: 500;
        }

        /* Button container in cards */
        .d-flex.gap-2 {
          margin-top: auto;
          gap: 12px !important;
        }

        /* Modals */
        .modal-content {
          border-radius: 20px;
          border: none;
          box-shadow: 0 15px 50px rgba(0, 0, 0, 0.2);
          overflow: hidden;
        }

        .modal-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-bottom: none;
          padding: 24px 30px;
        }

        .modal-title {
          font-family: "Kanit", sans-serif !important;
          font-weight: 700 !important;
          font-size: 1.5rem;
          margin: 0;
        }

        .modal-body {
          padding: 30px;
          background: #fafbfc;
        }

        .modal-footer {
          background: #fafbfc;
          border-top: 1px solid #e5e7eb;
          padding: 20px 30px;
          gap: 12px;
        }

        .form-label {
          font-family: "Kanit", sans-serif !important;
          font-weight: 600 !important;
          font-size: 16px;
          color: #374151;
          margin-bottom: 8px;
        }

        .form-control {
          border-radius: 12px;
          border: 2px solid #e5e7eb;
          padding: 14px 18px;
          font-size: 16px;
          transition: all 0.3s ease;
          background: white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
        }

        .form-control:focus {
          border-color: #667eea;
          box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1), 0 4px 8px rgba(0, 0, 0, 0.08);
          transform: translateY(-1px);
        }

        textarea.form-control {
          resize: vertical;
          min-height: 100px;
        }

        .text-danger {
          color: #ef4444 !important;
          font-weight: 600;
        }

        /* Grid layout improvements */
        .row {
          margin: 0 -15px;
        }

        .col-md-4 {
          padding: 0 15px;
          margin-bottom: 30px;
        }

        /* Animations */
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .card {
          animation: fadeInUp 0.6s ease-out;
          animation-fill-mode: both;
        }

        .col-md-4:nth-child(1) .card { animation-delay: 0.1s; }
        .col-md-4:nth-child(2) .card { animation-delay: 0.2s; }
        .col-md-4:nth-child(3) .card { animation-delay: 0.3s; }
        .col-md-4:nth-child(4) .card { animation-delay: 0.4s; }
        .col-md-4:nth-child(5) .card { animation-delay: 0.5s; }
        .col-md-4:nth-child(6) .card { animation-delay: 0.6s; }

        /* Loading state */
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none !important;
        }

        /* Special styling for different button states */
        .btn[title="กรุณาเลือกลูกค้า"],
        .btn[title="สินค้าหมด"],
        .btn[title="แต้มไม่พอ"] {
          background: linear-gradient(135deg, #9ca3af 0%, #6b7280 100%) !important;
          cursor: not-allowed;
        }

        /* Responsive design */
        @media (max-width: 768px) {
          .container {
            padding: 20px 15px;
          }

          h2 {
            font-size: 2rem !important;
            text-align: center;
          }

          .d-flex.justify-content-between {
            flex-direction: column;
            gap: 20px;
            align-items: stretch;
          }

          .card-body {
            padding: 20px;
          }

          .card-title {
            font-size: 1.25rem !important;
          }

          .modal-body,
          .modal-footer {
            padding: 20px;
          }

          .col-md-4 {
            margin-bottom: 20px;
          }
        }

        /* Enhanced hover effects */
        .btn:not(:disabled):hover {
          transform: translateY(-2px);
          transition: all 0.3s ease;
        }

        .card:hover .card-title {
          color: #667eea;
          transition: color 0.3s ease;
        }

        /* Icon improvements */
        .fas {
          transition: transform 0.2s ease;
        }

        .btn:hover .fas {
          transform: scale(1.1);
        }
      `}</style>
    </Template>
  );
}

export default Reward;
