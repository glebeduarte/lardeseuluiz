import { useEffect, useRef, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Download, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import logoUrl from '@/assets/logo-lar-seu-luiz.png';

// Arte da aula no padrão do ESDE do LSL (1000 x 1000):
// fundo em aquarela gerado pela IA + textos e logo desenhados aqui, sempre iguais.

export interface AulaParaImagem {
  tema: string;
  modulo: string; // "Módulo VI"
  roteiro: string; // "1"
}

const LADO = 1000;
const ROMANOS: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };

function numeroDoModulo(modulo: string) {
  const r = modulo.replace(/m[óo]dulo/i, '').trim().toUpperCase();
  return ROMANOS[r] ?? (r || '?');
}

function carregarImagem(src: string) {
  return new Promise<HTMLImageElement>((ok, falha) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = falha;
    img.src = src;
  });
}

function quebrarLinhas(ctx: CanvasRenderingContext2D, texto: string, largura: number) {
  const palavras = texto.split(/\s+/);
  const linhas: string[] = [];
  let atual = '';
  for (const p of palavras) {
    const teste = atual ? `${atual} ${p}` : p;
    if (ctx.measureText(teste).width > largura && atual) {
      linhas.push(atual);
      atual = p;
    } else atual = teste;
  }
  if (atual) linhas.push(atual);
  return linhas;
}

function espacamento(ctx: CanvasRenderingContext2D, px: number) {
  // letterSpacing existe nos navegadores atuais; nos antigos fica sem espaçamento
  (ctx as unknown as { letterSpacing: string }).letterSpacing = `${px}px`;
}

