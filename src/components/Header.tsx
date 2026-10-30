import React, { useState, useEffect } from 'react';
import { CoupleSpace, UserProfile, UsuarioId } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import { useTheme } from '../context/ThemeContext';

export type AbaNavegacao = 'resumo-mensal' | 'lancamentos' | 'fechamentos-e-acertos' | 'categorias' | 'minhas-despesas' | 'previsao';

interface HeaderProps {
  abaAtiva: AbaNavegacao;
  onSelecionarAba: (aba: AbaNavegacao) => void;
  usuarioAtual: UsuarioId;
  couple?: CoupleSpace | null;
  userProfile?: UserProfile | null;
  onAbrirNovaCompra: () => void;
  onAbrirEspacoModal: () => void;
  onAbrirPerfilModal?: () => void;
  onAbrirTelegramModal?: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  abaAtiva,
  onSelecionarAba,
  usuarioAtual,
  couple,
  userProfile,
  onAbrirNovaCompra,
  onAbrirEspacoModal,
  onAbrirPerfilModal,
  onAbrirTelegramModal,
  onLogout,
}) => {
  const { isDark, toggleTheme } = useTheme();
  const [copiado, setCopiado] = useState(false);
  const [fotoComErro, setFotoComErro] = useState(false);

  useEffect(() => {
    setFotoComErro(false);
  }, [userProfile?.photoURL]);

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
    <header className="fixed top-0 left-0 right-0 z-40 bg-[#f8f9ff]/90 dark:bg-[#0b1320]/95 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/80 shadow-[0_1px_6px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)] transition-colors">

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
              <span className="font-semibold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white select-none leading-tight whitespace-nowrap">
                NósDois <span className="text-[#006948] dark:text-emerald-400 font-bold">Finanças</span>
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium tracking-tight mt-0.5 whitespace-nowrap">
                {p1Nome} & {p2Nome}
              </span>
            </div>
          </button>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 p-1 bg-slate-100/90 dark:bg-slate-800/80 rounded-xl border border-transparent dark:border-slate-700/60">
            <button
              onClick={() => onSelecionarAba('resumo-mensal')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                abaAtiva === 'resumo-mensal'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
              }`}
            >
              Resumo Mensal
            </button>
            <button
              onClick={() => onSelecionarAba('lancamentos')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                abaAtiva === 'lancamentos'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
              }`}
            >
              Lançamentos
            </button>
            <button
              onClick={() => onSelecionarAba('fechamentos-e-acertos')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                abaAtiva === 'fechamentos-e-acertos'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
              }`}
            >
              Fechamentos & Acertos
            </button>
            <button
              onClick={() => onSelecionarAba('categorias')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                abaAtiva === 'categorias'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
              }`}
            >
              Categorias
            </button>
            <button
              onClick={() => onSelecionarAba('previsao')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                abaAtiva === 'previsao'
                  ? 'bg-white dark:bg-slate-700 text-[#006948] dark:text-emerald-400 font-bold shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">insights</span>
              <span>Previsão</span>
            </button>
          </nav>
        </div>

        {/* Right Zone: Convite pendente, Tema Dark/Light, Nova Compra, User Profile */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Sincronizado Firebase */}
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-medium border border-transparent dark:border-slate-700/60">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Firestore Conectado</span>
          </div>

          {/* Botão de Alternar Tema (Claro / Escuro) */}
          <button
            type="button"
            onClick={toggleTheme}
            className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
              isDark
                ? 'bg-slate-800/90 hover:bg-slate-700 text-amber-300 border-slate-700 shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 shadow-2xs'
            }`}
            title={isDark ? 'Alternar para tema Claro' : 'Alternar para tema Escuro'}
            aria-label={isDark ? 'Alternar para tema Claro' : 'Alternar para tema Escuro'}
          >
            <span className="material-symbols-outlined text-[18px]">
              {isDark ? 'light_mode' : 'dark_mode'}
            </span>
            <span className="hidden sm:inline">{isDark ? 'Claro' : 'Escuro'}</span>
          </button>

          {/* Botão Instalar App no Celular (PWA) */}
          <PWAInstallButton />

          {/* Botão Nova Compra */}
          <button
            onClick={onAbrirNovaCompra}
            type="button"
            className="flex items-center gap-1.5 px-3.5 py-1.5 sm:py-2 rounded-xl bg-[#006948] hover:bg-[#005137] text-white text-xs sm:text-sm font-semibold shadow-sm transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span className="hidden sm:inline">Nova Compra</span>
          </button>

          {/* User Profile Badge */}
          <div className="flex items-center gap-1 sm:gap-1.5 pl-1.5 pr-1 py-1 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
            {/* Clickable Profile Avatar */}
            <button
              type="button"
              onClick={onAbrirPerfilModal}
              className="flex items-center gap-1.5 text-left focus:outline-none group cursor-pointer"
              title="Clique para alterar sua foto de perfil via CDN ou nome"
            >
              {userProfile?.photoURL && !fotoComErro ? (
                <img
                  src={userProfile.photoURL}
                  alt={usuarioAtual}
                  className="w-7 h-7 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-600 group-hover:ring-2 group-hover:ring-[#006948] transition-all"
                  onError={() => setFotoComErro(true)}
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[#006948] group-hover:bg-[#005137] text-white flex items-center justify-center font-bold text-xs uppercase shrink-0 transition-colors">
                  {usuarioAtual.charAt(0) || 'U'}
                </div>
              )}
              <div className="hidden sm:flex flex-col text-left leading-tight pr-1 min-w-0">
                <span className="text-xs font-semibold text-slate-900 dark:text-white truncate group-hover:text-[#006948] dark:group-hover:text-emerald-400 transition-colors">
                  {usuarioAtual}
                </span>
                <span className="text-[10px] font-medium text-[#006948] dark:text-emerald-400 truncate flex items-center gap-0.5">
                  <span>(Você)</span>
                  <span className="material-symbols-outlined text-[10px] opacity-70">edit</span>
                </span>
              </div>
            </button>

            {/* Botão de Espaço do Casal */}
            <button
              onClick={onAbrirEspacoModal}
              type="button"
              className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="Ver dados do Espaço do Casal e convite"
            >
              <span className="material-symbols-outlined text-[16px]">groups</span>
            </button>

            {/* Botão de Logout */}
            <button
              onClick={onLogout}
              type="button"
              className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="Sair da conta"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation bar */}
      <div className="lg:hidden flex items-center justify-around border-t border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-[#0b1320]/95 px-2 py-1.5 overflow-x-auto text-xs">
        <button
          onClick={() => onSelecionarAba('resumo-mensal')}
          className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap cursor-pointer ${
            abaAtiva === 'resumo-mensal'
              ? 'bg-slate-100 dark:bg-slate-800 text-[#006948] dark:text-emerald-400 font-bold'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Resumo
        </button>
        <button
          onClick={() => onSelecionarAba('lancamentos')}
          className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap cursor-pointer ${
            abaAtiva === 'lancamentos'
              ? 'bg-slate-100 dark:bg-slate-800 text-[#006948] dark:text-emerald-400 font-bold'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Lançamentos
        </button>
        <button
          onClick={() => onSelecionarAba('fechamentos-e-acertos')}
          className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap cursor-pointer ${
            abaAtiva === 'fechamentos-e-acertos'
              ? 'bg-slate-100 dark:bg-slate-800 text-[#006948] dark:text-emerald-400 font-bold'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Acertos
        </button>
        <button
          onClick={() => onSelecionarAba('categorias')}
          className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap cursor-pointer ${
            abaAtiva === 'categorias'
              ? 'bg-slate-100 dark:bg-slate-800 text-[#006948] dark:text-emerald-400 font-bold'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Categorias
        </button>
        <button
          onClick={() => onSelecionarAba('previsao')}
          className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap cursor-pointer flex items-center gap-1 ${
            abaAtiva === 'previsao'
              ? 'bg-slate-100 dark:bg-slate-800 text-[#006948] dark:text-emerald-400 font-bold'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <span className="material-symbols-outlined text-[13px]">insights</span>
          <span>Previsão</span>
        </button>
        <button
          onClick={() => onSelecionarAba('minhas-despesas')}
          className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap cursor-pointer flex items-center gap-1 ${
            abaAtiva === 'minhas-despesas'
              ? 'bg-blue-600 text-white font-bold'
              : 'text-blue-700 dark:text-blue-400'
          }`}
        >
          <span className="material-symbols-outlined text-[13px]">lock</span>
          <span>Privado</span>
        </button>
      </div>
    </header>
  );
};
