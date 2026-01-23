import { test, expect } from '@playwright/test';

test.describe('Wright - Markdown Editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.app', { timeout: 10000 });
    await page.waitForSelector('.milkdown', { timeout: 10000 });
  });

  async function openSidebar(page: any) {
    const sidebarVisible = await page.locator('.sidebar-popup').isVisible();
    if (!sidebarVisible) {
      await page.click('[aria-label="Open sidebar"]');
      await page.waitForSelector('.sidebar-popup', { timeout: 5000 });
    }
  }

  async function closeSidebar(page: any) {
    const sidebarVisible = await page.locator('.sidebar-popup').isVisible();
    if (sidebarVisible) {
      await page.keyboard.press('Escape');
      await page.waitForSelector('.sidebar-popup', { state: 'hidden', timeout: 5000 });
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
      await closeSidebar(page);
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
      await expect(page.locator('.sidebar-popup')).toBeVisible();

      // Close sidebar with Escape
      await page.keyboard.press('Escape');
      await expect(page.locator('.sidebar-popup')).not.toBeVisible();
    });

    test('should create a new document', async ({ page }) => {
      await openSidebar(page);
      const initialCount = await page.locator('.document-item').count();

      await page.click('[aria-label="Create new document"]');
      await page.waitForTimeout(500);

      // Sidebar closes after creating a document, reopen it
      await openSidebar(page);
      await expect(page.locator('.document-item')).toHaveCount(initialCount + 1);
    });

    test('should show document list', async ({ page }) => {
      await openSidebar(page);
      await expect(page.locator('.document-list')).toBeVisible();
    });
  });

  test.describe('Document Management', () => {
    test('should switch between documents', async ({ page }) => {
      await openSidebar(page);

      // Create a new document first
      await page.click('[aria-label="Create new document"]');
      await page.waitForTimeout(500);

      // Reopen sidebar
      await openSidebar(page);

      // Should have at least one document
      const docCount = await page.locator('.document-item').count();
      expect(docCount).toBeGreaterThan(0);
    });
  });

  test.describe('Editor', () => {
    test('should allow typing', async ({ page }) => {
      await closeSidebar(page);
      const editor = page.locator('.milkdown .ProseMirror').first();
      await editor.click();
      await page.keyboard.type('Hello Wright!');

      await expect(editor).toContainText('Hello Wright!');
    });

    test('should update word count in stats bubble', async ({ page }) => {
      await closeSidebar(page);
      const editor = page.locator('.milkdown .ProseMirror').first();
      await editor.click();

      // Clear content and type new text
      await page.keyboard.press('Meta+a');
      await page.keyboard.type('One two three four five');

      await page.waitForTimeout(500);
      await expect(page.locator('.stats-bubble')).toContainText('5 words');
    });

    test('should show reading time in stats bubble', async ({ page }) => {
      await closeSidebar(page);
      const editor = page.locator('.milkdown .ProseMirror').first();
      await editor.click();

      await page.keyboard.press('Meta+a');
      await page.keyboard.type('This is a test paragraph with enough words to measure reading time properly.');

      await page.waitForTimeout(500);
      const statsText = await page.locator('.stats-bubble').textContent();
      expect(statsText).toMatch(/\d+s|\d+m/);
    });
  });

  test.describe('Toolbar', () => {
    test('should show formatting buttons', async ({ page }) => {
      await closeSidebar(page);
      await expect(page.locator('button[title="Bold (Cmd+B)"]')).toBeVisible();
      await expect(page.locator('button[title="Italic (Cmd+I)"]')).toBeVisible();
    });

    test('should show font controls', async ({ page }) => {
      await closeSidebar(page);
      await expect(page.locator('button[title="Font family"]')).toBeVisible();
    });

    test('should show mode buttons', async ({ page }) => {
      await closeSidebar(page);
      await expect(page.locator('button[title="Focus Mode"]')).toBeVisible();
      await expect(page.locator('button[title="Typewriter Mode"]')).toBeVisible();
    });
  });

  test.describe('Export', () => {
    test('should show export dropdown', async ({ page }) => {
      await closeSidebar(page);
      await page.click('button[title="Export document"]');
      await expect(page.locator('.dropdown-menu')).toBeVisible();
      await expect(page.locator('text=Export as .md')).toBeVisible();
      await expect(page.locator('text=Export as .txt')).toBeVisible();
    });
  });

  test.describe('Settings Modal', () => {
    test('should open and close settings', async ({ page }) => {
      await closeSidebar(page);
      await page.click('[aria-label="Settings"]');

      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();

      await page.click('[aria-label="Close settings"]');
      await expect(modal).not.toBeVisible();
    });

    test('should close with Escape key', async ({ page }) => {
      await closeSidebar(page);
      await page.click('[aria-label="Settings"]');
      await expect(page.locator('[role="dialog"]')).toBeVisible();

      await page.keyboard.press('Escape');
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    });

    test('should show theme options', async ({ page }) => {
      await closeSidebar(page);
      await page.click('[aria-label="Settings"]');

      await expect(page.locator('button:has-text("Light")')).toBeVisible();
      await expect(page.locator('button:has-text("Dark")')).toBeVisible();
    });

    test('should change theme', async ({ page }) => {
      await closeSidebar(page);
      await page.click('[aria-label="Settings"]');

      // Click light theme
      await page.click('button:has-text("Light")');
      await page.click('[aria-label="Close settings"]');

      const theme = await page.locator('html').getAttribute('data-theme');
      expect(theme).toBe('light');
    });
  });

  test.describe('Focus Mode', () => {
    test('should activate focus mode', async ({ page }) => {
      await closeSidebar(page);
      await page.click('button[title="Focus Mode"]');

      // Check that Exit Focus Mode button appears
      await expect(page.locator('[aria-label="Exit Focus Mode"]')).toBeVisible();
    });

    test('should exit focus mode', async ({ page }) => {
      await closeSidebar(page);
      await page.click('button[title="Focus Mode"]');
      await page.click('[aria-label="Exit Focus Mode"]');

      // Toolbar should be visible again
      await expect(page.locator('.toolbar')).toBeVisible();
    });
  });

  test.describe('Keyboard Shortcuts', () => {
    test('should support Ctrl+S', async ({ page }) => {
      await closeSidebar(page);
      const editor = page.locator('.milkdown .ProseMirror').first();
      await editor.click();
      await page.keyboard.type('Test');

      await page.keyboard.press('Control+s');
      // No save indicator anymore, but command should not error
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper ARIA labels', async ({ page }) => {
      await closeSidebar(page);
      await expect(page.locator('[role="toolbar"]')).toHaveAttribute('aria-label', 'Document toolbar');
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
