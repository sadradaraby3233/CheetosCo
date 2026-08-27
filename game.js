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

  let worldActive = false;
  let beaconInterval = null;
  
  function startGame() {
    SoundBank.fadeMusicAndStop(1.5);
    SoundBank.speak('Starting game.', 1.2, () => {
      MapEngine.load('reception').then(() => {
        MenuSystem.close();
        enterWorld();
      });
    }, true);
  }
  
  function enterWorld() {
    worldActive = true;
    document.removeEventListener('keydown', MenuSystem.handleKey);
    document.addEventListener('keydown', handleWorldKey);
    const map = MapEngine.getCurrent();
    if (map) {
      SoundBank.speak('Entered ' + map.name + '.', 1.2);
    } else {
      SoundBank.speak('Entered the world.', 1.2);
    }
  }

  function toggleTracking() {
    const target = MapEngine.getTarget();
    if (target) {
      stopBeacon();
      MapEngine.clearTarget();
      SoundBank.speak('Tracking cancelled.');
    } else {
      const objs = MapEngine.getTrackableObjects();
      if (objs.length === 0) {
        SoundBank.speak('Nothing to track.');
        return;
      }
      const items = objs.map(o => o.name);
      items.push('Cancel');
      MenuSystem.open({
        items: items,
        onSelect: (index) => {
          if (index === items.length - 1) {
            MenuSystem.back();
            return;
          }
          MapEngine.setTarget(objs[index].obj);
          MenuSystem.back();
          SoundBank.speak('Tracking ' + objs[index].name, 1.2);
          startBeacon();
        },
        onBack: () => {}
      });
    }
  }

  function startBeacon() {
    stopBeacon();
    beaconInterval = setInterval(() => {
      const target = MapEngine.getTarget();
      if (!target) { stopBeacon(); return; }
      SoundBank.beaconBeep();
    }, 600);
  }

  function stopBeacon() {
    if (beaconInterval) {
      clearInterval(beaconInterval);
      beaconInterval = null;
    }
  }

  function describeTarget() {
    const target = MapEngine.getTarget();
    if (!target) {
      SoundBank.speak('No target tracked.');
      return;
    }
    const dir = MapEngine.getTargetDirection();
    if (!dir) return;
    
    let dirStr = '';
    const absDiff = Math.abs(dir.diff);
    if (absDiff < 15) dirStr = 'straight in front';
    else if (absDiff < 45) dirStr = dir.diff > 0 ? 'in front and to the right' : 'in front and to the left';
    else if (absDiff < 75) dirStr = dir.diff > 0 ? 'slightly to the right' : 'slightly to the left';
    else if (absDiff < 105) dirStr = dir.diff > 0 ? 'directly to the right' : 'directly to the left';
    else if (absDiff < 135) dirStr = dir.diff > 0 ? 'behind and to the right' : 'behind and to the left';
    else dirStr = 'straight behind';
    
    let distStr = '';
    if (dir.dist < 2) distStr = ', very close';
    else if (dir.dist < 5) distStr = ', nearby';
    else if (dir.dist < 10) distStr = ', a short walk away';
    else distStr = ', far away';
    
    const name = target.props.name || target.props.id || target.type;
    SoundBank.speak(name + ', ' + dirStr + distStr, 1.2);
  }

  function handleWorldKey(e) {
    if (!worldActive) return;
    e.preventDefault();
    let moved = false;
    if (e.key === 'ArrowUp') moved = MapEngine.move(0, -0.5);
    else if (e.key === 'ArrowDown') moved = MapEngine.move(0, 0.5);
    else if (e.key === 'ArrowLeft') moved = MapEngine.move(-0.5, 0);
    else if (e.key === 'ArrowRight') moved = MapEngine.move(0.5, 0);
    else if (e.key === 'b') { MapEngine.readLocation(); return; }
    else if (e.key === 't') { toggleTracking(); return; }
    else if (e.key === 'w') { describeTarget(); return; }
    else if (e.key === 'Escape') {
      worldActive = false;
      stopBeacon();
      document.removeEventListener('keydown', handleWorldKey);
      document.addEventListener('keydown', MenuSystem.handleKey);
      SoundBank.speak('Exited to menu.', 1.2);
      openMainMenu();
      return;
    }
    
    if (moved) {
      SoundBank.step();
      if (MapEngine.checkArrival()) {
        const target = MapEngine.getTarget();
        const name = target.props.name || target.props.id || target.type;
        SoundBank.speak('Arrived at ' + name, 1.2);
        stopBeacon();
        MapEngine.clearTarget();
      }
    } else {
      SoundBank.playTone(120, 0.08, 'sawtooth', 0.2);
      SoundBank.playNoise(0.05, 0.1);
    }
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
    const options = ['Screen Reader', 'Browser TTS'];
    const values = ['sr', 'tts'];
    const currentMode = SoundBank.getSpeechMode();
    const currentIdx = values.indexOf(currentMode);

    const radioItem = {
      type: 'radio',
      label: 'Speech',
      options: options,
      currentValue: options[currentIdx],
      onChange: (newValue) => {
        const newVal = values[options.indexOf(newValue)];
        SoundBank.setSpeechMode(newVal);
      }
    };

    MenuSystem.open({
      items: [radioItem, 'Back'],
      onSelect: (index) => {
        if (index === 1) MenuSystem.back();
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
