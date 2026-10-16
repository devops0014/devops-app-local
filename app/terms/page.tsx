import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Section } from "@/components/legal/legal-page";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = { title: "Terms of Use" };

// Template. Have it reviewed and update lib/site-config.ts before running ads.
export default function TermsPage() {
  const { name, legalName, contactEmail } = siteConfig;
  return (
    <LegalPage title="Terms of Use">
      <p>These terms apply when you use {name}, operated by {legalName}. By creating an account you agree to them.</p>

      <Section heading="Free access">
        <p>The question bank, quizzes and flashcards are free. We may add, change or remove content and features at any time. Paid programmes, if you choose to join one, have their own terms.</p>
      </Section>

      <Section heading="Your account">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Use your real name, email and your own mobile number. One account per person.</li>
          <li>If our team finds that the mobile number on an account is wrong or belongs to someone else, we may remove the account. You&rsquo;re welcome to sign up again with your own number.</li>
          <li>Keep your password private. You&rsquo;re responsible for activity on your account.</li>
          <li>We may suspend accounts that are fake, shared, or used to copy or scrape our content.</li>
        </ul>
      </Section>

      <Section heading="Our content">
        <p>Questions, answers and explanations on {name} are our work and are provided for your personal preparation. Please don&rsquo;t republish or sell them. You&rsquo;re welcome to share your own quiz results.</p>
      </Section>

      <Section heading="No guarantee">
        <p>We work hard to keep answers accurate and current, but technology changes and mistakes happen. {name} helps you prepare; it can&rsquo;t guarantee an interview result or a job offer.</p>
      </Section>

      <Section heading="Contact from our team">
        <p>If you agree to it, our team may call or message you about your preparation and our programmes. You can stop this at any time — see our <Link href="/privacy" className="text-violet-300">Privacy Policy</Link>.</p>
      </Section>

      <Section heading="Liability">
        <p>To the extent the law allows, {name} is provided &ldquo;as is&rdquo; and we aren&rsquo;t liable for indirect losses arising from its use.</p>
      </Section>

      <Section heading="Contact">
        <p>Questions about these terms: <a href={`mailto:${contactEmail}`} className="text-violet-300">{contactEmail}</a>.</p>
      </Section>
    </LegalPage>
  );
}
