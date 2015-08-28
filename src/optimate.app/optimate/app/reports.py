# -*- coding: utf-8 -*-
import os
import time
import logging
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
    Invoice,
    Supplier,
    Project,
    CompanyInformation,
    Claim,
    Overhead,
    ValuationMarkup
)

currencies = {
            'AED':'',
            'AFA':'',
            'ALL':'',
            'AMD':'',
            'ANG':'',
            'AOA':'',
            'ARS':'',
            'AUD':'$',
            'AWG':'',
            'AZM':'',
            'BAM':'',
            'BBD':'$',
            'BDT':'',
            'BGN':'',
            'BHD':'',
            'BIF':'',
            'BMD':'$',
            'BND':'$',
            'BOB':'',
            'BRL':'',
            'BSD':'$',
            'BTN':'',
            'BWP':'',
            'BYR':'',
            'BZD':'$',
            'CAD':'$',
            'CDF':'',
            'CHF':'',
            'CLP':'',
            'CNY':'',
            'COP':'',
            'CRC':'₡',
            'CUP':'',
            'CVE':'',
            'CYP':'',
            'CZK':'',
            'DJF':'',
            'DKK':'',
            'DOP':'',
            'DZD':'',
            'EEK':'',
            'EGP':'',
            'ERN':'',
            'ETB':'',
            'EUR':'€',
            'FJD':'$',
            'FKP':'',
            'GBP':'£',
            'GEL':'',
            'GGP':'',
            'GHC':'',
            'GIP':'',
            'GMD':'',
            'GNF':'',
            'GTQ':'',
            'GYD':'$',
            'HKD':'HK$',
            'HNL':'',
            'HRK':'',
            'HTG':'',
            'HUF':'',
            'IDR':'',
            'ILS':'₪',
            'IMP':'',
            'INR':'₹',
            'IQD':'',
            'IRR':'',
            'ISK':'',
            'JEP':'',
            'JMD':'$',
            'JOD':'',
            'JPY':'¥',
            'KES':'',
            'KGS':'',
            'KHR':'',
            'KMF':'',
            'KPW': '₩',
            'KRW':'₩',
            'KWD':'',
            'KYD':'$',
            'KZT':'',
            'LAK':'',
            'LBP':'',
            'LKR':'₹',
            'LRD':'L$',
            'LSL':'',
            'LTL':'',
            'LVL':'',
            'LYD':'',
            'MAD':'',
            'MDL':'',
            'MGA':'',
            'MKD':'',
            'MMK':'',
            'MNT':'',
            'MOP':'',
            'MRO':'',
            'MTL':'',
            'MUR':'₹',
            'MVR':'',
            'MWK':'',
            'MXN':'',
            'MYR':'',
            'MZM':'',
            'NAD':'N$',
            'NGN':'₦',
            'NIO':'',
            'NOK':'',
            'NPR':'₹',
            'NZD':'$',
            'OMR':'',
            'PAB':'',
            'PEN':'',
            'PGK':'',
            'PHP':'₱',
            'PKR':'₹',
            'PLN':'zł',
            'PYG':'₲',
            'QAR':'',
            'ROL':'',
            'RUR':'',
            'RWF':'',
            'SAR':'',
            'SBD':'SI$',
            'SCR':'₹',
            'SDD':'',
            'SEK':'',
            'SGD':'S$',
            'SHP':'',
            'SIT':'',
            'SKK':'',
            'SLL':'',
            'SOS':'',
            'SPL':'',
            'SRG':'',
            'STD':'',
            'SVC':'',
            'SYP':'',
            'SZL':'',
            'THB':'฿',
            'TJS':'',
            'TMM':'',
            'TND':'',
            'TOP':'',
            'TRL':'₺',
            'TTD':'$',
            'TVD':'$',
            'TWD':'NT$',
            'TZS':'',
            'UAH':'₴',
            'UGX':'',
            'USD':'$',
            'UYU':'',
            'UZS':'',
            'VEB':'',
            'VND':'₫',
            'VUV':'',
            'WST':'',
            'XAF':'',
            'XAG':'',
            'XAU':'',
            'XCD':'$',
            'XDR':'',
            'XOF':'',
            'XPD':'',
            'XPF':'',
            'XPT':'',
            'YER':'',
            'YUM':'',
            'ZAR':'R',
            'ZMK':'',
            'ZWD':'$'
        }

logger = logging.getLogger('optimate.app.reports')

