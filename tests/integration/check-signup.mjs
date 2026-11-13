// Creates one disposable Auth user with confirmation OFF; never uses an admin key or sends email.
import {createClient} from '@supabase/supabase-js'
import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
for(const path of ['.env.local'])for(const line of readFileSync(path,'utf8').split('\n')){const m=line.match(/^([A-Z_]+)=(.*)$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2].trim().replace(/^['"]|['"]$/g,'')}
const url=process.env.VITE_SUPABASE_URL,key=process.env.VITE_SUPABASE_PUBLISHABLE_KEY
if(!url||!key)throw new Error('Set the two public VITE values in .env.local')
const settings=await fetch(url+'/auth/v1/settings',{headers:{apikey:key}}).then(r=>r.json())
if(settings.disable_signup)throw new Error('Enable Supabase Authentication → Sign In / Providers → Allow new users to sign up, then Save changes.')
if(!settings.mailer_autoconfirm)throw new Error('This automated check requires Confirm email OFF to avoid sending test email. Test confirmation with your own inbox through the browser instead.')
const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
const email='signup-check-'+crypto.randomUUID()+'@example.com',password='Ajaia!7-'+crypto.randomUUID()
try{
 const {data,error}=await client.auth.signUp({email,password});assert.ifError(error);assert.ok(data.user&&data.session);console.log('PASS Real account creation returns a session without admin credentials')
 const empty=await client.from('documents').select('id');assert.ifError(empty.error);assert.equal(empty.data.length,0);console.log('PASS New account cannot see existing users’ private documents')
 const directory=await client.from('demo_users').select('id');assert.ifError(directory.error);assert.ok(!directory.data.some(user=>user.id===data.user.id));console.log('PASS New account is not dependent on a seeded directory entry')
 const content={type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'My new account owns this document.'}]}]}
 const created=await client.from('documents').insert({title:'New account acceptance',content}).select('id,owner_id').single();assert.ifError(created.error);assert.equal(created.data.owner_id,data.user.id)
 const saved=await client.from('documents').update({title:'New account saved document',content}).eq('id',created.data.id).select('id').single();assert.ifError(saved.error)
 const reopened=await client.from('documents').select('title,content').eq('id',created.data.id).single();assert.ifError(reopened.error);assert.equal(reopened.data.title,'New account saved document');assert.deepEqual(reopened.data.content,content);console.log('PASS Unseeded new account creates, saves, and reopens its own document')
 console.log(JSON.stringify({testedAt:new Date().toISOString(),accountId:data.user.id,documentId:created.data.id,scope:'Real disposable account with ordinary publishable-key Auth; password is not logged or stored'},null,2))
}finally{await client.auth.signOut({scope:'local'})}
