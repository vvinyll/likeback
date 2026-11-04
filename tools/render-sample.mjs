import {readFile, writeFile, mkdtemp, rm} from 'node:fs/promises';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {tmpdir} from 'node:os';
import {resolve, join} from 'node:path';
import {execFileSync} from 'node:child_process';
import worker, {normalize, ruleCategory, buildSummary} from '../src/worker.js';

const input=process.env.LIKES_INPUT || fileURLToPath(new URL('../data/likes.json',import.meta.url));
const output=resolve(process.env.SAMPLE_HTML || join(tmpdir(),'card-sample.html'));
const screenshot=resolve(process.env.SAMPLE_PNG || fileURLToPath(new URL('../personal-card-sample-radar.png',import.meta.url)));
const raw = JSON.parse(await readFile(input, 'utf8'));
const normalized = normalize({...raw, data:raw.data.slice(0,500)}, raw.user?.data || raw.user);
for (const post of normalized.posts) post.category = ruleCategory(post.text);
normalized.user = {...normalized.user, avatar:normalized.user?.profile_image_url || ''};
const summary = {...buildSummary(normalized.posts, normalized.user), summary_source:'rules'};
const response = await worker.fetch(new Request('https://sample.invalid/'), {});
const html = await response.text();
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const start = script.indexOf('async function drawCard(');
const end = script.indexOf('window.drawCard=drawCard;', start) + 'window.drawCard=drawCard;'.length;
if(start < 0 || end < start) throw new Error('drawCard was not found');
const sample = '<!doctype html><meta charset="utf-8"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@400;700;800&display=swap" rel="stylesheet"><style>*{margin:0;padding:0}html,body{width:1200px;height:630px;overflow:hidden;background:#070e28}canvas{display:block;width:1200px;height:630px}</style><canvas id="sample" width="1200" height="630"></canvas><script>window.__SAMPLE__='+JSON.stringify(summary).replace(/</g,'\\u003c')+';'+script.slice(start,end)+'\ndrawCard(document.getElementById("sample"),window.__SAMPLE__,{imgSrc:url=>url}).then(()=>{document.documentElement.dataset.ready="true";});</script>';
await writeFile(output, sample);
if (!process.argv.includes('--screenshot')) {
  console.log('Wrote '+output);
} else {
const profile = await mkdtemp(join(tmpdir(),'card-chrome-'));
try {
execFileSync(process.env.CHROME_BIN || 'google-chrome', ['--headless=new','--disable-gpu','--user-data-dir='+profile,'--window-size=1200,630','--virtual-time-budget=8000','--screenshot='+screenshot,pathToFileURL(output).href], {stdio:'pipe'});
} catch (error) {
  console.error('Chrome could not render the sample:', error.stderr?.toString().trim() || error.message);
  process.exitCode = 1;
} finally {
  await rm(profile, {recursive:true, force:true});
}
if (!process.exitCode) console.log('Wrote '+output+' and '+screenshot);

}
