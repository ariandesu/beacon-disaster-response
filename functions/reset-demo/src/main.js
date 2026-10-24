import { Client, Databases, Query, Users } from 'node-appwrite';

const REQUIRED_ENV = [
  'APPWRITE_ENDPOINT',
  'APPWRITE_PROJECT_ID',
  'APPWRITE_DATABASE_ID',
  'APPWRITE_BEACONS_TABLE_ID',
  'APPWRITE_CLAIMS_TABLE_ID',
  'APPWRITE_EVENTS_TABLE_ID',
  'APPWRITE_SUPPLIES_TABLE_ID',
];

const minutesAgo = (minutes) => new Date(Date.now() - minutes * 60 * 1000).toISOString();

const DEMO_BEACONS = [
  {
    id: 'BCN-DEMO-MEDICAL',
    beaconId: 'BCN-DEMO-MEDICAL',
    latitude: 37.7833,
    longitude: -122.4075,
    category: 'medical',
    severity: 'critical',
    status: 'open',
    createdAt: minutesAgo(4),
    claimedAt: null,
    resolvedAt: null,
    responderId: null,
    locationLabel: 'Market St & 5th St — 2nd floor',
  },
  {
    id: 'BCN-DEMO-FIRE',
    beaconId: 'BCN-DEMO-FIRE',
    latitude: 37.7599,
    longitude: -122.4148,
    category: 'fire',
    severity: 'high',
    status: 'open',
    createdAt: minutesAgo(11),
    claimedAt: null,
    resolvedAt: null,
    responderId: null,
    locationLabel: 'Mission District — smoke reported',
  },
  {
    id: 'BCN-DEMO-FLOOD',
    beaconId: 'BCN-DEMO-FLOOD',
    latitude: 37.7955,
    longitude: -122.3937,
    category: 'flood',
    severity: 'medium',
    status: 'open',
    createdAt: minutesAgo(18),
    claimedAt: null,
    resolvedAt: null,
    responderId: null,
    locationLabel: 'Embarcadero — water rising near pier',
  },
];

const DEMO_SUPPLIES = [
  { itemId: 'boats', name: 'Rescue Boats', quantity: 3 },
  { itemId: 'medical_kits', name: 'Medical Kits', quantity: 10 },
  { itemId: 'food_packs', name: 'Food Packs', quantity: 50 },
];

async function deleteAll(databases, dbId, collectionId) {
  let deleted = 0;
  for (;;) {
    const response = await databases.listDocuments(dbId, collectionId, [Query.limit(100)]);
    if (response.documents.length === 0) break;

    await Promise.all(
      response.documents.map((doc) => databases.deleteDocument(dbId, collectionId, doc.$id))
    );
    deleted += response.documents.length;
    if (response.documents.length < 100) break;
  }
  return deleted;
}

export default async ({ req, res, log, error }) => {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  const apiKey = process.env.APPWRITE_FUNCTION_API_KEY || process.env.APPWRITE_API_KEY;
  if (!apiKey) missing.push('APPWRITE_FUNCTION_API_KEY');
  if (missing.length > 0) {
    error(`Missing function configuration: ${missing.join(', ')}`);
    return res.json(
      { success: false, error: 'Server is not configured', missing },
      500
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
  const beaconsId = process.env.APPWRITE_BEACONS_TABLE_ID;
  const claimsId = process.env.APPWRITE_CLAIMS_TABLE_ID;
  const eventsId = process.env.APPWRITE_EVENTS_TABLE_ID;
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

  let step = 'deleting existing data';
  try {
    // Claims/events first so a partial run cannot leave dangling references.
    const deleted = {
      claims: await deleteAll(databases, dbId, claimsId),
      events: await deleteAll(databases, dbId, eventsId),
      beacons: await deleteAll(databases, dbId, beaconsId),
      supplies: await deleteAll(databases, dbId, suppliesId),
    };

    const now = new Date().toISOString();

    step = 'seeding supplies';
    for (const supply of DEMO_SUPPLIES) {
      await databases.createDocument(dbId, suppliesId, supply.itemId, {
        itemId: supply.itemId,
        name: supply.name,
        quantity: supply.quantity,
        updatedAt: now,
      });
    }

    step = 'seeding beacons and events';
    for (const beacon of DEMO_BEACONS) {
      const { id, ...data } = beacon;
      await databases.createDocument(dbId, beaconsId, id, data);
      await databases.createDocument(dbId, eventsId, `EVT-${id.slice(4)}`, {
        eventId: `EVT-${id.slice(4)}`,
        beaconId: data.beaconId,
        type: 'created',
        message: 'Emergency beacon created by requester',
        actorId: 'system',
        createdAt: data.createdAt,
      });
    }

    log(`Demo reset complete. Deleted ${JSON.stringify(deleted)}`);
    return res.json({
      success: true,
      seeded: {
        beacons: DEMO_BEACONS.length,
        supplies: DEMO_SUPPLIES.length,
        events: DEMO_BEACONS.length,
      },
      deleted,
    });
  } catch (err) {
    const detail = err?.message || String(err);
    error(`Reset demo failed during ${step}: ${detail}`);
    return res.json(
      {
        success: false,
        error: 'Reset failed while restoring demo data',
        step,
        detail,
      },
      500
    );
  }
};
