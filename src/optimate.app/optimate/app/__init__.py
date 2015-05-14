""" __init__.py turns the directory into a package
    and set the configuration for the server
"""

from pyramid.events import NewResponse
from pyramid.events import subscriber
from pyramid.events import NewRequest

from pyramid.config import Configurator
from sqlalchemy import engine_from_config

from .models import (
    DBSession,
    Base,
)


@subscriber(NewResponse)
def handleResponse(event):
    """ Create a new request factory,
        ensuring CORS headers on all json responses.
    """

    def cors_headers(request, response):
        response.headers.update({
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST,GET,DELETE,PUT,OPTIONS',
            'Access-Control-Allow-Headers': 'Origin, Content-Type, Accept, \
                                         Authorization',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Max-Age': '1728000',
        })
    event.request.add_response_callback(cors_headers)


def main(global_config, **settings):
    """ This function returns a Pyramid WSGI application.
    """
    engine = engine_from_config(settings, 'sqlalchemy.')
    DBSession.configure(bind=engine)
    Base.metadata.bind = engine

    config = Configurator(settings=settings)
    config.include('pyramid_chameleon')
    config.add_subscriber(handleResponse, NewRequest)
    config.add_static_view('static', 'static', cache_max_age=3600)

    # the optimate data views
    config.add_route('rootview', '/')
    config.add_route('childview', '/{parentid}/')
    config.add_route('getitem', 'node/{id}/')
    config.add_route('project_listing', '/project_listing')
    config.add_route('resource_list', '/resource_list/{id}/')
    config.add_route('related_list', '/related_list/{id}/')
    config.add_route('overhead_list', '/overhead_list/{id}/')
    config.add_route('component_overheads', '/component_overheads/{id}/')
    config.add_route('units', '/unit_list')
    config.add_route('componenttypes', '/component_types')
    config.add_route('resources', '/resources')
    config.add_route('projectview', 'projectview/{projectid}/')
    config.add_route('nodegridview', '/nodegridview/{parentid}/')
    config.add_route('update_value', '/update_value/{id}/')
    config.add_route('addview', '/{id}/add')
    config.add_route('deleteview', '/{id}/delete')
    config.add_route('pasteview', '/{id}/paste')
    config.add_route('costview', '/{id}/cost')

    # the company information, client and supplier views
    config.add_route('clientsview', '/clients')
    config.add_route('suppliersview', '/suppliers')
    config.add_route('clientview', '/{id}/client')
    config.add_route('supplierview', '/{id}/supplier')
    config.add_route('company_information', '/company_information')    

    config.scan()
    return config.make_wsgi_app()