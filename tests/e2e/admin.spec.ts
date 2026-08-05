import { expect, test } from "@playwright/test";
import { confirmNextDialog, login, openAdmin, uniqueLabel } from "./helpers";

test.describe.serial("admin content lifecycle", () => {
  let categoryName = "";
  let categorySlug = "";
  let questionText = "";

  test.beforeEach(async ({ page }) => {
    await login(page, "admin");
    await openAdmin(page);
  });

  test("admin can view live management areas", async ({ page }) => {
    for (const tab of ["AI Engine", "Students", "Subscriptions", "Audit"]) {
      await page.getByRole("button", { name: tab, exact: true }).click();
      await expect(page.getByPlaceholder(new RegExp(`Search ${tab === "AI Engine" ? "content" : tab}`, "i"))).toBeVisible();
    }
  });

  test("admin can create and update a category", async ({ page }) => {
    categoryName = uniqueLabel("E2E Category");
    categorySlug = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    await page.getByRole("button", { name: "Categories", exact: true }).click();
    await page.getByRole("button", { name: "New category" }).click();
    await page.getByLabel("Category name").fill(categoryName);
    await page.getByLabel("URL slug").fill(categorySlug);
    await page.getByRole("button", { name: "Create category" }).click();
    await expect(page.getByText(`${categoryName} was created.`)).toBeVisible();
    await expect(page.getByText(categoryName, { exact: true })).toBeVisible();

    await page.getByRole("button", { name: `Edit ${categoryName}` }).click();
    await page.getByLabel("Sort order").fill("999");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText(`${categoryName} was updated.`)).toBeVisible();
  });

  test("admin can create, update, and publish a question", async ({ page }) => {
    questionText = uniqueLabel("E2E Docker question");
    await page.getByRole("button", { name: "Questions", exact: true }).click();
    await page.getByRole("button", { name: "Add question" }).click();
    await page.getByLabel("Category").selectOption({ label: categoryName });
    await page.getByLabel("Question").fill(questionText);
    await page.getByLabel("Expected answer").fill("A deterministic E2E answer stored in Supabase.");
    await page.getByLabel("Difficulty").selectOption("Medium");
    await page.getByLabel("Companies (comma separated)").fill("TCS, Infosys");
    await page.getByLabel("Tags (comma separated)").fill("e2e, playwright");
    await page.getByLabel(/MCQ options/i).fill("Correct option\nIncorrect option A\nIncorrect option B");
    await page.getByLabel(/Correct option number/i).fill("1");
    await page.getByRole("button", { name: "Save question" }).click();
    await expect(page.getByText("Question saved successfully.")).toBeVisible();

    await page.getByPlaceholder("Search live questions…").fill(questionText);
    await expect(page.getByText(questionText, { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Edit question" }).click();
    await page.getByLabel("Difficulty").selectOption("Hard");
    await page.getByRole("button", { name: "Save question" }).click();
    await expect(page.getByText("Question saved successfully.")).toBeVisible();
  });

  test("published question reaches the student question bank", async ({ page }) => {
    await page.goto("/practice");
    await expect(page.getByRole("heading", { name: "Question Bank" })).toBeVisible();
    await expect(page.getByText(questionText, { exact: true })).toBeVisible();
  });

  test("CSV import previews valid and invalid rows before writing", async ({ page }) => {
    await page.getByRole("button", { name: "Questions", exact: true }).click();
    await page.getByRole("button", { name: "Bulk import" }).click();
    await page.locator('input[type="file"]').setInputFiles({
      name: "e2e-preview.csv",
      mimeType: "text/csv",
      buffer: Buffer.from([
        "category,question_text,answer_text,difficulty,tags,company_asked,is_published",
        `"${categoryName}","Valid preview question","Valid preview answer","Easy","e2e","TCS","false"`,
        `"${categoryName}","","Missing question text","Easy","e2e","TCS","false"`,
      ].join("\n")),
    });
    await expect(page.getByText("Rows detected").locator("..").getByText("2", { exact: true })).toBeVisible();
    await expect(page.getByText("Invalid rows").locator("..").getByText("1", { exact: true })).toBeVisible();
    await expect(page.getByText(/Missing question_text/)).toBeVisible();
  });

  test("admin can delete the E2E question and its empty category", async ({ page }) => {
    await page.getByRole("button", { name: "Questions", exact: true }).click();
    await page.getByPlaceholder("Search live questions…").fill(questionText);
    await expect(page.getByText(questionText, { exact: true })).toBeVisible();
    await confirmNextDialog(page);
    await page.getByRole("button", { name: "Delete question" }).click();
    await expect(page.getByText("Question deleted.")).toBeVisible();

    await page.getByRole("button", { name: "Categories", exact: true }).click();
    await confirmNextDialog(page);
    await page.getByRole("button", { name: `Delete ${categoryName}` }).click();
    await expect(page.getByText(`${categoryName} was deleted.`)).toBeVisible();
  });
});
