import React, { useCallback, useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate, Route, Routes, useBlocker, useLocation, useNavigate, useParams } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import type { Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { blankContent, configured, createDocument, message, supabase } from './data'
import type { DemoUser, Doc, Metadata, Recipient, ShareRole } from './data'
import { importText } from './importText'
import { downloadDocument, importIntoDraft } from './documentFiles'
import { Attachments } from './Attachments'
import '@fontsource/instrument-sans/400.css'
import '@fontsource/instrument-sans/500.css'
import '@fontsource/instrument-sans/600.css'
import './style.css'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  const [authError, setAuthError] = useState('')
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); setReady(true) })
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) setAuthError(message(error))
      setSession(data.session); setReady(true)
    }).catch(error => { setAuthError(message(error)); setReady(true) })
    return () => subscription.unsubscribe()
  }, [])
  if (!configured) return <main className="login"><p className="eyebrow">AJAIA / SETUP</p><h1>Connect your workspace.</h1><p>Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY, then rebuild.</p></main>
  if (!ready) return <main className="loading" role="status">Opening your workspace…</main>
  if (authError) return <main className="loading"><ErrorText text={authError}/><button onClick={() => window.location.reload()}>Retry</button></main>
  return <Routes>
    <Route path="/login" element={session ? <Navigate to={safeReturn(new URLSearchParams(window.location.search).get('next'))} replace/> : <Login/>}/>
    <Route path="/docs" element={<Protected session={session}>{session && <Library session={session}/>}</Protected>}/>
    <Route path="/docs/:id" element={<Protected session={session}>{session && <DocumentRoute session={session}/>}</Protected>}/>
    <Route path="*" element={<Navigate to="/docs" replace/>}/>
  </Routes>
}
function safeReturn(next: string | null) { return next && /^\/docs(?:\/[a-f0-9-]+)?$/.test(next) ? next : '/docs' }
function Protected({ session, children }: {session: Session | null; children: React.ReactNode}) {
  const location = useLocation()
  return session ? children : <Navigate to={'/login?next=' + encodeURIComponent(location.pathname)} replace/>
}
function ErrorText({text}: {text: string}) { return text ? <p className="error" role="alert">{text}</p> : null }
function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    try { const {error} = await supabase.auth.signInWithPassword({email: email.trim(), password}); if (error) throw error }
    catch (error) { setError(message(error)) } finally { setBusy(false) }
  }
  return <main className="login"><div className="login-brand">AJAIA <span>DOCUMENTS / 01</span></div><div className="login-grid"><section><p className="eyebrow">A LITTLE SPACE TO THINK</p><h1>Good ideas<br/>start here.</h1><p className="intro">Write with focus.<br/>Share with intention.</p></section><form onSubmit={submit} className="login-form"><p className="eyebrow">YOUR WORKSPACE</p><h2>Welcome back.</h2><p className="muted">Sign in with your demo account to continue.</p><label>Email<input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label><ErrorText text={error}/><button className="primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in →'}</button><p className="hint">A private demo workspace. Accounts are provided by the reviewer guide.</p></form></div><footer>Less noise. More room for your words.</footer></main>
}
function Header({session, beforeLeave = () => true}: {session: Session; beforeLeave?: () => boolean}) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  return <header className="topbar"><span className="brand">AJAIA <span>/ DOCUMENTS</span></span><div className="account"><span>{session.user.email}</span><button disabled={busy} onClick={async()=>{ if (!beforeLeave()) return; setBusy(true); const {error} = await supabase.auth.signOut(); if(error) setError(message(error)); setBusy(false) }}>{busy ? 'Signing out…' : 'Sign out'}</button></div><ErrorText text={error}/></header>
}
function Library({session}: {session: Session}) {
  const navigate = useNavigate()
  const [docs, setDocs] = useState<Metadata[]>([])
  const [users, setUsers] = useState<DemoUser[]>([])
  const [roles, setRoles] = useState<Record<string, ShareRole>>({})
  const [sharing, setSharing] = useState<Metadata | null>(null)
  const shareTrigger = useRef<HTMLButtonElement | null>(null)
  const [downloading, setDownloading] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const refresh = useCallback(async()=> {
    setLoading(true); setError('')
    const [documents, directory, shares] = await Promise.all([
      supabase.from('documents').select('id,owner_id,title,updated_at,preview').order('updated_at',{ascending:false}),
      supabase.from('demo_users').select('id,alias'),
      supabase.from('document_shares').select('document_id,role').eq('recipient_id',session.user.id),
    ])
    if(documents.error || directory.error || shares.error) setError(message(documents.error || directory.error || shares.error))
    else {setDocs(documents.data); setUsers(directory.data); setRoles(Object.fromEntries(shares.data.map(s=>[s.document_id,s.role])))}
    setLoading(false)
  }, [session.user.id])
  useEffect(()=>{void refresh()},[refresh])
  async function create(file?: File) {
    if(busy) return
    setBusy(true); setError('')
    try { const converted = file ? await importText(file) : undefined; const id = await createDocument(converted?.title, converted?.content); navigate('/docs/' + id) }
    catch(error) {setError(message(error))} finally {setBusy(false); if(fileRef.current) fileRef.current.value=''}
  }
  async function download(doc: Metadata) {
    if(downloading)return
    setDownloading(doc.id);setError('')
    try {
      const {data,error}=await supabase.from('documents').select('title,content').eq('id',doc.id).maybeSingle()
      if(error)throw error
      if(!data)throw new Error('This document is no longer available to you.')
      downloadDocument(data.title,data.content)
    }catch(error){setError('Could not download document. '+message(error))}
    finally{setDownloading('')}
  }
  function section(title: string, owned: boolean, index: string) {
    const all=docs.filter(doc=>(doc.owner_id===session.user.id)===owned)
    const items=all.filter(doc=>(doc.title+' '+(doc.preview??'')).toLowerCase().includes(search.toLowerCase()))
    return <section className="document-section">
      <div className="section-heading"><div><span className="section-index">/{index}</span><h2>{title}</h2></div><span className="count">{String(items.length).padStart(2,'0')}</span></div>
      {items.length?<div className="document-grid">{items.map((doc,index)=>{
        const editable=owned||roles[doc.id]==='writer'
        return <article className={`document-card card-tone-${index%4}`} key={doc.id} style={{animationDelay:`${Math.min(index,8)*45}ms`}} aria-labelledby={'card-'+doc.id}>
          <button className="card-preview" aria-label={`Open ${doc.title}`} onClick={()=>navigate('/docs/'+doc.id)}>
            <span className="mini-page"><span className="mini-page-label">AJAIA / DOCUMENT</span><span className="mini-page-title">{doc.title}</span><span className="mini-page-text">{doc.preview||'An unwritten page. Make it yours.'}</span><span className="mini-page-line"/><span className="mini-page-line short"/></span>
            <span className="card-open" aria-hidden="true">↗</span>
          </button>
          <div className="card-details"><p className="card-access">{owned?'OWNER · YOU':`Shared · ${users.find(u=>u.id===doc.owner_id)?.alias||'Document owner'} · ${roles[doc.id]==='writer'?'Writer':'Reader'}`}</p><h3 id={'card-'+doc.id}>{doc.title}</h3><time dateTime={doc.updated_at}>Edited {new Date(doc.updated_at).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}</time></div>
          <div className="card-actions"><button onClick={()=>navigate('/docs/'+doc.id)}>{editable?'Edit':'Open'}</button>{owned&&<button onClick={event=>{shareTrigger.current=event.currentTarget;setSharing(doc)}}>Share</button>}<button disabled={Boolean(downloading)} onClick={()=>void download(doc)}>{downloading===doc.id?'Downloading…':'Download'}</button></div>
        </article>
      })}</div>:<div className="empty"><span className="empty-index">{index}</span><div><h3>{search?'No matching pages.':owned?'Your next idea starts here.':'Good ideas travel.'}</h3><p>{search?'Try another title or a few words from your document.':owned?'Start with a blank page, or bring your notes along.':'Documents shared with you will land here. A little collaboration, a lot of possibility.'}</p></div></div>}
    </section>
  }
  return <><Header session={session}/><main className="library">
    <div className="workspace-intro"><span><i className="status-dot"/> YOUR CREATIVE CORNER</span><span>LESS NOISE. MORE IDEAS.</span></div>
    <div className="library-heading"><div><p className="eyebrow">WRITE. KEEP. SHARE.</p><h1>Make room<br/>for <em>what’s next.</em><span className="hero-star" aria-hidden="true">✳</span></h1><p className="muted">Big thoughts. Rough drafts. The good stuff in between.</p></div><div className="library-actions"><div className="buttons"><button disabled={busy} onClick={()=>fileRef.current?.click()}>Import .txt ↗</button><button className="primary" disabled={busy} onClick={()=>void create()}>{busy?'Creating…':'New document +'}</button></div><p className="hint">UTF-8 .txt · up to 100 KiB</p><input ref={fileRef} type="file" accept=".txt,text/plain" aria-label="Import UTF-8 text file" hidden onChange={event=>{const file=event.target.files?.[0];if(file)void create(file)}}/></div></div>
    <div className="library-tools"><span>{docs.length} {docs.length===1?'document':'documents'} / endless possibilities</span><div className="search-box"><label className="sr-only" htmlFor="document-search">Search documents</label><input id="document-search" type="search" placeholder="Find a thought…" value={search} onChange={event=>setSearch(event.target.value)}/><span aria-hidden="true">⌕</span></div></div>
    <ErrorText text={error}/>{error&&<button onClick={()=>void refresh()}>Reload library</button>}
    {loading?<p role="status">Gathering your ideas…</p>:<>{section('My documents',true,'01')}{section('Shared with me',false,'02')}</>}
    <footer><span>AJAIA / A LITTLE SPACE TO THINK</span><span>Made for your next good idea. ↗</span></footer>
  </main>{sharing&&<ShareDialog document={sharing} onClose={()=>{setSharing(null);requestAnimationFrame(()=>shareTrigger.current?.focus())}}/>}</>
}

