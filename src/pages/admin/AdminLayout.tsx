import { Link, Outlet, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Calendar, 
  Bike, 
  Package, 
  Users, 
  Map,
  Settings,
  LogOut,
  XCircle,
  PackageCheck,
  Wrench
} from "lucide-react";
import bolt91Logo from "@/assets/bolt91-logo.png";

const AdminLayout = () => {
  const location = useLocation();
  
  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
    { icon: Calendar, label: "Bookings", path: "/admin/bookings" },
    { icon: XCircle, label: "Cancellations", path: "/admin/cancellations" },
    { icon: Bike, label: "Cycles", path: "/admin/cycles" },
    { icon: Package, label: "Accessories", path: "/admin/accessories" },
    { icon: Users, label: "Partners", path: "/admin/partners" },
    { icon: Map, label: "Partner Map", path: "/admin/partners-map" },
    { icon: Users, label: "Customers", path: "/admin/users" },
    { icon: PackageCheck, label: "Cycle Returns", path: "/admin/cycle-return" },
    { icon: Wrench, label: "Maintenance", path: "/admin/maintenance" },
    { icon: Settings, label: "Settings", path: "/admin/settings" },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col">
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

        <div className="p-4 border-t border-border">
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
