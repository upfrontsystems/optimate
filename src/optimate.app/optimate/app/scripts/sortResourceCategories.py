from pyramid.paster import (
    get_appsettings,
    setup_logging,
)

from optimate.app.models import (
    DBSession,
    Base,
    Node,
    Project,
    BudgetGroup,
    BudgetItem,
    Component,
    ResourceType,
    ResourceCategory,
    Resource,
    Client,
    Supplier
)

from sqlalchemy import (
    Column,
    Index,
    Integer,
    Text,
    ForeignKey,
)

import sys
import transaction
from sqlalchemy import exc
from sqlalchemy.exc import IntegrityError
from sqlalchemy.sql import exists
from pyramid.scripts.common import parse_vars
from sqlalchemy import engine_from_config
from sqlalchemy.orm import sessionmaker
import xlrd
import os
from sys import stdout
from time import sleep
import unicodedata
from decimal import *

from itertools import groupby
from operator import itemgetter


if __name__ == '__main__':
    # get the current directory
    cwd = os.path.dirname(os.path.abspath(__file__))

    # check for type of OS
    # get the development.ini file
    # delete the current server.sqlite database
    # set the path to the excel data
    config_uri = ''
    exceldatapath = ''
    if os.name == 'posix':
        pathlist = cwd.split('/')
        config_uri = ('/').join(pathlist[:-5]) + '/development.ini'
        exceldatapath = ('/').join(pathlist[:-5]) + '/exceldata/'
    else:
        pathlist = cwd.split('\\')
        config_uri = ('\\').join(pathlist[:-5]) + '\\development.ini'
        exceldatapath = ('\\').join(pathlist[:-5]) + '\\exceldata\\'

    options = {}

    # set the settings
    settings = get_appsettings(config_uri, options=options)
    engine = engine_from_config(settings, 'sqlalchemy.')
    DBSession.configure(bind=engine)
    Base.metadata.create_all(engine)

    with transaction.manager:
        # define the categories
        resourcecatlist = {"A-B": ("A-B"),
                            "C-D": ("C-D"),
                            "E-F": ("E-F"),
                            "G-H": ("G-H"),
                            "I-J": ("I-J"),
                            "K-L": ("K-L"),
                            "M-N": ("M-N"),
                            "O-P": ("O-P"),
                            "Q-R": ("Q-R"),
                            "S-T": ("S-T"),
                            "U-V": ("U-V"),
                            "W-X-Y-Z": ("W-X-Y-Z")}

        # iterate through all the resource categories
        qry = DBSession.query(ResourceCategory).all()
        for rc in qry:
            childlist = rc.Children
            childlist = list(childlist)
            if len(childlist)>0:
                childlist = sorted(childlist, key=lambda k: k.Name.lower())
                value = None
                newid = None
                other = ResourceCategory(Name="Other",
                                        Description="Other Resources",
                                        ParentID=rc.ID)
                DBSession.add(other)
                DBSession.flush()
                otherid = other.ID
                # iterate through the alphabetical grouping of the resources
                for letter, grouping in groupby(childlist, key=itemgetter(0)):
                    letter = letter.upper()
                    try:
                        # get the category the resource falls in
                        result = next(v for (k,v) in
                            resourcecatlist.iteritems() if letter in k)
                        if result != value:
                            value = result
                            newcat = ResourceCategory(Name=value,
                                        Description="Resources from " + value,
                                        ParentID=rc.ID)
                            DBSession.add(newcat)
                            DBSession.flush()
                            newid = newcat.ID
                        # add the resources to the category
                        for resource in grouping:
                            resource.ParentID = newid
                    except StopIteration:
                        for resource in grouping:
                            resource.ParentID = otherid

    print 'done'
