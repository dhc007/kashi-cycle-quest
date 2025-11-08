import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format, addDays, addWeeks, addMonths } from "date-fns";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, Clock, Bike, Glasses, Camera, HardHat, Wrench, Plus, Minus, User, Phone as PhoneIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { PhoneInput } from "@/components/PhoneInput";
import { FileUpload } from "@/components/FileUpload";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Accessory {
  id: string;
  name: string;
  pricePerDay: number;
  icon: any;
  days: number;
  available: number;
}

const Book = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>();
  const [selectedDuration, setSelectedDuration] = useState<string>();
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [cycleData, setCycleData] = useState<any>(null);
  const [partnersData, setPartnersData] = useState<any[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Step 4 - Checkout
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [livePhoto, setLivePhoto] = useState<File | null>(null);
  const [idProof, setIdProof] = useState<File | null>(null);
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");

  // Load cycles, accessories, and partners data
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load cycle data
        const { data: cyclesData, error: cyclesError } = await supabase
          .from('cycles')
          .select('*')
          .eq('is_active', true)
          .single();

        if (cyclesError) throw cyclesError;
        setCycleData(cyclesData);

        // Load accessories
        const { data: accessoriesData, error: accessoriesError } = await supabase
          .from('accessories')
          .select('*')
          .eq('is_active', true);

        if (accessoriesError) throw accessoriesError;

        const iconMap: Record<string, any> = {
          'Meta Ray-Ban Glasses': Glasses,
          'GoPro Camera': Camera,
          'Smart Helmet': HardHat,
          'Pump': Wrench,
        };

        setAccessories(
          accessoriesData.map((acc) => ({
            id: acc.id,
            name: acc.name,
            pricePerDay: Number(acc.price_per_day),
            icon: iconMap[acc.name] || Camera,
            days: 0,
            available: acc.available_quantity || 0,
          }))
        );

        // Load partners
        const { data: partnersData, error: partnersError } = await supabase
          .from('partners')
          .select('*')
          .eq('is_active', true);

        if (partnersError) throw partnersError;
        setPartnersData(partnersData || []);
        if (partnersData && partnersData.length > 0) {
          setSelectedPartner(partnersData[0].id);
        }

      } catch (error: any) {
        console.error('Error loading data:', error);
        toast({
          title: "Error Loading Data",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [toast]);

  // Generate time slots from 6 AM to 10 PM in 30-minute intervals
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 6; hour <= 22; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === 22 && minute > 0) break; // Stop at 10:00 PM
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
        const displayTime = `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
        slots.push({ value: time, label: displayTime });
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Calculate minimum date (2 hours from now)
  const minDate = new Date();
  minDate.setHours(minDate.getHours() + 2);

  // Calculate maximum date (1 year from now)
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 1);

  const canContinue = selectedDate && selectedTime;

  // Get max rental days based on duration
  const getMaxDays = () => {
    if (!selectedDuration) return 30;
    if (selectedDuration === "One Day") return 1;
    if (selectedDuration === "One Week") return 7;
    return 30; // One Month
  };

  const maxAccessoryDays = getMaxDays();

  // Calculate return date based on duration
  const getReturnDate = () => {
    if (!selectedDate || !selectedDuration) return null;
    if (selectedDuration === "One Day") return addDays(selectedDate, 1);
    if (selectedDuration === "One Week") return addWeeks(selectedDate, 1);
    return addMonths(selectedDate, 1);
  };

  const returnDate = getReturnDate();

  // Get base price for selected duration
  const getBasePrice = () => {
    if (!cycleData) return 0;
    if (selectedDuration === "One Day") return Number(cycleData.price_per_day);
    if (selectedDuration === "One Week") return Number(cycleData.price_per_week);
    if (selectedDuration === "One Month") return Number(cycleData.price_per_day) * 30;
    return 0;
  };

  // Get security deposit
  const getSecurityDeposit = () => {
    if (!cycleData) return 0;
    return Number(cycleData.security_deposit);
  };

  // Calculate accessories total
  const accessoriesTotal = accessories.reduce((sum, acc) => sum + (acc.pricePerDay * acc.days), 0);

  // Handle accessory day change
  const updateAccessoryDays = (id: string, change: number) => {
    setAccessories(prev => prev.map(acc => {
      if (acc.id === id) {
        const newDays = Math.max(0, Math.min(maxAccessoryDays, acc.days + change));
        return { ...acc, days: newDays };
      }
      return acc;
    }));
  };

  // Validate checkout form
  const canProceedToPayment = () => {
    return phoneVerified && fullName && livePhoto && idProof && emergencyName && emergencyPhone.length === 10;
  };

  // Handle payment navigation
  const handleProceedToPayment = async () => {
    if (!canProceedToPayment()) {
      toast({
        title: "Incomplete Information",
        description: "Please complete all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!cycleData || !selectedPartner) {
      toast({
        title: "Error",
        description: "Missing cycle or partner data",
        variant: "destructive",
      });
      return;
    }

    // Store files in sessionStorage as base64
    try {
      const filePromises = [];

      if (livePhoto) {
        const promise = new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            sessionStorage.setItem('livePhoto', reader.result as string);
            sessionStorage.setItem('livePhotoName', livePhoto.name);
            resolve(null);
          };
          reader.onerror = () => reject(new Error('Failed to read live photo'));
          reader.readAsDataURL(livePhoto);
        });
        filePromises.push(promise);
      }

      if (idProof) {
        const promise = new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            sessionStorage.setItem('idProof', reader.result as string);
            sessionStorage.setItem('idProofName', idProof.name);
            resolve(null);
          };
          reader.onerror = () => reject(new Error('Failed to read ID proof'));
          reader.readAsDataURL(idProof);
        });
        filePromises.push(promise);
      }

      // Wait for all files to be processed
      await Promise.all(filePromises);

      // Store all booking data in sessionStorage to avoid serialization issues
      const bookingData = {
        selectedDate,
        selectedTime,
        selectedDuration,
        returnDate: returnDate ? format(returnDate, 'yyyy-MM-dd') : null,
        accessories: accessories.filter(acc => acc.days > 0).map(acc => ({
          id: acc.id,
          name: acc.name,
          days: acc.days,
          pricePerDay: acc.pricePerDay
        })),
        phoneNumber,
        email,
        fullName,
        emergencyName,
        emergencyPhone,
        cycleId: cycleData.id,
        partnerId: selectedPartner,
        basePrice: getBasePrice(),
        accessoriesTotal,
        securityDeposit: getSecurityDeposit(),
      };
      
      sessionStorage.setItem('bookingData', JSON.stringify(bookingData));

      // Navigate without state to avoid DataCloneError
      navigate("/payment");
    } catch (error) {
      console.error('Error storing files:', error);
      toast({
        title: "Error",
        description: "Failed to process files. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading booking options...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-4">
            {[
              { num: 1, label: "Select Date & Time" },
              { num: 2, label: "Choose Duration" },
              { num: 3, label: "Add Accessories" },
              { num: 4, label: "Checkout" },
              { num: 5, label: "Payment" }
            ].map((s) => (
              <div key={s.num} className="flex items-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  step >= s.num 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {s.num}
                </div>
                <span className="hidden md:block text-sm">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Booking Form - Left Side */}
            <div className="lg:col-span-2">
              <Card className="shadow-warm">
                <CardHeader>
                  <CardTitle className="text-2xl">Book Your Electric Bicycle</CardTitle>
                </CardHeader>
                <CardContent>
                  {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <CalendarIcon className="w-5 h-5 text-primary" />
                      Select Pickup Date & Time
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Choose when you'd like to start your Kashi adventure
                    </p>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Date Picker */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Pickup Date</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !selectedDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={selectedDate}
                              onSelect={setSelectedDate}
                              disabled={(date) =>
                                date < new Date(new Date().setHours(0, 0, 0, 0)) || date > maxDate
                              }
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* Time Picker */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Pickup Time</label>
                        <Select value={selectedTime} onValueChange={setSelectedTime}>
                          <SelectTrigger className="w-full">
                            <Clock className="mr-2 h-4 w-4" />
                            <SelectValue placeholder="Select time" />
                          </SelectTrigger>
                          <SelectContent>
                            {timeSlots.map((slot) => (
                              <SelectItem key={slot.value} value={slot.value}>
                                {slot.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        <strong>Operating Hours:</strong> 6:00 AM - 10:00 PM
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        <strong>Note:</strong> Minimum 2 hours advance booking required
                      </p>
                    </div>
                  </div>

                  <Button 
                    onClick={() => setStep(2)}
                    disabled={!canContinue}
                    className="w-full bg-gradient-primary hover:opacity-90 disabled:opacity-50"
                  >
                    Continue to Duration Selection
                  </Button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-primary" />
                      Choose Rental Duration
                    </h3>
                    
                    <div className="grid md:grid-cols-3 gap-4">
                      {cycleData && [
                        { duration: "One Day", price: `₹${cycleData.price_per_day}`, deposit: `₹${cycleData.security_deposit}`, hours: "24 hours" },
                        { duration: "One Week", price: `₹${cycleData.price_per_week}`, deposit: `₹${cycleData.security_deposit}`, hours: "7 days" },
                        { duration: "One Month", price: `₹${Number(cycleData.price_per_day) * 30}`, deposit: `₹${cycleData.security_deposit}`, hours: "30 days" }
                      ].map((option) => (
                        <Card 
                          key={option.duration}
                          onClick={() => setSelectedDuration(option.duration)}
                          className={cn(
                            "cursor-pointer hover:shadow-warm transition-all",
                            selectedDuration === option.duration 
                              ? "border-primary border-2 shadow-warm bg-primary/5" 
                              : "hover:border-primary"
                          )}
                        >
                          <CardContent className="pt-6 text-center">
                            <Bike className="w-12 h-12 mx-auto mb-3 text-primary" />
                            <h4 className="font-semibold mb-2">{option.duration}</h4>
                            <p className="text-2xl font-bold text-primary mb-1">{option.price}</p>
                            <p className="text-sm text-muted-foreground mb-2">{option.hours}</p>
                            <p className="text-xs text-muted-foreground">Deposit: {option.deposit}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                      Back
                    </Button>
                    <Button 
                      onClick={() => setStep(3)} 
                      disabled={!selectedDuration}
                      className="flex-1 bg-gradient-primary hover:opacity-90 disabled:opacity-50"
                    >
                      Continue to Accessories
                    </Button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Camera className="w-5 h-5 text-primary" />
                      Add Accessories (Optional)
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Enhance your experience with our premium accessories
                    </p>

                    <div className="space-y-4">
                      {accessories.map((accessory) => {
                        const IconComponent = accessory.icon;
                        return (
                          <Card 
                            key={accessory.id}
                            className={cn(
                              "transition-all hover:shadow-warm",
                              accessory.days > 0 && "border-primary bg-primary/5"
                            )}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center gap-4">
                                <div className="flex-shrink-0">
                                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                    <IconComponent className="w-6 h-6 text-primary" />
                                  </div>
                                </div>
                                
                                <div className="flex-1">
                                  <h4 className="font-semibold">{accessory.name}</h4>
                                  <p className="text-sm text-muted-foreground">
                                    ₹{accessory.pricePerDay}/day • Max {maxAccessoryDays} day{maxAccessoryDays > 1 ? 's' : ''}
                                  </p>
                                </div>

                                <div className="flex items-center gap-3">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => updateAccessoryDays(accessory.id, -1)}
                                    disabled={accessory.days === 0}
                                    className="h-8 w-8"
                                  >
                                    <Minus className="w-4 h-4" />
                                  </Button>
                                  
                                  <div className="w-12 text-center">
                                    <span className="font-semibold text-lg">{accessory.days}</span>
                                    <p className="text-xs text-muted-foreground">day{accessory.days !== 1 ? 's' : ''}</p>
                                  </div>
                                  
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => updateAccessoryDays(accessory.id, 1)}
                                    disabled={accessory.days >= maxAccessoryDays}
                                    className="h-8 w-8"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </Button>

                                  <div className="w-24 text-right">
                                    {accessory.days > 0 ? (
                                      <span className="font-bold text-primary">
                                        ₹{accessory.pricePerDay * accessory.days}
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground text-sm">Not added</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                      Back
                    </Button>
                    <Button onClick={() => setStep(4)} className="flex-1 bg-gradient-primary hover:opacity-90">
                      Continue to Checkout
                    </Button>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                      <User className="w-5 h-5 text-primary" />
                      Checkout Information
                    </h3>

                    <div className="space-y-8">
                      {/* Contact Verification */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Contact Verification</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="fullName">Full Name</Label>
                            <Input
                              id="fullName"
                              type="text"
                              placeholder="Your full name"
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              required
                            />
                          </div>

                          <PhoneInput
                            value={phoneNumber}
                            onChange={setPhoneNumber}
                            onVerified={setPhoneVerified}
                            verified={phoneVerified}
                          />
                          
                          <div className="space-y-2">
                            <Label htmlFor="email">Email Address (Optional)</Label>
                            <Input
                              id="email"
                              type="email"
                              placeholder="your@email.com"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                            />
                          </div>
                        </CardContent>
                      </Card>

                      {/* Identity Verification */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Identity Verification</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <FileUpload
                            label="Live Photo"
                            accept="image/jpeg,image/png"
                            onFileSelect={setLivePhoto}
                            maxSize={10}
                            description="Take a clear photo of yourself"
                          />
                          
                          <FileUpload
                            label="ID Proof (Aadhar Card or Driving License)"
                            accept="image/jpeg,image/png,application/pdf"
                            onFileSelect={setIdProof}
                            maxSize={10}
                            description="Upload a clear copy of your ID"
                          />
                        </CardContent>
                      </Card>

                      {/* Emergency Contact */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Emergency Contact</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="emergencyName">Emergency Contact Name</Label>
                            <Input
                              id="emergencyName"
                              type="text"
                              placeholder="Full name"
                              value={emergencyName}
                              onChange={(e) => setEmergencyName(e.target.value)}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="emergencyPhone">Emergency Contact Number</Label>
                            <Input
                              id="emergencyPhone"
                              type="tel"
                              placeholder="10-digit mobile number"
                              value={emergencyPhone}
                              onChange={(e) => setEmergencyPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                              maxLength={10}
                            />
                          </div>
                        </CardContent>
                      </Card>

                      {/* Pickup Location */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Pickup Location</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {partnersData.length > 0 && (
                            <Select value={selectedPartner} onValueChange={setSelectedPartner}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select pickup location" />
                              </SelectTrigger>
                              <SelectContent>
                                {partnersData.map((partner) => (
                                  <SelectItem key={partner.id} value={partner.id}>
                                    {partner.name} - {partner.city}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          {selectedPartner && partnersData.length > 0 && (
                            <div className="mt-4 space-y-2">
                              {(() => {
                                const partner = partnersData.find(p => p.id === selectedPartner);
                                return partner ? (
                                  <>
                                    <p className="font-medium">{partner.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {partner.address}, {partner.city}, {partner.state} {partner.pincode}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      📞 {partner.phone_number}
                                    </p>
                                  </>
                                ) : null;
                              })()}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button variant="outline" onClick={() => setStep(3)} className="flex-1">
                      Back
                    </Button>
                    <Button 
                      onClick={handleProceedToPayment}
                      disabled={!canProceedToPayment()}
                      className="flex-1 bg-gradient-primary hover:opacity-90 disabled:opacity-50"
                    >
                      Proceed to Payment
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Booking Summary - Right Side */}
        <div className="lg:col-span-1">
          <Card className="shadow-warm border-primary/20 animate-fade-in lg:sticky lg:top-24">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bike className="w-5 h-5 text-primary" />
                Booking Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between pb-3 border-b">
                  <span className="text-muted-foreground">Booking ID:</span>
                  <span className="font-mono font-semibold">BLT-{Date.now().toString().slice(-6)}</span>
                </div>

                {/* Date & Time */}
                {selectedDate && selectedTime && (
                  <div className="space-y-2 animate-fade-in">
                    <div className="flex items-start gap-2">
                      <CalendarIcon className="w-4 h-4 text-primary mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium">Pickup</p>
                        <p className="text-muted-foreground">
                          {format(selectedDate, "PPP")}
                        </p>
                        <p className="text-muted-foreground">
                          {selectedTime && (() => {
                            const [hour, minute] = selectedTime.split(':');
                            const h = parseInt(hour);
                            const period = h >= 12 ? 'PM' : 'AM';
                            const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
                            return `${displayHour}:${minute} ${period}`;
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Duration & Return Date */}
                {selectedDuration && returnDate && (
                  <div className="space-y-2 animate-fade-in">
                    <div className="flex items-start gap-2">
                      <Clock className="w-4 h-4 text-primary mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium">Duration: {selectedDuration}</p>
                        <p className="text-muted-foreground">
                          Return: {format(returnDate, "PPP")}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Accessories */}
                {accessories.some(acc => acc.days > 0) && (
                  <div className="space-y-2 pb-3 border-b animate-fade-in">
                    <p className="font-medium flex items-center gap-2">
                      <Camera className="w-4 h-4 text-primary" />
                      Accessories
                    </p>
                    {accessories.filter(acc => acc.days > 0).map(acc => (
                      <div key={acc.id} className="flex justify-between text-xs ml-6">
                        <span className="text-muted-foreground">
                          {acc.name} ({acc.days}d)
                        </span>
                        <span>₹{acc.pricePerDay * acc.days}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Price Breakdown */}
                {selectedDuration && (
                  <div className="space-y-2 animate-fade-in">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cycle Rental</span>
                      <span className="font-semibold">₹{getBasePrice()}</span>
                    </div>
                    
                    {accessoriesTotal > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Accessories</span>
                        <span className="font-semibold">₹{accessoriesTotal}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Security Deposit</span>
                      <span className="text-muted-foreground">₹{getSecurityDeposit()} (Refundable)</span>
                    </div>
                    
                    <div className="flex justify-between pt-3 border-t">
                      <span className="font-semibold">Total Amount</span>
                      <span className="font-bold text-primary text-lg">
                        ₹{getBasePrice() + accessoriesTotal + getSecurityDeposit()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground text-center mt-1">
                      (Includes ₹{getSecurityDeposit()} refundable deposit)
                    </p>
                  </div>
                )}

                {!selectedDate && !selectedTime && !selectedDuration && (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground text-xs">
                      Start by selecting your pickup date & time
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  </div>
</div>
  );
};

export default Book;
