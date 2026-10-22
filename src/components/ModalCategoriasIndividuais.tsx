import React, { useState } from 'react';
import { CategoriaId, CategoriaMeta, LancamentoMensal } from '../types';
import { CATEGORIAS_PADRAO_INDIVIDUAIS } from '../data/initialData';
import { formatarBRL } from '../calculations/acertoMensal';
import { CategoryIconOrImage } from './CategoryIconOrImage';

interface ModalCategoriasIndividuaisProps {
  aberto: boolean;
  onFechar: () => void;
  categorias: CategoriaMeta[];
  lancamentosDoMes: LancamentoMensal[];
  onSalvarCategorias: (novasCategorias: CategoriaMeta[]) => Promise<void> | void;
}

const EMOJIS_SUGERIDOS_INDIVIDUAIS = [
  '🎮', '🎁', '📚', '👕', '☕', '🧴', '🛍️', '📱',
  '📦', '🏋️', '🎬', '✈️', '🍕', '🎧', '💄', '🌿',
  '🚴', '🎨', '💻', '💡'
];

export const ModalCategoriasIndividuais: React.FC<ModalCategoriasIndividuaisProps> = ({
  aberto,
  onFechar,
  categorias,
  lancamentosDoMes,
  onSalvarCategorias,
}) => {
  const [modalFormAberta, setModalFormAberta] = useState(false);
  const [categoriaEmEdicao, setCategoriaEmEdicao] = useState<CategoriaMeta | null>(null);

  // Form states
  const [nome, setNome] = useState('');
  const [icone, setIcone] = useState('🎮');
  const [imagemUrl, setImagemUrl] = useState('');
  const [tetoInput, setTetoInput] = useState('');
  const [descricao, setDescricao] = useState('');
  const [isFixo, setIsFixo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmandoReset, setConfirmandoReset] = useState(false);

  if (!aberto) return null;

  // Gastos no mês por categoria individual
  const gastosPorCategoria: Partial<Record<CategoriaId, number>> = {};
  for (const l of lancamentosDoMes) {
    gastosPorCategoria[l.categoria] = (gastosPorCategoria[l.categoria] ?? 0) + l.valorCentavos;
  }

  const handleAbrirNova = () => {
    setCategoriaEmEdicao(null);
    setNome('');
    setIcone('🏷️');
    setImagemUrl('');
    setTetoInput('300,00');
    setDescricao('');
    setIsFixo(false);
    setErro(null);
    setModalFormAberta(true);
  };

  const handleAbrirEditar = (cat: CategoriaMeta) => {
    setCategoriaEmEdicao(cat);
    setNome(cat.nome);
    setIcone(cat.icone || '🏷️');
    setImagemUrl(cat.imagemUrl || '');
    setTetoInput((cat.tetoEstimadoCentavos / 100).toFixed(2).replace('.', ','));
    setDescricao(cat.descricao || '');
    setIsFixo(Boolean(cat.isFixo));
    setErro(null);
    setModalFormAberta(true);
  };

  const handleSalvarForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    const nomeTrim = nome.trim();
    if (!nomeTrim) {
      setErro('Informe o nome da categoria.');
      return;
    }

    const tetoCentavosLimpo = (() => {
      const limpo = tetoInput.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
      const parsed = parseFloat(limpo);
      return isNaN(parsed) || parsed < 0 ? 0 : Math.round(parsed * 100);
    })();

    const dadosCategoria: CategoriaMeta = {
      id: categoriaEmEdicao ? categoriaEmEdicao.id : nomeTrim,
      nome: nomeTrim,
      icone: icone || '🏷️',
      imagemUrl: imagemUrl.trim() || undefined,
      tetoEstimadoCentavos: tetoCentavosLimpo,
      divisaoPadrao: '100% Pessoal',
      descricao: descricao.trim() || 'Despesa pessoal',
      isFixo,
    };

    let novas: CategoriaMeta[];
    if (categoriaEmEdicao) {
      novas = categorias.map((c) => (c.id === categoriaEmEdicao.id ? dadosCategoria : c));
    } else {
      // Verifica se id já existe
      if (categorias.some((c) => c.nome.toLowerCase() === nomeTrim.toLowerCase())) {
        setErro('Já existe uma categoria individual com este nome.');
        return;
      }
      novas = [...categorias, dadosCategoria];
    }

    await onSalvarCategorias(novas);
    setModalFormAberta(false);
    setCategoriaEmEdicao(null);
  };

  const handleExcluir = async (categoriaId: string) => {
    if (categorias.length <= 1) {
      alert('Você deve manter pelo menos uma categoria individual.');
      return;
    }
    const catAlvo = categorias.find((c) => c.id === categoriaId);
    const confirmou = window.confirm(
      `Deseja realmente remover a categoria individual "${catAlvo?.nome || categoriaId}"?`
    );
    if (!confirmou) return;

    const novas = categorias.filter((c) => c.id !== categoriaId);
    await onSalvarCategorias(novas);
  };

  const handleRestaurarPadroes = async () => {
    await onSalvarCategorias(CATEGORIAS_PADRAO_INDIVIDUAIS);
    setConfirmandoReset(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
    >
      <div className="bg-white dark:bg-[#161f2e] w-full max-w-[720px] rounded-2xl shadow-2xl overflow-hidden my-auto border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-slate-50 dark:from-blue-950/40 dark:to-slate-900/60 border-b border-blue-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[22px]">category</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Categorias do Espaço Individual
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[11px] font-bold border border-transparent dark:border-blue-800/40">
                  Cofre Pessoal
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Personalize os tipos de despesas, tetos mensais e ícones exclusivos para seu controle individual
              </p>
            </div>
          </div>
          <button
            onClick={onFechar}
            type="button"
            className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition-colors shadow-sm cursor-pointer border border-slate-200 dark:border-slate-700"
            title="Fechar"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Top Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-blue-50/60 dark:bg-blue-950/30 p-3.5 rounded-xl border border-blue-100 dark:border-blue-900/40">
            <div>
              <span className="text-xs font-bold text-blue-950 dark:text-blue-200 block">
                {categorias.length} Categorias Pessoais Ativas
              </span>
              <span className="text-[11px] text-blue-700 dark:text-blue-300">
                Estas categorias aparecem ao lançar compras no seu cofre privado.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAbrirNova}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>Nova Categoria</span>
              </button>
              {confirmandoReset ? (
                <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] text-slate-600 dark:text-slate-300 px-1 font-semibold">Restaurar padrões?</span>
                  <button
                    type="button"
                    onClick={handleRestaurarPadroes}
                    className="px-2 py-0.5 rounded text-[11px] bg-red-600 text-white font-bold cursor-pointer"
                  >
                    Sim
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmandoReset(false)}
                    className="px-2 py-0.5 rounded text-[11px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                  >
                    Não
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmandoReset(true)}
                  className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                  title="Restaurar categorias padrão sugeridas"
                >
                  <span className="material-symbols-outlined text-[15px]">restart_alt</span>
                  <span className="hidden sm:inline">Restaurar Padrão</span>
                </button>
              )}
            </div>
          </div>

          {/* List of categories */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {categorias.map((cat) => {
              const gasto = gastosPorCategoria[cat.id] ?? 0;
              const perc = cat.tetoEstimadoCentavos > 0
                ? Math.round((gasto / cat.tetoEstimadoCentavos) * 100)
                : 0;

              return (
                <div
                  key={cat.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-xs transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                          <CategoryIconOrImage
                            icone={cat.icone}
                            imagemUrl={cat.imagemUrl}
                            nome={cat.nome}
                            size="md"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                              {cat.nome}
                            </h3>
                            {cat.imagemUrl && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                Foto CDN
                              </span>
                            )}
                            {cat.isFixo && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                Fixa
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                            {cat.descricao || 'Despesa pessoal'}
                          </p>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleAbrirEditar(cat)}
                          className="w-7 h-7 rounded-lg text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                          title="Editar categoria"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExcluir(cat.id)}
                          className="w-7 h-7 rounded-lg text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                          title="Excluir categoria"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    </div>

                    {/* Teto & Gasto do mês */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/80 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400">
                        Gasto no mês: <strong className="text-slate-800 dark:text-slate-200">{formatarBRL(gasto)}</strong>
                      </span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        Teto: {formatarBRL(cat.tetoEstimadoCentavos)}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1.5">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          perc > 100 ? 'bg-red-500' : perc > 80 ? 'bg-amber-500' : 'bg-blue-600'
                        }`}
                        style={{ width: `${Math.min(perc, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-900/70 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Categorias salvas sincronizam com seu perfil pessoal
          </span>
          <button
            type="button"
            onClick={onFechar}
            className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs border border-transparent dark:border-slate-700"
          >
            Concluir
          </button>
        </div>
      </div>

      {/* Modal / Dialog de Criar / Editar Categoria */}
      {modalFormAberta && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
        >
          <div className="bg-white dark:bg-[#161f2e] w-full max-w-[480px] rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-scaleUp">
            <div className="px-5 py-4 bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[18px]">
                  {categoriaEmEdicao ? 'edit' : 'add_circle'}
                </span>
                <span>{categoriaEmEdicao ? 'Editar Categoria Individual' : 'Nova Categoria Individual'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setModalFormAberta(false)}
                className="w-7 h-7 rounded-full text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSalvarForm} className="p-5 space-y-4">
              {erro && (
                <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  <span>{erro}</span>
                </div>
              )}

              {/* Nome */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nome da Categoria <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Cursos Tech, Skincare, Jogos Steam..."
                  className="w-full h-9 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>

              {/* Ícone Emoji & Seletor Rápido */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Ícone / Emoji
                </label>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/50 flex items-center justify-center text-xl shrink-0">
                    {icone}
                  </div>
                  <input
                    type="text"
                    value={icone}
                    onChange={(e) => setIcone(e.target.value)}
                    maxLength={4}
                    className="w-16 h-9 px-2 text-center text-base rounded-lg bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <div className="flex-1 flex items-center gap-1 overflow-x-auto pb-0.5">
                    {EMOJIS_SUGERIDOS_INDIVIDUAIS.map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => setIcone(em)}
                        className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                          icone === em ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Imagem da Categoria (URL Direta da sua CDN) */}
              <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-blue-600 dark:text-blue-400">image</span>
                    <span>Imagem da Categoria (URL Direta da sua CDN)</span>
                  </label>
                  {imagemUrl && (
                    <button
                      type="button"
                      onClick={() => setImagemUrl('')}
                      className="text-[11px] font-semibold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                    >
                      Remover Imagem
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <CategoryIconOrImage
                    icone={icone}
                    imagemUrl={imagemUrl}
                    nome={nome || 'Prévia'}
                    size="lg"
                    className="shrink-0"
                  />
                  <div className="flex-1 flex flex-col gap-1 min-w-0">
                    <input
                      type="url"
                      value={imagemUrl}
                      onChange={(e) => setImagemUrl(e.target.value)}
                      placeholder="https://sua-cdn.com/categorias/jogos.png"
                      className="w-full h-9 px-3 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-900/60 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      {imagemUrl.trim()
                        ? 'Exibindo imagem da sua CDN (o emoji ao lado é usado como fallback se a imagem falhar).'
                        : 'Cole o link direto da imagem hospedada na sua CDN (ex: S3, Cloudinary, Imgur, CDN própria).'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Teto Estimado R$ */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Teto Estimado Mensal (R$)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-400 dark:text-slate-500 font-semibold text-xs">R$</span>
                  <input
                    type="text"
                    value={tetoInput}
                    onChange={(e) => setTetoInput(e.target.value)}
                    placeholder="300,00"
                    className="w-full h-9 pl-9 pr-3 rounded-lg bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white tabular-nums focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  Ajuda a monitorar seus limites pessoais no mês.
                </span>
              </div>

              {/* Descrição */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Descrição / Finalidade
                </label>
                <input
                  type="text"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex: Livros técnicos e plataformas de estudo"
                  className="w-full h-9 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              {/* Categoria Fixa / Recorrente */}
              <label className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFixo}
                  onChange={(e) => setIsFixo(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                    Gasto Recorrente / Fixo
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                    Marque se esta categoria se repete todo mês (ex: assinaturas, plano individual).
                  </span>
                </div>
              </label>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalFormAberta(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer border border-transparent dark:border-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  {categoriaEmEdicao ? 'Salvar Categoria' : 'Criar Categoria'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
