// Web Crypto API utilities for AES-GCM encryption of private keys
// Requires secure context (HTTPS or localhost)

function base64Encode(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
}

function base64Decode(str: string): ArrayBuffer {
  const binary = atob(str)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer as ArrayBuffer
}

export function generateSalt(): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(16)) as Uint8Array<ArrayBuffer>
}

export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encryptPrivateKey(
  privateKey: string,
  cryptoKey: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const enc = new TextEncoder()
  const iv = crypto.getRandomValues(new Uint8Array(12)) as Uint8Array<ArrayBuffer>
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    enc.encode(privateKey)
  )
  return {
    ciphertext: base64Encode(cipherBuffer),
    iv: base64Encode(iv.buffer as ArrayBuffer),
  }
}

export async function decryptPrivateKey(
  ciphertext: string,
  iv: string,
  cryptoKey: CryptoKey
): Promise<string> {
  const dec = new TextDecoder()
  const plainBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64Decode(iv) },
    cryptoKey,
    base64Decode(ciphertext)
  )
  return dec.decode(plainBuffer)
}

// Derive a separate hash for password verification
export async function hashPassword(password: string, salt: Uint8Array): Promise<string> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  )
  return base64Encode(bits)
}

export function isWebCryptoAvailable(): boolean {
  return typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined'
}
