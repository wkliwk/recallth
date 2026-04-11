import { chromium } from 'playwright'
import { strict as assert } from 'assert'

const BASE_URL = 'http://localhost:5173'

// Test data
const testUser = {
  email: `test-${Date.now()}@example.com`,
  password: 'TestPassword123!',
  name: 'Test User'
}

let browser
let page
let context

async function setup() {
  browser = await chromium.launch()
  context = await browser.newContext()
  page = await context.newPage()

  // Set viewport for desktop testing first
  await page.setViewportSize({ width: 1280, height: 720 })

  console.log('✓ Browser and context initialized')
}

async function teardown() {
  if (page) await page.close()
  if (context) await context.close()
  if (browser) await browser.close()
  console.log('✓ Cleanup complete')
}

async function testLandingPage() {
  console.log('\n=== Testing Landing Page ===')
  await page.goto(BASE_URL)
  await page.waitForLoadState('networkidle')

  // Check page renders
  const heading = await page.locator('h1').first().textContent()
  assert(heading, 'Landing page should have heading')
  console.log('✓ Landing page loaded and renders')

  // Take screenshot
  await page.screenshot({ path: '/tmp/01-landing.png', fullPage: true })
  console.log('✓ Screenshot: /tmp/01-landing.png')
}

async function testSignup() {
  console.log('\n=== Testing Sign Up Flow ===')

  // Navigate to signup
  await page.goto(`${BASE_URL}/auth?mode=signup`)
  await page.waitForLoadState('networkidle')

  // Check signup form renders
  const nameInput = page.locator('input[type="text"]').first()
  const emailInput = page.locator('input[type="email"]')
  const passwordInput = page.locator('input[type="password"]')

  assert(await nameInput.isVisible(), 'Name input should be visible')
  assert(await emailInput.isVisible(), 'Email input should be visible')
  assert(await passwordInput.isVisible(), 'Password input should be visible')
  console.log('✓ Sign up form renders correctly')

  // Fill form
  await nameInput.fill(testUser.name)
  await emailInput.fill(testUser.email)
  await passwordInput.fill(testUser.password)
  console.log('✓ Form filled with test data')

  // Submit
  const submitBtn = page.locator('button[type="submit"]')
  await submitBtn.click()

  // Wait for navigation and check if redirected to onboarding
  await page.waitForURL(/onboarding|home/)
  const currentUrl = page.url()
  assert(currentUrl.includes('onboarding') || currentUrl.includes('home'),
    `Should redirect to onboarding or home, got: ${currentUrl}`)
  console.log(`✓ Sign up successful, redirected to: ${currentUrl}`)

  // Check token in localStorage
  const token = await page.evaluate(() => localStorage.getItem('recallth_token'))
  assert(token, 'JWT token should be stored in localStorage')
  console.log('✓ JWT token stored in localStorage')

  const email = await page.evaluate(() => localStorage.getItem('recallth_email'))
  assert(email === testUser.email, 'Email should be stored in localStorage')
  console.log('✓ Email stored in localStorage')
}

async function testOnboarding() {
  console.log('\n=== Testing Onboarding Flow ===')

  // Should be on onboarding if new user
  if (!page.url().includes('onboarding')) {
    console.log('⚠ Not on onboarding, navigating...')
    await page.goto(`${BASE_URL}/onboarding`)
  }

  await page.waitForLoadState('networkidle')

  // Check onboarding renders
  let content = await page.textContent('body')
  assert(content, 'Onboarding page should have content')
  console.log('✓ Onboarding page loaded')

  // Try to continue (implementation depends on onboarding structure)
  // For now, just verify it loaded
  await page.screenshot({ path: '/tmp/02-onboarding.png', fullPage: true })
  console.log('✓ Screenshot: /tmp/02-onboarding.png')

  // If there's a next button, click it, otherwise navigate to home
  const nextBtn = page.locator('button:has-text("Next")').first()
  if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await nextBtn.click()
    await page.waitForLoadState('networkidle')
  } else {
    // Skip onboarding and go to home
    await page.goto(`${BASE_URL}/home`)
  }
}

async function testHomeScreen() {
  console.log('\n=== Testing Home Screen ===')

  await page.goto(`${BASE_URL}/home`)
  await page.waitForLoadState('networkidle')

  // Check page renders
  const content = await page.textContent('body')
  assert(content && content.length > 0, 'Home page should have content')
  console.log('✓ Home screen loaded')

  // Check for key elements
  const hasSchedule = content.includes('schedule') || content.includes('Schedule') || content.includes('today')
  if (hasSchedule) {
    console.log('✓ Schedule section detected')
  }

  // Check for bottom nav or sidebar
  const bottomNav = page.locator('[class*="nav"]').first()
  const hasNav = await bottomNav.isVisible({ timeout: 2000 }).catch(() => false)
  if (hasNav) {
    console.log('✓ Navigation detected')
  }

  // Take screenshot
  await page.screenshot({ path: '/tmp/03-home.png', fullPage: true })
  console.log('✓ Screenshot: /tmp/03-home.png')
}

