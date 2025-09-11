import React, { useEffect, useState } from "react";
import Template from "../components/Template";
import config from "../config";
import axios from "axios";
import Swal from "sweetalert2";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

function Dashboard() {
  // ฟังก์ชันสำหรับแปลงวันที่เป็นภาษาไทย
  const formatThaiDate = (date) => {
    if (!date) return '';
    const thaiMonths = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    const day = date.getDate();
    const month = thaiMonths[date.getMonth()];
    const year = date.getFullYear() + 543; // แปลงเป็น พ.ศ.
    return `${day} ${month} ${year}`;
  };

  // ใช้เวลาไทยสำหรับการคำนวณวันที่
  const getThaiDate = () => {
    const now = new Date();
    const thaiTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Bangkok"}));
    return thaiTime;
  };

  const myDate = getThaiDate();
  const [year, setYear] = useState(myDate.getFullYear());
  const [month, setMonth] = useState(myDate.getMonth() + 1);
  const [viewType, setViewType] = useState("daily"); 
  const [topSellingViewType, setTopSellingViewType] = useState('products');
  const [arrYear,] = useState(() => {
    let arr = [];
    const y = getThaiDate().getFullYear();
    const startYear = y - 5;
    for (let i = startYear; i <= y; i++) {
      arr.push(i);
    }
    return arr;
  });

  const [myData, setMyData] = useState([]);
  const [topSellingProducts, setTopSellingProducts] = useState([]);
  const [topSellingCategories, setTopSellingCategories] = useState([]);
  const [totalSales, setTotalSales] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [todaySales, setTodaySales] = useState({
    date: new Date(),
    totalAmount: 0,
    billCount: 0,
    averagePerBill: 0,
    hourlyData: [],
    topProducts: [],
    growthRate: 0,
    yesterdayTotal: 0,
    yesterdayBillCount: 0,
    yesterdayAveragePerBill: 0,
  });
  const [currentTime, setCurrentTime] = useState(getThaiDate());
  const [paymentStats, setPaymentStats] = useState([]);
  
  // Add state for daily view toggle
  const [dailyViewMode, setDailyViewMode] = useState("today"); // today or yesterday
  
  // Add states for product details section
  const [dateRange, setDateRange] = useState("today");
  const [dateRangeValue, setDateRangeValue] = useState([null, null]);
  const [showSold, setShowSold] = useState(true);
  const [combinedStockData, setCombinedStockData] = useState([]);

  // เพิ่มฟังก์ชันสำหรับแสดงชื่อเดือนภาษาไทย
  const getThaiMonthName = (monthNumber) => {
    const thaiMonths = [
      "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", 
      "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", 
      "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    ];
    return thaiMonths[monthNumber - 1];
  };

  const [options,] = useState({
    responsive: true,
    maintainAspectRatio: false,
    aspectRatio: window.innerWidth < 768 ? 0.8 : 1.8,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: "top",
        align: 'center',
        labels: {
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 12,
          font: {
            size: 13,
            family: 'Kanit'
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: { size: 14, family: 'Kanit' },
        bodyFont: { size: 13, family: 'Kanit' },
        padding: 12,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          title: function(tooltipItems) {
            const day = tooltipItems[0].label;
            return `${day}`;
          },
          label: function (tooltipItem) {
            let label = tooltipItem.dataset.label || "";
            if (label) {
              label += ": ";
            }
            label += parseFloat(tooltipItem.raw).toLocaleString('th-TH') + " บาท";
            return label;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        min: 1,
        grace: '5%',
        grid: {
          color: 'rgba(0, 0, 0, 0.08)',
          lineWidth: 1
        },
        border: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          color: '#6c757d',
          font: {
            size: 13,
            family: '"Kanit", sans-serif',
            weight: '400'
          },
          callback: function (value) {
            const num = parseFloat(value) || 0;
            return Math.floor(num).toLocaleString('th-TH') + " บาท";
          },
          stepSize: 1,
          maxTicksLimit: 8,
          padding: 15
        },
      },
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
          lineWidth: 1
        },
        border: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          color: '#6c757d',
          font: {
            size: 13,
            family: '"Kanit", sans-serif',
            weight: '400'
          },
          maxRotation: 45,
          minRotation: 0,
          padding: 15
        }
      },
    },
    elements: {
      point: {
        radius: 4,
        hoverRadius: 8,
        borderWidth: 2
      },
      line: {
        borderWidth: 3,
        tension: 0.1
      }
    },
    animation: {
      duration: 1000,
      easing: 'easeInOutQuart'
    }
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getThaiDate());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    reportTopSellingProducts();
    reportTopSellingCategories();
    getTodaySalesReport();
    getPaymentStats();
    reportSumSalePerMonth();
    fetchCombinedStockData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, viewType, dateRange, dateRangeValue, dailyViewMode]);

  useEffect(() => {
    fetchCombinedStockData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, dateRangeValue]);

  const reportSumSalePerMonth = async () => {
    try {
      const url = config.api_path + "/reportSumSalePerMonth";
      const payload = { year, month, viewType };
      const res = await axios.post(url, payload, config.headers());

      if (res.data.message === "success") {
        const results = res.data.results || [];
        
        let salesData = [],
          profitData = [],
          costData = [];

        if (viewType === "daily") {
          const daysInMonth = new Date(year, month, 0).getDate();
          salesData = Array(daysInMonth).fill(0);
          profitData = Array(daysInMonth).fill(0);
          costData = Array(daysInMonth).fill(0);
          results.forEach((item) => {
            salesData[item.day - 1] = parseFloat(item.sum || 0);
            profitData[item.day - 1] = parseFloat(item.profit || 0);
            costData[item.day - 1] = parseFloat(item.cost || 0);
          });
        } else if (viewType === "monthly") {
          salesData = Array(12).fill(0);
          profitData = Array(12).fill(0);
          costData = Array(12).fill(0);
          results.forEach((item) => {
            salesData[item.month - 1] = parseFloat(item.sum || 0);
            profitData[item.month - 1] = parseFloat(item.profit || 0);
            costData[item.month - 1] = parseFloat(item.cost || 0);
          });
        }

        let labels = [];
        
        if (viewType === "monthly") {
          labels = [
            "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน",
            "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม",
            "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
          ];
        } else {
          const daysInMonth = new Date(year, month, 0).getDate();
          labels = [];
          for (let i = 1; i <= daysInMonth; i++) {
            labels.push(`${i} ${getThaiMonthName(month)}`);
          }
        }
        
        setMyData({
          labels,
          datasets: [
            {
              label: "ยอดขาย",
              data: salesData,
              backgroundColor: "rgba(54, 162, 235, 0.4)",
              borderColor: "rgba(54, 162, 235, 1)",
              borderWidth: 2,
              tension: 0.3,
              fill: false,
              pointRadius: 4,
              pointHoverRadius: 6
            },
            {
              label: "ต้นทุน",
              data: costData,
              backgroundColor: "rgba(255, 99, 132, 0.4)",
              borderColor: "rgba(255, 99, 132, 1)",
              borderWidth: 2,
              tension: 0.3,
              fill: false,
              pointRadius: 4,
              pointHoverRadius: 6
            },
            {
              label: "กำไร",
              data: profitData,
              backgroundColor: "rgba(75, 192, 192, 0.4)",
              borderColor: "rgba(75, 192, 192, 1)",
              borderWidth: 2,
              tension: 0.3,
              fill: false,
              pointRadius: 4,
              pointHoverRadius: 6
            }
          ],
        });

        setTotalSales(res.data.totalSales);
        setTotalProfit(res.data.totalProfit);
        setTotalCost(res.data.totalCost);
      }
    } catch (e) {
      Swal.fire({
        title: "error",
        text: e.message,
        icon: "error",
      });
    }
  };

 

 

  const reportTopSellingProducts = async () => {
    try {
      const url = config.api_path + "/reportTopSellingProducts";
      const res = await axios.get(url, config.headers());
      
      if (res.data.message === "success") {
        const filteredResults = res.data.results.slice(0, 5);
        setTopSellingProducts(filteredResults);
      }
    } catch (e) {
      Swal.fire({
        title: "error",
        text: e.message,
        icon: "error",
      });
    }
  };

  const reportTopSellingCategories = async () => {
    try {
      const url = config.api_path + "/reportTopSellingCategories";
      const res = await axios.get(url, config.headers());
      
      if (res.data.message === "success") {
        // Don't filter by status as API now does the filtering correctly
        setTopSellingCategories(res.data.results);
      }
    } catch (e) {
      console.error("Error fetching top selling categories:", e);
      // Set a default value in case of error
      setTopSellingCategories([{
        category: 'เกิดข้อผิดพลาดในการโหลดข้อมูล',
        totalQty: 0,
        totalAmount: 0,
        percentage: 100
      }]);
      
      Swal.fire({
        title: "error", 
        text: e.message,
        icon: "error",
      });
    }
  };

  const getTodaySalesReport = async () => {
    try {
      // Always fetch today's data first to get both today and yesterday comparison
      const todayRes = await axios.get(config.api_path + "/todaySalesReport", config.headers());

      if (todayRes.data.message === "success") {
        const todayData = todayRes.data.results;

        // Set data structure with proper today/yesterday values
        setTodaySales({
          date: new Date(todayData.date),
          // Today's actual data
          totalAmount: todayData.totalAmount || 0,
          billCount: todayData.billCount || 0,
          averagePerBill: todayData.averagePerBill || 0,
          // Yesterday's data from the API
          yesterdayTotal: todayData.yesterdayTotal || 0,
          yesterdayBillCount: todayData.yesterdayBillCount || 0,
          yesterdayAveragePerBill: todayData.yesterdayAveragePerBill || 0,
          // Other data
          hourlyData: todayData.hourlyData || [],
          topProducts: todayData.topProducts || [],
          growthRate: todayData.growthRate || 0,
        });
      }
    } catch (error) {
      Swal.fire({
        title: "error",
        text: "ไม่สามารถดึงข้อมูลยอดขายได้",
        icon: "error",
      });
    }
  };

  const getPaymentStats = async () => {
    try {
      const url = config.api_path + "/paymentMethodStats";
      const res = await axios.get(url, config.headers());
      if (res.data.message === "success") {
        setPaymentStats(res.data.results);
      }
    } catch (e) {
      Swal.fire({
        title: "error",
        text: e.message,
        icon: "error",
      });
    }
  };

  const fetchCombinedStockData = async () => {
    try {
      // First fetch stock report data
      const stockReportRes = await axios.get(`${config.api_path}/stock/report`, config.headers());
      const stockReport = stockReportRes.data.results || [];

      // Then fetch combined report data
      const url = config.api_path + "/stock/combinedReport";
      let startDate = new Date();
      let endDate = new Date();

      // กำหนดช่วงเวลาตามที่เลือก
      switch (dateRange) {
        case 'yesterday':
          startDate.setDate(startDate.getDate() - 1);
          endDate = new Date(startDate);
          break;
        case 'last7days':
          startDate.setDate(startDate.getDate() - 6);
          break;
        case 'last30days':
          startDate.setDate(startDate.getDate() - 29);
          break;
        case 'lastMonth':
          startDate = new Date(startDate.getFullYear(), startDate.getMonth() - 1, 1);
          endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
          break;
        case 'custom':
          if (dateRangeValue[0] && dateRangeValue[1]) {
            startDate = dateRangeValue[0];
            endDate = dateRangeValue[1];
          }
          break;
        default:
          // case 'today' เป็นค่าเริ่มต้น ไม่ต้องกำหนดอะไร
          break;
      }

      // ตั้งค่าเวลาเริ่มต้นและสิ้นสุด
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      // เรียก API combinedReport
      const res = await axios.post(url, {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        dateRange: dateRange
      }, config.headers());

      // ตรวจสอบผลลัพธ์
      if (res.data.message === "success") {

        // สร้าง map ของข้อมูล stock
        const stockMap = new Map(stockReport.map(item => [item.result.id, {
          stockIn: item.stockIn || 0,
          stockOut: item.stockOut || 0,
          remainingQty: item.stockIn - item.stockOut
        }]));

        // รวมข้อมูลการขายกับข้อมูล stock และคำนวณกำไรที่ถูกต้อง
        const combinedData = res.data.results.map(item => {
          const stockData = stockMap.get(item.productId) || { remainingQty: 0 };

          // คำนวณกำไรสุทธิอีกครั้งเพื่อความถูกต้อง
          const calculatedProfit = (item.price - item.cost) * item.soldQty;

          // ใช้ค่าที่คำนวณใหม่เสมอ เนื่องจากพบปัญหากับข้อมูลจาก API
          return {
            ...item,
            remainingQty: Math.max(0, stockData.remainingQty),
            barcode: item.barcode || '-',
            name: item.name || 'ไม่ระบุชื่อ',
            cost: typeof item.cost === 'number' ? item.cost : 0,
            price: typeof item.price === 'number' ? item.price : 0,
            // ใช้ค่ากำไรที่คำนวณเอง แทนค่าจาก API ที่อาจไม่ถูกต้อง
            netProfit: calculatedProfit
          };
        });

        // เรียงลำดับตามกำไรสุทธิจากมากไปน้อย
        combinedData.sort((a, b) => b.netProfit - a.netProfit);

        setCombinedStockData(combinedData);
      } else {
        console.error('Error response from API:', res.data);
        Swal.fire({
          title: "ไม่สามารถดึงข้อมูลได้",
          text: "ระบบไม่สามารถดึงข้อมูลสินค้าได้ในขณะนี้",
          icon: "warning"
        });
      }
    } catch (e) {
      console.error('Error fetching combined stock data:', e);
      Swal.fire({
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถดึงข้อมูลสินค้าได้ กรุณาลองใหม่อีกครั้ง",
        icon: "error"
      });
    }
  };

  const renderTopSalesChart = () => {
    const sortedProducts = [...combinedStockData]
      .sort((a, b) => b.netProfit - a.netProfit) // เปลี่ยนจาก soldQty เป็น netProfit
      .slice(0, 5);

    const chartColors = [
      { bg: 'rgba(75, 192, 192, 0.6)', border: 'rgba(75, 192, 192, 1)' },   // เขียว
      { bg: 'rgba(54, 162, 235, 0.6)', border: 'rgba(54, 162, 235, 1)' },   // น้ำเงิน
      { bg: 'rgba(255, 99, 132, 0.6)', border: 'rgba(255, 99, 132, 1)' },   // แดง
      { bg: 'rgba(255, 159, 64, 0.6)', border: 'rgba(255, 159, 64, 1)' },   // ส้ม
      { bg: 'rgba(153, 102, 255, 0.6)', border: 'rgba(153, 102, 255, 1)' }  // ม่วง
    ];

    return (
      <div className="card mt-4">
        <div className="card-header bg-white">
          <h5 className="mb-0">สินค้าที่ทำกำไรสูงสุด 5 อันดับ</h5>
        </div>
        <div className="card-body">
          <div style={{ height: '450px' }}>
            <Bar
              data={{
                labels: sortedProducts.map(item => item.name),
                datasets: [{
                  label: 'กำไรสุทธิ',
                  data: sortedProducts.map(item => item.netProfit),
                  backgroundColor: sortedProducts.map((_, index) => chartColors[index].bg),
                  borderColor: sortedProducts.map((_, index) => chartColors[index].border),
                  borderWidth: 1
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                  padding: {
                    top: 20,
                    bottom: 30,
                    left: 20,
                    right: 20
                  }
                },
                plugins: {
                  legend: {
                    display: false
                  },
                  tooltip: {
                    callbacks: {
                      label: function (context) {
                        return `${formatNumber(context.raw)}`;
                      }
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: false,
                    min: 1,
                    grace: '5%',
                    ticks: {
                      stepSize: 1,
                      padding: 15,
                      color: '#8e9aaf',
                      font: {
                        size: 12,
                        family: '"Kanit", sans-serif',
                        weight: '400'
                      },
                      callback: function (value) {
                        return  Math.floor(value).toLocaleString('th-TH') + " บาท";
                      }
                    },
                    title: {
                      display: true,
                      text: 'กำไรสุทธิ (บาท)',
                      color: '#6c757d',
                      font: {
                        size: 13,
                        family: '"Kanit", sans-serif',
                        weight: '500'
                      }
                    }
                  },
                  x: {
                    ticks: {
                      padding: 15,
                      maxRotation: 45,
                      minRotation: 0,
                      color: '#8e9aaf',
                      font: {
                        size: 12,
                        family: '"Kanit", sans-serif',
                        weight: '400'
                      }
                    },
                    title: {
                      display: true,
                      text: 'ชื่อสินค้า',
                      color: '#6c757d',
                      font: {
                        size: 13,
                        family: '"Kanit", sans-serif',
                        weight: '500'
                      }
                    }
                  }
                }
              }}
            />
          </div>
        </div>
      </div>
    );
  };

  const formatNumber = (num) => {
    return Number(num).toLocaleString("th-TH");
  };

  const chartContainerStyle = {
    height: window.innerWidth < 768 ? '600px' : '900px',
    width: '100%',
    maxWidth: '100%',
    margin: '0 auto',
    position: 'relative',
    overflow: 'visible',
    padding: '10px 0'
  };



  return (
    <Template>
      <div id="datepicker-portal"></div>

      <div className="dashboard-container">
      

        {/* Header Section */}
        <div className="header-section">
          <div className="d-flex justify-content-between align-items-center flex-wrap">
            <div>
              <h1 className="section-title mb-2">
                <i className="fas fa-chart-line me-3" style={{ color: '#667eea' }}></i>
                แดชบอร์ดภาพรวมธุรกิจ
              </h1>
              <p className="text-muted mb-0">
                <i className="fas fa-clock me-2"></i>
                อัปเดตล่าสุด: {currentTime.toLocaleDateString('th-TH', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })} | {currentTime.toLocaleTimeString('th-TH')}
              </p>
            </div>
            <div className="toggle-buttons">
              <button
                className={`toggle-btn ${dailyViewMode === 'today' ? 'active' : ''}`}
                onClick={() => setDailyViewMode('today')}
              >
                <i className="fas fa-calendar-day me-2"></i>วันนี้
              </button>
              <button
                className={`toggle-btn ${dailyViewMode === 'yesterday' ? 'active' : ''}`}
                onClick={() => setDailyViewMode('yesterday')}
              >
                <i className="fas fa-calendar-minus me-2"></i>เมื่อวาน
              </button>
            </div>
          </div>
        </div>

        {/* Main Statistics */}
        <div className="stats-grid">
          <div className="gradient-card" style={{ background: 'linear-gradient(135deg, #4a5bcc 0%, #5a4289 100%)' }}>
            <div className="card-body text-white text-center position-relative" style={{ 
              zIndex: 2, 
              padding: '30px',
              textShadow: '2px 2px 8px rgba(0, 0, 0, 0.8)'
            }}>
              <div className="icon-wrapper">
                <i className="fas fa-coins" style={{ fontSize: '2.5rem', filter: 'drop-shadow(2px 2px 4px rgba(0, 0, 0, 0.5))' }}></i>
              </div>
              <div className="metric-label mb-2">
                {dailyViewMode === 'today' ? 'ยอดขายวันนี้' : 'ยอดขายเมื่อวาน'}
              </div>
              <div className="metric-number">
                {dailyViewMode === 'today' 
                  ? todaySales.totalAmount.toLocaleString()
                  : todaySales.yesterdayTotal.toLocaleString()
                } บาท
              </div>
              <div className="comparison-text mt-3">
                <i className="fas fa-chart-line me-2"></i>
                {dailyViewMode === 'today' 
                  ? `เมื่อวาน: ${todaySales.yesterdayTotal.toLocaleString()} บาท`
                  : `วันนี้: ${todaySales.totalAmount.toLocaleString()} บาท`
                }
              </div>
            </div>
          </div>

          <div className="gradient-card" style={{ background: 'linear-gradient(135deg, #2d6e3e 0%, #26a69a 100%)' }}>
            <div className="card-body text-white text-center position-relative" style={{ 
              zIndex: 2, 
              padding: '30px',
              textShadow: '2px 2px 8px rgba(0, 0, 0, 0.8)'
            }}>
              <div className="icon-wrapper">
                <i className="fas fa-receipt" style={{ fontSize: '2.5rem', filter: 'drop-shadow(2px 2px 4px rgba(0, 0, 0, 0.5))' }}></i>
              </div>
              <div className="metric-label mb-2">
                {dailyViewMode === 'today' ? 'จำนวนบิลวันนี้' : 'จำนวนบิลเมื่อวาน'}
              </div>
              <div className="metric-number">
                {dailyViewMode === 'today' 
                  ? todaySales.billCount
                  : todaySales.yesterdayBillCount
                } บิล
              </div>
              <div className="comparison-text mt-3">
                <i className="fas fa-receipt me-2"></i>
                {dailyViewMode === 'today' 
                  ? `เมื่อวาน: ${todaySales.yesterdayBillCount} บิล`
                  : `วันนี้: ${todaySales.billCount} บิล`
                }
              </div>
            </div>
          </div>

          <div className="gradient-card" style={{ background: 'linear-gradient(135deg, #c72e6a 0%, #d4a347 100%)' }}>
            <div className="card-body text-white text-center position-relative" style={{ zIndex: 2, padding: '30px', textShadow: '2px 2px 8px rgba(0,0,0,0.8)' }}>
              <div className="icon-wrapper">
                <i className="fas fa-calculator" style={{ fontSize: '2.5rem' }}></i>
              </div>
              <div className="metric-label mb-2">ค่าเฉลี่ยต่อบิล</div>
              <div className="metric-number">
                {dailyViewMode === 'today' 
                  ? todaySales.averagePerBill.toLocaleString()
                  : todaySales.yesterdayAveragePerBill.toLocaleString()
                } บาท
              </div>
              <div className="comparison-text mt-3">
                <i className="fas fa-calculator me-2"></i>
                {dailyViewMode === 'today' 
                  ? `เมื่อวาน: ${todaySales.yesterdayAveragePerBill.toLocaleString()} บาท`
                  : `วันนี้: ${todaySales.averagePerBill.toLocaleString()} บาท`
                }
              </div>
            </div>
          </div>
        </div>

        {/* Top Selling Products and Payment Methods */}
        <div className="row g-4 mb-4">
          <div className="col-lg-6">
            <div className="selling-products-card">
              <div className="chart-header">
                <div className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center">
                    <i className="fa fa-trophy me-3" style={{ fontSize: '1.5rem' }}></i>
                    <div>
                      <h5 className="mb-0">
                        {topSellingViewType === 'products' ? 'สินค้า' : 'หมวดหมู่'}ขายดี 5 อันดับ
                      </h5>
                      <small className="opacity-75">อันดับการขายในวันนี้</small>
                    </div>
                  </div>
                  <select
                    value={topSellingViewType}
                    onChange={e => setTopSellingViewType(e.target.value)}
                    className="form-select"
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      border: '1px solid rgba(255,255,255,0.3)',
                      color: 'white',
                      width: 'auto'
                    }}
                  >
                    <option value="products" style={{ color: '#1a1a1a' }}>สินค้า</option>
                    <option value="categories" style={{ color: '#1a1a1a' }}>หมวดหมู่</option>จำนวนขาย	
                  </select>
                </div>
              </div>
              <div className="card-body p-0" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                {(topSellingViewType === 'products' ? topSellingProducts.length === 0 : topSellingCategories.length === 0) ? (
                  <div className="text-center py-5">
                    <div className="icon-wrapper mx-auto mb-3" style={{ background: 'rgba(108, 117, 125, 0.1)' }}>
                      <i className="fas fa-chart-bar fa-2x text-muted"></i>
                    </div>
                    <h6 className="text-muted">
                      ไม่มีข้อมูล{topSellingViewType === 'products' ? 'สินค้าขายดี' : 'หมวดหมู่ขายดี'}
                    </h6>
                  </div>
                ) : (
                  <div style={{ padding: '10px' }}>
                    {(topSellingViewType === 'products' ? topSellingProducts : topSellingCategories).map((item, index) => {
                      const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];
                      const itemName = topSellingViewType === 'products' 
                        ? (item.productName || 'สินค้าไม่มีชื่อ')
                        : (item.category || 'ไม่ระบุหมวดหมู่');
                      const qty = parseInt(item.totalQty || 0);
                      const amount = parseFloat(item.totalAmount || 0);
                      
                      return (
                        <div
                          key={index}
                          className="product-item"
                          style={{ borderLeftColor: colors[index] }}
                        >
                          <div className="rank-badge" style={{ background: colors[index] }}>
                            {index + 1}
                          </div>
                          <div className="row align-items-center">
                            <div className="col-8">
                              <h6 className="mb-1 fw-bold text-dark">{itemName}</h6>
                              <small className="text-muted">{amount.toLocaleString('th-TH')} บาท</small>
                            </div>
                            <div className="col-4 text-end">
                              <div className="fw-bold text-success" style={{ fontSize: '1.2rem' }}>
                                {qty} ชิ้น
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="col-lg-6">
            <div className="selling-products-card">
              <div className="chart-header">
                <div className="d-flex align-items-center">
                  <i className="fas fa-credit-card me-3" style={{ fontSize: '1.5rem' }}></i>
                  <div>
                    <h5 className="mb-0">วิธีการชำระเงิน</h5>
                    <small className="opacity-75">สถิติการชำระเงินวันนี้</small>
                  </div>
                </div>
              </div>
              <div className="card-body">
                {paymentStats.length > 0 ? (
                  <div>
                    <div className="text-center mb-4">
                      <h4 className="text-primary mb-0">
                        {paymentStats.reduce((sum, stat) => sum + parseFloat(stat.total || 0), 0).toLocaleString('th-TH')} บาท
                      </h4>
                      <small className="text-muted">ยอดรวมทั้งหมด</small>
                    </div>
                    <div className="row g-3">
                      {paymentStats.map((stat, index) => {
                        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'];
                        const amount = parseFloat(stat.total || 0);
                        const total = paymentStats.reduce((sum, s) => sum + parseFloat(s.total || 0), 0);
                        const percentage = ((amount / total) * 100).toFixed(1);
                        
                        return (
                          <div key={index} className={paymentStats.length === 2 ? "col-6" : paymentStats.length === 3 ? "col-4" : paymentStats.length >= 4 ? "col-3" : "col-12"}>
                            <div
                              className="payment-method-card"
                              style={{ 
                                '--payment-color': colors[index],
                                background: `linear-gradient(135deg, ${colors[index]}15 0%, ${colors[index]}05 100%)`,
                                border: `2px solid ${colors[index]}30`,
                                borderRadius: '20px',
                                padding: '30px 25px',
                                textAlign: 'center',
                                transition: 'all 0.3s ease',
                                position: 'relative',
                                overflow: 'hidden',
                                minHeight: '160px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center'
                              }}
                            >
                              <div 
                                style={{
                                  position: 'absolute',
                                  top: '0',
                                  left: '50%',
                                  transform: 'translateX(-50%)',
                                  width: '80px',
                                  height: '6px',
                                  background: colors[index],
                                  borderRadius: '0 0 15px 15px'
                                }}
                              ></div>
                              <div className="mt-2">
                                <h5 className="mb-3 fw-bold" style={{ color: colors[index], fontSize: '1.3rem' }}>
                                  {stat.paymentMethod}
                                </h5>
                                <div className="fw-bold text-dark mb-3" style={{ fontSize: '1.6rem' }}>
                                  {amount.toLocaleString('th-TH')} บาท
                                </div>
                                <div className="d-flex justify-content-between align-items-center">
                                  <span className="text-muted" style={{ fontSize: '1rem' }}>{stat.count || 0} รายการ</span>
                                  <span className="fw-bold" style={{ color: colors[index], fontSize: '1.1rem' }}>{percentage}%</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-5">
                    <div className="icon-wrapper mx-auto mb-3" style={{ background: 'rgba(108, 117, 125, 0.1)' }}>
                      <i className="fas fa-credit-card fa-2x text-muted"></i>
                    </div>
                    <h6 className="text-muted">ไม่มีข้อมูลการชำระเงิน</h6>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards Section */}
        <div className="summary-cards-section">
          <h2 className="section-title text-white mb-4">
            <i className="fas fa-chart-pie me-3"></i>
            สรุปยอดขายรวม
          </h2>
          <div className="row g-4">
            <div className="col-md-4">
              <div className="summary-card">
                <div className="summary-card-header" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                  <div className="d-flex align-items-center">
                    <i className="fas fa-chart-line me-2"></i>
                    ยอดขายทั้งหมด (บาท)
                  </div>
                </div>
                <div className="summary-card-body">
                  <h3 className="metric-number text-primary">{formatNumber(totalSales)}</h3>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="summary-card">
                <div className="summary-card-header" style={{ background: 'linear-gradient(135deg, #ffa726 0%, #ff7043 100%)' }}>
                  <div className="d-flex align-items-center">
                    <i className="fas fa-coins me-2"></i>
                    ต้นทุนรวม (บาท)
                  </div>
                </div>
                <div className="summary-card-body">
                  <h3 className="metric-number text-warning">{formatNumber(totalCost)}</h3>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="summary-card">
                <div className="summary-card-header" style={{ background: 'linear-gradient(135deg, #66bb6a 0%, #43a047 100%)' }}>
                  <div className="d-flex align-items-center">
                    <i className="fas fa-trophy me-2"></i>
                    กำไรสุทธิ (บาท)
                  </div>
                </div>
                <div className="summary-card-body">
                  <h3 className="metric-number text-success">{formatNumber(totalProfit)}</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      
        
        {/* Chart Section */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="chart-container">
              <div className="chart-header">
                <div className="d-flex justify-content-between align-items-center flex-wrap">
                  <div>
                    <h5 className="mb-0">
                      <i className="fas fa-chart-area me-2"></i>
                      กราฟแสดงยอดขาย ต้นทุน และกำไร
                    </h5>
                    <small className="opacity-75">วิเคราะห์แนวโน้มการขาย</small>
                  </div>
                  <div className="d-flex gap-2 flex-wrap">
                    <select
                      className="form-select"
                      value={viewType}
                      onChange={(e) => setViewType(e.target.value)}
                      style={{
                        background: 'rgba(255,255,255,0.2)',
                        border: '1px solid rgba(255,255,255,0.3)',
                        color: 'white',
                        width: 'auto'
                      }}
                    >
                      <option value="daily" style={{ color: '#1a1a1a' }}>รายวัน</option>
                      <option value="monthly" style={{ color: '#1a1a1a' }}>รายเดือน</option>
                    </select>
                    {viewType !== "monthly" && (
                      <select
                        className="form-select"
                        value={month}
                        onChange={(e) => setMonth(parseInt(e.target.value))}
                        style={{
                          background: 'rgba(255,255,255,0.2)',
                          border: '1px solid rgba(255,255,255,0.3)',
                          color: 'white',
                          width: 'auto'
                        }}
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                          <option key={m} value={m} style={{ color: '#1a1a1a' }}>
                            {getThaiMonthName(m)}
                          </option>
                        ))}
                      </select>
                    )}
                    <select
                      className="form-select"
                      value={year}
                      onChange={(e) => setYear(parseInt(e.target.value))}
                      style={{
                        background: 'rgba(255,255,255,0.2)',
                        border: '1px solid rgba(255,255,255,0.3)',
                        color: 'white',
                        width: 'auto'
                      }}
                    >
                      {arrYear.map(y => (
                        <option key={y} value={y} style={{ color: '#1a1a1a' }}>
                          ปี {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="card-body" style={{ padding: '30px' }}>
                <div style={chartContainerStyle}>
                  {myData.datasets && myData.datasets.length > 0 ? (
                    <>
                      <Line options={options} data={myData} />
                      <div className="text-center mt-4">
                        <small className="text-muted">
                          <i className="fas fa-info-circle me-2"></i>
                          กดที่จุดในกราฟเพื่อดูรายละเอียดเพิ่มเติม
                        </small>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-5">
                      <div className="icon-wrapper mx-auto mb-3" style={{ background: 'rgba(108, 117, 125, 0.1)' }}>
                        <i className="fas fa-chart-line fa-3x text-muted"></i>
                      </div>
                      <h5 className="text-muted mb-3">ไม่พบข้อมูลสำหรับช่วงเวลาที่เลือก</h5>
                      <p className="text-muted">กรุณาเลือกช่วงเวลาอื่น หรือตรวจสอบว่ามีข้อมูลการขายในช่วงเวลาดังกล่าว</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Product Details Section */}
        <div className="row">
          <div className="col-12">
            <div className="chart-container">
              <div className="chart-header">
                <div className="d-flex justify-content-between align-items-center flex-wrap">
                  <div>
                    <h5 className="mb-0">
                      <i className="fas fa-boxes me-2"></i>
                      รายละเอียดสินค้า
                    </h5>
                    <small className="opacity-75">ข้อมูลการขายและสต็อกสินค้า</small>
                  </div>
                  <div className="d-flex gap-2 align-items-center flex-wrap">
                 
                    <select
                      className="form-select"
                      value={dateRange}
                      onChange={(e) => setDateRange(e.target.value)}
                      style={{
                        background: 'rgba(255,255,255,0.2)',
                        border: '1px solid rgba(255,255,255,0.3)',
                        color: 'white',
                        width: 'auto'
                      }}
                    >
                      <option value="today" style={{ color: '#1a1a1a' }}>วันนี้</option>
                      <option value="yesterday" style={{ color: '#1a1a1a' }}>เมื่อวาน</option>
                      <option value="last7days" style={{ color: '#1a1a1a' }}>7 วันล่าสุด</option>
                      <option value="last30days" style={{ color: '#1a1a1a' }}>เดือนนี้</option>
                      <option value="lastMonth" style={{ color: '#1a1a1a' }}>เดือนที่แล้ว</option>
                      <option value="custom" style={{ color: '#1a1a1a' }}>กำหนดช่วงเวลา</option>
                    </select>
                    {dateRange === "custom" && (
                      <div 
                        style={{ 
                          zIndex: 99999, 
                          position: 'relative',
                          minWidth: '280px'
                        }}
                        className="datepicker-container"
                      >
                        <DatePicker
                          selectsRange={true}
                          startDate={dateRangeValue[0]}
                          endDate={dateRangeValue[1]}
                          onChange={(update) => setDateRangeValue(update)}
                          dateFormat="dd/MM/yyyy"
                          isClearable={false}
                          placeholderText="เลือกช่วงวันที่..."
                          showMonthDropdown
                          showYearDropdown
                          dropdownMode="select"
                          maxDate={new Date()}
                          monthsShown={1}
                          todayButton="🏠 วันนี้"
                          calendarStartDay={0}
                          popperPlacement="bottom-start"
                          withPortal
                          portalId="datepicker-portal"
                          locale={{
                            localize: {
                              month: (month) => [
                                'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
                                'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
                                'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
                              ][month],
                              day: (day) => [
                                'อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 
                                'พฤหัสบดี', 'ศุกร์', 'เสาร์'
                              ][day],
                              dayPeriod: (dayPeriod) => dayPeriod === 'AM' ? 'ก่อนเที่ยง' : 'หลังเที่ยง',
                            },
                            formatLong: {
                              date: () => 'dd/MM/yyyy',
                              time: () => 'HH:mm',
                              dateTime: () => 'dd/MM/yyyy HH:mm'
                            },
                            code: 'th-TH'
                          }}
                          customInput={
                            <div className="thai-datepicker-input">
                              <div className="input-icon">
                                <i className="fas fa-calendar-alt"></i>
                              </div>
                              <div className="input-content">
                                <span className="input-label">ช่วงวันที่</span>
                                <span className="input-value">
                                  {dateRangeValue[0] && dateRangeValue[1]
                                    ? `${formatThaiDate(dateRangeValue[0])} ถึง ${formatThaiDate(dateRangeValue[1])}`
                                    : dateRangeValue[0]
                                    ? `${formatThaiDate(dateRangeValue[0])} ถึง ...`
                                    : 'กรุณาเลือกช่วงวันที่'
                                  }
                                </span>
                              </div>
                              {(dateRangeValue[0] || dateRangeValue[1]) && (
                                <div 
                                  className="clear-button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDateRangeValue([null, null]);
                                  }}
                                >
                                  <i className="fas fa-times"></i>
                                </div>
                              )}
                            </div>
                          }
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="card-body" style={{ padding: '30px' }}>
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)' }}>
                        <th className="border-0" style={{ borderRadius: '10px 0 0 0', fontWeight: 600, width: '60px', color: '#1a1a1a' }}>ลำดับ</th>
                        <th className="border-0" style={{ fontWeight: 600, color: '#1a1a1a' }}>บาร์โค้ด</th>
                        <th className="border-0" style={{ fontWeight: 600, color: '#1a1a1a' }}>ชื่อสินค้า</th>
                        {showSold && <th className="border-0" style={{ fontWeight: 600, color: '#1a1a1a' }}>จำนวนขาย (ชิ้น)</th>}
                        <th className="border-0" style={{ fontWeight: 600, color: '#1a1a1a' }}>รวมเป็นเงิน (บาท)</th>
                        <th className="border-0" style={{ borderRadius: '0 10px 10px 0', fontWeight: 600, color: '#1a1a1a' }}>กำไรสุทธิ (บาท)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {combinedStockData.length > 0 ? (
                        combinedStockData.map((item, index) => {
                          const expectedProfit = (item.price - item.cost) * item.soldQty;
                          const displayProfit = Math.abs(expectedProfit - item.netProfit) > 100
                            ? expectedProfit
                            : item.netProfit;

                          return (
                            <tr key={index} className="border-0">
                              <td className="border-0 py-3">
                                <span className="badge bg-secondary">{index + 1}</span>
                              </td>
                              <td className="border-0 py-3">
                                <span style={{ color: '#1a1a1a', fontWeight: '500' }}>{item.barcode || '-'}</span>
                              </td>
                              <td className="border-0 py-3">
                                <div style={{ color: '#1a1a1a', fontWeight: '600' }}>{item.name || '-'}</div>
                              </td>
                              {showSold && (
                                <td className="border-0 py-3">
                                  <span style={{ color: '#1a1a1a', fontWeight: '600' }}>{formatNumber(item.soldQty) || 0} </span>
                                </td>
                              )}
                              <td className="border-0 py-3">
                                <div className="fw-bold" style={{ color: '#0d6efd' }}>{formatNumber(item.totalAmount) || 0}</div>
                              </td>
                              <td className="border-0 py-3">
                                <div className="fw-bold" style={{ color: '#198754' }}>
                                  {formatNumber(displayProfit) || 0}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={showSold ? 6 : 5} className="text-center py-5 border-0">
                            <div className="text-muted">
                              <i className="fas fa-info-circle fa-2x mb-3"></i>
                              <div>ไม่พบข้อมูลสินค้าในช่วงเวลาที่เลือก</div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                
                {/* Top Sales Chart */}
                {combinedStockData.length > 0 && (
                  <div className="mt-4">
                    <h6 className="mb-3" style={{ 
                      fontFamily: '"Kanit", sans-serif',
                      fontWeight: 'bold',
                      color: '#2c3e50',
                      fontSize: '1.25rem'
                    }}>
                      <i className="fas fa-trophy me-2 text-warning"></i>
                      สินค้าที่ทำกำไรสูงสุด 5 อันดับ
                    </h6>
                    <div style={{ 
                      height: '600px', 
                      padding: '30px 20px 50px 20px',
                      background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                      borderRadius: '15px',
                      boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                      border: '1px solid rgba(0,0,0,0.08)'
                    }}>
                      <Bar
                        data={{
                          labels: [...combinedStockData]
                            .sort((a, b) => b.netProfit - a.netProfit)
                            .slice(0, 5)
                            .map(item => item.name),
                          datasets: [{
                            label: 'กำไรสุทธิ',
                            data: [...combinedStockData]
                              .sort((a, b) => b.netProfit - a.netProfit)
                              .slice(0, 5)
                              .map(item => item.netProfit),
                            backgroundColor: [
                              'rgba(46, 125, 50, 0.8)',   // เขียวเข้ม
                              'rgba(25, 118, 210, 0.8)',  // น้ำเงินเข้ม
                              'rgba(211, 47, 47, 0.8)',   // แดงเข้ม
                              'rgba(245, 124, 0, 0.8)',   // ส้มเข้ม
                              'rgba(123, 31, 162, 0.8)'   // ม่วงเข้ม
                            ],
                            borderColor: [
                              'rgba(46, 125, 50, 1)',     // เขียวเข้ม
                              'rgba(25, 118, 210, 1)',    // น้ำเงินเข้ม
                              'rgba(211, 47, 47, 1)',     // แดงเข้ม
                              'rgba(245, 124, 0, 1)',     // ส้มเข้ม
                              'rgba(123, 31, 162, 1)'     // ม่วงเข้ม
                            ],
                            borderWidth: 2
                          }]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          layout: {
                            padding: {
                              top: 30,
                              bottom: 50,
                              left: 30,
                              right: 30
                            }
                          },
                          plugins: {
                            legend: {
                              display: false
                            },
                            tooltip: {
                              backgroundColor: 'rgba(33, 37, 41, 0.95)',
                              titleColor: '#ffffff',
                              bodyColor: '#ffffff',
                              borderColor: 'rgba(255, 255, 255, 0.2)',
                              borderWidth: 1,
                              titleFont: { 
                                size: 16, 
                                family: '"Kanit", sans-serif',
                                weight: 'bold'
                              },
                              bodyFont: { 
                                size: 14, 
                                family: '"Kanit", sans-serif'
                              },
                              padding: 15,
                              cornerRadius: 10,
                              displayColors: true,
                              callbacks: {
                                title: function(context) {
                                  return context[0].label;
                                },
                                label: function (context) {
                                  return `กำไรสุทธิ: ${formatNumber(context.raw)} บาท`;
                                }
                              }
                            }
                          },
                          scales: {
                            y: {
                              beginAtZero: true,
                              grid: {
                                color: 'rgba(0, 0, 0, 0.12)',
                                lineWidth: 1
                              },
                              border: {
                                color: 'rgba(0, 0, 0, 0.2)'
                              },
                              ticks: {
                                padding: 20,
                                color: '#6c757d',
                                font: {
                                  size: 13,
                                  family: '"Kanit", sans-serif',
                                  weight: '400'
                                },
                                callback: function (value) {
                                  return  Math.floor(value).toLocaleString('th-TH')+ ' บาท';
                                }
                              },
                              title: {
                                display: true,
                                text: 'กำไรสุทธิ (บาท)',
                                color: '#495057',
                                font: {
                                  size: 14,
                                  family: '"Kanit", sans-serif',
                                  weight: '500'
                                }
                              }
                            },
                            x: {
                              grid: {
                                color: 'rgba(0, 0, 0, 0.08)',
                                lineWidth: 1
                              },
                              border: {
                                color: 'rgba(0, 0, 0, 0.2)'
                              },
                              ticks: {
                                padding: 20,
                                color: '#000000',
                                font: {
                                  size: 15,
                                  family: '"Kanit", sans-serif',
                                  weight: 'bold'
                                },
                                maxRotation: 45,
                                minRotation: 0
                              }
                        
                             
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
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

        .text-muted {
          color: #495057 !important;
        }

        .text-dark {
          color: #212529 !important;
        }

        .dashboard-container {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 20px;
        }

        .glass-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }

        .gradient-card {
          border-radius: 20px;
          border: none;
          overflow: hidden;
          transition: all 0.3s ease;
          position: relative;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        }

        .gradient-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(45deg, rgba(255,255,255,0.2), rgba(255,255,255,0.05));
          z-index: 1;
        }

        .gradient-card:hover {
          transform: translateY(-10px) scale(1.02);
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.2);
        }

        .icon-wrapper {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.25);
          margin: 0 auto 20px;
          backdrop-filter: blur(10px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
        }

        .metric-number {
          font-size: 2.5rem;
          font-weight: 700;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .metric-label {
          font-size: 1.1rem;
          font-weight: 500;
          opacity: 0.9;
        }

        .comparison-text {
          background: rgba(255, 255, 255, 0.2);
          padding: 8px 12px;
          border-radius: 10px;
          font-size: 0.9rem;
        }

        .header-section {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          padding: 30px;
          margin-bottom: 30px;
        }

        .toggle-buttons {
          background: rgba(102, 126, 234, 0.1);
          border-radius: 15px;
          padding: 5px;
        }

        .toggle-btn {
          border: none;
          background: transparent;
          padding: 12px 24px;
          border-radius: 10px;
          font-weight: 500;
          transition: all 0.3s ease;
          color: #667eea;
        }

        .toggle-btn.active {
          background: #667eea;
          color: white;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        }

        .section-title {
          font-family: "Kanit", sans-serif;
          font-size: 1.8rem;
          font-weight: 600;
          color: #1a202c;
          margin-bottom: 20px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 25px;
          margin-bottom: 30px;
        }

        .chart-container {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          width: 100%;
          position: relative;
        }

        .chart-container .card-body {
          padding: 30px;
          position: relative;
          z-index: 2;
        }

        .chart-container canvas {
          width: 100% !important;
          height: auto !important;
          max-height: 900px !important;
          min-height: 600px !important;
          display: block !important;
        }

        @media (max-width: 768px) {
          .chart-container canvas {
            max-height: 500px !important;
            min-height: 300px !important;
          }
        }

        .chart-header {
          background: linear-gradient(135deg, #4a5bcc 0%, #5a4289 100%);
          color: white;
          padding: 20px 30px;
          border: none;
          text-shadow: 2px 2px 8px rgba(0, 0, 0, 0.7);
          position: relative;
        }

        .chart-header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.2);
          z-index: -1;
        }

        .selling-products-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
          overflow: hidden;
          height: 100%;
          transition: all 0.3s ease;
        }

        .selling-products-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
        }

        .product-item {
          background: rgba(255, 255, 255, 0.8);
          margin: 15px;
          padding: 20px;
          border-radius: 15px;
          border-left: 5px solid;
          transition: all 0.4s ease;
          position: relative;
          overflow: hidden;
        }

        .product-item::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          transition: left 0.6s ease;
        }

        .product-item:hover::before {
          left: 100%;
        }

        .product-item:hover {
          transform: translateX(15px) scale(1.02);
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.15);
        }

        .rank-badge {
          position: absolute;
          top: -10px;
          right: -10px;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }

        .payment-method-item {
          background: rgba(255, 255, 255, 0.8);
          margin: 15px;
          padding: 20px;
          border-radius: 15px;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .payment-method-item::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 5px;
          background: var(--payment-color);
        }

        .payment-method-card {
          background: rgba(255, 255, 255, 0.9);
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .payment-method-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
          border-color: var(--payment-color) !important;
        }

        .summary-cards-section {
          margin: 30px 0;
        }

        .summary-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 10px 35px rgba(0, 0, 0, 0.12);
          transition: all 0.4s ease;
          overflow: hidden;
          position: relative;
        }

        .summary-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(45deg, rgba(255,255,255,0.1), transparent);
          pointer-events: none;
          z-index: 1;
        }

        .summary-card:hover {
          transform: translateY(-8px) rotate(1deg);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
        }

        .summary-card-header {
          padding: 20px 25px;
          color: white;
          font-weight: 600;
          border: none;
          position: relative;
          z-index: 2;
        }

        .summary-card-body {
          padding: 25px;
          text-align: center;
          position: relative;
          z-index: 2;
        }

        .floating-elements {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .floating-btn {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          border: none;
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 15px rgba(37, 99, 235, 0.3);
          transition: all 0.3s ease;
        }

        .floating-btn:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 20px rgba(37, 99, 235, 0.4);
        }

        /* Thai DatePicker Styles */
        .datepicker-container {
          z-index: 99999 !important;
          position: relative !important;
        }

        .thai-datepicker-input {
          display: flex !important;
          align-items: center !important;
          background: #ffffff !important;
          border: 1px solid #E7E9EE !important;
          border-radius: 10px !important;
          padding: 8px 10px !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
          min-width: 80px !important;
          position: relative !important;
          box-shadow: 0 2px 8px rgba(16, 24, 40, 0.04) !important;
          overflow: hidden !important;
        }

        .thai-datepicker-input::before {
          content: '' !important;
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          height: 3px !important;
          background: linear-gradient(90deg, #2563eb, #1d4ed8, #2563eb) !important;
          background-size: 200% 100% !important;
          animation: shimmer 2s infinite !important;
        }

        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .thai-datepicker-input:hover {
          border-color: rgba(37, 99, 235, 0.25) !important;
          background: #ffffff !important;
          box-shadow: 0 3px 12px rgba(16, 24, 40, 0.06) !important;
          transform: none !important;
        }

        .thai-datepicker-input:focus-within {
          border-color: #2563eb !important;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12) !important;
        }

        .input-icon {
          background: #eef3ff !important;
          color: #2563eb !important;
          width: 28px !important;
          height: 28px !important;
          border-radius: 8px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          margin-right: 8px !important;
          border: 1px solid #d6e0ff !important;
          box-shadow: none !important;
          transition: all 0.2s ease !important;
          font-size: 0.85rem !important;
        }

        .thai-datepicker-input:hover .input-icon {
          transform: scale(1.05) !important;
          box-shadow: 0 6px 20px rgba(37, 99, 235, 0.4) !important;
        }

        .input-content {
          flex: 1 !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 2px !important;
        }

        .input-label {
          font-size: 10px !important;
          font-weight: 600 !important;
          color: #667eea !important;
          text-transform: uppercase !important;
          letter-spacing: 0.5px !important;
          margin-bottom: 2px !important;
        }

        .input-value {
          font-size: 12px !important;
          font-weight: 500 !important;
          color: #333 !important;
          line-height: 1.4 !important;
          min-height: 20px !important;
        }

        .clear-button {
          background: linear-gradient(135deg, #ff6b6b, #ee5a52) !important;
          color: white !important;
          width: 35px !important;
          height: 35px !important;
          border-radius: 10px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          cursor: pointer !important;
          transition: all 0.3s ease !important;
          margin-left: 10px !important;
          box-shadow: 0 3px 10px rgba(255, 107, 107, 0.3) !important;
        }

        .clear-button:hover {
          transform: scale(1.1) !important;
          box-shadow: 0 5px 15px rgba(255, 107, 107, 0.4) !important;
        }

        .react-datepicker-wrapper {
          z-index: 99999 !important;
          position: relative !important;
          display: block !important;
          width: 100% !important;
        }

        .react-datepicker__portal {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          z-index: 999999 !important;
          background: rgba(0, 0, 0, 0.5) !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 100vw !important;
          height: 100vh !important;
          backdrop-filter: blur(8px) !important;
          -webkit-backdrop-filter: blur(8px) !important;
        }

        .react-datepicker {
          z-index: 999999 !important;
          border: none !important;
          box-shadow: 0 25px 80px rgba(0, 0, 0, 0.3) !important;
          font-family: "Kanit", sans-serif !important;
          border-radius: 25px !important;
          overflow: hidden !important;
          background: white !important;
          position: relative !important;
          animation: modalSlideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
          max-width: 400px !important;
          width: 90vw !important;
        }

        @keyframes modalSlideUp {
          0% {
            opacity: 0;
            transform: translateY(50px) scale(0.9);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .react-datepicker__header {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%) !important;
          border-bottom: none !important;
          color: white !important;
          padding: 25px 20px !important;
          border-radius: 25px 25px 0 0 !important;
          position: relative !important;
          text-align: center !important;
        }

        .react-datepicker__current-month {
          color: white !important;
          font-weight: 700 !important;
          font-size: 1.3rem !important;
          margin-bottom: 15px !important;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
        }

        .react-datepicker__day-names {
          padding: 0 20px !important;
          display: flex !important;
          justify-content: space-between !important;
          background: rgba(255,255,255,0.1) !important;
          margin: 0 -20px !important;
          padding: 12px 20px !important;
        }

        .react-datepicker__day-name {
          color: white !important;
          font-weight: 700 !important;
          font-size: 0.9rem !important;
          width: 2.8rem !important;
          text-align: center !important;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1) !important;
        }

        .react-datepicker__month-container {
          background: white !important;
        }

        .react-datepicker__month {
          padding: 20px !important;
        }

        .react-datepicker__week {
          display: flex !important;
          justify-content: space-between !important;
          margin-bottom: 8px !important;
        }

        .react-datepicker__day {
          color: #333 !important;
          border-radius: 12px !important;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
          margin: 2px !important;
          padding: 12px !important;
          font-weight: 600 !important;
          width: 2.8rem !important;
          height: 2.8rem !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          cursor: pointer !important;
          position: relative !important;
          background: rgba(248, 250, 252, 0.5) !important;
        }

        .react-datepicker__day:hover {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%) !important;
          color: white !important;
          transform: scale(1.1) !important;
          box-shadow: 0 8px 25px rgba(37, 99, 235, 0.4) !important;
          z-index: 10 !important;
        }

        .react-datepicker__day--selected {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%) !important;
          color: white !important;
          font-weight: 700 !important;
          box-shadow: 0 8px 25px rgba(37, 99, 235, 0.4) !important;
          transform: scale(1.05) !important;
        }

        .react-datepicker__day--keyboard-selected {
          background: rgba(37, 99, 235, 0.15) !important;
          color: #2563eb !important;
          border: 2px solid rgba(37, 99, 235, 0.3) !important;
        }

        .react-datepicker__day--in-range {
          background: linear-gradient(135deg, rgba(37, 99, 235, 0.2), rgba(29, 78, 216, 0.2)) !important;
          color: #2563eb !important;
          font-weight: 600 !important;
          border: 1px solid rgba(37, 99, 235, 0.3) !important;
        }

        .react-datepicker__day--range-start,
        .react-datepicker__day--range-end {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
          color: white !important;
          font-weight: 700 !important;
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.5) !important;
          transform: scale(1.05) !important;
          border: 3px solid rgba(255, 255, 255, 0.3) !important;
        }

        .react-datepicker__day--today {
          background: linear-gradient(135deg, #ffa726 0%, #ff7043 100%) !important;
          color: white !important;
          font-weight: 700 !important;
          box-shadow: 0 6px 20px rgba(255, 167, 38, 0.4) !important;
          position: relative !important;
        }

        .react-datepicker__day--today::after {
          content: '•' !important;
          position: absolute !important;
          bottom: 2px !important;
          right: 3px !important;
          font-size: 8px !important;
          color: rgba(255, 255, 255, 0.8) !important;
        }

        .react-datepicker__day--outside-month {
          color: #6c757d !important;
          background: transparent !important;
        }

        .react-datepicker__day--disabled {
          color: #adb5bd !important;
          cursor: not-allowed !important;
          background: transparent !important;
        }

        .react-datepicker__day--disabled:hover {
          background: transparent !important;
          transform: none !important;
          box-shadow: none !important;
        }

        .react-datepicker__navigation {
          top: 30px !important;
          background: rgba(255,255,255,0.25) !important;
          border-radius: 50% !important;
          width: 45px !important;
          height: 45px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          transition: all 0.3s ease !important;
          border: 2px solid rgba(255,255,255,0.2) !important;
          backdrop-filter: blur(10px) !important;
          -webkit-backdrop-filter: blur(10px) !important;
        }

        .react-datepicker__navigation:hover {
          background: rgba(255,255,255,0.35) !important;
          transform: scale(1.1) !important;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2) !important;
        }

        .react-datepicker__navigation-icon::before {
          border-color: white !important;
          border-width: 2px 2px 0 0 !important;
          width: 10px !important;
          height: 10px !important;
        }

        .react-datepicker__year-dropdown,
        .react-datepicker__month-dropdown {
          background: white !important;
          border: none !important;
          border-radius: 15px !important;
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.15) !important;
          font-family: "Kanit", sans-serif !important;
          max-height: 200px !important;
          overflow-y: auto !important;
        }

        .react-datepicker__year-option,
        .react-datepicker__month-option {
          padding: 12px 20px !important;
          transition: all 0.2s ease !important;
          font-weight: 500 !important;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05) !important;
        }

        .react-datepicker__year-option:hover,
        .react-datepicker__month-option:hover {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
          color: white !important;
        }

        .react-datepicker__year-option--selected,
        .react-datepicker__month-option--selected {
          background: #667eea !important;
          color: white !important;
          font-weight: 700 !important;
        }

        .react-datepicker__today-button {
          background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%) !important;
          color: white !important;
          border: none !important;
          padding: 15px 25px !important;
          margin: 20px !important;
          border-radius: 15px !important;
          font-weight: 700 !important;
          transition: all 0.3s ease !important;
          font-family: "Kanit", sans-serif !important;
          font-size: 1rem !important;
          box-shadow: 0 5px 15px rgba(67, 233, 123, 0.3) !important;
          position: relative !important;
          overflow: hidden !important;
        }

        .react-datepicker__today-button::before {
          content: '' !important;
          position: absolute !important;
          top: 0 !important;
          left: -100% !important;
          width: 100% !important;
          height: 100% !important;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent) !important;
          transition: left 0.5s ease !important;
        }

        .react-datepicker__today-button:hover::before {
          left: 100% !important;
        }

        .react-datepicker__today-button:hover {
          transform: translateY(-3px) !important;
          box-shadow: 0 8px 25px rgba(67, 233, 123, 0.4) !important;
        }

        /* Portal overlay styling */
        .react-datepicker__portal .react-datepicker-popper {
          z-index: 999999 !important;
          animation: fadeInUp 0.3s ease-out !important;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideInLeft {
          from {
            transform: translateX(-10px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .react-datepicker {
          animation: fadeInUp 0.3s ease-out !important;
        }

        .react-datepicker__day {
          animation: slideInLeft 0.2s ease-out !important;
          animation-delay: calc(var(--animation-order, 0) * 0.02s) !important;
        }

        /* Month and Year Dropdown Styling */
        .react-datepicker__month-dropdown,
        .react-datepicker__year-dropdown {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
          border: none !important;
          border-radius: 12px !important;
          color: white !important;
          box-shadow: 0 8px 25px rgba(0,0,0,0.15) !important;
          font-family: 'Kanit', sans-serif !important;
          font-weight: 500 !important;
          max-height: 200px !important;
          overflow-y: auto !important;
          z-index: 99999 !important;
          backdrop-filter: blur(10px) !important;
        }

        .react-datepicker__month-option,
        .react-datepicker__year-option {
          color: white !important;
          padding: 12px 16px !important;
          border-bottom: 1px solid rgba(255,255,255,0.1) !important;
          transition: all 0.3s ease !important;
          font-family: 'Kanit', sans-serif !important;
          cursor: pointer !important;
        }

        .react-datepicker__month-option:hover,
        .react-datepicker__year-option:hover {
          background: rgba(255,255,255,0.2) !important;
          transform: translateX(5px) !important;
          padding-left: 20px !important;
        }

        .react-datepicker__month-option--selected,
        .react-datepicker__year-option--selected {
          background: rgba(255,255,255,0.3) !important;
          font-weight: 700 !important;
          position: relative !important;
        }

        .react-datepicker__month-option--selected::after,
        .react-datepicker__year-option--selected::after {
          content: "✓" !important;
          position: absolute !important;
          right: 15px !important;
          color: #43e97b !important;
          font-weight: bold !important;
        }
        #datepicker-portal {
          z-index: 999999 !important;
        }

        @media (max-width: 768px) {
          .dashboard-container {
            padding: 15px;
          }
          
          .stats-grid {
            grid-template-columns: 1fr;
            gap: 15px;
          }
          
          .metric-number {
            font-size: 2rem;
          }
          
          .floating-elements {
            display: none;
          }

          .react-datepicker__input-container input {
            width: 150px !important;
          }

          .react-datepicker {
            font-size: 0.9rem !important;
          }
        }

        /* Override any conflicting z-index */
        .chart-container {
          position: relative !important;
          z-index: 1 !important;
        }

        .chart-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          position: relative !important;
          z-index: 2 !important;
          overflow: visible !important;
        }

        .chart-header .form-select {
          z-index: 3 !important;
        }

        /* Ensure DatePicker container has proper stacking */
        .d-flex.gap-2.align-items-center.flex-wrap {
          position: relative !important;
          z-index: 10 !important;
          overflow: visible !important;
        }

        /* Force all chart containers to have lower z-index */
        .chart-container,
        .selling-products-card,
        .summary-card,
        .gradient-card {
          z-index: 1 !important;
        }

        /* Ensure proper stacking context */
        .dashboard-container {
          position: relative !important;
          z-index: 0 !important;
        }

        .dashboard-container > * {
          position: relative !important;
          z-index: 1 !important;
        }

        /* DatePicker specific overrides */
        .datepicker-container,
        .react-datepicker-wrapper,
        .react-datepicker-popper,
        .react-datepicker__portal,
        .react-datepicker {
          z-index: 999999 !important;
        }

        /* Force viewport level positioning for DatePicker */
        body .react-datepicker-popper,
        body .react-datepicker__portal {
          position: fixed !important;
          z-index: 999999 !important;
        }

        /* Ensure no backdrop filters interfere */
        .chart-container,
        .selling-products-card,
        .summary-card,
        .glass-card {
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }

        /* Mobile responsive adjustments */
        @media (max-width: 768px) {
          .datepicker-container {
            width: 100% !important;
          }
          
          .react-datepicker__input-container input {
            width: 100% !important;
            min-width: 150px !important;
          }

          .react-datepicker {
            font-size: 0.9rem !important;
            transform: scale(0.95) !important;
            transform-origin: top left !important;
          }

          .thai-datepicker-input {
            padding: 12px !important;
            font-size: 0.9rem !important;
          }

          .thai-input-icon {
            width: 18px !important;
            height: 18px !important;
          }

          .thai-clear-btn {
            width: 22px !important;
            height: 22px !important;
            font-size: 0.8rem !important;
          }
        }

        @media (max-width: 480px) {
          .react-datepicker {
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) scale(0.85) !important;
            max-width: 90vw !important;
            max-height: 90vh !important;
            overflow: auto !important;
          }

          .thai-datepicker-input {
            padding: 14px !important;
            font-size: 1rem !important;
            min-height: 50px !important;
          }

          .thai-input-icon {
            width: 20px !important;
            height: 20px !important;
          }

          .thai-clear-btn {
            width: 24px !important;
            height: 24px !important;
            font-size: 0.9rem !important;
          }

          .react-datepicker__header {
            padding: 16px !important;
          }

          .react-datepicker__navigation {
            width: 35px !important;
            height: 35px !important;
          }

          .react-datepicker__day {
            width: 35px !important;
            height: 35px !important;
            line-height: 35px !important;
            margin: 2px !important;
          }
        }

        /* ===================
           Minimal DatePicker
           =================== */
        .react-datepicker {
          background: #ffffff !important;
          border: 1px solid #e6e8eb !important;
          border-radius: 12px !important;
          box-shadow: 0 6px 20px rgba(0,0,0,0.08) !important;
        }

        .react-datepicker__header {
          background: #ffffff !important;
          color: #1a1a1a !important;
          border-bottom: 1px solid #edf0f3 !important;
          padding: 14px 16px !important;
        }

        .react-datepicker__current-month,
        .react-datepicker__day-name {
          color: #2b2f38 !important;
          text-shadow: none !important;
        }

        .react-datepicker__day {
          background: transparent !important;
          border-radius: 8px !important;
          color: #2b2f38 !important;
        }

        .react-datepicker__day:hover {
          background: #f3f6f9 !important;
          transform: none !important;
          box-shadow: none !important;
        }

        .react-datepicker__day--selected,
        .react-datepicker__day--keyboard-selected {
          background: #2563eb !important;
          color: #ffffff !important;
          border: none !important;
        }

        .react-datepicker__navigation {
          background: transparent !important;
          border: none !important;
          width: 36px !important;
          height: 36px !important;
          border-radius: 8px !important;
        }

        .react-datepicker__navigation:hover {
          background: #f3f6f9 !important;
        }

        .react-datepicker__time-container {
          border-left: 1px solid #edf0f3 !important;
        }

        .react-datepicker__time-list-item--selected {
          background: #2563eb !important;
          color: #ffffff !important;
        }

        /* Footer buttons inside custom CalendarContainer */
        .react-datepicker + div button.btn {
          border-radius: 8px;
          padding: 8px 14px;
        }
      `}</style>
    </Template>
  );
}
export default Dashboard;