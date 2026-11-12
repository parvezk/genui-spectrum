## Scrum vs Kanban vs Waterfall

**For your team: Kanban.** Six people maintaining a live product with frequent urgent bug fixes need to change priorities daily without breaking a plan. Kanban is built for exactly that. Borrow a few Scrum habits (a regular retrospective and a short planning session) and you have what many maintenance teams run in practice.

| | Scrum | Kanban | Waterfall |
| --- | --- | --- | --- |
| **How work flows** | Fixed sprints (1–4 weeks) | Continuous flow | Sequential phases |
| **Planning** | At the start of each sprint | Continuous; pull the next item when there is capacity | All up front |
| **Changing priorities** | Next sprint (mid-sprint changes are discouraged) | Any time, as long as work-in-progress limits hold | Formal change request |
| **Roles** | Product Owner, Scrum Master, developers | None prescribed | Project manager, phase owners |
| **Releases** | End of each sprint | Whenever an item is done | Once, at the end |
| **Key metric** | Velocity | Cycle time, throughput | Milestones against plan |
| **Best for** | Feature development with evolving requirements | Support, maintenance and operations | Fixed scope, regulated or hardware projects |
| **Main risk** | Urgent work blows up the sprint | No cadence, so improvement and planning can drift | Late discovery of problems |

### Why Kanban fits

- **Urgent bugs do not break anything.** Add an *expedite* lane (limit: one item) that jumps the queue. In Scrum, every production incident invalidates the sprint commitment.
- **Work-in-progress limits protect focus.** With six people, a limit of about four items in progress forces the team to finish before starting something new.
- **Continuous delivery matches a live product.** Fixes ship when they are done and do not wait for a sprint boundary.
- **Cycle time is the right metric.** "How long does a bug take from report to production?" is what your users feel.

### Why not the others

- **Scrum** works if interruptions are rare. If you prefer it anyway, reserve a fixed share of each sprint (say 30%) for unplanned work, or rotate one person as the interrupt handler.
- **Waterfall** assumes requirements are known and stable. A live product with daily surprises is the opposite.

### A practical starting point

Board columns: **Backlog → Ready → In progress (limit 4) → Review (limit 3) → Done**, plus an **Expedite** lane. Hold a 15-minute daily stand-up at the board, a weekly replenishment meeting to refill Ready, and a retrospective every two weeks.
