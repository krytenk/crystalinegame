/** Tiny DOM helpers. */

/** Optional UI tick (wired from main once AudioDirector exists). */
let uiTapHook: (() => void) | null = null;
export const setUiTapHook = (fn: (() => void) | null): void => {
  uiTapHook = fn;
};

export const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | boolean | undefined> = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (v === true) node.setAttribute(k, '');
    else if (k === 'class') node.className = v;
    else node.setAttribute(k, v);
  }
  for (const c of children) {
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
};

export const clear = (node: HTMLElement): void => {
  while (node.firstChild) node.removeChild(node.firstChild);
};

export const btn = (
  label: string | (Node | string)[],
  onClick: () => void,
  kind: 'primary' | 'secondary' | 'danger' | 'gold' = 'primary',
  disabled = false,
): HTMLButtonElement => {
  const cls =
    kind === 'primary'
      ? 'btn'
      : kind === 'danger'
        ? 'btn danger'
        : kind === 'gold'
          ? 'btn gold'
          : 'btn secondary';
  const kids = typeof label === 'string' ? [label] : label;
  const b = el('button', {
    class: cls,
    type: 'button',
    disabled: disabled ? true : undefined,
  }, kids) as HTMLButtonElement;
  b.addEventListener('click', (e) => {
    e.preventDefault();
    if (b.disabled) return;
    try {
      uiTapHook?.();
    } catch {
      /* ignore */
    }
    onClick();
  });
  return b;
};
