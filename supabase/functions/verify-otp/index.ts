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
    
    console.log('Verification check completed, status:', data.status);
    
    // If OTP verification failed, return early
    if (data.status !== 'approved') {
      return new Response(
        JSON.stringify({ 
          success: false,
          status: data.status,
          valid: data.valid
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // OTP verified! Now handle authentication
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const email = `${phoneNumber}@bolt91.app`;
    // Generate a fresh random password for this login session
    const newPassword = crypto.randomUUID() + crypto.randomUUID();

    console.log('Checking if user exists:', email);

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUser?.users?.find(u => u.email === email);

    let userId: string;

    if (userExists) {
      console.log('User exists, updating password');
      // Update existing user's password
      const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        userExists.id,
        { password: newPassword }
      );

      if (updateError) {
        console.error('Error updating user password:', updateError);
        throw updateError;
      }

      userId = userExists.id;
    } else {
      console.log('Creating new user');
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
        console.error('Error creating user:', createError);
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
      console.error('Error creating session:', signInError);
      throw signInError;
    }

    console.log('Authentication successful');

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
