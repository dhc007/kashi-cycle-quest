import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Bike, Package } from "lucide-react";

const AdminSettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Cycle pricing
  const [cycleId, setCycleId] = useState("");
  const [pricePerHour, setPricePerHour] = useState("");
  const [pricePerDay, setPricePerDay] = useState("");
  const [pricePerWeek, setPricePerWeek] = useState("");
  const [securityDeposit, setSecurityDeposit] = useState("");

  // Accessories
  const [accessories, setAccessories] = useState<any[]>([]);

  useEffect(() => {
    checkAdminAndLoadData();
  }, []);

  const checkAdminAndLoadData = async () => {
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

      // Check if user is admin
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

      // Load cycle data
      const { data: cycleData, error: cycleError } = await supabase
        .from('cycles')
        .select('*')
        .eq('is_active', true)
        .single();

      if (cycleError) throw cycleError;

      if (cycleData) {
        setCycleId(cycleData.id);
        setPricePerHour(cycleData.price_per_hour.toString());
        setPricePerDay(cycleData.price_per_day.toString());
        setPricePerWeek(cycleData.price_per_week.toString());
        setSecurityDeposit(cycleData.security_deposit.toString());
      }

      // Load accessories
      const { data: accessoriesData, error: accessoriesError } = await supabase
        .from('accessories')
        .select('*')
        .eq('is_active', true);

      if (accessoriesError) throw accessoriesError;
      setAccessories(accessoriesData || []);

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

  const handleSaveCyclePricing = async () => {
    if (!isAdmin) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('cycles')
        .update({
          price_per_hour: parseFloat(pricePerHour),
          price_per_day: parseFloat(pricePerDay),
          price_per_week: parseFloat(pricePerWeek),
          security_deposit: parseFloat(securityDeposit),
          updated_at: new Date().toISOString(),
        })
        .eq('id', cycleId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Cycle pricing updated successfully",
      });
    } catch (error: any) {
      console.error('Error updating pricing:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateAccessoryPrice = async (id: string, newPrice: string) => {
    if (!isAdmin) return;

    try {
      const { error } = await supabase
        .from('accessories')
        .update({
          price_per_day: parseFloat(newPrice),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Accessory price updated",
      });

      // Update local state
      setAccessories(prev => prev.map(acc => 
        acc.id === id ? { ...acc, price_per_day: parseFloat(newPrice) } : acc
      ));
    } catch (error: any) {
      console.error('Error updating accessory:', error);
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
        <p className="text-muted-foreground">Configure pricing and application settings</p>
      </div>

      <div className="space-y-6">
        {/* Cycle Pricing */}
        <Card className="shadow-warm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bike className="w-5 h-5 text-primary" />
              Cycle Pricing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pricePerHour">Price per Hour (₹)</Label>
                <Input
                  id="pricePerHour"
                  type="number"
                  step="0.01"
                  value={pricePerHour}
                  onChange={(e) => setPricePerHour(e.target.value)}
                  placeholder="50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pricePerDay">Price per Day (₹)</Label>
                <Input
                  id="pricePerDay"
                  type="number"
                  step="0.01"
                  value={pricePerDay}
                  onChange={(e) => setPricePerDay(e.target.value)}
                  placeholder="300"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pricePerWeek">Price per Week (₹)</Label>
                <Input
                  id="pricePerWeek"
                  type="number"
                  step="0.01"
                  value={pricePerWeek}
                  onChange={(e) => setPricePerWeek(e.target.value)}
                  placeholder="1500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="securityDeposit">Security Deposit (₹)</Label>
                <Input
                  id="securityDeposit"
                  type="number"
                  step="0.01"
                  value={securityDeposit}
                  onChange={(e) => setSecurityDeposit(e.target.value)}
                  placeholder="500"
                />
              </div>
            </div>

            <Button
              onClick={handleSaveCyclePricing}
              disabled={saving}
              className="bg-gradient-primary hover:opacity-90"
            >
              {saving ? "Saving..." : "Save Cycle Pricing"}
            </Button>
          </CardContent>
        </Card>

        {/* Accessories Pricing */}
        <Card className="shadow-warm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Accessories Pricing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {accessories.map((accessory) => (
              <div key={accessory.id} className="flex items-center gap-4">
                <div className="flex-1">
                  <Label className="text-sm font-medium">{accessory.name}</Label>
                  <p className="text-xs text-muted-foreground">{accessory.description}</p>
                </div>
                <div className="w-32">
                  <Input
                    type="number"
                    step="0.01"
                    value={accessory.price_per_day}
                    onChange={(e) => handleUpdateAccessoryPrice(accessory.id, e.target.value)}
                    onBlur={(e) => {
                      if (e.target.value !== accessory.price_per_day.toString()) {
                        handleUpdateAccessoryPrice(accessory.id, e.target.value);
                      }
                    }}
                    placeholder="Price per day"
                  />
                </div>
                <span className="text-sm text-muted-foreground">₹/day</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminSettings;
