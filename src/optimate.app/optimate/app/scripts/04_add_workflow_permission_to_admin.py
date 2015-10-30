from optimate.app.models import (
    Base,
    User,
    UserRight
    )
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
        production_uri = ('/').join(pathlist[:-5]) + '/server.sqlite'
    else:
        pathlist = cwd.split('\\')
        production_uri = ('\\').join(pathlist[:-5]) + '\\server.sqlite'

    workflowpermissions = [
                {'Function': 'projects_workflow',
                    'Permission': 'Draft_Approved_Completed'},
                {'Function': 'orders_workflow',
                    'Permission': 'Draft_Processed'},
                {'Function': 'invoices_workflow',
                    'Permission': 'Draft_Due_Paid'},
                {'Function': 'valuations_workflow',
                    'Permission': 'Draft_Paid'},
                {'Function': 'claims_workflow',
                    'Permission': 'Draft_Claimed'}]

    # create the engine
    engine = create_engine('sqlite:///' + production_uri)
    Base.metadata.create_all(engine)
    session = sessionmaker()
    session.configure(bind=engine)
    s = session()
    try:
        admin = s.query(User).filter_by(username='admin').first()
        for perm in workflowpermissions:
            right = s.query(UserRight).filter_by(UserID=admin.ID,
                                            Function=perm['Function']).first()
            if not right:
                right = UserRight(Function=perm['Function'],
                                    Permission=perm['Permission'])
                admin.UserRights.append(right)
        s.commit()
        print "Added workflow permissions to admin"
    except Exception, e:
        s.rollback()
        print "Error adding permissions"
    finally:
        s.close()
