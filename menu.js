// CheetosCo — Audio Menu System
// Keyboard: Up/Down navigate, Enter select, Escape back, Space repeat, Home/End jump

const MenuSystem = (() => {
  let stack = []; // each entry: { items, index, onSelect, onBack }

  function current() {
    return stack.length > 0 ? stack[stack.length - 1] : null;
  }

  function announce() {
    const menu = current();
    if (!menu || menu.items.length === 0) {
      SoundBank.speak('Empty menu.');
      return;
    }
    const item = menu.items[menu.index];
    const label = typeof item === 'string' ? item : item.label;
    SoundBank.speak(label, 1.2);
  }

  function navigateUp() {
    const menu = current();
    if (!menu || menu.items.length === 0) return;
    menu.index = (menu.index - 1 + menu.items.length) % menu.items.length;
    SoundBank.menuMove();
    announce();
  }

  function navigateDown() {
    const menu = current();
    if (!menu || menu.items.length === 0) return;
    menu.index = (menu.index + 1) % menu.items.length;
    SoundBank.menuMove();
    announce();
  }

  function goToTop() {
    const menu = current();
    if (!menu || menu.items.length === 0) return;
    menu.index = 0;
    SoundBank.menuMove();
    announce();
  }

  function goToBottom() {
    const menu = current();
    if (!menu || menu.items.length === 0) return;
    menu.index = menu.items.length - 1;
    SoundBank.menuMove();
    announce();
  }

  function select() {
    const menu = current();
    if (!menu || menu.items.length === 0) return;
    SoundBank.menuSelect();
    if (menu.onSelect) {
      menu.onSelect(menu.index, menu.items[menu.index]);
    }
  }

  function back() {
    const menu = current();
    if (!menu) return;
    if (stack.length === 1) {
      SoundBank.error();
      SoundBank.speak('Cannot go back further.');
      return;
    }
    SoundBank.menuBack();
    stack.pop();
    if (menu.onBack) menu.onBack();
    if (current()) announce();
  }

  function repeat() {
    const menu = current();
    if (!menu || menu.items.length === 0) return;
    const item = menu.items[menu.index];
    const label = typeof item === 'string' ? item : item.label;
    const pos = (menu.index + 1) + ' of ' + menu.items.length;
    SoundBank.speak(label + ', ' + pos, 1.2);
  }

  function open(config) {
    stack.push({
      items: config.items || [],
      index: config.startIndex || 0,
      onSelect: config.onSelect || null,
      onBack: config.onBack || null
    });
    SoundBank.menuOpen();
    announce();
  }

  function close() {
    if (stack.length === 0) return;
    stack.length = 0;
    SoundBank.menuClose();
  }

  function isOpen() {
    return stack.length > 0;
  }

  function replaceItems(items, startIndex) {
    const menu = current();
    if (!menu) return;
    menu.items = items;
    menu.index = startIndex || 0;
  }

  // --- Keyboard handler ---

  function handleKey(e) {
    if (!current()) return false;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        navigateUp();
        return true;
      case 'ArrowDown':
        e.preventDefault();
        navigateDown();
        return true;
      case 'Home':
        e.preventDefault();
        goToTop();
        return true;
      case 'End':
        e.preventDefault();
        goToBottom();
        return true;
      case 'Enter':
        e.preventDefault();
        select();
        return true;
      case 'Escape':
        e.preventDefault();
        back();
        return true;
      case ' ':
        e.preventDefault();
        repeat();
        return true;
      default:
        return false;
    }
  }

  document.addEventListener('keydown', handleKey);

  return {
    open,
    close,
    select,
    back,
    repeat,
    navigateUp,
    navigateDown,
    goToTop,
    goToBottom,
    announce,
    replaceItems,
    isOpen,
    current,
    handleKey
  };
})();
