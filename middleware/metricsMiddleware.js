const client = require("prom-client");

const register = new client.Registry();

client.collectDefaultMetrics({ register });

const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});

const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
  registers: [register],
});

const normalizeRoute = (req) => {
  if (req.route) {
    return req.baseUrl + req.route.path;
  }
  return req.path;
};

const metricsMiddleware = (req, res, next) => {
  const end = httpRequestDuration.startTimer();

  res.on("finish", () => {
    const route = normalizeRoute(req);
    const labels = {
      method: req.method,
      route,
      status_code: res.statusCode,
    };
    end(labels);
  httpRequestsTotal.inc(labels);
  });

  next();
};

module.exports = { metricsMiddleware, register };
