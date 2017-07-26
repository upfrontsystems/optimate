""" Delete empty ResourceParts, rebuild ResourcePart table for required ResourceID
"""
from optimate.app.models import Base, ResourcePart
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
        # delete empty resource parts
        count = s.query(ResourcePart).filter_by(ResourceID=None).count()
        for part in s.query(ResourcePart).filter_by(ResourceID=None).all():
            s.delete(part)
        s.commit()
        # rebuild resource part table
        engine.execute('CREATE TABLE "alter_backup" AS SELECT * FROM "ResourcePart"')
        engine.execute('DROP TABLE "ResourcePart"')
        Base.metadata.create_all(engine)
        engine.execute('INSERT INTO "ResourcePart" SELECT * FROM "alter_backup"')
        engine.execute('DROP TABLE "alter_backup"')
        s.commit()
        print "Deleted %i ResourceParts" % count
        print "Updated ResourcePart ResourceID"
        s.flush()
    except Exception, e:
        print e
        s.rollback()
        print "Error altering table"
    finally:
        s.close()
