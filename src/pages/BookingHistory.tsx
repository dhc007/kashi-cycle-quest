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
    
    // Allow editing for both completed and pending payments
    return (
      (booking.booking_status === 'confirmed' || booking.booking_status === 'active') &&
      (booking.payment_status === 'completed' || booking.payment_status === 'pending') &&
      booking.cancellation_status === 'none' &&
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
      <div className="container mx-auto px-3 sm:px-4 pt-20 sm:pt-24 pb-8 sm:pb-12">
        <div className="mb-4 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2">My Bookings</h1>
          <p className="text-sm sm:text-base text-muted-foreground">View all your past and upcoming bookings</p>
        </div>

        {bookings.length === 0 ? (
          <Card className="shadow-warm">
            <CardContent className="py-8 sm:py-12 text-center">
              <Package className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-muted-foreground" />
              <h3 className="text-lg sm:text-xl font-semibold mb-2">No bookings yet</h3>
              <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">Start your cycling adventure today!</p>
              <button
                onClick={() => navigate("/book")}
                className="px-5 sm:px-6 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 text-sm sm:text-base"
              >
                Book Now
              </button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:gap-6">
            {bookings.map((booking) => (
              <Card key={booking.id} className="shadow-warm overflow-hidden">
                <CardHeader className="p-3 sm:p-6">
                  <div className="flex flex-col gap-3 sm:gap-4">
                    {/* Mobile: Stack vertically, Desktop: Row */}
                    <div className="flex gap-3 sm:gap-4">
                      {booking.cycles?.image_url && (
                        <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 flex-shrink-0 bg-muted rounded-lg overflow-hidden">
                          <img 
                            src={booking.cycles.image_url} 
                            alt={booking.cycles.name}
                            className="w-full h-full object-contain p-1 sm:p-2"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base sm:text-lg md:text-xl mb-1 sm:mb-2 leading-tight truncate">
                          {booking.cycles?.name}
                        </CardTitle>
                        <p className="text-xs sm:text-sm text-muted-foreground mb-2">{booking.cycles?.model}</p>
                        <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                          <Badge className={`${getStatusColor(booking.booking_status)} text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5`}>
                            Booking: {booking.booking_status}
                          </Badge>
                          <Badge className={`${getPaymentStatusColor(booking.payment_status)} text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5`}>
                            Payment: {booking.payment_status}
                          </Badge>
                          {booking.cancellation_status !== 'none' && (
                            <Badge className={`${getCancellationStatusColor(booking.cancellation_status)} text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5`}>
                              Cancel: {booking.cancellation_status}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Booking ID - full width on mobile */}
                    <div className="flex justify-between items-center bg-muted/50 rounded px-2 py-1.5 sm:px-3 sm:py-2">
                      <span className="text-xs sm:text-sm text-muted-foreground">Booking ID</span>
                      <span className="font-mono text-xs sm:text-sm">{booking.booking_id}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0 space-y-3 sm:space-y-4">
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-2 sm:space-y-3">
                      <div className="flex items-start gap-2 sm:gap-3">
                        <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-primary mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-medium">Pickup</p>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">
                            {format(new Date(booking.pickup_date), 'PP')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 sm:gap-3">
                        <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-primary mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-medium">Return</p>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">
                            {format(new Date(booking.return_date), 'PP')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 sm:gap-3">
                        <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs sm:text-sm font-medium">Time</p>
                          <p className="text-xs sm:text-sm text-muted-foreground">{booking.pickup_time}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 sm:space-y-3">
                      <div className="flex items-start gap-2 sm:gap-3">
                        <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-primary mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-medium">Location</p>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">
                            {booking.partners?.name || booking.pickup_locations?.name || 'N/A'}
                          </p>
                          {(booking.partners?.google_maps_link || booking.pickup_locations?.google_maps_link) && (
                            <a
                              href={booking.partners?.google_maps_link || booking.pickup_locations?.google_maps_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] sm:text-xs text-primary hover:underline inline-flex items-center gap-1 mt-0.5"
                            >
                              <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              Maps
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="flex items-start gap-2 sm:gap-3">
                        <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs sm:text-sm font-medium">Total</p>
                          <p className="text-sm sm:text-lg font-bold">₹{booking.total_amount.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 sm:pt-4 border-t">
                    <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Cycle ({booking.duration_type})</span>
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
                          <span className="truncate mr-2">Discount ({booking.coupon_code})</span>
                          <span className="font-medium flex-shrink-0">-₹{booking.discount_amount.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-1.5 sm:pt-2 border-t">
                        <span className="font-semibold">Subtotal</span>
                        <span className="font-semibold">₹{(booking.cycle_rental_cost + booking.accessories_cost + booking.gst - (booking.discount_amount || 0)).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-muted-foreground">Security Deposit</span>
                        <span className="font-medium text-green-600">₹{booking.security_deposit.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between pt-1.5 sm:pt-2 border-t-2">
                        <span className="text-sm sm:text-lg font-bold">Total</span>
                        <span className="text-sm sm:text-lg font-bold">₹{booking.total_amount.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {booking.booking_accessories && booking.booking_accessories.length > 0 && (
                    <div className="pt-3 sm:pt-4 border-t">
                      <p className="text-xs sm:text-sm font-medium mb-2 sm:mb-3">Accessories</p>
                      <div className="grid grid-cols-1 gap-2 sm:gap-3">
                        {booking.booking_accessories
                          .filter((acc) => acc.accessories)
                          .map((acc, idx) => (
                          <div key={idx} className="bg-muted/50 p-2 sm:p-3 rounded-md">
                            <p className="font-medium text-xs sm:text-sm">{acc.accessories?.name || 'Unknown'}</p>
                            <div className="flex justify-between text-[10px] sm:text-xs text-muted-foreground mt-1">
                              <span>Qty: {acc.quantity} × {acc.days}d</span>
                              <span className="font-medium">₹{acc.total_cost.toLocaleString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {booking.has_insurance && (
                    <div className="bg-green-50 dark:bg-green-950 p-2 sm:p-3 rounded-md">
                      <p className="text-xs sm:text-sm text-green-700 dark:text-green-300">✓ Insurance Included</p>
                    </div>
                  )}

                  {booking.cancellation_status === 'requested' && booking.cancellation_reason && (
                    <div className="bg-yellow-50 dark:bg-yellow-950 p-2 sm:p-3 rounded-md">
                      <p className="text-xs sm:text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                        Cancellation Pending
                      </p>
                      <p className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-300">
                        {booking.cancellation_reason}
                      </p>
                      <p className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                        Refund: ₹{booking.refund_amount?.toLocaleString() || 0}
                      </p>
                    </div>
                  )}

                  {(canEditBooking(booking) || canCancelBooking(booking)) && (
                    <div className="pt-3 sm:pt-4 border-t flex flex-col sm:flex-row justify-end gap-2">
                      {canEditBooking(booking) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs sm:text-sm w-full sm:w-auto"
                          onClick={() => handleEditClick(booking)}
                        >
                          <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                          Edit Accessories
                        </Button>
                      )}
                      {canCancelBooking(booking) && (
                        <Button
                          variant="destructive"
                          size="sm"
                          className="text-xs sm:text-sm w-full sm:w-auto"
                          onClick={() => handleCancelClick(booking)}
                        >
                          <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                          Cancel Booking
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
