import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test.describe("student journey", () => {
  test("logged-out visitors cannot open a protected dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login\?returnTo=/);
  });

  test("subscribed student can sign in and use the learning surfaces", async ({ page }) => {
    await login(page, "student");

    await page.goto("/practice");
    await expect(page.getByRole("heading", { name: "Question Bank" })).toBeVisible();
    const reveal = page.getByRole("button", { name: "Reveal answer" });
    if (await reveal.count()) {
      await reveal.first().click();
      await expect(page.getByText("Revealed", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Need Revision" }).click();
    }

    await page.goto("/quiz");
    await expect(page.getByRole("heading", { name: "Build your quiz" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Start quiz/ })).toBeVisible();

    await page.goto("/flashcards");
    await expect(page.getByRole("heading", { name: "Daily flashcards" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Flip card" })).toBeVisible();

    await page.goto("/analytics");
    await expect(page.getByRole("heading", { name: /analytics|performance/i })).toBeVisible();
  });

  test("student cannot bypass the admin gate", async ({ page }) => {
    await login(page, "student");
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: /Welcome back/i })).toBeVisible();
  });
});
