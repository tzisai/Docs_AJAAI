// Deletes only the new sample document created by this test, never an existing document.
import {createClient} from '@supabase/supabase-js'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
for(const path of ['.env.local','.env.review.local','users.env.review.local']){try{for(const line of readFileSync(path,'utf8').split('\n')){const m=line.match(/^([A-Z_]+)=(.*)$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2].trim().replace(/^['"]|['"]$/g,'')}}catch{}}
for(const key of ['VITE_SUPABASE_URL','VITE_SUPABASE_PUBLISHABLE_KEY','ALICE_EMAIL','ALICE_PASSWORD','BOB_EMAIL','BOB_PASSWORD'])if(!process.env[key])throw new Error('Missing '+key+'; see tests/README.md')
const client=()=>createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
const alice=client(),bob=client(),anon=client(),pass=name=>console.log('PASS',name)
try{
 const {data:a,error:ae}=await alice.auth.signInWithPassword({email:process.env.ALICE_EMAIL,password:process.env.ALICE_PASSWORD});assert.ifError(ae)
 const {data:b,error:be}=await bob.auth.signInWithPassword({email:process.env.BOB_EMAIL,password:process.env.BOB_PASSWORD});assert.ifError(be)
 const content={type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Created only for the deletion acceptance test.'}]},{type:'image',attrs:{src:'data:image/png;base64,'+readFileSync('samples/idea-board.png').toString('base64'),alt:'Deletion fixture'}}]}
 const {data:doc,error}=await alice.from('documents').insert({title:'Delete acceptance '+new Date().toISOString(),content}).select('id').single();assert.ifError(error)
 let grant=await alice.from('document_shares').insert({document_id:doc.id,owner_id:a.user.id,recipient_id:b.user.id});assert.ifError(grant.error)
 let deleted=await bob.from('documents').delete().eq('id',doc.id).select('id');assert.ok(deleted.error||deleted.data?.length===0);pass('Reader delete denied')
 grant=await alice.from('document_shares').update({role:'writer'}).eq('document_id',doc.id).eq('recipient_id',b.user.id).select('role').single();assert.ifError(grant.error)
 deleted=await bob.from('documents').delete().eq('id',doc.id).select('id');assert.ok(deleted.error||deleted.data?.length===0);pass('Writer delete denied')
 deleted=await anon.from('documents').delete().eq('id',doc.id).select('id');assert.ok(deleted.error||deleted.data?.length===0);pass('Anonymous delete denied')
 const before=await alice.from('documents').select('content').eq('id',doc.id).single();assert.ifError(before.error);assert.deepEqual(before.data.content,content);pass('Denied attempts preserve text and embedded image')
 deleted=await alice.from('documents').delete().eq('id',doc.id).eq('owner_id',a.user.id).select('id').single()
 if(deleted.error)throw new Error('Owner deletion is not enabled. Run supabase/migrations/202611130004_owner_delete.sql in SQL Editor, then rerun this test. '+deleted.error.message)
 assert.equal(deleted.data.id,doc.id);pass('Owner deletion returns the affected row')
 const remaining=await alice.from('documents').select('id').eq('id',doc.id);assert.ifError(remaining.error);assert.equal(remaining.data.length,0)
 const shares=await alice.from('document_shares').select('document_id').eq('document_id',doc.id);assert.ifError(shares.error);assert.equal(shares.data.length,0);pass('Document/image and all sharing grants removed')
 const reader=await bob.from('documents').select('id').eq('id',doc.id);assert.ifError(reader.error);assert.equal(reader.data.length,0);pass('Former recipient cannot reopen deleted document')
 console.log(JSON.stringify({testedAt:new Date().toISOString(),deletedSampleId:doc.id,scope:'Real ordinary-account deletion; only this test fixture was deleted'},null,2))
}finally{await Promise.all([alice.auth.signOut({scope:'local'}),bob.auth.signOut({scope:'local'})])}
