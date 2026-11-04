import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const fonts = [400, 800].map(weight => fileURLToPath(new URL(`./fonts/NotoSansJP-${weight}.ttf`, import.meta.url)));
await Promise.all(fonts.map(font => readFile(font))); // Fail clearly if the bundled font is missing.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<defs>
  <radialGradient id="glow"><stop stop-color="#6574ab" stop-opacity=".32"/><stop offset="1" stop-color="#10172d" stop-opacity="0"/></radialGradient>
  <linearGradient id="heart" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#a9b9ff"/><stop offset="1" stop-color="#8770cf"/></linearGradient>
</defs>
<rect width="1200" height="630" fill="#10172d"/>
<ellipse cx="1000" cy="200" rx="500" ry="460" fill="url(#glow)"/>
<rect x="28" y="28" width="1144" height="574" rx="28" fill="none" stroke="#6574ab" stroke-opacity=".5"/>
<g transform="translate(940 210) rotate(-12)" fill="none" stroke="#6574ab">
 <rect x="-112" y="-108" width="224" height="235" rx="27" fill="#18223e"/>
 <path d="M-72 79H10M-72 96H60" stroke-width="7" stroke-linecap="round" opacity=".55"/>
 <path d="M0 44L-52 -5C-89 -46 -28 -86 0 -44C28 -86 89 -46 52 -5Z" fill="url(#heart)" stroke="none"/>
</g>
<g font-family="Noto Sans JP" fill="#fff">
 <text x="78" y="235" font-size="108" font-weight="800" letter-spacing="-4">Likeback</text>
 <rect x="80" y="277" width="68" height="5" rx="2.5" fill="#96a7e6"/>
 <text x="78" y="354" font-size="36" font-weight="800">Xのいいねを、日付とカテゴリーでふりかえる</text>
 <text x="80" y="413" font-size="27" fill="#c8d1ed">あなただけのパーソナルカードも</text>
 <text x="80" y="547" font-size="23" fill="#a5b3de" letter-spacing="1">likeback.pages.dev</text>
</g>
<g fill="#96a7e6"><circle cx="1080" cy="491" r="4"/><circle cx="1056" cy="491" r="4" opacity=".6"/><circle cx="1032" cy="491" r="4" opacity=".3"/></g>
</svg>`;
const png = new Resvg(svg, {
  font: { fontFiles: fonts, loadSystemFonts: false, defaultFontFamily: 'Noto Sans JP' },
}).render().asPng();
const output = new URL('../../public/og.png', import.meta.url);
await mkdir(new URL('../../public/', import.meta.url), { recursive: true });
await writeFile(output, png);
console.log(`Generated ${fileURLToPath(output)} (1200×630)`);
