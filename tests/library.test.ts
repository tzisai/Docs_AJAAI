import {describe,it,expect} from 'vitest'
import {LIBRARY_COLUMNS,libraryDocument} from '../src/library'
const metadata={id:'doc-1',owner_id:'alice',title:'Existing document',updated_at:'2026-11-13T21:00:00Z'}
describe('Library compatibility with the deployed database',()=>{
  it('keeps records without the optional generated preview column',()=>{
    const result=libraryDocument({...metadata,first:'Saved text',second:null,third:'Next line',kind:'paragraph'})
    expect(result).toEqual({...metadata,preview:'Saved text Next line'})
    expect(LIBRARY_COLUMNS).not.toMatch(/(?:^|,)preview(?:,|$)/)
    expect(LIBRARY_COLUMNS).not.toContain('attrs')
  })
  it('keeps image-only and empty documents visible without fetching their image payload',()=>{
    expect(libraryDocument({...metadata,kind:'image'})).toEqual({...metadata,preview:'Image document'})
    expect(libraryDocument(metadata)).toEqual({...metadata,preview:''})
  })
  it('limits card excerpts while preserving the original document identity',()=>{
    const result=libraryDocument({...metadata,first:'a'.repeat(300)})
    expect(result.preview).toHaveLength(240)
    expect(result.id).toBe('doc-1')
    expect(result.title).toBe('Existing document')
  })
})
