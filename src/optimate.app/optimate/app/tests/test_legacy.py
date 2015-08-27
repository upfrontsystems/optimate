""" The pyramid views and their functions are being tested.
"""
from pyramid.paster import (
    get_appsettings,
    setup_logging,
)

from sqlalchemy import (
    Column,
    Index,
    Integer,
    Text,
    ForeignKey,
    create_engine,
    exc,
    engine_from_config,
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
)

import sys
import json
from sqlalchemy.sql import exists
from pyramid.scripts.common import parse_vars
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os
import unittest
import transaction
from pyramid import testing
from decimal import Decimal

def _initTestingDB():
    """ Build a database with default data
    """
    engine = create_engine('sqlite://')
    Base.metadata.create_all(engine)
    DBSession.configure(bind=engine)
    with transaction.manager:
        # project global variables
        global biq
        biq = 5.0
        global overheadperc
        overheadperc = 0.05
        global respartq
        respartq = 5.895

        global resarate
        resarate = Decimal(10.00)
        global biaq
        biaq = 7.0
        global biatot
        biatot = Decimal(float(resarate)*biaq).quantize(Decimal('.01'))

        global resunitrate
        resunitrate = Decimal(respartq*float(resarate)).quantize(Decimal('.01'))
        global bitot
        bitot = Decimal((1.0+overheadperc)* \
                    float(resunitrate)*biq).quantize(Decimal('.01'))

        global bgtot
        bgtot = bitot
        global projtot
        projtot = bgtot

        # projectb global variables
        global overheadbperc
        overheadbperc = 0.5
        global bibq
        bibq = 10.0
        global resbrate
        resbrate = Decimal(7.00)
        global bibtot
        bibtot = Decimal((1.0+overheadbperc)* \
                      float(resbrate)*bibq).quantize(Decimal('.01'))

        global resduplicaterate
        resduplicaterate = Decimal(5.00)
        global bicq
        bicq = 6.5
        global bictot
        bictot = Decimal((1.0+overheadbperc)*float(resduplicaterate)* \
                    bicq).quantize(Decimal('.01'))

        global bgbtot
        bgbtot = bictot + bibtot
        global projbtot
        projbtot = bgbtot


        # project c global variables
        global overheadcperc
        overheadcperc = 0.01
        global overheaddperc
        overheaddperc = 0.15
        global resbduplicaterate
        resbduplicaterate = Decimal(7.00)
        global bidq
        bidq = 39.0
        global bidtot
        bidtot = Decimal((1.0 + overheadcperc) * \
                    (1.0 + overheaddperc) *
                    float(resbduplicaterate) * bidq).quantize(Decimal('.01'))

        global bieq
        bieq = 16.3
        global bietot
        bietot = Decimal((1.0 + overheaddperc) * \
                    (1.0 + overheadcperc) *
                    float(resbduplicaterate) * bieq).quantize(Decimal('.01'))

        global bgdtot
        bgdtot = bidtot
        global bgctot
        bgctot = bgdtot+bietot
        global projctot
        projctot = bgctot

        city1 = City(Name='Cape Town',
                    ID=1)
        city2 = City(Name='Pretoria',
                    ID=2)
        city3 = City(Name='Durban',
                    ID=3)

        client1 = Client (Name='TestClientOne',
                        ID=1,
                        CityID=city1.ID)
        client2 = Client (Name='TestClientTwo',
                        ID=2,
                        CityID=city2.ID)
        client3 = Client (Name='TestClientThree',
                        ID=3,
                        CityID=city3.ID)
        supplier1 = Supplier(Name='TestSupplier1',
                        ID=1,
                        CityID=city1.ID)
        supplier2 = Supplier(Name='TestSupplier2',
                        ID=2,
                        CityID=city1.ID)
        supplier3 = Supplier(Name='TestSupplier3',
                        ID=3,
                        CityID=city1.ID)

        unit1 = Unit(Name='mm',
                    ID=1)
        unit2 = Unit(Name='hour',
                    ID=2)
        unit3 = Unit(Name='kg',
                    ID=3)
        unit4 = Unit(Name='1000',
                    ID=4)
        unit5 = Unit(Name='item',
                    ID=5)

        labtype = ResourceType(ID=1, Name='Labour')
        mattype = ResourceType(ID=2, Name='Material')
        subtype = ResourceType(ID=3, Name='Subcontractor')

        root = Node(ID=0)
        project = Project(Name='TestPName',
                        ID=1,
                        ClientID=client1.ID,
                        CityID=city1.ID,
                        Description='TestPDesc',
                        SiteAddress='Site Address',
                        FileNumber='0000',
                        ParentID=0)
        overhead = Overhead(Name="Overhead",
                        ID=1,
                        ProjectID=project.ID,
                        Percentage=(overheadperc*100.0),
                        Type='BudgetItem')
        budgetgroup = BudgetGroup(Name='TestBGName',
                        ID=2,
                        Description='TestBGDesc',
                        ParentID=project.ID)
        rescat = ResourceCategory(Name='Resource List',
                        ID=9,
                        Description='Test Category',
                        ParentID=project.ID)
        resunit = ResourceUnit(ID=15,
                       Code='A000',
                       Name='TestResource',
                       Description='Test resource',
                       UnitID=unit1.ID,
                       Type=mattype.ID,
                       ParentID=rescat.ID)
        resa = Resource(ID=16,
                       Code='A001',
                       Name='TestResourceA',
                       Description='Test resource',
                       UnitID=unit2.ID,
                       Type=labtype.ID,
                       _Rate=resarate,
                       ParentID=rescat.ID)
        respart = ResourcePart(ID=7,
                        ResourceID=resa.ID,
                        _Quantity=respartq,
                        ParentID=resunit.ID)
        budgetitem = BudgetItem(ID=3,
                        _Quantity=biq,
                        ResourceID = resunit.ID,
                        ParentID=budgetgroup.ID)
        budgetitema = BudgetItem(ID=11,
                        _Quantity=biaq,
                        ResourceID=resa.ID,
                        ParentID=budgetitem.ID)
        budgetitem.Overheads.append(overhead)


        projectb = Project(Name='TestBPName',
                        ID=4,
                        ClientID=client2.ID,
                        CityID=city2.ID,
                        Description='TestBPDesc',
                        SiteAddress='Site Address B',
                        FileNumber='0001',
                        ParentID=0)
        overheadb = Overhead(Name="OverheadB",
                        ID=2,
                        ProjectID=projectb.ID,
                        Percentage=(overheadbperc*100.0),
                        Type='BudgetItem')
        budgetgroupb = BudgetGroup(Name='TestBBGName',
                        ID=5,
                        Description='BBGDesc',
                        ParentID=projectb.ID)
        rescatb = ResourceCategory(Name='Resource List',
                        ID=12,
                        Description='Test Category',
                        ParentID=projectb.ID)
        resb = Resource(Name='TestResourceB',
                       ID=17,
                       Code='A002',
                       Description='Test resource',
                       UnitID=unit3.ID,
                       Type=mattype.ID,
                       _Rate=resbrate,
                       ParentID=rescatb.ID)
        resduplicate = Resource(Name='TestResource',
                       ID=18,
                       Code='A000',
                       Description='Test resource',
                       UnitID=unit3.ID,
                       Type=mattype.ID,
                       _Rate=resduplicaterate,
                       ParentID=rescatb.ID)
        budgetitemb = BudgetItem(ID=6,
                        _Quantity=bibq,
                        ResourceID=resb.ID,
                        ParentID=budgetgroupb.ID)
        budgetitemb.Overheads.append(overheadb)
        budgetitemc = BudgetItem(ID=13,
                        _Quantity=bicq,
                        ResourceID=resduplicate.ID,
                        ParentID=budgetgroupb.ID)
        budgetitemc.Overheads.append(overheadb)

        projectc = Project(Name='TestCPName',
                        ID=19,
                        ClientID=client3.ID,
                        CityID=city3.ID,
                        Description='TestCPDesc',
                        SiteAddress='Site Address C',
                        FileNumber='0002',
                        ParentID=0)
        overheadc = Overhead(Name="OverheadC",
                        ID=3,
                        ProjectID=projectc.ID,
                        Percentage=(overheadcperc*100.0),
                        Type='BudgetItem')
        overheadd = Overhead(Name="OverheadD",
                        ID=4,
                        ProjectID=projectc.ID,
                        Percentage=(overheaddperc*100.0),
                        Type='BudgetItem')
        budgetgroupc = BudgetGroup(Name='TestCBGName',
                        ID=20,
                        Description='CBGDesc',
                        ParentID=projectc.ID)
        budgetgroupd = BudgetGroup(Name='TestDBGName',
                        ID=21,
                        Description='DBGDesc',
                        ParentID=budgetgroupc.ID)
        rescatc = ResourceCategory(ID=24,
                        Name='Resource List',
                        Description='Test Category',
                        ParentID=projectc.ID)
        resbduplicate = Resource(ID=25,
                       Code='A002',
                       Name='TestResourceB',
                       Description='Test resource',
                       UnitID=unit4.ID,
                       Type=subtype.ID,
                       _Rate=resbduplicaterate,
                       ParentID=rescatc.ID)
        budgetitemd = BudgetItem(ID=22,
                        _Quantity=bidq,
                        ResourceID=resbduplicate.ID,
                        ParentID=budgetgroupd.ID)
        budgetitemd.Overheads.append(overheadd)
        budgetitemd.Overheads.append(overheadc)
        budgetiteme = BudgetItem(ID=23,
                        _Quantity=bieq,
                        ResourceID=resbduplicate.ID,
                        ParentID=budgetgroupc.ID)
        budgetiteme.Overheads.append(overheadd)
        budgetiteme.Overheads.append(overheadc)

        DBSession.add(supplier1)
        DBSession.add(supplier2)
        DBSession.add(supplier3)
        DBSession.add(client1)
        DBSession.add(client2)
        DBSession.add(client3)

        DBSession.add(city1)
        DBSession.add(city2)
        DBSession.add(city3)

        DBSession.add(unit1)
        DBSession.add(unit2)
        DBSession.add(unit3)
        DBSession.add(unit4)
        DBSession.add(unit5)

        DBSession.add(labtype)
        DBSession.add(mattype)
        DBSession.add(subtype)

        DBSession.add(root)
        DBSession.add(project)
        DBSession.add(overhead)
        DBSession.add(rescat)
        DBSession.add(budgetgroup)
        DBSession.add(budgetitem)
        DBSession.add(budgetitema)
        DBSession.add(resunit)
        DBSession.add(respart)
        DBSession.add(resa)

        DBSession.add(projectb)
        DBSession.add(overheadb)
        DBSession.add(resb)
        DBSession.add(resduplicate)
        DBSession.add(budgetgroupb)
        DBSession.add(budgetitemb)
        DBSession.add(budgetitemc)
        DBSession.add(rescatb)

        DBSession.add(projectc)
        DBSession.add(overheadc)
        DBSession.add(overheadd)
        DBSession.add(budgetgroupc)
        DBSession.add(budgetgroupd)
        DBSession.add(budgetitemd)
        DBSession.add(budgetiteme)
        DBSession.add(rescatc)
        DBSession.add(resbduplicate)

        transaction.commit()

        """The hierarchy
        project - id:1 overhead: 0.05
                |
                budgetgroup - id:2
                            |
                            budgetitem - id:3 - resunit id:15
                                       |
                                       budgetitema - id:11 - resa id:16
                |
                rescat - id:9
                        |
                        resunit - id:15
                                |
                                respart - id:7 - resa id:16
                        |
                        resa id:16
        projectb -(885) id:4 overheadb: 0.5
                 |
                 budgetgroupb -(525+360=885) id:5
                              |
                              budgetitemb - id:6 - resb
                              |
                              budgetitemc - id:13 - resdupli
                 |
                 rescatb - id:12
                         |
                         resb id:17
                         |
                         resduplicate id:18

        projectc -(4210.56) id:19 overheadc: 0.01
                                  overheadd: 0.15
                 |
                 budgetgroupc - id:20
                              |
                              budgetgroupd - id:21
                                           |
                                           budgetitemd -id:22 - resbduplicate
                              |
                              budgetiteme - id:23 - resbduplicate
                 |
                 rescatc - id:24
                         |
                         resbduplicate id:25
        """

    return DBSession


