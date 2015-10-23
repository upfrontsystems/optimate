from optimate.app.models import Base
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

if __name__ == '__main__':
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
    Base.metadata.create_all(engine)
    session = sessionmaker()
    session.configure(bind=engine)
    s = session()
    try:
        engine.execute('ALTER TABLE BudgetGroup ADD COLUMN Variation Boolean')
        s.commit()
        print "Added column Variation to table BudgetGroup"
    except:
        s.rollback()
        print "Error altering table"
    finally:
        s.close()
