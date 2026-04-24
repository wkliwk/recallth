/**
 * Calculate profile completeness percentage and determine missing sections.
 * @param {object} profile - The profile data object from the API
 * @param {Array} cabinetItems - The cabinet/supplement items array
 * @returns {{ percentage: number, missingSections: string[] }}
 */
export function calcProfileCompleteness(profile, cabinetItems) {
  if (!profile) return { percentage: 0, missingSections: ['body', 'goals', 'exercise', 'diet', 'sleep', 'lifestyle', 'sportsBackground', 'injuries', 'focusAreas', 'cabinet'] }

  const checks = [
    { key: 'body',             weight: 15, filled: hasBody(profile.body) },
    { key: 'goals',            weight: 15, filled: hasGoals(profile.goals) },
    { key: 'exercise',         weight: 10, filled: hasExercise(profile.exercise) },
    { key: 'diet',             weight: 10, filled: hasDiet(profile.diet) },
    { key: 'sleep',            weight: 10, filled: hasSleep(profile.sleep) },
    { key: 'lifestyle',        weight: 10, filled: hasLifestyle(profile.lifestyle) },
    { key: 'sportsBackground', weight: 10, filled: hasArray(profile.sportsBackground) },
    { key: 'injuries',         weight: 5,  filled: hasArray(profile.injuries) },
    { key: 'focusAreas',       weight: 5,  filled: hasArray(profile.focusAreas) },
    { key: 'cabinet',          weight: 10, filled: Array.isArray(cabinetItems) && cabinetItems.length > 0 },
  ]

  let total = 0
  const missingSections = []

  for (const c of checks) {
    if (c.filled) {
      total += c.weight
    } else {
      missingSections.push(c.key)
    }
  }

  return { percentage: total, missingSections }
}

function hasBody(b) {
  if (!b) return false
  return Boolean(b.weight || b.height || b.age)
}

function hasGoals(g) {
  if (!g) return false
  return Boolean(g.primaryGoal || (Array.isArray(g.primary) && g.primary.length > 0))
}

function hasExercise(e) {
  if (!e) return false
  return Boolean(e.frequency || e.type || e.fitnessLevel)
}

function hasDiet(d) {
  if (!d) return false
  return Boolean(
    (Array.isArray(d.restrictions) && d.restrictions.length > 0) ||
    (Array.isArray(d.allergies) && d.allergies.length > 0)
  )
}

function hasSleep(s) {
  if (!s) return false
  return Boolean(s.hoursPerNight || (Array.isArray(s.issues) && s.issues.length > 0))
}

function hasLifestyle(l) {
  if (!l) return false
  return Boolean(l.stressLevel || l.smokingStatus || l.alcoholConsumption)
}

function hasArray(arr) {
  return Array.isArray(arr) && arr.length > 0
}

/**
 * Map a missing section key to a translation key for a suggested prompt.
 */
const SECTION_PROMPT_MAP = {
  body: null, // no prompt for body (user enters manually)
  goals: 'tellMeAboutGoals',
  exercise: 'tellMeAboutExercise',
  diet: 'anyDietaryRestrictions',
  sleep: 'tellMeAboutSleep',
  lifestyle: 'tellMeAboutLifestyle',
  sportsBackground: 'tellMeAboutSports',
  injuries: 'tellMeAboutInjuries',
  focusAreas: null, // derived from goals
  cabinet: null, // user adds supps via cabinet
}

/**
 * Get suggested prompts for missing profile sections.
 * Returns at most `limit` prompts.
 */
export function getMissingPrompts(missingSections, t, limit = 2) {
  const prompts = []
  for (const key of missingSections) {
    const tKey = SECTION_PROMPT_MAP[key]
    if (tKey) {
      prompts.push({ key, text: t(tKey) })
    }
    if (prompts.length >= limit) break
  }
  return prompts
}

/**
 * Get a label for the first missing section (used in the banner).
 */
const SECTION_LABELS = {
  body: 'body stats',
  goals: 'goals',
  exercise: 'exercise',
  diet: 'diet',
  sleep: 'sleep',
  lifestyle: 'lifestyle',
  sportsBackground: 'sports',
  injuries: 'conditions',
  focusAreas: 'focus areas',
  cabinet: 'supplements',
}

export function getFirstMissingLabel(missingSections) {
  for (const key of missingSections) {
    const label = SECTION_LABELS[key]
    if (label) return label
  }
  return 'health'
}
