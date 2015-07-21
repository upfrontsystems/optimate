import unittest
import transaction
import datetime
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
    Client,
    City,
    Unit,
    Component,
    SimpleComponent,
    Valuation,
    ValuationItem
)

def initdb():
    engine = create_engine('sqlite://')
    Base.metadata.create_all(engine)
    DBSession.configure(bind=engine)
    with transaction.manager:
        existingproj = DBSession.query(Project).first()
        existingbg = DBSession.query(BudgetGroup).first()

        if existingproj:
            existingval = DBSession.query(Valuation).first()
            if not existingval:
                valuation = Valuation(ID=1, ProjectID=existingproj.ID,
                                        Date=datetime.date(2000, 1, 1))
                DBSession().add(valuation)
                existingvalitem = DBSession.query(ValuationItem).first()
                if not existingvalitem:
                    vitem1 = ValuationItem(ID=1,
                                            ValuationID=valuation.ID,
                                            BudgetGroupID=existingbg.ID,
                                            PercentageComplete=80)
                    vitem2 = ValuationItem(ID=2,
                                            ValuationID=valuation.ID,
                                            BudgetGroupID=existingbg.ID,
                                            PercentageComplete=80)

                    for ob in (vitem1, vitem2):
                        DBSession().add(ob)
            elif len(existingval.ValuationItems) == 0:
                vitem1 = ValuationItem(ValuationID=existingval.ID,
                                        BudgetGroupID=existingbg.ID,
                                        PercentageComplete=80)
                vitem2 = ValuationItem(ValuationID=existingval.ID,
                                        BudgetGroupID=existingbg.ID,
                                        PercentageComplete=80)

                for ob in (vitem1, vitem2):
                    DBSession().add(ob)
        else:
            # project global variables
            global budgetitem_itemquantity
            budgetitem_itemquantity = 5.0
            global resource_rate
            resource_rate = Decimal(5.00)

            global component_itemquantity
            component_itemquantity = 5.0
            global component_quantity
            component_quantity = budgetitem_itemquantity * component_itemquantity
            global component_total
            component_total = Decimal(float(resource_rate)* \
                component_quantity).quantize(Decimal('.01'))

            global sicomp_itemquantity
            sicomp_itemquantity = 1.0
            global sicomp_rate
            sicomp_rate = Decimal(1200000.0)
            global sicomp_quantity
            sicomp_quantity = budgetitem_itemquantity * sicomp_itemquantity
            global sicomp_total
            sicomp_total = Decimal(float(sicomp_rate)* \
                sicomp_quantity).quantize(Decimal('.01'))

            global bitot
            budgetitem_total = component_total + sicomp_total
            global project_total
            project_total = budgetitem_total

            client1 = Client (Name='TestClientOne', ID=10)
            city1 = City(Name='Cape Town', ID=10)
            unit1 = Unit(Name='mm', ID=10)
            mattype = ResourceType(ID=10, Name='Material')

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
            budgetgroup2 = BudgetGroup(Name='TestBGName2',
                            ID=4,
                            Description='TestBGDesc',
                            ParentID=project.ID)
            budgetitem = BudgetItem(Name='TestBIName',
                            ID=3,
                            Description='TestBIDesc',
                            _ItemQuantity=budgetitem_itemquantity,
                            ParentID=budgetgroup.ID)
            rescat = ResourceCategory(Name='Resource List',
                            ID=9,
                            Description='Test Category',
                            ParentID=project.ID)
            res = Resource(ID=15,
                           Code='A000',
                           Name='Pump',
                           Description='Pump',
                           UnitID=unit1.ID,
                           Type=mattype.ID,
                           _Rate=resource_rate,
                           ParentID=rescat.ID)
            comp = Component(ID=7,
                            ResourceID = res.ID,
                            _ItemQuantity=component_itemquantity,
                            ParentID=budgetitem.ID)
            sicomp = SimpleComponent(ID=8,
                Name='Fire pool',
                Description='Security feature',
                _ItemQuantity=sicomp_itemquantity,
                Type=mattype.ID,
                _Rate=sicomp_rate,
                ParentID=budgetgroup2.ID)

            valuation = Valuation(ID=1, ProjectID=project.ID,
                                        Date=datetime.date(2000, 1, 1))
            vitem1 = ValuationItem(ID=1,
                                    ValuationID=valuation.ID,
                                    BudgetGroupID=budgetgroup.ID,
                                    PercentageComplete=80)
            vitem2 = ValuationItem(ID=2,
                                    ValuationID=valuation.ID,
                                    BudgetGroupID=budgetgroup2.ID,
                                    PercentageComplete=80)

            for ob in (root, client1, city1, unit1, project, budgetgroup,
                budgetgroup2, budgetitem, rescat, res, comp, sicomp, valuation,
                vitem1, vitem2):
                DBSession().add(ob)


        transaction.commit()
    return DBSession

