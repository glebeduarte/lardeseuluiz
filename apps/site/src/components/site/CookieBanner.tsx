import { useState, useEffect } from "react";

const CookieBanner = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!localStorage.getItem("lsl_cookies")) setShow(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const accept = () => {
    localStorage.setItem("lsl_cookies", "accepted");
    setShow(false);
  };

  return (
    <div className={`site-cookie-banner ${show ? "site-cookie-banner--show" : ""}`}>
      <div className="site-cookie-banner__text">
        Usamos cookies essenciais para o funcionamento do site.{" "}
        <a href="/privacidade">Saiba mais</a> na nossa Política de Privacidade.
      </div>
      <button className="site-btn-cookie site-btn-cookie--decline" onClick={() => setShow(false)}>
        Recusar
      </button>
      <button className="site-btn-cookie site-btn-cookie--accept" onClick={accept}>
        Aceitar
      </button>
    </div>
  );
};

export default CookieBanner;
