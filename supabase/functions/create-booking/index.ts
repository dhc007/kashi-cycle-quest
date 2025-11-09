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

    // Try to get authenticated user, but allow anonymous bookings
    const { data: { user } } = await supabaseClient.auth.getUser();
    
    let userId = user?.id;
    
    // If no authenticated user, create anonymous user with phone number
    if (!userId) {
      const bookingData = await req.json();
      const phoneNumber = bookingData.profile?.phone_number;
      
      if (!phoneNumber) {
        throw new Error('Phone number required for booking');
      }

      // Check if user already exists with this phone
      const { data: existingProfile } = await supabaseClient
        .from('profiles')
        .select('user_id')
        .eq('phone_number', phoneNumber)
        .maybeSingle();
      
      if (existingProfile) {
        // User exists, reuse their account
        userId = existingProfile.user_id;
        console.log('Reusing existing user for phone:', phoneNumber);
      } else {
        // Create new anonymous user with phone as email
        const anonymousEmail = `${phoneNumber}@bolt91.app`;
        const { data: signUpData, error: signUpError } = await supabaseClient.auth.signUp({
          email: anonymousEmail,
          password: crypto.randomUUID(), // Secure random password
          options: {
            data: {
              phone_number: phoneNumber,
              is_anonymous: true
            }
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

    const bookingData = userId ? await req.json() : JSON.parse(await req.text());
    
    // Generate booking ID
    const bookingId = `BLT${Date.now().toString().slice(-8)}`;

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

    if (!userId) {
      throw new Error('User ID not available');
    }

    // Create or update profile
    const { data: existingProfile } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!existingProfile) {
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
    }

    // Create booking
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .insert({
        booking_id: bookingId,
        user_id: userId,
        cycle_id: bookingData.cycle_id,
        partner_id: bookingData.partner_id || null,
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
