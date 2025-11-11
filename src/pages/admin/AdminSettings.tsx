import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Palette, LayoutDashboard, Moon, Sun, Settings2 } from "lucide-react";
import { useTheme } from "next-themes";

const AdminSettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // useTheme needs to be mounted before we can use it
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Dashboard customization
  const [showBookingTrends, setShowBookingTrends] = useState(true);
  const [showRevenueTrends, setShowRevenueTrends] = useState(true);
  const [showCycleInventory, setShowCycleInventory] = useState(true);
  const [showActiveBookings, setShowActiveBookings] = useState(true);

  // Booking settings
  const [maxCyclesPerBooking, setMaxCyclesPerBooking] = useState(10);

  useEffect(() => {
    checkAdminAndLoadSettings();
  }, []);

  const checkAdminAndLoadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to access settings",
          variant: "destructive",
        });
        return;
      }

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      if (!roleData) {
        setIsAdmin(false);
        toast({
          title: "Access Denied",
          description: "You need admin privileges to access this page",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      setIsAdmin(true);

      // Load dashboard settings from localStorage
      const savedSettings = localStorage.getItem('dashboardSettings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        setShowBookingTrends(settings.showBookingTrends ?? true);
        setShowRevenueTrends(settings.showRevenueTrends ?? true);
        setShowCycleInventory(settings.showCycleInventory ?? true);
        setShowActiveBookings(settings.showActiveBookings ?? true);
      }

      // Load booking settings from database
      const { data: settingsData } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'max_cycles_per_booking')
        .single();

      if (settingsData?.value && typeof settingsData.value === 'object' && 'value' in settingsData.value) {
        setMaxCyclesPerBooking((settingsData.value as { value: number }).value);
      }

    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDashboardSettings = () => {
    const settings = {
      showBookingTrends,
      showRevenueTrends,
      showCycleInventory,
      showActiveBookings,
    };
    localStorage.setItem('dashboardSettings', JSON.stringify(settings));
    toast({
      title: "Success",
      description: "Dashboard settings saved successfully",
    });
  };

  const handleSaveBookingSettings = async () => {
    try {
      const { error } = await supabase
        .from('system_settings')
        .update({ value: { value: maxCyclesPerBooking } })
        .eq('key', 'max_cycles_per_booking');

      if (error) throw error;

      toast({
        title: "Success",
        description: "Booking settings saved successfully",
      });
    } catch (error: any) {
      console.error('Error saving booking settings:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-8">
        <Card className="shadow-warm">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              You need administrator privileges to access this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Customize your admin experience</p>
      </div>

      <div className="space-y-6">
        {/* Theme Settings */}
        <Card className="shadow-warm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              Theme Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Color Theme</Label>
                <p className="text-sm text-muted-foreground">
                  Choose between light and dark mode
                </p>
              </div>
              <div className="flex items-center gap-2">
                {mounted && (
                  <>
                    <Button
                      variant={theme === "light" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTheme("light")}
                      className="gap-2"
                    >
                      <Sun className="w-4 h-4" />
                      Light
                    </Button>
                    <Button
                      variant={theme === "dark" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTheme("dark")}
                      className="gap-2"
                    >
                      <Moon className="w-4 h-4" />
                      Dark
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dashboard Customization */}
        <Card className="shadow-warm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5 text-primary" />
              Dashboard Customization
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Choose which sections to display on your dashboard
            </p>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label htmlFor="booking-trends" className="text-base font-medium">
                    Booking Trends Chart
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Display booking trends over time
                  </p>
                </div>
                <Switch
                  id="booking-trends"
                  checked={showBookingTrends}
                  onCheckedChange={setShowBookingTrends}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label htmlFor="revenue-trends" className="text-base font-medium">
                    Revenue Trends Chart
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Display revenue trends over time
                  </p>
                </div>
                <Switch
                  id="revenue-trends"
                  checked={showRevenueTrends}
                  onCheckedChange={setShowRevenueTrends}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label htmlFor="cycle-inventory" className="text-base font-medium">
                    Cycle Inventory Status
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Display cycle availability and usage
                  </p>
                </div>
                <Switch
                  id="cycle-inventory"
                  checked={showCycleInventory}
                  onCheckedChange={setShowCycleInventory}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label htmlFor="active-bookings" className="text-base font-medium">
                    Recent Active Bookings
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Display list of recent active bookings
                  </p>
                </div>
                <Switch
                  id="active-bookings"
                  checked={showActiveBookings}
                  onCheckedChange={setShowActiveBookings}
                />
              </div>
            </div>

            <div className="pt-4">
              <Button onClick={handleSaveDashboardSettings} className="w-full">
                Save Dashboard Settings
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Booking Settings */}
        <Card className="shadow-warm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-primary" />
              Booking Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="p-4 border rounded-lg">
                <Label htmlFor="max-cycles" className="text-base font-medium">
                  Maximum Cycles Per Booking
                </Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Set the maximum number of cycles a customer can book in one transaction
                </p>
                <Input
                  id="max-cycles"
                  type="number"
                  min="1"
                  max="50"
                  value={maxCyclesPerBooking}
                  onChange={(e) => setMaxCyclesPerBooking(parseInt(e.target.value) || 1)}
                  className="max-w-xs"
                />
              </div>
            </div>

            <div className="pt-4">
              <Button onClick={handleSaveBookingSettings} className="w-full">
                Save Booking Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminSettings;
