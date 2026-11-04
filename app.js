let T=[],cat="All",sort="stars";const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const toolName=t=>t.repo.split("/").pop();
let openTool=null;
const validDomain=s=>/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(s);
const validEmail=s=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const validUrl=s=>/^https?:\/\/\S+$/i.test(s);
const validPhone=s=>/^\+[1-9]\d{7,14}$/.test(s.replace(/[\s().-]/g,""));
const validHost=s=>validUrl(s)||validDomain(s)||(/^(?:\d{1,3}\.){3}\d{1,3}$/.test(s)&&s.split(".").every(n=>+n<=255));
const validOnion=s=>/^(?:[a-z2-7]{16}|[a-z2-7]{56})\.onion$/i.test(s.replace(/^https?:\/\//i,"").replace(/\/.*$/,""))||/\.onion$/i.test(s);
function normPhone(s){return s.replace(/[\s().-]/g,"")}
function checkValue(type,value){
  if(type==="domain")return validDomain(value)?"":"Enter a domain like example.com.";
  if(type==="email")return validEmail(value)?"":"Enter a valid email address.";
  if(type==="emails"){const parts=value.split(/[\s,]+/).filter(Boolean);return parts.length&&parts.every(validEmail)?"":"Enter one or more email addresses.";}
  if(type==="phone")return validPhone(value)?"":"Enter a phone number in E.164, like +14155552671.";
  if(type==="digits")return /^\d{1,15}$/.test(value)?"":"Use digits only.";
  if(type==="url")return validUrl(value)?"":"Enter a URL starting with http:// or https://.";
  if(type==="host")return validHost(value)?"":"Enter a domain, IP, or http(s) URL.";
  if(type==="usernames"){const parts=value.split(/[\s,]+/).filter(Boolean);return parts.length&&parts.every(p=>/^[\w.@{}?-]{1,80}$/.test(p))?"":"Enter one or more usernames.";}
  if(type==="number")return /^\d+$/.test(value)?"":"Enter a whole number.";
  if(type==="onion")return validOnion(value)?"":"Enter an onion address.";
  return "";
}
function runMailto(name,primary,lines){
  const subject=`RUN ${name}: ${primary}`;
  const body=`${lines.join("\n")}\n\nSent from OSINT app`;
  const to="mustafaalqaderi-q3spbm+run@mail.grokbot.com".replace(/\+/g,"%2B");
  return {subject,body,href:`mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`};
}
function shownInputs(tool,values){
  return (tool.inputs||[]).filter(inp=>!inp.when||Object.entries(inp.when).every(([k,ok])=>ok.includes(values[k])));
}
function fieldType(inp,values){
  const map=inp.validateWhen;
  if(!map)return inp.type;
  for(const [k,table] of Object.entries(map))if(table[values[k]])return table[values[k]];
  return inp.type;
}
function collectRun(tool,form){
  const values={};
  for(const inp of tool.inputs||[]){
    if(inp.type==="bool"){const el=form.querySelector(`[data-key="${inp.key}"]`);values[inp.key]=el&&el.checked?"yes":"";}
    else if(inp.type==="file"){const el=form.querySelector(`[data-key="${inp.key}"]`);const url=form.querySelector(`[data-alt="${inp.key}"]`);values[inp.key]=el&&el.files&&el.files[0]?el.files[0]:null;values[inp.key+"_url"]=url?url.value.trim():"";}
    else {const el=form.querySelector(`[data-key="${inp.key}"]`);values[inp.key]=el?el.value.trim():"";}
  }
  const inputs=shownInputs(tool,values);
  const errors={};
  const groups={};
  for(const inp of inputs)if(inp.oneOf)(groups[inp.oneOf]||(groups[inp.oneOf]=[])).push(inp);
  const filled=inp=>{
    if(inp.type==="file")return !!(values[inp.key]||values[inp.key+"_url"]);
    if(inp.type==="bool")return values[inp.key]==="yes";
    return !!values[inp.key];
  };
  for(const members of Object.values(groups))if(!members.some(filled))errors[members[0].key]="Fill in at least one of these.";
  for(const inp of inputs){
    if(inp.type==="file"){
      const url=values[inp.key+"_url"];
      if(url&&!validUrl(url))errors[inp.key+"_url"]="Enter a URL starting with http:// or https://.";
      if(inp.required&&!values[inp.key]&&!url)errors[inp.key]="Choose a file or enter a file URL.";
      continue;
    }
    const value=values[inp.key];
    if(inp.type==="bool")continue;
    if(inp.required&&!value&&!inp.oneOf)errors[inp.key]="This field is required.";
    else if(value){const msg=checkValue(fieldType(inp,values),value);if(msg)errors[inp.key]=msg;}
  }
  const lines=[];
  const primary=[];
  let file=null;
  for(const inp of inputs){
    if(errors[inp.key]||errors[inp.key+"_url"])continue;
    if(inp.type==="file"){
      const picked=values[inp.key];
      const url=values[inp.key+"_url"];
      if(picked){file=picked;lines.push(`attachment: ${picked.name}`);if(inp.primary)primary.push(picked.name);}
      if(url){lines.push(`${inp.key}_url: ${url}`);if(inp.primary&&!picked)primary.push(url);}
      continue;
    }
    const value=inp.type==="phone"?normPhone(values[inp.key]):values[inp.key];
    if(!value)continue;
    lines.push(`${inp.key}: ${value}`);
    if(inp.primary)primary.push(value);
  }
  const main=primary.filter(Boolean).join(" ")||lines.map(l=>l.split(": ").slice(1).join(": ")).find(Boolean)||"defaults";
  const mail=runMailto(toolName(tool),main,lines);
  return {ok:!Object.keys(errors).length,errors,file,lines,...mail};
}
function runField(inp){
  const star=inp.required?' <span class="req">*</span>':"";
  const flag=inp.flag?` <span class="flag">${esc(inp.flag)}</span>`:"";
  const help=inp.help?`<p class="run-help">${esc(inp.help)}</p>`:"";
  const err=`<p class="run-err" data-err="${esc(inp.key)}" hidden></p>`;
  if(inp.type==="bool")return `<div class="run-field" data-field="${esc(inp.key)}"><label class="run-check"><input type="checkbox" data-key="${esc(inp.key)}">${esc(inp.label)}${flag}</label>${help}${err}</div>`;
  if(inp.type==="select"){
    const opts=(inp.options||[]).map(o=>`<option value="${esc(o)}">${esc(o)}</option>`).join("");
    return `<div class="run-field" data-field="${esc(inp.key)}"><label class="run-label" for="run-${esc(inp.key)}">${esc(inp.label)}${star}${flag}</label>${help}<select id="run-${esc(inp.key)}" data-key="${esc(inp.key)}"><option value="">choose…</option>${opts}</select>${err}</div>`;
  }
  if(inp.type==="file"){
    const accept=inp.accept?` accept="${esc(inp.accept)}"`:"";
    return `<div class="run-field" data-field="${esc(inp.key)}"><label class="run-label" for="run-${esc(inp.key)}">${esc(inp.label)}${star}${flag}</label>${help}<input id="run-${esc(inp.key)}" data-key="${esc(inp.key)}" type="file"${accept}><label class="run-label" for="run-${esc(inp.key)}-url">File URL</label><input id="run-${esc(inp.key)}-url" data-alt="${esc(inp.key)}" data-key="${esc(inp.key)}_url" type="url" inputmode="url" placeholder="https://…" autocomplete="off"><p class="run-err" data-err="${esc(inp.key)}_url" hidden></p>${err}</div>`;
  }
  const mode=inp.type==="email"||inp.type==="emails"?"email":inp.type==="phone"?"tel":inp.type==="url"?"url":inp.type==="number"?"numeric":"text";
  return `<div class="run-field" data-field="${esc(inp.key)}"><label class="run-label" for="run-${esc(inp.key)}">${esc(inp.label)}${star}${flag}</label>${help}<input id="run-${esc(inp.key)}" data-key="${esc(inp.key)}" type="text" inputmode="${mode}" placeholder="${esc(inp.placeholder||"")}" autocomplete="off" enterkeyhint="send">${err}</div>`;
}
function runBlock(t){
  if(!t.inputs||!t.inputs.length)return "";
  return `<form class="run-form" data-tool="${esc(toolName(t))}">${t.inputs.map(runField).join("")}<p class="run-attach" hidden></p><button type="submit" class="btn run-go">Run via Osint</button><button type="button" class="btn run-share" hidden>Share to email</button><p class="run-note">Results come back to your email and Grok Bot chat.</p></form>`;
}
function syncRunForm(form){
  if(!openTool)return;
  const values={};
  for(const inp of openTool.inputs||[]){const el=form.querySelector(`[data-key="${inp.key}"]`);values[inp.key]=el?el.value:"";}
  for(const inp of openTool.inputs||[]){
    const wrap=form.querySelector(`[data-field="${inp.key}"]`);
    if(!wrap)continue;
    wrap.hidden=!!(inp.when&&!Object.entries(inp.when).every(([k,ok])=>ok.includes(values[k])));
  }
}
function showRunErrors(form,errors){
  form.querySelectorAll(".run-err").forEach(p=>{p.hidden=true;p.textContent="";});
  form.querySelectorAll(".bad").forEach(el=>el.classList.remove("bad"));
  let first=null;
  for(const [key,msg] of Object.entries(errors)){
    const p=form.querySelector(`[data-err="${key}"]`);
    const input=form.querySelector(`[data-key="${key}"]`);
    if(p){p.hidden=false;p.textContent=msg;}
    if(input)input.classList.add("bad");
    if(!first)first=input;
  }
  if(first)first.focus();
}
function refreshShare(form){
  const fileInput=form.querySelector('input[type="file"]');
  const file=fileInput&&fileInput.files&&fileInput.files[0];
  const share=form.querySelector(".run-share");
  const note=form.querySelector(".run-attach");
  if(!file){if(share)share.hidden=true;return;}
  note.hidden=false;
  note.textContent=`Attach ${file.name} to the email before sending.`;
  let ok=false;
  try{ok=!!(navigator.canShare&&navigator.canShare({files:[file]}));}catch{ok=false;}
  if(share)share.hidden=!ok;
}
fetch("data.json").then(r=>r.json()).then(d=>{T=d.tools;$("#meta").textContent=`${T.length} repos · GitHub data as of ${d.fetched}`;
const cats=["All",...new Set(T.map(t=>t.category))];
$("#chips").innerHTML=cats.map(c=>`<button class="chip${c==="All"?" on":""}" data-c="${esc(c)}">${esc(c)}</button>`).join("");render()});
$("#chips").onclick=e=>{const b=e.target.closest(".chip");if(!b)return;cat=b.dataset.c;document.querySelectorAll(".chip").forEach(x=>x.classList.toggle("on",x===b));render()};
document.querySelector(".sort").onclick=e=>{const b=e.target.closest("button");if(!b)return;sort=b.dataset.s;document.querySelectorAll(".sort button").forEach(x=>x.classList.toggle("on",x===b));render()};
$("#q").oninput=render;
function render(){const q=$("#q").value.toLowerCase();
const L=T.filter(t=>(cat==="All"||t.category===cat)&&(t.repo+t.purpose+(t.description||"")+t.language+t.category).toLowerCase().includes(q))
.sort((a,b)=>sort==="stars"?b.stars-a.stars:sort==="recent"?b.updated.localeCompare(a.updated):a.repo.localeCompare(b.repo));
$("#list").innerHTML=L.map(t=>`<div class="card" data-r="${esc(t.repo)}"><h3>${esc(t.repo.split("/")[1])}</h3><p class="desc">${esc(t.description||t.purpose)}</p><div class="m"><span>★ ${t.stars.toLocaleString()}</span><span>${esc(t.language)}</span><span>${esc(t.updated)}</span>${t.archived?'<span class="arch">archived</span>':""}</div></div>`).join("")||'<p class="note">No matches.</p>'}
$("#list").onclick=e=>{const c=e.target.closest(".card");if(c)open(T.find(t=>t.repo===c.dataset.r))};
function blk(label,v){return v&&v!=="—"?`<div class="row"><span>${label}</span><button class="btn" data-copy="${esc(v)}">copy</button></div><pre>${esc(v)}</pre>`:""}
let sheetScrollY=0;
function lockPage(){sheetScrollY=window.scrollY||document.documentElement.scrollTop||0;document.body.style.top=`-${sheetScrollY}px`;document.body.classList.add("sheet-lock")}
function unlockPage(){document.body.classList.remove("sheet-lock");document.body.style.top="";window.scrollTo(0,sheetScrollY)}
function closeSheet(fromPop){const sheet=$("#sheet");if(!sheet||sheet.hidden)return;sheet.hidden=true;unlockPage();if(!fromPop&&history.state&&history.state.osintSheet)history.back()}
function open(t){openTool=t;const body=$(".sheet-body");body.innerHTML=`<h2>${esc(t.repo)}</h2><p>${esc(t.purpose)}</p><dl><dt>category</dt><dd>${esc(t.category)}</dd><dt>stars</dt><dd>${t.stars.toLocaleString()}</dd><dt>last push</dt><dd>${esc(t.updated)}${t.archived?' <span class="arch">(archived)</span>':""}</dd><dt>language</dt><dd>${esc(t.language)}</dd><dt>license</dt><dd>${esc(t.license||"none")}</dd></dl>${blk("install",t.install)}${blk("usage",t.usage)}${runBlock(t)}<a class="btn" href="https://github.com/${esc(t.repo)}" target="_blank" rel="noopener">open on GitHub ↗</a>`;body.scrollTop=0;const sheet=$("#sheet");const wasHidden=sheet.hidden;sheet.hidden=false;if(wasHidden){lockPage();history.pushState({osintSheet:1},"")}const form=$(".run-form");if(form)syncRunForm(form)}
$("#sheet").onclick=async e=>{if(e.target.closest(".sheet-x")||e.target.classList.contains("bd")||e.target.id==="sheet")return closeSheet();const b=e.target.closest("[data-copy]");if(!b)return;
try{await navigator.clipboard.writeText(b.dataset.copy)}catch{const x=document.createElement("textarea");x.value=b.dataset.copy;document.body.append(x);x.select();document.execCommand("copy");x.remove()}b.textContent="copied ✓";setTimeout(()=>b.textContent="copy",1200)};
$("#sheet").addEventListener("change",e=>{const form=e.target.closest(".run-form");if(!form)return;syncRunForm(form);if(e.target.type==="file")refreshShare(form);});
$("#sheet").addEventListener("click",async e=>{const b=e.target.closest(".run-share");if(!b)return;e.preventDefault();const form=b.closest("form");const built=collectRun(openTool,form);if(!built.ok)return showRunErrors(form,built.errors);try{await navigator.share({files:[built.file],title:built.subject,text:built.body})}catch(err){if(err&&err.name==="AbortError")return;const note=form.querySelector(".run-attach");note.hidden=false;note.textContent="Sharing failed. Use Run via Osint and attach the file yourself.";}});
$("#sheet").addEventListener("submit",e=>{const form=e.target.closest(".run-form");if(!form||!openTool)return;e.preventDefault();syncRunForm(form);const built=collectRun(openTool,form);if(!built.ok)return showRunErrors(form,built.errors);if(built.file){const note=form.querySelector(".run-attach");note.hidden=false;note.textContent=`Attach ${built.file.name} to the email before sending.`;}location.href=built.href});
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeSheet()});
window.addEventListener("popstate",()=>{if(!$("#sheet").hidden)closeSheet(true)});
(()=>{const panel=$(".panel");let y0=0,atTop=true,onBar=false;
panel.addEventListener("touchstart",e=>{if(!e.touches[0])return;y0=e.touches[0].clientY;const scroller=$(".sheet-body");atTop=!scroller||scroller.scrollTop<=0;onBar=!!e.target.closest(".sheet-bar")},{passive:true});
panel.addEventListener("touchend",e=>{const t=e.changedTouches&&e.changedTouches[0];if(!t||$("#sheet").hidden)return;if(e.target.closest("input,textarea,select,a"))return;if(t.clientY-y0>72&&(onBar||atTop))closeSheet()},{passive:true})})();
if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js");
