from optimate.app.models import Base
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

if __name__ == '__main__':
    # get the current directory
    cwd = os.path.dirname(os.path.abspath(__file__))
    # check for type of OS
    # set the path to the server db
    production_uri = ''
    if os.name == 'posix':
        pathlist = cwd.split('/')
        production_uri = ('/').join(pathlist[:-6]) + '/server.sqlite'
    else:
        pathlist = cwd.split('\\')
        production_uri = ('\\').join(pathlist[:-6]) + '\\server.sqlite'

    # create the engine
    engine = create_engine('sqlite:///' + production_uri)
    Base.metadata.create_all(engine)
    session = sessionmaker()
    session.configure(bind=engine)
    s = session()
    try:
        engine.execute('ALTER TABLE CompanyInformation ADD COLUMN Header LargeBinary')
        engine.execute('ALTER TABLE CompanyInformation ADD COLUMN Footer LargeBinary')
        s.commit()
        print "Added column Header and Footer to table CompanyInformation"
    except:
        s.rollback()
        print "Error altering table"
    finally:
        s.close()
