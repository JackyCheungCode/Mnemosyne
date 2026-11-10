const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function parseJson(text){try{return JSON.parse(text)}catch{return null}}
function unwrap(value){
 let v=value;
 for(let i=0;i<6;i++){
  if(typeof v==="string"){const p=parseJson(v);if(p===null)return v;v=p;continue}
  if(Array.isArray(v))return v;
  if(v&&typeof v==="object"){
   if(v.body!==undefined){v=v.body;continue}
   if(v.data!==undefined&&typeof v.data==="string"){v=v.data;continue}
  }
  break;
 }
 return v;
}
function findOrganic(input){
 const root=unwrap(input);
 if(Array.isArray(root))return root;
 if(!root||typeof root!=="object")return null;
 const candidates=[
  root.organic,root.organic_results,root.organicResults,root.results,
  root.serp?.organic,root.serp?.organic_results,root.serp?.results,
  root.data?.organic,root.data?.organic_results,root.data?.results,
  root.result?.organic,root.result?.organic_results,root.result?.results
 ];
 for(const item of candidates)if(Array.isArray(item))return item;
 // Some wrappers put parsed SERP under a named result key.
 for(const key of ["body","data","result","serp","response"]){
  if(root[key]&&typeof root[key]==="object"){const found=findOrganic(root[key]);if(found)return found}
 }
 return null;
}
function normalize(item,index){
 const url=item?.link||item?.url||item?.href||item?.destination||"";
 let domain="";try{domain=new URL(url).hostname.replace(/^www\./,"")}catch{}
 return {rank:item?.global_rank||item?.position||item?.rank||index+1,title:item?.title||item?.name||"",url,domain,description:item?.description||item?.snippet||item?.text||""};
}
function diagnostic(status,raw){
 const sample=String(raw||"").slice(0,1200);
 return {error:"Bright Data 返回成功，但响应中未识别到自然搜索结果。",code:"SERP_SCHEMA_UNRECOGNIZED",upstreamStatus:status,responsePreview:sample,contentType:"unknown"};
}
async function fetchPage({url,env,page}){
 let last=null;
 for(let attempt=0;attempt<3;attempt++){
  try{
   const response=await fetch("https://api.brightdata.com/request",{
    method:"POST",
    headers:{"Authorization":"Bearer "+env.BRIGHTDATA_API_KEY,"Content-Type":"application/json","Accept":"application/json"},
    body:JSON.stringify({zone:env.BRIGHTDATA_SERP_ZONE,url,format:"raw"}),
    signal:AbortSignal.timeout(30000)
   });
   const raw=await response.text();
   if(response.ok){
    const parsed=parseJson(raw);
    const organic=findOrganic(parsed??raw);
    if(organic)return {organic,parsed,raw,status:response.status,contentType:response.headers.get("content-type")||""};
    // A successful but malformed response is not blindly retried: return diagnostics to the caller.
    return {schemaError:diagnostic(response.status,raw),raw,status:response.status,contentType:response.headers.get("content-type")||""};
   }
   const retryable=response.status===408||response.status===429||response.status>=500;
   last={status:response.status,body:raw.slice(0,1000)};
   if(!retryable||attempt===2)break;
   const retryAfter=Number(response.headers.get("retry-after"));
   await sleep(retryAfter>0?Math.min(retryAfter*1000,8000):500*(2**attempt));
  }catch(error){
   last={error:error?.name==="TimeoutError"?"上游请求超时":String(error?.message||error)};
   if(attempt===2)break;
   await sleep(500*(2**attempt));
  }
 }
 return {failure:last,page};
}
export async function onRequestPost({request,env}){
 if(!env.BRIGHTDATA_API_KEY||!env.BRIGHTDATA_SERP_ZONE)return reply({error:"SERP 服务未配置。请在 Cloudflare Pages Secrets 设置 BRIGHTDATA_API_KEY 和 BRIGHTDATA_SERP_ZONE。",code:"SERP_NOT_CONFIGURED"},503);
 let x;try{x=await request.json()}catch{return reply({error:"请求格式错误",code:"INVALID_JSON"},400)}
 const q=String(x.query||"").trim();if(!q)return reply({error:"搜索关键词不能为空",code:"EMPTY_QUERY"},400);
 const target=Math.min(50,Math.max(1,Math.floor(Number(x.depth)||20)));
 const first=new URL("https://www.google.com/search");
 first.searchParams.set("q",q);first.searchParams.set("brd_json","1");
 if(x.language)first.searchParams.set("hl",String(x.language));
 if(x.country&&x.country!=="global")first.searchParams.set("gl",String(x.country));
 const all=[],seen=new Set(),pages=[],failures=[];
 const pageCount=Math.ceil(target/10);
 for(let page=0;page<pageCount;page++){
  const pageUrl=new URL(first);pageUrl.searchParams.set("start",String(page*10));
  const result=await fetchPage({url:pageUrl.toString(),env,page});
  if(result.failure){failures.push({page:page+1,...result.failure});if(page===0)return reply({error:"Bright Data SERP 请求失败，已自动重试 3 次。",code:"UPSTREAM_REQUEST_FAILED",details:result.failure},502);break}
  if(result.schemaError){if(page===0)return reply({...result.schemaError,code:"SERP_SCHEMA_UNRECOGNIZED"},502);break}
  const normalized=result.organic.map(normalize);
  let added=0;
  for(const item of normalized){if(!item.url)continue;let key=item.url;try{const u=new URL(item.url);u.hash="";key=u.toString()}catch{}if(seen.has(key))continue;seen.add(key);all.push({...item,rank:item.rank||all.length+1});added++}
  pages.push({page:page+1,received:normalized.length,added,status:result.status});
  if(normalized.length===0||added===0)break;
  if(all.length>=target)break;
  await sleep(180);
 }
 const results=all.slice(0,target);
 return reply({results,total:results.length,requested:target,query:q,pagesFetched:pages.length,pages,partial:results.length<target&&failures.length>0,warning:failures.length?"部分分页请求失败，已返回成功获取的结果。":results.length<target?"Google 返回的自然搜索结果不足所请求数量。":null,failures:failures.length?failures:undefined});
}
