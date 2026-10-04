# Calibração de modelos documentais

Este documento consolida regras observadas nas amostras reais usadas para calibrar o Renomear. As amostras servem para definir regiões de leitura e regras de validação; não devem ser incorporadas ao produto nem enviadas a serviços externos.

## Ficha C1 — frente

Identificação principal: cabeçalho "FICHA DE APRESENTAÇÃO DE CASO".

Regiões de interesse:

- canto superior esquerdo: marcação REUNIÃO ou EMERGÊNCIA;
- canto superior direito: data da C1 e prontuário;
- bloco inferior: valor mensal, valor de momento, valor de emergência e valor por extenso;
- blocos de assinaturas: Irmãs da Piedade e Diáconos.

Regras:

- prontuário manuscrito deve ser normalizado para seis algarismos;
- REUNIÃO: a data da C1 deve coincidir com a **Data da Reunião do cabeçalho do envelope/recibo** do mesmo prontuário;
- EMERGÊNCIA: a data da C1 deve ser anterior à Data da Reunião do cabeçalho do envelope/recibo;
- valores não aplicáveis devem estar explicitamente inutilizados com traço;
- o valor por extenso pode ser usado como conferência do total numérico quando a leitura estiver suficientemente segura.

Exemplo de calibração observado:

- prontuário manuscrito 1990 -> 001990;
- data C1 05/09/2026;
- marcação REUNIÃO;
- valor mensal inutilizado;
- valor de momento R$ 600,00;
- valor de emergência inutilizado;
- valor por extenso: seiscentos reais.

## Ficha C1 — verso / Pedido de roupas e diversos

Identificação principal: título "PEDIDO DE ROUPAS E DIVERSOS".

Regiões de interesse:

- descrição do produto;
- quantidade;
- idade, tamanho e observação quando preenchidos;
- futuro campo de prontuário, se o procedimento institucional for alterado.

Regra de associação:

- sem prontuário próprio, o verso não deve ser vinculado automaticamente a uma C1 apenas por proximidade na pasta;
- descrição do item, quantidade ou semelhança com a Declaração de Trânsito não são chaves confiáveis de vínculo;
- enquanto o verso não trouxer prontuário, exigir associação humana com a C1 frente;
- após associação, nome sugerido: PRONTUARIO_c1_verso.ext.

## Envelope / recibo

Identificação principal: cabeçalho "OBRA DA PIEDADE" e bloco "RECIBO".

O documento possui datas com significados diferentes. Elas não podem ser confundidas:

1. **Data da Reunião** — canto superior direito. É esta data que participa da regra de cruzamento com a Ficha C1.
2. **Data/carimbo do recibo** — região central, próxima ao valor. É uma data própria do recibo e não precisa coincidir com a data da C1.
3. **Data da assinatura/autorização** — região inferior. Deve ser validada como campo próprio quando aplicável, mas não substitui a Data da Reunião.

Regiões de interesse:

- canto superior direito: prontuário, Data da Reunião e sequência;
- linha de modalidade/valor: identificar ocorrência explícita de "Mensal";
- bloco de valores: valor principal, comprovantes e valor deixado com a família;
- área de assinaturas;
- data e assinatura do atendido no rodapé.

Atendimento mensal:

- considerar mensal somente quando houver indicação textual confiável de "Mensal";
- não inferir mensalidade apenas pela existência de um valor;
- quando mensal, não exigir Ficha C1 correspondente;
- quando não mensal, aplicar o cruzamento com a C1 do mesmo prontuário.

Exemplo de calibração observado:

- prontuário 001990;
- Data da Reunião 05/09/2026;
- sequência 054665;
- data/carimbo do recibo 03/10/2026;
- valor R$ 600,00;
- campo de comprovantes inutilizado por traço;
- valor deixado com a família R$ 600,00;
- atendimento não identificado como mensal;
- a Data da Reunião coincide com a C1 marcada como REUNIÃO: OK.

Nome sugerido: PRONTUARIO_SEQUENCIA_env_frente.ext.

## Declaração de trânsito

Identificação principal: título "Declaração de trânsito".

Regiões de interesse:

- quadro superior direito: número da declaração e data;
- bloco do destinatário: prontuário;
- tabela de itens: código, descrição e quantidade;
- área de retirada: assinatura.

Regras:

- número da declaração e prontuário devem ser extraídos separadamente;
- a data da Declaração de Trânsito é própria do documento e não deve ser comparada automaticamente com a data da C1 ou do envelope sem regra institucional específica;
- presença e legibilidade da assinatura podem ser validadas separadamente.

Exemplo de calibração observado:

