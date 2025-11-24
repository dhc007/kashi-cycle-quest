import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Calendar, Clock, MapPin, Package, CreditCard, XCircle, Edit } from "lucide-react";
import { CancellationDialog } from "@/components/CancellationDialog";
import { EditBookingDialog } from "@/components/EditBookingDialog";

interface Booking {
  id: string;
  booking_id: string;
  pickup_date: string;
  return_date: string;
  pickup_time: string;
  booking_status: string;
  payment_status: string;
  total_amount: number;
  duration_type: string;
  cycle_rental_cost: number;
  accessories_cost: number;
  security_deposit: number;
  has_insurance: boolean;
  created_at: string;
  cancellation_status: string;
  cancellation_reason: string | null;
  cancellation_fee: number;
  refund_amount: number;
  coupon_code: string | null;
  discount_amount: number;
  gst: number;
  cycles: {
    name: string;
    model: string;
    image_url: string;
  };
  partners: {
    name: string;
    address: string;
    city: string;
    google_maps_link: string | null;
  } | null;
  pickup_locations: {
    name: string;
    address: string;
    city: string;
    google_maps_link: string | null;
  } | null;
  booking_accessories?: Array<{
    accessory_id: string;
    quantity: number;
    days: number;
    price_per_day: number;
    total_cost: number;
    accessories: {
      name: string;
    };
  }>;
}

