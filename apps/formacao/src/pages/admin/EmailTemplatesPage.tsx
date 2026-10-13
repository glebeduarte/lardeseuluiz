import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Mail, Edit, Eye, Save, X, Code, Variable, Send, Search, Users, Filter, CheckCircle, History, RefreshCw, Clock, BarChart3, Loader2, AlertTriangle } from 'lucide-react';
import { PageHero } from '@/components/layout/PageHero';
import { CabecalhoPagina } from '@/compartilhado';
import { Progress } from '@/components/ui/progress';
import { RichTextEditor } from '@/components/RichTextEditor';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EmailTemplate {
  id: string;
  template_key: string;
  name: string;
  subject: string;
  html_content: string;
  description: string | null;
  variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface StudentRecipient {
  id: string;
  full_name: string;
  email: string;
  user_type: 'frequentador' | 'trabalhador';
  is_active: boolean;
}

interface Course {
  id: string;
  title: string;
}

interface EmailCampaign {
  id: string;
  subject: string;
  html_content: string;
  recipients_count: number;
  sent_count: number;
  failed_count: number;
  status: string;
  recipient_emails: string[];
  recipient_names: string[];
  created_at: string;
}

export default function EmailTemplatesPage() {
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const { toast } = useToast();

  // Templates state
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ subject: '', html_content: '', is_active: true });
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState<'code' | 'preview'>('preview');

  // Compose state
  const [students, setStudents] = useState<StudentRecipient[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeMode, setComposeMode] = useState<'rich' | 'html'>('rich');
  const [showPreview, setShowPreview] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCourse, setFilterCourse] = useState('all');
  const [filterUserType, setFilterUserType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);

  // Campaign history state
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [previewCampaign, setPreviewCampaign] = useState<EmailCampaign | null>(null);
  const [resending, setResending] = useState<string | null>(null);

  // Daily usage state
  const [dailyUsage, setDailyUsage] = useState({ sent: 0, limit: 100, queued: 0 });

  useEffect(() => {
    if (!isAdmin) { navigate('/dashboard'); return; }
    fetchTemplates();
    fetchStudentsAndCourses();
    fetchCampaigns();
    fetchDailyUsage();
  }, [isAdmin, navigate]);

  const fetchDailyUsage = async () => {
    const today = new Date().toISOString().split('T')[0];
    const [usageRes, queueRes] = await Promise.all([
      supabase.from('email_daily_usage').select('sent_count, daily_limit').eq('usage_date', today).single(),
      supabase.from('email_queue').select('id', { count: 'exact', head: true }).eq('status', 'queued'),
    ]);
    setDailyUsage({
      sent: usageRes.data?.sent_count || 0,
      limit: usageRes.data?.daily_limit || 100,
      queued: queueRes.count || 0,
    });
  };

  const fetchTemplates = async () => {
    const { data, error } = await supabase.from('email_templates').select('*').order('name');
    if (!error) setTemplates(data || []);
    setLoadingTemplates(false);
  };

  const fetchStudentsAndCourses = async () => {
    setLoadingStudents(true);
    const [profilesRes, coursesRes, enrollmentsRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email, user_type, is_active').eq('role', 'student').order('full_name'),
      supabase.from('courses').select('id, title').order('title'),
      supabase.from('enrollments').select('user_id, course_id, course:courses(title)').eq('status', 'approved'),
    ]);
    setStudents(profilesRes.data || []);
    setCourses(coursesRes.data || []);
    setEnrollmentsData(enrollmentsRes.data as any || []);
    setLoadingStudents(false);
  };

  const fetchCampaigns = async () => {
    setLoadingCampaigns(true);
    const { data, error } = await supabase
      .from('email_campaigns')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setCampaigns((data as any) || []);
    setLoadingCampaigns(false);
  };

  const [enrollmentsData, setEnrollmentsData] = useState<{ user_id: string; course_id: string; course: { title: string } | null }[]>([]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchesSearch = s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || s.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterUserType === 'all' || s.user_type === filterUserType;
      const matchesStatus = filterStatus === 'all' || (filterStatus === 'active' ? s.is_active : !s.is_active);
      const matchesCourse = filterCourse === 'all' || enrollmentsData.some(e => e.user_id === s.id && e.course_id === filterCourse);
      return matchesSearch && matchesType && matchesStatus && matchesCourse;
    });
  }, [students, searchQuery, filterUserType, filterStatus, filterCourse, enrollmentsData]);

  const allSelected = filteredStudents.length > 0 && filteredStudents.every(s => selectedRecipients.has(s.id));
  const toggleSelectAll = () => {
    if (allSelected) setSelectedRecipients(new Set());
    else setSelectedRecipients(new Set(filteredStudents.map(s => s.id)));
  };
  const toggleSelect = (id: string) => {
    const next = new Set(selectedRecipients);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedRecipients(next);
  };

  const getStudentCourses = (studentId: string) => {
    return enrollmentsData
      .filter(e => e.user_id === studentId && e.course?.title)
      .map(e => e.course!.title);
  };

  const getComposePreviewHtml = () => {
    const sampleStudent = students.find(s => selectedRecipients.has(s.id)) || students[0];
    const sampleName = sampleStudent?.full_name || 'João da Silva';
    const sampleFirstName = sampleName.split(' ')[0];
    const sampleEmail = sampleStudent?.email || 'joao@email.com';
    const sampleType = sampleStudent?.user_type === 'trabalhador' ? 'Trabalhador' : 'Frequentador';
    const sampleCourses = sampleStudent ? getStudentCourses(sampleStudent.id) : ['Curso Exemplo'];

    let html = composeBody
      .replace(/\{\{full_name\}\}/g, sampleName)
      .replace(/\{\{first_name\}\}/g, sampleFirstName)
      .replace(/\{\{email\}\}/g, sampleEmail)
      .replace(/\{\{user_type\}\}/g, sampleType)
      .replace(/\{\{courses_list\}\}/g, sampleCourses.length > 0 ? sampleCourses.join(', ') : 'Nenhum curso')
      .replace(/\{\{courses_count\}\}/g, String(sampleCourses.length));

    return `<!DOCTYPE html><html><head><meta charset="utf-8">
      <style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333;margin:0;padding:0;}
      .container{max-width:600px;margin:0 auto;padding:20px;}
      .header{background:linear-gradient(135deg,#0d9488,#0891b2);color:white;padding:30px;text-align:center;border-radius:8px 8px 0 0;}
      .content{background:#f9fafb;padding:30px;border-radius:0 0 8px 8px;}
      .footer{text-align:center;margin-top:20px;color:#6b7280;font-size:12px;}</style></head>
      <body><div class="container">
        <div class="header"><h1 style="margin:0;">✉️ ${composeSubject || 'Assunto do E-mail'}</h1></div>
        <div class="content">${html || '<p style="color:#999;">O conteúdo do e-mail aparecerá aqui...</p>'}</div>
        <div class="footer"><p>Área de Formação - Lar de Seu Luiz</p></div>
      </div></body></html>`;
  };

  const composeVariables = [
    { key: '{{full_name}}', label: 'Nome completo', example: 'João da Silva' },
    { key: '{{first_name}}', label: 'Primeiro nome', example: 'João' },
    { key: '{{email}}', label: 'E-mail', example: 'joao@email.com' },
    { key: '{{user_type}}', label: 'Tipo de usuário', example: 'Trabalhador' },
    { key: '{{courses_list}}', label: 'Cursos inscritos', example: 'ESDE, Diálogo Fraterno' },
    { key: '{{courses_count}}', label: 'Qtd. cursos', example: '2' },
  ];

  const buildRecipientsList = () => {
    return students
      .filter(s => selectedRecipients.has(s.id))
      .map(s => ({
        email: s.email,
        name: s.full_name,
        first_name: s.full_name.split(' ')[0],
        user_type: s.user_type === 'trabalhador' ? 'Trabalhador' : 'Frequentador',
        courses: getStudentCourses(s.id),
      }));
  };

  const saveCampaign = async (subject: string, htmlContent: string, recipients: any[], sentCount: number, failedCount: number) => {
    await supabase.from('email_campaigns').insert({
      subject,
      html_content: htmlContent,
      recipients_count: recipients.length,
      sent_count: sentCount,
      failed_count: failedCount,
      status: failedCount === 0 ? 'sent' : sentCount === 0 ? 'failed' : 'partial',
      recipient_emails: recipients.map(r => r.email),
      recipient_names: recipients.map(r => r.name),
      sent_by: user?.id,
    } as any);
    fetchCampaigns();
  };

  const handleSendEmail = async () => {
    if (selectedRecipients.size === 0 || !composeSubject.trim() || !composeBody.trim()) {
      toast({ title: 'Preencha todos os campos', description: 'Assunto, corpo do e-mail e pelo menos um destinatário são obrigatórios.', variant: 'destructive' });
      return;
    }

    setSending(true);
    const recipients = buildRecipientsList();

    try {
      const { data, error } = await supabase.functions.invoke('send-notification', {
        body: {
          type: 'bulk_email',
          recipients,
          subject: composeSubject,
          html_content: composeBody,
        },
      });

      if (error) throw error;

      const sentCount = data?.sent || 0;
      const failedCount = data?.failed || 0;
      const queuedCount = data?.queued || 0;

      // Save campaign
      await saveCampaign(composeSubject, composeBody, recipients, sentCount, failedCount);
      fetchDailyUsage();

      const parts = [];
      if (sentCount > 0) parts.push(`${sentCount} enviado(s)`);
      if (failedCount > 0) parts.push(`${failedCount} falha(s)`);
      if (queuedCount > 0) parts.push(`${queuedCount} na fila para envio posterior`);

      toast({
        title: queuedCount > 0 ? 'E-mails enviados e agendados!' : 'E-mails enviados!',
        description: parts.join(', ') + '.',
      });

      setComposeSubject('');
      setComposeBody('');
      setSelectedRecipients(new Set());
    } catch (err: any) {
      toast({ title: 'Erro ao enviar', description: err.message, variant: 'destructive' });
    }
    setSending(false);
  };

  const handleResendCampaign = async (campaign: EmailCampaign) => {
    setResending(campaign.id);

    // Rebuild recipients from saved data
    const recipients = campaign.recipient_emails.map((email, i) => {
      const name = campaign.recipient_names[i] || 'Aluno(a)';
      const studentMatch = students.find(s => s.email === email);
      return {
        email,
        name,
        first_name: name.split(' ')[0],
        user_type: studentMatch?.user_type === 'trabalhador' ? 'Trabalhador' : 'Frequentador',
        courses: studentMatch ? getStudentCourses(studentMatch.id) : [],
      };
    });

    try {
      const { data, error } = await supabase.functions.invoke('send-notification', {
        body: {
          type: 'bulk_email',
          recipients,
          subject: campaign.subject,
          html_content: campaign.html_content,
        },
      });

      if (error) throw error;

      const sentCount = data?.sent || 0;
      const failedCount = data?.failed || 0;

      await saveCampaign(campaign.subject, campaign.html_content, recipients, sentCount, failedCount);

      toast({
        title: 'Campanha reenviada!',
        description: `${sentCount} enviado(s), ${failedCount} falha(s).`,
      });
    } catch (err: any) {
      toast({ title: 'Erro ao reenviar', description: err.message, variant: 'destructive' });
    }
    setResending(null);
  };

  // Template handlers
  const handleEdit = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setEditForm({ subject: template.subject, html_content: template.html_content, is_active: template.is_active });
    setIsEditing(true);
  };

  const handlePreview = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;
    setSaving(true);
    const { error } = await supabase.from('email_templates').update({
      subject: editForm.subject, html_content: editForm.html_content, is_active: editForm.is_active,
    }).eq('id', selectedTemplate.id);
    if (error) toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Template salvo!' }); fetchTemplates(); setSelectedTemplate(null); }
    setSaving(false);
  };

  const handleToggleActive = async (template: EmailTemplate) => {
    const { error } = await supabase.from('email_templates').update({ is_active: !template.is_active }).eq('id', template.id);
    if (!error) fetchTemplates();
  };

  const getPreviewHtml = (html: string) => {
    return html
      .replace(/\{\{full_name\}\}/g, 'João da Silva')
      .replace(/\{\{dashboard_url\}\}/g, window.location.origin + import.meta.env.BASE_URL + 'dashboard')
      .replace(/\{\{course_title\}\}/g, 'Estudo Sistematizado da Doutrina Espírita')
      .replace(/\{\{course_url\}\}/g, window.location.origin + import.meta.env.BASE_URL + 'course/123')
      .replace(/\{\{lesson_title\}\}/g, 'Introdução ao Espiritismo');
  };

  const getCampaignPreviewHtml = (campaign: EmailCampaign) => {
    return `<!DOCTYPE html><html><head><meta charset="utf-8">
      <style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333;margin:0;padding:0;}
      .container{max-width:600px;margin:0 auto;padding:20px;}
      .header{background:linear-gradient(135deg,#0d9488,#0891b2);color:white;padding:30px;text-align:center;border-radius:8px 8px 0 0;}
      .content{background:#f9fafb;padding:30px;border-radius:0 0 8px 8px;}
      .footer{text-align:center;margin-top:20px;color:#6b7280;font-size:12px;}</style></head>
      <body><div class="container">
        <div class="header"><h1 style="margin:0;">✉️ ${campaign.subject}</h1></div>
        <div class="content">${campaign.html_content}</div>
        <div class="footer"><p>Área de Formação - Lar de Seu Luiz</p></div>
      </div></body></html>`;
  };

  const getStatusBadge = (campaign: EmailCampaign) => {
    if (campaign.status === 'sent') return <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300">Enviado</Badge>;
    if (campaign.status === 'partial') return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">Parcial</Badge>;
    return <Badge variant="destructive">Falhou</Badge>;
  };

  return (
    <DashboardLayout>
      <CabecalhoPagina titulo="Comunicação" descricao="Envie e-mails e gerencie templates de comunicação" />
      <div className="space-y-6">
        {/* Daily Usage Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <span className="font-semibold">Consumo Diário de E-mails</span>
              </div>
              <Button variant="ghost" size="sm" onClick={fetchDailyUsage}>
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">{dailyUsage.sent} de {dailyUsage.limit} enviados hoje</span>
                  <span className="font-medium">{Math.round((dailyUsage.sent / dailyUsage.limit) * 100)}%</span>
                </div>
                <Progress value={(dailyUsage.sent / dailyUsage.limit) * 100} className="h-2" />
              </div>
              {dailyUsage.queued > 0 && (
                <Badge variant="outline" className="flex items-center gap-1 shrink-0">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {dailyUsage.queued} na fila
                </Badge>
              )}
              {dailyUsage.sent >= dailyUsage.limit && (
                <Badge variant="destructive" className="flex items-center gap-1 shrink-0">
                  <AlertTriangle className="h-3 w-3" />
                  Limite atingido
                </Badge>
              )}
            </div>
            {dailyUsage.queued > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Os e-mails na fila serão enviados automaticamente a cada hora, respeitando o limite diário.
              </p>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="compose" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="compose" className="gap-2"><Send className="h-4 w-4" />Compor E-mail</TabsTrigger>
            <TabsTrigger value="history" className="gap-2"><History className="h-4 w-4" />Histórico</TabsTrigger>
            <TabsTrigger value="templates" className="gap-2"><Mail className="h-4 w-4" />Templates</TabsTrigger>
          </TabsList>

          {/* COMPOSE TAB */}
          <TabsContent value="compose" className="space-y-6">
            {/* Variables reference */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Variable className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">Variáveis disponíveis</span>
                  <span className="text-xs text-muted-foreground">(clique para copiar)</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {composeVariables.map(v => (
                    <Badge
                      key={v.key}
                      variant="outline"
                      className="text-xs font-mono cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => {
                        navigator.clipboard.writeText(v.key);
                        toast({ title: 'Copiado!', description: `${v.key} copiado para a área de transferência` });
                      }}
                    >
                      {v.key} <span className="ml-1 opacity-60">({v.label})</span>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Compose Form */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="font-['Playfair_Display'] text-lg flex items-center gap-2">
                        <Send className="h-5 w-5 text-primary" />
                        Compor E-mail
                      </CardTitle>
                      <Tabs value={composeMode} onValueChange={(v) => setComposeMode(v as 'rich' | 'html')}>
                        <TabsList className="h-8">
                          <TabsTrigger value="rich" className="h-6 text-xs">Editor Rico</TabsTrigger>
                          <TabsTrigger value="html" className="h-6 text-xs"><Code className="h-3 w-3 mr-1" />HTML</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Assunto</Label>
                      <Input
                        placeholder="Assunto do e-mail..."
                        value={composeSubject}
                        onChange={(e) => setComposeSubject(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Corpo do E-mail</Label>
                      {composeMode === 'rich' ? (
                        <RichTextEditor value={composeBody} onChange={setComposeBody} placeholder="Escreva o conteúdo do e-mail..." />
                      ) : (
                        <Textarea
                          value={composeBody}
                          onChange={(e) => setComposeBody(e.target.value)}
                          className="font-mono text-xs min-h-[200px]"
                          placeholder="<p>Olá, {{first_name}}!</p>"
                        />
                      )}
                    </div>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <p className="text-sm text-muted-foreground">
                          <Users className="h-4 w-4 inline mr-1" />
                          {selectedRecipients.size} destinatário(s)
                        </p>
                        <Button variant="outline" size="sm" onClick={() => setShowPreview(true)} disabled={!composeBody.trim()}>
                          <Eye className="h-4 w-4 mr-1" />Preview
                        </Button>
                      </div>
                      <Button onClick={handleSendEmail} disabled={sending || selectedRecipients.size === 0}>
                        <Send className="h-4 w-4 mr-2" />
                        {sending ? 'Enviando...' : 'Enviar'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right: Recipients */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-['Playfair_Display'] text-lg flex items-center gap-2">
                    <Filter className="h-5 w-5 text-primary" />
                    Destinatários
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Buscar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
                    </div>
                    <Select value={filterCourse} onValueChange={setFilterCourse}>
                      <SelectTrigger><SelectValue placeholder="Curso" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os cursos</SelectItem>
                        {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={filterUserType} onValueChange={setFilterUserType}>
                      <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os tipos</SelectItem>
                        <SelectItem value="frequentador">Frequentador</SelectItem>
                        <SelectItem value="trabalhador">Trabalhador</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="active">Ativos</SelectItem>
                        <SelectItem value="inactive">Inativos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <div className="flex items-center gap-2">
                      <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
                      <span className="text-sm font-medium">Selecionar todos</span>
                    </div>
                    <Badge variant="outline" className="bg-muted text-muted-foreground border-border">{filteredStudents.length} aluno(s)</Badge>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto space-y-1">
                    {loadingStudents ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
                    ) : filteredStudents.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Nenhum aluno encontrado</p>
                    ) : (
                      filteredStudents.map((student) => (
                        <div
                          key={student.id}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                            selectedRecipients.has(student.id) ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted/50'
                          }`}
                          onClick={() => toggleSelect(student.id)}
                        >
                          <Checkbox checked={selectedRecipients.has(student.id)} onCheckedChange={() => toggleSelect(student.id)} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{student.full_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                          </div>
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {student.user_type === 'trabalhador' ? 'Trab.' : 'Freq.'}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Email Preview Dialog */}
            <Dialog open={showPreview} onOpenChange={setShowPreview}>
              <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Preview do E-mail
                  </DialogTitle>
                </DialogHeader>
                <div className="text-sm text-muted-foreground mb-2">
                  Visualização com dados do primeiro destinatário selecionado. As variáveis serão personalizadas para cada aluno.
                </div>
                <div className="flex-1 overflow-hidden border rounded-lg bg-white">
                  <iframe
                    srcDoc={getComposePreviewHtml()}
                    className="w-full h-[500px]"
                    title="Preview do e-mail"
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowPreview(false)}><X className="h-4 w-4 mr-2" />Fechar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* HISTORY TAB */}
          <TabsContent value="history" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Campanhas Enviadas
              </h2>
              <Button variant="outline" size="sm" onClick={fetchCampaigns}>
                <RefreshCw className="h-4 w-4 mr-1" />Atualizar
              </Button>
            </div>

            {loadingCampaigns ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4"><div className="h-16 bg-muted rounded" /></CardContent>
                  </Card>
                ))}
              </div>
            ) : campaigns.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhuma campanha enviada ainda.</p>
                  <p className="text-sm text-muted-foreground mt-1">Componha e envie seu primeiro e-mail na aba "Compor E-mail".</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {campaigns.map((campaign) => (
                  <Card key={campaign.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getStatusBadge(campaign)}
                            <h3 className="font-semibold truncate">{campaign.subject}</h3>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(campaign.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {campaign.recipients_count} destinatário(s)
                            </span>
                            <span className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3 text-emerald-600" />
                              {campaign.sent_count} enviado(s)
                            </span>
                            {campaign.failed_count > 0 && (
                              <span className="flex items-center gap-1 text-destructive">
                                <X className="h-3 w-3" />
                                {campaign.failed_count} falha(s)
                              </span>
                            )}
                          </div>
                          {campaign.recipient_names.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              Para: {campaign.recipient_names.slice(0, 5).join(', ')}
                              {campaign.recipient_names.length > 5 && ` e mais ${campaign.recipient_names.length - 5}`}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPreviewCampaign(campaign)}
                          >
                            <Eye className="h-4 w-4 mr-1" />Ver
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResendCampaign(campaign)}
                            disabled={resending === campaign.id}
                          >
                            <RefreshCw className={`h-4 w-4 mr-1 ${resending === campaign.id ? 'animate-spin' : ''}`} />
                            {resending === campaign.id ? 'Reenviando...' : 'Reenviar'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Campaign Preview Dialog */}
            <Dialog open={!!previewCampaign} onOpenChange={() => setPreviewCampaign(null)}>
              <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    {previewCampaign?.subject}
                  </DialogTitle>
                </DialogHeader>
                <div className="text-sm text-muted-foreground mb-2">
                  Enviado em {previewCampaign && format(new Date(previewCampaign.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} para {previewCampaign?.recipients_count} destinatário(s)
                </div>
                <div className="flex-1 overflow-hidden border rounded-lg bg-white">
                  {previewCampaign && (
                    <iframe
                      srcDoc={getCampaignPreviewHtml(previewCampaign)}
                      className="w-full h-[500px]"
                      title="Preview da campanha"
                    />
                  )}
                </div>
                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => setPreviewCampaign(null)}>
                    <X className="h-4 w-4 mr-2" />Fechar
                  </Button>
                  {previewCampaign && (
                    <Button onClick={() => { handleResendCampaign(previewCampaign); setPreviewCampaign(null); }}>
                      <RefreshCw className="h-4 w-4 mr-2" />Reenviar
                    </Button>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* TEMPLATES TAB */}
          <TabsContent value="templates">
            {loadingTemplates ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader><div className="h-6 bg-muted rounded w-3/4" /></CardHeader>
                    <CardContent><div className="h-20 bg-muted rounded" /></CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map((template) => (
                  <Card key={template.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                            <Mail className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="font-['Playfair_Display'] text-lg">{template.name}</CardTitle>
                            <Badge variant={template.is_active ? 'default' : 'secondary'} className="mt-1">
                              {template.is_active ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </div>
                        </div>
                        <Switch checked={template.is_active} onCheckedChange={() => handleToggleActive(template)} />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Assunto</Label>
                        <p className="text-sm font-medium truncate">{template.subject}</p>
                      </div>
                      {template.variables?.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground flex items-center gap-1">
                            <Variable className="h-3 w-3" />Variáveis
                          </Label>
                          <div className="flex flex-wrap gap-1">
                            {template.variables.map((v) => (
                              <Badge key={v} variant="outline" className="text-xs font-mono">{v}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => handlePreview(template)}>
                          <Eye className="h-4 w-4 mr-2" />Visualizar
                        </Button>
                        <Button size="sm" className="flex-1" onClick={() => handleEdit(template)}>
                          <Edit className="h-4 w-4 mr-2" />Editar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Preview/Edit Dialog */}
        <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                {isEditing ? 'Editar Template' : 'Visualizar Template'}: {selectedTemplate?.name}
              </DialogTitle>
            </DialogHeader>
            {isEditing ? (
              <div className="flex-1 overflow-y-auto space-y-4">
                <div className="space-y-2">
                  <Label>Assunto do Email</Label>
                  <Input value={editForm.subject} onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })} />
                </div>
                {selectedTemplate?.variables?.length > 0 && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                      <Variable className="h-3 w-3" />Variáveis disponíveis
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {selectedTemplate.variables.map((v) => (
                        <Badge key={v} variant="outline" className="text-xs font-mono cursor-pointer hover:bg-primary hover:text-primary-foreground" onClick={() => navigator.clipboard.writeText(v)}>
                          {v}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Conteúdo HTML</Label>
                    <Tabs value={previewMode} onValueChange={(v) => setPreviewMode(v as 'code' | 'preview')}>
                      <TabsList className="h-8">
                        <TabsTrigger value="code" className="h-6 text-xs"><Code className="h-3 w-3 mr-1" />Código</TabsTrigger>
                        <TabsTrigger value="preview" className="h-6 text-xs"><Eye className="h-3 w-3 mr-1" />Preview</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                  {previewMode === 'code' ? (
                    <Textarea value={editForm.html_content} onChange={(e) => setEditForm({ ...editForm, html_content: e.target.value })} className="font-mono text-xs min-h-[400px]" />
                  ) : (
                    <div className="border rounded-lg overflow-hidden bg-white">
                      <iframe srcDoc={getPreviewHtml(editForm.html_content)} className="w-full h-[400px]" title="Preview" />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="is_active" checked={editForm.is_active} onCheckedChange={(checked) => setEditForm({ ...editForm, is_active: checked })} />
                  <Label htmlFor="is_active">Template ativo</Label>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Assunto</Label>
                  <p className="font-medium">{selectedTemplate?.subject}</p>
                </div>
                <div className="border rounded-lg overflow-hidden bg-white">
                  <iframe srcDoc={selectedTemplate ? getPreviewHtml(selectedTemplate.html_content) : ''} className="w-full h-[500px]" title="Preview" />
                </div>
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setSelectedTemplate(null)}><X className="h-4 w-4 mr-2" />Fechar</Button>
              {isEditing ? (
                <Button onClick={handleSave} disabled={saving}><Save className="h-4 w-4 mr-2" />{saving ? 'Salvando...' : 'Salvar'}</Button>
              ) : (
                <Button onClick={() => selectedTemplate && handleEdit(selectedTemplate)}><Edit className="h-4 w-4 mr-2" />Editar</Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}