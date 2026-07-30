import type { LucideIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

export function ComingSoon({
  title,
  subtitle,
  icon: Icon,
  features,
}: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  features: string[];
}) {
  return (
    <AppShell title={title} subtitle={subtitle}>
      <div className="card-premium mx-auto flex max-w-2xl flex-col items-center px-6 py-16 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <Icon size={26} />
        </div>
        <span className="mt-5 rounded-full bg-primary-soft px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-primary">
          Bientôt disponible
        </span>
        <h2 className="mt-4 font-display text-2xl font-bold">{title}</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{subtitle}</p>
        <ul className="mt-6 grid w-full gap-2 text-left sm:grid-cols-2">
          {features.map((feature) => (
            <li
              key={feature}
              className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground"
            >
              {feature}
            </li>
          ))}
        </ul>
        <Link
          to="/ebooks"
          className="mt-8 inline-flex h-11 items-center rounded-xl bg-gradient-primary px-5 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5"
        >
          Créer un ebook en attendant
        </Link>
      </div>
    </AppShell>
  );
}
