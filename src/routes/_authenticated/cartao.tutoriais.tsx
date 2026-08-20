import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/cartao/tutoriais")({
  head: () => ({
    meta: [
      { title: "Tutoriais de uso | Conexão Implantes" },
      {
        name: "description",
        content:
          "Biblioteca de tutoriais passo a passo do gerador de Link Tree, assinatura, cartão e foto de perfil.",
      },
      { property: "og:title", content: "Tutoriais de uso | Conexão Implantes" },
      {
        property: "og:description",
        content: "Aprenda a usar cada área da plataforma com tutoriais ilustrados.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TutoriaisLayout,
});

function TutoriaisLayout() {
  return <Outlet />;
}
