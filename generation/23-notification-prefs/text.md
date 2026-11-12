## Notification preferences

I cannot show switches in a text reply, so here is a sensible starting point. Tell me what to change and I will apply it.

| | Email | Push | SMS |
| --- | :---: | :---: | :---: |
| **Mentions** | ✅ | ✅ | ❌ |
| **Direct messages** | ❌ | ✅ | ❌ |
| **Weekly digest** | ✅ | ❌ | ❌ |
| **Product updates** | ✅ | ❌ | ❌ |

**Quiet hours:** on, from 22:00 to 07:00. Push and SMS are held during quiet hours and delivered afterwards; email is not affected.

### Why these defaults

- **Mentions** and **direct messages** are time-sensitive, so they go to push. Mentions also go to email as a backup.
- **Weekly digest** and **product updates** are not urgent, so they are email only.
- **SMS is off everywhere.** It is the most intrusive channel; turn it on only for things you must not miss.

### How to change them

Tell me in plain words, for example:

- "Turn on SMS for direct messages."
- "No product updates at all."
- "Quiet hours from 23:00 to 06:30."
- "Turn quiet hours off."
- "Email only for everything."

Or copy this and edit it (`on` or `off` for email / push / SMS):

```
Mentions:         on  / on  / off
Direct messages:  off / on  / off
Weekly digest:    on  / off / off
Product updates:  on  / off / off
Quiet hours:      22:00 to 07:00
```
