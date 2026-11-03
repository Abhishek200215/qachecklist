/* Extended static checks. Source edits are local, named, and preserve line breaks. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory;else root.QAChecklist=factory(root.EmailTool,root.QAChecklist);})(typeof window!=='undefined'?window:globalThis,function(EmailTool,base){
'use strict';
const extra=[
 ['Document structure','HTML'],['Document type','HTML'],['Character encoding','HTML'],['Document language','Accessibility'],['Mobile viewport','Responsive'],['Tag nesting and balance','HTML'],['Table content structure','HTML'],['Repeated document sections','HTML'],['CSS declaration syntax','CSS'],['CSS property spelling','CSS'],['CSS property/value validity','CSS'],['CSS dimension units','CSS'],['External stylesheets and imports','Email compatibility'],['Scripts and active content','Security'],['Image source values','Images'],['Image file formats','Email compatibility'],['Image display behaviour','Images'],['Image dimensions','Images'],['New-window link relationship','Links'],['Link accessible names','Accessibility'],['Fragment link destinations','Links'],['Unresolved placeholders','Content'],['Hidden text and content','Accessibility'],['Media query syntax','Responsive'],['HTML size budget','Email compatibility'],['Preview text / preheader','Content'],['Unsubscribe mechanism','Content'],['Heading hierarchy','Accessibility'],['Forms and interactive controls','Email compatibility'],['Embedded assets','Email compatibility'],['Comments and Outlook conditionals','HTML'],['Attribute spelling and value syntax','HTML']
];
const rules=[...base.rules,...extra.map(x=>x[0])],VOID=new Set('area base br col embed hr img input link meta param source track wbr'.split(' ')),OPTIONAL=new Set('p li dt dd tr td th thead tbody tfoot colgroup option optgroup html head body'.split(' '));
const attrTypos={widht:'width',heigth:'height',hieght:'height',boder:'border',cellpading:'cellpadding',cellspcing:'cellspacing',cellspaceing:'cellspacing',bgcolour:'bgcolor',bgcolr:'bgcolor',allign:'align',valing:'valign',herf:'href',scr:'src'};
const cssTypos={backgound:'background',backgorund:'background',backgrond:'background',backgroud:'background',widht:'width',heigth:'height',hieght:'height',paddding:'padding',pading:'padding',margn:'margin',maring:'margin',colr:'color',colour:'color','font-szie':'font-size','font-weigth':'font-weight','line-heigth':'line-height','text-algin':'text-align','text-decoraton':'text-decoration','border-raduis':'border-radius',allign:'text-align'};
const decode=v=>v.replace(/&(?:quot|apos|amp|#(\d+)|#x([\da-f]+));/gi,(m,dec,hex)=>dec||hex?String.fromCodePoint(Math.min(0x10ffff,parseInt(dec||hex,dec?10:16))):({'&quot;':'\"','&apos;':"'",'&amp;':'&'}[m.toLowerCase()]||m));
const dynamic=v=>/{{|}}|\[\[|\]\]|%%|<%|%>|\$\{/.test(v);
const esc=v=>String(v).replace(/&(?!(?:#\d+|#x[\da-f]+|[a-z][\w]+);)/gi,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
function runOnce(source,options={}){
 const result=base.run(source,options),html=result.html,tokens=EmailTool.tokenize(html),issues=[],offsets=new Map();let position=0;
 const original=EmailTool.tokenize(String(source).replace(/\r\n?/g,'\n')),sourceByKey=new Map(),counts=new Map();for(const t of original){const key=t.type+':'+(t.name||'');if(!sourceByKey.has(key))sourceByKey.set(key,[]);sourceByKey.get(key).push(t.srcLine);}
 for(const t of tokens){t.start=position;position+=t.value.length;t.end=position;t.tag=['open','self'].includes(t.type)?EmailTool.parseTag(t.value):null;const key=t.type+':'+(t.name||''),n=counts.get(key)||0;counts.set(key,n+1);t.inputLine=t.type==='text'?null:(sourceByKey.get(key)?.[n]||null);}
 const get=(t,n)=>t.tag?.attrs.find(a=>a.name.toLowerCase()===n),value=(t,n)=>get(t,n)?.value??'';
 const add=(id,t,message,detail,status='review',severity='medium',patch=null,delta=0)=>{const issue={rule:id,title:rules[id-1],category:extra[id-33]?.[1]||'General',status:patch&&options.fix?'fixed':status,severity,message,detail,inputLine:t?.inputLine?t.inputLine+delta:null,outputLine:t?t.srcLine+delta:null,before:patch?.before??t?.value??'',after:patch&&options.fix?patch.after:null,suggestedAfter:patch?.after??null,safeFix:!!patch,method:'static',offset:t?.start??null};issues.push(issue);return issue;};
 function set(t,name,v,id,message){const before=t.changed??t.value,start=before.match(/^<\s*[\w:.-]+/)[0].length,re=/([^\s=\/>"']+)(\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'`=<>]+))?/g;re.lastIndex=start;let m,found=null;while((m=re.exec(before))){if(m[1].toLowerCase()===name){found=m;break;}}const replacement=name+'="'+esc(v)+'"',after=found?before.slice(0,found.index)+replacement+before.slice(found.index+found[0].length):before.replace(/\s*\/?>$/,tail=>' '+replacement+tail);add(id,t,message,'Set '+name+'="'+v+'".','error','medium',{before,after});if(options.fix)t.changed=after;}
 const full=options.documentMode==='full'||(options.documentMode!=='fragment'&&tokens.some(t=>t.name==='html'||t.type==='doctype')),opens=tokens.filter(t=>t.tag),first=name=>opens.find(t=>t.name===name),all=name=>opens.filter(t=>t.name===name);
 for(const id of [33,34,35,36,37,40,58,59])if(!full)add(id,null,'Document-level check not applicable to this fragment.','Choose Full document mode when validating a complete email.','na','low');
 if(full){
  for(const name of ['html','head','body'])if(!first(name))add(33,null,'Missing <'+name+'> section.','Include the document section in the complete email; this tool does not guess where to wrap content.','error','high');
  if(!tokens.some(t=>t.type==='doctype'))add(34,null,'Document type is missing.','Add the approved HTML doctype before the html element.','error','medium');
  else {const doc=tokens.find(t=>t.type==='doctype');if(!/^<!doctype\s+html\s*>$/i.test(doc.value))add(34,doc,'Non-HTML5 or legacy doctype.','Verify that the chosen doctype is intentional for your email build.','review','low');}
  const metas=all('meta'),encoding=metas.find(t=>get(t,'charset')||/^content-type$/i.test(value(t,'http-equiv')));
  if(!encoding)add(35,first('head'),'Character encoding is not declared.','Add <meta charset="UTF-8"> near the start of head. This changes document metadata and should be confirmed.','error','medium');
  else if(get(encoding,'charset')&&!/^utf-?8$/i.test(value(encoding,'charset')))add(35,encoding,'Encoding is not UTF-8.','Confirm the source bytes and sending platform encoding agree.','review','medium');
  if(first('html')&&!value(first('html'),'lang'))add(36,first('html'),'Document language is missing.','Set lang to the actual content language; it cannot be inferred reliably.','error','medium');
  else if(first('html')&&!/^[a-z]{2,8}(?:-[a-z0-9]{1,8})*$/i.test(value(first('html'),'lang')))add(36,first('html'),'Review the language tag.','Use a valid language tag, such as en or en-IN, matching the actual content.');
  const vp=metas.find(t=>/^viewport$/i.test(value(t,'name')));if(!vp)add(37,first('head'),'Viewport metadata is missing.','For responsive email, review width=device-width, initial-scale=1.');else if(/(?:user-scalable\s*=\s*no|maximum-scale\s*=\s*1(?:[,;\s]|$))/i.test(value(vp,'content')))add(37,vp,'Viewport restricts zoom.','Allow zoom so readers can enlarge text.','review','high');
  for(const name of ['html','head','body','title'])for(const t of all(name).slice(1))add(40,t,'Repeated <'+name+'> section.','Merge duplicate document sections; content order needs human review.','error','high');
 }
 // Structural checks keep Outlook branches separate and allow optional HTML end tags.
 let stack=[],conditionalDepth=0,foreign=0;const frames=[];
 for(const t of tokens){
  if(t.type==='cond-open'){if(!issues.some(i=>i.rule===63&&i.status==='review'))add(63,t,'Outlook conditional branches need a rendering check.','Conditional boundaries are checked, but HTML nesting inside split Outlook branches is not certified automatically.');frames.push(stack.slice());conditionalDepth++;continue;}
  if(t.type==='cond-close'){if(!conditionalDepth)add(63,t,'Outlook conditional closes without an opener.','Check matching conditional comment boundaries.','error','high');else{stack=frames.pop();conditionalDepth--;}continue;}
  if(conditionalDepth>0){t.foreign=!!t.name?.includes(':');continue;}
  if(t.type==='comment'&&!t.value.endsWith('-->'))add(63,t,'HTML comment is not closed.','Close the comment to prevent later markup being hidden.','error','high');
  if(['svg','math'].includes(t.name)&&t.type==='open')foreign++;
  t.foreign=['svg','math'].includes(t.name)||foreign>0||t.name?.includes(':');
  if(['open','self'].includes(t.type)&&!t.foreign){
   if(t.type==='self'&&!VOID.has(t.name))add(38,t,'Self-closing syntax on a non-void HTML element.','Use an explicit closing tag for '+t.name+'; HTML parsers may ignore the trailing slash.','error','medium');
   if(['td','th','tr','thead','tbody','tfoot'].includes(t.name)&&['td','th'].includes(stack.at(-1)?.name))stack.pop();
   if(['tr','thead','tbody','tfoot'].includes(t.name)&&stack.at(-1)?.name==='tr')stack.pop();
   if(['thead','tbody','tfoot'].includes(t.name)&&['thead','tbody','tfoot'].includes(stack.at(-1)?.name))stack.pop();
   if(['td','th'].includes(t.name)&&stack.at(-1)?.name!=='tr')add(39,t,'Cell is outside a table row.','Place td/th directly inside tr.','error','high');
   if(t.name==='tr'&&!['table','thead','tbody','tfoot'].includes(stack.at(-1)?.name))add(39,t,'Table row has an invalid parent.','Rows belong inside table or a table section.','error','high');
   if(stack.at(-1)?.name==='tr'&&!['td','th','style','script','template'].includes(t.name))add(39,t,'Non-cell content inside a table row.','Wrap row content in a td/th cell.','error','high');
   if(stack.at(-1)?.name==='table'&&!['caption','colgroup','thead','tbody','tfoot','tr','style','script','template'].includes(t.name))add(39,t,'Invalid direct child of table.','Use a row/cell structure instead of placing ordinary elements directly in table.','error','high');
   if(['p','li','dt','dd','tr','td','th','option'].includes(t.name)&&stack.at(-1)?.name===t.name)stack.pop();
   if(t.name==='p'&&stack.at(-1)?.name==='p')stack.pop();if(t.type==='open')stack.push(t);
  }
  if(t.type==='close'&&!t.foreign){
   if(VOID.has(t.name)){add(38,t,'Void element has a closing tag: '+t.name+'.','Void HTML elements do not have closing tags.','error','medium');continue;}
   const at=stack.map(x=>x.name).lastIndexOf(t.name);
   if(at<0)add(38,t,'Closing tag has no matching opener: </'+t.name+'>.','Review nesting and conditional branches before removing this tag.','error','high');
   else{for(const inner of stack.slice(at+1))if(!OPTIONAL.has(inner.name))add(38,inner,'Element <'+inner.name+'> is closed out of order.','Close it before </'+t.name+'>. The browser may otherwise repair the tree differently.','error','high');stack=stack.slice(0,at);}
  }
  if(['svg','math'].includes(t.name)&&t.type==='close')foreign=Math.max(0,foreign-1);
 }
 for(const t of stack)if(!OPTIONAL.has(t.name))add(38,t,'Element <'+t.name+'> has no closing tag.','Add the matching end tag at the intended boundary.','error','high');
 if(conditionalDepth)add(63,null,'Unclosed Outlook conditional block.','Balance each [if] block with its endif boundary.','error','high');
 const ids=new Set(opens.map(t=>value(t,'id')).filter(Boolean)),cssBodies=tokens.filter(t=>t.type==='raw'&&t.name==='style');
 function inspectCSS(text,t,inline){
  if(dynamic(text)){add(54,t,'CSS contains unresolved template expressions.','Validate a rendered sample after the sending platform resolves these values.');return text;}
  const cssIssueStart=issues.length;let quote='',comment=false,paren=0,brace=0,start=0,out='',bad=false;
  const declaration=(chunk,at)=>{
   const clean=chunk.replace(/\/\*[\s\S]*?\*\//g,''),m=/^(\s*)([-\w]+)(\s*:\s*)([\s\S]*)$/.exec(clean),delta=(inline?0:text.slice(0,at).split('\n').length-1);
   if(!m&&/^\s*\*[-\w]+\s*:/.test(clean)){add(45,t,'Legacy CSS property hack.','Confirm that this client-specific override is still required.');return chunk;}
   if(!m){if(clean.trim()&&!/^@/.test(clean.trim()))add(41,t,'CSS declaration is missing a property/value separator.','Review this declaration: '+clean.trim().slice(0,180),'error','high',null,delta);return chunk;}
   const prop=m[2].toLowerCase(),v=decode(m[4].trim().replace(/\s*!important\s*$/i,'')),replacement=cssTypos[prop];
   if(dynamic(v)||prop.startsWith('--')||/^(?:mso-|[-_])/.test(prop))return chunk;
   if(replacement&&chunk!==clean){add(42,t,'Misspelled CSS property next to a comment: '+m[2]+'.','Replace it with '+replacement+' while preserving the comment.','error','medium',null,delta);return chunk;}
   if(replacement){const after=m[1]+replacement+m[3]+m[4];add(42,t,'Misspelled CSS property: '+m[2]+'.','Replace with '+replacement+'.','error','medium',{before:chunk,after},delta);return options.fix?after:chunk;}
   if(typeof CSS!=='undefined'&&CSS.supports){
    if(!CSS.supports(prop,'initial'))add(43,t,'Unknown CSS property: '+prop+'.','Confirm the spelling. Vendor/client extensions require manual review.','error','medium',null,delta);
    else if(v&&!CSS.supports(prop,v)&&!/[\\]|expression\(/i.test(v))add(43,t,'Browser rejects '+prop+': '+v.slice(0,90)+'.','Check the value syntax. Legacy email-specific fallbacks can differ; do not remove them blindly.','review','medium',null,delta);
   }
   if(/^(?:width|height|min-width|max-width|min-height|max-height|font-size|padding(?:-\w+)?|margin(?:-\w+)?|top|left|right|bottom)$/.test(prop)&&/^-?(?:\d*\.)?\d+$/.test(v)&&Number(v)!==0)add(44,t,'Nonzero CSS dimension has no unit.','Add the intended unit to '+prop+': '+v+'. The correct unit is not assumed.','error','medium',null,delta);
   if(/^(?:width|height|font-size|padding(?:-\w+)?)$/.test(prop)&&/^-[\d.]+/.test(v))add(44,t,'Negative size or padding is invalid.','Review '+prop+': '+v+'.','error','medium',null,delta);
   if(/(?:^|\s)(?:absolute|fixed)$/.test(v)&&prop==='position')add(55,t,'Positioned content may overlap or leave the email flow.','Inspect its visibility and placement in real email clients.','review','medium',null,delta);
   if(/^(?:display|visibility|opacity)$/.test(prop)&&/^(?:none|hidden|0)$/.test(v))add(55,t,'Hidden content candidate.','Confirm that this is a preheader, spacer or intentional responsive alternative.','review','low',null,delta);
   if(/^(?:display)$/.test(prop)&&/^(?:grid|flex|inline-flex|inline-grid)$/.test(v))add(45,t,'Modern layout needs email-client fallbacks.','Verify the table/Outlook fallback for '+prop+': '+v+'.','review','medium',null,delta);
   return chunk;
  };
  for(let i=0;i<text.length;i++){
   const c=text[i],next=text[i+1];if(inline&&c==='&'){const entity=/^&(?:[a-z]+|#\d+|#x[\da-f]+);/i.exec(text.slice(i));if(entity){const decoded=decode(entity[0]);if(decoded==='\"'||decoded==="'"){if(quote===decoded)quote='';else if(!quote)quote=decoded;}i+=entity[0].length-1;continue;}}if(comment){if(c==='*'&&next==='/'){comment=false;i++;}continue;}if(quote){if(c==='\\')i++;else if(c===quote)quote='';continue;}if(c==='/'&&next==='*'){comment=true;i++;continue;}if(c==='"'||c==="'"){quote=c;continue;}if(c==='(')paren++;if(c===')'){paren--;if(paren<0)bad=true;}
   if(!paren&&c==='{'){brace++;out+=text.slice(start,i+1);start=i+1;}
   if(!paren&&(c===';'||c==='}')){const chunk=text.slice(start,i);out+=(inline||brace>0)?declaration(chunk,start):chunk;out+=c;start=i+1;if(c==='}')brace--;if(brace<0)bad=true;}
  }
  const tail=text.slice(start);out+=(inline||brace>0)?declaration(tail,start):tail;
  if(quote||comment||paren||brace||bad){for(const i of issues.slice(cssIssueStart)){if(i.rule===42){if(i.status==='fixed')i.status='error';i.after=null;i.safeFix=false;i.suggestedAfter=null;}}add(41,t,'CSS has unmatched delimiters or an unclosed string/comment.','Balance quotes, parentheses and braces before relying on CSS fixes.','error','high');return text;}
  return out;
 }
 for(const t of cssBodies){const after=inspectCSS(t.value,t,false);if(options.fix)t.changed=after;if(/@import\b/i.test(t.value))add(45,t,'CSS imports are present.','Email clients may omit imported CSS. Inline essential styling.');for(const m of t.value.matchAll(/@media\s*([^{}]+)\{/gi)){const q=m[1];if(/(?:min|max)-width\s*:\s*\d+\s*\)/i.test(q))add(56,t,'Media query width is missing a unit.','Use the intended unit, commonly px, and verify breakpoint behaviour.','error','medium');}}
 let lastHeading=0;
 for(let index=0;index<tokens.length;index++){const t=tokens[index];if(!t.tag)continue;
  if(!t.foreign){
   let quote='';for(const c of t.value){if(quote){if(c===quote)quote='';}else if(c==='\"'||c==="'")quote=c;}if(quote||!/>$/.test(t.value))add(64,t,'Opening tag has an unclosed quote or delimiter.','Close the attribute quote and tag before applying other changes.','error','high');
   let current=t.changed??t.value;const start=current.match(/^<\s*[\w:.-]+/)[0].length,re=/([^\s=\/>"']+)(\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'`=<>]+))?/g;re.lastIndex=start;const fixes=[];let m;
   while((m=re.exec(current))){const replacement=attrTypos[m[1].toLowerCase()];if(replacement){if(get(t,replacement))add(64,t,'Misspelled attribute conflicts with '+replacement+'.','Choose the intended value; both attributes are present.','error','high');else fixes.push({start:m.index,end:m.index+m[1].length,replacement,name:m[1]});}}
   for(const f of fixes.reverse()){const before=current,after=current.slice(0,f.start)+f.replacement+current.slice(f.end);add(64,t,'Misspelled HTML attribute: '+f.name+'.','Replace with '+f.replacement+'.','error','medium',{before,after});if(options.fix)current=after;}
   if(options.fix)t.changed=current;
  }
  if(get(t,'style')){const before=value(t,'style'),after=inspectCSS(before,t,true);if(options.fix&&after!==before){const count=issues.length;set(t,'style',after,42,'Update corrected CSS properties.');issues.splice(count);}}
  if(t.name==='link'&&/stylesheet/i.test(value(t,'rel')))add(45,t,'External stylesheet reference.','Ensure essential rules are inlined; email clients may remove linked stylesheets.');
  if(['script','iframe','object','embed'].includes(t.name))add(46,t,'Active element in email: <'+t.name+'>.','Remove or replace active content with email-safe markup after reviewing its purpose.','error','critical');
  for(const a of t.tag.attrs)if(/^on\w+/i.test(a.name))add(46,t,'Inline event handler: '+a.name+'.','Email clients strip or block JavaScript handlers. Remove the handler and use a normal link.','error','critical');
  if(t.name==='img'){
   const src=value(t,'src');if(!src.trim())add(47,t,'Image has an empty or missing src.','Provide the hosted image URL.','error','high');
   if(/^(?:file:|[a-z]:[\\/])/i.test(src))add(47,t,'Image references a local filesystem path.','Upload the image and use its public HTTPS URL.','error','high');
   if(/\.(?:svg|webp|avif)(?:[?#]|$)/i.test(src))add(48,t,'Image format needs email-client verification.','Provide a PNG/JPEG fallback where your target clients do not support this format.');
   if(!/display\s*:\s*(?:block|inline-block)/i.test(value(t,'style')))add(49,t,'Image may leave an inline baseline gap.','Inspect whether this is a block image; use display:block only when appropriate.','review','low');
   for(const a of ['width','height']){const v=value(t,a);if(v&&!dynamic(v)&&!/^(?:\d+|\d+(?:\.\d+)?%)$/.test(v))add(50,t,'Image '+a+' attribute has a nonstandard value.','HTML image dimensions are normally unitless positive integers; use CSS for other units.','review','medium');}
   if(!get(t,'width')&&!/width\s*:/i.test(value(t,'style')))add(50,t,'Image has no declared width.','Verify that intrinsic image size cannot expand the email layout.');
  }
  if(t.name==='a'){
   const href=value(t,'href').trim();if(/^https?:/i.test(href)&&value(t,'target')==='_blank'&&!/\bnoopener\b/i.test(value(t,'rel')))set(t,'rel',(value(t,'rel')+' noopener').trim(),51,'New-window link lacks explicit noopener.');
   let end=index+1;while(end<tokens.length&&!(tokens[end].type==='close'&&tokens[end].name==='a')&&!(tokens[end].type==='open'&&tokens[end].name==='a'))end++;
   const inside=tokens.slice(index+1,end),text=inside.filter(x=>x.type==='text').map(x=>x.value).join('').replace(/&(?:nbsp|#160);/g,' ').trim(),imageAlt=inside.some(x=>x.name==='img'&&value(x,'alt').trim());
   if(!text&&!imageAlt&&!value(t,'aria-label'))add(52,t,'Link has no detectable accessible name.','Provide visible text, an image alt or an appropriate accessible label.','error','high');
   if(href==='#')add(53,t,'Link is an empty fragment placeholder.','Replace # with the approved destination.','error','medium');else if(href.startsWith('#')&&href.length>1&&!ids.has(href.slice(1)))add(53,t,'Fragment target does not exist: '+href+'.','Confirm the target ID and email-client support for anchors.');
  }
  if(['form','input','select','textarea','button'].includes(t.name))add(61,t,'Interactive form control in email.','Provide a web destination fallback and test support for your target clients.');
  for(const n of ['src','href','background']){const v=value(t,n);if(/^data:/i.test(v))add(62,t,'Embedded data URL asset.','Data URLs add weight and have inconsistent email support. Consider a hosted asset.');if(/^cid:/i.test(v))add(62,t,'CID asset requires MIME attachment matching.','Verify that the sending platform attaches the matching Content-ID; HTML alone cannot verify it.');if(dynamic(v))add(54,t,'Unresolved dynamic value in '+n+'.','Render a real sample through the sending platform; this may be an intentional merge field.');}
  if(/^h[1-6]$/.test(t.name)){const level=Number(t.name[1]);if(lastHeading&&level>lastHeading+1)add(60,t,'Heading level skips from h'+lastHeading+' to '+t.name+'.','Review the logical reading order and heading hierarchy.');lastHeading=level;}
 }
 for(const t of tokens.filter(t=>t.type==='text'))if(/\b(?:lorem ipsum|TODO|FIXME|insert (?:text|link|name) here)\b/i.test(t.value))add(54,t,'Possible unfinished or placeholder copy.','Review this text before approving the campaign.','review','high');
 const size=new TextEncoder().encode(html).length;if(size>=100*1024)add(57,null,'HTML is '+(size/1024).toFixed(1)+' KB.','Review message clipping risk and final sent-message size; platform tracking and inlining can increase it.','review','high');
 if(full&&!opens.some(t=>/preheader|preview.?text/i.test(value(t,'id')+' '+value(t,'class'))))add(58,null,'No explicitly labelled preheader detected.','Confirm the intended inbox preview text. Unlabelled preheaders require manual review.','review','low');
 if(full)add(59,null,'Unsubscribe handling needs campaign context.','For promotional email, verify the visible unsubscribe destination and sending-platform headers. HTML cannot inspect the final MIME headers.','review','medium');
 const finalHTML=tokens.map(t=>t.changed??t.value).join('');
 // Never claim an edit was applied when malformed CSS prevented it.
 for(const i of issues)if(i.status==='fixed'&&i.rule===42&&i.offset!==null){const t=tokens.find(x=>x.start===i.offset);if((t?.changed??t?.value)===t?.value){i.status='error';i.after=null;}}
 result.html=finalHTML;result.issues.push(...issues);
 const category=id=>id>=33?extra[id-33][1]:[1,12,13,27,29,30].includes(id)?'HTML':[14,18,23,28,31].includes(id)?'CSS':[4,25,26].includes(id)?'Images':[8,9,32].includes(id)?'Links':[10,11,21,24].includes(id)?'Manual review':'Email quality';
 result.issues=result.issues.map((i,index)=>({...i,id:'finding-'+index,category:i.category||category(i.rule),severity:i.severity||(i.rule===32?'critical':i.status==='error'?'high':i.status==='review'?'medium':'low'),method:i.method||(i.outputLine?'static':'manual'),safeFix:i.safeFix??!!i.suggestedAfter,reviewDecision:null}));
 result.checks=rules.map((title,index)=>{const items=result.issues.filter(i=>i.rule===index+1);return {rule:index+1,title,category:category(index+1),status:items.some(i=>i.status==='error')?'error':items.some(i=>i.status==='review')?'review':items.some(i=>i.status==='fixed')?'fixed':items.some(i=>i.status==='na')?'na':'pass',items};});
 result.coverage={ruleCount:rules.length,documentMode:full?'full':'fragment',runtimeCSSValidation:typeof CSS!=='undefined'&&!!CSS.supports,remoteURLsChecked:false,realEmailClientsChecked:false,designCompared:false};result.runAt=new Date().toISOString();return result;
}
function run(source,options={}){
 if(!options.fix)return runOnce(source,options);
 const preflight=runOnce(source,{...options,fix:false});if(preflight.issues.some(i=>(i.rule===64&&/unclosed quote/.test(i.message))||(i.rule===41&&/unmatched delimiters/.test(i.message))||(i.rule===63&&/not closed/.test(i.message)))){preflight.coverage.fixSuppressed=true;preflight.coverage.reason='Repair malformed quotes, CSS delimiters or comments before automatic fixes.';return preflight;}
 let current=String(source),history=[],last;
 for(let pass=0;pass<4;pass++){
  last=runOnce(current,options);
  history.push(...last.issues.filter(i=>i.status==='fixed').map(i=>({...i,inputLine:pass?null:i.inputLine})));
  if(last.html===current)break;current=last.html;
 }
 const verified=runOnce(current,{...options,fix:false});
 // Revalidate the final output so a repaired issue is not still reported as open.
 const seen=new Set();history=history.filter(i=>{const key=[i.rule,i.outputLine,i.before,i.after].join('|');if(seen.has(key))return false;seen.add(key);return true;});
 verified.issues=[...history,...verified.issues].map((i,n)=>({...i,id:'finding-'+n,inputLine:i.status==='fixed'?i.inputLine:null}));
 const originals=new Map(),counts=new Map();for(const t of EmailTool.tokenize(String(source).replace(/\r\n?/g,'\n'))){const key=t.type+':'+(t.name||'');if(!originals.has(key))originals.set(key,[]);originals.get(key).push(t);}
 const mapping=EmailTool.tokenize(current).map(t=>{const key=t.type+':'+(t.name||''),n=counts.get(key)||0;counts.set(key,n+1);return {t,old:originals.get(key)?.[n]};});
 for(const i of verified.issues.filter(i=>i.status!=='fixed'&&i.outputLine)){
  const match=mapping.find(({t})=>['open','self','raw'].includes(t.type)&&t.srcLine<=i.outputLine&&t.srcLine+(t.value.match(/\n/g)||[]).length>=i.outputLine);
  if(match?.old)i.inputLine=match.old.srcLine+(i.outputLine-match.t.srcLine);
 }
 verified.checks=verified.checks.map(c=>{const items=verified.issues.filter(i=>i.rule===c.rule);return {...c,items,status:items.some(i=>i.status==='error')?'error':items.some(i=>i.status==='review')?'review':items.some(i=>i.status==='fixed')?'fixed':items.some(i=>i.status==='na')?'na':'pass'};});
 verified.coverage.outputRevalidated=true;return verified;
}
return {run,rules};
});
