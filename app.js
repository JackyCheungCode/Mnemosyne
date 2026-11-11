import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const SUPABASE_URL="https://gvbqtdxqulbnjqnbooqs.supabase.co";
const SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2YnF0ZHhxdWxibmpxbmJvb3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQzMTcyNjQsImV4cCI6MjEwOTg5MzI2NH0.q7LQJ_h113dvv0cl9HQoEcXM-wWBu2jviPbreop14mE";
const supabase=createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
window.__mnSession=null;
supabase.auth.onAuthStateChange((_event,session)=>{window.__mnSession=session});
const nativeFetch=window.fetch.bind(window);
window.fetch=(input,init={})=>{
 const url=typeof input==="string"?input:input.url;
 if(url.startsWith("/api/")&&window.__mnSession?.access_token){
  const headers=new Headers(init.headers|| (input instanceof Request?input.headers:undefined));
  headers.set("Authorization","Bearer "+window.__mnSession.access_token);
  return nativeFetch(input,{...init,headers});
 }
 return nativeFetch(input,init);
};
async function initAuth(){
 const {data:{session}}=await supabase.auth.getSession();
 if(session){window.__mnSession=session;page();showLogout();return}
 renderLogin();
}
function renderLogin(message=""){
 const host=document.querySelector("#app");
 host.innerHTML='<section class="panel" style="max-width:460px;margin:8vh auto;padding:32px"><div class="eyebrow">MNEMOSYNE / SECURE ACCESS</div><h1 class="title">管理员登录</h1><p class="desc">使用已授权的管理员邮箱登录工作空间。</p><form id="mn-login"><div class="field"><label for="mn-email">邮箱</label><input id="mn-email" type="email" autocomplete="username" required value="xg.y@icloud.com"></div><div class="field"><label for="mn-password">密码</label><input id="mn-password" type="password" autocomplete="current-password" required></div><p id="mn-auth-error" class="toast" role="alert">'+escapeAuth(message)+'</p><button class="btn" style="width:100%" type="submit">登录</button></form></section>';
 document.querySelector("#mn-login").addEventListener("submit",async e=>{
  e.preventDefault();const button=e.currentTarget.querySelector("button");button.disabled=true;button.textContent="正在验证…";
  const email=document.querySelector("#mn-email").value.trim(),password=document.querySelector("#mn-password").value;
  const {data,error}=await supabase.auth.signInWithPassword({email,password});
  if(error){document.querySelector("#mn-auth-error").textContent="登录失败："+error.message;button.disabled=false;button.textContent="登录";return}
  const {data:{user}}=await supabase.auth.getUser();
  if(!user||user.email?.toLowerCase()!=="xg.y@icloud.com"){await supabase.auth.signOut();document.querySelector("#mn-auth-error").textContent="此账户没有管理员权限。";button.disabled=false;button.textContent="登录";return}
  window.__mnSession=data.session;page();showLogout();
 });
}
function escapeAuth(s){return String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function showLogout(){
 const header=document.querySelector("header");if(!header||document.querySelector("#mn-logout"))return;
 const btn=document.createElement("button");btn.id="mn-logout";btn.className="btn secondary";btn.type="button";btn.textContent="退出登录";btn.style.marginLeft="12px";
 btn.onclick=async()=>{await supabase.auth.signOut();window.__mnSession=null;btn.remove();renderLogin()};
 header.append(btn);
}
const app=document.querySelector('#app');
/* Odoo-inspired responsive application navigation */
(function initSidebar(){
 const sidebar=document.getElementById('app-sidebar'),collapse=document.getElementById('sidebar-collapse'),open=document.getElementById('sidebar-open'),scrim=document.getElementById('sidebar-scrim');
 if(!sidebar||!collapse||!open||!scrim)return;
 const mobile=()=>window.matchMedia('(max-width:640px)').matches;
 let collapsed=false;try{collapsed=localStorage.getItem('mnemosyne_sidebar_collapsed')==='1'}catch{}
 document.body.classList.toggle('sidebar-collapsed',collapsed&&!mobile());
 const closeMobile=()=>document.body.classList.remove('sidebar-mobile-open');
 collapse.addEventListener('click',()=>{
  if(mobile()){closeMobile();return}
  collapsed=!document.body.classList.contains('sidebar-collapsed');
  document.body.classList.toggle('sidebar-collapsed',collapsed);
  try{localStorage.setItem('mnemosyne_sidebar_collapsed',collapsed?'1':'0')}catch{}
  collapse.setAttribute('aria-label',collapsed?'展开侧边栏':'收起侧边栏');collapse.title=collapsed?'展开侧边栏':'收起侧边栏';
 });
 open.addEventListener('click',()=>document.body.classList.add('sidebar-mobile-open'));
 scrim.addEventListener('click',closeMobile);
 sidebar.querySelectorAll('nav a').forEach(a=>a.addEventListener('click',closeMobile));
 window.addEventListener('resize',()=>{if(!mobile())closeMobile()});
})();

const DEFAULT_RULES={shop:['amazon.com','aliexpress.com','ebay.com','walmart.com'],social:['linkedin.com','facebook.com','instagram.com','youtube.com','x.com'],b2b:['globalsources.com','indiamart.com','kompass.com','thomasnet.com'],media:['reuters.com','bloomberg.com','forbes.com','prnewswire.com']};
const LABELS={shop:'电商平台',social:'社交媒体',b2b:'B2B 平台',media:'资讯媒体'};

const COUNTRY_CODES=["AD","AE","AF","AG","AI","AL","AM","AO","AQ","AR","AS","AT","AU","AW","AX","AZ","BA","BB","BD","BE","BF","BG","BH","BI","BJ","BL","BM","BN","BO","BQ","BR","BS","BT","BV","BW","BY","BZ","CA","CC","CD","CF","CG","CH","CI","CK","CL","CM","CN","CO","CR","CU","CV","CW","CX","CY","CZ","DE","DJ","DK","DM","DO","DZ","EC","EE","EG","EH","ER","ES","ET","FI","FJ","FK","FM","FO","FR","GA","GB","GD","GE","GF","GG","GH","GI","GL","GM","GN","GP","GQ","GR","GS","GT","GU","GW","GY","HK","HM","HN","HR","HT","HU","ID","IE","IL","IM","IN","IO","IQ","IR","IS","IT","JE","JM","JO","JP","KE","KG","KH","KI","KM","KN","KP","KR","KW","KY","KZ","LA","LB","LC","LI","LK","LR","LS","LT","LU","LV","LY","MA","MC","MD","ME","MF","MG","MH","MK","ML","MM","MN","MO","MP","MQ","MR","MS","MT","MU","MV","MW","MX","MY","MZ","NA","NC","NE","NF","NG","NI","NL","NO","NP","NR","NU","NZ","OM","PA","PE","PF","PG","PH","PK","PL","PM","PN","PR","PS","PT","PW","PY","QA","RE","RO","RS","RU","RW","SA","SB","SC","SD","SE","SG","SH","SI","SJ","SK","SL","SM","SN","SO","SR","SS","ST","SV","SX","SY","SZ","TC","TD","TF","TG","TH","TJ","TK","TL","TM","TN","TO","TR","TT","TV","TW","TZ","UA","UG","UM","US","UY","UZ","VA","VC","VE","VG","VI","VN","VU","WF","WS","YE","YT","ZA","ZM","ZW","XK"];
const COUNTRY_NAMES=new Intl.DisplayNames(['zh-CN'],{type:'region'});
const COUNTRY_OVERRIDES={CN:'中国',HK:'中国香港',MO:'中国澳门',TW:'中国台湾',XK:'科索沃'};
function countryLabel(code){return COUNTRY_OVERRIDES[code]||COUNTRY_NAMES.of(code)||code}
function countryFlag(code){return String.fromCodePoint(...code.toUpperCase().split('').map(c=>127397+c.charCodeAt(0)))}
function countryOptions(selected='global'){
 const all=[['global','全球','']];
 return all.concat(COUNTRY_CODES.map(code=>[code.toLowerCase(),countryLabel(code),code])).map(([value,label,code])=>'<option value="'+value+'"'+(code?' data-country-code="'+code+'"':'')+(value===selected?' selected':'')+'>'+label+'</option>').join('');
}

let cfg={};try{cfg=JSON.parse(localStorage.getItem('mnemosyne_cfg')||'{}')||{}}catch{}
let rules=loadRules();
let refreshTimer=null;
let detailRefreshTimer=null;
function loadRules(){try{const saved=JSON.parse(localStorage.getItem('mnemosyne_rules')||'null');if(saved&&typeof saved==='object')return Object.fromEntries(Object.keys(DEFAULT_RULES).map(k=>[k,Array.isArray(saved[k])?saved[k]:[...DEFAULT_RULES[k]]]));}catch{}return structuredClone(DEFAULT_RULES)}
function saveRules(){localStorage.setItem('mnemosyne_rules',JSON.stringify(rules))}
function page(){if(!window.__mnSession)return;if(refreshTimer){clearTimeout(refreshTimer);refreshTimer=null}if(detailRefreshTimer){clearTimeout(detailRefreshTimer);detailRefreshTimer=null}const path=location.pathname,tab=new URLSearchParams(location.search).get('tab')||'';const settings=path.includes('settings'),verify=path.includes('verify'),tasks=path.includes('tasks')||tab==='history',results=path.includes('results'),review=tab==='review',ciTasks=tab==='intelligence',ciResults=tab==='company-results';document.querySelectorAll('nav a').forEach(a=>a.classList.toggle('active',a.pathname===path||(a.pathname==='/search'&&['/','/tasks','/results','/verify'].includes(path))));if(settings)renderSettings();else if(verify)renderVerify();else if(ciTasks)renderIntelligenceTasks();else if(ciResults)renderIntelligenceResults();else if(review)renderCompanyReview();else if(tasks)renderTasks();else if(results)renderResults();else renderSearch()}
function renderSearch(){
app.innerHTML=`<div class="eyebrow">DISCOVERY / SEARCH</div><h1 class="title">官网发现</h1><p class="desc">通过 Google 自然搜索发现全球潜在企业官网。配置搜索条件后启动采集，系统会逐页执行并实时反馈进度。</p><div class="discovery-tabs workflow-tabs"><a class="active" href="/search">开始采集</a><a href="/search?tab=review">官网审核</a><a href="/search?tab=intelligence">采集任务</a><a href="/search?tab=company-results">情报结果</a><a href="/search?tab=history">搜索历史</a></div><section class="panel"><h3>全球企业官网搜索</h3><div class="grid"><div class="field wide"><label>任务名称（可选）</label><input id="task-name" placeholder="例如：德国低压开关设备制造商"></div><div class="field"><label>行业 / 产品关键词</label><input id="kw" value="electrical equipment"></div><div class="field"><label>企业类型</label><select id="type"><option value="manufacturer OR factory OR producer">制造商 / 工厂</option><option value="distributor OR wholesaler">经销商 / 批发商</option><option value='"electrical engineering" OR contractor'>工程公司 / 承包商</option><option value="brand OR company">品牌 / 企业</option></select></div><div class="field"><label>目标国家</label><select id="country" data-country-flags="true">${countryOptions('global')}</select></div><div class="field"><label>搜索语言</label><select id="lang"><option value="en">英语</option><option value="de">德语</option><option value="fr">法语</option><option value="es">西班牙语</option><option value="ja">日语</option><option value="zh-CN">简体中文</option></select></div><div class="field"><label>必须包含短语（可选）</label><input id="phrase" placeholder="low voltage switchgear"></div><div class="field"><label>起始页码</label><input id="start-page" type="number" min="1" max="100" value="1"></div><div class="field"><label>终止页码</label><input id="end-page" type="number" min="1" max="100" value="1"></div><div class="field wide"><label>排除类别</label><div class="checks"><label><input type="checkbox" name="ex" value="shop" checked> 电商</label><label><input type="checkbox" name="ex" value="social" checked> 社交</label><label><input type="checkbox" name="ex" value="b2b" checked> B2B 平台</label><label><input type="checkbox" name="ex" value="media" checked> 资讯媒体</label></div></div><div class="field wide"><div class="code-label"><label>实时 Google 搜索语法</label><span class="code-meta">GOOGLE QUERY · LIVE PREVIEW</span></div><pre class="syntax-code"><code id="preview"></code></pre></div></div><p class="task-create-actions"><button class="btn" id="go">创建并启动任务</button><span class="hint">每页约 10 条结果 · 单个任务最多 10 页</span></p><div id="error" class="toast" role="alert"></div></section><div id="live-task" class="live-task" aria-live="polite"></div>`;
const ids=['kw','type','country','lang','phrase'];
function query(){const q=[document.querySelector('#kw').value.trim(),document.querySelector('#type').value];if(document.querySelector('#phrase').value.trim())q.push('"'+document.querySelector('#phrase').value.trim()+'"');for(const c of document.querySelectorAll('[name=ex]:checked'))for(const d of rules[c.value]||[])q.push('-site:'+d);return q.filter(Boolean).join(' ')}
function preview(){document.querySelector('#preview').textContent=query()}
ids.forEach(id=>document.querySelector('#'+id).addEventListener('input',preview));document.querySelectorAll('[name=ex]').forEach(x=>x.addEventListener('change',preview));preview();
const currentTask=new URLSearchParams(location.search).get('task');if(currentTask)watchTask(currentTask);
document.querySelector('#go').onclick=async()=>{const b=document.querySelector('#go');const startPage=Math.max(1,Number(document.querySelector('#start-page').value)||1),endPage=Math.max(startPage,Number(document.querySelector('#end-page').value)||startPage);if(endPage-startPage+1>10){document.querySelector('#error').textContent='单个任务最多执行 10 页，请缩小页码范围。';return}b.disabled=true;b.textContent='正在启动采集…';document.querySelector('#error').textContent='';const payload={action:'create',taskName:document.querySelector('#task-name').value,keyword:document.querySelector('#kw').value.trim(),query:query(),country:document.querySelector('#country').value==='global'?'':document.querySelector('#country').value,language:document.querySelector('#lang').value,startPage,endPage,filters:Object.fromEntries(['shop','social','b2b','media'].map(k=>[k,rules[k]]))};try{const r=await fetch('/api/tasks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const d=await r.json();if(!r.ok)throw new Error(d.error||'创建任务失败');history.replaceState(null,'','/search?task='+encodeURIComponent(d.task.task_code));watchTask(d.task.task_code)}catch(e){document.querySelector('#error').textContent=e.message;b.disabled=false;b.textContent='创建并启动任务'}}
}
async function taskApi(body){const r=await fetch('/api/tasks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw new Error(d.error||'请求失败');return d}

async function watchTask(taskCode){
 const host=document.querySelector('#live-task');if(!host)return;
 try{
  const {task:t}=await taskApi({action:'get_task',taskCode});
  const pages=t.search_task_pages||[],total=pages.length||1,done=pages.filter(p=>p.status==='completed').length,failed=pages.filter(p=>['failed','rejected'].includes(p.status)),running=pages.filter(p=>p.status==='running').length,queued=pages.filter(p=>p.status==='queued').length;
  const finished=done+failed.length,terminal=['completed','failed','partial','cancelled'].includes(t.status),percent=terminal?100:Math.min(99,Math.round((finished+running*0.45)/total*100)),elapsed=t.started_at?Math.max(0,(Date.now()-new Date(t.started_at).getTime())/1000):0,avg=finished?Math.max(16,elapsed/finished):16,eta=queued+running?Math.ceil((queued+running)*avg):0;
  const status={queued:'排队中',running:'执行中',partial:'部分完成',completed:'已完成',failed:'执行失败',cancelled:'已取消'};
  const logs=pages.map(p=>{const stamp=p.completed_at||p.started_at;const msg=p.status==='completed'?'采集完成 · '+(p.results_count||0)+' 条结果':p.status==='failed'||p.status==='rejected'?'采集失败 · '+(p.error_code||'查看诊断'):p.status==='running'?'正在请求 Apify 并解析自然搜索结果':'等待执行';return '<div class="log-row"><i class="log-dot '+safe(p.status)+'"></i><time>'+(stamp?new Date(stamp).toLocaleTimeString():'—')+'</time><b>第 '+p.page_number+' 页</b><span>'+msg+'</span></div>'}).join('');
  host.innerHTML='<section class="panel live-panel"><div class="live-head"><div><div class="eyebrow">LIVE COLLECTION STATUS</div><h3>'+safe(t.task_name||t.keyword||t.task_code)+'</h3><p>'+safe(t.task_code)+' · '+safe(t.country||'全球')+' · '+safe(t.language||'en')+'</p></div><span class="status-pill status-'+statusClass(t.status)+'">'+(status[t.status]||t.status)+'</span></div><div class="progress-meta"><strong>采集进度</strong><b>'+percent+'%</b></div><div class="progress-track"><i style="width:'+percent+'%"></i></div><div class="live-stats"><div><small>已完成页</small><b>'+done+' / '+total+'</b></div><div><small>已发现结果</small><b>'+Number(t.total_results||0).toLocaleString()+'</b></div><div><small>失败页</small><b>'+failed.length+'</b></div><div><small>预计剩余</small><b>'+(terminal?'—':eta?'约 '+eta+' 秒':'计算中')+'</b></div></div><div class="log-heading"><strong>执行日志</strong><span>每 2.5 秒自动更新</span></div><div class="live-logs">'+logs+'</div>'+(t.error_summary?'<p class="toast">'+safe(t.error_summary)+'</p>':'')+'<div class="live-actions"><a class="text-btn" href="/search?tab=history">查看历史任务 →</a>'+(terminal?'<a class="btn secondary" href="/results?task='+encodeURIComponent(t.task_code)+'">查看采集结果</a>':'<span class="hint">正在自动更新任务状态</span>')+'</div></section>';
  if(terminal){const startButton=document.querySelector('#go');if(startButton){startButton.disabled=false;startButton.textContent='开始新采集'}}else refreshTimer=setTimeout(()=>watchTask(taskCode),2500);
 }catch(e){host.innerHTML='<section class="panel">'+safe(e.message)+'</section>'}
}
function taskStatus(s){return ({queued:'排队中',running:'执行中',partial:'部分完成',completed:'已完成',failed:'执行失败',cancelled:'已取消'})[s]||s||'未知'}
function statusClass(s){return ['completed'].includes(s)?'good':['failed'].includes(s)?'bad':['partial','running'].includes(s)?'maybe':'pending'}
function renderTasks(){
const taskCode=new URLSearchParams(location.search).get('task')||'';
app.innerHTML=`<div class="eyebrow">DISCOVERY / TASK CENTER</div><h1 class="title">官网发现</h1><p class="desc">查看所有历史采集任务、逐页执行状态和失败诊断。</p><div class="discovery-tabs"><a href="/search">开始采集</a><a class="active" href="/search?tab=history">历史任务</a></div><div id="task-detail"></div><section class="panel task-filter"><div class="field"><label>按关键词筛选任务</label><input id="task-keyword" placeholder="输入关键词，例如 electrical equipment"></div><button class="btn secondary" id="task-filter-btn">筛选</button><a class="text-btn" href="/search">＋ 开始采集</a></section><div class="table-scroll"><table class="table task-table"><thead><tr><th>任务 ID</th><th>关键词</th><th>国家</th><th>页码范围</th><th>进度</th><th>结果数</th><th>状态</th><th>创建时间</th><th>操作</th></tr></thead><tbody id="task-rows"><tr><td colspan="9">正在加载任务…</td></tr></tbody></table></div><div class="hint" id="task-note"></div>`;
const rows=document.querySelector('#task-rows');
async function load(){try{const d=await taskApi({action:'list_tasks',keyword:document.querySelector('#task-keyword').value,limit:100});rows.innerHTML=d.tasks.length?d.tasks.map(t=>'<tr><td><strong>'+safe(t.task_code)+'</strong></td><td title="'+safe(t.keyword)+'">'+safe(t.keyword)+'</td><td>'+safe(t.country||'全球')+'</td><td>'+t.start_page+'–'+t.end_page+'</td><td>'+t.pages_completed+'/'+(t.end_page-t.start_page+1)+' 页</td><td>'+t.total_results+'</td><td><span class="status-pill status-'+statusClass(t.status)+'">'+taskStatus(t.status)+'</span></td><td>'+new Date(t.created_at).toLocaleString()+'</td><td><a class="text-btn" href="/tasks?task='+encodeURIComponent(t.task_code)+'">详情</a>　<a class="text-btn" href="/results?task='+encodeURIComponent(t.task_code)+'">结果</a></td></tr>').join(''):'<tr><td colspan="9" class="empty-state">暂无搜索任务。请先创建一个任务。</td></tr>';if(d.tasks.some(t=>['queued','running'].includes(t.status)))refreshTimer=setTimeout(load,3000)}catch(e){rows.innerHTML='<tr><td colspan="9">'+safe(e.message)+'</td></tr>'}}
document.querySelector('#task-filter-btn').onclick=load;
if(taskCode){const host=document.querySelector('#task-detail');async function loadDetail(){try{const {task:t}=await taskApi({action:'get_task',taskCode});const pages=t.search_task_pages||[];host.innerHTML='<section class="panel task-detail"><div class="task-detail-head"><div><div class="eyebrow">TASK DETAIL</div><h3>'+safe(t.task_code)+' · '+safe(t.task_name||t.keyword)+'</h3><p>'+safe(t.query)+'</p></div><span class="status-pill status-'+statusClass(t.status)+'">'+taskStatus(t.status)+'</span></div><div class="task-metrics"><div><small>关键词</small><b>'+safe(t.keyword)+'</b></div><div><small>页码范围</small><b>'+t.start_page+' – '+t.end_page+'</b></div><div><small>已完成页</small><b>'+t.pages_completed+' / '+pages.length+'</b></div><div><small>搜索结果</small><b>'+t.total_results+'</b></div><div><small>开始时间</small><b>'+(t.started_at?new Date(t.started_at).toLocaleString():'—')+'</b></div><div><small>结束时间</small><b>'+(t.completed_at?new Date(t.completed_at).toLocaleString():'执行中')+'</b></div></div><h4>逐页执行记录</h4><div class="page-status-grid">'+pages.map(p=>'<div class="page-status"><b>第 '+p.page_number+' 页</b><span class="status-pill status-'+statusClass(p.status==='rejected'?'failed':p.status==='queued'?'queued':p.status)+'">'+({queued:'待执行',running:'执行中',completed:'成功',failed:'失败',rejected:'上游拒绝'})[p.status]+'</span><small>'+p.results_count+' 条结果'+(p.error_code?' · '+p.error_code:'')+(p.error_detail?.responsePreview?' · '+safe(p.error_detail.responsePreview):'')+'</small></div>').join('')+'</div>'+(t.error_summary?'<p class="hint">'+safe(t.error_summary)+'</p>':'')+(pages.some(p=>['failed','rejected'].includes(p.status))?'<button class="btn" id="retry-failed">重试失败页</button>　':'')+'<a class="btn secondary" href="/results?task='+encodeURIComponent(t.task_code)+'">查询该任务结果</a></section>';const retryButton=host.querySelector('#retry-failed');if(retryButton)retryButton.onclick=async()=>{retryButton.disabled=true;retryButton.textContent='正在重新排队…';try{await taskApi({action:'retry_failed_pages',taskCode});loadDetail()}catch(e){retryButton.disabled=false;retryButton.textContent='重试失败页';alert(e.message)}};if(['queued','running'].includes(t.status))detailRefreshTimer=setTimeout(loadDetail,2500)}catch(e){host.innerHTML='<section class="panel">'+safe(e.message)+'</section>'}}loadDetail()}
load();
}
function renderResults(){
const params=new URLSearchParams(location.search);const taskValue=params.get('task')||'';
app.innerHTML=`<div class="eyebrow">DISCOVERY / RESULT CENTER</div><h1 class="title">搜索结果中心</h1><p class="desc">集中查询所有历史任务产生的 SERP 记录。原始发现记录按任务保留，不因同一域名被不同关键词重复发现而丢失。</p><section class="panel result-filters"><div class="field"><label>关键词</label><input id="result-keyword" placeholder="按搜索关键词筛选"></div><div class="field"><label>任务 ID</label><input id="result-task" placeholder="MN-…" value="${safe(taskValue)}"></div><div class="field"><label>国家</label><select id="result-country" data-country-flags="true"><option value="">全部国家 / 地区</option>${COUNTRY_CODES.map(code=>'<option value="'+code.toLowerCase()+'" data-country-code="'+code+'">'+countryLabel(code)+'</option>').join('')}</select></div><div class="field"><label>域名</label><input id="result-domain" placeholder="example.com"></div><button class="btn" id="result-search">查询结果</button></section><div class="result-summary" id="result-summary"></div><div class="table-scroll"><table class="table results-table"><thead><tr><th>关键词</th><th>标题</th><th>官网域名</th><th>国家</th><th>任务 ID</th><th>页码</th><th>排名</th><th>发现时间</th></tr></thead><tbody id="result-rows"><tr><td colspan="8">正在加载结果…</td></tr></tbody></table></div><div class="pagination" id="result-pagination"></div>`;
let currentPage=1;
async function load(){const body={action:'list_results',keyword:document.querySelector('#result-keyword').value,taskCode:document.querySelector('#result-task').value,country:document.querySelector('#result-country').value,domain:document.querySelector('#result-domain').value,page:currentPage,limit:50};const rows=document.querySelector('#result-rows');try{const d=await taskApi(body);rows.innerHTML=d.results.length?d.results.map(x=>'<tr><td>'+safe(x.keyword)+'</td><td title="'+safe(x.title)+'">'+safe(x.title)+'</td><td title="'+safe(x.domain)+'"><a href="'+safe(x.url)+'" target="_blank" rel="noopener">'+safe(x.domain||x.url)+'</a></td><td>'+safe(x.country||'全球')+'</td><td><a class="text-btn" href="/tasks?task='+encodeURIComponent(x.search_tasks?.task_code||'')+'">'+safe(x.search_tasks?.task_code||'')+'</a></td><td>'+x.page_number+'</td><td>'+x.rank+'</td><td>'+new Date(x.discovered_at).toLocaleString()+'</td></tr>').join(''):'<tr><td colspan="8" class="empty-state">没有符合条件的搜索结果。</td></tr>';document.querySelector('#result-summary').textContent='共 '+d.total+' 条记录';document.querySelector('#result-pagination').innerHTML='<button class="btn secondary" id="prev-page" '+(currentPage<=1?'disabled':'')+'>上一页</button><span>第 '+d.page+' 页 / '+Math.max(1,Math.ceil(d.total/d.limit))+' 页</span><button class="btn secondary" id="next-page" '+(currentPage*d.limit>=d.total?'disabled':'')+'>下一页</button>';document.querySelector('#prev-page').onclick=()=>{currentPage=Math.max(1,currentPage-1);load()};document.querySelector('#next-page').onclick=()=>{currentPage++;load()}}catch(e){rows.innerHTML='<tr><td colspan="8">'+safe(e.message)+'</td></tr>'}}
document.querySelector('#result-search').onclick=()=>{currentPage=1;load()};load();
}
function renderSettings(){
app.innerHTML=`<div class="eyebrow">CONFIGURATION</div><h1 class="title">过滤库设置</h1><p class="desc">用代码编辑器的方式维护排除规则。每行填写一个域名，保存后立即应用到实时 Google 搜索语法。</p><section class="panel"><div class="panel-heading"><div><h3>默认排除域名库</h3><p class="section-note">支持逐行添加、修改或删除；只填写域名，例如 example.com，不要添加协议或路径。</p></div><span class="editor-badge">RULE EDITOR</span></div><div id="rule-groups" class="rule-editors"></div><div class="editor-footer"><span class="hint" id="rule-status" aria-live="polite">修改内容会自动保存到当前浏览器</span><span class="save-indicator"><i></i> AUTO SAVE</span></div></section>`;
function drawRules(){
 document.querySelector('#rule-groups').innerHTML=Object.entries(rules).map(([key,items])=>'<section class="rule-editor"><div class="rule-editor-head"><div><span class="rule-dot dot-'+key+'"></span><strong>'+LABELS[key]+'</strong><span class="rule-count">'+items.length+' 条规则</span></div><span class="editor-language">DOMAIN LIST</span></div><div class="code-editor"><div class="line-gutter">'+(items.length?items.map((_,i)=>'<span>'+String(i+1).padStart(2,'0')+'</span>').join(''):'<span>01</span>')+'</div><textarea class="rule-code" data-category="'+key+'" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" aria-label="'+LABELS[key]+'，每行一个域名" placeholder="example.com&#10;another-example.com">'+safe(items.join('\n'))+'</textarea></div><div class="rule-editor-foot"><span>一行一个域名 · Enter 添加下一条</span><span class="rule-count-live" data-count="'+key+'">'+items.length+' domains</span></div></section>').join('');
 document.querySelectorAll('.rule-code').forEach(editor=>{
  editor.addEventListener('input',()=>{
   const category=editor.dataset.category;
   const lines=editor.value.split(/\r?\n/).map(x=>x.trim().toLowerCase()).filter(Boolean);
   rules[category]=[...new Set(lines.map(x=>x.replace(/^https?:\/\//,'').replace(/^www\./,'').split('/')[0].split(':')[0]).filter(x=>x.includes('.')&&!/\s/.test(x)))];
   saveRules();
   const count=document.querySelector('[data-count="'+category+'"]');
   if(count)count.textContent=rules[category].length+' domains';
   document.querySelector('#rule-status').textContent='已自动保存 '+LABELS[category]+' · '+rules[category].length+' 条有效规则';
   editor.parentElement.querySelector('.line-gutter').innerHTML=Array.from({length:Math.max(1,editor.value.split('\n').length)},(_,i)=>'<span>'+String(i+1).padStart(2,'0')+'</span>').join('');
  });
 });
}
drawRules();
}
function safe(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
initAuth();
async function renderVerify(){
 let candidates=[];try{candidates=JSON.parse(localStorage.getItem('mnemosyne_candidates')||'[]')||[]}catch{}
 app.innerHTML=`<div class="eyebrow">DISCOVERY / VERIFICATION</div><h1 class="title">候选企业验证</h1><p class="desc">对 Google SERP 返回的网站进行访问和初步身份识别。验证结果是机器辅助判断，不会把无法确认的网站自动认定为企业官网。</p>
 <section class="panel verify-toolbar"><div><h3>候选网站</h3><p class="section-note">数据保存在当前浏览器。先选择网站，再执行验证；也可以验证全部待验证网站。</p></div><div class="verify-actions"><button class="btn secondary" id="verify-all">验证全部待验证</button><button class="btn" id="verify-selected">验证选中项</button></div></section>
 <div class="verify-summary" id="verify-summary"></div><div class="table-scroll"><table class="table verify-table"><thead><tr><th class="check-col"><input type="checkbox" id="select-all" aria-label="全选"></th><th>排名</th><th>搜索标题</th><th>候选网站</th><th>验证状态</th><th>判断依据</th><th>操作</th></tr></thead><tbody id="candidate-rows"></tbody></table></div><p class="hint">说明：当前阶段只做网站首页访问、企业身份线索提取和初步相关性判断；不等同于人工尽调，也不会自动收集联系人。</p>`;
 const rows=document.querySelector('#candidate-rows');
 const save=()=>localStorage.setItem('mnemosyne_candidates',JSON.stringify(candidates));
 const statusLabel=s=>({ '待验证':'待验证','验证中':'验证中','疑似官网':'疑似官网','已验证':'已验证','非官网':'非官网','无法访问':'无法访问','需要复核':'需要复核'}[s]||s||'待验证');
 function draw(){
  document.querySelector('#verify-summary').innerHTML=['待验证','疑似官网','已验证','非官网','无法访问','需要复核'].map(s=>'<span class="summary-chip">'+s+' <b>'+candidates.filter(x=>x.status===s).length+'</b></span>').join('');
  rows.innerHTML=candidates.length?candidates.map((x,i)=>'<tr><td><input type="checkbox" class="candidate-check" data-index="'+i+'"></td><td>'+(x.rank||i+1)+'</td><td title="'+safe(x.title)+'">'+safe(x.title)+'</td><td title="'+safe(x.url)+'"><a href="'+safe(x.url)+'" target="_blank" rel="noopener">'+safe(x.domain||x.url)+'</a></td><td><span class="status-pill status-'+(x.status==='已验证'?'good':x.status==='非官网'?'bad':x.status==='疑似官网'?'maybe':'pending')+'">'+statusLabel(x.status)+'</span></td><td title="'+safe(x.verification?.reason||'尚未验证')+'">'+safe(x.verification?.reason||'尚未验证')+'</td><td><button class="text-btn verify-one" data-index="'+i+'" '+(x.status==='验证中'?'disabled':'')+'>重新验证</button></td></tr>').join(''):'<tr><td colspan="7" class="empty-state">暂无候选网站。请先到「官网搜索」执行一次搜索。</td></tr>';
 }
 async function verifyIndex(i){
  const item=candidates[i];if(!item)return;
  item.status='验证中';save();draw();
  try{
   const r=await fetch('/api/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:item.url})});
   const d=await r.json();if(!r.ok)throw new Error(d.error||'验证请求失败');
   item.verification=d;item.verifiedAt=new Date().toISOString();item.status=d.status||'需要复核';
  }catch(e){item.status='无法访问';item.verification={reason:e.message};item.verifiedAt=new Date().toISOString()}
  save();draw();
 }
 async function run(indices){const unique=[...new Set(indices)].filter(i=>candidates[i]&&candidates[i].status!=='验证中');if(!unique.length)return;for(let p=0;p<unique.length;p+=3){await Promise.all(unique.slice(p,p+3).map(verifyIndex))}}
 document.querySelector('#verify-all').onclick=()=>run(candidates.map((x,i)=>i).filter(i=>['待验证','需要复核','无法访问'].includes(candidates[i].status)));
 document.querySelector('#verify-selected').onclick=()=>run([...document.querySelectorAll('.candidate-check:checked')].map(x=>Number(x.dataset.index)));
 document.querySelector('#select-all').onchange=e=>document.querySelectorAll('.candidate-check').forEach(x=>x.checked=e.target.checked);
 rows.onclick=e=>{const b=e.target.closest('.verify-one');if(b)verifyIndex(Number(b.dataset.index))};
 draw();
}

async function intelligenceApi(body){const r=await fetch('/api/intelligence',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw new Error(d.error||'情报服务请求失败');return d}
function workflowHeader(active,title,desc){return '<div class="eyebrow">COMPANY INTELLIGENCE / WORKFLOW</div><h1 class="title">'+title+'</h1><p class="desc">'+desc+'</p><div class="discovery-tabs workflow-tabs"><a href="/search">开始采集</a><a class="'+(active==='review'?'active':'')+'" href="/search?tab=review">官网审核</a><a class="'+(active==='tasks'?'active':'')+'" href="/search?tab=intelligence">采集任务</a><a class="'+(active==='results'?'active':'')+'" href="/search?tab=company-results">情报结果</a><a href="/search?tab=history">搜索历史</a></div>'}
function renderCompanyReview(){
 app.innerHTML=workflowHeader('review','官网审核','从已发现的全球企业官网中，人工勾选需要处理的网站。只有已审核通过的官网才会进入情报采集。')+
 '<section class="panel review-control"><div class="review-control-top"><div><h3>候选官网</h3><p class="section-note">审核状态会保存到数据库，刷新页面后仍然保留。</p></div><div class="review-count"><strong id="review-count">0</strong><span>已选择</span></div></div><div class="review-filters"><input id="review-keyword" placeholder="搜索企业名称 / 域名 / 关键词"><button class="btn secondary" id="review-search">搜索</button><button class="btn secondary" id="review-refresh">刷新列表</button></div><div class="review-toolbar"><label class="select-all"><input type="checkbox" id="review-all"> 全选当前结果</label><span id="review-total" class="hint">正在加载候选官网…</span></div><div class="table-scroll"><table class="table company-review-table"><thead><tr><th></th><th>候选企业 / 页面标题</th><th>官网域名</th><th>国家</th><th>来源关键词 / 来源数</th><th>审核状态</th><th>发现时间</th></tr></thead><tbody id="review-rows"><tr><td colspan="7">正在加载…</td></tr></tbody></table></div><div class="review-footer"><span class="hint" id="review-message">选择需要采集的官网，然后保存审核。</span><div><button class="btn secondary" id="review-save">保存审核</button><button class="btn" id="review-start">保存并开始采集</button></div></div></section><div id="review-live"></div>';
 const rows=document.querySelector('#review-rows');let candidates=[],selected=new Set(),filtered=[];
 const draw=()=>{filtered=candidates.filter(x=>{const q=document.querySelector('#review-keyword').value.trim().toLowerCase();return !q||[x.title,x.domain,x.keyword,x.description].some(v=>String(v||'').toLowerCase().includes(q))});rows.innerHTML=filtered.length?filtered.map(x=>'<tr><td><input class="review-check" type="checkbox" data-id="'+safe(x.id)+'" '+(selected.has(x.id)?'checked':'')+'></td><td title="'+safe(x.title)+'"><strong>'+safe(x.title||x.domain)+'</strong><small>'+safe(x.description||'暂无搜索摘要')+'</small></td><td><a href="'+safe(x.url)+'" target="_blank" rel="noopener">'+safe(x.domain)+'</a></td><td>'+safe(x.country||'全球')+'</td><td>'+safe(x.keyword)+'<small>来源 '+Number(x.source_count||0)+' 条</small></td><td><span class="status-pill '+(x.review_status==='approved'?'status-good':x.review_status==='rejected'?'status-bad':'status-pending')+'">'+({approved:'已通过',rejected:'已排除',pending:'待审核'})[x.review_status]+'</span></td><td>'+new Date(x.discovered_at).toLocaleDateString()+'</td></tr>').join(''):'<tr><td colspan="7" class="empty-state">暂无候选官网。请先完成一次官网发现任务。</td></tr>';document.querySelector('#review-total').textContent='共 '+filtered.length+' 条候选官网';document.querySelector('#review-count').textContent=selected.size;document.querySelector('#review-all').checked=filtered.length>0&&filtered.every(x=>selected.has(x.id));};
 const load=async()=>{rows.innerHTML='<tr><td colspan="7">正在读取搜索结果…</td></tr>';try{const d=await intelligenceApi({action:'list_candidates'});candidates=d.candidates||[];selected=new Set(candidates.filter(x=>x.review_status==='approved').map(x=>x.id));draw()}catch(e){rows.innerHTML='<tr><td colspan="7">'+safe(e.message)+'</td></tr>'}};
 const save=async()=>{const items=candidates.map(x=>({id:x.id,decision:selected.has(x.id)?'approved':(x.review_status==='approved'?'pending':x.review_status)}));if(!selected.size)throw new Error('请先勾选需要采集的官网');return intelligenceApi({action:'save_review',items})};
 rows.addEventListener('change',e=>{const c=e.target.closest('.review-check');if(!c)return;if(c.checked)selected.add(c.dataset.id);else selected.delete(c.dataset.id);draw()});
 document.querySelector('#review-all').onchange=e=>{filtered.forEach(x=>e.target.checked?selected.add(x.id):selected.delete(x.id));draw()};
 document.querySelector('#review-search').onclick=draw;document.querySelector('#review-keyword').oninput=draw;document.querySelector('#review-refresh').onclick=load;
 document.querySelector('#review-save').onclick=async()=>{const b=document.querySelector('#review-save');b.disabled=true;try{const d=await save();document.querySelector('#review-message').textContent='审核已保存：'+d.saved+' 家官网';await load()}catch(e){document.querySelector('#review-message').textContent=e.message}finally{b.disabled=false}};
 document.querySelector('#review-start').onclick=async()=>{const b=document.querySelector('#review-start');b.disabled=true;b.textContent='正在创建任务…';try{await save();const d=await intelligenceApi({action:'create_task',ids:[...selected],taskName:'官网情报采集 · '+new Date().toLocaleString()});history.pushState(null,'','/search?tab=intelligence&task='+encodeURIComponent(d.task.task_code));page()}catch(e){document.querySelector('#review-message').textContent=e.message;b.disabled=false;b.textContent='保存并开始采集'}};
 load();
}
function renderIntelligenceTasks(){
 const code=new URLSearchParams(location.search).get('task')||'';
 app.innerHTML=workflowHeader('tasks','官网情报采集任务','动态查看每家企业官网的访问、页面发现、字段提取和最终处理状态。')+'<div id="ci-task-detail"></div><section class="panel"><div class="task-list-head"><h3>采集批次</h3><span class="hint">自动刷新任务进度</span></div><div id="ci-task-list" class="ci-task-list"><div class="skeleton-line"></div></div></section>';
 const list=document.querySelector('#ci-task-list'),detail=document.querySelector('#ci-task-detail');
 async function load(){try{const d=await intelligenceApi({action:'list_tasks'});list.innerHTML=d.tasks.length?d.tasks.map(t=>{const total=Number(t.total_items)||0,done=Number(t.completed_items)||0,failed=Number(t.failed_items)||0,pct=total?Math.min(100,Math.round((done+failed)/total*100)):0;return '<button class="ci-task-card" data-code="'+safe(t.task_code)+'"><span class="ci-task-orb '+safe(t.status)+'"><i></i></span><span class="ci-task-main"><b>'+safe(t.task_name)+'</b><small>'+safe(t.task_code)+' · '+new Date(t.created_at).toLocaleString()+'</small><span class="ci-mini-track"><i style="width:'+pct+'%"></i></span></span><span class="ci-task-numbers"><b>'+done+'/'+total+'</b><small>'+({queued:'排队中',running:'执行中',completed:'已完成',partial:'部分完成',failed:'失败',cancelled:'已取消'})[t.status]||t.status+'</small></span></button>'}).join(''):'<div class="empty-state">暂无情报采集任务。请先在「官网审核」中选择官网并启动采集。</div>';if(d.tasks.some(t=>['queued','running'].includes(t.status)))refreshTimer=setTimeout(load,2500)}catch(e){list.textContent=e.message}}
 async function show(taskCode){try{const {task:t}=await intelligenceApi({action:'get_task',taskCode});const items=t.company_intelligence_items||[],done=items.filter(x=>x.status==='completed').length,failed=items.filter(x=>x.status==='failed').length,total=items.length,pct=total?Math.round((done+failed)/total*100):0;detail.innerHTML='<section class="panel ci-live-panel"><div class="ci-live-top"><div><div class="eyebrow">LIVE ENRICHMENT PIPELINE</div><h3>'+safe(t.task_name)+'</h3><small>'+safe(t.task_code)+'</small></div><span class="status-pill status-'+statusClass(t.status)+'">'+({queued:'排队中',running:'正在采集',completed:'已完成',partial:'部分完成',failed:'执行失败',cancelled:'已取消'})[t.status]+'</span></div><div class="ci-progress-caption"><span>企业处理进度</span><b>'+pct+'%</b></div><div class="ci-progress"><i style="width:'+pct+'%"></i></div><div class="ci-live-metrics"><div><small>官网总数</small><b>'+total+'</b></div><div><small>已完成</small><b>'+done+'</b></div><div><small>失败</small><b>'+failed+'</b></div><div><small>待处理</small><b>'+items.filter(x=>['queued','crawling','extracting'].includes(x.status)).length+'</b></div></div><div class="ci-stage-list">'+items.map(x=>'<div class="ci-stage-row"><span class="ci-stage-icon '+safe(x.status)+'"><i></i></span><span><b>'+safe(x.domain)+'</b><small>'+safe(x.error_message||((x.pages_crawled||0)+' 个页面已采集'))+'</small></span><em class="ci-stage-status">'+({queued:'等待中',crawling:'正在访问官网',extracting:'正在提取',completed:'已完成',partial:'部分完成',failed:'失败',cancelled:'已取消'})[x.status]+'</em></div>').join('')+'</div><div class="live-actions"><a class="btn secondary" href="/search?tab=company-results">查看情报结果</a></div></section>';if(['queued','running'].includes(t.status))detailRefreshTimer=setTimeout(()=>show(taskCode),2500)}catch(e){detail.innerHTML='<section class="panel">'+safe(e.message)+'</section>'}}
 list.onclick=e=>{const b=e.target.closest('[data-code]');if(b)show(b.dataset.code)};load();if(code)show(code);
}
function renderIntelligenceResults(){
 const params=new URLSearchParams(location.search);app.innerHTML=workflowHeader('results','企业情报结果','查看已采集官网的企业名称、公开联系方式、社媒链接和主营产品。每条结果均保留来源页面。')+'<section class="panel result-filters ci-result-filters"><div class="field"><label>官网域名</label><input id="ci-domain" placeholder="example.com"></div><button class="btn" id="ci-result-search">查询结果</button><span class="hint" id="ci-result-total"></span></section><div class="table-scroll"><table class="table ci-results-table"><thead><tr><th>企业名称</th><th>官网</th><th>国家 / 地址</th><th>公开邮箱</th><th>电话</th><th>社媒</th><th>主营产品</th><th>来源页面</th></tr></thead><tbody id="ci-result-rows"><tr><td colspan="8">正在加载…</td></tr></tbody></table></div><div class="pagination" id="ci-result-pagination"></div>';
 let pageNo=1;const rows=document.querySelector('#ci-result-rows');
 async function load(){try{const d=await intelligenceApi({action:'list_results',domain:document.querySelector('#ci-domain').value,page:pageNo,limit:50});rows.innerHTML=d.results.length?d.results.map(x=>'<tr><td><strong>'+safe(x.company_name||'待识别')+'</strong><small>'+safe(x.description||'')+'</small></td><td><a href="'+safe(x.website_url)+'" target="_blank" rel="noopener">'+safe(x.domain)+'</a></td><td>'+safe([x.country,x.address].filter(Boolean).join(' · ')||'—')+'</td><td>'+safe((x.emails||[]).join(' / ')||'—')+'</td><td>'+safe((x.phones||[]).join(' / ')||'—')+'</td><td>'+Object.entries(x.social_links||{}).map(([k,v])=>'<a href="'+safe(v)+'" target="_blank" rel="noopener">'+safe(k)+'</a>').join(' ')+'</td><td>'+safe((x.main_products||[]).join('、')||'—')+'</td><td>'+((x.source_pages||[]).map(p=>'<a href="'+safe(p.url)+'" target="_blank" rel="noopener">'+safe(p.title||new URL(p.url).pathname||'官网页面')+'</a>').join(' · '))+'</td></tr>').join(''):'<tr><td colspan="8" class="empty-state">暂无企业情报结果。请先审核并启动官网采集。</td></tr>';document.querySelector('#ci-result-total').textContent='共 '+d.total+' 家企业';document.querySelector('#ci-result-pagination').innerHTML='<button class="btn secondary" id="ci-prev" '+(pageNo<=1?'disabled':'')+'>上一页</button><span>第 '+d.page+' 页</span><button class="btn secondary" id="ci-next" '+(pageNo*50>=d.total?'disabled':'')+'>下一页</button>';document.querySelector('#ci-prev').onclick=()=>{pageNo=Math.max(1,pageNo-1);load()};document.querySelector('#ci-next').onclick=()=>{pageNo++;load()}}catch(e){rows.innerHTML='<tr><td colspan="8">'+safe(e.message)+'</td></tr>'}}
 document.querySelector('#ci-result-search').onclick=()=>{pageNo=1;load()};load();
}


/* Odoo-style accessible dropdown controls for every application select */
(function initOdooSelects(){
 const enhance=(select)=>{
  if(!(select instanceof HTMLSelectElement)||select.multiple||select.dataset.odooEnhanced)return;
  select.dataset.odooEnhanced='1';
  const wrap=document.createElement('div');wrap.className='odoo-select';
  const button=document.createElement('button');button.type='button';button.className='odoo-select-trigger';button.setAttribute('role','combobox');button.setAttribute('aria-haspopup','listbox');button.setAttribute('aria-expanded','false');
  const label=document.createElement('span');label.className='odoo-select-value';
  const chevron=document.createElement('span');chevron.className='odoo-select-chevron';chevron.setAttribute('aria-hidden','true');chevron.textContent='⌄';
  button.append(label,chevron);
  const menu=document.createElement('div');menu.className='odoo-select-menu';menu.setAttribute('role','listbox');menu.hidden=true;
  wrap.append(button,menu);select.parentNode.insertBefore(wrap,select);wrap.append(select);select.classList.add('odoo-native-select');
  let active=-1;
  const options=()=>Array.from(select.options);
  const sync=()=>{
   const opts=options(),selected=opts[select.selectedIndex];
   const paint=(target,option)=>{target.replaceChildren();const code=option?.dataset?.countryCode;if(select.dataset.countryFlags==='true'){const flag=document.createElement('span');flag.className='country-flag-circle';flag.textContent=code?countryFlag(code):'🌐';const name=document.createElement('span');name.textContent=option?.textContent?.trim()||'请选择';target.append(flag,name)}else target.textContent=option?.textContent?.trim()||'请选择'};paint(label,selected);
   button.disabled=select.disabled;button.setAttribute('aria-label',label.textContent);button.setAttribute('aria-expanded',String(!menu.hidden));
   menu.replaceChildren();
   opts.forEach((option,index)=>{
    if(option.hidden)return;
    const item=document.createElement('button');item.type='button';item.className='odoo-select-option';item.setAttribute('role','option');item.setAttribute('aria-selected',String(index===select.selectedIndex));item.disabled=option.disabled;
    if(select.dataset.countryFlags==='true'){item.classList.add('country-option');const flag=document.createElement('span');flag.className='country-flag-circle';flag.textContent=option.dataset.countryCode?countryFlag(option.dataset.countryCode):'🌐';const name=document.createElement('span');name.textContent=option.textContent.trim();item.append(flag,name)}else item.textContent=option.textContent.trim();
    if(option.disabled&&option.value==='')item.classList.add('is-placeholder');
    item.addEventListener('click',()=>{if(option.disabled)return;select.selectedIndex=index;select.dispatchEvent(new Event('change',{bubbles:true}));sync();close();button.focus()});
    menu.append(item);
   });
  };
  const close=()=>{menu.hidden=true;wrap.classList.remove('is-open');button.setAttribute('aria-expanded','false')};
  const open=()=>{if(button.disabled)return;sync();menu.hidden=false;wrap.classList.add('is-open');button.setAttribute('aria-expanded','true');const selected=menu.querySelector('[aria-selected="true"]');if(selected)selected.scrollIntoView({block:'nearest'})};
  button.addEventListener('click',()=>menu.hidden?open():close());
  button.addEventListener('keydown',e=>{
   const items=Array.from(menu.querySelectorAll('.odoo-select-option:not(:disabled)'));
   if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(menu.hidden)open();if(!items.length)return;active=Math.max(0,items.indexOf(document.activeElement)+(e.key==='ArrowDown'?1:-1));active=Math.min(items.length-1,active);items[active].focus()}
   else if(e.key==='Enter'||e.key===' '){if(menu.hidden){e.preventDefault();open()}else if(document.activeElement.classList.contains('odoo-select-option')){e.preventDefault();document.activeElement.click()}}
   else if(e.key==='Escape'){close();button.focus()}
  });
  menu.addEventListener('keydown',e=>{const items=Array.from(menu.querySelectorAll('.odoo-select-option:not(:disabled)')),i=items.indexOf(document.activeElement);if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();items[Math.max(0,Math.min(items.length-1,i+(e.key==='ArrowDown'?1:-1)))]?.focus()}else if(e.key==='Escape'){close();button.focus()}else if(e.key==='Home'){e.preventDefault();items[0]?.focus()}else if(e.key==='End'){e.preventDefault();items.at(-1)?.focus()}});
  select.addEventListener('change',sync);
  const observer=new MutationObserver(sync);observer.observe(select,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','label','value']});
  document.addEventListener('click',e=>{if(!wrap.contains(e.target))close()});
  sync();
 };
 const scan=root=>{if(root.matches?.('select'))enhance(root);root.querySelectorAll?.('select').forEach(enhance)};
 scan(document);
 new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>{if(node.nodeType===1)scan(node)}))).observe(document.body,{childList:true,subtree:true});
})();
