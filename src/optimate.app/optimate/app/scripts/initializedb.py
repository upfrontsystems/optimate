"""
This scrip builds the SQLite DB tables for optimate
"""

import os
import sys
import json
from sqlalchemy.orm.exc import NoResultFound
import transaction
from pyramid.scripts.common import parse_vars
from sqlalchemy import engine_from_config
from pyramid.paster import (
    get_appsettings,
    setup_logging,
)
from optimate.app.models import *

def usage(argv):
    cmd = os.path.basename(argv[0])
    print('usage: %s <config_uri> [var=value]\n'
          '(example: "%s development.ini")' % (cmd, cmd))
    sys.exit(1)

def main(argv=sys.argv):
    if len(argv) < 2:
        usage(argv)
    config_uri = argv[1]
    options = parse_vars(argv[2:])
    setup_logging(config_uri)
    settings = get_appsettings(config_uri, options=options)
    engine = engine_from_config(settings, 'sqlalchemy.')
    DBSession.configure(bind=engine)
    Base.metadata.create_all(engine)

    # add the root node
    root = Node(ID=0)
    DBSession.add(root)

    # add resource type
    DBSession.add(ResourceType(ID=1, Name='Labour'))
    DBSession.add(ResourceType(ID=2, Name='Material'))
    DBSession.add(ResourceType(ID=3, Name='Subcontractor'))
    DBSession.add(ResourceType(ID=4, Name='Equipment'))

    # Initialise user database with an admin user
    try:
        user = DBSession.query(User).filter(User.username==u'admin').one()
    except NoResultFound:
        user = User()
        user.username = u'admin'
        user.set_password('admin')
        for right in ['projects','orders','invoices','valuations',
                      'claims','payments','setup']:
            userright = UserRight(Function=right, Permission='edit')
            user.UserRights.append(userright)
        user.roles = json.dumps(['Administrator'])
        DBSession().merge(user)

    transaction.commit()
