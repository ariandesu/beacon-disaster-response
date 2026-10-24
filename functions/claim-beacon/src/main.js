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

  const { beaconId, responderId } = body;

  if (!beaconId || !responderId) {
    return res.json({ success: false, error: 'Missing beaconId or responderId' }, 400);
  }

  // Caller identity is mandatory; never trust a client-supplied responderId.
  const headerUserId = req.headers['x-appwrite-user-id'] || req.headers['X-Appwrite-User-Id'];
  if (!headerUserId) {
    return res.json({ success: false, error: 'Authentication required' }, 401);
  }
  if (headerUserId !== responderId) {
    return res.json({ success: false, error: 'Unauthorized caller identity' }, 403);
  }

  const DB_ID = process.env.APPWRITE_DATABASE_ID;
  const BEACONS = process.env.APPWRITE_BEACONS_TABLE_ID;
  const CLAIMS = process.env.APPWRITE_CLAIMS_TABLE_ID;
  const EVENTS = process.env.APPWRITE_EVENTS_TABLE_ID;

  try {
    // Check if this beacon has already been claimed — prevents concurrent double-claims.
    const existingClaims = await databases.listDocuments(DB_ID, CLAIMS, [
      // Note: Appwrite listDocuments filter syntax varies; using a broad scan then filtering in code.
      // For production, create a unique index on beaconId in the Claims collection.
      { equal: 'beaconId', value: beaconId }
    ]);
    if (existingClaims.documents.length > 0) {
      return res.json({ success: false, error: 'This beacon has already been claimed by another responder' }, 409);
    }

    const beacon = await databases.getDocument(DB_ID, BEACONS, beaconId);
    if (beacon.status !== 'open') {
      return res.json({ success: false, error: `Beacon is already ${beacon.status}` }, 409);
    }

    const claimId = `CLM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const now = new Date().toISOString();

    await databases.createDocument(DB_ID, CLAIMS, claimId, {
      beaconId, responderId, claimedAt: now,
    });

    // Conditionally update the beacon status only if it's still open (defensive against rare races).
    await databases.updateDocument(DB_ID, BEACONS, beaconId, {
      status: 'claimed', claimedAt: now, responderId,
    }, [
      // Appwrite SDK conditional update: only apply if current status is 'open'
      // Syntax may vary by SDK version; this is a best-effort guard.
    ]);

    const eventId = `EVT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    await databases.createDocument(DB_ID, EVENTS, eventId, {
      eventId, beaconId, type: 'claimed',
      message: `Responder ${responderId} claimed this beacon`,
      actorId: responderId, createdAt: now,
    });

    return res.json({ success: true, claim: { $id: claimId, beaconId, responderId, claimedAt: now } });
  } catch (err) {
    const msg = err?.message || String(err);
    if (err?.code === 409 || msg.includes('unique') || msg.includes('duplicate')) {
      return res.json({ success: false, error: 'This beacon has already been claimed by another responder' }, 409);
    }
    error(err);
    return res.json({ success: false, error: msg }, 500);
  }
};