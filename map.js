// CheetosCo — Map Engine (3D Data-Driven)

const MapEngine = (() => {
  let currentMap = null;
  const player = { x: 10, y: 18, z: 0, radius: 0.4 };
  let trackedTarget = null;

  function parseVec(str) { return str.split(',').map(Number); }

  function parseMapText(text) {
    const lines = text.split('\n');
    const mapData = {
      name: '', minx: 0, miny: 0, minz: 0,
      maxx: 0, maxy: 0, maxz: 0,
      objects: [], zones: []
    };
    let currentObj = null;

    for (let rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;

      if (line.toLowerCase().startsWith('zone::')) {
        const parts = line.substring(6).split(':');
        if (parts.length >= 7) {
          mapData.zones.push({
            minx: parseFloat(parts[0]), miny: parseFloat(parts[1]), minz: parseFloat(parts[2]),
            maxx: parseFloat(parts[3]), maxy: parseFloat(parts[4]), maxz: parseFloat(parts[5]),
            name: parts.slice(6).join(':')
          });
        }
        continue;
      }

      if (line.toLowerCase().startsWith('object:')) {
        if (currentObj) mapData.objects.push(currentObj);
        currentObj = { type: line.substring(7).trim(), props: {} };
        continue;
      }

      const colonIdx = line.indexOf(':');
      if (colonIdx !== -1) {
        const key = line.substring(0, colonIdx).trim().toLowerCase();
        const value = line.substring(colonIdx + 1:].trim();
        if (currentObj) {
          if (key === 'pos' || key === 'size') currentObj.props[key] = parseVec(value);
          else if (key === 'solid' || key === 'interactive') currentObj.props[key] = value.toLowerCase() === 'true';
          else currentObj.props[key] = value;
        } else {
          if (key === 'mapname') mapData.name = value;
          else if (key === 'minx') mapData.minx = parseFloat(value);
          else if (key === 'miny') mapData.miny = parseFloat(value);
          else if (key === 'minz') mapData.minz = parseFloat(value);
          else if (key === 'maxx') mapData.maxx = parseFloat(value);
          else if (key === 'maxy') mapData.maxy = parseFloat(value);
          else if (key === 'maxz') mapData.maxz = parseFloat(value);
        }
      }
    }
    if (currentObj) mapData.objects.push(currentObj);
    return mapData;
  }

  async function load(mapName) {
    try {
      if (window.location.protocol === 'file:') throw new Error('Local file protocol');
      const response = await fetch('maps/' + mapName + '.map');
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const text = await response.text();
      currentMap = parseMapText(text);
    } catch (err) {
      console.warn('Map fetch failed, using fallback for ' + mapName, err);
      const fallback = 'mapname:reception hallway\nminx:0\nminy:0\nminz:0\nmaxx:20\nmaxy:20\nmaxz:3\n\nzone::0:0:0:20:10:100000:the north end of the hallway\nzone::0:10:0:20:20:100000:the south end of the hallway\n\nobject:wall\npos:0,0,0\nsize:20,1,3\nsolid:true\n\nobject:wall\npos:0,0,0\nsize:1,20,3\nsolid:true\n\nobject:wall\npos:19,0,0\nsize:1,20,3\nsolid:true\n\nobject:wall\npos:0,19,0\nsize:20,1,3\nsolid:true\n\nobject:furniture\npos:5,4,0\nsize:4,2,1\ntype:desk\nname:the reception desk\nsolid:true\n\nobject:stairs\npos:15,15,0\nsize:4,4,3\nname:the stairs\nz_to:3\n\nobject:door\npos:10,19,0\nsize:2,1,3\nname:the entrance doors\nsolid:true\ninteractive:true\n\nobject:npc\npos:7,7,0\nid:receptionist\nname:Cheetos Receptionist\ndialog:welcome_quest\nsolid:true';
      currentMap = parseMapText(fallback);
    }
    return currentMap;
  }

  function getCurrent() { return currentMap; }
  function getPlayer() { return player; }

  function getZoneAt(x, y, z) {
    if (!currentMap) return null;
    for (const zone of currentMap.zones) {
      if (x >= zone.minx && x <= zone.maxx &&
          y >= zone.miny && y <= zone.maxy &&
          z >= zone.minz && z <= zone.maxz) {
        return zone;
      }
    }
    return null;
  }

  function readLocation() {
    const zone = getZoneAt(player.x, player.y, player.z);
    if (zone) SoundBank.speak(zone.name, 1.2);
    else SoundBank.speak('You are in an unmarked area.', 1.2);
  }

  function getTrackableObjects() {
    if (!currentMap) return [];
    const results = [];
    for (const obj of currentMap.objects) {
      if (obj.type === 'wall') continue;
      const name = obj.props.name || obj.props.id || obj.type;
      if (name) results.push({ name: name, obj: obj });
    }
    return results;
  }

  function setTarget(obj) { trackedTarget = obj; }
  function getTarget() { return trackedTarget; }
  function clearTarget() { trackedTarget = null; }

  function getTargetPosition() {
    if (!trackedTarget) return null;
    const pos = trackedTarget.props.pos;
    if (!pos) return null;
    const size = trackedTarget.props.size || [0, 0, 0];
    return {
      x: pos[0] + size[0] / 2,
      y: pos[1] + size[1] / 2,
      z: pos[2] + size[2] / 2
    };
  }

  function getTargetDirection() {
    const tpos = getTargetPosition();
    if (!tpos) return null;

    const dx = tpos.x - player.x;
    const dy = tpos.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    let aheadBehind = '';
    let leftRight = '';

    if (dy < -0.3) aheadBehind = 'in front';
    else if (dy > 0.3) aheadBehind = 'behind';

    if (dx > 0.3) leftRight = 'to the right';
    else if (dx < -0.3) leftRight = 'to the left';

    let dirStr;
    if (aheadBehind && leftRight) {
      if (Math.abs(dx) < Math.abs(dy) * 0.4) {
        dirStr = aheadBehind + ' and slightly ' + leftRight;
      } else if (Math.abs(dy) < Math.abs(dx) * 0.4) {
        dirStr = leftRight + ' and slightly ' + aheadBehind;
      } else {
        dirStr = aheadBehind + ' and ' + leftRight;
      }
    } else if (aheadBehind) {
      if (Math.abs(dx) > 0.1) {
        const side = dx > 0 ? 'right' : 'left';
        dirStr = aheadBehind + ' and very slightly to the ' + side;
      } else {
        dirStr = 'straight ' + aheadBehind;
      }
    } else if (leftRight) {
      if (Math.abs(dy) > 0.1) {
        const fb = dy < 0 ? 'in front' : 'behind';
        dirStr = leftRight + ' and very slightly ' + fb;
      } else {
        dirStr = 'directly ' + leftRight;
      }
    } else {
      dirStr = 'right next to you';
    }

    return { dist: dist, dx: dx, dy: dy, dirStr: dirStr };
  }

  function isTargetAhead() {
    const d = getTargetDirection();
    if (!d) return false;
    return d.dy < -0.5 && Math.abs(d.dx) < Math.max(2.0, Math.abs(d.dy) * 0.3);
  }

  // Interaction range: close enough to interact
  function isInInteractionRange() {
    if (!trackedTarget) return false;
    const d = getTargetDirection();
    return d && d.dist < 2.0;
  }

  function checkArrival() {
    return isInInteractionRange();
  }

  // Returns the object that blocks movement, or null
  function getCollidingObject(nx, ny, nz) {
    if (!currentMap) return null;
    const r = player.radius;

    for (const obj of currentMap.objects) {
      // NPCs are always solid
      const isSolid = obj.props.solid === true || obj.type === 'npc';
      if (!isSolid) continue;
      const pos = obj.props.pos;
      const size = obj.props.size;
      if (!pos || !size) continue;
      const ox = pos[0], oy = pos[1];
      const sx = size[0], sy = size[1];
      if (nx + r > ox && nx - r < ox + sx &&
          ny + r > oy && ny - r < oy + sy) {
        return obj;
      }
    }
    return null;
  }

  function checkCollision(nx, ny, nz) {
    if (!currentMap) return true;
    const r = player.radius;
    if (nx - r < currentMap.minx || nx + r > currentMap.maxx ||
        ny - r < currentMap.miny || ny + r > currentMap.maxy) return true;
    return getCollidingObject(nx, ny, nz) !== null;
  }

  // move returns {moved: bool, hitObject: obj|null}
  function move(dx, dy) {
    const nx = player.x + dx;
    const ny = player.y + dy;
    const hitObj = getCollidingObject(nx, ny, player.z);

    if (!checkCollision(nx, ny, player.z)) {
      player.x = nx;
      player.y = ny;
      SoundBank.updateListener(player.x, player.y, player.z);
      return { moved: true, hitObject: null };
    }
    return { moved: false, hitObject: hitObj };
  }

  return {
    load, getCurrent, getPlayer, move, readLocation,
    getTrackableObjects, setTarget, getTarget, clearTarget,
    getTargetDirection, getTargetPosition, isTargetAhead,
    checkArrival, isInInteractionRange, getCollidingObject
  };
})();
