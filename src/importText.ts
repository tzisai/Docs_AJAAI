import type { JSONContent } from '@tiptap/react'
export const MAX_IMPORT_BYTES = 100 * 1024
export async function importText(file: Pick<File, 'name' | 'size' | 'arrayBuffer'>): Promise<{ title: string; content: JSONContent }> {
  if (!/\.txt$/i.test(file.name)) throw new Error('Choose a .txt file encoded as UTF-8.')
  if (file.size > MAX_IMPORT_BYTES) throw new Error('This file exceeds the 100 KiB limit.')
  if (file.size === 0) throw new Error('This file is empty. Choose a text file with content.')
  let text: string
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer())
  } catch {
    throw new Error('Could not read this file as UTF-8. Save it as UTF-8 text and try again.')
  }
  if (!text.trim()) throw new Error('This file is empty. Choose a text file with content.')
  if (text.includes('\0')) throw new Error('This file contains null bytes. Choose a plain UTF-8 text file.')
  const title = file.name.replace(/\.txt$/i, '').trim().slice(0, 120) || 'Imported document'
  return {
    title,
    content: { type: 'doc', content: text.replace(/\r\n?/g, '\n').split('\n').map(line => ({
      type: 'paragraph', ...(line ? { content: [{ type: 'text', text: line }] } : {}),
    })) },
  }
}
