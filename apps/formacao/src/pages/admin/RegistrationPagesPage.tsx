import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHero } from '@/components/layout/PageHero';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, ExternalLink, Copy, Loader2, Link2 } from 'lucide-react';

interface RegPage {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  info_day: string | null;
  info_time: string | null;
  info_format: string | null;
  info_extra: string | null;
  free_text: string | null;
  whatsapp_group_url: string | null;
  thanks_text: string | null;
  course_ids: string[];
  show_course_covers: boolean;
  is_active: boolean;
}

interface CourseOption {
  id: string;
  title: string;
  cover_url: string | null;
  thumbnail_url: string | null;
}

const emptyForm = {
  slug: '',
  title: '',
  subtitle: '',
  info_day: '',
  info_time: '',
  info_format: '',
  info_extra: '',
  free_text: '',
  whatsapp_group_url: '',
  thanks_text: '',
  course_ids: [] as string[],
  show_course_covers: true,
  is_active: true,
};

const slugify = (v: string) =>
  v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export default function RegistrationPagesPage() {
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const { toast } = useToast();
  const [pages, setPages] = useState<RegPage[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RegPage | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAdmin) { navigate('/dashboard'); return; }
    load();
  }, [isAdmin, navigate]);

  const load = async () => {
    const [{ data: pageData }, { data: courseData }] = await Promise.all([
      supabase.from('registration_pages').select('*').order('created_at', { ascending: false }),
      supabase.from('courses').select('id, title, cover_url, thumbnail_url').order('title'),
    ]);
    setPages((pageData as unknown as RegPage[]) || []);
    setCourses((courseData as CourseOption[]) || []);
    setLoading(false);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
  };

  const openEdit = (p: RegPage) => {
    setEditing(p);
    setForm({
      slug: p.slug,
      title: p.title,
      subtitle: p.subtitle || '',
      info_day: p.info_day || '',
      info_time: p.info_time || '',
      info_format: p.info_format || '',
      info_extra: p.info_extra || '',
      free_text: p.free_text || '',
      whatsapp_group_url: p.whatsapp_group_url || '',
      thanks_text: p.thanks_text || '',
      course_ids: p.course_ids || [],
      show_course_covers: p.show_course_covers,
      is_active: p.is_active,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    const slug = slugify(form.slug || form.title);
    if (!form.title.trim() || !slug) {
      toast({ title: 'Erro', description: 'Informe um título válido.', variant: 'destructive' });
      return;
    }
    if (form.course_ids.length === 0) {
      toast({ title: 'Erro', description: 'Selecione ao menos um curso.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload = {
      slug,
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || null,
      info_day: form.info_day.trim() || null,
      info_time: form.info_time.trim() || null,
      info_format: form.info_format.trim() || null,
      info_extra: form.info_extra.trim() || null,
      free_text: form.free_text.trim() || null,
      whatsapp_group_url: form.whatsapp_group_url.trim() || null,
      thanks_text: form.thanks_text.trim() || null,
      course_ids: form.course_ids,
      show_course_covers: form.show_course_covers,
      is_active: form.is_active,
    };
    const { error } = editing
      ? await supabase.from('registration_pages').update(payload).eq('id', editing.id)
      : await supabase.from('registration_pages').insert({ ...payload, created_by: user?.id ?? null });
    setSaving(false);
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: editing ? 'Página atualizada' : 'Página criada' });
    setDialogOpen(false);
    load();
  };

  const remove = async (p: RegPage) => {
    if (!confirm(`Excluir a página de inscrição "${p.title}"?`)) return;
    const { error } = await supabase.from('registration_pages').delete().eq('id', p.id);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Página excluída' });
    load();
  };

  const publicUrl = (slug: string) => `${window.location.origin}${import.meta.env.BASE_URL}inscricao/p/${slug}`;

  const toggleCourse = (id: string) => {
    setForm((f) => ({
      ...f,
      course_ids: f.course_ids.includes(id) ? f.course_ids.filter((c) => c !== id) : [...f.course_ids, id],
    }));
  };

  return (
    <DashboardLayout>
      <PageHero title="Inscrições" description="Crie páginas públicas de inscrição vinculadas a um ou mais cursos" />

      <div className="p-6 space-y-4">
        <div className="flex justify-end">
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-2" /> Nova página de inscrição
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : pages.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            <Link2 className="h-8 w-8 mx-auto mb-3 opacity-50" />
            Nenhuma página de inscrição criada ainda.
          </CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {pages.map((p) => (
              <Card key={p.id}>
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-lg">{p.title}</h3>
                      <p className="text-sm text-muted-foreground">{p.subtitle}</p>
                    </div>
                    <Badge variant={p.is_active ? 'default' : 'secondary'}>{p.is_active ? 'Ativa' : 'Inativa'}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(p.course_ids || []).map((id) => (
                      <Badge key={id} variant="outline" className="text-xs">
                        {courses.find((c) => c.id === id)?.title || 'Curso removido'}
                      </Badge>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground break-all bg-muted rounded px-2 py-1">
                    {publicUrl(p.slug)}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(publicUrl(p.slug)); toast({ title: 'Link copiado' }); }}>
                      <Copy className="h-3.5 w-3.5 mr-1.5" /> Copiar link
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <a href={publicUrl(p.slug)} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Abrir</a>
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                      <Pencil className="h-3.5 w-3.5 mr-1.5" /> Editar
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(p)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar página de inscrição' : 'Nova página de inscrição'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título da página</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex.: Inscrições ESDE 2026" />
            </div>
            <div className="space-y-2">
              <Label>Subtítulo</Label>
              <Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} placeholder="Estudo Sistematizado da Doutrina Espírita" />
            </div>
            <div className="space-y-2">
              <Label>Endereço do link (slug)</Label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="esde-2026" />
              <p className="text-xs text-muted-foreground">
                {window.location.origin}{import.meta.env.BASE_URL}inscricao/p/{slugify(form.slug || form.title) || 'seu-link'}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Dia</Label>
                <Input value={form.info_day} onChange={(e) => setForm({ ...form, info_day: e.target.value })} placeholder="Quintas-feiras" />
              </div>
              <div className="space-y-2">
                <Label>Horário</Label>
                <Input value={form.info_time} onChange={(e) => setForm({ ...form, info_time: e.target.value })} placeholder="19:30 às 21:00" />
              </div>
              <div className="space-y-2">
                <Label>Formato</Label>
                <Input value={form.info_format} onChange={(e) => setForm({ ...form, info_format: e.target.value })} placeholder="Online (Google Meet)" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Informação adicional (caixa de informações)</Label>
              <Input value={form.info_extra} onChange={(e) => setForm({ ...form, info_extra: e.target.value })} placeholder="Início: 26/02/2026 — Gratuito" />
            </div>

            <div className="space-y-2">
              <Label>Texto livre</Label>
              <Textarea rows={6} value={form.free_text} onChange={(e) => setForm({ ...form, free_text: e.target.value })} placeholder="Descreva o curso, público-alvo, orientações..." />
            </div>

            <div className="space-y-2">
              <Label>Link do grupo de WhatsApp (opcional)</Label>
              <Input
                value={form.whatsapp_group_url}
                onChange={(e) => setForm({ ...form, whatsapp_group_url: e.target.value })}
                placeholder="https://chat.whatsapp.com/..."
              />
              <p className="text-xs text-muted-foreground">
                Se preenchido, a página de confirmação exibirá o botão "Entrar no grupo de WhatsApp" no lugar do botão "Voltar para a Home".
              </p>
            </div>

            <div className="space-y-2">
              <Label>Texto da página de confirmação (opcional)</Label>
              <Textarea
                rows={3}
                value={form.thanks_text}
                onChange={(e) => setForm({ ...form, thanks_text: e.target.value })}
                placeholder="Sua inscrição foi confirmada! Em breve entraremos em contato."
              />
            </div>

            <div className="space-y-2">
              <Label>Cursos incluídos nesta inscrição</Label>
              <div className="border rounded-lg divide-y max-h-56 overflow-y-auto">
                {courses.map((c) => (
                  <label key={c.id} className="flex items-center gap-3 p-2.5 cursor-pointer hover:bg-muted/50">
                    <Checkbox checked={form.course_ids.includes(c.id)} onCheckedChange={() => toggleCourse(c.id)} />
                    <span className="text-sm">{c.title}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="covers">Exibir capas dos cursos</Label>
              <Switch id="covers" checked={form.show_course_covers} onCheckedChange={(v) => setForm({ ...form, show_course_covers: v })} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="active">Página ativa</Label>
              <Switch id="active" checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
