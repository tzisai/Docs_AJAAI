import { readFileSync, mkdirSync, copyFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
const docs=['README.md','ARCHITECTURE.md','AI_WORKFLOW.md','SUBMISSION.md','CHECKS.md','DASHBOARD_SETUP.md','WALKTHROUGH_SCRIPT.md','WALKTHROUGH_URL.txt']
const files=['src','supabase','scripts','tests','samples','package.json','package-lock.json','tsconfig.json','vite.config.ts','index.html','.env.example','.gitignore','.node-version','render.yaml','LICENSE',...docs]
mkdirSync('artifacts/submission',{recursive:true})
const target='artifacts/submission/ajaia-source.zip'
try {execFileSync('rm',['-f',target])}catch{}
execFileSync('zip',['-q','-r',target,...files])
const list=execFileSync('unzip',['-Z1',target],{encoding:'utf8'}).trim().split('\n')
const forbidden=list.filter(p=>/(^|\/)(node_modules|dist|\.git|artifacts)(\/|$)/.test(p)||/(^|\/)(API\.env|\.env(?!\.example$))/.test(p)||p.endsWith('.tsbuildinfo'))
if(forbidden.length)throw new Error('Forbidden package entries: '+forbidden.join(', '))
for(const file of docs)copyFileSync(file,'artifacts/submission/'+file)
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()
writeFileSync('artifacts/submission/PACKAGE_MANIFEST.txt',`Packaged at: ${new Date().toISOString()}\nSource checkout HEAD: ${sha}\nWorking-tree docs may include later verification updates.\n\nZIP entries (${list.length}):\n${list.join('\n')}\n`)
console.log(`Created ${target}; ${list.length} entries; no env files, credentials, dependencies, or build output. HEAD ${sha}`)
const pending=docs.filter(p=>/MISSING|verification pending|verification incomplete|not yet verified/i.test(readFileSync(p,'utf8')))
if(pending.length)console.log('REVIEW REQUIRED: explicit pending items remain in '+pending.join(', '))

const reviewEnv = {}
for (const path of ['.env.review.local','users.env.review.local']) { try { for (const line of readFileSync(path,'utf8').split('\n')) { const m=line.match(/^([A-Z_]+)=(.*)$/); if(m && m[2].trim()) reviewEnv[m[1]]=m[2].trim().replace(/^['"]|['"]$/g,'') } } catch {} }
const accountKeys=['ALICE_EMAIL','ALICE_PASSWORD','BOB_EMAIL','BOB_PASSWORD']
const accountText=accountKeys.every(key=>reviewEnv[key])
  ? `# Disposable reviewer accounts\n\nUse sample content only. These accounts are for this demo; do not reuse these passwords.\n\nAlice (owner): ${reviewEnv.ALICE_EMAIL}\nPassword: ${reviewEnv.ALICE_PASSWORD}\n\nBob (reader): ${reviewEnv.BOB_EMAIL}\nPassword: ${reviewEnv.BOB_PASSWORD}\n\nOpen Alice and Bob in separate browser profiles/private windows. Start at ${reviewEnv.PRODUCT_URL || 'https://docs-ajaai.onrender.com'}. Follow README.md. The source ZIP excludes this credentials file. Rotate or delete demo accounts after review.\n`
  : '# Disposable reviewer accounts\n\nMISSING — provision and confirm Alice and Bob, fill ignored .env.review.local, and rerun node scripts/package.mjs. Do not include admin credentials.\n'
writeFileSync('artifacts/submission/REVIEWER_ACCOUNTS.md',accountText)
