export let store = null;

export let routes = null;

export default (
  m,
  clientRoutes = null,
  clientStore = null,
  dom = "#root",
  routesUrl = "/"
) => {
  store = clientStore;
  routes = clientRoutes;
  if (typeof document !== "undefined") {
    if (store) {
      store(global.__INITIAL_STATE__);
    }

    if (routes) {
      m.route(
        document.querySelector(dom),
        routesUrl, // eslint-disable-line
        routes
      );
    }
  }
};
