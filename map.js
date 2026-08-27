// CheetosCo — Map Engine
// Handles loading and parsing of .map files

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
        minx: 0,
        miny: 0,
        maxx: 0,
        maxy: 0,
        objects: []
      };

      for (let line of lines) {
        line = line.trim();
        if (!line || line.startsWith('#')) continue;
        
        const colonIdx = line.indexOf(':');
        if (colonIdx !== -1) {
          const key = line.substring(0, colonIdx).trim().toLowerCase();
          const value = line.substring(colonIdx + 1).trim();
          
          if (key === 'mapname') mapData.name = value;
          else if (key === 'minx') mapData.minx = parseInt(value, 10);
          else if (key === 'miny') mapData.miny = parseInt(value, 10);
          else if (key === 'maxx') mapData.maxx = parseInt(value, 10);
          else if (key === 'maxy') mapData.maxy = parseInt(value, 10);
        }
      }
      currentMap = mapData;
      return mapData;
    } catch (err) {
      console.error('Map load error:', err);
      return null;
    }
  }

  function getCurrent() {
    return currentMap;
  }

  return { load, getCurrent };
})();
