import os
import sys
import pygame

# Set up a minimal, invisible pygame window for keyboard capture
os.environ.setdefault('SDL_VIDEO_WINDOW_POS', '0,0')
pygame.init()
screen = pygame.display.set_mode((1, 1), pygame.NOFRAME)
pygame.display.set_caption('CheetosCo')

# Try to minimize/hide the window
try:
    pygame.display.iconify()
except Exception:
    pass

from game import Game

if __name__ == '__main__':
    game = Game()
    game.start()
    pygame.quit()
