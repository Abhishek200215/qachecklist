/* Screenshot checklist: source-preserving checks, conservative fixes, explicit manual review. */
(function(root, factory) {
  if(typeof module === 'object' && module.exports) module.exports = factory;
  else root.QAChecklist = factory(root.EmailTool);
})(typeof window !== 'undefined' ? window : globalThis, function(EmailTool) {
  'use strict';
  const rules = [
    'Layout table attributes', 'Consistent naming and duplicate class tokens',
    'Code cleanliness: comments, whitespace and redundant code', 'Image alt attributes',
    'Remove title attributes from images and links', 'New lines and indentation (Mapp)',
    'Client name in document title', 'Whitespace in image and CTA URLs',
    'Link format, target and redirection', 'All requirements and amendments applied',
    'Implementation matches intended requirements', 'Anchor closing tags',
    'Explicit tbody tags', 'Duplicate CSS properties in td', 'Footer text colour',
    'Date format consistency', 'Paragraph spacing rows',
    '520px / 480px media query class consistency', 'VML / Gmail / HTML button widths',
    'Separate desktop and mobile blocks', 'Suspected Figma typos confirmed',
    'Classes without CSS definitions', 'Class naming case consistency',
    'Latest Figma and client comments cross-check', 'Non-ASCII characters in image paths',
    'Exported images match the design', 'HTML attribute name casing',
    'Background CSS spelling and colour declarations', 'Duplicate HTML attributes',
    'Duplicate element IDs', 'Invalid CSS colour values', 'Unsafe link protocols'
  ];
  const esc = s => String(s).replace(/&(?!(?:#\d+|#x[\da-f]+|[a-z][\w]+);)/gi,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
  function run(source, options={}) {
    source=String(source).replace(/\r\n?/g,'\n');
    const tokens=EmailTool.tokenize(source), issues=[], edits=[];
    let offset=0;
    tokens.forEach(t=>{t.start=offset;offset+=t.value.length;t.end=offset;t.tag=/^(open|self)$/.test(t.type)?EmailTool.parseTag(t.value):null;});
    const attr=(t,n)=>t.tag?.attrs.find(a=>a.name.toLowerCase()===n);
    const val=(t,n)=>attr(t,n)?.value ?? '';
    const add=(rule,t,message,detail,status='review',patch=null)=>{
      const issue={rule,title:rules[rule-1],status:patch&&options.fix?'fixed':status,message,detail,inputLine:t?.srcLine||null,outputLine:null,before:patch?.before??t?.value??'',after:patch&&options.fix?patch.after:null,suggestedAfter:patch?.after??null,offset:t?.start??null,lineDelta:t?.lineDelta||0};
      issues.push(issue);return issue;
    };
    // Only replace attributes in their own opening tag; never serialize the whole document.
    const change=(t,n,v,rule,message)=>{
      const before=t.changed??t.value;
      const replacement=v===null?'':n+'="'+esc(v)+'"';
      const start=before.match(/^<\s*[\w:.-]+/)[0].length;
      const attrRe=/([^\s=\/>"']+)(\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'`=<>]+))?/g;
      attrRe.lastIndex=start;let match, found=null;
      while((match=attrRe.exec(before))){if(match[1].toLowerCase()===n){found=match;break;}}
      let after=found?before.slice(0,found.index)+replacement+before.slice(found.index+found[0].length):before.replace(/\s*\/?>$/,m=>' '+replacement+m);
      add(rule,t,message,v===null?'Remove the attribute.':'Set '+n+'="'+v+'".', 'error',{before,after});
      if(options.fix)t.changed=after;
    };
    const cssTokens=tokens.filter(t=>t.type==='raw'&&t.name==='style');
    const css=cssTokens.map(t=>t.value).join('\n');
    const classes=new Set();
    function walk(nodes, cb){for(const n of nodes||[]){cb(n); if(n.children)walk(n.children,cb);}}
    // Parse selectors only: class-like strings in declaration URLs are not definitions.
    const cssTrees=cssTokens.map(t=>EmailTool.parseCss(t.value));
    cssTrees.forEach(tree=>walk(tree,n=>{if(n.selector)for(const m of n.selector.matchAll(/\.([a-zA-Z_][\w-]*)/g))classes.add(m[1]);}));
    function replaceToken(t,after,rule,message,detail){
      const before=t.changed??t.value;
      if(before===after)return;
      add(rule,t,message,detail,'error',{before,after});if(options.fix)t.changed=after;
    }
    const colorNames=new Set('transparent currentcolor black white red green blue yellow cyan magenta gray grey silver maroon olive lime aqua teal navy fuchsia purple orange pink brown rebeccapurple aliceblue antiquewhite beige coral crimson darkblue darkgray darkgrey darkgreen darkred gold goldenrod indigo ivory khaki lavender lightblue lightgray lightgrey lightgreen linen orchid plum salmon seagreen skyblue snow tan tomato violet whitesmoke yellowgreen'.split(' '));
    const pureColor=v=>/^#(?:[a-f0-9]{3}|[a-f0-9]{4}|[a-f0-9]{6}|[a-f0-9]{8})$/i.test(v)||colorNames.has(v.toLowerCase())||(/^(?:rgb|hsl)a?\([^;{}]+\)$/i.test(v)&& (typeof CSS==='undefined'||CSS.supports('color',v)))||(typeof CSS!=='undefined'&&CSS.supports('color',v)&&!/[;{}]/.test(v));
    function fixCSS(css,t){
      // A lexical scanner shields comments, strings and url() values from edits.
      let result='',start=0,quote='',depth=0,comment=false;
      const owner=t;
      const transform=chunk=>{ const leading=(chunk.match(/^\s*/)||[''])[0]; const delta=owner.type==='raw'?(css.slice(0,start)+leading).split('\n').length-1:0;t={...owner,srcLine:owner.srcLine+delta,lineDelta:delta};return chunk.replace(/^(\s*)([a-z-]+)(\s*:\s*)([\s\S]*)$/i,(all,space,prop,colon,value)=>{
        const lower=prop.toLowerCase();
        if(!['background','backgorund','background-color','backgorund-color','color','border-color'].includes(lower))return all;
        const important=/\s*!important\s*$/i.exec(value);let color=(important?value.slice(0,important.index):value).trim();
        const trailingColon=color.endsWith(':');if(trailingColon)color=color.slice(0,-1).trim();
        if(/^#[\w]+$/.test(color)&&!pureColor(color))add(31,t,'Invalid CSS colour: '+color+'.','Use a valid colour value; the intended colour cannot be guessed.','error');
        if(lower.startsWith('backgorund')||lower.startsWith('background')){
          if(pureColor(color)){
            const next=space+'background-color'+colon+color+(important?' !important':'');
            if(lower!=='background-color'||trailingColon)add(28,t,'Normalize '+prop+' colour declaration.','Use background-color: '+color+'; (colour-only background).','error',{before:all,after:next+';'});
            return options.fix?next:all;
          }
          if(lower.startsWith('backgorund'))add(28,t,'Misspelled background property with a complex value.','Check layers/URLs before changing to background or background-color.','error');
        }else if(trailingColon)add(31,t,'Unexpected colon after a colour value.','Replace the trailing colon with a declaration separator.','error');
        return all;
      });};
      for(let i=0;i<css.length;i++){
        const c=css[i],n=css[i+1];
        if(comment){if(c==='*'&&n==='/'){comment=false;i++;result+=css.slice(start,i+1);start=i+1;}continue;}
        if(quote){if(c==='\\')i++;else if(c===quote)quote='';continue;}
        if(c==='/'&&n==='*'){result+=css.slice(start,i);start=i;comment=true;i++;continue;}
        if(c==='"'||c==="'"){quote=c;continue;}
        if(c==='(')depth++;if(c===')')depth=Math.max(0,depth-1);
        if(!depth&&';{}'.includes(c)){
          result+=(c==='{'?css.slice(start,i):transform(css.slice(start,i)))+c;start=i+1;
        }
      }
      const tail=transform(css.slice(start));result+=tail;
      // A final inline declaration is valid without a semicolon; make corrected styles explicit.
      if(options.fix&&result!==css&&!/[;}\s]$/.test(result))result+=';';
      return result;
    }
    const ids=new Map();let foreignDepth=0;
    for(const t of tokens){
      if(['svg','math'].includes(t.name)&&t.type==='open')foreignDepth++;
      if(t.tag&&!foreignDepth&&!t.name.includes(':')){
        const raw=t.changed??t.value,start=raw.match(/^<\s*[\w:.-]+/)[0].length;
        const attrs=/([^\s=\/>"']+)(\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'`=<>]+))?/g;attrs.lastIndex=start;
        let m,lastPos=0,next='',changed=false;const seen=new Set();
        while((m=attrs.exec(raw))){
          const name=m[1],lower=name.toLowerCase();
          if(seen.has(lower))add(29,t,'Duplicate attribute: '+name+'.','Keep one approved value. Browsers may ignore later duplicates.','error');seen.add(lower);
          next+=raw.slice(lastPos,m.index)+lower+(m[2]||'');lastPos=m.index+m[0].length;
          if(name!==lower)changed=true;
        }
        next+=raw.slice(lastPos);
        if(changed)replaceToken(t,next,27,'Mixed-case HTML attribute names.','Normalize attribute names to lowercase, for example Bgcolor / bgColor → bgcolor. Attribute values are preserved.');
      }
      if(['svg','math'].includes(t.name)&&t.type==='close')foreignDepth=Math.max(0,foreignDepth-1);
      if(t.type==='raw'&&t.name==='style'){const after=fixCSS(t.value,t);if(options.fix)t.changed=after;}
      if(t.tag){
        if(attr(t,'style')){
          const old=val(t,'style'),after=fixCSS(old,t);
          if(options.fix&&old!==after){
            // Reuse the attribute writer, but the individual CSS fixes already supply the report.
            const count=issues.length;change(t,'style',after,28,'Normalize background declarations.');issues.splice(count);
            // Subsequent style checks must see the updated declaration to avoid overwriting it.
            attr(t,'style').value=after;
          }
        }
        const id=val(t,'id');if(id){if(ids.has(id))add(30,t,'Duplicate ID "'+id+'" (first on line '+ids.get(id)+').','Use unique IDs and update all fragment/CSS references together.','error');else ids.set(id,t.srcLine);}
        if(t.name==='a'&&/^\s*(?:javascript|vbscript|data)\s*:/i.test(val(t,'href')))add(32,t,'Unsafe or unsupported link protocol.','Replace with the approved HTTPS, mailto or tel destination.','error');
      }
    }
    const seenCase=new Map(), anchors=[];
    for(const t of tokens){
      if(t.type==='comment')add(3,t,'Review ordinary comment.','Keep at most one useful block label; do not remove CMS directives. Outlook conditionals are preserved.');
      if(t.type==='text'&&/\S[ \t]{2,}\S/.test(t.value))add(3,t,'Repeated spaces in text.','Review before editing; whitespace may be intentional.');
      if(t.type==='close'&&t.name==='a'){
        if(!anchors.length)add(12,t,'Closing </a> has no opening anchor.','Repair the structure manually.','error');else anchors.pop();
      }
      if(t.name==='tbody'&&/^(open|close)$/.test(t.type))add(13,t,'Explicit tbody tag found.','Remove only after checking CSS selectors and CMS requirements; browsers may insert tbody automatically.');
      if(!t.tag)continue;
      if(t.name==='table'){
        const role=val(t,'role').toLowerCase();
        let depth=0, data=false;
        for(let k=tokens.indexOf(t);k<tokens.length;k++){const x=tokens[k];if(x.name==='table'&&x.type==='open')depth++;if(x.name==='th'||x.name==='caption'||(x.tag&&attr(x,'scope')))data=true;if(x.name==='table'&&x.type==='close'&&--depth===0)break;}
        if(!role&&options.layout&&!data)change(t,'role','presentation',1,'Mark confirmed email layout table as presentation.');
        if(role==='presentation'||role==='none'||(!role&&options.layout&&!data)){
          for(const n of ['border','cellspacing','cellpadding'])if(val(t,n)!=='0')change(t,n,'0',1,'Layout table needs '+n+'="0".');
        }else add(1,t,'Confirm whether this is a layout table.','Layout tables require role="presentation", border="0", cellspacing="0" and cellpadding="0". Data tables must retain their semantics.');
      }
      if(t.name==='img'){
        if(attr(t,'alt')&&val(t,'alt')&&(/spacer|transparent|blank\.(?:gif|png)/i.test(val(t,'src'))||val(t,'role')==='presentation'))add(4,t,'Decorative image has non-empty alt.','Confirm decorative intent, then set alt="". Existing alternative text is preserved.');
        if(!attr(t,'alt')){
          const decorative=/spacer|transparent|blank\.(?:gif|png)/i.test(val(t,'src'))||val(t,'role')==='presentation'||val(t,'aria-hidden')==='true';
          if(decorative)change(t,'alt','',4,'Decorative image is missing empty alt.');
          else add(4,t,'Image is missing alt.','Supply meaningful alternative text, or confirm it is decorative and use alt="".','error');
        }
        if(/[^\x00-\x7f]/.test(val(t,'src')))add(25,t,'Non-ASCII characters in image path.','Use an ASCII filename and update the hosted asset. Renaming this URL alone may break the image.','error');
      }
      if(['img','a'].includes(t.name)&&attr(t,'title'))change(t,'title',null,5,'Checklist disallows title on image / anchor.');
      for(const n of ['href','src'])if(attr(t,n)){
        const url=val(t,n);
        if(url!==url.trim())change(t,n,url.trim(),8,'Remove leading / trailing URL whitespace.');
        if(/\s/.test(url.trim()))add(8,t,'Whitespace inside URL.','Correct against the intended destination; internal spaces are not deleted automatically.','error');
      }
      if(t.name==='a'){
        if(anchors.length)add(12,t,'Nested anchor detected.','Close the previous anchor before opening another.','error');
        anchors.push(t);
        const href=val(t,'href').trim();
        if(!href)add(9,t,'Missing or empty link URL.','Enter the approved destination.','error');
        else if(/^(https?:\/\/)/i.test(href)){
          try{new URL(href);}catch(e){add(9,t,'Malformed absolute URL.','Correct the destination.','error');}
          if(val(t,'target')!=='_blank')change(t,'target','_blank',9,'Web link needs target="_blank".');
          if(/^http:/i.test(href))add(9,t,'Non-HTTPS web link.','Confirm HTTPS support before changing the protocol.');
        }else if(!/^(mailto:|tel:|#)/i.test(href))add(9,t,'Relative, templated or unsupported URL.','Resolve CMS variables and verify the final absolute URL.','review');
      }
      if(attr(t,'class')){
        const names=val(t,'class').trim().split(/\s+/).filter(Boolean), unique=[...new Set(names)];
        if(names.length!==unique.length)change(t,'class',unique.join(' '),2,'Duplicate class tokens in this attribute.');
        for(const name of unique){
          const prior=seenCase.get(name.toLowerCase());
          if(prior&&prior!==name)add(23,t,'Class case varies: '+prior+' / '+name+'.','Review selectors and references together before renaming.');
          else seenCase.set(name.toLowerCase(),name);
          if(!classes.has(name))add(22,t,'No embedded CSS definition for .'+name+'.','May be a CMS, external stylesheet or email-client hook. Verify before removing.');
          if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name))add(2,t,'Review class naming: '+name+'.','Use a consistent convention such as p10-10-10-10 or m20-x-x-x; do not rename isolated references.');
        }
      }
      if(t.name==='td'&&attr(t,'style')){
        // Exact repeated declarations are safe; different values may be intentional fallbacks.
        const style=val(t,'style');
        if(!/[()'"]/.test(style)){
          const parts=style.split(';').map(s=>s.trim()).filter(Boolean), seen=new Map(), kept=[];let duplicates=false;
          for(const p of parts){const colon=p.indexOf(':');if(colon<0){kept.push(p);continue;}
            const key=p.slice(0,colon).trim().toLowerCase(), value=p.slice(colon+1).trim();
            if(seen.get(key)===value){duplicates=true;continue;}
            if(seen.has(key))add(14,t,'Repeated CSS property with different values: '+key+'.','Could be a fallback or override; choose the intended value manually.');
            seen.set(key,value);kept.push(p);
          }
          if(duplicates)change(t,'style',kept.join(';')+';',14,'Remove identical duplicate CSS declarations.');
        }else if(/(?:^|;)\s*([\w-]+)\s*:[\s\S]*;\s*\1\s*:/i.test(style))add(14,t,'Possible duplicate CSS declarations.','Complex style values need manual review to preserve CSS fallbacks.');
        if(/padding(?:-top|-bottom)?\s*:/i.test(style))add(17,t,'Cell padding may be used for paragraph spacing.','For paragraph gaps use a dedicated row: <tr><td valign="top" align="center" style="font-size:1px;line-height:1px;" height="10"></td></tr>. Confirm intent first.');
      }
      if(t.name==='br')add(17,t,'Review br used for spacing.','Keep intentional text line breaks. Replace paragraph spacer breaks with a dedicated height row.');
      if(/desktop|mobile/i.test(val(t,'class')+' '+val(t,'id')))add(20,t,'Potential separate desktop / mobile content.','Retain only when rendering or functionality requires separate blocks.');
      if(t.name==='v:roundrect'||(t.name==='a'&&/width\s*:/.test(val(t,'style'))))add(19,t,'Button width candidate.','Compare the same CTA across branches: Gmail W px, VML W + 20 px, HTML W - 4 px for 2px borders. '+(options.buttonWidth?'Configured W = '+options.buttonWidth+'px; expected '+(+options.buttonWidth+20)+' / '+options.buttonWidth+' / '+(+options.buttonWidth-4)+'px.':'Enter the approved button width above.')+' Do not apply one width to unrelated buttons.');
    }
    anchors.forEach(t=>add(12,t,'Anchor has no closing </a>.','Insert the closing tag at the intended text boundary.','error'));
    const title=tokens.find(t=>t.type==='open'&&t.name==='title');
    if(options.client?.trim()){
      const client=options.client.trim();
      if(title){
        const idx=tokens.indexOf(title), body=tokens[idx+1], close=tokens[idx+2];
        if(body?.type==='text'&&close?.name==='title'&&close.type==='close'){
          if(!body.value.toLowerCase().includes(client.toLowerCase())){
            const after=esc(client);add(7,body,'Title does not contain the configured client name.','Replace title with '+client+'.','error',{before:body.value,after});if(options.fix)body.changed=after;
          }
        }else add(7,title,'Empty or complex title.','Set the title to the approved client name.','error');
      }else{
        const head=tokens.find(t=>t.type==='open'&&t.name==='head');
        if(head){const before=head.changed??head.value,after=before+'\n<title>'+esc(client)+'</title>';add(7,head,'Client title is missing.','Insert the configured client name.','error',{before,after});if(options.fix)head.changed=after;}
        else add(7,null,'No head / title in this fragment.','Add a document head and the approved client title.','error');
      }
    }else add(7,title,'Client name is not configured.','Enter the present client name and rerun.');
    const media={520:new Set(),480:new Set()};
    cssTrees.forEach(tree=>walk(tree,n=>{
      for(const width of [520,480])if(n.prelude&&new RegExp('max-width\\s*:\\s*'+width+'px','i').test(n.prelude))walk(n.children,c=>{for(const m of (c.selector||'').matchAll(/\.([\w-]+)/g))media[width].add(m[1]);});
    }));
    for(const name of media[520])if(!media[480].has(name))add(18,cssTokens[0],'520px class .'+name+' is absent from 480px rules.','Check whether inherited 520px styles are sufficient or the difference is intentional. Do not blindly duplicate media rules.');
    if(!media[520].size&&!media[480].size)add(18,null,'No matching 520px / 480px class rules found.','Confirm whether these breakpoints are required for this template.');
    add(6,null,'Review tag-per-line formatting and Mapp conventions.','Use the existing Format & check tab for indentation. Inline tags are preserved to avoid changing rendered text spacing; verify project-specific Mapp rules.');
    add(3,null,'Unused or redundant code needs context.','Check CSS fallbacks, conditional branches, CMS hooks and one comment per logical block. Static checks cannot prove all code is unnecessary.');
    add(9,null,'Redirects and live destinations are not tested offline.','Open final campaign URLs and verify redirects, tracking and destination content.');
    for(const [id,detail] of [[10,'Compare against the full approved requirements and amendment list.'],[11,'Confirm the solution meets the intended requirements; clarify any uncertainty with the owner.'],[21,'Confirm suspected design typos with the design owner.'],[24,'Compare the final HTML with the latest Figma version and all client comments.'],[26,'Visually compare exported images with Figma: no unwanted white borders, cropping or alignment issues.']])add(id,null,'Manual sign-off required.',detail);
    const footer=tokens.filter(t=>t.tag&&/footer/i.test(val(t,'id')+' '+val(t,'class')));
    add(15,footer[0],'Verify footer text colour against the approved design.','Check inherited colours, nested elements and conditional branches. No brand-specific colour is assumed.');
    const dates=tokens.filter(t=>t.type==='text'&&/\b(?:\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4}|\d{4}-\d{2}-\d{2})\b/.test(t.value));
    if(dates.length)dates.forEach(t=>add(16,t,'Date candidate: '+t.value.trim().slice(0,100),'Use one approved date format across sections; preserve the actual date.'));
    else add(16,null,'Verify date format across all sections.','Written month names and dynamic dates require review.');
    let html='',outLine=1;
    for(const t of tokens){for(const i of issues)if(i.offset===t.start)i.outputLine=outLine+(i.lineDelta||0);const text=t.changed??t.value;html+=text;outLine+=(text.match(/\n/g)||[]).length;}
    const checks=rules.map((title,index)=>{const items=issues.filter(i=>i.rule===index+1);return {rule:index+1,title,status:items.some(i=>i.status==='error')?'error':items.some(i=>i.status==='review')?'review':items.some(i=>i.status==='fixed')?'fixed':items.some(i=>i.status==='na')?'na':'pass',items};});
    return {html,issues,checks};
  }
  return {run,rules};
});
