// CheetosCo — Map Engine
// Handles loading and parsing of .map files (3D Data-Driven)

const MapEngine = (() => {
  let currentMap = null;
  const player = { x: 10, y: 18, z: 0, radius: 0.4, facing: 0 };
  let trackedTarget = null;

  function parseVec(str) { return str.split(',').map(Number); }

  function parseMapText(text) {
    const lines = text.split('\n');
    const mapData = {
      name: '',
      minx: 0, miny: 0, minz: 0,
      maxx: 0, maxy: 0, maxz: 0,
      objects: [],
      zones: []
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
        const value = line.substring(colonIdx + 1).trim();

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
      const response = await fetch(`maps/${mapName}.map`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      currentMap = parseMapText(text);
    } catch (err) {
      console.warn('Map fetch failed, using fallback for ' + mapName, err);
      const fallback = `mapname:reception hallway\nminx:0\nminy:0\nminz:0\nmaxx:20\nmaxy:20\nmaxz:3\n
zone::0:0:0:20:10:100000:the south end of the hallway\nzone::0:10:0:20:20:100000:the northeast side of the hallway\n
object:wall\npos:0,0,0\nsize:20,1,3\nsolid:true\n
object:wall\npos:0,0,0\nsize:1,20,3\nsolid:true\n
object:wall\npos:19,0,0\nsize:1,20,3\nsolid:true\n
object:wall\npos:0,19,0\nsize:20,1,3\nsolid:true\n
object:furniture\npos:8,5,0\nsize:4,2,1\ntype:desk\nname:the reception desk\nsolid:true\n
object:stairs\npos:15,15,0\nsize:4,4,3\nname:the stairs\nz_to:3\n
object:door\npos:10,19,0\nsize:2,1,3\nname:the entrance doors\nsolid:true\ninteractive:true\n
object:npc\npos:9,6,0\nid:receptionist\nname:Cheetos Receptionist\ndialog:welcome_quest`;
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
      if (name) results.push({ name, obj });
    }
    return results;
  }

  function setTarget(obj) { trackedTarget = obj; }
  function getTarget() { return trackedTarget; }
  function clearTarget() { trackedTarget = null; }

  function getTargetDirection() {
    if (!trackedTarget) return null;
    const pos = trackedTarget.props.pos;
    if (!pos) return null;
    const size = trackedTarget.props.size || [0,0,0];
    const cx = pos[0] + size[0]/2;
    const cy = pos[1] + size[1]/2;
    const dx = cx - player.x;
    const dy = cy - player.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    
    let angle = Math.atan2(dx, -dy) * 180 / Math.PI;
    if (angle < 0) angle += 360;
    
    let diff = angle - player.facing;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    
    return { dist, diff, angle };
  }

  function checkArrival() {
    if (!trackedTarget) return false;
    const dir = getTargetDirection();
    return dir && dir.dist < 1.5;
  }

  function checkCollision(nx, ny, nz) {
    if (!currentMap) return true;
    if (nx - player.radius < currentMap.minx || nx + player.radius > currentMap.maxx ||
        ny - player.radius < currentMap.miny || ny + player.radius > currentMap.maxy) return true;

    for (const obj of currentMap.objects) {
      if (!obj.props.solid) continue;
      const pos = obj.props.pos;
      const size = obj.props.size;
      if (!pos || !size) continue;
      const ox = pos[0], oy = pos[1];
      const sx = size[0], sy = size[1];
      if (nx + player.radius > ox && nx - player.radius < ox + sx &&
          ny + player.radius > oy && ny - player.radius < oy + sy) {
        return true;
      }
    }
    return false;
  }

  function move(dx, dy) {
    const nx = player.x + dx;
    const ny = player.y + dy;
    if (!checkCollision(nx, ny, player.z)) {
      player.x = nx;
      player.y = ny;
      if (dy < 0) player.facing = 0;
      else if (dx > 0) player.facing = 90;
      else if (dy > 0) player.facing = 180;
      else if (dx < 0) player.facing = 270;
      return true;
    }
    return false;
  }

  return {
    load, getCurrent, getPlayer, move, readLocation,
    getTrackableObjects, setTarget, getTarget, clearTarget,
    getTargetDirection, checkArrival
  };
})();
