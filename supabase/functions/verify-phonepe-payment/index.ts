import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to generate SHA256 hash
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const merchantId = Deno.env.get('PHONEPE_MERCHANT_ID');
    const saltKey = Deno.env.get('PHONEPE_SALT_KEY');
    const saltIndex = Deno.env.get('PHONEPE_SALT_INDEX') || '1';
    const env = Deno.env.get('PHONEPE_ENV') || 'sandbox';
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!merchantId || !saltKey) {
      throw new Error('PhonePe credentials not configured');
    }

    // Support both old field name (merchantOrderId) and new (merchantTransactionId)
    const body = await req.json();
    const merchantTransactionId = body.merchantTransactionId || body.merchantOrderId;
    const { booking_id, is_addon } = body;

    if (!merchantTransactionId) {
      throw new Error('Missing merchantTransactionId');
    }

    // Determine API base URL based on environment
    const baseUrl = env === 'production' 
      ? 'https://api.phonepe.com/apis/hermes'
      : 'https://api-preprod.phonepe.com/apis/pg-sandbox';

    // Generate X-VERIFY checksum for status check
    const statusEndpoint = `/pg/v1/status/${merchantId}/${merchantTransactionId}`;
    const stringToHash = statusEndpoint + saltKey;
    const sha256Hash = await sha256(stringToHash);
    const xVerify = sha256Hash + '###' + saltIndex;

    console.log('Checking payment status for:', merchantTransactionId);

    // Make status check request
    const statusResponse = await fetch(`${baseUrl}${statusEndpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': xVerify,
        'X-MERCHANT-ID': merchantId,
      },
    });

    const statusData = await statusResponse.json();
    
    console.log('PhonePe status response:', JSON.stringify(statusData));

    if (!statusResponse.ok) {
      console.error('Status check error:', JSON.stringify(statusData));
      throw new Error(statusData.message || 'Failed to check payment status');
    }

    // Determine payment state from response
    const responseCode = statusData.code;
    const state = statusData.data?.state || statusData.data?.responseCode;
    const transactionId = statusData.data?.transactionId || merchantTransactionId;

    console.log('Payment response code:', responseCode, 'State:', state, 'Transaction ID:', transactionId);

    // Create Supabase client
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // Check if payment is successful
    if (responseCode === 'PAYMENT_SUCCESS' || state === 'COMPLETED') {
      // Payment successful - update booking
      if (!is_addon && booking_id) {
        const { error: updateError } = await supabase
          .from('bookings')
          .update({
            payment_status: 'completed',
            payment_method: 'phonepe',
            phonepe_order_id: merchantTransactionId,
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
          state: 'COMPLETED',
          transactionId,
          responseCode,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (responseCode === 'PAYMENT_ERROR' || responseCode === 'PAYMENT_DECLINED' || state === 'FAILED') {
      // Payment failed
      if (!is_addon && booking_id) {
        await supabase
          .from('bookings')
          .update({
            payment_status: 'failed',
            phonepe_order_id: merchantTransactionId,
          })
          .eq('booking_id', booking_id);
      }

      return new Response(
        JSON.stringify({
          success: false,
          verified: false,
          state: 'FAILED',
          message: statusData.message || 'Payment failed',
          responseCode,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      // Payment pending or other state
      return new Response(
        JSON.stringify({
          success: false,
          verified: false,
          state: state || responseCode,
          message: `Payment status: ${statusData.message || responseCode}`,
          responseCode,
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
