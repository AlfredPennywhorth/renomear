function HowToUse() {
  return (
    <section className="how-to">
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">Guia rápido</p>
          <h2>Como usar o Renomear</h2>
          <p>Fluxo recomendado para testes reais e uso por vários operadores.</p>
        </div>
      </div>

      <div className="howto-grid">
        <article><strong>1</strong><div><h3>Prepare a pasta</h3><p>Trabalhe com cópias no primeiro teste. Use pasta local e evite sincronização em nuvem quando a política exigir permanência na máquina.</p></div></article>
        <article><strong>2</strong><div><h3>Confirme os cuidados de segurança</h3><p>Leia o aviso LGPD, use computador autorizado e proteja a sessão quando se afastar.</p></div></article>
        <article><strong>3</strong><div><h3>Selecione a pasta</h3><p>Use Chrome ou Edge em computador compatível. O sistema lista imagens e PDFs suportados sem enviar os documentos ao servidor.</p></div></article>
        <article><strong>4</strong><div><h3>Revise cada documento</h3><p>Confira tipo, prontuário, sequência, datas, modalidade e regras específicas. Corrija somente quando tiver segurança sobre o campo.</p></div></article>
        <article><strong>5</strong><div><h3>Trate os alertas</h3><p><b>REVISAR</b> significa que há dúvida ou decisão humana pendente. <b>NÃO CONFORME</b> significa que uma regra de procedimento foi violada.</p></div></article>
        <article><strong>6</strong><div><h3>Consulte o Dashboard</h3><p>Acompanhe cobertura, conformidade dos avaliados, documentos para revisar e as inconsistências mais frequentes.</p></div></article>
        <article><strong>7</strong><div><h3>Exporte as inconsistências</h3><p>Gere o CSV minimizado para encaminhar aos responsáveis. Ele não inclui o conteúdo integral dos documentos.</p></div></article>
        <article><strong>8</strong><div><h3>Renomeie somente os aprovados</h3><p>Use a confirmação final em lote. O sistema não deve sobrescrever arquivo existente e preserva o original em caso de erro.</p></div></article>
      </div>

      <section className="operator-checklist">
        <h3>Antes de encerrar a sessão</h3>
        <ul>
          <li>Verifique se não restaram documentos PENDENTES sem justificativa.</li>
          <li>Exporte o relatório de inconsistências quando houver pendências.</li>
          <li>Renomeie apenas documentos aprovados como OK.</li>
          <li>Confirme que os arquivos foram preservados e os nomes ficaram corretos.</li>
          <li>Feche a aplicação e bloqueie a sessão se o computador ficar sem supervisão.</li>
        </ul>
      </section>

      <div className="howto-warning">
        Nesta fase de homologação, OCR, leitura de manuscritos, carimbos, cores e correção visual de orientação ainda podem exigir revisão manual. O sistema não deve adivinhar campos duvidosos.
      </div>
    </section>
  )
}

export default HowToUse
