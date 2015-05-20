import unittest
import transaction
from pyramid import testing
from pyramid.httpexceptions import HTTPUnauthorized, HTTPMethodNotAllowed

class TestAuth(unittest.TestCase):
    def setUp(self):
        self.config = testing.setUp()
        self.request = testing.DummyRequest()
        self.request.registry.settings['optimate.app.secret'] = 'mydogspot'

    def tearDown(self):
        testing.tearDown()

    def test_tokens(self):
        """ Test the crypto token generating and verifying code. """
        from optimate.app.security import create_token, verify_token

        token = create_token(self.request, 'john')
        validated, user = verify_token(self.request, token)
        self.assertTrue(validated, "Token did not validate")

        # Also test with a funny character
        token = create_token(self.request, '\xc3'.decode('latin1'))
        validated, user = verify_token(self.request, token)
        self.assertTrue(validated, "Token did not validate")

    def test_authview(self):
        """ test the auth view and check that it behaves correctly. """
        from optimate.app.views import auth
        from optimate.app.security import verify_token

        request = testing.DummyRequest()
        request.registry.settings['optimate.app.secret'] = 'aardvark'
        request.json_body = {
            'username': 'john',
            'password': 'john'
        }
        self.assertEqual(auth(request).__class__, HTTPMethodNotAllowed,
            "auth view should only respond to POST")

        request.method = 'POST'
        token = auth(request)['access_token']
        validated, username = verify_token(request, token)
        self.assertTrue(validated, "token didn't validate")
        self.assertEqual(username, 'john')

        request.json_body['password'] = 'johmama'
        self.assertEqual(auth(request).__class__, HTTPUnauthorized,
            "auth view should fail on a wrong password")
