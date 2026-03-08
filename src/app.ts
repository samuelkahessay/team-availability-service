import express, { Application, Request, Response, NextFunction } from 'express';
import { AvailabilityRepository } from './repository.js';
import { createAvailabilityRouter } from './routes/availability.js';

export function createApp(repo: AvailabilityRepository): Application {
  const app = express();

  app.use(express.json());

  // Handle malformed JSON
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof SyntaxError && 'body' in err) {
      res.status(400).json({ error: 'Malformed JSON in request body' });
      return;
    }
    next(err);
  });

  app.get('/', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Team Availability Service</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0a0a0a;color:#e5e5e5;min-height:100vh;display:flex;align-items:center;justify-content:center}
.container{max-width:640px;width:100%;padding:48px 32px}
.badge{display:inline-flex;align-items:center;gap:6px;background:#1a1a2e;border:1px solid #2a2a4a;border-radius:20px;padding:6px 14px;font-size:12px;color:#8b8ba7;margin-bottom:24px;letter-spacing:.5px;text-transform:uppercase}
.badge .dot{width:8px;height:8px;background:#22c55e;border-radius:50%;animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
h1{font-size:32px;font-weight:700;letter-spacing:-.5px;margin-bottom:8px;background:linear-gradient(135deg,#fff 0%,#a5b4fc 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.subtitle{color:#71717a;font-size:15px;margin-bottom:40px;line-height:1.5}
.subtitle a{color:#818cf8;text-decoration:none}
.subtitle a:hover{text-decoration:underline}
.endpoints{display:flex;flex-direction:column;gap:8px;margin-bottom:40px}
.endpoint{display:flex;align-items:center;gap:12px;background:#111118;border:1px solid #1e1e2e;border-radius:10px;padding:14px 18px;transition:border-color .2s}
.endpoint:hover{border-color:#3b3b5c}
.method{font-family:'SF Mono',SFMono-Regular,Consolas,monospace;font-size:11px;font-weight:700;padding:4px 8px;border-radius:6px;min-width:56px;text-align:center;letter-spacing:.5px}
.get{background:#0f2a1f;color:#22c55e;border:1px solid #166534}
.post{background:#1a1a2e;color:#818cf8;border:1px solid #3730a3}
.put{background:#1c1a0e;color:#eab308;border:1px solid #854d0e}
.delete{background:#2a0f0f;color:#ef4444;border:1px solid #991b1b}
.path{font-family:'SF Mono',SFMono-Regular,Consolas,monospace;font-size:13px;color:#a1a1aa}
.path .param{color:#818cf8}
.try-section{background:#111118;border:1px solid #1e1e2e;border-radius:12px;padding:20px}
.try-section h3{font-size:13px;color:#71717a;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px}
pre{background:#0a0a0a;border:1px solid #1e1e2e;border-radius:8px;padding:14px;font-family:'SF Mono',SFMono-Regular,Consolas,monospace;font-size:12px;color:#a5b4fc;overflow-x:auto;line-height:1.6}
.origin{font-size:12px;color:#3f3f50;text-align:center;margin-top:40px;line-height:1.6}
.origin a{color:#52526a;text-decoration:none}
.origin a:hover{color:#818cf8}
</style>
</head>
<body>
<div class="container">
<div class="badge"><span class="dot"></span> Live on Vercel</div>
<h1>Team Availability Service</h1>
<p class="subtitle">REST API for team availability status management.<br>Built autonomously by <a href="https://github.com/samuelkahessay/meeting-to-main">meeting-to-main</a> pipeline.</p>

<div class="endpoints">
  <div class="endpoint"><span class="method post">POST</span><span class="path">/users/<span class="param">:userId</span>/availability</span></div>
  <div class="endpoint"><span class="method get">GET</span><span class="path">/users/<span class="param">:userId</span>/availability</span></div>
  <div class="endpoint"><span class="method put">PUT</span><span class="path">/users/<span class="param">:userId</span>/availability/<span class="param">:id</span></span></div>
  <div class="endpoint"><span class="method delete">DELETE</span><span class="path">/users/<span class="param">:userId</span>/availability/<span class="param">:id</span></span></div>
  <div class="endpoint"><span class="method get">GET</span><span class="path">/team/<span class="param">:teamId</span>/availability</span></div>
</div>

<div class="try-section">
<h3>Try it</h3>
<pre>curl -X POST ${typeof _req.headers.host === 'string' ? 'https://' + _req.headers.host : ''}/users/sam/availability \\
  -H "Content-Type: application/json" \\
  -d '{"teamId":"eng","status":"in-office",
       "startTime":"2026-03-08T09:00:00Z",
       "endTime":"2026-03-08T17:00:00Z"}'</pre>
</div>

<p class="origin">Meeting transcript &rarr; PRD &rarr; Code &rarr; Tests &rarr; Deploy<br><a href="https://github.com/samuelkahessay/team-availability-service">View source</a> &middot; <a href="https://github.com/samuelkahessay/team-availability-service/pull/4">Original PR</a></p>
</div>
</body>
</html>`);
  });

  app.use('/', createAvailabilityRouter(repo));

  // Global error handler — must be after routes
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
