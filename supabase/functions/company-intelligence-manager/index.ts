import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"https://mnemosyne-console.pages.dev","Access-Control-Allow-Headers":"authorization, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json","Cache-Control":"no-store"};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:cors});
const secretRaw=Deno.env.get("SUPABASE_SECRET_KEYS");
const serviceKey=secretRaw?JSON.parse(secretRaw).default:Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const db=createClient(Deno.env.get("SUPABASE_URL")!,serviceKey!,{auth:{persistSession:false,autoRefreshToken:false}});
const safeUrl=(raw:string)=>{const u=new URL(raw);if(!["http:","https:"].includes(u.protocol)||u.username||u.password)throw new Error("只允许公开 HTTP/HTTPS 官网");const h=u.hostname.toLowerCase().replace(/^\[|\]$/g,"");if(!h||h==="localhost"||h.endsWith(".localhost")||h.endsWith(".local")||h.endsWith(".internal")||h==="metadata.google.internal"||h==="metadata")throw new Error("目标地址不是公开网站");return u;};
function ipv4Private(ip:string){const p=ip.split(".").map(Number);if(p.length!==4||p.some(x=>!Number.isInteger(x)||x<0||x>255))return true;const [a,b]=p;return a===0||a===10||a===127||a>=224||(a===100&&b>=64&&b<=127)||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&b===0)||(a===192&&b===0&&p[2]===2)||(a===192&&b===168)||(a===198&&(b===18||b===19||b===51))||(a===203&&b===0&&p[2]===113);}
function ipv6Private(ip:string){const v=ip.toLowerCase().split("%")[0];if(v==="::"||v==="::1"||v.startsWith("fc")||v.startsWith("fd")||/^fe[89ab]/.test(v)||v.startsWith("ff"))return true;const mapped=v.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);if(mapped)return ipv4Private(mapped[1]);const mappedHex=v.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);if(mappedHex){const n=(parseInt(mappedHex[1],16)<<16)|parseInt(mappedHex[2],16);return ipv4Private([n>>>24,(n>>>16)&255,(n>>>8)&255,n&255].join("."))}return false;}
async function assertPublicTarget(raw:string){const u=safeUrl(raw),host=u.hostname.toLowerCase().replace(/^\[|\]$/g,"");if(host.includes(":")){if(ipv6Private(host))throw new Error("目标 IPv6 地址属于本地或保留网络");return}if(/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)){if(ipv4Private(host))throw new Error("目标 IPv4 地址属于本地或保留网络");return}const results=await Promise.allSettled([Deno.resolveDns(host,"A"),Deno.resolveDns(host,"AAAA")]);const ips=results.flatMap(r=>r.status==="fulfilled"?r.value:[]);if(!ips.length)throw new Error("官网域名无法解析到公开 IP 地址");for(const ip of ips){if(ip.includes(":")?ipv6Private(ip):ipv4Private(ip))throw new Error("官网域名解析到本地、私有或保留 IP，已阻止访问")}}
const clean=(s:string)=>s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/&nbsp;|&#160;/gi," ").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/\s+/g," ").trim().slice(0,12000);
const uniq=(a:string[])=>[...new Set(a.map(x=>x.trim()).filter(Boolean))];
function parseHtml(html:string,url:string){
 const title=clean((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||"");
 const meta=(name:string)=>{const tag=(html.match(/<meta\b[^>]*>/gi)||[]).find(x=>new RegExp(name,"i").test(x));return clean((tag?.match(/content=["']([^"']*)["']/i)||[])[1]||"")};
 const description=meta("description")||meta("og:description");
 const companyName=meta("og:site_name")||clean((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)||[])[1]||"")||title;
 const emails=uniq((html.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)||[]));
 const phones=uniq((html.match(/(?:\+?\d[\d\s().-]{7,}\d)/g)||[]).slice(0,20));
 const socials:any={};for(const [key,host] of Object.entries({linkedin:"linkedin.com",facebook:"facebook.com",instagram:"instagram.com",youtube:"youtube.com",x:"x.com",tiktok:"tiktok.com"})){const m=html.match(new RegExp('https?:\\/\\/(?:www\\.)?'+host.replace(".","\\.")+'[^"\\s<>]*',"i"));if(m)socials[key]=m[0].replace(/&amp;/g,"&")}
 const products=uniq((html.match(/<(?:h2|h3)[^>]*>[\s\S]{2,120}?<\/(?:h2|h3)>/gi)||[]).map(x=>clean(x)).filter(x=>/product|solution|device|system|equipment|service|产品|解决方案/i.test(x)).slice(0,30));
 const links:any[]=[];const re=/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;let m;while((m=re.exec(html))!==null){try{const u=new URL(m[1],url);if(u.hostname===new URL(url).hostname){const label=clean(m[2]),path=(u.pathname+" "+label).toLowerCase();let score=0;if(/about|company|profile|who-we-are/.test(path))score+=5;if(/contact|location|office/.test(path))score+=5;if(/product|solution|service|catalog/.test(path))score+=4;if(/factory|manufactur|facility/.test(path))score+=3;if(score)links.push({url:u.toString(),score})}}catch{}}
 const jsonLd:any[]=[];for(const s of html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi)||[]){const raw=(s.match(/>([\s\S]*?)<\/script>/i)||[])[1];try{jsonLd.push(JSON.parse(raw||"{}"))}catch{}}
 return {title,companyName,description,emails,phones,socials,products,links,jsonLd};
}
async function fetchPublic(url:string,headers:Record<string,string>){let current=url;for(let hop=0;hop<6;hop++){await assertPublicTarget(current);const res=await fetch(current,{redirect:"manual",headers,signal:AbortSignal.timeout(16000)});if([301,302,303,307,308].includes(res.status)){const location=res.headers.get("location");if(!location)throw new Error("官网重定向缺少目标地址");current=new URL(location,current).toString();continue}return res}throw new Error("官网重定向次数过多")}
async function robotsDisallow(origin:string){try{const r=await fetchPublic(origin+"/robots.txt",{"User-Agent":"MnemosyneCompanyResearchBot/1.0"});if(!r.ok)return[];const lines=(await r.text()).split(/\\r?\\n/);let active=false;const rules:string[]=[];for(const line of lines){const cleanLine=line.split("#")[0].trim();if(!cleanLine||!cleanLine.includes(":"))continue;const [key,...rest]=cleanLine.split(":");const value=rest.join(":").trim();if(key.trim().toLowerCase()==="user-agent"){active=value==="*"||value.toLowerCase().includes("mnemosyne")}else if(active&&key.trim().toLowerCase()==="disallow"&&value)rules.push(value)}return rules}catch{return[]}}
async function crawl(item:any){
 const first=safeUrl(item.website_url);const disallow=await robotsDisallow(first.origin);const allowed=(u:string)=>{const path=new URL(u).pathname;return !disallow.some(rule=>path.startsWith(rule))};const pages:any[]=[];const visited=new Set<string>();const queue=[first.origin+first.pathname];
 while(queue.length&&pages.length<8){const url=queue.shift()!;if(visited.has(url)||!allowed(url))continue;visited.add(url);try{const res=await fetchPublic(url,{"User-Agent":"MnemosyneCompanyResearchBot/1.0","Accept":"text/html,application/xhtml+xml"});if(!res.ok)continue;const type=res.headers.get("content-type")||"";if(!type.includes("text/html")&&!type.includes("application/xhtml+xml"))continue;const html=(await res.text()).slice(0,1200000);const p=parseHtml(html,res.url||url);pages.push({url:res.url||url,...p});for(const l of p.links.sort((a:any,b:any)=>b.score-a.score)){if(!visited.has(l.url)&&queue.length<16)queue.push(l.url)}}catch{}}
 if(!pages.length)throw new Error("官网无法访问或未返回可解析的 HTML 页面");
 const p=pages[0],allEmails=uniq(pages.flatMap(x=>x.emails)),allPhones=uniq(pages.flatMap(x=>x.phones)),socials=Object.assign({},...pages.map(x=>x.socials)),products=uniq(pages.flatMap(x=>x.products)).slice(0,40);
 const org=pages.flatMap(x=>x.jsonLd).flatMap(x=>Array.isArray(x)?x:[x]).find(x=>/Organization|Corporation|LocalBusiness/i.test(String(x?.["@type"]||"")));
 const address=org?.address?(typeof org.address==="string"?org.address:[org.address.streetAddress,org.address.addressLocality,org.address.addressRegion,org.address.postalCode,org.address.addressCountry?.name||org.address.addressCountry].filter(Boolean).join(", ")):"";
 return {company_name:String(org?.name||p.companyName||item.title||item.domain),description:String(org?.description||p.description||""),country:String(org?.address?.addressCountry?.name||org?.address?.addressCountry||""),address,emails:allEmails,phones:allPhones,social_links:socials,main_products:products,source_pages:pages.map(x=>({url:x.url,title:x.title})),raw_data:{page_count:pages.length,structured_data:org||null}};
}
async function runTask(taskId:string){
 const {data:items}=await db.from("company_intelligence_items").select("*").eq("task_id",taskId).eq("status","queued").order("created_at");
 for(const item of items||[]){try{await db.from("company_intelligence_items").update({status:"crawling",started_at:new Date().toISOString(),error_message:null}).eq("id",item.id);if(item.website_id)await db.from("websites").update({collection_status:"running",updated_at:new Date().toISOString()}).eq("id",item.website_id);const d=await crawl(item);await db.from("company_intelligence_items").update({status:"completed",pages_found:d.source_pages.length,pages_crawled:d.source_pages.length,company_data:d,completed_at:new Date().toISOString()}).eq("id",item.id);await db.from("company_intelligence_results").upsert({item_id:item.id,task_id:taskId,search_result_id:item.search_result_id,website_id:item.website_id||null,domain:item.domain,website_url:item.website_url,company_name:d.company_name,description:d.description,country:d.country,address:d.address,emails:d.emails,phones:d.phones,social_links:d.social_links,main_products:d.main_products,source_pages:d.source_pages,raw_data:d.raw_data},{onConflict:"item_id"});
  if(item.website_id){
   const {data:company,error:ce}=await db.from("companies").upsert({normalized_name:item.domain,company_name:d.company_name||item.title||item.domain,description:d.description||null,country:d.country||null,address:d.address||null,emails:d.emails||[],phones:d.phones||[],social_links:d.social_links||{},main_products:d.main_products||[],last_collected_at:new Date().toISOString(),updated_at:new Date().toISOString()},{onConflict:"normalized_name"}).select("id").single();if(ce)throw ce;
   const {error:linkError}=await db.from("company_websites").upsert({company_id:company.id,website_id:item.website_id,relationship_type:"primary",is_primary:true},{onConflict:"company_id,website_id"});if(linkError)throw linkError;
   const {error:versionError}=await db.from("company_intelligence_versions").insert({company_id:company.id,website_id:item.website_id,task_id:taskId,snapshot:d,source_pages:d.source_pages||[],collected_at:new Date().toISOString()});if(versionError)throw versionError;
   const {error:websiteError}=await db.from("websites").update({collection_status:"completed",last_collected_at:new Date().toISOString(),display_name:d.company_name||item.title,updated_at:new Date().toISOString()}).eq("id",item.website_id);if(websiteError)throw websiteError;
  }}catch(e){await db.from("company_intelligence_items").update({status:"failed",error_message:String((e as Error)?.message||e).slice(0,500),completed_at:new Date().toISOString()}).eq("id",item.id);if(item.website_id)await db.from("websites").update({collection_status:"failed",updated_at:new Date().toISOString()}).eq("id",item.website_id)}
 const {data:progress}=await db.from("company_intelligence_items").select("status").eq("task_id",taskId);const done=(progress||[]).filter(x=>["completed","partial"].includes(x.status)).length,failed=(progress||[]).filter(x=>x.status==="failed").length;await db.from("company_intelligence_tasks").update({completed_items:done,failed_items:failed,total_items:(progress||[]).length}).eq("id",taskId);
}
 const {data:all}=await db.from("company_intelligence_items").select("status").eq("task_id",taskId);const total=(all||[]).length,completed=(all||[]).filter(x=>["completed","partial"].includes(x.status)).length,failed=(all||[]).filter(x=>x.status==="failed").length;
 await db.from("company_intelligence_tasks").update({status:failed?(completed?"partial":"failed"):"completed",total_items:total,completed_items:completed,failed_items:failed,completed_at:new Date().toISOString(),error_summary:failed?failed+" 家官网采集失败":null}).eq("id",taskId);
}
async function processQueuedItem(item:any,taskId:string){
 const d=await crawl(item),now=new Date().toISOString();
 const {error:itemError}=await db.from("company_intelligence_items").update({status:"completed",pages_found:d.source_pages.length,pages_crawled:d.source_pages.length,company_data:d,completed_at:now,error_message:null}).eq("id",item.id);if(itemError)throw itemError;
 const {data:result,error:resultError}=await db.from("company_intelligence_results").upsert({item_id:item.id,task_id:taskId,search_result_id:item.search_result_id,website_id:item.website_id||null,domain:item.domain,website_url:item.website_url,company_name:d.company_name,description:d.description,country:d.country,address:d.address,emails:d.emails,phones:d.phones,social_links:d.social_links,main_products:d.main_products,source_pages:d.source_pages,raw_data:d.raw_data},{onConflict:"item_id"}).select("id").single();if(resultError)throw resultError;
 if(item.website_id){
  const {data:company,error:ce}=await db.from("companies").upsert({normalized_name:item.domain,company_name:d.company_name||item.title||item.domain,description:d.description||null,country:d.country||null,address:d.address||null,emails:d.emails||[],phones:d.phones||[],social_links:d.social_links||{},main_products:d.main_products||[],last_collected_at:now,updated_at:now},{onConflict:"normalized_name"}).select("id").single();if(ce)throw ce;
  const {error:linkError}=await db.from("company_websites").upsert({company_id:company.id,website_id:item.website_id,relationship_type:"primary",is_primary:true},{onConflict:"company_id,website_id"});if(linkError)throw linkError;
  const {error:versionError}=await db.from("company_intelligence_versions").upsert({company_id:company.id,website_id:item.website_id,task_id:taskId,legacy_item_id:item.id,legacy_result_id:result.id,snapshot:d,source_pages:d.source_pages||[],collected_at:now},{onConflict:"legacy_result_id"});if(versionError)throw versionError;
  const {error:websiteError}=await db.from("websites").update({collection_status:"completed",last_collected_at:now,display_name:d.company_name||item.title,updated_at:now}).eq("id",item.website_id);if(websiteError)throw websiteError;
 }
}
async function processDurableQueue(){
 const {data:jobs,error}=await db.rpc("claim_company_collection_jobs",{batch_size:1});if(error)throw error;
 const outcomes:any[]=[];
 for(const job of jobs||[]){
  const {data:item,error:itemError}=await db.from("company_intelligence_items").select("*").eq("id",job.item_id).maybeSingle();
  if(itemError)throw itemError;
  if(!item){await db.from("company_collection_jobs").update({status:"failed",last_error:"采集项目记录不存在",locked_until:null,updated_at:new Date().toISOString()}).eq("id",job.job_id);outcomes.push({job_id:job.job_id,status:"failed"});continue}
  const now=new Date().toISOString();
  await db.from("company_intelligence_items").update({status:"crawling",started_at:now,error_message:null}).eq("id",item.id);
  if(item.website_id)await db.from("websites").update({collection_status:"running",updated_at:now}).eq("id",item.website_id);
  try{
   await processQueuedItem(item,job.task_id);
   await db.from("company_collection_jobs").update({status:"completed",locked_until:null,last_error:null,completed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",job.job_id);
   outcomes.push({job_id:job.job_id,status:"completed"});
  }catch(e){
   const message=String((e as Error)?.message||e).slice(0,500),terminal=Number(job.attempts)>=Number(job.max_attempts),retryAt=new Date(Date.now()+Math.min(3600000,30000*Math.pow(2,Math.max(0,Number(job.attempts)-1)))).toISOString();
   await db.from("company_collection_jobs").update({status:terminal?"failed":"queued",available_at:retryAt,locked_until:null,last_error:message,updated_at:new Date().toISOString()}).eq("id",job.job_id);
   await db.from("company_intelligence_items").update({status:terminal?"failed":"queued",error_message:message,completed_at:terminal?new Date().toISOString():null}).eq("id",item.id);
   if(item.website_id)await db.from("websites").update({collection_status:terminal?"failed":"queued",updated_at:new Date().toISOString()}).eq("id",item.website_id);
   outcomes.push({job_id:job.job_id,status:terminal?"failed":"queued",error:message});
  }
  const [{data:taskItems,error:tiError},{data:taskJobs,error:tjError}]=await Promise.all([db.from("company_intelligence_items").select("status").eq("task_id",job.task_id),db.from("company_collection_jobs").select("status").eq("task_id",job.task_id)]);
  if(tiError)throw tiError;if(tjError)throw tjError;
  const total=(taskItems||[]).length,completed=(taskItems||[]).filter((x:any)=>x.status==="completed"||x.status==="partial").length,failed=(taskItems||[]).filter((x:any)=>x.status==="failed").length,active=(taskJobs||[]).some((x:any)=>x.status==="queued"||x.status==="running");
  await db.from("company_intelligence_tasks").update({status:active?"running":failed?(completed?"partial":"failed"):"completed",total_items:total,completed_items:completed,failed_items:failed,completed_at:active?null:new Date().toISOString(),error_summary:failed?failed+" 家官网采集失败":null}).eq("id",job.task_id);
 }
 return {claimed:(jobs||[]).length,outcomes};
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
Deno.serve(async(req)=>{if(req.method==="OPTIONS")return new Response("ok",{headers:cors});if(req.method!=="POST")return reply({error:"Method not allowed"},405);try{const b=await req.json();if(b.action==="process_queue"){const token=req.headers.get("x-worker-secret")||"";const {data:valid,error:ve}=await db.rpc("verify_collection_worker_secret",{candidate:token});if(ve||valid!==true)return reply({error:"Worker authentication failed"},401);return reply(await processDurableQueue())}if(!await requireAdmin(req))return reply({error:"管理员身份验证失败，请重新登录",code:"ADMIN_AUTH_REQUIRED"},401);
 if(b.action==="list_candidates"){
  const taskCode=String(b.searchTaskCode||"").trim();let scopedTaskId=null;if(taskCode){const {data:searchTask,error:se}=await db.from("search_tasks").select("id").eq("task_code",taskCode).maybeSingle();if(se)throw se;if(!searchTask)return reply({error:"未找到对应的搜索任务"},404);scopedTaskId=searchTask.id;}
  const {data:websites,error}=await db.from("websites").select("id,normalized_host,display_name,canonical_url,country,review_status,review_reason,collection_status,first_discovered_at,last_discovered_at,last_collected_at").order("last_discovered_at",{ascending:false}).limit(1000);
  if(error)throw error;
  const ids=(websites||[]).map(x=>x.id);
  let discoveryQuery=ids.length?db.from("website_discoveries").select("website_id,search_result_id,search_task_id,keyword,country,language,original_url,source_url,title,snippet,discovered_at").in("website_id",ids).order("discovered_at",{ascending:false}).limit(5000):null;if(discoveryQuery&&scopedTaskId)discoveryQuery=discoveryQuery.eq("search_task_id",scopedTaskId);const {data:discoveries,error:de}=discoveryQuery?await discoveryQuery:{data:[],error:null};
  if(de)throw de;
  const grouped=new Map();for(const d of discoveries||[]){if(!grouped.has(d.website_id))grouped.set(d.website_id,[]);grouped.get(d.website_id).push(d)}
  let candidates=(websites||[]).filter(w=>!scopedTaskId||grouped.has(w.id)).map(w=>{const sources=grouped.get(w.id)||[],latest=sources[0]||{};return{id:w.id,title:w.display_name||latest.title||w.normalized_host,domain:w.normalized_host,url:w.canonical_url||latest.original_url||("https://"+w.normalized_host),country:w.country||latest.country||"",keyword:latest.keyword||"",description:latest.snippet||"",discovered_at:w.last_discovered_at||latest.discovered_at,review_status:w.review_status,review_reason:w.review_reason,collection_status:w.collection_status,source_count:sources.length,sources};});
  const term=String(b.keyword||b.domain||"").trim().toLowerCase();if(term)candidates=candidates.filter(x=>[x.title,x.domain,x.keyword,x.description,...x.sources.map(s=>s.keyword)].some(v=>String(v||"").toLowerCase().includes(term)));
  return reply({candidates});
 }
 if(b.action==="save_review"){
  const rows=(b.items||[]).filter((x:any)=>x&&typeof x.id==="string"&&["approved","rejected","pending"].includes(x.decision));
  if(!rows.length)return reply({error:"没有可保存的审核记录"},400);
  let saved=0;for(const row of rows){
   const {data:website,error:we}=await db.from("websites").select("id").eq("id",row.id).maybeSingle();if(we)throw we;if(!website)continue;
   const reason=row.decision==="rejected"?String(row.reason||"").slice(0,200):null;
   const {error:ue}=await db.from("websites").update({review_status:row.decision,review_reason:reason,updated_at:new Date().toISOString()}).eq("id",row.id);if(ue)throw ue;
   const {error:he}=await db.from("website_reviews").insert({website_id:row.id,decision:row.decision,reason,reviewed_at:new Date().toISOString()});if(he)throw he;
   saved++;
  }
  return reply({saved});
 }
 if(b.action==="create_task"){
  const ids=[...new Set((b.ids||[]).filter((x:any)=>typeof x==="string"))];if(!ids.length||ids.length>100)return reply({error:"请选择 1–100 个官网"},400);
  const {data:websites,error:we}=await db.from("websites").select("id,normalized_host,display_name,canonical_url,review_status,collection_status").in("id",ids);if(we)throw we;
  if((websites||[]).length!==ids.length)return reply({error:"部分官网已不存在，请刷新列表"},409);
  if((websites||[]).some(w=>w.review_status!=="approved"))return reply({error:"所选网站中存在未审核通过的官网，请先完成审核"},409);
  let sourceSearchTaskId=null;const sourceSearchTaskCode=String(b.searchTaskCode||"").trim();if(sourceSearchTaskCode){const {data:sourceTask,error:st}=await db.from("search_tasks").select("id").eq("task_code",sourceSearchTaskCode).maybeSingle();if(st)throw st;if(!sourceTask)return reply({error:"未找到对应的搜索任务"},404);sourceSearchTaskId=sourceTask.id;}
  let discoveryQuery=db.from("website_discoveries").select("website_id,search_result_id,search_task_id,original_url,title,discovered_at").in("website_id",ids).order("discovered_at",{ascending:false});if(sourceSearchTaskId)discoveryQuery=discoveryQuery.eq("search_task_id",sourceSearchTaskId);const {data:discoveryRows,error:de}=await discoveryQuery;if(de)throw de;
  const latest=new Map();for(const d of discoveryRows||[])if(!latest.has(d.website_id))latest.set(d.website_id,d);
  if(ids.some(id=>!latest.has(id)))return reply({error:"所选官网并非全部来自当前搜索任务，或缺少搜索来源记录"},409);
  const {data:t,error}=await db.from("company_intelligence_tasks").insert({task_name:String(b.taskName||"官网采集批次").slice(0,120),source_search_task_id:sourceSearchTaskId,status:"running",total_items:ids.length,started_at:new Date().toISOString()}).select("*").single();if(error)throw error;
  const rows=(websites||[]).map(w=>{const d=latest.get(w.id);return{task_id:t.id,search_result_id:d.search_result_id,website_id:w.id,domain:w.normalized_host,website_url:w.canonical_url||d.original_url,title:w.display_name||d.title||w.normalized_host,status:"queued"}});
  const {error:ie}=await db.from("company_intelligence_items").insert(rows);if(ie)throw ie;
  const {error:ue}=await db.from("websites").update({collection_status:"queued",updated_at:new Date().toISOString()}).in("id",ids);if(ue)throw ue;
  return reply({task:t,selected:ids.length,message:"已创建持久化官网采集批次，后台将自动处理"},202);
 }
 if(b.action==="retry_items"){
  const taskCode=String(b.taskCode||"");
  const ids=[...new Set((b.itemIds||[]).filter((x:any)=>typeof x==="string"))];
  if(!taskCode||!ids.length||ids.length>100)return reply({error:"请指定任务和 1–100 个失败项目"},400);
  const {data:task,error:te}=await db.from("company_intelligence_tasks").select("id,task_code").eq("task_code",taskCode).maybeSingle();if(te)throw te;if(!task)return reply({error:"未找到采集批次"},404);
  const {data:items,error:ie}=await db.from("company_intelligence_items").select("id,website_id,status").eq("task_id",task.id).in("id",ids);if(ie)throw ie;
  if((items||[]).length!==ids.length)return reply({error:"部分采集项目不属于当前批次"},409);
  if((items||[]).some(x=>x.status!=="failed"))return reply({error:"只能重试失败的网站项目"},409);
  const now=new Date().toISOString();
  const {error:ue}=await db.from("company_intelligence_items").update({status:"queued",error_message:null,started_at:null,completed_at:null}).in("id",ids);if(ue)throw ue;
  const websiteIds=[...new Set((items||[]).map(x=>x.website_id).filter(Boolean))];
  if(websiteIds.length){const {error:we}=await db.from("websites").update({collection_status:"queued",updated_at:now}).in("id",websiteIds);if(we)throw we;}
  const {error:taskError}=await db.from("company_intelligence_tasks").update({status:"running",completed_at:null,error_summary:null,failed_items:0}).eq("id",task.id);if(taskError)throw taskError;
  return reply({queued:ids.length,message:"失败项目已重新排队，后台将自动处理"},202);
 }
 if(b.action==="list_tasks"){let q=db.from("company_intelligence_tasks").select("*").order("created_at",{ascending:false}).limit(100);const sourceCode=String(b.sourceSearchTaskCode||"").trim();if(sourceCode){const {data:st,error:se}=await db.from("search_tasks").select("id").eq("task_code",sourceCode).maybeSingle();if(se)throw se;if(!st)return reply({error:"未找到搜索任务"},404);q=q.eq("source_search_task_id",st.id);}const {data,error}=await q;if(error)throw error;return reply({tasks:data||[]});}
 if(b.action==="get_task"){const {data,error}=await db.from("company_intelligence_tasks").select("*,company_intelligence_items(*)").eq("task_code",String(b.taskCode||"")).single();if(error)return reply({error:"未找到情报采集任务"},404);return reply({task:data});}
 if(b.action==="list_companies"){
  const limit=Math.min(200,Math.max(1,Number(b.limit)||50)),page=Math.max(1,Number(b.page)||1);
  let companyQuery=db.from("companies").select("id,company_name,description,country,address,emails,phones,social_links,main_products,profile_status,verification_status,verification_notes,verified_at,last_collected_at,created_at,company_websites(relationship_type,is_primary,websites(id,normalized_host,canonical_url,country,collection_status,last_collected_at))").order("last_collected_at",{ascending:false}).limit(1000);if(b.verifiedOnly)companyQuery=companyQuery.eq("verification_status","verified");if(b.verificationStatus)companyQuery=companyQuery.eq("verification_status",String(b.verificationStatus));const sourceCode=String(b.searchTaskCode||"").trim();if(sourceCode){const {data:st,error:se}=await db.from("search_tasks").select("id").eq("task_code",sourceCode).maybeSingle();if(se)throw se;if(!st)return reply({error:"未找到搜索任务"},404);const {data:cts,error:cte}=await db.from("company_intelligence_tasks").select("id").eq("source_search_task_id",st.id);if(cte)throw cte;const taskIds=(cts||[]).map(x=>x.id);if(!taskIds.length)return reply({companies:[],total:0,page,limit});const {data:versions,error:ve}=await db.from("company_intelligence_versions").select("company_id").in("task_id",taskIds);if(ve)throw ve;const companyIds=[...new Set((versions||[]).map(x=>x.company_id))];if(!companyIds.length)return reply({companies:[],total:0,page,limit});companyQuery=companyQuery.in("id",companyIds);}const {data,error}=await companyQuery;if(error)throw error;
  const term=String(b.keyword||b.domain||"").trim().toLowerCase();
  const filtered=(data||[]).filter((x:any)=>!term||String(x.company_name||"").toLowerCase().includes(term)||(x.company_websites||[]).some((cw:any)=>String(cw.websites?.normalized_host||"").toLowerCase().includes(term)));
  const total=filtered.length,companies=filtered.slice((page-1)*limit,page*limit);
  return reply({companies,total,page,limit});
 }
 if(b.action==="verify_company"){
  const companyId=String(b.companyId||"");const decision=String(b.decision||"");
  if(!companyId||!["verified","rejected","pending"].includes(decision))return reply({error:"请指定企业和有效的验证结论"},400);
  const notes=String(b.notes||"").trim().slice(0,2000);
  const {data:company,error:ce}=await db.from("companies").select("id").eq("id",companyId).maybeSingle();if(ce)throw ce;if(!company)return reply({error:"未找到企业档案"},404);
  const {error:ue}=await db.from("companies").update({verification_status:decision,verification_notes:notes||null,verified_at:decision==="verified"?new Date().toISOString():null,updated_at:new Date().toISOString()}).eq("id",companyId);if(ue)throw ue;
  return reply({saved:true,verification_status:decision});
 }
 if(b.action==="get_company"){
  const id=String(b.companyId||"");if(!id)return reply({error:"缺少企业档案编号"},400);
  const {data,error}=await db.from("companies").select("*,company_websites(relationship_type,is_primary,created_at,websites(*)),company_intelligence_versions(id,website_id,task_id,snapshot,source_pages,collected_at)").eq("id",id).maybeSingle();
  if(error)throw error;if(!data)return reply({error:"未找到企业档案"},404);return reply({company:data});
 }
 if(b.action==="list_results"){const limit=Math.min(200,Math.max(1,Number(b.limit)||50)),page=Math.max(1,Number(b.page)||1);let q=db.from("company_intelligence_results").select("*",{count:"exact"}).order("created_at",{ascending:false}).range((page-1)*limit,page*limit-1);if(b.taskId)q=q.eq("task_id",String(b.taskId));if(b.domain)q=q.ilike("domain","%"+String(b.domain).slice(0,100)+"%");const {data,error,count}=await q;if(error)throw error;return reply({results:data||[],total:count||0,page,limit});}
 return reply({error:"未知操作"},400);
 }catch(e){console.error("company-intelligence-manager",e);return reply({error:String((e as Error)?.message||e).slice(0,500)},500)}});
