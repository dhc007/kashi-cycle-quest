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
        profiles!inner(phone_number, first_name, last_name),
        cycles!inner(name, model),
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

    // Calculate duration in days
    const getDurationDays = (durationType: string) => {
      if (durationType.includes('Day')) return 1;
      if (durationType.includes('Week')) return 7;
      if (durationType.includes('Month')) return 30;
      return 1;
    };

    const durationDays = getDurationDays(booking.duration_type);
    const cycleRentalLine = `Cycle Rental × ${durationDays} ${durationDays > 1 ? 'days' : 'day'} = ₹${booking.cycle_rental_cost}`;
    
    // Format accessories
    let accessoriesLines = '';
    if (booking.booking_accessories && booking.booking_accessories.length > 0) {
      accessoriesLines = '\n' + booking.booking_accessories
        .map((ba: any) => `• ${ba.accessories.name} × ${ba.days} ${ba.days > 1 ? 'days' : 'day'} = ₹${ba.total_cost}`)
        .join('\n');
    }

    const subtotal = Number(booking.cycle_rental_cost) + Number(booking.accessories_cost || 0);

    // Format WhatsApp message
    const message = `🎉 *Thank you for booking with Bolt91!*
*Welcome to Kashi* 🕉️

📋 *Order Summary*
━━━━━━━━━━━━━━━━━━
Booking ID: ${booking.booking_id}

🚴 *Rental Details:*
• Cycle: ${booking.cycles.name} (${booking.cycles.model})
• Pickup: ${new Date(booking.pickup_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} at ${booking.pickup_time}
• Return: ${new Date(booking.return_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} at ${booking.return_time}
• Duration: ${booking.duration_type}

💰 *Price Breakdown:*
━━━━━━━━━━━━━━━━━━
${cycleRentalLine}${accessoriesLines}

Subtotal: ₹${subtotal}
GST (18%): ₹${booking.gst}
─────────────────
*Total Paid: ₹${Number(subtotal) + Number(booking.gst)}*

🔒 *Security Deposit: ₹${booking.security_deposit}*
(Fully Refundable after return)

Payment ID: ${booking.razorpay_payment_id}

Need help? WhatsApp us! 💬
Happy cycling! 🚴‍♂️`;

    // Send WhatsApp message via Twilio
    const ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    const AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
    const MESSAGING_SID = 'MG707430180e002cc56834ddd91fc904c2';
    const FROM_NUMBER = '8217824840';
    
    const phoneNumber = booking.profiles.phone_number.startsWith('+91') 
      ? booking.profiles.phone_number 
      : `+91${booking.profiles.phone_number}`;

    console.log('Sending WhatsApp to:', phoneNumber);

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${ACCOUNT_SID}:${AUTH_TOKEN}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: `whatsapp:+91${FROM_NUMBER}`,
          To: `whatsapp:${phoneNumber}`,
          Body: message,
          MessagingServiceSid: MESSAGING_SID,
        }),
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Twilio error:', data);
      // Don't throw error - we don't want to fail the payment if WhatsApp fails
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: data.message,
          note: 'WhatsApp failed but booking is confirmed'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('WhatsApp sent successfully:', data.sid);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message_sid: data.sid 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error sending WhatsApp:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Don't fail the request - WhatsApp is nice to have but not critical
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        note: 'WhatsApp failed but booking is confirmed'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});