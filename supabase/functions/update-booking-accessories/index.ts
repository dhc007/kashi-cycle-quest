import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { bookingId, accessories, priceDifference } = await req.json();

    // Verify booking belongs to user
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .eq('user_id', user.id)
      .single();

    if (bookingError || !booking) {
      return new Response(JSON.stringify({ error: 'Booking not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if booking can be edited (2 hours before pickup)
    const now = new Date();
    const pickupDateTime = new Date(`${booking.pickup_date}T${booking.pickup_time}`);
    const twoHoursBefore = new Date(pickupDateTime.getTime() - 2 * 60 * 60 * 1000);

    if (now >= twoHoursBefore) {
      return new Response(
        JSON.stringify({ error: 'Cannot edit booking within 2 hours of pickup time' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Delete existing accessories
    const { error: deleteError } = await supabase
      .from('booking_accessories')
      .delete()
      .eq('booking_id', bookingId);

    if (deleteError) throw deleteError;

    // Insert new accessories
    if (accessories.length > 0) {
      const accessoriesData = accessories.map((acc: any) => ({
        booking_id: bookingId,
        accessory_id: acc.accessory_id,
        quantity: acc.quantity,
        days: acc.days,
        price_per_day: acc.price_per_day,
        total_cost: acc.quantity * acc.price_per_day * acc.days,
      }));

      const { error: insertError } = await supabase
        .from('booking_accessories')
        .insert(accessoriesData);

      if (insertError) throw insertError;
    }

    // Calculate new totals
    const newAccessoriesCost = accessories.reduce(
      (sum: number, acc: any) => sum + acc.quantity * acc.price_per_day * acc.days,
      0
    );

    const subtotal = booking.cycle_rental_cost + newAccessoriesCost;
    const gst = subtotal * 0.18;
    const totalAmount = subtotal + gst + booking.security_deposit - (booking.discount_amount || 0);

    // Update booking
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        accessories_cost: newAccessoriesCost,
        gst,
        total_amount: totalAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (updateError) throw updateError;

    // Send notification to admin
    try {
      await supabase.functions.invoke('send-admin-notification', {
        body: {
          type: 'booking_modified',
          bookingId: booking.booking_id,
          message: `Booking ${booking.booking_id} has been modified by the user.`,
        },
      });
    } catch (notifError) {
      // Non-blocking notification
    }

    return new Response(
      JSON.stringify({
        success: true,
        priceDifference,
        message: priceDifference > 0
          ? 'Booking updated. Additional payment required.'
          : 'Booking updated successfully.',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
