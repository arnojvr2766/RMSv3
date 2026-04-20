import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  GraduationCap,
  CheckCircle2,
  Circle,
  ChevronRight,
  ChevronDown,
  Search,
  Award,
  Users,
  Clock,
  ArrowLeft,
  FileText,
  Tag,
  Play,
  Lock,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useRole } from '../contexts/RoleContext';
import { trainingProgressService } from '../training/trainingProgressService';
import { allCourses, howToDocs } from '../training/content/index';
import type {
  Course,
  TrainingModule,
  Lesson,
  UserTrainingProgress,
  HowToDoc,
  ContentBlock,
  DocCategory,
} from '../training/types';

// ─── Content Block Renderer ──────────────────────────────────────────────────

function renderBlock(block: ContentBlock, idx: number): React.ReactElement {
  switch (block.type) {
    case 'heading':
      return (
        <h3 key={idx} className="text-lg font-semibold text-gray-800 mt-6 mb-2">
          {block.content}
        </h3>
      );
    case 'paragraph':
      return (
        <p key={idx} className="text-gray-700 leading-relaxed mb-4">
          {block.content}
        </p>
      );
    case 'tip':
      return (
        <div key={idx} className="bg-blue-50 border-l-4 border-blue-400 rounded-r-lg p-4 mb-4">
          <p className="text-sm font-medium text-blue-800 mb-1">💡 Tip</p>
          <p className="text-sm text-blue-700">{block.content}</p>
        </div>
      );
    case 'warning':
      return (
        <div key={idx} className="bg-amber-50 border-l-4 border-amber-400 rounded-r-lg p-4 mb-4">
          <p className="text-sm font-medium text-amber-800 mb-1">⚠️ Important</p>
          <p className="text-sm text-amber-700">{block.content}</p>
        </div>
      );
    case 'note':
      return (
        <div key={idx} className="bg-gray-50 border-l-4 border-gray-400 rounded-r-lg p-4 mb-4">
          <p className="text-sm font-medium text-gray-700 mb-1">📝 Note</p>
          <p className="text-sm text-gray-600">{block.content}</p>
        </div>
      );
    case 'numbered_steps':
      return (
        <ol key={idx} className="list-none space-y-3 mb-4">
          {block.items?.map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-indigo-600 text-white rounded-full text-xs font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <span className="text-gray-700 text-sm leading-relaxed">{item}</span>
            </li>
          ))}
        </ol>
      );
    case 'checklist':
      return (
        <ul key={idx} className="list-none space-y-2 mb-4">
          {block.items?.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <CheckCircle2 size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    case 'key_term':
      return (
        <div key={idx} className="border border-indigo-200 rounded-lg p-4 mb-4 bg-indigo-50">
          <span className="inline-block text-xs font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded mb-2">
            KEY TERM
          </span>
          <p className="font-semibold text-gray-800 mb-1">{block.term}</p>
          <p className="text-sm text-gray-700">{block.content}</p>
        </div>
      );
    case 'divider':
      return <hr key={idx} className="my-6 border-gray-200" />;
    default:
      return <p key={idx} className="text-gray-700 mb-4">{block.content}</p>;
  }
}

// ─── Lesson Viewer ───────────────────────────────────────────────────────────

interface LessonViewerProps {
  course: Course;
  module: TrainingModule;
  lesson: Lesson;
  isComplete: boolean;
  onComplete: () => void;
  onBack: () => void;
}

