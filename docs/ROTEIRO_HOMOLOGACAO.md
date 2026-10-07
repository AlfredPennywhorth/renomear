# Roteiro de Homologação — Renomear

## Objetivo

Validar o fluxo funcional do Renomear antes da integração completa do OCR/classificador local.

Esta rodada deve usar **somente cópias dos documentos**, nunca os arquivos originais.

## Preparação

1. Criar uma pasta exclusiva de teste.
2. Copiar para ela uma amostra de cada tipo já conhecido:
   - Ficha C1 — frente;
   - Ficha C1 — verso;
   - Envelope/recibo;
   - Declaração de Trânsito;
   - atendimento mensal;
   - atendimento de reunião;
   - atendimento de emergência;
   - documento digitalizado de lado;
   - conjunto com mais de uma C1 do mesmo prontuário.
3. Garantir que as cópias tenham nomes genéricos, por exemplo:
   - scan001.jpg
   - scan002.jpg
   - scan003.jpg
4. Não usar pasta sincronizada com nuvem quando a política institucional exigir permanência local.

---

## Bloco A — Acesso e segurança

### H-SEC-01 — Aviso de segurança

**Passos**
1. Abrir o Renomear.
2. Não marcar o aviso de segurança.
3. Tentar selecionar uma pasta.

**Esperado**
- O sistema não permite selecionar a pasta.
- Exibe orientação para confirmação das regras de segurança.

### H-SEC-02 — Seleção autorizada

**Passos**
1. Marcar a ciência dos cuidados de segurança.
2. Selecionar a pasta de testes.

**Esperado**
- A pasta é aceita.
- Nenhum arquivo é enviado ao servidor.
- A quantidade de arquivos suportados é exibida.

---

## Bloco B — Enumeração e formatos

### H-FILE-01 — Listagem de arquivos

**Passos**
1. Selecionar uma pasta contendo JPG, JPEG, PNG, WEBP e PDF.
2. Incluir também um arquivo não suportado, como TXT.

**Esperado**
- Apenas os formatos suportados entram na fila.
- O arquivo não suportado é ignorado.

### H-FILE-02 — Ordenação

**Passos**
1. Usar arquivos como scan1.jpg, scan2.jpg e scan10.jpg.

**Esperado**
- A listagem usa ordenação natural.

---

## Bloco C — Revisão manual e normalização

### H-C1-01 — Prontuário com menos de 6 dígitos

**Dados**
- Tipo: Ficha C1 — frente
- Prontuário: 1990

**Esperado**
- Ao sair do campo, o prontuário vira 001990.
- O nome sugerido usa 001990.

### H-C1-02 — Prontuário inválido

**Dados**
- Prontuário com mais de 6 algarismos.

**Esperado**
- Não aprovar como OK.
- Documento permanece para revisão.

### H-C1-03 — Reunião

**Dados**
- Tipo: Ficha C1 — frente
- Marcação: REUNIÃO
- Data válida.

**Esperado**
- A marcação REUNIÃO fica registrada.
- Aprovação só é permitida com os campos obrigatórios válidos.

### H-C1-04 — Emergência

**Dados**
- Tipo: Ficha C1 — frente
- Marcação: EMERGÊNCIA
- Data válida.

**Esperado**
- A marcação EMERGÊNCIA fica registrada.

---

## Bloco D — Envelope/recibo

### H-ENV-01 — Nomeação padrão

**Dados**
- Prontuário: 2103
- Sequência: 054831
- Tipo: Envelope — frente

**Esperado**
- Nome sugerido: 002103_054831_env_frente.ext

### H-ENV-02 — Sequência inválida

**Dados**
- Sequência: 05A831

**Esperado**
- Campo destacado como inválido.
- Aprovação como OK bloqueada.

### H-ENV-03 — Data inválida

**Dados**
- Data: 31/02/2026

**Esperado**
- Campo destacado como inválido.
- Aprovação como OK bloqueada.

### H-ENV-04 — Atendimento mensal

**Dados**
- Marcar Atendimento mensal.

**Esperado**
- O sistema registra que não é esperada Ficha C1 correspondente.
- A ausência de C1 não gera pendência de cruzamento.

---

## Bloco E — Cruzamento C1 x envelope

### H-XDOC-01 — Reunião com data igual

**Dados**
- C1: prontuário 001990, REUNIÃO, data 05/09/2026
- Envelope: prontuário 001990, data da reunião 05/09/2026

