const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
function isPublicHost(host){
 const h=host.toLowerCase().replace(/^\\[|\\]$/g,"");
 if(!h||h==="localhost"||h.endsWith(".localhost")||h.endsWith(".local")||h.endsWith(".internal")||h.endsWith(".onion")||h.endsWith(".arpa"))return false;
 // Reject non-standard numeric IPv4 forms as well as literal IPv6 addresses.
 if(/^(?:0x[0-9a-f]+|[0-9]+)$/i.test(h)||h.includes(":"))return false;
 if(/^\\d{1,3}(\\.\\d{1,3}){3}$/.test(h)){
  const p=h.split(".").map(Number);if(p.some(n=>n>255))return false;
  const a=p[0],b=p[1],c=p[2];
  if(a===0||a===10||a===127||a>=224)return false;
  if(a===169&&b===254)return false;
  if(a===172&&b>=16&&b<=31)return false;
  if(a===192&&(b===168||b===0))return false;
  if(a===100&&b>=64&&b<=127)return false;
  if(a===198&&(b===18||b===19||b===51))return false;
  if(a===203&&b===0&&c===113)return false;
  return true;
 }
 return h.includes(".")&&!h.endsWith(".test")&&!h.endsWith(".example")&&!h.endsWith(".invalid");
}
function clean(s){return String(s||"").replace(/<[^>]*>/g," ").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&#39;|&apos;/gi,"'").replace(/&quot;/gi,'"').replace(/\s+/g," ").trim().slice(0,500)}
function meta(html,key,attr="property"){
 const re=new RegExp("<meta\\b(?=[^>]*\\b"+attr+"=[\"']"+key.replace(/[.*+?^${}()|[\\]\\]/g,"\\$&")+"[\"'])(?=[^>]*\\bcontent=[\"']([^<]*?)[\"'])[^>]*>","i");
 const m=html.match(re);return m?clean(m[1]):"";
}
function titleOf(html){const m=html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);return m?clean(m[1]):""}
function jsonLd(html){
 const out=[];for(const m of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){try{const v=JSON.parse(m[1]);const walk=x=>{if(!x||typeof x!=="object")return;if(Array.isArray(x)){x.forEach(walk);return}out.push(x);if(x["@graph"])walk(x["@graph"]);};walk(v)}catch{}}
 return out;
}
function classify(html,url,finalUrl){
 const title=titleOf(html),site=meta(html,"og:site_name")||meta(html,"application-name","name");
 const description=meta(html,"description","name")||meta(html,"og:description");
 const nodes=jsonLd(html);
 const org=nodes.find(x=>{const t=[].concat(x["@type"]||[]).map(v=>String(v).toLowerCase());return t.some(v=>["organization","corporation","localbusiness","manufacturer","store"].includes(v))});
 const company=clean(org?.name||site||title.split(/[|–—-]/)[0]||"");
 const text=clean(html.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ")).toLowerCase();
 const urlHost=new URL(finalUrl).hostname.replace(/^www\./,"");
 const platformTerms=["marketplace","directory","supplier directory","business directory","shopping cart","add to cart","classifieds","news","breaking news"];
 const corporateTerms=["about us","our company","contact us","products","solutions","manufacturing","manufacturer","factory","company"];
 const industryTerms=["electrical","electricity","power distribution","switchgear","transformer","circuit breaker","cable","energy","substation","voltage","generator","electronic"];
 const platformHits=platformTerms.filter(k=>(title+" "+description+" "+text.slice(0,5000)).includes(k));
 const corporateHits=corporateTerms.filter(k=>text.slice(0,10000).includes(k));
 const industryHits=industryTerms.filter(k=>(title+" "+description+" "+text.slice(0,12000)).includes(k));
 const canonical=html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)/i)?.[1]||"";
 let score=0;if(org)score+=4;if(site)score+=1;if(company)score+=1;if(corporateHits.length)score+=Math.min(3,corporateHits.length);if(platformHits.length)score-=Math.min(5,platformHits.length*2);
 let status="需要复核",reason="检测到网站内容，但企业身份线索不足，建议人工复核。";
 if(platformHits.length>=2&&score<4){status="非官网";reason="页面出现明显的平台/目录/媒体特征："+platformHits.slice(0,3).join("、")+"。"}
 else if(score>=6){status="疑似官网";reason="发现企业结构化数据或企业名称，并包含企业介绍/产品等内容；仍需人工确认企业主体。"}
 else if(score>=3){status="需要复核";reason="发现部分企业网站特征："+corporateHits.slice(0,3).join("、")+"，但不足以自动确认官网。"}
 else{status="需要复核";reason="未发现足够的企业身份信息，不能仅凭搜索标题确认官网。"}
 return {status,reason,companyName:company,siteName:site,pageTitle:title,description,canonical,structuredOrganization:!!org,industryRelevant:industryHits.length>0,industrySignals:industryHits.slice(0,8),companySignals:corporateHits.slice(0,8),platformSignals:platformHits.slice(0,5),finalUrl};
}
async function readLimited(response,maxBytes=600000){
 const reader=response.body?.getReader();if(!reader)return "";let total=0,chunks=[];
 while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>maxBytes){const keep=value.slice(0,Math.max(0,maxBytes-(total-value.byteLength)));if(keep.length)chunks.push(keep);try{await reader.cancel()}catch{}break;}chunks.push(value)}
 const all=new Uint8Array(chunks.reduce((n,c)=>n+c.length,0));let offset=0;for(const c of chunks){all.set(c,offset);offset+=c.length}
 return new TextDecoder("utf-8").decode(all);
}
export async function onRequestPost({request}){
 let body;try{body=await request.json()}catch{return reply({error:"请求格式错误"},400)}
 let current;try{current=new URL(String(body.url||""))}catch{return reply({error:"请提供有效的网站 URL"},400)}
 if(!["http:","https:"].includes(current.protocol)||current.username||current.password||!isPublicHost(current.hostname))return reply({error:"出于安全原因，只能验证公开网站的 HTTP/HTTPS 地址。"},400);
 try{
  let response=null;
  for(let i=0;i<4;i++){
   if(!isPublicHost(current.hostname))return reply({error:"网站跳转到了不允许访问的地址。"},400);
   response=await fetch(current.toString(),{method:"GET",redirect:"manual",headers:{"User-Agent":"Mozilla/5.0 (compatible; MnemosyneBot/1.0; +https://mnemosyne-console.pages.dev)","Accept":"text/html,application/xhtml+xml"},signal:AbortSignal.timeout(12000)});
   if([301,302,303,307,308].includes(response.status)){
    const loc=response.headers.get("location");if(!loc)return reply({error:"网站返回了无法解析的跳转。"},502);
    current=new URL(loc,current);continue;
   }
   break;
  }
  if(!response)return reply({error:"网站没有返回响应。"},502);
  if(!response.ok)return reply({error:"网站返回 HTTP "+response.status+"，暂时无法验证。"},502);
  const type=response.headers.get("content-type")||"";if(!type.includes("text/html")&&!type.includes("application/xhtml+xml"))return reply({error:"目标地址不是 HTML 网页，无法提取企业资料。"},415);
  const html=await readLimited(response);
  if(!html)return reply({error:"网站没有返回可读取的页面内容。"},502);
  return reply(classify(html,String(body.url),current.toString()));
 }catch(e){return reply({error:e?.name==="TimeoutError"?"网站响应超时。":"无法访问该网站："+String(e?.message||"网络错误").slice(0,160)},502)}
}
