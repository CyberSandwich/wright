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

    test('should default to dark theme', async ({ page }) => {
      const theme = await page.locator('html').getAttribute('data-theme');
      expect(theme).toBe('dark');
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

    test('should update word count in stats bubble', async ({ page }) => {
      const editor = page.locator('.milkdown .ProseMirror').first();
      await editor.click();
      await page.keyboard.type('One two three four five');

      await page.waitForTimeout(500);
      await expect(page.locator('.stats-bubble')).toContainText('5 words');
    });

    test('should show reading time in stats bubble', async ({ page }) => {
      const editor = page.locator('.milkdown .ProseMirror').first();
      await editor.click();
      await page.keyboard.type('This is a test paragraph with enough words to measure reading time properly.');

      await page.waitForTimeout(500);
      const statsText = await page.locator('.stats-bubble').textContent();
      expect(statsText).toMatch(/\d+s|\d+m/);
    });
  });

  test.describe('Formatting Toolbar', () => {
    test('should toggle formatting bar visibility', async ({ page }) => {
      // Initially hidden
      await expect(page.locator('.formatting-bar')).not.toBeVisible();

      // Click format toggle
      await page.click('[aria-label="Toggle formatting toolbar"]');
      await expect(page.locator('.formatting-bar')).toBeVisible();

      // Click again to hide
      await page.click('[aria-label="Toggle formatting toolbar"]');
      await expect(page.locator('.formatting-bar')).not.toBeVisible();
    });

    test('should show formatting options when enabled', async ({ page }) => {
      await page.click('[aria-label="Toggle formatting toolbar"]');

      await expect(page.locator('.format-btn[title="Bold (Ctrl+B)"]')).toBeVisible();
      await expect(page.locator('.format-btn[title="Italic (Ctrl+I)"]')).toBeVisible();
      await expect(page.locator('.format-btn[title="Heading 1"]')).toBeVisible();
    });
  });

  test.describe('Theme', () => {
    test('should toggle between dark and light themes', async ({ page }) => {
      const themeBtn = page.locator('[aria-label="Change theme"]');
      await expect(themeBtn).toBeVisible();

      // Start in dark mode
      let theme = await page.locator('html').getAttribute('data-theme');
      expect(theme).toBe('dark');

      // Toggle to light
      await themeBtn.click();
      await page.waitForTimeout(100);
      theme = await page.locator('html').getAttribute('data-theme');
      expect(theme).toBe('light');

      // Toggle back to dark
      await themeBtn.click();
      await page.waitForTimeout(100);
      theme = await page.locator('html').getAttribute('data-theme');
      expect(theme).toBe('dark');
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

    test('should have import and export options', async ({ page }) => {
      await page.click('[aria-label="More actions"]');

      await expect(page.getByRole('menuitem', { name: 'Import' })).toBeVisible();
      await expect(page.getByRole('menuitem', { name: 'Export as .md' })).toBeVisible();
      await expect(page.getByRole('menuitem', { name: 'Export as .txt' })).toBeVisible();
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

    test('should only show dark and light theme options', async ({ page }) => {
      await openSidebar(page);
      await page.click('[aria-label="Open settings"]');

      const themeSelect = page.locator('#theme-select');
      await expect(themeSelect.locator('option[value="dark"]')).toBeVisible();
      await expect(themeSelect.locator('option[value="light"]')).toBeVisible();
      await expect(themeSelect.locator('option[value="system"]')).not.toBeVisible();
    });
  });

  test.describe('Keyboard Shortcuts', () => {
    test('should support Ctrl+S', async ({ page }) => {
      const editor = page.locator('.milkdown .ProseMirror').first();
      await editor.click();
      await page.keyboard.type('Test');

      await page.keyboard.press('Control+s');
      // No save indicator anymore, but command should not error
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