**Esperado**
- Validação de data: OK.

### H-XDOC-02 — Reunião com data diferente

**Dados**
- C1: REUNIÃO, 04/09/2026
- Envelope: 05/09/2026

**Esperado**
- Validação: NÃO CONFORME.

### H-XDOC-03 — Emergência anterior à reunião

**Dados**
- C1: EMERGÊNCIA, 19/06/2026
- Envelope/recibo: data da reunião posterior.

**Esperado**
- Validação: OK.

### H-XDOC-04 — Emergência igual ou posterior

**Dados**
- C1: EMERGÊNCIA
- Data da C1 igual ou posterior à data da reunião do envelope.

**Esperado**
- Validação: NÃO CONFORME.

### H-XDOC-05 — Mensal sem C1

**Dados**
- Envelope/recibo marcado Mensal.
- Nenhuma C1 com o mesmo prontuário.

**Esperado**
- Correspondência com C1: não exigida.
- Sem alerta por ausência de C1.

---

## Bloco F — Múltiplas C1

### H-MULTI-01 — Emergência e reunião do mesmo prontuário

**Dados**
- Duas C1 com o mesmo prontuário.
- Uma EMERGÊNCIA e outra REUNIÃO.

**Esperado**
- Não tratar automaticamente como duplicidade.
- Cada uma preserva seu contexto.

### H-MULTI-02 — Duas partes da mesma situação

**Dados**
- Duas C1 da mesma situação com marcações 1/2 e 2/2.

**Esperado**
- Não tratar como duplicidade.
- Conjunto considerado completo.

### H-MULTI-03 — Parte faltante

**Dados**
- Apenas 1/2 presente.

**Esperado**
- REVISAR por conjunto incompleto.

### H-MULTI-04 — Duas fichas sem paginação

**Dados**
- Duas C1 da mesma situação e mesmo contexto sem 1/2 e 2/2.

**Esperado**
- REVISAR.

---

## Bloco G — C1 verso

### H-VERSO-01 — Verso sem prontuário

**Dados**
- Tipo: Ficha C1 — verso / Pedido de Roupas e Diversos
- Sem prontuário.

**Esperado**
- Não inferir vínculo pela proximidade dos arquivos.
- Exigir associação humana antes da aprovação/nomeação definitiva.

### H-VERSO-02 — Verso associado manualmente

**Dados**
- Associar ao prontuário 001990.

**Esperado**
- Nome sugerido: 001990_c1_verso.ext

---

## Bloco H — Declaração de Trânsito

### H-DT-01 — Nomeação

**Dados**
- Prontuário: 001990
- Nº DT: 013068

**Esperado**
- Nome sugerido: 001990_013068_dt.ext

### H-DT-02 — Data independente

**Dados**
- DT com data diferente da C1.

**Esperado**
- Não gerar não conformidade apenas pela diferença de datas.

---

## Bloco I — Cores da C1

> Nesta fase, enquanto a análise automática de cor ainda não estiver integrada, validar manualmente o comportamento esperado da regra.

### H-COLOR-01 — Cores corretas

**Esperado**
- Campos superiores: azul.
- Campos inferiores: vermelho.

### H-COLOR-02 — Cor incompatível

**Esperado futuro**
- NÃO CONFORME quando a cor errada for detectada com confiança.

### H-COLOR-03 — Imagem sem cor confiável

**Esperado futuro**
- REVISAR, não NÃO CONFORME.

---

## Bloco J — Campos de valores

### H-VAL-01 — Campo preenchido ou inutilizado

**Esperado**
- Campo monetário é aceitável quando:
  - contém valor legível; ou
  - está explicitamente inutilizado com traço.

### H-VAL-02 — Campo vazio sem inutilização

**Esperado**
- REVISAR.

### H-VAL-03 — VALOR TOTAL APROVADO

**Cenário**
- Envelope/recibo não mensal.
- Valor apenas no campo "foi deixado com a família...".
- Campo superior de compra/mercadorias/comprovantes vazio ou inutilizado.
- A C1 correspondente contém carimbo VALOR TOTAL APROVADO.

**Esperado**
- Não gerar alerta de furo de procedimento.

### H-VAL-04 — Possível furo de procedimento

**Cenário**
- Mesmo caso anterior, mas a C1 correspondente não tem VALOR TOTAL APROVADO.

