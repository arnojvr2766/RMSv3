import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export type FeedbackType = 'bug' | 'feature' | 'feedback';
export type BugSeverity = 'low' | 'medium' | 'high' | 'critical';
export type FeaturePriority = 'nice-to-have' | 'should-have' | 'must-have';

export interface FeedbackPayload {
  type: FeedbackType;
  title: string;
  description: string;
  // Bug fields
  expectedBehavior?: string;
  stepsToReproduce?: string;
  severity?: BugSeverity;
  // Feature fields
  useCase?: string;
  priority?: FeaturePriority;
  // Auto-captured
  submittedBy: string;
  submitterEmail: string;
  submitterName: string;
  currentPage: string;
  userAgent: string;
}

export const feedbackService = {
  async submit(payload: FeedbackPayload): Promise<string> {
    const doc = await addDoc(collection(db, 'feedback'), {
      ...payload,
      status: 'new',
      createdAt: Timestamp.now(),
    });
    return doc.id;
  },
};
