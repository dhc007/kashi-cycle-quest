import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientId = Deno.env.get('PHONEPE_CLIENT_ID');
    const clientSecret = Deno.env.get('PHONEPE_CLIENT_SECRET');
    const clientVersion = Deno.env.get('PHONEPE_CLIENT_VERSION') || '1';
    const env = Deno.env.get('PHONEPE_ENV') || 'sandbox';
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!clientId || !clientSecret) {
      throw new Error('PhonePe credentials not configured');
    }

    const { merchantOrderId, booking_id, is_addon } = await req.json();

    if (!merchantOrderId) {
      throw new Error('Missing merchantOrderId');
    }

    // Determine API base URL based on environment
    const baseUrl = env === 'production' 
      ? 'https://api.phonepe.com/apis/pg'
      : 'https://api-preprod.phonepe.com/apis/pg-sandbox';

    // Step 1: Get OAuth Access Token
    console.log('Getting PhonePe OAuth token for verification...');
    
    const tokenBody = new URLSearchParams();
    tokenBody.append('client_id', clientId);
    tokenBody.append('client_secret', clientSecret);
    tokenBody.append('client_version', clientVersion);
    tokenBody.append('grant_type', 'client_credentials');
    
    const tokenResponse = await fetch(`${baseUrl}/v1/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenBody.toString(),
    });

    const tokenData = await tokenResponse.json();
    
    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('Token error:', JSON.stringify(tokenData));
      throw new Error(tokenData.message || 'Failed to get PhonePe access token');
    }

    const accessToken = tokenData.access_token;
    console.log('Got PhonePe access token for verification');

    // Step 2: Check Order Status
    console.log('Checking order status for:', merchantOrderId);
    
    const statusResponse = await fetch(`${baseUrl}/checkout/v2/order/${merchantOrderId}/status`, {
      method: 'GET',
      headers: {
        'Authorization': `O-Bearer ${accessToken}`,
      },
    });

    const statusData = await statusResponse.json();
    
    console.log('PhonePe status response:', JSON.stringify(statusData));

    if (!statusResponse.ok) {
      console.error('Status check error:', JSON.stringify(statusData));
      throw new Error(statusData.message || 'Failed to check payment status');
    }

    // Determine payment state
    const state = statusData.state || statusData.data?.state;
    const transactionId = statusData.paymentDetails?.[0]?.transactionId || 
                          statusData.data?.paymentDetails?.[0]?.transactionId ||
                          statusData.orderId;

    console.log('Payment state:', state, 'Transaction ID:', transactionId);

    // Create Supabase client
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    if (state === 'COMPLETED') {
      // Payment successful - update booking
      if (!is_addon && booking_id) {
        const { error: updateError } = await supabase
          .from('bookings')
          .update({
            payment_status: 'completed',
            payment_method: 'phonepe',
            phonepe_order_id: merchantOrderId,
            phonepe_transaction_id: transactionId,
            booking_status: 'confirmed',
          })
          .eq('booking_id', booking_id);

        if (updateError) {
          console.error('Error updating booking:', updateError);
          throw new Error('Failed to update booking');
        }

        console.log('Booking updated successfully');

        // Trigger SMS notification (fire and forget)
        try {
          supabase.functions.invoke('send-sms-notification', {
            body: { booking_id },
          }).catch(err => console.log('SMS notification error (non-blocking):', err));
        } catch (smsError) {
          console.log('SMS notification error (non-blocking):', smsError);
        }

        // Trigger admin notification (fire and forget)
        try {
          supabase.functions.invoke('send-admin-notification', {
            body: { booking_id },
          }).catch(err => console.log('Admin notification error (non-blocking):', err));
        } catch (adminError) {
          console.log('Admin notification error (non-blocking):', adminError);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          verified: true,
          state,
          transactionId,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (state === 'FAILED') {
      // Payment failed
      if (!is_addon && booking_id) {
        await supabase
          .from('bookings')
          .update({
            payment_status: 'failed',
            phonepe_order_id: merchantOrderId,
          })
          .eq('booking_id', booking_id);
      }

      return new Response(
        JSON.stringify({
          success: false,
          verified: false,
          state,
          message: 'Payment failed',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      // Payment pending or other state
      return new Response(
        JSON.stringify({
          success: false,
          verified: false,
          state,
          message: `Payment status: ${state}`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: any) {
    console.error('Error in verify-phonepe-payment:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error', success: false, verified: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});