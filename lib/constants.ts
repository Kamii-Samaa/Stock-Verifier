// Central location for all constants
export const STORAGE_PATH =
  process.env.NODE_ENV === "production" ? "/var/data/shipment-verification" : "/tmp/shipment-verification"

export const USERS_PATH = `${STORAGE_PATH}/users`
export const CODES_PATH = `${STORAGE_PATH}/codes`
export const SCANS_PATH = `${STORAGE_PATH}/scans`

// Trial duration in milliseconds (5 minutes)
export const TRIAL_DURATION = 5 * 60 * 1000
