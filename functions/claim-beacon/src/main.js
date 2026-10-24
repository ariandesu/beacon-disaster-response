import { Client, Databases, Users, Query } from 'node-appwrite';

/**
 * Beacon operations router.
 *
 * Appwrite Cloud's current plan allows two Functions for this project, so
 * claim, resolve, and supply updates share one deployed Function. The client
 * sends an `action` field:
 *   { action: 'claim', beaconId }
 *   { action: 'resolve', beaconId }
 *   { action: 'updateSupply', itemId, quantity }
 *
 * Authorization always uses the trusted `x-appwrite-user-id` header injected
 * by Appwrite, never an ID supplied in the request body.
 */

const BASE_REQUIRED_ENV = [
  'APPWRITE_ENDPOINT',
  'APPWRITE_PROJECT_ID',
  'APPWRITE_DATABASE_ID',
  'APPWRITE_BEACONS_TABLE_ID',
  'APPWRITE_CLAIMS_TABLE_ID',
  'APPWRITE_EVENTS_TABLE_ID',
];

const SUPPLY_NAMES = {
  boats: 'Rescue Boats',
  medical_kits: 'Medical Kits',
  food_packs: 'Food Packs',
};

const isDuplicateError = (message) => {
  const msg = (message || '').toLowerCase();
  return (
    msg.includes('duplicate') ||
    msg.includes('unique') ||
    msg.includes('already exists') ||
    msg.includes('document with the requested id')
  );
};

