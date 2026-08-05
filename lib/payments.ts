export type PlanId = "monthly" | "half_yearly" | "yearly";

export type PlanDefinition = {
  id: PlanId;
  name: string;
  durationLabel: string;
  amountInr: number;
  durationMonths: number;
  monthlyEquivalent: number;
  savingsPercent: number;
  badge: string;
  mockInterviewLimit: number | null;
  resumeReviewLimit: number | null;
  features: readonly string[];
};

export type RazorpayCheckoutResult = {
  provider: "razorpay";
  keyId: string;
  subscriptionId: string;
  amount: number;
  currency: "INR";
  name: string;
  description: string;
  prefill?: { name?: string; email?: string };
};

export const planCatalog: Record<PlanId, PlanDefinition> = {
  monthly: {
    id: "monthly",
    name: "Monthly",
    durationLabel: "1 month",
    amountInr: 199,
    durationMonths: 1,
    monthlyEquivalent: 199,
    savingsPercent: 0,
    badge: "Try it out",
    mockInterviewLimit: 2,
    resumeReviewLimit: 1,
    features: [
      "2 AI Mock Interviews",
      "1 Resume Review",
      "Unlimited Quiz",
      "Unlimited MCQs",
      "Unlimited Practice Questions",
      "Progress Tracking",
    ],
  },
  half_yearly: {
    id: "half_yearly",
    name: "6 Months",
    durationLabel: "6 months",
    amountInr: 799,
    durationMonths: 6,
    monthlyEquivalent: 133,
    savingsPercent: 33,
    badge: "🔥 Most Popular",
    mockInterviewLimit: 15,
    resumeReviewLimit: 5,
    features: [
      "15 AI Mock Interviews",
      "5 Resume Reviews",
      "Unlimited Quiz",
      "Unlimited MCQs",
      "Unlimited Practice Questions",
      "AI Feedback",
      "Progress Tracking",
    ],
  },
  yearly: {
    id: "yearly",
    name: "Yearly",
    durationLabel: "12 months",
    amountInr: 999,
    durationMonths: 12,
    monthlyEquivalent: 83,
    savingsPercent: 58,
    badge: "Best Value",
    mockInterviewLimit: null,
    resumeReviewLimit: null,
    features: [
      "Fair Usage AI Mock Interviews",
      "Fair Usage Resume Reviews",
      "Unlimited Quiz",
      "Unlimited MCQs",
      "Unlimited Practice Questions",
      "AI Feedback",
      "Priority Support",
      "Early Access Features",
    ],
  },
};

export const plans = Object.values(planCatalog);

export async function createCheckout(planId: PlanId, accessToken?: string) {
  const response = await fetch("/api/payments/create-checkout", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ planId }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error ?? "Unable to create checkout");
  }
  return response.json() as Promise<RazorpayCheckoutResult>;
}
