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

    // Format message
    const subtotal = Number(booking.cycle_rental_cost) + Number(booking.accessories_cost || 0);
    const totalPaid = Number(subtotal) + Number(booking.gst);
    const customerName = `${profile.first_name} ${profile.last_name}`;
    
    const pickupDate = new Date(booking.pickup_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const returnDate = new Date(booking.return_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    
    const locationName = booking.pickup_locations?.name || 'Pickup Location';
    const locationAddress = booking.pickup_locations?.address || '';

    // Create WhatsApp link with pre-filled message
    const whatsappMessage = `Hi Bolt91,

My booking details:
Booking ID: ${booking.booking_id}
Name: ${customerName}
Phone: ${profile.phone_number}
Cycle: ${booking.cycles.name} (${booking.cycles.model})
Pickup: ${pickupDate} at ${booking.pickup_time}
Location: ${locationName}

I need assistance with my booking.`;

    const encodedMessage = encodeURIComponent(whatsappMessage);
    const customerSupportPhone = Deno.env.get('CUSTOMER_SUPPORT_PHONE') || '919284613155';
    const whatsappLink = `https://wa.me/${customerSupportPhone}?text=${encodedMessage}`;

    const message = `🎉 Congrats on booking Bolt91 cycle for your Kashi trip!

📋 Booking ID: ${booking.booking_id}
🚴 Cycle: ${booking.cycles.name} (${booking.cycles.model})
📍 Pickup: ${locationName}${locationAddress ? ', ' + locationAddress : ''}
📅 Pickup: ${pickupDate} at ${booking.pickup_time}
📅 Return: ${returnDate} at ${booking.return_time}

💰 Total Paid: ₹${totalPaid}
🔒 Deposit: ₹${booking.security_deposit} (Refundable)

Need help? Connect with us:
${whatsappLink}

Happy cycling! 🚴‍♂️`;

    // Send SMS via Twilio
    const ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    const AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
    const FROM_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER') || '+16812573439';
    
    const phoneNumber = profile.phone_number.startsWith('+91') 
      ? profile.phone_number 
      : `+91${profile.phone_number}`;

    console.log('Sending SMS to:', phoneNumber);

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
          To: phoneNumber,
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
          error: data.message,
          note: 'SMS failed but booking is confirmed'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('SMS sent successfully:', data.sid);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message_sid: data.sid 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error sending SMS:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        note: 'SMS failed but booking is confirmed'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
