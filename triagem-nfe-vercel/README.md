# Triagem de NF-e no trânsito — versão Vercel

Projeto preparado para publicação no Vercel.

- `index.html`: interface móvel e leitor de DANFE.
- `api/consulta.js`: proxy serverless para a consulta do XML, evitando o bloqueio CORS do navegador.
- `vercel.json`: configuração mínima de deploy.

No Vercel, importe o repositório `yurikcoelho/painel-dief-diagnostico` e selecione **triagem-nfe-vercel** como Root Directory.
