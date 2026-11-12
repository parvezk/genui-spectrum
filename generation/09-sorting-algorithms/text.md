## Bubble sort vs merge sort vs quicksort

| | Bubble sort | Merge sort | Quicksort |
| --- | --- | --- | --- |
| **Idea** | Swap adjacent out-of-order pairs until none remain | Split in half, sort each half, merge | Pick a pivot, partition around it, recurse |
| **Best case** | O(n) (already sorted, with early exit) | O(n log n) | O(n log n) |
| **Average case** | O(n²) | O(n log n) | O(n log n) |
| **Worst case** | O(n²) | O(n log n) | O(n²) (bad pivots) |
| **Extra space** | O(1) | O(n) | O(log n) stack |
| **Stable?** | Yes | Yes | No (typical in-place version) |
| **In place?** | Yes | No | Yes |

*Stable* means equal elements keep their original relative order, which matters when you sort records by one key after another.

### What the complexities mean in practice

For 1,000,000 items, n² is 10¹² basic steps while n log₂ n is about 2 × 10⁷. That is the difference between hours and a fraction of a second, so bubble sort is ruled out for anything large.

### When to use each

- **Bubble sort** — teaching, or tiny lists (a dozen items) that are already nearly sorted. It is simple and stable, but nothing else recommends it. Insertion sort does the same job better.
- **Merge sort** — when you need **guaranteed** O(n log n) or a **stable** sort, when sorting linked lists, or when data does not fit in memory (external sorting). The cost is O(n) extra space.
- **Quicksort** — the usual choice for in-memory arrays of primitives: it sorts in place, is cache-friendly and has small constants, so it is typically the fastest in practice. Use a random or median-of-three pivot to make the O(n²) worst case vanishingly unlikely, and avoid it when stability is required.

### What libraries actually do

Most standard libraries use hybrids: **Timsort** (merge sort plus insertion sort; stable) in Python and for objects in Java, and **introsort** (quicksort that falls back to heapsort) in C++ `std::sort`. Unless you are learning, call the library sort.
