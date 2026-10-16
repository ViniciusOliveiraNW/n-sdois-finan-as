import React, { useState } from 'react';
import { CoupleSpace, UsuarioId } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

export type AbaNavegacao = 'resumo-mensal' | 'lancamentos' | 'fechamentos-e-acertos' | 'categorias';

interface HeaderProps {
  abaAtiva: AbaNavegacao;
  onSelecionarAba: (aba: AbaNavegacao) => void;
  usuarioAtual: UsuarioId;
  couple?: CoupleSpace | null;
  onAbrirNovaCompra: () => void;
  onAbrirEspacoModal: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  abaAtiva,
  onSelecionarAba,
  usuarioAtual,
  couple,
  onAbrirNovaCompra,
  onAbrirEspacoModal,
  onLogout,
}) => {
  const [copiado, setCopiado] = useState(false);

  const p1Nome = couple?.partner1Name || 'Vinicius';
  const p2Nome = couple?.partner2Name || 'Silvia';
  const aguardandoParceiro = couple && !couple.partner2Uid;

  const handleCopiarCodigo = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (couple?.inviteCode) {
      navigator.clipboard.writeText(couple.inviteCode);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-[#f8f9ff]/90 backdrop-blur-xl border-b border-slate-200/60 shadow-[0_1px_6px_rgba(0,0,0,0.03)]">
      <div className="h-16 max-w-[1280px] mx-auto px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Left Zone: Brand Logo & Navigation Links */}
        <div className="flex items-center gap-6 md:gap-8">
          <button
            onClick={() => onSelecionarAba('resumo-mensal')}
            className="flex items-center gap-2.5 text-left focus:outline-none group cursor-pointer"
          >
            {/* SVG Logo: Anéis Entrelaçados Azul e Violeta com Cruz/Sinal de Soma Verde */}
            <svg
              className="w-8 h-8 shrink-0 transition-transform group-hover:scale-105"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                cx="38"
                cy="50"
                r="30"
                stroke="#0051d5"
                strokeWidth="11"
                className="opacity-95"
              />
              <circle
                cx="62"
                cy="50"
                r="30"
                stroke="#712ae2"
                strokeWidth="11"
                className="opacity-95"
              />
              <path
                d="M50 36V64M36 50H64"
                stroke="#006948"
                strokeWidth="8"
                strokeLinecap="round"
              />
            </svg>
            <div className="flex flex-col ml-1">
              <span className="font-semibold text-base sm:text-lg tracking-tight text-slate-900 select-none leading-tight whitespace-nowrap">
                NósDois <span className="text-[#006948] font-bold">Finanças</span>
              </span>
              <span className="text-[11px] text-slate-500 font-medium tracking-tight mt-0.5 whitespace-nowrap">
                {p1Nome} & {p2Nome}
              </span>
            </div>
          </button>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 p-1 bg-slate-100/90 rounded-xl">
            <button
              onClick={() => onSelecionarAba('resumo-mensal')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                abaAtiva === 'resumo-mensal'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              Resumo Mensal
            </button>
            <button
              onClick={() => onSelecionarAba('lancamentos')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                abaAtiva === 'lancamentos'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              Lançamentos
            </button>
            <button
              onClick={() => onSelecionarAba('fechamentos-e-acertos')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                abaAtiva === 'fechamentos-e-acertos'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              Fechamentos & Acertos
            </button>
            <button
              onClick={() => onSelecionarAba('categorias')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                abaAtiva === 'categorias'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              Categorias
            </button>
          </nav>
        </div>

        {/* Right Zone: Convite pendente, Nova Compra, User Profile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Se aguardando parceiro, exibe código amigável para copiar */}
          {aguardandoParceiro && couple && (
            <button
              type="button"
              onClick={handleCopiarCodigo}
              title="Clique para copiar o código de convite do casal"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold transition-all cursor-pointer shadow-sm"
            >
              <span className="material-symbols-outlined text-[15px] text-amber-600 animate-pulse">
                share
              </span>
              <span>Código: {couple.inviteCode}</span>
              <span className="text-[10px] bg-amber-200/70 px-1.5 py-0.2 rounded font-mono">
                {copiado ? 'Copiado!' : 'Copiar'}
              </span>
            </button>
          )}

          {/* Sincronizado Firebase */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Firestore Conectado</span>
          </div>

          {/* Botão Instalar App no Celular (PWA) */}
          <PWAInstallButton />

          {/* Botão Nova Compra */}
          <button
            onClick={onAbrirNovaCompra}
            type="button"
            className="flex items-center gap-1.5 px-3.5 py-1.5 sm:py-2 rounded-xl bg-[#006948] hover:bg-[#005137] text-white text-xs sm:text-sm font-semibold shadow-sm transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>Nova Compra</span>
          </button>

          {/* User Profile Badge */}
          <div className="flex items-center gap-1.5 pl-2 pr-1 py-1 bg-white rounded-full border border-slate-200 shadow-sm">
            <div className="w-7 h-7 rounded-full bg-[#006948] text-white flex items-center justify-center font-bold text-xs uppercase">
              {usuarioAtual.charAt(0) || 'U'}
            </div>
            <div className="hidden sm:flex flex-col text-left leading-tight pr-1">
              <span className="text-xs font-semibold text-slate-900 truncate max-w-[100px]">
                {usuarioAtual}
              </span>
              <span className="text-[10px] font-medium text-[#006948]">(Você)</span>
            </div>

            {/* Botão de Espaço do Casal */}
            <button
              onClick={onAbrirEspacoModal}
              type="button"
              className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer"
              title="Ver dados do Espaço do Casal e convite"
            >
              <span className="material-symbols-outlined text-[16px]">groups</span>
            </button>

            {/* Botão de Logout */}
            <button
              onClick={onLogout}
              type="button"
              className="w-7 h-7 rounded-full bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 flex items-center justify-center transition-colors cursor-pointer"
              title="Sair da conta"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation bar */}
      <div className="lg:hidden flex items-center justify-around border-t border-slate-200/80 bg-white/95 px-2 py-1.5 overflow-x-auto text-xs">
        <button
          onClick={() => onSelecionarAba('resumo-mensal')}
          className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap cursor-pointer ${
            abaAtiva === 'resumo-mensal' ? 'bg-slate-100 text-[#006948] font-bold' : 'text-slate-600'
          }`}
        >
          Resumo
        </button>
        <button
          onClick={() => onSelecionarAba('lancamentos')}
          className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap cursor-pointer ${
            abaAtiva === 'lancamentos' ? 'bg-slate-100 text-[#006948] font-bold' : 'text-slate-600'
          }`}
        >
          Lançamentos
        </button>
        <button
          onClick={() => onSelecionarAba('fechamentos-e-acertos')}
          className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap cursor-pointer ${
            abaAtiva === 'fechamentos-e-acertos' ? 'bg-slate-100 text-[#006948] font-bold' : 'text-slate-600'
          }`}
        >
          Acertos
        </button>
        <button
          onClick={() => onSelecionarAba('categorias')}
          className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap cursor-pointer ${
            abaAtiva === 'categorias' ? 'bg-slate-100 text-[#006948] font-bold' : 'text-slate-600'
          }`}
        >
          Categorias
        </button>
      </div>
    </header>
  );
};
