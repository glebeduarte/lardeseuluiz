import { supabase } from '@/integrations/supabase/client';

/**
 * Get the active class_group for a course (first/default turma).
 */
export async function getClassGroupForCourse(courseId: string): Promise<string | null> {
  const { data } = await supabase
    .from('class_groups')
    .select('id')
    .eq('course_id', courseId)
    .order('created_at', { ascending: true })
    .limit(1)
    .single();
  return data?.id ?? null;
}

/**
 * Enroll a user in a course by finding the active turma and inserting the enrollment.
 */
export async function enrollUserInCourse(userId: string, courseId: string) {
  const classGroupId = await getClassGroupForCourse(courseId);
  if (!classGroupId) {
    return { error: { message: 'Turma não encontrada para este curso.' } };
  }
  const { error } = await supabase
    .from('enrollments')
    .insert({
      user_id: userId,
      course_id: courseId,
      class_group_id: classGroupId,
      status: 'approved',
    });
  return { error };
}
