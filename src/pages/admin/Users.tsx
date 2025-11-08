import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Users as UsersIcon, Shield, UserX, Mail, Phone } from "lucide-react";
import { format } from "date-fns";

interface UserData {
  id: string;
  email: string;
  created_at: string;
  profile?: {
    full_name: string;
    phone_number: string;
  };
  roles: string[];
  bookingCount: number;
}

const Users = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkAdminAndLoadData();
  }, []);

  const checkAdminAndLoadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in",
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
        setLoading(false);
        return;
      }

      setIsAdmin(true);
      await loadUsers();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      // Get all users from auth (through profiles)
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) throw profilesError;

      // Get all user roles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role');

      // Get booking counts
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('user_id');

      const usersMap: Record<string, UserData> = {};

      // Build users map
      profilesData?.forEach((profile) => {
        const userRoles = rolesData?.filter(r => r.user_id === profile.user_id).map(r => r.role) || [];
        const bookingCount = bookingsData?.filter(b => b.user_id === profile.user_id).length || 0;

        usersMap[profile.user_id] = {
          id: profile.user_id,
          email: profile.email || '',
          created_at: profile.created_at,
          profile: {
            full_name: profile.full_name,
            phone_number: profile.phone_number,
          },
          roles: userRoles,
          bookingCount,
        };
      });

      setUsers(Object.values(usersMap));
    } catch (error: any) {
      console.error('Error loading users:', error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    }
  };

  const toggleAdminRole = async (userId: string, currentRoles: string[]) => {
    try {
      const hasAdmin = currentRoles.includes('admin');

      if (hasAdmin) {
        // Remove admin role
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', 'admin');

        if (error) throw error;

        toast({
          title: "Success",
          description: "Admin role removed",
        });
      } else {
        // Add admin role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: 'admin' });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Admin role granted",
        });
      }

      await loadUsers();
    } catch (error: any) {
      console.error('Error toggling admin role:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update role",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-8">
        <Card className="shadow-warm">
          <CardContent className="py-12 text-center">
            <UserX className="w-16 h-16 mx-auto mb-4 text-destructive" />
            <h3 className="text-xl font-semibold mb-2">Access Denied</h3>
            <p className="text-muted-foreground">You need administrator privileges to view this page</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <UsersIcon className="w-8 h-8" />
          User Management
        </h1>
        <p className="text-muted-foreground">Manage users and their roles</p>
      </div>

      <Card className="shadow-warm">
        <CardHeader>
          <CardTitle>All Users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold">{user.profile?.full_name || 'Unknown'}</h3>
                    {user.roles.includes('admin') && (
                      <Badge className="bg-purple-500">
                        <Shield className="w-3 h-3 mr-1" />
                        Admin
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      {user.email}
                    </div>
                    {user.profile?.phone_number && (
                      <div className="flex items-center gap-1">
                        <Phone className="w-4 h-4" />
                        {user.profile.phone_number}
                      </div>
                    )}
                    <div>
                      Bookings: {user.bookingCount}
                    </div>
                    <div>
                      Joined: {format(new Date(user.created_at), 'PP')}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant={user.roles.includes('admin') ? 'destructive' : 'default'}
                    size="sm"
                    onClick={() => toggleAdminRole(user.id, user.roles)}
                  >
                    {user.roles.includes('admin') ? 'Remove Admin' : 'Make Admin'}
                  </Button>
                </div>
              </div>
            ))}

            {users.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No users found
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Users;
