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
    Order,
    OrderItem
)

def all_nodes(node, data, level, level_limit, component_filter):
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
            elif child.type == 'Component':
                # no filtering selected
                if len(component_filter) == 3:
                    data.append((child, 'level' + str(level), 'normal'))
                # filter by resource type
                elif child.Resource.Type in component_filter:
                    data.append((child, 'level' + str(level), 'normal'))
            else:
                data.append((child, 'level' + str(level), 'normal'))
            if child.type != 'Component':
                # restrict level as specified
                if level != level_limit:
                    data += all_nodes(child, [], level, level_limit, 
                        component_filter)
    return data


@view_config(route_name="reports_tree_view", renderer='json')
def reports_tree_view(request):
    """ This view is for when the user requests the children of a node
        in the budget group selection tree. 
        The nodes used by the orders use a different format than the projects 
        tree view
    """

    parentid = request.matchdict['id']
    childrenlist = []

    qry = DBSession.query(Node).filter_by(ID=parentid).first()
    # build the list and only get the neccesary values
    if qry != None:
        for child in qry.Children:
            if child.type == 'Component':
                childrenlist.append(child.toOrderDict())
            elif child.type != 'ResourceCategory':
                childrenlist.append(child.toChildDict())

    # sort childrenlist
    sorted_childrenlist = sorted(childrenlist, key=lambda k: k['Name'].upper())
    return sorted_childrenlist


@view_config(route_name="projectbudget")
def projectbudget(request):
    print "Generating Project Budget Report"
    nodeid = request.matchdict['id']
    level_limit = request.json_body['LevelLimit']
    ctypelist = request.json_body['ComponentTypeList']
    print_bgroups = request.json_body['PrintSelectedBudgerGroups']
    bgroup_list = request.json_body['BudgetGroupList']

    component_filter = []
    for record in ctypelist:
        if record['selected']:
            component_filter.append(record['Name'])

    project = DBSession.query(Node).filter_by(ID=nodeid).first()

    # inject node data into template
    nodes = []
    if print_bgroups:
        bgs = sorted(bgroup_list, key=lambda k: k['Name'].upper())
        for bgroup in bgs:
            bg_id = bgroup['ID']
            qry = DBSession.query(Node).filter_by(ID=bg_id).first()
            bg_parent_id = qry.ParentID
            bg_parent = DBSession.query(Node).filter_by(ID=bg_parent_id).first()
            
            # start at the parent so we can display the context
            nodes.append((qry, 'level1', 'bold'))
            # group data
            nodes += all_nodes(qry, [], 1, level_limit+1, component_filter)
            # add blank line seperator between groups
            nodes.append(None)
    else:
        nodes = all_nodes(project, [], 0, level_limit, component_filter)


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
