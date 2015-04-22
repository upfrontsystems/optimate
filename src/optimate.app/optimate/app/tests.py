""" The pyramid views and their functions are being tested.
    That is: Child view
             Add view
             Delete view
             Paste view
             Cost view
             Clients view
             Suppliers view
             The POST, PUT, DELETE versions of client and supplier view
"""

import unittest
import transaction
from pyramid import testing
from .models import DBSession
from decimal import Decimal

def _initTestingDB():
    """ Build a database with default data
    """

    from sqlalchemy import create_engine
    from .models import (
        Node,
        Project,
        BudgetGroup,
        BudgetItem,
        Component,
        ComponentType,
        ResourceCategory,
        Resource,
        Client,
        Supplier,
        Base
    )
    engine = create_engine('sqlite://')
    Base.metadata.create_all(engine)
    DBSession.configure(bind=engine)
    with transaction.manager:


        root = Node(ID=0)
        project = Project(Name='TestPName',
                        ID=1,
                        Description='TestPDesc',
                        ParentID=0)
        budgetgroup = BudgetGroup(Name='TestBGName',
                        ID=2,
                        Description='TestBGDesc',
                        ParentID=project.ID)
        budgetitem = BudgetItem(Name='TestBIName',
                        ID=3,
                        Description='TestBIDesc',
                        _Quantity=5.0,
                        _Markup=0.1,
                        ParentID=budgetgroup.ID)
        rescat = ResourceCategory(Name='Resource List',
                        ID=9,
                        Description='Test Category',
                        ParentID=project.ID)
        res = Resource(ID=15,
                       Code='A000',
                       Name='TestResource',
                       Description='Test resource',
                       _Rate=Decimal(5.00),
                       ParentID=rescat.ID)
        resa = Resource(ID=16,
                       Code='A001',
                       Name='TestResourceA',
                       Description='Test resource',
                       _Rate=Decimal(10.00),
                       ParentID=rescat.ID)
        comp = Component(ID=7,
                        ResourceID = res.ID,
                        _Quantity=5.0,
                        _Markup=0.05,
                        Type=1,
                        ParentID=budgetitem.ID)
        compa = Component(ID=11,
                        ResourceID=resa.ID,
                        _Quantity=7.0,
                        _Markup=0.01,
                        Type=1,
                        ParentID=budgetitem.ID)
        comptype = ComponentType(ID=1, Name='type')


        projectb = Project(Name='TestBPName',
                        ID=4,
                        Description='TestBPDesc',
                        ParentID=0)
        budgetgroupb = BudgetGroup(Name='TestBBGName',
                        ID=5,
                        Description='BBGDesc',
                        ParentID=projectb.ID)
        budgetitemb = BudgetItem(Name='TestBBIName',
                        ID=6,
                        _Quantity=10.0,
                        _Markup=0.5,
                        Description='TestBBIDesc',
                        ParentID=budgetgroupb.ID)
        rescatb = ResourceCategory(Name='Resource List',
                        ID=12,
                        Description='Test Category',
                        ParentID=projectb.ID)
        resb = Resource(Name='TestResourceB',
                       ID=17,
                       Code='A002',
                       Description='Test resource',
                       _Rate=Decimal(7.00),
                       ParentID=rescatb.ID)
        resduplicate = Resource(Name='TestResource',
                       ID=18,
                       Code='A000',
                       Description='Test resource',
                       _Rate=Decimal(5.00),
                       ParentID=rescatb.ID)
        compb = Component(ID=8,
                        ResourceID=resb.ID,
                        _Quantity=5.0,
                        _Markup=0.1,
                        Type=1,
                        ParentID=budgetitemb.ID)
        budgetitemc = BudgetItem(Name='TestCBIName',
                        ID=13,
                        _Quantity=6.0,
                        _Markup=0.1,
                        Description='TestCBIDesc',
                        ParentID=budgetgroupb.ID)
        compc = Component(ID=14,
                        ResourceID=resduplicate.ID,
                        _Quantity=8.0,
                        _Markup=0.2,
                        Type=1,
                        ParentID=budgetitemc.ID)

        projectc = Project(Name='TestCPName',
                        ID=19,
                        Description='TestCPDesc',
                        ParentID=0)
        budgetgroupc = BudgetGroup(Name='TestCBGName',
                        ID=20,
                        Description='CBGDesc',
                        ParentID=projectc.ID)
        budgetgroupd = BudgetGroup(Name='TestDBGName',
                        ID=21,
                        Description='DBGDesc',
                        ParentID=budgetgroupc.ID)
        budgetitemd = BudgetItem(Name='TestDBIName',
                        ID=22,
                        _Quantity=39.0,
                        _Markup=0.15,
                        Description='TestDBIDesc',
                        ParentID=budgetgroupd.ID)
        budgetiteme = BudgetItem(Name='TestEBIName',
                        ID=23,
                        _Quantity=16.3,
                        _Markup=0.001,
                        Description='TestEBIDesc',
                        ParentID=budgetgroupc.ID)
        rescatc = ResourceCategory(ID=24,
                        Name='Resource List',
                        Description='Test Category',
                        ParentID=projectc.ID)
        resbduplicate = Resource(ID=25,
                       Code='A002',
                       Name='TestResourceB',
                       Description='Test resource',
                       _Rate=Decimal(7.00),
                       ParentID=rescatc.ID)
        compd = Component(ID=26,
                        ResourceID=resbduplicate.ID,
                        _Quantity=7.01,
                        _Markup=0.9,
                        Type=1,
                        ParentID=budgetitemd.ID)
        compe = Component(ID=27,
                        ResourceID=resbduplicate.ID,
                        _Quantity=15.0,
                        _Markup=0.25,
                        Type=1,
                        ParentID=budgetiteme.ID)

        client = Client (Name='TestClientName')
        supplier = Supplier(Name='TestSupplierName')

        DBSession.add(comptype)
        DBSession.add(root)
        DBSession.add(project)
        DBSession.add(rescat)
        DBSession.add(budgetgroup)
        DBSession.add(budgetitem)
        DBSession.add(res)
        DBSession.add(resa)
        DBSession.add(comp)
        DBSession.add(compa)

        DBSession.add(projectb)
        DBSession.add(resb)
        DBSession.add(resduplicate)
        DBSession.add(budgetgroupb)
        DBSession.add(budgetitemb)
        DBSession.add(compb)
        DBSession.add(budgetitemc)
        DBSession.add(compc)
        DBSession.add(rescatb)

        DBSession.add(projectc)
        DBSession.add(budgetgroupc)
        DBSession.add(budgetgroupd)
        DBSession.add(budgetitemd)
        DBSession.add(budgetiteme)
        DBSession.add(rescatc)
        DBSession.add(resbduplicate)
        DBSession.add(compd)
        DBSession.add(compe)

        DBSession.add(client)
        DBSession.add(supplier)

        transaction.commit()

        """The hierarchy
        project -(533.23) id:1
                |
                budgetgroup -(533.23) id:2
                            |
                            budgetitem -(1.1*(26.25+70.7)*5=533.23) id:3
                                       |
                                       comp - res (1.05*5*5=26.25) id:7
                                       |
                                       compa - resa (1.01*7*10=70.7) id:11
                |
                rescat - id:9
                        |
                        res id:15
                        |
                        resa id:16
        projectb -(894.3) id:4
                 |
                 budgetgroupb -(577.50+316.80=894.3) id:5
                              |
                              budgetitemb - (1.5*38.5*10=577.50) id:6
                                          |
                                          compb - resb (1.1*5*7=38.5) id:8
                              |
                              budgetitemc - (1.1*48*6=316.80) id:13
                                          |
                                          compc - resdupli (1.2*8*5=48) id:14
                 |
                 rescatb - id:12
                         |
                         resb id:17
                         |
                         resduplicate id:18

        projectc -(6322.88) id:19
                 |
                 budgetgroupc -(4181.36+2141.51=6322.88) id:20
                              |
                              budgetgroupd - (4181.37) id:21
                                           |
                                           budgetitemd -
                                           (1.15*39*93.23=4181.37) id:22
                                                      |
                                                      compd - id:26
                                                      resbduplicate
                                                         (1.9*7.01*7=93.23) id:8
                              |
                              budgetiteme - (1.001*131.25*16.3=2141.51) id:23
                                          |
                                          compe - id:27
                                          resbduplicate (1.25*15*7=131.25) id:14
                 |
                 rescatc - id:24
                         |
                         resbduplicate id:25 rate:7

        """
        # projectlist = DBSession.query(Project).all()
        # for project in projectlist:
        #     project.recalculateTotal()

        # print 'print children'
        # for child in DBSession.query(Node).filter_by(ID=2).first().Children:
        #     print child.Total
        # print 'printing components'
        # for bi in DBSession.query(Component).all():
        #     print bi
        # rescatlist = DBSession.query(ResourceCategory).all()
        # for rescate in rescatlist:
        #     print rescate.Resources
        # reslist = DBSession.query(Resource).all()
        # for res in reslist:
        #     for co in res.Components:
        #         print co

        # comlist = DBSession.query(Component).all()
        # for com in comlist:
        #     print com

    return DBSession


