const net = require("net");
const winston = require("winston");
const Transport = require("winston-transport");

class TcpTransport extends Transport {
  constructor(opts) {
    super(opts);
    this.host = opts.host;
    this.port = opts.port;
    this.socket = null;
    this.connected = false;
    this._connect();
  }

  _connect() {
    this.socket = new net.Socket();
    this.socket.connect(this.port, this.host, () => {
      this.connected = true;
    });
    this.socket.on("error", () => {
      this.connected = false;
    });
    this.socket.on("close", () => {
      this.connected = false;
      setTimeout(() => this._connect(), 3000);
    });
  }

  log(info, callback) {
    if (this.connected && this.socket) {
      this.socket.write(`${JSON.stringify(info)}\n`);
    }
    callback();
  }
}

const createLogger = (config = {}) => {
  const transports = [new winston.transports.Console()];

  if (config.logstashHost) {
    transports.push(
      new TcpTransport({
        host: config.logstashHost,
        port: config.logstashPort,
      }),
    );
  }

  return winston.createLogger({
    level: "info",
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
    ),
    defaultMeta: { service: "release-notifier" },
    transports,
  });
};

module.exports = createLogger;
