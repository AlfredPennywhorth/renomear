import { useState } from 'react'

function App() {
  const [message, setMessage] = useState('Nenhuma pasta selecionada.')

  const selectFolder = async () => {
    if (!('showDirectoryPicker' in window)) {
      setMessage('Este navegador não oferece acesso direto a pastas. Usaremos um modo alternativo.')
      return
    }

    try {
      // O acesso permanece no navegador; nenhum arquivo é enviado ao servidor.
      const picker = (window as typeof window & {
        showDirectoryPicker: () => Promise<{ name: string }>
      }).showDirectoryPicker
      const directory = await picker()
      setMessage(`Pasta selecionada: ${directory.name}`)
    } catch {
      setMessage('Seleção cancelada.')
    }
  }

  return (
    <main className="shell">
      <section className="card">
        <p className="eyebrow">MVP</p>
        <h1>Renomear</h1>
        <p>
          Analise documentos digitalizados, revise os dados reconhecidos e renomeie os arquivos
          mantendo o processamento no seu computador.
        </p>
        <button type="button" onClick={selectFolder}>Selecionar pasta</button>
        <p className="status">{message}</p>
      </section>
    </main>
  )
}

export default App
