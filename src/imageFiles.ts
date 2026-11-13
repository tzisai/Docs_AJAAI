export const MAX_IMAGE_BYTES = 2 * 1024 * 1024
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

export const MAX_DOCUMENT_IMAGE_BYTES = 6 * 1024 * 1024
export function embeddedImageBytes(node: import('@tiptap/react').JSONContent): number {
  const src=node.type==='image'&&typeof node.attrs?.src==='string' ? node.attrs.src : ''
  const payload=src.startsWith('data:image/') ? src.split(',')[1]??'' : ''
  const own=payload ? Math.max(0,Math.floor(payload.length*3/4)-(payload.endsWith('==')?2:payload.endsWith('=')?1:0)) : 0
  return own+(node.content??[]).reduce((sum,child)=>sum+embeddedImageBytes(child),0)
}
export async function inlineImageNode(file: Pick<File,'name'|'size'|'type'|'arrayBuffer'>) {
  const format=await validateImage(file)
  const bytes=new Uint8Array(await file.arrayBuffer())
  let binary=''
  for(let offset=0;offset<bytes.length;offset+=32768)binary+=String.fromCharCode(...bytes.subarray(offset,offset+32768))
  return { type:'image', attrs:{src:`data:${format.mime};base64,${btoa(binary)}`,alt:file.name,title:file.name} }
}
