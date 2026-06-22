import { Outlet } from "react-router-dom";
import Footer from "../components/shop/Footer";
import Header from "../components/shop/Header";

export default function ShopLayout() {
  return (
    <div className="min-h-screen bg-[#f7f9ff] text-[#091d2e]">
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
