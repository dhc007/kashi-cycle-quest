import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Calendar, Clock, MapPin, Package, CreditCard } from "lucide-react";

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
  cycles: {
    name: string;
    model: string;
  };
  partners: {
    name: string;
    address: string;
    city: string;
  };
}

const BookingHistory = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
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
            cycles (name, model),
            partners (name, address, city)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        setBookings(data || []);
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

    loadBookings();
  }, [navigate, toast]);

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
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl mb-2">
                        {booking.cycles?.name} - {booking.cycles?.model}
                      </CardTitle>
                      <div className="flex gap-2">
                        <Badge className={getStatusColor(booking.booking_status)}>
                          {booking.booking_status}
                        </Badge>
                        <Badge className={getPaymentStatusColor(booking.payment_status)}>
                          {booking.payment_status}
                        </Badge>
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
                            {booking.partners?.name}, {booking.partners?.city}
                          </p>
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
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Duration</p>
                        <p className="font-medium capitalize">{booking.duration_type}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Cycle Cost</p>
                        <p className="font-medium">₹{booking.cycle_rental_cost.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Accessories</p>
                        <p className="font-medium">₹{booking.accessories_cost.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Security Deposit</p>
                        <p className="font-medium">₹{booking.security_deposit.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  {booking.has_insurance && (
                    <div className="bg-green-50 dark:bg-green-950 p-3 rounded-md">
                      <p className="text-sm text-green-700 dark:text-green-300">✓ Insurance Included</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingHistory;
