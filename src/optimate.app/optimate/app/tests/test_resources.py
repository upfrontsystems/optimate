import unittest
import transaction
from decimal import Decimal
from pyramid import testing
from pyramid.httpexceptions import HTTPUnauthorized, HTTPMethodNotAllowed, HTTPConflict

from sqlalchemy import create_engine
from optimate.app.models import Base, DBSession
from optimate.app.models import (
    Node,
    Project,
    BudgetGroup,
    BudgetItem,
    ResourceCategory,
    ResourceType,
    Resource,
    ResourceUnit,
    ResourcePart,
    Unit,
    SimpleBudgetItem,
    Client,
    City
)


def _initTestingDB():
    engine = create_engine('sqlite://')
    Base.metadata.create_all(engine)
    DBSession.configure(bind=engine)
    with transaction.manager:
        # project global variables
        global respart_quantity
        respart_quantity = 5
        global resparta_quantity
        resparta_quantity = 9
        global resource_rate
        resource_rate = Decimal(5.00)
        global resa_rate
        resa_rate = 2
        global respartb_quantity
        respartb_quantity = 10

        global respart_total
        respart_total = Decimal(resource_rate * respart_quantity
                                ).quantize(Decimal('.01'))
        global resunit_rate
        resunit_rate = respart_total

        global resparta_total
        resparta_total = Decimal(
            resource_rate * respart_quantity * resparta_quantity
        ).quantize(Decimal('.01'))
        global respartb_total
        respartb_total = Decimal(resa_rate * respartb_quantity
                                 ).quantize(Decimal('.01'))
        global resunita_rate
        resunita_rate = resparta_total + respartb_total

        global budgetitema_quantity
        budgetitema_quantity = 5.0
        global budgetitema_total
        budgetitema_total = Decimal(float(resunita_rate) *
                                    budgetitema_quantity).quantize(Decimal('.01'))

        global budgetitemb_quantity
        budgetitemb_quantity = budgetitema_quantity * resparta_quantity

        global budgetitemc_quantity
        budgetitemc_quantity = budgetitema_quantity * respartb_quantity

        global budgetitemd_quantity
        budgetitemd_quantity = budgetitemb_quantity * respart_quantity

        global project_total
        project_total = budgetitema_total

        client1 = Client(Name='TestClientOne', ID=1)
        city1 = City(Name='Cape Town', ID=1)
        unit1 = Unit(Name='mm', ID=1)
        unit2 = Unit(Name='hour', ID=2)
        mattype = ResourceType(ID=1, Name='Material')
        labtype = ResourceType(ID=2, Name='Labour')

        root = Node(ID=0)
        project = Project(Name='Project 1', ID=1,
                          ClientID=client1.ID,
                          CityID=city1.ID,
                          Description='Zuma',
                          SiteAddress='Nkandla',
                          FileNumber='0000',
                          ParentID=0)
        budgetgroup = BudgetGroup(Name='TestBGName',
                                  ID=2,
                                  Description='TestBGDesc',
                                  ParentID=project.ID)
        rescat = ResourceCategory(Name='Resource List',
                                  ID=9,
                                  Description='Test Category',
                                  ParentID=project.ID)
        res = Resource(ID=15,
                       Code='A000',
                       Name='Pump',
                       Description='Pump',
                       UnitID=unit1.ID,
                       Type=mattype.Name,
                       _Rate=resource_rate,
                       ParentID=rescat.ID)
        resourceunit = ResourceUnit(ID=11,
                                    Name='ResourceUnit',
                                    Code='U000',
                                    Description='Test Resource Unit',
                                    UnitID=unit2.ID,
                                    Type=labtype.ID,
                                    ParentID=rescat.ID)
        resourcepart = ResourcePart(ID=12,
                                    ResourceID=res.ID,
                                    _Quantity=respart_quantity,
                                    ParentID=resourceunit.ID)
        resa = Resource(ID=10,
                        Code="B000",
                        Name="AnotherResource",
                        Description="Resource Description",
                        UnitID=unit2.ID,
                        Type=mattype.ID,
                        _Rate=resa_rate,
                        ParentID=rescat.ID)
        resourceunita = ResourceUnit(ID=13,
                                     Name="ResourceUnitA",
                                     Code="U001",
                                     Description="Test Resource Unit A",
                                     UnitID=unit2.ID,
                                     Type=labtype.ID,
                                     ParentID=rescat.ID)
        resourceparta = ResourcePart(ID=14,
                                     ResourceID=resourceunit.ID,
                                     _Quantity=resparta_quantity,
                                     ParentID=resourceunita.ID)
        resourcepartb = ResourcePart(ID=16,
                                     ResourceID=resa.ID,
                                     _Quantity=respartb_quantity,
                                     ParentID=resourceunita.ID)
        resourceunitb = ResourceUnit(ID=21,
                                     Name="ResourceUnitB",
                                     Code="U002",
                                     Description="Test Resource Unit B",
                                     UnitID=unit2.ID,
                                     Type=labtype.ID,
                                     ParentID=rescat.ID)
        budgetitema = BudgetItem(ID=7,
                                 ResourceID=resourceunita.ID,
                                 _Quantity=budgetitema_quantity,
                                 ParentID=budgetgroup.ID)
        budgetitemb = BudgetItem(ID=8,
                                 ResourceID=resourceunit.ID,
                                 _Quantity=budgetitemb_quantity,
                                 ParentID=budgetitema.ID)
        budgetitemc = BudgetItem(ID=19,
                                 ResourceID=resa.ID,
                                 _Quantity=budgetitemc_quantity,
                                 ParentID=budgetitema.ID)
        budgetitemd = BudgetItem(ID=20,
                                 ResourceID=res.ID,
                                 _Quantity=budgetitemd_quantity,
                                 ParentID=budgetitemb.ID)

        projecta = Project(ID=17,
                           Name="ProjectA",
                           ClientID=client1.ID,
                           CityID=city1.ID,
                           ParentID=0)
        rescata = ResourceCategory(ID=18,
                                   Name="Resource List",
                                   ParentID=projecta.ID)

        for ob in (root, client1, city1, unit1, project, budgetgroup, rescat,
                   res, resourceunit, resourcepart, resa, resourceunita, resourceparta,
                   resourcepartb, budgetitema, budgetitemb, budgetitemc, budgetitemd,
                   projecta, rescata, resourceunitb):
            DBSession().add(ob)

        transaction.commit()

        """The hierarchy
        project - id:1 overhead: 0.05
                |
                budgetgroup - id:2
                        |
                        budgetitema - id:7 - resourceunita id:16
                                |
                                budgetitemc - id:19- resa id:10
                                |
                                budgetitemb - id:8 - resourceunit id:11
                                        |
                                        budgetitemd - id:20 - res id:15
                |
                rescat - id:9
                        |
                        res - id:15
                        |
                        resa id:10
                        |
                        resourceunit - id:11
                                |
                                resourcepart - id:12 - res id:15
                        |
                        resourceunita - id:13
                                |
                                resourceparta - id:14 - resourceunit id:11
                                |
                                resourcepartb - id:16 -resa id10
        """
    return DBSession


