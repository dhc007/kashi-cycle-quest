import { Link, Outlet, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Calendar, 
  Bike, 
  Package, 
  Users, 
  Settings,
  LogOut
} from "lucide-react";
import bolt91Logo from "@/assets/bolt91-logo.png";

const AdminLayout = () => {
  const location = useLocation();
  
  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
    { icon: Calendar, label: "Bookings", path: "/admin/bookings" },
    { icon: Bike, label: "Cycles", path: "/admin/cycles" },
    { icon: Package, label: "Accessories", path: "/admin/accessories" },
    { icon: Users, label: "Partners", path: "/admin/partners" },
    { icon: Settings, label: "Settings", path: "/admin/settings" },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card">
        <div className="p-6 border-b border-border">
          <img src={bolt91Logo} alt="Bolt91 Admin" className="h-10" />
          <p className="text-xs text-muted-foreground mt-2">Admin Panel</p>
        </div>
        
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Button
                key={item.path}
                asChild
                variant={isActive ? "default" : "ghost"}
                className={`w-full justify-start ${isActive ? 'bg-primary text-primary-foreground' : ''}`}
              >
                <Link to={item.path}>
                  <item.icon className="w-4 h-4 mr-2" />
                  {item.label}
                </Link>
              </Button>
            );
          })}
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <Button variant="outline" className="w-full justify-start" asChild>
            <Link to="/">
              <LogOut className="w-4 h-4 mr-2" />
              Back to Site
            </Link>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
