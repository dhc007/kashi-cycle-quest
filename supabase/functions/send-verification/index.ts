import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Phone number validation regex
const PHONE_REGEX = /^[0-9]{10}$/;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phoneNumber } = await req.json();
    
    // Validate phone number format
    if (!phoneNumber || !PHONE_REGEX.test(phoneNumber)) {
      console.error('Invalid phone number format');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid phone number format. Must be 10 digits.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Initialize Supabase client for rate limiting
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Check rate limiting (max 3 attempts per hour per phone)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: rateLimitData, error: rateLimitError } = await supabase
      .from('otp_rate_limits')
      .select('*')
      .eq('phone_number', phoneNumber)
      .gte('last_attempt', oneHourAgo)
      .maybeSingle();
    
    if (rateLimitError && rateLimitError.code !== 'PGRST116') {
      console.error('Rate limit check error:', rateLimitError);
    }
    
    // If rate limit exceeded
    if (rateLimitData && rateLimitData.attempts >= 3) {
      console.warn('Rate limit exceeded for phone ending in', phoneNumber.slice(-4));
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Too many OTP requests. Please try again in an hour.' 
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    const AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
    const VERIFY_SID = Deno.env.get('TWILIO_VERIFY_SERVICE_SID');
    
    console.log('Sending verification to phone ending in:', phoneNumber.slice(-4));
    
    // Call Twilio Verify API to send OTP
    const response = await fetch(
      `https://verify.twilio.com/v2/Services/${VERIFY_SID}/Verifications`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${ACCOUNT_SID}:${AUTH_TOKEN}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: `+91${phoneNumber}`,
          Channel: 'sms',
        }),
      }
    );
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Twilio error');
      throw new Error(data.message || 'Failed to send verification');
    }
    
    // Update rate limit
    if (rateLimitData) {
      await supabase
        .from('otp_rate_limits')
        .update({
          attempts: rateLimitData.attempts + 1,
          last_attempt: new Date().toISOString()
        })
        .eq('id', rateLimitData.id);
    } else {
      await supabase
        .from('otp_rate_limits')
        .insert({
          phone_number: phoneNumber,
          attempts: 1
        });
    }
    
    console.log('Verification sent successfully');
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        status: data.status,
        message: 'OTP sent successfully' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending verification:', error);
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
