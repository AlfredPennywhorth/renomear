type Props = {
  accepted: boolean
  onAcceptedChange: (accepted: boolean) => void
}

function SecurityNotice({ accepted, onAcceptedChange }: Props) {
  return (
    <section className="security-card" aria-labelledby="security-title">
      <div>
        <p className="eyebrow">LGPD e segurança</p>
        <h2 id="security-title">Antes de acessar documentos pessoais</h2>
        <p>
          O Renomear foi desenhado para processar os arquivos localmente. O uso seguro também
          depende da máquina, da pasta escolhida e das autorizações do usuário.
        </p>
      </div>

      <ul className="security-list">
        <li>Use somente computador autorizado e protegido por senha.</li>
        <li>Não use computador público, compartilhado ou de terceiros.</li>
        <li>Se os documentos não puderem sair da máquina, escolha uma pasta local que não seja sincronizada com nuvem.</li>
        <li>Não copie, envie, compartilhe ou fotografe documentos fora da finalidade autorizada.</li>
        <li>Feche o sistema e bloqueie a sessão ao se afastar do computador.</li>
        <li>Confirme os campos antes de aprovar; dados incertos devem permanecer como REVISAR.</li>
        <li>Na homologação, o OCR aprimorado baixa a biblioteca e os modelos públicos do PaddleOCR para executar a leitura no navegador. Os documentos não são enviados a uma API de OCR. Esses ativos deverão ser hospedados pelo próprio Renomear antes de uma liberação de produção.</li>
        <li>Em caso de suspeita de acesso indevido, perda ou exposição, interrompa o uso e comunique imediatamente o responsável interno.</li>
      </ul>

      <label className="security-consent">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(event) => onAcceptedChange(event.target.checked)}
        />
        <span>
          Li e estou ciente dos cuidados de segurança para o tratamento destes documentos e confirmo que estou usando um ambiente adequado para dados pessoais.
        </span>
      </label>

      <p className="security-footnote">
        Este aviso tem caráter de orientação e conscientização. A autorização para o tratamento dos dados permanece vinculada à documentação e aos procedimentos institucionais aplicáveis. O recurso não substitui a política de proteção de dados, a gestão de incidentes nem as demais obrigações da organização.
      </p>
    </section>
  )
}

export default SecurityNotice
