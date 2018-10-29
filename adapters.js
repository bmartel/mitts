export const express = (req, res) => ({
  resolve: html =>
    res.send(html),

  reject: () =>
    res.status(404).end(),

  redirect: () =>
    res.writeHead(302, {
      Location: req.url
    }).end()

  url: req.url,

  cookies: req.cookies,
})
