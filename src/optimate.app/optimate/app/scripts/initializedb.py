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

from ..models import (
    DBSession,
    Node,
    Project,
    BudgetGroup,
    BudgetItem,
    Component,
    ComponentType,
    Base,
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
    print "\n\nseetings: "
    print settings
    print "\n\n"
    engine = engine_from_config(settings, 'sqlalchemy.')
    DBSession.configure(bind=engine)
    Base.metadata.create_all(engine)
    # with transaction.manager:
    #     # Build the object models
        # root = Node(ID=0)
        # DBSession.add(root)
    #     project = Project(Name="PName",
    #                         ID=1,
    #                         Description="PDesc",
    #                         ParentID=0)

    #     budgetgroup = BudgetGroup(Name="BGName",
    #                         ID=2,
    #                         Description="BGDesc",
    #                         ParentID=project.ID)

    #     budgetitem = BudgetItem(Name="BIName",
    #                         ID=3,
    #                         Description="BIDesc",
    #                         Quantity=10,
    #                         Rate=5,
    #                         ParentID=budgetgroup.ID)

    #     comptype = ComponentType(ID=1,
    #                         Name="type")
    #     DBSession.add(comptype)

    #     comp = Component (ID=7,
    #                         Name="COmpName",
    #                         Description="CompDesc",
    #                         Type=1,
    #                         Quantity=5,
    #                         Rate=10,
    #                         ParentID=budgetgroup.ID)

    #     # Append the children nodes to their parents
    #     # budgetgroup.Children.append(budgetitem)
    #     # project.Children.append(budgetgroup)
    #     DBSession.add(project)
    #     DBSession.add(budgetgroup)
    #     DBSession.add(budgetitem)
    #     DBSession.add(comp)


    #     projectb = Project(Name="BPName",
    #                         ID=4,
    #                         Description="BPDesc",
    #                         ParentID=0)

    #     budgetgroupb = BudgetGroup(Name="BBGName",
    #                         ID=5,
    #                         Description="BBGDesc",
    #                         ParentID=projectb.ID)

    #     budgetitemb = BudgetItem(Name="BBIName",
    #                         ID=6,
    #                         Description="BBIDesc",
    #                         Quantity=10,
    #                         Rate=5,
    #                         ParentID=budgetgroupb.ID)

    #     compb = Component (ID=8,
    #                         Name="COmpName",
    #                         Description="CompDesc",
    #                         Type=1,
    #                         Quantity=5,
    #                         Rate=10,
    #                         ParentID=budgetitemb.ID)

    #     # budgetgroupb.Children.append(budgetitemb)
    #     # projectb.Children.append(budgetgroupb)
    #     DBSession.add(projectb)
    #     DBSession.add(budgetgroupb)
    #     DBSession.add(budgetitemb)
    #     DBSession.add(compb)
