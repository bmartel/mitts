import stream from "mithril/stream";
import { resolveModule } from "./util";

const ALL_INITIALIZERS = [];
const READY_INITIALIZERS = [];

function isWebpackReady(getModuleIds) {
  if (typeof __webpack_modules__ !== "object") {
    return false;
  }

  return getModuleIds().every(moduleId => {
    return (
      typeof moduleId !== "undefined" &&
      typeof __webpack_modules__[moduleId] !== "undefined"
    );
  });
}

function load(loader) {
  let promise = loader();

  let state = {
    loading: true,
    loaded: null,
    error: null
  };

  state.promise = promise
    .then(loaded => {
      state.loading = false;
      state.loaded = loaded;
      return loaded;
    })
    .catch(err => {
      state.loading = false;
      state.error = err;
      throw err;
    });

  return state;
}

function loadMap(obj) {
  let state = {
    loading: false,
    loaded: {},
    error: null
  };

  let promises = [];

  try {
    Object.keys(obj).forEach(key => {
      let result = load(obj[key]);

      if (!result.loading) {
        state.loaded[key] = result.loaded;
        state.error = result.error;
      } else {
        state.loading = true;
      }

      promises.push(result.promise);

      result.promise
        .then(res => {
          state.loaded[key] = res;
        })
        .catch(err => {
          state.error = err;
        });
    });
  } catch (err) {
    state.error = err;
  }

  state.promise = Promise.all(promises)
    .then(res => {
      state.loading = false;
      return res;
    })
    .catch(err => {
      state.loading = false;
      throw err;
    });

  return state;
}

function Capture(component, fn) {
  component.report = fn;
  return component;
}

function createLoadableComponent(loadFn, options) {
  let viewRenderCount = 0;

  if (!options.loading) {
    throw new Error("mixx-loadable requires a `loading` component");
  }

  function render(loaded, props) {
    return options.m(resolveModule(loaded), props);
  }

  const opts = Object.assign(
    {
      loader: null,
      loading: null,
      delay: 200,
      timeout: null,
      render: render,
      webpack: null,
      modules: null
    },
    options
  );

  let res = null;

  function init() {
    if (!res) {
      res = loadFn(opts.loader);
    }
    return res.promise;
  }

  ALL_INITIALIZERS.push(init);

  if (typeof opts.webpack === "function") {
    READY_INITIALIZERS.push(() => {
      if (isWebpackReady(opts.webpack)) {
        return init();
      }
    });
  }

  return {
    preload() {
      return init();
    },

    oninit() {
      init();

      this._delay = null;
      this._timeout = null;
      this.loadable = stream({
        error: res.error,
        pastDelay: false,
        timedOut: false,
        loading: res.loading,
        loaded: res.loaded
      });

      // using an observable, redraw the main application anytime the loadable state has changed
      this.loadable.map(loadState => {
        setTimeout(opts.m.redraw);
      });

      // clear any timeouts that have been set for a given Loadable component
      this._clearTimeouts = () => {
        clearTimeout(this._delay);
        clearTimeout(this._timeout);
      };

      // helper function, mithril doesnt have a setState func for components so this is just convenience wrapper on the stream
      this._setState = (state = {}) => {
        this.loadable(Object.assign({}, this.loadable(), state));
      };

      // update the component loadable state
      this._resolve = () => {
        if (!this._mounted) {
          return;
        }

        this._setState({
          error: res.error,
          loaded: res.loaded,
          loading: res.loading
        });

        this._clearTimeouts();
      };

      // attempt to start loading an async component
      this._load = () => {
        if (this.report && Array.isArray(opts.modules)) {
          opts.modules.forEach(moduleName => {
            this.report(moduleName);
          });
        }

        if (!res.loading) {
          return;
        }

        if (typeof opts.delay === "number") {
          if (opts.delay === 0) {
            this._setState({ pastDelay: true });
          } else {
            this._delay = setTimeout(() => {
              this._setState({ pastDelay: true });
            }, opts.delay);
          }
        }

        if (typeof opts.timeout === "number") {
          this._timeout = setTimeout(() => {
            this._setState({ timedOut: true });
          }, opts.timeout);
        }

        return res.promise
          .then(() => this._resolve())
          .catch(err => this._resolve());
      };

      // retry the load of a previously incomplete attempt
      this._retry = () => {
        this._setState({ error: null, loading: true, timedOut: false });
        res = loadFn(opts.loader);
        this._load();
      };

      // component is mounted, start unpacking the loadable
      this._mounted = true;

      this._load();
    },

    onbeforeremove() {
      this.loadable = null;
      this._mounted = false;
      this._clearTimeouts();
    },

    view(vnode) {
      const { loaded, loading, error, pastDelay, timedOut } = this.loadable();
      if (loading || error) {
        return opts.m(opts.loading, {
          isLoading: loading,
          pastDelay: pastDelay,
          timedOut: timedOut,
          error: error,
          retry: this._retry
        });
      } else if (loaded) {
        return opts.render(loaded, vnode.attrs || {});
      } else {
        return null;
      }
    }
  };
}

function Loadable(opts) {
  if (typeof opts.m !== "function" || !opts.m) {
    throw new Error("Loadable requires a mithril instance 'm' to be passed in");
  }
  return createLoadableComponent(load, opts);
}

function LoadableMap(opts) {
  if (typeof opts.render !== "function") {
    throw new Error("LoadableMap requires a `render(loaded, props)` function");
  }

  return createLoadableComponent(loadMap, opts);
}

Loadable.Map = LoadableMap;

function flushInitializers(initializers) {
  let promises = [];

  while (initializers.length) {
    let init = initializers.pop();
    promises.push(init());
  }

  return Promise.all(promises).then(() => {
    if (initializers.length) {
      return flushInitializers(initializers);
    }
  });
}

Loadable.Capture = Capture;

Loadable.preloadAll = () => {
  return new Promise((resolve, reject) => {
    flushInitializers(ALL_INITIALIZERS).then(resolve, reject);
  });
};

Loadable.preloadReady = () => {
  return new Promise((resolve, reject) => {
    // Always will resolve, errors should be handled within loading UIs.
    flushInitializers(READY_INITIALIZERS).then(resolve, resolve);
  });
};

export default Loadable;
