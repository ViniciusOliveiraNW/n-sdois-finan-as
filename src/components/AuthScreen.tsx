import React, { useState } from 'react';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

interface AuthScreenProps {
  onSucesso?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSucesso }) => {
  const [modo, setModo] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nome, setNome] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setCarregando(true);
    setErro(null);
    try {
      await signInWithPopup(auth, googleProvider);
      if (onSucesso) onSucesso();
    } catch (err: unknown) {
      console.error('Erro no login Google:', err);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('popup-closed-by-user')) {
        setErro('O pop-up de login foi fechado antes de concluir.');
      } else {
        setErro('Falha na autenticação Google. Verifique sua conexão e tente novamente.');
      }
    } finally {
      setCarregando(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !senha) {
      setErro('Preencha seu e-mail e senha.');
      return;
    }
    if (modo === 'signup' && senha.length < 6) {
      setErro('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    setCarregando(true);
    setErro(null);

    try {
      if (modo === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, email, senha);
        if (nome.trim()) {
          await updateProfile(cred.user, { displayName: nome.trim() });
        }
      } else {
        await signInWithEmailAndPassword(auth, email, senha);
      }
      if (onSucesso) onSucesso();
    } catch (err: unknown) {
      console.error('Erro na autenticação:', err);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('invalid-credential')) {
        setErro('E-mail ou senha incorretos.');
      } else if (msg.includes('email-already-in-use')) {
        setErro('Este e-mail já está em uso. Tente entrar na sua conta.');
      } else if (msg.includes('invalid-email')) {
        setErro('Formato de e-mail inválido.');
      } else {
        setErro('Ocorreu um erro ao autenticar. Tente novamente.');
      }
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] flex flex-col justify-center items-center p-4 sm:p-6 text-[#0b1c30]">
      {/* Background Decor */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden">
        {/* Brand Header */}
        <div className="p-7 sm:p-8 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100 flex flex-col items-center text-center">
          {/* Logo SVG Interlocking Circles */}
          <div className="w-14 h-14 mb-3 flex items-center justify-center">
            <svg
              className="w-12 h-12"
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
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-100 text-[#006948] text-[11px] font-bold uppercase tracking-wider mb-1.5">
            <span className="material-symbols-outlined text-[14px]">favorite</span>
            <span>Controle Financeiro a Dois</span>
          </div>

          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            NósDois <span className="text-[#006948]">Finanças</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
            Gestão transparente de contas, divisão 50/50 em centavos e conciliação em tempo real para o casal.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-7 sm:p-8 flex flex-col gap-5">
          {/* Google Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={carregando}
            className="w-full h-11 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold text-xs sm:text-sm shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
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
            <span>Continuar com Google</span>
          </button>

          {/* Divider */}
          <div className="flex items-center my-0.5 text-slate-400 text-[11px]">
            <div className="flex-1 h-px bg-slate-200"></div>
            <span className="px-3">ou use seu e-mail</span>
            <div className="flex-1 h-px bg-slate-200"></div>
          </div>

          {/* Mode Switch Tabs */}
          <div className="p-1 bg-slate-100 rounded-xl flex">
            <button
              type="button"
              onClick={() => {
                setModo('login');
                setErro(null);
              }}
              className={`flex-1 py-1.5 text-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
                modo === 'login'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => {
                setModo('signup');
                setErro(null);
              }}
              className={`flex-1 py-1.5 text-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
                modo === 'signup'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Cadastrar
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

          {/* Email / Password Form */}
          <form onSubmit={handleEmailAuth} className="flex flex-col gap-3.5 text-xs">
            {modo === 'signup' && (
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700">Seu Nome ou Apelido</label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-slate-400 text-[18px]">
                    person
                  </span>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Vinicius ou Silvia"
                    className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006948]/20"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-slate-700">E-mail</label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-slate-400 text-[18px]">
                  mail
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006948]/20"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-slate-700">Senha</label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-slate-400 text-[18px]">
                  lock
                </span>
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full h-10 pl-9 pr-10 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006948]/20"
                  required
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 cursor-pointer"
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
              className="w-full h-11 mt-1 rounded-xl bg-[#006948] hover:bg-[#005137] text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {carregando ? (
                <span className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin"></span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">
                    {modo === 'login' ? 'login' : 'how_to_reg'}
                  </span>
                  <span>{modo === 'login' ? 'Entrar no NósDois' : 'Criar Minha Conta'}</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
