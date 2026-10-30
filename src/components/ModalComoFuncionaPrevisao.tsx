import React from 'react';

interface ModalComoFuncionaPrevisaoProps {
  aberto: boolean;
  onFechar: () => void;
}

export const ModalComoFuncionaPrevisao: React.FC<ModalComoFuncionaPrevisaoProps> = ({
  aberto,
  onFechar,
}) => {
  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl max-h-[90vh] bg-white dark:bg-[#161f2e] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 text-slate-800 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header do Modal */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/50 dark:bg-[#131b28]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#006948] text-white flex items-center justify-center shadow-xs shrink-0">
              <span className="material-symbols-outlined text-[22px]">insights</span>
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
                Como Funciona a Previsão de Gastos?
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Guia completo sobre a metodologia estatística de Séries Temporais (Time Series)
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onFechar}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar guia"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Conteúdo com rolagem suave */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs sm:text-sm leading-relaxed">
          {/* Seção 1: Fonte e Integridade dos Dados */}
          <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-800/40">
            <div className="flex items-center gap-2 font-bold text-[#006948] dark:text-emerald-300 text-sm mb-1.5">
              <span className="material-symbols-outlined text-[18px]">database</span>
              <span>1. Fonte e Integridade dos Dados Reais</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              O sistema <strong>não utiliza dados simulados nem cria registros fictícios</strong>. Ele analisa exclusivamente os lançamentos já armazenados no seu banco de dados:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-slate-600 dark:text-slate-300 pl-1">
              <li>
                <strong>Gastos À Vista:</strong> Atribuídos ao mês em que o pagamento foi realizado.
              </li>
              <li>
                <strong>Gastos Parcelados:</strong> Cada parcela entra na série temporal exatamente no mês em que vence, respeitando cancelamentos e alterações.
              </li>
              <li>
                <strong>Despesas Recorrentes (Assinaturas):</strong> Repetem-se mês a mês na competência devida até a data de cancelamento da recorrência.
              </li>
            </ul>
          </div>

          {/* Seção 2: Projeção do Mês Atual */}
          <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/70 dark:border-blue-800/40">
            <div className="flex items-center gap-2 font-bold text-blue-800 dark:text-blue-300 text-sm mb-1.5">
              <span className="material-symbols-outlined text-[18px]">calendar_today</span>
              <span>2. Como é Calculada a Projeção do Mês Atual?</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              Em vez de apenas multiplicar a média de dias cegamente, a projeção do mês em curso utiliza uma fórmula combinada inteligente:
            </p>
            <div className="my-2 p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-blue-100 dark:border-blue-900 font-mono text-[11px] text-blue-900 dark:text-blue-200">
              Projeção = Gastos Realizados até Hoje + Gastos Previstos p/ Dias Restantes + Parcelas Futuras Agendadas
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300 pl-1">
              <li>
                Calcula a proporção dos dias já decorridos no mês (ex: dia 15 em um mês de 30 dias = 50%).
              </li>
              <li>
                Adiciona as despesas parceladas e assinaturas já agendadas que ainda vão vencer neste mês.
              </li>
            </ul>
          </div>

          {/* Seção 3: Previsão do Próximo Mês */}
          <div className="p-4 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/70 dark:border-purple-800/40">
            <div className="flex items-center gap-2 font-bold text-purple-800 dark:text-purple-300 text-sm mb-1.5">
              <span className="material-symbols-outlined text-[18px]">query_stats</span>
              <span>3. Modelos de Previsão para o Próximo Mês</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 mb-2">
              Você pode alternar entre 3 abordagens estatísticas consolidadas nos parâmetros do modelo:
            </p>
            <div className="space-y-2">
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-900/60">
                <span className="font-bold text-purple-700 dark:text-purple-300 block">
                  • Média Móvel Ponderada (WMA) — Padrão Recomendado
                </span>
                <span className="text-slate-600 dark:text-slate-400 text-xs">
                  Dá maior relevância aos meses mais recentes. Exemplo em janela de 3 meses: o mês imediatamente anterior tem peso 3, o penúltimo tem peso 2 e o antepenúltimo tem peso 1. Isso reflete mudanças de estilo de vida mais rapidamente.
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-900/60">
                <span className="font-bold text-purple-700 dark:text-purple-300 block">
                  • Média Móvel Simples (SMA)
                </span>
                <span className="text-slate-600 dark:text-slate-400 text-xs">
                  Calcula a média aritmética pura dos últimos N meses completos. Excelente para orçamentos com estabilidade previsível.
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-900/60">
                <span className="font-bold text-purple-700 dark:text-purple-300 block">
                  • Tendência Linear Amortecida (Holt Damped)
                </span>
                <span className="text-slate-600 dark:text-slate-400 text-xs">
                  Mede se os gastos vêm crescendo ou caindo mês a mês, aplicando um fator de amortecimento (damping) para impedir projeções infinitas ou descoladas da realidade.
                </span>
              </div>
            </div>
          </div>

          {/* Seção 4: Intervalo de Incerteza */}
          <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-800/40">
            <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300 text-sm mb-1.5">
              <span className="material-symbols-outlined text-[18px]">show_chart</span>
              <span>4. Cone de Incerteza (Cenários Mínimo, Esperado e Máximo)</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              Nenhuma previsão financeira é pontual e fixa. O sistema calcula o <strong>desvio padrão dos últimos meses</strong> para gerar um cone de confiança com 3 cenários:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
              <div className="p-2 rounded bg-white dark:bg-slate-900 text-center border border-amber-100 dark:border-amber-900">
                <span className="font-bold text-emerald-600 dark:text-emerald-400 block text-[11px] uppercase">
                  Mínimo (Otimista)
                </span>
                <span className="text-[11px] text-slate-500">Mês de menor consumo atípico</span>
              </div>
              <div className="p-2 rounded bg-white dark:bg-slate-900 text-center border border-amber-100 dark:border-amber-900">
                <span className="font-bold text-[#006948] dark:text-emerald-300 block text-[11px] uppercase">
                  Esperado (Base)
                </span>
                <span className="text-[11px] text-slate-500">Estimativa estatística mais provável</span>
              </div>
              <div className="p-2 rounded bg-white dark:bg-slate-900 text-center border border-amber-100 dark:border-amber-900">
                <span className="font-bold text-amber-600 dark:text-amber-400 block text-[11px] uppercase">
                  Máximo (Alerta)
                </span>
                <span className="text-[11px] text-slate-500">Teto seguro para imprevistos</span>
              </div>
            </div>
          </div>

          {/* Seção 5: Conciliação Proporcional por Categoria */}
          <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200 text-sm mb-1.5">
              <span className="material-symbols-outlined text-[18px]">account_tree</span>
              <span>5. Conciliação Matemática por Categoria</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              Quando calculamos a previsão de cada categoria isoladamente (Alimentação, Moradia, etc.), a soma delas poderia dar uma leve diferença do total geral previsto.
            </p>
            <p className="text-slate-600 dark:text-slate-300 mt-1.5">
              Para evitar essa discrepância, o sistema aplica um <strong>fator de conciliação proporcional</strong>: cada categoria é rebalanceada proporcionalmente de modo que:
            </p>
            <div className="mt-2 p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-[11px] text-center text-slate-800 dark:text-slate-200">
              ∑ (Previsão de Todas as Categorias) = Previsão do Gasto Total do Mês (100,00%)
            </div>
          </div>

          {/* Seção 6: Backtesting */}
          <div className="p-4 rounded-xl bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200/70 dark:border-teal-800/40">
            <div className="flex items-center gap-2 font-bold text-teal-800 dark:text-teal-300 text-sm mb-1.5">
              <span className="material-symbols-outlined text-[18px]">fact_check</span>
              <span>6. O que é o Backtesting e as Métricas MAE / WAPE?</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              Backtesting é o teste retrospectivo: o algoritmo simula previsões para meses passados como se não soubesse o resultado real deles.
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-slate-600 dark:text-slate-300 pl-1">
              <li>
                <strong>MAE (Erro Médio Absoluto):</strong> A diferença média em reais entre o que o modelo previu e o que realmente foi gasto. Quanto menor o valor em R$, mais afiado é o modelo.
              </li>
              <li>
                <strong>WAPE (Weighted Absolute Percentage Error):</strong> A taxa percentual média de erro ponderada. Valores abaixo de 15%-20% indicam excelente acurácia orçamentária.
              </li>
              <li>
                <strong>Benchmark Naïve:</strong> O modelo mais simples possível que apenas repete o valor do mês anterior. O sistema avisa sempre que a média móvel supera esse benchmark ingênuo.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer com botão de fechar */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#131b28] flex justify-end">
          <button
            type="button"
            onClick={onFechar}
            className="px-5 py-2.5 rounded-xl bg-[#006948] hover:bg-[#005137] text-white text-xs sm:text-sm font-bold shadow-sm transition-all cursor-pointer"
          >
            Entendi, Fechar Guia
          </button>
        </div>
      </div>
    </div>
  );
};
