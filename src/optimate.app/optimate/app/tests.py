"""
So far only the pyramid views and their functions are being tested.
That is: Child view
        Add view
        Delete view
        Paste view
    Cost view
"""

import unittest
import transaction
from pyramid import testing
from .models import DBSession


def _initTestingDB():
    """
    Build a database with default data
    """

    from sqlalchemy import create_engine
    import transaction
    from .models import (
        DBSession,
        Node,
        Project,
        BudgetGroup,
        BudgetItem,
        Component,
        ComponentType,
        ResourceCategory,
        Resource,
        Base
    )
    engine = create_engine('sqlite://')
    Base.metadata.create_all(engine)
    DBSession.configure(bind=engine)
    with transaction.manager:


        root = Node(ID=0)
        project = Project(Name="TestPName",
                        ID=1,
                        Description="TestPDesc",
                        ParentID=0)
        budgetgroup = BudgetGroup(Name="TestBGName",
                        ID=2,
                        Description="TestBGDesc",
                        ParentID=project.ID)
        budgetitem = BudgetItem(Name="TestBIName",
                        ID=3,
                        Description="TestBIDesc",
                        _Quantity=5.0,
                        ParentID=budgetgroup.ID)
        rescat = ResourceCategory(ID=9,
                        Name="TestCategory",
                        Description="Test Category",
                        ParentID=project.ID)
        res = Resource(ID=15,
                       Code="A000",
                       Name="TestResource",
                       Description="Test resource",
                       Rate=5.0,
                       ParentID=rescat.ID)
        resa = Resource(ID=16,
                       Code="A001",
                       Name="TestResourceA",
                       Description="Test resource",
                       Rate=10.0,
                       ParentID=rescat.ID)
        comp = Component(ID=7,
                        Name=res.Name,
                        # Description=res.Description,
                        # _Rate=res.Rate,
                        _Quantity=5.0,
                        Type=1,
                        ParentID=budgetitem.ID)
        compa = Component(ID=11,
                        Name=resa.Name,
                        # Description="TestACDesc",
                        # _Rate=5.0,
                        _Quantity=7.0,
                        Type=1,
                        ParentID=budgetitem.ID)
        comptype = ComponentType(ID=1, Name="type")


        projectb = Project(Name="TestBPName",
                        ID=4,
                        Description="TestBPDesc",
                        ParentID=0)
        budgetgroupb = BudgetGroup(Name="TestBBGName",
                        ID=5,
                        Description="BBGDesc",
                        ParentID=projectb.ID)
        budgetitemb = BudgetItem(Name="TestBBIName",
                        ID=6,
                        _Quantity=10.0,
                        Description="TestBBIDesc",
                        ParentID=budgetgroupb.ID)
        compb = Component(ID=8,
                        Name=resb.Name,
                        # Description="TestBCDesc",
                        # _Rate=10.0,
                        _Quantity=5.0,
                        Type=1,
                        ParentID=budgetitemb.ID)
        budgetitemc = BudgetItem(Name="TestCBIName",
                        ID=13,
                        _Quantity=6.0,
                        Description="TestCBIDesc",
                        ParentID=budgetgroupb.ID)
        rescatb = ResourceCategory(ID=12,
                        Name="TestCategory",
                        Description="Test Category",
                        ParentID=projectb.ID)
        resb = Resource(ID=17,
                       Code="A002",
                       Name="TestResourceB",
                       Description="Test resource",
                       Rate=7.0,
                       ParentID=rescatb.ID)
        resduplicate = Resource(ID=18,
                       Code="A003",
                       Name="TestResource",
                       Description="Test resource",
                       Rate=5.0,
                       ParentID=rescatb.ID)
        compc = Component(ID=14,
                        Name=res.Name,
                        # Description="TestBCDesc",
                        # _Rate=10.0,
                        _Quantity=8.0,
                        Type=1,
                        ParentID=budgetitemc.ID)


        # DBSession.add(res)
        # DBSession.add(resa)
        # DBSession.add(resb)

        DBSession.add(root)
        DBSession.add(project)
        DBSession.add(budgetgroup)
        DBSession.add(budgetitem)
        # DBSession.add(comp)
        # DBSession.add(compa)
        DBSession.add(comptype)
        DBSession.add(rescat)

        DBSession.add(projectb)
        DBSession.add(budgetgroupb)
        DBSession.add(budgetitemb)
        # DBSession.add(compb)
        DBSession.add(budgetitemc)
        # DBSession.add(compc)
        DBSession.add(rescatb)

        res.Components.append(comp)

        resduplicate.Components.append(compc)

        resa.Components.append(compa)

        resb.Components.append(compb)

        # rescat.Children.append(res)
        # rescat.Children.append(resa)

        # rescatb.Children.append(resduplicate)
        # rescatb.Children.append(resb)

        transaction.commit()

        """The hierarchy
        project -(475)
                |
                budgetgroup -(475)
                            |
                            budgetitem -((25+70)*5=475)
                                       |
                                       comp - res (5*5=25)
                                       |
                                       compa - resa (7*10=70)
                |
                rescat -
                        |
                        res
                        |
                        resa
        projectb -(590)
                 |
                 budgetgroupb -(350+240=590)
                              |
                              budgetitemb - (35*10=350)
                                          |
                                          compb - resb (5*7=35)
                              |
                              budgetitemc - (40*6=240)
                                          |
                                          compc - resduplicate (8*5=40)
                 |
                 rescatb -
                         |
                         resb
                         |
                         resduplicate
        """

        projectlist = DBSession.query(Project).all()
        for project in projectlist:
            project.recalculateTotal()

        # print "print children"
        # for child in DBSession.query(Node).filter_by(ID=2).first().Children:
        #     print child
        # print "printing components"
        # for bi in DBSession.query(Component).all():
        #     print bi.ThisResource
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


