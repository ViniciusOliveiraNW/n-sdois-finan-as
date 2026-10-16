import React, { useState, useEffect, useMemo } from 'react';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { auth } from './firebase';
import { Compra, CoupleSpace, FechamentoMensal, PagamentoAcerto, UserProfile, UsuarioId } from './types';
import {
  getPerfilUsuario,
  salvarPerfilUsuario,
  ouvirEspacoCasal,
  ouvirCompras,
  salvarCompraFirestore,
  cancelarParcelasFirestore,
  deletarFechamentoFirestore,
  ouvirFechamentos,
  salvarFechamentoFirestore,
} from './services/firebaseService';
import { gerarLancamentosDoMes } from './calculations/parcelas';
import { calcularAcertoMensal } from './calculations/acertoMensal';
import { calcularRankingCategorias } from './calculations/rankingCategorias';
import { AbaNavegacao, Header } from './components/Header';
import { ResumoMensalView } from './components/ResumoMensalView';
import { LancamentosView } from './components/LancamentosView';
import { FechamentosView } from './components/FechamentosView';
import { CategoriasView } from './components/CategoriasView';
import { ModalCompra } from './components/ModalCompra';
import { ModalAcerto } from './components/ModalAcerto';
import { ModalEspacoCasal } from './components/ModalEspacoCasal';
import { ModalConfirmacao } from './components/ModalConfirmacao';
import { AuthScreen } from './components/AuthScreen';
import { CoupleSetupScreen } from './components/CoupleSetupScreen';
import { OfflineIndicator } from './components/OfflineIndicator';
import { Footer } from './components/Footer';

