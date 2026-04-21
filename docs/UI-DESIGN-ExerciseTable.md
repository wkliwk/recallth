# UI Design Spec — ExerciseTable Redesign

**Issue:** #281 (redesign) + #282 (new exercise types)
**Date:** 2026-04-21
**Designer:** UI/UX Agent
**Status:** Ready for implementation

---

## Problem Statement

The current ExerciseTable has several visual issues:
1. Header uses ALL-CAPS label with no weight hierarchy — looks like a table from a spreadsheet
2. The emoji toggle (💪 / 🏃) for exercise type is cryptic — no label, not localisable, easy to mis-tap
3. Only 2 exercise types (strength, cardio) — misses stretch/mobility and HIIT
4. Unit toggle is a border button, not a proper segmented control
5. Footer is cramped — the save button sits flush with a text link on the same baseline
6. Input fields lack visual grouping — numbers float with no context

---

## Design Decisions

| Decision | Why |
|---|---|
| Replace emoji toggle with explicit type chip | Emoji is ambiguous; a labelled pill communicates type at a glance and is localisation-ready |
| Sentence case "Exercises" header | ALL-CAPS headers are visually harsh and inconsistent with the rest of the app (which uses sentence case) |
| Segmented control for kg/lbs | Matches iOS HIG and Material segmented control pattern; makes both states visible simultaneously |
| 4 exercise types | Strength, Cardio, Stretch, HIIT cover the majority of gym sessions without overcomplicating |
| Field layout by type (conditional) | Show only relevant fields per type — reduces cognitive load and visual noise |
| Save as full-width footer button | Larger tap target, clearer CTA hierarchy; "Add exercise" becomes a text-link above it |

---

## Color & Token Reference

These tokens come from the app's existing Tailwind config:

| Token | Value | Usage |
|---|---|---|
| `bg-page` | ~#F7F4EF | App background |
| `bg-white` | #FFFFFF | Card background |
| `bg-sand` | ~#EDE8E0 | Input background, chip background |
| `text-ink1` | ~#1A1410 | Primary text |
| `text-ink2` | ~#6B5E52 | Secondary text |
| `text-ink3` | ~#A89880 | Muted labels, placeholders |
| `text-orange` / `bg-orange` | ~#D4622A | Brand accent, CTAs |
| `border-[#EDE8E0]` | #EDE8E0 | Dividers |

Type chip accent colors (extend if not already in config):

| Type | Chip bg | Chip text |
|---|---|---|
| Strength | `bg-orange/10` | `text-orange` |
| Cardio | `bg-blue-500/10` | `text-blue-600` |
| Stretch | `bg-emerald-500/10` | `text-emerald-700` |
| HIIT | `bg-red-500/10` | `text-red-600` |

---

## Component: ExerciseTable

### Container

```jsx
<div className="bg-white rounded-[16px] shadow-sm overflow-hidden">
  {/* Header */}
  {/* Rows */}
  {/* Footer */}
</div>
```

---

### 1. Card Header

**Height:** 48px
**Border bottom:** `border-b border-[#EDE8E0]`
**Padding:** `px-4 py-0` (vertically centered with flex)

```jsx
<div className="flex items-center justify-between px-4 h-12 border-b border-[#EDE8E0]">
  {/* Left: title */}
  <p className="text-[15px] font-semibold text-ink1">Exercises</p>

  {/* Right: segmented kg/lbs toggle */}
  <div className="flex items-center gap-0 bg-sand rounded-full p-0.5">
    <button
      onClick={() => setUnit('kg')}
      className={`px-3 py-1 rounded-full text-[12px] font-semibold transition-all ${
        unit === 'kg'
          ? 'bg-orange text-white shadow-sm'
          : 'text-ink3 hover:text-ink2'
      }`}
    >
      kg
    </button>
    <button
      onClick={() => setUnit('lbs')}
      className={`px-3 py-1 rounded-full text-[12px] font-semibold transition-all ${
        unit === 'lbs'
          ? 'bg-orange text-white shadow-sm'
          : 'text-ink3 hover:text-ink2'
      }`}
    >
      lbs
    </button>
  </div>
</div>
```

