local function bearer_token()
  return os.date("!%Y-%m-%dT%H:%M:%SZ")
end

-- Extract operationId from Drift data block
-- Data structure: Integer(1)=description, Integer(2)=operationId, Integer(3)=test suite, Integer(4)=duration (optional)
local function extract_operation_id(data)
  if data and data[2] then
    return tostring(data[2])
  end
  return nil
end


local exports = {
  event_handlers = {
    ["operation:started"] = function(event, data)
      local operation_id = extract_operation_id(data)
      if operation_id then
        os.execute(string.format("node ./automation/setup-postgres-state.js setup '%s'", operation_id))
      end
    end,
    
    ["operation:finished"] = function(event, data)
      os.execute("node ./automation/setup-postgres-state.js reset")
    end,
  },

  exported_functions = {
    bearer_token = bearer_token,
  }
}

return exports
