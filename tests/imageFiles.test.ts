import {describe,it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {attachmentName,attachmentPath,MAX_IMAGE_BYTES,validateImage} from '../src/imageFiles'
const png=Uint8Array.from([137,80,78,71,13,10,26,10])
function file(name:string,type:string,bytes:Uint8Array,size=bytes.length){return{name,type,size,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength) as ArrayBuffer}}
describe('Demo image attachment validation',()=>{
  it('accepts the actual PNG walkthrough fixture',async()=>{
    const bytes=readFileSync(new URL('../samples/idea-board.png',import.meta.url))
    await expect(validateImage(file('idea-board.png','image/png',bytes))).resolves.toEqual({mime:'image/png',extension:'png'})
  })
  it('accepts JPEG and WebP signatures',async()=>{
    await expect(validateImage(file('photo.jpeg','image/jpeg',Uint8Array.from([255,216,255,224])))).resolves.toEqual({mime:'image/jpeg',extension:'jpg'})
    await expect(validateImage(file('photo.webp','image/webp',new TextEncoder().encode('RIFF0000WEBP')))).resolves.toEqual({mime:'image/webp',extension:'webp'})
  })
  it.each([
    ['huge.png','image/png',png,MAX_IMAGE_BYTES+1,/2 MiB/],
    ['empty.png','image/png',new Uint8Array(),0,/empty/],
    ['drawing.svg','image/svg+xml',new TextEncoder().encode('<svg/>'),6,/PNG, JPEG, or WebP/],
    ['fake.png','image/png',new TextEncoder().encode('<script>alert(1)</script>'),25,/does not match/],
    ['wrong.png','image/jpeg',png,png.length,/PNG, JPEG, or WebP/],
  ])('rejects %s before storage upload',async(name,type,bytes,size,error)=>{
    await expect(validateImage(file(name,type,bytes,size))).rejects.toThrow(error)
  })
  it('uses a document prefix and random name, removing path characters',()=>{
    const id='11111111-1111-4111-8111-111111111111'
    const path=attachmentPath('doc-id','../../My photo.png',id)
    expect(path).toBe('doc-id/'+id+'--.._.._My photo.png')
    expect(attachmentName(path)).toBe('.._.._My photo.png')
  })
})
