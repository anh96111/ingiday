import { RouterProvider } from "react-router-dom";
import { AdminAuthProvider } from "./features/admin/AdminAuthContext";
import { StoreDataProvider } from "./features/admin/StoreDataContext";
import { BannersProvider } from "./features/banners/BannersContext";
import { CartProvider } from "./features/cart/CartContext";
import { CouponsProvider } from "./features/coupons/CouponsContext";
import { CustomersProvider } from "./features/customers/CustomersContext";
import { OrdersProvider } from "./features/orders/OrdersContext";
import { SettingsProvider } from "./features/settings/SettingsContext";
import { router } from "./router";

export default function App() {
  return (
    <AdminAuthProvider>
      <StoreDataProvider>
        <SettingsProvider>
          <CouponsProvider>
            <BannersProvider>
              <OrdersProvider>
                <CustomersProvider>
                  <CartProvider>
                    <RouterProvider router={router} />
                  </CartProvider>
                </CustomersProvider>
              </OrdersProvider>
            </BannersProvider>
          </CouponsProvider>
        </SettingsProvider>
      </StoreDataProvider>
    </AdminAuthProvider>
  );
}
