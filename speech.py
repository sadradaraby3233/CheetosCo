import accessible_output2.outputs.auto as auto

class Speech:
    def __init__(self):
        self.output = auto.Auto()

    def speak(self, text, interrupt=True):
        self.output.speak(text, interrupt=interrupt)
