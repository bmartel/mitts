import m from "mithril";
import Router from "find-my-way";
import url from "url";

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
      const query = url.parse(req.url, { parseQueryString: true }).query;
      const attrs = Object.assign({}, params, { query });

      console.log(query.things);
      Promise.resolve()
        .then(() => m(onmatch(attrs, req.url) || "div", attrs))
        .then(render)
        .then(handler)
        .then(html => html(loader, req, res, attrs))
        .catch(err => {
          console.error(err);
          options.defaultRoute(req, res);
        });
    });
  });

  return router;
};
