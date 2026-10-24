import { Client, Databases, Users, Query } from 'node-appwrite';

const REQUIRED_ENV = [
  'APPWRITE_ENDPOINT',
  'APPWRITE_PROJECT_ID',
  'APPWRITE_DATABASE_ID',
  'APPWRITE_BEACONS_TABLE_ID',
  'APPWRITE_EVENTS_TABLE_ID',
];

const makeId = (prefix) =>
  `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

async function ensureResolvedEvent(databases, dbId, eventsId, beaconId, actorId, createdAt) {
  const existing = await databases.listDocuments(dbId, eventsId, [
    Query.equal('beaconId', beaconId),
    Query.equal('type', 'resolved'),
    Query.limit(1),
  ]);
  if (existing.documents.length > 0) return false;

  const eventId = makeId('EVT');
  await databases.createDocument(dbId, eventsId, eventId, {
    eventId,
    beaconId,
    type: 'resolved',
    message: `Responder ${actorId} resolved this beacon`,
    actorId,
    createdAt,
  });
  return true;
}

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

  const { beaconId } = body;
  if (!beaconId || typeof beaconId !== 'string') {
    return res.json({ success: false, error: 'Missing beaconId' }, 400);
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
  const eventsId = process.env.APPWRITE_EVENTS_TABLE_ID;

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

  try {
    const beacon = await databases.getDocument(dbId, beaconsId, beaconId);
    const isAssignedResponder = beacon.responderId === callerId;

    if (!isAssignedResponder && !isAdmin) {
      return res.json(
        { success: false, error: 'Only the assigned responder or an admin can resolve this beacon' },
        403
      );
    }

    // Already resolved: only repair a missing timeline event. Do not depend on
    // the event existing to decide success (the original partial-failure bug).
    if (beacon.status === 'resolved') {
      const createdAt = beacon.resolvedAt || new Date().toISOString();
      await ensureResolvedEvent(databases, dbId, eventsId, beaconId, callerId, createdAt);
      return res.json({ success: true, repaired: true });
    }

    const now = new Date().toISOString();
    await databases.updateDocument(dbId, beaconsId, beaconId, {
      status: 'resolved',
      resolvedAt: now,
    });
    await ensureResolvedEvent(databases, dbId, eventsId, beaconId, callerId, now);

    log(`Beacon ${beaconId} resolved by ${callerId}${isAdmin ? ' (admin)' : ''}`);
    return res.json({ success: true });
  } catch (err) {
    error(`Resolve failed for ${beaconId}: ${err?.message || err}`);
    return res.json({ success: false, error: 'Unable to resolve this beacon' }, 500);
  }
};
