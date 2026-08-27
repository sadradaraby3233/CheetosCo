// CheetosCo — Audio Menu System
// Keyboard: Up/Down navigate, Enter select, Escape back, Space repeat, Home/End jump

const MenuSystem = (() => {
  let stack = []; // each entry: { items, index, onSelect, onBack }
  let hintTimer = null;

  function clearHintTimer() {
    if (hintTimer) {
      clearTimeout(hintTimer);
      hintTimer = null;
    }
  }

  function startHintTimer() {
    clearHintTimer();
    hintTimer = setTimeout(() => {
      SoundBank.speak('Press left and right arrow keys to change.', 1.2);
    }, 2000);
  }

  function current() {
    return stack.length > 0 ? stack[stack.length - 1] : null;
  }

  function announce() {
    const menu = current();
    if (!menu || menu.items.length === 0) {
      SoundBank.speak('Empty menu.');
      return;
    }
    clearHintTimer();
    const item = menu.items[menu.index];
    if (item && item.type === 'radio') {
      SoundBank.speak(item.label + ': ' + item.currentValue, 1.2);
      startHintTimer();
      return;
    }
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

  function navigateLeft() {
    const menu = current();
    if (!menu || menu.items.length === 0) return;
    const item = menu.items[menu.index];
    if (item && item.type === 'radio') {
      clearHintTimer();
      const idx = item.options.indexOf(item.currentValue);
      const newIdx = (idx - 1 + item.options.length) % item.options.length;
      item.currentValue = item.options[newIdx];
      SoundBank.menuMove();
      if (item.onChange) item.onChange(item.currentValue);
      SoundBank.speak(item.currentValue, 1.2);
    }
  }

  function navigateRight() {
    const menu = current();
    if (!menu || menu.items.length === 0) return;
    const item = menu.items[menu.index];
    if (item && item.type === 'radio') {
      clearHintTimer();
      const idx = item.options.indexOf(item.currentValue);
      const newIdx = (idx + 1) % item.options.length;
      item.currentValue = item.options[newIdx];
      SoundBank.menuMove();
      if (item.onChange) item.onChange(item.currentValue);
      SoundBank.speak(item.currentValue, 1.2);
    }
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
    const pos = (menu.index + 1) + ' of ' + menu.items.length;
    if (item && item.type === 'radio') {
      SoundBank.speak(item.label + ': ' + item.currentValue + ', ' + pos + '. Use left and right to change.', 1.2);
      return;
    }
    const label = typeof item === 'string' ? item : item.label;
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
    clearHintTimer();

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
      case 'ArrowLeft':
        e.preventDefault();
        navigateLeft();
        return true;
      case 'ArrowRight':
        e.preventDefault();
        navigateRight();
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

  // --- 2-finger touch swipe for Android radio buttons ---
  let twoFingerStartX = 0;
  let twoFingerLastX = 0;
  let isTwoFingerActive = false;

  document.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      isTwoFingerActive = true;
      twoFingerStartX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      twoFingerLastX = twoFingerStartX;
    }
  }, { passive: false });

  document.addEventListener('touchmove', (e) => {
    if (isTwoFingerActive && e.touches.length === 2) {
      twoFingerLastX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      e.preventDefault(); // Prevent Android back swipe gesture
    }
  }, { passive: false });

  document.addEventListener('touchend', (e) => {
    if (isTwoFingerActive) {
      const deltaX = twoFingerLastX - twoFingerStartX;
      const threshold = 50;
      
      if (Math.abs(deltaX) > threshold) {
        clearHintTimer();
        if (deltaX > 0) {
          navigateRight();
        } else {
          navigateLeft();
        }
      }
      
      if (e.touches.length < 2) {
        isTwoFingerActive = false;
      }
    }
  }, { passive: false });

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
