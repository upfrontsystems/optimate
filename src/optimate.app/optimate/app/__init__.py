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

    # the optimate project data views
    config.add_route('rootview', '/')
    config.add_route('node_children', 'node/{parentid}/children/')
    config.add_route('nodeview', 'node/{id}/')
    config.add_route('projects', '/projects/')
    config.add_route('project_resources', '/project/{id}/resources/')
    config.add_route('project_overheads', '/project/{id}/overheads/')
    config.add_route('component_overheads', '/component/{id}/overheads/')
    config.add_route('resourcetypes', '/resourcetypes')
    config.add_route('node_grid', '/node/{parentid}/grid/')
    config.add_route('node_update_value', '/node/{id}/update_value/')
    config.add_route('node_paste', 'node/{id}/paste/')
    config.add_route('node_cost', 'node/{id}/cost/')
    config.add_route('node_components', 'node/{id}/components/')

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

    # Editing users
    config.add_route('usersview', '/users', factory=makeProtected(Administrator))
    config.add_route('userview', '/users/{username}', factory=makeProtected(Administrator))

    # Reports
    config.add_route('projectbudget', '/project_budget_report/{id}/')
    config.add_route('resourcelist', '/resource_list_report/{id}/')

    config.scan()
    return config.make_wsgi_app()
