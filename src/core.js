/**
 * Yielded Trie core implementation.
 *
 * Design notes:
 * - A node's children are stored in a Map keyed by a single character.
 *   We iterate with a sorted comparator (Node.compare) so every
 *   generator yields a deterministic, lexicographic ordering without
 *   depending on insertion history or V8's Map iteration quirks.
 *   Determinism is a hard requirement for tests and for reproducible
 *   prefix listings.
 * - `wordEnd` is a boolean flag, not a counter. This set semantics is
 *   deliberate: inserting the same string twice is idempotent. A
 *   counter would let `delete` silently no-op on the second call, a
 *   surprise we'd rather avoid.
 */

/**
 * A single trie node.
 * @private
 */
class Node {
  constructor() {
    this.children = new Map();
    this.wordEnd = false;
  }

  /**
   * Total descendants, including `this` if it marks a word end.
   * Only used for an integrity check after deletion.
   */
  countWords() {
    let n = this.wordEnd ? 1 : 0;
    for (const child of this.children.values()) n += child.countWords();
    return n;
  }

  /**
   * Compare two child entries [char, Node] lexicographically by char.
   * Used to give Map iteration a stable, meaningful order.
   * @private
   */
  static compare(a, b) {
    if (a[0] < b[0]) return -1;
    if (a[0] > b[0]) return 1;
    return 0;
  }

  /**
   * Yield [char, childNode] for every child, in lexicographic order.
   * @yields {[string, Node]}
   * @private
   */
  *sortedChildren() {
    const entries = Array.from(this.children.entries());
    entries.sort(Node.compare);
    for (const e of entries) yield e;
  }
}

/**
 * A trie storing a set of strings, character by character.
 *
 * Supports insertion, exact membership, prefix queries, deletion,
 * and lexicographic iteration of stored strings.
 */
export class Trie {
  constructor() {
    this.root = new Node();
    this.size = 0;
  }

  /**
   * Add a string to the set. Idempotent: re-adding returns false.
   * @param {string} s
   * @returns {boolean} true if newly inserted, false if already present.
   * @throws {TypeError} if `s` is not a string.
   */
  insert(s) {
    if (typeof s !== 'string') {
      throw new TypeError(`insert expects a string, got ${typeof s}`);
    }
    let node = this.root;
    for (const ch of s) {
      let next = node.children.get(ch);
      if (!next) {
        next = new Node();
        node.children.set(ch, next);
      }
      node = next;
    }
    if (node.wordEnd) return false;
    node.wordEnd = true;
    this.size += 1;
    return true;
  }

  /**
   * Exact membership test.
   * @param {string} s
   * @returns {boolean}
   * @throws {TypeError} if `s` is not a string.
   */
  has(s) {
    if (typeof s !== 'string') {
      throw new TypeError(`has expects a string, got ${typeof s}`);
    }
    let node = this.root;
    for (const ch of s) {
      node = node.children.get(ch);
      if (!node) return false;
    }
    return node.wordEnd;
  }

  /**
   * True if at least one stored string starts with `prefix`.
   * An empty prefix always returns true when the trie is non-empty.
   * @param {string} prefix
   * @returns {boolean}
   * @throws {TypeError} if `prefix` is not a string.
   */
  hasPrefix(prefix) {
    if (typeof prefix !== 'string') {
      throw new TypeError(`hasPrefix expects a string, got ${typeof prefix}`);
    }
    let node = this.root;
    for (const ch of prefix) {
      node = node.children.get(ch);
      if (!node) return false;
    }
    return true;
  }

  /**
   * Remove a string from the set. Idempotent: returns false if absent.
   * @param {string} s
   * @returns {boolean} true if removed, false if not present.
   * @throws {TypeError} if `s` is not a string.
   */
  delete(s) {
    if (typeof s !== 'string') {
      throw new TypeError(`delete expects a string, got ${typeof s}`);
    }
    const stack = [];
    let node = this.root;
    for (const ch of s) {
      node = node.children.get(ch);
      if (!node) return false;
      stack.push([ch, node]);
    }
    if (!node.wordEnd) return false;
    node.wordEnd = false;
    this.size -= 1;

    // Prune empty subtrees from the leaf back toward the root.
    // A node can be unlinked from its parent when it neither marks
    // a word end nor has any children — otherwise the prefix path
    // is still load-bearing for some other stored string.
    while (stack.length > 0) {
      const [ch, n] = stack.pop();
      if (!n.wordEnd && n.children.size === 0) {
        const parent = stack.length > 0 ? stack[stack.length - 1][1] : this.root;
        parent.children.delete(ch);
      } else {
        break;
      }
    }
    return true;
  }

  /**
   * Yield every stored string starting with `prefix`, in lexicographic
   * order. The prefix itself is yielded only if it was inserted as a
   * complete word. Strings are reconstructed as we walk, not stored
   * at each node, to keep memory proportional to distinct characters
   * rather than to total string bytes.
   * @param {string} [prefix='']
   * @yields {string}
   * @throws {TypeError} if `prefix` is not a string.
   */
  *wordsWithPrefix(prefix = '') {
    if (typeof prefix !== 'string') {
      throw new TypeError(`wordsWithPrefix expects a string, got ${typeof prefix}`);
    }
    let node = this.root;
    for (const ch of prefix) {
      node = node.children.get(ch);
      if (!node) return;
    }
    yield* this._walk(node, prefix);
  }

  /**
   * Yield every stored string in lexicographic order.
   * @yields {string}
   */
  *[Symbol.iterator]() {
    yield* this._walk(this.root, '');
  }

  /**
   * Depth-first walk emitting complete words. Children are visited
   * in sorted order so output is deterministic across runs.
   * @param {Node} node
   * @param {string} acc
   * @yields {string}
   * @private
   */
  *_walk(node, acc) {
    if (node.wordEnd) yield acc;
    for (const [ch, child] of node.sortedChildren()) {
      yield* this._walk(child, acc + ch);
    }
  }

  /**
   * Empty the trie entirely.
   */
  clear() {
    this.root = new Node();
    this.size = 0;
  }
}

/**
 * Convenience factory: returns a fresh empty Trie.
 * @returns {Trie}
 */
export function createTrie() {
  return new Trie();
}
