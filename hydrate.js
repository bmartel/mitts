export default (
  m,
  clientRoutes = null,
  clientStore = null,
  dom = "#root",
  baseUrl = "/"
) => {

  if (typeof document !== "undefined") {
    if (clientStore) {
      clientStore(global.__INITIAL_STATE__);
    }

    if (clientRoutes) {
      m.route(
        document.querySelector(dom),
        baseUrl, // eslint-disable-line
        clientRoutes
      );
    }
  }

  return { store: clientStore, routes: clientRoutes };
};
