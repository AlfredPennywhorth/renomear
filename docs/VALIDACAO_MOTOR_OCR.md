# Validação de viabilidade do motor OCR

Esta rodada mede eficácia de leitura, não apenas correção do código. Nenhuma amostra confidencial deve ser publicada no repositório.

## Rodada limitada

Usar cópias locais de uma amostra conhecida de envelopes/recibos, DTs e C1; separar impressos de manuscritos. Guardar os valores corretos somente em ambiente privado. Reservar parte dos documentos sem usá-los na calibração.

1. Confirmar inicialização do Paddle no navegador e registrar localmente o motivo se falhar. Alinhamento do runtime sozinho não comprova inicialização.
2. Verificar orientação em 0°, 90°, 180° e 270°. Se inconclusiva, girar e usar Reler nesta orientação antes de conferir.
3. Conferir prontuário, número documental, data e nome proposto. Campos manuais prevalecem; a data não integra o nome.
4. Confirmar a gravação apenas depois da revisão. Verificar o arquivo salvo e sua orientação.

## Métricas separadas por tipo

Total analisado; prontuário exato; sequência exata; identidade recusada; divergência; nome correto proposto; elegíveis automaticamente; erros liberados; tempo total e tempo de revisão. Ausência de nome proposto e bloqueio de auditoria são métricas diferentes.

Meta proposta para impressos: ao menos 90% de identidade exata no conjunto reservado, sem prontuário incorreto liberado automaticamente no teste. Amostra pequena sem erros não garante segurança futura. Manuscritos têm resultado separado, sem promessa prévia de cobertura.

Se os impressos continuarem abaixo do critério após esta rodada, interromper ajustes sucessivos no navegador e comparar processamento local instalável nas mesmas amostras. Preservar interface e políticas de identidade.

## Limitações desta rodada

Recorte pelo rótulo requer número reconhecido na mesma linha; C1 manuscrita ainda pode depender do recorte calibrado. Releitura orientada manual está disponível para imagens; gravação de rotação de PDFs permanece fora do escopo. Paddle ainda baixa SDK, runtime e modelos externos; isso continua bloqueador para produção.
