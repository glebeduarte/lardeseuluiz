import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHero } from '@/components/layout/PageHero';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Search, ExternalLink, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface BookForm {
  title: string;
  author: string;
  spirit: string;
  description: string;
  pdf_url: string;
  cover_url: string;
  tags: string;
  study_lines: string;
}

const emptyForm: BookForm = {
  title: '',
  author: '',
  spirit: '',
  description: '',
  pdf_url: '',
  cover_url: '',
  tags: '',
  study_lines: '',
};

export default function LibraryPage() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BookForm>(emptyForm);
  const queryClient = useQueryClient();

  const { data: books = [], isLoading } = useQuery({
    queryKey: ['admin-books'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .order('title');
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (formData: BookForm) => {
      const payload = {
        title: formData.title,
        author: formData.author,
        spirit: formData.spirit || null,
        description: formData.description || null,
        pdf_url: formData.pdf_url || null,
        cover_url: formData.cover_url || null,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        study_lines: formData.study_lines ? formData.study_lines.split(',').map(t => t.trim()).filter(Boolean) : [],
      };

      if (editingId) {
        const { error } = await supabase.from('books').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('books').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-books'] });
      toast({ title: editingId ? 'Livro atualizado!' : 'Livro adicionado!' });
      closeDialog();
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('books').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-books'] });
      toast({ title: 'Livro removido!' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao remover', description: err.message, variant: 'destructive' });
    },
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const openEdit = (book: any) => {
    setEditingId(book.id);
    setForm({
      title: book.title,
      author: book.author,
      spirit: book.spirit || '',
      description: book.description || '',
      pdf_url: book.pdf_url || '',
      cover_url: book.cover_url || '',
      tags: (book.tags || []).join(', '),
      study_lines: (book.study_lines || []).join(', '),
    });
    setDialogOpen(true);
  };

  const filtered = books.filter(
    (b) =>
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.author.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <PageHero title="Biblioteca" description="Gerencie o acervo de livros disponíveis para os alunos." />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex flex-col sm:flex-row gap-3 mb-6 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título ou autor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingId(null); setForm(emptyForm); }}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Livro
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Editar Livro' : 'Adicionar Livro'}</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveMutation.mutate(form);
                }}
                className="space-y-4"
              >
                <div>
                  <Label htmlFor="title">Título *</Label>
                  <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="author">Autor *</Label>
                    <Input id="author" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} required />
                  </div>
                  <div>
                    <Label htmlFor="spirit">Espírito</Label>
                    <Input id="spirit" value={form.spirit} onChange={(e) => setForm({ ...form, spirit: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
                </div>
                <div>
                  <Label htmlFor="pdf_url">Link do PDF (Google Drive)</Label>
                  <Input id="pdf_url" value={form.pdf_url} onChange={(e) => setForm({ ...form, pdf_url: e.target.value })} placeholder="https://drive.google.com/..." />
                </div>
                <div>
                  <Label htmlFor="cover_url">URL da Capa</Label>
                  <Input id="cover_url" value={form.cover_url} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} placeholder="https://..." />
                </div>
                <div>
                  <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
                  <Input id="tags" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="Evangelho, Jesus, Reforma íntima" />
                </div>
                <div>
                  <Label htmlFor="study_lines">Linhas de Estudo (separadas por vírgula)</Label>
                  <Input id="study_lines" value={form.study_lines} onChange={(e) => setForm({ ...form, study_lines: e.target.value })} placeholder="Doutrinária, Filosófica" />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
                  <Button type="submit" disabled={saveMutation.isPending}>
                    {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {editingId ? 'Salvar' : 'Adicionar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">{filtered.length} livro(s) encontrado(s)</p>
            <div className="rounded-xl border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead className="hidden md:table-cell">Autor</TableHead>
                    <TableHead className="hidden lg:table-cell">Espírito</TableHead>
                    <TableHead className="hidden lg:table-cell">Tags</TableHead>
                    <TableHead className="w-[120px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((book) => (
                    <TableRow key={book.id}>
                      <TableCell className="font-medium">
                        <div>
                          {book.title}
                          <span className="block md:hidden text-xs text-muted-foreground">{book.author}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{book.author}</TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">{book.spirit || '—'}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {(book.tags || []).slice(0, 3).map((tag: string) => (
                            <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                          ))}
                          {(book.tags || []).length > 3 && (
                            <Badge variant="outline" className="text-[10px]">+{(book.tags || []).length - 3}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {book.pdf_url && (
                            <Button variant="ghost" size="icon" asChild>
                              <a href={book.pdf_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => openEdit(book)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover livro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja remover "{book.title}"? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteMutation.mutate(book.id)}>
                                  Remover
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhum livro encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
