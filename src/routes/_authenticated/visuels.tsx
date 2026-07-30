import { createFileRoute } from "@tanstack/react-router";
import { Image } from "lucide-react";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_authenticated/visuels")({
  head: () => ({
    meta: [
      { title: "Visuels IA — Solenya" },
      { name: "description", content: "Générez des visuels marketing et couvertures avec l'IA." },
    ],
  }),
  component: () => (
    <ComingSoon
      title="Visuels IA"
      subtitle="Générez des couvertures, carrousels et visuels publicitaires en quelques secondes."
      icon={Image}
      features={[
        "Couvertures d'ebooks",
        "Carrousels réseaux sociaux",
        "Bannières publicitaires",
        "Déclinaisons multi-formats",
      ]}
    />
  ),
});
