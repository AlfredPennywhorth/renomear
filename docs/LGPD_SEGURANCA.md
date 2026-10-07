# LGPD e segurança no Renomear

## Objetivo

O Renomear trata documentos que podem conter dados pessoais e dados pessoais sensíveis. A arquitetura e o uso do sistema devem observar os princípios e deveres aplicáveis da Lei nº 13.709/2018 (LGPD), especialmente finalidade, adequação, necessidade, segurança, prevenção e responsabilização/prestação de contas.

Este documento descreve medidas técnicas e operacionais do projeto. Ele não substitui a definição institucional do controlador, operador, encarregado, base legal, prazo de retenção ou política de resposta a incidentes.

## Regras técnicas obrigatórias

1. **Processamento local por padrão.** Imagens, PDFs, OCR, classificação e validações devem ocorrer no dispositivo do usuário.
2. **Sem upload silencioso.** Nenhum documento, recorte, OCR, nome de arquivo ou dado extraído deve ser enviado a API externa sem uma decisão institucional prévia, documentação da finalidade e configuração explícita.
3. **Sem telemetria com dados documentais.** Analytics, logs remotos e monitoramento não podem registrar nomes de arquivos, prontuários, conteúdo, imagens, textos extraídos ou outros dados pessoais.
4. **Sem persistência desnecessária.** Dados extraídos e estados de revisão permanecem apenas na sessão, salvo futura necessidade formalmente aprovada.
5. **Visualização temporária.** Previews devem usar URLs temporárias locais e revogá-las ao fechar/trocar o documento.
6. **Acesso mínimo à pasta.** O sistema solicita somente a pasta escolhida pelo usuário e não deve varrer outros diretórios.
7. **Revisão humana.** Resultado incerto não pode virar OK automaticamente; deve ser REVISAR.
8. **Sem sobrescrita silenciosa.** A renomeação deve checar colisões e preservar o original em caso de erro.
9. **Confirmação antes de alteração em lote.** Arquivos só podem ser renomeados após aprovação explícita.
10. **Sem uso de serviços externos de IA/OCR no MVP.** O OCR atual usa Tesseract.js/PDF.js e modelos empacotados no próprio site. O navegador pode baixar esses assets estáticos da mesma origem, mas imagens, PDFs, recortes e texto extraído não são enviados ao servidor. Qualquer futura integração externa exige reavaliação de privacidade e segurança.

## Aviso ao usuário

O aviso exibido pelo Renomear tem finalidade de conscientização e reforço operacional. Ele não cria, substitui nem renova a autorização para tratamento de dados pessoais. Quando a documentação institucional já contiver autorização própria para o tratamento, ela continua sendo a referência aplicável. O sistema apenas recorda os cuidados necessários durante o manuseio dos arquivos.

## Regras de uso para o operador

- Trabalhar apenas com documentos necessários à atividade autorizada.
- Utilizar computador institucional ou expressamente autorizado, protegido por autenticação.
- Não utilizar computador público, compartilhado ou emprestado.
- Bloquear a sessão ao se afastar.
- Evitar impressão, captura de tela, fotografia, cópia ou compartilhamento desnecessário.
- Não enviar documentos por mensageria, e-mail pessoal ou serviços de nuvem não autorizados.
- Quando a política exigir permanência exclusiva na máquina, selecionar pasta local **não sincronizada** com OneDrive, Google Drive, Dropbox ou serviço equivalente.
- Conferir tipo, prontuário, sequência, data e validações antes de aprovar.
- Manter qualquer leitura duvidosa em REVISAR.
- Comunicar imediatamente suspeita de perda, acesso indevido, compartilhamento incorreto, malware ou exposição de documentos.

## Minimização de dados

O nome final do arquivo deve conter somente os identificadores necessários para a organização documental. O projeto deve evitar inserir nome de pessoa, endereço, telefone, informação financeira, informação religiosa, saúde ou outras informações desnecessárias no nome do arquivo.

Padrão atual do envelope:

`PRONTUARIO_SEQUENCIA_env_frente.ext`

O prontuário funciona como identificador operacional, mas continua devendo ser protegido contra acesso indevido.

## Dados sensíveis

Os documentos podem conter informações enquadráveis como dados pessoais sensíveis, inclusive informações relacionadas a convicção religiosa e, dependendo do caso, saúde ou outras condições pessoais. Por isso, o projeto adota proteção reforçada e não deve enviar esses dados a terceiros ou serviços externos por padrão.

## Incidentes

O Renomear não deve prometer que um incidente foi ou não foi notificável. Ao detectar ou suspeitar de exposição, perda, acesso não autorizado ou envio indevido:

1. interromper a atividade que possa ampliar o incidente;
2. preservar informações necessárias para apuração sem criar novas cópias dos documentos;
3. comunicar o responsável interno pela proteção de dados/segurança;
4. seguir o procedimento institucional para avaliação, contenção, registro e, quando aplicável, comunicação à ANPD e aos titulares.

## Pontos institucionais ainda pendentes

Antes do uso em produção, a organização deve formalizar:

- controlador e, quando aplicável, operador;
- encarregado/canal de privacidade;
- finalidade e base legal aplicável ao tratamento;
- perfis de usuários autorizados;
- regras de armazenamento, retenção e descarte;
- procedimento de incidentes;
- política de backup;
- procedimento para exercício de direitos dos titulares;
- avaliação da necessidade de RIPD, conforme o contexto e o risco do tratamento.

## Regra de produto

O sistema pode informar que foi projetado com medidas de privacidade e segurança alinhadas à LGPD. Não deve exibir afirmações como "100% conforme com a LGPD", "LGPD garantida" ou equivalentes, porque a conformidade depende também de governança, finalidade, base legal, pessoas, processos e infraestrutura da organização.


## Relatório de inconsistências

Ao final do processamento, o Renomear poderá gerar localmente um relatório com as inconsistências encontradas para encaminhamento aos responsáveis.

Princípios de minimização:

- incluir apenas os identificadores necessários para localizar o documento e corrigir o problema;
- priorizar prontuário, nome do arquivo, tipo documental, gravidade, regra violada e observação;
- evitar nome completo, endereço, telefone, histórico social, informação de saúde, religião ou outros dados pessoais que não sejam necessários para tratar a pendência;
- não incluir imagens, recortes ou conteúdo integral dos documentos no relatório padrão;
- gerar o arquivo localmente no navegador, sem envio automático para servidor;
- o compartilhamento posterior do relatório deve seguir os canais institucionais autorizados.

O relatório não deve ser tratado como documento público. Mesmo minimizado, pode conter identificadores pessoais e informações sobre inconsistências do atendimento.
