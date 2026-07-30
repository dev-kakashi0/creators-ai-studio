import { createFileRoute } from "@tanstack/react-router";
import { Video } from "lucide-react";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_authenticated/video")({
  head: () => ({
    meta: [
      { title: "Vidéo IA — Solenya" },
      { name: "description", content: "Créez des vidéos courtes et scripts vidéo avec l'IA." },
    ],
  }),
  component: () => (
    <ComingSoon
      title="Vidéo IA"
      subtitle="Transformez vos contenus en vidéos courtes prêtes à publier."
      icon={Video}
      features={["Scripts vidéo", "Storyboards", "Sous-titres automatiques", "Formats verticaux"]}
    />
  ),
});
