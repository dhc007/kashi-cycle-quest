import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

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
    
    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Verify OTP from database
    const { data: otpRecord, error: otpError } = await supabaseAdmin
      .from('phone_otps')
      .select('*')
      .eq('phone_number', phoneNumber)
      .eq('otp_code', code)
      .eq('verified', false)
      .maybeSingle();
    
    if (otpError) {
      console.error('Database error:', otpError.message);
      throw new Error('Failed to verify OTP');
    }
    
    // Check if OTP exists
    if (!otpRecord) {
      console.log('OTP verification failed: Invalid or already used OTP');
      return new Response(
        JSON.stringify({ 
          success: false,
          status: 'failed',
          valid: false,
          error: 'Invalid or expired OTP code'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check if OTP has expired (5 minutes)
    const expiresAt = new Date(otpRecord.expires_at);
    if (expiresAt < new Date()) {
      console.log('OTP verification failed: OTP expired');
      // Delete expired OTP
      await supabaseAdmin
        .from('phone_otps')
        .delete()
        .eq('id', otpRecord.id);
      
      return new Response(
        JSON.stringify({ 
          success: false,
          status: 'expired',
          valid: false,
          error: 'OTP has expired. Please request a new one.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Mark OTP as verified and delete it
    await supabaseAdmin
      .from('phone_otps')
      .delete()
      .eq('id', otpRecord.id);
    
    console.log('OTP verified successfully for phone:', `****${phoneNumber.slice(-2)}`);

    // OTP verified! Now handle authentication
    const email = `${phoneNumber}@bolt91.app`;
    // Generate a fresh random password for this login session
    const newPassword = crypto.randomUUID() + crypto.randomUUID();

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUser?.users?.find(u => u.email === email);

    let userId: string;

    if (userExists) {
      // Update existing user's password
      const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        userExists.id,
        { password: newPassword }
      );

      if (updateError) {
        throw updateError;
      }

      userId = userExists.id;
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: newPassword,
        email_confirm: true,
        user_metadata: {
          phone_number: phoneNumber,
        }
      });

      if (createError) {
        throw createError;
      }

      userId = newUser.user.id;
    }

    // Generate session token by signing in with the new password
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { data: sessionData, error: signInError } = await supabaseClient.auth.signInWithPassword({
      email,
      password: newPassword,
    });

    if (signInError) {
      throw signInError;
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        status: 'approved',
        session: sessionData.session,
        user: sessionData.user
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('verify-otp error:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
