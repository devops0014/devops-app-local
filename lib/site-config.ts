/**
 * Everything brand- or business-specific lives here. Edit this one file.
 * Values marked TODO should be replaced before you run ads.
 */
export const siteConfig = {
  name: "DevOpsCrack",
  tagline: "Free DevOps interview preparation",
  /** Legal name shown in the privacy policy and terms. TODO: your registered business name. */
  legalName: "DevOpsCrack",
  /** TODO: inbox that receives privacy / data requests. */
  contactEmail: "support@devopscrack.com",
  /** TODO: city, state shown in the privacy policy. */
  location: "India",
  /** Your paid course, promoted inside the app. */
  course: {
    name: "DevOps Job-Ready Program",
    pitch: "Live classes, real projects and mock interviews with mentors — built to get you hired.",
    /** Optional link to a course page; leave empty to only offer a callback. */
    url: "",
  },
  /** Real numbers only. Leave a value as null to hide it on the landing page. */
  stats: {
    questions: null as number | null,
    students: null as number | null,
  },
  /**
   * "Who's behind this" on the landing page. The section stays hidden until
   * `name` is filled in. Put your photo in /public (e.g. /public/mentor.jpg)
   * and set `photo: "/mentor.jpg"`. Leave anything you don't want shown empty.
   */
  mentor: {
    name: "",
    /** e.g. "DevOps Engineer & Trainer" */
    title: "",
    photo: "",
    /** One or two sentences in your own words. */
    bio: "",
    /** Short facts, e.g. "8 years in DevOps", "Ex-Infosys", "Trained 2,000+ students". Real numbers only. */
    highlights: [] as string[],
    linkedin: "",
  },
  social: {
    linkedin: "",
    youtube: "",
    instagram: "",
  },
  policyUpdated: "13 October 2026",
} as const;
