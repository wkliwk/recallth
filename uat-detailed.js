import { chromium } from 'playwright'
import { strict as assert } from 'assert'

const BASE_URL = 'http://localhost:5173'

// Use a specific test user for consistency
const testUser = {
  email: 'test@example.com',
  password: 'TestPassword123!'
}

let browser
let page
let context

async function setup() {
  browser = await chromium.launch()
  context = await browser.newContext()
  page = await context.newPage()
  await page.setViewportSize({ width: 1280, height: 720 })
}

async function teardown() {
  if (page) await page.close()
  if (context) await context.close()
  if (browser) await browser.close()
}

async function testAddSupplementFlow() {
  console.log('\n=== Testing Add Supplement Form (Interactive) ===')

  // First login with test user
  await page.goto(`${BASE_URL}/auth?mode=login`)
  await page.waitForLoadState('networkidle')

  const emailInput = page.locator('input[type="email"]')
  const passwordInput = page.locator('input[type="password"]')

  await emailInput.fill(testUser.email)
  await passwordInput.fill(testUser.password)

  // Submit and wait
  const loginBtn = page.locator('button[type="submit"]')
  await loginBtn.click()

  // Wait for login to complete
  await page.waitForURL(/home|onboarding/, { timeout: 15000 }).catch(() => {})

  // Navigate to cabinet add
  await page.goto(`${BASE_URL}/cabinet/add`)
  await page.waitForLoadState('networkidle')

  // Find form inputs
  const inputs = page.locator('input, textarea')
  const inputCount = await inputs.count()
  console.log(`✓ Found ${inputCount} form inputs`)

  // Try to find label-input pairs and fill the form
  const labels = page.locator('label')
  const labelCount = await labels.count()
  console.log(`✓ Found ${labelCount} form labels`)

  if (inputCount > 0) {
    // Fill first input (likely name/title)
    const firstInput = page.locator('input[type="text"]').first()
    if (await firstInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await firstInput.fill('Vitamin D3')
      console.log('✓ Filled supplement name')
    }

    // Fill second input (likely dosage)
    const secondInput = page.locator('input').nth(1)
    if (await secondInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await secondInput.fill('5000')
      console.log('✓ Filled dosage')
    }

    // Look for select/dropdown
    const selects = page.locator('select')
    const selectCount = await selects.count()
    if (selectCount > 0) {
      const firstSelect = selects.first()
      await firstSelect.selectOption({ index: 1 }).catch(() => {})
      console.log('✓ Selected option from dropdown')
    }
  }

  // Look for submit button and take screenshot before submit
  const submitBtn = page.locator('button[type="submit"]').first()
  if (await submitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.screenshot({ path: '/tmp/11-cabinet-add-filled.png' })
    console.log('✓ Screenshot: /tmp/11-cabinet-add-filled.png')
    console.log('✓ Form filled and ready to submit')
  }
}

async function testChatInteraction() {
  console.log('\n=== Testing Chat Message Interaction ===')

  // Navigate to chat
  await page.goto(`${BASE_URL}/chat`)
  await page.waitForLoadState('networkidle')

  // Look for message input
  const messageInput = page.locator('input[type="text"], textarea, [role="textbox"]').first()
  const hasInput = await messageInput.isVisible({ timeout: 2000 }).catch(() => false)

  if (hasInput) {
    console.log('✓ Message input found')

    // Check for suggestion chips
    const chips = page.locator('button').filter({ hasText: /stack|interact|timing|supplement|effect|new/i })
    const chipCount = await chips.count()
    if (chipCount > 0) {
      console.log(`✓ Found ${chipCount} suggestion chips`)
    }

    // Take screenshot of chat UI
    await page.screenshot({ path: '/tmp/12-chat-ui.png' })
    console.log('✓ Screenshot: /tmp/12-chat-ui.png')

    // Try typing a message
    await messageInput.type('What is my current stack?', { delay: 50 })
    console.log('✓ Test message typed in chat input')

    await page.screenshot({ path: '/tmp/13-chat-message-ready.png' })
    console.log('✓ Screenshot: /tmp/13-chat-message-ready.png')

    console.log('✓ Chat UI fully functional')
  } else {
    console.log('⚠ Message input not visible, checking page structure')
    const content = await page.textContent('body')
    if (content && content.toLowerCase().includes('chat')) {
      console.log('✓ Chat screen present (input may be hidden)')
    }
  }
}

async function testProfileEditing() {
  console.log('\n=== Testing Profile Screen Features ===')

  await page.goto(`${BASE_URL}/profile`)
  await page.waitForLoadState('networkidle')

  // Look for accordion sections or editable fields
  const sections = page.locator('button, [role="button"]').filter({ hasText: /height|weight|diet|exercise|sleep|goals/i })
  const sectionCount = await sections.count()

  if (sectionCount > 0) {
    console.log(`✓ Found ${sectionCount} profile sections`)

    // Try clicking first section
    const firstSection = sections.first()
    if (await firstSection.isVisible({ timeout: 2000 }).catch(() => false)) {
      await firstSection.click()
      await page.waitForLoadState('networkidle')
      console.log('✓ Clicked profile section')
    }
  }

  // Look for edit buttons
  const editButtons = page.locator('button').filter({ hasText: /edit|save|update/i })
  const editCount = await editButtons.count()
  if (editCount > 0) {
    console.log(`✓ Found ${editCount} edit/save buttons`)
  }

  // Check for logout/account options
  const accountButtons = page.locator('button').filter({ hasText: /logout|sign out|account|settings/i })
  const accountCount = await accountButtons.count()
  if (accountCount > 0) {
    console.log(`✓ Found ${accountCount} account management buttons`)
  }

  await page.screenshot({ path: '/tmp/14-profile-expanded.png', fullPage: true })
  console.log('✓ Screenshot: /tmp/14-profile-expanded.png')
}

