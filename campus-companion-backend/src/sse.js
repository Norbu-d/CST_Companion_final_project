/**
 * SSE (Server-Sent Events) Manager for real-time notice broadcasts
 * Maintains a Map of active SSE connections and broadcasts new notices to all clients
 */

// Map of connections: clientId -> response object
const subscribers = new Map();

let clientCounter = 0;

/**
 * Register a new SSE subscriber
 * @param {Response} res - Hono response object
 * @returns {string} clientId - unique identifier for this connection
 */
function addSubscriber(res) {
  const clientId = `client_${++clientCounter}_${Date.now()}`;
  subscribers.set(clientId, res);
  console.log(`[SSE] Client connected: ${clientId} (total: ${subscribers.size})`);
  return clientId;
}

/**
 * Remove a subscriber when connection closes
 * @param {string} clientId - client identifier
 */
function removeSubscriber(clientId) {
  subscribers.delete(clientId);
  console.log(`[SSE] Client disconnected: ${clientId} (total: ${subscribers.size})`);
}

/**
 * Broadcast a new notice to all connected clients
 * @param {Object} notice - the full notice object with sentBy and attachments
 */
function broadcastNewNotice(notice) {
  if (subscribers.size === 0) return; // No clients connected

  const eventData = JSON.stringify(notice);
  const sseMessage = `data: ${eventData}\n\n`;

  let failures = [];

  subscribers.forEach((res, clientId) => {
    try {
      // Write the SSE message to the client
      res.write(sseMessage);
    } catch (err) {
      console.error(`[SSE] Error sending to ${clientId}:`, err.message);
      failures.push(clientId);
    }
  });

  // Clean up failed connections
  failures.forEach((clientId) => removeSubscriber(clientId));

  console.log(`[SSE] Broadcast sent to ${subscribers.size} clients`);
}

/**
 * Broadcast notice deletion to all connected clients
 * @param {number} noticeId
 */
function broadcastNoticeDeleted(noticeId) {
  if (subscribers.size === 0) return;

  const eventData = JSON.stringify({ type: 'deleted', id: noticeId });
  const sseMessage = `data: ${eventData}\n\n`;

  const failures = [];

  subscribers.forEach((res, clientId) => {
    try {
      res.write(sseMessage);
    } catch (err) {
      console.error(`[SSE] Error sending delete to ${clientId}:`, err.message);
      failures.push(clientId);
    }
  });

  failures.forEach((clientId) => removeSubscriber(clientId));
}

module.exports = {
  addSubscriber,
  removeSubscriber,
  broadcastNewNotice,
  broadcastNoticeDeleted,
  getSubscriberCount: () => subscribers.size,
};
