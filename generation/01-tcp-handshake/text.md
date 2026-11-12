## The TCP three-way handshake

Before two hosts exchange data over TCP, they agree on starting sequence numbers and confirm that each side can both send and receive. That takes three segments.

### The three steps

1. **SYN** — The client picks an initial sequence number (say `x = 1000`) and sends a segment with the `SYN` flag set. It moves to the `SYN-SENT` state.
2. **SYN-ACK** — The server replies with its own initial sequence number (`y = 5000`) and acknowledges the client's: `SYN` and `ACK` flags, `ack = x + 1 = 1001`. It moves to `SYN-RECEIVED`.
3. **ACK** — The client acknowledges the server's number: `ACK` flag, `seq = 1001`, `ack = y + 1 = 5001`. Both sides are now `ESTABLISHED` and data can flow.

```
Client                               Server
  | ---- SYN       seq=1000 -------->  |
  | <--- SYN-ACK   seq=5000 ack=1001 - |
  | ---- ACK       seq=1001 ack=5001 > |
  |          connection open           |
```

| Step | Direction | Flags | seq | ack |
| --- | --- | --- | --- | --- |
| 1 | Client → Server | SYN | 1000 | — |
| 2 | Server → Client | SYN, ACK | 5000 | 1001 |
| 3 | Client → Server | ACK | 1001 | 5001 |

### Why three, and not two?

- **Both directions must be confirmed.** Each side has to learn that the other received its sequence number. Two messages would only prove that the server can hear the client.
- **Stale requests are rejected.** If an old, delayed `SYN` arrives, the server's `SYN-ACK` goes unanswered (or is reset), so no half-real connection is opened.
- **Sequence numbers are synchronised.** Every later byte is numbered relative to `x` and `y`, which is what makes ordering and retransmission possible.

### Worth knowing

- A `SYN` consumes one sequence number, which is why each acknowledgement is "the number I received plus one".
- Initial sequence numbers are randomised so that an off-path attacker cannot guess them.
- A server keeps half-open connections in a queue while it waits for step 3. Flooding that queue is the classic **SYN flood** attack; SYN cookies are the usual defence.
- Closing a connection is a separate exchange, normally four segments (`FIN`, `ACK`, `FIN`, `ACK`).