def _registerRoutes(config):
    config.add_route('root', '/')
    config.add_route('childview', '/{parentid}/')
    config.add_route('addview', '/{id}/add')
    config.add_route('deleteview', '/{id}/delete')
    config.add_route('pasteview', '/{id}/paste')
    config.add_route('clientview', '/clients')
    config.add_route('supplierview', '/suppliers')


class TestChildViewSuccessCondition(unittest.TestCase):
    """ Test if the Root view functions correctly.
        It also calls the childview but without a url path,
        the default root id '0' is then used in the view
    """

    def setUp(self):
        self.session = _initTestingDB()
        self.config = testing.setUp()

    def tearDown(self):
        DBSession.remove()
        testing.tearDown()

    def _callFUT(self, request):
        from .views import childview
        return childview(request)

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

        # the resource category should return no children
        self.assertEqual(len(response), 0)


class TestProjectListingSuccessCondition(unittest.TestCase):
    """ Test if the project_listing view works and returns
        a list of all the projects
    """

    def setUp(self):
        self.session = _initTestingDB()
        self.config = testing.setUp()

    def tearDown(self):
        DBSession.remove()
        testing.tearDown()

    def _callFUT(self, request):
        from .views import project_listing
        return project_listing(request)

    def test_it(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        response = self._callFUT(request)

        # assert returns true if the projects are returned in the correct order
        self.assertEqual(response[0]['Name'], 'TestBPName')
        self.assertEqual(response[1]['Name'], 'TestCPName')
        self.assertEqual(response[2]['Name'], 'TestPName')

class TestProjectViewSuccessCondition(unittest.TestCase):
    """ Test if the projectview works and returns the project specified
    """

    def setUp(self):
        self.session = _initTestingDB()
        self.config = testing.setUp()

    def tearDown(self):
        DBSession.remove()
        testing.tearDown()

    def _callFUT(self, request):
        from .views import projectview
        return projectview(request)

    def test_it(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.matchdict = {'projectid': 1}
        response = self._callFUT(request)

        # assert returns true if the correct project is returned
        self.assertEqual(response[0]['Name'], 'TestPName')

        # test that nothing is returned when a different node id is given
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.matchdict = {'projectid': 5}
        response = self._callFUT(request)

        # assert returns true if there is nothing in the response
        self.assertEqual(len(response), 0)

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
        from .views import nodegridview
        return nodegridview(request)

    def test_project_gridview(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.matchdict = {'parentid': 0}
        response = self._callFUT(request)
        # assert returns true if the projects are returned correctly
        self.assertEqual(response['list'][0]['name'], 'TestBPName')
        self.assertEqual(response['list'][1]['name'], 'TestCPName')
        self.assertEqual(response['list'][2]['name'], 'TestPName')
        self.assertEqual(response['emptycolumns'], True)

    def test_budgetgroup_gridview(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.matchdict = {'parentid': 1}
        response = self._callFUT(request)

        # assert returns true if the projects are returned correctly
        self.assertEqual(response['list'][0]['name'], 'Resource List')
        self.assertEqual(response['list'][1]['name'], 'TestBGName')
        self.assertEqual(response['emptycolumns'], True)

    def test_mixed_gridview(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.matchdict = {'parentid': 20}
        response = self._callFUT(request)

        # the children are a mix of budgetgroup and budgetitem
        # emptycolumns should return false
        self.assertEqual(response['list'][0]['name'], 'TestDBGName')
        self.assertEqual(response['list'][1]['name'], 'TestEBIName')
        self.assertEqual(response['emptycolumns'], False)

    def test_budgetitem_gridview(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.matchdict = {'parentid': 5}
        response = self._callFUT(request)

        # assert returns true if the projects are returned correctly
        self.assertEqual(response['list'][0]['name'], 'TestBBIName')
        self.assertEqual(response['list'][1]['name'], 'TestCBIName')
        self.assertEqual(response['emptycolumns'], False)

    def test_component_gridview(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.matchdict = {'parentid': 3}
        response = self._callFUT(request)

        # assert returns true if the projects are returned correctly
        self.assertEqual(response['list'][0]['name'], 'TestResource')
        self.assertEqual(response['list'][1]['name'], 'TestResourceA')
        self.assertEqual(response['emptycolumns'], False)

class TestUpdateValueSuccessCondition(unittest.TestCase):
    """ Update values in resource, component, and budgetitem and test
    """

    def setUp(self):
        self.session = _initTestingDB()
        self.config = testing.setUp()

    def tearDown(self):
        DBSession.remove()
        testing.tearDown()

    def _callFUT(self, request):
        from .views import update_value
        return update_value(request)

    def test_update_resource_rate(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.matchdict = {'id': 16}
        request.params = {'rate': 15}
        response = self._callFUT(request)

        # now the project cost should have changed
        request = testing.DummyRequest()
        request.matchdict = {'id': 1}
        from .views import costview
        response = costview(request)
        self.assertEqual(response['Cost'], '727.65')

    def test_update_duplicate_resource_rate(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.matchdict = {'id': 25}
        request.params = {'rate': 10}
        response = self._callFUT(request)

        # now the project cost should have changed
        request = testing.DummyRequest()
        request.matchdict = {'id': 19}
        from .views import costview
        response = costview(request)
        self.assertEqual(response['Cost'], '9032.88')

    def test_update_component_quantity(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.matchdict = {'id': 7}
        request.params = {'quantity': 10}
        response = self._callFUT(request)

        # now the project cost should have changed
        request = testing.DummyRequest()
        request.matchdict = {'id': 1}
        from .views import costview
        response = costview(request)
        self.assertEqual(response['Cost'], '677.60')

    def test_update_component_markup(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.matchdict = {'id': 7}
        request.params = {'markup': '50'}
        response = self._callFUT(request)

        # now the project cost should have changed
        request = testing.DummyRequest()
        request.matchdict = {'id': 1}
        from .views import costview
        response = costview(request)
        self.assertEqual(response['Cost'], '595.10')

    def test_update_budgetitem_quantity(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.matchdict = {'id': 3}
        request.params = {'quantity': 50}
        response = self._callFUT(request)

        # now the project cost should have changed
        request = testing.DummyRequest()
        request.matchdict = {'id': 1}
        from .views import costview
        response = costview(request)
        self.assertEqual(response['Cost'], '5332.25')

    def test_update_budgetitem_markup(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.matchdict = {'id': 3}
        request.params = {'markup': '1'}
        response = self._callFUT(request)

        # now the project cost should have changed
        request = testing.DummyRequest()
        request.matchdict = {'id': 1}
        from .views import costview
        response = costview(request)
        self.assertEqual(response['Cost'], '489.60')

class TestAddItemSuccessCondition(unittest.TestCase):
    """ Test if the additemview functions correctly when adding a budgetgroup
        Using default data and adding it as the child of one of the objects.
    """

    def setUp(self):
        self.session = _initTestingDB()
        self.config = testing.setUp()

    def tearDown(self):
        self.session.remove()
        testing.tearDown()

    def _callFUT(self, request):
        from .views import additemview
        return additemview(request)

    def test_add_budgetgroup(self):
        _registerRoutes(self.config)

        # Add the default data using json in the request
        request = testing.DummyRequest(json_body={
            'Name': 'AddingName',
            'Description': 'Adding test item',
            'NodeType': 'budgetgroup'
        })
        # add it to id:1 the project
        request.matchdict = {'id': 1}
        response = self._callFUT(request)
        # assert if the response from the add view is OK
        self.assertEqual(response.code, 200)

        # Create another request for the child of the node added to
        request = testing.DummyRequest()
        request.matchdict = {'parentid': 1}
        from .views import childview
        response = childview(request)
        # true if the name of the child added to the node is 'AddingName'
        self.assertEqual(response[0]['Name'], 'AddingName')

    def test_add_component(self):
        _registerRoutes(self.config)

        # Add the default data using json in the request
        request = testing.DummyRequest(json_body={
            'Name': 'TestResourceA',
            'Description': 'Test resource',
            'Quantity': 4,
            'NodeType': 'component',
            'ComponentType': 1
        })
        # add it to id:6 the budgetitemb
        request.matchdict = {'id': 6}
        response = self._callFUT(request)

        # assert if the response from the add view is OK
        self.assertEqual(response.code, 200)

        # do another test to see if the cost is correct
        request = testing.DummyRequest()
        request.matchdict = {'id': 4}
        from .views import costview
        response = costview(request)
        self.assertEqual(response['Cost'], '1494.30')

    def test_add_whole_project(self):
        _registerRoutes(self.config)

        # Add the default project using json in the request
        request = testing.DummyRequest(json_body={
            'Name': 'AddingProject',
            'Description': 'Adding test item',
            'NodeType': 'project'
        })
        # add it to id:0 the root
        request.matchdict = {'id': 0}
        response = self._callFUT(request)
        # assert if the response from the add view is OK
        self.assertEqual(response.code, 200)
        # get the id of the new node
        projectid = int(str(response))

        # Add a budgetgroup
        request = testing.DummyRequest(json_body={
            'Name': 'AddingBG',
            'Description': 'Adding test item',
            'NodeType': 'budgetgroup'
        })
        # add it to the parent
        request.matchdict = {'id': projectid}
        response = self._callFUT(request)
        # assert if the response from the add view is OK
        self.assertEqual(response.code, 200)
        # get the id of the new node
        newid = int(str(response))

        # Add a budgetitem
        request = testing.DummyRequest(json_body={
            'Name': 'AddingBI',
            'Description': 'Adding test item',
            'NodeType': 'budgetitem',
            'Quantity': 10.0
        })
        # add it to the parent
        request.matchdict = {'id': newid}
        response = self._callFUT(request)
        # assert if the response from the add view is OK
        self.assertEqual(response.code, 200)
        # get the id of the new node
        newid = int(str(response))

        # Add a component
        request = testing.DummyRequest(json_body={
            'Name': 'TestResource',
            'Description': 'Adding test item',
            'NodeType': 'component',
            'Quantity': 10.0,
            'ComponentType': 1
        })
        # add it to the parent
        request.matchdict = {'id': newid}
        response = self._callFUT(request)
        # assert if the response from the add view is OK
        self.assertEqual(response.code, 200)

        # test the total  of the project
        request = testing.DummyRequest()
        request.matchdict = {'id': projectid}
        from .views import costview
        response = costview(request)
        # true if the cost is correct
        self.assertEqual(response['Cost'], '500.00')

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
        from .views import deleteitemview
        return deleteitemview(request)

    def test_it(self):
        # delete the budgetgroup with id 2
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.matchdict = {'id': 2}
        response = self._callFUT(request)
        # true if the response from deleteview is OK
        self.assertEqual(response.code, 200)

        # check now that no nodes have that budgetgroup as a parent
        request = testing.DummyRequest()
        request.matchdict = {'parentid': 2}
        from .views import childview
        response = childview(request)
        self.assertEqual(len(response), 0)

        # do another test to see if the cost is correct on the project id 1
        # since it has no children it's cost should be 0
        request = testing.DummyRequest()
        request.matchdict = {'id': 1}
        from .views import costview
        response = costview(request)
        self.assertEqual(response['Cost'], '0.00')


class TestPasteviewSuccessCondition(unittest.TestCase):
    """ Test that the paste functions correctly with pasting from a
        default node to another one.
    """

    def setUp(self):
        self.session = _initTestingDB()
        self.config = testing.setUp()

    def tearDown(self):
        self.session.remove()
        testing.tearDown()

    def _callFUT(self, request):
        from .views import pasteitemview
        return pasteitemview(request)

    def test_it(self):
        _registerRoutes(self.config)
        # set the default node to be copied
        # which is budgetgroup with id 2
        request = testing.DummyRequest(json_body={
            'ID': '2'}
        )
        # set the node to be pasted into
        # which is projectb with id 4
        request.matchdict = {'id': 4}
        response = self._callFUT(request)

        # true if the response from paste view is OK
        self.assertEqual(response.code, 200)

        # do another test to see if the children of the parent is now three
        # (two budgetgroups and the resourcecategory)
        request = testing.DummyRequest()
        request.matchdict = {'parentid': 4}
        from .views import childview
        response = childview(request)
        self.assertEqual(len(response), 3)

        # do another test to see if the cost is correct
        request = testing.DummyRequest()
        request.matchdict = {'id': 4}
        from .views import costview
        response = costview(request)
        self.assertEqual(response['Cost'], '1427.53')

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
        from .views import costview
        return costview(request)

    def test_project_cost(self):
        _registerRoutes(self.config)
        # get the cost of project at id 1
        request = testing.DummyRequest()
        request.matchdict = {'id': 1}
        response = self._callFUT(request)
        # true if the cost is correct
        self.assertEqual(response['Cost'], '533.23')

    def test_budgetgroup_cost(self):
        _registerRoutes(self.config)
        # get the cost of budgetgroup at id 2
        request = testing.DummyRequest()
        request.matchdict = {'id': 2}
        response = self._callFUT(request)
        self.assertEqual(response['Cost'], '533.23')

    def test_budgetitem_cost(self):
        _registerRoutes(self.config)
        # get the cost of budgetitem at id 3
        request = testing.DummyRequest()
        request.matchdict = {'id': 3}
        response = self._callFUT(request)
        self.assertEqual(response['Cost'], '533.23')

    def test_component_cost(self):
        _registerRoutes(self.config)
        # get the cost of comp at id 7
        request = testing.DummyRequest()
        request.matchdict = {'id': 7}
        response = self._callFUT(request)
        self.assertEqual(response['Cost'], '26.25')

    def test_componenta_cost(self):
        _registerRoutes(self.config)
        # get the cost of compa at id 11
        request = testing.DummyRequest()
        request.matchdict = {'id': 11}
        response = self._callFUT(request)
        self.assertEqual(response['Cost'], '70.70')

    def test_projectb_cost(self):
        _registerRoutes(self.config)
        # get the cost of projectb at id 4
        request = testing.DummyRequest()
        request.matchdict = {'id': 4}
        response = self._callFUT(request)
        self.assertEqual(response['Cost'], '894.30')

    def test_budgetgroupb_cost(self):
        _registerRoutes(self.config)
        # get the cost of budgetgroupb at id 5
        request = testing.DummyRequest()
        request.matchdict = {'id': 5}
        response = self._callFUT(request)
        # true if the cost is correct
        self.assertEqual(response['Cost'], '894.30')

    def test_budgetitemb_cost(self):
        _registerRoutes(self.config)
        # get the cost of budgetitemb at id 6
        request = testing.DummyRequest()
        request.matchdict = {'id': 6}
        response = self._callFUT(request)
        self.assertEqual(response['Cost'], '577.50')

    def test_componentb_cost(self):
        _registerRoutes(self.config)
        # get the cost of compb at id 8
        request = testing.DummyRequest()
        request.matchdict = {'id': 8}
        response = self._callFUT(request)
        self.assertEqual(response['Cost'], '38.50')

    def test_budgetitemc_cost(self):
        _registerRoutes(self.config)
        # get the cost of budgetitemc at id 13
        request = testing.DummyRequest()
        request.matchdict = {'id': 13}
        response = self._callFUT(request)
        self.assertEqual(response['Cost'], '316.80')

    def test_componentc_cost(self):
        _registerRoutes(self.config)
        # get the cost of compc at id 14
        request = testing.DummyRequest()
        request.matchdict = {'id': 14}
        response = self._callFUT(request)
        self.assertEqual(response['Cost'], '48.00')

    def test_projectc_cost(self):
        _registerRoutes(self.config)

        request = testing.DummyRequest()
        request.matchdict = {'id': 19}
        response = self._callFUT(request)
        self.assertEqual(response['Cost'], '6322.88')

    def test_budgetgroupc_cost(self):
        _registerRoutes(self.config)

        request = testing.DummyRequest()
        request.matchdict = {'id': 20}
        response = self._callFUT(request)
        self.assertEqual(response['Cost'], '6322.88')

    def test_budgetgroupd_cost(self):
        _registerRoutes(self.config)

        request = testing.DummyRequest()
        request.matchdict = {'id': 21}
        response = self._callFUT(request)
        self.assertEqual(response['Cost'], '4181.37')

    def test_budgetitemd_cost(self):
        _registerRoutes(self.config)

        request = testing.DummyRequest()
        request.matchdict = {'id': 22}
        response = self._callFUT(request)
        self.assertEqual(response['Cost'], '4181.37')

    def test_compd_cost(self):
        _registerRoutes(self.config)

        request = testing.DummyRequest()
        request.matchdict = {'id': 26}
        response = self._callFUT(request)
        self.assertEqual(response['Cost'], '93.23')

    def test_budgetiteme_cost(self):
        _registerRoutes(self.config)

        request = testing.DummyRequest()
        request.matchdict = {'id': 23}
        response = self._callFUT(request)
        self.assertEqual(response['Cost'], '2141.51')

    def test_compe_cost(self):
        _registerRoutes(self.config)

        request = testing.DummyRequest()
        request.matchdict = {'id': 27}
        response = self._callFUT(request)
        self.assertEqual(response['Cost'], '131.25')

class TestClientsviewSuccessCondition(unittest.TestCase):
    """ Test if the Client view returns a list with the correct client
    """

    def setUp(self):
        self.session = _initTestingDB()
        self.config = testing.setUp()

    def tearDown(self):
        DBSession.remove()
        testing.tearDown()

    def _callFUT(self, request):
        from .views import clientsview
        return clientsview(request)

    def test_it(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        response = self._callFUT(request)
        # test if the correct name is returned
        self.assertEqual(response[0]['Name'], 'TestClientName')


class TestClientSuccessCondition(unittest.TestCase):
    """ Test if the Client deletes successfully
    """

    def setUp(self):
        self.session = _initTestingDB()
        self.config = testing.setUp()

    def tearDown(self):
        DBSession.remove()
        testing.tearDown()

    def _callFUT(self, request):
        from .views import clientview
        return clientview(request)

    def test_delete_client(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.method = 'DELETE'
        request.matchdict = {'id': 1}
        response = self._callFUT(request)
        # test if the correct name is returned
        self.assertEqual(response.code, 200)

    def test_add_client(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest(json_body={
            'Name': 'AddingName',
            'Address': 'address',
            'City': 'city',
            'StateProvince': 'sp',
            'Country': 'country',
            'Zipcode': 'zip',
            'Fax': 'fax',
            'Phone': 'phone',
            'Cellular': 'cell',
            'Contact': 'contact'
        })
        request.method = 'POST'
        request.matchdict = {'id': 0}
        response = self._callFUT(request)
        # test if the correct name is returned
        self.assertEqual(response.keys()[0], 'newid')

        # check now that there are two clients
        request = testing.DummyRequest()
        from .views import clientsview
        response = clientsview(request)
        self.assertEqual(len(response), 2)

    def test_edit_client(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest(json_body={
            'Name': 'EditedName',
            'Address': 'address',
            'City': 'city',
            'StateProvince': 'sp',
            'Country': 'country',
            'Zipcode': 'zip',
            'Fax': 'fax',
            'Phone': 'phone',
            'Cellular': 'cell',
            'Contact': 'contact'
        })
        request.method = 'PUT'
        request.matchdict = {'id': 1}
        response = self._callFUT(request)
        # test if the correct name is returned
        self.assertEqual(response.code, 200)

        # check now that the name has changed
        request = testing.DummyRequest()
        from .views import clientsview
        response = clientsview(request)
        self.assertEqual(response[0]['Name'], 'EditedName')

class TestSuppliersviewSuccessCondition(unittest.TestCase):
    """ Test if the Supplier view returns a list with the correct supplier
    """

    def setUp(self):
        self.session = _initTestingDB()
        self.config = testing.setUp()

    def tearDown(self):
        DBSession.remove()
        testing.tearDown()

    def _callFUT(self, request):
        from .views import suppliersview
        return suppliersview(request)

    def test_it(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        response = self._callFUT(request)
        # test if the correct name is returned
        self.assertEqual(response[0]['Name'], 'TestSupplierName')

class TestSupplierSuccessCondition(unittest.TestCase):
    """ Test if the Suppler deletes successfully
    """

    def setUp(self):
        self.session = _initTestingDB()
        self.config = testing.setUp()

    def tearDown(self):
        DBSession.remove()
        testing.tearDown()

    def _callFUT(self, request):
        from .views import supplierview
        return supplierview(request)

    def test_delete_supplier(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.method = 'DELETE'
        request.matchdict = {'id': 1}
        response = self._callFUT(request)
        # test if the correct name is returned
        self.assertEqual(response.code, 200)

    def test_add_supplier(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest(json_body={
            'Name': 'AddingName',
            'Address': 'address',
            'City': 'city',
            'StateProvince': 'sp',
            'Country': 'country',
            'Zipcode': 'zip',
            'Fax': 'fax',
            'Phone': 'phone',
            'Cellular': 'cell',
            'Contact': 'contact'
        })
        request.method = 'POST'
        request.matchdict = {'id': 0}
        response = self._callFUT(request)
        # test that the new id is returned
        self.assertEqual(response.keys()[0], 'newid')

        # check now that there are two suppliers
        request = testing.DummyRequest()
        from .views import suppliersview
        response = suppliersview(request)
        self.assertEqual(len(response), 2)

    def test_edit_supplier(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest(json_body={
            'Name': 'EditedName',
            'Address': 'address',
            'City': 'city',
            'StateProvince': 'sp',
            'Country': 'country',
            'Zipcode': 'zip',
            'Fax': 'fax',
            'Phone': 'phone',
            'Cellular': 'cell',
            'Contact': 'contact'
        })
        request.method = 'PUT'
        request.matchdict = {'id': 1}
        response = self._callFUT(request)
        # test if the correct name is returned
        self.assertEqual(response.code, 200)

        # check now that the name has changed
        request = testing.DummyRequest()
        from .views import suppliersview
        response = suppliersview(request)
        self.assertEqual(response[0]['Name'], 'EditedName')
