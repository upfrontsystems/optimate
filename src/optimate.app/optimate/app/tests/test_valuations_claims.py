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
    SimpleBudgetItem,
    Valuation,
    ValuationItem,
    Claim
)

def initdb():
    engine = create_engine('sqlite://')
    Base.metadata.create_all(engine)
    DBSession.configure(bind=engine)
    with transaction.manager:
        global budgetitem_quantity
        budgetitem_quantity = 5.0
        global resource_rate
        resource_rate = Decimal(5.00)

        global sibi_quantity
        sibi_quantity = 1.0
        global sibi_rate
        sibi_rate = Decimal(1200000.0)
        global sibi_total
        sibi_total = Decimal(float(sibi_rate)* \
            sibi_quantity).quantize(Decimal('.01'))

        global budgetitem_total
        budgetitem_total = Decimal(budgetitem_quantity * float(resource_rate))
        global project_total
        project_total = (budgetitem_total + sibi_total).quantize(Decimal('.01'))

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
        budgetitem = BudgetItem(ID=3,
                        _Quantity=budgetitem_quantity,
                        ResourceID=res.ID,
                        ParentID=budgetgroup.ID)
        sibi = SimpleBudgetItem(ID=8,
                        Name='Fire pool',
                        Description='Security feature',
                        _Quantity=sibi_quantity,
                        Type=mattype.ID,
                        _Rate=sibi_rate,
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

        project2 = Project(Name='Project 2', ID=19,
                        ClientID=client1.ID,
                        CityID=city1.ID,
                        Description='Another Project',
                        SiteAddress='Address',
                        FileNumber='0001',
                        ParentID=0)

        claim1 = Claim(ID=1,
                        ProjectID=project.ID,
                        ValuationID=valuation.ID,
                        Date=datetime.date(2010, 10, 10))

        claim2 = Claim(ID=2,
                        ProjectID=project2.ID,
                        ValuationID=valuation.ID,
                        Date=datetime.date(2013, 10, 10))

        for ob in (root, client1, city1, unit1, project, budgetgroup,
            budgetgroup2, budgetitem, rescat, res, sibi, valuation,
            vitem1, vitem2, claim1, claim2, project2):
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
        self.session = initdb();

    def tearDown(self):
        DBSession.remove()
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
        self.assertEqual(len(response), 2)

class TestValuationsView(unittest.TestCase):
    """ Test the valuations view responds correctly
    """
    def setUp(self):
        self.config = testing.setUp()
        self.request = testing.DummyRequest()
        self.session = initdb();

    def tearDown(self):
        DBSession.remove()
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
        self.session = initdb();

    def tearDown(self):
        DBSession.remove()
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
        self.session = initdb();

    def tearDown(self):
        DBSession.remove()
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


class DummyClaim(object):
    def __init__(self, filters):
        self.filters = filters
    def dict_of_lists(self):
        return self.filters

class TestClaimsView(unittest.TestCase):
    """ Test the claims view responds correctly
    """
    def setUp(self):
        self.config = testing.setUp()
        self.request = testing.DummyRequest()
        self.session = initdb();

    def tearDown(self):
        DBSession.remove()
        testing.tearDown()

    def _callFUT(self, request):
        from optimate.app.views import claimsview
        return claimsview(request)

    def test_claims(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.params = DummyClaim({})
        response = self._callFUT(request)
        # test if the correct number of claims are returned
        claims = DBSession.query(Claim).all()
        self.assertEqual(len(response), len(claims))

    def test_filter(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.params = DummyClaim({'Project': [1]})
        response = self._callFUT(request)
        # test if the correct number of claims are returned
        claims = DBSession.query(Claim).filter_by(ProjectID=1).all()
        self.assertEqual(len(response), len(claims))

class TestClaimView(unittest.TestCase):
    """ Test the claim view responds correctly
    """
    def setUp(self):
        self.config = testing.setUp()
        self.request = testing.DummyRequest()
        self.session = initdb();

    def tearDown(self):
        DBSession.remove()
        testing.tearDown()

    def _callFUT(self, request):
        from optimate.app.views import claimview
        return claimview(request)

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
        request.json_body = {'ProjectID': 1,
                            'ValuationID': 1}
        response = self._callFUT(request)
        # test if the response is ok
        self.assertEqual(response['Project'], 'Project 1')

    def test_put(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.method = 'PUT'
        request.matchdict = {'id': 1}
        request.json_body = {'ProjectID': 19,
                            'ValuationID': 1}
        response = self._callFUT(request)
        # test if the response is ok
        self.assertEqual(response['ProjectID'], 19)
