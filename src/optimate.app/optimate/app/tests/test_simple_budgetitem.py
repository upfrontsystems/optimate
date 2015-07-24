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
    Client,
    City,
    Unit,
    SimpleBudgetItem
)

def initdb():
    engine = create_engine('sqlite://')
    Base.metadata.create_all(engine)
    DBSession.configure(bind=engine)
    with transaction.manager:
        # project global variables
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
        budgetitem_total = Decimal(budgetitem_quantity * float(resource_rate)
                                    ).quantize(Decimal('.01'))
        global project_total
        project_total = (budgetitem_total + sibi_total).quantize(Decimal('.01'))

        client1 = Client (Name='TestClientOne', ID=1)
        city1 = City(Name='Cape Town', ID=1)
        unit1 = Unit(Name='mm', ID=1)
        mattype = ResourceType(ID=1, Name='Material')

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
        budgetitem = BudgetItem(ID=3,
                        ResourceID = res.ID,
                        _Quantity=budgetitem_quantity,
                        ParentID=budgetgroup.ID)
        sibi = SimpleBudgetItem(ID=4,
                        Name='Fire pool',
                        Description='Security feature',
                        _Quantity=sibi_quantity,
                        Type=mattype.ID,
                        _Rate=sibi_rate,
                        ParentID=budgetgroup.ID)

        for ob in (root, client1, city1, unit1, project, budgetgroup,
            rescat, res, budgetitem, sibi):
            DBSession().add(ob)


        transaction.commit()
    return DBSession


class TestSimpleComponent(unittest.TestCase):
    def setUp(self):
        self.config = testing.setUp()
        self.request = testing.DummyRequest()
        self.session = initdb();

    def tearDown(self):
        DBSession.remove()
        testing.tearDown()

    def test_total(self):
        project = DBSession().query(Project).get(1)
        sc = DBSession().query(SimpleBudgetItem).get(4)
        # Test extended functionality to pick up mistakes when code that does
        # not apply to SimpleBudgetItem is incorrectly added to the Mixin.
        sc.toDict()
        sc.getGridData()
        # test cost
        self.assertEqual(str(project.Total), str(project_total))

        # Change the price of the pool
        from optimate.app.views import node_update_value
        request = testing.DummyRequest()
        request.matchdict = {'id': 4}
        newrate = 1000000
        newquantity = 2.0
        request.json_body = {
            'quantity': newquantity,
            'rate': newrate
        }
        response = node_update_value(request)
        newsibi_total = Decimal(newrate*newquantity).quantize(Decimal('.01'))
        newproject_total = budgetitem_total + newsibi_total
        self.assertEqual(str(project.Total), str(newproject_total));
