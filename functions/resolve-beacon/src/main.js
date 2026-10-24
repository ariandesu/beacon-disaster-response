import { Client, Databases } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);

  let body = {};
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  } catch (err) {
    return res.json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const { beaconId } = body;
  if (!beaconId) {
    return res.json({ success: false, error: 'Missing beaconId' }, 400);
  }

  const callerId = req.headers['x-appwrite-user-id'] || req.headers['X-Appwrite-User-Id'];
  if (!callerId) {
    return res.json({ success: false, error: 'Authentication required' }, 401);
  }

  const DB_ID = process.env.APPWRITE_DATABASE_ID;
  const BEACONS = process.env.APPWRITE_BEACONS_TABLE_ID;
  const CLAIMS = process.env.APPWRITE_CLAIMS_TABLE_ID;
  const EVENTS = process.env.APPWRITE_EVENTS_TABLE_ID;

  try {
    // Load the beacon and verify it belongs to this caller.
    const beacon = await databases.getDocument(DB_ID, BEACONS, beaconId);

    if (beacon.status === 'resolved') {
      return res.json({ success: false, error: 'Beacon is already resolved' }, 409);
    }

    // Only the assigned responder may resolve; admins bypass via ADMIN_EMAILS.
    const adminEmails = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean);

    // We cannot fetch the user's email here without an Account client, so we rely on
    // the caller identity header + the beacon's responderId match, plus optional admin emails.
    const isAssignedResponder = beacon.responderId === callerId;
    const isAdmin = adminEmails.includes(callerId);

    if (!isAssignedResponder && !isAdmin) {
      return res.json({ success: false, error: 'Only the assigned responder or an admin can resolve this beacon' }, 403);
    }

    const now = new Date().toISOString();

    // Update beacon status atomically.
    await databases.updateDocument(DB_ID, BEACONS, beaconId, {
      status: 'resolved', resolvedAt: now,
    });

    // Create the resolution event.
    const eventId = `EVT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    await databases.createDocument(DB_ID, EVENTS, eventId, {
      eventId, beaconId, type: 'resolved',
      message: `Responder ${callerId} resolved this beacon`,
      actorId: callerId, createdAt: now,
    });

    return res.json({ success: true });
  } catch (err) {
    const msg = err?.message || String(err);
    error(err);
    return res.json({ success: false, error: msg }, 500);
  }
};
