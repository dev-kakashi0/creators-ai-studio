import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Circle,
  Image as ImageIcon,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { useProfile } from "@/lib/auth";
import { useEbookGeneration } from "@/lib/use-ebook-generation";
import {
  AUDIENCES,
  LANGUAGES,
  LENGTHS,
  STYLES,
  generationCost,
  isTrialLength,
} from "@/lib/ebook-config";
import { QUALITIES, THEMES } from "@/lib/ebook-brand";
import { handleCreditError, useCostMap, openCreditModal } from "@/lib/credits";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/_authenticated/ebooks/nouveau")({
  component: NewEbookWizard,
  head: () => ({
    meta: [
      { title: "Créer un ebook IA · Solenya" },
      {
        name: "description",
        content:
          "Générez un ebook complet, illustré et prêt à publier en quelques minutes avec l'assistant Solenya.",
      },
    ],
  }),
});

const TOTAL_STEPS = 6;

function NewEbookWizard() {
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const { steps, running, generate } = useEbookGeneration();

  const [step, setStep] = useState(0);
  const [topic, setTopic] = useState("");
  const [language, setLanguage] = useState<string>("fr");
  const [style, setStyle] = useState<string>("professionnel");
  const [audience, setAudience] = useState<string>("");
  const [length, setLength] = useState<string>("standard");
  const [withIllustrations, setWithIllustrations] = useState(true);
  const [authorName, setAuthorName] = useState("");
  const [publisher, setPublisher] = useState("");
  const [website, setWebsite] = useState("");
  const [theme, setTheme] = useState<string>("modern");
  const [quality, setQuality] = useState<string>("premium");

  const costs = useCostMap();
  const cost = useMemo(() => generationCost(length, costs), [length, costs]);
  const credits = profile?.credits ?? 0;
  const canAfford = credits >= cost;

  const canContinue = [
    topic.trim().length >= 3,
    true,
    true,
    audience.trim().length > 0,
    true,
    true,
  ][step];

  async function launch() {
    if (!canAfford) {
      openCreditModal(cost);
      return;
    }
    try {
      const id = await generate({
        topic: topic.trim(),
        language,
        style,
        audience: audience.trim(),
        length,
        withIllustrations: withIllustrations && !isTrialLength(length),
        authorName: authorName.trim() || (profile?.full_name ?? ""),
        publisher: publisher.trim(),
        website: website.trim(),
        theme,
        quality,
      });
      toast.success("Ton ebook est prêt !");
      navigate({ to: "/ebooks/$id", params: { id } });
    } catch (error) {
      if (handleCreditError(error, cost)) return;
      toast.error(error instanceof Error ? error.message : "La génération a échoué.");
    }
  }


  if (running || steps.some((s) => s.state !== "pending")) {
    return (
      <AppShell title="Génération en cours" subtitle="Ton ebook s'écrit, reste sur cette page.">
        <div className="mx-auto max-w-2xl">
          <ProgressPanel steps={steps} running={running} />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Nouvel ebook"
      subtitle="6 étapes, une idée, un livre complet."
      actions={
        <span
          className={cn(
            "hidden rounded-full px-3 py-2 text-sm font-semibold sm:inline-flex",
            canAfford ? "bg-primary-soft text-primary" : "bg-destructive/10 text-destructive",
          )}
        >
          {cost} crédits
        </span>
      }
    >
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center gap-2">
          {Array.from({ length: TOTAL_STEPS + 1 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                i <= step ? "bg-primary" : "bg-muted",
              )}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22 }}
            className="card-premium p-6 md:p-8"
          >
            {step === 0 && (
              <StepBlock
                index={1}
                title="Quel est le sujet de ton ebook ?"
                hint="Une phrase suffit, l'IA se charge du titre commercial."
              >
                <textarea
                  autoFocus
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  maxLength={300}
                  rows={4}
                  placeholder="Ex : lancer une boutique e-commerce rentable en 30 jours"
                  className="w-full resize-none rounded-2xl border border-input bg-card p-4 text-base outline-none focus:border-primary focus:ring-4 focus:ring-ring/15"
                />
              </StepBlock>
            )}

            {step === 1 && (
              <StepBlock index={2} title="Dans quelle langue ?" hint="La rédaction complète suivra cette langue.">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {LANGUAGES.map((item) => (
                    <Choice
                      key={item.id}
                      active={language === item.id}
                      onClick={() => setLanguage(item.id)}
                      title={item.label}
                    />
                  ))}
                </div>
              </StepBlock>
            )}

            {step === 2 && (
              <StepBlock index={3} title="Quel style d'écriture ?" hint="Le ton donné à tout le livre.">
                <div className="grid gap-3 sm:grid-cols-2">
                  {STYLES.map((item) => (
                    <Choice
                      key={item.id}
                      active={style === item.id}
                      onClick={() => setStyle(item.id)}
                      title={item.label}
                      subtitle={item.hint}
                    />
                  ))}
                </div>
              </StepBlock>
            )}

            {step === 3 && (
              <StepBlock index={4} title="À qui s'adresse ce livre ?" hint="Plus c'est précis, plus le contenu est pertinent.">
                <div className="mb-4 flex flex-wrap gap-2">
                  {AUDIENCES.map((item) => (
                    <button
                      key={item}
                      onClick={() => setAudience(item)}
                      className={cn(
                        "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                        audience === item
                          ? "border-primary bg-primary-soft text-primary"
                          : "border-input text-muted-foreground hover:bg-accent",
                      )}
                    >
                      {item}
                    </button>
                  ))}
                </div>
                <input
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  maxLength={200}
                  placeholder="Ou décris ton audience"
                  className="h-12 w-full rounded-2xl border border-input bg-card px-4 text-base outline-none focus:border-primary focus:ring-4 focus:ring-ring/15"
                />
              </StepBlock>
            )}

            {step === 4 && (
              <StepBlock index={5} title="Quelle longueur ?" hint="Tu pourras ajouter des chapitres plus tard.">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {LENGTHS.map((item) => (
                    <Choice
                      key={item.id}
                      active={length === item.id}
                      onClick={() => setLength(item.id)}
                      title={item.label}
                      subtitle={`${item.pages} · ${item.chapters} chapitres · ${generationCost(item.id, costs)} cr.`}
                    />
                  ))}
                </div>
                {isTrialLength(length) && (
                  <p className="mt-3 rounded-2xl border border-input bg-muted/40 p-3 text-xs text-muted-foreground">
                    Format découverte inclus dans les 5 crédits du plan gratuit : 3 chapitres, couverture
                    incluse, illustrations désactivées et filigrane « Created with Solenya AI » sur l'export.
                  </p>
                )}

                <button
                  onClick={() => setWithIllustrations((v) => !v)}
                  disabled={isTrialLength(length)}
                  className={cn(
                    "mt-4 flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-colors",
                    withIllustrations && !isTrialLength(length)
                      ? "border-primary bg-primary-soft/60"
                      : "border-input",
                    isTrialLength(length) && "cursor-not-allowed opacity-50",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-9 items-center justify-center rounded-xl",
                      withIllustrations
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <ImageIcon size={17} />
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-semibold">Illustrations de chapitres</span>
                    <span className="block text-xs text-muted-foreground">
                      Une image originale au début de chaque chapitre
                    </span>
                  </span>
                  {withIllustrations ? (
                    <Check size={18} className="text-primary" />
                  ) : (
                    <X size={18} className="text-muted-foreground" />
                  )}
                </button>
              </StepBlock>
            )}

            {step === 5 && (
              <StepBlock
                index={6}
                title="Identité & thème"
                hint="Ces informations apparaissent sur la couverture, la page de copyright et les pieds de page."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    maxLength={120}
                    placeholder="Nom de l'auteur"
                    className="h-12 w-full rounded-2xl border border-input bg-card px-4 text-base outline-none focus:border-primary focus:ring-4 focus:ring-ring/15"
                  />
                  <input
                    value={publisher}
                    onChange={(e) => setPublisher(e.target.value)}
                    maxLength={120}
                    placeholder="Éditeur / marque (optionnel)"
                    className="h-12 w-full rounded-2xl border border-input bg-card px-4 text-base outline-none focus:border-primary focus:ring-4 focus:ring-ring/15"
                  />
                  <input
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    maxLength={200}
                    placeholder="Site web (optionnel)"
                    className="h-12 w-full rounded-2xl border border-input bg-card px-4 text-base outline-none focus:border-primary focus:ring-4 focus:ring-ring/15 sm:col-span-2"
                  />
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {THEMES.map((t) => (
                    <Choice
                      key={t.id}
                      active={theme === t.id}
                      onClick={() => setTheme(t.id)}
                      title={t.label}
                      subtitle={t.hint}
                    />
                  ))}
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-4">
                  {QUALITIES.map((q) => (
                    <Choice
                      key={q.id}
                      active={quality === q.id}
                      onClick={() => setQuality(q.id)}
                      title={q.label}
                      subtitle={q.hint}
                    />
                  ))}
                </div>
              </StepBlock>
            )}

            {step === 6 && (

              <StepBlock index={6} title="Tout est prêt" hint="Vérifie le brief puis lance la génération.">
                <dl className="grid gap-3 sm:grid-cols-2">
                  <Recap label="Sujet" value={topic} />
                  <Recap label="Langue" value={LANGUAGES.find((l) => l.id === language)!.label} />
                  <Recap label="Style" value={STYLES.find((s) => s.id === style)!.label} />
                  <Recap label="Audience" value={audience} />
                  <Recap
                    label="Longueur"
                    value={`${LENGTHS.find((l) => l.id === length)!.label} · ${
                      LENGTHS.find((l) => l.id === length)!.pages
                    }`}
                  />
                  <Recap label="Illustrations" value={withIllustrations && !isTrialLength(length) ? "Oui" : "Non"} />
                </dl>
                <div
                  className={cn(
                    "mt-5 rounded-2xl border p-4 text-sm",
                    canAfford
                      ? "border-border bg-muted/50 text-muted-foreground"
                      : "border-destructive/40 bg-destructive/10 text-destructive",
                  )}
                >
                  Coût de la génération : <strong>{cost} crédits</strong> — solde actuel :{" "}
                  <strong>{credits}</strong>
                  {!canAfford && " · recharge tes crédits depuis la page Tarifs."}
                </div>
              </StepBlock>
            )}

            <div className="mt-8 flex items-center justify-between gap-3">
              <button
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0}
                className="inline-flex items-center gap-2 rounded-xl border border-input px-4 py-3 text-sm font-semibold transition-colors hover:bg-accent disabled:opacity-40"
              >
                <ArrowLeft size={16} /> Retour
              </button>

              {step < TOTAL_STEPS ? (
                <button
                  onClick={() => setStep((s) => s + 1)}
                  disabled={!canContinue}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5 disabled:opacity-50"
                >
                  Continuer <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  onClick={launch}
                  disabled={!canAfford}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5 disabled:opacity-50"
                >
                  <Sparkles size={16} /> Générer mon ebook
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </AppShell>
  );
}

function StepBlock({
  index,
  title,
  hint,
  children,
}: {
  index: number;
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
        Étape {index} / 6
      </div>
      <h2 className="mt-2 font-display text-2xl font-bold">{title}</h2>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">{hint}</p>
      {children}
    </div>
  );
}

function Choice({
  active,
  onClick,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-2xl border p-4 text-left transition-all",
        active
          ? "border-primary bg-primary-soft/60 shadow-soft"
          : "border-input hover:-translate-y-0.5 hover:bg-accent",
      )}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">{title}</span>
        {active && <Check size={15} className="text-primary" />}
      </span>
      {subtitle && <span className="mt-1 block text-xs text-muted-foreground">{subtitle}</span>}
    </button>
  );
}

function Recap({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-muted/40 p-4">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium">{value || "—"}</dd>
    </div>
  );
}

export function ProgressPanel({
  steps,
  running,
}: {
  steps: ReturnType<typeof useEbookGeneration>["steps"];
  running: boolean;
}) {
  const done = steps.filter((s) => s.state === "done").length;
  const percent = Math.round((done / steps.length) * 100);

  return (
    <div className="card-premium overflow-hidden p-6 md:p-8">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
          {running ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
        </span>
        <div className="flex-1">
          <h2 className="font-display text-lg font-bold">
            {running ? "Solenya écrit ton livre…" : "Génération terminée"}
          </h2>
          <p className="text-sm text-muted-foreground">{percent}% terminé</p>
        </div>
      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full bg-gradient-primary"
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      <ul className="mt-6 space-y-1">
        {steps.map((s) => (
          <li
            key={s.id}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-colors",
              s.state === "running" && "bg-primary-soft/60",
            )}
          >
            <span className="flex size-6 items-center justify-center">
              {s.state === "done" && <Check size={16} className="text-success" />}
              {s.state === "running" && <Loader2 size={16} className="animate-spin text-primary" />}
              {s.state === "error" && <X size={16} className="text-destructive" />}
              {s.state === "pending" && <Circle size={11} className="text-muted-foreground/50" />}
            </span>
            <span
              className={cn(
                "flex-1 font-medium",
                s.state === "pending" && "text-muted-foreground",
                s.state === "done" && "text-foreground",
              )}
            >
              {s.label}
            </span>
            {s.detail && <span className="text-xs text-muted-foreground">{s.detail}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
