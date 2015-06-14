import os
from pyramid.view import view_config
from pyramid.response import Response

@view_config(route_name="projectbudget")
def projectbudget(request):
    _here = os.path.dirname(__file__)
    _pdf = open(os.path.join(
                 _here, 'static', 'sample.pdf')).read()
    return Response(content_type='application/pdf',
                            body=_pdf)
