import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Bike, Package, Users, Shield, Mail, Phone, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";

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
  const [pricePerMonth, setPricePerMonth] = useState("");
  const [securityDepositDay, setSecurityDepositDay] = useState("");
  const [securityDepositWeek, setSecurityDepositWeek] = useState("");
  const [securityDepositMonth, setSecurityDepositMonth] = useState("");

  // Accessories
  const [accessories, setAccessories] = useState<any[]>([]);

  // User roles management
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>('manager');

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
        setPricePerHour(cycleData.price_per_hour?.toString() || '');
        setPricePerDay(cycleData.price_per_day?.toString() || '');
        setPricePerWeek(cycleData.price_per_week?.toString() || '');
        setPricePerMonth(cycleData.price_per_month?.toString() || '');
        setSecurityDepositDay(cycleData.security_deposit_day?.toString() || '2000');
        setSecurityDepositWeek(cycleData.security_deposit_week?.toString() || '3000');
        setSecurityDepositMonth(cycleData.security_deposit_month?.toString() || '5000');
      }

      // Load accessories
      const { data: accessoriesData, error: accessoriesError } = await supabase
        .from('accessories')
        .select('*')
        .eq('is_active', true);

      if (accessoriesError) throw accessoriesError;
      setAccessories(accessoriesData || []);

      // Load users with roles
      await loadUsersWithRoles();

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
          price_per_hour: pricePerHour ? parseFloat(pricePerHour) : null,
          price_per_day: parseFloat(pricePerDay),
          price_per_week: parseFloat(pricePerWeek),
          price_per_month: pricePerMonth ? parseFloat(pricePerMonth) : null,
          security_deposit_day: parseFloat(securityDepositDay),
          security_deposit_week: parseFloat(securityDepositWeek),
          security_deposit_month: parseFloat(securityDepositMonth),
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

  const loadUsersWithRoles = async () => {
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) throw profilesError;

      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role');

      const usersWithRoles = profilesData?.map(profile => {
        const userRoles = rolesData?.filter(r => r.user_id === profile.user_id).map(r => r.role) || [];
        return {
          id: profile.user_id,
          email: profile.email || '',
          full_name: profile.full_name,
          phone_number: profile.phone_number,
          created_at: profile.created_at,
          roles: userRoles,
        };
      }) || [];

      // Only show users with admin, manager, or viewer roles
      const adminUsers = usersWithRoles.filter(u => 
        u.roles.includes('admin') || u.roles.includes('manager') || u.roles.includes('viewer')
      );

      setUsers(adminUsers);
    } catch (error: any) {
      console.error('Error loading users:', error);
    }
  };

  const handleAddRole = async () => {
    if (!selectedUserId || !selectedRole) {
      toast({
        title: "Error",
        description: "Please select a user and role",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .insert([{ user_id: selectedUserId, role: selectedRole as any }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Role added successfully",
      });

      setSelectedUserId("");
      await loadUsersWithRoles();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveRole = async (userId: string, role: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role as any);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Role removed successfully",
      });

      await loadUsersWithRoles();
    } catch (error: any) {
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

        {/* User Roles Management */}
        <Card className="shadow-warm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              User Role Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Add Role */}
            <div className="border p-4 rounded-lg space-y-4">
              <h3 className="font-medium">Add Role to User</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="user-select">Select User</Label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger id="user-select">
                      <SelectValue placeholder="Choose a user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.filter(u => !u.roles.includes(selectedRole)).map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="role-select">Role</Label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger id="role-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleAddRole}>
                <Plus className="w-4 h-4 mr-2" />
                Add Role
              </Button>
            </div>

            {/* Current Admin Users */}
            <div className="space-y-4">
              <h3 className="font-medium">Current Admin Users</h3>
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">{user.full_name || 'Unknown'}</h3>
                      <div className="flex gap-2">
                        {user.roles.map((role: string) => (
                          <Badge 
                            key={role}
                            className={
                              role === 'admin' ? 'bg-purple-500' :
                              role === 'manager' ? 'bg-blue-500' :
                              'bg-gray-500'
                            }
                          >
                            <Shield className="w-3 h-3 mr-1" />
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        {user.email}
                      </div>
                      {user.phone_number && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          {user.phone_number}
                        </div>
                      )}
                      <div>
                        Joined: {format(new Date(user.created_at), 'PP')}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {user.roles.map((role: string) => (
                      <Button
                        key={role}
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveRole(user.id, role)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Remove {role}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}

              {users.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No admin users found
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminSettings;