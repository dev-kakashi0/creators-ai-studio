import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

/** Compare deux signatures hexadécimales en temps constant. */
function safeEqual(a: string, b: string) {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB);
}

/** Signature façon Stripe/FedaPay : `t=<timestamp>,s=<hmac>` (ou `v1=`). */
function verifySignedHeader(header: string | null, rawBody: string, secret: string) {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((chunk) => {
      const [key, value] = chunk.split("=");
      return [key?.trim() ?? "", value?.trim() ?? ""];
    }),
  ) as Record<string, string>;
  const timestamp = parts["t"] ?? "";
  const provided = parts["s"] ?? parts["v1"] ?? "";
  if (!provided) return false;
  const expected = createHmac("sha256", secret)
    .update(timestamp ? `${timestamp}.${rawBody}` : rawBody)
    .digest("hex");
  return safeEqual(provided, expected);
}

export const Route = createFileRoute("/api/public/webhooks/$provider")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const providerId = params.provider;
        const rawBody = await request.text();

        const secret =
          providerId === "stripe"
            ? process.env["STRIPE_WEBHOOK_SECRET"]
            : providerId === "fedapay"
              ? process.env["FEDAPAY_WEBHOOK_SECRET"]
              : providerId === "xpaye"
                ? process.env["XPAYE_WEBHOOK_SECRET"]
                : undefined;
        if (!secret) return new Response("Provider not configured", { status: 404 });

        if (providerId === "xpaye") {
          // XPaye : signature HMAC si fournie, sinon jeton partagé dans l'en-tête.
          const xpayeSignature = request.headers.get("x-xpaye-signature");
          const xpayeToken =
            request.headers.get("x-xpaye-token") ?? request.headers.get("x-webhook-token");
          const valid = xpayeSignature
            ? safeEqual(
                xpayeSignature,
                createHmac("sha256", secret).update(rawBody).digest("hex"),
              ) || verifySignedHeader(xpayeSignature, rawBody, secret)
            : Boolean(xpayeToken && safeEqual(xpayeToken, secret));
          if (!valid) return new Response("Invalid signature", { status: 401 });
        } else {
          const signature =
            request.headers.get("stripe-signature") ?? request.headers.get("x-fedapay-signature");
          if (!verifySignedHeader(signature, rawBody, secret)) {
            return new Response("Invalid signature", { status: 401 });
          }
        }


        const { getAdapter, fulfillPayment } = await import("@/lib/billing.server");
        const adapter = getAdapter(providerId);
        if (!adapter) return new Response("Unknown provider", { status: 404 });

        const event = await adapter.parseWebhook(request, rawBody);
        if (!event) return new Response("ignored", { status: 200 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        if (event.status === "succeeded") {
          await fulfillPayment(event.reference);
        } else {
          await supabaseAdmin
            .from("payments")
            .update({
              status: event.status,
              failure_reason: event.failureReason ?? null,
            })
            .eq("id", event.reference);
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
