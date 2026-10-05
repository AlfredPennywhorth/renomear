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
- Somente a primeira página do PDF é lida, alinhada ao uso predominante de documentos de uma página.
- Dashboard e relatório de inconsistências são calculados localmente.

**Limitação de produção:** o PaddleOCR da homologação carrega SDK, runtime e modelos de origens externas. A inferência é local, mas esses ativos devem ser hospedados pelo próprio Renomeia ou protegidos por solução equivalente de integridade antes da promoção para produção.

## Tipos documentais

Ficha C1 frente/verso, envelope, recibo de atendimento, recibo manual de emergência, Declaração de Trânsito (DT) e documentos diversos/não padronizados.

## Nomenclatura

`PPPPPP` representa o prontuário; `DDDDDD`, o número do documento.

| Tipo | Padrão |
| --- | --- |
| C1 frente | `PPPPPP_c1_frente.jpg` |
| C1 verso | `PPPPPP_c1_verso.jpg` |
| Envelope frente | `PPPPPP_DDDDDD_env_frente.jpg` |
| DT | `PPPPPP_DDDDDD_DT.jpg` |
| Envelope mensal — planejado | `PPPPPP_DDDDDD_env_mensal_frente.jpg` |

A extensão corresponde ao formato do arquivo; os exemplos acima usam JPG. O número da DT é o número impresso da declaração e `DT` permanece em maiúsculas. A indicação mensal será estendida aos recibos aplicáveis.

Mensal só deve ser reconhecido quando explícito no documento ou confirmado manualmente. A pasta ou a necessidade de desbloquear aprovação não constitui evidência de mensalidade.

## Evolução planejada — 05/10/2026

As funcionalidades desta seção ainda não devem ser consideradas disponíveis. A implementação será dividida em entregas pequenas, com validação em documentos reais.

### Dois modos independentes

| Modo | Responsabilidade |
| --- | --- |
| **Renomear documentos** | Orientação, tipo, prontuário, número, indicação de mensal, nome proposto, colisões e confirmação da alteração |
| **Auditar atendimento** | Documentos correspondentes, datas/modalidade, assinaturas/carimbos, preenchimento e regras institucionais |

No modo Renomear, a ausência de C1 ou envelope no lote não será cobrada. Identidade insegura, arquivos vazios e conflitos de nomes continuarão bloqueando a operação. Renomear não aprovará a auditoria.

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
- Acrescentar `_mensal` aos nomes aplicáveis mediante evidência explícita ou confirmação manual.
- Invalidar estado anterior de renomeação se uma edição mudar o nome proposto.
- Evitar nova renomeação de arquivos já padronizados.
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
| Identificação | Correspondência de prontuário e número entre documentos |

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
- Conformidade institucional depende também de governança, retenção e controles organizacionais.

## Governança

- `main`: produção/estável; **não mergear sem autorização explícita do André**.
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
