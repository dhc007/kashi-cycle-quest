import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RoleGuard, useUserRoles } from "@/components/admin/RoleGuard";
import { format } from "date-fns";
import { Eye, Search } from "lucide-react";

interface Booking {
  id: string;
  booking_id: string;
  user_id: string;
  cycle_id: string;
  partner_id: string;
  pickup_date: string;
  return_date: string;
  pickup_time: string;
  duration_type: string;
  booking_status: string;
  payment_status: string;
  total_amount: number;
  created_at: string;
  cancellation_status: string;
  cancellation_reason: string | null;
  cancellation_fee: number;
  refund_amount: number;
  cancellation_requested_at: string | null;
  profiles?: {
    full_name: string;
    phone_number: string;
    email: string | null;
  };
  cycles?: {
    name: string;
    model: string;
  };
  partners?: {
    name: string;
    city: string;
  };
}

const BookingsContent = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { toast } = useToast();
  const { canEdit } = useUserRoles();

  useEffect(() => {
    loadBookings();
  }, []);

  useEffect(() => {
    filterBookings();
  }, [searchTerm, statusFilter, bookings]);

  const loadBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          cycles (name, model),
          partners (name, city)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profile and accessories data for each booking
      const bookingsWithDetails = await Promise.all(
        (data || []).map(async (booking) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, phone_number, email')
            .eq('user_id', booking.user_id)
            .single();

          const { data: accessories } = await supabase
            .from('booking_accessories')
            .select('quantity, days, price_per_day, total_cost, accessories(name)')
            .eq('booking_id', booking.id);
          
          return {
            ...booking,
            profiles: profile || { full_name: 'N/A', phone_number: 'N/A', email: null },
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
      filtered = filtered.filter(b =>
        b.booking_id.toLowerCase().includes(term) ||
        b.profiles?.full_name?.toLowerCase().includes(term) ||
        b.profiles?.phone_number?.includes(term)
      );
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

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Bookings Management</h1>
        <p className="text-muted-foreground">View and manage all bookings</p>
      </div>

      <Card className="shadow-warm mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by booking ID, customer name, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-warm">
        <CardHeader>
          <CardTitle>All Bookings ({filteredBookings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Cycle</TableHead>
                  <TableHead>Partner</TableHead>
                  <TableHead>Pickup Date</TableHead>
                  <TableHead>Return Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cancellation</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-mono text-sm">{booking.booking_id}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{booking.profiles?.full_name}</div>
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
                      {booking.cancellation_status === 'requested' ? (
                        <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                          Pending
                        </span>
                      ) : booking.cancellation_status === 'approved' ? (
                        <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                          Approved
                        </span>
                      ) : booking.cancellation_status === 'rejected' ? (
                        <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                          Rejected
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => viewDetails(booking)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Booking ID</p>
                  <p className="font-mono">{selectedBooking.booking_id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(selectedBooking.booking_status)}`}>
                    {selectedBooking.booking_status}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Customer Name</p>
                  <p>{selectedBooking.profiles?.full_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Phone</p>
                  <p>{selectedBooking.profiles?.phone_number}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p>{selectedBooking.profiles?.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Duration</p>
                  <p>{selectedBooking.duration_type}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pickup Date</p>
                  <p>{format(new Date(selectedBooking.pickup_date), 'PPP')} at {selectedBooking.pickup_time}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Return Date</p>
                  <p>{format(new Date(selectedBooking.return_date), 'PPP')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Cycle</p>
                  <p>{selectedBooking.cycles?.name} - {selectedBooking.cycles?.model}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Partner</p>
                  <p>{selectedBooking.partners?.name}, {selectedBooking.partners?.city}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                  <p className="text-lg font-bold">₹{selectedBooking.total_amount}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Payment Status</p>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    selectedBooking.payment_status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {selectedBooking.payment_status}
                  </span>
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
