import { db } from './db';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

async function hashPassword(password: string, salt?: string) {
  const encoder = new TextEncoder();
  const actualSalt = salt 
    ? new Uint8Array(salt.split(',').map(Number))
    : crypto.getRandomValues(new Uint8Array(16));
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']
  );
  
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: actualSalt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  
  const hashArray = Array.from(new Uint8Array(derivedBits));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  const saltStr = Array.from(actualSalt).join(',');
  
  return { hash: hashHex, salt: saltStr };
}

export async function registerUser(name: string, email: string, password: string) {
  if (password.length < 6) {
    return { success: false, message: 'Senha deve ter no mínimo 6 caracteres' };
  }

  const existing = await db.users.get(email);
  if (existing) {
    return { success: false, message: 'Email já cadastrado' };
  }

  const { hash, salt } = await hashPassword(password);
  await db.users.put({
    username: email,
    passwordHash: hash,
    salt,
    name,
    email,
    role: 'user',
    createdAt: new Date().toISOString(),
  });

  return { success: true, message: 'Cadastro realizado com sucesso' };
}

export async function authenticateUser(email: string, password: string) {
  const user = await db.users.get(email);
  
  if (!user) {
    return { success: false, message: 'Email não encontrado' };
  }

  const { hash } = await hashPassword(password, user.salt);
  
  if (hash !== user.passwordHash) {
    return { success: false, message: 'Senha incorreta' };
  }

  return {
    success: true,
    user: { id: user.username, name: user.name, email: user.email, role: user.role } satisfies AuthenticatedUser,
  };
}

export async function ensureAdminUser() {
  if (!import.meta.env.DEV) {
    return;
  }

  const admin = await db.users.get('admin@datafin.com');
  if (!admin) {
    const { hash, salt } = await hashPassword('admin123');
    await db.users.put({
      username: 'admin@datafin.com',
      passwordHash: hash,
      salt,
      name: 'Administrador',
      email: 'admin@datafin.com',
      role: 'admin',
      createdAt: new Date().toISOString(),
    });
  }
}

export async function updateUserProfile(
  email: string,
  updates: Pick<AuthenticatedUser, 'name' | 'email'>,
): Promise<{ success: boolean; message?: string; user?: AuthenticatedUser }> {
  const user = await db.users.get(email);
  if (!user) {
    return { success: false, message: 'Usuário não encontrado' };
  }

  if (updates.email !== email) {
    const existing = await db.users.get(updates.email);
    if (existing) {
      return { success: false, message: 'Email já cadastrado' };
    }
  }

  const nextUser = {
    ...user,
    username: updates.email,
    email: updates.email,
    name: updates.name,
  };

  if (updates.email !== email) {
    await db.users.delete(email);
  }

  await db.users.put(nextUser);

  return {
    success: true,
    user: {
      id: nextUser.username,
      name: nextUser.name,
      email: nextUser.email,
      role: nextUser.role,
    },
  };
}
