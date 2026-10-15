import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Compra, CoupleSpace, FechamentoMensal, UserProfile } from '../types';

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
