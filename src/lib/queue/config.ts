export const QUEUE_NAMES = {
    MARKETPLACE_SYNC: "marketplace-sync-queue",
};

export const DEFAULT_JOB_OPTIONS = {
    attempts: 3,
    backoff: {
        type: "exponential",
        delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
};
