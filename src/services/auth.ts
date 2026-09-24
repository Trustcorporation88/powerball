import { deleteUser, getUser, saveUser } from "./db";
import { apiFetch, isRemote, setToken } from "./apiClient";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface AuthResult {
  success: boolean;
  message?: string;
  user?: AuthenticatedUser;
}

function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

/* ------------------------------------------------------------------ */
/* Local (IndexedDB) — usado quando VITE_API_URL não está configurado  */
/* ------------------------------------------------------------------ */

async function hashPassword(password: string, salt?: string) {
  const encoder = new TextEncoder();
  const actualSalt = salt
    ? new Uint8Array(salt.split(",").map(Number))
    : crypto.getRandomValues(new Uint8Array(16));

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  const derivedBits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: actualSalt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    256,
  );

  const hashArray = Array.from(new Uint8Array(derivedBits));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  const saltStr = Array.from(actualSalt).join(",");

  return { hash: hashHex, salt: saltStr };
}

async function localRegister(name: string, email: string, password: string): Promise<AuthResult> {
  if (password.length < 6) {
    return { success: false, message: "Senha deve ter no mínimo 6 caracteres" };
  }

  const chave = normalizarEmail(email);
  const existing = await getUser(chave);
  if (existing) {
    return { success: false, message: "Email já cadastrado" };
  }

  const { hash, salt } = await hashPassword(password);
  await saveUser({
    username: chave,
    passwordHash: hash,
    salt,
    name,
    email: chave,
    role: "user",
    createdAt: new Date().toISOString(),
  });

  return { success: true, message: "Cadastro realizado com sucesso" };
}

async function localAuthenticate(email: string, password: string): Promise<AuthResult> {
  const user = await getUser(normalizarEmail(email));
  if (!user) {
    return { success: false, message: "Email não encontrado" };
  }

  const { hash } = await hashPassword(password, user.salt);
  if (hash !== user.passwordHash) {
    return { success: false, message: "Senha incorreta" };
  }

  return {
    success: true,
    user: { id: user.username, name: user.name, email: user.email, role: user.role },
  };
}

async function localUpdateProfile(
  email: string,
  updates: Pick<AuthenticatedUser, "name" | "email">,
): Promise<AuthResult> {
  const user = await getUser(email);
  if (!user) {
    return { success: false, message: "Usuário não encontrado" };
  }

  if (updates.email !== email) {
    const existing = await getUser(updates.email);
    if (existing) {
      return { success: false, message: "Email já cadastrado" };
    }
  }

  const nextUser = {
    ...user,
    username: updates.email,
    email: updates.email,
    name: updates.name,
  };

  if (updates.email !== email) {
    await deleteUser(email);
  }

  await saveUser(nextUser);

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

/* ------------------------------------------------------------------ */
/* Remoto (API/Railway) — usado quando VITE_API_URL está configurado   */
/* ------------------------------------------------------------------ */

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

async function remoteRegister(name: string, email: string, password: string): Promise<AuthResult> {
  try {
    const data = await apiFetch<{ token: string; user: AuthenticatedUser }>("/auth/register", {
      method: "POST",
      body: { name, email: normalizarEmail(email), password },
    });
    setToken(data.token);
    return { success: true, user: data.user };
  } catch (error) {
    return { success: false, message: errorMessage(error, "Erro ao cadastrar") };
  }
}

async function remoteAuthenticate(email: string, password: string): Promise<AuthResult> {
  try {
    const data = await apiFetch<{ token: string; user: AuthenticatedUser }>("/auth/login", {
      method: "POST",
      body: { email: normalizarEmail(email), password },
    });
    setToken(data.token);
    return { success: true, user: data.user };
  } catch (error) {
    return { success: false, message: errorMessage(error, "E-mail ou senha inválidos") };
  }
}

async function remoteUpdateProfile(
  updates: Pick<AuthenticatedUser, "name" | "email">,
): Promise<AuthResult> {
  try {
    const data = await apiFetch<{ user: AuthenticatedUser }>("/auth/profile", {
      method: "PUT",
      body: updates,
    });
    return { success: true, user: data.user };
  } catch (error) {
    return { success: false, message: errorMessage(error, "Não foi possível salvar o perfil") };
  }
}

/* ------------------------------------------------------------------ */
/* Recuperação de senha — só existe com a API: a conta local mora no   */
/* navegador e não tem e-mail verificado para onde mandar o link.      */
/* ------------------------------------------------------------------ */

export async function solicitarRecuperacaoSenha(email: string): Promise<AuthResult> {
  if (!isRemote()) {
    return {
      success: false,
      message: "Sua conta está só neste navegador e não pode ser recuperada por e-mail.",
    };
  }

  try {
    const data = await apiFetch<{ message: string }>("/auth/forgot-password", {
      method: "POST",
      body: { email: normalizarEmail(email) },
    });
    return { success: true, message: data.message };
  } catch (error) {
    return { success: false, message: errorMessage(error, "Não foi possível pedir o link agora") };
  }
}

export async function redefinirSenha(token: string, password: string): Promise<AuthResult> {
  try {
    const data = await apiFetch<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: { token, password },
    });
    return { success: true, message: data.message };
  } catch (error) {
    return { success: false, message: errorMessage(error, "Não foi possível trocar a senha") };
  }
}

/* ------------------------------------------------------------------ */
/* API pública (escolhe local ou remoto)                               */
/* ------------------------------------------------------------------ */

export async function registerUser(name: string, email: string, password: string): Promise<AuthResult> {
  return isRemote() ? remoteRegister(name, email, password) : localRegister(name, email, password);
}

export async function authenticateUser(email: string, password: string): Promise<AuthResult> {
  return isRemote() ? remoteAuthenticate(email, password) : localAuthenticate(email, password);
}

export async function updateUserProfile(
  email: string,
  updates: Pick<AuthenticatedUser, "name" | "email">,
): Promise<AuthResult> {
  return isRemote() ? remoteUpdateProfile(updates) : localUpdateProfile(email, updates);
}
