import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, HelpCircle, Info, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "default" | "info" | "warning" | "danger" | "success";

type ConfirmOptions = {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: Tone;
  /** Exige que o usuário digite exatamente este texto para liberar a confirmação. */
  requireText?: string;
};

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

const toneStyles: Record<Tone, { ring: string; iconBg: string; iconColor: string; button: string; Icon: typeof AlertTriangle }> = {
  default: {
    ring: "",
    iconBg: "bg-muted",
    iconColor: "text-foreground",
    button: "",
    Icon: HelpCircle,
  },
  info: {
    ring: "",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-700",
    button: "bg-blue-600 text-white hover:bg-blue-700",
    Icon: Info,
  },
  warning: {
    ring: "",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-700",
    button: "bg-amber-600 text-white hover:bg-amber-700",
    Icon: AlertTriangle,
  },
  danger: {
    ring: "",
    iconBg: "bg-rose-100",
    iconColor: "text-rose-700",
    button: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    Icon: AlertTriangle,
  },
  success: {
    ring: "",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-700",
    button: "bg-emerald-600 text-white hover:bg-emerald-700",
    Icon: CheckCircle2,
  },
};

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const [resolver, setResolver] = useState<((v: boolean) => void) | null>(null);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (opts) setTyped("");
  }, [opts]);

  const confirm = useCallback<ConfirmFn>((o) => {
    return new Promise<boolean>((resolve) => {
      setOpts(o);
      setResolver(() => resolve);
    });
  }, []);

  const close = (value: boolean) => {
    resolver?.(value);
    setResolver(null);
    setOpts(null);
  };

  const tone = opts?.tone ?? "default";
  const styles = toneStyles[tone];
  const Icon = styles.Icon;
  const needsText = !!opts?.requireText;
  const textOk = !needsText || typed.trim().toLowerCase() === opts!.requireText!.trim().toLowerCase();

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog
        open={!!opts}
        onOpenChange={(open) => {
          if (!open && resolver) close(false);
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-start gap-3">
              <div className={cn("rounded-full p-2.5 shrink-0", styles.iconBg)}>
                <Icon className={cn("h-5 w-5", styles.iconColor)} />
              </div>
              <div className="flex-1 space-y-1.5">
                <AlertDialogTitle className="text-left text-base">
                  {opts?.title}
                </AlertDialogTitle>
                {opts?.description && (
                  <AlertDialogDescription className="text-left text-sm">
                    {opts.description}
                  </AlertDialogDescription>
                )}
              </div>
            </div>
          </AlertDialogHeader>
          {needsText && (
            <div className="space-y-1.5 pt-1">
              <Label htmlFor="confirm-typed" className="text-xs text-muted-foreground">
                Para confirmar, digite <span className="font-semibold text-foreground">{opts?.requireText}</span>
              </Label>
              <Input
                id="confirm-typed"
                autoComplete="off"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={opts?.requireText}
              />
            </div>
          )}
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel onClick={() => close(false)}>
              {opts?.cancelLabel ?? "Cancelar"}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={!textOk}
              onClick={(e) => {
                if (!textOk) {
                  e.preventDefault();
                  return;
                }
                close(true);
              }}
              className={cn(styles.button, !textOk && "pointer-events-none opacity-50")}
            >
              {opts?.confirmLabel ?? "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}
