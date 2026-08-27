// CheetosCo — Map Engine
// Handles loading and parsing of .map files (3D Data-Driven)

const MapEngine = (() => {
  let currentMap = null;
  const player = { x: 10, y: 18, z: 0, radius: 0.4 };

  function parseMapText(text) {
    const lines = text.split('\n');
    const mapData = {
      name: '',
      minx: 0, miny: 0, minz: 0,
      maxx: 0, maxy: 0, maxz: 0,
      objects: []
    };
    let currentObj = null;
    const parseVec = (str) => str.split(',').map(Number);

    for (let rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      
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
object:wall
pos:0,0,0
size:20,1,3
solid:true
object:wall
pos:0,0,0
size:1,20,3
solid:true
object:wall
pos:19,0,0
size:1,20,3
solid:true
object:wall
pos:0,19,0
size:20,1,3
solid:true
object:furniture
pos:8,5,0
size:4,2,1
type:desk
solid:true
object:stairs
pos:15,15,0
size:4,4,3
z_to:3
object:door
pos:10,19,0
size:2,1,3
solid:true
interactive:true
object:npc
pos:9,6,0
id:receptionist
name:Cheetos Receptionist
dialog:welcome_quest`;
      currentMap = parseMapText(fallback);
    }
    return currentMap;
  }

  function getCurrent() { return currentMap; }
  function getPlayer() { return player; }

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
      return true;
    }
    return false;
  }

  return { load, getCurrent, getPlayer, move };
})();
