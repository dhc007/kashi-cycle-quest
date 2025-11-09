import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Users as UsersIcon, UserX, Mail, Phone } from "lucide-react";
import { format } from "date-fns";

interface UserData {
  id: string;
  email: string;
  created_at: string;
  profile?: {
    first_name: string;
    last_name: string;
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
            first_name: profile.first_name,
            last_name: profile.last_name,
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

  // Filter out users with admin, manager, or viewer roles
  const customers = users.filter(user => 
    !user.roles.includes('admin') && 
    !user.roles.includes('manager') && 
    !user.roles.includes('viewer')
  );

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <UsersIcon className="w-6 h-6 md:w-8 md:h-8" />
          Customers
        </h1>
        <p className="text-muted-foreground text-sm md:text-base">View all customer accounts</p>
      </div>

      <Card className="shadow-warm">
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">All Customers ({customers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 md:space-y-4">
            {customers.map((user) => (
              <div
                key={user.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 md:p-4 border rounded-lg hover:bg-accent/50 transition-colors gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold truncate">
                      {user.profile?.first_name} {user.profile?.last_name || 'Unknown'}
                    </h3>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                    <div className="flex items-center gap-1 truncate">
                      <Mail className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="truncate">{user.email}</span>
                    </div>
                    {user.profile?.phone_number && (
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        {user.profile.phone_number}
                      </div>
                    )}
                    <div className="whitespace-nowrap">
                      Bookings: {user.bookingCount}
                    </div>
                    <div className="whitespace-nowrap">
                      Joined: {format(new Date(user.created_at), 'PP')}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {customers.length === 0 && (
              <div className="text-center py-8 md:py-12 text-muted-foreground text-sm md:text-base">
                No customers found
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Users;
