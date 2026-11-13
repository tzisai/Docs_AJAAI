import { describe, it, expect } from 'vitest'
import type { JSONContent } from '@tiptap/react'
import { appendDocumentContent, documentToText, downloadFilename, importIntoDraft } from '../src/documentFiles'
const file=(text:string)=>({name:'notes.txt',size:new TextEncoder().encode(text).length,arrayBuffer:async()=>new TextEncoder().encode(text).buffer})
describe('Importing text into an existing draft',()=>{
  it('preserves unsaved rich formatting and appends literal paragraphs without mutating the draft',async()=>{
    const draft:JSONContent={type:'doc',content:[{type:'heading',attrs:{level:2},content:[{type:'text',text:'Unsaved title',marks:[{type:'bold'}]}]}]}
    const original=structuredClone(draft)
    const result=await importIntoDraft(file('First line\n\n<script>alert(1)</script>'),()=>draft)
    expect(result.content?.[0]).toEqual(original.content?.[0])
    expect(result.content?.slice(1)).toEqual([{type:'paragraph',content:[{type:'text',text:'First line'}]},{type:'paragraph'},{type:'paragraph',content:[{type:'text',text:'<script>alert(1)</script>'}]}])
    expect(draft).toEqual(original)
  })
  it('reads the latest draft after decoding so edits made during the file read survive',async()=>{
    let finish!:(value:ArrayBuffer)=>void
    let current:JSONContent={type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Earlier draft'}]}]}
    const pending=importIntoDraft({name:'notes.txt',size:5,arrayBuffer:()=>new Promise(resolve=>{finish=resolve})},()=>current)
    current={type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Edit made while reading'}]}]}
    finish(new TextEncoder().encode('Notes').buffer)
    const result=await pending
    expect(documentToText(result)).toBe('Edit made while reading\nNotes')
  })
  it('invalid input never replaces the existing draft',async()=>{
    const draft={type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Keep me'}]}]}
    let readDraft=false
    await expect(importIntoDraft({...file('bad'),name:'bad.html'},()=>{readDraft=true;return draft})).rejects.toThrow('.txt')
    expect(readDraft).toBe(false)
    expect(documentToText(draft)).toBe('Keep me')
  })
  it('appends a blank paragraph without deleting a formatted node',()=>{
    const result=appendDocumentContent({type:'doc',content:[{type:'heading',attrs:{level:1}}]},{type:'doc',content:[{type:'paragraph'}]})
    expect(result.content).toEqual([{type:'heading',attrs:{level:1}},{type:'paragraph'}])
  })
})
describe('Plain text download',()=>{
  it('exports rich text and list numbering as readable UTF-8 text, keeping blank lines and literal markup',()=>{
    const doc:JSONContent={type:'doc',content:[
      {type:'heading',content:[{type:'text',text:'Plan — Ajaia',marks:[{type:'bold'}]}]},
      {type:'paragraph'},
      {type:'bulletList',content:[{type:'listItem',content:[{type:'paragraph',content:[{type:'text',text:'<b>Literal</b>'}]}]}]},
      {type:'orderedList',attrs:{start:3},content:[{type:'listItem',content:[{type:'paragraph',content:[{type:'text',text:'Next'}]}]}]},
    ]}
    expect(documentToText(doc)).toBe('Plan — Ajaia\n\n• <b>Literal</b>\n3. Next')
  })
  it('exports a readable image label instead of leaking a base64 payload',()=>{
    expect(documentToText({type:'doc',content:[{type:'image',attrs:{src:'data:image/png;base64,YWJj',alt:'Sketch.png'}}]})).toBe('[Image: Sketch.png]')
  })
  it('makes a safe filename while preserving a meaningful title',()=>{
    expect(downloadFilename('Team / ideas: next?')).toBe('Team _ ideas_ next_.txt')
    expect(downloadFilename('  ')).toBe('document.txt')
    expect(downloadFilename('notes.txt')).toBe('notes.txt')
  })
})
