// Isolated browser flow with mocked Auth/data APIs. No real accounts or email are created.
import {chromium,expect} from '@playwright/test'
import {mkdirSync} from 'node:fs'
const url=process.env.PRODUCT_URL||'http://localhost:5173'
const uid='cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const user={id:uid,email:'new@example.test',aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{},created_at:new Date().toISOString(),identities:[{id:'identity',provider:'email',user_id:uid}]}
let mode='disabled',signupRequests=0,lastRedirect='',docs=[]
const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1440,height:1000}})
await context.route('**/auth/v1/signup*',async route=>{
 signupRequests++;lastRedirect=new URL(route.request().url()).searchParams.get('redirect_to')||''
 const body=route.request().postDataJSON();expect(body.email).toBe('new@example.test');expect(body.password).toBe('unique-pass-123')
 if(mode==='disabled'){await route.fulfill({status:403,contentType:'application/json',body:JSON.stringify({code:'signup_disabled',msg:'Signups not allowed for this instance'})});return}
 if(mode==='confirmation'){await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(user)});return}
 const token='eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({sub:uid,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})).toString('base64url')+'.signature'
 await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({access_token:token,refresh_token:'test-refresh',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user})})
})
await context.route('**/rest/v1/**',async route=>{
 const request=route.request(),parsed=new URL(request.url()),table=parsed.pathname.split('/').at(-1),method=request.method();let result=[]
 if(table==='documents'){
  const id=parsed.searchParams.get('id')?.slice(3)
  if(method==='POST'){expect(Object.keys(request.postDataJSON()).sort()).toEqual(['content','title']);const doc={id:'11111111-1111-4111-8111-111111111111',owner_id:uid,updated_at:new Date().toISOString(),...request.postDataJSON()};docs.push(doc);result=[doc]}
  else if(method==='PATCH'){const doc=docs.find(d=>d.id===id);Object.assign(doc,request.postDataJSON());doc.first=doc.content.content[0]?.content?.[0]?.text;result=[{id:doc.id}]}
  else result=docs.filter(d=>!id||d.id===id)
 }
 if(table==='demo_users')result=[{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',alias:'Alice'},{id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',alias:'Bob'}]
 if(request.headers()['accept']?.includes('application/vnd.pgrst.object+json'))result=result[0]??null
 await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(result)})
})
const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message))
try{
 await page.goto(url+'/login?next=%2Fdocs');await expect(page.getByRole('button',{name:'Create an account',exact:true})).toBeVisible();await page.getByRole('button',{name:'Create an account',exact:true}).click();await expect(page.getByRole('heading',{name:'Create your account.',exact:true})).toBeVisible()
 mkdirSync('artifacts',{recursive:true});await page.screenshot({path:'artifacts/signup-desktop.png',fullPage:true,animations:'disabled'});await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'artifacts/signup-mobile.png',fullPage:true,animations:'disabled'});await page.setViewportSize({width:1440,height:1000})
 await page.getByLabel('Email',{exact:true}).fill('new@example.test');await page.getByLabel('Password',{exact:true}).fill('unique-pass-123');await page.getByLabel('Confirm password',{exact:true}).fill('mismatch-pass');await page.getByRole('button',{name:'Create account →',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Passwords do not match');expect(signupRequests).toBe(0)
 await page.getByLabel('Confirm password',{exact:true}).fill('unique-pass-123');await page.getByRole('button',{name:'Create account →',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Account creation is currently disabled');expect(signupRequests).toBe(1);console.log('PASS UI-only signup: visible button, confirmation field, mismatch blocks request, provider-disabled error, mobile layout')
 mode='confirmation';await page.getByRole('button',{name:'Create account →',exact:true}).click();await expect(page.getByRole('heading',{name:'Check your inbox.',exact:true})).toBeVisible();await expect(page.getByRole('status')).toContainText('confirmation link');expect(new URL(lastRedirect).pathname).toBe('/login');expect(new URL(lastRedirect).searchParams.get('next')).toBe('/docs');await page.getByRole('button',{name:'Back to sign in',exact:true}).click();await expect(page.getByLabel('Email',{exact:true})).toHaveValue('new@example.test');await expect(page.getByLabel('Password',{exact:true})).toHaveValue('');console.log('PASS UI-only signup: confirmation-required state, safe return URL, clear back-to-sign-in flow')
 mode='session';await page.getByRole('button',{name:'Create an account',exact:true}).click();await page.getByLabel('Password',{exact:true}).fill('unique-pass-123');await page.getByLabel('Confirm password',{exact:true}).fill('unique-pass-123');await page.getByRole('button',{name:'Create account →',exact:true}).click();await expect(page).toHaveURL(url+'/docs');await expect(page.getByRole('heading',{name:'Your next idea starts here.',exact:true})).toBeVisible();await page.getByRole('button',{name:'New document +',exact:true}).click();await page.getByLabel('Document title',{exact:true}).fill('My first document');await page.getByRole('textbox',{name:'Document body',exact:true}).fill('New account owns this draft.');await page.keyboard.press('ControlOrMeta+s');await expect(page.locator('.save-state')).toHaveText('Saved');await page.getByRole('button',{name:'← Library',exact:true}).click();await expect(page.getByRole('article',{name:'My first document',exact:true})).toBeVisible();expect(docs[0].owner_id).toBe(uid);expect(errors).toEqual([]);console.log('PASS UI-only signup: immediate session, unseeded new account workspace, create/save and owner card visibility')
}finally{await browser.close()}
