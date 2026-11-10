function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}
function normalizeResults(payload) {
  const rows = Array.isArray(payload) ? payload
    : payload?.organic || payload?.results || payload?.data?.organic || payload?.data?.results || [];
  return rows.map((item) => {
    const url = item.link || item.url || item.href || "";
    let domain = "";
    try { domain = new URL(url).hostname.replace(/^www\./, ""); } catch {}
    return {
      title: item.title || item.name || "",
      url,
      domain,
      description: item.description || item.snippet || item.text || ""
    };
  }).filter((item) => item.url && /^https?:\/\//i.test(item.url));
}
export async function onRequestPost({ request, env }) {
  const apiKey = env.BRIGHTDATA_API_KEY;
  const zone = env.BRIGHTDATA_SERP_ZONE;
  if (!apiKey || !zone) {
    return json({ error: "服务端尚未配置 BRIGHTDATA_API_KEY 或 BRIGHTDATA_SERP_ZONE。" }, 503);
  }
  let body;
  try { body = await request.json(); } catch { return json({ error: "请求内容不是有效 JSON。" }, 400); }
  const query = String(body.query || "").trim();
  const page = Math.max(0, Math.min(9, Number(body.page) || 0));
  const country = String(body.country || "").toLowerCase().replace(/[^a-z]/g, "").slice(0, 2);
  const language = String(body.language || "en").replace(/[^a-zA-Z-]/g, "").slice(0, 8);
  if (!query || query.length > 500) return json({ error: "搜索关键词不能为空且不能超过 500 个字符。" }, 400);
  const target = new URL("https://www.google.com/search");
  target.searchParams.set("q", query);
  target.searchParams.set("num", "10");
  target.searchParams.set("start", String(page * 10));
  if (country) target.searchParams.set("gl", country);
  if (language) target.searchParams.set("hl", language);
  const endpoint = new URL("https://api.brightdata.com/request");
  endpoint.searchParams.set("zone", zone);
  endpoint.searchParams.set("url", target.toString());
  endpoint.searchParams.set("format", "json");
  try {
    const response = await fetch(endpoint.toString(), {
      method: "GET",
      headers: { "Authorization": "Bearer " + apiKey, "Accept": "application/json" }
    });
    const raw = await response.text();
    if (!response.ok) {
      return json({ error: "Bright Data 返回 HTTP " + response.status + "。请检查 Zone、Key 与账户权限。", provider_status: response.status }, 502);
    }
    let payload;
    try { payload = JSON.parse(raw); } catch { return json({ error: "SERP API 返回的内容不是 JSON。请检查 Zone 是否为 SERP API Zone。" }, 502); }
    const results = normalizeResults(payload);
    return json({ results, total: results.length, page, query });
  } catch (error) {
    return json({ error: "调用 Bright Data 失败：" + (error?.message || "未知网络错误") }, 502);
  }
}