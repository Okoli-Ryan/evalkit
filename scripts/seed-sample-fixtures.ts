/**
 * Seeds the labeled dataset and a set of *illustrative* replay fixtures so the
 * eval suite runs offline, with no API key, in CI.
 *
 * In a real project you would record fixtures from live runs
 * (`EVALKIT_MODE=record npm run eval`). These sample fixtures stand in for that
 * so the repo is runnable out of the box — a few of them intentionally contain
 * wrong answers so the dashboard shows failures and regressions.
 *
 *   npx tsx scripts/seed-sample-fixtures.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { Ticket, Triage } from '../src/app/types.js';
import { TRIAGE_SYSTEM, triageUserPrompt } from '../src/app/prompt.js';

const ROOT = fileURLToPath(new URL('../', import.meta.url));

interface Row {
  ticket: Ticket;
  triage: Triage; // what the model "returned"
  judge?: { score: number; rationale: string }; // omitted when assertions fail
}

function row(
  id: string,
  subject: string,
  body: string,
  gold: Ticket['gold'],
  triage: Triage,
  judge?: { score: number; rationale: string },
): Row {
  return { ticket: { id, subject, body, gold }, triage, judge };
}

const rows: Row[] = [
  row(
    'T-001',
    'Double charged for October',
    'I just noticed two identical charges of $49 on my card for October. I only have one subscription. Please refund the extra one.',
    { category: 'billing', priority: 'high', needs_human: true },
    {
      category: 'billing',
      priority: 'high',
      needs_human: true,
      suggested_reply:
        "Thanks for flagging this — a duplicate charge is never fun. I've escalated your account to our billing team to investigate the second $49 charge and arrange a refund. You'll hear back within one business day.",
    },
    {
      score: 5,
      rationale:
        'Acknowledges the issue, sets a clear expectation, promises nothing it cannot verify.',
    },
  ),
  row(
    'T-002',
    'How do I export my data?',
    'Is there a way to export all my records to CSV? I want a backup.',
    { category: 'technical', priority: 'low', needs_human: false },
    {
      category: 'technical',
      priority: 'low',
      needs_human: false,
      suggested_reply:
        'You can export everything from Settings → Data → Export, which produces a CSV of all your records. Let me know if the button is missing and I can enable it for your plan.',
    },
    { score: 5, rationale: 'Directly answers the how-to and offers a next step.' },
  ),
  row(
    'T-003',
    'Reset my password',
    "I can't remember my password and the reset email never arrives.",
    { category: 'account', priority: 'low', needs_human: false },
    {
      category: 'account',
      priority: 'low',
      needs_human: false,
      suggested_reply:
        "Sorry for the hassle. Please check your spam folder for the reset email from no-reply@example.com. If it's still missing after 10 minutes, reply here and I'll trigger a manual reset link.",
    },
    { score: 4, rationale: 'Helpful and safe, though slightly generic.' },
  ),
  row(
    'T-004',
    'Site is completely down',
    'The whole dashboard returns a blank page for everyone on my team since 10 minutes ago. Nothing loads.',
    { category: 'technical', priority: 'urgent', needs_human: true },
    {
      category: 'technical',
      priority: 'urgent',
      needs_human: true,
      suggested_reply:
        "That sounds like an outage and I'm treating it as urgent. I've alerted our on-call engineers and created an incident. I'll post updates here as we learn more — thank you for your patience.",
    },
    { score: 5, rationale: 'Correctly urgent tone, escalates, no false ETA.' },
  ),
  row(
    'T-005',
    'Add dark mode please',
    'Would love a dark theme for late-night work. Any plans?',
    { category: 'feature_request', priority: 'low', needs_human: false },
    {
      category: 'feature_request',
      priority: 'low',
      needs_human: false,
      suggested_reply:
        "Great suggestion — dark mode is a popular request. I've added your vote to the feature and will note it for the product team. I can't promise a date, but it's on the radar.",
    },
    { score: 5, rationale: 'Warm, honest about uncertainty, routes to product.' },
  ),
  row(
    'T-006',
    'Cancel my subscription',
    "I'd like to cancel before my next renewal. How do I do that?",
    { category: 'billing', priority: 'medium', needs_human: true },
    {
      category: 'billing',
      priority: 'medium',
      needs_human: true,
      suggested_reply:
        "I can help with that. Before I pass this to our billing team to process the cancellation, could you confirm the email on the account? You won't be charged again once it's cancelled.",
    },
    {
      score: 4,
      rationale: 'Reasonable, confirms identity, but could state the renewal date.',
    },
  ),
  // --- Judge failure: hallucinated specifics / a promise it cannot verify ---
  row(
    'T-007',
    "Where's my refund?",
    'I was told two weeks ago I would get a refund and I still see nothing. Update please.',
    { category: 'billing', priority: 'high', needs_human: true },
    {
      category: 'billing',
      priority: 'high',
      needs_human: true,
      suggested_reply:
        "Good news — I've just processed your $49 refund and it will land in your account within 3 business days. Your reference number is RF-88231. Thanks for your patience!",
    },
    {
      score: 2,
      rationale:
        'Invents a refund amount, a completed action, and a reference number that are not supported by the ticket — a hallucinated promise.',
    },
  ),
  row(
    'T-008',
    'API returns 500 on /users',
    'Since this morning, GET /v1/users returns a 500 for about 1 in 5 requests. Other endpoints are fine.',
    { category: 'technical', priority: 'high', needs_human: false },
    {
      category: 'technical',
      priority: 'high',
      needs_human: false,
      suggested_reply:
        'Thanks for the detailed report — intermittent 500s on a single endpoint are useful to know. Could you share a request ID from a failed call? That will let us trace it quickly on our side.',
    },
    { score: 5, rationale: 'Asks for the one piece of data that speeds diagnosis.' },
  ),
  // --- Category mismatch: model says technical, gold is billing ---
  row(
    'T-009',
    'Invoice VAT is wrong',
    'My latest invoice charged 20% VAT but my company is VAT-exempt. Can you correct it and reissue?',
    { category: 'billing', priority: 'medium', needs_human: true },
    {
      category: 'technical',
      priority: 'medium',
      needs_human: true,
      suggested_reply:
        "Thanks for catching that. I've asked our billing team to review the VAT applied to your latest invoice and reissue a corrected version. Could you share your VAT-exemption number so we can update your account?",
    },
    {
      score: 4,
      rationale: 'Good reply, requests the needed detail; category label aside.',
    },
  ),
  row(
    'T-010',
    "Can't log in, 2FA broken",
    'My authenticator app was reset and now I am locked out. I need access to my account today.',
    { category: 'account', priority: 'high', needs_human: true },
    {
      category: 'account',
      priority: 'high',
      needs_human: true,
      suggested_reply:
        "I understand being locked out is stressful. For security, 2FA resets are handled by a human agent after identity verification. I've flagged your ticket as high priority so someone can verify you and restore access today.",
    },
    {
      score: 5,
      rationale: 'Correctly defers to human verification without leaking a bypass.',
    },
  ),
  row(
    'T-011',
    'Feature: bulk CSV import',
    'It would save me hours if I could import a CSV of 500 contacts at once instead of one by one.',
    { category: 'feature_request', priority: 'low', needs_human: false },
    {
      category: 'feature_request',
      priority: 'low',
      needs_human: false,
      suggested_reply:
        "Totally understand — bulk import is a real time-saver. I've logged this as a feature request with your use case (500 contacts at once). In the meantime, our API supports batch creation if that helps.",
    },
    { score: 5, rationale: 'Logs the request and offers a concrete interim workaround.' },
  ),
  // --- Priority mismatch: model says high, gold is urgent (security) ---
  row(
    'T-012',
    'Customer data leaked?!',
    'A customer emailed me a screenshot showing another customer’s records inside their account. This looks like a data leak.',
    { category: 'technical', priority: 'urgent', needs_human: true },
    {
      category: 'technical',
      priority: 'high',
      needs_human: true,
      suggested_reply:
        "Thank you for reporting this immediately — a possible data exposure is something we take extremely seriously. I've escalated it to our security team as an incident. Please avoid sharing the screenshot further; we'll follow up directly.",
    },
    {
      score: 5,
      rationale: 'Exemplary security handling; only the priority label is under-rated.',
    },
  ),
  row(
    'T-013',
    'Change email on account',
    'I want to update the email address associated with my login to a new one.',
    { category: 'account', priority: 'low', needs_human: false },
    {
      category: 'account',
      priority: 'low',
      needs_human: false,
      suggested_reply:
        'You can update your login email under Settings → Profile → Email. A confirmation link goes to the new address to verify it. Tell me if the link never arrives.',
    },
    { score: 4, rationale: 'Clear self-serve steps; safe.' },
  ),
  // --- needs_human mismatch: model says false, gold is true (angry churn risk) ---
  row(
    'T-014',
    'Fed up — about to switch to a competitor',
    "This is the third time this has broken. I've wasted a whole day. Honestly I'm ready to move my whole team to a competitor unless someone actually helps.",
    { category: 'other', priority: 'high', needs_human: true },
    {
      category: 'other',
      priority: 'high',
      needs_human: false,
      suggested_reply:
        "I'm really sorry — losing a day to the same issue three times is not okay. Here's the help center article that usually resolves it: example.com/help. Let me know if that works.",
    },
    {
      score: 2,
      rationale:
        'Tone-deaf for an angry churn-risk customer: deflects to a help article instead of offering a human. Reads dismissive.',
    },
  ),
  row(
    'T-015',
    'Docs link 404s',
    'The "Webhooks" link in your documentation footer returns a 404.',
    { category: 'other', priority: 'low', needs_human: false },
    {
      category: 'other',
      priority: 'low',
      needs_human: false,
      suggested_reply:
        "Thanks for the heads-up — broken docs links are exactly the kind of thing we want to fix fast. I've reported the Webhooks 404 to our docs team. The current URL is example.com/docs/webhooks in the meantime.",
    },
    { score: 5, rationale: 'Thanks the reporter and provides the working link.' },
  ),
  // --- Assertion failure: reply blows the length budget (>600 chars) ---
  row(
    'T-016',
    'A few unrelated things at once',
    'First, billing looks off. Second, the export is slow. Third, can you add SSO? Fourth, the mobile app logged me out. Sorry for the wall of text!',
    { category: 'technical', priority: 'medium', needs_human: false },
    {
      category: 'technical',
      priority: 'medium',
      needs_human: false,
      suggested_reply:
        'Thank you so much for taking the time to write in with all of these different points, I really do appreciate you bundling them together even though it makes things a little harder to track on our end, so let me try to go through each one of them very carefully and in a lot of detail so that nothing at all gets missed. On the first point about billing looking off, I would love to dig into that with you and understand exactly what you are seeing on the invoice. On the second point about the export being slow, we have heard this from a few other customers and are actively looking into performance. On the third point about SSO, that is something our product team is considering. And on the fourth point about the mobile app logging you out, that may be related to a recent update.',
    },
    // no judge — assertions fail first, so the runner skips judging this reply
  ),
  row(
    'T-017',
    'Upgrade to enterprise plan',
    "We're growing and want to move to the enterprise plan. What's the process and pricing?",
    { category: 'billing', priority: 'medium', needs_human: false },
    {
      category: 'billing',
      priority: 'medium',
      needs_human: false,
      suggested_reply:
        "Exciting to hear you're scaling up! Enterprise pricing is tailored to seats and usage, so I'll connect you with our sales team for exact numbers. Roughly, would you like to share your team size to speed that up?",
    },
    {
      score: 4,
      rationale: 'Routes to sales appropriately without quoting invented prices.',
    },
  ),
  row(
    'T-018',
    'Mobile app crashes on open',
    'The iOS app crashes instantly on launch after the latest update. Reinstalling did not help.',
    { category: 'technical', priority: 'high', needs_human: false },
    {
      category: 'technical',
      priority: 'high',
      needs_human: false,
      suggested_reply:
        'Sorry about the crash — a launch crash after an update is high on our list. Could you tell me your iOS version and device model? That helps us reproduce it. A fix build often follows quickly once we can.',
    },
    { score: 5, rationale: 'Requests the reproduction details that matter for a crash.' },
  ),
];

// --- write dataset ---
const dataPath = join(ROOT, 'data', 'tickets.jsonl');
mkdirSync(dirname(dataPath), { recursive: true });
writeFileSync(dataPath, rows.map((r) => JSON.stringify(r.ticket)).join('\n') + '\n');

// --- write fixtures ---
function writeFixture(key: string, request: object, response: unknown, out = 240): void {
  const path = join(ROOT, 'fixtures', `${key}.json`);
  mkdirSync(dirname(path), { recursive: true });
  const fixture = {
    request,
    response,
    usage: { input_tokens: 320, output_tokens: out },
  };
  writeFileSync(path, JSON.stringify(fixture, null, 2) + '\n');
}

for (const { ticket, triage, judge } of rows) {
  writeFixture(
    `triage/${ticket.id}`,
    {
      model: 'claude-haiku-4-5',
      system: TRIAGE_SYSTEM,
      user: triageUserPrompt(ticket.subject, ticket.body),
    },
    triage,
  );
  if (judge) {
    writeFixture(
      `judge/${ticket.id}`,
      {
        model: 'claude-sonnet-5',
        system: '(judge rubric)',
        user: `score reply for ${ticket.id}`,
      },
      { score: judge.score, rationale: judge.rationale },
      60,
    );
  }
}

console.log(
  `Seeded ${rows.length} tickets, ${rows.length} triage fixtures, ${rows.filter((r) => r.judge).length} judge fixtures.`,
);
