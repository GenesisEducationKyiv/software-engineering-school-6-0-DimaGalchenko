const createFailingSender = () => ({
  send: async () => {
    throw new Error("forced email failure (failing sender)");
  },
});

module.exports = createFailingSender;
