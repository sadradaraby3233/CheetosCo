import pygame
from speech import Speech
from audio import Audio
from menu import MenuSystem
from map_engine import MapEngine

class Game:
    STATE_MAIN_MENU = 0
    STATE_WORLD = 1
    STATE_TRACKING_MENU = 2

    def __init__(self):
        self.speech = Speech()
        self.audio = Audio()
        self.menu = MenuSystem(self.speech, self.audio)
        self.map_engine = MapEngine(self.speech)
        self.state = self.STATE_MAIN_MENU
        self.beacon_timer = 0
        self.beacon_interval = 700  # ms
        self.running = True

    def start(self):
        self.speech.speak('Cheetos Company. Press Enter to begin.')
        self._wait_for_enter()
        self.open_main_menu()
        self._run_loop()

    def _wait_for_enter(self):
        waiting = True
        while waiting:
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    self.running = False
                    waiting = False
                elif event.type == pygame.KEYDOWN:
                    if event.key == pygame.K_RETURN:
                        waiting = False
            pygame.time.wait(10)

    def open_main_menu(self):
        self.state = self.STATE_MAIN_MENU
        self.menu.open(
            items=['Start Game', 'Load Game', 'Options', 'Exit'],
            on_select=self._main_menu_select,
            on_back=None
        )

    def _main_menu_select(self, index, item):
        if index == 0:
            self.start_game()
        elif index == 1:
            self.speech.speak('No save file found.')
        elif index == 2:
            self.open_options()
        elif index == 3:
            self.exit_game()

    def start_game(self):
        self.speech.speak('Starting game.')
        self.map_engine.load('reception')
        self.menu.close()
        self.enter_world()

    def enter_world(self):
        self.state = self.STATE_WORLD
        m = self.map_engine.current_map
        if m:
            self.speech.speak('Entered ' + m['name'] + '.')
        else:
            self.speech.speak('Entered the world.')

    def open_options(self):
        self.menu.open(
            items=['General', 'Sound', 'Back'],
            on_select=self._options_select,
            on_back=None
        )

    def _options_select(self, index, item):
        label = item if isinstance(item, str) else item.get('label', '')
        if label == 'Back':
            self.menu.back()
            return
        self.speech.speak(label + ' options. Nothing here yet.')
        self.menu.open(
            items=['Back'],
            on_select=lambda i, it: self.menu.back(),
            on_back=None
        )

    def toggle_tracking(self):
        target = self.map_engine.get_target()
        if target:
            self.map_engine.clear_target()
            self.speech.speak('Tracking cancelled.')
        else:
            objs = self.map_engine.get_trackable_objects()
            if not objs:
                self.speech.speak('Nothing to track.')
                return
            self.state = self.STATE_TRACKING_MENU
            items = [o['name'] for o in objs]
            items.append('Cancel')
            self.menu.open(
                items=items,
                on_select=lambda idx, it: self._tracking_select(idx, objs),
                on_back=self._exit_tracking_menu
            )

    def _tracking_select(self, index, objs):
        if index >= len(objs):
            self._exit_tracking_menu()
            return
        self.map_engine.set_target(objs[index]['obj'])
        self.speech.speak('Tracking ' + objs[index]['name'])
        self._exit_tracking_menu()

    def _exit_tracking_menu(self):
        self.menu.close()
        self.state = self.STATE_WORLD

    def describe_target(self):
        target = self.map_engine.get_target()
        if not target:
            self.speech.speak('No target tracked.')
            return
        d = self.map_engine.get_target_direction()
        if not d:
            return

        abs_angle = abs(d['relative'])
        if abs_angle < 20:
            dir_str = 'straight ahead'
        elif abs_angle < 60:
            dir_str = 'ahead and to the right' if d['relative'] > 0 else 'ahead and to the left'
        elif abs_angle < 110:
            dir_str = 'to your right' if d['relative'] > 0 else 'to your left'
        elif abs_angle < 150:
            dir_str = 'behind and to the right' if d['relative'] > 0 else 'behind and to the left'
        else:
            dir_str = 'directly behind you'

        if d['dist'] < 2:
            dist_str = ', very close'
        elif d['dist'] < 5:
            dist_str = ', nearby'
        elif d['dist'] < 10:
            dist_str = ', a short walk away'
        else:
            dist_str = ', far away'

        name = target['props'].get('name') or target['props'].get('id') or target['type']
        self.speech.speak(name + ', ' + dir_str + dist_str)

    def exit_game(self):
        self.speech.speak('Goodbye!')
        self.running = False

    def handle_world_key(self, key):
        moved = False
        if key == 'up':
            moved = self.map_engine.move(0, -0.5)
        elif key == 'down':
            moved = self.map_engine.move(0, 0.5)
        elif key == 'left':
            moved = self.map_engine.move(-0.5, 0)
        elif key == 'right':
            moved = self.map_engine.move(0.5, 0)
        elif key == 'b':
            self.map_engine.read_location()
            return
        elif key == 't':
            self.toggle_tracking()
            return
        elif key == 'w':
            self.describe_target()
            return
        elif key == 'escape':
            self.map_engine.clear_target()
            self.speech.speak('Exited to menu.')
            self.open_main_menu()
            return

        if moved:
            self.audio.play('step')
            if self.map_engine.check_arrival():
                target = self.map_engine.get_target()
                name = target['props'].get('name') or target['props'].get('id') or target['type']
                self.speech.speak('Arrived at ' + name)
                self.map_engine.clear_target()
        else:
            self.audio.play('collision')

    def _run_loop(self):
        clock = pygame.time.Clock()
        while self.running:
            dt = clock.tick(60)

            # Beacon timer
            if self.state == self.STATE_WORLD and self.map_engine.get_target():
                self.beacon_timer += dt
                if self.beacon_timer >= self.beacon_interval:
                    self.beacon_timer = 0
                    self.audio.play('beacon')

            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    self.running = False
                elif event.type == pygame.KEYDOWN:
                    key = self._map_key(event.key)
                    if key:
                        self._handle_input(key)

            pygame.time.wait(1)

    def _map_key(self, pygame_key):
        mapping = {
            pygame.K_UP: 'up',
            pygame.K_DOWN: 'down',
            pygame.K_LEFT: 'left',
            pygame.K_RIGHT: 'right',
            pygame.K_RETURN: 'return',
            pygame.K_ESCAPE: 'escape',
            pygame.K_b: 'b',
            pygame.K_t: 't',
            pygame.K_w: 'w',
        }
        return mapping.get(pygame_key)

    def _handle_input(self, key):
        if self.state == self.STATE_MAIN_MENU or self.state == self.STATE_TRACKING_MENU:
            self.menu.handle_key(key)
        elif self.state == self.STATE_WORLD:
            self.handle_world_key(key)
