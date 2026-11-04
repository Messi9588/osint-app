let T=[],cat="All",sort="stars";const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const PH={"Usernames & people":"username","Email":"email","Phone":"phone","Domain & DNS":"domain","Social media":"username","Images & geolocation":"image URL","Metadata":"file URL","Dark web":"onion URL","Threat intel":"indicator","Frameworks & automation":"domain"};
const toolName=t=>t.repo.split("/").pop();
const isCurated=t=>/curated/i.test(t.category||"");
function runMailto(name,target,options){
  const subject=`RUN ${name}: ${target}`;
  const extra=String(options||"").trim();
  const body=extra?`${extra}\n\nSent from OSINT app`:"Sent from OSINT app";
  const to="mustafaalqaderi-q3spbm+run@mail.grokbot.com".replace(/\+/g,"%2B");
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
function runBlock(t){
  if(isCurated(t))return "";
  const ph=PH[t.category]||"target";
  const mode=ph==="email"?"email":ph==="phone"?"tel":/URL|domain|onion/.test(ph)?"url":"text";
  return `<form class="run-form" data-tool="${esc(toolName(t))}"><input class="run-target" type="text" required autocomplete="off" enterkeyhint="send" inputmode="${mode}" placeholder="${esc(ph)}" aria-label="${esc(ph)}"><input class="run-opts" type="text" autocomplete="off" placeholder="options (optional)" aria-label="options"><button type="submit" class="btn run-go">Run via Osint</button><p class="run-note">Results come back to your email and Grok Bot chat.</p></form>`;
}
fetch("data.json").then(r=>r.json()).then(d=>{T=d.tools;$("#meta").textContent=`${T.length} repos · GitHub data as of ${d.fetched}`;
const cats=["All",...new Set(T.map(t=>t.category))];
$("#chips").innerHTML=cats.map(c=>`<button class="chip${c==="All"?" on":""}" data-c="${esc(c)}">${esc(c)}</button>`).join("");render()});
$("#chips").onclick=e=>{const b=e.target.closest(".chip");if(!b)return;cat=b.dataset.c;document.querySelectorAll(".chip").forEach(x=>x.classList.toggle("on",x===b));render()};
document.querySelector(".sort").onclick=e=>{const b=e.target.closest("button");if(!b)return;sort=b.dataset.s;document.querySelectorAll(".sort button").forEach(x=>x.classList.toggle("on",x===b));render()};
$("#q").oninput=render;
function render(){const q=$("#q").value.toLowerCase();
const L=T.filter(t=>(cat==="All"||t.category===cat)&&(t.repo+t.purpose+t.language+t.category).toLowerCase().includes(q))
.sort((a,b)=>sort==="stars"?b.stars-a.stars:sort==="recent"?b.updated.localeCompare(a.updated):a.repo.localeCompare(b.repo));
$("#list").innerHTML=L.map(t=>`<div class="card" data-r="${esc(t.repo)}"><h3>${esc(t.repo.split("/")[1])}</h3><p>${esc(t.purpose)}</p><div class="m"><span>★ ${t.stars.toLocaleString()}</span><span>${esc(t.language)}</span><span>${esc(t.updated)}</span>${t.archived?'<span class="arch">archived</span>':""}</div></div>`).join("")||'<p class="note">No matches.</p>'}
$("#list").onclick=e=>{const c=e.target.closest(".card");if(c)open(T.find(t=>t.repo===c.dataset.r))};
function blk(label,v){return v&&v!=="—"?`<div class="row"><span>${label}</span><button class="btn" data-copy="${esc(v)}">copy</button></div><pre>${esc(v)}</pre>`:""}
function open(t){$(".panel").innerHTML=`<h2>${esc(t.repo)}</h2><p>${esc(t.purpose)}</p><dl><dt>category</dt><dd>${esc(t.category)}</dd><dt>stars</dt><dd>${t.stars.toLocaleString()}</dd><dt>last push</dt><dd>${esc(t.updated)}${t.archived?' <span class="arch">(archived)</span>':""}</dd><dt>language</dt><dd>${esc(t.language)}</dd><dt>license</dt><dd>${esc(t.license||"none")}</dd></dl>${blk("install",t.install)}${blk("usage",t.usage)}${runBlock(t)}<a class="btn" href="https://github.com/${esc(t.repo)}" target="_blank" rel="noopener">open on GitHub ↗</a>`;$("#sheet").hidden=false}
$("#sheet").onclick=async e=>{if(e.target.classList.contains("bd"))return $("#sheet").hidden=true;const b=e.target.closest("[data-copy]");if(!b)return;
try{await navigator.clipboard.writeText(b.dataset.copy)}catch{const x=document.createElement("textarea");x.value=b.dataset.copy;document.body.append(x);x.select();document.execCommand("copy");x.remove()}b.textContent="copied ✓";setTimeout(()=>b.textContent="copy",1200)};
$("#sheet").addEventListener("submit",e=>{const form=e.target.closest(".run-form");if(!form)return;e.preventDefault();
const target=form.querySelector(".run-target").value.trim();if(!target){form.querySelector(".run-target").focus();return}
location.href=runMailto(form.dataset.tool,target,form.querySelector(".run-opts").value)});
document.addEventListener("keydown",e=>{if(e.key==="Escape")$("#sheet").hidden=true});
if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js");
