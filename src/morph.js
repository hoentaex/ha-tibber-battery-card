// Updates a live DOM tree to match new markup instead of replacing it. Elements that stay keep their identity, so
// focus, hover, running animations, the dashboard's scroll position and the layout around the card are left alone;
// replacing the whole shadow root on every state change made the page jump (focus lost, card height briefly reset).

const sameKind = (a, b) =>
  a.nodeType === b.nodeType && (a.nodeType !== 1 || (a.namespaceURI === b.namespaceURI && a.nodeName === b.nodeName));

const syncAttributes = (from, to) => {
  for (const { name } of [...from.attributes]) if (!to.hasAttribute(name)) from.removeAttribute(name);
  for (const { name, value } of to.attributes) if (from.getAttribute(name) !== value) from.setAttribute(name, value);
  // Form state lives in properties, not attributes.
  if (from.nodeName === "INPUT" && from.value !== to.getAttribute("value") && to.hasAttribute("value"))
    from.value = to.getAttribute("value");
};

const morphNode = (from, to) => {
  if (from.nodeType === 3 || from.nodeType === 8) {
    if (from.nodeValue !== to.nodeValue) from.nodeValue = to.nodeValue;
    return;
  }
  syncAttributes(from, to);
  morphChildren(from, to);
};

// Children are matched by position and kind; a mismatch replaces just that node.
export const morphChildren = (parent, next) => {
  const want = [...next.childNodes];
  let cur = parent.firstChild;
  for (const node of want) {
    if (!cur) {
      parent.appendChild(node);
      continue;
    }
    if (sameKind(cur, node)) {
      morphNode(cur, node);
      cur = cur.nextSibling;
    } else {
      const after = cur.nextSibling;
      parent.replaceChild(node, cur);
      cur = after;
    }
  }
  while (cur) {
    const after = cur.nextSibling;
    parent.removeChild(cur);
    cur = after;
  }
};

// Renders `html` into `target`'s children, keeping every node that is still there.
export const morph = (target, html) => {
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  morphChildren(target, tpl.content);
};
