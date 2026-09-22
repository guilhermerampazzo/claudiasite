const res = await fetch("https://claude.codermaster.com.br/arquitetos-designers", { headers: { "user-agent": "Mozilla/5.0" } });
const html = await res.text();
console.log("status", res.status, "len", html.length);
const i = html.search(/<body[^>]*>/i);
console.log(html.slice(i, i + 3500));
