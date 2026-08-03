import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  CURRENCIES,
  type CurrencyCode,
  regionForCurrency,
} from "@/lib/billing-config";

/* ------------------------------------------------------------------ */
/* Registre modulaire de fournisseurs de paiement                      */
/* ------------------------------------------------------------------ */

export type CheckoutRequest = {
  userId: string;
  email: string;
  kind: "subscription" | "pack";
  itemId: string;
  label: string;
  amount: number;
  currency: CurrencyCode;
  method?: string | undefined;
  successUrl: string;
  cancelUrl: string;
  reference: string;
};

export type CheckoutResult = {
  /** URL de redirection vers la page de paiement hébergée du fournisseur. */
  url?: string;
  providerReference?: string;
};

export type WebhookEvent = {
  reference: string;
  status: "succeeded" | "failed" | "refunded";
  providerReference?: string;
  method?: string;
  failureReason?: string;
};

export type PaymentAdapter = {
  id: string;
  /** Les clés API sont-elles présentes côté serveur ? */
  isConfigured(): boolean;
  createCheckout(request: CheckoutRequest): Promise<CheckoutResult>;
  parseWebhook(request: Request, rawBody: string): Promise<WebhookEvent | null>;
};

function minorUnits(amount: number, currency: CurrencyCode) {
  return CURRENCIES[currency]?.zeroDecimal ? Math.round(amount) : Math.round(amount * 100);
}

/* ----------------------------- Stripe ----------------------------- */

const stripeAdapter: PaymentAdapter = {
  id: "stripe",
  isConfigured: () => Boolean(process.env["STRIPE_SECRET_KEY"]),
  async createCheckout(request) {
    const key = process.env["STRIPE_SECRET_KEY"];
    if (!key) throw new Error("PROVIDER_NOT_CONFIGURED");

    const body = new URLSearchParams();
    body.set("mode", request.kind === "subscription" ? "subscription" : "payment");
    body.set("success_url", request.successUrl);
    body.set("cancel_url", request.cancelUrl);
    body.set("customer_email", request.email);
    body.set("client_reference_id", request.reference);
    body.set("metadata[reference]", request.reference);
    body.set("line_items[0][quantity]", "1");
    body.set("line_items[0][price_data][currency]", request.currency.toLowerCase());
    body.set("line_items[0][price_data][product_data][name]", request.label);
    body.set(
      "line_items[0][price_data][unit_amount]",
      String(minorUnits(request.amount, request.currency)),
    );
    if (request.kind === "subscription") {
      body.set("line_items[0][price_data][recurring][interval]", "month");
    }

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    const payload = (await response.json()) as { id?: string; url?: string; error?: { message?: string } };
    if (!response.ok) {
      throw new Error(payload.error?.message ?? "Stripe: création du paiement impossible.");
    }
    return { url: payload.url ?? "", providerReference: payload.id ?? "" };
  },
  async parseWebhook(_request, rawBody) {
    const event = JSON.parse(rawBody) as {
      type?: string;
      data?: { object?: Record<string, unknown> };
    };
    const object = event.data?.object ?? {};
    const reference =
      (object["client_reference_id"] as string | undefined) ??
      ((object["metadata"] as Record<string, string> | undefined)?.["reference"] ?? "");
    if (!reference) return null;

    if (event.type === "checkout.session.completed") {
      return { reference, status: "succeeded", providerReference: object["id"] as string };
    }
    if (event.type === "checkout.session.async_payment_failed" || event.type === "payment_intent.payment_failed") {
      return { reference, status: "failed", failureReason: "Paiement refusé par la banque." };
    }
    if (event.type === "charge.refunded") {
      return { reference, status: "refunded" };
    }
    return null;
  },
};

/* ----------------------------- FedaPay ---------------------------- */

