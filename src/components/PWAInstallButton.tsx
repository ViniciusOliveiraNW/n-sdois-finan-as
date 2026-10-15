import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'header' | 'banner' | 'modal';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'header',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [mostrarGuiaIOS, setMostrarGuiaIOS] = useState(false);
  const [mostrarGuiaGeral, setMostrarGuiaGeral] = useState(false);

  // Se já estiver rodando instalado na tela inicial (standalone), esconde
  if (isInstalled) {
    return null;
  }

  // Android / Chromium / Desktop nativo
  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all active:scale-[0.98] cursor-pointer ${className}`}
        title="Instalar NósDois Finanças no celular ou computador"
      >
        <span className="material-symbols-outlined text-[16px]">install_mobile</span>
        <span>Instalar App</span>
      </button>
    );
  }

  // iOS Safari (WebKit não suporta beforeinstallprompt nativo, requer instruções de tela inicial)
  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setMostrarGuiaIOS(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[#006948] text-xs font-bold transition-all cursor-pointer ${className}`}
          title="Como instalar no iPhone ou iPad"
        >
          <span className="material-symbols-outlined text-[16px]">add_to_home_screen</span>
          <span>Instalar no iPhone</span>
        </button>

        {mostrarGuiaIOS && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          >
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 flex flex-col gap-4 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#006948] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">phone_iphone</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Instalar no iPhone / iPad</h3>
                </div>
                <button
                  onClick={() => setMostrarGuiaIOS(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>

              <div className="flex flex-col gap-3 text-slate-700 leading-relaxed">
                <p>Para usar o **NósDois Finanças** em tela cheia como um aplicativo no seu iOS:</p>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-2.5">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#006948] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      1
                    </span>
                    <span>
                      Toque no ícone de <strong>Compartilhar</strong> (o quadrado com uma seta para cima na barra inferior do Safari).
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#006948] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      2
                    </span>
                    <span>
                      Role a lista para baixo e toque em <strong>&ldquo;Adicionar à Tela de Início&rdquo;</strong>.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#006948] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      3
                    </span>
                    <span>
                      Toque em <strong>&ldquo;Adicionar&rdquo;</strong> no canto superior direito.
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500">
                  O ícone do casal aparecerá diretamente na sua tela de início, abrindo sem barra de navegador.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setMostrarGuiaIOS(false)}
                className="w-full py-2.5 rounded-xl bg-[#006948] hover:bg-[#005137] text-white font-bold text-xs shadow-sm cursor-pointer"
              >
                Entendi
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Fallback padrão amigável (quando visualizado pelo desktop/navegador)
  return (
    <>
      <button
        type="button"
        onClick={() => setMostrarGuiaGeral(true)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer ${className}`}
        title="Instalar no Celular"
      >
        <span className="material-symbols-outlined text-[16px] text-[#006948]">devices</span>
        <span>App no Celular</span>
      </button>

      {mostrarGuiaGeral && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 flex flex-col gap-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#006948] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">smartphone</span>
                </div>
                <h3 className="text-sm font-bold text-slate-900">Como usar no Celular</h3>
              </div>
              <button
                onClick={() => setMostrarGuiaGeral(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-3 text-slate-700 leading-relaxed">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-2">
                <strong className="text-slate-900 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px] text-[#006948]">android</span>
                  No Android (Chrome / Edge):
                </strong>
                <p className="text-[11px] text-slate-600">
                  Abra o link do NósDois no Chrome do celular, toque nos <strong>3 pontinhos</strong> no canto superior direito e escolha <strong>&ldquo;Instalar aplicativo&rdquo;</strong> ou <strong>&ldquo;Adicionar à tela inicial&rdquo;</strong>.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-2">
                <strong className="text-slate-900 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px] text-[#006948]">phone_iphone</span>
                  No iPhone / iPad (Safari):
                </strong>
                <p className="text-[11px] text-slate-600">
                  Abra no Safari, toque no botão <strong>Compartilhar</strong> (quadrado com seta para cima) e selecione <strong>&ldquo;Adicionar à Tela de Início&rdquo;</strong>.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMostrarGuiaGeral(false)}
              className="w-full py-2.5 rounded-xl bg-[#006948] hover:bg-[#005137] text-white font-bold text-xs shadow-sm cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </>
  );
};
