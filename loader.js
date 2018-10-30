import path from 'path'
import fs from 'fs'

import m from 'mithril'
import render from 'mithril-node-render'

const noop = () => {};

let match = null;

const wrapRoutes = (app, routes) => {
  const r = {};
  Object.keys(routes).map(key => {
    r[key] = routeResolver(app, routes[key]);
  })
  return r;
}

const routeResolver = (app, component) => ({
  onmatch(params, url) {
    if (component.onmatch) {
      return Promise.resolve(component.onmatch(params, url)).then(c => {
        if (c.view) {
          return (match = m(app, { isServer: true }, m(c)));
        }
      });
    }

    return Promise.resolve(component).then(c => {
      return (match = m(app, { isServer: true }, m(c)));
    });
  },
})

class Loader {
  constructor(adapter, options = {}) {
    this.adapter = adapter;
    this.app = options.app || 'div';
    this.html = options.html;
    this.manifest = options.manifest;
    this.createStore = options.createStore;
    this.createSession = options.createSession;
  }

  router(routes, defaultRoute, dom) {
    m.route(dom, defaultRoute, wrapRoutes(this.app, routes));
  }

  matchedRoute() {
    return Promise.resolve(match);
  }

  inject(data, { html, title, meta, body, scripts, state } = {}) {
    return data.replace('<html>', `<html ${html}>`)
      .replace(/<title>.*?<\/title>/g, title)
      .replace('</head>', `${meta}</head>`)
      .replace(
        '<div id="root"></div>',
        `<div id="root">${body}</div><script>window.__INITIAL_STATE__ = ${state}</script>`
      )
  }

  extract() {
    // TODO: get the webpack chunks resolved
    const chunks = []

    if(!this.manifest || !chunks || chunks.length < 1) {
      return '';
    }

    return Object.keys(this.manifest)
      .filter(asset => chunks.indexOf(asset.replace('.js', '')) > -1)
      .map(k => assets[k])
      .map(c => `<script type="text/javascript" src="/${c}"></script>`)
  }

  render(component) {
    return render(component)
  }

  session(cookies) {
    if (this.createSession) {
      return this.createSession(cookies);
    }
    return null;
  }

  store(url) {
    // Create a store from the current url
    if (this.createStore) {
      return this.createStore({}, url)
    }
    return null;
  }

  attributes() {
    // TODO: Create a module to handle dynamic head content in mithril
    return {
      html: '',
      title: '',
      meta: '',
    }
  }

  process(resolve, reject, redirect, url, cookies) {
    if (!this.html) {
      throw new Error('missing html path to base template file from build output');
    }

    fs.readFile(
      this.html,
      'utf8',
      (err, template) => {
        // If there's an error... serve up something nasty
        if (err) {
          console.error('Read error', err)
          return reject();
        }

        this.matchedRoute().then(component => {
          if (!component) {
            return reject();
          }

          if (component.redirect) {
            return redirect();
          }

          const store = this.store(url);
          const session = this.session(cookies);

          this.render(component).then(body => {
            const { html, title, meta } = this.attributes();

            const content = this.inject(template, {
              html,
              title,
              meta,
              body,
              scripts: this.extract(),
              state: store ? JSON.stringify(store()).replace(/</g, '\\u003c'): null
            })

            resolve(content);
          })
        });
      }
    )
  }

  middleware() {
    return (...params) => {
      const { resolve, reject, redirect, url, cookies } = this.adapter(...params);
      return this.process(resolve, reject, redirect, url, cookies);
    }
  }
}

module.exports = Loader
