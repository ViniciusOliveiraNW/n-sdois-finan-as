import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import {
  criarEspacoCasal,
  afiliarComCodigo,
  buscarEspacosDoUsuario,
  reconectarEspaco,
  restaurarComprasIniciais,
  excluirEspacoCasal,
  isCriadorDoEspaco,
  EspacoComContagem,
} from '../services/firebaseService';
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
  const [importarIniciais, setImportarIniciais] = useState(true);

  // Afiliação
  const [codigoConvite, setCodigoConvite] = useState('');
  const [meuNomeAfiliar, setMeuNomeAfiliar] = useState(user.displayName || 'Silvia');

  // Espaços Existentes Encontrados
  const [espacosEncontrados, setEspacosEncontrados] = useState<EspacoComContagem[]>([]);
  const [buscandoEspacos, setBuscandoEspacos] = useState(true);
  const [reconectandoId, setReconectandoId] = useState<string | null>(null);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Busca espaços já existentes vinculados ao e-mail/UID
  useEffect(() => {
    let ativo = true;
    async function carregarEspacos() {
      setBuscandoEspacos(true);
      try {
        const encontrados = await buscarEspacosDoUsuario(user);
        if (ativo) {
          setEspacosEncontrados(encontrados);
        }
      } catch (err) {
        console.warn('Erro ao carregar espaços anteriores:', err);
      } finally {
        if (ativo) setBuscandoEspacos(false);
      }
    }
    carregarEspacos();
    return () => {
      ativo = false;
    };
  }, [user]);

  const handleReconectar = async (spaceId: string) => {
    setReconectandoId(spaceId);
    setErro(null);
    try {
      await reconectarEspaco(user, spaceId);
      onConcluido();
    } catch (err: unknown) {
      console.error('Erro ao reconectar ao espaço:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setErro(msg || 'Erro ao reconectar a este espaço financeiro.');
    } finally {
      setReconectandoId(null);
    }
  };

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
      const space = await criarEspacoCasal(user, meuNomeCriar.trim(), nomeParceiro.trim());
      if (importarIniciais) {
        try {
          await restaurarComprasIniciais(space.id, user, meuNomeCriar.trim(), nomeParceiro.trim());
        } catch (e) {
          console.warn('Compras iniciais não puderam ser importadas:', e);
        }
      }
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
    <div className="min-h-screen bg-[#f8f9ff] dark:bg-[#0b1320] flex flex-col justify-center items-center p-4 sm:p-6 text-[#0b1c30] dark:text-slate-100 transition-colors">
      <div className="w-full max-w-lg bg-white dark:bg-[#161f2e] rounded-3xl shadow-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden transition-colors">
        {/* Header */}
        <div className="p-7 sm:p-8 bg-gradient-to-b from-slate-50 to-white dark:from-slate-800/60 dark:to-[#161f2e] border-b border-slate-100 dark:border-slate-800 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-[#006948] dark:text-emerald-400 flex items-center justify-center shadow-sm mb-3">
            <span className="material-symbols-outlined text-[28px]">favorite</span>
          </div>

          <span className="px-3 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-[#006948] dark:text-emerald-400 text-[11px] font-bold uppercase tracking-wider mb-1">
            Espaço Compartilhado
          </span>

          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Conecte o seu Casal
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm leading-relaxed">
            Olá, <strong className="text-slate-800 dark:text-slate-200">{user.displayName || user.email}</strong>!
          </p>
        </div>

        {/* Content Body */}
        <div className="p-7 sm:p-8 flex flex-col gap-6">
          {/* Card de Espaços Existentes Encontrados (Recuperação Automática de Compras) */}
          {buscandoEspacos ? (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="w-3.5 h-3.5 border-2 border-[#006948]/30 border-t-[#006948] rounded-full animate-spin"></span>
              <span>Localizando compras e espaços anteriores vinculados ao seu e-mail...</span>
            </div>
          ) : espacosEncontrados.length > 0 ? (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-slate-900 border-2 border-emerald-300/80 dark:border-emerald-700/60 shadow-sm flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-[#006948] text-white flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[18px]">cloud_done</span>
                </span>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    Espaço Anterior Encontrado!
                  </h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    Localizamos seu espaço financeiro vinculado a <strong className="text-slate-800 dark:text-slate-100">{user.email}</strong>.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {espacosEncontrados.map((item) => {
                  const p1 = item.space.partner1Name || 'Vinicius';
                  const p2 = item.space.partner2Name || 'Silvia';
                  const isCurrentConnecting = reconectandoId === item.space.id;

                  return (
                    <div
                      key={item.space.id}
                      className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-emerald-200/90 dark:border-emerald-800/80 shadow-xs flex items-center justify-between gap-3 hover:border-emerald-400 dark:hover:border-emerald-500 transition-all"
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {p1} & {p2}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                          <span className="font-mono bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded font-bold text-slate-700 dark:text-slate-200">
                            Código: {item.space.inviteCode}
                          </span>
                          <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[13px]">shopping_cart</span>
                            <span>{item.purchaseCount} compras salvas</span>
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleReconectar(item.space.id)}
                        disabled={reconectandoId !== null}
                        className="px-3.5 py-2 rounded-xl bg-[#006948] hover:bg-[#005137] text-white font-bold text-xs shadow-sm transition-all active:scale-[0.98] cursor-pointer shrink-0 disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isCurrentConnecting ? (
                          <span className="w-3.5 h-3.5 border-2 border-white/60 border-t-white rounded-full animate-spin"></span>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-[15px]">sync</span>
                            <span>Reconectar</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Mode Selector */}
          <div className="p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl flex gap-1">
            <button
              type="button"
              onClick={() => {
                setModo('criar');
                setErro(null);
              }}
              className={`flex-1 py-2 text-center rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                modo === 'criar'
                  ? 'bg-white dark:bg-slate-700 text-[#006948] dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
                  ? 'bg-white dark:bg-slate-700 text-[#006948] dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">link</span>
              <span>Tenho um Código</span>
            </button>
          </div>

          {erro && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{erro}</span>
            </div>
          )}

          {/* Form: Criar Novo Espaço */}
          {modo === 'criar' && (
            <form onSubmit={handleCriar} className="flex flex-col gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[18px] text-[#006948] dark:text-emerald-400 shrink-0 mt-0.5">
                  info
                </span>
                <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                  Ao criar o espaço, um <strong>código de 6 letras</strong> exclusivo será gerado. Você poderá enviá-lo ao seu parceiro para que ambos visualizem e lancem contas em sincronia!
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Como você quer ser chamado(a)?</label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-slate-400 text-[18px]">
                    badge
                  </span>
                  <input
                    type="text"
                    value={meuNomeCriar}
                    onChange={(e) => setMeuNomeCriar(e.target.value)}
                    placeholder="Ex: Vinicius"
                    className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#006948]/20"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Nome do(a) seu(sua) parceiro(a)</label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-slate-400 text-[18px]">
                    favorite
                  </span>
                  <input
                    type="text"
                    value={nomeParceiro}
                    onChange={(e) => setNomeParceiro(e.target.value)}
                    placeholder="Ex: Silvia"
                    className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#006948]/20"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <input
                  type="checkbox"
                  id="chk-importar-iniciais"
                  checked={importarIniciais}
                  onChange={(e) => setImportarIniciais(e.target.checked)}
                  className="rounded text-[#006948] focus:ring-[#006948] h-4 w-4 cursor-pointer"
                />
                <label htmlFor="chk-importar-iniciais" className="text-[11px] text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
                  Importar as compras padrão do casal (14 compras: Supermercado, Aluguel, Farmácia, etc.)
                </label>
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
              <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[18px] text-[#0051d5] dark:text-blue-400 shrink-0 mt-0.5">
                  vpn_key
                </span>
                <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                  Digite o código de convite de 6 caracteres gerado pelo seu parceiro(a) para se conectar instantaneamente ao mesmo espaço financeiro.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Código de Convite do Casal</label>
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
                    className="w-full h-11 pl-9 pr-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold text-base tracking-widest uppercase focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#006948]/20"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Seu Nome ou Apelido</label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-slate-400 text-[18px]">
                    person
                  </span>
                  <input
                    type="text"
                    value={meuNomeAfiliar}
                    onChange={(e) => setMeuNomeAfiliar(e.target.value)}
                    placeholder="Ex: Silvia"
                    className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#006948]/20"
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
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Conectado como <strong className="text-slate-700 dark:text-slate-300">{user.email}</strong></span>
            <button
              type="button"
              onClick={() => auth.signOut()}
              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-semibold cursor-pointer flex items-center gap-1 hover:underline"
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
