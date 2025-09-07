import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import Swal from "sweetalert2";
import axios from "axios";
import config from "../config";
import { Link, useNavigate } from "react-router-dom";
import ExitIcon from "../assets/Exit.svg";
import logoGif from "../assets/coin.gif";
import shopping from "../assets/shopping.gif";
import report from "../assets/report.gif";
import Selling from "../assets/Selling.gif";
import checklist from "../assets/checklist.gif";
import tokenManager from "../utils/tokenManager";

// Add Google Fonts import
const fontStyles = document.createElement('style');
fontStyles.textContent = `
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
`;
document.head.appendChild(fontStyles);

const Sidebar = forwardRef((props, sidebarRef) => {
  const [firstName, setfirstName] = useState();
  const [banks, setBanks] = useState([]);
  const [dropdownStates, setDropdownStates] = useState({
    dashboard: false,
    reports: false,
    settings: false,
    member: false,
    stock: false,
    promotion: false,
    documents: false,
    CRM: false
  });
  const [userLevel, setUserLevel] = useState("");
  const navigate = useNavigate();
  const [showBankModal, setShowBankModal] = useState(false);

  useEffect(() => {
    fetchData();
    // Get user level from localStorage
    const storedUserType = localStorage.getItem("userType");
    const storedUserLevel = localStorage.getItem("userLevel");
    setUserLevel(
      storedUserLevel || (storedUserType === "member" ? "owner" : "employee")
    );
  }, []);


  //5:00-11:59 = "Good Morning"
  //12:00-16:59 = "Good Afternoon"
  //17:00-4:59 = "Good Evening"

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return "Good Morning";
    } else if (hour >= 12 && hour < 17) {
      return "Good Afternoon";
    } else {
      return "Good Evening";
    }
  };

  const handleSignOut = async () => {
    const result = await Swal.fire({
      title: "ออกจากระบบ",
      text: "ยืนยันการออกจากระบบ",
      imageUrl: ExitIcon,
      imageWidth: 200,
      imageHeight: 200,
      showCancelButton: true,
      showConfirmButton: true,
      confirmButtonText: "ออกจากระบบ",
      cancelButtonText: "ยกเลิก"
    });
    
    if (result.isConfirmed) {
      try {
        // เรียก logout API แบบไม่แสดง alert
        const refreshToken = tokenManager.getRefreshToken();
        
        if (refreshToken) {
          try {
            await axios.post(config.api_path + "/member/logout", {
              refreshToken: refreshToken
            });
          } catch (error) {
            console.error('Logout API error:', error);
            // ถึงแม้ API error ก็ยัง clear tokens
          }
        }
        
        // Clear tokens และ redirect โดยไม่แสดง alert
        tokenManager.clearTokens();
        
        // แสดงข้อความสำเร็จ
        await Swal.fire({
          icon: 'success',
          title: 'ออกจากระบบสำเร็จ',
          text: 'ขอบคุณที่ใช้งาน Smart POS',
          timer: 1500,
          showConfirmButton: false
        });
        
        navigate("/");
      } catch (error) {
        console.error('Logout error:', error);
        // ถ้าเกิด error ก็ยัง clear tokens และ redirect
        tokenManager.clearTokens();
        navigate("/");
      }
    }
  };

  const handleTokenError = async (error) => {
    if (
      error.response?.status === 401 ||
      error.response?.status === 403 ||
      error.response?.data?.error === "TOKEN_NOT_FOUND" ||
      error.response?.data?.error === "TOKEN_EXPIRED" ||
      error.response?.data?.error === "TOKEN_INVALID"
    ) {
      try {
        // กรณี token หมดอายุ ให้ใช้ tokenManager.logout() ที่จะแสดงข้อความ session หมดอายุ
        await tokenManager.logout();
      } catch (logoutError) {
        console.error('Logout error:', logoutError);
        // ถ้า logout ล้มเหลวก็ยัง clear tokens และ redirect
        tokenManager.clearTokens();
        navigate("/");
      }
      return true;
    }
    return false;
  };

  const fetchData = async () => {
    try {
      // Get stored user type to determine which endpoint to use
      const userType = localStorage.getItem("userType");
      const endpoint = userType === "employee" ? "/user/info" : "/member/info";

      const res = await axios.get(config.api_path + endpoint, {
        headers: {
          Authorization: `Bearer ${tokenManager.getAccessToken()}`
        }
      });

      if (res.data.message === "success") {
        if (userType === "employee") {
          setfirstName(res.data.result.name); // For employees, use name from user table
        } else {
          setfirstName(res.data.member.firstName); // For owners, use firstName from member table
        }
      }
    } catch (error) {
      if (!handleTokenError(error)) {
        Swal.fire({
          title: "error",
          text: error.message,
          icon: "error",
        });
      }
    }
  };

  const handleDropdownClick = (dropdown) => {
    setDropdownStates((prev) => ({
      ...prev,
      [dropdown]: !prev[dropdown],
    }));
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  useImperativeHandle(sidebarRef, () => ({
    refreshCountBill() {
      fetchData();
    },
  }));

  

  return (
    <>
      <aside
        className="main-sidebar sidebar-dark-primary elevation-4"
        style={styles.sidebar}
      >
        <a href="#" className="brand-link" style={styles.brandLink}>
          <img src={logoGif} alt="AdminLTE Logo" style={styles.brandImage} />
          <span style={styles.brandText}>POS on Cloud</span>
          <button
            onClick={handleSignOut}
            style={styles.signOutButton}
            title="Sign out"
          >
            <i className="fas fa-sign-out-alt"></i>
          </button>
        </a>

        <div className="sidebar">
          <div style={styles.userPanel}>
            <div className="text-white">
              <div className="h5 mb-2">{getGreeting()}</div>
              <div className="h5 mb-2">
                <span className="text-warning">{firstName}</span>
                <span
                  className="badge bg-info ms-2"
                  style={{
                    padding: "5px 10px",
                    borderRadius: "15px",
                    fontSize: "0.8rem",
                    fontWeight: "normal",
                  }}
                >
                  
                </span>   
              </div>
           
             
            </div>
          </div>

        


          <nav className="mt-3">
            <ul
              className="nav nav-pills nav-sidebar flex-column"
              style={styles.navContainer}
            >
              {/* Sale menu - visible to all */}
              <li className="nav-item" style={styles.navItem}>
                <Link to="/sale" className="nav-link" style={styles.navLink}>
                  <span style={styles.navIcon}>
                    <img
                      src={Selling}
                      alt="Selling"
                      style={{ height: "50px", marginRight: "100px" }}
                    />
                  </span>
                  <span className="ml-3" style={styles.navText}>
                    ขายสินค้า
                  </span>
                </Link>
              </li>

              {/* Reports menu - visible to all users */}
              <li
                className={`nav-item ${dropdownStates.reports ? "menu-open" : ""
                }`}
                style={styles.navItem}
              >
                <a
                  href="#"
                  className="nav-link"
                  style={styles.navLink}
                  onClick={() => handleDropdownClick("reports")}
                >
                  <span style={styles.navIcon}>
                    <img
                      src={report}
                      alt="report"
                      style={{ height: "50px", marginRight: "100px" }}
                    />
                  </span>
                  <span className="ml-3" style={styles.navText}>
                    รายงาน
                    <i className="right fas fa-angle-left ms-2"></i>
                  </span>
                </a>
                        <ul
                        className="nav nav-treeview"
                        style={{
                          ...styles.subMenu,
                          display: dropdownStates.reports ? "block" : "none",
                        }}
                        >
                        <li className="nav-item">
                          <a
                          href="#"
                          className="nav-link"
                          style={styles.navLink}
                          onClick={() => handleNavigation("/dashboard")}
                          >
                          <span style={styles.navIcon}>
                            <i className="nav-icon fas fa-chart-line"></i>
                          </span>
                          <span style={styles.navText}>แดชบอร์ด</span>
                          </a>
                        </li>
                      
                       
                        <li className="nav-item" style={styles.navItem}>
                          <Link
                          to="/billSales"
                          className="nav-link"
                          style={styles.navLink}
                          >
                          <span style={styles.navIcon}>
                            <i className="nav-icon fas fa-receipt"></i>
                          </span>
                          <span style={styles.navText}>รายงานบิลขาย</span>
                          </Link>
                        </li>

                        <li className="nav-item" style={styles.navItem}>
                          <Link
                          to="/reportStock"
                          className="nav-link"
                          style={styles.navLink}
                          >
                          <span style={styles.navIcon}>
                            <i className="nav-icon fas fa-boxes"></i>
                          </span>
                          <span style={styles.navText}>รายงาน Stock</span>
                          </Link>
                        </li>
                        <li className="nav-item" style={styles.navItem}>
                          <Link
                          to="/PointHistory"
                          className="nav-link"
                          style={styles.navLink}
                          >
                          <span style={styles.navIcon}>
                            <i className="nav-icon fas fa-star"></i>
                          </span>
                          <span style={styles.navText}>ประวัติการใช้แต้มสะสม</span>
                          </Link>
                        </li>
                        </ul>
              </li>

              {/* Products menu - visible to all */}
              <li
                className={`nav-item ${dropdownStates.documents ? "menu-open" : ""
                  }`}
                style={styles.navItem}
              >
                <a
                  href="#"
                  className="nav-link"
                  style={styles.navLink}
                  onClick={() => handleDropdownClick("documents")}
                >
                  <span style={styles.navIcon}>
                    <img
                      src={shopping}
                      alt="shopping"
                      style={{ height: "50px", marginRight: "100px" }}
                    />
                  </span>
                  <span className="ml-3" style={styles.navText}>
                    สินค้า
                    <i className="right fas fa-angle-left ms-2"></i>
                  </span>
                </a>
                <ul
                  className="nav nav-treeview"
                  style={{
                    ...styles.subMenu,
                    display: dropdownStates.documents ? "block" : "none",
                  }}
                >
                  <li className="nav-item" style={styles.navItem}>
                    <Link
                      to="/product"
                      className="nav-link"
                      style={styles.navLink}
                    >
                      <span style={styles.navIcon}>
                        <i className="nav-icon fas fa-box"></i>
                      </span>
                      <span style={styles.navText}>สต๊อก</span>
                    </Link>
                  </li>

                  <li className="nav-item" style={styles.navItem}>
                    <Link
                      to="/stock"
                      className="nav-link"
                      style={styles.navLink}
                    >
                      <span style={styles.navIcon}>
                        <i className="nav-icon fas fa-home"></i>
                      </span>
                      <span style={styles.navText}>รับสินค้าเข้า Stock</span>
                    </Link>
                  </li>
                </ul>
              </li>
              <li
                className={`nav-item ${dropdownStates.CRM ? "menu-open" : ""
                  }`}
                style={styles.navItem}
              >
                <a
                  href="#"
                  className="nav-link"
                  style={styles.navLink}
                  onClick={() => handleDropdownClick("CRM")}
                >
                  <span style={styles.navIcon}>
                    <img
                      src={checklist}
                      alt="shopping"
                      style={{ height: "50px", marginRight: "100px" }}
                    />
                  </span>
                  <span className="ml-3" style={styles.navText}>
                    CRM
                    <i className="right fas fa-angle-left ms-2"></i>
                  </span>
                </a>
                <ul
                  className="nav nav-treeview"
                  style={{
                    ...styles.subMenu,
                    display: dropdownStates.CRM ? "block" : "none" 
                  }}
                >
                  <li className="nav-item" style={styles.navItem}>
                    <Link
                      to="/customer"
                      className="nav-link"
                      style={styles.navLink}
                    >
                      <span style={styles.navIcon}>
                        <i className="fas fa-users"></i>
                      </span>
                      <span className="ml-3" style={styles.navText}>
                        ข้อมูลลูกค้า
                      </span>
                    </Link>
                  </li>

                  <li className="nav-item" style={styles.navItem}>
                    <Link
                      to="/reward"
                      className="nav-link"
                      style={styles.navLink}
                    >
                      <span style={styles.navIcon}>
                        <i className="fas fa-gift"></i>
                      </span>
                      <span className="ml-3" style={styles.navText}>
                        แลกของรางวัล
                      </span>
                    </Link>
                  </li>
                </ul>
              </li>

            
           
             
            </ul>
          </nav>
        </div>
      </aside>
                  
    </>
  );
});

