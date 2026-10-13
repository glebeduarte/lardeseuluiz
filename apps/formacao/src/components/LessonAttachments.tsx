import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Trash2, Upload, Loader2, ExternalLink } from 'lucide-react';

interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string | null;
}

interface LessonAttachmentsProps {
  lessonId: string;
  lessonTitle: string;
}

export function LessonAttachments({ lessonId, lessonTitle }: LessonAttachmentsProps) {
  const { toast } = useToast();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchAttachments();
  }, [lessonId]);

  const fetchAttachments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('attachments')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('created_at');

    if (error) {
      toast({ title: 'Erro ao carregar anexos', variant: 'destructive' });
    } else {
      setAttachments(data || []);
    }
    setLoading(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 30 * 1024 * 1024) {
      toast({ title: 'Arquivo muito grande (máx. 30MB)', variant: 'destructive' });
      return;
    }

    setUploading(true);

    try {
      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${lessonId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('lesson-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('lesson-attachments')
        .getPublicUrl(fileName);

      // Save to database
      const { error: dbError } = await supabase
        .from('attachments')
        .insert({
          lesson_id: lessonId,
          name: file.name,
          url: urlData.publicUrl,
          type: file.type || null,
        });

      if (dbError) throw dbError;

      toast({ title: 'Anexo adicionado!' });
      fetchAttachments();
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: 'Erro ao fazer upload', variant: 'destructive' });
    }

    setUploading(false);
    // Reset input
    event.target.value = '';
  };

  const deleteAttachment = async (attachment: Attachment) => {
    try {
      // Extract file path from URL
      const urlParts = attachment.url.split('/lesson-attachments/');
      const filePath = urlParts[1];

      // Delete from storage
      if (filePath) {
        await supabase.storage
          .from('lesson-attachments')
          .remove([filePath]);
      }

      // Delete from database
      const { error } = await supabase
        .from('attachments')
        .delete()
        .eq('id', attachment.id);

      if (error) throw error;

      toast({ title: 'Anexo removido!' });
      setAttachments(attachments.filter(a => a.id !== attachment.id));
    } catch (error) {
      console.error('Delete error:', error);
      toast({ title: 'Erro ao remover anexo', variant: 'destructive' });
    }
  };

  const getFileIcon = (type: string | null) => {
    return <FileText className="h-4 w-4 text-primary" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Anexos da aula: {lessonTitle}</Label>
      </div>

      {/* Upload Button */}
      <div className="flex items-center gap-2">
        <Input
          type="file"
          id={`attachment-upload-${lessonId}`}
          className="hidden"
          onChange={handleFileUpload}
          accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.rar"
          disabled={uploading}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => document.getElementById(`attachment-upload-${lessonId}`)?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          {uploading ? 'Enviando...' : 'Adicionar Anexo'}
        </Button>
        <span className="text-xs text-muted-foreground">
          PDF, DOC, PPT, XLS, TXT, ZIP (máx. 30MB)
        </span>
      </div>

      {/* Attachments List */}
      {attachments.length > 0 ? (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg group"
            >
              {getFileIcon(attachment.type)}
              <span className="flex-1 text-sm truncate">{attachment.name}</span>
              <a
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </a>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => deleteAttachment(attachment)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Nenhum anexo adicionado</p>
      )}
    </div>
  );
}
