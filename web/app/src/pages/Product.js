import Template from "../components/Template";
import Swal from "sweetalert2";
import config from "../config";
import axios from "axios";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "../components/Modal";
import Select from "react-select";

// การประกาศตัวแปร state สำหรับเก็บข้อมูลสินค้า
function Product() {
  const [product, setProduct] = useState({});
  const [products, setProducts] = useState([]);
  const [productImage, setProductImage] = useState({});
  const [productImages, setProductImages] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showProductModal, setShowProductModal] = useState(false);
  const [showProductImageModal, setShowProductImageModal] = useState(false);
  const [categories, setCategories] = useState([]);
  const [imagePreview, setImagePreview] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(30);
  const [formErrors, setFormErrors] = useState({});
  const navigate = useNavigate();

  // เรียกข้อมูลเมื่อคอมโพเนนต์ถูกโหลด
  useEffect(() => {
    fetchData();
    fetchCategories();
  }, []);

  // แก้ไขฟังก์ชันดึงข้อมูลสินค้า
  const fetchData = async () => {
    try {
      const res = await axios.get(
        config.api_path + "/product/list",
        config.headers()
      );
      if (res.data.message === "success") {
        // เพิ่มการเช็คว่ามีรูปภาพหลักหรือไม่
        const productsWithImageStatus = await Promise.all(
          res.data.results.map(async (product) => {
            const imageRes = await axios.get(
              config.api_path + "/productImage/list/" + product.id,
              config.headers()
            );
            const mainImage = imageRes.data.results.find((img) => img.isMain);
            return {
              ...product,
              mainImageUrl: mainImage
                ? `${config.api_path}${mainImage.imageUrl}`
                : null,
            };
          })
        );

        // เรียงลำดับตามชื่อสินค้าภาษาไทยเท่านั้น
        const collator = new Intl.Collator("th-TH", {
          numeric: true,
          caseFirst: "lower",
        });

        const sortedProducts = productsWithImageStatus.sort((a, b) => {
          return collator.compare(a.name, b.name);
        });

        setProducts(sortedProducts);
      }
    } catch (e) {
      Swal.fire({
        title: "Error",
        text: e.message,
        icon: "error",
      });
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await axios.get(
        config.api_path + "/category/list",
        config.headers()
      );
      if (res.data.message === "success") {
        setCategories(res.data.results);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const clearForm = () => {
    setProduct({
      name: "",
      detail: "",
      price: "",
      cost: "",
      barcode: "",
      category: "",
      originalBarcode: "",
    });
    setShowProductModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    // รีเซ็ต errors
    setFormErrors({});
    let errors = {};

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!product.barcode) {
      errors.barcode = "กรุณากรอกบาร์โค้ด";
    } else if (product.barcode.length !== 13) {
      errors.barcode = "บาร์โค้ดต้องมีความยาว 13 หลัก";
    }

    if (!product.name) {
      errors.name = "กรุณากรอกชื่อสินค้า";
    }

    if (!product.cost) {
      errors.cost = "กรุณากรอกราคาทุน";
    }

    if (!product.price) {
      errors.price = "กรุณากรอกราคาจำหน่าย";
    } else if (product.cost && parseFloat(product.price) < parseFloat(product.cost)) {
      errors.price = "ราคาจำหน่ายต้องไม่น้อยกว่าราคาทุน";
    }

    if (!product.category) {
      errors.category = "โปรดกรอกข้อมูลให้ครบถ้วน";
    }

    if (!product.units_of_measure) {
      errors.units_of_measure = "กรุณากรอกหน่วย";
    }

    // ถ้ามี errors ให้แสดงและไม่ส่งข้อมูล
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    // ตรวจสอบบาร์โค้ดซ้ำ
    if (product.barcode !== product.originalBarcode) {
      try {
        const res = await axios.get(
          config.api_path + "/product/checkBarcode/" + product.barcode,
          config.headers()
        );

        if (res.data.exists) {
          setFormErrors({ barcode: "บาร์โค้ดนี้มีอยู่ในระบบแล้ว กรุณาใช้บาร์โค้ดอื่น" });
          return;
        }
      } catch (error) {
        console.error("Error checking barcode:", error);
      }
    }

    // ดำเนินการบันทึกข้อมูล
    let url = config.api_path + "/product/insert";

    if (product.id !== undefined) {
      url = config.api_path + "/product/update";
    }

    try {
      const res = await axios.post(url, product, config.headers());
      if (res.data.message === "success") {
        Swal.fire({
          title: "บันทึกข้อมูล",
          text: "บันทึกข้อมูลสินค้าแล้ว",
          icon: "success",
          timer: 2000,
        });
        fetchData();
        handleClose();
      }
    } catch (e) {
      Swal.fire({
        title: "Error",
        text: e.message,
        icon: "error",
      });
    }
  };

  // ฟังก์ชันล้างข้อมูลโมดัลและรูปภาพตัวอย่าง
  const cleanupModalAndPreview = () => {
    setImagePreview(null);
    setProductImage({});
    setFormErrors({}); // รีเซ็ต form errors
  };

  // อัปเดตฟังก์ชันปิดโมดัลให้มีการล้างข้อมูล
  const handleClose = () => {
    cleanupModalAndPreview();
    setShowProductModal(false);
    setShowProductImageModal(false);
  };

  // ฟังก์ชันจัดการปิดโมดัลแต่ละประเภท
  const handleProductModalClose = () => {
    setShowProductModal(false);
    cleanupModalAndPreview();
  };

  const handleImageModalClose = () => {
    setShowProductImageModal(false);
    cleanupModalAndPreview();
  };

  const handleDelete = (item) => {
    Swal.fire({
      title: "ลบข้อมูล",
      text: `ยืนยันการลบ ${item.name || "รายการนี้"} จากรายการสินค้า`,
      icon: "warning",
      showConfirmButton: true,
      showCancelButton: true,

      cancelButtonText: "ยกเลิก",
      confirmButtonText: "ยืนยัน",

      confirmButtonColor: "#f44336", // Red color
      customClass: {
        confirmButton: "btn btn-danger mx-2 px-4",
        cancelButton: "btn btn-secondary mx-2 px-4",
      },
    }).then(async (res) => {
      if (res.isConfirmed) {
        try {
          const res = await axios.delete(
            config.api_path + "/product/delete/" + item.id,
            config.headers()
          );
          if (res.data.message === "success") {
            fetchData();
            Swal.fire({
              title: "ลบข้อมูล",
              text: "ลบข้อมูลแล้ว",
              icon: "success",
              timer: 2000,
            });
          }
        } catch (e) {
          Swal.fire({
            title: "Error",
            text: e.message,
            icon: "error",
          });
        }
      }
    });
  };

  const handleChangeFile = (files) => {
    if (files && files[0]) {
      const file = files[0];
      const maxSize = 10 * 1024 * 1024; // 10MB in bytes
      
      // ตรวจสอบขนาดไฟล์
      if (file.size > maxSize) {
        Swal.fire({
          title: "ไฟล์รูปภาพใหญ่เกินไป",
          text: "กรุณาเลือกไฟล์รูปภาพที่มีขนาดไม่เกิน 10MB",
          icon: "warning",
        });
        return;
      }
      
      // ตรวจสอบประเภทไฟล์
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        Swal.fire({
          title: "ประเภทไฟล์ไม่ถูกต้อง",
          text: "กรุณาเลือกไฟล์รูปภาพ (JPG, PNG, GIF เท่านั้น)",
          icon: "warning",
        });
        return;
      }
      
      setProductImage(file);
      // สร้าง URL สำหรับแสดงตัวอย่างรูปภาพ
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  // ล้าง URL ของรูปภาพตัวอย่างเมื่อคอมโพเนนต์ถูกยกเลิกหรือเมื่อเลือกภาพใหม่
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  // อัปเดตฟังก์ชันอัพโหลดให้แสดงข้อความกำลังอัปโหลด
  const handleUpload = async () => {
    if (!productImage || !productImage.name) {
      Swal.fire({
        title: "Error",
        text: "กรุณาเลือกไฟล์รูปภาพก่อนอัปโหลด",
        icon: "error",
      });
      return;
    }

    // ตรวจสอบขนาดไฟล์อีกครั้งก่อนอัปโหลด
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (productImage.size > maxSize) {
      Swal.fire({
        title: "ไฟล์รูปภาพใหญ่เกินไป",
        text: "กรุณาเลือกไฟล์รูปภาพที่มีขนาดไม่เกิน 10MB",
        icon: "warning",
      });
      return;
    }

    // แสดงข้อความกำลังอัปโหลด
    Swal.fire({
      title: "กำลังอัปโหลดรูป",
      text: "กรุณารอสักครู่...",
      icon: "info",
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      const formData = new FormData();
      formData.append("productImage", productImage);
      formData.append("productImageName", productImage.name);
      formData.append("productId", product.id);

      const res = await axios.post(
        config.api_path + "/productImage/insert",
        formData,
        {
          headers: {
            ...config.headers().headers,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (res.data.message === "success") {
        // ล้างข้อมูลการเลือกรูปก่อน
        cleanupModalAndPreview();

        // อัปเดตรูปภาพสินค้าในโมดัลทันที
        await fetchDataProductImage({ id: product.id });

        // ตั้งรูปที่อัปโหลดเป็น main image ทันที
        try {
          const imageListRes = await axios.get(
            config.api_path + "/productImage/list/" + product.id,
            config.headers()
          );
          
          if (imageListRes.data.message === "success" && imageListRes.data.results.length > 0) {
            // หารูปที่เพิ่งอัปโหลด (รูปล่าสุด)
            const latestImage = imageListRes.data.results[imageListRes.data.results.length - 1];
            
            // ตั้งเป็น main image
            const setMainRes = await axios.get(
              config.api_path + "/productImage/chooseMainImage/" + latestImage.id + "/" + product.id,
              config.headers()
            );
            
            if (setMainRes.data.message === "success") {
              // อัปเดตรูปภาพในโมดัลอีกครั้งหลังตั้งเป็น main
              await fetchDataProductImage({ id: product.id });
            }
          }
        } catch (error) {
          console.error("Error setting as main image:", error);
        }

        // อัปเดตรูปภาพในรายการสินค้าเฉพาะรายการนี้
        try {
          const imageRes = await axios.get(
            config.api_path + "/productImage/list/" + product.id,
            config.headers()
          );
          const mainImage = imageRes.data.results.find((img) => img.isMain);
          const newImageUrl = mainImage
            ? `${config.api_path}${mainImage.imageUrl}`
            : null;

          // อัปเดตสินค้าในรายการ
          setProducts((prevProducts) =>
            prevProducts.map((p) =>
              p.id === product.id ? { ...p, mainImageUrl: newImageUrl } : p
            )
          );
        } catch (error) {
          console.error("Error updating product image in list:", error);
        }

        // แสดงข้อความสำเร็จทันที
        Swal.fire({
          title: "อัปโหลดสำเร็จ",
          text: "อัปโหลดภาพสินค้าเรียบร้อยแล้วและตั้งเป็นภาพหลัก",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
      }
    } catch (e) {
      // ปิด loading แล้วแสดงข้อผิดพลาด
      Swal.fire({
        title: "Error",
        text: e.response?.data?.message || e.message,
        icon: "error",
      });
    }
  };

  const fetchDataProductImage = async (item) => {
    try {
      const res = await axios.get(
        config.api_path + "/productImage/list/" + item.id,
        config.headers()
      );
      if (res.data.message === "success") {
        res.data.results.forEach((img) => {});
        setProductImages(res.data.results);
      }
    } catch (e) {
      Swal.fire({
        title: "Error",
        text: e.message,
        icon: "error",
      });
    }
  };

  const handleChooseProduct = (item) => {
    setProduct({
      ...item,
      originalBarcode: item.barcode, // เก็บค่าบาร์โค้ดเดิมไว้
    });
    fetchDataProductImage(item);
  };

  const handleChooseMainImage = async (item) => {
    try {
      const url =
        config.api_path +
        "/productImage/chooseMainImage/" +
        item.id +
        "/" +
        item.productId;
      const res = await axios.get(url, config.headers());
      if (res.data.message === "success") {
        // อัปเดตรูปภาพในโมดัล
        fetchDataProductImage({ id: item.productId });

        // อัปเดตรูปภาพหลักในรายการสินค้าทันที
        try {
          const imageRes = await axios.get(
            config.api_path + "/productImage/list/" + item.productId,
            config.headers()
          );
          const mainImage = imageRes.data.results.find((img) => img.isMain);
          const newImageUrl = mainImage
            ? `${config.api_path}${mainImage.imageUrl}`
            : null;

          // อัปเดตสินค้าในรายการ
          setProducts((prevProducts) =>
            prevProducts.map((p) =>
              p.id === item.productId ? { ...p, mainImageUrl: newImageUrl } : p
            )
          );
        } catch (error) {
          console.error("Error updating main image in list:", error);
        }

        Swal.fire({
          title: "เลือกภาพหลัก",
          text: "บันทึกการเลือกภาพหลักของสินค้าแล้ว",
          icon: "success",
          timer: 2000,
        });
      }
    } catch (e) {
      Swal.fire({
        title: "Error",
        text: e.message,
        icon: "error",
      });
    }
  };

  const handleDeleteProductImage = (item) => {
    Swal.fire({
      title: "ลบภาพสินค้า",
      text: "ยืนยันการลบภาพสินค้าออกจากระบบ",
      icon: "warning",
      showCancelButton: true,
      showConfirmButton: true,
      cancelButtonText: "ยกเลิก",
      confirmButtonText: "ยืนยัน",

      confirmButtonColor: "#f44336", // Red color
    }).then(async (res) => {
      if (res.isConfirmed) {
        try {
          const res = await axios.delete(
            config.api_path + "/productImage/delete/" + item.id,
            config.headers()
          );
          if (res.data.message === "success") {
            // อัปเดตรูปภาพในโมดัล
            fetchDataProductImage({ id: item.productId });

            // อัปเดตรูปภาพในรายการสินค้าทันที
            try {
              const imageRes = await axios.get(
                config.api_path + "/productImage/list/" + item.productId,
                config.headers()
              );
              const mainImage = imageRes.data.results.find((img) => img.isMain);
              const newImageUrl = mainImage
                ? `${config.api_path}${mainImage.imageUrl}`
                : null;

              // อัปเดตสินค้าในรายการ
              setProducts((prevProducts) =>
                prevProducts.map((p) =>
                  p.id === item.productId
                    ? { ...p, mainImageUrl: newImageUrl }
                    : p
                )
              );
            } catch (error) {
              console.error(
                "Error updating product image after delete:",
                error
              );
            }

            Swal.fire({
              title: "ลบภาพสินค้า",
              text: "ลบภาพสินค้าออกจากระบบแล้ว",
              icon: "success",
              timer: 2000,
            });
          }
        } catch (e) {
          Swal.fire({
            title: "Error",
            text: e.message,
            icon: "error",
          });
        }
      }
    });
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // รีเซ็ตไปหน้าแรกเมื่อค้นหา
  };

  // เพิ่มฟังก์ชันตรวจสอบบาร์โค้ด
  const handleBarcodeChange = async (e) => {
    const value = e.target.value;
    // อนุญาตให้กรอกได้เฉพาะตัวเลขและความยาวไม่เกิน 13 หลัก
    if (/^\d{0,13}$/.test(value)) {
      setProduct({ ...product, barcode: value });
      
      // ลบ error เมื่อกรอกข้อมูล
      if (formErrors.barcode) {
        setFormErrors({ ...formErrors, barcode: undefined });
      }

      // ตรวจสอบเมื่อกรอกครบ 13 หลัก
      if (value.length === 13 && value !== product.originalBarcode) {
        try {
          const res = await axios.get(
            config.api_path + "/product/checkBarcode/" + value,
            config.headers()
          );

          if (res.data.exists) {
            setFormErrors({ ...formErrors, barcode: "บาร์โค้ดนี้มีอยู่ในระบบแล้ว กรุณาใช้บาร์โค้ดอื่น" });
          }
        } catch (error) {
          console.error("Error checking barcode:", error);
        }
      }
    }
  };

  // ฟังก์ชันสร้างบาร์โค้ดอัตโนมัติ
  const generateBarcode = () => {
    // สร้างเลข 13 หลักโดยสุ่ม (12 หลักแรก + check digit)
    const generateRandomDigits = () => {
      let digits = "";
      for (let i = 0; i < 12; i++) {
        digits += Math.floor(Math.random() * 10);
      }

      // คำนวณ check digit (ตามมาตรฐาน EAN-13)
      let sum = 0;
      for (let i = 0; i < 12; i++) {
        sum += parseInt(digits[i]) * (i % 2 === 0 ? 1 : 3);
      }
      const checkDigit = (10 - (sum % 10)) % 10;

      return digits + checkDigit;
    };

    // ตรวจสอบบาร์โค้ดที่สร้าง
    const checkAndSetBarcode = async () => {
      const newBarcode = generateRandomDigits();

      try {
        const res = await axios.get(
          config.api_path + "/product/checkBarcode/" + newBarcode,
          config.headers()
        );

        if (res.data.exists) {
          // ถ้าซ้ำ ให้สร้างใหม่
          checkAndSetBarcode();
        } else {
          // ถ้าไม่ซ้ำ ให้กำหนดค่า
          setProduct({ ...product, barcode: newBarcode });
          Swal.fire({
            title: "สร้างบาร์โค้ดสำเร็จ",
            text: "ระบบได้สร้างบาร์โค้ดใหม่ให้คุณแล้ว",
            icon: "success",
            timer: 1500,
          });
        }
      } catch (error) {
        console.error("Error checking barcode:", error);
        // หากเกิดข้อผิดพลาดในการตรวจสอบ ให้ใช้บาร์โค้ดนั้นไปก่อน
        setProduct({ ...product, barcode: newBarcode });
      }
    };

    checkAndSetBarcode();
  };

  const handlePrintBarcode = (barcodeValue) => {
    // เปิดหน้าต่างใหม่สำหรับพิมพ์บาร์โค้ด
    const printWindow = window.open("", "_blank", "width=600,height=400");

    printWindow.document.write(`
      <html>
      <head>
        <title>Print Barcode</title>
        <style>
          body { text-align: center; margin-top: 50px; font-family: "Kanit", sans-serif; }
          .barcode-contaistyle display: inline-block; }
        </style>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
      </head>
      <body>
        <div class="barcode-container">
          <svg id="barcode"></svg>
        </div>
        <script>
          window.onload = function() {
            JsBarcode("#barcode", "${barcodeValue}", {
              width: 2, 
              height: 57, 
              displayValue: true
            });
            setTimeout(() => window.print(), 500);
          }
        </script>
      </body>
      </html>
    `);

    printWindow.document.write(
      `<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>`
    );
    printWindow.document.write("<script>renderBarcode();</script>");
    printWindow.document.close();
  };

  const handleCategoryManagement = () => {
    navigate("/category");
  };

  return (
    <>
      <Template>
        <div className="card shadow-sm border-0">
          <div className="card-header bg-primary text-white py-3">
            <h4 className="card-title mb-0 font-weight-bold">สินค้า</h4>
          </div>
          <div className="card-body bg-light">
            <div className="d-flex flex-wrap align-items-center mb-4 gap-2">
              <button
                onClick={clearForm}
                className="btn btn-primary d-flex align-items-center shadow-sm"
                style={{
                  borderRadius: 20,
                  fontWeight: 500,
                  padding: "8px 20px",
                }}
              >
                <i className="fa fa-plus mr-2"></i> เพิ่มสินค้า
              </button>
              <button
                onClick={handleCategoryManagement}
                className="btn btn-outline-primary d-flex align-items-center shadow-sm"
                style={{
                  borderRadius: 20,
                  fontWeight: 500,
                  padding: "8px 20px",
                }}
              >
                <i className="fa fa-tags mr-2"></i> จัดการหมวดหมู่
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
                    placeholder="ค้นหาสินค้า"
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
                      ลำดับ/รูป
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
                      ชื่อสินค้า
                    </th>
                    <th
                      className="py-3 text-right"
                      style={{
                        fontFamily: "Kanit, sans-serif",
                        fontWeight: 600,
                      }}
                    >
                      ราคาทุน
                    </th>
                    <th
                      className="py-3 text-right"
                      style={{
                        fontFamily: "Kanit, sans-serif",
                        fontWeight: 600,
                      }}
                    >
                      ราคาขาย
                    </th>
                    <th
                      className="py-3"
                      style={{
                        fontFamily: "Kanit, sans-serif",
                        fontWeight: 600,
                      }}
                    >
                      ประเภท
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
                      className="py-3"
                      width="200px"
                      style={{
                        fontFamily: "Kanit, sans-serif",
                        fontWeight: 600,
                      }}
                    >
                      จัดการ
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {products.length > 0 ? (
                    (() => {
                      const filteredProducts = products.filter(
                        (item) =>
                          item.name.includes(searchTerm) ||
                          item.barcode.includes(searchTerm) ||
                          item.category.includes(searchTerm)
                      );

                      // คำนวณ pagination
                      const startIndex = (currentPage - 1) * itemsPerPage;
                      const endIndex = startIndex + itemsPerPage;
                      const currentItems = filteredProducts.slice(
                        startIndex,
                        endIndex
                      );

                      if (currentItems.length === 0) {
                        return (
                          <tr>
                            <td
                              colSpan="8"
                              className="text-center text-muted py-4"
                            >
                              <i className="fa fa-search mb-2 fa-2x"></i>
                              <p>ไม่พบสินค้าที่ค้นหา</p>
                            </td>
                          </tr>
                        );
                      }

                      // แสดงสินค้าทั้งหมดโดยไม่จัดกลุ่มตามหมวดหมู่
                      return currentItems.map((item, index) => {
                        const displayIndex = startIndex + index + 1;

                        return (
                          <tr key={item.id} className="align-middle">
                            <td className="py-2 text-center">
                              <span
                                className="badge badge-secondary mr-2"
                                style={{ fontSize: "12px" }}
                              >
                                {displayIndex}
                              </span>
                              {item.mainImageUrl ? (
                                <img
                                  src={item.mainImageUrl}
                                  alt="รูปหลัก"
                                  style={{
                                    width: 80,
                                    height: 80,
                                    objectFit: "cover",
                                    borderRadius: 12,
                                    border: "2px solid #e3e6ed",
                                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                                  }}
                                  onError={(e) => {
                                    e.target.src =
                                      "https://via.placeholder.com/80x80?text=No+Image";
                                  }}
                                />
                              ) : (
                                <span
                                  className="badge badge-light border"
                                  style={{ color: "#888", fontSize: 13 }}
                                >
                                  <i className="fa fa-image mr-1"></i> ไม่มีรูป
                                </span>
                              )}
                            </td>
                            <td className="py-2">{item.barcode}</td>
                            <td className="py-2 ">{item.name}</td>
                            <td className="py-2 text-right">
                              {parseInt(item.cost).toLocaleString("th-TH")} ฿
                            </td>
                            <td className="py-2 text-right">
                              {parseInt(item.price).toLocaleString("th-TH")} ฿
                            </td>
                            <td className="py-2">
                              <span className=" px-3 py-2">
                                {item.category}
                              </span>
                            </td>
                            <td className="py-2">
                              <span className="">{item.units_of_measure}</span>
                            </td>
                            <td className="text-center py-2">
                              <div className="btn-group">
                                <button
                                  onClick={() => {
                                    handleChooseProduct(item);
                                    setShowProductImageModal(true);
                                  }}
                                  className="btn btn-primary btn-sm mr-1"
                                  title="จัดการรูปภาพ"
                                >
                                  <i className="fa fa-image"></i>
                                </button>
                                <button
                                  onClick={() => {
                                    setProduct({
                                      ...item,
                                      originalBarcode: item.barcode, // เก็บค่าบาร์โค้ดเดิมไว้
                                    });
                                    setShowProductModal(true);
                                  }}
                                  className="btn btn-info btn-sm mr-1"
                                  title="แก้ไข"
                                >
                                  <i className="fa fa-pencil"></i>
                                </button>
                                <button
                                  onClick={() => handleDelete(item)}
                                  className="btn btn-danger btn-sm mr-1"
                                  title="ลบ"
                                >
                                  <i className="fa fa-trash"></i>
                                </button>
                                <button
                                  onClick={() =>
                                    handlePrintBarcode(item.barcode)
                                  }
                                  className="btn btn-secondary btn-sm"
                                  title="พิมพ์บาร์โค้ด"
                                >
                                  <i className="fa fa-print"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })()
                  ) : (
                    <tr>
                      <td colSpan="8" className="text-center text-muted py-4">
                        <i className="fa fa-box-open mb-2 fa-2x"></i>
                        <p>ไม่พบสินค้า</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* แสดงข้อมูลจำนวนรายการและ Pagination */}
            {(() => {
              const filteredProducts = products.filter(
                (item) =>
                  item.name.includes(searchTerm) ||
                  item.barcode.includes(searchTerm) ||
                  item.category.includes(searchTerm)
              );

              const totalItems = filteredProducts.length;
              const totalPages = Math.ceil(totalItems / itemsPerPage);
              const startIndex = (currentPage - 1) * itemsPerPage;
              const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

              return totalItems > 0 ? (
                <div className="d-flex justify-content-between align-items-center mt-4">
                  <div className="text-muted">
                    <small>
                      แสดงรายการที่ {startIndex + 1} - {endIndex} จากทั้งหมด{" "}
                      {totalItems} รายการ
                    </small>
                  </div>

                  {totalPages > 1 && (
                    <nav aria-label="Product pagination">
                      <ul className="pagination pagination-sm mb-0">
                        <li
                          className={`page-item ${
                            currentPage === 1 ? "disabled" : ""
                          }`}
                        >
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
                              <button
                                className="page-link"
                                onClick={() => setCurrentPage(1)}
                              >
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
                        {Array.from(
                          { length: Math.min(5, totalPages) },
                          (_, i) => {
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

                            if (pageNum < 1 || pageNum > totalPages)
                              return null;

                            return (
                              <li
                                key={pageNum}
                                className={`page-item ${
                                  currentPage === pageNum ? "active" : ""
                                }`}
                              >
                                <button
                                  className="page-link"
                                  onClick={() => setCurrentPage(pageNum)}
                                >
                                  {pageNum}
                                </button>
                              </li>
                            );
                          }
                        )}

                        {/* แสดงหน้าสุดท้าย */}
                        {currentPage < totalPages - 2 && (
                          <>
                            {currentPage < totalPages - 3 && (
                              <li className="page-item disabled">
                                <span className="page-link">...</span>
                              </li>
                            )}
                            <li className="page-item">
                              <button
                                className="page-link"
                                onClick={() => setCurrentPage(totalPages)}
                              >
                                {totalPages}
                              </button>
                            </li>
                          </>
                        )}

                        <li
                          className={`page-item ${
                            currentPage === totalPages ? "disabled" : ""
                          }`}
                        >
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
          @import url("https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&display=swap");

          body,
          .card,
          .btn,
          .form-control,
          .table,
          input,
          select,
          textarea,
          label,
          .modal,
          .modal-header,
          .modal-body,
          .modal-footer,
          .form-group,
          .input-group,
          .custom-file-label,
          .alert,
          .badge,
          .dropdown-menu,
          .pagination,
          .nav,
          .breadcrumb {
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
        `}</style>

        {/* โมดัลรูปภาพสินค้า */}
        <Modal
          show={showProductImageModal}
          onHide={handleImageModalClose}
          title="ภาพสินค้า"
          modalSize="modal-lg"
        >
          <div className="row">
            <div className="col-4">
              <div>Barcode</div>
              <input
                value={product.barcode}
                disabled
                className="form-control shadow-sm"
              />
            </div>
            <div className="col-8">
              <div>ชื่อสินค้า</div>
              <input
                value={product.name}
                disabled
                className="form-control shadow-sm"
              />
            </div>

            <div className="col-12 mt-3">
              {/* แสดงช่องเลือกรูปเฉพาะเมื่อไม่มีรูปภาพ */}
              {productImages.length === 0 && (
                <div className="form-group">
                  <label>เลือกภาพสินค้า</label>
                  <div className="custom-file">
                    <input
                      type="file"
                      className="custom-file-input"
                      id="productImageInput"
                      accept="image/*"
                      onChange={(e) => handleChangeFile(e.target.files)}
                    />
                    <label
                      className="custom-file-label"
                      htmlFor="productImageInput"
                    >
                      {productImage.name || "เลือกไฟล์รูปภาพ..."}
                    </label>
                  </div>
                </div>
              )}

              {/* ข้อความแจ้งเตือนเมื่อมีรูปแล้ว */}
              {productImages.length > 0 && (
                <div className="alert alert-info">
                  <i className="fa fa-info-circle mr-2"></i>
                  สินค้านี้มีรูปภาพแล้ว หากต้องการเปลี่ยนรูป
                  กรุณาลบรูปภาพเดิมก่อน
                </div>
              )}

              {/* แสดงตัวอย่างรูปภาพที่เลือก (เฉพาะเมื่อไม่มีรูปในระบบ) */}
              {imagePreview && productImages.length === 0 && (
                <div className="mt-3">
                  <label>ตัวอย่างรูปภาพ</label>
                  <div className="image-preview-container border rounded p-2">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="img-fluid"
                      style={{ maxHeight: "200px", objectFit: "contain" }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-3">
              {/* แสดงปุ่มอัปโหลดเฉพาะเมื่อไม่มีรูปในระบบและมีรูปตัวอย่าง */}
              {productImage.name !== undefined &&
                imagePreview &&
                productImages.length === 0 && (
                  <div className="d-flex justify-content-start">
                    <button
                      onClick={handleUpload}
                      className="btn btn-primary shadow-sm"
                    >
                      <i className="fa fa-cloud-upload mr-2"></i> อัปโหลดรูปภาพ
                    </button>
                  </div>
                )}
            </div>

            <div className="mt-3">ภาพสินค้า</div>
            <div className="row mt-2">
              {productImages.length > 0 ? (
                productImages.map((item) => {
                  return (
                    <div className="col-3" key={item.id}>
                      <div className="card shadow-sm border-0">
                        <img
                          className="card-img-top"
                          src={
                            item.imageUrl
                              ? `${config.api_path}${item.imageUrl}`
                              : "https://via.placeholder.com/300x200?text=No+Image"
                          }
                          width="100%"
                          alt=""
                          onError={(e) => {
                            e.target.src =
                              "https://via.placeholder.com/300x200?text=No+Image";
                          }}
                          onLoad={() => {}}
                        />
                        <div className="card-body text-center">
                          <button
                            onClick={() => handleDeleteProductImage(item)}
                            className="btn btn-danger btn-sm shadow-sm mr-2"
                          >
                            <i className="fa fa-times"></i>
                          </button>
                          {item.isMain ? (
                            <button className="btn btn-success btn-sm mr-2 shadow-sm ">
                              ภาพหลัก
                            </button>
                          ) : (
                            <button
                              onClick={() => handleChooseMainImage(item)}
                              className="btn btn-outline-secondary btn-sm mr-2 shadow-sm"
                            >
                              ภาพหลัก
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-12 text-center text-muted">
                  ไม่มีภาพสินค้า
                </div>
              )}
            </div>
          </div>
        </Modal>

        {/* โมดัลข้อมูลสินค้า */}
        <Modal
          show={showProductModal}
          onHide={handleProductModalClose}
          title="ฟอร์มสินค้า"
        >
          <form onSubmit={handleSave}>
            <div className="row">
              <div className="form-group col-md-12 ">
                <label>
                  ชื่อสินค้า <span className="text-danger">*</span>
                </label>
                <input
                  value={product.name || ""}
                  onChange={(e) => {
                    setProduct({ ...product, name: e.target.value });
                    // ลบ error เมื่อกรอกข้อมูล
                    if (formErrors.name) {
                      setFormErrors({ ...formErrors, name: undefined });
                    }
                  }}
                  type="text"
                  className="form-control shadow-sm"
                  style={{
                    borderColor: formErrors.name ? '#dc3545' : '#ced4da',
                    boxShadow: formErrors.name ? '0 0 0 0.2rem rgba(220, 53, 69, 0.25)' : 'none',
                  }}
                  required
                />
                {formErrors.name && (
                  <div className="mt-1" style={{ color: '#dc3545', fontSize: '14px', display: 'flex', alignItems: 'center' }}>
                    <i className="fa fa-exclamation-triangle mr-1" style={{ color: '#dc3545' }}></i>
                    {formErrors.name}
                  </div>
                )}
              </div>

              <div className="form-group col-md-6">
                <label>
                  ราคาทุน <span className="text-danger">*</span>
                </label>
                <input
                  value={product.cost || ""}
                  onChange={(e) => {
                    setProduct({ ...product, cost: e.target.value });
                    // ลบ error เมื่อกรอกข้อมูล
                    if (formErrors.cost) {
                      setFormErrors({ ...formErrors, cost: undefined });
                    }
                  }}
                  type="number"
                  className="form-control shadow-sm"
                  style={{
                    borderColor: formErrors.cost ? '#dc3545' : '#ced4da',
                    boxShadow: formErrors.cost ? '0 0 0 0.2rem rgba(220, 53, 69, 0.25)' : 'none',
                  }}
                  required
                  min="0"
                />
                {formErrors.cost && (
                  <div className="mt-1" style={{ color: '#dc3545', fontSize: '14px', display: 'flex', alignItems: 'center' }}>
                    <i className="fa fa-exclamation-triangle mr-1" style={{ color: '#dc3545' }}></i>
                    {formErrors.cost}
                  </div>
                )}
              </div>
              <div className="form-group col-md-6">
                <label>
                  ราคาจำหน่าย <span className="text-danger">*</span>
                </label>
                <input
                  value={product.price || ""}
                  onChange={(e) => {
                    const newPrice = e.target.value;
                    setProduct({ ...product, price: newPrice });
                    
                    // ลบ error เมื่อกรอกข้อมูล
                    if (formErrors.price) {
                      setFormErrors({ ...formErrors, price: undefined });
                    }
                  }}
                  type="number"
                  className="form-control shadow-sm"
                  style={{
                    borderColor: formErrors.price ? '#dc3545' : '#ced4da',
                    boxShadow: formErrors.price ? '0 0 0 0.2rem rgba(220, 53, 69, 0.25)' : 'none',
                  }}
                  required
                  min="0"
                  step="0.01"
                />
                {formErrors.price ? (
                  <div className="mt-1" style={{ color: '#dc3545', fontSize: '14px', display: 'flex', alignItems: 'center' }}>
                    <i className="fa fa-exclamation-triangle mr-1" style={{ color: '#dc3545' }}></i>
                    {formErrors.price}
                  </div>
                ) : (
                  product.cost &&
                  product.price &&
                  parseFloat(product.price) < parseFloat(product.cost) && (
                    <small className="text-danger">
                      <i className="fa fa-exclamation-triangle me-1"></i>
                      ราคาจำหน่ายต้องไม่น้อยกว่าราคาทุน (
                      {parseFloat(product.cost).toLocaleString("th-TH")} บาท)
                    </small>
                  )
                )}
              </div>

              <div className="form-group col-md-8">
                <label>
                  ประเภทสินค้า <span className="text-danger">*</span>
                </label>
                <div className="d-flex">
                  <div style={{ flex: 1, position: "relative" }}>
                    <Select
                      value={
                        product.category
                          ? { value: product.category, label: product.category }
                          : null
                      }
                      onChange={(selectedOption) => {
                        setProduct({
                          ...product,
                          category: selectedOption.value,
                        });
                        // ลบ error เมื่อเลือกประเภทสินค้า
                        if (formErrors.category) {
                          setFormErrors({ ...formErrors, category: undefined });
                        }
                      }}
                      options={categories.map((cat) => ({
                        value: cat.name,
                        label: cat.name,
                      }))}
                      placeholder="เลือกประเภทสินค้า"
                      className="basic-single"
                      classNamePrefix="select"
                      isClearable={false}
                      isSearchable={true}
                      styles={{
                        control: (baseStyles, state) => ({
                          ...baseStyles,
                          minHeight: "38px",
                          borderTopRightRadius: 0,
                          borderBottomRightRadius: 0,
                          borderRight: 0,
                          borderColor: formErrors.category ? '#dc3545' : (state.isFocused ? '#80bdff' : '#ced4da'),
                          boxShadow: formErrors.category 
                            ? '0 0 0 0.2rem rgba(220, 53, 69, 0.25)' 
                            : (state.isFocused ? '0 0 0 0.2rem rgba(0, 123, 255, 0.25)' : 'none'),
                          '&:hover': {
                            borderColor: formErrors.category ? '#dc3545' : '#80bdff',
                          }
                        }),
                        container: (baseStyles) => ({
                          ...baseStyles,
                          width: "100%",
                        }),
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    className={`btn btn-outline-secondary ${formErrors.category ? 'border-danger' : ''}`}
                    onClick={handleCategoryManagement}
                    title="จัดการหมวดหมู่"
                    style={{
                      height: 38,
                      display: "flex",
                      alignItems: "center",
                      borderTopLeftRadius: 0,
                      borderBottomLeftRadius: 0,
                      borderLeft: "1px solid #ced4da",
                      borderColor: formErrors.category ? '#dc3545' : '#ced4da',
                    }}
                  >
                    <i className="fa fa-cog"></i>
                  </button>
                </div>
                {formErrors.category && (
                  <div className="mt-1" style={{ color: '#dc3545', fontSize: '14px', display: 'flex', alignItems: 'center' }}>
                    <i className="fa fa-exclamation-triangle mr-1" style={{ color: '#dc3545' }}></i>
                    {formErrors.category}
                  </div>
                )}
              </div>
              <div className="form-group col-md-4">
                <label>
                  หน่วย <span className="text-danger">*</span>
                </label>
                <div className="d-flex">
                  <input
                    value={product.units_of_measure || ""}
                    onChange={(e) => {
                      setProduct({
                        ...product,
                        units_of_measure: e.target.value,
                      });
                      // ลบ error เมื่อกรอกข้อมูล
                      if (formErrors.units_of_measure) {
                        setFormErrors({ ...formErrors, units_of_measure: undefined });
                      }
                    }}
                    type="text"
                    className="form-control shadow-sm"
                    style={{
                      borderColor: formErrors.units_of_measure ? '#dc3545' : '#ced4da',
                      boxShadow: formErrors.units_of_measure ? '0 0 0 0.2rem rgba(220, 53, 69, 0.25)' : 'none',
                    }}
                    required
                    placeholder=" ชิ้น, แพ็ค, ลิตร"
                  />
                </div>
                {formErrors.units_of_measure && (
                  <div className="mt-1" style={{ color: '#dc3545', fontSize: '14px', display: 'flex', alignItems: 'center' }}>
                    <i className="fa fa-exclamation-triangle mr-1" style={{ color: '#dc3545' }}></i>
                    {formErrors.units_of_measure}
                  </div>
                )}
              </div>
              <div className="form-group col-md-12">
                <label>
                  บาร์โค้ด <span className="text-danger">*</span>
                </label>
                <div className="input-group">
                  <input
                    value={product.barcode || ""}
                    onChange={handleBarcodeChange}
                    type="text"
                    className="form-control shadow-sm"
                    style={{
                      borderColor: formErrors.barcode ? '#dc3545' : '#ced4da',
                      boxShadow: formErrors.barcode ? '0 0 0 0.2rem rgba(220, 53, 69, 0.25)' : 'none',
                    }}
                    required
                    maxLength="13"
                    pattern="\d{13}"
                    title="กรุณากรอกบาร์โค้ด 13 หลัก"
                    placeholder="กรอกบาร์โค้ด 13 หลัก"
                  />
                  <div className="input-group-append">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={generateBarcode}
                      title="สร้างบาร์โค้ดอัตโนมัติ"
                    >
                      <i className="fa fa-refresh"></i>
                    </button>
                  </div>
                </div>
                {formErrors.barcode ? (
                  <div className="mt-1" style={{ color: '#dc3545', fontSize: '14px', display: 'flex', alignItems: 'center' }}>
                    <i className="fa fa-exclamation-triangle mr-1" style={{ color: '#dc3545' }}></i>
                    {formErrors.barcode}
                  </div>
                ) : (
                  <small className="text-muted">
                    บาร์โค้ดต้องเป็นตัวเลข 13 หลัก (
                    {(product.barcode || "").length}/13)
                  </small>
                )}
              </div>
            </div>

            <div className="text-muted mb-3 ">
              <small ca>
                หมายเหตุ: ช่องที่มีเครื่องหมาย{" "}
                <span className="text-danger">*</span> จำเป็นต้องกรอก
              </small>
            </div>

            <div className="d-flex">
              <button type="submit" className="btn btn-success shadow-sm">
                <i className="fa fa-save mr-2"></i>บันทึก
              </button>
            </div>
          </form>
        </Modal>
      </Template>
    </>
  );
}

export default Product;
