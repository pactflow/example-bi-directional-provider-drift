--[[
  Drift Lifecycle Hooks — PostgreSQL Repository (HTTP state server variant)

  This Lua script is referenced by drift-postgres/drift.yaml as the `functions` source.
  It serves two purposes:

  1. STATE MANAGEMENT via lifecycle event handlers
     Drift fires events before and after each test operation. Unlike the in-memory
     variant, these handlers call a *separate* state management server running on
     port 9000 (automation/setup-postgres-state-http.js) rather than test routes
     on the API server itself. This separation keeps production routes clean and
     is the recommended pattern for real database backends.

     The state server URL is configurable via the STATE_SERVER_URL environment
     variable, which defaults to http://localhost:9000.

  2. TOKEN GENERATION via exported functions
     The bearer_token function is referenced in drift.yaml as ${functions:bearer_token}
     and is called by Drift to dynamically generate a fresh auth token for each request.

  Lifecycle event data structure:
    data[1] = operation description (string)
    data[2] = operationId (string) — matches the key in drift.yaml operations
    data[3] = test suite name (string)
    data[4] = duration in ms (number, only on 'finished' events)

  Alternative:
    See product-postgres-local.lua for a variant that invokes a local CLI script
    instead of an HTTP server. The HTTP approach is preferred because it avoids
    the startup overhead of spawning a Node.js process for every operation.
--]]

-- Generate a Bearer token accepted by the API's auth middleware.
-- The middleware accepts any ISO 8601 timestamp that is not in the future.
local function bearer_token()
  return os.date("!%Y-%m-%dT%H:%M:%SZ")
end

-- Extract the operationId from the event data block.
-- This ID maps to a setup handler in automation/setup-postgres-state-http.js.
local function extract_operation_id(data)
  if data and data[2] then
    return tostring(data[2])
  end
  return nil
end

-- Allow the state server URL to be overridden via environment variable
local STATE_SERVER_URL = os.getenv("STATE_SERVER_URL") or "http://localhost:9000"

local exports = {
  event_handlers = {
    --[[
      operation:started — fires before Drift sends the HTTP request

      Calls POST <STATE_SERVER_URL>/setup/:operationId to seed the PostgreSQL
      database with the state required for this test scenario.
    --]]
    ["operation:started"] = function(event, data)
      local operation_id = extract_operation_id(data)
      if operation_id then
        local res = http({
          url = STATE_SERVER_URL .. "/setup/" .. operation_id,
          method = "POST",
          headers = {
            ["Content-Type"] = "application/json"
          },
          body = ""
        })
        if res.status ~= 200 then
          print("Setup failed for '" .. operation_id .. "' (status: " .. (res.status or "unknown") .. ")")
        end
      end
    end,

    --[[
      operation:finished — fires after Drift has validated the HTTP response

      Calls POST <STATE_SERVER_URL>/reset to truncate the products table so
      the next test operation starts from a predictable clean state.
    --]]
    ["operation:finished"] = function(event, data)
      local res = http({
        url = STATE_SERVER_URL .. "/reset",
        method = "POST",
        headers = {
          ["Content-Type"] = "application/json"
        },
        body = ""
      })
      if res.status ~= 200 then
        print("Reset failed (status: " .. (res.status or "unknown") .. ")")
      end
    end,
  },

  -- Functions exported here are callable from drift.yaml via ${functions:<name>}
  exported_functions = {
    bearer_token = bearer_token,
  }
}

return exports
