const clients = new Set();

const toSsePayload = (event, data) => {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
};

exports.addClient = (res) => {
  clients.add(res);
};

exports.removeClient = (res) => {
  clients.delete(res);
};

exports.sendToAll = (event, data) => {
  if (!clients.size) return 0;
  const payload = toSsePayload(event, data);
  let sent = 0;
  clients.forEach((res) => {
    try {
      res.write(payload);
      sent += 1;
    } catch (_) {
      clients.delete(res);
    }
  });
  return sent;
};
