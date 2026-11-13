// Uses only the publishable key and ordinary password sessions. Leaves a labeled review document.
import { createClient } from '@supabase/supabase-js'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
for (const path of ['.env.local', '.env.review.local', 'users.env.review.local']) {
  try { for (const line of readFileSync(path,'utf8').split('\n')) {
    const match=line.match(/^([A-Z_]+)=(.*)$/); if(match && !process.env[match[1]]) process.env[match[1]]=match[2].trim().replace(/^['"]|['"]$/g,'')
  }} catch { /* optional local files */ }
}
const required=['VITE_SUPABASE_URL','VITE_SUPABASE_PUBLISHABLE_KEY','ALICE_EMAIL','ALICE_PASSWORD','BOB_EMAIL','BOB_PASSWORD']
for(const name of required) if(!process.env[name]) throw new Error(`Set ${name} in ignored .env.review.local or environment. See DASHBOARD_SETUP.md.`)
const client=()=>createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
const alice=client(), bob=client(), anonymous=client()
const checks=[]
function pass(name){checks.push(name);console.log('PASS',name)}
const {data:a,error:ae}=await alice.auth.signInWithPassword({email:process.env.ALICE_EMAIL,password:process.env.ALICE_PASSWORD});assert.ifError(ae)
const {data:b,error:be}=await bob.auth.signInWithPassword({email:process.env.BOB_EMAIL,password:process.env.BOB_PASSWORD});assert.ifError(be)
assert.notEqual(a.user.id,b.user.id)
const directory=await alice.from('demo_users').select('id,alias');assert.ifError(directory.error);assert.ok(directory.data.some(u=>u.id===a.user.id)&&directory.data.some(u=>u.id===b.user.id),'Demo directory is missing Alice or Bob. Run supabase/seed-demo.sql in SQL Editor before checking sharing.')
const roleSchema=await alice.from('document_shares').select('role').limit(1);if(roleSchema.error)throw new Error('Apply supabase/migrations/202611130002_share_roles.sql first: '+roleSchema.error.message)
const content={type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Owner data must remain unchanged.'}]}]}
const title='Permission check '+new Date().toISOString()
const {data:doc,error:ce}=await alice.from('documents').insert({title,content}).select().single();assert.ifError(ce);assert.equal(doc.owner_id,a.user.id);pass('Alice creates document; owner derived from session')
const read=async(c)=>c.from('documents').select('id,title,content,owner_id').eq('id',doc.id)
let result=await read(bob);assert.ifError(result.error);assert.deepEqual(result.data,[]);pass('Bob cannot read before share (zero rows)')
result=await read(anonymous);assert.ok(result.error || result.data?.length===0);pass('Anonymous cannot read')
let write=await bob.from('documents').update({title:'Unauthorized edit'}).eq('id',doc.id).select('id');assert.ok(write.error || write.data?.length===0);pass('Bob private write denied; zero rows is not success')
let grant=await bob.from('document_shares').insert({document_id:doc.id,owner_id:a.user.id,recipient_id:b.user.id}).select();assert.ok(grant.error);pass('Bob cannot grant using Alice owner ID')
grant=await bob.from('document_shares').insert({document_id:doc.id,owner_id:b.user.id,recipient_id:a.user.id}).select();assert.ok(grant.error);pass('Bob cannot forge document ownership through a share')
const share={document_id:doc.id,owner_id:a.user.id,recipient_id:b.user.id}
grant=await alice.from('document_shares').insert(share).select();assert.ifError(grant.error);assert.equal(grant.data.length,1);pass('Alice grants Bob read access')
grant=await alice.from('document_shares').insert(share);assert.equal(grant.error?.code,'23505');pass('Duplicate grant is constrained (UI treats 23505 as harmless)')
result=await read(bob);assert.ifError(result.error);assert.equal(result.data.length,1);assert.deepEqual(result.data[0].content,content);pass('Bob reads original document after share')
write=await bob.from('documents').update({title:'Unauthorized shared edit',content:{type:'doc',content:[]}}).eq('id',doc.id).select('id');assert.ok(write.error || write.data?.length===0);pass('Bob shared write denied')
grant=await bob.from('document_shares').insert({document_id:doc.id,owner_id:b.user.id,recipient_id:a.user.id});assert.ok(grant.error);pass('Bob shared grant denied')
for(const changes of [{owner_id:b.user.id},{id:crypto.randomUUID()},{updated_at:'2000-01-01T00:00:00Z'}]){
 const r=await alice.from('documents').update(changes).eq('id',doc.id).select('id');assert.ok(r.error);pass('Owner cannot update protected column '+Object.keys(changes)[0])
}
for(const bad of [{title:'  ',content},{title:'Invalid content',content:{type:'paragraph'}}]){
 const r=await alice.from('documents').insert(bad);assert.ok(r.error);pass('Database rejects invalid '+(bad.title==='  '?'title':'root shape'))
}
grant=await alice.from('document_shares').insert({document_id:doc.id,owner_id:a.user.id,recipient_id:a.user.id});assert.ok(grant.error);pass('Self-sharing is denied')
result=await read(alice);assert.ifError(result.error);assert.equal(result.data[0].title,title);assert.deepEqual(result.data[0].content,content);pass('Owner data unchanged after denied actions')
const saved=await alice.from('documents').update({title:title+' saved',content}).eq('id',doc.id).select('id,updated_at').single();assert.ifError(saved.error);assert.equal(saved.data.id,doc.id);assert.ok(new Date(saved.data.updated_at)>=new Date(doc.updated_at));pass('Owner can save; database sets updated_at')
// Only the owner can change the role, and only role is mutable on a share.
let roleChange=await bob.from('document_shares').update({role:'writer'}).eq('document_id',doc.id).eq('recipient_id',b.user.id).select('role');assert.ok(roleChange.error||roleChange.data?.length===0);pass('Reader cannot promote themself')
roleChange=await alice.from('document_shares').update({role:'writer'}).eq('document_id',doc.id).eq('recipient_id',b.user.id).select('role').single();assert.ifError(roleChange.error);assert.equal(roleChange.data.role,'writer');pass('Owner promotes existing recipient to Writer')
const writerContent={type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Bob saved this as a writer.'}]}]}
write=await bob.from('documents').update({title:'Writer saved title',content:writerContent}).eq('id',doc.id).select('id');assert.ifError(write.error);assert.equal(write.data.length,1);pass('Writer saves title and content')
result=await read(alice);assert.ifError(result.error);assert.equal(result.data[0].title,'Writer saved title');assert.deepEqual(result.data[0].content,writerContent);assert.equal(result.data[0].owner_id,a.user.id);pass('Owner sees writer changes; ownership unchanged')
roleChange=await bob.from('document_shares').update({role:'reader'}).eq('document_id',doc.id).eq('recipient_id',b.user.id).select('role');assert.ok(roleChange.error||roleChange.data?.length===0);pass('Writer cannot manage roles')
grant=await bob.from('document_shares').insert({document_id:doc.id,owner_id:b.user.id,recipient_id:a.user.id,role:'writer'});assert.ok(grant.error);pass('Writer cannot grant access')
write=await bob.from('documents').update({owner_id:b.user.id}).eq('id',doc.id).select('id');assert.ok(write.error);pass('Writer cannot take ownership')
for(const changes of [{owner_id:b.user.id},{recipient_id:a.user.id},{document_id:crypto.randomUUID()}]){
 const r=await alice.from('document_shares').update(changes).eq('document_id',doc.id).eq('recipient_id',b.user.id).select('role');assert.ok(r.error);pass('Share identity immutable: '+Object.keys(changes)[0])
}
roleChange=await alice.from('document_shares').update({role:'admin'}).eq('document_id',doc.id).eq('recipient_id',b.user.id);assert.ok(roleChange.error);pass('Invalid role rejected')
roleChange=await alice.from('document_shares').update({role:'reader'}).eq('document_id',doc.id).eq('recipient_id',b.user.id).select('role').single();assert.ifError(roleChange.error);assert.equal(roleChange.data.role,'reader');pass('Owner downgrades Writer to Reader')
write=await bob.from('documents').update({title:'Stale writer attempted save'}).eq('id',doc.id).select('id');assert.ok(write.error||write.data?.length===0);pass('Downgrade immediately denies writes with the same ordinary session')
result=await read(alice);assert.ifError(result.error);assert.equal(result.data[0].title,'Writer saved title');assert.deepEqual(result.data[0].content,writerContent);pass('Denied downgraded save leaves saved writer data intact')
result=await read(anonymous);assert.ok(result.error || result.data?.length===0);pass('Anonymous still cannot read after share')
const settings=await fetch(process.env.VITE_SUPABASE_URL+'/auth/v1/settings',{headers:{apikey:process.env.VITE_SUPABASE_PUBLISHABLE_KEY}}).then(r=>r.json());pass('Auth configuration checked; self-service signup '+(settings.disable_signup?'disabled':'enabled'))
console.log(JSON.stringify({testedAt:new Date().toISOString(),documentId:doc.id,checks:checks.length,scope:'Real Supabase API with ordinary Alice/Bob sessions; not browser UX checks'},null,2))
await Promise.all([alice.auth.signOut({scope:'local'}),bob.auth.signOut({scope:'local'})])
