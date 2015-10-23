from optimate.app.models import DBSession
import os
from sqlalchemy import create_engine
import transaction

# get the current directory
cwd = os.path.dirname(os.path.abspath(__file__))

# check for type of OS
# set the path to the production db
production_uri = ''
if os.name == 'posix':
    pathlist = cwd.split('/')
    production_uri = ('/').join(pathlist[:-5]) + '/production.sqlite'
else:
    pathlist = cwd.split('\\')
    production_uri = ('\\').join(pathlist[:-5]) + '\\production.sqlite'

# create the engine
engine = create_engine('sqlite:///' + production_uri)
DBSession.configure(bind=engine)

with transaction.manager:
    session = DBSession()
    session.execute('ALTER TABLE BudgetGroup ADD COLUMN Variation Boolean')
    transaction.commit()

    print "Added column Variation to table BudgetGroup"