const styles = {
    sidebar: {
      boxShadow: "2px 0 10px rgba(0,0,0,0.2)",
      transition: "all 0.3s ease",
      height: "100vh",
      background: "linear-gradient(180deg, #2c3e50 0%, #3498db 100%)",
      fontFamily: "Kanit, sans-serif",
    },
    brandLink: {
      display: "flex",
      alignItems: "center",
      padding: "15px",
      background: "rgba(255,255,255,0.1)",
      borderBottom: "1px solid rgba(255,255,255,0.1)",
      transition: "all 0.3s ease",
      fontFamily: "Kanit, sans-serif",
    },
    brandImage: {
      width: "35px",
      height: "35px",
      marginRight: "10px",
      borderRadius: "50%",
      border: "2px solid rgba(255,255,255,0.2)",
    },
    brandText: {
      color: "#fff",
      fontSize: "1.2rem",
      fontWeight: "500",
      fontFamily: "Kanit, sans-serif",
    },
    userPanel: {
      position: "relative", // Add this
      background: "rgba(255,255,255,0.1)",
      padding: "20px",
      margin: "15px",
      borderRadius: "10px",
      boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
      fontFamily: "Kanit, sans-serif",
    },
    signOutButton: {
      position: "absolute",
      top: "10px",
      right: "10px",
      background: "rgba(255,255,255,0.1)",
      border: "none",
      borderRadius: "50%",
      width: "35px",
      height: "35px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#fff",
      transition: "all 0.3s ease",
      cursor: "pointer",
      fontFamily: "Kanit, sans-serif",
      "&:hover": {
        background: "rgba(255,255,255,0.2)",
      },
    },
    upgradeButton: {
      background: "linear-gradient(45deg, #f1c40f, #f39c12)",
      border: "none",
      padding: "8px 15px",
      borderRadius: "5px",
      transition: "all 0.3s ease",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      width: "100%",
      fontFamily: "Kanit, sans-serif",
    },
    billCard: {
      background: "rgba(255,255,255,0.1)",
      margin: "15px",
      borderRadius: "10px",
      padding: "15px",
      fontFamily: "Kanit, sans-serif",
    },
    navContainer: {
      margin: "0",
      padding: "0 10px",
      fontFamily: "Kanit, sans-serif",
    },
    navItem: {
      margin: "2px 0",
      borderRadius: "8px",
      transition: "all 0.3s ease",
      fontFamily: "Kanit, sans-serif",
    },
    navLink: {
      display: "flex",
      alignItems: "center",
      padding: "10px 15px",
      color: "#fff",
      borderRadius: "8px",
      transition: "all 0.3s ease",
      fontFamily: "Kanit, sans-serif",
      "&:hover": {
        background: "rgba(255,255,255,0.1)",
      },
    },
    navIcon: {
      width: "25px",
      textAlign: "center",
      marginRight: "10px",
    },
    navText: {
      flex: 1,
      fontFamily: "Kanit, sans-serif",
    },
    subMenu: {
      paddingLeft: "15px",
      fontFamily: "Kanit, sans-serif",
    },
  };

export default Sidebar;
