# Yielded Trie

A zero-dependency ESM trie that stores a dynamic set of strings, character by character, supporting exact membership, prefix queries, deletion, and lexicographic iteration.

## Usage

```js
import { Trie, createTrie } from 'yielded-trie';

const t = new Trie();
t.insert('cat');
t.insert('car');
t.insert('care');

t.has('cat');             // true
t.hasPrefix('ca');        // true

for (const w of t.wordsWithPrefix('ca')) {
  console.log(w);         // 'car', 'care', 'cat'
}

t.delete('car');          // true
t.size;                   // 2

// Iterate every stored word, lexicographically:
for (const w of t) console.log(w);

const fresh = createTrie(); // convenience factory, same as new Trie()
```

## Why this exists

The problem is small but real: keep a changing collection of strings and answer "which stored strings begin with this prefix?" without scanning the whole set. A trie answers that in time proportional to the prefix length plus the number of matching results, and deletes cleanly by pruning empty branches.

The trade-off: memory per node. Each character of every stored string lives in its own `Node` with a `Map` of children. For short strings with heavy prefix sharing this is a net win over a flat `Set`; for long, mostly-unique strings a `Set` plus a sorted scan would be lighter. This library targets the former case.

## Edge cases worth knowing

- **Set semantics, not multiset.** Inserting the same string twice is idempotent — `insert` returns `true` only the first time. `delete` returns `true` only if the word was actually present. There is no reference count to surprise you.
- **The empty string is a legitimate stored word.** `insert('')` marks the root as a word end; `has('')` returns true thereafter. If your caller never sends empty strings, this never matters, but the library does not special-case it away.
- **`wordsWithPrefix('')` lists every stored word.** An empty prefix matches everything. `hasPrefix('')` is true on any non-empty trie.
- **`hasPrefix` is structural, not lexical.** It returns true if any stored word *extends* the prefix, even if the prefix itself was never inserted as a word. So `hasPrefix('ca')` is true once `'cat'` is in the trie, regardless of whether `'ca'` is.

## API

Exported from `src/index.js`:

- `class Trie` — the trie itself.
  - `insert(s: string): boolean` — add a string; `true` if new, `false` if already present. Throws `TypeError` on non-strings.
  - `has(s: string): boolean` — exact membership. Throws `TypeError` on non-strings.
  - `hasPrefix(prefix: string): boolean` — true if any stored word starts with `prefix`. Throws `TypeError` on non-strings.
  - `delete(s: string): boolean` — remove a string and prune dead branches; `true` if removed, `false` if absent. Throws `TypeError` on non-strings.
  - `wordsWithPrefix(prefix = ''): Iterable<string>` — generator yielding matches in lexicographic order. Throws `TypeError` on non-strings.
  - `[Symbol.iterator]()` — iterates every stored word, lexicographically.
  - `clear()` — empty the trie.
  - `size: number` — count of stored words.
- `createTrie(): Trie` — convenience factory, equivalent to `new Trie()`.

## Running the tests

```sh
node --test
```

## Design notes

The window stores values eagerly rather than keeping running aggregates. Running
sums drift with floating point over long streams, and recomputing from a small
buffer is cheap enough that the drift is not worth the speed.

## Limitations

Values are coerced to floats, so very large integers lose precision. If you need
exact integer aggregates over a window, this is the wrong tool.

