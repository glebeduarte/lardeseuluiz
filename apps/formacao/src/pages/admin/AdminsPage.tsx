import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CabecalhoPagina } from '@/compartilhado';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, UserCog, Loader2, Shield } from 'lucide-react';
import { PageHero } from '@/components/layout/PageHero';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Admin {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
}

export default function AdminsPage() {
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const { toast } = useToast();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);

  // Add admin dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [addingAdmin, setAddingAdmin] = useState(false);

  // Remove admin dialog
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [adminToRemove, setAdminToRemove] = useState<Admin | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    fetchAdmins();
  }, [isAdmin, navigate]);

  const fetchAdmins = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, created_at')
      .eq('role', 'admin')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAdmins(data);
    }
    setLoading(false);
  };

  const promoteToAdmin = async () => {
    if (!newAdminEmail.trim()) {
      toast({
        title: 'Email obrigatório',
        variant: 'destructive',
      });
      return;
    }

    setAddingAdmin(true);

    // Find user by email
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('email', newAdminEmail.toLowerCase())
      .maybeSingle();

    if (userError || !userData) {
      toast({
        title: 'Usuário não encontrado',
        description: 'Verifique se o email está correto',
        variant: 'destructive',
      });
      setAddingAdmin(false);
      return;
    }

    // Update role to admin
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', userData.id);

    if (updateError) {
      toast({
        title: 'Erro ao promover',
        description: updateError.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Administrador adicionado!' });
      setAddDialogOpen(false);
      setNewAdminEmail('');
      fetchAdmins();
    }

    setAddingAdmin(false);
  };

  const removeAdmin = async () => {
    if (!adminToRemove) return;

    if (adminToRemove.id === user?.id) {
      toast({
        title: 'Não é possível remover a si mesmo',
        variant: 'destructive',
      });
      setRemoveDialogOpen(false);
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ role: 'student' })
      .eq('id', adminToRemove.id);

    if (error) {
      toast({
        title: 'Erro ao remover',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Administrador removido' });
      setAdmins(admins.filter((a) => a.id !== adminToRemove.id));
    }

    setRemoveDialogOpen(false);
    setAdminToRemove(null);
  };

  return (
    <DashboardLayout>
      <CabecalhoPagina
        titulo="Administradores"
        descricao="Gerencie os administradores da plataforma"
        acoes={
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Admin
          </Button>
        }
      />
      <div className="space-y-6">

        {/* Table */}
        <div className="rounded-lg border bg-card overflow-x-auto">
            <Table className="min-w-[500px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Administrador</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Desde</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={4}>
                        <div className="h-12 bg-muted/50 rounded animate-pulse" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : admins.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      <UserCog className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">Nenhum administrador</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  admins.map((admin) => (
                    <TableRow key={admin.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <Shield className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="font-medium">{admin.full_name}</span>
                            {admin.id === user?.id && (
                              <Badge variant="outline" className="bg-muted text-muted-foreground border-border ml-2">
                                Você
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{admin.email}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(admin.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        {admin.id !== user?.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              setAdminToRemove(admin);
                              setRemoveDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
        </div>
      </div>

      {/* Add Admin Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Administrador</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email do Usuário</Label>
              <Input
                type="email"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                placeholder="email@exemplo.com"
              />
              <p className="text-sm text-muted-foreground">
                O usuário precisa já estar cadastrado na plataforma
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={promoteToAdmin} disabled={addingAdmin}>
              {addingAdmin && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Admin Dialog */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Administrador</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover {adminToRemove?.full_name} como administrador? Ele será
              convertido em aluno.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={removeAdmin} className="bg-destructive hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
