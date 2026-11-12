## HTTP status code classes

Every HTTP response starts with a three-digit status code. The **first digit** tells you the class of outcome; the other two narrow it down.

| Class | Meaning | Who should act |
| --- | --- | --- |
| **1xx** Informational | Request received, keep going | Nobody, it is interim |
| **2xx** Success | The request worked | Nobody |
| **3xx** Redirection | Look somewhere else | The client follows the redirect |
| **4xx** Client error | The request was wrong | Fix the request |
| **5xx** Server error | The server failed on a valid request | Fix (or wait for) the server |

### 1xx Informational

- `100 Continue` — the server got the headers; the client may send the body.
- `101 Switching Protocols` — the connection is being upgraded, for example to WebSocket.

### 2xx Success

- `200 OK` — the standard success response, with a body.
- `201 Created` — a new resource was created, typically after `POST`.
- `204 No Content` — success with nothing to return, common for `DELETE`.

### 3xx Redirection

- `301 Moved Permanently` — the resource has a new permanent URL; update links.
- `302 Found` — temporary redirect; keep using the original URL.
- `304 Not Modified` — the cached copy is still valid; no body is sent.

### 4xx Client error

- `400 Bad Request` — malformed syntax or invalid parameters.
- `401 Unauthorized` — not authenticated; log in or send credentials.
- `403 Forbidden` — authenticated, but not allowed.
- `404 Not Found` — nothing exists at this URL.
- `429 Too Many Requests` — rate limited; slow down and retry later.

### 5xx Server error

- `500 Internal Server Error` — an unhandled failure on the server.
- `502 Bad Gateway` — a proxy got an invalid response from the upstream server.
- `503 Service Unavailable` — overloaded or down for maintenance; usually temporary.
- `504 Gateway Timeout` — a proxy gave up waiting for the upstream server.

**Rule of thumb:** 4xx means retrying the same request will fail again until you change it; 5xx means the same request may succeed later.
