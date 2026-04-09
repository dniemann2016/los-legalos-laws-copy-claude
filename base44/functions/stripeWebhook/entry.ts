import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

Deno.serve(async (req) => {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, Deno.env.get("STRIPE_WEBHOOK_SECRET"));
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return new Response('Webhook signature error', { status: 400 });
  }

  const base44 = createClientFromRequest(req);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.metadata?.user_email || session.customer_email;
    const paymentType = session.metadata?.payment_type;

    if (!email) {
      console.error('No email in session metadata');
      return Response.json({ received: true });
    }

    try {
      const users = await base44.asServiceRole.entities.User.filter({ email });
      if (!users || users.length === 0) {
        console.error('User not found:', email);
        return Response.json({ received: true });
      }
      const userId = users[0].id;

      if (paymentType === 'ki') {
        const currentCredits = users[0].kiCredits || 0;
        await base44.asServiceRole.entities.User.update(userId, {
          kiCredits: currentCredits + 1,
        });
        console.log(`Added 1 KI credit to ${email}`);
      } else {
        // subscription
        await base44.asServiceRole.entities.User.update(userId, {
          hasModuleAccess: true,
        });
        console.log(`Module access granted to ${email}`);
      }
    } catch (err) {
      console.error('Error updating user:', err.message);
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    const customer = await stripe.customers.retrieve(subscription.customer);
    const email = customer.email;
    if (email) {
      try {
        const users = await base44.asServiceRole.entities.User.filter({ email });
        if (users && users.length > 0) {
          await base44.asServiceRole.entities.User.update(users[0].id, { hasModuleAccess: false });
          console.log(`Module access revoked from ${email}`);
        }
      } catch (err) {
        console.error('Error revoking access:', err.message);
      }
    }
  }

  return Response.json({ received: true });
});