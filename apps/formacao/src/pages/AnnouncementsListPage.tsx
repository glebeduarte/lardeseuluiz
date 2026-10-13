import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Bell, BellOff, Calendar, BookOpen, Mic, Megaphone, Star } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { AnnouncementSkeleton } from '@/components/ui/course-skeletons';

interface Announcement {
  id: string;
  title: string;
  description: string | null;
  category: string;
  starts_at: string | null;
  created_at: string;
}

const categoryConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  curso: { icon: <BookOpen className="h-3.5 w-3.5" />, label: 'Curso', color: 'bg-primary/10 text-primary border-primary/20' },
  evento: { icon: <Calendar className="h-3.5 w-3.5" />, label: 'Evento', color: 'bg-teal/10 text-teal border-teal/20' },
  palestra: { icon: <Mic className="h-3.5 w-3.5" />, label: 'Palestra', color: 'bg-accent/10 text-accent border-accent/20' },
  geral: { icon: <Megaphone className="h-3.5 w-3.5" />, label: 'Geral', color: 'bg-muted text-muted-foreground border-border' },
  destaque: { icon: <Star className="h-3.5 w-3.5" />, label: 'Destaque', color: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800' },
};

export default function AnnouncementsListPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('announcements')
      .select('id, title, description, category, starts_at, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setAnnouncements(data || []);
        setLoading(false);
      });
  }, []);

  return (
    <DashboardLayout>
      <div className="px-4 sm:px-6 md:px-8 py-6 max-w-5xl mx-auto">
        <header className="mb-6 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-lt flex items-center justify-center">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold leading-tight">Avisos</h1>
            <p className="text-sm text-muted-foreground">Comunicados, eventos e novidades da casa</p>
          </div>
        </header>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <AnnouncementSkeleton key={i} />)}
          </div>
        ) : announcements.length === 0 ? (
          <EmptyState
            icon={BellOff}
            title="Nenhum aviso no momento"
            description="Quando houver novos comunicados, eventos ou avisos da casa, eles aparecerão aqui."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {announcements.map((a) => {
              const cat = categoryConfig[a.category] || categoryConfig.geral;
              return (
                <article
                  key={a.id}
                  className="rounded-xl border border-border bg-card p-4 shadow-card hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${cat.color}`}>
                      {cat.icon}
                      {cat.label}
                    </span>
                  </div>
                  <h2 className="font-display font-bold text-sm leading-snug mb-1">{a.title}</h2>
                  {a.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed">{a.description}</p>
                  )}
                  {a.starts_at && (
                    <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                      <Calendar className="h-3 w-3" aria-hidden="true" />
                      {new Date(a.starts_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
