# Roadmap do MVP

## Concluído

- Estrutura web React/Vite/TypeScript.
- Seleção de pasta local em navegadores Chromium compatíveis.
- Solicitação de acesso readwrite à pasta.
- Enumeração local de imagens e PDFs.
- Fila de documentos e visualização local.
- Painel de revisão manual.
- Normalização do prontuário para seis algarismos.
- Geração de nomes por tipo documental.
- Validações estruturais de data e sequência.
- Estados OK, REVISAR e NÃO CONFORME.
- Regras documentais e cruzamentos iniciais.
- Detecção de nomes duplicados sem diferenciar maiúsculas/minúsculas.
- Confirmação em lote antes da renomeação.
- Renomeação com preservação do original até a verificação de integridade da cópia.
- Relatório local de inconsistências com proteção contra fórmula em CSV.
- Dashboard de qualidade da sessão.
- CSP restritiva, sem acesso a origens externas; conexão permitida somente à própria origem para carregar assets estáticos do OCR.
- Dependências fixadas por versão e pnpm-lock.yaml.
- CI com typecheck, testes e build.
- Deploy de homologação condicionado ao CI verde.
- Manual de uso e roteiro de homologação.

## Escopo da homologação atual

A homologação atual é **assistida**:

- o operador identifica/corrige manualmente os campos;
- o sistema aplica as regras já implementadas, cruza informações, registra inconsistências, calcula indicadores e renomeia os aprovados;
- OCR local e classificação inicial já estão conectados ao processamento em lote;
- leitura de manuscritos, carimbos, cores, marcações da C1 e correção real de orientação ainda não têm cobertura automática completa;
- usar Chrome ou Edge em computador;
- enquanto não houver fallback seguro, navegadores sem File System Access API ficam fora da homologação;
- os primeiros testes com documentação devem ser feitos em cópias.

## Próximas etapas antes do MVP automático

1. Implementar a cadeia completa de emergência (recibo manual + C1 + envelope).
2. Resolver seleção de C1 correta quando houver múltiplas fichas do mesmo prontuário, considerando contexto, data e paginação.
3. Modelar e implementar a regra VALOR TOTAL APROVADO e campos de valor relacionados.
4. Calibrar o OCR/classificador local já integrado com amostras reais.
5. Implementar leitura por regiões e confiança por campo.
6. Implementar análise de marcações, carimbos, cores e orientação real da imagem.
7. Melhorar acessibilidade dos diálogos (foco, Esc e retorno de foco).
8. Definir fallback seguro para navegadores sem acesso direto à pasta.

## Melhorias posteriores

- Web Worker/streaming para lotes grandes.
- recibo local de de-para e eventual desfazer;
- testes E2E e acessibilidade automatizada;
- filtros e ordenação adicionais no dashboard;
- eventual PWA/offline, se aprovado institucionalmente.
