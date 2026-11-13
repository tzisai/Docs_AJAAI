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
 await a.goto(url+'/docs');await login(a,'ALICE');await expect(a.getByRole('heading',{level:1})).toContainText('Make room')
 await a.getByRole('button',{name:'New document +',exact:true}).click()
 await expect(a.getByLabel('Document title',{exact:true})).toBeVisible()
 const docURL=a.url(),title='Release walkthrough '+new Date().toISOString()
 await a.getByLabel('Document title',{exact:true}).fill(title)
 const body=a.getByRole('textbox',{name:'Document body',exact:true});await body.fill('A focused document for the release check.')
 await body.press('ControlOrMeta+a');await a.getByRole('button',{name:'Bold',exact:true}).click();await expect(a.getByRole('button',{name:'Bold',exact:true})).toHaveAttribute('aria-pressed','true')
 await a.getByRole('button',{name:'Italic',exact:true}).click();await a.getByRole('button',{name:'Underline',exact:true}).click()
 await a.getByLabel('Paragraph style',{exact:true}).selectOption('2')
 await body.press('ControlOrMeta+End');await body.press('Enter');await a.getByRole('button',{name:'• Bullet list',exact:true}).click();await body.pressSequentially('First bullet');await body.press('Enter');await body.press('Enter');await a.getByRole('button',{name:'1. Numbered list',exact:true}).click();await body.pressSequentially('First numbered item')
 await a.keyboard.press('ControlOrMeta+s');await expect(a.locator('.save-state')).toHaveText('Saved')
 await a.reload();await expect(a.getByLabel('Document title',{exact:true})).toHaveValue(title);await expect(a.locator('.tiptap h2 strong em u, .tiptap h2 u em strong, .tiptap h2 strong u em, .tiptap h2 em strong u')).toBeVisible()
 await expect(a.locator('.tiptap ul li')).toContainText('First bullet');await expect(a.locator('.tiptap ol li')).toContainText('First numbered item');console.log('PASS Alice create, rename, heading/marks/both lists, keyboard save, direct URL refresh')
 await a.getByLabel('Insert image file',{exact:true}).setInputFiles('samples/idea-board.png');await expect(a.locator('.image-insert .success')).toContainText('Image inserted');await expect(a.getByAltText('idea-board.png',{exact:true})).toBeVisible();await expect(a.locator('.save-state')).toHaveText('Unsaved changes');await a.keyboard.press('ControlOrMeta+s');await expect(a.locator('.save-state')).toHaveText('Saved');await a.reload();await expect(a.locator('.tiptap img[alt="idea-board.png"]')).toBeVisible();console.log('PASS image inside document JSON, explicit Save and refresh')
 await a.getByRole('button',{name:'← Library',exact:true}).click();const savedCard=a.locator(`article[aria-labelledby="card-${new URL(docURL).pathname.split('/').at(-1)}"]`);await expect(savedCard.getByRole('heading',{name:title,exact:true})).toBeVisible();await savedCard.getByRole('button',{name:'Edit',exact:true}).click();await expect(a.locator('.tiptap img[alt="idea-board.png"]')).toBeVisible();console.log('PASS saved document appears in owner library and reopens with its image')
 await b.goto(docURL);await expect(b).toHaveURL(/login\?next=/);await login(b,'BOB');await expect(b.getByRole('alert')).toContainText('unavailable')
 console.log('PASS Bob direct URL before share denied; destination restored across sign-in')
 await a.getByRole('button',{name:'Share',exact:true}).click();await expect(a.getByRole('dialog')).toBeVisible()
 await a.getByLabel('Give access',{exact:true}).selectOption({label:'Bob'});await a.getByRole('button',{name:'Share document',exact:true}).click();await expect(a.getByRole('status').filter({hasText:'Read access granted'})).toBeVisible()
 await a.keyboard.press('Escape');await expect(a.getByRole('dialog')).not.toBeVisible();await expect(a.getByRole('button',{name:'Share',exact:true})).toBeFocused()
 await b.reload();await expect(b.getByRole('heading',{name:title,exact:true})).toBeVisible();await expect(b.locator('.save-state')).toContainText('Read-only');await expect(b.getByRole('button',{name:'Save',exact:true})).toHaveCount(0);await expect(b.getByRole('button',{name:'Share',exact:true})).toHaveCount(0);await expect(b.locator('.tiptap')).toHaveAttribute('contenteditable','false');await expect(b.getByAltText('idea-board.png',{exact:true})).toBeVisible();await expect(b.getByRole('button',{name:'Insert image into document +',exact:true})).toHaveCount(0)
 await b.getByRole('button',{name:'← Library',exact:true}).click();await expect(b.getByRole('article',{name:title,exact:true})).toContainText('Shared · Alice')
 console.log('PASS Alice share; dialog Escape and focus return; Bob refresh/read-only/shared library')
 await a.getByRole('button',{name:'Share',exact:true}).click();await a.getByRole('combobox',{name:'Role for Bob',exact:true}).selectOption('writer');await expect(a.getByRole('status').filter({hasText:'Access changed to Writer'})).toBeVisible();await a.keyboard.press('Escape')
 await b.goto(docURL);await expect(b.getByLabel('Document title',{exact:true})).toBeVisible();await expect(b.getByRole('button',{name:'Save',exact:true})).toBeVisible();await expect(b.getByRole('button',{name:'Share',exact:true})).toHaveCount(0);await expect(b.locator('.tiptap')).toHaveAttribute('contenteditable','true')
 await b.getByRole('textbox',{name:'Document body',exact:true}).fill('Bob can now edit as a writer.');await b.keyboard.press('ControlOrMeta+s');await expect(b.locator('.save-state')).toHaveText('Saved');await b.reload();await expect(b.getByRole('textbox',{name:'Document body',exact:true})).toContainText('Bob can now edit as a writer.')
 await a.reload();await expect(body).toContainText('Bob can now edit as a writer.');await a.getByRole('button',{name:'Share',exact:true}).click();await a.getByRole('combobox',{name:'Role for Bob',exact:true}).selectOption('reader');await expect(a.getByRole('status').filter({hasText:'Access changed to Reader'})).toBeVisible();await a.keyboard.press('Escape');await b.reload();await expect(b.locator('.save-state')).toContainText('Read-only');await expect(b.getByRole('button',{name:'Save',exact:true})).toHaveCount(0)
 console.log('PASS Reader → Writer → Reader; writer saves survive refresh and owner sees changes; sharing remains owner-only')

 await body.fill('A newer draft that must survive a failed save.')
 await alice.setOffline(true);await a.getByRole('button',{name:'Save',exact:true}).click();await expect(a.getByRole('alert')).toContainText('Your draft is still here',{timeout:22000});await expect(body).toContainText('A newer draft')
 await alice.setOffline(false);await a.getByRole('button',{name:'Save',exact:true}).click();await expect(a.locator('.save-state')).toHaveText('Saved');await a.reload();await expect(body).toContainText('A newer draft')
 console.log('PASS offline save failure retains draft; retry saves after reconnect')
 await a.setViewportSize({width:390,height:844});await expect(a.getByRole('group',{name:'Text formatting'})).toBeVisible();expect(await a.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 for(const name of ['Bold','Italic','Underline','• Bullet list','1. Numbered list']){const box=await a.getByRole('button',{name,exact:true}).boundingBox();expect(box.x>=0&&box.x+box.width<=390).toBe(true)}
 mkdirSync('artifacts',{recursive:true});await a.screenshot({path:'artifacts/editor-mobile.png',fullPage:true,animations:'disabled'})
 console.log('PASS 390px toolbar controls remain visible without horizontal overflow')
 await a.getByRole('button',{name:'← Library',exact:true}).click();await a.getByLabel('Import UTF-8 text file',{exact:true}).setInputFiles('samples/team-notes.txt');await expect(a.getByLabel('Document title',{exact:true})).toHaveValue('team-notes');await expect(body).toContainText('<strong>literal markup</strong>');await a.reload();await expect(body).toContainText('Alice writes. Bob reads.')
 console.log('PASS fixture import remains literal editable text after refresh')
 const importedId=new URL(a.url()).pathname.split('/').at(-1);await body.fill('Keep this unsaved draft.');await a.getByLabel('Import text into current draft',{exact:true}).setInputFiles({name:'append.txt',mimeType:'text/plain',buffer:Buffer.from('Appended <b>literal text</b>\n\nDone')});await expect(body).toContainText('Keep this unsaved draft.');await expect(body).toContainText('Appended <b>literal text</b>');await expect(a.getByLabel('Document title',{exact:true})).toHaveValue('team-notes');await expect(a.locator('.save-state')).toHaveText('Unsaved changes');await a.keyboard.press('ControlOrMeta+s');await expect(a.locator('.save-state')).toHaveText('Saved');await a.reload();await expect(body).toContainText('Keep this unsaved draft.');await expect(body).toContainText('Appended <b>literal text</b>');console.log('PASS import into current draft preserves existing work/title and persists after explicit Save')
 const before=await body.innerText();await a.getByLabel('Import text into current draft',{exact:true}).setInputFiles({name:'invalid.md',mimeType:'text/plain',buffer:Buffer.from('Invalid import')});await expect(a.locator('.draft-import .error')).toContainText('.txt');expect(await body.innerText()).toBe(before)
 await a.getByLabel('Insert image file',{exact:true}).setInputFiles({name:'huge.png',mimeType:'image/png',buffer:Buffer.alloc(2097153)});await expect(a.locator('.image-insert .error')).toContainText('2 MiB');console.log('PASS invalid draft import and oversized image leave existing content intact')
 await a.getByRole('button',{name:'← Library',exact:true}).click();const importedCard=a.locator(`article[aria-labelledby="card-${importedId}"]`);await expect(importedCard.locator('.mini-page-text')).toContainText('Keep this unsaved draft.');const [download]=await Promise.all([a.waitForEvent('download'),importedCard.getByRole('button',{name:'Download',exact:true}).click()]);expect(download.suggestedFilename()).toBe('team-notes.txt');await download.saveAs('artifacts/downloaded-team-notes.txt');expect(readFileSync('artifacts/downloaded-team-notes.txt','utf8')).toContain('Appended <b>literal text</b>');console.log('PASS projected card preview and actual text download')
 await a.route('**/rest/v1/demo_users?*',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Test directory outage'})}));await a.reload();await expect(importedCard).toBeVisible();await expect(a.getByRole('alert')).toContainText('Your documents are still available',{timeout:20000});await a.unroute('**/rest/v1/demo_users?*');await a.reload();await expect(importedCard).toBeVisible();console.log('PASS optional directory failure cannot hide saved documents')
 await a.setViewportSize({width:390,height:844});expect(await a.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await a.screenshot({path:'artifacts/library-mobile.png',fullPage:true,animations:'disabled'});await a.setViewportSize({width:1440,height:1000});await a.screenshot({path:'artifacts/library-desktop.png',fullPage:true,animations:'disabled'})

 await a.getByLabel('Import UTF-8 text file',{exact:true}).setInputFiles({name:'bad.md',mimeType:'text/plain',buffer:Buffer.from('bad')});await expect(a.getByRole('alert')).toContainText('Choose a .txt');await expect(a.getByRole('heading',{name:'My documents',exact:true})).toBeVisible()
 await a.getByLabel('Import UTF-8 text file',{exact:true}).setInputFiles({name:'huge.txt',mimeType:'text/plain',buffer:Buffer.alloc(102401,65)});await expect(a.getByRole('alert')).toContainText('100 KiB')
 console.log('PASS invalid extension and oversized file show errors; library retained')
 expect(errors).toEqual([]);console.log(JSON.stringify({testedAt:new Date().toISOString(),productURL:url,documentURL:docURL,pageErrors:errors},null,2))
} finally {await browser.close()}
