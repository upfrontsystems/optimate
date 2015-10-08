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
import xlsxwriter
from xlsxwriter.utility import xl_rowcol_to_cell

from optimate.app.models import (
    DBSession,
    Node,
    BudgetGroup,
    Order,
    OrderItem,
    Valuation,
    ValuationItem,
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
        if child.type == 'BudgetGroup':
            data.append((child, 'level' + str(level), 'bold'))
        else:
            if child.Type in budgetitem_filter:
                data.append((child, 'level' + str(level), 'normal'))
        # if the node has children get the next level
        if len(child.Children) > 0:
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
    projectsubtotal = float(project.Total)
    if print_bgroups:
        projectsubtotal = 0
        bgs = sorted(bgroup_list, key=lambda k: k['Name'].upper())
        for bgroup in bgs:
            bg_id = bgroup['ID']
            qry = DBSession.query(Node).filter_by(ID=bg_id).first()
            projectsubtotal+=float(qry.Total)

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
        if child.type == 'BudgetGroup':
            nodelist.append(child)
    sorted_nodelist = sorted(nodelist, key=lambda k: k.Name.upper())
    for child in sorted_nodelist:
        # apply colour distinction
        tc = 'black';
        oc = 'black';
        ic = 'black';
        if child.Ordered > child.Total:
            oc = 'red';
        if child.Invoiced > child.Total:
            ic = 'red';

        data.append([child, 'level' + str(level), 'normal', tc, oc, ic])
        # go to next level
        if len(child.Children) > 0:
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

            # apply colour distinction
            tc = 'black';
            oc = 'black';
            ic = 'black';
            if qry.Ordered > qry.Total:
                oc = 'red';
            if qry.Invoiced > qry.Total:
                ic = 'red';

            # start at the parent so we can display the context
            nodes.append([qry, 'level1', 'bold', tc, oc, ic])
            # group data
            nodes += costcomparison_nodes(qry, [], 1, level_limit+1)
            # add blank line seperator between groups
            nodes.append(None)
    else:
        nodes = costcomparison_nodes(project, [], 0, level_limit)

    # if the project is approved, get the variation budget items
    if project.Status == 'Approved':
        budgetitems = project.getBudgetItems(variation=True)
        # for each budget item find the first parent budget group
        # and style the parent name
        for budgetitem in budgetitems:
            parent = budgetitem.Parent
            found = False
            while parent.ID !=0 and not found:
                for node in nodes:
                    if node[0].ID == parent.ID:
                        node[1] = str(node[1]) + " red"
                        found = True
                        break
                parent = parent.Parent

    # render template
    now = datetime.now()
    template_data = render('templates/costcomparisonreport.pt',
                           {'nodes': nodes,
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
        # get the resource id
        data = orderitem.dict()
        data['ResourceID'] = orderitem.BudgetItem.ResourceID
        orderitems.append(data)

    # sort by resourceid
    orderitems = sorted(orderitems, key=lambda k: k['ResourceID'])
    consolidated = []
    if len(orderitems) > 0:
        consolidated.append(orderitems.pop(0))
        # loop through the order items that are ordered according to their resource
        backups = []
        for orderitem in orderitems:
            if consolidated[-1]['ResourceID'] == orderitem['ResourceID']:
                # if it is the same budgetitem and rate add the quantities
                if consolidated[-1]['Rate'] == orderitem['Rate']:
                    consolidated[-1]['Quantity'] += orderitem['Quantity']
                    consolidated[-1]['Total'] = float(consolidated[-1]['Total']
                                                ) + float(orderitem['Total'])
                else:
                    # check if the rate is the same as previous items
                    added = False
                    for backup in backups:
                        if backup['Rate'] == orderitem['Rate']:
                            added = True
                            backup['Quantity'] += orderitem['Quantity']
                            backup['Total'] = float(backup['Total']
                                            ) + float(orderitem['Total'])
                            break

                    # if the item doesn't match add it to the backup list
                    if not added:
                        backups.append(orderitem)
            else:
                # a new set of order items with the same resource
                # add the backup list
                for backup in backups:
                    consolidated.append(backup)
                backups[:] = []
                # add the orderitem
                consolidated.append(orderitem)
        for backup in backups:
            consolidated.append(backup)

    orderitems = sorted(consolidated, key=lambda k: k['Name'].upper())

    # inject order data into template
    template_data = render('templates/orderreport.pt',
                           {'order': order,
                            'order_items': orderitems,
                            'order_date': order.Date.strftime("%d %B %Y"),
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
            data = bg.valuation()
            totalbudget = item.BudgetGroupTotal
            if totalbudget is not None:
                totalbudget = str(totalbudget)
            data['TotalBudget'] = totalbudget
            data['AmountComplete'] = str(item.Total)
            data['PercentageComplete'] = item.PercentageComplete
            data['Indent'] = 'level1'
            childrenlist.append(data)
        # get data and append parents valuation items to parent list
        else:
            budget_total += float(item.BudgetGroup.Total)
            data = bg.valuation()
            if len(item.Children) > 0:
                data['expanded'] = True
            data['AmountComplete'] = str(item.Total)
            data['PercentageComplete'] = item.PercentageComplete
            totalbudget = item.BudgetGroupTotal
            if totalbudget is not None:
                totalbudget = str(totalbudget)
            data['TotalBudget'] = totalbudget
            data['Indent'] = 'level0'
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

    taxrate = DBSession.query(CompanyInformation).first().DefaultTaxrate
    vatamount = float(due) * (taxrate/100.0)

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
                            'taxrate': taxrate,
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

@view_config(route_name="cashflow")
def cashflow(request):
    logging.info("Generating cashflow Report")
    projectid = request.matchdict['id']
    project = DBSession.query(Project).filter_by(ID=projectid).first()
    currency = currencies[DBSession.query(CompanyInformation).first().Currency]
    compinfo = DBSession.query(CompanyInformation).first()

    budgetgroupsqry = DBSession.query(BudgetGroup
                                    ).filter_by(ParentID=projectid
                                    ).order_by(BudgetGroup.Name.asc()).all()

    valuations = DBSession.query(Valuation
                                ).filter_by(ProjectID=projectid
                                ).order_by(Valuation.Date.asc()
                                ).order_by(Valuation.ID.asc()).all()

    dateheader = []
    headers = []
    rows = []
    # create a matrix of valuations and valuation items
    if len(valuations) > 0:
        data = []
        budgetgroups = []
        for bg in budgetgroupsqry:
            budgetgroups.append(bg.dict())

        col = 0
        for valuation in valuations:
            column = {}
            column['Valuation'] = valuation.dict()
            items = []
            rootitems = DBSession.query(ValuationItem).filter_by(
                                                    ValuationID=valuation.ID,
                                                    ParentID=0).all()
            if len(rootitems) == len(valuation.ValuationItems):
                items = [v.dict() for v in rootitems]
            else:
                for item in rootitems:
                    data = item.dict()
                    budgettotal = item.BudgetGroup.Total
                    if item.Total > 0:
                        data['PercentageComplete'] = float(item.Total/budgettotal)*100
                    else:
                        data['PercentageComplete'] = 0
                    items.append(data)

            col=1
            column['Items'] = items
            data.append(column)

        # rearange the data into a table
        headers.append('Detail')
        headers.append('Budget Total')
        for column in data:
            headers.append('%')
            headers.append('Amount')
            dateheader.append(column['Valuation']['ReadableDate'])

        for i in range(len(budgetgroups)):
            row = []
            pair = []
            pair.append(budgetgroups[i]['Name'])
            pair.append(budgetgroups[i]['Total'])
            row.append(pair)
            for column in data:
                pair = []
                pair.append(column['Items'][i]['PercentageComplete'])
                pair.append(column['Items'][i]['AmountComplete'])
                row.append(pair)
            rows.append(row)

    # inject valuation data into template
    now = datetime.now()
    today = now.strftime('%D%M%Y')
    clientid = project.Client.ID
    client = project.Client
    template_data = render('templates/cashflowreport.pt',
                           {'project': project,
                            'company_info': compinfo,
                            'today': today,
                            'dateheader': dateheader,
                            'headers': headers,
                            'rows': rows,
                            'client': client,
                            'currency': currency},
                            request=request)
    # render template
    html = StringIO(template_data.encode('utf-8'))

    # fd = open ('test.html', 'w')
    # fd.write (html.getvalue())

    # Generate the pdf
    pdf = StringIO()
    pisadoc = pisa.CreatePDF(html, pdf, raise_exception=False)
    assert pdf.len != 0, 'Pisa PDF generation returned empty PDF!'
    html.close()
    pdfcontent = pdf.getvalue()
    pdf.close()

    filename = "cashflow_report"
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


def add_to_format(existing_format, dict_of_properties, workbook):
    """ Give a format you want to extend and a dict of the properties you want
        to extend it with, and you get them returned in a single format
    """
    new_dict={}
    for key, value in existing_format.__dict__.iteritems():
        if (value != 0) and (value != {}) and (value != None):
            new_dict[key]=value
    del new_dict['escapes']

    return(workbook.add_format(dict(new_dict.items() + dict_of_properties.items())))

def write_budget_data(worksheet, workbook, nodes, row, level, money, bold):
    """ recursively write data to the excel spreadsheet
        keeping track of the indentation level to write the subtotal formula
    """
    # write the data, start from row
    while row < (len(nodes)+4):
        node = nodes[row-4]
        if node:
            currentlevel = int(node[1][-1]) -1
            # current level
            if currentlevel == level:
                # print budget group
                if node[0].type == 'BudgetGroup':
                    budgettotal = add_to_format(money, {'bold': True}, workbook)
                    nameformat = add_to_format(bold, {'indent': currentlevel}, workbook)
                    worksheet.write(row, 0, node[0].Name, nameformat)
                    worksheet.write(row, 4, node[0].Total, budgettotal)
                # print budget items
                else:
                    indent = workbook.add_format()
                    indent.set_indent(currentlevel)
                    textcolor = workbook.add_format()
                    bimoney = money
                    if node[0].Variation:
                        indent = add_to_format(indent, {'font_color': 'red'}, workbook)
                        textcolor.set_font_color('red')
                        bimoney = add_to_format(bimoney, {'font_color': 'red'}, workbook)
                    worksheet.write(row, 0, node[0].Name, indent)
                    worksheet.write(row, 1, node[0].Unit, textcolor)
                    worksheet.write(row, 2, node[0].Quantity, textcolor)
                    worksheet.write(row, 3, node[0].Rate, bimoney)
                    worksheet.write_formula(row, 4, '{=C'+str(row+1)+'*D'+str(row+1)+'}', bimoney)
                row+=1
            # next level
            elif currentlevel > level:
                parentrow = row-1
                row = write_budget_data(worksheet, workbook, nodes, row, currentlevel, money, bold)
                # write the parent subtotal
                budgettotal = add_to_format(money, {'bold': True}, workbook)
                worksheet.write_formula(parentrow, 4, '{=SUBTOTAL(9, E'+str(parentrow+2)+':E'+str(row)+'}', budgettotal)
            # previous level, break
            else:
                break
    return row

@view_config(route_name="excelprojectbudget")
def excelprojectbudget(request):
    logger.info("Generating Excel Project Budget Report")
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
    filename = "project_budget_report"
    nice_filename = '%s_%s' % (filename, now.strftime('%Y%m%d'))
    last_modified = formatdate(time.mktime(now.timetuple()))

    output = StringIO()

    workbook = xlsxwriter.Workbook(output)
    worksheet = workbook.add_worksheet()

    # bold format
    bold = workbook.add_format({'bold': True})
    # currency format
    currencyformat= '"'+currency+'"#,##0.00'
    moneydict = {'num_format':currencyformat}
    money = workbook.add_format(moneydict)
    # bold and currency for budget total
    budgettotal = add_to_format(money, {'bold': True}, workbook)
    # border
    bordertop = workbook.add_format({'top': 1})
    border = add_to_format(bordertop, {'bottom': 1}, workbook)

    worksheet.set_column(0, 0, 45)
    worksheet.set_column(3, 3, 20)
    worksheet.set_column(4, 4, 25)
    worksheet.set_row(0, 20)

    titleformat = add_to_format(bold, {'font_size': 12}, workbook)
    worksheet.write(0, 0, 'Project Budget for ' + project.Name, titleformat)
    worksheet.write(2, 0, 'Description', border)
    worksheet.write(2, 1, 'Unit', border)
    worksheet.write(2, 2, 'Quantity', border)
    worksheet.write(2, 3, 'Rate', border)
    worksheet.write(2, 4, 'Total', border)

    level = 0
    row = 4
    # write the data, start from row 4
    while row < (len(nodes)+4):
        node = nodes[row-4]
        if node:
            currentlevel = int(node[1][-1]) -1
            # current level
            if currentlevel == level:
                # print budget group
                if node[0].type == 'BudgetGroup':
                    nameformat = add_to_format(bold, {'indent': currentlevel}, workbook)
                    worksheet.write(row, 0, node[0].Name, nameformat)
                    worksheet.write(row, 4, node[0].Total, budgettotal)
                # print budget items
                else:
                    indent = workbook.add_format()
                    indent.set_indent(currentlevel)
                    textcolor = workbook.add_format()
                    bimoney = money
                    if node[0].Variation:
                        indent = add_to_format(indent, {'font_color': 'red'}, workbook)
                        textcolor.set_font_color('red')
                        bimoney = add_to_format(bimoney, {'font_color': 'red'}, workbook)
                    worksheet.write(row, 0, node[0].Name, indent)
                    worksheet.write(row, 1, node[0].Unit, textcolor)
                    worksheet.write(row, 2, node[0].Quantity, textcolor)
                    worksheet.write(row, 3, node[0].Rate, bimoney)
                    worksheet.write_formula(row, 4, '{=C'+str(row+1)+'*D'+str(row+1)+'}', bimoney)
                row+=1
            # next level
            elif currentlevel > level:
                parentrow = row-1
                row = write_budget_data(worksheet, workbook, nodes, row, currentlevel, money, bold)
                # write the parent subtotal
                worksheet.write_formula(parentrow, 4, '{=SUBTOTAL(9, E'+str(parentrow+2)+':E'+str(row)+'}', budgettotal)

    boldborder = add_to_format(border, {'bold':True}, workbook)
    worksheet.write(row, 0, 'Subtotal', boldborder)
    worksheet.write(row, 1, '', border)
    worksheet.write(row, 2, '', border)
    worksheet.write(row, 3, '', border)
    moneyborder = add_to_format(border, moneydict, workbook)
    worksheet.write_formula(row, 4, '{=SUBTOTAL(9, E'+str(5)+':E'+str(row)+'}', moneyborder)
    subtotalrow = row
    row+=1

    percentageformat = workbook.add_format({'num_format': 0x0a})
    for markup in markups:
        worksheet.write(row, 0, markup['Name'])
        worksheet.write(row, 3, float(markup['Percentage'])/100.0, percentageformat)
        worksheet.write_formula(row, 4, '{=E'+str(subtotalrow + 1)+'*D'+str(row+1)+'}', money)
        row+=1

    worksheet.write(row, 0, 'Total', boldborder)
    worksheet.write(row, 1, '', border)
    worksheet.write(row, 2, '', border)
    worksheet.write(row, 3, '', border)
    worksheet.write_formula(row, 4, '{=SUM(E'+str(subtotalrow + 1)+':E'+str(row)+')}', moneyborder)
    workbook.close()

    excelcontent = output.getvalue()
    logging.info("excel rendered")

    response = Response(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                        body=excelcontent)
    response.headers.add('Content-Disposition',
                         "attachment; filename=%s.xlsx" % nice_filename)
    response.headers.add('Access-Control-Expose-Headers','Content-Disposition')
    response.headers.add("Content-Length", str(len(excelcontent)))
    response.headers.add('Last-Modified', last_modified)
    response.headers.add("Cache-Control", "no-store")
    response.headers.add("Pragma", "no-cache")

    return response

def write_cost_comparison(worksheet, workbook, nodes, row, level, money):
    """ recursively write data to the excel spreadsheet
        keeping track of the indentation level to write the subtotal formula
    """
    # write the data, start from row
    while row < (len(nodes)+4):
        node = nodes[row-4]
        if node:
            currentlevel = int(node[1][-1]) -1
            # current level
            if currentlevel == level:
                indent = workbook.add_format()
                indent.set_indent(currentlevel)
                if 'red' in node[1]:
                    indent = add_to_format(indent, {'font_color': 'red'}, workbook)
                worksheet.write(row, 0, node[0].Name, indent)
                worksheet.write(row, 1, node[0].Total, money)
                worksheet.write(row, 2, node[0].Ordered, money)
                worksheet.write(row, 3, node[0].Invoiced, money)
                row+=1
            # next level
            elif currentlevel > level:
                parentrow = row-1
                row = write_cost_comparison(worksheet, workbook, nodes, row, currentlevel, money)
                # write the parent subtotal
                worksheet.write_formula(parentrow, 1, '{=SUBTOTAL(9, B'+str(parentrow+2)+':B'+str(row)+'}', money)
                worksheet.write_formula(parentrow, 2, '{=SUBTOTAL(9, C'+str(parentrow+2)+':C'+str(row)+'}', money)
                worksheet.write_formula(parentrow, 3, '{=SUBTOTAL(9, D'+str(parentrow+2)+':D'+str(row)+'}', money)
            # previous level, break
            else:
                break
    return row


@view_config(route_name="excelcostcomparison")
def excelcostcomparison(request):
    logging.info("Generating Excel Cost Comparison Report")
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

            # apply colour distinction
            tc = 'black';
            oc = 'black';
            ic = 'black';
            if qry.Ordered > qry.Total:
                oc = 'red';
            if qry.Invoiced > qry.Total:
                ic = 'red';

            # start at the parent so we can display the context
            nodes.append([qry, 'level1', 'bold', tc, oc, ic])
            # group data
            nodes += costcomparison_nodes(qry, [], 1, level_limit+1)
            # add blank line seperator between groups
            nodes.append(None)
    else:
        nodes = costcomparison_nodes(project, [], 0, level_limit)

    # if the project is approved, get the variation budget items
    if project.Status == 'Approved':
        budgetitems = project.getBudgetItems(variation=True)
        # for each budget item find the first parent budget group
        # and style the parent name
        for budgetitem in budgetitems:
            parent = budgetitem.Parent
            found = False
            while parent.ID !=0 and not found:
                for node in nodes:
                    if node[0].ID == parent.ID:
                        node[1] = str(node[1]) + " red"
                        found = True
                        break
                parent = parent.Parent

    # render template
    now = datetime.now()
    output = StringIO()

    workbook = xlsxwriter.Workbook(output)
    worksheet = workbook.add_worksheet()

    # bold format
    bold = workbook.add_format({'bold': True})
    # currency format
    currencyformat= '"'+currency+'"#,##0.00'
    moneydict = {'num_format':currencyformat}
    money = workbook.add_format(moneydict)
    # bold and currency for budget total
    budgettotal = add_to_format(money, {'bold': True}, workbook)
    # border
    bordertop = workbook.add_format({'top': 1})
    border = add_to_format(bordertop, {'bottom': 1}, workbook)

    worksheet.set_column(0, 0, 45)
    worksheet.set_column(1, 3, 23)
    worksheet.set_row(0, 20)

    titleformat = add_to_format(bold, {'font_size': 12}, workbook)

    worksheet.write(0, 0, 'Cost Comparison for ' + project.Name, titleformat)
    worksheet.write(2, 0, 'Description', border)
    worksheet.write(2, 1, 'Total', border)
    worksheet.write(2, 2, 'Ordered', border)
    worksheet.write(2, 3, 'Invoiced', border)

    row = 4
    level = 0

    # write the data, start from row 4
    while row < (len(nodes)+4):
        node = nodes[row-4]
        if node:
            currentlevel = int(node[1].split()[0][-1]) -1
            # current level
            if currentlevel == level:
                indent = workbook.add_format()
                indent.set_indent(currentlevel)
                if 'red' in node[1]:
                    indent = add_to_format(indent, {'font_color': 'red'}, workbook)
                worksheet.write(row, 0, node[0].Name, indent)
                worksheet.write(row, 1, node[0].Total, money)
                worksheet.write(row, 2, node[0].Ordered, money)
                worksheet.write(row, 3, node[0].Invoiced, money)
                row+=1
            # next level
            elif currentlevel > level:
                parentrow = row-1
                row = write_cost_comparison(worksheet, workbook, nodes, row, currentlevel, money)
                # write the parent subtotal
                worksheet.write_formula(parentrow, 1, '{=SUBTOTAL(9, B'+str(parentrow+2)+':B'+str(row)+'}', money)
                worksheet.write_formula(parentrow, 2, '{=SUBTOTAL(9, C'+str(parentrow+2)+':C'+str(row)+'}', money)
                worksheet.write_formula(parentrow, 3, '{=SUBTOTAL(9, D'+str(parentrow+2)+':D'+str(row)+'}', money)

    redmoney = add_to_format(money, {'font_color': 'red'}, workbook)
    # add conditional format for ordered and invoiced values
    worksheet.conditional_format(5, 2, row+1, 3,
                                    {'type': 'cell',
                                    'criteria': '>',
                                    'value': '$B$5:$B$' + str(row+1),
                                    'format': redmoney})

    workbook.close()

    excelcontent = output.getvalue()
    logging.info("excel rendered")

    filename = "cost_comparison_report"
    nice_filename = '%s_%s' % (filename, now.strftime('%Y%m%d'))
    last_modified = formatdate(time.mktime(now.timetuple()))

    response = Response(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                        body=excelcontent)
    response.headers.add('Content-Disposition',
                         "attachment; filename=%s.xlsx" % nice_filename)
    # needed so that in a cross-domain situation the header is visible
    response.headers.add('Access-Control-Expose-Headers','Content-Disposition')
    response.headers.add("Content-Length", str(len(excelcontent)))
    response.headers.add('Last-Modified', last_modified)
    response.headers.add("Cache-Control", "no-store")
    response.headers.add("Pragma", "no-cache")

    return response


@view_config(route_name="excelresourcelist")
def excelresourcelist(request):
    logging.info("Generating Excel Resource List Report")
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
    output = StringIO()
    workbook = xlsxwriter.Workbook(output)
    worksheet = workbook.add_worksheet()

    # bold format
    bold = workbook.add_format({'bold': True})
    # currency format
    currencyformat= '"'+currency+'"#,##0.00'
    moneydict = {'num_format':currencyformat}
    money = workbook.add_format(moneydict)
    # bold and currency for budget total
    budgettotal = add_to_format(money, {'bold': True}, workbook)
    # border
    bordertop = workbook.add_format({'top': 1})
    border = add_to_format(bordertop, {'bottom': 1}, workbook)
    # number
    numberformat = workbook.add_format({'num_format': 0x00})

    worksheet.set_column(0, 0, 45)
    worksheet.set_column(1, 2, 20)
    worksheet.set_row(0, 20)

    titleformat = add_to_format(bold, {'font_size': 12}, workbook)
    boldborder = add_to_format(border, {'bold': True}, workbook)
    worksheet.write(0, 0, 'Resource List for '+ project.Name + ' ' + filtered_by, titleformat)
    worksheet.write(2, 0, 'Description', boldborder)
    worksheet.write(2, 1, 'Rate',boldborder)
    worksheet.write(2, 2, 'Quantity',boldborder)

    row = 4
    if len(nodes) == 0:
        worksheet.write(row, 0, 'No matching resource data found')
    else:
        for node in nodes:
            indent = workbook.add_format()
            indent.set_indent(int(node[1][-1]) -1)
            if node[2] is 'bold':
                indent = add_to_format(indent, {'bold': True}, workbook)
            worksheet.write(row, 0, node[0].Name, indent)
            if node[0].type != 'ResourceCategory':
                worksheet.write(row, 1, node[0].Rate, money)
                worksheet.write(row, 2, node[3], numberformat)
            row+=1

    workbook.close()

    excelcontent = output.getvalue()
    logging.info("excel rendered")

    filename = "resource_list_report"
    nice_filename = '%s_%s' % (filename, now.strftime('%Y%m%d'))
    last_modified = formatdate(time.mktime(now.timetuple()))
    response = Response(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                        body=excelcontent)
    response.headers.add('Content-Disposition',
                         "attachment; filename=%s.xlsx" % nice_filename)
    # needed so that in a cross-domain situation the header is visible
    response.headers.add('Access-Control-Expose-Headers','Content-Disposition')
    response.headers.add("Content-Length", str(len(excelcontent)))
    response.headers.add('Last-Modified', last_modified)
    response.headers.add("Cache-Control", "no-store")
    response.headers.add("Pragma", "no-cache")

    return response


@view_config(route_name="excelorder")
def excelorder(request):
    logging.info("Generating Excel Order Report")
    orderid = request.matchdict['id']
    order = DBSession.query(Order).filter_by(ID=orderid).first()
    currency = currencies[DBSession.query(CompanyInformation).first().Currency]

    orderitems = []
    for orderitem in order.OrderItems:
        # get the resource id
        data = orderitem.dict()
        data['ResourceID'] = orderitem.BudgetItem.ResourceID
        orderitems.append(data)

    # sort by resourceid
    orderitems = sorted(orderitems, key=lambda k: k['ResourceID'])
    consolidated = []
    if len(orderitems) > 0:
        consolidated.append(orderitems.pop(0))
        # loop through the order items that are ordered according to their resource
        backups = []
        for orderitem in orderitems:
            if consolidated[-1]['ResourceID'] == orderitem['ResourceID']:
                # if it is the same budgetitem and rate add the quantities
                if consolidated[-1]['Rate'] == orderitem['Rate']:
                    consolidated[-1]['Quantity'] += orderitem['Quantity']
                    consolidated[-1]['Total'] = float(consolidated[-1]['Total']
                                                ) + float(orderitem['Total'])
                else:
                    # check if the rate is the same as previous items
                    added = False
                    for backup in backups:
                        if backup['Rate'] == orderitem['Rate']:
                            added = True
                            backup['Quantity'] += orderitem['Quantity']
                            backup['Total'] = float(backup['Total']
                                            ) + float(orderitem['Total'])
                            break

                    # if the item doesn't match add it to the backup list
                    if not added:
                        backups.append(orderitem)
            else:
                # a new set of order items with the same resource
                # add the backup list
                for backup in backups:
                    consolidated.append(backup)
                backups[:] = []
                # add the orderitem
                consolidated.append(orderitem)
        for backup in backups:
            consolidated.append(backup)

    orderitems = sorted(consolidated, key=lambda k: k['Name'].upper())

    # render template
    output = StringIO()

    workbook = xlsxwriter.Workbook(output)
    worksheet = workbook.add_worksheet()

    # bold format
    bold = workbook.add_format({'bold': True})
    # currency format
    currencyformat= '"'+currency+'"#,##0.00'
    moneydict = {'num_format':currencyformat}
    money = workbook.add_format(moneydict)
    # bold and currency for budget total
    boldmoney = add_to_format(money, {'bold': True}, workbook)
    # border
    bordertop = workbook.add_format({'top': 1})
    border = add_to_format(bordertop, {'bottom': 1}, workbook)
    # date
    dateformat = workbook.add_format({'num_format':'dd mmmm yyyy'})
    bolddate = add_to_format(dateformat, {'bold': True}, workbook)
    # number
    numberformat = workbook.add_format({'num_format': 0x00})
    # percentage
    percentageformat = workbook.add_format({'num_format': 0x0a})

    worksheet.set_column(0, 0, 35)
    worksheet.set_column(1, 2, 15)
    worksheet.set_column(3, 7, 20)

    boldborder = add_to_format(border, {'bold': True}, workbook)

    row = 0
    worksheet.write(row, 0, 'To Messers.')
    worksheet.write(row, 1, order.Client.Name, bold)
    worksheet.write(row, 3, 'Order ' + str(order.ID), bold)
    worksheet.write(row, 4, order.Date, bolddate)
    row+=1
    worksheet.write(row, 0, 'Supplier FaxNo')
    worksheet.write(row, 1, order.Supplier.Fax, bold)
    worksheet.write(row, 3, 'Created by')
    row+=1
    worksheet.write(row, 0, 'On behalf of')
    worksheet.write(row, 1, order.Project.Name, bold)
    row+=2
    worksheet.write(row, 0, 'Description', boldborder)
    worksheet.write(row, 1, 'Unit', boldborder)
    worksheet.write(row, 2, 'Quantity', boldborder)
    worksheet.write(row, 3, 'Rate', boldborder)
    worksheet.write(row, 4, 'Subtotal', boldborder)
    worksheet.write(row, 5, 'Discount', boldborder)
    worksheet.write(row, 6, 'VAT', boldborder)
    worksheet.write(row, 7, 'Total', boldborder)
    row+=2
    startrow = row + 1

    for orderitem in orderitems:
        worksheet.write(row, 0, orderitem['Name'])
        worksheet.write(row, 1, orderitem['Unit'])
        worksheet.write(row, 2, orderitem['Quantity'], numberformat)
        worksheet.write(row, 3, float(orderitem['Rate']), money)
        worksheet.write_formula(row, 4, '{=C'+str(row+1)+'*D'+str(row+1)+'}', money)
        worksheet.write(row, 5, float(orderitem['Discount']), money)
        worksheet.write_formula(row, 6, '{=(E'+str(row+1)+'-F'+str(row+1)+')*'+str(orderitem['VAT']/100.0)+'}', money)
        worksheet.write_formula(row, 7, '{=E'+str(row+1)+'-F'+str(row+1)+'+G'+str(row+1)+'}', money)

        row+=1

    row+=1
    worksheet.write(row, 0, 'Authorisation')
    worksheet.write(row, 1, 'Signature: __________________________')
    worksheet.write(row, 6, 'Total cost')
    worksheet.write_formula(row, 7, '{=SUM(H'+str(startrow)+':H'+str(row)+')}', boldmoney)

    workbook.close()

    excelcontent = output.getvalue()
    logging.info("excel rendered")

    filename = "order_report"
    now = datetime.now()
    nice_filename = '%s_%s' % (filename, now.strftime('%Y%m%d'))
    last_modified = formatdate(time.mktime(now.timetuple()))
    response = Response(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                        body=excelcontent)
    response.headers.add('Content-Disposition',
                         "attachment; filename=%s.xlsx" % nice_filename)
    # needed so that in a cross-domain situation the header is visible
    response.headers.add('Access-Control-Expose-Headers','Content-Disposition')
    response.headers.add("Content-Length", str(len(excelcontent)))
    response.headers.add('Last-Modified', last_modified)
    response.headers.add("Cache-Control", "no-store")
    response.headers.add("Pragma", "no-cache")

    return response

@view_config(route_name="excelinvoices")
def excelinvoices(request):
    logging.info("Generating Excel Invoices Report")
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
    # render template
    output = StringIO()

    workbook = xlsxwriter.Workbook(output)
    worksheet = workbook.add_worksheet()

    # bold format
    bold = workbook.add_format({'bold': True})
    # currency format
    currencyformat= '"'+currency+'"#,##0.00'
    moneydict = {'num_format':currencyformat}
    money = workbook.add_format(moneydict)
    # bold and currency for budget total
    boldmoney = add_to_format(money, {'bold': True}, workbook)
    # border
    bordertop = workbook.add_format({'top': 1})
    border = add_to_format(bordertop, {'bottom': 1}, workbook)
    boldborder = add_to_format(border, {'bold': True}, workbook)
    # date
    dateformat = workbook.add_format({'num_format':'dd mmmm yyyy'})
    bolddate = add_to_format(dateformat, {'bold': True}, workbook)
    # number
    numberformat = workbook.add_format({'num_format': 0x00})
    # percentage
    percentageformat = workbook.add_format({'num_format': 0x0a})
    # title
    titleformat = add_to_format(bold, {'font_size': 12}, workbook)
    smallbold = add_to_format(bold, {'font_size': 10}, workbook)

    worksheet.set_column(0, 1, 15)
    worksheet.set_column(2, 2, 40)
    worksheet.set_column(3, 4, 30)
    worksheet.set_column(5, 5, 20)

    worksheet.write(0, 0, 'Invoices report', titleformat)

    row = 2
    for heading in headings:
        worksheet.write(row, 0, heading, smallbold)
        row+=1
    row+=2

    worksheet.write(row, 0, 'Invoice Number', boldborder)
    worksheet.write(row, 1, 'Order Number', boldborder)
    worksheet.write(row, 2, 'Project', boldborder)
    worksheet.write(row, 3, 'Supplier', boldborder)
    worksheet.write(row, 4, 'Invoice Total', boldborder)
    worksheet.write(row, 5, 'Payment Date', boldborder)
    worksheet.write(row, 6, 'Status', boldborder)
    row+=2
    for invoice in sorted_invoices:
        worksheet.write(row, 0, invoice['InvoiceNumber'])
        worksheet.write(row, 1, invoice['OrderID'])
        worksheet.write(row, 2, invoice['Project'])
        worksheet.write(row, 3, invoice['Supplier'])
        worksheet.write(row, 4, float(invoice['Total']), money)
        worksheet.write(row, 5, invoice['ReadablePaymentdate'], dateformat)
        worksheet.write(row, 6, invoice['Status'])
        row+=1

    workbook.close()

    excelcontent = output.getvalue()
    logging.info("excel rendered")

    filename = "invoice_report"
    now = datetime.now()
    nice_filename = '%s_%s' % (filename, now.strftime('%Y%m%d'))
    last_modified = formatdate(time.mktime(now.timetuple()))
    response = Response(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                        body=excelcontent)
    response.headers.add('Content-Disposition',
                         "attachment; filename=%s.xlsx" % nice_filename)
    # needed so that in a cross-domain situation the header is visible
    response.headers.add('Access-Control-Expose-Headers','Content-Disposition')
    response.headers.add("Content-Length", str(len(excelcontent)))
    response.headers.add('Last-Modified', last_modified)
    response.headers.add("Cache-Control", "no-store")
    response.headers.add("Pragma", "no-cache")

    return response

def write_valuation_data(worksheet, workbook, itemlist, row, rowshift, level, money, percentageformat):
    """ recursively write data to the excel spreadsheet
        keeping track of the indentation level to write the subtotal formula
    """
    while row < (len(itemlist)+rowshift):
        item = itemlist[row-rowshift]
        currentlevel = item['Indent']
        # current level
        if currentlevel == level:
            indent = workbook.add_format()
            indent.set_indent(currentlevel)

            worksheet.write(row, 0, item['Name'], indent)
            worksheet.write(row, 1, item['TotalBudget'], money)
            worksheet.write(row, 2, item['PercentageComplete'], percentageformat)
            worksheet.write_formula(row, 3, '{=B'+str(row+1)+'*C'+str(row+1)+'}', money)
            row+=1
        # next level
        elif currentlevel > level:
            parentrow = row-1
            row = write_valuation_data(worksheet, workbook, itemlist, row, rowshift, currentlevel, money, percentageformat)
            # write the parent subtotal
            worksheet.write_formula(parentrow, 3, '{=SUBTOTAL(9, D'+str(parentrow+2)+':D'+str(row)+'}', money)
        # previous level, break
        else:
            break
    return row

@view_config(route_name="excelvaluation")
def excelvaluation(request):
    logging.info("Generating Valuation Excel Report")
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
            data = bg.valuation()
            totalbudget = item.BudgetGroupTotal
            if totalbudget is not None:
                totalbudget = float(totalbudget)
            data['TotalBudget'] = totalbudget
            data['AmountComplete'] = float(item.Total)
            percentagecomp = None
            if item.PercentageComplete is not None:
                percentagecomp = float(item.PercentageComplete)/100
            data['PercentageComplete'] = percentagecomp
            data['Indent'] = 1
            childrenlist.append(data)
        # get data and append parents valuation items to parent list
        else:
            budget_total += float(item.Total)
            data = bg.valuation()
            if len(item.Children) > 0:
                data['expanded'] = True
            data['AmountComplete'] = float(item.Total)
            percentagecomp = None
            if item.PercentageComplete is not None:
                percentagecomp = float(item.PercentageComplete)/100
            data['PercentageComplete'] = percentagecomp
            totalbudget = item.BudgetGroupTotal
            if totalbudget is not None:
                totalbudget = float(totalbudget)
            data['TotalBudget'] = totalbudget
            data['Indent'] = 0
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
    # render template
    output = StringIO()

    workbook = xlsxwriter.Workbook(output)
    worksheet = workbook.add_worksheet()

    # bold format
    bold = workbook.add_format({'bold': True})
    # currency format
    currencyformat= '"'+currency+'"#,##0.00'
    moneydict = {'num_format':currencyformat}
    money = workbook.add_format(moneydict)
    # bold and currency for budget total
    boldmoney = add_to_format(money, {'bold': True}, workbook)
    # border
    bordertop = workbook.add_format({'top': 1})
    border = add_to_format(bordertop, {'bottom': 1}, workbook)
    boldborder = add_to_format(border, {'bold': True}, workbook)
    moneyborder = add_to_format(border, {'num_format':currencyformat}, workbook)
    # date
    dateformat = workbook.add_format({'num_format':'dd mmmm yyyy'})
    bolddate = add_to_format(dateformat, {'bold': True}, workbook)
    boldborderdate = add_to_format(boldborder, {'num_format':'dd mmmm yyyy'}, workbook)
    # number
    numberformat = workbook.add_format({'num_format': 0x00})
    # percentage
    percentageformat = workbook.add_format({'num_format': 0x0a})
    # title
    titleformat = add_to_format(bold, {'font_size': 12}, workbook)
    smallbold = add_to_format(bold, {'font_size': 10}, workbook)

    worksheet.set_column(0, 0, 35)
    worksheet.set_column(1, 1, 20)
    worksheet.set_column(3, 3, 20)

    worksheet.write(0, 0, 'Valuation for Certificate #', bold)

    row = 2
    worksheet.write(row, 0, 'To:')
    worksheet.write(row, 1, client.Name, bold)
    row+=1
    worksheet.write(row, 0, 'Date:')
    worksheet.write(row, 1, valuation.Date, bolddate)
    row+=1
    worksheet.write(row, 0, 'Project')
    worksheet.write(row, 1, valuation.Project.Name, bold)

    row+=2
    worksheet.write(row, 0, 'Details', boldborder)
    worksheet.write(row, 1, valuation.Date, boldborderdate)
    worksheet.write(row, 2, '% Claim', boldborder)
    worksheet.write(row, 3, 'Total', boldborder)
    row+=2

    level = 0
    rowshift = row
    # write the data, start from row
    while row < (len(itemlist)+rowshift):
        item = itemlist[row-rowshift]
        currentlevel = item['Indent']
        # current level
        if currentlevel == level:
            # print parent item
            worksheet.write(row, 0, item['Name'])
            worksheet.write(row, 1, item['TotalBudget'], money)
            worksheet.write(row, 2, item['PercentageComplete'], percentageformat)
            worksheet.write_formula(row, 3, '{=B'+str(row+1)+'*C'+str(row+1)+'}', money)
            row+=1
        # next level
        elif currentlevel > level:
            parentrow = row-1
            row = write_valuation_data(worksheet, workbook, itemlist, row, rowshift, currentlevel, money, percentageformat)
            # write the parent subtotal
            worksheet.write_formula(parentrow, 3, '{=SUBTOTAL(9, D'+str(parentrow+2)+':D'+str(row)+'}', money)

    row+=1
    subtotalrow = row
    worksheet.write(row, 0, 'Subtotal', border)
    worksheet.write_formula(row, 1, '{=SUM(B'+str(rowshift+1) + ':B'+str(row)+')}', moneyborder)
    worksheet.write(row, 2, '', border)
    worksheet.write_formula(row, 3, '{=SUM(D'+str(rowshift+1) + ':D'+str(row)+')}', moneyborder)
    row+=1

    for markup in markup_list:
        worksheet.write(row, 0, markup['Name'])
        worksheet.write(row, 1, float(markup['TotalBudget']), money)
        worksheet.write(row, 2, markup['PercentageComplete']/100, percentageformat)
        worksheet.write_formula(row, 3, '{=B'+str(row+1)+'*C'+str(row+1)+'}', money)
        row+=1

    row+=1
    worksheet.write(row, 0, 'Total', border)
    worksheet.write(row, 1, '', border)
    worksheet.write(row, 2, '', border)
    worksheet.write_formula(row, 3, '{=SUM(D'+str(subtotalrow+1) + ':D'+str(row)+')}', moneyborder)

    workbook.close()

    excelcontent = output.getvalue()
    logging.info("excel rendered")

    filename = "valuation_report"
    nice_filename = '%s_%s' % (filename, now.strftime('%Y%m%d'))
    last_modified = formatdate(time.mktime(now.timetuple()))
    response = Response(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                        body=excelcontent)
    response.headers.add('Content-Disposition',
                         "attachment; filename=%s.xlsx" % nice_filename)
    # needed so that in a cross-domain situation the header is visible
    response.headers.add('Access-Control-Expose-Headers','Content-Disposition')
    response.headers.add("Content-Length", str(len(excelcontent)))
    response.headers.add('Last-Modified', last_modified)
    response.headers.add("Cache-Control", "no-store")
    response.headers.add("Pragma", "no-cache")

    return response


@view_config(route_name="excelclaim")
def excelclaim(request):
    logging.info("Generating Excel Claim Report")
    claimid = request.matchdict['id']

    claim = DBSession.query(Claim).filter_by(ID=claimid).first()
    valuation = claim.Valuation
    currency = currencies[DBSession.query(CompanyInformation).first().Currency]

    budget_total = 0
    for valuationitem in valuation.ValuationItems:
        if valuationitem.BudgetGroupTotal:
            budget_total += valuationitem.BudgetGroupTotal

    payments = []
    for payment in claim.Project.Payments:
        payments.append(payment)

    taxrate = DBSession.query(CompanyInformation).first().DefaultTaxrate/100.0
    now = datetime.now()
    clientid = claim.Project.ClientID
    client = DBSession.query(Client).filter_by(ID=clientid).first()

    # render template
    output = StringIO()

    workbook = xlsxwriter.Workbook(output)
    worksheet = workbook.add_worksheet()

    # bold format
    bold = workbook.add_format({'bold': True})
    # currency format
    currencyformat= '"'+currency+'"#,##0.00'
    moneydict = {'num_format':currencyformat}
    money = workbook.add_format(moneydict)
    # bold and currency for budget total
    boldmoney = add_to_format(money, {'bold': True}, workbook)
    # border
    bordertop = workbook.add_format({'top': 1})
    border = add_to_format(bordertop, {'bottom': 1}, workbook)
    boldborder = add_to_format(border, {'bold': True}, workbook)
    moneyborder = add_to_format(border, {'num_format':currencyformat}, workbook)
    # date
    dateformat = workbook.add_format({'num_format':'dd mmmm yyyy'})
    bolddate = add_to_format(dateformat, {'bold': True}, workbook)
    boldborderdate = add_to_format(boldborder, {'num_format':'dd mmmm yyyy'}, workbook)
    # number
    numberformat = workbook.add_format({'num_format': 0x00})
    # percentage
    percentageformat = workbook.add_format({'num_format': 0x0a})
    percentageborder = add_to_format(border, {'num_format': 0x0a}, workbook)
    # title
    titleformat = add_to_format(bold, {'font_size': 12}, workbook)
    smallbold = add_to_format(bold, {'font_size': 10}, workbook)

    worksheet.set_column(0, 0, 30)
    worksheet.set_column(1, 3, 25)

    worksheet.write(0, 0, 'Pro Forma Claim', bold)

    row = 2
    worksheet.write(row, 0, 'To:')
    worksheet.write(row, 1, client.Name, bold)
    row+=1
    worksheet.write(row, 0, 'Date:')
    worksheet.write(row, 1, claim.Date, bolddate)
    row+=1
    worksheet.write(row, 0, 'Project')
    worksheet.write(row, 1, claim.Project.Name, bold)

    row+=2
    worksheet.write(row, 0, 'Details of this payment certificate')
    row+=1
    worksheet.write(row, 0, 'ITEM', boldborder)
    worksheet.write(row, 1, 'QUANTITY', boldborder)
    worksheet.write(row, 2, 'RATE', boldborder)
    worksheet.write(row, 3, 'TOTALS', boldborder)
    row+=2
    worksheet.write(row, 0, 'Progress Payment')
    worksheet.write(row, 1, budget_total, money)
    worksheet.write_formula(row, 2, '{=D'+str(row+1)+'/B'+str(row+1)+'}', percentageformat)
    worksheet.write(row, 3, claim.Total, money)
    row+=2
    worksheet.write(row, 0, 'SUBTOTAL: This claim', border)
    worksheet.write(row, 1, '', border)
    worksheet.write(row, 2, '', border)
    worksheet.write_formula(row, 3, '{=D'+str(row-1)+'}', moneyborder)
    subtot = row + 1
    row+=1
    worksheet.write(row, 0, 'Amounts of previous certificates excluding tax')
    row+=1
    prevclaims = row + 1

    for payment in payments:
        worksheet.write(row, 0, 'Payment ' + str(payment.ID))
        worksheet.write(row, 1, -1, numberformat)
        worksheet.write(row, 2, payment.Amount, money)
        worksheet.write_formula(row, 3, '{=B'+str(row+1)+'*C'+str(row+1)+'}', money)
        row+=1

    row+=1
    worksheet.write(row, 0, 'SUBTOTAL: Previous claims', border)
    worksheet.write(row, 1, '', border)
    worksheet.write(row, 2, '', border)
    worksheet.write_formula(row, 3, '{=SUM(C'+str(prevclaims)+':C'+str(row-1)+')}', moneyborder)
    row+=1
    worksheet.write(row, 0, 'SUBTOTAL: This claim LESS Previous claims')
    worksheet.write(row, 1, '', border)
    worksheet.write(row, 2, '', border)
    worksheet.write_formula(row, 3, '{=D'+str(subtot)+'-D'+str(row)+'}', moneyborder)
    row+=1
    worksheet.write(row, 0, 'VALUE ADDED TAX', border)
    worksheet.write_formula(row, 1, '{=D'+str(row)+'}', moneyborder)
    worksheet.write(row, 2, taxrate, percentageborder)
    worksheet.write_formula(row, 3, '{=B'+str(row+1)+'*C'+str(row+1)+'}', moneyborder)
    row+=1
    worksheet.write(row, 0, 'TOTAL DUE AS PER THIS CERTIFICATE', border)
    worksheet.write(row, 1, '', border)
    worksheet.write(row, 2, '', border)
    worksheet.write_formula(row, 3, '{=D'+str(row-1)+'+D'+str(row)+'}', moneyborder)

    workbook.close()

    excelcontent = output.getvalue()
    logging.info("excel rendered")

    filename = "claim_report"
    nice_filename = '%s_%s' % (filename, now.strftime('%Y%m%d'))
    last_modified = formatdate(time.mktime(now.timetuple()))
    response = Response(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                        body=excelcontent)
    response.headers.add('Content-Disposition',
                         "attachment; filename=%s.xlsx" % nice_filename)
    # needed so that in a cross-domain situation the header is visible
    response.headers.add('Access-Control-Expose-Headers','Content-Disposition')
    response.headers.add("Content-Length", str(len(excelcontent)))
    response.headers.add('Last-Modified', last_modified)
    response.headers.add("Cache-Control", "no-store")
    response.headers.add("Pragma", "no-cache")

    return response

@view_config(route_name="excelcashflow")
def excelcashflow(request):
    logging.info("Generating cash flow Excel Report")
    projectid = request.matchdict['id']
    project = DBSession.query(Project).filter_by(ID=projectid).first()
    currency = currencies[DBSession.query(CompanyInformation).first().Currency]

    # inject valuation data into template
    now = datetime.now()
    clientid = project.ClientID
    client = DBSession.query(Client).filter_by(ID=clientid).first()
    # render template
    output = StringIO()

    workbook = xlsxwriter.Workbook(output)
    worksheet = workbook.add_worksheet()

    # bold format
    bold = workbook.add_format({'bold': True})
    # currency format
    currencyformat= '"'+currency+'"#,##0.00'
    moneydict = {'num_format':currencyformat}
    money = workbook.add_format(moneydict)
    # bold and currency for budget total
    boldmoney = add_to_format(money, {'bold': True}, workbook)
    # border
    bordertop = workbook.add_format({'top': 1})
    border = add_to_format(bordertop, {'bottom': 1}, workbook)
    boldborder = add_to_format(border, {'bold': True}, workbook)
    moneyborder = add_to_format(border, {'num_format':currencyformat}, workbook)
    # date
    dateformat = workbook.add_format({'num_format':'dd mmmm yyyy'})
    bolddate = add_to_format(dateformat, {'bold': True}, workbook)
    boldborderdate = add_to_format(boldborder, {'num_format':'dd mmmm yyyy'}, workbook)
    # number
    numberformat = workbook.add_format({'num_format': 0x00})
    # percentage
    percentageformat = workbook.add_format({'num_format': 0x0a})
    boldborderpercentage = add_to_format(boldborder, {'num_format': 0x0a}, workbook)
    # title
    titleformat = add_to_format(bold, {'font_size': 12}, workbook)
    smallbold = add_to_format(bold, {'font_size': 10}, workbook)

    worksheet.set_column(0, 0, 10)
    worksheet.set_column(1, 1, 35)
    worksheet.set_column(2, 2, 20)

    worksheet.write(0, 0, 'Project Cashflow Projection', bold)

    row = 2
    worksheet.write(row, 0, 'To:')
    worksheet.write(row, 1, client.Name, bold)
    worksheet.write(row, 3, 'TRE Bank Details', bold)
    compinfo = DBSession.query(CompanyInformation).first()
    row+=2
    worksheet.write(row, 0, 'Date:')
    worksheet.write(row, 1, datetime.now(), bolddate)
    worksheet.write(row, 3, 'Bank')
    worksheet.write(row, 4, compinfo.BankName, bold)
    row+=1
    worksheet.write(row, 0, 'Project:')
    worksheet.write(row, 1, project.Name, bold)
    worksheet.write(row, 3, 'Bank Code:')
    worksheet.write(row, 4, compinfo.BranchCode, bold)
    row+=1
    worksheet.write(row, 3, 'Account:')
    worksheet.write(row, 4, compinfo.AccountName, bold)
    row+=1
    worksheet.write(row, 3, 'Account No:')
    worksheet.write(row, 4, compinfo.AccountNo, bold)
    row+=1
    worksheet.write(row, 3, 'TRE VAT no:')
    row+=1
    worksheet.write(row, 3, 'Client VAT no:')
    worksheet.write(row,4, client.VAT, bold)

    compvat = compinfo.DefaultTaxrate

    row+=3
    headerrow = row
    worksheet.write(row, 1, 'Details', boldborder)
    worksheet.write(row, 2, 'Budget', boldborder)

    valuations = DBSession.query(Valuation
                                ).filter_by(ProjectID=projectid
                                ).order_by(Valuation.Date.asc()
                                ).order_by(Valuation.ID.asc()).all()
    # list the budget groups
    budgetgroups = DBSession.query(BudgetGroup
                                    ).filter_by(ParentID=projectid
                                    ).order_by(BudgetGroup.Name.asc()).all()
    row+=2
    for bg in budgetgroups:
        worksheet.write(row, 1, bg.Name)
        worksheet.write(row, 2, bg.Total, money)
        row+=1
    worksheet.write_formula(row, 2, '{=SUM(C'+str(headerrow+3)+':C'+str(row)+')}', boldmoney)

    col = 3
    for valuation in valuations:
        worksheet.set_column(col, col, 10)
        worksheet.set_column(col+1, col+1, 20)
        row = headerrow
        worksheet.write(row-1, col+1, valuation.Date, dateformat)
        worksheet.write(row, col, '%', boldborderpercentage)
        worksheet.write(row, col + 1, 'Amount',boldborder)
        row+=2

        # condense the expanded valuation items into a list of
        # the first level budget groups
        valuationitems = []
        rootitems = DBSession.query(ValuationItem).filter_by(
                                                    ValuationID=valuation.ID,
                                                    ParentID=0).all()
        if len(rootitems) == len(valuation.ValuationItems):
            valuationitems = [v.dict() for v in rootitems]
        else:
            for item in rootitems:
                data = item.dict()
                budgettotal = item.BudgetGroup.Total
                if item.Total > 0:
                    data['PercentageComplete'] = float(item.Total/budgettotal)*100
                else:
                    data['PercentageComplete'] = 0
                valuationitems.append(data)

        valuationitems = sorted(valuationitems, key=lambda k: k['Name'].upper())

        for item in valuationitems:
            worksheet.write(row, col, item['PercentageComplete']/100, percentageformat)
            cell = xl_rowcol_to_cell(row, col)
            worksheet.write_formula(row, col + 1, '{=C' + str(row+1)+'*' + cell+'}', money)
            row+=1

        cellc = xl_rowcol_to_cell(row, col+1)
        worksheet.write_formula(row, col, '{='+cellc+'/C'+str(row+1)+'}', percentageformat)
        cells = xl_rowcol_to_cell(headerrow+2, col+1)
        celle = xl_rowcol_to_cell(row-1, col+1)
        worksheet.write_formula(row, col+1, '{=SUM('+cells+':'+celle+')}', boldmoney)
        cellr = xl_rowcol_to_cell(row, col+1)
        worksheet.write_formula(row+2, col+1, '{='+cellr+'}', money)
        cellv = xl_rowcol_to_cell(row+2, col+1)
        worksheet.write_formula(row+3, col+1, '{='+cellv+'*'+str(compvat/100)+'}', money)
        cellt = xl_rowcol_to_cell(row+3, col+1)
        worksheet.write_formula(row+4, col+1, '{='+cellv+'+'+cellt+'}', money)
        col+=2

    row+=2
    worksheet.write(row, 1, 'Total cost excl VAT')
    row+=1
    worksheet.write(row, 1, 'VAT @ ' + str(compvat))
    row+=1
    worksheet.write(row, 1, 'Total cost excl VAT')

    workbook.close()

    excelcontent = output.getvalue()
    logging.info("excel rendered")

    filename = "cashflow_report"
    nice_filename = '%s_%s' % (filename, now.strftime('%Y%m%d'))
    last_modified = formatdate(time.mktime(now.timetuple()))
    response = Response(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                        body=excelcontent)
    response.headers.add('Content-Disposition',
                         "attachment; filename=%s.xlsx" % nice_filename)
    # needed so that in a cross-domain situation the header is visible
    response.headers.add('Access-Control-Expose-Headers','Content-Disposition')
    response.headers.add("Content-Length", str(len(excelcontent)))
    response.headers.add('Last-Modified', last_modified)
    response.headers.add("Cache-Control", "no-store")
    response.headers.add("Pragma", "no-cache")

    return response
