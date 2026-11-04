import {readFile, writeFile, mkdtemp, rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import worker, {normalize, ruleCategory, buildSummary} from '../src/worker.js';

const raw = JSON.parse(await readFile('/workspace/x-likes/data/likes.json', 'utf8'));
const normalized = normalize({...raw, data:raw.data.slice(0,500)}, raw.user?.data || raw.user);
for (const post of normalized.posts) post.category = ruleCategory(post.text);
normalized.user = {...normalized.user, name:'ビニール🦇🔊', avatar:'https://pbs.twimg.com/profile_images/1668937066582011904/J0y6VjeG_normal.png'};
const summary = {...buildSummary(normalized.posts, normalized.user), summary_source:'rules'};
const response = await worker.fetch(new Request('https://sample.invalid/'), {});
const html = await response.text();
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const start = script.indexOf('async function drawCard(');
const end = script.indexOf('window.drawCard=drawCard;', start) + 'window.drawCard=drawCard;'.length;
if(start < 0 || end < start) throw new Error('drawCard was not found');
const sample = '<!doctype html><meta charset="utf-8"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@400;700;800&display=swap" rel="stylesheet"><style>*{margin:0;padding:0}html,body{width:1200px;height:630px;overflow:hidden;background:#070e28}canvas{display:block;width:1200px;height:630px}</style><canvas id="sample" width="1200" height="630"></canvas><script>window.__SAMPLE__='+JSON.stringify(summary).replace(/</g,'\\u003c')+';'+script.slice(start,end)+'\ndrawCard(document.getElementById("sample"),window.__SAMPLE__,{imgSrc:url=>url}).then(()=>{document.documentElement.dataset.ready="true";});</script>';
await writeFile('/tmp/card-sample.html', sample);
if (!process.argv.includes('--screenshot')) {
  console.log('Wrote /tmp/card-sample.html');
} else {
const profile = await mkdtemp('/tmp/card-chrome-');
try {
execFileSync('google-chrome', ['--headless=new','--no-sandbox','--disable-gpu','--user-data-dir='+profile,'--window-size=1200,630','--virtual-time-budget=8000','--screenshot=/workspace/personal-card-sample-radar.png','file:///tmp/card-sample.html'], {stdio:'pipe'});
} catch (error) {
  console.error('Chrome could not render the sample:', error.stderr?.toString().trim() || error.message);
  process.exitCode = 1;
} finally {
  await rm(profile, {recursive:true, force:true});
}
if (!process.exitCode) console.log('Wrote /tmp/card-sample.html and /workspace/personal-card-sample-radar.png');

}
