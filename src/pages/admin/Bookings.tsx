import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RoleGuard, useUserRoles } from "@/components/admin/RoleGuard";
import { format, isBefore, isAfter, startOfDay } from "date-fns";
import { Eye, Search, Calendar, CheckCircle, XCircle, Clock, ArrowUpDown, MoreVertical, Edit } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Booking {
  id: string;
  booking_id: string;
  user_id: string;
  cycle_id: string;
  partner_id: string;
  pickup_date: string;
  return_date: string;
  return_time: string;
  pickup_time: string;
  duration_type: string;
  booking_status: string;
  payment_status: string;
  total_amount: number;
  cycle_rental_cost: number;
  accessories_cost: number;
  insurance_cost: number;
  gst: number;
  security_deposit: number;
  has_insurance: boolean;
  created_at: string;
  cancellation_status: string;
  cancellation_reason: string | null;
  cancellation_fee: number;
  refund_amount: number;
  cancellation_requested_at: string | null;
  coupon_code: string | null;
  discount_amount: number;
  profiles?: {
    first_name: string;
    last_name: string;
    phone_number: string;
    email: string | null;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
    live_photo_url: string | null;
    id_proof_url: string | null;
  };
  cycles?: {
    name: string;
    model: string;
  };
  partners?: {
    name: string;
    city: string;
  };
  pickup_locations?: {
    name: string;
    address: string;
  };
  booking_accessories?: Array<{
    quantity: number;
    days: number;
    price_per_day: number;
    total_cost: number;
    accessories: {
      name: string;
    };
  }>;
}

