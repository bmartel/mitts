# Mixx

Helpful tools to quickly add server side rendering and dynamically imported components into a Mithril application.

## Plugins

There are 2 plugins that are provided for ensuring a proper management of loaded component modules, and bundles on the server.

### Webpack

```js
  // webpack.config.js
  import { LoadablePlugin } from "mixx/webpack";

  export default {
    plugins: [
      new LoadablePlugin({
        filename: './build/mixx-loadable.json',
      }),
    ],
  }
```

### Babel

```js
  // server.js
  require("mithril/test-utils/browserMock")(global); // required to ensure mithril can be used on the server

  import { LoadablePlugin } from "mixx/webpack";

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
            "@": "./src",
          },
        },
      ],
      "@babel/syntax-dynamic-import",
      "babel-plugin-dynamic-import-node",
      
      // ...

      "mixx/babel",
    ],
  });

  // ... declare server below
```

## Server Side Rendering

### Loader

Builds atop the [mithril-node-render](https://github.com/MithrilJS/mithril-node-render) library and provides a `Loader` interface which can be adapted to run with your specific Node.JS server as a routing middleware.

An example express middleware is provided by default

```js
  // server.js
  import express from "express";
  import { express as MixxExpress } from "mixx/loader";
  
  // retrieve your clientside mithril entrypoint
  import Entrypoint from "../src/index";

  // set the target output dir of your static build
  const buildDir = path.resolve(__dirname, "../build");

  // path to the entrypoint html template
  const html = `${buildDir}/app.html`;

  // path to the webpack manifest file
  const manifest = `${buildDir}/mixx.json`;

  // [Optional] handle sessions however you need for users
  const createSession = cookies => {};

  // [Optional] create an application store to hydrate components via redux
  const createStore = url => {};

  const app = express();

  // create a loader for express
  const mixx = MixxExpress({
    html,
    manifest,
    createSession,
    createStore,
    routes: Entrypoint.routes,
  });

  // register the middleware
  app.use(express.static(buildDir));
  app.use(mixx.middleware());
```

But handling for your own server type can be added easily by implementing an adapter and creating a new Loader object providing your server adapter.

```js
// server.js
  import http from "http";
  import Loader from "mixx/loader";

  const adapter = (req, res) => ({
    request: req,
    response: res
  });

  const mixx = new Loader(adapter, {
    // same options as above MixxExpress
  });

  const server = http.createServer(mixx.middleware())

  // ...
```

## Dynamic Component Loading

### Loadable

Implementation credit and big thanks to the wonderful React based library [react-loadable](https://github.com/jamiebuilds/react-loadable) for providing a quality solution to dynamic import and code splitting/loading. The documentation they provide will be mostly correct for this mithril adapatation.

This adapatation aims to provide a nice experience for loading mithril components dynamically using `import()`. There is a provided `Loadable` interface which handles loading in a component with proper lifecycle management.

```js
  import m from "mithril";
  import Mixx from "mixx";

  const Loading = {
    view(vnode) {
      const { error, retry, pastDelay } = vnode.attrs;
      if (props.error) {
        return m('div', ['Error! ', m('button', { onclick: retry }, 'Retry')]);
      } else if (pastDelay) {
        return m('div', 'Loading...')
      } else {
        return null;
      }
    }
  }

  const LoadableWidget =  Mixx({
    loader: () => import('@/components/widget'),
    loading: Loading,
    delay: 300, // 0.3 seconds
  })

  m.route({ "/": { view: () => m(LoadableWidget) } }, "/", document.getElementById("root"))

```