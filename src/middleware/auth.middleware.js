/**
 * Bearer token authentication middleware
 *
 * For demo purposes, this API uses a simple timestamp-based token scheme.
 * A valid token is an ISO 8601 UTC timestamp (e.g. "2024-01-15T10:30:00Z")
 * that represents a point in time not in the future.
 *
 * This approach is intentionally simple and allows the Drift Lua hooks to
 * generate valid tokens dynamically at test runtime via:
 *   os.date("!%Y-%m-%dT%H:%M:%SZ")
 * without needing to share a secret or call a token endpoint.
 *
 * Do NOT use this scheme in production — use a proper authentication library.
 */

// Returns true if the timestamp string represents a moment not in the future
const isValidAuthTimestamp = (timestamp) => {
    let diff = (new Date() - new Date(timestamp)) / 1000;
    return diff >= 0
};

const authMiddleware = (req, res, next) => {
    if (!req.headers.authorization) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    // Strip the "Bearer " prefix to get the raw timestamp value
    const timestamp = req.headers.authorization.toLowerCase().replace("bearer ", "")
    if (!isValidAuthTimestamp(timestamp)) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    next();
};

module.exports = authMiddleware;