function DocumentRoute({session}: {session: Session}) {
  const {id} = useParams()
  const [doc, setDoc] = useState<Doc | null>(null)
  const [role, setRole] = useState<ShareRole>('reader')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  useEffect(()=>{
    let active=true
    setLoading(true); setDoc(null); setError('')
    void (async()=>{
      try {
        const {data,error}=await supabase.from('documents').select('id,owner_id,title,content,updated_at').eq('id',id!).maybeSingle()
        if(error) throw error
        if(!data) throw new Error('This document is unavailable or has not been shared with you.')
        let access: ShareRole='reader'
        if(data.owner_id!==session.user.id) {
          const share=await supabase.from('document_shares').select('role').eq('document_id',id!).eq('recipient_id',session.user.id).maybeSingle()
          if(share.error) throw share.error
          if(!share.data) throw new Error('This document is no longer shared with you.')
          access=share.data.role as ShareRole
        }
        if(active) {setRole(access); setDoc(data as Doc)}
      } catch(error) {if(active) setError(message(error))}
      finally {if(active) setLoading(false)}
    })()
    return ()=>{active=false}
  },[id,session.user.id])
  if(loading) return <><Header session={session}/><main className="loading" role="status">Opening document…</main></>
  if(!doc) return <><Header session={session}/><main className="loading"><ErrorText text={error}/><button onClick={()=>navigate('/docs')}>Back to library</button></main></>
  return <DocumentEditor key={doc.id} doc={doc} session={session} role={role}/>
}
function DocumentEditor({doc, session, role}: {doc: Doc; session: Session; role: ShareRole}) {
  const owned = doc.owner_id === session.user.id
  const canEdit = owned || role === 'writer'
  const navigate = useNavigate()
  const [title, setTitle] = useState(doc.title)
  const [baseline, setBaseline] = useState(JSON.stringify({ title: doc.title, content: doc.content }))
  const [body, setBody] = useState(doc.content)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [share, setShare] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState('')
  const [importNotice, setImportNotice] = useState('')
  const importInput = useRef<HTMLInputElement>(null)
  const inFlight = useRef(false)
  const shareButton = useRef<HTMLButtonElement>(null)
  const dirty = canEdit && JSON.stringify({title,content:body}) !== baseline
  const dirtyRef = useRef(dirty); dirtyRef.current = dirty
  const editor = useEditor({extensions:[StarterKit.configure({heading:{levels:[1,2,3]},link:false})],content:doc.content || blankContent,editable:canEdit,onUpdate:({editor})=>setBody(editor.getJSON()),editorProps:{attributes:{'aria-label':canEdit?'Document body':'Read-only document body',role:'textbox','aria-multiline':'true','aria-readonly':String(!canEdit)}}})
  const save = useCallback(async()=> {
    if(!canEdit || !editor || inFlight.current || !dirty) return
    const cleanTitle=title.trim()
    if(!cleanTitle || cleanTitle.length>120) {setError('Use a title between 1 and 120 characters, then try Save again.'); return}
    const content=editor.getJSON()
    const snapshot=JSON.stringify({title:cleanTitle,content})
    inFlight.current=true; setSaving(true); setError('')
    try {
      const {data,error} = await supabase.from('documents').update({title:cleanTitle,content}).eq('id',doc.id).select('id').abortSignal(AbortSignal.timeout(15000)).maybeSingle()
      if(error) throw error
      if(!data) throw new Error('No document was saved. Your access may have changed.')
      setBaseline(snapshot)
      // Normalize only the submitted title; preserve any newer edits made during the request.
      setTitle(current=>current===title ? cleanTitle : current)
    } catch(error) {setError('Could not save. Your draft is still here. Check your connection and retry Save. ' + message(error))}
    finally {inFlight.current=false; setSaving(false)}
  },[canEdit,editor,dirty,title,doc.id])
  useEffect(()=>{
    const beforeUnload=(event:BeforeUnloadEvent)=>{if(dirtyRef.current){event.preventDefault();event.returnValue=''}}
    const keydown=(event:KeyboardEvent)=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'){event.preventDefault(); void save()}}
    window.addEventListener('beforeunload',beforeUnload);window.addEventListener('keydown',keydown)
    return ()=>{window.removeEventListener('beforeunload',beforeUnload);window.removeEventListener('keydown',keydown)}
  },[save])
  const blocker=useBlocker(({currentLocation,nextLocation})=>dirty && currentLocation.pathname!==nextLocation.pathname)
  useEffect(()=>{
    if(blocker.state==='blocked') {
      if(window.confirm('Discard unsaved changes?')) blocker.proceed()
      else blocker.reset()
    }
  },[blocker])
  async function appendText(file: File) {
    if(!canEdit||!editor||importing)return
    setImporting(true);setImportError('');setImportNotice('')
    try {
      const content=await importIntoDraft(file,()=>editor.getJSON())
      if(editor.isDestroyed)return
      editor.commands.setContent(content,{emitUpdate:true})
      setImportNotice('Text appended to your draft. Review it, then Save to keep it.')
    }catch(error){setImportError(message(error))}
    finally{setImporting(false);if(importInput.current)importInput.current.value=''}
  }
  const canLeave=()=>!dirty || window.confirm('Discard unsaved changes?')
  return <><Header session={session} beforeLeave={canLeave}/>
    <main className="editor-workspace">
      <div className="editor-heading">
        <button className="back" onClick={()=>navigate('/docs')}>← Library</button>
        <div className="editor-actions">
          <span className={'save-state'+(error?' failed':'')} role="status">{canEdit ? saving?'Saving…':error?'Save failed':dirty?'Unsaved changes':'Saved' : 'Read-only · shared with you'}</span>
          {canEdit && <button className="primary" disabled={!dirty||saving} onClick={()=>void save()}>{saving?'Saving…':'Save'}</button>}
          {owned && <button ref={shareButton} onClick={()=>setShare(true)}>Share</button>}
        </div>
      </div>
      <div className="title-area">
        <p className="eyebrow">{owned ? 'YOUR DOCUMENT / OWNER' : canEdit ? 'SHARED DOCUMENT / WRITER' : 'SHARED DOCUMENT / READ-ONLY'}</p>
        {canEdit ? <input className="title-input" aria-label="Document title" maxLength={120} value={title} onChange={e=>{setTitle(e.target.value);setError('')}}/> : <h1 className="readonly-title">{title}</h1>}
        <p className="hint">{owned ? 'You manage access · Save with Ctrl / ⌘ S' : canEdit ? 'You can edit · Only the owner manages sharing · Save with Ctrl / ⌘ S' : 'You have read access. Ask the owner for Writer access to make changes.'}</p>
      </div>
      <ErrorText text={error}/>
      {canEdit&&<div className="draft-import"><div><button disabled={importing} onClick={()=>importInput.current?.click()}>{importing?'Reading text…':'Import text into draft ↗'}</button><span className="hint">UTF-8 .txt · up to 100 KiB · appends without replacing your work</span></div><input ref={importInput} type="file" accept=".txt,text/plain" aria-label="Import text into current draft" hidden onChange={event=>{const file=event.target.files?.[0];if(file)void appendText(file)}}/><ErrorText text={importError}/>{importNotice&&<p className="success">{importNotice}</p>}</div>}
      {canEdit && editor && <Toolbar editor={editor}/>}
      <div className="writing-page"><EditorContent editor={editor}/></div>
      <Attachments documentId={doc.id} canEdit={canEdit}/>
    </main>
    {share && <ShareDialog document={doc} onClose={()=>{setShare(false); requestAnimationFrame(()=>shareButton.current?.focus())}}/>}
  </>
}
function Toolbar({editor}: {editor: Editor}) {
  const active=useEditorState({editor,selector:({editor})=>({bold:editor.isActive('bold'),italic:editor.isActive('italic'),underline:editor.isActive('underline'),h1:editor.isActive('heading',{level:1}),h2:editor.isActive('heading',{level:2}),h3:editor.isActive('heading',{level:3}),bullet:editor.isActive('bulletList'),ordered:editor.isActive('orderedList')})})
  return <div className="toolbar" role="group" aria-label="Text formatting">
    <label className="sr-only" htmlFor="heading-style">Paragraph style</label><select id="heading-style" value={active.h1?'1':active.h2?'2':active.h3?'3':'0'} onChange={e=>{const level=Number(e.target.value); if(!level) editor.chain().focus().setParagraph().run(); else editor.chain().focus().setHeading({level:level as 1|2|3}).run()}}><option value="0">Paragraph</option><option value="1">Heading 1</option><option value="2">Heading 2</option><option value="3">Heading 3</option></select><span className="toolbar-divider"/>
    <button aria-pressed={active.bold} title="Bold (Ctrl/⌘ B)" onClick={()=>editor.chain().focus().toggleBold().run()}><b>Bold</b></button>
    <button aria-pressed={active.italic} title="Italic (Ctrl/⌘ I)" onClick={()=>editor.chain().focus().toggleItalic().run()}><i>Italic</i></button>
    <button aria-pressed={active.underline} title="Underline (Ctrl/⌘ U)" onClick={()=>editor.chain().focus().toggleUnderline().run()}><u>Underline</u></button><span className="toolbar-divider"/>
    <button aria-pressed={active.bullet} onClick={()=>editor.chain().focus().toggleBulletList().run()}>• Bullet list</button><button aria-pressed={active.ordered} onClick={()=>editor.chain().focus().toggleOrderedList().run()}>1. Numbered list</button>
  </div>
}
function keepDialogFocus(event: React.KeyboardEvent<HTMLDialogElement>) {
  if (event.key !== 'Tab') return
  const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), select:not(:disabled), input:not(:disabled), [tabindex="0"]'))
  const first = controls[0], last = controls.at(-1)
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
}
function ShareDialog({document: doc,onClose}: {document: Pick<Doc,'id'|'owner_id'|'title'>; onClose:()=>void}) {
  const ref=useRef<HTMLDialogElement>(null)
  const [users,setUsers]=useState<DemoUser[]>([])
  const [recipients,setRecipients]=useState<Recipient[]>([])
  const [selected,setSelected]=useState('')
  const [role,setRole]=useState<ShareRole>('reader')
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  useEffect(()=>{const dialog=ref.current;dialog?.showModal();return()=>dialog?.close()},[])
  useEffect(()=>{
    let active=true
    void Promise.all([
      supabase.from('demo_users').select('id,alias').neq('id',doc.owner_id),
      supabase.from('document_shares').select('recipient_id,role').eq('document_id',doc.id),
    ]).then(([directory,shares])=>{
      if(!active)return
      if(directory.error||shares.error)setError(message(directory.error||shares.error))
      else{setUsers(directory.data);setRecipients(shares.data as Recipient[])}
      setLoading(false)
    })
    return()=>{active=false}
  },[doc.id,doc.owner_id])
  async function grant(event: React.FormEvent) {
    event.preventDefault();if(!selected||busy)return
    setBusy(true);setError('');setNotice('')
    try {
      const result=await supabase.from('document_shares').insert({document_id:doc.id,owner_id:doc.owner_id,recipient_id:selected,role}).select('recipient_id,role').maybeSingle()
      if(result.error && result.error.code!=='23505')throw result.error
      // A concurrent duplicate preserves the existing grant, never silently changes its role.
      const existing=result.error ? await supabase.from('document_shares').select('recipient_id,role').eq('document_id',doc.id).eq('recipient_id',selected).maybeSingle() : result
      if(existing.error)throw existing.error
      if(!existing.data)throw new Error('No access was confirmed. Reload and try again.')
      const recipient=existing.data as Recipient
      setRecipients(current=>[...current.filter(r=>r.recipient_id!==selected),recipient])
      setNotice(result.error ? 'Already shared. Use the role control below to change access.' : `${role==='writer'?'Writer':'Read'} access granted. They can now open this document.`)
      setSelected('')
    } catch(error){setError(message(error))}
    finally{setBusy(false)}
  }
  async function changeRole(recipientId: string, nextRole: ShareRole) {
    if(busy)return
    setBusy(true);setError('');setNotice('')
    try {
      const {data,error}=await supabase.from('document_shares').update({role:nextRole}).eq('document_id',doc.id).eq('recipient_id',recipientId).select('recipient_id,role').maybeSingle()
      if(error)throw error
      if(!data)throw new Error('Role was not changed. Your access may have changed; reload and retry.')
      setRecipients(current=>current.map(r=>r.recipient_id===recipientId ? data as Recipient : r))
      setNotice(`Access changed to ${nextRole==='writer'?'Writer':'Reader'}. Ask them to refresh or reopen the document.`)
    } catch(error){setError('Could not change access. '+message(error))}
    finally{setBusy(false)}
  }
  return <dialog ref={ref} onKeyDown={keepDialogFocus} onCancel={onClose} onClick={e=>{if(e.target===ref.current)onClose()}} aria-labelledby="share-title">
    <div className="dialog-head"><p className="eyebrow">SHARE YOUR IDEAS</p><button aria-label="Close share dialog" onClick={onClose}>Close</button></div>
    <h2 id="share-title">A little more perspective.</h2>
    <p className="muted">Share “{doc.title}” with a demo teammate.<br/>Readers can view. Writers can edit and save. Only you manage access.</p>
    {loading?<p role="status">Loading teammates…</p>:<form onSubmit={grant}>
      <div className="share-picker"><label htmlFor="share-recipient">Give access</label><select id="share-recipient" autoFocus value={selected} disabled={busy} onChange={e=>setSelected(e.target.value)} required><option value="">Choose a teammate</option>{users.filter(u=>!recipients.some(r=>r.recipient_id===u.id)).map(u=><option key={u.id} value={u.id}>{u.alias}</option>)}</select></div>
      <div className="share-picker"><label htmlFor="new-share-role">Role</label><select id="new-share-role" value={role} disabled={busy} onChange={e=>setRole(e.target.value as ShareRole)}><option value="reader">Reader</option><option value="writer">Writer</option></select></div>
      <button className="primary" disabled={!selected||busy}>{busy?'Saving access…':'Share document'}</button>
    </form>}
    <ErrorText text={error}/>{notice&&<p className="success" role="status">{notice}</p>}
    <div className="recipients"><h3>Who has access</h3><p>You <span>Owner · can edit and share</span></p>{recipients.map(recipient=>{
      const alias=users.find(u=>u.id===recipient.recipient_id)?.alias||'Demo teammate'
      return <div className="recipient-row" key={recipient.recipient_id}><span>{alias}</span><select aria-label={`Role for ${alias}`} value={recipient.role} disabled={busy} onChange={e=>void changeRole(recipient.recipient_id,e.target.value as ShareRole)}><option value="reader">Reader</option><option value="writer">Writer</option></select></div>
    })}</div>
  </dialog>
}

const router=createBrowserRouter([{path:'*',element:<App/>}])
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><RouterProvider router={router}/></React.StrictMode>)
