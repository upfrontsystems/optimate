import os
import time
from datetime import datetime
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
    Valuation,
    Client,
    Invoice
)

def projectbudget_nodes(node, data, level, level_limit, component_filter):
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
                    data += projectbudget_nodes(child, [], level, level_limit, 
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
            nodes += projectbudget_nodes(qry, [], 1, level_limit+1,
                component_filter)
            # add blank line seperator between groups
            nodes.append(None)
    else:
        nodes = projectbudget_nodes(project, [], 0, level_limit, 
            component_filter)

    # this needs explaining. The 1st component or budgetitem of a budget group 
    # needs a a special class so that extra spacing can be added above it for 
    # report readability & clarity
    count = 0
    for node in nodes:
        if node != None:
            if node[0].type == 'Component' and count != 0:
                if nodes[count-1][0].type != 'Component':
                    nodes[count] = (node[0], node[1], 'normal-space')
            elif node[0].type == 'BudgetItem' and count != 0:
                if nodes[count-1][0].type != 'BudgetItem':
                    nodes[count] = (node[0], node[1], 'normal-space')
        count+= 1

    # render template
    now = datetime.now()
    template_data = render('templates/projectbudgetreport.pt',
                           {'nodes': nodes,
                            'project_name': project.Name,
                            'print_date' : now.strftime("%d %B %Y - %k:%M")},
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


def costcomparison_nodes(node, data, level, level_limit):
    level +=1
    nodelist = []
    for child in node.Children:
        if child.type != 'ResourceCategory':
            nodelist.append(child)
    sorted_nodelist = sorted(nodelist, key=lambda k: k.Name.upper())    
    for child in sorted_nodelist:
        if child.type != 'ResourceCategory':
            if child.type == 'BudgetGroup':
                data.append((child, 'level' + str(level), 'normal'))
            if child.type != 'Component':
                # restrict level as specified
                if level != level_limit:
                    data += costcomparison_nodes(child, [], level, level_limit)
    return data


@view_config(route_name="costcomparison")
def costcomparison(request):
    print "Generating Cost Comparison Report"
    nodeid = request.matchdict['id']
    level_limit = request.json_body['LevelLimit']
    print_bgroups = request.json_body['PrintSelectedBudgerGroups']
    bgroup_list = request.json_body['BudgetGroupList']

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
            nodes += costcomparison_nodes(qry, [], 1, level_limit+1)
            # add blank line seperator between groups
            nodes.append(None)
    else:
        nodes = costcomparison_nodes(project, [], 0, level_limit)

    # apply colour distinction based on budgetgroup totals
    nodes_colour = []
    for node in nodes:
        tc = 'black';
        oc = 'black';
        ic = 'black';
        if node[0].Ordered > node[0].Total: 
            oc = 'red';
        if node[0].Invoiced > node[0].Total: 
            ic = 'red';
        nodes_colour.append((node[0], node[1], node[2], tc, oc, ic))

    # render template
    now = datetime.now()
    template_data = render('templates/costcomparisonreport.pt',
                           {'nodes': nodes_colour,
                            'project_name': project.Name,
                            'print_date' : now.strftime("%d %B %Y - %k:%M")},
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
    filename = "cost_comparison_report"
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


def all_resources(node, data, level, supplier_filter):
    level +=1
    nodelist = []
    for child in node.Children:
        nodelist.append(child)
    sorted_nodelist = sorted(nodelist, key=lambda k: k.Name.upper())    
    for child in sorted_nodelist:
        if child.type == 'Resource':
            if supplier_filter:
                if supplier_filter == child.SupplierID:
                    quantity = 0
                    for component in child.Components:
                        quantity += component.Quantity
                    data.append((child, 'level' + str(level), 'normal', 
                        quantity))
            else:
                quantity = 0
                for component in child.Components:
                    quantity += component.Quantity
                data.append((child, 'level' + str(level), 'normal', quantity))
        else: # ResourceCategory
            data.append((child, 'level' + str(level), 'bold', None))
            data += all_resources(child, [], level, supplier_filter)
    return data


@view_config(route_name="resourcelist")
def resourcelist(request):
    print "Generating Resource List Report"
    nodeid = request.matchdict['id']
    project = DBSession.query(Node).filter_by(ID=nodeid).first()
    filter_by_supplier = request.json_body['FilterBySupplier']

    # inject node data into template
    nodes = []
    if filter_by_supplier and 'Supplier' in request.json_body:
        supplier = request.json_body['Supplier']
        nodes = all_resources(project, [], 0, supplier)
    else:
        nodes = all_resources(project, [], 0, None)

    # render template
    # XXX add a filtered by to title.. if exists
    now = datetime.now()
    template_data = render('templates/resourcelistreport.pt',
                           {'nodes': nodes,
                            'project_name': project.Name,
                            'print_date' : now.strftime("%d %B %Y - %k:%M")},
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


@view_config(route_name="order")
def order(request):
    print "Generating Order Report"
    orderid = request.matchdict['id']
    order = DBSession.query(Order).filter_by(ID=orderid).first()
    orderitems = []
    for orderitem in order.OrderItems:
        orderitems.append(orderitem.toDict())
    sorted_orderitems = sorted(orderitems, key=lambda k: k['name'].upper())

    Vat = 14.0
    Subtotal = float(order.Total)/(1+ Vat/100)
    vat_str = str(Vat) + '%'
    totals = [Subtotal, vat_str, float(order.Total)]
    # inject order data into template
    template_data = render('templates/orderreport.pt',
                           {'order': order,
                            'order_items': sorted_orderitems,
                            'order_date': order.Date.strftime("%d %B %Y"),
                            'totals': totals},
                            request=request)
    # render template
    html = StringIO(template_data.encode('utf-8'))

    # Generate the pdf
    pdf = StringIO()
    pisadoc = pisa.CreatePDF(html, pdf, raise_exception=False)
    assert pdf.len != 0, 'Pisa PDF generation returned empty PDF!'
    html.close()
    pdfcontent = pdf.getvalue()
    pdf.close()

    filename = "order_report"
    now = datetime.now()
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


@view_config(route_name="valuation")
def valuation(request):
    print "Generating Valuation Report"
    valuationid = request.matchdict['id']
    valuation = DBSession.query(Valuation).filter_by(ID=valuationid).first()
    vitems = []
    budget_total = 0
    for valuationitem in valuation.ValuationItems:
        vitems.append(valuationitem.toDict())
        budget_total += valuationitem.BudgetGroup.Total
    sorted_vitems = sorted(vitems, key=lambda k: k['name'].upper())

    # inject valuation data into template
    now = datetime.now()
    vdate = valuation.Date.strftime("%d %B %Y")
    clientid = valuation.Project.ClientID
    client = DBSession.query(Client).filter_by(ID=clientid).first()    
    template_data = render('templates/valuationreport.pt',
                           {'valuation': valuation,
                            'valuation_items': sorted_vitems,
                            'client': client,
                            'budget_total': budget_total,
                            'valuation_date': vdate},
                            request=request)
    # render template
    html = StringIO(template_data.encode('utf-8'))

    # Generate the pdf
    pdf = StringIO()
    pisadoc = pisa.CreatePDF(html, pdf, raise_exception=False)
    assert pdf.len != 0, 'Pisa PDF generation returned empty PDF!'
    html.close()
    pdfcontent = pdf.getvalue()
    pdf.close()

    filename = "valuation_report"
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


@view_config(route_name='invoices_report_filter', renderer='json')
def invoices_report_filter(request):
    """ Returns a list of the available filters used by an invoice report
    """
    qry = DBSession.query(Invoice)
    supplierlist = []
    for supplier in qry:
        if supplier.SupplierID:
            entry = {'Name': supplier.Order.Supplier.Name, 
                     'ID': supplier.SupplierID}
            if entry not in supplierlist:
                supplierlist.append(entry)

    projectlist = []
    for project in qry:
        if project.ProjectID:
            entry = {'Name': project.Order.Project.Name, 
                     'ID': project.ProjectID}
            if entry not in projectlist:
                projectlist.append(entry)

    paymentdatelist = []
    for paymentdate in qry:
        if paymentdate.PaymentDate:
            entry = paymentdate.PaymentDate.strftime("%d %B %Y")
            if entry not in paymentdatelist:
                paymentdatelist.append(entry)

    return {'projects': sorted(projectlist, key=lambda k: k['Name'].upper()),
            'suppliers': sorted(supplierlist, key=lambda k: k['Name'].upper()),
            'paymentdates': sorted(paymentdatelist),
            'paymentdates_exist': paymentdatelist != [],
            'statuses': ['Paid', 'Unpaid']}


@view_config(route_name="invoices")
def invoices(request):
    print "Generating Invoices Report"
    filter_by_project = request.json_body['FilterByProject']
    filter_by_supplier = request.json_body['FilterBySupplier']
    filter_by_paymentdate = request.json_body['FilterByPaymentDate']
    filter_by_status = request.json_body['FilterByStatus']

    qry = DBSession.query(Invoice)    
    invoices = []
    if filter_by_project and 'Project' in request.json_body:
        projectid = request.json_body['Project']
        node = DBSession.query(Node).filter_by(ID=projectid).first()
        heading = node.Name
        filter_type = 'project'

    elif filter_by_supplier and 'Supplier' in request.json_body:
        supplierid = request.json_body['Supplier']
        node = DBSession.query(Node).filter_by(ID=supplierid).first()
        heading = node.Name
        filter_type = 'supplier'

    elif filter_by_paymentdate and 'PaymentDate' in request.json_body:
        heading = request.json_body['PaymentDate']
        filter_type = 'paymentdate'

    elif filter_by_status and 'Status' in request.json_body:
        heading = request.json_body['Status']
        filter_type = 'status'
    else:
        filter_type = 'none'
        heading = ''
        for invoice in qry:
            invoices.append(invoice.toReportDict())

    sorted_invoices = sorted(invoices, key=lambda k: k['id'])

    # inject invoice data into template
    template_data = render('templates/invoicesreport.pt',
                           {'invoices': sorted_invoices,
                            'filter': filter_type,
                            'report_heading': heading},
                            request=request)
    # render template
    html = StringIO(template_data.encode('utf-8'))

    # Generate the pdf
    pdf = StringIO()
    pisadoc = pisa.CreatePDF(html, pdf, raise_exception=False)
    assert pdf.len != 0, 'Pisa PDF generation returned empty PDF!'
    html.close()
    pdfcontent = pdf.getvalue()
    pdf.close()

    filename = "invoice_report"
    now = datetime.now()
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
