import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

const MODULE_PRICE_ID = "price_1TKLifBa92v5qxnigy4DavbH"; // €29/month subscription
const KI_PRICE_ID = "price_1TKLifBa92v5qxnibb87vF5q";     // €1.99 one-time KI use

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { type, successUrl, cancelUrl } = await req.json();

    const priceId = type === 'ki' ? KI_PRICE_ID : MODULE_PRICE_ID;
    const mode = type === 'ki' ? 'payment' : 'subscription';

    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email,
      success_url: successUrl || `${req.headers.get('origin')}/modules?payment=success&type=${type}`,
      cancel_url: cancelUrl || `${req.headers.get('origin')}/modules?payment=cancel`,
      metadata: {
        base44_app_id: Deno.env.get("BASE44_APP_ID"),
        user_email: user.email,
        payment_type: type,
      },
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});