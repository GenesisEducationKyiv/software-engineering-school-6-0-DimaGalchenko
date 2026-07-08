const path = require("path");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const createGrpcNotificationClient = require("../../../clients/notification/grpcNotificationClient");
const {
  fromStruct,
} = require("../../../notification-service/grpc/structCodec");

const PROTO_PATH = path.join(
  __dirname,
  "../../../proto/notification/v1/notification.proto",
);

const startMockServer = (port, handlers) => {
  const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  const proto = grpc.loadPackageDefinition(packageDefinition).notification.v1;

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
  const receivedRequests = [];
  const mockHandlers = {
    Send: jest.fn((call, callback) => {
      receivedRequests.push(call.request);
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
    it("calls gRPC Send with templateId, email and data payload", async () => {
      const result = await client.send("confirmation", {
        email: "user@example.com",
        confirmToken: "token-123",
      });

      expect(result.success).toBe(true);
      expect(mockHandlers.Send).toHaveBeenCalled();

      const request = receivedRequests[0];
      expect(request.template_id).toBe("confirmation");
      expect(request.email).toBe("user@example.com");
      expect(fromStruct(request.data)).toEqual({ confirmToken: "token-123" });
    });
  });
});
