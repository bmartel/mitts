export const express = (request, response, next) => {
  return {
    next,
    request,
    response,
    resolve: html => response.send(html),

    reject: () => response.status(404).end(),

    redirect: url =>
      response
        .writeHead(302, {
          Location: url
        })
        .end(),

    url: request.url,
    path: request.path,
    method: request.method,
    params: request.params || {},
    cookies: request.cookies
  };
};
