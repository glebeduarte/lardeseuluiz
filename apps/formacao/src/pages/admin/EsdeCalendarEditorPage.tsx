import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHero } from '@/components/layout/PageHero';
import { CabecalhoPagina } from '@/compartilhado';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, Pencil, Trash2, ArrowUp, ArrowDown, Loader2, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Entry {
  id: string;
  course_code: string;
  date_label: string;
  sort_order: number;
  roteiro: string;
  tema: string;
  modulo: string;
  facilitador: string;
  tipo: 'aula' | 'feriado' | 'recesso' | 'encerramento' | 'extra';
}

const MODULOS = ['', 'Módulo I', 'Módulo II', 'Módulo III', 'Módulo IV', 'Módulo V', 'Módulo VI', 'Módulo VII', 'Módulo VIII'];
const TIPOS: Entry['tipo'][] = ['aula', 'feriado', 'recesso', 'encerramento', 'extra'];

const COURSE_OPTIONS: { code: string; label: string }[] = [
  { code: 'ESDE_I', label: 'ESDE I' },
  { code: 'ESDE_II', label: 'ESDE II' },
];

const moduloColors: Record<string, string> = {
  // Mesmas cores por módulo do calendário público (paleta do padrão único)
  'Módulo I': 'bg-primary/10 text-primary border-primary/30',
  'Módulo II': 'bg-accent/20 text-accent-foreground border-accent/40',
  'Módulo III': 'bg-emerald-100 text-emerald-800 border-emerald-300',
  'Módulo IV': 'bg-amber-100 text-amber-800 border-amber-300',
  'Módulo V': 'bg-sky-100 text-sky-800 border-sky-300',
  'Módulo VI': 'bg-primary/10 text-primary border-primary/30',
  'Módulo VII': 'bg-accent/20 text-accent-foreground border-accent/40',
  'Módulo VIII': 'bg-emerald-100 text-emerald-800 border-emerald-300',
};

const emptyEntry = (courseCode: string): Omit<Entry, 'id'> => ({
  course_code: courseCode,
  date_label: '',
  sort_order: 0,
  roteiro: '',
  tema: '',
  modulo: '',
  facilitador: '',
  tipo: 'aula',
});

