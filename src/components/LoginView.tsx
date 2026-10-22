import React, { useState } from 'react';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

export const LoginView: React.FC = () => {
  const [modo, setModo] = useState<'login' | 'signup'>('login');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setErro(null);
    setCarregando(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Erro no login com Google:', err);
      setErro(err?.message || 'Falha ao autenticar com Google. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    try {
      if (modo === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), senha);
        if (nome.trim()) {
          await updateProfile(cred.user, { displayName: nome.trim() });
        }
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), senha);
      }
    } catch (err: any) {
      console.error('Erro na autenticação por email:', err);
      let msg = err?.message || 'Falha na autenticação.';
      if (err?.code === 'auth/operation-not-allowed') {
        msg =
          'O provedor Email/Senha ainda não foi ativado no Firebase Console. Utilize o botão "Entrar com Google" logo abaixo para entrar com 1 clique!';
      } else if (err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential') {
        msg = 'E-mail ou senha incorretos.';
      } else if (err?.code === 'auth/user-not-found') {
        msg = 'Usuário não encontrado. Deseja criar uma nova conta?';
      } else if (err?.code === 'auth/weak-password') {
        msg = 'A senha deve conter pelo menos 6 caracteres.';
      }
      setErro(msg);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] dark:bg-[#0b1320] flex flex-col justify-center items-center p-4 sm:p-6 transition-colors">
      <div className="w-full max-w-md flex flex-col items-center">
        {/* Header */}
        <header className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-[#006948] text-white flex items-center justify-center shadow-lg mb-3">
            <span className="material-symbols-outlined text-[32px]">favorite</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-[#006948] dark:text-emerald-400 mb-2 text-xs font-bold uppercase tracking-wider border border-transparent dark:border-emerald-800/40">
            <span className="material-symbols-outlined text-[14px]">volunteer_activism</span>
            <span>Finanças em Harmonia</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-1">
            NósDois Finanças
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
            Acesse sua conta do casal e mantenha a clareza financeira a dois com serenidade e parceria.
          </p>
        </header>

        {/* Card de Autenticação */}
        <div className="w-full bg-white dark:bg-[#161f2e] rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 mb-8">
          {/* Tabs */}
          <div className="p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl flex mb-5 border border-transparent dark:border-slate-700">
            <button
              type="button"
              onClick={() => {
                setModo('login');
                setErro(null);
              }}
              className={`flex-1 py-2 text-center rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                modo === 'login'
                  ? 'bg-white dark:bg-slate-700 text-[#006948] dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">login</span>
              <span>Entrar na Conta</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setModo('signup');
                setErro(null);
              }}
              className={`flex-1 py-2 text-center rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                modo === 'signup'
                  ? 'bg-white dark:bg-slate-700 text-[#006948] dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">group_add</span>
              <span>Criar Conta</span>
            </button>
          </div>

          {erro && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs mb-4 flex items-start gap-2">
              <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
              <span className="leading-relaxed">{erro}</span>
            </div>
          )}

          {/* Botão Google em Destaque */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={carregando}
            className="w-full h-11 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors flex items-center justify-center gap-2.5 shadow-sm cursor-pointer mb-4"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                fill="#EA4335"
              />
            </svg>
            <span>Continuar com Google (Recomendado)</span>
          </button>

          <div className="flex items-center my-4 text-slate-400 dark:text-slate-500 text-[11px]">
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
            <span className="px-3">ou entre com e-mail</span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
          </div>

          <form onSubmit={handleEmailAuth} className="flex flex-col gap-3.5 text-xs">
            {modo === 'signup' && (
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Seu Nome</label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Vinicius ou Silvia"
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:bg-white dark:focus:bg-slate-800"
                  required
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@exemplo.com"
                className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:bg-white dark:focus:bg-slate-800"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Senha</label>
              <div className="relative flex items-center">
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Mínimo de 6 caracteres"
                  className="w-full h-10 pl-3 pr-10 rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:bg-white dark:focus:bg-slate-800"
                  required
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute right-3 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {mostrarSenha ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={carregando}
              className="w-full h-11 mt-1 rounded-xl bg-[#006948] hover:bg-[#005137] text-white font-bold text-xs shadow-md transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">verified_user</span>
              <span>
                {carregando
                  ? 'Aguarde...'
                  : modo === 'login'
                  ? 'Entrar no NósDois'
                  : 'Cadastrar Minha Conta'}
              </span>
            </button>
          </form>
        </div>

        {/* 3 Benefícios do Casal */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 text-xs">
          <div className="bg-white dark:bg-[#161f2e] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-start">
            <span className="material-symbols-outlined text-[#006948] dark:text-emerald-400 text-[20px] mb-1">
              splitscreen
            </span>
            <strong className="text-slate-800 dark:text-white">Visão Individual & Casal</strong>
            <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
              Clareza total do que cada um pagou e do impacto conjunto.
            </p>
          </div>

          <div className="bg-white dark:bg-[#161f2e] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-start">
            <span className="material-symbols-outlined text-[#006948] dark:text-emerald-400 text-[20px] mb-1">
              balance
            </span>
            <strong className="text-slate-800 dark:text-white">Divisão Justa 50/50</strong>
            <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
              Cálculo automatizado em centavos inteiros sem atrito.
            </p>
          </div>

          <div className="bg-white dark:bg-[#161f2e] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-start">
            <span className="material-symbols-outlined text-[#006948] dark:text-emerald-400 text-[20px] mb-1">
              cloud_sync
            </span>
            <strong className="text-slate-800 dark:text-white">Sincronizado na Nuvem</strong>
            <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
              Firebase Firestore em tempo real no celular e no computador.
            </p>
          </div>
        </div>

        <footer className="text-center text-[11px] text-slate-400 dark:text-slate-500">
          NósDois Finanças • Conectando quem constrói o futuro junto.
        </footer>
      </div>
    </div>
  );
};
