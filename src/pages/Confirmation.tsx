import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Calendar, Clock, MapPin, Phone, Download, QrCode, CreditCard } from "lucide-react";
import { format } from "date-fns";
import QRCode from "react-qr-code";
import { toast } from "sonner";

const Confirmation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const bookingData = location.state || {};

  const {
    bookingId,
    selectedDate,
    selectedTime,
    selectedDuration,
    phoneNumber,
    email,
    totalAmount,
    totalPayableAtPickup,
    securityDeposit,
    paymentId,
    accessories = [],
    pickupLocation,
    partnerData,
    appliedCoupon,
    discount,
    basePrice,
    accessoriesTotal,
    gst,
  } = bookingData;

  useEffect(() => {
    if (!bookingId) {
      navigate("/book");
    }
  }, [bookingId, navigate]);

  const whatsappMessage = encodeURIComponent(
    `Hi Bolt91!\nMy Booking ID is: ${bookingId}\nI need assistance with my booking.`
  );

  const whatsappNumber = "919845205530";

  const handleDownloadConfirmation = () => {
    toast.success("Preparing download...");
    setTimeout(() => {
      window.print();
    }, 500);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-6 md:py-8">
        <div className="max-w-3xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-6 md:mb-8 animate-fade-in">
            <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-green-100 rounded-full mb-4">
              <CheckCircle className="w-10 h-10 md:w-12 md:h-12 text-green-600" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Booking Confirmed!</h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Your electric bicycle is reserved for your Kashi adventure
            </p>
          </div>

          {/* Important Payment Notice */}
          <Card className="mb-6 border-amber-300 bg-amber-50 dark:bg-amber-950/30">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="flex items-center gap-2">
                  <QrCode className="w-6 h-6 text-amber-600" />
                  <CreditCard className="w-6 h-6 text-amber-600" />
                </div>
                <h3 className="font-bold text-amber-800 dark:text-amber-300 text-lg">
                  Payment at Pickup Point
                </h3>
                <p className="text-amber-700 dark:text-amber-400 text-sm">
                  Scan the QR code at the pickup location to complete your payment and collect your cycle.
                  Show your booking confirmation to the staff.
                </p>
                <div className="bg-white dark:bg-background rounded-lg px-4 py-2 border border-amber-300">
                  <p className="text-xs text-muted-foreground">Total Amount to Pay</p>
                  <p className="text-2xl font-bold text-primary">₹{totalPayableAtPickup || totalAmount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Booking Details */}
          <Card className="mb-6 shadow-warm">
            <CardHeader>
              <CardTitle className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <span>Booking Details</span>
                <span className="text-base md:text-lg font-mono text-primary">{bookingId}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Pickup Date & Time</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedDate && format(new Date(selectedDate), "PPP")}
                      </p>
                      <p className="text-sm text-muted-foreground">{selectedTime}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Duration</p>
                      <p className="text-sm text-muted-foreground">{selectedDuration}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Contact</p>
                      <p className="text-sm text-muted-foreground">{phoneNumber}</p>
                      {email && <p className="text-sm text-muted-foreground">{email}</p>}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Pickup Location</p>
                      {pickupLocation ? (
                        <>
                          <p className="text-sm text-muted-foreground font-medium">{pickupLocation.name}</p>
                          <p className="text-sm text-muted-foreground">{pickupLocation.address}</p>
                          <p className="text-sm text-muted-foreground">
                            {pickupLocation.city}, {pickupLocation.state} - {pickupLocation.pincode}
                          </p>
                          {pickupLocation.google_maps_link && (
                            <a
                              href={pickupLocation.google_maps_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline"
                            >
                              View on Google Maps
                            </a>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">Bolt 91 Base, Varanasi</p>
                      )}
                    </div>
                  </div>

                  {partnerData && (
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 mt-0.5 flex items-center justify-center flex-shrink-0">
                        {partnerData.logo_url ? (
                          <img 
                            src={partnerData.logo_url} 
                            alt={partnerData.name}
                            className="w-5 h-5 object-contain rounded"
                          />
                        ) : (
                          <div className="w-5 h-5 bg-primary/10 rounded flex items-center justify-center text-primary text-xs font-bold">
                            {partnerData.name[0]}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">Booking Partner</p>
                        <p className="text-sm text-muted-foreground font-medium">{partnerData.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {partnerData.partner_type.replace('/', ' / ')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-center justify-center border-t md:border-t-0 md:border-l pt-6 md:pt-0 md:pl-6">
                  <p className="text-sm font-medium mb-4">Booking QR Code</p>
                  <div className="bg-white p-4 rounded-lg shadow">
                    <QRCode value={bookingId || "BOLT91"} size={140} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Show this at pickup
                  </p>
                </div>
              </div>

              {/* Payment Breakdown */}
              <div className="border-t pt-4">
                <p className="font-semibold mb-4 text-lg">Payment Summary</p>
                <div className="space-y-2 text-sm">
                  {/* Cycle Rental */}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cycle Rental ({selectedDuration})</span>
                    <span>₹{basePrice || 0}</span>
                  </div>

                  {/* Accessories */}
                  {accessories.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground mt-2">Accessories:</p>
                      {accessories.map((acc: any) => (
                        <div key={acc.id} className="flex justify-between text-xs pl-4">
                          <span className="text-muted-foreground">
                            {acc.name} × {acc.quantity || 1} × {acc.days} day{acc.days > 1 ? 's' : ''} @ ₹{acc.pricePerDay}/day
                          </span>
                          <span>₹{(acc.pricePerDay || 0) * (acc.days || 0) * (acc.quantity || 1)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-xs font-medium pl-4 pt-1">
                        <span>Accessories Total</span>
                        <span>₹{accessoriesTotal || 0}</span>
                      </div>
                    </div>
                  )}

                  {/* Subtotal */}
                  <div className="flex justify-between text-sm border-t pt-2">
                    <span className="font-medium">Subtotal</span>
                    <span className="font-medium">₹{(basePrice || 0) + (accessoriesTotal || 0)}</span>
                  </div>

                  {/* GST */}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">GST (18%)</span>
                    <span>₹{gst || Math.round(((basePrice || 0) + (accessoriesTotal || 0)) * 0.18)}</span>
                  </div>

                  {/* Discount */}
                  {appliedCoupon && discount > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                        <span>
                          Discount ({appliedCoupon.code} - {appliedCoupon.discount_type === 'percentage' 
                            ? `${appliedCoupon.discount_value}%` 
                            : `₹${appliedCoupon.discount_value}`})
                        </span>
                        <span>-₹{discount}</span>
                      </div>
                    </div>
                  )}

                  {/* Security Deposit */}
                  <div className="border-t pt-2 mt-2 space-y-1">
                    <div className="flex justify-between items-center bg-amber-50 dark:bg-amber-950 -mx-4 px-4 py-2 rounded">
                      <span className="flex items-center gap-1 font-medium">
                        <span className="text-amber-600 dark:text-amber-400">🔒</span>
                        <span className="text-amber-600 dark:text-amber-400">Security Deposit (Refundable)</span>
                      </span>
                      <span className="font-semibold text-amber-600 dark:text-amber-400">₹{securityDeposit || 0}</span>
                    </div>
                    <p className="text-xs text-muted-foreground pl-4 pt-1">
                      Deposit is fully refundable upon return of the cycle in good condition
                    </p>
                  </div>

                  {/* Total Amount */}
                  <div className="flex justify-between border-t-2 border-primary pt-3 mt-3">
                    <span className="font-bold text-lg">Total to Pay at Pickup</span>
                    <span className="font-bold text-primary text-xl">₹{totalPayableAtPickup || totalAmount}</span>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t">
                  <p className="text-xs text-muted-foreground">Booking ID: <span className="font-mono">{bookingId}</span></p>
                  {paymentId && <p className="text-xs text-muted-foreground">Payment ID: <span className="font-mono">{paymentId}</span></p>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* WhatsApp Support */}
          <Card className="shadow-warm border-primary/20">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  Need help or have questions about your booking?
                </p>
                <a
                  href={`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button className="bg-[#25D366] hover:bg-[#20BA5A] text-white">
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                    </svg>
                    Reach Out on WhatsApp
                  </Button>
                </a>
                <p className="text-xs text-muted-foreground">
                  We'll respond as soon as possible to assist you
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row justify-center gap-4 mt-6 print:hidden">
            <Button variant="outline" onClick={handleDownloadConfirmation} className="w-full sm:w-auto">
              <Download className="w-4 h-4 mr-2" />
              Download Confirmation
            </Button>
            <Button onClick={() => navigate("/bookings")} className="w-full sm:w-auto">
              View My Bookings
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Confirmation;