async function desenharArte(canvas: HTMLCanvasElement, fundo: string, aula: AulaParaImagem, tomo: string) {
  await Promise.all([
    document.fonts.load('400 40px "Anton"'),
    document.fonts.load('400 40px "Syncopate"'),
    document.fonts.load('700 30px "Montserrat"'),
  ]);
  const [imgFundo, imgLogo] = await Promise.all([carregarImagem(fundo), carregarImagem(logoUrl)]);
  canvas.width = LADO;
  canvas.height = LADO;
  const ctx = canvas.getContext('2d')!;

  // Fundo
  ctx.drawImage(imgFundo, 0, 0, LADO, LADO);
  // Escurece de leve o centro para o título branco ler bem
  const g = ctx.createLinearGradient(0, 0, 0, LADO);
  g.addColorStop(0, 'rgba(0,0,0,0.18)');
  g.addColorStop(0.5, 'rgba(0,0,0,0.30)');
  g.addColorStop(1, 'rgba(0,0,0,0.12)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, LADO, LADO);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(0,0,0,0.45)';

  // Cabeçalho fixo
  ctx.shadowBlur = 8;
  ctx.font = '400 40px "Syncopate", sans-serif';
  espacamento(ctx, 2);
  ctx.fillText('ESTUDO SISTEMATIZADO', LADO / 2, 138);
  ctx.fillText('DA DOUTRINA ESPÍRITA', LADO / 2, 188);

  // Título: maior tamanho que caiba em até 3 linhas
  const titulo = aula.tema.toUpperCase().trim();
  const larguraMax = 840;
  let tamanho = 112;
  let linhas: string[] = [];
  espacamento(ctx, 0);
  for (; tamanho >= 56; tamanho -= 4) {
    ctx.font = `400 ${tamanho}px "Anton", sans-serif`;
    linhas = quebrarLinhas(ctx, titulo, larguraMax);
    if (linhas.length <= 3 && linhas.every((l) => ctx.measureText(l).width <= larguraMax)) break;
  }
  const altLinha = tamanho * 1.02;
  const centroTitulo = 470;
  const topo = centroTitulo - (linhas.length * altLinha) / 2 + tamanho * 0.85;
  ctx.shadowBlur = 18;
  linhas.forEach((l, i) => ctx.fillText(l, LADO / 2, topo + i * altLinha));
  const fimTitulo = topo + (linhas.length - 1) * altLinha;

  // Referência ESDE
  ctx.shadowBlur = 8;
  ctx.font = '700 30px "Montserrat", sans-serif';
  espacamento(ctx, 0.5);
  const ref = `ESDE TOMO ${tomo || '1'} - MÓDULO ${numeroDoModulo(aula.modulo)} - ROTEIRO ${aula.roteiro || '?'}`;
  ctx.fillText(ref, LADO / 2, Math.max(fimTitulo + 110, 740));

  // Logo oficial, centralizado no rodapé
  ctx.shadowBlur = 0;
  const lw = 146;
  const lh = (imgLogo.height / imgLogo.width) * lw;
  ctx.drawImage(imgLogo, (LADO - lw) / 2, LADO - lh, lw, lh);
}

function nomeArquivo(aula: AulaParaImagem) {
  const base = `esde-mod${numeroDoModulo(aula.modulo)}-rot${aula.roteiro}-${aula.tema}`
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
  return `${base}.png`;
}

export function GerarImagemAula({ aula, onClose }: { aula: AulaParaImagem | null; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tomo, setTomo] = useState('1');
  const [ideia, setIdeia] = useState('');
  const [fundo, setFundo] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);

  useEffect(() => {
    if (aula) { setFundo(null); setIdeia(''); }
  }, [aula]);

  // Redesenha quando muda o fundo ou o tomo
  useEffect(() => {
    if (aula && fundo && canvasRef.current) {
      desenharArte(canvasRef.current, fundo, aula, tomo).catch(() => toast.error('Erro ao montar a arte'));
    }
  }, [aula, fundo, tomo]);

  const gerar = async () => {
    if (!aula) return;
    setGerando(true);
    const { data, error } = await supabase.functions.invoke('gerar-imagem-aula', {
      body: { tema: aula.tema, modulo: aula.modulo, ideia },
    });
    setGerando(false);
    if (error || data?.error) {
      toast.error(data?.error ?? 'Não foi possível gerar a imagem');
      return;
    }
    setFundo(data.imagem);
  };

  const baixar = () => {
    if (!canvasRef.current || !aula) return;
    const a = document.createElement('a');
    a.href = canvasRef.current.toDataURL('image/png');
    a.download = nomeArquivo(aula);
    a.click();
  };

  return (
    <Dialog open={!!aula} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Imagem da aula</DialogTitle>
          <DialogDescription className="line-clamp-2">{aula?.tema}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label>Tomo</Label>
            <Input value={tomo} onChange={(e) => setTomo(e.target.value)} />
          </div>
          <div className="space-y-1 col-span-2">
            <Label>Referência</Label>
            <p className="text-sm text-muted-foreground pt-2">
              {aula?.modulo || 'Sem módulo'} · Roteiro {aula?.roteiro || '?'}
            </p>
          </div>
        </div>
        <div className="space-y-1">
          <Label>Ideia para a imagem (opcional)</Label>
          <Textarea
            rows={2}
            value={ideia}
            onChange={(e) => setIdeia(e.target.value)}
            placeholder="ex: uma família reunida à mesa, tons azuis"
          />
        </div>

        <div className="aspect-square w-full rounded-lg border bg-muted/40 overflow-hidden flex items-center justify-center">
          {gerando ? (
            <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground p-6 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              Pintando a aquarela. Leva cerca de 30 a 60 segundos.
            </div>
          ) : (
            <canvas ref={canvasRef} className={fundo ? 'w-full h-full' : 'hidden'} />
          )}
          {!gerando && !fundo && (
            <p className="text-sm text-muted-foreground p-6 text-center">
              Toque em "Gerar imagem" para criar o fundo em aquarela a partir do tema.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {fundo && !gerando && (
            <Button variant="outline" onClick={baixar} className="gap-2">
              <Download className="h-4 w-4" /> Baixar PNG
            </Button>
          )}
          <Button onClick={gerar} disabled={gerando || !aula?.tema} className="gap-2">
            {gerando ? <Loader2 className="h-4 w-4 animate-spin" /> : fundo ? <RefreshCw className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            {fundo ? 'Gerar outra' : 'Gerar imagem'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