**Spec:**
- Title: `text-[15px] font-semibold text-ink1` — sentence case, not uppercase, not small-caps
- Toggle container: `bg-sand rounded-full p-0.5` — pill shape wrapping both options
- Active option: `bg-orange text-white rounded-full px-3 py-1 shadow-sm`
- Inactive option: `text-ink3 rounded-full px-3 py-1` — no background, muted text
- Toggle width: auto (fits content — "kg" and "lbs" are short)

---

### 2. ExerciseRow — Shared Structure

**Row height:** `min-h-[52px]` (can grow if exercise name wraps)
**Padding:** `px-4 py-3`
**Border bottom:** `border-b border-[#EDE8E0] last:border-0`
**Layout:** `flex items-center gap-2`

Each row has this shape:
```
[ TYPE CHIP ]  [ EXERCISE NAME (flex-1) ]  [ FIELDS... ]  [ × ]
```

**Type chip (shared):**
```jsx
<button
  onClick={cycleType}
  className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold leading-none transition-colors"
  // color classes depend on type — see below
>
  {typeLabel}
</button>
```

Chip minimum width: none (auto, fits text). All chips are the same height (`py-1` = ~24px with 11px text).

**Exercise name input:**
```jsx
<input
  className="flex-1 min-w-0 bg-transparent text-[14px] font-medium text-ink1 placeholder:text-ink3/50 outline-none focus:bg-sand/60 rounded-[6px] px-1.5 py-0.5 transition-colors"
  placeholder="Exercise name"
/>
```

- `text-[14px] font-medium` — visually dominant, heavier than stats
- `flex-1 min-w-0` — fills available space, doesn't overflow
- `focus:bg-sand/60` — subtle sand background on focus (no border ring — keep clean)

**Number inputs (shared class):**
```jsx
const numCls = "w-9 text-center bg-transparent text-[13px] text-ink2 tabular-nums outline-none focus:bg-sand/60 rounded-[6px] px-0.5 py-0.5 transition-colors"
```

**Unit label (shared):**
```jsx
<span className="text-[11px] text-ink3 shrink-0 leading-none">
```

**Delete button:**
```jsx
<button
  onClick={onDelete}
  className="shrink-0 w-6 h-6 flex items-center justify-center text-ink3/40 hover:text-red-400 rounded-full hover:bg-red-50 transition-colors text-[16px] leading-none"
>
  ×
</button>
```

---

### 3. Type Chip — 4 Variants

The chip cycles: **Strength → Cardio → Stretch → HIIT → Strength**

```jsx
const TYPE_CONFIG = {
  strength: {
    label: 'Strength',
    chipClass: 'bg-orange/10 text-orange',
  },
  cardio: {
    label: 'Cardio',
    chipClass: 'bg-blue-500/10 text-blue-600',
  },
  stretch: {
    label: 'Stretch',
    chipClass: 'bg-emerald-500/10 text-emerald-700',
  },
  hiit: {
    label: 'HIIT',
    chipClass: 'bg-red-500/10 text-red-600',
  },
}

const TYPE_ORDER = ['strength', 'cardio', 'stretch', 'hiit']

function cycleType(current) {
  const idx = TYPE_ORDER.indexOf(current)
  return TYPE_ORDER[(idx + 1) % TYPE_ORDER.length]
}
```

---

### 4. Row Fields by Type

#### 4a. Strength Row

Fields: `sets` × `reps` + optional `weight (kg or lbs)`

```jsx
// Right of exercise name:
<input className={numCls} type="number" min="1" value={sets} placeholder="—" />
<span className="text-ink3/50 text-[11px] shrink-0">×</span>
<input className={numCls} type="number" min="1" value={reps} placeholder="—" />
<input className="w-12 text-center bg-transparent text-[13px] text-ink2 tabular-nums outline-none focus:bg-sand/60 rounded-[6px] px-0.5 py-0.5 transition-colors" type="number" min="0" step={unit === 'lbs' ? '1' : '0.5'} value={weight} placeholder="—" />
<span className={unitLbl}>{unit}</span>
```

Visual layout (right side of row): `3  ×  10  80  kg`
- sets field: `w-9`
- reps field: `w-9`
- weight field: `w-12` (slightly wider for 3-digit numbers)
- unit label: `text-[11px] text-ink3`

#### 4b. Cardio Row

Fields: `duration (min)` + optional `distance (km)`

```jsx
<input className="w-12 ..." type="number" value={duration} placeholder="—" />
<span className={unitLbl}>min</span>
<input className="w-12 ..." type="number" step="0.1" value={distance} placeholder="—" />
<span className={unitLbl}>km</span>
```

