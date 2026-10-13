import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Checkbox } from '@/components/ui/checkbox';
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(160deg, #F4F7FB 0%, #EBF4FB 100%)' }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#2176AE' }} />
      </div>
    );
  }

  const step = steps[currentStep];

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ background: 'linear-gradient(160deg, #F4F7FB 0%, #EBF4FB 100%)' }}>
      <div className="w-full max-w-[900px]">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-8 animate-fade-up">
          <img
            src={logoLarSeuLuiz}
            alt="Lar de Seu Luiz"
            className="h-20 w-auto object-contain mb-4"
          />
          <h1 className="font-display text-xl md:text-2xl font-bold mb-1" style={{ color: '#1A2535' }}>
            Seja bem-vindo(a) à nossa plataforma!
          </h1>
          <p className="font-sans text-sm" style={{ color: '#4A5568' }}>
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
                className="flex items-center justify-center rounded-full text-xs font-bold transition-all duration-200"
                style={{
                  width: 28,
                  height: 28,
                  background: i === currentStep ? '#2176AE' : i < currentStep ? '#1A8A7A' : '#E2E8F0',
                  color: i <= currentStep ? '#fff' : '#8A9AB0',
                }}
              >
                {i < currentStep ? '✓' : s.number}
              </div>
              {i < steps.length - 1 && (
                <div
                  className="hidden sm:block"
                  style={{
                    width: 40,
                    height: 2,
                    background: i < currentStep ? '#1A8A7A' : '#E2E8F0',
                    borderRadius: 2,
                  }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Step card */}
        <div
          key={currentStep}
          className="bg-white rounded-2xl border overflow-hidden animate-fade-up"
          style={{ borderColor: '#E2E8F0' }}
        >
          <div className="flex flex-col md:flex-row">
            {/* Image */}
            <div className="md:w-1/2 p-4 flex items-center justify-center bg-[#F8FAFC]">
              <img
                src={step.image}
                alt={step.title}
                className="w-full max-w-[380px] rounded-xl shadow-md border border-[#E2E8F0]"
              />
            </div>

            {/* Text content */}
            <div className="md:w-1/2 p-6 md:p-8 flex flex-col justify-center">
              <div
                className="inline-flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider"
                style={{ color: '#2176AE' }}
              >
                Passo {step.number} de {steps.length}
              </div>
              <h2 className="font-display text-lg md:text-xl font-bold mb-3" style={{ color: '#1A2535' }}>
                {step.title}
              </h2>
              <p className="font-sans text-sm leading-relaxed mb-4" style={{ color: '#4A5568' }}>
                {step.text}
              </p>
              {step.highlight && (
                <p className="font-sans text-sm font-bold leading-relaxed p-3 rounded-lg" style={{ color: '#1A2535', background: '#FDF6E3' }}>
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
              <button
                onClick={() => setCurrentStep((s) => s - 1)}
                className="font-sans text-sm font-medium px-5 py-2.5 rounded-lg border transition-all duration-200 hover:-translate-y-px cursor-pointer flex items-center gap-1"
                style={{ borderColor: '#E2E8F0', color: '#4A5568' }}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </button>
            )}
            {!isLast ? (
              <button
                onClick={() => setCurrentStep((s) => s + 1)}
                className="font-sans text-sm font-bold text-white px-6 py-2.5 rounded-lg transition-all duration-200 hover:-translate-y-px cursor-pointer flex items-center gap-1"
                style={{
                  background: 'linear-gradient(135deg, #2176AE, #1a6a9e)',
                  boxShadow: '0 4px 14px rgba(33,118,174,0.3)',
                }}
              >
                Próximo
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleStart}
                className="font-sans text-sm font-bold text-white px-8 py-2.5 rounded-lg transition-all duration-200 hover:-translate-y-px cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, #2176AE, #1a6a9e)',
                  boxShadow: '0 4px 14px rgba(33,118,174,0.3)',
                }}
              >
                Começar minha jornada →
              </button>
            )}
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <Checkbox
              checked={dontShowAgain}
              onCheckedChange={(v) => setDontShowAgain(v === true)}
              className="data-[state=checked]:bg-[#2176AE] data-[state=checked]:border-[#2176AE]"
            />
            <span className="font-sans text-[13px]" style={{ color: '#4A5568' }}>
              Não mostrar esta mensagem novamente
            </span>
          </label>

          <p className="font-sans text-[11px] italic" style={{ color: '#8A9AB0' }}>
            Você pode acessar estas dicas novamente em "Minha Conta" a qualquer momento.
          </p>
        </div>
      </div>
    </div>
  );
}
