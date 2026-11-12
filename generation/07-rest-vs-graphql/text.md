## REST vs GraphQL for a mobile app backend

**Short version:** choose **GraphQL** when your screens stitch together data from several resources and you serve more than one client; choose **REST** when the API is mostly simple CRUD, caching matters, or the team is small and wants the least machinery.

| | REST | GraphQL |
| --- | --- | --- |
| **Shape of the API** | Many endpoints, one per resource (`/users/42`, `/users/42/posts`) | One endpoint, a typed schema, the client writes the query |
| **Fetching a screen** | Often several round trips, or a custom endpoint per screen | One request returns exactly the fields the screen needs |
| **Over- and under-fetching** | Common: fixed payloads carry unused fields or miss related data | Avoided: the client asks for specific fields |
| **Caching** | Simple: HTTP caching and CDNs work out of the box | Harder: usually `POST` to one URL, so caching moves into the client library |
| **Versioning** | `/v1`, `/v2`, or careful additive changes | Evolve the schema; deprecate fields without versions |
| **Typing and tooling** | Optional (OpenAPI) | Built in: schema, introspection, generated client types |
| **Real-time** | Add WebSockets or SSE yourself | Subscriptions are part of the spec |
| **File uploads** | Straightforward multipart | Needs an extension or a separate REST endpoint |
| **Errors and monitoring** | HTTP status codes map cleanly to dashboards | Often `200 OK` with an `errors` array; needs extra tooling |
| **Server cost and risk** | Predictable per endpoint | Must guard against expensive queries (depth limits, N+1) |
| **Learning curve** | Low; everyone knows it | Higher: schema design, resolvers, client cache |

### Why mobile changes the calculation

- **Round trips are expensive** on cellular networks. Three sequential REST calls for a profile screen can become one GraphQL query.
- **App versions live for years.** You cannot force users to update, so being able to add fields without breaking old clients matters. Both can do it, but GraphQL makes it the default.
- **Payload size affects battery and data plans.** Asking only for the fields on screen helps.

### Recommendation

- Pick **GraphQL** if you have rich, nested screens (feeds, profiles, dashboards), an iOS app, an Android app and a web client that each want different fields, and a team willing to invest in schema design.
- Pick **REST** if the app is mostly forms and lists over a few resources, you lean on CDN caching for public content, third parties will use the API, or you need to ship quickly with a small team.
- A common middle path: **REST for simple and public endpoints, plus a GraphQL layer (or a "backend for frontend") for the screens that aggregate data.**
