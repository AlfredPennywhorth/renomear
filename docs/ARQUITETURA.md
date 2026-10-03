# Arquitetura inicial

## Regra de privacidade

O Renomear deve ser desenhado para que documentos reais permaneçam no dispositivo do usuário. O frontend pode ser hospedado como aplicação estática, mas imagens e PDFs não devem ser enviados ao servidor para classificação ou OCR.

## Pipeline previsto

1. Seleção de pasta.
2. Enumeração de imagens e PDFs suportados.
3. Pré-processamento local.
4. Extração de texto quando houver camada textual.
5. OCR local para imagens/PDFs escaneados.
6. Classificação do tipo documental.
7. Extração de campos por tipo.
8. Validação documental por tipo.
9. Normalização do prontuário.
10. Geração do nome sugerido.
11. Revisão humana.
12. Renomeação confirmada.

## Navegadores

O acesso direto à pasta será implementado primeiro com File System Access API em navegadores Chromium compatíveis. Será mantido um fallback para navegadores sem essa API.

## IA e OCR

O MVP não deve depender de serviços externos que exijam o envio dos documentos. A escolha do mecanismo local de OCR/classificação será validada com amostras reais antes de fixarmos a biblioteca.

## Regra de prontuário

- Aceitar de 1 a 6 algarismos na entrada reconhecida/manual.
- Remover caracteres não numéricos apenas quando isso não gerar ambiguidade.
- Completar com zeros à esquerda até 6 posições.
- Mais de 6 algarismos: encaminhar para revisão.
- Ausente ou ilegível: encaminhar para revisão.

## Validação documental

Cada tipo documental terá um conjunto próprio de verificações. O resultado de cada regra deve ser OK, REVISAR ou NÃO CONFORME.

### Envelope / recibo — frente

- Identificar prontuário, data e sequência na região superior direita.
- Nome sugerido: PRONTUARIO_SEQUENCIA_env_frente.ext.
- Confirmar que o campo principal de valor está preenchido.
- Para cada campo monetário adicional, aceitar somente valor legível ou campo explicitamente inutilizado com traço.
- Campo monetário vazio, ambíguo ou sem inutilização explícita deve gerar REVISAR.
- Confirmar preenchimento da data.
- Confirmar presença da assinatura.
- A assinatura deve permitir identificação por nome legível; rubrica ou assinatura não identificável deve gerar REVISAR.
- A existência de nome impresso em outra parte do formulário não substitui a exigência de assinatura legível quando a regra documental exigir nome por extenso.

### Regra de confiança

O sistema não deve declarar um documento como conforme quando não conseguir distinguir com segurança entre campo preenchido, campo inutilizado e campo vazio. Nesses casos, deve exibir o recorte do campo para conferência humana.
