# Tabela fiscal de referência — RR, v4.9.0

A triagem consulta separadamente o tratamento declarado na NF-e, os candidatos a ST/antecipação/monofasia e os benefícios ou tratamentos especiais. O CST informado pelo emitente não decide quais regras serão pesquisadas. Sobreposições permanecem visíveis e dependem de conferência.

Fonte principal: `05-RICMS_Decreto_4335_E_2001_RR.md`, disponibilizado nas fontes do projeto, consolidação de referência até janeiro/2026. Implementação: `triagem-nfe-vercel/index.html`, constantes `ST_RULES`, `BENEFICIOS_RR` e `TRIBUTACAO_NORMAL_CONFERIDA`. Esta expansão não representa transcrição completa dos anexos/apêndices.

## Catálogo de benefícios e tratamentos especiais

| Grupo | Tratamento de referência | Fundamento RICMS/RR | Limite decisivo |
|---|---|---|---|
| Hortifrutícolas | Isenção | Anexo I, art. 1º, XXV | Espécie, estado natural, origem da fruta e exclusão de industrialização |
| Ovos com casca | Isenção | Anexo I, art. 1º, XLIV | NCM 0407 + descrição; preparações/0408 não inferidos |
| Caprinos | Isenção | Anexo I, art. 1º, X | Caprinos vivos ou produtos comestíveis do abate; não ovinos |
| Ortopedia, cadeiras de rodas e audição | Isenção | Anexo I, art. 1º, XIII | 16 códigos expressos + descrição, finalidade e correlação com NCM vigente |
| Mudas | Isenção | Anexo I, art. 1º, XXXIII | Operação interna, excluídas ornamentais |
| Artesanato | Isenção | Anexo I, art. 1º, II | Próprio artesão, produção na residência, sem empregados assalariados |
| Obras de arte | Isenção | Anexo I, art. 1º, XXXIV | Autoria própria ou hipóteses específicas de importação; não toda revenda |
| Óleo comestível usado | Isenção | Anexo I, art. 1º, XXXV-A | Usado + insumo industrial; não óleo novo |
| Pneus usados | Isenção | Anexo I, art. 1º, XLIV-B | Reciclagem/tratamento/disposição ambiental; não revenda normal |
| Pilhas/baterias usadas | Isenção | Anexo I, art. 1º, XLV | Esgotamento, composição exigida e destinação |
| Reprodutores/matrizes | Isenção | Anexo I, art. 1º, XLVII | Espécie, registro e destinatário agropecuário |
| Embalagens de agrotóxicos | Isenção | Anexo I, art. 1º, LIV | Devolução impositiva, vazias, sem ônus |
| Vasilhames retornáveis | Isenção | Anexo I, art. 1º, LV | Não cobrança, retorno ou destroca nas hipóteses do inciso |
| Amostras grátis | Isenção | Anexo I, art. 1º, I | Diminuto valor e quantidade estritamente necessária |
| Livros/jornais/periódicos | Não incidência | Art. 4º, I | Conteúdo/natureza; excluídos pautados, escrituração, agendas |
| Veículos usados | Redução de base de 95% | Anexo I, art. 2º, III-A/III | Histórico, tributação anterior, documentos e exclusões |
| Máquinas/aparelhos usados | Redução de base de 80% | Anexo I, art. 2º, III | Condição de aquisição e histórico; não partes/acessórios |
| Desincorporação do ativo | Redução de base de 80% | Anexo I, art. 2º, I | Uso normal, 12 meses e vedação de crédito |
| Carnes em saída interestadual de RR | Redução de base | Anexo I, art. 2º, I-A | Espécie/estado; referência 41,67% desde 30/03/2023, conferir alíquota/carga |
| Bovino/bubalino em pé para abate | Redução de base | Anexo I, art. 2º, II-A | Não todo gado: 87,50% interna/82,35% interestadual na redação de referência de 06/09/2023 |
| Gado do produtor | Diferimento | Arts. 7º, I, b, 8º e 612 | Operação interna, produtor e encerramento da fase |
| Sarrafo/lenha/argila | Diferimento | Arts. 7º, I, d, e 8º | Operação interna e destino à fabricação de cerâmica |
| Sucata | Diferimento | Arts. 7º, I, f, 8º e 570 | Definição legal e encerramento; não qualquer bem usado |
| Insumos agropecuários internos | Isenção condicionada | Anexo I, art. 1º, LXVII | Subconjunto defensivos, ração pecuária, corretivos, sementes e mudas; prazo/condições |
| Insumos agropecuários A | Redução de base de 60% | Anexo I, art. 2º, IX | Interestadual, finalidade, registros/rótulos/dedução; não pets/fertilizantes C |
| Insumos agropecuários B | Redução de base de 30% | Anexo I, art. 2º, X | Farelos/tortas, aveia e milho nas condições de finalidade/destinatário |
| Insumos agropecuários C | Hipótese de carga específica | Anexo I, art. 2º, X-A | Ácidos/fertilizantes, cadeia, finalidade e transição anual; sem cálculo automático |
| Pescado regional | Isenção condicionada | Anexo I, art. 1º, LXXVIII | Interna, espécie/origem; excluídos pirarucu, industrialização e enlatado/cozido |
| Pirarucu/tambaqui de cativeiro | Isenção condicionada | Anexo I, art. 1º, LXXVIII-A | Comprovação de cativeiro e prazo próprio |
| Pós-larvas de camarão | Isenção condicionada | Anexo I, art. 1º, LXXIX | Não camarão adulto |
| Preservativos | Isenção condicionada | Anexo I, art. 1º, LXXX | Dedução do imposto dispensado no preço e indicação na NF |
| Máquinas/implementos agrícolas | Benefício a localizar no apêndice | Anexo I/apêndices | NCM completo, finalidade, operação, destinatário e vigência ainda pendentes |

