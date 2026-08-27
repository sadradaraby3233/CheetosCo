// CheetosCo — Main Game

const Game = (() => {
  let worldActive = false;
  let inTrackingMenu = false;
  let inDialog = false;
  let beaconInterval = null;
  let wasAhead = false;
  let lastZoneName = null;

  // --- Dialog System ---
  let dialogLines = [];
  let dialogIndex = 0;

  const DIALOGS = {
    welcome_quest: [
      'Oh, hello there! Welcome to Cheetos Company.',
      'I am the receptionist. We have been expecting you.',
      'The office is just down the hall. Feel free to look around!',
      'If you need anything, just come back and talk to me.'
    ]
  };

  function openDialog(dialogId) {
    const lines = DIALOGS[dialogId];
    if (!lines || lines.length === 0) return;
    inDialog = true;
    dialogLines = lines;
    dialogIndex = 0;
    SoundBank.dialogOpen();
    speakCurrentDialogLine();
  }

  function speakCurrentDialogLine() {
    if (dialogIndex < dialogLines.length) {
      SoundBank.speak(dialogLines[dialogIndex], 1.2);
    }
  }

  function advanceDialog() {
    dialogIndex++;
    if (dialogIndex < dialogLines.length) {
      speakCurrentDialogLine();
    } else {
      closeDialog();
    }
  }

  function repeatDialogLine() {
    speakCurrentDialogLine();
  }

  function closeDialog() {
    inDialog = false;
    dialogLines = [];
    dialogIndex = 0;
    SoundBank.dialogFinish();
  }

  function handleDialogKey(e) {
    if (!inDialog) return false;
    e.preventDefault();
    if (e.key === 'Enter') {
      advanceDialog();
      return true;
    }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' ||
        e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      repeatDialogLine();
      return true;
    }
    return false;
  }

  // --- Init ---
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
      onBack: () => { exitGame(); }
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
    inDialog = false;
    wasAhead = false;
    lastZoneName = null;
    document.removeEventListener('keydown', MenuSystem.handleKey);
    document.addEventListener('keydown', handleWorldKey);

    const player = MapEngine.getPlayer();
    SoundBank.updateListener(player.x, player.y, player.z);

    const map = MapEngine.getCurrent();
    if (map) {
      SoundBank.speak('Entered ' + map.name + '.', 1.2);
    } else {
      SoundBank.speak('Entered the world.', 1.2);
    }

    const zone = MapEngine.getZoneAt(player.x, player.y, player.z);
    if (zone) lastZoneName = zone.name;
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
      wasAhead = false;
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
        onBack: () => { exitTrackingMenu(); }
      });
    }
  }

  function startBeacon() {
    stopBeacon();
    beaconInterval = setInterval(() => {
      const target = MapEngine.getTarget();
      if (!target) { stopBeacon(); return; }

      // Stop beacon when in interaction range
      if (MapEngine.isInInteractionRange()) {
        stopBeacon();
        const name = target.props.name || target.props.id || target.type;
        SoundBank.speak('You have reached ' + name + '.', 1.2);

        // If it's an NPC with a dialog, open it
        if (target.type === 'npc' && target.props.dialog) {
          MapEngine.clearTarget();
          wasAhead = false;
          openDialog(target.props.dialog);
        } else {
          MapEngine.clearTarget();
          wasAhead = false;
        }
        return;
      }

      const tPos = MapEngine.getTargetPosition();
      SoundBank.beaconBeep(tPos);

      const isAhead = MapEngine.isTargetAhead();
      if (isAhead && !wasAhead) {
        SoundBank.lockOn();
      }
      wasAhead = isAhead;
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
    const d = MapEngine.getTargetDirection();
    if (!d) return;

    let distStr = '';
    if (d.dist < 2) distStr = ', very close';
    else if (d.dist < 5) distStr = ', nearby';
    else if (d.dist < 10) distStr = ', a short walk away';
    else distStr = ', far away';

    const name = target.props.name || target.props.id || target.type;
    SoundBank.speak(name + ', ' + d.dirStr + distStr, 1.2);
  }

  function handleWorldKey(e) {
    if (!worldActive || inTrackingMenu) return;

    // Dialog takes priority and pauses the game
    if (inDialog) {
      handleDialogKey(e);
      return;
    }

    e.preventDefault();

    if (e.key === 'b') { MapEngine.readLocation(); return; }
    if (e.key === 't') { toggleTracking(); return; }
    if (e.key === 'w') { describeTarget(); return; }
    if (e.key === 'Escape') {
      worldActive = false;
      stopBeacon();
      MapEngine.clearTarget();
      wasAhead = false;
      document.removeEventListener('keydown', handleWorldKey);
      document.addEventListener('keydown', MenuSystem.handleKey);
      SoundBank.speak('Exited to menu.', 1.2);
      openMainMenu();
      return;
    }

    // Movement
    let moved = false;
    let hitObject = null;
    let dx = 0, dy = 0;

    if (e.key === 'ArrowUp') { dy = -0.5; }
    else if (e.key === 'ArrowDown') { dy = 0.5; }
    else if (e.key === 'ArrowLeft') { dx = -0.5; }
    else if (e.key === 'ArrowRight') { dx = 0.5; }
    else return;

    const result = MapEngine.move(dx, dy);
    moved = result.moved;
    hitObject = result.hitObject;

    if (moved) {
      SoundBank.step();

      // Auto-announce zone changes
      const player = MapEngine.getPlayer();
      const zone = MapEngine.getZoneAt(player.x, player.y, player.z);
      if (zone && zone.name !== lastZoneName) {
        lastZoneName = zone.name;
        SoundBank.speak(zone.name, 1.2);
      }

      // Check if we've reached the tracked target
      if (MapEngine.getTarget() && MapEngine.isInInteractionRange()) {
        const target = MapEngine.getTarget();
        const name = target.props.name || target.props.id || target.type;
        SoundBank.speak('You have reached ' + name + '.', 1.2);
        stopBeacon();

        if (target.type === 'npc' && target.props.dialog) {
          MapEngine.clearTarget();
          wasAhead = false;
          openDialog(target.props.dialog);
        } else {
          MapEngine.clearTarget();
          wasAhead = false;
        }
      }
    } else {
      // Bumped into something
      if (hitObject && hitObject.type === 'npc') {
        const name = hitObject.props.name || hitObject.props.id || 'someone';
        SoundBank.speak('You bump into ' + name + '.', 1.2);
        if (hitObject.props.dialog) {
          openDialog(hitObject.props.dialog);
        }
      } else {
        SoundBank.playTone(120, 0.08, 'sawtooth', 0.2);
        SoundBank.playNoise(0.05, 0.1);
      }
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
      onBack: () => { SoundBank.startMenuMusic(); }
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
    window.close();
  }

  return { init };
})();

window.addEventListener('DOMContentLoaded', () => Game.init());
