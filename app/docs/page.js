export default function DocsPage() {
  return (
    <html>
      <head>
        <title>WEBSCOPE API Docs</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="stylesheet" href="/swagger/swagger-ui.css" />
        <style>{`
          body { margin: 0; background: #0a0a0f; }
          .swagger-ui { background: #0a0a0f; }
          .swagger-ui .topbar { display: none; }
          .swagger-ui .info .title { color: #06b6d4; }
        `}</style>
      </head>
      <body>
        <div id="swagger-ui" />
        <script src="/swagger/swagger-ui-bundle.js" />
        <script dangerouslySetInnerHTML={{
          __html: `
            window.onload = function() {
              SwaggerUIBundle({
                url: "/api/docs",
                dom_id: "#swagger-ui",
                presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
                layout: "BaseLayout",
                deepLinking: true,
              });
            };
          `,
        }} />
      </body>
    </html>
  );
}
