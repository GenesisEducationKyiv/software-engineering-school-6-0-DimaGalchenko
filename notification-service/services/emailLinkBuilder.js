const createEmailLinkBuilder = (baseUrl) => ({
  confirmUrl: (token) => `${baseUrl}/confirm/${token}`,
  unsubscribeUrl: (token) => `${baseUrl}/unsubscribe/${token}`,
});

module.exports = createEmailLinkBuilder;
