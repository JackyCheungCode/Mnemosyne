const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
function parseBody(payload){
  let value=payload;
  // Bright Data's format=json response may wrap the SERP JSON in a string field named body.
  for(let i=0;i<3;i++){
    if(typeof value==="string"){try{value=JSON.parse(value);continue}catch{return null}}
    if(value&&typeof value==="object"&&typeof value.body==="string"){value=value.body;continue}
    if(value&&typeof value==="object"&&value.body&&typeof value.body==="object"){value=value.body;continue}
    break;
  }
  return value;
}
export async function onRequestPost({request,env}){
  if(!env.BRIGHTDATA_API_KEY||!env.BRIGHTDATA_SERP_ZONE)return reply({error:"SERP 服务未配置。请在 Cloudflare Pages Secrets 设置 BRIGHTDATA_API_KEY 和 BRIGHTDATA_SERP_ZONE。"},503);
  let x;try{x=await request.json()}catch{return reply({error:"请求格式错误"},400)}
  const q=String(x.query||"").trim();if(!q)return reply({error:"搜索关键词不能为空"},400);
  const n=Math.min(50,Math.max(1,Number(x.depth)||20));
  const u=new URL("https://www.google.com/search");
  u.searchParams.set("q",q);u.searchParams.set("num",String(n));u.searchParams.set("brd_json","1");
  if(x.language)u.searchParams.set("hl",String(x.language));
  if(x.country)u.searchParams.set("gl",String(x.country));
  try{
    const upstream=await fetch("https://api.brightdata.com/request",{
      method:"POST",
      headers:{"Authorization":"Bearer "+env.BRIGHTDATA_API_KEY,"Content-Type":"application/json"},
      body:JSON.stringify({zone:env.BRIGHTDATA_SERP_ZONE,url:u.toString(),format:"json"})
    });
    const raw=await upstream.text();
    if(!upstream.ok)return reply({error:"Bright Data SERP 请求失败（HTTP "+upstream.status+"）。请检查 API Key、Zone 和账户额度。"},502);
    let wrapped;try{wrapped=JSON.parse(raw)}catch{return reply({error:"Bright Data 返回的不是 JSON 数据。请检查 SERP Zone 的响应格式。"},502)}
    const data=parseBody(wrapped);
    if(!data||typeof data!=="object")return reply({error:"Bright Data 响应中没有可解析的 SERP 数据。"},502);
    const organic=data.organic||data.organic_results||data.results||data.serp?.organic||data.data?.organic;
    if(!Array.isArray(organic))return reply({error:"Bright Data 请求成功，但响应中未找到 organic 搜索结果字段。请检查 SERP 响应结构。"},502);
    const results=organic.slice(0,n).map((v,i)=>{
      const url=v.link||v.url||v.href||"";let domain="";
      try{domain=new URL(url).hostname.replace(/^www\./,"")}catch{}
      return{rank:v.global_rank||v.position||v.rank||i+1,title:v.title||v.name||"",url,domain,description:v.description||v.snippet||v.text||""};
    }).filter(v=>v.url);
    return reply({results,total:results.length,query:data.general?.query||q,results_count:data.general?.results_cnt??null});
  }catch{return reply({error:"无法连接 Bright Data SERP 服务，请稍后重试。"},502)}
}