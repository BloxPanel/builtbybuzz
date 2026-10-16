
import { defineConfig } from 'vite';

export default defineConfig({
  appType: 'mpa',
  plugins: [
    {
      name: 'onyx-studio-route',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/onyx-studio') {
            res.writeHead(308, {
              Location: '/onyx-studio/',
            });
            res.end();
            return;
          }
          next();
        });
      },
    },
  ],
});
