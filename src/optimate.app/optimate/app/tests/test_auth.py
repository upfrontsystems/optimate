import unittest
import transaction
from pyramid import testing

class TestAuth(unittest.TestCase):
    def setUp(self):
        self.config = testing.setUp()
        self.request = testing.DummyRequest()
        self.request.registry.settings['optimate.app.secret'] = 'mydogspot'

    def tearDown(self):
        testing.tearDown()

    def test_tokens(self):
        from optimate.app.security import create_token, verify_token

        token = create_token(self.request, 'john')
        validated, user = verify_token(self.request, token)
        self.assertTrue(validated, "Token did not validate")

        # Also test with a funny character
        token = create_token(self.request, '\xc3'.decode('latin1'))
        validated, user = verify_token(self.request, token)
        self.assertTrue(validated, "Token did not validate")
