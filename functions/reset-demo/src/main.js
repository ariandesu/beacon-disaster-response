import { Client, Databases, Query, Users } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);
  const users = new Users(client);
  const DB_ID = process.env.APPWRITE_DATABASE_ID;
  const TABLES = [
    process.env.APPWRITE_EVENTS_TABLE_ID,
    process.env.APPWRITE_CLAIMS_TABLE_ID,
    process.env.APPWRITE_BEACONS_TABLE_ID,
    process.env.APPWRITE_SUPPLIES_TABLE_ID,
  ];

  // Server-side admin verification via req.headers['x-appwrite-user-id'] and users.get()
  const headerUserId = req.headers['x-appwrite-user-id'] || req.headers['X-Appwrite-User-Id'];
  let userEmail = null;
  if (headerUserId) {
    try {
      const user = await users.get(headerUserId);
      userEmail = user.email;
    } catch (err) {
      error(`Failed to fetch user for admin check: ${err?.message || err}`);
    }
  } else {
    // Fallback to request body for backwards compatibility if header is missing
    try {
      const body = JSON.parse(req.body || '{}');
      userEmail = body.adminEmail || null;
    } catch {
      // Ignore parse errors
    }
  }

  const ADMIN_EMAILS = ['admin@beacon.local', 'command@beacon.local'];
  const isAdmin = userEmail && ADMIN_EMAILS.includes(userEmail.toLowerCase());

  if (!isAdmin) {
    return res.json({ success: false, error: 'Administrator privileges required' }, 403);
  }

  try {
    for (const tableId of TABLES) {
      while (true) {
        const response = await databases.listDocuments(DB_ID, tableId, [Query.limit(100)]);
        if (response.documents.length === 0) break;
        await Promise.all(response.documents.map(doc => databases.deleteDocument(DB_ID, tableId, doc.$id)));
        if (response.documents.length < 100) break;
      }
    }

    const supplies = [
      { itemId: 'boats', name: 'boats', quantity: 3 },
      { itemId: 'medical_kits', name: 'medical_kits', quantity: 10 },
      { itemId: 'food_packs', name: 'food_packs', quantity: 50 },
    ];
    for (const s of supplies) {
      try {
        await databases.createDocument(DB_ID, process.env.APPWRITE_SUPPLIES_TABLE_ID, 'unique()', {
          ...s, updatedAt: new Date().toISOString()
        });
      } catch (err) {
        error(`Failed to re-initialize supply ${s.itemId}: ${err?.message || err}`);
      }
    }

    log('Demo reset completed successfully');
    return res.json({ success: true });
  } catch (err) {
    const msg = err?.message || String(err);
    error(`Reset demo failed: ${msg}`);
    return res.json({ success: false, error: msg }, 500);
  }
};