export default function App() {
  // 1. Estado de Autenticação e Perfil Firebase
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [carregandoAuth, setCarregandoAuth] = useState(true);

  // 2. Espaço do Casal e Dados em Tempo Real (Sem dados simulados fixos)
  const [couple, setCouple] = useState<CoupleSpace | null>(null);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [fechamentos, setFechamentos] = useState<FechamentoMensal[]>([]);

  // 3. Mês e Visão
  const [mesSelecionado, setMesSelecionado] = useState<string>(() => {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    return `${ano}-${mes}`;
  });
  const [visao, setVisao] = useState<'casal' | 'meus'>('casal');
  const [abaAtiva, setAbaAtiva] = useState<AbaNavegacao>('resumo-mensal');

  // 4. Modais
  const [modalCompraAberta, setModalCompraAberta] = useState(false);
  const [compraEmEdicao, setCompraEmEdicao] = useState<Compra | null>(null);
  const [modalAcertoAberta, setModalAcertoAberta] = useState(false);
  const [modalEspacoAberta, setModalEspacoAberta] = useState(false);

  // Modal de confirmação para cancelamento seguro de parcelas
  const [confirmacao, setConfirmacao] = useState<{
    aberto: boolean;
    titulo: string;
    mensagem: string;
    detalhe?: string;
    onConfirmar: () => void;
  }>({
    aberto: false,
    titulo: '',
    mensagem: '',
    onConfirmar: () => {},
  });

  // Listener de Auth do Firebase
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setAuthUser(user);
      if (user) {
        try {
          let perfil = await getPerfilUsuario(user.uid);
          if (!perfil) {
            perfil = {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || user.email?.split('@')[0] || 'Você',
              photoURL: user.photoURL || undefined,
              createdAt: new Date().toISOString(),
            };
            await salvarPerfilUsuario(perfil);
          }
          setUserProfile(perfil);
        } catch (e) {
          console.error('Erro ao buscar perfil do usuário:', e);
        }
      } else {
        setUserProfile(null);
        setCouple(null);
        setCompras([]);
        setFechamentos([]);
      }
      setCarregandoAuth(false);
    });

    return () => unsub();
  }, []);

  // Listeners em tempo real do Firestore para o casal
  useEffect(() => {
    if (!userProfile?.coupleId) {
      setCouple(null);
      setCompras([]);
      setFechamentos([]);
      return;
    }

    const coupleId = userProfile.coupleId;

    const unsubCouple = ouvirEspacoCasal(coupleId, (coupleData) => {
      setCouple(coupleData);
    });

    const unsubCompras = ouvirCompras(coupleId, (comprasData) => {
      setCompras(comprasData);
    });

    const unsubFechamentos = ouvirFechamentos(coupleId, (fechamentosData) => {
      setFechamentos(fechamentosData);
    });

    return () => {
      unsubCouple();
      unsubCompras();
      unsubFechamentos();
    };
  }, [userProfile?.coupleId]);

  const recarregarPerfil = async () => {
    if (authUser) {
      const perfil = await getPerfilUsuario(authUser.uid);
      setUserProfile(perfil);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  // Nome do usuário ativo para a sessão
  const usuarioNome = userProfile?.displayName || authUser?.displayName || 'Você';

  // Cálculos derivados em tempo real a partir das compras do Firestore
  const todosLancamentosDoMes = useMemo(() => {
    return gerarLancamentosDoMes(compras, mesSelecionado, authUser?.uid || 'user');
  }, [compras, mesSelecionado, authUser?.uid]);

  const lancamentosVisao = useMemo(() => {
    if (visao === 'meus' && authUser) {
      return todosLancamentosDoMes.filter(
        (l) =>
          l.pagoPorUid === authUser.uid ||
          l.pagoPor === usuarioNome ||
          l.pagoPor === userProfile?.displayName
      );
    }
    return todosLancamentosDoMes;
  }, [todosLancamentosDoMes, visao, authUser, usuarioNome, userProfile?.displayName]);

  const resumoAcerto = useMemo(() => {
    return calcularAcertoMensal(todosLancamentosDoMes, mesSelecionado, couple);
  }, [todosLancamentosDoMes, mesSelecionado, couple]);

  const ranking = useMemo(() => {
    return calcularRankingCategorias(lancamentosVisao);
  }, [lancamentosVisao]);

  const fechamentoAtual = useMemo(() => {
    return fechamentos.find((f) => f.mesReferencia === mesSelecionado);
  }, [fechamentos, mesSelecionado]);

  // Handlers de Negócio
  const handleAbrirNovaCompra = () => {
    setCompraEmEdicao(null);
    setModalCompraAberta(true);
  };

  const handleEditarCompra = (compraId: string) => {
    const compra = compras.find((c) => c.id === compraId);
    if (!compra) return;

    // Regra de autoria: apenas o autor do cadastro pode editar!
    const autorEhAtual =
      compra.cadastradoPorUid === authUser?.uid ||
      compra.cadastradoPor === usuarioNome ||
      compra.cadastradoPor === userProfile?.displayName;

    if (!autorEhAtual) {
      alert(
        `Ação negada: Este lançamento foi cadastrado por ${
          compra.cadastradoPorNome || compra.cadastradoPor || 'outro parceiro'
        }. Somente o autor pode editá-lo.`
      );
      return;
    }

    setCompraEmEdicao(compra);
    setModalCompraAberta(true);
  };

  const handleSalvarCompra = async (compraSalva: Compra) => {
    if (!couple) return;
    try {
      await salvarCompraFirestore(couple.id, compraSalva);
    } catch (e) {
      console.error('Erro ao salvar compra no Firestore:', e);
      alert('Erro ao salvar no banco de dados.');
    }
  };

  const handleRemoverCompra = (compraId: string, numeroParcela: number) => {
    const compra = compras.find((c) => c.id === compraId);
    if (!compra || !couple) return;

    // Regra de autoria: apenas o autor do cadastro pode cancelar parcelas
    const autorEhAtual =
      compra.cadastradoPorUid === authUser?.uid ||
      compra.cadastradoPor === usuarioNome ||
      compra.cadastradoPor === userProfile?.displayName;

    if (!autorEhAtual) {
      alert(
        `Ação negada: Este lançamento foi cadastrado por ${
          compra.cadastradoPorNome || compra.cadastradoPor || 'outro parceiro'
        }. Somente o autor pode cancelá-lo.`
      );
      return;
    }

    const novoLimiteAtivo = numeroParcela - 1;
    const ehPrimeiraParcela = numeroParcela === 1;

    setConfirmacao({
      aberto: true,
      titulo: ehPrimeiraParcela ? 'Cancelar compra inteira?' : 'Cancelar parcelas futuras?',
      mensagem: ehPrimeiraParcela
        ? `Deseja cancelar todas as parcelas de "${compra.nome}"? O registro histórico será mantido com limite zero.`
        : `Deseja cancelar a parcela ${numeroParcela} e as posteriores de "${compra.nome}"?`,
      detalhe: `As parcelas anteriores (1 até ${novoLimiteAtivo}) permanecerão ativas e inalteradas nos meses históricos, sem redistribuição de centavos.`,
      onConfirmar: async () => {
        try {
          await cancelarParcelasFirestore(couple.id, compraId, novoLimiteAtivo);
        } catch (e) {
          console.error('Erro ao cancelar parcela no Firestore:', e);
          alert('Erro ao atualizar parcelas no banco.');
        }
        setConfirmacao((prev) => ({ ...prev, aberto: false }));
      },
    });
  };

  const handleFecharMes = async () => {
    if (!couple) return;
    if (resumoAcerto.totalCasalCentavos === 0) {
      alert('Não há despesas no mês para realizar fechamento.');
      return;
    }

    const novoFechamento: FechamentoMensal = {
      id: `fechamento-${mesSelecionado}-${Date.now()}`,
      coupleId: couple.id,
      mesReferencia: mesSelecionado,
      dataFechamento: new Date().toISOString().slice(0, 10),
      conciliadoPor: usuarioNome,
      conciliadoPorUid: authUser?.uid,
      conciliadoPorNome: usuarioNome,
      totalCompartilhadoCentavos: resumoAcerto.totalCompartilhadoCentavos,
      totalPagoP1Centavos: resumoAcerto.totalPagoP1Centavos,
      totalPagoP2Centavos: resumoAcerto.totalPagoP2Centavos,
      saldoOriginalCentavos: resumoAcerto.saldoCentavos,
      devedor: resumoAcerto.devedor,
      devedorUid: resumoAcerto.devedorUid,
      devedorNome: resumoAcerto.devedorNome,
      credor: resumoAcerto.credor,
      credorUid: resumoAcerto.credorUid,
      credorNome: resumoAcerto.credorNome,
      status: resumoAcerto.valorAcertoCentavos === 0 ? 'quitado' : 'parcial',
      pagamentos: [],
    };

    try {
      await salvarFechamentoFirestore(couple.id, novoFechamento);
      setModalAcertoAberta(true);
    } catch (e) {
      console.error('Erro ao fechar mês:', e);
      alert('Erro ao registrar fechamento.');
    }
  };

  const handleDeletarFechamento = async (fechamentoId: string) => {
    if (!couple || !confirm('Tem certeza que deseja remover este registro de fechamento? Esta ação é irreversível.')) {
      return;
    }
    try {
      console.log('Tentando deletar:', couple.id, fechamentoId);
      await deletarFechamentoFirestore(couple.id, fechamentoId);
      console.log('Deletado com sucesso');
    } catch (error) {
      console.error('Erro ao remover fechamento:', error);
      alert('Erro ao remover o registro. Tente novamente.');
    }
  };


  const handleRegistrarPagamento = async (
    dadosPagamento: Omit<PagamentoAcerto, 'id'>,
    marcarComoQuitado: boolean
  ) => {
    if (!couple) return;

    const novoPag: PagamentoAcerto = {
      ...dadosPagamento,
      id: `pag-${Date.now()}`,
    };

    let fechamentoFinal: FechamentoMensal;

    if (fechamentoAtual) {
      const novosPagamentos = [...fechamentoAtual.pagamentos, novoPag];
      const totalPago = novosPagamentos.reduce((acc, p) => acc + p.valorCentavos, 0);
      const valorOriginal = Math.abs(fechamentoAtual.saldoOriginalCentavos);
      const novoStatus =
        marcarComoQuitado || totalPago >= valorOriginal ? 'quitado' : 'parcial';

      fechamentoFinal = {
        ...fechamentoAtual,
        pagamentos: novosPagamentos,
        status: novoStatus,
      };
    } else {
      fechamentoFinal = {
        id: `fechamento-${mesSelecionado}-${Date.now()}`,
        coupleId: couple.id,
        mesReferencia: mesSelecionado,
        dataFechamento: dadosPagamento.dataPagamento,
        conciliadoPor: usuarioNome,
        conciliadoPorUid: authUser?.uid,
        conciliadoPorNome: usuarioNome,
        totalCompartilhadoCentavos: resumoAcerto.totalCompartilhadoCentavos,
        totalPagoP1Centavos: resumoAcerto.totalPagoP1Centavos,
        totalPagoP2Centavos: resumoAcerto.totalPagoP2Centavos,
        saldoOriginalCentavos: resumoAcerto.saldoCentavos,
        devedor: resumoAcerto.devedor,
        devedorUid: resumoAcerto.devedorUid,
        devedorNome: resumoAcerto.devedorNome,
        credor: resumoAcerto.credor,
        credorUid: resumoAcerto.credorUid,
        credorNome: resumoAcerto.credorNome,
        status: marcarComoQuitado ? 'quitado' : 'parcial',
        pagamentos: [novoPag],
      };
    }

    try {
      await salvarFechamentoFirestore(couple.id, fechamentoFinal);
    } catch (e) {
      console.error('Erro ao registrar pagamento:', e);
      alert('Erro ao registrar pagamento no banco.');
    }
  };

  const handleQuitarResidualRetroativo = async (fechamentoId: string) => {
    if (!couple) return;
    const fech = fechamentos.find((f) => f.id === fechamentoId);
    if (!fech) return;

    const atualizado: FechamentoMensal = {
      ...fech,
      status: 'quitado',
      saldoResidualCentavos: 0,
      notaRetroativa: `${fech.notaRetroativa || ''} (Saldo residual compensado com sucesso).`,
    };

    try {
      await salvarFechamentoFirestore(couple.id, atualizado);
    } catch (e) {
      console.error('Erro ao quitar residual:', e);
      alert('Erro ao atualizar residual no banco.');
    }
  };

  // 1. Tela de Carregamento Inicial
  if (carregandoAuth) {
    return (
      <div className="min-h-screen bg-[#f8f9ff] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-[#006948]/20 border-t-[#006948] rounded-full animate-spin mb-4"></div>
        <span className="text-sm font-semibold text-slate-700">Conectando ao NósDois Finanças...</span>
      </div>
    );
  }

  // 2. Não Autenticado -> Tela de Login/Cadastro
  if (!authUser) {
    return <AuthScreen onSucesso={recarregarPerfil} />;
  }

  // 3. Autenticado mas sem Espaço do Casal -> Tela de Criação ou Afiliação
  if (!userProfile?.coupleId || !couple) {
    return (
      <CoupleSetupScreen
        user={
          userProfile || {
            uid: authUser.uid,
            email: authUser.email || '',
            displayName: authUser.displayName || 'Você',
          }
        }
        onConcluido={recarregarPerfil}
      />
    );
  }

  // 4. Aplicação Principal com Firestore Ativo e Dados Reais
  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9ff] text-[#0b1c30]">
      {/* Top Header */}
      <Header
        abaAtiva={abaAtiva}
        onSelecionarAba={setAbaAtiva}
        usuarioAtual={usuarioNome}
        couple={couple}
        onAbrirNovaCompra={handleAbrirNovaCompra}
        onAbrirEspacoModal={() => setModalEspacoAberta(true)}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main className="w-full pt-20 pb-12 px-4 sm:px-6 max-w-[1280px] mx-auto flex-1 flex flex-col">
        {abaAtiva === 'resumo-mensal' && (
          <ResumoMensalView
            mesSelecionado={mesSelecionado}
            onMudarMes={setMesSelecionado}
            visao={visao}
            onAlternarVisao={setVisao}
            usuarioAtual={usuarioNome}
            resumoAcerto={resumoAcerto}
            fechamentoAtual={fechamentoAtual}
            ranking={ranking}
            lancamentosVisao={lancamentosVisao}
            todosLancamentosDoMes={todosLancamentosDoMes}
            compras={compras}
            onAbrirModalAcerto={() => setModalAcertoAberta(true)}
            onEditarCompra={handleEditarCompra}
            onRemoverCompra={handleRemoverCompra}
            onIrParaLancamentos={() => setAbaAtiva('lancamentos')}
            onIrParaCategorias={() => setAbaAtiva('categorias')}
          />
        )}

        {abaAtiva === 'lancamentos' && (
          <LancamentosView
            mesSelecionado={mesSelecionado}
            onMudarMes={setMesSelecionado}
            visao={visao}
            onAlternarVisao={setVisao}
            usuarioAtual={usuarioNome}
            todosLancamentosDoMes={todosLancamentosDoMes}
            compras={compras}
            resumoAcerto={resumoAcerto}
            onAbrirNovaCompra={handleAbrirNovaCompra}
            onEditarCompra={handleEditarCompra}
            onRemoverCompra={handleRemoverCompra}
            onAbrirModalAcerto={() => setModalAcertoAberta(true)}
          />
        )}

        {abaAtiva === 'fechamentos-e-acertos' && (
          <FechamentosView
            mesSelecionado={mesSelecionado}
            resumoAcerto={resumoAcerto}
            fechamentos={fechamentos}
            usuarioAtual={usuarioNome}
            couple={couple}
            onAbrirModalAcerto={() => setModalAcertoAberta(true)}
            onFecharMes={handleFecharMes}
            onQuitarResidualRetroativo={handleQuitarResidualRetroativo}
            onDeletarFechamento={handleDeletarFechamento}
          />
        )}

        {abaAtiva === 'categorias' && (
          <CategoriasView
            mesSelecionado={mesSelecionado}
            lancamentosDoMes={todosLancamentosDoMes}
          />
        )}
      </main>

      {/* Footer */}
      <Footer />

      {/* Modais */}
      <ModalCompra
        aberto={modalCompraAberta}
        onFechar={() => {
          setModalCompraAberta(false);
          setCompraEmEdicao(null);
        }}
        compraEmEdicao={compraEmEdicao}
        usuarioAtual={usuarioNome}
        couple={couple}
        onSalvarCompra={handleSalvarCompra}
      />

      <ModalAcerto
        aberto={modalAcertoAberta}
        onFechar={() => setModalAcertoAberta(false)}
        resumoAcerto={resumoAcerto}
        fechamentoAtual={fechamentoAtual}
        usuarioAtual={usuarioNome}
        onRegistrarPagamento={handleRegistrarPagamento}
      />

      <ModalEspacoCasal
        aberto={modalEspacoAberta}
        onFechar={() => setModalEspacoAberta(false)}
        couple={couple}
        user={userProfile!}
        onEspacoAtualizado={recarregarPerfil}
      />

      <ModalConfirmacao
        aberto={confirmacao.aberto}
        titulo={confirmacao.titulo}
        mensagem={confirmacao.mensagem}
        detalhe={confirmacao.detalhe}
        textoBotaoConfirmar="Confirmar Cancelamento"
        onConfirmar={confirmacao.onConfirmar}
        onCancelar={() => setConfirmacao((prev) => ({ ...prev, aberto: false }))}
      />

      {/* Offline feedback indicator */}
      <OfflineIndicator />
    </div>
  );
}
