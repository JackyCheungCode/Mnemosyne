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
function page(){if(!window.__mnSession)return;if(refreshTimer){clearTimeout(refreshTimer);refreshTimer=null}if(detailRefreshTimer){clearTimeout(detailRefreshTimer);detailRefreshTimer=null}const path=location.pathname,params=new URLSearchParams(location.search),tab=params.get('tab')||'',stage=params.get('stage')||'',settings=path.includes('settings'),verify=path.includes('verify'),tasks=path.includes('tasks')||tab==='history',results=path.includes('results'),websites=tab==='websites',review=tab==='review',ciTasks=tab==='intelligence',ciResults=tab==='company-results';document.querySelectorAll('nav a').forEach(a=>{const u=new URL(a.href,location.origin),t=u.searchParams.get('tab')||'';a.classList.toggle('active',u.pathname===path&&t===tab||u.pathname===path&&!t&&!tab||u.pathname==='/search'&&['/','/tasks','/results','/verify'].includes(path)&&!t)});if(settings){if(tab==='search')renderSearchSettings();else if(tab==='regions')renderRegions();else renderSettings();return}if(path.includes('tasks')&&stage){if(stage==='search')renderSearch();else if(stage==='websites')renderWebsites();else if(stage==='review')renderCompanyReview();else if(stage==='intelligence')renderIntelligenceTasks();else if(stage==='verify')renderVerify();else if(stage==='leads')renderIntelligenceResults();else renderTasks();return}if(verify)renderVerify();else if(ciTasks)renderIntelligenceTasks();else if(ciResults)renderIntelligenceResults();else if(review)renderCompanyReview();else if(websites)renderWebsites();else if(tasks)renderTasks();else if(results)renderResults();else renderSearch()}
function renderSearch(){
app.innerHTML=`<div class="eyebrow">DISCOVERY / SEARCH</div><h1 class="title">官网发现</h1><p class="desc">通过 Google 自然搜索发现全球潜在企业官网。配置搜索条件后启动采集，系统会逐页执行并实时反馈进度。</p><div class="task-workspace-note">第一步：设置搜索条件并创建任务。任务启动后，后续操作将在同一个任务工作区完成。</div><section class="panel"><h3>全球企业官网搜索</h3><div class="grid"><div class="field wide"><label>任务名称（可选）</label><input id="task-name" placeholder="例如：德国低压开关设备制造商"></div><div class="field"><label>行业 / 产品关键词</label><input id="kw" value="electrical equipment"></div><div class="field"><label>企业类型</label><select id="type"><option value="manufacturer OR factory OR producer">制造商 / 工厂</option><option value="distributor OR wholesaler">经销商 / 批发商</option><option value='"electrical engineering" OR contractor'>工程公司 / 承包商</option><option value="brand OR company">品牌 / 企业</option></select></div><div class="field"><label>目标国家</label><select id="country" data-country-flags="true">${countryOptions(cfg.country||'global')}</select></div><div class="field"><label>搜索语言</label><select id="lang"><option value="en">英语</option><option value="de">德语</option><option value="fr">法语</option><option value="es">西班牙语</option><option value="ja">日语</option><option value="zh-CN">简体中文</option></select></div><div class="field"><label>必须包含短语（可选）</label><input id="phrase" placeholder="low voltage switchgear"></div><div class="field"><label>起始页码</label><input id="start-page" type="number" min="1" max="100" value="${Number(cfg.startPage)||1}"></div><div class="field"><label>终止页码</label><input id="end-page" type="number" min="1" max="100" value="${Number(cfg.endPage)||1}"></div><div class="field wide"><label>排除类别</label><div class="checks"><label><input type="checkbox" name="ex" value="shop" checked> 电商</label><label><input type="checkbox" name="ex" value="social" checked> 社交</label><label><input type="checkbox" name="ex" value="b2b" checked> B2B 平台</label><label><input type="checkbox" name="ex" value="media" checked> 资讯媒体</label></div></div><div class="field wide"><div class="code-label"><label>实时 Google 搜索语法</label><span class="code-meta">GOOGLE QUERY · LIVE PREVIEW</span></div><pre class="syntax-code"><code id="preview"></code></pre></div></div><p class="task-create-actions"><button class="btn" id="go">创建并启动任务</button><span class="hint">每页约 10 条结果 · 单个任务最多 10 页</span></p><div id="error" class="toast" role="alert"></div></section><div id="live-task" class="live-task" aria-live="polite"></div>`;
document.querySelector('#lang').value=cfg.language||'en';
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
  host.innerHTML='<section class="panel live-panel"><div class="live-head"><div><div class="eyebrow">LIVE COLLECTION STATUS</div><h3>'+safe(t.task_name||t.keyword||t.task_code)+'</h3><p>'+safe(t.task_code)+' · '+safe(t.country||'全球')+' · '+safe(t.language||'en')+'</p></div><span class="status-pill status-'+statusClass(t.status)+'">'+(status[t.status]||t.status)+'</span></div><div class="progress-meta"><strong>采集进度</strong><b>'+percent+'%</b></div><div class="progress-track"><i style="width:'+percent+'%"></i></div><div class="live-stats"><div><small>已完成页</small><b>'+done+' / '+total+'</b></div><div><small>已发现结果</small><b>'+Number(t.total_results||0).toLocaleString()+'</b></div><div><small>失败页</small><b>'+failed.length+'</b></div><div><small>预计剩余</small><b>'+(terminal?'—':eta?'约 '+eta+' 秒':'计算中')+'</b></div></div><div class="log-heading"><strong>执行日志</strong><span>每 2.5 秒自动更新</span></div><div class="live-logs">'+logs+'</div>'+(t.error_summary?'<p class="toast">'+safe(t.error_summary)+'</p>':'')+'<div class="live-actions"><a class="text-btn" href="/search?tab=history">查看历史任务 →</a>'+(terminal?'<a class="btn secondary" href="/tasks?task='+encodeURIComponent(t.task_code)+'">进入任务流程</a>':'<span class="hint">正在自动更新任务状态</span>')+'</div></section>';
  if(terminal){const startButton=document.querySelector('#go');if(startButton){startButton.disabled=false;startButton.textContent='开始新采集'}}else refreshTimer=setTimeout(()=>watchTask(taskCode),2500);
 }catch(e){host.innerHTML='<section class="panel">'+safe(e.message)+'</section>'}
}
function taskStatus(s){return ({queued:'排队中',running:'执行中',partial:'部分完成',completed:'已完成',failed:'执行失败',cancelled:'已取消'})[s]||s||'未知'}
function statusClass(s){return ['completed'].includes(s)?'good':['failed'].includes(s)?'bad':['partial','running'].includes(s)?'maybe':'pending'}
function renderTasks(){
const taskCode=new URLSearchParams(location.search).get('task')||'';
app.innerHTML=`<div class="eyebrow">LEAD ACQUISITION / WORKSPACE</div><h1 class="title">潜客开发任务</h1><p class="desc">一个任务贯穿搜索、官网审核、企业详细信息获取、人工验证和正式线索入库。</p><div class="discovery-tabs"><a href="/search">开始采集</a><a class="active" href="/search?tab=history">历史任务</a></div><div id="task-detail"></div><section class="panel task-filter"><div class="field"><label>按关键词筛选任务</label><input id="task-keyword" placeholder="输入关键词，例如 electrical equipment"></div><button class="btn secondary" id="task-filter-btn">筛选</button><a class="text-btn" href="/search">＋ 开始采集</a></section><div class="table-scroll"><table class="table task-table"><thead><tr><th>任务 ID</th><th>关键词</th><th>国家</th><th>页码范围</th><th>进度</th><th>结果数</th><th>状态</th><th>创建时间</th><th>操作</th></tr></thead><tbody id="task-rows"><tr><td colspan="9">正在加载任务…</td></tr></tbody></table></div><div class="hint" id="task-note"></div>`;
const rows=document.querySelector('#task-rows');
async function load(){try{const d=await taskApi({action:'list_tasks',keyword:document.querySelector('#task-keyword').value,limit:100});rows.innerHTML=d.tasks.length?d.tasks.map(t=>'<tr><td><strong>'+safe(t.task_code)+'</strong></td><td title="'+safe(t.keyword)+'">'+safe(t.keyword)+'</td><td>'+safe(t.country||'全球')+'</td><td>'+t.start_page+'–'+t.end_page+'</td><td>'+t.pages_completed+'/'+(t.end_page-t.start_page+1)+' 页</td><td>'+t.total_results+'</td><td><span class="status-pill status-'+statusClass(t.status)+'">'+taskStatus(t.status)+'</span></td><td>'+new Date(t.created_at).toLocaleString()+'</td><td><a class="text-btn" href="/tasks?task='+encodeURIComponent(t.task_code)+'">进入工作区</a>　<a class="text-btn" href="/tasks?task='+encodeURIComponent(t.task_code)+'&stage=websites">官网列表</a></td></tr>').join(''):'<tr><td colspan="9" class="empty-state">暂无搜索任务。请先创建一个任务。</td></tr>';if(d.tasks.some(t=>['queued','running'].includes(t.status)))refreshTimer=setTimeout(load,3000)}catch(e){rows.innerHTML='<tr><td colspan="9">'+safe(e.message)+'</td></tr>'}}
document.querySelector('#task-filter-btn').onclick=load;
if(taskCode){const host=document.querySelector('#task-detail');async function loadDetail(){try{const {task:t}=await taskApi({action:'get_task',taskCode});const pages=t.search_task_pages||[];host.innerHTML='<section class="panel task-detail"><div class="task-flow"><div class="task-flow-step is-done"><span>1</span><b>创建任务</b><small>搜索条件已保存</small></div><div class="task-flow-step '+(['completed','partial'].includes(t.status)?'is-done':'is-current')+'"><span>2</span><b>开始搜索</b><small>'+taskStatus(t.status)+'</small></div><a class="task-flow-step" href="/tasks?task='+encodeURIComponent(t.task_code)+'&stage=websites"><span>3</span><b>官网列表</b><small>'+Number(t.total_results||0)+' 条结果</small></a><a class="task-flow-step" href="/tasks?task='+encodeURIComponent(t.task_code)+'&stage=review"><span>4</span><b>人工审核</b><small>逐条或批量通过</small></a><a class="task-flow-step" href="/tasks?task='+encodeURIComponent(t.task_code)+'&stage=intelligence"><span>5</span><b>获取详细信息</b><small>审核后手动启动</small></a><a class="task-flow-step" href="/tasks?task='+encodeURIComponent(t.task_code)+'&stage=verify"><span>6</span><b>人工验证</b><small>核实资料准确性</small></a><a class="task-flow-step" href="/tasks?task='+encodeURIComponent(t.task_code)+'&stage=leads"><span>7</span><b>正式线索</b><small>验证通过后入库</small></a></div><div class="task-detail-head"><div><div class="eyebrow">TASK DETAIL</div><h3>'+safe(t.task_code)+' · '+safe(t.task_name||t.keyword)+'</h3><p>'+safe(t.query)+'</p></div><span class="status-pill status-'+statusClass(t.status)+'">'+taskStatus(t.status)+'</span></div><div class="task-metrics"><div><small>关键词</small><b>'+safe(t.keyword)+'</b></div><div><small>页码范围</small><b>'+t.start_page+' – '+t.end_page+'</b></div><div><small>已完成页</small><b>'+t.pages_completed+' / '+pages.length+'</b></div><div><small>搜索结果</small><b>'+t.total_results+'</b></div><div><small>开始时间</small><b>'+(t.started_at?new Date(t.started_at).toLocaleString():'—')+'</b></div><div><small>结束时间</small><b>'+(t.completed_at?new Date(t.completed_at).toLocaleString():'执行中')+'</b></div></div><h4>逐页执行记录</h4><div class="page-status-grid">'+pages.map(p=>'<div class="page-status"><b>第 '+p.page_number+' 页</b><span class="status-pill status-'+statusClass(p.status==='rejected'?'failed':p.status==='queued'?'queued':p.status)+'">'+({queued:'待执行',running:'执行中',completed:'成功',failed:'失败',rejected:'上游拒绝'})[p.status]+'</span><small>'+p.results_count+' 条结果'+(p.error_code?' · '+p.error_code:'')+(p.error_detail?.responsePreview?' · '+safe(p.error_detail.responsePreview):'')+'</small></div>').join('')+'</div>'+(t.error_summary?'<p class="hint">'+safe(t.error_summary)+'</p>':'')+(pages.some(p=>['failed','rejected'].includes(p.status))?'<button class="btn" id="retry-failed">重试失败页</button>　':'')+'<a class="btn secondary" href="/results?task='+encodeURIComponent(t.task_code)+'">查询该任务结果</a></section>';const retryButton=host.querySelector('#retry-failed');if(retryButton)retryButton.onclick=async()=>{retryButton.disabled=true;retryButton.textContent='正在重新排队…';try{await taskApi({action:'retry_failed_pages',taskCode});loadDetail()}catch(e){retryButton.disabled=false;retryButton.textContent='重试失败页';alert(e.message)}};if(['queued','running'].includes(t.status))detailRefreshTimer=setTimeout(loadDetail,2500)}catch(e){host.innerHTML='<section class="panel">'+safe(e.message)+'</section>'}}loadDetail()}
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
app.innerHTML=`<div class="eyebrow">SYSTEM SETTINGS</div><h1 class="title">排除规则库</h1><p class="desc">维护官网发现时需要排除的域名类别。规则会参与 Google 搜索语法生成。</p><div class="discovery-tabs workflow-tabs"><a class="active" href="/settings">排除规则库</a><a href="/settings?tab=search">搜索配置</a><a href="/settings?tab=regions">国家与地区</a></div><section class="panel"><div class="panel-heading"><div><h3>默认排除域名库</h3><p class="section-note">支持逐行添加、修改或删除；只填写域名，例如 example.com，不要添加协议或路径。</p></div><span class="editor-badge">RULE EDITOR</span></div><div id="rule-groups" class="rule-editors"></div><div class="editor-footer"><span class="hint" id="rule-status" aria-live="polite">修改内容会自动保存到当前浏览器</span><span class="save-indicator"><i></i> AUTO SAVE</span></div></section>`;
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
function renderSearchSettings(){
 const current={country:cfg.country||'global',language:cfg.language||'en',startPage:Number(cfg.startPage)||1,endPage:Number(cfg.endPage)||1};
 app.innerHTML='<div class="eyebrow">SYSTEM SETTINGS / SEARCH</div><h1 class="title">搜索配置</h1><p class="desc">设置官网搜索任务的默认参数。创建单个任务时仍可在搜索页面覆盖这些默认值。</p><div class="discovery-tabs workflow-tabs"><a href="/settings">排除规则库</a><a class="active" href="/settings?tab=search">搜索配置</a><a href="/settings?tab=regions">国家与地区</a></div><section class="panel"><h3>默认搜索参数</h3><div class="grid"><div class="field"><label>默认目标国家 / 地区</label><select id="cfg-country" data-country-flags="true">'+countryOptions(current.country)+'</select></div><div class="field"><label>默认搜索语言</label><select id="cfg-language"><option value="en">英语</option><option value="de">德语</option><option value="fr">法语</option><option value="es">西班牙语</option><option value="ja">日语</option><option value="zh-CN">简体中文</option></select></div><div class="field"><label>默认起始页</label><input id="cfg-start" type="number" min="1" max="100" value="'+current.startPage+'"></div><div class="field"><label>默认终止页</label><input id="cfg-end" type="number" min="1" max="100" value="'+current.endPage+'"></div></div><div class="editor-footer"><span class="hint">当前版本：默认参数保存在此浏览器，尚未同步到云端。</span><button class="btn" id="cfg-save">保存默认配置</button></div><p class="hint" id="cfg-status" aria-live="polite"></p></section>';
 document.querySelector('#cfg-language').value=current.language;
 document.querySelector('#cfg-save').onclick=()=>{const start=Math.max(1,Math.min(100,Number(document.querySelector('#cfg-start').value)||1)),end=Math.max(start,Math.min(100,Number(document.querySelector('#cfg-end').value)||start));cfg={...cfg,country:document.querySelector('#cfg-country').value,language:document.querySelector('#cfg-language').value,startPage:start,endPage:end};localStorage.setItem('mnemosyne_cfg',JSON.stringify(cfg));document.querySelector('#cfg-status').textContent='已保存。新建搜索任务时将使用这些默认值。'};
}
function renderRegions(){
 const rows=COUNTRY_CODES.map(code=>({code,name:countryLabel(code),flag:countryFlag(code)}));
 app.innerHTML='<div class="eyebrow">SYSTEM SETTINGS / GEOGRAPHY</div><h1 class="title">国家与地区</h1><p class="desc">全球搜索可用的国家与地区目录。选择具体国家后，系统会将国家代码传递给 Google 搜索；选择“全球”则不限定国家。</p><div class="discovery-tabs workflow-tabs"><a href="/settings">排除规则库</a><a href="/settings?tab=search">搜索配置</a><a class="active" href="/settings?tab=regions">国家与地区</a></div><section class="panel"><div class="website-registry-head"><div><h3>国家 / 地区目录</h3><p class="section-note">ISO 3166-1 国家和地区代码 · '+rows.length+' 项</p></div><span class="editor-badge">GLOBAL COVERAGE</span></div><div class="website-registry-filters"><input id="region-q" placeholder="搜索国家、地区或代码"><span class="hint" id="region-count">'+rows.length+' 个国家 / 地区</span></div><div class="table-scroll"><table class="table"><thead><tr><th>旗帜</th><th>国家 / 地区</th><th>ISO 代码</th><th>搜索代码</th></tr></thead><tbody id="region-rows"></tbody></table></div></section>';
 const body=document.querySelector('#region-rows');
 const draw=()=>{const q=document.querySelector('#region-q').value.trim().toLowerCase(),filtered=rows.filter(x=>(x.name+' '+x.code).toLowerCase().includes(q));body.innerHTML=filtered.map(x=>'<tr><td><span class="country-flag-circle">'+x.flag+'</span></td><td>'+safe(x.name)+'</td><td>'+x.code+'</td><td><code>'+x.code.toLowerCase()+'</code></td></tr>').join('')||'<tr><td colspan="4" class="empty-state">没有匹配的国家或地区</td></tr>';document.querySelector('#region-count').textContent='显示 '+filtered.length+' / '+rows.length+' 项'};
 document.querySelector('#region-q').oninput=draw;draw();
}
function safe(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
initAuth();
async function renderVerify(){
 const searchTaskCode=new URLSearchParams(location.search).get('task')||'';
 app.innerHTML='<div class="eyebrow">LEAD ACQUISITION / HUMAN REVIEW</div><h1 class="title">企业人工验证</h1><p class="desc">逐家核实采集到的企业资料。只有标记为“验证通过”的企业才会进入正式线索列表。</p>'+
 (searchTaskCode?'<section class="panel task-context"><h3>当前任务：'+safe(searchTaskCode)+'</h3><p>仅显示该任务获取详细信息的企业。</p><a class="text-btn" href="/tasks?task='+encodeURIComponent(searchTaskCode)+'&stage=verify">← 返回当前任务</a></section>':'')+
 '<section class="panel"><div class="review-control-top"><div><h3>待人工验证企业</h3><p class="section-note">机器采集结果仅作为参考，必须人工确认后才进入线索库。</p></div><button class="btn secondary" id="verify-refresh">刷新</button></div><div class="table-scroll"><table class="table"><thead><tr><th>企业名称 / 官网</th><th>国家与地址</th><th>公开联系方式</th><th>主营产品</th><th>验证备注</th><th>操作</th></tr></thead><tbody id="verify-rows"><tr><td colspan="6">正在加载企业资料…</td></tr></tbody></table></div><p class="hint" id="verify-message"></p></section>';
 const rows=document.querySelector('#verify-rows'),message=document.querySelector('#verify-message');
 async function load(){
  rows.innerHTML='<tr><td colspan="6">正在加载…</td></tr>';
  try{
   const d=await intelligenceApi({action:'list_companies',verificationStatus:'pending',searchTaskCode,limit:200});
   rows.innerHTML=d.companies.length?d.companies.map(x=>{
    const sites=(x.company_websites||[]).map(z=>z.websites).filter(Boolean);
    const domains=sites.map(w=>w.normalized_host).join('、');
    return '<tr><td><strong>'+safe(x.company_name||'未命名企业')+'</strong><br><small>'+safe(domains||'无关联官网')+'</small></td><td>'+safe([x.country,x.address].filter(Boolean).join(' · ')||'—')+'</td><td>'+safe([...(x.emails||[]),...(x.phones||[])].join(' / ')||'—')+'</td><td>'+safe((x.main_products||[]).join('、')||'—')+'</td><td><input class="verify-note" data-id="'+safe(x.id)+'" placeholder="填写人工核验备注" value="'+safe(x.verification_notes||'')+'"></td><td><button class="btn" data-verify="verified" data-id="'+safe(x.id)+'">验证通过</button> <button class="btn secondary" data-verify="rejected" data-id="'+safe(x.id)+'">排除</button></td></tr>';
   }).join(''):'<tr><td colspan="6" class="empty-state">当前任务没有待验证企业。请先完成官网审核并获取详细信息。</td></tr>';
   message.textContent='待验证企业：'+d.total+' 家';
  }catch(e){rows.innerHTML='<tr><td colspan="6">'+safe(e.message)+'</td></tr>'}
 }
 rows.addEventListener('click',async e=>{
  const button=e.target.closest('[data-verify]');if(!button)return;
  const id=button.dataset.id,decision=button.dataset.verify;
  const note=document.querySelector('.verify-note[data-id="'+CSS.escape(id)+'"]')?.value||'';
  button.disabled=true;button.textContent='正在保存…';
  try{await intelligenceApi({action:'verify_company',companyId:id,decision,notes:note});await load()}
  catch(err){message.textContent=err.message;button.disabled=false;button.textContent=decision==='verified'?'验证通过':'排除'}
 });
 document.querySelector('#verify-refresh').onclick=load;
 load();
}
async function intelligenceApi(body){const r=await fetch('/api/intelligence',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw new Error(d.error||'情报服务请求失败');return d}
function workflowHeader(active,title,desc){const p=new URLSearchParams(location.search),task=p.get('task')||'',stage=active==='websites'?'websites':active==='review'?'review':active==='tasks'?'intelligence':active==='results'?'leads':active;const stages=[['search','创建任务'],['websites','官网列表'],['review','人工审核'],['intelligence','获取详细信息'],['verify','人工验证'],['leads','正式线索']];const base='/tasks?task='+encodeURIComponent(task)+'&stage=';return '<div class="eyebrow">任务工作区'+(task?' / '+safe(task):'')+'</div><h1 class="title">'+title+'</h1><p class="desc">'+desc+'</p>'+(task?'<nav class="task-stage-nav" aria-label="任务阶段">'+stages.map(([key,label],i)=>'<a class="'+(stage===key?'active':'')+'" href="'+base+key+'"><span>'+(i+1)+'</span>'+label+'</a>').join('')+'</nav>':'<div class="task-workspace-note">所有操作都围绕当前搜索任务进行。请从任务列表进入具体任务。</div>')}
function renderWebsites(){
 app.innerHTML=workflowHeader('websites','候选官网','统一管理去重后的网站主体。每个网站保留全部搜索发现来源，审核和采集状态在此集中查看。')+
 '<section class="panel website-registry"><div class="website-registry-head"><div><h3>网站主体</h3><p class="section-note">一个规范化主机名对应一个网站主体；重复搜索只增加来源记录，不重复创建网站。</p></div><a class="btn" href="/search?tab=review">进入官网审核</a></div>'+
 '<div class="website-registry-filters"><input id="website-q" placeholder="搜索域名、标题或搜索关键词"><select id="website-state"><option value="all">全部状态</option><option value="pending">待审核</option><option value="approved">已通过</option><option value="rejected">已排除</option><option value="not_collected">未采集</option><option value="queued">等待采集</option><option value="running">采集中</option><option value="completed">已完成</option><option value="failed">采集失败</option></select><button class="btn secondary" id="website-refresh">刷新</button></div>'+
 '<div class="website-registry-summary" id="website-summary">正在读取网站主体…</div><div class="table-scroll"><table class="table website-registry-table"><thead><tr><th>网站主体</th><th>国家</th><th>搜索来源</th><th>审核状态</th><th>采集状态</th><th>首次发现</th><th>最近发现</th><th>操作</th></tr></thead><tbody id="website-rows"><tr><td colspan="8">正在加载…</td></tr></tbody></table></div></section>';
 const rows=document.querySelector('#website-rows');let websites=[],expanded=new Set();
 const reviewText={pending:'待审核',approved:'已通过',rejected:'已排除'},collectText={not_collected:'未采集',queued:'等待采集',running:'采集中',completed:'已完成',partial:'部分完成',failed:'失败',cancelled:'已取消'};
 const fmt=v=>v?new Date(v).toLocaleString():'—';
 const draw=()=>{
  const q=document.querySelector('#website-q').value.trim().toLowerCase(),state=document.querySelector('#website-state').value;
  const list=websites.filter(w=>{const search=[w.title,w.domain,w.url,...(w.sources||[]).flatMap(s=>[s.keyword,s.title,s.original_url,s.snippet])].some(v=>String(v||'').toLowerCase().includes(q));const match=state==='all'||w.review_status===state||w.collection_status===state;return(!q||search)&&match});
  const approved=websites.filter(w=>w.review_status==='approved').length,done=websites.filter(w=>w.collection_status==='completed').length,waiting=websites.filter(w=>w.collection_status==='not_collected').length;
  document.querySelector('#website-summary').innerHTML='<span>网站主体 <b>'+websites.length+'</b></span><span>已通过 <b>'+approved+'</b></span><span>未采集 <b>'+waiting+'</b></span><span>已完成 <b>'+done+'</b></span><span>当前筛选 <b>'+list.length+'</b></span>';
  rows.innerHTML=list.length?list.map(w=>{const open=expanded.has(w.id),sources=w.sources||[];return '<tr><td><strong>'+safe(w.title||w.domain)+'</strong><small><a href="'+safe(w.url)+'" target="_blank" rel="noopener">'+safe(w.domain)+'</a></small></td><td>'+safe(w.country||'—')+'</td><td><b>'+Number(w.source_count||sources.length)+'</b><small>条发现记录</small></td><td><span class="status-pill '+(w.review_status==='approved'?'status-good':w.review_status==='rejected'?'status-bad':'status-pending')+'">'+(reviewText[w.review_status]||'待审核')+'</span>'+(w.review_reason?'<small>'+safe(w.review_reason)+'</small>':'')+'</td><td><span class="status-pill status-'+(w.collection_status==='completed'?'good':w.collection_status==='failed'?'bad':w.collection_status==='running'?'active':'pending')+'">'+(collectText[w.collection_status]||w.collection_status||'未采集')+'</span></td><td>'+fmt(w.first_discovered_at)+'</td><td>'+fmt(w.discovered_at)+'</td><td><button class="text-btn website-sources-toggle" data-id="'+safe(w.id)+'">'+(open?'收起来源':'查看来源')+'</button></td></tr>'+(open?'<tr class="website-source-detail"><td colspan="8"><div class="website-source-title">搜索发现来源 · '+sources.length+' 条</div><div class="table-scroll"><table class="table"><thead><tr><th>搜索关键词</th><th>国家 / 语言</th><th>页码 / 排名</th><th>搜索标题</th><th>原始链接</th><th>发现时间</th></tr></thead><tbody>'+(sources.length?sources.map(s=>'<tr><td>'+safe(s.keyword||'—')+'</td><td>'+safe(s.country||'—')+' / '+safe(s.language||'—')+'</td><td>'+safe(s.page_number||'—')+' / '+safe(s.result_rank||'—')+'</td><td>'+safe(s.title||'—')+'</td><td><a href="'+safe(s.original_url||s.source_url||'#')+'" target="_blank" rel="noopener">打开来源</a></td><td>'+fmt(s.discovered_at)+'</td></tr>').join(''):'<tr><td colspan="6">暂无来源记录</td></tr>')+'</tbody></table></div></td></tr>':'')}).join(''):'<tr><td colspan="8" class="empty-state">暂无符合条件的网站主体。请先创建并执行搜索任务。</td></tr>';
 };
 async function load(){rows.innerHTML='<tr><td colspan="8">正在读取网站主体…</td></tr>';try{const d=await intelligenceApi({action:'list_candidates',searchTaskCode:new URLSearchParams(location.search).get('task')||''});websites=d.candidates||[];draw()}catch(e){rows.innerHTML='<tr><td colspan="8">'+safe(e.message)+'</td></tr>'}}
 document.querySelector('#website-q').oninput=draw;document.querySelector('#website-state').onchange=draw;document.querySelector('#website-refresh').onclick=load;
 rows.addEventListener('click',e=>{const b=e.target.closest('.website-sources-toggle');if(!b)return;const id=b.dataset.id;expanded.has(id)?expanded.delete(id):expanded.add(id);draw()});
 load();
}
function renderCompanyReview(){
 const workflowTaskCode=new URLSearchParams(location.search).get('task')||'';
 app.innerHTML=(workflowTaskCode?'<section class="panel task-context"><div class="eyebrow">TASK WORKFLOW</div><h3>当前任务：'+safe(workflowTaskCode)+'</h3><p>只显示本次搜索发现的官网。审核通过不会自动采集，请在确认后手动启动详细信息获取。</p><a class="text-btn" href="/tasks?task='+encodeURIComponent(workflowTaskCode)+'">← 返回任务流程</a></section>':'')+workflowHeader('review','官网审核','以网站主体为单位审核全球官网候选。审核通过不会自动采集，只有你明确勾选并启动后才会创建采集批次。')+
 '<section class="panel review-control"><div class="review-control-top"><div><h3>候选官网</h3><p class="section-note">同一域名只显示一个网站主体；所有搜索关键词和搜索任务来源均保留在详情来源记录中。</p></div><div class="review-count"><strong id="review-count">0</strong><span>已选择</span></div></div>'+
 '<div class="review-filters"><input id="review-keyword" placeholder="搜索企业名称 / 域名 / 来源关键词"><select id="review-status" aria-label="审核状态"><option value="all">全部审核状态</option><option value="pending">待审核</option><option value="approved">已通过</option><option value="rejected">已排除</option></select><button class="btn secondary" id="review-search">筛选</button><button class="btn secondary" id="review-refresh">刷新列表</button></div>'+
 '<div class="review-toolbar"><label class="select-all"><input type="checkbox" id="review-all"> 全选当前结果</label><span id="review-total" class="hint">正在加载候选官网…</span><div class="review-bulk-actions"><button class="btn secondary" id="review-approve">批量通过</button><select id="review-reason" aria-label="排除原因"><option value="">选择排除原因</option><option value="电商平台">电商平台</option><option value="社交媒体">社交媒体</option><option value="新闻资讯">新闻资讯</option><option value="B2B平台">B2B平台</option><option value="搜索引擎或跳转域名">搜索引擎或跳转域名</option><option value="个人网站">个人网站</option><option value="无关网站">无关网站</option><option value="其他">其他</option></select><button class="btn secondary" id="review-reject">批量排除</button></div></div>'+
 '<div class="table-scroll"><table class="table company-review-table"><thead><tr><th></th><th>网站主体 / 页面标题</th><th>官网域名</th><th>国家</th><th>来源关键词 / 来源数</th><th>审核状态 / 排除原因</th><th>最近发现</th></tr></thead><tbody id="review-rows"><tr><td colspan="7">正在加载…</td></tr></tbody></table></div>'+
 '<div class="review-footer"><span class="hint" id="review-message">先选择网站并批量审核；通过后可勾选已通过网站，手动开始采集。</span><div><button class="btn secondary" id="review-save">保存审核变更</button><button class="btn" id="review-start">审核通过并开始采集</button></div></div></section><div id="review-live"></div>';
 const rows=document.querySelector('#review-rows');
 let candidates=[],selected=new Set(),decisions=new Map(),filtered=[];
 const statusLabel={approved:'已通过',rejected:'已排除',pending:'待审核'};
 const draw=()=>{
  const q=document.querySelector('#review-keyword').value.trim().toLowerCase(),status=document.querySelector('#review-status').value;
  filtered=candidates.filter(x=>(status==='all'||(decisions.get(x.id)?.decision||x.review_status)===status)&&(!q||[x.title,x.domain,x.keyword,x.description,...(x.sources||[]).map(s=>s.keyword)].some(v=>String(v||'').toLowerCase().includes(q))));
  rows.innerHTML=filtered.length?filtered.map(x=>{const d=decisions.get(x.id)||{decision:x.review_status,reason:x.review_reason||''};return '<tr><td><input class="review-check" type="checkbox" data-id="'+safe(x.id)+'" '+(selected.has(x.id)?'checked':'')+'></td><td title="'+safe(x.title)+'"><strong>'+safe(x.title||x.domain)+'</strong><small>'+safe(x.description||'暂无搜索摘要')+'</small></td><td><a href="'+safe(x.url)+'" target="_blank" rel="noopener">'+safe(x.domain)+'</a></td><td>'+safe(x.country||'未标注')+'</td><td>'+safe(x.keyword||'—')+'<small>来源 '+Number(x.source_count||0)+' 条</small></td><td><span class="status-pill '+(d.decision==='approved'?'status-good':d.decision==='rejected'?'status-bad':'status-pending')+'">'+(statusLabel[d.decision]||'待审核')+'</span>'+(d.reason?'<small>原因：'+safe(d.reason)+'</small>':'')+'</td><td>'+ (x.discovered_at?new Date(x.discovered_at).toLocaleDateString():'—')+'</td></tr>'}).join(''):'<tr><td colspan="7" class="empty-state">没有符合条件的网站。可调整筛选条件或先执行官网搜索。</td></tr>';
  document.querySelector('#review-total').textContent='共 '+filtered.length+' 个网站主体';
  document.querySelector('#review-count').textContent=selected.size;
  document.querySelector('#review-all').checked=filtered.length>0&&filtered.every(x=>selected.has(x.id));
 };
 const load=async()=>{
  rows.innerHTML='<tr><td colspan="7">正在读取网站主体…</td></tr>';
  try{const d=await intelligenceApi({action:'list_candidates',searchTaskCode:workflowTaskCode});candidates=d.candidates||[];decisions=new Map(candidates.map(x=>[x.id,{decision:x.review_status||'pending',reason:x.review_reason||''}]));selected.clear();draw()}
  catch(e){rows.innerHTML='<tr><td colspan="7">'+safe(e.message)+'</td></tr>'}
 };
 const save=async()=>{
  const items=[...decisions.entries()].filter(([id,d])=>{const x=candidates.find(c=>c.id===id);return x&&(d.decision!==x.review_status||String(d.reason||'')!==String(x.review_reason||''))}).map(([id,d])=>({id,decision:d.decision,reason:d.reason||null}));
  if(!items.length)return {saved:0};
  return intelligenceApi({action:'save_review',items});
 };
 const setDecision=(decision,reason=null)=>{
  if(!selected.size){document.querySelector('#review-message').textContent='请先勾选需要处理的网站。';return}
  for(const id of selected){const prev=decisions.get(id)||{};decisions.set(id,{decision,reason:decision==='rejected'?reason:null})}
  document.querySelector('#review-message').textContent='已暂存 '+selected.size+' 个网站的审核决定，请保存审核变更。';draw();
 };
 rows.addEventListener('change',e=>{const c=e.target.closest('.review-check');if(!c)return;if(c.checked)selected.add(c.dataset.id);else selected.delete(c.dataset.id);draw()});
 document.querySelector('#review-all').onchange=e=>{filtered.forEach(x=>e.target.checked?selected.add(x.id):selected.delete(x.id));draw()};
 document.querySelector('#review-search').onclick=draw;document.querySelector('#review-keyword').oninput=draw;document.querySelector('#review-status').onchange=draw;document.querySelector('#review-refresh').onclick=load;
 document.querySelector('#review-approve').onclick=()=>setDecision('approved');
 document.querySelector('#review-reject').onclick=()=>{const reason=document.querySelector('#review-reason').value;if(!reason){document.querySelector('#review-message').textContent='请先选择排除原因。';return}setDecision('rejected',reason)};
 document.querySelector('#review-save').onclick=async()=>{const b=document.querySelector('#review-save');b.disabled=true;try{const d=await save();document.querySelector('#review-message').textContent='审核变更已保存：'+d.saved+' 条';await load()}catch(e){document.querySelector('#review-message').textContent=e.message}finally{b.disabled=false}};
 document.querySelector('#review-start').onclick=async()=>{const ids=[...selected].filter(id=>(decisions.get(id)?.decision||'pending')==='approved');if(!ids.length){document.querySelector('#review-message').textContent='请勾选至少一个已审核通过的网站。';return}const b=document.querySelector('#review-start');b.disabled=true;b.textContent='正在创建采集批次…';try{await save();const searchTaskCode=new URLSearchParams(location.search).get('task')||'';const d=await intelligenceApi({action:'create_task',ids,searchTaskCode,taskName:(searchTaskCode?searchTaskCode+' · ':'')+'官网采集批次 · '+new Date().toLocaleString()});history.pushState(null,'','/search?tab=intelligence&task='+encodeURIComponent(d.task.task_code));page()}catch(e){document.querySelector('#review-message').textContent=e.message;b.disabled=false;b.textContent='审核通过并开始采集'}};
 load();
}
function renderIntelligenceTasks(){
 const params=new URLSearchParams(location.search),code=params.get('batch')||'';
 app.innerHTML=workflowHeader('tasks','官网情报采集任务','动态查看每家企业官网的访问、页面发现、字段提取和最终处理状态。')+'<div id="ci-task-detail"></div><section class="panel"><div class="task-list-head"><h3>采集批次</h3><span class="hint">自动刷新任务进度</span></div><div id="ci-task-list" class="ci-task-list"><div class="skeleton-line"></div></div></section>';
 const list=document.querySelector('#ci-task-list'),detail=document.querySelector('#ci-task-detail');
 async function load(){try{const d=await intelligenceApi({action:'list_tasks',sourceSearchTaskCode:new URLSearchParams(location.search).get('task')||new URLSearchParams(location.search).get('sourceTask')||''});list.innerHTML=d.tasks.length?d.tasks.map(t=>{const total=Number(t.total_items)||0,done=Number(t.completed_items)||0,failed=Number(t.failed_items)||0,pct=total?Math.min(100,Math.round((done+failed)/total*100)):0;return '<button class="ci-task-card" data-code="'+safe(t.task_code)+'"><span class="ci-task-orb '+safe(t.status)+'"><i></i></span><span class="ci-task-main"><b>'+safe(t.task_name)+'</b><small>'+safe(t.task_code)+' · '+new Date(t.created_at).toLocaleString()+'</small><span class="ci-mini-track"><i style="width:'+pct+'%"></i></span></span><span class="ci-task-numbers"><b>'+done+'/'+total+'</b><small>'+({queued:'排队中',running:'执行中',completed:'已完成',partial:'部分完成',failed:'失败',cancelled:'已取消'})[t.status]||t.status+'</small></span></button>'}).join(''):'<div class="empty-state">暂无情报采集任务。请先在「官网审核」中选择官网并启动采集。</div>';if(d.tasks.some(t=>['queued','running'].includes(t.status)))refreshTimer=setTimeout(load,2500)}catch(e){list.textContent=e.message}}
 async function show(taskCode){try{const {task:t}=await intelligenceApi({action:'get_task',taskCode});const items=t.company_intelligence_items||[],done=items.filter(x=>x.status==='completed').length,failed=items.filter(x=>x.status==='failed').length,total=items.length,pct=total?Math.round((done+failed)/total*100):0;detail.innerHTML='<section class="panel ci-live-panel"><div class="ci-live-top"><div><div class="eyebrow">LIVE ENRICHMENT PIPELINE</div><h3>'+safe(t.task_name)+'</h3><small>'+safe(t.task_code)+'</small></div><span class="status-pill status-'+statusClass(t.status)+'">'+({queued:'排队中',running:'正在采集',completed:'已完成',partial:'部分完成',failed:'执行失败',cancelled:'已取消'})[t.status]+'</span></div><div class="ci-progress-caption"><span>企业处理进度</span><b>'+pct+'%</b></div><div class="ci-progress"><i style="width:'+pct+'%"></i></div><div class="ci-live-metrics"><div><small>官网总数</small><b>'+total+'</b></div><div><small>已完成</small><b>'+done+'</b></div><div><small>失败</small><b>'+failed+'</b></div><div><small>待处理</small><b>'+items.filter(x=>['queued','crawling','extracting'].includes(x.status)).length+'</b></div></div><div class="ci-stage-list">'+items.map(x=>'<div class="ci-stage-row"><span class="ci-stage-icon '+safe(x.status)+'"><i></i></span><span><b>'+safe(x.domain)+'</b><small>'+safe(x.error_message||((x.pages_crawled||0)+' 个页面已采集'))+'</small></span><em class="ci-stage-status">'+({queued:'等待中',crawling:'正在访问官网',extracting:'正在提取',completed:'已完成',partial:'部分完成',failed:'失败',cancelled:'已取消'})[x.status]+'</em>'+(x.status==='failed'?'<button class="btn secondary retry-item" data-retry-item="'+safe(x.id)+'" data-retry-task="'+safe(taskCode)+'">重试</button>':'')+'</div>').join('')+'</div><div class="live-actions"><a class="btn secondary" href="/tasks?task='+encodeURIComponent(new URLSearchParams(location.search).get('task')||'')+'&stage=leads">查看正式线索</a></div></section>';if(['queued','running'].includes(t.status))detailRefreshTimer=setTimeout(()=>show(taskCode),2500)}catch(e){detail.innerHTML='<section class="panel">'+safe(e.message)+'</section>'}}
 detail.addEventListener('click',async e=>{const b=e.target.closest('[data-retry-item]');if(!b)return;b.disabled=true;b.textContent='正在重试…';try{await intelligenceApi({action:'retry_items',taskCode:b.dataset.retryTask,itemIds:[b.dataset.retryItem]});await show(b.dataset.retryTask)}catch(err){b.disabled=false;b.textContent='重试';const msg=document.createElement('small');msg.className='retry-error';msg.textContent=err.message;b.after(msg)}});
 list.onclick=e=>{const b=e.target.closest('[data-code]');if(b)show(b.dataset.code)};load();if(code)show(code);
}
function renderIntelligenceResults(){
 app.innerHTML=workflowHeader('results','正式线索列表','这里只展示已经通过人工验证的企业。')+'<div id="ci-company-detail"></div><section class="panel result-filters ci-result-filters"><div class="field"><label>企业名称 / 官网域名</label><input id="ci-domain" placeholder="输入企业名称或域名"></div><button class="btn" id="ci-result-search">查询企业</button><span class="hint" id="ci-result-total"></span></section><div class="table-scroll"><table class="table ci-results-table"><thead><tr><th>企业名称</th><th>关联官网</th><th>国家 / 地址</th><th>公开邮箱</th><th>电话</th><th>社媒</th><th>主营产品</th><th>采集时间</th></tr></thead><tbody id="ci-result-rows"><tr><td colspan="8">正在加载…</td></tr></tbody></table></div><div class="pagination" id="ci-result-pagination"></div>';
 let pageNo=1;const rows=document.querySelector('#ci-result-rows'),detail=document.querySelector('#ci-company-detail');
 const latestVersion=c=>(c.company_intelligence_versions||[]).slice().sort((a,b)=>new Date(b.collected_at)-new Date(a.collected_at))[0]||null;
 async function load(){try{const term=document.querySelector('#ci-domain').value.trim();const d=await intelligenceApi({action:'list_companies',keyword:term,domain:term,verifiedOnly:true,searchTaskCode:new URLSearchParams(location.search).get('task')||'',page:pageNo,limit:50});rows.innerHTML=d.companies.length?d.companies.map(x=>{const sites=(x.company_websites||[]).map(cw=>cw.websites).filter(Boolean),domains=sites.map(w=>w.normalized_host),emails=Array.isArray(x.emails)?x.emails:[],phones=Array.isArray(x.phones)?x.phones:[],products=Array.isArray(x.main_products)?x.main_products:[];return '<tr><td><button class="text-btn ci-company-open" data-company-id="'+safe(x.id)+'"><strong>'+safe(x.company_name||'未命名企业')+'</strong></button><small>'+safe(x.description||'')+'</small></td><td>'+domains.map((d,i)=>'<a href="'+safe(sites[i].canonical_url||('https://'+d))+'" target="_blank" rel="noopener">'+safe(d)+'</a>').join('<br>')+'</td><td>'+safe([x.country,x.address].filter(Boolean).join(' · ')||'—')+'</td><td>'+safe(emails.join(' / ')||'—')+'</td><td>'+safe(phones.join(' / ')||'—')+'</td><td>'+Object.entries(x.social_links||{}).map(([k,v])=>'<a href="'+safe(v)+'" target="_blank" rel="noopener">'+safe(k)+'</a>').join(' ')+'</td><td>'+safe(products.join('、')||'—')+'</td><td>'+ (x.last_collected_at?new Date(x.last_collected_at).toLocaleString():'—')+'</td></tr>'}).join(''):'<tr><td colspan="8" class="empty-state">暂无企业档案。请先审核并启动官网采集。</td></tr>';document.querySelector('#ci-result-total').textContent='共 '+d.total+' 家企业';document.querySelector('#ci-result-pagination').innerHTML='<button class="btn secondary" id="ci-prev" '+(pageNo<=1?'disabled':'')+'>上一页</button><span>第 '+d.page+' 页</span><button class="btn secondary" id="ci-next" '+(pageNo*50>=d.total?'disabled':'')+'>下一页</button>';document.querySelector('#ci-prev').onclick=()=>{pageNo=Math.max(1,pageNo-1);load()};document.querySelector('#ci-next').onclick=()=>{pageNo++;load()}}catch(e){rows.innerHTML='<tr><td colspan="8">'+safe(e.message)+'</td></tr>'}}
 async function openCompany(id){detail.innerHTML='<section class="panel">正在读取企业档案…</section>';try{const {company:c}=await intelligenceApi({action:'get_company',companyId:id}),sites=c.company_websites||[],versions=(c.company_intelligence_versions||[]).slice().sort((a,b)=>new Date(b.collected_at)-new Date(a.collected_at));detail.innerHTML='<section class="panel ci-company-profile"><div class="ci-live-top"><div><div class="eyebrow">COMPANY PROFILE</div><h3>'+safe(c.company_name)+'</h3><small>'+safe(c.country||'国家未标注')+' · '+safe(c.profile_status)+'</small></div><button class="text-btn" id="ci-company-close">收起详情</button></div><p>'+safe(c.description||'暂无企业简介')+'</p><div class="ci-company-grid"><div><small>地址</small><b>'+safe(c.address||'—')+'</b></div><div><small>公开邮箱</small><b>'+safe((c.emails||[]).join(' / ')||'—')+'</b></div><div><small>电话</small><b>'+safe((c.phones||[]).join(' / ')||'—')+'</b></div><div><small>主营产品</small><b>'+safe((c.main_products||[]).join('、')||'—')+'</b></div></div><h4>关联官网</h4><div class="ci-company-sites">'+sites.map(cw=>cw.websites?'<div><a href="'+safe(cw.websites.canonical_url||('https://'+cw.websites.normalized_host))+'" target="_blank" rel="noopener">'+safe(cw.websites.normalized_host)+'</a><small>'+safe(cw.relationship_type)+' · '+(cw.is_primary?'主官网':'关联网站')+' · '+safe(cw.websites.collection_status)+'</small></div>':'').join('')+'</div><h4>采集历史版本</h4><div class="ci-version-list">'+versions.map((v,i)=>'<div><b>版本 '+(versions.length-i)+'</b><small>'+new Date(v.collected_at).toLocaleString()+' · 来源页面 '+(v.source_pages||[]).length+' 个</small><span>'+((v.source_pages||[]).slice(0,4).map(p=>'<a href="'+safe(p.url)+'" target="_blank" rel="noopener">'+safe(p.title||p.url)+'</a>').join(' · '))+'</span></div>').join('')+'</div></section>';document.querySelector('#ci-company-close').onclick=()=>detail.innerHTML=''}catch(e){detail.innerHTML='<section class="panel">'+safe(e.message)+'</section>'}}
 document.querySelector('#ci-result-search').onclick=()=>{pageNo=1;detail.innerHTML='';load()};rows.addEventListener('click',e=>{const b=e.target.closest('[data-company-id]');if(b)openCompany(b.dataset.companyId)});load();
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