const fedapayAdapter: PaymentAdapter = {
  id: "fedapay",
  isConfigured: () => Boolean(process.env["FEDAPAY_SECRET_KEY"]),
  async createCheckout(request) {
    const key = process.env["FEDAPAY_SECRET_KEY"];
    if (!key) throw new Error("PROVIDER_NOT_CONFIGURED");
    const base =
      process.env["FEDAPAY_MODE"] === "live"
        ? "https://api.fedapay.com/v1"
        : "https://sandbox-api.fedapay.com/v1";

    const create = await fetch(`${base}/transactions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        description: request.label,
        amount: Math.round(request.amount),
        currency: { iso: request.currency },
        callback_url: request.successUrl,
        customer: { email: request.email },
        custom_metadata: { reference: request.reference },
      }),
    });
    const created = (await create.json()) as {
      "v1/transaction"?: { id?: number };
      message?: string;
    };
    if (!create.ok || !created["v1/transaction"]?.id) {
      throw new Error(created.message ?? "FedaPay: création de la transaction impossible.");
    }
    const transactionId = created["v1/transaction"].id;

    const token = await fetch(`${base}/transactions/${transactionId}/token`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const tokenPayload = (await token.json()) as { url?: string; message?: string };
    if (!token.ok || !tokenPayload.url) {
      throw new Error(tokenPayload.message ?? "FedaPay: lien de paiement indisponible.");
    }
    return { url: tokenPayload.url, providerReference: String(transactionId) };
  },
  async parseWebhook(_request, rawBody) {
    const event = JSON.parse(rawBody) as {
      name?: string;
      entity?: { id?: number; status?: string; custom_metadata?: { reference?: string }; mode?: string };
    };
    const reference = event.entity?.custom_metadata?.reference;
    if (!reference) return null;
    const status = event.entity?.status;
    if (status === "approved" || event.name === "transaction.approved") {
      return { reference, status: "succeeded", providerReference: String(event.entity?.id ?? "") };
    }
    if (status === "declined" || status === "canceled") {
      return { reference, status: "failed", failureReason: "Paiement refusé ou annulé." };
    }
    return null;
  },
};

/** Nouveaux fournisseurs : ajouter un adaptateur ici, aucun autre fichier à modifier. */
export const ADAPTERS: Record<string, PaymentAdapter> = {
  stripe: stripeAdapter,
  fedapay: fedapayAdapter,
};

export function getAdapter(providerId: string): PaymentAdapter | null {
  return ADAPTERS[providerId] ?? null;
}

/* ------------------------------------------------------------------ */
/* Tarification localisée                                              */
/* ------------------------------------------------------------------ */

async function priceRow(kind: "subscription" | "pack", itemId: string, currency: string) {
  if (kind === "subscription") {
    const { data } = await supabaseAdmin
      .from("plan_prices")
      .select("amount")
      .eq("plan_id", itemId)
      .eq("currency", currency)
      .maybeSingle();
    return data;
  }
  const { data } = await supabaseAdmin
    .from("pack_prices")
    .select("amount")
    .eq("pack_id", itemId)
    .eq("currency", currency)
    .maybeSingle();
  return data;
}

export async function resolvePrice(
  kind: "subscription" | "pack",
  itemId: string,
  currency: CurrencyCode,
) {
  const data = await priceRow(kind, itemId, currency);
  if (data) return { amount: Number(data.amount), currency };
  const fallback = await priceRow(kind, itemId, "EUR");
  return { amount: Number(fallback?.amount ?? 0), currency: "EUR" as CurrencyCode };
}


/* ------------------------------------------------------------------ */
/* Coupons                                                             */
/* ------------------------------------------------------------------ */

export type AppliedCoupon = { code: string; discount: number; trialDays: number };

export async function applyCoupon(
  code: string | undefined,
  amount: number,
  currency: CurrencyCode,
  planId?: string,
): Promise<AppliedCoupon | null> {
  if (!code) return null;
  const { data } = await supabaseAdmin
    .from("coupons")
    .select("*")
    .eq("code", code.trim().toUpperCase())
    .maybeSingle();
  if (!data || !data.active) throw new Error("COUPON_INVALID");
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now())
    throw new Error("COUPON_EXPIRED");
  if (data.max_redemptions !== null && data.redeemed_count >= data.max_redemptions)
    throw new Error("COUPON_EXHAUSTED");
  if (data.plan_id && planId && data.plan_id !== planId) throw new Error("COUPON_INVALID");

  let discount = 0;
  if (data.percent_off) discount = (amount * data.percent_off) / 100;
  else if (data.amount_off && (!data.currency || data.currency === currency))
    discount = Number(data.amount_off);

  discount = Math.min(discount, amount);
  return { code: data.code, discount, trialDays: data.trial_days ?? 0 };
}

/* ------------------------------------------------------------------ */
/* Activation après paiement                                           */
/* ------------------------------------------------------------------ */

async function nextInvoiceNumber() {
  const { data } = await supabaseAdmin
    .from("billing_settings")
    .select("value")
    .eq("key", "general")
    .maybeSingle();
  const prefix = ((data?.value as Record<string, unknown> | null)?.["invoice_prefix"] as string) ?? "SOL";
  const { count } = await supabaseAdmin
    .from("invoices")
    .select("id", { count: "exact", head: true });
  return `${prefix}-${new Date().getFullYear()}-${String((count ?? 0) + 1).padStart(5, "0")}`;
}

/** Applique un paiement réussi : plan, crédits, facture. Idempotent. */
export async function fulfillPayment(paymentId: string) {
  const { data: payment } = await supabaseAdmin
    .from("payments")
    .select("*")
    .eq("id", paymentId)
    .maybeSingle();
  if (!payment || payment.status === "succeeded") return;

  await supabaseAdmin
    .from("payments")
    .update({ status: "succeeded" })
    .eq("id", paymentId);

  if (payment.kind === "subscription" && payment.plan_id) {
    const { data: plan } = await supabaseAdmin
      .from("plans")
      .select("monthly_credits, name")
      .eq("id", payment.plan_id)
      .maybeSingle();

    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    await supabaseAdmin
      .from("subscriptions")
      .update({ status: "canceled" })
      .eq("user_id", payment.user_id)
      .in("status", ["active", "trialing", "past_due"]);

    await supabaseAdmin.from("subscriptions").insert({
      user_id: payment.user_id,
      plan_id: payment.plan_id,
      status: "active",
      provider: payment.provider,
      provider_reference: payment.reference,
      currency: payment.currency,
      amount: payment.amount,
      current_period_end: periodEnd.toISOString(),
      coupon_code: payment.coupon_code,
    });

    await supabaseAdmin
      .from("profiles")
      .update({ plan: payment.plan_id, credits_renew_at: periodEnd.toISOString() })
      .eq("id", payment.user_id);

    if (plan?.monthly_credits) {
      await supabaseAdmin.rpc("add_credits_for", {
        _user_id: payment.user_id,
        _amount: plan.monthly_credits,
        _reason: "subscription_renewal",
        _kind: "renewal",
      });
      await supabaseAdmin
        .from("payments")
        .update({ credits_granted: plan.monthly_credits })
        .eq("id", paymentId);
    }
  }

  if (payment.kind === "pack" && payment.pack_id) {
    const { data: pack } = await supabaseAdmin
      .from("credit_packs")
      .select("credits")
      .eq("id", payment.pack_id)
      .maybeSingle();
    if (pack?.credits) {
      await supabaseAdmin.rpc("add_credits_for", {
        _user_id: payment.user_id,
        _amount: pack.credits,
        _reason: "credit_pack",
        _kind: "purchase",
      });
      await supabaseAdmin
        .from("payments")
        .update({ credits_granted: pack.credits })
        .eq("id", paymentId);
    }
  }

  if (payment.coupon_code) {
    const { data: coupon } = await supabaseAdmin
      .from("coupons")
      .select("redeemed_count")
      .eq("code", payment.coupon_code)
      .maybeSingle();
    if (coupon) {
      await supabaseAdmin
        .from("coupons")
        .update({ redeemed_count: (coupon.redeemed_count ?? 0) + 1 })
        .eq("code", payment.coupon_code);
    }
  }

  await supabaseAdmin.from("invoices").insert({
    user_id: payment.user_id,
    payment_id: paymentId,
    number: await nextInvoiceNumber(),
    label: payment.kind === "subscription" ? `Abonnement ${payment.plan_id}` : `Pack ${payment.pack_id}`,
    amount: payment.amount,
    currency: payment.currency,
    status: "paid",
  });
}

export function currencyRegion(currency: CurrencyCode) {
  return regionForCurrency(currency);
}
