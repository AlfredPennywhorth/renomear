# Plano de teste — OCR híbrido local

## Objetivo

Validar a nova leitura de identidade documental sem usar API paga ou serviço remoto de processamento de documentos.

O Renomear continua processando as imagens no navegador. A homologação usa:

- Tesseract.js local para orientação, classificação e leitura principal;
- PaddleOCR.js oficial como segunda leitura do **recorte do prontuário**;
- confiança por campo para decidir se o prontuário pode ser usado automaticamente;
- revisão humana quando os leitores discordam ou não atingem o limiar mínimo.

A SDK e os modelos do PaddleOCR são baixados de origens públicas fixadas pela aplicação. A imagem do documento não é enviada para uma API de OCR. Antes de produção, a recomendação é hospedar também esses ativos no próprio projeto para eliminar a dependência externa em tempo de execução.

## Critério de segurança

O sistema deve preferir **não identificar** a identificar incorretamente.

Renomeação automática só pode ocorrer quando:

1. o tipo documental foi identificado;
2. o prontuário é válido;
3. a confiança do prontuário é suficiente ou houve concordância entre os leitores;
4. quando o tipo exige número/sequência, esse campo também tem leitura válida e confiança suficiente;
5. não existe divergência entre Tesseract e PaddleOCR;
6. não existe erro de OCR nem rotação física pendente em PDF.

A data **não é requisito para formar ou salvar o nome do arquivo**. Ela permanece como dado de auditoria e cruzamento de regras.

## Lote A — 71 Fichas C1

Usar novamente o mesmo lote de 71 imagens já utilizado na calibração.

Registrar:

- total analisado;
- total renomeado automaticamente;
- total em REVISAR;
- total NÃO CONFORME;
- total com orientação corrigida;
- total com prontuário correto;
- total com prontuário incorreto;
- total em que o sistema recusou identificar o prontuário;
- total de divergências Tesseract × PaddleOCR.

### Critério de aceite inicial

O requisito mais importante é **zero renomeação automática com prontuário incorreto**.

A taxa de leitura correta pode ser aumentada nas rodadas seguintes. Um documento não identificado deve ir para REVISAR, nunca receber um número presumido.

## Lote B — envelopes/recibos e DTs

Usar o lote de 79 imagens:

- 74 envelopes/recibos;
- 5 Declarações de Trânsito.

Verificar separadamente:

- prontuário;
- sequência/número do documento;
- Data da Reunião ou data própria da DT;
- classificação do tipo;
- indicação Mensal quando existir;
- nome proposto.

A data deve participar da auditoria, mas não bloquear a criação do nome quando os campos de identidade estiverem seguros.

## Teste de edição manual

Abrir um documento em REVISAR e:

1. clicar no prontuário;
2. apagar o valor;
3. digitar o prontuário correto sem perder o foco;
4. sair do campo;
5. confirmar a normalização para seis dígitos;
6. digitar a data completa sem precisar clicar novamente entre os algarismos;
7. fechar a revisão;
8. abrir novamente o documento;
9. conferir que a correção manual permaneceu na fila.

Uma correção manual de prontuário deve ser marcada internamente como fonte MANUAL e não pode ser sobrescrita automaticamente na mesma sessão por nova leitura OCR.

## Teste de divergência

Quando Tesseract e PaddleOCR devolverem prontuários diferentes:

- o sistema não deve escolher um deles;
- o prontuário automático deve ficar vazio;
- o status deve permanecer REVISAR;
- deve aparecer a verificação “Prontuário — divergência entre leitores”;
- o arquivo não pode ser renomeado automaticamente.

## Teste de indisponibilidade do OCR aprimorado

Simular bloqueio de rede para os ativos externos do PaddleOCR.

Esperado:

- Tesseract continua funcionando;
- nenhuma imagem é enviada a serviço externo;
- se Tesseract não atingir sozinho o limiar seguro, o prontuário permanece sem identificação;
- o documento vai para REVISAR;
- a falha do segundo leitor aparece como verificação, sem interromper todo o lote.

## Registro do resultado

Para cada rodada, registrar somente métricas agregadas e exemplos anonimizados. Não anexar imagens reais, nomes, prontuários ou conteúdo sensível em issues, PRs, logs ou artefatos públicos.


## Bloqueador antes de produção

A homologação pode usar os ativos públicos fixados do PaddleOCR para medir a qualidade da leitura sem custo de API. **Não promover esta integração para `main`/produção enquanto SDK, runtime WASM e modelos não estiverem hospedados sob a origem controlada pelo Renomear ou protegidos por mecanismo equivalente de integridade.**

Motivo: embora o documento não seja enviado a uma API de OCR, código executável carregado em tempo de execução de uma origem externa amplia a cadeia de confiança. A homologação deve servir somente para validar acurácia e desempenho; a etapa de self-host dos ativos é requisito de segurança para produção.


## Regressões funcionais cobertas nesta rodada

Na homologação, confirmar também:

- uma leitura do prontuário encontrada apenas no OCR de página inteira não pode ser usada para renomeação automática sem confiança específica do campo;
- documentos já renomeados continuam com a ação **Revisar** disponível, pois renomeação e auditoria são estados independentes;
- a ausência de data não impede o arquivo de entrar em **Renomear prontos** quando os campos que formam o nome estiverem seguros;
- uma sequência/número corrigida manualmente deve ser tratada como confiança manual na sessão;
- a data continua obrigatória somente quando a regra de auditoria correspondente precisar dela para declarar conformidade.


## Regressão de edição e aprovação manual

Validar também estes dois comportamentos no painel de revisão:

1. **Sequência / nº do documento**
   - clicar uma vez no campo;
   - digitar todos os algarismos sem precisar clicar novamente entre cada tecla;
   - sair do campo ou pressionar Enter;
   - confirmar que o valor permanece salvo e o nome proposto é atualizado.

2. **Aprovar como OK**
   - abrir um documento corretamente identificado/renomeado que esteja em REVISAR apenas por alertas passíveis de conferência humana;
   - conferir visualmente os campos;
   - clicar em **Aprovar como OK**;
   - confirmar que o status permanece OK ao voltar para a fila;
   - uma validação **NÃO CONFORME** continua impedindo aprovação;
   - a ausência de data não bloqueia a aprovação humana quando a data não é necessária para formar o nome, mas a informação permanece disponível para a auditoria correspondente.

3. **Reprocessamento após correção manual**
   - corrigir manualmente prontuário ou sequência;
   - executar Processar lote novamente;
   - confirmar que a correção manual não é substituída por nova leitura OCR.
