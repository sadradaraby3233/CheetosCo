import os
import math

class MapEngine:
    def __init__(self, speech):
        self.speech = speech
        self.current_map = None
        self.player = {'x': 10, 'y': 18, 'z': 0, 'radius': 0.4, 'facing': 0}
        self.tracked_target = None

    def load(self, map_name):
        path = os.path.join('maps', map_name + '.map')
        try:
            with open(path, 'r', encoding='utf-8') as f:
                text = f.read()
        except FileNotFoundError:
            self.speech.speak('Map not found: ' + map_name)
            return None
        self.current_map = self._parse(text)
        return self.current_map

    def _parse(self, text):
        lines = text.split('\n')
        map_data = {
            'name': '', 'minx': 0, 'miny': 0, 'minz': 0,
            'maxx': 0, 'maxy': 0, 'maxz': 0,
            'objects': [], 'zones': []
        }
        current_obj = None

        for raw_line in lines:
            line = raw_line.strip()
            if not line or line.startswith('#'):
                continue

            if line.lower().startswith('zone::'):
                parts = line[6:].split(':')
                if len(parts) >= 7:
                    map_data['zones'].append({
                        'minx': float(parts[0]), 'miny': float(parts[1]), 'minz': float(parts[2]),
                        'maxx': float(parts[3]), 'maxy': float(parts[4]), 'maxz': float(parts[5]),
                        'name': ':'.join(parts[6:])
                    })
                continue

            if line.lower().startswith('object:'):
                if current_obj:
                    map_data['objects'].append(current_obj)
                current_obj = {'type': line[7:].strip(), 'props': {}}
                continue

            colon_idx = line.find(':')
            if colon_idx != -1:
                key = line[:colon_idx].strip().lower()
                value = line[colon_idx + 1:].strip()

                if current_obj is not None:
                    if key in ('pos', 'size'):
                        current_obj['props'][key] = [float(v) for v in value.split(',')]
                    elif key in ('solid', 'interactive'):
                        current_obj['props'][key] = value.lower() == 'true'
                    else:
                        current_obj['props'][key] = value
                else:
                    if key == 'mapname':
                        map_data['name'] = value
                    elif key in ('minx', 'miny', 'minz', 'maxx', 'maxy', 'maxz'):
                        map_data[key] = float(value)

        if current_obj:
            map_data['objects'].append(current_obj)
        return map_data

    def get_zone_at(self, x, y, z):
        if not self.current_map:
            return None
        for zone in self.current_map['zones']:
            if (zone['minx'] <= x <= zone['maxx'] and
                zone['miny'] <= y <= zone['maxy'] and
                zone['minz'] <= z <= zone['maxz']):
                return zone
        return None

    def read_location(self):
        zone = self.get_zone_at(self.player['x'], self.player['y'], self.player['z'])
        if zone:
            self.speech.speak(zone['name'])
        else:
            self.speech.speak('You are in an unmarked area.')

    def get_trackable_objects(self):
        if not self.current_map:
            return []
        results = []
        for obj in self.current_map['objects']:
            if obj['type'] == 'wall':
                continue
            name = obj['props'].get('name') or obj['props'].get('id') or obj['type']
            if name:
                results.append({'name': name, 'obj': obj})
        return results

    def set_target(self, obj):
        self.tracked_target = obj

    def get_target(self):
        return self.tracked_target

    def clear_target(self):
        self.tracked_target = None

    def get_target_position(self):
        if not self.tracked_target:
            return None
        pos = self.tracked_target['props'].get('pos')
        if not pos:
            return None
        size = self.tracked_target['props'].get('size', [0, 0, 0])
        return {
            'x': pos[0] + size[0] / 2,
            'y': pos[1] + size[1] / 2,
            'z': pos[2] + size[2] / 2
        }

    def get_target_direction(self):
        """Calculate direction to target relative to player facing."""
        tpos = self.get_target_position()
        if not tpos:
            return None
        
        dx = tpos['x'] - self.player['x']
        dy = tpos['y'] - self.player['y']
        dist = math.sqrt(dx * dx + dy * dy)
        
        # Calculate absolute angle to target (0=N, 90=E, 180=S, 270=W)
        # atan2(dx, -dy) gives angle from north, clockwise positive
        angle_to_target = math.degrees(math.atan2(dx, -dy))
        if angle_to_target < 0:
            angle_to_target += 360
        
        # Calculate relative angle from player's facing direction
        relative = angle_to_target - self.player['facing']
        
        # Normalize to -180..180
        while relative > 180:
            relative -= 360
        while relative < -180:
            relative += 360
        
        return {
            'dist': dist,
            'relative': relative,
            'absolute': angle_to_target,
            'pan': relative / 90.0  # Convert to -2..2 range for panning
        }

    def check_arrival(self):
        if not self.tracked_target:
            return False
        d = self.get_target_direction()
        return d and d['dist'] < 1.5

    def check_collision(self, nx, ny, nz):
        if not self.current_map:
            return True
        r = self.player['radius']
        if (nx - r < self.current_map['minx'] or nx + r > self.current_map['maxx'] or
            ny - r < self.current_map['miny'] or ny + r > self.current_map['maxy']):
            return True

        for obj in self.current_map['objects']:
            if not obj['props'].get('solid'):
                continue
            pos = obj['props'].get('pos')
            size = obj['props'].get('size')
            if not pos or not size:
                continue
            ox, oy = pos[0], pos[1]
            sx, sy = size[0], size[1]
            if (nx + r > ox and nx - r < ox + sx and
                ny + r > oy and ny - r < oy + sy):
                return True
        return False

    def move(self, dx, dy):
        nx = self.player['x'] + dx
        ny = self.player['y'] + dy
        if not self.check_collision(nx, ny, self.player['z']):
            self.player['x'] = nx
            self.player['y'] = ny
            
            # Update facing based on movement direction
            if dy < 0:
                self.player['facing'] = 0      # North
            elif dx > 0:
                self.player['facing'] = 90     # East
            elif dy > 0:
                self.player['facing'] = 180    # South
            elif dx < 0:
                self.player['facing'] = 270    # West
            
            return True
        return False

    def get_player_facing_name(self):
        facing = self.player['facing']
        if facing == 0:
            return 'north'
        elif facing == 90:
            return 'east'
        elif facing == 180:
            return 'south'
        elif facing == 270:
            return 'west'
        return 'unknown'
