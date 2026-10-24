import { Client, Databases, Query, Users } from 'node-appwrite';

const REQUIRED_ENV = [
  'APPWRITE_ENDPOINT',
  'APPWRITE_PROJECT_ID',
  'APPWRITE_DATABASE_ID',
  'APPWRITE_SUPPLIES_TABLE_ID',
];

const SUPPLY_NAMES = {
  boats: 'Rescue Boats',
  medical_kits: 'Medical Kits',
  food_packs: 'Food Packs',
};

const isDuplicateError = (message) => {
  const msg = (message || '').toLowerCase();
  return msg.includes('duplicate') || msg.includes('unique') || msg.includes('already exists');
};

export default async ({ req, res, log, error }) => {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  const apiKey = process.env.APPWRITE_FUNCTION_API_KEY || process.env.APPWRITE_API_KEY;
  if (!apiKey) missing.push('APPWRITE_FUNCTION_API_KEY');
  if (missing.length > 0) {
    error(`Missing function configuration: ${missing.join(', ')}`);
    return res.json({ success: false, error: 'Server is not configured' }, 500);
  }

  let body = {};
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  } catch {
    return res.json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const { itemId, quantity } = body;
  if (!Object.prototype.hasOwnProperty.call(SUPPLY_NAMES, itemId)) {
    return res.json({ success: false, error: 'Unknown supply item' }, 400);
  }
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 9999) {
    return res.json(
      { success: false, error: 'Quantity must be a whole number between 0 and 9999' },
      400
    );
  }

  const callerId = req.headers['x-appwrite-user-id'] || req.headers['X-Appwrite-User-Id'];
  if (!callerId) {
    return res.json({ success: false, error: 'Authentication required' }, 401);
  }

  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(apiKey);

  const databases = new Databases(client);
  const users = new Users(client);
  const dbId = process.env.APPWRITE_DATABASE_ID;
  const suppliesId = process.env.APPWRITE_SUPPLIES_TABLE_ID;

  let caller;
  try {
    caller = await users.get(callerId);
  } catch (err) {
    error(`Failed to look up caller ${callerId}: ${err?.message || err}`);
    return res.json({ success: false, error: 'Failed to authenticate caller' }, 401);
  }

  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const callerEmail = typeof caller.email === 'string' ? caller.email.trim().toLowerCase() : '';
  const isAdmin =
    (caller.labels || []).includes('admin') || adminEmails.includes(callerEmail);

  if (!isAdmin) {
    return res.json({ success: false, error: 'Administrator privileges required' }, 403);
  }

  const updatedAt = new Date().toISOString();
  const name = SUPPLY_NAMES[itemId];

  try {
    const existing = await databases.listDocuments(dbId, suppliesId, [
      Query.equal('itemId', itemId),
      Query.limit(1),
    ]);

    if (existing.documents.length > 0) {
      const doc = existing.documents[0];
      await databases.updateDocument(dbId, suppliesId, doc.$id, { quantity, name, updatedAt });
    } else {
      try {
        await databases.createDocument(dbId, suppliesId, itemId, {
          itemId,
          name,
          quantity,
          updatedAt,
        });
      } catch (err) {
        // A concurrent update won the unique(itemId) race: update it instead.
        if (!isDuplicateError(err?.message)) throw err;
        const raced = await databases.listDocuments(dbId, suppliesId, [
          Query.equal('itemId', itemId),
          Query.limit(1),
        ]);
        if (raced.documents.length === 0) throw err;
        await databases.updateDocument(dbId, suppliesId, raced.documents[0].$id, {
          quantity,
          name,
          updatedAt,
        });
      }
    }

    log(`${callerEmail || callerId} set ${itemId} to ${quantity}`);
    return res.json({ success: true, itemId, quantity });
  } catch (err) {
    error(`Supply update failed for ${itemId}: ${err?.message || err}`);
    return res.json({ success: false, error: 'Unable to update supply inventory' }, 500);
  }
};