const BookingsContent = () => {
  const [searchParams] = useSearchParams();
  const partnerFilter = searchParams.get("partner");
  const searchQuery = searchParams.get("search");
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchQuery || "");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Booking['profiles'] | null>(null);
  const [sortField, setSortField] = useState<'created_at' | 'pickup_date'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const { toast } = useToast();
  const { canEdit } = useUserRoles();

  useEffect(() => {
    loadBookings();
  }, [partnerFilter]);

  useEffect(() => {
    filterBookings();
  }, [searchTerm, statusFilter, bookings, partnerFilter]);

  const loadBookings = async () => {
    try {
      let query = supabase
        .from('bookings')
        .select(`
          *,
          cycles (name, model),
          partners (name, city),
          pickup_locations (name, address)
        `);
      
      // Filter by partner if specified
      if (partnerFilter) {
        query = query.eq('partner_id', partnerFilter);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profile and accessories data for each booking
      const bookingsWithDetails = await Promise.all(
        (data || []).map(async (booking) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, phone_number, email, emergency_contact_name, emergency_contact_phone, live_photo_url, id_proof_url')
            .eq('user_id', booking.user_id)
            .single();

          const { data: accessories } = await supabase
            .from('booking_accessories')
            .select('quantity, days, price_per_day, total_cost, accessories(name)')
            .eq('booking_id', booking.id);
          
          return {
            ...booking,
            profiles: profile || { 
              first_name: 'N/A', 
              last_name: '', 
              phone_number: 'N/A', 
              email: null, 
              emergency_contact_name: null, 
              emergency_contact_phone: null,
              live_photo_url: null,
              id_proof_url: null
            },
            booking_accessories: accessories || []
          };
        })
      );

      setBookings(bookingsWithDetails);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterBookings = () => {
    let filtered = bookings;

    if (statusFilter !== "all") {
      filtered = filtered.filter(b => b.booking_status === statusFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(b => {
        const fullName = `${b.profiles?.first_name || ''} ${b.profiles?.last_name || ''}`.toLowerCase();
        return (
          b.booking_id.toLowerCase().includes(term) ||
          fullName.includes(term) ||
          b.profiles?.phone_number?.includes(term)
        );
      });
    }

    setFilteredBookings(filtered);
  };

  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ booking_status: newStatus })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Booking status updated",
      });

      loadBookings();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCancellationApproval = async (bookingId: string, approve: boolean) => {
    try {
      const updates: any = {
        cancellation_status: approve ? 'approved' : 'rejected',
      };

      if (approve) {
        updates.booking_status = 'cancelled';
        updates.cancelled_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('bookings')
        .update(updates)
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Cancellation request ${approve ? 'approved' : 'rejected'}`,
      });

      loadBookings();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const viewDetails = (booking: Booking) => {
    setSelectedBooking(booking);
    setDetailsOpen(true);
  };

  const viewProfile = (profile: Booking['profiles']) => {
    setSelectedProfile(profile);
    setProfileDialogOpen(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Booking ID copied to clipboard",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const today = startOfDay(new Date());

  const upcomingBookings = filteredBookings.filter(b => 
    b.booking_status === 'confirmed' && isAfter(new Date(b.pickup_date), today)
  );
  
  const activeBookings = filteredBookings.filter(b => 
    b.booking_status === 'active' || 
    (b.booking_status === 'confirmed' && !isAfter(new Date(b.pickup_date), today))
  );
  
  const completedBookings = filteredBookings.filter(b => 
    b.booking_status === 'completed'
  );
  
  const cancelledBookings = filteredBookings.filter(b => 
    b.booking_status === 'cancelled'
  );

  const cancellationRequestedBookings = filteredBookings.filter(b => 
    b.cancellation_status === 'requested'
  );

  const renderBookingCard = (booking: Booking) => (
    <div key={booking.id} className="border rounded-lg p-4 space-y-3 hover:bg-accent/50 transition-colors">
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-mono text-sm font-semibold truncate">{booking.booking_id}</p>
          <p className="font-medium truncate">
            {booking.profiles?.first_name} {booking.profiles?.last_name}
          </p>
          <p className="text-xs text-muted-foreground">{booking.profiles?.phone_number}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => viewDetails(booking)}>
          <Eye className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-muted-foreground text-xs">Cycle</p>
          <p className="truncate">{booking.cycles?.name}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Partner</p>
          <p className="truncate">{booking.partners?.city}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Pickup</p>
          <p>{format(new Date(booking.pickup_date), 'MMM dd')}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Return</p>
          <p>{format(new Date(booking.return_date), 'MMM dd')}</p>
        </div>
      </div>
      
      <div className="flex justify-between items-center pt-2 border-t">
        <span className="font-semibold">₹{booking.total_amount}</span>
        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(booking.booking_status)}`}>
          {booking.booking_status}
        </span>
      </div>
    </div>
  );

  const renderBookingTable = (bookings: Booking[]) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[120px]">Booking ID</TableHead>
            <TableHead className="min-w-[120px]">Booking Date</TableHead>
            <TableHead className="min-w-[150px]">Customer</TableHead>
            <TableHead className="min-w-[120px]">Cycle</TableHead>
            <TableHead className="min-w-[120px]">Partner</TableHead>
            <TableHead className="min-w-[100px]">Pickup</TableHead>
            <TableHead className="min-w-[100px]">Return</TableHead>
            <TableHead className="min-w-[80px]">Amount</TableHead>
            <TableHead className="min-w-[100px]">Payment</TableHead>
            <TableHead className="min-w-[130px]">Status</TableHead>
            <TableHead className="min-w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.map((booking) => (
            <TableRow key={booking.id}>
              <TableCell className="font-mono text-sm">{booking.booking_id}</TableCell>
              <TableCell className="text-sm">
                {format(new Date(booking.created_at), 'MMM dd, yyyy')}
                <div className="text-xs text-muted-foreground">{format(new Date(booking.created_at), 'HH:mm')}</div>
              </TableCell>
              <TableCell>
                <div>
                  <div className="font-medium">
                    {booking.profiles?.first_name} {booking.profiles?.last_name}
                  </div>
                  <div className="text-xs text-muted-foreground">{booking.profiles?.phone_number}</div>
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  {booking.cycles?.name}
                  <div className="text-xs text-muted-foreground">{booking.cycles?.model}</div>
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  {booking.partners?.name}
                  <div className="text-xs text-muted-foreground">{booking.partners?.city}</div>
                </div>
              </TableCell>
              <TableCell className="text-sm">
                {format(new Date(booking.pickup_date), 'MMM dd, yyyy')}
              </TableCell>
              <TableCell className="text-sm">
                {format(new Date(booking.return_date), 'MMM dd, yyyy')}
              </TableCell>
              <TableCell className="font-semibold">₹{booking.total_amount}</TableCell>
              <TableCell>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  booking.payment_status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {booking.payment_status}
                </span>
              </TableCell>
              <TableCell>
                {canEdit ? (
                  <Select
                    value={booking.booking_status}
                    onValueChange={(value) => updateBookingStatus(booking.id, value)}
                  >
                    <SelectTrigger className="w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(booking.booking_status)}`}>
                    {booking.booking_status}
                  </span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => viewDetails(booking)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  {canEdit && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => viewDetails(booking)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit/Manage
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  if (loading) {
    return <div className="p-4 md:p-8">Loading...</div>;
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold">Bookings Management</h1>
        <p className="text-muted-foreground text-sm md:text-base">View and manage all bookings</p>
      </div>

      <Card className="shadow-warm mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by booking ID, name, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={sortField} onValueChange={(value: 'created_at' | 'pickup_date') => setSortField(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Booking Date</SelectItem>
                <SelectItem value="pickup_date">Pickup Date</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-warm">
        <Tabs defaultValue="all" className="w-full">
          <div className="border-b px-4 md:px-6">
            <TabsList className="w-full justify-start h-auto flex-wrap bg-transparent p-0">
              <TabsTrigger 
                value="all" 
                className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3"
              >
                <span className="hidden sm:inline">All</span>
                <span className="sm:hidden">All</span>
                <span className="ml-1 text-xs">({filteredBookings.length})</span>
              </TabsTrigger>
              <TabsTrigger 
                value="upcoming" 
                className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3"
              >
                <Clock className="h-4 w-4" />
                <span className="hidden sm:inline">Upcoming</span>
                <span className="sm:hidden">Up</span>
                <span className="ml-1 text-xs">({upcomingBookings.length})</span>
              </TabsTrigger>
              <TabsTrigger 
                value="active"
                className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3"
              >
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Active</span>
                <span className="sm:hidden">Act</span>
                <span className="ml-1 text-xs">({activeBookings.length})</span>
              </TabsTrigger>
              <TabsTrigger 
                value="completed"
                className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3"
              >
                <CheckCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Completed</span>
                <span className="sm:hidden">Done</span>
                <span className="ml-1 text-xs">({completedBookings.length})</span>
              </TabsTrigger>
              <TabsTrigger 
                value="cancellation_requested"
                className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3"
              >
                <XCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Cancellation Request</span>
                <span className="sm:hidden">Req</span>
                <span className="ml-1 text-xs">({cancellationRequestedBookings.length})</span>
              </TabsTrigger>
              <TabsTrigger 
                value="cancelled"
                className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3"
              >
                <XCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Cancelled</span>
                <span className="sm:hidden">Can</span>
                <span className="ml-1 text-xs">({cancelledBookings.length})</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="all" className="p-4 md:p-6">
            <div className="md:hidden space-y-3">
              {filteredBookings.map(renderBookingCard)}
              {filteredBookings.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No bookings found</p>
              )}
            </div>
            <div className="hidden md:block">
              {renderBookingTable(filteredBookings)}
              {filteredBookings.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No bookings found</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="upcoming" className="p-4 md:p-6">
            <div className="md:hidden space-y-3">
              {upcomingBookings.map(renderBookingCard)}
              {upcomingBookings.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No upcoming bookings</p>
              )}
            </div>
            <div className="hidden md:block">
              {renderBookingTable(upcomingBookings)}
              {upcomingBookings.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No upcoming bookings</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="active" className="p-4 md:p-6">
            <div className="md:hidden space-y-3">
              {activeBookings.map(renderBookingCard)}
              {activeBookings.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No active bookings</p>
              )}
            </div>
            <div className="hidden md:block">
              {renderBookingTable(activeBookings)}
              {activeBookings.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No active bookings</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="completed" className="p-4 md:p-6">
            <div className="md:hidden space-y-3">
              {completedBookings.map(renderBookingCard)}
              {completedBookings.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No completed bookings</p>
              )}
            </div>
            <div className="hidden md:block">
              {renderBookingTable(completedBookings)}
              {completedBookings.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No completed bookings</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="cancellation_requested" className="p-4 md:p-6">
            <div className="md:hidden space-y-3">
              {cancellationRequestedBookings.map(renderBookingCard)}
              {cancellationRequestedBookings.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No cancellation requests</p>
              )}
            </div>
            <div className="hidden md:block">
              {renderBookingTable(cancellationRequestedBookings)}
              {cancellationRequestedBookings.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No cancellation requests</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="cancelled" className="p-4 md:p-6">
            <div className="md:hidden space-y-3">
              {cancelledBookings.map(renderBookingCard)}
              {cancelledBookings.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No cancelled bookings</p>
              )}
            </div>
            <div className="hidden md:block">
              {renderBookingTable(cancelledBookings)}
              {cancelledBookings.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No cancelled bookings</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-6">
              {/* Booking ID and Status */}
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Booking ID</p>
                  <button 
                    onClick={() => copyToClipboard(selectedBooking.booking_id)}
                    className="font-mono text-lg font-semibold hover:text-primary transition-colors cursor-pointer"
                  >
                    {selectedBooking.booking_id}
                  </button>
                  <p className="text-xs text-muted-foreground">Click to copy</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(selectedBooking.booking_status)}`}>
                  {selectedBooking.booking_status}
                </span>
              </div>

              {/* Customer Information */}
              <div className="border rounded-lg p-4 bg-accent/50">
                <h3 className="font-semibold mb-3 flex items-center justify-between">
                  <span>Customer Information</span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => viewProfile(selectedBooking.profiles)}
                  >
                    View Full Profile →
                  </Button>
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground mb-2">Customer Photo & ID Proof</p>
                    <div className="flex gap-4">
                      {selectedBooking.profiles?.live_photo_url && (
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground mb-1">Live Photo</p>
                          <Dialog>
                            <DialogTrigger asChild>
                              <img 
                                src={selectedBooking.profiles.live_photo_url} 
                                alt="Customer Photo" 
                                className="w-full h-32 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                              />
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl">
                              <DialogHeader>
                                <DialogTitle>Customer Live Photo</DialogTitle>
                              </DialogHeader>
                              <img 
                                src={selectedBooking.profiles.live_photo_url} 
                                alt="Customer Photo Full" 
                                className="w-full h-auto rounded-lg"
                              />
                            </DialogContent>
                          </Dialog>
                        </div>
                      )}
                      {selectedBooking.profiles?.id_proof_url && (
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground mb-1">Aadhar Card</p>
                          <Dialog>
                            <DialogTrigger asChild>
                              <img 
                                src={selectedBooking.profiles.id_proof_url} 
                                alt="ID Proof" 
                                className="w-full h-32 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                              />
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl">
                              <DialogHeader>
                                <DialogTitle>Customer ID Proof (Aadhar Card)</DialogTitle>
                              </DialogHeader>
                              <img 
                                src={selectedBooking.profiles.id_proof_url} 
                                alt="ID Proof Full" 
                                className="w-full h-auto rounded-lg"
                              />
                            </DialogContent>
                          </Dialog>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">
                      {selectedBooking.profiles?.first_name} {selectedBooking.profiles?.last_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{selectedBooking.profiles?.phone_number}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedBooking.profiles?.email || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Booking Details */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3">Booking Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Cycle</p>
                    <p className="font-medium">{selectedBooking.cycles?.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedBooking.cycles?.model}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p className="font-medium">{selectedBooking.duration_type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pickup Location</p>
                    <p className="font-medium">{selectedBooking.pickup_locations?.name || 'N/A'}</p>
                    {selectedBooking.pickup_locations?.address && (
                      <p className="text-xs text-muted-foreground">{selectedBooking.pickup_locations.address}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Partner</p>
                    <p className="font-medium">{selectedBooking.partners?.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedBooking.partners?.city}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pickup Date & Time</p>
                    <p className="font-medium">{format(new Date(selectedBooking.pickup_date), 'PPP')}</p>
                    <p className="text-sm">{selectedBooking.pickup_time}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Return Date & Time</p>
                    <p className="font-medium">{format(new Date(selectedBooking.return_date), 'PPP')}</p>
                    <p className="text-sm">{selectedBooking.return_time || '10:00 AM'}</p>
                  </div>
                </div>
              </div>

              {/* Accessories */}
              {selectedBooking.booking_accessories && selectedBooking.booking_accessories.length > 0 && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Accessories</h3>
                  <div className="space-y-2">
                    {selectedBooking.booking_accessories.map((accessory, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b last:border-0">
                        <div>
                          <p className="font-medium">{accessory.accessories.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Qty: {accessory.quantity} × {accessory.days} days @ ₹{accessory.price_per_day}/day
                          </p>
                        </div>
                        <p className="font-semibold">₹{accessory.total_cost}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment Breakdown */}
              <div className="border rounded-lg p-4 bg-primary/5">
                <h3 className="font-semibold mb-3">Payment Breakdown</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cycle Rental</span>
                    <span className="font-medium">₹{selectedBooking.cycle_rental_cost}</span>
                  </div>
                  {selectedBooking.accessories_cost > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Accessories</span>
                      <span className="font-medium">₹{selectedBooking.accessories_cost}</span>
                    </div>
                  )}
                  {selectedBooking.has_insurance && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Insurance</span>
                      <span className="font-medium">₹{selectedBooking.insurance_cost}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">GST</span>
                    <span className="font-medium">₹{selectedBooking.gst}</span>
                  </div>
                  {selectedBooking.coupon_code && selectedBooking.discount_amount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount (Coupon: {selectedBooking.coupon_code})</span>
                      <span className="font-medium">-₹{selectedBooking.discount_amount}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t">
                    <span className="font-semibold">Subtotal</span>
                    <span className="font-semibold">₹{(selectedBooking.cycle_rental_cost + selectedBooking.accessories_cost + selectedBooking.insurance_cost + selectedBooking.gst - (selectedBooking.discount_amount || 0)).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Security Deposit (Refundable)</span>
                    <span className="font-medium text-green-600">₹{selectedBooking.security_deposit}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t-2 border-primary">
                    <span className="text-lg font-bold">Total Amount</span>
                    <span className="text-lg font-bold">₹{selectedBooking.total_amount}</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-sm text-muted-foreground">Payment Status</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      selectedBooking.payment_status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {selectedBooking.payment_status}
                    </span>
                  </div>
                </div>
              </div>

              {selectedBooking.cancellation_status === 'requested' && (
                <div className="border-t pt-4 mt-4">
                  <h3 className="font-semibold text-lg mb-4">Cancellation Request</h3>
                  <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg space-y-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Requested At</p>
                      <p className="text-sm">{selectedBooking.cancellation_requested_at ? format(new Date(selectedBooking.cancellation_requested_at), 'PPP p') : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Reason</p>
                      <p className="text-sm">{selectedBooking.cancellation_reason}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Cancellation Fee</p>
                        <p className="text-sm font-semibold text-red-600">₹{selectedBooking.cancellation_fee}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Refund Amount</p>
                        <p className="text-sm font-semibold text-green-600">₹{selectedBooking.refund_amount}</p>
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex gap-3 pt-4">
                        <Button
                          variant="destructive"
                          onClick={() => {
                            handleCancellationApproval(selectedBooking.id, false);
                            setDetailsOpen(false);
                          }}
                        >
                          Reject Cancellation
                        </Button>
                        <Button
                          variant="default"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => {
                            handleCancellationApproval(selectedBooking.id, true);
                            setDetailsOpen(false);
                          }}
                        >
                          Approve Cancellation
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* User Profile Dialog */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Customer Profile</DialogTitle>
          </DialogHeader>
          {selectedProfile && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Full Name</p>
                <p className="font-semibold text-lg">
                  {selectedProfile.first_name} {selectedProfile.last_name}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone Number</p>
                <p className="font-medium">{selectedProfile.phone_number}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{selectedProfile.email || 'Not provided'}</p>
              </div>
              {selectedProfile.emergency_contact_name && (
                <>
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-3">Emergency Contact</h4>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Name</p>
                        <p className="font-medium">{selectedProfile.emergency_contact_name}</p>
                      </div>
                      {selectedProfile.emergency_contact_phone && (
                        <div>
                          <p className="text-sm text-muted-foreground">Phone</p>
                          <p className="font-medium">{selectedProfile.emergency_contact_phone}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Bookings = () => {
  return (
    <RoleGuard allowedRoles={['admin', 'manager', 'viewer']}>
      <BookingsContent />
    </RoleGuard>
  );
};

export default Bookings;
