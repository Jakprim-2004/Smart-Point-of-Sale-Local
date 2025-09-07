// components/Barcode.js
import React, { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

const Barcode = ({ value, width = 1, height = 10 }) => {
  const barcodeRef = useRef(null);

  useEffect(() => {
    if (barcodeRef.current && value) {
      try {
        JsBarcode(barcodeRef.current, value, {
          format: "CODE128",
          displayValue: true,
          width: width,
          height: height,
        });
      } catch (error) {
        console.error("Barcode generation error:", error);
      }
    }
  }, [value, width, height]);

  // Only render SVG if value exists
  return value ? <svg ref={barcodeRef}></svg> : null;
};

export default Barcode;