Os prefixos que não constam expressamente do dispositivo ajudam a localizar uma hipótese pela classificação e descrição; não equivalem a uma lista legal completa. Prefixos e textos genéricos não recebem validação positiva. As condições que dependem do cadastro, carga física, registros, histórico ou documentos não são presumidas a partir da NF-e.

## Vigência e origem

A comparação usa a data civil de emissão da NF-e, não a data da leitura. Datas inválidas/ausentes e operações anteriores à redação indicada permanecem pendentes. Prazo encerrado no arquivo é apresentado como necessidade de conferir prorrogação, sem afirmar revogação definitiva nem isenção vigente.

| Hipótese | Limite no arquivo | Tratamento após o limite |
|---|---|---|
| Insumos agropecuários | 31/12/2025 | Conferir incorporação e condições em RR: o Convênio ICMS 79/25 prorrogou nacionalmente o Convênio 100/97 até 31/12/2027 |
| Pescado regional, pós-larvas e preservativos | 30/04/2026 | Conferir prorrogação vigente em RR |
| Pirarucu/tambaqui de cativeiro | 31/12/2024 | Conferir prorrogação da hipótese específica |

Fonte complementar: [Convênio ICMS 79/25, cláusulas primeira e segunda](https://www.confaz.fazenda.gov.br/legislacao/convenios/2025/CV079_25). A prorrogação nacional não foi usada para substituir automaticamente a vigência estadual registrada no arquivo.

Operações de remetente de outra UF exibem aviso de que a referência de RR não valida o ICMS próprio de origem. Benefícios estritamente internos e redução de carnes em saída de RR têm controles de operação próprios. Insumos interestaduais vindos de outra UF continuam pendentes de legislação de origem e impedem estimativa automática de antecipação parcial. Benefício candidato e ST podem coexistir; não se escolhe um somente pelo CST.

Redações anteriores e dispositivos identificados como revogados não viraram regras correntes. Exemplos: refeições (Anexo I, art. 1º, XLVI), redução de tijolos/telhas cerâmicas (art. 2º, VII-A) e antigas alíneas de ácidos/fertilizantes dos insumos, revogadas a partir de 2022.

## Compatibilidade positiva do ICMS próprio

A flag é restrita a operações internas comuns de RR, CRT 3, CST 00, CFOP 5101/5102, finalidade normal, alíquota/base/imposto consistentes, sem candidato a ST ou benefício e sem inconsistência material do item. NCM e descrição são confrontados com hipóteses examinadas: mortadela, salsicha, linguiça e salame (16010000, 20%); arroz (1006), feijão (0713), farinha de mandioca (110620) e fécula de mandioca (11081400), a 12%. Não inclui automaticamente misturas, preparações ou sementes para plantio.

A flag confirma compatibilidade dos dados declarados com a regra geral do ICMS próprio. Não comprova carga física, cadastro, regime especial nem recolhimento. Benefícios candidatos mantêm aviso de conferência, inclusive quando o emitente declara CST 00 ou 60.

Validação: `node tests/ncm-regression.cjs`, com cenários sintéticos positivos/negativos, vigência, fronteiras de espécie/descrição/CFOP, cálculos e renderização. XML manual, consulta, clipboard e fluxo DU-E mantidos.
