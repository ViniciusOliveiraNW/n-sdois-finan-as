import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { CategoriaMeta, Compra, CoupleSpace, FechamentoMensal, UserProfile } from '../types';
import { COMPRAS_INICIAIS, FECHAMENTOS_INICIAIS } from '../data/initialData';
import { calcularMesesParcelas } from '../calculations/parcelas';

export interface EspacoComContagem {
  space: CoupleSpace;
  purchaseCount: number;
}

export interface ResultadoRestauracao {
  totalRestauradas: number;
  duplicadasIgnoradas: number;
  quitadasIgnoradas: number;
  mensagem: string;
}

// Perfil do Usuário
export async function getPerfilUsuario(uid: string): Promise<UserProfile | null> {
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export async function salvarPerfilUsuario(perfil: UserProfile): Promise<void> {
  const path = `users/${perfil.uid}`;
  try {
    // Remove chaves com valor undefined
    const dadosLimpos = JSON.parse(JSON.stringify(perfil));
    await setDoc(doc(db, 'users', perfil.uid), dadosLimpos, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function atualizarFotoPerfil(
  uid: string,
  photoURL: string,
  displayName?: string,
  coupleId?: string
): Promise<void> {
  const urlLimpa = photoURL ? photoURL.trim() : '';
  const nomeLimpo = displayName ? displayName.trim() : '';

  // 1. Atualizar perfil no Firebase Auth
  try {
    if (auth.currentUser && auth.currentUser.uid === uid) {
      const authUpdates: { photoURL?: string; displayName?: string } = {};
      authUpdates.photoURL = urlLimpa;
      if (nomeLimpo) {
        authUpdates.displayName = nomeLimpo;
      }
      await updateProfile(auth.currentUser, authUpdates);
    }
  } catch (errAuth) {
    console.warn('Erro ao atualizar photoURL no Firebase Auth:', errAuth);
  }

  // 2. Atualizar perfil no Firestore users/{uid}
  const pathUser = `users/${uid}`;
  try {
    const userUpdates: Record<string, unknown> = {
      photoURL: urlLimpa,
    };
    if (nomeLimpo) {
      userUpdates.displayName = nomeLimpo;
    }
    await setDoc(doc(db, 'users', uid), userUpdates, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, pathUser);
  }

  // 3. Se estiver em um casal, atualizar foto no documento do casal para sincronizar com o parceiro
  if (coupleId) {
    const pathCouple = `couples/${coupleId}`;
    try {
      const coupleSnap = await getDoc(doc(db, 'couples', coupleId));
      if (coupleSnap.exists()) {
        const coupleData = coupleSnap.data() as CoupleSpace;
        const coupleUpdates: Record<string, unknown> = {};

        if (coupleData.partner1Uid === uid) {
          coupleUpdates.partner1PhotoURL = urlLimpa;
          if (nomeLimpo) coupleUpdates.partner1Name = nomeLimpo;
        } else if (coupleData.partner2Uid === uid) {
          coupleUpdates.partner2PhotoURL = urlLimpa;
          if (nomeLimpo) coupleUpdates.partner2Name = nomeLimpo;
        }

        if (Object.keys(coupleUpdates).length > 0) {
          await updateDoc(doc(db, 'couples', coupleId), coupleUpdates);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, pathCouple);
    }
  }
}

// Espaço do Casal
export function ouvirEspacoCasal(
  coupleId: string,
  onData: (couple: CoupleSpace | null) => void,
  onError?: (error: unknown) => void
) {
  const path = `couples/${coupleId}`;
  return onSnapshot(
    doc(db, 'couples', coupleId),
    (snap) => {
      if (snap.exists()) {
        onData(snap.data() as CoupleSpace);
      } else {
        onData(null);
      }
    },
    (err) => {
      if (onError) onError(err);
      handleFirestoreError(err, OperationType.GET, path);
    }
  );
}

export async function criarEspacoCasal(
  user: UserProfile,
  meuNome: string,
  nomeParceiro: string = 'Parceiro(a)'
): Promise<CoupleSpace> {
  const coupleId = `casal-${Date.now()}`;
  // Gera código amigável de 6 caracteres (letras e números não ambíguos)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let inviteCode = '';
  for (let i = 0; i < 6; i++) {
    inviteCode += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const p1Nome = meuNome.trim() || user.displayName || 'Você';
  const p2Nome = nomeParceiro.trim() || 'Parceiro(a)';

  const coupleSpace: CoupleSpace = {
    id: coupleId,
    inviteCode,
    members: [user.uid],
    partner1Uid: user.uid,
    partner1Name: p1Nome,
    partner1Email: user.email,
    partner2Name: p2Nome,
    createdAt: new Date().toISOString(),
    createdBy: user.uid,
  };

  const path = `couples/${coupleId}`;
  try {
    const dadosLimpos = JSON.parse(JSON.stringify(coupleSpace));
    await setDoc(doc(db, 'couples', coupleId), dadosLimpos);
    await salvarPerfilUsuario({
      ...user,
      displayName: p1Nome,
      coupleId,
    });
    return coupleSpace;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function afiliarComCodigo(
  user: UserProfile,
  codigoConvite: string,
  meuNome: string
): Promise<CoupleSpace> {
  const codigoLimpo = codigoConvite.trim().toUpperCase();
  const path = 'couples';

  try {
    const q = query(collection(db, 'couples'), where('inviteCode', '==', codigoLimpo));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      throw new Error(`Nenhum espaço de casal encontrado com o código "${codigoLimpo}". Verifique o código e tente novamente.`);
    }

    const coupleDoc = snapshot.docs[0];
    const coupleData = coupleDoc.data() as CoupleSpace;

    // Se o usuário já é o parceiro 1
    if (coupleData.partner1Uid === user.uid) {
      await salvarPerfilUsuario({
        ...user,
        displayName: meuNome || user.displayName || coupleData.partner1Name,
        coupleId: coupleData.id,
      });
      return coupleData;
    }

    if (coupleData.partner2Uid && coupleData.partner2Uid !== user.uid) {
      throw new Error('Este espaço de casal já possui dois parceiros afiliados.');
    }

    const nomeFinal = meuNome.trim() || user.displayName || coupleData.partner2Name || 'Parceiro(a)';
    const updatedMembers = Array.from(new Set([...coupleData.members, user.uid]));
    const updatedCouple: CoupleSpace = {
      ...coupleData,
      members: updatedMembers,
      partner2Uid: user.uid,
      partner2Name: nomeFinal,
      partner2Email: user.email,
    };

    const dadosLimpos = JSON.parse(JSON.stringify(updatedCouple));
    await setDoc(doc(db, 'couples', coupleData.id), dadosLimpos, { merge: true });
    await salvarPerfilUsuario({
      ...user,
      displayName: nomeFinal,
      coupleId: coupleData.id,
    });

    return updatedCouple;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function desafiliarEspacoCasal(user: UserProfile): Promise<void> {
  await salvarPerfilUsuario({
    ...user,
    coupleId: '',
  });
}

// Localização e recuperação de espaços vinculados ao usuário
export async function buscarEspacosDoUsuario(user: UserProfile): Promise<EspacoComContagem[]> {
  const emailLimpo = user.email ? user.email.trim().toLowerCase() : '';
  const uid = user.uid;
  const couplesRef = collection(db, 'couples');
  const foundMap = new Map<string, CoupleSpace>();

  try {
    const qMembers = query(couplesRef, where('members', 'array-contains', uid));
    const snapMembers = await getDocs(qMembers);
    snapMembers.forEach((d) => {
      foundMap.set(d.id, { id: d.id, ...d.data() } as CoupleSpace);
    });
  } catch (e) {
    console.warn('Erro ao buscar por members:', e);
  }

  if (emailLimpo) {
    try {
      const qP1 = query(couplesRef, where('partner1Email', '==', user.email));
      const snapP1 = await getDocs(qP1);
      snapP1.forEach((d) => {
        foundMap.set(d.id, { id: d.id, ...d.data() } as CoupleSpace);
      });
    } catch (e) {
      console.warn('Erro ao buscar por partner1Email:', e);
    }

    try {
      const qP2 = query(couplesRef, where('partner2Email', '==', user.email));
      const snapP2 = await getDocs(qP2);
      snapP2.forEach((d) => {
        foundMap.set(d.id, { id: d.id, ...d.data() } as CoupleSpace);
      });
    } catch (e) {
      console.warn('Erro ao buscar por partner2Email:', e);
    }
  }

  // Fallback: listar todos e checar em memória se não achou nada
  try {
    const snapAll = await getDocs(couplesRef);
    snapAll.forEach((d) => {
      const data = { id: d.id, ...d.data() } as CoupleSpace;
      const p1Email = data.partner1Email?.toLowerCase();
      const p2Email = data.partner2Email?.toLowerCase();
      const isMember =
        data.members?.includes(uid) ||
        data.partner1Uid === uid ||
        data.partner2Uid === uid;
      const emailBate =
        emailLimpo && (p1Email === emailLimpo || p2Email === emailLimpo);
      if (isMember || emailBate) {
        foundMap.set(d.id, data);
      }
    });
  } catch (e) {
    console.warn('Erro ao listar todos os casais no fallback:', e);
  }

  const resultados: EspacoComContagem[] = [];
  for (const [id, space] of foundMap.entries()) {
    let count = 0;
    try {
      const purchasesSnap = await getDocs(collection(db, 'couples', id, 'purchases'));
      count = purchasesSnap.size;
    } catch (e) {
      console.warn(`Não foi possível ler subcoleção purchases do espaço ${id}:`, e);
    }
    resultados.push({ space, purchaseCount: count });
  }

  resultados.sort((a, b) => {
    if (b.purchaseCount !== a.purchaseCount) {
      return b.purchaseCount - a.purchaseCount;
    }
    return (b.space.createdAt || '').localeCompare(a.space.createdAt || '');
  });

  return resultados;
}

export async function reconectarEspaco(user: UserProfile, coupleId: string): Promise<CoupleSpace> {
  const path = `couples/${coupleId}`;
  try {
    const coupleSnap = await getDoc(doc(db, 'couples', coupleId));
    if (!coupleSnap.exists()) {
      throw new Error(`Espaço de casal "${coupleId}" não encontrado.`);
    }

    const coupleData = { id: coupleSnap.id, ...coupleSnap.data() } as CoupleSpace;
    const currentMembers = coupleData.members || [];
    const jaEhMembro = currentMembers.includes(user.uid);

    if (!jaEhMembro) {
      const novosMembros = Array.from(new Set([...currentMembers, user.uid]));
      const userEmail = user.email?.toLowerCase();
      const updates: Record<string, unknown> = { members: novosMembros };

      if (coupleData.partner1Email?.toLowerCase() === userEmail) {
        updates.partner1Uid = user.uid;
        if (user.displayName) updates.partner1Name = user.displayName;
      } else if (coupleData.partner2Email?.toLowerCase() === userEmail) {
        updates.partner2Uid = user.uid;
        if (user.displayName) updates.partner2Name = user.displayName;
      }

      await updateDoc(doc(db, 'couples', coupleId), updates);
      coupleData.members = novosMembros;
    }

    await salvarPerfilUsuario({
      ...user,
      coupleId,
    });

    return coupleData;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export function isCriadorDoEspaco(
  space: CoupleSpace | null | undefined,
  user: UserProfile | null | undefined
): boolean {
  if (!space || !user) return false;
  if (space.createdBy && space.createdBy === user.uid) return true;
  if (space.partner1Uid && space.partner1Uid === user.uid) return true;
  if (
    space.partner1Email &&
    user.email &&
    space.partner1Email.trim().toLowerCase() === user.email.trim().toLowerCase()
  ) {
    return true;
  }
  return false;
}

export async function excluirEspacoCasal(
  coupleId: string,
  user: UserProfile
): Promise<void> {
  const path = `couples/${coupleId}`;
  try {
    const snap = await getDoc(doc(db, 'couples', coupleId));
    if (snap.exists()) {
      const data = snap.data() as CoupleSpace;
      const ehCriador = isCriadorDoEspaco(data, user);
      if (!ehCriador) {
        throw new Error('Permissão negada: apenas quem criou o espaço pode excluí-lo.');
      }
    }

    // 1. Limpar compras da subcoleção
    try {
      const purchasesSnap = await getDocs(collection(db, 'couples', coupleId, 'purchases'));
      for (const pDoc of purchasesSnap.docs) {
        await deleteDoc(doc(db, 'couples', coupleId, 'purchases', pDoc.id));
      }
    } catch (e) {
      console.warn('Erro ao limpar compras do espaço:', e);
    }

    // 2. Limpar fechamentos da subcoleção
    try {
      const closuresSnap = await getDocs(collection(db, 'couples', coupleId, 'closures'));
      for (const cDoc of closuresSnap.docs) {
        await deleteDoc(doc(db, 'couples', coupleId, 'closures', cDoc.id));
      }
    } catch (e) {
      console.warn('Erro ao limpar fechamentos do espaço:', e);
    }

    // 3. Excluir o documento do casal
    await deleteDoc(doc(db, 'couples', coupleId));

    // 4. Se o usuário estiver ativo neste espaço, desvincular do seu perfil
    if (user.coupleId === coupleId) {
      await salvarPerfilUsuario({
        ...user,
        coupleId: '',
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

export async function restaurarComprasIniciais(
  coupleId: string,
  user: UserProfile,
  p1Nome: string = 'Vinicius',
  p2Nome: string = 'Silvia'
): Promise<ResultadoRestauracao> {
  const path = `couples/${coupleId}/purchases`;
  try {
    // 1. Mapear compras existentes no Firestore para evitar duplicações
    const existingSnap = await getDocs(collection(db, 'couples', coupleId, 'purchases'));
    const existingIds = new Set<string>();
    const existingSignatures = new Set<string>();

    existingSnap.forEach((d) => {
      existingIds.add(d.id);
      const data = d.data() as Partial<Compra>;
      const nomeNorm = (data.nome || '').trim().toLowerCase();
      const dataPag = data.dataPrimeiroPagamento || '';
      const centavos = data.valorCentavos ?? Math.round((data.valor || 0) * 100);
      existingSignatures.add(`${nomeNorm}__${dataPag}__${centavos}`);
    });

    // 2. Identificar quais meses já estão com fechamento quitado
    const mesesQuitados = new Set<string>();
    for (const f of FECHAMENTOS_INICIAIS) {
      if (f.status === 'quitado') {
        mesesQuitados.add(f.mesReferencia);
      }
    }

    try {
      const closingsSnap = await getDocs(collection(db, 'couples', coupleId, 'closures'));
      closingsSnap.forEach((d) => {
        const fech = d.data() as FechamentoMensal;
        if (fech.status === 'quitado' && (!fech.saldoResidualCentavos || fech.saldoResidualCentavos === 0)) {
          mesesQuitados.add(fech.mesReferencia);
        } else if (fech.status === 'parcial' || fech.status === 'retroativo') {
          mesesQuitados.delete(fech.mesReferencia);
        }
      });
    } catch (e) {
      console.warn('Erro ao verificar fechamentos para conferência de pendências:', e);
    }

    let totalRestauradas = 0;
    let duplicadasIgnoradas = 0;
    let quitadasIgnoradas = 0;

    for (const compraBase of COMPRAS_INICIAIS) {
      // 3. Verificação de pendência: deve ter ao menos 1 parcela ativa em mês em aberto (não quitado)
      const numParcelas = compraBase.numeroDeParcelas || 1;
      const limiteAtivo = compraBase.ultimaParcelaAtiva ?? numParcelas;

      let isPendente = false;
      if (limiteAtivo > 0) {
        try {
          const mesesParcelas = calcularMesesParcelas(compraBase.dataPrimeiroPagamento, numParcelas);
          for (let i = 0; i < limiteAtivo; i++) {
            const mes = mesesParcelas[i];
            if (mes && !mesesQuitados.has(mes)) {
              isPendente = true;
              break;
            }
          }
        } catch {
          isPendente = true;
        }
      }

      if (!isPendente) {
        quitadasIgnoradas++;
        continue;
      }

      // 4. Verificação de duplicação: ignora se id ou assinatura (nome + data + valor) já existem
      const nomeNorm = (compraBase.nome || '').trim().toLowerCase();
      const centavos = compraBase.valorCentavos ?? Math.round((compraBase.valor || 0) * 100);
      const signature = `${nomeNorm}__${compraBase.dataPrimeiroPagamento}__${centavos}`;

      if (existingIds.has(compraBase.id) || existingSignatures.has(signature)) {
        duplicadasIgnoradas++;
        continue;
      }

      // 5. Salva a compra pendente não duplicada
      const compraFormatada: Compra = {
        ...compraBase,
        coupleId,
        cadastradoPorUid: user.uid,
        cadastradoPorNome: user.displayName || p1Nome,
        cadastradoPor: user.displayName || p1Nome,
        pagoPorUid: compraBase.pagoPor === 'Silvia' ? (p2Nome || 'Silvia') : user.uid,
        pagoPorNome: compraBase.pagoPor === 'Silvia' ? p2Nome : (user.displayName || p1Nome),
      };

      await salvarCompraFirestore(coupleId, compraFormatada);
      existingIds.add(compraBase.id);
      existingSignatures.add(signature);
      totalRestauradas++;
    }

    let mensagem = '';
    if (totalRestauradas > 0) {
      mensagem = `${totalRestauradas} compra(s) pendente(s) restaurada(s) com sucesso sem duplicidades!`;
      if (duplicadasIgnoradas > 0) {
        mensagem += ` (${duplicadasIgnoradas} já existente(s) ignorada(s))`;
      }
    } else if (duplicadasIgnoradas > 0) {
      mensagem = `Todas as compras pendentes já estão cadastradas no seu espaço (${duplicadasIgnoradas} verificada(s), 0 duplicadas).`;
    } else {
      mensagem = 'Nenhuma nova compra pendente identificada para restauração.';
    }

    return {
      totalRestauradas,
      duplicadasIgnoradas,
      quitadasIgnoradas,
      mensagem,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

// Compras em tempo real
export function ouvirCompras(
  coupleId: string,
  onData: (compras: Compra[]) => void,
  onError?: (error: unknown) => void
) {
  const path = `couples/${coupleId}/purchases`;
  return onSnapshot(
    collection(db, 'couples', coupleId, 'purchases'),
    (snap) => {
      const lista: Compra[] = [];
      snap.forEach((d) => {
        lista.push(d.data() as Compra);
      });
      onData(lista);
    },
    (err) => {
      if (onError) onError(err);
      handleFirestoreError(err, OperationType.LIST, path);
    }
  );
}

export async function salvarCompraFirestore(
  coupleId: string,
  compra: Compra
): Promise<void> {
  const path = `couples/${coupleId}/purchases/${compra.id}`;
  try {
    const dadosLimpos = JSON.parse(
      JSON.stringify({
        ...compra,
        coupleId,
      })
    );
    await setDoc(doc(db, 'couples', coupleId, 'purchases', compra.id), dadosLimpos);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function cancelarParcelasFirestore(
  coupleId: string,
  compraId: string,
  novoLimiteAtivo: number
): Promise<void> {
  const path = `couples/${coupleId}/purchases/${compraId}`;
  try {
    await updateDoc(doc(db, 'couples', coupleId, 'purchases', compraId), {
      ultimaParcelaAtiva: novoLimiteAtivo,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Fechamentos em tempo real
export function ouvirFechamentos(
  coupleId: string,
  onData: (fechamentos: FechamentoMensal[]) => void,
  onError?: (error: unknown) => void
) {
  const path = `couples/${coupleId}/closures`;
  return onSnapshot(
    collection(db, 'couples', coupleId, 'closures'),
    (snap) => {
      const lista: FechamentoMensal[] = [];
      snap.forEach((d) => {
        lista.push(d.data() as FechamentoMensal);
      });
      // Ordena por mês decrescente
      lista.sort((a, b) => b.mesReferencia.localeCompare(a.mesReferencia));
      onData(lista);
    },
    (err) => {
      if (onError) onError(err);
      handleFirestoreError(err, OperationType.LIST, path);
    }
  );
}

export async function salvarFechamentoFirestore(
  coupleId: string,
  fechamento: FechamentoMensal
): Promise<void> {
  const path = `couples/${coupleId}/closures/${fechamento.id}`;
  try {
    const dadosLimpos = JSON.parse(
      JSON.stringify({
        ...fechamento,
        coupleId,
      })
    );
    await setDoc(doc(db, 'couples', coupleId, 'closures', fechamento.id), dadosLimpos);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deletarFechamentoFirestore(
  coupleId: string,
  fechamentoId: string
): Promise<void> {
  const path = `couples/${coupleId}/closures/${fechamentoId}`;
  try {
    await deleteDoc(doc(db, 'couples', coupleId, 'closures', fechamentoId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Categorias do casal
export async function salvarCategoriasCasal(
  coupleId: string,
  categories: CategoriaMeta[]
): Promise<void> {
  const path = `couples/${coupleId}`;
  try {
    const dadosLimpos = JSON.parse(JSON.stringify(categories));
    await updateDoc(doc(db, 'couples', coupleId), {
      categories: dadosLimpos,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Regime de divisão padrão do casal
export async function salvarDefaultSplitCasal(
  coupleId: string,
  defaultSplit: string
): Promise<void> {
  const path = `couples/${coupleId}`;
  try {
    await updateDoc(doc(db, 'couples', coupleId), {
      defaultSplit,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
