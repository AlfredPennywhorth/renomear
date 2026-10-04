# Renomear

Aplicação para classificar documentos digitalizados, extrair identificadores relevantes e sugerir/realizar a renomeação de arquivos com revisão humana.

## Objetivo

Reduzir o trabalho manual de organização de documentos digitalizados, mantendo os arquivos na máquina do usuário durante o processamento.

## Princípios do projeto

- Privacidade por arquitetura: documentos não devem ser enviados para servidor externo.
- Processamento local: leitura, classificação e extração devem ocorrer no navegador/dispositivo do usuário sempre que tecnicamente possível.
- Revisão humana obrigatória no MVP antes da renomeação.
- Campos incertos ficam marcados para revisão; o sistema não deve adivinhar silenciosamente.
- Compatibilidade inicial com imagens e PDFs.
- Prontuário em formato canônico de 6 algarismos, completando com zeros à esquerda quando necessário.

## Fluxo do MVP

1. Usuário escolhe a pasta com os documentos.
2. O sistema conta e lista os arquivos suportados.
3. O usuário aciona **Processar lote**.
4. OCR local tenta classificar o documento e extrair campos reconhecíveis.
5. O sistema aplica as validações e cruzamentos já implementados.
6. Itens com leitura ou regra incompleta seguem para **REVISAR**.
7. Apenas tipos com cobertura automática explicitamente liberada podem ser renomeados sem intervenção humana.
8. O colaborador trata as exceções na tela lado a lado (documento + campos).
9. O sistema registra inconsistências e atualiza o dashboard.

O OCR roda no próprio navegador com Tesseract.js e PDF.js empacotados localmente. Não há envio do documento para serviço externo. A cobertura automática ainda será ampliada por tipo documental e por regiões de leitura.

## Tipos documentais iniciais

- Ficha C1
- Envelope
- Recibo de atendimento
- Documento não padronizado

A lista será calibrada com amostras reais.

## Compatibilidade

A renomeação direta de arquivos na pasta escolhida, sem instalação local, depende das APIs de acesso ao sistema de arquivos disponíveis no navegador. A homologação atual é suportada em **Chrome e Edge em computador**, usando a File System Access API. Navegadores sem acesso direto a pastas ficam bloqueados nesta fase; o fallback seguro será definido antes de ampliar a compatibilidade.

## LGPD e segurança

- Processamento local por padrão; documentos e dados extraídos não devem ser enviados a serviços externos no MVP.
- O usuário deve confirmar autorização e condições mínimas de segurança antes de selecionar a pasta.
- Não usar computador público/compartilhado nem pasta sincronizada com nuvem quando a política exigir permanência exclusiva na máquina.
- Evitar coleta e exposição desnecessárias: nomes finais usam apenas os identificadores operacionais necessários.
- Não registrar conteúdo documental, prontuários ou nomes de arquivos em telemetria/logs remotos.
- Resultado incerto nunca deve ser aprovado automaticamente; deve permanecer como REVISAR.
- O projeto adota privacidade desde a concepção, mas conformidade com a LGPD depende também de governança institucional, base legal, retenção, resposta a incidentes e demais controles organizacionais.

Detalhamento: `docs/LGPD_SEGURANCA.md`.

## Homologação

- A branch `develop` alimenta o ambiente de homologação via GitHub Pages.
- O ambiente de teste deve ser usado com cópias dos documentos nas primeiras rodadas.
- A homologação atual já contém o primeiro OCR/classificador local para imagens e primeira página de PDFs.
- A extração inicial é conservadora e ainda depende de calibração por regiões e amostras reais.
- Nesta etapa, a liberação automática sem humano está restrita aos tipos cuja cobertura de regras foi explicitamente concluída.
- O dashboard e o relatório de inconsistências são calculados localmente no navegador.
- Manual: `docs/COMO_USAR.md`.
- Dashboard: `docs/DASHBOARD_QUALIDADE.md`.
- Roteiro de homologação: `docs/ROTEIRO_HOMOLOGACAO.md`.

## Governança

- `main`: versão estável.
- `develop`: integração e homologação.
- Mudanças relevantes devem passar por revisão antes de chegar à `main`.
