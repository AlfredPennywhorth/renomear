# Renomeia — Renomear

Aplicação web para ler documentos digitalizados, extrair identificadores, propor nomes e apoiar a auditoria de atendimentos. Repositório: `AlfredPennywhorth/renomear`.

## Objetivo e princípios

Reduzir o trabalho manual, mantendo os documentos no computador do usuário.

- Processamento local no navegador; não enviar imagens, OCR, prontuários ou dados pessoais para APIs externas, logs públicos, issues ou artefatos.
- Preferir revisão humana a renomear com prontuário incorreto.
- Prontuário canônico de seis dígitos, com zeros à esquerda; `000000` é inválido.
- Identidade insegura nunca é aceita silenciosamente.
- Alteração dos arquivos exige confirmação explícita.
- Renomeação e aprovação da auditoria são decisões distintas.
- Data serve à auditoria e não compõe o nome do arquivo.

## Estado atual da homologação

A aplicação usa React, Vite, TypeScript, pnpm, Vitest e File System Access API. Tesseract.js executa leitura geral e de regiões calibradas; PaddleOCR faz uma segunda leitura local do prontuário. PDF.js renderiza a primeira página do PDF em memória para OCR.

O fluxo atual é:

1. Selecionar uma pasta e listar os arquivos suportados.
2. Acionar **Processar lote** para detectar orientação, ler e analisar os documentos.
3. Conferir os candidatos e tratar exceções no painel de revisão.
4. Acionar **Confirmar renomeação** para alterar os arquivos listados.

Processar o lote não altera os nomes. Auditoria pendente não equivale, por si só, a identidade insegura. Não conformidades e bloqueios operacionais continuam sendo considerados pelo fluxo atual; a separação completa dos modos abaixo ainda está planejada.

- Divergência entre leitores bloqueia o preenchimento automático do prontuário.
- Correção manual de identidade prevalece na sessão.
- Imagens podem receber a rotação física ao confirmar a renomeação; após sucesso, a rotação pendente é zerada.
- PDFs são corrigidos em memória para leitura, mas ainda não são gravados com rotação física.
- A orientação já testa 0°, 90°, 180° e 270° pela faixa superior; a ampliação da busca é planejada.
- Edições que mudam o nome proposto já invalidam o estado anterior de renomeação; arquivos com nome atual igual ao proposto já são excluídos dos candidatos.
- Apenas DT possui cobertura automática de auditoria liberada; os demais tipos recebem alerta de cobertura, o que é distinto da elegibilidade de renomeação por identidade segura.
- Girar JPG, PNG ou WebP fisicamente decodifica e regrava a imagem, podendo descartar metadados. PNG mantém codificação sem perdas, mas não preserva necessariamente a representação binária original; JPG/WebP podem sofrer perda visual. A preparação em memória para OCR não altera o original.
- Somente a primeira página do PDF é lida, alinhada ao uso predominante de documentos de uma página.
- Dashboard e relatório de inconsistências são calculados localmente.

**Limitação de produção:** o PaddleOCR da homologação carrega SDK, runtime e modelos de origens externas. A inferência é local, mas esses ativos devem ser hospedados pelo próprio Renomeia ou protegidos por solução equivalente de integridade antes da promoção para produção.

## Tipos documentais

Ficha C1 frente/verso, envelope, recibo de atendimento, recibo manual de emergência, Declaração de Trânsito (DT) e documentos diversos/não padronizados.

## Nomenclatura

`PPPPPP` representa o prontuário; `DDDDDD`, o número do documento no padrão institucional de seis dígitos.

**Regra institucional confirmada:** números gerados pelo sistema de origem têm seis dígitos. Somente números de formulários preenchidos à mão podem ter menos dígitos; nesses casos completar com zeros à esquerda até seis (por exemplo, `1234` → `001234`). Não acrescentar sempre dois zeros, não truncar números maiores e não completar automaticamente uma leitura parcial de número impresso.

**Lacuna atual a corrigir na Entrega 2:** o código ainda preserva a sequência informada, e a extração de envelopes/recibos admite 4–8 dígitos. Essa aceitação técnica não altera a regra institucional. A implementação deverá exigir seis dígitos nos impressos, normalizar os manuais e encaminhar valores incompatíveis para revisão.

