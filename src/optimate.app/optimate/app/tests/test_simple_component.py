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
    Component,
    SimpleComponent
)

def initdb():
    engine = create_engine('sqlite://')
    Base.metadata.create_all(engine)
    DBSession.configure(bind=engine)
    with transaction.manager:
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

        client1 = Client (Name='TestClientOne', ID=1)
        city1 = City(Name='Cape Town', ID=1)
        unit1 = Unit(Name='mm', ID=1)
        mattype = ResourceType(Name='Material')

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
                       Type=mattype.Name,
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
            Type=mattype.Name,
            _Rate=sicomp_rate,
            ParentID=budgetitem.ID)

        for ob in (root, client1, city1, unit1, project, budgetgroup,
            budgetitem, rescat, res, comp, sicomp):
            DBSession().add(ob)


        transaction.commit()
    return DBSession


class TestSimpleComponent(unittest.TestCase):
    def setUp(self):
        self.config = testing.setUp()
        self.request = testing.DummyRequest()
        initdb();

    def tearDown(self):
        testing.tearDown()

    def test_total(self):
        project = DBSession().query(Project).get(1)
        sc = DBSession().query(SimpleComponent).get(8)
        # budget item 5 times, 1 firepool and 5 pumps, 5 * ((5*5) + 1*1200000)
        self.assertEqual(str(project.Total), str(project_total))

        # Change the price of the pool
        from optimate.app.views import node_update_value
        request = testing.DummyRequest()
        request.matchdict = {'id': 8}
        request.json_body = {
            'itemquantity': 2,
            'rate': 1000000
        }

        newsicomp_itemquantity = 2.0
        newsicomp_rate = Decimal(1000000.0)
        newsicomp_quantity = budgetitem_itemquantity * newsicomp_itemquantity
        newsicomp_total = Decimal(float(newsicomp_rate)* \
            newsicomp_quantity).quantize(Decimal('.01'))
        newbudgetitem_total = component_total + newsicomp_total
        newproject_total = newbudgetitem_total

        response = node_update_value(request)
        self.assertEqual(str(project.Total), str(newproject_total));