**Esperado**
- REVISAR — possível furo de procedimento.

### H-VAL-05 — Mensal

**Cenário**
- Envelope mensal com valor apenas no campo inferior.

**Esperado**
- A regra de VALOR TOTAL APROVADO não é aplicada.

---

## Bloco K — Assinaturas

### H-SIGN-01 — Assinatura presente e legível

**Esperado futuro**
- OK.

### H-SIGN-02 — Rubrica ou assinatura não identificável

**Esperado futuro**
- REVISAR.

### H-SIGN-03 — Emergência

**Esperado**
- Envelope é obrigatório. Se não estiver assinado, deve conter o carimbo **ASSINATURA DO ATENDIDO NO RECIBO**, mesmo quando o recibo manual assinado estiver disponível. Conferir a assinatura do recibo separadamente. Ausência confirmada de assinatura e carimbo no envelope é não conformidade; evidência inconclusiva permanece em REVISAR. Regra esclarecida pelo responsável pelo projeto em 05/10/2026.

---

## Bloco L — Orientação

### H-ORI-01 — Documento correto

**Esperado**
- Orientação 0°.
- Sem correção.

### H-ORI-02 — Documento de lado

**Esperado futuro**
- Sistema testa 90°, 180° e 270°.
- Escolhe a orientação com melhor confiança.
- Corrige em memória.
- Original permanece intacto.

### H-ORI-03 — Documento ilegível

**Esperado**
- Rejeitar com a mensagem:

> Documento fora do padrão de leitura. Redigitalize o documento em posição correta, completo, legível e sem cortes.

---

## Bloco M — Duplicidade de nomes

### H-DUP-01 — Dois arquivos com mesmo nome proposto

**Esperado**
- Exibir aviso de nome duplicado.
- Bloquear renomeação em lote.

---

## Bloco N — Visualização local

### H-PREV-01 — Imagem

**Esperado**
- Abrir a imagem dentro do Renomear.
- Não realizar upload.

### H-PREV-02 — PDF

**Esperado**
- Abrir o PDF localmente.
- Não realizar upload.

---

## Bloco O — Renomeação

### H-REN-01 — Confirmação em lote

**Passos**
1. Aprovar dois ou mais documentos.
2. Clicar em Renomear aprovados.

**Esperado**
- Exibir tela final com:
  - nome atual;
  - nome proposto;
  - quantidade de arquivos.

### H-REN-02 — Renomeação bem-sucedida

**Esperado**
- Arquivo recebe o nome novo.
- Status RENOMEADO.
- Conteúdo permanece íntegro.

### H-REN-03 — Nome já existente

**Preparação**
- Criar previamente um arquivo com o nome de destino.

**Esperado**
- Não sobrescrever.
- Marcar ERRO.
- Preservar o original.

### H-REN-04 — Cancelamento

**Esperado**
- Nenhum arquivo alterado.

---

## Bloco P — Privacidade

### H-LGPD-01 — Sem dados em logs remotos

**Esperado**
- Nenhum nome de arquivo, prontuário, OCR ou conteúdo documental é enviado a analytics/logs externos.

### H-LGPD-02 — Sessão

**Esperado**
- Dados de revisão não persistem fora da sessão, salvo futura funcionalidade explicitamente aprovada.

---

# Critérios de saída desta rodada

A rodada funcional pode ser considerada aprovada se:

- seleção de pasta funcionar;
- arquivos suportados forem enumerados corretamente;
- revisão manual funcionar;
- normalização do prontuário funcionar;
- geração de nomes funcionar;
- regras estruturais de data/seqüência funcionarem;
- cruzamento manual C1 x envelope funcionar;
- mensal não exigir C1;
- duplicidade de nomes for bloqueada;
- confirmação em lote funcionar;
- renomeação preservar arquivos e não sobrescrever destino existente;
- avisos de segurança estiverem visíveis;
- nenhuma falha crítica impedir o fluxo principal.

# Fora do escopo desta primeira rodada

Ainda não devem ser considerados bloqueadores:

- OCR automático completo;
- leitura automática de caligrafia;
- detecção automática de carimbos;
- análise automática de cores;
- associação automática de C1 verso;
- recibo manual de emergência ainda não calibrado;
- correção visual real de orientação, caso ainda não esteja integrada ao pipeline de imagem.

Esses itens entram na próxima rodada após a validação do fluxo funcional.
