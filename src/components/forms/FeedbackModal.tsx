import React, { useState } from 'react';
import { X, Bug, Sparkles, MessageSquare, ChevronRight, CheckCircle, AlertTriangle, Zap, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { feedbackService, type FeedbackType, type BugSeverity, type FeaturePriority } from '../../services/feedbackService';

interface FeedbackModalProps {
  onClose: () => void;
}

// ─── Step 1: Type chooser ─────────────────────────────────────────────────────

const TYPES = [
  {
    id: 'bug' as FeedbackType,
    icon: Bug,
    label: 'Bug Report',
    description: 'Something is broken or not working as expected',
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/30 hover:border-red-500/60',
    activeBg: 'bg-red-500/20 border-red-500',
  },
  {
    id: 'feature' as FeedbackType,
    icon: Sparkles,
    label: 'Feature Request',
    description: 'Suggest a new feature or improvement to the system',
    color: 'text-primary-400',
    bg: 'bg-primary-500/10 border-primary-500/30 hover:border-primary-500/60',
    activeBg: 'bg-primary-500/20 border-primary-500',
  },
  {
    id: 'feedback' as FeedbackType,
    icon: MessageSquare,
    label: 'General Feedback',
    description: 'Share general thoughts, praise, or concerns',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/30 hover:border-blue-500/60',
    activeBg: 'bg-blue-500/20 border-blue-500',
  },
];

const BUG_SEVERITIES: { id: BugSeverity; label: string; color: string; desc: string }[] = [
  { id: 'low',      label: 'Low',      color: 'text-gray-400',   desc: 'Minor inconvenience, workaround exists' },
  { id: 'medium',   label: 'Medium',   color: 'text-yellow-400', desc: 'Affects workflow but system still usable' },
  { id: 'high',     label: 'High',     color: 'text-orange-400', desc: 'Significant impact, no easy workaround' },
  { id: 'critical', label: 'Critical', color: 'text-red-400',    desc: 'System unusable or data at risk' },
];

const FEATURE_PRIORITIES: { id: FeaturePriority; label: string; color: string; desc: string }[] = [
  { id: 'nice-to-have',  label: 'Nice to Have',  color: 'text-gray-400',   desc: 'Would be great but not urgent' },
  { id: 'should-have',   label: 'Should Have',   color: 'text-blue-400',   desc: 'Would meaningfully improve our work' },
  { id: 'must-have',     label: 'Must Have',     color: 'text-primary-400', desc: 'Blocking us or critical to operations' },
];

// ─── Component ────────────────────────────────────────────────────────────────

const FeedbackModal: React.FC<FeedbackModalProps> = ({ onClose }) => {
  const { user } = useAuth();

  const [step, setStep] = useState<'type' | 'form' | 'success'>('type');
  const [type, setType] = useState<FeedbackType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [refId, setRefId] = useState('');

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [expectedBehavior, setExpectedBehavior] = useState('');
  const [stepsToReproduce, setStepsToReproduce] = useState('');
  const [severity, setSeverity] = useState<BugSeverity>('medium');
  const [useCase, setUseCase] = useState('');
  const [priority, setPriority] = useState<FeaturePriority>('should-have');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedType = TYPES.find(t => t.id === type);

  const handleSelectType = (t: FeedbackType) => {
    setType(t);
    setStep('form');
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = 'Please enter a title';
    if (!description.trim()) e.description = 'Please describe the issue';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !type) return;
    setSubmitting(true);
    try {
      const id = await feedbackService.submit({
        type,
        title: title.trim(),
        description: description.trim(),
        ...(type === 'bug' && {
          expectedBehavior: expectedBehavior.trim(),
          stepsToReproduce: stepsToReproduce.trim(),
          severity,
        }),
        ...(type === 'feature' && {
          useCase: useCase.trim(),
          priority,
        }),
        submittedBy: user?.uid || 'unknown',
        submitterEmail: user?.email || '',
        submitterName: user?.displayName || user?.email || 'Unknown',
        currentPage: window.location.pathname,
        userAgent: navigator.userAgent,
      });
      setRefId(id.slice(-8).toUpperCase());
      setStep('success');
    } catch {
      setErrors({ submit: 'Failed to submit. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            {step === 'form' && (
              <button
                onClick={() => setStep('type')}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h2 className="text-white font-bold text-base">
                {step === 'type'    && 'Send Feedback'}
                {step === 'form'    && selectedType?.label}
                {step === 'success' && 'Feedback Received'}
              </h2>
              <p className="text-gray-400 text-xs mt-0.5">
                {step === 'type'    && 'Help us improve RentDesk'}
                {step === 'form'    && selectedType?.description}
                {step === 'success' && `Reference #${refId}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Step 1: Type ── */}
        {step === 'type' && (
          <div className="p-6 space-y-3">
            {TYPES.map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => handleSelectType(t.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${t.bg}`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-gray-700/50 flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${t.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-semibold text-sm ${t.color}`}>{t.label}</div>
                    <div className="text-gray-400 text-xs mt-0.5">{t.description}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
                </button>
              );
            })}

            <p className="text-center text-xs text-gray-500 pt-2">
              Feedback is only visible to developers — not other users.
            </p>
          </div>
        )}

        {/* ── Step 2: Form ── */}
        {step === 'form' && type && (
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">

            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                {type === 'bug'     && 'What is broken?'}
                {type === 'feature' && 'Feature title'}
                {type === 'feedback'&& 'Subject'}
                <span className="text-red-400 ml-1">*</span>
              </label>
              <input
                value={title}
                onChange={e => { setTitle(e.target.value); setErrors(p => ({ ...p, title: '' })); }}
                placeholder={
                  type === 'bug'      ? 'e.g. Payment amount shows incorrect total' :
                  type === 'feature'  ? 'e.g. Bulk payment capture for multiple rooms' :
                  'e.g. Really enjoying the new payment flow'
                }
                className={`w-full bg-gray-700 border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors ${errors.title ? 'border-red-500' : 'border-gray-600'}`}
              />
              {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                {type === 'bug'     && 'What happened?'}
                {type === 'feature' && 'Describe the feature'}
                {type === 'feedback'&& 'Your feedback'}
                <span className="text-red-400 ml-1">*</span>
              </label>
              <textarea
                value={description}
                onChange={e => { setDescription(e.target.value); setErrors(p => ({ ...p, description: '' })); }}
                rows={3}
                placeholder={
                  type === 'bug'      ? 'Describe what went wrong in as much detail as possible…' :
                  type === 'feature'  ? 'Describe what you would like the feature to do…' :
                  'Share your thoughts…'
                }
                className={`w-full bg-gray-700 border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors resize-none ${errors.description ? 'border-red-500' : 'border-gray-600'}`}
              />
              {errors.description && <p className="text-red-400 text-xs mt-1">{errors.description}</p>}
            </div>

            {/* Bug-specific fields */}
            {type === 'bug' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">What did you expect to happen?</label>
                  <textarea
                    value={expectedBehavior}
                    onChange={e => setExpectedBehavior(e.target.value)}
                    rows={2}
                    placeholder="e.g. The total should show R1,500 not R0…"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">Steps to reproduce</label>
                  <textarea
                    value={stepsToReproduce}
                    onChange={e => setStepsToReproduce(e.target.value)}
                    rows={3}
                    placeholder={`1. Go to Payments\n2. Select a lease\n3. Enter amount…`}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-2">Severity</label>
                  <div className="grid grid-cols-2 gap-2">
                    {BUG_SEVERITIES.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSeverity(s.id)}
                        className={`text-left px-3 py-2.5 rounded-lg border transition-all ${
                          severity === s.id
                            ? 'border-primary-500 bg-primary-500/10'
                            : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                        }`}
                      >
                        <div className={`text-xs font-bold ${s.color}`}>{s.label}</div>
                        <div className="text-gray-500 text-xs mt-0.5">{s.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Feature-specific fields */}
            {type === 'feature' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">Why is this needed?</label>
                  <textarea
                    value={useCase}
                    onChange={e => setUseCase(e.target.value)}
                    rows={2}
                    placeholder="e.g. When we have 30 tenants paying on the same day, capturing one by one takes too long…"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-2">Priority</label>
                  <div className="space-y-2">
                    {FEATURE_PRIORITIES.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPriority(p.id)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all flex items-center gap-3 ${
                          priority === p.id
                            ? 'border-primary-500 bg-primary-500/10'
                            : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                        }`}
                      >
                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                          priority === p.id ? 'bg-primary-500' : 'bg-gray-600'
                        }`} />
                        <div>
                          <span className={`text-xs font-bold ${p.color}`}>{p.label}</span>
                          <span className="text-gray-500 text-xs ml-2">{p.desc}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Auto-captured context */}
            <div className="bg-gray-700/40 rounded-lg px-3 py-2.5 border border-gray-600/50">
              <p className="text-xs text-gray-500 mb-1 font-medium">Auto-captured with your report:</p>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500">
                <span>Page: <span className="text-gray-400">{window.location.pathname}</span></span>
                <span>User: <span className="text-gray-400">{user?.email}</span></span>
              </div>
            </div>

            {errors.submit && (
              <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {errors.submit}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setStep('type')}
                className="flex-1 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm font-medium transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 bg-primary-500 hover:bg-primary-400 disabled:opacity-50 text-gray-900 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4" />
                {submitting ? 'Sending…' : 'Submit'}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Success ── */}
        {step === 'success' && (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-9 h-9 text-green-400" />
            </div>
            <h3 className="text-white font-bold text-lg mb-2">Thank you!</h3>
            <p className="text-gray-400 text-sm mb-4">
              Your {type === 'bug' ? 'bug report' : type === 'feature' ? 'feature request' : 'feedback'} has been sent to the development team.
            </p>
            <div className="inline-block bg-gray-700 rounded-full px-4 py-1.5 mb-6">
              <span className="text-xs text-gray-400">Reference: </span>
              <span className="text-xs font-mono font-bold text-primary-400">#{refId}</span>
            </div>
            <p className="text-gray-500 text-xs mb-6">
              We review all submissions and prioritise based on impact. High-severity bugs are addressed first.
            </p>
            <button
              onClick={onClose}
              className="w-full px-4 py-2.5 bg-primary-500 hover:bg-primary-400 text-gray-900 rounded-lg text-sm font-bold transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackModal;
