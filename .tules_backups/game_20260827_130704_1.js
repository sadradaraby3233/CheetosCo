// CheetosCo — Main Game

const Game = (() => {
  function init() {
    SoundBank.speak('Cheetos Company. Press Enter to begin.', 1, () => {
      document.addEventListener('keydown', startOnEnter);
    });
  }

  function startOnEnter(e) {
    if (e.key === 'Enter') {
      document.removeEventListener('keydown', startOnEnter);
      SoundBank.getCtx();
      openMainMenu();
    }
  }

  function openMainMenu() {
    SoundBank.startMenuMusic();
    MenuSystem.open({
      items: ['Start Game', 'Load Game', 'Options', 'Exit'],
      onSelect: (index) => {
        switch (index) {
          case 0: startGame(); break;
          case 1: loadGame(); break;
          case 2: openOptions(); break;
          case 3: exitGame(); break;
        }
      },
      onBack: () => {}
    });
  }

  function startGame() {
    SoundBank.stopMenuMusic();
    SoundBank.speak('No game to start yet.');
  }

  function loadGame() {
    SoundBank.speak('No save file found.');
  }

  function openOptions() {
    SoundBank.stopMenuMusic();
    const isAndroid = /Android/i.test(navigator.userAgent);
    const items = ['General', 'Sound'];
    if (!isAndroid) items.push('Speech');
    items.push('Menu', 'Back');
  
    MenuSystem.open({
      items: items,
      onSelect: (index, item) => {
        const label = typeof item === 'string' ? item : item.label;
        if (label === 'Back') {
          MenuSystem.back();
          return;
        }
        SoundBank.speak(label + ' options.', 1.2, () => {
          if (label === 'Speech') {
            openSpeechOptions();
          } else {
            MenuSystem.open({
              items: ['Back'],
              onSelect: () => MenuSystem.back(),
              onBack: () => {}
            });
          }
        }, false);
      },
      onBack: () => {
        SoundBank.startMenuMusic();
      }
    });
  }

  function openSpeechOptions() {
    const isAndroid = /Android/i.test(navigator.userAgent);
    const currentMode = SoundBank.getSpeechMode();
  
    const options = [];
    if (!isAndroid) {
      options.push({ label: 'Screen Reader', value: 'sr' });
      options.push({ label: 'Browser TTS', value: 'tts' });
    }
  
    const items = options.map(o => ({
      label: o.label + (o.value === currentMode ? ' (On)' : ' (Off)'),
      value: o.value
    }));
    items.push('Back');
  
    MenuSystem.open({
      items: items,
      onSelect: (index, item) => {
        if (index === items.length - 1) {
          MenuSystem.back();
          return;
        }
        if (item.value) {
          SoundBank.setSpeechMode(item.value);
          const newLabel = item.label.replace(/ \((On|Off)\)/, '');
          SoundBank.speak('Speech mode set to ' + newLabel, 1.2, () => {
            const isAndroid = /Android/i.test(navigator.userAgent);
            const currentMode = SoundBank.getSpeechMode();
            const options = [];
            if (!isAndroid) {
              options.push({ label: 'Screen Reader', value: 'sr' });
              options.push({ label: 'Browser TTS', value: 'tts' });
            }
            const newItems = options.map(o => ({
              label: o.label + (o.value === currentMode ? ' (On)' : ' (Off)'),
              value: o.value
            }));
            newItems.push('Back');
            MenuSystem.replaceItems(newItems);
            MenuSystem.announce();
          }, false);
        }
      },
      onBack: () => {}
    });
  }
  
  function exitGame() {
    SoundBank.stopMenuMusic();
    SoundBank.speak('Goodbye!');
    MenuSystem.close();
  }

  return { init };
})();

window.addEventListener('DOMContentLoaded', () => Game.init());
