import { createFileRoute } from "@tanstack/react-router";
import { Library } from "lucide-react";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_authenticated/bibliotheque")({
  head: () => ({
    meta: [
      { title: "Bibliothèque — Solenya" },
      { name: "description", content: "Retrouvez toutes vos créations digitales au même endroit." },
    ],
  }),
  component: () => (
    <ComingSoon
      title="Bibliothèque"
      subtitle="Tous vos ebooks, visuels, textes et vidéos réunis dans un seul espace."
      icon={Library}
      features={["Recherche globale", "Filtres par type", "Favoris", "Export groupé"]}
    />
  ),
});
