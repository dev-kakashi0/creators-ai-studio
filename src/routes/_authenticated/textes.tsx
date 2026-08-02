import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { motion } from "motion/react";
import { Copy, Loader2, Save, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { COPY_KINDS, generateMarketingCopy, type CopyKind } from "@/lib/ai.functions";
import { LANGUAGES, STYLES } from "@/lib/ebook-config";
import { generateMarketingPack } from "@/lib/credits.functions";
import { handleCreditError, useCreditCost } from "@/lib/credits";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/textes")({
  component: CopyStudio,
  head: () => ({
    meta: [
      { title: "Studio copywriting IA · Solenya" },
      {
        name: "description",
        content:
          "Générez pages de vente, descriptions Amazon ou Gumroad, publicités, scripts TikTok et séquences email pour vendre vos ebooks.",
      },
    ],
  }),
});

function CopyStudio() {
  const queryClient = useQueryClient();
  const runCopy = useServerFn(generateMarketingCopy);
  const runPack = useServerFn(generateMarketingPack);
  const copyCost = useCreditCost("copy");
  const packCost = useCreditCost("marketing_pack");

  const [kind, setKind] = useState<CopyKind>("sales_page");
  const [product, setProduct] = useState("");
  const [details, setDetails] = useState("");
  const [audience, setAudience] = useState("");
  const [language, setLanguage] = useState("fr");
  const [style, setStyle] = useState("persuasif");
  const [result, setResult] = useState("");

  const { data: ebooks } = useQuery({
    queryKey: ["ebooks-titles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ebooks")
        .select("id, title, subtitle, topic, audience")
        .order("updated_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return data;
    },
  });

  const generation = useMutation({
    mutationFn: async () => {
      if (product.trim().length < 3) throw new Error("Indique le produit à promouvoir.");
      const { content } = await runCopy({
        data: { kind, product: product.trim(), details, audience, language, style },
      });
      return content;
    },
    onSuccess: (content) => {
      setResult(content);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Texte généré");
    },
    onError: (error) => {
      if (handleCreditError(error, copyCost)) return;
      toast.error(error instanceof Error ? error.message : "Génération impossible");
    },
  });

  const pack = useMutation({
    mutationFn: async () => {
      if (product.trim().length < 3) throw new Error("Indique le produit à promouvoir.");
      const result = await runPack({
        data: { product: product.trim(), details, audience, language, style },
      });
      return [
        "# Page de vente",
        result.salesPage,
        "\n\n# Posts sociaux",
        result.socialPosts,
        "\n\n# Séquence email",
        result.emailSequence,
      ].join("\n\n");
    },
    onSuccess: (content) => {
      setResult(content);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["credit-history"] });
      toast.success("Pack marketing généré");
    },
    onError: (error) => {
      if (handleCreditError(error, packCost)) return;
      toast.error(error instanceof Error ? error.message : "Génération impossible");
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("copies").insert({
        user_id: auth.user!.id,
        kind,
        title: `${COPY_KINDS.find((k) => k.id === kind)!.label} — ${product}`,
        brief: details,
        content: result,
      });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Enregistré dans la bibliothèque"),
    onError: () => toast.error("Enregistrement impossible"),
  });

  return (
    <AppShell
      title="Studio copywriting"
      subtitle="13 générateurs pour vendre tes ebooks partout."
    >
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <aside className="flex flex-col gap-5">
          <div className="card-premium space-y-4 p-5">
            <h2 className="font-display text-base font-bold">Brief</h2>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Produit
              </span>
              <input
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                maxLength={300}
                placeholder="Titre de ton ebook"
                className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-ring/15"
              />
            </label>

            {(ebooks ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {(ebooks ?? []).slice(0, 6).map((ebook) => (
                  <button
                    key={ebook.id}
                    onClick={() => {
                      setProduct(ebook.title);
                      setDetails(
                        [ebook.subtitle, ebook.topic].filter(Boolean).join(" — ").slice(0, 2000),
                      );
                      setAudience(ebook.audience ?? "");
                    }}
                    className="rounded-full border border-input px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent"
                  >
                    {ebook.title.slice(0, 28)}
                  </button>
                ))}
              </div>
            )}

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Détails
              </span>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                maxLength={2000}
                rows={4}
                placeholder="Promesse, contenu, prix, bonus…"
                className="w-full resize-none rounded-xl border border-input bg-card p-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-ring/15"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Audience
              </span>
              <input
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                maxLength={200}
                placeholder="Entrepreneurs débutants"
                className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-ring/15"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Langue
                </span>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none focus:border-primary"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Style
                </span>
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none focus:border-primary"
                >
                  {STYLES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button
              onClick={() => generation.mutate()}
              disabled={generation.isPending}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5 disabled:opacity-50"
            >
              {generation.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Wand2 size={16} />
              )}
              Générer ({copyCost} crédit{copyCost > 1 ? "s" : ""})
            </button>

            <button
              onClick={() => pack.mutate()}
              disabled={pack.isPending}
              className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-input text-sm font-semibold transition-colors hover:bg-accent disabled:opacity-50"
            >
              {pack.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Sparkles size={16} />
              )}
              Pack marketing IA ({packCost} crédits)
            </button>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Page de vente + posts sociaux + séquence email en une seule génération.
            </p>
          </div>
        </aside>

        <section className="flex flex-col gap-5">
          <div className="card-premium p-5">
            <h2 className="font-display text-base font-bold">Générateurs</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {COPY_KINDS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setKind(item.id)}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm font-medium transition-all",
                    kind === item.id
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-input text-muted-foreground hover:-translate-y-0.5 hover:bg-accent",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <motion.div layout className="card-premium min-h-[420px] p-6">
            {result ? (
              <>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-display text-base font-bold">
                    {COPY_KINDS.find((k) => k.id === kind)!.label}
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        void navigator.clipboard.writeText(result);
                        toast.success("Copié");
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-input px-3 py-2 text-sm font-semibold transition-colors hover:bg-accent"
                    >
                      <Copy size={14} /> Copier
                    </button>
                    <button
                      onClick={() => save.mutate()}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-input px-3 py-2 text-sm font-semibold transition-colors hover:bg-accent"
                    >
                      <Save size={14} /> Enregistrer
                    </button>
                  </div>
                </div>
                <textarea
                  value={result}
                  onChange={(e) => setResult(e.target.value)}
                  rows={22}
                  className="w-full resize-y rounded-xl border border-input bg-card p-4 text-sm leading-relaxed outline-none focus:border-primary focus:ring-4 focus:ring-ring/15"
                />
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center py-20 text-center">
                <span className="flex size-16 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                  <Sparkles size={26} />
                </span>
                <h3 className="mt-5 font-display text-xl font-bold">Choisis un générateur</h3>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                  Page de vente, description Amazon, publicités, scripts TikTok, séquence email,
                  hashtags, prix… tout ce qu'il faut pour vendre ton ebook.
                </p>
              </div>
            )}
          </motion.div>
        </section>
      </div>
    </AppShell>
  );
}