- nº 013068;
- data 02/09/2026;
- prontuário 001990;
- item CESTA BÁSICA, quantidade 1,00.

Nome sugerido: PRONTUARIO_NUMERO_dt.ext.

## Estratégia de OCR

1. Classificar o modelo por textos fixos e geometria.
2. Corrigir orientação/perspectiva antes de ler campos.
3. Ler primeiro campos impressos em regiões fixas.
4. Usar reconhecimento manuscrito somente em regiões necessárias.
5. Restringir o alfabeto quando o campo for numérico.
6. Manter confiança por campo, não apenas por documento.
7. Quando a confiança for insuficiente, mostrar o recorte e exigir revisão humana.


### Amostra mensal confirmada

Nova amostra confirma o marcador textual de atendimento mensal no próprio envelope/recibo:

- prontuário: 002001;
- Data da Reunião: 04/07/2026;
- sequência: 053414;
- linha de modalidade: "C = Mensal R$ 1.500,00";
- carimbo/data do recibo: 01 AGO 2026;
- data manuscrita inferior: 31/07/2026.

Regra consolidada:

- a ocorrência explícita da palavra "Mensal" na linha de modalidade é evidência suficiente para classificar o envelope/recibo como atendimento mensal;
- nesse caso, não é esperada Ficha C1 correspondente e sua ausência não gera REVISAR;
- a Data da Reunião continua sendo extraída para registro do próprio envelope, mas não é cruzada com C1;
- as demais datas do documento continuam independentes e não alteram a classificação mensal.

### Nova amostra C1 + DT

Outra amostra confirma:

- Ficha C1 frente com prontuário manuscrito 3750 -> 003750;
- C1 marcada como REUNIÃO;
- data da C1: 04/07/2026;
- Declaração de Trânsito nº 012415;
- prontuário da DT: 003750;
- data da DT: 02/07/2026.

A data da Declaração de Trânsito não deve ser comparada com a data da C1. O vínculo por prontuário pode ser usado apenas como conferência de pertencimento ao mesmo atendimento quando aplicável.


## Orientação e documentos fora do padrão

As novas amostras confirmam que documentos podem ser digitalizados de lado. O Renomear deve tentar corrigir a orientação **em memória**, sem alterar o arquivo original, antes de rejeitar a leitura.

### Estratégia

1. testar a orientação original;
2. se a confiança de classificação/leitura for insuficiente, testar rotações de 90°, 180° e 270°;
3. escolher a orientação com maior confiança somente se ultrapassar o limiar mínimo definido;
4. registrar que houve correção automática de orientação;
5. executar classificação, OCR e validações sobre a imagem corrigida em memória;
6. manter o arquivo original intacto até a etapa final de renomeação.

### Rejeição

Se nenhuma orientação permitir leitura confiável, o documento deve ser rejeitado para nova digitalização. Não tentar adivinhar o tipo ou os campos.

Mensagem padrão:

> Documento fora do padrão de leitura. Redigitalize o documento em posição correta, completo, legível e sem cortes.

Outras causas de rejeição, mesmo com orientação correta:

- documento cortado de forma que esconda campos obrigatórios;
- resolução insuficiente para leitura;
- desfoque significativo;
- contraste insuficiente;
- modelo não reconhecido;
- mais de um documento relevante na mesma imagem quando isso impedir a classificação segura.

A correção automática de orientação é um mecanismo de tolerância operacional; ela não transforma imagens ilegíveis ou incompletas em documentos válidos.


## Regras de múltiplas Fichas C1

Mais de uma Ficha C1 para o mesmo prontuário pode ser legítima em três situações:

1. uma ficha representa atendimento de **EMERGÊNCIA** e outra representa atendimento de **REUNIÃO**;
2. há mais de uma ficha para a mesma situação porque o conteúdo/material não cabe em uma única ficha;
3. há versos adicionais vinculados ao mesmo atendimento por necessidade de registrar mais informações ou mercadorias.

Quando houver duas fichas para a **mesma situação**, o procedimento deverá exigir marcação visível de paginação, por exemplo:

- `1/2`
- `2/2`

O Renomear deverá:

- tentar reconhecer essa paginação;
- exigir que todas as partes tenham o mesmo prontuário e o mesmo contexto de atendimento;
- verificar se a sequência está completa, sem duplicidade e sem salto;
- não tratar `1/2` e `2/2` como duplicidade documental;
- sinalizar **REVISAR** se houver mais de uma C1 para a mesma situação sem paginação identificável;
- sinalizar **REVISAR** se aparecer apenas uma das partes esperadas.

