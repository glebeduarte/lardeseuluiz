import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Phone } from 'lucide-react';

export function IncompleteProfileModal() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  // Only show for logged-in non-admin users with missing phone
  if (!user || !profile || profile.role === 'admin' || profile.phone) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = phone.trim();
    if (!trimmed || trimmed.length < 10) {
      toast({ title: 'Telefone inválido', description: 'Informe um número de telefone válido.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ phone: trimmed })
      .eq('id', profile.id);

    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Telefone atualizado!' });
      // Force page reload to refresh profile
      window.location.reload();
    }
    setSaving(false);
  };

  return (
    <Dialog open={true}>
      <DialogContent
        className="sm:max-w-md [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            Complete seu cadastro
          </DialogTitle>
          <DialogDescription>
            Para continuar usando a plataforma, precisamos que você preencha os dados abaixo.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone (com DDD)</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="(84) 99999-9999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              autoFocus
            />
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar e continuar'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