def projectbudget_nodes(node, data, level, level_limit, budgetitem_filter):
    level +=1
    nodelist = []
    for child in node.Children:
        if child.type != 'ResourceCategory':
            nodelist.append(child)
    sorted_nodelist = sorted(nodelist, key=lambda k: k.Name.upper())
    for child in sorted_nodelist:
        if child.type != 'ResourceCategory':
            # leaf nodes with no children act as budgetitems
            leaf = len(child.Children) == 0
            if child.type == 'BudgetGroup':
                data.append((child, 'level' + str(level), 'bold'))
            elif leaf:
                if child.Type in budgetitem_filter:
                    data.append((child, 'level' + str(level), 'normal'))
            else:
                data.append((child, 'level' + str(level), 'normal'))
            if not leaf:
                # restrict level as specified
                if level < level_limit:
                    data += projectbudget_nodes(child, [], level, level_limit,
                        budgetitem_filter)
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
            if child.type != 'ResourceCategory':
                childrenlist.append(child.dict())

    # sort childrenlist
    sorted_childrenlist = sorted(childrenlist, key=lambda k: k['Name'].upper())
    return sorted_childrenlist


@view_config(route_name="projectbudget")
def projectbudget(request):
    logger.info("Generating Project Budget Report")
    nodeid = request.matchdict['id']
    level_limit = request.json_body['LevelLimit']
    bi_typelist = request.json_body['BudgetItemTypeList']
    print_bgroups = request.json_body['PrintSelectedBudgerGroups']
    bgroup_list = request.json_body['BudgetGroupList']

    budgetitem_filter = [record['ID'] for record in bi_typelist \
        if record['selected']]

    project = DBSession.query(Node).filter_by(ID=nodeid).first()
    currency = currencies[DBSession.query(CompanyInformation).first().Currency]

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
                budgetitem_filter)
            # add blank line seperator between groups
            nodes.append(None)
    else:
        nodes = projectbudget_nodes(project, [], 0, level_limit,
            budgetitem_filter)

    # this needs explaining. The 1st budgetitem of a budget group
    # needs a a special class so that extra spacing can be added above it for
    # report readability & clarity
    count = 0
    for node in nodes:
        if node != None:
            if node[0].type == 'BudgetItem' and count != 0:
                if nodes[count-1][0].type != 'BudgetItem':
                    nodes[count] = (node[0], node[1], 'normal-space')
        count+= 1

    # get all the project markups
    projectmarkups = DBSession.query(Overhead).filter_by(ProjectID = nodeid,
                                                        Type='Project').all()
    projectsubtotal = float(project.Total)
    projecttotal = projectsubtotal
    markups = []
    for markup in projectmarkups:
        data = markup.dict()
        data['Amount'] = projecttotal * markup.Percentage / 100.0
        markups.append(data)
        projecttotal = projecttotal * (1+(markup.Percentage/100.0))

    # render template
    now = datetime.now()
    template_data = render('templates/projectbudgetreport.pt',
                           {'nodes': nodes,
                            'project_name': project.Name,
                            'print_date' : now.strftime("%d %B %Y - %k:%M"),
                            'markups': markups,
                            'subtotal': projectsubtotal,
                            'total': projecttotal,
                            'currency': currency},
                           request=request)
    html = StringIO(template_data.encode('utf-8'))
    logging.info("template rendered")

    # Generate the pdf
    pdf = StringIO()
    pisadoc = pisa.CreatePDF(html, pdf, raise_exception=False)
    assert pdf.len != 0, 'Pisa PDF generation returned empty PDF!'
    html.close()
    pdfcontent = pdf.getvalue()
    pdf.close()

    logging.info("pdf rendered")
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
            # leaf nodes with no children act as components
            leaf = len(child.Children) == 0
            if not leaf:
                # restrict level as specified
                if level != level_limit:
                    data += costcomparison_nodes(child, [], level, level_limit)
    return data


