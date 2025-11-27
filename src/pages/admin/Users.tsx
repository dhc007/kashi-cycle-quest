import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Users as UsersIcon, UserX, Mail, Phone, Search, Eye, MoreVertical, Camera } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { extractPhoneFromEmail } from "@/lib/utils";

interface UserData {
  id: string;
  email: string;
  created_at: string;
  profile?: {
    first_name: string;
    last_name: string;
    phone_number: string;
    live_photo_url: string | null;
    id_proof_url: string | null;
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
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDocumentsDialogOpen, setEditDocumentsDialogOpen] = useState(false);
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
            live_photo_url: profile.live_photo_url,
            id_proof_url: profile.id_proof_url,
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
  ).sort((a, b) => {
    const aDate = new Date(a.created_at).getTime();
    const bDate = new Date(b.created_at).getTime();
    return sortOrder === 'asc' ? aDate - bDate : bDate - aDate;
  });

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
      <div className="mb-4 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          className="whitespace-nowrap"
        >
          Sort by Date {sortOrder === 'desc' ? '↓' : '↑'}
        </Button>
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
                  <TableHead className="w-[100px]">Actions</TableHead>
                  <TableHead className="w-12">Sr.</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Documents</TableHead>
                  <TableHead>Past Bookings</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((user, index) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setViewDialogOpen(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuItem onClick={() => {
                              setSelectedUser(user);
                              setViewDialogOpen(true);
                            }}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setSelectedUser(user);
                              setEditDocumentsDialogOpen(true);
                            }}>
                              <Camera className="w-4 h-4 mr-2" />
                              Update Documents
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/admin/bookings?search=${user.profile?.phone_number || user.email}`)}>
                              View All Bookings
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{index + 1}</TableCell>
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
                          <Phone className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs break-all">{user.profile?.phone_number || extractPhoneFromEmail(user.email) || user.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {user.profile?.live_photo_url && (
                          <a href={user.profile.live_photo_url} target="_blank" rel="noopener noreferrer">
                            <img 
                              src={user.profile.live_photo_url} 
                              alt="Live Photo" 
                              className="w-12 h-12 object-cover rounded border hover:opacity-80 transition-opacity cursor-pointer"
                            />
                          </a>
                        )}
                        {user.profile?.id_proof_url && (
                          <a href={user.profile.id_proof_url} target="_blank" rel="noopener noreferrer">
                            <img 
                              src={user.profile.id_proof_url} 
                              alt="Aadhar" 
                              className="w-12 h-12 object-cover rounded border hover:opacity-80 transition-opacity cursor-pointer"
                            />
                          </a>
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
                              <button
                                onClick={() => navigate(`/admin/bookings?search=${user.profile?.phone_number || user.email}`)}
                                className="text-xs text-primary hover:underline"
                              >
                                +{user.bookings.length - 3} more
                              </button>
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
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No customers found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* User Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Name</p>
                  <p className="text-base font-semibold">
                    {selectedUser.profile?.first_name} {selectedUser.profile?.last_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Phone</p>
                  <p className="text-base">{selectedUser.profile?.phone_number}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-base">{selectedUser.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Joined</p>
                  <p className="text-base">{format(new Date(selectedUser.created_at), 'PPP')}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Documents</p>
                <div className="flex gap-4">
                  {/* Live Photo - View Only */}
                  <div>
                    <p className="text-xs mb-1 font-medium">Live Photo</p>
                    {selectedUser.profile?.live_photo_url ? (
                      <a 
                        href={selectedUser.profile.live_photo_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <img 
                          src={selectedUser.profile.live_photo_url} 
                          alt="Live Photo" 
                          className="w-32 h-32 object-cover rounded border hover:opacity-80 transition-opacity"
                        />
                      </a>
                    ) : (
                      <div className="w-32 h-32 flex items-center justify-center border-2 border-dashed rounded bg-muted">
                        <span className="text-xs text-muted-foreground">Not uploaded</span>
                      </div>
                    )}
                  </div>

                  {/* ID Proof - View Only */}
                  <div>
                    <p className="text-xs mb-1 font-medium">ID Proof</p>
                    {selectedUser.profile?.id_proof_url ? (
                      <a 
                        href={selectedUser.profile.id_proof_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <img 
                          src={selectedUser.profile.id_proof_url} 
                          alt="ID Proof" 
                          className="w-32 h-32 object-cover rounded border hover:opacity-80 transition-opacity"
                        />
                      </a>
                    ) : (
                      <div className="w-32 h-32 flex items-center justify-center border-2 border-dashed rounded bg-muted">
                        <span className="text-xs text-muted-foreground">Not uploaded</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Booking History ({selectedUser.bookings.length} bookings)
                </p>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {selectedUser.bookings.map((booking) => (
                    <div key={booking.id} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                      <button
                        onClick={() => {
                          setViewDialogOpen(false);
                          navigate(`/admin/bookings?search=${booking.booking_id}`);
                        }}
                        className="text-sm text-primary hover:underline font-mono"
                      >
                        #{booking.booking_id}
                      </button>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(booking.created_at), 'PP')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Update Documents Dialog */}
      <Dialog open={editDocumentsDialogOpen} onOpenChange={setEditDocumentsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Update Customer Documents</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Customer Name</p>
                  <p className="text-base font-semibold">
                    {selectedUser.profile?.first_name} {selectedUser.profile?.last_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Phone</p>
                  <p className="text-base">{selectedUser.profile?.phone_number}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Live Photo Upload */}
                <div>
                  <p className="text-sm font-medium mb-2">Live Photo</p>
                  <button
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = async (e: any) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const fileName = `${Date.now()}_${file.name}`;
                            const { error: uploadError } = await supabase.storage
                              .from('booking-documents')
                              .upload(fileName, file);
                            
                            if (uploadError) throw uploadError;
                            
                            const { data: { publicUrl } } = supabase.storage
                              .from('booking-documents')
                              .getPublicUrl(fileName);
                            
                            const { error: updateError } = await supabase
                              .from('profiles')
                              .update({ live_photo_url: publicUrl })
                              .eq('user_id', selectedUser.id);
                            
                            if (updateError) throw updateError;
                            
                            toast({
                              title: "Success",
                              description: "Live photo updated successfully",
                            });
                            
                            await loadUsers();
                            setEditDocumentsDialogOpen(false);
                          } catch (error: any) {
                            toast({
                              title: "Error",
                              description: error.message,
                              variant: "destructive",
                            });
                          }
                        }
                      };
                      input.click();
                    }}
                    className="relative group cursor-pointer w-full"
                  >
                    {selectedUser.profile?.live_photo_url ? (
                      <>
                        <img 
                          src={selectedUser.profile.live_photo_url} 
                          alt="Live Photo" 
                          className="w-full h-40 object-cover rounded border group-hover:opacity-75 transition-opacity"
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded">
                          <Camera className="w-8 h-8 text-white" />
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-40 flex flex-col items-center justify-center border-2 border-dashed rounded group-hover:border-primary group-hover:bg-primary/5 transition-colors">
                        <Camera className="w-8 h-8 text-muted-foreground group-hover:text-primary" />
                        <span className="text-sm text-muted-foreground mt-2">Click to upload</span>
                      </div>
                    )}
                  </button>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    {selectedUser.profile?.live_photo_url ? 'Click to update' : 'Click to upload'}
                  </p>
                </div>

                {/* ID Proof Upload */}
                <div>
                  <p className="text-sm font-medium mb-2">ID Proof (Aadhar)</p>
                  <button
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/jpeg,image/png,application/pdf';
                      input.onchange = async (e: any) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const fileName = `${Date.now()}_${file.name}`;
                            const { error: uploadError } = await supabase.storage
                              .from('booking-documents')
                              .upload(fileName, file);
                            
                            if (uploadError) throw uploadError;
                            
                            const { data: { publicUrl } } = supabase.storage
                              .from('booking-documents')
                              .getPublicUrl(fileName);
                            
                            const { error: updateError } = await supabase
                              .from('profiles')
                              .update({ id_proof_url: publicUrl })
                              .eq('user_id', selectedUser.id);
                            
                            if (updateError) throw updateError;
                            
                            toast({
                              title: "Success",
                              description: "ID proof updated successfully",
                            });
                            
                            await loadUsers();
                            setEditDocumentsDialogOpen(false);
                          } catch (error: any) {
                            toast({
                              title: "Error",
                              description: error.message,
                              variant: "destructive",
                            });
                          }
                        }
                      };
                      input.click();
                    }}
                    className="relative group cursor-pointer w-full"
                  >
                    {selectedUser.profile?.id_proof_url ? (
                      <>
                        <img 
                          src={selectedUser.profile.id_proof_url} 
                          alt="ID Proof" 
                          className="w-full h-40 object-cover rounded border group-hover:opacity-75 transition-opacity"
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded">
                          <Camera className="w-8 h-8 text-white" />
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-40 flex flex-col items-center justify-center border-2 border-dashed rounded group-hover:border-primary group-hover:bg-primary/5 transition-colors">
                        <Camera className="w-8 h-8 text-muted-foreground group-hover:text-primary" />
                        <span className="text-sm text-muted-foreground mt-2">Click to upload</span>
                      </div>
                    )}
                  </button>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    {selectedUser.profile?.id_proof_url ? 'Click to update' : 'Click to upload'}
                  </p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground text-center pt-2">
                Click on the photo boxes above to upload or update documents
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Users;
