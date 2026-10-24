import { Client, Databases, Account, Query } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);
  const account = new Account(client);

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

  // Fetch the authenticated user's email server-side so we can compare
  // against ADMIN_EMAILS which contains email addresses, not user IDs.
  let callerEmail = '';
  try {
    const user = await account.get(callerId);
    callerEmail = (user.email || '').toString().trim().toLowerCase();
  } catch (err) {
    // If we cannot look up the user, deny access rather than guess.
    return res.json({ success: false, error: 'Failed to authenticate caller' }, 401);
  }

  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

  const isAdmin = adminEmails.includes(callerEmail);

  const DB_ID = process.env.APPWRITE_DATABASE_ID;
  const BEACONS = process.env.APPWRITE_BEACONS_TABLE_ID;
  const CLAIMS = process.env.APPWRITE_CLAIMS_TABLE_ID;
  const EVENTS = process.env.APPWRITE_EVENTS_TABLE_ID;

  try {
    const beacon = await databases.getDocument(DB_ID, BEACONS, beaconId);

    // Authorization: only the assigned responder may resolve; admins bypass.
    const isAssignedResponder = beacon.responderId === callerId;
    if (!isAssignedResponder && !isAdmin) {
      return res.json({ success: false, error: 'Only the assigned responder or an admin can resolve this beacon' }, 403);
    }

    // Check for an existing resolution event — supports idempotent retries
    // and recovery from partial failures (beacon resolved but event missing).
    const resolutionEvents = await databases.listDocuments(DB_ID, EVENTS, [
      Query.equal('beaconId', beaconId),
      Query.equal('type', 'resolved')
    ]);

    if (resolutionEvents.documents.length > 0) {
      return res.json({ success: true });
    }

    if (beacon.status === 'resolved') {
      // Beacon is already resolved but no resolution event was found —
      // recover by creating the missing event (partial failure from a prior run).
      const now = new Date().toISOString();
      const eventId = `EVT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      await databases.createDocument(DB_ID, EVENTS, eventId, {
        eventId, beaconId, type: 'resolved',
        message: `Responder ${callerId} resolved this beacon`,
        actorId: callerId, createdAt: now,
      });
      return res.json({ success: true });
    }

    // Beacon is open: update status and create the resolution event.
    const now = new Date().toISOString();

    await databases.updateDocument(DB_ID, BEACONS, beaconId, {
      status: 'resolved', resolvedAt: now,
    });

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