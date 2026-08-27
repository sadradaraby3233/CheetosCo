// CheetosCo — Main Game

const Game = (() => {
  let worldActive = false;
  let inTrackingMenu = false;
  let beaconInterval = null;

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
    inTrackingMenu = false;
    document.removeEventListener('keydown', MenuSystem.handleKey);
    document.addEventListener('keydown', handleWorldKey);
    
    const player = MapEngine.getPlayer();
    SoundBank.updateListener(player.x, player.y, player.z, player.facing);
    
    const map = MapEngine.getCurrent();
    if (map) {
      SoundBank.speak('Entered ' + map.name + '.', 1.2);
    } else {
      SoundBank.speak('Entered the world.', 1.2);
    }
  }

  function exitTrackingMenu() {
    inTrackingMenu = false;
    MenuSystem.close();
    enterWorld();
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
      
      inTrackingMenu = true;
      worldActive = false;
      document.removeEventListener('keydown', handleWorldKey);
      document.addEventListener('keydown', MenuSystem.handleKey);
      
      const items = objs.map(o => o.name);
      items.push('Cancel');
      MenuSystem.open({
        items: items,
        onSelect: (index) => {
          if (index === items.length - 1) {
            exitTrackingMenu();
            return;
          }
          MapEngine.setTarget(objs[index].obj);
          SoundBank.speak('Tracking ' + objs[index].name, 1.2);
          startBeacon();
          exitTrackingMenu();
        },
        onBack: () => {
          exitTrackingMenu();
        }
      });
    }
  }

  function startBeacon() {
    stopBeacon();
    beaconInterval = setInterval(() => {
      const target = MapEngine.getTarget();
      if (!target) { stopBeacon(); return; }
      const tPos = MapEngine.getTargetPosition();
      SoundBank.beaconBeep(tPos);
    }, 700);
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
    const absAngle = Math.abs(dir.relativeAngle);
    
    if (absAngle < 20) {
      dirStr = 'straight ahead';
    } else if (absAngle < 60) {
      dirStr = dir.relativeAngle > 0 ? 'ahead and to the right' : 'ahead and to the left';
    } else if (absAngle < 110) {
      dirStr = dir.relativeAngle > 0 ? 'to your right' : 'to your left';
    } else if (absAngle < 150) {
      dirStr = dir.relativeAngle > 0 ? 'behind and to the right' : 'behind and to the left';
    } else {
      dirStr = 'directly behind you';
    }
    
    let distStr = '';
    if (dir.dist < 2) distStr = ', very close';
    else if (dir.dist < 5) distStr = ', nearby';
    else if (dir.dist < 10) distStr = ', a short walk away';
    else distStr = ', far away';
    
    const name = target.props.name || target.props.id || target.type;
    SoundBank.speak(name + ', ' + dirStr + distStr, 1.2);
  }

  function handleWorldKey(e) {
    if (!worldActive || inTrackingMenu) return;
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
      MapEngine.clearTarget();
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
