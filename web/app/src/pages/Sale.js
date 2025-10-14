import { useEffect, useRef, useState } from "react";
import Template from "../components/Template";
import Swal from "sweetalert2";
import axios from "axios";
import config from "../config";
import Modal from "../components/Modal";
import { useReactToPrint } from "react-to-print";

import Barcode from "../components/Barcode";
import { QRCodeSVG } from "qrcode.react";
import generatePayload from "promptpay-qr";
import "../styles/Sale.css";
import * as dayjs from "dayjs";


function Sale() {
  const [products, setProducts] = useState([]);
  const [, setBillSale] = useState({});
  const [currentBill, setCurrentBill] = useState({});
  const [totalPrice, setTotalPrice] = useState(0);
  const [item, setItem] = useState({});
  const [inputMoney, setInputMoney] = useState(0);
  const [lastBill, setLastBill] = useState({});
  const [selectedBill, setSelectedBill] = useState({});

  const [billToday, setBillToday] = useState([]);
  const [memberInfo, setMemberInfo] = useState({});
  const [sumTotal, setSumTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter] = useState("ทั้งหมด");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [heldBills, setHeldBills] = useState([]);
  const [showQR, setShowQR] = useState(false);
  const promptPayNumber = "0656922937"; // หมายเลขพร้อมเพย์
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearchText, setCustomerSearchText] = useState("");
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showQtyModal, setShowQtyModal] = useState(false);
  const [showHeldBillsModal, setShowHeldBillsModal] = useState(false);
  const [showEndSaleModal, setShowEndSaleModal] = useState(false);
  const [showBillTodayModal, setShowBillTodayModal] = useState(false);
  const [showBillDetailModal, setShowBillDetailModal] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [discountFromPoints, setDiscountFromPoints] = useState(0);
  const [hasIncompletePhone, setHasIncompletePhone] = useState(false);

  // Split Payment states
  const [showSplitPaymentModal, setShowSplitPaymentModal] = useState(false);
  const [cashAmount, setCashAmount] = useState(0);
  const [transferAmount, setTransferAmount] = useState(0);
  const [isSplitPayment, setIsSplitPayment] = useState(false);
  // Pagination states
  const [visibleItemCount, setVisibleItemCount] = useState(30);
  const itemsPerPage = 30;

  const saleRef = useRef();
  const searchInputRef = useRef();
  const printRef = useRef();

  // ฟังก์ชันช่วยในการจัดการค่าตัวเลขที่อาจเป็น NaN
  const safeParseFloat = (value, defaultValue = 0) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  };

  // สร้าง print function ด้วย react-to-print (v3.x ใช้ contentRef)
  const handleReactToPrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "ใบเสร็จ",
    pageStyle: `
      @page {
        size: 58mm auto;
        margin: 0;
      }
      @media print {
        body {
          margin: 0;
          padding: 0;
        }
        .print-receipt {
          width: 58mm;
          margin: 0;
          padding: 0;
        }
      }
    `,
  });

  useEffect(() => {
    const initializeData = async () => {
      await fetchData();
      await openBill();
      await fetchBillSaleDetail();
      await loadCustomers();
      await loadHeldBills(); // โหลดรายการบิลที่พักไว้จาก API
    };

    initializeData();

    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // โหลดข้อมูลสินค้าและสต็อกจาก API
  const fetchData = async () => {
    try {
      const productResponse = await axios.get(
        config.api_path + "/product/listForSale",
        config.headers()
      );
      if (productResponse.data.message === "success") {
        const products = productResponse.data.results;

        const stockResponse = await axios.get(
          config.api_path + "/reportStock",
          config.headers()
        );
        if (stockResponse.data.message === "success") {
          const stockData = stockResponse.data.results;

          // เพิ่มการดึงข้อมูลรูปภาพสำหรับแต่ละสินค้า
          const productsWithImageAndStock = await Promise.all(
            products.map(async (product) => {
              const stockItem = stockData.find(
                (stock) => String(stock.productId) === String(product.id)
              );

              // ดึงข้อมูลรูปภาพสินค้า
              try {
                const imageRes = await axios.get(
                  config.api_path + "/productImage/list/" + product.id,
                  config.headers()
                );
                const mainImage = imageRes.data.results.find((img) => img.isMain);

                return {
                  ...product,
                  remainingQty: stockItem ? stockItem.totalQty : 0,
                  imageUrl: mainImage ? mainImage.imageUrl : null,
                  mainImageUrl: mainImage ? `${config.api_path}${mainImage.imageUrl}` : null,
                  // แปลง category จาก ID เป็นชื่อสำหรับแสดงผล
                  categoryId: product.category,
                  category: product.categoryName || "",
                };
              } catch (imageError) {
                console.error(`Error loading image for product ${product.id}:`, imageError);
                return {
                  ...product,
                  remainingQty: stockItem ? stockItem.totalQty : 0,
                  imageUrl: null,
                  mainImageUrl: null,
                  // แปลง category จาก ID เป็นชื่อสำหรับแสดงผล
                  categoryId: product.category,
                  category: product.categoryName || "",
                };
              }
            })
          );

          setProducts(productsWithImageAndStock);
        }
      }
    } catch (e) {
      Swal.fire({
        title: "error",
        text: e.message,
        icon: "error",
      });
    }
  };

  // ลบรายการสินค้าออกจากบิล
  const handleDelete = async (item) => {
    try {
      await axios
        .delete(
          config.api_path + "/billSale/deleteItem/" + item.id,
          config.headers()
        )
        .then((res) => {
          if (res.data.message === "success") {
            fetchBillSaleDetail();
            fetchData();
          }
        });
    } catch (e) {
      Swal.fire({
        title: "error",
        text: e.message,
        icon: "error",
      });
    }
  };

  // ดึงข้อมูลบิลปัจจุบันและคำนวณยอดรวม
  const fetchBillSaleDetail = async () => {
    try {
      await axios
        .get(config.api_path + "/billSale/currentBillInfo", config.headers())
        .then((res) => {
          if (res.data.results !== null) {
            setCurrentBill(res.data.results);
            sumTotalPrice(res.data.results.billSaleDetails);
          }
        });
    } catch (e) {
      Swal.fire({
        title: "error",
        text: e.message,
        icon: "error",
      });
    }
  };

  // คำนวณยอดรวมของสินค้าในบิล
  const sumTotalPrice = (billSaleDetails) => {
    let sum = 0;
    for (let i = 0; i < billSaleDetails.length; i++) {
      const item = billSaleDetails[i];
      const qty = parseInt(item.qty);
      const price = parseInt(item.price);
      sum += qty * price;
    }
    setTotalPrice(sum);
  };

  // เปิดบิลใหม่สำหรับการขาย
  const openBill = async () => {
    try {
      const res = await axios.get(
        config.api_path + "/billSale/openBill",
        config.headers()
      );
      if (res.data.message === "success") {
        setBillSale(res.data.result);
      }
    } catch (e) {
      Swal.fire({
        title: "error",
        text: e.message,
        icon: "error",
      });
    }
  };

  // โหลดรายการบิลที่พักไว้จาก API
  const loadHeldBills = async () => {
    try {
      const response = await axios.get(
        config.api_path + "/billSale/heldBills",
        config.headers()
      );
      if (response.data.message === "success") {
        setHeldBills(response.data.results || []);
      }
    } catch (error) {
    }
  };

  // พักบิลปัจจุบันไว้และเปิดบิลใหม่
  const handlePauseBill = async (bill) => {
    if (!bill.billSaleDetails || bill.billSaleDetails.length === 0) {
      Swal.fire({
        title: "ไม่สามารถพักบิลได้",
        text: "ไม่มีสินค้าในตะกร้า",
        icon: "warning",
      });
      return;
    }

    try {
      // เรียก API เพื่อพักบิล
      const response = await axios.post(
        config.api_path + "/billSale/holdBill",
        {},
        config.headers()
      );

      if (response.data.message === "success") {
        Swal.fire({
          title: "พักบิล",
          text: "พักบิลสำเร็จแล้ว",
          icon: "success",
          timer: 1000,
        });

        // รีเซ็ตสถานะต่างๆ
        setCurrentBill({});
        setTotalPrice(0);
        setInputMoney(0);
        setMemberInfo({});
        setLastBill({});
        setSumTotal(0);

        // รีเฟรชข้อมูล
        await Promise.all([
          openBill(),
          fetchBillSaleDetail(),
          fetchData(),
          loadHeldBills() // รีเฟรชรายการบิลที่พักไว้
        ]);

        // ปิด Modal
        let btns = document.getElementsByClassName("btnClose");
        for (let i = 0; i < btns.length; i++) btns[i].click();

        if (saleRef.current) {
          saleRef.current.refreshCountBill();
        }
      }
    } catch (error) {
      Swal.fire({
        title: "เกิดข้อผิดพลาด",
        text: error.response?.data?.error || error.message,
        icon: "error",
      });
    }
  };

  // ฟังก์ชันตรวจสอบว่าสามารถจบการขายได้หรือไม่
  const canCompleteSale = () => {
    if (hasIncompletePhone) {
      Swal.fire({
        title: "ไม่สามารถจบการขายได้",
        text: "กรุณากรอกเบอร์โทรลูกค้าให้ครบ 10 หลัก หรือล้างข้อมูลลูกค้า",
        icon: "error",
        confirmButtonText: "ตกลง"
      });
      return false;
    }
    return true;
  };

  // จบการขายและพิมพ์บิลทันที
  const handleEndSaleAndPrint = async () => {
    if (
      !currentBill.billSaleDetails ||
      currentBill.billSaleDetails.length === 0
    ) {
      Swal.fire({
        title: "ไม่สามารถจบการขายได้",
        text: "ไม่มีสินค้าในตะกร้า",
        icon: "warning",
      });
      return;
    }

    // ตรวจสอบเบอร์โทรที่ไม่ครบ
    if (!canCompleteSale()) {
      return;
    }

    try {
      const priceAfterDiscount = totalPrice - discountFromPoints;

      // สร้างข้อความอธิบายการใช้แต้ม
      let description = "";
      if (pointsToRedeem > 0) {
        description = `ใช้แต้มสะสม ${pointsToRedeem} แต้ม เป็นส่วนลด ${discountFromPoints} บาท`;
      }

      // สร้างข้อมูลการใช้แต้ม (ถ้ามี)
      const pointTransaction =
        pointsToRedeem > 0
          ? {
            customerId: selectedCustomer?.id,
            points: pointsToRedeem,
            transactionType: "DISCOUNT",
            description: `ใช้แต้มส่วนลด ${pointsToRedeem} แต้ม สำหรับบิลเลขที่ #${currentBill.id} (ส่วนลด ${discountFromPoints} บาท)`,
          }
          : null;

      const paymentData = {
        method: paymentMethod,
        amount: priceAfterDiscount,
        billSaleDetails: currentBill.billSaleDetails,
        customerId: selectedCustomer?.id || null,
        pointTransaction: pointTransaction,
        discountFromPoints: discountFromPoints,
        description: description,
      };

      const res = await axios.post(
        config.api_path + "/billSale/endSale",
        paymentData,
        config.headers()
      );

      if (res.data.message === "success") {
        // แสดงข้อความสำเร็จ
        Swal.fire({
          title: "จบการขายสำเร็จ",
          text: "กำลังเปิดการพิมพ์บิล...",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });

        // รีเซ็ตค่าฟอร์มและ state ทั้งหมด
        setCurrentBill({});
        setTotalPrice(0);
        setInputMoney(0);
        setMemberInfo({});
        setLastBill({});
        setSumTotal(0);
        setSelectedCustomer(null);
        setCustomerSearchText("");
        setPointsToRedeem(0);
        setDiscountFromPoints(0);
        setShowCustomerDropdown(false);
        setFilteredCustomers([]);
        setItem({});
        setPaymentMethod("Cash");
        setHasIncompletePhone(false);

        // ปิด Modal จบการขาย
        setShowEndSaleModal(false);

        // รีเฟรชข้อมูล
        await Promise.all([
          openBill(),
          fetchBillSaleDetail(),
          fetchData(),
          loadCustomers() // เพิ่มการรีเฟรชข้อมูลลูกค้า
        ]);

        // รอสักครู่แล้วพิมพ์บิล
        setTimeout(async () => {
          await handlePrint();
        }, 500);
      }
    } catch (error) {
      Swal.fire({
        title: "เกิดข้อผิดพลาด",
        text: error.response?.data?.error || error.message,
        icon: "error",
      });
    }
  };



  // สร้าง print function ด้วย react-to-print
  // พิมพ์บิลการขายล่าสุดตาม payDate
  const handlePrint = async () => {
    try {
      const [memberRes, billRes] = await Promise.all([
        axios.get(config.api_path + "/member/info", config.headers()),
        axios.get(config.api_path + "/billSale/lastBill", config.headers()),
      ]);

      if (memberRes.data.message === "success") {
        setMemberInfo(memberRes.data.result);
      }

      if (
        billRes.data.message === "success" &&
        billRes.data.result.length > 0
      ) {
        // เรียงลำดับบิลตาม payDate จากใหม่ไปเก่า (ไม่ใช่ตามวันที่สร้างบิล)
        const sortedBills = billRes.data.result.sort((a, b) => {
          if (!a.payDate || !b.payDate) return 0;
          return new Date(b.payDate) - new Date(a.payDate);
        });

        const currentBill = sortedBills[0];
        setLastBill(currentBill);

        // รอให้ state อัปเดตเสร็จก่อนพิมพ์
        await new Promise((resolve) => setTimeout(resolve, 500));

        // ตรวจสอบว่า printRef มีค่า
        if (!printRef.current) {
          throw new Error("ไม่พบ template สำหรับพิมพ์");
        }

        console.log("Current Bill:", currentBill);
        console.log("Print Ref:", printRef.current);

        // พิมพ์บิลด้วย react-to-print
        handleReactToPrint();
      } else {
        throw new Error("ไม่พบข้อมูลบิลล่าสุด");
      }
    } catch (error) {
      console.error("Print error:", error);
      Swal.fire({
        title: "พิมพ์บิลไม่สำเร็จ",
        text: error.message,
        icon: "error",
      });
    }
  };

  // กรองสินค้าตามคำค้นหาและหมวดหมู่ และซ่อนสินค้าที่หมด
  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
    setVisibleItemCount(30); // รีเซ็ตจำนวนสินค้าที่แสดงเมื่อค้นหาใหม่
  };

  const filteredProducts = products.filter(
    (product) =>
      // กรองตามคำค้นหา
      (product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.barcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase())) &&
      // กรองตามหมวดหมู่
      (categoryFilter === "ทั้งหมด" || product.category === categoryFilter) &&
      // ซ่อนสินค้าที่หมด (remainingQty > 0)
      product.remainingQty > 0
  );

  // จัดหมวดหมู่สินค้าที่ผ่านการกรองแล้ว
  const groupedProducts = filteredProducts.reduce((groups, product) => {
    const category = product.category || 'ไม่ระบุหมวดหมู่';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(product);
    return groups;
  }, {});

  // เรียงหมวดหมู่ตามชื่อ
  const sortedCategories = Object.keys(groupedProducts).sort();

  // แปลงเป็น array เดียวเพื่อใช้ในการแสดงผล
  const allFilteredProducts = sortedCategories.reduce((acc, category) => {
    return acc.concat(groupedProducts[category]);
  }, []);

  // แสดงสินค้าเท่าที่กำหนด
  const productsToShow = allFilteredProducts.slice(0, visibleItemCount);
  const hasMoreProducts = allFilteredProducts.length > visibleItemCount;

  // จัดหมวดหมู่สินค้าที่จะแสดง
  const groupedProductsToShow = productsToShow.reduce((groups, product) => {
    const category = product.category || 'ไม่ระบุหมวดหมู่';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(product);
    return groups;
  }, {});

  const sortedCategoriesToShow = Object.keys(groupedProductsToShow).sort();

  // ฟังก์ชันโหลดสินค้าเพิ่มเติม
  const loadMoreProducts = () => {
    setVisibleItemCount(prev => prev + itemsPerPage);
  };

  // เพิ่มสินค้าลงในตะกร้าเมื่อคลิกที่สินค้า
  const handleProductClick = (product) => {
    setItem({ ...product, qty: 1 });
    setShowQtyModal(true);
  };

  // เพิ่มสินค้าลงในบิลพร้อมจำนวนที่เลือก
  const handleAddToBill = async () => {
    const qty = parseInt(item.qty, 10);
    if (isNaN(qty) || qty <= 0 || qty > item.remainingQty) {
      Swal.fire({
        title: "จำนวนไม่ถูกต้อง",
        text: "กรุณากรอกจำนวนที่ถูกต้อง",
        icon: "warning",
      });
      return;
    }

    try {
      await axios
        .post(
          config.api_path + "/billSale/sale",
          { ...item, qty },
          config.headers()
        )
        .then((res) => {
          if (res.data.message === "success") {
            fetchData();

            item.remainingQty -= qty;
            fetchBillSaleDetail();
            let btns = document.getElementsByClassName("btnClose");
            for (let i = 0; i < btns.length; i++) btns[i].click();

            // เปิดบิลหลังจากเพิ่มสินค้าลงในบิลสำเร็จ
            openBill();
          }
        });
    } catch (e) {
      Swal.fire({
        title: "error",
        text: e.message,
        icon: "error",
      });
    }
  };

  // เรียกคืนบิลที่พักไว้
  const handleRetrieveBill = async (heldBillData) => {
    try {
      // เรียก API เพื่อเรียกคืนบิล
      const response = await axios.post(
        config.api_path + "/billSale/retrieveBill/" + heldBillData.id,
        {},
        config.headers()
      );

      if (response.data.message === "success") {


        // รีเฟรชข้อมูล
        await Promise.all([
          fetchBillSaleDetail(),
          fetchData(),
          loadHeldBills() // รีเฟรชรายการบิลที่พักไว้
        ]);

        // ปิด Modal
        setShowHeldBillsModal(false);
      }
    } catch (error) {
      Swal.fire({
        title: "เกิดข้อผิดพลาด",
        text: error.response?.data?.error || error.message,
        icon: "error",
      });
    }
  };

  // สร้าง QR Code สำหรับการชำระเงินผ่านพร้อมเพย์
  const generateQRCode = () => {
    const amount = parseFloat(totalPrice);
    const payload = generatePayload(promptPayNumber, { amount });
    return payload;
  };

  // เปลี่ยนวิธีการชำระเงินและแสดง QR Code ถ้าเลือกพร้อมเพย์
  const handlePaymentMethodChange = (e) => {
    const method = e.target.value;
    setPaymentMethod(method);

    if (method === "PromptPay") {
      setShowQR(true);
      setIsSplitPayment(false);
    } else if (method === "Split") {
      setShowQR(false);
      setIsSplitPayment(true);
      // ไม่เปิด Modal แยก แต่แสดงฟอร์มใน Modal เดียวกัน
    } else {
      setShowQR(false);
      setIsSplitPayment(false);
    }
  };

  // ฟังก์ชันสำหรับจัดการ Split Payment
  const handleSplitPayment = () => {
    // ตรวจสอบเบอร์โทรที่ไม่ครบ
    if (!canCompleteSale()) {
      return;
    }

    const totalAfterDiscount = totalPrice - discountFromPoints;
    const totalPayment = safeParseFloat(cashAmount) + safeParseFloat(transferAmount);

    if (totalPayment < totalAfterDiscount) {
      Swal.fire({
        title: "จำนวนเงินไม่เพียงพอ",
        text: `จำนวนเงินที่กรอกไม่ตรง: ${totalAfterDiscount.toLocaleString("th-TH")} บาท`,
        icon: "warning",
      });
      return;
    }

    // จบการขายทันทีโดยไม่เด้งไปโมดาลอื่น
    handleEndSaleWithSplitPayment();
  };

  // ฟังก์ชันจบการขายแบบ Split Payment
  const handleEndSaleWithSplitPayment = async () => {
    try {
      const priceAfterDiscount = totalPrice - discountFromPoints;

      // สร้างข้อความอธิบายการใช้แต้ม
      let description = "";
      if (pointsToRedeem > 0) {
        description = `ใช้แต้มสะสม ${pointsToRedeem} แต้ม เป็นส่วนลด ${discountFromPoints} บาท`;
      }

      // เพิ่มข้อมูลการชำระแบบผสม
      description += description ? " | " : "";
      description += `ชำระแบบผสม - เงินสด: ${safeParseFloat(cashAmount).toLocaleString("th-TH")} บาท, โอน: ${safeParseFloat(transferAmount).toLocaleString("th-TH")} บาท`;

      // สร้างข้อมูลการใช้แต้ม (ถ้ามี)
      const pointTransaction =
        pointsToRedeem > 0
          ? {
            customerId: selectedCustomer?.id,
            points: pointsToRedeem,
            transactionType: "DISCOUNT",
            description: `ใช้แต้มส่วนลด ${pointsToRedeem} แต้ม สำหรับบิลเลขที่ #${currentBill.id} (ส่วนลด ${discountFromPoints} บาท)`,
          }
          : null;

      const paymentData = {
        method: "Split",
        amount: priceAfterDiscount,
        billSaleDetails: currentBill.billSaleDetails,
        customerId: selectedCustomer?.id || null,
        pointTransaction: pointTransaction,
        discountFromPoints: discountFromPoints,
        description: description,
        splitPaymentDetails: {
          cashAmount: safeParseFloat(cashAmount),
          transferAmount: safeParseFloat(transferAmount),
          totalAmount: safeParseFloat(cashAmount) + safeParseFloat(transferAmount)
        }
      };

      const res = await axios.post(
        config.api_path + "/billSale/endSale",
        paymentData,
        config.headers()
      );

      if (res.data.message === "success") {
        // แสดงข้อความสำเร็จ
        Swal.fire({
          title: "จบการขายสำเร็จ",
          text: "กำลังพิมพ์บิล...",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });

        // รีเซ็ตค่าฟอร์มและ state ทั้งหมด
        setCurrentBill({});
        setTotalPrice(0);
        setInputMoney(0);
        setMemberInfo({});
        setLastBill({});
        setSumTotal(0);
        setSelectedCustomer(null);
        setCustomerSearchText("");
        setPointsToRedeem(0);
        setDiscountFromPoints(0);
        setShowCustomerDropdown(false);
        setFilteredCustomers([]);
        setItem({});
        setPaymentMethod("Cash");
        setCashAmount(0);
        setTransferAmount(0);
        setIsSplitPayment(false);
        setHasIncompletePhone(false);

        // ปิด Modal จบการขาย
        setShowEndSaleModal(false);

        // รีเฟรชข้อมูล
        await Promise.all([
          openBill(),
          fetchBillSaleDetail(),
          fetchData(),
          loadCustomers() // เพิ่มการรีเฟรชข้อมูลลูกค้า
        ]);

        // รอสักครู่แล้วพิมพ์บิล
        setTimeout(async () => {
          await handlePrint();
        }, 500);
      }
    } catch (error) {
      Swal.fire({
        title: "เกิดข้อผิดพลาด",
        text: error.response?.data?.error || error.message,
        icon: "error",
      });
    }
  };

  // โหลดข้อมูลลูกค้าจาก API
  const loadCustomers = async () => {
    try {
      const response = await axios.get(
        config.api_path + "/customers",
        config.headers()
      );
      if (response.data.result) {
        // แปลงข้อมูล id เป็น number
        const formattedCustomers = response.data.result.map((customer) => ({
          ...customer,
          id: Number(customer.id),
        }));
        setCustomers(formattedCustomers);
      }
    } catch (error) {
    }
  };

  // ฟังก์ชันตรวจสอบเบอร์โทรที่ไม่ครบ
  const isIncompletePhoneNumber = (text) => {
    // ตรวจสอบว่าเป็นตัวเลขเท่านั้น และมีความยาวน้อยกว่า 10 หลัก แต่มากกว่า 0
    const phoneRegex = /^\d+$/;
    return phoneRegex.test(text) && text.length > 0 && text.length < 10;
  };

  // ฟังก์ชันค้นหาลูกค้า
  const searchCustomers = (searchText) => {
    if (!searchText || searchText.length < 1) {
      setFilteredCustomers([]);
      setHasIncompletePhone(false);
      return;
    }

    // ตรวจสอบเบอร์โทรที่ไม่ครบ
    const isIncomplete = isIncompletePhoneNumber(searchText);
    setHasIncompletePhone(isIncomplete);

    const filtered = customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(searchText.toLowerCase()) ||
        customer.phone.includes(searchText)
    );
    setFilteredCustomers(filtered.slice(0, 10)); // แสดงเฉพาะ 10 รายการแรก
  };

  // ฟังก์ชันเลือกลูกค้า
  const selectCustomer = async (customer) => {
    // รีเฟรชข้อมูลลูกค้าล่าสุดก่อนการเลือก
    try {
      const response = await axios.get(
        config.api_path + `/customer/${customer.id}`,
        config.headers()
      );
      if (response.data.result) {
        const updatedCustomer = response.data.result;
        setSelectedCustomer(updatedCustomer);
        setCustomerSearchText(updatedCustomer.name + " - " + updatedCustomer.phone);
      } else {
        setSelectedCustomer(customer);
        setCustomerSearchText(customer.name + " - " + customer.phone);
      }
    } catch (error) {
      console.error("Error refreshing customer data:", error);
      setSelectedCustomer(customer);
      setCustomerSearchText(customer.name + " - " + customer.phone);
    }

    setShowCustomerDropdown(false);
    setFilteredCustomers([]);
    setHasIncompletePhone(false); // รีเซ็ตสถานะเบอร์โทรไม่ครบ
    // รีเซ็ตค่าแต้มที่ใช้เมื่อเปลี่ยนลูกค้า
    setPointsToRedeem(0);
    setDiscountFromPoints(0);
  };

  // ฟังก์ชันล้างการเลือกลูกค้า
  const clearCustomerSelection = () => {
    setSelectedCustomer(null);
    setCustomerSearchText("");
    setShowCustomerDropdown(false);
    setFilteredCustomers([]);
    setHasIncompletePhone(false); // รีเซ็ตสถานะเบอร์โทรไม่ครบ
    setPointsToRedeem(0);
    setDiscountFromPoints(0);
  };

  // คำนวณส่วนลดจากแต้มสะสมของลูกค้า
  const handlePointsRedemption = (points) => {
    const maxPoints = selectedCustomer ? selectedCustomer.points : 0;
    const maxPointsByPrice = Math.floor(totalPrice / 10); // จำนวนแต้มสูงสุดที่ใช้ได้ตามราคาสินค้า
    const maxAllowedPoints = Math.min(maxPoints, maxPointsByPrice);

    const validPoints = Math.min(Math.max(0, points), maxAllowedPoints);

    if (points > maxAllowedPoints) {
      Swal.fire({
        title: "ไม่สามารถใช้แต้มได้",
        text: `สามารถใช้แต้มได้สูงสุด ${maxAllowedPoints} แต้ม ตามราคาสินค้า`,
        icon: "warning",
      });
    }

    setPointsToRedeem(validPoints);
    setDiscountFromPoints(validPoints * 10);
  };

  // ดึงข้อมูลบิลที่ชำระแล้ว
  const fetchBillToday = async () => {
    try {
      const response = await axios.get(
        config.api_path + "/billSale/list",
        config.headers()
      );
      if (response.data.message === "success") {
        // กรองเฉพาะบิลวันนี้
        const today = new Date();
        const todayStr = today.toDateString();

        const todayBills = response.data.results.filter(bill => {
          if (!bill.payDate) return false;
          const billDate = new Date(bill.payDate);
          return billDate.toDateString() === todayStr;
        });

        // เรียงลำดับบิลตาม payDate จากใหม่ไปเก่า (ไม่ใช่ตามวันที่สร้างบิล)
        const sortedTodayBills = todayBills.sort((a, b) => {
          if (!a.payDate || !b.payDate) return 0;
          return new Date(b.payDate) - new Date(a.payDate);
        });

        setBillToday(sortedTodayBills);
      }
    } catch (error) {
      Swal.fire({
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถโหลดข้อมูลบิลได้",
        icon: "error",
      });
    }
  };

  // พิมพ์บิลที่เลือกตาม payDate
  const handlePrintSelectedBill = async (billData) => {
    try {
      // ดึงข้อมูลสมาชิกสำหรับใส่ในบิล
      const memberRes = await axios.get(config.api_path + "/member/info", config.headers());
      if (memberRes.data.message === "success") {
        setMemberInfo(memberRes.data.result);
      }

      // เซ็ตข้อมูลบิลที่เลือกเป็น lastBill
      setLastBill(billData);

      // รอให้ state อัปเดต
      await new Promise((resolve) => setTimeout(resolve, 300));

      // พิมพ์บิลด้วย react-to-print
      handleReactToPrint();

      // แสดงข้อความสำเร็จ
      Swal.fire({
        title: "พิมพ์บิลสำเร็จ",
        text: `พิมพ์บิลเลขที่ #${billData.id} เรียบร้อยแล้ว (วันที่ชำระ: ${(() => {
          if (!billData?.payDate) return "-";

          const date = new Date(billData.payDate);
          return date.toLocaleString('th-TH', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });
        })()})`,
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      });

      // ปิด Modal หลังพิมพ์เสร็จ
      setShowBillTodayModal(false);
    } catch (error) {
      Swal.fire({
        title: "พิมพ์บิลไม่สำเร็จ",
        text: error.message || "เกิดข้อผิดพลาดในการพิมพ์บิล",
        icon: "error",
      });
    }
  };

  // ล้างรายการสินค้าทั้งหมดในตะกร้า
  const handleClearCart = async () => {
    if (!currentBill?.billSaleDetails?.length) {
      Swal.fire({
        title: "ไม่มีสินค้าในตะกร้า",
        text: "ไม่มีรายการสินค้าที่จะล้าง",
        icon: "warning",
        confirmButtonColor: '#4CAF50' // Green color
      });
      return;
    }

    const result = await Swal.fire({
      title: "ยืนยันการล้างตะกร้า",
      text: "คุณต้องการลบสินค้าทั้งหมดในตะกร้าใช่หรือไม่?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ยืนยัน",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: '#f44336', // red color
      cancelButtonColor: '#6c757d', // gray color
      buttonsStyling: false,
      customClass: {
        confirmButton: 'btn btn-danger mx-2 px-4',
        cancelButton: 'btn btn-secondary mx-2 px-4'
      }
    });

    if (result.isConfirmed) {
      try {
        const response = await axios.delete(
          config.api_path + "/billSale/clearCart/" + currentBill.id,
          config.headers()
        );

        if (response.data.message === "success") {
          Swal.fire({
            title: "ล้างตะกร้าสำเร็จ",
            text: "ลบสินค้าทั้งหมดในตะกร้าเรียบร้อยแล้ว",
            icon: "success",
            timer: 1000,
          });

          // รีเฟรชข้อมูล
          fetchBillSaleDetail();
          fetchData();
          setTotalPrice(0);
          setInputMoney(0);
        }
      } catch (error) {
        Swal.fire({
          title: "เกิดข้อผิดพลาด",
          text: error.response?.data?.message || error.message,
          icon: "error",
        });
      }
    }
  };

  return (
    <>
      <Template ref={saleRef}>
        <div className="card shadow-lg border-0 rounded-lg">
          <div className="card-header bg-gradient-dark text-white py-3 position-sticky" style={{ top: "0", zIndex: "1030" }}>
            <div className="d-flex justify-content-between align-items-center">
              <h5
                className="mb-0 font-weight-bold"
                style={{ fontSize: "1.5rem" }}
              >
                ขายสินค้า
              </h5>
              <div className="button-group">
                <button
                  onClick={handleClearCart}
                  className="btn btn-danger me-2"
                  style={{ fontSize: "1rem", padding: "10px 15px" }}
                  title="ล้างตะกร้า"
                >
                  <i className="fa fa-trash me-1"></i>เคลียร์ตะกร้า
                </button>
                <button
                  onClick={() => handlePauseBill(currentBill)}
                  className="btn btn-success me-2"
                  style={{ fontSize: "1rem", padding: "10px 15px" }}
                  title="พักบิล"
                >
                  <i className="fa fa-shopping-basket me-2"></i>พักบิล
                </button>

                {/** ปุ่มสำหรับดูบิลที่พักไว้ */}
                <button
                  onClick={() => setShowHeldBillsModal(true)}
                  className="btn btn-warning me-2"
                  style={{ fontSize: "1rem", padding: "10px 15px" }}
                  title="ดูบิลที่พักไว้"
                >
                  <i className="fa fa-clipboard-list me-2"></i>บิลที่พักไว้
                </button>
                {/** ปุ่มสำหรับจบการขาย */}
                <button
                  onClick={() => {
                    // รีเซ็ต state สำหรับ Split Payment
                    setCashAmount([]);
                    setTransferAmount([]);
                    setIsSplitPayment(false);
                    setPaymentMethod("Cash");
                    setShowEndSaleModal(true);
                  }}
                  className="btn btn-success me-2"
                  style={{ fontSize: "1rem", padding: "10px 15px" }}
                  title="จบการขาย"
                >
                  <i className="fa fa-check me-2"></i>จบการขาย
                </button>

                {/** ปุ่มสำหรับพิมพ์บิลล่าสุด */}
                <button
                  onClick={handlePrint}
                  className="btn btn-primary me-2"
                  style={{ fontSize: "1rem", padding: "10px 15px" }}
                  title="พิมพ์บิลล่าสุด"
                >
                  <i className="fa fa-print me-2"></i>พิมพ์บิลล่าสุด
                </button>

                {/** ปุ่มสำหรับเลือกบิลเพื่อพิมพ์ */}
                <button
                  onClick={() => {
                    fetchBillToday();
                    setShowBillTodayModal(true);
                  }}
                  className="btn btn-info"
                  style={{ fontSize: "1rem", padding: "10px 15px" }}
                  title="เลือกบิลเพื่อพิมพ์"
                >
                  <i className="fa fa-file-invoice me-2"></i>รายการบิล
                </button>
              </div>
            </div>
          </div>

          <div className="card-body">
            <div className="row g-4">
              <div className="col-lg-9 col-md-8">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <input
                    type="text"
                    className="form-control form-control-lg search-input"
                    placeholder="🔍 ค้นหาสินค้า..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    ref={searchInputRef}
                  />
                </div>



                <div className="row g-4">
                  {sortedCategoriesToShow.length > 0 ? (
                    sortedCategoriesToShow.map((category) => (
                      groupedProductsToShow[category].map((item) => (
                        <div className="col-sm-6 col-md-4 col-lg-3" key={item.id}>
                          <div
                            className="card h-100 product-card"
                            onClick={() => handleProductClick(item)}
                            style={{
                              cursor: 'pointer'
                            }}
                          >
                            <div className="position-relative">
                              <img
                                src={
                                  item.mainImageUrl ? item.mainImageUrl :
                                    "https://via.placeholder.com/300x200?text=No+Image"
                                }
                                className="product-image"
                                alt={item.name}
                                onError={(e) => {
                                  e.target.src =
                                    "https://via.placeholder.com/300x200?text=No+Image";
                                }}
                              />
                              <div
                                className="stock-badge"
                                style={{
                                  background: "rgba(52, 211, 153, 0.9)",
                                  color: "#ffffff",
                                }}
                              >
                                {item.remainingQty}
                              </div>
                            </div>

                            <div className="product-info">
                              <div className="product-name">
                                <h5 className="fw-bold mb-2">
                                  {item.name}
                                </h5>
                              </div>
                              <div className="product-price">
                                <span
                                  className="h4 mb-0"
                                  style={{ color: "#2563eb", fontWeight: "600" }}
                                >
                                  {parseInt(item.price).toLocaleString("th-TH")} บาท
                                </span>
                              </div>
                              <div className="product-barcode">
                                <Barcode
                                  value={item.barcode}
                                  width={1}
                                  height={25}
                                  fontSize={10}
                                  background="transparent"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )).flat()
                  ) : (
                    <p className="text-center text-muted w-100">ไม่มีสินค้าที่พร้อมขาย</p>
                  )}
                </div>

                {/* Load More Button */}
                {hasMoreProducts && (
                  <div className="d-flex justify-content-center mt-4">
                    <button
                      onClick={loadMoreProducts}
                      className="btn btn-outline-primary btn-lg"
                      style={{
                        borderRadius: "25px",
                        padding: "10px 30px",
                        fontWeight: "600",
                        transition: "all 0.3s ease"
                      }}
                    >
                      <i className="fa fa-plus-circle me-2"></i>
                      ดูเพิ่มเติม ({allFilteredProducts.length - productsToShow.length} รายการ)
                    </button>
                  </div>
                )}
              </div>

              <div className="col-lg-3 col-md-4">
                <div className="position-sticky" style={{ top: "120px" }}>
                  <div className="cart-container">
                    <div className="cart-header">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <div className="cart-total">
                            {totalPrice.toLocaleString("th-TH")} ฿
                          </div>
                        </div>
                      </div>
                    </div>

                    <div
                      className="cart-items"
                      style={{
                        maxHeight: "65vh",
                        overflowY: "auto",
                        padding: "5px",
                      }}
                    >
                      {currentBill?.billSaleDetails?.length > 0 ? (
                        currentBill.billSaleDetails.map((item) => (
                          <div key={item.id} className="cart-item">
                            <div className="d-flex align-items-center mb-2">
                              <div className="flex-grow-1">
                                <h6
                                  className="mb-0"
                                  style={{
                                    color: "#1e40af",
                                    fontWeight: "600",
                                  }}
                                >
                                  {item.product.name}
                                </h6>
                                <small className="text-muted">
                                  {item.barcode}
                                </small>
                              </div>
                              <span className="quantity-badge">{item.qty}</span>
                            </div>

                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <span
                                  className="text-muted"
                                  style={{ fontSize: "0.9rem" }}
                                >
                                  {parseInt(item.price).toLocaleString("th-TH")}{" "}
                                  ฿ × {item.qty}
                                </span>
                              </div>
                              <div className="d-flex align-items-center">
                                <span
                                  className="me-3"
                                  style={{
                                    color: "#059669",
                                    fontWeight: "600",
                                    fontSize: "1.1rem",
                                  }}
                                >
                                  {(item.qty * item.price).toLocaleString(
                                    "th-TH"
                                  )}{" "}
                                  ฿
                                </span>
                                <button
                                  onClick={() => handleDelete(item)}
                                  className="delete-button"
                                  title="ลบรายการ"
                                >
                                  <i className="fa fa-trash"></i>
                                </button>
                              </div>
                            </div>

                            <div
                              className="progress mt-2"
                              style={{ height: "4px" }}
                            >
                              <div
                                className="progress-bar bg-success"
                                role="progressbar"
                                style={{
                                  width: `${(item.qty / item.product.remainingQty) * 100
                                    }%`,
                                  borderRadius: "2px",
                                }}
                              />
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-5">
                          <i
                            className="fa fa-shopping-cart mb-3"
                            style={{
                              fontSize: "3rem",
                              color: "#cbd5e1",
                            }}
                          ></i>
                          <p className="text-muted mb-0">ไม่มีสินค้าในตะกร้า</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Template>

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

        /* เพิ่ม styles สำหรับหน้า Sale */
        .product-card {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          background: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .product-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
        }


        .product-image {
          width: 70%;
          height: 180px;
          object-fit: cover;
          border-radius: 8px 8px 0 0;
          display: block;
          margin: 0 auto;
        }

        .position-relative {
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding: 10px 0;
        }

        .stock-badge {
          position: absolute;
          top: 8px;
          right: 8px;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }

        .product-info {
          padding: 15px;
          text-align: center;
          background: #ffffff;
          border-radius: 0 0 12px 12px;
          display: flex;
          flex-direction: column;
          flex-grow: 1;
          justify-content: space-between;
          min-height: 120px;
        }

        .product-name {
          flex-grow: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 48px;
          max-height: 48px;
          overflow: hidden;
        }

        .product-name h5 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.2;
          margin: 0;
          font-size: 0.95rem;
        }

        

        .product-barcode {
          margin-top: 5px;
          height: 35px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .cart-container {
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .cart-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
        }

        .cart-total {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 5px;
        }

        .cart-item {
          background: #f8fafc;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 10px;
          border: 1px solid #e2e8f0;
        }

        .quantity-badge {
          background: #3b82f6;
          color: white;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .delete-button {
          background: #ef4444;
          color: white;
          border: none;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .delete-button:hover {
          background: #dc2626;
          transform: scale(1.1);
        }

        .search-input {
          border-radius: 25px;
          border: 2px solid #e5e7eb;
          padding: 12px 20px;
          font-size: 1.1rem;
          transition: all 0.3s ease;
        }

        .search-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .bg-gradient-dark {
          background: linear-gradient(
            135deg,
            #1f2937 0%,
            #111827 100%
          ) !important;
        }

        h5 {
          font-family: "Kanit", sans-serif !important;
        }

        .modal-title {
          font-family: "Kanit", sans-serif !important;
          font-weight: 600 !important;
        }

        .form-label {
          font-family: "Kanit", sans-serif !important;
          font-weight: 600 !important;
        }

        /* QR Code Styles */
        .qr-payment-container {
          margin-top: 1.5rem;
        }

        .qr-card {
          background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
          border-radius: 20px;
          padding: 2rem;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
          border: 2px solid #e2e8f0;
          position: relative;
          overflow: hidden;
        }

        .qr-card::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          width: 100%;
          height: 100%;
          background: linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.3) 50%, transparent 70%);
          transform: rotate(45deg);
          transition: all 0.6s ease;
        }

        .qr-card:hover::before {
          animation: shimmer 2s infinite;
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
          100% { transform: translateX(100%) translateY(100%) rotate(45deg); }
        }

        .qr-card-transfer {
          background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%);
          border-color: #d1fae5;
        }

        .qr-header {
          text-align: center;
          margin-bottom: 1.5rem;
        }

        .qr-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          font-size: 24px;
          margin-bottom: 1rem;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .qr-icon-transfer {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .qr-title {
          color: #1e293b;
          font-weight: 600;
          margin-bottom: 0.5rem;
          font-size: 1.1rem;
        }

        .qr-amount {
          color: #3b82f6;
          font-weight: 700;
          font-size: 1.8rem;
          margin: 0;
        }

        .qr-amount-transfer {
          color: #10b981;
        }

        .qr-code-wrapper {
          display: flex;
          justify-content: center;
          margin: 1.5rem 0;
        }

        .qr-code-frame {
          background: white;
          padding: 20px;
          border-radius: 16px;
          box-shadow: 
            0 0 0 4px #f1f5f9,
            0 0 0 8px #e2e8f0,
            0 8px 32px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
        }

        .qr-code-frame:hover {
          transform: scale(1.02);
          box-shadow: 
            0 0 0 4px #ddd6fe,
            0 0 0 8px #c4b5fd,
            0 12px 40px rgba(0, 0, 0, 0.15);
        }

        .qr-code-frame-transfer {
          box-shadow: 
            0 0 0 4px #f0fdf4,
            0 0 0 8px #d1fae5,
            0 8px 32px rgba(0, 0, 0, 0.1);
        }

        .qr-code-frame-transfer:hover {
          box-shadow: 
            0 0 0 4px #bbf7d0,
            0 0 0 8px #a7f3d0,
            0 12px 40px rgba(0, 0, 0, 0.15);
        }

        .qr-footer {
          text-align: center;
        }

        .qr-instruction {
          color: #64748b;
          font-size: 0.95rem;
          margin: 0;
          font-weight: 500;
        }

        .qr-instruction-small {
          font-size: 0.85rem;
        }

        .qr-confirm-btn {
          border-radius: 12px;
          padding: 12px;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
          transition: all 0.3s ease;
        }

        .qr-confirm-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(34, 197, 94, 0.4);
        }

        .qr-transfer-container {
          margin-top: 2rem;
        }

        .qr-divider {
          position: relative;
          text-align: center;
          margin: 1.5rem 0;
        }

        .qr-divider::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(to right, transparent, #d1d5db, transparent);
        }

        .qr-divider-text {
          background: white;
          color: #6b7280;
          padding: 0 1rem;
          font-size: 0.9rem;
          font-weight: 500;
        }

        /* Load More Button Styles */
        .btn-outline-primary:hover {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-color: #667eea;
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
        }

        .btn-outline-primary:focus {
          box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25);
        }

        /* SweetAlert Equal Button Styles */
        :global(.swal2-actions button) {
          width: 100px !important;
          min-width: 100px !important;
          margin: 0 8px !important;
        }

        :global(.swal2-confirm),
        :global(.swal2-cancel) {
          width: 100px !important;
          min-width: 100px !important;
          font-size: 14px !important;
          padding: 10px 16px !important;
        }
      `}</style>

      <Modal
        show={showHeldBillsModal}
        onHide={() => setShowHeldBillsModal(false)}
        title="บิลที่พักไว้"
      >
        <div className="modal-body">
          {heldBills.length === 0 ? (
            <p className="text-center text-muted">ไม่มีบิลที่พักไว้</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>บิลเลขที่</th>
                    <th>วันที่พัก </th>
                    <th width="200px">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {heldBills.map((heldBill, index) => (
                    <tr key={index}>
                      <td>#{heldBill.billSaleId}</td>

                      <td>
                        {(() => {
                          // ใช้ Date object เพื่อแสดงเวลาท้องถิ่นที่ถูกต้อง
                          // หมายเหตุ: heldAt เป็นวันที่พักบิล ไม่ใช่ payDate
                          const heldAtString = heldBill.heldAt;
                          if (heldAtString) {
                            try {
                              const date = new Date(heldAtString);
                              return date.toLocaleString('th-TH', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false
                              });
                            } catch (error) {
                              return heldAtString;
                            }
                          }
                          return "-";
                        })()}
                      </td>
                      <td>
                        <button
                          className="btn btn-primary btn-sm me-2"
                          onClick={() => handleRetrieveBill(heldBill)}
                        >
                          <i className="fa fa-undo me-1"></i>
                          เรียกคืน
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* แสดงข้อความเตือนหากมีเบอร์โทรไม่ครบ */}
          {hasIncompletePhone && (
            <div className="alert alert-warning mt-3" role="alert">
              <i className="fa fa-exclamation-triangle me-2"></i>
              <strong>ไม่สามารถจบการขายได้:</strong> กรุณากรอกเบอร์โทรลูกค้าให้ครบ 10 หลัก หรือล้างข้อมูลลูกค้า
            </div>
          )}
        </div>
      </Modal>

      <Modal
        show={showBillTodayModal}
        onHide={() => setShowBillTodayModal(false)}
        title="รายการบิลที่ชำระแล้ว"
        modalSize="modal-lg"
      >
        <table className="table table-bordered table-striped">
          <thead>
            <tr>

              <th>เลขบิล</th>
              <th>วัน เวลาที่ชำระเงิน </th>
              <th width="200px">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {billToday.length > 0
              ? billToday.map((item) => (
                <tr key={item.id}>

                  <td>#{item.id}</td>
                  <td>{(() => {
                    if (!item?.payDate) return "-";

                    // ใช้ Date object เพื่อแสดงเวลาท้องถิ่นที่ถูกต้อง
                    const date = new Date(item.payDate);
                    return date.toLocaleString('th-TH', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false
                    });
                  })()}</td>
                  <td className="text-center">

                    <button
                      onClick={() => {
                        handlePrintSelectedBill(item);
                      }}
                      className="btn btn-success btn-sm"
                      title="พิมพ์บิลนี้"
                    >
                      <i className="fa fa-print me-1"></i>
                      พิมพ์บิล
                    </button>
                  </td>
                </tr>
              ))
              : (
                <tr>
                  <td colSpan="4" className="text-center text-muted py-4">
                    <i className="fa fa-file-invoice fa-3x mb-3 text-muted"></i>
                    <br />
                    ไม่มีบิลที่ชำระแล้วในวันนี้
                  </td>
                </tr>
              )}
          </tbody>
        </table>
      </Modal>

      <Modal
        show={showQtyModal}
        onHide={() => setShowQtyModal(false)}
        title="ปรับจำนวน"
      >
        <div>
          <label>จำนวน</label>
          <input
            value={item.qty || ""}
            onChange={(e) => {
              const newQty = e.target.value;
              if (newQty === "") {
                setItem({ ...item, qty: "" });
              } else {
                const qtyNumber = parseInt(newQty, 10);
                if (isNaN(qtyNumber) || qtyNumber <= 0) {
                  setItem({ ...item, qty: 1 });
                } else if (qtyNumber > item.remainingQty) {
                  Swal.fire({
                    title: "จำนวนสินค้าเกิน",
                    text: "จำนวนสินค้าที่กรอกเกินจำนวนคงเหลือ",
                    icon: "warning",
                  });
                  setItem({ ...item, qty: item.remainingQty });
                } else {
                  setItem({ ...item, qty: qtyNumber });
                }
              }
            }}
            className="form-control"
          />

          <div className="mt-3">
            <button
              onClick={() => {
                handleAddToBill();
                setShowQtyModal(false);
              }}
              className="btn btn-success"
            >
              เพิ่มลงบิล
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        show={showEndSaleModal}
        onHide={() => setShowEndSaleModal(false)}
        title="จบการขาย"
      >
        <div>
          <div className="mb-3">
            <label className="form-label">
              เลือกลูกค้าเพื่อสะสมแต้ม (ไม่บังคับ)
            </label>
            <div className="input-group position-relative">
              <input
                type="text"
                className={`form-control ${customerSearchText && isIncompletePhoneNumber(customerSearchText)
                  ? 'border-warning'
                  : ''
                  }`}
                placeholder="ค้นหาด้วยชื่อหรือเบอร์โทร (เบอร์โทร 10 หลัก)..."
                value={customerSearchText}
                onChange={(e) => {
                  let value = e.target.value;

                  // ถ้าเป็นตัวเลขทั้งหมด ให้จำกัดที่ 10 หลัก
                  if (/^\d+$/.test(value)) {
                    if (value.length <= 10) {
                      setCustomerSearchText(value);
                      searchCustomers(value);
                      setShowCustomerDropdown(value.length > 0);
                    }
                    // รีเซ็ตสถานะเบอร์ไม่ครบเมื่อครบ 10 หลักหรือล้างข้อมูล
                    if (value.length === 0 || value.length === 10) {
                      setHasIncompletePhone(false);
                    }
                  } else {
                    // ถ้าไม่ใช่ตัวเลขล้วน ให้ค้นหาตามชื่อได้
                    setCustomerSearchText(value);
                    searchCustomers(value);
                    setShowCustomerDropdown(value.length > 0);
                    setHasIncompletePhone(false);
                  }

                  // รีเซ็ตสถานะเบอร์ไม่ครบเมื่อล้างข้อมูล
                  if (value.length === 0) {
                    setHasIncompletePhone(false);
                  }
                }}
                onFocus={() => {
                  if (customerSearchText.length > 0) {
                    setShowCustomerDropdown(true);
                    searchCustomers(customerSearchText);
                  }
                }}
                onBlur={() => {
                  // หน่วงเวลาเล็กน้อยเพื่อให้คลิกได้
                  setTimeout(() => setShowCustomerDropdown(false), 200);
                }}
              />
              {selectedCustomer && (
                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  onClick={clearCustomerSelection}
                >
                  <i className="fa fa-times"></i>
                </button>
              )}

              {/* Dropdown แสดงผลการค้นหา */}
              {showCustomerDropdown && filteredCustomers.length > 0 && (
                <div
                  className="position-absolute w-100 bg-white border border-top-0 shadow-sm"
                  style={{
                    top: "100%",
                    zIndex: 1050,
                    maxHeight: "200px",
                    overflowY: "auto",
                  }}
                >
                  {filteredCustomers.map((customer) => (
                    <div
                      key={customer.id}
                      className="px-3 py-2 border-bottom"
                      style={{
                        cursor: "pointer",
                        backgroundColor: "white",
                        transition: "background-color 0.2s",
                      }}
                      onMouseEnter={(e) =>
                        (e.target.style.backgroundColor = "#f8f9fa")
                      }
                      onMouseLeave={(e) =>
                        (e.target.style.backgroundColor = "white")
                      }
                      onClick={() => selectCustomer(customer)}
                    >
                      <div className="fw-bold">{customer.name}</div>
                      <small className="text-muted">{customer.phone}</small>
                      {customer.points > 0 && (
                        <small className="text-success ms-2">
                          ({customer.points.toLocaleString("th-TH")} แต้ม)
                        </small>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {selectedCustomer && (
            <>
              <div className="alert alert-muted mb-3">
                <h6 className="mb-1">ข้อมูลลูกค้า</h6>
                <div>
                  <strong>ชื่อ:</strong> {selectedCustomer.name}
                </div>
                <div>
                  <strong>แต้มสะสม:</strong> {selectedCustomer.points || 0} แต้ม
                </div>

                <div className="mt-2 text-success">
                  <i className="fas fa-plus-circle me-1"></i>
                  จะได้รับแต้มเพิ่ม {Math.floor(totalPrice / 100)} แต้ม
                  จากยอดซื้อครั้งนี้
                </div>
              </div>

              {selectedCustomer.points > 0 && (
                <div className="mb-3">
                  <label className="form-label">
                    ใช้แต้มสะสม (1 แต้ม = 10 บาท)
                  </label>
                  <div className="input-group">
                    <input
                      type="number"
                      className="form-control"
                      value={pointsToRedeem}
                      onChange={(e) =>
                        handlePointsRedemption(parseInt(e.target.value) || 0)
                      }
                      max={Math.min(
                        selectedCustomer.points,
                        Math.floor(totalPrice / 10)
                      )}
                      min="0"
                    />
                    <span className="input-group-text">แต้ม</span>
                  </div>
                  {discountFromPoints > 0 && (
                    <div className="text-success mt-1">
                      <small>
                        ส่วนลดจากแต้มสะสม: {discountFromPoints.toLocaleString("th-TH")}{" "}
                        บาท
                      </small>
                    </div>
                  )}
                  <small className="text-muted">
                    (สามารถใช้แต้มได้สูงสุด{" "}
                    {Math.min(
                      selectedCustomer.points,
                      Math.floor(totalPrice / 10)
                    )}{" "}
                    แต้ม)
                  </small>
                </div>
              )}
            </>
          )}

          <div>
            <label>ยอดรวมราคาสินค้า</label>
          </div>
          <div>
            <input
              value={(totalPrice - discountFromPoints).toLocaleString("th-TH")}
              disabled
              className="form-control text-end"
            />
          </div>

          <div className="mt-3">
            <label>ช่องทางการชำระเงิน</label>
          </div>
          <div>
            <select
              value={paymentMethod}
              onChange={handlePaymentMethodChange}
              className="form-control"
            >
              <option value="Cash">Cash(เงินสด)</option>
              <option value="PromptPay">PromptPay(พร้อมเพย์)</option>
              <option value="Split">Split Payment(ชำระแบบผสม)</option>
            </select>
          </div>
          <div>
            {paymentMethod === "PromptPay" ? (
              <div className="qr-payment-container">
                <div className="qr-card">
                  <div className="qr-header">
                    <div className="qr-icon">
                      <i className="fas fa-qrcode"></i>
                    </div>
                    <h6 className="qr-title">สแกนเพื่อชำระเงิน</h6>
                    <p className="qr-amount">{(totalPrice - discountFromPoints).toLocaleString("th-TH")} ฿</p>
                  </div>

                  <div className="qr-code-wrapper">
                    <div className="qr-code-frame">
                      <QRCodeSVG
                        value={generateQRCode()}
                        size={220}
                        level="L"
                        fgColor="#1a365d"
                        bgColor="#ffffff"
                      />
                    </div>
                  </div>

                  <div className="qr-footer">
                    <p className="qr-instruction">
                      <i className="fas fa-mobile-alt me-2"></i>
                      เปิดแอปธนาคารและสแกน QR Code
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleEndSaleAndPrint}
                  className="btn btn-success btn-lg w-100 mt-3 qr-confirm-btn"
                  disabled={hasIncompletePhone}
                  title={hasIncompletePhone ? "กรุณากรอกเบอร์โทรให้ครบ 10 หลัก" : "ยืนยันการชำระเงิน"}
                >
                  <i className="fas fa-check-circle me-2"></i>
                  ยืนยันการชำระเงิน
                </button>
              </div>
            ) : paymentMethod === "Split" ? (
              <div className="mt-4">
                <div className="alert alert-info">
                  <i className="fas fa-info-circle me-2"></i>
                  การชำระเงินแบบผสม: เงินสด + โอน
                </div>

                <div className="row">
                  <div className="col-6">
                    <label className="form-label">
                      <i className="fas fa-money-bill me-1"></i>
                      เงินสด (บาท)
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      value={cashAmount}
                      onChange={(e) => {
                        const value = safeParseFloat(e.target.value);
                        const totalAfterDiscount = totalPrice - discountFromPoints;
                        const currentTransfer = safeParseFloat(transferAmount);
                        const maxCash = totalAfterDiscount - currentTransfer;

                        // ป้องกันไม่ให้เกินยอดสูงสุดที่สามารถจ่ายด้วยเงินสดได้
                        if (value > maxCash) {
                          setCashAmount(Math.max(0, maxCash));
                        } else {
                          setCashAmount(value);
                        }
                      }}
                      placeholder="0.00"
                      min="0"
                      max={Math.max(0, (totalPrice - discountFromPoints) - safeParseFloat(transferAmount))}
                      step="0.01"
                    />
                    <small className="text-muted">
                      สูงสุด: {Math.max(0, (totalPrice - discountFromPoints) - safeParseFloat(transferAmount)).toLocaleString("th-TH")} ฿
                    </small>
                  </div>
                  <div className="col-6">
                    <label className="form-label">
                      <i className="fas fa-credit-card me-1"></i>
                      โอน (บาท)
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      value={transferAmount}
                      onChange={(e) => {
                        const value = safeParseFloat(e.target.value);
                        const totalAfterDiscount = totalPrice - discountFromPoints;
                        const currentCash = safeParseFloat(cashAmount);
                        const maxTransfer = totalAfterDiscount - currentCash;

                        // ป้องกันไม่ให้เกินยอดสูงสุดที่สามารถโอนได้
                        if (value > maxTransfer) {
                          setTransferAmount(Math.max(0, maxTransfer));
                        } else {
                          setTransferAmount(value);
                        }
                      }}
                      placeholder="0.00"
                      min="0"
                      max={Math.max(0, (totalPrice - discountFromPoints) - safeParseFloat(cashAmount))}
                      step="0.01"
                    />
                    <small className="text-muted">
                      สูงสุด: {Math.max(0, (totalPrice - discountFromPoints) - safeParseFloat(cashAmount)).toLocaleString("th-TH")} ฿
                    </small>
                  </div>
                </div>



                <div className="mt-3 p-3 bg-light rounded">
                  <div className="d-flex justify-content-between mb-2">
                    <span>ยอดที่ต้องชำระ:</span>
                    <span className="fw-bold text-danger">
                      {(totalPrice - discountFromPoints).toLocaleString("th-TH")} ฿
                    </span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span>เงินสด:</span>
                    <span>{safeParseFloat(cashAmount).toLocaleString("th-TH")} ฿</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span>โอน:</span>
                    <span>{safeParseFloat(transferAmount).toLocaleString("th-TH")} ฿</span>
                  </div>
                  <hr />
                  <div className="d-flex justify-content-between mb-2">
                    <span className="fw-bold">รวมจำนวนที่ชำระ:</span>
                    <span className="fw-bold text-success">
                      {(safeParseFloat(cashAmount) + safeParseFloat(transferAmount)).toLocaleString("th-TH")} ฿
                    </span>
                  </div>
                  {(safeParseFloat(cashAmount) + safeParseFloat(transferAmount)) > (totalPrice - discountFromPoints) && (
                    <div className="d-flex justify-content-between text-warning">
                      <span className="fw-bold">เงินทอน:</span>
                      <span className="fw-bold">
                        {((safeParseFloat(cashAmount) + safeParseFloat(transferAmount)) - (totalPrice - discountFromPoints)).toLocaleString("th-TH")} ฿
                      </span>
                    </div>
                  )}
                  {(safeParseFloat(cashAmount) + safeParseFloat(transferAmount)) < (totalPrice - discountFromPoints) && (
                    <div className="d-flex justify-content-between text-danger">
                      <span className="fw-bold">ยังต้องชำระ:</span>
                      <span className="fw-bold">
                        {((totalPrice - discountFromPoints) - (safeParseFloat(cashAmount) + safeParseFloat(transferAmount))).toLocaleString("th-TH")} ฿
                      </span>
                    </div>
                  )}
                </div>



                {/* แสดง QR Code สำหรับส่วนที่โอน */}
                {transferAmount > 0 && (
                  <div className="qr-transfer-container">
                    <div className="qr-divider">
                      <span className="qr-divider-text">
                        <i className="fas fa-credit-card me-2"></i>
                        ส่วนโอน
                      </span>
                    </div>



                    <div className="qr-card qr-card-transfer">
                      <div className="qr-header">
                        <div className="qr-icon qr-icon-transfer">
                          <i className="fas fa-qrcode"></i>
                        </div>
                        <h6 className="qr-title">สแกนเพื่อโอนเงิน</h6>
                        <p className="qr-amount qr-amount-transfer">{safeParseFloat(transferAmount).toLocaleString("th-TH")} ฿</p>
                      </div>



                      <div className="qr-code-wrapper">
                        <div className="qr-code-frame qr-code-frame-transfer">
                          <QRCodeSVG
                            value={generatePayload(promptPayNumber, { amount: safeParseFloat(transferAmount) })}
                            size={180}
                            level="L"
                            fgColor="#065f46"
                            bgColor="#ffffff"
                          />
                        </div>
                      </div>

                      <div className="qr-footer">
                        <p className="qr-instruction qr-instruction-small">
                          <i className="fas fa-mobile-alt me-1"></i>
                          โอน {safeParseFloat(transferAmount).toLocaleString("th-TH")} บาท
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="text-center mt-3">
                  <button
                    onClick={handleSplitPayment}
                    className="btn btn-success"
                    disabled={(!cashAmount && !transferAmount) || hasIncompletePhone}
                    title={hasIncompletePhone ? "กรุณากรอกเบอร์โทรให้ครบ 10 หลัก" : "ยืนยันการชำระ"}
                  >
                    <i className="fa fa-check me-2"></i>
                    ยืนยันการชำระ
                  </button>
                </div>
              </div>


            ) : (
              <>
                <div className="mt-3">
                  <label>รับเงิน</label>
                  <input
                    value={inputMoney.toLocaleString("th-TH")}
                    onChange={(e) => setInputMoney(e.target.value)}
                    className="form-control text-end"
                  />
                </div>
                <div className="mt-3">
                  <label>เงินทอน</label>
                  <input
                    value={(
                      inputMoney -
                      (totalPrice - discountFromPoints)
                    ).toLocaleString("th-TH")}
                    className="form-control text-end"
                    disabled
                  />
                </div>
                <div className="text-center mt-3">
                  <button
                    onClick={async () => {
                      // ตรวจสอบเบอร์โทรที่ไม่ครบ
                      if (!canCompleteSale()) {
                        return;
                      }
                      setInputMoney(totalPrice - discountFromPoints);
                      // จบการขายทันทีและพิมพ์บิล
                      await handleEndSaleAndPrint();
                    }}
                    className="btn btn-primary me-2"
                    disabled={hasIncompletePhone}
                    title={hasIncompletePhone ? "กรุณากรอกเบอร์โทรให้ครบ 10 หลัก" : "จ่ายพอดี"}
                  >
                    <i className="fa fa-check me-2"></i>
                    จ่ายพอดี
                  </button>
                  <button
                    onClick={async () => {
                      // ตรวจสอบเบอร์โทรที่ไม่ครบ
                      if (!canCompleteSale()) {
                        return;
                      }
                      setInputMoney(totalPrice - discountFromPoints);
                      // จบการขายทันทีและพิมพ์บิล
                      await handleEndSaleAndPrint();
                    }}
                    className="btn btn-success"
                    disabled={inputMoney <= 0 || hasIncompletePhone}
                    title={hasIncompletePhone ? "กรุณากรอกเบอร์โทรให้ครบ 10 หลัก" : "จบการขาย"}
                  >
                    <i className="fa fa-check me-2"></i>
                    จบการขาย
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        show={showBillDetailModal}
        onHide={() => setShowBillDetailModal(false)}
        title="รายละเอียดในบิล"
        modalSize="modal-lg"
      >
        <div className="p-4" style={{ fontFamily: "'Kanit', sans-serif" }}>
          <div className="bg-light p-3 rounded mb-4 shadow-sm">
            <table className="table table-hover table-striped">
              <thead>
                <tr>
                  <th>รายการ</th>
                  <th>จำนวน</th>
                  <th className="text-end">ราคา</th>
                </tr>
              </thead>
              <tbody>
                {selectedBill?.billSaleDetails?.map((item, index) => {
                  return (
                    <tr key={index}>
                      <td>{item.product.name}</td>
                      <td className="text-center">{item.qty}</td>
                      <td className="text-end">
                        {item.price.toLocaleString("th-TH")} บาท
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <hr style={{ border: "none", borderTop: "1px dashed #888" }} />

            {/* ยอดรวมก่อนหักส่วนลด */}
            <div
              style={{
                fontSize: "13px",
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "8px",
                width: "100%",
              }}
            >
              <span style={{ flex: 1, textAlign: "left" }}>ยอดรวม:</span>
              <span style={{ flex: 1, textAlign: "right" }}>
                {selectedBill?.billSaleDetails
                  ? `${selectedBill.billSaleDetails.reduce((sum, item) => sum + parseFloat(item.qty), 0)} ชิ้น / ${selectedBill.billSaleDetails
                    .reduce(
                      (sum, item) =>
                        sum + parseFloat(item.qty) * parseFloat(item.price),
                      0
                    )
                    .toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท`
                  : "0 ชิ้น / 0 บาท"}
              </span>
            </div>

            {/* แสดงส่วนลดหากมี */}
            {selectedBill?.description && selectedBill.description.includes("ใช้แต้มสะสม") && (
              <div
                style={{
                  fontSize: "13px",
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                  width: "100%",
                  color: "#e74c3c",
                }}
              >
                <span style={{ flex: 1, textAlign: "left" }}>ส่วนลดจากแต้ม:</span>
                <span style={{ flex: 1, textAlign: "right" }}>
                  {(() => {
                    // ดึงจำนวนส่วนลดจาก description
                    const match = selectedBill.description.match(/ส่วนลด (\d+) บาท/);
                    return match ? `-${parseInt(match[1]).toLocaleString("th-TH")} บาท` : "-";
                  })()}
                </span>
              </div>
            )}

            {/* ยอดสุทธิ */}
            <div
              style={{
                fontSize: "14px",
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "8px",
                width: "100%",
                fontWeight: "bold",
                borderTop: "1px dashed #888",
                paddingTop: "8px",
              }}
            >
              <span style={{ flex: 1, textAlign: "left" }}>ยอดสุทธิ:</span>
              <span style={{ flex: 1, textAlign: "right" }}>
                {(() => {
                  if (!selectedBill?.billSaleDetails) return "0 บาท";

                  const totalBeforeDiscount = selectedBill.billSaleDetails.reduce(
                    (sum, item) => sum + parseFloat(item.qty) * parseFloat(item.price),
                    0
                  );

                  let discount = 0;
                  if (selectedBill.description && selectedBill.description.includes("ใช้แต้มสะสม")) {
                    const match = selectedBill.description.match(/ส่วนลด (\d+) บาท/);
                    discount = match ? parseInt(match[1]) : 0;
                  }

                  const netTotal = totalBeforeDiscount - discount;
                  return `${netTotal.toLocaleString("th-TH")} บาท`;
                })()}
              </span>
            </div>

            {/* ข้อมูลการชำระเงิน */}
            {selectedBill?.paymentMethod && (
              <div style={{ fontSize: "12px", marginTop: "8px", marginBottom: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span>วิธีการชำระเงิน:</span>
                  <span>
                    {selectedBill.paymentMethod === "Cash" && "เงินสด"}
                    {selectedBill.paymentMethod === "PromptPay" && "พร้อมเพย์"}
                    {selectedBill.paymentMethod === "Transfer" && "โอนเงิน"}
                    {selectedBill.paymentMethod === "Split" && "ชำระแบบผสม"}
                  </span>
                </div>
                {selectedBill.paymentMethod === "Cash" && selectedBill.received && (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span>รับเงิน:</span>
                      <span>{parseFloat(selectedBill.received || 0).toLocaleString("th-TH")} บาท</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span>เงินทอน:</span>
                      <span>{(parseFloat(selectedBill.received || 0) - parseFloat(selectedBill.total || 0)).toLocaleString("th-TH")} บาท</span>
                    </div>
                  </>
                )}
                {/* แสดงรายละเอียดการชำระแบบผสม */}
                {selectedBill.paymentMethod === "Split" && selectedBill.description && (
                  <div style={{ fontSize: "11px", color: "#666", marginTop: "4px" }}>
                    {selectedBill.description.split(" | ").map((part, index) => {
                      if (part.includes("ชำระแบบผสม")) {
                        const paymentInfo = part.replace("ชำระแบบผสม - ", "");
                        return (
                          <div key={index} style={{ marginLeft: "10px" }}>
                            {paymentInfo}
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                )}
                {/* แสดงข้อมูลส่วนลดจากแต้ม */}
                {selectedBill.description && selectedBill.description.includes("ใช้แต้มสะสม") && (
                  <div style={{ fontSize: "11px", color: "#27ae60", marginTop: "4px", fontStyle: "italic" }}>
                    {selectedBill.description.split(" | ").map((part, index) => {
                      if (part.includes("ใช้แต้มสะสม")) {
                        return (
                          <div key={index}>
                            ✓ {part}
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Split Payment Modal */}
      <Modal
        show={showSplitPaymentModal}
        onHide={() => {
          setShowSplitPaymentModal(false);
          setPaymentMethod("Cash"); // รีเซ็ตกลับเป็น Cash
          setCashAmount(0);
          setTransferAmount(0);
        }}
        title="ชำระเงินแบบผสม"
      >
        <div>
          <div className="alert alert-info">
            <h6 className="mb-1">
              <i className="fas fa-calculator me-2"></i>
              สรุปการชำระเงิน
            </h6>
            <div>ยอดรวม: <strong>{(totalPrice - discountFromPoints).toLocaleString("th-TH")} บาท</strong></div>
          </div>

          <div className="row">
            <div className="col-6">
              <label className="form-label">
                <i className="fas fa-money-bill me-1"></i>
                เงินสด (บาท)
              </label>
              <input
                type="number"
                className="form-control"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
            <div className="col-6">
              <label className="form-label">
                <i className="fas fa-credit-card me-1"></i>
                โอน (บาท)
              </label>
              <input
                type="number"
                className="form-control"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="mt-3 p-3 bg-light rounded">
            <div className="d-flex justify-content-between mb-2">
              <span>ยอดที่ต้องชำระ:</span>
              <span className="fw-bold text-danger">
                {(totalPrice - discountFromPoints).toLocaleString("th-TH")} ฿
              </span>
            </div>
            <div className="d-flex justify-content-between mb-2">
              <span>เงินสด:</span>
              <span>{parseFloat(cashAmount || 0).toLocaleString("th-TH")} ฿</span>
            </div>
            <div className="d-flex justify-content-between mb-2">
              <span>โอน:</span>
              <span>{parseFloat(transferAmount || 0).toLocaleString("th-TH")} ฿</span>
            </div>
            <hr />
            <div className="d-flex justify-content-between mb-2">
              <span className="fw-bold">รวมจำนวนที่ชำระ:</span>
              <span className="fw-bold text-success">
                {(parseFloat(cashAmount || 0) + parseFloat(transferAmount || 0)).toLocaleString("th-TH")} ฿
              </span>
            </div>
            {(parseFloat(cashAmount || 0) + parseFloat(transferAmount || 0)) > (totalPrice - discountFromPoints) && (
              <div className="d-flex justify-content-between text-warning">
                <span className="fw-bold">เงินทอน:</span>
                <span className="fw-bold">
                  {((parseFloat(cashAmount || 0) + parseFloat(transferAmount || 0)) - (totalPrice - discountFromPoints)).toLocaleString("th-TH")} ฿
                </span>
              </div>
            )}
            {(parseFloat(cashAmount || 0) + parseFloat(transferAmount || 0)) < (totalPrice - discountFromPoints) && (
              <div className="d-flex justify-content-between text-danger">
                <span className="fw-bold">ยังต้องชำระ:</span>
                <span className="fw-bold">
                  {((totalPrice - discountFromPoints) - (parseFloat(cashAmount || 0) + parseFloat(transferAmount || 0))).toLocaleString("th-TH")} ฿
                </span>
              </div>
            )}
          </div>

          <div className="text-center mt-4">
            <button
              onClick={() => {
                const totalPayment = parseFloat(cashAmount || 0) + parseFloat(transferAmount || 0);
                const requiredAmount = totalPrice - discountFromPoints;

                if (totalPayment < requiredAmount) {
                  Swal.fire({
                    title: "จำนวนเงินไม่เพียงพอ",
                    text: `ต้องการเงินอีก ${(requiredAmount - totalPayment).toLocaleString("th-TH")} บาท`,
                    icon: "warning",
                  });
                  return;
                }

                handleSplitPayment();
              }}
              className="btn btn-success me-2"
              disabled={!cashAmount && !transferAmount}
            >
              <i className="fa fa-check me-2"></i>
              ยืนยันการชำระ
            </button>
            <button
              onClick={() => {
                setShowSplitPaymentModal(false);
                setPaymentMethod("Cash");
                setCashAmount(0);
                setTransferAmount(0);
              }}
              className="btn btn-secondary"
            >
              <i className="fa fa-times me-2"></i>
              ยกเลิก
            </button>
          </div>
        </div>
      </Modal>

      {/* Receipt Template - ซ่อนไว้สำหรับพิมพ์ */}
      <div style={{ display: "none" }}>
        <div
          ref={printRef}
          className="print-receipt"
          style={{
            width: "58mm",
            padding: "5mm",
            fontFamily: "'Sarabun', 'Angsana New', sans-serif",
            fontSize: "12px",
            lineHeight: "1.4",
          }}
        >
        <div style={{ width: "100%" }}>
          {/* Header */}
          <div style={{ marginBottom: "8px" }}>
            <div style={{ fontSize: "11px", lineHeight: "1.4" }}>
              {(() => {
                if (!lastBill?.payDate) return "วันที่ชำระเงิน: -";

                const date = new Date(lastBill.payDate);
                const formattedDate = date.toLocaleString('th-TH', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false
                });
                return `${formattedDate} น.`;
              })()}
            </div>
            <div style={{ fontSize: "11px", lineHeight: "1.4", marginTop: "2px" }}>
              เลขที่ใบเสร็จ <b>#{lastBill?.id || "-"}</b>
            </div>
          </div>
          
          <div style={{ width: "100%" }}>
            <hr style={{ border: "none", borderTop: "1px dashed #000", margin: "6px 0" }} />

            {/* รายการสินค้า */}
            <div style={{ fontSize: "11px", marginBottom: "4px", fontWeight: "bold" }}>รายการสินค้า</div>
            
            <table style={{ 
              width: "100%", 
              margin: 0, 
              borderCollapse: "collapse", 
              borderSpacing: 0,
              fontSize: "10px",
              lineHeight: "1.3"
            }}>
              <tbody>
                {lastBill?.billSaleDetails?.map((item, index) => (
                  <tr key={index}>
                    <td style={{ 
                      padding: "2px 0", 
                      verticalAlign: "top",
                      width: "55%",
                      textAlign: "left"
                    }}>
                      {item.product.name || "-"}
                    </td>
                    <td style={{ 
                      padding: "2px 0", 
                      textAlign: "center",
                      width: "15%",
                      verticalAlign: "top"
                    }}>
                      {item.qty || 1}
                    </td>
                    <td style={{ 
                      padding: "2px 0", 
                      textAlign: "right",
                      width: "30%",
                      verticalAlign: "top"
                    }}>
                      {parseInt(item.price).toLocaleString("th-TH")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <hr style={{ border: "none", borderTop: "1px dashed #000", margin: "6px 0" }} />

            {/* ยอดรวมก่อนหักส่วนลด */}
            <div style={{
              fontSize: "10px",
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "3px",
              lineHeight: "1.3"
            }}>
              <span>ยอดรวม:</span>
              <span style={{ textAlign: "right" }}>
                {lastBill?.billSaleDetails
                  ? `${lastBill.billSaleDetails.reduce((sum, item) => sum + parseFloat(item.qty), 0)} ชิ้น / ${parseInt(
                    lastBill.billSaleDetails.reduce(
                      (sum, item) =>
                        sum + parseFloat(item.qty) * parseFloat(item.price),
                      0
                    )
                  ).toLocaleString("th-TH")} บาท`
                  : "0 ชิ้น / 0 บาท"}
              </span>
            </div>

            {/* แสดงส่วนลดหากมี */}
            {lastBill?.description && lastBill.description.includes("ใช้แต้มสะสม") && (
              <div style={{
                fontSize: "10px",
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "3px",
                lineHeight: "1.3"
              }}>
                <span>ส่วนลดจากแต้ม:</span>
                <span style={{ textAlign: "right" }}>
                  {(() => {
                    const match = lastBill.description.match(/ส่วนลด (\d+) บาท/);
                    return match ? `-${parseInt(match[1]).toLocaleString("th-TH")} บาท` : "-";
                  })()}
                </span>
              </div>
            )}

            <hr style={{ border: "none", borderTop: "1px dashed #000", margin: "6px 0" }} />

            {/* ยอดสุทธิ */}
            <div style={{
              fontSize: "11px",
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "6px",
              fontWeight: "bold",
              lineHeight: "1.3"
            }}>
              <span>ยอดสุทธิ:</span>
              <span style={{ textAlign: "right" }}>
                {(() => {
                  if (!lastBill?.billSaleDetails) return "0.00 บาท";

                  const totalBeforeDiscount = parseInt(
                    lastBill.billSaleDetails.reduce(
                      (sum, item) => sum + parseFloat(item.qty) * parseFloat(item.price),
                      0
                    )
                  );

                  let discount = 0;
                  if (lastBill.description && lastBill.description.includes("ใช้แต้มสะสม")) {
                    const match = lastBill.description.match(/ส่วนลด (\d+)/);
                    discount = match ? parseInt(match[1]) : 0;
                  }

                  const netTotal = totalBeforeDiscount - discount;
                  return `${netTotal.toLocaleString("th-TH")} บาท`;
                })()}
              </span>
            </div>

            {/* วิธีชำระเงิน */}
            <div style={{
              fontSize: "10px",
              marginBottom: "6px",
              lineHeight: "1.3"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                <span>วิธีชำระเงิน:</span>
                <span>
                  {lastBill?.paymentMethod === "Cash" && "เงินสด"}
                  {lastBill?.paymentMethod === "PromptPay" && "พร้อมเพย์"}
                  {lastBill?.paymentMethod === "Transfer" && "โอนเงิน"}
                  {lastBill?.paymentMethod === "Split" && "ชำระแบบผสม"}
                </span>
              </div>

              {/* แสดงรายละเอียดการชำระแบบผสม */}
              {lastBill?.paymentMethod === "Split" && lastBill.description && (
                <div style={{ fontSize: "9px", marginLeft: "10px", marginTop: "2px" }}>
                  {lastBill.description.split(" | ").map((part, index) => {
                    if (part.includes("ชำระแบบผสม")) {
                      const paymentInfo = part.replace("ชำระแบบผสม - ", "");
                      return <div key={index} style={{ lineHeight: "1.3" }}>{paymentInfo}</div>;
                    }
                    return null;
                  })}
                </div>
              )}
            </div>

            {/* รหัสลูกค้า */}
            {(lastBill?.Customer?.idcustomers || memberInfo?.idcustomers) && (
              <div style={{ fontSize: "10px", marginBottom: "6px", lineHeight: "1.3" }}>
                รหัสลูกค้า: {lastBill?.Customer?.idcustomers || memberInfo?.idcustomers}
              </div>
            )}

            <hr style={{ border: "none", borderTop: "1px dashed #000", margin: "6px 0" }} />

            {/* ข้อความท้าย */}
            <div style={{ 
              textAlign: "center", 
              marginTop: "8px", 
              fontSize: "10px",
              lineHeight: "1.3"
            }}>
              <p style={{ margin: "0" }}>ขอบคุณที่ใช้บริการ</p>
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}

export default Sale;
