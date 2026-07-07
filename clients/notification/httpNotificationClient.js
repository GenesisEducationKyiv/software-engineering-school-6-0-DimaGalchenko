const REQUEST_TIMEOUT_MS = 5000;

const createHttpNotificationClient = (baseUrl) => {
  const post = async (path, body) => {
    const response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(
        data.message || `Notification service error: ${response.status}`,
      );
    }

    return response.json();
  };

  const send = (templateId, data) => {
    const { email, ...payload } = data;
    return post("/api/notifications/send", {
      templateId,
      email,
      data: payload,
    });
  };

  return { send };
};

module.exports = createHttpNotificationClient;
