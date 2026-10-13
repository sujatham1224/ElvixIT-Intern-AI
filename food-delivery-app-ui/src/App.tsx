import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { ListingPage } from "./pages/ListingPage";
import { MenuPage } from "./pages/MenuPage";
import { CartPage } from "./pages/CartPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { ConfirmationPage } from "./pages/ConfirmationPage";
import { OrdersPage } from "./pages/OrdersPage";
import { OrderDetailPage } from "./pages/OrderDetailPage";
import { NotFoundPage } from "./pages/NotFoundPage";

export default function App() {
  return <Routes><Route element={<Layout />}><Route index element={<HomePage />} /><Route path="restaurants" element={<ListingPage />} /><Route path="restaurants/:restaurantId" element={<MenuPage />} /><Route path="cart" element={<CartPage />} /><Route path="checkout" element={<CheckoutPage />} /><Route path="confirmation" element={<ConfirmationPage />} /><Route path="orders" element={<OrdersPage />} /><Route path="orders/:reference" element={<OrderDetailPage />} /><Route path="*" element={<NotFoundPage />} /></Route></Routes>;
}
