import { test, expect } from '@playwright/test';

test.describe('Wright - Markdown Editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.app', { timeout: 10000 });
    await page.waitForSelector('.milkdown', { timeout: 10000 });
  });

  async function openSidebar(page: any) {
    const sidebarVisible = await page.locator('.sidebar').isVisible();
    if (!sidebarVisible) {
      await page.click('[aria-label="Open sidebar"]');
      await page.waitForSelector('.sidebar', { timeout: 5000 });
    }
  }

  test.describe('Initial Load', () => {
    test('should display the app with main components', async ({ page }) => {
      await expect(page.locator('.toolbar')).toBeVisible();
      await expect(page.locator('.editor-wrapper')).toBeVisible();
      await expect(page.locator('.milkdown')).toBeVisible();
    });

    test('should have proper page title', async ({ page }) => {
      await expect(page).toHaveTitle(/Wright/);
    });

    test('should show sidebar toggle when sidebar is closed', async ({ page }) => {
      await expect(page.locator('[aria-label="Open sidebar"]')).toBeVisible();
    });
  });

  test.describe('Sidebar', () => {
    test('should toggle sidebar visibility', async ({ page }) => {
      // Open sidebar
      await page.click('[aria-label="Open sidebar"]');
      await expect(page.locator('.sidebar')).toBeVisible();

      // Close sidebar
      await page.click('[aria-label="Close sidebar"]');
      await expect(page.locator('.sidebar')).not.toBeVisible();
    });

    test('should create a new document', async ({ page }) => {
      await openSidebar(page);
      const initialCount = await page.locator('.document-item').count();

      await page.click('[aria-label="Create new document"]');
      await page.waitForTimeout(300);

      await expect(page.locator('.document-item')).toHaveCount(initialCount + 1);
    });

    test('should show settings button', async ({ page }) => {
      await openSidebar(page);
      await expect(page.locator('[aria-label="Open settings"]')).toBeVisible();
    });
  });

  test.describe('Document Management', () => {
    test('should rename a document', async ({ page }) => {
      // Click on the document title to edit it
      await page.click('[aria-label*="Document title"]');

      const titleInput = page.locator('.title-input');
      await expect(titleInput).toBeVisible();
      await titleInput.fill('My Document');
      await titleInput.press('Enter');

      await expect(page.locator('.title-btn')).toHaveText('My Document');
    });

    test('should switch between documents', async ({ page }) => {
      await openSidebar(page);
      await page.click('[aria-label="Create new document"]');
      await page.waitForTimeout(300);

      const firstDoc = page.locator('.document-item').first();
      await firstDoc.click();

      await expect(firstDoc).toHaveClass(/active/);
    });
  });

  test.describe('Editor', () => {
    test('should allow typing', async ({ page }) => {
      const editor = page.locator('.milkdown .ProseMirror').first();
      await editor.click();
      await page.keyboard.type('Hello Wright!');

      await expect(editor).toContainText('Hello Wright!');
    });

    test('should auto-save content', async ({ page }) => {
      const editor = page.locator('.milkdown .ProseMirror').first();
      await editor.click();
      await page.keyboard.type('Test content');

      await page.waitForTimeout(1500);
      await expect(page.locator('.save-status')).toContainText('Saved');
    });

    test('should update word count', async ({ page }) => {
      const editor = page.locator('.milkdown .ProseMirror').first();
      await editor.click();
      await page.keyboard.type('One two three four five');

      await page.waitForTimeout(500);
      await expect(page.locator('.stats')).toContainText('5 words');
    });

    test('should show reading time in proper format', async ({ page }) => {
      const editor = page.locator('.milkdown .ProseMirror').first();
      await editor.click();
      // Type enough words to generate some reading time
      await page.keyboard.type('This is a test paragraph with enough words to measure reading time properly.');

      await page.waitForTimeout(500);
      // Should show time in seconds or minutes format
      const statsText = await page.locator('.stats').textContent();
      expect(statsText).toMatch(/\d+s read|\d+m read|\d+m \d+s read/);
    });
  });

  test.describe('Theme', () => {
    test('should cycle through themes', async ({ page }) => {
      const themeBtn = page.locator('[aria-label="Change theme"]');
      await expect(themeBtn).toBeVisible();

      await themeBtn.click();
      await page.waitForTimeout(100);

      const theme = await page.locator('html').getAttribute('data-theme');
      expect(['light', 'dark']).toContain(theme);
    });
  });

  test.describe('Menu', () => {
    test('should open and close dropdown menu', async ({ page }) => {
      await page.click('[aria-label="More actions"]');
      await expect(page.locator('.dropdown-menu')).toBeVisible();

      // Click outside to close
      await page.click('.editor-wrapper');
      await expect(page.locator('.dropdown-menu')).not.toBeVisible();
    });

    test('should have import, export, and delete options', async ({ page }) => {
      await page.click('[aria-label="More actions"]');

      await expect(page.getByRole('menuitem', { name: 'Import' })).toBeVisible();
      await expect(page.getByRole('menuitem', { name: 'Export' })).toBeVisible();
      await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeVisible();
    });

    test('should open delete confirmation', async ({ page }) => {
      await page.click('[aria-label="More actions"]');
      await page.click('text=Delete');

      await expect(page.locator('[role="alertdialog"]')).toBeVisible();
    });
  });

  test.describe('Settings Modal', () => {
    test('should open and close settings', async ({ page }) => {
      await openSidebar(page);
      await page.click('[aria-label="Open settings"]');

      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();

      await page.click('[aria-label="Close settings"]');
      await expect(modal).not.toBeVisible();
    });

    test('should close with Escape key', async ({ page }) => {
      await openSidebar(page);
      await page.click('[aria-label="Open settings"]');
      await expect(page.locator('[role="dialog"]')).toBeVisible();

      await page.keyboard.press('Escape');
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    });
  });

  test.describe('Keyboard Shortcuts', () => {
    test('should save with Ctrl+S', async ({ page }) => {
      const editor = page.locator('.milkdown .ProseMirror').first();
      await editor.click();
      await page.keyboard.type('Test');

      await page.keyboard.press('Control+s');
      await page.waitForTimeout(300);

      await expect(page.locator('.save-status')).toContainText('Saved');
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper ARIA labels', async ({ page }) => {
      await expect(page.locator('[role="toolbar"]')).toHaveAttribute('aria-label', 'Document toolbar');
    });

    test('should have proper focus indicators', async ({ page }) => {
      await page.keyboard.press('Tab');
      const focusedElement = page.locator(':focus-visible');
      await expect(focusedElement).toBeVisible();
    });
  });

  test.describe('Responsive', () => {
    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await expect(page.locator('.app')).toBeVisible();
      await expect(page.locator('.editor-wrapper')).toBeVisible();
    });
  });
});
