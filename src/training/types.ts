// ─── Training Module Type Definitions ────────────────────────────────────────

export type ContentBlockType =
  | 'paragraph'
  | 'heading'
  | 'tip'
  | 'warning'
  | 'note'
  | 'checklist'
  | 'numbered_steps'
  | 'key_term'
  | 'divider';

export interface ContentBlock {
  type: ContentBlockType;
  content?: string;
  items?: string[];
  term?: string;
}

export interface Lesson {
  id: string;
  title: string;
  estimatedMinutes: number;
  objective: string;
  blocks: ContentBlock[];
}

export interface TrainingModule {
  id: string;
  title: string;
  description: string;
  icon: string;
  lessons: Lesson[];
}

export type CourseTrack = 'system_admin' | 'standard_user' | 'both';

export interface Course {
  id: string;
  title: string;
  description: string;
  track: CourseTrack;
  estimatedHours: number;
  certificateTitle: string;
  modules: TrainingModule[];
}

export type DocCategory =
  | 'facilities_rooms'
  | 'renters_leases'
  | 'payments'
  | 'admin_approvals'
  | 'maintenance_penalties'
  | 'system_settings'
  | 'reports';

export interface HowToDoc {
  id: string;
  title: string;
  category: DocCategory;
  summary: string;
  tags: string[];
  roles: CourseTrack;
  blocks: ContentBlock[];
}

// ── Firestore progress types ──────────────────────────────────────────────────

export interface LessonProgress {
  lessonId: string;
  startedAt: number; // epoch ms
  completedAt: number | null;
}

export interface ModuleProgress {
  moduleId: string;
  startedAt: number;
  completedAt: number | null;
  lessons: Record<string, LessonProgress>;
}

export interface CourseProgress {
  courseId: string;
  startedAt: number;
  completedAt: number | null;
  modules: Record<string, ModuleProgress>;
}

export interface UserTrainingProgress {
  userId: string;
  userEmail: string;
  lastActivityAt: number;
  courses: Record<string, CourseProgress>;
}

export interface CompletionResult {
  moduleCompleted: boolean;
  courseCompleted: boolean;
}