export default function EsdeCalendarEditorPage() {
  const [courseCode, setCourseCode] = useState<string>('ESDE_I');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [form, setForm] = useState<Omit<Entry, 'id'>>(emptyEntry('ESDE_I'));
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('esde_calendar_entries')
      .select('*')
      .eq('course_code', courseCode)
      .order('sort_order', { ascending: true });

    if (error) toast.error('Erro ao carregar calendário');
    setEntries((data as Entry[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [courseCode]);

  const openNew = () => {
    setEditing(null);
    const nextOrder = entries.length > 0 ? Math.max(...entries.map(e => e.sort_order)) + 1 : 1;
    setForm({ ...emptyEntry(courseCode), sort_order: nextOrder });
    setDialogOpen(true);
  };

  const openEdit = (entry: Entry) => {
    setEditing(entry);
    const { id, ...rest } = entry;
    setForm(rest);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.date_label.trim()) {
      toast.error('Informe a data');
      return;
    }
    setSaving(true);
    if (editing) {
      const { error } = await supabase
        .from('esde_calendar_entries')
        .update(form)
        .eq('id', editing.id);
      if (error) { toast.error('Erro ao salvar'); setSaving(false); return; }
      toast.success('Aula atualizada');
    } else {
      const { error } = await supabase.from('esde_calendar_entries').insert(form);
      if (error) { toast.error('Erro ao criar'); setSaving(false); return; }
      toast.success('Aula adicionada');
    }
    setSaving(false);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('esde_calendar_entries').delete().eq('id', deleteId);
    if (error) toast.error('Erro ao excluir');
    else toast.success('Removido');
    setDeleteId(null);
    load();
  };

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= entries.length) return;
    const a = entries[index];
    const b = entries[target];
    // swap sort_order values
    await supabase.from('esde_calendar_entries').update({ sort_order: b.sort_order }).eq('id', a.id);
    await supabase.from('esde_calendar_entries').update({ sort_order: a.sort_order }).eq('id', b.id);
    load();
  };

  return (
    <DashboardLayout>
      <CabecalhoPagina
        titulo="Editor dos Calendários de Formação"
        descricao="Edite, adicione ou remova aulas, feriados, recessos e encontros extras dos cronogramas públicos."
      />

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <Label className="text-sm">Curso:</Label>
            <Select value={courseCode} onValueChange={setCourseCode}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COURSE_OPTIONS.map(c => (
                  <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {entries.length} {entries.length === 1 ? 'entrada' : 'entradas'}
            </p>
          </div>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-2" /> Nova entrada
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="rounded-lg border bg-card overflow-x-auto">
            <div>
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-3 py-3 text-left font-medium text-muted-foreground w-[80px]">Ordem</th>
                    <th className="px-3 py-3 text-left font-medium text-muted-foreground w-[110px]">Data</th>
                    <th className="px-3 py-3 text-left font-medium text-muted-foreground w-[80px]">Nº</th>
                    <th className="px-3 py-3 text-left font-medium text-muted-foreground">Tema</th>
                    <th className="px-3 py-3 text-left font-medium text-muted-foreground w-[120px]">Módulo</th>
                    <th className="px-3 py-3 text-left font-medium text-muted-foreground w-[150px]">Facilitador</th>
                    <th className="px-3 py-3 text-left font-medium text-muted-foreground w-[90px]">Tipo</th>
                    <th className="px-3 py-3 text-right font-medium text-muted-foreground w-[160px]">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e, i) => (
                    <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" disabled={i === 0} onClick={() => move(i, -1)}>
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" disabled={i === entries.length - 1} onClick={() => move(i, 1)}>
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                      <td className="px-3 py-2 font-medium">{e.date_label}</td>
                      <td className="px-3 py-2">{e.roteiro || '—'}</td>
                      <td className="px-3 py-2 max-w-[420px] truncate">{e.tema || <span className="text-muted-foreground italic">—</span>}</td>
                      <td className="px-3 py-2">
                        {e.modulo && (
                          <Badge variant="outline" className={moduloColors[e.modulo] || ''}>{e.modulo}</Badge>
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{e.facilitador || '—'}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className="bg-muted text-muted-foreground border-border capitalize text-xs">{e.tipo}</Badge>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(e)} className="gap-1">
                            <Pencil className="h-3.5 w-3.5" /> Editar
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(e.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {entries.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-3 py-12 text-center text-muted-foreground">
                        Nenhuma entrada cadastrada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Edit / Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar entrada' : 'Nova entrada'}</DialogTitle>
            <DialogDescription>Preencha os dados da aula, feriado ou recesso.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                placeholder="ex: 26/02/2026"
                value={form.date_label}
                onChange={(e) => setForm({ ...form, date_label: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as Entry['tipo'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nº do Roteiro</Label>
              <Input
                placeholder='ex: 1 (ou "Recesso")'
                value={form.roteiro}
                onChange={(e) => setForm({ ...form, roteiro: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Ordem</Label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Tema</Label>
              <Textarea
                rows={3}
                value={form.tema}
                onChange={(e) => setForm({ ...form, tema: e.target.value })}
                placeholder="Tema da aula"
              />
            </div>
            <div className="space-y-2">
              <Label>Módulo</Label>
              <Select value={form.modulo || '__none__'} onValueChange={(v) => setForm({ ...form, modulo: v === '__none__' ? '' : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Nenhum —</SelectItem>
                  {MODULOS.filter(Boolean).map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Facilitador(a)</Label>
              <Input
                value={form.facilitador}
                onChange={(e) => setForm({ ...form, facilitador: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover entrada?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A entrada será removida do calendário público.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
