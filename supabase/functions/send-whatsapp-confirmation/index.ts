import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WhatsAppConfirmationRequest {
  phoneNumber: string;
  bookingId: string;           // {{1}}
  cycleName: string;           // {{2}}
  pickupLocation: string;      // {{3}}
  pickupTime: string;          // {{4}} - "20 Nov, 10:00 AM"
  returnTime: string;          // {{5}} - "21 Nov, 10:00 AM"
  paymentSummary: string;      // {{6}} - Multi-line string
  securityDeposit: string;     // {{7}} - "2000"
  totalAmount: string;         // {{8}} - "4247"
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      phoneNumber, 
      bookingId, 
      cycleName, 
      pickupLocation,
      pickupTime,
      returnTime,
      paymentSummary,
      securityDeposit,
      totalAmount
    }: WhatsAppConfirmationRequest = await req.json();
    
    const AISENSY_API_KEY = Deno.env.get('AISENSY_API_KEY');
    
    if (!AISENSY_API_KEY) {
      console.error('AISENSY_API_KEY not configured');
      throw new Error('WhatsApp service not configured');
    }

    // Clean phone number (remove any +91 prefix if present)
    const cleanPhone = phoneNumber.replace(/^\+?91/, '');
    
    console.log(`Sending booking confirmation to ${cleanPhone.slice(-4)} for booking ${bookingId}`);

    const aiSensyPayload = {
      apiKey: AISENSY_API_KEY,
      campaignName: "booking_confirmation_cycle",
      destination: `91${cleanPhone}`,
      userName: "Blue Bolt Electric Pvt Ltd",
      templateParams: [
        bookingId,        // {{1}} Booking ID
        cycleName,        // {{2}} Cycle name
        pickupLocation,   // {{3}} Pickup Location
        pickupTime,       // {{4}} Pickup Time
        returnTime,       // {{5}} Return Time
        paymentSummary,   // {{6}} Payment Summary
        securityDeposit,  // {{7}} Security Deposit
        totalAmount       // {{8}} Total Amount
      ],
      source: "Booking Confirmation"
    };

    console.log('Sending to AiSensy with campaign: booking_confirmation_cycle');

    const response = await fetch(
      'https://backend.aisensy.com/campaign/t1/api/v2',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiSensyPayload),
      }
    );

    const responseData = await response.json();
    
    if (!response.ok) {
      console.error('AiSensy API error:', JSON.stringify(responseData));
      throw new Error(responseData.message || 'Failed to send WhatsApp notification');
    }

    console.log('WhatsApp confirmation sent successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'WhatsApp booking confirmation sent'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('WhatsApp confirmation error:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
