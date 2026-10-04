# Fotos da fiscalização — v4.10.0

Cada foto é vinculada à chave de acesso de 44 dígitos da NF-e. O vínculo é definido quando a captura/anexação começa e permanece o mesmo se outra nota for renderizada enquanto a foto é processada.

## Uso

1. Analise a NF-e e toque em **Tirar foto com data e GPS**, no bloco **Fotos da fiscalização**.
2. Autorize câmera e localização no navegador. Confirme ou edite a localidade sugerida pelo campo Posto.
3. Confira o estado do GPS e toque em **Fotografar e salvar na NF-e**. É possível tirar várias fotos da mesma nota.
4. Abra **Ver fotos desta NF-e** na triagem ou no detalhe do histórico. A galeria começa recolhida para preservar a leitura dos alertas fiscais. **Notas com fotos**, na aba Histórico, recupera as fotografias sem depender da consulta ao XML e também após limpar o histórico de consultas.
5. **Baixar registro (.zip)** reúne imagem original/sem marcação, JPEG com os dados gravados e `metadados.json`. **Excluir foto** remove o registro correspondente após confirmação.

**Anexar foto** usa o seletor de imagens do aparelho e pode abrir a câmera nativa no celular. Nesse caso a marcação identifica a data de registro no aplicativo; a data original da imagem não é atestada. O arquivo anexado é preservado no pacote de download.

## Dados registrados

- Chave, número, série e nome do emitente da NF-e.
- Data/hora do registro provenientes do relógio do aparelho, apresentadas em `America/Boa_Vista` (UTC−04:00), com segundos; JSON conserva também o instante em ISO UTC.
- Latitude, longitude, precisão informada pelo aparelho e horário de medição do GPS.
- Estado da localização: disponível, desatualizada, permissão negada, indisponível ou ainda pendente. A ausência de GPS fica expressa e nenhuma coordenada é inventada. Medição com mais de 60 segundos ou temporalmente incompatível com o registro é identificada como desatualizada.
- Localidade informada pelo usuário. O posto configurado serve de sugestão; não há geocodificação nem validação automática da localidade pelas coordenadas.
- Origem da imagem: câmera ao vivo ou arquivo anexado.

A marcação é acrescentada em uma faixa abaixo da imagem, sem encobrir o conteúdo fotografado. A câmera ao vivo gera a imagem sem marcação a partir do quadro de vídeo; anexos conservam o arquivo enviado pelo usuário. A cópia marcada é limitada a 1920 pixels na maior dimensão antes da inclusão da faixa, preservando proporção. Imagens pequenas podem ser ampliadas para legibilidade da marcação. Anexos têm limite de 25 MB e precisam ser decodificáveis pelo navegador.

## Armazenamento e integração

`triagem-nfe-vercel/photos.js` mantém imagens e metadados em IndexedDB (`triagem.fotos`), separados do histórico em localStorage. A gravação só é informada como concluída após o evento de conclusão da transação. Metadados resumidos e contagens por nota são atualizados na mesma transação das imagens. Erro de quota ou transação abortada não gera mensagem de sucesso.

Fotos permanecem neste navegador/aparelho e na origem do site. Não há upload de imagem/coordenadas, sincronização entre aparelhos ou geocodificador externo. Limpar os dados do site pode apagar os registros; a interface orienta baixar uma cópia. O pedido de persistência ao navegador não é garantia de backup. A galeria funciona em uma página já carregada mesmo quando o serviço de XML falha; o carregamento inicial do aplicativo continua dependente da disponibilidade dos arquivos do site.

A câmera é encerrada ao fechar, voltar ou sair da página, inclusive quando uma autorização atrasada chega depois do cancelamento. Nenhum áudio é solicitado. É necessária uma página segura (HTTPS, como no Vercel), com permissões de câmera e localização. Uma câmera bloqueada permite continuar pelo anexo; GPS indisponível permite registrar a foto com essa condição explícita.

## Validação

`node tests/ncm-regression.cjs` conserva os 149 cenários fiscais e verifica também a sintaxe do módulo fotográfico.

`tests/photos-browser.cjs` usa Playwright/Chromium com XML, câmera e geolocalização sintéticos, sem acessar serviços externos. Cobre 19 cenários: vínculos entre notas, anexos, recarga, histórico indisponível/limpo, download, permissões negadas, cancelamento tardio da câmera, quota, transação abortada, exclusão/contagens, coordenadas zero, posição antiga, arquivo inválido, temas e telas mobile/desktop. A captura usa a API de câmera real do navegador com uma fonte de vídeo sintética; não testa o hardware físico do aparelho do usuário.

Para executar com Playwright instalado e o Chromium correspondente:

```sh
node tests/ncm-regression.cjs
node tests/photos-browser.cjs
```

Opcionalmente, defina `TRIAGEM_PLAYWRIGHT_MODULE` com o caminho do módulo Playwright e `TRIAGEM_BROWSER_BIN` com o executável Chromium. `TRIAGEM_TEST_OUTPUT` define a pasta de screenshots e do ZIP sintético. `TRIAGEM_CDP_PORT`/`TRIAGEM_INSPECT=1` permitem inspeção com agent-browser; crie `inspection.done` na pasta de saída para encerrar a inspeção.
