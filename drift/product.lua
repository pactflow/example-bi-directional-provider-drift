--[[
  Drift Lifecycle Hooks — In-Memory Repository

  This Lua script is referenced by drift/drift.yaml as the `functions` source.
  It serves two purposes:

  1. STATE MANAGEMENT via lifecycle event handlers
     Drift fires events before and after each test operation. These handlers call
     the test-only HTTP endpoints mounted on the API server (automation/test.routes.js)
     to seed or reset the in-memory repository for each scenario.

  2. TOKEN GENERATION via exported functions
     The bearer_token function is referenced in drift.yaml as ${functions:bearer_token}
     and is called by Drift to dynamically generate a fresh auth token for each request.

  Lifecycle event data structure:
    data[1] = operation description (string)
    data[2] = operationId (string) — matches the key in drift.yaml operations
    data[3] = test suite name (string)
    data[4] = duration in ms (number, only on 'finished' events)
--]]

-- Generate a Bearer token accepted by the API's auth middleware.
-- The middleware accepts any ISO 8601 timestamp that is not in the future,
-- so we return the current UTC time as the token value.
local function bearer_token()
  return os.date("!%Y-%m-%dT%H:%M:%SZ")
end

-- Extract the operationId from the event data block.
-- This ID maps to a setup handler in automation/test.routes.js.
local function extract_operation_id(data)
  if data and data[2] then
    return tostring(data[2])
  end
  return nil
end

local exports = {
  event_handlers = {
    --[[
      operation:started — fires before Drift sends the HTTP request

      Calls POST /test/setup/:operationId on the API server to seed the
      in-memory repository with the state required for this test scenario.
      For example, getProductByID_Success seeds a product with ID 10,
      while getProductByID_NotFound ensures the store is empty.
    --]]
    ["operation:started"] = function(event, data)
      local operation_id = extract_operation_id(data)
      if operation_id then
        local res = http({
          url = "http://localhost:8080/test/setup/" .. operation_id,
          method = "POST",
          headers = {
            -- The test routes are protected by the same auth middleware as the
            -- production routes, so we supply a valid token here too
            Authorization = "Bearer " .. bearer_token(),
            ["Content-Type"] = "application/json"
          },
          body = ""
        })
        if res.status ~= 200 then
          print("Setup failed for '" .. operation_id .. "': " .. dbg(res))
        end
      end
    end,

    --[[
      operation:finished — fires after Drift has validated the HTTP response

      Calls POST /test/reset to clear the in-memory repository so the next
      test operation starts from a predictable clean state.
    --]]
    ["operation:finished"] = function(event, data)
      local operation_id = extract_operation_id(data)
      local res = http({
        url = "http://localhost:8080/test/reset",
        method = "POST",
        headers = {
          Authorization = "Bearer " .. bearer_token(),
          ["Content-Type"] = "application/json"
        },
        body = ""
      })
      if res.status ~= 200 then
        print("Reset failed after '" .. (operation_id or "unknown") .. "': " .. dbg(res))
      end
    end,
  },

  -- Functions exported here are callable from drift.yaml via ${functions:<name>}
  exported_functions = {
    bearer_token = bearer_token,
  }
}

return exports
