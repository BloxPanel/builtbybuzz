
import { defineConfig } from 'vite';
import { readFile, stat } from 'node:fs/promises';
import { resolve, relative, isAbsolute, extname } from 'node:path';

export default defineConfig({
  appType: 'mpa',

  plugins: [
    {
      name: 'builtbybuzz-routing',

      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.method !== 'GET' && req.method !== 'HEAD') {
            return next();
          }

          const pathname = new URL(
            req.url || '/',
            'http://localhost'
          ).pathname;

          // Preserve existing Onyx Studio redirect.
          if (pathname === '/onyx-studio') {
            res.writeHead(308, {
              Location: '/onyx-studio/',
            });
            res.end();
            return;
          }

          // Only handle browser page requests.
          if (!req.headers.accept?.includes('text/html')) {
            return next();
          }

          // Let Vite serve the homepage normally.
          if (pathname === '/' || pathname === '/index.html') {
            return next();
          }

          let decodedPath;

          try {
            decodedPath = decodeURIComponent(pathname);
          } catch {
            return next();
          }

          const root = server.config.root;

          const requestedPath = resolve(
            root,
            '.' + decodedPath
          );

          // Don't handle paths outside the project root.
          const relativePath = relative(root, requestedPath);

          if (
            relativePath.startsWith('..') ||
            isAbsolute(relativePath)
          ) {
            return next();
          }

          // Allow Vite's internal routes and source files.
          if (
            pathname.startsWith('/@') ||
            pathname.startsWith('/__') ||
            pathname.startsWith('/node_modules/')
          ) {
            return next();
          }

          // Allow existing files, directory index pages,
          // and extensionless HTML routes.
          const candidates = [
            requestedPath,
            resolve(requestedPath, 'index.html'),
            `${requestedPath}.html`,
            resolve(server.config.publicDir, relativePath),
          ];

          for (const candidate of candidates) {
            try {
              const info = await stat(candidate);

              if (info.isFile()) {
                return next();
              }
            } catch {
              // Check the next possible file.
            }
          }

          // Let Vite handle missing assets normally.
          if (extname(pathname)) {
            return next();
          }

          // Serve custom 404 for nonexistent pages.
          try {
            const html = await readFile(
              resolve(root, '404.html'),
              'utf8'
            );

            const transformedHtml =
              await server.transformIndexHtml(
                pathname,
                html
              );

            res.statusCode = 404;

            res.setHeader(
              'Content-Type',
              'text/html; charset=utf-8'
            );

            if (req.method === 'HEAD') {
              res.end();
            } else {
              res.end(transformedHtml);
            }
          } catch (error) {
            next(error);
          }
        });
      },
    },
  ],
});