A existência de duas C1 com datas/contextos diferentes (por exemplo, EMERGÊNCIA e posteriormente REUNIÃO) não exige paginação entre elas.

## Regra de cores da Ficha C1

A Ficha C1 possui regra institucional de preenchimento por cor:

- **campos inferiores**: preenchimento obrigatório com **caneta vermelha**;
- **demais campos**: preenchimento obrigatório com **caneta azul**.

Para o Renomear, a página deve ser dividida em pelo menos duas zonas:

1. **zona superior/principal** — esperada em azul;
2. **zona inferior de fechamento/reunião** — esperada em vermelho.

Validação prevista:

- tinta azul dominante nos campos superiores: OK;
- tinta vermelha dominante nos campos inferiores: OK;
- cor incompatível claramente detectada: NÃO CONFORME;
- cor impossível de determinar com segurança: REVISAR.

### Limitação importante

A cor não pode ser validada de modo confiável em digitalizações em escala de cinza, preto e branco, baixa saturação, iluminação deficiente ou scanner que altere significativamente as cores. Nesses casos, o sistema **não deve presumir conformidade nem não conformidade**; deve apresentar **REVISAR** e informar que a cor não pôde ser confirmada.

A validação de cor deve ocorrer sobre regiões específicas da ficha e não sobre a página inteira, porque carimbos, logotipos, impressão gráfica e marcas de conferência podem usar outras cores.


## Rotina administrativa e carimbos

A imagem institucional "Obra da Piedade — Rotinas Administrativas — Fluxo dos Documentos" acrescenta regras úteis para conferência documental e para reconhecimento de carimbos.

### Chegada na reunião

**Envelopes e DTs**

- receber envelopes e DTs;
- conferir a soma de valores e comprovantes;
- se houver erro, aplicar carimbo de correção.

**Fichas C1**

- conferir o preenchimento;
- após a conferência, aplicar o carimbo **CONFERIDO**.

### Durante a reunião

**Fichas C1**

- conferir os dados da Ficha C1 no SIGA;
- após confirmação dos dados no SIGA e/ou geração de novo prontuário, aplicar o carimbo **LANÇADO**.

**Envelopes e DTs**

- realizar baixa na prestação de contas;
- após a baixa, aplicar o carimbo **BAIXADO**.

**Novos envelopes**

Antes da entrega, conferir prontuário, nome e valor. O documento também deve receber conferência antes do encaminhamento.

### Processo de digitalização

- localizar a Ficha C1 do mês anterior e juntá-la ao envelope e/ou DT quando aplicável;
- todos os documentos devem ser digitalizados obrigatoriamente em formato de imagem;
- digitalizar em arquivos separados:
  - envelope — frente e, quando necessário, verso;
  - Ficha C1 — frente;
  - Ficha C1 — verso;
  - DT — quando houver;
- após cada documento ser digitalizado, aplicar o carimbo **DIGITALIZADO**.

### Padronização de nomenclatura

A imagem institucional mostra como elementos de nomenclatura:

- prontuário;
- documento;
- tipo.

Tipos explicitamente previstos:

- Envelope (frente e, quando necessário, verso);
- Ficha C1 — Frente;
- Ficha C1 — Verso;
- DT.

A regra exata de composição do nome no Renomear continua sendo definida pelas amostras reais e pelas regras atuais do projeto; a tabela institucional serve como referência de obrigatoriedade dos componentes e tipos.

### Mesa de Atendimento — carimbos de decisão

A imagem registra os seguintes carimbos possíveis:

- **VALOR TOTAL APROVADO** — quando o valor foi autorizado pela reunião e entregue ao necessitado sem comprovante, com anotação do valor no carimbo;
- **SOMENTE MATERIAIS** — quando o atendimento for somente com fralda ou cesta de alimentação;
- **SOMENTE ROUPAS** — quando o atendimento for somente com roupas.

Também há orientação para o preenchimento do campo de identificação do atendimento na Ficha C1:

- roupas de uso pessoal;
- roupas de cama;
- diversos.

### Considerações

A imagem registra que:

- nem todos os casos terão DT;
- nos atendimentos de emergência, não haverá assinatura no envelope; a assinatura ocorre no recibo de emergência;
- quando não houver assinatura do necessitado, mas existir comprovante dentro do envelope no mesmo valor ou superior ao atendimento, aplicar o carimbo **COMPROVANTE DENTRO DO ENVELOPE** e digitalizar o comprovante;
- quando o valor for entregue em dinheiro no dia da reunião, aplicar o carimbo **DINHEIRO $$$**.

Também aparece o carimbo **ASSINATURA DO ATENDIDO NO RECIBO** para os casos de emergência.

