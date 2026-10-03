import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Trie, createTrie } from '../src/index.js';

test('insert returns true once and false on duplicate', () => {
  const t = new Trie();
  assert.equal(t.insert('cat'), true);
  assert.equal(t.insert('cat'), false);
  assert.equal(t.size, 1);
});

test('has reports exact membership only', () => {
  const t = new Trie();
  t.insert('cat');
  assert.equal(t.has('cat'), true);
  assert.equal(t.has('ca'), false);
  assert.equal(t.has('cats'), false);
  assert.equal(t.has(''), false);
});

test('the empty string is a valid stored word', () => {
  const t = new Trie();
  assert.equal(t.insert(''), true);
  assert.equal(t.has(''), true);
  assert.equal(t.size, 1);
  assert.deepEqual(Array.from(t), ['']);
});

test('hasPrefix detects stored prefixes, not just complete words', () => {
  const t = new Trie();
  t.insert('cat');
  t.insert('car');
  assert.equal(t.hasPrefix('ca'), true);
  assert.equal(t.hasPrefix('cat'), true);
  assert.equal(t.hasPrefix('car'), true);
  assert.equal(t.hasPrefix('can'), false);
  assert.equal(t.hasPrefix(''), true);
});

test('wordsWithPrefix yields matches in lexicographic order', () => {
  const t = new Trie();
  for (const w of ['banana', 'apple', 'apricot', 'berry', 'application']) t.insert(w);
  assert.deepEqual(Array.from(t.wordsWithPrefix('ap')), ['apple', 'application', 'apricot']);
});

test('wordsWithPrefix with empty prefix lists every word', () => {
  const t = new Trie();
  for (const w of ['dog', 'cat', 'car']) t.insert(w);
  assert.deepEqual(Array.from(t.wordsWithPrefix('')), ['car', 'cat', 'dog']);
});

test('wordsWithPrefix yields nothing for an unknown prefix', () => {
  const t = new Trie();
  t.insert('hello');
  assert.deepEqual(Array.from(t.wordsWithPrefix('xyz')), []);
});

test('delete returns true once and false when absent', () => {
  const t = new Trie();
  t.insert('cat');
  assert.equal(t.delete('cat'), true);
  assert.equal(t.delete('cat'), false);
  assert.equal(t.has('cat'), false);
  assert.equal(t.size, 0);
});

test('delete prunes empty branches but keeps shared prefixes', () => {
  const t = new Trie();
  t.insert('cat');
  t.insert('car');
  t.insert('care');
  t.delete('car');
  assert.equal(t.has('car'), false);
  assert.equal(t.has('cat'), true);
  assert.equal(t.has('care'), true);
  assert.deepEqual(Array.from(t.wordsWithPrefix('ca')), ['care', 'cat']);
  assert.equal(t.size, 2);
});

test('delete does not remove the prefix word when a longer word shares it', () => {
  const t = new Trie();
  t.insert('cat');
  t.insert('cats');
  t.delete('cats');
  assert.equal(t.has('cat'), true);
  assert.equal(t.has('cats'), false);
});

test('iterator yields all words sorted, ignoring uninserted prefixes', () => {
  const t = new Trie();
  for (const w of ['m', 'mid', 'midsummer', 'a']) t.insert(w);
  assert.deepEqual(Array.from(t), ['a', 'm', 'mid', 'midsummer']);
});

test('clear empties the trie', () => {
  const t = new Trie();
  t.insert('cat');
  t.insert('car');
  t.clear();
  assert.equal(t.size, 0);
  assert.equal(t.has('cat'), false);
  assert.equal(t.hasPrefix('c'), false);
  assert.deepEqual(Array.from(t), []);
});

test('insert rejects non-string input', () => {
  const t = new Trie();
  assert.throws(() => t.insert(42), TypeError);
  assert.throws(() => t.insert(null), TypeError);
});

test('has rejects non-string input', () => {
  const t = new Trie();
  assert.throws(() => t.has(42), TypeError);
});

test('hasPrefix rejects non-string input', () => {
  const t = new Trie();
  assert.throws(() => t.hasPrefix(42), TypeError);
});

test('delete rejects non-string input', () => {
  const t = new Trie();
  assert.throws(() => t.delete(42), TypeError);
});

test('wordsWithPrefix rejects non-string input', () => {
  const t = new Trie();
  assert.throws(() => Array.from(t.wordsWithPrefix(42)), TypeError);
});

test('createTrie returns a usable Trie instance', () => {
  const t = createTrie();
  assert.ok(t instanceof Trie);
  t.insert('hello');
  assert.equal(t.has('hello'), true);
});

test('shared intermediate nodes are not collapsed when only one branch is pruned', () => {
  const t = new Trie();
  t.insert('ab');
  t.insert('ac');
  t.delete('ab');
  assert.equal(t.has('ac'), true);
  assert.equal(t.hasPrefix('a'), true);
  assert.equal(t.hasPrefix('ab'), false);
});

test('reinserting a pruned word works after deletion', () => {
  const t = new Trie();
  t.insert('cat');
  t.delete('cat');
  assert.equal(t.insert('cat'), true);
  assert.equal(t.has('cat'), true);
  assert.equal(t.size, 1);
});

test('a trie with branching children sorts by the branch character', () => {
  const t = new Trie();
  t.insert('c');
  t.insert('a');
  t.insert('b');
  assert.deepEqual(Array.from(t), ['a', 'b', 'c']);
});

test('empty trie has empty iteration and empty prefix listing', () => {
  const t = new Trie();
  assert.deepEqual(Array.from(t), []);
  assert.deepEqual(Array.from(t.wordsWithPrefix('')), []);
  assert.equal(t.size, 0);
});

test('inserting a word then a longer word that extends it keeps both', () => {
  const t = new Trie();
  t.insert('to');
  t.insert('today');
  assert.equal(t.has('to'), true);
  assert.equal(t.has('today'), true);
  assert.deepEqual(Array.from(t.wordsWithPrefix('to')), ['to', 'today']);
});

test('inserting a longer word then its prefix as a word keeps both', () => {
  const t = new Trie();
  t.insert('today');
  t.insert('to');
  assert.equal(t.has('to'), true);
  assert.equal(t.has('today'), true);
  assert.deepEqual(Array.from(t.wordsWithPrefix('to')), ['to', 'today']);
});

test('deleting the prefix word keeps the longer word intact', () => {
  const t = new Trie();
  t.insert('to');
  t.insert('today');
  t.delete('to');
  assert.equal(t.has('to'), false);
  assert.equal(t.has('today'), true);
  assert.deepEqual(Array.from(t.wordsWithPrefix('to')), ['today']);
});
