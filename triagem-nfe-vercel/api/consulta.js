// Proxy serverless para evitar CORS no navegador.
// Recebe somente uma chave de NF-e e encaminha a consulta para o serviço configurado.
// Não aceita URL arbitrária nem outros destinos.
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ status: "erro", mensagem: "Método não permitido." }));
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (_) { body = null; }
  }

  const chave = String(body && body.chave || "").replace(/\D/g, "");
  if (!/^\d{44}$/.test(chave)) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ status: "erro", mensagem: "Chave de acesso inválida." }));
    return;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);

  try {
    const upstream = await fetch("https://consultadanfe.com/api/v1/consulta", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Triagem-NFe-SEFAZRR/1.0"
      },
      body: JSON.stringify({ chave, format: "json" }),
      signal: controller.signal
    });

    const text = await upstream.text();
    res.statusCode = upstream.status;
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json; charset=utf-8");
    res.end(text);
  } catch (err) {
    res.statusCode = err && err.name === "AbortError" ? 504 : 502;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({
      status: "erro",
      mensagem: err && err.name === "AbortError"
        ? "A consulta externa excedeu o tempo limite."
        : "Não foi possível consultar o serviço externo."
    }));
  } finally {
    clearTimeout(timer);
  }
};
