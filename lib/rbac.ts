/**
 * Role-based access control shared by the browser (to show/hide navigation)
 * and the server (to enforce access on every API route).
 * The server check is the real guard; hiding a link is only for convenience.
 */
export const roles = ["student", "sales", "admin", "super_admin"] as const;
export type Role = (typeof roles)[number];

export type Permission =
  | "leads.view"      // see registered students and their contact details
  | "leads.update"    // change call status and add notes
  | "leads.export"    // download leads as CSV
  | "leads.block"     // remove an account whose mobile number is wrong
  | "content.manage"  // questions, categories, imports, AI content engine
  | "team.manage";    // change other people's roles

const matrix: Record<Role, readonly Permission[]> = {
  student: [],
  sales: ["leads.view", "leads.update", "leads.block"],
  admin: ["content.manage"],
  super_admin: ["leads.view", "leads.update", "leads.export", "leads.block", "content.manage", "team.manage"],
};

export const roleLabels: Record<Role, string> = {
  student: "Student",
  sales: "Sales team",
  admin: "Content admin",
  super_admin: "Super admin",
};

export const roleDescriptions: Record<Role, string> = {
  student: "Uses the question bank, quizzes and flashcards.",
  sales: "Sees registered students, calls them, sets status, adds notes and removes wrong-number accounts.",
  admin: "Manages questions, categories and imports.",
  super_admin: "Full access, including leads export and team roles.",
};

export function asRole(value: unknown): Role {
  return roles.includes(value as Role) ? (value as Role) : "student";
}

export function can(role: Role | null | undefined, permission: Permission) {
  return Boolean(role && matrix[role].includes(permission));
}

export function isStaff(role: Role | null | undefined) {
  return Boolean(role && role !== "student");
}
