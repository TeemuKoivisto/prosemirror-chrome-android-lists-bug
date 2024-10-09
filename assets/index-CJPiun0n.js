(function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) {
    return;
  }
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) {
    processPreload(link);
  }
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") {
        continue;
      }
      for (const node of mutation.addedNodes) {
        if (node.tagName === "LINK" && node.rel === "modulepreload")
          processPreload(node);
      }
    }
  }).observe(document, { childList: true, subtree: true });
  function getFetchOpts(link) {
    const fetchOpts = {};
    if (link.integrity) fetchOpts.integrity = link.integrity;
    if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
    if (link.crossOrigin === "use-credentials")
      fetchOpts.credentials = "include";
    else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
    else fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep)
      return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
})();
function OrderedMap(content) {
  this.content = content;
}
OrderedMap.prototype = {
  constructor: OrderedMap,
  find: function(key) {
    for (var i = 0; i < this.content.length; i += 2)
      if (this.content[i] === key) return i;
    return -1;
  },
  // :: (string) → ?any
  // Retrieve the value stored under `key`, or return undefined when
  // no such key exists.
  get: function(key) {
    var found2 = this.find(key);
    return found2 == -1 ? void 0 : this.content[found2 + 1];
  },
  // :: (string, any, ?string) → OrderedMap
  // Create a new map by replacing the value of `key` with a new
  // value, or adding a binding to the end of the map. If `newKey` is
  // given, the key of the binding will be replaced with that key.
  update: function(key, value, newKey) {
    var self = newKey && newKey != key ? this.remove(newKey) : this;
    var found2 = self.find(key), content = self.content.slice();
    if (found2 == -1) {
      content.push(newKey || key, value);
    } else {
      content[found2 + 1] = value;
      if (newKey) content[found2] = newKey;
    }
    return new OrderedMap(content);
  },
  // :: (string) → OrderedMap
  // Return a map with the given key removed, if it existed.
  remove: function(key) {
    var found2 = this.find(key);
    if (found2 == -1) return this;
    var content = this.content.slice();
    content.splice(found2, 2);
    return new OrderedMap(content);
  },
  // :: (string, any) → OrderedMap
  // Add a new key to the start of the map.
  addToStart: function(key, value) {
    return new OrderedMap([key, value].concat(this.remove(key).content));
  },
  // :: (string, any) → OrderedMap
  // Add a new key to the end of the map.
  addToEnd: function(key, value) {
    var content = this.remove(key).content.slice();
    content.push(key, value);
    return new OrderedMap(content);
  },
  // :: (string, string, any) → OrderedMap
  // Add a key after the given key. If `place` is not found, the new
  // key is added to the end.
  addBefore: function(place, key, value) {
    var without = this.remove(key), content = without.content.slice();
    var found2 = without.find(place);
    content.splice(found2 == -1 ? content.length : found2, 0, key, value);
    return new OrderedMap(content);
  },
  // :: ((key: string, value: any))
  // Call the given function for each key/value pair in the map, in
  // order.
  forEach: function(f) {
    for (var i = 0; i < this.content.length; i += 2)
      f(this.content[i], this.content[i + 1]);
  },
  // :: (union<Object, OrderedMap>) → OrderedMap
  // Create a new map by prepending the keys in this map that don't
  // appear in `map` before the keys in `map`.
  prepend: function(map) {
    map = OrderedMap.from(map);
    if (!map.size) return this;
    return new OrderedMap(map.content.concat(this.subtract(map).content));
  },
  // :: (union<Object, OrderedMap>) → OrderedMap
  // Create a new map by appending the keys in this map that don't
  // appear in `map` after the keys in `map`.
  append: function(map) {
    map = OrderedMap.from(map);
    if (!map.size) return this;
    return new OrderedMap(this.subtract(map).content.concat(map.content));
  },
  // :: (union<Object, OrderedMap>) → OrderedMap
  // Create a map containing all the keys in this map that don't
  // appear in `map`.
  subtract: function(map) {
    var result = this;
    map = OrderedMap.from(map);
    for (var i = 0; i < map.content.length; i += 2)
      result = result.remove(map.content[i]);
    return result;
  },
  // :: () → Object
  // Turn ordered map into a plain object.
  toObject: function() {
    var result = {};
    this.forEach(function(key, value) {
      result[key] = value;
    });
    return result;
  },
  // :: number
  // The amount of keys in this map.
  get size() {
    return this.content.length >> 1;
  }
};
OrderedMap.from = function(value) {
  if (value instanceof OrderedMap) return value;
  var content = [];
  if (value) for (var prop in value) content.push(prop, value[prop]);
  return new OrderedMap(content);
};
function findDiffStart(a, b, pos) {
  for (let i = 0; ; i++) {
    if (i == a.childCount || i == b.childCount)
      return a.childCount == b.childCount ? null : pos;
    let childA = a.child(i), childB = b.child(i);
    if (childA == childB) {
      pos += childA.nodeSize;
      continue;
    }
    if (!childA.sameMarkup(childB))
      return pos;
    if (childA.isText && childA.text != childB.text) {
      for (let j = 0; childA.text[j] == childB.text[j]; j++)
        pos++;
      return pos;
    }
    if (childA.content.size || childB.content.size) {
      let inner = findDiffStart(childA.content, childB.content, pos + 1);
      if (inner != null)
        return inner;
    }
    pos += childA.nodeSize;
  }
}
function findDiffEnd(a, b, posA, posB) {
  for (let iA = a.childCount, iB = b.childCount; ; ) {
    if (iA == 0 || iB == 0)
      return iA == iB ? null : { a: posA, b: posB };
    let childA = a.child(--iA), childB = b.child(--iB), size = childA.nodeSize;
    if (childA == childB) {
      posA -= size;
      posB -= size;
      continue;
    }
    if (!childA.sameMarkup(childB))
      return { a: posA, b: posB };
    if (childA.isText && childA.text != childB.text) {
      let same = 0, minSize = Math.min(childA.text.length, childB.text.length);
      while (same < minSize && childA.text[childA.text.length - same - 1] == childB.text[childB.text.length - same - 1]) {
        same++;
        posA--;
        posB--;
      }
      return { a: posA, b: posB };
    }
    if (childA.content.size || childB.content.size) {
      let inner = findDiffEnd(childA.content, childB.content, posA - 1, posB - 1);
      if (inner)
        return inner;
    }
    posA -= size;
    posB -= size;
  }
}
class Fragment {
  /**
  @internal
  */
  constructor(content, size) {
    this.content = content;
    this.size = size || 0;
    if (size == null)
      for (let i = 0; i < content.length; i++)
        this.size += content[i].nodeSize;
  }
  /**
  Invoke a callback for all descendant nodes between the given two
  positions (relative to start of this fragment). Doesn't descend
  into a node when the callback returns `false`.
  */
  nodesBetween(from, to, f, nodeStart = 0, parent) {
    for (let i = 0, pos = 0; pos < to; i++) {
      let child = this.content[i], end = pos + child.nodeSize;
      if (end > from && f(child, nodeStart + pos, parent || null, i) !== false && child.content.size) {
        let start = pos + 1;
        child.nodesBetween(Math.max(0, from - start), Math.min(child.content.size, to - start), f, nodeStart + start);
      }
      pos = end;
    }
  }
  /**
  Call the given callback for every descendant node. `pos` will be
  relative to the start of the fragment. The callback may return
  `false` to prevent traversal of a given node's children.
  */
  descendants(f) {
    this.nodesBetween(0, this.size, f);
  }
  /**
  Extract the text between `from` and `to`. See the same method on
  [`Node`](https://prosemirror.net/docs/ref/#model.Node.textBetween).
  */
  textBetween(from, to, blockSeparator, leafText) {
    let text2 = "", first = true;
    this.nodesBetween(from, to, (node, pos) => {
      let nodeText = node.isText ? node.text.slice(Math.max(from, pos) - pos, to - pos) : !node.isLeaf ? "" : leafText ? typeof leafText === "function" ? leafText(node) : leafText : node.type.spec.leafText ? node.type.spec.leafText(node) : "";
      if (node.isBlock && (node.isLeaf && nodeText || node.isTextblock) && blockSeparator) {
        if (first)
          first = false;
        else
          text2 += blockSeparator;
      }
      text2 += nodeText;
    }, 0);
    return text2;
  }
  /**
  Create a new fragment containing the combined content of this
  fragment and the other.
  */
  append(other) {
    if (!other.size)
      return this;
    if (!this.size)
      return other;
    let last = this.lastChild, first = other.firstChild, content = this.content.slice(), i = 0;
    if (last.isText && last.sameMarkup(first)) {
      content[content.length - 1] = last.withText(last.text + first.text);
      i = 1;
    }
    for (; i < other.content.length; i++)
      content.push(other.content[i]);
    return new Fragment(content, this.size + other.size);
  }
  /**
  Cut out the sub-fragment between the two given positions.
  */
  cut(from, to = this.size) {
    if (from == 0 && to == this.size)
      return this;
    let result = [], size = 0;
    if (to > from)
      for (let i = 0, pos = 0; pos < to; i++) {
        let child = this.content[i], end = pos + child.nodeSize;
        if (end > from) {
          if (pos < from || end > to) {
            if (child.isText)
              child = child.cut(Math.max(0, from - pos), Math.min(child.text.length, to - pos));
            else
              child = child.cut(Math.max(0, from - pos - 1), Math.min(child.content.size, to - pos - 1));
          }
          result.push(child);
          size += child.nodeSize;
        }
        pos = end;
      }
    return new Fragment(result, size);
  }
  /**
  @internal
  */
  cutByIndex(from, to) {
    if (from == to)
      return Fragment.empty;
    if (from == 0 && to == this.content.length)
      return this;
    return new Fragment(this.content.slice(from, to));
  }
  /**
  Create a new fragment in which the node at the given index is
  replaced by the given node.
  */
  replaceChild(index, node) {
    let current = this.content[index];
    if (current == node)
      return this;
    let copy2 = this.content.slice();
    let size = this.size + node.nodeSize - current.nodeSize;
    copy2[index] = node;
    return new Fragment(copy2, size);
  }
  /**
  Create a new fragment by prepending the given node to this
  fragment.
  */
  addToStart(node) {
    return new Fragment([node].concat(this.content), this.size + node.nodeSize);
  }
  /**
  Create a new fragment by appending the given node to this
  fragment.
  */
  addToEnd(node) {
    return new Fragment(this.content.concat(node), this.size + node.nodeSize);
  }
  /**
  Compare this fragment to another one.
  */
  eq(other) {
    if (this.content.length != other.content.length)
      return false;
    for (let i = 0; i < this.content.length; i++)
      if (!this.content[i].eq(other.content[i]))
        return false;
    return true;
  }
  /**
  The first child of the fragment, or `null` if it is empty.
  */
  get firstChild() {
    return this.content.length ? this.content[0] : null;
  }
  /**
  The last child of the fragment, or `null` if it is empty.
  */
  get lastChild() {
    return this.content.length ? this.content[this.content.length - 1] : null;
  }
  /**
  The number of child nodes in this fragment.
  */
  get childCount() {
    return this.content.length;
  }
  /**
  Get the child node at the given index. Raise an error when the
  index is out of range.
  */
  child(index) {
    let found2 = this.content[index];
    if (!found2)
      throw new RangeError("Index " + index + " out of range for " + this);
    return found2;
  }
  /**
  Get the child node at the given index, if it exists.
  */
  maybeChild(index) {
    return this.content[index] || null;
  }
  /**
  Call `f` for every child node, passing the node, its offset
  into this parent node, and its index.
  */
  forEach(f) {
    for (let i = 0, p = 0; i < this.content.length; i++) {
      let child = this.content[i];
      f(child, p, i);
      p += child.nodeSize;
    }
  }
  /**
  Find the first position at which this fragment and another
  fragment differ, or `null` if they are the same.
  */
  findDiffStart(other, pos = 0) {
    return findDiffStart(this, other, pos);
  }
  /**
  Find the first position, searching from the end, at which this
  fragment and the given fragment differ, or `null` if they are
  the same. Since this position will not be the same in both
  nodes, an object with two separate positions is returned.
  */
  findDiffEnd(other, pos = this.size, otherPos = other.size) {
    return findDiffEnd(this, other, pos, otherPos);
  }
  /**
  Find the index and inner offset corresponding to a given relative
  position in this fragment. The result object will be reused
  (overwritten) the next time the function is called. @internal
  */
  findIndex(pos, round = -1) {
    if (pos == 0)
      return retIndex(0, pos);
    if (pos == this.size)
      return retIndex(this.content.length, pos);
    if (pos > this.size || pos < 0)
      throw new RangeError(`Position ${pos} outside of fragment (${this})`);
    for (let i = 0, curPos = 0; ; i++) {
      let cur = this.child(i), end = curPos + cur.nodeSize;
      if (end >= pos) {
        if (end == pos || round > 0)
          return retIndex(i + 1, end);
        return retIndex(i, curPos);
      }
      curPos = end;
    }
  }
  /**
  Return a debugging string that describes this fragment.
  */
  toString() {
    return "<" + this.toStringInner() + ">";
  }
  /**
  @internal
  */
  toStringInner() {
    return this.content.join(", ");
  }
  /**
  Create a JSON-serializeable representation of this fragment.
  */
  toJSON() {
    return this.content.length ? this.content.map((n) => n.toJSON()) : null;
  }
  /**
  Deserialize a fragment from its JSON representation.
  */
  static fromJSON(schema2, value) {
    if (!value)
      return Fragment.empty;
    if (!Array.isArray(value))
      throw new RangeError("Invalid input for Fragment.fromJSON");
    return new Fragment(value.map(schema2.nodeFromJSON));
  }
  /**
  Build a fragment from an array of nodes. Ensures that adjacent
  text nodes with the same marks are joined together.
  */
  static fromArray(array) {
    if (!array.length)
      return Fragment.empty;
    let joined, size = 0;
    for (let i = 0; i < array.length; i++) {
      let node = array[i];
      size += node.nodeSize;
      if (i && node.isText && array[i - 1].sameMarkup(node)) {
        if (!joined)
          joined = array.slice(0, i);
        joined[joined.length - 1] = node.withText(joined[joined.length - 1].text + node.text);
      } else if (joined) {
        joined.push(node);
      }
    }
    return new Fragment(joined || array, size);
  }
  /**
  Create a fragment from something that can be interpreted as a
  set of nodes. For `null`, it returns the empty fragment. For a
  fragment, the fragment itself. For a node or array of nodes, a
  fragment containing those nodes.
  */
  static from(nodes) {
    if (!nodes)
      return Fragment.empty;
    if (nodes instanceof Fragment)
      return nodes;
    if (Array.isArray(nodes))
      return this.fromArray(nodes);
    if (nodes.attrs)
      return new Fragment([nodes], nodes.nodeSize);
    throw new RangeError("Can not convert " + nodes + " to a Fragment" + (nodes.nodesBetween ? " (looks like multiple versions of prosemirror-model were loaded)" : ""));
  }
}
Fragment.empty = new Fragment([], 0);
const found = { index: 0, offset: 0 };
function retIndex(index, offset) {
  found.index = index;
  found.offset = offset;
  return found;
}
function compareDeep(a, b) {
  if (a === b)
    return true;
  if (!(a && typeof a == "object") || !(b && typeof b == "object"))
    return false;
  let array = Array.isArray(a);
  if (Array.isArray(b) != array)
    return false;
  if (array) {
    if (a.length != b.length)
      return false;
    for (let i = 0; i < a.length; i++)
      if (!compareDeep(a[i], b[i]))
        return false;
  } else {
    for (let p in a)
      if (!(p in b) || !compareDeep(a[p], b[p]))
        return false;
    for (let p in b)
      if (!(p in a))
        return false;
  }
  return true;
}
class Mark {
  /**
  @internal
  */
  constructor(type, attrs) {
    this.type = type;
    this.attrs = attrs;
  }
  /**
  Given a set of marks, create a new set which contains this one as
  well, in the right position. If this mark is already in the set,
  the set itself is returned. If any marks that are set to be
  [exclusive](https://prosemirror.net/docs/ref/#model.MarkSpec.excludes) with this mark are present,
  those are replaced by this one.
  */
  addToSet(set) {
    let copy2, placed = false;
    for (let i = 0; i < set.length; i++) {
      let other = set[i];
      if (this.eq(other))
        return set;
      if (this.type.excludes(other.type)) {
        if (!copy2)
          copy2 = set.slice(0, i);
      } else if (other.type.excludes(this.type)) {
        return set;
      } else {
        if (!placed && other.type.rank > this.type.rank) {
          if (!copy2)
            copy2 = set.slice(0, i);
          copy2.push(this);
          placed = true;
        }
        if (copy2)
          copy2.push(other);
      }
    }
    if (!copy2)
      copy2 = set.slice();
    if (!placed)
      copy2.push(this);
    return copy2;
  }
  /**
  Remove this mark from the given set, returning a new set. If this
  mark is not in the set, the set itself is returned.
  */
  removeFromSet(set) {
    for (let i = 0; i < set.length; i++)
      if (this.eq(set[i]))
        return set.slice(0, i).concat(set.slice(i + 1));
    return set;
  }
  /**
  Test whether this mark is in the given set of marks.
  */
  isInSet(set) {
    for (let i = 0; i < set.length; i++)
      if (this.eq(set[i]))
        return true;
    return false;
  }
  /**
  Test whether this mark has the same type and attributes as
  another mark.
  */
  eq(other) {
    return this == other || this.type == other.type && compareDeep(this.attrs, other.attrs);
  }
  /**
  Convert this mark to a JSON-serializeable representation.
  */
  toJSON() {
    let obj = { type: this.type.name };
    for (let _ in this.attrs) {
      obj.attrs = this.attrs;
      break;
    }
    return obj;
  }
  /**
  Deserialize a mark from JSON.
  */
  static fromJSON(schema2, json) {
    if (!json)
      throw new RangeError("Invalid input for Mark.fromJSON");
    let type = schema2.marks[json.type];
    if (!type)
      throw new RangeError(`There is no mark type ${json.type} in this schema`);
    let mark = type.create(json.attrs);
    type.checkAttrs(mark.attrs);
    return mark;
  }
  /**
  Test whether two sets of marks are identical.
  */
  static sameSet(a, b) {
    if (a == b)
      return true;
    if (a.length != b.length)
      return false;
    for (let i = 0; i < a.length; i++)
      if (!a[i].eq(b[i]))
        return false;
    return true;
  }
  /**
  Create a properly sorted mark set from null, a single mark, or an
  unsorted array of marks.
  */
  static setFrom(marks) {
    if (!marks || Array.isArray(marks) && marks.length == 0)
      return Mark.none;
    if (marks instanceof Mark)
      return [marks];
    let copy2 = marks.slice();
    copy2.sort((a, b) => a.type.rank - b.type.rank);
    return copy2;
  }
}
Mark.none = [];
class ReplaceError extends Error {
}
class Slice {
  /**
  Create a slice. When specifying a non-zero open depth, you must
  make sure that there are nodes of at least that depth at the
  appropriate side of the fragment—i.e. if the fragment is an
  empty paragraph node, `openStart` and `openEnd` can't be greater
  than 1.
  
  It is not necessary for the content of open nodes to conform to
  the schema's content constraints, though it should be a valid
  start/end/middle for such a node, depending on which sides are
  open.
  */
  constructor(content, openStart, openEnd) {
    this.content = content;
    this.openStart = openStart;
    this.openEnd = openEnd;
  }
  /**
  The size this slice would add when inserted into a document.
  */
  get size() {
    return this.content.size - this.openStart - this.openEnd;
  }
  /**
  @internal
  */
  insertAt(pos, fragment) {
    let content = insertInto(this.content, pos + this.openStart, fragment);
    return content && new Slice(content, this.openStart, this.openEnd);
  }
  /**
  @internal
  */
  removeBetween(from, to) {
    return new Slice(removeRange(this.content, from + this.openStart, to + this.openStart), this.openStart, this.openEnd);
  }
  /**
  Tests whether this slice is equal to another slice.
  */
  eq(other) {
    return this.content.eq(other.content) && this.openStart == other.openStart && this.openEnd == other.openEnd;
  }
  /**
  @internal
  */
  toString() {
    return this.content + "(" + this.openStart + "," + this.openEnd + ")";
  }
  /**
  Convert a slice to a JSON-serializable representation.
  */
  toJSON() {
    if (!this.content.size)
      return null;
    let json = { content: this.content.toJSON() };
    if (this.openStart > 0)
      json.openStart = this.openStart;
    if (this.openEnd > 0)
      json.openEnd = this.openEnd;
    return json;
  }
  /**
  Deserialize a slice from its JSON representation.
  */
  static fromJSON(schema2, json) {
    if (!json)
      return Slice.empty;
    let openStart = json.openStart || 0, openEnd = json.openEnd || 0;
    if (typeof openStart != "number" || typeof openEnd != "number")
      throw new RangeError("Invalid input for Slice.fromJSON");
    return new Slice(Fragment.fromJSON(schema2, json.content), openStart, openEnd);
  }
  /**
  Create a slice from a fragment by taking the maximum possible
  open value on both side of the fragment.
  */
  static maxOpen(fragment, openIsolating = true) {
    let openStart = 0, openEnd = 0;
    for (let n = fragment.firstChild; n && !n.isLeaf && (openIsolating || !n.type.spec.isolating); n = n.firstChild)
      openStart++;
    for (let n = fragment.lastChild; n && !n.isLeaf && (openIsolating || !n.type.spec.isolating); n = n.lastChild)
      openEnd++;
    return new Slice(fragment, openStart, openEnd);
  }
}
Slice.empty = new Slice(Fragment.empty, 0, 0);
function removeRange(content, from, to) {
  let { index, offset } = content.findIndex(from), child = content.maybeChild(index);
  let { index: indexTo, offset: offsetTo } = content.findIndex(to);
  if (offset == from || child.isText) {
    if (offsetTo != to && !content.child(indexTo).isText)
      throw new RangeError("Removing non-flat range");
    return content.cut(0, from).append(content.cut(to));
  }
  if (index != indexTo)
    throw new RangeError("Removing non-flat range");
  return content.replaceChild(index, child.copy(removeRange(child.content, from - offset - 1, to - offset - 1)));
}
function insertInto(content, dist, insert2, parent) {
  let { index, offset } = content.findIndex(dist), child = content.maybeChild(index);
  if (offset == dist || child.isText) {
    return content.cut(0, dist).append(insert2).append(content.cut(dist));
  }
  let inner = insertInto(child.content, dist - offset - 1, insert2);
  return inner && content.replaceChild(index, child.copy(inner));
}
function replace($from, $to, slice) {
  if (slice.openStart > $from.depth)
    throw new ReplaceError("Inserted content deeper than insertion position");
  if ($from.depth - slice.openStart != $to.depth - slice.openEnd)
    throw new ReplaceError("Inconsistent open depths");
  return replaceOuter($from, $to, slice, 0);
}
function replaceOuter($from, $to, slice, depth) {
  let index = $from.index(depth), node = $from.node(depth);
  if (index == $to.index(depth) && depth < $from.depth - slice.openStart) {
    let inner = replaceOuter($from, $to, slice, depth + 1);
    return node.copy(node.content.replaceChild(index, inner));
  } else if (!slice.content.size) {
    return close(node, replaceTwoWay($from, $to, depth));
  } else if (!slice.openStart && !slice.openEnd && $from.depth == depth && $to.depth == depth) {
    let parent = $from.parent, content = parent.content;
    return close(parent, content.cut(0, $from.parentOffset).append(slice.content).append(content.cut($to.parentOffset)));
  } else {
    let { start, end } = prepareSliceForReplace(slice, $from);
    return close(node, replaceThreeWay($from, start, end, $to, depth));
  }
}
function checkJoin(main, sub) {
  if (!sub.type.compatibleContent(main.type))
    throw new ReplaceError("Cannot join " + sub.type.name + " onto " + main.type.name);
}
function joinable($before, $after, depth) {
  let node = $before.node(depth);
  checkJoin(node, $after.node(depth));
  return node;
}
function addNode(child, target) {
  let last = target.length - 1;
  if (last >= 0 && child.isText && child.sameMarkup(target[last]))
    target[last] = child.withText(target[last].text + child.text);
  else
    target.push(child);
}
function addRange($start, $end, depth, target) {
  let node = ($end || $start).node(depth);
  let startIndex = 0, endIndex = $end ? $end.index(depth) : node.childCount;
  if ($start) {
    startIndex = $start.index(depth);
    if ($start.depth > depth) {
      startIndex++;
    } else if ($start.textOffset) {
      addNode($start.nodeAfter, target);
      startIndex++;
    }
  }
  for (let i = startIndex; i < endIndex; i++)
    addNode(node.child(i), target);
  if ($end && $end.depth == depth && $end.textOffset)
    addNode($end.nodeBefore, target);
}
function close(node, content) {
  node.type.checkContent(content);
  return node.copy(content);
}
function replaceThreeWay($from, $start, $end, $to, depth) {
  let openStart = $from.depth > depth && joinable($from, $start, depth + 1);
  let openEnd = $to.depth > depth && joinable($end, $to, depth + 1);
  let content = [];
  addRange(null, $from, depth, content);
  if (openStart && openEnd && $start.index(depth) == $end.index(depth)) {
    checkJoin(openStart, openEnd);
    addNode(close(openStart, replaceThreeWay($from, $start, $end, $to, depth + 1)), content);
  } else {
    if (openStart)
      addNode(close(openStart, replaceTwoWay($from, $start, depth + 1)), content);
    addRange($start, $end, depth, content);
    if (openEnd)
      addNode(close(openEnd, replaceTwoWay($end, $to, depth + 1)), content);
  }
  addRange($to, null, depth, content);
  return new Fragment(content);
}
function replaceTwoWay($from, $to, depth) {
  let content = [];
  addRange(null, $from, depth, content);
  if ($from.depth > depth) {
    let type = joinable($from, $to, depth + 1);
    addNode(close(type, replaceTwoWay($from, $to, depth + 1)), content);
  }
  addRange($to, null, depth, content);
  return new Fragment(content);
}
function prepareSliceForReplace(slice, $along) {
  let extra = $along.depth - slice.openStart, parent = $along.node(extra);
  let node = parent.copy(slice.content);
  for (let i = extra - 1; i >= 0; i--)
    node = $along.node(i).copy(Fragment.from(node));
  return {
    start: node.resolveNoCache(slice.openStart + extra),
    end: node.resolveNoCache(node.content.size - slice.openEnd - extra)
  };
}
class ResolvedPos {
  /**
  @internal
  */
  constructor(pos, path, parentOffset) {
    this.pos = pos;
    this.path = path;
    this.parentOffset = parentOffset;
    this.depth = path.length / 3 - 1;
  }
  /**
  @internal
  */
  resolveDepth(val) {
    if (val == null)
      return this.depth;
    if (val < 0)
      return this.depth + val;
    return val;
  }
  /**
  The parent node that the position points into. Note that even if
  a position points into a text node, that node is not considered
  the parent—text nodes are ‘flat’ in this model, and have no content.
  */
  get parent() {
    return this.node(this.depth);
  }
  /**
  The root node in which the position was resolved.
  */
  get doc() {
    return this.node(0);
  }
  /**
  The ancestor node at the given level. `p.node(p.depth)` is the
  same as `p.parent`.
  */
  node(depth) {
    return this.path[this.resolveDepth(depth) * 3];
  }
  /**
  The index into the ancestor at the given level. If this points
  at the 3rd node in the 2nd paragraph on the top level, for
  example, `p.index(0)` is 1 and `p.index(1)` is 2.
  */
  index(depth) {
    return this.path[this.resolveDepth(depth) * 3 + 1];
  }
  /**
  The index pointing after this position into the ancestor at the
  given level.
  */
  indexAfter(depth) {
    depth = this.resolveDepth(depth);
    return this.index(depth) + (depth == this.depth && !this.textOffset ? 0 : 1);
  }
  /**
  The (absolute) position at the start of the node at the given
  level.
  */
  start(depth) {
    depth = this.resolveDepth(depth);
    return depth == 0 ? 0 : this.path[depth * 3 - 1] + 1;
  }
  /**
  The (absolute) position at the end of the node at the given
  level.
  */
  end(depth) {
    depth = this.resolveDepth(depth);
    return this.start(depth) + this.node(depth).content.size;
  }
  /**
  The (absolute) position directly before the wrapping node at the
  given level, or, when `depth` is `this.depth + 1`, the original
  position.
  */
  before(depth) {
    depth = this.resolveDepth(depth);
    if (!depth)
      throw new RangeError("There is no position before the top-level node");
    return depth == this.depth + 1 ? this.pos : this.path[depth * 3 - 1];
  }
  /**
  The (absolute) position directly after the wrapping node at the
  given level, or the original position when `depth` is `this.depth + 1`.
  */
  after(depth) {
    depth = this.resolveDepth(depth);
    if (!depth)
      throw new RangeError("There is no position after the top-level node");
    return depth == this.depth + 1 ? this.pos : this.path[depth * 3 - 1] + this.path[depth * 3].nodeSize;
  }
  /**
  When this position points into a text node, this returns the
  distance between the position and the start of the text node.
  Will be zero for positions that point between nodes.
  */
  get textOffset() {
    return this.pos - this.path[this.path.length - 1];
  }
  /**
  Get the node directly after the position, if any. If the position
  points into a text node, only the part of that node after the
  position is returned.
  */
  get nodeAfter() {
    let parent = this.parent, index = this.index(this.depth);
    if (index == parent.childCount)
      return null;
    let dOff = this.pos - this.path[this.path.length - 1], child = parent.child(index);
    return dOff ? parent.child(index).cut(dOff) : child;
  }
  /**
  Get the node directly before the position, if any. If the
  position points into a text node, only the part of that node
  before the position is returned.
  */
  get nodeBefore() {
    let index = this.index(this.depth);
    let dOff = this.pos - this.path[this.path.length - 1];
    if (dOff)
      return this.parent.child(index).cut(0, dOff);
    return index == 0 ? null : this.parent.child(index - 1);
  }
  /**
  Get the position at the given index in the parent node at the
  given depth (which defaults to `this.depth`).
  */
  posAtIndex(index, depth) {
    depth = this.resolveDepth(depth);
    let node = this.path[depth * 3], pos = depth == 0 ? 0 : this.path[depth * 3 - 1] + 1;
    for (let i = 0; i < index; i++)
      pos += node.child(i).nodeSize;
    return pos;
  }
  /**
  Get the marks at this position, factoring in the surrounding
  marks' [`inclusive`](https://prosemirror.net/docs/ref/#model.MarkSpec.inclusive) property. If the
  position is at the start of a non-empty node, the marks of the
  node after it (if any) are returned.
  */
  marks() {
    let parent = this.parent, index = this.index();
    if (parent.content.size == 0)
      return Mark.none;
    if (this.textOffset)
      return parent.child(index).marks;
    let main = parent.maybeChild(index - 1), other = parent.maybeChild(index);
    if (!main) {
      let tmp = main;
      main = other;
      other = tmp;
    }
    let marks = main.marks;
    for (var i = 0; i < marks.length; i++)
      if (marks[i].type.spec.inclusive === false && (!other || !marks[i].isInSet(other.marks)))
        marks = marks[i--].removeFromSet(marks);
    return marks;
  }
  /**
  Get the marks after the current position, if any, except those
  that are non-inclusive and not present at position `$end`. This
  is mostly useful for getting the set of marks to preserve after a
  deletion. Will return `null` if this position is at the end of
  its parent node or its parent node isn't a textblock (in which
  case no marks should be preserved).
  */
  marksAcross($end) {
    let after = this.parent.maybeChild(this.index());
    if (!after || !after.isInline)
      return null;
    let marks = after.marks, next = $end.parent.maybeChild($end.index());
    for (var i = 0; i < marks.length; i++)
      if (marks[i].type.spec.inclusive === false && (!next || !marks[i].isInSet(next.marks)))
        marks = marks[i--].removeFromSet(marks);
    return marks;
  }
  /**
  The depth up to which this position and the given (non-resolved)
  position share the same parent nodes.
  */
  sharedDepth(pos) {
    for (let depth = this.depth; depth > 0; depth--)
      if (this.start(depth) <= pos && this.end(depth) >= pos)
        return depth;
    return 0;
  }
  /**
  Returns a range based on the place where this position and the
  given position diverge around block content. If both point into
  the same textblock, for example, a range around that textblock
  will be returned. If they point into different blocks, the range
  around those blocks in their shared ancestor is returned. You can
  pass in an optional predicate that will be called with a parent
  node to see if a range into that parent is acceptable.
  */
  blockRange(other = this, pred) {
    if (other.pos < this.pos)
      return other.blockRange(this);
    for (let d = this.depth - (this.parent.inlineContent || this.pos == other.pos ? 1 : 0); d >= 0; d--)
      if (other.pos <= this.end(d) && (!pred || pred(this.node(d))))
        return new NodeRange(this, other, d);
    return null;
  }
  /**
  Query whether the given position shares the same parent node.
  */
  sameParent(other) {
    return this.pos - this.parentOffset == other.pos - other.parentOffset;
  }
  /**
  Return the greater of this and the given position.
  */
  max(other) {
    return other.pos > this.pos ? other : this;
  }
  /**
  Return the smaller of this and the given position.
  */
  min(other) {
    return other.pos < this.pos ? other : this;
  }
  /**
  @internal
  */
  toString() {
    let str = "";
    for (let i = 1; i <= this.depth; i++)
      str += (str ? "/" : "") + this.node(i).type.name + "_" + this.index(i - 1);
    return str + ":" + this.parentOffset;
  }
  /**
  @internal
  */
  static resolve(doc2, pos) {
    if (!(pos >= 0 && pos <= doc2.content.size))
      throw new RangeError("Position " + pos + " out of range");
    let path = [];
    let start = 0, parentOffset = pos;
    for (let node = doc2; ; ) {
      let { index, offset } = node.content.findIndex(parentOffset);
      let rem = parentOffset - offset;
      path.push(node, index, start + offset);
      if (!rem)
        break;
      node = node.child(index);
      if (node.isText)
        break;
      parentOffset = rem - 1;
      start += offset + 1;
    }
    return new ResolvedPos(pos, path, parentOffset);
  }
  /**
  @internal
  */
  static resolveCached(doc2, pos) {
    let cache = resolveCache.get(doc2);
    if (cache) {
      for (let i = 0; i < cache.elts.length; i++) {
        let elt = cache.elts[i];
        if (elt.pos == pos)
          return elt;
      }
    } else {
      resolveCache.set(doc2, cache = new ResolveCache());
    }
    let result = cache.elts[cache.i] = ResolvedPos.resolve(doc2, pos);
    cache.i = (cache.i + 1) % resolveCacheSize;
    return result;
  }
}
class ResolveCache {
  constructor() {
    this.elts = [];
    this.i = 0;
  }
}
const resolveCacheSize = 12, resolveCache = /* @__PURE__ */ new WeakMap();
class NodeRange {
  /**
  Construct a node range. `$from` and `$to` should point into the
  same node until at least the given `depth`, since a node range
  denotes an adjacent set of nodes in a single parent node.
  */
  constructor($from, $to, depth) {
    this.$from = $from;
    this.$to = $to;
    this.depth = depth;
  }
  /**
  The position at the start of the range.
  */
  get start() {
    return this.$from.before(this.depth + 1);
  }
  /**
  The position at the end of the range.
  */
  get end() {
    return this.$to.after(this.depth + 1);
  }
  /**
  The parent node that the range points into.
  */
  get parent() {
    return this.$from.node(this.depth);
  }
  /**
  The start index of the range in the parent node.
  */
  get startIndex() {
    return this.$from.index(this.depth);
  }
  /**
  The end index of the range in the parent node.
  */
  get endIndex() {
    return this.$to.indexAfter(this.depth);
  }
}
const emptyAttrs = /* @__PURE__ */ Object.create(null);
class Node {
  /**
  @internal
  */
  constructor(type, attrs, content, marks = Mark.none) {
    this.type = type;
    this.attrs = attrs;
    this.marks = marks;
    this.content = content || Fragment.empty;
  }
  /**
  The size of this node, as defined by the integer-based [indexing
  scheme](/docs/guide/#doc.indexing). For text nodes, this is the
  amount of characters. For other leaf nodes, it is one. For
  non-leaf nodes, it is the size of the content plus two (the
  start and end token).
  */
  get nodeSize() {
    return this.isLeaf ? 1 : 2 + this.content.size;
  }
  /**
  The number of children that the node has.
  */
  get childCount() {
    return this.content.childCount;
  }
  /**
  Get the child node at the given index. Raises an error when the
  index is out of range.
  */
  child(index) {
    return this.content.child(index);
  }
  /**
  Get the child node at the given index, if it exists.
  */
  maybeChild(index) {
    return this.content.maybeChild(index);
  }
  /**
  Call `f` for every child node, passing the node, its offset
  into this parent node, and its index.
  */
  forEach(f) {
    this.content.forEach(f);
  }
  /**
  Invoke a callback for all descendant nodes recursively between
  the given two positions that are relative to start of this
  node's content. The callback is invoked with the node, its
  position relative to the original node (method receiver),
  its parent node, and its child index. When the callback returns
  false for a given node, that node's children will not be
  recursed over. The last parameter can be used to specify a
  starting position to count from.
  */
  nodesBetween(from, to, f, startPos = 0) {
    this.content.nodesBetween(from, to, f, startPos, this);
  }
  /**
  Call the given callback for every descendant node. Doesn't
  descend into a node when the callback returns `false`.
  */
  descendants(f) {
    this.nodesBetween(0, this.content.size, f);
  }
  /**
  Concatenates all the text nodes found in this fragment and its
  children.
  */
  get textContent() {
    return this.isLeaf && this.type.spec.leafText ? this.type.spec.leafText(this) : this.textBetween(0, this.content.size, "");
  }
  /**
  Get all text between positions `from` and `to`. When
  `blockSeparator` is given, it will be inserted to separate text
  from different block nodes. If `leafText` is given, it'll be
  inserted for every non-text leaf node encountered, otherwise
  [`leafText`](https://prosemirror.net/docs/ref/#model.NodeSpec^leafText) will be used.
  */
  textBetween(from, to, blockSeparator, leafText) {
    return this.content.textBetween(from, to, blockSeparator, leafText);
  }
  /**
  Returns this node's first child, or `null` if there are no
  children.
  */
  get firstChild() {
    return this.content.firstChild;
  }
  /**
  Returns this node's last child, or `null` if there are no
  children.
  */
  get lastChild() {
    return this.content.lastChild;
  }
  /**
  Test whether two nodes represent the same piece of document.
  */
  eq(other) {
    return this == other || this.sameMarkup(other) && this.content.eq(other.content);
  }
  /**
  Compare the markup (type, attributes, and marks) of this node to
  those of another. Returns `true` if both have the same markup.
  */
  sameMarkup(other) {
    return this.hasMarkup(other.type, other.attrs, other.marks);
  }
  /**
  Check whether this node's markup correspond to the given type,
  attributes, and marks.
  */
  hasMarkup(type, attrs, marks) {
    return this.type == type && compareDeep(this.attrs, attrs || type.defaultAttrs || emptyAttrs) && Mark.sameSet(this.marks, marks || Mark.none);
  }
  /**
  Create a new node with the same markup as this node, containing
  the given content (or empty, if no content is given).
  */
  copy(content = null) {
    if (content == this.content)
      return this;
    return new Node(this.type, this.attrs, content, this.marks);
  }
  /**
  Create a copy of this node, with the given set of marks instead
  of the node's own marks.
  */
  mark(marks) {
    return marks == this.marks ? this : new Node(this.type, this.attrs, this.content, marks);
  }
  /**
  Create a copy of this node with only the content between the
  given positions. If `to` is not given, it defaults to the end of
  the node.
  */
  cut(from, to = this.content.size) {
    if (from == 0 && to == this.content.size)
      return this;
    return this.copy(this.content.cut(from, to));
  }
  /**
  Cut out the part of the document between the given positions, and
  return it as a `Slice` object.
  */
  slice(from, to = this.content.size, includeParents = false) {
    if (from == to)
      return Slice.empty;
    let $from = this.resolve(from), $to = this.resolve(to);
    let depth = includeParents ? 0 : $from.sharedDepth(to);
    let start = $from.start(depth), node = $from.node(depth);
    let content = node.content.cut($from.pos - start, $to.pos - start);
    return new Slice(content, $from.depth - depth, $to.depth - depth);
  }
  /**
  Replace the part of the document between the given positions with
  the given slice. The slice must 'fit', meaning its open sides
  must be able to connect to the surrounding content, and its
  content nodes must be valid children for the node they are placed
  into. If any of this is violated, an error of type
  [`ReplaceError`](https://prosemirror.net/docs/ref/#model.ReplaceError) is thrown.
  */
  replace(from, to, slice) {
    return replace(this.resolve(from), this.resolve(to), slice);
  }
  /**
  Find the node directly after the given position.
  */
  nodeAt(pos) {
    for (let node = this; ; ) {
      let { index, offset } = node.content.findIndex(pos);
      node = node.maybeChild(index);
      if (!node)
        return null;
      if (offset == pos || node.isText)
        return node;
      pos -= offset + 1;
    }
  }
  /**
  Find the (direct) child node after the given offset, if any,
  and return it along with its index and offset relative to this
  node.
  */
  childAfter(pos) {
    let { index, offset } = this.content.findIndex(pos);
    return { node: this.content.maybeChild(index), index, offset };
  }
  /**
  Find the (direct) child node before the given offset, if any,
  and return it along with its index and offset relative to this
  node.
  */
  childBefore(pos) {
    if (pos == 0)
      return { node: null, index: 0, offset: 0 };
    let { index, offset } = this.content.findIndex(pos);
    if (offset < pos)
      return { node: this.content.child(index), index, offset };
    let node = this.content.child(index - 1);
    return { node, index: index - 1, offset: offset - node.nodeSize };
  }
  /**
  Resolve the given position in the document, returning an
  [object](https://prosemirror.net/docs/ref/#model.ResolvedPos) with information about its context.
  */
  resolve(pos) {
    return ResolvedPos.resolveCached(this, pos);
  }
  /**
  @internal
  */
  resolveNoCache(pos) {
    return ResolvedPos.resolve(this, pos);
  }
  /**
  Test whether a given mark or mark type occurs in this document
  between the two given positions.
  */
  rangeHasMark(from, to, type) {
    let found2 = false;
    if (to > from)
      this.nodesBetween(from, to, (node) => {
        if (type.isInSet(node.marks))
          found2 = true;
        return !found2;
      });
    return found2;
  }
  /**
  True when this is a block (non-inline node)
  */
  get isBlock() {
    return this.type.isBlock;
  }
  /**
  True when this is a textblock node, a block node with inline
  content.
  */
  get isTextblock() {
    return this.type.isTextblock;
  }
  /**
  True when this node allows inline content.
  */
  get inlineContent() {
    return this.type.inlineContent;
  }
  /**
  True when this is an inline node (a text node or a node that can
  appear among text).
  */
  get isInline() {
    return this.type.isInline;
  }
  /**
  True when this is a text node.
  */
  get isText() {
    return this.type.isText;
  }
  /**
  True when this is a leaf node.
  */
  get isLeaf() {
    return this.type.isLeaf;
  }
  /**
  True when this is an atom, i.e. when it does not have directly
  editable content. This is usually the same as `isLeaf`, but can
  be configured with the [`atom` property](https://prosemirror.net/docs/ref/#model.NodeSpec.atom)
  on a node's spec (typically used when the node is displayed as
  an uneditable [node view](https://prosemirror.net/docs/ref/#view.NodeView)).
  */
  get isAtom() {
    return this.type.isAtom;
  }
  /**
  Return a string representation of this node for debugging
  purposes.
  */
  toString() {
    if (this.type.spec.toDebugString)
      return this.type.spec.toDebugString(this);
    let name = this.type.name;
    if (this.content.size)
      name += "(" + this.content.toStringInner() + ")";
    return wrapMarks(this.marks, name);
  }
  /**
  Get the content match in this node at the given index.
  */
  contentMatchAt(index) {
    let match = this.type.contentMatch.matchFragment(this.content, 0, index);
    if (!match)
      throw new Error("Called contentMatchAt on a node with invalid content");
    return match;
  }
  /**
  Test whether replacing the range between `from` and `to` (by
  child index) with the given replacement fragment (which defaults
  to the empty fragment) would leave the node's content valid. You
  can optionally pass `start` and `end` indices into the
  replacement fragment.
  */
  canReplace(from, to, replacement = Fragment.empty, start = 0, end = replacement.childCount) {
    let one = this.contentMatchAt(from).matchFragment(replacement, start, end);
    let two = one && one.matchFragment(this.content, to);
    if (!two || !two.validEnd)
      return false;
    for (let i = start; i < end; i++)
      if (!this.type.allowsMarks(replacement.child(i).marks))
        return false;
    return true;
  }
  /**
  Test whether replacing the range `from` to `to` (by index) with
  a node of the given type would leave the node's content valid.
  */
  canReplaceWith(from, to, type, marks) {
    if (marks && !this.type.allowsMarks(marks))
      return false;
    let start = this.contentMatchAt(from).matchType(type);
    let end = start && start.matchFragment(this.content, to);
    return end ? end.validEnd : false;
  }
  /**
  Test whether the given node's content could be appended to this
  node. If that node is empty, this will only return true if there
  is at least one node type that can appear in both nodes (to avoid
  merging completely incompatible nodes).
  */
  canAppend(other) {
    if (other.content.size)
      return this.canReplace(this.childCount, this.childCount, other.content);
    else
      return this.type.compatibleContent(other.type);
  }
  /**
  Check whether this node and its descendants conform to the
  schema, and raise an exception when they do not.
  */
  check() {
    this.type.checkContent(this.content);
    this.type.checkAttrs(this.attrs);
    let copy2 = Mark.none;
    for (let i = 0; i < this.marks.length; i++) {
      let mark = this.marks[i];
      mark.type.checkAttrs(mark.attrs);
      copy2 = mark.addToSet(copy2);
    }
    if (!Mark.sameSet(copy2, this.marks))
      throw new RangeError(`Invalid collection of marks for node ${this.type.name}: ${this.marks.map((m) => m.type.name)}`);
    this.content.forEach((node) => node.check());
  }
  /**
  Return a JSON-serializeable representation of this node.
  */
  toJSON() {
    let obj = { type: this.type.name };
    for (let _ in this.attrs) {
      obj.attrs = this.attrs;
      break;
    }
    if (this.content.size)
      obj.content = this.content.toJSON();
    if (this.marks.length)
      obj.marks = this.marks.map((n) => n.toJSON());
    return obj;
  }
  /**
  Deserialize a node from its JSON representation.
  */
  static fromJSON(schema2, json) {
    if (!json)
      throw new RangeError("Invalid input for Node.fromJSON");
    let marks = void 0;
    if (json.marks) {
      if (!Array.isArray(json.marks))
        throw new RangeError("Invalid mark data for Node.fromJSON");
      marks = json.marks.map(schema2.markFromJSON);
    }
    if (json.type == "text") {
      if (typeof json.text != "string")
        throw new RangeError("Invalid text node in JSON");
      return schema2.text(json.text, marks);
    }
    let content = Fragment.fromJSON(schema2, json.content);
    let node = schema2.nodeType(json.type).create(json.attrs, content, marks);
    node.type.checkAttrs(node.attrs);
    return node;
  }
}
Node.prototype.text = void 0;
class TextNode extends Node {
  /**
  @internal
  */
  constructor(type, attrs, content, marks) {
    super(type, attrs, null, marks);
    if (!content)
      throw new RangeError("Empty text nodes are not allowed");
    this.text = content;
  }
  toString() {
    if (this.type.spec.toDebugString)
      return this.type.spec.toDebugString(this);
    return wrapMarks(this.marks, JSON.stringify(this.text));
  }
  get textContent() {
    return this.text;
  }
  textBetween(from, to) {
    return this.text.slice(from, to);
  }
  get nodeSize() {
    return this.text.length;
  }
  mark(marks) {
    return marks == this.marks ? this : new TextNode(this.type, this.attrs, this.text, marks);
  }
  withText(text2) {
    if (text2 == this.text)
      return this;
    return new TextNode(this.type, this.attrs, text2, this.marks);
  }
  cut(from = 0, to = this.text.length) {
    if (from == 0 && to == this.text.length)
      return this;
    return this.withText(this.text.slice(from, to));
  }
  eq(other) {
    return this.sameMarkup(other) && this.text == other.text;
  }
  toJSON() {
    let base2 = super.toJSON();
    base2.text = this.text;
    return base2;
  }
}
function wrapMarks(marks, str) {
  for (let i = marks.length - 1; i >= 0; i--)
    str = marks[i].type.name + "(" + str + ")";
  return str;
}
class ContentMatch {
  /**
  @internal
  */
  constructor(validEnd) {
    this.validEnd = validEnd;
    this.next = [];
    this.wrapCache = [];
  }
  /**
  @internal
  */
  static parse(string, nodeTypes) {
    let stream = new TokenStream(string, nodeTypes);
    if (stream.next == null)
      return ContentMatch.empty;
    let expr = parseExpr(stream);
    if (stream.next)
      stream.err("Unexpected trailing text");
    let match = dfa(nfa(expr));
    checkForDeadEnds(match, stream);
    return match;
  }
  /**
  Match a node type, returning a match after that node if
  successful.
  */
  matchType(type) {
    for (let i = 0; i < this.next.length; i++)
      if (this.next[i].type == type)
        return this.next[i].next;
    return null;
  }
  /**
  Try to match a fragment. Returns the resulting match when
  successful.
  */
  matchFragment(frag, start = 0, end = frag.childCount) {
    let cur = this;
    for (let i = start; cur && i < end; i++)
      cur = cur.matchType(frag.child(i).type);
    return cur;
  }
  /**
  @internal
  */
  get inlineContent() {
    return this.next.length != 0 && this.next[0].type.isInline;
  }
  /**
  Get the first matching node type at this match position that can
  be generated.
  */
  get defaultType() {
    for (let i = 0; i < this.next.length; i++) {
      let { type } = this.next[i];
      if (!(type.isText || type.hasRequiredAttrs()))
        return type;
    }
    return null;
  }
  /**
  @internal
  */
  compatible(other) {
    for (let i = 0; i < this.next.length; i++)
      for (let j = 0; j < other.next.length; j++)
        if (this.next[i].type == other.next[j].type)
          return true;
    return false;
  }
  /**
  Try to match the given fragment, and if that fails, see if it can
  be made to match by inserting nodes in front of it. When
  successful, return a fragment of inserted nodes (which may be
  empty if nothing had to be inserted). When `toEnd` is true, only
  return a fragment if the resulting match goes to the end of the
  content expression.
  */
  fillBefore(after, toEnd = false, startIndex = 0) {
    let seen = [this];
    function search(match, types) {
      let finished = match.matchFragment(after, startIndex);
      if (finished && (!toEnd || finished.validEnd))
        return Fragment.from(types.map((tp) => tp.createAndFill()));
      for (let i = 0; i < match.next.length; i++) {
        let { type, next } = match.next[i];
        if (!(type.isText || type.hasRequiredAttrs()) && seen.indexOf(next) == -1) {
          seen.push(next);
          let found2 = search(next, types.concat(type));
          if (found2)
            return found2;
        }
      }
      return null;
    }
    return search(this, []);
  }
  /**
  Find a set of wrapping node types that would allow a node of the
  given type to appear at this position. The result may be empty
  (when it fits directly) and will be null when no such wrapping
  exists.
  */
  findWrapping(target) {
    for (let i = 0; i < this.wrapCache.length; i += 2)
      if (this.wrapCache[i] == target)
        return this.wrapCache[i + 1];
    let computed = this.computeWrapping(target);
    this.wrapCache.push(target, computed);
    return computed;
  }
  /**
  @internal
  */
  computeWrapping(target) {
    let seen = /* @__PURE__ */ Object.create(null), active2 = [{ match: this, type: null, via: null }];
    while (active2.length) {
      let current = active2.shift(), match = current.match;
      if (match.matchType(target)) {
        let result = [];
        for (let obj = current; obj.type; obj = obj.via)
          result.push(obj.type);
        return result.reverse();
      }
      for (let i = 0; i < match.next.length; i++) {
        let { type, next } = match.next[i];
        if (!type.isLeaf && !type.hasRequiredAttrs() && !(type.name in seen) && (!current.type || next.validEnd)) {
          active2.push({ match: type.contentMatch, type, via: current });
          seen[type.name] = true;
        }
      }
    }
    return null;
  }
  /**
  The number of outgoing edges this node has in the finite
  automaton that describes the content expression.
  */
  get edgeCount() {
    return this.next.length;
  }
  /**
  Get the _n_​th outgoing edge from this node in the finite
  automaton that describes the content expression.
  */
  edge(n) {
    if (n >= this.next.length)
      throw new RangeError(`There's no ${n}th edge in this content match`);
    return this.next[n];
  }
  /**
  @internal
  */
  toString() {
    let seen = [];
    function scan(m) {
      seen.push(m);
      for (let i = 0; i < m.next.length; i++)
        if (seen.indexOf(m.next[i].next) == -1)
          scan(m.next[i].next);
    }
    scan(this);
    return seen.map((m, i) => {
      let out = i + (m.validEnd ? "*" : " ") + " ";
      for (let i2 = 0; i2 < m.next.length; i2++)
        out += (i2 ? ", " : "") + m.next[i2].type.name + "->" + seen.indexOf(m.next[i2].next);
      return out;
    }).join("\n");
  }
}
ContentMatch.empty = new ContentMatch(true);
class TokenStream {
  constructor(string, nodeTypes) {
    this.string = string;
    this.nodeTypes = nodeTypes;
    this.inline = null;
    this.pos = 0;
    this.tokens = string.split(/\s*(?=\b|\W|$)/);
    if (this.tokens[this.tokens.length - 1] == "")
      this.tokens.pop();
    if (this.tokens[0] == "")
      this.tokens.shift();
  }
  get next() {
    return this.tokens[this.pos];
  }
  eat(tok) {
    return this.next == tok && (this.pos++ || true);
  }
  err(str) {
    throw new SyntaxError(str + " (in content expression '" + this.string + "')");
  }
}
function parseExpr(stream) {
  let exprs = [];
  do {
    exprs.push(parseExprSeq(stream));
  } while (stream.eat("|"));
  return exprs.length == 1 ? exprs[0] : { type: "choice", exprs };
}
function parseExprSeq(stream) {
  let exprs = [];
  do {
    exprs.push(parseExprSubscript(stream));
  } while (stream.next && stream.next != ")" && stream.next != "|");
  return exprs.length == 1 ? exprs[0] : { type: "seq", exprs };
}
function parseExprSubscript(stream) {
  let expr = parseExprAtom(stream);
  for (; ; ) {
    if (stream.eat("+"))
      expr = { type: "plus", expr };
    else if (stream.eat("*"))
      expr = { type: "star", expr };
    else if (stream.eat("?"))
      expr = { type: "opt", expr };
    else if (stream.eat("{"))
      expr = parseExprRange(stream, expr);
    else
      break;
  }
  return expr;
}
function parseNum(stream) {
  if (/\D/.test(stream.next))
    stream.err("Expected number, got '" + stream.next + "'");
  let result = Number(stream.next);
  stream.pos++;
  return result;
}
function parseExprRange(stream, expr) {
  let min = parseNum(stream), max = min;
  if (stream.eat(",")) {
    if (stream.next != "}")
      max = parseNum(stream);
    else
      max = -1;
  }
  if (!stream.eat("}"))
    stream.err("Unclosed braced range");
  return { type: "range", min, max, expr };
}
function resolveName(stream, name) {
  let types = stream.nodeTypes, type = types[name];
  if (type)
    return [type];
  let result = [];
  for (let typeName in types) {
    let type2 = types[typeName];
    if (type2.isInGroup(name))
      result.push(type2);
  }
  if (result.length == 0)
    stream.err("No node type or group '" + name + "' found");
  return result;
}
function parseExprAtom(stream) {
  if (stream.eat("(")) {
    let expr = parseExpr(stream);
    if (!stream.eat(")"))
      stream.err("Missing closing paren");
    return expr;
  } else if (!/\W/.test(stream.next)) {
    let exprs = resolveName(stream, stream.next).map((type) => {
      if (stream.inline == null)
        stream.inline = type.isInline;
      else if (stream.inline != type.isInline)
        stream.err("Mixing inline and block content");
      return { type: "name", value: type };
    });
    stream.pos++;
    return exprs.length == 1 ? exprs[0] : { type: "choice", exprs };
  } else {
    stream.err("Unexpected token '" + stream.next + "'");
  }
}
function nfa(expr) {
  let nfa2 = [[]];
  connect(compile(expr, 0), node());
  return nfa2;
  function node() {
    return nfa2.push([]) - 1;
  }
  function edge(from, to, term) {
    let edge2 = { term, to };
    nfa2[from].push(edge2);
    return edge2;
  }
  function connect(edges, to) {
    edges.forEach((edge2) => edge2.to = to);
  }
  function compile(expr2, from) {
    if (expr2.type == "choice") {
      return expr2.exprs.reduce((out, expr3) => out.concat(compile(expr3, from)), []);
    } else if (expr2.type == "seq") {
      for (let i = 0; ; i++) {
        let next = compile(expr2.exprs[i], from);
        if (i == expr2.exprs.length - 1)
          return next;
        connect(next, from = node());
      }
    } else if (expr2.type == "star") {
      let loop = node();
      edge(from, loop);
      connect(compile(expr2.expr, loop), loop);
      return [edge(loop)];
    } else if (expr2.type == "plus") {
      let loop = node();
      connect(compile(expr2.expr, from), loop);
      connect(compile(expr2.expr, loop), loop);
      return [edge(loop)];
    } else if (expr2.type == "opt") {
      return [edge(from)].concat(compile(expr2.expr, from));
    } else if (expr2.type == "range") {
      let cur = from;
      for (let i = 0; i < expr2.min; i++) {
        let next = node();
        connect(compile(expr2.expr, cur), next);
        cur = next;
      }
      if (expr2.max == -1) {
        connect(compile(expr2.expr, cur), cur);
      } else {
        for (let i = expr2.min; i < expr2.max; i++) {
          let next = node();
          edge(cur, next);
          connect(compile(expr2.expr, cur), next);
          cur = next;
        }
      }
      return [edge(cur)];
    } else if (expr2.type == "name") {
      return [edge(from, void 0, expr2.value)];
    } else {
      throw new Error("Unknown expr type");
    }
  }
}
function cmp(a, b) {
  return b - a;
}
function nullFrom(nfa2, node) {
  let result = [];
  scan(node);
  return result.sort(cmp);
  function scan(node2) {
    let edges = nfa2[node2];
    if (edges.length == 1 && !edges[0].term)
      return scan(edges[0].to);
    result.push(node2);
    for (let i = 0; i < edges.length; i++) {
      let { term, to } = edges[i];
      if (!term && result.indexOf(to) == -1)
        scan(to);
    }
  }
}
function dfa(nfa2) {
  let labeled = /* @__PURE__ */ Object.create(null);
  return explore(nullFrom(nfa2, 0));
  function explore(states) {
    let out = [];
    states.forEach((node) => {
      nfa2[node].forEach(({ term, to }) => {
        if (!term)
          return;
        let set;
        for (let i = 0; i < out.length; i++)
          if (out[i][0] == term)
            set = out[i][1];
        nullFrom(nfa2, to).forEach((node2) => {
          if (!set)
            out.push([term, set = []]);
          if (set.indexOf(node2) == -1)
            set.push(node2);
        });
      });
    });
    let state2 = labeled[states.join(",")] = new ContentMatch(states.indexOf(nfa2.length - 1) > -1);
    for (let i = 0; i < out.length; i++) {
      let states2 = out[i][1].sort(cmp);
      state2.next.push({ type: out[i][0], next: labeled[states2.join(",")] || explore(states2) });
    }
    return state2;
  }
}
function checkForDeadEnds(match, stream) {
  for (let i = 0, work = [match]; i < work.length; i++) {
    let state2 = work[i], dead = !state2.validEnd, nodes = [];
    for (let j = 0; j < state2.next.length; j++) {
      let { type, next } = state2.next[j];
      nodes.push(type.name);
      if (dead && !(type.isText || type.hasRequiredAttrs()))
        dead = false;
      if (work.indexOf(next) == -1)
        work.push(next);
    }
    if (dead)
      stream.err("Only non-generatable nodes (" + nodes.join(", ") + ") in a required position (see https://prosemirror.net/docs/guide/#generatable)");
  }
}
function defaultAttrs(attrs) {
  let defaults = /* @__PURE__ */ Object.create(null);
  for (let attrName in attrs) {
    let attr2 = attrs[attrName];
    if (!attr2.hasDefault)
      return null;
    defaults[attrName] = attr2.default;
  }
  return defaults;
}
function computeAttrs(attrs, value) {
  let built = /* @__PURE__ */ Object.create(null);
  for (let name in attrs) {
    let given = value && value[name];
    if (given === void 0) {
      let attr2 = attrs[name];
      if (attr2.hasDefault)
        given = attr2.default;
      else
        throw new RangeError("No value supplied for attribute " + name);
    }
    built[name] = given;
  }
  return built;
}
function checkAttrs(attrs, values, type, name) {
  for (let name2 in values)
    if (!(name2 in attrs))
      throw new RangeError(`Unsupported attribute ${name2} for ${type} of type ${name2}`);
  for (let name2 in attrs) {
    let attr2 = attrs[name2];
    if (attr2.validate)
      attr2.validate(values[name2]);
  }
}
function initAttrs(typeName, attrs) {
  let result = /* @__PURE__ */ Object.create(null);
  if (attrs)
    for (let name in attrs)
      result[name] = new Attribute(typeName, name, attrs[name]);
  return result;
}
let NodeType$1 = class NodeType {
  /**
  @internal
  */
  constructor(name, schema2, spec) {
    this.name = name;
    this.schema = schema2;
    this.spec = spec;
    this.markSet = null;
    this.groups = spec.group ? spec.group.split(" ") : [];
    this.attrs = initAttrs(name, spec.attrs);
    this.defaultAttrs = defaultAttrs(this.attrs);
    this.contentMatch = null;
    this.inlineContent = null;
    this.isBlock = !(spec.inline || name == "text");
    this.isText = name == "text";
  }
  /**
  True if this is an inline type.
  */
  get isInline() {
    return !this.isBlock;
  }
  /**
  True if this is a textblock type, a block that contains inline
  content.
  */
  get isTextblock() {
    return this.isBlock && this.inlineContent;
  }
  /**
  True for node types that allow no content.
  */
  get isLeaf() {
    return this.contentMatch == ContentMatch.empty;
  }
  /**
  True when this node is an atom, i.e. when it does not have
  directly editable content.
  */
  get isAtom() {
    return this.isLeaf || !!this.spec.atom;
  }
  /**
  Return true when this node type is part of the given
  [group](https://prosemirror.net/docs/ref/#model.NodeSpec.group).
  */
  isInGroup(group) {
    return this.groups.indexOf(group) > -1;
  }
  /**
  The node type's [whitespace](https://prosemirror.net/docs/ref/#model.NodeSpec.whitespace) option.
  */
  get whitespace() {
    return this.spec.whitespace || (this.spec.code ? "pre" : "normal");
  }
  /**
  Tells you whether this node type has any required attributes.
  */
  hasRequiredAttrs() {
    for (let n in this.attrs)
      if (this.attrs[n].isRequired)
        return true;
    return false;
  }
  /**
  Indicates whether this node allows some of the same content as
  the given node type.
  */
  compatibleContent(other) {
    return this == other || this.contentMatch.compatible(other.contentMatch);
  }
  /**
  @internal
  */
  computeAttrs(attrs) {
    if (!attrs && this.defaultAttrs)
      return this.defaultAttrs;
    else
      return computeAttrs(this.attrs, attrs);
  }
  /**
  Create a `Node` of this type. The given attributes are
  checked and defaulted (you can pass `null` to use the type's
  defaults entirely, if no required attributes exist). `content`
  may be a `Fragment`, a node, an array of nodes, or
  `null`. Similarly `marks` may be `null` to default to the empty
  set of marks.
  */
  create(attrs = null, content, marks) {
    if (this.isText)
      throw new Error("NodeType.create can't construct text nodes");
    return new Node(this, this.computeAttrs(attrs), Fragment.from(content), Mark.setFrom(marks));
  }
  /**
  Like [`create`](https://prosemirror.net/docs/ref/#model.NodeType.create), but check the given content
  against the node type's content restrictions, and throw an error
  if it doesn't match.
  */
  createChecked(attrs = null, content, marks) {
    content = Fragment.from(content);
    this.checkContent(content);
    return new Node(this, this.computeAttrs(attrs), content, Mark.setFrom(marks));
  }
  /**
  Like [`create`](https://prosemirror.net/docs/ref/#model.NodeType.create), but see if it is
  necessary to add nodes to the start or end of the given fragment
  to make it fit the node. If no fitting wrapping can be found,
  return null. Note that, due to the fact that required nodes can
  always be created, this will always succeed if you pass null or
  `Fragment.empty` as content.
  */
  createAndFill(attrs = null, content, marks) {
    attrs = this.computeAttrs(attrs);
    content = Fragment.from(content);
    if (content.size) {
      let before = this.contentMatch.fillBefore(content);
      if (!before)
        return null;
      content = before.append(content);
    }
    let matched = this.contentMatch.matchFragment(content);
    let after = matched && matched.fillBefore(Fragment.empty, true);
    if (!after)
      return null;
    return new Node(this, attrs, content.append(after), Mark.setFrom(marks));
  }
  /**
  Returns true if the given fragment is valid content for this node
  type.
  */
  validContent(content) {
    let result = this.contentMatch.matchFragment(content);
    if (!result || !result.validEnd)
      return false;
    for (let i = 0; i < content.childCount; i++)
      if (!this.allowsMarks(content.child(i).marks))
        return false;
    return true;
  }
  /**
  Throws a RangeError if the given fragment is not valid content for this
  node type.
  @internal
  */
  checkContent(content) {
    if (!this.validContent(content))
      throw new RangeError(`Invalid content for node ${this.name}: ${content.toString().slice(0, 50)}`);
  }
  /**
  @internal
  */
  checkAttrs(attrs) {
    checkAttrs(this.attrs, attrs, "node", this.name);
  }
  /**
  Check whether the given mark type is allowed in this node.
  */
  allowsMarkType(markType) {
    return this.markSet == null || this.markSet.indexOf(markType) > -1;
  }
  /**
  Test whether the given set of marks are allowed in this node.
  */
  allowsMarks(marks) {
    if (this.markSet == null)
      return true;
    for (let i = 0; i < marks.length; i++)
      if (!this.allowsMarkType(marks[i].type))
        return false;
    return true;
  }
  /**
  Removes the marks that are not allowed in this node from the given set.
  */
  allowedMarks(marks) {
    if (this.markSet == null)
      return marks;
    let copy2;
    for (let i = 0; i < marks.length; i++) {
      if (!this.allowsMarkType(marks[i].type)) {
        if (!copy2)
          copy2 = marks.slice(0, i);
      } else if (copy2) {
        copy2.push(marks[i]);
      }
    }
    return !copy2 ? marks : copy2.length ? copy2 : Mark.none;
  }
  /**
  @internal
  */
  static compile(nodes, schema2) {
    let result = /* @__PURE__ */ Object.create(null);
    nodes.forEach((name, spec) => result[name] = new NodeType(name, schema2, spec));
    let topType = schema2.spec.topNode || "doc";
    if (!result[topType])
      throw new RangeError("Schema is missing its top node type ('" + topType + "')");
    if (!result.text)
      throw new RangeError("Every schema needs a 'text' type");
    for (let _ in result.text.attrs)
      throw new RangeError("The text node type should not have attributes");
    return result;
  }
};
function validateType(typeName, attrName, type) {
  let types = type.split("|");
  return (value) => {
    let name = value === null ? "null" : typeof value;
    if (types.indexOf(name) < 0)
      throw new RangeError(`Expected value of type ${types} for attribute ${attrName} on type ${typeName}, got ${name}`);
  };
}
class Attribute {
  constructor(typeName, attrName, options) {
    this.hasDefault = Object.prototype.hasOwnProperty.call(options, "default");
    this.default = options.default;
    this.validate = typeof options.validate == "string" ? validateType(typeName, attrName, options.validate) : options.validate;
  }
  get isRequired() {
    return !this.hasDefault;
  }
}
class MarkType {
  /**
  @internal
  */
  constructor(name, rank, schema2, spec) {
    this.name = name;
    this.rank = rank;
    this.schema = schema2;
    this.spec = spec;
    this.attrs = initAttrs(name, spec.attrs);
    this.excluded = null;
    let defaults = defaultAttrs(this.attrs);
    this.instance = defaults ? new Mark(this, defaults) : null;
  }
  /**
  Create a mark of this type. `attrs` may be `null` or an object
  containing only some of the mark's attributes. The others, if
  they have defaults, will be added.
  */
  create(attrs = null) {
    if (!attrs && this.instance)
      return this.instance;
    return new Mark(this, computeAttrs(this.attrs, attrs));
  }
  /**
  @internal
  */
  static compile(marks, schema2) {
    let result = /* @__PURE__ */ Object.create(null), rank = 0;
    marks.forEach((name, spec) => result[name] = new MarkType(name, rank++, schema2, spec));
    return result;
  }
  /**
  When there is a mark of this type in the given set, a new set
  without it is returned. Otherwise, the input set is returned.
  */
  removeFromSet(set) {
    for (var i = 0; i < set.length; i++)
      if (set[i].type == this) {
        set = set.slice(0, i).concat(set.slice(i + 1));
        i--;
      }
    return set;
  }
  /**
  Tests whether there is a mark of this type in the given set.
  */
  isInSet(set) {
    for (let i = 0; i < set.length; i++)
      if (set[i].type == this)
        return set[i];
  }
  /**
  @internal
  */
  checkAttrs(attrs) {
    checkAttrs(this.attrs, attrs, "mark", this.name);
  }
  /**
  Queries whether a given mark type is
  [excluded](https://prosemirror.net/docs/ref/#model.MarkSpec.excludes) by this one.
  */
  excludes(other) {
    return this.excluded.indexOf(other) > -1;
  }
}
class Schema {
  /**
  Construct a schema from a schema [specification](https://prosemirror.net/docs/ref/#model.SchemaSpec).
  */
  constructor(spec) {
    this.linebreakReplacement = null;
    this.cached = /* @__PURE__ */ Object.create(null);
    let instanceSpec = this.spec = {};
    for (let prop in spec)
      instanceSpec[prop] = spec[prop];
    instanceSpec.nodes = OrderedMap.from(spec.nodes), instanceSpec.marks = OrderedMap.from(spec.marks || {}), this.nodes = NodeType$1.compile(this.spec.nodes, this);
    this.marks = MarkType.compile(this.spec.marks, this);
    let contentExprCache = /* @__PURE__ */ Object.create(null);
    for (let prop in this.nodes) {
      if (prop in this.marks)
        throw new RangeError(prop + " can not be both a node and a mark");
      let type = this.nodes[prop], contentExpr = type.spec.content || "", markExpr = type.spec.marks;
      type.contentMatch = contentExprCache[contentExpr] || (contentExprCache[contentExpr] = ContentMatch.parse(contentExpr, this.nodes));
      type.inlineContent = type.contentMatch.inlineContent;
      if (type.spec.linebreakReplacement) {
        if (this.linebreakReplacement)
          throw new RangeError("Multiple linebreak nodes defined");
        if (!type.isInline || !type.isLeaf)
          throw new RangeError("Linebreak replacement nodes must be inline leaf nodes");
        this.linebreakReplacement = type;
      }
      type.markSet = markExpr == "_" ? null : markExpr ? gatherMarks(this, markExpr.split(" ")) : markExpr == "" || !type.inlineContent ? [] : null;
    }
    for (let prop in this.marks) {
      let type = this.marks[prop], excl = type.spec.excludes;
      type.excluded = excl == null ? [type] : excl == "" ? [] : gatherMarks(this, excl.split(" "));
    }
    this.nodeFromJSON = this.nodeFromJSON.bind(this);
    this.markFromJSON = this.markFromJSON.bind(this);
    this.topNodeType = this.nodes[this.spec.topNode || "doc"];
    this.cached.wrappings = /* @__PURE__ */ Object.create(null);
  }
  /**
  Create a node in this schema. The `type` may be a string or a
  `NodeType` instance. Attributes will be extended with defaults,
  `content` may be a `Fragment`, `null`, a `Node`, or an array of
  nodes.
  */
  node(type, attrs = null, content, marks) {
    if (typeof type == "string")
      type = this.nodeType(type);
    else if (!(type instanceof NodeType$1))
      throw new RangeError("Invalid node type: " + type);
    else if (type.schema != this)
      throw new RangeError("Node type from different schema used (" + type.name + ")");
    return type.createChecked(attrs, content, marks);
  }
  /**
  Create a text node in the schema. Empty text nodes are not
  allowed.
  */
  text(text2, marks) {
    let type = this.nodes.text;
    return new TextNode(type, type.defaultAttrs, text2, Mark.setFrom(marks));
  }
  /**
  Create a mark with the given type and attributes.
  */
  mark(type, attrs) {
    if (typeof type == "string")
      type = this.marks[type];
    return type.create(attrs);
  }
  /**
  Deserialize a node from its JSON representation. This method is
  bound.
  */
  nodeFromJSON(json) {
    return Node.fromJSON(this, json);
  }
  /**
  Deserialize a mark from its JSON representation. This method is
  bound.
  */
  markFromJSON(json) {
    return Mark.fromJSON(this, json);
  }
  /**
  @internal
  */
  nodeType(name) {
    let found2 = this.nodes[name];
    if (!found2)
      throw new RangeError("Unknown node type: " + name);
    return found2;
  }
}
function gatherMarks(schema2, marks) {
  let found2 = [];
  for (let i = 0; i < marks.length; i++) {
    let name = marks[i], mark = schema2.marks[name], ok = mark;
    if (mark) {
      found2.push(mark);
    } else {
      for (let prop in schema2.marks) {
        let mark2 = schema2.marks[prop];
        if (name == "_" || mark2.spec.group && mark2.spec.group.split(" ").indexOf(name) > -1)
          found2.push(ok = mark2);
      }
    }
    if (!ok)
      throw new SyntaxError("Unknown mark type: '" + marks[i] + "'");
  }
  return found2;
}
function isTagRule(rule) {
  return rule.tag != null;
}
function isStyleRule(rule) {
  return rule.style != null;
}
class DOMParser {
  /**
  Create a parser that targets the given schema, using the given
  parsing rules.
  */
  constructor(schema2, rules) {
    this.schema = schema2;
    this.rules = rules;
    this.tags = [];
    this.styles = [];
    let matchedStyles = this.matchedStyles = [];
    rules.forEach((rule) => {
      if (isTagRule(rule)) {
        this.tags.push(rule);
      } else if (isStyleRule(rule)) {
        let prop = /[^=]*/.exec(rule.style)[0];
        if (matchedStyles.indexOf(prop) < 0)
          matchedStyles.push(prop);
        this.styles.push(rule);
      }
    });
    this.normalizeLists = !this.tags.some((r) => {
      if (!/^(ul|ol)\b/.test(r.tag) || !r.node)
        return false;
      let node = schema2.nodes[r.node];
      return node.contentMatch.matchType(node);
    });
  }
  /**
  Parse a document from the content of a DOM node.
  */
  parse(dom, options = {}) {
    let context = new ParseContext(this, options, false);
    context.addAll(dom, Mark.none, options.from, options.to);
    return context.finish();
  }
  /**
  Parses the content of the given DOM node, like
  [`parse`](https://prosemirror.net/docs/ref/#model.DOMParser.parse), and takes the same set of
  options. But unlike that method, which produces a whole node,
  this one returns a slice that is open at the sides, meaning that
  the schema constraints aren't applied to the start of nodes to
  the left of the input and the end of nodes at the end.
  */
  parseSlice(dom, options = {}) {
    let context = new ParseContext(this, options, true);
    context.addAll(dom, Mark.none, options.from, options.to);
    return Slice.maxOpen(context.finish());
  }
  /**
  @internal
  */
  matchTag(dom, context, after) {
    for (let i = after ? this.tags.indexOf(after) + 1 : 0; i < this.tags.length; i++) {
      let rule = this.tags[i];
      if (matches(dom, rule.tag) && (rule.namespace === void 0 || dom.namespaceURI == rule.namespace) && (!rule.context || context.matchesContext(rule.context))) {
        if (rule.getAttrs) {
          let result = rule.getAttrs(dom);
          if (result === false)
            continue;
          rule.attrs = result || void 0;
        }
        return rule;
      }
    }
  }
  /**
  @internal
  */
  matchStyle(prop, value, context, after) {
    for (let i = after ? this.styles.indexOf(after) + 1 : 0; i < this.styles.length; i++) {
      let rule = this.styles[i], style = rule.style;
      if (style.indexOf(prop) != 0 || rule.context && !context.matchesContext(rule.context) || // Test that the style string either precisely matches the prop,
      // or has an '=' sign after the prop, followed by the given
      // value.
      style.length > prop.length && (style.charCodeAt(prop.length) != 61 || style.slice(prop.length + 1) != value))
        continue;
      if (rule.getAttrs) {
        let result = rule.getAttrs(value);
        if (result === false)
          continue;
        rule.attrs = result || void 0;
      }
      return rule;
    }
  }
  /**
  @internal
  */
  static schemaRules(schema2) {
    let result = [];
    function insert2(rule) {
      let priority = rule.priority == null ? 50 : rule.priority, i = 0;
      for (; i < result.length; i++) {
        let next = result[i], nextPriority = next.priority == null ? 50 : next.priority;
        if (nextPriority < priority)
          break;
      }
      result.splice(i, 0, rule);
    }
    for (let name in schema2.marks) {
      let rules = schema2.marks[name].spec.parseDOM;
      if (rules)
        rules.forEach((rule) => {
          insert2(rule = copy(rule));
          if (!(rule.mark || rule.ignore || rule.clearMark))
            rule.mark = name;
        });
    }
    for (let name in schema2.nodes) {
      let rules = schema2.nodes[name].spec.parseDOM;
      if (rules)
        rules.forEach((rule) => {
          insert2(rule = copy(rule));
          if (!(rule.node || rule.ignore || rule.mark))
            rule.node = name;
        });
    }
    return result;
  }
  /**
  Construct a DOM parser using the parsing rules listed in a
  schema's [node specs](https://prosemirror.net/docs/ref/#model.NodeSpec.parseDOM), reordered by
  [priority](https://prosemirror.net/docs/ref/#model.ParseRule.priority).
  */
  static fromSchema(schema2) {
    return schema2.cached.domParser || (schema2.cached.domParser = new DOMParser(schema2, DOMParser.schemaRules(schema2)));
  }
}
const blockTags = {
  address: true,
  article: true,
  aside: true,
  blockquote: true,
  canvas: true,
  dd: true,
  div: true,
  dl: true,
  fieldset: true,
  figcaption: true,
  figure: true,
  footer: true,
  form: true,
  h1: true,
  h2: true,
  h3: true,
  h4: true,
  h5: true,
  h6: true,
  header: true,
  hgroup: true,
  hr: true,
  li: true,
  noscript: true,
  ol: true,
  output: true,
  p: true,
  pre: true,
  section: true,
  table: true,
  tfoot: true,
  ul: true
};
const ignoreTags = {
  head: true,
  noscript: true,
  object: true,
  script: true,
  style: true,
  title: true
};
const listTags = { ol: true, ul: true };
const OPT_PRESERVE_WS = 1, OPT_PRESERVE_WS_FULL = 2, OPT_OPEN_LEFT = 4;
function wsOptionsFor(type, preserveWhitespace, base2) {
  if (preserveWhitespace != null)
    return (preserveWhitespace ? OPT_PRESERVE_WS : 0) | (preserveWhitespace === "full" ? OPT_PRESERVE_WS_FULL : 0);
  return type && type.whitespace == "pre" ? OPT_PRESERVE_WS | OPT_PRESERVE_WS_FULL : base2 & ~OPT_OPEN_LEFT;
}
class NodeContext {
  constructor(type, attrs, marks, solid, match, options) {
    this.type = type;
    this.attrs = attrs;
    this.marks = marks;
    this.solid = solid;
    this.options = options;
    this.content = [];
    this.activeMarks = Mark.none;
    this.match = match || (options & OPT_OPEN_LEFT ? null : type.contentMatch);
  }
  findWrapping(node) {
    if (!this.match) {
      if (!this.type)
        return [];
      let fill = this.type.contentMatch.fillBefore(Fragment.from(node));
      if (fill) {
        this.match = this.type.contentMatch.matchFragment(fill);
      } else {
        let start = this.type.contentMatch, wrap2;
        if (wrap2 = start.findWrapping(node.type)) {
          this.match = start;
          return wrap2;
        } else {
          return null;
        }
      }
    }
    return this.match.findWrapping(node.type);
  }
  finish(openEnd) {
    if (!(this.options & OPT_PRESERVE_WS)) {
      let last = this.content[this.content.length - 1], m;
      if (last && last.isText && (m = /[ \t\r\n\u000c]+$/.exec(last.text))) {
        let text2 = last;
        if (last.text.length == m[0].length)
          this.content.pop();
        else
          this.content[this.content.length - 1] = text2.withText(text2.text.slice(0, text2.text.length - m[0].length));
      }
    }
    let content = Fragment.from(this.content);
    if (!openEnd && this.match)
      content = content.append(this.match.fillBefore(Fragment.empty, true));
    return this.type ? this.type.create(this.attrs, content, this.marks) : content;
  }
  inlineContext(node) {
    if (this.type)
      return this.type.inlineContent;
    if (this.content.length)
      return this.content[0].isInline;
    return node.parentNode && !blockTags.hasOwnProperty(node.parentNode.nodeName.toLowerCase());
  }
}
class ParseContext {
  constructor(parser, options, isOpen) {
    this.parser = parser;
    this.options = options;
    this.isOpen = isOpen;
    this.open = 0;
    let topNode = options.topNode, topContext;
    let topOptions = wsOptionsFor(null, options.preserveWhitespace, 0) | (isOpen ? OPT_OPEN_LEFT : 0);
    if (topNode)
      topContext = new NodeContext(topNode.type, topNode.attrs, Mark.none, true, options.topMatch || topNode.type.contentMatch, topOptions);
    else if (isOpen)
      topContext = new NodeContext(null, null, Mark.none, true, null, topOptions);
    else
      topContext = new NodeContext(parser.schema.topNodeType, null, Mark.none, true, null, topOptions);
    this.nodes = [topContext];
    this.find = options.findPositions;
    this.needsBlock = false;
  }
  get top() {
    return this.nodes[this.open];
  }
  // Add a DOM node to the content. Text is inserted as text node,
  // otherwise, the node is passed to `addElement` or, if it has a
  // `style` attribute, `addElementWithStyles`.
  addDOM(dom, marks) {
    if (dom.nodeType == 3)
      this.addTextNode(dom, marks);
    else if (dom.nodeType == 1)
      this.addElement(dom, marks);
  }
  addTextNode(dom, marks) {
    let value = dom.nodeValue;
    let top = this.top;
    if (top.options & OPT_PRESERVE_WS_FULL || top.inlineContext(dom) || /[^ \t\r\n\u000c]/.test(value)) {
      if (!(top.options & OPT_PRESERVE_WS)) {
        value = value.replace(/[ \t\r\n\u000c]+/g, " ");
        if (/^[ \t\r\n\u000c]/.test(value) && this.open == this.nodes.length - 1) {
          let nodeBefore = top.content[top.content.length - 1];
          let domNodeBefore = dom.previousSibling;
          if (!nodeBefore || domNodeBefore && domNodeBefore.nodeName == "BR" || nodeBefore.isText && /[ \t\r\n\u000c]$/.test(nodeBefore.text))
            value = value.slice(1);
        }
      } else if (!(top.options & OPT_PRESERVE_WS_FULL)) {
        value = value.replace(/\r?\n|\r/g, " ");
      } else {
        value = value.replace(/\r\n?/g, "\n");
      }
      if (value)
        this.insertNode(this.parser.schema.text(value), marks);
      this.findInText(dom);
    } else {
      this.findInside(dom);
    }
  }
  // Try to find a handler for the given tag and use that to parse. If
  // none is found, the element's content nodes are added directly.
  addElement(dom, marks, matchAfter) {
    let name = dom.nodeName.toLowerCase(), ruleID;
    if (listTags.hasOwnProperty(name) && this.parser.normalizeLists)
      normalizeList(dom);
    let rule = this.options.ruleFromNode && this.options.ruleFromNode(dom) || (ruleID = this.parser.matchTag(dom, this, matchAfter));
    if (rule ? rule.ignore : ignoreTags.hasOwnProperty(name)) {
      this.findInside(dom);
      this.ignoreFallback(dom, marks);
    } else if (!rule || rule.skip || rule.closeParent) {
      if (rule && rule.closeParent)
        this.open = Math.max(0, this.open - 1);
      else if (rule && rule.skip.nodeType)
        dom = rule.skip;
      let sync, top = this.top, oldNeedsBlock = this.needsBlock;
      if (blockTags.hasOwnProperty(name)) {
        if (top.content.length && top.content[0].isInline && this.open) {
          this.open--;
          top = this.top;
        }
        sync = true;
        if (!top.type)
          this.needsBlock = true;
      } else if (!dom.firstChild) {
        this.leafFallback(dom, marks);
        return;
      }
      let innerMarks = rule && rule.skip ? marks : this.readStyles(dom, marks);
      if (innerMarks)
        this.addAll(dom, innerMarks);
      if (sync)
        this.sync(top);
      this.needsBlock = oldNeedsBlock;
    } else {
      let innerMarks = this.readStyles(dom, marks);
      if (innerMarks)
        this.addElementByRule(dom, rule, innerMarks, rule.consuming === false ? ruleID : void 0);
    }
  }
  // Called for leaf DOM nodes that would otherwise be ignored
  leafFallback(dom, marks) {
    if (dom.nodeName == "BR" && this.top.type && this.top.type.inlineContent)
      this.addTextNode(dom.ownerDocument.createTextNode("\n"), marks);
  }
  // Called for ignored nodes
  ignoreFallback(dom, marks) {
    if (dom.nodeName == "BR" && (!this.top.type || !this.top.type.inlineContent))
      this.findPlace(this.parser.schema.text("-"), marks);
  }
  // Run any style parser associated with the node's styles. Either
  // return an updated array of marks, or null to indicate some of the
  // styles had a rule with `ignore` set.
  readStyles(dom, marks) {
    let styles = dom.style;
    if (styles && styles.length)
      for (let i = 0; i < this.parser.matchedStyles.length; i++) {
        let name = this.parser.matchedStyles[i], value = styles.getPropertyValue(name);
        if (value)
          for (let after = void 0; ; ) {
            let rule = this.parser.matchStyle(name, value, this, after);
            if (!rule)
              break;
            if (rule.ignore)
              return null;
            if (rule.clearMark)
              marks = marks.filter((m) => !rule.clearMark(m));
            else
              marks = marks.concat(this.parser.schema.marks[rule.mark].create(rule.attrs));
            if (rule.consuming === false)
              after = rule;
            else
              break;
          }
      }
    return marks;
  }
  // Look up a handler for the given node. If none are found, return
  // false. Otherwise, apply it, use its return value to drive the way
  // the node's content is wrapped, and return true.
  addElementByRule(dom, rule, marks, continueAfter) {
    let sync, nodeType;
    if (rule.node) {
      nodeType = this.parser.schema.nodes[rule.node];
      if (!nodeType.isLeaf) {
        let inner = this.enter(nodeType, rule.attrs || null, marks, rule.preserveWhitespace);
        if (inner) {
          sync = true;
          marks = inner;
        }
      } else if (!this.insertNode(nodeType.create(rule.attrs), marks)) {
        this.leafFallback(dom, marks);
      }
    } else {
      let markType = this.parser.schema.marks[rule.mark];
      marks = marks.concat(markType.create(rule.attrs));
    }
    let startIn = this.top;
    if (nodeType && nodeType.isLeaf) {
      this.findInside(dom);
    } else if (continueAfter) {
      this.addElement(dom, marks, continueAfter);
    } else if (rule.getContent) {
      this.findInside(dom);
      rule.getContent(dom, this.parser.schema).forEach((node) => this.insertNode(node, marks));
    } else {
      let contentDOM = dom;
      if (typeof rule.contentElement == "string")
        contentDOM = dom.querySelector(rule.contentElement);
      else if (typeof rule.contentElement == "function")
        contentDOM = rule.contentElement(dom);
      else if (rule.contentElement)
        contentDOM = rule.contentElement;
      this.findAround(dom, contentDOM, true);
      this.addAll(contentDOM, marks);
      this.findAround(dom, contentDOM, false);
    }
    if (sync && this.sync(startIn))
      this.open--;
  }
  // Add all child nodes between `startIndex` and `endIndex` (or the
  // whole node, if not given). If `sync` is passed, use it to
  // synchronize after every block element.
  addAll(parent, marks, startIndex, endIndex) {
    let index = startIndex || 0;
    for (let dom = startIndex ? parent.childNodes[startIndex] : parent.firstChild, end = endIndex == null ? null : parent.childNodes[endIndex]; dom != end; dom = dom.nextSibling, ++index) {
      this.findAtPoint(parent, index);
      this.addDOM(dom, marks);
    }
    this.findAtPoint(parent, index);
  }
  // Try to find a way to fit the given node type into the current
  // context. May add intermediate wrappers and/or leave non-solid
  // nodes that we're in.
  findPlace(node, marks) {
    let route, sync;
    for (let depth = this.open; depth >= 0; depth--) {
      let cx = this.nodes[depth];
      let found2 = cx.findWrapping(node);
      if (found2 && (!route || route.length > found2.length)) {
        route = found2;
        sync = cx;
        if (!found2.length)
          break;
      }
      if (cx.solid)
        break;
    }
    if (!route)
      return null;
    this.sync(sync);
    for (let i = 0; i < route.length; i++)
      marks = this.enterInner(route[i], null, marks, false);
    return marks;
  }
  // Try to insert the given node, adjusting the context when needed.
  insertNode(node, marks) {
    if (node.isInline && this.needsBlock && !this.top.type) {
      let block = this.textblockFromContext();
      if (block)
        marks = this.enterInner(block, null, marks);
    }
    let innerMarks = this.findPlace(node, marks);
    if (innerMarks) {
      this.closeExtra();
      let top = this.top;
      if (top.match)
        top.match = top.match.matchType(node.type);
      let nodeMarks = Mark.none;
      for (let m of innerMarks.concat(node.marks))
        if (top.type ? top.type.allowsMarkType(m.type) : markMayApply(m.type, node.type))
          nodeMarks = m.addToSet(nodeMarks);
      top.content.push(node.mark(nodeMarks));
      return true;
    }
    return false;
  }
  // Try to start a node of the given type, adjusting the context when
  // necessary.
  enter(type, attrs, marks, preserveWS) {
    let innerMarks = this.findPlace(type.create(attrs), marks);
    if (innerMarks)
      innerMarks = this.enterInner(type, attrs, marks, true, preserveWS);
    return innerMarks;
  }
  // Open a node of the given type
  enterInner(type, attrs, marks, solid = false, preserveWS) {
    this.closeExtra();
    let top = this.top;
    top.match = top.match && top.match.matchType(type);
    let options = wsOptionsFor(type, preserveWS, top.options);
    if (top.options & OPT_OPEN_LEFT && top.content.length == 0)
      options |= OPT_OPEN_LEFT;
    let applyMarks = Mark.none;
    marks = marks.filter((m) => {
      if (top.type ? top.type.allowsMarkType(m.type) : markMayApply(m.type, type)) {
        applyMarks = m.addToSet(applyMarks);
        return false;
      }
      return true;
    });
    this.nodes.push(new NodeContext(type, attrs, applyMarks, solid, null, options));
    this.open++;
    return marks;
  }
  // Make sure all nodes above this.open are finished and added to
  // their parents
  closeExtra(openEnd = false) {
    let i = this.nodes.length - 1;
    if (i > this.open) {
      for (; i > this.open; i--)
        this.nodes[i - 1].content.push(this.nodes[i].finish(openEnd));
      this.nodes.length = this.open + 1;
    }
  }
  finish() {
    this.open = 0;
    this.closeExtra(this.isOpen);
    return this.nodes[0].finish(this.isOpen || this.options.topOpen);
  }
  sync(to) {
    for (let i = this.open; i >= 0; i--)
      if (this.nodes[i] == to) {
        this.open = i;
        return true;
      }
    return false;
  }
  get currentPos() {
    this.closeExtra();
    let pos = 0;
    for (let i = this.open; i >= 0; i--) {
      let content = this.nodes[i].content;
      for (let j = content.length - 1; j >= 0; j--)
        pos += content[j].nodeSize;
      if (i)
        pos++;
    }
    return pos;
  }
  findAtPoint(parent, offset) {
    if (this.find)
      for (let i = 0; i < this.find.length; i++) {
        if (this.find[i].node == parent && this.find[i].offset == offset)
          this.find[i].pos = this.currentPos;
      }
  }
  findInside(parent) {
    if (this.find)
      for (let i = 0; i < this.find.length; i++) {
        if (this.find[i].pos == null && parent.nodeType == 1 && parent.contains(this.find[i].node))
          this.find[i].pos = this.currentPos;
      }
  }
  findAround(parent, content, before) {
    if (parent != content && this.find)
      for (let i = 0; i < this.find.length; i++) {
        if (this.find[i].pos == null && parent.nodeType == 1 && parent.contains(this.find[i].node)) {
          let pos = content.compareDocumentPosition(this.find[i].node);
          if (pos & (before ? 2 : 4))
            this.find[i].pos = this.currentPos;
        }
      }
  }
  findInText(textNode) {
    if (this.find)
      for (let i = 0; i < this.find.length; i++) {
        if (this.find[i].node == textNode)
          this.find[i].pos = this.currentPos - (textNode.nodeValue.length - this.find[i].offset);
      }
  }
  // Determines whether the given context string matches this context.
  matchesContext(context) {
    if (context.indexOf("|") > -1)
      return context.split(/\s*\|\s*/).some(this.matchesContext, this);
    let parts = context.split("/");
    let option = this.options.context;
    let useRoot = !this.isOpen && (!option || option.parent.type == this.nodes[0].type);
    let minDepth = -(option ? option.depth + 1 : 0) + (useRoot ? 0 : 1);
    let match = (i, depth) => {
      for (; i >= 0; i--) {
        let part = parts[i];
        if (part == "") {
          if (i == parts.length - 1 || i == 0)
            continue;
          for (; depth >= minDepth; depth--)
            if (match(i - 1, depth))
              return true;
          return false;
        } else {
          let next = depth > 0 || depth == 0 && useRoot ? this.nodes[depth].type : option && depth >= minDepth ? option.node(depth - minDepth).type : null;
          if (!next || next.name != part && !next.isInGroup(part))
            return false;
          depth--;
        }
      }
      return true;
    };
    return match(parts.length - 1, this.open);
  }
  textblockFromContext() {
    let $context = this.options.context;
    if ($context)
      for (let d = $context.depth; d >= 0; d--) {
        let deflt = $context.node(d).contentMatchAt($context.indexAfter(d)).defaultType;
        if (deflt && deflt.isTextblock && deflt.defaultAttrs)
          return deflt;
      }
    for (let name in this.parser.schema.nodes) {
      let type = this.parser.schema.nodes[name];
      if (type.isTextblock && type.defaultAttrs)
        return type;
    }
  }
}
function normalizeList(dom) {
  for (let child = dom.firstChild, prevItem = null; child; child = child.nextSibling) {
    let name = child.nodeType == 1 ? child.nodeName.toLowerCase() : null;
    if (name && listTags.hasOwnProperty(name) && prevItem) {
      prevItem.appendChild(child);
      child = prevItem;
    } else if (name == "li") {
      prevItem = child;
    } else if (name) {
      prevItem = null;
    }
  }
}
function matches(dom, selector) {
  return (dom.matches || dom.msMatchesSelector || dom.webkitMatchesSelector || dom.mozMatchesSelector).call(dom, selector);
}
function copy(obj) {
  let copy2 = {};
  for (let prop in obj)
    copy2[prop] = obj[prop];
  return copy2;
}
function markMayApply(markType, nodeType) {
  let nodes = nodeType.schema.nodes;
  for (let name in nodes) {
    let parent = nodes[name];
    if (!parent.allowsMarkType(markType))
      continue;
    let seen = [], scan = (match) => {
      seen.push(match);
      for (let i = 0; i < match.edgeCount; i++) {
        let { type, next } = match.edge(i);
        if (type == nodeType)
          return true;
        if (seen.indexOf(next) < 0 && scan(next))
          return true;
      }
    };
    if (scan(parent.contentMatch))
      return true;
  }
}
class DOMSerializer {
  /**
  Create a serializer. `nodes` should map node names to functions
  that take a node and return a description of the corresponding
  DOM. `marks` does the same for mark names, but also gets an
  argument that tells it whether the mark's content is block or
  inline content (for typical use, it'll always be inline). A mark
  serializer may be `null` to indicate that marks of that type
  should not be serialized.
  */
  constructor(nodes, marks) {
    this.nodes = nodes;
    this.marks = marks;
  }
  /**
  Serialize the content of this fragment to a DOM fragment. When
  not in the browser, the `document` option, containing a DOM
  document, should be passed so that the serializer can create
  nodes.
  */
  serializeFragment(fragment, options = {}, target) {
    if (!target)
      target = doc$1(options).createDocumentFragment();
    let top = target, active2 = [];
    fragment.forEach((node) => {
      if (active2.length || node.marks.length) {
        let keep = 0, rendered = 0;
        while (keep < active2.length && rendered < node.marks.length) {
          let next = node.marks[rendered];
          if (!this.marks[next.type.name]) {
            rendered++;
            continue;
          }
          if (!next.eq(active2[keep][0]) || next.type.spec.spanning === false)
            break;
          keep++;
          rendered++;
        }
        while (keep < active2.length)
          top = active2.pop()[1];
        while (rendered < node.marks.length) {
          let add = node.marks[rendered++];
          let markDOM = this.serializeMark(add, node.isInline, options);
          if (markDOM) {
            active2.push([add, top]);
            top.appendChild(markDOM.dom);
            top = markDOM.contentDOM || markDOM.dom;
          }
        }
      }
      top.appendChild(this.serializeNodeInner(node, options));
    });
    return target;
  }
  /**
  @internal
  */
  serializeNodeInner(node, options) {
    let { dom, contentDOM } = renderSpec(doc$1(options), this.nodes[node.type.name](node), null, node.attrs);
    if (contentDOM) {
      if (node.isLeaf)
        throw new RangeError("Content hole not allowed in a leaf node spec");
      this.serializeFragment(node.content, options, contentDOM);
    }
    return dom;
  }
  /**
  Serialize this node to a DOM node. This can be useful when you
  need to serialize a part of a document, as opposed to the whole
  document. To serialize a whole document, use
  [`serializeFragment`](https://prosemirror.net/docs/ref/#model.DOMSerializer.serializeFragment) on
  its [content](https://prosemirror.net/docs/ref/#model.Node.content).
  */
  serializeNode(node, options = {}) {
    let dom = this.serializeNodeInner(node, options);
    for (let i = node.marks.length - 1; i >= 0; i--) {
      let wrap2 = this.serializeMark(node.marks[i], node.isInline, options);
      if (wrap2) {
        (wrap2.contentDOM || wrap2.dom).appendChild(dom);
        dom = wrap2.dom;
      }
    }
    return dom;
  }
  /**
  @internal
  */
  serializeMark(mark, inline, options = {}) {
    let toDOM = this.marks[mark.type.name];
    return toDOM && renderSpec(doc$1(options), toDOM(mark, inline), null, mark.attrs);
  }
  static renderSpec(doc2, structure, xmlNS = null, blockArraysIn) {
    return renderSpec(doc2, structure, xmlNS, blockArraysIn);
  }
  /**
  Build a serializer using the [`toDOM`](https://prosemirror.net/docs/ref/#model.NodeSpec.toDOM)
  properties in a schema's node and mark specs.
  */
  static fromSchema(schema2) {
    return schema2.cached.domSerializer || (schema2.cached.domSerializer = new DOMSerializer(this.nodesFromSchema(schema2), this.marksFromSchema(schema2)));
  }
  /**
  Gather the serializers in a schema's node specs into an object.
  This can be useful as a base to build a custom serializer from.
  */
  static nodesFromSchema(schema2) {
    let result = gatherToDOM(schema2.nodes);
    if (!result.text)
      result.text = (node) => node.text;
    return result;
  }
  /**
  Gather the serializers in a schema's mark specs into an object.
  */
  static marksFromSchema(schema2) {
    return gatherToDOM(schema2.marks);
  }
}
function gatherToDOM(obj) {
  let result = {};
  for (let name in obj) {
    let toDOM = obj[name].spec.toDOM;
    if (toDOM)
      result[name] = toDOM;
  }
  return result;
}
function doc$1(options) {
  return options.document || window.document;
}
const suspiciousAttributeCache = /* @__PURE__ */ new WeakMap();
function suspiciousAttributes(attrs) {
  let value = suspiciousAttributeCache.get(attrs);
  if (value === void 0)
    suspiciousAttributeCache.set(attrs, value = suspiciousAttributesInner(attrs));
  return value;
}
function suspiciousAttributesInner(attrs) {
  let result = null;
  function scan(value) {
    if (value && typeof value == "object") {
      if (Array.isArray(value)) {
        if (typeof value[0] == "string") {
          if (!result)
            result = [];
          result.push(value);
        } else {
          for (let i = 0; i < value.length; i++)
            scan(value[i]);
        }
      } else {
        for (let prop in value)
          scan(value[prop]);
      }
    }
  }
  scan(attrs);
  return result;
}
function renderSpec(doc2, structure, xmlNS, blockArraysIn) {
  if (typeof structure == "string")
    return { dom: doc2.createTextNode(structure) };
  if (structure.nodeType != null)
    return { dom: structure };
  if (structure.dom && structure.dom.nodeType != null)
    return structure;
  let tagName = structure[0], suspicious;
  if (typeof tagName != "string")
    throw new RangeError("Invalid array passed to renderSpec");
  if (blockArraysIn && (suspicious = suspiciousAttributes(blockArraysIn)) && suspicious.indexOf(structure) > -1)
    throw new RangeError("Using an array from an attribute object as a DOM spec. This may be an attempted cross site scripting attack.");
  let space2 = tagName.indexOf(" ");
  if (space2 > 0) {
    xmlNS = tagName.slice(0, space2);
    tagName = tagName.slice(space2 + 1);
  }
  let contentDOM;
  let dom = xmlNS ? doc2.createElementNS(xmlNS, tagName) : doc2.createElement(tagName);
  let attrs = structure[1], start = 1;
  if (attrs && typeof attrs == "object" && attrs.nodeType == null && !Array.isArray(attrs)) {
    start = 2;
    for (let name in attrs)
      if (attrs[name] != null) {
        let space3 = name.indexOf(" ");
        if (space3 > 0)
          dom.setAttributeNS(name.slice(0, space3), name.slice(space3 + 1), attrs[name]);
        else
          dom.setAttribute(name, attrs[name]);
      }
  }
  for (let i = start; i < structure.length; i++) {
    let child = structure[i];
    if (child === 0) {
      if (i < structure.length - 1 || i > start)
        throw new RangeError("Content hole must be the only child of its parent node");
      return { dom, contentDOM: dom };
    } else {
      let { dom: inner, contentDOM: innerContent } = renderSpec(doc2, child, xmlNS, blockArraysIn);
      dom.appendChild(inner);
      if (innerContent) {
        if (contentDOM)
          throw new RangeError("Multiple content holes");
        contentDOM = innerContent;
      }
    }
  }
  return { dom, contentDOM };
}
const lower16 = 65535;
const factor16 = Math.pow(2, 16);
function makeRecover(index, offset) {
  return index + offset * factor16;
}
function recoverIndex(value) {
  return value & lower16;
}
function recoverOffset(value) {
  return (value - (value & lower16)) / factor16;
}
const DEL_BEFORE = 1, DEL_AFTER = 2, DEL_ACROSS = 4, DEL_SIDE = 8;
class MapResult {
  /**
  @internal
  */
  constructor(pos, delInfo, recover) {
    this.pos = pos;
    this.delInfo = delInfo;
    this.recover = recover;
  }
  /**
  Tells you whether the position was deleted, that is, whether the
  step removed the token on the side queried (via the `assoc`)
  argument from the document.
  */
  get deleted() {
    return (this.delInfo & DEL_SIDE) > 0;
  }
  /**
  Tells you whether the token before the mapped position was deleted.
  */
  get deletedBefore() {
    return (this.delInfo & (DEL_BEFORE | DEL_ACROSS)) > 0;
  }
  /**
  True when the token after the mapped position was deleted.
  */
  get deletedAfter() {
    return (this.delInfo & (DEL_AFTER | DEL_ACROSS)) > 0;
  }
  /**
  Tells whether any of the steps mapped through deletes across the
  position (including both the token before and after the
  position).
  */
  get deletedAcross() {
    return (this.delInfo & DEL_ACROSS) > 0;
  }
}
class StepMap {
  /**
  Create a position map. The modifications to the document are
  represented as an array of numbers, in which each group of three
  represents a modified chunk as `[start, oldSize, newSize]`.
  */
  constructor(ranges, inverted = false) {
    this.ranges = ranges;
    this.inverted = inverted;
    if (!ranges.length && StepMap.empty)
      return StepMap.empty;
  }
  /**
  @internal
  */
  recover(value) {
    let diff2 = 0, index = recoverIndex(value);
    if (!this.inverted)
      for (let i = 0; i < index; i++)
        diff2 += this.ranges[i * 3 + 2] - this.ranges[i * 3 + 1];
    return this.ranges[index * 3] + diff2 + recoverOffset(value);
  }
  mapResult(pos, assoc = 1) {
    return this._map(pos, assoc, false);
  }
  map(pos, assoc = 1) {
    return this._map(pos, assoc, true);
  }
  /**
  @internal
  */
  _map(pos, assoc, simple) {
    let diff2 = 0, oldIndex = this.inverted ? 2 : 1, newIndex = this.inverted ? 1 : 2;
    for (let i = 0; i < this.ranges.length; i += 3) {
      let start = this.ranges[i] - (this.inverted ? diff2 : 0);
      if (start > pos)
        break;
      let oldSize = this.ranges[i + oldIndex], newSize = this.ranges[i + newIndex], end = start + oldSize;
      if (pos <= end) {
        let side = !oldSize ? assoc : pos == start ? -1 : pos == end ? 1 : assoc;
        let result = start + diff2 + (side < 0 ? 0 : newSize);
        if (simple)
          return result;
        let recover = pos == (assoc < 0 ? start : end) ? null : makeRecover(i / 3, pos - start);
        let del = pos == start ? DEL_AFTER : pos == end ? DEL_BEFORE : DEL_ACROSS;
        if (assoc < 0 ? pos != start : pos != end)
          del |= DEL_SIDE;
        return new MapResult(result, del, recover);
      }
      diff2 += newSize - oldSize;
    }
    return simple ? pos + diff2 : new MapResult(pos + diff2, 0, null);
  }
  /**
  @internal
  */
  touches(pos, recover) {
    let diff2 = 0, index = recoverIndex(recover);
    let oldIndex = this.inverted ? 2 : 1, newIndex = this.inverted ? 1 : 2;
    for (let i = 0; i < this.ranges.length; i += 3) {
      let start = this.ranges[i] - (this.inverted ? diff2 : 0);
      if (start > pos)
        break;
      let oldSize = this.ranges[i + oldIndex], end = start + oldSize;
      if (pos <= end && i == index * 3)
        return true;
      diff2 += this.ranges[i + newIndex] - oldSize;
    }
    return false;
  }
  /**
  Calls the given function on each of the changed ranges included in
  this map.
  */
  forEach(f) {
    let oldIndex = this.inverted ? 2 : 1, newIndex = this.inverted ? 1 : 2;
    for (let i = 0, diff2 = 0; i < this.ranges.length; i += 3) {
      let start = this.ranges[i], oldStart = start - (this.inverted ? diff2 : 0), newStart = start + (this.inverted ? 0 : diff2);
      let oldSize = this.ranges[i + oldIndex], newSize = this.ranges[i + newIndex];
      f(oldStart, oldStart + oldSize, newStart, newStart + newSize);
      diff2 += newSize - oldSize;
    }
  }
  /**
  Create an inverted version of this map. The result can be used to
  map positions in the post-step document to the pre-step document.
  */
  invert() {
    return new StepMap(this.ranges, !this.inverted);
  }
  /**
  @internal
  */
  toString() {
    return (this.inverted ? "-" : "") + JSON.stringify(this.ranges);
  }
  /**
  Create a map that moves all positions by offset `n` (which may be
  negative). This can be useful when applying steps meant for a
  sub-document to a larger document, or vice-versa.
  */
  static offset(n) {
    return n == 0 ? StepMap.empty : new StepMap(n < 0 ? [0, -n, 0] : [0, 0, n]);
  }
}
StepMap.empty = new StepMap([]);
class Mapping {
  /**
  Create a new mapping with the given position maps.
  */
  constructor(maps = [], mirror, from = 0, to = maps.length) {
    this.maps = maps;
    this.mirror = mirror;
    this.from = from;
    this.to = to;
  }
  /**
  Create a mapping that maps only through a part of this one.
  */
  slice(from = 0, to = this.maps.length) {
    return new Mapping(this.maps, this.mirror, from, to);
  }
  /**
  @internal
  */
  copy() {
    return new Mapping(this.maps.slice(), this.mirror && this.mirror.slice(), this.from, this.to);
  }
  /**
  Add a step map to the end of this mapping. If `mirrors` is
  given, it should be the index of the step map that is the mirror
  image of this one.
  */
  appendMap(map, mirrors) {
    this.to = this.maps.push(map);
    if (mirrors != null)
      this.setMirror(this.maps.length - 1, mirrors);
  }
  /**
  Add all the step maps in a given mapping to this one (preserving
  mirroring information).
  */
  appendMapping(mapping) {
    for (let i = 0, startSize = this.maps.length; i < mapping.maps.length; i++) {
      let mirr = mapping.getMirror(i);
      this.appendMap(mapping.maps[i], mirr != null && mirr < i ? startSize + mirr : void 0);
    }
  }
  /**
  Finds the offset of the step map that mirrors the map at the
  given offset, in this mapping (as per the second argument to
  `appendMap`).
  */
  getMirror(n) {
    if (this.mirror) {
      for (let i = 0; i < this.mirror.length; i++)
        if (this.mirror[i] == n)
          return this.mirror[i + (i % 2 ? -1 : 1)];
    }
  }
  /**
  @internal
  */
  setMirror(n, m) {
    if (!this.mirror)
      this.mirror = [];
    this.mirror.push(n, m);
  }
  /**
  Append the inverse of the given mapping to this one.
  */
  appendMappingInverted(mapping) {
    for (let i = mapping.maps.length - 1, totalSize = this.maps.length + mapping.maps.length; i >= 0; i--) {
      let mirr = mapping.getMirror(i);
      this.appendMap(mapping.maps[i].invert(), mirr != null && mirr > i ? totalSize - mirr - 1 : void 0);
    }
  }
  /**
  Create an inverted version of this mapping.
  */
  invert() {
    let inverse = new Mapping();
    inverse.appendMappingInverted(this);
    return inverse;
  }
  /**
  Map a position through this mapping.
  */
  map(pos, assoc = 1) {
    if (this.mirror)
      return this._map(pos, assoc, true);
    for (let i = this.from; i < this.to; i++)
      pos = this.maps[i].map(pos, assoc);
    return pos;
  }
  /**
  Map a position through this mapping, returning a mapping
  result.
  */
  mapResult(pos, assoc = 1) {
    return this._map(pos, assoc, false);
  }
  /**
  @internal
  */
  _map(pos, assoc, simple) {
    let delInfo = 0;
    for (let i = this.from; i < this.to; i++) {
      let map = this.maps[i], result = map.mapResult(pos, assoc);
      if (result.recover != null) {
        let corr = this.getMirror(i);
        if (corr != null && corr > i && corr < this.to) {
          i = corr;
          pos = this.maps[corr].recover(result.recover);
          continue;
        }
      }
      delInfo |= result.delInfo;
      pos = result.pos;
    }
    return simple ? pos : new MapResult(pos, delInfo, null);
  }
}
const stepsByID = /* @__PURE__ */ Object.create(null);
class Step {
  /**
  Get the step map that represents the changes made by this step,
  and which can be used to transform between positions in the old
  and the new document.
  */
  getMap() {
    return StepMap.empty;
  }
  /**
  Try to merge this step with another one, to be applied directly
  after it. Returns the merged step when possible, null if the
  steps can't be merged.
  */
  merge(other) {
    return null;
  }
  /**
  Deserialize a step from its JSON representation. Will call
  through to the step class' own implementation of this method.
  */
  static fromJSON(schema2, json) {
    if (!json || !json.stepType)
      throw new RangeError("Invalid input for Step.fromJSON");
    let type = stepsByID[json.stepType];
    if (!type)
      throw new RangeError(`No step type ${json.stepType} defined`);
    return type.fromJSON(schema2, json);
  }
  /**
  To be able to serialize steps to JSON, each step needs a string
  ID to attach to its JSON representation. Use this method to
  register an ID for your step classes. Try to pick something
  that's unlikely to clash with steps from other modules.
  */
  static jsonID(id, stepClass) {
    if (id in stepsByID)
      throw new RangeError("Duplicate use of step JSON ID " + id);
    stepsByID[id] = stepClass;
    stepClass.prototype.jsonID = id;
    return stepClass;
  }
}
class StepResult {
  /**
  @internal
  */
  constructor(doc2, failed) {
    this.doc = doc2;
    this.failed = failed;
  }
  /**
  Create a successful step result.
  */
  static ok(doc2) {
    return new StepResult(doc2, null);
  }
  /**
  Create a failed step result.
  */
  static fail(message) {
    return new StepResult(null, message);
  }
  /**
  Call [`Node.replace`](https://prosemirror.net/docs/ref/#model.Node.replace) with the given
  arguments. Create a successful result if it succeeds, and a
  failed one if it throws a `ReplaceError`.
  */
  static fromReplace(doc2, from, to, slice) {
    try {
      return StepResult.ok(doc2.replace(from, to, slice));
    } catch (e) {
      if (e instanceof ReplaceError)
        return StepResult.fail(e.message);
      throw e;
    }
  }
}
function mapFragment(fragment, f, parent) {
  let mapped = [];
  for (let i = 0; i < fragment.childCount; i++) {
    let child = fragment.child(i);
    if (child.content.size)
      child = child.copy(mapFragment(child.content, f, child));
    if (child.isInline)
      child = f(child, parent, i);
    mapped.push(child);
  }
  return Fragment.fromArray(mapped);
}
class AddMarkStep extends Step {
  /**
  Create a mark step.
  */
  constructor(from, to, mark) {
    super();
    this.from = from;
    this.to = to;
    this.mark = mark;
  }
  apply(doc2) {
    let oldSlice = doc2.slice(this.from, this.to), $from = doc2.resolve(this.from);
    let parent = $from.node($from.sharedDepth(this.to));
    let slice = new Slice(mapFragment(oldSlice.content, (node, parent2) => {
      if (!node.isAtom || !parent2.type.allowsMarkType(this.mark.type))
        return node;
      return node.mark(this.mark.addToSet(node.marks));
    }, parent), oldSlice.openStart, oldSlice.openEnd);
    return StepResult.fromReplace(doc2, this.from, this.to, slice);
  }
  invert() {
    return new RemoveMarkStep(this.from, this.to, this.mark);
  }
  map(mapping) {
    let from = mapping.mapResult(this.from, 1), to = mapping.mapResult(this.to, -1);
    if (from.deleted && to.deleted || from.pos >= to.pos)
      return null;
    return new AddMarkStep(from.pos, to.pos, this.mark);
  }
  merge(other) {
    if (other instanceof AddMarkStep && other.mark.eq(this.mark) && this.from <= other.to && this.to >= other.from)
      return new AddMarkStep(Math.min(this.from, other.from), Math.max(this.to, other.to), this.mark);
    return null;
  }
  toJSON() {
    return {
      stepType: "addMark",
      mark: this.mark.toJSON(),
      from: this.from,
      to: this.to
    };
  }
  /**
  @internal
  */
  static fromJSON(schema2, json) {
    if (typeof json.from != "number" || typeof json.to != "number")
      throw new RangeError("Invalid input for AddMarkStep.fromJSON");
    return new AddMarkStep(json.from, json.to, schema2.markFromJSON(json.mark));
  }
}
Step.jsonID("addMark", AddMarkStep);
class RemoveMarkStep extends Step {
  /**
  Create a mark-removing step.
  */
  constructor(from, to, mark) {
    super();
    this.from = from;
    this.to = to;
    this.mark = mark;
  }
  apply(doc2) {
    let oldSlice = doc2.slice(this.from, this.to);
    let slice = new Slice(mapFragment(oldSlice.content, (node) => {
      return node.mark(this.mark.removeFromSet(node.marks));
    }, doc2), oldSlice.openStart, oldSlice.openEnd);
    return StepResult.fromReplace(doc2, this.from, this.to, slice);
  }
  invert() {
    return new AddMarkStep(this.from, this.to, this.mark);
  }
  map(mapping) {
    let from = mapping.mapResult(this.from, 1), to = mapping.mapResult(this.to, -1);
    if (from.deleted && to.deleted || from.pos >= to.pos)
      return null;
    return new RemoveMarkStep(from.pos, to.pos, this.mark);
  }
  merge(other) {
    if (other instanceof RemoveMarkStep && other.mark.eq(this.mark) && this.from <= other.to && this.to >= other.from)
      return new RemoveMarkStep(Math.min(this.from, other.from), Math.max(this.to, other.to), this.mark);
    return null;
  }
  toJSON() {
    return {
      stepType: "removeMark",
      mark: this.mark.toJSON(),
      from: this.from,
      to: this.to
    };
  }
  /**
  @internal
  */
  static fromJSON(schema2, json) {
    if (typeof json.from != "number" || typeof json.to != "number")
      throw new RangeError("Invalid input for RemoveMarkStep.fromJSON");
    return new RemoveMarkStep(json.from, json.to, schema2.markFromJSON(json.mark));
  }
}
Step.jsonID("removeMark", RemoveMarkStep);
class AddNodeMarkStep extends Step {
  /**
  Create a node mark step.
  */
  constructor(pos, mark) {
    super();
    this.pos = pos;
    this.mark = mark;
  }
  apply(doc2) {
    let node = doc2.nodeAt(this.pos);
    if (!node)
      return StepResult.fail("No node at mark step's position");
    let updated = node.type.create(node.attrs, null, this.mark.addToSet(node.marks));
    return StepResult.fromReplace(doc2, this.pos, this.pos + 1, new Slice(Fragment.from(updated), 0, node.isLeaf ? 0 : 1));
  }
  invert(doc2) {
    let node = doc2.nodeAt(this.pos);
    if (node) {
      let newSet = this.mark.addToSet(node.marks);
      if (newSet.length == node.marks.length) {
        for (let i = 0; i < node.marks.length; i++)
          if (!node.marks[i].isInSet(newSet))
            return new AddNodeMarkStep(this.pos, node.marks[i]);
        return new AddNodeMarkStep(this.pos, this.mark);
      }
    }
    return new RemoveNodeMarkStep(this.pos, this.mark);
  }
  map(mapping) {
    let pos = mapping.mapResult(this.pos, 1);
    return pos.deletedAfter ? null : new AddNodeMarkStep(pos.pos, this.mark);
  }
  toJSON() {
    return { stepType: "addNodeMark", pos: this.pos, mark: this.mark.toJSON() };
  }
  /**
  @internal
  */
  static fromJSON(schema2, json) {
    if (typeof json.pos != "number")
      throw new RangeError("Invalid input for AddNodeMarkStep.fromJSON");
    return new AddNodeMarkStep(json.pos, schema2.markFromJSON(json.mark));
  }
}
Step.jsonID("addNodeMark", AddNodeMarkStep);
class RemoveNodeMarkStep extends Step {
  /**
  Create a mark-removing step.
  */
  constructor(pos, mark) {
    super();
    this.pos = pos;
    this.mark = mark;
  }
  apply(doc2) {
    let node = doc2.nodeAt(this.pos);
    if (!node)
      return StepResult.fail("No node at mark step's position");
    let updated = node.type.create(node.attrs, null, this.mark.removeFromSet(node.marks));
    return StepResult.fromReplace(doc2, this.pos, this.pos + 1, new Slice(Fragment.from(updated), 0, node.isLeaf ? 0 : 1));
  }
  invert(doc2) {
    let node = doc2.nodeAt(this.pos);
    if (!node || !this.mark.isInSet(node.marks))
      return this;
    return new AddNodeMarkStep(this.pos, this.mark);
  }
  map(mapping) {
    let pos = mapping.mapResult(this.pos, 1);
    return pos.deletedAfter ? null : new RemoveNodeMarkStep(pos.pos, this.mark);
  }
  toJSON() {
    return { stepType: "removeNodeMark", pos: this.pos, mark: this.mark.toJSON() };
  }
  /**
  @internal
  */
  static fromJSON(schema2, json) {
    if (typeof json.pos != "number")
      throw new RangeError("Invalid input for RemoveNodeMarkStep.fromJSON");
    return new RemoveNodeMarkStep(json.pos, schema2.markFromJSON(json.mark));
  }
}
Step.jsonID("removeNodeMark", RemoveNodeMarkStep);
class ReplaceStep extends Step {
  /**
  The given `slice` should fit the 'gap' between `from` and
  `to`—the depths must line up, and the surrounding nodes must be
  able to be joined with the open sides of the slice. When
  `structure` is true, the step will fail if the content between
  from and to is not just a sequence of closing and then opening
  tokens (this is to guard against rebased replace steps
  overwriting something they weren't supposed to).
  */
  constructor(from, to, slice, structure = false) {
    super();
    this.from = from;
    this.to = to;
    this.slice = slice;
    this.structure = structure;
  }
  apply(doc2) {
    if (this.structure && contentBetween(doc2, this.from, this.to))
      return StepResult.fail("Structure replace would overwrite content");
    return StepResult.fromReplace(doc2, this.from, this.to, this.slice);
  }
  getMap() {
    return new StepMap([this.from, this.to - this.from, this.slice.size]);
  }
  invert(doc2) {
    return new ReplaceStep(this.from, this.from + this.slice.size, doc2.slice(this.from, this.to));
  }
  map(mapping) {
    let from = mapping.mapResult(this.from, 1), to = mapping.mapResult(this.to, -1);
    if (from.deletedAcross && to.deletedAcross)
      return null;
    return new ReplaceStep(from.pos, Math.max(from.pos, to.pos), this.slice);
  }
  merge(other) {
    if (!(other instanceof ReplaceStep) || other.structure || this.structure)
      return null;
    if (this.from + this.slice.size == other.from && !this.slice.openEnd && !other.slice.openStart) {
      let slice = this.slice.size + other.slice.size == 0 ? Slice.empty : new Slice(this.slice.content.append(other.slice.content), this.slice.openStart, other.slice.openEnd);
      return new ReplaceStep(this.from, this.to + (other.to - other.from), slice, this.structure);
    } else if (other.to == this.from && !this.slice.openStart && !other.slice.openEnd) {
      let slice = this.slice.size + other.slice.size == 0 ? Slice.empty : new Slice(other.slice.content.append(this.slice.content), other.slice.openStart, this.slice.openEnd);
      return new ReplaceStep(other.from, this.to, slice, this.structure);
    } else {
      return null;
    }
  }
  toJSON() {
    let json = { stepType: "replace", from: this.from, to: this.to };
    if (this.slice.size)
      json.slice = this.slice.toJSON();
    if (this.structure)
      json.structure = true;
    return json;
  }
  /**
  @internal
  */
  static fromJSON(schema2, json) {
    if (typeof json.from != "number" || typeof json.to != "number")
      throw new RangeError("Invalid input for ReplaceStep.fromJSON");
    return new ReplaceStep(json.from, json.to, Slice.fromJSON(schema2, json.slice), !!json.structure);
  }
}
Step.jsonID("replace", ReplaceStep);
class ReplaceAroundStep extends Step {
  /**
  Create a replace-around step with the given range and gap.
  `insert` should be the point in the slice into which the content
  of the gap should be moved. `structure` has the same meaning as
  it has in the [`ReplaceStep`](https://prosemirror.net/docs/ref/#transform.ReplaceStep) class.
  */
  constructor(from, to, gapFrom, gapTo, slice, insert2, structure = false) {
    super();
    this.from = from;
    this.to = to;
    this.gapFrom = gapFrom;
    this.gapTo = gapTo;
    this.slice = slice;
    this.insert = insert2;
    this.structure = structure;
  }
  apply(doc2) {
    if (this.structure && (contentBetween(doc2, this.from, this.gapFrom) || contentBetween(doc2, this.gapTo, this.to)))
      return StepResult.fail("Structure gap-replace would overwrite content");
    let gap = doc2.slice(this.gapFrom, this.gapTo);
    if (gap.openStart || gap.openEnd)
      return StepResult.fail("Gap is not a flat range");
    let inserted = this.slice.insertAt(this.insert, gap.content);
    if (!inserted)
      return StepResult.fail("Content does not fit in gap");
    return StepResult.fromReplace(doc2, this.from, this.to, inserted);
  }
  getMap() {
    return new StepMap([
      this.from,
      this.gapFrom - this.from,
      this.insert,
      this.gapTo,
      this.to - this.gapTo,
      this.slice.size - this.insert
    ]);
  }
  invert(doc2) {
    let gap = this.gapTo - this.gapFrom;
    return new ReplaceAroundStep(this.from, this.from + this.slice.size + gap, this.from + this.insert, this.from + this.insert + gap, doc2.slice(this.from, this.to).removeBetween(this.gapFrom - this.from, this.gapTo - this.from), this.gapFrom - this.from, this.structure);
  }
  map(mapping) {
    let from = mapping.mapResult(this.from, 1), to = mapping.mapResult(this.to, -1);
    let gapFrom = this.from == this.gapFrom ? from.pos : mapping.map(this.gapFrom, -1);
    let gapTo = this.to == this.gapTo ? to.pos : mapping.map(this.gapTo, 1);
    if (from.deletedAcross && to.deletedAcross || gapFrom < from.pos || gapTo > to.pos)
      return null;
    return new ReplaceAroundStep(from.pos, to.pos, gapFrom, gapTo, this.slice, this.insert, this.structure);
  }
  toJSON() {
    let json = {
      stepType: "replaceAround",
      from: this.from,
      to: this.to,
      gapFrom: this.gapFrom,
      gapTo: this.gapTo,
      insert: this.insert
    };
    if (this.slice.size)
      json.slice = this.slice.toJSON();
    if (this.structure)
      json.structure = true;
    return json;
  }
  /**
  @internal
  */
  static fromJSON(schema2, json) {
    if (typeof json.from != "number" || typeof json.to != "number" || typeof json.gapFrom != "number" || typeof json.gapTo != "number" || typeof json.insert != "number")
      throw new RangeError("Invalid input for ReplaceAroundStep.fromJSON");
    return new ReplaceAroundStep(json.from, json.to, json.gapFrom, json.gapTo, Slice.fromJSON(schema2, json.slice), json.insert, !!json.structure);
  }
}
Step.jsonID("replaceAround", ReplaceAroundStep);
function contentBetween(doc2, from, to) {
  let $from = doc2.resolve(from), dist = to - from, depth = $from.depth;
  while (dist > 0 && depth > 0 && $from.indexAfter(depth) == $from.node(depth).childCount) {
    depth--;
    dist--;
  }
  if (dist > 0) {
    let next = $from.node(depth).maybeChild($from.indexAfter(depth));
    while (dist > 0) {
      if (!next || next.isLeaf)
        return true;
      next = next.firstChild;
      dist--;
    }
  }
  return false;
}
function addMark(tr, from, to, mark) {
  let removed = [], added2 = [];
  let removing, adding;
  tr.doc.nodesBetween(from, to, (node, pos, parent) => {
    if (!node.isInline)
      return;
    let marks = node.marks;
    if (!mark.isInSet(marks) && parent.type.allowsMarkType(mark.type)) {
      let start = Math.max(pos, from), end = Math.min(pos + node.nodeSize, to);
      let newSet = mark.addToSet(marks);
      for (let i = 0; i < marks.length; i++) {
        if (!marks[i].isInSet(newSet)) {
          if (removing && removing.to == start && removing.mark.eq(marks[i]))
            removing.to = end;
          else
            removed.push(removing = new RemoveMarkStep(start, end, marks[i]));
        }
      }
      if (adding && adding.to == start)
        adding.to = end;
      else
        added2.push(adding = new AddMarkStep(start, end, mark));
    }
  });
  removed.forEach((s) => tr.step(s));
  added2.forEach((s) => tr.step(s));
}
function removeMark(tr, from, to, mark) {
  let matched = [], step = 0;
  tr.doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isInline)
      return;
    step++;
    let toRemove = null;
    if (mark instanceof MarkType) {
      let set = node.marks, found2;
      while (found2 = mark.isInSet(set)) {
        (toRemove || (toRemove = [])).push(found2);
        set = found2.removeFromSet(set);
      }
    } else if (mark) {
      if (mark.isInSet(node.marks))
        toRemove = [mark];
    } else {
      toRemove = node.marks;
    }
    if (toRemove && toRemove.length) {
      let end = Math.min(pos + node.nodeSize, to);
      for (let i = 0; i < toRemove.length; i++) {
        let style = toRemove[i], found2;
        for (let j = 0; j < matched.length; j++) {
          let m = matched[j];
          if (m.step == step - 1 && style.eq(matched[j].style))
            found2 = m;
        }
        if (found2) {
          found2.to = end;
          found2.step = step;
        } else {
          matched.push({ style, from: Math.max(pos, from), to: end, step });
        }
      }
    }
  });
  matched.forEach((m) => tr.step(new RemoveMarkStep(m.from, m.to, m.style)));
}
function clearIncompatible(tr, pos, parentType, match = parentType.contentMatch, clearNewlines = true) {
  let node = tr.doc.nodeAt(pos);
  let replSteps = [], cur = pos + 1;
  for (let i = 0; i < node.childCount; i++) {
    let child = node.child(i), end = cur + child.nodeSize;
    let allowed = match.matchType(child.type);
    if (!allowed) {
      replSteps.push(new ReplaceStep(cur, end, Slice.empty));
    } else {
      match = allowed;
      for (let j = 0; j < child.marks.length; j++)
        if (!parentType.allowsMarkType(child.marks[j].type))
          tr.step(new RemoveMarkStep(cur, end, child.marks[j]));
      if (clearNewlines && child.isText && parentType.whitespace != "pre") {
        let m, newline = /\r?\n|\r/g, slice;
        while (m = newline.exec(child.text)) {
          if (!slice)
            slice = new Slice(Fragment.from(parentType.schema.text(" ", parentType.allowedMarks(child.marks))), 0, 0);
          replSteps.push(new ReplaceStep(cur + m.index, cur + m.index + m[0].length, slice));
        }
      }
    }
    cur = end;
  }
  if (!match.validEnd) {
    let fill = match.fillBefore(Fragment.empty, true);
    tr.replace(cur, cur, new Slice(fill, 0, 0));
  }
  for (let i = replSteps.length - 1; i >= 0; i--)
    tr.step(replSteps[i]);
}
function lift(tr, range, target) {
  let { $from, $to, depth } = range;
  let gapStart = $from.before(depth + 1), gapEnd = $to.after(depth + 1);
  let start = gapStart, end = gapEnd;
  let before = Fragment.empty, openStart = 0;
  for (let d = depth, splitting = false; d > target; d--)
    if (splitting || $from.index(d) > 0) {
      splitting = true;
      before = Fragment.from($from.node(d).copy(before));
      openStart++;
    } else {
      start--;
    }
  let after = Fragment.empty, openEnd = 0;
  for (let d = depth, splitting = false; d > target; d--)
    if (splitting || $to.after(d + 1) < $to.end(d)) {
      splitting = true;
      after = Fragment.from($to.node(d).copy(after));
      openEnd++;
    } else {
      end++;
    }
  tr.step(new ReplaceAroundStep(start, end, gapStart, gapEnd, new Slice(before.append(after), openStart, openEnd), before.size - openStart, true));
}
function wrap(tr, range, wrappers) {
  let content = Fragment.empty;
  for (let i = wrappers.length - 1; i >= 0; i--) {
    if (content.size) {
      let match = wrappers[i].type.contentMatch.matchFragment(content);
      if (!match || !match.validEnd)
        throw new RangeError("Wrapper type given to Transform.wrap does not form valid content of its parent wrapper");
    }
    content = Fragment.from(wrappers[i].type.create(wrappers[i].attrs, content));
  }
  let start = range.start, end = range.end;
  tr.step(new ReplaceAroundStep(start, end, start, end, new Slice(content, 0, 0), wrappers.length, true));
}
function setBlockType(tr, from, to, type, attrs) {
  if (!type.isTextblock)
    throw new RangeError("Type given to setBlockType should be a textblock");
  let mapFrom = tr.steps.length;
  tr.doc.nodesBetween(from, to, (node, pos) => {
    let attrsHere = typeof attrs == "function" ? attrs(node) : attrs;
    if (node.isTextblock && !node.hasMarkup(type, attrsHere) && canChangeType(tr.doc, tr.mapping.slice(mapFrom).map(pos), type)) {
      let convertNewlines = null;
      if (type.schema.linebreakReplacement) {
        let pre = type.whitespace == "pre", supportLinebreak = !!type.contentMatch.matchType(type.schema.linebreakReplacement);
        if (pre && !supportLinebreak)
          convertNewlines = false;
        else if (!pre && supportLinebreak)
          convertNewlines = true;
      }
      if (convertNewlines === false)
        replaceLinebreaks(tr, node, pos, mapFrom);
      clearIncompatible(tr, tr.mapping.slice(mapFrom).map(pos, 1), type, void 0, convertNewlines === null);
      let mapping = tr.mapping.slice(mapFrom);
      let startM = mapping.map(pos, 1), endM = mapping.map(pos + node.nodeSize, 1);
      tr.step(new ReplaceAroundStep(startM, endM, startM + 1, endM - 1, new Slice(Fragment.from(type.create(attrsHere, null, node.marks)), 0, 0), 1, true));
      if (convertNewlines === true)
        replaceNewlines(tr, node, pos, mapFrom);
      return false;
    }
  });
}
function replaceNewlines(tr, node, pos, mapFrom) {
  node.forEach((child, offset) => {
    if (child.isText) {
      let m, newline = /\r?\n|\r/g;
      while (m = newline.exec(child.text)) {
        let start = tr.mapping.slice(mapFrom).map(pos + 1 + offset + m.index);
        tr.replaceWith(start, start + 1, node.type.schema.linebreakReplacement.create());
      }
    }
  });
}
function replaceLinebreaks(tr, node, pos, mapFrom) {
  node.forEach((child, offset) => {
    if (child.type == child.type.schema.linebreakReplacement) {
      let start = tr.mapping.slice(mapFrom).map(pos + 1 + offset);
      tr.replaceWith(start, start + 1, node.type.schema.text("\n"));
    }
  });
}
function canChangeType(doc2, pos, type) {
  let $pos = doc2.resolve(pos), index = $pos.index();
  return $pos.parent.canReplaceWith(index, index + 1, type);
}
function setNodeMarkup(tr, pos, type, attrs, marks) {
  let node = tr.doc.nodeAt(pos);
  if (!node)
    throw new RangeError("No node at given position");
  if (!type)
    type = node.type;
  let newNode = type.create(attrs, null, marks || node.marks);
  if (node.isLeaf)
    return tr.replaceWith(pos, pos + node.nodeSize, newNode);
  if (!type.validContent(node.content))
    throw new RangeError("Invalid content for node type " + type.name);
  tr.step(new ReplaceAroundStep(pos, pos + node.nodeSize, pos + 1, pos + node.nodeSize - 1, new Slice(Fragment.from(newNode), 0, 0), 1, true));
}
function canSplit(doc2, pos, depth = 1, typesAfter) {
  let $pos = doc2.resolve(pos), base2 = $pos.depth - depth;
  let innerType = typesAfter && typesAfter[typesAfter.length - 1] || $pos.parent;
  if (base2 < 0 || $pos.parent.type.spec.isolating || !$pos.parent.canReplace($pos.index(), $pos.parent.childCount) || !innerType.type.validContent($pos.parent.content.cutByIndex($pos.index(), $pos.parent.childCount)))
    return false;
  for (let d = $pos.depth - 1, i = depth - 2; d > base2; d--, i--) {
    let node = $pos.node(d), index2 = $pos.index(d);
    if (node.type.spec.isolating)
      return false;
    let rest = node.content.cutByIndex(index2, node.childCount);
    let overrideChild = typesAfter && typesAfter[i + 1];
    if (overrideChild)
      rest = rest.replaceChild(0, overrideChild.type.create(overrideChild.attrs));
    let after = typesAfter && typesAfter[i] || node;
    if (!node.canReplace(index2 + 1, node.childCount) || !after.type.validContent(rest))
      return false;
  }
  let index = $pos.indexAfter(base2);
  let baseType = typesAfter && typesAfter[0];
  return $pos.node(base2).canReplaceWith(index, index, baseType ? baseType.type : $pos.node(base2 + 1).type);
}
function split(tr, pos, depth = 1, typesAfter) {
  let $pos = tr.doc.resolve(pos), before = Fragment.empty, after = Fragment.empty;
  for (let d = $pos.depth, e = $pos.depth - depth, i = depth - 1; d > e; d--, i--) {
    before = Fragment.from($pos.node(d).copy(before));
    let typeAfter = typesAfter && typesAfter[i];
    after = Fragment.from(typeAfter ? typeAfter.type.create(typeAfter.attrs, after) : $pos.node(d).copy(after));
  }
  tr.step(new ReplaceStep(pos, pos, new Slice(before.append(after), depth, depth), true));
}
function join(tr, pos, depth) {
  let step = new ReplaceStep(pos - depth, pos + depth, Slice.empty, true);
  tr.step(step);
}
function insertPoint(doc2, pos, nodeType) {
  let $pos = doc2.resolve(pos);
  if ($pos.parent.canReplaceWith($pos.index(), $pos.index(), nodeType))
    return pos;
  if ($pos.parentOffset == 0)
    for (let d = $pos.depth - 1; d >= 0; d--) {
      let index = $pos.index(d);
      if ($pos.node(d).canReplaceWith(index, index, nodeType))
        return $pos.before(d + 1);
      if (index > 0)
        return null;
    }
  if ($pos.parentOffset == $pos.parent.content.size)
    for (let d = $pos.depth - 1; d >= 0; d--) {
      let index = $pos.indexAfter(d);
      if ($pos.node(d).canReplaceWith(index, index, nodeType))
        return $pos.after(d + 1);
      if (index < $pos.node(d).childCount)
        return null;
    }
  return null;
}
function dropPoint(doc2, pos, slice) {
  let $pos = doc2.resolve(pos);
  if (!slice.content.size)
    return pos;
  let content = slice.content;
  for (let i = 0; i < slice.openStart; i++)
    content = content.firstChild.content;
  for (let pass = 1; pass <= (slice.openStart == 0 && slice.size ? 2 : 1); pass++) {
    for (let d = $pos.depth; d >= 0; d--) {
      let bias = d == $pos.depth ? 0 : $pos.pos <= ($pos.start(d + 1) + $pos.end(d + 1)) / 2 ? -1 : 1;
      let insertPos = $pos.index(d) + (bias > 0 ? 1 : 0);
      let parent = $pos.node(d), fits = false;
      if (pass == 1) {
        fits = parent.canReplace(insertPos, insertPos, content);
      } else {
        let wrapping = parent.contentMatchAt(insertPos).findWrapping(content.firstChild.type);
        fits = wrapping && parent.canReplaceWith(insertPos, insertPos, wrapping[0]);
      }
      if (fits)
        return bias == 0 ? $pos.pos : bias < 0 ? $pos.before(d + 1) : $pos.after(d + 1);
    }
  }
  return null;
}
function replaceStep(doc2, from, to = from, slice = Slice.empty) {
  if (from == to && !slice.size)
    return null;
  let $from = doc2.resolve(from), $to = doc2.resolve(to);
  if (fitsTrivially($from, $to, slice))
    return new ReplaceStep(from, to, slice);
  return new Fitter($from, $to, slice).fit();
}
function fitsTrivially($from, $to, slice) {
  return !slice.openStart && !slice.openEnd && $from.start() == $to.start() && $from.parent.canReplace($from.index(), $to.index(), slice.content);
}
class Fitter {
  constructor($from, $to, unplaced) {
    this.$from = $from;
    this.$to = $to;
    this.unplaced = unplaced;
    this.frontier = [];
    this.placed = Fragment.empty;
    for (let i = 0; i <= $from.depth; i++) {
      let node = $from.node(i);
      this.frontier.push({
        type: node.type,
        match: node.contentMatchAt($from.indexAfter(i))
      });
    }
    for (let i = $from.depth; i > 0; i--)
      this.placed = Fragment.from($from.node(i).copy(this.placed));
  }
  get depth() {
    return this.frontier.length - 1;
  }
  fit() {
    while (this.unplaced.size) {
      let fit = this.findFittable();
      if (fit)
        this.placeNodes(fit);
      else
        this.openMore() || this.dropNode();
    }
    let moveInline = this.mustMoveInline(), placedSize = this.placed.size - this.depth - this.$from.depth;
    let $from = this.$from, $to = this.close(moveInline < 0 ? this.$to : $from.doc.resolve(moveInline));
    if (!$to)
      return null;
    let content = this.placed, openStart = $from.depth, openEnd = $to.depth;
    while (openStart && openEnd && content.childCount == 1) {
      content = content.firstChild.content;
      openStart--;
      openEnd--;
    }
    let slice = new Slice(content, openStart, openEnd);
    if (moveInline > -1)
      return new ReplaceAroundStep($from.pos, moveInline, this.$to.pos, this.$to.end(), slice, placedSize);
    if (slice.size || $from.pos != this.$to.pos)
      return new ReplaceStep($from.pos, $to.pos, slice);
    return null;
  }
  // Find a position on the start spine of `this.unplaced` that has
  // content that can be moved somewhere on the frontier. Returns two
  // depths, one for the slice and one for the frontier.
  findFittable() {
    let startDepth = this.unplaced.openStart;
    for (let cur = this.unplaced.content, d = 0, openEnd = this.unplaced.openEnd; d < startDepth; d++) {
      let node = cur.firstChild;
      if (cur.childCount > 1)
        openEnd = 0;
      if (node.type.spec.isolating && openEnd <= d) {
        startDepth = d;
        break;
      }
      cur = node.content;
    }
    for (let pass = 1; pass <= 2; pass++) {
      for (let sliceDepth = pass == 1 ? startDepth : this.unplaced.openStart; sliceDepth >= 0; sliceDepth--) {
        let fragment, parent = null;
        if (sliceDepth) {
          parent = contentAt(this.unplaced.content, sliceDepth - 1).firstChild;
          fragment = parent.content;
        } else {
          fragment = this.unplaced.content;
        }
        let first = fragment.firstChild;
        for (let frontierDepth = this.depth; frontierDepth >= 0; frontierDepth--) {
          let { type, match } = this.frontier[frontierDepth], wrap2, inject = null;
          if (pass == 1 && (first ? match.matchType(first.type) || (inject = match.fillBefore(Fragment.from(first), false)) : parent && type.compatibleContent(parent.type)))
            return { sliceDepth, frontierDepth, parent, inject };
          else if (pass == 2 && first && (wrap2 = match.findWrapping(first.type)))
            return { sliceDepth, frontierDepth, parent, wrap: wrap2 };
          if (parent && match.matchType(parent.type))
            break;
        }
      }
    }
  }
  openMore() {
    let { content, openStart, openEnd } = this.unplaced;
    let inner = contentAt(content, openStart);
    if (!inner.childCount || inner.firstChild.isLeaf)
      return false;
    this.unplaced = new Slice(content, openStart + 1, Math.max(openEnd, inner.size + openStart >= content.size - openEnd ? openStart + 1 : 0));
    return true;
  }
  dropNode() {
    let { content, openStart, openEnd } = this.unplaced;
    let inner = contentAt(content, openStart);
    if (inner.childCount <= 1 && openStart > 0) {
      let openAtEnd = content.size - openStart <= openStart + inner.size;
      this.unplaced = new Slice(dropFromFragment(content, openStart - 1, 1), openStart - 1, openAtEnd ? openStart - 1 : openEnd);
    } else {
      this.unplaced = new Slice(dropFromFragment(content, openStart, 1), openStart, openEnd);
    }
  }
  // Move content from the unplaced slice at `sliceDepth` to the
  // frontier node at `frontierDepth`. Close that frontier node when
  // applicable.
  placeNodes({ sliceDepth, frontierDepth, parent, inject, wrap: wrap2 }) {
    while (this.depth > frontierDepth)
      this.closeFrontierNode();
    if (wrap2)
      for (let i = 0; i < wrap2.length; i++)
        this.openFrontierNode(wrap2[i]);
    let slice = this.unplaced, fragment = parent ? parent.content : slice.content;
    let openStart = slice.openStart - sliceDepth;
    let taken = 0, add = [];
    let { match, type } = this.frontier[frontierDepth];
    if (inject) {
      for (let i = 0; i < inject.childCount; i++)
        add.push(inject.child(i));
      match = match.matchFragment(inject);
    }
    let openEndCount = fragment.size + sliceDepth - (slice.content.size - slice.openEnd);
    while (taken < fragment.childCount) {
      let next = fragment.child(taken), matches2 = match.matchType(next.type);
      if (!matches2)
        break;
      taken++;
      if (taken > 1 || openStart == 0 || next.content.size) {
        match = matches2;
        add.push(closeNodeStart(next.mark(type.allowedMarks(next.marks)), taken == 1 ? openStart : 0, taken == fragment.childCount ? openEndCount : -1));
      }
    }
    let toEnd = taken == fragment.childCount;
    if (!toEnd)
      openEndCount = -1;
    this.placed = addToFragment(this.placed, frontierDepth, Fragment.from(add));
    this.frontier[frontierDepth].match = match;
    if (toEnd && openEndCount < 0 && parent && parent.type == this.frontier[this.depth].type && this.frontier.length > 1)
      this.closeFrontierNode();
    for (let i = 0, cur = fragment; i < openEndCount; i++) {
      let node = cur.lastChild;
      this.frontier.push({ type: node.type, match: node.contentMatchAt(node.childCount) });
      cur = node.content;
    }
    this.unplaced = !toEnd ? new Slice(dropFromFragment(slice.content, sliceDepth, taken), slice.openStart, slice.openEnd) : sliceDepth == 0 ? Slice.empty : new Slice(dropFromFragment(slice.content, sliceDepth - 1, 1), sliceDepth - 1, openEndCount < 0 ? slice.openEnd : sliceDepth - 1);
  }
  mustMoveInline() {
    if (!this.$to.parent.isTextblock)
      return -1;
    let top = this.frontier[this.depth], level;
    if (!top.type.isTextblock || !contentAfterFits(this.$to, this.$to.depth, top.type, top.match, false) || this.$to.depth == this.depth && (level = this.findCloseLevel(this.$to)) && level.depth == this.depth)
      return -1;
    let { depth } = this.$to, after = this.$to.after(depth);
    while (depth > 1 && after == this.$to.end(--depth))
      ++after;
    return after;
  }
  findCloseLevel($to) {
    scan: for (let i = Math.min(this.depth, $to.depth); i >= 0; i--) {
      let { match, type } = this.frontier[i];
      let dropInner = i < $to.depth && $to.end(i + 1) == $to.pos + ($to.depth - (i + 1));
      let fit = contentAfterFits($to, i, type, match, dropInner);
      if (!fit)
        continue;
      for (let d = i - 1; d >= 0; d--) {
        let { match: match2, type: type2 } = this.frontier[d];
        let matches2 = contentAfterFits($to, d, type2, match2, true);
        if (!matches2 || matches2.childCount)
          continue scan;
      }
      return { depth: i, fit, move: dropInner ? $to.doc.resolve($to.after(i + 1)) : $to };
    }
  }
  close($to) {
    let close2 = this.findCloseLevel($to);
    if (!close2)
      return null;
    while (this.depth > close2.depth)
      this.closeFrontierNode();
    if (close2.fit.childCount)
      this.placed = addToFragment(this.placed, close2.depth, close2.fit);
    $to = close2.move;
    for (let d = close2.depth + 1; d <= $to.depth; d++) {
      let node = $to.node(d), add = node.type.contentMatch.fillBefore(node.content, true, $to.index(d));
      this.openFrontierNode(node.type, node.attrs, add);
    }
    return $to;
  }
  openFrontierNode(type, attrs = null, content) {
    let top = this.frontier[this.depth];
    top.match = top.match.matchType(type);
    this.placed = addToFragment(this.placed, this.depth, Fragment.from(type.create(attrs, content)));
    this.frontier.push({ type, match: type.contentMatch });
  }
  closeFrontierNode() {
    let open = this.frontier.pop();
    let add = open.match.fillBefore(Fragment.empty, true);
    if (add.childCount)
      this.placed = addToFragment(this.placed, this.frontier.length, add);
  }
}
function dropFromFragment(fragment, depth, count) {
  if (depth == 0)
    return fragment.cutByIndex(count, fragment.childCount);
  return fragment.replaceChild(0, fragment.firstChild.copy(dropFromFragment(fragment.firstChild.content, depth - 1, count)));
}
function addToFragment(fragment, depth, content) {
  if (depth == 0)
    return fragment.append(content);
  return fragment.replaceChild(fragment.childCount - 1, fragment.lastChild.copy(addToFragment(fragment.lastChild.content, depth - 1, content)));
}
function contentAt(fragment, depth) {
  for (let i = 0; i < depth; i++)
    fragment = fragment.firstChild.content;
  return fragment;
}
function closeNodeStart(node, openStart, openEnd) {
  if (openStart <= 0)
    return node;
  let frag = node.content;
  if (openStart > 1)
    frag = frag.replaceChild(0, closeNodeStart(frag.firstChild, openStart - 1, frag.childCount == 1 ? openEnd - 1 : 0));
  if (openStart > 0) {
    frag = node.type.contentMatch.fillBefore(frag).append(frag);
    if (openEnd <= 0)
      frag = frag.append(node.type.contentMatch.matchFragment(frag).fillBefore(Fragment.empty, true));
  }
  return node.copy(frag);
}
function contentAfterFits($to, depth, type, match, open) {
  let node = $to.node(depth), index = open ? $to.indexAfter(depth) : $to.index(depth);
  if (index == node.childCount && !type.compatibleContent(node.type))
    return null;
  let fit = match.fillBefore(node.content, true, index);
  return fit && !invalidMarks(type, node.content, index) ? fit : null;
}
function invalidMarks(type, fragment, start) {
  for (let i = start; i < fragment.childCount; i++)
    if (!type.allowsMarks(fragment.child(i).marks))
      return true;
  return false;
}
function definesContent(type) {
  return type.spec.defining || type.spec.definingForContent;
}
function replaceRange(tr, from, to, slice) {
  if (!slice.size)
    return tr.deleteRange(from, to);
  let $from = tr.doc.resolve(from), $to = tr.doc.resolve(to);
  if (fitsTrivially($from, $to, slice))
    return tr.step(new ReplaceStep(from, to, slice));
  let targetDepths = coveredDepths($from, tr.doc.resolve(to));
  if (targetDepths[targetDepths.length - 1] == 0)
    targetDepths.pop();
  let preferredTarget = -($from.depth + 1);
  targetDepths.unshift(preferredTarget);
  for (let d = $from.depth, pos = $from.pos - 1; d > 0; d--, pos--) {
    let spec = $from.node(d).type.spec;
    if (spec.defining || spec.definingAsContext || spec.isolating)
      break;
    if (targetDepths.indexOf(d) > -1)
      preferredTarget = d;
    else if ($from.before(d) == pos)
      targetDepths.splice(1, 0, -d);
  }
  let preferredTargetIndex = targetDepths.indexOf(preferredTarget);
  let leftNodes = [], preferredDepth = slice.openStart;
  for (let content = slice.content, i = 0; ; i++) {
    let node = content.firstChild;
    leftNodes.push(node);
    if (i == slice.openStart)
      break;
    content = node.content;
  }
  for (let d = preferredDepth - 1; d >= 0; d--) {
    let leftNode = leftNodes[d], def = definesContent(leftNode.type);
    if (def && !leftNode.sameMarkup($from.node(Math.abs(preferredTarget) - 1)))
      preferredDepth = d;
    else if (def || !leftNode.type.isTextblock)
      break;
  }
  for (let j = slice.openStart; j >= 0; j--) {
    let openDepth = (j + preferredDepth + 1) % (slice.openStart + 1);
    let insert2 = leftNodes[openDepth];
    if (!insert2)
      continue;
    for (let i = 0; i < targetDepths.length; i++) {
      let targetDepth = targetDepths[(i + preferredTargetIndex) % targetDepths.length], expand = true;
      if (targetDepth < 0) {
        expand = false;
        targetDepth = -targetDepth;
      }
      let parent = $from.node(targetDepth - 1), index = $from.index(targetDepth - 1);
      if (parent.canReplaceWith(index, index, insert2.type, insert2.marks))
        return tr.replace($from.before(targetDepth), expand ? $to.after(targetDepth) : to, new Slice(closeFragment(slice.content, 0, slice.openStart, openDepth), openDepth, slice.openEnd));
    }
  }
  let startSteps = tr.steps.length;
  for (let i = targetDepths.length - 1; i >= 0; i--) {
    tr.replace(from, to, slice);
    if (tr.steps.length > startSteps)
      break;
    let depth = targetDepths[i];
    if (depth < 0)
      continue;
    from = $from.before(depth);
    to = $to.after(depth);
  }
}
function closeFragment(fragment, depth, oldOpen, newOpen, parent) {
  if (depth < oldOpen) {
    let first = fragment.firstChild;
    fragment = fragment.replaceChild(0, first.copy(closeFragment(first.content, depth + 1, oldOpen, newOpen, first)));
  }
  if (depth > newOpen) {
    let match = parent.contentMatchAt(0);
    let start = match.fillBefore(fragment).append(fragment);
    fragment = start.append(match.matchFragment(start).fillBefore(Fragment.empty, true));
  }
  return fragment;
}
function replaceRangeWith(tr, from, to, node) {
  if (!node.isInline && from == to && tr.doc.resolve(from).parent.content.size) {
    let point = insertPoint(tr.doc, from, node.type);
    if (point != null)
      from = to = point;
  }
  tr.replaceRange(from, to, new Slice(Fragment.from(node), 0, 0));
}
function deleteRange(tr, from, to) {
  let $from = tr.doc.resolve(from), $to = tr.doc.resolve(to);
  let covered = coveredDepths($from, $to);
  for (let i = 0; i < covered.length; i++) {
    let depth = covered[i], last = i == covered.length - 1;
    if (last && depth == 0 || $from.node(depth).type.contentMatch.validEnd)
      return tr.delete($from.start(depth), $to.end(depth));
    if (depth > 0 && (last || $from.node(depth - 1).canReplace($from.index(depth - 1), $to.indexAfter(depth - 1))))
      return tr.delete($from.before(depth), $to.after(depth));
  }
  for (let d = 1; d <= $from.depth && d <= $to.depth; d++) {
    if (from - $from.start(d) == $from.depth - d && to > $from.end(d) && $to.end(d) - to != $to.depth - d)
      return tr.delete($from.before(d), to);
  }
  tr.delete(from, to);
}
function coveredDepths($from, $to) {
  let result = [], minDepth = Math.min($from.depth, $to.depth);
  for (let d = minDepth; d >= 0; d--) {
    let start = $from.start(d);
    if (start < $from.pos - ($from.depth - d) || $to.end(d) > $to.pos + ($to.depth - d) || $from.node(d).type.spec.isolating || $to.node(d).type.spec.isolating)
      break;
    if (start == $to.start(d) || d == $from.depth && d == $to.depth && $from.parent.inlineContent && $to.parent.inlineContent && d && $to.start(d - 1) == start - 1)
      result.push(d);
  }
  return result;
}
class AttrStep extends Step {
  /**
  Construct an attribute step.
  */
  constructor(pos, attr2, value) {
    super();
    this.pos = pos;
    this.attr = attr2;
    this.value = value;
  }
  apply(doc2) {
    let node = doc2.nodeAt(this.pos);
    if (!node)
      return StepResult.fail("No node at attribute step's position");
    let attrs = /* @__PURE__ */ Object.create(null);
    for (let name in node.attrs)
      attrs[name] = node.attrs[name];
    attrs[this.attr] = this.value;
    let updated = node.type.create(attrs, null, node.marks);
    return StepResult.fromReplace(doc2, this.pos, this.pos + 1, new Slice(Fragment.from(updated), 0, node.isLeaf ? 0 : 1));
  }
  getMap() {
    return StepMap.empty;
  }
  invert(doc2) {
    return new AttrStep(this.pos, this.attr, doc2.nodeAt(this.pos).attrs[this.attr]);
  }
  map(mapping) {
    let pos = mapping.mapResult(this.pos, 1);
    return pos.deletedAfter ? null : new AttrStep(pos.pos, this.attr, this.value);
  }
  toJSON() {
    return { stepType: "attr", pos: this.pos, attr: this.attr, value: this.value };
  }
  static fromJSON(schema2, json) {
    if (typeof json.pos != "number" || typeof json.attr != "string")
      throw new RangeError("Invalid input for AttrStep.fromJSON");
    return new AttrStep(json.pos, json.attr, json.value);
  }
}
Step.jsonID("attr", AttrStep);
class DocAttrStep extends Step {
  /**
  Construct an attribute step.
  */
  constructor(attr2, value) {
    super();
    this.attr = attr2;
    this.value = value;
  }
  apply(doc2) {
    let attrs = /* @__PURE__ */ Object.create(null);
    for (let name in doc2.attrs)
      attrs[name] = doc2.attrs[name];
    attrs[this.attr] = this.value;
    let updated = doc2.type.create(attrs, doc2.content, doc2.marks);
    return StepResult.ok(updated);
  }
  getMap() {
    return StepMap.empty;
  }
  invert(doc2) {
    return new DocAttrStep(this.attr, doc2.attrs[this.attr]);
  }
  map(mapping) {
    return this;
  }
  toJSON() {
    return { stepType: "docAttr", attr: this.attr, value: this.value };
  }
  static fromJSON(schema2, json) {
    if (typeof json.attr != "string")
      throw new RangeError("Invalid input for DocAttrStep.fromJSON");
    return new DocAttrStep(json.attr, json.value);
  }
}
Step.jsonID("docAttr", DocAttrStep);
let TransformError = class extends Error {
};
TransformError = function TransformError2(message) {
  let err = Error.call(this, message);
  err.__proto__ = TransformError2.prototype;
  return err;
};
TransformError.prototype = Object.create(Error.prototype);
TransformError.prototype.constructor = TransformError;
TransformError.prototype.name = "TransformError";
class Transform {
  /**
  Create a transform that starts with the given document.
  */
  constructor(doc2) {
    this.doc = doc2;
    this.steps = [];
    this.docs = [];
    this.mapping = new Mapping();
  }
  /**
  The starting document.
  */
  get before() {
    return this.docs.length ? this.docs[0] : this.doc;
  }
  /**
  Apply a new step in this transform, saving the result. Throws an
  error when the step fails.
  */
  step(step) {
    let result = this.maybeStep(step);
    if (result.failed)
      throw new TransformError(result.failed);
    return this;
  }
  /**
  Try to apply a step in this transformation, ignoring it if it
  fails. Returns the step result.
  */
  maybeStep(step) {
    let result = step.apply(this.doc);
    if (!result.failed)
      this.addStep(step, result.doc);
    return result;
  }
  /**
  True when the document has been changed (when there are any
  steps).
  */
  get docChanged() {
    return this.steps.length > 0;
  }
  /**
  @internal
  */
  addStep(step, doc2) {
    this.docs.push(this.doc);
    this.steps.push(step);
    this.mapping.appendMap(step.getMap());
    this.doc = doc2;
  }
  /**
  Replace the part of the document between `from` and `to` with the
  given `slice`.
  */
  replace(from, to = from, slice = Slice.empty) {
    let step = replaceStep(this.doc, from, to, slice);
    if (step)
      this.step(step);
    return this;
  }
  /**
  Replace the given range with the given content, which may be a
  fragment, node, or array of nodes.
  */
  replaceWith(from, to, content) {
    return this.replace(from, to, new Slice(Fragment.from(content), 0, 0));
  }
  /**
  Delete the content between the given positions.
  */
  delete(from, to) {
    return this.replace(from, to, Slice.empty);
  }
  /**
  Insert the given content at the given position.
  */
  insert(pos, content) {
    return this.replaceWith(pos, pos, content);
  }
  /**
  Replace a range of the document with a given slice, using
  `from`, `to`, and the slice's
  [`openStart`](https://prosemirror.net/docs/ref/#model.Slice.openStart) property as hints, rather
  than fixed start and end points. This method may grow the
  replaced area or close open nodes in the slice in order to get a
  fit that is more in line with WYSIWYG expectations, by dropping
  fully covered parent nodes of the replaced region when they are
  marked [non-defining as
  context](https://prosemirror.net/docs/ref/#model.NodeSpec.definingAsContext), or including an
  open parent node from the slice that _is_ marked as [defining
  its content](https://prosemirror.net/docs/ref/#model.NodeSpec.definingForContent).
  
  This is the method, for example, to handle paste. The similar
  [`replace`](https://prosemirror.net/docs/ref/#transform.Transform.replace) method is a more
  primitive tool which will _not_ move the start and end of its given
  range, and is useful in situations where you need more precise
  control over what happens.
  */
  replaceRange(from, to, slice) {
    replaceRange(this, from, to, slice);
    return this;
  }
  /**
  Replace the given range with a node, but use `from` and `to` as
  hints, rather than precise positions. When from and to are the same
  and are at the start or end of a parent node in which the given
  node doesn't fit, this method may _move_ them out towards a parent
  that does allow the given node to be placed. When the given range
  completely covers a parent node, this method may completely replace
  that parent node.
  */
  replaceRangeWith(from, to, node) {
    replaceRangeWith(this, from, to, node);
    return this;
  }
  /**
  Delete the given range, expanding it to cover fully covered
  parent nodes until a valid replace is found.
  */
  deleteRange(from, to) {
    deleteRange(this, from, to);
    return this;
  }
  /**
  Split the content in the given range off from its parent, if there
  is sibling content before or after it, and move it up the tree to
  the depth specified by `target`. You'll probably want to use
  [`liftTarget`](https://prosemirror.net/docs/ref/#transform.liftTarget) to compute `target`, to make
  sure the lift is valid.
  */
  lift(range, target) {
    lift(this, range, target);
    return this;
  }
  /**
  Join the blocks around the given position. If depth is 2, their
  last and first siblings are also joined, and so on.
  */
  join(pos, depth = 1) {
    join(this, pos, depth);
    return this;
  }
  /**
  Wrap the given [range](https://prosemirror.net/docs/ref/#model.NodeRange) in the given set of wrappers.
  The wrappers are assumed to be valid in this position, and should
  probably be computed with [`findWrapping`](https://prosemirror.net/docs/ref/#transform.findWrapping).
  */
  wrap(range, wrappers) {
    wrap(this, range, wrappers);
    return this;
  }
  /**
  Set the type of all textblocks (partly) between `from` and `to` to
  the given node type with the given attributes.
  */
  setBlockType(from, to = from, type, attrs = null) {
    setBlockType(this, from, to, type, attrs);
    return this;
  }
  /**
  Change the type, attributes, and/or marks of the node at `pos`.
  When `type` isn't given, the existing node type is preserved,
  */
  setNodeMarkup(pos, type, attrs = null, marks) {
    setNodeMarkup(this, pos, type, attrs, marks);
    return this;
  }
  /**
  Set a single attribute on a given node to a new value.
  The `pos` addresses the document content. Use `setDocAttribute`
  to set attributes on the document itself.
  */
  setNodeAttribute(pos, attr2, value) {
    this.step(new AttrStep(pos, attr2, value));
    return this;
  }
  /**
  Set a single attribute on the document to a new value.
  */
  setDocAttribute(attr2, value) {
    this.step(new DocAttrStep(attr2, value));
    return this;
  }
  /**
  Add a mark to the node at position `pos`.
  */
  addNodeMark(pos, mark) {
    this.step(new AddNodeMarkStep(pos, mark));
    return this;
  }
  /**
  Remove a mark (or a mark of the given type) from the node at
  position `pos`.
  */
  removeNodeMark(pos, mark) {
    if (!(mark instanceof Mark)) {
      let node = this.doc.nodeAt(pos);
      if (!node)
        throw new RangeError("No node at position " + pos);
      mark = mark.isInSet(node.marks);
      if (!mark)
        return this;
    }
    this.step(new RemoveNodeMarkStep(pos, mark));
    return this;
  }
  /**
  Split the node at the given position, and optionally, if `depth` is
  greater than one, any number of nodes above that. By default, the
  parts split off will inherit the node type of the original node.
  This can be changed by passing an array of types and attributes to
  use after the split.
  */
  split(pos, depth = 1, typesAfter) {
    split(this, pos, depth, typesAfter);
    return this;
  }
  /**
  Add the given mark to the inline content between `from` and `to`.
  */
  addMark(from, to, mark) {
    addMark(this, from, to, mark);
    return this;
  }
  /**
  Remove marks from inline nodes between `from` and `to`. When
  `mark` is a single mark, remove precisely that mark. When it is
  a mark type, remove all marks of that type. When it is null,
  remove all marks of any type.
  */
  removeMark(from, to, mark) {
    removeMark(this, from, to, mark);
    return this;
  }
  /**
  Removes all marks and nodes from the content of the node at
  `pos` that don't match the given new parent node type. Accepts
  an optional starting [content match](https://prosemirror.net/docs/ref/#model.ContentMatch) as
  third argument.
  */
  clearIncompatible(pos, parentType, match) {
    clearIncompatible(this, pos, parentType, match);
    return this;
  }
}
const classesById = /* @__PURE__ */ Object.create(null);
class Selection {
  /**
  Initialize a selection with the head and anchor and ranges. If no
  ranges are given, constructs a single range across `$anchor` and
  `$head`.
  */
  constructor($anchor, $head, ranges) {
    this.$anchor = $anchor;
    this.$head = $head;
    this.ranges = ranges || [new SelectionRange($anchor.min($head), $anchor.max($head))];
  }
  /**
  The selection's anchor, as an unresolved position.
  */
  get anchor() {
    return this.$anchor.pos;
  }
  /**
  The selection's head.
  */
  get head() {
    return this.$head.pos;
  }
  /**
  The lower bound of the selection's main range.
  */
  get from() {
    return this.$from.pos;
  }
  /**
  The upper bound of the selection's main range.
  */
  get to() {
    return this.$to.pos;
  }
  /**
  The resolved lower  bound of the selection's main range.
  */
  get $from() {
    return this.ranges[0].$from;
  }
  /**
  The resolved upper bound of the selection's main range.
  */
  get $to() {
    return this.ranges[0].$to;
  }
  /**
  Indicates whether the selection contains any content.
  */
  get empty() {
    let ranges = this.ranges;
    for (let i = 0; i < ranges.length; i++)
      if (ranges[i].$from.pos != ranges[i].$to.pos)
        return false;
    return true;
  }
  /**
  Get the content of this selection as a slice.
  */
  content() {
    return this.$from.doc.slice(this.from, this.to, true);
  }
  /**
  Replace the selection with a slice or, if no slice is given,
  delete the selection. Will append to the given transaction.
  */
  replace(tr, content = Slice.empty) {
    let lastNode = content.content.lastChild, lastParent = null;
    for (let i = 0; i < content.openEnd; i++) {
      lastParent = lastNode;
      lastNode = lastNode.lastChild;
    }
    let mapFrom = tr.steps.length, ranges = this.ranges;
    for (let i = 0; i < ranges.length; i++) {
      let { $from, $to } = ranges[i], mapping = tr.mapping.slice(mapFrom);
      tr.replaceRange(mapping.map($from.pos), mapping.map($to.pos), i ? Slice.empty : content);
      if (i == 0)
        selectionToInsertionEnd(tr, mapFrom, (lastNode ? lastNode.isInline : lastParent && lastParent.isTextblock) ? -1 : 1);
    }
  }
  /**
  Replace the selection with the given node, appending the changes
  to the given transaction.
  */
  replaceWith(tr, node) {
    let mapFrom = tr.steps.length, ranges = this.ranges;
    for (let i = 0; i < ranges.length; i++) {
      let { $from, $to } = ranges[i], mapping = tr.mapping.slice(mapFrom);
      let from = mapping.map($from.pos), to = mapping.map($to.pos);
      if (i) {
        tr.deleteRange(from, to);
      } else {
        tr.replaceRangeWith(from, to, node);
        selectionToInsertionEnd(tr, mapFrom, node.isInline ? -1 : 1);
      }
    }
  }
  /**
  Find a valid cursor or leaf node selection starting at the given
  position and searching back if `dir` is negative, and forward if
  positive. When `textOnly` is true, only consider cursor
  selections. Will return null when no valid selection position is
  found.
  */
  static findFrom($pos, dir, textOnly = false) {
    let inner = $pos.parent.inlineContent ? new TextSelection($pos) : findSelectionIn($pos.node(0), $pos.parent, $pos.pos, $pos.index(), dir, textOnly);
    if (inner)
      return inner;
    for (let depth = $pos.depth - 1; depth >= 0; depth--) {
      let found2 = dir < 0 ? findSelectionIn($pos.node(0), $pos.node(depth), $pos.before(depth + 1), $pos.index(depth), dir, textOnly) : findSelectionIn($pos.node(0), $pos.node(depth), $pos.after(depth + 1), $pos.index(depth) + 1, dir, textOnly);
      if (found2)
        return found2;
    }
    return null;
  }
  /**
  Find a valid cursor or leaf node selection near the given
  position. Searches forward first by default, but if `bias` is
  negative, it will search backwards first.
  */
  static near($pos, bias = 1) {
    return this.findFrom($pos, bias) || this.findFrom($pos, -bias) || new AllSelection($pos.node(0));
  }
  /**
  Find the cursor or leaf node selection closest to the start of
  the given document. Will return an
  [`AllSelection`](https://prosemirror.net/docs/ref/#state.AllSelection) if no valid position
  exists.
  */
  static atStart(doc2) {
    return findSelectionIn(doc2, doc2, 0, 0, 1) || new AllSelection(doc2);
  }
  /**
  Find the cursor or leaf node selection closest to the end of the
  given document.
  */
  static atEnd(doc2) {
    return findSelectionIn(doc2, doc2, doc2.content.size, doc2.childCount, -1) || new AllSelection(doc2);
  }
  /**
  Deserialize the JSON representation of a selection. Must be
  implemented for custom classes (as a static class method).
  */
  static fromJSON(doc2, json) {
    if (!json || !json.type)
      throw new RangeError("Invalid input for Selection.fromJSON");
    let cls = classesById[json.type];
    if (!cls)
      throw new RangeError(`No selection type ${json.type} defined`);
    return cls.fromJSON(doc2, json);
  }
  /**
  To be able to deserialize selections from JSON, custom selection
  classes must register themselves with an ID string, so that they
  can be disambiguated. Try to pick something that's unlikely to
  clash with classes from other modules.
  */
  static jsonID(id, selectionClass) {
    if (id in classesById)
      throw new RangeError("Duplicate use of selection JSON ID " + id);
    classesById[id] = selectionClass;
    selectionClass.prototype.jsonID = id;
    return selectionClass;
  }
  /**
  Get a [bookmark](https://prosemirror.net/docs/ref/#state.SelectionBookmark) for this selection,
  which is a value that can be mapped without having access to a
  current document, and later resolved to a real selection for a
  given document again. (This is used mostly by the history to
  track and restore old selections.) The default implementation of
  this method just converts the selection to a text selection and
  returns the bookmark for that.
  */
  getBookmark() {
    return TextSelection.between(this.$anchor, this.$head).getBookmark();
  }
}
Selection.prototype.visible = true;
class SelectionRange {
  /**
  Create a range.
  */
  constructor($from, $to) {
    this.$from = $from;
    this.$to = $to;
  }
}
let warnedAboutTextSelection = false;
function checkTextSelection($pos) {
  if (!warnedAboutTextSelection && !$pos.parent.inlineContent) {
    warnedAboutTextSelection = true;
    console["warn"]("TextSelection endpoint not pointing into a node with inline content (" + $pos.parent.type.name + ")");
  }
}
class TextSelection extends Selection {
  /**
  Construct a text selection between the given points.
  */
  constructor($anchor, $head = $anchor) {
    checkTextSelection($anchor);
    checkTextSelection($head);
    super($anchor, $head);
  }
  /**
  Returns a resolved position if this is a cursor selection (an
  empty text selection), and null otherwise.
  */
  get $cursor() {
    return this.$anchor.pos == this.$head.pos ? this.$head : null;
  }
  map(doc2, mapping) {
    let $head = doc2.resolve(mapping.map(this.head));
    if (!$head.parent.inlineContent)
      return Selection.near($head);
    let $anchor = doc2.resolve(mapping.map(this.anchor));
    return new TextSelection($anchor.parent.inlineContent ? $anchor : $head, $head);
  }
  replace(tr, content = Slice.empty) {
    super.replace(tr, content);
    if (content == Slice.empty) {
      let marks = this.$from.marksAcross(this.$to);
      if (marks)
        tr.ensureMarks(marks);
    }
  }
  eq(other) {
    return other instanceof TextSelection && other.anchor == this.anchor && other.head == this.head;
  }
  getBookmark() {
    return new TextBookmark(this.anchor, this.head);
  }
  toJSON() {
    return { type: "text", anchor: this.anchor, head: this.head };
  }
  /**
  @internal
  */
  static fromJSON(doc2, json) {
    if (typeof json.anchor != "number" || typeof json.head != "number")
      throw new RangeError("Invalid input for TextSelection.fromJSON");
    return new TextSelection(doc2.resolve(json.anchor), doc2.resolve(json.head));
  }
  /**
  Create a text selection from non-resolved positions.
  */
  static create(doc2, anchor, head = anchor) {
    let $anchor = doc2.resolve(anchor);
    return new this($anchor, head == anchor ? $anchor : doc2.resolve(head));
  }
  /**
  Return a text selection that spans the given positions or, if
  they aren't text positions, find a text selection near them.
  `bias` determines whether the method searches forward (default)
  or backwards (negative number) first. Will fall back to calling
  [`Selection.near`](https://prosemirror.net/docs/ref/#state.Selection^near) when the document
  doesn't contain a valid text position.
  */
  static between($anchor, $head, bias) {
    let dPos = $anchor.pos - $head.pos;
    if (!bias || dPos)
      bias = dPos >= 0 ? 1 : -1;
    if (!$head.parent.inlineContent) {
      let found2 = Selection.findFrom($head, bias, true) || Selection.findFrom($head, -bias, true);
      if (found2)
        $head = found2.$head;
      else
        return Selection.near($head, bias);
    }
    if (!$anchor.parent.inlineContent) {
      if (dPos == 0) {
        $anchor = $head;
      } else {
        $anchor = (Selection.findFrom($anchor, -bias, true) || Selection.findFrom($anchor, bias, true)).$anchor;
        if ($anchor.pos < $head.pos != dPos < 0)
          $anchor = $head;
      }
    }
    return new TextSelection($anchor, $head);
  }
}
Selection.jsonID("text", TextSelection);
class TextBookmark {
  constructor(anchor, head) {
    this.anchor = anchor;
    this.head = head;
  }
  map(mapping) {
    return new TextBookmark(mapping.map(this.anchor), mapping.map(this.head));
  }
  resolve(doc2) {
    return TextSelection.between(doc2.resolve(this.anchor), doc2.resolve(this.head));
  }
}
class NodeSelection extends Selection {
  /**
  Create a node selection. Does not verify the validity of its
  argument.
  */
  constructor($pos) {
    let node = $pos.nodeAfter;
    let $end = $pos.node(0).resolve($pos.pos + node.nodeSize);
    super($pos, $end);
    this.node = node;
  }
  map(doc2, mapping) {
    let { deleted: deleted2, pos } = mapping.mapResult(this.anchor);
    let $pos = doc2.resolve(pos);
    if (deleted2)
      return Selection.near($pos);
    return new NodeSelection($pos);
  }
  content() {
    return new Slice(Fragment.from(this.node), 0, 0);
  }
  eq(other) {
    return other instanceof NodeSelection && other.anchor == this.anchor;
  }
  toJSON() {
    return { type: "node", anchor: this.anchor };
  }
  getBookmark() {
    return new NodeBookmark(this.anchor);
  }
  /**
  @internal
  */
  static fromJSON(doc2, json) {
    if (typeof json.anchor != "number")
      throw new RangeError("Invalid input for NodeSelection.fromJSON");
    return new NodeSelection(doc2.resolve(json.anchor));
  }
  /**
  Create a node selection from non-resolved positions.
  */
  static create(doc2, from) {
    return new NodeSelection(doc2.resolve(from));
  }
  /**
  Determines whether the given node may be selected as a node
  selection.
  */
  static isSelectable(node) {
    return !node.isText && node.type.spec.selectable !== false;
  }
}
NodeSelection.prototype.visible = false;
Selection.jsonID("node", NodeSelection);
class NodeBookmark {
  constructor(anchor) {
    this.anchor = anchor;
  }
  map(mapping) {
    let { deleted: deleted2, pos } = mapping.mapResult(this.anchor);
    return deleted2 ? new TextBookmark(pos, pos) : new NodeBookmark(pos);
  }
  resolve(doc2) {
    let $pos = doc2.resolve(this.anchor), node = $pos.nodeAfter;
    if (node && NodeSelection.isSelectable(node))
      return new NodeSelection($pos);
    return Selection.near($pos);
  }
}
class AllSelection extends Selection {
  /**
  Create an all-selection over the given document.
  */
  constructor(doc2) {
    super(doc2.resolve(0), doc2.resolve(doc2.content.size));
  }
  replace(tr, content = Slice.empty) {
    if (content == Slice.empty) {
      tr.delete(0, tr.doc.content.size);
      let sel = Selection.atStart(tr.doc);
      if (!sel.eq(tr.selection))
        tr.setSelection(sel);
    } else {
      super.replace(tr, content);
    }
  }
  toJSON() {
    return { type: "all" };
  }
  /**
  @internal
  */
  static fromJSON(doc2) {
    return new AllSelection(doc2);
  }
  map(doc2) {
    return new AllSelection(doc2);
  }
  eq(other) {
    return other instanceof AllSelection;
  }
  getBookmark() {
    return AllBookmark;
  }
}
Selection.jsonID("all", AllSelection);
const AllBookmark = {
  map() {
    return this;
  },
  resolve(doc2) {
    return new AllSelection(doc2);
  }
};
function findSelectionIn(doc2, node, pos, index, dir, text2 = false) {
  if (node.inlineContent)
    return TextSelection.create(doc2, pos);
  for (let i = index - (dir > 0 ? 0 : 1); dir > 0 ? i < node.childCount : i >= 0; i += dir) {
    let child = node.child(i);
    if (!child.isAtom) {
      let inner = findSelectionIn(doc2, child, pos + dir, dir < 0 ? child.childCount : 0, dir, text2);
      if (inner)
        return inner;
    } else if (!text2 && NodeSelection.isSelectable(child)) {
      return NodeSelection.create(doc2, pos - (dir < 0 ? child.nodeSize : 0));
    }
    pos += child.nodeSize * dir;
  }
  return null;
}
function selectionToInsertionEnd(tr, startLen, bias) {
  let last = tr.steps.length - 1;
  if (last < startLen)
    return;
  let step = tr.steps[last];
  if (!(step instanceof ReplaceStep || step instanceof ReplaceAroundStep))
    return;
  let map = tr.mapping.maps[last], end;
  map.forEach((_from, _to, _newFrom, newTo) => {
    if (end == null)
      end = newTo;
  });
  tr.setSelection(Selection.near(tr.doc.resolve(end), bias));
}
const UPDATED_SEL = 1, UPDATED_MARKS = 2, UPDATED_SCROLL = 4;
class Transaction extends Transform {
  /**
  @internal
  */
  constructor(state2) {
    super(state2.doc);
    this.curSelectionFor = 0;
    this.updated = 0;
    this.meta = /* @__PURE__ */ Object.create(null);
    this.time = Date.now();
    this.curSelection = state2.selection;
    this.storedMarks = state2.storedMarks;
  }
  /**
  The transaction's current selection. This defaults to the editor
  selection [mapped](https://prosemirror.net/docs/ref/#state.Selection.map) through the steps in the
  transaction, but can be overwritten with
  [`setSelection`](https://prosemirror.net/docs/ref/#state.Transaction.setSelection).
  */
  get selection() {
    if (this.curSelectionFor < this.steps.length) {
      this.curSelection = this.curSelection.map(this.doc, this.mapping.slice(this.curSelectionFor));
      this.curSelectionFor = this.steps.length;
    }
    return this.curSelection;
  }
  /**
  Update the transaction's current selection. Will determine the
  selection that the editor gets when the transaction is applied.
  */
  setSelection(selection) {
    if (selection.$from.doc != this.doc)
      throw new RangeError("Selection passed to setSelection must point at the current document");
    this.curSelection = selection;
    this.curSelectionFor = this.steps.length;
    this.updated = (this.updated | UPDATED_SEL) & ~UPDATED_MARKS;
    this.storedMarks = null;
    return this;
  }
  /**
  Whether the selection was explicitly updated by this transaction.
  */
  get selectionSet() {
    return (this.updated & UPDATED_SEL) > 0;
  }
  /**
  Set the current stored marks.
  */
  setStoredMarks(marks) {
    this.storedMarks = marks;
    this.updated |= UPDATED_MARKS;
    return this;
  }
  /**
  Make sure the current stored marks or, if that is null, the marks
  at the selection, match the given set of marks. Does nothing if
  this is already the case.
  */
  ensureMarks(marks) {
    if (!Mark.sameSet(this.storedMarks || this.selection.$from.marks(), marks))
      this.setStoredMarks(marks);
    return this;
  }
  /**
  Add a mark to the set of stored marks.
  */
  addStoredMark(mark) {
    return this.ensureMarks(mark.addToSet(this.storedMarks || this.selection.$head.marks()));
  }
  /**
  Remove a mark or mark type from the set of stored marks.
  */
  removeStoredMark(mark) {
    return this.ensureMarks(mark.removeFromSet(this.storedMarks || this.selection.$head.marks()));
  }
  /**
  Whether the stored marks were explicitly set for this transaction.
  */
  get storedMarksSet() {
    return (this.updated & UPDATED_MARKS) > 0;
  }
  /**
  @internal
  */
  addStep(step, doc2) {
    super.addStep(step, doc2);
    this.updated = this.updated & ~UPDATED_MARKS;
    this.storedMarks = null;
  }
  /**
  Update the timestamp for the transaction.
  */
  setTime(time) {
    this.time = time;
    return this;
  }
  /**
  Replace the current selection with the given slice.
  */
  replaceSelection(slice) {
    this.selection.replace(this, slice);
    return this;
  }
  /**
  Replace the selection with the given node. When `inheritMarks` is
  true and the content is inline, it inherits the marks from the
  place where it is inserted.
  */
  replaceSelectionWith(node, inheritMarks = true) {
    let selection = this.selection;
    if (inheritMarks)
      node = node.mark(this.storedMarks || (selection.empty ? selection.$from.marks() : selection.$from.marksAcross(selection.$to) || Mark.none));
    selection.replaceWith(this, node);
    return this;
  }
  /**
  Delete the selection.
  */
  deleteSelection() {
    this.selection.replace(this);
    return this;
  }
  /**
  Replace the given range, or the selection if no range is given,
  with a text node containing the given string.
  */
  insertText(text2, from, to) {
    let schema2 = this.doc.type.schema;
    if (from == null) {
      if (!text2)
        return this.deleteSelection();
      return this.replaceSelectionWith(schema2.text(text2), true);
    } else {
      if (to == null)
        to = from;
      to = to == null ? from : to;
      if (!text2)
        return this.deleteRange(from, to);
      let marks = this.storedMarks;
      if (!marks) {
        let $from = this.doc.resolve(from);
        marks = to == from ? $from.marks() : $from.marksAcross(this.doc.resolve(to));
      }
      this.replaceRangeWith(from, to, schema2.text(text2, marks));
      if (!this.selection.empty)
        this.setSelection(Selection.near(this.selection.$to));
      return this;
    }
  }
  /**
  Store a metadata property in this transaction, keyed either by
  name or by plugin.
  */
  setMeta(key, value) {
    this.meta[typeof key == "string" ? key : key.key] = value;
    return this;
  }
  /**
  Retrieve a metadata property for a given name or plugin.
  */
  getMeta(key) {
    return this.meta[typeof key == "string" ? key : key.key];
  }
  /**
  Returns true if this transaction doesn't contain any metadata,
  and can thus safely be extended.
  */
  get isGeneric() {
    for (let _ in this.meta)
      return false;
    return true;
  }
  /**
  Indicate that the editor should scroll the selection into view
  when updated to the state produced by this transaction.
  */
  scrollIntoView() {
    this.updated |= UPDATED_SCROLL;
    return this;
  }
  /**
  True when this transaction has had `scrollIntoView` called on it.
  */
  get scrolledIntoView() {
    return (this.updated & UPDATED_SCROLL) > 0;
  }
}
function bind(f, self) {
  return !self || !f ? f : f.bind(self);
}
class FieldDesc {
  constructor(name, desc, self) {
    this.name = name;
    this.init = bind(desc.init, self);
    this.apply = bind(desc.apply, self);
  }
}
const baseFields = [
  new FieldDesc("doc", {
    init(config) {
      return config.doc || config.schema.topNodeType.createAndFill();
    },
    apply(tr) {
      return tr.doc;
    }
  }),
  new FieldDesc("selection", {
    init(config, instance2) {
      return config.selection || Selection.atStart(instance2.doc);
    },
    apply(tr) {
      return tr.selection;
    }
  }),
  new FieldDesc("storedMarks", {
    init(config) {
      return config.storedMarks || null;
    },
    apply(tr, _marks, _old, state2) {
      return state2.selection.$cursor ? tr.storedMarks : null;
    }
  }),
  new FieldDesc("scrollToSelection", {
    init() {
      return 0;
    },
    apply(tr, prev) {
      return tr.scrolledIntoView ? prev + 1 : prev;
    }
  })
];
class Configuration {
  constructor(schema2, plugins) {
    this.schema = schema2;
    this.plugins = [];
    this.pluginsByKey = /* @__PURE__ */ Object.create(null);
    this.fields = baseFields.slice();
    if (plugins)
      plugins.forEach((plugin) => {
        if (this.pluginsByKey[plugin.key])
          throw new RangeError("Adding different instances of a keyed plugin (" + plugin.key + ")");
        this.plugins.push(plugin);
        this.pluginsByKey[plugin.key] = plugin;
        if (plugin.spec.state)
          this.fields.push(new FieldDesc(plugin.key, plugin.spec.state, plugin));
      });
  }
}
class EditorState {
  /**
  @internal
  */
  constructor(config) {
    this.config = config;
  }
  /**
  The schema of the state's document.
  */
  get schema() {
    return this.config.schema;
  }
  /**
  The plugins that are active in this state.
  */
  get plugins() {
    return this.config.plugins;
  }
  /**
  Apply the given transaction to produce a new state.
  */
  apply(tr) {
    return this.applyTransaction(tr).state;
  }
  /**
  @internal
  */
  filterTransaction(tr, ignore = -1) {
    for (let i = 0; i < this.config.plugins.length; i++)
      if (i != ignore) {
        let plugin = this.config.plugins[i];
        if (plugin.spec.filterTransaction && !plugin.spec.filterTransaction.call(plugin, tr, this))
          return false;
      }
    return true;
  }
  /**
  Verbose variant of [`apply`](https://prosemirror.net/docs/ref/#state.EditorState.apply) that
  returns the precise transactions that were applied (which might
  be influenced by the [transaction
  hooks](https://prosemirror.net/docs/ref/#state.PluginSpec.filterTransaction) of
  plugins) along with the new state.
  */
  applyTransaction(rootTr) {
    if (!this.filterTransaction(rootTr))
      return { state: this, transactions: [] };
    let trs = [rootTr], newState = this.applyInner(rootTr), seen = null;
    for (; ; ) {
      let haveNew = false;
      for (let i = 0; i < this.config.plugins.length; i++) {
        let plugin = this.config.plugins[i];
        if (plugin.spec.appendTransaction) {
          let n = seen ? seen[i].n : 0, oldState = seen ? seen[i].state : this;
          let tr = n < trs.length && plugin.spec.appendTransaction.call(plugin, n ? trs.slice(n) : trs, oldState, newState);
          if (tr && newState.filterTransaction(tr, i)) {
            tr.setMeta("appendedTransaction", rootTr);
            if (!seen) {
              seen = [];
              for (let j = 0; j < this.config.plugins.length; j++)
                seen.push(j < i ? { state: newState, n: trs.length } : { state: this, n: 0 });
            }
            trs.push(tr);
            newState = newState.applyInner(tr);
            haveNew = true;
          }
          if (seen)
            seen[i] = { state: newState, n: trs.length };
        }
      }
      if (!haveNew)
        return { state: newState, transactions: trs };
    }
  }
  /**
  @internal
  */
  applyInner(tr) {
    if (!tr.before.eq(this.doc))
      throw new RangeError("Applying a mismatched transaction");
    let newInstance = new EditorState(this.config), fields = this.config.fields;
    for (let i = 0; i < fields.length; i++) {
      let field = fields[i];
      newInstance[field.name] = field.apply(tr, this[field.name], this, newInstance);
    }
    return newInstance;
  }
  /**
  Start a [transaction](https://prosemirror.net/docs/ref/#state.Transaction) from this state.
  */
  get tr() {
    return new Transaction(this);
  }
  /**
  Create a new state.
  */
  static create(config) {
    let $config = new Configuration(config.doc ? config.doc.type.schema : config.schema, config.plugins);
    let instance2 = new EditorState($config);
    for (let i = 0; i < $config.fields.length; i++)
      instance2[$config.fields[i].name] = $config.fields[i].init(config, instance2);
    return instance2;
  }
  /**
  Create a new state based on this one, but with an adjusted set
  of active plugins. State fields that exist in both sets of
  plugins are kept unchanged. Those that no longer exist are
  dropped, and those that are new are initialized using their
  [`init`](https://prosemirror.net/docs/ref/#state.StateField.init) method, passing in the new
  configuration object..
  */
  reconfigure(config) {
    let $config = new Configuration(this.schema, config.plugins);
    let fields = $config.fields, instance2 = new EditorState($config);
    for (let i = 0; i < fields.length; i++) {
      let name = fields[i].name;
      instance2[name] = this.hasOwnProperty(name) ? this[name] : fields[i].init(config, instance2);
    }
    return instance2;
  }
  /**
  Serialize this state to JSON. If you want to serialize the state
  of plugins, pass an object mapping property names to use in the
  resulting JSON object to plugin objects. The argument may also be
  a string or number, in which case it is ignored, to support the
  way `JSON.stringify` calls `toString` methods.
  */
  toJSON(pluginFields) {
    let result = { doc: this.doc.toJSON(), selection: this.selection.toJSON() };
    if (this.storedMarks)
      result.storedMarks = this.storedMarks.map((m) => m.toJSON());
    if (pluginFields && typeof pluginFields == "object")
      for (let prop in pluginFields) {
        if (prop == "doc" || prop == "selection")
          throw new RangeError("The JSON fields `doc` and `selection` are reserved");
        let plugin = pluginFields[prop], state2 = plugin.spec.state;
        if (state2 && state2.toJSON)
          result[prop] = state2.toJSON.call(plugin, this[plugin.key]);
      }
    return result;
  }
  /**
  Deserialize a JSON representation of a state. `config` should
  have at least a `schema` field, and should contain array of
  plugins to initialize the state with. `pluginFields` can be used
  to deserialize the state of plugins, by associating plugin
  instances with the property names they use in the JSON object.
  */
  static fromJSON(config, json, pluginFields) {
    if (!json)
      throw new RangeError("Invalid input for EditorState.fromJSON");
    if (!config.schema)
      throw new RangeError("Required config field 'schema' missing");
    let $config = new Configuration(config.schema, config.plugins);
    let instance2 = new EditorState($config);
    $config.fields.forEach((field) => {
      if (field.name == "doc") {
        instance2.doc = Node.fromJSON(config.schema, json.doc);
      } else if (field.name == "selection") {
        instance2.selection = Selection.fromJSON(instance2.doc, json.selection);
      } else if (field.name == "storedMarks") {
        if (json.storedMarks)
          instance2.storedMarks = json.storedMarks.map(config.schema.markFromJSON);
      } else {
        if (pluginFields)
          for (let prop in pluginFields) {
            let plugin = pluginFields[prop], state2 = plugin.spec.state;
            if (plugin.key == field.name && state2 && state2.fromJSON && Object.prototype.hasOwnProperty.call(json, prop)) {
              instance2[field.name] = state2.fromJSON.call(plugin, config, json[prop], instance2);
              return;
            }
          }
        instance2[field.name] = field.init(config, instance2);
      }
    });
    return instance2;
  }
}
function bindProps(obj, self, target) {
  for (let prop in obj) {
    let val = obj[prop];
    if (val instanceof Function)
      val = val.bind(self);
    else if (prop == "handleDOMEvents")
      val = bindProps(val, self, {});
    target[prop] = val;
  }
  return target;
}
class Plugin {
  /**
  Create a plugin.
  */
  constructor(spec) {
    this.spec = spec;
    this.props = {};
    if (spec.props)
      bindProps(spec.props, this, this.props);
    this.key = spec.key ? spec.key.key : createKey("plugin");
  }
  /**
  Extract the plugin's state field from an editor state.
  */
  getState(state2) {
    return state2[this.key];
  }
}
const keys = /* @__PURE__ */ Object.create(null);
function createKey(name) {
  if (name in keys)
    return name + "$" + ++keys[name];
  keys[name] = 0;
  return name + "$";
}
const domIndex = function(node) {
  for (var index = 0; ; index++) {
    node = node.previousSibling;
    if (!node)
      return index;
  }
};
const parentNode = function(node) {
  let parent = node.assignedSlot || node.parentNode;
  return parent && parent.nodeType == 11 ? parent.host : parent;
};
let reusedRange = null;
const textRange = function(node, from, to) {
  let range = reusedRange || (reusedRange = document.createRange());
  range.setEnd(node, to == null ? node.nodeValue.length : to);
  range.setStart(node, from || 0);
  return range;
};
const clearReusedRange = function() {
  reusedRange = null;
};
const isEquivalentPosition = function(node, off, targetNode, targetOff) {
  return targetNode && (scanFor(node, off, targetNode, targetOff, -1) || scanFor(node, off, targetNode, targetOff, 1));
};
const atomElements = /^(img|br|input|textarea|hr)$/i;
function scanFor(node, off, targetNode, targetOff, dir) {
  for (; ; ) {
    if (node == targetNode && off == targetOff)
      return true;
    if (off == (dir < 0 ? 0 : nodeSize(node))) {
      let parent = node.parentNode;
      if (!parent || parent.nodeType != 1 || hasBlockDesc(node) || atomElements.test(node.nodeName) || node.contentEditable == "false")
        return false;
      off = domIndex(node) + (dir < 0 ? 0 : 1);
      node = parent;
    } else if (node.nodeType == 1) {
      node = node.childNodes[off + (dir < 0 ? -1 : 0)];
      if (node.contentEditable == "false")
        return false;
      off = dir < 0 ? nodeSize(node) : 0;
    } else {
      return false;
    }
  }
}
function nodeSize(node) {
  return node.nodeType == 3 ? node.nodeValue.length : node.childNodes.length;
}
function textNodeBefore$1(node, offset) {
  for (; ; ) {
    if (node.nodeType == 3 && offset)
      return node;
    if (node.nodeType == 1 && offset > 0) {
      if (node.contentEditable == "false")
        return null;
      node = node.childNodes[offset - 1];
      offset = nodeSize(node);
    } else if (node.parentNode && !hasBlockDesc(node)) {
      offset = domIndex(node);
      node = node.parentNode;
    } else {
      return null;
    }
  }
}
function textNodeAfter$1(node, offset) {
  for (; ; ) {
    if (node.nodeType == 3 && offset < node.nodeValue.length)
      return node;
    if (node.nodeType == 1 && offset < node.childNodes.length) {
      if (node.contentEditable == "false")
        return null;
      node = node.childNodes[offset];
      offset = 0;
    } else if (node.parentNode && !hasBlockDesc(node)) {
      offset = domIndex(node) + 1;
      node = node.parentNode;
    } else {
      return null;
    }
  }
}
function isOnEdge(node, offset, parent) {
  for (let atStart = offset == 0, atEnd = offset == nodeSize(node); atStart || atEnd; ) {
    if (node == parent)
      return true;
    let index = domIndex(node);
    node = node.parentNode;
    if (!node)
      return false;
    atStart = atStart && index == 0;
    atEnd = atEnd && index == nodeSize(node);
  }
}
function hasBlockDesc(dom) {
  let desc;
  for (let cur = dom; cur; cur = cur.parentNode)
    if (desc = cur.pmViewDesc)
      break;
  return desc && desc.node && desc.node.isBlock && (desc.dom == dom || desc.contentDOM == dom);
}
const selectionCollapsed = function(domSel) {
  return domSel.focusNode && isEquivalentPosition(domSel.focusNode, domSel.focusOffset, domSel.anchorNode, domSel.anchorOffset);
};
function keyEvent(keyCode, key) {
  let event = document.createEvent("Event");
  event.initEvent("keydown", true, true);
  event.keyCode = keyCode;
  event.key = event.code = key;
  return event;
}
function deepActiveElement(doc2) {
  let elt = doc2.activeElement;
  while (elt && elt.shadowRoot)
    elt = elt.shadowRoot.activeElement;
  return elt;
}
function caretFromPoint(doc2, x, y) {
  if (doc2.caretPositionFromPoint) {
    try {
      let pos = doc2.caretPositionFromPoint(x, y);
      if (pos)
        return { node: pos.offsetNode, offset: Math.min(nodeSize(pos.offsetNode), pos.offset) };
    } catch (_) {
    }
  }
  if (doc2.caretRangeFromPoint) {
    let range = doc2.caretRangeFromPoint(x, y);
    if (range)
      return { node: range.startContainer, offset: Math.min(nodeSize(range.startContainer), range.startOffset) };
  }
}
const nav = typeof navigator != "undefined" ? navigator : null;
const doc = typeof document != "undefined" ? document : null;
const agent = nav && nav.userAgent || "";
const ie_edge = /Edge\/(\d+)/.exec(agent);
const ie_upto10 = /MSIE \d/.exec(agent);
const ie_11up = /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(agent);
const ie$1 = !!(ie_upto10 || ie_11up || ie_edge);
const ie_version = ie_upto10 ? document.documentMode : ie_11up ? +ie_11up[1] : ie_edge ? +ie_edge[1] : 0;
const gecko = !ie$1 && /gecko\/(\d+)/i.test(agent);
gecko && +(/Firefox\/(\d+)/.exec(agent) || [0, 0])[1];
const _chrome = !ie$1 && /Chrome\/(\d+)/.exec(agent);
const chrome = !!_chrome;
const chrome_version = _chrome ? +_chrome[1] : 0;
const safari = !ie$1 && !!nav && /Apple Computer/.test(nav.vendor);
const ios = safari && (/Mobile\/\w+/.test(agent) || !!nav && nav.maxTouchPoints > 2);
const mac$2 = ios || (nav ? /Mac/.test(nav.platform) : false);
const windows = nav ? /Win/.test(nav.platform) : false;
const android = /Android \d/.test(agent);
const webkit = !!doc && "webkitFontSmoothing" in doc.documentElement.style;
const webkit_version = webkit ? +(/\bAppleWebKit\/(\d+)/.exec(navigator.userAgent) || [0, 0])[1] : 0;
function windowRect(doc2) {
  let vp = doc2.defaultView && doc2.defaultView.visualViewport;
  if (vp)
    return {
      left: 0,
      right: vp.width,
      top: 0,
      bottom: vp.height
    };
  return {
    left: 0,
    right: doc2.documentElement.clientWidth,
    top: 0,
    bottom: doc2.documentElement.clientHeight
  };
}
function getSide(value, side) {
  return typeof value == "number" ? value : value[side];
}
function clientRect(node) {
  let rect = node.getBoundingClientRect();
  let scaleX = rect.width / node.offsetWidth || 1;
  let scaleY = rect.height / node.offsetHeight || 1;
  return {
    left: rect.left,
    right: rect.left + node.clientWidth * scaleX,
    top: rect.top,
    bottom: rect.top + node.clientHeight * scaleY
  };
}
function scrollRectIntoView(view2, rect, startDOM) {
  let scrollThreshold = view2.someProp("scrollThreshold") || 0, scrollMargin = view2.someProp("scrollMargin") || 5;
  let doc2 = view2.dom.ownerDocument;
  for (let parent = startDOM || view2.dom; ; parent = parentNode(parent)) {
    if (!parent)
      break;
    if (parent.nodeType != 1)
      continue;
    let elt = parent;
    let atTop = elt == doc2.body;
    let bounding = atTop ? windowRect(doc2) : clientRect(elt);
    let moveX = 0, moveY = 0;
    if (rect.top < bounding.top + getSide(scrollThreshold, "top"))
      moveY = -(bounding.top - rect.top + getSide(scrollMargin, "top"));
    else if (rect.bottom > bounding.bottom - getSide(scrollThreshold, "bottom"))
      moveY = rect.bottom - rect.top > bounding.bottom - bounding.top ? rect.top + getSide(scrollMargin, "top") - bounding.top : rect.bottom - bounding.bottom + getSide(scrollMargin, "bottom");
    if (rect.left < bounding.left + getSide(scrollThreshold, "left"))
      moveX = -(bounding.left - rect.left + getSide(scrollMargin, "left"));
    else if (rect.right > bounding.right - getSide(scrollThreshold, "right"))
      moveX = rect.right - bounding.right + getSide(scrollMargin, "right");
    if (moveX || moveY) {
      if (atTop) {
        doc2.defaultView.scrollBy(moveX, moveY);
      } else {
        let startX = elt.scrollLeft, startY = elt.scrollTop;
        if (moveY)
          elt.scrollTop += moveY;
        if (moveX)
          elt.scrollLeft += moveX;
        let dX = elt.scrollLeft - startX, dY = elt.scrollTop - startY;
        rect = { left: rect.left - dX, top: rect.top - dY, right: rect.right - dX, bottom: rect.bottom - dY };
      }
    }
    if (atTop || /^(fixed|sticky)$/.test(getComputedStyle(parent).position))
      break;
  }
}
function storeScrollPos(view2) {
  let rect = view2.dom.getBoundingClientRect(), startY = Math.max(0, rect.top);
  let refDOM, refTop;
  for (let x = (rect.left + rect.right) / 2, y = startY + 1; y < Math.min(innerHeight, rect.bottom); y += 5) {
    let dom = view2.root.elementFromPoint(x, y);
    if (!dom || dom == view2.dom || !view2.dom.contains(dom))
      continue;
    let localRect = dom.getBoundingClientRect();
    if (localRect.top >= startY - 20) {
      refDOM = dom;
      refTop = localRect.top;
      break;
    }
  }
  return { refDOM, refTop, stack: scrollStack(view2.dom) };
}
function scrollStack(dom) {
  let stack = [], doc2 = dom.ownerDocument;
  for (let cur = dom; cur; cur = parentNode(cur)) {
    stack.push({ dom: cur, top: cur.scrollTop, left: cur.scrollLeft });
    if (dom == doc2)
      break;
  }
  return stack;
}
function resetScrollPos({ refDOM, refTop, stack }) {
  let newRefTop = refDOM ? refDOM.getBoundingClientRect().top : 0;
  restoreScrollStack(stack, newRefTop == 0 ? 0 : newRefTop - refTop);
}
function restoreScrollStack(stack, dTop) {
  for (let i = 0; i < stack.length; i++) {
    let { dom, top, left } = stack[i];
    if (dom.scrollTop != top + dTop)
      dom.scrollTop = top + dTop;
    if (dom.scrollLeft != left)
      dom.scrollLeft = left;
  }
}
let preventScrollSupported = null;
function focusPreventScroll(dom) {
  if (dom.setActive)
    return dom.setActive();
  if (preventScrollSupported)
    return dom.focus(preventScrollSupported);
  let stored = scrollStack(dom);
  dom.focus(preventScrollSupported == null ? {
    get preventScroll() {
      preventScrollSupported = { preventScroll: true };
      return true;
    }
  } : void 0);
  if (!preventScrollSupported) {
    preventScrollSupported = false;
    restoreScrollStack(stored, 0);
  }
}
function findOffsetInNode(node, coords) {
  let closest, dxClosest = 2e8, coordsClosest, offset = 0;
  let rowBot = coords.top, rowTop = coords.top;
  let firstBelow, coordsBelow;
  for (let child = node.firstChild, childIndex = 0; child; child = child.nextSibling, childIndex++) {
    let rects;
    if (child.nodeType == 1)
      rects = child.getClientRects();
    else if (child.nodeType == 3)
      rects = textRange(child).getClientRects();
    else
      continue;
    for (let i = 0; i < rects.length; i++) {
      let rect = rects[i];
      if (rect.top <= rowBot && rect.bottom >= rowTop) {
        rowBot = Math.max(rect.bottom, rowBot);
        rowTop = Math.min(rect.top, rowTop);
        let dx = rect.left > coords.left ? rect.left - coords.left : rect.right < coords.left ? coords.left - rect.right : 0;
        if (dx < dxClosest) {
          closest = child;
          dxClosest = dx;
          coordsClosest = dx && closest.nodeType == 3 ? {
            left: rect.right < coords.left ? rect.right : rect.left,
            top: coords.top
          } : coords;
          if (child.nodeType == 1 && dx)
            offset = childIndex + (coords.left >= (rect.left + rect.right) / 2 ? 1 : 0);
          continue;
        }
      } else if (rect.top > coords.top && !firstBelow && rect.left <= coords.left && rect.right >= coords.left) {
        firstBelow = child;
        coordsBelow = { left: Math.max(rect.left, Math.min(rect.right, coords.left)), top: rect.top };
      }
      if (!closest && (coords.left >= rect.right && coords.top >= rect.top || coords.left >= rect.left && coords.top >= rect.bottom))
        offset = childIndex + 1;
    }
  }
  if (!closest && firstBelow) {
    closest = firstBelow;
    coordsClosest = coordsBelow;
    dxClosest = 0;
  }
  if (closest && closest.nodeType == 3)
    return findOffsetInText(closest, coordsClosest);
  if (!closest || dxClosest && closest.nodeType == 1)
    return { node, offset };
  return findOffsetInNode(closest, coordsClosest);
}
function findOffsetInText(node, coords) {
  let len = node.nodeValue.length;
  let range = document.createRange();
  for (let i = 0; i < len; i++) {
    range.setEnd(node, i + 1);
    range.setStart(node, i);
    let rect = singleRect(range, 1);
    if (rect.top == rect.bottom)
      continue;
    if (inRect(coords, rect))
      return { node, offset: i + (coords.left >= (rect.left + rect.right) / 2 ? 1 : 0) };
  }
  return { node, offset: 0 };
}
function inRect(coords, rect) {
  return coords.left >= rect.left - 1 && coords.left <= rect.right + 1 && coords.top >= rect.top - 1 && coords.top <= rect.bottom + 1;
}
function targetKludge(dom, coords) {
  let parent = dom.parentNode;
  if (parent && /^li$/i.test(parent.nodeName) && coords.left < dom.getBoundingClientRect().left)
    return parent;
  return dom;
}
function posFromElement(view2, elt, coords) {
  let { node, offset } = findOffsetInNode(elt, coords), bias = -1;
  if (node.nodeType == 1 && !node.firstChild) {
    let rect = node.getBoundingClientRect();
    bias = rect.left != rect.right && coords.left > (rect.left + rect.right) / 2 ? 1 : -1;
  }
  return view2.docView.posFromDOM(node, offset, bias);
}
function posFromCaret(view2, node, offset, coords) {
  let outsideBlock = -1;
  for (let cur = node, sawBlock = false; ; ) {
    if (cur == view2.dom)
      break;
    let desc = view2.docView.nearestDesc(cur, true);
    if (!desc)
      return null;
    if (desc.dom.nodeType == 1 && (desc.node.isBlock && desc.parent || !desc.contentDOM)) {
      let rect = desc.dom.getBoundingClientRect();
      if (desc.node.isBlock && desc.parent) {
        if (!sawBlock && rect.left > coords.left || rect.top > coords.top)
          outsideBlock = desc.posBefore;
        else if (!sawBlock && rect.right < coords.left || rect.bottom < coords.top)
          outsideBlock = desc.posAfter;
        sawBlock = true;
      }
      if (!desc.contentDOM && outsideBlock < 0 && !desc.node.isText) {
        let before = desc.node.isBlock ? coords.top < (rect.top + rect.bottom) / 2 : coords.left < (rect.left + rect.right) / 2;
        return before ? desc.posBefore : desc.posAfter;
      }
    }
    cur = desc.dom.parentNode;
  }
  return outsideBlock > -1 ? outsideBlock : view2.docView.posFromDOM(node, offset, -1);
}
function elementFromPoint(element2, coords, box) {
  let len = element2.childNodes.length;
  if (len && box.top < box.bottom) {
    for (let startI = Math.max(0, Math.min(len - 1, Math.floor(len * (coords.top - box.top) / (box.bottom - box.top)) - 2)), i = startI; ; ) {
      let child = element2.childNodes[i];
      if (child.nodeType == 1) {
        let rects = child.getClientRects();
        for (let j = 0; j < rects.length; j++) {
          let rect = rects[j];
          if (inRect(coords, rect))
            return elementFromPoint(child, coords, rect);
        }
      }
      if ((i = (i + 1) % len) == startI)
        break;
    }
  }
  return element2;
}
function posAtCoords(view2, coords) {
  let doc2 = view2.dom.ownerDocument, node, offset = 0;
  let caret = caretFromPoint(doc2, coords.left, coords.top);
  if (caret)
    ({ node, offset } = caret);
  let elt = (view2.root.elementFromPoint ? view2.root : doc2).elementFromPoint(coords.left, coords.top);
  let pos;
  if (!elt || !view2.dom.contains(elt.nodeType != 1 ? elt.parentNode : elt)) {
    let box = view2.dom.getBoundingClientRect();
    if (!inRect(coords, box))
      return null;
    elt = elementFromPoint(view2.dom, coords, box);
    if (!elt)
      return null;
  }
  if (safari) {
    for (let p = elt; node && p; p = parentNode(p))
      if (p.draggable)
        node = void 0;
  }
  elt = targetKludge(elt, coords);
  if (node) {
    if (gecko && node.nodeType == 1) {
      offset = Math.min(offset, node.childNodes.length);
      if (offset < node.childNodes.length) {
        let next = node.childNodes[offset], box;
        if (next.nodeName == "IMG" && (box = next.getBoundingClientRect()).right <= coords.left && box.bottom > coords.top)
          offset++;
      }
    }
    let prev;
    if (webkit && offset && node.nodeType == 1 && (prev = node.childNodes[offset - 1]).nodeType == 1 && prev.contentEditable == "false" && prev.getBoundingClientRect().top >= coords.top)
      offset--;
    if (node == view2.dom && offset == node.childNodes.length - 1 && node.lastChild.nodeType == 1 && coords.top > node.lastChild.getBoundingClientRect().bottom)
      pos = view2.state.doc.content.size;
    else if (offset == 0 || node.nodeType != 1 || node.childNodes[offset - 1].nodeName != "BR")
      pos = posFromCaret(view2, node, offset, coords);
  }
  if (pos == null)
    pos = posFromElement(view2, elt, coords);
  let desc = view2.docView.nearestDesc(elt, true);
  return { pos, inside: desc ? desc.posAtStart - desc.border : -1 };
}
function nonZero(rect) {
  return rect.top < rect.bottom || rect.left < rect.right;
}
function singleRect(target, bias) {
  let rects = target.getClientRects();
  if (rects.length) {
    let first = rects[bias < 0 ? 0 : rects.length - 1];
    if (nonZero(first))
      return first;
  }
  return Array.prototype.find.call(rects, nonZero) || target.getBoundingClientRect();
}
const BIDI = /[\u0590-\u05f4\u0600-\u06ff\u0700-\u08ac]/;
function coordsAtPos(view2, pos, side) {
  let { node, offset, atom } = view2.docView.domFromPos(pos, side < 0 ? -1 : 1);
  let supportEmptyRange = webkit || gecko;
  if (node.nodeType == 3) {
    if (supportEmptyRange && (BIDI.test(node.nodeValue) || (side < 0 ? !offset : offset == node.nodeValue.length))) {
      let rect = singleRect(textRange(node, offset, offset), side);
      if (gecko && offset && /\s/.test(node.nodeValue[offset - 1]) && offset < node.nodeValue.length) {
        let rectBefore = singleRect(textRange(node, offset - 1, offset - 1), -1);
        if (rectBefore.top == rect.top) {
          let rectAfter = singleRect(textRange(node, offset, offset + 1), -1);
          if (rectAfter.top != rect.top)
            return flattenV(rectAfter, rectAfter.left < rectBefore.left);
        }
      }
      return rect;
    } else {
      let from = offset, to = offset, takeSide = side < 0 ? 1 : -1;
      if (side < 0 && !offset) {
        to++;
        takeSide = -1;
      } else if (side >= 0 && offset == node.nodeValue.length) {
        from--;
        takeSide = 1;
      } else if (side < 0) {
        from--;
      } else {
        to++;
      }
      return flattenV(singleRect(textRange(node, from, to), takeSide), takeSide < 0);
    }
  }
  let $dom = view2.state.doc.resolve(pos - (atom || 0));
  if (!$dom.parent.inlineContent) {
    if (atom == null && offset && (side < 0 || offset == nodeSize(node))) {
      let before = node.childNodes[offset - 1];
      if (before.nodeType == 1)
        return flattenH(before.getBoundingClientRect(), false);
    }
    if (atom == null && offset < nodeSize(node)) {
      let after = node.childNodes[offset];
      if (after.nodeType == 1)
        return flattenH(after.getBoundingClientRect(), true);
    }
    return flattenH(node.getBoundingClientRect(), side >= 0);
  }
  if (atom == null && offset && (side < 0 || offset == nodeSize(node))) {
    let before = node.childNodes[offset - 1];
    let target = before.nodeType == 3 ? textRange(before, nodeSize(before) - (supportEmptyRange ? 0 : 1)) : before.nodeType == 1 && (before.nodeName != "BR" || !before.nextSibling) ? before : null;
    if (target)
      return flattenV(singleRect(target, 1), false);
  }
  if (atom == null && offset < nodeSize(node)) {
    let after = node.childNodes[offset];
    while (after.pmViewDesc && after.pmViewDesc.ignoreForCoords)
      after = after.nextSibling;
    let target = !after ? null : after.nodeType == 3 ? textRange(after, 0, supportEmptyRange ? 0 : 1) : after.nodeType == 1 ? after : null;
    if (target)
      return flattenV(singleRect(target, -1), true);
  }
  return flattenV(singleRect(node.nodeType == 3 ? textRange(node) : node, -side), side >= 0);
}
function flattenV(rect, left) {
  if (rect.width == 0)
    return rect;
  let x = left ? rect.left : rect.right;
  return { top: rect.top, bottom: rect.bottom, left: x, right: x };
}
function flattenH(rect, top) {
  if (rect.height == 0)
    return rect;
  let y = top ? rect.top : rect.bottom;
  return { top: y, bottom: y, left: rect.left, right: rect.right };
}
function withFlushedState(view2, state2, f) {
  let viewState = view2.state, active2 = view2.root.activeElement;
  if (viewState != state2)
    view2.updateState(state2);
  if (active2 != view2.dom)
    view2.focus();
  try {
    return f();
  } finally {
    if (viewState != state2)
      view2.updateState(viewState);
    if (active2 != view2.dom && active2)
      active2.focus();
  }
}
function endOfTextblockVertical(view2, state2, dir) {
  let sel = state2.selection;
  let $pos = dir == "up" ? sel.$from : sel.$to;
  return withFlushedState(view2, state2, () => {
    let { node: dom } = view2.docView.domFromPos($pos.pos, dir == "up" ? -1 : 1);
    for (; ; ) {
      let nearest = view2.docView.nearestDesc(dom, true);
      if (!nearest)
        break;
      if (nearest.node.isBlock) {
        dom = nearest.contentDOM || nearest.dom;
        break;
      }
      dom = nearest.dom.parentNode;
    }
    let coords = coordsAtPos(view2, $pos.pos, 1);
    for (let child = dom.firstChild; child; child = child.nextSibling) {
      let boxes;
      if (child.nodeType == 1)
        boxes = child.getClientRects();
      else if (child.nodeType == 3)
        boxes = textRange(child, 0, child.nodeValue.length).getClientRects();
      else
        continue;
      for (let i = 0; i < boxes.length; i++) {
        let box = boxes[i];
        if (box.bottom > box.top + 1 && (dir == "up" ? coords.top - box.top > (box.bottom - coords.top) * 2 : box.bottom - coords.bottom > (coords.bottom - box.top) * 2))
          return false;
      }
    }
    return true;
  });
}
const maybeRTL = /[\u0590-\u08ac]/;
function endOfTextblockHorizontal(view2, state2, dir) {
  let { $head } = state2.selection;
  if (!$head.parent.isTextblock)
    return false;
  let offset = $head.parentOffset, atStart = !offset, atEnd = offset == $head.parent.content.size;
  let sel = view2.domSelection();
  if (!sel)
    return $head.pos == $head.start() || $head.pos == $head.end();
  if (!maybeRTL.test($head.parent.textContent) || !sel.modify)
    return dir == "left" || dir == "backward" ? atStart : atEnd;
  return withFlushedState(view2, state2, () => {
    let { focusNode: oldNode, focusOffset: oldOff, anchorNode, anchorOffset } = view2.domSelectionRange();
    let oldBidiLevel = sel.caretBidiLevel;
    sel.modify("move", dir, "character");
    let parentDOM = $head.depth ? view2.docView.domAfterPos($head.before()) : view2.dom;
    let { focusNode: newNode, focusOffset: newOff } = view2.domSelectionRange();
    let result = newNode && !parentDOM.contains(newNode.nodeType == 1 ? newNode : newNode.parentNode) || oldNode == newNode && oldOff == newOff;
    try {
      sel.collapse(anchorNode, anchorOffset);
      if (oldNode && (oldNode != anchorNode || oldOff != anchorOffset) && sel.extend)
        sel.extend(oldNode, oldOff);
    } catch (_) {
    }
    if (oldBidiLevel != null)
      sel.caretBidiLevel = oldBidiLevel;
    return result;
  });
}
let cachedState = null;
let cachedDir = null;
let cachedResult = false;
function endOfTextblock(view2, state2, dir) {
  if (cachedState == state2 && cachedDir == dir)
    return cachedResult;
  cachedState = state2;
  cachedDir = dir;
  return cachedResult = dir == "up" || dir == "down" ? endOfTextblockVertical(view2, state2, dir) : endOfTextblockHorizontal(view2, state2, dir);
}
const NOT_DIRTY = 0, CHILD_DIRTY = 1, CONTENT_DIRTY = 2, NODE_DIRTY = 3;
class ViewDesc {
  constructor(parent, children2, dom, contentDOM) {
    this.parent = parent;
    this.children = children2;
    this.dom = dom;
    this.contentDOM = contentDOM;
    this.dirty = NOT_DIRTY;
    dom.pmViewDesc = this;
  }
  // Used to check whether a given description corresponds to a
  // widget/mark/node.
  matchesWidget(widget) {
    return false;
  }
  matchesMark(mark) {
    return false;
  }
  matchesNode(node, outerDeco, innerDeco) {
    return false;
  }
  matchesHack(nodeName) {
    return false;
  }
  // When parsing in-editor content (in domchange.js), we allow
  // descriptions to determine the parse rules that should be used to
  // parse them.
  parseRule() {
    return null;
  }
  // Used by the editor's event handler to ignore events that come
  // from certain descs.
  stopEvent(event) {
    return false;
  }
  // The size of the content represented by this desc.
  get size() {
    let size = 0;
    for (let i = 0; i < this.children.length; i++)
      size += this.children[i].size;
    return size;
  }
  // For block nodes, this represents the space taken up by their
  // start/end tokens.
  get border() {
    return 0;
  }
  destroy() {
    this.parent = void 0;
    if (this.dom.pmViewDesc == this)
      this.dom.pmViewDesc = void 0;
    for (let i = 0; i < this.children.length; i++)
      this.children[i].destroy();
  }
  posBeforeChild(child) {
    for (let i = 0, pos = this.posAtStart; ; i++) {
      let cur = this.children[i];
      if (cur == child)
        return pos;
      pos += cur.size;
    }
  }
  get posBefore() {
    return this.parent.posBeforeChild(this);
  }
  get posAtStart() {
    return this.parent ? this.parent.posBeforeChild(this) + this.border : 0;
  }
  get posAfter() {
    return this.posBefore + this.size;
  }
  get posAtEnd() {
    return this.posAtStart + this.size - 2 * this.border;
  }
  localPosFromDOM(dom, offset, bias) {
    if (this.contentDOM && this.contentDOM.contains(dom.nodeType == 1 ? dom : dom.parentNode)) {
      if (bias < 0) {
        let domBefore, desc;
        if (dom == this.contentDOM) {
          domBefore = dom.childNodes[offset - 1];
        } else {
          while (dom.parentNode != this.contentDOM)
            dom = dom.parentNode;
          domBefore = dom.previousSibling;
        }
        while (domBefore && !((desc = domBefore.pmViewDesc) && desc.parent == this))
          domBefore = domBefore.previousSibling;
        return domBefore ? this.posBeforeChild(desc) + desc.size : this.posAtStart;
      } else {
        let domAfter, desc;
        if (dom == this.contentDOM) {
          domAfter = dom.childNodes[offset];
        } else {
          while (dom.parentNode != this.contentDOM)
            dom = dom.parentNode;
          domAfter = dom.nextSibling;
        }
        while (domAfter && !((desc = domAfter.pmViewDesc) && desc.parent == this))
          domAfter = domAfter.nextSibling;
        return domAfter ? this.posBeforeChild(desc) : this.posAtEnd;
      }
    }
    let atEnd;
    if (dom == this.dom && this.contentDOM) {
      atEnd = offset > domIndex(this.contentDOM);
    } else if (this.contentDOM && this.contentDOM != this.dom && this.dom.contains(this.contentDOM)) {
      atEnd = dom.compareDocumentPosition(this.contentDOM) & 2;
    } else if (this.dom.firstChild) {
      if (offset == 0)
        for (let search = dom; ; search = search.parentNode) {
          if (search == this.dom) {
            atEnd = false;
            break;
          }
          if (search.previousSibling)
            break;
        }
      if (atEnd == null && offset == dom.childNodes.length)
        for (let search = dom; ; search = search.parentNode) {
          if (search == this.dom) {
            atEnd = true;
            break;
          }
          if (search.nextSibling)
            break;
        }
    }
    return (atEnd == null ? bias > 0 : atEnd) ? this.posAtEnd : this.posAtStart;
  }
  nearestDesc(dom, onlyNodes = false) {
    for (let first = true, cur = dom; cur; cur = cur.parentNode) {
      let desc = this.getDesc(cur), nodeDOM;
      if (desc && (!onlyNodes || desc.node)) {
        if (first && (nodeDOM = desc.nodeDOM) && !(nodeDOM.nodeType == 1 ? nodeDOM.contains(dom.nodeType == 1 ? dom : dom.parentNode) : nodeDOM == dom))
          first = false;
        else
          return desc;
      }
    }
  }
  getDesc(dom) {
    let desc = dom.pmViewDesc;
    for (let cur = desc; cur; cur = cur.parent)
      if (cur == this)
        return desc;
  }
  posFromDOM(dom, offset, bias) {
    for (let scan = dom; scan; scan = scan.parentNode) {
      let desc = this.getDesc(scan);
      if (desc)
        return desc.localPosFromDOM(dom, offset, bias);
    }
    return -1;
  }
  // Find the desc for the node after the given pos, if any. (When a
  // parent node overrode rendering, there might not be one.)
  descAt(pos) {
    for (let i = 0, offset = 0; i < this.children.length; i++) {
      let child = this.children[i], end = offset + child.size;
      if (offset == pos && end != offset) {
        while (!child.border && child.children.length)
          child = child.children[0];
        return child;
      }
      if (pos < end)
        return child.descAt(pos - offset - child.border);
      offset = end;
    }
  }
  domFromPos(pos, side) {
    if (!this.contentDOM)
      return { node: this.dom, offset: 0, atom: pos + 1 };
    let i = 0, offset = 0;
    for (let curPos = 0; i < this.children.length; i++) {
      let child = this.children[i], end = curPos + child.size;
      if (end > pos || child instanceof TrailingHackViewDesc) {
        offset = pos - curPos;
        break;
      }
      curPos = end;
    }
    if (offset)
      return this.children[i].domFromPos(offset - this.children[i].border, side);
    for (let prev; i && !(prev = this.children[i - 1]).size && prev instanceof WidgetViewDesc && prev.side >= 0; i--) {
    }
    if (side <= 0) {
      let prev, enter = true;
      for (; ; i--, enter = false) {
        prev = i ? this.children[i - 1] : null;
        if (!prev || prev.dom.parentNode == this.contentDOM)
          break;
      }
      if (prev && side && enter && !prev.border && !prev.domAtom)
        return prev.domFromPos(prev.size, side);
      return { node: this.contentDOM, offset: prev ? domIndex(prev.dom) + 1 : 0 };
    } else {
      let next, enter = true;
      for (; ; i++, enter = false) {
        next = i < this.children.length ? this.children[i] : null;
        if (!next || next.dom.parentNode == this.contentDOM)
          break;
      }
      if (next && enter && !next.border && !next.domAtom)
        return next.domFromPos(0, side);
      return { node: this.contentDOM, offset: next ? domIndex(next.dom) : this.contentDOM.childNodes.length };
    }
  }
  // Used to find a DOM range in a single parent for a given changed
  // range.
  parseRange(from, to, base2 = 0) {
    if (this.children.length == 0)
      return { node: this.contentDOM, from, to, fromOffset: 0, toOffset: this.contentDOM.childNodes.length };
    let fromOffset = -1, toOffset = -1;
    for (let offset = base2, i = 0; ; i++) {
      let child = this.children[i], end = offset + child.size;
      if (fromOffset == -1 && from <= end) {
        let childBase = offset + child.border;
        if (from >= childBase && to <= end - child.border && child.node && child.contentDOM && this.contentDOM.contains(child.contentDOM))
          return child.parseRange(from, to, childBase);
        from = offset;
        for (let j = i; j > 0; j--) {
          let prev = this.children[j - 1];
          if (prev.size && prev.dom.parentNode == this.contentDOM && !prev.emptyChildAt(1)) {
            fromOffset = domIndex(prev.dom) + 1;
            break;
          }
          from -= prev.size;
        }
        if (fromOffset == -1)
          fromOffset = 0;
      }
      if (fromOffset > -1 && (end > to || i == this.children.length - 1)) {
        to = end;
        for (let j = i + 1; j < this.children.length; j++) {
          let next = this.children[j];
          if (next.size && next.dom.parentNode == this.contentDOM && !next.emptyChildAt(-1)) {
            toOffset = domIndex(next.dom);
            break;
          }
          to += next.size;
        }
        if (toOffset == -1)
          toOffset = this.contentDOM.childNodes.length;
        break;
      }
      offset = end;
    }
    return { node: this.contentDOM, from, to, fromOffset, toOffset };
  }
  emptyChildAt(side) {
    if (this.border || !this.contentDOM || !this.children.length)
      return false;
    let child = this.children[side < 0 ? 0 : this.children.length - 1];
    return child.size == 0 || child.emptyChildAt(side);
  }
  domAfterPos(pos) {
    let { node, offset } = this.domFromPos(pos, 0);
    if (node.nodeType != 1 || offset == node.childNodes.length)
      throw new RangeError("No node after pos " + pos);
    return node.childNodes[offset];
  }
  // View descs are responsible for setting any selection that falls
  // entirely inside of them, so that custom implementations can do
  // custom things with the selection. Note that this falls apart when
  // a selection starts in such a node and ends in another, in which
  // case we just use whatever domFromPos produces as a best effort.
  setSelection(anchor, head, root, force = false) {
    let from = Math.min(anchor, head), to = Math.max(anchor, head);
    for (let i = 0, offset = 0; i < this.children.length; i++) {
      let child = this.children[i], end = offset + child.size;
      if (from > offset && to < end)
        return child.setSelection(anchor - offset - child.border, head - offset - child.border, root, force);
      offset = end;
    }
    let anchorDOM = this.domFromPos(anchor, anchor ? -1 : 1);
    let headDOM = head == anchor ? anchorDOM : this.domFromPos(head, head ? -1 : 1);
    let domSel = root.getSelection();
    let brKludge = false;
    if ((gecko || safari) && anchor == head) {
      let { node, offset } = anchorDOM;
      if (node.nodeType == 3) {
        brKludge = !!(offset && node.nodeValue[offset - 1] == "\n");
        if (brKludge && offset == node.nodeValue.length) {
          for (let scan = node, after; scan; scan = scan.parentNode) {
            if (after = scan.nextSibling) {
              if (after.nodeName == "BR")
                anchorDOM = headDOM = { node: after.parentNode, offset: domIndex(after) + 1 };
              break;
            }
            let desc = scan.pmViewDesc;
            if (desc && desc.node && desc.node.isBlock)
              break;
          }
        }
      } else {
        let prev = node.childNodes[offset - 1];
        brKludge = prev && (prev.nodeName == "BR" || prev.contentEditable == "false");
      }
    }
    if (gecko && domSel.focusNode && domSel.focusNode != headDOM.node && domSel.focusNode.nodeType == 1) {
      let after = domSel.focusNode.childNodes[domSel.focusOffset];
      if (after && after.contentEditable == "false")
        force = true;
    }
    if (!(force || brKludge && safari) && isEquivalentPosition(anchorDOM.node, anchorDOM.offset, domSel.anchorNode, domSel.anchorOffset) && isEquivalentPosition(headDOM.node, headDOM.offset, domSel.focusNode, domSel.focusOffset))
      return;
    let domSelExtended = false;
    if ((domSel.extend || anchor == head) && !brKludge) {
      domSel.collapse(anchorDOM.node, anchorDOM.offset);
      try {
        if (anchor != head)
          domSel.extend(headDOM.node, headDOM.offset);
        domSelExtended = true;
      } catch (_) {
      }
    }
    if (!domSelExtended) {
      if (anchor > head) {
        let tmp = anchorDOM;
        anchorDOM = headDOM;
        headDOM = tmp;
      }
      let range = document.createRange();
      range.setEnd(headDOM.node, headDOM.offset);
      range.setStart(anchorDOM.node, anchorDOM.offset);
      domSel.removeAllRanges();
      domSel.addRange(range);
    }
  }
  ignoreMutation(mutation) {
    return !this.contentDOM && mutation.type != "selection";
  }
  get contentLost() {
    return this.contentDOM && this.contentDOM != this.dom && !this.dom.contains(this.contentDOM);
  }
  // Remove a subtree of the element tree that has been touched
  // by a DOM change, so that the next update will redraw it.
  markDirty(from, to) {
    for (let offset = 0, i = 0; i < this.children.length; i++) {
      let child = this.children[i], end = offset + child.size;
      if (offset == end ? from <= end && to >= offset : from < end && to > offset) {
        let startInside = offset + child.border, endInside = end - child.border;
        if (from >= startInside && to <= endInside) {
          this.dirty = from == offset || to == end ? CONTENT_DIRTY : CHILD_DIRTY;
          if (from == startInside && to == endInside && (child.contentLost || child.dom.parentNode != this.contentDOM))
            child.dirty = NODE_DIRTY;
          else
            child.markDirty(from - startInside, to - startInside);
          return;
        } else {
          child.dirty = child.dom == child.contentDOM && child.dom.parentNode == this.contentDOM && !child.children.length ? CONTENT_DIRTY : NODE_DIRTY;
        }
      }
      offset = end;
    }
    this.dirty = CONTENT_DIRTY;
  }
  markParentsDirty() {
    let level = 1;
    for (let node = this.parent; node; node = node.parent, level++) {
      let dirty = level == 1 ? CONTENT_DIRTY : CHILD_DIRTY;
      if (node.dirty < dirty)
        node.dirty = dirty;
    }
  }
  get domAtom() {
    return false;
  }
  get ignoreForCoords() {
    return false;
  }
  isText(text2) {
    return false;
  }
}
class WidgetViewDesc extends ViewDesc {
  constructor(parent, widget, view2, pos) {
    let self, dom = widget.type.toDOM;
    if (typeof dom == "function")
      dom = dom(view2, () => {
        if (!self)
          return pos;
        if (self.parent)
          return self.parent.posBeforeChild(self);
      });
    if (!widget.type.spec.raw) {
      if (dom.nodeType != 1) {
        let wrap2 = document.createElement("span");
        wrap2.appendChild(dom);
        dom = wrap2;
      }
      dom.contentEditable = "false";
      dom.classList.add("ProseMirror-widget");
    }
    super(parent, [], dom, null);
    this.widget = widget;
    this.widget = widget;
    self = this;
  }
  matchesWidget(widget) {
    return this.dirty == NOT_DIRTY && widget.type.eq(this.widget.type);
  }
  parseRule() {
    return { ignore: true };
  }
  stopEvent(event) {
    let stop = this.widget.spec.stopEvent;
    return stop ? stop(event) : false;
  }
  ignoreMutation(mutation) {
    return mutation.type != "selection" || this.widget.spec.ignoreSelection;
  }
  destroy() {
    this.widget.type.destroy(this.dom);
    super.destroy();
  }
  get domAtom() {
    return true;
  }
  get side() {
    return this.widget.type.side;
  }
}
class CompositionViewDesc extends ViewDesc {
  constructor(parent, dom, textDOM, text2) {
    super(parent, [], dom, null);
    this.textDOM = textDOM;
    this.text = text2;
  }
  get size() {
    return this.text.length;
  }
  localPosFromDOM(dom, offset) {
    if (dom != this.textDOM)
      return this.posAtStart + (offset ? this.size : 0);
    return this.posAtStart + offset;
  }
  domFromPos(pos) {
    return { node: this.textDOM, offset: pos };
  }
  ignoreMutation(mut) {
    return mut.type === "characterData" && mut.target.nodeValue == mut.oldValue;
  }
}
class MarkViewDesc extends ViewDesc {
  constructor(parent, mark, dom, contentDOM) {
    super(parent, [], dom, contentDOM);
    this.mark = mark;
  }
  static create(parent, mark, inline, view2) {
    let custom = view2.nodeViews[mark.type.name];
    let spec = custom && custom(mark, view2, inline);
    if (!spec || !spec.dom)
      spec = DOMSerializer.renderSpec(document, mark.type.spec.toDOM(mark, inline), null, mark.attrs);
    return new MarkViewDesc(parent, mark, spec.dom, spec.contentDOM || spec.dom);
  }
  parseRule() {
    if (this.dirty & NODE_DIRTY || this.mark.type.spec.reparseInView)
      return null;
    return { mark: this.mark.type.name, attrs: this.mark.attrs, contentElement: this.contentDOM };
  }
  matchesMark(mark) {
    return this.dirty != NODE_DIRTY && this.mark.eq(mark);
  }
  markDirty(from, to) {
    super.markDirty(from, to);
    if (this.dirty != NOT_DIRTY) {
      let parent = this.parent;
      while (!parent.node)
        parent = parent.parent;
      if (parent.dirty < this.dirty)
        parent.dirty = this.dirty;
      this.dirty = NOT_DIRTY;
    }
  }
  slice(from, to, view2) {
    let copy2 = MarkViewDesc.create(this.parent, this.mark, true, view2);
    let nodes = this.children, size = this.size;
    if (to < size)
      nodes = replaceNodes(nodes, to, size, view2);
    if (from > 0)
      nodes = replaceNodes(nodes, 0, from, view2);
    for (let i = 0; i < nodes.length; i++)
      nodes[i].parent = copy2;
    copy2.children = nodes;
    return copy2;
  }
}
class NodeViewDesc extends ViewDesc {
  constructor(parent, node, outerDeco, innerDeco, dom, contentDOM, nodeDOM, view2, pos) {
    super(parent, [], dom, contentDOM);
    this.node = node;
    this.outerDeco = outerDeco;
    this.innerDeco = innerDeco;
    this.nodeDOM = nodeDOM;
  }
  // By default, a node is rendered using the `toDOM` method from the
  // node type spec. But client code can use the `nodeViews` spec to
  // supply a custom node view, which can influence various aspects of
  // the way the node works.
  //
  // (Using subclassing for this was intentionally decided against,
  // since it'd require exposing a whole slew of finicky
  // implementation details to the user code that they probably will
  // never need.)
  static create(parent, node, outerDeco, innerDeco, view2, pos) {
    let custom = view2.nodeViews[node.type.name], descObj;
    let spec = custom && custom(node, view2, () => {
      if (!descObj)
        return pos;
      if (descObj.parent)
        return descObj.parent.posBeforeChild(descObj);
    }, outerDeco, innerDeco);
    let dom = spec && spec.dom, contentDOM = spec && spec.contentDOM;
    if (node.isText) {
      if (!dom)
        dom = document.createTextNode(node.text);
      else if (dom.nodeType != 3)
        throw new RangeError("Text must be rendered as a DOM text node");
    } else if (!dom) {
      let spec2 = DOMSerializer.renderSpec(document, node.type.spec.toDOM(node), null, node.attrs);
      ({ dom, contentDOM } = spec2);
    }
    if (!contentDOM && !node.isText && dom.nodeName != "BR") {
      if (!dom.hasAttribute("contenteditable"))
        dom.contentEditable = "false";
      if (node.type.spec.draggable)
        dom.draggable = true;
    }
    let nodeDOM = dom;
    dom = applyOuterDeco(dom, outerDeco, node);
    if (spec)
      return descObj = new CustomNodeViewDesc(parent, node, outerDeco, innerDeco, dom, contentDOM || null, nodeDOM, spec, view2, pos + 1);
    else if (node.isText)
      return new TextViewDesc(parent, node, outerDeco, innerDeco, dom, nodeDOM, view2);
    else
      return new NodeViewDesc(parent, node, outerDeco, innerDeco, dom, contentDOM || null, nodeDOM, view2, pos + 1);
  }
  parseRule() {
    if (this.node.type.spec.reparseInView)
      return null;
    let rule = { node: this.node.type.name, attrs: this.node.attrs };
    if (this.node.type.whitespace == "pre")
      rule.preserveWhitespace = "full";
    if (!this.contentDOM) {
      rule.getContent = () => this.node.content;
    } else if (!this.contentLost) {
      rule.contentElement = this.contentDOM;
    } else {
      for (let i = this.children.length - 1; i >= 0; i--) {
        let child = this.children[i];
        if (this.dom.contains(child.dom.parentNode)) {
          rule.contentElement = child.dom.parentNode;
          break;
        }
      }
      if (!rule.contentElement)
        rule.getContent = () => Fragment.empty;
    }
    return rule;
  }
  matchesNode(node, outerDeco, innerDeco) {
    return this.dirty == NOT_DIRTY && node.eq(this.node) && sameOuterDeco(outerDeco, this.outerDeco) && innerDeco.eq(this.innerDeco);
  }
  get size() {
    return this.node.nodeSize;
  }
  get border() {
    return this.node.isLeaf ? 0 : 1;
  }
  // Syncs `this.children` to match `this.node.content` and the local
  // decorations, possibly introducing nesting for marks. Then, in a
  // separate step, syncs the DOM inside `this.contentDOM` to
  // `this.children`.
  updateChildren(view2, pos) {
    let inline = this.node.inlineContent, off = pos;
    let composition = view2.composing ? this.localCompositionInfo(view2, pos) : null;
    let localComposition = composition && composition.pos > -1 ? composition : null;
    let compositionInChild = composition && composition.pos < 0;
    let updater = new ViewTreeUpdater(this, localComposition && localComposition.node, view2);
    iterDeco(this.node, this.innerDeco, (widget, i, insideNode) => {
      if (widget.spec.marks)
        updater.syncToMarks(widget.spec.marks, inline, view2);
      else if (widget.type.side >= 0 && !insideNode)
        updater.syncToMarks(i == this.node.childCount ? Mark.none : this.node.child(i).marks, inline, view2);
      updater.placeWidget(widget, view2, off);
    }, (child, outerDeco, innerDeco, i) => {
      updater.syncToMarks(child.marks, inline, view2);
      let compIndex;
      if (updater.findNodeMatch(child, outerDeco, innerDeco, i)) ;
      else if (compositionInChild && view2.state.selection.from > off && view2.state.selection.to < off + child.nodeSize && (compIndex = updater.findIndexWithChild(composition.node)) > -1 && updater.updateNodeAt(child, outerDeco, innerDeco, compIndex, view2)) ;
      else if (updater.updateNextNode(child, outerDeco, innerDeco, view2, i, off)) ;
      else {
        updater.addNode(child, outerDeco, innerDeco, view2, off);
      }
      off += child.nodeSize;
    });
    updater.syncToMarks([], inline, view2);
    if (this.node.isTextblock)
      updater.addTextblockHacks();
    updater.destroyRest();
    if (updater.changed || this.dirty == CONTENT_DIRTY) {
      if (localComposition)
        this.protectLocalComposition(view2, localComposition);
      renderDescs(this.contentDOM, this.children, view2);
      if (ios)
        iosHacks(this.dom);
    }
  }
  localCompositionInfo(view2, pos) {
    let { from, to } = view2.state.selection;
    if (!(view2.state.selection instanceof TextSelection) || from < pos || to > pos + this.node.content.size)
      return null;
    let textNode = view2.input.compositionNode;
    if (!textNode || !this.dom.contains(textNode.parentNode))
      return null;
    if (this.node.inlineContent) {
      let text2 = textNode.nodeValue;
      let textPos = findTextInFragment(this.node.content, text2, from - pos, to - pos);
      return textPos < 0 ? null : { node: textNode, pos: textPos, text: text2 };
    } else {
      return { node: textNode, pos: -1, text: "" };
    }
  }
  protectLocalComposition(view2, { node, pos, text: text2 }) {
    if (this.getDesc(node))
      return;
    let topNode = node;
    for (; ; topNode = topNode.parentNode) {
      if (topNode.parentNode == this.contentDOM)
        break;
      while (topNode.previousSibling)
        topNode.parentNode.removeChild(topNode.previousSibling);
      while (topNode.nextSibling)
        topNode.parentNode.removeChild(topNode.nextSibling);
      if (topNode.pmViewDesc)
        topNode.pmViewDesc = void 0;
    }
    let desc = new CompositionViewDesc(this, topNode, node, text2);
    view2.input.compositionNodes.push(desc);
    this.children = replaceNodes(this.children, pos, pos + text2.length, view2, desc);
  }
  // If this desc must be updated to match the given node decoration,
  // do so and return true.
  update(node, outerDeco, innerDeco, view2) {
    if (this.dirty == NODE_DIRTY || !node.sameMarkup(this.node))
      return false;
    this.updateInner(node, outerDeco, innerDeco, view2);
    return true;
  }
  updateInner(node, outerDeco, innerDeco, view2) {
    this.updateOuterDeco(outerDeco);
    this.node = node;
    this.innerDeco = innerDeco;
    if (this.contentDOM)
      this.updateChildren(view2, this.posAtStart);
    this.dirty = NOT_DIRTY;
  }
  updateOuterDeco(outerDeco) {
    if (sameOuterDeco(outerDeco, this.outerDeco))
      return;
    let needsWrap = this.nodeDOM.nodeType != 1;
    let oldDOM = this.dom;
    this.dom = patchOuterDeco(this.dom, this.nodeDOM, computeOuterDeco(this.outerDeco, this.node, needsWrap), computeOuterDeco(outerDeco, this.node, needsWrap));
    if (this.dom != oldDOM) {
      oldDOM.pmViewDesc = void 0;
      this.dom.pmViewDesc = this;
    }
    this.outerDeco = outerDeco;
  }
  // Mark this node as being the selected node.
  selectNode() {
    if (this.nodeDOM.nodeType == 1)
      this.nodeDOM.classList.add("ProseMirror-selectednode");
    if (this.contentDOM || !this.node.type.spec.draggable)
      this.dom.draggable = true;
  }
  // Remove selected node marking from this node.
  deselectNode() {
    if (this.nodeDOM.nodeType == 1) {
      this.nodeDOM.classList.remove("ProseMirror-selectednode");
      if (this.contentDOM || !this.node.type.spec.draggable)
        this.dom.removeAttribute("draggable");
    }
  }
  get domAtom() {
    return this.node.isAtom;
  }
}
function docViewDesc(doc2, outerDeco, innerDeco, dom, view2) {
  applyOuterDeco(dom, outerDeco, doc2);
  let docView = new NodeViewDesc(void 0, doc2, outerDeco, innerDeco, dom, dom, dom, view2, 0);
  if (docView.contentDOM)
    docView.updateChildren(view2, 0);
  return docView;
}
class TextViewDesc extends NodeViewDesc {
  constructor(parent, node, outerDeco, innerDeco, dom, nodeDOM, view2) {
    super(parent, node, outerDeco, innerDeco, dom, null, nodeDOM, view2, 0);
  }
  parseRule() {
    let skip = this.nodeDOM.parentNode;
    while (skip && skip != this.dom && !skip.pmIsDeco)
      skip = skip.parentNode;
    return { skip: skip || true };
  }
  update(node, outerDeco, innerDeco, view2) {
    if (this.dirty == NODE_DIRTY || this.dirty != NOT_DIRTY && !this.inParent() || !node.sameMarkup(this.node))
      return false;
    this.updateOuterDeco(outerDeco);
    if ((this.dirty != NOT_DIRTY || node.text != this.node.text) && node.text != this.nodeDOM.nodeValue) {
      this.nodeDOM.nodeValue = node.text;
      if (view2.trackWrites == this.nodeDOM)
        view2.trackWrites = null;
    }
    this.node = node;
    this.dirty = NOT_DIRTY;
    return true;
  }
  inParent() {
    let parentDOM = this.parent.contentDOM;
    for (let n = this.nodeDOM; n; n = n.parentNode)
      if (n == parentDOM)
        return true;
    return false;
  }
  domFromPos(pos) {
    return { node: this.nodeDOM, offset: pos };
  }
  localPosFromDOM(dom, offset, bias) {
    if (dom == this.nodeDOM)
      return this.posAtStart + Math.min(offset, this.node.text.length);
    return super.localPosFromDOM(dom, offset, bias);
  }
  ignoreMutation(mutation) {
    return mutation.type != "characterData" && mutation.type != "selection";
  }
  slice(from, to, view2) {
    let node = this.node.cut(from, to), dom = document.createTextNode(node.text);
    return new TextViewDesc(this.parent, node, this.outerDeco, this.innerDeco, dom, dom, view2);
  }
  markDirty(from, to) {
    super.markDirty(from, to);
    if (this.dom != this.nodeDOM && (from == 0 || to == this.nodeDOM.nodeValue.length))
      this.dirty = NODE_DIRTY;
  }
  get domAtom() {
    return false;
  }
  isText(text2) {
    return this.node.text == text2;
  }
}
class TrailingHackViewDesc extends ViewDesc {
  parseRule() {
    return { ignore: true };
  }
  matchesHack(nodeName) {
    return this.dirty == NOT_DIRTY && this.dom.nodeName == nodeName;
  }
  get domAtom() {
    return true;
  }
  get ignoreForCoords() {
    return this.dom.nodeName == "IMG";
  }
}
class CustomNodeViewDesc extends NodeViewDesc {
  constructor(parent, node, outerDeco, innerDeco, dom, contentDOM, nodeDOM, spec, view2, pos) {
    super(parent, node, outerDeco, innerDeco, dom, contentDOM, nodeDOM, view2, pos);
    this.spec = spec;
  }
  // A custom `update` method gets to decide whether the update goes
  // through. If it does, and there's a `contentDOM` node, our logic
  // updates the children.
  update(node, outerDeco, innerDeco, view2) {
    if (this.dirty == NODE_DIRTY)
      return false;
    if (this.spec.update) {
      let result = this.spec.update(node, outerDeco, innerDeco);
      if (result)
        this.updateInner(node, outerDeco, innerDeco, view2);
      return result;
    } else if (!this.contentDOM && !node.isLeaf) {
      return false;
    } else {
      return super.update(node, outerDeco, innerDeco, view2);
    }
  }
  selectNode() {
    this.spec.selectNode ? this.spec.selectNode() : super.selectNode();
  }
  deselectNode() {
    this.spec.deselectNode ? this.spec.deselectNode() : super.deselectNode();
  }
  setSelection(anchor, head, root, force) {
    this.spec.setSelection ? this.spec.setSelection(anchor, head, root) : super.setSelection(anchor, head, root, force);
  }
  destroy() {
    if (this.spec.destroy)
      this.spec.destroy();
    super.destroy();
  }
  stopEvent(event) {
    return this.spec.stopEvent ? this.spec.stopEvent(event) : false;
  }
  ignoreMutation(mutation) {
    return this.spec.ignoreMutation ? this.spec.ignoreMutation(mutation) : super.ignoreMutation(mutation);
  }
}
function renderDescs(parentDOM, descs, view2) {
  let dom = parentDOM.firstChild, written = false;
  for (let i = 0; i < descs.length; i++) {
    let desc = descs[i], childDOM = desc.dom;
    if (childDOM.parentNode == parentDOM) {
      while (childDOM != dom) {
        dom = rm(dom);
        written = true;
      }
      dom = dom.nextSibling;
    } else {
      written = true;
      parentDOM.insertBefore(childDOM, dom);
    }
    if (desc instanceof MarkViewDesc) {
      let pos = dom ? dom.previousSibling : parentDOM.lastChild;
      renderDescs(desc.contentDOM, desc.children, view2);
      dom = pos ? pos.nextSibling : parentDOM.firstChild;
    }
  }
  while (dom) {
    dom = rm(dom);
    written = true;
  }
  if (written && view2.trackWrites == parentDOM)
    view2.trackWrites = null;
}
const OuterDecoLevel = function(nodeName) {
  if (nodeName)
    this.nodeName = nodeName;
};
OuterDecoLevel.prototype = /* @__PURE__ */ Object.create(null);
const noDeco = [new OuterDecoLevel()];
function computeOuterDeco(outerDeco, node, needsWrap) {
  if (outerDeco.length == 0)
    return noDeco;
  let top = needsWrap ? noDeco[0] : new OuterDecoLevel(), result = [top];
  for (let i = 0; i < outerDeco.length; i++) {
    let attrs = outerDeco[i].type.attrs;
    if (!attrs)
      continue;
    if (attrs.nodeName)
      result.push(top = new OuterDecoLevel(attrs.nodeName));
    for (let name in attrs) {
      let val = attrs[name];
      if (val == null)
        continue;
      if (needsWrap && result.length == 1)
        result.push(top = new OuterDecoLevel(node.isInline ? "span" : "div"));
      if (name == "class")
        top.class = (top.class ? top.class + " " : "") + val;
      else if (name == "style")
        top.style = (top.style ? top.style + ";" : "") + val;
      else if (name != "nodeName")
        top[name] = val;
    }
  }
  return result;
}
function patchOuterDeco(outerDOM, nodeDOM, prevComputed, curComputed) {
  if (prevComputed == noDeco && curComputed == noDeco)
    return nodeDOM;
  let curDOM = nodeDOM;
  for (let i = 0; i < curComputed.length; i++) {
    let deco = curComputed[i], prev = prevComputed[i];
    if (i) {
      let parent;
      if (prev && prev.nodeName == deco.nodeName && curDOM != outerDOM && (parent = curDOM.parentNode) && parent.nodeName.toLowerCase() == deco.nodeName) {
        curDOM = parent;
      } else {
        parent = document.createElement(deco.nodeName);
        parent.pmIsDeco = true;
        parent.appendChild(curDOM);
        prev = noDeco[0];
        curDOM = parent;
      }
    }
    patchAttributes(curDOM, prev || noDeco[0], deco);
  }
  return curDOM;
}
function patchAttributes(dom, prev, cur) {
  for (let name in prev)
    if (name != "class" && name != "style" && name != "nodeName" && !(name in cur))
      dom.removeAttribute(name);
  for (let name in cur)
    if (name != "class" && name != "style" && name != "nodeName" && cur[name] != prev[name])
      dom.setAttribute(name, cur[name]);
  if (prev.class != cur.class) {
    let prevList = prev.class ? prev.class.split(" ").filter(Boolean) : [];
    let curList = cur.class ? cur.class.split(" ").filter(Boolean) : [];
    for (let i = 0; i < prevList.length; i++)
      if (curList.indexOf(prevList[i]) == -1)
        dom.classList.remove(prevList[i]);
    for (let i = 0; i < curList.length; i++)
      if (prevList.indexOf(curList[i]) == -1)
        dom.classList.add(curList[i]);
    if (dom.classList.length == 0)
      dom.removeAttribute("class");
  }
  if (prev.style != cur.style) {
    if (prev.style) {
      let prop = /\s*([\w\-\xa1-\uffff]+)\s*:(?:"(?:\\.|[^"])*"|'(?:\\.|[^'])*'|\(.*?\)|[^;])*/g, m;
      while (m = prop.exec(prev.style))
        dom.style.removeProperty(m[1]);
    }
    if (cur.style)
      dom.style.cssText += cur.style;
  }
}
function applyOuterDeco(dom, deco, node) {
  return patchOuterDeco(dom, dom, noDeco, computeOuterDeco(deco, node, dom.nodeType != 1));
}
function sameOuterDeco(a, b) {
  if (a.length != b.length)
    return false;
  for (let i = 0; i < a.length; i++)
    if (!a[i].type.eq(b[i].type))
      return false;
  return true;
}
function rm(dom) {
  let next = dom.nextSibling;
  dom.parentNode.removeChild(dom);
  return next;
}
class ViewTreeUpdater {
  constructor(top, lock, view2) {
    this.lock = lock;
    this.view = view2;
    this.index = 0;
    this.stack = [];
    this.changed = false;
    this.top = top;
    this.preMatch = preMatch(top.node.content, top);
  }
  // Destroy and remove the children between the given indices in
  // `this.top`.
  destroyBetween(start, end) {
    if (start == end)
      return;
    for (let i = start; i < end; i++)
      this.top.children[i].destroy();
    this.top.children.splice(start, end - start);
    this.changed = true;
  }
  // Destroy all remaining children in `this.top`.
  destroyRest() {
    this.destroyBetween(this.index, this.top.children.length);
  }
  // Sync the current stack of mark descs with the given array of
  // marks, reusing existing mark descs when possible.
  syncToMarks(marks, inline, view2) {
    let keep = 0, depth = this.stack.length >> 1;
    let maxKeep = Math.min(depth, marks.length);
    while (keep < maxKeep && (keep == depth - 1 ? this.top : this.stack[keep + 1 << 1]).matchesMark(marks[keep]) && marks[keep].type.spec.spanning !== false)
      keep++;
    while (keep < depth) {
      this.destroyRest();
      this.top.dirty = NOT_DIRTY;
      this.index = this.stack.pop();
      this.top = this.stack.pop();
      depth--;
    }
    while (depth < marks.length) {
      this.stack.push(this.top, this.index + 1);
      let found2 = -1;
      for (let i = this.index; i < Math.min(this.index + 3, this.top.children.length); i++) {
        let next = this.top.children[i];
        if (next.matchesMark(marks[depth]) && !this.isLocked(next.dom)) {
          found2 = i;
          break;
        }
      }
      if (found2 > -1) {
        if (found2 > this.index) {
          this.changed = true;
          this.destroyBetween(this.index, found2);
        }
        this.top = this.top.children[this.index];
      } else {
        let markDesc = MarkViewDesc.create(this.top, marks[depth], inline, view2);
        this.top.children.splice(this.index, 0, markDesc);
        this.top = markDesc;
        this.changed = true;
      }
      this.index = 0;
      depth++;
    }
  }
  // Try to find a node desc matching the given data. Skip over it and
  // return true when successful.
  findNodeMatch(node, outerDeco, innerDeco, index) {
    let found2 = -1, targetDesc;
    if (index >= this.preMatch.index && (targetDesc = this.preMatch.matches[index - this.preMatch.index]).parent == this.top && targetDesc.matchesNode(node, outerDeco, innerDeco)) {
      found2 = this.top.children.indexOf(targetDesc, this.index);
    } else {
      for (let i = this.index, e = Math.min(this.top.children.length, i + 5); i < e; i++) {
        let child = this.top.children[i];
        if (child.matchesNode(node, outerDeco, innerDeco) && !this.preMatch.matched.has(child)) {
          found2 = i;
          break;
        }
      }
    }
    if (found2 < 0)
      return false;
    this.destroyBetween(this.index, found2);
    this.index++;
    return true;
  }
  updateNodeAt(node, outerDeco, innerDeco, index, view2) {
    let child = this.top.children[index];
    if (child.dirty == NODE_DIRTY && child.dom == child.contentDOM)
      child.dirty = CONTENT_DIRTY;
    if (!child.update(node, outerDeco, innerDeco, view2))
      return false;
    this.destroyBetween(this.index, index);
    this.index++;
    return true;
  }
  findIndexWithChild(domNode) {
    for (; ; ) {
      let parent = domNode.parentNode;
      if (!parent)
        return -1;
      if (parent == this.top.contentDOM) {
        let desc = domNode.pmViewDesc;
        if (desc)
          for (let i = this.index; i < this.top.children.length; i++) {
            if (this.top.children[i] == desc)
              return i;
          }
        return -1;
      }
      domNode = parent;
    }
  }
  // Try to update the next node, if any, to the given data. Checks
  // pre-matches to avoid overwriting nodes that could still be used.
  updateNextNode(node, outerDeco, innerDeco, view2, index, pos) {
    for (let i = this.index; i < this.top.children.length; i++) {
      let next = this.top.children[i];
      if (next instanceof NodeViewDesc) {
        let preMatch2 = this.preMatch.matched.get(next);
        if (preMatch2 != null && preMatch2 != index)
          return false;
        let nextDOM = next.dom, updated;
        let locked = this.isLocked(nextDOM) && !(node.isText && next.node && next.node.isText && next.nodeDOM.nodeValue == node.text && next.dirty != NODE_DIRTY && sameOuterDeco(outerDeco, next.outerDeco));
        if (!locked && next.update(node, outerDeco, innerDeco, view2)) {
          this.destroyBetween(this.index, i);
          if (next.dom != nextDOM)
            this.changed = true;
          this.index++;
          return true;
        } else if (!locked && (updated = this.recreateWrapper(next, node, outerDeco, innerDeco, view2, pos))) {
          this.destroyBetween(this.index, i);
          this.top.children[this.index] = updated;
          if (updated.contentDOM) {
            updated.dirty = CONTENT_DIRTY;
            updated.updateChildren(view2, pos + 1);
            updated.dirty = NOT_DIRTY;
          }
          this.changed = true;
          this.index++;
          return true;
        }
        break;
      }
    }
    return false;
  }
  // When a node with content is replaced by a different node with
  // identical content, move over its children.
  recreateWrapper(next, node, outerDeco, innerDeco, view2, pos) {
    if (next.dirty || node.isAtom || !next.children.length || !next.node.content.eq(node.content) || !sameOuterDeco(outerDeco, next.outerDeco) || !innerDeco.eq(next.innerDeco))
      return null;
    let wrapper = NodeViewDesc.create(this.top, node, outerDeco, innerDeco, view2, pos);
    if (wrapper.contentDOM) {
      wrapper.children = next.children;
      next.children = [];
      for (let ch of wrapper.children)
        ch.parent = wrapper;
    }
    next.destroy();
    return wrapper;
  }
  // Insert the node as a newly created node desc.
  addNode(node, outerDeco, innerDeco, view2, pos) {
    let desc = NodeViewDesc.create(this.top, node, outerDeco, innerDeco, view2, pos);
    if (desc.contentDOM)
      desc.updateChildren(view2, pos + 1);
    this.top.children.splice(this.index++, 0, desc);
    this.changed = true;
  }
  placeWidget(widget, view2, pos) {
    let next = this.index < this.top.children.length ? this.top.children[this.index] : null;
    if (next && next.matchesWidget(widget) && (widget == next.widget || !next.widget.type.toDOM.parentNode)) {
      this.index++;
    } else {
      let desc = new WidgetViewDesc(this.top, widget, view2, pos);
      this.top.children.splice(this.index++, 0, desc);
      this.changed = true;
    }
  }
  // Make sure a textblock looks and behaves correctly in
  // contentEditable.
  addTextblockHacks() {
    let lastChild = this.top.children[this.index - 1], parent = this.top;
    while (lastChild instanceof MarkViewDesc) {
      parent = lastChild;
      lastChild = parent.children[parent.children.length - 1];
    }
    if (!lastChild || // Empty textblock
    !(lastChild instanceof TextViewDesc) || /\n$/.test(lastChild.node.text) || this.view.requiresGeckoHackNode && /\s$/.test(lastChild.node.text)) {
      if ((safari || chrome) && lastChild && lastChild.dom.contentEditable == "false")
        this.addHackNode("IMG", parent);
      this.addHackNode("BR", this.top);
    }
  }
  addHackNode(nodeName, parent) {
    if (parent == this.top && this.index < parent.children.length && parent.children[this.index].matchesHack(nodeName)) {
      this.index++;
    } else {
      let dom = document.createElement(nodeName);
      if (nodeName == "IMG") {
        dom.className = "ProseMirror-separator";
        dom.alt = "";
      }
      if (nodeName == "BR")
        dom.className = "ProseMirror-trailingBreak";
      let hack = new TrailingHackViewDesc(this.top, [], dom, null);
      if (parent != this.top)
        parent.children.push(hack);
      else
        parent.children.splice(this.index++, 0, hack);
      this.changed = true;
    }
  }
  isLocked(node) {
    return this.lock && (node == this.lock || node.nodeType == 1 && node.contains(this.lock.parentNode));
  }
}
function preMatch(frag, parentDesc) {
  let curDesc = parentDesc, descI = curDesc.children.length;
  let fI = frag.childCount, matched = /* @__PURE__ */ new Map(), matches2 = [];
  outer: while (fI > 0) {
    let desc;
    for (; ; ) {
      if (descI) {
        let next = curDesc.children[descI - 1];
        if (next instanceof MarkViewDesc) {
          curDesc = next;
          descI = next.children.length;
        } else {
          desc = next;
          descI--;
          break;
        }
      } else if (curDesc == parentDesc) {
        break outer;
      } else {
        descI = curDesc.parent.children.indexOf(curDesc);
        curDesc = curDesc.parent;
      }
    }
    let node = desc.node;
    if (!node)
      continue;
    if (node != frag.child(fI - 1))
      break;
    --fI;
    matched.set(desc, fI);
    matches2.push(desc);
  }
  return { index: fI, matched, matches: matches2.reverse() };
}
function compareSide(a, b) {
  return a.type.side - b.type.side;
}
function iterDeco(parent, deco, onWidget, onNode) {
  let locals = deco.locals(parent), offset = 0;
  if (locals.length == 0) {
    for (let i = 0; i < parent.childCount; i++) {
      let child = parent.child(i);
      onNode(child, locals, deco.forChild(offset, child), i);
      offset += child.nodeSize;
    }
    return;
  }
  let decoIndex = 0, active2 = [], restNode = null;
  for (let parentIndex = 0; ; ) {
    let widget, widgets;
    while (decoIndex < locals.length && locals[decoIndex].to == offset) {
      let next = locals[decoIndex++];
      if (next.widget) {
        if (!widget)
          widget = next;
        else
          (widgets || (widgets = [widget])).push(next);
      }
    }
    if (widget) {
      if (widgets) {
        widgets.sort(compareSide);
        for (let i = 0; i < widgets.length; i++)
          onWidget(widgets[i], parentIndex, !!restNode);
      } else {
        onWidget(widget, parentIndex, !!restNode);
      }
    }
    let child, index;
    if (restNode) {
      index = -1;
      child = restNode;
      restNode = null;
    } else if (parentIndex < parent.childCount) {
      index = parentIndex;
      child = parent.child(parentIndex++);
    } else {
      break;
    }
    for (let i = 0; i < active2.length; i++)
      if (active2[i].to <= offset)
        active2.splice(i--, 1);
    while (decoIndex < locals.length && locals[decoIndex].from <= offset && locals[decoIndex].to > offset)
      active2.push(locals[decoIndex++]);
    let end = offset + child.nodeSize;
    if (child.isText) {
      let cutAt = end;
      if (decoIndex < locals.length && locals[decoIndex].from < cutAt)
        cutAt = locals[decoIndex].from;
      for (let i = 0; i < active2.length; i++)
        if (active2[i].to < cutAt)
          cutAt = active2[i].to;
      if (cutAt < end) {
        restNode = child.cut(cutAt - offset);
        child = child.cut(0, cutAt - offset);
        end = cutAt;
        index = -1;
      }
    } else {
      while (decoIndex < locals.length && locals[decoIndex].to < end)
        decoIndex++;
    }
    let outerDeco = child.isInline && !child.isLeaf ? active2.filter((d) => !d.inline) : active2.slice();
    onNode(child, outerDeco, deco.forChild(offset, child), index);
    offset = end;
  }
}
function iosHacks(dom) {
  if (dom.nodeName == "UL" || dom.nodeName == "OL") {
    let oldCSS = dom.style.cssText;
    dom.style.cssText = oldCSS + "; list-style: square !important";
    window.getComputedStyle(dom).listStyle;
    dom.style.cssText = oldCSS;
  }
}
function findTextInFragment(frag, text2, from, to) {
  for (let i = 0, pos = 0; i < frag.childCount && pos <= to; ) {
    let child = frag.child(i++), childStart = pos;
    pos += child.nodeSize;
    if (!child.isText)
      continue;
    let str = child.text;
    while (i < frag.childCount) {
      let next = frag.child(i++);
      pos += next.nodeSize;
      if (!next.isText)
        break;
      str += next.text;
    }
    if (pos >= from) {
      if (pos >= to && str.slice(to - text2.length - childStart, to - childStart) == text2)
        return to - text2.length;
      let found2 = childStart < to ? str.lastIndexOf(text2, to - childStart - 1) : -1;
      if (found2 >= 0 && found2 + text2.length + childStart >= from)
        return childStart + found2;
      if (from == to && str.length >= to + text2.length - childStart && str.slice(to - childStart, to - childStart + text2.length) == text2)
        return to;
    }
  }
  return -1;
}
function replaceNodes(nodes, from, to, view2, replacement) {
  let result = [];
  for (let i = 0, off = 0; i < nodes.length; i++) {
    let child = nodes[i], start = off, end = off += child.size;
    if (start >= to || end <= from) {
      result.push(child);
    } else {
      if (start < from)
        result.push(child.slice(0, from - start, view2));
      if (replacement) {
        result.push(replacement);
        replacement = void 0;
      }
      if (end > to)
        result.push(child.slice(to - start, child.size, view2));
    }
  }
  return result;
}
function selectionFromDOM(view2, origin = null) {
  let domSel = view2.domSelectionRange(), doc2 = view2.state.doc;
  if (!domSel.focusNode)
    return null;
  let nearestDesc = view2.docView.nearestDesc(domSel.focusNode), inWidget = nearestDesc && nearestDesc.size == 0;
  let head = view2.docView.posFromDOM(domSel.focusNode, domSel.focusOffset, 1);
  if (head < 0)
    return null;
  let $head = doc2.resolve(head), anchor, selection;
  if (selectionCollapsed(domSel)) {
    anchor = head;
    while (nearestDesc && !nearestDesc.node)
      nearestDesc = nearestDesc.parent;
    let nearestDescNode = nearestDesc.node;
    if (nearestDesc && nearestDescNode.isAtom && NodeSelection.isSelectable(nearestDescNode) && nearestDesc.parent && !(nearestDescNode.isInline && isOnEdge(domSel.focusNode, domSel.focusOffset, nearestDesc.dom))) {
      let pos = nearestDesc.posBefore;
      selection = new NodeSelection(head == pos ? $head : doc2.resolve(pos));
    }
  } else {
    if (domSel instanceof view2.dom.ownerDocument.defaultView.Selection && domSel.rangeCount > 1) {
      let min = head, max = head;
      for (let i = 0; i < domSel.rangeCount; i++) {
        let range = domSel.getRangeAt(i);
        min = Math.min(min, view2.docView.posFromDOM(range.startContainer, range.startOffset, 1));
        max = Math.max(max, view2.docView.posFromDOM(range.endContainer, range.endOffset, -1));
      }
      if (min < 0)
        return null;
      [anchor, head] = max == view2.state.selection.anchor ? [max, min] : [min, max];
      $head = doc2.resolve(head);
    } else {
      anchor = view2.docView.posFromDOM(domSel.anchorNode, domSel.anchorOffset, 1);
    }
    if (anchor < 0)
      return null;
  }
  let $anchor = doc2.resolve(anchor);
  if (!selection) {
    let bias = origin == "pointer" || view2.state.selection.head < $head.pos && !inWidget ? 1 : -1;
    selection = selectionBetween(view2, $anchor, $head, bias);
  }
  return selection;
}
function editorOwnsSelection(view2) {
  return view2.editable ? view2.hasFocus() : hasSelection(view2) && document.activeElement && document.activeElement.contains(view2.dom);
}
function selectionToDOM(view2, force = false) {
  let sel = view2.state.selection;
  syncNodeSelection(view2, sel);
  if (!editorOwnsSelection(view2))
    return;
  if (!force && view2.input.mouseDown && view2.input.mouseDown.allowDefault && chrome) {
    let domSel = view2.domSelectionRange(), curSel = view2.domObserver.currentSelection;
    if (domSel.anchorNode && curSel.anchorNode && isEquivalentPosition(domSel.anchorNode, domSel.anchorOffset, curSel.anchorNode, curSel.anchorOffset)) {
      view2.input.mouseDown.delayedSelectionSync = true;
      view2.domObserver.setCurSelection();
      return;
    }
  }
  view2.domObserver.disconnectSelection();
  if (view2.cursorWrapper) {
    selectCursorWrapper(view2);
  } else {
    let { anchor, head } = sel, resetEditableFrom, resetEditableTo;
    if (brokenSelectBetweenUneditable && !(sel instanceof TextSelection)) {
      if (!sel.$from.parent.inlineContent)
        resetEditableFrom = temporarilyEditableNear(view2, sel.from);
      if (!sel.empty && !sel.$from.parent.inlineContent)
        resetEditableTo = temporarilyEditableNear(view2, sel.to);
    }
    view2.docView.setSelection(anchor, head, view2.root, force);
    if (brokenSelectBetweenUneditable) {
      if (resetEditableFrom)
        resetEditable(resetEditableFrom);
      if (resetEditableTo)
        resetEditable(resetEditableTo);
    }
    if (sel.visible) {
      view2.dom.classList.remove("ProseMirror-hideselection");
    } else {
      view2.dom.classList.add("ProseMirror-hideselection");
      if ("onselectionchange" in document)
        removeClassOnSelectionChange(view2);
    }
  }
  view2.domObserver.setCurSelection();
  view2.domObserver.connectSelection();
}
const brokenSelectBetweenUneditable = safari || chrome && chrome_version < 63;
function temporarilyEditableNear(view2, pos) {
  let { node, offset } = view2.docView.domFromPos(pos, 0);
  let after = offset < node.childNodes.length ? node.childNodes[offset] : null;
  let before = offset ? node.childNodes[offset - 1] : null;
  if (safari && after && after.contentEditable == "false")
    return setEditable(after);
  if ((!after || after.contentEditable == "false") && (!before || before.contentEditable == "false")) {
    if (after)
      return setEditable(after);
    else if (before)
      return setEditable(before);
  }
}
function setEditable(element2) {
  element2.contentEditable = "true";
  if (safari && element2.draggable) {
    element2.draggable = false;
    element2.wasDraggable = true;
  }
  return element2;
}
function resetEditable(element2) {
  element2.contentEditable = "false";
  if (element2.wasDraggable) {
    element2.draggable = true;
    element2.wasDraggable = null;
  }
}
function removeClassOnSelectionChange(view2) {
  let doc2 = view2.dom.ownerDocument;
  doc2.removeEventListener("selectionchange", view2.input.hideSelectionGuard);
  let domSel = view2.domSelectionRange();
  let node = domSel.anchorNode, offset = domSel.anchorOffset;
  doc2.addEventListener("selectionchange", view2.input.hideSelectionGuard = () => {
    if (domSel.anchorNode != node || domSel.anchorOffset != offset) {
      doc2.removeEventListener("selectionchange", view2.input.hideSelectionGuard);
      setTimeout(() => {
        if (!editorOwnsSelection(view2) || view2.state.selection.visible)
          view2.dom.classList.remove("ProseMirror-hideselection");
      }, 20);
    }
  });
}
function selectCursorWrapper(view2) {
  let domSel = view2.domSelection(), range = document.createRange();
  if (!domSel)
    return;
  let node = view2.cursorWrapper.dom, img = node.nodeName == "IMG";
  if (img)
    range.setStart(node.parentNode, domIndex(node) + 1);
  else
    range.setStart(node, 0);
  range.collapse(true);
  domSel.removeAllRanges();
  domSel.addRange(range);
  if (!img && !view2.state.selection.visible && ie$1 && ie_version <= 11) {
    node.disabled = true;
    node.disabled = false;
  }
}
function syncNodeSelection(view2, sel) {
  if (sel instanceof NodeSelection) {
    let desc = view2.docView.descAt(sel.from);
    if (desc != view2.lastSelectedViewDesc) {
      clearNodeSelection(view2);
      if (desc)
        desc.selectNode();
      view2.lastSelectedViewDesc = desc;
    }
  } else {
    clearNodeSelection(view2);
  }
}
function clearNodeSelection(view2) {
  if (view2.lastSelectedViewDesc) {
    if (view2.lastSelectedViewDesc.parent)
      view2.lastSelectedViewDesc.deselectNode();
    view2.lastSelectedViewDesc = void 0;
  }
}
function selectionBetween(view2, $anchor, $head, bias) {
  return view2.someProp("createSelectionBetween", (f) => f(view2, $anchor, $head)) || TextSelection.between($anchor, $head, bias);
}
function hasFocusAndSelection(view2) {
  if (view2.editable && !view2.hasFocus())
    return false;
  return hasSelection(view2);
}
function hasSelection(view2) {
  let sel = view2.domSelectionRange();
  if (!sel.anchorNode)
    return false;
  try {
    return view2.dom.contains(sel.anchorNode.nodeType == 3 ? sel.anchorNode.parentNode : sel.anchorNode) && (view2.editable || view2.dom.contains(sel.focusNode.nodeType == 3 ? sel.focusNode.parentNode : sel.focusNode));
  } catch (_) {
    return false;
  }
}
function anchorInRightPlace(view2) {
  let anchorDOM = view2.docView.domFromPos(view2.state.selection.anchor, 0);
  let domSel = view2.domSelectionRange();
  return isEquivalentPosition(anchorDOM.node, anchorDOM.offset, domSel.anchorNode, domSel.anchorOffset);
}
function moveSelectionBlock(state2, dir) {
  let { $anchor, $head } = state2.selection;
  let $side = dir > 0 ? $anchor.max($head) : $anchor.min($head);
  let $start = !$side.parent.inlineContent ? $side : $side.depth ? state2.doc.resolve(dir > 0 ? $side.after() : $side.before()) : null;
  return $start && Selection.findFrom($start, dir);
}
function apply(view2, sel) {
  view2.dispatch(view2.state.tr.setSelection(sel).scrollIntoView());
  return true;
}
function selectHorizontally(view2, dir, mods) {
  let sel = view2.state.selection;
  if (sel instanceof TextSelection) {
    if (mods.indexOf("s") > -1) {
      let { $head } = sel, node = $head.textOffset ? null : dir < 0 ? $head.nodeBefore : $head.nodeAfter;
      if (!node || node.isText || !node.isLeaf)
        return false;
      let $newHead = view2.state.doc.resolve($head.pos + node.nodeSize * (dir < 0 ? -1 : 1));
      return apply(view2, new TextSelection(sel.$anchor, $newHead));
    } else if (!sel.empty) {
      return false;
    } else if (view2.endOfTextblock(dir > 0 ? "forward" : "backward")) {
      let next = moveSelectionBlock(view2.state, dir);
      if (next && next instanceof NodeSelection)
        return apply(view2, next);
      return false;
    } else if (!(mac$2 && mods.indexOf("m") > -1)) {
      let $head = sel.$head, node = $head.textOffset ? null : dir < 0 ? $head.nodeBefore : $head.nodeAfter, desc;
      if (!node || node.isText)
        return false;
      let nodePos = dir < 0 ? $head.pos - node.nodeSize : $head.pos;
      if (!(node.isAtom || (desc = view2.docView.descAt(nodePos)) && !desc.contentDOM))
        return false;
      if (NodeSelection.isSelectable(node)) {
        return apply(view2, new NodeSelection(dir < 0 ? view2.state.doc.resolve($head.pos - node.nodeSize) : $head));
      } else if (webkit) {
        return apply(view2, new TextSelection(view2.state.doc.resolve(dir < 0 ? nodePos : nodePos + node.nodeSize)));
      } else {
        return false;
      }
    }
  } else if (sel instanceof NodeSelection && sel.node.isInline) {
    return apply(view2, new TextSelection(dir > 0 ? sel.$to : sel.$from));
  } else {
    let next = moveSelectionBlock(view2.state, dir);
    if (next)
      return apply(view2, next);
    return false;
  }
}
function nodeLen(node) {
  return node.nodeType == 3 ? node.nodeValue.length : node.childNodes.length;
}
function isIgnorable(dom, dir) {
  let desc = dom.pmViewDesc;
  return desc && desc.size == 0 && (dir < 0 || dom.nextSibling || dom.nodeName != "BR");
}
function skipIgnoredNodes(view2, dir) {
  return dir < 0 ? skipIgnoredNodesBefore(view2) : skipIgnoredNodesAfter(view2);
}
function skipIgnoredNodesBefore(view2) {
  let sel = view2.domSelectionRange();
  let node = sel.focusNode, offset = sel.focusOffset;
  if (!node)
    return;
  let moveNode, moveOffset, force = false;
  if (gecko && node.nodeType == 1 && offset < nodeLen(node) && isIgnorable(node.childNodes[offset], -1))
    force = true;
  for (; ; ) {
    if (offset > 0) {
      if (node.nodeType != 1) {
        break;
      } else {
        let before = node.childNodes[offset - 1];
        if (isIgnorable(before, -1)) {
          moveNode = node;
          moveOffset = --offset;
        } else if (before.nodeType == 3) {
          node = before;
          offset = node.nodeValue.length;
        } else
          break;
      }
    } else if (isBlockNode(node)) {
      break;
    } else {
      let prev = node.previousSibling;
      while (prev && isIgnorable(prev, -1)) {
        moveNode = node.parentNode;
        moveOffset = domIndex(prev);
        prev = prev.previousSibling;
      }
      if (!prev) {
        node = node.parentNode;
        if (node == view2.dom)
          break;
        offset = 0;
      } else {
        node = prev;
        offset = nodeLen(node);
      }
    }
  }
  if (force)
    setSelFocus(view2, node, offset);
  else if (moveNode)
    setSelFocus(view2, moveNode, moveOffset);
}
function skipIgnoredNodesAfter(view2) {
  let sel = view2.domSelectionRange();
  let node = sel.focusNode, offset = sel.focusOffset;
  if (!node)
    return;
  let len = nodeLen(node);
  let moveNode, moveOffset;
  for (; ; ) {
    if (offset < len) {
      if (node.nodeType != 1)
        break;
      let after = node.childNodes[offset];
      if (isIgnorable(after, 1)) {
        moveNode = node;
        moveOffset = ++offset;
      } else
        break;
    } else if (isBlockNode(node)) {
      break;
    } else {
      let next = node.nextSibling;
      while (next && isIgnorable(next, 1)) {
        moveNode = next.parentNode;
        moveOffset = domIndex(next) + 1;
        next = next.nextSibling;
      }
      if (!next) {
        node = node.parentNode;
        if (node == view2.dom)
          break;
        offset = len = 0;
      } else {
        node = next;
        offset = 0;
        len = nodeLen(node);
      }
    }
  }
  if (moveNode)
    setSelFocus(view2, moveNode, moveOffset);
}
function isBlockNode(dom) {
  let desc = dom.pmViewDesc;
  return desc && desc.node && desc.node.isBlock;
}
function textNodeAfter(node, offset) {
  while (node && offset == node.childNodes.length && !hasBlockDesc(node)) {
    offset = domIndex(node) + 1;
    node = node.parentNode;
  }
  while (node && offset < node.childNodes.length) {
    let next = node.childNodes[offset];
    if (next.nodeType == 3)
      return next;
    if (next.nodeType == 1 && next.contentEditable == "false")
      break;
    node = next;
    offset = 0;
  }
}
function textNodeBefore(node, offset) {
  while (node && !offset && !hasBlockDesc(node)) {
    offset = domIndex(node);
    node = node.parentNode;
  }
  while (node && offset) {
    let next = node.childNodes[offset - 1];
    if (next.nodeType == 3)
      return next;
    if (next.nodeType == 1 && next.contentEditable == "false")
      break;
    node = next;
    offset = node.childNodes.length;
  }
}
function setSelFocus(view2, node, offset) {
  if (node.nodeType != 3) {
    let before, after;
    if (after = textNodeAfter(node, offset)) {
      node = after;
      offset = 0;
    } else if (before = textNodeBefore(node, offset)) {
      node = before;
      offset = before.nodeValue.length;
    }
  }
  let sel = view2.domSelection();
  if (!sel)
    return;
  if (selectionCollapsed(sel)) {
    let range = document.createRange();
    range.setEnd(node, offset);
    range.setStart(node, offset);
    sel.removeAllRanges();
    sel.addRange(range);
  } else if (sel.extend) {
    sel.extend(node, offset);
  }
  view2.domObserver.setCurSelection();
  let { state: state2 } = view2;
  setTimeout(() => {
    if (view2.state == state2)
      selectionToDOM(view2);
  }, 50);
}
function findDirection(view2, pos) {
  let $pos = view2.state.doc.resolve(pos);
  if (!(chrome || windows) && $pos.parent.inlineContent) {
    let coords = view2.coordsAtPos(pos);
    if (pos > $pos.start()) {
      let before = view2.coordsAtPos(pos - 1);
      let mid = (before.top + before.bottom) / 2;
      if (mid > coords.top && mid < coords.bottom && Math.abs(before.left - coords.left) > 1)
        return before.left < coords.left ? "ltr" : "rtl";
    }
    if (pos < $pos.end()) {
      let after = view2.coordsAtPos(pos + 1);
      let mid = (after.top + after.bottom) / 2;
      if (mid > coords.top && mid < coords.bottom && Math.abs(after.left - coords.left) > 1)
        return after.left > coords.left ? "ltr" : "rtl";
    }
  }
  let computed = getComputedStyle(view2.dom).direction;
  return computed == "rtl" ? "rtl" : "ltr";
}
function selectVertically(view2, dir, mods) {
  let sel = view2.state.selection;
  if (sel instanceof TextSelection && !sel.empty || mods.indexOf("s") > -1)
    return false;
  if (mac$2 && mods.indexOf("m") > -1)
    return false;
  let { $from, $to } = sel;
  if (!$from.parent.inlineContent || view2.endOfTextblock(dir < 0 ? "up" : "down")) {
    let next = moveSelectionBlock(view2.state, dir);
    if (next && next instanceof NodeSelection)
      return apply(view2, next);
  }
  if (!$from.parent.inlineContent) {
    let side = dir < 0 ? $from : $to;
    let beyond = sel instanceof AllSelection ? Selection.near(side, dir) : Selection.findFrom(side, dir);
    return beyond ? apply(view2, beyond) : false;
  }
  return false;
}
function stopNativeHorizontalDelete(view2, dir) {
  if (!(view2.state.selection instanceof TextSelection))
    return true;
  let { $head, $anchor, empty: empty2 } = view2.state.selection;
  if (!$head.sameParent($anchor))
    return true;
  if (!empty2)
    return false;
  if (view2.endOfTextblock(dir > 0 ? "forward" : "backward"))
    return true;
  let nextNode = !$head.textOffset && (dir < 0 ? $head.nodeBefore : $head.nodeAfter);
  if (nextNode && !nextNode.isText) {
    let tr = view2.state.tr;
    if (dir < 0)
      tr.delete($head.pos - nextNode.nodeSize, $head.pos);
    else
      tr.delete($head.pos, $head.pos + nextNode.nodeSize);
    view2.dispatch(tr);
    return true;
  }
  return false;
}
function switchEditable(view2, node, state2) {
  view2.domObserver.stop();
  node.contentEditable = state2;
  view2.domObserver.start();
}
function safariDownArrowBug(view2) {
  if (!safari || view2.state.selection.$head.parentOffset > 0)
    return false;
  let { focusNode, focusOffset } = view2.domSelectionRange();
  if (focusNode && focusNode.nodeType == 1 && focusOffset == 0 && focusNode.firstChild && focusNode.firstChild.contentEditable == "false") {
    let child = focusNode.firstChild;
    switchEditable(view2, child, "true");
    setTimeout(() => switchEditable(view2, child, "false"), 20);
  }
  return false;
}
function getMods(event) {
  let result = "";
  if (event.ctrlKey)
    result += "c";
  if (event.metaKey)
    result += "m";
  if (event.altKey)
    result += "a";
  if (event.shiftKey)
    result += "s";
  return result;
}
function captureKeyDown(view2, event) {
  let code = event.keyCode, mods = getMods(event);
  if (code == 8 || mac$2 && code == 72 && mods == "c") {
    return stopNativeHorizontalDelete(view2, -1) || skipIgnoredNodes(view2, -1);
  } else if (code == 46 && !event.shiftKey || mac$2 && code == 68 && mods == "c") {
    return stopNativeHorizontalDelete(view2, 1) || skipIgnoredNodes(view2, 1);
  } else if (code == 13 || code == 27) {
    return true;
  } else if (code == 37 || mac$2 && code == 66 && mods == "c") {
    let dir = code == 37 ? findDirection(view2, view2.state.selection.from) == "ltr" ? -1 : 1 : -1;
    return selectHorizontally(view2, dir, mods) || skipIgnoredNodes(view2, dir);
  } else if (code == 39 || mac$2 && code == 70 && mods == "c") {
    let dir = code == 39 ? findDirection(view2, view2.state.selection.from) == "ltr" ? 1 : -1 : 1;
    return selectHorizontally(view2, dir, mods) || skipIgnoredNodes(view2, dir);
  } else if (code == 38 || mac$2 && code == 80 && mods == "c") {
    return selectVertically(view2, -1, mods) || skipIgnoredNodes(view2, -1);
  } else if (code == 40 || mac$2 && code == 78 && mods == "c") {
    return safariDownArrowBug(view2) || selectVertically(view2, 1, mods) || skipIgnoredNodes(view2, 1);
  } else if (mods == (mac$2 ? "m" : "c") && (code == 66 || code == 73 || code == 89 || code == 90)) {
    return true;
  }
  return false;
}
function serializeForClipboard(view2, slice) {
  view2.someProp("transformCopied", (f) => {
    slice = f(slice, view2);
  });
  let context = [], { content, openStart, openEnd } = slice;
  while (openStart > 1 && openEnd > 1 && content.childCount == 1 && content.firstChild.childCount == 1) {
    openStart--;
    openEnd--;
    let node = content.firstChild;
    context.push(node.type.name, node.attrs != node.type.defaultAttrs ? node.attrs : null);
    content = node.content;
  }
  let serializer = view2.someProp("clipboardSerializer") || DOMSerializer.fromSchema(view2.state.schema);
  let doc2 = detachedDoc(), wrap2 = doc2.createElement("div");
  wrap2.appendChild(serializer.serializeFragment(content, { document: doc2 }));
  let firstChild = wrap2.firstChild, needsWrap, wrappers = 0;
  while (firstChild && firstChild.nodeType == 1 && (needsWrap = wrapMap[firstChild.nodeName.toLowerCase()])) {
    for (let i = needsWrap.length - 1; i >= 0; i--) {
      let wrapper = doc2.createElement(needsWrap[i]);
      while (wrap2.firstChild)
        wrapper.appendChild(wrap2.firstChild);
      wrap2.appendChild(wrapper);
      wrappers++;
    }
    firstChild = wrap2.firstChild;
  }
  if (firstChild && firstChild.nodeType == 1)
    firstChild.setAttribute("data-pm-slice", `${openStart} ${openEnd}${wrappers ? ` -${wrappers}` : ""} ${JSON.stringify(context)}`);
  let text2 = view2.someProp("clipboardTextSerializer", (f) => f(slice, view2)) || slice.content.textBetween(0, slice.content.size, "\n\n");
  return { dom: wrap2, text: text2, slice };
}
function parseFromClipboard(view2, text2, html2, plainText, $context) {
  let inCode = $context.parent.type.spec.code;
  let dom, slice;
  if (!html2 && !text2)
    return null;
  let asText = text2 && (plainText || inCode || !html2);
  if (asText) {
    view2.someProp("transformPastedText", (f) => {
      text2 = f(text2, inCode || plainText, view2);
    });
    if (inCode)
      return text2 ? new Slice(Fragment.from(view2.state.schema.text(text2.replace(/\r\n?/g, "\n"))), 0, 0) : Slice.empty;
    let parsed = view2.someProp("clipboardTextParser", (f) => f(text2, $context, plainText, view2));
    if (parsed) {
      slice = parsed;
    } else {
      let marks = $context.marks();
      let { schema: schema2 } = view2.state, serializer = DOMSerializer.fromSchema(schema2);
      dom = document.createElement("div");
      text2.split(/(?:\r\n?|\n)+/).forEach((block) => {
        let p = dom.appendChild(document.createElement("p"));
        if (block)
          p.appendChild(serializer.serializeNode(schema2.text(block, marks)));
      });
    }
  } else {
    view2.someProp("transformPastedHTML", (f) => {
      html2 = f(html2, view2);
    });
    dom = readHTML(html2);
    if (webkit)
      restoreReplacedSpaces(dom);
  }
  let contextNode = dom && dom.querySelector("[data-pm-slice]");
  let sliceData = contextNode && /^(\d+) (\d+)(?: -(\d+))? (.*)/.exec(contextNode.getAttribute("data-pm-slice") || "");
  if (sliceData && sliceData[3])
    for (let i = +sliceData[3]; i > 0; i--) {
      let child = dom.firstChild;
      while (child && child.nodeType != 1)
        child = child.nextSibling;
      if (!child)
        break;
      dom = child;
    }
  if (!slice) {
    let parser = view2.someProp("clipboardParser") || view2.someProp("domParser") || DOMParser.fromSchema(view2.state.schema);
    slice = parser.parseSlice(dom, {
      preserveWhitespace: !!(asText || sliceData),
      context: $context,
      ruleFromNode(dom2) {
        if (dom2.nodeName == "BR" && !dom2.nextSibling && dom2.parentNode && !inlineParents.test(dom2.parentNode.nodeName))
          return { ignore: true };
        return null;
      }
    });
  }
  if (sliceData) {
    slice = addContext(closeSlice(slice, +sliceData[1], +sliceData[2]), sliceData[4]);
  } else {
    slice = Slice.maxOpen(normalizeSiblings(slice.content, $context), true);
    if (slice.openStart || slice.openEnd) {
      let openStart = 0, openEnd = 0;
      for (let node = slice.content.firstChild; openStart < slice.openStart && !node.type.spec.isolating; openStart++, node = node.firstChild) {
      }
      for (let node = slice.content.lastChild; openEnd < slice.openEnd && !node.type.spec.isolating; openEnd++, node = node.lastChild) {
      }
      slice = closeSlice(slice, openStart, openEnd);
    }
  }
  view2.someProp("transformPasted", (f) => {
    slice = f(slice, view2);
  });
  return slice;
}
const inlineParents = /^(a|abbr|acronym|b|cite|code|del|em|i|ins|kbd|label|output|q|ruby|s|samp|span|strong|sub|sup|time|u|tt|var)$/i;
function normalizeSiblings(fragment, $context) {
  if (fragment.childCount < 2)
    return fragment;
  for (let d = $context.depth; d >= 0; d--) {
    let parent = $context.node(d);
    let match = parent.contentMatchAt($context.index(d));
    let lastWrap, result = [];
    fragment.forEach((node) => {
      if (!result)
        return;
      let wrap2 = match.findWrapping(node.type), inLast;
      if (!wrap2)
        return result = null;
      if (inLast = result.length && lastWrap.length && addToSibling(wrap2, lastWrap, node, result[result.length - 1], 0)) {
        result[result.length - 1] = inLast;
      } else {
        if (result.length)
          result[result.length - 1] = closeRight(result[result.length - 1], lastWrap.length);
        let wrapped = withWrappers(node, wrap2);
        result.push(wrapped);
        match = match.matchType(wrapped.type);
        lastWrap = wrap2;
      }
    });
    if (result)
      return Fragment.from(result);
  }
  return fragment;
}
function withWrappers(node, wrap2, from = 0) {
  for (let i = wrap2.length - 1; i >= from; i--)
    node = wrap2[i].create(null, Fragment.from(node));
  return node;
}
function addToSibling(wrap2, lastWrap, node, sibling, depth) {
  if (depth < wrap2.length && depth < lastWrap.length && wrap2[depth] == lastWrap[depth]) {
    let inner = addToSibling(wrap2, lastWrap, node, sibling.lastChild, depth + 1);
    if (inner)
      return sibling.copy(sibling.content.replaceChild(sibling.childCount - 1, inner));
    let match = sibling.contentMatchAt(sibling.childCount);
    if (match.matchType(depth == wrap2.length - 1 ? node.type : wrap2[depth + 1]))
      return sibling.copy(sibling.content.append(Fragment.from(withWrappers(node, wrap2, depth + 1))));
  }
}
function closeRight(node, depth) {
  if (depth == 0)
    return node;
  let fragment = node.content.replaceChild(node.childCount - 1, closeRight(node.lastChild, depth - 1));
  let fill = node.contentMatchAt(node.childCount).fillBefore(Fragment.empty, true);
  return node.copy(fragment.append(fill));
}
function closeRange(fragment, side, from, to, depth, openEnd) {
  let node = side < 0 ? fragment.firstChild : fragment.lastChild, inner = node.content;
  if (fragment.childCount > 1)
    openEnd = 0;
  if (depth < to - 1)
    inner = closeRange(inner, side, from, to, depth + 1, openEnd);
  if (depth >= from)
    inner = side < 0 ? node.contentMatchAt(0).fillBefore(inner, openEnd <= depth).append(inner) : inner.append(node.contentMatchAt(node.childCount).fillBefore(Fragment.empty, true));
  return fragment.replaceChild(side < 0 ? 0 : fragment.childCount - 1, node.copy(inner));
}
function closeSlice(slice, openStart, openEnd) {
  if (openStart < slice.openStart)
    slice = new Slice(closeRange(slice.content, -1, openStart, slice.openStart, 0, slice.openEnd), openStart, slice.openEnd);
  if (openEnd < slice.openEnd)
    slice = new Slice(closeRange(slice.content, 1, openEnd, slice.openEnd, 0, 0), slice.openStart, openEnd);
  return slice;
}
const wrapMap = {
  thead: ["table"],
  tbody: ["table"],
  tfoot: ["table"],
  caption: ["table"],
  colgroup: ["table"],
  col: ["table", "colgroup"],
  tr: ["table", "tbody"],
  td: ["table", "tbody", "tr"],
  th: ["table", "tbody", "tr"]
};
let _detachedDoc = null;
function detachedDoc() {
  return _detachedDoc || (_detachedDoc = document.implementation.createHTMLDocument("title"));
}
function maybeWrapTrusted(html2) {
  let trustedTypes = window.trustedTypes;
  if (!trustedTypes)
    return html2;
  return trustedTypes.createPolicy("detachedDocument", { createHTML: (s) => s }).createHTML(html2);
}
function readHTML(html2) {
  let metas = /^(\s*<meta [^>]*>)*/.exec(html2);
  if (metas)
    html2 = html2.slice(metas[0].length);
  let elt = detachedDoc().createElement("div");
  let firstTag = /<([a-z][^>\s]+)/i.exec(html2), wrap2;
  if (wrap2 = firstTag && wrapMap[firstTag[1].toLowerCase()])
    html2 = wrap2.map((n) => "<" + n + ">").join("") + html2 + wrap2.map((n) => "</" + n + ">").reverse().join("");
  elt.innerHTML = maybeWrapTrusted(html2);
  if (wrap2)
    for (let i = 0; i < wrap2.length; i++)
      elt = elt.querySelector(wrap2[i]) || elt;
  return elt;
}
function restoreReplacedSpaces(dom) {
  let nodes = dom.querySelectorAll(chrome ? "span:not([class]):not([style])" : "span.Apple-converted-space");
  for (let i = 0; i < nodes.length; i++) {
    let node = nodes[i];
    if (node.childNodes.length == 1 && node.textContent == " " && node.parentNode)
      node.parentNode.replaceChild(dom.ownerDocument.createTextNode(" "), node);
  }
}
function addContext(slice, context) {
  if (!slice.size)
    return slice;
  let schema2 = slice.content.firstChild.type.schema, array;
  try {
    array = JSON.parse(context);
  } catch (e) {
    return slice;
  }
  let { content, openStart, openEnd } = slice;
  for (let i = array.length - 2; i >= 0; i -= 2) {
    let type = schema2.nodes[array[i]];
    if (!type || type.hasRequiredAttrs())
      break;
    content = Fragment.from(type.create(array[i + 1], content));
    openStart++;
    openEnd++;
  }
  return new Slice(content, openStart, openEnd);
}
const handlers = {};
const editHandlers = {};
const passiveHandlers = { touchstart: true, touchmove: true };
class InputState {
  constructor() {
    this.shiftKey = false;
    this.mouseDown = null;
    this.lastKeyCode = null;
    this.lastKeyCodeTime = 0;
    this.lastClick = { time: 0, x: 0, y: 0, type: "" };
    this.lastSelectionOrigin = null;
    this.lastSelectionTime = 0;
    this.lastIOSEnter = 0;
    this.lastIOSEnterFallbackTimeout = -1;
    this.lastFocus = 0;
    this.lastTouch = 0;
    this.lastAndroidDelete = 0;
    this.composing = false;
    this.compositionNode = null;
    this.composingTimeout = -1;
    this.compositionNodes = [];
    this.compositionEndedAt = -2e8;
    this.compositionID = 1;
    this.compositionPendingChanges = 0;
    this.domChangeCount = 0;
    this.eventHandlers = /* @__PURE__ */ Object.create(null);
    this.hideSelectionGuard = null;
  }
}
function initInput(view2) {
  for (let event in handlers) {
    let handler = handlers[event];
    view2.dom.addEventListener(event, view2.input.eventHandlers[event] = (event2) => {
      if (eventBelongsToView(view2, event2) && !runCustomHandler(view2, event2) && (view2.editable || !(event2.type in editHandlers)))
        handler(view2, event2);
    }, passiveHandlers[event] ? { passive: true } : void 0);
  }
  if (safari)
    view2.dom.addEventListener("input", () => null);
  ensureListeners(view2);
}
function setSelectionOrigin(view2, origin) {
  view2.input.lastSelectionOrigin = origin;
  view2.input.lastSelectionTime = Date.now();
}
function destroyInput(view2) {
  view2.domObserver.stop();
  for (let type in view2.input.eventHandlers)
    view2.dom.removeEventListener(type, view2.input.eventHandlers[type]);
  clearTimeout(view2.input.composingTimeout);
  clearTimeout(view2.input.lastIOSEnterFallbackTimeout);
}
function ensureListeners(view2) {
  view2.someProp("handleDOMEvents", (currentHandlers) => {
    for (let type in currentHandlers)
      if (!view2.input.eventHandlers[type])
        view2.dom.addEventListener(type, view2.input.eventHandlers[type] = (event) => runCustomHandler(view2, event));
  });
}
function runCustomHandler(view2, event) {
  return view2.someProp("handleDOMEvents", (handlers2) => {
    let handler = handlers2[event.type];
    return handler ? handler(view2, event) || event.defaultPrevented : false;
  });
}
function eventBelongsToView(view2, event) {
  if (!event.bubbles)
    return true;
  if (event.defaultPrevented)
    return false;
  for (let node = event.target; node != view2.dom; node = node.parentNode)
    if (!node || node.nodeType == 11 || node.pmViewDesc && node.pmViewDesc.stopEvent(event))
      return false;
  return true;
}
function dispatchEvent(view2, event) {
  if (!runCustomHandler(view2, event) && handlers[event.type] && (view2.editable || !(event.type in editHandlers)))
    handlers[event.type](view2, event);
}
editHandlers.keydown = (view2, _event) => {
  let event = _event;
  view2.input.shiftKey = event.keyCode == 16 || event.shiftKey;
  if (inOrNearComposition(view2, event))
    return;
  view2.input.lastKeyCode = event.keyCode;
  view2.input.lastKeyCodeTime = Date.now();
  if (android && chrome && event.keyCode == 13)
    return;
  if (view2.domObserver.selectionChanged(view2.domSelectionRange()))
    view2.domObserver.flush();
  else if (event.keyCode != 229)
    view2.domObserver.forceFlush();
  if (ios && event.keyCode == 13 && !event.ctrlKey && !event.altKey && !event.metaKey) {
    let now = Date.now();
    view2.input.lastIOSEnter = now;
    view2.input.lastIOSEnterFallbackTimeout = setTimeout(() => {
      if (view2.input.lastIOSEnter == now) {
        view2.someProp("handleKeyDown", (f) => f(view2, keyEvent(13, "Enter")));
        view2.input.lastIOSEnter = 0;
      }
    }, 200);
  } else if (view2.someProp("handleKeyDown", (f) => f(view2, event)) || captureKeyDown(view2, event)) {
    event.preventDefault();
  } else {
    setSelectionOrigin(view2, "key");
  }
};
editHandlers.keyup = (view2, event) => {
  if (event.keyCode == 16)
    view2.input.shiftKey = false;
};
editHandlers.keypress = (view2, _event) => {
  let event = _event;
  if (inOrNearComposition(view2, event) || !event.charCode || event.ctrlKey && !event.altKey || mac$2 && event.metaKey)
    return;
  if (view2.someProp("handleKeyPress", (f) => f(view2, event))) {
    event.preventDefault();
    return;
  }
  let sel = view2.state.selection;
  if (!(sel instanceof TextSelection) || !sel.$from.sameParent(sel.$to)) {
    let text2 = String.fromCharCode(event.charCode);
    if (!/[\r\n]/.test(text2) && !view2.someProp("handleTextInput", (f) => f(view2, sel.$from.pos, sel.$to.pos, text2)))
      view2.dispatch(view2.state.tr.insertText(text2).scrollIntoView());
    event.preventDefault();
  }
};
function eventCoords(event) {
  return { left: event.clientX, top: event.clientY };
}
function isNear(event, click) {
  let dx = click.x - event.clientX, dy = click.y - event.clientY;
  return dx * dx + dy * dy < 100;
}
function runHandlerOnContext(view2, propName, pos, inside, event) {
  if (inside == -1)
    return false;
  let $pos = view2.state.doc.resolve(inside);
  for (let i = $pos.depth + 1; i > 0; i--) {
    if (view2.someProp(propName, (f) => i > $pos.depth ? f(view2, pos, $pos.nodeAfter, $pos.before(i), event, true) : f(view2, pos, $pos.node(i), $pos.before(i), event, false)))
      return true;
  }
  return false;
}
function updateSelection(view2, selection, origin) {
  if (!view2.focused)
    view2.focus();
  if (view2.state.selection.eq(selection))
    return;
  let tr = view2.state.tr.setSelection(selection);
  tr.setMeta("pointer", true);
  view2.dispatch(tr);
}
function selectClickedLeaf(view2, inside) {
  if (inside == -1)
    return false;
  let $pos = view2.state.doc.resolve(inside), node = $pos.nodeAfter;
  if (node && node.isAtom && NodeSelection.isSelectable(node)) {
    updateSelection(view2, new NodeSelection($pos));
    return true;
  }
  return false;
}
function selectClickedNode(view2, inside) {
  if (inside == -1)
    return false;
  let sel = view2.state.selection, selectedNode, selectAt;
  if (sel instanceof NodeSelection)
    selectedNode = sel.node;
  let $pos = view2.state.doc.resolve(inside);
  for (let i = $pos.depth + 1; i > 0; i--) {
    let node = i > $pos.depth ? $pos.nodeAfter : $pos.node(i);
    if (NodeSelection.isSelectable(node)) {
      if (selectedNode && sel.$from.depth > 0 && i >= sel.$from.depth && $pos.before(sel.$from.depth + 1) == sel.$from.pos)
        selectAt = $pos.before(sel.$from.depth);
      else
        selectAt = $pos.before(i);
      break;
    }
  }
  if (selectAt != null) {
    updateSelection(view2, NodeSelection.create(view2.state.doc, selectAt));
    return true;
  } else {
    return false;
  }
}
function handleSingleClick(view2, pos, inside, event, selectNode) {
  return runHandlerOnContext(view2, "handleClickOn", pos, inside, event) || view2.someProp("handleClick", (f) => f(view2, pos, event)) || (selectNode ? selectClickedNode(view2, inside) : selectClickedLeaf(view2, inside));
}
function handleDoubleClick(view2, pos, inside, event) {
  return runHandlerOnContext(view2, "handleDoubleClickOn", pos, inside, event) || view2.someProp("handleDoubleClick", (f) => f(view2, pos, event));
}
function handleTripleClick(view2, pos, inside, event) {
  return runHandlerOnContext(view2, "handleTripleClickOn", pos, inside, event) || view2.someProp("handleTripleClick", (f) => f(view2, pos, event)) || defaultTripleClick(view2, inside, event);
}
function defaultTripleClick(view2, inside, event) {
  if (event.button != 0)
    return false;
  let doc2 = view2.state.doc;
  if (inside == -1) {
    if (doc2.inlineContent) {
      updateSelection(view2, TextSelection.create(doc2, 0, doc2.content.size));
      return true;
    }
    return false;
  }
  let $pos = doc2.resolve(inside);
  for (let i = $pos.depth + 1; i > 0; i--) {
    let node = i > $pos.depth ? $pos.nodeAfter : $pos.node(i);
    let nodePos = $pos.before(i);
    if (node.inlineContent)
      updateSelection(view2, TextSelection.create(doc2, nodePos + 1, nodePos + 1 + node.content.size));
    else if (NodeSelection.isSelectable(node))
      updateSelection(view2, NodeSelection.create(doc2, nodePos));
    else
      continue;
    return true;
  }
}
function forceDOMFlush(view2) {
  return endComposition(view2);
}
const selectNodeModifier = mac$2 ? "metaKey" : "ctrlKey";
handlers.mousedown = (view2, _event) => {
  let event = _event;
  view2.input.shiftKey = event.shiftKey;
  let flushed = forceDOMFlush(view2);
  let now = Date.now(), type = "singleClick";
  if (now - view2.input.lastClick.time < 500 && isNear(event, view2.input.lastClick) && !event[selectNodeModifier]) {
    if (view2.input.lastClick.type == "singleClick")
      type = "doubleClick";
    else if (view2.input.lastClick.type == "doubleClick")
      type = "tripleClick";
  }
  view2.input.lastClick = { time: now, x: event.clientX, y: event.clientY, type };
  let pos = view2.posAtCoords(eventCoords(event));
  if (!pos)
    return;
  if (type == "singleClick") {
    if (view2.input.mouseDown)
      view2.input.mouseDown.done();
    view2.input.mouseDown = new MouseDown(view2, pos, event, !!flushed);
  } else if ((type == "doubleClick" ? handleDoubleClick : handleTripleClick)(view2, pos.pos, pos.inside, event)) {
    event.preventDefault();
  } else {
    setSelectionOrigin(view2, "pointer");
  }
};
class MouseDown {
  constructor(view2, pos, event, flushed) {
    this.view = view2;
    this.pos = pos;
    this.event = event;
    this.flushed = flushed;
    this.delayedSelectionSync = false;
    this.mightDrag = null;
    this.startDoc = view2.state.doc;
    this.selectNode = !!event[selectNodeModifier];
    this.allowDefault = event.shiftKey;
    let targetNode, targetPos;
    if (pos.inside > -1) {
      targetNode = view2.state.doc.nodeAt(pos.inside);
      targetPos = pos.inside;
    } else {
      let $pos = view2.state.doc.resolve(pos.pos);
      targetNode = $pos.parent;
      targetPos = $pos.depth ? $pos.before() : 0;
    }
    const target = flushed ? null : event.target;
    const targetDesc = target ? view2.docView.nearestDesc(target, true) : null;
    this.target = targetDesc && targetDesc.dom.nodeType == 1 ? targetDesc.dom : null;
    let { selection } = view2.state;
    if (event.button == 0 && targetNode.type.spec.draggable && targetNode.type.spec.selectable !== false || selection instanceof NodeSelection && selection.from <= targetPos && selection.to > targetPos)
      this.mightDrag = {
        node: targetNode,
        pos: targetPos,
        addAttr: !!(this.target && !this.target.draggable),
        setUneditable: !!(this.target && gecko && !this.target.hasAttribute("contentEditable"))
      };
    if (this.target && this.mightDrag && (this.mightDrag.addAttr || this.mightDrag.setUneditable)) {
      this.view.domObserver.stop();
      if (this.mightDrag.addAttr)
        this.target.draggable = true;
      if (this.mightDrag.setUneditable)
        setTimeout(() => {
          if (this.view.input.mouseDown == this)
            this.target.setAttribute("contentEditable", "false");
        }, 20);
      this.view.domObserver.start();
    }
    view2.root.addEventListener("mouseup", this.up = this.up.bind(this));
    view2.root.addEventListener("mousemove", this.move = this.move.bind(this));
    setSelectionOrigin(view2, "pointer");
  }
  done() {
    this.view.root.removeEventListener("mouseup", this.up);
    this.view.root.removeEventListener("mousemove", this.move);
    if (this.mightDrag && this.target) {
      this.view.domObserver.stop();
      if (this.mightDrag.addAttr)
        this.target.removeAttribute("draggable");
      if (this.mightDrag.setUneditable)
        this.target.removeAttribute("contentEditable");
      this.view.domObserver.start();
    }
    if (this.delayedSelectionSync)
      setTimeout(() => selectionToDOM(this.view));
    this.view.input.mouseDown = null;
  }
  up(event) {
    this.done();
    if (!this.view.dom.contains(event.target))
      return;
    let pos = this.pos;
    if (this.view.state.doc != this.startDoc)
      pos = this.view.posAtCoords(eventCoords(event));
    this.updateAllowDefault(event);
    if (this.allowDefault || !pos) {
      setSelectionOrigin(this.view, "pointer");
    } else if (handleSingleClick(this.view, pos.pos, pos.inside, event, this.selectNode)) {
      event.preventDefault();
    } else if (event.button == 0 && (this.flushed || // Safari ignores clicks on draggable elements
    safari && this.mightDrag && !this.mightDrag.node.isAtom || // Chrome will sometimes treat a node selection as a
    // cursor, but still report that the node is selected
    // when asked through getSelection. You'll then get a
    // situation where clicking at the point where that
    // (hidden) cursor is doesn't change the selection, and
    // thus doesn't get a reaction from ProseMirror. This
    // works around that.
    chrome && !this.view.state.selection.visible && Math.min(Math.abs(pos.pos - this.view.state.selection.from), Math.abs(pos.pos - this.view.state.selection.to)) <= 2)) {
      updateSelection(this.view, Selection.near(this.view.state.doc.resolve(pos.pos)));
      event.preventDefault();
    } else {
      setSelectionOrigin(this.view, "pointer");
    }
  }
  move(event) {
    this.updateAllowDefault(event);
    setSelectionOrigin(this.view, "pointer");
    if (event.buttons == 0)
      this.done();
  }
  updateAllowDefault(event) {
    if (!this.allowDefault && (Math.abs(this.event.x - event.clientX) > 4 || Math.abs(this.event.y - event.clientY) > 4))
      this.allowDefault = true;
  }
}
handlers.touchstart = (view2) => {
  view2.input.lastTouch = Date.now();
  forceDOMFlush(view2);
  setSelectionOrigin(view2, "pointer");
};
handlers.touchmove = (view2) => {
  view2.input.lastTouch = Date.now();
  setSelectionOrigin(view2, "pointer");
};
handlers.contextmenu = (view2) => forceDOMFlush(view2);
function inOrNearComposition(view2, event) {
  if (view2.composing)
    return true;
  if (safari && Math.abs(event.timeStamp - view2.input.compositionEndedAt) < 500) {
    view2.input.compositionEndedAt = -2e8;
    return true;
  }
  return false;
}
const timeoutComposition = android ? 5e3 : -1;
editHandlers.compositionstart = editHandlers.compositionupdate = (view2) => {
  if (!view2.composing) {
    view2.domObserver.flush();
    let { state: state2 } = view2, $pos = state2.selection.$to;
    if (state2.selection instanceof TextSelection && (state2.storedMarks || !$pos.textOffset && $pos.parentOffset && $pos.nodeBefore.marks.some((m) => m.type.spec.inclusive === false))) {
      view2.markCursor = view2.state.storedMarks || $pos.marks();
      endComposition(view2, true);
      view2.markCursor = null;
    } else {
      endComposition(view2, !state2.selection.empty);
      if (gecko && state2.selection.empty && $pos.parentOffset && !$pos.textOffset && $pos.nodeBefore.marks.length) {
        let sel = view2.domSelectionRange();
        for (let node = sel.focusNode, offset = sel.focusOffset; node && node.nodeType == 1 && offset != 0; ) {
          let before = offset < 0 ? node.lastChild : node.childNodes[offset - 1];
          if (!before)
            break;
          if (before.nodeType == 3) {
            let sel2 = view2.domSelection();
            if (sel2)
              sel2.collapse(before, before.nodeValue.length);
            break;
          } else {
            node = before;
            offset = -1;
          }
        }
      }
    }
    view2.input.composing = true;
  }
  scheduleComposeEnd(view2, timeoutComposition);
};
editHandlers.compositionend = (view2, event) => {
  if (view2.composing) {
    view2.input.composing = false;
    view2.input.compositionEndedAt = event.timeStamp;
    view2.input.compositionPendingChanges = view2.domObserver.pendingRecords().length ? view2.input.compositionID : 0;
    view2.input.compositionNode = null;
    if (view2.input.compositionPendingChanges)
      Promise.resolve().then(() => view2.domObserver.flush());
    view2.input.compositionID++;
    scheduleComposeEnd(view2, 20);
  }
};
function scheduleComposeEnd(view2, delay) {
  clearTimeout(view2.input.composingTimeout);
  if (delay > -1)
    view2.input.composingTimeout = setTimeout(() => endComposition(view2), delay);
}
function clearComposition(view2) {
  if (view2.composing) {
    view2.input.composing = false;
    view2.input.compositionEndedAt = timestampFromCustomEvent();
  }
  while (view2.input.compositionNodes.length > 0)
    view2.input.compositionNodes.pop().markParentsDirty();
}
function findCompositionNode(view2) {
  let sel = view2.domSelectionRange();
  if (!sel.focusNode)
    return null;
  let textBefore = textNodeBefore$1(sel.focusNode, sel.focusOffset);
  let textAfter = textNodeAfter$1(sel.focusNode, sel.focusOffset);
  if (textBefore && textAfter && textBefore != textAfter) {
    let descAfter = textAfter.pmViewDesc, lastChanged = view2.domObserver.lastChangedTextNode;
    if (textBefore == lastChanged || textAfter == lastChanged)
      return lastChanged;
    if (!descAfter || !descAfter.isText(textAfter.nodeValue)) {
      return textAfter;
    } else if (view2.input.compositionNode == textAfter) {
      let descBefore = textBefore.pmViewDesc;
      if (!(!descBefore || !descBefore.isText(textBefore.nodeValue)))
        return textAfter;
    }
  }
  return textBefore || textAfter;
}
function timestampFromCustomEvent() {
  let event = document.createEvent("Event");
  event.initEvent("event", true, true);
  return event.timeStamp;
}
function endComposition(view2, restarting = false) {
  if (android && view2.domObserver.flushingSoon >= 0)
    return;
  view2.domObserver.forceFlush();
  clearComposition(view2);
  if (restarting || view2.docView && view2.docView.dirty) {
    let sel = selectionFromDOM(view2);
    if (sel && !sel.eq(view2.state.selection))
      view2.dispatch(view2.state.tr.setSelection(sel));
    else if ((view2.markCursor || restarting) && !view2.state.selection.empty)
      view2.dispatch(view2.state.tr.deleteSelection());
    else
      view2.updateState(view2.state);
    return true;
  }
  return false;
}
function captureCopy(view2, dom) {
  if (!view2.dom.parentNode)
    return;
  let wrap2 = view2.dom.parentNode.appendChild(document.createElement("div"));
  wrap2.appendChild(dom);
  wrap2.style.cssText = "position: fixed; left: -10000px; top: 10px";
  let sel = getSelection(), range = document.createRange();
  range.selectNodeContents(dom);
  view2.dom.blur();
  sel.removeAllRanges();
  sel.addRange(range);
  setTimeout(() => {
    if (wrap2.parentNode)
      wrap2.parentNode.removeChild(wrap2);
    view2.focus();
  }, 50);
}
const brokenClipboardAPI = ie$1 && ie_version < 15 || ios && webkit_version < 604;
handlers.copy = editHandlers.cut = (view2, _event) => {
  let event = _event;
  let sel = view2.state.selection, cut = event.type == "cut";
  if (sel.empty)
    return;
  let data = brokenClipboardAPI ? null : event.clipboardData;
  let slice = sel.content(), { dom, text: text2 } = serializeForClipboard(view2, slice);
  if (data) {
    event.preventDefault();
    data.clearData();
    data.setData("text/html", dom.innerHTML);
    data.setData("text/plain", text2);
  } else {
    captureCopy(view2, dom);
  }
  if (cut)
    view2.dispatch(view2.state.tr.deleteSelection().scrollIntoView().setMeta("uiEvent", "cut"));
};
function sliceSingleNode(slice) {
  return slice.openStart == 0 && slice.openEnd == 0 && slice.content.childCount == 1 ? slice.content.firstChild : null;
}
function capturePaste(view2, event) {
  if (!view2.dom.parentNode)
    return;
  let plainText = view2.input.shiftKey || view2.state.selection.$from.parent.type.spec.code;
  let target = view2.dom.parentNode.appendChild(document.createElement(plainText ? "textarea" : "div"));
  if (!plainText)
    target.contentEditable = "true";
  target.style.cssText = "position: fixed; left: -10000px; top: 10px";
  target.focus();
  let plain = view2.input.shiftKey && view2.input.lastKeyCode != 45;
  setTimeout(() => {
    view2.focus();
    if (target.parentNode)
      target.parentNode.removeChild(target);
    if (plainText)
      doPaste(view2, target.value, null, plain, event);
    else
      doPaste(view2, target.textContent, target.innerHTML, plain, event);
  }, 50);
}
function doPaste(view2, text2, html2, preferPlain, event) {
  let slice = parseFromClipboard(view2, text2, html2, preferPlain, view2.state.selection.$from);
  if (view2.someProp("handlePaste", (f) => f(view2, event, slice || Slice.empty)))
    return true;
  if (!slice)
    return false;
  let singleNode = sliceSingleNode(slice);
  let tr = singleNode ? view2.state.tr.replaceSelectionWith(singleNode, preferPlain) : view2.state.tr.replaceSelection(slice);
  view2.dispatch(tr.scrollIntoView().setMeta("paste", true).setMeta("uiEvent", "paste"));
  return true;
}
function getText(clipboardData) {
  let text2 = clipboardData.getData("text/plain") || clipboardData.getData("Text");
  if (text2)
    return text2;
  let uris = clipboardData.getData("text/uri-list");
  return uris ? uris.replace(/\r?\n/g, " ") : "";
}
editHandlers.paste = (view2, _event) => {
  let event = _event;
  if (view2.composing && !android)
    return;
  let data = brokenClipboardAPI ? null : event.clipboardData;
  let plain = view2.input.shiftKey && view2.input.lastKeyCode != 45;
  if (data && doPaste(view2, getText(data), data.getData("text/html"), plain, event))
    event.preventDefault();
  else
    capturePaste(view2, event);
};
class Dragging {
  constructor(slice, move, node) {
    this.slice = slice;
    this.move = move;
    this.node = node;
  }
}
const dragCopyModifier = mac$2 ? "altKey" : "ctrlKey";
handlers.dragstart = (view2, _event) => {
  let event = _event;
  let mouseDown = view2.input.mouseDown;
  if (mouseDown)
    mouseDown.done();
  if (!event.dataTransfer)
    return;
  let sel = view2.state.selection;
  let pos = sel.empty ? null : view2.posAtCoords(eventCoords(event));
  let node;
  if (pos && pos.pos >= sel.from && pos.pos <= (sel instanceof NodeSelection ? sel.to - 1 : sel.to)) ;
  else if (mouseDown && mouseDown.mightDrag) {
    node = NodeSelection.create(view2.state.doc, mouseDown.mightDrag.pos);
  } else if (event.target && event.target.nodeType == 1) {
    let desc = view2.docView.nearestDesc(event.target, true);
    if (desc && desc.node.type.spec.draggable && desc != view2.docView)
      node = NodeSelection.create(view2.state.doc, desc.posBefore);
  }
  let draggedSlice = (node || view2.state.selection).content();
  let { dom, text: text2, slice } = serializeForClipboard(view2, draggedSlice);
  if (!event.dataTransfer.files.length || !chrome || chrome_version > 120)
    event.dataTransfer.clearData();
  event.dataTransfer.setData(brokenClipboardAPI ? "Text" : "text/html", dom.innerHTML);
  event.dataTransfer.effectAllowed = "copyMove";
  if (!brokenClipboardAPI)
    event.dataTransfer.setData("text/plain", text2);
  view2.dragging = new Dragging(slice, !event[dragCopyModifier], node);
};
handlers.dragend = (view2) => {
  let dragging = view2.dragging;
  window.setTimeout(() => {
    if (view2.dragging == dragging)
      view2.dragging = null;
  }, 50);
};
editHandlers.dragover = editHandlers.dragenter = (_, e) => e.preventDefault();
editHandlers.drop = (view2, _event) => {
  let event = _event;
  let dragging = view2.dragging;
  view2.dragging = null;
  if (!event.dataTransfer)
    return;
  let eventPos = view2.posAtCoords(eventCoords(event));
  if (!eventPos)
    return;
  let $mouse = view2.state.doc.resolve(eventPos.pos);
  let slice = dragging && dragging.slice;
  if (slice) {
    view2.someProp("transformPasted", (f) => {
      slice = f(slice, view2);
    });
  } else {
    slice = parseFromClipboard(view2, getText(event.dataTransfer), brokenClipboardAPI ? null : event.dataTransfer.getData("text/html"), false, $mouse);
  }
  let move = !!(dragging && !event[dragCopyModifier]);
  if (view2.someProp("handleDrop", (f) => f(view2, event, slice || Slice.empty, move))) {
    event.preventDefault();
    return;
  }
  if (!slice)
    return;
  event.preventDefault();
  let insertPos = slice ? dropPoint(view2.state.doc, $mouse.pos, slice) : $mouse.pos;
  if (insertPos == null)
    insertPos = $mouse.pos;
  let tr = view2.state.tr;
  if (move) {
    let { node } = dragging;
    if (node)
      node.replace(tr);
    else
      tr.deleteSelection();
  }
  let pos = tr.mapping.map(insertPos);
  let isNode = slice.openStart == 0 && slice.openEnd == 0 && slice.content.childCount == 1;
  let beforeInsert = tr.doc;
  if (isNode)
    tr.replaceRangeWith(pos, pos, slice.content.firstChild);
  else
    tr.replaceRange(pos, pos, slice);
  if (tr.doc.eq(beforeInsert))
    return;
  let $pos = tr.doc.resolve(pos);
  if (isNode && NodeSelection.isSelectable(slice.content.firstChild) && $pos.nodeAfter && $pos.nodeAfter.sameMarkup(slice.content.firstChild)) {
    tr.setSelection(new NodeSelection($pos));
  } else {
    let end = tr.mapping.map(insertPos);
    tr.mapping.maps[tr.mapping.maps.length - 1].forEach((_from, _to, _newFrom, newTo) => end = newTo);
    tr.setSelection(selectionBetween(view2, $pos, tr.doc.resolve(end)));
  }
  view2.focus();
  view2.dispatch(tr.setMeta("uiEvent", "drop"));
};
handlers.focus = (view2) => {
  view2.input.lastFocus = Date.now();
  if (!view2.focused) {
    view2.domObserver.stop();
    view2.dom.classList.add("ProseMirror-focused");
    view2.domObserver.start();
    view2.focused = true;
    setTimeout(() => {
      if (view2.docView && view2.hasFocus() && !view2.domObserver.currentSelection.eq(view2.domSelectionRange()))
        selectionToDOM(view2);
    }, 20);
  }
};
handlers.blur = (view2, _event) => {
  let event = _event;
  if (view2.focused) {
    view2.domObserver.stop();
    view2.dom.classList.remove("ProseMirror-focused");
    view2.domObserver.start();
    if (event.relatedTarget && view2.dom.contains(event.relatedTarget))
      view2.domObserver.currentSelection.clear();
    view2.focused = false;
  }
};
handlers.beforeinput = (view2, _event) => {
  let event = _event;
  if (chrome && android && event.inputType == "deleteContentBackward") {
    view2.domObserver.flushSoon();
    let { domChangeCount } = view2.input;
    setTimeout(() => {
      if (view2.input.domChangeCount != domChangeCount)
        return;
      view2.dom.blur();
      view2.focus();
      if (view2.someProp("handleKeyDown", (f) => f(view2, keyEvent(8, "Backspace"))))
        return;
      let { $cursor } = view2.state.selection;
      if ($cursor && $cursor.pos > 0)
        view2.dispatch(view2.state.tr.delete($cursor.pos - 1, $cursor.pos).scrollIntoView());
    }, 50);
  }
};
for (let prop in editHandlers)
  handlers[prop] = editHandlers[prop];
function compareObjs(a, b) {
  if (a == b)
    return true;
  for (let p in a)
    if (a[p] !== b[p])
      return false;
  for (let p in b)
    if (!(p in a))
      return false;
  return true;
}
class WidgetType {
  constructor(toDOM, spec) {
    this.toDOM = toDOM;
    this.spec = spec || noSpec;
    this.side = this.spec.side || 0;
  }
  map(mapping, span, offset, oldOffset) {
    let { pos, deleted: deleted2 } = mapping.mapResult(span.from + oldOffset, this.side < 0 ? -1 : 1);
    return deleted2 ? null : new Decoration(pos - offset, pos - offset, this);
  }
  valid() {
    return true;
  }
  eq(other) {
    return this == other || other instanceof WidgetType && (this.spec.key && this.spec.key == other.spec.key || this.toDOM == other.toDOM && compareObjs(this.spec, other.spec));
  }
  destroy(node) {
    if (this.spec.destroy)
      this.spec.destroy(node);
  }
}
class InlineType {
  constructor(attrs, spec) {
    this.attrs = attrs;
    this.spec = spec || noSpec;
  }
  map(mapping, span, offset, oldOffset) {
    let from = mapping.map(span.from + oldOffset, this.spec.inclusiveStart ? -1 : 1) - offset;
    let to = mapping.map(span.to + oldOffset, this.spec.inclusiveEnd ? 1 : -1) - offset;
    return from >= to ? null : new Decoration(from, to, this);
  }
  valid(_, span) {
    return span.from < span.to;
  }
  eq(other) {
    return this == other || other instanceof InlineType && compareObjs(this.attrs, other.attrs) && compareObjs(this.spec, other.spec);
  }
  static is(span) {
    return span.type instanceof InlineType;
  }
  destroy() {
  }
}
class NodeType2 {
  constructor(attrs, spec) {
    this.attrs = attrs;
    this.spec = spec || noSpec;
  }
  map(mapping, span, offset, oldOffset) {
    let from = mapping.mapResult(span.from + oldOffset, 1);
    if (from.deleted)
      return null;
    let to = mapping.mapResult(span.to + oldOffset, -1);
    if (to.deleted || to.pos <= from.pos)
      return null;
    return new Decoration(from.pos - offset, to.pos - offset, this);
  }
  valid(node, span) {
    let { index, offset } = node.content.findIndex(span.from), child;
    return offset == span.from && !(child = node.child(index)).isText && offset + child.nodeSize == span.to;
  }
  eq(other) {
    return this == other || other instanceof NodeType2 && compareObjs(this.attrs, other.attrs) && compareObjs(this.spec, other.spec);
  }
  destroy() {
  }
}
class Decoration {
  /**
  @internal
  */
  constructor(from, to, type) {
    this.from = from;
    this.to = to;
    this.type = type;
  }
  /**
  @internal
  */
  copy(from, to) {
    return new Decoration(from, to, this.type);
  }
  /**
  @internal
  */
  eq(other, offset = 0) {
    return this.type.eq(other.type) && this.from + offset == other.from && this.to + offset == other.to;
  }
  /**
  @internal
  */
  map(mapping, offset, oldOffset) {
    return this.type.map(mapping, this, offset, oldOffset);
  }
  /**
  Creates a widget decoration, which is a DOM node that's shown in
  the document at the given position. It is recommended that you
  delay rendering the widget by passing a function that will be
  called when the widget is actually drawn in a view, but you can
  also directly pass a DOM node. `getPos` can be used to find the
  widget's current document position.
  */
  static widget(pos, toDOM, spec) {
    return new Decoration(pos, pos, new WidgetType(toDOM, spec));
  }
  /**
  Creates an inline decoration, which adds the given attributes to
  each inline node between `from` and `to`.
  */
  static inline(from, to, attrs, spec) {
    return new Decoration(from, to, new InlineType(attrs, spec));
  }
  /**
  Creates a node decoration. `from` and `to` should point precisely
  before and after a node in the document. That node, and only that
  node, will receive the given attributes.
  */
  static node(from, to, attrs, spec) {
    return new Decoration(from, to, new NodeType2(attrs, spec));
  }
  /**
  The spec provided when creating this decoration. Can be useful
  if you've stored extra information in that object.
  */
  get spec() {
    return this.type.spec;
  }
  /**
  @internal
  */
  get inline() {
    return this.type instanceof InlineType;
  }
  /**
  @internal
  */
  get widget() {
    return this.type instanceof WidgetType;
  }
}
const none = [], noSpec = {};
class DecorationSet {
  /**
  @internal
  */
  constructor(local, children2) {
    this.local = local.length ? local : none;
    this.children = children2.length ? children2 : none;
  }
  /**
  Create a set of decorations, using the structure of the given
  document. This will consume (modify) the `decorations` array, so
  you must make a copy if you want need to preserve that.
  */
  static create(doc2, decorations) {
    return decorations.length ? buildTree(decorations, doc2, 0, noSpec) : empty$1;
  }
  /**
  Find all decorations in this set which touch the given range
  (including decorations that start or end directly at the
  boundaries) and match the given predicate on their spec. When
  `start` and `end` are omitted, all decorations in the set are
  considered. When `predicate` isn't given, all decorations are
  assumed to match.
  */
  find(start, end, predicate) {
    let result = [];
    this.findInner(start == null ? 0 : start, end == null ? 1e9 : end, result, 0, predicate);
    return result;
  }
  findInner(start, end, result, offset, predicate) {
    for (let i = 0; i < this.local.length; i++) {
      let span = this.local[i];
      if (span.from <= end && span.to >= start && (!predicate || predicate(span.spec)))
        result.push(span.copy(span.from + offset, span.to + offset));
    }
    for (let i = 0; i < this.children.length; i += 3) {
      if (this.children[i] < end && this.children[i + 1] > start) {
        let childOff = this.children[i] + 1;
        this.children[i + 2].findInner(start - childOff, end - childOff, result, offset + childOff, predicate);
      }
    }
  }
  /**
  Map the set of decorations in response to a change in the
  document.
  */
  map(mapping, doc2, options) {
    if (this == empty$1 || mapping.maps.length == 0)
      return this;
    return this.mapInner(mapping, doc2, 0, 0, options || noSpec);
  }
  /**
  @internal
  */
  mapInner(mapping, node, offset, oldOffset, options) {
    let newLocal;
    for (let i = 0; i < this.local.length; i++) {
      let mapped = this.local[i].map(mapping, offset, oldOffset);
      if (mapped && mapped.type.valid(node, mapped))
        (newLocal || (newLocal = [])).push(mapped);
      else if (options.onRemove)
        options.onRemove(this.local[i].spec);
    }
    if (this.children.length)
      return mapChildren(this.children, newLocal || [], mapping, node, offset, oldOffset, options);
    else
      return newLocal ? new DecorationSet(newLocal.sort(byPos), none) : empty$1;
  }
  /**
  Add the given array of decorations to the ones in the set,
  producing a new set. Consumes the `decorations` array. Needs
  access to the current document to create the appropriate tree
  structure.
  */
  add(doc2, decorations) {
    if (!decorations.length)
      return this;
    if (this == empty$1)
      return DecorationSet.create(doc2, decorations);
    return this.addInner(doc2, decorations, 0);
  }
  addInner(doc2, decorations, offset) {
    let children2, childIndex = 0;
    doc2.forEach((childNode, childOffset) => {
      let baseOffset = childOffset + offset, found2;
      if (!(found2 = takeSpansForNode(decorations, childNode, baseOffset)))
        return;
      if (!children2)
        children2 = this.children.slice();
      while (childIndex < children2.length && children2[childIndex] < childOffset)
        childIndex += 3;
      if (children2[childIndex] == childOffset)
        children2[childIndex + 2] = children2[childIndex + 2].addInner(childNode, found2, baseOffset + 1);
      else
        children2.splice(childIndex, 0, childOffset, childOffset + childNode.nodeSize, buildTree(found2, childNode, baseOffset + 1, noSpec));
      childIndex += 3;
    });
    let local = moveSpans(childIndex ? withoutNulls(decorations) : decorations, -offset);
    for (let i = 0; i < local.length; i++)
      if (!local[i].type.valid(doc2, local[i]))
        local.splice(i--, 1);
    return new DecorationSet(local.length ? this.local.concat(local).sort(byPos) : this.local, children2 || this.children);
  }
  /**
  Create a new set that contains the decorations in this set, minus
  the ones in the given array.
  */
  remove(decorations) {
    if (decorations.length == 0 || this == empty$1)
      return this;
    return this.removeInner(decorations, 0);
  }
  removeInner(decorations, offset) {
    let children2 = this.children, local = this.local;
    for (let i = 0; i < children2.length; i += 3) {
      let found2;
      let from = children2[i] + offset, to = children2[i + 1] + offset;
      for (let j = 0, span; j < decorations.length; j++)
        if (span = decorations[j]) {
          if (span.from > from && span.to < to) {
            decorations[j] = null;
            (found2 || (found2 = [])).push(span);
          }
        }
      if (!found2)
        continue;
      if (children2 == this.children)
        children2 = this.children.slice();
      let removed = children2[i + 2].removeInner(found2, from + 1);
      if (removed != empty$1) {
        children2[i + 2] = removed;
      } else {
        children2.splice(i, 3);
        i -= 3;
      }
    }
    if (local.length) {
      for (let i = 0, span; i < decorations.length; i++)
        if (span = decorations[i]) {
          for (let j = 0; j < local.length; j++)
            if (local[j].eq(span, offset)) {
              if (local == this.local)
                local = this.local.slice();
              local.splice(j--, 1);
            }
        }
    }
    if (children2 == this.children && local == this.local)
      return this;
    return local.length || children2.length ? new DecorationSet(local, children2) : empty$1;
  }
  forChild(offset, node) {
    if (this == empty$1)
      return this;
    if (node.isLeaf)
      return DecorationSet.empty;
    let child, local;
    for (let i = 0; i < this.children.length; i += 3)
      if (this.children[i] >= offset) {
        if (this.children[i] == offset)
          child = this.children[i + 2];
        break;
      }
    let start = offset + 1, end = start + node.content.size;
    for (let i = 0; i < this.local.length; i++) {
      let dec = this.local[i];
      if (dec.from < end && dec.to > start && dec.type instanceof InlineType) {
        let from = Math.max(start, dec.from) - start, to = Math.min(end, dec.to) - start;
        if (from < to)
          (local || (local = [])).push(dec.copy(from, to));
      }
    }
    if (local) {
      let localSet = new DecorationSet(local.sort(byPos), none);
      return child ? new DecorationGroup([localSet, child]) : localSet;
    }
    return child || empty$1;
  }
  /**
  @internal
  */
  eq(other) {
    if (this == other)
      return true;
    if (!(other instanceof DecorationSet) || this.local.length != other.local.length || this.children.length != other.children.length)
      return false;
    for (let i = 0; i < this.local.length; i++)
      if (!this.local[i].eq(other.local[i]))
        return false;
    for (let i = 0; i < this.children.length; i += 3)
      if (this.children[i] != other.children[i] || this.children[i + 1] != other.children[i + 1] || !this.children[i + 2].eq(other.children[i + 2]))
        return false;
    return true;
  }
  /**
  @internal
  */
  locals(node) {
    return removeOverlap(this.localsInner(node));
  }
  /**
  @internal
  */
  localsInner(node) {
    if (this == empty$1)
      return none;
    if (node.inlineContent || !this.local.some(InlineType.is))
      return this.local;
    let result = [];
    for (let i = 0; i < this.local.length; i++) {
      if (!(this.local[i].type instanceof InlineType))
        result.push(this.local[i]);
    }
    return result;
  }
  forEachSet(f) {
    f(this);
  }
}
DecorationSet.empty = new DecorationSet([], []);
DecorationSet.removeOverlap = removeOverlap;
const empty$1 = DecorationSet.empty;
class DecorationGroup {
  constructor(members) {
    this.members = members;
  }
  map(mapping, doc2) {
    const mappedDecos = this.members.map((member) => member.map(mapping, doc2, noSpec));
    return DecorationGroup.from(mappedDecos);
  }
  forChild(offset, child) {
    if (child.isLeaf)
      return DecorationSet.empty;
    let found2 = [];
    for (let i = 0; i < this.members.length; i++) {
      let result = this.members[i].forChild(offset, child);
      if (result == empty$1)
        continue;
      if (result instanceof DecorationGroup)
        found2 = found2.concat(result.members);
      else
        found2.push(result);
    }
    return DecorationGroup.from(found2);
  }
  eq(other) {
    if (!(other instanceof DecorationGroup) || other.members.length != this.members.length)
      return false;
    for (let i = 0; i < this.members.length; i++)
      if (!this.members[i].eq(other.members[i]))
        return false;
    return true;
  }
  locals(node) {
    let result, sorted = true;
    for (let i = 0; i < this.members.length; i++) {
      let locals = this.members[i].localsInner(node);
      if (!locals.length)
        continue;
      if (!result) {
        result = locals;
      } else {
        if (sorted) {
          result = result.slice();
          sorted = false;
        }
        for (let j = 0; j < locals.length; j++)
          result.push(locals[j]);
      }
    }
    return result ? removeOverlap(sorted ? result : result.sort(byPos)) : none;
  }
  // Create a group for the given array of decoration sets, or return
  // a single set when possible.
  static from(members) {
    switch (members.length) {
      case 0:
        return empty$1;
      case 1:
        return members[0];
      default:
        return new DecorationGroup(members.every((m) => m instanceof DecorationSet) ? members : members.reduce((r, m) => r.concat(m instanceof DecorationSet ? m : m.members), []));
    }
  }
  forEachSet(f) {
    for (let i = 0; i < this.members.length; i++)
      this.members[i].forEachSet(f);
  }
}
function mapChildren(oldChildren, newLocal, mapping, node, offset, oldOffset, options) {
  let children2 = oldChildren.slice();
  for (let i = 0, baseOffset = oldOffset; i < mapping.maps.length; i++) {
    let moved2 = 0;
    mapping.maps[i].forEach((oldStart, oldEnd, newStart, newEnd) => {
      let dSize = newEnd - newStart - (oldEnd - oldStart);
      for (let i2 = 0; i2 < children2.length; i2 += 3) {
        let end = children2[i2 + 1];
        if (end < 0 || oldStart > end + baseOffset - moved2)
          continue;
        let start = children2[i2] + baseOffset - moved2;
        if (oldEnd >= start) {
          children2[i2 + 1] = oldStart <= start ? -2 : -1;
        } else if (oldStart >= baseOffset && dSize) {
          children2[i2] += dSize;
          children2[i2 + 1] += dSize;
        }
      }
      moved2 += dSize;
    });
    baseOffset = mapping.maps[i].map(baseOffset, -1);
  }
  let mustRebuild = false;
  for (let i = 0; i < children2.length; i += 3)
    if (children2[i + 1] < 0) {
      if (children2[i + 1] == -2) {
        mustRebuild = true;
        children2[i + 1] = -1;
        continue;
      }
      let from = mapping.map(oldChildren[i] + oldOffset), fromLocal = from - offset;
      if (fromLocal < 0 || fromLocal >= node.content.size) {
        mustRebuild = true;
        continue;
      }
      let to = mapping.map(oldChildren[i + 1] + oldOffset, -1), toLocal = to - offset;
      let { index, offset: childOffset } = node.content.findIndex(fromLocal);
      let childNode = node.maybeChild(index);
      if (childNode && childOffset == fromLocal && childOffset + childNode.nodeSize == toLocal) {
        let mapped = children2[i + 2].mapInner(mapping, childNode, from + 1, oldChildren[i] + oldOffset + 1, options);
        if (mapped != empty$1) {
          children2[i] = fromLocal;
          children2[i + 1] = toLocal;
          children2[i + 2] = mapped;
        } else {
          children2[i + 1] = -2;
          mustRebuild = true;
        }
      } else {
        mustRebuild = true;
      }
    }
  if (mustRebuild) {
    let decorations = mapAndGatherRemainingDecorations(children2, oldChildren, newLocal, mapping, offset, oldOffset, options);
    let built = buildTree(decorations, node, 0, options);
    newLocal = built.local;
    for (let i = 0; i < children2.length; i += 3)
      if (children2[i + 1] < 0) {
        children2.splice(i, 3);
        i -= 3;
      }
    for (let i = 0, j = 0; i < built.children.length; i += 3) {
      let from = built.children[i];
      while (j < children2.length && children2[j] < from)
        j += 3;
      children2.splice(j, 0, built.children[i], built.children[i + 1], built.children[i + 2]);
    }
  }
  return new DecorationSet(newLocal.sort(byPos), children2);
}
function moveSpans(spans, offset) {
  if (!offset || !spans.length)
    return spans;
  let result = [];
  for (let i = 0; i < spans.length; i++) {
    let span = spans[i];
    result.push(new Decoration(span.from + offset, span.to + offset, span.type));
  }
  return result;
}
function mapAndGatherRemainingDecorations(children2, oldChildren, decorations, mapping, offset, oldOffset, options) {
  function gather(set, oldOffset2) {
    for (let i = 0; i < set.local.length; i++) {
      let mapped = set.local[i].map(mapping, offset, oldOffset2);
      if (mapped)
        decorations.push(mapped);
      else if (options.onRemove)
        options.onRemove(set.local[i].spec);
    }
    for (let i = 0; i < set.children.length; i += 3)
      gather(set.children[i + 2], set.children[i] + oldOffset2 + 1);
  }
  for (let i = 0; i < children2.length; i += 3)
    if (children2[i + 1] == -1)
      gather(children2[i + 2], oldChildren[i] + oldOffset + 1);
  return decorations;
}
function takeSpansForNode(spans, node, offset) {
  if (node.isLeaf)
    return null;
  let end = offset + node.nodeSize, found2 = null;
  for (let i = 0, span; i < spans.length; i++) {
    if ((span = spans[i]) && span.from > offset && span.to < end) {
      (found2 || (found2 = [])).push(span);
      spans[i] = null;
    }
  }
  return found2;
}
function withoutNulls(array) {
  let result = [];
  for (let i = 0; i < array.length; i++)
    if (array[i] != null)
      result.push(array[i]);
  return result;
}
function buildTree(spans, node, offset, options) {
  let children2 = [], hasNulls = false;
  node.forEach((childNode, localStart) => {
    let found2 = takeSpansForNode(spans, childNode, localStart + offset);
    if (found2) {
      hasNulls = true;
      let subtree = buildTree(found2, childNode, offset + localStart + 1, options);
      if (subtree != empty$1)
        children2.push(localStart, localStart + childNode.nodeSize, subtree);
    }
  });
  let locals = moveSpans(hasNulls ? withoutNulls(spans) : spans, -offset).sort(byPos);
  for (let i = 0; i < locals.length; i++)
    if (!locals[i].type.valid(node, locals[i])) {
      if (options.onRemove)
        options.onRemove(locals[i].spec);
      locals.splice(i--, 1);
    }
  return locals.length || children2.length ? new DecorationSet(locals, children2) : empty$1;
}
function byPos(a, b) {
  return a.from - b.from || a.to - b.to;
}
function removeOverlap(spans) {
  let working = spans;
  for (let i = 0; i < working.length - 1; i++) {
    let span = working[i];
    if (span.from != span.to)
      for (let j = i + 1; j < working.length; j++) {
        let next = working[j];
        if (next.from == span.from) {
          if (next.to != span.to) {
            if (working == spans)
              working = spans.slice();
            working[j] = next.copy(next.from, span.to);
            insertAhead(working, j + 1, next.copy(span.to, next.to));
          }
          continue;
        } else {
          if (next.from < span.to) {
            if (working == spans)
              working = spans.slice();
            working[i] = span.copy(span.from, next.from);
            insertAhead(working, j, span.copy(next.from, span.to));
          }
          break;
        }
      }
  }
  return working;
}
function insertAhead(array, i, deco) {
  while (i < array.length && byPos(deco, array[i]) > 0)
    i++;
  array.splice(i, 0, deco);
}
function viewDecorations(view2) {
  let found2 = [];
  view2.someProp("decorations", (f) => {
    let result = f(view2.state);
    if (result && result != empty$1)
      found2.push(result);
  });
  if (view2.cursorWrapper)
    found2.push(DecorationSet.create(view2.state.doc, [view2.cursorWrapper.deco]));
  return DecorationGroup.from(found2);
}
const observeOptions = {
  childList: true,
  characterData: true,
  characterDataOldValue: true,
  attributes: true,
  attributeOldValue: true,
  subtree: true
};
const useCharData = ie$1 && ie_version <= 11;
class SelectionState {
  constructor() {
    this.anchorNode = null;
    this.anchorOffset = 0;
    this.focusNode = null;
    this.focusOffset = 0;
  }
  set(sel) {
    this.anchorNode = sel.anchorNode;
    this.anchorOffset = sel.anchorOffset;
    this.focusNode = sel.focusNode;
    this.focusOffset = sel.focusOffset;
  }
  clear() {
    this.anchorNode = this.focusNode = null;
  }
  eq(sel) {
    return sel.anchorNode == this.anchorNode && sel.anchorOffset == this.anchorOffset && sel.focusNode == this.focusNode && sel.focusOffset == this.focusOffset;
  }
}
class DOMObserver {
  constructor(view2, handleDOMChange) {
    this.view = view2;
    this.handleDOMChange = handleDOMChange;
    this.queue = [];
    this.flushingSoon = -1;
    this.observer = null;
    this.currentSelection = new SelectionState();
    this.onCharData = null;
    this.suppressingSelectionUpdates = false;
    this.lastChangedTextNode = null;
    this.observer = window.MutationObserver && new window.MutationObserver((mutations) => {
      for (let i = 0; i < mutations.length; i++)
        this.queue.push(mutations[i]);
      if (ie$1 && ie_version <= 11 && mutations.some((m) => m.type == "childList" && m.removedNodes.length || m.type == "characterData" && m.oldValue.length > m.target.nodeValue.length))
        this.flushSoon();
      else
        this.flush();
    });
    if (useCharData) {
      this.onCharData = (e) => {
        this.queue.push({ target: e.target, type: "characterData", oldValue: e.prevValue });
        this.flushSoon();
      };
    }
    this.onSelectionChange = this.onSelectionChange.bind(this);
  }
  flushSoon() {
    if (this.flushingSoon < 0)
      this.flushingSoon = window.setTimeout(() => {
        this.flushingSoon = -1;
        this.flush();
      }, 20);
  }
  forceFlush() {
    if (this.flushingSoon > -1) {
      window.clearTimeout(this.flushingSoon);
      this.flushingSoon = -1;
      this.flush();
    }
  }
  start() {
    if (this.observer) {
      this.observer.takeRecords();
      this.observer.observe(this.view.dom, observeOptions);
    }
    if (this.onCharData)
      this.view.dom.addEventListener("DOMCharacterDataModified", this.onCharData);
    this.connectSelection();
  }
  stop() {
    if (this.observer) {
      let take = this.observer.takeRecords();
      if (take.length) {
        for (let i = 0; i < take.length; i++)
          this.queue.push(take[i]);
        window.setTimeout(() => this.flush(), 20);
      }
      this.observer.disconnect();
    }
    if (this.onCharData)
      this.view.dom.removeEventListener("DOMCharacterDataModified", this.onCharData);
    this.disconnectSelection();
  }
  connectSelection() {
    this.view.dom.ownerDocument.addEventListener("selectionchange", this.onSelectionChange);
  }
  disconnectSelection() {
    this.view.dom.ownerDocument.removeEventListener("selectionchange", this.onSelectionChange);
  }
  suppressSelectionUpdates() {
    this.suppressingSelectionUpdates = true;
    setTimeout(() => this.suppressingSelectionUpdates = false, 50);
  }
  onSelectionChange() {
    if (!hasFocusAndSelection(this.view))
      return;
    if (this.suppressingSelectionUpdates)
      return selectionToDOM(this.view);
    if (ie$1 && ie_version <= 11 && !this.view.state.selection.empty) {
      let sel = this.view.domSelectionRange();
      if (sel.focusNode && isEquivalentPosition(sel.focusNode, sel.focusOffset, sel.anchorNode, sel.anchorOffset))
        return this.flushSoon();
    }
    this.flush();
  }
  setCurSelection() {
    this.currentSelection.set(this.view.domSelectionRange());
  }
  ignoreSelectionChange(sel) {
    if (!sel.focusNode)
      return true;
    let ancestors = /* @__PURE__ */ new Set(), container;
    for (let scan = sel.focusNode; scan; scan = parentNode(scan))
      ancestors.add(scan);
    for (let scan = sel.anchorNode; scan; scan = parentNode(scan))
      if (ancestors.has(scan)) {
        container = scan;
        break;
      }
    let desc = container && this.view.docView.nearestDesc(container);
    if (desc && desc.ignoreMutation({
      type: "selection",
      target: container.nodeType == 3 ? container.parentNode : container
    })) {
      this.setCurSelection();
      return true;
    }
  }
  pendingRecords() {
    if (this.observer)
      for (let mut of this.observer.takeRecords())
        this.queue.push(mut);
    return this.queue;
  }
  selectionChanged(sel) {
    return !this.suppressingSelectionUpdates && !this.currentSelection.eq(sel) && hasFocusAndSelection(this.view) && !this.ignoreSelectionChange(sel);
  }
  flush() {
    let { view: view2 } = this;
    if (!view2.docView || this.flushingSoon > -1)
      return;
    let mutations = this.pendingRecords();
    if (mutations.length)
      this.queue = [];
    let sel = view2.domSelectionRange(), newSel = this.selectionChanged(sel);
    let from = -1, to = -1, typeOver = false, added2 = [];
    if (view2.editable) {
      for (let i = 0; i < mutations.length; i++) {
        let result = this.registerMutation(mutations[i], added2);
        if (result) {
          from = from < 0 ? result.from : Math.min(result.from, from);
          to = to < 0 ? result.to : Math.max(result.to, to);
          if (result.typeOver)
            typeOver = true;
        }
      }
    }
    if (gecko && added2.length) {
      let brs = added2.filter((n) => n.nodeName == "BR");
      if (brs.length == 2) {
        let [a, b] = brs;
        if (a.parentNode && a.parentNode.parentNode == b.parentNode)
          b.remove();
        else
          a.remove();
      } else {
        let { focusNode } = this.currentSelection;
        for (let br of brs) {
          let parent = br.parentNode;
          if (parent && parent.nodeName == "LI" && (!focusNode || blockParent(view2, focusNode) != parent))
            br.remove();
        }
      }
    }
    let readSel = null;
    if (from < 0 && newSel && view2.input.lastFocus > Date.now() - 200 && Math.max(view2.input.lastTouch, view2.input.lastClick.time) < Date.now() - 300 && selectionCollapsed(sel) && (readSel = selectionFromDOM(view2)) && readSel.eq(Selection.near(view2.state.doc.resolve(0), 1))) {
      view2.input.lastFocus = 0;
      selectionToDOM(view2);
      this.currentSelection.set(sel);
      view2.scrollToSelection();
    } else if (from > -1 || newSel) {
      if (from > -1) {
        view2.docView.markDirty(from, to);
        checkCSS(view2);
      }
      this.handleDOMChange(from, to, typeOver, added2);
      if (view2.docView && view2.docView.dirty)
        view2.updateState(view2.state);
      else if (!this.currentSelection.eq(sel))
        selectionToDOM(view2);
      this.currentSelection.set(sel);
    }
  }
  registerMutation(mut, added2) {
    if (added2.indexOf(mut.target) > -1)
      return null;
    let desc = this.view.docView.nearestDesc(mut.target);
    if (mut.type == "attributes" && (desc == this.view.docView || mut.attributeName == "contenteditable" || // Firefox sometimes fires spurious events for null/empty styles
    mut.attributeName == "style" && !mut.oldValue && !mut.target.getAttribute("style")))
      return null;
    if (!desc || desc.ignoreMutation(mut))
      return null;
    if (mut.type == "childList") {
      for (let i = 0; i < mut.addedNodes.length; i++) {
        let node = mut.addedNodes[i];
        added2.push(node);
        if (node.nodeType == 3)
          this.lastChangedTextNode = node;
      }
      if (desc.contentDOM && desc.contentDOM != desc.dom && !desc.contentDOM.contains(mut.target))
        return { from: desc.posBefore, to: desc.posAfter };
      let prev = mut.previousSibling, next = mut.nextSibling;
      if (ie$1 && ie_version <= 11 && mut.addedNodes.length) {
        for (let i = 0; i < mut.addedNodes.length; i++) {
          let { previousSibling, nextSibling } = mut.addedNodes[i];
          if (!previousSibling || Array.prototype.indexOf.call(mut.addedNodes, previousSibling) < 0)
            prev = previousSibling;
          if (!nextSibling || Array.prototype.indexOf.call(mut.addedNodes, nextSibling) < 0)
            next = nextSibling;
        }
      }
      let fromOffset = prev && prev.parentNode == mut.target ? domIndex(prev) + 1 : 0;
      let from = desc.localPosFromDOM(mut.target, fromOffset, -1);
      let toOffset = next && next.parentNode == mut.target ? domIndex(next) : mut.target.childNodes.length;
      let to = desc.localPosFromDOM(mut.target, toOffset, 1);
      return { from, to };
    } else if (mut.type == "attributes") {
      return { from: desc.posAtStart - desc.border, to: desc.posAtEnd + desc.border };
    } else {
      this.lastChangedTextNode = mut.target;
      return {
        from: desc.posAtStart,
        to: desc.posAtEnd,
        // An event was generated for a text change that didn't change
        // any text. Mark the dom change to fall back to assuming the
        // selection was typed over with an identical value if it can't
        // find another change.
        typeOver: mut.target.nodeValue == mut.oldValue
      };
    }
  }
}
let cssChecked = /* @__PURE__ */ new WeakMap();
let cssCheckWarned = false;
function checkCSS(view2) {
  if (cssChecked.has(view2))
    return;
  cssChecked.set(view2, null);
  if (["normal", "nowrap", "pre-line"].indexOf(getComputedStyle(view2.dom).whiteSpace) !== -1) {
    view2.requiresGeckoHackNode = gecko;
    if (cssCheckWarned)
      return;
    console["warn"]("ProseMirror expects the CSS white-space property to be set, preferably to 'pre-wrap'. It is recommended to load style/prosemirror.css from the prosemirror-view package.");
    cssCheckWarned = true;
  }
}
function rangeToSelectionRange(view2, range) {
  let anchorNode = range.startContainer, anchorOffset = range.startOffset;
  let focusNode = range.endContainer, focusOffset = range.endOffset;
  let currentAnchor = view2.domAtPos(view2.state.selection.anchor);
  if (isEquivalentPosition(currentAnchor.node, currentAnchor.offset, focusNode, focusOffset))
    [anchorNode, anchorOffset, focusNode, focusOffset] = [focusNode, focusOffset, anchorNode, anchorOffset];
  return { anchorNode, anchorOffset, focusNode, focusOffset };
}
function safariShadowSelectionRange(view2, selection) {
  if (selection.getComposedRanges) {
    let range = selection.getComposedRanges(view2.root)[0];
    if (range)
      return rangeToSelectionRange(view2, range);
  }
  let found2;
  function read(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    found2 = event.getTargetRanges()[0];
  }
  view2.dom.addEventListener("beforeinput", read, true);
  document.execCommand("indent");
  view2.dom.removeEventListener("beforeinput", read, true);
  return found2 ? rangeToSelectionRange(view2, found2) : null;
}
function blockParent(view2, node) {
  for (let p = node.parentNode; p && p != view2.dom; p = p.parentNode) {
    let desc = view2.docView.nearestDesc(p, true);
    if (desc && desc.node.isBlock)
      return p;
  }
  return null;
}
function parseBetween(view2, from_, to_) {
  let { node: parent, fromOffset, toOffset, from, to } = view2.docView.parseRange(from_, to_);
  let domSel = view2.domSelectionRange();
  let find;
  let anchor = domSel.anchorNode;
  if (anchor && view2.dom.contains(anchor.nodeType == 1 ? anchor : anchor.parentNode)) {
    find = [{ node: anchor, offset: domSel.anchorOffset }];
    if (!selectionCollapsed(domSel))
      find.push({ node: domSel.focusNode, offset: domSel.focusOffset });
  }
  if (chrome && view2.input.lastKeyCode === 8) {
    for (let off = toOffset; off > fromOffset; off--) {
      let node = parent.childNodes[off - 1], desc = node.pmViewDesc;
      if (node.nodeName == "BR" && !desc) {
        toOffset = off;
        break;
      }
      if (!desc || desc.size)
        break;
    }
  }
  let startDoc = view2.state.doc;
  let parser = view2.someProp("domParser") || DOMParser.fromSchema(view2.state.schema);
  let $from = startDoc.resolve(from);
  let sel = null, doc2 = parser.parse(parent, {
    topNode: $from.parent,
    topMatch: $from.parent.contentMatchAt($from.index()),
    topOpen: true,
    from: fromOffset,
    to: toOffset,
    preserveWhitespace: $from.parent.type.whitespace == "pre" ? "full" : true,
    findPositions: find,
    ruleFromNode,
    context: $from
  });
  if (find && find[0].pos != null) {
    let anchor2 = find[0].pos, head = find[1] && find[1].pos;
    if (head == null)
      head = anchor2;
    sel = { anchor: anchor2 + from, head: head + from };
  }
  return { doc: doc2, sel, from, to };
}
function ruleFromNode(dom) {
  let desc = dom.pmViewDesc;
  if (desc) {
    return desc.parseRule();
  } else if (dom.nodeName == "BR" && dom.parentNode) {
    if (safari && /^(ul|ol)$/i.test(dom.parentNode.nodeName)) {
      let skip = document.createElement("div");
      skip.appendChild(document.createElement("li"));
      return { skip };
    } else if (dom.parentNode.lastChild == dom || safari && /^(tr|table)$/i.test(dom.parentNode.nodeName)) {
      return { ignore: true };
    }
  } else if (dom.nodeName == "IMG" && dom.getAttribute("mark-placeholder")) {
    return { ignore: true };
  }
  return null;
}
const isInline = /^(a|abbr|acronym|b|bd[io]|big|br|button|cite|code|data(list)?|del|dfn|em|i|ins|kbd|label|map|mark|meter|output|q|ruby|s|samp|small|span|strong|su[bp]|time|u|tt|var)$/i;
function readDOMChange(view2, from, to, typeOver, addedNodes) {
  let compositionID = view2.input.compositionPendingChanges || (view2.composing ? view2.input.compositionID : 0);
  view2.input.compositionPendingChanges = 0;
  if (from < 0) {
    let origin = view2.input.lastSelectionTime > Date.now() - 50 ? view2.input.lastSelectionOrigin : null;
    let newSel = selectionFromDOM(view2, origin);
    if (newSel && !view2.state.selection.eq(newSel)) {
      if (chrome && android && view2.input.lastKeyCode === 13 && Date.now() - 100 < view2.input.lastKeyCodeTime && view2.someProp("handleKeyDown", (f) => f(view2, keyEvent(13, "Enter"))))
        return;
      let tr2 = view2.state.tr.setSelection(newSel);
      if (origin == "pointer")
        tr2.setMeta("pointer", true);
      else if (origin == "key")
        tr2.scrollIntoView();
      if (compositionID)
        tr2.setMeta("composition", compositionID);
      view2.dispatch(tr2);
    }
    return;
  }
  let $before = view2.state.doc.resolve(from);
  let shared = $before.sharedDepth(to);
  from = $before.before(shared + 1);
  to = view2.state.doc.resolve(to).after(shared + 1);
  let sel = view2.state.selection;
  let parse = parseBetween(view2, from, to);
  let doc2 = view2.state.doc, compare2 = doc2.slice(parse.from, parse.to);
  let preferredPos, preferredSide;
  if (view2.input.lastKeyCode === 8 && Date.now() - 100 < view2.input.lastKeyCodeTime) {
    preferredPos = view2.state.selection.to;
    preferredSide = "end";
  } else {
    preferredPos = view2.state.selection.from;
    preferredSide = "start";
  }
  view2.input.lastKeyCode = null;
  let change = findDiff(compare2.content, parse.doc.content, parse.from, preferredPos, preferredSide);
  if (change)
    view2.input.domChangeCount++;
  if ((ios && view2.input.lastIOSEnter > Date.now() - 225 || android) && addedNodes.some((n) => n.nodeType == 1 && !isInline.test(n.nodeName)) && (!change || change.endA >= change.endB) && view2.someProp("handleKeyDown", (f) => f(view2, keyEvent(13, "Enter")))) {
    view2.input.lastIOSEnter = 0;
    return;
  }
  if (!change) {
    if (typeOver && sel instanceof TextSelection && !sel.empty && sel.$head.sameParent(sel.$anchor) && !view2.composing && !(parse.sel && parse.sel.anchor != parse.sel.head)) {
      change = { start: sel.from, endA: sel.to, endB: sel.to };
    } else {
      if (parse.sel) {
        let sel2 = resolveSelection(view2, view2.state.doc, parse.sel);
        if (sel2 && !sel2.eq(view2.state.selection)) {
          let tr2 = view2.state.tr.setSelection(sel2);
          if (compositionID)
            tr2.setMeta("composition", compositionID);
          view2.dispatch(tr2);
        }
      }
      return;
    }
  }
  if (view2.state.selection.from < view2.state.selection.to && change.start == change.endB && view2.state.selection instanceof TextSelection) {
    if (change.start > view2.state.selection.from && change.start <= view2.state.selection.from + 2 && view2.state.selection.from >= parse.from) {
      change.start = view2.state.selection.from;
    } else if (change.endA < view2.state.selection.to && change.endA >= view2.state.selection.to - 2 && view2.state.selection.to <= parse.to) {
      change.endB += view2.state.selection.to - change.endA;
      change.endA = view2.state.selection.to;
    }
  }
  if (ie$1 && ie_version <= 11 && change.endB == change.start + 1 && change.endA == change.start && change.start > parse.from && parse.doc.textBetween(change.start - parse.from - 1, change.start - parse.from + 1) == "  ") {
    change.start--;
    change.endA--;
    change.endB--;
  }
  let $from = parse.doc.resolveNoCache(change.start - parse.from);
  let $to = parse.doc.resolveNoCache(change.endB - parse.from);
  let $fromA = doc2.resolve(change.start);
  let inlineChange = $from.sameParent($to) && $from.parent.inlineContent && $fromA.end() >= change.endA;
  let nextSel;
  if ((ios && view2.input.lastIOSEnter > Date.now() - 225 && (!inlineChange || addedNodes.some((n) => n.nodeName == "DIV" || n.nodeName == "P")) || !inlineChange && $from.pos < parse.doc.content.size && !$from.sameParent($to) && (nextSel = Selection.findFrom(parse.doc.resolve($from.pos + 1), 1, true)) && nextSel.head == $to.pos) && view2.someProp("handleKeyDown", (f) => f(view2, keyEvent(13, "Enter")))) {
    view2.input.lastIOSEnter = 0;
    return;
  }
  if (view2.state.selection.anchor > change.start && looksLikeBackspace(doc2, change.start, change.endA, $from, $to) && view2.someProp("handleKeyDown", (f) => f(view2, keyEvent(8, "Backspace")))) {
    if (android && chrome)
      view2.domObserver.suppressSelectionUpdates();
    return;
  }
  if (chrome && android && change.endB == change.start)
    view2.input.lastAndroidDelete = Date.now();
  if (android && !inlineChange && $from.start() != $to.start() && $to.parentOffset == 0 && $from.depth == $to.depth && parse.sel && parse.sel.anchor == parse.sel.head && parse.sel.head == change.endA) {
    change.endB -= 2;
    $to = parse.doc.resolveNoCache(change.endB - parse.from);
    setTimeout(() => {
      view2.someProp("handleKeyDown", function(f) {
        return f(view2, keyEvent(13, "Enter"));
      });
    }, 20);
  }
  let chFrom = change.start, chTo = change.endA;
  let tr, storedMarks, markChange;
  if (inlineChange) {
    if ($from.pos == $to.pos) {
      if (ie$1 && ie_version <= 11 && $from.parentOffset == 0) {
        view2.domObserver.suppressSelectionUpdates();
        setTimeout(() => selectionToDOM(view2), 20);
      }
      tr = view2.state.tr.delete(chFrom, chTo);
      storedMarks = doc2.resolve(change.start).marksAcross(doc2.resolve(change.endA));
    } else if (
      // Adding or removing a mark
      change.endA == change.endB && (markChange = isMarkChange($from.parent.content.cut($from.parentOffset, $to.parentOffset), $fromA.parent.content.cut($fromA.parentOffset, change.endA - $fromA.start())))
    ) {
      tr = view2.state.tr;
      if (markChange.type == "add")
        tr.addMark(chFrom, chTo, markChange.mark);
      else
        tr.removeMark(chFrom, chTo, markChange.mark);
    } else if ($from.parent.child($from.index()).isText && $from.index() == $to.index() - ($to.textOffset ? 0 : 1)) {
      let text2 = $from.parent.textBetween($from.parentOffset, $to.parentOffset);
      if (view2.someProp("handleTextInput", (f) => f(view2, chFrom, chTo, text2)))
        return;
      tr = view2.state.tr.insertText(text2, chFrom, chTo);
    }
  }
  if (!tr)
    tr = view2.state.tr.replace(chFrom, chTo, parse.doc.slice(change.start - parse.from, change.endB - parse.from));
  if (parse.sel) {
    let sel2 = resolveSelection(view2, tr.doc, parse.sel);
    if (sel2 && !(chrome && android && view2.composing && sel2.empty && (change.start != change.endB || view2.input.lastAndroidDelete < Date.now() - 100) && (sel2.head == chFrom || sel2.head == tr.mapping.map(chTo) - 1) || ie$1 && sel2.empty && sel2.head == chFrom))
      tr.setSelection(sel2);
  }
  if (storedMarks)
    tr.ensureMarks(storedMarks);
  if (compositionID)
    tr.setMeta("composition", compositionID);
  view2.dispatch(tr.scrollIntoView());
}
function resolveSelection(view2, doc2, parsedSel) {
  if (Math.max(parsedSel.anchor, parsedSel.head) > doc2.content.size)
    return null;
  return selectionBetween(view2, doc2.resolve(parsedSel.anchor), doc2.resolve(parsedSel.head));
}
function isMarkChange(cur, prev) {
  let curMarks = cur.firstChild.marks, prevMarks = prev.firstChild.marks;
  let added2 = curMarks, removed = prevMarks, type, mark, update2;
  for (let i = 0; i < prevMarks.length; i++)
    added2 = prevMarks[i].removeFromSet(added2);
  for (let i = 0; i < curMarks.length; i++)
    removed = curMarks[i].removeFromSet(removed);
  if (added2.length == 1 && removed.length == 0) {
    mark = added2[0];
    type = "add";
    update2 = (node) => node.mark(mark.addToSet(node.marks));
  } else if (added2.length == 0 && removed.length == 1) {
    mark = removed[0];
    type = "remove";
    update2 = (node) => node.mark(mark.removeFromSet(node.marks));
  } else {
    return null;
  }
  let updated = [];
  for (let i = 0; i < prev.childCount; i++)
    updated.push(update2(prev.child(i)));
  if (Fragment.from(updated).eq(cur))
    return { mark, type };
}
function looksLikeBackspace(old, start, end, $newStart, $newEnd) {
  if (
    // The content must have shrunk
    end - start <= $newEnd.pos - $newStart.pos || // newEnd must point directly at or after the end of the block that newStart points into
    skipClosingAndOpening($newStart, true, false) < $newEnd.pos
  )
    return false;
  let $start = old.resolve(start);
  if (!$newStart.parent.isTextblock) {
    let after = $start.nodeAfter;
    return after != null && end == start + after.nodeSize;
  }
  if ($start.parentOffset < $start.parent.content.size || !$start.parent.isTextblock)
    return false;
  let $next = old.resolve(skipClosingAndOpening($start, true, true));
  if (!$next.parent.isTextblock || $next.pos > end || skipClosingAndOpening($next, true, false) < end)
    return false;
  return $newStart.parent.content.cut($newStart.parentOffset).eq($next.parent.content);
}
function skipClosingAndOpening($pos, fromEnd, mayOpen) {
  let depth = $pos.depth, end = fromEnd ? $pos.end() : $pos.pos;
  while (depth > 0 && (fromEnd || $pos.indexAfter(depth) == $pos.node(depth).childCount)) {
    depth--;
    end++;
    fromEnd = false;
  }
  if (mayOpen) {
    let next = $pos.node(depth).maybeChild($pos.indexAfter(depth));
    while (next && !next.isLeaf) {
      next = next.firstChild;
      end++;
    }
  }
  return end;
}
function findDiff(a, b, pos, preferredPos, preferredSide) {
  let start = a.findDiffStart(b, pos);
  if (start == null)
    return null;
  let { a: endA, b: endB } = a.findDiffEnd(b, pos + a.size, pos + b.size);
  if (preferredSide == "end") {
    let adjust = Math.max(0, start - Math.min(endA, endB));
    preferredPos -= endA + adjust - start;
  }
  if (endA < start && a.size < b.size) {
    let move = preferredPos <= start && preferredPos >= endA ? start - preferredPos : 0;
    start -= move;
    if (start && start < b.size && isSurrogatePair(b.textBetween(start - 1, start + 1)))
      start += move ? 1 : -1;
    endB = start + (endB - endA);
    endA = start;
  } else if (endB < start) {
    let move = preferredPos <= start && preferredPos >= endB ? start - preferredPos : 0;
    start -= move;
    if (start && start < a.size && isSurrogatePair(a.textBetween(start - 1, start + 1)))
      start += move ? 1 : -1;
    endA = start + (endA - endB);
    endB = start;
  }
  return { start, endA, endB };
}
function isSurrogatePair(str) {
  if (str.length != 2)
    return false;
  let a = str.charCodeAt(0), b = str.charCodeAt(1);
  return a >= 56320 && a <= 57343 && b >= 55296 && b <= 56319;
}
class EditorView {
  /**
  Create a view. `place` may be a DOM node that the editor should
  be appended to, a function that will place it into the document,
  or an object whose `mount` property holds the node to use as the
  document container. If it is `null`, the editor will not be
  added to the document.
  */
  constructor(place, props) {
    this._root = null;
    this.focused = false;
    this.trackWrites = null;
    this.mounted = false;
    this.markCursor = null;
    this.cursorWrapper = null;
    this.lastSelectedViewDesc = void 0;
    this.input = new InputState();
    this.prevDirectPlugins = [];
    this.pluginViews = [];
    this.requiresGeckoHackNode = false;
    this.dragging = null;
    this._props = props;
    this.state = props.state;
    this.directPlugins = props.plugins || [];
    this.directPlugins.forEach(checkStateComponent);
    this.dispatch = this.dispatch.bind(this);
    this.dom = place && place.mount || document.createElement("div");
    if (place) {
      if (place.appendChild)
        place.appendChild(this.dom);
      else if (typeof place == "function")
        place(this.dom);
      else if (place.mount)
        this.mounted = true;
    }
    this.editable = getEditable(this);
    updateCursorWrapper(this);
    this.nodeViews = buildNodeViews(this);
    this.docView = docViewDesc(this.state.doc, computeDocDeco(this), viewDecorations(this), this.dom, this);
    this.domObserver = new DOMObserver(this, (from, to, typeOver, added2) => readDOMChange(this, from, to, typeOver, added2));
    this.domObserver.start();
    initInput(this);
    this.updatePluginViews();
  }
  /**
  Holds `true` when a
  [composition](https://w3c.github.io/uievents/#events-compositionevents)
  is active.
  */
  get composing() {
    return this.input.composing;
  }
  /**
  The view's current [props](https://prosemirror.net/docs/ref/#view.EditorProps).
  */
  get props() {
    if (this._props.state != this.state) {
      let prev = this._props;
      this._props = {};
      for (let name in prev)
        this._props[name] = prev[name];
      this._props.state = this.state;
    }
    return this._props;
  }
  /**
  Update the view's props. Will immediately cause an update to
  the DOM.
  */
  update(props) {
    if (props.handleDOMEvents != this._props.handleDOMEvents)
      ensureListeners(this);
    let prevProps = this._props;
    this._props = props;
    if (props.plugins) {
      props.plugins.forEach(checkStateComponent);
      this.directPlugins = props.plugins;
    }
    this.updateStateInner(props.state, prevProps);
  }
  /**
  Update the view by updating existing props object with the object
  given as argument. Equivalent to `view.update(Object.assign({},
  view.props, props))`.
  */
  setProps(props) {
    let updated = {};
    for (let name in this._props)
      updated[name] = this._props[name];
    updated.state = this.state;
    for (let name in props)
      updated[name] = props[name];
    this.update(updated);
  }
  /**
  Update the editor's `state` prop, without touching any of the
  other props.
  */
  updateState(state2) {
    this.updateStateInner(state2, this._props);
  }
  updateStateInner(state2, prevProps) {
    var _a;
    let prev = this.state, redraw = false, updateSel = false;
    if (state2.storedMarks && this.composing) {
      clearComposition(this);
      updateSel = true;
    }
    this.state = state2;
    let pluginsChanged = prev.plugins != state2.plugins || this._props.plugins != prevProps.plugins;
    if (pluginsChanged || this._props.plugins != prevProps.plugins || this._props.nodeViews != prevProps.nodeViews) {
      let nodeViews = buildNodeViews(this);
      if (changedNodeViews(nodeViews, this.nodeViews)) {
        this.nodeViews = nodeViews;
        redraw = true;
      }
    }
    if (pluginsChanged || prevProps.handleDOMEvents != this._props.handleDOMEvents) {
      ensureListeners(this);
    }
    this.editable = getEditable(this);
    updateCursorWrapper(this);
    let innerDeco = viewDecorations(this), outerDeco = computeDocDeco(this);
    let scroll = prev.plugins != state2.plugins && !prev.doc.eq(state2.doc) ? "reset" : state2.scrollToSelection > prev.scrollToSelection ? "to selection" : "preserve";
    let updateDoc = redraw || !this.docView.matchesNode(state2.doc, outerDeco, innerDeco);
    if (updateDoc || !state2.selection.eq(prev.selection))
      updateSel = true;
    let oldScrollPos = scroll == "preserve" && updateSel && this.dom.style.overflowAnchor == null && storeScrollPos(this);
    if (updateSel) {
      this.domObserver.stop();
      let forceSelUpdate = updateDoc && (ie$1 || chrome) && !this.composing && !prev.selection.empty && !state2.selection.empty && selectionContextChanged(prev.selection, state2.selection);
      if (updateDoc) {
        let chromeKludge = chrome ? this.trackWrites = this.domSelectionRange().focusNode : null;
        if (this.composing)
          this.input.compositionNode = findCompositionNode(this);
        if (redraw || !this.docView.update(state2.doc, outerDeco, innerDeco, this)) {
          this.docView.updateOuterDeco(outerDeco);
          this.docView.destroy();
          this.docView = docViewDesc(state2.doc, outerDeco, innerDeco, this.dom, this);
        }
        if (chromeKludge && !this.trackWrites)
          forceSelUpdate = true;
      }
      if (forceSelUpdate || !(this.input.mouseDown && this.domObserver.currentSelection.eq(this.domSelectionRange()) && anchorInRightPlace(this))) {
        selectionToDOM(this, forceSelUpdate);
      } else {
        syncNodeSelection(this, state2.selection);
        this.domObserver.setCurSelection();
      }
      this.domObserver.start();
    }
    this.updatePluginViews(prev);
    if (((_a = this.dragging) === null || _a === void 0 ? void 0 : _a.node) && !prev.doc.eq(state2.doc))
      this.updateDraggedNode(this.dragging, prev);
    if (scroll == "reset") {
      this.dom.scrollTop = 0;
    } else if (scroll == "to selection") {
      this.scrollToSelection();
    } else if (oldScrollPos) {
      resetScrollPos(oldScrollPos);
    }
  }
  /**
  @internal
  */
  scrollToSelection() {
    let startDOM = this.domSelectionRange().focusNode;
    if (this.someProp("handleScrollToSelection", (f) => f(this))) ;
    else if (this.state.selection instanceof NodeSelection) {
      let target = this.docView.domAfterPos(this.state.selection.from);
      if (target.nodeType == 1)
        scrollRectIntoView(this, target.getBoundingClientRect(), startDOM);
    } else {
      scrollRectIntoView(this, this.coordsAtPos(this.state.selection.head, 1), startDOM);
    }
  }
  destroyPluginViews() {
    let view2;
    while (view2 = this.pluginViews.pop())
      if (view2.destroy)
        view2.destroy();
  }
  updatePluginViews(prevState) {
    if (!prevState || prevState.plugins != this.state.plugins || this.directPlugins != this.prevDirectPlugins) {
      this.prevDirectPlugins = this.directPlugins;
      this.destroyPluginViews();
      for (let i = 0; i < this.directPlugins.length; i++) {
        let plugin = this.directPlugins[i];
        if (plugin.spec.view)
          this.pluginViews.push(plugin.spec.view(this));
      }
      for (let i = 0; i < this.state.plugins.length; i++) {
        let plugin = this.state.plugins[i];
        if (plugin.spec.view)
          this.pluginViews.push(plugin.spec.view(this));
      }
    } else {
      for (let i = 0; i < this.pluginViews.length; i++) {
        let pluginView = this.pluginViews[i];
        if (pluginView.update)
          pluginView.update(this, prevState);
      }
    }
  }
  updateDraggedNode(dragging, prev) {
    let sel = dragging.node, found2 = -1;
    if (this.state.doc.nodeAt(sel.from) == sel.node) {
      found2 = sel.from;
    } else {
      let movedPos = sel.from + (this.state.doc.content.size - prev.doc.content.size);
      let moved2 = movedPos > 0 && this.state.doc.nodeAt(movedPos);
      if (moved2 == sel.node)
        found2 = movedPos;
    }
    this.dragging = new Dragging(dragging.slice, dragging.move, found2 < 0 ? void 0 : NodeSelection.create(this.state.doc, found2));
  }
  someProp(propName, f) {
    let prop = this._props && this._props[propName], value;
    if (prop != null && (value = f ? f(prop) : prop))
      return value;
    for (let i = 0; i < this.directPlugins.length; i++) {
      let prop2 = this.directPlugins[i].props[propName];
      if (prop2 != null && (value = f ? f(prop2) : prop2))
        return value;
    }
    let plugins = this.state.plugins;
    if (plugins)
      for (let i = 0; i < plugins.length; i++) {
        let prop2 = plugins[i].props[propName];
        if (prop2 != null && (value = f ? f(prop2) : prop2))
          return value;
      }
  }
  /**
  Query whether the view has focus.
  */
  hasFocus() {
    if (ie$1) {
      let node = this.root.activeElement;
      if (node == this.dom)
        return true;
      if (!node || !this.dom.contains(node))
        return false;
      while (node && this.dom != node && this.dom.contains(node)) {
        if (node.contentEditable == "false")
          return false;
        node = node.parentElement;
      }
      return true;
    }
    return this.root.activeElement == this.dom;
  }
  /**
  Focus the editor.
  */
  focus() {
    this.domObserver.stop();
    if (this.editable)
      focusPreventScroll(this.dom);
    selectionToDOM(this);
    this.domObserver.start();
  }
  /**
  Get the document root in which the editor exists. This will
  usually be the top-level `document`, but might be a [shadow
  DOM](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Shadow_DOM)
  root if the editor is inside one.
  */
  get root() {
    let cached = this._root;
    if (cached == null)
      for (let search = this.dom.parentNode; search; search = search.parentNode) {
        if (search.nodeType == 9 || search.nodeType == 11 && search.host) {
          if (!search.getSelection)
            Object.getPrototypeOf(search).getSelection = () => search.ownerDocument.getSelection();
          return this._root = search;
        }
      }
    return cached || document;
  }
  /**
  When an existing editor view is moved to a new document or
  shadow tree, call this to make it recompute its root.
  */
  updateRoot() {
    this._root = null;
  }
  /**
  Given a pair of viewport coordinates, return the document
  position that corresponds to them. May return null if the given
  coordinates aren't inside of the editor. When an object is
  returned, its `pos` property is the position nearest to the
  coordinates, and its `inside` property holds the position of the
  inner node that the position falls inside of, or -1 if it is at
  the top level, not in any node.
  */
  posAtCoords(coords) {
    return posAtCoords(this, coords);
  }
  /**
  Returns the viewport rectangle at a given document position.
  `left` and `right` will be the same number, as this returns a
  flat cursor-ish rectangle. If the position is between two things
  that aren't directly adjacent, `side` determines which element
  is used. When < 0, the element before the position is used,
  otherwise the element after.
  */
  coordsAtPos(pos, side = 1) {
    return coordsAtPos(this, pos, side);
  }
  /**
  Find the DOM position that corresponds to the given document
  position. When `side` is negative, find the position as close as
  possible to the content before the position. When positive,
  prefer positions close to the content after the position. When
  zero, prefer as shallow a position as possible.
  
  Note that you should **not** mutate the editor's internal DOM,
  only inspect it (and even that is usually not necessary).
  */
  domAtPos(pos, side = 0) {
    return this.docView.domFromPos(pos, side);
  }
  /**
  Find the DOM node that represents the document node after the
  given position. May return `null` when the position doesn't point
  in front of a node or if the node is inside an opaque node view.
  
  This is intended to be able to call things like
  `getBoundingClientRect` on that DOM node. Do **not** mutate the
  editor DOM directly, or add styling this way, since that will be
  immediately overriden by the editor as it redraws the node.
  */
  nodeDOM(pos) {
    let desc = this.docView.descAt(pos);
    return desc ? desc.nodeDOM : null;
  }
  /**
  Find the document position that corresponds to a given DOM
  position. (Whenever possible, it is preferable to inspect the
  document structure directly, rather than poking around in the
  DOM, but sometimes—for example when interpreting an event
  target—you don't have a choice.)
  
  The `bias` parameter can be used to influence which side of a DOM
  node to use when the position is inside a leaf node.
  */
  posAtDOM(node, offset, bias = -1) {
    let pos = this.docView.posFromDOM(node, offset, bias);
    if (pos == null)
      throw new RangeError("DOM position not inside the editor");
    return pos;
  }
  /**
  Find out whether the selection is at the end of a textblock when
  moving in a given direction. When, for example, given `"left"`,
  it will return true if moving left from the current cursor
  position would leave that position's parent textblock. Will apply
  to the view's current state by default, but it is possible to
  pass a different state.
  */
  endOfTextblock(dir, state2) {
    return endOfTextblock(this, state2 || this.state, dir);
  }
  /**
  Run the editor's paste logic with the given HTML string. The
  `event`, if given, will be passed to the
  [`handlePaste`](https://prosemirror.net/docs/ref/#view.EditorProps.handlePaste) hook.
  */
  pasteHTML(html2, event) {
    return doPaste(this, "", html2, false, event || new ClipboardEvent("paste"));
  }
  /**
  Run the editor's paste logic with the given plain-text input.
  */
  pasteText(text2, event) {
    return doPaste(this, text2, null, true, event || new ClipboardEvent("paste"));
  }
  /**
  Removes the editor from the DOM and destroys all [node
  views](https://prosemirror.net/docs/ref/#view.NodeView).
  */
  destroy() {
    if (!this.docView)
      return;
    destroyInput(this);
    this.destroyPluginViews();
    if (this.mounted) {
      this.docView.update(this.state.doc, [], viewDecorations(this), this);
      this.dom.textContent = "";
    } else if (this.dom.parentNode) {
      this.dom.parentNode.removeChild(this.dom);
    }
    this.docView.destroy();
    this.docView = null;
    clearReusedRange();
  }
  /**
  This is true when the view has been
  [destroyed](https://prosemirror.net/docs/ref/#view.EditorView.destroy) (and thus should not be
  used anymore).
  */
  get isDestroyed() {
    return this.docView == null;
  }
  /**
  Used for testing.
  */
  dispatchEvent(event) {
    return dispatchEvent(this, event);
  }
  /**
  Dispatch a transaction. Will call
  [`dispatchTransaction`](https://prosemirror.net/docs/ref/#view.DirectEditorProps.dispatchTransaction)
  when given, and otherwise defaults to applying the transaction to
  the current state and calling
  [`updateState`](https://prosemirror.net/docs/ref/#view.EditorView.updateState) with the result.
  This method is bound to the view instance, so that it can be
  easily passed around.
  */
  dispatch(tr) {
    let dispatchTransaction = this._props.dispatchTransaction;
    if (dispatchTransaction)
      dispatchTransaction.call(this, tr);
    else
      this.updateState(this.state.apply(tr));
  }
  /**
  @internal
  */
  domSelectionRange() {
    let sel = this.domSelection();
    if (!sel)
      return { focusNode: null, focusOffset: 0, anchorNode: null, anchorOffset: 0 };
    return safari && this.root.nodeType === 11 && deepActiveElement(this.dom.ownerDocument) == this.dom && safariShadowSelectionRange(this, sel) || sel;
  }
  /**
  @internal
  */
  domSelection() {
    return this.root.getSelection();
  }
}
function computeDocDeco(view2) {
  let attrs = /* @__PURE__ */ Object.create(null);
  attrs.class = "ProseMirror";
  attrs.contenteditable = String(view2.editable);
  view2.someProp("attributes", (value) => {
    if (typeof value == "function")
      value = value(view2.state);
    if (value)
      for (let attr2 in value) {
        if (attr2 == "class")
          attrs.class += " " + value[attr2];
        else if (attr2 == "style")
          attrs.style = (attrs.style ? attrs.style + ";" : "") + value[attr2];
        else if (!attrs[attr2] && attr2 != "contenteditable" && attr2 != "nodeName")
          attrs[attr2] = String(value[attr2]);
      }
  });
  if (!attrs.translate)
    attrs.translate = "no";
  return [Decoration.node(0, view2.state.doc.content.size, attrs)];
}
function updateCursorWrapper(view2) {
  if (view2.markCursor) {
    let dom = document.createElement("img");
    dom.className = "ProseMirror-separator";
    dom.setAttribute("mark-placeholder", "true");
    dom.setAttribute("alt", "");
    view2.cursorWrapper = { dom, deco: Decoration.widget(view2.state.selection.from, dom, { raw: true, marks: view2.markCursor }) };
  } else {
    view2.cursorWrapper = null;
  }
}
function getEditable(view2) {
  return !view2.someProp("editable", (value) => value(view2.state) === false);
}
function selectionContextChanged(sel1, sel2) {
  let depth = Math.min(sel1.$anchor.sharedDepth(sel1.head), sel2.$anchor.sharedDepth(sel2.head));
  return sel1.$anchor.start(depth) != sel2.$anchor.start(depth);
}
function buildNodeViews(view2) {
  let result = /* @__PURE__ */ Object.create(null);
  function add(obj) {
    for (let prop in obj)
      if (!Object.prototype.hasOwnProperty.call(result, prop))
        result[prop] = obj[prop];
  }
  view2.someProp("nodeViews", add);
  view2.someProp("markViews", add);
  return result;
}
function changedNodeViews(a, b) {
  let nA = 0, nB = 0;
  for (let prop in a) {
    if (a[prop] != b[prop])
      return true;
    nA++;
  }
  for (let _ in b)
    nB++;
  return nA != nB;
}
function checkStateComponent(plugin) {
  if (plugin.spec.state || plugin.spec.filterTransaction || plugin.spec.appendTransaction)
    throw new RangeError("Plugins passed directly to the view must not have a state component");
}
var base = {
  8: "Backspace",
  9: "Tab",
  10: "Enter",
  12: "NumLock",
  13: "Enter",
  16: "Shift",
  17: "Control",
  18: "Alt",
  20: "CapsLock",
  27: "Escape",
  32: " ",
  33: "PageUp",
  34: "PageDown",
  35: "End",
  36: "Home",
  37: "ArrowLeft",
  38: "ArrowUp",
  39: "ArrowRight",
  40: "ArrowDown",
  44: "PrintScreen",
  45: "Insert",
  46: "Delete",
  59: ";",
  61: "=",
  91: "Meta",
  92: "Meta",
  106: "*",
  107: "+",
  108: ",",
  109: "-",
  110: ".",
  111: "/",
  144: "NumLock",
  145: "ScrollLock",
  160: "Shift",
  161: "Shift",
  162: "Control",
  163: "Control",
  164: "Alt",
  165: "Alt",
  173: "-",
  186: ";",
  187: "=",
  188: ",",
  189: "-",
  190: ".",
  191: "/",
  192: "`",
  219: "[",
  220: "\\",
  221: "]",
  222: "'"
};
var shift = {
  48: ")",
  49: "!",
  50: "@",
  51: "#",
  52: "$",
  53: "%",
  54: "^",
  55: "&",
  56: "*",
  57: "(",
  59: ":",
  61: "+",
  173: "_",
  186: ":",
  187: "+",
  188: "<",
  189: "_",
  190: ">",
  191: "?",
  192: "~",
  219: "{",
  220: "|",
  221: "}",
  222: '"'
};
var mac$1 = typeof navigator != "undefined" && /Mac/.test(navigator.platform);
var ie = typeof navigator != "undefined" && /MSIE \d|Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(navigator.userAgent);
for (var i = 0; i < 10; i++) base[48 + i] = base[96 + i] = String(i);
for (var i = 1; i <= 24; i++) base[i + 111] = "F" + i;
for (var i = 65; i <= 90; i++) {
  base[i] = String.fromCharCode(i + 32);
  shift[i] = String.fromCharCode(i);
}
for (var code in base) if (!shift.hasOwnProperty(code)) shift[code] = base[code];
function keyName(event) {
  var ignoreKey = mac$1 && event.metaKey && event.shiftKey && !event.ctrlKey && !event.altKey || ie && event.shiftKey && event.key && event.key.length == 1 || event.key == "Unidentified";
  var name = !ignoreKey && event.key || (event.shiftKey ? shift : base)[event.keyCode] || event.key || "Unidentified";
  if (name == "Esc") name = "Escape";
  if (name == "Del") name = "Delete";
  if (name == "Left") name = "ArrowLeft";
  if (name == "Up") name = "ArrowUp";
  if (name == "Right") name = "ArrowRight";
  if (name == "Down") name = "ArrowDown";
  return name;
}
const mac = typeof navigator != "undefined" ? /Mac|iP(hone|[oa]d)/.test(navigator.platform) : false;
function normalizeKeyName(name) {
  let parts = name.split(/-(?!$)/), result = parts[parts.length - 1];
  if (result == "Space")
    result = " ";
  let alt, ctrl, shift2, meta;
  for (let i = 0; i < parts.length - 1; i++) {
    let mod = parts[i];
    if (/^(cmd|meta|m)$/i.test(mod))
      meta = true;
    else if (/^a(lt)?$/i.test(mod))
      alt = true;
    else if (/^(c|ctrl|control)$/i.test(mod))
      ctrl = true;
    else if (/^s(hift)?$/i.test(mod))
      shift2 = true;
    else if (/^mod$/i.test(mod)) {
      if (mac)
        meta = true;
      else
        ctrl = true;
    } else
      throw new Error("Unrecognized modifier name: " + mod);
  }
  if (alt)
    result = "Alt-" + result;
  if (ctrl)
    result = "Ctrl-" + result;
  if (meta)
    result = "Meta-" + result;
  if (shift2)
    result = "Shift-" + result;
  return result;
}
function normalize(map) {
  let copy2 = /* @__PURE__ */ Object.create(null);
  for (let prop in map)
    copy2[normalizeKeyName(prop)] = map[prop];
  return copy2;
}
function modifiers(name, event, shift2 = true) {
  if (event.altKey)
    name = "Alt-" + name;
  if (event.ctrlKey)
    name = "Ctrl-" + name;
  if (event.metaKey)
    name = "Meta-" + name;
  if (shift2 && event.shiftKey)
    name = "Shift-" + name;
  return name;
}
function keymap(bindings) {
  return new Plugin({ props: { handleKeyDown: keydownHandler(bindings) } });
}
function keydownHandler(bindings) {
  let map = normalize(bindings);
  return function(view2, event) {
    let name = keyName(event), baseName, direct = map[modifiers(name, event)];
    if (direct && direct(view2.state, view2.dispatch, view2))
      return true;
    if (name.length == 1 && name != " ") {
      if (event.shiftKey) {
        let noShift = map[modifiers(name, event, false)];
        if (noShift && noShift(view2.state, view2.dispatch, view2))
          return true;
      }
      if ((event.shiftKey || event.altKey || event.metaKey || name.charCodeAt(0) > 127) && (baseName = base[event.keyCode]) && baseName != name) {
        let fromCode = map[modifiers(baseName, event)];
        if (fromCode && fromCode(view2.state, view2.dispatch, view2))
          return true;
      }
    }
    return false;
  };
}
function splitListItem(itemType, itemAttrs) {
  return function(state2, dispatch) {
    let { $from, $to, node } = state2.selection;
    if (node && node.isBlock || $from.depth < 2 || !$from.sameParent($to))
      return false;
    let grandParent = $from.node(-1);
    if (grandParent.type != itemType)
      return false;
    if ($from.parent.content.size == 0 && $from.node(-1).childCount == $from.indexAfter(-1)) {
      if ($from.depth == 3 || $from.node(-3).type != itemType || $from.index(-2) != $from.node(-2).childCount - 1)
        return false;
      if (dispatch) {
        let wrap2 = Fragment.empty;
        let depthBefore = $from.index(-1) ? 1 : $from.index(-2) ? 2 : 3;
        for (let d = $from.depth - depthBefore; d >= $from.depth - 3; d--)
          wrap2 = Fragment.from($from.node(d).copy(wrap2));
        let depthAfter = $from.indexAfter(-1) < $from.node(-2).childCount ? 1 : $from.indexAfter(-2) < $from.node(-3).childCount ? 2 : 3;
        wrap2 = wrap2.append(Fragment.from(itemType.createAndFill()));
        let start = $from.before($from.depth - (depthBefore - 1));
        let tr2 = state2.tr.replace(start, $from.after(-depthAfter), new Slice(wrap2, 4 - depthBefore, 0));
        let sel = -1;
        tr2.doc.nodesBetween(start, tr2.doc.content.size, (node2, pos) => {
          if (sel > -1)
            return false;
          if (node2.isTextblock && node2.content.size == 0)
            sel = pos + 1;
        });
        if (sel > -1)
          tr2.setSelection(Selection.near(tr2.doc.resolve(sel)));
        dispatch(tr2.scrollIntoView());
      }
      return true;
    }
    let nextType = $to.pos == $from.end() ? grandParent.contentMatchAt(0).defaultType : null;
    let tr = state2.tr.delete($from.pos, $to.pos);
    let types = nextType ? [null, { type: nextType }] : void 0;
    if (!canSplit(tr.doc, $from.pos, 2, types))
      return false;
    if (dispatch)
      dispatch(tr.split($from.pos, 2, types).scrollIntoView());
    return true;
  };
}
function style_html(html_source, options) {
  var multi_parser, indent_size, indent_character, max_char, brace_style, unformatted;
  options = options || {};
  indent_size = options.indent_size || 4;
  indent_character = options.indent_char || " ";
  brace_style = options.brace_style || "collapse";
  max_char = options.max_char == 0 ? Infinity : options.max_char || 70;
  unformatted = options.unformatted || ["a", "span", "bdo", "em", "strong", "dfn", "code", "samp", "kbd", "var", "cite", "abbr", "acronym", "q", "sub", "sup", "tt", "i", "b", "big", "small", "u", "s", "strike", "font", "ins", "del", "pre", "address", "dt", "h1", "h2", "h3", "h4", "h5", "h6"];
  function Parser() {
    this.pos = 0;
    this.token = "";
    this.current_mode = "CONTENT";
    this.tags = {
      //An object to hold tags, their position, and their parent-tags, initiated with default values
      parent: "parent1",
      parentcount: 1,
      parent1: ""
    };
    this.tag_type = "";
    this.token_text = this.last_token = this.last_text = this.token_type = "";
    this.Utils = {
      //Uilities made available to the various functions
      whitespace: "\n\r	 ".split(""),
      single_token: "br,input,link,meta,!doctype,basefont,base,area,hr,wbr,param,img,isindex,?xml,embed,?php,?,?=".split(","),
      //all the single tags for HTML
      extra_liners: "head,body,/html".split(","),
      //for tags that need a line of whitespace before them
      in_array: function(what, arr) {
        for (var i = 0; i < arr.length; i++) {
          if (what === arr[i]) {
            return true;
          }
        }
        return false;
      }
    };
    this.get_content = function() {
      var input_char = "", content = [], space2 = false;
      while (this.input.charAt(this.pos) !== "<") {
        if (this.pos >= this.input.length) {
          return content.length ? content.join("") : ["", "TK_EOF"];
        }
        input_char = this.input.charAt(this.pos);
        this.pos++;
        this.line_char_count++;
        if (this.Utils.in_array(input_char, this.Utils.whitespace)) {
          if (content.length) {
            space2 = true;
          }
          this.line_char_count--;
          continue;
        } else if (space2) {
          if (this.line_char_count >= this.max_char) {
            content.push("\n");
            for (var i = 0; i < this.indent_level; i++) {
              content.push(this.indent_string);
            }
            this.line_char_count = 0;
          } else {
            content.push(" ");
            this.line_char_count++;
          }
          space2 = false;
        }
        content.push(input_char);
      }
      return content.length ? content.join("") : "";
    };
    this.get_contents_to = function(name) {
      if (this.pos == this.input.length) {
        return ["", "TK_EOF"];
      }
      var content = "";
      var reg_match = new RegExp("</" + name + "\\s*>", "igm");
      reg_match.lastIndex = this.pos;
      var reg_array = reg_match.exec(this.input);
      var end_script = reg_array ? reg_array.index : this.input.length;
      if (this.pos < end_script) {
        content = this.input.substring(this.pos, end_script);
        this.pos = end_script;
      }
      return content;
    };
    this.record_tag = function(tag) {
      if (this.tags[tag + "count"]) {
        this.tags[tag + "count"]++;
        this.tags[tag + this.tags[tag + "count"]] = this.indent_level;
      } else {
        this.tags[tag + "count"] = 1;
        this.tags[tag + this.tags[tag + "count"]] = this.indent_level;
      }
      this.tags[tag + this.tags[tag + "count"] + "parent"] = this.tags.parent;
      this.tags.parent = tag + this.tags[tag + "count"];
    };
    this.retrieve_tag = function(tag) {
      if (this.tags[tag + "count"]) {
        var temp_parent = this.tags.parent;
        while (temp_parent) {
          if (tag + this.tags[tag + "count"] === temp_parent) {
            break;
          }
          temp_parent = this.tags[temp_parent + "parent"];
        }
        if (temp_parent) {
          this.indent_level = this.tags[tag + this.tags[tag + "count"]];
          this.tags.parent = this.tags[temp_parent + "parent"];
        }
        delete this.tags[tag + this.tags[tag + "count"] + "parent"];
        delete this.tags[tag + this.tags[tag + "count"]];
        if (this.tags[tag + "count"] == 1) {
          delete this.tags[tag + "count"];
        } else {
          this.tags[tag + "count"]--;
        }
      }
    };
    this.get_tag = function() {
      var input_char = "", content = [], space2 = false, tag_start, tag_end;
      do {
        if (this.pos >= this.input.length) {
          return content.length ? content.join("") : ["", "TK_EOF"];
        }
        input_char = this.input.charAt(this.pos);
        this.pos++;
        this.line_char_count++;
        if (this.Utils.in_array(input_char, this.Utils.whitespace)) {
          space2 = true;
          this.line_char_count--;
          continue;
        }
        if (input_char === "'" || input_char === '"') {
          if (!content[1] || content[1] !== "!") {
            input_char += this.get_unformatted(input_char);
            space2 = true;
          }
        }
        if (input_char === "=") {
          space2 = false;
        }
        if (content.length && content[content.length - 1] !== "=" && input_char !== ">" && space2) {
          if (this.line_char_count >= this.max_char) {
            this.print_newline(false, content);
            this.line_char_count = 0;
          } else {
            content.push(" ");
            this.line_char_count++;
          }
          space2 = false;
        }
        if (input_char === "<") {
          tag_start = this.pos - 1;
        }
        content.push(input_char);
      } while (input_char !== ">");
      var tag_complete = content.join("");
      var tag_index;
      if (tag_complete.indexOf(" ") != -1) {
        tag_index = tag_complete.indexOf(" ");
      } else {
        tag_index = tag_complete.indexOf(">");
      }
      var tag_check2 = tag_complete.substring(1, tag_index).toLowerCase();
      if (tag_complete.charAt(tag_complete.length - 2) === "/" || this.Utils.in_array(tag_check2, this.Utils.single_token)) {
        this.tag_type = "SINGLE";
      } else if (tag_check2 === "script") {
        this.record_tag(tag_check2);
        this.tag_type = "SCRIPT";
      } else if (tag_check2 === "style") {
        this.record_tag(tag_check2);
        this.tag_type = "STYLE";
      } else if (this.Utils.in_array(tag_check2, unformatted)) {
        var comment = this.get_unformatted("</" + tag_check2 + ">", tag_complete);
        content.push(comment);
        if (tag_start > 0 && this.Utils.in_array(this.input.charAt(tag_start - 1), this.Utils.whitespace)) {
          content.splice(0, 0, this.input.charAt(tag_start - 1));
        }
        tag_end = this.pos - 1;
        if (this.Utils.in_array(this.input.charAt(tag_end + 1), this.Utils.whitespace)) {
          content.push(this.input.charAt(tag_end + 1));
        }
        this.tag_type = "SINGLE";
      } else if (tag_check2.charAt(0) === "!") {
        if (tag_check2.indexOf("[if") != -1) {
          if (tag_complete.indexOf("!IE") != -1) {
            var comment = this.get_unformatted("-->", tag_complete);
            content.push(comment);
          }
          this.tag_type = "START";
        } else if (tag_check2.indexOf("[endif") != -1) {
          this.tag_type = "END";
          this.unindent();
        } else if (tag_check2.indexOf("[cdata[") != -1) {
          var comment = this.get_unformatted("]]>", tag_complete);
          content.push(comment);
          this.tag_type = "SINGLE";
        } else {
          var comment = this.get_unformatted("-->", tag_complete);
          content.push(comment);
          this.tag_type = "SINGLE";
        }
      } else {
        if (tag_check2.charAt(0) === "/") {
          this.retrieve_tag(tag_check2.substring(1));
          this.tag_type = "END";
        } else {
          this.record_tag(tag_check2);
          this.tag_type = "START";
        }
        if (this.Utils.in_array(tag_check2, this.Utils.extra_liners)) {
          this.print_newline(true, this.output);
        }
      }
      return content.join("");
    };
    this.get_unformatted = function(delimiter, orig_tag) {
      if (orig_tag && orig_tag.toLowerCase().indexOf(delimiter) != -1) {
        return "";
      }
      var input_char = "";
      var content = "";
      var space2 = true;
      do {
        if (this.pos >= this.input.length) {
          return content;
        }
        input_char = this.input.charAt(this.pos);
        this.pos++;
        if (this.Utils.in_array(input_char, this.Utils.whitespace)) {
          if (!space2) {
            this.line_char_count--;
            continue;
          }
          if (input_char === "\n" || input_char === "\r") {
            content += "\n";
            this.line_char_count = 0;
            continue;
          }
        }
        content += input_char;
        this.line_char_count++;
        space2 = true;
      } while (content.toLowerCase().indexOf(delimiter) == -1);
      return content;
    };
    this.get_token = function() {
      var token;
      if (this.last_token === "TK_TAG_SCRIPT" || this.last_token === "TK_TAG_STYLE") {
        var type = this.last_token.substr(7);
        token = this.get_contents_to(type);
        if (typeof token !== "string") {
          return token;
        }
        return [token, "TK_" + type];
      }
      if (this.current_mode === "CONTENT") {
        token = this.get_content();
        if (typeof token !== "string") {
          return token;
        } else {
          return [token, "TK_CONTENT"];
        }
      }
      if (this.current_mode === "TAG") {
        token = this.get_tag();
        if (typeof token !== "string") {
          return token;
        } else {
          var tag_name_type = "TK_TAG_" + this.tag_type;
          return [token, tag_name_type];
        }
      }
    };
    this.get_full_indent = function(level) {
      level = this.indent_level + level || 0;
      if (level < 1)
        return "";
      return Array(level + 1).join(this.indent_string);
    };
    this.printer = function(js_source, indent_character2, indent_size2, max_char2, brace_style2) {
      this.input = js_source || "";
      this.output = [];
      this.indent_character = indent_character2;
      this.indent_string = "";
      this.indent_size = indent_size2;
      this.brace_style = brace_style2;
      this.indent_level = 0;
      this.max_char = max_char2;
      this.line_char_count = 0;
      for (var i = 0; i < this.indent_size; i++) {
        this.indent_string += this.indent_character;
      }
      this.print_newline = function(ignore, arr) {
        this.line_char_count = 0;
        if (!arr || !arr.length) {
          return;
        }
        if (!ignore) {
          while (this.Utils.in_array(arr[arr.length - 1], this.Utils.whitespace)) {
            arr.pop();
          }
        }
        arr.push("\n");
        for (var i2 = 0; i2 < this.indent_level; i2++) {
          arr.push(this.indent_string);
        }
      };
      this.print_token = function(text3) {
        this.output.push(text3);
      };
      this.indent = function() {
        this.indent_level++;
      };
      this.unindent = function() {
        if (this.indent_level > 0) {
          this.indent_level--;
        }
      };
    };
    return this;
  }
  multi_parser = new Parser();
  multi_parser.printer(html_source, indent_character, indent_size, max_char, brace_style);
  while (true) {
    var t = multi_parser.get_token();
    multi_parser.token_text = t[0];
    multi_parser.token_type = t[1];
    if (multi_parser.token_type === "TK_EOF") {
      break;
    }
    switch (multi_parser.token_type) {
      case "TK_TAG_START":
        multi_parser.print_newline(false, multi_parser.output);
        multi_parser.print_token(multi_parser.token_text);
        multi_parser.indent();
        multi_parser.current_mode = "CONTENT";
        break;
      case "TK_TAG_STYLE":
      case "TK_TAG_SCRIPT":
        multi_parser.print_newline(false, multi_parser.output);
        multi_parser.print_token(multi_parser.token_text);
        multi_parser.current_mode = "CONTENT";
        break;
      case "TK_TAG_END":
        if (multi_parser.last_token === "TK_CONTENT" && multi_parser.last_text === "") {
          var tag_name = multi_parser.token_text.match(/\w+/)[0];
          var tag_extracted_from_last_output = multi_parser.output[multi_parser.output.length - 1].match(/<\s*(\w+)/);
          if (tag_extracted_from_last_output === null || tag_extracted_from_last_output[1] !== tag_name)
            multi_parser.print_newline(true, multi_parser.output);
        }
        multi_parser.print_token(multi_parser.token_text);
        multi_parser.current_mode = "CONTENT";
        break;
      case "TK_TAG_SINGLE":
        var tag_check = multi_parser.token_text.match(/^\s*<([a-z]+)/i);
        if (!tag_check || !multi_parser.Utils.in_array(tag_check[1], unformatted)) {
          multi_parser.print_newline(false, multi_parser.output);
        }
        multi_parser.print_token(multi_parser.token_text);
        multi_parser.current_mode = "CONTENT";
        break;
      case "TK_CONTENT":
        if (multi_parser.token_text !== "") {
          multi_parser.print_token(multi_parser.token_text);
        }
        multi_parser.current_mode = "TAG";
        break;
      case "TK_STYLE":
      case "TK_SCRIPT":
        if (multi_parser.token_text !== "") {
          multi_parser.output.push("\n");
          var text2 = multi_parser.token_text;
          if (multi_parser.token_type == "TK_SCRIPT") {
            var _beautifier = typeof js_beautify == "function" && js_beautify;
          } else if (multi_parser.token_type == "TK_STYLE") {
            var _beautifier = typeof css_beautify == "function" && css_beautify;
          }
          if (options.indent_scripts == "keep") {
            var script_indent_level = 0;
          } else if (options.indent_scripts == "separate") {
            var script_indent_level = -multi_parser.indent_level;
          } else {
            var script_indent_level = 1;
          }
          var indentation = multi_parser.get_full_indent(script_indent_level);
          if (_beautifier) {
            text2 = _beautifier(text2.replace(/^\s*/, indentation), options);
          } else {
            var white = text2.match(/^\s*/)[0];
            var _level = white.match(/[^\n\r]*$/)[0].split(multi_parser.indent_string).length - 1;
            var reindent = multi_parser.get_full_indent(script_indent_level - _level);
            text2 = text2.replace(/^\s*/, indentation).replace(/\r\n|\r|\n/g, "\n" + reindent).replace(/\s*$/, "");
          }
          if (text2) {
            multi_parser.print_token(text2);
            multi_parser.print_newline(true, multi_parser.output);
          }
        }
        multi_parser.current_mode = "TAG";
        break;
    }
    multi_parser.last_token = multi_parser.token_type;
    multi_parser.last_text = multi_parser.token_text;
  }
  return multi_parser.output.join("");
}
var html = {
  prettyPrint: style_html
};
function __rest(s, e) {
  var t = {};
  for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0) t[p] = s[p];
  if (s != null && typeof Object.getOwnPropertySymbols === "function") for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
    if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i])) t[p[i]] = s[p[i]];
  }
  return t;
}
typeof SuppressedError === "function" ? SuppressedError : function(error, suppressed, message) {
  var e = new Error(message);
  return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};
function noop() {
}
function assign(tar, src) {
  for (const k in src) tar[k] = src[k];
  return (
    /** @type {T & S} */
    tar
  );
}
function run(fn) {
  return fn();
}
function blank_object() {
  return /* @__PURE__ */ Object.create(null);
}
function run_all(fns) {
  fns.forEach(run);
}
function is_function(thing) {
  return typeof thing === "function";
}
function safe_not_equal(a, b) {
  return a != a ? b == b : a !== b || a && typeof a === "object" || typeof a === "function";
}
function is_empty(obj) {
  return Object.keys(obj).length === 0;
}
function subscribe(store) {
  for (var _len = arguments.length, callbacks = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    callbacks[_key - 1] = arguments[_key];
  }
  if (store == null) {
    for (const callback of callbacks) {
      callback(void 0);
    }
    return noop;
  }
  const unsub = store.subscribe(...callbacks);
  return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
}
function get_store_value(store) {
  let value;
  subscribe(store, (_) => value = _)();
  return value;
}
function component_subscribe(component, store, callback) {
  component.$$.on_destroy.push(subscribe(store, callback));
}
function create_slot(definition, ctx, $$scope, fn) {
  if (definition) {
    const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
    return definition[0](slot_ctx);
  }
}
function get_slot_context(definition, ctx, $$scope, fn) {
  return definition[1] && fn ? assign($$scope.ctx.slice(), definition[1](fn(ctx))) : $$scope.ctx;
}
function get_slot_changes(definition, $$scope, dirty, fn) {
  if (definition[2] && fn) {
    const lets = definition[2](fn(dirty));
    if ($$scope.dirty === void 0) {
      return lets;
    }
    if (typeof lets === "object") {
      const merged = [];
      const len = Math.max($$scope.dirty.length, lets.length);
      for (let i = 0; i < len; i += 1) {
        merged[i] = $$scope.dirty[i] | lets[i];
      }
      return merged;
    }
    return $$scope.dirty | lets;
  }
  return $$scope.dirty;
}
function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
  if (slot_changes) {
    const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
    slot.p(slot_context, slot_changes);
  }
}
function get_all_dirty_from_scope($$scope) {
  if ($$scope.ctx.length > 32) {
    const dirty = [];
    const length = $$scope.ctx.length / 32;
    for (let i = 0; i < length; i++) {
      dirty[i] = -1;
    }
    return dirty;
  }
  return -1;
}
function exclude_internal_props(props) {
  const result = {};
  for (const k in props) if (k[0] !== "$") result[k] = props[k];
  return result;
}
function null_to_empty(value) {
  return value == null ? "" : value;
}
function action_destroyer(action_result) {
  return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
}
function append(target, node) {
  target.appendChild(node);
}
function append_styles(target, style_sheet_id, styles) {
  const append_styles_to = get_root_for_style(target);
  if (!append_styles_to.getElementById(style_sheet_id)) {
    const style = element("style");
    style.id = style_sheet_id;
    style.textContent = styles;
    append_stylesheet(append_styles_to, style);
  }
}
function get_root_for_style(node) {
  if (!node) return document;
  const root = node.getRootNode ? node.getRootNode() : node.ownerDocument;
  if (root && /** @type {ShadowRoot} */
  root.host) {
    return (
      /** @type {ShadowRoot} */
      root
    );
  }
  return node.ownerDocument;
}
function append_stylesheet(node, style) {
  append(
    /** @type {Document} */
    node.head || node,
    style
  );
  return style.sheet;
}
function insert(target, node, anchor) {
  target.insertBefore(node, anchor || null);
}
function detach(node) {
  if (node.parentNode) {
    node.parentNode.removeChild(node);
  }
}
function destroy_each(iterations, detaching) {
  for (let i = 0; i < iterations.length; i += 1) {
    if (iterations[i]) iterations[i].d(detaching);
  }
}
function element(name) {
  return document.createElement(name);
}
function svg_element(name) {
  return document.createElementNS("http://www.w3.org/2000/svg", name);
}
function text(data) {
  return document.createTextNode(data);
}
function space() {
  return text(" ");
}
function empty() {
  return text("");
}
function listen(node, event, handler, options) {
  node.addEventListener(event, handler, options);
  return () => node.removeEventListener(event, handler, options);
}
function prevent_default(fn) {
  return function(event) {
    event.preventDefault();
    return fn.call(this, event);
  };
}
function attr(node, attribute, value) {
  if (value == null) node.removeAttribute(attribute);
  else if (node.getAttribute(attribute) !== value) node.setAttribute(attribute, value);
}
function xlink_attr(node, attribute, value) {
  node.setAttributeNS("http://www.w3.org/1999/xlink", attribute, value);
}
function children(element2) {
  return Array.from(element2.childNodes);
}
function set_data(text2, data) {
  data = "" + data;
  if (text2.data === data) return;
  text2.data = /** @type {string} */
  data;
}
function set_input_value(input, value) {
  input.value = value == null ? "" : value;
}
function set_style(node, key, value, important) {
  {
    node.style.setProperty(key, value, "");
  }
}
function toggle_class(element2, name, toggle) {
  element2.classList.toggle(name, !!toggle);
}
function custom_event(type, detail) {
  let {
    bubbles = false,
    cancelable = false
  } = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
  return new CustomEvent(type, {
    detail,
    bubbles,
    cancelable
  });
}
function construct_svelte_component(component, props) {
  return new component(props);
}
let current_component;
function set_current_component(component) {
  current_component = component;
}
function get_current_component() {
  if (!current_component) throw new Error("Function called outside component initialization");
  return current_component;
}
function onMount(fn) {
  get_current_component().$$.on_mount.push(fn);
}
function onDestroy(fn) {
  get_current_component().$$.on_destroy.push(fn);
}
function createEventDispatcher() {
  const component = get_current_component();
  return function(type, detail) {
    let {
      cancelable = false
    } = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
    const callbacks = component.$$.callbacks[type];
    if (callbacks) {
      const event = custom_event(
        /** @type {string} */
        type,
        detail,
        {
          cancelable
        }
      );
      callbacks.slice().forEach((fn) => {
        fn.call(component, event);
      });
      return !event.defaultPrevented;
    }
    return true;
  };
}
function setContext$1(key, context) {
  get_current_component().$$.context.set(key, context);
  return context;
}
function getContext$1(key) {
  return get_current_component().$$.context.get(key);
}
function bubble(component, event) {
  const callbacks = component.$$.callbacks[event.type];
  if (callbacks) {
    callbacks.slice().forEach((fn) => fn.call(this, event));
  }
}
const dirty_components = [];
const binding_callbacks = [];
let render_callbacks = [];
const flush_callbacks = [];
const resolved_promise = /* @__PURE__ */ Promise.resolve();
let update_scheduled = false;
function schedule_update() {
  if (!update_scheduled) {
    update_scheduled = true;
    resolved_promise.then(flush);
  }
}
function add_render_callback(fn) {
  render_callbacks.push(fn);
}
const seen_callbacks = /* @__PURE__ */ new Set();
let flushidx = 0;
function flush() {
  if (flushidx !== 0) {
    return;
  }
  const saved_component = current_component;
  do {
    try {
      while (flushidx < dirty_components.length) {
        const component = dirty_components[flushidx];
        flushidx++;
        set_current_component(component);
        update(component.$$);
      }
    } catch (e) {
      dirty_components.length = 0;
      flushidx = 0;
      throw e;
    }
    set_current_component(null);
    dirty_components.length = 0;
    flushidx = 0;
    while (binding_callbacks.length) binding_callbacks.pop()();
    for (let i = 0; i < render_callbacks.length; i += 1) {
      const callback = render_callbacks[i];
      if (!seen_callbacks.has(callback)) {
        seen_callbacks.add(callback);
        callback();
      }
    }
    render_callbacks.length = 0;
  } while (dirty_components.length);
  while (flush_callbacks.length) {
    flush_callbacks.pop()();
  }
  update_scheduled = false;
  seen_callbacks.clear();
  set_current_component(saved_component);
}
function update($$) {
  if ($$.fragment !== null) {
    $$.update();
    run_all($$.before_update);
    const dirty = $$.dirty;
    $$.dirty = [-1];
    $$.fragment && $$.fragment.p($$.ctx, dirty);
    $$.after_update.forEach(add_render_callback);
  }
}
function flush_render_callbacks(fns) {
  const filtered = [];
  const targets = [];
  render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
  targets.forEach((c) => c());
  render_callbacks = filtered;
}
const outroing = /* @__PURE__ */ new Set();
let outros;
function group_outros() {
  outros = {
    r: 0,
    c: [],
    p: outros
    // parent group
  };
}
function check_outros() {
  if (!outros.r) {
    run_all(outros.c);
  }
  outros = outros.p;
}
function transition_in(block, local) {
  if (block && block.i) {
    outroing.delete(block);
    block.i(local);
  }
}
function transition_out(block, local, detach2, callback) {
  if (block && block.o) {
    if (outroing.has(block)) return;
    outroing.add(block);
    outros.c.push(() => {
      outroing.delete(block);
      if (callback) {
        if (detach2) block.d(1);
        callback();
      }
    });
    block.o(local);
  } else if (callback) {
    callback();
  }
}
function ensure_array_like(array_like_or_iterator) {
  return (array_like_or_iterator === null || array_like_or_iterator === void 0 ? void 0 : array_like_or_iterator.length) !== void 0 ? array_like_or_iterator : Array.from(array_like_or_iterator);
}
function destroy_block(block, lookup) {
  block.d(1);
  lookup.delete(block.key);
}
function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block2, next, get_context) {
  let o = old_blocks.length;
  let n = list.length;
  let i = o;
  const old_indexes = {};
  while (i--) old_indexes[old_blocks[i].key] = i;
  const new_blocks = [];
  const new_lookup = /* @__PURE__ */ new Map();
  const deltas = /* @__PURE__ */ new Map();
  const updates = [];
  i = n;
  while (i--) {
    const child_ctx = get_context(ctx, list, i);
    const key = get_key(child_ctx);
    let block = lookup.get(key);
    if (!block) {
      block = create_each_block2(key, child_ctx);
      block.c();
    } else {
      updates.push(() => block.p(child_ctx, dirty));
    }
    new_lookup.set(key, new_blocks[i] = block);
    if (key in old_indexes) deltas.set(key, Math.abs(i - old_indexes[key]));
  }
  const will_move = /* @__PURE__ */ new Set();
  const did_move = /* @__PURE__ */ new Set();
  function insert2(block) {
    transition_in(block, 1);
    block.m(node, next);
    lookup.set(block.key, block);
    next = block.first;
    n--;
  }
  while (o && n) {
    const new_block = new_blocks[n - 1];
    const old_block = old_blocks[o - 1];
    const new_key = new_block.key;
    const old_key = old_block.key;
    if (new_block === old_block) {
      next = new_block.first;
      o--;
      n--;
    } else if (!new_lookup.has(old_key)) {
      destroy(old_block, lookup);
      o--;
    } else if (!lookup.has(new_key) || will_move.has(new_key)) {
      insert2(new_block);
    } else if (did_move.has(old_key)) {
      o--;
    } else if (deltas.get(new_key) > deltas.get(old_key)) {
      did_move.add(new_key);
      insert2(new_block);
    } else {
      will_move.add(old_key);
      o--;
    }
  }
  while (o--) {
    const old_block = old_blocks[o];
    if (!new_lookup.has(old_block.key)) destroy(old_block, lookup);
  }
  while (n) insert2(new_blocks[n - 1]);
  run_all(updates);
  return new_blocks;
}
function create_component(block) {
  block && block.c();
}
function mount_component(component, target, anchor) {
  const {
    fragment,
    after_update
  } = component.$$;
  fragment && fragment.m(target, anchor);
  add_render_callback(() => {
    const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
    if (component.$$.on_destroy) {
      component.$$.on_destroy.push(...new_on_destroy);
    } else {
      run_all(new_on_destroy);
    }
    component.$$.on_mount = [];
  });
  after_update.forEach(add_render_callback);
}
function destroy_component(component, detaching) {
  const $$ = component.$$;
  if ($$.fragment !== null) {
    flush_render_callbacks($$.after_update);
    run_all($$.on_destroy);
    $$.fragment && $$.fragment.d(detaching);
    $$.on_destroy = $$.fragment = null;
    $$.ctx = [];
  }
}
function make_dirty(component, i) {
  if (component.$$.dirty[0] === -1) {
    dirty_components.push(component);
    schedule_update();
    component.$$.dirty.fill(0);
  }
  component.$$.dirty[i / 31 | 0] |= 1 << i % 31;
}
function init(component, options, instance2, create_fragment2, not_equal, props) {
  let append_styles2 = arguments.length > 6 && arguments[6] !== void 0 ? arguments[6] : null;
  let dirty = arguments.length > 7 && arguments[7] !== void 0 ? arguments[7] : [-1];
  const parent_component = current_component;
  set_current_component(component);
  const $$ = component.$$ = {
    fragment: null,
    ctx: [],
    // state
    props,
    update: noop,
    not_equal,
    bound: blank_object(),
    // lifecycle
    on_mount: [],
    on_destroy: [],
    on_disconnect: [],
    before_update: [],
    after_update: [],
    context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
    // everything else
    callbacks: blank_object(),
    dirty,
    skip_bound: false,
    root: options.target || parent_component.$$.root
  };
  append_styles2 && append_styles2($$.root);
  let ready = false;
  $$.ctx = instance2 ? instance2(component, options.props || {}, function(i, ret) {
    const value = (arguments.length <= 2 ? 0 : arguments.length - 2) ? arguments.length <= 2 ? void 0 : arguments[2] : ret;
    if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
      if (!$$.skip_bound && $$.bound[i]) $$.bound[i](value);
      if (ready) make_dirty(component, i);
    }
    return ret;
  }) : [];
  $$.update();
  ready = true;
  run_all($$.before_update);
  $$.fragment = create_fragment2 ? create_fragment2($$.ctx) : false;
  if (options.target) {
    if (options.hydrate) {
      const nodes = children(options.target);
      $$.fragment && $$.fragment.l(nodes);
      nodes.forEach(detach);
    } else {
      $$.fragment && $$.fragment.c();
    }
    if (options.intro) transition_in(component.$$.fragment);
    mount_component(component, options.target, options.anchor);
    flush();
  }
  set_current_component(parent_component);
}
class SvelteComponent {
  constructor() {
    this.$$ = void 0;
    this.$$set = void 0;
  }
  /** @returns {void} */
  $destroy() {
    destroy_component(this, 1);
    this.$destroy = noop;
  }
  /**
   * @template {Extract<keyof Events, string>} K
   * @param {K} type
   * @param {((e: Events[K]) => void) | null | undefined} callback
   * @returns {() => void}
   */
  $on(type, callback) {
    if (!is_function(callback)) {
      return noop;
    }
    const callbacks = this.$$.callbacks[type] || (this.$$.callbacks[type] = []);
    callbacks.push(callback);
    return () => {
      const index = callbacks.indexOf(callback);
      if (index !== -1) callbacks.splice(index, 1);
    };
  }
  /**
   * @param {Partial<Props>} props
   * @returns {void}
   */
  $set(props) {
    if (this.$$set && !is_empty(props)) {
      this.$$.skip_bound = true;
      this.$$set(props);
      this.$$.skip_bound = false;
    }
  }
}
const PUBLIC_VERSION = "4";
if (typeof window !== "undefined")
  (window.__svelte || (window.__svelte = {
    v: /* @__PURE__ */ new Set()
  })).v.add(PUBLIC_VERSION);
const setContext = (ctx, val) => setContext$1(ctx, val);
const getContext = (ctx) => getContext$1(ctx);
function add_css$k(target) {
  append_styles(target, "svelte-1lt2k10", ".floating-btn.svelte-1lt2k10.svelte-1lt2k10{background:#363755;border:0;border-radius:50%;box-shadow:0 0 30px rgba(34, 34, 34, 0.3);cursor:pointer;position:fixed;padding:6px;transition:opacity 0.3s;-webkit-transition:opacity 0.3s;z-index:99999}.floating-btn.bottom-right.svelte-1lt2k10.svelte-1lt2k10{bottom:16px;right:16px}.floating-btn.bottom-left.svelte-1lt2k10.svelte-1lt2k10{bottom:16px;left:16px}.floating-btn.top-right.svelte-1lt2k10.svelte-1lt2k10{top:16px;right:16px}.floating-btn.top-left.svelte-1lt2k10.svelte-1lt2k10{top:16px;left:16px}.floating-btn.svelte-1lt2k10.svelte-1lt2k10:hover{opacity:0.7}.floating-btn.svelte-1lt2k10>svg.svelte-1lt2k10{display:block;width:34px;height:34px;position:relative}");
}
function create_fragment$k(ctx) {
  let button;
  let svg;
  let title;
  let t0;
  let desc;
  let t1;
  let use0;
  let use1;
  let use2;
  let use3;
  let use4;
  let use5;
  let use6;
  let defs;
  let path0;
  let path1;
  let path2;
  let path3;
  let path4;
  let path5;
  let path6;
  let button_class_value;
  let mounted;
  let dispose;
  return {
    c() {
      button = element("button");
      svg = svg_element("svg");
      title = svg_element("title");
      t0 = text("prosemirror");
      desc = svg_element("desc");
      t1 = text("Created using Figma");
      use0 = svg_element("use");
      use1 = svg_element("use");
      use2 = svg_element("use");
      use3 = svg_element("use");
      use4 = svg_element("use");
      use5 = svg_element("use");
      use6 = svg_element("use");
      defs = svg_element("defs");
      path0 = svg_element("path");
      path1 = svg_element("path");
      path2 = svg_element("path");
      path3 = svg_element("path");
      path4 = svg_element("path");
      path5 = svg_element("path");
      path6 = svg_element("path");
      xlink_attr(use0, "xlink:href", "#a");
      attr(use0, "transform", "matrix(2 0 0 2 118 116)");
      attr(use0, "fill", "#FFF");
      xlink_attr(use1, "xlink:href", "#b");
      attr(use1, "transform", "rotate(16 59.054 420.192) scale(2)");
      attr(use1, "fill", "#FFF");
      xlink_attr(use2, "xlink:href", "#c");
      attr(use2, "transform", "matrix(2 0 0 2 154.024 141.58)");
      attr(use2, "fill", "#363755");
      xlink_attr(use3, "xlink:href", "#d");
      attr(use3, "transform", "matrix(2 0 0 2 220 334.8)");
      attr(use3, "fill", "#FFF");
      xlink_attr(use4, "xlink:href", "#e");
      attr(use4, "transform", "matrix(2 0 0 2 218.826 262.052)");
      attr(use4, "fill", "#363755");
      xlink_attr(use5, "xlink:href", "#f");
      attr(use5, "transform", "matrix(2 0 0 2 197.108 184.998)");
      attr(use5, "fill", "#FFF");
      xlink_attr(use6, "xlink:href", "#g");
      attr(use6, "transform", "matrix(2 0 0 2 221.8 216)");
      attr(use6, "fill", "#363755");
      attr(path0, "id", "a");
      attr(path0, "d", "M73.5 0C32.859 0 0 32.859 0 73.5S32.859 147 73.5 147 147 114.141 147 73.5 114.069 0 73.5\n        0z");
      attr(path1, "id", "b");
      attr(path1, "d", "M193.601 107.116c0-13.376 8.238-23.91\n        20.619-31.153-2.244-7.447-5.19-14.6-8.824-21.32-13.886\n        3.633-25.12-1.799-34.568-11.26-9.449-9.437-12.344-20.672-8.709-34.571A111.362 111.362 0 0 0\n        140.799 0c-7.243 12.37-20.339 20.594-33.689 20.594-13.363\n        0-26.446-8.225-33.701-20.594A110.888 110.888 0 0 0 52.1 8.812c3.634 13.9.753 25.134-8.721\n        34.57-9.436 9.462-20.67 14.894-34.569 11.26A112.178 112.178 0 0 0 0 75.963c12.369 7.243\n        20.593 17.777 20.593 31.153 0 13.352-8.224 26.448-20.593 33.704a113.338 113.338 0 0 0 8.811\n        21.321c13.899-3.634 25.133-.752 34.569 8.697 9.448 9.462 12.355 20.696 8.721 34.57a112.653\n        112.653 0 0 0 21.32 8.837c7.243-12.407 20.338-20.619 33.702-20.619 13.35 0 26.446 8.225\n        33.701 20.619a114.22 114.22 0 0 0 21.32-8.837c-3.634-13.874-.752-25.108 8.709-34.57\n        9.449-9.437 20.683-14.869 34.569-11.26a112.343 112.343 0 0 0\n        8.823-21.321c-12.406-7.256-20.644-17.789-20.644-31.141zm-86.491 46.57c-25.732\n        0-46.58-20.849-46.58-46.57 0-25.733 20.86-46.595 46.58-46.595 25.732 0 46.567 20.875 46.567\n        46.595 0 25.734-20.835 46.57-46.567 46.57z");
      attr(path2, "id", "c");
      attr(path2, "d", "M98.088 49.91c-6.9 83.9 10.8 103.401 10.8 103.401s-55.1\n        5.499-82.7-13.401c-30.5-20.9-26-67.5-25.9-94.6.1-28.4 25.6-45.8 49.9-45.3 29.1.5 50.2 21.6\n        47.9 49.9z");
      attr(path3, "id", "d");
      attr(path3, "d", "M.1.1c12.2 33.3 22.5 42.7 40 55.2 25.3 18 36.6 17.5 76.3 41C78.1 60.3 30.8 45.7 0 0l.1.1z");
      attr(path4, "id", "e");
      attr(path4, "d", "M.687 36.474c3 13.3 17.9 29.9 30.4 41.6 24.8 23.2 42 22.4 86\n        54.7-18.2-51.8-18.8-62-43.5-106.1-24.7-44-67.6-20.3-67.6-20.3s-8.4 16.6-5.3 29.9v.2z");
      attr(path5, "id", "f");
      attr(path5, "d", "M38.346 11.5s-4-11.6-18-11.5c-30 .2-28.8 52.1 16.9 52 39.6-.1 39.2-49.4\n        16.1-49.6-10.2-.2-15 9.1-15 9.1z");
      attr(path6, "id", "g");
      attr(path6, "d", "M26.5 15c10.8 0 2 14.9-.6 20.9-1.8-8.4-10.2-20.9.6-20.9zM10.2.1C4.6.1 0 4.6 0 10.3c0 5.6\n        4.5 10.2 10.2 10.2 5.6 0 10.2-4.5 10.2-10.2C20.4 4.7 15.9.1 10.2.1zM40.7 0c-4.8 0-8.8\n        4.5-8.8 10.2 0 5.6 3.9 10.2 8.8 10.2 4.8 0 8.8-4.5 8.8-10.2C49.5 4.6 45.6 0 40.7 0z");
      attr(svg, "width", "530");
      attr(svg, "height", "530");
      attr(svg, "viewBox", "0 0 530 530");
      attr(svg, "xmlns", "http://www.w3.org/2000/svg");
      attr(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
      attr(svg, "class", "svelte-1lt2k10");
      attr(button, "class", button_class_value = null_to_empty("floating-btn ".concat(
        /*buttonPosition*/
        ctx[0]
      )) + " svelte-1lt2k10");
    },
    m(target, anchor) {
      insert(target, button, anchor);
      append(button, svg);
      append(svg, title);
      append(title, t0);
      append(svg, desc);
      append(desc, t1);
      append(svg, use0);
      append(svg, use1);
      append(svg, use2);
      append(svg, use3);
      append(svg, use4);
      append(svg, use5);
      append(svg, use6);
      append(svg, defs);
      append(defs, path0);
      append(defs, path1);
      append(defs, path2);
      append(defs, path3);
      append(defs, path4);
      append(defs, path5);
      append(defs, path6);
      if (!mounted) {
        dispose = listen(
          button,
          "click",
          /*click_handler*/
          ctx[1]
        );
        mounted = true;
      }
    },
    p(ctx2, _ref) {
      let [dirty] = _ref;
      if (dirty & /*buttonPosition*/
      1 && button_class_value !== (button_class_value = null_to_empty("floating-btn ".concat(
        /*buttonPosition*/
        ctx2[0]
      )) + " svelte-1lt2k10")) {
        attr(button, "class", button_class_value);
      }
    },
    i: noop,
    o: noop,
    d(detaching) {
      if (detaching) {
        detach(button);
      }
      mounted = false;
      dispose();
    }
  };
}
function instance$k($$self, $$props, $$invalidate) {
  let {
    buttonPosition
  } = $$props;
  function click_handler(event) {
    bubble.call(this, $$self, event);
  }
  $$self.$$set = ($$props2) => {
    if ("buttonPosition" in $$props2) $$invalidate(0, buttonPosition = $$props2.buttonPosition);
  };
  return [buttonPosition, click_handler];
}
class FloatingBtn extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$k, create_fragment$k, safe_not_equal, {
      buttonPosition: 0
    }, add_css$k);
  }
}
const subscriber_queue = [];
function readable(value, start) {
  return {
    subscribe: writable(value, start).subscribe
  };
}
function writable(value) {
  let start = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : noop;
  let stop;
  const subscribers = /* @__PURE__ */ new Set();
  function set(new_value) {
    if (safe_not_equal(value, new_value)) {
      value = new_value;
      if (stop) {
        const run_queue = !subscriber_queue.length;
        for (const subscriber of subscribers) {
          subscriber[1]();
          subscriber_queue.push(subscriber, value);
        }
        if (run_queue) {
          for (let i = 0; i < subscriber_queue.length; i += 2) {
            subscriber_queue[i][0](subscriber_queue[i + 1]);
          }
          subscriber_queue.length = 0;
        }
      }
    }
  }
  function update2(fn) {
    set(fn(value));
  }
  function subscribe2(run2) {
    let invalidate = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : noop;
    const subscriber = [run2, invalidate];
    subscribers.add(subscriber);
    if (subscribers.size === 1) {
      stop = start(set, update2) || noop;
    }
    run2(value);
    return () => {
      subscribers.delete(subscriber);
      if (subscribers.size === 0 && stop) {
        stop();
        stop = null;
      }
    };
  }
  return {
    set,
    update: update2,
    subscribe: subscribe2
  };
}
function derived(stores, fn, initial_value) {
  const single = !Array.isArray(stores);
  const stores_array = single ? [stores] : stores;
  if (!stores_array.every(Boolean)) {
    throw new Error("derived() expects stores as input, got a falsy value");
  }
  const auto = fn.length < 2;
  return readable(initial_value, (set, update2) => {
    let started = false;
    const values = [];
    let pending = 0;
    let cleanup = noop;
    const sync = () => {
      if (pending) {
        return;
      }
      cleanup();
      const result = fn(single ? values[0] : values, set, update2);
      if (auto) {
        set(result);
      } else {
        cleanup = is_function(result) ? result : noop;
      }
    };
    const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
      values[i] = value;
      pending &= ~(1 << i);
      if (started) {
        sync();
      }
    }, () => {
      pending |= 1 << i;
    }));
    started = true;
    sync();
    return function stop() {
      run_all(unsubscribers);
      cleanup();
      started = false;
    };
  });
}
const SNAPSHOTS_KEY = "__prosemirror-dev-toolkit__snapshots";
const snapshots = writable([]);
const selectedSnapshot = writable();
const previousEditorState = writable();
let canAccessLocalStorage = true;
function hydrate() {
  let persisted = null;
  try {
    persisted = localStorage.getItem(SNAPSHOTS_KEY);
  } catch (err) {
    canAccessLocalStorage = false;
  }
  if (persisted && persisted.length > 0) {
    try {
      const parsed = JSON.parse(persisted);
      snapshots.set(parsed);
    } catch (err) {
      console.error("Corrupted snapshots values in localStorage", err);
    }
  }
}
hydrate();
snapshots.subscribe((val) => {
  if (canAccessLocalStorage) {
    localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(val));
  }
});
function setEditorDoc(view2, doc2) {
  const node = view2.state.schema.nodeFromJSON(doc2);
  const tr = view2.state.tr;
  tr.replaceWith(0, view2.state.doc.nodeSize - 2, node.content);
  view2.dispatch(tr);
}
function saveSnapshot(snapshotName, doc2) {
  const snap = {
    name: snapshotName,
    timestamp: Date.now(),
    doc: doc2
  };
  snapshots.update((val) => [snap, ...val]);
  return snap;
}
function importSnapshot(snapshotName, json, schema2) {
  const doc2 = schema2.nodeFromJSON(json);
  const snap = {
    name: snapshotName,
    timestamp: Date.now(),
    doc: doc2.toJSON()
  };
  snapshots.update((val) => [snap, ...val]);
  return snap;
}
function updateSnapshot(snapshot) {
  snapshots.update((val) => val.map((s) => {
    if (s.timestamp === snapshot.timestamp) {
      return snapshot;
    }
    return s;
  }));
}
function toggleViewSnapshot(view2, snap) {
  if (snap) {
    const prevState = get_store_value(previousEditorState);
    if (!prevState)
      previousEditorState.set(view2.state);
    setEditorDoc(view2, snap.doc);
  } else {
    const prevState = get_store_value(previousEditorState);
    if (!prevState) {
      console.error("No previous state to restore!");
    } else {
      view2.updateState(prevState);
    }
    previousEditorState.set(void 0);
  }
  selectedSnapshot.set(snap);
}
function restoreSnapshot(view2, snap) {
  setEditorDoc(view2, snap.doc);
  previousEditorState.set(void 0);
  selectedSnapshot.set(void 0);
}
function exportSnapshot(snapshot) {
  const a = document.createElement("a");
  const file = new Blob([JSON.stringify(snapshot.doc)], { type: "application/json" });
  a.href = URL.createObjectURL(file);
  a.download = `${snapshot.name}.json`;
  a.click();
}
function deleteSnapshot(snapshot) {
  snapshots.update((val) => val.filter((s) => s.timestamp !== snapshot.timestamp));
  const selected = get_store_value(selectedSnapshot);
  if ((selected === null || selected === void 0 ? void 0 : selected.timestamp) === snapshot.timestamp) {
    selectedSnapshot.set(void 0);
  }
}
function clickOutside(el, onClickOutside) {
  const onClick = (event) => {
    el && !event.composedPath().includes(el) && !event.defaultPrevented && onClickOutside();
  };
  document.addEventListener("click", onClick, true);
  return {
    destroy() {
      document.removeEventListener("click", onClick, true);
    }
  };
}
function add_css$j(target) {
  append_styles(target, "svelte-19h7j7n", ".paste-modal.svelte-19h7j7n.svelte-19h7j7n{font-size:15px;height:100%;left:0;position:fixed;top:0;width:100%;z-index:1000}.paste-modal.svelte-19h7j7n>form.svelte-19h7j7n{display:flex;height:100%;justify-content:center;padding:64px}.modal-bg.svelte-19h7j7n.svelte-19h7j7n{background:#000;height:100%;left:0;opacity:0.8;position:absolute;top:0;width:100%;z-index:-1}fieldset.svelte-19h7j7n.svelte-19h7j7n{border-color:transparent;width:100%;max-width:800px}.submit-container.svelte-19h7j7n.svelte-19h7j7n{position:relative;width:100%}button.svelte-19h7j7n.svelte-19h7j7n{cursor:pointer;padding:4px 8px;position:absolute;right:-6px;top:-32px}legend.svelte-19h7j7n.svelte-19h7j7n{color:white}textarea.svelte-19h7j7n.svelte-19h7j7n{background:#fefcfc;height:calc(100vh - 128px);width:100%}");
}
function create_fragment$j(ctx) {
  let div2;
  let div0;
  let t0;
  let form;
  let fieldset;
  let div1;
  let t2;
  let legend;
  let t4;
  let textarea;
  let mounted;
  let dispose;
  return {
    c() {
      div2 = element("div");
      div0 = element("div");
      t0 = space();
      form = element("form");
      fieldset = element("fieldset");
      div1 = element("div");
      div1.innerHTML = '<button class="svelte-19h7j7n">Submit</button>';
      t2 = space();
      legend = element("legend");
      legend.textContent = "Doc";
      t4 = space();
      textarea = element("textarea");
      attr(div0, "class", "modal-bg svelte-19h7j7n");
      attr(div1, "class", "submit-container svelte-19h7j7n");
      attr(legend, "class", "svelte-19h7j7n");
      attr(textarea, "class", "svelte-19h7j7n");
      attr(fieldset, "class", "svelte-19h7j7n");
      attr(form, "class", "paste-content svelte-19h7j7n");
      attr(div2, "class", "paste-modal svelte-19h7j7n");
      toggle_class(div2, "hidden", !/*isOpen*/
      ctx[0]);
    },
    m(target, anchor) {
      insert(target, div2, anchor);
      append(div2, div0);
      append(div2, t0);
      append(div2, form);
      append(form, fieldset);
      append(fieldset, div1);
      append(fieldset, t2);
      append(fieldset, legend);
      append(fieldset, t4);
      append(fieldset, textarea);
      set_input_value(
        textarea,
        /*doc*/
        ctx[1]
      );
      if (!mounted) {
        dispose = [listen(
          textarea,
          "input",
          /*textarea_input_handler*/
          ctx[4]
        ), action_destroyer(clickOutside.call(
          null,
          fieldset,
          /*handleClickOutside*/
          ctx[2]
        )), listen(form, "submit", prevent_default(
          /*handleSubmit*/
          ctx[3]
        ))];
        mounted = true;
      }
    },
    p(ctx2, _ref) {
      let [dirty] = _ref;
      if (dirty & /*doc*/
      2) {
        set_input_value(
          textarea,
          /*doc*/
          ctx2[1]
        );
      }
      if (dirty & /*isOpen*/
      1) {
        toggle_class(div2, "hidden", !/*isOpen*/
        ctx2[0]);
      }
    },
    i: noop,
    o: noop,
    d(detaching) {
      if (detaching) {
        detach(div2);
      }
      mounted = false;
      run_all(dispose);
    }
  };
}
function instance$j($$self, $$props, $$invalidate) {
  let {
    isOpen
  } = $$props;
  let doc2;
  const dispatch = createEventDispatcher();
  function handleClickOutside() {
    dispatch("close");
  }
  function handleSubmit() {
    try {
      dispatch("submit", {
        doc: JSON.parse(doc2)
      });
    } catch (err) {
    }
  }
  function textarea_input_handler() {
    doc2 = this.value;
    $$invalidate(1, doc2);
  }
  $$self.$$set = ($$props2) => {
    if ("isOpen" in $$props2) $$invalidate(0, isOpen = $$props2.isOpen);
  };
  return [isOpen, doc2, handleClickOutside, handleSubmit, textarea_input_handler];
}
class PasteModal extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$j, create_fragment$j, safe_not_equal, {
      isOpen: 0
    }, add_css$j);
  }
}
function add_css$i(target) {
  append_styles(target, "svelte-10notzq", "ul.svelte-10notzq{display:flex;list-style:none;margin:0;overflow-x:scroll;padding:0}button.svelte-10notzq{background:transparent;border:0;border-bottom:2px solid transparent;color:#fff;cursor:pointer;height:100%;font-size:var(--font-medium);font-weight:400;padding:1em}button.svelte-10notzq:hover{background:rgba(255, 255, 255, 0.05)}button.active.svelte-10notzq{border-bottom:2px solid rgb(255, 162, 177)}");
}
function create_fragment$i(ctx) {
  let ul;
  let li0;
  let button0;
  let t1;
  let li1;
  let button1;
  let t3;
  let li2;
  let button2;
  let t5;
  let li3;
  let button3;
  let t7;
  let li4;
  let button4;
  let t9;
  let li5;
  let button5;
  let mounted;
  let dispose;
  return {
    c() {
      ul = element("ul");
      li0 = element("li");
      button0 = element("button");
      button0.textContent = "STATE";
      t1 = space();
      li1 = element("li");
      button1 = element("button");
      button1.textContent = "HISTORY";
      t3 = space();
      li2 = element("li");
      button2 = element("button");
      button2.textContent = "PLUGINS";
      t5 = space();
      li3 = element("li");
      button3 = element("button");
      button3.textContent = "SCHEMA";
      t7 = space();
      li4 = element("li");
      button4 = element("button");
      button4.textContent = "STRUCTURE";
      t9 = space();
      li5 = element("li");
      button5 = element("button");
      button5.textContent = "SNAPSHOTS";
      attr(button0, "class", "svelte-10notzq");
      toggle_class(
        button0,
        "active",
        /*active*/
        ctx[0] === "state"
      );
      attr(button1, "class", "svelte-10notzq");
      toggle_class(
        button1,
        "active",
        /*active*/
        ctx[0] === "history"
      );
      attr(button2, "class", "svelte-10notzq");
      toggle_class(
        button2,
        "active",
        /*active*/
        ctx[0] === "plugins"
      );
      attr(button3, "class", "svelte-10notzq");
      toggle_class(
        button3,
        "active",
        /*active*/
        ctx[0] === "schema"
      );
      attr(button4, "class", "svelte-10notzq");
      toggle_class(
        button4,
        "active",
        /*active*/
        ctx[0] === "structure"
      );
      attr(button5, "class", "svelte-10notzq");
      toggle_class(
        button5,
        "active",
        /*active*/
        ctx[0] === "snapshots"
      );
      attr(ul, "class", "tabs-menu svelte-10notzq");
    },
    m(target, anchor) {
      insert(target, ul, anchor);
      append(ul, li0);
      append(li0, button0);
      append(ul, t1);
      append(ul, li1);
      append(li1, button1);
      append(ul, t3);
      append(ul, li2);
      append(li2, button2);
      append(ul, t5);
      append(ul, li3);
      append(li3, button3);
      append(ul, t7);
      append(ul, li4);
      append(li4, button4);
      append(ul, t9);
      append(ul, li5);
      append(li5, button5);
      if (!mounted) {
        dispose = [listen(
          button0,
          "click",
          /*click_handler*/
          ctx[2]
        ), listen(
          button1,
          "click",
          /*click_handler_1*/
          ctx[3]
        ), listen(
          button2,
          "click",
          /*click_handler_2*/
          ctx[4]
        ), listen(
          button3,
          "click",
          /*click_handler_3*/
          ctx[5]
        ), listen(
          button4,
          "click",
          /*click_handler_4*/
          ctx[6]
        ), listen(
          button5,
          "click",
          /*click_handler_5*/
          ctx[7]
        )];
        mounted = true;
      }
    },
    p(ctx2, _ref) {
      let [dirty] = _ref;
      if (dirty & /*active*/
      1) {
        toggle_class(
          button0,
          "active",
          /*active*/
          ctx2[0] === "state"
        );
      }
      if (dirty & /*active*/
      1) {
        toggle_class(
          button1,
          "active",
          /*active*/
          ctx2[0] === "history"
        );
      }
      if (dirty & /*active*/
      1) {
        toggle_class(
          button2,
          "active",
          /*active*/
          ctx2[0] === "plugins"
        );
      }
      if (dirty & /*active*/
      1) {
        toggle_class(
          button3,
          "active",
          /*active*/
          ctx2[0] === "schema"
        );
      }
      if (dirty & /*active*/
      1) {
        toggle_class(
          button4,
          "active",
          /*active*/
          ctx2[0] === "structure"
        );
      }
      if (dirty & /*active*/
      1) {
        toggle_class(
          button5,
          "active",
          /*active*/
          ctx2[0] === "snapshots"
        );
      }
    },
    i: noop,
    o: noop,
    d(detaching) {
      if (detaching) {
        detach(ul);
      }
      mounted = false;
      run_all(dispose);
    }
  };
}
function instance$i($$self, $$props, $$invalidate) {
  let {
    active: active2,
    onClickTab
  } = $$props;
  const click_handler = () => onClickTab("state");
  const click_handler_1 = () => onClickTab("history");
  const click_handler_2 = () => onClickTab("plugins");
  const click_handler_3 = () => onClickTab("schema");
  const click_handler_4 = () => onClickTab("structure");
  const click_handler_5 = () => onClickTab("snapshots");
  $$self.$$set = ($$props2) => {
    if ("active" in $$props2) $$invalidate(0, active2 = $$props2.active);
    if ("onClickTab" in $$props2) $$invalidate(1, onClickTab = $$props2.onClickTab);
  };
  return [active2, onClickTab, click_handler, click_handler_1, click_handler_2, click_handler_3, click_handler_4, click_handler_5];
}
class TabsMenu extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$i, create_fragment$i, safe_not_equal, {
      active: 0,
      onClickTab: 1
    }, add_css$i);
  }
}
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
var diffMatchPatch = { exports: {} };
(function(module) {
  var diff_match_patch2 = function() {
    this.Diff_Timeout = 1;
    this.Diff_EditCost = 4;
    this.Match_Threshold = 0.5;
    this.Match_Distance = 1e3;
    this.Patch_DeleteThreshold = 0.5;
    this.Patch_Margin = 4;
    this.Match_MaxBits = 32;
  };
  var DIFF_DELETE = -1;
  var DIFF_INSERT = 1;
  var DIFF_EQUAL = 0;
  diff_match_patch2.Diff = function(op, text2) {
    return [op, text2];
  };
  diff_match_patch2.prototype.diff_main = function(text1, text2, opt_checklines, opt_deadline) {
    if (typeof opt_deadline == "undefined") {
      if (this.Diff_Timeout <= 0) {
        opt_deadline = Number.MAX_VALUE;
      } else {
        opt_deadline = (/* @__PURE__ */ new Date()).getTime() + this.Diff_Timeout * 1e3;
      }
    }
    var deadline = opt_deadline;
    if (text1 == null || text2 == null) {
      throw new Error("Null input. (diff_main)");
    }
    if (text1 == text2) {
      if (text1) {
        return [new diff_match_patch2.Diff(DIFF_EQUAL, text1)];
      }
      return [];
    }
    if (typeof opt_checklines == "undefined") {
      opt_checklines = true;
    }
    var checklines = opt_checklines;
    var commonlength = this.diff_commonPrefix(text1, text2);
    var commonprefix = text1.substring(0, commonlength);
    text1 = text1.substring(commonlength);
    text2 = text2.substring(commonlength);
    commonlength = this.diff_commonSuffix(text1, text2);
    var commonsuffix = text1.substring(text1.length - commonlength);
    text1 = text1.substring(0, text1.length - commonlength);
    text2 = text2.substring(0, text2.length - commonlength);
    var diffs = this.diff_compute_(text1, text2, checklines, deadline);
    if (commonprefix) {
      diffs.unshift(new diff_match_patch2.Diff(DIFF_EQUAL, commonprefix));
    }
    if (commonsuffix) {
      diffs.push(new diff_match_patch2.Diff(DIFF_EQUAL, commonsuffix));
    }
    this.diff_cleanupMerge(diffs);
    return diffs;
  };
  diff_match_patch2.prototype.diff_compute_ = function(text1, text2, checklines, deadline) {
    var diffs;
    if (!text1) {
      return [new diff_match_patch2.Diff(DIFF_INSERT, text2)];
    }
    if (!text2) {
      return [new diff_match_patch2.Diff(DIFF_DELETE, text1)];
    }
    var longtext = text1.length > text2.length ? text1 : text2;
    var shorttext = text1.length > text2.length ? text2 : text1;
    var i = longtext.indexOf(shorttext);
    if (i != -1) {
      diffs = [new diff_match_patch2.Diff(DIFF_INSERT, longtext.substring(0, i)), new diff_match_patch2.Diff(DIFF_EQUAL, shorttext), new diff_match_patch2.Diff(DIFF_INSERT, longtext.substring(i + shorttext.length))];
      if (text1.length > text2.length) {
        diffs[0][0] = diffs[2][0] = DIFF_DELETE;
      }
      return diffs;
    }
    if (shorttext.length == 1) {
      return [new diff_match_patch2.Diff(DIFF_DELETE, text1), new diff_match_patch2.Diff(DIFF_INSERT, text2)];
    }
    var hm = this.diff_halfMatch_(text1, text2);
    if (hm) {
      var text1_a = hm[0];
      var text1_b = hm[1];
      var text2_a = hm[2];
      var text2_b = hm[3];
      var mid_common = hm[4];
      var diffs_a = this.diff_main(text1_a, text2_a, checklines, deadline);
      var diffs_b = this.diff_main(text1_b, text2_b, checklines, deadline);
      return diffs_a.concat([new diff_match_patch2.Diff(DIFF_EQUAL, mid_common)], diffs_b);
    }
    if (checklines && text1.length > 100 && text2.length > 100) {
      return this.diff_lineMode_(text1, text2, deadline);
    }
    return this.diff_bisect_(text1, text2, deadline);
  };
  diff_match_patch2.prototype.diff_lineMode_ = function(text1, text2, deadline) {
    var a = this.diff_linesToChars_(text1, text2);
    text1 = a.chars1;
    text2 = a.chars2;
    var linearray = a.lineArray;
    var diffs = this.diff_main(text1, text2, false, deadline);
    this.diff_charsToLines_(diffs, linearray);
    this.diff_cleanupSemantic(diffs);
    diffs.push(new diff_match_patch2.Diff(DIFF_EQUAL, ""));
    var pointer = 0;
    var count_delete = 0;
    var count_insert = 0;
    var text_delete = "";
    var text_insert = "";
    while (pointer < diffs.length) {
      switch (diffs[pointer][0]) {
        case DIFF_INSERT:
          count_insert++;
          text_insert += diffs[pointer][1];
          break;
        case DIFF_DELETE:
          count_delete++;
          text_delete += diffs[pointer][1];
          break;
        case DIFF_EQUAL:
          if (count_delete >= 1 && count_insert >= 1) {
            diffs.splice(pointer - count_delete - count_insert, count_delete + count_insert);
            pointer = pointer - count_delete - count_insert;
            var subDiff = this.diff_main(text_delete, text_insert, false, deadline);
            for (var j = subDiff.length - 1; j >= 0; j--) {
              diffs.splice(pointer, 0, subDiff[j]);
            }
            pointer = pointer + subDiff.length;
          }
          count_insert = 0;
          count_delete = 0;
          text_delete = "";
          text_insert = "";
          break;
      }
      pointer++;
    }
    diffs.pop();
    return diffs;
  };
  diff_match_patch2.prototype.diff_bisect_ = function(text1, text2, deadline) {
    var text1_length = text1.length;
    var text2_length = text2.length;
    var max_d = Math.ceil((text1_length + text2_length) / 2);
    var v_offset = max_d;
    var v_length = 2 * max_d;
    var v1 = new Array(v_length);
    var v2 = new Array(v_length);
    for (var x = 0; x < v_length; x++) {
      v1[x] = -1;
      v2[x] = -1;
    }
    v1[v_offset + 1] = 0;
    v2[v_offset + 1] = 0;
    var delta = text1_length - text2_length;
    var front = delta % 2 != 0;
    var k1start = 0;
    var k1end = 0;
    var k2start = 0;
    var k2end = 0;
    for (var d = 0; d < max_d; d++) {
      if ((/* @__PURE__ */ new Date()).getTime() > deadline) {
        break;
      }
      for (var k1 = -d + k1start; k1 <= d - k1end; k1 += 2) {
        var k1_offset = v_offset + k1;
        var x1;
        if (k1 == -d || k1 != d && v1[k1_offset - 1] < v1[k1_offset + 1]) {
          x1 = v1[k1_offset + 1];
        } else {
          x1 = v1[k1_offset - 1] + 1;
        }
        var y1 = x1 - k1;
        while (x1 < text1_length && y1 < text2_length && text1.charAt(x1) == text2.charAt(y1)) {
          x1++;
          y1++;
        }
        v1[k1_offset] = x1;
        if (x1 > text1_length) {
          k1end += 2;
        } else if (y1 > text2_length) {
          k1start += 2;
        } else if (front) {
          var k2_offset = v_offset + delta - k1;
          if (k2_offset >= 0 && k2_offset < v_length && v2[k2_offset] != -1) {
            var x2 = text1_length - v2[k2_offset];
            if (x1 >= x2) {
              return this.diff_bisectSplit_(text1, text2, x1, y1, deadline);
            }
          }
        }
      }
      for (var k2 = -d + k2start; k2 <= d - k2end; k2 += 2) {
        var k2_offset = v_offset + k2;
        var x2;
        if (k2 == -d || k2 != d && v2[k2_offset - 1] < v2[k2_offset + 1]) {
          x2 = v2[k2_offset + 1];
        } else {
          x2 = v2[k2_offset - 1] + 1;
        }
        var y2 = x2 - k2;
        while (x2 < text1_length && y2 < text2_length && text1.charAt(text1_length - x2 - 1) == text2.charAt(text2_length - y2 - 1)) {
          x2++;
          y2++;
        }
        v2[k2_offset] = x2;
        if (x2 > text1_length) {
          k2end += 2;
        } else if (y2 > text2_length) {
          k2start += 2;
        } else if (!front) {
          var k1_offset = v_offset + delta - k2;
          if (k1_offset >= 0 && k1_offset < v_length && v1[k1_offset] != -1) {
            var x1 = v1[k1_offset];
            var y1 = v_offset + x1 - k1_offset;
            x2 = text1_length - x2;
            if (x1 >= x2) {
              return this.diff_bisectSplit_(text1, text2, x1, y1, deadline);
            }
          }
        }
      }
    }
    return [new diff_match_patch2.Diff(DIFF_DELETE, text1), new diff_match_patch2.Diff(DIFF_INSERT, text2)];
  };
  diff_match_patch2.prototype.diff_bisectSplit_ = function(text1, text2, x, y, deadline) {
    var text1a = text1.substring(0, x);
    var text2a = text2.substring(0, y);
    var text1b = text1.substring(x);
    var text2b = text2.substring(y);
    var diffs = this.diff_main(text1a, text2a, false, deadline);
    var diffsb = this.diff_main(text1b, text2b, false, deadline);
    return diffs.concat(diffsb);
  };
  diff_match_patch2.prototype.diff_linesToChars_ = function(text1, text2) {
    var lineArray = [];
    var lineHash = {};
    lineArray[0] = "";
    function diff_linesToCharsMunge_(text3) {
      var chars = "";
      var lineStart = 0;
      var lineEnd = -1;
      var lineArrayLength = lineArray.length;
      while (lineEnd < text3.length - 1) {
        lineEnd = text3.indexOf("\n", lineStart);
        if (lineEnd == -1) {
          lineEnd = text3.length - 1;
        }
        var line = text3.substring(lineStart, lineEnd + 1);
        if (lineHash.hasOwnProperty ? lineHash.hasOwnProperty(line) : lineHash[line] !== void 0) {
          chars += String.fromCharCode(lineHash[line]);
        } else {
          if (lineArrayLength == maxLines) {
            line = text3.substring(lineStart);
            lineEnd = text3.length;
          }
          chars += String.fromCharCode(lineArrayLength);
          lineHash[line] = lineArrayLength;
          lineArray[lineArrayLength++] = line;
        }
        lineStart = lineEnd + 1;
      }
      return chars;
    }
    var maxLines = 4e4;
    var chars1 = diff_linesToCharsMunge_(text1);
    maxLines = 65535;
    var chars2 = diff_linesToCharsMunge_(text2);
    return {
      chars1,
      chars2,
      lineArray
    };
  };
  diff_match_patch2.prototype.diff_charsToLines_ = function(diffs, lineArray) {
    for (var i = 0; i < diffs.length; i++) {
      var chars = diffs[i][1];
      var text2 = [];
      for (var j = 0; j < chars.length; j++) {
        text2[j] = lineArray[chars.charCodeAt(j)];
      }
      diffs[i][1] = text2.join("");
    }
  };
  diff_match_patch2.prototype.diff_commonPrefix = function(text1, text2) {
    if (!text1 || !text2 || text1.charAt(0) != text2.charAt(0)) {
      return 0;
    }
    var pointermin = 0;
    var pointermax = Math.min(text1.length, text2.length);
    var pointermid = pointermax;
    var pointerstart = 0;
    while (pointermin < pointermid) {
      if (text1.substring(pointerstart, pointermid) == text2.substring(pointerstart, pointermid)) {
        pointermin = pointermid;
        pointerstart = pointermin;
      } else {
        pointermax = pointermid;
      }
      pointermid = Math.floor((pointermax - pointermin) / 2 + pointermin);
    }
    return pointermid;
  };
  diff_match_patch2.prototype.diff_commonSuffix = function(text1, text2) {
    if (!text1 || !text2 || text1.charAt(text1.length - 1) != text2.charAt(text2.length - 1)) {
      return 0;
    }
    var pointermin = 0;
    var pointermax = Math.min(text1.length, text2.length);
    var pointermid = pointermax;
    var pointerend = 0;
    while (pointermin < pointermid) {
      if (text1.substring(text1.length - pointermid, text1.length - pointerend) == text2.substring(text2.length - pointermid, text2.length - pointerend)) {
        pointermin = pointermid;
        pointerend = pointermin;
      } else {
        pointermax = pointermid;
      }
      pointermid = Math.floor((pointermax - pointermin) / 2 + pointermin);
    }
    return pointermid;
  };
  diff_match_patch2.prototype.diff_commonOverlap_ = function(text1, text2) {
    var text1_length = text1.length;
    var text2_length = text2.length;
    if (text1_length == 0 || text2_length == 0) {
      return 0;
    }
    if (text1_length > text2_length) {
      text1 = text1.substring(text1_length - text2_length);
    } else if (text1_length < text2_length) {
      text2 = text2.substring(0, text1_length);
    }
    var text_length = Math.min(text1_length, text2_length);
    if (text1 == text2) {
      return text_length;
    }
    var best = 0;
    var length = 1;
    while (true) {
      var pattern = text1.substring(text_length - length);
      var found2 = text2.indexOf(pattern);
      if (found2 == -1) {
        return best;
      }
      length += found2;
      if (found2 == 0 || text1.substring(text_length - length) == text2.substring(0, length)) {
        best = length;
        length++;
      }
    }
  };
  diff_match_patch2.prototype.diff_halfMatch_ = function(text1, text2) {
    if (this.Diff_Timeout <= 0) {
      return null;
    }
    var longtext = text1.length > text2.length ? text1 : text2;
    var shorttext = text1.length > text2.length ? text2 : text1;
    if (longtext.length < 4 || shorttext.length * 2 < longtext.length) {
      return null;
    }
    var dmp2 = this;
    function diff_halfMatchI_(longtext2, shorttext2, i) {
      var seed = longtext2.substring(i, i + Math.floor(longtext2.length / 4));
      var j = -1;
      var best_common = "";
      var best_longtext_a, best_longtext_b, best_shorttext_a, best_shorttext_b;
      while ((j = shorttext2.indexOf(seed, j + 1)) != -1) {
        var prefixLength = dmp2.diff_commonPrefix(longtext2.substring(i), shorttext2.substring(j));
        var suffixLength = dmp2.diff_commonSuffix(longtext2.substring(0, i), shorttext2.substring(0, j));
        if (best_common.length < suffixLength + prefixLength) {
          best_common = shorttext2.substring(j - suffixLength, j) + shorttext2.substring(j, j + prefixLength);
          best_longtext_a = longtext2.substring(0, i - suffixLength);
          best_longtext_b = longtext2.substring(i + prefixLength);
          best_shorttext_a = shorttext2.substring(0, j - suffixLength);
          best_shorttext_b = shorttext2.substring(j + prefixLength);
        }
      }
      if (best_common.length * 2 >= longtext2.length) {
        return [best_longtext_a, best_longtext_b, best_shorttext_a, best_shorttext_b, best_common];
      } else {
        return null;
      }
    }
    var hm1 = diff_halfMatchI_(longtext, shorttext, Math.ceil(longtext.length / 4));
    var hm2 = diff_halfMatchI_(longtext, shorttext, Math.ceil(longtext.length / 2));
    var hm;
    if (!hm1 && !hm2) {
      return null;
    } else if (!hm2) {
      hm = hm1;
    } else if (!hm1) {
      hm = hm2;
    } else {
      hm = hm1[4].length > hm2[4].length ? hm1 : hm2;
    }
    var text1_a, text1_b, text2_a, text2_b;
    if (text1.length > text2.length) {
      text1_a = hm[0];
      text1_b = hm[1];
      text2_a = hm[2];
      text2_b = hm[3];
    } else {
      text2_a = hm[0];
      text2_b = hm[1];
      text1_a = hm[2];
      text1_b = hm[3];
    }
    var mid_common = hm[4];
    return [text1_a, text1_b, text2_a, text2_b, mid_common];
  };
  diff_match_patch2.prototype.diff_cleanupSemantic = function(diffs) {
    var changes = false;
    var equalities = [];
    var equalitiesLength = 0;
    var lastEquality = null;
    var pointer = 0;
    var length_insertions1 = 0;
    var length_deletions1 = 0;
    var length_insertions2 = 0;
    var length_deletions2 = 0;
    while (pointer < diffs.length) {
      if (diffs[pointer][0] == DIFF_EQUAL) {
        equalities[equalitiesLength++] = pointer;
        length_insertions1 = length_insertions2;
        length_deletions1 = length_deletions2;
        length_insertions2 = 0;
        length_deletions2 = 0;
        lastEquality = diffs[pointer][1];
      } else {
        if (diffs[pointer][0] == DIFF_INSERT) {
          length_insertions2 += diffs[pointer][1].length;
        } else {
          length_deletions2 += diffs[pointer][1].length;
        }
        if (lastEquality && lastEquality.length <= Math.max(length_insertions1, length_deletions1) && lastEquality.length <= Math.max(length_insertions2, length_deletions2)) {
          diffs.splice(equalities[equalitiesLength - 1], 0, new diff_match_patch2.Diff(DIFF_DELETE, lastEquality));
          diffs[equalities[equalitiesLength - 1] + 1][0] = DIFF_INSERT;
          equalitiesLength--;
          equalitiesLength--;
          pointer = equalitiesLength > 0 ? equalities[equalitiesLength - 1] : -1;
          length_insertions1 = 0;
          length_deletions1 = 0;
          length_insertions2 = 0;
          length_deletions2 = 0;
          lastEquality = null;
          changes = true;
        }
      }
      pointer++;
    }
    if (changes) {
      this.diff_cleanupMerge(diffs);
    }
    this.diff_cleanupSemanticLossless(diffs);
    pointer = 1;
    while (pointer < diffs.length) {
      if (diffs[pointer - 1][0] == DIFF_DELETE && diffs[pointer][0] == DIFF_INSERT) {
        var deletion = diffs[pointer - 1][1];
        var insertion = diffs[pointer][1];
        var overlap_length1 = this.diff_commonOverlap_(deletion, insertion);
        var overlap_length2 = this.diff_commonOverlap_(insertion, deletion);
        if (overlap_length1 >= overlap_length2) {
          if (overlap_length1 >= deletion.length / 2 || overlap_length1 >= insertion.length / 2) {
            diffs.splice(pointer, 0, new diff_match_patch2.Diff(DIFF_EQUAL, insertion.substring(0, overlap_length1)));
            diffs[pointer - 1][1] = deletion.substring(0, deletion.length - overlap_length1);
            diffs[pointer + 1][1] = insertion.substring(overlap_length1);
            pointer++;
          }
        } else {
          if (overlap_length2 >= deletion.length / 2 || overlap_length2 >= insertion.length / 2) {
            diffs.splice(pointer, 0, new diff_match_patch2.Diff(DIFF_EQUAL, deletion.substring(0, overlap_length2)));
            diffs[pointer - 1][0] = DIFF_INSERT;
            diffs[pointer - 1][1] = insertion.substring(0, insertion.length - overlap_length2);
            diffs[pointer + 1][0] = DIFF_DELETE;
            diffs[pointer + 1][1] = deletion.substring(overlap_length2);
            pointer++;
          }
        }
        pointer++;
      }
      pointer++;
    }
  };
  diff_match_patch2.prototype.diff_cleanupSemanticLossless = function(diffs) {
    function diff_cleanupSemanticScore_(one, two) {
      if (!one || !two) {
        return 6;
      }
      var char1 = one.charAt(one.length - 1);
      var char2 = two.charAt(0);
      var nonAlphaNumeric1 = char1.match(diff_match_patch2.nonAlphaNumericRegex_);
      var nonAlphaNumeric2 = char2.match(diff_match_patch2.nonAlphaNumericRegex_);
      var whitespace1 = nonAlphaNumeric1 && char1.match(diff_match_patch2.whitespaceRegex_);
      var whitespace2 = nonAlphaNumeric2 && char2.match(diff_match_patch2.whitespaceRegex_);
      var lineBreak1 = whitespace1 && char1.match(diff_match_patch2.linebreakRegex_);
      var lineBreak2 = whitespace2 && char2.match(diff_match_patch2.linebreakRegex_);
      var blankLine1 = lineBreak1 && one.match(diff_match_patch2.blanklineEndRegex_);
      var blankLine2 = lineBreak2 && two.match(diff_match_patch2.blanklineStartRegex_);
      if (blankLine1 || blankLine2) {
        return 5;
      } else if (lineBreak1 || lineBreak2) {
        return 4;
      } else if (nonAlphaNumeric1 && !whitespace1 && whitespace2) {
        return 3;
      } else if (whitespace1 || whitespace2) {
        return 2;
      } else if (nonAlphaNumeric1 || nonAlphaNumeric2) {
        return 1;
      }
      return 0;
    }
    var pointer = 1;
    while (pointer < diffs.length - 1) {
      if (diffs[pointer - 1][0] == DIFF_EQUAL && diffs[pointer + 1][0] == DIFF_EQUAL) {
        var equality1 = diffs[pointer - 1][1];
        var edit = diffs[pointer][1];
        var equality2 = diffs[pointer + 1][1];
        var commonOffset = this.diff_commonSuffix(equality1, edit);
        if (commonOffset) {
          var commonString = edit.substring(edit.length - commonOffset);
          equality1 = equality1.substring(0, equality1.length - commonOffset);
          edit = commonString + edit.substring(0, edit.length - commonOffset);
          equality2 = commonString + equality2;
        }
        var bestEquality1 = equality1;
        var bestEdit = edit;
        var bestEquality2 = equality2;
        var bestScore = diff_cleanupSemanticScore_(equality1, edit) + diff_cleanupSemanticScore_(edit, equality2);
        while (edit.charAt(0) === equality2.charAt(0)) {
          equality1 += edit.charAt(0);
          edit = edit.substring(1) + equality2.charAt(0);
          equality2 = equality2.substring(1);
          var score = diff_cleanupSemanticScore_(equality1, edit) + diff_cleanupSemanticScore_(edit, equality2);
          if (score >= bestScore) {
            bestScore = score;
            bestEquality1 = equality1;
            bestEdit = edit;
            bestEquality2 = equality2;
          }
        }
        if (diffs[pointer - 1][1] != bestEquality1) {
          if (bestEquality1) {
            diffs[pointer - 1][1] = bestEquality1;
          } else {
            diffs.splice(pointer - 1, 1);
            pointer--;
          }
          diffs[pointer][1] = bestEdit;
          if (bestEquality2) {
            diffs[pointer + 1][1] = bestEquality2;
          } else {
            diffs.splice(pointer + 1, 1);
            pointer--;
          }
        }
      }
      pointer++;
    }
  };
  diff_match_patch2.nonAlphaNumericRegex_ = /[^a-zA-Z0-9]/;
  diff_match_patch2.whitespaceRegex_ = /\s/;
  diff_match_patch2.linebreakRegex_ = /[\r\n]/;
  diff_match_patch2.blanklineEndRegex_ = /\n\r?\n$/;
  diff_match_patch2.blanklineStartRegex_ = /^\r?\n\r?\n/;
  diff_match_patch2.prototype.diff_cleanupEfficiency = function(diffs) {
    var changes = false;
    var equalities = [];
    var equalitiesLength = 0;
    var lastEquality = null;
    var pointer = 0;
    var pre_ins = false;
    var pre_del = false;
    var post_ins = false;
    var post_del = false;
    while (pointer < diffs.length) {
      if (diffs[pointer][0] == DIFF_EQUAL) {
        if (diffs[pointer][1].length < this.Diff_EditCost && (post_ins || post_del)) {
          equalities[equalitiesLength++] = pointer;
          pre_ins = post_ins;
          pre_del = post_del;
          lastEquality = diffs[pointer][1];
        } else {
          equalitiesLength = 0;
          lastEquality = null;
        }
        post_ins = post_del = false;
      } else {
        if (diffs[pointer][0] == DIFF_DELETE) {
          post_del = true;
        } else {
          post_ins = true;
        }
        if (lastEquality && (pre_ins && pre_del && post_ins && post_del || lastEquality.length < this.Diff_EditCost / 2 && pre_ins + pre_del + post_ins + post_del == 3)) {
          diffs.splice(equalities[equalitiesLength - 1], 0, new diff_match_patch2.Diff(DIFF_DELETE, lastEquality));
          diffs[equalities[equalitiesLength - 1] + 1][0] = DIFF_INSERT;
          equalitiesLength--;
          lastEquality = null;
          if (pre_ins && pre_del) {
            post_ins = post_del = true;
            equalitiesLength = 0;
          } else {
            equalitiesLength--;
            pointer = equalitiesLength > 0 ? equalities[equalitiesLength - 1] : -1;
            post_ins = post_del = false;
          }
          changes = true;
        }
      }
      pointer++;
    }
    if (changes) {
      this.diff_cleanupMerge(diffs);
    }
  };
  diff_match_patch2.prototype.diff_cleanupMerge = function(diffs) {
    diffs.push(new diff_match_patch2.Diff(DIFF_EQUAL, ""));
    var pointer = 0;
    var count_delete = 0;
    var count_insert = 0;
    var text_delete = "";
    var text_insert = "";
    var commonlength;
    while (pointer < diffs.length) {
      switch (diffs[pointer][0]) {
        case DIFF_INSERT:
          count_insert++;
          text_insert += diffs[pointer][1];
          pointer++;
          break;
        case DIFF_DELETE:
          count_delete++;
          text_delete += diffs[pointer][1];
          pointer++;
          break;
        case DIFF_EQUAL:
          if (count_delete + count_insert > 1) {
            if (count_delete !== 0 && count_insert !== 0) {
              commonlength = this.diff_commonPrefix(text_insert, text_delete);
              if (commonlength !== 0) {
                if (pointer - count_delete - count_insert > 0 && diffs[pointer - count_delete - count_insert - 1][0] == DIFF_EQUAL) {
                  diffs[pointer - count_delete - count_insert - 1][1] += text_insert.substring(0, commonlength);
                } else {
                  diffs.splice(0, 0, new diff_match_patch2.Diff(DIFF_EQUAL, text_insert.substring(0, commonlength)));
                  pointer++;
                }
                text_insert = text_insert.substring(commonlength);
                text_delete = text_delete.substring(commonlength);
              }
              commonlength = this.diff_commonSuffix(text_insert, text_delete);
              if (commonlength !== 0) {
                diffs[pointer][1] = text_insert.substring(text_insert.length - commonlength) + diffs[pointer][1];
                text_insert = text_insert.substring(0, text_insert.length - commonlength);
                text_delete = text_delete.substring(0, text_delete.length - commonlength);
              }
            }
            pointer -= count_delete + count_insert;
            diffs.splice(pointer, count_delete + count_insert);
            if (text_delete.length) {
              diffs.splice(pointer, 0, new diff_match_patch2.Diff(DIFF_DELETE, text_delete));
              pointer++;
            }
            if (text_insert.length) {
              diffs.splice(pointer, 0, new diff_match_patch2.Diff(DIFF_INSERT, text_insert));
              pointer++;
            }
            pointer++;
          } else if (pointer !== 0 && diffs[pointer - 1][0] == DIFF_EQUAL) {
            diffs[pointer - 1][1] += diffs[pointer][1];
            diffs.splice(pointer, 1);
          } else {
            pointer++;
          }
          count_insert = 0;
          count_delete = 0;
          text_delete = "";
          text_insert = "";
          break;
      }
    }
    if (diffs[diffs.length - 1][1] === "") {
      diffs.pop();
    }
    var changes = false;
    pointer = 1;
    while (pointer < diffs.length - 1) {
      if (diffs[pointer - 1][0] == DIFF_EQUAL && diffs[pointer + 1][0] == DIFF_EQUAL) {
        if (diffs[pointer][1].substring(diffs[pointer][1].length - diffs[pointer - 1][1].length) == diffs[pointer - 1][1]) {
          diffs[pointer][1] = diffs[pointer - 1][1] + diffs[pointer][1].substring(0, diffs[pointer][1].length - diffs[pointer - 1][1].length);
          diffs[pointer + 1][1] = diffs[pointer - 1][1] + diffs[pointer + 1][1];
          diffs.splice(pointer - 1, 1);
          changes = true;
        } else if (diffs[pointer][1].substring(0, diffs[pointer + 1][1].length) == diffs[pointer + 1][1]) {
          diffs[pointer - 1][1] += diffs[pointer + 1][1];
          diffs[pointer][1] = diffs[pointer][1].substring(diffs[pointer + 1][1].length) + diffs[pointer + 1][1];
          diffs.splice(pointer + 1, 1);
          changes = true;
        }
      }
      pointer++;
    }
    if (changes) {
      this.diff_cleanupMerge(diffs);
    }
  };
  diff_match_patch2.prototype.diff_xIndex = function(diffs, loc) {
    var chars1 = 0;
    var chars2 = 0;
    var last_chars1 = 0;
    var last_chars2 = 0;
    var x;
    for (x = 0; x < diffs.length; x++) {
      if (diffs[x][0] !== DIFF_INSERT) {
        chars1 += diffs[x][1].length;
      }
      if (diffs[x][0] !== DIFF_DELETE) {
        chars2 += diffs[x][1].length;
      }
      if (chars1 > loc) {
        break;
      }
      last_chars1 = chars1;
      last_chars2 = chars2;
    }
    if (diffs.length != x && diffs[x][0] === DIFF_DELETE) {
      return last_chars2;
    }
    return last_chars2 + (loc - last_chars1);
  };
  diff_match_patch2.prototype.diff_prettyHtml = function(diffs) {
    var html2 = [];
    var pattern_amp = /&/g;
    var pattern_lt = /</g;
    var pattern_gt = />/g;
    var pattern_para = /\n/g;
    for (var x = 0; x < diffs.length; x++) {
      var op = diffs[x][0];
      var data = diffs[x][1];
      var text2 = data.replace(pattern_amp, "&amp;").replace(pattern_lt, "&lt;").replace(pattern_gt, "&gt;").replace(pattern_para, "&para;<br>");
      switch (op) {
        case DIFF_INSERT:
          html2[x] = '<ins style="background:#e6ffe6;">' + text2 + "</ins>";
          break;
        case DIFF_DELETE:
          html2[x] = '<del style="background:#ffe6e6;">' + text2 + "</del>";
          break;
        case DIFF_EQUAL:
          html2[x] = "<span>" + text2 + "</span>";
          break;
      }
    }
    return html2.join("");
  };
  diff_match_patch2.prototype.diff_text1 = function(diffs) {
    var text2 = [];
    for (var x = 0; x < diffs.length; x++) {
      if (diffs[x][0] !== DIFF_INSERT) {
        text2[x] = diffs[x][1];
      }
    }
    return text2.join("");
  };
  diff_match_patch2.prototype.diff_text2 = function(diffs) {
    var text2 = [];
    for (var x = 0; x < diffs.length; x++) {
      if (diffs[x][0] !== DIFF_DELETE) {
        text2[x] = diffs[x][1];
      }
    }
    return text2.join("");
  };
  diff_match_patch2.prototype.diff_levenshtein = function(diffs) {
    var levenshtein = 0;
    var insertions = 0;
    var deletions = 0;
    for (var x = 0; x < diffs.length; x++) {
      var op = diffs[x][0];
      var data = diffs[x][1];
      switch (op) {
        case DIFF_INSERT:
          insertions += data.length;
          break;
        case DIFF_DELETE:
          deletions += data.length;
          break;
        case DIFF_EQUAL:
          levenshtein += Math.max(insertions, deletions);
          insertions = 0;
          deletions = 0;
          break;
      }
    }
    levenshtein += Math.max(insertions, deletions);
    return levenshtein;
  };
  diff_match_patch2.prototype.diff_toDelta = function(diffs) {
    var text2 = [];
    for (var x = 0; x < diffs.length; x++) {
      switch (diffs[x][0]) {
        case DIFF_INSERT:
          text2[x] = "+" + encodeURI(diffs[x][1]);
          break;
        case DIFF_DELETE:
          text2[x] = "-" + diffs[x][1].length;
          break;
        case DIFF_EQUAL:
          text2[x] = "=" + diffs[x][1].length;
          break;
      }
    }
    return text2.join("	").replace(/%20/g, " ");
  };
  diff_match_patch2.prototype.diff_fromDelta = function(text1, delta) {
    var diffs = [];
    var diffsLength = 0;
    var pointer = 0;
    var tokens = delta.split(/\t/g);
    for (var x = 0; x < tokens.length; x++) {
      var param = tokens[x].substring(1);
      switch (tokens[x].charAt(0)) {
        case "+":
          try {
            diffs[diffsLength++] = new diff_match_patch2.Diff(DIFF_INSERT, decodeURI(param));
          } catch (ex) {
            throw new Error("Illegal escape in diff_fromDelta: " + param);
          }
          break;
        case "-":
        case "=":
          var n = parseInt(param, 10);
          if (isNaN(n) || n < 0) {
            throw new Error("Invalid number in diff_fromDelta: " + param);
          }
          var text2 = text1.substring(pointer, pointer += n);
          if (tokens[x].charAt(0) == "=") {
            diffs[diffsLength++] = new diff_match_patch2.Diff(DIFF_EQUAL, text2);
          } else {
            diffs[diffsLength++] = new diff_match_patch2.Diff(DIFF_DELETE, text2);
          }
          break;
        default:
          if (tokens[x]) {
            throw new Error("Invalid diff operation in diff_fromDelta: " + tokens[x]);
          }
      }
    }
    if (pointer != text1.length) {
      throw new Error("Delta length (" + pointer + ") does not equal source text length (" + text1.length + ").");
    }
    return diffs;
  };
  diff_match_patch2.prototype.match_main = function(text2, pattern, loc) {
    if (text2 == null || pattern == null || loc == null) {
      throw new Error("Null input. (match_main)");
    }
    loc = Math.max(0, Math.min(loc, text2.length));
    if (text2 == pattern) {
      return 0;
    } else if (!text2.length) {
      return -1;
    } else if (text2.substring(loc, loc + pattern.length) == pattern) {
      return loc;
    } else {
      return this.match_bitap_(text2, pattern, loc);
    }
  };
  diff_match_patch2.prototype.match_bitap_ = function(text2, pattern, loc) {
    if (pattern.length > this.Match_MaxBits) {
      throw new Error("Pattern too long for this browser.");
    }
    var s = this.match_alphabet_(pattern);
    var dmp2 = this;
    function match_bitapScore_(e, x) {
      var accuracy = e / pattern.length;
      var proximity = Math.abs(loc - x);
      if (!dmp2.Match_Distance) {
        return proximity ? 1 : accuracy;
      }
      return accuracy + proximity / dmp2.Match_Distance;
    }
    var score_threshold = this.Match_Threshold;
    var best_loc = text2.indexOf(pattern, loc);
    if (best_loc != -1) {
      score_threshold = Math.min(match_bitapScore_(0, best_loc), score_threshold);
      best_loc = text2.lastIndexOf(pattern, loc + pattern.length);
      if (best_loc != -1) {
        score_threshold = Math.min(match_bitapScore_(0, best_loc), score_threshold);
      }
    }
    var matchmask = 1 << pattern.length - 1;
    best_loc = -1;
    var bin_min, bin_mid;
    var bin_max = pattern.length + text2.length;
    var last_rd;
    for (var d = 0; d < pattern.length; d++) {
      bin_min = 0;
      bin_mid = bin_max;
      while (bin_min < bin_mid) {
        if (match_bitapScore_(d, loc + bin_mid) <= score_threshold) {
          bin_min = bin_mid;
        } else {
          bin_max = bin_mid;
        }
        bin_mid = Math.floor((bin_max - bin_min) / 2 + bin_min);
      }
      bin_max = bin_mid;
      var start = Math.max(1, loc - bin_mid + 1);
      var finish = Math.min(loc + bin_mid, text2.length) + pattern.length;
      var rd = Array(finish + 2);
      rd[finish + 1] = (1 << d) - 1;
      for (var j = finish; j >= start; j--) {
        var charMatch = s[text2.charAt(j - 1)];
        if (d === 0) {
          rd[j] = (rd[j + 1] << 1 | 1) & charMatch;
        } else {
          rd[j] = (rd[j + 1] << 1 | 1) & charMatch | ((last_rd[j + 1] | last_rd[j]) << 1 | 1) | last_rd[j + 1];
        }
        if (rd[j] & matchmask) {
          var score = match_bitapScore_(d, j - 1);
          if (score <= score_threshold) {
            score_threshold = score;
            best_loc = j - 1;
            if (best_loc > loc) {
              start = Math.max(1, 2 * loc - best_loc);
            } else {
              break;
            }
          }
        }
      }
      if (match_bitapScore_(d + 1, loc) > score_threshold) {
        break;
      }
      last_rd = rd;
    }
    return best_loc;
  };
  diff_match_patch2.prototype.match_alphabet_ = function(pattern) {
    var s = {};
    for (var i = 0; i < pattern.length; i++) {
      s[pattern.charAt(i)] = 0;
    }
    for (var i = 0; i < pattern.length; i++) {
      s[pattern.charAt(i)] |= 1 << pattern.length - i - 1;
    }
    return s;
  };
  diff_match_patch2.prototype.patch_addContext_ = function(patch, text2) {
    if (text2.length == 0) {
      return;
    }
    if (patch.start2 === null) {
      throw Error("patch not initialized");
    }
    var pattern = text2.substring(patch.start2, patch.start2 + patch.length1);
    var padding = 0;
    while (text2.indexOf(pattern) != text2.lastIndexOf(pattern) && pattern.length < this.Match_MaxBits - this.Patch_Margin - this.Patch_Margin) {
      padding += this.Patch_Margin;
      pattern = text2.substring(patch.start2 - padding, patch.start2 + patch.length1 + padding);
    }
    padding += this.Patch_Margin;
    var prefix = text2.substring(patch.start2 - padding, patch.start2);
    if (prefix) {
      patch.diffs.unshift(new diff_match_patch2.Diff(DIFF_EQUAL, prefix));
    }
    var suffix = text2.substring(patch.start2 + patch.length1, patch.start2 + patch.length1 + padding);
    if (suffix) {
      patch.diffs.push(new diff_match_patch2.Diff(DIFF_EQUAL, suffix));
    }
    patch.start1 -= prefix.length;
    patch.start2 -= prefix.length;
    patch.length1 += prefix.length + suffix.length;
    patch.length2 += prefix.length + suffix.length;
  };
  diff_match_patch2.prototype.patch_make = function(a, opt_b, opt_c) {
    var text1, diffs;
    if (typeof a == "string" && typeof opt_b == "string" && typeof opt_c == "undefined") {
      text1 = /** @type {string} */
      a;
      diffs = this.diff_main(
        text1,
        /** @type {string} */
        opt_b,
        true
      );
      if (diffs.length > 2) {
        this.diff_cleanupSemantic(diffs);
        this.diff_cleanupEfficiency(diffs);
      }
    } else if (a && typeof a == "object" && typeof opt_b == "undefined" && typeof opt_c == "undefined") {
      diffs = /** @type {!Array.<!diff_match_patch.Diff>} */
      a;
      text1 = this.diff_text1(diffs);
    } else if (typeof a == "string" && opt_b && typeof opt_b == "object" && typeof opt_c == "undefined") {
      text1 = /** @type {string} */
      a;
      diffs = /** @type {!Array.<!diff_match_patch.Diff>} */
      opt_b;
    } else if (typeof a == "string" && typeof opt_b == "string" && opt_c && typeof opt_c == "object") {
      text1 = /** @type {string} */
      a;
      diffs = /** @type {!Array.<!diff_match_patch.Diff>} */
      opt_c;
    } else {
      throw new Error("Unknown call format to patch_make.");
    }
    if (diffs.length === 0) {
      return [];
    }
    var patches = [];
    var patch = new diff_match_patch2.patch_obj();
    var patchDiffLength = 0;
    var char_count1 = 0;
    var char_count2 = 0;
    var prepatch_text = text1;
    var postpatch_text = text1;
    for (var x = 0; x < diffs.length; x++) {
      var diff_type = diffs[x][0];
      var diff_text = diffs[x][1];
      if (!patchDiffLength && diff_type !== DIFF_EQUAL) {
        patch.start1 = char_count1;
        patch.start2 = char_count2;
      }
      switch (diff_type) {
        case DIFF_INSERT:
          patch.diffs[patchDiffLength++] = diffs[x];
          patch.length2 += diff_text.length;
          postpatch_text = postpatch_text.substring(0, char_count2) + diff_text + postpatch_text.substring(char_count2);
          break;
        case DIFF_DELETE:
          patch.length1 += diff_text.length;
          patch.diffs[patchDiffLength++] = diffs[x];
          postpatch_text = postpatch_text.substring(0, char_count2) + postpatch_text.substring(char_count2 + diff_text.length);
          break;
        case DIFF_EQUAL:
          if (diff_text.length <= 2 * this.Patch_Margin && patchDiffLength && diffs.length != x + 1) {
            patch.diffs[patchDiffLength++] = diffs[x];
            patch.length1 += diff_text.length;
            patch.length2 += diff_text.length;
          } else if (diff_text.length >= 2 * this.Patch_Margin) {
            if (patchDiffLength) {
              this.patch_addContext_(patch, prepatch_text);
              patches.push(patch);
              patch = new diff_match_patch2.patch_obj();
              patchDiffLength = 0;
              prepatch_text = postpatch_text;
              char_count1 = char_count2;
            }
          }
          break;
      }
      if (diff_type !== DIFF_INSERT) {
        char_count1 += diff_text.length;
      }
      if (diff_type !== DIFF_DELETE) {
        char_count2 += diff_text.length;
      }
    }
    if (patchDiffLength) {
      this.patch_addContext_(patch, prepatch_text);
      patches.push(patch);
    }
    return patches;
  };
  diff_match_patch2.prototype.patch_deepCopy = function(patches) {
    var patchesCopy = [];
    for (var x = 0; x < patches.length; x++) {
      var patch = patches[x];
      var patchCopy = new diff_match_patch2.patch_obj();
      patchCopy.diffs = [];
      for (var y = 0; y < patch.diffs.length; y++) {
        patchCopy.diffs[y] = new diff_match_patch2.Diff(patch.diffs[y][0], patch.diffs[y][1]);
      }
      patchCopy.start1 = patch.start1;
      patchCopy.start2 = patch.start2;
      patchCopy.length1 = patch.length1;
      patchCopy.length2 = patch.length2;
      patchesCopy[x] = patchCopy;
    }
    return patchesCopy;
  };
  diff_match_patch2.prototype.patch_apply = function(patches, text2) {
    if (patches.length == 0) {
      return [text2, []];
    }
    patches = this.patch_deepCopy(patches);
    var nullPadding = this.patch_addPadding(patches);
    text2 = nullPadding + text2 + nullPadding;
    this.patch_splitMax(patches);
    var delta = 0;
    var results = [];
    for (var x = 0; x < patches.length; x++) {
      var expected_loc = patches[x].start2 + delta;
      var text1 = this.diff_text1(patches[x].diffs);
      var start_loc;
      var end_loc = -1;
      if (text1.length > this.Match_MaxBits) {
        start_loc = this.match_main(text2, text1.substring(0, this.Match_MaxBits), expected_loc);
        if (start_loc != -1) {
          end_loc = this.match_main(text2, text1.substring(text1.length - this.Match_MaxBits), expected_loc + text1.length - this.Match_MaxBits);
          if (end_loc == -1 || start_loc >= end_loc) {
            start_loc = -1;
          }
        }
      } else {
        start_loc = this.match_main(text2, text1, expected_loc);
      }
      if (start_loc == -1) {
        results[x] = false;
        delta -= patches[x].length2 - patches[x].length1;
      } else {
        results[x] = true;
        delta = start_loc - expected_loc;
        var text22;
        if (end_loc == -1) {
          text22 = text2.substring(start_loc, start_loc + text1.length);
        } else {
          text22 = text2.substring(start_loc, end_loc + this.Match_MaxBits);
        }
        if (text1 == text22) {
          text2 = text2.substring(0, start_loc) + this.diff_text2(patches[x].diffs) + text2.substring(start_loc + text1.length);
        } else {
          var diffs = this.diff_main(text1, text22, false);
          if (text1.length > this.Match_MaxBits && this.diff_levenshtein(diffs) / text1.length > this.Patch_DeleteThreshold) {
            results[x] = false;
          } else {
            this.diff_cleanupSemanticLossless(diffs);
            var index1 = 0;
            var index2;
            for (var y = 0; y < patches[x].diffs.length; y++) {
              var mod = patches[x].diffs[y];
              if (mod[0] !== DIFF_EQUAL) {
                index2 = this.diff_xIndex(diffs, index1);
              }
              if (mod[0] === DIFF_INSERT) {
                text2 = text2.substring(0, start_loc + index2) + mod[1] + text2.substring(start_loc + index2);
              } else if (mod[0] === DIFF_DELETE) {
                text2 = text2.substring(0, start_loc + index2) + text2.substring(start_loc + this.diff_xIndex(diffs, index1 + mod[1].length));
              }
              if (mod[0] !== DIFF_DELETE) {
                index1 += mod[1].length;
              }
            }
          }
        }
      }
    }
    text2 = text2.substring(nullPadding.length, text2.length - nullPadding.length);
    return [text2, results];
  };
  diff_match_patch2.prototype.patch_addPadding = function(patches) {
    var paddingLength = this.Patch_Margin;
    var nullPadding = "";
    for (var x = 1; x <= paddingLength; x++) {
      nullPadding += String.fromCharCode(x);
    }
    for (var x = 0; x < patches.length; x++) {
      patches[x].start1 += paddingLength;
      patches[x].start2 += paddingLength;
    }
    var patch = patches[0];
    var diffs = patch.diffs;
    if (diffs.length == 0 || diffs[0][0] != DIFF_EQUAL) {
      diffs.unshift(new diff_match_patch2.Diff(DIFF_EQUAL, nullPadding));
      patch.start1 -= paddingLength;
      patch.start2 -= paddingLength;
      patch.length1 += paddingLength;
      patch.length2 += paddingLength;
    } else if (paddingLength > diffs[0][1].length) {
      var extraLength = paddingLength - diffs[0][1].length;
      diffs[0][1] = nullPadding.substring(diffs[0][1].length) + diffs[0][1];
      patch.start1 -= extraLength;
      patch.start2 -= extraLength;
      patch.length1 += extraLength;
      patch.length2 += extraLength;
    }
    patch = patches[patches.length - 1];
    diffs = patch.diffs;
    if (diffs.length == 0 || diffs[diffs.length - 1][0] != DIFF_EQUAL) {
      diffs.push(new diff_match_patch2.Diff(DIFF_EQUAL, nullPadding));
      patch.length1 += paddingLength;
      patch.length2 += paddingLength;
    } else if (paddingLength > diffs[diffs.length - 1][1].length) {
      var extraLength = paddingLength - diffs[diffs.length - 1][1].length;
      diffs[diffs.length - 1][1] += nullPadding.substring(0, extraLength);
      patch.length1 += extraLength;
      patch.length2 += extraLength;
    }
    return nullPadding;
  };
  diff_match_patch2.prototype.patch_splitMax = function(patches) {
    var patch_size = this.Match_MaxBits;
    for (var x = 0; x < patches.length; x++) {
      if (patches[x].length1 <= patch_size) {
        continue;
      }
      var bigpatch = patches[x];
      patches.splice(x--, 1);
      var start1 = bigpatch.start1;
      var start2 = bigpatch.start2;
      var precontext = "";
      while (bigpatch.diffs.length !== 0) {
        var patch = new diff_match_patch2.patch_obj();
        var empty2 = true;
        patch.start1 = start1 - precontext.length;
        patch.start2 = start2 - precontext.length;
        if (precontext !== "") {
          patch.length1 = patch.length2 = precontext.length;
          patch.diffs.push(new diff_match_patch2.Diff(DIFF_EQUAL, precontext));
        }
        while (bigpatch.diffs.length !== 0 && patch.length1 < patch_size - this.Patch_Margin) {
          var diff_type = bigpatch.diffs[0][0];
          var diff_text = bigpatch.diffs[0][1];
          if (diff_type === DIFF_INSERT) {
            patch.length2 += diff_text.length;
            start2 += diff_text.length;
            patch.diffs.push(bigpatch.diffs.shift());
            empty2 = false;
          } else if (diff_type === DIFF_DELETE && patch.diffs.length == 1 && patch.diffs[0][0] == DIFF_EQUAL && diff_text.length > 2 * patch_size) {
            patch.length1 += diff_text.length;
            start1 += diff_text.length;
            empty2 = false;
            patch.diffs.push(new diff_match_patch2.Diff(diff_type, diff_text));
            bigpatch.diffs.shift();
          } else {
            diff_text = diff_text.substring(0, patch_size - patch.length1 - this.Patch_Margin);
            patch.length1 += diff_text.length;
            start1 += diff_text.length;
            if (diff_type === DIFF_EQUAL) {
              patch.length2 += diff_text.length;
              start2 += diff_text.length;
            } else {
              empty2 = false;
            }
            patch.diffs.push(new diff_match_patch2.Diff(diff_type, diff_text));
            if (diff_text == bigpatch.diffs[0][1]) {
              bigpatch.diffs.shift();
            } else {
              bigpatch.diffs[0][1] = bigpatch.diffs[0][1].substring(diff_text.length);
            }
          }
        }
        precontext = this.diff_text2(patch.diffs);
        precontext = precontext.substring(precontext.length - this.Patch_Margin);
        var postcontext = this.diff_text1(bigpatch.diffs).substring(0, this.Patch_Margin);
        if (postcontext !== "") {
          patch.length1 += postcontext.length;
          patch.length2 += postcontext.length;
          if (patch.diffs.length !== 0 && patch.diffs[patch.diffs.length - 1][0] === DIFF_EQUAL) {
            patch.diffs[patch.diffs.length - 1][1] += postcontext;
          } else {
            patch.diffs.push(new diff_match_patch2.Diff(DIFF_EQUAL, postcontext));
          }
        }
        if (!empty2) {
          patches.splice(++x, 0, patch);
        }
      }
    }
  };
  diff_match_patch2.prototype.patch_toText = function(patches) {
    var text2 = [];
    for (var x = 0; x < patches.length; x++) {
      text2[x] = patches[x];
    }
    return text2.join("");
  };
  diff_match_patch2.prototype.patch_fromText = function(textline) {
    var patches = [];
    if (!textline) {
      return patches;
    }
    var text2 = textline.split("\n");
    var textPointer = 0;
    var patchHeader = /^@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@$/;
    while (textPointer < text2.length) {
      var m = text2[textPointer].match(patchHeader);
      if (!m) {
        throw new Error("Invalid patch string: " + text2[textPointer]);
      }
      var patch = new diff_match_patch2.patch_obj();
      patches.push(patch);
      patch.start1 = parseInt(m[1], 10);
      if (m[2] === "") {
        patch.start1--;
        patch.length1 = 1;
      } else if (m[2] == "0") {
        patch.length1 = 0;
      } else {
        patch.start1--;
        patch.length1 = parseInt(m[2], 10);
      }
      patch.start2 = parseInt(m[3], 10);
      if (m[4] === "") {
        patch.start2--;
        patch.length2 = 1;
      } else if (m[4] == "0") {
        patch.length2 = 0;
      } else {
        patch.start2--;
        patch.length2 = parseInt(m[4], 10);
      }
      textPointer++;
      while (textPointer < text2.length) {
        var sign = text2[textPointer].charAt(0);
        try {
          var line = decodeURI(text2[textPointer].substring(1));
        } catch (ex) {
          throw new Error("Illegal escape in patch_fromText: " + line);
        }
        if (sign == "-") {
          patch.diffs.push(new diff_match_patch2.Diff(DIFF_DELETE, line));
        } else if (sign == "+") {
          patch.diffs.push(new diff_match_patch2.Diff(DIFF_INSERT, line));
        } else if (sign == " ") {
          patch.diffs.push(new diff_match_patch2.Diff(DIFF_EQUAL, line));
        } else if (sign == "@") {
          break;
        } else if (sign === "") ;
        else {
          throw new Error('Invalid patch mode "' + sign + '" in: ' + line);
        }
        textPointer++;
      }
    }
    return patches;
  };
  diff_match_patch2.patch_obj = function() {
    this.diffs = [];
    this.start1 = null;
    this.start2 = null;
    this.length1 = 0;
    this.length2 = 0;
  };
  diff_match_patch2.patch_obj.prototype.toString = function() {
    var coords1, coords2;
    if (this.length1 === 0) {
      coords1 = this.start1 + ",0";
    } else if (this.length1 == 1) {
      coords1 = this.start1 + 1;
    } else {
      coords1 = this.start1 + 1 + "," + this.length1;
    }
    if (this.length2 === 0) {
      coords2 = this.start2 + ",0";
    } else if (this.length2 == 1) {
      coords2 = this.start2 + 1;
    } else {
      coords2 = this.start2 + 1 + "," + this.length2;
    }
    var text2 = ["@@ -" + coords1 + " +" + coords2 + " @@\n"];
    var op;
    for (var x = 0; x < this.diffs.length; x++) {
      switch (this.diffs[x][0]) {
        case DIFF_INSERT:
          op = "+";
          break;
        case DIFF_DELETE:
          op = "-";
          break;
        case DIFF_EQUAL:
          op = " ";
          break;
      }
      text2[x + 1] = op + encodeURI(this.diffs[x][1]) + "\n";
    }
    return text2.join("").replace(/%20/g, " ");
  };
  module.exports = diff_match_patch2;
  module.exports["diff_match_patch"] = diff_match_patch2;
  module.exports["DIFF_DELETE"] = DIFF_DELETE;
  module.exports["DIFF_INSERT"] = DIFF_INSERT;
  module.exports["DIFF_EQUAL"] = DIFF_EQUAL;
})(diffMatchPatch);
var diffMatchPatchExports = diffMatchPatch.exports;
var dmp = /* @__PURE__ */ getDefaultExportFromCjs(diffMatchPatchExports);
var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function(obj) {
  return typeof obj;
} : function(obj) {
  return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
};
var classCallCheck = function(instance2, Constructor) {
  if (!(instance2 instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};
var createClass = /* @__PURE__ */ function() {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }
  return function(Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();
var get = function get2(object, property, receiver) {
  if (object === null) object = Function.prototype;
  var desc = Object.getOwnPropertyDescriptor(object, property);
  if (desc === void 0) {
    var parent = Object.getPrototypeOf(object);
    if (parent === null) {
      return void 0;
    } else {
      return get2(parent, property, receiver);
    }
  } else if ("value" in desc) {
    return desc.value;
  } else {
    var getter = desc.get;
    if (getter === void 0) {
      return void 0;
    }
    return getter.call(receiver);
  }
};
var inherits = function(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }
  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
};
var possibleConstructorReturn = function(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }
  return call && (typeof call === "object" || typeof call === "function") ? call : self;
};
var Processor = function() {
  function Processor2(options) {
    classCallCheck(this, Processor2);
    this.selfOptions = options || {};
    this.pipes = {};
  }
  createClass(Processor2, [{
    key: "options",
    value: function options(_options) {
      if (_options) {
        this.selfOptions = _options;
      }
      return this.selfOptions;
    }
  }, {
    key: "pipe",
    value: function pipe(name, pipeArg) {
      var pipe2 = pipeArg;
      if (typeof name === "string") {
        if (typeof pipe2 === "undefined") {
          return this.pipes[name];
        } else {
          this.pipes[name] = pipe2;
        }
      }
      if (name && name.name) {
        pipe2 = name;
        if (pipe2.processor === this) {
          return pipe2;
        }
        this.pipes[pipe2.name] = pipe2;
      }
      pipe2.processor = this;
      return pipe2;
    }
  }, {
    key: "process",
    value: function process(input, pipe) {
      var context = input;
      context.options = this.options();
      var nextPipe = pipe || input.pipe || "default";
      var lastPipe = void 0;
      var lastContext = void 0;
      while (nextPipe) {
        if (typeof context.nextAfterChildren !== "undefined") {
          context.next = context.nextAfterChildren;
          context.nextAfterChildren = null;
        }
        if (typeof nextPipe === "string") {
          nextPipe = this.pipe(nextPipe);
        }
        nextPipe.process(context);
        lastContext = context;
        lastPipe = nextPipe;
        nextPipe = null;
        if (context) {
          if (context.next) {
            context = context.next;
            nextPipe = lastContext.nextPipe || context.pipe || lastPipe;
          }
        }
      }
      return context.hasResult ? context.result : void 0;
    }
  }]);
  return Processor2;
}();
var Pipe = function() {
  function Pipe2(name) {
    classCallCheck(this, Pipe2);
    this.name = name;
    this.filters = [];
  }
  createClass(Pipe2, [{
    key: "process",
    value: function process(input) {
      if (!this.processor) {
        throw new Error("add this pipe to a processor before using it");
      }
      var debug = this.debug;
      var length = this.filters.length;
      var context = input;
      for (var index = 0; index < length; index++) {
        var filter = this.filters[index];
        if (debug) {
          this.log("filter: " + filter.filterName);
        }
        filter(context);
        if ((typeof context === "undefined" ? "undefined" : _typeof(context)) === "object" && context.exiting) {
          context.exiting = false;
          break;
        }
      }
      if (!context.next && this.resultCheck) {
        this.resultCheck(context);
      }
    }
  }, {
    key: "log",
    value: function log(msg) {
      console.log("[jsondiffpatch] " + this.name + " pipe, " + msg);
    }
  }, {
    key: "append",
    value: function append2() {
      var _filters;
      (_filters = this.filters).push.apply(_filters, arguments);
      return this;
    }
  }, {
    key: "prepend",
    value: function prepend() {
      var _filters2;
      (_filters2 = this.filters).unshift.apply(_filters2, arguments);
      return this;
    }
  }, {
    key: "indexOf",
    value: function indexOf(filterName) {
      if (!filterName) {
        throw new Error("a filter name is required");
      }
      for (var index = 0; index < this.filters.length; index++) {
        var filter = this.filters[index];
        if (filter.filterName === filterName) {
          return index;
        }
      }
      throw new Error("filter not found: " + filterName);
    }
  }, {
    key: "list",
    value: function list() {
      return this.filters.map(function(f) {
        return f.filterName;
      });
    }
  }, {
    key: "after",
    value: function after(filterName) {
      var index = this.indexOf(filterName);
      var params = Array.prototype.slice.call(arguments, 1);
      if (!params.length) {
        throw new Error("a filter is required");
      }
      params.unshift(index + 1, 0);
      Array.prototype.splice.apply(this.filters, params);
      return this;
    }
  }, {
    key: "before",
    value: function before(filterName) {
      var index = this.indexOf(filterName);
      var params = Array.prototype.slice.call(arguments, 1);
      if (!params.length) {
        throw new Error("a filter is required");
      }
      params.unshift(index, 0);
      Array.prototype.splice.apply(this.filters, params);
      return this;
    }
  }, {
    key: "replace",
    value: function replace2(filterName) {
      var index = this.indexOf(filterName);
      var params = Array.prototype.slice.call(arguments, 1);
      if (!params.length) {
        throw new Error("a filter is required");
      }
      params.unshift(index, 1);
      Array.prototype.splice.apply(this.filters, params);
      return this;
    }
  }, {
    key: "remove",
    value: function remove(filterName) {
      var index = this.indexOf(filterName);
      this.filters.splice(index, 1);
      return this;
    }
  }, {
    key: "clear",
    value: function clear() {
      this.filters.length = 0;
      return this;
    }
  }, {
    key: "shouldHaveResult",
    value: function shouldHaveResult(should) {
      if (should === false) {
        this.resultCheck = null;
        return;
      }
      if (this.resultCheck) {
        return;
      }
      var pipe = this;
      this.resultCheck = function(context) {
        if (!context.hasResult) {
          console.log(context);
          var error = new Error(pipe.name + " failed");
          error.noResult = true;
          throw error;
        }
      };
      return this;
    }
  }]);
  return Pipe2;
}();
var Context = function() {
  function Context2() {
    classCallCheck(this, Context2);
  }
  createClass(Context2, [{
    key: "setResult",
    value: function setResult(result) {
      this.result = result;
      this.hasResult = true;
      return this;
    }
  }, {
    key: "exit",
    value: function exit() {
      this.exiting = true;
      return this;
    }
  }, {
    key: "switchTo",
    value: function switchTo(next, pipe) {
      if (typeof next === "string" || next instanceof Pipe) {
        this.nextPipe = next;
      } else {
        this.next = next;
        if (pipe) {
          this.nextPipe = pipe;
        }
      }
      return this;
    }
  }, {
    key: "push",
    value: function push(child, name) {
      child.parent = this;
      if (typeof name !== "undefined") {
        child.childName = name;
      }
      child.root = this.root || this;
      child.options = child.options || this.options;
      if (!this.children) {
        this.children = [child];
        this.nextAfterChildren = this.next || null;
        this.next = child;
      } else {
        this.children[this.children.length - 1].next = child;
        this.children.push(child);
      }
      child.next = this;
      return this;
    }
  }]);
  return Context2;
}();
var isArray = typeof Array.isArray === "function" ? Array.isArray : function(a) {
  return a instanceof Array;
};
function cloneRegExp(re) {
  var regexMatch = /^\/(.*)\/([gimyu]*)$/.exec(re.toString());
  return new RegExp(regexMatch[1], regexMatch[2]);
}
function clone(arg) {
  if ((typeof arg === "undefined" ? "undefined" : _typeof(arg)) !== "object") {
    return arg;
  }
  if (arg === null) {
    return null;
  }
  if (isArray(arg)) {
    return arg.map(clone);
  }
  if (arg instanceof Date) {
    return new Date(arg.getTime());
  }
  if (arg instanceof RegExp) {
    return cloneRegExp(arg);
  }
  var cloned = {};
  for (var name in arg) {
    if (Object.prototype.hasOwnProperty.call(arg, name)) {
      cloned[name] = clone(arg[name]);
    }
  }
  return cloned;
}
var DiffContext = function(_Context) {
  inherits(DiffContext2, _Context);
  function DiffContext2(left, right) {
    classCallCheck(this, DiffContext2);
    var _this = possibleConstructorReturn(this, (DiffContext2.__proto__ || Object.getPrototypeOf(DiffContext2)).call(this));
    _this.left = left;
    _this.right = right;
    _this.pipe = "diff";
    return _this;
  }
  createClass(DiffContext2, [{
    key: "setResult",
    value: function setResult(result) {
      if (this.options.cloneDiffValues && (typeof result === "undefined" ? "undefined" : _typeof(result)) === "object") {
        var clone$$1 = typeof this.options.cloneDiffValues === "function" ? this.options.cloneDiffValues : clone;
        if (_typeof(result[0]) === "object") {
          result[0] = clone$$1(result[0]);
        }
        if (_typeof(result[1]) === "object") {
          result[1] = clone$$1(result[1]);
        }
      }
      return Context.prototype.setResult.apply(this, arguments);
    }
  }]);
  return DiffContext2;
}(Context);
var PatchContext = function(_Context) {
  inherits(PatchContext2, _Context);
  function PatchContext2(left, delta) {
    classCallCheck(this, PatchContext2);
    var _this = possibleConstructorReturn(this, (PatchContext2.__proto__ || Object.getPrototypeOf(PatchContext2)).call(this));
    _this.left = left;
    _this.delta = delta;
    _this.pipe = "patch";
    return _this;
  }
  return PatchContext2;
}(Context);
var ReverseContext = function(_Context) {
  inherits(ReverseContext2, _Context);
  function ReverseContext2(delta) {
    classCallCheck(this, ReverseContext2);
    var _this = possibleConstructorReturn(this, (ReverseContext2.__proto__ || Object.getPrototypeOf(ReverseContext2)).call(this));
    _this.delta = delta;
    _this.pipe = "reverse";
    return _this;
  }
  return ReverseContext2;
}(Context);
var isArray$1 = typeof Array.isArray === "function" ? Array.isArray : function(a) {
  return a instanceof Array;
};
var diffFilter = function trivialMatchesDiffFilter(context) {
  if (context.left === context.right) {
    context.setResult(void 0).exit();
    return;
  }
  if (typeof context.left === "undefined") {
    if (typeof context.right === "function") {
      throw new Error("functions are not supported");
    }
    context.setResult([context.right]).exit();
    return;
  }
  if (typeof context.right === "undefined") {
    context.setResult([context.left, 0, 0]).exit();
    return;
  }
  if (typeof context.left === "function" || typeof context.right === "function") {
    throw new Error("functions are not supported");
  }
  context.leftType = context.left === null ? "null" : _typeof(context.left);
  context.rightType = context.right === null ? "null" : _typeof(context.right);
  if (context.leftType !== context.rightType) {
    context.setResult([context.left, context.right]).exit();
    return;
  }
  if (context.leftType === "boolean" || context.leftType === "number") {
    context.setResult([context.left, context.right]).exit();
    return;
  }
  if (context.leftType === "object") {
    context.leftIsArray = isArray$1(context.left);
  }
  if (context.rightType === "object") {
    context.rightIsArray = isArray$1(context.right);
  }
  if (context.leftIsArray !== context.rightIsArray) {
    context.setResult([context.left, context.right]).exit();
    return;
  }
  if (context.left instanceof RegExp) {
    if (context.right instanceof RegExp) {
      context.setResult([context.left.toString(), context.right.toString()]).exit();
    } else {
      context.setResult([context.left, context.right]).exit();
    }
  }
};
diffFilter.filterName = "trivial";
var patchFilter = function trivialMatchesPatchFilter(context) {
  if (typeof context.delta === "undefined") {
    context.setResult(context.left).exit();
    return;
  }
  context.nested = !isArray$1(context.delta);
  if (context.nested) {
    return;
  }
  if (context.delta.length === 1) {
    context.setResult(context.delta[0]).exit();
    return;
  }
  if (context.delta.length === 2) {
    if (context.left instanceof RegExp) {
      var regexArgs = /^\/(.*)\/([gimyu]+)$/.exec(context.delta[1]);
      if (regexArgs) {
        context.setResult(new RegExp(regexArgs[1], regexArgs[2])).exit();
        return;
      }
    }
    context.setResult(context.delta[1]).exit();
    return;
  }
  if (context.delta.length === 3 && context.delta[2] === 0) {
    context.setResult(void 0).exit();
  }
};
patchFilter.filterName = "trivial";
var reverseFilter = function trivialReferseFilter(context) {
  if (typeof context.delta === "undefined") {
    context.setResult(context.delta).exit();
    return;
  }
  context.nested = !isArray$1(context.delta);
  if (context.nested) {
    return;
  }
  if (context.delta.length === 1) {
    context.setResult([context.delta[0], 0, 0]).exit();
    return;
  }
  if (context.delta.length === 2) {
    context.setResult([context.delta[1], context.delta[0]]).exit();
    return;
  }
  if (context.delta.length === 3 && context.delta[2] === 0) {
    context.setResult([context.delta[0]]).exit();
  }
};
reverseFilter.filterName = "trivial";
function collectChildrenDiffFilter(context) {
  if (!context || !context.children) {
    return;
  }
  var length = context.children.length;
  var child = void 0;
  var result = context.result;
  for (var index = 0; index < length; index++) {
    child = context.children[index];
    if (typeof child.result === "undefined") {
      continue;
    }
    result = result || {};
    result[child.childName] = child.result;
  }
  if (result && context.leftIsArray) {
    result._t = "a";
  }
  context.setResult(result).exit();
}
collectChildrenDiffFilter.filterName = "collectChildren";
function objectsDiffFilter(context) {
  if (context.leftIsArray || context.leftType !== "object") {
    return;
  }
  var name = void 0;
  var child = void 0;
  var propertyFilter = context.options.propertyFilter;
  for (name in context.left) {
    if (!Object.prototype.hasOwnProperty.call(context.left, name)) {
      continue;
    }
    if (propertyFilter && !propertyFilter(name, context)) {
      continue;
    }
    child = new DiffContext(context.left[name], context.right[name]);
    context.push(child, name);
  }
  for (name in context.right) {
    if (!Object.prototype.hasOwnProperty.call(context.right, name)) {
      continue;
    }
    if (propertyFilter && !propertyFilter(name, context)) {
      continue;
    }
    if (typeof context.left[name] === "undefined") {
      child = new DiffContext(void 0, context.right[name]);
      context.push(child, name);
    }
  }
  if (!context.children || context.children.length === 0) {
    context.setResult(void 0).exit();
    return;
  }
  context.exit();
}
objectsDiffFilter.filterName = "objects";
var patchFilter$1 = function nestedPatchFilter(context) {
  if (!context.nested) {
    return;
  }
  if (context.delta._t) {
    return;
  }
  var name = void 0;
  var child = void 0;
  for (name in context.delta) {
    child = new PatchContext(context.left[name], context.delta[name]);
    context.push(child, name);
  }
  context.exit();
};
patchFilter$1.filterName = "objects";
var collectChildrenPatchFilter = function collectChildrenPatchFilter2(context) {
  if (!context || !context.children) {
    return;
  }
  if (context.delta._t) {
    return;
  }
  var length = context.children.length;
  var child = void 0;
  for (var index = 0; index < length; index++) {
    child = context.children[index];
    if (Object.prototype.hasOwnProperty.call(context.left, child.childName) && child.result === void 0) {
      delete context.left[child.childName];
    } else if (context.left[child.childName] !== child.result) {
      context.left[child.childName] = child.result;
    }
  }
  context.setResult(context.left).exit();
};
collectChildrenPatchFilter.filterName = "collectChildren";
var reverseFilter$1 = function nestedReverseFilter(context) {
  if (!context.nested) {
    return;
  }
  if (context.delta._t) {
    return;
  }
  var name = void 0;
  var child = void 0;
  for (name in context.delta) {
    child = new ReverseContext(context.delta[name]);
    context.push(child, name);
  }
  context.exit();
};
reverseFilter$1.filterName = "objects";
function collectChildrenReverseFilter(context) {
  if (!context || !context.children) {
    return;
  }
  if (context.delta._t) {
    return;
  }
  var length = context.children.length;
  var child = void 0;
  var delta = {};
  for (var index = 0; index < length; index++) {
    child = context.children[index];
    if (delta[child.childName] !== child.result) {
      delta[child.childName] = child.result;
    }
  }
  context.setResult(delta).exit();
}
collectChildrenReverseFilter.filterName = "collectChildren";
var defaultMatch = function defaultMatch2(array1, array2, index1, index2) {
  return array1[index1] === array2[index2];
};
var lengthMatrix = function lengthMatrix2(array1, array2, match, context) {
  var len1 = array1.length;
  var len2 = array2.length;
  var x = void 0, y = void 0;
  var matrix = [len1 + 1];
  for (x = 0; x < len1 + 1; x++) {
    matrix[x] = [len2 + 1];
    for (y = 0; y < len2 + 1; y++) {
      matrix[x][y] = 0;
    }
  }
  matrix.match = match;
  for (x = 1; x < len1 + 1; x++) {
    for (y = 1; y < len2 + 1; y++) {
      if (match(array1, array2, x - 1, y - 1, context)) {
        matrix[x][y] = matrix[x - 1][y - 1] + 1;
      } else {
        matrix[x][y] = Math.max(matrix[x - 1][y], matrix[x][y - 1]);
      }
    }
  }
  return matrix;
};
var backtrack = function backtrack2(matrix, array1, array2, context) {
  var index1 = array1.length;
  var index2 = array2.length;
  var subsequence = {
    sequence: [],
    indices1: [],
    indices2: []
  };
  while (index1 !== 0 && index2 !== 0) {
    var sameLetter = matrix.match(array1, array2, index1 - 1, index2 - 1, context);
    if (sameLetter) {
      subsequence.sequence.unshift(array1[index1 - 1]);
      subsequence.indices1.unshift(index1 - 1);
      subsequence.indices2.unshift(index2 - 1);
      --index1;
      --index2;
    } else {
      var valueAtMatrixAbove = matrix[index1][index2 - 1];
      var valueAtMatrixLeft = matrix[index1 - 1][index2];
      if (valueAtMatrixAbove > valueAtMatrixLeft) {
        --index2;
      } else {
        --index1;
      }
    }
  }
  return subsequence;
};
var get$1 = function get3(array1, array2, match, context) {
  var innerContext = context || {};
  var matrix = lengthMatrix(array1, array2, match || defaultMatch, innerContext);
  var result = backtrack(matrix, array1, array2, innerContext);
  if (typeof array1 === "string" && typeof array2 === "string") {
    result.sequence = result.sequence.join("");
  }
  return result;
};
var lcs = {
  get: get$1
};
var ARRAY_MOVE = 3;
var isArray$2 = typeof Array.isArray === "function" ? Array.isArray : function(a) {
  return a instanceof Array;
};
var arrayIndexOf = typeof Array.prototype.indexOf === "function" ? function(array, item) {
  return array.indexOf(item);
} : function(array, item) {
  var length = array.length;
  for (var i = 0; i < length; i++) {
    if (array[i] === item) {
      return i;
    }
  }
  return -1;
};
function arraysHaveMatchByRef(array1, array2, len1, len2) {
  for (var index1 = 0; index1 < len1; index1++) {
    var val1 = array1[index1];
    for (var index2 = 0; index2 < len2; index2++) {
      var val2 = array2[index2];
      if (index1 !== index2 && val1 === val2) {
        return true;
      }
    }
  }
}
function matchItems(array1, array2, index1, index2, context) {
  var value1 = array1[index1];
  var value2 = array2[index2];
  if (value1 === value2) {
    return true;
  }
  if ((typeof value1 === "undefined" ? "undefined" : _typeof(value1)) !== "object" || (typeof value2 === "undefined" ? "undefined" : _typeof(value2)) !== "object") {
    return false;
  }
  var objectHash = context.objectHash;
  if (!objectHash) {
    return context.matchByPosition && index1 === index2;
  }
  var hash1 = void 0;
  var hash2 = void 0;
  if (typeof index1 === "number") {
    context.hashCache1 = context.hashCache1 || [];
    hash1 = context.hashCache1[index1];
    if (typeof hash1 === "undefined") {
      context.hashCache1[index1] = hash1 = objectHash(value1, index1);
    }
  } else {
    hash1 = objectHash(value1);
  }
  if (typeof hash1 === "undefined") {
    return false;
  }
  if (typeof index2 === "number") {
    context.hashCache2 = context.hashCache2 || [];
    hash2 = context.hashCache2[index2];
    if (typeof hash2 === "undefined") {
      context.hashCache2[index2] = hash2 = objectHash(value2, index2);
    }
  } else {
    hash2 = objectHash(value2);
  }
  if (typeof hash2 === "undefined") {
    return false;
  }
  return hash1 === hash2;
}
var diffFilter$1 = function arraysDiffFilter(context) {
  if (!context.leftIsArray) {
    return;
  }
  var matchContext = {
    objectHash: context.options && context.options.objectHash,
    matchByPosition: context.options && context.options.matchByPosition
  };
  var commonHead = 0;
  var commonTail = 0;
  var index = void 0;
  var index1 = void 0;
  var index2 = void 0;
  var array1 = context.left;
  var array2 = context.right;
  var len1 = array1.length;
  var len2 = array2.length;
  var child = void 0;
  if (len1 > 0 && len2 > 0 && !matchContext.objectHash && typeof matchContext.matchByPosition !== "boolean") {
    matchContext.matchByPosition = !arraysHaveMatchByRef(array1, array2, len1, len2);
  }
  while (commonHead < len1 && commonHead < len2 && matchItems(array1, array2, commonHead, commonHead, matchContext)) {
    index = commonHead;
    child = new DiffContext(context.left[index], context.right[index]);
    context.push(child, index);
    commonHead++;
  }
  while (commonTail + commonHead < len1 && commonTail + commonHead < len2 && matchItems(array1, array2, len1 - 1 - commonTail, len2 - 1 - commonTail, matchContext)) {
    index1 = len1 - 1 - commonTail;
    index2 = len2 - 1 - commonTail;
    child = new DiffContext(context.left[index1], context.right[index2]);
    context.push(child, index2);
    commonTail++;
  }
  var result = void 0;
  if (commonHead + commonTail === len1) {
    if (len1 === len2) {
      context.setResult(void 0).exit();
      return;
    }
    result = result || {
      _t: "a"
    };
    for (index = commonHead; index < len2 - commonTail; index++) {
      result[index] = [array2[index]];
    }
    context.setResult(result).exit();
    return;
  }
  if (commonHead + commonTail === len2) {
    result = result || {
      _t: "a"
    };
    for (index = commonHead; index < len1 - commonTail; index++) {
      result["_" + index] = [array1[index], 0, 0];
    }
    context.setResult(result).exit();
    return;
  }
  delete matchContext.hashCache1;
  delete matchContext.hashCache2;
  var trimmed1 = array1.slice(commonHead, len1 - commonTail);
  var trimmed2 = array2.slice(commonHead, len2 - commonTail);
  var seq = lcs.get(trimmed1, trimmed2, matchItems, matchContext);
  var removedItems = [];
  result = result || {
    _t: "a"
  };
  for (index = commonHead; index < len1 - commonTail; index++) {
    if (arrayIndexOf(seq.indices1, index - commonHead) < 0) {
      result["_" + index] = [array1[index], 0, 0];
      removedItems.push(index);
    }
  }
  var detectMove = true;
  if (context.options && context.options.arrays && context.options.arrays.detectMove === false) {
    detectMove = false;
  }
  var includeValueOnMove = false;
  if (context.options && context.options.arrays && context.options.arrays.includeValueOnMove) {
    includeValueOnMove = true;
  }
  var removedItemsLength = removedItems.length;
  for (index = commonHead; index < len2 - commonTail; index++) {
    var indexOnArray2 = arrayIndexOf(seq.indices2, index - commonHead);
    if (indexOnArray2 < 0) {
      var isMove = false;
      if (detectMove && removedItemsLength > 0) {
        for (var removeItemIndex1 = 0; removeItemIndex1 < removedItemsLength; removeItemIndex1++) {
          index1 = removedItems[removeItemIndex1];
          if (matchItems(trimmed1, trimmed2, index1 - commonHead, index - commonHead, matchContext)) {
            result["_" + index1].splice(1, 2, index, ARRAY_MOVE);
            if (!includeValueOnMove) {
              result["_" + index1][0] = "";
            }
            index2 = index;
            child = new DiffContext(context.left[index1], context.right[index2]);
            context.push(child, index2);
            removedItems.splice(removeItemIndex1, 1);
            isMove = true;
            break;
          }
        }
      }
      if (!isMove) {
        result[index] = [array2[index]];
      }
    } else {
      index1 = seq.indices1[indexOnArray2] + commonHead;
      index2 = seq.indices2[indexOnArray2] + commonHead;
      child = new DiffContext(context.left[index1], context.right[index2]);
      context.push(child, index2);
    }
  }
  context.setResult(result).exit();
};
diffFilter$1.filterName = "arrays";
var compare = {
  numerically: function numerically(a, b) {
    return a - b;
  },
  numericallyBy: function numericallyBy(name) {
    return function(a, b) {
      return a[name] - b[name];
    };
  }
};
var patchFilter$2 = function nestedPatchFilter2(context) {
  if (!context.nested) {
    return;
  }
  if (context.delta._t !== "a") {
    return;
  }
  var index = void 0;
  var index1 = void 0;
  var delta = context.delta;
  var array = context.left;
  var toRemove = [];
  var toInsert = [];
  var toModify = [];
  for (index in delta) {
    if (index !== "_t") {
      if (index[0] === "_") {
        if (delta[index][2] === 0 || delta[index][2] === ARRAY_MOVE) {
          toRemove.push(parseInt(index.slice(1), 10));
        } else {
          throw new Error("only removal or move can be applied at original array indices," + (" invalid diff type: " + delta[index][2]));
        }
      } else {
        if (delta[index].length === 1) {
          toInsert.push({
            index: parseInt(index, 10),
            value: delta[index][0]
          });
        } else {
          toModify.push({
            index: parseInt(index, 10),
            delta: delta[index]
          });
        }
      }
    }
  }
  toRemove = toRemove.sort(compare.numerically);
  for (index = toRemove.length - 1; index >= 0; index--) {
    index1 = toRemove[index];
    var indexDiff = delta["_" + index1];
    var removedValue = array.splice(index1, 1)[0];
    if (indexDiff[2] === ARRAY_MOVE) {
      toInsert.push({
        index: indexDiff[1],
        value: removedValue
      });
    }
  }
  toInsert = toInsert.sort(compare.numericallyBy("index"));
  var toInsertLength = toInsert.length;
  for (index = 0; index < toInsertLength; index++) {
    var insertion = toInsert[index];
    array.splice(insertion.index, 0, insertion.value);
  }
  var toModifyLength = toModify.length;
  var child = void 0;
  if (toModifyLength > 0) {
    for (index = 0; index < toModifyLength; index++) {
      var modification = toModify[index];
      child = new PatchContext(context.left[modification.index], modification.delta);
      context.push(child, modification.index);
    }
  }
  if (!context.children) {
    context.setResult(context.left).exit();
    return;
  }
  context.exit();
};
patchFilter$2.filterName = "arrays";
var collectChildrenPatchFilter$1 = function collectChildrenPatchFilter3(context) {
  if (!context || !context.children) {
    return;
  }
  if (context.delta._t !== "a") {
    return;
  }
  var length = context.children.length;
  var child = void 0;
  for (var index = 0; index < length; index++) {
    child = context.children[index];
    context.left[child.childName] = child.result;
  }
  context.setResult(context.left).exit();
};
collectChildrenPatchFilter$1.filterName = "arraysCollectChildren";
var reverseFilter$2 = function arraysReverseFilter(context) {
  if (!context.nested) {
    if (context.delta[2] === ARRAY_MOVE) {
      context.newName = "_" + context.delta[1];
      context.setResult([context.delta[0], parseInt(context.childName.substr(1), 10), ARRAY_MOVE]).exit();
    }
    return;
  }
  if (context.delta._t !== "a") {
    return;
  }
  var name = void 0;
  var child = void 0;
  for (name in context.delta) {
    if (name === "_t") {
      continue;
    }
    child = new ReverseContext(context.delta[name]);
    context.push(child, name);
  }
  context.exit();
};
reverseFilter$2.filterName = "arrays";
var reverseArrayDeltaIndex = function reverseArrayDeltaIndex2(delta, index, itemDelta) {
  if (typeof index === "string" && index[0] === "_") {
    return parseInt(index.substr(1), 10);
  } else if (isArray$2(itemDelta) && itemDelta[2] === 0) {
    return "_" + index;
  }
  var reverseIndex = +index;
  for (var deltaIndex in delta) {
    var deltaItem = delta[deltaIndex];
    if (isArray$2(deltaItem)) {
      if (deltaItem[2] === ARRAY_MOVE) {
        var moveFromIndex = parseInt(deltaIndex.substr(1), 10);
        var moveToIndex = deltaItem[1];
        if (moveToIndex === +index) {
          return moveFromIndex;
        }
        if (moveFromIndex <= reverseIndex && moveToIndex > reverseIndex) {
          reverseIndex++;
        } else if (moveFromIndex >= reverseIndex && moveToIndex < reverseIndex) {
          reverseIndex--;
        }
      } else if (deltaItem[2] === 0) {
        var deleteIndex = parseInt(deltaIndex.substr(1), 10);
        if (deleteIndex <= reverseIndex) {
          reverseIndex++;
        }
      } else if (deltaItem.length === 1 && deltaIndex <= reverseIndex) {
        reverseIndex--;
      }
    }
  }
  return reverseIndex;
};
function collectChildrenReverseFilter$1(context) {
  if (!context || !context.children) {
    return;
  }
  if (context.delta._t !== "a") {
    return;
  }
  var length = context.children.length;
  var child = void 0;
  var delta = {
    _t: "a"
  };
  for (var index = 0; index < length; index++) {
    child = context.children[index];
    var name = child.newName;
    if (typeof name === "undefined") {
      name = reverseArrayDeltaIndex(context.delta, child.childName, child.result);
    }
    if (delta[name] !== child.result) {
      delta[name] = child.result;
    }
  }
  context.setResult(delta).exit();
}
collectChildrenReverseFilter$1.filterName = "arraysCollectChildren";
var diffFilter$2 = function datesDiffFilter(context) {
  if (context.left instanceof Date) {
    if (context.right instanceof Date) {
      if (context.left.getTime() !== context.right.getTime()) {
        context.setResult([context.left, context.right]);
      } else {
        context.setResult(void 0);
      }
    } else {
      context.setResult([context.left, context.right]);
    }
    context.exit();
  } else if (context.right instanceof Date) {
    context.setResult([context.left, context.right]).exit();
  }
};
diffFilter$2.filterName = "dates";
var TEXT_DIFF = 2;
var DEFAULT_MIN_LENGTH = 60;
var cachedDiffPatch = null;
var getDiffMatchPatch = function getDiffMatchPatch2(required) {
  if (!cachedDiffPatch) {
    var instance2 = void 0;
    if (typeof diff_match_patch !== "undefined") {
      instance2 = typeof diff_match_patch === "function" ? new diff_match_patch() : new diff_match_patch.diff_match_patch();
    } else if (dmp) {
      try {
        instance2 = dmp && new dmp();
      } catch (err) {
        instance2 = null;
      }
    }
    if (!instance2) {
      if (!required) {
        return null;
      }
      var error = new Error("text diff_match_patch library not found");
      error.diff_match_patch_not_found = true;
      throw error;
    }
    cachedDiffPatch = {
      diff: function diff2(txt1, txt2) {
        return instance2.patch_toText(instance2.patch_make(txt1, txt2));
      },
      patch: function patch(txt1, _patch) {
        var results = instance2.patch_apply(instance2.patch_fromText(_patch), txt1);
        for (var i = 0; i < results[1].length; i++) {
          if (!results[1][i]) {
            var _error = new Error("text patch failed");
            _error.textPatchFailed = true;
          }
        }
        return results[0];
      }
    };
  }
  return cachedDiffPatch;
};
var diffFilter$3 = function textsDiffFilter(context) {
  if (context.leftType !== "string") {
    return;
  }
  var minLength = context.options && context.options.textDiff && context.options.textDiff.minLength || DEFAULT_MIN_LENGTH;
  if (context.left.length < minLength || context.right.length < minLength) {
    context.setResult([context.left, context.right]).exit();
    return;
  }
  var diffMatchPatch2 = getDiffMatchPatch();
  if (!diffMatchPatch2) {
    context.setResult([context.left, context.right]).exit();
    return;
  }
  var diff2 = diffMatchPatch2.diff;
  context.setResult([diff2(context.left, context.right), 0, TEXT_DIFF]).exit();
};
diffFilter$3.filterName = "texts";
var patchFilter$3 = function textsPatchFilter(context) {
  if (context.nested) {
    return;
  }
  if (context.delta[2] !== TEXT_DIFF) {
    return;
  }
  var patch = getDiffMatchPatch(true).patch;
  context.setResult(patch(context.left, context.delta[0])).exit();
};
patchFilter$3.filterName = "texts";
var textDeltaReverse = function textDeltaReverse2(delta) {
  var i = void 0;
  var l = void 0;
  var lines = void 0;
  var line = void 0;
  var lineTmp = void 0;
  var header = null;
  var headerRegex = /^@@ +-(\d+),(\d+) +\+(\d+),(\d+) +@@$/;
  var lineHeader = void 0;
  lines = delta.split("\n");
  for (i = 0, l = lines.length; i < l; i++) {
    line = lines[i];
    var lineStart = line.slice(0, 1);
    if (lineStart === "@") {
      header = headerRegex.exec(line);
      lineHeader = i;
      lines[lineHeader] = "@@ -" + header[3] + "," + header[4] + " +" + header[1] + "," + header[2] + " @@";
    } else if (lineStart === "+") {
      lines[i] = "-" + lines[i].slice(1);
      if (lines[i - 1].slice(0, 1) === "+") {
        lineTmp = lines[i];
        lines[i] = lines[i - 1];
        lines[i - 1] = lineTmp;
      }
    } else if (lineStart === "-") {
      lines[i] = "+" + lines[i].slice(1);
    }
  }
  return lines.join("\n");
};
var reverseFilter$3 = function textsReverseFilter(context) {
  if (context.nested) {
    return;
  }
  if (context.delta[2] !== TEXT_DIFF) {
    return;
  }
  context.setResult([textDeltaReverse(context.delta[0]), 0, TEXT_DIFF]).exit();
};
reverseFilter$3.filterName = "texts";
var DiffPatcher = function() {
  function DiffPatcher2(options) {
    classCallCheck(this, DiffPatcher2);
    this.processor = new Processor(options);
    this.processor.pipe(new Pipe("diff").append(collectChildrenDiffFilter, diffFilter, diffFilter$2, diffFilter$3, objectsDiffFilter, diffFilter$1).shouldHaveResult());
    this.processor.pipe(new Pipe("patch").append(collectChildrenPatchFilter, collectChildrenPatchFilter$1, patchFilter, patchFilter$3, patchFilter$1, patchFilter$2).shouldHaveResult());
    this.processor.pipe(new Pipe("reverse").append(collectChildrenReverseFilter, collectChildrenReverseFilter$1, reverseFilter, reverseFilter$3, reverseFilter$1, reverseFilter$2).shouldHaveResult());
  }
  createClass(DiffPatcher2, [{
    key: "options",
    value: function options() {
      var _processor;
      return (_processor = this.processor).options.apply(_processor, arguments);
    }
  }, {
    key: "diff",
    value: function diff2(left, right) {
      return this.processor.process(new DiffContext(left, right));
    }
  }, {
    key: "patch",
    value: function patch(left, delta) {
      return this.processor.process(new PatchContext(left, delta));
    }
  }, {
    key: "reverse",
    value: function reverse(delta) {
      return this.processor.process(new ReverseContext(delta));
    }
  }, {
    key: "unpatch",
    value: function unpatch(right, delta) {
      return this.patch(right, this.reverse(delta));
    }
  }, {
    key: "clone",
    value: function clone$$1(value) {
      return clone(value);
    }
  }]);
  return DiffPatcher2;
}();
var isArray$3 = typeof Array.isArray === "function" ? Array.isArray : function(a) {
  return a instanceof Array;
};
var getObjectKeys = typeof Object.keys === "function" ? function(obj) {
  return Object.keys(obj);
} : function(obj) {
  var names = [];
  for (var property in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, property)) {
      names.push(property);
    }
  }
  return names;
};
var trimUnderscore = function trimUnderscore2(str) {
  if (str.substr(0, 1) === "_") {
    return str.slice(1);
  }
  return str;
};
var arrayKeyToSortNumber = function arrayKeyToSortNumber2(key) {
  if (key === "_t") {
    return -1;
  } else {
    if (key.substr(0, 1) === "_") {
      return parseInt(key.slice(1), 10);
    } else {
      return parseInt(key, 10) + 0.1;
    }
  }
};
var arrayKeyComparer = function arrayKeyComparer2(key1, key2) {
  return arrayKeyToSortNumber(key1) - arrayKeyToSortNumber(key2);
};
var BaseFormatter = function() {
  function BaseFormatter2() {
    classCallCheck(this, BaseFormatter2);
  }
  createClass(BaseFormatter2, [{
    key: "format",
    value: function format(delta, left) {
      var context = {};
      this.prepareContext(context);
      this.recurse(context, delta, left);
      return this.finalize(context);
    }
  }, {
    key: "prepareContext",
    value: function prepareContext(context) {
      context.buffer = [];
      context.out = function() {
        var _buffer;
        (_buffer = this.buffer).push.apply(_buffer, arguments);
      };
    }
  }, {
    key: "typeFormattterNotFound",
    value: function typeFormattterNotFound(context, deltaType) {
      throw new Error("cannot format delta type: " + deltaType);
    }
  }, {
    key: "typeFormattterErrorFormatter",
    value: function typeFormattterErrorFormatter(context, err) {
      return err.toString();
    }
  }, {
    key: "finalize",
    value: function finalize(_ref) {
      var buffer = _ref.buffer;
      if (isArray$3(buffer)) {
        return buffer.join("");
      }
    }
  }, {
    key: "recurse",
    value: function recurse(context, delta, left, key, leftKey, movedFrom, isLast) {
      var useMoveOriginHere = delta && movedFrom;
      var leftValue = useMoveOriginHere ? movedFrom.value : left;
      if (typeof delta === "undefined" && typeof key === "undefined") {
        return void 0;
      }
      var type = this.getDeltaType(delta, movedFrom);
      var nodeType = type === "node" ? delta._t === "a" ? "array" : "object" : "";
      if (typeof key !== "undefined") {
        this.nodeBegin(context, key, leftKey, type, nodeType, isLast);
      } else {
        this.rootBegin(context, type, nodeType);
      }
      var typeFormattter = void 0;
      try {
        typeFormattter = this["format_" + type] || this.typeFormattterNotFound(context, type);
        typeFormattter.call(this, context, delta, leftValue, key, leftKey, movedFrom);
      } catch (err) {
        this.typeFormattterErrorFormatter(context, err, delta, leftValue, key, leftKey, movedFrom);
        if (typeof console !== "undefined" && console.error) {
          console.error(err.stack);
        }
      }
      if (typeof key !== "undefined") {
        this.nodeEnd(context, key, leftKey, type, nodeType, isLast);
      } else {
        this.rootEnd(context, type, nodeType);
      }
    }
  }, {
    key: "formatDeltaChildren",
    value: function formatDeltaChildren(context, delta, left) {
      var self = this;
      this.forEachDeltaKey(delta, left, function(key, leftKey, movedFrom, isLast) {
        self.recurse(context, delta[key], left ? left[leftKey] : void 0, key, leftKey, movedFrom, isLast);
      });
    }
  }, {
    key: "forEachDeltaKey",
    value: function forEachDeltaKey(delta, left, fn) {
      var keys2 = getObjectKeys(delta);
      var arrayKeys = delta._t === "a";
      var moveDestinations = {};
      var name = void 0;
      if (typeof left !== "undefined") {
        for (name in left) {
          if (Object.prototype.hasOwnProperty.call(left, name)) {
            if (typeof delta[name] === "undefined" && (!arrayKeys || typeof delta["_" + name] === "undefined")) {
              keys2.push(name);
            }
          }
        }
      }
      for (name in delta) {
        if (Object.prototype.hasOwnProperty.call(delta, name)) {
          var value = delta[name];
          if (isArray$3(value) && value[2] === 3) {
            moveDestinations[value[1].toString()] = {
              key: name,
              value: left && left[parseInt(name.substr(1))]
            };
            if (this.includeMoveDestinations !== false) {
              if (typeof left === "undefined" && typeof delta[value[1]] === "undefined") {
                keys2.push(value[1].toString());
              }
            }
          }
        }
      }
      if (arrayKeys) {
        keys2.sort(arrayKeyComparer);
      } else {
        keys2.sort();
      }
      for (var index = 0, length = keys2.length; index < length; index++) {
        var key = keys2[index];
        if (arrayKeys && key === "_t") {
          continue;
        }
        var leftKey = arrayKeys ? typeof key === "number" ? key : parseInt(trimUnderscore(key), 10) : key;
        var isLast = index === length - 1;
        fn(key, leftKey, moveDestinations[leftKey], isLast);
      }
    }
  }, {
    key: "getDeltaType",
    value: function getDeltaType(delta, movedFrom) {
      if (typeof delta === "undefined") {
        if (typeof movedFrom !== "undefined") {
          return "movedestination";
        }
        return "unchanged";
      }
      if (isArray$3(delta)) {
        if (delta.length === 1) {
          return "added";
        }
        if (delta.length === 2) {
          return "modified";
        }
        if (delta.length === 3 && delta[2] === 0) {
          return "deleted";
        }
        if (delta.length === 3 && delta[2] === 2) {
          return "textdiff";
        }
        if (delta.length === 3 && delta[2] === 3) {
          return "moved";
        }
      } else if ((typeof delta === "undefined" ? "undefined" : _typeof(delta)) === "object") {
        return "node";
      }
      return "unknown";
    }
  }, {
    key: "parseTextDiff",
    value: function parseTextDiff2(value) {
      var output = [];
      var lines = value.split("\n@@ ");
      for (var i = 0, l = lines.length; i < l; i++) {
        var line = lines[i];
        var lineOutput = {
          pieces: []
        };
        var location = /^(?:@@ )?[-+]?(\d+),(\d+)/.exec(line).slice(1);
        lineOutput.location = {
          line: location[0],
          chr: location[1]
        };
        var pieces = line.split("\n").slice(1);
        for (var pieceIndex = 0, piecesLength = pieces.length; pieceIndex < piecesLength; pieceIndex++) {
          var piece = pieces[pieceIndex];
          if (!piece.length) {
            continue;
          }
          var pieceOutput = {
            type: "context"
          };
          if (piece.substr(0, 1) === "+") {
            pieceOutput.type = "added";
          } else if (piece.substr(0, 1) === "-") {
            pieceOutput.type = "deleted";
          }
          pieceOutput.text = piece.slice(1);
          lineOutput.pieces.push(pieceOutput);
        }
        output.push(lineOutput);
      }
      return output;
    }
  }]);
  return BaseFormatter2;
}();
(function(_BaseFormatter) {
  inherits(HtmlFormatter, _BaseFormatter);
  function HtmlFormatter() {
    classCallCheck(this, HtmlFormatter);
    return possibleConstructorReturn(this, (HtmlFormatter.__proto__ || Object.getPrototypeOf(HtmlFormatter)).apply(this, arguments));
  }
  createClass(HtmlFormatter, [{
    key: "typeFormattterErrorFormatter",
    value: function typeFormattterErrorFormatter(context, err) {
      context.out('<pre class="jsondiffpatch-error">' + err + "</pre>");
    }
  }, {
    key: "formatValue",
    value: function formatValue(context, value) {
      context.out("<pre>" + htmlEscape(JSON.stringify(value, null, 2)) + "</pre>");
    }
  }, {
    key: "formatTextDiffString",
    value: function formatTextDiffString(context, value) {
      var lines = this.parseTextDiff(value);
      context.out('<ul class="jsondiffpatch-textdiff">');
      for (var i = 0, l = lines.length; i < l; i++) {
        var line = lines[i];
        context.out('<li><div class="jsondiffpatch-textdiff-location">' + ('<span class="jsondiffpatch-textdiff-line-number">' + line.location.line + '</span><span class="jsondiffpatch-textdiff-char">' + line.location.chr + '</span></div><div class="jsondiffpatch-textdiff-line">'));
        var pieces = line.pieces;
        for (var pieceIndex = 0, piecesLength = pieces.length; pieceIndex < piecesLength; pieceIndex++) {
          var piece = pieces[pieceIndex];
          context.out('<span class="jsondiffpatch-textdiff-' + piece.type + '">' + htmlEscape(decodeURI(piece.text)) + "</span>");
        }
        context.out("</div></li>");
      }
      context.out("</ul>");
    }
  }, {
    key: "rootBegin",
    value: function rootBegin(context, type, nodeType) {
      var nodeClass = "jsondiffpatch-" + type + (nodeType ? " jsondiffpatch-child-node-type-" + nodeType : "");
      context.out('<div class="jsondiffpatch-delta ' + nodeClass + '">');
    }
  }, {
    key: "rootEnd",
    value: function rootEnd(context) {
      context.out("</div>" + (context.hasArrows ? '<script type="text/javascript">setTimeout(' + (adjustArrows.toString() + ",10);<\/script>") : ""));
    }
  }, {
    key: "nodeBegin",
    value: function nodeBegin(context, key, leftKey, type, nodeType) {
      var nodeClass = "jsondiffpatch-" + type + (nodeType ? " jsondiffpatch-child-node-type-" + nodeType : "");
      context.out('<li class="' + nodeClass + '" data-key="' + leftKey + '">' + ('<div class="jsondiffpatch-property-name">' + leftKey + "</div>"));
    }
  }, {
    key: "nodeEnd",
    value: function nodeEnd(context) {
      context.out("</li>");
    }
    /* jshint camelcase: false */
    /* eslint-disable camelcase */
  }, {
    key: "format_unchanged",
    value: function format_unchanged(context, delta, left) {
      if (typeof left === "undefined") {
        return;
      }
      context.out('<div class="jsondiffpatch-value">');
      this.formatValue(context, left);
      context.out("</div>");
    }
  }, {
    key: "format_movedestination",
    value: function format_movedestination(context, delta, left) {
      if (typeof left === "undefined") {
        return;
      }
      context.out('<div class="jsondiffpatch-value">');
      this.formatValue(context, left);
      context.out("</div>");
    }
  }, {
    key: "format_node",
    value: function format_node(context, delta, left) {
      var nodeType = delta._t === "a" ? "array" : "object";
      context.out('<ul class="jsondiffpatch-node jsondiffpatch-node-type-' + nodeType + '">');
      this.formatDeltaChildren(context, delta, left);
      context.out("</ul>");
    }
  }, {
    key: "format_added",
    value: function format_added(context, delta) {
      context.out('<div class="jsondiffpatch-value">');
      this.formatValue(context, delta[0]);
      context.out("</div>");
    }
  }, {
    key: "format_modified",
    value: function format_modified(context, delta) {
      context.out('<div class="jsondiffpatch-value jsondiffpatch-left-value">');
      this.formatValue(context, delta[0]);
      context.out('</div><div class="jsondiffpatch-value jsondiffpatch-right-value">');
      this.formatValue(context, delta[1]);
      context.out("</div>");
    }
  }, {
    key: "format_deleted",
    value: function format_deleted(context, delta) {
      context.out('<div class="jsondiffpatch-value">');
      this.formatValue(context, delta[0]);
      context.out("</div>");
    }
  }, {
    key: "format_moved",
    value: function format_moved(context, delta) {
      context.out('<div class="jsondiffpatch-value">');
      this.formatValue(context, delta[0]);
      context.out('</div><div class="jsondiffpatch-moved-destination">' + delta[1] + "</div>");
      context.out(
        /* jshint multistr: true */
        '<div class="jsondiffpatch-arrow" style="position: relative; left: -34px;">\n          <svg width="30" height="60" style="position: absolute; display: none;">\n          <defs>\n              <marker id="markerArrow" markerWidth="8" markerHeight="8"\n                 refx="2" refy="4"\n                     orient="auto" markerUnits="userSpaceOnUse">\n                  <path d="M1,1 L1,7 L7,4 L1,1" style="fill: #339;" />\n              </marker>\n          </defs>\n          <path d="M30,0 Q-10,25 26,50"\n            style="stroke: #88f; stroke-width: 2px; fill: none; stroke-opacity: 0.5; marker-end: url(#markerArrow);"\n          ></path>\n          </svg>\n      </div>'
      );
      context.hasArrows = true;
    }
  }, {
    key: "format_textdiff",
    value: function format_textdiff(context, delta) {
      context.out('<div class="jsondiffpatch-value">');
      this.formatTextDiffString(context, delta[0]);
      context.out("</div>");
    }
  }]);
  return HtmlFormatter;
})(BaseFormatter);
function htmlEscape(text2) {
  var html2 = text2;
  var replacements = [[/&/g, "&amp;"], [/</g, "&lt;"], [/>/g, "&gt;"], [/'/g, "&apos;"], [/"/g, "&quot;"]];
  for (var i = 0; i < replacements.length; i++) {
    html2 = html2.replace(replacements[i][0], replacements[i][1]);
  }
  return html2;
}
var adjustArrows = function jsondiffpatchHtmlFormatterAdjustArrows(nodeArg) {
  var node = nodeArg || document;
  var getElementText = function getElementText2(_ref) {
    var textContent = _ref.textContent, innerText = _ref.innerText;
    return textContent || innerText;
  };
  var eachByQuery = function eachByQuery2(el, query, fn) {
    var elems = el.querySelectorAll(query);
    for (var i = 0, l = elems.length; i < l; i++) {
      fn(elems[i]);
    }
  };
  var eachChildren = function eachChildren2(_ref2, fn) {
    var children2 = _ref2.children;
    for (var i = 0, l = children2.length; i < l; i++) {
      fn(children2[i], i);
    }
  };
  eachByQuery(node, ".jsondiffpatch-arrow", function(_ref3) {
    var parentNode2 = _ref3.parentNode, children2 = _ref3.children, style = _ref3.style;
    var arrowParent = parentNode2;
    var svg = children2[0];
    var path = svg.children[1];
    svg.style.display = "none";
    var destination = getElementText(arrowParent.querySelector(".jsondiffpatch-moved-destination"));
    var container = arrowParent.parentNode;
    var destinationElem = void 0;
    eachChildren(container, function(child) {
      if (child.getAttribute("data-key") === destination) {
        destinationElem = child;
      }
    });
    if (!destinationElem) {
      return;
    }
    try {
      var distance = destinationElem.offsetTop - arrowParent.offsetTop;
      svg.setAttribute("height", Math.abs(distance) + 6);
      style.top = -8 + (distance > 0 ? 0 : distance) + "px";
      var curve = distance > 0 ? "M30,0 Q-10," + Math.round(distance / 2) + " 26," + (distance - 4) : "M30," + -distance + " Q-10," + Math.round(-distance / 2) + " 26,4";
      path.setAttribute("d", curve);
      svg.style.display = "";
    } catch (err) {
    }
  });
};
var AnnotatedFormatter = function(_BaseFormatter) {
  inherits(AnnotatedFormatter2, _BaseFormatter);
  function AnnotatedFormatter2() {
    classCallCheck(this, AnnotatedFormatter2);
    var _this = possibleConstructorReturn(this, (AnnotatedFormatter2.__proto__ || Object.getPrototypeOf(AnnotatedFormatter2)).call(this));
    _this.includeMoveDestinations = false;
    return _this;
  }
  createClass(AnnotatedFormatter2, [{
    key: "prepareContext",
    value: function prepareContext(context) {
      get(AnnotatedFormatter2.prototype.__proto__ || Object.getPrototypeOf(AnnotatedFormatter2.prototype), "prepareContext", this).call(this, context);
      context.indent = function(levels) {
        this.indentLevel = (this.indentLevel || 0) + (typeof levels === "undefined" ? 1 : levels);
        this.indentPad = new Array(this.indentLevel + 1).join("&nbsp;&nbsp;");
      };
      context.row = function(json, htmlNote) {
        context.out('<tr><td style="white-space: nowrap;"><pre class="jsondiffpatch-annotated-indent" style="display: inline-block">');
        context.out(context.indentPad);
        context.out('</pre><pre style="display: inline-block">');
        context.out(json);
        context.out('</pre></td><td class="jsondiffpatch-delta-note"><div>');
        context.out(htmlNote);
        context.out("</div></td></tr>");
      };
    }
  }, {
    key: "typeFormattterErrorFormatter",
    value: function typeFormattterErrorFormatter(context, err) {
      context.row("", '<pre class="jsondiffpatch-error">' + err + "</pre>");
    }
  }, {
    key: "formatTextDiffString",
    value: function formatTextDiffString(context, value) {
      var lines = this.parseTextDiff(value);
      context.out('<ul class="jsondiffpatch-textdiff">');
      for (var i = 0, l = lines.length; i < l; i++) {
        var line = lines[i];
        context.out('<li><div class="jsondiffpatch-textdiff-location">' + ('<span class="jsondiffpatch-textdiff-line-number">' + line.location.line + '</span><span class="jsondiffpatch-textdiff-char">' + line.location.chr + '</span></div><div class="jsondiffpatch-textdiff-line">'));
        var pieces = line.pieces;
        for (var pieceIndex = 0, piecesLength = pieces.length; pieceIndex < piecesLength; pieceIndex++) {
          var piece = pieces[pieceIndex];
          context.out('<span class="jsondiffpatch-textdiff-' + piece.type + '">' + piece.text + "</span>");
        }
        context.out("</div></li>");
      }
      context.out("</ul>");
    }
  }, {
    key: "rootBegin",
    value: function rootBegin(context, type, nodeType) {
      context.out('<table class="jsondiffpatch-annotated-delta">');
      if (type === "node") {
        context.row("{");
        context.indent();
      }
      if (nodeType === "array") {
        context.row('"_t": "a",', "Array delta (member names indicate array indices)");
      }
    }
  }, {
    key: "rootEnd",
    value: function rootEnd(context, type) {
      if (type === "node") {
        context.indent(-1);
        context.row("}");
      }
      context.out("</table>");
    }
  }, {
    key: "nodeBegin",
    value: function nodeBegin(context, key, leftKey, type, nodeType) {
      context.row("&quot;" + key + "&quot;: {");
      if (type === "node") {
        context.indent();
      }
      if (nodeType === "array") {
        context.row('"_t": "a",', "Array delta (member names indicate array indices)");
      }
    }
  }, {
    key: "nodeEnd",
    value: function nodeEnd(context, key, leftKey, type, nodeType, isLast) {
      if (type === "node") {
        context.indent(-1);
      }
      context.row("}" + (isLast ? "" : ","));
    }
    /* jshint camelcase: false */
    /* eslint-disable camelcase */
  }, {
    key: "format_unchanged",
    value: function format_unchanged() {
    }
  }, {
    key: "format_movedestination",
    value: function format_movedestination() {
    }
  }, {
    key: "format_node",
    value: function format_node(context, delta, left) {
      this.formatDeltaChildren(context, delta, left);
    }
  }]);
  return AnnotatedFormatter2;
}(BaseFormatter);
var wrapPropertyName = function wrapPropertyName2(name) {
  return '<pre style="display:inline-block">&quot;' + name + "&quot;</pre>";
};
var deltaAnnotations = {
  added: function added(delta, left, key, leftKey) {
    var formatLegend = " <pre>([newValue])</pre>";
    if (typeof leftKey === "undefined") {
      return "new value" + formatLegend;
    }
    if (typeof leftKey === "number") {
      return "insert at index " + leftKey + formatLegend;
    }
    return "add property " + wrapPropertyName(leftKey) + formatLegend;
  },
  modified: function modified(delta, left, key, leftKey) {
    var formatLegend = " <pre>([previousValue, newValue])</pre>";
    if (typeof leftKey === "undefined") {
      return "modify value" + formatLegend;
    }
    if (typeof leftKey === "number") {
      return "modify at index " + leftKey + formatLegend;
    }
    return "modify property " + wrapPropertyName(leftKey) + formatLegend;
  },
  deleted: function deleted(delta, left, key, leftKey) {
    var formatLegend = " <pre>([previousValue, 0, 0])</pre>";
    if (typeof leftKey === "undefined") {
      return "delete value" + formatLegend;
    }
    if (typeof leftKey === "number") {
      return "remove index " + leftKey + formatLegend;
    }
    return "delete property " + wrapPropertyName(leftKey) + formatLegend;
  },
  moved: function moved(delta, left, key, leftKey) {
    return 'move from <span title="(position to remove at original state)">' + ("index " + leftKey + '</span> to <span title="(position to insert at final') + (' state)">index ' + delta[1] + "</span>");
  },
  textdiff: function textdiff(delta, left, key, leftKey) {
    var location = typeof leftKey === "undefined" ? "" : typeof leftKey === "number" ? " at index " + leftKey : " at property " + wrapPropertyName(leftKey);
    return "text diff" + location + ', format is <a href="https://code.google.com/p/google-diff-match-patch/wiki/Unidiff">a variation of Unidiff</a>';
  }
};
var formatAnyChange = function formatAnyChange2(context, delta) {
  var deltaType = this.getDeltaType(delta);
  var annotator = deltaAnnotations[deltaType];
  var htmlNote = annotator && annotator.apply(annotator, Array.prototype.slice.call(arguments, 1));
  var json = JSON.stringify(delta, null, 2);
  if (deltaType === "textdiff") {
    json = json.split("\\n").join('\\n"+\n   "');
  }
  context.indent();
  context.row(json, htmlNote);
  context.indent(-1);
};
AnnotatedFormatter.prototype.format_added = formatAnyChange;
AnnotatedFormatter.prototype.format_modified = formatAnyChange;
AnnotatedFormatter.prototype.format_deleted = formatAnyChange;
AnnotatedFormatter.prototype.format_moved = formatAnyChange;
AnnotatedFormatter.prototype.format_textdiff = formatAnyChange;
var OPERATIONS = {
  add: "add",
  remove: "remove",
  replace: "replace",
  move: "move"
};
(function(_BaseFormatter) {
  inherits(JSONFormatter, _BaseFormatter);
  function JSONFormatter() {
    classCallCheck(this, JSONFormatter);
    var _this = possibleConstructorReturn(this, (JSONFormatter.__proto__ || Object.getPrototypeOf(JSONFormatter)).call(this));
    _this.includeMoveDestinations = true;
    return _this;
  }
  createClass(JSONFormatter, [{
    key: "prepareContext",
    value: function prepareContext(context) {
      get(JSONFormatter.prototype.__proto__ || Object.getPrototypeOf(JSONFormatter.prototype), "prepareContext", this).call(this, context);
      context.result = [];
      context.path = [];
      context.pushCurrentOp = function(obj) {
        var op = obj.op, value = obj.value;
        var val = {
          op,
          path: this.currentPath()
        };
        if (typeof value !== "undefined") {
          val.value = value;
        }
        this.result.push(val);
      };
      context.pushMoveOp = function(to) {
        var from = this.currentPath();
        this.result.push({
          op: OPERATIONS.move,
          from,
          path: this.toPath(to)
        });
      };
      context.currentPath = function() {
        return "/" + this.path.join("/");
      };
      context.toPath = function(toPath) {
        var to = this.path.slice();
        to[to.length - 1] = toPath;
        return "/" + to.join("/");
      };
    }
  }, {
    key: "typeFormattterErrorFormatter",
    value: function typeFormattterErrorFormatter(context, err) {
      context.out("[ERROR] " + err);
    }
  }, {
    key: "rootBegin",
    value: function rootBegin() {
    }
  }, {
    key: "rootEnd",
    value: function rootEnd() {
    }
  }, {
    key: "nodeBegin",
    value: function nodeBegin(_ref, key, leftKey) {
      var path = _ref.path;
      path.push(leftKey);
    }
  }, {
    key: "nodeEnd",
    value: function nodeEnd(_ref2) {
      var path = _ref2.path;
      path.pop();
    }
    /* jshint camelcase: false */
    /* eslint-disable camelcase */
  }, {
    key: "format_unchanged",
    value: function format_unchanged() {
    }
  }, {
    key: "format_movedestination",
    value: function format_movedestination() {
    }
  }, {
    key: "format_node",
    value: function format_node(context, delta, left) {
      this.formatDeltaChildren(context, delta, left);
    }
  }, {
    key: "format_added",
    value: function format_added(context, delta) {
      context.pushCurrentOp({
        op: OPERATIONS.add,
        value: delta[0]
      });
    }
  }, {
    key: "format_modified",
    value: function format_modified(context, delta) {
      context.pushCurrentOp({
        op: OPERATIONS.replace,
        value: delta[1]
      });
    }
  }, {
    key: "format_deleted",
    value: function format_deleted(context) {
      context.pushCurrentOp({
        op: OPERATIONS.remove
      });
    }
  }, {
    key: "format_moved",
    value: function format_moved(context, delta) {
      var to = delta[1];
      context.pushMoveOp(to);
    }
  }, {
    key: "format_textdiff",
    value: function format_textdiff() {
      throw new Error("Not implemented");
    }
  }, {
    key: "format",
    value: function format(delta, left) {
      var context = {};
      this.prepareContext(context);
      this.recurse(context, delta, left);
      return context.result;
    }
  }]);
  return JSONFormatter;
})(BaseFormatter);
function chalkColor(name) {
  return function() {
    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }
    return args;
  };
}
var colors = {
  added: chalkColor(),
  deleted: chalkColor(),
  movedestination: chalkColor(),
  moved: chalkColor(),
  unchanged: chalkColor(),
  error: chalkColor(),
  textDiffLine: chalkColor()
};
(function(_BaseFormatter) {
  inherits(ConsoleFormatter, _BaseFormatter);
  function ConsoleFormatter() {
    classCallCheck(this, ConsoleFormatter);
    var _this = possibleConstructorReturn(this, (ConsoleFormatter.__proto__ || Object.getPrototypeOf(ConsoleFormatter)).call(this));
    _this.includeMoveDestinations = false;
    return _this;
  }
  createClass(ConsoleFormatter, [{
    key: "prepareContext",
    value: function prepareContext(context) {
      get(ConsoleFormatter.prototype.__proto__ || Object.getPrototypeOf(ConsoleFormatter.prototype), "prepareContext", this).call(this, context);
      context.indent = function(levels) {
        this.indentLevel = (this.indentLevel || 0) + (typeof levels === "undefined" ? 1 : levels);
        this.indentPad = new Array(this.indentLevel + 1).join("  ");
        this.outLine();
      };
      context.outLine = function() {
        this.buffer.push("\n" + (this.indentPad || ""));
      };
      context.out = function() {
        for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
          args[_key2] = arguments[_key2];
        }
        for (var i = 0, l = args.length; i < l; i++) {
          var lines = args[i].split("\n");
          var text2 = lines.join("\n" + (this.indentPad || ""));
          if (this.color && this.color[0]) {
            text2 = this.color[0](text2);
          }
          this.buffer.push(text2);
        }
      };
      context.pushColor = function(color) {
        this.color = this.color || [];
        this.color.unshift(color);
      };
      context.popColor = function() {
        this.color = this.color || [];
        this.color.shift();
      };
    }
  }, {
    key: "typeFormattterErrorFormatter",
    value: function typeFormattterErrorFormatter(context, err) {
      context.pushColor(colors.error);
      context.out("[ERROR]" + err);
      context.popColor();
    }
  }, {
    key: "formatValue",
    value: function formatValue(context, value) {
      context.out(JSON.stringify(value, null, 2));
    }
  }, {
    key: "formatTextDiffString",
    value: function formatTextDiffString(context, value) {
      var lines = this.parseTextDiff(value);
      context.indent();
      for (var i = 0, l = lines.length; i < l; i++) {
        var line = lines[i];
        context.pushColor(colors.textDiffLine);
        context.out(line.location.line + "," + line.location.chr + " ");
        context.popColor();
        var pieces = line.pieces;
        for (var pieceIndex = 0, piecesLength = pieces.length; pieceIndex < piecesLength; pieceIndex++) {
          var piece = pieces[pieceIndex];
          context.pushColor(colors[piece.type]);
          context.out(piece.text);
          context.popColor();
        }
        if (i < l - 1) {
          context.outLine();
        }
      }
      context.indent(-1);
    }
  }, {
    key: "rootBegin",
    value: function rootBegin(context, type, nodeType) {
      context.pushColor(colors[type]);
      if (type === "node") {
        context.out(nodeType === "array" ? "[" : "{");
        context.indent();
      }
    }
  }, {
    key: "rootEnd",
    value: function rootEnd(context, type, nodeType) {
      if (type === "node") {
        context.indent(-1);
        context.out(nodeType === "array" ? "]" : "}");
      }
      context.popColor();
    }
  }, {
    key: "nodeBegin",
    value: function nodeBegin(context, key, leftKey, type, nodeType) {
      context.pushColor(colors[type]);
      context.out(leftKey + ": ");
      if (type === "node") {
        context.out(nodeType === "array" ? "[" : "{");
        context.indent();
      }
    }
  }, {
    key: "nodeEnd",
    value: function nodeEnd(context, key, leftKey, type, nodeType, isLast) {
      if (type === "node") {
        context.indent(-1);
        context.out(nodeType === "array" ? "]" : "}" + (isLast ? "" : ","));
      }
      if (!isLast) {
        context.outLine();
      }
      context.popColor();
    }
    /* jshint camelcase: false */
    /* eslint-disable camelcase */
  }, {
    key: "format_unchanged",
    value: function format_unchanged(context, delta, left) {
      if (typeof left === "undefined") {
        return;
      }
      this.formatValue(context, left);
    }
  }, {
    key: "format_movedestination",
    value: function format_movedestination(context, delta, left) {
      if (typeof left === "undefined") {
        return;
      }
      this.formatValue(context, left);
    }
  }, {
    key: "format_node",
    value: function format_node(context, delta, left) {
      this.formatDeltaChildren(context, delta, left);
    }
  }, {
    key: "format_added",
    value: function format_added(context, delta) {
      this.formatValue(context, delta[0]);
    }
  }, {
    key: "format_modified",
    value: function format_modified(context, delta) {
      context.pushColor(colors.deleted);
      this.formatValue(context, delta[0]);
      context.popColor();
      context.out(" => ");
      context.pushColor(colors.added);
      this.formatValue(context, delta[1]);
      context.popColor();
    }
  }, {
    key: "format_deleted",
    value: function format_deleted(context, delta) {
      this.formatValue(context, delta[0]);
    }
  }, {
    key: "format_moved",
    value: function format_moved(context, delta) {
      context.out("==> " + delta[1]);
    }
  }, {
    key: "format_textdiff",
    value: function format_textdiff(context, delta) {
      this.formatTextDiffString(context, delta[0]);
    }
  }]);
  return ConsoleFormatter;
})(BaseFormatter);
const diffPatcher = new DiffPatcher({
  arrays: { detectMove: false, includeValueOnMove: false },
  textDiff: { minLength: 1 }
});
function diff(inputA, inputB) {
  return diffPatcher.diff(inputA, inputB);
}
const addedProperties = [
  "docChanged",
  "isGeneric",
  "scrolledIntoView",
  "selectionSet",
  "storedMarksSet"
];
function addPropertiesToTransaction(tr) {
  return Object.keys(tr).concat(addedProperties).reduce((acc, key) => {
    acc[key] = tr[key];
    return acc;
  }, {});
}
function buildSelection(selection) {
  return {
    // @ts-ignore
    type: selection.type,
    empty: selection.empty,
    anchor: selection.anchor,
    head: selection.head,
    from: selection.from,
    to: selection.to
  };
}
function pad(num) {
  return ("00" + num).slice(-2);
}
function pad3(num) {
  return ("000" + num).slice(-3);
}
const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  return [
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
    pad3(date.getMilliseconds())
  ].join(":");
};
const srcAttr = /src=[\"|\']data:(.*);base64,(.*)[\"|\']/g;
const wrappingCarets = /(&lt;\/?[\w\d\s="']+&gt;)/gim;
const highlightHtmlString = (html2) => html2.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(wrappingCarets, "<span style='color: cadetblue;'>$&</span>");
function createHistoryEntry(trs, state2, stateBeforeDispatch, oldEntry) {
  const serializer = DOMSerializer.fromSchema(state2.schema);
  const selection = state2.selection;
  const domFragment = serializer.serializeFragment(selection.content().content);
  const selectedElementsAsHtml = [];
  if (domFragment) {
    let child = domFragment.firstChild;
    while (child) {
      selectedElementsAsHtml.push(child.outerHTML.replaceAll(srcAttr, 'src="..."'));
      child = child.nextSibling;
    }
  }
  const prevState = oldEntry ? oldEntry.state : stateBeforeDispatch;
  const contentDiff = diff(prevState.doc.toJSON(), state2.doc.toJSON());
  const selectionDiff = diff(buildSelection(prevState.selection), buildSelection(state2.selection));
  return {
    id: Math.random().toString() + Math.random().toString(),
    state: state2,
    trs: trs.map((tr) => addPropertiesToTransaction(tr)),
    timestamp: trs[0].time,
    timeStr: formatTimestamp(trs[0].time),
    contentDiff,
    selectionDiff,
    selectionHtml: highlightHtmlString(html.prettyPrint(selectedElementsAsHtml.join("\n"), {
      max_char: 60,
      indent_size: 2
    }))
  };
}
const stateHistory = writable(/* @__PURE__ */ new Map());
const shownHistoryGroups = writable([]);
const latestEntry = writable(void 0);
const nextId = writable(0);
function appendNewHistoryEntry(trs, state2, stateBeforeDispatch) {
  const entryMap = get_store_value(stateHistory);
  const prevGroup = get_store_value(shownHistoryGroups)[0];
  const oldEntry = entryMap.get((prevGroup === null || prevGroup === void 0 ? void 0 : prevGroup.topEntryId) || "");
  const newEntry = createHistoryEntry(trs, state2, stateBeforeDispatch, oldEntry);
  stateHistory.update((val) => new Map(val.set(newEntry.id, newEntry)));
  latestEntry.set(newEntry);
  const isGroup = !newEntry.contentDiff;
  if ((prevGroup === null || prevGroup === void 0 ? void 0 : prevGroup.isGroup) && isGroup) {
    const newGroup = {
      id: prevGroup.id,
      isGroup,
      entryIds: [newEntry.id, ...prevGroup.entryIds],
      topEntryId: newEntry.id,
      expanded: prevGroup.expanded
    };
    shownHistoryGroups.update((val) => [newGroup, ...val.slice(1)]);
  } else {
    const id = get_store_value(nextId) + 1;
    const newGroup = {
      id,
      isGroup,
      entryIds: [newEntry.id],
      topEntryId: newEntry.id,
      expanded: false
    };
    shownHistoryGroups.update((val) => [newGroup, ...val]);
    nextId.set(id);
  }
}
function resetHistory() {
  stateHistory.set(/* @__PURE__ */ new Map());
  shownHistoryGroups.set([]);
  latestEntry.set(void 0);
}
function getActiveMarks(state2) {
  if (state2.selection.empty) {
    const $from = state2.selection.$from;
    const storedMarks = state2.storedMarks;
    if (storedMarks) {
      return storedMarks.map((mark) => mark.type.name);
    } else {
      return $from.marks().map((mark) => mark.type.name);
    }
  } else {
    const $head = state2.selection.$head;
    const $anchor = state2.selection.$anchor;
    const activeMarks = /* @__PURE__ */ new Set();
    $head.marks().forEach((mark) => activeMarks.add(mark.type.name));
    $anchor.marks().forEach((mark) => activeMarks.add(mark.type.name));
    return Array.from(activeMarks);
  }
}
const defaultProperties = ["jsonID", "empty", "anchor", "from", "head", "to"];
const resolvedPosProperties = ["$anchor", "$head", "$cursor", "$to", "$from"];
const resolvedPosSubProperties = ["nodeAfter", "nodeBefore", "textOffset"];
function createSelection(selection) {
  return defaultProperties.reduce((acc, key) => {
    acc[key] = selection[key];
    return acc;
  }, {});
}
function createFullSelection(selection) {
  return defaultProperties.concat(resolvedPosProperties).reduce((acc, key) => {
    let val = selection[key];
    if (val && resolvedPosProperties.includes(key)) {
      const additionalProperties = {};
      resolvedPosSubProperties.forEach((subKey) => {
        additionalProperties[subKey] = val[subKey];
      });
      val = Object.assign(Object.assign({}, val), additionalProperties);
    }
    acc[key] = val;
    return acc;
  }, {});
}
function createNode(index, key, value, depth, parent) {
  const path = parent ? [...parent.path, index] : [];
  return {
    id: "[".concat(path.join(","), "]"),
    index,
    key,
    value,
    depth,
    collapsed: true,
    type: getValueType(value),
    path,
    parentId: parent ? parent.id : null,
    circularOfId: null,
    children: []
  };
}
function getValueType(value) {
  if (Array.isArray(value)) {
    return "array";
  } else if (value instanceof Map) {
    return "map";
  } else if (value instanceof Set) {
    return "set";
  } else if (value instanceof Date) {
    return "date";
  } else if (value === null) {
    return "null";
  } else {
    return typeof value;
  }
}
function getChildren(value, type) {
  switch (type) {
    case "array":
      return value.map((v, i) => [i.toString(), v]);
    case "map":
      const entries = Array.from(value.entries());
      return entries.map((_ref, i) => {
        let [key, value2] = _ref;
        return ["[map entry ".concat(i, "]"), {
          "[key]": key,
          "[value]": value2
        }];
      });
    case "set":
      return Array.from(value.values()).map((v, i) => ["[set entry ".concat(i, "]"), v]);
    case "object":
      return Object.entries(value);
    default:
      return [];
  }
}
function shouldRecurseChildren(node, parent, iteratedValues, opts) {
  if (!parent) {
    return true;
  } else if (node.collapsed && (parent === null || parent === void 0 ? void 0 : parent.collapsed)) {
    return false;
  } else if (!opts.stopCircularRecursion) {
    return true;
  } else if (opts.isCircularNode) {
    return opts.isCircularNode(node, iteratedValues);
  } else if (node.type === "object" || node.type === "array") {
    const existingNodeWithValue = iteratedValues.get(node.value);
    if (existingNodeWithValue && node.id !== existingNodeWithValue.id) {
      node.circularOfId = existingNodeWithValue.id;
      return false;
    }
    iteratedValues.set(node.value, node);
  }
  return true;
}
function recurseObjectProperties(index, key, value, depth, ensureNotCollapsed, parent, treeMap, oldTreeMap, iteratedValues, recomputeExpandNode, opts) {
  var _a;
  if (((_a = opts.omitKeys) === null || _a === void 0 ? void 0 : _a.includes(key)) || opts.maxDepth && depth > opts.maxDepth) {
    return null;
  }
  const node = createNode(index, key, value, depth, parent);
  const oldNode = oldTreeMap.get(node.id);
  if (ensureNotCollapsed) {
    node.collapsed = false;
  } else if (oldNode && !recomputeExpandNode) {
    node.collapsed = oldNode.collapsed;
  } else if (opts.shouldExpandNode) {
    node.collapsed = !opts.shouldExpandNode(node);
  }
  treeMap.set(node.id, node);
  if (shouldRecurseChildren(node, parent, iteratedValues, opts)) {
    const mappedChildren = opts.mapChildren && opts.mapChildren(value, getValueType(value), node);
    const children2 = mappedChildren !== null && mappedChildren !== void 0 ? mappedChildren : getChildren(value, getValueType(value));
    node.children = children2.map((_ref2, idx) => {
      let [key2, val] = _ref2;
      return recurseObjectProperties(idx, key2, val, depth + 1, false, node, treeMap, oldTreeMap, iteratedValues, recomputeExpandNode, opts);
    }).filter((n) => n !== null);
  }
  return node;
}
function recomputeTree(data, oldTreeMap, recursionOpts, recomputeExpandNode) {
  const treeMap = /* @__PURE__ */ new Map();
  const iteratedValues = /* @__PURE__ */ new Map();
  const newTree = recurseObjectProperties(-1, "root", data, 0, true, null, treeMap, oldTreeMap, iteratedValues, recomputeExpandNode, recursionOpts);
  return {
    treeMap,
    tree: newTree,
    iteratedValues
  };
}
const createPropsStore = (initialProps) => {
  const props = writable(initialProps);
  const recursionOpts = derived(props, (p) => p.recursionOpts);
  return {
    props,
    recursionOpts,
    setProps(newProps) {
      props.set(newProps);
    },
    formatValue(val, node) {
      const {
        valueFormatter
      } = get_store_value(props);
      const customFormat = valueFormatter ? valueFormatter(val, node) : void 0;
      if (customFormat) {
        return customFormat;
      }
      switch (node.type) {
        case "array":
          return "".concat(node.circularOfId ? "circular" : "", " [] ").concat(val.length, " items");
        case "object":
          return "".concat(node.circularOfId ? "circular" : "", " {} ").concat(Object.keys(val).length, " keys");
        case "map":
        case "set":
          return "".concat(node.circularOfId ? "circular" : "", " () ").concat(val.size, " entries");
        case "date":
          return "".concat(val.toISOString());
        case "string":
          return '"'.concat(val, '"');
        case "boolean":
          return val ? "true" : "false";
        case "symbol":
          return String(val);
        default:
          return val;
      }
    }
  };
};
const createRootElementStore = () => {
  const rootElementStore = writable(null);
  return {
    set: rootElementStore.set,
    subscribe: rootElementStore.subscribe
  };
};
const createTreeStore = (propsStore) => {
  const defaultRootNode = createNode(0, "root", [], 0, null);
  const tree = writable(defaultRootNode);
  const treeMap = writable(/* @__PURE__ */ new Map());
  const iteratedValues = writable(/* @__PURE__ */ new Map());
  return {
    tree,
    treeMap,
    defaultRootNode,
    init(newTree, newTreeMap, iterated) {
      if (newTree) {
        tree.set(newTree);
      } else {
        tree.set(defaultRootNode);
      }
      treeMap.set(newTreeMap);
      iteratedValues.set(iterated);
    },
    getNode(id) {
      return get_store_value(treeMap).get(id);
    },
    toggleCollapse(id) {
      const node = get_store_value(treeMap).get(id);
      if (!node) {
        console.warn("Attempted to collapse non-existent node: ".concat(id));
        return;
      }
      const updatedNode = Object.assign(Object.assign({}, node), {
        collapsed: !node.collapsed
      });
      treeMap.update((m) => new Map(m.set(node.id, updatedNode)));
      const recursionOpts = get_store_value(propsStore.recursionOpts);
      if (recursionOpts) {
        this.expandNodeChildren(updatedNode, recursionOpts);
      }
    },
    expandNodeChildren(node, recursionOpts) {
      const parent = this.getNode((node === null || node === void 0 ? void 0 : node.parentId) || "") || null;
      if (!parent) {
        throw Error("No parent in expandNodeChildren for node: " + node);
      }
      const newTreeMap = new Map(get_store_value(treeMap));
      const oldTreeMap = get_store_value(treeMap);
      const previouslyIterated = get_store_value(iteratedValues);
      const nodeWithUpdatedChildren = recurseObjectProperties(
        node.index,
        node.key,
        node.value,
        node.depth,
        !node.collapsed,
        // Ensure that when uncollapsed the node's children are always recursed
        parent,
        newTreeMap,
        oldTreeMap,
        previouslyIterated,
        false,
        // Never recompute shouldExpandNode since it may override the collapsing of this node
        recursionOpts
      );
      if (!nodeWithUpdatedChildren) return;
      parent.children = parent.children.map((c) => c.id === nodeWithUpdatedChildren.id ? nodeWithUpdatedChildren : c);
      newTreeMap.set(nodeWithUpdatedChildren.id, nodeWithUpdatedChildren);
      newTreeMap.set(parent.id, parent);
      treeMap.set(newTreeMap);
      iteratedValues.set(previouslyIterated);
    },
    expandAllNodesToNode(id) {
      function recurseNodeUpwards(updated2, node) {
        if (!node) return;
        updated2.set(node.id, Object.assign(Object.assign({}, node), {
          collapsed: false
        }));
        if (node.parentId) {
          recurseNodeUpwards(updated2, updated2.get(node.parentId));
        }
      }
      const updated = new Map(get_store_value(treeMap));
      recurseNodeUpwards(updated, updated.get(id));
      treeMap.set(updated);
    }
  };
};
function add_css$h(target) {
  append_styles(target, "svelte-ngcjq5", "ul.svelte-ngcjq5.svelte-ngcjq5{display:flex;flex-direction:column;height:max-content;list-style:none;padding:0;padding-left:var(--tree-view-left-indent);margin:0;width:100%}li.svelte-ngcjq5.svelte-ngcjq5{align-items:baseline;display:flex;height:max-content;line-height:var(--tree-view-line-height);list-style:none;width:100%}li.svelte-ngcjq5+li.svelte-ngcjq5{margin-top:0.25em}.empty-block.svelte-ngcjq5.svelte-ngcjq5{visibility:hidden}.node-key.svelte-ngcjq5.svelte-ngcjq5{color:var(--tree-view-base0D);margin-right:var(--tree-view-key-margin-right)}.node-key.has-children.svelte-ngcjq5.svelte-ngcjq5{cursor:pointer}.node-key.p-left.svelte-ngcjq5.svelte-ngcjq5{padding-left:1.1em}.node-value.svelte-ngcjq5.svelte-ngcjq5{color:var(--tree-view-base0B);margin-right:0.5em;word-break:break-all}.node-value[data-type=number].svelte-ngcjq5.svelte-ngcjq5,.node-value[data-type=boolean].svelte-ngcjq5.svelte-ngcjq5{color:var(--tree-view-base09)}.node-value[data-type=null].svelte-ngcjq5.svelte-ngcjq5,.node-value[data-type=undefined].svelte-ngcjq5.svelte-ngcjq5{color:var(--tree-view-base08)}.node-value.expanded.svelte-ngcjq5.svelte-ngcjq5{color:var(--tree-view-base03)}.node-value.has-children.svelte-ngcjq5.svelte-ngcjq5{cursor:pointer}.arrow-btn.svelte-ngcjq5.svelte-ngcjq5{background:transparent;border:0;color:var(--tree-view-base0D);cursor:pointer;margin-right:0.7em;padding:0;transition:all 150ms ease 0s;transform:rotateZ(90deg);transform-origin:47% 43%;position:relative;line-height:1.1em;font-size:0.75em}.arrow-btn.collapsed.svelte-ngcjq5.svelte-ngcjq5{transform:rotateZ(0deg)}.buttons.svelte-ngcjq5.svelte-ngcjq5{display:flex;flex-wrap:wrap}.log-copy-button.svelte-ngcjq5.svelte-ngcjq5{background:transparent;border:0;color:var(--tree-view-base0D);cursor:pointer;margin:0;padding:0 0.5em}.log-copy-button.svelte-ngcjq5.svelte-ngcjq5:hover{background:rgba(255, 162, 177, 0.4);border-radius:2px;color:var(--tree-view-base07)}");
}
function get_each_context$7(ctx, list, i) {
  const child_ctx = ctx.slice();
  child_ctx[14] = list[i];
  return child_ctx;
}
function create_if_block_4$3(ctx) {
  let button;
  let t;
  let button_class_value;
  let mounted;
  let dispose;
  return {
    c() {
      button = element("button");
      t = text("▶");
      attr(button, "class", button_class_value = null_to_empty("arrow-btn ".concat(
        /*node*/
        ctx[0].collapsed ? "collapsed" : ""
      )) + " svelte-ngcjq5");
    },
    m(target, anchor) {
      insert(target, button, anchor);
      append(button, t);
      if (!mounted) {
        dispose = listen(
          button,
          "click",
          /*handleToggleCollapse*/
          ctx[9]
        );
        mounted = true;
      }
    },
    p(ctx2, dirty) {
      if (dirty & /*node*/
      1 && button_class_value !== (button_class_value = null_to_empty("arrow-btn ".concat(
        /*node*/
        ctx2[0].collapsed ? "collapsed" : ""
      )) + " svelte-ngcjq5")) {
        attr(button, "class", button_class_value);
      }
    },
    d(detaching) {
      if (detaching) {
        detach(button);
      }
      mounted = false;
      dispose();
    }
  };
}
function create_else_block$8(ctx) {
  let t_value = (
    /*propsStore*/
    ctx[5].formatValue(
      /*node*/
      ctx[0].value,
      /*node*/
      ctx[0]
    ) + ""
  );
  let t;
  return {
    c() {
      t = text(t_value);
    },
    m(target, anchor) {
      insert(target, t, anchor);
    },
    p(ctx2, dirty) {
      if (dirty & /*node*/
      1 && t_value !== (t_value = /*propsStore*/
      ctx2[5].formatValue(
        /*node*/
        ctx2[0].value,
        /*node*/
        ctx2[0]
      ) + "")) set_data(t, t_value);
    },
    i: noop,
    o: noop,
    d(detaching) {
      if (detaching) {
        detach(t);
      }
    }
  };
}
function create_if_block_3$4(ctx) {
  let switch_instance;
  let switch_instance_anchor;
  let current;
  var switch_value = (
    /*valueComponent*/
    ctx[3]
  );
  function switch_props(ctx2, dirty) {
    return {
      props: {
        value: (
          /*node*/
          ctx2[0].value
        ),
        node: (
          /*node*/
          ctx2[0]
        ),
        defaultFormatter: (
          /*valueComponentDefaultFormatter*/
          ctx2[10]
        )
      }
    };
  }
  if (switch_value) {
    switch_instance = construct_svelte_component(switch_value, switch_props(ctx));
  }
  return {
    c() {
      if (switch_instance) create_component(switch_instance.$$.fragment);
      switch_instance_anchor = empty();
    },
    m(target, anchor) {
      if (switch_instance) mount_component(switch_instance, target, anchor);
      insert(target, switch_instance_anchor, anchor);
      current = true;
    },
    p(ctx2, dirty) {
      if (dirty & /*valueComponent*/
      8 && switch_value !== (switch_value = /*valueComponent*/
      ctx2[3])) {
        if (switch_instance) {
          group_outros();
          const old_component = switch_instance;
          transition_out(old_component.$$.fragment, 1, 0, () => {
            destroy_component(old_component, 1);
          });
          check_outros();
        }
        if (switch_value) {
          switch_instance = construct_svelte_component(switch_value, switch_props(ctx2));
          create_component(switch_instance.$$.fragment);
          transition_in(switch_instance.$$.fragment, 1);
          mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
        } else {
          switch_instance = null;
        }
      } else if (switch_value) {
        const switch_instance_changes = {};
        if (dirty & /*node*/
        1) switch_instance_changes.value = /*node*/
        ctx2[0].value;
        if (dirty & /*node*/
        1) switch_instance_changes.node = /*node*/
        ctx2[0];
        switch_instance.$set(switch_instance_changes);
      }
    },
    i(local) {
      if (current) return;
      if (switch_instance) transition_in(switch_instance.$$.fragment, local);
      current = true;
    },
    o(local) {
      if (switch_instance) transition_out(switch_instance.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      if (detaching) {
        detach(switch_instance_anchor);
      }
      if (switch_instance) destroy_component(switch_instance, detaching);
    }
  };
}
function create_if_block_2$5(ctx) {
  let button;
  let mounted;
  let dispose;
  return {
    c() {
      button = element("button");
      button.textContent = "log";
      attr(button, "class", "log-copy-button svelte-ngcjq5");
    },
    m(target, anchor) {
      insert(target, button, anchor);
      if (!mounted) {
        dispose = listen(
          button,
          "click",
          /*handleLogNode*/
          ctx[7]
        );
        mounted = true;
      }
    },
    p: noop,
    d(detaching) {
      if (detaching) {
        detach(button);
      }
      mounted = false;
      dispose();
    }
  };
}
function create_if_block_1$6(ctx) {
  let button;
  let mounted;
  let dispose;
  return {
    c() {
      button = element("button");
      button.textContent = "copy";
      attr(button, "class", "log-copy-button svelte-ngcjq5");
    },
    m(target, anchor) {
      insert(target, button, anchor);
      if (!mounted) {
        dispose = listen(
          button,
          "click",
          /*handleCopyNodeToClipboard*/
          ctx[8]
        );
        mounted = true;
      }
    },
    p: noop,
    d(detaching) {
      if (detaching) {
        detach(button);
      }
      mounted = false;
      dispose();
    }
  };
}
function create_if_block$9(ctx) {
  let li;
  let ul;
  let current;
  let each_value = ensure_array_like(
    /*node*/
    ctx[0].children
  );
  let each_blocks = [];
  for (let i = 0; i < each_value.length; i += 1) {
    each_blocks[i] = create_each_block$7(get_each_context$7(ctx, each_value, i));
  }
  const out = (i) => transition_out(each_blocks[i], 1, 1, () => {
    each_blocks[i] = null;
  });
  return {
    c() {
      li = element("li");
      ul = element("ul");
      for (let i = 0; i < each_blocks.length; i += 1) {
        each_blocks[i].c();
      }
      attr(ul, "class", "svelte-ngcjq5");
      attr(li, "class", "row svelte-ngcjq5");
    },
    m(target, anchor) {
      insert(target, li, anchor);
      append(li, ul);
      for (let i = 0; i < each_blocks.length; i += 1) {
        if (each_blocks[i]) {
          each_blocks[i].m(ul, null);
        }
      }
      current = true;
    },
    p(ctx2, dirty) {
      if (dirty & /*node*/
      1) {
        each_value = ensure_array_like(
          /*node*/
          ctx2[0].children
        );
        let i;
        for (i = 0; i < each_value.length; i += 1) {
          const child_ctx = get_each_context$7(ctx2, each_value, i);
          if (each_blocks[i]) {
            each_blocks[i].p(child_ctx, dirty);
            transition_in(each_blocks[i], 1);
          } else {
            each_blocks[i] = create_each_block$7(child_ctx);
            each_blocks[i].c();
            transition_in(each_blocks[i], 1);
            each_blocks[i].m(ul, null);
          }
        }
        group_outros();
        for (i = each_value.length; i < each_blocks.length; i += 1) {
          out(i);
        }
        check_outros();
      }
    },
    i(local) {
      if (current) return;
      for (let i = 0; i < each_value.length; i += 1) {
        transition_in(each_blocks[i]);
      }
      current = true;
    },
    o(local) {
      each_blocks = each_blocks.filter(Boolean);
      for (let i = 0; i < each_blocks.length; i += 1) {
        transition_out(each_blocks[i]);
      }
      current = false;
    },
    d(detaching) {
      if (detaching) {
        detach(li);
      }
      destroy_each(each_blocks, detaching);
    }
  };
}
function create_each_block$7(ctx) {
  let treeviewnode;
  let current;
  treeviewnode = new TreeViewNode({
    props: {
      id: (
        /*child*/
        ctx[14].id
      )
    }
  });
  return {
    c() {
      create_component(treeviewnode.$$.fragment);
    },
    m(target, anchor) {
      mount_component(treeviewnode, target, anchor);
      current = true;
    },
    p(ctx2, dirty) {
      const treeviewnode_changes = {};
      if (dirty & /*node*/
      1) treeviewnode_changes.id = /*child*/
      ctx2[14].id;
      treeviewnode.$set(treeviewnode_changes);
    },
    i(local) {
      if (current) return;
      transition_in(treeviewnode.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(treeviewnode.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      destroy_component(treeviewnode, detaching);
    }
  };
}
function create_fragment$h(ctx) {
  let li;
  let t0;
  let div0;
  let t1_value = (
    /*node*/
    ctx[0].key + ""
  );
  let t1;
  let t2;
  let t3;
  let div1;
  let current_block_type_index;
  let if_block1;
  let div1_data_type_value;
  let t4;
  let div2;
  let t5;
  let li_data_tree_id_value;
  let t6;
  let if_block4_anchor;
  let current;
  let mounted;
  let dispose;
  let if_block0 = (
    /*hasChildren*/
    ctx[2] && create_if_block_4$3(ctx)
  );
  const if_block_creators = [create_if_block_3$4, create_else_block$8];
  const if_blocks = [];
  function select_block_type(ctx2, dirty) {
    if (
      /*valueComponent*/
      ctx2[3]
    ) return 0;
    return 1;
  }
  current_block_type_index = select_block_type(ctx);
  if_block1 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
  let if_block2 = (
    /*$props*/
    ctx[1].showLogButton && create_if_block_2$5(ctx)
  );
  let if_block3 = (
    /*$props*/
    ctx[1].showCopyButton && create_if_block_1$6(ctx)
  );
  let if_block4 = !/*node*/
  ctx[0].collapsed && /*hasChildren*/
  ctx[2] && create_if_block$9(ctx);
  return {
    c() {
      li = element("li");
      if (if_block0) if_block0.c();
      t0 = space();
      div0 = element("div");
      t1 = text(t1_value);
      t2 = text(":");
      t3 = space();
      div1 = element("div");
      if_block1.c();
      t4 = space();
      div2 = element("div");
      if (if_block2) if_block2.c();
      t5 = space();
      if (if_block3) if_block3.c();
      t6 = space();
      if (if_block4) if_block4.c();
      if_block4_anchor = empty();
      attr(div0, "class", "node-key svelte-ngcjq5");
      attr(div0, "role", "presentation");
      toggle_class(
        div0,
        "has-children",
        /*hasChildren*/
        ctx[2]
      );
      toggle_class(div0, "p-left", !/*hasChildren*/
      ctx[2]);
      attr(div1, "class", "node-value svelte-ngcjq5");
      attr(div1, "data-type", div1_data_type_value = /*node*/
      ctx[0].type);
      attr(div1, "role", "presentation");
      toggle_class(div1, "expanded", !/*node*/
      ctx[0].collapsed && /*hasChildren*/
      ctx[2]);
      toggle_class(
        div1,
        "has-children",
        /*hasChildren*/
        ctx[2]
      );
      attr(div2, "class", "buttons svelte-ngcjq5");
      attr(li, "class", "row svelte-ngcjq5");
      attr(li, "data-tree-id", li_data_tree_id_value = /*node*/
      ctx[0].id);
      toggle_class(
        li,
        "collapsed",
        /*node*/
        ctx[0].collapsed && /*hasChildren*/
        ctx[2]
      );
    },
    m(target, anchor) {
      insert(target, li, anchor);
      if (if_block0) if_block0.m(li, null);
      append(li, t0);
      append(li, div0);
      append(div0, t1);
      append(div0, t2);
      append(li, t3);
      append(li, div1);
      if_blocks[current_block_type_index].m(div1, null);
      append(li, t4);
      append(li, div2);
      if (if_block2) if_block2.m(div2, null);
      append(div2, t5);
      if (if_block3) if_block3.m(div2, null);
      insert(target, t6, anchor);
      if (if_block4) if_block4.m(target, anchor);
      insert(target, if_block4_anchor, anchor);
      current = true;
      if (!mounted) {
        dispose = [listen(
          div0,
          "click",
          /*handleToggleCollapse*/
          ctx[9]
        ), listen(
          div1,
          "click",
          /*handleToggleCollapse*/
          ctx[9]
        )];
        mounted = true;
      }
    },
    p(ctx2, _ref) {
      let [dirty] = _ref;
      if (
        /*hasChildren*/
        ctx2[2]
      ) {
        if (if_block0) {
          if_block0.p(ctx2, dirty);
        } else {
          if_block0 = create_if_block_4$3(ctx2);
          if_block0.c();
          if_block0.m(li, t0);
        }
      } else if (if_block0) {
        if_block0.d(1);
        if_block0 = null;
      }
      if ((!current || dirty & /*node*/
      1) && t1_value !== (t1_value = /*node*/
      ctx2[0].key + "")) set_data(t1, t1_value);
      if (!current || dirty & /*hasChildren*/
      4) {
        toggle_class(
          div0,
          "has-children",
          /*hasChildren*/
          ctx2[2]
        );
      }
      if (!current || dirty & /*hasChildren*/
      4) {
        toggle_class(div0, "p-left", !/*hasChildren*/
        ctx2[2]);
      }
      let previous_block_index = current_block_type_index;
      current_block_type_index = select_block_type(ctx2);
      if (current_block_type_index === previous_block_index) {
        if_blocks[current_block_type_index].p(ctx2, dirty);
      } else {
        group_outros();
        transition_out(if_blocks[previous_block_index], 1, 1, () => {
          if_blocks[previous_block_index] = null;
        });
        check_outros();
        if_block1 = if_blocks[current_block_type_index];
        if (!if_block1) {
          if_block1 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx2);
          if_block1.c();
        } else {
          if_block1.p(ctx2, dirty);
        }
        transition_in(if_block1, 1);
        if_block1.m(div1, null);
      }
      if (!current || dirty & /*node*/
      1 && div1_data_type_value !== (div1_data_type_value = /*node*/
      ctx2[0].type)) {
        attr(div1, "data-type", div1_data_type_value);
      }
      if (!current || dirty & /*node, hasChildren*/
      5) {
        toggle_class(div1, "expanded", !/*node*/
        ctx2[0].collapsed && /*hasChildren*/
        ctx2[2]);
      }
      if (!current || dirty & /*hasChildren*/
      4) {
        toggle_class(
          div1,
          "has-children",
          /*hasChildren*/
          ctx2[2]
        );
      }
      if (
        /*$props*/
        ctx2[1].showLogButton
      ) {
        if (if_block2) {
          if_block2.p(ctx2, dirty);
        } else {
          if_block2 = create_if_block_2$5(ctx2);
          if_block2.c();
          if_block2.m(div2, t5);
        }
      } else if (if_block2) {
        if_block2.d(1);
        if_block2 = null;
      }
      if (
        /*$props*/
        ctx2[1].showCopyButton
      ) {
        if (if_block3) {
          if_block3.p(ctx2, dirty);
        } else {
          if_block3 = create_if_block_1$6(ctx2);
          if_block3.c();
          if_block3.m(div2, null);
        }
      } else if (if_block3) {
        if_block3.d(1);
        if_block3 = null;
      }
      if (!current || dirty & /*node*/
      1 && li_data_tree_id_value !== (li_data_tree_id_value = /*node*/
      ctx2[0].id)) {
        attr(li, "data-tree-id", li_data_tree_id_value);
      }
      if (!current || dirty & /*node, hasChildren*/
      5) {
        toggle_class(
          li,
          "collapsed",
          /*node*/
          ctx2[0].collapsed && /*hasChildren*/
          ctx2[2]
        );
      }
      if (!/*node*/
      ctx2[0].collapsed && /*hasChildren*/
      ctx2[2]) {
        if (if_block4) {
          if_block4.p(ctx2, dirty);
          if (dirty & /*node, hasChildren*/
          5) {
            transition_in(if_block4, 1);
          }
        } else {
          if_block4 = create_if_block$9(ctx2);
          if_block4.c();
          transition_in(if_block4, 1);
          if_block4.m(if_block4_anchor.parentNode, if_block4_anchor);
        }
      } else if (if_block4) {
        group_outros();
        transition_out(if_block4, 1, 1, () => {
          if_block4 = null;
        });
        check_outros();
      }
    },
    i(local) {
      if (current) return;
      transition_in(if_block1);
      transition_in(if_block4);
      current = true;
    },
    o(local) {
      transition_out(if_block1);
      transition_out(if_block4);
      current = false;
    },
    d(detaching) {
      if (detaching) {
        detach(li);
        detach(t6);
        detach(if_block4_anchor);
      }
      if (if_block0) if_block0.d();
      if_blocks[current_block_type_index].d();
      if (if_block2) if_block2.d();
      if (if_block3) if_block3.d();
      if (if_block4) if_block4.d(detaching);
      mounted = false;
      run_all(dispose);
    }
  };
}
function instance$h($$self, $$props, $$invalidate) {
  let hasChildren;
  let props;
  let valueComponent;
  let $rootElementStore;
  let $props, $$unsubscribe_props = noop, $$subscribe_props = () => ($$unsubscribe_props(), $$unsubscribe_props = subscribe(props, ($$value) => $$invalidate(1, $props = $$value)), props);
  $$self.$$.on_destroy.push(() => $$unsubscribe_props());
  let {
    id
  } = $$props;
  const {
    treeStore,
    propsStore,
    rootElementStore
  } = getContext$1("svelte-tree-view");
  component_subscribe($$self, rootElementStore, (value) => $$invalidate(12, $rootElementStore = value));
  let node;
  treeStore.treeMap.subscribe((value) => {
    const n = value.get(id);
    if (n && node !== n) {
      $$invalidate(0, node = n);
    }
  });
  function handleLogNode() {
    console.info("%c [svelte-tree-view]: Property added to window._node", "color: #b8e248");
    console.log(node.value);
    try {
      if (typeof window !== "undefined") window._node = node.value;
    } catch (err) {
      console.error("Failed to set _node, window was undefined");
    }
  }
  function handleCopyNodeToClipboard() {
    try {
      navigator.clipboard.writeText(JSON.stringify(node.value));
    } catch (err) {
      console.error("Copying node to clipboard failed: ", err);
    }
  }
  function handleToggleCollapse() {
    var _a;
    if (hasChildren) {
      treeStore.toggleCollapse(node.id);
    } else if (node.circularOfId) {
      treeStore.expandAllNodesToNode(node.circularOfId);
      (_a = $rootElementStore === null || $rootElementStore === void 0 ? void 0 : $rootElementStore.querySelector('li[data-tree-id="'.concat(node.circularOfId, '"]'))) === null || _a === void 0 ? void 0 : _a.scrollIntoView();
    }
  }
  function valueComponentDefaultFormatter(val) {
    return propsStore.formatValue(val, node);
  }
  $$self.$$set = ($$props2) => {
    if ("id" in $$props2) $$invalidate(11, id = $$props2.id);
  };
  $$self.$$.update = () => {
    if ($$self.$$.dirty & /*id*/
    2048) {
      {
        let found2 = treeStore.getNode(id);
        if (!found2) {
          throw Error("[svelte-tree-view] TreeViewNode.svelte received undefined node from treeMapStore whereas it should be already unmounted!");
        }
        $$invalidate(0, node = found2);
      }
    }
    if ($$self.$$.dirty & /*node*/
    1) {
      $$invalidate(2, hasChildren = node && node.children.length > 0);
    }
    if ($$self.$$.dirty & /*$props*/
    2) {
      $$invalidate(3, valueComponent = $props.valueComponent);
    }
  };
  $$subscribe_props($$invalidate(4, props = propsStore.props));
  return [node, $props, hasChildren, valueComponent, props, propsStore, rootElementStore, handleLogNode, handleCopyNodeToClipboard, handleToggleCollapse, valueComponentDefaultFormatter, id];
}
class TreeViewNode extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$h, create_fragment$h, safe_not_equal, {
      id: 11
    }, add_css$h);
  }
}
function add_css$g(target) {
  append_styles(target, "svelte-167awo5", ":root{--tree-view-font-family:'Helvetica Neue', 'Calibri Light', Roboto, sans-serif;--tree-view-font-size:13px;--tree-view-left-indent:0.875em;--tree-view-line-height:1.1;--tree-view-key-margin-right:0.5em}ul.svelte-167awo5{background:var(--tree-view-base00);font-family:var(--tree-view-font-family);font-size:var(--tree-view-font-size);height:max-content;list-style:none;margin:0;padding:0;width:max-content}");
}
function get_each_context$6(ctx, list, i) {
  const child_ctx = ctx.slice();
  child_ctx[18] = list[i];
  return child_ctx;
}
function create_each_block$6(ctx) {
  let treeviewnode;
  let current;
  treeviewnode = new TreeViewNode({
    props: {
      id: (
        /*child*/
        ctx[18].id
      )
    }
  });
  return {
    c() {
      create_component(treeviewnode.$$.fragment);
    },
    m(target, anchor) {
      mount_component(treeviewnode, target, anchor);
      current = true;
    },
    p(ctx2, dirty) {
      const treeviewnode_changes = {};
      if (dirty & /*$rootNode*/
      4) treeviewnode_changes.id = /*child*/
      ctx2[18].id;
      treeviewnode.$set(treeviewnode_changes);
    },
    i(local) {
      if (current) return;
      transition_in(treeviewnode.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(treeviewnode.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      destroy_component(treeviewnode, detaching);
    }
  };
}
function create_fragment$g(ctx) {
  let ul;
  let ul_class_value;
  let current;
  let each_value = ensure_array_like(
    /*$rootNode*/
    ctx[2].children
  );
  let each_blocks = [];
  for (let i = 0; i < each_value.length; i += 1) {
    each_blocks[i] = create_each_block$6(get_each_context$6(ctx, each_value, i));
  }
  const out = (i) => transition_out(each_blocks[i], 1, 1, () => {
    each_blocks[i] = null;
  });
  return {
    c() {
      ul = element("ul");
      for (let i = 0; i < each_blocks.length; i += 1) {
        each_blocks[i].c();
      }
      attr(ul, "class", ul_class_value = null_to_empty("".concat(
        /*$$props*/
        ctx[3].class || "",
        " svelte-tree-view"
      )) + " svelte-167awo5");
    },
    m(target, anchor) {
      insert(target, ul, anchor);
      for (let i = 0; i < each_blocks.length; i += 1) {
        if (each_blocks[i]) {
          each_blocks[i].m(ul, null);
        }
      }
      ctx[13](ul);
      current = true;
    },
    p(ctx2, _ref) {
      let [dirty] = _ref;
      if (dirty & /*$rootNode*/
      4) {
        each_value = ensure_array_like(
          /*$rootNode*/
          ctx2[2].children
        );
        let i;
        for (i = 0; i < each_value.length; i += 1) {
          const child_ctx = get_each_context$6(ctx2, each_value, i);
          if (each_blocks[i]) {
            each_blocks[i].p(child_ctx, dirty);
            transition_in(each_blocks[i], 1);
          } else {
            each_blocks[i] = create_each_block$6(child_ctx);
            each_blocks[i].c();
            transition_in(each_blocks[i], 1);
            each_blocks[i].m(ul, null);
          }
        }
        group_outros();
        for (i = each_value.length; i < each_blocks.length; i += 1) {
          out(i);
        }
        check_outros();
      }
      if (!current || dirty & /*$$props*/
      8 && ul_class_value !== (ul_class_value = null_to_empty("".concat(
        /*$$props*/
        ctx2[3].class || "",
        " svelte-tree-view"
      )) + " svelte-167awo5")) {
        attr(ul, "class", ul_class_value);
      }
    },
    i(local) {
      if (current) return;
      for (let i = 0; i < each_value.length; i += 1) {
        transition_in(each_blocks[i]);
      }
      current = true;
    },
    o(local) {
      each_blocks = each_blocks.filter(Boolean);
      for (let i = 0; i < each_blocks.length; i += 1) {
        transition_out(each_blocks[i]);
      }
      current = false;
    },
    d(detaching) {
      if (detaching) {
        detach(ul);
      }
      destroy_each(each_blocks, detaching);
      ctx[13](null);
    }
  };
}
function instance$g($$self, $$props, $$invalidate) {
  let rootNode;
  let $rootNode, $$unsubscribe_rootNode = noop, $$subscribe_rootNode = () => ($$unsubscribe_rootNode(), $$unsubscribe_rootNode = subscribe(rootNode, ($$value) => $$invalidate(2, $rootNode = $$value)), rootNode);
  $$self.$$.on_destroy.push(() => $$unsubscribe_rootNode());
  var _a;
  let {
    data,
    theme = void 0,
    showLogButton = false,
    showCopyButton = false,
    valueComponent = void 0,
    recursionOpts = {},
    valueFormatter = void 0
  } = $$props;
  let rootElement = null;
  const defaultRecursionOpts = {
    maxDepth: 16,
    omitKeys: [],
    stopCircularRecursion: false,
    shouldExpandNode: () => false
  };
  let props = {
    showLogButton,
    showCopyButton,
    valueComponent,
    recursionOpts: {
      ...defaultRecursionOpts,
      ...recursionOpts
    },
    valueFormatter
  };
  const propsStore = createPropsStore(props);
  const rootElementStore = createRootElementStore();
  const treeStore = createTreeStore(propsStore);
  setContext$1("svelte-tree-view", {
    propsStore,
    rootElementStore,
    treeStore
  });
  onMount(() => {
    rootElementStore.set(rootElement);
  });
  function ul_binding($$value) {
    binding_callbacks[$$value ? "unshift" : "push"](() => {
      rootElement = $$value;
      $$invalidate(0, rootElement);
    });
  }
  $$self.$$set = ($$new_props) => {
    $$invalidate(3, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    if ("data" in $$new_props) $$invalidate(4, data = $$new_props.data);
    if ("theme" in $$new_props) $$invalidate(5, theme = $$new_props.theme);
    if ("showLogButton" in $$new_props) $$invalidate(6, showLogButton = $$new_props.showLogButton);
    if ("showCopyButton" in $$new_props) $$invalidate(7, showCopyButton = $$new_props.showCopyButton);
    if ("valueComponent" in $$new_props) $$invalidate(8, valueComponent = $$new_props.valueComponent);
    if ("recursionOpts" in $$new_props) $$invalidate(9, recursionOpts = $$new_props.recursionOpts);
    if ("valueFormatter" in $$new_props) $$invalidate(10, valueFormatter = $$new_props.valueFormatter);
  };
  $$self.$$.update = () => {
    if ($$self.$$.dirty & /*showLogButton, showCopyButton, valueComponent, valueFormatter, props*/
    5568) {
      {
        $$invalidate(12, props = {
          showLogButton,
          showCopyButton,
          valueComponent,
          valueFormatter,
          recursionOpts: props.recursionOpts
        });
      }
    }
    if ($$self.$$.dirty & /*recursionOpts, props, _a, data*/
    6672) {
      {
        const newRecursionOpts = {
          ...defaultRecursionOpts,
          ...recursionOpts
        };
        const recomputeExpandNode = ($$invalidate(11, _a = props === null || props === void 0 ? void 0 : props.recursionOpts) === null || _a === void 0 ? void 0 : _a.shouldExpandNode) !== newRecursionOpts.shouldExpandNode;
        const oldTreeMap = get_store_value(treeStore.treeMap);
        const {
          treeMap,
          tree,
          iteratedValues
        } = recomputeTree(data, oldTreeMap, newRecursionOpts, recomputeExpandNode);
        treeStore.init(tree, treeMap, iteratedValues);
        $$invalidate(12, props.recursionOpts = newRecursionOpts, props);
        propsStore.setProps(props);
      }
    }
    if ($$self.$$.dirty & /*theme, rootElement*/
    33) {
      {
        if (theme && rootElement) {
          let key;
          for (key in theme) {
            const value = theme[key];
            if (rootElement && key.includes("base") && value) {
              rootElement.style.setProperty("--tree-view-".concat(key), value);
            }
          }
        }
      }
    }
  };
  $$subscribe_rootNode($$invalidate(1, rootNode = treeStore.tree));
  $$props = exclude_internal_props($$props);
  return [rootElement, rootNode, $rootNode, $$props, data, theme, showLogButton, showCopyButton, valueComponent, recursionOpts, valueFormatter, _a, props, ul_binding];
}
class TreeView extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$g, create_fragment$g, safe_not_equal, {
      data: 4,
      theme: 5,
      showLogButton: 6,
      showCopyButton: 7,
      valueComponent: 8,
      recursionOpts: 9,
      valueFormatter: 10
    }, add_css$g);
  }
}
function add_css$f(target) {
  append_styles(target, "svelte-fdudio", ".split-view.svelte-fdudio{border-top:1px solid rgba(255, 162, 177, 0.2);color:#fff;display:flex;height:calc(100% - var(--height-tabs-menu));width:100%}.split-view h2{color:rgb(187, 145, 163);font-family:var(--font-sans);font-size:var(--font-medium);font-weight:400;letter-spacing:1px;margin:0;text-transform:uppercase}.split-view > .left-panel{display:flex;flex-direction:column;flex-grow:1;overflow:scroll;padding:1em}.split-view > .right-panel{border-left:1px solid rgba(255, 162, 177, 0.2);display:flex;flex-direction:column;flex-grow:1;overflow:scroll;padding:1em}.split-view .hidden{visibility:hidden}");
}
const get_right_slot_changes = (dirty) => ({});
const get_right_slot_context = (ctx) => ({
  class: "right-panel"
});
const get_left_slot_changes = (dirty) => ({});
const get_left_slot_context = (ctx) => ({
  class: "left-panel"
});
function create_fragment$f(ctx) {
  let section;
  let t;
  let current;
  const left_slot_template = (
    /*#slots*/
    ctx[1].left
  );
  const left_slot = create_slot(
    left_slot_template,
    ctx,
    /*$$scope*/
    ctx[0],
    get_left_slot_context
  );
  const right_slot_template = (
    /*#slots*/
    ctx[1].right
  );
  const right_slot = create_slot(
    right_slot_template,
    ctx,
    /*$$scope*/
    ctx[0],
    get_right_slot_context
  );
  return {
    c() {
      section = element("section");
      if (left_slot) left_slot.c();
      t = space();
      if (right_slot) right_slot.c();
      attr(section, "class", "split-view svelte-fdudio");
    },
    m(target, anchor) {
      insert(target, section, anchor);
      if (left_slot) {
        left_slot.m(section, null);
      }
      append(section, t);
      if (right_slot) {
        right_slot.m(section, null);
      }
      current = true;
    },
    p(ctx2, _ref) {
      let [dirty] = _ref;
      if (left_slot) {
        if (left_slot.p && (!current || dirty & /*$$scope*/
        1)) {
          update_slot_base(
            left_slot,
            left_slot_template,
            ctx2,
            /*$$scope*/
            ctx2[0],
            !current ? get_all_dirty_from_scope(
              /*$$scope*/
              ctx2[0]
            ) : get_slot_changes(
              left_slot_template,
              /*$$scope*/
              ctx2[0],
              dirty,
              get_left_slot_changes
            ),
            get_left_slot_context
          );
        }
      }
      if (right_slot) {
        if (right_slot.p && (!current || dirty & /*$$scope*/
        1)) {
          update_slot_base(
            right_slot,
            right_slot_template,
            ctx2,
            /*$$scope*/
            ctx2[0],
            !current ? get_all_dirty_from_scope(
              /*$$scope*/
              ctx2[0]
            ) : get_slot_changes(
              right_slot_template,
              /*$$scope*/
              ctx2[0],
              dirty,
              get_right_slot_changes
            ),
            get_right_slot_context
          );
        }
      }
    },
    i(local) {
      if (current) return;
      transition_in(left_slot, local);
      transition_in(right_slot, local);
      current = true;
    },
    o(local) {
      transition_out(left_slot, local);
      transition_out(right_slot, local);
      current = false;
    },
    d(detaching) {
      if (detaching) {
        detach(section);
      }
      if (left_slot) left_slot.d(detaching);
      if (right_slot) right_slot.d(detaching);
    }
  };
}
function instance$f($$self, $$props, $$invalidate) {
  let {
    $$slots: slots = {},
    $$scope
  } = $$props;
  $$self.$$set = ($$props2) => {
    if ("$$scope" in $$props2) $$invalidate(0, $$scope = $$props2.$$scope);
  };
  return [$$scope, slots];
}
class SplitView extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$f, create_fragment$f, safe_not_equal, {}, add_css$f);
  }
}
function add_css$e(target) {
  append_styles(target, "svelte-it3v6s", "button.svelte-it3v6s{background:transparent;border:0;border-radius:2px;color:#d3d3d9;cursor:pointer;font-family:var(--font-family);font-size:var(--font-small);font-weight:400;padding:6px 10px;text-transform:uppercase}button.svelte-it3v6s:hover{background:rgba(255, 162, 177, 0.4);color:#fff}button.selected.svelte-it3v6s{background:rgba(255, 162, 177, 0.4)}");
}
function create_fragment$e(ctx) {
  let button;
  let button_class_value;
  let current;
  let mounted;
  let dispose;
  const default_slot_template = (
    /*#slots*/
    ctx[3].default
  );
  const default_slot = create_slot(
    default_slot_template,
    ctx,
    /*$$scope*/
    ctx[2],
    null
  );
  return {
    c() {
      button = element("button");
      if (default_slot) default_slot.c();
      attr(button, "class", button_class_value = null_to_empty("".concat(
        /*$$props*/
        ctx[1].class || ""
      )) + " svelte-it3v6s");
      toggle_class(
        button,
        "selected",
        /*selected*/
        ctx[0]
      );
    },
    m(target, anchor) {
      insert(target, button, anchor);
      if (default_slot) {
        default_slot.m(button, null);
      }
      current = true;
      if (!mounted) {
        dispose = [listen(
          button,
          "click",
          /*click_handler*/
          ctx[4]
        ), listen(
          button,
          "mouseover",
          /*mouseover_handler*/
          ctx[5]
        ), listen(
          button,
          "mouseenter",
          /*mouseenter_handler*/
          ctx[6]
        ), listen(
          button,
          "mouseleave",
          /*mouseleave_handler*/
          ctx[7]
        ), listen(
          button,
          "focus",
          /*focus_handler*/
          ctx[8]
        )];
        mounted = true;
      }
    },
    p(ctx2, _ref) {
      let [dirty] = _ref;
      if (default_slot) {
        if (default_slot.p && (!current || dirty & /*$$scope*/
        4)) {
          update_slot_base(
            default_slot,
            default_slot_template,
            ctx2,
            /*$$scope*/
            ctx2[2],
            !current ? get_all_dirty_from_scope(
              /*$$scope*/
              ctx2[2]
            ) : get_slot_changes(
              default_slot_template,
              /*$$scope*/
              ctx2[2],
              dirty,
              null
            ),
            null
          );
        }
      }
      if (!current || dirty & /*$$props*/
      2 && button_class_value !== (button_class_value = null_to_empty("".concat(
        /*$$props*/
        ctx2[1].class || ""
      )) + " svelte-it3v6s")) {
        attr(button, "class", button_class_value);
      }
      if (!current || dirty & /*$$props, selected*/
      3) {
        toggle_class(
          button,
          "selected",
          /*selected*/
          ctx2[0]
        );
      }
    },
    i(local) {
      if (current) return;
      transition_in(default_slot, local);
      current = true;
    },
    o(local) {
      transition_out(default_slot, local);
      current = false;
    },
    d(detaching) {
      if (detaching) {
        detach(button);
      }
      if (default_slot) default_slot.d(detaching);
      mounted = false;
      run_all(dispose);
    }
  };
}
function instance$e($$self, $$props, $$invalidate) {
  let {
    $$slots: slots = {},
    $$scope
  } = $$props;
  let {
    selected = false
  } = $$props;
  function click_handler(event) {
    bubble.call(this, $$self, event);
  }
  function mouseover_handler(event) {
    bubble.call(this, $$self, event);
  }
  function mouseenter_handler(event) {
    bubble.call(this, $$self, event);
  }
  function mouseleave_handler(event) {
    bubble.call(this, $$self, event);
  }
  function focus_handler(event) {
    bubble.call(this, $$self, event);
  }
  $$self.$$set = ($$new_props) => {
    $$invalidate(1, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    if ("selected" in $$new_props) $$invalidate(0, selected = $$new_props.selected);
    if ("$$scope" in $$new_props) $$invalidate(2, $$scope = $$new_props.$$scope);
  };
  $$props = exclude_internal_props($$props);
  return [selected, $$props, $$scope, slots, click_handler, mouseover_handler, mouseenter_handler, mouseleave_handler, focus_handler];
}
class Button extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$e, create_fragment$e, safe_not_equal, {
      selected: 0
    }, add_css$e);
  }
}
function add_css$d(target) {
  append_styles(target, "svelte-8c7oqn", '@charset "UTF-8";.top-row.svelte-8c7oqn{align-items:center;display:flex;justify-content:space-between}.left-panel[slot=left].svelte-8c7oqn{overflow:scroll}.right-panel[slot=right].svelte-8c7oqn{border-left:1px solid rgba(255, 162, 177, 0.2);flex-grow:0;min-width:200px;width:200px}.split-view .selection-btn{height:24px;width:35px}.caret-icon.svelte-8c7oqn::before{content:"▶"}.caret-icon.expanded.svelte-8c7oqn::before{content:"▼"}.no-marks.svelte-8c7oqn{color:#85d9ef;margin:0.5em 0 1.25em 1em}.split-view .tree-view{margin:0.5em 0 1.25em 0}');
}
function create_default_slot_1$4(ctx) {
  let t;
  return {
    c() {
      t = text("log");
    },
    m(target, anchor) {
      insert(target, t, anchor);
    },
    d(detaching) {
      if (detaching) {
        detach(t);
      }
    }
  };
}
function create_left_slot$4(ctx) {
  let div1;
  let div0;
  let h2;
  let t1;
  let button;
  let t2;
  let treeview;
  let current;
  button = new Button({
    props: {
      $$slots: {
        default: [create_default_slot_1$4]
      },
      $$scope: {
        ctx
      }
    }
  });
  button.$on(
    "click",
    /*handleClickLogDoc*/
    ctx[6]
  );
  treeview = new TreeView({
    props: {
      class: "tree-view",
      data: (
        /*doc*/
        ctx[0]
      ),
      showLogButton: true,
      showCopyButton: true,
      valueFormatter: formatDocNodeValue
    }
  });
  return {
    c() {
      div1 = element("div");
      div0 = element("div");
      h2 = element("h2");
      h2.textContent = "Current doc";
      t1 = space();
      create_component(button.$$.fragment);
      t2 = space();
      create_component(treeview.$$.fragment);
      attr(div0, "class", "top-row svelte-8c7oqn");
      attr(div1, "slot", "left");
      attr(div1, "class", "left-panel svelte-8c7oqn");
    },
    m(target, anchor) {
      insert(target, div1, anchor);
      append(div1, div0);
      append(div0, h2);
      append(div0, t1);
      mount_component(button, div0, null);
      append(div1, t2);
      mount_component(treeview, div1, null);
      current = true;
    },
    p(ctx2, dirty) {
      const button_changes = {};
      if (dirty & /*$$scope*/
      1024) {
        button_changes.$$scope = {
          dirty,
          ctx: ctx2
        };
      }
      button.$set(button_changes);
      const treeview_changes = {};
      if (dirty & /*doc*/
      1) treeview_changes.data = /*doc*/
      ctx2[0];
      treeview.$set(treeview_changes);
    },
    i(local) {
      if (current) return;
      transition_in(button.$$.fragment, local);
      transition_in(treeview.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(button.$$.fragment, local);
      transition_out(treeview.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      if (detaching) {
        detach(div1);
      }
      destroy_component(button);
      destroy_component(treeview);
    }
  };
}
function create_default_slot$4(ctx) {
  let span;
  return {
    c() {
      span = element("span");
      attr(span, "class", "caret-icon svelte-8c7oqn");
      toggle_class(
        span,
        "expanded",
        /*expandedSelection*/
        ctx[5]
      );
    },
    m(target, anchor) {
      insert(target, span, anchor);
    },
    p(ctx2, dirty) {
      if (dirty & /*expandedSelection*/
      32) {
        toggle_class(
          span,
          "expanded",
          /*expandedSelection*/
          ctx2[5]
        );
      }
    },
    d(detaching) {
      if (detaching) {
        detach(span);
      }
    }
  };
}
function create_else_block$7(ctx) {
  let treeview;
  let current;
  treeview = new TreeView({
    props: {
      class: "tree-view",
      data: (
        /*activeMarks*/
        ctx[2]
      )
    }
  });
  return {
    c() {
      create_component(treeview.$$.fragment);
    },
    m(target, anchor) {
      mount_component(treeview, target, anchor);
      current = true;
    },
    p(ctx2, dirty) {
      const treeview_changes = {};
      if (dirty & /*activeMarks*/
      4) treeview_changes.data = /*activeMarks*/
      ctx2[2];
      treeview.$set(treeview_changes);
    },
    i(local) {
      if (current) return;
      transition_in(treeview.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(treeview.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      destroy_component(treeview, detaching);
    }
  };
}
function create_if_block$8(ctx) {
  let div;
  return {
    c() {
      div = element("div");
      div.textContent = "No active marks";
      attr(div, "class", "no-marks svelte-8c7oqn");
    },
    m(target, anchor) {
      insert(target, div, anchor);
    },
    p: noop,
    i: noop,
    o: noop,
    d(detaching) {
      if (detaching) {
        detach(div);
      }
    }
  };
}
function create_right_slot$5(ctx) {
  let div3;
  let div0;
  let h20;
  let t1;
  let button;
  let t2;
  let treeview0;
  let t3;
  let div1;
  let h21;
  let t5;
  let current_block_type_index;
  let if_block;
  let t6;
  let div2;
  let h22;
  let t8;
  let treeview1;
  let current;
  button = new Button({
    props: {
      class: "selection-btn",
      $$slots: {
        default: [create_default_slot$4]
      },
      $$scope: {
        ctx
      }
    }
  });
  button.$on(
    "click",
    /*handleExpandSelection*/
    ctx[7]
  );
  treeview0 = new TreeView({
    props: {
      class: "tree-view",
      data: (
        /*selection*/
        ctx[1]
      )
    }
  });
  const if_block_creators = [create_if_block$8, create_else_block$7];
  const if_blocks = [];
  function select_block_type(ctx2, dirty) {
    if (
      /*activeMarks*/
      ctx2[2].length === 0
    ) return 0;
    return 1;
  }
  current_block_type_index = select_block_type(ctx);
  if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
  treeview1 = new TreeView({
    props: {
      class: "tree-view",
      data: {
        nodeSize: (
          /*nodeSize*/
          ctx[3]
        ),
        childCount: (
          /*childCount*/
          ctx[4]
        )
      }
    }
  });
  return {
    c() {
      div3 = element("div");
      div0 = element("div");
      h20 = element("h2");
      h20.textContent = "Selection";
      t1 = space();
      create_component(button.$$.fragment);
      t2 = space();
      create_component(treeview0.$$.fragment);
      t3 = space();
      div1 = element("div");
      h21 = element("h2");
      h21.textContent = "Active marks";
      t5 = space();
      if_block.c();
      t6 = space();
      div2 = element("div");
      h22 = element("h2");
      h22.textContent = "Document stats";
      t8 = space();
      create_component(treeview1.$$.fragment);
      attr(div0, "class", "top-row svelte-8c7oqn");
      attr(div3, "slot", "right");
      attr(div3, "class", "right-panel svelte-8c7oqn");
    },
    m(target, anchor) {
      insert(target, div3, anchor);
      append(div3, div0);
      append(div0, h20);
      append(div0, t1);
      mount_component(button, div0, null);
      append(div3, t2);
      mount_component(treeview0, div3, null);
      append(div3, t3);
      append(div3, div1);
      append(div1, h21);
      append(div1, t5);
      if_blocks[current_block_type_index].m(div1, null);
      append(div3, t6);
      append(div3, div2);
      append(div2, h22);
      append(div2, t8);
      mount_component(treeview1, div2, null);
      current = true;
    },
    p(ctx2, dirty) {
      const button_changes = {};
      if (dirty & /*$$scope, expandedSelection*/
      1056) {
        button_changes.$$scope = {
          dirty,
          ctx: ctx2
        };
      }
      button.$set(button_changes);
      const treeview0_changes = {};
      if (dirty & /*selection*/
      2) treeview0_changes.data = /*selection*/
      ctx2[1];
      treeview0.$set(treeview0_changes);
      let previous_block_index = current_block_type_index;
      current_block_type_index = select_block_type(ctx2);
      if (current_block_type_index === previous_block_index) {
        if_blocks[current_block_type_index].p(ctx2, dirty);
      } else {
        group_outros();
        transition_out(if_blocks[previous_block_index], 1, 1, () => {
          if_blocks[previous_block_index] = null;
        });
        check_outros();
        if_block = if_blocks[current_block_type_index];
        if (!if_block) {
          if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx2);
          if_block.c();
        } else {
          if_block.p(ctx2, dirty);
        }
        transition_in(if_block, 1);
        if_block.m(div1, null);
      }
      const treeview1_changes = {};
      if (dirty & /*nodeSize, childCount*/
      24) treeview1_changes.data = {
        nodeSize: (
          /*nodeSize*/
          ctx2[3]
        ),
        childCount: (
          /*childCount*/
          ctx2[4]
        )
      };
      treeview1.$set(treeview1_changes);
    },
    i(local) {
      if (current) return;
      transition_in(button.$$.fragment, local);
      transition_in(treeview0.$$.fragment, local);
      transition_in(if_block);
      transition_in(treeview1.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(button.$$.fragment, local);
      transition_out(treeview0.$$.fragment, local);
      transition_out(if_block);
      transition_out(treeview1.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      if (detaching) {
        detach(div3);
      }
      destroy_component(button);
      destroy_component(treeview0);
      if_blocks[current_block_type_index].d();
      destroy_component(treeview1);
    }
  };
}
function create_fragment$d(ctx) {
  let splitview;
  let current;
  splitview = new SplitView({
    props: {
      $$slots: {
        right: [create_right_slot$5],
        left: [create_left_slot$4]
      },
      $$scope: {
        ctx
      }
    }
  });
  return {
    c() {
      create_component(splitview.$$.fragment);
    },
    m(target, anchor) {
      mount_component(splitview, target, anchor);
      current = true;
    },
    p(ctx2, _ref) {
      let [dirty] = _ref;
      const splitview_changes = {};
      if (dirty & /*$$scope, nodeSize, childCount, activeMarks, selection, expandedSelection, doc*/
      1087) {
        splitview_changes.$$scope = {
          dirty,
          ctx: ctx2
        };
      }
      splitview.$set(splitview_changes);
    },
    i(local) {
      if (current) return;
      transition_in(splitview.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(splitview.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      destroy_component(splitview, detaching);
    }
  };
}
function formatDocNodeValue(val, n) {
  if (n.type === "object" && val.type) {
    return "{} ".concat(val.type);
  }
}
function instance$d($$self, $$props, $$invalidate) {
  const {
    view: view2
  } = getContext("editor-view");
  let doc2 = view2.state.doc.toJSON();
  let selection = createSelection(view2.state.selection);
  let currentState = view2.state;
  let activeMarks = [];
  let nodeSize2 = view2.state.doc.nodeSize;
  let childCount = view2.state.doc.childCount;
  let expandedSelection = false;
  latestEntry.subscribe((e) => {
    if (!e) return;
    const {
      state: state2
    } = e;
    currentState = state2;
    $$invalidate(0, doc2 = state2.doc.toJSON());
    $$invalidate(1, selection = expandedSelection ? createFullSelection(state2.selection) : createSelection(state2.selection));
    $$invalidate(2, activeMarks = getActiveMarks(state2));
    $$invalidate(3, nodeSize2 = state2.doc.nodeSize);
    $$invalidate(4, childCount = state2.doc.childCount);
  });
  function handleClickLogDoc() {
    console.log(doc2);
    window._doc = doc2;
  }
  function handleExpandSelection() {
    $$invalidate(5, expandedSelection = !expandedSelection);
    if (expandedSelection) {
      $$invalidate(1, selection = createFullSelection(currentState.selection));
    } else {
      $$invalidate(1, selection = createSelection(currentState.selection));
    }
  }
  return [doc2, selection, activeMarks, nodeSize2, childCount, expandedSelection, handleClickLogDoc, handleExpandSelection];
}
class StateTab extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$d, create_fragment$d, safe_not_equal, {}, add_css$d);
  }
}
function mapSelectionDeltaChildren(_val, type, _parent) {
  if (type !== "array")
    return;
  return [];
}
function mapDocDeltaChildren(delta, type) {
  if (type === "array" && delta[1] === 0 && delta[2] === 0) {
    return [];
  } else if (type === "array" && typeof delta[0] === "string" && delta[1] === 0 && delta[2] === 2) {
    return [];
  } else if (type === "array" && delta.length === 1 && typeof delta[0] === "object") {
    return [];
  }
  if (type !== "object" || delta._t !== "a")
    return;
  const transformed = [];
  for (const key in delta) {
    if (key === "_t")
      continue;
    if (key.charAt(0) === "_") {
      transformed.push([key.substr(1), delta[key]]);
    } else {
      transformed.push([key, delta[key]]);
    }
  }
  return transformed;
}
function add_css$c(target) {
  append_styles(target, "svelte-vbjxb8", '@charset "UTF-8";ul.svelte-vbjxb8.svelte-vbjxb8{color:#fff;list-style:none;margin:0;padding:0;height:100%;width:100%}li.svelte-vbjxb8.svelte-vbjxb8{transition:background 0.7s ease}li.svelte-vbjxb8.svelte-vbjxb8:hover{background:rgba(255, 162, 177, 0.4);color:#fff}li.selected.svelte-vbjxb8.svelte-vbjxb8{background:rgba(255, 162, 177, 0.4)}li.svelte-vbjxb8+li.svelte-vbjxb8{border-top:1px solid rgb(96, 76, 104)}button.svelte-vbjxb8.svelte-vbjxb8{background:transparent;border:0;color:#d3d3d9;cursor:pointer;display:flex;font-family:monospace;font-size:var(--font-medium);justify-content:space-between;padding:6px 18px;text-transform:uppercase;width:100%}button.p-left.svelte-vbjxb8.svelte-vbjxb8{margin-left:1em}.caret-icon.svelte-vbjxb8.svelte-vbjxb8::before{content:"▶"}.caret-icon.expanded.svelte-vbjxb8.svelte-vbjxb8::before{content:"▼"}');
}
function get_each_context$5(ctx, list, i) {
  const child_ctx = ctx.slice();
  child_ctx[6] = list[i];
  child_ctx[8] = i;
  return child_ctx;
}
function get_each_context_1(ctx, list, i) {
  const child_ctx = ctx.slice();
  child_ctx[9] = list[i];
  return child_ctx;
}
function create_if_block_3$3(ctx) {
  let t0;
  let t1_value = (
    /*group*/
    ctx[6].entries.length + ""
  );
  let t1;
  let t2;
  return {
    c() {
      t0 = text("[");
      t1 = text(t1_value);
      t2 = text("]");
    },
    m(target, anchor) {
      insert(target, t0, anchor);
      insert(target, t1, anchor);
      insert(target, t2, anchor);
    },
    p(ctx2, dirty) {
      if (dirty & /*listItems*/
      1 && t1_value !== (t1_value = /*group*/
      ctx2[6].entries.length + "")) set_data(t1, t1_value);
    },
    d(detaching) {
      if (detaching) {
        detach(t0);
        detach(t1);
        detach(t2);
      }
    }
  };
}
function create_if_block_2$4(ctx) {
  let t0;
  let t1_value = (
    /*group*/
    ctx[6].topEntry.trs.length - 1 + ""
  );
  let t1;
  return {
    c() {
      t0 = text("+");
      t1 = text(t1_value);
    },
    m(target, anchor) {
      insert(target, t0, anchor);
      insert(target, t1, anchor);
    },
    p(ctx2, dirty) {
      if (dirty & /*listItems*/
      1 && t1_value !== (t1_value = /*group*/
      ctx2[6].topEntry.trs.length - 1 + "")) set_data(t1, t1_value);
    },
    d(detaching) {
      if (detaching) {
        detach(t0);
        detach(t1);
      }
    }
  };
}
function create_if_block_1$5(ctx) {
  let span;
  return {
    c() {
      span = element("span");
      attr(span, "class", "caret-icon svelte-vbjxb8");
      toggle_class(
        span,
        "expanded",
        /*group*/
        ctx[6].expanded
      );
    },
    m(target, anchor) {
      insert(target, span, anchor);
    },
    p(ctx2, dirty) {
      if (dirty & /*listItems*/
      1) {
        toggle_class(
          span,
          "expanded",
          /*group*/
          ctx2[6].expanded
        );
      }
    },
    d(detaching) {
      if (detaching) {
        detach(span);
      }
    }
  };
}
function create_if_block$7(ctx) {
  let each_blocks = [];
  let each_1_lookup = /* @__PURE__ */ new Map();
  let each_1_anchor;
  let each_value_1 = ensure_array_like(
    /*group*/
    ctx[6].entries
  );
  const get_key = (ctx2) => {
    var _ctx$;
    return (
      /*subEntry*/
      (_ctx$ = ctx2[9]) === null || _ctx$ === void 0 ? void 0 : _ctx$.id
    );
  };
  for (let i = 0; i < each_value_1.length; i += 1) {
    let child_ctx = get_each_context_1(ctx, each_value_1, i);
    let key = get_key(child_ctx);
    each_1_lookup.set(key, each_blocks[i] = create_each_block_1(key, child_ctx));
  }
  return {
    c() {
      for (let i = 0; i < each_blocks.length; i += 1) {
        each_blocks[i].c();
      }
      each_1_anchor = empty();
    },
    m(target, anchor) {
      for (let i = 0; i < each_blocks.length; i += 1) {
        if (each_blocks[i]) {
          each_blocks[i].m(target, anchor);
        }
      }
      insert(target, each_1_anchor, anchor);
    },
    p(ctx2, dirty) {
      if (dirty & /*selectedId, listItems, dispatchEvent*/
      7) {
        each_value_1 = ensure_array_like(
          /*group*/
          ctx2[6].entries
        );
        each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx2, each_value_1, each_1_lookup, each_1_anchor.parentNode, destroy_block, create_each_block_1, each_1_anchor, get_each_context_1);
      }
    },
    d(detaching) {
      if (detaching) {
        detach(each_1_anchor);
      }
      for (let i = 0; i < each_blocks.length; i += 1) {
        each_blocks[i].d(detaching);
      }
    }
  };
}
function create_each_block_1(key_1, ctx) {
  var _ctx$2;
  let li;
  let button;
  let t0_value = (
    /*subEntry*/
    ((_ctx$2 = ctx[9]) === null || _ctx$2 === void 0 ? void 0 : _ctx$2.timeStr) + ""
  );
  let t0;
  let t1;
  let mounted;
  let dispose;
  function click_handler_1() {
    return (
      /*click_handler_1*/
      ctx[5](
        /*subEntry*/
        ctx[9],
        /*groupIdx*/
        ctx[8]
      )
    );
  }
  return {
    key: key_1,
    first: null,
    c() {
      var _ctx$3;
      li = element("li");
      button = element("button");
      t0 = text(t0_value);
      t1 = space();
      attr(button, "class", "p-left svelte-vbjxb8");
      attr(li, "class", "svelte-vbjxb8");
      toggle_class(
        li,
        "selected",
        /*selectedId*/
        ctx[1] === /*subEntry*/
        ((_ctx$3 = ctx[9]) === null || _ctx$3 === void 0 ? void 0 : _ctx$3.id)
      );
      this.first = li;
    },
    m(target, anchor) {
      insert(target, li, anchor);
      append(li, button);
      append(button, t0);
      append(li, t1);
      if (!mounted) {
        dispose = listen(button, "click", click_handler_1);
        mounted = true;
      }
    },
    p(new_ctx, dirty) {
      var _ctx$4;
      ctx = new_ctx;
      if (dirty & /*listItems*/
      1 && t0_value !== (t0_value = /*subEntry*/
      ((_ctx$4 = ctx[9]) === null || _ctx$4 === void 0 ? void 0 : _ctx$4.timeStr) + "")) set_data(t0, t0_value);
      if (dirty & /*selectedId, listItems*/
      3) {
        var _ctx$5;
        toggle_class(
          li,
          "selected",
          /*selectedId*/
          ctx[1] === /*subEntry*/
          ((_ctx$5 = ctx[9]) === null || _ctx$5 === void 0 ? void 0 : _ctx$5.id)
        );
      }
    },
    d(detaching) {
      if (detaching) {
        detach(li);
      }
      mounted = false;
      dispose();
    }
  };
}
function create_each_block$5(key_1, ctx) {
  var _ctx$6;
  let li;
  let button;
  let span;
  let t0_value = (
    /*group*/
    ((_ctx$6 = ctx[6]) === null || _ctx$6 === void 0 || (_ctx$6 = _ctx$6.topEntry) === null || _ctx$6 === void 0 ? void 0 : _ctx$6.timeStr) + ""
  );
  let t0;
  let t1;
  let t2;
  let t3;
  let t4;
  let if_block3_anchor;
  let mounted;
  let dispose;
  let if_block0 = (
    /*group*/
    ctx[6].isGroup && create_if_block_3$3(ctx)
  );
  let if_block1 = (
    /*group*/
    ctx[6].topEntry && /*group*/
    ctx[6].topEntry.trs.length > 1 && create_if_block_2$4(ctx)
  );
  let if_block2 = (
    /*group*/
    ctx[6].isGroup && /*group*/
    ctx[6].entries.length > 1 && create_if_block_1$5(ctx)
  );
  function click_handler() {
    return (
      /*click_handler*/
      ctx[3](
        /*group*/
        ctx[6],
        /*groupIdx*/
        ctx[8]
      )
    );
  }
  function dblclick_handler() {
    return (
      /*dblclick_handler*/
      ctx[4](
        /*group*/
        ctx[6]
      )
    );
  }
  let if_block3 = (
    /*group*/
    ctx[6].isGroup && /*group*/
    ctx[6].expanded && create_if_block$7(ctx)
  );
  return {
    key: key_1,
    first: null,
    c() {
      var _ctx$7;
      li = element("li");
      button = element("button");
      span = element("span");
      t0 = text(t0_value);
      t1 = space();
      if (if_block0) if_block0.c();
      t2 = space();
      if (if_block1) if_block1.c();
      t3 = space();
      if (if_block2) if_block2.c();
      t4 = space();
      if (if_block3) if_block3.c();
      if_block3_anchor = empty();
      attr(button, "class", "svelte-vbjxb8");
      toggle_class(
        button,
        "is-group",
        /*group*/
        ctx[6].isGroup
      );
      attr(li, "class", "svelte-vbjxb8");
      toggle_class(li, "selected", !/*group*/
      ctx[6].expanded && /*selectedId*/
      ctx[1] === /*group*/
      ((_ctx$7 = ctx[6]) === null || _ctx$7 === void 0 || (_ctx$7 = _ctx$7.topEntry) === null || _ctx$7 === void 0 ? void 0 : _ctx$7.id));
      this.first = li;
    },
    m(target, anchor) {
      insert(target, li, anchor);
      append(li, button);
      append(button, span);
      append(span, t0);
      append(span, t1);
      if (if_block0) if_block0.m(span, null);
      append(span, t2);
      if (if_block1) if_block1.m(span, null);
      append(button, t3);
      if (if_block2) if_block2.m(button, null);
      insert(target, t4, anchor);
      if (if_block3) if_block3.m(target, anchor);
      insert(target, if_block3_anchor, anchor);
      if (!mounted) {
        dispose = [listen(button, "click", click_handler), listen(button, "dblclick", dblclick_handler)];
        mounted = true;
      }
    },
    p(new_ctx, dirty) {
      var _ctx$8;
      ctx = new_ctx;
      if (dirty & /*listItems*/
      1 && t0_value !== (t0_value = /*group*/
      ((_ctx$8 = ctx[6]) === null || _ctx$8 === void 0 || (_ctx$8 = _ctx$8.topEntry) === null || _ctx$8 === void 0 ? void 0 : _ctx$8.timeStr) + "")) set_data(t0, t0_value);
      if (
        /*group*/
        ctx[6].isGroup
      ) {
        if (if_block0) {
          if_block0.p(ctx, dirty);
        } else {
          if_block0 = create_if_block_3$3(ctx);
          if_block0.c();
          if_block0.m(span, t2);
        }
      } else if (if_block0) {
        if_block0.d(1);
        if_block0 = null;
      }
      if (
        /*group*/
        ctx[6].topEntry && /*group*/
        ctx[6].topEntry.trs.length > 1
      ) {
        if (if_block1) {
          if_block1.p(ctx, dirty);
        } else {
          if_block1 = create_if_block_2$4(ctx);
          if_block1.c();
          if_block1.m(span, null);
        }
      } else if (if_block1) {
        if_block1.d(1);
        if_block1 = null;
      }
      if (
        /*group*/
        ctx[6].isGroup && /*group*/
        ctx[6].entries.length > 1
      ) {
        if (if_block2) {
          if_block2.p(ctx, dirty);
        } else {
          if_block2 = create_if_block_1$5(ctx);
          if_block2.c();
          if_block2.m(button, null);
        }
      } else if (if_block2) {
        if_block2.d(1);
        if_block2 = null;
      }
      if (dirty & /*listItems*/
      1) {
        toggle_class(
          button,
          "is-group",
          /*group*/
          ctx[6].isGroup
        );
      }
      if (dirty & /*listItems, selectedId*/
      3) {
        var _ctx$9;
        toggle_class(li, "selected", !/*group*/
        ctx[6].expanded && /*selectedId*/
        ctx[1] === /*group*/
        ((_ctx$9 = ctx[6]) === null || _ctx$9 === void 0 || (_ctx$9 = _ctx$9.topEntry) === null || _ctx$9 === void 0 ? void 0 : _ctx$9.id));
      }
      if (
        /*group*/
        ctx[6].isGroup && /*group*/
        ctx[6].expanded
      ) {
        if (if_block3) {
          if_block3.p(ctx, dirty);
        } else {
          if_block3 = create_if_block$7(ctx);
          if_block3.c();
          if_block3.m(if_block3_anchor.parentNode, if_block3_anchor);
        }
      } else if (if_block3) {
        if_block3.d(1);
        if_block3 = null;
      }
    },
    d(detaching) {
      if (detaching) {
        detach(li);
        detach(t4);
        detach(if_block3_anchor);
      }
      if (if_block0) if_block0.d();
      if (if_block1) if_block1.d();
      if (if_block2) if_block2.d();
      if (if_block3) if_block3.d(detaching);
      mounted = false;
      run_all(dispose);
    }
  };
}
function create_fragment$c(ctx) {
  let ul;
  let each_blocks = [];
  let each_1_lookup = /* @__PURE__ */ new Map();
  let each_value = ensure_array_like(
    /*listItems*/
    ctx[0]
  );
  const get_key = (ctx2) => (
    /*group*/
    ctx2[6].id
  );
  for (let i = 0; i < each_value.length; i += 1) {
    let child_ctx = get_each_context$5(ctx, each_value, i);
    let key = get_key(child_ctx);
    each_1_lookup.set(key, each_blocks[i] = create_each_block$5(key, child_ctx));
  }
  return {
    c() {
      ul = element("ul");
      for (let i = 0; i < each_blocks.length; i += 1) {
        each_blocks[i].c();
      }
      attr(ul, "class", "svelte-vbjxb8");
    },
    m(target, anchor) {
      insert(target, ul, anchor);
      for (let i = 0; i < each_blocks.length; i += 1) {
        if (each_blocks[i]) {
          each_blocks[i].m(ul, null);
        }
      }
    },
    p(ctx2, _ref) {
      let [dirty] = _ref;
      if (dirty & /*listItems, selectedId, dispatchEvent*/
      7) {
        each_value = ensure_array_like(
          /*listItems*/
          ctx2[0]
        );
        each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx2, each_value, each_1_lookup, ul, destroy_block, create_each_block$5, null, get_each_context$5);
      }
    },
    i: noop,
    o: noop,
    d(detaching) {
      if (detaching) {
        detach(ul);
      }
      for (let i = 0; i < each_blocks.length; i += 1) {
        each_blocks[i].d();
      }
    }
  };
}
function instance$c($$self, $$props, $$invalidate) {
  let {
    listItems = [],
    selectedId
  } = $$props;
  const dispatchEvent2 = createEventDispatcher();
  const click_handler = (group, groupIdx) => {
    var _group$topEntry;
    return dispatchEvent2("click-item", {
      id: group === null || group === void 0 || (_group$topEntry = group.topEntry) === null || _group$topEntry === void 0 ? void 0 : _group$topEntry.id,
      groupIdx,
      wasTopNode: true
    });
  };
  const dblclick_handler = (group) => {
    var _group$topEntry2;
    return dispatchEvent2("dblclick-item", {
      id: group === null || group === void 0 || (_group$topEntry2 = group.topEntry) === null || _group$topEntry2 === void 0 ? void 0 : _group$topEntry2.id
    });
  };
  const click_handler_1 = (subEntry, groupIdx) => dispatchEvent2("click-item", {
    id: subEntry === null || subEntry === void 0 ? void 0 : subEntry.id,
    groupIdx,
    wasTopNode: false
  });
  $$self.$$set = ($$props2) => {
    if ("listItems" in $$props2) $$invalidate(0, listItems = $$props2.listItems);
    if ("selectedId" in $$props2) $$invalidate(1, selectedId = $$props2.selectedId);
  };
  return [listItems, selectedId, dispatchEvent2, click_handler, dblclick_handler, click_handler_1];
}
class HistoryList extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$c, create_fragment$c, safe_not_equal, {
      listItems: 0,
      selectedId: 1
    }, add_css$c);
  }
}
function add_css$b(target) {
  append_styles(target, "svelte-1a1oqej", ".added.svelte-1a1oqej.svelte-1a1oqej{display:inline-block;background:#87cc86;border-radius:1px;color:green;padding:1px 2px;text-indent:0;min-height:1ex}.deleted.svelte-1a1oqej.svelte-1a1oqej{display:inline-block;background:#d66363;border-radius:1px;color:#222;padding:1px 2px;text-decoration:line-through;text-indent:0;min-height:1ex}.updated.svelte-1a1oqej.svelte-1a1oqej{word-break:break-all}.updated.svelte-1a1oqej .added.svelte-1a1oqej{background:#eaea37}.arrow.svelte-1a1oqej.svelte-1a1oqej{color:#87cc86}");
}
function get_each_context$4(ctx, list, i) {
  const child_ctx = ctx.slice();
  child_ctx[3] = list[i];
  return child_ctx;
}
function create_else_block_1$1(ctx) {
  let t_value = (
    /*defaultFormatter*/
    ctx[0](
      /*value*/
      ctx[1]
    ) + ""
  );
  let t;
  return {
    c() {
      t = text(t_value);
    },
    m(target, anchor) {
      insert(target, t, anchor);
    },
    p(ctx2, dirty) {
      if (dirty & /*defaultFormatter, value*/
      3 && t_value !== (t_value = /*defaultFormatter*/
      ctx2[0](
        /*value*/
        ctx2[1]
      ) + "")) set_data(t, t_value);
    },
    d(detaching) {
      if (detaching) {
        detach(t);
      }
    }
  };
}
function create_if_block$6(ctx) {
  let if_block_anchor;
  function select_block_type_1(ctx2, dirty) {
    if (
      /*value*/
      ctx2[1].length === 1
    ) return create_if_block_1$4;
    if (
      /*value*/
      ctx2[1].length === 2
    ) return create_if_block_2$3;
    if (
      /*value*/
      ctx2[1].length === 3 && /*value*/
      ctx2[1][1] === 0 && /*value*/
      ctx2[1][2] === 0
    ) return create_if_block_3$2;
    if (
      /*value*/
      ctx2[1].length === 3 && /*value*/
      ctx2[1][2] === 2
    ) return create_if_block_4$2;
  }
  let current_block_type = select_block_type_1(ctx);
  let if_block = current_block_type && current_block_type(ctx);
  return {
    c() {
      if (if_block) if_block.c();
      if_block_anchor = empty();
    },
    m(target, anchor) {
      if (if_block) if_block.m(target, anchor);
      insert(target, if_block_anchor, anchor);
    },
    p(ctx2, dirty) {
      if (current_block_type === (current_block_type = select_block_type_1(ctx2)) && if_block) {
        if_block.p(ctx2, dirty);
      } else {
        if (if_block) if_block.d(1);
        if_block = current_block_type && current_block_type(ctx2);
        if (if_block) {
          if_block.c();
          if_block.m(if_block_anchor.parentNode, if_block_anchor);
        }
      }
    },
    d(detaching) {
      if (detaching) {
        detach(if_block_anchor);
      }
      if (if_block) {
        if_block.d(detaching);
      }
    }
  };
}
function create_if_block_4$2(ctx) {
  let span;
  let each_value = ensure_array_like(parseTextDiff(
    /*value*/
    ctx[1][0]
  ));
  let each_blocks = [];
  for (let i = 0; i < each_value.length; i += 1) {
    each_blocks[i] = create_each_block$4(get_each_context$4(ctx, each_value, i));
  }
  return {
    c() {
      span = element("span");
      for (let i = 0; i < each_blocks.length; i += 1) {
        each_blocks[i].c();
      }
      attr(span, "class", "updated svelte-1a1oqej");
    },
    m(target, anchor) {
      insert(target, span, anchor);
      for (let i = 0; i < each_blocks.length; i += 1) {
        if (each_blocks[i]) {
          each_blocks[i].m(span, null);
        }
      }
    },
    p(ctx2, dirty) {
      if (dirty & /*parseTextDiff, value*/
      2) {
        each_value = ensure_array_like(parseTextDiff(
          /*value*/
          ctx2[1][0]
        ));
        let i;
        for (i = 0; i < each_value.length; i += 1) {
          const child_ctx = get_each_context$4(ctx2, each_value, i);
          if (each_blocks[i]) {
            each_blocks[i].p(child_ctx, dirty);
          } else {
            each_blocks[i] = create_each_block$4(child_ctx);
            each_blocks[i].c();
            each_blocks[i].m(span, null);
          }
        }
        for (; i < each_blocks.length; i += 1) {
          each_blocks[i].d(1);
        }
        each_blocks.length = each_value.length;
      }
    },
    d(detaching) {
      if (detaching) {
        detach(span);
      }
      destroy_each(each_blocks, detaching);
    }
  };
}
function create_if_block_3$2(ctx) {
  let span;
  let t_value = getValueString(
    /*value*/
    ctx[1][0]
  ) + "";
  let t;
  return {
    c() {
      span = element("span");
      t = text(t_value);
      attr(span, "class", "deleted svelte-1a1oqej");
    },
    m(target, anchor) {
      insert(target, span, anchor);
      append(span, t);
    },
    p(ctx2, dirty) {
      if (dirty & /*value*/
      2 && t_value !== (t_value = getValueString(
        /*value*/
        ctx2[1][0]
      ) + "")) set_data(t, t_value);
    },
    d(detaching) {
      if (detaching) {
        detach(span);
      }
    }
  };
}
function create_if_block_2$3(ctx) {
  let span3;
  let span0;
  let t0_value = getValueString(
    /*value*/
    ctx[1][0]
  ) + "";
  let t0;
  let t1;
  let span1;
  let t3;
  let span2;
  let t4_value = getValueString(
    /*value*/
    ctx[1][1]
  ) + "";
  let t4;
  return {
    c() {
      span3 = element("span");
      span0 = element("span");
      t0 = text(t0_value);
      t1 = space();
      span1 = element("span");
      span1.textContent = "=>";
      t3 = space();
      span2 = element("span");
      t4 = text(t4_value);
      attr(span0, "class", "deleted svelte-1a1oqej");
      attr(span1, "class", "arrow svelte-1a1oqej");
      attr(span2, "class", "added svelte-1a1oqej");
      attr(span3, "class", "updated svelte-1a1oqej");
    },
    m(target, anchor) {
      insert(target, span3, anchor);
      append(span3, span0);
      append(span0, t0);
      append(span3, t1);
      append(span3, span1);
      append(span3, t3);
      append(span3, span2);
      append(span2, t4);
    },
    p(ctx2, dirty) {
      if (dirty & /*value*/
      2 && t0_value !== (t0_value = getValueString(
        /*value*/
        ctx2[1][0]
      ) + "")) set_data(t0, t0_value);
      if (dirty & /*value*/
      2 && t4_value !== (t4_value = getValueString(
        /*value*/
        ctx2[1][1]
      ) + "")) set_data(t4, t4_value);
    },
    d(detaching) {
      if (detaching) {
        detach(span3);
      }
    }
  };
}
function create_if_block_1$4(ctx) {
  let span;
  let t_value = getValueString(
    /*value*/
    ctx[1][0]
  ) + "";
  let t;
  return {
    c() {
      span = element("span");
      t = text(t_value);
      attr(span, "class", "added svelte-1a1oqej");
    },
    m(target, anchor) {
      insert(target, span, anchor);
      append(span, t);
    },
    p(ctx2, dirty) {
      if (dirty & /*value*/
      2 && t_value !== (t_value = getValueString(
        /*value*/
        ctx2[1][0]
      ) + "")) set_data(t, t_value);
    },
    d(detaching) {
      if (detaching) {
        detach(span);
      }
    }
  };
}
function create_else_block$6(ctx) {
  let span;
  let t_value = (
    /*item*/
    ctx[3].raw + ""
  );
  let t;
  return {
    c() {
      span = element("span");
      t = text(t_value);
    },
    m(target, anchor) {
      insert(target, span, anchor);
      append(span, t);
    },
    p(ctx2, dirty) {
      if (dirty & /*value*/
      2 && t_value !== (t_value = /*item*/
      ctx2[3].raw + "")) set_data(t, t_value);
    },
    d(detaching) {
      if (detaching) {
        detach(span);
      }
    }
  };
}
function create_if_block_6(ctx) {
  let span;
  let t_value = (
    /*item*/
    ctx[3].add + ""
  );
  let t;
  return {
    c() {
      span = element("span");
      t = text(t_value);
      attr(span, "class", "added svelte-1a1oqej");
    },
    m(target, anchor) {
      insert(target, span, anchor);
      append(span, t);
    },
    p(ctx2, dirty) {
      if (dirty & /*value*/
      2 && t_value !== (t_value = /*item*/
      ctx2[3].add + "")) set_data(t, t_value);
    },
    d(detaching) {
      if (detaching) {
        detach(span);
      }
    }
  };
}
function create_if_block_5$2(ctx) {
  let span;
  let t_value = (
    /*item*/
    ctx[3].delete + ""
  );
  let t;
  return {
    c() {
      span = element("span");
      t = text(t_value);
      attr(span, "class", "deleted svelte-1a1oqej");
    },
    m(target, anchor) {
      insert(target, span, anchor);
      append(span, t);
    },
    p(ctx2, dirty) {
      if (dirty & /*value*/
      2 && t_value !== (t_value = /*item*/
      ctx2[3].delete + "")) set_data(t, t_value);
    },
    d(detaching) {
      if (detaching) {
        detach(span);
      }
    }
  };
}
function create_each_block$4(ctx) {
  let if_block_anchor;
  function select_block_type_2(ctx2, dirty) {
    if (
      /*item*/
      ctx2[3].delete
    ) return create_if_block_5$2;
    if (
      /*item*/
      ctx2[3].add
    ) return create_if_block_6;
    return create_else_block$6;
  }
  let current_block_type = select_block_type_2(ctx);
  let if_block = current_block_type(ctx);
  return {
    c() {
      if_block.c();
      if_block_anchor = empty();
    },
    m(target, anchor) {
      if_block.m(target, anchor);
      insert(target, if_block_anchor, anchor);
    },
    p(ctx2, dirty) {
      if (current_block_type === (current_block_type = select_block_type_2(ctx2)) && if_block) {
        if_block.p(ctx2, dirty);
      } else {
        if_block.d(1);
        if_block = current_block_type(ctx2);
        if (if_block) {
          if_block.c();
          if_block.m(if_block_anchor.parentNode, if_block_anchor);
        }
      }
    },
    d(detaching) {
      if (detaching) {
        detach(if_block_anchor);
      }
      if_block.d(detaching);
    }
  };
}
function create_fragment$b(ctx) {
  let show_if;
  let if_block_anchor;
  function select_block_type(ctx2, dirty) {
    if (dirty & /*value*/
    2) show_if = null;
    if (show_if == null) show_if = !!Array.isArray(
      /*value*/
      ctx2[1]
    );
    if (show_if) return create_if_block$6;
    return create_else_block_1$1;
  }
  let current_block_type = select_block_type(ctx, -1);
  let if_block = current_block_type(ctx);
  return {
    c() {
      if_block.c();
      if_block_anchor = empty();
    },
    m(target, anchor) {
      if_block.m(target, anchor);
      insert(target, if_block_anchor, anchor);
    },
    p(ctx2, _ref) {
      let [dirty] = _ref;
      if (current_block_type === (current_block_type = select_block_type(ctx2, dirty)) && if_block) {
        if_block.p(ctx2, dirty);
      } else {
        if_block.d(1);
        if_block = current_block_type(ctx2);
        if (if_block) {
          if_block.c();
          if_block.m(if_block_anchor.parentNode, if_block_anchor);
        }
      }
    },
    i: noop,
    o: noop,
    d(detaching) {
      if (detaching) {
        detach(if_block_anchor);
      }
      if_block.d(detaching);
    }
  };
}
function replaceSpacesWithNonBreakingSpace(str) {
  return str.replace(/\s/gm, " ");
}
function parseTextDiff(textDiff) {
  const diffByLines = textDiff.split(/\n/gm).slice(1);
  return diffByLines.map((line) => {
    const type = line.startsWith("-") ? "delete" : line.startsWith("+") ? "add" : "raw";
    return {
      [type]: replaceSpacesWithNonBreakingSpace(line.slice(1))
    };
  });
}
function stringifyAndShrink(v) {
  if (v === null) {
    return "null";
  }
  const str = JSON.stringify(v);
  if (typeof str === "undefined") {
    return "undefined";
  }
  return str.length > 22 ? "".concat(str.slice(0, 15), "…").concat(str.slice(-5)) : str;
}
function getValueString(raw) {
  if (typeof raw === "string") {
    return raw;
  }
  return stringifyAndShrink(raw);
}
function instance$b($$self, $$props, $$invalidate) {
  let value;
  let {
    node,
    defaultFormatter
  } = $$props;
  $$self.$$set = ($$props2) => {
    if ("node" in $$props2) $$invalidate(2, node = $$props2.node);
    if ("defaultFormatter" in $$props2) $$invalidate(0, defaultFormatter = $$props2.defaultFormatter);
  };
  $$self.$$.update = () => {
    if ($$self.$$.dirty & /*node*/
    4) {
      $$invalidate(1, value = node.value);
    }
  };
  return [defaultFormatter, value, node];
}
class DiffValue extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$b, create_fragment$b, safe_not_equal, {
      node: 2,
      defaultFormatter: 0
    }, add_css$b);
  }
}
function add_css$a(target) {
  append_styles(target, "svelte-r7zw98", ".left-panel.svelte-r7zw98.svelte-r7zw98{flex-grow:0;padding:0;min-width:190px;width:190px}.title-container.svelte-r7zw98.svelte-r7zw98{align-items:center;display:flex}.transaction-buttons.svelte-r7zw98.svelte-r7zw98{margin-left:2rem}.entry-row.svelte-r7zw98+.entry-row.svelte-r7zw98{margin-top:1em}.selection-html.svelte-r7zw98.svelte-r7zw98{font-weight:100;margin:0.5em 0 0 0;padding:0}.equal-diff.svelte-r7zw98.svelte-r7zw98{align-items:center;color:rgb(255, 162, 177);display:flex;font-size:14px;height:100%;justify-content:center;width:100%}");
}
function get_each_context$3(ctx, list, i) {
  const child_ctx = ctx.slice();
  child_ctx[13] = list[i];
  return child_ctx;
}
function create_left_slot$3(ctx) {
  var _ctx$;
  let div;
  let historylist;
  let current;
  historylist = new HistoryList({
    props: {
      listItems: (
        /*listItems*/
        ctx[4]
      ),
      selectedId: (
        /*selectedEntry*/
        ((_ctx$ = ctx[0]) === null || _ctx$ === void 0 ? void 0 : _ctx$.id) || ""
      )
    }
  });
  historylist.$on(
    "click-item",
    /*handleEntrySelect*/
    ctx[7]
  );
  historylist.$on(
    "dblclick-item",
    /*handleEntryDblClick*/
    ctx[8]
  );
  return {
    c() {
      div = element("div");
      create_component(historylist.$$.fragment);
      attr(div, "slot", "left");
      attr(div, "class", "left-panel svelte-r7zw98");
    },
    m(target, anchor) {
      insert(target, div, anchor);
      mount_component(historylist, div, null);
      current = true;
    },
    p(ctx2, dirty) {
      var _ctx$2;
      const historylist_changes = {};
      if (dirty & /*listItems*/
      16) historylist_changes.listItems = /*listItems*/
      ctx2[4];
      if (dirty & /*selectedEntry*/
      1) historylist_changes.selectedId = /*selectedEntry*/
      ((_ctx$2 = ctx2[0]) === null || _ctx$2 === void 0 ? void 0 : _ctx$2.id) || "";
      historylist.$set(historylist_changes);
    },
    i(local) {
      if (current) return;
      transition_in(historylist.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(historylist.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      if (detaching) {
        detach(div);
      }
      destroy_component(historylist);
    }
  };
}
function create_else_block$5(ctx) {
  let div;
  return {
    c() {
      div = element("div");
      div.textContent = "Docs are equal.";
      attr(div, "class", "equal-diff svelte-r7zw98");
    },
    m(target, anchor) {
      insert(target, div, anchor);
    },
    p: noop,
    i: noop,
    o: noop,
    d(detaching) {
      if (detaching) {
        detach(div);
      }
    }
  };
}
function create_if_block$5(ctx) {
  let div3;
  let t0;
  let t1;
  let t2;
  let div2;
  let div1;
  let h2;
  let t4;
  let div0;
  let t5;
  let button;
  let t6;
  let current;
  let if_block0 = (
    /*selectedEntry*/
    ctx[0].contentDiff && create_if_block_5$1(ctx)
  );
  let if_block1 = (
    /*selectedEntry*/
    ctx[0].selectionDiff && create_if_block_4$1(ctx)
  );
  let if_block2 = (
    /*selectedEntry*/
    ctx[0].selectionHtml.length > 0 && create_if_block_3$1(ctx)
  );
  let if_block3 = (
    /*showTr*/
    ctx[1] && create_if_block_2$2(ctx)
  );
  button = new Button({
    props: {
      $$slots: {
        default: [create_default_slot$3]
      },
      $$scope: {
        ctx
      }
    }
  });
  button.$on(
    "click",
    /*toggleShowTr*/
    ctx[5]
  );
  let if_block4 = (
    /*showTr*/
    ctx[1] && create_if_block_1$3(ctx)
  );
  return {
    c() {
      div3 = element("div");
      if (if_block0) if_block0.c();
      t0 = space();
      if (if_block1) if_block1.c();
      t1 = space();
      if (if_block2) if_block2.c();
      t2 = space();
      div2 = element("div");
      div1 = element("div");
      h2 = element("h2");
      h2.textContent = "Transactions";
      t4 = space();
      div0 = element("div");
      if (if_block3) if_block3.c();
      t5 = space();
      create_component(button.$$.fragment);
      t6 = space();
      if (if_block4) if_block4.c();
      attr(div0, "class", "transaction-buttons svelte-r7zw98");
      attr(div1, "class", "title-container svelte-r7zw98");
      attr(div2, "class", "entry-row svelte-r7zw98");
    },
    m(target, anchor) {
      insert(target, div3, anchor);
      if (if_block0) if_block0.m(div3, null);
      append(div3, t0);
      if (if_block1) if_block1.m(div3, null);
      append(div3, t1);
      if (if_block2) if_block2.m(div3, null);
      append(div3, t2);
      append(div3, div2);
      append(div2, div1);
      append(div1, h2);
      append(div1, t4);
      append(div1, div0);
      if (if_block3) if_block3.m(div0, null);
      append(div0, t5);
      mount_component(button, div0, null);
      append(div2, t6);
      if (if_block4) if_block4.m(div2, null);
      current = true;
    },
    p(ctx2, dirty) {
      if (
        /*selectedEntry*/
        ctx2[0].contentDiff
      ) {
        if (if_block0) {
          if_block0.p(ctx2, dirty);
          if (dirty & /*selectedEntry*/
          1) {
            transition_in(if_block0, 1);
          }
        } else {
          if_block0 = create_if_block_5$1(ctx2);
          if_block0.c();
          transition_in(if_block0, 1);
          if_block0.m(div3, t0);
        }
      } else if (if_block0) {
        group_outros();
        transition_out(if_block0, 1, 1, () => {
          if_block0 = null;
        });
        check_outros();
      }
      if (
        /*selectedEntry*/
        ctx2[0].selectionDiff
      ) {
        if (if_block1) {
          if_block1.p(ctx2, dirty);
          if (dirty & /*selectedEntry*/
          1) {
            transition_in(if_block1, 1);
          }
        } else {
          if_block1 = create_if_block_4$1(ctx2);
          if_block1.c();
          transition_in(if_block1, 1);
          if_block1.m(div3, t1);
        }
      } else if (if_block1) {
        group_outros();
        transition_out(if_block1, 1, 1, () => {
          if_block1 = null;
        });
        check_outros();
      }
      if (
        /*selectedEntry*/
        ctx2[0].selectionHtml.length > 0
      ) {
        if (if_block2) {
          if_block2.p(ctx2, dirty);
          if (dirty & /*selectedEntry*/
          1) {
            transition_in(if_block2, 1);
          }
        } else {
          if_block2 = create_if_block_3$1(ctx2);
          if_block2.c();
          transition_in(if_block2, 1);
          if_block2.m(div3, t2);
        }
      } else if (if_block2) {
        group_outros();
        transition_out(if_block2, 1, 1, () => {
          if_block2 = null;
        });
        check_outros();
      }
      if (
        /*showTr*/
        ctx2[1]
      ) {
        if (if_block3) {
          if_block3.p(ctx2, dirty);
          if (dirty & /*showTr*/
          2) {
            transition_in(if_block3, 1);
          }
        } else {
          if_block3 = create_if_block_2$2(ctx2);
          if_block3.c();
          transition_in(if_block3, 1);
          if_block3.m(div0, t5);
        }
      } else if (if_block3) {
        group_outros();
        transition_out(if_block3, 1, 1, () => {
          if_block3 = null;
        });
        check_outros();
      }
      const button_changes = {};
      if (dirty & /*$$scope, showTr*/
      65538) {
        button_changes.$$scope = {
          dirty,
          ctx: ctx2
        };
      }
      button.$set(button_changes);
      if (
        /*showTr*/
        ctx2[1]
      ) {
        if (if_block4) {
          if_block4.p(ctx2, dirty);
          if (dirty & /*showTr*/
          2) {
            transition_in(if_block4, 1);
          }
        } else {
          if_block4 = create_if_block_1$3(ctx2);
          if_block4.c();
          transition_in(if_block4, 1);
          if_block4.m(div2, null);
        }
      } else if (if_block4) {
        group_outros();
        transition_out(if_block4, 1, 1, () => {
          if_block4 = null;
        });
        check_outros();
      }
    },
    i(local) {
      if (current) return;
      transition_in(if_block0);
      transition_in(if_block1);
      transition_in(if_block2);
      transition_in(if_block3);
      transition_in(button.$$.fragment, local);
      transition_in(if_block4);
      current = true;
    },
    o(local) {
      transition_out(if_block0);
      transition_out(if_block1);
      transition_out(if_block2);
      transition_out(if_block3);
      transition_out(button.$$.fragment, local);
      transition_out(if_block4);
      current = false;
    },
    d(detaching) {
      if (detaching) {
        detach(div3);
      }
      if (if_block0) if_block0.d();
      if (if_block1) if_block1.d();
      if (if_block2) if_block2.d();
      if (if_block3) if_block3.d();
      destroy_component(button);
      if (if_block4) if_block4.d();
    }
  };
}
function create_if_block_5$1(ctx) {
  let div1;
  let div0;
  let h2;
  let t1;
  let button;
  let t2;
  let treeview;
  let current;
  button = new Button({
    props: {
      class: "hidden",
      $$slots: {
        default: [create_default_slot_5]
      },
      $$scope: {
        ctx
      }
    }
  });
  treeview = new TreeView({
    props: {
      class: "tree-view",
      data: (
        /*selectedEntry*/
        ctx[0].contentDiff
      ),
      showLogButton: true,
      showCopyButton: true,
      valueComponent: DiffValue,
      recursionOpts: {
        maxDepth: 12,
        mapChildren: mapDocDeltaChildren,
        shouldExpandNode: func$1
      }
    }
  });
  return {
    c() {
      div1 = element("div");
      div0 = element("div");
      h2 = element("h2");
      h2.textContent = "Doc diff";
      t1 = space();
      create_component(button.$$.fragment);
      t2 = space();
      create_component(treeview.$$.fragment);
      attr(div0, "class", "title-container svelte-r7zw98");
      attr(div1, "class", "entry-row svelte-r7zw98");
    },
    m(target, anchor) {
      insert(target, div1, anchor);
      append(div1, div0);
      append(div0, h2);
      append(div0, t1);
      mount_component(button, div0, null);
      append(div1, t2);
      mount_component(treeview, div1, null);
      current = true;
    },
    p(ctx2, dirty) {
      const button_changes = {};
      if (dirty & /*$$scope*/
      65536) {
        button_changes.$$scope = {
          dirty,
          ctx: ctx2
        };
      }
      button.$set(button_changes);
      const treeview_changes = {};
      if (dirty & /*selectedEntry*/
      1) treeview_changes.data = /*selectedEntry*/
      ctx2[0].contentDiff;
      treeview.$set(treeview_changes);
    },
    i(local) {
      if (current) return;
      transition_in(button.$$.fragment, local);
      transition_in(treeview.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(button.$$.fragment, local);
      transition_out(treeview.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      if (detaching) {
        detach(div1);
      }
      destroy_component(button);
      destroy_component(treeview);
    }
  };
}
function create_default_slot_5(ctx) {
  let t;
  return {
    c() {
      t = text("log");
    },
    m(target, anchor) {
      insert(target, t, anchor);
    },
    d(detaching) {
      if (detaching) {
        detach(t);
      }
    }
  };
}
function create_if_block_4$1(ctx) {
  let div1;
  let div0;
  let h2;
  let t1;
  let button;
  let t2;
  let treeview;
  let current;
  button = new Button({
    props: {
      class: "hidden",
      $$slots: {
        default: [create_default_slot_4]
      },
      $$scope: {
        ctx
      }
    }
  });
  treeview = new TreeView({
    props: {
      class: "tree-view",
      data: (
        /*selectedEntry*/
        ctx[0].selectionDiff
      ),
      valueComponent: DiffValue,
      recursionOpts: {
        mapChildren: mapSelectionDeltaChildren,
        shouldExpandNode: func_1
      }
    }
  });
  return {
    c() {
      div1 = element("div");
      div0 = element("div");
      h2 = element("h2");
      h2.textContent = "Selection diff";
      t1 = space();
      create_component(button.$$.fragment);
      t2 = space();
      create_component(treeview.$$.fragment);
      attr(div0, "class", "title-container svelte-r7zw98");
      attr(div1, "class", "entry-row svelte-r7zw98");
    },
    m(target, anchor) {
      insert(target, div1, anchor);
      append(div1, div0);
      append(div0, h2);
      append(div0, t1);
      mount_component(button, div0, null);
      append(div1, t2);
      mount_component(treeview, div1, null);
      current = true;
    },
    p(ctx2, dirty) {
      const button_changes = {};
      if (dirty & /*$$scope*/
      65536) {
        button_changes.$$scope = {
          dirty,
          ctx: ctx2
        };
      }
      button.$set(button_changes);
      const treeview_changes = {};
      if (dirty & /*selectedEntry*/
      1) treeview_changes.data = /*selectedEntry*/
      ctx2[0].selectionDiff;
      treeview.$set(treeview_changes);
    },
    i(local) {
      if (current) return;
      transition_in(button.$$.fragment, local);
      transition_in(treeview.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(button.$$.fragment, local);
      transition_out(treeview.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      if (detaching) {
        detach(div1);
      }
      destroy_component(button);
      destroy_component(treeview);
    }
  };
}
function create_default_slot_4(ctx) {
  let t;
  return {
    c() {
      t = text("log");
    },
    m(target, anchor) {
      insert(target, t, anchor);
    },
    d(detaching) {
      if (detaching) {
        detach(t);
      }
    }
  };
}
function create_if_block_3$1(ctx) {
  let div1;
  let div0;
  let h2;
  let t1;
  let button;
  let t2;
  let pre;
  let code;
  let raw_value = (
    /*selectedEntry*/
    ctx[0].selectionHtml + ""
  );
  let current;
  button = new Button({
    props: {
      class: "hidden",
      $$slots: {
        default: [create_default_slot_3]
      },
      $$scope: {
        ctx
      }
    }
  });
  return {
    c() {
      div1 = element("div");
      div0 = element("div");
      h2 = element("h2");
      h2.textContent = "Selection content";
      t1 = space();
      create_component(button.$$.fragment);
      t2 = space();
      pre = element("pre");
      code = element("code");
      attr(div0, "class", "title-container svelte-r7zw98");
      attr(pre, "class", "selection-html svelte-r7zw98");
      attr(div1, "class", "entry-row svelte-r7zw98");
    },
    m(target, anchor) {
      insert(target, div1, anchor);
      append(div1, div0);
      append(div0, h2);
      append(div0, t1);
      mount_component(button, div0, null);
      append(div1, t2);
      append(div1, pre);
      append(pre, code);
      code.innerHTML = raw_value;
      current = true;
    },
    p(ctx2, dirty) {
      const button_changes = {};
      if (dirty & /*$$scope*/
      65536) {
        button_changes.$$scope = {
          dirty,
          ctx: ctx2
        };
      }
      button.$set(button_changes);
      if ((!current || dirty & /*selectedEntry*/
      1) && raw_value !== (raw_value = /*selectedEntry*/
      ctx2[0].selectionHtml + "")) code.innerHTML = raw_value;
    },
    i(local) {
      if (current) return;
      transition_in(button.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(button.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      if (detaching) {
        detach(div1);
      }
      destroy_component(button);
    }
  };
}
function create_default_slot_3(ctx) {
  let t;
  return {
    c() {
      t = text("log");
    },
    m(target, anchor) {
      insert(target, t, anchor);
    },
    d(detaching) {
      if (detaching) {
        detach(t);
      }
    }
  };
}
function create_if_block_2$2(ctx) {
  let button0;
  let t;
  let button1;
  let current;
  button0 = new Button({
    props: {
      $$slots: {
        default: [create_default_slot_2]
      },
      $$scope: {
        ctx
      }
    }
  });
  button0.$on(
    "click",
    /*handleToggleExpandTrTreeView*/
    ctx[9]
  );
  button1 = new Button({
    props: {
      $$slots: {
        default: [create_default_slot_1$3]
      },
      $$scope: {
        ctx
      }
    }
  });
  button1.$on(
    "click",
    /*handleLogTr*/
    ctx[6]
  );
  return {
    c() {
      create_component(button0.$$.fragment);
      t = space();
      create_component(button1.$$.fragment);
    },
    m(target, anchor) {
      mount_component(button0, target, anchor);
      insert(target, t, anchor);
      mount_component(button1, target, anchor);
      current = true;
    },
    p(ctx2, dirty) {
      const button0_changes = {};
      if (dirty & /*$$scope, expandTrTreeView*/
      65540) {
        button0_changes.$$scope = {
          dirty,
          ctx: ctx2
        };
      }
      button0.$set(button0_changes);
      const button1_changes = {};
      if (dirty & /*$$scope*/
      65536) {
        button1_changes.$$scope = {
          dirty,
          ctx: ctx2
        };
      }
      button1.$set(button1_changes);
    },
    i(local) {
      if (current) return;
      transition_in(button0.$$.fragment, local);
      transition_in(button1.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(button0.$$.fragment, local);
      transition_out(button1.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      if (detaching) {
        detach(t);
      }
      destroy_component(button0, detaching);
      destroy_component(button1, detaching);
    }
  };
}
function create_default_slot_2(ctx) {
  let t_value = (
    /*expandTrTreeView*/
    ctx[2] ? "collapse" : "expand"
  );
  let t;
  return {
    c() {
      t = text(t_value);
    },
    m(target, anchor) {
      insert(target, t, anchor);
    },
    p(ctx2, dirty) {
      if (dirty & /*expandTrTreeView*/
      4 && t_value !== (t_value = /*expandTrTreeView*/
      ctx2[2] ? "collapse" : "expand")) set_data(t, t_value);
    },
    d(detaching) {
      if (detaching) {
        detach(t);
      }
    }
  };
}
function create_default_slot_1$3(ctx) {
  let t;
  return {
    c() {
      t = text("log");
    },
    m(target, anchor) {
      insert(target, t, anchor);
    },
    d(detaching) {
      if (detaching) {
        detach(t);
      }
    }
  };
}
function create_default_slot$3(ctx) {
  let t_value = (
    /*showTr*/
    ctx[1] ? "hide" : "show"
  );
  let t;
  return {
    c() {
      t = text(t_value);
    },
    m(target, anchor) {
      insert(target, t, anchor);
    },
    p(ctx2, dirty) {
      if (dirty & /*showTr*/
      2 && t_value !== (t_value = /*showTr*/
      ctx2[1] ? "hide" : "show")) set_data(t, t_value);
    },
    d(detaching) {
      if (detaching) {
        detach(t);
      }
    }
  };
}
function create_if_block_1$3(ctx) {
  let each_1_anchor;
  let current;
  let each_value = ensure_array_like(
    /*selectedEntry*/
    ctx[0].trs
  );
  let each_blocks = [];
  for (let i = 0; i < each_value.length; i += 1) {
    each_blocks[i] = create_each_block$3(get_each_context$3(ctx, each_value, i));
  }
  const out = (i) => transition_out(each_blocks[i], 1, 1, () => {
    each_blocks[i] = null;
  });
  return {
    c() {
      for (let i = 0; i < each_blocks.length; i += 1) {
        each_blocks[i].c();
      }
      each_1_anchor = empty();
    },
    m(target, anchor) {
      for (let i = 0; i < each_blocks.length; i += 1) {
        if (each_blocks[i]) {
          each_blocks[i].m(target, anchor);
        }
      }
      insert(target, each_1_anchor, anchor);
      current = true;
    },
    p(ctx2, dirty) {
      if (dirty & /*selectedEntry, transactionRecursionOpts*/
      9) {
        each_value = ensure_array_like(
          /*selectedEntry*/
          ctx2[0].trs
        );
        let i;
        for (i = 0; i < each_value.length; i += 1) {
          const child_ctx = get_each_context$3(ctx2, each_value, i);
          if (each_blocks[i]) {
            each_blocks[i].p(child_ctx, dirty);
            transition_in(each_blocks[i], 1);
          } else {
            each_blocks[i] = create_each_block$3(child_ctx);
            each_blocks[i].c();
            transition_in(each_blocks[i], 1);
            each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
          }
        }
        group_outros();
        for (i = each_value.length; i < each_blocks.length; i += 1) {
          out(i);
        }
        check_outros();
      }
    },
    i(local) {
      if (current) return;
      for (let i = 0; i < each_value.length; i += 1) {
        transition_in(each_blocks[i]);
      }
      current = true;
    },
    o(local) {
      each_blocks = each_blocks.filter(Boolean);
      for (let i = 0; i < each_blocks.length; i += 1) {
        transition_out(each_blocks[i]);
      }
      current = false;
    },
    d(detaching) {
      if (detaching) {
        detach(each_1_anchor);
      }
      destroy_each(each_blocks, detaching);
    }
  };
}
function create_each_block$3(ctx) {
  let treeview;
  let current;
  treeview = new TreeView({
    props: {
      class: "tree-view",
      data: (
        /*tr*/
        ctx[13]
      ),
      showLogButton: true,
      showCopyButton: true,
      recursionOpts: (
        /*transactionRecursionOpts*/
        ctx[3]
      )
    }
  });
  return {
    c() {
      create_component(treeview.$$.fragment);
    },
    m(target, anchor) {
      mount_component(treeview, target, anchor);
      current = true;
    },
    p(ctx2, dirty) {
      const treeview_changes = {};
      if (dirty & /*selectedEntry*/
      1) treeview_changes.data = /*tr*/
      ctx2[13];
      if (dirty & /*transactionRecursionOpts*/
      8) treeview_changes.recursionOpts = /*transactionRecursionOpts*/
      ctx2[3];
      treeview.$set(treeview_changes);
    },
    i(local) {
      if (current) return;
      transition_in(treeview.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(treeview.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      destroy_component(treeview, detaching);
    }
  };
}
function create_right_slot$4(ctx) {
  let div;
  let current_block_type_index;
  let if_block;
  let current;
  const if_block_creators = [create_if_block$5, create_else_block$5];
  const if_blocks = [];
  function select_block_type(ctx2, dirty) {
    if (
      /*selectedEntry*/
      ctx2[0]
    ) return 0;
    return 1;
  }
  current_block_type_index = select_block_type(ctx);
  if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
  return {
    c() {
      div = element("div");
      if_block.c();
      attr(div, "slot", "right");
      attr(div, "class", "right-panel");
    },
    m(target, anchor) {
      insert(target, div, anchor);
      if_blocks[current_block_type_index].m(div, null);
      current = true;
    },
    p(ctx2, dirty) {
      let previous_block_index = current_block_type_index;
      current_block_type_index = select_block_type(ctx2);
      if (current_block_type_index === previous_block_index) {
        if_blocks[current_block_type_index].p(ctx2, dirty);
      } else {
        group_outros();
        transition_out(if_blocks[previous_block_index], 1, 1, () => {
          if_blocks[previous_block_index] = null;
        });
        check_outros();
        if_block = if_blocks[current_block_type_index];
        if (!if_block) {
          if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx2);
          if_block.c();
        } else {
          if_block.p(ctx2, dirty);
        }
        transition_in(if_block, 1);
        if_block.m(div, null);
      }
    },
    i(local) {
      if (current) return;
      transition_in(if_block);
      current = true;
    },
    o(local) {
      transition_out(if_block);
      current = false;
    },
    d(detaching) {
      if (detaching) {
        detach(div);
      }
      if_blocks[current_block_type_index].d();
    }
  };
}
function create_fragment$a(ctx) {
  let splitview;
  let current;
  splitview = new SplitView({
    props: {
      $$slots: {
        right: [create_right_slot$4],
        left: [create_left_slot$3]
      },
      $$scope: {
        ctx
      }
    }
  });
  return {
    c() {
      create_component(splitview.$$.fragment);
    },
    m(target, anchor) {
      mount_component(splitview, target, anchor);
      current = true;
    },
    p(ctx2, _ref) {
      let [dirty] = _ref;
      const splitview_changes = {};
      if (dirty & /*$$scope, selectedEntry, transactionRecursionOpts, showTr, expandTrTreeView, listItems*/
      65567) {
        splitview_changes.$$scope = {
          dirty,
          ctx: ctx2
        };
      }
      splitview.$set(splitview_changes);
    },
    i(local) {
      if (current) return;
      transition_in(splitview.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(splitview.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      destroy_component(splitview, detaching);
    }
  };
}
const func$1 = () => true;
const func_1 = () => true;
function instance$a($$self, $$props, $$invalidate) {
  let listItems;
  let $stateHistory;
  let $shownHistoryGroups;
  component_subscribe($$self, stateHistory, ($$value) => $$invalidate(10, $stateHistory = $$value));
  component_subscribe($$self, shownHistoryGroups, ($$value) => $$invalidate(11, $shownHistoryGroups = $$value));
  let selectedEntry = void 0, showTr = false;
  const {
    replaceEditorContent
  } = getContext("editor-view");
  let expandTrTreeView = false;
  let transactionRecursionOpts = {
    maxDepth: 24,
    stopCircularRecursion: true,
    omitKeys: ["schema"],
    shouldExpandNode: () => expandTrTreeView
  };
  latestEntry.subscribe((v) => {
    if (v) $$invalidate(0, selectedEntry = v);
  });
  function toggleShowTr() {
    $$invalidate(1, showTr = !showTr);
  }
  function handleLogTr() {
    console.info("%c [prosemirror-dev-toolkit]: Property added to window._trs", "color: #b8e248");
    console.log(selectedEntry === null || selectedEntry === void 0 ? void 0 : selectedEntry.trs);
    window._trs = selectedEntry === null || selectedEntry === void 0 ? void 0 : selectedEntry.trs;
  }
  function handleEntrySelect(e) {
    const {
      id = "",
      groupIdx,
      wasTopNode
    } = e.detail;
    $$invalidate(0, selectedEntry = $stateHistory.get(id));
    if (!selectedEntry) return;
    const group = listItems[groupIdx];
    if (group.isGroup && group.entries.length > 1 && wasTopNode) {
      shownHistoryGroups.update((val) => val.map((g, idx) => idx !== groupIdx ? g : Object.assign(Object.assign({}, g), {
        expanded: !g.expanded
      })));
    }
  }
  function handleEntryDblClick(e) {
    $$invalidate(0, selectedEntry = $stateHistory.get(e.detail.id || ""));
    selectedEntry && replaceEditorContent(selectedEntry.state);
  }
  function handleToggleExpandTrTreeView() {
    $$invalidate(2, expandTrTreeView = !expandTrTreeView);
    $$invalidate(3, transactionRecursionOpts = Object.assign(Object.assign({}, transactionRecursionOpts), {
      shouldExpandNode: () => expandTrTreeView
    }));
  }
  $$self.$$.update = () => {
    if ($$self.$$.dirty & /*$shownHistoryGroups, $stateHistory*/
    3072) {
      $$invalidate(4, listItems = $shownHistoryGroups.map((g) => ({
        id: g.id,
        isGroup: g.isGroup,
        topEntry: $stateHistory.get(g.topEntryId),
        entries: g.entryIds.map((id) => $stateHistory.get(id)),
        expanded: g.expanded
      })));
    }
  };
  return [selectedEntry, showTr, expandTrTreeView, transactionRecursionOpts, listItems, toggleShowTr, handleLogTr, handleEntrySelect, handleEntryDblClick, handleToggleExpandTrTreeView, $stateHistory, $shownHistoryGroups];
}
class HistoryTab extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$a, create_fragment$a, safe_not_equal, {}, add_css$a);
  }
}
function add_css$9(target) {
  append_styles(target, "svelte-1fq2hhi", "ul.svelte-1fq2hhi.svelte-1fq2hhi{color:#fff;list-style:none;margin:0;padding:0;height:100%;width:100%}li.svelte-1fq2hhi+li.svelte-1fq2hhi{border-top:1px solid rgb(96, 76, 104)}button.svelte-1fq2hhi.svelte-1fq2hhi{background:transparent;border:0;color:#d3d3d9;cursor:pointer;display:flex;font-family:monospace;font-size:var(--font-medium);font-weight:100;padding:6px 18px;text-transform:uppercase;width:100%}button.svelte-1fq2hhi.svelte-1fq2hhi:hover{background:rgba(255, 162, 177, 0.4);color:#fff}button:hover.empty.svelte-1fq2hhi.svelte-1fq2hhi{background:rgb(80, 68, 93)}button.selected.svelte-1fq2hhi.svelte-1fq2hhi{background:rgba(255, 162, 177, 0.4)}button.selected.empty.svelte-1fq2hhi.svelte-1fq2hhi{background:rgb(80, 68, 93)}button.empty.svelte-1fq2hhi.svelte-1fq2hhi{color:#727288}");
}
function get_each_context$2(ctx, list, i) {
  const child_ctx = ctx.slice();
  child_ctx[4] = list[i];
  return child_ctx;
}
function create_each_block$2(ctx) {
  let li;
  let button;
  let t0_value = (
    /*item*/
    ctx[4].value + ""
  );
  let t0;
  let t1;
  let mounted;
  let dispose;
  function click_handler() {
    return (
      /*click_handler*/
      ctx[3](
        /*item*/
        ctx[4]
      )
    );
  }
  return {
    c() {
      li = element("li");
      button = element("button");
      t0 = text(t0_value);
      t1 = space();
      attr(button, "class", "svelte-1fq2hhi");
      toggle_class(
        button,
        "selected",
        /*selectedKey*/
        ctx[1] === /*item*/
        ctx[4].key
      );
      toggle_class(
        button,
        "empty",
        /*item*/
        ctx[4].empty
      );
      attr(li, "class", "svelte-1fq2hhi");
    },
    m(target, anchor) {
      insert(target, li, anchor);
      append(li, button);
      append(button, t0);
      append(li, t1);
      if (!mounted) {
        dispose = listen(button, "click", click_handler);
        mounted = true;
      }
    },
    p(new_ctx, dirty) {
      ctx = new_ctx;
      if (dirty & /*listItems*/
      1 && t0_value !== (t0_value = /*item*/
      ctx[4].value + "")) set_data(t0, t0_value);
      if (dirty & /*selectedKey, listItems*/
      3) {
        toggle_class(
          button,
          "selected",
          /*selectedKey*/
          ctx[1] === /*item*/
          ctx[4].key
        );
      }
      if (dirty & /*listItems*/
      1) {
        toggle_class(
          button,
          "empty",
          /*item*/
          ctx[4].empty
        );
      }
    },
    d(detaching) {
      if (detaching) {
        detach(li);
      }
      mounted = false;
      dispose();
    }
  };
}
function create_fragment$9(ctx) {
  let ul;
  let each_value = ensure_array_like(
    /*listItems*/
    ctx[0]
  );
  let each_blocks = [];
  for (let i = 0; i < each_value.length; i += 1) {
    each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
  }
  return {
    c() {
      ul = element("ul");
      for (let i = 0; i < each_blocks.length; i += 1) {
        each_blocks[i].c();
      }
      attr(ul, "class", "svelte-1fq2hhi");
    },
    m(target, anchor) {
      insert(target, ul, anchor);
      for (let i = 0; i < each_blocks.length; i += 1) {
        if (each_blocks[i]) {
          each_blocks[i].m(ul, null);
        }
      }
    },
    p(ctx2, _ref) {
      let [dirty] = _ref;
      if (dirty & /*selectedKey, listItems, onSelect*/
      7) {
        each_value = ensure_array_like(
          /*listItems*/
          ctx2[0]
        );
        let i;
        for (i = 0; i < each_value.length; i += 1) {
          const child_ctx = get_each_context$2(ctx2, each_value, i);
          if (each_blocks[i]) {
            each_blocks[i].p(child_ctx, dirty);
          } else {
            each_blocks[i] = create_each_block$2(child_ctx);
            each_blocks[i].c();
            each_blocks[i].m(ul, null);
          }
        }
        for (; i < each_blocks.length; i += 1) {
          each_blocks[i].d(1);
        }
        each_blocks.length = each_value.length;
      }
    },
    i: noop,
    o: noop,
    d(detaching) {
      if (detaching) {
        detach(ul);
      }
      destroy_each(each_blocks, detaching);
    }
  };
}
function instance$9($$self, $$props, $$invalidate) {
  let {
    listItems = [],
    selectedKey,
    onSelect
  } = $$props;
  const click_handler = (item) => onSelect(item);
  $$self.$$set = ($$props2) => {
    if ("listItems" in $$props2) $$invalidate(0, listItems = $$props2.listItems);
    if ("selectedKey" in $$props2) $$invalidate(1, selectedKey = $$props2.selectedKey);
    if ("onSelect" in $$props2) $$invalidate(2, onSelect = $$props2.onSelect);
  };
  return [listItems, selectedKey, onSelect, click_handler];
}
class List extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$9, create_fragment$9, safe_not_equal, {
      listItems: 0,
      selectedKey: 1,
      onSelect: 2
    }, add_css$9);
  }
}
function add_css$8(target) {
  append_styles(target, "svelte-9l897d", ".top-row.svelte-9l897d{align-items:center;display:flex;justify-content:space-between;margin-bottom:0.5em}.left-panel[slot=left].svelte-9l897d{flex-grow:0;overflow:scroll;padding:0;min-width:190px;width:190px}.right-panel[slot=right].svelte-9l897d{border-left:1px solid rgba(255, 162, 177, 0.2)}.empty-state.svelte-9l897d{align-items:center;color:rgb(255, 162, 177);display:flex;font-size:14px;height:100%;justify-content:center;width:100%}");
}
function create_left_slot$2(ctx) {
  var _ctx$;
  let div;
  let list;
  let current;
  list = new List({
    props: {
      listItems: (
        /*listItems*/
        ctx[4]
      ),
      selectedKey: (
        /*selectedPlugin*/
        (_ctx$ = ctx[0]) === null || _ctx$ === void 0 ? void 0 : _ctx$.key
      ),
      onSelect: (
        /*handlePluginSelect*/
        ctx[5]
      )
    }
  });
  return {
    c() {
      div = element("div");
      create_component(list.$$.fragment);
      attr(div, "slot", "left");
      attr(div, "class", "left-panel svelte-9l897d");
    },
    m(target, anchor) {
      insert(target, div, anchor);
      mount_component(list, div, null);
      current = true;
    },
    p(ctx2, dirty) {
      var _ctx$2;
      const list_changes = {};
      if (dirty & /*listItems*/
      16) list_changes.listItems = /*listItems*/
      ctx2[4];
      if (dirty & /*selectedPlugin*/
      1) list_changes.selectedKey = /*selectedPlugin*/
      (_ctx$2 = ctx2[0]) === null || _ctx$2 === void 0 ? void 0 : _ctx$2.key;
      list.$set(list_changes);
    },
    i(local) {
      if (current) return;
      transition_in(list.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(list.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      if (detaching) {
        detach(div);
      }
      destroy_component(list);
    }
  };
}
function create_if_block_1$2(ctx) {
  let div1;
  let h2;
  let t1;
  let div0;
  let button0;
  let t2;
  let button1;
  let current;
  button0 = new Button({
    props: {
      $$slots: {
        default: [create_default_slot_1$2]
      },
      $$scope: {
        ctx
      }
    }
  });
  button0.$on(
    "click",
    /*handleToggleExpand*/
    ctx[6]
  );
  button1 = new Button({
    props: {
      $$slots: {
        default: [create_default_slot$2]
      },
      $$scope: {
        ctx
      }
    }
  });
  button1.$on(
    "click",
    /*handleLogState*/
    ctx[7]
  );
  return {
    c() {
      div1 = element("div");
      h2 = element("h2");
      h2.textContent = "Plugin state";
      t1 = space();
      div0 = element("div");
      create_component(button0.$$.fragment);
      t2 = space();
      create_component(button1.$$.fragment);
      attr(div1, "class", "top-row svelte-9l897d");
    },
    m(target, anchor) {
      insert(target, div1, anchor);
      append(div1, h2);
      append(div1, t1);
      append(div1, div0);
      mount_component(button0, div0, null);
      append(div0, t2);
      mount_component(button1, div0, null);
      current = true;
    },
    p(ctx2, dirty) {
      const button0_changes = {};
      if (dirty & /*$$scope, expandPluginState*/
      2050) {
        button0_changes.$$scope = {
          dirty,
          ctx: ctx2
        };
      }
      button0.$set(button0_changes);
      const button1_changes = {};
      if (dirty & /*$$scope*/
      2048) {
        button1_changes.$$scope = {
          dirty,
          ctx: ctx2
        };
      }
      button1.$set(button1_changes);
    },
    i(local) {
      if (current) return;
      transition_in(button0.$$.fragment, local);
      transition_in(button1.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(button0.$$.fragment, local);
      transition_out(button1.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      if (detaching) {
        detach(div1);
      }
      destroy_component(button0);
      destroy_component(button1);
    }
  };
}
function create_default_slot_1$2(ctx) {
  let t_value = (
    /*expandPluginState*/
    ctx[1] ? "collapse" : "expand"
  );
  let t;
  return {
    c() {
      t = text(t_value);
    },
    m(target, anchor) {
      insert(target, t, anchor);
    },
    p(ctx2, dirty) {
      if (dirty & /*expandPluginState*/
      2 && t_value !== (t_value = /*expandPluginState*/
      ctx2[1] ? "collapse" : "expand")) set_data(t, t_value);
    },
    d(detaching) {
      if (detaching) {
        detach(t);
      }
    }
  };
}
function create_default_slot$2(ctx) {
  let t;
  return {
    c() {
      t = text("log");
    },
    m(target, anchor) {
      insert(target, t, anchor);
    },
    d(detaching) {
      if (detaching) {
        detach(t);
      }
    }
  };
}
function create_else_block$4(ctx) {
  let div;
  return {
    c() {
      div = element("div");
      div.textContent = "Plugin has no state";
      attr(div, "class", "empty-state svelte-9l897d");
    },
    m(target, anchor) {
      insert(target, div, anchor);
    },
    p: noop,
    i: noop,
    o: noop,
    d(detaching) {
      if (detaching) {
        detach(div);
      }
    }
  };
}
function create_if_block$4(ctx) {
  let treeview;
  let current;
  treeview = new TreeView({
    props: {
      data: (
        /*pluginState*/
        ctx[3]
      ),
      showLogButton: true,
      showCopyButton: true,
      recursionOpts: (
        /*recursionOpts*/
        ctx[2]
      )
    }
  });
  return {
    c() {
      create_component(treeview.$$.fragment);
    },
    m(target, anchor) {
      mount_component(treeview, target, anchor);
      current = true;
    },
    p(ctx2, dirty) {
      const treeview_changes = {};
      if (dirty & /*pluginState*/
      8) treeview_changes.data = /*pluginState*/
      ctx2[3];
      if (dirty & /*recursionOpts*/
      4) treeview_changes.recursionOpts = /*recursionOpts*/
      ctx2[2];
      treeview.$set(treeview_changes);
    },
    i(local) {
      if (current) return;
      transition_in(treeview.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(treeview.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      destroy_component(treeview, detaching);
    }
  };
}
function create_right_slot$3(ctx) {
  let div;
  let t;
  let current_block_type_index;
  let if_block1;
  let current;
  let if_block0 = (
    /*pluginState*/
    ctx[3] && create_if_block_1$2(ctx)
  );
  const if_block_creators = [create_if_block$4, create_else_block$4];
  const if_blocks = [];
  function select_block_type(ctx2, dirty) {
    if (
      /*pluginState*/
      ctx2[3]
    ) return 0;
    return 1;
  }
  current_block_type_index = select_block_type(ctx);
  if_block1 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
  return {
    c() {
      div = element("div");
      if (if_block0) if_block0.c();
      t = space();
      if_block1.c();
      attr(div, "slot", "right");
      attr(div, "class", "right-panel svelte-9l897d");
    },
    m(target, anchor) {
      insert(target, div, anchor);
      if (if_block0) if_block0.m(div, null);
      append(div, t);
      if_blocks[current_block_type_index].m(div, null);
      current = true;
    },
    p(ctx2, dirty) {
      if (
        /*pluginState*/
        ctx2[3]
      ) {
        if (if_block0) {
          if_block0.p(ctx2, dirty);
          if (dirty & /*pluginState*/
          8) {
            transition_in(if_block0, 1);
          }
        } else {
          if_block0 = create_if_block_1$2(ctx2);
          if_block0.c();
          transition_in(if_block0, 1);
          if_block0.m(div, t);
        }
      } else if (if_block0) {
        group_outros();
        transition_out(if_block0, 1, 1, () => {
          if_block0 = null;
        });
        check_outros();
      }
      let previous_block_index = current_block_type_index;
      current_block_type_index = select_block_type(ctx2);
      if (current_block_type_index === previous_block_index) {
        if_blocks[current_block_type_index].p(ctx2, dirty);
      } else {
        group_outros();
        transition_out(if_blocks[previous_block_index], 1, 1, () => {
          if_blocks[previous_block_index] = null;
        });
        check_outros();
        if_block1 = if_blocks[current_block_type_index];
        if (!if_block1) {
          if_block1 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx2);
          if_block1.c();
        } else {
          if_block1.p(ctx2, dirty);
        }
        transition_in(if_block1, 1);
        if_block1.m(div, null);
      }
    },
    i(local) {
      if (current) return;
      transition_in(if_block0);
      transition_in(if_block1);
      current = true;
    },
    o(local) {
      transition_out(if_block0);
      transition_out(if_block1);
      current = false;
    },
    d(detaching) {
      if (detaching) {
        detach(div);
      }
      if (if_block0) if_block0.d();
      if_blocks[current_block_type_index].d();
    }
  };
}
function create_fragment$8(ctx) {
  let splitview;
  let current;
  splitview = new SplitView({
    props: {
      $$slots: {
        right: [create_right_slot$3],
        left: [create_left_slot$2]
      },
      $$scope: {
        ctx
      }
    }
  });
  return {
    c() {
      create_component(splitview.$$.fragment);
    },
    m(target, anchor) {
      mount_component(splitview, target, anchor);
      current = true;
    },
    p(ctx2, _ref) {
      let [dirty] = _ref;
      const splitview_changes = {};
      if (dirty & /*$$scope, pluginState, recursionOpts, expandPluginState, listItems, selectedPlugin*/
      2079) {
        splitview_changes.$$scope = {
          dirty,
          ctx: ctx2
        };
      }
      splitview.$set(splitview_changes);
    },
    i(local) {
      if (current) return;
      transition_in(splitview.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(splitview.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      destroy_component(splitview, detaching);
    }
  };
}
function instance$8($$self, $$props, $$invalidate) {
  let pluginState;
  let listItems;
  const {
    view: view2
  } = getContext("editor-view");
  let expandPluginState = false;
  let recursionOpts = {
    maxDepth: 10,
    stopCircularRecursion: true,
    shouldExpandNode: () => expandPluginState
  };
  let editorState = view2.state;
  let plugins = editorState.plugins;
  let selectedPlugin = plugins[0];
  latestEntry.subscribe((e) => {
    if (!e) return;
    $$invalidate(8, editorState = e.state);
    $$invalidate(9, plugins = editorState.plugins);
    $$invalidate(0, selectedPlugin = plugins.find((p) => p.key === (selectedPlugin === null || selectedPlugin === void 0 ? void 0 : selectedPlugin.key)));
  });
  function handlePluginSelect(item) {
    $$invalidate(0, selectedPlugin = plugins.find((p) => p.key === item.key));
  }
  function handleToggleExpand() {
    $$invalidate(1, expandPluginState = !expandPluginState);
    $$invalidate(2, recursionOpts = Object.assign(Object.assign({}, recursionOpts), {
      shouldExpandNode: () => expandPluginState
    }));
  }
  function handleLogState() {
    window._plugin = [selectedPlugin, pluginState];
    console.info("%c [prosemirror-dev-toolkit]: Property added to window._plugin", "color: #b8e248");
    console.log(selectedPlugin);
    console.log(pluginState);
  }
  $$self.$$.update = () => {
    if ($$self.$$.dirty & /*selectedPlugin, editorState*/
    257) {
      $$invalidate(3, pluginState = (selectedPlugin === null || selectedPlugin === void 0 ? void 0 : selectedPlugin.getState) ? selectedPlugin.getState(editorState) : void 0);
    }
    if ($$self.$$.dirty & /*plugins, editorState*/
    768) {
      $$invalidate(4, listItems = plugins.map((p) => ({
        key: p.key,
        value: p.key.toUpperCase(),
        empty: !(p.getState && p.getState(editorState))
      })));
    }
  };
  return [selectedPlugin, expandPluginState, recursionOpts, pluginState, listItems, handlePluginSelect, handleToggleExpand, handleLogState, editorState, plugins];
}
class PluginsTab extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$8, create_fragment$8, safe_not_equal, {}, add_css$8);
  }
}
function add_css$7(target) {
  append_styles(target, "svelte-1u2reu1", ".top-row.svelte-1u2reu1{align-items:center;display:flex;justify-content:space-between}.left-panel[slot=left].svelte-1u2reu1{overflow:scroll;padding:1em}.right-panel[slot=right].svelte-1u2reu1{border-left:1px solid rgba(255, 162, 177, 0.2);overflow:scroll;padding:1em}");
}
function create_default_slot_1$1(ctx) {
  let t;
  return {
    c() {
      t = text("log");
    },
    m(target, anchor) {
      insert(target, t, anchor);
    },
    d(detaching) {
      if (detaching) {
        detach(t);
      }
    }
  };
}
function create_left_slot$1(ctx) {
  let div1;
  let div0;
  let h2;
  let t1;
  let button;
  let t2;
  let treeview;
  let current;
  button = new Button({
    props: {
      class: "hidden",
      $$slots: {
        default: [create_default_slot_1$1]
      },
      $$scope: {
        ctx
      }
    }
  });
  treeview = new TreeView({
    props: {
      class: "tree-view",
      data: (
        /*nodes*/
        ctx[0]
      ),
      showLogButton: true,
      showCopyButton: true,
      recursionOpts: {
        stopCircularRecursion: true
      }
    }
  });
  return {
    c() {
      div1 = element("div");
      div0 = element("div");
      h2 = element("h2");
      h2.textContent = "Nodes";
      t1 = space();
      create_component(button.$$.fragment);
      t2 = space();
      create_component(treeview.$$.fragment);
      attr(div0, "class", "top-row svelte-1u2reu1");
      attr(div1, "slot", "left");
      attr(div1, "class", "left-panel svelte-1u2reu1");
    },
    m(target, anchor) {
      insert(target, div1, anchor);
      append(div1, div0);
      append(div0, h2);
      append(div0, t1);
      mount_component(button, div0, null);
      append(div1, t2);
      mount_component(treeview, div1, null);
      current = true;
    },
    p(ctx2, dirty) {
      const button_changes = {};
      if (dirty & /*$$scope*/
      8) {
        button_changes.$$scope = {
          dirty,
          ctx: ctx2
        };
      }
      button.$set(button_changes);
    },
    i(local) {
      if (current) return;
      transition_in(button.$$.fragment, local);
      transition_in(treeview.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(button.$$.fragment, local);
      transition_out(treeview.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      if (detaching) {
        detach(div1);
      }
      destroy_component(button);
      destroy_component(treeview);
    }
  };
}
function create_default_slot$1(ctx) {
  let t;
  return {
    c() {
      t = text("log");
    },
    m(target, anchor) {
      insert(target, t, anchor);
    },
    d(detaching) {
      if (detaching) {
        detach(t);
      }
    }
  };
}
function create_right_slot$2(ctx) {
  let div1;
  let div0;
  let h2;
  let t1;
  let button;
  let t2;
  let treeview;
  let current;
  button = new Button({
    props: {
      class: "hidden",
      $$slots: {
        default: [create_default_slot$1]
      },
      $$scope: {
        ctx
      }
    }
  });
  treeview = new TreeView({
    props: {
      class: "tree-view",
      data: (
        /*marks*/
        ctx[1]
      ),
      showLogButton: true,
      showCopyButton: true,
      recursionOpts: {
        stopCircularRecursion: true
      }
    }
  });
  return {
    c() {
      div1 = element("div");
      div0 = element("div");
      h2 = element("h2");
      h2.textContent = "Marks";
      t1 = space();
      create_component(button.$$.fragment);
      t2 = space();
      create_component(treeview.$$.fragment);
      attr(div0, "class", "top-row svelte-1u2reu1");
      attr(div1, "slot", "right");
      attr(div1, "class", "right-panel svelte-1u2reu1");
    },
    m(target, anchor) {
      insert(target, div1, anchor);
      append(div1, div0);
      append(div0, h2);
      append(div0, t1);
      mount_component(button, div0, null);
      append(div1, t2);
      mount_component(treeview, div1, null);
      current = true;
    },
    p(ctx2, dirty) {
      const button_changes = {};
      if (dirty & /*$$scope*/
      8) {
        button_changes.$$scope = {
          dirty,
          ctx: ctx2
        };
      }
      button.$set(button_changes);
    },
    i(local) {
      if (current) return;
      transition_in(button.$$.fragment, local);
      transition_in(treeview.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(button.$$.fragment, local);
      transition_out(treeview.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      if (detaching) {
        detach(div1);
      }
      destroy_component(button);
      destroy_component(treeview);
    }
  };
}
function create_fragment$7(ctx) {
  let splitview;
  let current;
  splitview = new SplitView({
    props: {
      $$slots: {
        right: [create_right_slot$2],
        left: [create_left_slot$1]
      },
      $$scope: {
        ctx
      }
    }
  });
  return {
    c() {
      create_component(splitview.$$.fragment);
    },
    m(target, anchor) {
      mount_component(splitview, target, anchor);
      current = true;
    },
    p(ctx2, _ref) {
      let [dirty] = _ref;
      const splitview_changes = {};
      if (dirty & /*$$scope*/
      8) {
        splitview_changes.$$scope = {
          dirty,
          ctx: ctx2
        };
      }
      splitview.$set(splitview_changes);
    },
    i(local) {
      if (current) return;
      transition_in(splitview.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(splitview.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      destroy_component(splitview, detaching);
    }
  };
}
function instance$7($$self) {
  const {
    view: view2
  } = getContext("editor-view");
  let nodes = view2.state.schema.nodes;
  let marks = view2.state.schema.marks;
  return [nodes, marks];
}
class SchemaTab extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$7, create_fragment$7, safe_not_equal, {}, add_css$7);
  }
}
function add_css$6(target) {
  append_styles(target, "svelte-1un819s", ".doc-node.svelte-1un819s{border-left:1px solid #363755;border-right:1px solid #363755;display:flex;flex-direction:column;padding:0 12px}.doc-node.root.svelte-1un819s{border:0;padding:0}.doc-node-body.svelte-1un819s{background:#363755;color:#222;display:flex;font-size:13px;margin-top:3px}.number-box.svelte-1un819s{padding:3px 6px;background:rgba(255, 255, 255, 0.3)}.node-name.svelte-1un819s{width:100%}button.svelte-1un819s{align-items:center;background:transparent;border:0;color:#222;cursor:pointer;display:flex;height:100%;white-space:pre;width:100%}button.svelte-1un819s:hover{background:rgba(255, 162, 177, 0.4);color:#fff}button.selected.svelte-1un819s{background:rgba(255, 162, 177, 0.4)}ul.svelte-1un819s{list-style:none;margin:0;padding:0}ul.show-borders.svelte-1un819s{border-left:1px solid rgb(96, 76, 104);border-right:1px solid rgb(96, 76, 104)}.inline-children.svelte-1un819s{border-left:1px solid rgb(96, 76, 104);border-right:1px solid rgb(96, 76, 104);display:flex;flex-wrap:wrap;padding:0 12px}.inline-children.svelte-1un819s>.doc-node{flex-grow:1;padding:0}");
}
function get_each_context$1(ctx, list, i) {
  const child_ctx = ctx.slice();
  child_ctx[15] = list[i];
  child_ctx[17] = i;
  return child_ctx;
}
function create_each_block$1(ctx) {
  let docnode;
  let current;
  docnode = new DocNode({
    props: {
      node: (
        /*child*/
        ctx[15]
      ),
      startPos: (
        /*startPositions*/
        ctx[5][
          /*i*/
          ctx[17]
        ]
      ),
      depth: (
        /*depth*/
        ctx[1] + 1
      )
    }
  });
  return {
    c() {
      create_component(docnode.$$.fragment);
    },
    m(target, anchor) {
      mount_component(docnode, target, anchor);
      current = true;
    },
    p(ctx2, dirty) {
      const docnode_changes = {};
      if (dirty & /*fragment*/
      4) docnode_changes.node = /*child*/
      ctx2[15];
      if (dirty & /*startPositions*/
      32) docnode_changes.startPos = /*startPositions*/
      ctx2[5][
        /*i*/
        ctx2[17]
      ];
      if (dirty & /*depth*/
      2) docnode_changes.depth = /*depth*/
      ctx2[1] + 1;
      docnode.$set(docnode_changes);
    },
    i(local) {
      if (current) return;
      transition_in(docnode.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(docnode.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      destroy_component(docnode, detaching);
    }
  };
}
function create_fragment$6(ctx) {
  let li;
  let div3;
  let div0;
  let t0;
  let t1;
  let div1;
  let button;
  let t2;
  let t3;
  let div2;
  let t4;
  let div3_style_value;
  let t5;
  let ul;
  let li_class_value;
  let current;
  let mounted;
  let dispose;
  let each_value = ensure_array_like(
    /*fragment*/
    ctx[2].content
  );
  let each_blocks = [];
  for (let i = 0; i < each_value.length; i += 1) {
    each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
  }
  const out = (i) => transition_out(each_blocks[i], 1, 1, () => {
    each_blocks[i] = null;
  });
  return {
    c() {
      li = element("li");
      div3 = element("div");
      div0 = element("div");
      t0 = text(
        /*startPos*/
        ctx[0]
      );
      t1 = space();
      div1 = element("div");
      button = element("button");
      t2 = text(
        /*name*/
        ctx[6]
      );
      t3 = space();
      div2 = element("div");
      t4 = text(
        /*endPos*/
        ctx[4]
      );
      t5 = space();
      ul = element("ul");
      for (let i = 0; i < each_blocks.length; i += 1) {
        each_blocks[i].c();
      }
      attr(div0, "class", "number-box svelte-1un819s");
      attr(button, "aria-label", "Show node info button");
      attr(button, "class", "svelte-1un819s");
      toggle_class(button, "selected", false);
      attr(div1, "class", "node-name svelte-1un819s");
      attr(div2, "class", "number-box svelte-1un819s");
      attr(div3, "class", "doc-node-body svelte-1un819s");
      attr(div3, "style", div3_style_value = "background: ".concat(
        /*color*/
        ctx[7]
      ));
      attr(ul, "class", "svelte-1un819s");
      toggle_class(
        ul,
        "inline-children",
        /*inlineChildren*/
        ctx[3]
      );
      toggle_class(
        ul,
        "show-borders",
        /*depth*/
        ctx[1] >= 1
      );
      attr(li, "class", li_class_value = null_to_empty("".concat(
        /*$$props*/
        ctx[11].class || "",
        " doc-node"
      )) + " svelte-1un819s");
      toggle_class(
        li,
        "root",
        /*isRoot*/
        ctx[8]
      );
    },
    m(target, anchor) {
      insert(target, li, anchor);
      append(li, div3);
      append(div3, div0);
      append(div0, t0);
      append(div3, t1);
      append(div3, div1);
      append(div1, button);
      append(button, t2);
      append(div3, t3);
      append(div3, div2);
      append(div2, t4);
      append(li, t5);
      append(li, ul);
      for (let i = 0; i < each_blocks.length; i += 1) {
        if (each_blocks[i]) {
          each_blocks[i].m(ul, null);
        }
      }
      current = true;
      if (!mounted) {
        dispose = [listen(
          button,
          "click",
          /*handleNameClick*/
          ctx[9]
        ), listen(
          button,
          "dblclick",
          /*handleNameDblClick*/
          ctx[10]
        )];
        mounted = true;
      }
    },
    p(ctx2, _ref) {
      let [dirty] = _ref;
      if (!current || dirty & /*startPos*/
      1) set_data(
        t0,
        /*startPos*/
        ctx2[0]
      );
      if (!current || dirty & /*name*/
      64) set_data(
        t2,
        /*name*/
        ctx2[6]
      );
      if (!current || dirty & /*endPos*/
      16) set_data(
        t4,
        /*endPos*/
        ctx2[4]
      );
      if (!current || dirty & /*color*/
      128 && div3_style_value !== (div3_style_value = "background: ".concat(
        /*color*/
        ctx2[7]
      ))) {
        attr(div3, "style", div3_style_value);
      }
      if (dirty & /*fragment, startPositions, depth*/
      38) {
        each_value = ensure_array_like(
          /*fragment*/
          ctx2[2].content
        );
        let i;
        for (i = 0; i < each_value.length; i += 1) {
          const child_ctx = get_each_context$1(ctx2, each_value, i);
          if (each_blocks[i]) {
            each_blocks[i].p(child_ctx, dirty);
            transition_in(each_blocks[i], 1);
          } else {
            each_blocks[i] = create_each_block$1(child_ctx);
            each_blocks[i].c();
            transition_in(each_blocks[i], 1);
            each_blocks[i].m(ul, null);
          }
        }
        group_outros();
        for (i = each_value.length; i < each_blocks.length; i += 1) {
          out(i);
        }
        check_outros();
      }
      if (!current || dirty & /*inlineChildren*/
      8) {
        toggle_class(
          ul,
          "inline-children",
          /*inlineChildren*/
          ctx2[3]
        );
      }
      if (!current || dirty & /*depth*/
      2) {
        toggle_class(
          ul,
          "show-borders",
          /*depth*/
          ctx2[1] >= 1
        );
      }
      if (!current || dirty & /*$$props*/
      2048 && li_class_value !== (li_class_value = null_to_empty("".concat(
        /*$$props*/
        ctx2[11].class || "",
        " doc-node"
      )) + " svelte-1un819s")) {
        attr(li, "class", li_class_value);
      }
      if (!current || dirty & /*$$props, isRoot*/
      2304) {
        toggle_class(
          li,
          "root",
          /*isRoot*/
          ctx2[8]
        );
      }
    },
    i(local) {
      if (current) return;
      for (let i = 0; i < each_value.length; i += 1) {
        transition_in(each_blocks[i]);
      }
      current = true;
    },
    o(local) {
      each_blocks = each_blocks.filter(Boolean);
      for (let i = 0; i < each_blocks.length; i += 1) {
        transition_out(each_blocks[i]);
      }
      current = false;
    },
    d(detaching) {
      if (detaching) {
        detach(li);
      }
      destroy_each(each_blocks, detaching);
      mounted = false;
      run_all(dispose);
    }
  };
}
function instance$6($$self, $$props, $$invalidate) {
  let fragment;
  let color;
  let name;
  let startPositions;
  let endPos;
  let inlineChildren;
  const {
    colors: colors2,
    handleNodeClick
  } = getContext("doc-view");
  let {
    node,
    startPos,
    depth
  } = $$props;
  const isRoot = depth === 0;
  function handleNameClick() {
    handleNodeClick(node, startPos);
  }
  function handleNameDblClick() {
    handleNodeClick(node, startPos, true);
  }
  $$self.$$set = ($$new_props) => {
    $$invalidate(11, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    if ("node" in $$new_props) $$invalidate(12, node = $$new_props.node);
    if ("startPos" in $$new_props) $$invalidate(0, startPos = $$new_props.startPos);
    if ("depth" in $$new_props) $$invalidate(1, depth = $$new_props.depth);
  };
  $$self.$$.update = () => {
    if ($$self.$$.dirty & /*node*/
    4096) {
      $$invalidate(2, fragment = node.content);
    }
    if ($$self.$$.dirty & /*node*/
    4096) {
      $$invalidate(7, color = colors2[node.type.name]);
    }
    if ($$self.$$.dirty & /*node*/
    4096) {
      $$invalidate(6, name = node.isText && node.marks.length > 0 ? "".concat(node.type.name, " - [").concat(node.marks.map((m) => m.type.name).join(", "), "]") : node.type.name);
    }
    if ($$self.$$.dirty & /*node, startPos*/
    4097) {
      $$invalidate(5, startPositions = Array(node.childCount).fill(void 0).reduce((acc, _, idx) => {
        if (idx === 0) {
          return [isRoot ? 0 : startPos + 1];
        }
        let prev = acc[idx - 1];
        let cur = node.child(idx - 1);
        return [...acc, prev + cur.nodeSize];
      }, []));
    }
    if ($$self.$$.dirty & /*startPos, node*/
    4097) {
      $$invalidate(4, endPos = startPos + node.nodeSize);
    }
    if ($$self.$$.dirty & /*fragment*/
    4) {
      $$invalidate(3, inlineChildren = fragment.content.every((n) => n.isInline));
    }
  };
  $$props = exclude_internal_props($$props);
  return [startPos, depth, fragment, inlineChildren, endPos, startPositions, name, color, isRoot, handleNameClick, handleNameDblClick, $$props, node];
}
class DocNode extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$6, create_fragment$6, safe_not_equal, {
      node: 12,
      startPos: 0,
      depth: 1
    }, add_css$6);
  }
}
const nodeColors = [
  "#EA7C7F",
  // red
  "#67B0C6",
  // cyan 400
  "#94BB7F",
  // green
  "#CA9EDB",
  // deep purple
  "#DCDC5D",
  // lime
  "#B9CC7C",
  // light green
  "#DD97D8",
  // purple
  "#FFB761",
  // orange
  "#4D8FD1",
  // light blue
  "#F36E98",
  // pink
  "#E45F44",
  // deep orange
  "#A6A4AE",
  // blue grey
  "#FCC047",
  // yellow
  "#FFC129",
  // amber
  "#D3929C",
  // can can
  "#4CBCD4",
  // cyan
  "#8D7BC0"
  // indigo
];
function calculateSafeIndex(index, total) {
  const quotient = index / total;
  return Math.round(total * (quotient - Math.floor(quotient)));
}
function buildColors(schema2) {
  return Object.keys(schema2.nodes).reduce((acc, node, index) => {
    const safeIndex = index >= nodeColors.length ? calculateSafeIndex(index, nodeColors.length) : index;
    acc[node] = nodeColors[safeIndex];
    return acc;
  }, {});
}
function add_css$5(target) {
  append_styles(target, "svelte-is7zuw", "ul.svelte-is7zuw{list-style:none;margin:0;padding:0}");
}
function create_fragment$5(ctx) {
  let ul;
  let docnode;
  let current;
  docnode = new DocNode({
    props: {
      class: (
        /*$$props*/
        ctx[1].class
      ),
      node: (
        /*doc*/
        ctx[0]
      ),
      startPos: 0,
      depth: 0
    }
  });
  return {
    c() {
      ul = element("ul");
      create_component(docnode.$$.fragment);
      attr(ul, "class", "svelte-is7zuw");
    },
    m(target, anchor) {
      insert(target, ul, anchor);
      mount_component(docnode, ul, null);
      current = true;
    },
    p(ctx2, _ref) {
      let [dirty] = _ref;
      const docnode_changes = {};
      if (dirty & /*$$props*/
      2) docnode_changes.class = /*$$props*/
      ctx2[1].class;
      if (dirty & /*doc*/
      1) docnode_changes.node = /*doc*/
      ctx2[0];
      docnode.$set(docnode_changes);
    },
    i(local) {
      if (current) return;
      transition_in(docnode.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(docnode.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      if (detaching) {
        detach(ul);
      }
      destroy_component(docnode);
    }
  };
}
function instance$5($$self, $$props, $$invalidate) {
  let {
    doc: doc2,
    schema: schema2,
    selected = {
      type: "",
      start: 0,
      end: 0
    },
    handleNodeSelect
  } = $$props;
  setContext("doc-view", {
    selected,
    colors: buildColors(schema2),
    handleNodeClick: handleNodeSelect
  });
  $$self.$$set = ($$new_props) => {
    $$invalidate(1, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    if ("doc" in $$new_props) $$invalidate(0, doc2 = $$new_props.doc);
    if ("schema" in $$new_props) $$invalidate(2, schema2 = $$new_props.schema);
    if ("selected" in $$new_props) $$invalidate(3, selected = $$new_props.selected);
    if ("handleNodeSelect" in $$new_props) $$invalidate(4, handleNodeSelect = $$new_props.handleNodeSelect);
  };
  $$props = exclude_internal_props($$props);
  return [doc2, $$props, schema2, selected, handleNodeSelect];
}
class DocView extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$5, create_fragment$5, safe_not_equal, {
      doc: 0,
      schema: 2,
      selected: 3,
      handleNodeSelect: 4
    }, add_css$5);
  }
}
function add_css$4(target) {
  append_styles(target, "svelte-15i66m0", ".top-row.svelte-15i66m0{align-items:center;display:flex;justify-content:space-between}.right-panel[slot=right].svelte-15i66m0{border-left:1px solid rgba(255, 162, 177, 0.2);flex-grow:0;min-width:220px;width:220px}.split-view .m-top{margin-top:0.75em}");
}
function create_default_slot_1(ctx) {
  let t;
  return {
    c() {
      t = text("log");
    },
    m(target, anchor) {
      insert(target, t, anchor);
    },
    d(detaching) {
      if (detaching) {
        detach(t);
      }
    }
  };
}
function create_left_slot(ctx) {
  let div1;
  let div0;
  let h2;
  let t1;
  let button;
  let t2;
  let docview;
  let current;
  button = new Button({
    props: {
      class: "hidden",
      $$slots: {
        default: [create_default_slot_1]
      },
      $$scope: {
        ctx
      }
    }
  });
  docview = new DocView({
    props: {
      class: "m-top",
      doc: (
        /*doc*/
        ctx[0]
      ),
      schema: (
        /*schema*/
        ctx[2]
      ),
      handleNodeSelect: (
        /*handleNodeSelect*/
        ctx[3]
      )
    }
  });
  return {
    c() {
      div1 = element("div");
      div0 = element("div");
      h2 = element("h2");
      h2.textContent = "Current doc";
      t1 = space();
      create_component(button.$$.fragment);
      t2 = space();
      create_component(docview.$$.fragment);
      attr(div0, "class", "top-row svelte-15i66m0");
      attr(div1, "slot", "left");
      attr(div1, "class", "left-panel");
    },
    m(target, anchor) {
      insert(target, div1, anchor);
      append(div1, div0);
      append(div0, h2);
      append(div0, t1);
      mount_component(button, div0, null);
      append(div1, t2);
      mount_component(docview, div1, null);
      current = true;
    },
    p(ctx2, dirty) {
      const button_changes = {};
      if (dirty & /*$$scope*/
      256) {
        button_changes.$$scope = {
          dirty,
          ctx: ctx2
        };
      }
      button.$set(button_changes);
      const docview_changes = {};
      if (dirty & /*doc*/
      1) docview_changes.doc = /*doc*/
      ctx2[0];
      docview.$set(docview_changes);
    },
    i(local) {
      if (current) return;
      transition_in(button.$$.fragment, local);
      transition_in(docview.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(button.$$.fragment, local);
      transition_out(docview.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      if (detaching) {
        detach(div1);
      }
      destroy_component(button);
      destroy_component(docview);
    }
  };
}
function create_default_slot(ctx) {
  let t;
  return {
    c() {
      t = text("log");
    },
    m(target, anchor) {
      insert(target, t, anchor);
    },
    d(detaching) {
      if (detaching) {
        detach(t);
      }
    }
  };
}
function create_right_slot$1(ctx) {
  let div1;
  let div0;
  let h2;
  let t1;
  let button;
  let t2;
  let treeview;
  let current;
  button = new Button({
    props: {
      $$slots: {
        default: [create_default_slot]
      },
      $$scope: {
        ctx
      }
    }
  });
  button.$on(
    "click",
    /*handleClickLogNode*/
    ctx[4]
  );
  treeview = new TreeView({
    props: {
      class: "m-top",
      data: (
        /*jsonNode*/
        ctx[1]
      ),
      recursionOpts: {
        shouldExpandNode: func
      }
    }
  });
  return {
    c() {
      div1 = element("div");
      div0 = element("div");
      h2 = element("h2");
      h2.textContent = "Node info";
      t1 = space();
      create_component(button.$$.fragment);
      t2 = space();
      create_component(treeview.$$.fragment);
      attr(div0, "class", "top-row svelte-15i66m0");
      attr(div1, "slot", "right");
      attr(div1, "class", "right-panel svelte-15i66m0");
    },
    m(target, anchor) {
      insert(target, div1, anchor);
      append(div1, div0);
      append(div0, h2);
      append(div0, t1);
      mount_component(button, div0, null);
      append(div1, t2);
      mount_component(treeview, div1, null);
      current = true;
    },
    p(ctx2, dirty) {
      const button_changes = {};
      if (dirty & /*$$scope*/
      256) {
        button_changes.$$scope = {
          dirty,
          ctx: ctx2
        };
      }
      button.$set(button_changes);
      const treeview_changes = {};
      if (dirty & /*jsonNode*/
      2) treeview_changes.data = /*jsonNode*/
      ctx2[1];
      treeview.$set(treeview_changes);
    },
    i(local) {
      if (current) return;
      transition_in(button.$$.fragment, local);
      transition_in(treeview.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(button.$$.fragment, local);
      transition_out(treeview.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      if (detaching) {
        detach(div1);
      }
      destroy_component(button);
      destroy_component(treeview);
    }
  };
}
function create_fragment$4(ctx) {
  let splitview;
  let current;
  splitview = new SplitView({
    props: {
      $$slots: {
        right: [create_right_slot$1],
        left: [create_left_slot]
      },
      $$scope: {
        ctx
      }
    }
  });
  return {
    c() {
      create_component(splitview.$$.fragment);
    },
    m(target, anchor) {
      mount_component(splitview, target, anchor);
      current = true;
    },
    p(ctx2, _ref) {
      let [dirty] = _ref;
      const splitview_changes = {};
      if (dirty & /*$$scope, jsonNode, doc*/
      259) {
        splitview_changes.$$scope = {
          dirty,
          ctx: ctx2
        };
      }
      splitview.$set(splitview_changes);
    },
    i(local) {
      if (current) return;
      transition_in(splitview.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(splitview.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      destroy_component(splitview, detaching);
    }
  };
}
function getScrollableParent(el) {
  if (!el || el === document.body) return void 0;
  else if (el.scrollHeight !== el.clientHeight) return el;
  return getScrollableParent(el.parentElement);
}
const func = (n) => n.type !== "array" || n.value.length <= 50;
function instance$4($$self, $$props, $$invalidate) {
  let jsonNode;
  const {
    view: view2
  } = getContext("editor-view");
  let doc2 = view2.state.doc;
  let selected = {
    node: view2.state.doc,
    pos: 0
  };
  let schema2 = view2.state.schema;
  let timer;
  latestEntry.subscribe((e) => {
    if (!e) return;
    e.trs.forEach((tr) => {
      $$invalidate(5, selected.pos = tr.mapping.map(selected.pos), selected);
    });
    clearTimeout(timer);
    timer = setTimeout(() => {
      $$invalidate(0, doc2 = e.state.doc);
      const pos = selected.pos;
      try {
        const node = doc2.nodeAt(pos);
        $$invalidate(5, selected = {
          node: node || doc2,
          pos: node ? pos : 0
        });
      } catch (err) {
      }
    }, 100);
  });
  function handleNodeSelect(node, startPos) {
    let scroll = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : false;
    var _a;
    $$invalidate(5, selected = {
      node,
      pos: startPos
    });
    if (!scroll) return;
    let nodeDom = view2.nodeDOM(startPos);
    while (nodeDom && !(nodeDom instanceof HTMLElement)) {
      nodeDom = nodeDom.parentElement;
    }
    if (!nodeDom || getComputedStyle(nodeDom).display === "none") return;
    const parentWithScrollbar = getScrollableParent(view2.dom);
    if (parentWithScrollbar) {
      const alreadyScrolled = parentWithScrollbar.scrollTop;
      const parentOffset = parentWithScrollbar.offsetTop - window.scrollY;
      const parentTop = parentWithScrollbar.getBoundingClientRect().top - parentOffset;
      const nodeTop2 = nodeDom.getBoundingClientRect().top - parentOffset;
      const halfwayParent = parentWithScrollbar.clientHeight / 2;
      parentWithScrollbar.scroll(0, alreadyScrolled + parentTop + nodeTop2 - halfwayParent);
    }
    const nodeTop = view2.coordsAtPos(startPos).top;
    const dockHeight = ((_a = document.querySelector(".floating-dock")) === null || _a === void 0 ? void 0 : _a.clientHeight) || 0;
    window.scroll(0, nodeTop - dockHeight + nodeDom.clientHeight + window.scrollY);
  }
  function handleClickLogNode() {
    console.log(selected);
    window._node = selected;
    console.info("%c [prosemirror-dev-toolkit]: Property added to window._node", "color: #b8e248");
  }
  $$self.$$.update = () => {
    if ($$self.$$.dirty & /*selected*/
    32) {
      $$invalidate(1, jsonNode = selected.node.toJSON());
    }
  };
  return [doc2, jsonNode, schema2, handleNodeSelect, handleClickLogNode, selected];
}
class StructureTab extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$4, create_fragment$4, safe_not_equal, {}, add_css$4);
  }
}
function add_css$3(target) {
  append_styles(target, "svelte-969ox4", "ul.svelte-969ox4.svelte-969ox4{color:#fff;list-style:none;margin:0;padding:0;height:100%;width:100%}li.svelte-969ox4+li.svelte-969ox4{border-top:1px solid rgb(96, 76, 104)}li.svelte-969ox4.svelte-969ox4{align-items:center;display:flex;font-family:monospace;padding:6px 18px}input.svelte-969ox4.svelte-969ox4{background:transparent;border:0;color:#fff;height:100%;margin:0;padding:2px;width:100%}.unstyled-btn.svelte-969ox4.svelte-969ox4{background:transparent;border:0;color:#fff;cursor:pointer;display:block;font-family:monospace;margin:0;padding:0;text-align:start;width:100%}.snapshot-btn.svelte-969ox4.svelte-969ox4{background:transparent;border:0;border-radius:3px;color:#d3d3d9;cursor:pointer;display:flex;font-size:11px;padding:6px 18px;text-transform:uppercase}.snapshot-btn.svelte-969ox4.svelte-969ox4:hover{background:rgba(255, 162, 177, 0.4);color:#fff}.ml-2.svelte-969ox4.svelte-969ox4{margin-left:1rem}");
}
function get_each_context(ctx, list, i) {
  const child_ctx = ctx.slice();
  child_ctx[23] = list[i];
  return child_ctx;
}
function create_else_block_2(ctx) {
  let button;
  let t_value = (
    /*snap*/
    ctx[23].name + ""
  );
  let t;
  let mounted;
  let dispose;
  function dblclick_handler() {
    return (
      /*dblclick_handler*/
      ctx[16](
        /*snap*/
        ctx[23]
      )
    );
  }
  return {
    c() {
      button = element("button");
      t = text(t_value);
      attr(button, "class", "unstyled-btn svelte-969ox4");
      attr(button, "aria-label", "Edit snapshot name button");
    },
    m(target, anchor) {
      insert(target, button, anchor);
      append(button, t);
      if (!mounted) {
        dispose = listen(button, "dblclick", dblclick_handler);
        mounted = true;
      }
    },
    p(new_ctx, dirty) {
      ctx = new_ctx;
      if (dirty & /*snapshots*/
      1 && t_value !== (t_value = /*snap*/
      ctx[23].name + "")) set_data(t, t_value);
    },
    d(detaching) {
      if (detaching) {
        detach(button);
      }
      mounted = false;
      dispose();
    }
  };
}
function create_if_block_2$1(ctx) {
  let input;
  let input_value_value;
  let mounted;
  let dispose;
  return {
    c() {
      input = element("input");
      input.value = input_value_value = /*editedSnap*/
      ctx[2].name;
      attr(input, "class", "svelte-969ox4");
    },
    m(target, anchor) {
      insert(target, input, anchor);
      if (!mounted) {
        dispose = [listen(
          input,
          "input",
          /*handleNameChange*/
          ctx[5]
        ), listen(
          input,
          "keypress",
          /*handleNameKeyPress*/
          ctx[6]
        )];
        mounted = true;
      }
    },
    p(ctx2, dirty) {
      if (dirty & /*editedSnap*/
      4 && input_value_value !== (input_value_value = /*editedSnap*/
      ctx2[2].name) && input.value !== input_value_value) {
        input.value = input_value_value;
      }
    },
    d(detaching) {
      if (detaching) {
        detach(input);
      }
      mounted = false;
      run_all(dispose);
    }
  };
}
function create_else_block_1(ctx) {
  let t;
  return {
    c() {
      t = text("Show");
    },
    m(target, anchor) {
      insert(target, t, anchor);
    },
    d(detaching) {
      if (detaching) {
        detach(t);
      }
    }
  };
}
function create_if_block_1$1(ctx) {
  let t;
  return {
    c() {
      t = text("Hide");
    },
    m(target, anchor) {
      insert(target, t, anchor);
    },
    d(detaching) {
      if (detaching) {
        detach(t);
      }
    }
  };
}
function create_else_block$3(ctx) {
  let t;
  return {
    c() {
      t = text("Delete");
    },
    m(target, anchor) {
      insert(target, t, anchor);
    },
    d(detaching) {
      if (detaching) {
        detach(t);
      }
    }
  };
}
function create_if_block$3(ctx) {
  let t;
  return {
    c() {
      t = text("Confirm Delete");
    },
    m(target, anchor) {
      insert(target, t, anchor);
    },
    d(detaching) {
      if (detaching) {
        detach(t);
      }
    }
  };
}
function create_each_block(ctx) {
  let li;
  let t0;
  let button0;
  let t1;
  let button1;
  let t3;
  let button2;
  let t5;
  let button3;
  let t6;
  let mounted;
  let dispose;
  function select_block_type(ctx2, dirty) {
    if (
      /*editedSnap*/
      ctx2[2] && /*editedSnap*/
      ctx2[2].timestamp === /*snap*/
      ctx2[23].timestamp
    ) return create_if_block_2$1;
    return create_else_block_2;
  }
  let current_block_type = select_block_type(ctx);
  let if_block0 = current_block_type(ctx);
  function select_block_type_1(ctx2, dirty) {
    var _ctx$;
    if (
      /*selectedSnapshot*/
      ((_ctx$ = ctx2[1]) === null || _ctx$ === void 0 ? void 0 : _ctx$.timestamp) === /*snap*/
      ctx2[23].timestamp
    ) return create_if_block_1$1;
    return create_else_block_1;
  }
  let current_block_type_1 = select_block_type_1(ctx);
  let if_block1 = current_block_type_1(ctx);
  function click_handler() {
    return (
      /*click_handler*/
      ctx[17](
        /*snap*/
        ctx[23]
      )
    );
  }
  function click_handler_1() {
    return (
      /*click_handler_1*/
      ctx[18](
        /*snap*/
        ctx[23]
      )
    );
  }
  function click_handler_2() {
    return (
      /*click_handler_2*/
      ctx[19](
        /*snap*/
        ctx[23]
      )
    );
  }
  function select_block_type_2(ctx2, dirty) {
    var _ctx$2;
    if (
      /*deleteSnap*/
      ((_ctx$2 = ctx2[3]) === null || _ctx$2 === void 0 ? void 0 : _ctx$2.timestamp) === /*snap*/
      ctx2[23].timestamp
    ) return create_if_block$3;
    return create_else_block$3;
  }
  let current_block_type_2 = select_block_type_2(ctx);
  let if_block2 = current_block_type_2(ctx);
  function click_handler_3() {
    return (
      /*click_handler_3*/
      ctx[20](
        /*snap*/
        ctx[23]
      )
    );
  }
  return {
    c() {
      li = element("li");
      if_block0.c();
      t0 = space();
      button0 = element("button");
      if_block1.c();
      t1 = space();
      button1 = element("button");
      button1.textContent = "Restore";
      t3 = space();
      button2 = element("button");
      button2.textContent = "Export";
      t5 = space();
      button3 = element("button");
      if_block2.c();
      t6 = space();
      attr(button0, "class", "snapshot-btn ml-2 svelte-969ox4");
      attr(button1, "class", "snapshot-btn svelte-969ox4");
      attr(button2, "class", "snapshot-btn svelte-969ox4");
      attr(button3, "class", "snapshot-btn svelte-969ox4");
      attr(li, "class", "svelte-969ox4");
    },
    m(target, anchor) {
      insert(target, li, anchor);
      if_block0.m(li, null);
      append(li, t0);
      append(li, button0);
      if_block1.m(button0, null);
      append(li, t1);
      append(li, button1);
      append(li, t3);
      append(li, button2);
      append(li, t5);
      append(li, button3);
      if_block2.m(button3, null);
      append(li, t6);
      if (!mounted) {
        dispose = [listen(button0, "click", click_handler), listen(button1, "click", click_handler_1), listen(button2, "click", click_handler_2), listen(button3, "click", click_handler_3)];
        mounted = true;
      }
    },
    p(new_ctx, dirty) {
      ctx = new_ctx;
      if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block0) {
        if_block0.p(ctx, dirty);
      } else {
        if_block0.d(1);
        if_block0 = current_block_type(ctx);
        if (if_block0) {
          if_block0.c();
          if_block0.m(li, t0);
        }
      }
      if (current_block_type_1 !== (current_block_type_1 = select_block_type_1(ctx))) {
        if_block1.d(1);
        if_block1 = current_block_type_1(ctx);
        if (if_block1) {
          if_block1.c();
          if_block1.m(button0, null);
        }
      }
      if (current_block_type_2 !== (current_block_type_2 = select_block_type_2(ctx))) {
        if_block2.d(1);
        if_block2 = current_block_type_2(ctx);
        if (if_block2) {
          if_block2.c();
          if_block2.m(button3, null);
        }
      }
    },
    d(detaching) {
      if (detaching) {
        detach(li);
      }
      if_block0.d();
      if_block1.d();
      if_block2.d();
      mounted = false;
      run_all(dispose);
    }
  };
}
function create_fragment$3(ctx) {
  let ul;
  let each_value = ensure_array_like(
    /*snapshots*/
    ctx[0]
  );
  let each_blocks = [];
  for (let i = 0; i < each_value.length; i += 1) {
    each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
  }
  return {
    c() {
      ul = element("ul");
      for (let i = 0; i < each_blocks.length; i += 1) {
        each_blocks[i].c();
      }
      attr(ul, "class", "svelte-969ox4");
    },
    m(target, anchor) {
      insert(target, ul, anchor);
      for (let i = 0; i < each_blocks.length; i += 1) {
        if (each_blocks[i]) {
          each_blocks[i].m(ul, null);
        }
      }
    },
    p(ctx2, _ref) {
      let [dirty] = _ref;
      if (dirty & /*handleClickDelete, snapshots, deleteSnap, handleExportClick, handleRestoreClick, handleClickView, selectedSnapshot, editedSnap, handleNameChange, handleNameKeyPress, handleSnapDoubleclick*/
      2047) {
        each_value = ensure_array_like(
          /*snapshots*/
          ctx2[0]
        );
        let i;
        for (i = 0; i < each_value.length; i += 1) {
          const child_ctx = get_each_context(ctx2, each_value, i);
          if (each_blocks[i]) {
            each_blocks[i].p(child_ctx, dirty);
          } else {
            each_blocks[i] = create_each_block(child_ctx);
            each_blocks[i].c();
            each_blocks[i].m(ul, null);
          }
        }
        for (; i < each_blocks.length; i += 1) {
          each_blocks[i].d(1);
        }
        each_blocks.length = each_value.length;
      }
    },
    i: noop,
    o: noop,
    d(detaching) {
      if (detaching) {
        detach(ul);
      }
      destroy_each(each_blocks, detaching);
    }
  };
}
function instance$3($$self, $$props, $$invalidate) {
  let {
    snapshots: snapshots2 = [],
    selectedSnapshot: selectedSnapshot2 = void 0,
    onUpdate,
    onView,
    onRestore,
    onExport,
    onDelete
  } = $$props;
  let editedSnap;
  let deleteSnap;
  let timer;
  const debounceUpdate = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      onUpdate(editedSnap);
    }, 150);
  };
  function handleSnapDoubleclick(snap) {
    $$invalidate(2, editedSnap = snap);
    $$invalidate(3, deleteSnap = void 0);
  }
  function handleNameChange(evt) {
    if (editedSnap) {
      $$invalidate(2, editedSnap.name = evt.currentTarget.value, editedSnap);
      debounceUpdate();
    }
  }
  function handleNameKeyPress(evt) {
    if (evt.key === "Enter" && editedSnap) {
      onUpdate(editedSnap);
      clearTimeout(timer);
      $$invalidate(2, editedSnap = void 0);
      $$invalidate(3, deleteSnap = void 0);
    }
  }
  function handleClickView(snap) {
    if ((selectedSnapshot2 === null || selectedSnapshot2 === void 0 ? void 0 : selectedSnapshot2.timestamp) === snap.timestamp) {
      onView();
    } else {
      onView(snap);
    }
    $$invalidate(3, deleteSnap = void 0);
  }
  function handleRestoreClick(snap) {
    onRestore(snap);
    $$invalidate(3, deleteSnap = void 0);
  }
  function handleExportClick(snap) {
    onExport(snap);
    $$invalidate(3, deleteSnap = void 0);
  }
  function handleClickDelete(snap) {
    if (!deleteSnap || deleteSnap.timestamp !== snap.timestamp) {
      $$invalidate(3, deleteSnap = snap);
    } else {
      onDelete(snap);
      $$invalidate(3, deleteSnap = void 0);
    }
  }
  const dblclick_handler = (snap) => handleSnapDoubleclick(snap);
  const click_handler = (snap) => handleClickView(snap);
  const click_handler_1 = (snap) => handleRestoreClick(snap);
  const click_handler_2 = (snap) => handleExportClick(snap);
  const click_handler_3 = (snap) => handleClickDelete(snap);
  $$self.$$set = ($$props2) => {
    if ("snapshots" in $$props2) $$invalidate(0, snapshots2 = $$props2.snapshots);
    if ("selectedSnapshot" in $$props2) $$invalidate(1, selectedSnapshot2 = $$props2.selectedSnapshot);
    if ("onUpdate" in $$props2) $$invalidate(11, onUpdate = $$props2.onUpdate);
    if ("onView" in $$props2) $$invalidate(12, onView = $$props2.onView);
    if ("onRestore" in $$props2) $$invalidate(13, onRestore = $$props2.onRestore);
    if ("onExport" in $$props2) $$invalidate(14, onExport = $$props2.onExport);
    if ("onDelete" in $$props2) $$invalidate(15, onDelete = $$props2.onDelete);
  };
  return [snapshots2, selectedSnapshot2, editedSnap, deleteSnap, handleSnapDoubleclick, handleNameChange, handleNameKeyPress, handleClickView, handleRestoreClick, handleExportClick, handleClickDelete, onUpdate, onView, onRestore, onExport, onDelete, dblclick_handler, click_handler, click_handler_1, click_handler_2, click_handler_3];
}
class SnapshotsList extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$3, create_fragment$3, safe_not_equal, {
      snapshots: 0,
      selectedSnapshot: 1,
      onUpdate: 11,
      onView: 12,
      onRestore: 13,
      onExport: 14,
      onDelete: 15
    }, add_css$3);
  }
}
function add_css$2(target) {
  append_styles(target, "svelte-3jdj5c", ".right-panel[slot=right].svelte-3jdj5c{padding:0}.no-snapshots.svelte-3jdj5c{align-items:center;color:rgb(255, 162, 177);display:flex;font-size:14px;height:100%;justify-content:center;width:100%}");
}
function create_else_block$2(ctx) {
  let snapshotslist;
  let current;
  snapshotslist = new SnapshotsList({
    props: {
      snapshots: (
        /*$snapshots*/
        ctx[0]
      ),
      selectedSnapshot: (
        /*$selectedSnapshot*/
        ctx[1]
      ),
      onUpdate: updateSnapshot,
      onView: (
        /*func*/
        ctx[4]
      ),
      onRestore: (
        /*handleRestoreSnapshot*/
        ctx[3]
      ),
      onExport: exportSnapshot,
      onDelete: deleteSnapshot
    }
  });
  return {
    c() {
      create_component(snapshotslist.$$.fragment);
    },
    m(target, anchor) {
      mount_component(snapshotslist, target, anchor);
      current = true;
    },
    p(ctx2, dirty) {
      const snapshotslist_changes = {};
      if (dirty & /*$snapshots*/
      1) snapshotslist_changes.snapshots = /*$snapshots*/
      ctx2[0];
      if (dirty & /*$selectedSnapshot*/
      2) snapshotslist_changes.selectedSnapshot = /*$selectedSnapshot*/
      ctx2[1];
      snapshotslist.$set(snapshotslist_changes);
    },
    i(local) {
      if (current) return;
      transition_in(snapshotslist.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(snapshotslist.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      destroy_component(snapshotslist, detaching);
    }
  };
}
function create_if_block$2(ctx) {
  let div;
  return {
    c() {
      div = element("div");
      div.textContent = 'Save snapshots by clicking "Save" button.';
      attr(div, "class", "no-snapshots svelte-3jdj5c");
    },
    m(target, anchor) {
      insert(target, div, anchor);
    },
    p: noop,
    i: noop,
    o: noop,
    d(detaching) {
      if (detaching) {
        detach(div);
      }
    }
  };
}
function create_right_slot(ctx) {
  let div;
  let current_block_type_index;
  let if_block;
  let current;
  const if_block_creators = [create_if_block$2, create_else_block$2];
  const if_blocks = [];
  function select_block_type(ctx2, dirty) {
    if (
      /*$snapshots*/
      ctx2[0].length === 0
    ) return 0;
    return 1;
  }
  current_block_type_index = select_block_type(ctx);
  if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
  return {
    c() {
      div = element("div");
      if_block.c();
      attr(div, "slot", "right");
      attr(div, "class", "right-panel svelte-3jdj5c");
    },
    m(target, anchor) {
      insert(target, div, anchor);
      if_blocks[current_block_type_index].m(div, null);
      current = true;
    },
    p(ctx2, dirty) {
      let previous_block_index = current_block_type_index;
      current_block_type_index = select_block_type(ctx2);
      if (current_block_type_index === previous_block_index) {
        if_blocks[current_block_type_index].p(ctx2, dirty);
      } else {
        group_outros();
        transition_out(if_blocks[previous_block_index], 1, 1, () => {
          if_blocks[previous_block_index] = null;
        });
        check_outros();
        if_block = if_blocks[current_block_type_index];
        if (!if_block) {
          if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx2);
          if_block.c();
        } else {
          if_block.p(ctx2, dirty);
        }
        transition_in(if_block, 1);
        if_block.m(div, null);
      }
    },
    i(local) {
      if (current) return;
      transition_in(if_block);
      current = true;
    },
    o(local) {
      transition_out(if_block);
      current = false;
    },
    d(detaching) {
      if (detaching) {
        detach(div);
      }
      if_blocks[current_block_type_index].d();
    }
  };
}
function create_fragment$2(ctx) {
  let splitview;
  let current;
  splitview = new SplitView({
    props: {
      $$slots: {
        right: [create_right_slot]
      },
      $$scope: {
        ctx
      }
    }
  });
  return {
    c() {
      create_component(splitview.$$.fragment);
    },
    m(target, anchor) {
      mount_component(splitview, target, anchor);
      current = true;
    },
    p(ctx2, _ref) {
      let [dirty] = _ref;
      const splitview_changes = {};
      if (dirty & /*$$scope, $snapshots, $selectedSnapshot*/
      35) {
        splitview_changes.$$scope = {
          dirty,
          ctx: ctx2
        };
      }
      splitview.$set(splitview_changes);
    },
    i(local) {
      if (current) return;
      transition_in(splitview.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(splitview.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      destroy_component(splitview, detaching);
    }
  };
}
function instance$2($$self, $$props, $$invalidate) {
  let $snapshots;
  let $selectedSnapshot;
  component_subscribe($$self, snapshots, ($$value) => $$invalidate(0, $snapshots = $$value));
  component_subscribe($$self, selectedSnapshot, ($$value) => $$invalidate(1, $selectedSnapshot = $$value));
  const {
    view: view2
  } = getContext("editor-view");
  function handleRestoreSnapshot(snapshot) {
    restoreSnapshot(view2, snapshot);
    resetHistory();
  }
  const func2 = (snap) => toggleViewSnapshot(view2, snap);
  return [$snapshots, $selectedSnapshot, view2, handleRestoreSnapshot, func2];
}
class SnapshotsTab extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$2, create_fragment$2, safe_not_equal, {}, add_css$2);
  }
}
function add_css$1(target) {
  append_styles(target, "svelte-1quf800", ".floating-dock-wrapper.svelte-1quf800{position:fixed;width:0px;height:0px;top:0px;left:0px;z-index:99999999}.floating-dock.svelte-1quf800{background-color:#363755;position:fixed;z-index:1;box-shadow:rgba(34, 34, 34, 0.3) 0px 0px 4px 0px;left:0px;top:50%;width:100%;height:50%}.resizing-div.svelte-1quf800{position:absolute;z-index:2;opacity:0;top:-5px;height:10px;left:0px;width:100%;cursor:row-resize}.floating-dock-body.svelte-1quf800{height:100%}button.svelte-1quf800{background:rgba(255, 162, 177, 0.6);border:0;border-radius:3px;color:#fff;cursor:pointer;font-size:12px;height:24px;line-height:25px;padding:0 6px;position:absolute}button.svelte-1quf800:hover{background:rgba(255, 162, 177, 0.8)}.copy-btn.svelte-1quf800{right:173px;top:-28px}.save-btn.svelte-1quf800{right:129px;top:-28px}.import-btn.svelte-1quf800{right:79px;top:-28px}.paste-btn.svelte-1quf800{right:32px;top:-28px}.close-btn.svelte-1quf800{font-size:var(--font-medium);right:4px;top:-28px;width:24px}");
}
function create_else_block$1(ctx) {
  let p;
  return {
    c() {
      p = element("p");
      p.textContent = "nuting here";
    },
    m(target, anchor) {
      insert(target, p, anchor);
    },
    i: noop,
    o: noop,
    d(detaching) {
      if (detaching) {
        detach(p);
      }
    }
  };
}
function create_if_block_5(ctx) {
  let snapshotstab;
  let current;
  snapshotstab = new SnapshotsTab({});
  return {
    c() {
      create_component(snapshotstab.$$.fragment);
    },
    m(target, anchor) {
      mount_component(snapshotstab, target, anchor);
      current = true;
    },
    i(local) {
      if (current) return;
      transition_in(snapshotstab.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(snapshotstab.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      destroy_component(snapshotstab, detaching);
    }
  };
}
function create_if_block_4(ctx) {
  let structuretab;
  let current;
  structuretab = new StructureTab({});
  return {
    c() {
      create_component(structuretab.$$.fragment);
    },
    m(target, anchor) {
      mount_component(structuretab, target, anchor);
      current = true;
    },
    i(local) {
      if (current) return;
      transition_in(structuretab.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(structuretab.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      destroy_component(structuretab, detaching);
    }
  };
}
function create_if_block_3(ctx) {
  let schematab;
  let current;
  schematab = new SchemaTab({});
  return {
    c() {
      create_component(schematab.$$.fragment);
    },
    m(target, anchor) {
      mount_component(schematab, target, anchor);
      current = true;
    },
    i(local) {
      if (current) return;
      transition_in(schematab.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(schematab.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      destroy_component(schematab, detaching);
    }
  };
}
function create_if_block_2(ctx) {
  let pluginstab;
  let current;
  pluginstab = new PluginsTab({});
  return {
    c() {
      create_component(pluginstab.$$.fragment);
    },
    m(target, anchor) {
      mount_component(pluginstab, target, anchor);
      current = true;
    },
    i(local) {
      if (current) return;
      transition_in(pluginstab.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(pluginstab.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      destroy_component(pluginstab, detaching);
    }
  };
}
function create_if_block_1(ctx) {
  let historytab;
  let current;
  historytab = new HistoryTab({});
  return {
    c() {
      create_component(historytab.$$.fragment);
    },
    m(target, anchor) {
      mount_component(historytab, target, anchor);
      current = true;
    },
    i(local) {
      if (current) return;
      transition_in(historytab.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(historytab.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      destroy_component(historytab, detaching);
    }
  };
}
function create_if_block$1(ctx) {
  let statetab;
  let current;
  statetab = new StateTab({});
  return {
    c() {
      create_component(statetab.$$.fragment);
    },
    m(target, anchor) {
      mount_component(statetab, target, anchor);
      current = true;
    },
    i(local) {
      if (current) return;
      transition_in(statetab.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(statetab.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      destroy_component(statetab, detaching);
    }
  };
}
function create_fragment$1(ctx) {
  let div4;
  let pastemodal;
  let t0;
  let div3;
  let div0;
  let t1;
  let div2;
  let div1;
  let button0;
  let t3;
  let button1;
  let t5;
  let button2;
  let t7;
  let button3;
  let t9;
  let button4;
  let t11;
  let input;
  let t12;
  let tabsmenu;
  let t13;
  let current_block_type_index;
  let if_block;
  let div3_style_value;
  let current;
  let mounted;
  let dispose;
  pastemodal = new PasteModal({
    props: {
      isOpen: (
        /*modalOpen*/
        ctx[5]
      )
    }
  });
  pastemodal.$on(
    "submit",
    /*handlePasteSubmit*/
    ctx[12]
  );
  pastemodal.$on(
    "close",
    /*handleCloseModal*/
    ctx[11]
  );
  tabsmenu = new TabsMenu({
    props: {
      onClickTab: (
        /*handleClickTab*/
        ctx[14]
      ),
      active: (
        /*openTab*/
        ctx[1]
      )
    }
  });
  const if_block_creators = [create_if_block$1, create_if_block_1, create_if_block_2, create_if_block_3, create_if_block_4, create_if_block_5, create_else_block$1];
  const if_blocks = [];
  function select_block_type(ctx2, dirty) {
    if (
      /*openTab*/
      ctx2[1] === "state"
    ) return 0;
    if (
      /*openTab*/
      ctx2[1] === "history"
    ) return 1;
    if (
      /*openTab*/
      ctx2[1] === "plugins"
    ) return 2;
    if (
      /*openTab*/
      ctx2[1] === "schema"
    ) return 3;
    if (
      /*openTab*/
      ctx2[1] === "structure"
    ) return 4;
    if (
      /*openTab*/
      ctx2[1] === "snapshots"
    ) return 5;
    return 6;
  }
  current_block_type_index = select_block_type(ctx);
  if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
  return {
    c() {
      div4 = element("div");
      create_component(pastemodal.$$.fragment);
      t0 = space();
      div3 = element("div");
      div0 = element("div");
      t1 = space();
      div2 = element("div");
      div1 = element("div");
      button0 = element("button");
      button0.textContent = "Copy";
      t3 = space();
      button1 = element("button");
      button1.textContent = "Save";
      t5 = space();
      button2 = element("button");
      button2.textContent = "Import";
      t7 = space();
      button3 = element("button");
      button3.textContent = "Paste";
      t9 = space();
      button4 = element("button");
      button4.textContent = "X";
      t11 = space();
      input = element("input");
      t12 = space();
      create_component(tabsmenu.$$.fragment);
      t13 = space();
      if_block.c();
      attr(div0, "class", "resizing-div svelte-1quf800");
      attr(div0, "role", "button");
      attr(div0, "tabindex", "-1");
      attr(button0, "class", "copy-btn svelte-1quf800");
      attr(button1, "class", "save-btn svelte-1quf800");
      attr(button2, "class", "import-btn svelte-1quf800");
      attr(button3, "class", "paste-btn svelte-1quf800");
      attr(button4, "class", "close-btn svelte-1quf800");
      attr(button4, "aria-label", "Close dev-toolkit");
      set_style(input, "display", "none");
      attr(input, "type", "file");
      attr(input, "accept", ".json");
      input.multiple = true;
      attr(div2, "class", "floating-dock-body svelte-1quf800");
      attr(div3, "class", "floating-dock svelte-1quf800");
      attr(div3, "style", div3_style_value = "top: ".concat(
        /*dockTop*/
        ctx[2],
        "%; height: "
      ).concat(
        /*dockHeight*/
        ctx[3],
        "%;"
      ));
      attr(div4, "class", "floating-dock-wrapper svelte-1quf800");
    },
    m(target, anchor) {
      insert(target, div4, anchor);
      mount_component(pastemodal, div4, null);
      append(div4, t0);
      append(div4, div3);
      append(div3, div0);
      append(div3, t1);
      append(div3, div2);
      append(div2, div1);
      append(div1, button0);
      append(div1, t3);
      append(div1, button1);
      append(div1, t5);
      append(div1, button2);
      append(div1, t7);
      append(div1, button3);
      append(div1, t9);
      append(div1, button4);
      append(div2, t11);
      append(div2, input);
      ctx[15](input);
      append(div2, t12);
      mount_component(tabsmenu, div2, null);
      append(div2, t13);
      if_blocks[current_block_type_index].m(div2, null);
      current = true;
      if (!mounted) {
        dispose = [listen(
          div0,
          "mousedown",
          /*handleResizeMouseDown*/
          ctx[6]
        ), listen(
          button0,
          "click",
          /*handleCopyDoc*/
          ctx[7]
        ), listen(
          button1,
          "click",
          /*handleSaveSnapshot*/
          ctx[8]
        ), listen(
          button2,
          "click",
          /*handleImportSnapshot*/
          ctx[9]
        ), listen(
          button3,
          "click",
          /*handlePasteSnapshot*/
          ctx[10]
        ), listen(button4, "click", function() {
          if (is_function(
            /*onClose*/
            ctx[0]
          )) ctx[0].apply(this, arguments);
        }), listen(
          input,
          "change",
          /*handleFileSelected*/
          ctx[13]
        )];
        mounted = true;
      }
    },
    p(new_ctx, _ref) {
      let [dirty] = _ref;
      ctx = new_ctx;
      const pastemodal_changes = {};
      if (dirty & /*modalOpen*/
      32) pastemodal_changes.isOpen = /*modalOpen*/
      ctx[5];
      pastemodal.$set(pastemodal_changes);
      const tabsmenu_changes = {};
      if (dirty & /*openTab*/
      2) tabsmenu_changes.active = /*openTab*/
      ctx[1];
      tabsmenu.$set(tabsmenu_changes);
      let previous_block_index = current_block_type_index;
      current_block_type_index = select_block_type(ctx);
      if (current_block_type_index !== previous_block_index) {
        group_outros();
        transition_out(if_blocks[previous_block_index], 1, 1, () => {
          if_blocks[previous_block_index] = null;
        });
        check_outros();
        if_block = if_blocks[current_block_type_index];
        if (!if_block) {
          if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
          if_block.c();
        }
        transition_in(if_block, 1);
        if_block.m(div2, null);
      }
      if (!current || dirty & /*dockTop, dockHeight*/
      12 && div3_style_value !== (div3_style_value = "top: ".concat(
        /*dockTop*/
        ctx[2],
        "%; height: "
      ).concat(
        /*dockHeight*/
        ctx[3],
        "%;"
      ))) {
        attr(div3, "style", div3_style_value);
      }
    },
    i(local) {
      if (current) return;
      transition_in(pastemodal.$$.fragment, local);
      transition_in(tabsmenu.$$.fragment, local);
      transition_in(if_block);
      current = true;
    },
    o(local) {
      transition_out(pastemodal.$$.fragment, local);
      transition_out(tabsmenu.$$.fragment, local);
      transition_out(if_block);
      current = false;
    },
    d(detaching) {
      if (detaching) {
        detach(div4);
      }
      destroy_component(pastemodal);
      ctx[15](null);
      destroy_component(tabsmenu);
      if_blocks[current_block_type_index].d();
      mounted = false;
      run_all(dispose);
    }
  };
}
function instance$1($$self, $$props, $$invalidate) {
  let {
    onClose
  } = $$props;
  const {
    view: view2
  } = getContext("editor-view");
  let openTab = "state", dockTop = 50, dockHeight = 50, fileinput, modalOpen = false;
  onDestroy(() => {
    document.removeEventListener("mousemove", dragMove);
    document.removeEventListener("mouseup", dragEnd);
  });
  function handleResizeMouseDown() {
    document.addEventListener("mousemove", dragMove);
    document.addEventListener("mouseup", dragEnd);
  }
  function dragMove(evt) {
    evt.preventDefault();
    $$invalidate(2, dockTop = 100 * evt.clientY / window.innerHeight);
    $$invalidate(3, dockHeight = 100 * (1 - evt.clientY / window.innerHeight));
  }
  function dragEnd(evt) {
    evt.preventDefault();
    document.removeEventListener("mousemove", dragMove);
    document.removeEventListener("mouseup", dragEnd);
  }
  function handleCopyDoc() {
    navigator.clipboard.writeText(JSON.stringify(view2.state.doc.toJSON()));
  }
  function handleSaveSnapshot() {
    const defaultName = (/* @__PURE__ */ new Date()).toLocaleString("sv");
    const snapshotName = prompt("Enter snapshot name", defaultName);
    if (snapshotName) {
      saveSnapshot(snapshotName, view2.state.doc.toJSON());
    }
  }
  function handleImportSnapshot() {
    fileinput.click();
  }
  function handlePasteSnapshot() {
    $$invalidate(5, modalOpen = !modalOpen);
  }
  function handleCloseModal() {
    $$invalidate(5, modalOpen = false);
  }
  function handlePasteSubmit(e) {
    const snap = saveSnapshot((/* @__PURE__ */ new Date()).toLocaleString("sv"), e.detail.doc);
    restoreSnapshot(view2, snap);
    $$invalidate(5, modalOpen = false);
  }
  function handleFileSelected(e) {
    Array.from(e.currentTarget.files || []).forEach((file) => {
      const reader = new FileReader();
      reader.readAsText(file);
      reader.onload = (e2) => {
        var _a, _b;
        const data = typeof ((_a = e2.target) === null || _a === void 0 ? void 0 : _a.result) === "string" ? (_b = e2.target) === null || _b === void 0 ? void 0 : _b.result : "";
        try {
          const json = JSON.parse(data);
          if (!json || typeof json !== "object") {
            throw Error("Imported snapshot was not a JSON object" + json);
          }
          const name = file.name.slice(0, file.name.lastIndexOf("."));
          importSnapshot(name, json, view2.state.schema);
        } catch (err) {
          console.error("Failed to import snapshot: " + err);
        }
      };
    });
  }
  function handleClickTab(tab) {
    $$invalidate(1, openTab = tab);
  }
  function input_binding($$value) {
    binding_callbacks[$$value ? "unshift" : "push"](() => {
      fileinput = $$value;
      $$invalidate(4, fileinput);
    });
  }
  $$self.$$set = ($$props2) => {
    if ("onClose" in $$props2) $$invalidate(0, onClose = $$props2.onClose);
  };
  return [onClose, openTab, dockTop, dockHeight, fileinput, modalOpen, handleResizeMouseDown, handleCopyDoc, handleSaveSnapshot, handleImportSnapshot, handlePasteSnapshot, handleCloseModal, handlePasteSubmit, handleFileSelected, handleClickTab, input_binding];
}
class FloatingDock extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$1, create_fragment$1, safe_not_equal, {
      onClose: 0
    }, add_css$1);
  }
}
function add_css(target) {
  append_styles(target, "svelte-pr6kw9", '.dev-tools.svelte-pr6kw9{font-family:var(--font-sans);font-size:var(--font-medium);font-weight:400;--font-sans:Helvetica Neue, Calibri Light, Roboto, sans-serif;--font-small:11px;--font-medium:13px;--font-large:16px;--height-tabs-menu:48px;--tree-view-font-family:"Helvetica Neue", "Calibri Light", Roboto, sans-serif;--tree-view-font-size:13px;--tree-view-left-indent:0.875em;--tree-view-line-height:1.1;--tree-view-key-margin-right:0.5em;--tree-view-base00:#363755;--tree-view-base01:#604d49;--tree-view-base02:#6d5a55;--tree-view-base03:#d1929b;--tree-view-base04:#b79f8d;--tree-view-base05:#f9f8f2;--tree-view-base06:#f7f4f1;--tree-view-base07:#faf8f5;--tree-view-base08:#fa3e7e;--tree-view-base09:#fd993c;--tree-view-base0A:#f6bf81;--tree-view-base0B:#b8e248;--tree-view-base0C:#b4efe4;--tree-view-base0D:#85d9ef;--tree-view-base0E:#be87ff;--tree-view-base0F:#d6724c}.dev-tools.svelte-pr6kw9 .svelte-tree-view *{box-sizing:border-box}.dev-tools.svelte-pr6kw9 .hidden{opacity:0;visibility:hidden}');
}
function create_else_block(ctx) {
  let floatingbtn;
  let current;
  floatingbtn = new FloatingBtn({
    props: {
      buttonPosition: (
        /*buttonPosition*/
        ctx[1]
      )
    }
  });
  floatingbtn.$on(
    "click",
    /*handleFloatingBtnClick*/
    ctx[2]
  );
  return {
    c() {
      create_component(floatingbtn.$$.fragment);
    },
    m(target, anchor) {
      mount_component(floatingbtn, target, anchor);
      current = true;
    },
    p(ctx2, dirty) {
      const floatingbtn_changes = {};
      if (dirty & /*buttonPosition*/
      2) floatingbtn_changes.buttonPosition = /*buttonPosition*/
      ctx2[1];
      floatingbtn.$set(floatingbtn_changes);
    },
    i(local) {
      if (current) return;
      transition_in(floatingbtn.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(floatingbtn.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      destroy_component(floatingbtn, detaching);
    }
  };
}
function create_if_block(ctx) {
  let floatingdock;
  let current;
  floatingdock = new FloatingDock({
    props: {
      onClose: (
        /*handleFloatingDockClose*/
        ctx[3]
      )
    }
  });
  return {
    c() {
      create_component(floatingdock.$$.fragment);
    },
    m(target, anchor) {
      mount_component(floatingdock, target, anchor);
      current = true;
    },
    p: noop,
    i(local) {
      if (current) return;
      transition_in(floatingdock.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(floatingdock.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      destroy_component(floatingdock, detaching);
    }
  };
}
function create_fragment(ctx) {
  let section;
  let current_block_type_index;
  let if_block;
  let current;
  const if_block_creators = [create_if_block, create_else_block];
  const if_blocks = [];
  function select_block_type(ctx2, dirty) {
    if (
      /*devToolsExpanded*/
      ctx2[0]
    ) return 0;
    return 1;
  }
  current_block_type_index = select_block_type(ctx);
  if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
  return {
    c() {
      section = element("section");
      if_block.c();
      attr(section, "class", "dev-tools svelte-pr6kw9");
    },
    m(target, anchor) {
      insert(target, section, anchor);
      if_blocks[current_block_type_index].m(section, null);
      current = true;
    },
    p(ctx2, _ref) {
      let [dirty] = _ref;
      let previous_block_index = current_block_type_index;
      current_block_type_index = select_block_type(ctx2);
      if (current_block_type_index === previous_block_index) {
        if_blocks[current_block_type_index].p(ctx2, dirty);
      } else {
        group_outros();
        transition_out(if_blocks[previous_block_index], 1, 1, () => {
          if_blocks[previous_block_index] = null;
        });
        check_outros();
        if_block = if_blocks[current_block_type_index];
        if (!if_block) {
          if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx2);
          if_block.c();
        } else {
          if_block.p(ctx2, dirty);
        }
        transition_in(if_block, 1);
        if_block.m(section, null);
      }
    },
    i(local) {
      if (current) return;
      transition_in(if_block);
      current = true;
    },
    o(local) {
      transition_out(if_block);
      current = false;
    },
    d(detaching) {
      if (detaching) {
        detach(section);
      }
      if_blocks[current_block_type_index].d();
    }
  };
}
function instance($$self, $$props, $$invalidate) {
  let {
    view: view2,
    devToolsExpanded = false,
    buttonPosition = "bottom-right"
  } = $$props;
  setContext("editor-view", {
    view: view2,
    execCmd(cmd) {
      cmd(view2.state, view2.dispatch);
    },
    replaceEditorContent(state2) {
      const tr = view2.state.tr;
      tr.replaceWith(0, view2.state.doc.nodeSize - 2, state2.doc.content);
      view2.dispatch(tr);
    }
  });
  onMount(() => {
    const html2 = document && document.querySelector("html");
    if (devToolsExpanded && html2) {
      html2.style.paddingBottom = "341px";
    }
  });
  function handleFloatingBtnClick() {
    $$invalidate(0, devToolsExpanded = true);
    const html2 = document && document.querySelector("html");
    if (html2) {
      html2.style.paddingBottom = "341px";
    }
  }
  function handleFloatingDockClose() {
    $$invalidate(0, devToolsExpanded = false);
    const html2 = document && document.querySelector("html");
    if (html2) {
      html2.style.paddingBottom = "";
    }
  }
  $$self.$$set = ($$props2) => {
    if ("view" in $$props2) $$invalidate(4, view2 = $$props2.view);
    if ("devToolsExpanded" in $$props2) $$invalidate(0, devToolsExpanded = $$props2.devToolsExpanded);
    if ("buttonPosition" in $$props2) $$invalidate(1, buttonPosition = $$props2.buttonPosition);
  };
  return [devToolsExpanded, buttonPosition, handleFloatingBtnClick, handleFloatingDockClose, view2];
}
class DevTools extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance, create_fragment, safe_not_equal, {
      view: 4,
      devToolsExpanded: 0,
      buttonPosition: 1
    }, add_css);
  }
}
let active = false, resetDispatch = void 0;
const handleDispatch = (view2, oldDispatchFn) => (tr) => {
  const stateBeforeDispatch = view2.state;
  const applied = view2.state.applyTransaction(tr);
  if (oldDispatchFn) {
    const oldFn = view2.state.applyTransaction.bind(view2.state);
    view2.state.applyTransaction = function(trr) {
      if (trr !== tr) {
        view2.state.applyTransaction = oldFn;
        return Reflect.apply(oldFn, view2.state, arguments);
      }
      return applied;
    };
    oldDispatchFn(tr);
  } else {
    view2.updateState(applied.state);
  }
  if (active && applied.transactions.length > 0) {
    appendNewHistoryEntry(applied.transactions, view2.state, stateBeforeDispatch);
  }
};
function subscribeToDispatchTransaction(view2) {
  var _a;
  active = true;
  const oldDispatchFn = (_a = (view2.props || view2._props).dispatchTransaction) === null || _a === void 0 ? void 0 : _a.bind(view2);
  view2.setProps({
    dispatchTransaction: handleDispatch(view2, oldDispatchFn)
  });
  resetDispatch = () => view2.setProps({ dispatchTransaction: oldDispatchFn });
}
function unsubscribeDispatchTransaction() {
  active = false;
  resetDispatch && resetDispatch();
  resetDispatch = void 0;
}
const DEVTOOLS_CSS_CLASS = "__prosemirror-dev-toolkit__";
function createOrFindPlace() {
  let place = document.querySelector(`.${DEVTOOLS_CSS_CLASS}`);
  if (!place) {
    place = document.createElement("div");
    place.className = DEVTOOLS_CSS_CLASS;
    document.body.appendChild(place);
  }
  return place;
}
class ProseMirrorDevToolkit extends HTMLElement {
  constructor() {
    super();
    const shadowRoot = this.attachShadow({ mode: "open" });
    this.addEventListener("init-dev-toolkit", (event) => {
      const { detail: { view: view2, opts } } = event;
      this.component = new DevTools({
        target: shadowRoot,
        props: Object.assign({ view: view2 }, opts)
      });
    });
  }
  disconnectedCallback() {
    var _a;
    (_a = this.component) === null || _a === void 0 ? void 0 : _a.$destroy();
  }
}
if (!customElements.get("prosemirror-dev-toolkit")) {
  customElements.define("prosemirror-dev-toolkit", ProseMirrorDevToolkit);
}
if (typeof window !== "undefined")
  window.applyDevTools = applyDevTools;
let removeCallback;
function applyDevTools(view2, opts = {}) {
  const place = createOrFindPlace();
  removeDevTools();
  if (view2.isDestroyed)
    return;
  let comp;
  const { disableWebComponent } = opts, filteredOpts = __rest(opts, ["disableWebComponent"]);
  if (disableWebComponent) {
    comp = new DevTools({
      target: place,
      props: Object.assign({ view: view2 }, filteredOpts)
    });
  } else {
    const newTools = document.createElement("prosemirror-dev-toolkit");
    newTools.dispatchEvent(new CustomEvent("init-dev-toolkit", {
      detail: { view: view2, opts: filteredOpts }
    }));
    place.appendChild(newTools);
  }
  if (typeof window !== "undefined") {
    window.editorView = view2;
    window.pmCmd = (cmd) => {
      const state2 = view2.state;
      return cmd(state2, view2.dispatch, view2);
    };
  }
  const oldDestroyFn = view2.destroy.bind(view2);
  view2.destroy = () => {
    removeDevTools();
    oldDestroyFn();
  };
  subscribeToDispatchTransaction(view2);
  removeCallback = () => {
    resetHistory();
    unsubscribeDispatchTransaction();
    comp === null || comp === void 0 ? void 0 : comp.$destroy();
    const el = place.firstChild;
    el && place.removeChild(el);
  };
}
function removeDevTools() {
  removeCallback && removeCallback();
  removeCallback = void 0;
}
const defaultDoc = {
  type: "doc",
  content: [
    {
      type: "bullet_list",
      content: [
        {
          type: "list_item",
          content: [
            {
              type: "paragraph",
              attrs: {
                id: "id1"
              },
              content: [
                {
                  type: "text",
                  text: "one"
                }
              ]
            }
          ]
        },
        {
          type: "list_item",
          content: [
            {
              type: "paragraph",
              attrs: {
                id: "id2"
              },
              content: [
                {
                  type: "text",
                  text: "two"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};
const schema = new Schema({
  nodes: {
    doc: {
      content: "block+"
    },
    bullet_list: {
      group: "block",
      content: "list_item+",
      parseDOM: [{ tag: "ul" }],
      toDOM() {
        return ["ul", 0];
      }
    },
    list_item: {
      content: "paragraph+",
      parseDOM: [{ tag: "li" }],
      toDOM() {
        return ["li", 0];
      }
    },
    paragraph: {
      content: "inline*",
      group: "block",
      selectable: false,
      attrs: { id: { default: null } },
      parseDOM: [
        {
          tag: "p",
          getAttrs: (dom) => {
            if (dom instanceof HTMLElement) {
              return { id: dom.getAttribute("id") };
            }
            return null;
          }
        }
      ],
      toDOM(n) {
        return ["p", { id: n.attrs.id || "" }, 0];
      }
    },
    text: {
      group: "inline"
    }
  }
});
const state = EditorState.create({
  schema,
  plugins: [keymap({ Enter: splitListItem(schema.nodes.list_item) })],
  doc: schema.nodeFromJSON(defaultDoc)
});
const view = new EditorView(document.querySelector("#editor"), {
  state
});
applyDevTools(view);
