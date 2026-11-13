import {createClient} from '@supabase/supabase-js'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
for(const path of ['.env.local','.env.review.local','users.env.review.local']){try{for(const line of readFileSync(path,'utf8').split('\n')){const m=line.match(/^([A-Z_]+)=(.*)$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2].trim().replace(/^['"]|['"]$/g,'')}}catch{}}
for(const key of ['VITE_SUPABASE_URL','VITE_SUPABASE_PUBLISHABLE_KEY','ALICE_EMAIL','ALICE_PASSWORD','BOB_EMAIL','BOB_PASSWORD'])if(!process.env[key])throw new Error('Missing '+key+'; see tests/README.md')
const client=()=>createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
const alice=client(),bob=client(),anon=client(),bucket='document-images'
const paths=[]
const pass=name=>console.log('PASS',name)
const sha=bytes=>createHash('sha256').update(bytes).digest('hex')
try{
 const {data:a,error:ae}=await alice.auth.signInWithPassword({email:process.env.ALICE_EMAIL,password:process.env.ALICE_PASSWORD});assert.ifError(ae)
 const {data:b,error:be}=await bob.auth.signInWithPassword({email:process.env.BOB_EMAIL,password:process.env.BOB_PASSWORD});assert.ifError(be)
 const schema=await alice.from('documents').select('preview').limit(1);if(schema.error)throw new Error('Apply 202611130003_previews_attachments.sql first: '+schema.error.message)
 const content={type:'doc',content:[{type:'heading',content:[{type:'text',text:'Image test'}]},{type:'paragraph',content:[{type:'text',text:'Literal <b>preview</b>'}]}]}
 const {data:doc,error:de}=await alice.from('documents').insert({title:'File check '+new Date().toISOString(),content}).select('id,preview').single();assert.ifError(de);assert.equal(doc.preview,'Image test Literal <b>preview</b>');pass('Preview generated without HTML interpretation')
 const fixture=readFileSync('samples/idea-board.png'),path=doc.id+'/'+crypto.randomUUID()+'--idea-board.png';paths.push(path)
 let result=await alice.storage.from(bucket).upload(path,fixture,{contentType:'image/png',upsert:false});assert.ifError(result.error);pass('Owner attaches real PNG to document')
 let image=await bob.storage.from(bucket).download(path);assert.ok(image.error);pass('Bob cannot read private attachment before share')
 image=await anon.storage.from(bucket).download(path);assert.ok(image.error);pass('Anonymous cannot read private attachment')
 let grant=await alice.from('document_shares').insert({document_id:doc.id,owner_id:a.user.id,recipient_id:b.user.id});assert.ifError(grant.error)
 image=await bob.storage.from(bucket).download(path);assert.ifError(image.error);assert.equal(sha(Buffer.from(await image.data.arrayBuffer())),sha(fixture));pass('Reader downloads exact original image after grant')
 const readerPath=doc.id+'/'+crypto.randomUUID()+'--reader.png';paths.push(readerPath)
 result=await bob.storage.from(bucket).upload(readerPath,fixture,{contentType:'image/png'});assert.ok(result.error);pass('Reader upload denied')
 await bob.storage.from(bucket).remove([path]);image=await alice.storage.from(bucket).download(path);assert.ifError(image.error);pass('Reader remove attempt leaves original image intact')
 grant=await alice.from('document_shares').update({role:'writer'}).eq('document_id',doc.id).eq('recipient_id',b.user.id).select('role').single();assert.ifError(grant.error)
 const writerPath=doc.id+'/'+crypto.randomUUID()+'--writer.png';paths.push(writerPath)
 result=await bob.storage.from(bucket).upload(writerPath,fixture,{contentType:'image/png'});assert.ifError(result.error);pass('Writer upload allowed')
 result=await bob.storage.from(bucket).update(path,fixture,{contentType:'image/png'});assert.ok(result.error);pass('Overwrite denied even for Writer')
 result=await bob.storage.from(bucket).remove([writerPath]);assert.ifError(result.error);image=await alice.storage.from(bucket).download(writerPath);assert.ok(image.error);pass('Writer removes attachment')
 grant=await alice.from('document_shares').update({role:'reader'}).eq('document_id',doc.id).eq('recipient_id',b.user.id).select('role').single();assert.ifError(grant.error)
 const stale=doc.id+'/'+crypto.randomUUID()+'--stale.png';paths.push(stale);result=await bob.storage.from(bucket).upload(stale,fixture,{contentType:'image/png'});assert.ok(result.error);await bob.storage.from(bucket).remove([path]);image=await alice.storage.from(bucket).download(path);assert.ifError(image.error);pass('Downgrade immediately blocks upload/removal')
 const oversized=doc.id+'/'+crypto.randomUUID()+'--oversized.png';paths.push(oversized);result=await alice.storage.from(bucket).upload(oversized,Buffer.alloc(2097153),{contentType:'image/png'});assert.ok(result.error);pass('Storage enforces 2 MiB limit')
 const svg=doc.id+'/'+crypto.randomUUID()+'--drawing.svg';paths.push(svg);result=await alice.storage.from(bucket).upload(svg,Buffer.from('<svg/>'),{contentType:'image/svg+xml'});assert.ok(result.error);pass('Storage rejects disallowed MIME type')
 const changed=await alice.from('documents').update({content:{type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Updated preview'}]}]}}).eq('id',doc.id).select('preview').single();assert.ifError(changed.error);assert.equal(changed.data.preview,'Updated preview');pass('Card preview updates on document save')
 console.log(JSON.stringify({testedAt:new Date().toISOString(),documentId:doc.id,scope:'Real Storage and Postgres through ordinary user sessions'},null,2))
}finally{
 if(paths.length){const cleanup=await alice.storage.from(bucket).remove(paths);if(cleanup.error)console.log('Cleanup incomplete:',cleanup.error.message)}
 await Promise.all([alice.auth.signOut({scope:'local'}),bob.auth.signOut({scope:'local'})])
}
