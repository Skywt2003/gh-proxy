"use strict";

import index from "./index.html";

const PREFIX = "/";

const PREFLIGHT_INIT = {
  status: 204,
  headers: new Headers({
    "access-control-allow-origin": "*",
    "access-control-allow-methods":
      "GET,POST,PUT,PATCH,TRACE,DELETE,HEAD,OPTIONS",
    "access-control-max-age": "1728000",
  }),
};

const exps = [
  // https://github.com/Skywt2003/Daydream/archive/refs/tags/1.1.zip
  // https://github.com/hunshcn/project/releases/download/v0.1.0/example.zip
  /^(?:https?:\/\/)?github\.com\/.+?\/.+?\/(?:releases|archive)\/.*$/i,
  // https://github.com/hunshcn/project/blob/master/filename
  // https://github.com/Skywt2003/Daydream/blob/1.1/404.php
  /^(?:https?:\/\/)?github\.com\/.+?\/.+?\/(?:blob|raw)\/.*$/i,
  /^(?:https?:\/\/)?github\.com\/.+?\/.+?\/(?:info|git-).*$/i,
  // https://raw.githubusercontent.com/Skywt2003/Daydream/1.1/404.php
  /^(?:https?:\/\/)?raw\.(?:githubusercontent|github)\.com\/.+?\/.+?\/.+?\/.+$/i,
  // https://gist.githubusercontent.com/cielpy/351557e6e465c12986419ac5a4dd2568/raw/cmd.py
  /^(?:https?:\/\/)?gist\.(?:githubusercontent|github)\.com\/.+?\/.+?\/.+$/i,
  /^(?:https?:\/\/)?github\.com\/.+?\/.+?\/tags.*$/i,
];

export default {
  async fetch(req) {
    const url = new URL(req.url);
    const targetUrlString = getUrlFromPath(url.pathname);
    return checkUrl(targetUrlString)
      ? getTargetRes(req, new URL(targetUrlString))
      : getHomepage();
  },
};

const checkUrl = (urlString) => exps.some((exp) => urlString.search(exp) === 0);

const getUrlFromPath = (pathName) =>
  pathName
    .substring(PREFIX.length)
    .replace(/^https?:\/+/, "https://")
    .replace("/blob/", "/raw/");

const getHomepage = () =>
  new Response(index, {
    headers: {
      "content-type": "text/html;charset=UTF-8",
    },
  });

const getTargetRes = (req, url) => {
  if (
    req.method === "OPTIONS" &&
    req.headers.has("access-control-request-headers")
  ) {
    return new Response(null, PREFLIGHT_INIT);
  }

  const reqInit = {
    method: req.method,
    headers: new Headers(req.headers),
    redirect: "manual",
    body: req.body,
  };
  return getProxiedRes(url, reqInit);
};

const getProxiedRes = async (url, reqInit) => {
  const res = await fetch(url.href, reqInit);
  const headers = new Headers(res.headers);
  const status = res.status;

  if (headers.has("location")) {
    const _location = headers.get("location");
    if (checkUrl(_location)) {
      headers.set("location", PREFIX + _location);
    } else {
      reqInit.redirect = "follow";
      return getProxiedRes(new URL(_location), reqInit);
    }
  }

  headers.set("access-control-expose-headers", "*");
  headers.set("access-control-allow-origin", "*");
  headers.delete("content-security-policy");
  headers.delete("content-security-policy-report-only");
  headers.delete("clear-site-data");

  return new Response(res.body, { status, headers });
};
