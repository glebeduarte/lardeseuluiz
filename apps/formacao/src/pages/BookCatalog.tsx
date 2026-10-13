import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, ExternalLink, Loader2 } from 'lucide-react';
import { PageHero } from '@/components/layout/PageHero';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Book {
  id: string;
  title: string;
  spirit: string | null;
  author: string;
  tags: string[] | null;
  pdf_url: string | null;
  description: string | null;
  cover_url: string | null;
}

export default function BookCatalog() {
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);

  const { data: books = [], isLoading } = useQuery({
    queryKey: ['public-books'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('books')
        .select('id, title, author, spirit, tags, pdf_url, description, cover_url')
        .order('title');
      if (error) throw error;
      return data as Book[];
    },
  });

  const allTags = useMemo(
    () => Array.from(new Set(books.flatMap(b => b.tags || []))).sort(),
    [books],
  );
  const allAuthors = useMemo(
    () => Array.from(new Set(books.map(b => b.author).filter(Boolean))).sort(),
    [books],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return books.filter((book) => {
      const matchesSearch =
        !q ||
        book.title.toLowerCase().includes(q) ||
        book.author.toLowerCase().includes(q) ||
        (book.spirit || '').toLowerCase().includes(q);
      const matchesTag = !selectedTag || (book.tags || []).includes(selectedTag);
      const matchesAuthor = !selectedAuthor || book.author === selectedAuthor;
      return matchesSearch && matchesTag && matchesAuthor;
    });
  }, [books, search, selectedTag, selectedAuthor]);

  return (
    <DashboardLayout>
      <PageHero title="Biblioteca" description="Acervo de obras recomendadas para estudo e leitura." variant="student" />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Search + Author filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título, autor ou espírito..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedAuthor ?? 'all'} onValueChange={(v) => setSelectedAuthor(v === 'all' ? null : v)}>
            <SelectTrigger className="w-full sm:w-[260px]">
              <SelectValue placeholder="Todos os autores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os autores</SelectItem>
              {allAuthors.map((author) => (
                <SelectItem key={author} value={author}>{author}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedTag ?? 'all'} onValueChange={(v) => setSelectedTag(v === 'all' ? null : v)}>
            <SelectTrigger className="w-full sm:w-[260px]">
              <SelectValue placeholder="Todos os temas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os temas</SelectItem>
              {allTags.map((tag) => (
                <SelectItem key={tag} value={tag}>{tag}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              {filtered.length} {filtered.length === 1 ? 'livro encontrado' : 'livros encontrados'}
            </p>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((book) => {
                const Wrapper: any = book.pdf_url ? 'a' : 'div';
                const wrapperProps = book.pdf_url
                  ? { href: book.pdf_url, target: '_blank', rel: 'noopener noreferrer' }
                  : {};
                return (
                  <Wrapper
                    key={book.id}
                    {...wrapperProps}
                    className="group rounded-xl border border-border bg-card overflow-hidden transition-all hover:shadow-md hover:border-primary/30"
                  >
                    {book.cover_url ? (
                      <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
                        <img
                          src={book.cover_url}
                          alt={`Capa de ${book.title}`}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    ) : (
                      <div className="aspect-[4/3] w-full bg-gradient-to-br from-muted to-muted/60 flex items-center justify-center">
                        <span className="text-muted-foreground text-xs">Sem capa</span>
                      </div>
                    )}
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">
                          {book.title}
                        </h3>
                        {book.pdf_url && (
                          <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors mt-0.5" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">{book.author}</p>
                      {book.spirit && book.spirit !== '—' && (
                        <p className="text-xs text-muted-foreground/70 mb-3">Espírito: {book.spirit}</p>
                      )}
                      {book.description && (
                        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{book.description}</p>
                      )}
                      <div className="flex flex-wrap gap-1">
                        {(book.tags || []).slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                            {tag}
                          </Badge>
                        ))}
                        {(book.tags || []).length > 3 && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            +{(book.tags || []).length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Wrapper>
                );
              })}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <p className="text-lg">Nenhum livro encontrado.</p>
                <p className="text-sm mt-1">Tente ajustar sua busca ou filtro.</p>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