class TestRootviewSuccessCondition(unittest.TestCase):

    """
    Test if the Root view functions correctly.
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

    def test_it(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        response = self._callFUT(request)

        # assert returns true if the first child object of the root has
        # Name 'TestBName'
        self.assertEqual(response[0]['Name'], 'TestBPName')


class TestChildviewSuccessCondition(unittest.TestCase):

    """
    Test if the childview functions correctly with any other id.
    """

    def setUp(self):
        self.session = _initTestingDB()
        self.config = testing.setUp()

    def tearDown(self):
        self.session.remove()
        testing.tearDown()

    def _callFUT(self, request):
        from .views import childview
        return childview(request)

    def test_it(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.matchdict['parentid'] = 1
        response = self._callFUT(request)

        # true if the child object of parent id '1' has Name 'TestBGName'
        self.assertEqual(response[0]['Name'], 'TestBGName')


class TestAddBudgetGroupSuccessCondition(unittest.TestCase):

    """
    Test if the additemview functions correctly when adding a budgetgroup
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

    def test_it(self):
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

class TestAddComponentSuccessCondition(unittest.TestCase):

    """
    Test if the additemview functions correctly when adding a component
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

    def test_it(self):
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
        self.assertEqual(response["Cost"], 990.0)


class TestDeleteviewSuccessCondition(unittest.TestCase):

    """
    Test if the delete view functions correctly and deletes the node
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
        self.assertEqual(response["Cost"], 0.0)


class TestPasteviewSuccessCondition(unittest.TestCase):

    """
    Test that the paste functions correctly with pasting from a
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
            'Path': '/2/'}
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
        self.assertEqual(response["Cost"], 1065.0)


class TestCostviewSuccessCondition(unittest.TestCase):

    """
    Test that the paste functions correctly with getting the
    total  cost of a node
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

    def test_it(self):
        _registerRoutes(self.config)
        # get the cost of projectb at id 4
        request = testing.DummyRequest()
        request.matchdict = {'id': 1}
        response = self._callFUT(request)

        # true if the cost is correct
        self.assertEqual(response["Cost"], 475.0)


class TestSetComponentQuantitySuccessCondition(unittest.TestCase):

    """
    Test that the paste functions correctly with getting the
    total  cost of a node
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

    def test_it(self):
        _registerRoutes(self.config)
        # get the cost of the node as is
        request = testing.DummyRequest()
        request.matchdict = {'id': 4}
        response = self._callFUT(request)

        # true if the cost is correct
        self.assertEqual(response["Cost"], 590.0)

        # now change the rate of the component by calling the test view
        # in the views its quantity is set to 10
        request = testing.DummyRequest()
        request.matchdict = {'id': 8}
        from .views import testchangeview
        testchangeview(request)

        # now the project cost should be 940
        request = testing.DummyRequest()
        request.matchdict = {'id': 4}
        response = self._callFUT(request)
        self.assertEqual(response["Cost"], 940.0)
