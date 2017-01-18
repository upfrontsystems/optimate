import os, sys
from pyramid.paster import get_app
from zipimport import zipimporter

CONFIG_FILE = 'local.ini'
path = os.path.dirname(os.path.abspath(__file__))

os.chdir(path)

app = get_app(CONFIG_FILE)
