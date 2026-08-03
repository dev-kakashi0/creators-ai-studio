import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const CurrencyEnum = z.enum(["EUR", "USD", "CAD", "GBP", "XOF", "XAF"]);

/** Détection du pays via les en-têtes edge, avec repli sur l'international. */
export const detectCountry = createServerFn({ method: "GET" }).handler(async () => {
  const country =
    getRequestHeader("cf-ipcountry") ??
    getRequestHeader("x-vercel-ip-country") ??
    getRequestHeader("x-country") ??
    null;
  return { country: country && country !== "XX" ? country.toUpperCase() : null };
});

const CouponInput = z.object({
  code: z.string().trim().min(2).max(40),
  kind: z.enum(["subscription", "pack"]),
  itemId: z.string().trim().min(1).max(60),
  currency: CurrencyEnum,
});

/** Vérifie un code promo et retourne le montant remisé. */
export const validateCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CouponInput.parse(input))
  .handler(async ({ data }) => {
    const { applyCoupon, resolvePrice } = await import("@/lib/billing.server");
    const price = await resolvePrice(data.kind, data.itemId, data.currency);
    try {
      const coupon = await applyCoupon(
        data.code,
        price.amount,
        price.currency,
        data.kind === "subscription" ? data.itemId : undefined,
      );
      if (!coupon) return { valid: false as const, reason: "COUPON_INVALID" };
      return {
        valid: true as const,
        code: coupon.code,
        discount: coupon.discount,
        total: Math.max(0, price.amount - coupon.discount),
        currency: price.currency,
      };
    } catch (error) {
      return { valid: false as const, reason: (error as Error).message };
    }
  });

const CheckoutInput = z.object({
  provider: z.string().trim().min(2).max(40),
  kind: z.enum(["subscription", "pack"]),
  itemId: z.string().trim().min(1).max(60),
  currency: CurrencyEnum,
  method: z.string().trim().max(40).optional(),
  couponCode: z.string().trim().max(40).optional(),
  country: z.string().trim().max(4).optional(),
  origin: z.string().trim().url().max(300),
});

/** Crée un paiement et retourne l'URL de checkout du fournisseur choisi. */
export const createCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CheckoutInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { applyCoupon, getAdapter, resolvePrice } = await import("@/lib/billing.server");

    const { data: provider } = await supabaseAdmin
      .from("payment_providers")
      .select("*")
      .eq("id", data.provider)
      .maybeSingle();
    if (!provider || !provider.enabled) throw new Error("PROVIDER_UNAVAILABLE");

    const adapter = getAdapter(data.provider);
    if (!adapter || !adapter.isConfigured()) throw new Error("PROVIDER_NOT_CONFIGURED");

    const price = await resolvePrice(data.kind, data.itemId, data.currency);
    if (price.amount <= 0) throw new Error("PRICE_UNAVAILABLE");

    const coupon = await applyCoupon(
      data.couponCode,
      price.amount,
      price.currency,
      data.kind === "subscription" ? data.itemId : undefined,
    );
    const total = Math.max(0, price.amount - (coupon?.discount ?? 0));

    const label =
      data.kind === "subscription" ? `Abonnement Solenya ${data.itemId}` : `Pack de crédits Solenya`;

    const { data: payment, error } = await supabaseAdmin
      .from("payments")
      .insert({
        user_id: context.userId,
        provider: data.provider,
        method: data.method ?? null,
        kind: data.kind,
        plan_id: data.kind === "subscription" ? data.itemId : null,
        pack_id: data.kind === "pack" ? data.itemId : null,
        amount: total,
        currency: price.currency,
        status: "pending",
        coupon_code: coupon?.code ?? null,
        country: data.country ?? null,
      })
      .select("id")
      .single();
    if (error || !payment) throw new Error("Impossible d'initialiser le paiement.");

    try {
      const result = await adapter.createCheckout({
        userId: context.userId,
        email: (context.claims["email"] as string) ?? "",
        kind: data.kind,
        itemId: data.itemId,
        label,
        amount: total,
        currency: price.currency,
        method: data.method,
        successUrl: `${data.origin}/facturation?paiement=succes`,
        cancelUrl: `${data.origin}/tarifs?paiement=annule`,
        reference: payment.id,
      });

      await supabaseAdmin
        .from("payments")
        .update({ reference: result.providerReference ?? payment.id })
        .eq("id", payment.id);

      return { paymentId: payment.id as string, url: result.url ?? null };
    } catch (providerError) {
      await supabaseAdmin
        .from("payments")
        .update({ status: "failed", failure_reason: (providerError as Error).message })
        .eq("id", payment.id);
      throw providerError;
    }
  });

const CancelInput = z.object({ resume: z.boolean().optional().default(false) });

/** Annule (ou réactive) l'abonnement à la fin de la période en cours. */
export const updateSubscriptionRenewal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CancelInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("subscriptions")
      .update({ cancel_at_period_end: !data.resume })
      .eq("user_id", context.userId)
      .in("status", ["active", "trialing", "past_due"]);
    if (error) throw new Error("Mise à jour de l'abonnement impossible.");
    return { cancelAtPeriodEnd: !data.resume };
  });
