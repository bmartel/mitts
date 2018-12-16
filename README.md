# Mitts

Helpful tools to quickly add server side rendering and dynamically imported components into a Mithril application.

## Plugins

There are 2 plugins that are provided for ensuring a proper management of loaded component modules, and bundles on the server.

### Webpack

```js
// webpack.config.js
import { LoadablePlugin } from "mitts/webpack";

export default {
  plugins: [
    new LoadablePlugin({
      filename: "./build/mitts.json"
    })
  ]
};
```

### Babel

```js
// server.js
require("mithril/test-utils/browserMock")(global); // required to ensure mithril can be used on the server

import { LoadablePlugin } from "mitts/webpack";

// adapt as required, the options provided assume your server to be a project root dir and your client src is a project root dir `src`
require("@babel/register")({
  ignore: [/\/build\//],
  presets: [["@babel/preset-env", { targets: { node: "current" } }]],
  plugins: [
    [
      "babel-plugin-module-resolver",
      {
        root: ["../"],
        alias: {
          "@": "./src"
        }
      }
    ],
    "@babel/syntax-dynamic-import",
    "babel-plugin-dynamic-import-node",

    // ...

    "mitts/babel"
  ]
});

// ... declare server below
```

## Server Side Rendering

### Loader

Builds atop the [mithril-node-render](https://github.com/MithrilJS/mithril-node-render) library and provides a `Loader` interface which can be adapted to run with your specific Node.JS server as a routing middleware.

An example express middleware is provided by default

```js
// server/index.js
import express from "express";
import { express as MittsLoader } from "mitts/loader";

// retrieve your clientside mithril entrypoint
import client from "../src/index";

// set the target output dir of your static build
const buildDir = path.resolve(__dirname, "../build");

// path to the entrypoint html template
const html = `${buildDir}/app.html`;

// path to the module manifest provided by mitts plugin
const manifest = `${buildDir}/mitts.json`;

// [Optional] handle sessions however you need for users
const createSession = (req, store) => {};

// express server
const app = express();

// create a loader for express
const mitts = MittsLoader({
  html,
  manifest,
  createSession,
  // [Optional] create an application store to hydrate components via redux
  createStore: client.store,
  routes: client.routes
});

// register the middleware
app.use(express.static(buildDir));
app.use(mitts.middleware());
```

But handling for your own server type can be added easily by implementing an adapter and creating a new Loader object providing your server adapter.

```js
// server/index.js
import http from "http";
import Loader from "mitts/loader";

const adapter = (req, res) => ({
  request: req,
  response: res
});

const mitts = new Loader(adapter, {
  // same options as above MittsLoader
});

const server = http.createServer(mitts.middleware());

// ...
```

## Dynamic Component Loading

### Loadable

Implementation credit and big thanks to the wonderful React based library [react-loadable](https://github.com/jamiebuilds/react-loadable) for providing a quality solution to dynamic import and code splitting/loading. The documentation they provide will be mostly correct for this mithril adapatation.

This adapatation aims to provide a nice experience for loading mithril components dynamically using `import()`. There is a provided `Loadable` interface which handles loading in a component with proper lifecycle management.

```js
import m from "mithril";
import Mitts from "mitts";

const Loading = {
  view(vnode) {
    const { error, retry, pastDelay } = vnode.attrs;
    if (props.error) {
      return m("div", ["Error! ", m("button", { onclick: retry }, "Retry")]);
    } else if (pastDelay) {
      return m("div", "Loading...");
    } else {
      return null;
    }
  }
};

const LoadableWidget = Mitts({
  loader: () => import("@/components/widget"),
  loading: Loading,
  delay: 300 // 0.3 seconds
});

m.route(
  { "/": { view: () => m(LoadableWidget) } },
  "/",
  document.getElementById("root")
);
```

## Examples

For a working sample you can reference the latest version of the mithril starter app I have been maintaining over here [mithril-redux-starter](https://github.com/bmartel/mithril-redux-starter-webpack)

## WIP

This is highly experimental and unfinished. Everything mostly works, but there are no tests or guarantees of any kind at this time. The documentation is also lacking. If there are bugs, suggestions or improvements please feel free to open an issue and send a pull request.
