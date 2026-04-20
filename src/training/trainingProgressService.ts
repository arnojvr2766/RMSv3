import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type {
  UserTrainingProgress,
  CourseProgress,
  ModuleProgress,
  LessonProgress,
  CompletionResult,
  Course,
} from './types';
import { allCourses } from './content/index';

const COL = 'trainingProgress';

function now() {
  return Date.now();
}

function emptyProgress(userId: string, userEmail: string): UserTrainingProgress {
  return { userId, userEmail, lastActivityAt: now(), courses: {} };
}

export const trainingProgressService = {
  // ── Read ────────────────────────────────────────────────────────────────

  async getUserProgress(userId: string, userEmail = ''): Promise<UserTrainingProgress> {
    const snap = await getDoc(doc(db, COL, userId));
    if (snap.exists()) return snap.data() as UserTrainingProgress;
    const empty = emptyProgress(userId, userEmail);
    await setDoc(doc(db, COL, userId), empty);
    return empty;
  },

  subscribeToProgress(userId: string, callback: (p: UserTrainingProgress) => void): Unsubscribe {
    return onSnapshot(doc(db, COL, userId), snap => {
      if (snap.exists()) callback(snap.data() as UserTrainingProgress);
    });
  },

  async getAllUsersProgress(): Promise<UserTrainingProgress[]> {
    const snap = await getDocs(collection(db, COL));
    return snap.docs.map(d => d.data() as UserTrainingProgress);
  },

  // ── Write ────────────────────────────────────────────────────────────────

  async startLesson(
    userId: string,
    userEmail: string,
    courseId: string,
    moduleId: string,
    lessonId: string
  ): Promise<void> {
    const progress = await this.getUserProgress(userId, userEmail);
    const t = now();

    const course: CourseProgress = progress.courses[courseId] ?? {
      courseId,
      startedAt: t,
      completedAt: null,
      modules: {},
    };

    const module_: ModuleProgress = course.modules[moduleId] ?? {
      moduleId,
      startedAt: t,
      completedAt: null,
      lessons: {},
    };

    if (!module_.lessons[lessonId]) {
      const lesson: LessonProgress = { lessonId, startedAt: t, completedAt: null };
      module_.lessons[lessonId] = lesson;
      course.modules[moduleId] = module_;
      progress.courses[courseId] = course;
      progress.lastActivityAt = t;
      await setDoc(doc(db, COL, userId), progress);
    }
  },

  async completeLesson(
    userId: string,
    userEmail: string,
    courseId: string,
    moduleId: string,
    lessonId: string
  ): Promise<CompletionResult> {
    const progress = await this.getUserProgress(userId, userEmail);
    const t = now();

    // Ensure path exists
    if (!progress.courses[courseId]) {
      progress.courses[courseId] = { courseId, startedAt: t, completedAt: null, modules: {} };
    }
    const course = progress.courses[courseId];

    if (!course.modules[moduleId]) {
      course.modules[moduleId] = { moduleId, startedAt: t, completedAt: null, lessons: {} };
    }
    const module_ = course.modules[moduleId];

    module_.lessons[lessonId] = { lessonId, startedAt: module_.lessons[lessonId]?.startedAt ?? t, completedAt: t };

    // Check module completion
    const courseObj = allCourses.find(c => c.id === courseId);
    const moduleObj = courseObj?.modules.find(m => m.id === moduleId);
    const moduleCompleted = !!moduleObj && moduleObj.lessons.every(l => !!module_.lessons[l.id]?.completedAt);
    if (moduleCompleted && !module_.completedAt) module_.completedAt = t;

    // Check course completion
    const courseCompleted = !!courseObj && courseObj.modules.every(m => {
      const mp = course.modules[m.id];
      return mp && m.lessons.every(l => !!mp.lessons[l.id]?.completedAt);
    });
    if (courseCompleted && !course.completedAt) course.completedAt = t;

    progress.lastActivityAt = t;
    await setDoc(doc(db, COL, userId), progress);
    return { moduleCompleted, courseCompleted };
  },

  // ── Compute helpers ──────────────────────────────────────────────────────

  computeCourseCompletion(progress: UserTrainingProgress | null, course: Course): number {
    if (!progress) return 0;
    const cp = progress.courses[course.id];
    if (!cp) return 0;
    const total = course.modules.reduce((s, m) => s + m.lessons.length, 0);
    if (total === 0) return 0;
    const done = course.modules.reduce((s, m) => {
      const mp = cp.modules[m.id];
      if (!mp) return s;
      return s + m.lessons.filter(l => !!mp.lessons[l.id]?.completedAt).length;
    }, 0);
    return Math.round((done / total) * 100);
  },

  isLessonComplete(progress: UserTrainingProgress | null, courseId: string, moduleId: string, lessonId: string): boolean {
    return !!progress?.courses[courseId]?.modules[moduleId]?.lessons[lessonId]?.completedAt;
  },

  isCourseComplete(progress: UserTrainingProgress | null, courseId: string): boolean {
    return !!progress?.courses[courseId]?.completedAt;
  },
};