Visual layout: `20  min  4.0  km`
- duration field: `w-12`
- distance field: `w-12`

#### 4c. Stretch Row

Fields: `duration (min)` only

```jsx
<input className="w-12 ..." type="number" value={duration} placeholder="—" />
<span className={unitLbl}>min</span>
```

Visual layout: `10  min`
- duration field: `w-12`

No weight/distance — this row is naturally shorter on the right.

#### 4d. HIIT Row

Fields: `rounds` × `reps` + optional `duration (min)`

```jsx
<input className={numCls} type="number" value={rounds} placeholder="—" />
<span className="text-ink3/50 text-[11px] shrink-0">rds</span>
<span className="text-ink3/50 text-[11px] shrink-0">×</span>
<input className={numCls} type="number" value={reps} placeholder="—" />
<input className="w-12 ..." type="number" value={duration} placeholder="—" />
<span className={unitLbl}>min</span>
```

Visual layout: `4  rds  ×  15  20  min`

**Data model additions needed (issue #282):**

```js
// Add to ExerciseRow initial state / row shape:
{
  type: 'strength' | 'cardio' | 'stretch' | 'hiit',  // 4 types
  // stretch: uses durationMin only
  // hiit: uses rounds (new), reps, durationMin
  rounds: '',   // new field for HIIT
}
```

API payload mapping:

```js
if (r.type === 'stretch') {
  return { name, type: 'stretch', durationMin: Number(r.durationMin) || undefined }
}
if (r.type === 'hiit') {
  return { name, type: 'hiit',
    rounds: Number(r.rounds) || 1,
    reps: Number(r.reps) || 1,
    durationMin: r.durationMin ? Number(r.durationMin) : undefined,
  }
}
```

---

### 5. Card Footer

**Layout:** Two rows, not side-by-side

```jsx
<div className="border-t border-[#EDE8E0]">
  {/* Add exercise — text-link row */}
  <button
    onClick={addRow}
    className="w-full py-3 text-[13px] font-medium text-orange flex items-center justify-center gap-1.5 hover:bg-sand/30 transition-colors"
  >
    <span className="text-[17px] leading-none font-light">+</span>
    Add exercise
  </button>

  {/* Save changes — solid CTA */}
  <button
    onClick={() => saveRows(rows)}
    disabled={saving}
    className="w-full py-3.5 text-[14px] font-semibold text-white bg-orange disabled:opacity-60 hover:bg-orange/90 active:bg-orange/80 transition-colors rounded-b-[16px]"
  >
    {saving ? 'Saving…' : 'Save changes'}
  </button>
</div>
```

**Why two rows instead of split:**
- Save CTA deserves full width — it's the primary action
- "Add exercise" as a full-width text link reads naturally (like "Add item" in iOS Reminders)
- Split layout forces both into half-width, making Save feel cramped

**Save button:**
- `py-3.5` (14px padding top+bottom) — large tap target (14+14+20 = ~48px total)
- `rounded-b-[16px]` — matches card border radius at bottom
- `text-[14px] font-semibold` — clear CTA weight
- Text: "Save changes" (not just "Save") — more descriptive, consistent with button spec

---

### 6. Full ExerciseRow Component (assembled)

```jsx
function ExerciseRow({ row, unit = 'kg', onChange, onDelete }) {
  const [name, setName] = useState(row.name || '')
  const [type, setType] = useState(row.type || 'strength')
  const [sets, setSets] = useState(String(row.sets ?? ''))
  const [reps, setReps] = useState(String(row.reps ?? ''))
  const [rounds, setRounds] = useState(String(row.rounds ?? ''))
  const [weight, setWeight] = useState(kgToDisplay(row.weightKg, unit))
  const [duration, setDuration] = useState(String(row.durationMin ?? ''))
  const [distance, setDistance] = useState(String(row.distanceKm ?? ''))

  const TYPE_ORDER = ['strength', 'cardio', 'stretch', 'hiit']
  const TYPE_CONFIG = {
    strength: { label: 'Strength', chipClass: 'bg-orange/10 text-orange' },
    cardio:   { label: 'Cardio',   chipClass: 'bg-blue-500/10 text-blue-600' },
    stretch:  { label: 'Stretch',  chipClass: 'bg-emerald-500/10 text-emerald-700' },
    hiit:     { label: 'HIIT',     chipClass: 'bg-red-500/10 text-red-600' },
  }

  function cycleType() {
    const next = TYPE_ORDER[(TYPE_ORDER.indexOf(type) + 1) % TYPE_ORDER.length]
    setType(next)
    onChange({ ...snapshot(), type: next })
  }

  // ... (save on blur, same pattern as current code)

  const numCls = "w-9 text-center bg-transparent text-[13px] text-ink2 tabular-nums outline-none focus:bg-sand/60 rounded-[6px] px-0.5 py-0.5 transition-colors"
  const unitLbl = "text-[11px] text-ink3 shrink-0"
  const nameCls = "flex-1 min-w-0 bg-transparent text-[14px] font-medium text-ink1 placeholder:text-ink3/50 outline-none focus:bg-sand/60 rounded-[6px] px-1.5 py-0.5 transition-colors"

  const { label, chipClass } = TYPE_CONFIG[type]

  return (
    <div className="flex items-center px-4 py-3 gap-2 border-b border-[#EDE8E0] last:border-0 min-h-[52px]">
      {/* Type chip */}
      <button
        onClick={cycleType}
        className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold leading-none transition-colors ${chipClass}`}
        title="Tap to change type"
      >
        {label}
      </button>

      {/* Exercise name */}
      <input
        className={nameCls}
        value={name}
        onChange={e => setName(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={onKey}
        placeholder="Exercise name"
      />

      {/* Fields by type */}
      {type === 'strength' && (
        <>
          <input className={numCls} type="number" min="1" value={sets} onChange={e => setSets(e.target.value)} onBlur={handleBlur} onKeyDown={onKey} placeholder="—" />
          <span className="text-ink3/50 text-[11px] shrink-0">×</span>
          <input className={numCls} type="number" min="1" value={reps} onChange={e => setReps(e.target.value)} onBlur={handleBlur} onKeyDown={onKey} placeholder="—" />
          <input className="w-12 text-center bg-transparent text-[13px] text-ink2 tabular-nums outline-none focus:bg-sand/60 rounded-[6px] px-0.5 py-0.5 transition-colors" type="number" min="0" step={unit === 'lbs' ? '1' : '0.5'} value={weight} onChange={e => setWeight(e.target.value)} onBlur={handleBlur} onKeyDown={onKey} placeholder="—" />
          <span className={unitLbl}>{unit}</span>
        </>
      )}

      {type === 'cardio' && (
        <>
          <input className="w-12 text-center bg-transparent text-[13px] text-ink2 tabular-nums outline-none focus:bg-sand/60 rounded-[6px] px-0.5 py-0.5 transition-colors" type="number" min="0" value={duration} onChange={e => setDuration(e.target.value)} onBlur={handleBlur} onKeyDown={onKey} placeholder="—" />
          <span className={unitLbl}>min</span>
          <input className="w-12 text-center bg-transparent text-[13px] text-ink2 tabular-nums outline-none focus:bg-sand/60 rounded-[6px] px-0.5 py-0.5 transition-colors" type="number" min="0" step="0.1" value={distance} onChange={e => setDistance(e.target.value)} onBlur={handleBlur} onKeyDown={onKey} placeholder="—" />
          <span className={unitLbl}>km</span>
        </>
      )}

      {type === 'stretch' && (
        <>
          <input className="w-12 text-center bg-transparent text-[13px] text-ink2 tabular-nums outline-none focus:bg-sand/60 rounded-[6px] px-0.5 py-0.5 transition-colors" type="number" min="0" value={duration} onChange={e => setDuration(e.target.value)} onBlur={handleBlur} onKeyDown={onKey} placeholder="—" />
          <span className={unitLbl}>min</span>
        </>
      )}

      {type === 'hiit' && (
        <>
          <input className={numCls} type="number" min="1" value={rounds} onChange={e => setRounds(e.target.value)} onBlur={handleBlur} onKeyDown={onKey} placeholder="—" />
          <span className={unitLbl}>rds</span>
          <span className="text-ink3/50 text-[11px] shrink-0">×</span>
          <input className={numCls} type="number" min="1" value={reps} onChange={e => setReps(e.target.value)} onBlur={handleBlur} onKeyDown={onKey} placeholder="—" />
          <input className="w-12 text-center bg-transparent text-[13px] text-ink2 tabular-nums outline-none focus:bg-sand/60 rounded-[6px] px-0.5 py-0.5 transition-colors" type="number" min="0" value={duration} onChange={e => setDuration(e.target.value)} onBlur={handleBlur} onKeyDown={onKey} placeholder="—" />
          <span className={unitLbl}>min</span>
        </>
      )}

      {/* Delete */}
      <button
        onClick={onDelete}
        className="shrink-0 w-6 h-6 flex items-center justify-center text-ink3/40 hover:text-red-400 rounded-full hover:bg-red-50 transition-colors text-[16px] leading-none"
      >
        ×
      </button>
    </div>
  )
}
```

---

### 7. Full ExerciseTable Component Header Change

The `ExerciseTable` header/unit-toggle change:

```jsx
// OLD (remove):
<button onClick={toggleUnit} className="text-[11px] font-semibold text-orange border border-orange/50 rounded-full px-2.5 py-0.5 ...">
  {unit}
