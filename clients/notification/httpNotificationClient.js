const createHttpNotificationClient = (baseUrl) => {
  const post = async (path, body) => {
    const response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(
        data.message || `Notification service error: ${response.status}`,
      );
    }

    return response.json();
  };

  const send = async (templateId, data) => {
    await post("/api/notifications/send", { templateId, data });
  };

  return { send };
};

module.exports = createHttpNotificationClient;
