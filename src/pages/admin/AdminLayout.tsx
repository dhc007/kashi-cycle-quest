import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
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
  IndianRupee,
  Menu,
} from "lucide-react";
import bolt91Logo from "@/assets/bolt91-logo-new.png";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [adminTheme, setAdminTheme] = useState<'light' | 'dark'>('light');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication and admin role
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          navigate('/admin/login');
          return;
        }

        // Check if user has admin role
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .eq('role', 'admin')
          .maybeSingle();

        if (roleError || !roleData) {
          await supabase.auth.signOut();
          navigate('/admin/login');
          return;
        }

        setIsAuthenticated(true);
      } catch (error) {
        console.error('Auth check error:', error);
        navigate('/admin/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        navigate('/admin/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

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
    { icon: IndianRupee, label: "Pricing Plan", path: "/admin/pricing-plan" },
    { icon: Settings, label: "Settings", path: "/admin/settings" },
  ];

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className={`min-h-screen flex flex-col lg:flex-row ${adminTheme}`}>
      {/* Mobile Header with Menu */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-card border-b border-border flex items-center justify-between px-4">
        <img src={bolt91Logo} alt="Bolt91 Admin" className="h-8" />
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-64 p-0">
            <SheetHeader className="p-6 border-b border-border">
              <SheetTitle>Admin Menu</SheetTitle>
            </SheetHeader>
            <nav className="p-4 space-y-2">
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
                    onClick={() => setMobileMenuOpen(false)}
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
              <Button variant="outline" className="w-full justify-start text-foreground hover:bg-accent mt-4" asChild onClick={() => setMobileMenuOpen(false)}>
                <Link to="/">
                  <LogOut className="w-4 h-4 mr-2" />
                  Back to Site
                </Link>
              </Button>
            </nav>
          </SheetContent>
        </Sheet>
      </header>

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

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-background pt-14 lg:pt-0">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;