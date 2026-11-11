import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"https://mnemosyne-console.pages.dev","Access-Control-Allow-Headers":"authorization, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json","Cache-Control":"no-store"};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:cors});
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const secretRaw=Deno.env.get("SUPABASE_SECRET_KEYS");
const serviceKey=secretRaw?JSON.parse(secretRaw).default:Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const db=createClient(Deno.env.get("SUPABASE_URL")!,serviceKey!,{auth:{persistSession:false,autoRefreshToken:false}});
const parse=(s:string)=>{try{return JSON.parse(s)}catch{return null}};
function isOrganicRow(x:any){return !!x&&typeof x==="object"&&!!(x.link||x.url||x.href||x.destination||x.targetUrl||x.displayedUrl)&&!!(x.title||x.name||x.text||x.description||x.snippet||x.position||x.rank)}
function organicOf(input:any,depth=0):any[]|null{
 if(depth>10||input==null)return null;
 let v=input;
 if(typeof v==="string"){const p=parse(v);if(p==null)return null;v=p}
 if(Array.isArray(v)){
  const rows=v.filter(isOrganicRow);
  if(rows.length)return rows;
  for(const item of v){const nested=organicOf(item,depth+1);if(nested!==null)return nested}
  return null;
 }
 if(typeof v!=="object")return null;
 for(const k of ["organicResults","organic_results","organic","organic_results_list","organicResultsList","nonPromotedSearchResults","organic_results_items"]){
  if(Object.prototype.hasOwnProperty.call(v,k)){
   const x=v[k];
   if(Array.isArray(x))return x.filter(isOrganicRow);
   const nested=organicOf(x,depth+1);
   if(nested!==null)return nested;
  }
 }
 for(const k of ["serp","data","result","results","body","response","content","payload","items","searchResults","search_results"]){
  if(Object.prototype.hasOwnProperty.call(v,k)){
   const nested=organicOf(v[k],depth+1);
   if(nested!==null)return nested;
  }
 }
 for(const [k,x] of Object.entries(v)){
  if(["searchQuery","search_query","query","url","searchUrl","search_url","html","htmlSnapshot","paidResults","paid_results","paidProducts","relatedQueries","related_queries","peopleAlsoAsk","people_also_ask","shoppingResults","imageResults","videoResults","localResults","knowledgeGraph","siteLinks","sitelinks"].includes(k))continue;
  if(x&&typeof x==="object"){
   const nested=organicOf(x,depth+1);
   if(nested!==null)return nested;
  }else if(typeof x==="string"&&/^(organic|results|items|data|response|payload)/i.test(k)){
   const nested=organicOf(x,depth+1);
   if(nested!==null)return nested;
  }
 }
 return null;
}
function schemaShape(input:any){
 const root=Array.isArray(input)?input[0]:input;
 const obj=root&&typeof root==="object"?root:{};
 const arrays:Record<string,unknown>={};
 for(const [k,v] of Object.entries(obj)){
  if(Array.isArray(v))arrays[k]={type:"array",length:v.length,firstItemKeys:v[0]&&typeof v[0]==="object"?Object.keys(v[0]).slice(0,20):[]};
  else if(typeof v==="string"&&/organic|result|item|data/i.test(k))arrays[k]={type:"string",preview:v.slice(0,160)};
  else if(v&&typeof v==="object")arrays[k]={type:"object",keys:Object.keys(v as object).slice(0,20)};
 }
 return {rootType:Array.isArray(input)?"array":typeof input,rootLength:Array.isArray(input)?input.length:undefined,topLevelKeys:Object.keys(obj).slice(0,40),fields:arrays};
}
function resolveGoogle(raw:string){let current=String(raw||"").trim();for(let d=0;d<3;d++){let u:URL;try{u=new URL(current)}catch{return current}const h=u.hostname.toLowerCase().replace(/^www\./,"");if(!(h==="google.com"||h.endsWith(".google.com")))return current;let target="";for(const k of ["url","q","adurl","u","target"]){const value=u.searchParams.get(k);if(!value)continue;let c=value;for(let i=0;i<2;i++){try{c=decodeURIComponent(c)}catch{break}}try{const dest=new URL(c);if(["http:","https:"].includes(dest.protocol)&&!(dest.hostname==="google.com"||dest.hostname.endsWith(".google.com"))){target=dest.toString();break}}catch{}}if(!target)return "";current=target}return current}
function normalize(x:any,i:number){const raw=x?.link||x?.url||x?.href||x?.destination||x?.targetUrl||x?.displayedUrl||"";const url=resolveGoogle(raw);let domain="";try{domain=new URL(url).hostname.replace(/^www\./,"")}catch{}return{rank:Number(x?.global_rank||x?.position||x?.rank||i+1),title:String(x?.title||x?.name||""),url,domain,source_url:raw!==url?raw:null,description:String(x?.description||x?.snippet||x?.text||"")}}
async function claimSerpQuerySlot(zone:string,queryHash:string){const {data,error}=await db.rpc("claim_serp_query_slot",{p_zone:zone,p_query_hash:queryHash,p_cooldown_seconds:16});if(error)throw error;const row=Array.isArray(data)?data[0]:data;const wait=Number(row?.wait_seconds)||0;if(wait>0)await sleep(wait*1000+150)}
async function fetchPage(url:string,token:string,queryHash:string,country:string,language:string){
 let last:any=null;for(let attempt=0;attempt<1;attempt++){try{
 await claimSerpQuerySlot("apify-google-search-scraper",queryHash);
 const response=await fetch("https://api.apify.com/v2/acts/apify~google-search-scraper/run-sync-get-dataset-items?clean=true&format=json",{method:"POST",headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify({queries:url,maxPagesPerQuery:1,countryCode:(country||"us").toLowerCase(),languageCode:(language||"en").toLowerCase()}),signal:AbortSignal.timeout(105000)});
 const raw=await response.text(),parsed=parse(raw);if(response.ok){const items=organicOf(parsed??raw);if(items)return{items};last={code:"APIFY_SERP_SCHEMA_UNRECOGNIZED",status:response.status,shape:schemaShape(parsed),preview:raw.slice(0,600)};if(attempt<2)continue;break}
 last={code:response.status===401||response.status===403?"APIFY_AUTH_ERROR":response.status===429?"APIFY_RATE_LIMITED":"APIFY_HTTP_ERROR",status:response.status,message:String(parsed?.error?.message||parsed?.message||raw).slice(0,500),preview:raw.slice(0,400)};
 if(!(response.status===408||response.status===429||response.status>=500)||attempt===2)break;await sleep(Math.min(2000*(attempt+1),8000));
 }catch(e){last={code:"APIFY_NETWORK_ERROR",message:String((e as Error)?.message||e).slice(0,400)};if(attempt===2)break;await sleep(1000*(attempt+1))}}
 return{failure:last};
}

