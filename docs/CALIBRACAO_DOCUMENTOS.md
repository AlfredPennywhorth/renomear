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
