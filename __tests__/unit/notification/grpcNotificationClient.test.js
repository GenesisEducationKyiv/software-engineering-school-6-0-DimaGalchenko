const path = require("path");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const createGrpcNotificationClient = require("../../../clients/notification/grpcNotificationClient");

const PROTO_PATH = path.join(
  __dirname,
  "../../../notification-service/grpc/notification.proto",
);

const startMockServer = (port, handlers) => {
  const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  const proto = grpc.loadPackageDefinition(packageDefinition).notification;

  const server = new grpc.Server();
  server.addService(proto.NotificationService.service, handlers);

  return new Promise((resolve, reject) => {
    server.bindAsync(
      `0.0.0.0:${port}`,
      grpc.ServerCredentials.createInsecure(),
      (err) => {
        if (err) {
          return reject(err);
        }
        return resolve(server);
      },
    );
  });
};

describe("GrpcNotificationClient", () => {
  let server;
  let client;
  const port = 50098;
  const mockHandlers = {
    Send: jest.fn((_call, callback) => {
      callback(null, { success: true, message: "Sent" });
    }),
  };

  beforeAll(async () => {
    server = await startMockServer(port, mockHandlers);
    client = createGrpcNotificationClient(`localhost:${port}`);
  });

  afterAll(() => {
    return new Promise((resolve, reject) => {
      server.tryShutdown((err) => (err ? reject(err) : resolve()));
    });
  });

  describe("send", () => {
    it("calls gRPC Send with templateId and data", async () => {
      const result = await client.send("confirmation", {
        email: "user@example.com",
        confirmToken: "token-123",
      });

      expect(result.success).toBe(true);
      expect(mockHandlers.Send).toHaveBeenCalled();
    });
  });
});
