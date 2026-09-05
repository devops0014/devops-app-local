import { expect, type Page } from "@playwright/test";

export type TestRole = "student" | "admin";

function credentials(role: TestRole) {
  const prefix = role === "admin" ? "E2E_ADMIN" : "E2E_STUDENT";
  const email = process.env[`${prefix}_EMAIL`];
  const password = process.env[`${prefix}_PASSWORD`];
  if (!email || !password) {
    throw new Error(
      `Missing ${prefix}_EMAIL or ${prefix}_PASSWORD. Copy .env.e2e.example to .env.e2e and export its values before running Playwright.`,
    );
  }
  return { email, password };
}

export async function login(page: Page, role: TestRole) {
  const { email, password } = credentials(role);
  await page.goto("/login");
  await page.getByRole("button", { name: "Sign in", exact: true }).first().click();
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).last().click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 });
  if (role === "student") {
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: /Welcome back/i })).toBeVisible();
  }
}

export async function openAdmin(page: Page) {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin/);
  await expect(page.getByRole("heading", { name: "Control center" })).toBeVisible();
}

export function uniqueLabel(prefix: string) {
  return `${prefix} ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function confirmNextDialog(page: Page) {
  page.once("dialog", (dialog) => dialog.accept());
}
