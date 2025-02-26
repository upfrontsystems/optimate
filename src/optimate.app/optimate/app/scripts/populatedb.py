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
    ResourceType,
    Unit,
    City,
    Overhead,
    ResourceCategory,
    Resource,
    ResourceUnit,
    ResourcePart,
    Client,
    Supplier,
    CompanyInformation,
    Order,
    OrderItem,
    User,
    Invoice
)

from sqlalchemy import (
    Column,
    Index,
    Integer,
    Text,
    ForeignKey,
)

import sys
import json
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
from datetime import datetime

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
        try:
            os.remove(('/').join(pathlist[:-5]) + '/server.sqlite')
        except OSError, o:
            pass
        config_uri = ('/').join(pathlist[:-5]) + '/development.ini'
        exceldatapath = ('/').join(pathlist[:-5]) + '/exceldata/'
    else:
        pathlist = cwd.split('\\')
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
        # add the companyinformation
        print "Adding Company Information"
        companybook = xlrd.open_workbook(exceldatapath + 'CompanyProfile.xls')
        sheet = companybook.sheet_by_index(0)
        code = sheet.cell(1, 0).value
        try:
            name = sheet.cell(1, 1).value
            name = name.encode('ascii')
        except UnicodeEncodeError, u:
            name = unicodedata.normalize('NFKD',
                                name).encode('ascii', 'ignore')
        try:
            address = sheet.cell(1, 2).value
            address = address.encode('ascii')
        except UnicodeEncodeError, u:
            address = unicodedata.normalize('NFKD',
                                address).encode('ascii', 'ignore')
        tel = sheet.cell(1, 3).value
        fax = sheet.cell(1, 4).value
        cell = sheet.cell(1, 5).value
        tax = float(sheet.cell(1, 8).value)
        try:
            bankname = sheet.cell(1, 2).value
            bankname = bankname.encode('ascii')
        except UnicodeEncodeError, u:
            bankname = unicodedata.normalize('NFKD',
                                bankname).encode('ascii', 'ignore')
        bankcode = sheet.cell(1, 10).value
        accnum = sheet.cell(1, 11).value
        try:
            accname = sheet.cell(1, 2).value
            accname = accname.encode('ascii')
        except UnicodeEncodeError, u:
            accname = unicodedata.normalize('NFKD',
                                accname).encode('ascii', 'ignore')

        companyinfo = CompanyInformation(ID = code,
                Name = name,
                Address = address,
                Tel = tel,
                Fax = fax,
                Cell = cell,
                BankName = bankname,
                BranchCode = bankcode,
                AccountNo = accnum,
                AccountName = accname,
                DefaultTaxrate = tax)

        DBSession.add(companyinfo)
        transaction.commit()


        # add the root node
        root = Node(ID=0)
        DBSession.add(root)

        # add the error node
        # the children of this node will be deleted
        errornode = Project(Name='ErrorNode', ID=149999, ParentID=0)
        DBSession.add(errornode)

        print "Adding admin user"
        user = User()
        user.username = u'admin'
        user.set_password('admin')
        user.roles = json.dumps(['Administrator'])
        DBSession().merge(user)
        transaction.commit()

        # add the cities used in the clients, suppliers, and projects
        projectbook = xlrd.open_workbook(exceldatapath + 'Projects.xls')
        sheet = projectbook.sheet_by_index(0)
        cityindex = 9

        print "Building City table"
        for x in range(1, sheet.nrows):
            try:
                city = sheet.cell(x, cityindex).value
                city = city.encode('ascii')
            except UnicodeEncodeError, u:
                city = unicodedata.normalize('NFKD',
                                    city).encode('ascii', 'ignore')

            if len(city) > 0:
                existingcity = DBSession.query(City).filter_by(Name=city).first()
                if not existingcity:
                    newcity = City(Name=city)
                    DBSession.add(newcity)
                    transaction.commit()

        clientbook = xlrd.open_workbook(exceldatapath + 'Client.xls')
        sheet = clientbook.sheet_by_index(0)
        cityindex = 3

        for x in range(1, sheet.nrows):
            try:
                city = sheet.cell(x, cityindex).value
                city = city.encode('ascii')
            except UnicodeEncodeError, u:
                city = unicodedata.normalize('NFKD',
                                    city).encode('ascii', 'ignore')

            if len(city) > 0:
                existingcity = DBSession.query(City).filter_by(Name=city).first()
                if not existingcity:
                    newcity = City(Name=city)
                    DBSession.add(newcity)
                    transaction.commit()

        supplierbook = xlrd.open_workbook(exceldatapath + 'Supplier.xls')
        sheet = supplierbook.sheet_by_index(0)
        cityindex = 3

        for x in range(1, sheet.nrows):
            try:
                city = sheet.cell(x, cityindex).value
                city = city.encode('ascii')
            except UnicodeEncodeError, u:
                city = unicodedata.normalize('NFKD',
                                    city).encode('ascii', 'ignore')

            if len(city) > 0:
                existingcity = DBSession.query(City).filter_by(Name=city).first()
                if not existingcity:
                    newcity = City(Name=city)
                    DBSession.add(newcity)
                    transaction.commit()


        # open the excel projects spreadsheet
        projectbook = xlrd.open_workbook(exceldatapath + 'Projects.xls')
        sheet = projectbook.sheet_by_index(0)
        codeindex = 0
        nameindex = 1
        descriptionindex = 2
        clientidindex = 4
        cityindex = 9
        budgetcostindex = 12
        ordercostindex = 13
        claimedcostindex = 15
        runningindex = 14
        incomeindex = 16
        clientcostindex = 17
        projprofitindex = 18
        actprofitindex = 19

        # start the new code for items at 150000
        newcode = 150000

        print 'Converting Project table'
        # build the projects
        # =====================================================================
        for x in range(1, sheet.nrows):
            code = int(sheet.cell(x, codeindex).value)
            # check for unicode issues in the name and description
            try:
                name = sheet.cell(x, nameindex).value
                name = name.encode('ascii')
            except UnicodeEncodeError, u:
                name = unicodedata.normalize('NFKD',
                                    name).encode('ascii', 'ignore')
            try:
                description = sheet.cell(x, descriptionindex).value
                description = description.encode('ascii')
            except UnicodeEncodeError, u:
                description = unicodedata.normalize('NFKD',
                                    description).encode('ascii', 'ignore')
            try:
                city = sheet.cell(x, cityindex).value
                city = city.encode('ascii')
            except UnicodeEncodeError, u:
                city = unicodedata.normalize('NFKD',
                                    city).encode('ascii', 'ignore')

            try:
                clientid = int(sheet.cell(x, clientidindex).value)
            except ValueError:
                clientid = None

            # convert the costs to Decimal and if there are issues set it to 0
            try:
                budgetcost = Decimal(sheet.cell(x,
                    budgetcostindex).value).quantize(Decimal('.01'))
            except InvalidOperation, e:
                budgetcost = Decimal(0.00)
            try:
                ordercost = Decimal(sheet.cell(x,
                    ordercostindex).value).quantize(Decimal('.01'))
            except InvalidOperation, e:
                ordercost = Decimal(0.00)
            try:
                claimedcost = Decimal(sheet.cell(x,
                    claimedcostindex).value).quantize(Decimal('.01'))
            except InvalidOperation, e:
                claimedcost = Decimal(0.00)
            try:
                running = Decimal(sheet.cell(x,
                    runningindex).value).quantize(Decimal('.01'))
            except InvalidOperation, e:
                running = Decimal(0.00)
            try:
                income = Decimal(sheet.cell(x,
                    incomeindex).value).quantize(Decimal('.01'))
            except InvalidOperation, e:
                income = Decimal(0.00)
            try:
                clientcost = Decimal(sheet.cell(x,
                    clientcostindex).value).quantize(Decimal('.01'))
            except InvalidOperation, e:
                clientcost = Decimal(0.00)
            try:
                projprofit = Decimal(sheet.cell(x,
                    projprofitindex).value).quantize(Decimal('.01'))
            except InvalidOperation, e:
                projprofit = Decimal(0.00)
            try:
                actprofit = Decimal(sheet.cell(x,
                    actprofitindex).value).quantize(Decimal('.01'))
            except InvalidOperation, e:
                actprofit = Decimal(0.00)

            cityid = None
            if len(city) > 0:
                cityid = DBSession.query(City).filter_by(Name=city).first().ID

            # build the project and add it to the database
            project = Project(ID=code, Name=name,
                              Description=description,
                              ParentID=0,
                              ClientID=clientid,
                              CityID=cityid,
                              _Total = budgetcost,
                              OrderCost=ordercost,
                              RunningCost=running,
                              ClaimedCost=claimedcost,
                              IncomeReceived=income,
                              ClientCost=clientcost,
                              ProjectedProfit=projprofit,
                              ActualProfit=actprofit)
            DBSession.add(project)
            DBSession.flush()

        transaction.commit()

        print 'Adding resource categories'
        projectlist = DBSession.query(Project).all()
        # add a resourcecategory to each resource, using default values
        for project in projectlist:
            parentid = project.ID
            newcode += 1
            resourcecategory = ResourceCategory(ID=newcode,
                                            Name='Resource List',
                                            Description='List of Resources',
                                            ParentID=parentid)

            DBSession.add(resourcecategory)
        transaction.commit()

        print 'Converting BudgetGroups table'
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
        print 'Percentage done: '
        counter = 2
        # build the budgetgroups
        for x in range(1, sheet.nrows):
            if x == int(percentile * counter):
                counter += 1
                stdout.write('\r%d' % counter + '%')
                stdout.flush()
                sleep(1)

            code = int(sheet.cell(x, codeindex).value)
            # correct unicode issues
            try:
                name = sheet.cell(x, nameindex).value
                name = name.encode('ascii')
            except UnicodeEncodeError, u:
                name = unicodedata.normalize('NFKD',
                                    name).encode('ascii', 'ignore')
            try:
                description = sheet.cell(x, descriptionindex).value
                description = description.encode('ascii')
            except UnicodeEncodeError, u:
                description = unicodedata.normalize('NFKD',
                                    description).encode('ascii', 'ignore')
            # set the costs to 0 if theres a problem
            try:
                budgetcost = Decimal(sheet.cell(x,
                    budgetcostindex).value).quantize(Decimal('.01'))
            except InvalidOperation, e:
                budgetcost = Decimal(0.00)
            try:
                ordercost = Decimal(sheet.cell(x,
                    ordercostindex).value).quantize(Decimal('.01'))
            except InvalidOperation, e:
                ordercost = Decimal(0.00)
            try:
                claimedcost = Decimal(sheet.cell(x,
                    claimedcostindex).value).quantize(Decimal('.01'))
            except InvalidOperation, e:
                claimedcost = Decimal(0.00)
            try:
                parentcode = int(sheet.cell(x,
                    parentindex).value)
            except ValueError, e:
                parentcode = 149999
            try:
                running = Decimal(sheet.cell(x,
                    runningindex).value).quantize(Decimal('.01'))
            except InvalidOperation, e:
                running = Decimal(0.00)
            try:
                income = Decimal(sheet.cell(x,
                    incomeindex).value).quantize(Decimal('.01'))
            except InvalidOperation, e:
                income = Decimal(0.00)
            try:
                client = Decimal(sheet.cell(x,
                    clientindex).value).quantize(Decimal('.01'))
            except InvalidOperation, e:
                client = Decimal(0.00)
            try:
                projprofit = Decimal(sheet.cell(x,
                    projprofitindex).value).quantize(Decimal('.01'))
            except InvalidOperation, e:
                projprofit = Decimal(0.00)
            try:
                actprofit = Decimal(sheet.cell(x,
                    actprofitindex).value).quantize(Decimal('.01'))
            except InvalidOperation, e:
                actprofit = Decimal(0.00)

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
                            _Total=budgetcost,
                            OrderCost=ordercost,
                            RunningCost=running,
                            ClaimedCost=claimedcost,
                            IncomeReceived=income,
                            ClientCost=client,
                            ProjectedProfit=projprofit,
                            ActualProfit=actprofit)
            DBSession.add(bg)

        transaction.commit()
        stdout.write('\n')

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

        print 'Converting Budgetitems table'
        # display the precentage progress
        length = float(sheet.nrows)
        percentile = length / 100.0
        print 'Percentage done: '
        counter = 2
        # build the budgetitems
        #======================================================================
        for x in range(1, sheet.nrows):
            if x == int(percentile * counter):
                counter += 1
                stdout.write('\r%d' % counter + '%')
                stdout.flush()
                sleep(1)

            code = int(sheet.cell(x, codeindex).value)
            # check for unicode issues
            try:
                name = sheet.cell(x, nameindex).value
                name = name.encode('ascii')
            except UnicodeEncodeError, u:
                name = unicodedata.normalize('NFKD',
                                    name).encode('ascii', 'ignore')
            try:
                description = sheet.cell(x, descriptionindex).value
                description = description.encode('ascii')
            except UnicodeEncodeError, u:
                description = unicodedata.normalize('NFKD',
                                    description).encode('ascii', 'ignore')
            # set the costs to 0 if theres a problem
            try:
                budgetcost = Decimal(sheet.cell(x,
                    budgetcostindex).value).quantize(Decimal('.01'))
            except InvalidOperation, e:
                budgetcost = Decimal(0.00)
            try:
                ordercost = Decimal(sheet.cell(x,
                    ordercostindex).value).quantize(Decimal('.01'))
            except InvalidOperation, e:
                ordercost = Decimal(0.00)
            try:
                claimedcost = Decimal(sheet.cell(x,
                    claimedcostindex).value).quantize(Decimal('.01'))
            except InvalidOperation, e:
                claimedcost = Decimal(0.00)
            try:
                parentcode = int(sheet.cell(x,
                    parentindex).value)
            except ValueError, e:
                parentcode = 0
            try:
                quantity = float(sheet.cell(x,
                    quantityindex).value)
            except ValueError, e:
                quantity = 0
            try:
                rate = Decimal(sheet.cell(x,
                    rateindex).value).quantize(Decimal('.01'))
            except InvalidOperation, e:
                rate = Decimal(0.00)
            try:
                running = Decimal(sheet.cell(x,
                    runningindex).value).quantize(Decimal('.01'))
            except InvalidOperation, e:
                running = Decimal(0.00)
            try:
                income = Decimal(sheet.cell(x,
                    incomeindex).value).quantize(Decimal('.01'))
            except InvalidOperation, e:
                income = Decimal(0.00)
            try:
                client = Decimal(sheet.cell(x,
                    clientindex).value).quantize(Decimal('.01'))
            except InvalidOperation, e:
                client = Decimal(0.00)
            try:
                projprofit = Decimal(sheet.cell(x,
                    projprofitindex).value).quantize(Decimal('.01'))
            except InvalidOperation, e:
                projprofit = Decimal(0.00)
            try:
                actprofit = Decimal(sheet.cell(x,
                    actprofitindex).value).quantize(Decimal('.01'))
            except InvalidOperation, e:
                actprofit = Decimal(0.00)

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
                            _ItemQuantity=quantity,
                            _Rate=rate,
                            OrderCost=ordercost,
                            RunningCost=running,
                            ClaimedCost=claimedcost,
                            IncomeReceived=income,
                            ClientCost=client,
                            ProjectedProfit=projprofit,
                            ActualProfit=actprofit)
            DBSession.add(bi)

        transaction.commit()
        stdout.write('\n')

        # build the unit table
        print 'Converting Unit table'
        unitbook = xlrd.open_workbook(exceldatapath + 'Unit.xls')
        sheet = unitbook.sheet_by_index(0)
        unitindex = 0

        for x in range(1, sheet.nrows):
            measureunit = sheet.cell(x, unitindex).value
            newunit = Unit(Name=measureunit)
            DBSession.add(newunit)

        transaction.commit()

        print 'Converting Resource Type table'
        typebook = xlrd.open_workbook(exceldatapath + 'CompTypes.xls')
        sheet = typebook.sheet_by_index(0)
        codeindex = 0
        nameindex = 1

        for x in range(1, sheet.nrows):
            code = int(sheet.cell(x, codeindex).value)
            try:
                name = sheet.cell(x, nameindex).value
                name = name.encode('ascii')
            except UnicodeEncodeError, u:
                name = unicodedata.normalize('NFKD',
                                    name).encode('ascii', 'ignore')
            resourcetype = ResourceType(ID=code, Name=name)
            DBSession.add(resourcetype)

        transaction.commit()

        # build the components
        print 'Converting Components table'
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

        # correct negative codes and circular dependancies
        # negative codes refer to a parent that is a budgetitem
        for x in range(1, sheet.nrows):
            code = int(sheet.cell(x, codeindex).value)
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

        # build the components
        # =====================================================================
        length = float(sheet.nrows)
        percentile = length / 100.0
        print 'Percentage done: '
        counter = 2
        for x in range(1, sheet.nrows):
            if x == int(percentile * counter):
                counter += 1
                stdout.write('\r%d' % counter + '%')
                stdout.flush()
                sleep(1)

            code = int(sheet.cell(x, codeindex).value)
            measureunit = sheet.cell(x, unitindex).value
            try:
                name = sheet.cell(x, nameindex).value
                name = name.encode('ascii')
            except UnicodeEncodeError, u:
                name = unicodedata.normalize('NFKD',
                                    name).encode('ascii', 'ignore')
            try:
                description = sheet.cell(x, descriptionindex).value
                description = description.encode('ascii')
            except UnicodeEncodeError, u:
                description = unicodedata.normalize('NFKD',
                                    description).encode('ascii', 'ignore')
            try:
                budgetcost = Decimal(sheet.cell(x,
                    budgetcostindex).value).quantize(Decimal('.01'))
            except InvalidOperation, e:
                budgetcost = Decimal(0.00)
            try:
                ordercost = Decimal(sheet.cell(x,
                    ordercostindex).value).quantize(Decimal('.01'))
            except InvalidOperation, e:
                ordercost = Decimal(0.00)
            try:
                claimedcost = Decimal(sheet.cell(x,
                    claimedcostindex).value).quantize(Decimal('.01'))
            except InvalidOperation, e:
                claimedcost = Decimal(0.00)
            try:
                parentcode = int(sheet.cell(x,
                    parentindex).value)
            except ValueError, e:
                parentcode = 149999
            try:
                quantity = float(sheet.cell(x,
                    quantityindex).value)
            except ValueError, e:
                quantity = 0
            try:
                rate = Decimal(sheet.cell(x,
                    rateindex).value).quantize(Decimal('.01'))
            except InvalidOperation, e:
                rate = Decimal(0.00)
            try:
                running = Decimal(sheet.cell(x,
                    runningindex).value).quantize(Decimal('.01'))
            except InvalidOperation, e:
                running = Decimal(0.00)
            try:
                income = Decimal(sheet.cell(x,
                    incomeindex).value).quantize(Decimal('.01'))
            except InvalidOperation, e:
                income = Decimal(0.00)
            try:
                client = Decimal(sheet.cell(x,
                    clientindex).value).quantize(Decimal('.01'))
            except InvalidOperation, e:
                client = Decimal(0.00)
            try:
                projprofit = Decimal(sheet.cell(x,
                    projprofitindex).value).quantize(Decimal('.01'))
            except InvalidOperation, e:
                projprofit = Decimal(0.00)
            try:
                actprofit = Decimal(sheet.cell(x,
                    actprofitindex).value).quantize(Decimal('.01'))
            except InvalidOperation, e:
                actprofit = Decimal(0.00)
            try:
                rtype = int(sheet.cell(x, typeindex).value)
                if rtype == 0:
                    rtype = None
            except:
                rtype = None

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
            beginindex = name.find('.') + 1
            checkname = name[beginindex:].strip()
            # name ends in period
            if beginindex == 0:
                endindex = checkname.find(' ')
                # no space
                if endindex == -1:
                    # check if an integer
                    try:
                        integer = int(checkname)
                        checkname = ''
                    except ValueError:
                        pass
                else:
                    # check if the first word is an integer
                    newname = checkname[:endindex].strip()
                    try:
                        integer = int(newname)
                        checkname = checkname[endindex:].strip()
                    except ValueError:
                        pass

            if len(checkname) != 0:
                if parentcode != 149999:
                    # get the parent and resourcecategory
                    parent = DBSession.query(
                                    Node).filter_by(ID=parentcode).first()
                    projectid = parent.getProjectID()
                    resourcecategory = DBSession.query(
                        ResourceCategory).filter_by(ParentID=projectid).first()
                    rescatid = resourcecategory.ID
                    resource = DBSession.query(
                                Resource).filter_by(
                                ParentID=rescatid, Name=checkname).first()
                    # check if the resource is already in the resourcecategory
                    # if not get it from the database
                    if resource == None:
                        resource = DBSession.query(
                            Resource).filter_by(Name=checkname).first()

                        # if it already exists in the database create a new one
                        # and add it to the resourcecategory
                        if resource != None:
                            newcode += 1
                            resourceid = newcode
                            # get the id of the unit the resource is using
                            qry = DBSession.query(Unit).filter_by(
                                    Name=measureunit).first()
                            if qry:
                                measureunit = qry.ID
                            else:
                                measureunit = None
                            newresource = Resource(ID=resourceid,
                                            Type=rtype,
                                            Name=resource.Name,
                                            Code=resource.Code,
                                            UnitID=measureunit,
                                            _Rate=resource._Rate,
                                            Description=resource.Description)

                            resourcecategory.Children.append(newresource)
                            DBSession.flush()
                            resource = newresource

                    if resource == None:
                        # resource does not exist yet
                        # build the resource
                        newcode += 1
                        resourceid = newcode
                        resourcecode = generateResourceCode(checkname)
                        # get the unit id
                        qry = DBSession.query(Unit).filter_by(
                                    Name=measureunit).first()
                        if qry:
                            measureunit = qry.ID
                        else:
                            measureunit = None
                        resource = Resource(ID=resourceid,
                                        Type=rtype,
                                        Code=resourcecode,
                                        Name=checkname,
                                        Description=description,
                                        UnitID=measureunit,
                                        _Rate = rate,
                                        ParentID=resourcecategory.ID)
                        DBSession.add(resource)
                        co = Component(ID=code,
                                        ResourceID=resourceid,
                                        _ItemQuantity = quantity,
                                        ParentID=parentcode,
                                        OrderCost=ordercost,
                                        RunningCost=running,
                                        ClaimedCost=claimedcost,
                                        IncomeReceived=income,
                                        ClientCost=client,
                                        ProjectedProfit=projprofit,
                                        ActualProfit=actprofit)
                        DBSession.add(co)
                    else:
                        # the resource exists, create the component
                        co = Component(ID=code,
                                    ResourceID=resource.ID,
                                    _ItemQuantity = quantity,
                                    ParentID=parentcode,
                                    OrderCost=ordercost,
                                    RunningCost=running,
                                    ClaimedCost=claimedcost,
                                    IncomeReceived=income,
                                    ClientCost=client,
                                    ProjectedProfit=projprofit,
                                    ActualProfit=actprofit)
                        DBSession.add(co)
                    DBSession.flush()

        transaction.commit()
        stdout.write('\n')

        print 'Recalculating the totals of the projects'
        projectlist = DBSession.query(Project).all()
        length = float(len(projectlist))
        percentile = length / 100.0
        print 'Percentage done: '
        counter = 2
        x = 0
        for project in projectlist:
            if x == int(percentile * counter):
                counter += 1
                stdout.write('\r%d' % counter + '%')
                stdout.flush()
                sleep(1)
            project.recalculateTotal()
            x+=1

        transaction.commit()

        print '\nDeleting error node'
        deletethis = DBSession.query(Node).filter_by(ID=149999).first()
        DBSession.delete(deletethis)
        transaction.commit()

        print "Reorganising the Resources"
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

        # Client.__table__.drop(engine)
        # transaction.commit()
        # Supplier.__table__.drop(engine)
        # transaction.commit()

        # build the clients table
        # =====================================================================
        clientbook = xlrd.open_workbook(exceldatapath + 'Client.xls')
        sheet = clientbook.sheet_by_index(0)
        codeindex = 0
        nameindex = 1
        addresindex = 2
        cityindex = 3
        stateindex = 4
        countryindex = 5
        zipindex = 6
        phoneindex = 7
        cellularindex = 8
        faxindex = 9
        contactindex = 10

        cityindex = 3

        for x in range(1, sheet.nrows):
            try:
                city = sheet.cell(x, cityindex).value
                city = city.encode('ascii')
            except UnicodeEncodeError, u:
                city = unicodedata.normalize('NFKD',
                                    city).encode('ascii', 'ignore')



        print 'Converting Client table'
        for x in range(1, sheet.nrows):
            try:
                name = sheet.cell(x, nameindex).value
                name = name.encode('ascii')
            except UnicodeEncodeError, u:
                name = unicodedata.normalize('NFKD',
                                        name).encode('ascii', 'ignore')
            code = int(sheet.cell(x, codeindex).value)
            address = str(sheet.cell(x, addresindex).value).encode('ascii')
            city = str(sheet.cell(x, cityindex).value).encode('ascii')
            state = str(sheet.cell(x, stateindex).value).encode('ascii')
            country = str(sheet.cell(x, countryindex).value).encode('ascii')
            zipno = str(sheet.cell(x, zipindex).value).encode('ascii')
            phone = str(sheet.cell(x, phoneindex).value).encode('ascii')
            cellular = str(sheet.cell(x, cellularindex).value).encode('ascii')
            fax = str(sheet.cell(x, faxindex).value).encode('ascii')
            try:
                contact = sheet.cell(x, contactindex).value
                contact = contact.encode('ascii')
            except UnicodeEncodeError, u:
                contact = unicodedata.normalize('NFKD',
                                        contact).encode('ascii', 'ignore')
            cityid = None
            if len(city) > 0:
                cityid = DBSession.query(City).filter_by(Name=city).first().ID

            client = Client(ID=code,
                            Name=name,
                            Address=address,
                            CityID=cityid,
                            StateProvince=state,
                            Zipcode=zipno,
                            Phone=phone,
                            Cellular=cellular,
                            Fax=fax,
                            Contact=contact)
            DBSession.add(client)

        transaction.commit()

        # build the supplier table
        # =====================================================================
        supplierbook = xlrd.open_workbook(exceldatapath + 'Supplier.xls')
        sheet = supplierbook.sheet_by_index(0)

        print 'Converting Supplier table'
        for x in range(1, sheet.nrows):
            try:
                name = sheet.cell(x, nameindex).value
                name = name.encode('ascii')
            except UnicodeEncodeError, u:
                name = unicodedata.normalize('NFKD',
                                    name).encode('ascii', 'ignore')
            code = int(sheet.cell(x, codeindex).value)
            address = str(sheet.cell(x, addresindex).value).encode('ascii')
            city = str(sheet.cell(x, cityindex).value).encode('ascii')
            state = str(sheet.cell(x, stateindex).value).encode('ascii')
            country = str(sheet.cell(x, countryindex).value).encode('ascii')
            zipno = str(sheet.cell(x, zipindex).value).encode('ascii')
            phone = str(sheet.cell(x, phoneindex).value).encode('ascii')
            cellular = str(sheet.cell(x, cellularindex).value).encode('ascii')
            fax = str(sheet.cell(x, faxindex).value).encode('ascii')
            try:
                contact = sheet.cell(x, contactindex).value
                contact = contact.encode('ascii')
            except UnicodeEncodeError, u:
                contact = unicodedata.normalize('NFKD',
                                    contact).encode('ascii', 'ignore')
            cityid = None
            if len(city) > 0:
                cityid = DBSession.query(City).filter_by(Name=city).first().ID

            supplier = Supplier(ID=code,
                            Name=name,
                            Address=address,
                            CityID=cityid,
                            StateProvince=state,
                            Zipcode=zipno,
                            Phone=phone,
                            Cellular=cellular,
                            Fax=fax,
                            Contact=contact)
            DBSession.add(supplier)

        transaction.commit()

        # Order.__table__.drop(engine)
        # transaction.commit()
        # OrderItem.__table__.drop(engine)
        # transaction.commit()

        orderbook = xlrd.open_workbook(exceldatapath + 'Orders.xls')
        sheet = orderbook.sheet_by_index(0)
        codeindex = 0
        dateindex = 2
        authindex = 5
        projidindex = 6
        supidindex = 7
        clientidindex = 8
        totalindex = 9
        taxindex = 10
        deladdindex = 11
        ordertaxrate = {}


        print 'Converting Order table'
        for x in range(1, sheet.nrows):
            code = int(sheet.cell(x, codeindex).value)
            auth = str(sheet.cell(x, authindex).value).encode('ascii')
            try:
                projid = int(sheet.cell(x, projidindex).value)
                if projid == 0:
                    projid = None
            except:
                projid = None
            try:
                supid = int(sheet.cell(x, supidindex).value)
                if supid == 0:
                    supid = None
            except:
                supid = None
            try:
                clientid = sheet.cell(x, clientidindex).value
                if clientid == 0:
                    clientid = None
            except:
                clientid = None
            try:
                tup=xlrd.xldate_as_tuple(sheet.cell(x,
                                    dateindex).value,0)
                date = datetime(*(tup[0:5]))
            except ValueError, e:
                date = None
            try:
                total = Decimal(sheet.cell(x,
                    totalindex).value).quantize(Decimal('.01'))
            except InvalidOperation, e:
                total = Decimal(0.00)
            try:
                tax = float(sheet.cell(x, taxindex).value)
            except ValueError:
                tax = 0.0
            try:
                deladd = str(sheet.cell(x, deladdindex).value).encode('ascii')
            except UnicodeEncodeError:
                deladd = ""
            # store the order's tax rate in a dict
            ordertaxrate[str(code)] = tax

            order = Order(ID=code,
                            Authorisation=auth,
                            ProjectID=projid,
                            SupplierID=supid,
                            ClientID=clientid,
                            Total=total,
                            DeliveryAddress=deladd,
                            Date=date)
            DBSession.add(order)

        transaction.commit()

        orderitembook = xlrd.open_workbook(exceldatapath + 'OrderItem.xls')
        sheet = orderitembook.sheet_by_index(0)
        codeindex = 0
        orderidindex = 1
        compidindex = 2
        quantityindex = 5
        rateindex = 7

        print 'Converting Order Item table'
        for x in range(1, sheet.nrows):
            code = int(sheet.cell(x, codeindex).value)
            if code != 0:
                orderid = int(sheet.cell(x, orderidindex).value)
                compid = sheet.cell(x, compidindex).value
                try:
                    quantity = float(sheet.cell(x,
                        quantityindex).value)
                except ValueError, e:
                    quantity = 0.0
                try:
                    rate = Decimal(sheet.cell(x,
                        rateindex).value).quantize(Decimal('.01'))
                except InvalidOperation, e:
                    rate = Decimal(0.00)

                # if the code has been changed assign it here
                if compid in changedcocodes:
                    compid = changedcocodes[compid]

                if compid != 149999:
                    # make sure the component exists
                    comp = DBSession.query(Component).filter_by(ID=compid).first()
                    if comp:
                        comp.Ordered = Decimal(quantity * float(rate)
                            ).quantize(Decimal('.01'))
                        # set the order tax rate to the order item tax rate
                        tax = 0.0
                        try:
                            tax = ordertaxrate[str(orderid)]
                        except:
                            pass
                            # print ordertaxrate
                        orderitem = OrderItem(ID=code,
                                        OrderID=orderid,
                                        ComponentID=compid,
                                        _Quantity=quantity,
                                        _Rate=rate,
                                        VAT=tax)
                        DBSession.add(orderitem)

        transaction.commit()
        print "Recalculating Order totals"
        orders = DBSession.query(Order).all()
        # if the order has no order items delete it
        for order in orders:
            if len(order.OrderItems) == 0:
                DBSession.delete(order)
            else:
                order.resetTotal()
        transaction.commit()

        print "Setting Resource SupplierID"
        resources = DBSession.query(Resource).all()
        for resource in resources:
            component = resource.Components[0]
            if len(component.OrderItems) > 0:
                orderitem = component.OrderItems[0]
                if orderitem.Order:
                    resource.SupplierID = orderitem.Order.SupplierID

    print '\nDone'
