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
