import os
import math

class MapEngine:
    def __init__(self, speech):
        self.speech = speech
        self.current_map = None
        self.player = {'x': 10, 'y': 18, 'z': 0, 'radius': 0.4}
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
        """Simple direction: no facing, just raw dx/dy relative to player.
        -y = in front (north), +y = behind (south)
        -x = left (west), +x = right (east)
        """
        tpos = self.get_target_position()
        if not tpos:
            return None

        dx = tpos['x'] - self.player['x']
        dy = tpos['y'] - self.player['y']
        dist = math.sqrt(dx * dx + dy * dy)

        # Angle: 0 = straight ahead (north/-y), clockwise positive
        # atan2(dx, -dy) gives 0 when target is directly ahead
        angle = math.degrees(math.atan2(dx, -dy))
        # angle is now -180..180 where:
        #   0 = straight ahead
        #   90 = directly right
        #   -90 = directly left
        #   180/-180 = directly behind

        # Pan: -1 = full left, 0 = center, 1 = full right
        pan = max(-1.0, min(1.0, angle / 90.0))

        return {
            'dist': dist,
            'angle': angle,
            'pan': pan,
            'dx': dx,
            'dy': dy
        }

    def is_target_ahead(self):
        """Returns True if target is roughly straight ahead (within 15 degrees)."""
        d = self.get_target_direction()
        if not d:
            return False
        return abs(d['angle']) < 15

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
            return True
        return False
