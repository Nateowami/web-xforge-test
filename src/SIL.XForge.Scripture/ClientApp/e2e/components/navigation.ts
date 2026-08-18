import { Locator, Page } from 'npm:playwright';

const locatorStrings = {
  translate_overview: `#translate-overview-link`,
  edit_review: `#edit-review-link`,
  generate_draft: `#generate-draft-link`,
  manage_questions: `#checking-overview-link`,
  questions_answers: `#questions-answers-link`,
  sync: `#sync-link`,
  users: `#users-link`,
  settings: `#settings-link`
};

export function navLocator(page: Page, menuItem: keyof typeof locatorStrings): Locator {
  return page.locator('app-navigation').locator(locatorStrings[menuItem]);
}
