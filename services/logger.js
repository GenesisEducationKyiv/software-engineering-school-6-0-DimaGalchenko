const net = require("net");
const winston = require("winston");
const Transport = require("winston-transport");

class TcpTransport extends Transport {
  constructor(opts) {
    super(opts);
    this.host = opts.host;
    this.port = opts.port;
    this.maxBufferSize = opts.maxBufferSize || 1000;
    this.socket = null;
    this.connected = false;
    this.buffer = [];
    this._connect();
  }

  _connect() {
    this.socket = new net.Socket();
    this.socket.unref();
    this.socket.connect(this.port, this.host, () => {
      this.connected = true;
      this._flush();
    });
    this.socket.on("error", () => {
      this.connected = false;
    });
    this.socket.on("close", () => {
      this.connected = false;
      setTimeout(() => this._connect(), 3000).unref();
    });
  }

  _flush() {
    while (this.buffer.length > 0 && this.connected) {
      this.socket.write(this.buffer.shift());
    }
  }

  log(info, callback) {
    const line = `${JSON.stringify(info)}\n`;
    if (this.connected && this.socket) {
      this.socket.write(line);
    } else {
      this.buffer.push(line);
      if (this.buffer.length > this.maxBufferSize) {
        this.buffer.shift();
      }
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