| Tipo | Padrão |
| --- | --- |
| C1 frente | `PPPPPP_c1_frente.jpg` |
| C1 verso | `PPPPPP_c1_verso.jpg` |
| Envelope frente | `PPPPPP_DDDDDD_env_frente.jpg` |
| DT | `PPPPPP_DDDDDD_DT.jpg` |
| Recibo de atendimento — atual | `PPPPPP_DDDDDD_recibo.jpg` (sem número: `PPPPPP_recibo.jpg`) |
| Recibo manual de emergência — atual | `PPPPPP_DDDDDD_rec_emergencia.jpg` (sem número: `PPPPPP_rec_emergencia.jpg`) |
| Diversos/não padronizado — atual | `PPPPPP_DDDDDD_documento.jpg` (sem número: `PPPPPP_documento.jpg`) |
| Envelope mensal — planejado | `PPPPPP_DDDDDD_env_mensal_frente.jpg` |
| Recibo de atendimento mensal — planejado | `PPPPPP_DDDDDD_recibo_mensal.jpg` |
| Recibo manual de emergência mensal com número — planejado | `PPPPPP_DDDDDD_rec_emergencia_mensal.jpg` |
| Recibo manual de emergência mensal sem número — planejado | `PPPPPP_rec_emergencia_mensal.jpg` |

A extensão corresponde ao formato do arquivo; os exemplos acima usam JPG. O número da DT é o número impresso da declaração e `DT` permanece em maiúsculas. A marca mensal será aplicável a `ENVELOPE`, `RECIBO_ATENDIMENTO` e `RECIBO_EMERGENCIA_MANUAL` quando o próprio documento a indicar ou houver confirmação humana. C1, DT e diversos não recebem esse sufixo. No recibo manual, a ausência de número não autoriza inventá-lo; manter o padrão sem número. A marca mensal não muda o tipo nem substitui a conferência da modalidade.

Mensal só deve ser reconhecido quando explícito no documento ou confirmado manualmente. A pasta ou a necessidade de desbloquear aprovação não constitui evidência de mensalidade.

## Evolução planejada — 05/10/2026

Esta seção descreve mudanças e ampliações planejadas. As salvaguardas já disponíveis são explicitadas na seção de estado atual; não se considera que todos os itens abaixo sejam inéditos. A implementação será dividida em entregas pequenas, com validação em documentos reais.

### Dois modos independentes

| Modo | Responsabilidade |
| --- | --- |
| **Renomear documentos** | Orientação, tipo, prontuário, número, indicação de mensal, nome proposto, colisões e confirmação da alteração |
| **Auditar atendimento** | Documentos correspondentes, datas/modalidade, assinaturas/carimbos, preenchimento e regras institucionais |

No modo Renomear, a ausência de C1 ou envelope no lote não será cobrada. Identidade insegura, arquivos vazios e conflitos de nomes continuarão bloqueando a operação. Renomear não aprovará a auditoria.

### Vínculo por prontuário e localização dos campos

O prontuário normalizado para seis dígitos é a chave institucional de vínculo entre C1, DT e envelope/recibo. Um prontuário manuscrito de quatro dígitos recebe dois zeros à esquerda; de outros comprimentos válidos, recebe quantos zeros forem necessários até seis. O campo deve ser localizado pelo rótulo “Prontuário”, usando a posição como apoio após corrigir orientação e localizar o formulário:

| Documento | Região esperada do prontuário |
| --- | --- |
| C1 frente | Canto superior direito; pode ser manuscrito |
| C1 verso | Ainda sem posição institucional padronizada; anotação do prontuário será solicitada aos responsáveis |
| DT | Região superior esquerda, aproximadamente no primeiro terço da altura |
| Envelope/recibo | Canto superior direito |

A região calibrada hoje existente para C1 verso é uma hipótese técnica, não um padrão institucional confirmado. Sem prontuário legível e seguro, o verso permanece em revisão; não inferir o número por ordem de digitalização ou arquivo vizinho. A futura posição de anotação deverá ser definida e validada com novas amostras antes da calibração. A ausência da anotação nos documentos anteriores à padronização não constitui, por si só, não conformidade documental.

