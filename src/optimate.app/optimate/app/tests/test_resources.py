import unittest
import transaction
from decimal import Decimal
from pyramid import testing
from pyramid.httpexceptions import HTTPUnauthorized, HTTPMethodNotAllowed

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
    Component,
    SimpleComponent,
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

        global component_itemquantity
        component_itemquantity = 5.0
        global component_quantity
        component_quantity = component_itemquantity
        global component_total
        component_total = Decimal(float(resource_rate)* \
            component_quantity).quantize(Decimal('.01'))

        global project_total
        project_total = component_total

        client1 = Client (Name='TestClientOne', ID=1)
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
                            UnitID= unit2.ID,
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
        comp = Component(ID=7,
                        ResourceID = res.ID,
                        _ItemQuantity=component_itemquantity,
                        ParentID=budgetgroup.ID)

        for ob in (root, client1, city1, unit1, project, budgetgroup, rescat,
            res, resourceunit, resourcepart, resa, resourceunita, resourceparta,
            resourcepartb, comp):
            DBSession().add(ob)

        transaction.commit()
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
        self.assertEqual(resourceunit.Children[0].ID, 12);
        self.assertEqual(resourceunit.ResourceParts[0].ID, 14);

        resparttotal = Decimal(resource_rate*respart_quantity).quantize(Decimal('.01'))
        self.assertEqual(str(resourceunit.Rate), str(resparttotal));

    def test_resourceunit_a(self):
        # test the functions resource unit a

        resourceunit = DBSession.query(ResourceUnit).filter_by(ID=13).first()
        self.assertEqual(len(resourceunit.Children), 2);

        childatotal = (resparta_quantity*(resource_rate*respart_quantity))
        childbtotal = respartb_quantity*resa_rate
        unittotal = Decimal(childatotal+childbtotal).quantize(Decimal('.01'))
        self.assertEqual(str(resourceunit.Rate), str(unittotal));

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
        resparttotal = Decimal(resource_rate*respart_quantity).quantize(Decimal('.01'))
        self.assertEqual(str(resourcepart.Total), str(resparttotal));

        resourcepart = DBSession.query(ResourcePart).filter_by(ID=14).first()
        resparttotal = Decimal(resource_rate*respart_quantity*resparta_quantity).quantize(Decimal('.01'))
        self.assertEqual(str(resourcepart.Total), str(resparttotal));

        resourcepart = DBSession.query(ResourcePart).filter_by(ID=16).first()
        resparttotal = Decimal(resa_rate*respartb_quantity).quantize(Decimal('.01'))
        self.assertEqual(str(resourcepart.Total), str(resparttotal));

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
        comptotal = Decimal(component_itemquantity*float(resource_rate)).quantize(Decimal('.01'))
        # check cost beforehand
        request.matchdict = {'id': 1}
        self.assertEqual(node_cost(request)['Cost'], str(comptotal))
        # test adding a resource part and unit functions correctly

    def test_add(self):
        request = testing.DummyRequest()
        request.matchdict = {'id': 1}
        request.method = 'POST'
        # response = self._callFUT(request)
        # test adding a resource part and unit functions correctly

    def test_delete(self):
        request = testing.DummyRequest()
        request.matchdict = {'id': 1}
        request.method = 'DELETE'
        # response = self._callFUT(request)
        # test deleting a resource part and unit functions correctly

    def test_paste(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest(json_body={
            'ID': '2',
            'cut': False}
        )
        request.matchdict = {'id': 1}
        from optimate.app.views import node_paste
        response = node_paste(request)
        # test copy/cut and p astinga resource part and unit functions correctly
