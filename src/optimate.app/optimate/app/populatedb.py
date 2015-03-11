from pyramid.paster import (
    get_appsettings,
    setup_logging,
    )

from server.models import (
    DBSession,
    Base,
    Node,
    Project,
    BudgetGroup,
    BudgetItem,
    Component,
    ComponentType,
    )

from sqlalchemy import (
    Column,
    Index,
    Integer,
    Text,
    ForeignKey,
    )

from random import randint
import sys
import transaction
from sqlalchemy import exc
from sqlalchemy.sql import exists
from pyramid.scripts.common import parse_vars
from sqlalchemy import engine_from_config
from sqlalchemy.orm import sessionmaker
import xlrd
import uuid
import os
from sqlalchemy import exc

# delete the database
try:
    os.remove("server.sqlite")
except OSError, o:
    pass

config_uri = 'development.ini'
options = {}

settings = {'pyramid.includes': '\npyramid_debugtoolbar\npyramid_tm',
        'sqlalchemy.url': 'sqlite:////home/niel/projects/optimatesql/optimatesql/server.sqlite',
        '__file__': '/home/niel/projects/optimatesql/optimatesql/development.ini',
        'pyramid.default_locale_name': 'en', 'pyramid.reload_templates': 'true',
        'here': '/home/niel/projects/optimatesql/optimatesql',
        'pyramid.debug_notfound': 'false', 'pyramid.debug_routematch': 'false',
        'pyramid.debug_authorization': 'false'}

