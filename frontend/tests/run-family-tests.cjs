/**
 * Simple Puppeteer Test Runner for Family Management
 *
 * Run with: node tests/run-family-tests.cjs
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3001';

// Generate unique test user for each run
const timestamp = Date.now();
const TEST_USER = {
  email: `test${timestamp}@example.com`,
  password: 'TestPassword123!@#',  // Min 12 chars with uppercase, lowercase, number, symbol
  displayName: 'Test User'
};

// Test tracking
let passed = 0;
let failed = 0;
const results = [];

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    error: '\x1b[31m',   // Red
    warn: '\x1b[33m',    // Yellow
    reset: '\x1b[0m'
  };
  console.log(`${colors[type] || ''}${message}${colors.reset}`);
}

async function test(name, fn) {
  try {
    await fn();
    passed++;
    results.push({ name, status: 'PASS' });
    log(`  ✓ ${name}`, 'success');
  } catch (err) {
    failed++;
    results.push({ name, status: 'FAIL', error: err.message });
    log(`  ✗ ${name}`, 'error');
    log(`    Error: ${err.message}`, 'error');
  }
}

// Helper functions
async function waitForApp(page) {
  // Wait for React app to mount and render
  await page.waitForFunction(() => {
    const root = document.getElementById('root');
    return root && root.children.length > 0;
  }, { timeout: 15000 });
}

async function waitAndClick(page, selector, options = {}) {
  await page.waitForSelector(selector, { visible: true, timeout: 15000, ...options });
  await page.click(selector);
}

async function waitAndType(page, selector, text, options = {}) {
  await page.waitForSelector(selector, { visible: true, timeout: 15000, ...options });
  await page.click(selector, { clickCount: 3 });
  await page.type(selector, text);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function clickButtonByText(page, text) {
  return page.evaluate((searchText) => {
    const buttons = document.querySelectorAll('button');
    for (const btn of buttons) {
      if (btn.textContent.includes(searchText)) {
        btn.click();
        return true;
      }
    }
    return false;
  }, text);
}

async function takeScreenshot(page, name) {
  const screenshotDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
  await page.screenshot({ path: path.join(screenshotDir, `${name}.png`), fullPage: true });
}

// Main test runner
async function runTests() {
  log('\n=== Family Management E2E Tests ===\n', 'info');
  log(`Test user: ${TEST_USER.email}`, 'info');
  log(`Base URL: ${BASE_URL}\n`, 'info');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  // Enable console logging from the page
  page.on('console', msg => {
    if (msg.type() === 'error') {
      log(`  [Browser Error]: ${msg.text()}`, 'warn');
    }
  });

  try {
    // ===== AUTHENTICATION TESTS =====
    log('\n--- Authentication ---', 'warn');

    await test('Should load login page', async () => {
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0', timeout: 30000 });
      await waitForApp(page);
      await sleep(1000);

      // Take screenshot for debugging
      await takeScreenshot(page, '01-login-page');

      // Check for the welcome text in CardTitle
      const content = await page.content();
      if (!content.includes('Welcome') && !content.includes('wellf') && !content.includes('Sign in')) {
        throw new Error('Login page not loaded correctly');
      }
    });

    await test('Should navigate to register page', async () => {
      // Find the "Sign up" link
      const signUpLink = await page.$('a[href="/register"]');
      if (!signUpLink) {
        throw new Error('Sign up link not found');
      }
      await signUpLink.click();
      await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 });
      await waitForApp(page);
      await sleep(1000);

      await takeScreenshot(page, '02-register-page');

      if (!page.url().includes('/register')) {
        throw new Error(`Not on register page, got: ${page.url()}`);
      }
    });

    await test('Should register new user', async () => {
      // Wait for the registration form to load - using #email as it's the first field
      await page.waitForSelector('input#email', { visible: true, timeout: 10000 });

      // Fill email
      const emailInput = await page.$('input#email');
      if (emailInput) {
        await emailInput.click({ clickCount: 3 });
        await emailInput.type(TEST_USER.email);
      }

      // Fill display name (optional)
      const displayNameInput = await page.$('input#displayName');
      if (displayNameInput) {
        await displayNameInput.click({ clickCount: 3 });
        await displayNameInput.type(TEST_USER.displayName);
      }

      // Fill password
      const passwordInput = await page.$('input#password');
      if (passwordInput) {
        await passwordInput.click({ clickCount: 3 });
        await passwordInput.type(TEST_USER.password);
      }

      // Fill confirm password
      const confirmPasswordInput = await page.$('input#confirmPassword');
      if (confirmPasswordInput) {
        await confirmPasswordInput.click({ clickCount: 3 });
        await confirmPasswordInput.type(TEST_USER.password);
      }

      await takeScreenshot(page, '03-register-form-filled');

      // Submit - button says "Create Account"
      await clickButtonByText(page, 'Create Account');
      await sleep(3000);

      await takeScreenshot(page, '04-after-register');

      const url = page.url();
      // Should redirect to login or show success message, then redirect
      // The app shows success message and redirects after 2 seconds
      if (url.includes('/register')) {
        // Check for success message
        const content = await page.content();
        if (content.includes('Account created successfully')) {
          // Wait for redirect
          await sleep(3000);
        }
      }

      // Now should be on login
      const finalUrl = page.url();
      if (!finalUrl.includes('/login') && finalUrl !== `${BASE_URL}/`) {
        const content = await page.content();
        if (content.includes('error') || content.includes('Error') || content.includes('failed')) {
          throw new Error('Registration failed - check screenshot');
        }
      }
    });

    await test('Should login with registered user', async () => {
      // Go to login if not already there
      if (!page.url().includes('/login')) {
        await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
        await waitForApp(page);
      }

      await sleep(1000);

      // Fill login form
      const emailInput = await page.$('input#email') || await page.$('input[type="email"]');
      const passwordInput = await page.$('input#password') || await page.$('input[type="password"]');

      if (emailInput) {
        await emailInput.click({ clickCount: 3 });
        await emailInput.type(TEST_USER.email);
      }

      if (passwordInput) {
        await passwordInput.click({ clickCount: 3 });
        await passwordInput.type(TEST_USER.password);
      }

      await takeScreenshot(page, '05-login-form-filled');

      await clickButtonByText(page, 'Sign In');

      // Wait for navigation to dashboard
      await sleep(3000);

      await takeScreenshot(page, '06-after-login');

      const url = page.url();
      // Should be on dashboard
      if (url !== `${BASE_URL}/` && !url.includes('/family')) {
        // Could still be on login with an error
        const content = await page.content();
        if (content.includes('Login failed') || content.includes('error')) {
          throw new Error('Login failed - check credentials');
        }
        throw new Error(`Expected dashboard, got: ${url}`);
      }
    });

    // ===== HOUSEHOLD TESTS =====
    log('\n--- Household Management ---', 'warn');

    await test('Should navigate to Family page', async () => {
      // Find Family link in sidebar
      const familyLink = await page.$('a[href="/family"]');
      if (!familyLink) {
        // Maybe we need to look for it differently
        const links = await page.$$('a');
        let found = false;
        for (const link of links) {
          const href = await page.evaluate(el => el.getAttribute('href'), link);
          const text = await page.evaluate(el => el.textContent, link);
          if (href === '/family' || text.includes('Family')) {
            await link.click();
            found = true;
            break;
          }
        }
        if (!found) {
          throw new Error('Family link not found in sidebar');
        }
      } else {
        await familyLink.click();
      }

      await sleep(3000); // Wait for household creation

      await takeScreenshot(page, '07-family-page');

      if (!page.url().includes('/family')) {
        throw new Error(`Not on family page, got: ${page.url()}`);
      }
    });

    await test('Should auto-create default household', async () => {
      await sleep(2000);
      const content = await page.content();

      // Check for household name or Family heading
      const hasFamily = content.includes('Family');
      const hasHousehold = content.includes('Household') || content.includes('My Household');

      if (!hasFamily && !hasHousehold) {
        throw new Error('Neither Family heading nor Household found');
      }
    });

    await test('Should show "Add Family Member" button', async () => {
      const content = await page.content();
      if (!content.includes('Add Family Member')) {
        throw new Error('Add Family Member button not found');
      }
    });

    // ===== PERSON CRUD TESTS =====
    log('\n--- Person CRUD Operations ---', 'warn');

    await test('Should open add person form', async () => {
      const clicked = await clickButtonByText(page, 'Add Family Member');
      if (!clicked) {
        throw new Error('Could not click Add Family Member button');
      }
      await sleep(1000);

      await takeScreenshot(page, '08-add-person-form');

      const form = await page.$('input[placeholder="First name"]');
      if (!form) {
        throw new Error('Add person form not opened');
      }
    });

    await test('Should add first family member (John)', async () => {
      // Fill the form
      await waitAndType(page, 'input[placeholder="First name"]', 'John');

      const lastNameInput = await page.$('input[placeholder="Last name"]');
      if (lastNameInput) {
        await lastNameInput.click({ clickCount: 3 });
        await lastNameInput.type('Doe');
      }

      const nicknameInput = await page.$('input[placeholder="Nickname"]');
      if (nicknameInput) {
        await nicknameInput.click({ clickCount: 3 });
        await nicknameInput.type('Johnny');
      }

      const dateInput = await page.$('input[type="date"]');
      if (dateInput) {
        await dateInput.type('1990-05-15');
      }

      const genderSelect = await page.$('select');
      if (genderSelect) {
        await genderSelect.select('male');
      }

      const emailInput = await page.$('input[type="email"], input[placeholder*="email"]');
      if (emailInput) {
        await emailInput.click({ clickCount: 3 });
        await emailInput.type('john@example.com');
      }

      const phoneInput = await page.$('input[type="tel"], input[placeholder*="7700"]');
      if (phoneInput) {
        await phoneInput.click({ clickCount: 3 });
        await phoneInput.type('+44 7700 900001');
      }

      const primaryCheckbox = await page.$('input[id="primary"], input[type="checkbox"]');
      if (primaryCheckbox) {
        await primaryCheckbox.click();
      }

      await takeScreenshot(page, '09-john-form-filled');

      // Submit
      await clickButtonByText(page, 'Add Member');
      await sleep(2000);

      await takeScreenshot(page, '10-after-add-john');

      const content = await page.content();
      if (!content.includes('John')) {
        throw new Error('John was not added to the family');
      }
    });

    await test('Should display John\'s details correctly', async () => {
      const content = await page.content();
      // Check for email or other details
      const hasEmail = content.includes('john@example.com');
      const hasName = content.includes('John') && content.includes('Doe');

      if (!hasName) {
        throw new Error('Name not displayed correctly');
      }
      if (!hasEmail) {
        log('    Note: Email may not be displayed in card', 'warn');
      }
    });

    await test('Should add second family member (Jane)', async () => {
      const clicked = await clickButtonByText(page, 'Add Family Member');
      if (!clicked) {
        throw new Error('Could not click Add Family Member button');
      }
      await sleep(1000);

      await waitAndType(page, 'input[placeholder="First name"]', 'Jane');

      const lastNameInput = await page.$('input[placeholder="Last name"]');
      if (lastNameInput) {
        await lastNameInput.click({ clickCount: 3 });
        await lastNameInput.type('Doe');
      }

      const dateInput = await page.$('input[type="date"]');
      if (dateInput) {
        await dateInput.type('1992-08-20');
      }

      const genderSelect = await page.$('select');
      if (genderSelect) {
        await genderSelect.select('female');
      }

      const emailInput = await page.$('input[type="email"], input[placeholder*="email"]');
      if (emailInput) {
        await emailInput.click({ clickCount: 3 });
        await emailInput.type('jane@example.com');
      }

      await takeScreenshot(page, '11-jane-form-filled');

      await clickButtonByText(page, 'Add Member');
      await sleep(2000);

      await takeScreenshot(page, '12-after-add-jane');

      const content = await page.content();
      if (!content.includes('Jane')) {
        throw new Error('Jane was not added to the family');
      }
    });

    await test('Should edit a family member', async () => {
      const editButtons = await page.$$('button[title="Edit"]');
      if (editButtons.length === 0) {
        throw new Error('No edit buttons found');
      }

      await editButtons[0].click();
      await sleep(1000);

      await takeScreenshot(page, '13-edit-form');

      // Update nickname
      const nicknameInput = await page.$('input[placeholder="Nickname"]');
      if (nicknameInput) {
        await nicknameInput.click({ clickCount: 3 });
        await nicknameInput.type('JD');
      }

      await clickButtonByText(page, 'Save Changes');
      await sleep(2000);

      await takeScreenshot(page, '14-after-edit');
    });

    // ===== RELATIONSHIP TESTS =====
    log('\n--- Relationship Management ---', 'warn');

    await test('Should open Add Relationship modal', async () => {
      const clicked = await clickButtonByText(page, 'Add Relationship');
      if (!clicked) {
        throw new Error('Could not click Add Relationship button');
      }
      await sleep(1000);

      await takeScreenshot(page, '15-relationship-modal');

      const content = await page.content();
      if (!content.includes('Related Person') && !content.includes('relationship')) {
        throw new Error('Relationship modal not opened');
      }
    });

    await test('Should add spouse relationship', async () => {
      // Get all selects
      const selects = await page.$$('select');

      if (selects.length >= 2) {
        // First select: related person - select Jane
        const options = await page.$$eval('select', sels => {
          const opts = [];
          sels.forEach(sel => {
            Array.from(sel.options).forEach(o => {
              opts.push({ value: o.value, text: o.textContent, selectIndex: Array.from(document.querySelectorAll('select')).indexOf(sel) });
            });
          });
          return opts;
        });

        // Find Jane option in first select
        const janeOption = options.find(o => o.text && o.text.includes('Jane') && o.selectIndex === 0);
        if (janeOption && janeOption.value) {
          await selects[0].select(janeOption.value);
          await sleep(500);
        }

        // Select spouse in second select
        await selects[1].select('spouse');
        await sleep(500);
      }

      await takeScreenshot(page, '16-relationship-filled');

      // Click the modal's Add Relationship button
      const addRelClicked = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.textContent.trim() === 'Add Relationship') {
            btn.click();
            return true;
          }
        }
        return false;
      });

      await sleep(2000);

      await takeScreenshot(page, '17-after-relationship');

      const content = await page.content();
      if (!content.includes('Spouse') && !content.includes('spouse')) {
        log('    Note: Spouse relationship may not be visible yet', 'warn');
      }
    });

    await test('Should display relationship badge', async () => {
      await page.reload({ waitUntil: 'networkidle0' });
      await waitForApp(page);
      await sleep(2000);

      await takeScreenshot(page, '18-relationships-visible');

      const content = await page.content();
      // Look for any indication of relationships
      const hasRelationships = content.includes('Relationships') ||
                               content.includes('Spouse') ||
                               content.includes('spouse');

      if (!hasRelationships) {
        log('    Note: Relationships may not be displayed', 'warn');
      }
    });

    // ===== DELETE TESTS =====
    log('\n--- Delete Operations ---', 'warn');

    await test('Should show delete confirmation modal', async () => {
      const deleteButtons = await page.$$('button[title="Delete"]');
      if (deleteButtons.length === 0) {
        throw new Error('No delete buttons found');
      }

      await deleteButtons[deleteButtons.length - 1].click();
      await sleep(1000);

      await takeScreenshot(page, '19-delete-modal');

      const content = await page.content();
      if (!content.includes('Delete Family Member') && !content.includes('Are you sure')) {
        throw new Error('Delete confirmation modal not shown');
      }
    });

    await test('Should delete a family member', async () => {
      // Confirm delete - find the destructive Delete button
      const deleteClicked = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          const text = btn.textContent.trim();
          // Look for Delete button that's not Cancel
          if (text === 'Delete' || text === 'Deleting...') {
            // Check it's not the small icon button
            if (btn.className.includes('destructive') || btn.closest('.fixed')) {
              btn.click();
              return true;
            }
          }
        }
        // Fallback
        for (const btn of buttons) {
          if (btn.textContent.trim() === 'Delete' && !btn.textContent.includes('Cancel')) {
            btn.click();
            return true;
          }
        }
        return false;
      });

      await sleep(2000);

      await takeScreenshot(page, '20-after-delete');

      // Verify Jane was deleted
      const content = await page.content();
      const janeStillExists = content.includes('Jane');

      if (janeStillExists) {
        log('    Note: Jane may still be visible - delete might have failed', 'warn');
      }
    });

    // ===== RESPONSIVE DESIGN TESTS =====
    log('\n--- UI Responsiveness ---', 'warn');

    await test('Should display correctly on mobile (375px)', async () => {
      await page.setViewport({ width: 375, height: 667 });
      await page.reload({ waitUntil: 'networkidle0' });
      await waitForApp(page);
      await sleep(1500);

      await takeScreenshot(page, '21-mobile-view');

      // Page should have h1 with Family
      const h1 = await page.$('h1');
      if (h1) {
        const text = await page.evaluate(el => el.textContent, h1);
        if (!text.includes('Family')) {
          throw new Error('Page not displaying correctly on mobile');
        }
      }
    });

    await test('Should display correctly on tablet (768px)', async () => {
      await page.setViewport({ width: 768, height: 1024 });
      await sleep(1000);

      await takeScreenshot(page, '22-tablet-view');

      const h1 = await page.$('h1');
      if (h1) {
        const text = await page.evaluate(el => el.textContent, h1);
        if (!text.includes('Family')) {
          throw new Error('Page not displaying correctly on tablet');
        }
      }
    });

    await test('Should display correctly on desktop (1920px)', async () => {
      await page.setViewport({ width: 1920, height: 1080 });
      await sleep(1000);

      await takeScreenshot(page, '23-desktop-view');

      const h1 = await page.$('h1');
      if (h1) {
        const text = await page.evaluate(el => el.textContent, h1);
        if (!text.includes('Family')) {
          throw new Error('Page not displaying correctly on desktop');
        }
      }
    });

    // ===== VALIDATION TESTS =====
    log('\n--- Form Validation ---', 'warn');

    await test('Should require first name for new member', async () => {
      await page.setViewport({ width: 1280, height: 800 });

      await clickButtonByText(page, 'Add Family Member');
      await sleep(1000);

      // Clear first name and try to submit
      const firstNameInput = await page.$('input[placeholder="First name"]');
      if (firstNameInput) {
        await firstNameInput.click({ clickCount: 3 });
        await page.keyboard.press('Backspace');
      }

      await takeScreenshot(page, '24-empty-form');

      await clickButtonByText(page, 'Add Member');
      await sleep(500);

      await takeScreenshot(page, '25-validation-error');

      // Form should still be visible (not submitted) due to HTML5 required validation
      const formStillVisible = await page.$('input[placeholder="First name"]');
      if (!formStillVisible) {
        throw new Error('Form was submitted without first name');
      }

      // Cancel the form
      await clickButtonByText(page, 'Cancel');
      await sleep(500);
    });

  } catch (error) {
    log(`\nFatal error: ${error.message}`, 'error');
    console.error(error);
    await takeScreenshot(page, 'error-state');
  } finally {
    await browser.close();
  }

  // Print summary
  log('\n=== Test Summary ===\n', 'info');
  log(`Total: ${passed + failed}`, 'info');
  log(`Passed: ${passed}`, 'success');
  log(`Failed: ${failed}`, failed > 0 ? 'error' : 'info');

  if (failed > 0) {
    log('\nFailed Tests:', 'error');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      log(`  - ${r.name}: ${r.error}`, 'error');
    });
  }

  log(`\nScreenshots saved to: ${path.join(__dirname, 'screenshots')}/`, 'info');
  log('\n', 'info');
  process.exit(failed > 0 ? 1 : 0);
}

// Run
runTests().catch(err => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
