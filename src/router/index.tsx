import { Navigate, createBrowserRouter } from "react-router-dom";
import ProtectedRoute from "../components/common/ProtectedRoute";
import AdminLayout from "../layouts/AdminLayout";
import AuthLayout from "../layouts/AuthLayout";
import ShopLayout from "../layouts/ShopLayout";
import BannersAdminPage from "../pages/admin/BannersAdminPage";
import CategoriesAdminPage from "../pages/admin/CategoriesAdminPage";
import CouponsAdminPage from "../pages/admin/CouponsAdminPage";
import CustomerDetailPage from "../pages/admin/CustomerDetailPage";
import CustomersAdminPage from "../pages/admin/CustomersAdminPage";
import DashboardPage from "../pages/admin/DashboardPage";
import RevenueAdminPage from "../pages/admin/RevenueAdminPage";
import LoginPage from "../pages/admin/LoginPage";
import OrderDetailPage from "../pages/admin/OrderDetailPage";
import OrdersAdminPage from "../pages/admin/OrdersAdminPage";
import ProductFormPage from "../pages/admin/ProductFormPage";
import ProductsAdminPage from "../pages/admin/ProductsAdminPage";
import SettingsAdminPage from "../pages/admin/SettingsAdminPage";
import CartPage from "../pages/shop/CartPage";
import CheckoutPage from "../pages/shop/CheckoutPage";
import CustomPrintPage from "../pages/shop/CustomPrintPage";
import HomePage from "../pages/shop/HomePage";
import OrderSuccessPage from "../pages/shop/OrderSuccessPage";
import ProductDetailPage from "../pages/shop/ProductDetailPage";
import ProductsPage from "../pages/shop/ProductsPage";

export const router = createBrowserRouter([
  {
    element: <ShopLayout />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/san-pham", element: <ProductsPage /> },
      { path: "/san-pham/:slug", element: <ProductDetailPage /> },
      { path: "/gio-hang", element: <CartPage /> },
      { path: "/thanh-toan", element: <CheckoutPage /> },
      { path: "/dat-hang-thanh-cong", element: <OrderSuccessPage /> },
      { path: "/in-rieng", element: <CustomPrintPage /> },
    ],
  },
  {
    element: <AuthLayout />,
    children: [{ path: "/admin/dang-nhap", element: <LoginPage /> }],
  },
  {
    path: "/admin",
    element: <ProtectedRoute><AdminLayout /></ProtectedRoute>,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "doanh-thu", element: <RevenueAdminPage /> },
      { path: "san-pham", element: <ProductsAdminPage /> },
      { path: "san-pham/them", element: <ProductFormPage /> },
      { path: "san-pham/:id/sua", element: <ProductFormPage /> },
      { path: "danh-muc", element: <CategoriesAdminPage /> },
      { path: "don-hang", element: <OrdersAdminPage /> },
      { path: "don-hang/:code", element: <OrderDetailPage /> },
      { path: "khach-hang", element: <CustomersAdminPage /> },
      { path: "khach-hang/:phone", element: <CustomerDetailPage /> },
      { path: "ma-giam-gia", element: <CouponsAdminPage /> },
      { path: "banner", element: <BannersAdminPage /> },
      { path: "cai-dat", element: <SettingsAdminPage /> },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);

