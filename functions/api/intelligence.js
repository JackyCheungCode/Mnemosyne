const SUPABASE_URL="https://gvbqtdxqulbnjqnbooqs.supabase.co";
const SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2YnF0ZHhxdWxibmpxbmJvb3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQzMTcyNjQsImV4cCI6MjEwOTg5MzI2NH0.q7LQJ_h113dvv0cl9HQoEcXM-wWBu2jviPbreop14mE";
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
export async function onRequestPost({request}){
 let body;try{body=await request.json()}catch{return json({error:"请求格式错误"},400)}
 const actions=["list_candidates","save_review","create_task","list_tasks","get_task","list_results"];
 if(!actions.includes(String(body.action||"")))return json({error:"不支持的操作"},400);
 try{const headers={"Authorization":"Bearer "+SUPABASE_ANON_KEY,"apikey":SUPABASE_ANON_KEY,"Content-Type":"application/json"};
 const upstream=await fetch(SUPABASE_URL+"/functions/v1/company-intelligence-manager",{method:"POST",headers,body:JSON.stringify(body),signal:AbortSignal.timeout(25000)});
 const raw=await upstream.text();let data;try{data=JSON.parse(raw)}catch{data={error:raw.slice(0,500)}}return json(data,upstream.status)
 }catch(e){return json({error:"情报采集服务暂时不可用："+String(e?.message||e).slice(0,180)},502)}
}