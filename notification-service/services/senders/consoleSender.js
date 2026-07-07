const createConsoleSender = () => ({
  send: async ({ to, subject }) => {
    console.log(`[EMAIL] To: ${to} | Subject: ${subject}`);
  },
});

module.exports = createConsoleSender;