def _registerRoutes(config):
    # the optimate project data views
    config.add_route('rootview', '/')
    config.add_route('node_children', 'node/{parentid}/children/')
    config.add_route('nodeview', 'node/{id}/')
    config.add_route('project_resources', '/project/{id}/resources/')
    config.add_route('resources', '/resource/{id}/')
    config.add_route('node_paste', 'node/{id}/paste/')
    config.add_route('node_cost', 'node/{id}/cost/')


class TestResourceUnit(unittest.TestCase):

    def setUp(self):
        self.config = testing.setUp()
        self.session = _initTestingDB()

    def tearDown(self):
        DBSession.remove()
        testing.tearDown()

    def test_resourceunit(self):
        # test the functions resource unit

        resourceunit = DBSession.query(ResourceUnit).filter_by(ID=11).first()
        self.assertEqual(resourceunit.Children[0].ID, 12)
        self.assertEqual(resourceunit.ResourceParts[0].ID, 14)
        self.assertEqual(str(resourceunit.Rate), str(resunit_rate))

    def test_resourceunit_a(self):
        # test the functions resource unit a

        resourceunit = DBSession.query(ResourceUnit).filter_by(ID=13).first()
        self.assertEqual(len(resourceunit.Children), 2)
        self.assertEqual(str(resourceunit.Rate), str(resunita_rate))


class TestResourcePart(unittest.TestCase):

    def setUp(self):
        self.config = testing.setUp()
        self.session = _initTestingDB()

    def tearDown(self):
        DBSession.remove()
        testing.tearDown()

    def test_total(self):
        # test the total of a resource part is correctly calculated
        resourcepart = DBSession.query(ResourcePart).filter_by(ID=12).first()
        resparttotal = Decimal(resource_rate * respart_quantity
                               ).quantize(Decimal('.01'))
        self.assertEqual(str(resourcepart.Total), str(resparttotal))

        resourcepart = DBSession.query(ResourcePart).filter_by(ID=14).first()
        self.assertEqual(str(resourcepart.Total), str(resparta_total))

        resourcepart = DBSession.query(ResourcePart).filter_by(ID=16).first()
        self.assertEqual(str(resourcepart.Total), str(respartb_total))