### Dupla conferência

Após a anexação de todos os arquivos, outra pessoa deve realizar uma segunda conferência para garantir integridade e rastreabilidade das informações.

### Rotinas fora da reunião

A imagem registra como sequência operacional:

1. receber envelopes atrasados;
2. baixar na prestação de contas;
3. conferir soma e comprovantes;
4. localizar a correspondente Ficha C1 e DT, quando houver;
5. digitalizar os documentos em formato de imagem e anexar ao atendimento/prontuário correspondente;
6. atualizar a relação de pendências;
7. enviar arquivo no grupo, atualizando as pendências do mês.

## Implicações para o Renomear

Esses carimbos podem funcionar como sinais auxiliares de classificação e conformidade, mas não devem ser usados isoladamente como chave de identificação do prontuário.

O sistema deverá, quando possível:

- detectar presença dos carimbos institucionais;
- registrar quais carimbos foram identificados;
- comparar carimbos esperados com o tipo e a etapa do documento;
- sinalizar ausência ou incompatibilidade para REVISAR, não para rejeição automática, salvo regra institucional específica;
- tratar carimbos como evidência complementar ao OCR dos campos estruturados.


### Regra complementar — VALOR TOTAL APROVADO

Nos envelopes/recibos não mensais, quando houver valor apenas no campo "foi deixado com a família..." e o campo de compra de mercadorias/comprovantes estiver vazio ou inutilizado, o Renomear deve conferir a **Ficha C1 correspondente que aprovou o atendimento**.

Se essa Ficha C1 contiver o carimbo **VALOR TOTAL APROVADO**, a situação é aceita. Se a Ficha C1 correspondente não contiver o carimbo, sinalizar **REVISAR — possível furo de procedimento**.

O carimbo não deve ser procurado no envelope/recibo para esta regra, pelas regras atuais.

A regra não se aplica aos atendimentos identificados como **Mensal**, pois nesse caso não é esperada Ficha C1 correspondente.

Detalhamento em `docs/REGRA_VALOR_TOTAL_APROVADO.md`.


## Recibo manual de emergência

Identificação principal: cabeçalho **RECIBO DE ATENDIMENTO — OBRA DA PIEDADE**.

Regiões de interesse:

- prontuário;
- data do atendimento;
- valor;
- localidade/setor;
- nome do atendido;
- responsável pelo atendimento;
- campo de adiantamento/comprovantes;
- campo "foi deixado com a família...";
- assinatura do atendido.

### Regra de vínculo da emergência

O atendimento de emergência deve formar uma cadeia documental coerente:

1. **Recibo manual de emergência** — registra a data real em que o atendimento emergencial ocorreu e deve conter a assinatura do atendido.
2. **Ficha C1 marcada como EMERGÊNCIA** — deve usar a **data do atendimento emergencial**, isto é, a mesma data do recibo manual.
3. **Envelope/recibo da reunião** — usa a **Data da Reunião**, posterior à emergência, e deve indicar que o valor/contexto se refere a **EMERGÊNCIA**.

Validação esperada:

- data C1 emergência = data do recibo manual;
- data C1 emergência < Data da Reunião do envelope/recibo;
- envelope/recibo deve apresentar indicação de emergência;
- ausência da assinatura no envelope é aceitável quando houver recibo manual assinado e/ou carimbo institucional correspondente;
- se o recibo manual não trouxer prontuário, não associá-lo automaticamente apenas por proximidade dos arquivos.

### Associação do recibo manual sem prontuário

Quando o campo de prontuário do recibo manual estiver em branco, o Renomear pode usar nome do atendido, data e valor como sinais auxiliares, mas não como chave definitiva. Se não houver correspondência inequívoca com uma C1 de emergência, exigir associação humana.

Após associação segura, o recibo manual poderá receber nome baseado no prontuário vinculado, por exemplo:

`PRONTUARIO_rec_emergencia.ext`

### Amostra de calibração recebida

No conjunto recebido:

- recibo manual: data 01/02/2026, valor R$ 1.000,00, assinatura do atendido presente e prontuário em branco;
- C1: marcada como EMERGÊNCIA, prontuário manuscrito 4354 -> 004354;
- envelope/recibo: prontuário 004354, Data da Reunião 18/02/2026, sequência 051128 e indicação "Emergência" no bloco de valores.

A amostra deve ser usada também para detectar inconsistências de procedimento: se a C1 de emergência estiver preenchida com a data da reunião em vez da data real do atendimento, o Renomear deverá sinalizar **NÃO CONFORME** quando o recibo manual permitir demonstrar a data correta da emergência.
