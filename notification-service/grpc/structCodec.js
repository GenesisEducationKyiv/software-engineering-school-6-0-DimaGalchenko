// Decodes google.protobuf.Struct wire format into plain JS values.
// Note: struct.proto is bundled with proto-loader and always uses
// camelCase field names, even when the loader is set to keepCase.
const fromValue = (value) => {
  switch (value.kind) {
    case "numberValue":
      return value.numberValue;
    case "stringValue":
      return value.stringValue;
    case "boolValue":
      return value.boolValue;
    case "structValue":
      return Object.fromEntries(
        Object.entries(value.structValue.fields ?? {}).map(([key, v]) => [
          key,
          fromValue(v),
        ]),
      );
    case "listValue":
      return value.listValue.values.map(fromValue);
    default:
      return null;
  }
};

const fromStruct = (struct) => {
  if (!struct || !struct.fields) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(struct.fields).map(([key, value]) => [
      key,
      fromValue(value),
    ]),
  );
};

module.exports = { fromStruct };
