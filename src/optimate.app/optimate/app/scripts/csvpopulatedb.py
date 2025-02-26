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
    ResourcePart,
    ResourceUnit,
    Client,
    Supplier,
    CompanyInformation,
    Order,
    OrderItem,
    User,
    Invoice,
    Claim,
    Payment,
    UserRight
)

from sqlalchemy import (
    Column,
    Index,
    Integer,
    Text,
    ForeignKey,
)

import csv
import sys
import json
import transaction
from sqlalchemy import exc
from sqlalchemy.exc import IntegrityError
from sqlalchemy.sql import exists
from pyramid.scripts.common import parse_vars
from sqlalchemy import engine_from_config
from sqlalchemy.orm import sessionmaker
from sqlalchemy.orm import aliased
import xlrd
import os
from sys import stdout
from time import sleep
import unicodedata
from decimal import *
from itertools import groupby
from operator import itemgetter
from datetime import datetime
import re


resourcecodeno = 0

def generateResourceCode(resname):
    global resourcecodeno
    # the name is used by another resource already, use that code:
    resource = DBSession.query(Resource).filter_by(Name=resname).first()
    if resource:
        return resource.Code

    resname = resname[:3].upper()
    resname = re.sub(r"[^\w\s]", 'X', resname)
    resname = re.sub(r"\s+", 'X', resname)
    # generate a code for the resource
    if len(resname) < 3:
        resname = resname + (3-len(resname))*'X'

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
        # still getting the info from the excel files
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
            if name != 'S&T':
                if name == 'Subcontractors':
                    name = 'Subcontractor'
                if name != 'Profit & Attendance':
                    resourcetype = ResourceType(ID=code, Name=name)
                    DBSession.add(resourcetype)
        # add "Equipment" type
        DBSession.add(ResourceType(Name="Equipment"))
        transaction.commit()
        # add a none type resource type
        resourcetype = ResourceType(ID=0, Name="")
        DBSession.add(resourcetype)
        transaction.commit()
        # add the root node
        root = Node(ID=0)
        DBSession.add(root)

        # add the error node
        # the children of this node will be deleted
        # start the new code for items at 500000
        newcode = 5000000
        errorid = newcode - 1
        errornode = Project(Name='ErrorNode', ID=errorid, ParentID=0)
        DBSession.add(errornode)

        print "Adding admin user"
        user = User()
        user.username = u'admin'
        user.set_password('admin')
        for right in ['projects','orders','invoices','valuations',
                        'claims','payments','setup']:
            userright = UserRight(Function=right, Permission='edit')
            user.UserRights.append(userright)
        DBSession().merge(user)
        transaction.commit()

        # build the unit table
        print 'Converting Unit table'
        book = csv.reader(open(exceldatapath + 'data.csv/Unit.DB.csv', 'rb'))
        unitindex = 0

        next(book)
        for row in book:
            measureunit = row[unitindex]
            measureunit=measureunit.decode("utf-8")
            measureunit=measureunit.encode("ascii","ignore")
            newunit = Unit(Name=measureunit)
            DBSession.add(newunit)

        transaction.commit()

        # add the cities used in the clients, suppliers, and projects
        book = csv.reader(open(exceldatapath + 'data.csv/Projects.DB.csv', 'rb'))
        cityindex = 9

        print "Building City table"
        next(book)
        for row in book:
            city = row[cityindex]
            city = city.encode('ascii')
            if len(city) > 0:
                existing = DBSession.query(City).filter_by(Name=city).first()
                if not existing:
                    newcity = City(Name=city)
                    DBSession.add(newcity)
                    transaction.commit()

        book = csv.reader(open(exceldatapath + 'data.csv/Client.DB.csv', 'rb'))
        cityindex = 3

        next(book)
        for row in book:
            city = row[cityindex]
            city = city.encode('ascii')
            if len(city) > 0:
                existing = DBSession.query(City).filter_by(Name=city).first()
                if not existing:
                    newcity = City(Name=city)
                    DBSession.add(newcity)
                    transaction.commit()

        book = csv.reader(open(exceldatapath+'data.csv/Supplier.DB.csv', 'rb'))
        cityindex = 3

        next(book)
        for row in book:
            city = row[cityindex]
            city = city.encode('ascii')
            if len(city) > 0:
                existing = DBSession.query(City).filter_by(Name=city).first()
                if not existing:
                    newcity = City(Name=city)
                    DBSession.add(newcity)
                    transaction.commit()

        print 'Converting Project table'
        # # open the excel projects spreadsheet
        book = csv.reader(open(exceldatapath+'data.csv/Projects.DB.csv', 'rb'))
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
        projectids = []

        # # build the projects
        # # ====================================================================
        next(book)
        for row in book:
            code = int(row[codeindex])
            name = row[nameindex]
            name=name.decode("utf-8")
            name=name.encode("ascii","ignore")
            description = str(row[descriptionindex])

            city = str(row[cityindex])
            try:
                clientid = int(row[clientidindex])
            except ValueError:
                clientid = None

            # convert the costs to Decimal and if there are issues set it to 0
            # try:
            #     budgetcost = Decimal(row[budgetcostindex]).quantize(Decimal('.01'))
            # except InvalidOperation, e:
            #     budgetcost = Decimal(0.00)
            # try:
            #     ordercost = Decimal(row[ordercostindex]).quantize(Decimal('.01'))
            # except InvalidOperation, e:
            #     ordercost = Decimal(0.00)
            # try:
            #     claimedcost = Decimal(row[claimedcostindex]).quantize(Decimal('.01'))
            # except InvalidOperation, e:
            #     claimedcost = Decimal(0.00)
            # try:
            #     running = Decimal(row[runningindex]).quantize(Decimal('.01'))
            # except InvalidOperation, e:
            #     running = Decimal(0.00)
            # try:
            #     income = Decimal(row[incomeindex]).quantize(Decimal('.01'))
            # except InvalidOperation, e:
            #     income = Decimal(0.00)
            # try:
            #     clientcost = Decimal(row[clientcostindex]).quantize(Decimal('.01'))
            # except InvalidOperation, e:
            #     clientcost = Decimal(0.00)
            # try:
            #     projprofit = Decimal(row[projprofitindex]).quantize(Decimal('.01'))
            # except InvalidOperation, e:
            #     projprofit = Decimal(0.00)
            # try:
            #     actprofit = Decimal(row[actprofitindex]).quantize(Decimal('.01'))
            # except InvalidOperation, e:
            #     actprofit = Decimal(0.00)

            cityid = None
            if len(city) > 0:
                cityid = DBSession.query(City).filter_by(Name=city).first().ID

            # build the project and add it to the database
            if code in projectids:
                continue
            else:
                projectids.append(code)
            project = Project(ID=code, Name=name,
                              Description=description,
                              ParentID=0,
                              ClientID=clientid,
                              CityID=cityid,
                              # _Total = budgetcost,
                              # OrderCost=ordercost,
                              # RunningCost=running,
                              # ClaimedCost=claimedcost,
                              # IncomeReceived=income,
                              # ClientCost=clientcost,
                              # ProjectedProfit=projprofit,
                              # ActualProfit=actprofit
                              )
            DBSession.add(project)

        transaction.commit()

        projects = DBSession.query(Project).all()
        for project in projects:
            parentid = project.ID
            newcode += 1
            resourcecategory = ResourceCategory(ID=newcode,
                                            Name='Resource List',
                                            Description='List of Resources',
                                            ParentID=parentid)
            DBSession.add(resourcecategory)

        print 'Converting BudgetGroups table'
        # build the budgetgroups
        # =====================================================================
        book = csv.reader(
                    open(exceldatapath + 'data.csv/BudgetGroups.DB.csv', 'rb'))
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
        budgetgroupids = []

        # correct negative codes and circular dependancies
        next(book)
        for row in book:
            code = int(row[codeindex])

            try:
                pid = int(row[parentindex])
            except ValueError, e:
                pid = errorid
            if pid < 0:
                pid = -pid
                if code == pid:
                    changedbgcodes[pid] = errorid
                elif pid not in changedbgcodes:
                    newcode += 1
                    changedbgcodes[pid] = newcode

        # build the budgetgroups
        book = csv.reader(
                    open(exceldatapath + 'data.csv/BudgetGroups.DB.csv', 'rb'))
        next(book)
        for row in book:
            code = int(row[codeindex])
            try:
                parentcode = int(row[parentindex])
            except ValueError, e:
                parentcode = errorid
            name = row[nameindex]
            name=name.decode("utf-8")
            name=name.encode("ascii","ignore")
            description = str(row[descriptionindex])
            # set the costs to 0 if theres a problem
            # try:
            #     budgetcost = Decimal(row[budgetcostindex]).quantize(Decimal('.01'))
            # except InvalidOperation, e:
            #     budgetcost = Decimal(0.00)
            # try:
            #     ordercost = Decimal(row[ordercostindex]).quantize(Decimal('.01'))
            # except InvalidOperation, e:
            #     ordercost = Decimal(0.00)
            # try:
            #     claimedcost = Decimal(row[claimedcostindex]).quantize(Decimal('.01'))
            # except InvalidOperation, e:
            #     claimedcost = Decimal(0.00)
            # try:
            #     running = Decimal(row[runningindex]).quantize(Decimal('.01'))
            # except InvalidOperation, e:
            #     running = Decimal(0.00)
            # try:
            #     income = Decimal(row[incomeindex]).quantize(Decimal('.01'))
            # except InvalidOperation, e:
            #     income = Decimal(0.00)
            # try:
            #     clientcost = Decimal(row[clientcostindex]).quantize(Decimal('.01'))
            # except InvalidOperation, e:
            #     clientcost = Decimal(0.00)
            # try:
            #     projprofit = Decimal(row[projprofitindex]).quantize(Decimal('.01'))
            # except InvalidOperation, e:
            #     projprofit = Decimal(0.00)
            # try:
            #     actprofit = Decimal(row[actprofitindex]).quantize(Decimal('.01'))
            # except InvalidOperation, e:
            #     actprofit = Decimal(0.00)

            # if the code has been changed assign it here
            if code in changedbgcodes:
                if changedbgcodes[code] != errorid:
                    code = changedbgcodes[code]
            # if it is negative it refers to a parent in the same table
            # budgetgroups should not refer to the root
            if parentcode <= 0:
                if parentcode == 0:
                    parentcode = errorid
                else:
                    parentcode = -parentcode
                    if parentcode in changedbgcodes:
                        parentcode = changedbgcodes[parentcode]

            # build the budgetgroup and add it
            if code in budgetgroupids:
                continue
            else:
                budgetgroupids.append(code)

            bg = BudgetGroup(ID=code,
                            Name=name,
                            Description=description,
                            ParentID=parentcode,
                            # _Total=budgetcost,
                            # OrderCost=ordercost,
                            # RunningCost=running,
                            # ClaimedCost=claimedcost,
                            # IncomeReceived=income,
                            # ClientCost=clientcost,
                            # ProjectedProfit=projprofit,
                            # ActualProfit=actprofit
                            )
            DBSession.add(bg)

        transaction.commit()

        print 'Converting BudgetItems table'
        # build the budgetitems
        book = csv.reader(
                open(exceldatapath + 'data.csv/BudgetItems.DB.csv', 'rb'))
        length = sum(1 for row in book)
        book = csv.reader(
                open(exceldatapath + 'data.csv/BudgetItems.DB.csv', 'rb'))
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
        nesteditems = []

        # correct negative codes and circular dependancies
        next(book)
        for row in book:
            code = int(row[codeindex])
            try:
                pid = int(row[parentindex])
            except ValueError, e:
                pid = errorid
            if pid < 0:
                pid = -pid
                if pid not in changedbicodes:
                    pid = int(pid)
                    newcode += 1
                    changedbicodes[pid] = newcode
                    if code == pid:
                        changedbicodes[pid] = errorid

            if code in changedbgcodes:
                newcode += 1
                changedbicodes[code] = newcode
                if code == pid:
                    changedbicodes[pid] = errorid
            if DBSession.query(Node).filter_by(ID=code).first():
                newcode += 1
                changedbicodes[code] = newcode

        book = csv.reader(
                    open(exceldatapath + 'data.csv/BudgetItems.DB.csv', 'rb'))
        percentile = length / 100.0
        print 'Percentage done: '
        counter = 1
        x = 0
        next(book)
        budgetitemids = []
        for row in book:
            x +=1
            if x == int(percentile * counter):
                counter += 1
                stdout.write('\r%d' % counter + '%')
                stdout.flush()
                sleep(1)
            biparent = False
            code = int(row[codeindex])

            if code in budgetitemids:
                continue
            else:
                budgetitemids.append(code)

            name = row[nameindex]
            name=name.decode("utf-8")
            name=name.encode("ascii","ignore")
            description = str(row[descriptionindex])
            measureunit = row[unitindex]
            measureunit=measureunit.decode("utf-8")
            measureunit=measureunit.encode("ascii","ignore")
            parentcode = int(row[parentindex])
            try:
                quantity = float(row[quantityindex])
            except ValueError, e:
                quantity = 0
            try:
                rate = Decimal(row[rateindex]).quantize(Decimal('.01'))
            except InvalidOperation, e:
                rate = Decimal(0.00)
            # set the costs to 0 if theres a problem
            # try:
            #     budgetcost = Decimal(row[budgetcostindex]).quantize(Decimal('.01'))
            # except InvalidOperation, e:
            #     budgetcost = Decimal(0.00)
            # try:
            #     ordercost = Decimal(row[ordercostindex]).quantize(Decimal('.01'))
            # except InvalidOperation, e:
            #     ordercost = Decimal(0.00)
            # try:
            #     claimedcost = Decimal(row[claimedcostindex]).quantize(Decimal('.01'))
            # except InvalidOperation, e:
            #     claimedcost = Decimal(0.00)
            # try:
            #     running = Decimal(row[runningindex]).quantize(Decimal('.01'))
            # except InvalidOperation, e:
            #     running = Decimal(0.00)
            # try:
            #     income = Decimal(row[incomeindex]).quantize(Decimal('.01'))
            # except InvalidOperation, e:
            #     income = Decimal(0.00)
            # try:
            #     client = Decimal(row[clientindex]).quantize(Decimal('.01'))
            # except InvalidOperation, e:
            #     client = Decimal(0.00)
            # try:
            #     projprofit = Decimal(row[projprofitindex]).quantize(Decimal('.01'))
            # except InvalidOperation, e:
            #     projprofit = Decimal(0.00)
            # try:
            #     actprofit = Decimal(row[actprofitindex]).quantize(Decimal('.01'))
            # except InvalidOperation, e:
            #     actprofit = Decimal(0.00)

            # if the code has been changed assign it here
            if code in changedbicodes:
                if changedbicodes[code] != errorid:
                    code = changedbicodes[code]
            # if the parent is negative it refers to a node in the same table
            if parentcode <= 0:
                if parentcode == 0:
                    parentcode=errorid
                else:
                    biparent = True
                    parentcode = -parentcode
                    if parentcode in changedbicodes:
                        parentcode = changedbicodes[parentcode]
            # otherwise check if the parent code has changed
            elif parentcode in changedbgcodes:
                parentcode = changedbgcodes[parentcode]

            # build the resource name this budgetitem uses
            # check if the budgetitem references a new resource
            # format the name of the budgetitem
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
                name = checkname
                if parentcode != errorid:
                    if biparent:
                        # this is a nested budgetitem
                        # there are only a few of them
                        # store their data to be sorted when done
                        bidata = {'ID': code,
                                    'Name': name,
                                    'Unit':measureunit,
                                    'Rate':rate,
                                    'Description':description,
                                    'Quantity': quantity,
                                    'ParentID': parentcode,
                                    # 'OrderCost':ordercost,
                                    # 'RunningCost':running,
                                    # 'ClaimedCost':claimedcost,
                                    # 'IncomeReceived':income,
                                    # 'ClientCost':client,
                                    # 'ProjectedProfit':projprofit,
                                    # 'ActualProfit':actprofit
                                }
                        nesteditems.append(bidata)
                    else:
                        # the budgetitem is not nested
                        # get the parent resource category
                        parent = DBSession.query(Node
                                        ).filter_by(ID=parentcode).first()
                        if parent:
                            projectid = parent.getProjectID()
                            if projectid != errorid and projectid !=0:
                                resourcecategory = DBSession.query(
                                                        ResourceCategory
                                                        ).filter_by(
                                                            ParentID=projectid
                                                        ).first()
                                # check the resource exists
                                # in the resource category
                                resource = None
                                resource = DBSession.query(Resource).filter_by(
                                        ParentID=resourcecategory.ID, Name=name
                                        ).first()

                                if resource:
                                    # the resource exists
                                    # build the budgetitem and add it
                                    bi = BudgetItem(ID=code,
                                                    ResourceID=resource.ID,
                                                    ParentID=parentcode,
                                                    _Quantity=quantity,
                                                    # OrderCost=ordercost,
                                                    # RunningCost=running,
                                                    # ClaimedCost=claimedcost,
                                                    # IncomeReceived=income,
                                                    # ClientCost=client,
                                                    # ProjectedProfit=projprofit,
                                                    # ActualProfit=actprofit
                                                    )
                                    DBSession.add(bi)
                                else:
                                    # the resource does not exist
                                    # get the id of the unit of the resource
                                    qry = DBSession.query(Unit).filter_by(
                                            Name=measureunit).first()
                                    if qry:
                                        measureunit = qry.ID
                                    else:
                                        measureunit = None
                                    resourcecode = generateResourceCode(name)
                                    newcode+=1
                                    resource = ResourceUnit(ID=newcode,
                                                    Code=resourcecode,
                                                    Name=name,
                                                    UnitID=measureunit,
                                                    _Rate=rate,
                                                    Type=0,
                                                    Description=description,
                                                    ParentID=resourcecategory.ID)
                                    DBSession.add(resource)
                                    bi = BudgetItem(ID=code,
                                                    _Quantity=quantity,
                                                    ResourceID=resource.ID,
                                                    ParentID=parentcode,
                                                    # OrderCost=ordercost,
                                                    # RunningCost=running,
                                                    # ClaimedCost=claimedcost,
                                                    # IncomeReceived=income,
                                                    # ClientCost=client,
                                                    # ProjectedProfit=projprofit,
                                                    # ActualProfit=actprofit,
                                                    )
                                    DBSession.add(bi)
                                DBSession.flush()

        for storeditem in nesteditems:
            code = storeditem['ID']
            parentcode = storeditem['ParentID']
            name = storeditem['Name']
            rate = storeditem['Rate']
            description = storeditem['Description']
            quantity = storeditem['Quantity']
            measureunit = storeditem['Unit']
            # running = storeditem['RunningCost']
            # claimedcost = storeditem['ClaimedCost']
            # income = storeditem['IncomeReceived']
            # client = storeditem['ClientCost']
            # projprofit = storeditem['ProjectedProfit']
            # actprofit = storeditem['ActualProfit']
            # get the parent resource unit
            parent = DBSession.query(BudgetItem
                                    ).filter_by(ID=parentcode).first()
            if parent:
                projectid = parent.getProjectID()
                if projectid != errorid and projectid != 0:
                    resourcecategory = DBSession.query(
                        ResourceCategory).filter_by(ParentID=projectid).first()
                    resourceunit = parent.Resource
                    # check if there are any resources using the budgetitem label
                    # in the resource category
                    resource = None
                    # resource = DBSession.query(Resource).filter_by(
                    #                 ParentID=resourcecategory.ID, Name=name).first()

                    if resource:
                        # add a part to the resource unit that references it
                        newcode +=1
                        newpart = ResourcePart(ID=newcode,
                                                ResourceID=resource.ID,
                                                _Quantity=quantity,
                                                ParentID=resourceunit.ID)
                        DBSession.add(newpart)
                        biquantity = parent.Quantity * quantity
                        bi = BudgetItem(ID=code,
                                        ResourceID=resource.ID,
                                        _Quantity=biquantity,
                                        ParentID=parentcode,
                                        # OrderCost=ordercost,
                                        # RunningCost=running,
                                        # ClaimedCost=claimedcost,
                                        # IncomeReceived=income,
                                        # ClientCost=client,
                                        # ProjectedProfit=projprofit,
                                        # ActualProfit=actprofit
                                        )
                        DBSession.add(bi)
                    else:
                        # create a new resource unit
                        # get the id of the unit the resource is using
                        qry = DBSession.query(Unit).filter_by(
                                Name=measureunit).first()
                        if qry:
                            measureunit = qry.ID
                        else:
                            measureunit = None
                        resourcecode = generateResourceCode(name)
                        newcode+=1
                        resource = ResourceUnit(ID=newcode,
                                                Name=name,
                                                Code=resourcecode,
                                                UnitID=measureunit,
                                                _Rate=rate,
                                                Type=0,
                                                Description=description,
                                                ParentID=resourcecategory.ID)
                        DBSession.add(resource)
                        # add a part to the resource unit that references it
                        newcode+=1
                        newpart = ResourcePart(ID=newcode,
                                                ResourceID=resource.ID,
                                                _Quantity=quantity,
                                                ParentID=resourceunit.ID)
                        DBSession.add(newpart)
                        biquantity = parent.Quantity * quantity
                        bi = BudgetItem(ID=code,
                                        ResourceID=resource.ID,
                                        _Quantity=biquantity,
                                        ParentID=parentcode,
                                        # OrderCost=ordercost,
                                        # RunningCost=running,
                                        # ClaimedCost=claimedcost,
                                        # IncomeReceived=income,
                                        # ClientCost=client,
                                        # ProjectedProfit=projprofit,
                                        # ActualProfit=actprofit
                                        )
                        DBSession.add(bi)

        transaction.commit()

        # build the components
        print '\nConverting Components table to BudgetItems'
        book = csv.reader(
                    open(exceldatapath + 'data.csv/Components.DB.csv', 'rb'))
        length = sum(1 for row in book)
        book = csv.reader(
                    open(exceldatapath + 'data.csv/Components.DB.csv', 'rb'))
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
        componentids = []

        # correct negative codes and circular dependancies
        # negative codes refer to a parent that is a budgetitem
        next(book)
        for row in book:
            code = int(row[codeindex])

            try:
                pid = int(row[parentindex])
            except ValueError, e:
                pid = errorid

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

        # build the components/budgetitems
        book = csv.reader(
                    open(exceldatapath + 'data.csv/Components.DB.csv', 'rb'))
        percentile = length / 100.0
        print 'Percentage done: '
        counter = 1
        x = 0
        next(book)
        for row in book:
            x +=1
            if x == int(percentile * counter):
                counter += 1
                stdout.write('\r%d' % counter + '%')
                stdout.flush()
                sleep(1)
            code = int(row[codeindex])

            if code in componentids:
                continue
            else:
                componentids.append(code)

            measureunit = row[unitindex]
            measureunit=measureunit.decode("utf-8")
            measureunit=measureunit.encode("ascii","ignore")
            name = row[nameindex]
            name=name.decode("utf-8")
            name=name.encode("ascii","ignore")
            description = str(row[descriptionindex])
            try:
                parentcode = int(row[parentindex])
            except ValueError, e:
                parentcode = errorid
            try:
                quantity = float(row[quantityindex])
            except ValueError, e:
                quantity = 0
            try:
                rate = Decimal(row[rateindex]).quantize(Decimal('.01'))
            except InvalidOperation, e:
                rate = Decimal(0.00)
            try:
                rtype = int(row[typeindex])
                if rtype == 6 or rtype == 5 or rtype == 4:
                    rtype = 0
            except:
                rtype = 0
            # try:
            #     budgetcost = Decimal(row[budgetcostindex]).quantize(Decimal('.01'))
            # except InvalidOperation, e:
            #     budgetcost = Decimal(0.00)
            # try:
            #     ordercost = Decimal(row[ordercostindex]).quantize(Decimal('.01'))
            # except InvalidOperation, e:
            #     ordercost = Decimal(0.00)
            # try:
            #     claimedcost = Decimal(row[claimedcostindex]).quantize(Decimal('.01'))
            # except InvalidOperation, e:
            #     claimedcost = Decimal(0.00)
            # try:
            #     running = Decimal(row[runningindex]).quantize(Decimal('.01'))
            # except InvalidOperation, e:
            #     running = Decimal(0.00)
            # try:
            #     income = Decimal(row[incomeindex]).quantize(Decimal('.01'))
            # except InvalidOperation, e:
            #     income = Decimal(0.00)
            # try:
            #     client = Decimal(row[clientindex]).quantize(Decimal('.01'))
            # except InvalidOperation, e:
            #     client = Decimal(0.00)
            # try:
            #     projprofit = Decimal(row[projprofitindex]).quantize(Decimal('.01'))
            # except InvalidOperation, e:
            #     projprofit = Decimal(0.00)
            # try:
            #     actprofit = Decimal(row[actprofitindex]).quantize(Decimal('.01'))
            # except InvalidOperation, e:
            #     actprofit = Decimal(0.00)

            # if the code has been changed assign it here
            if code in changedcocodes:
                if changedcocodes[code] != errorid:
                    code = changedcocodes[code]
            # check if the parentcode has changed
            if parentcode in changedcoparentcodes:
                parentcode = changedcoparentcodes[parentcode]
            elif parentcode<0:
                parentcode = -parentcode

            # format the label
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

            if (len(checkname) != 0) and (parentcode != errorid):
                # get the parent and resourcecategory
                parent = DBSession.query(
                                Node).filter_by(ID=parentcode).first()
                if parent:
                    projectid = parent.getProjectID()
                    if projectid != errorid and projectid !=0:
                        resourcecategory = DBSession.query(ResourceCategory
                                            ).filter_by(ParentID=projectid).first()
                        rescatid = resourcecategory.ID
                        resource = DBSession.query(
                                    Resource).filter_by(
                                    ParentID=rescatid, Name=checkname).first()
                        # check if the resource is already in the resourcecategory
                        # if not get it from the database
                        biquantity = quantity
                        if not resource:
                            existingresource = DBSession.query(
                                Resource).filter_by(Name=checkname).first()

                            # if it already exists in the database create a new one
                            # and add it to the resourcecategory
                            if existingresource:
                                # get the id of the unit the resource is using
                                qry = DBSession.query(Unit).filter_by(
                                        Name=measureunit).first()
                                if qry:
                                    measureunit = qry.ID
                                else:
                                    measureunit = None
                                newcode += 1
                                resource = Resource(ID=newcode,
                                                Type=rtype,
                                                Name=existingresource.Name,
                                                Code=existingresource.Code,
                                                UnitID=measureunit,
                                                _Rate=existingresource._Rate,
                                                Description=existingresource.Description,
                                                ParentID=resourcecategory.ID)
                                DBSession.add(resource)

                        if not resource:
                            # resource does not exist yet
                            # build the resource
                            resourcecode = generateResourceCode(checkname)
                            # get the unit id
                            qry = DBSession.query(Unit).filter_by(
                                        Name=measureunit).first()
                            if qry:
                                measureunit = qry.ID
                            else:
                                measureunit = None
                            newcode += 1
                            resource = Resource(ID=newcode,
                                            Type=rtype,
                                            Code=resourcecode,
                                            Name=checkname,
                                            Description=description,
                                            UnitID=measureunit,
                                            _Rate = rate,
                                            ParentID=resourcecategory.ID)
                            DBSession.add(resource)
                            # if the parent is a budgetitem
                            if parent.type == 'BudgetItem':
                                # add a resource part to the parent resource
                                parentresourceid = parent.Resource.ID
                                newcode+=1
                                newpart = ResourcePart(ID=newcode,
                                                        ResourceID=resource.ID,
                                                        _Quantity=1.0,
                                                        ParentID=parentresourceid)
                                DBSession.add(newpart)
                                biquantity = parent.Quantity * quantity

                            bi = BudgetItem(ID=code,
                                            ResourceID=resource.ID,
                                            _Quantity = biquantity,
                                            ParentID=parentcode,
                                            # OrderCost=ordercost,
                                            # RunningCost=running,
                                            # ClaimedCost=claimedcost,
                                            # IncomeReceived=income,
                                            # ClientCost=client,
                                            # ProjectedProfit=projprofit,
                                            # ActualProfit=actprofit
                                            )
                            DBSession.add(bi)
                        else:
                            # if the parent is a budgetitem
                            if parent.type == 'BudgetItem':
                                # add a resource part to the parent resource
                                parentresourceid = parent.Resource.ID
                                newcode+=1
                                newpart = ResourcePart(ID=newcode,
                                                        ResourceID=resource.ID,
                                                        _Quantity=1.0,
                                                        ParentID=parentresourceid)
                                DBSession.add(newpart)
                                biquantity = parent.Quantity * quantity

                            # the resource exists, create the budgetitem
                            bi = BudgetItem(ID=code,
                                        ResourceID=resource.ID,
                                        _Quantity = biquantity,
                                        ParentID=parentcode,
                                        # OrderCost=ordercost,
                                        # RunningCost=running,
                                        # ClaimedCost=claimedcost,
                                        # IncomeReceived=income,
                                        # ClientCost=client,
                                        # ProjectedProfit=projprofit,
                                        # ActualProfit=actprofit
                                        )
                            DBSession.add(bi)
                        DBSession.flush()

        transaction.commit()
        print '\nDeleting error node'
        deletethis = DBSession.query(Node).filter_by(ID=errorid).first()
        DBSession.delete(deletethis)
        transaction.commit()

        print "Deleting broken ResourceParts"
        parts = DBSession.query(ResourcePart).filter(
                        ResourcePart.ParentID==ResourcePart.ResourceID).all()
        deleteids = []
        for part in parts:
            resource = part.Parent
            if resource:
                for budgetitem in resource.BudgetItems:
                    for bichild in budgetitem.Children:
                        if bichild.ResourceID == part.ResourceID:
                            deleteids.append(bichild.ID)
                deleteids.append(part.ID)
        for ids in deleteids:
            DBSession.query(Node).filter_by(ID=ids).delete()
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
        print 'Converting Client table'
        book = csv.reader(open(exceldatapath + 'data.csv/Client.DB.csv', 'rb'))
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

        next(book)
        for row in book:
            name = row[nameindex]
            name=name.decode("utf-8")
            name=name.encode("ascii","ignore")
            code = int(row[codeindex])
            address = str(row[addresindex]).encode('ascii')
            city = str(row[cityindex]).encode('ascii')
            state = str(row[stateindex]).encode('ascii')
            country = str(row[countryindex]).encode('ascii')
            zipno = str(row[zipindex]).encode('ascii')
            phone = str(row[phoneindex]).encode('ascii')
            cellular = str(row[cellularindex]).encode('ascii')
            fax = str(row[faxindex]).encode('ascii')
            contact = row[contactindex]
            contact=contact.decode("utf-8")
            contact=contact.encode("ascii","ignore")
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
        book = csv.reader(
                    open(exceldatapath + 'data.csv/Supplier.DB.csv', 'rb'))
        print 'Converting Supplier table'
        next(book)
        for row in book:
            name = row[nameindex]
            name=name.decode("utf-8")
            name=name.encode("ascii","ignore")
            code = int(row[codeindex])
            address = str(row[addresindex]).encode('ascii')
            city = str(row[cityindex]).encode('ascii')
            state = str(row[stateindex]).encode('ascii')
            country = str(row[countryindex]).encode('ascii')
            zipno = str(row[zipindex]).encode('ascii')
            phone = str(row[phoneindex]).encode('ascii')
            cellular = str(row[cellularindex]).encode('ascii')
            fax = str(row[faxindex]).encode('ascii')
            contact = row[contactindex]
            contact=contact.decode("utf-8")
            contact=contact.encode("ascii","ignore")
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
        # # OrderItem.__table__.drop(engine)
        # # transaction.commit()

        print 'Converting Order table'
        book = csv.reader(open(exceldatapath + 'data.csv/Orders.DB.csv', 'rb'))
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

        next(book)
        for row in book:
            code = int(row[codeindex])
            qry = DBSession.query(Order).filter_by(ID=code).first()
            if not qry:
                auth = str(row[authindex]).encode('ascii')
                try:
                    projid = int(row[projidindex])
                except:
                    projid = 0

                # make sure the project exists
                project = DBSession.query(Project).filter_by(ID=projid).first()
                if project:
                    try:
                        supid = int(row[supidindex])
                        if supid == 0:
                            supid = None
                    except:
                        supid = None
                    try:
                        clientid = row[clientidindex]
                        if clientid == 0:
                            clientid = None
                    except:
                        clientid = None
                    try:
                        date = datetime.strptime(
                                            row[dateindex], '%Y-%m-%d %H:%M:%S')
                    except ValueError, e:
                        date = None
                    try:
                        total = Decimal(row[
                            totalindex]).quantize(Decimal('.01'))
                    except InvalidOperation, e:
                        total = Decimal(0.00)
                    try:
                        tax = float(row[taxindex])
                    except ValueError:
                        tax = 0.0
                    try:
                        deladd = str(row[deladdindex]).encode('ascii')
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
                    DBSession.flush()

        transaction.commit()

        print 'Converting Order Item table'
        book = csv.reader(
                    open(exceldatapath + 'data.csv/OrderItem.DB.csv', 'rb'))
        length = sum(1 for row in book)
        percentile = length / 100.0
        print 'Percentage done: '
        counter = 1
        x = 0
        book = csv.reader(
                    open(exceldatapath + 'data.csv/OrderItem.DB.csv', 'rb'))
        codeindex = 0
        orderidindex = 1
        compidindex = 2
        quantityindex = 5
        rateindex = 7
        next(book)
        for row in book:
            x +=1
            if x == int(percentile * counter):
                counter += 1
                stdout.write('\r%d' % counter + '%')
                stdout.flush()
                sleep(1)

            code = int(row[codeindex])
            if code != 0:
                compid = int(row[compidindex])
                # if the code has been changed assign it here
                if compid in changedcocodes:
                    compid = changedcocodes[compid]

                if compid != errorid:
                    # make sure the component/budgetitem exists
                    bi = DBSession.query(BudgetItem).filter_by(ID=compid).first()
                    if bi:
                        orderid = int(row[orderidindex])
                        try:
                            quantity = float(row[quantityindex])
                        except ValueError, e:
                            quantity = 0.0
                        try:
                            rate = Decimal(row[rateindex]
                                            ).quantize(Decimal('.01'))
                        except InvalidOperation, e:
                            rate = Decimal(0.00)

                        # set the order tax rate to the order item tax rate
                        try:
                            tax = ordertaxrate[str(orderid)]

                            # check if an order item already exists
                            # for this budgetitem and this order
                            existing = DBSession.query(OrderItem).filter_by(
                                                    OrderID=orderid,
                                                    BudgetItemID=compid).first()

                            # if the order item exists add the quantities
                            if existing:
                                oldtotal = existing.Total
                                existing.Quantity += quantity
                                bi.Ordered = bi.Ordered - oldtotal + existing.Total
                            else:
                                orderitem = OrderItem(OrderID=orderid,
                                                BudgetItemID=compid,
                                                _Quantity=quantity,
                                                _Rate=rate,
                                                VAT=tax)
                                DBSession.add(orderitem)
                                DBSession.flush()
                                bi.Ordered += orderitem.Total
                        except:
                            pass


        transaction.commit()

        print '\nRecalculating Project totals'
        projectlist = DBSession.query(Project).all()
        percentile = len(projectlist) / 100.0
        print 'Percentage done: '
        counter = 0
        x = 0
        for project in projectlist:
            if x == int(percentile * counter):
                counter += 1
                stdout.write('\r%d' % counter + '%')
                stdout.flush()
                sleep(1)
            x +=1
            project.Total

        transaction.commit()

        print "\nRecalculating Order totals"
        orders = DBSession.query(Order).all()
        percentile = len(orders) / 100.0
        print 'Percentage done: '
        counter = 0
        x = 0
        # if the order has no order items delete it
        for order in orders:
            if x == int(percentile * counter):
                counter += 1
                stdout.write('\r%d' % counter + '%')
                stdout.flush()
                sleep(1)
            x +=1
            if len(order.OrderItems) == 0:
                DBSession.delete(order)
            else:
                order.resetTotal()
        transaction.commit()

        print "\nSetting Resource SupplierID"
        orderitems = DBSession.query(OrderItem
                                    ).group_by(OrderItem.BudgetItemID).all()
        percentile = len(orderitems) / 100.0
        print 'Percentage done: '
        counter = 0
        x = 0
        for item in orderitems:
            if x == int(percentile * counter):
                counter += 1
                stdout.write('\r%d' % counter + '%')
                stdout.flush()
                sleep(1)
            x +=1
            item.BudgetItem.Resource.SupplierID = item.Order.SupplierID

    print '\nDone'
