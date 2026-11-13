export const MAX_IMAGE_BYTES = 2 * 1024 * 1024
export const IMAGE_BUCKET = 'document-images'
const formats = {
  png: { mime: 'image/png', extension: 'png' },
  jpg: { mime: 'image/jpeg', extension: 'jpg' },
  jpeg: { mime: 'image/jpeg', extension: 'jpg' },
  webp: { mime: 'image/webp', extension: 'webp' },
} as const

export async function validateImage(file: Pick<File, 'name' | 'size' | 'type' | 'arrayBuffer'>) {
  const extension = file.name.split('.').at(-1)?.toLowerCase() as keyof typeof formats
  const format = formats[extension]
  if (!format || file.type !== format.mime) throw new Error('Choose a PNG, JPEG, or WebP image. SVG and GIF are not supported.')
  if (!file.size) throw new Error('This image is empty.')
  if (file.size > MAX_IMAGE_BYTES) throw new Error('This image exceeds the 2 MiB demo limit.')
  const bytes = new Uint8Array(await file.arrayBuffer())
  const png = bytes.length >= 8 && [137,80,78,71,13,10,26,10].every((value,i)=>bytes[i]===value)
  const jpeg = bytes.length >= 3 && bytes[0]===255 && bytes[1]===216 && bytes[2]===255
  const webp = bytes.length >= 12 && String.fromCharCode(...bytes.slice(0,4))==='RIFF' && String.fromCharCode(...bytes.slice(8,12))==='WEBP'
  if (!(format.mime==='image/png' ? png : format.mime==='image/jpeg' ? jpeg : webp)) {
    throw new Error('This file does not match its image format. Choose a real PNG, JPEG, or WebP image.')
  }
  return format
}

export function attachmentPath(documentId: string, filename: string, uniqueId = crypto.randomUUID()) {
  const safe = filename.replace(/[^a-zA-Z0-9._ -]/g, '_').slice(-120) || 'image'
  return `${documentId}/${uniqueId}--${safe}`
}
export function attachmentName(path: string) { return path.split('/').at(-1)?.replace(/^[a-f0-9-]{36}--/, '') || 'Image' }
