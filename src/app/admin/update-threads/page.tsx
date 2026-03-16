'use client';

import { useState } from 'react';

export default function UpdateThreadsPage() {
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState({ total: 0, updated: 0, remaining: 0 });
  const [logs, setLogs] = useState<string[]>([]);

  async function updateAll() {
    setStatus('running');
    setLogs(['Iniciando atualização...']);

    while (true) {
      try {
        const res = await fetch('/api/admin/update-threads-bulk?token=update-threads-2024');
        const data = await res.json();

        if (!data.success) {
          setLogs(prev => [...prev, `❌ Erro: ${data.error}`]);
          setStatus('error');
          break;
        }

        setProgress({
          total: data.stats.total,
          updated: data.stats.withThread,
          remaining: data.stats.withoutThread,
        });

        setLogs(prev => [
          ...prev,
          `✅ Lote processado: ${data.batch?.updated || 0} atualizados`,
          `📊 Progresso: ${data.stats.withThread}/${data.stats.total} (${data.stats.withoutThread} restantes)`,
        ]);

        if (data.stats.withoutThread === 0) {
          setLogs(prev => [...prev, '🎉 Concluído! Todos os emails têm threadId.']);
          setStatus('done');
          break;
        }

        // Pequena pausa entre lotes
        await new Promise(r => setTimeout(r, 500));

      } catch (err: any) {
        setLogs(prev => [...prev, `❌ Erro: ${err.message}`]);
        setStatus('error');
        break;
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Atualizar Emails</h1>
        
        <p className="text-gray-600 mb-6">
          Esta ferramenta atualiza o identificador de conversa (threadId) dos emails existentes.
          É necessário para o chat funcionar corretamente.
        </p>

        {status === 'idle' && (
          <button
            onClick={updateAll}
            className="w-full py-4 bg-[#0E1E37] text-white rounded-xl font-semibold hover:bg-[#1a2f4f] transition-colors"
          >
            Iniciar Atualização
          </button>
        )}

        {status === 'running' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-[#0E1E37] border-t-transparent rounded-full animate-spin" />
              <span className="font-medium text-gray-700">A processar...</span>
            </div>
            
            <div className="bg-gray-100 rounded-lg p-4">
              <div className="flex justify-between text-sm mb-2">
                <span>Progresso:</span>
                <span className="font-semibold">{progress.updated} / {progress.total}</span>
              </div>
              <div className="w-full bg-gray-300 rounded-full h-2">
                <div 
                  className="bg-[#0E1E37] h-2 rounded-full transition-all"
                  style={{ width: `${progress.total ? (progress.updated / progress.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {status === 'done' && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
            <p className="text-green-800 font-semibold">✅ Concluído com sucesso!</p>
            <p className="text-green-700 text-sm mt-1">
              Todos os {progress.total} emails foram atualizados.
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-800 font-semibold">❌ Ocorreu um erro</p>
            <button
              onClick={updateAll}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Tentar Novamente
            </button>
          </div>
        )}

        {logs.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-500 mb-2">Logs:</h3>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-xl font-mono text-sm max-h-64 overflow-y-auto">
              {logs.map((log, i) => (
                <div key={i} className="mb-1">{log}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
