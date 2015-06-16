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


def create_values_list(values, level, data):
    for entry in data:
        if isinstance(entry, list):
            if entry != []:
                values += create_values_list(values, level+1, entry)
        else:
            # 0 = name, 1 = css class, 2 = x, 3 = x, 4 = x
            values.append([entry.Name, 'level_' +str(level)])
    return values

@view_config(route_name="projectbudget")
def projectbudget(request):

    nodeid = request.matchdict['id']
    print "generating report"
    qry = DBSession.query(Node).filter_by(ID=nodeid).first()
    # iterate through project and recursively get all nodes of a project in 
    # sorted order
    data = qry.getNodes()

    # inject node data into template
    values = []
    values = create_values_list(values, 1, data[0:2]) # XXX Change it to all later once it works

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

    print "all done!"
    return response