function LessonViewer({ course, module, lesson, isComplete, onComplete, onBack }: LessonViewerProps) {
  const [completing, setCompleting] = useState(false);

  async function handleComplete() {
    if (isComplete) return;
    setCompleting(true);
    await onComplete();
    setCompleting(false);
  }

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft size={16} /> Back to {course.title}
      </button>

      {/* Breadcrumb */}
      <div className="text-xs text-gray-400 mb-2">
        {course.title} › {module.title}
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{lesson.title}</h1>
            <p className="text-gray-500 text-sm mb-3">{lesson.objective}</p>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <Clock size={12} /> {lesson.estimatedMinutes} min read
              </span>
            </div>
          </div>
          {isComplete && (
            <div className="flex items-center gap-1 text-green-600 bg-green-50 px-3 py-1.5 rounded-full text-sm font-medium flex-shrink-0">
              <CheckCircle2 size={16} /> Completed
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
        {lesson.blocks.map((block, i) => renderBlock(block, i))}
      </div>

      {/* Complete button */}
      {!isComplete && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm text-center">
          <p className="text-gray-600 mb-4 text-sm">
            Ready to mark this lesson as complete?
          </p>
          <button
            onClick={handleComplete}
            disabled={completing}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-8 py-3 rounded-lg font-medium transition-colors"
          >
            {completing ? 'Saving…' : 'Mark as Complete ✓'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Course Detail ───────────────────────────────────────────────────────────

interface CourseDetailProps {
  course: Course;
  progress: UserTrainingProgress | null;
  onSelectLesson: (module: TrainingModule, lesson: Lesson) => void;
  onBack: () => void;
}

function CourseDetail({ course, progress, onSelectLesson, onBack }: CourseDetailProps) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set([course.modules[0]?.id]));
  const completion = trainingProgressService.computeCourseCompletion(progress, course);
  const isCourseComplete = trainingProgressService.isCourseComplete(progress, course.id);

  function toggleModule(moduleId: string) {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  }

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft size={16} /> Back to Courses
      </button>

      {/* Course header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{course.title}</h1>
            <p className="text-gray-500 text-sm mb-4">{course.description}</p>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Clock size={14} /> {course.estimatedHours}h estimated
              </span>
              <span className="flex items-center gap-1">
                <BookOpen size={14} /> {course.modules.length} modules
              </span>
              <span className="flex items-center gap-1">
                <Award size={14} /> {course.certificateTitle}
              </span>
            </div>
          </div>
          {isCourseComplete && (
            <div className="flex-shrink-0 text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-1">
                <Award size={32} className="text-yellow-600" />
              </div>
              <p className="text-xs text-yellow-700 font-medium">Certified!</p>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-5">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Progress</span>
            <span className="font-semibold text-gray-800">{completion}%</span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${completion}%` }}
            />
          </div>
        </div>
      </div>

      {/* Modules */}
      <div className="space-y-3">
        {course.modules.map((mod, mIdx) => {
          const isExpanded = expandedModules.has(mod.id);
          const completedLessons = mod.lessons.filter(l =>
            trainingProgressService.isLessonComplete(progress, course.id, mod.id, l.id)
          ).length;
          const isModComplete = completedLessons === mod.lessons.length;

          return (
            <div key={mod.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <button
                onClick={() => toggleModule(mod.id)}
                className="w-full flex items-center gap-4 p-5 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {mIdx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-gray-800">{mod.title}</span>
                    {isModComplete && <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{mod.description}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-gray-400">{completedLessons}/{mod.lessons.length}</span>
                  {isExpanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-gray-100">
                  {mod.lessons.map((lesson, lIdx) => {
                    const lessonComplete = trainingProgressService.isLessonComplete(progress, course.id, mod.id, lesson.id);
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => onSelectLesson(mod, lesson)}
                        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-b-0"
                      >
                        <div className="flex-shrink-0 ml-8">
                          {lessonComplete ? (
                            <CheckCircle2 size={20} className="text-green-500" />
                          ) : (
                            <Circle size={20} className="text-gray-300" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${lessonComplete ? 'text-gray-500' : 'text-gray-800'}`}>
                            {lIdx + 1}. {lesson.title}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">{lesson.objective}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock size={11} /> {lesson.estimatedMinutes}m
                          </span>
                          <ChevronRight size={14} className="text-gray-400" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Course Catalog ───────────────────────────────────────────────────────────

interface CourseCatalogProps {
  progress: UserTrainingProgress | null;
  onSelectCourse: (course: Course) => void;
  userRole: string;
}

function CourseCatalog({ progress, onSelectCourse, userRole }: CourseCatalogProps) {
  const visibleCourses = allCourses.filter(c => {
    if (c.track === 'both') return true;
    if (c.track === 'system_admin') return userRole === 'system_admin';
    if (c.track === 'standard_user') return userRole !== 'system_admin';
    return true;
  });

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Training Courses</h2>
        <p className="text-gray-500">
          Complete these courses to get certified and master RentDesk for your role.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {visibleCourses.map(course => {
          const completion = trainingProgressService.computeCourseCompletion(progress, course);
          const isCourseComplete = trainingProgressService.isCourseComplete(progress, course.id);
          const totalLessons = course.modules.reduce((s, m) => s + m.lessons.length, 0);

          return (
            <div
              key={course.id}
              onClick={() => onSelectCourse(course)}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 cursor-pointer hover:shadow-md hover:border-indigo-300 transition-all group"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                  <GraduationCap size={24} className="text-indigo-700" />
                </div>
                {isCourseComplete ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full">
                    <Award size={12} /> Certified
                  </span>
                ) : completion > 0 ? (
                  <span className="text-xs font-medium text-indigo-700 bg-indigo-50 px-2 py-1 rounded-full">
                    {completion}% complete
                  </span>
                ) : null}
              </div>

              <h3 className="font-bold text-gray-900 text-lg mb-2 group-hover:text-indigo-700 transition-colors">
                {course.title}
              </h3>
              <p className="text-sm text-gray-500 mb-4 line-clamp-2">{course.description}</p>

              <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
                <span className="flex items-center gap-1"><Clock size={12} /> {course.estimatedHours}h</span>
                <span className="flex items-center gap-1"><BookOpen size={12} /> {totalLessons} lessons</span>
              </div>

              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${completion}%` }}
                />
              </div>

              {completion === 0 && (
                <p className="text-xs text-gray-400 mt-2">Not started</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── How-To Docs ─────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<DocCategory, string> = {
  facilities_rooms: 'Facilities & Rooms',
  renters_leases: 'Renters & Leases',
  payments: 'Payments',
  admin_approvals: 'Admin & Approvals',
  maintenance_penalties: 'Maintenance & Penalties',
  system_settings: 'System Settings',
  reports: 'Reports',
};

const CATEGORY_ORDER: DocCategory[] = [
  'facilities_rooms',
  'renters_leases',
  'payments',
  'admin_approvals',
  'maintenance_penalties',
  'system_settings',
  'reports',
];

function HowToDocs({ userRole }: { userRole: string }) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DocCategory | 'all'>('all');
  const [openDoc, setOpenDoc] = useState<HowToDoc | null>(null);

  const filteredDocs = useMemo(() => {
    return howToDocs.filter(doc => {
      const roleMatch =
        doc.roles === 'both' ||
        (doc.roles === 'system_admin' && userRole === 'system_admin') ||
        (doc.roles === 'standard_user' && userRole !== 'system_admin');

      const catMatch = selectedCategory === 'all' || doc.category === selectedCategory;

      const q = search.toLowerCase();
      const textMatch =
        !q ||
        doc.title.toLowerCase().includes(q) ||
        doc.summary.toLowerCase().includes(q) ||
        doc.tags.some(t => t.toLowerCase().includes(q));

      return roleMatch && catMatch && textMatch;
    });
  }, [search, selectedCategory, userRole]);

  const grouped = useMemo(() => {
    const map: Partial<Record<DocCategory, HowToDoc[]>> = {};
    filteredDocs.forEach(d => {
      if (!map[d.category]) map[d.category] = [];
      map[d.category]!.push(d);
    });
    return map;
  }, [filteredDocs]);

  if (openDoc) {
    return (
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => setOpenDoc(null)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <ArrowLeft size={16} /> Back to Reference Docs
        </button>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="mb-2">
            <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
              {CATEGORY_LABELS[openDoc.category]}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{openDoc.title}</h1>
          <p className="text-gray-500 text-sm mb-6">{openDoc.summary}</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {openDoc.tags.map(tag => (
              <span key={tag} className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                <Tag size={10} /> {tag}
              </span>
            ))}
          </div>
          <hr className="mb-6" />
          {openDoc.blocks.map((block, i) => renderBlock(block, i))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Reference Docs</h2>
        <p className="text-gray-500">Step-by-step guides for every task in RentDesk.</p>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search guides…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value as DocCategory | 'all')}
          className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
        >
          <option value="all">All Categories</option>
          {CATEGORY_ORDER.map(cat => (
            <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
          ))}
        </select>
      </div>

      {filteredDocs.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <FileText size={40} className="mx-auto mb-3 opacity-30" />
          <p>No guides match your search.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {CATEGORY_ORDER.filter(cat => grouped[cat]?.length).map(cat => (
            <div key={cat}>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                {CATEGORY_LABELS[cat]}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {grouped[cat]!.map(doc => (
                  <button
                    key={doc.id}
                    onClick={() => setOpenDoc(doc)}
                    className="text-left bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md hover:border-indigo-300 transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      <FileText size={16} className="text-indigo-500 flex-shrink-0 mt-0.5 group-hover:text-indigo-700" />
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 text-sm group-hover:text-indigo-700 transition-colors leading-snug">
                          {doc.title}
                        </p>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{doc.summary}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Admin Progress View ──────────────────────────────────────────────────────

function AdminProgressView() {
  const [allProgress, setAllProgress] = useState<UserTrainingProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    trainingProgressService.getAllUsersProgress().then(data => {
      setAllProgress(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Team Training Progress</h2>
        <p className="text-gray-500">Track completion across all staff members.</p>
      </div>

      {allProgress.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Users size={40} className="mx-auto mb-3 opacity-30" />
          <p>No training records yet. Staff members will appear here once they start a course.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {allProgress
            .sort((a, b) => b.lastActivityAt - a.lastActivityAt)
            .map(up => (
              <div key={up.userId} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div>
                    <p className="font-semibold text-gray-800">{up.userEmail}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Last active: {new Date(up.lastActivityAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">{Object.keys(up.courses).length} course{Object.keys(up.courses).length !== 1 ? 's' : ''} started</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {allCourses.map(course => {
                    const pct = trainingProgressService.computeCourseCompletion(up, course);
                    const complete = trainingProgressService.isCourseComplete(up, course.id);
                    const started = pct > 0;

                    return (
                      <div key={course.id}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className={`${started ? 'text-gray-700' : 'text-gray-400'}`}>{course.title}</span>
                          <span className="flex items-center gap-2">
                            {complete ? (
                              <span className="flex items-center gap-1 text-xs text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">
                                <Award size={11} /> Certified
                              </span>
                            ) : started ? (
                              <span className="text-xs text-indigo-600 font-medium">{pct}%</span>
                            ) : (
                              <span className="text-xs text-gray-400">Not started</span>
                            )}
                          </span>
                        </div>
                        {started && (
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${complete ? 'bg-yellow-400' : 'bg-indigo-400'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Training Page ───────────────────────────────────────────────────────

type Tab = 'courses' | 'docs' | 'admin';
type View = 'catalog' | 'course' | 'lesson';

export default function Training() {
  const { user } = useAuth();
  const { currentRole: role } = useRole();

  const [activeTab, setActiveTab] = useState<Tab>('courses');
  const [view, setView] = useState<View>('catalog');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedModule, setSelectedModule] = useState<TrainingModule | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [progress, setProgress] = useState<UserTrainingProgress | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = trainingProgressService.subscribeToProgress(user.uid, setProgress);
    // Load initial (create doc if missing)
    trainingProgressService.getUserProgress(user.uid, user.email || '').then(setProgress);
    return unsub;
  }, [user]);

  async function handleSelectLesson(mod: TrainingModule, lesson: Lesson) {
    if (!user || !selectedCourse) return;
    setSelectedModule(mod);
    setSelectedLesson(lesson);
    setView('lesson');
    // Mark as started
    await trainingProgressService.startLesson(
      user.uid,
      user.email || '',
      selectedCourse.id,
      mod.id,
      lesson.id
    );
  }

  async function handleCompleteLesson() {
    if (!user || !selectedCourse || !selectedModule || !selectedLesson) return;
    await trainingProgressService.completeLesson(
      user.uid,
      user.email || '',
      selectedCourse.id,
      selectedModule.id,
      selectedLesson.id
    );
  }

  function handleSelectCourse(course: Course) {
    setSelectedCourse(course);
    setView('course');
  }

  const isCurrentLessonComplete =
    !!progress && !!selectedCourse && !!selectedModule && !!selectedLesson &&
    trainingProgressService.isLessonComplete(progress, selectedCourse.id, selectedModule.id, selectedLesson.id);

  // Overall completion for header
  const totalLessons = allCourses.reduce((s, c) => s + c.modules.reduce((ss, m) => ss + m.lessons.length, 0), 0);
  const completedLessons = allCourses.reduce((s, c) => {
    const cp = progress?.courses[c.id];
    if (!cp) return s;
    return s + c.modules.reduce((ss, m) => {
      const mp = cp.modules[m.id];
      if (!mp) return ss;
      return ss + m.lessons.filter(l => !!mp.lessons[l.id]?.completedAt).length;
    }, 0);
  }, 0);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'courses', label: 'My Courses', icon: <GraduationCap size={16} /> },
    { id: 'docs', label: 'Reference Docs', icon: <FileText size={16} /> },
    ...(role === 'system_admin' ? [{ id: 'admin' as Tab, label: 'Team Progress', icon: <BarChart3 size={16} /> }] : []),
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <GraduationCap size={28} className="text-indigo-600" />
              Training Center
            </h1>
            <p className="text-gray-500 text-sm mt-1">Learn how to use RentDesk effectively.</p>
          </div>
          {completedLessons > 0 && (
            <div className="bg-indigo-50 rounded-xl px-4 py-3 text-center">
              <p className="text-2xl font-bold text-indigo-700">{completedLessons}<span className="text-base font-normal text-indigo-400">/{totalLessons}</span></p>
              <p className="text-xs text-indigo-600">lessons complete</p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="max-w-5xl mx-auto mt-4 flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === 'courses') setView('catalog');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {activeTab === 'courses' && (
          <>
            {view === 'catalog' && (
              <CourseCatalog
                progress={progress}
                onSelectCourse={handleSelectCourse}
                userRole={role || 'standard_user'}
              />
            )}
            {view === 'course' && selectedCourse && (
              <CourseDetail
                course={selectedCourse}
                progress={progress}
                onSelectLesson={handleSelectLesson}
                onBack={() => setView('catalog')}
              />
            )}
            {view === 'lesson' && selectedCourse && selectedModule && selectedLesson && (
              <LessonViewer
                course={selectedCourse}
                module={selectedModule}
                lesson={selectedLesson}
                isComplete={isCurrentLessonComplete}
                onComplete={handleCompleteLesson}
                onBack={() => setView('course')}
              />
            )}
          </>
        )}
        {activeTab === 'docs' && <HowToDocs userRole={role || 'standard_user'} />}
        {activeTab === 'admin' && role === 'system_admin' && <AdminProgressView />}
      </div>
    </div>
  );
}
