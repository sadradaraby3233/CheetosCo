import accessible_output2

class Speech:
    def __init__(self):
        self.output = accessible_output2.auto.Auto()

    def speak(self, text, interrupt=True):
        self.output.speak(text, interrupt)