const makeId = (prefix) =>
  `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

async function ensureEvent(databases, dbId, eventsId, beaconId, type, message, actorId, createdAt) {
  const existing = await databases.listDocuments(dbId, eventsId, [
    Query.equal('beaconId', beaconId),
    Query.equal('type', type),
    Query.limit(1),
  ]);
  if (existing.documents.length > 0) return false;

  const eventId = makeId('EVT');
  await databases.createDocument(dbId, eventsId, eventId, {
    eventId,
    beaconId,
    type,
    message,
    actorId,
    createdAt,
  });
  return true;
}

async function getAdminContext({ users, callerId, res, error }) {
  let caller;
  try {
    caller = await users.get(callerId);
  } catch (err) {
    error(`Failed to look up caller ${callerId}: ${err?.message || err}`);
    return {
      response: res.json({ success: false, error: 'Failed to authenticate caller' }, 401),
    };
  }

  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const callerEmail = typeof caller.email === 'string' ? caller.email.trim().toLowerCase() : '';
  const isAdmin =
    (caller.labels || []).includes('admin') || adminEmails.includes(callerEmail);

  return { caller, callerEmail, isAdmin };
}

async function repairClaimState({
  databases,
  dbId,
  beaconsId,
  eventsId,
  beaconId,
  beacon,
  claim,
  responderId,
}) {
  // Never reopen a resolved beacon during claim repair. A resolved status is
  // terminal; only the missing claimed event should be repaired in that case.
  if (beacon.status !== 'resolved' && (beacon.status !== 'claimed' || beacon.responderId !== responderId)) {
    await databases.updateDocument(dbId, beaconsId, beaconId, {
      status: 'claimed',
      claimedAt: claim.claimedAt,
      responderId,
    });
  }

  // Always verify the event, including when the beacon was already resolved.
  // A retry must repair every write that may have been skipped previously.
  await ensureEvent(
    databases,
    dbId,
    eventsId,
    beaconId,
    'claimed',
    `Responder ${responderId} claimed this beacon`,
    responderId,
    claim.claimedAt
  );
}

async function findClaim(databases, dbId, claimsId, beaconId) {
  const claims = await databases.listDocuments(dbId, claimsId, [
    Query.equal('beaconId', beaconId),
    Query.limit(1),
  ]);
  return claims.documents[0];
}

async function handleClaim({ body, responderId, databases, dbId, beaconsId, claimsId, eventsId, res, log, error }) {
  const { beaconId } = body;
  if (!beaconId || typeof beaconId !== 'string') {
    return res.json({ success: false, error: 'Missing beaconId' }, 400);
  }

  try {
    const beacon = await databases.getDocument(dbId, beaconsId, beaconId);
    const existingClaim = await findClaim(databases, dbId, claimsId, beaconId);

    // Idempotent retry path: repair a claim that was created before a later
    // step (beacon update or event write) failed.
    if (existingClaim) {
      if (existingClaim.responderId !== responderId) {
        return res.json(
          { success: false, error: 'This beacon has already been claimed by another responder' },
          409
        );
      }

      await repairClaimState({
        databases,
        dbId,
        beaconsId,
        eventsId,
        beaconId,
        beacon,
        claim: existingClaim,
        responderId,
      });
      log(`Repaired idempotent claim for ${beaconId} by ${responderId}`);
      return res.json({ success: true, repaired: true });
    }

    if (beacon.status !== 'open') {
      return res.json({ success: false, error: `Beacon is already ${beacon.status}` }, 409);
    }

    const now = new Date().toISOString();
    const claimId = makeId('CLM');

    // The unique index on claims.beaconId is the single-winner guard for
    // concurrent claims. This write happens before the beacon update.
    try {
      await databases.createDocument(dbId, claimsId, claimId, {
        beaconId,
        responderId,
        claimedAt: now,
      });
    } catch (err) {
      if (isDuplicateError(err?.message)) {
        // Another request won the unique-index race. Re-read the winner so a
        // retry by that same responder repairs any later partial write rather
        // than receiving a misleading conflict forever.
        const winningClaim = await findClaim(databases, dbId, claimsId, beaconId);
        if (winningClaim?.responderId === responderId) {
          const currentBeacon = await databases.getDocument(dbId, beaconsId, beaconId);
          await repairClaimState({
            databases,
            dbId,
            beaconsId,
            eventsId,
            beaconId,
            beacon: currentBeacon,
            claim: winningClaim,
            responderId,
          });
          return res.json({ success: true, repaired: true });
        }
        return res.json(
          { success: false, error: 'This beacon has already been claimed by another responder' },
          409
        );
      }
      throw err;
    }

    await databases.updateDocument(dbId, beaconsId, beaconId, {
      status: 'claimed',
      claimedAt: now,
      responderId,
    });

    await ensureEvent(
      databases,
      dbId,
      eventsId,
      beaconId,
      'claimed',
      `Responder ${responderId} claimed this beacon`,
      responderId,
      now
    );

    log(`Beacon ${beaconId} claimed by ${responderId}`);
    return res.json({ success: true, claim: { beaconId, responderId, claimedAt: now } });
  } catch (err) {
    const msg = err?.message || String(err);
    if (isDuplicateError(msg)) {
      return res.json(
        { success: false, error: 'This beacon has already been claimed by another responder' },
        409
      );
    }
    error(`Claim failed for ${beaconId}: ${msg}`);
    return res.json({ success: false, error: 'Unable to claim this beacon' }, 500);
  }
}

async function handleResolve({ body, callerId, isAdmin, databases, dbId, beaconsId, eventsId, res, log, error }) {
  const { beaconId } = body;
  if (!beaconId || typeof beaconId !== 'string') {
    return res.json({ success: false, error: 'Missing beaconId' }, 400);
  }

  try {
    const beacon = await databases.getDocument(dbId, beaconsId, beaconId);
    const isAssignedResponder = beacon.responderId === callerId;

    if (!isAssignedResponder && !isAdmin) {
      return res.json(
        { success: false, error: 'Only the assigned responder or an admin can resolve this beacon' },
        403
      );
    }

    // Already resolved: only repair a missing timeline event. Success must not
    // depend on the event existing (the original partial-failure bug).
    if (beacon.status === 'resolved') {
      const createdAt = beacon.resolvedAt || new Date().toISOString();
      await ensureEvent(
        databases,
        dbId,
        eventsId,
        beaconId,
        'resolved',
        `Responder ${callerId} resolved this beacon`,
        callerId,
        createdAt
      );
      return res.json({ success: true, repaired: true });
    }

    const now = new Date().toISOString();
    await databases.updateDocument(dbId, beaconsId, beaconId, {
      status: 'resolved',
      resolvedAt: now,
    });
    await ensureEvent(
      databases,
      dbId,
      eventsId,
      beaconId,
      'resolved',
      `Responder ${callerId} resolved this beacon`,
      callerId,
      now
    );

    log(`Beacon ${beaconId} resolved by ${callerId}${isAdmin ? ' (admin)' : ''}`);
    return res.json({ success: true });
  } catch (err) {
    error(`Resolve failed for ${beaconId}: ${err?.message || err}`);
    return res.json({ success: false, error: 'Unable to resolve this beacon' }, 500);
  }
}

async function handleUpdateSupply({ body, callerId, isAdmin, databases, dbId, suppliesId, res, log, error }) {
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
  if (!suppliesId) {
    error('Missing APPWRITE_SUPPLIES_TABLE_ID');
    return res.json({ success: false, error: 'Server is not configured' }, 500);
  }
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

    log(`${callerId} set ${itemId} to ${quantity}`);
    return res.json({ success: true, itemId, quantity });
  } catch (err) {
    error(`Supply update failed for ${itemId}: ${err?.message || err}`);
    return res.json({ success: false, error: 'Unable to update supply inventory' }, 500);
  }
}

export default async ({ req, res, log, error }) => {
  const missing = BASE_REQUIRED_ENV.filter((key) => !process.env[key]);
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

  const callerId = req.headers['x-appwrite-user-id'] || req.headers['X-Appwrite-User-Id'];
  if (!callerId) {
    return res.json({ success: false, error: 'Authentication required' }, 401);
  }

  const action = body.action || 'claim';

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

  try {
    if (action === 'claim') {
      return await handleClaim({
        body,
        responderId: callerId,
        databases,
        dbId,
        beaconsId,
        claimsId,
        eventsId,
        res,
        log,
        error,
      });
    }

    if (action === 'resolve' || action === 'updateSupply') {
      const context = await getAdminContext({ users, callerId, res, error });
      if (context.response) return context.response;

      if (action === 'resolve') {
        return await handleResolve({
          body,
          callerId,
          isAdmin: context.isAdmin,
          databases,
          dbId,
          beaconsId,
          eventsId,
          res,
          log,
          error,
        });
      }

      return await handleUpdateSupply({
        body,
        callerId,
        isAdmin: context.isAdmin,
        databases,
        dbId,
        suppliesId,
        res,
        log,
        error,
      });
    }

    return res.json({ success: false, error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    error(`Unhandled function error: ${err?.message || err}`);
    return res.json({ success: false, error: 'Internal server error' }, 500);
  }
};
