# Consulta por chave manual — v4.10.2

Na aba Triagem, o campo **Chave de acesso manual** aceita digitação ou colagem dos 44 dígitos da NF-e. Espaços, pontos e hífens são removidos; letras e quantidade incorreta são recusadas. O contador mostra quantos dígitos foram informados. O teclado numérico é sugerido no celular.

**Consultar chave** ou Enter valida o tamanho, o dígito verificador e o modelo 55 antes de enviar a chave ao endpoint `/api/consulta`, no mesmo fluxo usado pelo leitor. O botão indica a busca em andamento e evita envios repetidos pelo formulário. Erros de preenchimento preservam a nota já analisada. Em falha de consulta, é possível tentar novamente ou abrir o XML manualmente.

A consulta depende do serviço existente; a validação local da chave não comprova autorização ou situação fiscal da NF-e. Somente a chave e o parâmetro de formato são enviados pelo fluxo existente.

`tests/manual-key-browser.cjs` cobre oito cenários com serviço e XML sintéticos: entrada acessível, valores inválidos, dígito incorreto, modelo diverso, separadores/consulta/vínculo da nota, preservação da análise, Enter/falha/repetição e layout em telas de 360/390/1280 pixels nos temas claro e escuro. A suíte usa as mesmas variáveis opcionais `TRIAGEM_PLAYWRIGHT_MODULE` e `TRIAGEM_BROWSER_BIN` de `photos-browser.cjs`.
