import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Users as UsersIcon, UserX, Mail, Phone, Search } from "lucide-react";
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
  bookings: Array<{
    id: string;
    booking_id: string;
    created_at: string;
    booking_status: string;
  }>;
}

const Users = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

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
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) throw profilesError;

      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role');

      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('id, booking_id, user_id, created_at, booking_status')
        .order('created_at', { ascending: false });

      const usersMap: Record<string, UserData> = {};

      profilesData?.forEach((profile) => {
        const userRoles = rolesData?.filter(r => r.user_id === profile.user_id).map(r => r.role) || [];
        const userBookings = bookingsData?.filter(b => b.user_id === profile.user_id) || [];

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
          bookings: userBookings,
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

  const customers = users.filter(user => 
    !user.roles.includes('admin') && 
    !user.roles.includes('manager') && 
    !user.roles.includes('viewer')
  );

  const filteredCustomers = customers.filter(user =>
    user.profile?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.profile?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.profile?.phone_number?.includes(searchTerm)
  );

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <UsersIcon className="w-6 h-6 md:w-8 md:h-8" />
          Customers
        </h1>
        <p className="text-muted-foreground text-sm md:text-base">View all customer accounts and bookings</p>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Card className="shadow-warm">
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">All Customers ({filteredCustomers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Past Bookings</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <p className="font-semibold">
                          {user.profile?.first_name} {user.profile?.last_name || 'Unknown'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs">{user.email}</span>
                        </div>
                        {user.profile?.phone_number && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs">{user.profile.phone_number}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-semibold text-primary">{user.bookings.length} bookings</p>
                        {user.bookings.length > 0 && (
                          <div className="space-y-0.5">
                            {user.bookings.slice(0, 3).map((booking) => (
                              <button
                                key={booking.id}
                                onClick={() => navigate(`/admin/bookings?search=${booking.booking_id}`)}
                                className="text-xs text-primary hover:underline block"
                              >
                                #{booking.booking_id}
                              </button>
                            ))}
                            {user.bookings.length > 3 && (
                              <p className="text-xs text-muted-foreground">
                                +{user.bookings.length - 3} more
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{format(new Date(user.created_at), 'PP')}</span>
                    </TableCell>
                  </TableRow>
                ))}

                {filteredCustomers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No customers found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Users;
