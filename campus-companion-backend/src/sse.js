/**
 * SSE manager — subscribers are writeSSE callbacks from Hono streamSSE connections.
 */

const subscribers = new Map();
let clientCounter = 0;

/**
 * @param {(message: { data: string }) => Promise<void>} writeSSE
 * @returns {string} clientId
 */
function registerSubscriber(writeSSE) {
  const clientId = `client_${++clientCounter}_${Date.now()}`;
  subscribers.set(clientId, writeSSE);
  console.log(`[SSE] Client connected: ${clientId} (total: ${subscribers.size})`);
  return clientId;
}

function removeSubscriber(clientId) {
  if (!subscribers.has(clientId)) return;
  subscribers.delete(clientId);
  console.log(`[SSE] Client disconnected: ${clientId} (total: ${subscribers.size})`);
}

async function broadcastData(data) {
  if (subscribers.size === 0) return;

  const failures = [];

  for (const [clientId, writeSSE] of subscribers) {
    try {
      await writeSSE({ data });
    } catch (err) {
      console.error(`[SSE] Error sending to ${clientId}:`, err.message);
      failures.push(clientId);
    }
  }

  failures.forEach(removeSubscriber);
  if (subscribers.size > 0) {
    console.log(`[SSE] Broadcast sent to ${subscribers.size} clients`);
  }
}

async function broadcastNewNotice(notice) {
  await broadcastData(JSON.stringify(notice));
}

async function broadcastNoticeDeleted(noticeId) {
  await broadcastData(JSON.stringify({ type: 'deleted', id: noticeId }));
}

/** @deprecated use registerSubscriber */
function addSubscriber() {
  throw new Error('addSubscriber is deprecated — use registerSubscriber with Hono streamSSE');
}

module.exports = {
  registerSubscriber,
  removeSubscriber,
  broadcastNewNotice,
  broadcastNoticeDeleted,
  addSubscriber,
  getSubscriberCount: () => subscribers.size,
};