@view_config(route_name="costcomparison")
def costcomparison(request):
    logging.info("Generating Cost Comparison Report")
    nodeid = request.matchdict['id']
    level_limit = request.json_body['LevelLimit']
    print_bgroups = request.json_body['PrintSelectedBudgerGroups']
    bgroup_list = request.json_body['BudgetGroupList']

    project = DBSession.query(Node).filter_by(ID=nodeid).first()
    currency = currencies[DBSession.query(CompanyInformation).first().Currency]

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
                            'print_date' : now.strftime("%d %B %Y - %k:%M"),
                            'currency': currency},
                           request=request)
    html = StringIO(template_data.encode('utf-8'))
    logging.info("template rendered")

    # Generate the pdf
    pdf = StringIO()
    pisadoc = pisa.CreatePDF(html, pdf, raise_exception=False)
    assert pdf.len != 0, 'Pisa PDF generation returned empty PDF!'
    html.close()
    pdfcontent = pdf.getvalue()
    pdf.close()

    logging.info("pdf rendered")
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
        if child.type in ['Resource']:
            # Resource is a leaf
            if supplier_filter:
                if supplier_filter == child.SupplierID:
                    quantity = 0
                    for budgetitem in child.BudgetItems:
                        quantity += budgetitem.Quantity
                    data.append((child, 'level' + str(level), 'normal',
                        quantity))
            else:
                quantity = 0
                for budgetitem in child.BudgetItems:
                    quantity += budgetitem.Quantity
                data.append((child, 'level' + str(level), 'normal', quantity))
        else:
            if child.type in ['ResourceUnit']:
                if supplier_filter:
                    if supplier_filter == child.SupplierID:
                        quantity = 0
                        for budgetitem in child.BudgetItems:
                            quantity += budgetitem.Quantity
                        data.append((child, 'level' + str(level), 'normal',
                            quantity))
                else:
                    quantity = 0
                    for budgetitem in child.BudgetItems:
                        quantity += budgetitem.Quantity
                data.append((child, 'level' + str(level), 'normal', quantity))
                if child.Children:
                    data += all_resources(child, [], level, supplier_filter)
            elif child.type in ['ResourcePart']:
                # ResourcePart is a leaf
                data.append((child, 'level' + str(level), 'normal', None))
            else: # ResourceCategory
                data.append((child, 'level' + str(level), 'bold', None))
                data += all_resources(child, [], level, supplier_filter)
    return data


