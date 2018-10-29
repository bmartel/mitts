require('mithril/test-utils/browserMock')(global)

require('babel-register')({
  ignore: /\/(build|node_modules)\//,
  presets: ['env', 'react-app'],
  plugins: [
    'syntax-dynamic-import',
    'dynamic-import-node',
  ]
})

const { express } = require('./adapter');
const Loader = require('./loader')

module.exports = Loader
module.exports.express = (options) => new Loader(express, options)