import m from "mithril";
import Router from "find-my-way";
import url from "url";

const errorRoute = (req, res) => {
  res.statusCode = 404;
  res.end();
};

const defaultOptions = {
  errorRoute
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
      const query = url.parse(req.url, { parseQueryString: true }).query;
      const attrs = Object.assign({}, params, { query });

      Promise.resolve(onmatch(attrs, req.url))
        .then(resolved => {
          if (resolved) {
            if (resolved.default) {
              return m(resolved.default, attrs);
            }
            return m(resolved, attrs);
          }

          return m("div", attrs);
        })
        .then(render)
        .then(handler)
        .then(html => html(loader, req, res, attrs))
        .catch(err => {
          console.error(err);
          options.errorRoute(req, res);
        });
    });
  });

  return router;
};
