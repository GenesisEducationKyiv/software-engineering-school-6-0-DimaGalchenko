const createSubscriptionConfirmationSaga = ({
  subscriptionRepository,
  notificationClient,
  logger,
}) => {
  const dispatch = async (sagaId, email, confirmToken) => {
    try {
      await notificationClient.send("confirmation", {
        email,
        confirmToken,
        sagaId,
      });
      logger.info(
        `[saga] confirmation command dispatched for subscription ${sagaId}`,
      );
    } catch (err) {
      logger.error(
        `[saga] dispatch failed for subscription ${sagaId}: ${err.message}`,
      );
      await subscriptionRepository.updateConfirmationStatus(
        sagaId,
        "failed",
        "dispatch failed",
      );
    }
  };

  const start = async (email, repo, confirmToken, unsubscribeToken) => {
    const subscription = await subscriptionRepository.create({
      email,
      repo,
      confirmToken,
      unsubscribeToken,
    });
    await dispatch(subscription.id, email, confirmToken);
    return subscription;
  };

  const resend = async (subscription) => {
    await subscriptionRepository.updateConfirmationStatus(
      subscription.id,
      "pending",
    );
    await dispatch(
      subscription.id,
      subscription.email,
      subscription.confirm_token,
    );
  };

  const onResult = async ({ sagaId, status, error }) => {
    if (status === "sent") {
      await subscriptionRepository.updateConfirmationStatus(sagaId, "sent");
      logger.info(`[saga] subscription ${sagaId} confirmation email sent`);
      return;
    }
    await subscriptionRepository.updateConfirmationStatus(
      sagaId,
      "failed",
      error || "email send failed",
    );
    logger.error(
      `[saga] subscription ${sagaId} confirmation email failed: ${error}`,
    );
  };

  return { start, resend, onResult };
};

module.exports = createSubscriptionConfirmationSaga;
