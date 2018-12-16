import path from "path";
import fs from "fs";
import m from "mithril";
import render from "mithril-node-render";
import Router from "find-my-way";
import url from "url";
import { resolve } from "./util";

const errorRoute = (req, res) => {
  res.statusCode = 404;
  res.end();
};

const defaultOptions = {
  errorRoute
};

const report = (component, fn) => {
  component.report = fn;
  return component;
};

export const handler = (component, store, session) => {
  const modules = [];
  const loaded = report(component, moduleName => modules.push(moduleName));

  return (loader, req, res, params) => {
    if (!loader.html) {
      throw new Error(
        "missing html path to base template file from build output"
      );
    }

    return fs.readFile(loader.html, "utf8", (err, template) => {
      // If there's an error... serve up something nasty
      if (err) {
        console.error("Read error", err);
        res.writeHead(404, { "Content-Type": "text/plain" });
        return res.end("error");
      }

      if (component.redirect) {
        res.writeHead(302, {
          Location: component.redirect
        });
        return res.end();
      }

      return render(loaded).then(body => {
        const { html, title, meta } = loader.attributes();

        const content = loader._inject(template, {
          html,
          title,
          meta,
          body,
          scripts: loader._extract(modules),
          state: store ? JSON.stringify(store).replace(/</g, "\\u003c") : null
        });
        res.writeHead(200, { "Content-Type": "text/html" });
        return res.end(content);
      });
    });
  };
};

let router = Router(defaultOptions);

export default (loader, routes, options = defaultOptions) => {
  router.reset();
  router = Router(defaultOptions);

  Object.keys(routes).forEach(route => {
    router.get(route, (req, res, params) => {
      const component = routes[route];
      const onmatch = component.onmatch || (() => component);
      const render = component.render || (a => a);
      const query = url.parse(req.url, { parseQueryString: true }).query;
      const attrs = Object.assign({}, params, { query });
      const store = loader._store(req.url);
      const session = loader._session(req, store);

      Promise.resolve(onmatch(attrs, req.url))
        .then(resolve)
        .then(resolved => m(resolved || "div", attrs))
        .then(render)
        .then(component => handler(component, store, session))
        .then(html => html(loader, req, res, attrs))
        .catch(err => {
          console.error(err);
          options.errorRoute(req, res);
        });
    });
  });

  return router;
};
