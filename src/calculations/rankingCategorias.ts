import { CategoriaId, LancamentoMensal } from '../types';

export interface RankingItem {
  categoria: CategoriaId;
  totalCentavos: number;
  percentual: number; // 0 a 100
}

export interface ResultadoRanking {
  items: RankingItem[];
  totalGeralCentavos: number;
  totalTop5Centavos: number;
  coberturaTop5Percentual: number;
}

/**
 * Calcula o Top 5 de categorias por valor para o conjunto de lançamentos fornecido.
 * Funciona dinamicamente tanto para a visão individual ('Meus Pagamentos')
 * quanto para a visão conjunta ('Casal').
 */
export function calcularRankingCategorias(
  lancamentos: LancamentoMensal[]
): ResultadoRanking {
  if (!lancamentos || lancamentos.length === 0) {
    return {
      items: [],
      totalGeralCentavos: 0,
      totalTop5Centavos: 0,
      coberturaTop5Percentual: 0,
    };
  }

  const totais: Partial<Record<CategoriaId, number>> = {};
  let totalGeralCentavos = 0;

  for (const lancamento of lancamentos) {
    const categoria = lancamento.categoria;
    totais[categoria] = (totais[categoria] ?? 0) + lancamento.valorCentavos;
    totalGeralCentavos += lancamento.valorCentavos;
  }

  const entries = Object.entries(totais) as [CategoriaId, number][];

  // Ordena decrescente pelo total
  entries.sort((a, b) => b[1] - a[1]);

  // Pega até 5
  const top5Entries = entries.slice(0, 5);

  let totalTop5Centavos = 0;
  const items: RankingItem[] = top5Entries.map(([categoria, totalCentavos]) => {
    totalTop5Centavos += totalCentavos;
    const percentual = totalGeralCentavos > 0
      ? Number(((totalCentavos / totalGeralCentavos) * 100).toFixed(1))
      : 0;
    return {
      categoria,
      totalCentavos,
      percentual,
    };
  });

  const coberturaTop5Percentual = totalGeralCentavos > 0
    ? Number(((totalTop5Centavos / totalGeralCentavos) * 100).toFixed(1))
    : 0;

  return {
    items,
    totalGeralCentavos,
    totalTop5Centavos,
    coberturaTop5Percentual,
  };
}
