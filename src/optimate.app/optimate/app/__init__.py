""" __init__.py turns the directory into a package
    and set the configuration for the server
"""

from pyramid.events import NewResponse
from pyramid.events import subscriber

from pyramid.config import Configurator
from pyramid.authorization import ACLAuthorizationPolicy
from sqlalchemy import engine_from_config

import optimate.app.patches

from optimate.app.security import (
    OAuthPolicy,
    makePublic,
    makeProtected,
    makeProtectedFunction,
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
    config.add_route('rootview', '/', factory=makeProtectedFunction('projects'))
    config.add_route('node_children', 'node/{parentid}/children/', factory=makeProtectedFunction('projects'))
    config.add_route('nodeview', 'node/{id}/', factory=makeProtectedFunction('projects'))
    config.add_route('projects', '/projects/', factory=makeProtectedFunction('projects'))
    config.add_route('project_resources', '/project/{id}/resources/', factory=makeProtectedFunction('projects'))
    config.add_route('project_overheads', '/project/{id}/overheads/', factory=makeProtectedFunction('projects'))
    config.add_route('resourcetypes', '/resourcetypes', factory=makeProtectedFunction('projects'))
    config.add_route('node_grid', '/node/{parentid}/grid/', factory=makeProtectedFunction('projects'))
    config.add_route('node_update_value', '/node/{id}/update_value/', factory=makeProtectedFunction('projects'))
    config.add_route('node_paste', 'node/{id}/paste/', factory=makeProtectedFunction('projects'))
    config.add_route('node_cost', 'node/{id}/cost/', factory=makeProtectedFunction('projects'))
    config.add_route('node_budgetitems', 'node/{id}/budgetitems/', factory=makeProtectedFunction('projects'))
    config.add_route('node_budgetgroups', 'node/{id}/budgetgroups/', factory=makeProtectedFunction('projects'))
    config.add_route('node_expand_budgetgroup', 'expand_budgetgroup/{bg_id}', factory=makeProtectedFunction('projects'))
    config.add_route('resourcecategory_allresources', 'resourcecategory/{id}/allresources/', factory=makeProtectedFunction('projects'))
    config.add_route('resourcecategory_resources', 'resourcecategory/{id}/resources/', factory=makeProtectedFunction('projects'))

    # overheads
    config.add_route('overheadsview', '/{nodeid}/overheads/', factory=makeProtectedFunction('projects'))
    config.add_route('overheadview', '/overhead/{overheadid}/', factory=makeProtectedFunction('projects'))

    # the setup views
    config.add_route('clientsview', '/clients', factory=makeProtectedFunction('setup'))
    config.add_route('suppliersview', '/suppliers', factory=makeProtectedFunction('setup'))
    config.add_route('clientview', '/client/{id}/', factory=makeProtectedFunction('setup'))
    config.add_route('supplierview', '/supplier/{id}/', factory=makeProtectedFunction('setup'))
    config.add_route('company_information', '/company_information', factory=makeProtectedFunction('setup'))
    config.add_route('unitsview', '/units', factory=makeProtectedFunction('setup'))
    config.add_route('unitview', '/unit/{id}/', factory=makeProtectedFunction('setup'))
    config.add_route('citiesview', '/cities', factory=makeProtectedFunction('setup'))
    config.add_route('cityview', '/city/{id}/', factory=makeProtectedFunction('setup'))

    # orders
    config.add_route('ordersview', '/orders', factory=makeProtectedFunction('orders'))
    config.add_route('orderview', '/order/{id}/', factory=makeProtectedFunction('orders'))
    config.add_route('orderstatus', '/order/{id}/status', factory=makeProtectedFunction('orders'))
    config.add_route('orders_length', '/orders/length', factory=makeProtectedFunction('orders'))
    config.add_route('orders_filter', '/orders/filter', factory=makeProtectedFunction('orders'))
    config.add_route('orders_tree_view', '/orders/tree/{id}/', factory=makeProtectedFunction('orders'))

    # invoices
    config.add_route('invoicesview', '/invoices', factory=makeProtectedFunction('invoices'))
    config.add_route('invoicestatus', '/invoice/{id}/status', factory=makeProtectedFunction('invoices'))
    config.add_route('invoices_filter', '/invoices/filter', factory=makeProtectedFunction('invoices'))
    config.add_route('invoiceview', '/invoice/{id}/', factory=makeProtectedFunction('invoices'))

    # valuations
    config.add_route('valuationsview', '/valuations', factory=makeProtectedFunction('valuations'))
    config.add_route('valuationview', '/valuation/{id}/', factory=makeProtectedFunction('valuations'))
    config.add_route('valuations_length', '/valuations/length', factory=makeProtectedFunction('valuations'))
    config.add_route('valuations_filter', '/valuations/filter', factory=makeProtectedFunction('valuations'))

    # claims
    config.add_route('claimsview', '/claims', factory=makeProtectedFunction('claims'))
    config.add_route('claimview', '/claim/{id}/', factory=makeProtectedFunction('claims'))
    config.add_route('claimstatus', '/claim/{id}/status', factory=makeProtectedFunction('claims'))
    config.add_route('claims_filter', '/claims/filter', factory=makeProtectedFunction('claims'))
    config.add_route('claim_valuations', '/claim/valuations', factory=makeProtectedFunction('claims'))

    # payments
    config.add_route('paymentsview', '/payments', factory=makeProtectedFunction('payments'))
    config.add_route('paymentview', '/payment/{id}/', factory=makeProtectedFunction('payments'))

    # Editing users
    config.add_route('usersview', '/users', factory=makeProtectedFunction('setup'))
    config.add_route('userview', '/users/{username}', factory=makeProtectedFunction('setup'))

    # Reports
    config.add_route('projectbudget', '/project_budget_report/{id}/', factory=makeProtectedFunction('projects'))
    config.add_route('costcomparison', '/cost_comparison_report/{id}/', factory=makeProtectedFunction('projects'))
    config.add_route('reports_tree_view', '/reports/tree/{id}/', factory=makeProtectedFunction('projects'))
    config.add_route('resourcelist', '/resource_list_report/{id}/', factory=makeProtectedFunction('projects'))
    config.add_route('order', '/order_report/{id}/', factory=makeProtectedFunction('orders'))
    config.add_route('valuation', '/valuation_report/{id}/', factory=makeProtectedFunction('valuations'))
    config.add_route('invoices', '/invoices_report', factory=makeProtectedFunction('invoices'))
    config.add_route('invoices_report_filter', '/invoices_report_filter', factory=makeProtectedFunction('invoices'))
    config.add_route('claim', '/claim_report/{id}/', factory=makeProtectedFunction('claims'))

    # user rights
    config.add_route('userrights', '/rights/{username}/')

    # currencies
    config.add_route('currencyview', '/currency', factory=makeProtectedFunction('setup'))

    config.scan()
    return config.make_wsgi_app()
