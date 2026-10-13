import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Notification sound - a pleasant chime
const NOTIFICATION_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

export function useAdminNotifications() {
  const { user, isAdmin } = useAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isInitialLoadRef = useRef(true);

  const playNotificationSound = useCallback(() => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
        audioRef.current.volume = 0.5;
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(console.error);
    } catch (error) {
      console.error("Error playing notification sound:", error);
    }
  }, []);

  const showNotification = useCallback(
    (title: string, description: string, type: "enrollment" | "user") => {
      playNotificationSound();

      toast(title, {
        description,
        duration: 8000,
        icon: type === "enrollment" ? "📋" : "👤",
        action: {
          label: type === "enrollment" ? "Ver Inscrições" : "Ver Alunos",
          onClick: () => {
            window.location.href =
              import.meta.env.BASE_URL + (type === "enrollment" ? "admin/enrollments" : "admin/students");
          },
        },
      });
    },
    [playNotificationSound]
  );

  useEffect(() => {
    if (!user || !isAdmin) return;

    // Reset initial load flag after a short delay
    const initialLoadTimer = setTimeout(() => {
      isInitialLoadRef.current = false;
    }, 3000);

    // Subscribe to new enrollment requests
    const enrollmentChannel = supabase
      .channel("admin-enrollment-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "enrollments",
        },
        async (payload) => {
          if (isInitialLoadRef.current) return;

          const enrollment = payload.new as {
            id: string;
            user_id: string;
            course_id: string;
            status: string;
          };

          // Only notify for pending enrollments
          if (enrollment.status !== "pending") return;

          // Fetch user and course details
          const [userResult, courseResult] = await Promise.all([
            supabase
              .from("profiles")
              .select("full_name, email")
              .eq("id", enrollment.user_id)
              .single(),
            supabase
              .from("courses")
              .select("title")
              .eq("id", enrollment.course_id)
              .single(),
          ]);

          const userName = userResult.data?.full_name || userResult.data?.email || "Usuário";
          const courseName = courseResult.data?.title || "Curso";

          showNotification(
            "Nova Solicitação de Inscrição",
            `${userName} solicitou inscrição no curso "${courseName}"`,
            "enrollment"
          );
        }
      )
      .subscribe();

    // Subscribe to new user registrations
    const profileChannel = supabase
      .channel("admin-profile-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "profiles",
        },
        (payload) => {
          if (isInitialLoadRef.current) return;

          const profile = payload.new as {
            id: string;
            full_name: string;
            email: string;
            role: string;
          };

          // Only notify for student registrations
          if (profile.role !== "student") return;

          showNotification(
            "Novo Usuário Cadastrado",
            `${profile.full_name || profile.email} se cadastrou na plataforma`,
            "user"
          );
        }
      )
      .subscribe();

    return () => {
      clearTimeout(initialLoadTimer);
      supabase.removeChannel(enrollmentChannel);
      supabase.removeChannel(profileChannel);
    };
  }, [user, isAdmin, showNotification]);

  return null;
}
