from optimate.app.models import Base
from optimate.app.models import Numeric
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
        # sqlite does not support complex alter commands
        for table in ['"Order"', '"Project"', '"Resource"', '"ResourceUnit"',
                        '"Invoice"', '"Valuation"', '"Claim"']:
            engine.execute('CREATE TABLE "alter_backup" AS SELECT * FROM '
                            + table)
            engine.execute('DROP TABLE ' + table)
            Base.metadata.create_all(engine)
            engine.execute('INSERT INTO ' + table +
                            ' SELECT * FROM "alter_backup"')
            engine.execute('DROP TABLE "alter_backup"')
            s.commit()
        print "Updated columns"
    except Exception, e:
        print e
        s.rollback()
        print "Error altering table"
    finally:
        s.close()
