""" The collection of views and their functions are being tested.
    That is: Clients view
             Suppliers view
             Units view
             Cities view
             Company Information
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
    ResourceCategory,
    Resource,
    ResourceType,
    Unit,
    City,
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
        city1 = City(Name='Cape Town', ID=1)
        city2 = City(Name='Pretoria', ID=2)
        city3 = City(Name='Durban', ID=3)
        city4 = City(Name='Johannesburg', ID=4)

        client1 = Client (Name='TestClientOne', ID=1, CityID=city1.ID)
        client2 = Client (Name='TestClientTwo', ID=2, CityID=city2.ID)
        client3 = Client (Name='TestClientThree', ID=3, CityID=city3.ID)
        supplier1 = Supplier(Name='TestSupplier1', ID=1, CityID=city1.ID)
        supplier2 = Supplier(Name='TestSupplier2', ID=2, CityID=city1.ID)
        supplier3 = Supplier(Name='TestSupplier3', ID=3, CityID=city1.ID)

        unit1 = Unit(Name='mm', ID=1)
        unit2 = Unit(Name='hour', ID=2)
        unit3 = Unit(Name='kg', ID=3)
        unit4 = Unit(Name='1000', ID=4)
        unit5 = Unit(Name='item', ID=5)

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
        rescat = ResourceCategory(Name='Resource List',
                        ID=9,
                        Description='Test Category',
                        ParentID=project.ID)
        res = Resource(ID=16,
                       Code='A001',
                       Name='TestResourceA',
                       Description='Test resource',
                       UnitID=unit1.ID,
                       Type=labtype.ID,
                       _Rate=Decimal(5),
                       ParentID=rescat.ID)


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
        DBSession.add(rescat)
        DBSession.add(res)

        transaction.commit()

    return DBSession


def _registerRoutes(config):
    # the optimate project data views
    config.add_route('rootview', '/')
    config.add_route('node_children', 'node/{parentid}/children/')
    config.add_route('nodeview', 'node/{id}/')
    config.add_route('projects', '/projects/')
    config.add_route('resources', '/resource/{id}/')
    config.add_route('project_overheads', '/project/{id}/overheads/')
    config.add_route('budgetitem_overheads', '/budgetitem/{id}/overheads/')
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

class TestResourceTypesViewSuccessCondition(unittest.TestCase):
    """ Test that a list of the ResourceTypes in the database is returned
    """

    def setUp(self):
        self.session = _initTestingDB()
        self.config = testing.setUp()

    def tearDown(self):
        DBSession.remove()
        testing.tearDown()

    def _callFUT(self, request):
        from optimate.app.views import resourcetypes
        return resourcetypes(request)

    def test_it(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        response = self._callFUT(request)

        # test the name of the resource type
        self.assertEqual(response[0]['Name'], 'Labour')

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

    def test_edit(self):
        _registerRoutes(self.config)
        request = testing.DummyRequest()
        request.method = 'GET'
        self._callFUT(request)

        request = testing.DummyRequest()
        request.method = 'PUT'
        request.json_body = {'Name': 'NewName'}
        response = self._callFUT(request)
        self.assertEqual(response.code, 200)

        request = testing.DummyRequest()
        request.method = 'GET'
        response = self._callFUT(request)
        # the new information should be returned
        self.assertEqual(response['Name'], 'NewName')

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

class TestCurrenciesView(unittest.TestCase):
    """ Test the currenciesview
    """

    def setUp(self):
        self.session = _initTestingDB()
        self.config = testing.setUp()

    def tearDown(self):
        DBSession.remove()
        testing.tearDown()

    def _callFUT(self, request):
        from optimate.app.views import currenciesview
        return currenciesview(request)

    def test_it(self):
        _registerRoutes(self.config)
        # set default company info data
        from optimate.app.views import company_information
        company_information(testing.DummyRequest())
        request = testing.DummyRequest()
        response = self._callFUT(request)
        # the default currency is Rand, should return an R
        self.assertEqual(response, 'R')
