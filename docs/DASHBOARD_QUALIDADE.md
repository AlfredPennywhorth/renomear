# Dashboard de Qualidade Documental

## Objetivo

Dar aos responsáveis uma visão simples da qualidade da documentação processada na sessão, sem criar um banco de dados central e sem enviar documentos ao servidor.

## Indicadores

### Conformidade dos avaliados

Fórmula:

`OK / documentos avaliados × 100`

Documentos PENDENTES não entram no denominador.

### Cobertura da conferência

Fórmula:

`documentos avaliados / total de documentos × 100`

Esse indicador evita interpretar uma taxa alta de conformidade como resultado final quando grande parte da pasta ainda não foi revisada.

### Para revisar

Quantidade de documentos classificados como REVISAR.

### Não conformes

Quantidade de documentos classificados como NÃO CONFORME.

### Inconsistências registradas

Quantidade de linhas disponíveis no relatório de inconsistências.

## Visões adicionais

- qualidade por tipo documental;
- inconsistências mais frequentes;
- contagem de OK, REVISAR e NÃO CONFORME por tipo.

## Interpretação

O Dashboard mede a qualidade do lote processado na sessão. Ele não representa auditoria histórica da instituição nem índice consolidado entre reuniões enquanto não houver decisão explícita sobre persistência e governança dos dados.

## Privacidade

O Dashboard é calculado em memória no navegador. Nesta fase, os indicadores não são enviados a servidor nem armazenados de forma centralizada.
