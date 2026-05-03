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

  const { db } = await import('./db');
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
  const { db } = await import('./db');
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
    user: { id: user.username, name: user.name, email: user.email },
  };
}

export async function ensureAdminUser() {
  const { db } = await import('./db');
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
