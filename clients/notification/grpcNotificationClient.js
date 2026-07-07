const path = require("path");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const { toStruct } = require("./structCodec");

const PROTO_PATH = path.join(__dirname, "notification.proto");
const REQUEST_TIMEOUT_MS = 5000;

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const proto = grpc.loadPackageDefinition(packageDefinition).notification.v1;

const createGrpcNotificationClient = (grpcUrl) => {
  const client = new proto.NotificationService(
    grpcUrl,
    grpc.credentials.createInsecure(),
  );

  const send = (templateId, data) => {
    const { email, ...payload } = data;
    return new Promise((resolve, reject) => {
      client.Send(
        { template_id: templateId, email, data: toStruct(payload) },
        { deadline: new Date(Date.now() + REQUEST_TIMEOUT_MS) },
        (err, response) => {
          if (err) {
            return reject(new Error(err.message));
          }
          return resolve(response);
        },
      );
    });
  };

  return { send };
};

module.exports = createGrpcNotificationClient;