def _registerRoutes(config):
    config.add_route('valuationsview', '/valuations')
    config.add_route('valuationview', '/valuation/{id}/')
    config.add_route('valuations_length', '/valuations/length')
    config.add_route('valuations_tree_view', '/valuations/tree/{id}/')

class DummyValuation(object):
    def dict_of_lists(self):
        return {}

class TestValuationsTree(unittest.TestCase):
    """ Test the valuations tree view responds correctly
    """
    def setUp(self):
        self.config = testing.setUp()
        self.request = testing.DummyRequest()
        initdb();

    def tearDown(self):
        testing.tearDown()

    def _callFUT(self, request):
        from optimate.app.views import valuations_tree_view
        return valuations_tree_view(request)

    def test_it(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.matchdict = {'id': 1}
        response = self._callFUT(request)
        # test if the correct number of children are returned
        self.assertEqual(len(response), 1)

class TestValuationsView(unittest.TestCase):
    """ Test the valuations view responds correctly
    """
    def setUp(self):
        self.config = testing.setUp()
        self.request = testing.DummyRequest()
        initdb();

    def tearDown(self):
        testing.tearDown()

    def _callFUT(self, request):
        from optimate.app.views import valuationsview
        return valuationsview(request)

    def test_it(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.params = DummyValuation()
        request.matchdict = {'id': 1}
        response = self._callFUT(request)
        # test if the correct number of valuations are returned
        valuations = DBSession.query(Valuation).all()
        self.assertEqual(len(response), len(valuations))

class TestValuationsLength(unittest.TestCase):
    """ Test the valuations length responds correctly
    """
    def setUp(self):
        self.config = testing.setUp()
        self.request = testing.DummyRequest()
        initdb();

    def tearDown(self):
        testing.tearDown()

    def _callFUT(self, request):
        from optimate.app.views import valuations_length
        return valuations_length(request)

    def test_it(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        response = self._callFUT(request)
        # test if the correct number of valuations are returned
        self.assertEqual(len(response), 1)

class TestValuationView(unittest.TestCase):
    """ Test the valuation view responds correctly
    """
    def setUp(self):
        self.config = testing.setUp()
        self.request = testing.DummyRequest()
        initdb();

    def tearDown(self):
        testing.tearDown()

    def _callFUT(self, request):
        from optimate.app.views import valuationview
        return valuationview(request)

    def test_delete(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.method = 'DELETE'
        request.matchdict = {'id': 1}
        response = self._callFUT(request)
        # test if the response is ok
        self.assertEqual(response.code, 200)

    def test_get(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.method = 'GET'
        request.matchdict = {'id': 1}
        response = self._callFUT(request)
        # test if the response is ok
        self.assertEqual(response['ID'], 1)

    def test_post(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.method = 'POST'
        request.matchdict = {'id': 0}
        request.json_body = {'ProjectID': 1}
        response = self._callFUT(request)
        # test if the response is ok
        self.assertEqual(response['Project'], 'Project 1')

    def test_put(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.method = 'PUTs'
        request.matchdict = {'id': 1}
        request.json_body = {'ProjectID': 1}
        response = self._callFUT(request)
        # test if the response is ok
        self.assertEqual(response['ProjectID'], 1)
