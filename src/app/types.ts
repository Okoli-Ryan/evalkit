/** The domain of the "AI app" under test: support-ticket triage. */

export const CATEGORIES = [
  'billing',
  'technical',
  'account',
  'feature_request',
  'other',
] as const;
export type Category = (typeof CATEGORIES)[number];

export const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export type Priority = (typeof PRIORITIES)[number];

/** A raw customer support ticket, plus the hand-labeled "gold" answer. */
export interface Ticket {
  id: string;
  subject: string;
  body: string;
  /** Known-correct labels, used by the golden-dataset eval. */
  gold: {
    category: Category;
    priority: Priority;
    needs_human: boolean;
  };
}

/** What the model returns for a ticket — the structured triage decision. */
export interface Triage {
  category: string;
  priority: string;
  needs_human: boolean;
  suggested_reply: string;
}
