# Roadmap do MVP

## Concluído

- Estrutura web React/Vite/TypeScript.
- Seleção de pasta em navegadores compatíveis.
- Enumeração local de imagens e PDFs.
- Fila de documentos.
- Painel de revisão manual.
- Normalização do prontuário para seis algarismos.
- Geração inicial de nomes por tipo.
- Estados OK, REVISAR e NÃO CONFORME.
- Regras documentais iniciais para envelope/recibo.
- Testes unitários iniciais e CI.

## Próximas etapas sem depender de novas amostras

1. Persistir as correções do usuário em memória durante a sessão.
2. Implementar validações estruturais de data e sequência.
3. Preparar renomeação efetiva via File System Access API.
4. Implementar tratamento de colisão de nomes.
5. Adicionar confirmação em lote antes da renomeação.
6. Criar fallback para navegadores sem acesso direto à pasta.
7. Preparar visualização local do arquivo selecionado na tela de revisão.

## Etapas dependentes de amostras reais

1. Escolher e calibrar OCR local.
2. Definir regiões de leitura por tipo documental.
3. Classificar automaticamente Ficha C1, envelope, recibo e demais modelos.
4. Detectar campo preenchido, inutilizado por traço ou vazio.
5. Avaliar presença e legibilidade de assinatura.
6. Ajustar limiares de confiança e regras de revisão humana.
