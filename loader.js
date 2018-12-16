import m from "mithril";
import Loadable from "./index";
import router from "./router";
import { express as expressAdapter } from "./adapters";

export default class Loader {
  constructor(adapter, options = {}) {
    this.adapter = adapter;
    this.html = options.html;
    this.manifest = options.manifest;
    this.createStore = options.createStore;
    this.createSession = options.createSession;
    this.routes = options.routes || {};
    this.route(this.routes);
  }

  _inject(data, { html, title, meta, body, scripts, state } = {}) {
    return data
      .replace("<html>", `<html ${html}>`)
      .replace(/<title>.*?<\/title>/g, title)
      .replace("</head>", `${meta}</head>`)
      .replace(
        '<div id="root"></div>',
        `<div id="root">${body}</div><script>window.__INITIAL_STATE__ = ${state};window.__SERVER_RENDERED__ = ${new Date().getUTCMilliseconds()};</script>`
      )
      .replace("</body>", scripts.join("") + "</body>");
  }

  _extract(chunks = []) {
    if (!this.manifest || !chunks || chunks.length < 1) {
      return [];
    }

    return Object.keys(this.manifest)
      .filter(asset => chunks.indexOf(asset.replace(".js", "")) > -1)
      .map(k => assets[k])
      .map(c => `<script type="text/javascript" src="/${c}"></script>`);
  }

  _session(request, store = null) {
    if (this.createSession) {
      return this.createSession(request, store);
    }
    return null;
  }

  _store(url) {
    // Create a store from the current url
    if (this.createStore) {
      return this.createStore({ title: "test" }, url);
    }
    return null;
  }

  route(routes = this.routes) {
    this.router = router(this, routes);
  }

  attributes() {
    // TODO: Create a module to handle dynamic head content in mithril
    return {
      html: "",
      title: "",
      meta: ""
    };
  }

  middleware() {
    return (...params) => {
      const ctx = this.adapter(...params);

      this.router.lookup(ctx.request, ctx.response);
    };
  }
}

export const express = options => new Loader(expressAdapter, options);
