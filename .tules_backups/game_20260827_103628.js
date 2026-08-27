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
    MenuSystem.open({
      items: ['General', 'Sound', 'Speech', 'Menu', 'Back'],
      onSelect: (index, item) => {
        if (index === 4) {
          MenuSystem.back();
          return;
        }
        const label = typeof item === 'string' ? item : item.label;
        MenuSystem.open({
          items: ['Back'],
          onSelect: () => MenuSystem.back(),
          onBack: () => {}
        });
        SoundBank.speak(label + ' options. Nothing here yet.');
      },
      onBack: () => {
        SoundBank.startMenuMusic();
      }
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
