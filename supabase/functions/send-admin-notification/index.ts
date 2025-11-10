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
    const { booking_id } = await req.json();
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch complete booking details
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .select(`
        *,
        cycles!inner(name, model),
        pickup_locations(name, address),
        booking_accessories(
          quantity,
          days,
          price_per_day,
          total_cost,
          accessories!inner(name)
        )
      `)
      .eq('booking_id', booking_id)
      .single();

    if (bookingError) {
      console.error('Error fetching booking:', bookingError);
      throw bookingError;
    }

    // Fetch profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('phone_number, first_name, last_name')
      .eq('user_id', booking.user_id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      throw profileError;
    }

    const subtotal = Number(booking.cycle_rental_cost) + Number(booking.accessories_cost || 0);
    const totalPaid = Number(subtotal) + Number(booking.gst);
    const customerName = `${profile.first_name} ${profile.last_name}`;
    
    const pickupDate = new Date(booking.pickup_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const returnDate = new Date(booking.return_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    
    const locationName = booking.pickup_locations?.name || 'Not specified';

    const message = `🔔 NEW BOOKING - Bolt91

📋 ID: ${booking.booking_id}
👤 Customer: ${customerName}
📱 Phone: ${profile.phone_number}
🚴 Cycle: ${booking.cycles.name} (${booking.cycles.model})

📍 Location: ${locationName}
📅 Pickup: ${pickupDate} at ${booking.pickup_time}
📅 Return: ${returnDate} at ${booking.return_time}

💰 Total: ₹${totalPaid}
💵 Rental: ₹${booking.cycle_rental_cost}
🔒 Deposit: ₹${booking.security_deposit}

View details in admin panel.`;

    // Send SMS to admin
    const ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    const AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
    const FROM_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER') || '+16812573439';
    const ADMIN_PHONE = Deno.env.get('ADMIN_PHONE_NUMBER') || '+919284613155';

    console.log('Sending admin SMS to:', ADMIN_PHONE);

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${ACCOUNT_SID}:${AUTH_TOKEN}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: FROM_NUMBER,
          To: ADMIN_PHONE,
          Body: message,
        }),
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Twilio error:', data);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: data.message
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Admin SMS sent successfully:', data.sid);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message_sid: data.sid 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error sending admin SMS:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
