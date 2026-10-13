import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ClipboardList, UserPlus, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function NotificationBell() {
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);

  const handleNotificationClick = (notification: { id: string; type: string; is_read: boolean }) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    setOpen(false);
    
    if (notification.type === 'enrollment') {
      navigate('/admin/enrollments');
    } else {
      navigate('/admin/students');
    }
  };

  const getIcon = (type: string) => {
    if (type === 'enrollment') {
      return <ClipboardList className="h-4 w-4 text-warning" />;
    }
    return <UserPlus className="h-4 w-4 text-primary" />;
  };

  const getIconBg = (type: string) => {
    if (type === 'enrollment') {
      return 'bg-warning/20';
    }
    return 'bg-primary/20';
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 min-w-5 px-1.5 flex items-center justify-center bg-destructive text-destructive-foreground text-xs font-bold"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h4 className="font-semibold">Notificações</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto py-1 px-2 text-xs gap-1"
              onClick={markAllAsRead}
            >
              <CheckCheck className="h-3 w-3" />
              Marcar todas como lidas
            </Button>
          )}
        </div>
        
        <ScrollArea className="max-h-80">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted/50 rounded animate-pulse" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                Nenhuma notificação
              </p>
            </div>
          ) : (
            <div className="p-2">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg hover:bg-muted/50 transition-colors flex items-start gap-3",
                    !notification.is_read && "bg-primary/5"
                  )}
                >
                  <div className={cn(
                    "h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0",
                    getIconBg(notification.type)
                  )}>
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={cn(
                        "text-sm truncate",
                        !notification.is_read ? "font-semibold" : "font-medium"
                      )}>
                        {notification.title}
                      </p>
                      {!notification.is_read && (
                        <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {notification.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <div className="p-3 border-t border-border flex gap-2">
            <Button
              variant="ghost"
              className="flex-1 justify-center text-sm"
              onClick={() => {
                setOpen(false);
                navigate('/admin/enrollments');
              }}
            >
              Ver Inscrições
            </Button>
            <Button
              variant="ghost"
              className="flex-1 justify-center text-sm"
              onClick={() => {
                setOpen(false);
                navigate('/admin/students');
              }}
            >
              Ver Alunos
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
