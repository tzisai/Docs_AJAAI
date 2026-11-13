import type { JSONContent } from '@tiptap/react'
import { importText } from './importText'

/** Append to the latest draft, preserving its structure, formatting, and source object. */
export function appendDocumentContent(draft: JSONContent, imported: JSONContent): JSONContent {
  return { ...draft, content: [...(draft.content ?? []), ...(imported.content ?? [])] }
}

/** Decode first; ask for the current draft afterward so edits made while reading survive. */
export async function importIntoDraft(file: Pick<File, 'name' | 'size' | 'arrayBuffer'>, getDraft: () => JSONContent) {
  const imported = await importText(file)
  return appendDocumentContent(getDraft(), imported.content)
}

export function documentToText(node: JSONContent): string {
  if (node.type === 'image') return `[Image: ${node.attrs?.alt || 'image'}]`
  if (node.type === 'text') return node.text ?? ''
  if (node.type === 'hardBreak') return '\n'
  if (node.type === 'bulletList' || node.type === 'orderedList') {
    return (node.content ?? []).map((item, index) => {
      const prefix = node.type === 'bulletList' ? '• ' : `${Number(node.attrs?.start ?? 1) + index}. `
      return prefix + documentToText(item).replace(/\n/g, '\n  ')
    }).join('\n')
  }
  const separator = node.type === 'paragraph' || node.type === 'heading' ? '' : '\n'
  return (node.content ?? []).map(documentToText).join(separator)
}

export function downloadFilename(title: string) {
  const stem = title.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').trim().slice(0, 100) || 'document'
  return stem.replace(/\.txt$/i, '') + '.txt'
}

export function downloadDocument(title: string, content: JSONContent) {
  const url = URL.createObjectURL(new Blob([documentToText(content)], { type: 'text/plain;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url; link.download = downloadFilename(title)
  document.body.append(link); link.click(); link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
