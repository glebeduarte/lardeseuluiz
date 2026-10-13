import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageUpload } from '@/components/ImageUpload';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Save, Eye, Loader2, LayoutDashboard, Image, Type, Bell, ToggleLeft, Info, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';
import { PageHero } from '@/components/layout/PageHero';

interface DashboardConfig {
  id: string;
  hero_image_url: string | null;
  hero_title: string;
  hero_subtitle: string;
  announcement_enabled: boolean;
  announcement_text: string | null;
  announcement_type: string;
  show_hero: boolean;
  show_filters: boolean;
  show_search: boolean;
  sections_order: string[];
}

export default function DashboardEditorPage() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [config, setConfig] = useState<DashboardConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAdmin) { navigate('/dashboard'); return; }
    fetchConfig();
  }, [isAdmin, navigate]);

  const fetchConfig = async () => {
    const { data, error } = await supabase
      .from('dashboard_config')
      .select('*')
      .limit(1)
      .single();

    if (data) setConfig(data as any);
    if (error) console.error('Error fetching config:', error);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);

    const { error } = await supabase
      .from('dashboard_config')
      .update({
        hero_image_url: config.hero_image_url,
        hero_title: config.hero_title,
        hero_subtitle: config.hero_subtitle,
        announcement_enabled: config.announcement_enabled,
        announcement_text: config.announcement_text,
        announcement_type: config.announcement_type,
        show_hero: config.show_hero,
        show_filters: config.show_filters,
        show_search: config.show_search,
        sections_order: config.sections_order,
        updated_at: new Date().toISOString(),
      })
      .eq('id', config.id);

    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Configurações salvas com sucesso!' });
    }
    setSaving(false);
  };

  const updateField = <K extends keyof DashboardConfig>(field: K, value: DashboardConfig[K]) => {
    setConfig(prev => prev ? { ...prev, [field]: value } : prev);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!config) return null;

  return (
    <DashboardLayout>
      <PageHero title="Editor da Área do Aluno" description="Personalize a experiência dos alunos no painel" />
      <div className="p-4 sm:p-6 md:p-7 space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            <Eye className="h-4 w-4 mr-2" />
            Pré-visualizar
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gradient-primary">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar
          </Button>
        </div>

        {/* Hero Section Config */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Image className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Seção Hero (Banner)</CardTitle>
                <CardDescription>Imagem de fundo e texto principal do painel</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <Label>Exibir seção Hero</Label>
              <Switch
                checked={config.show_hero}
                onCheckedChange={(v) => updateField('show_hero', v)}
              />
            </div>

            {config.show_hero && (
              <>
                <div className="space-y-2">
                  <Label>Imagem de fundo</Label>
                  <ImageUpload
                    value={config.hero_image_url || ''}
                    onChange={(url) => updateField('hero_image_url', url)}
                    bucket="course-assets"
                    folder="dashboard"
                    aspectRatio="21:9"
                  />
                  <p className="text-xs text-muted-foreground">
                    Recomendado: 1920×600px. Deixe vazio para usar a imagem padrão.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input
                    value={config.hero_title}
                    onChange={(e) => updateField('hero_title', e.target.value)}
                    placeholder="Olá, {name}! 👋"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use <code className="bg-muted px-1 rounded">{'{name}'}</code> para inserir o nome do aluno
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Subtítulo</Label>
                  <Input
                    value={config.hero_subtitle}
                    onChange={(e) => updateField('hero_subtitle', e.target.value)}
                    placeholder="Continue sua jornada de aprendizado"
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Announcement Config */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Bell className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <CardTitle className="text-lg">Aviso em Destaque</CardTitle>
                <CardDescription>Banner de avisos temporários para os alunos</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <Label>Ativar aviso</Label>
              <Switch
                checked={config.announcement_enabled}
                onCheckedChange={(v) => updateField('announcement_enabled', v)}
              />
            </div>

            {config.announcement_enabled && (
              <>
                <div className="space-y-2">
                  <Label>Tipo do aviso</Label>
                  <Select
                    value={config.announcement_type}
                    onValueChange={(v) => updateField('announcement_type', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Informativo (azul)</SelectItem>
                      <SelectItem value="warning">Atenção (amarelo)</SelectItem>
                      <SelectItem value="success">Positivo (verde)</SelectItem>
                      <SelectItem value="error">Urgente (vermelho)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Texto do aviso</Label>
                  <Textarea
                    value={config.announcement_text || ''}
                    onChange={(e) => updateField('announcement_text', e.target.value)}
                    placeholder="Ex: As aulas retornam em 10/01. Boas festas!"
                    rows={3}
                  />
                </div>

                {/* Preview */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Pré-visualização</Label>
                  <div className={`rounded-lg px-4 py-3 text-sm flex items-start gap-3 break-words ${
                    config.announcement_type === 'info' ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20' :
                    config.announcement_type === 'warning' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20' :
                    config.announcement_type === 'success' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20' :
                    'bg-destructive/10 text-destructive border border-destructive/20'
                  }`}>
                    <span className="shrink-0 mt-0.5">
                      {config.announcement_type === 'info' && <Info className="h-4 w-4" />}
                      {config.announcement_type === 'warning' && <AlertTriangle className="h-4 w-4" />}
                      {config.announcement_type === 'success' && <CheckCircle2 className="h-4 w-4" />}
                      {config.announcement_type === 'error' && <AlertCircle className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0">{config.announcement_text || 'Texto do aviso aparecerá aqui...'}</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Visibility Config */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <ToggleLeft className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <CardTitle className="text-lg">Visibilidade dos Elementos</CardTitle>
                <CardDescription>Controle o que aparece na área do aluno</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-border/30">
              <div>
                <Label>Filtros de categoria</Label>
                <p className="text-xs text-muted-foreground">Abas de filtragem (Todos, Formações, etc.)</p>
              </div>
              <Switch
                checked={config.show_filters}
                onCheckedChange={(v) => updateField('show_filters', v)}
              />
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border/30">
              <div>
                <Label>Campo de busca</Label>
                <p className="text-xs text-muted-foreground">Barra de pesquisa de cursos</p>
              </div>
              <Switch
                checked={config.show_search}
                onCheckedChange={(v) => updateField('show_search', v)}
              />
            </div>

            <div className="space-y-2 pt-2">
              <Label>Ordem das seções</Label>
              <Select
                value={config.sections_order.join(',')}
                onValueChange={(v) => updateField('sections_order', v.split(','))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="enrolled,catalog">Meus Cursos → Catálogo</SelectItem>
                  <SelectItem value="catalog,enrolled">Catálogo → Meus Cursos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
