import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { importText, MAX_IMPORT_BYTES } from './importText'
function file(name: string, bytes: Uint8Array) {
  return { name, size: bytes.length, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer }
}
describe('UTF-8 text import', () => {
  it('converts the walkthrough fixture into literal paragraphs, preserving blank lines and final newline', async () => {
    const bytes = readFileSync(new URL('../samples/team-notes.txt', import.meta.url))
    const result = await importText(file('team-notes.txt', bytes))
    expect(result.title).toBe('team-notes')
    expect(result.content).toEqual({ type: 'doc', content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'Team notes — Ajaia' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'A quiet place to turn ideas into decisions.' }] },
      { type: 'paragraph' },
      { type: 'paragraph', content: [{ type: 'text', text: 'Next steps' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'Keep <strong>literal markup</strong> as text, not HTML.' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'Alice writes. Bob reads.' }] },
      { type: 'paragraph' },
    ] })
  })
  it('normalizes Windows and classic Mac line endings', async () => {
    const result = await importText(file('notes.TXT', new TextEncoder().encode('one\r\n\r\ntwo\rthree')))
    expect(result.content.content).toHaveLength(4)
    expect(result.content.content?.[1]).toEqual({ type: 'paragraph' })
  })
  it.each([
    ['notes.md', new TextEncoder().encode('hello'), /\.txt/],
    ['notes.txt', new Uint8Array(MAX_IMPORT_BYTES + 1), /100 KiB/],
    ['notes.txt', new Uint8Array(), /empty/],
    ['notes.txt', new Uint8Array([0xc3, 0x28]), /UTF-8/],
    ['notes.txt', new TextEncoder().encode(' \n\t'), /empty/],
  ])('rejects invalid input (%s) before creating anything', async (name, bytes, message) => {
    await expect(importText(file(name, bytes))).rejects.toThrow(message)
  })
})