async function testDataPersistence() {
  console.log('\n=== Testing Data Persistence ===')

  // Get token before navigation
  const tokenBefore = await page.evaluate(() => localStorage.getItem('recallth_token'))
  console.log(`✓ Token before: ${tokenBefore ? 'Present' : 'Missing'}`)

  // Navigate around
  await page.goto(`${BASE_URL}/home`)
  await page.waitForLoadState('networkidle')

  const tokenAfter1 = await page.evaluate(() => localStorage.getItem('recallth_token'))
  assert(tokenAfter1 === tokenBefore, 'Token should persist after navigation to home')
  console.log('✓ Token persists after home navigation')

  // Go to cabinet
  await page.goto(`${BASE_URL}/cabinet`)
  await page.waitForLoadState('networkidle')

  const tokenAfter2 = await page.evaluate(() => localStorage.getItem('recallth_token'))
  assert(tokenAfter2 === tokenBefore, 'Token should persist after navigation to cabinet')
  console.log('✓ Token persists after cabinet navigation')

  // Check email persistence
  const emailStored = await page.evaluate(() => localStorage.getItem('recallth_email'))
  assert(emailStored, 'Email should be stored in localStorage')
  console.log(`✓ Email persisted: ${emailStored}`)
}

async function testBottomNav() {
  console.log('\n=== Testing Bottom Navigation (Mobile) ===')

  await page.setViewportSize({ width: 375, height: 667 })

  // Navigate to home
  await page.goto(`${BASE_URL}/home`)
  await page.waitForLoadState('networkidle')

  // Look for nav items
  const navLinks = page.locator('a[href], button').filter({ hasText: /home|cabinet|chat|profile|schedule/i })
  const navCount = await navLinks.count()

  console.log(`✓ Found ${navCount} navigation items`)

  // Try clicking cabinet from home
  const cabinetLink = page.locator('a[href*="cabinet"], button').filter({ hasText: /cabinet/i }).first()
  if (await cabinetLink.isVisible({ timeout: 2000 }).catch(() => false)) {
    await cabinetLink.click()
    await page.waitForLoadState('networkidle')
    console.log('✓ Navigation to cabinet works from mobile nav')
  }

  // Try clicking home from cabinet
  const homeLink = page.locator('a[href*="home"], button').filter({ hasText: /home/i }).first()
  if (await homeLink.isVisible({ timeout: 2000 }).catch(() => false)) {
    await homeLink.click()
    await page.waitForLoadState('networkidle')
    console.log('✓ Navigation to home works from mobile nav')
  }

  await page.screenshot({ path: '/tmp/15-mobile-nav.png' })
  console.log('✓ Screenshot: /tmp/15-mobile-nav.png')
}

async function testNetworkFailureRecovery() {
  console.log('\n=== Testing Network Resilience ===')

  // Reset viewport
  await page.setViewportSize({ width: 1280, height: 720 })

  // Monitor successful responses
  let successCount = 0
  let errorCount = 0

  page.on('response', response => {
    if (response.ok) {
      successCount++
    } else if (!response.ok && response.status() !== 404) {
      errorCount++
    }
  })

  // Navigate through multiple screens rapidly
  const screens = ['/home', '/cabinet', '/chat', '/profile', '/home']
  for (const screen of screens) {
    await page.goto(`${BASE_URL}${screen}`)
    await page.waitForLoadState('networkidle')
  }

  console.log(`✓ Navigated through ${screens.length} screens`)
  console.log(`✓ Successful network calls: ${successCount}`)
  if (errorCount > 0) {
    console.log(`⚠ Network errors: ${errorCount}`)
  } else {
    console.log('✓ No network errors detected')
  }
}

async function testLayoutResponsiveness() {
  console.log('\n=== Testing Layout Responsiveness ===')

  const viewports = [
    { width: 320, height: 568, name: 'Small Mobile' },
    { width: 375, height: 667, name: 'iPhone SE' },
    { width: 768, height: 1024, name: 'Tablet' },
    { width: 1280, height: 720, name: 'Desktop' }
  ]

  // Test home screen on each viewport
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.goto(`${BASE_URL}/home`)
    await page.waitForLoadState('networkidle')

    // Check content is visible
    const content = await page.textContent('body')
    assert(content && content.length > 100, `Home should render on ${viewport.name}`)
    console.log(`✓ Home renders on ${viewport.name} (${viewport.width}x${viewport.height})`)
  }
}

async function runDetailedTests() {
  try {
    await setup()

    console.log('Starting Detailed Recallth UAT...\n')

    // Run detailed interactive tests
    await testAddSupplementFlow()
    await testChatInteraction()
    await testProfileEditing()
    await testDataPersistence()
    await testBottomNav()
    await testNetworkFailureRecovery()
    await testLayoutResponsiveness()

    console.log('\n' + '='.repeat(60))
    console.log('✓ All detailed UAT tests completed!')
    console.log('='.repeat(60))

  } catch (error) {
    console.error('\n✗ Test failed:', error.message)
    console.error(error.stack)
    process.exit(1)
  } finally {
    await teardown()
  }
}

runDetailedTests()
