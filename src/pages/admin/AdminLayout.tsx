import { Link, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Calendar,
  Bike,
  Package,
  Users,
  MapPin,
  Settings,
  LogOut,
  PackageCheck,
  Wrench,
  Tag,
  DollarSign,
} from "lucide-react";
import bolt91Logo from "@/assets/bolt91-logo.png";
import { supabase } from "@/integrations/supabase/client";

const AdminLayout = () => {
  const location = useLocation();
  const [adminTheme, setAdminTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Load admin theme from localStorage
    const savedTheme = localStorage.getItem('adminTheme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setAdminTheme(savedTheme);
    }

    // Listen for theme changes
    const handleThemeChange = () => {
      const updatedTheme = localStorage.getItem('adminTheme') as 'light' | 'dark' | null;
      if (updatedTheme) {
        setAdminTheme(updatedTheme);
      }
    };

    window.addEventListener('admin-theme-change', handleThemeChange);
    return () => window.removeEventListener('admin-theme-change', handleThemeChange);
  }, []);

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
    { icon: Calendar, label: "Bookings", path: "/admin/bookings" },
    { icon: Bike, label: "Cycles", path: "/admin/cycles" },
    { icon: Package, label: "Accessories", path: "/admin/accessories" },
    { icon: Users, label: "Customers", path: "/admin/users" },
    { icon: MapPin, label: "Partners", path: "/admin/partners" },
    { icon: MapPin, label: "Pickup Locations", path: "/admin/pickup-locations" },
    { icon: PackageCheck, label: "Cycle Returns", path: "/admin/cycle-return" },
    { icon: Wrench, label: "Maintenance", path: "/admin/maintenance" },
    { icon: Tag, label: "Coupons", path: "/admin/coupons" },
    { icon: DollarSign, label: "Pricing Plan", path: "/admin/pricing-plan" },
    { icon: Settings, label: "Settings", path: "/admin/settings" },
  ];

  return (
    <div className={`min-h-screen flex ${adminTheme}`}>
      {/* Sidebar - Hidden on mobile, visible on desktop */}
      <aside className="hidden lg:flex w-64 border-r border-border bg-card flex-col">
        <div className="p-6 border-b border-border">
          <img src={bolt91Logo} alt="Bolt91 Admin" className="h-10" />
          <p className="text-xs text-muted-foreground mt-2">Admin Panel</p>
        </div>

        <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Button
                key={item.path}
                asChild
                variant={isActive ? "default" : "ghost"}
                className={`w-full justify-start ${
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "text-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <Link to={item.path} className="flex items-center justify-between w-full">
                  <span className="flex items-center">
                    <item.icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </span>
                </Link>
              </Button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <Button variant="outline" className="w-full justify-start text-foreground hover:bg-accent" asChild>
            <Link to="/">
              <LogOut className="w-4 h-4 mr-2" />
              Back to Site
            </Link>
          </Button>
        </div>
      </aside>

      {/* Mobile Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
        <nav className="flex overflow-x-auto py-2 px-2 gap-1">
          {menuItems.slice(0, 6).map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center min-w-[60px] px-2 py-2 rounded-md transition-colors ${
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] mt-1 text-center">{item.label.split(' ')[0]}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-background pb-20 lg:pb-0">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
