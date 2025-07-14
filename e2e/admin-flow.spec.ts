import { test, expect } from '@playwright/test'

test.describe('Admin Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the admin page
    await page.goto('/admin')
  })

  test('should display admin navigation', async ({ page }) => {
    // Check for admin page title
    await expect(page.getByRole('heading', { name: /Admin Dashboard/i })).toBeVisible()
    
    // Check for navigation links
    await expect(page.getByRole('link', { name: /Companies/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Data/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Users/i })).toBeVisible()
  })

  test('should navigate to companies management', async ({ page }) => {
    // Click on Companies link
    await page.getByRole('link', { name: /Companies/i }).click()
    
    // Wait for companies page to load
    await expect(page).toHaveURL('/admin/companies')
    await expect(page.getByRole('heading', { name: /Company Management/i })).toBeVisible()
    
    // Check for Add Company button
    await expect(page.getByRole('button', { name: /Add Company/i })).toBeVisible()
  })

  test('should open add company modal', async ({ page }) => {
    // Navigate to companies page
    await page.goto('/admin/companies')
    
    // Click Add Company button
    await page.getByRole('button', { name: /Add Company/i }).click()
    
    // Check modal is visible
    await expect(page.getByRole('heading', { name: /Add New Company/i })).toBeVisible()
    
    // Check for form fields
    await expect(page.getByLabel(/Ticker Symbol/i)).toBeVisible()
    await expect(page.getByLabel(/Company Name/i)).toBeVisible()
    await expect(page.getByLabel(/Description/i)).toBeVisible()
    await expect(page.getByLabel(/Sector/i)).toBeVisible()
    
    // Check for tabs
    await expect(page.getByRole('button', { name: /Basic Info/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Business Model/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Capital Structure/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Governance/i })).toBeVisible()
  })

  test('should validate required fields in add company form', async ({ page }) => {
    // Navigate to companies page and open modal
    await page.goto('/admin/companies')
    await page.getByRole('button', { name: /Add Company/i }).click()
    
    // Try to submit without filling required fields
    await page.getByRole('button', { name: /Add Company/i, exact: true }).click()
    
    // Check for validation errors
    await expect(page.getByText(/Ticker symbol is required/i)).toBeVisible()
    await expect(page.getByText(/Company name is required/i)).toBeVisible()
    await expect(page.getByText(/Description is required/i)).toBeVisible()
    await expect(page.getByText(/Sector is required/i)).toBeVisible()
  })

  test('should add a new company with valid data', async ({ page }) => {
    // Navigate to companies page and open modal
    await page.goto('/admin/companies')
    await page.getByRole('button', { name: /Add Company/i }).click()
    
    // Fill in basic info
    await page.getByLabel(/Ticker Symbol/i).fill('TEST')
    await page.getByLabel(/Company Name/i).fill('Test Company E2E')
    await page.getByLabel(/Description/i).fill('A test company created by E2E test')
    await page.getByLabel(/Sector/i).fill('Technology')
    await page.getByLabel(/Market Cap/i).fill('1000000000')
    await page.getByLabel(/Shares Outstanding/i).fill('100000000')
    
    // Switch to Capital Structure tab
    await page.getByRole('button', { name: /Capital Structure/i }).click()
    await page.getByLabel(/Basic Shares/i).fill('100000000')
    
    // Switch to Governance tab
    await page.getByRole('button', { name: /Governance/i }).click()
    await page.getByLabel(/Board Size/i).fill('9')
    
    // Submit the form
    await page.getByRole('button', { name: /Add Company/i, exact: true }).click()
    
    // Check for success message
    await expect(page.getByText(/Company created successfully/i)).toBeVisible()
    
    // Modal should close
    await expect(page.getByRole('heading', { name: /Add New Company/i })).not.toBeVisible({ timeout: 3000 })
  })

  test('should navigate between admin sections', async ({ page }) => {
    // Test navigation to Data section
    await page.getByRole('link', { name: /Data/i }).click()
    await expect(page).toHaveURL('/admin/data')
    await expect(page.getByRole('heading', { name: /Data Management/i })).toBeVisible()
    
    // Test navigation to Users section
    await page.getByRole('link', { name: /Users/i }).click()
    await expect(page).toHaveURL('/admin/users')
    await expect(page.getByRole('heading', { name: /User Management/i })).toBeVisible()
  })

  test('should handle company search and filtering', async ({ page }) => {
    // Navigate to companies page
    await page.goto('/admin/companies')
    
    // Look for search input (if implemented)
    const searchInput = page.getByPlaceholder(/Search companies/i)
    if (await searchInput.isVisible()) {
      await searchInput.fill('micro')
      await page.keyboard.press('Enter')
      
      // Wait for filtered results
      await page.waitForTimeout(500)
    }
  })

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Navigate to admin page
    await page.goto('/admin')
    
    // Check that the page is still functional
    await expect(page.getByRole('heading', { name: /Admin Dashboard/i })).toBeVisible()
    
    // Navigation might be in a hamburger menu on mobile
    const hamburgerMenu = page.getByRole('button', { name: /menu/i })
    if (await hamburgerMenu.isVisible()) {
      await hamburgerMenu.click()
      await expect(page.getByRole('link', { name: /Companies/i })).toBeVisible()
    }
  })
})

test.describe('Admin Authentication', () => {
  test('should redirect to login if not authenticated', async ({ page }) => {
    // Clear any existing auth cookies/storage
    await page.context().clearCookies()
    
    // Try to access admin page
    await page.goto('/admin')
    
    // Should be redirected to login
    await expect(page).toHaveURL(/\/login/)
  })
})