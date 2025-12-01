import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AdminNotificationRequest {
  bookingId: string;
  customerName: string;
  customerPhone: string;
  cycleName: string;
  pickupLocation: string;
  duration: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      bookingId, 
      customerName, 
      customerPhone, 
      cycleName, 
      pickupLocation, 
      duration 
    }: AdminNotificationRequest = await req.json();

    const aiSensyApiKey = Deno.env.get('AISENSY_API_KEY');
    if (!aiSensyApiKey) {
      console.error('AISENSY_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'API key not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Fixed admin phone number
    const adminPhoneNumber = '919845205530';

    console.log(`Sending admin notification for booking ${bookingId} to ${adminPhoneNumber.slice(-4)}`);

    const aiSensyPayload = {
      apiKey: aiSensyApiKey,
      campaignName: 'admin_booking_confirmation',
      destination: adminPhoneNumber,
      userName: 'Admin',
      templateParams: [
        bookingId,           // {{1}} Booking ID
        customerName,        // {{2}} Customer Name
        customerPhone,       // {{3}} Customer Phone
        cycleName,           // {{4}} Cycle
        pickupLocation,      // {{5}} Pickup
        duration             // {{6}} Duration (e.g., "1 Day", "3 Days")
      ],
    };

    console.log('Admin notification payload:', JSON.stringify({
      destination: adminPhoneNumber.slice(-4),
      templateParams: aiSensyPayload.templateParams
    }));
    console.log('Sending to AiSensy with campaign: admin_booking_confirmation');

    const aiSensyResponse = await fetch('https://backend.aisensy.com/campaign/t1/api/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(aiSensyPayload),
    });

    const responseText = await aiSensyResponse.text();
    console.log('AiSensy response:', responseText);

    if (!aiSensyResponse.ok) {
      console.error('AiSensy API error:', responseText);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to send admin notification', details: responseText }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('Admin notification sent successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'Admin notification sent' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in send-admin-notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
