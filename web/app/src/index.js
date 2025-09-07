import React from "react";
import ReactDOM from "react-dom/client";
import reportWebVitals from "./reportWebVitals";
import Register from "./pages/Register"; 


import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Login from "./pages/Login";
import Product from "./pages/Product";
import Sale from "./pages/Sale";
import BillSales from "./pages/BillSales";
import Stock from "./pages/Stock";
import ReportStock from "./pages/ReportStock";
import Dashboard from "./pages/Dashboard";
import Customer from "./pages/Customer";
import Reward from "./pages/Reward";
import Category from "./pages/Category";
import LoginCustomer from "./pages/LoginCustomer";
import DetailCustomer from "./pages/DetailCustomer";
import PointHistory from "./pages/PointHistory";
import AuthGuard from "./components/AuthGuard";

// Import tokenManager เพื่อ initialize
import './utils/tokenManager';

const router = createBrowserRouter([
  {
    path: "/",
    element: <Login />,
  },
  {
    path: "/login", 
    element: <Login />,
  },
 {
    path: "/Register",
    element: <Register />,
 },
  {
    path: "/product",
    element: <AuthGuard><Product /></AuthGuard>,
  },
  {
    path: "/sale",
    element: <AuthGuard><Sale /></AuthGuard>,
  },
  {
    path: "/billSales",
    element: <AuthGuard><BillSales /></AuthGuard>,
  },
  {
    path: "/stock",
    element: <AuthGuard><Stock /></AuthGuard>,
  },
  {
    path: "/reportStock",
    element: <AuthGuard><ReportStock /></AuthGuard>,
  },
  {
    path: "/dashboard",
    element: <AuthGuard><Dashboard /></AuthGuard>,
  },
  
  {
    path: "/customer",
    element: <AuthGuard><Customer /></AuthGuard>,
  },{
    path: "/reward",
    element: <AuthGuard><Reward /></AuthGuard>,
  },{
    path: "/category",
    element: <AuthGuard><Category /></AuthGuard>,
  },{
    path: "/login/customer",
    element: <LoginCustomer />,
  },{
    path: "/DetailCustomer",
    element: <DetailCustomer />,
  },{
    path: "/PointHistory",
    element: <PointHistory />,
  }
]);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<RouterProvider router={router} />);

reportWebVitals();
