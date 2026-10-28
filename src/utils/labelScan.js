import { UNIT_FORMS, applyDose, parseServingUnits } from './dose.js'

const MAX_EDGE = 1280

// Downscale a photo to a JPEG base64 payload (phone photos are several MB).
export function imageFileToBase64(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve({ imageBase64: canvas.toDataURL('image/jpeg', 0.85).split(',')[1], mimeType: 'image/jpeg' })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read image'))
    }
    img.src = url
  })
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
