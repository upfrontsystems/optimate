""" setup.py contains the set of modules required by this package
    and sets up the development enviroment for pyramid
"""

import os

from setuptools import setup, find_packages

here = os.path.abspath(os.path.dirname(__file__))
with open(os.path.join(here, 'README.txt')) as f:
    README = f.read()
with open(os.path.join(here, 'CHANGES.txt')) as f:
    CHANGES = f.read()

requires = [
    'pyramid',
    'pyramid_chameleon',
    'pyramid_debugtoolbar',
    'pyramid_tm',
    'SQLAlchemy',
    'transaction',
    'zope.sqlalchemy',
    'waitress',
    'docutils',
    'xlrd',
    'PyCrypto', # For secure authentication tokens
    'xhtml2pdf',
    'Products.FinanceFields',
    'xlsxwriter'
    ]

setup(name='optimate.app',
      version='0.1',
      description='optimate.app',
      long_description=README + '\n\n' + CHANGES,
      classifiers=[
        "Programming Language :: Python",
        "Framework :: Pyramid",
        "Topic :: Internet :: WWW/HTTP",
        "Topic :: Internet :: WWW/HTTP :: WSGI :: Application",
        ],
      author='',
      author_email='',
      url='',
      keywords='web wsgi bfg pylons pyramid',
      packages=find_packages(),
      include_package_data=True,
      zip_safe=False,
      test_suite='nose.collector',
      install_requires=requires,
      tests_require=requires + ['nose'],
      entry_points="""\
      [paste.app_factory]
      main = optimate.app:main
      [console_scripts]
      initialize_server_db = optimate.app.scripts.initializedb:main
      """,
      )
