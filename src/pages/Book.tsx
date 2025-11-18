import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format, addDays, addWeeks, addMonths } from "date-fns";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Clock, Bike, Camera, Plus, Minus, User, MapPin, Phone } from "lucide-react";
import { cn, extractPhoneFromEmail } from "@/lib/utils";
import { PhoneInput } from "@/components/PhoneInput";
import { FileUpload } from "@/components/FileUpload";
import { MediaSlider } from "@/components/MediaSlider";
import { TermsDialog } from "@/components/TermsDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Accessory {
  id: string;
  name: string;
  pricePerDay: number;
  imageUrl: string | null;
  quantity: number; // Number of people using this accessory (0 to numberOfPeople)
  days: number;
  available: number;
  securityDeposit: number;
}

interface PickupLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  landmark: string | null;
  phone_number: string;
  google_maps_link: string | null;
}

interface Partner {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  landmark: string | null;
  phone_number: string;
  google_maps_link: string | null;
  partner_type: "guest_house" | "cafe/retail";
  logo_url: string | null;
}

const Book = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>();
  const [selectedDuration, setSelectedDuration] = useState<string>();
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [cyclesData, setCyclesData] = useState<any[]>([]);
  const [selectedCycles, setSelectedCycles] = useState<any[]>([]); // Array of cycles, one per person
  const [loading, setLoading] = useState(true);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [partnerData, setPartnerData] = useState<Partner | null>(null);
  const [pickupLocations, setPickupLocations] = useState<PickupLocation[]>([]);
  const [selectedPickupLocation, setSelectedPickupLocation] = useState<PickupLocation | null>(null);
  const [pickupLocationConfirmed, setPickupLocationConfirmed] = useState(false);
  const [numberOfPeople, setNumberOfPeople] = useState(1);
  const [maxCycles, setMaxCycles] = useState(10);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [operationHours, setOperationHours] = useState({ start_display: "9:00 AM", end_display: "7:00 PM" });

  // Get partner ID from URL and persist it
  const partnerParam = searchParams.get("partner");

  useEffect(() => {
    // Clear any stale booking data on mount
    sessionStorage.removeItem("bookingData");

    if (partnerParam) {
      localStorage.setItem("activePartner", partnerParam);
      setPartnerId(partnerParam);
    } else {
      const storedPartner = localStorage.getItem("activePartner");
      if (storedPartner) {
        setPartnerId(storedPartner);
      }
    }
  }, [partnerParam]);

  // Authentication state
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);

  // Step 4 - Checkout
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [livePhoto, setLivePhoto] = useState<File | null>(null);
  const [idProof, setIdProof] = useState<File | null>(null);
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");

  // Terms and conditions
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsDialog, setShowTermsDialog] = useState(false);

  // Check authentication and load profile
  useEffect(() => {
    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setAuthChecking(false);
    });

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setAuthChecking(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authChecking && !user) {
      toast({
        title: "Login Required",
        description: "Please login to book a ride",
      });
      navigate("/user-login");
    }
  }, [user, authChecking, navigate, toast]);

  // Fetch profile data when user is authenticated
  useEffect(() => {
    if (user?.id) {
      fetchUserProfile(user.id);
    } else if (user) {
      // User is logged in but no profile data yet
      setPhoneVerified(true);
    }
  }, [user]);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("user_id", userId).single();

      // Extract phone from authentication data
      const phoneFromMetadata = user?.user_metadata?.phone;
      const phoneFromEmail = user?.email ? extractPhoneFromEmail(user.email) : null;
      const authPhone = phoneFromMetadata || phoneFromEmail || "";

      if (data) {
        setProfileData(data);
        // Pre-fill form fields
        setFirstName(data.first_name || "");
        setLastName(data.last_name || "");
        // Use profile phone first, then auth phone
        const userPhone = data.phone_number || authPhone;
        setPhoneNumber(userPhone);
        setEmail(data.email || "");
        setEmergencyName(data.emergency_contact_name || "");
        setEmergencyPhone(data.emergency_contact_phone || "");
        // Mark phone as verified since they're logged in
        setPhoneVerified(true);
      } else if (error) {
        console.log("Profile not found, user can create one during booking");
        // Set phone from auth data even if profile doesn't exist
        setPhoneNumber(authPhone);
        setPhoneVerified(true);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      // Still try to set phone from auth data on error
      const phoneFromMetadata = user?.user_metadata?.phone;
      const phoneFromEmail = user?.email ? extractPhoneFromEmail(user.email) : null;
      setPhoneNumber(phoneFromMetadata || phoneFromEmail || "");
    }
  };

  // Fetch partner data if partner ID is present
  useEffect(() => {
    const fetchPartnerData = async () => {
      if (partnerId) {
        const { data, error } = await supabase.from("partners").select("*").eq("id", partnerId).single();

        if (data && !error) {
          setPartnerData(data as Partner);
        }
      }
    };

    fetchPartnerData();
  }, [partnerId]);

  // Auto-select pickup location based on partner type
  useEffect(() => {
    if (partnerData && pickupLocations.length > 0) {
      if (partnerData.partner_type === "guest_house") {
        // For guest house, ALWAYS use partner's location as pickup
        const partnerLocation: PickupLocation = {
          id: partnerData.id,
          name: partnerData.name,
          address: partnerData.address,
          city: partnerData.city,
          state: partnerData.state,
          pincode: partnerData.pincode,
          landmark: partnerData.landmark,
          phone_number: partnerData.phone_number,
          google_maps_link: partnerData.google_maps_link,
        };
        setSelectedPickupLocation(partnerLocation);
        console.log("Guest house pickup location set:", partnerLocation);
      } else if (!selectedPickupLocation) {
        // For cafe/retail, use Bolt 91 Base only if not already set
        const bolt91Base = pickupLocations.find(
          (loc) => loc.name.toLowerCase().includes("bolt 91 base") || loc.name.toLowerCase().includes("bolt91 base"),
        );
        if (bolt91Base) {
          setSelectedPickupLocation(bolt91Base);
        }
      }
    } else if (!partnerData && pickupLocations.length > 0 && !selectedPickupLocation) {
      // Direct booking - use Bolt 91 Base
      const bolt91Base = pickupLocations.find(
        (loc) => loc.name.toLowerCase().includes("bolt 91 base") || loc.name.toLowerCase().includes("bolt91 base"),
      );
      if (bolt91Base) {
        setSelectedPickupLocation(bolt91Base);
      }
    }
  }, [partnerData, pickupLocations]);

  // Load cycles, accessories, and partners data
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load all active cycles
        const { data: cyclesDataResponse, error: cyclesError } = await supabase
          .from("cycles")
          .select("*")
          .eq("is_active", true);

        if (cyclesError) throw cyclesError;
        setCyclesData(cyclesDataResponse || []);

        // Load accessories
        const { data: accessoriesData, error: accessoriesError } = await supabase
          .from("accessories")
          .select("*")
          .eq("is_active", true);

        if (accessoriesError) throw accessoriesError;

        setAccessories(
          (accessoriesData || []).map((acc) => ({
            id: acc.id,
            name: acc.name,
            pricePerDay: Number(acc.price_per_day),
            imageUrl: acc.image_url,
            quantity: 0, // Number of people using this accessory
            days: 0,
            available: acc.available_quantity || 0,
            securityDeposit: Number(acc.security_deposit || 0),
          })),
        );

        // Load pickup locations
        const { data: locationsData, error: locationsError } = await supabase
          .from("pickup_locations")
          .select("*")
          .eq("is_active", true);

        if (locationsError) throw locationsError;
        setPickupLocations(locationsData || []);

        // Auto-select Bolt 91 Base if booking directly or no partner
        const bolt91Base = (locationsData || []).find(
          (loc) => loc.name.toLowerCase().includes("bolt 91 base") || loc.name.toLowerCase().includes("bolt91 base"),
        );

        if (bolt91Base && !partnerId) {
          setSelectedPickupLocation(bolt91Base);
        }

        // Load max cycles setting
        const { data: settingsData } = await supabase
          .from("system_settings")
          .select("value")
          .eq("key", "max_cycles_per_booking")
          .single();

        if (settingsData?.value && typeof settingsData.value === "object" && "value" in settingsData.value) {
          setMaxCycles((settingsData.value as { value: number }).value);
        }

        // Load operation hours setting
        const { data: hoursData } = await supabase
          .from("system_settings")
          .select("value")
          .eq("key", "operation_hours")
          .single();

        if (hoursData?.value && typeof hoursData.value === "object") {
          const hours = hoursData.value as { start_display?: string; end_display?: string };
          if (hours.start_display && hours.end_display) {
            setOperationHours({ start_display: hours.start_display, end_display: hours.end_display });
          }
        }
      } catch (error: any) {
        console.error("Error loading data:", error);
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

  // Generate time slots based on operation hours in 30-minute intervals
  const generateTimeSlots = () => {
    const slots = [];
    
    // Parse operation hours (format: "9:00 AM" to "7:00 PM")
    const parseTime = (timeStr: string) => {
      const [time, period] = timeStr.split(' ');
      const [hours, minutes] = time.split(':').map(Number);
      let hour24 = hours;
      if (period === 'PM' && hours !== 12) hour24 = hours + 12;
      if (period === 'AM' && hours === 12) hour24 = 0;
      return { hour: hour24, minute: minutes };
    };

    const startTime = parseTime(operationHours.start_display);
    const endTime = parseTime(operationHours.end_display);
    
    let currentHour = startTime.hour;
    let currentMinute = startTime.minute;
    
    while (currentHour < endTime.hour || (currentHour === endTime.hour && currentMinute <= endTime.minute)) {
      const time = `${currentHour.toString().padStart(2, "0")}:${currentMinute.toString().padStart(2, "0")}`;
      const period = currentHour >= 12 ? "PM" : "AM";
      const displayHour = currentHour > 12 ? currentHour - 12 : currentHour === 0 ? 12 : currentHour;
      const displayTime = `${displayHour}:${currentMinute.toString().padStart(2, "0")} ${period}`;
      slots.push({ value: time, label: displayTime });
      
      currentMinute += 30;
      if (currentMinute >= 60) {
        currentMinute = 0;
        currentHour++;
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
    if (selectedDuration === "One Month") return 30;
    return 30;
  };

  const maxAccessoryDays = getMaxDays();

  // Calculate return date based on duration
  const getReturnDate = () => {
    if (!selectedDate || !selectedDuration) return null;
    if (selectedDuration === "One Day") return addDays(selectedDate, 1);
    if (selectedDuration === "One Week") return addWeeks(selectedDate, 1);
    if (selectedDuration === "One Month") return addMonths(selectedDate, 1);
    return null;
  };

  const returnDate = getReturnDate();

  // Get base price for selected cycles (sum of all selected cycles)
  const getBasePrice = () => {
    if (selectedCycles.length === 0) return 0;
    return selectedCycles.reduce((sum, cycle) => {
      if (selectedDuration === "One Day") return sum + Number(cycle.price_per_day);
      if (selectedDuration === "One Week") return sum + Number(cycle.price_per_week);
      if (selectedDuration === "One Month") return sum + Number(cycle.price_per_month || cycle.price_per_day * 30);
      return sum;
    }, 0);
  };

  // Get security deposit based on duration and number of people
  const getSecurityDeposit = () => {
    if (selectedCycles.length === 0) return 0;
    const perPersonDeposit = (() => {
      const firstCycle = selectedCycles[0];
      if (selectedDuration === "One Day") return Number(firstCycle.security_deposit_day || 2000);
      if (selectedDuration === "One Week") return Number(firstCycle.security_deposit_week || 3000);
      if (selectedDuration === "One Month") return Number(firstCycle.security_deposit_month || 5000);
      return Number(firstCycle.security_deposit || 2000);
    })();
    return perPersonDeposit * numberOfPeople; // Multiply by number of people
  };

  // Calculate accessories total (quantity * days * price per day)
  const accessoriesTotal = accessories.reduce((sum, acc) => sum + acc.quantity * acc.pricePerDay * acc.days, 0);

  // Calculate accessories security deposit (quantity * security deposit)
  const accessoriesDeposit = accessories.reduce((sum, acc) => sum + (acc.quantity > 0 ? acc.quantity * acc.securityDeposit : 0), 0);

  // Handle accessory quantity change
  const updateAccessoryQuantity = (id: string, change: number) => {
    setAccessories((prev) =>
      prev.map((acc) => {
        if (acc.id === id) {
          // Check if this accessory is free with any selected cycle
          const isFreeAccessory = selectedCycles.some((cycle) => cycle?.free_accessories?.includes(id));

          // Don't allow adding free accessories
          if (isFreeAccessory && change > 0) {
            toast({
              title: "Already Included",
              description: "This accessory is already included for free with your selected cycle.",
              variant: "default",
            });
            return acc;
          }

          const newQuantity = Math.max(0, Math.min(numberOfPeople, acc.quantity + change));
          return { ...acc, quantity: newQuantity, days: newQuantity > 0 ? acc.days || 1 : 0 };
        }
        return acc;
      }),
    );
  };

  // Handle accessory day change
  const updateAccessoryDays = (id: string, change: number) => {
    setAccessories((prev) =>
      prev.map((acc) => {
        if (acc.id === id && acc.quantity > 0) {
          const newDays = Math.max(1, Math.min(maxAccessoryDays, acc.days + change));
          return { ...acc, days: newDays };
        }
        return acc;
      }),
    );
  };

  // Validate checkout form
  const canProceedToPayment = () => {
    // For logged-in users: phone is automatically valid since they logged in with it
    const isPhoneValid = user ? phoneNumber.length === 10 : phoneVerified;

    const hasFirstName = !!firstName && firstName.trim().length > 0;
    const hasLastName = !!lastName && lastName.trim().length > 0;

    // Skip verification if user already has them in profile
    const hasLivePhoto = !!livePhoto || !!profileData?.live_photo_url;
    const hasIdProof = !!idProof || !!profileData?.id_proof_url;

    const isValid = isPhoneValid && hasFirstName && hasLastName && hasLivePhoto && hasIdProof && termsAccepted;

    return isValid;
  };

  // Get missing requirements for helpful error message
  const getMissingRequirements = () => {
    const missing = [];
    const isPhoneValid = user ? phoneNumber.length === 10 : phoneVerified;

    if (!isPhoneValid) missing.push("valid phone number");
    if (!firstName) missing.push("first name");
    if (!lastName) missing.push("last name");
    if (!livePhoto && !profileData?.live_photo_url) missing.push("live photo");
    if (!idProof && !profileData?.id_proof_url) missing.push("ID proof");
    if (!termsAccepted) missing.push("terms acceptance");

    return missing;
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

    if (selectedCycles.length !== numberOfPeople) {
      toast({
        title: "Error",
        description: `Please select a cycle for all ${numberOfPeople} ${numberOfPeople === 1 ? "person" : "people"}`,
        variant: "destructive",
      });
      return;
    }

    // Check availability before proceeding
    try {
      // Check availability for each selected cycle
      for (let i = 0; i < selectedCycles.length; i++) {
        const cycle = selectedCycles[i];
        const { data: cycleAvailable, error: cycleError } = await supabase.rpc("check_cycle_availability", {
          p_cycle_id: cycle.id,
          p_pickup_date: format(selectedDate!, "yyyy-MM-dd"),
          p_return_date: returnDate ? format(returnDate, "yyyy-MM-dd") : format(selectedDate!, "yyyy-MM-dd"),
        });

        if (cycleError) throw cycleError;

        if (!cycleAvailable || cycleAvailable < 1) {
          toast({
            title: "Cycle Unavailable",
            description: `${cycle.name} is not available for the selected dates for Person ${i + 1}.`,
            variant: "destructive",
          });
          return;
        }
      }

      // Check each accessory
      for (const acc of accessories.filter((a) => a.quantity > 0 && a.days > 0)) {
        const { data: accAvailable, error: accError } = await supabase.rpc("check_accessory_availability", {
          p_accessory_id: acc.id,
          p_pickup_date: format(selectedDate!, "yyyy-MM-dd"),
          p_return_date: returnDate ? format(returnDate, "yyyy-MM-dd") : format(selectedDate!, "yyyy-MM-dd"),
        });

        if (accError) throw accError;

        if (!accAvailable || accAvailable < acc.quantity) {
          toast({
            title: "Accessory Unavailable",
            description: `Only ${accAvailable} units of ${acc.name} available, but you need ${acc.quantity}.`,
            variant: "destructive",
          });
          return;
        }
      }
    } catch (error) {
      console.error("Error checking availability:", error);
      toast({
        title: "Error",
        description: "Failed to check availability. Please try again.",
        variant: "destructive",
      });
      return;
    }

    // Upload files to Supabase storage
    try {
      toast({
        title: "Uploading files...",
        description: "Please wait while we process your documents",
      });

      let livePhotoUrl = profileData?.live_photo_url || "";
      let idProofUrl = profileData?.id_proof_url || "";

      // Upload live photo only if new one is provided
      if (livePhoto) {
        // Use user ID in path for RLS policy
        const userId = user?.id || session?.user?.id;
        if (!userId) {
          throw new Error("User must be authenticated to upload documents");
        }
        const fileName = `${userId}/${Date.now()}_${livePhoto.name}`;
        const { data, error } = await supabase.storage.from("booking-documents").upload(fileName, livePhoto, {
          cacheControl: "3600",
          upsert: false,
        });

        if (error) throw new Error("Failed to upload live photo");

        const {
          data: { publicUrl },
        } = supabase.storage.from("booking-documents").getPublicUrl(fileName);

        livePhotoUrl = publicUrl;
      }

      // Upload ID proof only if new one is provided
      if (idProof) {
        // Use user ID in path for RLS policy
        const userId = user?.id || session?.user?.id;
        if (!userId) {
          throw new Error("User must be authenticated to upload documents");
        }
        const fileName = `${userId}/${Date.now()}_${idProof.name}`;
        const { data, error } = await supabase.storage.from("booking-documents").upload(fileName, idProof, {
          cacheControl: "3600",
          upsert: false,
        });

        if (error) throw new Error("Failed to upload ID proof");

        const {
          data: { publicUrl },
        } = supabase.storage.from("booking-documents").getPublicUrl(fileName);

        idProofUrl = publicUrl;
      }

      // Update user profile with live photo and ID proof
      if (user && (livePhotoUrl || idProofUrl)) {
        const updateData: any = {
          updated_at: new Date().toISOString(),
        };
        if (livePhotoUrl) updateData.live_photo_url = livePhotoUrl;
        if (idProofUrl) updateData.id_proof_url = idProofUrl;

        // Also update names if provided
        if (firstName) updateData.first_name = firstName;
        if (lastName) updateData.last_name = lastName;

        console.log("Updating profile with documents:", updateData);

        const { error: profileError } = await supabase.from("profiles").update(updateData).eq("user_id", user.id);

        if (profileError) {
          console.error("Error updating profile with documents:", profileError);
          toast({
            title: "Warning",
            description: "Documents uploaded but profile update failed. Continuing with booking...",
            variant: "destructive",
          });
        } else {
          console.log("Profile updated successfully with documents");
        }
      }

      const bookingData = {
        selectedDate,
        selectedTime,
        selectedDuration,
        returnDate: returnDate ? format(returnDate, "yyyy-MM-dd") : null,
        returnTime: selectedTime,
        partnerId,
        pickupLocationId: selectedPickupLocation?.id,
        pickupLocation: selectedPickupLocation
          ? {
              name: selectedPickupLocation.name,
              address: selectedPickupLocation.address,
              city: selectedPickupLocation.city,
              state: selectedPickupLocation.state,
              pincode: selectedPickupLocation.pincode,
              phone_number: selectedPickupLocation.phone_number,
              google_maps_link: selectedPickupLocation.google_maps_link,
            }
          : null,
        numberOfPeople,
        cycleId: selectedCycles[0]?.id,
        cycleName: selectedCycles[0]?.name,
        cycleModel: selectedCycles[0]?.model,
        selectedCycles: selectedCycles.map((cycle) => ({
          id: cycle.id,
          name: cycle.name,
          model: cycle.model,
        })),
        accessories: accessories
          .filter((acc) => acc.quantity > 0 && acc.days > 0)
          .map((acc) => ({
            id: acc.id,
            name: acc.name,
            quantity: acc.quantity,
            days: acc.days,
            pricePerDay: acc.pricePerDay,
          })),
        phoneNumber,
        email,
        firstName,
        lastName,
        emergencyName,
        emergencyPhone,
        basePrice: getBasePrice(),
        accessoriesTotal,
        securityDeposit: getSecurityDeposit(),
        livePhotoUrl,
        idProofUrl,
        termsAcceptedAt: new Date().toISOString(),
        termsVersion: "v1.0",
      };

      sessionStorage.setItem("bookingData", JSON.stringify(bookingData));
      navigate("/payment");
    } catch (error) {
      console.error("Error uploading files:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process files. Please try again.",
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
              { num: 2, label: "Select Cycles" },
              { num: 3, label: "Choose Duration" },
              { num: 4, label: "Add Accessories" },
              ...(partnerId ? [] : [{ num: 5, label: "Pickup Location" }]),
              { num: partnerId ? 5 : 6, label: "Checkout" },
            ].map((s) => (
              <div key={s.num} className="flex items-center gap-2">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    step >= s.num ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {s.num}
                </div>
                <span className="hidden md:block text-sm">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Booking Form - Second on mobile, First on desktop */}
            <div className="lg:col-span-2 order-2 lg:order-1">
              <Card className="shadow-warm">
                <CardHeader>
                  <CardTitle className="text-2xl">Book Your Electric Bicycle</CardTitle>
                  {partnerData && (
                    <div className="mt-4 space-y-3">
                      <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                        <div className="flex items-start gap-4">
                          {partnerData.logo_url && (
                            <div className="flex-shrink-0">
                              <img 
                                src={partnerData.logo_url} 
                                alt={`${partnerData.name} logo`}
                                className="h-16 w-16 object-contain rounded-lg bg-background p-2 border"
                              />
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="text-sm text-muted-foreground mb-1">Booking through partner:</p>
                            <p className="text-lg font-semibold text-primary">{partnerData.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {partnerData.address}, {partnerData.city}
                            </p>
                          </div>
                        </div>
                      </div>
                      {selectedPickupLocation && (
                        <div className="p-4 bg-muted/50 border rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            Pickup at:
                          </p>
                          <p className="font-semibold">{selectedPickupLocation.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {selectedPickupLocation.address}, {selectedPickupLocation.city}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
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
                            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !selectedDate && "text-muted-foreground",
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
                                  onSelect={(date) => {
                                    setSelectedDate(date);
                                    setDatePickerOpen(false);
                                  }}
                                  disabled={(date) => {
                                    const today = new Date(new Date().setHours(0, 0, 0, 0));
                                    const minBookingDate = new Date(2025, 11, 1); // December 1st, 2025 (month is 0-indexed)
                                    const earliestDate = minBookingDate > today ? minBookingDate : today;
                                    return date < earliestDate || date > maxDate;
                                  }}
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

                          {/* Number of People */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Number of People</label>
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={numberOfPeople || ""}
                              onChange={(e) => {
                                const rawValue = e.target.value;
                                // Allow empty string for backspace
                                if (rawValue === "") {
                                  setNumberOfPeople(0);
                                  return;
                                }
                                const value = parseInt(rawValue);
                                if (isNaN(value)) return;

                                if (value > maxCycles) {
                                  toast({
                                    title: "Maximum Limit",
                                    description: `You can book a maximum of ${maxCycles} cycles at once.`,
                                    variant: "destructive",
                                  });
                                  setNumberOfPeople(maxCycles);
                                } else if (value < 1) {
                                  setNumberOfPeople(0);
                                } else {
                                  setNumberOfPeople(value);
                                }
                              }}
                              onBlur={() => {
                                // Reset to 1 if empty when focus is lost
                                if (numberOfPeople === 0 || !numberOfPeople) {
                                  setNumberOfPeople(1);
                                }
                              }}
                              placeholder="How many people?"
                            />
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">
                                {numberOfPeople > 0
                                  ? `${numberOfPeople} cycle${numberOfPeople > 1 ? "s" : ""} will be booked`
                                  : "Enter number of people"}
                              </p>
                              <p className="text-xs text-muted-foreground">Maximum {maxCycles} cycles per booking</p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 p-3 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground">
                            <strong>Operating Hours:</strong> {operationHours.start_display} - {operationHours.end_display}
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
                        {cyclesData.length > 1 ? "Continue to Cycle Selection" : "Continue to Duration Selection"}
                      </Button>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <Bike className="w-5 h-5 text-primary" />
                          Select Cycles for Each Person
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          Choose a cycle for each of the {numberOfPeople} {numberOfPeople === 1 ? "person" : "people"}
                        </p>

                        {Array.from({ length: numberOfPeople }).map((_, personIndex) => (
                          <div key={personIndex} className="mb-6">
                            <h4 className="text-sm font-semibold mb-3 text-primary">Person {personIndex + 1}</h4>
                            <div className="grid md:grid-cols-2 gap-4">
                              {cyclesData.map((cycle) => {
                                const isSelected = selectedCycles[personIndex]?.id === cycle.id;
                                const freeAccessories = cycle.free_accessories || [];
                                // Handle specifications - could be string, array, object, or null
                                let specifications: string[] = [];
                                if (Array.isArray(cycle.specifications)) {
                                  specifications = cycle.specifications.filter(
                                    (s) => typeof s === "string" && s.trim(),
                                  );
                                } else if (typeof cycle.specifications === "string" && cycle.specifications.trim()) {
                                  specifications = cycle.specifications.split("\n").filter((s) => s.trim());
                                } else if (cycle.specifications && typeof cycle.specifications === "object") {
                                  // Handle case where it might be stored as {0: 'spec1', 1: 'spec2'}
                                  const values = Object.values(cycle.specifications);
                                  if (values.length > 0 && typeof values[0] === "string") {
                                    specifications = values.filter(
                                      (s) => typeof s === "string" && s.trim(),
                                    ) as string[];
                                  }
                                }

                                return (
                                  <Card
                                    key={cycle.id}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      const newSelectedCycles = [...selectedCycles];
                                      newSelectedCycles[personIndex] = cycle;
                                      setSelectedCycles(newSelectedCycles);
                                    }}
                                    className={cn(
                                      "cursor-pointer hover:shadow-warm transition-all select-none",
                                      isSelected
                                        ? "border-primary border-2 shadow-warm bg-primary/5"
                                        : "hover:border-primary",
                                    )}
                                  >
                                    <CardContent className="p-4">
                                      {/* Show MediaSlider if media_urls exist, otherwise show single image */}
                                      {cycle.media_urls && cycle.media_urls.length > 0 ? (
                                        <MediaSlider mediaUrls={cycle.media_urls} alt={cycle.name} className="mb-3" />
                                      ) : cycle.image_url ? (
                                        <img
                                          src={cycle.image_url}
                                          alt={cycle.name}
                                          className="w-full h-40 object-cover rounded-lg mb-3 pointer-events-none"
                                        />
                                      ) : null}

                                      <h4 className="font-semibold text-lg mb-1">{cycle.name}</h4>
                                      <p className="text-sm text-muted-foreground mb-3">{cycle.model}</p>

                                      <div className="grid grid-cols-2 gap-3 text-xs">
                                        {/* Inclusions */}
                                        <div className="space-y-1">
                                          <p className="font-semibold text-primary">Inclusions:</p>
                                          {freeAccessories.length > 0 ? (
                                            <ul className="space-y-0.5 text-muted-foreground">
                                              {freeAccessories.map((acc: string, i: number) => {
                                                const accessory = accessories.find((a) => a.id === acc);
                                                return accessory ? <li key={i}>• {accessory.name}</li> : null;
                                              })}
                                            </ul>
                                          ) : (
                                            <p className="text-muted-foreground">No inclusions</p>
                                          )}
                                        </div>

                                        {/* Specifications */}
                                        <div className="space-y-1">
                                          <p className="font-semibold text-primary">Specs:</p>
                                          {specifications.length > 0 ? (
                                            <ul className="space-y-0.5 text-muted-foreground">
                                              {specifications.slice(0, 3).map((spec: string, idx: number) => (
                                                <li key={idx} className="text-[10px] leading-tight">
                                                  • {spec}
                                                </li>
                                              ))}
                                              {specifications.length > 3 && (
                                                <li className="text-[10px] text-primary">
                                                  +{specifications.length - 3} more
                                                </li>
                                              )}
                                            </ul>
                                          ) : (
                                            <p className="text-muted-foreground">Standard specs</p>
                                          )}
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-4">
                        <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                          Back
                        </Button>
                        <Button
                          onClick={() => setStep(3)}
                          disabled={
                            selectedCycles.length !== numberOfPeople ||
                            selectedCycles.filter((c) => c).length !== numberOfPeople
                          }
                          className="flex-1 bg-gradient-primary hover:opacity-90 disabled:opacity-50"
                        >
                          Continue to Duration
                        </Button>
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <Clock className="w-5 h-5 text-primary" />
                          Choose Rental Duration
                        </h3>

                        <div className="grid md:grid-cols-3 gap-4">
                          {selectedCycles.length > 0 &&
                            selectedCycles[0] &&
                            [
                              {
                                duration: "One Day",
                                price: `₹${selectedCycles[0].price_per_day}`,
                                deposit: `₹${selectedCycles[0].security_deposit_day || 2000}`,
                                hours: "24 hours",
                              },
                              {
                                duration: "One Week",
                                price: `₹${selectedCycles[0].price_per_week}`,
                                deposit: `₹${selectedCycles[0].security_deposit_week || 3000}`,
                                hours: "7 days",
                              },
                              {
                                duration: "One Month",
                                price: `₹${selectedCycles[0].price_per_month || Number(selectedCycles[0].price_per_day) * 30}`,
                                deposit: `₹${selectedCycles[0].security_deposit_month || 5000}`,
                                hours: "30 days",
                              },
                            ].map((option) => (
                              <Card
                                key={option.duration}
                                onClick={() => setSelectedDuration(option.duration)}
                                className={cn(
                                  "cursor-pointer hover:shadow-warm transition-all",
                                  selectedDuration === option.duration
                                    ? "border-primary border-2 shadow-warm bg-primary/5"
                                    : "hover:border-primary",
                                )}
                              >
                                <CardContent className="pt-6 text-center">
                                  <Bike className="w-12 h-12 mx-auto mb-3 text-primary" />
                                  <h4 className="font-semibold mb-2">{option.duration}</h4>
                                  <p className="text-2xl font-bold text-primary mb-1">{option.price}</p>
                                  <p className="text-sm text-muted-foreground mb-2">{option.hours}</p>
                                  <p className="text-xs text-muted-foreground">Per person deposit: {option.deposit}</p>
                                </CardContent>
                              </Card>
                            ))}
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                          Back
                        </Button>
                        <Button
                          onClick={() => setStep(4)}
                          disabled={!selectedDuration}
                          className="flex-1 bg-gradient-primary hover:opacity-90 disabled:opacity-50"
                        >
                          Continue to Accessories
                        </Button>
                      </div>
                    </div>
                  )}

                  {step === 4 && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <Camera className="w-5 h-5 text-primary" />
                          Add Accessories (Optional)
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          Select quantity (max {numberOfPeople}) and days for each accessory
                        </p>

                        <div className="space-y-4">
                          {accessories
                            .filter((accessory) => {
                              // Filter out accessories that are free with any selected cycle
                              const isFree = selectedCycles.some((cycle) =>
                                cycle?.free_accessories?.includes(accessory.id),
                              );
                              return !isFree;
                            })
                            .map((accessory) => (
                              <Card
                                key={accessory.id}
                                className={cn(
                                  "transition-all hover:shadow-warm",
                                  accessory.quantity > 0 && "border-primary bg-primary/5",
                                )}
                              >
                                <CardContent className="p-3 sm:p-4">
                                  <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                                    <div className="flex-shrink-0 w-full sm:w-auto">
                                      {accessory.imageUrl ? (
                                        <img
                                          src={accessory.imageUrl}
                                          alt={accessory.name}
                                          className="w-full sm:w-16 h-32 sm:h-16 object-cover rounded-lg"
                                        />
                                      ) : (
                                        <div className="w-full sm:w-16 h-32 sm:h-16 rounded-lg bg-primary/10 flex items-center justify-center">
                                          <Camera className="w-8 h-8 text-primary" />
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex-1 w-full">
                                      <div className="flex justify-between items-start mb-2">
                                        <div>
                                          <h4 className="font-semibold">{accessory.name}</h4>
                                          <p className="text-sm text-muted-foreground">
                                            ₹{accessory.pricePerDay}/day per person
                                          </p>
                                        </div>
                                        <div className="text-right sm:hidden">
                                          {accessory.quantity > 0 ? (
                                            <div>
                                              <span className="font-bold text-primary">
                                                ₹{accessory.pricePerDay * accessory.quantity * accessory.days}
                                              </span>
                                              <p className="text-xs text-muted-foreground">
                                                {accessory.quantity} × {accessory.days}d
                                              </p>
                                            </div>
                                          ) : (
                                            <span className="text-muted-foreground text-sm">Not added</span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Quantity selector */}
                                      <div className="mt-3 flex flex-wrap items-center gap-2">
                                        <span className="text-xs text-muted-foreground min-w-[60px]">Quantity:</span>
                                        <div className="flex items-center gap-2">
                                          <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => updateAccessoryQuantity(accessory.id, -1)}
                                            disabled={accessory.quantity === 0}
                                            className="h-7 w-7"
                                          >
                                            <Minus className="w-3 h-3" />
                                          </Button>

                                          <span className="font-semibold text-sm w-8 text-center">
                                            {accessory.quantity}
                                          </span>

                                          <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => updateAccessoryQuantity(accessory.id, 1)}
                                            disabled={accessory.quantity >= numberOfPeople}
                                            className="h-7 w-7"
                                          >
                                            <Plus className="w-3 h-3" />
                                          </Button>

                                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                                            (max {numberOfPeople})
                                          </span>
                                        </div>
                                      </div>

                                      {/* Days selector */}
                                      {accessory.quantity > 0 && (
                                        <div className="mt-2 flex flex-wrap items-center gap-2">
                                          <span className="text-xs text-muted-foreground min-w-[60px]">Days:</span>
                                          <div className="flex items-center gap-2">
                                            <Button
                                              variant="outline"
                                              size="icon"
                                              onClick={() => updateAccessoryDays(accessory.id, -1)}
                                              disabled={accessory.days <= 1}
                                              className="h-7 w-7"
                                            >
                                              <Minus className="w-3 h-3" />
                                            </Button>

                                            <span className="font-semibold text-sm w-8 text-center">
                                              {accessory.days}
                                            </span>

                                            <Button
                                              variant="outline"
                                              size="icon"
                                              onClick={() => updateAccessoryDays(accessory.id, 1)}
                                              disabled={accessory.days >= maxAccessoryDays}
                                              className="h-7 w-7"
                                            >
                                              <Plus className="w-3 h-3" />
                                            </Button>

                                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                                              (max {maxAccessoryDays})
                                            </span>
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    <div className="hidden sm:block text-right min-w-[80px]">
                                      {accessory.quantity > 0 ? (
                                        <div>
                                          <span className="font-bold text-primary">
                                            ₹{accessory.pricePerDay * accessory.quantity * accessory.days}
                                          </span>
                                          <p className="text-xs text-muted-foreground">
                                            {accessory.quantity} × {accessory.days}d
                                          </p>
                                        </div>
                                      ) : (
                                        <span className="text-muted-foreground text-sm">Not added</span>
                                      )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                        </div>
                      </div>

                        <div className="flex gap-4">
                        <Button variant="outline" onClick={() => setStep(3)} className="flex-1">
                          Back
                        </Button>
                        <Button 
                          onClick={() => {
                            if (partnerId) {
                              // Skip pickup location step for partner bookings
                              setPickupLocationConfirmed(true);
                              setStep(5);
                            } else {
                              setStep(5);
                            }
                          }} 
                          className="flex-1 bg-gradient-primary hover:opacity-90"
                        >
                          {partnerId ? 'Continue to Checkout' : 'Continue to Pickup Location'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {step === 5 && !partnerId && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <MapPin className="w-5 h-5 text-primary" />
                          Pickup Location
                        </h3>

                        {selectedPickupLocation && (
                          <Card className="border-primary border-2 bg-primary/5">
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <MapPin className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h4 className="font-semibold">{selectedPickupLocation.name}</h4>
                                    <Badge variant="secondary" className="text-xs">
                                      Default Location
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground mb-1">{selectedPickupLocation.address}</p>
                                  {selectedPickupLocation.landmark && (
                                    <p className="text-sm text-muted-foreground mb-1">
                                      Near {selectedPickupLocation.landmark}
                                    </p>
                                  )}
                                  <p className="text-sm text-muted-foreground mb-2">
                                    {selectedPickupLocation.city}, {selectedPickupLocation.state} -{" "}
                                    {selectedPickupLocation.pincode}
                                  </p>
                                  <div className="flex items-center gap-4 mt-2">
                                    <a
                                      href={`tel:${selectedPickupLocation.phone_number}`}
                                      className="text-xs text-primary hover:underline flex items-center gap-1"
                                    >
                                      <Phone className="w-3 h-3" />
                                      {selectedPickupLocation.phone_number}
                                    </a>
                                    {selectedPickupLocation.google_maps_link && (
                                      <a
                                        href={selectedPickupLocation.google_maps_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-primary hover:underline"
                                      >
                                        View on Map
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        <p className="text-xs text-muted-foreground mt-3">
                          Pickup location is automatically set based on your booking source
                        </p>
                      </div>

                      <div className="flex gap-4">
                        <Button variant="outline" onClick={() => setStep(4)} className="flex-1">
                          Back
                        </Button>
                        <Button
                          onClick={() => {
                            setPickupLocationConfirmed(true);
                            setStep(partnerId ? 5 : 6);
                          }}
                          disabled={!selectedPickupLocation}
                          className="flex-1 bg-gradient-primary hover:opacity-90 disabled:opacity-50"
                        >
                          Continue to Checkout
                        </Button>
                      </div>
                    </div>
                  )}

                  {((step === 5 && partnerId) || (step === 6 && !partnerId)) && (
                    <div className="space-y-6">
                      {/* Logged in indicator */}
                      {user && (
                        <div className="p-3 md:p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                          <p className="text-xs md:text-sm text-green-800 dark:text-green-200 flex items-center gap-2 break-all">
                            <span className="inline-block w-2 h-2 bg-green-600 rounded-full flex-shrink-0"></span>
                            <span>
                              Logged in as{" "}
                              <strong>
                                {phoneNumber ||
                                  user.user_metadata?.phone ||
                                  extractPhoneFromEmail(user.email || "") ||
                                  user.email}
                              </strong>
                            </span>
                          </p>
                        </div>
                      )}

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
                              {/* Phone number display - read-only since user logged in with it */}
                              {user && phoneNumber && (
                                <div className="space-y-2">
                                  <Label htmlFor="phoneDisplay" className="flex items-center gap-2">
                                    <Phone className="w-4 h-4" />
                                    Phone Number
                                  </Label>
                                  <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md">
                                    <span className="text-sm font-medium">+91 {phoneNumber}</span>
                                    <Badge variant="secondary" className="ml-auto text-xs">Verified</Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    This is the number you logged in with
                                  </p>
                                </div>
                              )}

                              <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="firstName">First Name</Label>
                                  <Input
                                    id="firstName"
                                    type="text"
                                    placeholder="First name"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    required
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="lastName">Last Name</Label>
                                  <Input
                                    id="lastName"
                                    type="text"
                                    placeholder="Last name"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    required
                                  />
                                </div>
                              </div>

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

                          {/* Identity Verification - Always show */}
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base">Identity Verification</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              {!session && (
                                <PhoneInput
                                  value={phoneNumber}
                                  onChange={setPhoneNumber}
                                  onVerified={setPhoneVerified}
                                  verified={phoneVerified}
                                />
                              )}

                              {/* Live Photo - Always allow updating */}
                              <div className="space-y-2">
                                {profileData?.live_photo_url && (
                                  <div className="space-y-2">
                                    <Label>Current Live Photo</Label>
                                    <div className="flex items-start gap-4">
                                      <img 
                                        src={profileData.live_photo_url} 
                                        alt="Current live photo" 
                                        className="w-32 h-32 object-cover rounded border"
                                      />
                                      <div className="flex-1">
                                        <p className="text-sm text-muted-foreground mb-2">
                                          Your previous live photo is shown. Upload a new one to update it.
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                <FileUpload
                                  label={profileData?.live_photo_url ? "Update Live Photo" : "Live Photo"}
                                  accept="image/*"
                                  onFileSelect={setLivePhoto}
                                  maxSize={10}
                                  captureMode="camera"
                                  description="Capture a live photo with front camera"
                                />
                              </div>

                              {/* ID Proof - Only ask once */}
                              {profileData?.id_proof_url ? (
                                <div className="space-y-2">
                                  <Label>ID Proof (Stored)</Label>
                                  <p className="text-sm text-green-600 dark:text-green-400">
                                    ✓ ID proof already uploaded and verified
                                  </p>
                                </div>
                              ) : (
                                <FileUpload
                                  label="ID Proof (Aadhar Card)"
                                  accept="image/jpeg,image/png,application/pdf"
                                  onFileSelect={setIdProof}
                                  maxSize={10}
                                  captureMode="both"
                                  description="Capture with camera or upload your Aadhar Card"
                                />
                              )}
                            </CardContent>
                          </Card>

                          {/* Emergency Contact */}
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base">Emergency Contact (Optional)</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="emergencyName">Emergency Contact Name</Label>
                                <Input
                                  id="emergencyName"
                                  type="text"
                                  placeholder="Full name (optional)"
                                  value={emergencyName}
                                  onChange={(e) => setEmergencyName(e.target.value)}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="emergencyPhone">Emergency Contact Number</Label>
                                <Input
                                  id="emergencyPhone"
                                  type="tel"
                                  placeholder="10-digit mobile number (optional)"
                                  value={emergencyPhone}
                                  onChange={(e) => setEmergencyPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                                  maxLength={10}
                                />
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>

                      {/* Terms and Conditions */}
                      <Card className="border-2 border-primary/20">
                        <CardContent className="pt-6">
                          <div className="flex items-start space-x-3">
                            <Checkbox 
                              id="terms" 
                              checked={termsAccepted}
                              onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                            />
                            <div className="flex-1 space-y-1">
                              <label
                                htmlFor="terms"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                I accept the terms and conditions
                              </label>
                              <p className="text-xs text-muted-foreground">
                                By checking this box, you agree to our{" "}
                                <button
                                  type="button"
                                  onClick={() => setShowTermsDialog(true)}
                                  className="text-primary underline hover:no-underline"
                                >
                                  Rental Agreement and Terms & Conditions
                                </button>
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <div className="flex gap-4">
                        <Button variant="outline" onClick={() => setStep(partnerId ? 4 : 5)} className="flex-1">
                          Back
                        </Button>
                        <div className="flex-1 space-y-2">
                          <Button
                            onClick={handleProceedToPayment}
                            disabled={!canProceedToPayment()}
                            className="w-full bg-gradient-primary hover:opacity-90 disabled:opacity-50"
                          >
                            Proceed to Payment
                          </Button>
                          {!canProceedToPayment() && (
                            <p className="text-xs text-destructive text-center">
                              Please complete: {getMissingRequirements().join(", ")}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Booking Summary - First on mobile, Second on desktop */}
            <div className="lg:col-span-1 order-1 lg:order-2">
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

                    {/* Cycles Information */}
                    {selectedCycles.length > 0 && (
                      <div className="space-y-2 pb-3 border-b animate-fade-in">
                        <p className="font-medium flex items-center gap-2">
                          <Bike className="w-4 h-4 text-primary" />
                          Cycles ({selectedCycles.length} {selectedCycles.length === 1 ? "person" : "people"})
                        </p>
                        <div className="ml-6 space-y-3">
                          {selectedCycles.map((cycle, index) => (
                            <div key={index} className="space-y-1">
                              {cycle.image_url && (
                                <div className="w-full h-32 bg-muted rounded-lg mb-2 flex items-center justify-center p-2">
                                  <img
                                    src={cycle.image_url}
                                    alt={cycle.name}
                                    className="max-w-full max-h-full object-contain rounded-lg"
                                  />
                                </div>
                              )}
                              <p className="text-xs text-primary font-semibold">Person {index + 1}:</p>
                              <p className="font-semibold">{cycle.name}</p>
                              <p className="text-xs text-muted-foreground">{cycle.model}</p>

                              {/* Inclusions */}
                              {cycle.free_accessories && cycle.free_accessories.length > 0 && (
                                <div className="mt-2 p-2 bg-accent/50 rounded-md">
                                  <p className="text-xs font-semibold text-muted-foreground mb-1">Inclusions:</p>
                                  <ul className="text-xs text-muted-foreground space-y-0.5">
                                    {cycle.free_accessories.map((accId: string) => {
                                      const acc = accessories.find((a) => a.id === accId);
                                      return acc ? <li key={accId}>• {acc.name}</li> : null;
                                    })}
                                  </ul>
                                </div>
                              )}

                              {/* Specifications */}
                              {(() => {
                                let specs: string[] = [];
                                if (Array.isArray(cycle.specifications)) {
                                  specs = cycle.specifications.filter((s) => typeof s === "string" && s.trim());
                                } else if (typeof cycle.specifications === "string" && cycle.specifications.trim()) {
                                  specs = cycle.specifications.split("\n").filter((s) => s.trim());
                                } else if (cycle.specifications && typeof cycle.specifications === "object") {
                                  const values = Object.values(cycle.specifications);
                                  if (values.length > 0 && typeof values[0] === "string") {
                                    specs = values.filter((s) => typeof s === "string" && s.trim()) as string[];
                                  }
                                }

                                return (
                                  specs.length > 0 && (
                                    <div className="mt-2 p-2 bg-accent/50 rounded-md">
                                      <p className="text-xs font-semibold text-muted-foreground mb-1">
                                        Specifications:
                                      </p>
                                      <ul className="text-xs text-muted-foreground space-y-0.5">
                                        {specs.map((spec, idx) => (
                                          <li key={idx}>• {spec}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )
                                );
                              })()}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Date & Time */}
                    {selectedDate && selectedTime && (
                      <div className="space-y-2 animate-fade-in">
                        <div className="flex items-start gap-2">
                          <CalendarIcon className="w-4 h-4 text-primary mt-0.5" />
                          <div className="flex-1">
                            <p className="font-medium">Pickup</p>
                            <p className="text-muted-foreground">{format(selectedDate, "PPP")}</p>
                            <p className="text-muted-foreground">
                              {selectedTime &&
                                (() => {
                                  const [hour, minute] = selectedTime.split(":");
                                  const h = parseInt(hour);
                                  const period = h >= 12 ? "PM" : "AM";
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
                      <div className="space-y-2 pb-3 border-b animate-fade-in">
                        <div className="flex items-start gap-2">
                          <Clock className="w-4 h-4 text-primary mt-0.5" />
                          <div className="flex-1">
                            <p className="font-medium">Duration: {selectedDuration}</p>
                            <p className="text-muted-foreground">Return: {format(returnDate, "PPP")}</p>
                            <p className="text-muted-foreground">
                              at{" "}
                              {selectedTime &&
                                (() => {
                                  const [hour, minute] = selectedTime.split(":");
                                  const h = parseInt(hour);
                                  const period = h >= 12 ? "PM" : "AM";
                                  const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
                                  return `${displayHour}:${minute} ${period}`;
                                })()}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Pickup Location */}
                    {selectedPickupLocation && pickupLocationConfirmed && (
                      <div className="space-y-2 pb-3 border-b animate-fade-in">
                        <p className="font-medium flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-primary" />
                          Pickup Location
                        </p>
                        <div className="ml-6 text-xs">
                          <p className="font-semibold">{selectedPickupLocation.name}</p>
                          <p className="text-muted-foreground">{selectedPickupLocation.address}</p>
                          <p className="text-muted-foreground">
                            {selectedPickupLocation.city}, {selectedPickupLocation.state} -{" "}
                            {selectedPickupLocation.pincode}
                          </p>
                          {selectedPickupLocation.phone_number && (
                            <p className="text-primary mt-1">
                              <Phone className="w-3 h-3 inline mr-1" />
                              {selectedPickupLocation.phone_number}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Accessories */}
                    {accessories.some((acc) => acc.quantity > 0 && acc.days > 0) && (
                      <div className="space-y-2 pb-3 border-b animate-fade-in">
                        <p className="font-medium flex items-center gap-2">
                          <Camera className="w-4 h-4 text-primary" />
                          Accessories
                        </p>
                        {accessories
                          .filter((acc) => acc.quantity > 0 && acc.days > 0)
                          .map((acc) => (
                            <div key={acc.id} className="flex justify-between text-xs ml-6">
                              <span className="text-muted-foreground">
                                {acc.name} (×{acc.quantity}, {acc.days}d)
                              </span>
                              <span>₹{acc.pricePerDay * acc.quantity * acc.days}</span>
                            </div>
                          ))}
                      </div>
                    )}

                    {/* Price Breakdown */}
                    {selectedDuration && (
                      <div className="space-y-2 animate-fade-in">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Cycle Rental ({numberOfPeople} {numberOfPeople === 1 ? "cycle" : "cycles"})
                          </span>
                          <span className="font-semibold">₹{getBasePrice()}</span>
                        </div>

                        {accessoriesTotal > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Accessories</span>
                            <span className="font-semibold">₹{accessoriesTotal}</span>
                          </div>
                        )}

                        <div className="flex justify-between pt-2 border-t">
                          <span className="text-muted-foreground">Subtotal (Rental + Accessories)</span>
                          <span className="font-semibold">₹{getBasePrice() + accessoriesTotal}</span>
                        </div>

                        <div className="pt-3 border-t">
                          <div className="flex justify-between text-lg font-bold">
                            <span>Pay Online Now</span>
                            <span className="text-primary">
                              ₹{getBasePrice() + accessoriesTotal}
                            </span>
                          </div>
                        </div>

                        <div className="pt-3 border-t space-y-2">
                          <p className="text-sm font-semibold text-muted-foreground">Security Deposit (Payable at Pickup)</p>
                          <div className="flex justify-between text-primary">
                            <span>Cycle Deposit (×{numberOfPeople})</span>
                            <span className="font-bold">₹{getSecurityDeposit()}</span>
                          </div>
                          {accessoriesDeposit > 0 && (
                            <div className="flex justify-between text-primary">
                              <span>Accessories Deposit</span>
                              <span className="font-bold">₹{accessoriesDeposit}</span>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">*Fully refundable after cycle return & inspection</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Terms and Conditions Dialog */}
      <TermsDialog open={showTermsDialog} onOpenChange={setShowTermsDialog} />
    </div>
  );
};

export default Book;
