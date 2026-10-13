import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Megaphone, Calendar, BookOpen, Mic, Star } from 'lucide-react';
import { PageHero } from '@/components/layout/PageHero';

interface Announcement {
  id: string;
  title: string;
  description: string | null;
  category: string;
  is_active: boolean;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
}

const categories = [
  { value: 'geral', label: 'Geral', icon: '📢' },
  { value: 'curso', label: 'Curso', icon: '📚' },
  { value: 'evento', label: 'Evento', icon: '📅' },
  { value: 'palestra', label: 'Palestra', icon: '🎤' },
  { value: 'destaque', label: 'Destaque', icon: '⭐' },
];

export default function AnnouncementsPage() {
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState({ title: '', description: '', category: 'geral', starts_at: '', expires_at: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAdmin) { navigate('/dashboard'); return; }
    fetchAnnouncements();
  }, [isAdmin, navigate]);

  const fetchAnnouncements = async () => {
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });
    setAnnouncements((data as Announcement[]) || []);
    setLoading(false);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ title: '', description: '', category: 'geral', starts_at: '', expires_at: '' });
    setDialogOpen(true);
  };

  const openEdit = (a: Announcement) => {
    setEditing(a);
    setForm({
      title: a.title,
      description: a.description || '',
      category: a.category,
      starts_at: a.starts_at ? a.starts_at.slice(0, 16) : '',
      expires_at: a.expires_at ? a.expires_at.slice(0, 16) : '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast({ title: 'Título obrigatório', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      category: form.category,
      starts_at: form.starts_at || null,
      expires_at: form.expires_at || null,
      ...(editing ? {} : { created_by: user?.id }),
    };

    if (editing) {
      await supabase.from('announcements').update(payload).eq('id', editing.id);
      toast({ title: 'Aviso atualizado' });
    } else {
      await supabase.from('announcements').insert(payload);
      toast({ title: 'Aviso criado' });
    }
    setSaving(false);
    setDialogOpen(false);
    fetchAnnouncements();
  };

  const toggleActive = async (a: Announcement) => {
    await supabase.from('announcements').update({ is_active: !a.is_active }).eq('id', a.id);
    fetchAnnouncements();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este aviso?')) return;
    await supabase.from('announcements').delete().eq('id', id);
    toast({ title: 'Aviso excluído' });
    fetchAnnouncements();
  };

  const getCatIcon = (cat: string) => {
    const found = categories.find(c => c.value === cat);
    return found?.icon || '📢';
  };

  return (
    <DashboardLayout>
      <PageHero title="Avisos e Programação" description="Gerencie avisos visíveis para os alunos" />
      <div className="p-4 sm:p-6 md:p-7 space-y-5">
        <div className="flex justify-end">
          <Button onClick={openNew} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> Novo Aviso
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-muted/30 rounded-xl animate-pulse" />)}
          </div>
        ) : announcements.length === 0 ? (
          <Card className="shadow-card border-border">
            <CardContent className="p-8 text-center">
              <Megaphone className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-sm text-muted-foreground">Nenhum aviso criado ainda.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {announcements.map((a) => (
              <Card key={a.id} className={`shadow-card border-border ${!a.is_active ? 'opacity-50' : ''}`}>
                <CardContent className="p-4 flex items-start gap-3">
                  <span className="text-xl mt-0.5">{getCatIcon(a.category)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-display font-bold text-sm">{a.title}</h3>
                      <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {categories.find(c => c.value === a.category)?.label || a.category}
                      </span>
                      {!a.is_active && (
                        <span className="text-[10px] uppercase tracking-wider font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">Inativo</span>
                      )}
                    </div>
                    {a.description && <p className="text-xs text-muted-foreground line-clamp-1">{a.description}</p>}
                    {a.starts_at && (
                      <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(a.starts_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Switch checked={a.is_active} onCheckedChange={() => toggleActive(a)} />
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(a)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(a.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar Aviso' : 'Novo Aviso'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Título *</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Palestra sobre mediunidade" />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Breve descrição do aviso..." rows={3} />
              </div>
              <div>
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.icon} {c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Data/Hora de Início</Label>
                  <Input type="datetime-local" value={form.starts_at} onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))} />
                </div>
                <div>
                  <Label>Expira em</Label>
                  <Input type="datetime-local" value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} />
                </div>
              </div>
              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? 'Salvando...' : editing ? 'Salvar Alterações' : 'Criar Aviso'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
