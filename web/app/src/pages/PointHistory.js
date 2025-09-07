import React, { useEffect, useState } from "react";
import Template from "../components/Template";
import config from "../config";
import axios from "axios";
import Swal from "sweetalert2";

function PointHistory() {
  const [pointTransactions, setPointTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalPointsUsed, setTotalPointsUsed] = useState(0);

  useEffect(() => {
    fetchPointTransactions();
  }, []);

  const fetchPointTransactions = async () => {
    try {
      setLoading(true);
      // ใช้ API endpoint ที่แก้ไขใหม่
      const res = await axios.get(config.api_path + "/point-redemption-history", config.headers());
      if (res.data.message === "success") {
        setPointTransactions(res.data.results);
        setTotalPointsUsed(res.data.totalPointsUsed);
      }
    } catch (error) {
      Swal.fire({
        title: "error",
        text: error.message,
        icon: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = pointTransactions.filter(transaction => 
    transaction.Customer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    transaction.Customer?.phone?.includes(searchQuery)
  );

  return (
    <Template>
      <div className="card shadow-sm">
        <div className="card-header bg-primary text-white py-3">
          <div className="d-flex justify-content-between align-items-center">
            <h4 className="mb-0">ประวัติการใช้คะแนนสะสม</h4>
            <div className="bg-white text-primary p-2 rounded">
              <strong>รวมแต้มที่ใช้ทั้งหมด: {totalPointsUsed} แต้ม</strong>
            </div>
          </div>
        </div>
        <div className="card-body">
          <div className="row mb-3">
            <div className="col-md-4">
              <input
                type="text"
                className="form-control"
                placeholder="ค้นหาด้วยชื่อหรือเบอร์โทรลูกค้า..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : filteredTransactions.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead className="table-light">
                  <tr>
                    <th>วันที่</th>
                    <th>ชื่อลูกค้า</th>
                    <th>เบอร์โทร</th>
                    <th>ประเภท</th>
                    <th className="text-end">แต้มที่ใช้</th>
                    <th>รายละเอียด</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction, index) => (
                    <tr key={index}>
                      <td>{new Date(transaction.transactionDate).toLocaleString('th-TH')}</td>
                      <td>{transaction.Customer?.name || '-'}</td>
                      <td>{transaction.Customer?.phone || '-'}</td>
                      <td>
                        {transaction.transactionType === 'REDEEM_REWARD' ? 
                          'แลกของรางวัล' : 
                          transaction.transactionType === 'DISCOUNT' ? 
                          'ส่วนลด' : 
                          transaction.transactionType}
                      </td>
                      <td className="text-end">
                        <span className="text-danger">
                          -{transaction.points}
                        </span>
                      </td>
                      <td>{transaction.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-5">
              <i className="fas fa-history fa-3x text-muted mb-3"></i>
              <p className="text-muted">ไม่พบประวัติการใช้แต้ม</p>
            </div>
          )}
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

        /* PointHistory page specific styles */
        .card {
          transition: box-shadow 0.3s ease;
          border: none;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        }

        .card:hover {
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
        }

        .card-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
          border-radius: 16px 16px 0 0;
          padding: 24px !important;
          border-bottom: none;
        }

        .card-header h4 {
          font-family: "Kanit", sans-serif !important;
          font-weight: 700 !important;
          font-size: 1.5rem !important;
          margin-bottom: 0 !important;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .card-body {
          padding: 30px !important;
          background: #fafbfc;
        }

        .form-control {
          border-radius: 12px;
          border: 2px solid #e5e7eb;
          padding: 14px 20px;
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

        .form-control::placeholder {
          color: #9ca3af;
          font-style: italic;
        }

        .table-responsive {
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
          background: white;
          margin-top: 20px;
        }

        .table {
          margin-bottom: 0 !important;
          font-size: 15px;
        }

        .table th {
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%) !important;
          border-bottom: 2px solid #dee2e6 !important;
          padding: 18px 16px !important;
          font-size: 15px !important;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .table td {
          padding: 16px !important;
          border-bottom: 1px solid #f1f3f4;
        }

        .table-hover tbody tr {
          transition: all 0.2s ease;
        }

        .table-hover tbody tr:hover {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .text-danger {
          color: #ef4444 !important;
          font-weight: 700 !important;
          font-size: 16px;
        }

        .text-primary {
          color: #667eea !important;
          font-weight: 600 !important;
        }

        .text-muted {
          color: #6b7280 !important;
        }

        .spinner-border {
          width: 3rem;
          height: 3rem;
          color: #667eea !important;
        }

        /* Summary card in header */
        .bg-white.text-primary {
          background: white !important;
          color: #667eea !important;
          border-radius: 12px !important;
          font-family: "Kanit", sans-serif !important;
          font-size: 16px !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          border: 2px solid rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
        }

        /* Empty state styling */
        .text-center.py-5 {
          padding: 60px 30px !important;
          background: white;
          border-radius: 16px;
          margin: 20px 0;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }

        .fa-history {
          color: #d1d5db !important;
          margin-bottom: 20px !important;
        }

        .text-center p {
          font-size: 18px !important;
          font-weight: 500 !important;
          color: #6b7280 !important;
          margin-bottom: 0 !important;
        }

        /* Loading state */
        .text-center .spinner-border {
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        /* Transaction type badges */
        .table td:nth-child(4) {
          font-weight: 600;
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

        .table tbody tr {
          animation: fadeInUp 0.5s ease-out;
          animation-fill-mode: both;
        }

        .table tbody tr:nth-child(1) { animation-delay: 0.1s; }
        .table tbody tr:nth-child(2) { animation-delay: 0.15s; }
        .table tbody tr:nth-child(3) { animation-delay: 0.2s; }
        .table tbody tr:nth-child(4) { animation-delay: 0.25s; }
        .table tbody tr:nth-child(5) { animation-delay: 0.3s; }

        /* Custom scrollbar */
        .table-responsive::-webkit-scrollbar {
          height: 8px;
          width: 8px;
        }

        .table-responsive::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }

        .table-responsive::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 4px;
        }

        .table-responsive::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%);
        }

        /* Responsive improvements */
        @media (max-width: 768px) {
          .card-header {
            padding: 20px !important;
          }
          
          .card-body {
            padding: 20px !important;
          }
          
          .table th,
          .table td {
            padding: 12px 8px !important;
            font-size: 14px !important;
          }
          
          .card-header h4 {
            font-size: 1.25rem !important;
          }
        }
      `}</style>
    </Template>
  );
}

export default PointHistory;