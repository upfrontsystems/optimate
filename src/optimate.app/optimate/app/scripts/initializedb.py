"""
This scrip builds the SQLite DB used in this project and populates it with
default data.
"""

import os
import sys
import transaction
import uuid
from sqlalchemy import exc
from sqlalchemy.sql import exists
from pyramid.scripts.common import parse_vars
from sqlalchemy import engine_from_config

from pyramid.paster import (
    get_appsettings,
    setup_logging,
)

from optimate.app.models import (
    DBSession,
    Node,
    Project,
    BudgetGroup,
    BudgetItem,
    Component,
    ResourceType,
    ResourceCategory,
    Resource,
    Base,
    CompanyInformation,
)


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
