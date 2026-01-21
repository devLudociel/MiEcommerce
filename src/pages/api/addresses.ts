import type { APIRoute } from 'astro';
import { FieldValue, type CollectionReference } from 'firebase-admin/firestore';
import { getAdminAuth, getAdminDb } from '../../lib/firebase-admin';

// Simple console logger for API routes (avoids import issues)
const logger = {
  info: (msg: string, data?: any) => console.log(`[INFO] ${msg}`, data || ''),
  warn: (msg: string, data?: any) => console.warn(`[WARN] ${msg}`, data || ''),
  error: (msg: string, error?: any) => console.error(`[ERROR] ${msg}`, error || ''),
};

const NO_STORE_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  Pragma: 'no-cache',
  Expires: '0',
};

type AddressPayload = {
  label?: string;
  fullName: string;
  phone?: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  zip?: string;
  country: string;
  isDefaultShipping?: boolean;
  isDefaultBilling?: boolean;
  street?: string;
  number?: string;
  floor?: string;
  apartment?: string;
  locality?: string;
  notes?: string;
};

type AuthResult =
  | { ok: true; uid: string }
  | {
      ok: false;
      response: Response;
    };

function normalizeString(value: unknown): string | undefined {
  return typeof value === 'string' ? value.trim() : undefined;
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined)) as T;
}

function sanitizeAddress(body: unknown): AddressPayload | null {
  if (!body || typeof body !== 'object') return null;
  const raw = body as Record<string, unknown>;
  const payload: AddressPayload = {
    label: normalizeString(raw.label),
    fullName: normalizeString(raw.fullName) ?? '',
    phone: normalizeString(raw.phone),
    line1: normalizeString(raw.line1) ?? '',
    line2: normalizeString(raw.line2),
    street: normalizeString(raw.street),
    number: normalizeString(raw.number),
    floor: normalizeString(raw.floor),
    apartment: normalizeString(raw.apartment),
    locality: normalizeString(raw.locality),
    city: normalizeString(raw.city) ?? '',
    state: normalizeString(raw.state),
    zip: normalizeString(raw.zip),
    country: normalizeString(raw.country) ?? 'ES',
    notes: normalizeString(raw.notes),
    isDefaultShipping: typeof raw.isDefaultShipping === 'boolean' ? raw.isDefaultShipping : false,
    isDefaultBilling: typeof raw.isDefaultBilling === 'boolean' ? raw.isDefaultBilling : false,
  };

  return stripUndefined(payload);
}

async function requireAuth(request: Request): Promise<AuthResult> {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized - Authentication required' }), {
        status: 401,
        headers: NO_STORE_HEADERS,
      }),
    };
  }

  const idToken = authHeader.replace('Bearer ', '').trim();
  try {
    const decodedToken = await getAdminAuth().verifyIdToken(idToken);
    return { ok: true, uid: decodedToken.uid };
  } catch (error) {
    logger.error('[addresses] Invalid token:', error);
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized - Invalid token' }), {
        status: 401,
        headers: NO_STORE_HEADERS,
      }),
    };
  }
}

async function clearDefaultFlags(
  collectionRef: CollectionReference,
  flags: Array<'isDefaultShipping' | 'isDefaultBilling'>,
  excludeId?: string
) {
  if (flags.length === 0) return;
  const updates = new Map<string, Record<string, boolean>>();

  for (const flag of flags) {
    const snap = await collectionRef.where(flag, '==', true).get();
    for (const doc of snap.docs) {
      if (excludeId && doc.id === excludeId) continue;
      const current = updates.get(doc.id) ?? {};
      current[flag] = false;
      updates.set(doc.id, current);
    }
  }

  if (updates.size === 0) return;
  const batch = collectionRef.firestore.batch();
  for (const [docId, data] of updates.entries()) {
    batch.update(collectionRef.doc(docId), data);
  }
  await batch.commit();
}

export const GET: APIRoute = async ({ request }) => {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const db = getAdminDb();
    const collectionRef = db.collection('users').doc(auth.uid).collection('addresses');
    const snap = await collectionRef.get();
    const addresses = snap.docs.map((doc) => {
      const data = doc.data() as Record<string, unknown>;
      const { createdAt, updatedAt, userId, ...rest } = data;
      return { id: doc.id, ...rest };
    });

    return new Response(JSON.stringify({ addresses }), {
      status: 200,
      headers: NO_STORE_HEADERS,
    });
  } catch (error) {
    logger.error('[addresses] Error fetching addresses:', error);
    return new Response(
      JSON.stringify({
        error: 'Error al obtener direcciones',
        details: import.meta.env.DEV ? (error instanceof Error ? error.message : undefined) : undefined,
      }),
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
};

export const POST: APIRoute = async ({ request }) => {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json().catch(() => null);
    if (body && typeof body === 'object') {
      const raw = body as Record<string, unknown>;
      if ('id' in raw || 'userId' in raw) {
        return new Response(JSON.stringify({ error: 'Client-controlled id is not allowed' }), {
          status: 400,
          headers: NO_STORE_HEADERS,
        });
      }
    }

    const payload = sanitizeAddress(body);
    if (!payload) {
      return new Response(JSON.stringify({ error: 'Invalid address payload' }), {
        status: 400,
        headers: NO_STORE_HEADERS,
      });
    }

    const db = getAdminDb();
    const collectionRef = db.collection('users').doc(auth.uid).collection('addresses');

    const flagsToClear: Array<'isDefaultShipping' | 'isDefaultBilling'> = [];
    if (payload.isDefaultShipping) flagsToClear.push('isDefaultShipping');
    if (payload.isDefaultBilling) flagsToClear.push('isDefaultBilling');
    await clearDefaultFlags(collectionRef, flagsToClear);

    const docRef = collectionRef.doc();
    await docRef.create({
      ...payload,
      id: docRef.id,
      userId: auth.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return new Response(JSON.stringify({ address: { id: docRef.id, ...payload } }), {
      status: 201,
      headers: NO_STORE_HEADERS,
    });
  } catch (error) {
    const errorCode =
      typeof error === 'object' && error && 'code' in error ? String((error as any).code) : '';
    if (errorCode === '6' || errorCode === 'already-exists') {
      return new Response(JSON.stringify({ error: 'Address already exists' }), {
        status: 409,
        headers: NO_STORE_HEADERS,
      });
    }
    logger.error('[addresses] Error creating address:', error);
    return new Response(
      JSON.stringify({
        error: 'Error al crear dirección',
        details: import.meta.env.DEV ? (error instanceof Error ? error.message : undefined) : undefined,
      }),
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
};
