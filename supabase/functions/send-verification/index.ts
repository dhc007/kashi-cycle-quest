import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Phone number validation regex
const PHONE_REGEX = /^[0-9]{10}$/;

// Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phoneNumber } = await req.json();
    
    // Validate phone number format
    if (!phoneNumber || !PHONE_REGEX.test(phoneNumber)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid phone number format. Must be 10 digits.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Check rate limiting (max 10 attempts per 15 minutes per phone)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: rateLimitData, error: rateLimitError } = await supabase
      .from('otp_rate_limits')
      .select('*')
      .eq('phone_number', phoneNumber)
      .gte('last_attempt', fifteenMinutesAgo)
      .maybeSingle();
    
    const maxAttempts = 10;
    const remainingAttempts = rateLimitData ? maxAttempts - rateLimitData.attempts : maxAttempts;
    
    // If rate limit exceeded
    if (rateLimitData && rateLimitData.attempts >= maxAttempts) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Too many OTP requests. Please try again in 15 minutes.',
          remainingAttempts: 0
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Generate OTP
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes expiry
    
    // Delete any existing OTPs for this phone number
    await supabase
      .from('phone_otps')
      .delete()
      .eq('phone_number', phoneNumber);
    
    // Store OTP in database
    const { error: otpInsertError } = await supabase
      .from('phone_otps')
      .insert({
        phone_number: phoneNumber,
        otp_code: otpCode,
        expires_at: expiresAt,
        verified: false
      });
    
    if (otpInsertError) {
      console.error('Failed to store OTP:', otpInsertError.message);
      throw new Error('Failed to generate OTP');
    }
    
    // Send OTP via AiSensy WhatsApp
    const AISENSY_API_KEY = Deno.env.get('AISENSY_API_KEY');
    
    if (!AISENSY_API_KEY) {
      console.error('AISENSY_API_KEY not configured');
      throw new Error('WhatsApp service not configured');
    }
    
    const aiSensyPayload = {
      apiKey: AISENSY_API_KEY,
      campaignName: "da36e719_6ae7_44ef_9b0d_af3ab171f49d",
      destination: `91${phoneNumber}`,
      userName: "Bolt91",
      templateParams: [otpCode],
      source: "OTP Login",
      buttons: [{
        type: "button",
        sub_type: "url",
        index: 0,
        parameters: [{
          type: "text",
          text: otpCode
        }]
      }]
    };
    
    console.log('Sending OTP via AiSensy to:', `91${phoneNumber.slice(-2)}`);
    
    const response = await fetch(
      'https://backend.aisensy.com/campaign/t1/api/v2',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(aiSensyPayload),
      }
    );
    
    const responseData = await response.json();
    console.log('AiSensy response status:', response.status);
    
    if (!response.ok) {
      console.error('AiSensy API error:', responseData);
      // Delete the OTP if sending failed
      await supabase
        .from('phone_otps')
        .delete()
        .eq('phone_number', phoneNumber);
      throw new Error(responseData.message || 'Failed to send WhatsApp OTP');
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
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        status: 'pending',
        message: 'OTP sent successfully via WhatsApp',
        remainingAttempts: remainingAttempts - 1
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('send-verification error:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
