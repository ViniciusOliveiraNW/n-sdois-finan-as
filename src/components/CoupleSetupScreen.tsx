import React, { useState } from 'react';
import { UserProfile } from '../types';
import { criarEspacoCasal, afiliarComCodigo } from '../services/firebaseService';
import { auth } from '../firebase';

interface CoupleSetupScreenProps {
  user: UserProfile;
  onConcluido: () => void;
}

export const CoupleSetupScreen: React.FC<CoupleSetupScreenProps> = ({ user, onConcluido }) => {
  const [modo, setModo] = useState<'criar' | 'afiliar'>('criar');

  // Criação
  const [meuNomeCriar, setMeuNomeCriar] = useState(user.displayName || 'Vinicius');
  const [nomeParceiro, setNomeParceiro] = useState('Silvia');

  // Afiliação
  const [codigoConvite, setCodigoConvite] = useState('');
  const [meuNomeAfiliar, setMeuNomeAfiliar] = useState(user.displayName || 'Silvia');

  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleCriar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meuNomeCriar.trim()) {
      setErro('Informe seu nome ou apelido.');
      return;
    }
    if (!nomeParceiro.trim()) {
      setErro('Informe o nome do(a) seu(sua) parceiro(a).');
      return;
    }

    setCarregando(true);
    setErro(null);

    try {
      await criarEspacoCasal(user, meuNomeCriar.trim(), nomeParceiro.trim());
      onConcluido();
    } catch (err: unknown) {
      console.error('Erro ao criar espaço:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setErro(msg || 'Erro ao criar o espaço do casal. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  const handleAfiliar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigoConvite.trim()) {
      setErro('Digite o código de 6 caracteres fornecido pelo seu amor.');
      return;
    }
    if (!meuNomeAfiliar.trim()) {
      setErro('Informe seu nome ou apelido.');
      return;
    }

    setCarregando(true);
    setErro(null);

    try {
      await afiliarComCodigo(user, codigoConvite.trim(), meuNomeAfiliar.trim());
      onConcluido();
    } catch (err: unknown) {
      console.error('Erro ao afiliar:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setErro(msg || 'Erro ao afiliar-se com este código.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] flex flex-col justify-center items-center p-4 sm:p-6 text-[#0b1c30]">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden">
        {/* Header */}
        <div className="p-7 sm:p-8 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-[#006948] flex items-center justify-center shadow-sm mb-3">
            <span className="material-symbols-outlined text-[28px]">favorite</span>
          </div>

          <span className="px-3 py-0.5 rounded-full bg-emerald-100 text-[#006948] text-[11px] font-bold uppercase tracking-wider mb-1">
            Espaço Compartilhado
          </span>

          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Conecte o seu Casal
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">
            Olá, <strong className="text-slate-800">{user.displayName || user.email}</strong>! Para começar, crie um novo espaço ou entre no espaço já criado pelo seu parceiro.
          </p>
        </div>

        {/* Mode Selector */}
        <div className="p-7 sm:p-8 flex flex-col gap-6">
          <div className="p-1 bg-slate-100 rounded-xl flex gap-1">
            <button
              type="button"
              onClick={() => {
                setModo('criar');
                setErro(null);
              }}
              className={`flex-1 py-2 text-center rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                modo === 'criar'
                  ? 'bg-white text-[#006948] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              <span>Criar Novo Espaço</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setModo('afiliar');
                setErro(null);
              }}
              className={`flex-1 py-2 text-center rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                modo === 'afiliar'
                  ? 'bg-white text-[#006948] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">link</span>
              <span>Tenho um Código</span>
            </button>
          </div>

          {erro && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{erro}</span>
            </div>
          )}

          {/* Form: Criar Novo Espaço */}
          {modo === 'criar' && (
            <form onSubmit={handleCriar} className="flex flex-col gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[18px] text-[#006948] shrink-0 mt-0.5">
                  info
                </span>
                <p className="text-[11px] text-slate-700 leading-relaxed">
                  Ao criar o espaço, um <strong>código de 6 letras</strong> exclusivo será gerado. Você poderá enviá-lo ao seu parceiro para que ambos visualizem e lancem contas em sincronia!
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700">Como você quer ser chamado(a)?</label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-slate-400 text-[18px]">
                    badge
                  </span>
                  <input
                    type="text"
                    value={meuNomeCriar}
                    onChange={(e) => setMeuNomeCriar(e.target.value)}
                    placeholder="Ex: Vinicius"
                    className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006948]/20"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700">Nome do(a) seu(sua) parceiro(a)</label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-slate-400 text-[18px]">
                    favorite
                  </span>
                  <input
                    type="text"
                    value={nomeParceiro}
                    onChange={(e) => setNomeParceiro(e.target.value)}
                    placeholder="Ex: Silvia"
                    className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006948]/20"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={carregando}
                className="w-full h-11 mt-2 rounded-xl bg-[#006948] hover:bg-[#005137] text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {carregando ? (
                  <span className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">handshake</span>
                    <span>Criar Espaço do Casal</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Form: Afiliar-se com Código */}
          {modo === 'afiliar' && (
            <form onSubmit={handleAfiliar} className="flex flex-col gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[18px] text-[#0051d5] shrink-0 mt-0.5">
                  vpn_key
                </span>
                <p className="text-[11px] text-slate-700 leading-relaxed">
                  Digite o código de convite de 6 caracteres gerado pelo seu parceiro(a) para se conectar instantaneamente ao mesmo espaço financeiro.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700">Código de Convite do Casal</label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-slate-400 text-[18px]">
                    key
                  </span>
                  <input
                    type="text"
                    value={codigoConvite}
                    onChange={(e) => setCodigoConvite(e.target.value.toUpperCase())}
                    placeholder="Ex: ABC123"
                    maxLength={10}
                    className="w-full h-11 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold text-base tracking-widest uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006948]/20"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700">Seu Nome ou Apelido</label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-slate-400 text-[18px]">
                    person
                  </span>
                  <input
                    type="text"
                    value={meuNomeAfiliar}
                    onChange={(e) => setMeuNomeAfiliar(e.target.value)}
                    placeholder="Ex: Silvia"
                    className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006948]/20"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={carregando}
                className="w-full h-11 mt-2 rounded-xl bg-[#0051d5] hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {carregando ? (
                  <span className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">link</span>
                    <span>Afiliar-se ao Espaço</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Footer: Sair da Conta */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Conectado como {user.email}</span>
            <button
              type="button"
              onClick={() => auth.signOut()}
              className="text-red-600 hover:text-red-700 font-semibold cursor-pointer flex items-center gap-1 hover:underline"
            >
              <span className="material-symbols-outlined text-[15px]">logout</span>
              <span>Sair da Conta</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
