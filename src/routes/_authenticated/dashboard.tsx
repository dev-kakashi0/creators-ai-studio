import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import {
  ArrowRight,
  BookOpen,
  Compass,
  Image as ImageIcon,
  PenLine,
  Sparkles,
  TrendingUp,
  Video,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function useStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [ebooks, images, copies, videos, recent] = await Promise.all([
        supabase.from("ebooks").select("id", { count: "exact", head: true }),
        supabase.from("images").select("id", { count: "exact", head: true }),
        supabase.from("copies").select("id", { count: "exact", head: true }),
        supabase.from("videos").select("id", { count: "exact", head: true }),
        supabase
          .from("ebooks")
          .select("id, title, updated_at, status")
          .order("updated_at", { ascending: false })
          .limit(5),
      ]);
      return {
        ebooks: ebooks.count ?? 0,
        images: images.count ?? 0,
        copies: copies.count ?? 0,
        videos: videos.count ?? 0,
        recent: recent.data ?? [],
      };
    },
  });
}

const SHORTCUTS = [
  { to: "/ebooks", Icon: BookOpen, label: "Créer un ebook", desc: "Plan, chapitres et export PDF." },
  { to: "/visuels", Icon: ImageIcon, label: "Générer un visuel", desc: "Couvertures, posts, bannières." },
  { to: "/textes", Icon: PenLine, label: "Écrire une copy", desc: "Emails, pages de vente, pubs." },
  { to: "/video", Icon: Video, label: "Créer une vidéo", desc: "Script, avatar et voix IA." },
] as const;

function Dashboard() {
  const { data: profile } = useProfile();
  const { data: stats } = useStats();

  const cards = [
    { Icon: BookOpen, value: stats?.ebooks ?? 0, label: "Ebooks créés" },
    { Icon: ImageIcon, value: stats?.images ?? 0, label: "Visuels générés" },
    { Icon: PenLine, value: stats?.copies ?? 0, label: "Copies marketing" },
    { Icon: Video, value: stats?.videos ?? 0, label: "Vidéos créées" },
  ];

  const firstName = (profile?.full_name || profile?.email || "").split(" ")[0];

  return (
    <AppShell title="Tableau de bord" subtitle="Vue d'ensemble de ton studio">
      <div className="flex flex-col gap-7">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-primary p-8 text-primary-foreground shadow-glow md:p-10">
          <div className="absolute -right-10 -top-10 size-60 rounded-full bg-primary-foreground/15 blur-3xl" />
          <div className="relative">
            <div className="text-xs font-bold uppercase tracking-[0.18em] opacity-80">
              Bienvenue{firstName ? `, ${firstName}` : ""}
            </div>
            <h2 className="mt-2 font-display text-2xl font-bold md:text-3xl">
              Qu'est-ce qu'on crée aujourd'hui ?
            </h2>
            <p className="mt-3 max-w-lg text-sm opacity-85">
              Lance un module ou reprends une création en cours. Il te reste{" "}
              <strong>{profile?.credits ?? 0} crédits IA</strong>.
            </p>
            <Link
              to="/ebooks"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary-foreground px-5 py-3 text-sm font-semibold text-primary transition-transform hover:-translate-y-0.5"
            >
              <Sparkles size={15} /> Nouvel ebook
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {cards.map(({ Icon, value, label }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card-premium card-hover p-5"
            >
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <Icon size={19} />
              </div>
              <div className="mt-4 font-display text-2xl font-bold">{value}</div>
              <div className="mt-1 text-sm text-muted-foreground">{label}</div>
            </motion.div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h3 className="mb-4 font-display text-lg font-bold">Raccourcis</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {SHORTCUTS.map(({ to, Icon, label, desc }) => (
                <Link key={to} to={to} className="card-premium card-hover p-5">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                    <Icon size={21} />
                  </div>
                  <div className="mt-4 font-semibold">{label}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{desc}</div>
                  <div className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                    Commencer <ArrowRight size={14} />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="card-premium p-5">
              <h3 className="font-display text-base font-bold">Crédits IA</h3>
              <div className="mt-4 font-display text-3xl font-bold text-primary">
                {profile?.credits ?? 0}
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-primary"
                  style={{ width: `${Math.min(100, ((profile?.credits ?? 0) / 100) * 100)}%` }}
                />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Formule {profile?.plan ?? "free"} · 5 crédits par plan, 3 par chapitre
              </p>
            </div>

            <div className="card-premium p-5">
              <h3 className="font-display text-base font-bold">Activité récente</h3>
              <div className="mt-4 space-y-3">
                {(stats?.recent ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">Aucune création pour l'instant.</p>
                )}
                {(stats?.recent ?? []).map((item) => (
                  <Link
                    key={item.id}
                    to="/ebooks/$id"
                    params={{ id: item.id }}
                    className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-accent"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                      <BookOpen size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{item.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(item.updated_at).toLocaleDateString("fr-FR")}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="card-premium p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-success">
                <TrendingUp size={16} /> Statistiques
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {(stats?.ebooks ?? 0) + (stats?.images ?? 0) + (stats?.copies ?? 0) + (stats?.videos ?? 0)}{" "}
                créations au total dans ta bibliothèque.
              </p>
              <Link
                to="/veille"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
              >
                <Compass size={14} /> Explorer les niches
              </Link>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