@view_config(route_name="resourcelist")
def resourcelist(request):
    logging.info("Generating Resource List Report")
    nodeid = request.matchdict['id']
    project = DBSession.query(Node).filter_by(ID=nodeid).first()
    filter_by_supplier = request.json_body['FilterBySupplier']

    currency = currencies[DBSession.query(CompanyInformation).first().Currency]

    # inject node data into template
    nodes = []
    filtered_by = ''
    if filter_by_supplier and 'Supplier' in request.json_body:
        supplier = request.json_body['Supplier']
        nodes = all_resources(project, [], 0, supplier)
        sp = DBSession.query(Supplier).filter_by(ID=supplier).first()
        filtered_by = '(Supplier: ' + sp.Name + ')'
    else:
        nodes = all_resources(project, [], 0, None)

    # render template
    now = datetime.now()
    template_data = render('templates/resourcelistreport.pt',
                           {'nodes': nodes,
                            'filtered_by_string': filtered_by,
                            'project_name': project.Name,
                            'print_date' : now.strftime("%d %B %Y - %k:%M"),
                            'currency': currency},
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
    logging.info("Generating Order Report")
    orderid = request.matchdict['id']
    order = DBSession.query(Order).filter_by(ID=orderid).first()
    currency = currencies[DBSession.query(CompanyInformation).first().Currency]

    orderitems = []
    for orderitem in order.OrderItems:
        orderitems.append(orderitem.dict())
    sorted_orderitems = sorted(orderitems, key=lambda k: k['Name'].upper())

    Vat = 14.0
    Subtotal = float(order.Total)/(1+ Vat/100)
    vat_str = str(Vat) + '%'
    totals = [Subtotal, vat_str, float(order.Total)]
    # inject order data into template
    template_data = render('templates/orderreport.pt',
                           {'order': order,
                            'order_items': sorted_orderitems,
                            'order_date': order.Date.strftime("%d %B %Y"),
                            'totals': totals,
                            'currency': currency},
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
    logging.info("Generating Valuation Report")
    valuationid = request.matchdict['id']
    valuation = DBSession.query(Valuation).filter_by(ID=valuationid).first()
    currency = currencies[DBSession.query(CompanyInformation).first().Currency]

    budget_total = 0
    itemlist = []
    parentlist = []
    childrenlist = []

    for item in valuation.ValuationItems:
        bg = item.BudgetGroup
        # get data and append children valuation items to children list
        if item.ParentID != 0:
            data = bg.valuation('2')
            totalbudget = item.BudgetGroupTotal
            if totalbudget is not None:
                totalbudget = str(totalbudget)
            data['TotalBudget'] = totalbudget
            data['AmountComplete'] = str(item.Total)
            data['PercentageComplete'] = item.PercentageComplete
            childrenlist.append(data)
        # get data and append parents valuation items to parent list
        else:
            budget_total += float(item.Total)
            data = bg.valuation()
            if len(item.Children) > 0:
                data['expanded'] = True
            data['AmountComplete'] = str(item.Total)
            data['PercentageComplete'] = item.PercentageComplete
            totalbudget = item.BudgetGroupTotal
            if totalbudget is not None:
                totalbudget = str(totalbudget)
            data['TotalBudget'] = totalbudget
            parentlist.append(data)

    # sort the list, place children after parents
    parentlist = sorted(parentlist, key=lambda k: k['Name'].upper())
    for parent in parentlist:
        if parent['expanded']:
            dc = [x for x in childrenlist if x['ParentID'] == parent['ID']]
            dc = sorted(dc, key=lambda k: k['Name'].upper())
            itemlist.append(parent)
            itemlist+=dc
        else:
            itemlist.append(parent)

    markup_list = []
    grandtotal = float(valuation.Total)
    # get the valuation markup
    for markup in valuation.MarkupList:
        data = markup.dict()
        data["Amount"] = float(data['TotalBudget'])*(markup.PercentageComplete/100)
        grandtotal += data["Amount"]
        markup_list.append(data)

    markup_list = sorted(markup_list, key=lambda k: k['Name'].upper())

    # inject valuation data into template
    now = datetime.now()
    vdate = valuation.Date.strftime("%d %B %Y")
    clientid = valuation.Project.ClientID
    client = DBSession.query(Client).filter_by(ID=clientid).first()
    template_data = render('templates/valuationreport.pt',
                           {'valuation': valuation,
                            'valuation_items': itemlist,
                            'client': client,
                            'budget_total': budget_total,
                            'valuation_date': vdate,
                            'markup_list': markup_list,
                            'grand_total': grandtotal,
                            'currency': currency},
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
            'statuses': ['Draft', 'Due', 'Paid']}


@view_config(route_name="invoices")
def invoices(request):
    logging.info("Generating Invoices Report")
    filter_by_project = request.json_body.get('FilterByProject', False)
    filter_by_supplier = request.json_body.get('FilterBySupplier', False)
    filter_by_paymentdate = request.json_body.get('FilterByPaymentDate', False)
    filter_by_status = request.json_body.get('FilterByStatus', False)
    currency = currencies[DBSession.query(CompanyInformation).first().Currency]

    qry = DBSession.query(Invoice)
    invoices = []
    headings= []
    if filter_by_project and 'Project' in request.json_body:
        projectid = request.json_body['Project']
        node = DBSession.query(Project).filter_by(ID=projectid).first()
        headings.append('Project: ' + node.Name)
        qry = qry.filter_by(ProjectID=projectid)

    if filter_by_supplier and 'Supplier' in request.json_body:
        supplierid = request.json_body['Supplier']
        node = DBSession.query(Supplier).filter_by(ID=supplierid).first()
        headings.append('Supplier: ' + node.Name)
        qry = qry.filter_by(SupplierID=supplierid)

    if filter_by_paymentdate and 'PaymentDate' in request.json_body:
        headings.append('Payment Date: '+ request.json_body['PaymentDate'])
        date = datetime.strptime(request.json_body['PaymentDate'], "%d %B %Y")
        qry = qry.filter_by(PaymentDate=date)

    if filter_by_status and 'Status' in request.json_body:
        headings.append('Status: ' + request.json_body['Status'])
        qry = qry.filter_by(Status=request.json_body['Status'])

    for invoice in qry:
        invoices.append(invoice.dict())

    sorted_invoices = sorted(invoices, key=lambda k: k['ID'])

    # inject invoice data into template
    template_data = render('templates/invoicesreport.pt',
                           {'invoices': sorted_invoices,
                            'report_headings': headings,
                            'currency': currency},
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

@view_config(route_name="claim")
def claim(request):
    logging.info("Generating Claim Report")
    claimid = request.matchdict['id']

    claim = DBSession.query(Claim).filter_by(ID=claimid).first()
    valuation = claim.Valuation
    currency = currencies[DBSession.query(CompanyInformation).first().Currency]

    budget_total = 0
    for valuationitem in valuation.ValuationItems:
        if valuationitem.BudgetGroupTotal:
            budget_total += valuationitem.BudgetGroupTotal

    percentage = '{0:.2f}'.format(float(claim.Total/budget_total)*100).strip()

    payments = []
    due = claim.Total
    paymenttotal = 0
    for payment in claim.Project.Payments:
        due -= payment.Amount
        paymenttotal += payment.Amount
        payments.append(payment)

    vatamount = float(due) * 0.14

    # inject claim data into template
    now = datetime.now()
    date = claim.Date.strftime("%d %B %Y")
    clientid = claim.Project.ClientID
    client = DBSession.query(Client).filter_by(ID=clientid).first()
    template_data = render('templates/claimreport.pt',
                           {'claim': claim,
                            'client': client,
                            'budget_total': budget_total,
                            'date': date,
                            'percentage': percentage,
                            'payments': payments,
                            'due': due,
                            'paymenttotal': paymenttotal,
                            'vatamount': vatamount,
                            'currency': currency},
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

    filename = "claim_report"
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
