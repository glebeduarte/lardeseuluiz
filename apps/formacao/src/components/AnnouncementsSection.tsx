import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, BookOpen, Mic, Star, Megaphone } from 'lucide-react';

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

export function AnnouncementsSection() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    const { data } = await supabase
      .from('announcements')
      .select('id, title, description, category, starts_at, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(6);
    setAnnouncements(data || []);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <h2 className="font-display font-bold text-base flex items-center gap-2">📢 Avisos</h2>
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-16 bg-muted/30 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (announcements.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="font-display font-bold text-base flex items-center gap-2">📢 Avisos e Programação</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {announcements.map((a) => {
          const cat = categoryConfig[a.category] || categoryConfig.geral;
          return (
            <div
              key={a.id}
              className="rounded-xl border border-border bg-card p-4 shadow-card hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${cat.color}`}>
                  {cat.icon}
                  {cat.label}
                </span>
              </div>
              <h3 className="font-display font-bold text-sm leading-snug mb-1">{a.title}</h3>
              {a.description && (
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{a.description}</p>
              )}
              {a.starts_at && (
                <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(a.starts_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
