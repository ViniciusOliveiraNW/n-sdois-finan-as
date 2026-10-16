import React, { useState, useEffect } from 'react';
import { CoupleSpace, UserProfile } from '../types';
import {
  desafiliarEspacoCasal,
  salvarDefaultSplitCasal,
  buscarEspacosDoUsuario,
  reconectarEspaco,
  restaurarComprasIniciais,
  excluirEspacoCasal,
  isCriadorDoEspaco,
  EspacoComContagem,
} from '../services/firebaseService';
import { parseDivisaoPercentuais } from '../calculations/acertoMensal';

interface ModalEspacoCasalProps {
  aberto: boolean;
  onFechar: () => void;
  couple: CoupleSpace | null;
  user: UserProfile;
  onEspacoAtualizado: () => void;
}

export const ModalEspacoCasal: React.FC<ModalEspacoCasalProps> = ({
  aberto,
  onFechar,
  couple,
  user,
  onEspacoAtualizado,
}) => {
  const [copiado, setCopiado] = useState(false);
  const [copiadoMsg, setCopiadoMsg] = useState(false);
  const [confirmandoSaida, setConfirmandoSaida] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [excluindoEspaco, setExcluindoEspaco] = useState(false);
  const [excluindoOutroId, setExcluindoOutroId] = useState<string | null>(null);

  const [splitPadrao, setSplitPadrao] = useState(couple?.defaultSplit || '50/50');
  const [salvandoSplit, setSalvandoSplit] = useState(false);
  const [splitSalvo, setSplitSalvo] = useState(false);
  const [mostrarSlider, setMostrarSlider] = useState(false);
  const [customP1, setCustomP1] = useState(50);

  // Recuperação de espaços e compras
  const [outrosEspacos, setOutrosEspacos] = useState<EspacoComContagem[]>([]);
  const [buscandoOutros, setBuscandoOutros] = useState(false);
  const [restaurandoCompras, setRestaurandoCompras] = useState(false);
  const [msgRecuperacao, setMsgRecuperacao] = useState<string | null>(null);
  const [alternandoEspacoId, setAlternandoEspacoId] = useState<string | null>(null);

  const recarregarOutrosEspacos = () => {
    if (user) {
      setBuscandoOutros(true);
      buscarEspacosDoUsuario(user)
        .then((espacos) => setOutrosEspacos(espacos))
        .catch((e) => console.warn('Erro ao carregar outros espaços:', e))
        .finally(() => setBuscandoOutros(false));
    }
  };

  useEffect(() => {
    if (aberto && user) {
      recarregarOutrosEspacos();
    }
  }, [aberto, user, couple?.id]);

  const handleAlternarEspaco = async (spaceId: string) => {
    setAlternandoEspacoId(spaceId);
    try {
      await reconectarEspaco(user, spaceId);
      onEspacoAtualizado();
      setMsgRecuperacao('Espaço financeiro alternado com sucesso!');
      setTimeout(() => setMsgRecuperacao(null), 3000);
    } catch (e) {
      console.error('Erro ao alternar espaço:', e);
      alert('Erro ao alternar espaço.');
    } finally {
      setAlternandoEspacoId(null);
    }
  };

  const handleExcluirOutroEspaco = async (spaceId: string) => {
    if (!confirm('Deseja realmente excluir permanentemente este outro espaço financeiro? Esta ação apagará todas as compras e registros dele.')) {
      return;
    }
    setExcluindoOutroId(spaceId);
    try {
      await excluirEspacoCasal(spaceId, user);
      recarregarOutrosEspacos();
      setMsgRecuperacao('Espaço excluído com sucesso!');
      setTimeout(() => setMsgRecuperacao(null), 3000);
    } catch (e) {
      console.error('Erro ao excluir outro espaço:', e);
      alert('Erro ao excluir espaço.');
    } finally {
      setExcluindoOutroId(null);
    }
  };

  const handleExcluirEspacoAtual = async () => {
    if (!couple) return;
    setExcluindoEspaco(true);
    try {
      await excluirEspacoCasal(couple.id, user);
      onEspacoAtualizado();
      onFechar();
    } catch (e) {
      console.error('Erro ao excluir espaço:', e);
      alert('Erro ao excluir espaço.');
    } finally {
      setExcluindoEspaco(false);
      setConfirmandoExclusao(false);
    }
  };

  const handleRestaurarCompras = async () => {
    if (!couple) return;
    setRestaurandoCompras(true);
    try {
      const res = await restaurarComprasIniciais(couple.id, user, p1Nome, p2Nome);
      onEspacoAtualizado();
      setMsgRecuperacao(res.mensagem);
      setTimeout(() => setMsgRecuperacao(null), 5000);
    } catch (e) {
      console.error('Erro ao restaurar compras:', e);
      alert('Erro ao restaurar compras no banco.');
    } finally {
      setRestaurandoCompras(false);
    }
  };

  const p1Nome = couple?.partner1Name || 'Parceiro 1';
  const p2Nome = couple?.partner2Name || 'Parceiro 2';
  const p2Conectado = Boolean(couple?.partner2Uid);

  useEffect(() => {
    if (couple?.defaultSplit) {
      setSplitPadrao(couple.defaultSplit);
      const { percP1 } = parseDivisaoPercentuais(
        couple.defaultSplit,
        couple.partner1Uid,
        couple.partner2Uid,
        [p1Nome, 'p1'],
        [p2Nome, 'p2']
      );
      setCustomP1(percP1);
    }
  }, [couple?.defaultSplit, couple?.partner1Uid, couple?.partner2Uid, p1Nome, p2Nome, aberto]);

  if (!aberto || !couple) return null;

  const handleCopiarCodigo = () => {
    navigator.clipboard.writeText(couple.inviteCode);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const handleCopiarMensagem = () => {
    const texto = `Oi amor! Acesse nosso controle financeiro NósDois Finanças no link ${window.location.origin} e use o nosso código de casal: ${couple.inviteCode} para sincronizarmos tudo em tempo real! ❤️`;
    navigator.clipboard.writeText(texto);
    setCopiadoMsg(true);
    setTimeout(() => setCopiadoMsg(false), 2500);
  };

  const handleDesconectar = async () => {
    try {
      await desafiliarEspacoCasal(user);
      onEspacoAtualizado();
      onFechar();
    } catch (e) {
      console.error('Erro ao sair do espaço:', e);
      alert('Erro ao sair do espaço.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto"
    >
      <div className="bg-white w-full max-w-[540px] rounded-2xl shadow-2xl overflow-hidden my-auto border border-slate-200">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-50 to-emerald-50/50 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#006948] text-white flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[22px]">favorite</span>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Espaço do Casal • {p1Nome} & {p2Nome}
              </h2>
              <p className="text-xs text-slate-500">
                Sincronização em tempo real via Firebase Firestore
              </p>
            </div>
          </div>
          <button
            onClick={onFechar}
            className="w-8 h-8 rounded-full bg-white hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors shadow-sm cursor-pointer"
            title="Fechar"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-5 text-xs">
          {/* Card Código de Convite */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 via-white to-slate-50 border border-emerald-200 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#006948] uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">vpn_key</span>
                <span>Código de Parceria do Casal</span>
              </span>
              {p2Conectado ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-[#006948] font-bold text-[10px]">
                  Ambos Conectados
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] animate-pulse">
                  Aguardando Parceiro(a)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 bg-white border border-slate-200 rounded-xl py-2 px-4 text-center font-mono font-extrabold text-xl tracking-widest text-slate-900 shadow-sm select-all">
                {couple.inviteCode}
              </div>
              <button
                type="button"
                onClick={handleCopiarCodigo}
                className="h-11 px-4 rounded-xl bg-[#006948] hover:bg-[#005137] text-white font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {copiado ? 'check' : 'content_copy'}
                </span>
                <span>{copiado ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed">
              Compartilhe este código com <strong>{p2Nome}</strong>. Ao acessar o NósDois Finanças e escolher &ldquo;Tenho um Código&rdquo;, vocês ficarão permanentemente conectados.
            </p>

            <button
              type="button"
              onClick={handleCopiarMensagem}
              className="w-full py-2 px-3 rounded-lg bg-emerald-100/70 hover:bg-emerald-100 text-[#006948] font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">send</span>
              <span>{copiadoMsg ? 'Convite Copiado!' : 'Copiar Convite Formatado para WhatsApp'}</span>
            </button>
          </div>

          {/* Lista de Membros */}
          <div className="flex flex-col gap-2">
            <span className="font-bold text-slate-700">Membros do Espaço:</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Parceiro 1 */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#0051d5] text-white font-bold flex items-center justify-center uppercase text-sm">
                  {p1Nome.charAt(0)}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="font-bold text-slate-900 truncate">{p1Nome}</span>
                  <span className="text-[10px] text-slate-500 truncate">{couple.partner1Email || 'Criador do espaço'}</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Ativo"></span>
              </div>

              {/* Parceiro 2 */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#712ae2] text-white font-bold flex items-center justify-center uppercase text-sm">
                  {p2Nome.charAt(0)}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="font-bold text-slate-900 truncate">{p2Nome}</span>
                  <span className="text-[10px] text-slate-500 truncate">
                    {p2Conectado ? couple.partner2Email || 'Afiliado(a)' : 'Aguardando convite...'}
                  </span>
                </div>
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${p2Conectado ? 'bg-emerald-500' : 'bg-amber-400'}`}
                  title={p2Conectado ? 'Ativo' : 'Pendente'}
                ></span>
              </div>
            </div>
          </div>

          {/* Regime de Gastos Padrão do Casal */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#006948]">pie_chart</span>
                <span>Regime de Rateio Padrão do Casal</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMostrarSlider(!mostrarSlider)}
                  className="text-[11px] font-semibold text-[#006948] hover:text-[#005137] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">tune</span>
                  <span>{mostrarSlider ? 'Ocultar Slider' : 'Ajuste Fino (%)'}</span>
                </button>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-[#006948] font-bold text-[10px]">
                  {splitSalvo ? 'Salvo!' : `Atual: ${splitPadrao}`}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Define a proporção automática padrão aplicada quando qualquer um dos parceiros cadastrar uma nova despesa compartilhada.
            </p>

            {/* Presets Rápidos com 100/0 e 0/100 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: '50/50', label: '⚖️ 50 / 50', desc: 'Meio a meio' },
                { id: '70/30', label: '📊 70 / 30', desc: `70% ${p1Nome}` },
                { id: '30/70', label: '📊 30 / 70', desc: `70% ${p2Nome}` },
                { id: '60/40', label: '📊 60 / 40', desc: `60% ${p1Nome}` },
                { id: '40/60', label: '📊 40 / 60', desc: `60% ${p2Nome}` },
                { id: '100/0', label: '👤 100 / 0', desc: `100% ${p1Nome}` },
                { id: '0/100', label: '👤 0 / 100', desc: `100% ${p2Nome}` },
                { id: 'custom', label: '⚙️ Outro %', desc: 'Ajuste Fino' },
              ].map((opcao) => {
                const ativo =
                  opcao.id === 'custom'
                    ? mostrarSlider
                    : splitPadrao === opcao.id && !mostrarSlider;

                return (
                  <button
                    key={opcao.id}
                    type="button"
                    disabled={salvandoSplit}
                    onClick={async () => {
                      if (opcao.id === 'custom') {
                        setMostrarSlider(true);
                      } else {
                        setMostrarSlider(false);
                        setSplitPadrao(opcao.id);
                        const { percP1 } = parseDivisaoPercentuais(
                          opcao.id,
                          couple.partner1Uid,
                          couple.partner2Uid,
                          [p1Nome, 'p1'],
                          [p2Nome, 'p2']
                        );
                        setCustomP1(percP1);
                        setSalvandoSplit(true);
                        try {
                          await salvarDefaultSplitCasal(couple.id, opcao.id);
                          setSplitSalvo(true);
                          onEspacoAtualizado();
                          setTimeout(() => setSplitSalvo(false), 2000);
                        } catch (e) {
                          console.error('Erro ao salvar split:', e);
                        } finally {
                          setSalvandoSplit(false);
                        }
                      }
                    }}
                    className={`py-2 px-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition-all cursor-pointer ${
                      ativo
                        ? 'bg-emerald-50/80 border-[#006948] ring-1 ring-[#006948]'
                        : 'bg-white border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-xs font-bold text-slate-900 leading-tight">
                      {opcao.label}
                    </span>
                    <span className="text-[10px] text-slate-500 truncate leading-tight">
                      {opcao.desc}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Painel de Ajuste Fino / Slider Livre */}
            {mostrarSlider && (
              <div className="p-3.5 rounded-xl bg-white border border-slate-200 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-[#0051d5]">tune</span>
                    <span>Proporção Livre do Rateio</span>
                  </span>
                  <span className="text-[11px] font-mono font-bold text-slate-600">
                    {customP1}% + {100 - customP1}% = 100%
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold">
                    <span className="text-[#0051d5]">{p1Nome}: {customP1}%</span>
                    <span className="text-[#712ae2]">{p2Nome}: {100 - customP1}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={customP1}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      setCustomP1(v);
                      setSplitPadrao(`${v}/${100 - v}`);
                    }}
                    className="w-full accent-[#006948] cursor-pointer"
                  />
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <button
                      type="button"
                      onClick={() => {
                        setCustomP1(100);
                        setSplitPadrao('100/0');
                      }}
                      className="hover:text-blue-600 underline cursor-pointer"
                    >
                      100% {p1Nome} (100/0)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomP1(50);
                        setSplitPadrao('50/50');
                      }}
                      className="hover:text-emerald-700 underline cursor-pointer"
                    >
                      50/50 Meio a meio
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomP1(0);
                        setSplitPadrao('0/100');
                      }}
                      className="hover:text-purple-600 underline cursor-pointer"
                    >
                      100% {p2Nome} (0/100)
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={salvandoSplit}
                  onClick={async () => {
                    const novoSplit = `${customP1}/${100 - customP1}`;
                    setSplitPadrao(novoSplit);
                    setSalvandoSplit(true);
                    try {
                      await salvarDefaultSplitCasal(couple.id, novoSplit);
                      setSplitSalvo(true);
                      onEspacoAtualizado();
                      setTimeout(() => setSplitSalvo(false), 2000);
                    } catch (e) {
                      console.error('Erro ao salvar split personalizado:', e);
                    } finally {
                      setSalvandoSplit(false);
                    }
                  }}
                  className="w-full py-2 bg-[#006948] hover:bg-[#005137] text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  <span>{salvandoSplit ? 'Salvando...' : `Salvar Padrão ${customP1}/${100 - customP1}`}</span>
                </button>
              </div>
            )}

            {/* Proportion Bar */}
            {(() => {
              const { percP1, percP2 } = parseDivisaoPercentuais(
                splitPadrao,
                couple.partner1Uid,
                couple.partner2Uid,
                [p1Nome, 'p1'],
                [p2Nome, 'p2']
              );

              return (
                <div className="flex flex-col gap-1.5 pt-1">
                  <div className="w-full bg-slate-200 h-2.5 rounded-full flex overflow-hidden">
                    <div
                      className="bg-[#0051d5] h-full transition-all duration-300"
                      style={{ width: `${percP1}%` }}
                      title={`${p1Nome}: ${percP1}%`}
                    ></div>
                    <div
                      className="bg-[#712ae2] h-full transition-all duration-300"
                      style={{ width: `${percP2}%` }}
                      title={`${p2Nome}: ${percP2}%`}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <span className="text-[#0051d5] font-bold">{p1Nome}: {percP1}%</span>
                    <span className="text-[#712ae2] font-bold">{p2Nome}: {percP2}%</span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Diagnóstico e Recuperação de Compras & Espaços */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                <span className="material-symbols-outlined text-[17px] text-[#006948]">manage_history</span>
                <span>Recuperação de Compras & Espaços</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {user.email}
              </span>
            </div>

            {msgRecuperacao && (
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                <span>{msgRecuperacao}</span>
              </div>
            )}

            {/* Espaços vinculados ao e-mail */}
            {buscandoOutros ? (
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5 py-1">
                <span className="w-3 h-3 border-2 border-slate-400 border-t-slate-700 rounded-full animate-spin"></span>
                <span>Verificando outros espaços vinculados ao seu e-mail...</span>
              </div>
            ) : outrosEspacos.length > 1 ? (
              <div className="flex flex-col gap-2 pt-1">
                <span className="text-[11px] font-semibold text-slate-700">
                  Outros espaços encontrados para sua conta:
                </span>
                <div className="flex flex-col gap-1.5">
                  {outrosEspacos.map((item) => {
                    const ehAtual = item.space.id === couple.id;
                    const p1 = item.space.partner1Name || 'Vinicius';
                    const p2 = item.space.partner2Name || 'Silvia';

                    return (
                      <div
                        key={item.space.id}
                        className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                          ehAtual
                            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                            : 'bg-white border-slate-200 text-slate-800'
                        }`}
                      >
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5 font-bold">
                            <span>{p1} & {p2}</span>
                            {ehAtual && (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px]">
                                Atual
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500">
                            Código: {item.space.inviteCode} • {item.purchaseCount} compras salvas
                          </span>
                        </div>

                        {!ehAtual && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleAlternarEspaco(item.space.id)}
                              disabled={alternandoEspacoId !== null || excluindoOutroId !== null}
                              className="px-2.5 py-1 rounded bg-[#006948] hover:bg-[#005137] text-white font-bold text-[11px] shadow-xs cursor-pointer shrink-0"
                            >
                              {alternandoEspacoId === item.space.id ? 'Alternando...' : 'Alternar'}
                            </button>
                            {isCriadorDoEspaco(item.space, user) && (
                              <button
                                type="button"
                                onClick={() => handleExcluirOutroEspaco(item.space.id)}
                                disabled={excluindoOutroId === item.space.id || alternandoEspacoId !== null}
                                className="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors cursor-pointer"
                                title="Excluir este espaço criado por você"
                              >
                                {excluindoOutroId === item.space.id ? (
                                  <span className="w-3.5 h-3.5 border-2 border-red-500/40 border-t-red-500 rounded-full animate-spin inline-block"></span>
                                ) : (
                                  <span className="material-symbols-outlined text-[15px] block">delete</span>
                                )}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* Ação de Restauração das Compras Pendentes (Anti-duplicação) */}
            <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-700 text-[11px]">
                    Restaurar Compras Pendentes
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-bold">
                    Anti-duplicação
                  </span>
                </div>
                <span className="text-[10px] text-slate-500">
                  Verifica o banco e restaura apenas despesas com parcelas pendentes, sem duplicar registros.
                </span>
              </div>
              <button
                type="button"
                onClick={handleRestaurarCompras}
                disabled={restaurandoCompras}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:border-[#006948] hover:text-[#006948] text-slate-700 text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {restaurandoCompras ? (
                  <span className="w-3.5 h-3.5 border-2 border-[#006948]/40 border-t-[#006948] rounded-full animate-spin"></span>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[15px]">settings_backup_restore</span>
                    <span>Restaurar Pendentes</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Zona de Perigo: Excluir Espaço (Apenas Criador) ou Desconectar */}
          <div className="pt-3 border-t border-slate-200 flex flex-col gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Gerenciamento do Espaço
            </span>

            {isCriadorDoEspaco(couple, user) ? (
              <div className="flex flex-col gap-2">
                {!confirmandoExclusao ? (
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmandoExclusao(true);
                      setConfirmandoSaida(false);
                    }}
                    className="text-red-600 hover:text-red-700 font-semibold text-[11px] self-start cursor-pointer hover:underline flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[15px]">delete_forever</span>
                    <span>Excluir este espaço de casal permanentemente (você é o criador)</span>
                  </button>
                ) : (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-300 flex flex-col gap-2.5">
                    <div className="flex items-start gap-2 text-red-900 text-xs">
                      <span className="material-symbols-outlined text-[18px] text-red-600 shrink-0">warning</span>
                      <div>
                        <p className="font-bold">Deseja realmente EXCLUIR este espaço de casal?</p>
                        <p className="text-[11px] text-red-700 mt-0.5">
                          Você criou este espaço ({p1Nome} & {p2Nome}). Excluir apagará permanentemente todos os lançamentos, despesas e fechamentos de ambos os membros.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setConfirmandoExclusao(false)}
                        disabled={excluindoEspaco}
                        className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleExcluirEspacoAtual}
                        disabled={excluindoEspaco}
                        className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer"
                      >
                        {excluindoEspaco ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                            <span>Excluindo...</span>
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-[15px]">delete_forever</span>
                            <span>Sim, excluir espaço</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Opção secundária: apenas sair sem apagar */}
                {!confirmandoSaida ? (
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmandoSaida(true);
                      setConfirmandoExclusao(false);
                    }}
                    className="text-slate-400 hover:text-slate-600 text-[10px] self-start cursor-pointer hover:underline flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[13px]">link_off</span>
                    <span>Apenas desconectar sem excluir dados</span>
                  </button>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-100 border border-slate-300 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-700">Deseja apenas se desvincular sem apagar o espaço?</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={handleDesconectar}
                        className="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-800 text-white font-bold text-[11px] cursor-pointer"
                      >
                        Sim, desconectar
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmandoSaida(false)}
                        className="px-2.5 py-1 rounded bg-white border border-slate-300 text-slate-700 text-[11px] cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                {!confirmandoSaida ? (
                  <button
                    type="button"
                    onClick={() => setConfirmandoSaida(true)}
                    className="text-slate-500 hover:text-red-600 text-[11px] self-start cursor-pointer hover:underline flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">link_off</span>
                    <span>Desconectar deste espaço de casal</span>
                  </button>
                ) : (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-red-700">Deseja realmente sair deste espaço de casal?</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={handleDesconectar}
                        className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] cursor-pointer"
                      >
                        Sim, sair
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmandoSaida(false)}
                        className="px-2.5 py-1 rounded bg-white border border-slate-300 text-slate-700 text-[11px] cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