As posições são referências do formulário, não coordenadas rígidas da folha A4. O número da DT e a sequência do envelope são identificadores documentais distintos do prontuário.

Prontuários iguais agrupam documentos para auditoria, mas não demonstram por si sós que pertencem a uma única ocorrência: podem existir atendimentos diferentes para o mesmo prontuário. Data, modalidade e número documental auxiliam a seleção da ocorrência, sem alterar a identidade. Ambiguidade permanece em revisão.

Prontuários diferentes não devem ser forçados para o mesmo grupo. Para detectar conflito entre documentos com prontuários diferentes que deveriam estar vinculados, exigir associação explícita confirmada pelo revisor, registrando quais documentos foram associados. Não inferir vínculo apenas pela pasta ou proximidade de arquivos e não copiar o prontuário de outro documento para preencher uma leitura insegura.

**Invariável de identidade:** ausência de documento correspondente em conjunto parcial é pendência de auditoria. Já um conflito de identidade efetivamente observado entre documentos comprovadamente vinculados ao mesmo atendimento bloqueia a renomeação automática dos itens afetados até conferência humana. Compartilhar pasta, data ou grupo documental não prova esse vínculo e não basta para inferir conflito.

A auditoria exigirá indicação de que o conjunto está completo para conferência. Em conjunto parcial, um documento não encontrado será uma pendência de conferência, sem concluir que está faltando.

### Entrega 1 — Orientação e recortes

- Ampliar a busca nas quatro posições quando o cabeçalho não aparecer na faixa superior.
- Sinalizar orientação incerta, em vez de tratar ausência de evidência como posição correta.
- Localizar a área ocupada pelo formulário, inclusive em meia folha A4.
- Usar essa área como referência dos campos calibrados.
- Preparar imagens para OCR em memória, preservando o original e a informação de cor necessária à auditoria.
- Mostrar a orientação escolhida.

Validar com 10–20 documentos conferidos por humano, nas quatro posições, em folha inteira e meia folha, incluindo impressos e manuscritos. A baixa cobertura observada não deve ser atribuída à orientação sem confirmação nas amostras.

### Entrega 2 — Renomear por grupo, mensal e diagnóstico

- Selecionar inicialmente uma pasta por vez e informar o grupo esperado: C1, envelope/recibo, DT ou diversos.
- Especializar a leitura pelo grupo; distinguir frente/verso e modelos de recibos.
- Sinalizar incompatibilidade entre o tipo esperado e o conteúdo, sem forçar a classificação.
- Acrescentar `_mensal` aos três tipos elegíveis conforme os padrões definidos acima, mediante evidência explícita no documento (inclusive no campo de descrição do recibo) ou confirmação manual.
- Exigir número impresso com seis dígitos e completar zeros à esquerda somente nos formulários manuais; revisar leituras parciais e números maiores que seis dígitos.
- Preservar a invalidação já existente do estado anterior quando a edição mudar o nome proposto, estendendo-a à nova marca mensal.
- Preservar a exclusão já existente de arquivos cujo nome atual coincide com o proposto.
- Exibir recorte do prontuário, leituras/confianças dos leitores e motivo de recusa.
- Resumir exclusões por baixa confiança, divergência, campo ausente, orientação pendente, duplicidade, arquivo já padronizado e outros bloqueios.

Repetir um lote maior após validar a entrega 1. Não reduzir limiares de identidade apenas para aumentar a cobertura.

### Entrega 3 — Auditar atendimento por assunto

| Grupo | Itens |
| --- | --- |
| Documentos necessários | C1, envelope e recibos correspondentes; dispensa da C1 correspondente para mensal |
| Datas e modalidade | Reunião, emergência e coerência entre datas |
| Assinaturas e carimbos | Requisitos por tipo documental |
| Preenchimento | Campos obrigatórios, inutilização e demais exigências |
| Identificação | Correspondência do prontuário normalizado; validação independente do identificador de cada documento |

