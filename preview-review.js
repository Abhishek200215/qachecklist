/* Browser preview diagnostics. This is not an Outlook/Gmail rendering service. */
(function(){
'use strict';const $=id=>document.getElementById(id),make=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;};
const panel=make('section',undefined,'qa-settings');panel.id='qaPreview';panel.hidden=true;
panel.className='studio-panel';
panel.innerHTML=`<div class="studio-heading"><div><div class="kicker">VISUAL INSPECTION</div><h2>Preview workspace</h2><p>Select an issue to highlight its element and inspect the code.</p></div><button id="previewRun" class="primary">Run visual checks</button></div>
<div class="studio-controls preview-toolbar"><div class="segmented"><button id="previewDesktop" class="selected">Desktop · 700</button><button id="previewMobile">Mobile · 375</button></div><label>Version <select id="previewVersion"><option value="output">Current output</option><option value="input">Original input</option></select></label><label>Zoom <select id="previewZoom"><option value="fit">Fit canvas</option><option value="1">100%</option><option value="0.75">75%</option><option value="0.5">50%</option></select></label><button id="previewPNG" disabled>Download PNG</button><button id="previewExport" disabled>Export visual report</button><button id="previewCancel" hidden>Cancel</button></div>
<details class="preview-options"><summary>Review settings &amp; rendering notes</summary><div class="studio-controls"><label><input id="previewAuto" type="checkbox" checked> Auto-check after code runs</label><label><input id="previewImages" type="checkbox" checked> Load remote images</label></div><p>Browser preview only. External images may be omitted from PNGs by CORS. Scripts, forms and external stylesheets are disabled. Real email-client testing and design sign-off remain separate.</p></details>
<div id="previewStatus" class="studio-status" role="status">Run code QA or start a visual check.</div><div class="preview-workbench"><div class="preview-canvas"><div class="canvas-label"><span id="previewDeviceLabel">DESKTOP · 700px</span><span id="previewBasis">Current output</span></div><div id="previewLive"><div id="previewPlaceholder" class="studio-empty"><div class="empty-symbol">▣</div><h3>Your email, in context</h3><p>Run visual checks to load the preview.<br>Choose desktop or mobile and inspect issues alongside it.</p></div><div id="previewFrameWrap" hidden><iframe id="previewMain" sandbox="allow-same-origin" title="Email preview"></iframe></div></div></div><aside class="preview-inspector"><div class="inspector-heading"><strong>Issue inspector</strong><span id="previewCount" class="count-badge">0</span></div><input type="search" id="previewSearch" class="studio-search" placeholder="Filter visual issues" aria-label="Filter visual issues"><div id="previewFindings"><p class="empty-note">Findings will appear here.</p></div><div id="previewDetail"></div></aside></div>`;
$('qaReport').after(panel);
const badge=make('p','Preview review: waiting for a code check.','preview-badge');$('qaSettings').append(badge);
const stage=make('div',undefined,'preview-stage');document.body.append(stage);let generation=0,timer=null,currentHTML='',report=[],snapshots=[],complete=false,device='Desktop',safePreview='',selectedIssue=null,sourceBasis='Output';
function sanitize(source,remote){
 const tokens=EmailTool.tokenize(source),tagged=tokens.map(t=>/^(open|self)$/.test(t.type)?t.value.replace(/\s*\/?>$/,m=>' data-qa-preview-line="'+t.srcLine+'"'+m):t.value).join('');
 const doc=new DOMParser().parseFromString(tagged,'text/html');
 doc.querySelectorAll('script,iframe,frame,object,embed,base,link,meta[http-equiv],audio,video,source').forEach(e=>e.remove());
 for(const el of doc.querySelectorAll('*'))for(const a of [...el.attributes]){
  if(/^on/i.test(a.name)||['srcdoc','action','formaction','ping','srcset'].includes(a.name))el.removeAttribute(a.name);
  if(['href','src','xlink:href'].includes(a.name)&&/^\s*(javascript|vbscript):/i.test(a.value))el.removeAttribute(a.name);
 }
 const csp=doc.createElement('meta');csp.httpEquiv='Content-Security-Policy';csp.content="default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src data: blob:"+(remote?' https: http:':'')+"; font-src data:; form-action 'none'; base-uri 'none'";doc.head.prepend(csp);
 doc.querySelectorAll('a').forEach(a=>{a.removeAttribute('target');a.removeAttribute('href');});
 if(!remote)doc.querySelectorAll('img').forEach(img=>{if(!/^data:|^blob:/i.test(img.getAttribute('src')||''))img.removeAttribute('src');});
 return '<!doctype html>'+doc.documentElement.outerHTML;
}
function loadFrame(frame,html){return new Promise(resolve=>{let done=false;const finish=()=>{if(done)return;done=true;resolve();};frame.onload=finish;frame.srcdoc=html;setTimeout(finish,5000);});}
const pause=ms=>new Promise(r=>setTimeout(r,ms));
function lineOf(el){return el.closest('[data-qa-preview-line]')?.getAttribute('data-qa-preview-line')||null;}
function rgb(s){const m=s.match(/^rgba?\(([^)]+)\)/);return m?m[1].split(/[,\s/]+/).filter(Boolean).map(Number):null;}
function luminance(c){return c.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);}
function inspect(doc,width,mode,remote){const findings=[],win=doc.defaultView,seen=new Set();let overflowCount=0;
 const add=(el,type,message)=>{const rect=el.getBoundingClientRect(),line=lineOf(el),key=type+'|'+line;if(seen.has(key))return;seen.add(key);findings.push({mode,width,type,message,line,elementIndex:[...doc.body.querySelectorAll('*')].indexOf(el),rect:{x:rect.x,y:rect.y,width:rect.width,height:rect.height},snippet:el.outerHTML.slice(0,700),screenshot:null});};
 for(const el of doc.body.querySelectorAll('*')){
  if(findings.length>=60)break;const r=el.getBoundingClientRect(),style=win.getComputedStyle(el);
  if(!r.width||!r.height||style.visibility==='hidden'||style.display==='none')continue;
  if((r.right>width+2||r.left< -2)&&overflowCount<8){add(el,'Horizontal overflow',`Element extends beyond the ${width}px viewport (right edge ${Math.round(r.right)}px). Check fixed widths, table sizing and responsive rules.`);overflowCount++;}
  if(el.tagName==='IMG'&&(!el.complete||el.naturalWidth===0))add(el,remote?'Image unavailable':'Image not loaded',remote?'Image failed to load or did not finish before the preview timeout. Verify its URL and hosting.':'Remote images are disabled; enable them to check loading.');
  const direct=[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());
  if(direct&&parseFloat(style.fontSize)<10)add(el,'Small text',`Text is ${style.fontSize}; check readability and whether this is an intentional spacer.`);
  if(direct&&style.opacity==='1'&&!style.backgroundImage.includes('url(')){
   let bg=null,solid=false,ambiguous=false;for(let e=el;e;e=e.parentElement){const st=win.getComputedStyle(e);if(st.backgroundImage!=='none'||st.opacity!=='1'){ambiguous=true;break;}const c=rgb(st.backgroundColor);if(c&&c[3]!==0){if(c.length===3||c[3]===1){bg=c;solid=true;}else ambiguous=true;break;}}
   const fg=rgb(style.color);if(!ambiguous&&solid&&fg&&(fg.length===3||fg[3]===1)){const l1=luminance(fg),l2=luminance(bg),ratio=(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);const large=parseFloat(style.fontSize)>=24||(parseFloat(style.fontSize)>=18.66&&+style.fontWeight>=700),threshold=large?3:4.5;if(ratio<threshold)add(el,'Low contrast candidate',`Approximate text contrast ${ratio.toFixed(2)}:1 (review threshold ${threshold}:1). Confirm inherited backgrounds and visual context.`);}
  }
 }
 return findings;
}
function download(data,name){const a=make('a');a.href=data;a.download=name;a.click();}
async function capture(doc,width,items,mode,token){
 const height=Math.min(6000,Math.max(doc.body.scrollHeight,doc.documentElement.scrollHeight,200)),captureWidth=Math.min(1400,Math.max(width,doc.body.scrollWidth));
 const canvas=await html2canvas(doc.documentElement,{backgroundColor:'#ffffff',useCORS:true,allowTaint:false,logging:false,scale:1,width:captureWidth,height,windowWidth:width,windowHeight:900,scrollX:0,scrollY:0,imageTimeout:2500});
 if(token!==generation)return;const full=canvas.toDataURL('image/png');snapshots.push({mode,width,height,truncated:height===6000,data:full});
 for(const item of items){const r=item.rect;if(r.y>=height||r.x>=captureWidth){item.captureNote='Finding is outside the captured area (maximum 6000px height / 1400px width).';continue;}
  const x=Math.max(0,Math.min(captureWidth-1,r.x-20)),y=Math.max(0,r.y-35),w=Math.max(1,Math.min(captureWidth-x,Math.max(width,Math.min(r.width+40,1400)))),h=Math.max(1,Math.min(height-y,Math.max(130,Math.min(r.height+70,500))));
  const crop=document.createElement('canvas');crop.width=w;crop.height=h;const ctx=crop.getContext('2d');ctx.drawImage(canvas,x,y,w,h,0,0,w,h);ctx.strokeStyle='#e53242';ctx.lineWidth=3;ctx.strokeRect(Math.max(2,r.x-x),Math.max(2,r.y-y),Math.min(r.width,w-4),Math.min(r.height,h-4));item.screenshot=crop.toDataURL('image/png');
 }
}
function fitFrame(){
 const width=device==='Desktop'?700:375,available=Math.max(250,$('previewLive').clientWidth-48),zoom=$('previewZoom').value==='fit'?Math.min(1,available/width):Number($('previewZoom').value),frame=$('previewMain');
 frame.style.width=width+'px';frame.style.height='720px';frame.style.transform='scale('+zoom+')';frame.style.transformOrigin='top left';$('previewFrameWrap').style.width=(width*zoom)+'px';$('previewFrameWrap').style.height=(720*zoom)+'px';
 $('previewDeviceLabel').textContent=device.toUpperCase()+' · '+width+'px';$('previewDesktop').classList.toggle('selected',device==='Desktop');$('previewMobile').classList.toggle('selected',device==='Mobile');
 $('previewPNG').disabled=!snapshots.some(x=>x.mode===device);
}
let oldOutline=null;
function highlight(item){
 const doc=$('previewMain').contentDocument;if(!doc?.body)return;
 if(oldOutline){oldOutline.el.style.outline=oldOutline.value;oldOutline=null;}
 const el=doc.body.querySelectorAll('*')[item.elementIndex];if(!el)return;oldOutline={el,value:el.style.outline};el.style.outline='3px solid #e19a27';el.scrollIntoView({block:'center',inline:'nearest',behavior:'smooth'});
}
function selectIssue(item){selectedIssue=item;highlight(item);const host=$('previewDetail');host.replaceChildren();host.append(make('div',sourceBasis+' line '+(item.line||'—'),'kicker'),make('h3',item.type),make('p',item.message));
 const source=sourceBasis==='Input'?$('input').value:(currentHTML||window.QAOutput||$('input').value),allLines=source.split('\n'),start=Math.max(0,Number(item.line||1)-2),context=allLines.slice(start,start+4).map((line,i)=>(start+i+1)+'  '+line).join('\n');const code=make('pre',context,'inspector-code');const details=make('details');details.open=true;details.append(make('summary','Source context'),code);host.append(details);
 if(item.screenshot){const shot=make('details');shot.append(make('summary','Highlighted snapshot'));const img=make('img');img.src=item.screenshot;img.alt=item.type+' highlighted in preview';img.className='preview-capture';const btn=make('button','Download issue PNG');btn.onclick=()=>download(item.screenshot,'issue-'+item.mode+'-line-'+(item.line||'document')+'.png');shot.append(img,btn);host.append(shot);}else host.append(make('p',item.captureNote||'Snapshot unavailable.','empty-note'));
 $('previewFindings').querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.id===String(report.indexOf(item))));
}
function renderResults(){
 const host=$('previewFindings');host.replaceChildren();const query=$('previewSearch').value.toLowerCase(),items=report.filter(i=>i.mode===device&&(i.type+' '+i.message+' '+i.line).toLowerCase().includes(query));$('previewCount').textContent=String(items.length);
 for(const item of items){const btn=make('button',undefined,'visual-issue');btn.dataset.id=report.indexOf(item);btn.append(make('span',item.type),make('small',sourceBasis+' line '+(item.line||'—')+' · review'));btn.onclick=()=>selectIssue(item);host.append(btn);}
 if(!items.length)host.append(make('p',complete?'No matching visual findings for this viewport. Manual review is still needed.':'Run a review to populate the inspector.','empty-note'));
 if(selectedIssue&&items.includes(selectedIssue))selectIssue(selectedIssue);else{$('previewDetail').replaceChildren();selectedIssue=null;if(items[0])selectIssue(items[0]);}
 fitFrame();
}
function showDevice(mode){device=mode;fitFrame();renderResults();if(safePreview){$('previewPlaceholder').hidden=true;$('previewFrameWrap').hidden=false;$('previewMain').onload=()=>{oldOutline=null;if(selectedIssue)highlight(selectedIssue);};$('previewMain').srcdoc=safePreview;}}
let busy=false,pending=false;
async function run(){
 if(busy){pending=true;return;}const html=$('previewVersion').value==='input'?$('input').value:(currentHTML||window.QAOutput||$('input').value);sourceBasis=$('previewVersion').value==='input'?'Input':'Output';if(!html.trim()){$('previewStatus').textContent='Paste HTML or run a check first.';return;}
 busy=true;complete=false;$('previewRun').disabled=true;$('previewCancel').hidden=false;$('previewVersion').disabled=true;const token=++generation;report=[];snapshots=[];$('previewExport').disabled=true;stage.replaceChildren();$('previewFindings').replaceChildren();$('previewStatus').textContent='Rendering desktop and mobile previews…';badge.textContent='Preview review is running. See PREVIEW REVIEW for findings.';
 try{
  const remote=$('previewImages').checked,safe=sanitize(html,remote);safePreview=safe;$('previewBasis').textContent=sourceBasis==='Output'?'Current output':'Original input';showDevice(device);
  for(const [mode,width] of [['Desktop',700],['Mobile',375]]){
   if(token!==generation)return;const box=make('section',undefined,'preview-device');box.append(make('h3',mode+' · '+width+'px'));const frame=make('iframe');frame.title=mode+' email preview';frame.setAttribute('sandbox','allow-same-origin');frame.style.width=width+'px';frame.style.height='700px';box.append(frame);stage.append(box);await loadFrame(frame,safe);
   const doc=frame.contentDocument;if(!doc?.body)throw Error('Browser did not make the sandboxed preview available.');
   await Promise.race([Promise.all([...doc.images].map(img=>img.complete?Promise.resolve():new Promise(r=>{img.onload=r;img.onerror=r;}))),pause(3000)]);
   await pause(100);if(token!==generation)return;
   const items=inspect(doc,width,mode,remote);try{await capture(doc,width,items,mode,token);}catch(error){items.forEach(i=>i.captureNote='Capture failed: '+error.message);box.append(make('p','PNG capture unavailable in this browser: '+error.message));}
   if(token!==generation)return;report.push(...items);
  }
  if(token!==generation)return;complete=true;renderResults();document.dispatchEvent(new CustomEvent('qa-visual-result',{detail:{count:report.length,findings:report.map(({screenshot,...item})=>item),basis:sourceBasis}}));$('previewStatus').textContent=`${report.length} potential visual issues found across desktop and mobile. ${snapshots.length} preview captures created. Review each finding before changing layout.`;badge.textContent=`Preview review: ${report.length} potential visual issues. Open PREVIEW REVIEW for details and snapshots.`;$('previewExport').disabled=false;
 }catch(e){$('previewStatus').textContent='Preview review could not complete: '+e.message;badge.textContent='Preview review could not complete; see PREVIEW REVIEW.';}
 finally{busy=false;$('previewRun').disabled=false;$('previewCancel').hidden=true;$('previewVersion').disabled=false;if(pending){pending=false;setTimeout(run,0);}}
}
function invalidate(){generation++;safePreview='';$('previewFrameWrap').hidden=true;$('previewPlaceholder').hidden=false;selectedIssue=null;$('previewDetail').replaceChildren();$('previewPNG').disabled=true;$('previewCount').textContent='0';document.dispatchEvent(new CustomEvent('qa-visual-result',{detail:null}));complete=false;report=[];snapshots=[];$('previewExport').disabled=true;$('previewFindings').replaceChildren();stage.replaceChildren();$('previewStatus').textContent='Code changed. Run a check or review again.';badge.textContent='Preview review is out of date.';}
document.addEventListener('qa-rendered',e=>{currentHTML=e.detail.html;$('previewVersion').value='output';clearTimeout(timer);invalidate();if(currentHTML&&$('previewAuto').checked)timer=setTimeout(run,300);});
document.addEventListener('qa-tab-changed',e=>{panel.hidden=e.detail!=='preview';if(!panel.hidden)requestAnimationFrame(fitFrame);});
$('previewDesktop').onclick=()=>showDevice('Desktop');$('previewMobile').onclick=()=>showDevice('Mobile');$('previewZoom').onchange=fitFrame;$('previewSearch').oninput=renderResults;new ResizeObserver(fitFrame).observe($('previewLive'));
$('previewPNG').onclick=()=>{const shot=snapshots.find(x=>x.mode===device);if(shot)download(shot.data,'preview-'+device+'.png');};
$('previewCancel').onclick=()=>{clearTimeout(timer);pending=false;invalidate();$('previewStatus').textContent='Review cancelled. You can start a fresh review.';};
$('previewVersion').onchange=()=>{invalidate();run();};
$('previewRun').onclick=()=>{clearTimeout(timer);currentHTML=window.QAOutput||$('input').value;run();};$('previewImages').onchange=()=>{invalidate();run();};$('previewAuto').onchange=()=>{if(!$('previewAuto').checked){clearTimeout(timer);pending=false;}};
$('input').addEventListener('input',()=>{currentHTML='';invalidate();});
$('fileInput').addEventListener('change',()=>{currentHTML='';invalidate();});
$('input').addEventListener('drop',()=>{currentHTML='';invalidate();});$('clearBtn').addEventListener('click',()=>{currentHTML='';invalidate();});
$('previewExport').onclick=()=>{if(!complete)return;const text=JSON.stringify({generated:new Date().toISOString(),basis:'Current output; browser-only diagnostics. Images may be omitted by CORS. Captures capped at 6000px height.',findings:report,snapshots},null,2),url=URL.createObjectURL(new Blob([text],{type:'application/json'}));download(url,'visual-qa-report.json');setTimeout(()=>URL.revokeObjectURL(url),1000);};
})();
