import type { Metadata } from "next";
import { LegalPage, Section } from "@/components/legal/legal-page";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = { title: "Privacy Policy" };

// Template written for an Indian ed-tech lead-generation site. Have it reviewed
// by a lawyer and update lib/site-config.ts before running ads.
export default function PrivacyPage() {
  const { name, legalName, contactEmail, location, course } = siteConfig;
  return (
    <LegalPage title="Privacy Policy">
      <p>{name} (&ldquo;we&rdquo;, &ldquo;us&rdquo;) is operated by {legalName}, {location}. This policy explains what personal data we collect when you use {name}, why, and the choices you have. It is written to meet India&rsquo;s Digital Personal Data Protection Act, 2023.</p>

      <Section heading="What we collect">
        <ul className="list-disc space-y-1.5 pl-5">
          <li><strong>Account details:</strong> your name, email address and password (stored securely by our authentication provider), or your Google profile if you sign in with Google.</li>
          <li><strong>WhatsApp number:</strong> the number you verify by sending us a WhatsApp message.</li>
          <li><strong>Profile answers (optional):</strong> experience level, career goal, current role and city.</li>
          <li><strong>Learning activity:</strong> questions you mark, quiz scores, flashcard reviews, streaks and XP.</li>
          <li><strong>How you found us:</strong> the ad or link that brought you (for example a campaign name) and the page you landed on.</li>
          <li><strong>Technical data:</strong> device and browser type and sign-in sessions, used to keep your account secure.</li>
        </ul>
      </Section>

      <Section heading="Why we use it">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>To give you free access to the question bank, quizzes and flashcards and to save your progress.</li>
          <li><strong>With your consent</strong>, to contact you by phone, WhatsApp or email about your preparation and about our paid programmes such as the {course.name}.</li>
          <li>To understand which of our posts and ads are useful, so we can improve them.</li>
          <li>To prevent abuse, such as fake or duplicate accounts.</li>
        </ul>
        <p>We do not sell your personal data.</p>
      </Section>

      <Section heading="Who we share it with">
        <p>Only with service providers that help us run {name}, under contract and for these purposes: database and authentication hosting (Supabase), WhatsApp messaging (Meta Platforms), and advertising measurement (Meta). If you arrived from a Meta ad, we may tell Meta that a sign-up happened, using hashed (scrambled) contact details, so we can measure our ads. Our own team members see your contact details and profile answers only to call or message you.</p>
      </Section>

      <Section heading="Your choices and rights">
        <ul className="list-disc space-y-1.5 pl-5">
          <li><strong>Withdraw consent:</strong> turn off &ldquo;Course updates &amp; calls&rdquo; in Account settings at any time, or reply STOP on WhatsApp. Our team will stop contacting you; you can keep using the platform.</li>
          <li><strong>Access, correct or delete:</strong> email <a href={`mailto:${contactEmail}`} className="text-violet-300">{contactEmail}</a> and we&rsquo;ll respond within 30 days. Deleting your account removes your profile and learning history.</li>
          <li><strong>Grievances:</strong> write to the same address. If you are not satisfied, you may approach the Data Protection Board of India.</li>
        </ul>
      </Section>

      <Section heading="How long we keep it">
        <p>We keep your account data while your account is active. If you withdraw consent we stop contacting you but keep a record that you opted out, so we don&rsquo;t contact you by mistake. If you ask us to delete your account, we delete your data within 30 days, except where the law requires us to keep it.</p>
      </Section>

      <Section heading="Security">
        <p>Data is stored with access controls so that students can only see their own data and only authorised team members can see contact details. No system is perfectly secure; if a breach affects you, we will tell you and the authorities as the law requires.</p>
      </Section>

      <Section heading="Children">
        <p>{name} is meant for people aged 18 and over. If you are under 18, please use it only with a parent or guardian&rsquo;s permission.</p>
      </Section>

      <Section heading="Changes">
        <p>If we change this policy in a way that matters, we&rsquo;ll update the date above and, where appropriate, tell you in the app.</p>
      </Section>

      <Section heading="Contact">
        <p>{legalName} · {location} · <a href={`mailto:${contactEmail}`} className="text-violet-300">{contactEmail}</a></p>
      </Section>
    </LegalPage>
  );
}
