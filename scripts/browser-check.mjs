// Real backend browser acceptance flow. No mocked API and no admin credentials.
import { chromium, expect } from '@playwright/test'
import { readFileSync, mkdirSync } from 'node:fs'
for(const path of ['.env.local','.env.review.local','users.env.review.local']) {
  try {for(const line of readFileSync(path,'utf8').split('\n')){const m=line.match(/^([A-Z_]+)=(.*)$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2].trim().replace(/^['"]|['"]$/g,'')}}catch{}
}
for(const key of ['ALICE_EMAIL','ALICE_PASSWORD','BOB_EMAIL','BOB_PASSWORD'])if(!process.env[key])throw new Error('Missing '+key+'; see DASHBOARD_SETUP.md')
const url=process.env.PRODUCT_URL || 'http://localhost:5173'
const browser=await chromium.launch({headless:process.env.HEADED!=='1'})
const alice=await browser.newContext(),bob=await browser.newContext()
const a=await alice.newPage(),b=await bob.newPage()
const errors=[];for(const page of [a,b])page.on('pageerror',e=>errors.push(e.message))
async function login(page,who){await page.getByLabel('Email',{exact:true}).fill(process.env[who+'_EMAIL']);await page.getByLabel('Password',{exact:true}).fill(process.env[who+'_PASSWORD']);await page.getByRole('button',{name:'Sign in →',exact:true}).click()}
try {
 await a.goto(url+'/docs');await login(a,'ALICE');await expect(a.getByRole('heading',{name:'Room for your ideas.'})).toBeVisible()
 await a.getByRole('button',{name:'New document +',exact:true}).click()
 await expect(a.getByLabel('Document title',{exact:true})).toBeVisible()
 const docURL=a.url(),title='Release walkthrough '+new Date().toISOString()
 await a.getByLabel('Document title',{exact:true}).fill(title)
 const body=a.getByRole('textbox',{name:'Document body',exact:true});await body.fill('A focused document for the release check.')
 await body.press('ControlOrMeta+a');await a.getByRole('button',{name:'Bold',exact:true}).click();await expect(a.getByRole('button',{name:'Bold',exact:true})).toHaveAttribute('aria-pressed','true')
 await a.getByRole('button',{name:'Italic',exact:true}).click();await a.getByRole('button',{name:'Underline',exact:true}).click()
 await a.getByLabel('Paragraph style',{exact:true}).selectOption('2')
 await body.press('ControlOrMeta+End');await body.press('Enter');await a.getByRole('button',{name:'• Bullet list',exact:true}).click();await body.pressSequentially('First bullet');await body.press('Enter');await body.press('Enter');await a.getByRole('button',{name:'1. Numbered list',exact:true}).click();await body.pressSequentially('First numbered item')
 await a.keyboard.press('ControlOrMeta+s');await expect(a.getByRole('status')).toHaveText('Saved')
 await a.reload();await expect(a.getByLabel('Document title',{exact:true})).toHaveValue(title);await expect(a.locator('.tiptap h2 strong em u, .tiptap h2 u em strong, .tiptap h2 strong u em, .tiptap h2 em strong u')).toBeVisible()
 await expect(a.locator('.tiptap ul li')).toContainText('First bullet');await expect(a.locator('.tiptap ol li')).toContainText('First numbered item');console.log('PASS Alice create, rename, heading/marks/both lists, keyboard save, direct URL refresh')
 await b.goto(docURL);await expect(b).toHaveURL(/login\?next=/);await login(b,'BOB');await expect(b.getByRole('alert')).toContainText('unavailable')
 console.log('PASS Bob direct URL before share denied; destination restored across sign-in')
 await a.getByRole('button',{name:'Share',exact:true}).click();await expect(a.getByRole('dialog')).toBeVisible()
 await a.getByLabel('Give access',{exact:true}).selectOption({label:'Bob'});await a.getByRole('button',{name:'Share document',exact:true}).click();await expect(a.getByRole('status').filter({hasText:'Read access granted'})).toBeVisible()
 await a.keyboard.press('Escape');await expect(a.getByRole('dialog')).not.toBeVisible();await expect(a.getByRole('button',{name:'Share',exact:true})).toBeFocused()
 await b.reload();await expect(b.getByRole('heading',{name:title,exact:true})).toBeVisible();await expect(b.getByRole('status')).toContainText('Read-only');await expect(b.getByRole('button',{name:'Save',exact:true})).toHaveCount(0);await expect(b.getByRole('button',{name:'Share',exact:true})).toHaveCount(0);await expect(b.locator('.tiptap')).toHaveAttribute('contenteditable','false')
 await b.getByRole('button',{name:'← Library',exact:true}).click();await expect(b.getByRole('button',{name:new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))})).toContainText('Shared · Alice')
 console.log('PASS Alice share; dialog Escape and focus return; Bob refresh/read-only/shared library')
 await a.getByRole('button',{name:'Share',exact:true}).click();await a.getByRole('combobox',{name:'Role for Bob',exact:true}).selectOption('writer');await expect(a.getByRole('status').filter({hasText:'Access changed to Writer'})).toBeVisible();await a.keyboard.press('Escape')
 await b.goto(docURL);await expect(b.getByLabel('Document title',{exact:true})).toBeVisible();await expect(b.getByRole('button',{name:'Save',exact:true})).toBeVisible();await expect(b.getByRole('button',{name:'Share',exact:true})).toHaveCount(0);await expect(b.locator('.tiptap')).toHaveAttribute('contenteditable','true')
 await b.getByRole('textbox',{name:'Document body',exact:true}).fill('Bob can now edit as a writer.');await b.keyboard.press('ControlOrMeta+s');await expect(b.getByRole('status')).toHaveText('Saved');await b.reload();await expect(b.getByRole('textbox',{name:'Document body',exact:true})).toContainText('Bob can now edit as a writer.')
 await a.reload();await expect(body).toContainText('Bob can now edit as a writer.');await a.getByRole('button',{name:'Share',exact:true}).click();await a.getByRole('combobox',{name:'Role for Bob',exact:true}).selectOption('reader');await expect(a.getByRole('status').filter({hasText:'Access changed to Reader'})).toBeVisible();await a.keyboard.press('Escape');await b.reload();await expect(b.getByRole('status')).toContainText('Read-only');await expect(b.getByRole('button',{name:'Save',exact:true})).toHaveCount(0)
 console.log('PASS Reader → Writer → Reader; writer saves survive refresh and owner sees changes; sharing remains owner-only')

 await body.fill('A newer draft that must survive a failed save.')
 await alice.setOffline(true);await a.getByRole('button',{name:'Save',exact:true}).click();await expect(a.getByRole('alert')).toContainText('Your draft is still here',{timeout:22000});await expect(body).toContainText('A newer draft')
 await alice.setOffline(false);await a.getByRole('button',{name:'Save',exact:true}).click();await expect(a.getByRole('status')).toHaveText('Saved');await a.reload();await expect(body).toContainText('A newer draft')
 console.log('PASS offline save failure retains draft; retry saves after reconnect')
 await a.setViewportSize({width:390,height:844});await expect(a.getByRole('group',{name:'Text formatting'})).toBeVisible();expect(await a.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 for(const name of ['Bold','Italic','Underline','• Bullet list','1. Numbered list']){const box=await a.getByRole('button',{name,exact:true}).boundingBox();expect(box.x>=0&&box.x+box.width<=390).toBe(true)}
 mkdirSync('artifacts',{recursive:true});await a.screenshot({path:'artifacts/editor-mobile.png',fullPage:true})
 console.log('PASS 390px toolbar controls remain visible without horizontal overflow')
 await a.getByRole('button',{name:'← Library',exact:true}).click();await a.getByLabel('Import UTF-8 text file',{exact:true}).setInputFiles('samples/team-notes.txt');await expect(a.getByLabel('Document title',{exact:true})).toHaveValue('team-notes');await expect(body).toContainText('<strong>literal markup</strong>');await a.reload();await expect(body).toContainText('Alice writes. Bob reads.')
 console.log('PASS fixture import remains literal editable text after refresh')
 await a.getByRole('button',{name:'← Library',exact:true}).click();await a.getByLabel('Import UTF-8 text file',{exact:true}).setInputFiles({name:'bad.md',mimeType:'text/plain',buffer:Buffer.from('bad')});await expect(a.getByRole('alert')).toContainText('Choose a .txt');await expect(a.getByRole('heading',{name:'My documents',exact:true})).toBeVisible()
 await a.getByLabel('Import UTF-8 text file',{exact:true}).setInputFiles({name:'huge.txt',mimeType:'text/plain',buffer:Buffer.alloc(102401,65)});await expect(a.getByRole('alert')).toContainText('100 KiB')
 console.log('PASS invalid extension and oversized file show errors; library retained')
 expect(errors).toEqual([]);console.log(JSON.stringify({testedAt:new Date().toISOString(),productURL:url,documentURL:docURL,pageErrors:errors},null,2))
} finally {await browser.close()}
