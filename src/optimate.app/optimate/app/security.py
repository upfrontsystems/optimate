import json
from base64 import b64encode, b64decode
from Crypto.Hash import HMAC, SHA
from uuid import uuid4
from pyramid.decorator import reify
from pyramid.security import Allow, Deny, Everyone
from pyramid.authentication import CallbackAuthenticationPolicy
from pyramid.view import view_config

# Roles
Authenticated = u'Authenticated'
Administrator = u'Administrator'
Manager = u'Manager'

# Token generating machinery
def create_token(request, userid, roles):
    secret = request.registry.settings.get('optimate.app.secret')
    assert secret is not None, 'No secret set for token signing'

    # Take a random bit and add details about the user. We will sign this so
    # we can trust it later, instead of having to check with the database on
    # each request.
    r = uuid4().hex + b64encode(json.dumps({
        'userid': userid,
        'roles': roles
    }))

    sig = HMAC.new(secret, r.encode('UTF-8'), SHA).hexdigest()
    return u"{}{}".format(sig, r)

def verify_token(request, token):
    """ Verify the token. Returns a tuple of True/False and the userid. """
    secret = request.registry.settings.get('optimate.app.secret')
    sig = HMAC.new(secret, token[40:].encode('UTF-8'), SHA).hexdigest()

    # Avoid timing attacks, don't stop when you find an error, process
    # the whole thing so you always use the same amount of time.
    invalid_bits = 0
    input_sig = token[:40]
    if len(sig) != len(input_sig):
        return False

    for a, b in zip(sig, input_sig):
        invalid_bits += a != b

    if invalid_bits == 0:
        try:
            data = json.loads(b64decode(token[72:]))
        except (TypeError, ValueError):
            pass
        else:
            return (True, data['userid'], data['roles'])
    return (False, None, None)

def rolefinder(request):
    auth = request.headers.get('Authorization')
    if auth and auth.startswith('Bearer '):
        validated, username, roles = verify_token(request, auth[7:])
        if roles:
            return [role for role in roles if role in (Administrator, Manager)]
    return []

# Authentication policy
class OAuthPolicy(CallbackAuthenticationPolicy):
    def __init__(self, debug=False):
        self.debug = debug

    def unauthenticated_userid(self, request):
        """ The userid parsed from the ``Authorization`` request header."""
        auth = request.headers.get('Authorization')
        if auth and auth.startswith('Bearer '):
            token = auth[7:]
            validated, username, roles = verify_token(request, token)
            if validated:
                return username

        return None

    def remember(self, request, principal, **kw):
        """ A no-op. No protocol for remembering the user.
            Credentials are sent on every request.
        """
        return []

    def forget(self, request):
        """ No-op. """
        return []

    def callback(self, username, request):
        return [Authenticated, u'user:{}'.format(username)] + rolefinder(request)

# Factories to create a security context
class Protected(object): 
    """ Security context that gives view rights to any of the roles passed
        to the constructor. Use this to limit all access to specific global
        roles (such as Administrator or Manager). """
    def __init__(self, roles):
        self.allowed = roles
        self.__acl__ = [(Allow, r, 'view') for r in roles] + [
            (Deny, Everyone, 'view')]

class Public(object):
    __acl__ = [
        (Allow, Everyone, 'view')]

class ProtectedFunction(object):
    """ Security context that looks up users and roles that may access a
        particular function, and whether to allow view and/or edit. """
    def __init__(self, request, function=None):
        if function is None:
            function = request.matched_route.name
        self.function = function

    @reify
    def __acl__(self):
        # FIXME look up users for function here
        users_with_view = ['admin']
        users_with_edit = ['admin']

        # Ensure that editors are also viewers
        users_with_edit = dict.fromkeys(
            users_with_edit + users_with_view).keys()

        return [(Allow, u'user:{}'.format(u), 'view')
            for u in users_with_view] + [
            (Allow, u'user:{}'.format(u), 'edit')
            for u in users_with_edit] + [
            (Allow, Administrator, 'view'), # Always allow Admin and Manager
            (Allow, Manager, 'view'),
            (Allow, Administrator, 'edit'),
            (Allow, Manager, 'edit'),
            (Deny, Everyone, 'view') # Catch-all, must be last.
        ]

def makeProtected(*roles):
    """
        Factory for protected security contexts, use it to restrict 'view'
        rights on a route to specific roles:

        Example route registration:
        >>> config.add_route('myview', '/myview',
        >>>     factory=makeProtected(Authenticated))
    """
    return lambda r: Protected(roles)

def makePublic(r):
    """
        Factory that makes a security context that allows 'view' for everyone.
        Example route registration:
        >>> config.add_route('myview', '/_/myview',
        >>>     factory=makePublic)
    """
    return Public()

def makeProtectedFunction(function):
    """
        Factory for security contexts that protect particular functions.
        Example route registration:
        >>> config.add_route('orders', '/orders',
        >>>     factory=makeProtectedFunction('orders'))
    """
    return lambda r: ProtectedFunction(r, function)
