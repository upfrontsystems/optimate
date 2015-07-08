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
    Component,
    ResourceType,
    Unit,
    City,
    Overhead,
    ResourceCategory,
    Resource,
    Client,
    Supplier,
    CompanyInformation,
    Order,
    OrderItem,
    User,
    Invoice
)

import sys
import json
from sqlalchemy.sql import exists
from pyramid.scripts.common import parse_vars
from sqlalchemy.orm import sessionmaker
import datetime
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
        global resrate
        resrate = Decimal(5.00)

        global compiq
        compiq = 5.0
        global compq
        compq = biq * compiq
        global comptot
        comptot = Decimal((1.0+overheadperc)* \
                    float(resrate)*compq).quantize(Decimal('.01'))

        global resarate
        resarate = Decimal(10.00)
        global compaiq
        compaiq = 7.0
        global compaq
        compaq = biq * compaiq
        global compatot
        compatot = Decimal(float(resarate)*compaq).quantize(Decimal('.01'))

        global birate
        birate = Decimal((1.0+overheadperc)* \
                  float(resrate)*compiq).quantize(Decimal('.01')) + \
                  Decimal(float(resarate)*compaiq).quantize(Decimal('.01'))
        global bitot
        bitot = Decimal(biq * float(birate)).quantize(Decimal('.01'))
        global bgtot
        bgtot = bitot
        global projtot
        projtot = bgtot

        # project2 global variables
        global biq2
        biq2 = 10.0
        global overheadperc2
        overheadperc2 = 0.34
        global resrate2
        resrate2 = Decimal(9.00)

        global compiq2
        compiq2 = 1.45
        global compq2
        compq2 = biq2 * compiq2
        global comptot2
        comptot2 = Decimal((1.0+overheadperc2)* \
                    float(resrate2)*compq2).quantize(Decimal('.01'))

        global resarate2
        resarate2 = Decimal(10.90)
        global compaiq2
        compaiq2 = 5.0
        global compaq2
        compaq2 = biq2 * compaiq2
        global compatot2
        compatot2 = Decimal(float(resarate2)*compaq2).quantize(Decimal('.01'))

        global birate2
        birate2 = Decimal((1.0+overheadperc2)* \
                  float(resrate2)*compiq2).quantize(Decimal('.01')) + \
                  Decimal(float(resarate2)*compaiq2).quantize(Decimal('.01'))
        global bitot2
        bitot2 = Decimal(biq2 * float(birate2)).quantize(Decimal('.01'))
        global bgtot2
        bgtot2 = bitot2
        global projtot2
        projtot2 = bgtot2

        city1 = City(Name='Cape Town',
                    ID=1)
        city2 = City(Name='Pretoria',
                    ID=2)
        city3 = City(Name='Durban',
                    ID=3)
        city4 = City(Name='Johannesburg',
                    ID=4)

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

        labtype = ResourceType(Name='Labour')
        mattype = ResourceType(Name='Material')
        subtype = ResourceType(Name='Subcontractor')

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
                        Percentage=overheadperc)
        budgetgroup = BudgetGroup(Name='TestBGName',
                        ID=2,
                        Description='TestBGDesc',
                        ParentID=project.ID)
        budgetitem = BudgetItem(Name='TestBIName',
                        ID=3,
                        Description='TestBIDesc',
                        _ItemQuantity=biq,
                        ParentID=budgetgroup.ID)
        rescat = ResourceCategory(Name='Resource List',
                        ID=9,
                        Description='Test Category',
                        ParentID=project.ID)
        res = Resource(ID=15,
                       Code='A000',
                       Name='TestResource',
                       Description='Test resource',
                       UnitID=unit1.ID,
                       Type=mattype.Name,
                       _Rate=resrate,
                       ParentID=rescat.ID)
        resa = Resource(ID=16,
                       Code='A001',
                       Name='TestResourceA',
                       Description='Test resource',
                       UnitID=unit2.ID,
                       Type=labtype.Name,
                       _Rate=resarate,
                       ParentID=rescat.ID)
        comp = Component(ID=7,
                        ResourceID = res.ID,
                        _ItemQuantity=compiq,
                        ParentID=budgetitem.ID)
        comp.Overheads.append(overhead)
        compa = Component(ID=11,
                        ResourceID=resa.ID,
                        _ItemQuantity=compaiq,
                        ParentID=budgetitem.ID)


        project2 = Project(Name='Test2PName',
                        ID=8,
                        ClientID=client2.ID,
                        CityID=city2.ID,
                        Description='Test2PDesc',
                        SiteAddress='Site Address',
                        FileNumber='0001',
                        ParentID=0)
        overhead2 = Overhead(Name="Overhead2",
                        ID=2,
                        ProjectID=project2.ID,
                        Percentage=overheadperc2)
        budgetgroup2 = BudgetGroup(Name='TestBGName',
                        ID=4,
                        Description='TestBGDesc',
                        ParentID=project2.ID)
        budgetitem2 = BudgetItem(Name='TestBIName',
                        ID=5,
                        Description='TestBIDesc',
                        _ItemQuantity=biq2,
                        ParentID=budgetgroup2.ID)
        rescat2 = ResourceCategory(Name='Resource List',
                        ID=6,
                        Description='Test Category',
                        ParentID=project2.ID)
        res2 = Resource(ID=17,
                       Code='A002',
                       Name='Test2Resource',
                       Description='Test resource',
                       UnitID=unit2.ID,
                       Type=labtype.Name,
                       _Rate=resrate2,
                       ParentID=rescat2.ID)
        resa2 = Resource(ID=18,
                       Code='A003',
                       Name='TestResourceA2',
                       Description='Test resource',
                       UnitID=unit3.ID,
                       Type=subtype.Name,
                       _Rate=resarate2,
                       ParentID=rescat2.ID)
        comp2 = Component(ID=19,
                        ResourceID = res2.ID,
                        _ItemQuantity=compiq2,
                        ParentID=budgetitem2.ID)
        comp2.Overheads.append(overhead2)
        compa2 = Component(ID=20,
                        ResourceID=resa2.ID,
                        _ItemQuantity=compaiq2,
                        ParentID=budgetitem2.ID)

        global orderitemq
        orderitemq = 5.6
        global orderitemr
        orderitemr = Decimal(10.00)
        global orderitemvat
        orderitemvat= 0.14
        global ordertot
        ordertot = Decimal(orderitemq * float(orderitemr)).quantize(Decimal('.01'))

        global orderitemq2
        orderitemq2 = 5.6
        global orderitemr2
        orderitemr2 = Decimal(10.00)
        global orderitemvat2
        orderitemvat2= 0.14
        global ordertot2
        ordertot2 = Decimal(orderitemq2 * float(orderitemr2)).quantize(Decimal('.01'))

        order = Order(ID=1,
                        ProjectID=project.ID,
                        SupplierID=supplier1.ID,
                        ClientID=client1.ID,
                        Total = ordertot)
        orderitem = OrderItem(ID=1,
                                OrderID=order.ID,
                                ComponentID=comp.ID,
                                _Quantity=orderitemq,
                                _Rate=orderitemr,
                                VAT=orderitemvat)

        order2 = Order(ID=2,
                        ProjectID=project2.ID,
                        SupplierID=supplier1.ID,
                        ClientID=client2.ID,
                        Total = ordertot2)
        orderitem2 = OrderItem(ID=2,
                                OrderID=order2.ID,
                                ComponentID=comp2.ID,
                                _Quantity=orderitemq2,
                                _Rate=orderitemr2,
                                VAT=orderitemvat2)

        pastpaydate = datetime.date(2000, 1, 1)
        futurepaydate= datetime.date(2050, 1, 1)
        invoice = Invoice(ID=1,
                            OrderID=order.ID,
                            InvoiceDate = datetime.datetime.now(),
                            PaymentDate = pastpaydate,
                            VAT=20,
                            Amount=Decimal(50.00))

        invoice2 = Invoice(ID=2,
                            OrderID=order2.ID,
                            InvoiceDate = datetime.datetime.now(),
                            PaymentDate = futurepaydate,
                            VAT=0,
                            Amount=Decimal(100.00))

        DBSession.add(order)
        DBSession.add(orderitem)

        DBSession.add(order2)
        DBSession.add(orderitem2)

        DBSession.add(invoice)
        DBSession.add(invoice2)

        DBSession.add(supplier1)
        DBSession.add(supplier2)
        DBSession.add(supplier3)
        DBSession.add(client1)
        DBSession.add(client2)
        DBSession.add(client3)

        DBSession.add(city1)
        DBSession.add(city2)
        DBSession.add(city3)
        DBSession.add(city4)

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
        DBSession.add(res)
        DBSession.add(resa)
        DBSession.add(comp)
        DBSession.add(compa)

        DBSession.add(project2)
        DBSession.add(overhead2)
        DBSession.add(rescat2)
        DBSession.add(budgetgroup2)
        DBSession.add(budgetitem2)
        DBSession.add(res2)
        DBSession.add(resa2)
        DBSession.add(comp2)
        DBSession.add(compa2)

        transaction.commit()

        """The hierarchy
        project - id:1 overhead: 0.05
                |
                budgetgroup - id:2
                            |
                            budgetitem - id:3
                                       |
                                       comp - res id:7
                                       |
                                       compa - resa id:11
                |
                rescat - id:9
                        |
                        res id:15
                        |
                        resa id:16
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
    config.add_route('project_overheads', '/project/{id}/overheads/')
    config.add_route('component_overheads', '/component/{id}/overheads/')
    config.add_route('overheadview', '/overhead/{id}/')
    config.add_route('resourcetypes', '/resourcetypes')
    config.add_route('node_grid', '/node/{parentid}/grid/')
    config.add_route('node_update_value', '/node/{id}/update_value/')
    config.add_route('node_paste', 'node/{id}/paste/')
    config.add_route('node_cost', 'node/{id}/cost/')
    config.add_route('node_components', 'node/{id}/components/')
    config.add_route('resourcecategory_allresources', 'resourcecategory/{id}/allresources/')
    config.add_route('resourcecategory_resources', 'resourcecategory/{id}/resources/')

    # the other views
    config.add_route('clientsview', '/clients')
    config.add_route('suppliersview', '/suppliers')
    config.add_route('clientview', '/client/{id}/')
    config.add_route('supplierview', '/supplier/{id}/')
    config.add_route('company_information', '/company_information')
    config.add_route('unitsview', '/units')
    config.add_route('unitview', '/unit/{id}/')
    config.add_route('citiesview', '/cities')
    config.add_route('cityview', '/city/{id}/')
    config.add_route('ordersview', '/orders')
    config.add_route('orderview', '/order/{id}/')
    config.add_route('orders_length', '/orders/length')
    config.add_route('orders_filter', '/orders/filter')
    config.add_route('orders_tree_view', '/orders/tree/{id}/')
    config.add_route('invoicesview', '/invoices')
    config.add_route('invoices_filter', '/invoices/filter')
    config.add_route('invoiceview', '/invoice/{id}/')

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
        from optimate.app.views import clientsview
        return clientsview(request)

    def test_it(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        response = self._callFUT(request)
        # test if the correct name is returned
        self.assertEqual(response[0]['Name'], 'TestClientOne')


class TestClientSuccessCondition(unittest.TestCase):
    """ Test if the Client operations run successfully
    """

    def setUp(self):
        self.session = _initTestingDB()
        self.config = testing.setUp()

    def tearDown(self):
        DBSession.remove()
        testing.tearDown()

    def _callFUT(self, request):
        from optimate.app.views import clientview
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
            'City': 1,
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

        # check now that there are four clients
        request = testing.DummyRequest()
        from optimate.app.views import clientsview
        response = clientsview(request)
        self.assertEqual(len(response), 4)

    def test_edit_client(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest(json_body={
            'Name': 'EditedName',
            'Address': 'address',
            'City': 2,
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
        from optimate.app.views import clientsview
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
        from optimate.app.views import suppliersview
        return suppliersview(request)

    def test_it(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        response = self._callFUT(request)
        # test if the correct amount of suppliersis returned
        self.assertEqual(len(response), 3)

class TestSupplierSuccessCondition(unittest.TestCase):
    """ Test if the Suppler operations run successfully
    """

    def setUp(self):
        self.session = _initTestingDB()
        self.config = testing.setUp()

    def tearDown(self):
        DBSession.remove()
        testing.tearDown()

    def _callFUT(self, request):
        from optimate.app.views import supplierview
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
            'City': 2,
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

        # check now that there are four suppliers
        request = testing.DummyRequest()
        from optimate.app.views import suppliersview
        response = suppliersview(request)
        self.assertEqual(len(response), 4)

    def test_edit_supplier(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest(json_body={
            'Name': 'EditedName',
            'Address': 'address',
            'City': 3,
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
        from optimate.app.views import suppliersview
        response = suppliersview(request)
        self.assertEqual(response[0]['Name'], 'EditedName')

class TestCompanyInformationViewSuccessCondition(unittest.TestCase):
    """ Test the Company Information view
    """

    def setUp(self):
        self.session = _initTestingDB()
        self.config = testing.setUp()

    def tearDown(self):
        DBSession.remove()
        testing.tearDown()

    def _callFUT(self, request):
        from optimate.app.views import company_information
        return company_information(request)

    def test_get(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.method = 'GET'
        response = self._callFUT(request)
        # the default information should be returned
        self.assertEqual(response['Name'], 'TETIUS RABE PROPERTY SERVICES')

    # def test_edit(self):
    #     _registerRoutes(self.config)
    #     request = testing.DummyRequest()
    #     request.method = 'PUT'
    #     request.json_body = {'Name': 'NewName'}
    #     response = self._callFUT(request)
    #     self.assertEqual(response.code, 200)

    #     request = testing.DummyRequest()
    #     request.method = 'GET'
    #     response = self._callFUT(request)
    #     # the new information should be returned
    #     self.assertEqual(response['Name'], 'NewName')

class TestUnitsViewSuccessCondition(unittest.TestCase):
    """ Test the units view
    """

    def setUp(self):
        self.session = _initTestingDB()
        self.config = testing.setUp()

    def tearDown(self):
        DBSession.remove()
        testing.tearDown()

    def _callFUT(self, request):
        from optimate.app.views import unitsview
        return unitsview(request)

    def test_it(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        response = self._callFUT(request)
        # five units should be returned
        self.assertEqual(len(response), 5)

class TestUnitViewSuccessCondition(unittest.TestCase):
    """ Test operations on the units
    """

    def setUp(self):
        self.session = _initTestingDB()
        self.config = testing.setUp()

    def tearDown(self):
        DBSession.remove()
        testing.tearDown()

    def _callFUT(self, request):
        from optimate.app.views import unitview
        return unitview(request)

    def test_get(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.method = 'GET'
        request.matchdict['id'] = 1
        response = self._callFUT(request)

        self.assertEqual(response['Name'], 'mm')

    def test_delete_remove(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.method = 'DELETE'
        request.matchdict['id'] = 5
        response = self._callFUT(request)
        # the unit is not used so it is deleted
        self.assertEqual(response['status'], 'remove')

    def test_delete_keep(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.method = 'DELETE'
        request.matchdict['id'] = 1
        response = self._callFUT(request)
        # the unit is used so it should be kept
        self.assertEqual(response['status'], 'keep')

class TestCitiesViewSuccessCondition(unittest.TestCase):
    """ Test the citiesview
    """

    def setUp(self):
        self.session = _initTestingDB()
        self.config = testing.setUp()

    def tearDown(self):
        DBSession.remove()
        testing.tearDown()

    def _callFUT(self, request):
        from optimate.app.views import citiesview
        return citiesview(request)

    def test_it(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        response = self._callFUT(request)
        # three cities should be returned
        self.assertEqual(len(response), 4)

class TestCityViewSuccessCondition(unittest.TestCase):
    """ Test operations on a city
    """

    def setUp(self):
        self.session = _initTestingDB()
        self.config = testing.setUp()

    def tearDown(self):
        DBSession.remove()
        testing.tearDown()

    def _callFUT(self, request):
        from optimate.app.views import cityview
        return cityview(request)

    def test_get(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.method = 'GET'
        request.matchdict['id'] = 1
        response = self._callFUT(request)

        self.assertEqual(response['Name'], 'Cape Town')

    def test_delete_remove(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.method = 'DELETE'
        request.matchdict['id'] = 4
        response = self._callFUT(request)
        # the city is not used so it is deleted
        self.assertEqual(response['status'], 'remove')

    def test_delete_keep(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.method = 'DELETE'
        request.matchdict['id'] = 1
        response = self._callFUT(request)
        # the city is used so it should be kept
        self.assertEqual(response['status'], 'keep')

    def test_add(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.method = 'POST'
        request.matchdict['id'] = 0
        request.json_body = {'Name': 'Bloemfontein'}
        response = self._callFUT(request)
        # get the new city id
        cityid = response['newid']

        request = testing.DummyRequest()
        request.method = 'GET'
        request.matchdict['id'] = cityid
        response = self._callFUT(request)
        # the new city should be returned
        self.assertEqual(response['Name'], 'Bloemfontein')

    def test_add_existing(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.method = 'POST'
        request.matchdict['id'] = 0
        request.json_body = {'Name': 'Durban'}
        response = self._callFUT(request)

        request = testing.DummyRequest()
        request.method = 'GET'
        from optimate.app.views import citiesview
        response = citiesview(request)
        # the number of cities should still be four
        self.assertEqual(len(response), 4)

class DummyOrder(object):
    def dict_of_lists(self):
        return {'Project': [1]}

class TestOrdersViewSuccessCondition(unittest.TestCase):
    """ Test the ordersview
    """
    def setUp(self):
        self.session = _initTestingDB()
        self.config = testing.setUp()

    def tearDown(self):
        DBSession.remove()
        testing.tearDown()

    def _callFUT(self, request):
        from optimate.app.views import ordersview
        return ordersview(request)

    def test_it(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.params = DummyOrder()
        response = self._callFUT(request)
        # should return one order
        self.assertEqual(response[1], 1)

class TestOrdersFilterViewSuccessCondition(unittest.TestCase):
    """ Test if the filter works on orders
    """

    def setUp(self):
        self.session = _initTestingDB()
        self.config = testing.setUp()

    def tearDown(self):
        DBSession.remove()
        testing.tearDown()

    def _callFUT(self, request):
        from optimate.app.views import orders_filter
        return orders_filter(request)

    def test_it(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.params = DummyOrder()
        response = self._callFUT(request)
        # the response should contain one client
        self.assertEqual(response['clients'][0]['Name'], 'TestClientOne')

class TestOrdersLengthViewSuccessCondition(unittest.TestCase):
    """
    """

    def setUp(self):
        self.session = _initTestingDB()
        self.config = testing.setUp()

    def tearDown(self):
        DBSession.remove()
        testing.tearDown()

    def _callFUT(self, request):
        from optimate.app.views import orders_length
        return orders_length(request)

    def test_it(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        response = self._callFUT(request)
        # the number of orders is one
        self.assertEqual(response['length'], 2)

class TestOrdersTreeViewSuccessCondition(unittest.TestCase):
    """
    """

    def setUp(self):
        self.session = _initTestingDB()
        self.config = testing.setUp()

    def tearDown(self):
        DBSession.remove()
        testing.tearDown()

    def _callFUT(self, request):
        from optimate.app.views import orders_tree_view
        return orders_tree_view(request)

    def test_it(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.matchdict['id'] = 1
        response = self._callFUT(request)

        self.assertEqual(response[0]['Name'], 'TestBGName')

class TestOrderViewSuccessCondition(unittest.TestCase):
    """ Test operations on an order
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

    def test_get(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.method = 'GET'
        request.matchdict['id'] = 1
        response = self._callFUT(request)
        # the project id of the order is 1
        self.assertEqual(response['ProjectID'], 1)

    def test_delete(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.method = 'DELETE'
        request.matchdict['id'] = 1
        response = self._callFUT(request)
        self.assertEqual(response.code, 200)

    def test_add(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.method = 'POST'
        request.matchdict['id'] = 0
        request.json_body = {'ProjectID': 1,
                            'SupplierID': 2,
                            'Total': 20}
        response = self._callFUT(request)
        # get the new order id
        newid = response['ID']

        request = testing.DummyRequest()
        request.method = 'GET'
        request.matchdict['id'] = newid
        response = self._callFUT(request)
        # the new order should be returned
        self.assertEqual(response['SupplierID'], 2)

    def test_edit(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.method = 'PUT'
        request.matchdict['id'] = 1
        request.json_body = {'ProjectID': 1,
                            'SupplierID': 3,
                            'Total': 50}
        response = self._callFUT(request)

        request = testing.DummyRequest()
        request.method = 'GET'
        request.matchdict['id'] = 1
        response = self._callFUT(request)
        # the edited order should be returned
        self.assertEqual(response['SupplierID'], 3)

class DummyMatchProject(object):
    def dict_of_lists(self):
        return {'Project': [1]}

class DummyMatchStatus(object):
    def dict_of_lists(self):
        return {'Status': ['Paid']}

class DummyMatchNone(object):
    def dict_of_lists(self):
        return {'Project': [100]}

class DummyMatchAll(object):
    def dict_of_lists(self):
        return {}

class TestInvoicesViewSuccessCondition(unittest.TestCase):
    """ Test the invoices view
    """

    def setUp(self):
        self.session = _initTestingDB()
        self.config = testing.setUp()

    def tearDown(self):
        DBSession.remove()
        testing.tearDown()

    def _callFUT(self, request):
        from optimate.app.views import invoicesview
        return invoicesview(request)

    def test_all(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.params = DummyMatchAll()
        response = self._callFUT(request)
        # the number of invoices should be 2
        self.assertEqual(len(response), 2)

    def test_match_project(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.params = DummyMatchProject()
        response = self._callFUT(request)
        # the number of invoices should be 1
        self.assertEqual(len(response), 1)

    def test_match_status(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.params = DummyMatchStatus()
        response = self._callFUT(request)
        # the number of invoices should be 1
        self.assertEqual(len(response), 1)

    def test_no_match(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.params = DummyMatchNone()
        response = self._callFUT(request)
        # the number of invoices should be 0
        self.assertEqual(len(response), 0)

class TestInvoicesFilterViewSuccessCondition(unittest.TestCase):
    """ Test if the filter works on invoices
    """

    def setUp(self):
        self.session = _initTestingDB()
        self.config = testing.setUp()

    def tearDown(self):
        DBSession.remove()
        testing.tearDown()

    def _callFUT(self, request):
        from optimate.app.views import invoices_filter
        return invoices_filter(request)

    def test_it(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.params = DummyMatchProject()
        response = self._callFUT(request)
        # the response should contain one client
        self.assertEqual(response['clients'][0]['Name'], 'TestClientOne')

class TestInvoiceViewSuccessCondition(unittest.TestCase):
    """ Test the invoiceview
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

    def test_get(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.method = 'GET'
        request.matchdict['id'] = 1
        response = self._callFUT(request)
        # the invoice id
        self.assertEqual(response['id'], 1)

    def test_delete(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.method = 'DELETE'
        request.matchdict['id'] = 1
        response = self._callFUT(request)
        self.assertEqual(response.code, 200)

    def test_add(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.method = 'POST'
        request.matchdict['id'] = 0
        request.json_body = {'orderid':1,
                                'amount': 124,
                                'vat': 0}
        response = self._callFUT(request)
        # get the new order id
        newid = response['id']

        request = testing.DummyRequest()
        request.method = 'GET'
        request.matchdict['id'] = newid
        response = self._callFUT(request)
        # a response should be returned
        self.assertNotEqual(len(response), 0)

    def test_edit(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.method = 'PUT'
        request.matchdict['id'] = 1
        request.json_body= {'amount':20}
        response = self._callFUT(request)

        request = testing.DummyRequest()
        request.method = 'GET'
        request.matchdict['id'] = 1
        response = self._callFUT(request)
        # the edited amount should be returned
        self.assertEqual(response['amount'], '20.00')
