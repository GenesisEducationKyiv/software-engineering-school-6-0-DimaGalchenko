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

  const sendConfirmation = async (email, confirmToken) => {
    await post("/api/notifications/confirmation", { email, confirmToken });
  };

  const sendReleaseNotification = async (
    email,
    repo,
    tagName,
    htmlUrl,
    unsubscribeToken,
  ) => {
    await post("/api/notifications/release", {
      email,
      repo,
      tagName,
      htmlUrl,
      unsubscribeToken,
    });
  };

  return { sendConfirmation, sendReleaseNotification };
};

module.exports = createHttpNotificationClient;
