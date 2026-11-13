import type { Metadata } from './data'

// Project only a few text leaves. Never depend on the optional preview column,
// and never pull image data URLs or complete JSON bodies into the card list.
export const LIBRARY_COLUMNS = 'id,owner_id,title,updated_at,first:content->content->0->content->0->>text,second:content->content->1->content->0->>text,third:content->content->2->content->0->>text,kind:content->content->0->>type'
export type LibraryRow = Omit<Metadata, 'preview'> & { first?: string | null; second?: string | null; third?: string | null; kind?: string | null }
export function libraryDocument(row: LibraryRow): Metadata {
  const { first, second, third, kind, ...metadata } = row
  const preview=[first,second,third].filter((text):text is string=>typeof text==='string'&&Boolean(text.trim())).join(' ').slice(0,240)
  return { ...metadata, preview: preview || (kind==='image' ? 'Image document' : '') }
}
