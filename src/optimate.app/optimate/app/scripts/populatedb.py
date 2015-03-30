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

resourcecodeno = 0

def generateResourceCode(resname):
    global resourcecodeno
    if len(resname) < 3:
        resname = resname.upper() + (3-len(resname))*'X'
    else:
        resname = resname[:3].upper()

    numerseq = '0'*(4-len(str(resourcecodeno))) + str(resourcecodeno)
    finalcode = resname+numerseq
    resourcecodeno+=1
    return finalcode


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

        # open the excel projects spreadsheet
        projectbook = xlrd.open_workbook(exceldatapath + 'Projects.xls')
        sheet = projectbook.sheet_by_index(0)
        codeindex = 0
        nameindex = 1
        descriptionindex = 2
        budgetcostindex = 12
        ordercostindex = 13
        claimedcostindex = 15
        runningindex = 14
        incomeindex = 16
        clientindex = 17
        projprofitindex = 18
        actprofitindex = 19

        # start the new code for items at 150000
        newcode = 150000

        print "Converting Project table"
        # build the projects
        # =====================================================================
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
                running = float(sheet.cell(x, runningindex).value)
            except ValueError, e:
                running = 0
            try:
                income = float(sheet.cell(x, incomeindex).value)
            except ValueError, e:
                income = 0
            try:
                client = float(sheet.cell(x, clientindex).value)
            except ValueError, e:
                client = 0
            try:
                projprofit = float(sheet.cell(x, projprofitindex).value)
            except ValueError, e:
                projprofit = 0
            try:
                actprofit = float(sheet.cell(x, actprofitindex).value)
            except ValueError, e:
                actprofit = 0

            # build the project and add it to the database
            project = Project(ID=code, Name=name,
                              Description=description,
                              ParentID=0,
                              OrderCost=ordercost,
                              RunningCost=running,
                              ClaimedCost=claimedcost,
                              IncomeRecieved=income,
                              ClientCost=client,
                              ProjectedProfit=projprofit,
                              ActualProfit=actprofit)

            project._Total = budgetcost
            DBSession.add(project)
            # project.Ordered = ordercost
            # project.Claimed = claimedcost

        transaction.commit()

        print "Adding resource categories"
        projectlist = DBSession.query(Project).all()
        # add a resourcecategory to each resource, using default values
        for project in projectlist:
            parentid = project.ID
            newcode += 1
            resourcecategory = ResourceCategory(ID=newcode,
                                            Name='Resource Category: '+
                                                str(project.Name),
                                            Description="Category Description",
                                            ParentID=parentid)

            DBSession.add(resourcecategory)
        transaction.commit()

        print "Converting BudgetGroups table"
        # build the budgetgroups
        # =====================================================================
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
        runningindex = 6
        incomeindex = 8
        clientindex = 9
        projprofitindex = 10
        actprofitindex = 11
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
            # set the costs to 0 if theres a problem
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
                running = float(sheet.cell(x, runningindex).value)
            except ValueError, e:
                running = 0
            try:
                income = float(sheet.cell(x, incomeindex).value)
            except ValueError, e:
                income = 0
            try:
                client = float(sheet.cell(x, clientindex).value)
            except ValueError, e:
                client = 0
            try:
                projprofit = float(sheet.cell(x, projprofitindex).value)
            except ValueError, e:
                projprofit = 0
            try:
                actprofit = float(sheet.cell(x, actprofitindex).value)
            except ValueError, e:
                actprofit = 0

            # if the code has been changed assign it here
            if code in changedbgcodes:
                if changedbgcodes[code] != 149999:
                    code = changedbgcodes[code]
            # if it is negative it refers to a parent in the same table
            # budgetgroups should not refer to the root
            if parentcode <= 0:
                if parentcode == 0:
                    parentcode = 149999
                else:
                    parentcode = -parentcode
                    if parentcode in changedbgcodes:
                        parentcode = changedbgcodes[parentcode]

            # build the budgetgroup and add it
            bg = BudgetGroup(ID=code,
                            Name=name,
                            Description=description,
                            ParentID=parentcode,
                            OrderCost=ordercost,
                            RunningCost=running,
                            ClaimedCost=claimedcost,
                            IncomeRecieved=income,
                            ClientCost=client,
                            ProjectedProfit=projprofit,
                            ActualProfit=actprofit)
            bg._Total = budgetcost
            DBSession.add(bg)

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
        runningindex = 7
        incomeindex = 8
        clientindex = 10
        projprofitindex = 11
        actprofitindex = 12
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

            if code in changedbgcodes:
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
        # build the budgetitems
        #======================================================================
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
            # set the costs to 0 if theres a problem
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
            try:
                running = float(sheet.cell(x, runningindex).value)
            except ValueError, e:
                running = 0
            try:
                income = float(sheet.cell(x, incomeindex).value)
            except ValueError, e:
                income = 0
            try:
                client = float(sheet.cell(x, clientindex).value)
            except ValueError, e:
                client = 0
            try:
                projprofit = float(sheet.cell(x, projprofitindex).value)
            except ValueError, e:
                projprofit = 0
            try:
                actprofit = float(sheet.cell(x, actprofitindex).value)
            except ValueError, e:
                actprofit = 0

            # if the code has been changed assign it here
            if code in changedbicodes:
                if changedbicodes[code] != 149999:
                    code = changedbicodes[code]
            # if the parent is negative it refers to a node in the same table
            if parentcode <= 0:
                if parentcode == 0:
                    parentcode = 149999
                else:
                    parentcode = -parentcode
                    if parentcode in changedbicodes:
                        parentcode = changedbicodes[parentcode]
            # otherwise check if the parent code has changed
            elif parentcode in changedbgcodes:
                parentcode = changedbgcodes[parentcode]

            # build the budgetitem and add it
            bi = BudgetItem(ID=code, Name=name,
                            Description=description,
                            ParentID=parentcode,
                            Unit=measureunit,
                            OrderCost=ordercost,
                            RunningCost=running,
                            ClaimedCost=claimedcost,
                            IncomeRecieved=income,
                            ClientCost=client,
                            ProjectedProfit=projprofit,
                            ActualProfit=actprofit)
            DBSession.add(bi)

            # set the costs
            bi._Total = budgetcost
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
        runningindex = 7
        incomeindex = 9
        clientindex = 10
        projprofitindex = 11
        actprofitindex = 12

        changedcocodes = {}
        changedcoparentcodes = {}

        print "getting codes"
        # correct negative codes and circular dependancies
        # negative codes refer to a parent that is a budgetitem
        for x in range(1, sheet.nrows):
            code = int(sheet.cell(x, codeindex).value)
            # if code == 4876:
            #     import pdb
            #     pdb.set_trace()
            try:
                pid = int(sheet.cell(x, parentindex).value)
            except ValueError, e:
                pid = 149999

            # check if parent id is negative
            if pid < 0:
                pid = -pid
                # if it is check if it has been changed
                # add it as a negative in the list to diffrentiate it
                if pid in changedbicodes:
                    changedcoparentcodes[-pid] = changedbicodes[pid]

            # else if the parent is changed in the budgetgroups
            elif pid in changedbgcodes:
                changedcoparentcodes[pid] = changedbgcodes[pid]
            # check if the code is used by any other node
            if DBSession.query(Node).filter_by(ID=code).first():
                newcode += 1
                changedcocodes[code] = newcode

        print "Converting Components table"
        # build the components
        # =====================================================================
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
            try:
                running = float(sheet.cell(x, runningindex).value)
            except ValueError, e:
                running = 0
            try:
                income = float(sheet.cell(x, incomeindex).value)
            except ValueError, e:
                income = 0
            try:
                client = float(sheet.cell(x, clientindex).value)
            except ValueError, e:
                client = 0
            try:
                projprofit = float(sheet.cell(x, projprofitindex).value)
            except ValueError, e:
                projprofit = 0
            try:
                actprofit = float(sheet.cell(x, actprofitindex).value)
            except ValueError, e:
                actprofit = 0

            # if the code has been changed assign it here
            if code in changedcocodes:
                if changedcocodes[code] != 149999:
                    code = changedcocodes[code]
            # check if the parentcode has changed
            if parentcode in changedcoparentcodes:
                parentcode = changedcoparentcodes[parentcode]
            elif parentcode<0:
                parentcode = -parentcode

            # build the resource this component uses
            # check if the component references a new resource
            # format the name of the component
            beginindex = name.find(".") + 1

            checkname = name[beginindex:].strip()

            parent = DBSession.query(Node).filter_by(ID=parentcode).first()
            if parent == None:
                print "parent none"
                import pdb
                pdb.set_trace()
            else:
                projectid = parent.getProjectID()
                resourcecategory = DBSession.query(ResourceCategory).filter_by(ParentID=projectid).first()
                if resourcecategory == None:
                    print "resourcecat none"
                    import pdb
                    pdb.set_trace()
                else:
                    resource = DBSession.query(Resource).filter_by(Name=checkname).first()
                    if resource == None:
                        # resource does not exist yet
                        # build the resource
                        newcode += 1
                        resourceid = newcode
                        resourcecode = generateResourceCode(checkname)
                        resource = Resource(ID=resourceid,
                                        Code=resourcecode,
                                        Name=checkname,
                                        Description=description,
                                        Rate=rate,
                                        ParentID=resourcecategory.ID)

                        DBSession.add(resource)
                        co = Component(ID=code,
                                        ResourceID=resourceid,
                                        Type=cotype,
                                        Unit=measureunit,
                                        ParentID=parentcode,
                                        OrderCost=ordercost,
                                        RunningCost=running,
                                        ClaimedCost=claimedcost,
                                        IncomeRecieved=income,
                                        ClientCost=client,
                                        ProjectedProfit=projprofit,
                                        ActualProfit=actprofit)
                        co._Total = budgetcost
                        co._Quantity = quantity
                        DBSession.add(co)
                        try:
                            transaction.commit()
                        except IntegrityError:
                            print "error building resource and component"
                            import pdb
                            pdb.set_trace()
                    else:
                        if resource in resourcecategory.Children:
                            # the resource exists and it is already in
                            # the resource category
                            co = Component(ID=code,
                                        ResourceID=resource.ID,
                                        Type=cotype,
                                        Unit=measureunit,
                                        ParentID=parentcode,
                                        OrderCost=ordercost,
                                        RunningCost=running,
                                        ClaimedCost=claimedcost,
                                        IncomeRecieved=income,
                                        ClientCost=client,
                                        ProjectedProfit=projprofit,
                                        ActualProfit=actprofit)
                            co._Total = budgetcost
                            co._Quantity = quantity
                            DBSession.add(co)
                            try:
                                transaction.commit()
                            except IntegrityError:
                                print "error cuilding compn"
                                import pdb
                                pdb.set_trace()
                        else:
                            # the resource exists but it is not in the
                            # resource category
                            # so a resource is made that is similar to the
                            # existing one, but with a different id
                            newcode += 1
                            resourceid = newcode
                            resourcecode = resource.Code
                            newresource = Resource(ID=resourceid,
                                            Code=resourcecode,
                                            Name=checkname,
                                            Description=description,
                                            Rate=rate,
                                            ParentID=resourcecategory.ID)
                            newcode += 1
                            resourceid = newcode
                            DBSession.add(newresource)
                            co = Component(ID=code,
                                        ResourceID=resourceid,
                                        Type=cotype,
                                        Unit=measureunit,
                                        ParentID=parentcode,
                                        OrderCost=ordercost,
                                        RunningCost=running,
                                        ClaimedCost=claimedcost,
                                        IncomeRecieved=income,
                                        ClientCost=client,
                                        ProjectedProfit=projprofit,
                                        ActualProfit=actprofit)
                            co._Total = budgetcost
                            co._Quantity = quantity
                            DBSession.add(co)
                            try:
                                transaction.commit()
                            except IntegrityError:
                                print "error copying and building comp"
                                import pdb
                                pdb.set_trace()


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
        # print "Adding resource categories"
        # print "Adding resources to the resource categories"
        # get the projects
        projectlist = DBSession.query(Project).all()
        length = float(len(projectlist))
        percentile = length / 100.0
        # print "Percentage done: "
        # counter = 2
        # x = 0
        # # iterate over all the projects, get the components in them, and if
        # # a resource that is in a component is not in the category, add it
        # for project in projectlist:
        #     if x == int(percentile * counter):
        #         counter += 1
        #         stdout.write("\r%d" % counter + "%")
        #         stdout.flush()
        #         sleep(1)
        #     # get the id that that component is in
        #     projectid = project.ID
        #     parentid = project.ID
        #     newcode += 1
        #     categoryid = newcode
        #     resourcecategory = ResourceCategory(ID=categoryid,
        #                                     Name=str(project.Name) +
        #                                     " Resource Category",
        #                                     Description="Category Description",
        #                                     ParentID=parentid)

        #     # get the components in the project
        #     componentlist = project.getComponents()
        #     resourcecategory.addResources(componentlist)

        #     DBSession.add(resourcecategory)
        #     x += 1
        # stdout.write("\n")

        print "Recalculating the totals of the projects"
        # projectlist = DBSession.query(Project).all()
        print "Percentage done: "
        counter = 2
        x = 0
        for project in projectlist:
            if x == int(percentile * counter):
                counter += 1
                stdout.write("\r%d" % counter + "%")
                stdout.flush()
                sleep(1)
            # project.recalculateTotal()
            # comlist = project.getComponents()
            # for co in comlist:
            #     if len(co.Children) >0:
            #         print co
            #         print co.Children
            x+=1
            print "Project " + str(x) + " total: " +str(project.Total)

    print "done"