- Prontuários devem corresponder nos documentos vinculados. Não exigir igualdade entre número da DT e sequência do envelope/recibo: pertencem a identificadores distintos. Comparar números documentais somente entre representações comprovadas do mesmo documento (por exemplo, frente/verso), após confirmação desse vínculo; se essa relação não estiver estabelecida, validar cada número separadamente.
- Cada item terá resultado, motivo e registro de conferência humana.
- Mensal dispensa somente a C1 correspondente; as demais regras aplicáveis permanecem.
- Emergência exige envelope; quando não assinado, deve ter o carimbo indicando que a assinatura está no recibo manual.
- Regras visuais sem detecção confiável, incluindo assinatura, carimbos e cores de caneta, serão itens de conferência humana, sem aparentar aprovação automática.
- Alertas revisáveis poderão ser conferidos por humano; não conformidade confirmada continuará bloqueando aprovação da auditoria.

### Entrega 4 — Salvar orientação corrigida

- Gravar a rotação de PDFs mantendo o formato PDF, sem conversão definitiva para JPG/PNG.
- Permitir corrigir orientação independentemente da possibilidade de renomear.
- Exibir prévia e exigir confirmação antes da alteração.
- Preservar integridade e impedir aplicação repetida da rotação.

## Critérios de validação

Critério principal: **zero renomeações automáticas com prontuário incorreto**.

Registrar por lote e tipo documental:

- Total analisado e total proposto/renomeado sem correção manual.
- Total em revisão e não conforme.
- Prontuários corretamente lidos, recusados por baixa confiança e divergências entre leitores.
- Motivos de exclusão, correções manuais e tempo de processamento.
- Qualquer nome incorreto ou alteração indevida de arquivo.

Cobertura e acurácia são medidas distintas. Não há meta numérica de cobertura fixada antes de conhecer a composição do lote. Testar a confirmação, colisões, preservação do original em falhas e consistência dos estados após edição.

## Compatibilidade e homologação

A renomeação direta depende das APIs do navegador. A homologação atual é suportada em **Chrome e Edge em computador**. JPG, JPEG, PNG, WEBP e PDF são os formatos previstos. Fallback por exportação de lote será avaliado antes de ampliar a compatibilidade.

Homologação: https://alfredpennywhorth.github.io/renomear/

Usar cópias dos documentos nas primeiras rodadas. Manter a pasta no mesmo local durante a sessão; movimentação por ferramentas de organização pode invalidar o acesso.

## Segurança

- Confirmar autorização e condições de segurança antes de selecionar a pasta.
- Não usar computador público/compartilhado ou pasta sincronizada quando a política exigir permanência exclusiva na máquina.
- Usar apenas identificadores operacionais necessários nos nomes finais.
- Não registrar conteúdo sensível em telemetria ou logs remotos.
- O CSV local de inconsistências contém prontuários, nomes de arquivos e valores/observações; é um documento sensível e deve receber os mesmos cuidados de armazenamento e compartilhamento dos originais.
- Conformidade institucional depende também de governança, retenção e controles organizacionais.

## Governança

- `main`: branch destinada à versão estável, **ainda não liberada para produção enquanto houver o bloqueador dos ativos externos do PaddleOCR**; não presumir que o conteúdo atual atende ao gate de produção. **Não mergear sem autorização explícita do André**.
- `develop`: integração e homologação.
- Fluxo: correção → typecheck/testes/build → Codex e Copilot → correção dos achados → autorização de merge em develop → CI pós-merge → confirmação do deploy → teste real.
- A CI de develop publica automaticamente a homologação após sucesso. Não presumir conclusão do deploy sem verificá-la.

## Documentação complementar

- [Segurança](docs/LGPD_SEGURANCA.md)
- [Como usar](docs/COMO_USAR.md)
- [Dashboard](docs/DASHBOARD_QUALIDADE.md)
- [Roteiro de homologação](docs/ROTEIRO_HOMOLOGACAO.md)
- [Calibração](docs/CALIBRACAO_DOCUMENTOS.md)
- [Teste de OCR](docs/TESTE_OCR_HOMOLOGACAO.md)

Os documentos complementares deverão acompanhar cada entrega; em caso de divergência, conferir a versão implementada e o estado planejado descrito acima.
