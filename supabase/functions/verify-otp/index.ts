import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation regex
const PHONE_REGEX = /^[0-9]{10}$/;
const OTP_REGEX = /^[0-9]{6}$/;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phoneNumber, code } = await req.json();
    
    // Validate phone number
    if (!phoneNumber || !PHONE_REGEX.test(phoneNumber)) {
      console.error('Invalid phone number format');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid phone number format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate OTP code
    if (!code || !OTP_REGEX.test(code)) {
      console.error('Invalid OTP format');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid OTP code format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    const AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
    const VERIFY_SID = Deno.env.get('TWILIO_VERIFY_SERVICE_SID');
    
    console.log('Verifying OTP for phone ending in:', phoneNumber.slice(-4));
    
    // Call Twilio Verify API to check OTP
    const response = await fetch(
      `https://verify.twilio.com/v2/Services/${VERIFY_SID}/VerificationCheck`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${ACCOUNT_SID}:${AUTH_TOKEN}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: `+91${phoneNumber}`,
          Code: code,
        }),
      }
    );
    
    const data = await response.json();
    
    console.log('Verification check completed');
    
    return new Response(
      JSON.stringify({ 
        success: data.status === 'approved',
        status: data.status,
        valid: data.valid
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error verifying OTP:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
