import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';

export type TemaCalendario = 'auto' | 'light' | 'dark';

interface SeletorMesFlutuanteProps {
  mesSelecionado: string; // formato "YYYY-MM", ex: "2026-10"
  onMudarMes: (novoMes: string) => void;
  variante?: 'casal' | 'individual' | 'neutro';
  tema?: TemaCalendario; // 'auto' herda do sistema, ou força 'light' / 'dark'
  className?: string;
  tamanho?: 'sm' | 'md' | 'lg';
}

const MESES = [
  { num: 1, sigla: 'Jan', nome: 'Janeiro' },
  { num: 2, sigla: 'Fev', nome: 'Fevereiro' },
  { num: 3, sigla: 'Mar', nome: 'Março' },
  { num: 4, sigla: 'Abr', nome: 'Abril' },
  { num: 5, sigla: 'Mai', nome: 'Maio' },
  { num: 6, sigla: 'Jun', nome: 'Junho' },
  { num: 7, sigla: 'Jul', nome: 'Julho' },
  { num: 8, sigla: 'Ago', nome: 'Agosto' },
  { num: 9, sigla: 'Set', nome: 'Setembro' },
  { num: 10, sigla: 'Out', nome: 'Outubro' },
  { num: 11, sigla: 'Nov', nome: 'Novembro' },
  { num: 12, sigla: 'Dez', nome: 'Dezembro' },
];

const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

interface MesGridProps {
  ano: number;
  mes: number;
  mesSelecionadoAno: number;
  mesSelecionadoMes: number;
  onSelecionarMes: (ano: number, mes: number) => void;
  onNavegarMes: (offset: number) => void;
  mostrarNavegacaoEsquerda?: boolean;
  mostrarNavegacaoDireita?: boolean;
  isEscuro: boolean;
  variante?: 'casal' | 'individual' | 'neutro';
}