def _registerRoutes(config):
    # the optimate project data views
    config.add_route('rootview', '/')
    config.add_route('node_children', 'node/{parentid}/children/')
    config.add_route('nodeview', 'node/{id}/')
    config.add_route('projects', '/projects/')
    config.add_route('project_resources', '/project/{id}/resources/')
    config.add_route('resources', '/resource/{id}/')
    config.add_route('overheadview', '/overhead/{id}/')
    config.add_route('resourcetypes', '/resourcetypes')
    config.add_route('node_grid', '/node/{parentid}/grid/')
    config.add_route('node_update_value', '/node/{id}/update_value/')
    config.add_route('node_paste', 'node/{id}/paste/')
    config.add_route('node_cost', 'node/{id}/cost/')
    config.add_route('node_budgetitems', 'node/{id}/budgetitems/')
    config.add_route('node_budgetgroups', 'node/{id}/budgetgroups/')
    config.add_route('resourcecategory_allresources', 'resourcecategory/{id}/allresources/')
    config.add_route('resourcecategory_resources', 'resourcecategory/{id}/resources/')

class DummyRouteName(object):
    def __init__ (self, name):
        self.name = name

class TestResourceCategoryResourcesViewSuccessCondition(unittest.TestCase):
    """ Test that the resourcecategory_resources view returns a list of the
        resources in the category
    """

    def setUp(self):
        self.session = _initTestingDB()
        self.config = testing.setUp()

    def tearDown(self):
        DBSession.remove()
        testing.tearDown()

    def _callFUT(self, request):
        from optimate.app.views import resourcecategory_resources
        return resourcecategory_resources(request)

    def test_resources(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.matchdict['id'] = 12
        request.matched_route = DummyRouteName('resourcecategory_resources')
        response = self._callFUT(request)

        # should return two resources
        self.assertEqual(len(response), 2)

    def test_all_resources(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.matchdict['id'] = 12
        request.matched_route = DummyRouteName('resourcecategory_allresources')
        response = self._callFUT(request)

        # should return two resources
        self.assertEqual(len(response), 2)

class TestNodeBudgetItemsViewSuccessCondition(unittest.TestCase):
    """ Test that the node_budgetitems view returns a list of the budgetitems
        in the node
    """

    def setUp(self):
        self.session = _initTestingDB()
        self.config = testing.setUp()

    def tearDown(self):
        DBSession.remove()
        testing.tearDown()

    def _callFUT(self, request):
        from optimate.app.views import node_budgetitems
        return node_budgetitems(request)

    def test_project_budgetitems(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.matchdict['id'] = 4
        response = self._callFUT(request)

        # should return two budgetitems
        self.assertEqual(len(response), 2)

    def test_budgetitem_budgetitems(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.matchdict['id'] = 22
        response = self._callFUT(request)

        # should return one budgetitem
        self.assertEqual(len(response), 1)

class TestProjectResourcesViewSuccessCondition(unittest.TestCase):
    """ Test that a list of the Resources in a specified project is returned
    """
    def setUp(self):
        self.session = _initTestingDB()
        self.config = testing.setUp()

    def tearDown(self):
        DBSession.remove()
        testing.tearDown()

    def _callFUT(self, request):
        from optimate.app.views import project_resources
        return project_resources(request)

    def test_it(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.matchdict['id'] = 19
        request.matched_route = DummyRouteName('project_resources')
        response = self._callFUT(request)

        # test the correct resource is returned
        self.assertEqual(response[0]['Name'], 'TestResourceB')

class TestResourcesViewSuccessCondition(unittest.TestCase):
    """ Test the resources of project_resources
    """

    def setUp(self):
        self.session = _initTestingDB()
        self.config = testing.setUp()

    def tearDown(self):
        DBSession.remove()
        testing.tearDown()

    def _callFUT(self, request):
        from optimate.app.views import project_resources
        return project_resources(request)

    def test_it(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.matchdict['id'] = 24
        request.matched_route = DummyRouteName('resources')
        response = self._callFUT(request)

        # test the correct resource is returned
        self.assertEqual(response[0]['Name'], 'TestResourceB')

class TestProjectOverheadsViewSuccessCondition(unittest.TestCase):
    """ Test the different methods of the overheads of a project
    """

    def setUp(self):
        self.session = _initTestingDB()
        self.config = testing.setUp()

    def tearDown(self):
        DBSession.remove()
        testing.tearDown()

    def _callFUT(self, request):
        from optimate.app.views import overheadsview
        return overheadsview(request)

    def test_get(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.matchdict = {'nodeid': 1}
        request.method = 'GET'
        request.params = DummyOverhead()
        response = self._callFUT(request)

        # test that a list of the overheads in this project is returned
        self.assertEqual(len(response), 1)
        self.assertEqual(response[0]['Name'], 'Overhead')

    def test_post(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.matchdict = {'id': 1}
        request.json_body = {'Name':'NewName',
                            'Percentage': 0.1}
        request.method = 'POST'
        response = self._callFUT(request)
        self.assertEqual(response.code, 200)

        request = testing.DummyRequest()
        request.matchdict = {'nodeid': 1}
        request.method = 'GET'
        request.params = DummyOverhead()
        response = self._callFUT(request)
        # test that a the overheads is now two
        self.assertEqual(len(response), 2)

class DummyOverhead(object):
    def dict_of_lists(self):
        return {}

class TestProjectOverheadsViewSuccessCondition(unittest.TestCase):
    """ Test the different methods of the overheads
    """

    def setUp(self):
        self.session = _initTestingDB()
        self.config = testing.setUp()

    def tearDown(self):
        DBSession.remove()
        testing.tearDown()

    def _callFUT(self, request):
        from optimate.app.views import overheadview
        return overheadview(request)

    def test_delete(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.matchdict = {'nodeid': 19}
        request.method = 'GET'
        request.params = DummyOverhead()
        from optimate.app.views import overheadsview
        response = overheadsview(request)
        # first test that there are two overheads
        self.assertEqual(len(response), 2)

        request = testing.DummyRequest()
        request.matchdict = {'overheadid': 3}
        request.method = 'DELETE'
        response = self._callFUT(request)
        # first test that there are two overheads
        self.assertEqual(response.code, 200)

        request = testing.DummyRequest()
        request.matchdict = {'nodeid': 19}
        request.method = 'GET'
        request.params = DummyOverhead()
        from optimate.app.views import overheadsview
        response = overheadsview(request)
        # now test that there one overhead
        self.assertEqual(len(response), 1)

class DummyBudgetItemOverhead(object):
    def dict_of_lists(self):
        return {'NodeType': ['BudgetItem']}

class TestBudgetItemOverheadsViewSuccessCondition(unittest.TestCase):
    """ Test the operations on Overheads of a BudgetItem
    """

    def setUp(self):
        self.session = _initTestingDB()
        self.config = testing.setUp()

    def tearDown(self):
        DBSession.remove()
        testing.tearDown()

    def _callFUT(self, request):
        from optimate.app.views import overheadsview
        return overheadsview(request)

    def test_it(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.matchdict['nodeid'] = 22
        request.params = DummyBudgetItemOverhead()
        response = self._callFUT(request)

        # budgetitem with id 22 can use the two overheads of project id 19
        self.assertEqual(len(response), 2)

class TestChildViewSuccessCondition(unittest.TestCase):
    """ Test if the Root view functions correctly.
        It also calls the node_children but without a url path,
        the default root id '0' is then used in the view
    """

    def setUp(self):
        self.session = _initTestingDB()
        self.config = testing.setUp()

    def tearDown(self):
        DBSession.remove()
        testing.tearDown()

    def _callFUT(self, request):
        from optimate.app.views import node_children
        return node_children(request)

    def test_root_view(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        response = self._callFUT(request)

        # assert returns true if the first child object of the root has
        # Name 'TestBName'
        self.assertEqual(response[0]['Name'], 'TestBPName')
        self.assertEqual(response[1]['Name'], 'TestCPName')
        self.assertEqual(response[2]['Name'], 'TestPName')

    def test_child_view(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.matchdict['parentid'] = 1
        response = self._callFUT(request)

        # true if the children of project id '1'
        self.assertEqual(response[0]['Name'], 'Resource List')
        self.assertEqual(response[1]['Name'], 'TestBGName')

    def test_resourcecategory_view(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.matchdict['parentid'] = 9
        response = self._callFUT(request)

        # the resource category should return two children
        self.assertEqual(len(response), 2)


class TestProjectListingSuccessCondition(unittest.TestCase):
    """ Test if the projects view works and returns
        a list of all the projects
    """

    def setUp(self):
        self.session = _initTestingDB()
        self.config = testing.setUp()

    def tearDown(self):
        DBSession.remove()
        testing.tearDown()

    def _callFUT(self, request):
        from optimate.app.views import projects
        return projects(request)

    def test_it(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        response = self._callFUT(request)

        # assert returns true if the projects are returned in the correct order
        self.assertEqual(response[0]['Name'], 'TestBPName')
        self.assertEqual(response[1]['Name'], 'TestCPName')
        self.assertEqual(response[2]['Name'], 'TestPName')

class TestNodeViewSuccessCondition(unittest.TestCase):
    """ Test if the nodeview works and returns the node specified
    """

    def setUp(self):
        self.session = _initTestingDB()
        self.config = testing.setUp()

    def tearDown(self):
        DBSession.remove()
        testing.tearDown()

    def _callFUT(self, request):
        from optimate.app.views import nodeview
        return nodeview(request)

    def test_project_returned(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.matchdict = {'id': 1}
        response = self._callFUT(request)

        # assert returns true if the correct project is returned
        self.assertEqual(response['Name'], 'TestPName')

    def test_nothing_returned(self):
        # test that nothing is returned when a non existent node id is given
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.matchdict = {'id': 100}
        response = self._callFUT(request)

        # assert returns true if the response code is 404
        self.assertEqual(response.code, 404)

    def test_budgeitem_returned(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.matchdict = {'id': 3}
        response = self._callFUT(request)

        # assert returns true if the budgeitem returns the name of its resource
        self.assertEqual(response['Name'], 'TestResource')

class TestNodeGridViewSuccessCondition(unittest.TestCase):
    """ Test if the nodegrid view works for all types
    """

    def setUp(self):
        self.session = _initTestingDB()
        self.config = testing.setUp()

    def tearDown(self):
        DBSession.remove()
        testing.tearDown()

    def _callFUT(self, request):
        from optimate.app.views import node_grid
        return node_grid(request)

    def test_project_gridview(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.matchdict = {'parentid': 0}
        response = self._callFUT(request)
        # assert returns true if the projects are returned correctly
        self.assertEqual(response['list'][0]['Name'], 'TestBPName')
        self.assertEqual(response['list'][1]['Name'], 'TestCPName')
        self.assertEqual(response['list'][2]['Name'], 'TestPName')
        self.assertEqual(response['emptycolumns'], True)

    def test_budgetgroup_gridview(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.matchdict = {'parentid': 1}
        response = self._callFUT(request)

        # assert returns true if the projects are returned correctly
        self.assertEqual(response['list'][0]['Name'], 'Resource List')
        self.assertEqual(response['list'][1]['Name'], 'TestBGName')
        self.assertEqual(response['emptycolumns'], True)

    def test_resource_category_gridview(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.matchdict = {'parentid': 12}
        response = self._callFUT(request)

        # assert returns true if the projects are returned correctly
        self.assertEqual(response['list'][0]['Name'], 'TestResource')
        self.assertEqual(response['list'][1]['Name'], 'TestResourceB')
        self.assertEqual(response['emptycolumns'], True)

    def test_mixed_gridview(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.matchdict = {'parentid': 20}
        response = self._callFUT(request)

        # the children are a mix of budgetgroup and budgetitem
        # the first row should the the parent
        # emptycolumns should return false
        self.assertEqual(response['list'][0]['Name'], 'TestCBGName')
        self.assertEqual(response['list'][1]['Name'], 'TestDBGName')
        self.assertEqual(response['list'][2]['Name'], 'TestResourceB')
        self.assertEqual(response['emptycolumns'], False)

    def test_budgetitem_gridview(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.matchdict = {'parentid': 5}
        response = self._callFUT(request)

        # assert returns true if the projects are returned correctly
        # first row is the parent
        self.assertEqual(response['list'][0]['Name'], 'TestBBGName')
        self.assertEqual(response['list'][1]['Name'], 'TestResource')
        self.assertEqual(response['list'][2]['Name'], 'TestResourceB')
        self.assertEqual(response['emptycolumns'], False)


class TestUpdateValueSuccessCondition(unittest.TestCase):
    """ Update values in resource and budgetitem and test
    """

    def setUp(self):
        self.session = _initTestingDB()
        self.config = testing.setUp()

    def tearDown(self):
        DBSession.remove()
        testing.tearDown()

    def _callFUT(self, request):
        from optimate.app.views import node_update_value
        if not 'json_body' in request.__dict__:
            request.json_body = {}
        return node_update_value(request)

    def test_update_resource_rate(self):
        # check cost beforehand
        from optimate.app.views import node_cost
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.matchdict = {'id': 1}
        self.assertEqual(node_cost(request)['Cost'], str(projtot))

        # update the rate of the resource
        newresarate = 150
        request.matchdict = {'id': 16}
        request.json_body = {'Rate': newresarate}
        response = self._callFUT(request)

        newresparttot = Decimal(newresarate * respartq).quantize(Decimal('.01'))
        newresunitrate = newresparttot
        newbitot = Decimal((1.0+overheadperc)*float(newresunitrate) * biq
                            ).quantize(Decimal('.01'))
        newprojtot = newbitot

        # now the costs should have changed
        request.matchdict = {'id': 7}
        self.assertEqual(node_cost(request)['Cost'], str(newresparttot))
        request.matchdict = {'id': 1}
        self.assertEqual(node_cost(request)['Cost'], str(newprojtot))

    def test_update_duplicate_resource_rate(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.matchdict = {'id': 25}
        newresbduplicaterate = 100
        request.json_body = {'Rate': newresbduplicaterate}
        response = self._callFUT(request)

        newbietot = Decimal((1.0 + overheadcperc) * \
                    (1.0 + overheaddperc) *
                    float(newresbduplicaterate) * bieq).quantize(Decimal('.01'))
        newbidtot = Decimal((1.0 + overheaddperc) * \
                    (1.0 + overheadcperc) *
                    float(newresbduplicaterate) * bidq).quantize(Decimal('.01'))
        newprojctot = newbietot+newbidtot
        # now the project cost should have changed
        request = testing.DummyRequest()
        request.matchdict = {'id': 19}
        from optimate.app.views import node_cost
        response = node_cost(request)
        self.assertEqual(response['Cost'], str(newprojctot))

    def test_update_budgetitem_quantity(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.matchdict = {'id': 3}
        newbiq = 50.0
        request.json_body = {'Quantity': newbiq}
        response = self._callFUT(request)

        newbitot = Decimal((1.0+overheadperc)*newbiq * float(resunitrate)
                            ).quantize(Decimal('.01'))
        newprojtot = newbitot

        # now the project cost should have changed
        request = testing.DummyRequest()
        request.matchdict = {'id': 1}
        from optimate.app.views import node_cost
        response = node_cost(request)
        self.assertEqual(response['Cost'], str(newprojtot))

    def test_update_resource_part_quantity(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        newpartq = 50.0
        request.matchdict = {'id': 7}
        request.json_body = {'Quantity': newpartq}
        response = self._callFUT(request)

        newresunitrate = Decimal(float(resarate)*newpartq
                                ).quantize(Decimal('.01'))
        newbitot = Decimal((1.0+overheadperc)*biq * float(newresunitrate)
                            ).quantize(Decimal('.01'))
        newprojtot = newbitot

        # now the project cost should have changed
        request = testing.DummyRequest()
        request.matchdict = {'id': 1}
        from optimate.app.views import node_cost
        response = node_cost(request)
        self.assertEqual(response['Cost'], str(newprojtot))

class TestAddItemSuccessCondition(unittest.TestCase):
    """ Test if the nodeview functions correctly when adding a node
        Using default data and adding it as the child of one of the objects.
    """

    def setUp(self):
        self.session = _initTestingDB()
        self.config = testing.setUp()

    def tearDown(self):
        self.session.remove()
        testing.tearDown()

    def _callFUT(self, request):
        if not 'json_body' in request.__dict__:
            request.json_body = {}
        from optimate.app.views import nodeview
        return nodeview(request)

    def test_add_budgetgroup(self):
        _registerRoutes(self.config)

        # Add the default data using json in the request
        request = testing.DummyRequest(json_body={
            'Name': 'AddingName',
            'Description': 'Adding test item',
            'NodeType': 'BudgetGroup'
        })
        # add it to id:1 the project
        request.matchdict = {'id': 1}
        request.method = 'POST'
        response = self._callFUT(request)
        # assert if the response from the add view is OK
        self.assertEqual(response.keys(), ['node', 'ID'])

        # Create another request for the child of the node added to
        request = testing.DummyRequest()
        request.matchdict = {'parentid': 1}
        from optimate.app.views import node_children
        response = node_children(request)
        # true if the name of the child added to the node is 'AddingName'
        self.assertEqual(response[1]['Name'], 'AddingName')

    def test_add_budgetitem(self):
        _registerRoutes(self.config)

        # Add the default data using json in the request
        newbiquant= 4
        request = testing.DummyRequest(json_body={
            'ResourceID': 18,
            'Quantity': newbiquant,
            'NodeType': 'BudgetItem',
            'OverheadList':[{'Name': 'OverheadB',
                            'ID':2,
                            'selected':True}],
        })
        # add it to id:5
        request.matchdict = {'id': 5}
        request.method = 'POST'
        response = self._callFUT(request)

        # assert if the response from the add view returns the new id
        self.assertEqual(response.keys(), ['node', 'ID'])

        newbitot = Decimal((1.0 + overheadbperc) * float(resduplicaterate) * \
                            newbiquant).quantize(Decimal('.01'))
        newprojtot=projbtot + newbitot

        # do another test to see if the cost is correct
        request = testing.DummyRequest()
        request.matchdict = {'id': 4}
        from optimate.app.views import node_cost
        response = node_cost(request)
        self.assertEqual(response['Cost'], str(newprojtot))

    def test_add_budgeitem_with_unit(self):
        _registerRoutes(self.config)

        # Add a budgetitem that references a resourceunit
        newbiquant= 30
        request = testing.DummyRequest(json_body={
            'ResourceID': 15,
            'Quantity': newbiquant,
            'NodeType': 'BudgetItem',
            'OverheadList':[],
        })
        # add it to the parent
        request.matchdict = {'id': 2}
        request.method = 'POST'
        response = self._callFUT(request)

        # assert if the response from the add view returns the new id
        self.assertEqual(response.keys(), ['node', 'ID'])
        newid = response['ID']

        # check that the added budgetitem has a child
        request = testing.DummyRequest()
        request.matchdict = {'parentid': newid}
        from optimate.app.views import node_children
        response = node_children(request)
        # true if the name of the child added to the node is the resource name
        self.assertEqual(response[0]['Name'], 'TestResourceA')

        newbitot = Decimal(float(resunitrate) * newbiquant
                            ).quantize(Decimal('.01'))
        newprojtot= projtot + newbitot

        # do another test to see if the cost is correct
        request = testing.DummyRequest()
        request.matchdict = {'id': 1}
        from optimate.app.views import node_cost
        response = node_cost(request)
        self.assertEqual(response['Cost'], str(newprojtot))

    def test_add_whole_project(self):
        _registerRoutes(self.config)

        # Add the default project using json in the request
        request = testing.DummyRequest(json_body={
            'Name': 'AddingProject',
            'Description': 'Adding test item',
            'NodeType': 'Project'
        })
        # add it to id:0 the root
        request.matchdict = {'id': 0}
        request.method = 'POST'
        response = self._callFUT(request)
        # assert if the response from the add view has data
        self.assertEqual(response.keys(), ['node', 'ID'])
        # get the id of the new node
        projectid = response['ID']

        # Add a budgetgroup
        request = testing.DummyRequest(json_body={
            'Name': 'AddingBG',
            'Description': 'Adding test item',
            'NodeType': 'BudgetGroup'
        })
        # add it to the parent
        request.matchdict = {'id': projectid}
        request.method = 'POST'
        response = self._callFUT(request)
        # assert if the response from the add view is OK
        self.assertEqual(response.keys(), ['node', 'ID'])
        # get the id of the new node
        newbgid = response['ID']

        # get the resource category id
        request = testing.DummyRequest()
        request.matchdict = {'parentid': projectid}
        from optimate.app.views import node_children
        response = node_children(request)
        rescatid = response[0]['ID']

        newresrate = 29
        # Add a resource
        request = testing.DummyRequest(json_body={
            'Name': 'AddingNewResource',
            'Description': 'Adding Resource',
            'Unit': 5,
            'ResourceTypeID': 1,
            'Rate': newresrate,
            'Code': 'ADD005',
            'NodeType': 'Resource'
        })
        # add it to the resource category
        request.matchdict = {'id': rescatid}
        request.method = 'POST'
        response = self._callFUT(request)
        # assert if the response from the add view has data
        self.assertEqual(response.keys(), ['node', 'ID'])
        # get the id of the new node
        resid = response['ID']

        newresarate = 13
        # Add a resource
        request = testing.DummyRequest(json_body={
            'Name': 'AddingNewResourceA',
            'Description': 'Adding Resource',
            'Unit': 2,
            'ResourceTypeID': 3,
            'Rate': newresarate,
            'Code': 'AAD005',
            'NodeType': 'Resource'
        })
        # add it to the resource category
        request.matchdict = {'id': rescatid}
        request.method = 'POST'
        response = self._callFUT(request)
        # assert if the response from the add view has data
        self.assertEqual(response.keys(), ['node', 'ID'])
        # get the id of the new node
        resaid = response['ID']

        newresunitrate = 78
        # Add a resource unit
        request = testing.DummyRequest(json_body={
            'Name': 'AddingResourceUnit',
            'Description': 'Adding Resource Unit',
            'Unit': 1,
            'ResourceTypeID': 1,
            'Rate': newresunitrate,
            'Code': 'ADU005',
            'NodeType': 'ResourceUnit'
        })
        # add it to the resource category
        request.matchdict = {'id': rescatid}
        request.method = 'POST'
        response = self._callFUT(request)
        # assert if the response from the add view has data
        self.assertEqual(response.keys(), ['node', 'ID'])
        # get the id of the new node
        resunitid = response['ID']

        newubiq = 15
        # Add a budgetitem
        request = testing.DummyRequest(json_body={
            'ResourceID': resunitid,
            'NodeType': 'BudgetItem',
            'Quantity': newubiq,
            'OverheadList': []
        })
        # add it to the parent
        request.matchdict = {'id': newbgid}
        request.method = 'POST'
        response = self._callFUT(request)
        # assert if the response from the add view is OK
        self.assertEqual(response.keys(), ['node', 'ID'])
        # get the id of the new node
        newubid = response['ID']

        newrespartq = 50
        # Add a resource part
        request = testing.DummyRequest(json_body={
            'ResourceID': resaid,
            'Quantity': newrespartq,
            'NodeType': 'ResourcePart'
        })
        # add it to the resource unit
        request.matchdict = {'id': resunitid}
        request.method = 'POST'
        response = self._callFUT(request)
        # assert if the response from the add view has data
        self.assertEqual(response.keys(), ['node', 'ID'])
        # get the id of the new node
        respartid = response['ID']

        newbiq = 10
        # Add a budgetitem
        request = testing.DummyRequest(json_body={
            'ResourceID': resid,
            'NodeType': 'BudgetItem',
            'Quantity': newbiq,
            'OverheadList': []
        })
        # add it to the parent
        request.matchdict = {'id': newbgid}
        request.method = 'POST'
        response = self._callFUT(request)
        # assert if the response from the add view is OK
        self.assertEqual(response.keys(), ['node', 'ID'])
        # get the id of the new node
        newbid = response['ID']

        newparttot = Decimal(newrespartq * newresarate).quantize(Decimal('.01'))
        newunitrate = newparttot
        newbiunittot = Decimal(newubiq*float(newunitrate)).quantize(Decimal('.01'))
        newbitot = Decimal(newbiq*newresrate).quantize(Decimal('.01'))
        newprojtot = newbitot + newbiunittot

        # test the total of the budgetitem
        request = testing.DummyRequest()
        request.matchdict = {'id': newubid}
        from optimate.app.views import node_cost
        response = node_cost(request)
        # true if the cost is correct
        self.assertEqual(response['Cost'], str(newbiunittot))

        # test the total of the budgetitem
        request = testing.DummyRequest()
        request.matchdict = {'id': newbid}
        from optimate.app.views import node_cost
        response = node_cost(request)
        # true if the cost is correct
        self.assertEqual(response['Cost'], str(newbitot))

        # test the total of the project
        request = testing.DummyRequest()
        request.matchdict = {'id': projectid}
        from optimate.app.views import node_cost
        response = node_cost(request)
        # true if the cost is correct
        self.assertEqual(response['Cost'], str(newprojtot))

class TestEditItemSuccessCondition(unittest.TestCase):
    """ Test if the nodeview functions correctly when editing a node
    """

    def setUp(self):
        self.session = _initTestingDB()
        self.config = testing.setUp()

    def tearDown(self):
        self.session.remove()
        testing.tearDown()

    def _callFUT(self, request):
        if not 'json_body' in request.__dict__:
            request.json_body = {}
        from optimate.app.views import nodeview
        return nodeview(request)

    def test_edit_budgetgroup(self):
        _registerRoutes(self.config)

        # Add the default data using json in the request
        request = testing.DummyRequest(json_body={
            'Name': 'EditedName',
            'Description': 'Edit test item',
            'NodeType': 'BudgetGroup'
        })
        # add it to id:1 the project
        request.matchdict = {'id': 2}
        request.method = 'PUT'
        response = self._callFUT(request)
        # assert if the response from the add view is OK
        self.assertEqual(response.code, 200)

        # check if the name has changed
        request = testing.DummyRequest()
        request.matchdict = {'id': 2}
        request.method = 'GET'
        response = self._callFUT(request)
        self.assertEqual(response['Name'], 'EditedName')

    def test_edit_budgetitem(self):
        _registerRoutes(self.config)

        # Add the default data using json in the request
        request = testing.DummyRequest(json_body={
            'ResourceID': 16,
            'Quantity': 10,
            'NodeType': 'BudgetItem',
            'OverheadList':[{'Name': 'Overhead',
                                'ID':1,
                                'selected':True}],
        })
        request.matchdict = {'id': 3}
        request.method = 'PUT'
        response = self._callFUT(request)

        # assert if the response returns ok
        self.assertEqual(response.code, 200)

        # check if the name has changed
        request = testing.DummyRequest()
        request.matchdict = {'id': 3}
        request.method = 'GET'
        response = self._callFUT(request)
        self.assertEqual(response['Name'], 'TestResourceA')

    def test_edit_resource(self):
        _registerRoutes(self.config)

        # Add the resource data
        request = testing.DummyRequest(json_body={
            'Name': 'EditResource',
            'NodeType': 'Resource',
            'Code': 'E000',
            'Rate': 50,
            'ResourceTypeID': 1,
            'UnitID': 2
        })
        request.matchdict = {'id': 25}
        request.method = 'PUT'
        response = self._callFUT(request)

        # assert if the response returns ok
        self.assertEqual(response.code, 200)

        # check if the name has changed
        request = testing.DummyRequest()
        request.matchdict = {'id': 25}
        request.method = 'GET'
        response = self._callFUT(request)
        self.assertEqual(response['Name'], 'EditResource')

    def test_edit_resource_part(self):
        _registerRoutes(self.config)

        # Add the resource data
        request = testing.DummyRequest(json_body={
            'ResourceID': 16,
            'NodeType': 'ResourcePart',
            'Quantity': 25,
        })
        request.matchdict = {'id': 7}
        request.method = 'PUT'
        response = self._callFUT(request)

        # assert if the response returns ok
        self.assertEqual(response.code, 200)

class TestDeleteviewSuccessCondition(unittest.TestCase):
    """ Test if the delete view functions correctly and deletes the node
        specified by the request.
    """

    def setUp(self):
        self.session = _initTestingDB()
        self.config = testing.setUp()

    def tearDown(self):
        self.session.remove()
        testing.tearDown()

    def _callFUT(self, request):
        from optimate.app.views import nodeview
        return nodeview(request)

    def test_it(self):
        # delete the budgetgroup with id 2
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.matchdict = {'id': 2}
        request.method = 'DELETE'
        response = self._callFUT(request)
        # true if the response from deleteview is the parentid
        self.assertEqual(response['parentid'], 1)

        # check now that no nodes have that budgetgroup as a parent
        request = testing.DummyRequest()
        request.matchdict = {'parentid': 2}
        from optimate.app.views import node_children
        response = node_children(request)
        self.assertEqual(response.code, 500)

        # do another test to see if the cost is correct on the project id 1
        # since it has no children it's cost should be 0
        request = testing.DummyRequest()
        request.matchdict = {'id': 1}
        from optimate.app.views import node_cost
        response = node_cost(request)
        self.assertEqual(response['Cost'], '0.00')


class TestCopySuccessCondition(unittest.TestCase):
    """ Test that the copy and pastes correctly from a node to another one.
    """

    def setUp(self):
        self.session = _initTestingDB()
        self.config = testing.setUp()

    def tearDown(self):
        self.session.remove()
        testing.tearDown()

    def _callFUT(self, request):
        from optimate.app.views import node_paste
        return node_paste(request)

    def test_budgetgroup_in_project(self):
        _registerRoutes(self.config)
        # check the destination project overheads
        from optimate.app.views import overheadsview
        request = testing.DummyRequest()
        request.method = 'GET'
        request.params = DummyOverhead()
        request.matchdict = {'nodeid': 4}
        response = overheadsview(request)
        projectoverheads = DBSession.query(Overhead).filter_by(ProjectID=4).all()
        self.assertEqual(len(response), len(projectoverheads))

        # set the default node to be copied
        # which is budgetgroup with id 2
        request = testing.DummyRequest(json_body={
            'ID': '2',
            'cut': False}
        )
        # set the node to be pasted into
        # which is projectb with id 4
        request.matchdict = {'id': 4}
        response = self._callFUT(request)

        # true if the response from paste view returns the new id
        self.assertEqual(response.keys(), ['node', 'newId'])

        # check the destination project overheads has changed
        request = testing.DummyRequest()
        request.method = 'GET'
        request.matchdict = {'nodeid': 4}
        request.params = DummyOverhead()
        response = overheadsview(request)
        newprojectoverheads = DBSession.query(Overhead).filter_by(ProjectID=4).all()
        self.assertNotEqual(len(newprojectoverheads), len(projectoverheads))
        self.assertEqual(len(response), len(newprojectoverheads))

        # do another test to see if the children of the parent is now three
        # (two budgetgroups and the resourcecategory)
        request = testing.DummyRequest()
        request.matchdict = {'parentid': 4}
        from optimate.app.views import node_children
        response = node_children(request)
        self.assertEqual(len(response), 3)

        copiedtotal = bgtot
        newtotal = projbtot + copiedtotal

        # do another test to see if the cost is correct
        request = testing.DummyRequest()
        request.matchdict = {'id': 4}
        from optimate.app.views import node_cost
        response = node_cost(request)
        self.assertEqual(response['Cost'], str(newtotal))

    def test_project_in_root(self):
        _registerRoutes(self.config)
        # set the default node to be copied
        # which is project with id 1
        request = testing.DummyRequest(json_body={
            'ID': '1',
            'cut': False}
        )
        # set the node to be pasted into
        # which is root with id 0
        request.matchdict = {'id': 0}
        response = self._callFUT(request)

        # true if the response from paste view returns the new id
        self.assertEqual(response.keys(), ['node', 'newId'])
        newid = response['newId']

        # do another test to see if the children of the parent is now four
        request = testing.DummyRequest()
        request.matchdict = {'parentid': 0}
        from optimate.app.views import node_children
        response = node_children(request)
        self.assertEqual(len(response), 4)

        # do another test to see if the name is 'Copy of'
        request = testing.DummyRequest()
        request.matchdict = {'id': newid}
        from optimate.app.views import nodeview
        response = nodeview(request)
        self.assertEqual(response['Name'], 'Copy of TestPName')
        # test the project costs is 0
        request = testing.DummyRequest()
        request.matchdict = {'id': newid}
        from optimate.app.views import node_cost
        response = node_cost(request)
        self.assertEqual(response['Cost'], '0.00')

    def test_resourcecategory_in_resourcecategory(self):
        _registerRoutes(self.config)
        # set the node to be copied
        # which is resource category with id 24
        request = testing.DummyRequest(json_body={
            'ID': '24',
            'cut': False}
        )
        # set the node to be pasted into
        # which is resource category with id
        request.matchdict = {'id': 9}
        response = self._callFUT(request)

        # true if the response from paste view returns the new id
        self.assertEqual(response.keys(), ['node', 'newId'])
        newid = response['newId']

        # do another test to see if the children of the parent is now three
        request = testing.DummyRequest()
        request.matchdict = {'parentid': 9}
        from optimate.app.views import node_children
        response = node_children(request)
        self.assertEqual(len(response), 3)

    def test_resourcecategory_in_resourcecategory_duplicates(self):
        _registerRoutes(self.config)
        # set the node to be copied
        request = testing.DummyRequest(json_body={
            'ID': '12',
            'cut': False,
            'duplicates': {'A000': True}}
        )
        # set the node to be pasted into
        request.matchdict = {'id': 9}
        response = self._callFUT(request)

        # true if the response from paste view returns the new id
        self.assertEqual(response.keys(), ['node', 'newId'])
        newid = response['newId']

        # do another test to see if the children of the parent is now three
        request = testing.DummyRequest()
        request.matchdict = {'parentid': 9}
        from optimate.app.views import node_children
        response = node_children(request)
        self.assertEqual(len(response), 3)

    def test_paste_in_same_level(self):
        _registerRoutes(self.config)
        # set the node to be copied
        request = testing.DummyRequest(json_body={
            'ID': '2',
            'cut': False}
        )
        # set the node to be pasted into
        request.matchdict = {'id': 1}
        response = self._callFUT(request)

        # true if the response from paste view returns the new id
        self.assertEqual(response.keys(), ['node', 'newId'])
        newid = response['newId']

        # do another test to see if the children of the parent is two
        request = testing.DummyRequest()
        request.matchdict = {'parentid': 1}
        from optimate.app.views import node_children
        response = node_children(request)
        self.assertEqual(len(response), 3)


class TestCutAndPasteSuccessCondition(unittest.TestCase):
    """ Test that a node is correctly cut and pasted
    """

    def setUp(self):
        self.session = _initTestingDB()
        self.config = testing.setUp()

    def tearDown(self):
        self.session.remove()
        testing.tearDown()

    def _callFUT(self, request):
        from optimate.app.views import node_paste
        return node_paste(request)

    def test_it(self):
        _registerRoutes(self.config)
        # set the default node to be cut
        # which is budgetgroup with id 2
        request = testing.DummyRequest(json_body={
            'ID': '2',
            'cut': True}
        )
        # set the node to be pasted into
        # which is projectb with id 4
        request.matchdict = {'id': 4}
        response = self._callFUT(request)

        # true if the response from paste view returns the new id
        self.assertEqual(response.keys(), ['node', 'newId'])

        # do another test to see if the children of the parent is now three
        # (two budgetgroups and the resourcecategory)
        request = testing.DummyRequest()
        request.matchdict = {'parentid': 4}
        from optimate.app.views import node_children
        response = node_children(request)
        self.assertEqual(len(response), 3)

        # do another test to see if the children of project id 1 is now 1
        request = testing.DummyRequest()
        request.matchdict = {'parentid': 1}
        from optimate.app.views import node_children
        response = node_children(request)
        self.assertEqual(len(response), 1)

class TestCostviewSuccessCondition(unittest.TestCase):
    """ Test all the Costs are correct
    """

    def setUp(self):
        self.session = _initTestingDB()
        self.config = testing.setUp()

    def tearDown(self):
        self.session.remove()
        testing.tearDown()

    def _callFUT(self, request):
        from optimate.app.views import node_cost
        return node_cost(request)

    def test_project_cost(self):
        _registerRoutes(self.config)
        # get the cost of project at id 1
        request = testing.DummyRequest()
        request.matchdict = {'id': 1}
        response = self._callFUT(request)
        # true if the cost is correct
        self.assertEqual(response['Cost'], str(projtot))

    def test_budgetgroup_cost(self):
        _registerRoutes(self.config)
        # get the cost of budgetgroup at id 2
        request = testing.DummyRequest()
        request.matchdict = {'id': 2}
        response = self._callFUT(request)
        self.assertEqual(response['Cost'], str(bgtot))

    def test_budgetitem_cost(self):
        _registerRoutes(self.config)
        # get the cost of budgetitem at id 3
        request = testing.DummyRequest()
        request.matchdict = {'id': 3}
        response = self._callFUT(request)
        self.assertEqual(response['Cost'], str(bitot))

    def test_budgetitema_cost(self):
        _registerRoutes(self.config)
        # get the cost at id 11
        request = testing.DummyRequest()
        request.matchdict = {'id': 11}
        response = self._callFUT(request)
        self.assertEqual(response['Cost'], str(biatot))

    def test_resource_part_cost(self):
        _registerRoutes(self.config)
        # get the cost at id 7
        request = testing.DummyRequest()
        request.matchdict = {'id': 7}
        response = self._callFUT(request)
        self.assertEqual(response['Cost'], str(resunitrate))

    def test_projectb_cost(self):
        _registerRoutes(self.config)
        # get the cost of projectb at id 4
        request = testing.DummyRequest()
        request.matchdict = {'id': 4}
        response = self._callFUT(request)
        self.assertEqual(response['Cost'], str(projbtot))

    def test_budgetgroupb_cost(self):
        _registerRoutes(self.config)
        # get the cost of budgetgroupb at id 5
        request = testing.DummyRequest()
        request.matchdict = {'id': 5}
        response = self._callFUT(request)
        # true if the cost is correct
        self.assertEqual(response['Cost'], str(bgbtot))

    def test_budgetitemb_cost(self):
        _registerRoutes(self.config)
        # get the cost of budgetitemb at id 6
        request = testing.DummyRequest()
        request.matchdict = {'id': 6}
        response = self._callFUT(request)
        self.assertEqual(response['Cost'], str(bibtot))

    def test_budgetitemc_cost(self):
        _registerRoutes(self.config)
        # get the cost of budgetitemc at id 13
        request = testing.DummyRequest()
        request.matchdict = {'id': 13}
        response = self._callFUT(request)
        self.assertEqual(response['Cost'], str(bictot))

    def test_projectc_cost(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.matchdict = {'id': 19}
        response = self._callFUT(request)
        self.assertEqual(response['Cost'],  str(projctot))

    def test_budgetgroupc_cost(self):
        _registerRoutes(self.config)

        request = testing.DummyRequest()
        request.matchdict = {'id': 20}
        response = self._callFUT(request)
        self.assertEqual(response['Cost'],  str(bgctot))

    def test_budgetgroupd_cost(self):
        _registerRoutes(self.config)

        request = testing.DummyRequest()
        request.matchdict = {'id': 21}
        response = self._callFUT(request)
        self.assertEqual(response['Cost'],  str(bgdtot))

    def test_budgetitemd_cost(self):
        _registerRoutes(self.config)

        request = testing.DummyRequest()
        request.matchdict = {'id': 22}
        response = self._callFUT(request)
        self.assertEqual(response['Cost'], str(bidtot))

    def test_budgetiteme_cost(self):
        _registerRoutes(self.config)

        request = testing.DummyRequest()
        request.matchdict = {'id': 23}
        response = self._callFUT(request)
        self.assertEqual(response['Cost'], str(bietot))

class TestOrderedSuccessCondition(unittest.TestCase):
    """ Test the Ordered amounts on nodes
    """

    def setUp(self):
        self.session = _initTestingDB()
        self.config = testing.setUp()

    def tearDown(self):
        DBSession.remove()
        testing.tearDown()

    def _callFUT(self, request):
        from optimate.app.views import orderview
        return orderview(request)

    def test_add(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.method = 'POST'
        request.matchdict['id'] = 0
        budgetitemslist = [{'ID': 11, 'id': 11,'quantity': 5, 'rate': 10}]
        request.json_body = {'ProjectID': 1,
                            'SupplierID': 2,
                            'Total': 78,
                            'BudgetItemsList': budgetitemslist}
        response = self._callFUT(request)
        # get the new order id
        newid = response['ID']

        request = testing.DummyRequest()
        request.method = 'GET'
        request.matchdict['id'] = newid
        response = self._callFUT(request)
        ordertotal = response['Total']

        request = testing.DummyRequest()
        request.method = 'GET'
        request.matchdict['id'] = 1
        from optimate.app.views import nodeview
        response = nodeview(request)
        orderedtotal = response['Ordered']
        # the new order total should be the same as the project ordered total
        self.assertEqual(ordertotal, orderedtotal)

class TestInvoicedAmountViewSuccessCondition(unittest.TestCase):
    """ Test the invoiced amounts on nodes
    """

    def setUp(self):
        self.session = _initTestingDB()
        self.config = testing.setUp()

    def tearDown(self):
        DBSession.remove()
        testing.tearDown()

    def _callFUT(self, request):
        from optimate.app.views import invoiceview
        return invoiceview(request)

    def test_add(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.method = 'POST'
        request.matchdict['id'] = 0
        budgetitemslist = [{'ID': 11, 'id': 11, 'Quantity': 4, 'Rate': 7}]
        request.json_body = {'ProjectID': 1,
                            'SupplierID': 2,
                            'BudgetItemsList': budgetitemslist}
        from optimate.app.views import orderview
        response = orderview(request)
        # get the new order id
        newid = response['ID']

        request = testing.DummyRequest()
        request.method = 'POST'
        request.matchdict['id'] = 0
        request.json_body = {'OrderID':newid,
                                'Amount': 56}
        response = self._callFUT(request)
        request = testing.DummyRequest()
        request.method = 'GET'
        request.matchdict['id'] = 1
        from optimate.app.views import nodeview
        response = nodeview(request)
        invoiced = response['Invoiced']
        # the new invoiced amount should be the same as the invoice amount
        self.assertEqual(invoiced, '56.00')
