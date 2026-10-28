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
export function scanResultToForm(data = {}) {
  const type = ['supplement', 'medication', 'vitamin'].includes(data.type) ? data.type : 'supplement'
  return {
    name: data.name || '',
    type,
    dosage: data.dosage || '',
    brand: data.brand || '',
    ingredients: data.ingredients || '',
  }
}
