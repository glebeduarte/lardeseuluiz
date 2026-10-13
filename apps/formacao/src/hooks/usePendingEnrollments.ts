import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PendingEnrollment {
  id: string;
  user_id: string;
  course_id: string;
  created_at: string;
  user: {
    full_name: string;
    email: string;
  };
  course: {
    title: string;
  };
}

export function usePendingEnrollments() {
  const { user, isAdmin } = useAuth();
  const [pendingEnrollments, setPendingEnrollments] = useState<PendingEnrollment[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchPendingEnrollments = useCallback(async () => {
    if (!user || !isAdmin) {
      setPendingEnrollments([]);
      setPendingCount(0);
      setLoading(false);
      return;
    }

    const { data, count, error } = await supabase
      .from("enrollments")
      .select(
        `
        id,
        user_id,
        course_id,
        created_at,
        user:profiles!enrollments_user_id_fkey (
          full_name,
          email
        ),
        course:courses!enrollments_course_id_fkey (
          title
        )
      `,
        { count: "exact" }
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(10);

    if (!error && data) {
      setPendingEnrollments(data as unknown as PendingEnrollment[]);
      setPendingCount(count || 0);
    }
    setLoading(false);
  }, [user, isAdmin]);

  useEffect(() => {
    fetchPendingEnrollments();
  }, [fetchPendingEnrollments]);

  useEffect(() => {
    if (!user || !isAdmin) return;

    const channel = supabase
      .channel("pending-enrollments-count")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "enrollments",
        },
        () => {
          fetchPendingEnrollments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isAdmin, fetchPendingEnrollments]);

  return {
    pendingEnrollments,
    pendingCount,
    loading,
    refetch: fetchPendingEnrollments,
  };
}
