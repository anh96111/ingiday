/* eslint-disable react-refresh/only-export-components */
import { lazy } from "react";
import { Navigate, createBrowserRouter } from "react-router-dom";

import ProtectedRoute from "../components/common/ProtectedRoute";
import { StoreDataProvider } from "../features/admin/StoreDataContext";

const AdminLayout = lazy(() => import("../layouts/AdminLayout"));
const AuthLayout = lazy(() => import("../layouts/AuthLayout"));
const ShopLayout = lazy(() => import("../layouts/ShopLayout"));

const BannersAdminPage = lazy(
  () => import("../pages/admin/BannersAdminPage"),
);
const CategoriesAdminPage = lazy(
  () => import("../pages/admin/CategoriesAdminPage"),
);
const CouponsAdminPage = lazy(
  () => import("../pages/admin/CouponsAdminPage"),
);
const CustomerDetailPage = lazy(
  () => import("../pages/admin/CustomerDetailPage"),
);
const CustomersAdminPage = lazy(
  () => import("../pages/admin/CustomersAdminPage"),
);
const DashboardPage = lazy(
  () => import("../pages/admin/DashboardPage"),
);
const LoginPage = lazy(() => import("../pages/admin/LoginPage"));
const OrderDetailPage = lazy(
  () => import("../pages/admin/OrderDetailPage"),
);
const OrdersAdminPage = lazy(
  () => import("../pages/admin/OrdersAdminPage"),
);
const ProductFormPage = lazy(
  () => import("../pages/admin/ProductFormPage"),
);
const ProductsAdminPage = lazy(
  () => import("../pages/admin/ProductsAdminPage"),
);
const RevenueAdminPage = lazy(
  () => import("../pages/admin/RevenueAdminPage"),
);
const SettingsAdminPage = lazy(
  () => import("../pages/admin/SettingsAdminPage"),
);

const CartPage = lazy(() => import("../pages/shop/CartPage"));
const CheckoutPage = lazy(
  () => import("../pages/shop/CheckoutPage"),
);
const CustomPrintPage = lazy(
  () => import("../pages/shop/CustomPrintPage"),
);
const HomePage = lazy(() => import("../pages/shop/HomePage"));
const OrderSuccessPage = lazy(
  () => import("../pages/shop/OrderSuccessPage"),
);
const ProductDetailPage = lazy(
  () => import("../pages/shop/ProductDetailPage"),
);
const ProductsPage = lazy(
  () => import("../pages/shop/ProductsPage"),
);

export const router = createBrowserRouter([
  {
    element: <ShopLayout />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/san-pham", element: <ProductsPage /> },
      {
        path: "/san-pham/:slug",
        element: <ProductDetailPage />,
      },
      { path: "/gio-hang", element: <CartPage /> },
      { path: "/thanh-toan", element: <CheckoutPage /> },
      {
        path: "/dat-hang-thanh-cong",
        element: <OrderSuccessPage />,
      },
      { path: "/in-rieng", element: <CustomPrintPage /> },
    ],
  },
  {
    element: <AuthLayout />,
    children: [
      {
        path: "/admin/dang-nhap",
        element: <LoginPage />,
      },
    ],
  },
  {
    path: "/admin",
    element: (
      <ProtectedRoute>
        <StoreDataProvider>
          <AdminLayout />
        </StoreDataProvider>
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      {
        path: "doanh-thu",
        element: <RevenueAdminPage />,
      },
      {
        path: "san-pham",
        element: <ProductsAdminPage />,
      },
      {
        path: "san-pham/them",
        element: <ProductFormPage />,
      },
      {
        path: "san-pham/:id/sua",
        element: <ProductFormPage />,
      },
      {
        path: "danh-muc",
        element: <CategoriesAdminPage />,
      },
      {
        path: "don-hang",
        element: <OrdersAdminPage />,
      },
      {
        path: "don-hang/:code",
        element: <OrderDetailPage />,
      },
      {
        path: "khach-hang",
        element: <CustomersAdminPage />,
      },
      {
        path: "khach-hang/:phone",
        element: <CustomerDetailPage />,
      },
      {
        path: "ma-giam-gia",
        element: <CouponsAdminPage />,
      },
      {
        path: "banner",
        element: <BannersAdminPage />,
      },
      {
        path: "cai-dat",
        element: <SettingsAdminPage />,
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);