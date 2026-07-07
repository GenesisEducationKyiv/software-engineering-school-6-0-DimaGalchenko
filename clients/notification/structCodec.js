// Encodes plain JS values into google.protobuf.Struct wire format.
// Note: struct.proto is bundled with proto-loader and always uses
// camelCase field names, even when the loader is set to keepCase.
const toValue = (value) => {
  if (value === null || value === undefined) {
    return { nullValue: "NULL_VALUE" };
  }
  if (typeof value === "number") {
    return { numberValue: value };
  }
  if (typeof value === "string") {
    return { stringValue: value };
  }
  if (typeof value === "boolean") {
    return { boolValue: value };
  }
  if (Array.isArray(value)) {
    return { listValue: { values: value.map(toValue) } };
  }
  return {
    structValue: {
      fields: Object.fromEntries(
        Object.entries(value).map(([key, v]) => [key, toValue(v)]),
      ),
    },
  };
};

const toStruct = (obj) => ({
  fields: Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [key, toValue(value)]),
  ),
});

module.exports = { toStruct };
