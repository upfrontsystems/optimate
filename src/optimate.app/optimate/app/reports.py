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
    Order,
    OrderItem
)

def all_nodes(node, data, level, level_limit):
    level +=1
    nodelist = []
    for child in node.Children:
        if child.type != 'ResourceCategory':
            nodelist.append(child)
    sorted_nodelist = sorted(nodelist, key=lambda k: k.Name.upper())    
    for child in sorted_nodelist:
        if child.type != 'ResourceCategory':
            if child.type == 'BudgetGroup':
                data.append((child, 'level' + str(level), 'bold'))
            else:
                data.append((child, 'level' + str(level), 'normal'))
            if child.type != 'Component':
                # restrict level as specified
                if level != level_limit:
                    data += all_nodes(child, [], level, level_limit)
    return data


@view_config(route_name="projectbudget")
def projectbudget(request):
    print "Generating Project Budget Report"
    nodeid = request.matchdict['id']
    level_limit = request.json_body['LevelLimit']

    project = DBSession.query(Node).filter_by(ID=nodeid).first()
    # inject node data into template
    nodes = []
    nodes = all_nodes(project, [], 0, level_limit)
    # render template
    template_data = render('templates/projectbudgetreport.pt',
                           {'nodes': nodes,
                            'project_name': project.Name},
                           request=request)
    html = StringIO(template_data.encode('utf-8'))
    print "template rendered"

    # Generate the pdf
    pdf = StringIO()
    pisadoc = pisa.CreatePDF(html, pdf, raise_exception=False)
    assert pdf.len != 0, 'Pisa PDF generation returned empty PDF!'
    html.close()
    pdfcontent = pdf.getvalue()
    pdf.close()

    print "pdf rendered"
    filename = "project_budget_report"
    now = datetime.datetime.now()
    nice_filename = '%s_%s' % (filename, now.strftime('%Y%m%d'))
    last_modified = formatdate(time.mktime(now.timetuple()))

    response = Response(content_type='application/pdf',
                        body=pdfcontent)
    response.headers.add('Content-Disposition',
                         "attachment; filename=%s.pdf" % nice_filename)
    # needed so that in a cross-domain situation the header is visible
    response.headers.add('Access-Control-Expose-Headers','Content-Disposition')
    response.headers.add("Content-Length", str(len(pdfcontent)))
    response.headers.add('Last-Modified', last_modified)
    response.headers.add("Cache-Control", "no-store")
    response.headers.add("Pragma", "no-cache")
    return response


def all_resources(node, data, level):
    level +=1
    nodelist = []
    for child in node.Children:
        nodelist.append(child)
    sorted_nodelist = sorted(nodelist, key=lambda k: k.Name.upper())    
    for child in sorted_nodelist:
        if child.type == 'Resource':
            quantity = 0
            for component in child.Components:
                quantity += component.Quantity
            data.append((child, 'level' + str(level), 'normal', quantity))
        else: # ResourceCategory
            data.append((child, 'level' + str(level), 'bold', None))
            data += all_resources(child, [], level)
    return data


@view_config(route_name="resourcelist")
def resourcelist(request):
    print "Generating Resource List Report"
    nodeid = request.matchdict['id']
    project = DBSession.query(Node).filter_by(ID=nodeid).first()
    # inject node data into template
    nodes = []
    nodes = all_resources(project, [], 0)
    # render template
    template_data = render('templates/resourcelistreport.pt',
                           {'nodes': nodes,
                            'project_name': project.Name},
                           request=request)
    html = StringIO(template_data.encode('utf-8'))

    # Generate the pdf
    pdf = StringIO()
    pisadoc = pisa.CreatePDF(html, pdf, raise_exception=False)
    assert pdf.len != 0, 'Pisa PDF generation returned empty PDF!'
    html.close()
    pdfcontent = pdf.getvalue()
    pdf.close()

    filename = "resource_list_report"
    now = datetime.datetime.now()
    nice_filename = '%s_%s' % (filename, now.strftime('%Y%m%d'))
    last_modified = formatdate(time.mktime(now.timetuple()))
    response = Response(content_type='application/pdf',
                        body=pdfcontent)
    response.headers.add('Content-Disposition',
                         "attachment; filename=%s.pdf" % nice_filename)
    # needed so that in a cross-domain situation the header is visible
    response.headers.add('Access-Control-Expose-Headers','Content-Disposition')
    response.headers.add("Content-Length", str(len(pdfcontent)))
    response.headers.add('Last-Modified', last_modified)
    response.headers.add("Cache-Control", "no-store")
    response.headers.add("Pragma", "no-cache")
    return response
