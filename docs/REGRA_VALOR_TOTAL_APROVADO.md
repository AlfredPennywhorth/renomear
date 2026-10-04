# Regra complementar — carimbo VALOR TOTAL APROVADO

## Regra do envelope/recibo

Nos envelopes/recibos não mensais, o sistema deverá distinguir pelo menos dois campos de valor:

1. **campo de compra/mercadorias/comprovantes** — valor gasto com mercadorias/comprovantes;
2. **campo "foi deixado com a família..."** — valor entregue diretamente à família para outras necessidades.

## Exceção permitida

Quando o carimbo **VALOR TOTAL APROVADO** estiver presente e for reconhecido com confiança suficiente:

- o envelope pode ficar sem lançamento de valor no campo de compra/mercadorias/comprovantes;
- é aceitável haver valor apenas no campo "foi deixado com a família...";
- essa combinação não deve gerar alerta de procedimento por ausência de valor no campo superior.

## Furo de procedimento

Quando **não** houver carimbo **VALOR TOTAL APROVADO** e o documento **não** for atendimento mensal:

- se houver valor somente no campo "foi deixado com a família...";
- e o campo de compra/mercadorias/comprovantes estiver vazio ou apenas inutilizado;

o Renomear deverá sinalizar **REVISAR — possível furo de procedimento**.

Mensagem sugerida:

> Valor informado apenas no campo "foi deixado com a família", sem carimbo VALOR TOTAL APROVADO. Verifique o procedimento.

## Atendimento mensal

Nos atendimentos identificados como **Mensal**, essa regra não se aplica. A ausência de valor no campo de compra/mercadorias/comprovantes não deve gerar esse alerta apenas por haver valor no campo inferior.

## Regra de confiança

Se o sistema não conseguir determinar com segurança:

- se o carimbo VALOR TOTAL APROVADO está presente;
- se o campo de compra/mercadorias contém valor, traço ou está vazio;
- se o campo "foi deixado com a família" contém valor;

o resultado deve ser **REVISAR**, sem assumir conformidade ou não conformidade.

## Relação com outros carimbos

A presença de outros carimbos, como SOMENTE MATERIAIS, SOMENTE ROUPAS, DINHEIRO $$$ ou COMPROVANTE DENTRO DO ENVELOPE, não substitui automaticamente o carimbo VALOR TOTAL APROVADO para esta regra específica, salvo futura regra institucional explícita.
