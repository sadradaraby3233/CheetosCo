// CheetosCo — Map Engine
// Handles loading and parsing of .map files (3D Data-Driven)

const MapEngine = (() => {
  let currentMap = null;

  async function load(mapName) {
    try {
      const response = await fetch(`maps/${mapName}.map`);
      if (!response.ok) throw new Error(`Map not found: ${mapName}`);
      const text = await response.text();
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
        
        // Check for new object block
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
            if (key === 'pos' || key === 'size') {
              currentObj.props[key] = parseVec(value);
            } else if (key === 'solid' || key === 'interactive') {
              currentObj.props[key] = value.toLowerCase() === 'true';
            } else {
              currentObj.props[key] = value;
            }
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
      
      currentMap = mapData;
      return mapData;
    } catch (err) {
      console.error('Map load error:', err);
      return null;
    }
  }

  const player = { x: 10, y: 18, z: 0, radius: 0.4 };

  function getCurrent() { return currentMap; }
  function getPlayer() { return player; }

  function checkCollision(nx, ny, nz) {
    if (!currentMap) return true;
    if (nx < currentMap.minx || nx > currentMap.maxx || 
        ny < currentMap.miny || ny > currentMap.maxy) return true;
    
    for (const obj of currentMap.objects) {
      if (!obj.props.solid) continue;
      if (obj.props.z !== undefined && obj.props.z !== nz) continue;
      const pos = obj.props.pos;
      const size = obj.props.size;
      if (!pos || !size) continue;
      
      const ox = pos[0], oy = pos[1], oz = pos[2];
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
