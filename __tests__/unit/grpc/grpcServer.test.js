const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");
const createGrpcServer = require("../../../grpc/server");
const { ValidationError, NotFoundError, ConflictError } = require("../../../utils/errors");

const PROTO_PATH = path.join(__dirname, "../../../grpc/subscription.proto");

const loadClient = (port) => {
  const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  const proto = grpc.loadPackageDefinition(packageDefinition).subscription;
  return new proto.SubscriptionService(
    `localhost:${port}`,
    grpc.credentials.createInsecure()
  );
};

describe("gRPC Server", () => {
  let grpcServer;
  let client;
  let mockService;
  const port = 50099;

  beforeAll((done) => {
    mockService = {
      subscribe: jest.fn().mockResolvedValue(undefined),
      confirm: jest.fn().mockResolvedValue(undefined),
      unsubscribe: jest.fn().mockResolvedValue(undefined),
      listByEmail: jest.fn().mockResolvedValue([]),
    };

    grpcServer = createGrpcServer(mockService);
    grpcServer.server.bindAsync(
      `0.0.0.0:${port}`,
      grpc.ServerCredentials.createInsecure(),
      (err) => {
        if (err) return done(err);
        client = loadClient(port);
        done();
      }
    );
  });

  afterAll((done) => {
    grpcServer.server.tryShutdown(done);
  });

  describe("Subscribe", () => {
    it("returns success message", (done) => {
      client.Subscribe({ email: "user@example.com", repo: "owner/repo" }, (err, response) => {
        expect(err).toBeNull();
        expect(response.message).toBe("Subscription successful. Confirmation email sent.");
        done();
      });
    });

    it("returns INVALID_ARGUMENT on validation error", (done) => {
      mockService.subscribe.mockRejectedValueOnce(new ValidationError("Invalid email address"));

      client.Subscribe({ email: "bad", repo: "owner/repo" }, (err) => {
        expect(err.code).toBe(grpc.status.INVALID_ARGUMENT);
        done();
      });
    });

    it("returns ALREADY_EXISTS on conflict", (done) => {
      mockService.subscribe.mockRejectedValueOnce(new ConflictError("Already subscribed"));

      client.Subscribe({ email: "user@example.com", repo: "owner/repo" }, (err) => {
        expect(err.code).toBe(grpc.status.ALREADY_EXISTS);
        done();
      });
    });
  });

  describe("Confirm", () => {
    it("returns success message", (done) => {
      client.Confirm({ token: "valid-token" }, (err, response) => {
        expect(err).toBeNull();
        expect(response.message).toBe("Subscription confirmed successfully");
        done();
      });
    });

    it("returns NOT_FOUND for unknown token", (done) => {
      mockService.confirm.mockRejectedValueOnce(new NotFoundError("Token not found"));

      client.Confirm({ token: "bad-token" }, (err) => {
        expect(err.code).toBe(grpc.status.NOT_FOUND);
        done();
      });
    });
  });

  describe("Unsubscribe", () => {
    it("returns success message", (done) => {
      client.Unsubscribe({ token: "valid-token" }, (err, response) => {
        expect(err).toBeNull();
        expect(response.message).toBe("Unsubscribed successfully");
        done();
      });
    });
  });

  describe("GetSubscriptions", () => {
    it("returns subscriptions list", (done) => {
      mockService.listByEmail.mockResolvedValueOnce([
        { email: "user@example.com", repo: "owner/repo", confirmed: true, last_seen_tag: "v1.0" },
      ]);

      client.GetSubscriptions({ email: "user@example.com" }, (err, response) => {
        expect(err).toBeNull();
        expect(response.subscriptions).toHaveLength(1);
        expect(response.subscriptions[0].repo).toBe("owner/repo");
        expect(response.subscriptions[0].confirmed).toBe(true);
        expect(response.subscriptions[0].last_seen_tag).toBe("v1.0");
        done();
      });
    });

    it("returns INVALID_ARGUMENT for invalid email", (done) => {
      mockService.listByEmail.mockRejectedValueOnce(new ValidationError("Invalid email"));

      client.GetSubscriptions({ email: "bad" }, (err) => {
        expect(err.code).toBe(grpc.status.INVALID_ARGUMENT);
        done();
      });
    });
  });
});
