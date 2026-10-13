import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import logoLarSeuLuiz from '@/assets/logo-lar-seu-luiz.png';
import welcomeStep1 from '@/assets/welcome-step-1.png';
import welcomeStep2 from '@/assets/welcome-step-2.png';
import welcomeStep3 from '@/assets/welcome-step-3.png';

const WELCOME_KEY = 'lsl_welcome_seen';

const steps = [
  {
    number: 1,
    title: 'Sua Área do Aluno',
    text: 'Acesse a sua área do aluno. Veja seus conteúdos disponíveis e novos cursos para solicitar acesso.',
    image: welcomeStep1,
    highlight: null,
  },
  {
    number: 2,
    title: 'Minha Conta',
    text: 'Acesse a Minha Conta, onde terá seus dados, foto e mais informações sobre você para preencher.',
    image: welcomeStep2,
    highlight: null,
  },
  {
    number: 3,
    title: 'Conteúdo do Curso',
    text: 'Acesse o conteúdo do curso. Nele você já encontrará informações, materiais de uso e outras informações importantes.',
    image: welcomeStep3,
    highlight: 'Alunos do ESDE devem entrar no grupo que está na primeira aula.',
  },
];

export default function WelcomePage() {
  const navigate = useNavigate();
  const { user, loading, isAdmin } = useAuth();
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [ready, setReady] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }
    if (!loading && user) {
      if (isAdmin) {
        navigate('/admin', { replace: true });
        return;
      }
      if (localStorage.getItem(WELCOME_KEY) === 'true') {
        navigate('/dashboard');
      } else {
        setReady(true);
      }
    }
  }, [user, loading, isAdmin, navigate]);

  const handleStart = () => {
    if (dontShowAgain) {
      localStorage.setItem(WELCOME_KEY, 'true');
    }
    navigate('/dashboard');
  };

  const isLast = currentStep === steps.length - 1;
  const isFirst = currentStep === 0;

  if (loading || !ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const step = steps[currentStep];

  return (
    // Página fora da moldura: fundo neutro, cartão branco com o logo, cores só por tokens
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-background">
      <div className="w-full max-w-[900px]">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <img
            src={logoLarSeuLuiz}
            alt="Lar de Seu Luiz"
            className="h-14 w-14 rounded-xl object-contain mb-4"
          />
          <h1 className="font-['Playfair_Display'] text-xl md:text-2xl font-bold mb-1 text-foreground">
            Seja bem-vindo(a) à nossa plataforma!
          </h1>
          <p className="text-sm text-muted-foreground">
            Veja como aproveitar melhor sua experiência aqui.
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {steps.map((s, i) => (
            <button
              key={i}
              onClick={() => setCurrentStep(i)}
              className="flex items-center gap-1.5 cursor-pointer transition-all duration-200"
            >
              <div
                className={`flex items-center justify-center rounded-full text-xs font-bold transition-all duration-200 h-7 w-7 ${
                  i === currentStep
                    ? 'bg-primary text-primary-foreground'
                    : i < currentStep
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {i < currentStep ? '✓' : s.number}
              </div>
              {i < steps.length - 1 && (
                <div className={`hidden sm:block h-0.5 w-10 rounded ${i < currentStep ? 'bg-emerald-300' : 'bg-border'}`} />
              )}
            </button>
          ))}
        </div>

        {/* Step card */}
        <div
          key={currentStep}
          className="bg-card rounded-2xl border shadow-sm overflow-hidden animate-fade-up"
        >
          <div className="flex flex-col md:flex-row">
            {/* Image */}
            <div className="md:w-1/2 p-4 flex items-center justify-center bg-muted">
              <img
                src={step.image}
                alt={step.title}
                className="w-full max-w-[380px] rounded-lg border"
              />
            </div>

            {/* Text content */}
            <div className="md:w-1/2 p-6 md:p-8 flex flex-col justify-center">
              <div className="inline-flex items-center gap-2 mb-3 text-xs font-semibold text-primary">
                Passo {step.number} de {steps.length}
              </div>
              <h2 className="font-['Playfair_Display'] text-lg md:text-xl font-bold mb-3 text-foreground">
                {step.title}
              </h2>
              <p className="text-sm leading-relaxed mb-4 text-muted-foreground">
                {step.text}
              </p>
              {step.highlight && (
                <p className="text-sm font-semibold leading-relaxed p-3 rounded-lg border bg-amber-100 text-amber-800 border-amber-300">
                  {step.highlight}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex flex-col items-center gap-4 mt-6">
          <div className="flex items-center gap-3">
            {!isFirst && (
              <Button variant="outline" onClick={() => setCurrentStep((s) => s - 1)}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
            )}
            {!isLast ? (
              <Button onClick={() => setCurrentStep((s) => s + 1)}>
                Próximo
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleStart}>
                Começar minha jornada →
              </Button>
            )}
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <Checkbox
              checked={dontShowAgain}
              onCheckedChange={(v) => setDontShowAgain(v === true)}
            />
            <span className="text-sm text-muted-foreground">
              Não mostrar esta mensagem novamente
            </span>
          </label>

          <p className="text-xs italic text-muted-foreground">
            Você pode acessar estas dicas novamente em "Minha Conta" a qualquer momento.
          </p>
        </div>
      </div>
    </div>
  );
}