const MesGridCalendario: React.FC<MesGridProps> = ({
  ano,
  mes,
  mesSelecionadoAno,
  mesSelecionadoMes,
  onSelecionarMes,
  onNavegarMes,
  mostrarNavegacaoEsquerda = true,
  mostrarNavegacaoDireita = true,
  isEscuro,
  variante = 'casal',
}) => {
  const nomeMes = MESES[mes - 1]?.nome || '';
  const ehMesSelecionado = ano === mesSelecionadoAno && mes === mesSelecionadoMes;

  // Obter hoje real
  const hoje = new Date();
  const hojeAno = hoje.getFullYear();
  const hojeMes = hoje.getMonth() + 1;
  const hojeDia = hoje.getDate();

  // Matriz de dias
  const diasMatriz = useMemo(() => {
    const primeiroDiaSemana = new Date(ano, mes - 1, 1).getDay(); // 0 = dom, 1 = seg...
    const totalDiasMes = new Date(ano, mes, 0).getDate();
    const totalDiasMesAnterior = new Date(ano, mes - 1, 0).getDate();

    const dias: Array<{ dia: number; tipo: 'anterior' | 'atual' | 'proximo' }> = [];

    // Dias do mês anterior para preencher primeira semana
    for (let i = primeiroDiaSemana - 1; i >= 0; i--) {
      dias.push({
        dia: totalDiasMesAnterior - i,
        tipo: 'anterior',
      });
    }

    // Dias do mês atual
    for (let d = 1; d <= totalDiasMes; d++) {
      dias.push({
        dia: d,
        tipo: 'atual',
      });
    }

    // Dias do próximo mês para completar grade (35 ou 42 células)
    const celulasTotais = dias.length > 35 ? 42 : 35;
    const restantes = celulasTotais - dias.length;
    for (let d = 1; d <= restantes; d++) {
      dias.push({
        dia: d,
        tipo: 'proximo',
      });
    }

    return dias;
  }, [ano, mes]);

  // Cores dinâmicas de acordo com o tema e a variante
  const corPillAtivo = isEscuro
    ? 'bg-[#0095ff] text-white shadow-sm font-bold scale-[1.03]'
    : variante === 'casal'
    ? 'bg-[#006948] text-white shadow-sm font-bold scale-[1.03]'
    : 'bg-blue-600 text-white shadow-sm font-bold scale-[1.03]';

  return (
    <div className="w-[270px] sm:w-[290px] p-2 flex flex-col select-none">
      {/* Header do Mês com Setas */}
      <div className="flex items-center justify-between mb-3 px-1">
        {mostrarNavegacaoEsquerda ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNavegarMes(-1);
            }}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
              isEscuro
                ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Mês anterior"
          >
            <span className="material-symbols-outlined text-[16px]">chevron_left</span>
          </button>
        ) : (
          <div className="w-7 h-7" />
        )}

        <button
          type="button"
          onClick={() => onSelecionarMes(ano, mes)}
          className={`font-bold text-sm tracking-wide transition-colors cursor-pointer px-2 py-0.5 rounded-lg ${
            ehMesSelecionado
              ? isEscuro
                ? 'text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/40'
                : variante === 'casal'
                ? 'text-[#006948] hover:bg-emerald-50'
                : 'text-blue-600 hover:bg-blue-50'
              : isEscuro
              ? 'text-white hover:text-cyan-300 hover:bg-slate-800'
              : 'text-slate-800 hover:text-blue-600 hover:bg-slate-100'
          }`}
          title={`Selecionar ${nomeMes} de ${ano}`}
        >
          {nomeMes} {ano}
        </button>

        {mostrarNavegacaoDireita ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNavegarMes(1);
            }}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
              isEscuro
                ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Próximo mês"
          >
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>
        ) : (
          <div className="w-7 h-7" />
        )}
      </div>

      {/* Dias da semana */}
      <div className="grid grid-cols-7 gap-1 mb-1 text-center">
        {DIAS_SEMANA.map((dia) => (
          <span
            key={dia}
            className={`text-[11px] font-medium lowercase ${
              isEscuro ? 'text-slate-400' : 'text-slate-500 font-semibold'
            }`}
          >
            {dia}
          </span>
        ))}
      </div>

      {/* Grade de dias */}
      <div className="grid grid-cols-7 gap-1">
        {diasMatriz.map((item, idx) => {
          const ehHoje =
            item.tipo === 'atual' &&
            ano === hojeAno &&
            mes === hojeMes &&
            item.dia === hojeDia;

          // Se for o mês selecionado no app, damos destaque visual
          const selecionadoPill = ehMesSelecionado && item.tipo === 'atual' && (ehHoje || item.dia === 1);

          return (
            <button
              key={`${item.tipo}-${item.dia}-${idx}`}
              type="button"
              onClick={() => {
                if (item.tipo === 'atual') {
                  onSelecionarMes(ano, mes);
                } else if (item.tipo === 'anterior') {
                  const mAnt = mes === 1 ? 12 : mes - 1;
                  const aAnt = mes === 1 ? ano - 1 : ano;
                  onSelecionarMes(aAnt, mAnt);
                } else {
                  const mProx = mes === 12 ? 1 : mes + 1;
                  const aProx = mes === 12 ? ano + 1 : ano;
                  onSelecionarMes(aProx, mProx);
                }
              }}
              className={`h-8 rounded-lg flex items-center justify-center text-xs font-semibold transition-all cursor-pointer ${
                item.tipo !== 'atual'
                  ? isEscuro
                    ? 'text-slate-600 hover:text-slate-400 hover:bg-slate-800/40'
                    : 'text-slate-300 hover:text-slate-600 hover:bg-slate-100'
                  : selecionadoPill
                  ? corPillAtivo
                  : ehMesSelecionado
                  ? isEscuro
                    ? 'text-slate-100 hover:bg-cyan-500/20 hover:text-cyan-300'
                    : 'text-slate-800 hover:bg-blue-50 hover:text-blue-700'
                  : isEscuro
                  ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              } ${
                ehHoje && !selecionadoPill
                  ? isEscuro
                    ? 'ring-1 ring-cyan-400 text-cyan-300 font-bold'
                    : 'ring-1 ring-blue-500 text-blue-600 font-bold bg-blue-50/50'
                  : ''
              }`}
            >
              {item.dia}
            </button>
          );
        })}
      </div>

      {/* Botão de rodapé do mês */}
      <button
        type="button"
        onClick={() => onSelecionarMes(ano, mes)}
        className={`mt-2.5 py-1 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
          ehMesSelecionado
            ? isEscuro
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : variante === 'casal'
              ? 'bg-emerald-50 text-[#006948] border border-emerald-200'
              : 'bg-blue-50 text-blue-700 border border-blue-200'
            : isEscuro
            ? 'bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white'
            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
        }`}
      >
        <span className="material-symbols-outlined text-[14px]">
          {ehMesSelecionado ? 'check_circle' : 'calendar_month'}
        </span>
        <span>{ehMesSelecionado ? 'Mês Selecionado' : `Selecionar ${nomeMes}`}</span>
      </button>
    </div>
  );
};

