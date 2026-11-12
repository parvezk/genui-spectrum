## Binary search

Binary search finds a value in a **sorted** list by repeatedly looking at the middle element and throwing away the half that cannot contain the target.

1. Keep two pointers, `low` and `high`, around the part of the list still in play.
2. Look at the middle element, `mid = floor((low + high) / 2)`.
3. If it is the target, stop. If it is too small, move `low` to `mid + 1`. If it is too big, move `high` to `mid - 1`.
4. Repeat until found, or until `low` passes `high` (not in the list).

### Searching for 34

The list has 11 elements, at indexes 0 to 10:

```
index:  0  1   2   3   4   5   6   7   8   9  10
value:  3  8  12  17  21  26  30  34  41  47  52
```

| Step | low | high | mid | Value at mid | Decision |
| ---: | ---: | ---: | ---: | ---: | --- |
| 1 | 0 | 10 | 5 | 26 | 26 < 34, discard the left half |
| 2 | 6 | 10 | 8 | 41 | 41 > 34, discard the right half |
| 3 | 6 | 7 | 6 | 30 | 30 < 34, discard the left half |
| 4 | 7 | 7 | 7 | 34 | Found at index 7 |

Four comparisons. A linear scan from the left would have needed eight.

### Why it is O(log n)

Each comparison cuts the remaining range roughly in half: 11 → 5 → 2 → 1. Starting from `n` elements, you can only halve about `log₂ n` times before one element is left, so the worst case is `floor(log₂ n) + 1` comparisons.

| List size | Worst-case comparisons |
| ---: | ---: |
| 11 | 4 |
| 1,000 | 10 |
| 1,000,000 | 20 |
| 1,000,000,000 | 30 |

Doubling the list adds just **one** more step. That is what logarithmic growth means.

```python
def binary_search(items, target):
    low, high = 0, len(items) - 1
    while low <= high:
        mid = (low + high) // 2
        if items[mid] == target:
            return mid
        if items[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1
```

**The catch:** the list must already be sorted, and you need random access to the middle (an array, not a linked list).
