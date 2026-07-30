import { createFileRoute } from "@tanstack/react-router";
import { Radar } from "lucide-react";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_authenticated/veille")({
  head: () => ({
    meta: [
      { title: "Analyse de niche — Solenya" },
      { name: "description", content: "Analysez votre niche, vos concurrents et vos opportunités." },
    ],
  }),
  component: () => (
    <ComingSoon
      title="Analyse de niche"
      subtitle="Identifiez les opportunités, les douleurs de votre audience et vos angles gagnants."
      icon={Radar}
      features={[
        "Score d'opportunité",
        "Analyse concurrentielle",
        "Douleurs & objections",
        "Idées de produits",
      ]}
    />
  ),
});
