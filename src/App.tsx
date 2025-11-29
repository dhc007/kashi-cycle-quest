import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Book from "./pages/Book";
import Payment from "./pages/Payment";
import Confirmation from "./pages/Confirmation";
import AdminLogin from "./pages/admin/Login";
import AdminLayout from "./pages/admin/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import Bookings from "./pages/admin/Bookings";
import Cycles from "./pages/admin/Cycles";
import Accessories from "./pages/admin/Accessories";
import Partners from "./pages/admin/Partners";
import PickupLocations from "./pages/admin/PickupLocations";
import AdminSettings from "./pages/admin/AdminSettings";
import PricingPlan from "./pages/admin/PricingPlan";
import Users from "./pages/admin/Users";
import CycleReturn from "./pages/admin/CycleReturn";
import Maintenance from "./pages/admin/Maintenance";
import Coupons from "./pages/admin/Coupons";
import NotFound from "./pages/NotFound";
import Signup from "./pages/Signup";
import BookingHistory from "./pages/BookingHistory";
import ManageBooking from "./pages/ManageBooking";
import PaymentCallback from "./pages/PaymentCallback";
import UserLogin from "./pages/UserLogin";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<UserLogin />} />
          <Route path="/home" element={<Home />} />
          <Route path="/book" element={<Book />} />
          <Route path="/payment" element={<Payment />} />
          <Route path="/payment-callback" element={<PaymentCallback />} />
          <Route path="/confirmation" element={<Confirmation />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/user-login" element={<UserLogin />} />
          <Route path="/bookings" element={<BookingHistory />} />
          <Route path="/manage-booking" element={<ManageBooking />} />
          
          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="bookings" element={<Bookings />} />
            <Route path="cycles" element={<Cycles />} />
            <Route path="accessories" element={<Accessories />} />
            <Route path="partners" element={<Partners />} />
            <Route path="pickup-locations" element={<PickupLocations />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="users" element={<Users />} />
            <Route path="cycle-return" element={<CycleReturn />} />
            <Route path="maintenance" element={<Maintenance />} />
            <Route path="coupons" element={<Coupons />} />
            <Route path="pricing-plan" element={<PricingPlan />} />
          </Route>

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
