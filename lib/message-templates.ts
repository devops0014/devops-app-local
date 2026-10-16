import { siteConfig } from "@/lib/site-config";

/**
 * Ready-made messages for the sales team. Edit the wording here.
 *
 * Placeholders, filled in automatically:
 *   {firstName}   student's first name ("there" if unknown)
 *   {caller}      the team member's first name
 *   {topic}       tool they picked on the home page, e.g. "Kubernetes" ("DevOps" if none)
 *   {site}        your site name (lib/site-config.ts)
 *   {siteUrl}     your site address
 *   {course}      your course name (lib/site-config.ts)
 *   {coursePitch} one-line course description
 *   {email}       the student's email
 *   {phone}       the student's mobile number
 *   {supportEmail} your contact email
 */
export type TemplateChannel = "whatsapp" | "email" | "script";

export type MessageTemplate = {
  id: string;
  title: string;
  /** When a caller would use it. */
  when: string;
  channel: TemplateChannel;
  subject?: string;
  body: string;
};

export const messageTemplates: MessageTemplate[] = [
  {
    id: "call-script",
    title: "First call script",
    when: "Read this while calling a new student",
    channel: "script",
    body: `Hi, am I speaking with {firstName}? This is {caller} from {site}.

You signed up to prepare for {topic} interviews — thanks for joining! I'm calling to see how we can help.

Ask:
1. Are you working now, or looking for your first DevOps job?
2. Do you have any interviews coming up? When?
3. Which topics feel hardest — Kubernetes, Terraform, CI/CD, cloud?
4. Would mentor-led preparation help, or do you prefer self-study for now?

If interested: "We run the {course} — {coursePitch} I'll send you the details on WhatsApp."
If not now: "No problem. Keep using the free questions and quizzes. Can I check back with you in a couple of weeks?"`,
  },
  {
    id: "first-contact",
    title: "Welcome / first contact",
    when: "Before or right after the first call",
    channel: "whatsapp",
    body: `Hi {firstName}, this is {caller} from {site}. Thanks for signing up to prepare for {topic} interviews!

The question bank, quizzes and flashcards are free for you: {siteUrl}

Is there a good time today for a quick 5-minute call? I'd like to understand your goals and suggest where to start.`,
  },
  {
    id: "no-answer",
    title: "Couldn't reach you",
    when: "After a call with no answer",
    channel: "whatsapp",
    body: `Hi {firstName}, this is {caller} from {site}. I tried calling you about your DevOps interview preparation but couldn't get through.

When is a good time to call? You can also reply here with any questions.`,
  },
  {
    id: "course-details",
    title: "Course details",
    when: "Student is interested in the course",
    channel: "whatsapp",
    body: `Hi {firstName}, great speaking with you! As discussed, here are the details of the {course}:

{coursePitch}

Reply here with any questions, or tell me a good time to talk about the next batch.

— {caller}, {site}`,
  },
  {
    id: "follow-up",
    title: "Follow-up (maybe later)",
    when: "Checking back with a 'maybe later' student",
    channel: "whatsapp",
    body: `Hi {firstName}, {caller} from {site} here. Hope your {topic} preparation is going well!

You mentioned you might be interested in the {course} later. A new batch is coming up — would you like the details?`,
  },
  {
    id: "course-email",
    title: "Course details (email)",
    when: "Student asked for details by email",
    channel: "email",
    subject: "{course} — details as discussed",
    body: `Hi {firstName},

Thank you for speaking with me today. As promised, here are the details of the {course}:

{coursePitch}

You can keep using the free question bank, quizzes and flashcards at {siteUrl} while you decide.

If you have any questions, just reply to this email.

Regards,
{caller}
{site}`,
  },
];

/** Formal notice sent when an account is removed for a wrong mobile number. */
export const blockedNoticeTemplate: MessageTemplate = {
  id: "blocked-wrong-number",
  title: "Account removed — wrong mobile number",
  when: "Sent after blocking an account",
  channel: "email",
  subject: "Your {site} account has been removed",
  body: `Dear {firstName},

We tried to contact you on the mobile number you provided when signing up for {site} ({phone}), but we were unable to verify that this number belongs to you.

To keep the platform genuine for every student, we have removed your account and blocked this mobile number from being used again.

You are welcome to create a new account at {siteUrl} using your own, correct mobile number.

If you believe this was a mistake, please reply to this email or write to {supportEmail}.

Regards,
{caller}
{site} Team`,
};

/** In-app message shown when a removed student tries to sign in again. */
export const blockedSignInMessage = `Your previous account was removed because we couldn't verify the mobile number on it. Please create a new account using your own mobile number.`;

export type TemplateContext = {
  firstName?: string | null;
  caller?: string | null;
  topic?: string | null;
  email?: string | null;
  phone?: string | null;
  siteUrl?: string;
};

export function fillTemplate(text: string, context: TemplateContext) {
  const values: Record<string, string> = {
    firstName: context.firstName?.trim() || "there",
    caller: context.caller?.trim() || "the team",
    topic: context.topic?.trim() || "DevOps",
    site: siteConfig.name,
    siteUrl: context.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || "",
    course: siteConfig.course.name,
    coursePitch: siteConfig.course.pitch,
    email: context.email ?? "",
    phone: context.phone ?? "",
    supportEmail: siteConfig.contactEmail,
  };
  return text.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}

export function whatsappLink(phone: string, text: string) {
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}

export function mailtoLink(to: string, subject: string, body: string) {
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function firstNameOf(name: string | null | undefined) {
  return name?.trim().split(/\s+/)[0] ?? null;
}
