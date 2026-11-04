// services/arsel-events.ts — called from our checkout service
const ARSEL = 'https://api.arsel.sa/v1';

export async function sendCartAbandoned(cart: { userId: string; email: string; total: string; items: unknown[] }) {
  const res = await fetch(`${ARSEL}/events/send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.ARSEL_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      events: [
        {
          event: 'cart.abandoned',
          email: cart.email,
          data: { cartTotal: cart.total, itemCount: cart.items.length, currency: 'SAR' },
        },
      ],
    }),
  });
  if (res.status !== 202) throw new Error(`arsel ${res.status}`);
}

/*
Event definition in Arsel (from the dashboard):
  name: cart.abandoned
  fields:
    total       number   (not required)
    item_count  number   (not required)
    currency    string   (not required)

Automation "Cart abandoned – reminder": trigger = cart.abandoned,
condition: total > 100
*/