class TestSearchResources(unittest.TestCase):

    def setUp(self):
        self.config = testing.setUp()
        self.session = _initTestingDB()

    def tearDown(self):
        DBSession.remove()
        testing.tearDown()

    def _callFUT(self, request):
        from optimate.app.views import project_resources
        return project_resources(request)

    def test_search_budgetgroup(self):
        """ Search in a budget group
        """
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.matchdict['id'] = 2
        request.params = {'search': ''}
        response = self._callFUT(request)

        # test the correct resources is returned
        self.assertEqual(len(response), 4)

        request = testing.DummyRequest()
        request.matchdict['id'] = 2
        request.params = {'search': 'resource'}
        response = self._callFUT(request)

        # test the correct resources is returned
        self.assertEqual(len(response), 3)

    def test_search_budgetitem(self):
        """ Search for a budget item
        """
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.matchdict['id'] = 7
        request.params = {'search': 'pump'}
        response = self._callFUT(request)
        # test the correct resources is returned
        self.assertEqual(len(response), 1)

        request = testing.DummyRequest()
        request.matchdict['id'] = 7
        request.params = {'search': 'resource'}
        response = self._callFUT(request)
        # test the correct resources is returned
        self.assertEqual(len(response), 4)

    def test_search_resourceunit(self):
        """ Search in a resource unit
        """
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.matchdict['id'] = 13
        request.params = {'search': 'resource'}
        response = self._callFUT(request)
        # test the correct resources is returned
        self.assertEqual(len(response), 1)

    def test_search_resourcepart(self):
        """ Search in a resource part
        """
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.matchdict['id'] = 12
        request.params = {'search': 'resource'}
        response = self._callFUT(request)
        # test the correct resources is returned
        self.assertEqual(len(response), 2)


class TestTree(unittest.TestCase):

    def setUp(self):
        self.config = testing.setUp()
        self.session = _initTestingDB()

    def tearDown(self):
        DBSession.remove()
        testing.tearDown()

    def _callFUT(self, request):
        from optimate.app.views import nodeview
        return nodeview(request)

    def test_cost(self):
        from optimate.app.views import node_cost
        request = testing.DummyRequest()
        request.matchdict = {'id': 1}
        self.assertEqual(node_cost(request)['Cost'], str(project_total))

    def test_add(self):
        # test adding a budgetitem with resourceunit works correctly
        request = testing.DummyRequest()
        request.matchdict = {'id': 2}
        request.method = 'POST'
        request.json_body = {'NodeType': 'BudgetItem',
                             'ResourceID': 13,
                             'Quantity': 6,
                             'OverheadList': []}
        response = self._callFUT(request)
        newid = response['ID']
        # the new budgetitem needs to have two children
        request = testing.DummyRequest()
        request.matchdict = {'parentid': newid}
        from optimate.app.views import node_children
        response = node_children(request)
        self.assertEqual(len(response), 2)

        # check the new cost is correct
        newbudgetitemtotal = Decimal(6 * float(resunita_rate))
        newprojtotal = (
            project_total + newbudgetitemtotal).quantize(Decimal('.01'))
        from optimate.app.views import node_cost
        request = testing.DummyRequest()
        request.matchdict = {'id': 1}
        self.assertEqual(node_cost(request)['Cost'], str(newprojtotal))

    def test_delete(self):
        # test deleting a resourceunit works
        request = testing.DummyRequest()
        request.method = 'DELETE'

        # cant delete resource unit used in other resource part
        request.matchdict = {'id': 11}
        self.assertRaises(HTTPConflict, self._callFUT, request)

        # reset transation
        transaction.abort()

        # cant delete resource used in resource part
        request.matchdict = {'id': 10}
        self.assertRaises(HTTPConflict, self._callFUT, request)

        # reset transation
        transaction.abort()

        # delete resource part
        request.matchdict = {'id': 14}
        response = self._callFUT(request)
        self.assertEquals(response['parentid'], 13)

        # delete resource unit
        request.matchdict = {'id': 11}
        response = self._callFUT(request)
        self.assertEquals(response['parentid'], 9)

        # delete resource part
        request.matchdict = {'id': 16}
        response = self._callFUT(request)
        self.assertEquals(response['parentid'], 13)

        # delete resource
        request.matchdict = {'id': 10}
        response = self._callFUT(request)
        self.assertEquals(response['parentid'], 9)

    def test_paste(self):
        # test copying and pasting a resource unit works
        _registerRoutes(self.config)
        request = testing.DummyRequest(json_body={
            'ID': '11',
            'cut': False}
        )
        request.matchdict = {'id': 18}
        from optimate.app.views import node_paste
        response = node_paste(request)
        self.assertEqual(response.keys(), ['node', 'newId'])


class TestBudgetItem(unittest.TestCase):

    def setUp(self):
        self.config = testing.setUp()
        self.session = _initTestingDB()

    def tearDown(self):
        DBSession.remove()
        testing.tearDown()

    def test_update_quantity(self):
        # change the parent budgetitem quantity
        request = testing.DummyRequest()
        request.matchdict = {'id': 7}
        newbiq = 50.0
        request.json_body = {'Quantity': newbiq}
        from optimate.app.views import node_update_value
        response = node_update_value(request)

        # check the project total
        newprojtot = Decimal(float(resunita_rate) * newbiq
                             ).quantize(Decimal('.01'))
        request = testing.DummyRequest()
        request.matchdict = {'id': 1}
        from optimate.app.views import node_cost
        response = node_cost(request)
        self.assertEqual(response['Cost'], str(newprojtot))

        # check the quantity of the leaf budgetitem
        newbibq = newbiq * resparta_quantity
        newleafq = newbibq * respart_quantity
        request = testing.DummyRequest()
        request.method = 'GET'
        request.matchdict['id'] = 20
        from optimate.app.views import nodeview
        response = nodeview(request)
        # the new order total should be the same as the project ordered total
        self.assertEqual(newleafq, response['Quantity'])
