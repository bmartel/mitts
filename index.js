const { express: expressAdapter } = require("./adapters");
const Loader = require("./loader");

module.exports = {
  Loader,
  express: options => new Loader(expressAdapter, options)
};
