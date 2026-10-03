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

## Governança

- `main`: versão estável.
- `develop`: integração e homologação.
- Mudanças relevantes devem passar por revisão antes de chegar à `main`.
