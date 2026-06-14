const createSubscriptionRepository = (pool) => {
  const findByEmailAndRepo = async (email, repo) => {
    const result = await pool.query(
      "SELECT * FROM subscriptions WHERE email = $1 AND repo = $2",
      [email, repo],
    );
    return result.rows[0] || null;
  };

  const create = async ({ email, repo, confirmToken, unsubscribeToken }) => {
    const result = await pool.query(
      `INSERT INTO subscriptions (email, repo, confirm_token, unsubscribe_token)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [email, repo, confirmToken, unsubscribeToken],
    );
    return result.rows[0];
  };

  const findByConfirmToken = async (token) => {
    const result = await pool.query(
      "SELECT * FROM subscriptions WHERE confirm_token = $1",
      [token],
    );
    return result.rows[0] || null;
  };

  const findByUnsubscribeToken = async (token) => {
    const result = await pool.query(
      "SELECT * FROM subscriptions WHERE unsubscribe_token = $1",
      [token],
    );
    return result.rows[0] || null;
  };

  const confirmByToken = async (token) => {
    await pool.query(
      "UPDATE subscriptions SET confirmed = true WHERE confirm_token = $1",
      [token],
    );
  };

  const deleteByUnsubscribeToken = async (token) => {
    await pool.query("DELETE FROM subscriptions WHERE unsubscribe_token = $1", [
      token,
    ]);
  };

  const findConfirmedByEmail = async (email) => {
    const result = await pool.query(
      "SELECT email, repo, confirmed, last_seen_tag FROM subscriptions WHERE email = $1 AND confirmed = true",
      [email],
    );
    return result.rows;
  };

  const findAllByEmail = async (email) => {
    const result = await pool.query(
      "SELECT email, repo, confirmed, last_seen_tag FROM subscriptions WHERE email = $1",
      [email],
    );
    return result.rows;
  };

  const findDistinctConfirmedRepos = async () => {
    const result = await pool.query(
      "SELECT DISTINCT repo FROM subscriptions WHERE confirmed = true",
    );
    return result.rows.map((row) => row.repo);
  };

  const findConfirmedByRepo = async (repo) => {
    const result = await pool.query(
      "SELECT * FROM subscriptions WHERE repo = $1 AND confirmed = true",
      [repo],
    );
    return result.rows;
  };

  const updateLastSeenTagById = async (id, tag) => {
    await pool.query(
      "UPDATE subscriptions SET last_seen_tag = $1 WHERE id = $2",
      [tag, id],
    );
  };

  return {
    findByEmailAndRepo,
    create,
    findByConfirmToken,
    findByUnsubscribeToken,
    confirmByToken,
    deleteByUnsubscribeToken,
    findConfirmedByEmail,
    findAllByEmail,
    findDistinctConfirmedRepos,
    findConfirmedByRepo,
    updateLastSeenTagById,
  };
};

module.exports = createSubscriptionRepository;
