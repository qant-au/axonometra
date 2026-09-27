// Signed plan loads for embedders (EMBEDDING.md, "Signed plans").
//
// The host's backend signs each plan with an ECDSA P-256 private key; this
// app holds only public keys, baked in at build time, so nothing secret ever
// ships to the browser and a page cannot swap in a key of its own. The signed
// message binds the plan to an expiry and the host's session token so a
// captured signature cannot be replayed later or into another session.

export const SIGNATURE_SCHEME = 'axo-plan-v1';

export type VerifyResult =
  'ok' | 'missing-signature' | 'missing-expiry' | 'expired' | 'bad-signature';

export interface SignedPlan {
  plan: string;
  signature?: string;
  /** Unix time in seconds after which the signature is refused. */
  expires?: number;
  session?: string;
}

/** The exact bytes the host signs. */
export function signedMessage(
  plan: string,
  expires: number,
  session = ''
): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(
    `${SIGNATURE_SCHEME}\n${expires}\n${session}\n${plan}`
  );
}

function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const b64 = value
    .replace(/-----[^-]+-----/g, '')
    .replace(/\s+/g, '')
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// WebCrypto wants the raw r||s form (IEEE P1363). Node's crypto.sign and
// OpenSSL emit DER by default, so accept that too rather than fail a host
// that forgot `dsaEncoding: 'ieee-p1363'`.
export function derToP1363(der: Uint8Array): Uint8Array<ArrayBuffer> | null {
  if (der[0] !== 0x30) return null;
  let offset = 2;
  const out = new Uint8Array(64);
  for (let part = 0; part < 2; part++) {
    if (der[offset] !== 0x02) return null;
    let length = der[offset + 1];
    let start = offset + 2;
    offset = start + length;
    // Strip the sign-padding zero, then left-pad to 32 bytes.
    while (length > 32 && der[start] === 0) {
      start++;
      length--;
    }
    if (length > 32) return null;
    out.set(der.subarray(start, start + length), part * 32 + (32 - length));
  }
  return out;
}

/** Split the build-time key list (comma-separated base64 SPKI or PEM). */
export function parsePublicKeys(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function importPublicKeys(keys: string[]): Promise<CryptoKey[]> {
  const imported: CryptoKey[] = [];
  for (const key of keys) {
    try {
      imported.push(
        await crypto.subtle.importKey(
          'spki',
          base64ToBytes(key),
          { name: 'ECDSA', namedCurve: 'P-256' },
          false,
          ['verify']
        )
      );
    } catch {
      console.error(
        '[axo:embed] Ignoring an embed public key that is not a P-256 SPKI key.'
      );
    }
  }
  return imported;
}

export async function verifySignedPlan(
  input: SignedPlan,
  keys: CryptoKey[],
  nowSeconds: number
): Promise<VerifyResult> {
  if (!input.signature) return 'missing-signature';
  if (typeof input.expires !== 'number' || !Number.isFinite(input.expires)) {
    return 'missing-expiry';
  }
  if (input.expires < nowSeconds) return 'expired';

  let signature: Uint8Array<ArrayBuffer>;
  try {
    signature = base64ToBytes(input.signature);
  } catch {
    return 'bad-signature';
  }
  if (signature.length !== 64) {
    const converted = derToP1363(signature);
    if (!converted) return 'bad-signature';
    signature = converted;
  }
  const message = signedMessage(input.plan, input.expires, input.session);
  for (const key of keys) {
    const ok = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      signature,
      message
    );
    if (ok) return 'ok';
  }
  return 'bad-signature';
}
