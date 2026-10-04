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
3. Na homologação atual, o operador identifica/revisa manualmente tipo e campos relevantes.
4. O sistema aplica as validações e cruzamentos já implementados.
5. Um novo nome é sugerido.
6. O usuário confirma ou corrige os dados.
7. O sistema registra inconsistências e atualiza o dashboard.
8. Somente documentos aprovados podem ser renomeados.

A classificação e extração automáticas por OCR permanecem como etapa posterior do MVP automático. O processamento continuará estritamente local.

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
- A homologação atual valida o fluxo assistido e o motor de regras; OCR/classificação automática ainda não estão integrados.
- O dashboard e o relatório de inconsistências são calculados localmente no navegador.
- Manual: `docs/COMO_USAR.md`.
- Dashboard: `docs/DASHBOARD_QUALIDADE.md`.
- Roteiro de homologação: `docs/ROTEIRO_HOMOLOGACAO.md`.

## Governança

- `main`: versão estável.
- `develop`: integração e homologação.
- Mudanças relevantes devem passar por revisão antes de chegar à `main`.
