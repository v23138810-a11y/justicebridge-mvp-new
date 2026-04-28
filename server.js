const http = require("http");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { generateComplaint, generateEscalation } = require("./public/generator");

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";
const PUBLIC_DIR = path.join(__dirname, "public");
const sessions = new Map();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

function parseCookies(header = "") {
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      })
  );
}

function getSession(req, res) {
  const cookies = parseCookies(req.headers.cookie);
  let sessionId = cookies.jb_session;

  if (!sessionId || !sessions.has(sessionId)) {
    sessionId = crypto.randomUUID();
    sessions.set(sessionId, {});
    res.setHeader("Set-Cookie", `jb_session=${encodeURIComponent(sessionId)}; Path=/; SameSite=Lax; HttpOnly`);
  }

  return sessions.get(sessionId);
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Request is too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function serveStatic(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const appRoutes = new Set(["/", "/complaint", "/document", "/rti", "/rights", "/cases"]);
  const isAppRoute = appRoutes.has(requestUrl.pathname);
  const safePath = isAppRoute ? "/index.html" : requestUrl.pathname;
  const decodedPath = decodeURIComponent(safePath);
  const filePath = path.normalize(path.join(PUBLIC_DIR, decodedPath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": mimeTypes[ext] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    res.end(data);
  });
}

async function handleApi(req, res) {
  const session = getSession(req, res);

  if (req.method === "POST" && req.url === "/api/complaint") {
    try {
      const data = await readJson(req);
      const complaint = generateComplaint(data);
      const escalation = generateEscalation(data);
      session.latestComplaint = complaint;
      session.latestEscalation = escalation;
      session.latestData = data;
      sendJson(res, 200, { complaint, escalation });
    } catch (error) {
      sendJson(res, 400, { error: error.message || "Could not generate complaint" });
    }
    return;
  }

  if (req.method === "GET" && req.url === "/api/session") {
    sendJson(res, 200, {
      complaint: session.latestComplaint || "",
      escalation: session.latestEscalation || "",
      data: session.latestData || null
    });
    return;
  }

  sendJson(res, 404, { error: "Not found" });
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith("/api/")) {
    handleApi(req, res);
    return;
  }

  serveStatic(req, res);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Stop the old server or run with PORT=3001.`);
  } else {
    console.error(error.message || error);
  }
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`JusticeBridge MVP running at ${url}`);
  console.log(`Localhost URL: ${url}`);

  if (process.env.JUSTICEBRIDGE_SMOKE_EXIT === "1") {
    server.close(() => {
      console.log("Smoke check complete; server stopped.");
    });
  }
});
