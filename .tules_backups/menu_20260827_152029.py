class MenuSystem:
    def __init__(self, speech, audio):
        self.speech = speech
        self.audio = audio
        self.stack = []

    def current(self):
        if self.stack:
            return self.stack[-1]
        return None

    def announce(self):
        menu = self.current()
        if not menu or not menu['items']:
            self.speech.speak('Empty menu.')
            return
        item = menu['items'][menu['index']]
        label = item if isinstance(item, str) else item.get('label', str(item))
        self.speech.speak(label)

    def navigate_up(self):
        menu = self.current()
        if not menu or not menu['items']:
            return
        menu['index'] = (menu['index'] - 1) % len(menu['items'])
        self.audio.play('menu_move')
        self.announce()

    def navigate_down(self):
        menu = self.current()
        if not menu or not menu['items']:
            return
        menu['index'] = (menu['index'] + 1) % len(menu['items'])
        self.audio.play('menu_move')
        self.announce()

    def select(self):
        menu = self.current()
        if not menu or not menu['items']:
            return
        self.audio.play('menu_select')
        if menu.get('on_select'):
            menu['on_select'](menu['index'], menu['items'][menu['index']])

    def back(self):
        menu = self.current()
        if not menu:
            return
        self.audio.play('menu_back')
        self.stack.pop()
        if menu.get('on_back'):
            menu['on_back']()
        if self.current():
            self.announce()

    def open(self, items, on_select=None, on_back=None):
        self.stack.append({
            'items': items,
            'index': 0,
            'on_select': on_select,
            'on_back': on_back
        })
        self.audio.play('menu_open')
        self.announce()

    def close(self):
        self.stack = []

    def is_open(self):
        return len(self.stack) > 0

    def handle_key(self, key):
        if not self.current():
            return False
        if key == 'up':
            self.navigate_up()
            return True
        elif key == 'down':
            self.navigate_down()
            return True
        elif key == 'return':
            self.select()
            return True
        elif key == 'escape':
            self.back()
            return True
        return False