async function refreshSearchTask(taskId:string){
 const [{data:pages,error:pe},{count,error:re}]=await Promise.all([
  db.from("search_task_pages").select("status,attempts,max_attempts").eq("task_id",taskId),
  db.from("search_results").select("id",{count:"exact",head:true}).eq("task_id",taskId)
 ]);
 if(pe||re)throw pe||re;
 const all=pages||[];
 const completed=all.filter((p:any)=>p.status==="completed").length;
 const failed=all.filter((p:any)=>p.status==="rejected"||(p.status==="failed"&&Number(p.attempts)>=Number(p.max_attempts))).length;
 const pending=all.filter((p:any)=>p.status==="queued"||p.status==="running"||(p.status==="failed"&&Number(p.attempts)<Number(p.max_attempts))).length;
 const running=all.some((p:any)=>p.status==="running");
 const status=pending?(running?"running":"queued"):(failed?((count||0)>0?"partial":"failed"):"completed");
 const terminal=pending===0;
 const {error}=await db.from("search_tasks").update({
  status,total_results:count||0,pages_completed:completed,pages_failed:failed,
  completed_at:terminal?new Date().toISOString():null,
  error_summary:failed?(failed+" 个搜索页未成功，请查看逐页诊断或手动重试。"):null
 }).eq("id",taskId);
 if(error)throw error;
}
async function processOneSearchPage(){
 const {data:claimData,error:claimError}=await db.rpc("claim_search_task_page");
 if(claimError)throw claimError;
 const pg=Array.isArray(claimData)?claimData[0]:claimData;
 if(!pg)return false;
 const taskId=pg.task_id;
 try{
  const queryHash=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(pg.query)))).map(x=>x.toString(16).padStart(2,"0")).join("");
  const u=new URL("https://www.google.com/search");
  u.searchParams.set("q",pg.query);
  u.searchParams.set("start",String((pg.page_number-1)*10));
  if(pg.language)u.searchParams.set("hl",pg.language);
  if(pg.country)u.searchParams.set("gl",pg.country);
  const token=Deno.env.get("APIFY_API_TOKEN")||"";
  if(!token)throw Object.assign(new Error("APIFY_NOT_CONFIGURED"),{code:"APIFY_NOT_CONFIGURED"});
  const got=await fetchPage(u.toString(),token,queryHash,pg.country,pg.language);
  if(got.failure)throw Object.assign(new Error(String(got.failure.message||got.failure.code||"SERP request failed")),{code:got.failure.code||"APIFY_REQUEST_FAILED",detail:got.failure});
  const rows=(got.items||[]).map(normalize).filter((x:any)=>x.url).map((x:any)=>({
   task_id:taskId,task_page_id:pg.page_id,keyword:pg.keyword,country:pg.country,language:pg.language,
   page_number:pg.page_number,rank:x.rank,title:x.title,url:x.url,domain:x.domain,
   description:x.description,source_url:x.source_url,raw:x
  }));
  if(rows.length){
   const {error:ie}=await db.from("search_results").upsert(rows,{onConflict:"task_id,url",ignoreDuplicates:true});
   if(ie)throw ie;
   const {data:stored,error:se}=await db.from("search_results").select("id,task_id,keyword,country,language,page_number,rank,title,url,domain,description,source_url,discovered_at").eq("task_id",taskId).eq("page_number",pg.page_number);
   if(se)throw se;
   const hosts=[...new Set((stored||[]).map((x:any)=>String(x.domain||"").toLowerCase().replace(/^www\\./,"")).filter(Boolean))];
   if(hosts.length){
    const now=new Date().toISOString();
    const websiteRows=hosts.map(host=>{const first=(stored||[]).find((x:any)=>String(x.domain||"").toLowerCase().replace(/^www\\./,"")===host);return{normalized_host:host,display_name:first?.title||host,canonical_url:first?.url||("https://"+host),country:first?.country||"",first_discovered_at:first?.discovered_at||now,last_discovered_at:now}});
    const {error:we}=await db.from("websites").upsert(websiteRows,{onConflict:"normalized_host",ignoreDuplicates:true});if(we)throw we;
    const {error:ue}=await db.from("websites").update({last_discovered_at:now,updated_at:now}).in("normalized_host",hosts);if(ue)throw ue;
    const {data:websiteRowsFound,error:wm}=await db.from("websites").select("id,normalized_host").in("normalized_host",hosts);if(wm)throw wm;
    const websiteMap=new Map((websiteRowsFound||[]).map((w:any)=>[w.normalized_host,w.id]));
    const discoveries=(stored||[]).map((x:any)=>({website_id:websiteMap.get(String(x.domain||"").toLowerCase().replace(/^www\\./,"")),search_result_id:x.id,search_task_id:x.task_id,keyword:x.keyword,country:x.country,language:x.language,page_number:x.page_number,result_rank:x.rank,original_url:x.url,source_url:x.source_url,title:x.title,snippet:x.description,discovered_at:x.discovered_at})).filter((x:any)=>x.website_id);
    if(discoveries.length){const {error:de}=await db.from("website_discoveries").upsert(discoveries,{onConflict:"search_result_id",ignoreDuplicates:true});if(de)throw de}
   }
  }
  const {data:completed,error:completeError}=await db.from("search_task_pages").update({
   status:"completed",results_count:rows.length,completed_at:new Date().toISOString(),
   locked_until:null,lease_token:null,next_retry_at:null,last_error:null,error_code:null,error_detail:null
  }).eq("id",pg.page_id).eq("lease_token",pg.lease_token).select("id").maybeSingle();
  if(completeError)throw completeError;
  if(!completed)console.warn("search page lease was replaced before completion",pg.page_id);
 }catch(e){
  const attempts=Number(pg.attempts)||1,maxAttempts=Number(pg.max_attempts)||4;
  const terminal=attempts>=maxAttempts;
  const delaySeconds=attempts===1?60:attempts===2?180:600;
  const message=String((e as Error)?.message||e).slice(0,500);
  const detail=(e as any)?.detail||{message};
  const {error:updateError}=await db.from("search_task_pages").update({
   status:"failed",error_code:String((e as any)?.code||"SEARCH_PAGE_FAILED").slice(0,100),
   error_detail:detail,last_error:message,locked_until:null,lease_token:null,
   next_retry_at:terminal?null:new Date(Date.now()+delaySeconds*1000).toISOString(),
   completed_at:terminal?new Date().toISOString():null
  }).eq("id",pg.page_id).eq("lease_token",pg.lease_token);
  if(updateError)console.error("failed to persist search page failure",updateError);
  console.error("search page attempt failed",{taskCode:pg.task_code,page:pg.page_number,attempts,maxAttempts,message});
 }
 await refreshSearchTask(taskId);
 return true;
}
async function refreshAllActiveSearchTasks(){
 const {data,error}=await db.from("search_tasks").select("id").in("status",["queued","running"]);
 if(error)throw error;
 for(const t of data||[]){try{await refreshSearchTask(t.id)}catch(e){console.error("task summary refresh failed",t.id,e)}}
}
async function runQueueWorkers(concurrency=3){
 await Promise.all(Array.from({length:Math.max(1,Math.min(3,concurrency))},async()=>{try{await processOneSearchPage()}catch(e){console.error("search queue worker failed",e)}}));
 await refreshAllActiveSearchTasks();
}
async function verifyQueueWorker(req:Request){
 const candidate=req.headers.get("x-queue-worker-secret")||"";
 if(!candidate)return false;
 const {data,error}=await db.from("internal_worker_config").select("secret_value").eq("name","serp_queue_worker").maybeSingle();
 if(error||!data?.secret_value)return false;
 const a=new TextEncoder().encode(candidate),b=new TextEncoder().encode(data.secret_value);
 if(a.length!==b.length)return false;
 let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];
 return diff===0;
}
const authClient=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_ANON_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
async function requireAdmin(req:Request){
 const header=req.headers.get("Authorization")||"";
 const match=header.match(/^Bearer\s+(.+)$/i);
 if(!match)return false;
 const {data,error}=await authClient.auth.getUser(match[1]);
 if(error||!data.user||data.user.email?.toLowerCase()!=="xg.y@icloud.com")return false;
 const {data:admin,error:adminError}=await db.from("admin_users").select("user_id").eq("user_id",data.user.id).eq("is_active",true).maybeSingle();
 return !adminError&&!!admin;
}
Deno.serve(async(req)=>{if(req.method==="OPTIONS")return new Response("ok",{headers:cors});if(req.method!=="POST")return reply({error:"Method not allowed"},405);try{const b=await req.json();if(b.action==="worker_tick"){if(!await verifyQueueWorker(req))return reply({error:"Worker authentication failed"},401);EdgeRuntime.waitUntil(runQueueWorkers(3));return reply({accepted:true,message:"Queue worker tick accepted"},202)}if(!await requireAdmin(req))return reply({error:"管理员身份验证失败，请重新登录",code:"ADMIN_AUTH_REQUIRED"},401);if(b.action==="create"){const token=Deno.env.get("APIFY_API_TOKEN")||"";if(!token)return reply({error:"Apify 服务未配置，请在 Supabase Edge Function Secrets 中设置 APIFY_API_TOKEN",code:"APIFY_NOT_CONFIGURED"},503);const keyword=String(b.keyword||"").trim(),query=String(b.query||"").trim(),start=Math.max(1,Math.floor(Number(b.startPage)||1)),end=Math.min(100,Math.max(start,Math.floor(Number(b.endPage)||start)));if(!keyword||!query)return reply({error:"关键词和搜索语法不能为空"},400);if(end-start+1>10)return reply({error:"单个任务最多执行 10 页（最多约 100 条结果），请拆分任务"},400);const {data:t,error}=await db.from("search_tasks").insert({task_name:String(b.taskName||"").trim(),keyword,query,country:String(b.country||""),language:String(b.language||"en"),start_page:start,end_page:end,search_syntax:query,filters:b.filters||{},status:"queued"}).select("*").single();if(error)throw error;const pages=Array.from({length:end-start+1},(_,i)=>({task_id:t.id,page_number:start+i,start_offset:(start+i-1)*10,status:"queued",max_attempts:4}));const {error:pe}=await db.from("search_task_pages").insert(pages);if(pe)throw pe;EdgeRuntime.waitUntil(runQueueWorkers(3));return reply({task:t,message:"任务已进入持久化队列，后台开始调度。"},202)}if(b.action==="retry_failed_pages"){const token=Deno.env.get("APIFY_API_TOKEN")||"";if(!token)return reply({error:"Apify 服务未配置，请在 Supabase Edge Function Secrets 中设置 APIFY_API_TOKEN",code:"APIFY_NOT_CONFIGURED"},503);const taskCode=String(b.taskCode||"");const {data:t,error:te}=await db.from("search_tasks").select("*").eq("task_code",taskCode).single();if(te||!t)return reply({error:"未找到该任务",code:"TASK_NOT_FOUND"},404);const {data:bad,error:be}=await db.from("search_task_pages").select("id,status").eq("task_id",t.id).in("status",["failed","rejected"]);if(be)throw be;if(!bad?.length)return reply({error:"该任务没有需要重试的失败页",code:"NO_FAILED_PAGES"},409);const {error:ue}=await db.from("search_task_pages").update({status:"queued",attempts:0,max_attempts:4,lease_token:null,locked_until:null,next_retry_at:null,error_code:null,error_detail:null,last_error:null,completed_at:null}).eq("task_id",t.id).in("status",["failed","rejected"]);if(ue)throw ue;await db.from("search_tasks").update({status:"queued",started_at:new Date().toISOString(),completed_at:null,pages_failed:0,error_summary:null}).eq("id",t.id);EdgeRuntime.waitUntil(runQueueWorkers(3));return reply({message:"失败页已重新进入持久化队列。",taskCode:t.task_code,retriedPages:bad.length},202)}if(b.action==="list_tasks"){let q=db.from("search_tasks").select("*").order("created_at",{ascending:false}).limit(Math.min(100,Math.max(1,Number(b.limit)||50)));if(b.keyword)q=q.ilike("keyword","%"+String(b.keyword).slice(0,100)+"%");const {data,error}=await q;if(error)throw error;return reply({tasks:data||[]})}if(b.action==="get_task"){const {data,error}=await db.from("search_tasks").select("*,search_task_pages(*)").eq("task_code",String(b.taskCode||"")).single();if(error)return reply({error:"未找到该任务",code:"TASK_NOT_FOUND"},404);return reply({task:data})}if(b.action==="list_results"){const limit=Math.min(200,Math.max(1,Number(b.limit)||50)),page=Math.max(1,Number(b.page)||1);let q=db.from("search_results").select("*,search_tasks!inner(task_code,task_name,created_at)",{count:"exact"}).order("discovered_at",{ascending:false}).range((page-1)*limit,page*limit-1);if(b.keyword)q=q.ilike("keyword","%"+String(b.keyword).slice(0,100)+"%");if(b.taskCode)q=q.eq("search_tasks.task_code",String(b.taskCode));if(b.country)q=q.eq("country",String(b.country));if(b.domain)q=q.ilike("domain","%"+String(b.domain).slice(0,100)+"%");const {data,error,count}=await q;if(error)throw error;return reply({results:data||[],total:count||0,page,limit})}return reply({error:"未知操作"},400)}catch(e){console.error("serp-task-manager",e);return reply({error:String((e as Error)?.message||e).slice(0,500),code:"TASK_MANAGER_ERROR"},500)}});
