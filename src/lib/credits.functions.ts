import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const JobInput = z.object({
  length: z.string().trim().max(20).optional().default("standard"),
  chapters: z.number().int().min(1).max(40),
  withIllustrations: z.boolean().optional().default(false),
  withCover: z.boolean().optional().default(true),
});

/**
 * Débite le forfait de génération complète (10 ou 20 crédits) et ouvre un job
 * couvrant le plan, les chapitres, les illustrations et la couverture.
 */
export const startEbookJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => JobInput.parse(input))
  .handler(async ({ data, context }) => {
    const { consumeCredits } = await import("@/lib/credits.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const premium = data.length === "premium";
    const key = premium ? "ebook_premium" : "ebook_standard";
    await consumeCredits(context.userId, key, key);

    const { data: job, error } = await supabaseAdmin
      .from("generation_jobs")
      .insert({
        user_id: context.userId,
        kind: key,
        outline_allowed: 1,
        chapters_allowed: data.chapters,
        illustrations_allowed: data.withIllustrations ? data.chapters : 0,
        covers_allowed: data.withCover ? 1 : 0,
      })
      .select("id")
      .single();

    if (error || !job) throw new Error("Impossible de démarrer la génération.");
    return { jobId: job.id as string };
  });

const PackInput = z.object({
  product: z.string().trim().min(3).max(300),
  details: z.string().trim().max(2000).optional().default(""),
  audience: z.string().trim().max(200).optional().default(""),
  language: z.string().trim().max(10).optional().default("fr"),
  style: z.string().trim().max(40).optional().default("professionnel"),
});

/** Pack marketing IA : page de vente + posts sociaux + séquence email (5 crédits). */
export const generateMarketingPack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => PackInput.parse(input))
  .handler(async ({ data, context }) => {
    const { billAction } = await import("@/lib/credits.server");
    const { runMarketingPack } = await import("@/lib/marketing-pack.server");
    await billAction(context.userId, "marketing_pack", { reason: "marketing_pack" });
    return runMarketingPack(data);
  });