engine = engine_from_config(settings, 'sqlalchemy.')
session = DBSession
session.configure(bind=engine)
Base.metadata.create_all(engine)
# session.expire_on_commit = False
with transaction.manager:

    """
    Open and read an Excel file
    """

    # project = Project(ID=1, Name="test", Description="Desc", ParentID=0)
    # bg = BudgetGroup(ID=2, Name="testbg", Description="bgdesc", ParentID=1)
    # session.add(project)
    # session.add(bg)
    # qry =  session.query(Node).all()
    # for n in qry:
    #     print n

    # print session.query(BudgetGroup).filter_by(ID=2).update({'ID': 4})
    # transaction.commit()
    # qry =  session.query(Node).all()
    # for n in qry:
    #     print n
    root = Node(ID=0)
    session.add(root)

    projectbook = xlrd.open_workbook("/home/niel/projects/exceldata/Projects.xls")

    sheet = projectbook.sheet_by_index(0)

    codeindex = 0
    nameindex = 1
    descriptionindex = 2
    budgetcostindex = 12
    ordercostindex = 13
    claimedcostindex = 15

    print "Converting Project table"
    # # build the projects
    for x in range (1, sheet.nrows):
        code = int(sheet.cell(x,codeindex).value)
        name = sheet.cell(x, nameindex).value
        description = sheet.cell(x, descriptionindex).value
        budgetcost = sheet.cell(x, budgetcostindex).value
        ordercost = sheet.cell(x, ordercostindex).value
        claimedcost = sheet.cell(x, claimedcostindex).value

        project = Project(ID=code, Name=name,
                            Description=description,
                            Total=budgetcost,
                            Ordered=ordercost,
                            Claimed=claimedcost,
                            ParentID=0)
        session.add(project)

    transaction.commit()

    #build the budgetgroups
    budgetgroupbook = xlrd.open_workbook("/home/niel/projects/exceldata/BudgetGroups.xls")

    sheet = budgetgroupbook.sheet_by_index(0)
    codeindex = 0
    nameindex = 1
    parentindex = 2
    descriptionindex = 3
    budgetcostindex = 4
    ordercostindex = 5
    claimedcostindex = 7

    newcode = 150000
    changedbgcodes = {}

    # change the codes to unique ID's
    # codeslice = sheet.col_values (parentindex, 1)

    # for pid in codeslice:
    #     if pid<0:
    #         pid = -pid
    #         if pid not in changedbgcodes:
    #             pid = int(pid)
    #             newcode+=1
    #             changedbgcodes[pid] = newcode

    # correct negative codes and circular dependancies
    for x in range (1, sheet.nrows):
        code = int(sheet.cell(x,codeindex).value)
        try:
            pid = int(sheet.cell(x,parentindex).value)
        except ValueError, e:
            pid = 0
        if pid<0:
            pid = -pid
            if pid not in changedbgcodes:
                pid = int(pid)
                newcode+=1
                changedbgcodes[pid] = newcode
                if code == pid:
                    changedbgcodes[pid] = 0


    print "Converting BudgetGroups table"
    # build the budgetgroups
    for x in range (1, sheet.nrows):
        code = int(sheet.cell(x,codeindex).value)
        name = sheet.cell(x, nameindex).value
        description = sheet.cell(x, descriptionindex).value
        budgetcost = sheet.cell(x, budgetcostindex).value
        ordercost = sheet.cell(x, ordercostindex).value
        claimedcost = sheet.cell(x, claimedcostindex).value
        try:
            parentcode = int(sheet.cell(x,parentindex).value)
        except ValueError, e:
            parentcode = 0

        # if the code has been changed assign it here
        if code in changedbgcodes.keys():
            if changedbgcodes[code] != 0:
                code = changedbgcodes[code]

        # if it is negative it refers to a parent in the same table
        if parentcode < 0:
            parentcode = abs(parentcode)
            parentcode = changedbgcodes[parentcode]


        bg = BudgetGroup(ID=code, Name=name,
                            Description=description,
                            Total=budgetcost,
                            Ordered=ordercost,
                            Claimed=claimedcost,
                            ParentID=parentcode)
        session.add(bg)

    transaction.commit()

    # print "Building hierarchy"
    # # build it again adding the heirarchy
    # qry = session.query(BudgetGroup).all()
    # for bg in qry:
    #     #get the id
    #     parentid = bg.ParentID
    #     # get the parent
    #     try:
    #         parent = session.query(Node).filter_by(ID=parentid).first()
    #         parent.Children.append(bg)
    #     except AttributeError, a:
    #         if parent:
    #             raise AttributeError()
    #     except Exception, e:
    #         session.rollback()
    #         # session.query(BudgetGroup).filter_by(ID=bg.ID).update({'ParentID': 0})
    # transaction.commit()

    #build the budgetitems
    budgetitembook = xlrd.open_workbook("/home/niel/projects/exceldata/BudgetItems.xls")
    sheet = budgetitembook.sheet_by_index(0)
    codeindex = 0
    nameindex = 1
    parentindex = 2
    descriptionindex = 3
    quantityindex = 13
    rateindex = 14
    # unitindex =
    budgetcostindex = 5
    ordercostindex = 6
    claimedcostindex = 9

    changedbicodes = {}

    # change the codes to unique ID's
    # codeslice = sheet.col_values (parentindex, 1)

    # for pid in codeslice:
    #     if pid<0:
    #         pid = -pid
    #         if pid not in changedbicodes:
    #             pid = int(pid)
    #             newcode+=1
    #             changedbicodes[pid] = newcode
    # correct negative codes and circular dependancies
    for x in range (1, sheet.nrows):
        code = int(sheet.cell(x,codeindex).value)
        try:
            pid = int(sheet.cell(x,parentindex).value)
        except ValueError, e:
            pid = 0
        if pid<0:
            pid = -pid
            if pid not in changedbicodes:
                pid = int(pid)
                newcode+=1
                changedbicodes[pid] = newcode
                if code == pid:
                    changedbicodes[pid] = 0

        if code in changedbgcodes.keys():
                newcode+=1
                changedbicodes[code] = newcode
                if code == pid:
                    changedbicodes[pid] = 0

        if session.query(Node).filter_by(ID=code).first():
            newcode+=1
            changedbicodes[code] = newcode


    print "Converting Budgetitems table"
    # build the budgetitems
    for x in range (1, sheet.nrows):
        code = int(sheet.cell(x,codeindex).value)
        name = sheet.cell(x, nameindex).value
        description = sheet.cell(x, descriptionindex).value
        budgetcost = sheet.cell(x, budgetcostindex).value
        ordercost = sheet.cell(x, ordercostindex).value
        claimedcost = sheet.cell(x, claimedcostindex).value
        try:
            parentcode = int(sheet.cell(x,parentindex).value)
        except ValueError, e:
            parentcode = 0

        try:
            quantity = int(sheet.cell(x,quantityindex).value)
        except ValueError, e:
            quantity = 0

        try:
            rate = int(sheet.cell(x,rateindex).value)
        except ValueError, e:
            rate = 0


        # if the code has been changed assign it here
        if code in changedbicodes.keys():
            if changedbicodes[code] != 0:
                code = changedbicodes[code]

        # if it is negative it refers to a parent in the same table
        if parentcode < 0:
            parentcode = abs(parentcode)
            parentcode = changedbicodes[parentcode]
        # otherwise check if the parent code has changed
        elif parentcode in changedbgcodes:
            parentcode = changedbgcodes[parentcode]

        bi = BudgetItem(ID=code, Name=name,
                            Description=description,
                            Total=budgetcost,
                            Ordered=ordercost,
                            Claimed=claimedcost, ParentID=parentcode,
                            Quantity=quantity,
                            Rate=rate)

        session.add(bi)

    transaction.commit()
    # print "Building hierarchy"
    # # build it again adding the heirarchy
    # qry = session.query(BudgetItem).all()
    # for bi in qry:
    #     #get the id
    #     parentid = bi.ParentID
    #     # get the parent
    #     try:
    #         parent = session.query(Node).filter_by(ID=parentid).first()
    #         parent.Children.append(bi)
    #     except AttributeError, a:
    #         if parent:
    #             raise AttributeError()
    #     except Exception, e:
    #         session.rollback()
    #         # session.query(BudgetGroup).filter_by(ID=bi.ID).update({'ParentID': 0})
    #     transaction.commit()

    #build the components
    componentbook = xlrd.open_workbook("/home/niel/projects/exceldata/Components.xls")
    sheet = componentbook.sheet_by_index(0)
    codeindex = 0
    nameindex = 1
    parentindex = 2
    descriptionindex = 3
    typeindex = 4
    rateindex = 14
    quantityindex = 13
    # unitindex =
    budgetcostindex = 5
    ordercostindex = 6
    claimedcostindex = 8

    # change the codes to unique ID's
    changedcocodes = {}

    # correct negative codes and circular dependancies
    for x in range (1, sheet.nrows):
        code = int(sheet.cell(x,codeindex).value)
        try:
            pid = int(sheet.cell(x,parentindex).value)
        except ValueError, e:
            pid = 0
        if pid<0:
            pid = -pid
            if pid not in changedcocodes:
                pid = int(pid)
                newcode+=1
                changedcocodes[pid] = newcode

                if code == pid:
                    changedcocodes[pid] = 0

            if code in changedbgcodes.keys():
                newcode+=1
                changedcocodes[code] = newcode
                if code == pid:
                    changedcocodes[pid] = 0
            elif code in changedbicodes.keys():
                newcode+=1
                changedcocodes[code] = newcode
                if code == pid:
                    changedcocodes[pid] = 0

        if session.query(Node).filter_by(ID=code).first():
            newcode+=1
            changedcocodes[code] = newcode

    print "Converting Components table"
    # build the components
    for x in range (1, sheet.nrows):
        code = int(sheet.cell(x,codeindex).value)
        name = sheet.cell(x, nameindex).value
        description = sheet.cell(x, descriptionindex).value
        cotype = sheet.cell(x, typeindex).value
        budgetcost = sheet.cell(x, budgetcostindex).value
        ordercost = sheet.cell(x, ordercostindex).value
        claimedcost = sheet.cell(x, claimedcostindex).value
        quantity = sheet.cell(x, quantityindex).value
        try:
            parentcode = int(sheet.cell(x,parentindex).value)
        except ValueError, e:
            parentcode = 0
        try:
            quantity = int(sheet.cell(x,quantityindex).value)
        except ValueError, e:
            quantity = 0
        try:
            rate = int(sheet.cell(x,rateindex).value)
        except ValueError, e:
            rate = 0

        # if the code has been changed assign it here
        if code in changedcocodes.keys():
            if changedcocodes[code] != 0:
                code = changedcocodes[code]

        # if it is negative it refers to a parent in the same table
        if parentcode < 0:
            parentcode = abs(parentcode)
            parentcode = changedcocodes[parentcode]
        # otherwise check if the parent code has changed
        elif parentcode in changedbicodes:
            parentcode = changedbicodes[parentcode]
        elif parentcode in changedbgcodes:
            parentcode = changedbgcodes[parentcode]

        co = Component(ID=code, Name=name,
                            Description=description,
                            Type=cotype,
                            Total=budgetcost,
                            Ordered=ordercost,
                            Claimed=claimedcost,
                            ParentID=parentcode,
                            Quantity=quantity,
                            Rate=rate)
        session.add(co)

    transaction.commit()
    # print "Building hierarchy"
    # # build it again adding the heirarchy
    # qry = session.query(Component).all()
    # for co in qry:
    #     #get the id
    #     parentid = co.ParentID
    #     # get the parent
    #     try:
    #         parent = session.query(Node).filter_by(ID=parentid).first()
    #         parent.Children.append(co)
    #     except AttributeError, a:
    #         if parent:
    #             raise AttributeError()
    #     except Exception, e:
    #         session.rollback()
    #         # session.query(BudgetGroup).filter_by(ID=co.ID).update({'ParentID': 0})
    #     transaction.commit()

    cotypebook = xlrd.open_workbook("/home/niel/projects/exceldata/CompTypes.xls")
    sheet = cotypebook.sheet_by_index(0)
    codeindex = 0
    nameindex = 1

    print "Converting Component Type table"
    # # build the componenttypes
    for x in range (1, sheet.nrows):
        code = int(sheet.cell(x,codeindex).value)
        name = sheet.cell(x, nameindex).value

        cotype = ComponentType(ID=code, Name=name)
        session.add(cotype)

    transaction.commit()

# for p in range(1, 11):
#     project = Project(Name="Project"+str(p), Description="projectdescription", ParentID='0')
#     print "adding: " + str(p)
#     # Build 100 budgetgroups
#     for bga in range(1, 11):
#         budgetgroupa = BudgetGroup(Name="BudgetGA"+str(bga), Description="bgadescription", ParentID=project.ID)

#         # Build 100 budgetgroups
#         for bgb in range(1, 11):
#             budgetgroupb = BudgetGroup(Name="BudgetGB", Description="bgbdescription", ParentID=budgetgroupa.ID)

#             # Build 1000 budgetitems
#             for bi in range(1, 11):
#                 budgetitem = BudgetItem(Name="BudgetItem", Description="bidescription", Quantity=randint(1, 100), Rate=randint(1, 100), ParentID=budgetgroupb.ID)
#                 budgetgroupb.Children.append(budgetitem)
#             # gc.collect()
#             budgetgroupa.Children.append(budgetgroupb)
#             # print "added to bg a"
#         # gc.collect()
#         project.Children.append(budgetgroupa)
#         # print "added to project: " + str(p)

#     session.add(project)
#     session.commit()

print "done"
