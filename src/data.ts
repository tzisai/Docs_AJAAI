import { createClient } from '@supabase/supabase-js'
import type { JSONContent } from '@tiptap/react'
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
export const configured = Boolean(url && key)
export const supabase = createClient(url || 'https://example.supabase.co', key || 'missing-configuration')
export type Doc = { id: string; owner_id: string; title: string; content: JSONContent; updated_at: string }
export type Metadata = Omit<Doc, 'content'>
export type DemoUser = { id: string; alias: string }
export const blankContent: JSONContent = { type: 'doc', content: [{ type: 'paragraph' }] }
export const message = (error: unknown) => error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? String(error.message) : 'Something went wrong. Please try again.'
export async function createDocument(title = 'Untitled document', content = blankContent) {
  const { data, error } = await supabase.from('documents').insert({ title, content }).select('id').single()
  if (error) throw error
  return data.id as string
}