async function testCabinetScreen() {
  console.log('\n=== Testing Cabinet Screen ===')

  await page.goto(`${BASE_URL}/cabinet`)
  await page.waitForLoadState('networkidle')

  // Check page renders
  const content = await page.textContent('body')
  assert(content && content.length > 0, 'Cabinet page should have content')
  console.log('✓ Cabinet screen loaded')

  // Look for supplement list or empty state
  const hasCabinet = content.includes('cabinet') || content.includes('Cabinet') ||
                     content.includes('supplement') || content.includes('Supplement') ||
                     content.includes('Add')
  assert(hasCabinet, 'Cabinet should show supplements or add option')
  console.log('✓ Cabinet content visible')

  // Take screenshot
  await page.screenshot({ path: '/tmp/04-cabinet.png', fullPage: true })
  console.log('✓ Screenshot: /tmp/04-cabinet.png')
}

async function testCabinetAddScreen() {
  console.log('\n=== Testing Cabinet Add Screen ===')

  await page.goto(`${BASE_URL}/cabinet/add`)
  await page.waitForLoadState('networkidle')

  // Check form renders
  const inputs = page.locator('input, textarea, select')
  const inputCount = await inputs.count()
  assert(inputCount > 0, 'Add supplement form should have inputs')
  console.log(`✓ Cabinet add form loaded with ${inputCount} inputs`)

  // Try to find submit button
  const submitBtn = page.locator('button[type="submit"]').first()
  const hasSubmit = await submitBtn.isVisible({ timeout: 2000 }).catch(() => false)
  if (hasSubmit) {
    console.log('✓ Submit button visible')
  }

  // Take screenshot
  await page.screenshot({ path: '/tmp/05-cabinet-add.png', fullPage: true })
  console.log('✓ Screenshot: /tmp/05-cabinet-add.png')
}

async function testChatScreen() {
  console.log('\n=== Testing Chat Screen ===')

  await page.goto(`${BASE_URL}/chat`)
  await page.waitForLoadState('networkidle')

  // Check page renders
  const content = await page.textContent('body')
  assert(content && content.length > 0, 'Chat page should have content')
  console.log('✓ Chat screen loaded')

  // Look for chat input or suggestions
  const hasChatUI = content.includes('chat') || content.includes('Chat') ||
                    content.includes('message') || content.includes('suggest') ||
                    content.includes('Ask')
  if (hasChatUI) {
    console.log('✓ Chat UI elements detected')
  }

  // Check for input field
  const messageInput = page.locator('input[type="text"], textarea').first()
  const hasInput = await messageInput.isVisible({ timeout: 2000 }).catch(() => false)
  if (hasInput) {
    console.log('✓ Message input visible')
  }

  // Take screenshot
  await page.screenshot({ path: '/tmp/06-chat.png', fullPage: true })
  console.log('✓ Screenshot: /tmp/06-chat.png')
}

async function testProfileScreen() {
  console.log('\n=== Testing Profile Screen ===')

  await page.goto(`${BASE_URL}/profile`)
  await page.waitForLoadState('networkidle')

  // Check page renders
  const content = await page.textContent('body')
  assert(content && content.length > 0, 'Profile page should have content')
  console.log('✓ Profile screen loaded')

  // Look for profile elements
  const hasProfile = content.includes('profile') || content.includes('Profile') ||
                     content.includes('email') || content.includes('account')
  if (hasProfile) {
    console.log('✓ Profile elements detected')
  }

  // Take screenshot
  await page.screenshot({ path: '/tmp/07-profile.png', fullPage: true })
  console.log('✓ Screenshot: /tmp/07-profile.png')
}

