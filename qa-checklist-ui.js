(function(){
'use strict';
const $=id=>document.getElementById(id), input=$('input');let last=null,lastSource='',active=false;
const tabs=document.createElement('div');tabs.className='qa-tabs';tabs.setAttribute('role','tablist');tabs.innerHTML='<button id="qaHomeTab" role="tab" aria-selected="false">OVERVIEW</button><button id="qaFormatTab" role="tab" aria-selected="true">FORMAT & CHECK</button><button id="qaChecklistTab" role="tab" aria-selected="false">QA CHECKLIST</button><button id="qaPreviewTab" role="tab" aria-selected="false">PREVIEW REVIEW</button><button id="qaCompareTab" role="tab" aria-selected="false">CODE COMPARE</button><button id="qaAssetsTab" role="tab" aria-selected="false">ASSETS & LINKS</button>';
$('toggles').before(tabs);
const panel=document.createElement('section');panel.id='qaSettings';panel.hidden=true;panel.className='qa-settings';panel.innerHTML=`<h2>QA CHECKLIST <span>64 checks • prioritized findings and review coverage</span></h2><p>Run all checks and apply safe fixes. Design decisions remain open for review. Input is kept unchanged; copy or download the corrected output.</p><div class="qa-controls"><label>Scope<select id="qaDocumentMode"><option value="auto">Auto-detect</option><option value="full">Full email document</option><option value="fragment">HTML fragment</option></select></label><label>Client name<input id="qaClient" placeholder="Approved client name"></label><label>Approved button width (px)<input id="qaWidth" type="number" min="5" placeholder="205"></label><label><input id="qaLayout" type="checkbox" checked> Unmarked tables are email layout tables (data tables excluded)</label></div><div class="qa-controls"><button id="qaRun" class="primary">Check all & fix safe issues</button><button id="qaAudit">Check only</button><button id="qaUndo" disabled>Undo last checklist fixes</button><button id="qaExport" disabled>Download QA report</button></div><p id="qaNotice" role="status">Paste or open HTML, then run the checklist.</p>`;
tabs.after(panel);
const report=document.createElement('section');report.id='qaReport';report.hidden=true;report.className='qa-settings';report.innerHTML='<div id="qaSummary" aria-live="polite"></div><div class="qa-controls"><label>Show <select id="qaFilter"><option value="all">All checks</option><option value="error">Errors</option><option value="review">Needs review</option><option value="fixed">Fixed</option><option value="pass">Passed static checks</option><option value="na">Not applicable</option></select></label><input id="qaSearch" placeholder="Search checklist or details" aria-label="Search checklist"></div><div id="qaResults"></div>';
document.querySelector('.report').after(report);
function activate(mode){
 active=mode==='checklist';panel.hidden=!active;report.hidden=!active;
 $('toggles').hidden=mode!=='format';document.querySelector('.report').hidden=mode!=='format';
 document.querySelector('.workspace').hidden=!['format','checklist'].includes(mode);
 $('formatBtn').hidden=mode!=='format';
 for(const [id,name] of [['qaHomeTab','home'],['qaAssetsTab','assets'],['qaFormatTab','format'],['qaChecklistTab','checklist'],['qaPreviewTab','preview'],['qaCompareTab','compare']])$(id).setAttribute('aria-selected',String(name===mode));
 document.body.dataset.workspace=mode;
 document.dispatchEvent(new CustomEvent('qa-tab-changed',{detail:mode}));
}
window.QANavigate=activate;
$('qaHomeTab').onclick=()=>activate('home');$('qaAssetsTab').onclick=()=>activate('assets');
$('qaFormatTab').onclick=()=>activate('format');
$('qaChecklistTab').onclick=()=>activate('checklist');
$('qaPreviewTab').onclick=()=>activate('preview');
$('qaCompareTab').onclick=()=>activate('compare');
function publish(html){document.dispatchEvent(new CustomEvent('qa-output',{detail:{html}}));}
function execute(fix){
 if(!input.value.trim()){$('qaNotice').textContent='Paste or open an HTML file first.';return;}
 try{lastSource=input.value;last=QAChecklist.run(lastSource,{fix,documentMode:$('qaDocumentMode').value,client:$('qaClient').value,buttonWidth:$('qaWidth').value,layout:$('qaLayout').checked});publish(last.html);$('qaNotice').textContent=last.coverage?.fixSuppressed?'Fixes paused: repair malformed syntax, then rerun.':fix?'Complete. Safe fixes applied to output; input is unchanged. Review all remaining findings.':'Audit complete. No changes applied.';$('qaUndo').disabled=!fix;$('qaExport').disabled=false;render();document.dispatchEvent(new CustomEvent('qa-checklist-result',{detail:{...last,source:lastSource,mode:fix?'fix':'audit'}}));}
 catch(e){$('qaNotice').textContent='Unable to complete checklist: '+e.message;}
}
function node(tag,text,cls){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;}
const labels={error:'ERROR',review:'NEEDS REVIEW',fixed:'FIXED',pass:'STATIC CHECK PASSED',na:'NOT APPLICABLE'};
function render(){
 if(!last||document.getElementById('issueCenter'))return;const counts={};last.checks.forEach(c=>counts[c.status]=(counts[c.status]||0)+1);
 $('qaSummary').textContent=`${last.checks.length} checks • ${last.issues.filter(i=>i.status==='fixed').length} fixes • ${counts.error||0} checks with errors • ${counts.review||0} checks need review • ${counts.pass||0} static passes. Manual sign-off is still required.`;
 const host=$('qaResults');host.replaceChildren();const query=$('qaSearch').value.toLowerCase(),filter=$('qaFilter').value;
 for(const c of last.checks){const items=filter==='all'?c.items:c.items.filter(i=>i.status===filter);if(filter!=='all'&&c.status!==filter&&!items.length)continue;if(query&&!JSON.stringify(c).toLowerCase().includes(query))continue;
  const card=node('details',undefined,'qa-card '+c.status);card.open=c.status==='error';card.append(node('summary',String(c.rule).padStart(2,'0')+' · '+c.title+' — '+labels[c.status]));
  if(!c.items.length)card.append(node('p','No issue detected by this static check.'));
  for(const item of (filter==='all'?c.items:items)){const box=node('div',undefined,'qa-finding');box.append(node('strong',labels[item.status]+' · '+item.message));
   const lines=node('div',undefined,'qa-lines');
   if(item.inputLine){const b=node('button','Input line '+item.inputLine);b.onclick=()=>{const start=lastSource.split('\n').slice(0,item.inputLine-1).join('\n').length+(item.inputLine>1?1:0);input.focus();input.setSelectionRange(start,start+(lastSource.split('\n')[item.inputLine-1]||'').length);input.scrollTop=(item.inputLine-1)*20;};lines.append(b);}
   if(item.outputLine){const b=node('button','Output line '+item.outputLine);b.onclick=()=>{const line=document.querySelector('#output [data-line="'+item.outputLine+'"]');line?.scrollIntoView({behavior:'smooth',block:'center'});};lines.append(b);}else lines.append(node('span','Document-level review • no specific line'));
   box.append(lines,node('p',item.detail));if(item.before){box.append(node('small',item.status==='fixed'?'Before':'Source'),node('pre',item.before));}if(item.after!==null)box.append(node('small','After'),node('pre',item.after));card.append(box);
  }host.append(card);
 }if(!host.children.length)host.append(node('p','No matching findings.'));
}
$('qaRun').onclick=()=>execute(true);$('qaAudit').onclick=()=>execute(false);$('qaFilter').onchange=render;$('qaSearch').oninput=render;
$('qaUndo').onclick=()=>{publish(lastSource);last=null;document.dispatchEvent(new CustomEvent('qa-checklist-result',{detail:null}));$('qaResults').replaceChildren();$('qaSummary').textContent='Fixes undone. Run again to produce a current report.';$('qaUndo').disabled=true;$('qaExport').disabled=true;};
$('copyReportBtn').addEventListener('click',async e=>{if(!active)return;e.stopImmediatePropagation();if(!last){$('qaNotice').textContent='Run the checklist before copying its report.';return;}const text=last.checks.map(c=>c.rule+'. '+c.title+' — '+labels[c.status]+'\n'+c.items.map(i=>labels[i.status]+' | Input '+(i.inputLine||'document')+' / Output '+(i.outputLine||'document')+' | '+i.message+'\n'+i.detail+(i.after!==null?'\nBefore: '+i.before+'\nAfter: '+i.after:'')).join('\n')).join('\n\n');try{await navigator.clipboard.writeText(text);$('qaNotice').textContent='QA report copied.';}catch(e){$('qaNotice').textContent='Clipboard unavailable. Use Download QA report.';}},true);
$('qaExport').onclick=()=>{if(!last)return;const blob=new Blob([JSON.stringify({generated:new Date().toISOString(),lineNumberBasis:'Input and output lines refer to the last QA run.',...last},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='email-qa-checklist-report.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
function stale(){document.dispatchEvent(new CustomEvent('qa-checklist-result',{detail:null}));if(last){$('qaNotice').textContent='Source or settings changed. Run the checklist again; previous results are now out of date.';last=null;$('qaResults').replaceChildren();$('qaSummary').textContent='Results out of date.';$('qaExport').disabled=true;$('qaUndo').disabled=true;}}
document.addEventListener('qa-rendered',e=>{if(last&&e.detail.html!==last.html)stale();});
input.addEventListener('input',stale);['qaClient','qaWidth','qaLayout','qaDocumentMode'].forEach(id=>$(id).addEventListener('input',stale));$('clearBtn').addEventListener('click',stale);$('formatBtn').addEventListener('click',stale);$('fileInput').addEventListener('change',stale);input.addEventListener('drop',stale);
})();
