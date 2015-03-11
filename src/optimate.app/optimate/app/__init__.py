"""
__init__.py turns the directory into a package
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
    """Create a new request factory,
    ensuring CORS headers on all json responses."""

    def cors_headers(request, response):
        response.headers.update({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST,GET,DELETE,PUT,OPTIONS',
        'Access-Control-Allow-Headers': 'Origin, Content-Type, Accept, Authorization',
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

    config.add_route('rootview', '/')
    config.add_route('childview', '/{parentid}/')
    config.add_route('addview', '/{id}/add')
    config.add_route('deleteview', '/{id}/delete')
    config.add_route('pasteview', '/{id}/paste')
    config.add_route('costview', '/{id}/cost')
    config.scan()
    return config.make_wsgi_app()
