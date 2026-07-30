import { createFileRoute } from "@tanstack/react-router";
import { PenLine } from "lucide-react";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_authenticated/textes")({
  head: () => ({
    meta: [
      { title: "Copywriting IA — Solenya" },
      { name: "description", content: "Rédigez pages de vente, emails et posts avec l'IA." },
    ],
  }),
  component: () => (
    <ComingSoon
      title="Copywriting"
      subtitle="Pages de vente, séquences email et posts qui convertissent, rédigés par l'IA."
      icon={PenLine}
      features={[
        "Pages de vente AIDA / PAS",
        "Séquences email",
        "Posts LinkedIn & Instagram",
        "Scripts publicitaires",
      ]}
    />
  ),
});