const BookingHistory = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const loadBookings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to view your bookings",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          cycles (name, model, image_url),
          partners (name, address, city, google_maps_link),
          pickup_locations (name, address, city, google_maps_link)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch accessories for each booking
      const bookingsWithAccessories = await Promise.all(
        (data || []).map(async (booking) => {
          const { data: accessories } = await supabase
            .from('booking_accessories')
            .select('accessory_id, quantity, days, price_per_day, total_cost, accessories(name)')
            .eq('booking_id', booking.id);
          
          return {
            ...booking,
            booking_accessories: accessories || []
          };
        })
      );
      
      setBookings(bookingsWithAccessories);
    } catch (error: any) {
      console.error('Error loading bookings:', error);
      toast({
        title: "Error",
        description: "Failed to load bookings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const canCancelBooking = (booking: Booking) => {
    return (
      booking.booking_status === 'confirmed' &&
      booking.payment_status === 'completed' &&
      booking.cancellation_status === 'none' &&
      new Date(booking.pickup_date) > new Date()
    );
  };

  const handleCancelClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setCancelDialogOpen(true);
  };

  const canEditBooking = (booking: Booking) => {
    const now = new Date();
    const pickupDateTime = new Date(`${booking.pickup_date}T${booking.pickup_time}`);
    const twoHoursBefore = new Date(pickupDateTime.getTime() - 2 * 60 * 60 * 1000);
    
    return (
      (booking.booking_status === 'confirmed' || booking.booking_status === 'active') &&
      booking.payment_status === 'completed' &&
      now < twoHoursBefore
    );
  };

  const handleEditClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setEditDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-500';
      case 'active':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-gray-500';
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getCancellationStatusColor = (status: string) => {
    switch (status) {
      case 'requested':
        return 'bg-yellow-500';
      case 'approved':
        return 'bg-green-500';
      case 'rejected':
        return 'bg-red-500';
      default:
        return '';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 pb-12">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">My Bookings</h1>
          <p className="text-muted-foreground">View all your past and upcoming bookings</p>
        </div>

        {bookings.length === 0 ? (
          <Card className="shadow-warm">
            <CardContent className="py-12 text-center">
              <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No bookings yet</h3>
              <p className="text-muted-foreground mb-6">Start your cycling adventure today!</p>
              <button
                onClick={() => navigate("/book")}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90"
              >
                Book Now
              </button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {bookings.map((booking) => (
              <Card key={booking.id} className="shadow-warm">
                <CardHeader>
                  <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                    <div className="flex gap-4 flex-1">
                      {booking.cycles?.image_url && (
                        <div className="w-24 h-24 flex-shrink-0 bg-muted rounded-lg overflow-hidden">
                          <img 
                            src={booking.cycles.image_url} 
                            alt={booking.cycles.name}
                            className="w-full h-full object-contain p-2"
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">
                          {booking.cycles?.name} - {booking.cycles?.model}
                        </CardTitle>
                        <div className="flex gap-2 flex-wrap">
                          <Badge className={getStatusColor(booking.booking_status)}>
                            {booking.booking_status}
                          </Badge>
                          <Badge className={getPaymentStatusColor(booking.payment_status)}>
                            {booking.payment_status}
                          </Badge>
                          {booking.cancellation_status !== 'none' && (
                            <Badge className={getCancellationStatusColor(booking.cancellation_status)}>
                              Cancellation: {booking.cancellation_status}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Booking ID</p>
                      <p className="font-mono text-sm">{booking.booking_id}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Calendar className="w-5 h-5 text-primary mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Pickup Date</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(booking.pickup_date), 'PPP')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Calendar className="w-5 h-5 text-primary mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Return Date</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(booking.return_date), 'PPP')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Clock className="w-5 h-5 text-primary mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Pickup Time</p>
                          <p className="text-sm text-muted-foreground">{booking.pickup_time}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                       <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-primary mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Pickup Location</p>
                          <p className="text-sm text-muted-foreground">
                            {booking.partners?.name || booking.pickup_locations?.name || 'N/A'}, {booking.partners?.city || booking.pickup_locations?.city || ''}
                          </p>
                          {(booking.partners?.google_maps_link || booking.pickup_locations?.google_maps_link) && (
                            <a
                              href={booking.partners?.google_maps_link || booking.pickup_locations?.google_maps_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                            >
                              <MapPin className="w-3 h-3" />
                              View on Google Maps
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <CreditCard className="w-5 h-5 text-primary mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Total Amount</p>
                          <p className="text-lg font-bold">₹{booking.total_amount.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Cycle Rental ({booking.duration_type})</span>
                        <span className="font-medium">₹{booking.cycle_rental_cost.toLocaleString()}</span>
                      </div>
                      {booking.accessories_cost > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Accessories</span>
                          <span className="font-medium">₹{booking.accessories_cost.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">GST</span>
                        <span className="font-medium">₹{booking.gst.toLocaleString()}</span>
                      </div>
                      {booking.coupon_code && booking.discount_amount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Discount ({booking.coupon_code})</span>
                          <span className="font-medium">-₹{booking.discount_amount.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t">
                        <span className="font-semibold">Subtotal</span>
                        <span className="font-semibold">₹{(booking.cycle_rental_cost + booking.accessories_cost + booking.gst - (booking.discount_amount || 0)).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Security Deposit (Refundable)</span>
                        <span className="font-medium text-green-600">₹{booking.security_deposit.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t-2">
                        <span className="text-lg font-bold">Total Paid</span>
                        <span className="text-lg font-bold">₹{booking.total_amount.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {booking.booking_accessories && booking.booking_accessories.length > 0 && (
                    <div className="pt-4 border-t">
                      <p className="text-sm font-medium mb-3">Accessories</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {booking.booking_accessories.map((acc, idx) => (
                          <div key={idx} className="bg-muted/50 p-3 rounded-md">
                            <p className="font-medium text-sm">{acc.accessories.name}</p>
                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                              <span>Qty: {acc.quantity} × {acc.days} days</span>
                              <span className="font-medium">₹{acc.total_cost.toLocaleString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {booking.has_insurance && (
                    <div className="bg-green-50 dark:bg-green-950 p-3 rounded-md">
                      <p className="text-sm text-green-700 dark:text-green-300">✓ Insurance Included</p>
                    </div>
                  )}

                  {booking.cancellation_status === 'requested' && booking.cancellation_reason && (
                    <div className="bg-yellow-50 dark:bg-yellow-950 p-3 rounded-md">
                      <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                        Cancellation Pending Approval
                      </p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        Reason: {booking.cancellation_reason}
                      </p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                        Refund Amount: ₹{booking.refund_amount?.toLocaleString() || 0}
                      </p>
                    </div>
                  )}

                  {(canEditBooking(booking) || canCancelBooking(booking)) && (
                    <div className="pt-4 border-t flex justify-end gap-2">
                      {canEditBooking(booking) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditClick(booking)}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Accessories
                        </Button>
                      )}
                      {canCancelBooking(booking) && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleCancelClick(booking)}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Request Cancellation
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {selectedBooking && (
          <>
            <CancellationDialog
              open={cancelDialogOpen}
              onOpenChange={setCancelDialogOpen}
              bookingId={selectedBooking.id}
              pickupDate={selectedBooking.pickup_date}
              totalAmount={selectedBooking.total_amount}
              onSuccess={() => {
                loadBookings();
                setSelectedBooking(null);
              }}
            />
            <EditBookingDialog
              open={editDialogOpen}
              onOpenChange={setEditDialogOpen}
              bookingId={selectedBooking.id}
              pickupDate={selectedBooking.pickup_date}
              returnDate={selectedBooking.return_date}
              pickupTime={selectedBooking.pickup_time}
              currentAccessories={selectedBooking.booking_accessories || []}
              onSuccess={() => {
                loadBookings();
                setSelectedBooking(null);
              }}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default BookingHistory;
