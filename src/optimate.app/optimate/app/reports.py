import os
import time
import datetime
from email.Utils import formatdate
from pyramid.view import view_config
from pyramid.response import Response
from pyramid.renderers import render
from StringIO import StringIO
from xhtml2pdf import pisa

from optimate.app.models import (
    DBSession,
    Node,
    Project,
    BudgetGroup,
    BudgetItem,
    Component,
    ResourceType,
    ResourceCategory,
    Resource,
    Unit,
    City,
    Overhead,
    Client,
    Supplier,
    CompanyInformation,
    User,
    Order,
    OrderItem
)


def all_nodes(node, data, level):
    level +=1
#    print level
    for child in node.Children:
        if child.type != 'ResourceCategory':
            data.append((child, level))
            print child.Name
            if child.type != 'Component':
                data += all_nodes(child, data, level)
    return data


@view_config(route_name="projectbudget")
def projectbudget(request):

    nodeid = request.matchdict['id']
    print "generating report"
    project = DBSession.query(Node).filter_by(ID=nodeid).first()

    # inject node data into template
    nodes = []
    nodes = all_nodes(project, [], 0)

    print "rendering report"

    # render template
    template_data = render('templates/projectbudgetreport.pt',
                           {'fields': values,
                            'project_name': qry.Name},
                           request=request)
    html = StringIO(template_data.encode('utf-8'))
    print "rendered!!"

    # Generate the pdf
    pdf = StringIO()
    pisadoc = pisa.CreatePDF(html, pdf, raise_exception=False)
    assert pdf.len != 0, 'Pisa PDF generation returned empty PDF!'
    html.close()
    pdfcontent = pdf.getvalue()
    pdf.close()

    print "more rendered!"

    filename = "project_budget"
    now = datetime.datetime.now()
    nice_filename = '%s_%s' % (filename, now.strftime('%Y%m%d'))
    last_modified = formatdate(time.mktime(now.timetuple()))

    response = Response(content_type='application/pdf',
                        body=pdfcontent)
    response.headers.add('Content-Disposition',
                         "attachment; filename=%s.pdf" % nice_filename)
    response.headers.add("Content-Length", str(len(pdfcontent)))
    response.headers.add('Last-Modified', last_modified)
    response.headers.add("Cache-Control", "no-store")
    response.headers.add("Pragma", "no-cache")

    print "final rendered!"
    return response
