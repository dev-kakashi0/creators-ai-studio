import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  Bell,
  BookOpen,
  Compass,
  Image as ImageIcon,
  LayoutGrid,
  Library,
  LogOut,
  Menu,
  PenLine,
  Settings,
  CreditCard,
  History,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  Video,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useProfile, useSignOut } from "@/lib/auth";
import { useIsAdmin } from "@/lib/credits";
import { CRITICAL_CREDITS, LOW_CREDITS } from "@/lib/credit-costs";
import { Logomark } from "@/components/Logomark";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Tableau de bord", Icon: LayoutGrid },
  { to: "/ebooks", label: "Ebooks", Icon: BookOpen },
  { to: "/visuels", label: "Visuels", Icon: ImageIcon },
  { to: "/textes", label: "Textes & Copy", Icon: PenLine },
  { to: "/video", label: "Vidéo", Icon: Video },
  { to: "/veille", label: "Niches & Veille", Icon: Compass },
  { to: "/bibliotheque", label: "Bibliothèque", Icon: Library },
  { to: "/tarifs", label: "Tarifs & crédits", Icon: CreditCard },
  { to: "/credits", label: "Historique crédits", Icon: History },
] as const;

export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { data: profile } = useProfile();
  const signOut = useSignOut();
  const { data: isAdmin } = useIsAdmin();
  const credits = profile?.credits ?? 0;
  const low = credits < LOW_CREDITS;
  const critical = credits < CRITICAL_CREDITS;
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const initials = (profile?.full_name || profile?.email || "S").slice(0, 1).toUpperCase();

  return (
    <div className="flex min-h-screen bg-gradient-surface">
      {open && (
        <button
          aria-label="Fermer le menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-foreground/40 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[270px] flex-col border-r border-border bg-sidebar transition-transform duration-300 lg:static lg:translate-x-0 lg:m-4 lg:rounded-3xl lg:border lg:shadow-soft",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-6">
          <Logomark />
          <div className="flex-1">
            <div className="font-display text-lg font-bold leading-none">Solenya</div>
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
              Studio de création
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="rounded-lg p-1 text-muted-foreground lg:hidden"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV_ITEMS.map(({ to, label, Icon }) => {
            const active = pathname === to || pathname.startsWith(`${to}/`);
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:translate-x-0.5 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon size={18} />
                <span>{label}</span>
                {active && (
                  <motion.span
                    layoutId="nav-dot"
                    className="ml-auto size-1.5 rounded-full bg-primary"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          {isAdmin && (
            <Link
              to="/admin/credits"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
            >
              <ShieldCheck size={18} /> Admin · crédits
            </Link>
          )}
          <Link
            to="/parametres"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
          >
            <Settings size={18} /> Paramètres
          </Link>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut size={18} /> Déconnexion
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-card/80 px-4 py-4 backdrop-blur-xl md:px-8">
          <button
            onClick={() => setOpen(true)}
            className="rounded-xl border border-border p-2 text-muted-foreground lg:hidden"
            aria-label="Ouvrir le menu"
          >
            <Menu size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-xl font-bold md:text-2xl">{title}</h1>
            {subtitle && (
              <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            {actions}
            <Link
              to="/credits"
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition-colors",
                critical
                  ? "bg-destructive/10 text-destructive hover:bg-destructive/15"
                  : low
                    ? "bg-warning-soft text-warning hover:bg-warning/15"
                    : "bg-primary-soft text-primary hover:bg-primary/15",
              )}
              title="Voir l'historique de crédits"
            >
              <Sparkles size={14} />
              <span className="whitespace-nowrap">
                {credits} crédit{credits > 1 ? "s" : ""}
                <span className="hidden md:inline"> restants</span>
              </span>
            </Link>
            <Link
              to="/tarifs"
              hash="packs"
              className="hidden h-10 items-center gap-1.5 rounded-full bg-gradient-primary px-4 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5 sm:flex"
            >
              <CreditCard size={15} /> Acheter des crédits
            </Link>
            <button
              className="hidden size-10 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:text-primary sm:flex"
              aria-label="Notifications"
            >
              <Bell size={17} />
            </button>
            <Link
              to="/parametres"
              className="flex size-10 items-center justify-center rounded-xl bg-gradient-primary text-sm font-bold text-primary-foreground shadow-glow"
            >
              {initials}
            </Link>
          </div>
        </header>

        {low && (
          <div
            className={cn(
              "flex flex-wrap items-center gap-2 border-b px-4 py-3 text-sm md:px-8",
              critical
                ? "border-destructive/20 bg-destructive/10 text-destructive"
                : "border-warning/20 bg-warning-soft text-warning",
            )}
          >
            <AlertTriangle size={16} />
            <span className="font-medium">
              {critical
                ? `Il ne te reste que ${credits} crédit${credits > 1 ? "s" : ""}. Passe à un plan supérieur pour continuer à générer.`
                : `Crédits bientôt épuisés : ${credits} restants.`}
            </span>
            <Link
              to="/tarifs"
              className="ml-auto rounded-full bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-soft"
            >
              {critical ? "Améliorer mon plan" : "Recharger"}
            </Link>
          </div>
        )}

        <motion.main
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          className="flex-1 p-4 md:p-8"
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}
