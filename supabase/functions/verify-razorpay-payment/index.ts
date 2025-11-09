import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Try to get user but don't require it for payment verification
    const { data: { user } } = await supabaseClient.auth.getUser();
    
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      booking_id 
    } = await req.json();

    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!razorpayKeySecret) {
      throw new Error('Razorpay secret not configured');
    }

    // Verify signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(razorpayKeySecret);
    const messageData = encoder.encode(text);
    
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', key, messageData);
    const hashArray = Array.from(new Uint8Array(signature));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    if (hashHex !== razorpay_signature) {
      throw new Error('Invalid payment signature');
    }

    // Update booking with payment details
    const { data: booking, error: updateError } = await supabaseClient
      .from('bookings')
      .update({
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        payment_status: 'completed',
        payment_method: 'razorpay',
      })
      .eq('booking_id', booking_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating booking:', updateError);
      throw updateError;
    }

    console.log('Payment verified and booking updated:', booking_id);

    // Send WhatsApp confirmation (non-blocking)
    try {
      supabaseClient.functions.invoke('send-whatsapp-confirmation', {
        body: { booking_id }
      }).then(result => {
        if (result.error) {
          console.error('WhatsApp notification failed:', result.error);
        } else {
          console.log('WhatsApp notification sent successfully');
        }
      });
    } catch (whatsappError) {
      // Log but don't fail the payment
      console.error('Error triggering WhatsApp:', whatsappError);
    }

    return new Response(
      JSON.stringify({ success: true, booking }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'An error occurred';
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
