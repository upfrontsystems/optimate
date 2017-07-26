import unittest
import transaction
from pyramid import testing
from pyramid.httpexceptions import HTTPUnauthorized, HTTPMethodNotAllowed

from sqlalchemy import create_engine
from optimate.app.models import Base, User, UserRight, DBSession

def initdb():
    engine = create_engine('sqlite://')
    Base.metadata.create_all(engine)
    DBSession.configure(bind=engine)
    with transaction.manager:
        user = User(username=u'john')
        user.set_password('john')
        user.UserRights.append(UserRight(UserID=user.ID,
                                Function='projects', Permission='view'))
        user.UserRights.append(UserRight(UserID=user.ID,
                                Function='orders', Permission='edit'))
        DBSession.add(user)
        transaction.commit()
    return DBSession

class TestUsersView(unittest.TestCase):
    """ Test the usersview functions correctly
    """

    def setUp(self):
        self.config = testing.setUp()
        self.request = testing.DummyRequest()
        self.session = initdb();

    def tearDown(self):
        DBSession.remove()
        testing.tearDown()

    def _callFUT(self, request):
        from optimate.app.views import usersview
        return usersview(request)

    def test_view(self):
        request = testing.DummyRequest()
        response = self._callFUT(request)
        # test one user is returned
        self.assertEqual(len(response), 1)

    def test_add(self):
        request = testing.DummyRequest()
        request.method = 'POST'
        request.json_body = {'username': u'another',
                                'password': 'another',
                                'permissions': [{'Function': 'projects',
                                                'Permission': 'edit'},
                                                {'Function': 'orders',
                                                'Permission': 'edit'}] }
        response = self._callFUT(request)

        request = testing.DummyRequest()
        response = self._callFUT(request)
        # test two users are returned
        self.assertEqual(len(response), 2)

class TestUserView(unittest.TestCase):
    """ Test the userview functions correctly
    """

    def setUp(self):
        self.config = testing.setUp()
        self.request = testing.DummyRequest()
        self.session = initdb();

    def tearDown(self):
        DBSession.remove()
        testing.tearDown()

    def _callFUT(self, request):
        from optimate.app.views import userview
        return userview(request)

    def test_get(self):
        request = testing.DummyRequest()
        request.matchdict = {'username': u'john'}
        response = self._callFUT(request)
        # test the user is returned
        self.assertEqual(response['username'], 'john')

    def test_edit(self):
        request = testing.DummyRequest()
        request.method = 'POST'
        request.matchdict = {'username': u'john'}
        request.json_body = {'username': u'another',
                                'password': 'another',
                                'permissions': [{'Function': 'projects',
                                                'Permission': 'view'},
                                                {'Function': 'orders',
                                                'Permission': 'view'}]
                            }
        response = self._callFUT(request)
        # test the user is returned
        self.assertEqual(response['username'], 'john')

    def test_delete(self):
        request = testing.DummyRequest()
        request.matchdict = {'username': u'john'}
        request.method = 'DELETE'
        response = self._callFUT(request)
        # test nothing is returned
        self.assertEqual(response, {})

class TestUserRightsView(unittest.TestCase):
    """ Test the userrights functions correctly
    """

    def setUp(self):
        self.config = testing.setUp()
        self.request = testing.DummyRequest()
        self.session = initdb();

    def tearDown(self):
        DBSession.remove()
        testing.tearDown()

    def _callFUT(self, request):
        from optimate.app.views import userrights
        return userrights(request)

    def test_get(self):
        request = testing.DummyRequest()
        request.matchdict = {'username': u'john'}
        response = self._callFUT(request)
        # two user rights are returned
        self.assertEqual(len(response), 2)