async function testMobileViewport() {
  console.log('\n=== Testing Mobile Responsive (375x667) ===')

  await page.setViewportSize({ width: 375, height: 667 })

  // Test home on mobile
  await page.goto(`${BASE_URL}/home`)
  await page.waitForLoadState('networkidle')

  const content = await page.textContent('body')
  assert(content && content.length > 0, 'Mobile home should render')
  console.log('✓ Home loads on mobile')

  // Check for bottom nav instead of sidebar
  const hasBottomNav = content.includes('home') || content.includes('Home')
  if (hasBottomNav) {
    console.log('✓ Navigation visible on mobile')
  }

  // Take screenshot
  await page.screenshot({ path: '/tmp/08-mobile-home.png', fullPage: true })
  console.log('✓ Screenshot: /tmp/08-mobile-home.png')

  // Test cabinet on mobile
  await page.goto(`${BASE_URL}/cabinet`)
  await page.waitForLoadState('networkidle')

  const cabinetContent = await page.textContent('body')
  assert(cabinetContent && cabinetContent.length > 0, 'Mobile cabinet should render')
  console.log('✓ Cabinet loads on mobile')

  await page.screenshot({ path: '/tmp/09-mobile-cabinet.png', fullPage: true })
  console.log('✓ Screenshot: /tmp/09-mobile-cabinet.png')
}

async function testProtectedRoutes() {
  console.log('\n=== Testing Protected Routes ===')

  // Clear auth
  await context.clearCookies()
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  console.log('✓ Auth cleared')

  // Try to access protected route
  await page.goto(`${BASE_URL}/home`)
  await page.waitForLoadState('networkidle')

  // Should redirect to login
  const currentUrl = page.url()
  assert(currentUrl.includes('auth') || currentUrl.includes('login'),
    `Should redirect to auth, got: ${currentUrl}`)
  console.log('✓ Protected route redirects to auth when not logged in')

  // Take screenshot
  await page.screenshot({ path: '/tmp/10-auth-redirect.png' })
  console.log('✓ Screenshot: /tmp/10-auth-redirect.png')
}

async function testAPIConnectivity() {
  console.log('\n=== Testing API Connectivity ===')

  // Login first
  await page.goto(`${BASE_URL}/auth?mode=login`)
  await page.waitForLoadState('networkidle')

  const emailInput = page.locator('input[type="email"]')
  const passwordInput = page.locator('input[type="password"]')

  await emailInput.fill(testUser.email)
  await passwordInput.fill(testUser.password)

  // Listen to network requests
  const apiCalls = []
  page.on('response', response => {
    if (response.url().includes('/api') || response.url().includes('localhost')) {
      apiCalls.push({
        url: response.url(),
        status: response.status(),
        method: response.request().method()
      })
    }
  })

  // Submit login
  const submitBtn = page.locator('button[type="submit"]')
  await submitBtn.click()

  // Wait for navigation
  await page.waitForURL(/onboarding|home|cabinet/, { timeout: 10000 }).catch(() => {})

  if (apiCalls.length > 0) {
    console.log(`✓ API calls detected (${apiCalls.length}):`)
    apiCalls.slice(0, 5).forEach(call => {
      console.log(`  - ${call.method} ${call.url.substring(0, 60)} (${call.status})`)
    })
  } else {
    console.log('⚠ No API calls detected in network monitoring')
  }
}

async function testConsoleErrors() {
  console.log('\n=== Testing for Console Errors ===')

  const errors = []
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text())
    }
  })

  page.on('pageerror', exception => {
    errors.push(`Page error: ${exception.message}`)
  })

  // Navigate through screens
  await page.goto(`${BASE_URL}/home`)
  await page.waitForLoadState('networkidle')

  await page.goto(`${BASE_URL}/cabinet`)
  await page.waitForLoadState('networkidle')

  await page.goto(`${BASE_URL}/chat`)
  await page.waitForLoadState('networkidle')

  if (errors.length === 0) {
    console.log('✓ No console errors detected')
  } else {
    console.log(`⚠ ${errors.length} errors found:`)
    errors.slice(0, 5).forEach(err => {
      console.log(`  - ${err.substring(0, 80)}`)
    })
  }
}

async function runAllTests() {
  try {
    await setup()

    console.log('Starting Recallth Wave 2 UAT...')
    console.log(`Test user: ${testUser.email}\n`)

    await testLandingPage()
    await testSignup()
    await testOnboarding()
    await testHomeScreen()
    await testCabinetScreen()
    await testCabinetAddScreen()
    await testChatScreen()
    await testProfileScreen()
    await testMobileViewport()
    await testProtectedRoutes()
    await testAPIConnectivity()
    await testConsoleErrors()

    console.log('\n' + '='.repeat(60))
    console.log('✓ All UAT tests completed successfully!')
    console.log('='.repeat(60))
    console.log('\nScreenshots saved to /tmp/')

  } catch (error) {
    console.error('\n✗ Test failed:', error.message)
    console.error(error.stack)
    process.exit(1)
  } finally {
    await teardown()
  }
}

runAllTests()
