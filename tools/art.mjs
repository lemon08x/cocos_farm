import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const sharp=require('sharp');
const root=path.resolve(import.meta.dirname,'..');
const head='<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280" viewBox="0 0 720 1280">';
let seed=319;function random(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
function tree(x,y,s,c='#759876') {return `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cy="9" rx="37" ry="12" fill="#345d50" opacity=".14"/><path d="M-5 4L-3-78H5L6 6Z" fill="#7f7655"/><path d="M1-107C-26-96-33-69-32-56C-57-46-41-16-14-22C-3-4 34-12 34-29C60-40 36-67 28-68C36-91 17-103 1-107" fill="${c}"/><path d="M1-103C-22-82-25-46-12-27C-2-17 12-18 17-21C-2-31-6-62 1-103" fill="#d1d99c" opacity=".28"/></g>`;}
let bg=head+`<defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#b4d9d9"/><stop offset="1" stop-color="#f3eed8"/></linearGradient><linearGradient id="land" x2=".4" y2="1"><stop stop-color="#bccc99"/><stop offset="1" stop-color="#809c70"/></linearGradient><linearGradient id="river" x2="1" y2="1"><stop stop-color="#9ccac1"/><stop offset="1" stop-color="#d1e0c5"/></linearGradient></defs>
<path fill="url(#sky)" d="M0 0H720V1280H0Z"/><circle cx="559" cy="228" r="53" fill="#fff5d1" opacity=".85"/>
<path d="M-40 449L104 257L209 365L325 260L476 397L612 303L770 443V700H-40Z" fill="#a3bfba"/>
<path d="M-30 469L163 336L280 449L435 333L614 471L749 398V721H-30Z" fill="#87aaa0"/>
<path d="M0 483Q121 434 234 483T460 460T720 480V1280H0Z" fill="url(#land)"/>
<path d="M-10 534Q118 485 201 514T390 497T720 530" fill="none" stroke="#d6deb0" stroke-width="22"/>
<path d="M-32 601Q117 565 164 609T79 689T-10 787" fill="none" stroke="#749d8c" stroke-width="76"/>
<path d="M-32 601Q117 565 164 609T79 689T-10 787" fill="none" stroke="url(#river)" stroke-width="62"/>
<path d="M470 630Q564 690 622 779T617 999T388 1300" fill="none" stroke="#c6c49a" stroke-width="53"/>
<path d="M470 630Q564 690 622 779T617 999T388 1300" fill="none" stroke="#ddd5b0" stroke-width="39"/>`;
for(let i=0;i<22;i++){const x=i*38-22,y=485+random()*52;bg+=tree(x,y,.43+random()*.3,i%2?'#6f9581':'#84a087');}
for(const [x,y,s] of [[36,612,1],[697,652,1.2],[69,545,.75],[640,526,.8],[20,977,1.2],[715,1033,1.25],[58,1209,1.45],[659,1259,1.45]])bg+=tree(x,y,s);
for(let i=0;i<160;i++){const x=random()*720,y=560+random()*720;if(x>130&&x<570&&y>710&&y<1040)continue;bg+=`<path d="M${x} ${y}l-3-7m3 7l5-5" stroke="#637f5a" stroke-opacity=".28" fill="none" stroke-width="2"/>`;if(i%5===0)bg+=`<circle cx="${x+5}" cy="${y-6}" r="2.5" fill="#efe7ba"/>`;}
bg+=`<g fill="#d9d9b2" opacity=".7"><ellipse cx="648" cy="1036" rx="21" ry="7" transform="rotate(-22 648 1036)"/><ellipse cx="621" cy="1083" rx="20" ry="8" transform="rotate(-27 621 1083)"/><ellipse cx="593" cy="1124" rx="19" ry="7"/></g></svg>`;
let house=`<svg xmlns="http://www.w3.org/2000/svg" width="330" height="290" viewBox="0 0 330 290"><ellipse cx="168" cy="252" rx="153" ry="26" fill="#3c594b" opacity=".18"/>
<path d="M64 131L213 161V250L64 217Z" fill="#efe2ba"/><path d="M213 161L291 110V209L213 250Z" fill="#d3c8a3"/>
<path d="M206 78L299 127L213 181L33 138L89 68Z" fill="#495f5a"/><path d="M89 68L206 78L213 166L33 131Z" fill="#60736a"/><path d="M206 78L213 166L299 120Z" fill="#394f4b"/>
<path d="M28 133L214 172L307 121" fill="none" stroke="#344c48" stroke-width="11" stroke-linejoin="round"/>
<path d="M44 127L210 162M58 111L208 144M69 96L207 124M80 81L205 104" stroke="#8e9c84" stroke-width="3" opacity=".6"/>
<path d="M77 145V218M201 174V246M273 143V218M78 198L202 225" stroke="#8b7860" stroke-width="8"/>
<path d="M142 179L176 187V235L142 227Z" fill="#77634e"/><path d="M94 166L120 173V196L94 190Z" fill="#718479"/><path d="M98 178L117 183M107 172V191" stroke="#e6d9b6" stroke-width="3"/>
<path d="M237 166L259 153V180L237 193Z" fill="#6c8075"/><path d="M248 160V185M239 179L256 168" stroke="#e6d9b6" stroke-width="3"/>
<path d="M132 227L181 238L181 245L132 234Z" fill="#ae9b77"/><path d="M126 235L182 248L182 254L126 241Z" fill="#c4b38b"/>
<path d="M140 158L185 168V185L140 175Z" fill="#5e6750"/>
<g fill="#789157"><ellipse cx="43" cy="214" rx="24" ry="17"/><ellipse cx="293" cy="213" rx="21" ry="20"/></g><g fill="#f0dca5"><circle cx="38" cy="207" r="4"/><circle cx="50" cy="214" r="3"/><circle cx="295" cy="205" r="4"/></g></svg>`;
fs.mkdirSync(path.join(root,'art'),{recursive:true});fs.mkdirSync(path.join(root,'assets/resources/art'),{recursive:true});
for(const [name,svg] of [['landscape',bg],['cottage',house]]) {fs.writeFileSync(path.join(root,'art',name+'.svg'),svg);await sharp(Buffer.from(svg)).png().toFile(path.join(root,'assets/resources/art',name+'.png'));}
console.log('Layered landscape and transparent cottage created.');
