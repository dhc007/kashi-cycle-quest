import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MapPin } from "lucide-react";
import { CancellationDialog } from "@/components/CancellationDialog";
import { Navbar } from "@/components/Navbar";

interface Booking {
  id: string;
  booking_id: string;
  pickup_date: string;
  return_date: string;
  duration_type: string;
  booking_status: string;
  total_amount: number;
  cycle_rental_cost: number;
  accessories_cost: number;
  insurance_cost: number;
  gst: number;
  security_deposit: number;
  has_insurance: boolean;
  payment_status: string;
  cancellation_status: string | null;
  cancellation_requested_at: string | null;
  cancellation_reason: string | null;
  cancellation_fee: number | null;
  refund_amount: number | null;
  coupon_code: string | null;
  discount_amount: number | null;
  cycles: {
    name: string;
    model: string;
  };
  partners: {
    name: string;
    address: string;
    city: string;
    google_maps_link: string | null;
    phone_number: string;
  } | null;
  pickup_locations: {
    name: string;
    address: string;
    city: string;
    google_maps_link: string | null;
    phone_number: string;
  } | null;
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

export default function ManageBooking() {
  const [bookingId, setBookingId] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [showCancellationDialog, setShowCancellationDialog] = useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!bookingId.trim() || !lastName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter both Booking ID and Last Name",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // First get the booking
        const { data: bookingData, error: bookingError } = await supabase
          .from("bookings")
          .select(`
            *,
            cycles(name, model),
            partners(name, address, city, google_maps_link, phone_number),
            pickup_locations(name, address, city, google_maps_link, phone_number)
          `)
          .eq("booking_id", bookingId.toUpperCase())
          .single();

      if (bookingError) throw bookingError;

      if (!bookingData) {
        toast({
          title: "Booking Not Found",
          description: "No booking found with this Booking ID",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Get the profile to verify last name
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("last_name")
        .eq("user_id", bookingData.user_id)
        .single();

      if (profileError) throw profileError;

      // Compare last name (case-insensitive)
      if (profileData?.last_name?.toLowerCase() !== lastName.trim().toLowerCase()) {
        toast({
          title: "Invalid Information",
          description: "Last name does not match our records",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Fetch booking accessories
      const { data: accessoriesData } = await supabase
        .from("booking_accessories")
        .select(`
          quantity,
          days,
          price_per_day,
          total_cost,
          accessories(name)
        `)
        .eq("booking_id", bookingData.id);

      setBooking({
        ...bookingData,
        booking_accessories: accessoriesData || [],
      } as Booking);

      toast({
        title: "Success",
        description: "Booking found successfully",
      });
    } catch (error: any) {
      console.error("Error fetching booking:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch booking details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const canCancelBooking = (booking: Booking) => {
    if (booking.booking_status === "cancelled") return false;
    if (booking.cancellation_status === "requested" || booking.cancellation_status === "approved") return false;
    
    const pickupDate = new Date(booking.pickup_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return pickupDate > today;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-blue-500";
      case "active": return "bg-green-500";
      case "completed": return "bg-gray-500";
      case "cancelled": return "bg-red-500";
      default: return "bg-gray-400";
    }
  };

  const getCancellationStatusColor = (status: string | null) => {
    switch (status) {
      case "requested": return "bg-yellow-500";
      case "approved": return "bg-green-500";
      case "rejected": return "bg-red-500";
      default: return "bg-gray-400";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 mt-20">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Manage Your Booking</CardTitle>
            <CardDescription>
              Enter your Booking ID and Last Name to view and manage your booking
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Booking ID</label>
              <Input
                placeholder="e.g., BLT12345678"
                value={bookingId}
                onChange={(e) => setBookingId(e.target.value)}
                className="uppercase"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Last Name</label>
              <Input
                placeholder="Enter your last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
            <Button onClick={handleSearch} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                "Find My Booking"
              )}
            </Button>
          </CardContent>
        </Card>

        {booking && (
          <Card className="max-w-4xl mx-auto mt-8">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Booking Details</CardTitle>
                  <CardDescription>Booking ID: {booking.booking_id}</CardDescription>
                </div>
                <div className="space-x-2">
                  <Badge className={getStatusColor(booking.booking_status)}>
                    {booking.booking_status}
                  </Badge>
                  {booking.cancellation_status && booking.cancellation_status !== "none" && (
                    <Badge className={getCancellationStatusColor(booking.cancellation_status)}>
                      Cancellation: {booking.cancellation_status}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Cycle</p>
                  <p className="font-medium">{booking.cycles.name} - {booking.cycles.model}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="font-medium">{booking.duration_type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pickup Date</p>
                  <p className="font-medium">{new Date(booking.pickup_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Return Date</p>
                  <p className="font-medium">{new Date(booking.return_date).toLocaleDateString()}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Pickup Location</p>
                <p className="font-medium">{booking.partners?.name || booking.pickup_locations?.name || 'N/A'}</p>
                <p className="text-sm">{booking.partners?.address || booking.pickup_locations?.address || 'N/A'}, {booking.partners?.city || booking.pickup_locations?.city || ''}</p>
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

              {booking.booking_accessories && booking.booking_accessories.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Accessories</p>
                  <div className="space-y-2">
                    {booking.booking_accessories.map((accessory, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{accessory.accessories.name} (x{accessory.quantity}) - {accessory.days} days</span>
                        <span>₹{accessory.total_cost}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Payment Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cycle Rental</span>
                    <span>₹{booking.cycle_rental_cost}</span>
                  </div>
                  {booking.accessories_cost > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Accessories</span>
                      <span>₹{booking.accessories_cost}</span>
                    </div>
                  )}
                  {booking.has_insurance && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Insurance</span>
                      <span>₹{booking.insurance_cost}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-medium">Subtotal</span>
                    <span className="font-medium">₹{booking.cycle_rental_cost + booking.accessories_cost + booking.insurance_cost}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">GST (18%)</span>
                    <span>₹{booking.gst}</span>
                  </div>
                  {booking.coupon_code && booking.discount_amount && booking.discount_amount > 0 && (
                    <div className="flex justify-between text-green-600 dark:text-green-400">
                      <span>Discount ({booking.coupon_code})</span>
                      <span>-₹{booking.discount_amount}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold border-t pt-2 bg-primary/5 -mx-4 px-4 py-2 rounded">
                    <span>Amount Paid Online</span>
                    <span className="text-primary">₹{booking.cycle_rental_cost + booking.accessories_cost + booking.insurance_cost + booking.gst - (booking.discount_amount || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-amber-50 dark:bg-amber-950 -mx-4 px-4 py-2 rounded mt-2">
                    <span className="flex items-center gap-1 font-medium">
                      <span className="text-amber-600 dark:text-amber-400">💰</span>
                      <span className="text-amber-600 dark:text-amber-400">Security Deposit</span>
                      <span className="text-xs text-muted-foreground">(Refundable)</span>
                    </span>
                    <span className="font-semibold text-amber-600 dark:text-amber-400">₹{booking.security_deposit}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base pt-2 border-t-2 border-primary">
                    <span>Total Booking Amount</span>
                    <span className="text-primary">₹{booking.total_amount}</span>
                  </div>
                  <p className="text-xs text-muted-foreground italic pt-1">
                    = Online Payment + Security Deposit (to be collected at pickup)
                  </p>
                </div>
              </div>

              {booking.cancellation_status === "requested" && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                  <p className="font-semibold text-yellow-800 dark:text-yellow-200">Cancellation Requested</p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    Requested on: {new Date(booking.cancellation_requested_at!).toLocaleString()}
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Reason: {booking.cancellation_reason}
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-2">
                    Your cancellation request is pending admin approval.
                  </p>
                </div>
              )}

              {canCancelBooking(booking) && (
                <>
                  <Button
                    variant="destructive"
                    onClick={() => setShowCancellationDialog(true)}
                    className="w-full"
                  >
                    Request Cancellation
                  </Button>
                  
                  {/* WhatsApp Contact Link */}
                  <div className="mt-4 text-center">
                    <p className="text-sm text-muted-foreground mb-2">Need help with your booking?</p>
                    <a
                      href={`https://wa.me/${booking.partners?.phone_number || booking.pickup_locations?.phone_number || '919876543210'}?text=Hi, I need help with my booking ${booking.booking_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                      </svg>
                      Reach out on WhatsApp
                    </a>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {booking && (
          <CancellationDialog
            open={showCancellationDialog}
            onOpenChange={setShowCancellationDialog}
            bookingId={booking.id}
            pickupDate={booking.pickup_date}
            totalAmount={booking.total_amount}
            onSuccess={() => {
              setShowCancellationDialog(false);
              handleSearch(); // Refresh booking data
            }}
          />
        )}
      </div>
    </div>
  );
}
