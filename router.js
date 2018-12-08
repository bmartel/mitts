import m from "mithril";
import Router from "find-my-way";

const defaultRoute = (req, res) => {
  res.statusCode = 404;
  res.end();
};

const defaultOptions = {
  defaultRoute
};

let router = Router(defaultOptions);

export default (loader, handler, routes, options = defaultOptions) => {
  router.reset();
  router = Router(defaultOptions);

  Object.keys(routes).forEach(route => {
    router.get(route, (req, res, params) => {
      const component = routes[route];
      const onmatch = component.onmatch || (() => component);
      const render = component.render || (a => a);

      const attrs = Object.assign({}, params, req.query);

      Promise.resolve()
        .then(() => m(onmatch(attrs, req.url) || "div", attrs))
        .then(render)
        .then(handler)
        .then(html => html(loader, req, res, params))
        .catch(err => {
          console.error(err);
          options.defaultRoute(req, res);
        });
    });
  });

  return router;
};