</button>

// NEW segmented control (see section 1 above)
```

---

## Typography Summary

| Element | Size | Weight | Color |
|---|---|---|---|
| Card title "Exercises" | `text-[15px]` | `font-semibold` | `text-ink1` |
| Exercise name | `text-[14px]` | `font-medium` | `text-ink1` |
| Numbers (sets/reps/weight/duration) | `text-[13px]` | normal | `text-ink2` |
| Type chip label | `text-[11px]` | `font-semibold` | per type |
| Unit label (kg, min, km) | `text-[11px]` | normal | `text-ink3` |
| "× " separator | `text-[11px]` | normal | `text-ink3/50` |
| Footer "Add exercise" | `text-[13px]` | `font-medium` | `text-orange` |
| Footer "Save changes" | `text-[14px]` | `font-semibold` | `text-white` |

---

## Spacing & Layout

| Element | Value |
|---|---|
| Card border radius | `rounded-[16px]` |
| Card shadow | `shadow-sm` |
| Row padding | `px-4 py-3` |
| Row min height | `min-h-[52px]` |
| Row divider | `border-b border-[#EDE8E0]` |
| Header height | `h-12` (48px) |
| Gap between chips / fields | `gap-2` |
| Footer "Add exercise" padding | `py-3` (12px × 2 = 48px tap target with text) |
| Footer "Save changes" padding | `py-3.5` (14px × 2 + 20px font = ~48px) |
| Gap between name input and fields | `gap-2` (8px) |

---

## Micro-interactions

| Interaction | Behavior |
|---|---|
| Type chip tap | Cycles to next type with immediate re-render; saves to parent on change |
| Number input focus | Background transitions to `bg-sand/60` (no border ring — clean aesthetic) |
| Name input focus | Same: `bg-sand/60` subtle fill |
| Delete × hover | Color transition to `text-red-400`, background `bg-red-50` (10px radius) |
| Save button disabled | `opacity-60`, text "Saving…" |
| Save button active | `active:bg-orange/80` — slight darken on press |
| Unit toggle active | Smooth pill slides (CSS `transition-all`) — use `transition-all duration-150` |

---

## States to Implement

| State | Behavior |
|---|---|
| Default | Rows with saved data, correct type chips |
| Empty (no exercises) | Show header + "No exercises yet" empty row with `text-ink3` + footer |
| New row | Name is empty, type defaults to 'strength', all number fields show placeholder "—" |
| Saving | Save button text = "Saving…", `disabled`, opacity-60 |
| Save success | No toast needed — data persists visually (button returns to normal) |

---

## Files to Change

1. `src/screens/ExerciseDetail.jsx`
   - `ExerciseRow` — replace emoji toggle with type chip, add stretch/HIIT fields and types
   - `ExerciseTable` — replace header + unit toggle, replace footer layout
   - `handleRowSave` — add `rounds` field mapping
   - `saveRows` — add `stretch` and `hiit` type serialisation
   - Add `TYPE_ORDER` and `TYPE_CONFIG` constants at module level

---

## tldraw Wireframe Reference

Wireframe canvas was created to illustrate:
1. Card header with segmented kg/lbs toggle
2. Strength row with type chip + fields
3. Cardio row with type chip + fields  
4. Stretch row (minimal fields)
5. HIIT row with rounds × reps + duration
6. Footer (Add + Save stacked)
7. Type chip cycle annotation

Note: tldraw MCP was unresponsive at design time; wireframe checkpoint to be added separately.
