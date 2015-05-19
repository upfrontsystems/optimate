from pyramid.security import Allow, Deny, Everyone
from pyramid.authentication import CallbackAuthenticationPolicy
from pyramid.view import view_config

# Roles
Authenticated = u'Authenticated'
Administrator = u'Administrator'
Manager = u'Manager'

# Authentication policy
class OAuthPolicy(CallbackAuthenticationPolicy):
    def __init__(self, debug=False):
        self.debug = debug

    def unauthenticated_userid(self, request):
        """ The userid parsed from the ``Authorization`` request header."""
        auth = request.headers.get('Authorization')
        if auth and auth.startswith('Bearer '):
            token = auth[7:]

        # FIXME actually parse out a user name
        return 'john'

    def remember(self, request, principal, **kw):
        """ A no-op. No protocol for remembering the user.
            Credentials are sent on every request.
        """
        return []

    def forget(self, request):
        """ No-op. """
        return []

    def callback(self, username, request):
        # FIXME: return list of actual roles
        return [Authenticated]

# Factories to create a security context
class Protected(object): 
    def __init__(self, roles):
        self.allowed = roles
        self.__acl__ = [(Allow, r, 'view') for r in roles] + [
            (Deny, Everyone, 'view')]

class Public(object):
    __acl__ = [
        (Allow, Everyone, 'view')]

def makeProtected(*roles):
    """
        Example route registration:
        >>> config.add_route('myview', '/myview',
        >>>     factory=makeProtected(Authenticated))
    """
    return lambda r: Protected(roles)

def makePublic(r):
    """
        Example route registration:
        >>> config.add_route('myview', '/_/myview',
        >>>     factory=makePublic)
    """
    return Public()
