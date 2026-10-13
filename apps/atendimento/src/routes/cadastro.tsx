import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

// Plataforma unificada: o cadastro é um só para todas as áreas do Lar de Seu Luiz.
// (O cadastro antigo criava a conta com uma senha padrão pública.) O acesso ao Atendimento
// continua sendo liberado pela administração depois do cadastro.
export const Route = createFileRoute("/cadastro")({
  component: CadastroPage,
});

function CadastroPage() {
  useEffect(() => {
    window.location.replace("/formacao/auth");
  }, []);
  return null;
}
