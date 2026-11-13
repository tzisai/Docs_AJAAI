import React, { useCallback, useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate, Route, Routes, useBlocker, useLocation, useNavigate, useParams } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import type { Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { blankContent, configured, createDocument, message, supabase } from './data'
import type { DemoUser, Doc, Metadata } from './data'
import { importText } from './importText'
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
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const refresh = useCallback(async()=> {
    setLoading(true); setError('')
    const [documents, directory] = await Promise.all([
      supabase.from('documents').select('id,owner_id,title,updated_at').order('updated_at',{ascending:false}),
      supabase.from('demo_users').select('id,alias'),
    ])
    if(documents.error || directory.error) setError(message(documents.error || directory.error))
    else {setDocs(documents.data); setUsers(directory.data)}
    setLoading(false)
  }, [])
  useEffect(()=>{void refresh()},[refresh])
  async function create(file?: File) {
    if(busy) return
    setBusy(true); setError('')
    try { const converted = file ? await importText(file) : undefined; const id = await createDocument(converted?.title, converted?.content); navigate('/docs/' + id) }
    catch(error) {setError(message(error))} finally {setBusy(false); if(fileRef.current) fileRef.current.value=''}
  }
  function section(title: string, owned: boolean, index: string) {
    const items = docs.filter(doc => (doc.owner_id === session.user.id) === owned)
    return <section className="document-section"><div className="section-heading"><h2>{title}</h2><span className="count">{String(items.length).padStart(2,'0')}</span></div>{items.length ? <div className="document-list"><div className="list-labels"><span>DOCUMENT</span><span>ACCESS / OWNER</span><span>LAST EDITED</span></div>{items.map(doc=><button className="document-row" key={doc.id} onClick={()=>navigate('/docs/'+doc.id)}><span className="document-name"><span className="doc-symbol" aria-hidden="true">↗</span>{doc.title}</span><span className="ownership">{owned ? 'Owner · you' : `Shared · ${users.find(u=>u.id===doc.owner_id)?.alias || 'Document owner'}`}</span><time dateTime={doc.updated_at}>{new Date(doc.updated_at).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'})}</time></button>)}</div> : <div className="empty"><span className="empty-index">{index}</span><div><h3>{owned ? 'A fresh page is waiting.' : 'Good ideas travel.'}</h3><p>{owned ? 'Create a document or import your notes to begin.' : 'Documents others share with you will appear here, ready to read.'}</p></div></div>}</section>
  }
  return <><Header session={session}/><main className="library"><div className="library-heading"><div><p className="eyebrow">YOUR WORKSPACE</p><h1>Room for your ideas.</h1><p className="muted">A place to write, keep, and share what matters.</p></div><div className="library-actions"><div className="buttons"><button disabled={busy} onClick={()=>fileRef.current?.click()}>Import .txt</button><button className="primary" disabled={busy} onClick={()=>void create()}>{busy ? 'Creating…' : 'New document +'}</button></div><p className="hint">Import UTF-8 .txt · up to 100 KiB</p><input ref={fileRef} type="file" accept=".txt,text/plain" aria-label="Import UTF-8 text file" hidden onChange={e=>{const file=e.target.files?.[0]; if(file) void create(file)}}/></div></div><ErrorText text={error}/>{error && <button onClick={()=>void refresh()}>Reload library</button>}{loading ? <p role="status">Loading your documents…</p> : <>{section('My documents',true,'01')}{section('Shared with me',false,'02')}</>}<footer>Built for a little more focus.</footer></main></>
}
function DocumentRoute({session}: {session: Session}) {
  const {id} = useParams()
  const [doc, setDoc] = useState<Doc | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  useEffect(()=>{let active=true; setLoading(true); setDoc(null); setError(''); void supabase.from('documents').select('id,owner_id,title,content,updated_at').eq('id',id!).maybeSingle().then(({data,error})=>{if(!active)return; if(error) setError(message(error)); else if(!data) setError('This document is unavailable or has not been shared with you.'); else setDoc(data as Doc); setLoading(false)}); return ()=>{active=false}},[id])
  if(loading) return <><Header session={session}/><main className="loading" role="status">Opening document…</main></>
  if(!doc) return <><Header session={session}/><main className="loading"><ErrorText text={error}/><button onClick={()=>navigate('/docs')}>Back to library</button></main></>
  return <DocumentEditor key={doc.id} doc={doc} session={session}/>
}
function DocumentEditor({doc, session}: {doc: Doc; session: Session}) {
  const owned = doc.owner_id === session.user.id
  const navigate = useNavigate()
  const [title, setTitle] = useState(doc.title)
  const [baseline, setBaseline] = useState(JSON.stringify({ title: doc.title, content: doc.content }))
  const [body, setBody] = useState(doc.content)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [share, setShare] = useState(false)
  const inFlight = useRef(false)
  const dirty = owned && JSON.stringify({title,content:body}) !== baseline
  const dirtyRef = useRef(dirty); dirtyRef.current = dirty
  const editor = useEditor({extensions:[StarterKit.configure({heading:{levels:[1,2,3]},link:false})],content:doc.content || blankContent,editable:owned,onUpdate:({editor})=>setBody(editor.getJSON()),editorProps:{attributes:{'aria-label':owned?'Document body':'Read-only document body',role:'textbox','aria-multiline':'true','aria-readonly':String(!owned)}}})
  const save = useCallback(async()=> {
    if(!owned || !editor || inFlight.current || !dirty) return
    const cleanTitle=title.trim()
    if(!cleanTitle || cleanTitle.length>120) {setError('Use a title between 1 and 120 characters, then try Save again.'); return}
    const content=editor.getJSON()
    const snapshot=JSON.stringify({title:cleanTitle,content})
    inFlight.current=true; setSaving(true); setError('')
    try {
      const {data,error} = await supabase.from('documents').update({title:cleanTitle,content}).eq('id',doc.id).eq('owner_id',session.user.id).select('id').abortSignal(AbortSignal.timeout(15000)).maybeSingle()
      if(error) throw error
      if(!data) throw new Error('No document was saved. Your access may have changed.')
      setBaseline(snapshot)
      // Normalize only the submitted title; preserve any newer edits made during the request.
      setTitle(current=>current===title ? cleanTitle : current)
    } catch(error) {setError('Could not save. Your draft is still here. Check your connection and retry Save. ' + message(error))}
    finally {inFlight.current=false; setSaving(false)}
  },[owned,editor,dirty,title,doc.id,session.user.id])
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
  const canLeave=()=>!dirty || window.confirm('Discard unsaved changes?')
  return <><Header session={session} beforeLeave={canLeave}/><main className="editor-workspace"><div className="editor-heading"><button className="back" onClick={()=>navigate('/docs')}>← Library</button><div className="editor-actions"><span className={'save-state'+(error?' failed':'')} role="status">{owned ? saving?'Saving…':error?'Save failed':dirty?'Unsaved changes':'Saved' : 'Read-only · shared with you'}</span>{owned && <><button className="primary" disabled={!dirty||saving} onClick={()=>void save()}>{saving?'Saving…':'Save'}</button><button onClick={()=>setShare(true)}>Share</button></>}</div></div><div className="title-area"><p className="eyebrow">{owned ? 'YOUR DOCUMENT' : 'SHARED DOCUMENT / READ-ONLY'}</p>{owned ? <input className="title-input" aria-label="Document title" maxLength={120} value={title} onChange={e=>{setTitle(e.target.value);setError('')}}/> : <h1 className="readonly-title">{title}</h1>}<p className="hint">{owned ? 'Only you can edit · Save with Ctrl / ⌘ S' : 'You have view access. Only the owner can make changes.'}</p></div><ErrorText text={error}/>{owned && editor && <Toolbar editor={editor}/>}<div className="writing-page"><EditorContent editor={editor}/></div></main>{share && <ShareDialog document={doc} onClose={()=>setShare(false)}/>}</>
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
function ShareDialog({document: doc,onClose}: {document: Doc; onClose:()=>void}) {
  const ref=useRef<HTMLDialogElement>(null)
  const [users,setUsers]=useState<DemoUser[]>([])
  const [recipients,setRecipients]=useState<string[]>([])
  const [selected,setSelected]=useState('')
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  useEffect(()=>{const dialog=ref.current;dialog?.showModal();return()=>dialog?.close()},[])
  useEffect(()=>{let active=true; void Promise.all([supabase.from('demo_users').select('id,alias').neq('id',doc.owner_id),supabase.from('document_shares').select('recipient_id').eq('document_id',doc.id)]).then(([directory,shares])=>{if(!active)return; if(directory.error||shares.error)setError(message(directory.error||shares.error));else{setUsers(directory.data);setRecipients(shares.data.map(s=>s.recipient_id))}setLoading(false)});return()=>{active=false}},[doc.id,doc.owner_id])
  async function grant(event: React.FormEvent) {
    event.preventDefault();if(!selected||busy)return;setBusy(true);setError('');setNotice('')
    const {data,error}=await supabase.from('document_shares').insert({document_id:doc.id,owner_id:doc.owner_id,recipient_id:selected}).select('recipient_id').maybeSingle()
    if(error && error.code!=='23505')setError(message(error));else if(!error&&!data)setError('No access was granted. Reload and try again.');else{setRecipients(current=>[...new Set([...current,selected])]);setNotice('Read access granted. They can now open this document.');setSelected('')}
    setBusy(false)
  }
  return <dialog ref={ref} onCancel={onClose} onClick={e=>{if(e.target===ref.current)onClose()}} aria-labelledby="share-title"><div className="dialog-head"><p className="eyebrow">SHARE YOUR IDEAS</p><button aria-label="Close share dialog" onClick={onClose}>Close</button></div><h2 id="share-title">A little more perspective.</h2><p className="muted">Invite a demo teammate to read “{doc.title}”.<br/>You remain the only editor.</p>{loading?<p role="status">Loading teammates…</p>:<form onSubmit={grant}><label>Give read access<select autoFocus value={selected} onChange={e=>setSelected(e.target.value)} required><option value="">Choose a teammate</option>{users.filter(u=>!recipients.includes(u.id)).map(u=><option key={u.id} value={u.id}>{u.alias}</option>)}</select></label><button className="primary" disabled={!selected||busy}>{busy?'Sharing…':'Share document'}</button></form>}<ErrorText text={error}/>{notice&&<p className="success" role="status">{notice}</p>}<div className="recipients"><h3>Who has access</h3><p>You <span>Owner · can edit</span></p>{recipients.map(id=><p key={id}>{users.find(u=>u.id===id)?.alias||'Demo teammate'}<span>Can read</span></p>)}</div></dialog>
}
const router=createBrowserRouter([{path:'*',element:<App/>}])
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><RouterProvider router={router}/></React.StrictMode>)
