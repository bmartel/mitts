import path from "path";
import fs from "fs";

import m from "mithril";
import render from "mithril-node-render";
import router from "./router";
import { express as expressAdapter } from "./adapters";

const noop = () => {};

export default class Loader {
  constructor(adapter, options = {}) {
    this.adapter = adapter;
    this.app = options.app || "div";
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
        `<div id="root">${body}</div><script>window.__INITIAL_STATE__ = ${state}</script>`
      );
  }

  _extract() {
    // TODO: get the webpack chunks resolved
    const chunks = [];

    if (!this.manifest || !chunks || chunks.length < 1) {
      return "";
    }

    return Object.keys(this.manifest)
      .filter(asset => chunks.indexOf(asset.replace(".js", "")) > -1)
      .map(k => assets[k])
      .map(c => `<script type="text/javascript" src="/${c}"></script>`);
  }

  _session(cookies) {
    if (this.createSession) {
      return this.createSession(cookies);
    }
    return null;
  }

  _store(url) {
    // Create a store from the current url
    if (this.createStore) {
      return this.createStore({}, url);
    }
    return null;
  }

  _process(component) {
    return (loader, req, res, params) => {
      if (!loader.html) {
        throw new Error(
          "missing html path to base template file from build output"
        );
      }

      fs.readFile(loader.html, "utf8", (err, template) => {
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

        const store = loader._store(req.url);
        // const session = loader_.session(ctx.cookies);

        return render(component).then(body => {
          const { html, title, meta } = loader.attributes();

          const content = loader._inject(template, {
            html,
            title,
            meta,
            body,
            scripts: loader._extract(),
            state: store ? JSON.stringify(store).replace(/</g, "\\u003c") : null
          });
          res.writeHead(200, { "Content-Type": "text/html" });
          return res.end(content);
        });
      });
    };
  }

  route(routes = this.routes) {
    this.router = router(this, this._process, routes);
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
