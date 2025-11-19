import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Service role client for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Read request body once
    const bookingData = await req.json();

    // Validate booking date - must be December 1, 2025 or later
    const minBookingDate = new Date('2025-12-01T00:00:00Z');
    const pickupDate = new Date(bookingData.pickup_date);
    
    if (pickupDate < minBookingDate) {
      throw new Error('Bookings are only available from December 1st, 2025 onwards');
    }

    // Try to get authenticated user, but allow anonymous bookings
    const { data: { user } } = await supabaseClient.auth.getUser();
    
    let userId = user?.id;
    
    // If no authenticated user, check if user exists by phone or create one
    if (!userId) {
      const phoneNumber = bookingData.profile?.phone_number;
      
      if (!phoneNumber) {
        throw new Error('Phone number required for booking');
      }

      // Check if user already exists with this phone in profiles
      const { data: existingProfile } = await supabaseClient
        .from('profiles')
        .select('user_id')
        .eq('phone_number', phoneNumber)
        .maybeSingle();
      
      if (existingProfile) {
        // User exists, reuse their account
        userId = existingProfile.user_id;
        console.log('Reusing existing user');
      } else {
        // Check if auth user exists with this email
        const anonymousEmail = `${phoneNumber}@bolt91.app`;
        
        // Try to get user by email using admin client
        const { data: { users: existingUsers } } = await supabaseAdmin.auth.admin.listUsers();
        const authUser = existingUsers?.find(u => u.email === anonymousEmail);
        
        if (authUser) {
          // Auth user exists but no profile - use existing auth user
          userId = authUser.id;
          console.log('Found existing auth user without profile');
        } else {
          // Create new anonymous user with random password
          // Password will be reset when they login via OTP
          const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
            email: anonymousEmail,
            password: crypto.randomUUID() + crypto.randomUUID(),
            email_confirm: true,
            user_metadata: {
              phone_number: phoneNumber,
              is_anonymous: true
            }
          });

          if (signUpError) {
            console.error('Failed to create anonymous user:', signUpError);
            throw new Error('Unable to create booking user: ' + signUpError.message);
          }
          
          userId = signUpData.user?.id;
          console.log('Created new anonymous user');
        }
      }
    }
    
    // Generate booking ID
    const bookingId = `BLT${Date.now().toString().slice(-8)}`;

    // Check if we should enforce availability checking
    const { data: availabilitySettings } = await supabaseClient
      .from('system_settings')
      .select('value')
      .eq('key', 'allow_unavailable_bookings')
      .single();

    const allowUnavailable = availabilitySettings?.value && 
      typeof availabilitySettings.value === 'object' && 
      'enabled' in availabilitySettings.value &&
      (availabilitySettings.value as { enabled: boolean }).enabled;

    if (!allowUnavailable) {
      // Check cycle availability
      const { data: availableCount } = await supabaseClient
        .rpc('check_cycle_availability', {
          p_cycle_id: bookingData.cycle_id,
          p_pickup_date: bookingData.pickup_date,
          p_return_date: bookingData.return_date,
        });

      if (availableCount < 1) {
        throw new Error('Cycle not available for selected dates');
      }

      // Check accessory availability if accessories are selected
      if (bookingData.accessories && bookingData.accessories.length > 0) {
        for (const acc of bookingData.accessories) {
          const { data: accAvailable } = await supabaseClient
            .rpc('check_accessory_availability', {
              p_accessory_id: acc.id,
              p_pickup_date: bookingData.pickup_date,
              p_return_date: bookingData.return_date,
            });

          if (accAvailable < 1) {
            throw new Error(`Accessory ${acc.name} not available for selected dates`);
          }
        }
      }
    }

    if (!userId) {
      throw new Error('User ID not available');
    }

    // Create or update profile - ALWAYS update to ensure latest phone number is saved
    const { data: existingProfile } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!existingProfile) {
      // Create new profile
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .insert({
          user_id: userId,
          first_name: bookingData.profile.first_name,
          last_name: bookingData.profile.last_name,
          phone_number: bookingData.profile.phone_number,
          email: bookingData.profile.email,
          emergency_contact_name: bookingData.profile.emergency_contact_name,
          emergency_contact_phone: bookingData.profile.emergency_contact_phone,
          id_proof_url: bookingData.profile.id_proof_url,
          photo_url: bookingData.profile.photo_url,
        });

      if (profileError) throw profileError;
    } else {
      // Update existing profile with latest information (especially phone number)
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({
          first_name: bookingData.profile.first_name,
          last_name: bookingData.profile.last_name,
          phone_number: bookingData.profile.phone_number,
          email: bookingData.profile.email,
          emergency_contact_name: bookingData.profile.emergency_contact_name,
          emergency_contact_phone: bookingData.profile.emergency_contact_phone,
          id_proof_url: bookingData.profile.id_proof_url || existingProfile.id_proof_url,
          photo_url: bookingData.profile.photo_url || existingProfile.photo_url,
        })
        .eq('user_id', userId);

      if (updateError) throw updateError;
    }

    // Create booking
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .insert({
        booking_id: bookingId,
        user_id: userId,
        cycle_id: bookingData.cycle_id,
        partner_id: bookingData.partner_id || null,
        pickup_location_id: bookingData.pickup_location_id || null,
        pickup_date: bookingData.pickup_date,
        pickup_time: bookingData.pickup_time,
        return_date: bookingData.return_date,
        return_time: bookingData.return_time || bookingData.pickup_time,
        duration_type: bookingData.duration_type,
        cycle_rental_cost: bookingData.cycle_rental_cost,
        accessories_cost: bookingData.accessories_cost,
        insurance_cost: bookingData.insurance_cost,
        gst: bookingData.gst,
        security_deposit: bookingData.security_deposit,
        total_amount: bookingData.total_amount,
        has_insurance: bookingData.has_insurance,
        payment_status: 'pending',
        booking_status: 'confirmed',
        terms_accepted_at: bookingData.terms_accepted_at || new Date().toISOString(),
        terms_version: bookingData.terms_version || 'v1.0',
        coupon_code: bookingData.coupon_code || null,
        coupon_id: bookingData.coupon_id || null,
        discount_amount: bookingData.discount_amount || 0,
      })
      .select()
      .single();

    if (bookingError) throw bookingError;

    // Create booking accessories if any
    if (bookingData.accessories && bookingData.accessories.length > 0) {
      const bookingAccessories = bookingData.accessories.map((acc: any) => ({
        booking_id: booking.id,
        accessory_id: acc.id,
        quantity: 1,
        days: acc.days,
        price_per_day: acc.pricePerDay,
        total_cost: acc.days * acc.pricePerDay,
      }));

      const { error: accError } = await supabaseClient
        .from('booking_accessories')
        .insert(bookingAccessories);

      if (accError) throw accError;
    }

    // Track coupon usage atomically to prevent race conditions
    if (bookingData.coupon_code && bookingData.coupon_id && bookingData.discount_amount > 0) {
      const { data: couponApplied, error: couponError } = await supabaseAdmin
        .rpc('apply_coupon', {
          p_coupon_id: bookingData.coupon_id,
          p_user_id: userId,
          p_booking_id: booking.id,
          p_discount_amount: bookingData.discount_amount
        });

      if (couponError || !couponApplied) {
        console.error('Failed to apply coupon:', couponError);
        // Coupon application failed but booking is still valid
      }
    }

    console.log('Booking created:', bookingId);

    return new Response(
      JSON.stringify({ booking }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'An error occurred';
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
