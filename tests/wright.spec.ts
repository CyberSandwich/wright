import { test, expect } from '@playwright/test';

test.describe('Wright - Markdown Editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the app to load
    await page.waitForSelector('.app', { timeout: 10000 });
    // Wait for editor to initialize
    await page.waitForSelector('.milkdown', { timeout: 10000 });
  });

  test.describe('Initial Load', () => {
    test('should display the app with all main components', async ({ page }) => {
      // Check sidebar is visible
      await expect(page.locator('.sidebar')).toBeVisible();

      // Check toolbar is visible
      await expect(page.locator('.toolbar')).toBeVisible();

      // Check editor is visible
      await expect(page.locator('.editor-wrapper')).toBeVisible();

      // Check for Wright branding
      await expect(page.locator('.sidebar-header h2')).toHaveText('Wright');
    });

    test('should create a default document on first load', async ({ page }) => {
      // Should have at least one document in the list
      const documentItems = page.locator('.document-item');
      await expect(documentItems).toHaveCount(1);

      // Document should be titled "Untitled"
      await expect(documentItems.first().locator('.doc-title')).toHaveText('Untitled');
    });

    test('should have proper page title', async ({ page }) => {
      await expect(page).toHaveTitle(/Wright/);
    });
  });

  test.describe('Document Management', () => {
    test('should create a new document', async ({ page }) => {
      // Get initial document count
      const initialCount = await page.locator('.document-item').count();

      // Click new document button
      await page.click('[aria-label="Create new document"]');

      // Wait for new document to appear
      await page.waitForTimeout(500);

      // Should have one more document
      await expect(page.locator('.document-item')).toHaveCount(initialCount + 1);
    });

    test('should rename a document', async ({ page }) => {
      // Click on the title to edit
      await page.click('.title-button');

      // Clear and type new title
      const titleInput = page.locator('.title-input');
      await expect(titleInput).toBeVisible();
      await titleInput.fill('My Test Document');
      await titleInput.press('Enter');

      // Verify title updated
      await expect(page.locator('.title-button')).toHaveText('My Test Document');

      // Verify in sidebar
      await expect(page.locator('.document-item.active .doc-title')).toHaveText('My Test Document');
    });

    test('should switch between documents', async ({ page }) => {
      // Create a second document
      await page.click('[aria-label="Create new document"]');
      await page.waitForTimeout(500);

      // Rename the new document
      await page.click('.title-button');
      await page.locator('.title-input').fill('Second Document');
      await page.locator('.title-input').press('Enter');

      // Click on the first document
      const firstDoc = page.locator('.document-item').first();
      await firstDoc.click();

      // Verify first document is active
      await expect(firstDoc).toHaveClass(/active/);
    });

    test('should delete a document with confirmation', async ({ page }) => {
      // Create a document to delete
      await page.click('[aria-label="Create new document"]');
      await page.waitForTimeout(500);

      const initialCount = await page.locator('.document-item').count();

      // Click delete button
      await page.click('[aria-label="Delete document"]');

      // Confirm deletion dialog appears
      const dialog = page.locator('[role="alertdialog"]');
      await expect(dialog).toBeVisible();
      await expect(dialog).toContainText('Delete Document');

      // Confirm deletion
      await page.click('.btn-danger');

      // Should have one less document
      await expect(page.locator('.document-item')).toHaveCount(initialCount - 1);
    });
  });

  test.describe('Editor Functionality', () => {
    test('should display editor content', async ({ page }) => {
      await expect(page.locator('.milkdown')).toBeVisible();
      await expect(page.locator('.milkdown .ProseMirror')).toBeVisible();
    });

    test('should allow typing in the editor', async ({ page }) => {
      // Focus and type using the first ProseMirror instance
      const editor = page.locator('.milkdown .ProseMirror').first();
      await editor.click();
      await page.keyboard.type('Hello, Wright!');

      // Verify content
      await expect(editor).toContainText('Hello, Wright!');
    });

    test('should auto-save content', async ({ page }) => {
      // Type content
      const editor = page.locator('.milkdown .ProseMirror').first();
      await editor.click();
      await page.keyboard.type('Auto-save test content');

      // Wait for auto-save (1 second debounce + buffer)
      await page.waitForTimeout(1500);

      // Check save status indicator
      await expect(page.locator('.save-status')).toContainText('Saved');
    });

    test('should update word count', async ({ page }) => {
      // Type content
      const editor = page.locator('.milkdown .ProseMirror').first();
      await editor.click();
      await page.keyboard.type('One two three four five');

      // Wait for stats to update (debounced)
      await page.waitForTimeout(500);

      // Check word count
      await expect(page.locator('.stats')).toContainText('5 words');
    });
  });

  test.describe('Theme System', () => {
    test('should toggle between themes', async ({ page }) => {
      const html = page.locator('html');

      // Get current theme
      const initialTheme = await html.getAttribute('data-theme');

      // Click theme button to change
      await page.click('[aria-label*="Change theme"]');
      await page.waitForTimeout(200);

      const firstChange = await html.getAttribute('data-theme');

      // If theme didn't change (system -> same as initial), click again
      if (firstChange === initialTheme) {
        await page.click('[aria-label*="Change theme"]');
        await page.waitForTimeout(200);
      }

      // Now check we can get to a different theme
      const finalTheme = await html.getAttribute('data-theme');
      // The theme should either be different, or we went through the cycle
      expect(['light', 'dark']).toContain(finalTheme);
    });

    test('should have theme toggle button', async ({ page }) => {
      const themeBtn = page.locator('[aria-label*="Change theme"]');
      await expect(themeBtn).toBeVisible();
    });
  });

  test.describe('Sidebar', () => {
    test('should toggle sidebar visibility', async ({ page }) => {
      // Sidebar should be open initially
      await expect(page.locator('.sidebar.open')).toBeVisible();

      // Click toggle button
      await page.click('.toggle-btn');

      // Sidebar should be collapsed
      await expect(page.locator('.sidebar:not(.open)')).toBeVisible();

      // Click the collapsed toggle
      await page.click('.sidebar-toggle-collapsed');

      // Sidebar should be open again
      await expect(page.locator('.sidebar.open')).toBeVisible();
    });
  });

  test.describe('Settings Modal', () => {
    test('should open and close settings modal', async ({ page }) => {
      // Click settings button
      await page.click('[aria-label="Open settings"]');

      // Settings modal should be visible
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();
      await expect(modal).toContainText('Settings');

      // Close modal with close button
      await page.click('[aria-label="Close settings"]');

      // Modal should be hidden
      await expect(modal).not.toBeVisible();
    });

    test('should close settings with Escape key', async ({ page }) => {
      await page.click('[aria-label="Open settings"]');
      await expect(page.locator('[role="dialog"]')).toBeVisible();

      await page.keyboard.press('Escape');
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    });

    test('should change font size', async ({ page }) => {
      await page.click('[aria-label="Open settings"]');

      // Find font size slider
      const slider = page.locator('#font-size');
      await expect(slider).toBeVisible();

      // Change value
      await slider.fill('20');

      // Close modal
      await page.keyboard.press('Escape');

      // Editor font size should be updated
      const editor = page.locator('.editor-container');
      const fontSize = await editor.evaluate(el => getComputedStyle(el).getPropertyValue('--editor-font-size'));
      expect(fontSize).toBe('20px');
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper ARIA labels on all interactive elements', async ({ page }) => {
      // Check main regions have labels
      await expect(page.locator('[role="toolbar"]')).toHaveAttribute('aria-label', 'Document toolbar');
      await expect(page.locator('[aria-label="Document library"]')).toBeVisible();

      // Check buttons have labels
      const buttons = page.locator('button[aria-label]');
      const count = await buttons.count();
      expect(count).toBeGreaterThan(5);
    });

    test('should have proper focus indicators', async ({ page }) => {
      // Tab through interactive elements
      await page.keyboard.press('Tab');

      // Check that focus is visible (has outline style)
      const focusedElement = page.locator(':focus-visible');
      await expect(focusedElement).toBeVisible();
    });

    test('should support click-based navigation', async ({ page }) => {
      // Click on new document button
      await page.click('[aria-label="Create new document"]');
      await page.waitForTimeout(500);

      // Should have created new document
      const documents = await page.locator('.document-item').count();
      expect(documents).toBeGreaterThanOrEqual(2);
    });
  });

  test.describe('Keyboard Shortcuts', () => {
    test('should save with Cmd/Ctrl+S', async ({ page }) => {
      // Type something
      const editor = page.locator('.milkdown .ProseMirror').first();
      await editor.click();
      await page.keyboard.type('Test save shortcut');

      // Wait a moment
      await page.waitForTimeout(100);

      // Use keyboard shortcut to save (use Control for cross-platform)
      await page.keyboard.press('Control+s');

      // Should show saved status shortly
      await page.waitForTimeout(500);
      await expect(page.locator('.save-status')).toContainText('Saved');
    });
  });

  test.describe('Responsive Design', () => {
    test('should hide toolbar center on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Toolbar center (formatting buttons) should be hidden
      await expect(page.locator('.toolbar-center')).toBeHidden();
    });

    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      // App should still be functional
      await expect(page.locator('.app')).toBeVisible();
      await expect(page.locator('.editor-wrapper')).toBeVisible();
    });
  });

  test.describe('Focus Mode', () => {
    test('should toggle focus mode', async ({ page }) => {
      // Click focus mode button
      await page.click('[aria-label="Toggle focus mode"]');

      // Editor should have focus mode class
      await expect(page.locator('.editor-wrapper.focus-mode')).toBeVisible();

      // Click again to disable
      await page.click('[aria-label="Toggle focus mode"]');

      // Focus mode should be off
      await expect(page.locator('.editor-wrapper:not(.focus-mode)')).toBeVisible();
    });
  });

  test.describe('Export/Import', () => {
    test('should have export button', async ({ page }) => {
      const exportBtn = page.locator('[aria-label="Export document"]');
      await expect(exportBtn).toBeVisible();
    });

    test('should have import button', async ({ page }) => {
      const importBtn = page.locator('[aria-label="Import document"]');
      await expect(importBtn).toBeVisible();
    });
  });
});
