import React, { useState } from 'react';
import { CoupleSpace, UserProfile } from '../types';
import { desafiliarEspacoCasal, salvarDefaultSplitCasal } from '../services/firebaseService';
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
  const [splitPadrao, setSplitPadrao] = useState(couple?.defaultSplit || '50/50');
  const [salvandoSplit, setSalvandoSplit] = useState(false);
  const [splitSalvo, setSplitSalvo] = useState(false);

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

  const p1Nome = couple.partner1Name;
  const p2Nome = couple.partner2Name || 'Parceiro(a)';
  const p2Conectado = Boolean(couple.partner2Uid);

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
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-[#006948] font-bold text-[10px]">
                {splitSalvo ? 'Salvo!' : `Atual: ${splitPadrao}`}
              </span>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Define a proporção automática aplicada quando qualquer um dos parceiros cadastrar uma nova compra compartilhada.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {[
                { id: '50/50', label: '50 / 50' },
                { id: '70/30', label: `70 / 30` },
                { id: '30/70', label: `30 / 70` },
                { id: '60/40', label: `60 / 40` },
                { id: '40/60', label: `40 / 60` },
              ].map((opcao) => (
                <button
                  key={opcao.id}
                  type="button"
                  disabled={salvandoSplit}
                  onClick={async () => {
                    setSplitPadrao(opcao.id);
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
                  }}
                  className={`py-2 px-2 rounded-xl text-center font-bold text-xs transition-all cursor-pointer border ${
                    splitPadrao === opcao.id
                      ? 'bg-[#006948] text-white border-[#006948] shadow-sm'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {opcao.label}
                </button>
              ))}
            </div>

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
                <div className="flex flex-col gap-1 pt-1">
                  <div className="w-full bg-slate-200 h-2 rounded-full flex overflow-hidden">
                    <div
                      className="bg-[#0051d5] h-full"
                      style={{ width: `${percP1}%` }}
                      title={`${p1Nome}: ${percP1}%`}
                    ></div>
                    <div
                      className="bg-[#712ae2] h-full"
                      style={{ width: `${percP2}%` }}
                      title={`${p2Nome}: ${percP2}%`}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                    <span className="text-[#0051d5] font-bold">{p1Nome}: {percP1}%</span>
                    <span className="text-[#712ae2] font-bold">{p2Nome}: {percP2}%</span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Zona de Perigo: Desconectar */}
          <div className="pt-3 border-t border-slate-200 flex flex-col gap-2">
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
                <span className="text-[11px] text-red-700">Deseja realmente se desvincular deste espaço?</span>
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
        </div>
      </div>
    </div>
  );
};
