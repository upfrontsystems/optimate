""" __init__.py turns the directory into a package
    and set the configuration for the server
"""

from pyramid.events import NewResponse
from pyramid.events import subscriber

from pyramid.config import Configurator
from pyramid.authorization import ACLAuthorizationPolicy
from sqlalchemy import engine_from_config

from optimate.app.security import (
    OAuthPolicy,
    makePublic,
    makeProtected,
    Authenticated,
    Administrator)
from optimate.app.models import (
    DBSession,
    Base,
)

@subscriber(NewResponse)
def handleResponse(event):
    """ Create a new request factory,
        ensuring CORS headers on all json responses.
    """
    event.response.headers.update({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST,GET,DELETE,PUT,OPTIONS',
        'Access-Control-Allow-Headers':
            event.request.headers.get('Access-Control-Request-Headers',
            'Origin, Accept, Content-Type, Authorization'),
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '1728000',
    })


def main(global_config, **settings):
    """ This function returns a Pyramid WSGI application.
    """
    engine = engine_from_config(settings, 'sqlalchemy.')
    DBSession.configure(bind=engine)
    Base.metadata.bind = engine

    config = Configurator(settings=settings, root_factory=makeProtected(Authenticated))
    # config = Configurator(settings=settings, root_factory=makePublic)
    config.include('pyramid_chameleon')
    config.add_static_view('static', 'static', cache_max_age=3600)

    # Authentication and Authorization
    config.set_authentication_policy(
        OAuthPolicy())
    config.set_authorization_policy(ACLAuthorizationPolicy())
    config.set_default_permission('view')

    # OPTIONS view
    config.add_route('options', '/*path', request_method='OPTIONS',
        factory=makePublic)

    # auth view
    config.add_route('auth', '/auth', factory=makePublic)

    # the optimate data views
    config.add_route('rootview', '/')
    config.add_route('childview', '/{parentid}/')
    config.add_route('getitem', 'node/{id}/')
    config.add_route('project_listing', '/project_listing')
    config.add_route('resource_list', '/resource_list/{id}/')
    config.add_route('overhead_list', '/overhead_list/{id}/')
    config.add_route('component_overheads', '/component_overheads/{id}/')
    config.add_route('resourcetypes', '/resource_types')
    config.add_route('projectview', 'projectview/{projectid}/')
    config.add_route('nodegridview', '/nodegridview/{parentid}/')
    config.add_route('update_value', '/update_value/{id}/')
    config.add_route('addview', '/{id}/add')
    config.add_route('editview', 'edit/{id}/')
    config.add_route('deleteview', '/{id}/delete')
    config.add_route('pasteview', '/{id}/paste')
    config.add_route('costview', '/{id}/cost')

    # the company information, client, supplier  and unit views
    config.add_route('clientsview', '/clients')
    config.add_route('suppliersview', '/suppliers')
    config.add_route('clientview', '/{id}/client')
    config.add_route('supplierview', '/{id}/supplier')
    config.add_route('company_information', '/company_information')
    config.add_route('unitsview', '/units')
    config.add_route('unitview', '/{id}/unit')
    config.add_route('citiesview', '/cities')
    config.add_route('cityview', '/{id}/city')
    config.add_route('ordersview', '/orders')
    config.add_route('orderview', '/order/{id}/')
    config.add_route('order_components', '/order_components/{id}/')

    # Editing users
    config.add_route('usersview', '/users', factory=makeProtected(Administrator))
    config.add_route('userview', '/users/{username}', factory=makeProtected(Administrator))

    config.scan()
    return config.make_wsgi_app()
