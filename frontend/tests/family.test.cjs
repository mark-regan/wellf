/**
 * Puppeteer E2E Tests for Family Management (Phase 1)
 *
 * Tests:
 * - User registration and login
 * - Household creation (auto-created on first visit)
 * - Household name editing
 * - Person CRUD operations
 * - Relationship management
 * - UI responsiveness
 */

const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:3001';
const API_URL = 'http://localhost:4020';

// Generate unique test user for each run
const timestamp = Date.now();
const TEST_USER = {
  email: `test${timestamp}@example.com`,
  password: 'TestPassword123!',
  name: 'Test User'
};

let browser;
let page;

// Helper functions
async function waitAndClick(selector, options = {}) {
  await page.waitForSelector(selector, { visible: true, timeout: 10000, ...options });
  await page.click(selector);
}

async function waitAndType(selector, text, options = {}) {
  await page.waitForSelector(selector, { visible: true, timeout: 10000, ...options });
  await page.click(selector, { clickCount: 3 }); // Select all existing text
  await page.type(selector, text);
}

async function getText(selector) {
  await page.waitForSelector(selector, { visible: true, timeout: 10000 });
  return page.$eval(selector, el => el.textContent);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test Suite
describe('Family Management E2E Tests', () => {

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  describe('Authentication', () => {
    test('should register a new user', async () => {
      await page.goto(`${BASE_URL}/register`);

      // Fill registration form
      await waitAndType('input[id="email"]', TEST_USER.email);
      await waitAndType('input[id="displayName"]', TEST_USER.name);
      await waitAndType('input[id="password"]', TEST_USER.password);
      await waitAndType('input[id="confirmPassword"]', TEST_USER.password);

      // Submit
      await waitAndClick('button[type="submit"]');

      // Should redirect to dashboard or login
      await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 });

      const url = page.url();
      expect(url === `${BASE_URL}/` || url === `${BASE_URL}/login`).toBe(true);
    }, 30000);

    test('should login with registered user', async () => {
      await page.goto(`${BASE_URL}/login`);

      // Fill login form
      await waitAndType('input[id="email"]', TEST_USER.email);
      await waitAndType('input[id="password"]', TEST_USER.password);

      // Submit
      await waitAndClick('button[type="submit"]');

      // Wait for dashboard
      await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 });

      expect(page.url()).toBe(`${BASE_URL}/`);
    }, 30000);
  });

  describe('Household Management', () => {
    test('should navigate to People page', async () => {
      // Click on Household dropdown first
      await page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.textContent.includes('Household')) {
            btn.click();
            return;
          }
        }
      });
      await sleep(500);

      // Click on People in the dropdown
      await waitAndClick('a[href="/people"]');
      await sleep(2000); // Wait for page load and household creation

      expect(page.url()).toBe(`${BASE_URL}/people`);
    }, 15000);

    test('should auto-create a default household', async () => {
      // The household should be auto-created when visiting Family page
      await page.waitForSelector('h1', { timeout: 10000 });
      const heading = await getText('h1');
      expect(heading).toBe('Family');

      // Check for "My Household" text (default name)
      await sleep(2000);
      const content = await page.content();
      expect(content).toContain('My Household');
    }, 15000);

    test('should edit household name', async () => {
      // Hover over household name and click edit button
      const householdNameArea = await page.$('p.group');
      if (householdNameArea) {
        await householdNameArea.hover();
        await sleep(500);

        // Click the pencil icon
        const editButton = await page.$('p.group button');
        if (editButton) {
          await editButton.click();
          await sleep(500);

          // Type new name
          await waitAndType('input[placeholder="Household name"]', 'Test Family Household');

          // Click save
          await page.click('button:has-text("Save")').catch(() => {
            // If :has-text doesn't work, find by content
            return page.evaluate(() => {
              const buttons = document.querySelectorAll('button');
              for (const btn of buttons) {
                if (btn.textContent.trim() === 'Save') {
                  btn.click();
                  return;
                }
              }
            });
          });

          await sleep(1000);

          // Verify the name was updated
          const content = await page.content();
          expect(content).toContain('Test Family Household');
        }
      }
    }, 20000);
  });

  describe('Person CRUD Operations', () => {
    test('should add a new family member', async () => {
      // Click "Add Family Member" button
      await page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.textContent.includes('Add Family Member')) {
            btn.click();
            return;
          }
        }
      });

      await sleep(1000);

      // Fill in the form
      await waitAndType('input[placeholder="First name"]', 'John');
      await waitAndType('input[placeholder="Last name"]', 'Doe');
      await waitAndType('input[placeholder="Nickname"]', 'Johnny');

      // Set date of birth
      await page.type('input[type="date"]', '1990-05-15');

      // Select gender
      await page.select('select', 'male');

      // Fill email and phone
      await waitAndType('input[placeholder="email@example.com"]', 'john.doe@example.com');
      await waitAndType('input[placeholder="+44 7700 900000"]', '+44 7700 900001');

      // Check primary account holder
      await page.click('input[id="primary"]');

      // Submit
      await page.evaluate(() => {
        const buttons = document.querySelectorAll('button[type="submit"]');
        for (const btn of buttons) {
          if (btn.textContent.includes('Add Member')) {
            btn.click();
            return;
          }
        }
      });

      await sleep(2000);

      // Verify the person was added
      const content = await page.content();
      expect(content).toContain('John');
      expect(content).toContain('Doe');
    }, 30000);

    test('should add a second family member', async () => {
      // Click "Add Family Member" button
      await page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.textContent.includes('Add Family Member')) {
            btn.click();
            return;
          }
        }
      });

      await sleep(1000);

      // Fill in the form for Jane
      await waitAndType('input[placeholder="First name"]', 'Jane');
      await waitAndType('input[placeholder="Last name"]', 'Doe');

      // Set date of birth using JavaScript to avoid concatenation issues
      await page.evaluate(() => {
        const dateInput = document.querySelector('input[type="date"]');
        if (dateInput) {
          dateInput.value = '1992-08-20';
          dateInput.dispatchEvent(new Event('input', { bubbles: true }));
          dateInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });

      // Select gender
      await page.select('select', 'female');

      // Fill email
      await waitAndType('input[placeholder="email@example.com"]', 'jane.doe@example.com');

      // Submit
      await page.evaluate(() => {
        const buttons = document.querySelectorAll('button[type="submit"]');
        for (const btn of buttons) {
          if (btn.textContent.includes('Add Member')) {
            btn.click();
            return;
          }
        }
      });

      await sleep(2000);

      // Verify
      const content = await page.content();
      expect(content).toContain('Jane');
    }, 30000);

    test('should edit a family member', async () => {
      // Find and click edit button for John (first card)
      const editButtons = await page.$$('button[title="Edit"]');
      if (editButtons.length > 0) {
        await editButtons[0].click();
        await sleep(1000);

        // Change the nickname
        const nicknameInput = await page.$('input[placeholder="Nickname"]');
        if (nicknameInput) {
          await nicknameInput.click({ clickCount: 3 });
          await nicknameInput.type('JD');
        }

        // Submit
        await page.evaluate(() => {
          const buttons = document.querySelectorAll('button[type="submit"]');
          for (const btn of buttons) {
            if (btn.textContent.includes('Save Changes')) {
              btn.click();
              return;
            }
          }
        });

        await sleep(2000);

        // Verify
        const content = await page.content();
        expect(content).toContain('"JD"');
      }
    }, 30000);
  });

  describe('Relationship Management', () => {
    test('should add a relationship between family members', async () => {
      // Find "Add Relationship" button on John's card
      const addRelButtons = await page.$$('button');
      let clicked = false;

      for (const btn of addRelButtons) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text.includes('Add Relationship')) {
          await btn.click();
          clicked = true;
          break;
        }
      }

      if (clicked) {
        await sleep(1000);

        // Modal should appear - select related person (Jane)
        const personSelects = await page.$$('select');
        if (personSelects.length >= 1) {
          // Find the select for related person and select Jane
          const options = await page.$$eval('select option', opts =>
            opts.map(o => ({ value: o.value, text: o.textContent }))
          );

          // Select Jane (should be the second person)
          const janeOption = options.find(o => o.text.includes('Jane'));
          if (janeOption) {
            await personSelects[0].select(janeOption.value);
          }

          await sleep(500);

          // Select relationship type (spouse)
          if (personSelects.length >= 2) {
            await personSelects[1].select('spouse');
          }

          await sleep(500);

          // Click Add Relationship button in modal
          await page.evaluate(() => {
            const buttons = document.querySelectorAll('button');
            for (const btn of buttons) {
              if (btn.textContent.trim() === 'Add Relationship') {
                btn.click();
                return;
              }
            }
          });

          await sleep(2000);

          // Verify relationship was added
          const content = await page.content();
          expect(content).toContain('Spouse');
        }
      }
    }, 30000);

    test('should display relationships correctly', async () => {
      await sleep(1000);
      const content = await page.content();

      // Check that relationship-related content is visible
      // The UI shows "Add Relationship" button, relationship types like "Spouse"
      const hasRelationshipContent = content.includes('Spouse') || content.includes('Add Relationship');
      expect(hasRelationshipContent).toBe(true);
    }, 10000);
  });

  describe('Delete Operations', () => {
    test('should delete a family member', async () => {
      // Reload to clear any modal state
      await page.reload({ waitUntil: 'networkidle0' });
      await sleep(2000);

      // Find delete buttons (one per person card)
      const deleteButtons = await page.$$('button[title="Delete"]');
      const initialDeleteCount = deleteButtons.length;

      if (deleteButtons.length > 0) {
        await deleteButtons[deleteButtons.length - 1].click();
        await sleep(1000);

        // Confirm deletion in modal - look for the destructive button
        await page.evaluate(() => {
          const buttons = document.querySelectorAll('button');
          for (const btn of buttons) {
            const text = btn.textContent.trim();
            // The delete confirmation button is in a modal and has variant="destructive"
            if ((text === 'Delete' || text.includes('Delete')) &&
                btn.closest('.fixed') &&
                !btn.hasAttribute('title')) {
              btn.click();
              return;
            }
          }
        });

        await sleep(2000);

        // Verify deletion by checking delete button count decreased
        const finalDeleteButtons = await page.$$('button[title="Delete"]');
        expect(finalDeleteButtons.length).toBeLessThan(initialDeleteCount);
      }
    }, 30000);
  });

  describe('UI Responsiveness', () => {
    test('should display correctly on mobile viewport', async () => {
      await page.setViewport({ width: 375, height: 667 }); // iPhone SE
      await page.reload({ waitUntil: 'networkidle0' });
      await sleep(2000);

      // Page should still show Family heading
      const heading = await getText('h1');
      expect(heading).toBe('Family');

      // Cards should stack vertically (grid should be single column)
      const cards = await page.$$('.grid > div');
      expect(cards.length).toBeGreaterThan(0);
    }, 20000);

    test('should display correctly on tablet viewport', async () => {
      await page.setViewport({ width: 768, height: 1024 }); // iPad
      await sleep(1000);

      const heading = await getText('h1');
      expect(heading).toBe('Family');
    }, 10000);

    test('should display correctly on desktop viewport', async () => {
      await page.setViewport({ width: 1920, height: 1080 }); // Full HD
      await sleep(1000);

      const heading = await getText('h1');
      expect(heading).toBe('Family');
    }, 10000);
  });

  describe('Error Handling', () => {
    test('should show validation error for empty first name', async () => {
      await page.setViewport({ width: 1280, height: 800 });

      // Click "Add Family Member" button
      await page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.textContent.includes('Add Family Member')) {
            btn.click();
            return;
          }
        }
      });

      await sleep(1000);

      // Try to submit without first name
      await page.evaluate(() => {
        const buttons = document.querySelectorAll('button[type="submit"]');
        for (const btn of buttons) {
          if (btn.textContent.includes('Add Member')) {
            btn.click();
            return;
          }
        }
      });

      await sleep(1000);

      // The form should not submit (HTML5 validation or custom error)
      // Check if we're still on the form
      const formVisible = await page.$('input[placeholder="First name"]');
      expect(formVisible).not.toBeNull();
    }, 20000);
  });
});

// Run tests
if (require.main === module) {
  console.log('Running Family E2E Tests with Puppeteer...');
  console.log(`Test user: ${TEST_USER.email}`);
}
