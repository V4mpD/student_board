const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
  // For API requests
  app.use(
    "/api",
    createProxyMiddleware({
      target: "http://localhost:5000",
      changeOrigin: true,
      secure: false,
    }),
  );

  // For websockets
  app.use(
    "/socket.io",
    createProxyMiddleware({
      target: "http://localhost:5000",
      changeOrigin: true,
      ws: true,
      secure: false,
    }),
  );
};
