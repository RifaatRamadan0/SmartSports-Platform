import api from './api'

const URL_ENDPOINT = import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT
const PUBLIC_KEY   = import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY

export function isImageKitConfigured() {
  return Boolean(URL_ENDPOINT && PUBLIC_KEY)
}

export async function uploadToImageKit(file, folder = '/smartsports/pitches') {
  if (!isImageKitConfigured()) {
    throw new Error('ImageKit is not configured. Set VITE_IMAGEKIT_URL_ENDPOINT and VITE_IMAGEKIT_PUBLIC_KEY.')
  }

  // 1. Ask our backend for a short-lived signature. The private key never reaches the browser.
  const { data: auth } = await api.get('/api/uploads/imagekit-auth')

  // 2. POST the file straight to ImageKit's upload endpoint with the signed params.
  const form = new FormData()
  form.append('file',               file)
  form.append('fileName',           file.name || 'upload')
  form.append('publicKey',          PUBLIC_KEY)
  form.append('signature',          auth.signature)
  form.append('expire',             String(auth.expire))
  form.append('token',              auth.token)
  form.append('folder',             folder)
  form.append('useUniqueFileName',  'true')

  const res = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
    method: 'POST',
    body:   form,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`ImageKit upload failed (${res.status}). ${text}`)
  }

  const result = await res.json()
  return { url: result.url, fileId: result.fileId }
}
