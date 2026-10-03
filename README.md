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
3. Cada arquivo é analisado localmente.
4. O sistema identifica o tipo documental.
5. Campos relevantes são extraídos.
6. Um novo nome é sugerido.
7. O usuário revisa/corrige.
8. O sistema renomeia os arquivos confirmados.

## Tipos documentais iniciais

- Ficha C1
- Envelope
- Recibo de atendimento
- Documento não padronizado

A lista será calibrada com amostras reais.

## Compatibilidade

A renomeação direta de arquivos na pasta escolhida, sem instalação local, depende das APIs de acesso ao sistema de arquivos disponíveis no navegador. O MVP priorizará navegadores Chromium compatíveis com a File System Access API e terá estratégia de fallback para ambientes sem suporte.

## LGPD e segurança

- Processamento local por padrão; documentos e dados extraídos não devem ser enviados a serviços externos no MVP.
- O usuário deve confirmar autorização e condições mínimas de segurança antes de selecionar a pasta.
- Não usar computador público/compartilhado nem pasta sincronizada com nuvem quando a política exigir permanência exclusiva na máquina.
- Evitar coleta e exposição desnecessárias: nomes finais usam apenas os identificadores operacionais necessários.
- Não registrar conteúdo documental, prontuários ou nomes de arquivos em telemetria/logs remotos.
- Resultado incerto nunca deve ser aprovado automaticamente; deve permanecer como REVISAR.
- O projeto adota privacidade desde a concepção, mas conformidade com a LGPD depende também de governança institucional, base legal, retenção, resposta a incidentes e demais controles organizacionais.

Detalhamento: `docs/LGPD_SEGURANCA.md`.

## Governança

- `main`: versão estável.
- `develop`: integração e homologação.
- Mudanças relevantes devem passar por revisão antes de chegar à `main`.
