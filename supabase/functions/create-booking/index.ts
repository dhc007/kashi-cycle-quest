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

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const bookingData = await req.json();
    
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

    // Create or update profile
    const { data: existingProfile } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!existingProfile) {
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .insert({
          user_id: user.id,
          full_name: bookingData.profile.full_name,
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
        user_id: user.id,
        cycle_id: bookingData.cycle_id,
        partner_id: bookingData.partner_id,
        pickup_date: bookingData.pickup_date,
        pickup_time: bookingData.pickup_time,
        return_date: bookingData.return_date,
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
