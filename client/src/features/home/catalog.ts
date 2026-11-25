import type { IconName } from '../../components/ui/icons';

export const formatINR = (n: number) => '₹' + n.toLocaleString('en-IN');

export interface QuickQuestion {
  icon: IconName;
  /** Shown on the card and sent to the assistant exactly as written, so the answer appears in the chat, not on the card. */
  question: string;
}

/** The cards under the hero: the questions customers ask most about our service. */
export const QUICK_QUESTIONS: QuickQuestion[] = [
  { icon: 'truck', question: 'Is shipping free?' },
  { icon: 'undo', question: "What's your return policy?" },
  { icon: 'card', question: 'Is cash on delivery available?' },
  { icon: 'shield', question: 'What warranty do products have?' },
];

export const POPULAR_QUESTIONS = [
  'How long does delivery take?',
  'Do you deliver to Panipat?',
  'What if my item arrives damaged?',
  'How long does a refund take?',
  'Money was deducted but my payment failed',
  'Do you give a GST invoice?',
  'How do I reset my password?',
  'I want to speak to a human',
];
