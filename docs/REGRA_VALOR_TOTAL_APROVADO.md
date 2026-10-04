# Regra complementar — carimbo VALOR TOTAL APROVADO

## Onde o carimbo deve estar

O carimbo **VALOR TOTAL APROVADO** pertence à **Ficha C1 que aprovou o atendimento**.

Pelas regras atuais, ele **não deve ser procurado no envelope/recibo** para esta validação.

## Regra do envelope/recibo

Nos envelopes/recibos não mensais, o sistema deverá distinguir pelo menos dois campos de valor:

1. **campo de compra/mercadorias/comprovantes** — valor gasto com mercadorias/comprovantes;
2. **campo "foi deixado com a família..."** — valor entregue diretamente à família para outras necessidades.

## Exceção permitida

Quando o envelope/recibo não mensal tiver valor apenas no campo "foi deixado com a família..." e o campo de compra/mercadorias/comprovantes estiver vazio ou inutilizado, o Renomear deverá localizar a **Ficha C1 correspondente que aprovou o atendimento**.

Se nessa Ficha C1 estiver presente o carimbo **VALOR TOTAL APROVADO**, a situação é aceita e não deve gerar alerta de procedimento por ausência de valor no campo superior do envelope/recibo.

## Furo de procedimento

Quando o documento **não** for atendimento mensal:

- houver valor apenas no campo "foi deixado com a família...";
- o campo de compra/mercadorias/comprovantes estiver vazio ou inutilizado;
- e a Ficha C1 correspondente **não** contiver o carimbo **VALOR TOTAL APROVADO**;

o Renomear deverá sinalizar **REVISAR — possível furo de procedimento**.

Mensagem sugerida:

> Valor informado apenas no campo "foi deixado com a família", sem carimbo VALOR TOTAL APROVADO na Ficha C1 correspondente. Verifique o procedimento.

## Atendimento mensal

Nos atendimentos identificados como **Mensal**, essa regra não se aplica porque não é esperada Ficha C1 correspondente.

## Regra de vínculo

Para aplicar esta validação, o sistema deve relacionar o envelope/recibo à Ficha C1 correta usando o prontuário e o contexto do atendimento.

Quando houver mais de uma Ficha C1 do mesmo prontuário, o sistema não deve escolher apenas pela proximidade dos arquivos. Deve considerar, conforme disponível:

- REUNIÃO ou EMERGÊNCIA;
- data;
- paginação da ficha;
- demais sinais de vínculo já definidos.

Se a Ficha C1 que aprovou o atendimento não puder ser determinada com segurança, o resultado deve ser **REVISAR**.

## Regra de confiança

Se o sistema não conseguir determinar com segurança:

- qual é a Ficha C1 correspondente;
- se nela está presente o carimbo VALOR TOTAL APROVADO;
- se o campo de compra/mercadorias contém valor, traço ou está vazio;
- se o campo "foi deixado com a família" contém valor;

o resultado deve ser **REVISAR**, sem assumir conformidade ou não conformidade.

## Relação com outros carimbos

A presença de outros carimbos, como SOMENTE MATERIAIS, SOMENTE ROUPAS, DINHEIRO $$$ ou COMPROVANTE DENTRO DO ENVELOPE, não substitui automaticamente o carimbo VALOR TOTAL APROVADO para esta regra específica, salvo futura regra institucional explícita.