export const SeletorMesFlutuante: React.FC<SeletorMesFlutuanteProps> = ({
  mesSelecionado,
  onMudarMes,
  variante = 'casal',
  tema = 'auto',
  className = '',
  tamanho = 'md',
}) => {
  const { isDark: appIsDark } = useTheme();

  // O calendário acompanha sempre o tema da aplicação (resto da tela)
  const isEscuro = appIsDark;

  const [aberto, setAberto] = useState(false);
  const [modoVisualizacao, setModoVisualizacao] = useState<'calendario' | 'grade-meses'>('calendario');

  // Decompõe o mês selecionado atual
  const [anoAtual, mesAtual] = useMemo(() => {
    try {
      const parts = mesSelecionado.split('-');
      const a = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (!isNaN(a) && !isNaN(m) && m >= 1 && m <= 12) {
        return [a, m];
      }
    } catch {
      // fallback
    }
    const d = new Date();
    return [d.getFullYear(), d.getMonth() + 1];
  }, [mesSelecionado]);

  // Mês em visualização dentro do popover (permite navegar sem mudar imediatamente)
  const [anoVisual, setAnoVisual] = useState(anoAtual);
  const [mesVisual, setMesVisual] = useState(mesAtual);

  // Sincroniza visualização quando o popover abre
  useEffect(() => {
    if (aberto) {
      setAnoVisual(anoAtual);
      setMesVisual(mesAtual);
    }
  }, [aberto, anoAtual, mesAtual]);

  // Container ref para clique fora
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickFora = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAberto(false);
      }
    };

    if (aberto) {
      document.addEventListener('mousedown', handleClickFora);
      document.addEventListener('touchstart', handleClickFora);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickFora);
      document.removeEventListener('touchstart', handleClickFora);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [aberto]);

  // Navegação de mês anterior e posterior rápida (setas externas)
  const handleAvancarMes = (offset: number) => {
    let a = anoAtual;
    let m = mesAtual + offset;
    if (m > 12) {
      m = 1;
      a += 1;
    } else if (m < 1) {
      m = 12;
      a -= 1;
    }
    const novoMes = `${a}-${String(m).padStart(2, '0')}`;
    onMudarMes(novoMes);
  };

  // Navegação interna do popover
  const navegarVisualizacao = (offset: number) => {
    let a = anoVisual;
    let m = mesVisual + offset;
    if (m > 12) {
      m = 1;
      a += 1;
    } else if (m < 1) {
      m = 12;
      a -= 1;
    }
    setAnoVisual(a);
    setMesVisual(m);
  };

  const selecionarMes = (anoTarget: number, mesTarget: number) => {
    const str = `${anoTarget}-${String(mesTarget).padStart(2, '0')}`;
    onMudarMes(str);
    setAberto(false);
  };

  const irParaHoje = () => {
    const d = new Date();
    const str = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    onMudarMes(str);
    setAberto(false);
  };

  // Mês seguinte para visualização dual (lado a lado)
  const [anoSeguinte, mesSeguinte] = useMemo(() => {
    let a = anoVisual;
    let m = mesVisual + 1;
    if (m > 12) {
      m = 1;
      a += 1;
    }
    return [a, m];
  }, [anoVisual, mesVisual]);

  // Formatação do label principal
  const nomeMesFormatado = useMemo(() => {
    const dataObj = new Date(anoAtual, mesAtual - 1, 15);
    const mesNome = dataObj.toLocaleDateString('pt-BR', { month: 'long' });
    return `${mesNome.charAt(0).toUpperCase() + mesNome.slice(1)} ${anoAtual}`;
  }, [anoAtual, mesAtual]);

  // Ícone e cores conforme variante
  const corIcone =
    variante === 'casal'
      ? appIsDark ? 'text-emerald-400' : 'text-[#006948]'
      : variante === 'individual'
      ? appIsDark ? 'text-blue-400' : 'text-blue-600'
      : appIsDark ? 'text-slate-300' : 'text-slate-600';

  return (
    <div className={`relative inline-flex items-center ${className}`} ref={containerRef}>
      {/* Botões de Navegação Integrados: Seta Esq + Botão Calendário + Seta Dir */}
      <div
        className={`flex items-center gap-1 p-1 rounded-xl transition-colors shadow-2xs ${
          appIsDark
            ? 'bg-slate-800/90 border border-slate-700/80'
            : 'bg-slate-100 border border-slate-200/80'
        }`}
      >
        {/* Seta Anterior */}
        <button
          type="button"
          onClick={() => handleAvancarMes(-1)}
          aria-label="Mês anterior"
          title="Mês anterior"
          className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all cursor-pointer active:scale-95 shadow-2xs ${
            appIsDark
              ? 'text-slate-300 hover:text-white hover:bg-slate-700'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">chevron_left</span>
        </button>

        {/* Botão Central que abre o Calendário Flutuante */}
        <button
          type="button"
          onClick={() => setAberto((prev) => !prev)}
          className={`px-3 py-1.5 flex items-center gap-2 rounded-lg transition-all cursor-pointer ${
            aberto
              ? appIsDark
                ? 'bg-slate-900 text-white shadow-sm ring-2 ring-cyan-500/40'
                : 'bg-white text-slate-900 shadow-sm ring-2 ring-blue-500/30'
              : appIsDark
              ? 'hover:bg-slate-700/80 text-slate-100'
              : 'hover:bg-white text-slate-800'
          }`}
          title="Clique para escolher o mês no calendário"
          aria-expanded={aberto}
          aria-haspopup="dialog"
        >
          <span className={`material-symbols-outlined ${corIcone} text-[20px]`}>
            calendar_month
          </span>
          <span
            className={`font-extrabold tracking-tight ${
              tamanho === 'sm'
                ? 'text-xs'
                : tamanho === 'lg'
                ? 'text-lg sm:text-xl'
                : 'text-sm sm:text-base'
            }`}
          >
            {nomeMesFormatado}
          </span>
          <span
            className={`material-symbols-outlined text-[18px] transition-transform duration-200 ${
              aberto
                ? appIsDark
                  ? 'rotate-180 text-cyan-400'
                  : 'rotate-180 text-blue-600'
                : 'text-slate-400'
            }`}
          >
            expand_more
          </span>
        </button>

        {/* Seta Posterior */}
        <button
          type="button"
          onClick={() => handleAvancarMes(1)}
          aria-label="Próximo mês"
          title="Próximo mês"
          className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all cursor-pointer active:scale-95 shadow-2xs ${
            appIsDark
              ? 'text-slate-300 hover:text-white hover:bg-slate-700'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">chevron_right</span>
        </button>
      </div>

      {/* POPUP FLUTUANTE MODERNO (Suporte a TEMA CLARO e TEMA ESCURO) */}
      {aberto && (
        <div
          role="dialog"
          aria-label="Selecionar mês no calendário"
          className={`absolute z-50 top-full left-0 sm:left-auto mt-2 rounded-2xl p-4 animate-in fade-in zoom-in-95 duration-150 max-w-[95vw] ${
            isEscuro
              ? 'bg-[#161c24] border border-slate-700/80 shadow-[0_20px_50px_rgba(0,0,0,0.65)] text-white'
              : 'bg-white border border-slate-200/90 shadow-[0_20px_50px_rgba(0,0,0,0.14)] text-slate-900'
          }`}
        >
          {/* Topo do Popover: Indicador Ativo com Borda Ciano/Verde + Atalhos */}
          <div
            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-3 border-b ${
              isEscuro ? 'border-slate-700/80' : 'border-slate-200'
            }`}
          >
            {/* Pill de Destaque estilo screenshot */}
            <div className="flex items-center gap-2">
              <div
                className={`font-bold px-3.5 py-1.5 rounded-xl text-xs sm:text-sm flex items-center gap-2 border-2 ${
                  isEscuro
                    ? 'border-[#0095ff] bg-[#0d131c] text-white shadow-inner'
                    : variante === 'casal'
                    ? 'border-[#006948] bg-emerald-50 text-[#006948] shadow-xs'
                    : 'border-blue-600 bg-blue-50 text-blue-900 shadow-xs'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[16px] ${
                    isEscuro
                      ? 'text-cyan-400'
                      : variante === 'casal'
                      ? 'text-[#006948]'
                      : 'text-blue-600'
                  }`}
                >
                  calendar_today
                </span>
                <span>{nomeMesFormatado}</span>
              </div>
              <span className={`text-xs hidden sm:inline ${isEscuro ? 'text-slate-500' : 'text-slate-400'}`}>
                —
              </span>
              <span className={`text-xs hidden sm:inline ${isEscuro ? 'text-slate-400' : 'text-slate-500'}`}>
                Selecione qualquer mês
              </span>
            </div>

            {/* Ações rápidas */}
            <div className="flex items-center gap-1.5 self-end sm:self-auto">

              <button
                type="button"
                onClick={irParaHoje}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  isEscuro
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
                title="Ir para o mês corrente real"
              >
                Mês Atual
              </button>

              <button
                type="button"
                onClick={() =>
                  setModoVisualizacao((prev) =>
                    prev === 'calendario' ? 'grade-meses' : 'calendario'
                  )
                }
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer flex items-center gap-1 ${
                  modoVisualizacao === 'grade-meses'
                    ? isEscuro
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                      : 'bg-blue-50 text-blue-700 border-blue-300'
                    : isEscuro
                    ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                }`}
                title="Alternar entre calendário detalhado e grade dos 12 meses"
              >
                <span className="material-symbols-outlined text-[14px]">
                  {modoVisualizacao === 'grade-meses' ? 'view_module' : 'grid_view'}
                </span>
                <span>{modoVisualizacao === 'grade-meses' ? 'Calendário' : '12 Meses'}</span>
              </button>

              <button
                type="button"
                onClick={() => setAberto(false)}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ml-1 ${
                  isEscuro
                    ? 'bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900'
                }`}
                title="Fechar"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          </div>

          {/* CORPO DO CALENDÁRIO */}
          {modoVisualizacao === 'calendario' ? (
            <div
              className={`flex flex-col sm:flex-row items-center sm:items-start divide-y sm:divide-y-0 sm:divide-x ${
                isEscuro ? 'divide-slate-700/60' : 'divide-slate-200'
              }`}
            >
              {/* Mês 1 (Principal em visualização) */}
              <MesGridCalendario
                ano={anoVisual}
                mes={mesVisual}
                mesSelecionadoAno={anoAtual}
                mesSelecionadoMes={mesAtual}
                onSelecionarMes={selecionarMes}
                onNavegarMes={navegarVisualizacao}
                mostrarNavegacaoEsquerda={true}
                mostrarNavegacaoDireita={false}
                isEscuro={isEscuro}
                variante={variante}
              />

              {/* Mês 2 (Mês seguinte, lado a lado) */}
              <div className="hidden sm:block">
                <MesGridCalendario
                  ano={anoSeguinte}
                  mes={mesSeguinte}
                  mesSelecionadoAno={anoAtual}
                  mesSelecionadoMes={mesAtual}
                  onSelecionarMes={selecionarMes}
                  onNavegarMes={navegarVisualizacao}
                  mostrarNavegacaoEsquerda={false}
                  mostrarNavegacaoDireita={true}
                  isEscuro={isEscuro}
                  variante={variante}
                />
              </div>
            </div>
          ) : (
            /* Grade de 12 Meses com Seleção de Ano */
            <div className="w-[280px] sm:w-[360px] p-2">
              <div className="flex items-center justify-between mb-4 px-2">
                <button
                  type="button"
                  onClick={() => setAnoVisual((prev) => prev - 1)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                    isEscuro
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900'
                  }`}
                  title="Ano anterior"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                </button>
                <span
                  className={`text-base font-extrabold tracking-wider ${
                    isEscuro ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  {anoVisual}
                </span>
                <button
                  type="button"
                  onClick={() => setAnoVisual((prev) => prev + 1)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                    isEscuro
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900'
                  }`}
                  title="Próximo ano"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {MESES.map((m) => {
                  const ehSelecionado = anoVisual === anoAtual && m.num === mesAtual;
                  return (
                    <button
                      key={m.num}
                      type="button"
                      onClick={() => selecionarMes(anoVisual, m.num)}
                      className={`py-3 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                        ehSelecionado
                          ? isEscuro
                            ? 'bg-[#0095ff] text-white shadow-lg shadow-blue-500/20 scale-[1.03]'
                            : variante === 'casal'
                            ? 'bg-[#006948] text-white shadow-lg shadow-emerald-700/20 scale-[1.03]'
                            : 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 scale-[1.03]'
                          : isEscuro
                          ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/50'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200'
                      }`}
                    >
                      <span className="text-sm font-extrabold">{m.sigla}</span>
                      <span className="text-[10px] opacity-80 font-normal">{m.nome}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dica de rodapé */}
          <div
            className={`mt-3 pt-2.5 flex items-center justify-between text-[11px] border-t ${
              isEscuro ? 'border-slate-700/60 text-slate-400' : 'border-slate-200 text-slate-500'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isEscuro
                    ? 'bg-[#0095ff]'
                    : variante === 'casal'
                    ? 'bg-[#006948]'
                    : 'bg-blue-600'
                }`}
              ></span>
              <span>Destaque: Mês em análise</span>
            </span>
            <span className={isEscuro ? 'text-slate-500' : 'text-slate-400'}>
              Esc para fechar
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
