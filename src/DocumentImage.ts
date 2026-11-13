import Image from '@tiptap/extension-image'

// Images travel with the document JSON; no public URL, signed URL, or bucket setup.
export const DocumentImage=Image.extend({
  parseHTML(){return [{tag:'img[src]',getAttrs:element=>/^data:image\/(?:png|jpeg|webp);base64,/.test((element as HTMLElement).getAttribute('src')??'')?null:false}]},
  renderHTML({HTMLAttributes}){
    const src=typeof HTMLAttributes.src==='string'&&/^data:image\/(?:png|jpeg|webp);base64,/.test(HTMLAttributes.src)?HTMLAttributes.src:''
    return ['img',{...HTMLAttributes,src}]
  },
}).configure({allowBase64:true})
