import React, { useState } from 'react';
import { UserProfile } from '../types';
import { criarEspacoCasal, afiliarComCodigo } from '../services/firebaseService';

interface OnboardingCasalViewProps {
  user: UserProfile;
  onEspacoVinculado: () => void;
  onLogout: () => void;
}

export const OnboardingCasalView: React.FC<OnboardingCasalViewProps> = ({
  user,
  onEspacoVinculado,
  onLogout,
}) => {
  const [modo, setModo] = useState<'escolha' | 'criar' | 'entrar'>('escolha');
  const [meuNome, setMeuNome] = useState(user.displayName || '');
  const [codigoConvite, setCodigoConvite] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [codigoGerado, setCodigoGerado] = useState<string | null>(null);

  const handleCriar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      const space = await criarEspacoCasal(user, meuNome.trim());
      setCodigoGerado(space.inviteCode);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao criar o espaço do casal.');
    } finally {
      setCarregando(false);
    }
  };

  const handleEntrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    if (!codigoConvite.trim()) {
      setErro('Informe o código de parceria.');
      return;
    }
    setCarregando(true);
    try {
      await afiliarComCodigo(user, codigoConvite.trim(), meuNome.trim());
      onEspacoVinculado();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao vincular ao parceiro.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 sm:p-8 bg-slate-50 border-b border-slate-200 text-center flex flex-col items-center">
          <div className="w-14 h-14 rounded-full bg-[#006948] text-white flex items-center justify-center shadow-md mb-3">
            <span className="material-symbols-outlined text-[30px]">favorite</span>
          </div>
          <span className="text-[11px] font-bold text-[#006948] uppercase tracking-wider px-3 py-0.5 rounded-full bg-emerald-50 mb-1.5">
            Finanças em Harmonia
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Vincule sua Parceria
          </h1>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            Conectado como <strong>{user.email}</strong>. Crie um espaço exclusivo ou entre com o
            código do seu amor.
          </p>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8 flex flex-col gap-6">
          {erro && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{erro}</span>
            </div>
          )}

          {/* Estado após criação: Exibe código gerado */}
          {codigoGerado ? (
            <div className="flex flex-col items-center text-center gap-4 py-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-[#006948] flex items-center justify-center">
                <span className="material-symbols-outlined text-[26px]">check_circle</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Espaço Criado com Sucesso!</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Envie este código para o seu parceiro(a) se conectar a este mesmo controle financeiro:
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-100 border-2 border-dashed border-[#006948]/50 flex items-center justify-between gap-4 w-full max-w-xs">
                <span className="font-mono text-2xl font-extrabold tracking-widest text-[#006948]">
                  {codigoGerado}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(codigoGerado);
                    alert('Código copiado para a área de transferência!');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">content_copy</span>
                  <span>Copiar</span>
                </button>
              </div>

              <button
                type="button"
                onClick={onEspacoVinculado}
                className="w-full py-3 rounded-xl bg-[#006948] hover:bg-[#005137] text-white font-bold text-sm shadow-md transition-all active:scale-[0.98] cursor-pointer mt-2"
              >
                Acessar Nosso Painel Financeiro
              </button>
            </div>
          ) : modo === 'escolha' ? (
            <div className="flex flex-col gap-4">
              <button
                type="button"
                onClick={() => setModo('criar')}
                className="p-5 rounded-2xl border-2 border-slate-200 hover:border-[#006948] hover:bg-emerald-50/20 transition-all flex items-start gap-4 text-left group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-50 group-hover:bg-[#006948] text-[#006948] group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                  <span className="material-symbols-outlined text-[22px]">add_circle</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">1. Sou o Primeiro: Criar Espaço</h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Você gera o espaço do zero e recebe um código exclusivo para enviar ao seu
                    parceiro(a).
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setModo('entrar')}
                className="p-5 rounded-2xl border-2 border-slate-200 hover:border-[#0051d5] hover:bg-blue-50/20 transition-all flex items-start gap-4 text-left group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 group-hover:bg-[#0051d5] text-[#0051d5] group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                  <span className="material-symbols-outlined text-[22px]">link</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">2. Já Tenho o Código do Meu Amor</h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Seu parceiro(a) já criou o espaço? Digite o código de 6 dígitos para sincronizar
                    suas contas.
                  </p>
                </div>
              </button>
            </div>
          ) : modo === 'criar' ? (
            <form onSubmit={handleCriar} className="flex flex-col gap-4 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700">Seu Nome de Exibição</label>
                <input
                  type="text"
                  value={meuNome}
                  onChange={(e) => setMeuNome(e.target.value)}
                  placeholder="Ex: Vinicius ou Silvia"
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white"
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModo('escolha')}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={carregando}
                  className="flex-1 py-2.5 rounded-xl bg-[#006948] hover:bg-[#005137] text-white font-bold text-sm shadow-md transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  {carregando ? 'Criando Espaço...' : 'Criar Espaço & Gerar Código'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleEntrar} className="flex flex-col gap-4 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700">Seu Nome de Exibição</label>
                <input
                  type="text"
                  value={meuNome}
                  onChange={(e) => setMeuNome(e.target.value)}
                  placeholder="Ex: Silvia"
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700">Código de Parceria do Casal</label>
                <input
                  type="text"
                  value={codigoConvite}
                  onChange={(e) => setCodigoConvite(e.target.value.toUpperCase())}
                  placeholder="Ex: 7X9B2K"
                  maxLength={10}
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-base font-bold font-mono tracking-widest uppercase focus:bg-white text-center"
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModo('escolha')}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={carregando}
                  className="flex-1 py-2.5 rounded-xl bg-[#0051d5] hover:bg-[#003ea8] text-white font-bold text-sm shadow-md transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  {carregando ? 'Conectando...' : 'Vincular ao Meu Amor'}
                </button>
              </div>
            </form>
          )}

          {/* Sair */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>Deseja usar outra conta?</span>
            <button
              type="button"
              onClick={onLogout}
              className="text-red-500 hover:underline font-semibold cursor-pointer"
            >
              Sair desta conta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
