const SUPABASE_URL="https://gvbqtdxqulbnjqnbooqs.supabase.co";
const SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2YnF0ZHhxdWxibmpxbmJvb3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQzMTcyNjQsImV4cCI6MjEwOTg5MzI2NH0.q7LQJ_h113dvv0cl9HQoEcXM-wWBu2jviPbreop14mE";
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
export async function onRequestPost({request,env}){
 let body;try{body=await request.json()}catch{return json({error:"请求格式错误"},400)}
 const action=String(body.action||"");
 if(!["create","list_tasks","get_task","list_results"].includes(action))return json({error:"不支持的操作"},400);
 if(action==="create"&&(!env.BRIGHTDATA_API_KEY||!env.BRIGHTDATA_SERP_ZONE))return json({error:"Bright Data 服务未配置",code:"SERP_NOT_CONFIGURED"},503);
 try{
  const headers={"Authorization":"Bearer "+SUPABASE_ANON_KEY,"apikey":SUPABASE_ANON_KEY,"Content-Type":"application/json"};
  if(action==="create"){headers["x-brightdata-key"]=env.BRIGHTDATA_API_KEY;headers["x-brightdata-zone"]=env.BRIGHTDATA_SERP_ZONE}
  const upstream=await fetch(SUPABASE_URL+"/functions/v1/serp-task-manager",{method:"POST",headers,body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
  const text=await upstream.text();let data;try{data=JSON.parse(text)}catch{data={error:text.slice(0,500)}}
  return json(data,upstream.status);
 }catch(e){return json({error:"任务服务暂时不可用："+String(e?.message||e).slice(0,200),code:"TASK_SERVICE_UNAVAILABLE"},502)}
}