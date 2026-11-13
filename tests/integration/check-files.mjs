// Verifies image persistence with the existing documents schema; no preview column or Storage bucket.
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
 const fixture=readFileSync('samples/idea-board.png'),src='data:image/png;base64,'+fixture.toString('base64')
 const content={type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Text before image'}]},{type:'image',attrs:{src,alt:'idea-board.png',title:'idea-board.png'}},{type:'paragraph',content:[{type:'text',text:'Text after image'}]}]}
 const {data:doc,error:de}=await alice.from('documents').insert({title:'Inline image check '+new Date().toISOString(),content}).select('id').single();assert.ifError(de);pass('Create document containing an image and text without new SQL/Storage setup')
 let result=await alice.from('documents').select('title,content').eq('id',doc.id).single();assert.ifError(result.error);assert.deepEqual(result.data.content,content);pass('Reopen preserves exact image bytes and surrounding text')
 const list=await alice.from('documents').select('id,owner_id,title,updated_at,first:content->content->0->content->0->>text,second:content->content->1->content->0->>text,third:content->content->2->content->0->>text').eq('id',doc.id);assert.ifError(list.error);assert.equal(list.data.length,1);assert.equal(list.data[0].first,'Text before image');assert.equal(list.data[0].third,'Text after image');assert.ok(!JSON.stringify(list.data).includes('data:image'));pass('Library lists saved document without preview column or image bytes')
 let read=await bob.from('documents').select('id,content').eq('id',doc.id);assert.ifError(read.error);assert.equal(read.data.length,0);pass('Bob cannot read private image document')
 read=await anon.from('documents').select('id,content').eq('id',doc.id);assert.ok(read.error||read.data?.length===0);pass('Anonymous cannot read image document')
 let grant=await alice.from('document_shares').insert({document_id:doc.id,owner_id:a.user.id,recipient_id:b.user.id});assert.ifError(grant.error)
 read=await bob.from('documents').select('content').eq('id',doc.id).single();assert.ifError(read.error);assert.deepEqual(read.data.content,content);pass('Reader sees image as part of shared document')
 let write=await bob.from('documents').update({content:{type:'doc',content:[]}}).eq('id',doc.id).select('id');assert.ok(write.error||write.data?.length===0);pass('Reader cannot remove/replace image')
 grant=await alice.from('document_shares').update({role:'writer'}).eq('document_id',doc.id).eq('recipient_id',b.user.id).select('role').single();assert.ifError(grant.error)
 const edited={...content,content:[...content.content,{type:'paragraph',content:[{type:'text',text:'Writer kept the image and added text'}]}]}
 write=await bob.from('documents').update({title:'Writer saved image document',content:edited}).eq('id',doc.id).select('id');assert.ifError(write.error);assert.equal(write.data.length,1)
 result=await alice.from('documents').select('title,content').eq('id',doc.id).single();assert.ifError(result.error);assert.equal(result.data.title,'Writer saved image document');assert.deepEqual(result.data.content,edited);pass('Writer saves title/text/image atomically; owner reopens exact result')
 grant=await alice.from('document_shares').update({role:'reader'}).eq('document_id',doc.id).eq('recipient_id',b.user.id).select('role').single();assert.ifError(grant.error)
 write=await bob.from('documents').update({content:{type:'doc',content:[]}}).eq('id',doc.id).select('id');assert.ok(write.error||write.data?.length===0);pass('Downgrade immediately protects saved image and text')
 // Exercise the largest allowed single-image payload through the actual data API.
 const padded=Buffer.alloc(2*1024*1024);fixture.copy(padded)
 const largeContent={type:'doc',content:[{type:'image',attrs:{src:'data:image/png;base64,'+padded.toString('base64'),alt:'Max-size PNG'}}]}
 const large=await alice.from('documents').update({content:largeContent}).eq('id',doc.id).select('id').single();assert.ifError(large.error)
 const reopened=await alice.from('documents').select('content').eq('id',doc.id).single();assert.ifError(reopened.error);assert.equal(reopened.data.content.content[0].attrs.src,largeContent.content[0].attrs.src);pass('2 MiB image payload survives real save and reopen')
 // Leave the small readable fixture, not a large testing payload, in the review document.
 const restore=await alice.from('documents').update({content:edited}).eq('id',doc.id).select('id').single();assert.ifError(restore.error)
 console.log(JSON.stringify({testedAt:new Date().toISOString(),documentId:doc.id,scope:'Real ordinary-account Postgres persistence and permissions; no new migration required'},null,2))
}finally{await Promise.all([alice.auth.signOut({scope:'local'}),bob.auth.signOut({scope:'local'})])}
