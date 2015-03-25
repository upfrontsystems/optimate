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
    ComponentType,
    ResourceCategory,
    Resource,
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
from sys import stdout
from time import sleep

if __name__ == "__main__":
    # get the current directory
    cwd = os.path.dirname(os.path.abspath(__file__))

    # check for type of OS
    # get the development.ini file
    # delete the current server.sqlite database
    # set the path to the excel data
    config_uri = ''
    exceldatapath = ''
    if os.name == "posix":
        pathlist = cwd.split("/")
        try:
            os.remove(('/').join(pathlist[:-5]) + '/server.sqlite')
        except OSError, o:
            pass
        config_uri = ('/').join(pathlist[:-5]) + '/development.ini'
        exceldatapath = ('/').join(pathlist[:-5]) + '/exceldata/'
    else:
        pathlist = cwd.split("\\")
        try:
            os.remove(('\\').join(pathlist[:-5]) + '\\server.sqlite')
        except OSError, o:
            pass
        config_uri = ('\\').join(pathlist[:-5]) + '\\development.ini'
        exceldatapath = ('\\').join(pathlist[:-5]) + '\\exceldata\\'

    options = {}

    # set the settings
    settings = get_appsettings(config_uri, options=options)
    engine = engine_from_config(settings, 'sqlalchemy.')
    DBSession.configure(bind=engine)
    Base.metadata.create_all(engine)

    with transaction.manager:
        # add the root node
        root = Node(ID=0)
        DBSession.add(root)

        # add the error node
        # the children of this node will be deleted
        errornode = Project(Name="ErrorNode", ID=149999, ParentID=0)
        DBSession.add(errornode)
        transaction.commit()

        # open the excel projects spreadsheet
        projectbook = xlrd.open_workbook(exceldatapath + 'Projects.xls')
        sheet = projectbook.sheet_by_index(0)
        codeindex = 0
        nameindex = 1
        descriptionindex = 2
        budgetcostindex = 12
        ordercostindex = 13
        claimedcostindex = 15

        # start the new code for items at 150000
        newcode = 150000

        print "Converting Project table"
        # build the projects ==================================================
        for x in range(1, sheet.nrows):
            code = int(sheet.cell(x, codeindex).value)
            # check for unicode issues in the name and description
            try:
                name = sheet.cell(x, nameindex).value.encode('ascii')
            except UnicodeEncodeError, u:
                if u"\u02c6" in name:
                    name = name.replace(u"\u02c6", "e")
                if u"\u2030" in name:
                    name = name.replace(u"\u2030", "e")
                name = name.encode('ascii')
            try:
                description = sheet.cell(x,
                                         descriptionindex).value.encode('ascii')
            except UnicodeEncodeError, u:
                if u"\u02c6" in description:
                    description = description.replace(u"\u02c6", "e")
                if u"\u2030" in description:
                    description = description.replace(u"\u2030", "e")
                description = description.encode('ascii')

            # convert the costs to float and if there are issues set it to 0
            try:
                ordercost = float(sheet.cell(x, ordercostindex).value)
            except ValueError, e:
                ordercost = 0
            try:
                claimedcost = float(sheet.cell(x, claimedcostindex).value)
            except ValueError, e:
                claimedcost = 0

            # build the project and add it to the database
            project = Project(ID=code, Name=name,
                              Description=description,
                              ParentID=0)

            DBSession.add(project)
            project.Ordered = ordercost
            project.Claimed = claimedcost

        transaction.commit()

        print "Converting BudgetGroups table"
        # build the budgetgroups
        budgetgroupbook = xlrd.open_workbook(
            exceldatapath + 'BudgetGroups.xls')
        sheet = budgetgroupbook.sheet_by_index(0)
        codeindex = 0
        nameindex = 1
        parentindex = 2
        descriptionindex = 3
        budgetcostindex = 4
        ordercostindex = 5
        claimedcostindex = 7
        changedbgcodes = {}

        # correct negative codes and circular dependancies
        for x in range(1, sheet.nrows):
            code = int(sheet.cell(x, codeindex).value)
            try:
                pid = int(sheet.cell(x, parentindex).value)
            except ValueError, e:
                pid = 149999
            if pid < 0:
                pid = -pid
                if code == pid:
                    changedbgcodes[pid] = 149999
                elif pid not in changedbgcodes:
                    newcode += 1
                    changedbgcodes[pid] = newcode

        # show the percentage of progress
        length = float(sheet.nrows)
        percentile = length / 100.0
        print "Percentage done: "
        counter = 2
        # build the budgetgroups
        for x in range(1, sheet.nrows):
            if x == int(percentile * counter):
                counter += 1
                stdout.write("\r%d" % counter + "%")
                stdout.flush()
                sleep(1)

            code = int(sheet.cell(x, codeindex).value)
            # correct unicode issues
            try:
                name = sheet.cell(x, nameindex).value.encode('ascii')
            except UnicodeEncodeError, u:
                if u"\u02c6" in name:
                    name = name.replace(u"\u02c6", "e")
                if u"\u2030" in name:
                    name = name.replace(u"\u2030", "e")
                name = name.encode('ascii')
            try:
                description = sheet.cell(x,
                                         descriptionindex).value.encode('ascii')
            except UnicodeEncodeError, u:
                if u"\u02c6" in description:
                    description = description.replace(u"\u02c6", "e")
                if u"\u2030" in description:
                    description = description.replace(u"\u2030", "e")
                description = description.encode('ascii')
            # set the costs to 0 is theres a problem
            try:
                ordercost = float(sheet.cell(x, ordercostindex).value)
            except ValueError, e:
                ordercost = 0
            try:
                claimedcost = float(sheet.cell(x, claimedcostindex).value)
            except ValueError, e:
                claimedcost = 0
            try:
                parentcode = int(sheet.cell(x, parentindex).value)
            except ValueError, e:
                parentcode = 149999

            # if the code has been changed assign it here
            if code in changedbgcodes.keys():
                if changedbgcodes[code] != 149999:
                    code = changedbgcodes[code]
            # if it is negative it refers to a parent in the same table
            # budgetgroups should not refer to the root
            if parentcode <= 0:
                if parentcode == 0:
                    parentcode = 149999
                else:
                    parentcode = -parentcode
                    if parentcode in changedbgcodes.keys():
                        parentcode = changedbgcodes[parentcode]

            # build the budgetgroup and add it
            bg = BudgetGroup(ID=code,
                             Name=name,
                             Description=description,
                             ParentID=parentcode)

            DBSession.add(bg)
            bg.Ordered = ordercost
            bg.Claimed = claimedcost

        transaction.commit()
        stdout.write("\n")

        # build the budgetitems
        budgetitembook = xlrd.open_workbook(exceldatapath + 'BudgetItems.xls')
        sheet = budgetitembook.sheet_by_index(0)
        codeindex = 0
        nameindex = 1
        parentindex = 2
        descriptionindex = 3
        quantityindex = 13
        rateindex = 14
        unitindex = 17
        budgetcostindex = 5
        ordercostindex = 6
        claimedcostindex = 9
        changedbicodes = {}

        # correct negative codes and circular dependancies
        for x in range(1, sheet.nrows):
            code = int(sheet.cell(x, codeindex).value)
            try:
                pid = int(sheet.cell(x, parentindex).value)
            except ValueError, e:
                pid = 149999
            if pid < 0:
                pid = -pid
                if pid not in changedbicodes:
                    pid = int(pid)
                    newcode += 1
                    changedbicodes[pid] = newcode
                    if code == pid:
                        changedbicodes[pid] = 149999

            if code in changedbgcodes.keys():
                newcode += 1
                changedbicodes[code] = newcode
                if code == pid:
                    changedbicodes[pid] = 149999

            if DBSession.query(Node).filter_by(ID=code).first():
                newcode += 1
                changedbicodes[code] = newcode

        print "Converting Budgetitems table"
        # display the precentage progress
        length = float(sheet.nrows)
        percentile = length / 100.0
        print "Percentage done: "
        counter = 2
        # build the budgetitems -----------------------------------------------
        for x in range(1, sheet.nrows):
            if x == int(percentile * counter):
                counter += 1
                stdout.write("\r%d" % counter + "%")
                stdout.flush()
                sleep(1)

            code = int(sheet.cell(x, codeindex).value)
            # check for unicode issues
            try:
                name = sheet.cell(x, nameindex).value.encode('ascii')
            except UnicodeEncodeError, u:
                if u"\u02c6" in name:
                    name = name.replace(u"\u02c6", "e")
                if u"\u2030" in name:
                    name = name.replace(u"\u2030", "e")
                name = name.encode('ascii')
            try:
                description = sheet.cell(x,
                                         descriptionindex).value.encode('ascii')
            except UnicodeEncodeError, u:
                if u"\u02c6" in description:
                    description = description.replace(u"\u02c6", "e")
                if u"\u2030" in description:
                    description = description.replace(u"\u2030", "e")
                description = description.encode('ascii')
            measureunit = sheet.cell(x, unitindex).value
            try:
                budgetcost = float(sheet.cell(x, budgetcostindex).value)
            except ValueError, e:
                budgetcost = 0
            try:
                ordercost = float(sheet.cell(x, ordercostindex).value)
            except ValueError, e:
                ordercost = 0
            try:
                claimedcost = float(sheet.cell(x, claimedcostindex).value)
            except ValueError, e:
                claimedcost = 0
            try:
                parentcode = int(sheet.cell(x, parentindex).value)
            except ValueError, e:
                parentcode = 0
            try:
                quantity = float(sheet.cell(x, quantityindex).value)
            except ValueError, e:
                quantity = 0
            try:
                rate = float(sheet.cell(x, rateindex).value)
            except ValueError, e:
                rate = 0

            # if the code has been changed assign it here
            if code in changedbicodes.keys():
                if changedbicodes[code] != 149999:
                    code = changedbicodes[code]
            # if the parent is negative it refers to a node in the same table
            if parentcode <= 0:
                if parentcode == 0:
                    parentcode = 149999
                else:
                    parentcode = -parentcode
                    if parentcode in changedbicodes.keys():
                        parentcode = changedbicodes[parentcode]
            # otherwise check if the parent code has changed
            elif parentcode in changedbgcodes:
                parentcode = changedbgcodes[parentcode]

            # build the budgetitem and add it
            bi = BudgetItem(ID=code, Name=name,
                            Description=description,
                            ParentID=parentcode,
                            Unit=measureunit)
            DBSession.add(bi)

            # set the costs
            bi._Total = budgetcost
            bi.Ordered = ordercost
            bi.Claimed = claimedcost
            bi._Quantity = quantity
            bi._Rate = rate

        transaction.commit()
        stdout.write("\n")

        # build the components
        componentbook = xlrd.open_workbook(exceldatapath + 'Components.xls')
        sheet = componentbook.sheet_by_index(0)
        codeindex = 0
        nameindex = 1
        parentindex = 2
        descriptionindex = 3
        typeindex = 4
        rateindex = 14
        quantityindex = 13
        unitindex = 19
        budgetcostindex = 5
        ordercostindex = 6
        claimedcostindex = 8
        changedcocodes = {}

        # correct negative codes and circular dependancies
        for x in range(1, sheet.nrows):
            code = int(sheet.cell(x, codeindex).value)
            try:
                pid = int(sheet.cell(x, parentindex).value)
            except ValueError, e:
                pid = 149999
            if pid < 0:
                pid = -pid
                if pid not in changedcocodes:
                    pid = int(pid)
                    newcode += 1
                    changedcocodes[pid] = newcode

                    if code == pid:
                        changedcocodes[pid] = 149999

                if code in changedbgcodes.keys():
                    newcode += 1
                    changedcocodes[code] = newcode
                    if code == pid:
                        changedcocodes[pid] = 149999
                elif code in changedbicodes.keys():
                    newcode += 1
                    changedcocodes[code] = newcode
                    if code == pid:
                        changedcocodes[pid] = 149999

            if DBSession.query(Node).filter_by(ID=code).first():
                newcode += 1
                changedcocodes[code] = newcode

        print "Converting Components table"
        # build the components ------------------------------------------------
        length = float(sheet.nrows)
        percentile = length / 100.0
        print "Percentage done: "
        counter = 2
        for x in range(1, sheet.nrows):
            if x == int(percentile * counter):
                counter += 1
                stdout.write("\r%d" % counter + "%")
                stdout.flush()
                sleep(1)

            code = int(sheet.cell(x, codeindex).value)
            try:
                name = sheet.cell(x, nameindex).value.encode('ascii')
            except UnicodeEncodeError, u:
                if u"\u02c6" in name:
                    name = name.replace(u"\u02c6", "e")
                if u"\u2030" in name:
                    name = name.replace(u"\u2030", "e")
                name = name.encode('ascii')
            try:
                description = sheet.cell(x,
                                         descriptionindex).value.encode('ascii')
            except UnicodeEncodeError, u:
                if u"\u02c6" in description:
                    description = description.replace(u"\u02c6", "e")
                if u"\u2030" in description:
                    description = description.replace(u"\u2030", "e")
                description = description.encode('ascii')
            try:
                cotype = int(sheet.cell(x, typeindex).value)
            except ValueError, v:
                cotype = 1
            measureunit = sheet.cell(x, unitindex).value
            try:
                budgetcost = float(sheet.cell(x, budgetcostindex).value)
            except ValueError, e:
                budgetcost = 0
            try:
                ordercost = float(sheet.cell(x, ordercostindex).value)
            except ValueError, e:
                ordercost = 0
            try:
                claimedcost = float(sheet.cell(x, claimedcostindex).value)
            except ValueError, e:
                claimedcost = 0
            try:
                parentcode = int(sheet.cell(x, parentindex).value)
            except ValueError, e:
                parentcode = 149999
            try:
                quantity = float(sheet.cell(x, quantityindex).value)
            except ValueError, e:
                quantity = 0
            try:
                rate = float(sheet.cell(x, rateindex).value)
            except ValueError, e:
                rate = 0

            # if the code has been changed assign it here
            if code in changedcocodes.keys():
                if changedcocodes[code] != 149999:
                    code = changedcocodes[code]
            # if it is negative it refers to a parent in the same table
            if parentcode <= 0:
                if parentcode == 0:
                    parentcode = 149999
                else:
                    parentcode = -parentcode
                    if parentcode in changedcocodes.keys():
                        parentcode = changedcocodes[parentcode]
            # otherwise check if the parent code has changed
            elif parentcode in changedbicodes:
                parentcode = changedbicodes[parentcode]
            elif parentcode in changedbgcodes:
                parentcode = changedbgcodes[parentcode]

            # build the resource this component uses
            # check if the component references a new resource
            # format the name of the component
            beginindex = name.find(".") + 1
            if beginindex < 0:
                beginindex = 0
            endindex = name.find("=") - 1
            if endindex < 0:
                endindex = len(name) - 1

            checkname = name[beginindex:endindex].strip()

            co = Component(ID=code, Name=checkname,
                           # Description=description,
                           Type=cotype,
                           Unit=measureunit,
                           ParentID=parentcode)

            resource = DBSession.query(
                Resource).filter_by(Name=checkname).first()
            if resource == None:
                # get the next code to be used in the resourcecategory children
                # for now its just a random number
                resourcecode = randint(100000, 200000)
                newcode += 1
                resourceid = newcode

                # build the resource
                resource = Resource(ID=resourceid,
                                    Code=resourcecode,
                                    Name=checkname,
                                    Description=description,
                                    Rate=rate,
                                    # ParentID=categoryid)
                                    # ParentID=resourcecategory.ID)
                                    )

                co._Total = budgetcost
                co.Ordered = ordercost
                co.Claimed = claimedcost
                co._Quantity = quantity
                # co._Rate = rate
                resource.Components.append(co)
                DBSession.add(resource)
            else:
                # DBSession.add(co)
                co._Total = budgetcost
                co.Ordered = ordercost
                co.Claimed = claimedcost
                co._Quantity = quantity
                # co._Rate = rate
                resource.Components.append(co)

        transaction.commit()
        stdout.write("\n")

        cotypebook = xlrd.open_workbook(exceldatapath + 'CompTypes.xls')
        sheet = cotypebook.sheet_by_index(0)
        codeindex = 0
        nameindex = 1

        print "Converting Component Type table"
        # build the componenttypes
        for x in range(1, sheet.nrows):
            code = int(sheet.cell(x, codeindex).value)
            try:
                name = sheet.cell(x, nameindex).value.encode('ascii')
            except UnicodeEncodeError, u:
                if u"\u02c6" in name:
                    name = name.replace(u"\u02c6", "e")
                if u"\u2030" in name:
                    name = name.replace(u"\u2030", "e")
                name = name.encode('ascii')

            cotype = ComponentType(ID=code, Name=name)
            DBSession.add(cotype)

        transaction.commit()

        print "Deleting error node"
        deletethis = DBSession.query(Node).filter_by(ID=149999).first()
        DBSession.delete(deletethis)
        transaction.commit()

        # add the resource category for each project
        # for now each category just has default values
        print "Adding resource categories"
        print "Adding resources to the resource categories"
        # get the projects
        projectlist = DBSession.query(Project).all()
        length = float(len(projectlist))
        percentile = length / 100.0
        print "Percentage done: "
        counter = 2
        x = 0
        # iterate over all the projects, get the components in them, and if
        # a resource that is in a component is not in the category, add it
        for project in projectlist:
            if x == int(percentile * counter):
                counter += 1
                stdout.write("\r%d" % counter + "%")
                stdout.flush()
                sleep(1)
            # get the id that that component is in
            projectid = project.ID
            parentid = project.ID
            newcode += 1
            categoryid = newcode
            resourcecategory = ResourceCategory(ID=categoryid,
                                            Name=str(project.Name) +
                                            " Resource Category",
                                            Description="Category Description",
                                            ParentID=parentid)

            # get the components in the project
            componentlist = project.getComponents()
            for component in componentlist:
                resource = component.ThisResource

                # add the resource to the category
                if resource not in resourcecategory.Resources:
                    resourcecategory.Resources.append(resource)

            DBSession.add(resourcecategory)
            x += 1
        stdout.write("\n")

        print "Recalculating the totals of the projects"
        projectlist = DBSession.query(Project).all()
        print "Percentage done: "
        counter = 2
        x = 0
        for project in projectlist:
            if x == int(percentile * counter):
                counter += 1
                stdout.write("\r%d" % counter + "%")
                stdout.flush()
                sleep(1)
            project.recalculateTotal()

    print "done"
