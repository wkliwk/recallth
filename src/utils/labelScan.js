import { UNIT_FORMS, applyDose, parseServingUnits } from './dose.js'

const MAX_EDGE = 1280
// Saved thumbnail of the user's own photo (a few tens of KB as a data URL).
const THUMB_EDGE = 320

// HEIC/HEIF photos (iPhone originals): many browsers (desktop Chrome) cannot decode them in a canvas.
export function heicMimeType(file) {
  const type = String(file?.type || '').toLowerCase()
  const name = String(file?.name || '').toLowerCase()
  if (type === 'image/heic' || /\.heic$/.test(name)) return 'image/heic'
  if (type === 'image/heif' || /\.heif$/.test(name)) return 'image/heif'
  return ''
}

// Raw files are sent base64 inside JSON (backend limit 10 MB; base64 adds ~33%).
export const MAX_RAW_BYTES = 7 * 1024 * 1024

function decodeAndDownscale(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      let thumbnail = ''
      try {
        const ts = Math.min(1, THUMB_EDGE / Math.max(img.width, img.height))
        const tc = document.createElement('canvas')
        tc.width = Math.max(1, Math.round(img.width * ts))
        tc.height = Math.max(1, Math.round(img.height * ts))
        tc.getContext('2d').drawImage(img, 0, 0, tc.width, tc.height)
        thumbnail = tc.toDataURL('image/jpeg', 0.7)
      } catch { /* a missing thumbnail must never fail the scan */ }
      URL.revokeObjectURL(url)
      resolve({ imageBase64: canvas.toDataURL('image/jpeg', 0.85).split(',')[1], mimeType: 'image/jpeg', thumbnail })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read image'))
    }
    img.src = url
  })
}

function readRawBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '')
    reader.onerror = () => reject(new Error('Could not read image'))
    reader.readAsDataURL(file)
  })
}

// HEIC → JPEG in the browser with a lazily loaded WASM decoder (its own chunk, fetched only when a HEIC can't be
// decoded natively, e.g. desktop Chrome). Conversions run one at a time: decoding is CPU-heavy and runs on the
// main thread, so serialising keeps the page responsive.
let heicQueue = Promise.resolve()
function heicToJpegFile(file) {
  const job = heicQueue.then(async () => {
    const { heicTo } = await import('heic-to')
    const blob = await heicTo({ blob: file, type: 'image/jpeg', quality: 0.85 })
    return new File([blob], String(file.name || 'photo').replace(/\.hei[cf]$/i, '.jpg'), { type: 'image/jpeg' })
  })
  heicQueue = job.catch(() => {}) // a failed conversion must not block the next one
  return job
}

// Photo -> { imageBase64, mimeType, thumbnail } for /cabinet/scan (thumbnail = small data-URL JPEG or '').
// Normal photos are downscaled to JPEG (phone photos are several MB). If the browser can't decode a
// HEIC/HEIF file, convert it in the browser (lazy decoder); if that fails send the original — the backend/Gemini read HEIC directly.
export async function imageFileToBase64(file) {
  try {
    return await decodeAndDownscale(file)
  } catch (err) {
    const mimeType = heicMimeType(file)
    if (!mimeType) throw err
    // Preferred: convert in the browser → normal downscale + thumbnail path (and a much smaller upload).
    try {
      return await decodeAndDownscale(await heicToJpegFile(file))
    } catch { /* decoder missing/failed: fall back to sending the original file */ }
    if (file.size > MAX_RAW_BYTES) throw new Error('Photo too large to read in this browser — export it as JPEG')
    const imageBase64 = await readRawBase64(file)
    if (!imageBase64) throw err
    return { imageBase64, mimeType, thumbnail: '' } // can't decode HEIC here → no thumbnail
  }
}

// Map the /cabinet/scan result onto the CabinetAdd form fields.
// When the scan reports a strength/unit, Dosage becomes "<per-dose count> x strength" (structured);
// the count stays empty unless the label itself stated it.
export function scanResultToForm(data = {}) {
  const type = ['supplement', 'medication', 'vitamin'].includes(data.type) ? data.type : 'supplement'
  const base = {
    name: data.name || '',
    type,
    brand: data.brand || '',
    ingredients: data.ingredients || '',
  }
  const strength = String(data.strength || '').trim()
  const unitForm = UNIT_FORMS.includes(data.unitForm) ? data.unitForm : ''
  if (!strength && !unitForm) return { ...base, dosage: data.dosage || '' } // older backend / free-text label
  const bottleCount = Number(data.bottleCount) > 0 ? String(Number(data.bottleCount)) : ''
  const dose = { strength, unitForm, servingUnits: parseServingUnits(data.servingUnits), bottleCount, dosageFreeText: false }
  return applyDose({ ...base, ...dose, dosage: '' })
}
