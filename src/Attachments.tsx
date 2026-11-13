import { useCallback, useEffect, useRef, useState } from 'react'
import { message, supabase } from './data'
import { attachmentName, attachmentPath, IMAGE_BUCKET, validateImage } from './imageFiles'

type Attachment = { path: string; name: string; url: string; size: number }
export function Attachments({documentId, canEdit}: {documentId: string; canEdit: boolean}) {
  const [items, setItems] = useState<Attachment[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const alive = useRef(true)
  const loadVersion = useRef(0)
  useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[])
  const load = useCallback(async()=>{
    const version=++loadVersion.current
    const current=()=>alive.current&&version===loadVersion.current
    setLoading(true)
    try {
      const bucket = supabase.storage.from(IMAGE_BUCKET)
      const {data,error}=await bucket.list(documentId,{limit:100,sortBy:{column:'created_at',order:'desc'}})
      if(error)throw error
      const files=(data??[]).filter(file=>file.id)
      if(!files.length){if(current())setItems([]);return}
      const paths=files.map(file=>documentId+'/'+file.name)
      const signed=await bucket.createSignedUrls(paths,300)
      if(signed.error)throw signed.error
      const attachments=files.map((file,i)=>{
        const url=signed.data?.[i]?.signedUrl
        if(!url)throw new Error('Could not open an image. Refresh attachments to retry.')
        return {path:paths[i],name:attachmentName(file.name),url,size:Number(file.metadata?.size??0)}
      })
      if(current())setItems(attachments)
    }catch(error){if(current())setError('Could not load attachments. '+message(error))}
    finally{if(current())setLoading(false)}
  },[documentId])
  useEffect(()=>{void load()},[load])
  async function upload(file: File){
    if(busy)return
    setBusy(true);setError('');setNotice('')
    try {
      const format=await validateImage(file)
      const bitmap=await createImageBitmap(file)
      const tooLarge=bitmap.width>4096||bitmap.height>4096
      bitmap.close()
      if(tooLarge)throw new Error('Use an image at most 4096 × 4096 pixels for this demo.')
      const path=attachmentPath(documentId,file.name)
      const {error}=await supabase.storage.from(IMAGE_BUCKET).upload(path,file,{contentType:format.mime,upsert:false})
      if(error)throw error
      if(alive.current){setNotice('Image attached. Attachments are saved immediately.');await load()}
    }catch(error){if(alive.current)setError('Could not attach image. '+message(error))}
    finally{if(alive.current){setBusy(false);if(input.current)input.current.value=''}}
  }
  async function remove(item: Attachment){
    if(busy||!window.confirm(`Remove attachment “${item.name}”?`))return
    setBusy(true);setError('');setNotice('')
    try {
      const bucket=supabase.storage.from(IMAGE_BUCKET)
      const {data,error}=await bucket.remove([item.path]);if(error)throw error
      if(!data?.length)throw new Error('No image was removed. It may already be gone or your permission may have changed.')
      // Storage DELETE may return no error for a denied/absent object; verify removal.
      const check=await bucket.list(documentId,{search:item.path.split('/').at(-1),limit:100})
      if(check.error)throw check.error
      if(check.data.some(file=>documentId+'/'+file.name===item.path))throw new Error('The image was not removed. Your edit permission may have changed.')
      if(alive.current){setItems(current=>current.filter(file=>file.path!==item.path));setNotice('Attachment removed.')}
    }catch(error){if(alive.current)setError('Could not remove image. '+message(error))}
    finally{if(alive.current)setBusy(false)}
  }
  async function download(item: Attachment){
    setError('')
    const {data,error}=await supabase.storage.from(IMAGE_BUCKET).download(item.path)
    if(error){setError('Could not download image. '+message(error));return}
    const url=URL.createObjectURL(data),link=document.createElement('a')
    link.href=url;link.download=item.name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)
  }
  return <section className="attachments" aria-labelledby="attachment-heading">
    <div className="attachment-heading"><div><p className="eyebrow">KEEP THE CONTEXT</p><h2 id="attachment-heading">Images & attachments<span className="count">{items.length}</span></h2></div><div className="attachment-controls"><button disabled={loading||busy} onClick={()=>{setError('');void load()}}>Refresh images</button>{canEdit&&<button disabled={busy||loading} onClick={()=>input.current?.click()}>{busy?'Working…':'Attach image +'}</button>}</div></div>
    <p className="hint">PNG, JPEG, WebP · up to 2 MiB each · max 4096 × 4096 px. Saved immediately, separately from the document draft.</p>
    <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" aria-label="Attach image file" hidden onChange={event=>{const file=event.target.files?.[0];if(file)void upload(file)}}/>
    {error&&<p className="error" role="alert">{error}</p>}{notice&&<p className="success" role="status">{notice}</p>}
    {loading?<p className="muted">Loading attachments…</p>:items.length?<div className="attachment-grid">{items.map(item=><article className="attachment-card" key={item.path}><a href={item.url} target="_blank" rel="noreferrer" aria-label={`View ${item.name}`}><img src={item.url} alt={item.name} loading="lazy" onError={()=>setError('An image link expired or could not load. Select Refresh images to retry.')}/></a><div className="attachment-caption"><span title={item.name}>{item.name}</span><small>{Math.ceil(item.size/1024)} KiB</small></div><div className="attachment-card-actions"><button onClick={()=>void download(item)}>Download image</button>{canEdit&&<button disabled={busy} onClick={()=>void remove(item)}>Remove</button>}</div></article>)}</div>:<p className="attachment-empty">{canEdit?'A moodboard, a sketch, a little context. Attach an image to this document.':'No images attached to this document yet.'}</p>}
  </section>
}
