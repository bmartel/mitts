const { express } = require('./adapters');
const Loader = require('./loader')

module.exports = {
  Loader,
  express: options => new Loader(express, options),
}
