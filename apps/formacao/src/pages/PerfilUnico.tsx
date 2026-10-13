import { useEffect } from "react";

// Plataforma unificada: o perfil é um só para todas as áreas do Lar de Seu Luiz.
// "Minha conta" da Formação leva para esse perfil único.
export default function PerfilUnico() {
  useEffect(() => {
    window.location.replace("/app/perfil");
  }, []);
  return null;
}
