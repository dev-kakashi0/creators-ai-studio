import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  ArrowRight,
  BookOpen,
  Compass,
  Image as ImageIcon,
  PenLine,
  Sparkles,
  Video,
  Zap,
} from "lucide-react";
import { Logomark } from "@/components/Logomark";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Solenya — Créez vos produits digitaux avec l'IA" },
      {
        name: "description",
        content:
          "Ebooks, visuels, copywriting, vidéos et analyse de niches : Solenya réunit tous vos outils de création IA dans un studio unique.",
      },
      { property: "og:title", content: "Solenya — Studio de création IA" },
      {
        property: "og:description",
        content: "Produisez ebooks, visuels et copies marketing en quelques minutes avec l'IA.",
      },
    ],
  }),
  component: Landing,
});

const MODULES = [
  { Icon: BookOpen, title: "Ebooks", desc: "Plan, chapitres, couverture et export PDF professionnel." },
  { Icon: ImageIcon, title: "Visuels IA", desc: "Couvertures, mockups, affiches et posts réseaux sociaux." },
  { Icon: PenLine, title: "Copywriting", desc: "Pages de vente, emails, publicités et scripts." },
  { Icon: Video, title: "Vidéo IA", desc: "Script, avatar et voix IA en un seul flux." },
  { Icon: Compass, title: "Niches & Veille", desc: "Repérez les marchés rentables avant tout le monde." },
  { Icon: Zap, title: "Bibliothèque", desc: "Toutes vos créations centralisées, filtrables, exportables." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-gradient-surface">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <Logomark />
          <span className="font-display text-lg font-bold">Solenya</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/auth"
            className="rounded-xl px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
          >
            Connexion
          </Link>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="rounded-xl bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5"
          >
            Commencer
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="py-16 text-center md:py-24"
        >
          <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-primary-soft px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            <Sparkles size={13} /> Studio de création IA
          </div>
          <h1 className="mx-auto mt-6 max-w-3xl font-display text-4xl font-extrabold leading-tight md:text-6xl">
            Créez vos produits digitaux en quelques minutes
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
            Ebooks, visuels, copies marketing, vidéos et analyse de niches. Un seul espace,
            propulsé par l'IA, pensé pour les créateurs et les entrepreneurs.
          </p>
          <div className="mt-9 flex justify-center">
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-primary px-7 py-4 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5"
            >
              Créer mon compte gratuit <ArrowRight size={16} />
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            5 crédits IA offerts à l'inscription — de quoi générer votre premier ebook d'essai
          </p>
        </motion.section>

        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map(({ Icon, title, desc }, i) => (
            <motion.article
              key={title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
              className="card-premium card-hover p-6"
            >
              <div className="flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                <Icon size={22} />
              </div>
              <h2 className="mt-4 font-display text-base font-bold">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
            </motion.article>
          ))}
        </section>
      </main>
    </div>
  );
}
