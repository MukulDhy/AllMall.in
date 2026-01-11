const morgan = require("morgan");
const logger = require("../utils/logger.js");

const stream = {
  write: (message) => logger.info(message.trim()),
};

module.exports = morgan(
  ":method :url :status :response-time ms - :remote-addr",
  { stream }
);
