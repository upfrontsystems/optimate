# -*- coding: utf-8 -*-
"""
views uses pyramid and sqlalchemy to recieve requests from a user
and send responses with appropriate data
"""

import json
import transaction
import re
from datetime import datetime
from pyramid.view import view_config
from decimal import Decimal
from sqlalchemy.sql import collate
from sqlalchemy.orm.exc import NoResultFound
from sqlalchemy import func
from sqlalchemy.orm import aliased

from pyramid.httpexceptions import (
    HTTPOk,
    HTTPFound,
    HTTPNotFound,
    HTTPInternalServerError,
    HTTPMethodNotAllowed,
    HTTPBadRequest,
    HTTPUnauthorized,
    HTTPConflict,
    HTTPForbidden
)

from optimate.app.security import create_token
from optimate.app.security import Administrator, Manager, ProtectedFunction
from optimate.app.models import (
    DBSession,
    Node,
    Project,
    BudgetGroup,
    BudgetItem,
    SimpleBudgetItem,
    ResourceType,
    ResourceCategory,
    Resource,
    ResourceUnit,
    ResourcePart,
    Unit,
    City,
    Overhead,
    Client,
    Supplier,
    CompanyInformation,
    User,
    Order,
    OrderItem,
    Invoice,
    Valuation,
    ValuationItem,
    Claim,
    Payment,
    UserRight,
    ValuationMarkup
)

# the categories the resources fall into
resourcecatlist = {"A-B": ("A-B"),
                    "C-D": ("C-D"),
                    "E-F": ("E-F"),
                    "G-H": ("G-H"),
                    "I-J": ("I-J"),
                    "K-L": ("K-L"),
                    "M-N": ("M-N"),
                    "O-P": ("O-P"),
                    "Q-R": ("Q-R"),
                    "S-T": ("S-T"),
                    "U-V": ("U-V"),
                    "W-X-Y-Z": ("W-X-Y-Z")}

def sortResource(rcat, categoryName):
    """ Given the Resource List id and original Category name,
        return the id of the ResourceCategory the Resource should be listed in
    """
    while rcat.Parent.type != 'Project':
        rcat = rcat.Parent

    parentCategoryId =rcat.ID
    if categoryName == rcat.Name:
        return parentCategoryId

    category = DBSession.query(ResourceCategory).filter_by(
                    ParentID=parentCategoryId, Name=categoryName).first()
    # if the category already exists, return its id, otherwise create it
    if not category:
        original = DBSession.query(ResourceCategory).filter_by(
                    Name=categoryName).first()
        category = original.copy(parentCategoryId)
        DBSession.add(category)
        DBSession.flush()
    return category.ID

def expandBudgetItem(nodeid, resource):
    """ Add a budgetitem to the existing budgetitem for each
        ResourceUnit in the referenced ResourceUnit
    """
    for part in resource.Children:
        childresource = part.Resource
        node = BudgetItem(ParentID=nodeid,
                        ResourceID=childresource.ID)
        DBSession.add(node)
        DBSession.flush()
        if childresource.type == 'ResourceUnit':
            expandBudgetItem(node.ID, childresource)


@view_config(route_name='options', renderer='json')
def options_view(request):
    """ This view will be called for all OPTIONS requests. """
    return {"success": True}


@view_config(route_name='auth', renderer='json')
def auth(request):
    """ Implements a kind of auth service.
        1. Must be a POST
        2. json encoded username and password
        3. username and password fields on json_body

        We return a token.
    """
    if request.method != 'POST':
        return HTTPMethodNotAllowed(
            'This endpoint only supports the POST method.')

    username = request.json_body.get('username', None)
    password = request.json_body.get('password', None)
    if username is None or password is None:
        return HTTPBadRequest('Username and password must be provided')

    request.response.headerlist.extend((
        ('Cache-Control', 'no-store'),
        ('Pragma', 'no-cache')))

    try:
        user = DBSession().query(User).filter(User.username==username).one()
    except NoResultFound:
        return HTTPUnauthorized('Authentication failed')
    else:
        if not user.validate_password(password):
            return HTTPUnauthorized('Authentication failed')

    return {
        "access_token": create_token(request, username,
            user.roles and json.loads(user.roles) or [])
    }


@view_config(route_name="rootview", renderer='json', permission='view')
@view_config(route_name="node_children", renderer='json', permission='view')
def node_children(request):
    """ This view is for when the user requests the children of an item.
        The parent's id is derived from the path of the request,
        or if there is no id in the path the root id '0' is assumed.
        It extracts the children from the object,
        adds it to a list and returns it to the JSON renderer
        in a format that is acceptable to angular.treeview
    """

    parentid = 0
    if 'parentid' in request.matchdict:
        parentid = request.matchdict['parentid']
    childrenlist = []
    resourcecategories = []

    qry = DBSession.query(Node).filter_by(ID=parentid).first()
    # build the list and only get the neccesary values
    if qry:
        for child in qry.Children:
            if child.type == 'ResourceCategory':
                resourcecategories.append(child.dict())
            else:
                childrenlist.append(child.dict())
    else:
        return HTTPInternalServerError("Node does not exist")

    # sort childrenlist
    sorted_childrenlist = sorted(childrenlist, key=lambda k: k['Name'].upper())
    # sort categories
    sorted_categories = sorted(resourcecategories, key=lambda k: k['Name'].upper())
    completelist = sorted_categories + sorted_childrenlist

    return completelist


@view_config(route_name="nodeview", renderer='json', permission='view')
def nodeview(request):
    """ Manage single operations on a node
        The operation is determined by the HTTP method
    """
    if request.method == 'POST':
        if not request.has_permission('edit'):
            return HTTPForbidden()
        # add a node
        return additemview(request)

    if request.method == 'PUT':
        if not request.has_permission('edit'):
            return HTTPForbidden()
        # edit a node
        return edititemview(request)

    if request.method == 'DELETE':
        if not request.has_permission('edit'):
            return HTTPForbidden()
        # delete a node
        return deleteitemview(request)

    # otherwise return the node
    nodeid = request.matchdict['id']
    qry = DBSession.query(Node).filter_by(ID=nodeid).first()
    if qry:
        return qry.dict()
    else:
        return HTTPNotFound()


def additemview(request):
    """ The additemview is called when a POST request is sent from the client.
        The method adds a new node with attributes as specified by the user
        to the current node.
    """
    # Get the parent to add the object to from the path
    parentid = int(request.matchdict['id'])
    # Get the data to be added to the new object from the request body
    desc = request.json_body.get('Description', '')
    rate = request.json_body.get('Rate', 0)
    rate = Decimal(rate).quantize(Decimal('.01'))
    unit = request.json_body.get('UnitID', '')
    objecttype = request.json_body['NodeType']
    city = request.json_body.get('City', '')
    client = request.json_body.get('Client', '')
    siteaddress = request.json_body.get('SiteAddress', '')
    filenumber = request.json_body.get('FileNumber', '')
    supplier = request.json_body.get('Supplier', '')
    # make sure the parent total is set
    parent = DBSession.query(Node).filter_by(ID=parentid).first()
    parent.Total

    # Determine the type of object to be added and build it
    if objecttype == 'Project':
        newnode = Project(Name=request.json_body['Name'],
                        Description=desc,
                        ClientID=client,
                        CityID=city,
                        SiteAddress=siteaddress,
                        FileNumber=filenumber,
                        ParentID=parentid)
        DBSession.add(newnode)
        DBSession.flush()
        newid = newnode.ID
        # Automatically add a Resource Category to a new Project
        newresourcecat = ResourceCategory(Name='Resource List',
                                        Description='List of Resources',
                                        ParentID=newid)
        DBSession.add(newresourcecat)

    elif objecttype == 'BudgetGroup':
        newnode = BudgetGroup(Name=request.json_body['Name'],
                        Description=desc,
                        ParentID=parentid)
        DBSession.add(newnode)

    # it's already determined by the ui whether a budgetitem
    # or simple budgetitem is being added
    elif objecttype == 'BudgetItem':
        uid = request.json_body['ResourceID']
        quantity = float(request.json_body.get('Quantity', 0))
        # check the resource exists
        resource = DBSession.query(Resource).filter_by(ID=uid).first()
        if not resource:
            return HTTPInternalServerError("No Resource for the Budget Item")
        newnode = BudgetItem(ResourceID=resource.ID,
                        ParentID=parentid)
        # get the list of overheads used in the checkboxes
        checklist = request.json_body['OverheadList']
        for record in checklist:
            if record['selected']:
                overheadid = record['ID']
                overhead = DBSession.query(
                            Overhead).filter_by(ID=overheadid).first()
                newnode.Overheads.append(overhead)
        DBSession.add(newnode)
        DBSession.flush()
        # if the budgetitem references a resource unit
        # expand the budgetitem and add children
        if resource.type == 'ResourceUnit':
            expandBudgetItem(newnode.ID, resource)
        # set the node's quantity
        # this will set it's total and the quantity of any children it may have
        newnode.Quantity=quantity

    elif objecttype == 'SimpleBudgetItem':
        rate = request.json_body.get('Rate', 0)
        rate = Decimal(rate).quantize(Decimal('.01'))
        quantity = float(request.json_body.get('Quantity', 0))

        newnode = SimpleBudgetItem(
            ParentID=parentid,
            Name=request.json_body['Name'],
            Description=request.json_body.get('Description', None),
            _Quantity=quantity,
            _Rate=rate,
            Type=request.json_body['ResourceTypeID'])
        DBSession.add(newnode)
        # add it to the parent's total
        if parent.type != 'BudgetItem':
            parent.Total += newnode.Total

    elif objecttype == 'ResourceCategory':
        newnode = ResourceCategory(Name=request.json_body['Name'],
                        Description=desc,
                        ParentID=parentid)
        DBSession.add(newnode)

    elif objecttype == 'Resource' or objecttype == 'ResourceUnit':
        resourcetype = request.json_body['ResourceTypeID']
        name =  request.json_body['Name']

        if objecttype == 'Resource':
            newnode = Resource(Name=name,
                            Description = desc,
                            UnitID=unit,
                            Type=resourcetype,
                            SupplierID=supplier,
                            _Rate= rate,
                            ParentID=parentid)
        else:
            newnode = ResourceUnit(Name=name,
                            Description = desc,
                            UnitID=unit,
                            Type=resourcetype,
                            SupplierID=supplier,
                            ParentID=parentid)

        DBSession.add(newnode)
        DBSession.flush()
        newid = newnode.ID
        # generate a code for the resource
        if len(name) < 3:
            name = name.upper() + (3-len(name))*'X'
        else:
            name = name[:3].upper()
        numerseq = '0'*(4-len(str(newid))) + str(newid)
        newnode.Code = name+numerseq

    elif objecttype == 'ResourcePart':
        uid = request.json_body['ResourceID']
        quantity = float(request.json_body.get('Quantity', 0))
        # check the resource exists
        resource = DBSession.query(Resource).filter_by(ID=uid).first()
        if not resource:
            return HTTPInternalServerError("The resource does not exist")
        # make sure the parent rate is set
        parent.Rate
        newnode = ResourcePart(ResourceID=uid,
                                _Quantity=quantity,
                                ParentID=parentid)
        DBSession.add(newnode)
        # add a new budgetitem to the budgetitem that references the
        # parent of this resourcePart
        parentresource = DBSession.query(ResourceUnit
                                            ).filter_by(ID=parentid).first()
        for budgetitem in parentresource.BudgetItems:
            newbudgetitem = BudgetItem(ParentID=budgetitem.ID,
                                        ResourceID=uid)
            DBSession.add(newbudgetitem)
            DBSession.flush()
            if resource.type == 'ResourceUnit':
                expandBudgetItem(newbudgetitem.ID, resource)
            newbudgetitem.Quantity = budgetitem.Quantity * quantity
        # update the parent ResourceUnit total
        parent.Rate += newnode.Total

    else:
        return HTTPInternalServerError()

    DBSession.flush()
    newid = newnode.ID
    newdata = newnode.dict()
    # return the id and the new data
    return {'ID': newid, 'node': newdata}


def edititemview(request):
    """ The edittemview is called when a PUT request is sent from the client.
        The method updates the specified node with properties as specified by the user.
    """
    nodeid = request.matchdict['id']
    objecttype = request.json_body['NodeType']

    # Determine the type of object to be edited
    if objecttype == 'Project':
        city = request.json_body.get('City', '')
        client = request.json_body.get('Client', '')
        siteaddress = request.json_body.get('SiteAddress', '')
        filenumber = request.json_body.get('FileNumber', '')
        project = DBSession.query(Project).filter_by(ID=nodeid).first()
        project.Name= request.json_body['Name']
        project.Description=request.json_body.get('Description', '')
        project.ClientID=client
        project.CityID=city
        project.SiteAddress=siteaddress
        project.FileNumber=filenumber
        project.Status = request.json_body['Status']

    elif objecttype == 'BudgetGroup':
        budgetgroup = DBSession.query(BudgetGroup).filter_by(ID=nodeid).first()
        budgetgroup.Name= request.json_body['Name']
        budgetgroup.Description= request.json_body.get('Description', '')

    elif objecttype == 'BudgetItem':
        uid = request.json_body['ResourceID']
        bi = DBSession.query(BudgetItem).filter_by(ID=nodeid).first()

        # if a different resource is used, get the new resource
        if bi.Resource.ID != uid:
            # A different resource was linked to this bi
            rootparentid = bi.getProjectID()
            resourcecategory = DBSession.query(
                ResourceCategory).filter_by(
                ParentID=rootparentid).first()
            reslist = resourcecategory.getResources()
            assert uid in [x.ID for x in reslist], "Invalid resource id"
            bi.ResourceID = uid

            # if the budgetitem references a resource unit
            # expand the budgetitem and add children
            resource = DBSession.query(Resource).filter_by(ID=uid).first()
            if resource.type == 'ResourceUnit':
                expandBudgetItem(bi.ID, resource)

        bi.Overheads[:] = []

        # get the list of overheads used in the checkboxes
        checklist = request.json_body['OverheadList']
        newoverheads = []
        for record in checklist:
            if record['selected']:
                overheadid = record['ID']
                overhead = DBSession.query(Overhead).filter_by(
                                                        ID=overheadid).first()
                newoverheads.append(overhead)
        bi.Overheads = newoverheads
        bi.Quantity=float(request.json_body.get('Quantity', 0))

    elif objecttype == 'SimpleBudgetItem':
        rate = request.json_body.get('Rate', 0)
        rate = Decimal(rate).quantize(Decimal('.01'))
        simbi = DBSession.query(SimpleBudgetItem).filter_by(
                                                        ID=nodeid).first()
        simbi.Name = request.json_body['Name']
        simbi.Description = request.json_body.get('Description','')
        simbi.Rate=rate
        simbi.Type=request.json_body['ResourceType']
        simbi.Quantity=float(request.json_body.get('Quantity', 0))

    elif objecttype == 'ResourceCategory':
        resourcecategory = DBSession.query(ResourceCategory).filter_by(ID=nodeid).first()
        resourcecategory.Name= request.json_body['Name']
        resourcecategory.Description=request.json_body.get('Description', '')

    elif objecttype == 'Resource':
        rate = request.json_body.get('Rate', 0)
        rate = Decimal(rate).quantize(Decimal('.01'))
        unit = request.json_body['UnitID']
        supplier = request.json_body.get('Supplier', '')
        resource = DBSession.query(Resource).filter_by(ID=nodeid).first()
        resource.Description=request.json_body.get('Description', '')
        resource.Code = request.json_body['Code']
        resource.Rate=rate
        resource.UnitID=request.json_body.get('Unit', '')
        resource.Type=request.json_body['ResourceTypeID']
        resource.UnitID=unit
        resource.SupplierID=supplier
        resource.Name=request.json_body['Name']

    elif objecttype == 'ResourceUnit':
        runit = DBSession.query(ResourceUnit).filter_by(ID=nodeid).first()
        runit.Type = request.json_body['ResourceTypeID']
        runit.Description=request.json_body.get('Description', '')
        runit.UnitID = request.json_body.get('UnitID', '')
        runit.SupplierID=request.json_body.get('Supplier', '')
        rate = request.json_body.get('Rate', 0)
        rate = Decimal(rate).quantize(Decimal('.01'))
        runit.Rate = rate
        runit.Name = request.json_body['Name']

    elif objecttype == 'ResourcePart':
        rpart = DBSession.query(ResourcePart).filter_by(ID=nodeid).first()
        rpart.Quantity = float(request.json_body.get('Quantity', 0))
        uid = request.json_body['ResourceID']
        # if the resourcepart references a different resource update
        # the budgetitems
        if rpart.ResourceID != uid:
            parentresource = rpart.Parent
            for budgetitem in parentresource.BudgetItems:
                if budgetitem.ResourceID == rpart.ResourceID:
                    newbudgetitem = budgetitem.copy(budgetitem.ParentID)
                    newbudgetitem.ResourceID = uid
                    DBSession.add(newbudgetitem)
                    DBSession.flush()
                    # if the changed resource is a resource unit
                    cres = DBSession.query(Resource).filter_by(ID=uid).first()
                    if cres.type == 'ResourceUnit':
                        expandBudgetItem(newbudgetitem.ID, cres)
                    newbudgetitem.Quantity = budgetitem.Quantity * rpart.Quantity
            rpart.ResourceID = uid

    else:
        return HTTPInternalServerError()

    DBSession.flush()
    transaction.commit()
    return HTTPOk()


def deleteitemview(request):
    """ The deleteitemview is called using
        the address from the node to be deleted.
        The node ID is sent in the request, and it is deleted from the tables.
    """
    # Get the id of the node to be deleted from the path
    deleteid = request.matchdict['id']
    # Delete it from the table
    deletethis = DBSession.query(Node).filter_by(ID=deleteid).first()
    if not deletethis:
        return HTTPInternalServerError("Node not found")
    parent = deletethis.Parent
    parentid = parent.ID
    # update the parent costs
    if parentid != 0:
        parent.Total = parent.Total - deletethis.Total
        if hasattr(deletethis, 'Ordered'):
            parent.Ordered -= deletethis.Ordered
        if hasattr(deletethis, 'Invoiced'):
            parent.Invoiced -= deletethis.Invoiced

    qry = DBSession.delete(deletethis)
    transaction.commit()

    return {"parentid": parentid}


@view_config(route_name="node_budgetitems", renderer='json', permission='view')
def node_budgetitems(request):
    """ Retrieves and returns all the budgetitems in a node
        that can be ordered
    """
    nodeid = request.matchdict['id']
    qry = DBSession.query(Node).filter_by(ID=nodeid).first()
    budgetitemslist = qry.getBudgetItems()
    itemlist = []
    for bi in budgetitemslist:
        # only add budgetitems with no children as an order item
        if len(bi.Children) == 0:
            itemlist.append(bi.order())
    return sorted(itemlist, key=lambda k: k['Name'].upper())


@view_config(route_name="node_budgetgroups", renderer='json', permission='view')
def node_budgetgroups(request):
    """ Returns a list of the first level budget groups in a node
    """
    proj_id = request.matchdict['id']
    itemlist = []

    qry = DBSession.query(Valuation).filter_by(ProjectID=proj_id)
    # get the data from an existing & most recent valuation for this project
    if qry.first() != None:
        # find the valuation closest to the current date
        qry = qry.order_by(Valuation.Date.desc()).all()
        most_recent_valuation = qry[0]

        parentlist = []
        childrenlist = []
        for item in most_recent_valuation.ValuationItems:
            bg = item.BudgetGroup

            # get data and append children valuation items to children list
            if item.ParentID != 0:
                data = bg.valuation('2')
                data['AmountComplete'] = str(item.Total)
                data['PercentageComplete'] = item.PercentageComplete
                childrenlist.append(data)
            # get data and append parents valuation items to parent list
            else:
                data = bg.valuation()
                if len(item.Children) > 0:
                    data['expanded'] = True
                data['AmountComplete'] = str(item.Total)
                data['PercentageComplete'] = item.PercentageComplete
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
    # no valuation exists
    else:
        # add the project's budgetgroup children to the list
        project = DBSession.query(Project).filter_by(ID=proj_id).first()
        for child in project.Children:
            if child.type == 'BudgetGroup':
                itemlist.append(child.valuation())
        itemlist = sorted(itemlist, key=lambda k: k['Name'].upper())

    return itemlist


@view_config(route_name="node_expand_budgetgroup", renderer='json', permission='view')
def node_expand_budgetgroup(request):
    """ this method manipulates a list of budgetgroup entries as used by
        the valuationsgrid in add/edit valuation form
        if target node is a top level node and contains children:
        return the list of budgetgroups with children of target node included
        in the list, the position of the children in the list is following the
        parent (target)
    """
    bg_id = int(request.matchdict['bg_id'])

    bgroups = DBSession.query(BudgetGroup).filter_by(ParentID=bg_id).all()
    parentnode = DBSession.query(BudgetGroup).filter_by(ID=bg_id).first()
    parent = parentnode.valuation()
    if not bgroups:
        parent['expanded'] = True
        parent['PercentageComplete'] = None
        return parent

    children = []
    for bg in bgroups:
        data = bg.valuation('2')

        # get the most recent valuation item
        item = (DBSession.query(ValuationItem).
                    filter_by(BudgetGroupID = bg.ID).
                    join(Valuation, ValuationItem.Valuation).
                    order_by(Valuation.Date.desc()).first())
        if item:
            # recalculate the amount complete from the valuation item total
            data['AmountComplete'] = str(item.Total)
            data['PercentageComplete'] = item.PercentageComplete
        else:
            data['AmountComplete'] = '0.00'
            data['PercentageComplete'] = '0'
        children.append(data)

    # set the parent expanded and set the percentage and total to 0
    parent['expanded'] = True
    parent['PercentageComplete'] = None
    parent['TotalBudget'] = None
    # set the parent amount to the sum of its children
    total = Decimal(0.00)
    for child in children:
        total += Decimal(child['AmountComplete']).quantize(Decimal('.01'))
    parent['AmountComplete'] = str(total)
    # return the data
    return [parent] + children

@view_config(route_name="projects", renderer='json', permission='view')
def projects(request):
    """ Returns a list of all the Projects in the database
    """
    projects = []
    # Get all the Projects in the Project table
    qry = DBSession.query(Project).all()
    # build the list and only get the neccesary values
    for project in qry:
        projects.append({'Name': project.Name,
                         'ID': project.ID})
    return sorted(projects, key=lambda k: k['Name'].upper())


def search_resources(top, search):
    # Search from the top down. Not terribly efficient, but we probably don't
    # have more than a few hundred resources.
    resources = top.getResources()
    search = search.lower()
    return [r for r in resources if search in r.Name.lower()]


@view_config(route_name="project_resources", renderer='json', permission='view')
def project_resources(request):
    """ Return a list of all the resources in a nodes project's resourcecategory
        If an optional search term is included the resources are filtered by it.
    """
    nodeid = request.matchdict['id']
    currentnode = DBSession.query(Node).filter_by(ID=nodeid).first()
    resourcecategory = DBSession.query(ResourceCategory).filter_by(
            ParentID=currentnode.getProjectID()).first()

    if 'search' in request.params:
        resources = search_resources(resourcecategory, request.params['search'])
        excludedlist = []
        # if current node is a budgetgroup we are adding a budgetitem
        if currentnode.type == 'BudgetGroup':
            budgetitems = currentnode.getBudgetItems()
            for bi in budgetitems:
                if bi.Resource:
                    excludedlist.append(bi.Resource)
        # if current node is a budgetitem we are editing a budgetitem
        elif currentnode.type == 'BudgetItem':
            siblings = currentnode.Parent.Children
            for sib in siblings:
                if sib.type == 'BudgetItem' and sib.ID != currentnode.ID:
                    if sib.Resource:
                        excludedlist.append(sib.Resource)
        # if the current node is a resourceunit we are adding a resourcepart
        elif currentnode.type == 'ResourceUnit':
            # add it to the excluded nodes
            excludedlist.append(currentnode)
            # and go through all it's resource parts and add their parents
            for part in currentnode.ResourceParts:
                excludedlist.append(part.Parent)
        # if the current node is a resourcepart we are editing a resourcepart
        elif currentnode.type == 'ResourcePart':
            # add the parent to the excluded nodes
            excludedlist.append(currentnode.Parent)
            # and go through all the parents resource parts and add their parents
            for part in currentnode.Parent.ResourceParts:
                excludedlist.append(part.Parent)

        filteredlist = [x for x in resources if x not in excludedlist]
        sortedlist = [item.dict()
                for item in sorted(filteredlist, key=lambda o: o.Name.upper())]
    else:
        resources = resourcecategory.getResources()
        sortedlist = [item.dict()
                    for item in sorted(resources, key=lambda o: o.Name.upper())]

    return sortedlist


@view_config(route_name="resourcecategory_allresources", renderer='json', permission='view')
@view_config(route_name="resourcecategory_resources", renderer='json', permission='view')
def resourcecategory_resources(request):
    """ Returns a list of only the resources in a ResourceCategory
        project_resources returns a mix of resources and categories
    """
    nodeid = request.matchdict['id']
    resourcecategory = DBSession.query(
        ResourceCategory).filter_by(ID=nodeid).first()

    # if it doesnt exist return the empty list
    if not resourcecategory:
        return []

    # get the entire resource list if requested
    if request.matched_route.name == 'resourcecategory_allresources':
        projectid = resourcecategory.getProjectID()
        resourcecategory = DBSession.query(
                ResourceCategory).filter_by(ParentID=projectid).first()

    resourcelist = []
    uniqueresources = []
    resources = resourcecategory.getResources()
    # only add unique resources
    for resource in resources:
        if resource not in uniqueresources:
            uniqueresources.append(resource)
    for resource in uniqueresources:
        resourcelist.append(resource.dict())

    return resourcelist


@view_config(route_name="resourcetypes", renderer='json', permission='view')
def resourcetypes(request):
    """ Returns a list of all the resource types in the database
    """
    restypelist = []
    # Get all the ResourceTypes
    qry = DBSession.query(ResourceType).all()
    # return a list of the ResourceType names
    for restype in qry:
        if restype.Name != '':
            restypelist.append({'ID': restype.ID, 'Name': restype.Name})
    return sorted(restypelist, key=lambda k: k['Name'].upper())


@view_config(route_name="overheadsview", renderer='json', permission='view')
def overheadsview(request):
    """ Perform operations on the Overheads of a specified Project
        depending on the method
    """
    if request.method == 'GET':
        paramsdict = request.params.dict_of_lists()
        paramkeys = paramsdict.keys()
        nodeid = request.matchdict['nodeid']
        currentnode = DBSession.query(Node).filter_by(ID=nodeid).first()
        projectid = currentnode.getProjectID()

        # if the type is specified, filter by it
        if 'NodeType' in paramkeys:
            overheads = DBSession.query(
                    Overhead).filter_by(ProjectID=projectid, Type=paramsdict['NodeType'][0]).all()
        else:
            overheads = DBSession.query(
                    Overhead).filter_by(ProjectID=projectid).all()

        overheadlist = []
        for overhead in overheads:
            overheadlist.append(overhead.dict())
        return sorted(overheadlist, key=lambda k: k['Name'].upper())

    elif request.method == 'POST':
        if not request.has_permission('edit'):
            return HTTPForbidden()

        projectid = request.matchdict['nodeid']
        overheadlist = request.json_body['overheadlist']
        for overhead in overheadlist:
            keys = overhead.keys()
            if 'ID' in keys:
                if 'edit' in keys:
                    editing = DBSession.query(Overhead
                                        ).filter_by(ID=overhead['ID']).first()
                    if editing:
                        editing.Name = overhead['Name']
                        editing.Percentage = float(overhead['Percentage'])
                        editing.Type = overhead['Type']
            else:
                # Build a new overhead with the data
                newoverhead = Overhead(Name = overhead['Name'],
                                    Percentage = float(overhead['Percentage']),
                                    Type=overhead['Type'],
                                    ProjectID = projectid)
                DBSession.add(newoverhead)
        transaction.commit()
        return HTTPOk()


@view_config(route_name="overheadview",renderer='json', permission='view')
def overheadview(request):
    """ Perform operations on the Overheads in the database depending in the
        HTTP method
    """
    if request.method == 'DELETE':
        if not request.has_permission('edit'):
            return HTTPForbidden()
        deleteid = request.matchdict['overheadid']
        # Deleting it from the table deletes the object
        deletethis = DBSession.query(
            Overhead).filter_by(ID=deleteid).first()
        qry = DBSession.delete(deletethis)

        if qry == 0:
            return HTTPNotFound()
        transaction.commit()

        return HTTPOk()


@view_config(route_name="node_grid", renderer='json', permission='view')
def node_grid(request):
    """ This view is for when the user requests the children of an item.
        The parent's id is from the path of the request,
        or if there is no id in the path the root id '0' is assumed.
        It extracts the children from the object,
        adds it to a list and returns it to the JSON renderer
        in the format that is used by the Slickgrid.
    """

    parentid = request.matchdict['parentid']
    parentlist = None
    childrenlist = []
    # put the ResourceCategories in another list that is appended first
    rescatlist = []
    # Execute the sql query on the Node table to find the parent
    qry = DBSession.query(Node).filter_by(ParentID=parentid)
    if qry.count() == 0:
        # if the node doesnt have any children, query for the node's data instead
        qry = DBSession.query(Node).filter_by(ID=parentid)
        if qry.count() == 0:
            # the node has been deleted, return an empty response
            return {'list':[]}
    else:
        # otherwise, if the parent is a budgetgroup/item, add it to the list
        parent = DBSession.query(Node).filter_by(ID=parentid).first()
        if parent.type in ['BudgetGroup', 'BudgetItem', 'ResourceUnit']:
            parentlist = [parent.dict()]
            parentlist[0]['isparent'] = True

    node_type = DBSession.query(Node).filter_by(ID=parentid).first().type
    # If there are any Budgetitems or SimpleBudgetItems
    # There wont be empty columns
    emptyresult = qry.filter(
            (Node.type == 'BudgetItem') |
            (Node.type == 'SimpleBudgetItem'))
    emptycolumns = emptyresult.count() == 0

    # if the query has any BudgetItems it will contain subtotal columns
    no_sub_cost = emptyresult.count() == 0

    qry = qry.all()
    # Get the data from each child and add it to the list
    for child in qry:
        if child.type == 'ResourceCategory':
            rescatlist.append(child.dict())
        else:
            childrenlist.append(child.dict())

    # check if the parent is any of the resource types
    regex = re.compile('Resource*')
    if regex.match(node_type):
        if len(childrenlist) == 0:
            node_type = "ResourceCategories"
        else:
            node_type = 'Resources'

    sorted_childrenlist = sorted(childrenlist, key=lambda k: k['Name'].upper())
    sorted_rescatlist = sorted(rescatlist, key=lambda k: k['Name'].upper())
    sorted_childrenlist = sorted_rescatlist+sorted_childrenlist
    if parentlist:
        sorted_childrenlist = parentlist + sorted_childrenlist

    return {'list': sorted_childrenlist,
            'emptycolumns': emptycolumns,
            'no_sub_cost': no_sub_cost,
            'type': node_type}


@view_config(route_name="node_update_value", renderer='json', permission='edit')
def node_update_value(request):
    """ This view recieves a node ID along with other data parameters on the
        request. It uses the node ID to select and update the node's
        corresponding data in the database. This new data is provided through
        request parameters.
        Only Resources, ResourcePart and BudgetItems types can have their
        fields modified through this view, and only rate and quantity parameters
        can be updated this way. The rate parameters can only be updated on
        Resource type nodes.
    """
    nodeid = request.matchdict['id']
    result = DBSession.query(Node).filter_by(ID=nodeid).first()
    newtotal = None
    newsubtotal = None
    # only a resource's rate can be modified
    if result.type == 'Resource':
        if request.json_body.get('Rate'):
            result.Rate = request.json_body['Rate']
    # only a budgetitems quantity can be modified
    elif result.type == 'BudgetItem':
        if request.json_body.get('Quantity') != None:
            result.Quantity = float(request.json_body.get('Quantity'))
            newtotal = str(result.Total)
            newsubtotal = str(result.Subtotal)
    # only a resourcepart's quantity can be modified
    elif result.type == 'ResourcePart':
        if request.json_body.get('Quantity') != None:
            result.Quantity = float(request.json_body.get('Quantity'))
            newtotal = str(result.Total)
    # a simplebudgetitem's quantity or rate can be modified
    elif result.type == 'SimpleBudgetItem':
        if request.json_body.get('Quantity') != None:
            result.Quantity = float(request.json_body['Quantity'])
        if request.json_body.get('Rate') != None:
            result.Rate = request.json_body['Rate']
        newtotal = str(result.Total)
        newsubtotal = str(result.Subtotal)
    return {'Total': newtotal,
            'Subtotal': newsubtotal}


@view_config(route_name="node_paste", renderer='json', permission='edit')
def node_paste(request):
    """ The node_paste is sent the path of the node that is to be copied.
        That node is then found in the db, copied with the new parent's id,
        and added to the current node.
    """
    # Find the source object to be copied from the path in the request body
    sourceid = request.json_body["ID"]
    # Find the object to be copied to from the path
    destinationid = request.matchdict['id']
    projectid = 0
    source = DBSession.query(Node).filter_by(ID=sourceid).first()
    dest = DBSession.query(Node).filter_by(ID=destinationid).first()
    # make sure the destination total is set
    dest.Total
    parentid = dest.ID
    sourceparent = source.ParentID
    node_pasted = True
    # if a project is being pasted into the root
    if (parentid == 0) and (source.type == 'Project'):
        if request.json_body["cut"]:
            projectid = sourceid
            pasted_id = sourceid
        else:
            # Paste the source into the destination
            projectcopy = source.copy(dest.ID)
            projectcopy.Name = 'Copy of ' + projectcopy.Name
            DBSession.add(projectcopy)
            DBSession.flush()
            projectid = projectcopy.ID
            dest.paste(projectcopy, source.Children)
            DBSession.flush()
            # add a Resource Category to the new Project
            resourcecategory = ResourceCategory(Name='Resource List',
                                            Description='List of Resources',
                                            ParentID=projectid)
            DBSession.add(resourcecategory)
            DBSession.flush()
            rescatid = resourcecategory.ID

            # Get the budgetitems that were copied
            sourcebudgetitems = source.getBudgetItems()
            # copy each unique resource into the new resource category
            copiedresourceIds = {}
            for budgetitem in sourcebudgetitems:
                if budgetitem.ResourceID not in copiedresourceIds:
                    # the original category name
                    categoryName = budgetitem.Resource.Parent.Name
                    newparentid = sortResource(resourcecategory,
                                                categoryName)
                    copiedresource = budgetitem.Resource.copy(newparentid)
                    DBSession.add(copiedresource)
                    DBSession.flush()
                    copiedresourceIds[
                            budgetitem.Resource.ID] = copiedresource.ID

            # get the budgetitems that were pasted
            destbudgetitems = projectcopy.getBudgetItems()
            # change the resource ids of budgetitems who were copied
            for budgeitem in destbudgetitems:
                if budgetitem.ResourceID in copiedresourceIds:
                    budgetitem.ResourceID = copiedresourceIds[
                                                budgetitem.ResourceID]
            # set the costs to zero
            projectcopy.clearCosts()
            pasted_id = projectcopy.ID
    # if we're dealing with resource categories
    elif source.type == 'ResourceCategory' and dest.type == 'ResourceCategory':
        duplicates = request.json_body.get('duplicates', {})
        resourcecodes = duplicates.keys()
        sourceresources = source.getResources()

        # if we are cutting the source, and the resources are being used,
        # return an error
        if request.json_body["cut"]:
            for resource in sourceresources:
                if len(resource.BudgetItems) > 0:
                    return HTTPInternalServerError("Can't cut resources that are used")
        projectid = dest.getProjectID()
        resourcecategory = DBSession.query(
                ResourceCategory).filter_by(ParentID=projectid).first()
        rescatid = resourcecategory.ID
        destresources = resourcecategory.getResources()

        # if the source category already exists in the destination,
        # set the pasted id to its id
        sourcename = source.Name
        destcategory = DBSession.query(ResourceCategory).filter_by(
                                    ParentID=rescatid, Name=sourcename).first()

        # loop through all the source resources
        # if they are duplicated, check what the action should be taken
        for resource in sourceresources:
            if resource.Code in resourcecodes:
                overwrite = duplicates[resource.Code]
                if overwrite:
                    for destresource in destresources:
                        if destresource.Code == resource.Code:
                            destresource.overwrite(resource)
            # otherwise paste the resource into the new category
            else:
                # add the resource to the destination category
                # the original category name
                categoryName = resource.Parent.Name
                newparentid = sortResource(resourcecategory,
                                            categoryName)
                newresource = resource.copy(newparentid)
                DBSession.add(newresource)
                DBSession.flush()

        # if the source is cut, delete it
        if request.json_body["cut"]:
            deletethis = DBSession.query(
                            ResourceCategory).filter_by(ID=sourceid).first()
            qry = DBSession.delete(deletethis)

        # get the pasted id
        if not destcategory:
            destcategory = DBSession.query(ResourceCategory).filter_by(
                                    ParentID=rescatid, Name=sourcename).first()
            # if the category was not created, the destination category needs
            # to be reloaded
            if destcategory:
                pasted_id = destcategory.ID
            else:
                pasted_id = parentid
                node_pasted = False
        else:
            # the category had already existed, so don't return an id
            pasted_id = None
        transaction.commit()
    # check the node isnt being pasted into it's parent
    elif parentid != sourceparent:
        if source.type == 'Resource' or source.type == 'ResourceUnit':
            # check the resource is not being duplicated
            projectid = dest.getProjectID()
            resourcecategory = DBSession.query(
                        ResourceCategory).filter_by(ParentID=projectid).first()
            destresources = resourcecategory.getResources()
            if source not in destresources:
                if request.json_body["cut"]:
                    sourceresources = source.getResources()
                    for resource in sourceresources:
                        if len(resource.BudgetItems) > 0:
                            return HTTPInternalServerError("Can't cut resources that are used")
                    source.ParentID = parentid
                    pasted_id = source.ID
                else:
                    # Paste the source into the destination
                    newresource = source.copy(parentid)
                    DBSession.add(newresource)
                    DBSession.flush()
                    pasted_id = newresource.ID
            else:
                if request.json_body["cut"]:
                    destprojectid = dest.getProjectID()
                    sourceprojectid = source.getProjectID()
                    # if we cut and paste in the same resource category its fine
                    if destprojectid == sourceprojectid:
                        source.ParentID = destinationid
                        pasted_id = source.ID
                    else:
                        return HTTPConflict()
                else:
                    return HTTPConflict()
        # if the source is to be cut and pasted into the destination
        elif request.json_body["cut"]:
            # check if the node was pasted into a different project
            # Get the ID of the projects
            destprojectid = dest.getProjectID()
            sourceprojectid = source.getProjectID()
            if destprojectid != sourceprojectid:
                projectid = destprojectid
                # get the resource category the project uses
                resourcecategory = DBSession.query(
                                ResourceCategory).filter_by(
                                ParentID=projectid).first()
                rescatid = resourcecategory.ID

                # Get the budgetitems that were copied
                sourcebudgetitems = source.getBudgetItems()
                # copy each unique resource into the new resource category
                copiedresourceIds = {}
                for budgetitem in sourcebudgetitems:
                    if budgetitem.ResourceID not in copiedresourceIds:
                        categoryName = budgetitem.Resource.Parent.Name
                        newparentid = sortResource(resourcecategory,
                                                    categoryName)
                        copiedresource = budgetitem.Resource.copy(newparentid)
                        DBSession.add(copiedresource)
                        DBSession.flush()
                        copiedresourceIds[
                                budgetitem.Resource.ID] = copiedresource.ID

                # get the budgetitems that were pasted
                destbudgetitems = dest.getBudgetItems()
                # change the resource ids of budgetitems who were copied
                for budgetitem in destbudgetitems:
                    if budgetitem.ResourceID in copiedresourceIds:
                        budgetitem.ResourceID = copiedresourceIds[
                                                    budgetitem.ResourceID]

                # copy the overheads the budgetitems use into the project
                overheadids = {}
                for budgetitem in sourcebudgetitems:
                    newoverheads = []
                    for overhead in budgetitem.Overheads:
                        if overhead.ID not in overheadids.keys():
                            newoverhead = overhead.copy(destprojectid)
                            DBSession.add(newoverhead)
                            DBSession.flush()
                            overheadids[overhead.ID] = newoverhead
                            newoverheads.append(newoverhead)
                        else:
                            newoverheads.append(overheadids[overhead.ID])
                    budgetitem.Overheads[:] = []
                    budgetitem.Overheads = newoverheads

            # update source parent costs
            sourceparent = source.Parent
            sourceparent.Ordered -= source.Ordered
            sourceparent.Invoiced -= source.Invoiced
            if sourceparent._Total:
                sourceparent.Total -= source.Total
            else:
                sourceparent.Total

            # set the source parent to the destination parent
            source.ParentID = destinationid
            # update destination parent costs
            dest.Ordered += source.Ordered
            dest.Invoiced += source.Invoiced
            dest.Total += source.Total
            pasted_id = source.ID
            transaction.commit()
        else:
            # Paste the source into the destination
            copy_of_source = source.copy(dest.ID)
            dest.paste(copy_of_source, source.Children)
            DBSession.flush()
            pasted_id = copy_of_source.ID
            # check if the node was pasted into a different project
            # Get the ID of the projects
            destprojectid = dest.getProjectID()
            sourceprojectid = source.getProjectID()

            if destprojectid != sourceprojectid:
                projectid = destprojectid
                # get the resource category the project uses
                resourcecategory = DBSession.query(
                                ResourceCategory).filter_by(
                                ParentID=projectid).first()
                rescatid = resourcecategory.ID

                # Get the budgetitems that were copied
                sourcebudgetitems = source.getBudgetItems()
                # copy each unique resource into the new resource category
                copiedresourceIds = {}
                for budgetitem in sourcebudgetitems:
                    if budgetitem.ResourceID not in copiedresourceIds:
                        categoryName = budgetitem.Resource.Parent.Name
                        newparentid = sortResource(resourcecategory,
                                                    categoryName)
                        copiedresource = budgetitem.Resource.copy(newparentid)
                        DBSession.add(copiedresource)
                        DBSession.flush()
                        copiedresourceIds[
                                budgetitem.Resource.ID] = copiedresource.ID

                # get the budgetitems that were pasted
                destbudgetitems = copy_of_source.getBudgetItems()
                projectoverheads = DBSession.query(Overhead
                        ).filter_by(ProjectID=projectid).all()

                for budgetitem in destbudgetitems:
                    if budgetitem.ResourceID in copiedresourceIds:
                        budgetitem.ResourceID = copiedresourceIds[
                                                    budgetitem.ResourceID]

                    # replace the overheads in the copied budgetitems with
                    # the overheads in the project
                    originaloverheads = budgetitem.Overheads
                    for overhead in originaloverheads:
                        if overhead in projectoverheads:
                            budgetitem.Overheads.remove(overhead)
                            projectoverhead = projectoverheads[
                                                projectoverheads.index(overhead)]
                            budgetitem.Overheads.append(projectoverhead)
                        else:
                            budgetitem.Overheads.remove(overhead)
                            newoverhead = overhead.copy(projectid)
                            budgetitem.Overheads.append(newoverhead)

            # update destination parent costs
            dest.Ordered += source.Ordered
            dest.Invoiced += source.Invoiced
            dest.Total += source.Total
    # when a node is pasted in the same level
    else:
        # can't do this for resources or resource categories
        if not (source.type == 'ResourceCategory' or source.type == 'Resource'):
            # don't do anything is the source was cut
            if not request.json_body["cut"]:
                # Paste the source into the destination
                nodecopy = source.copy(dest.ID)
                existing_sibling_names = [x.Name for x in dest.Children]
                node_name_base = nodecopy.Name
                nodecopy.Name = node_name_base + ' copy'
                count = 2
                if nodecopy.Name in existing_sibling_names:
                    while nodecopy.Name in existing_sibling_names:
                        nodecopy.Name = node_name_base + ' copy ' + str(count)
                        count += 1

                nodechildren = source.Children
                dest.paste(nodecopy, nodechildren)
                # update parent total
                dest.Ordered += source.Ordered
                dest.Invoiced += source.Invoiced
                dest.Total += source.Total
                DBSession.flush()
                pasted_id = nodecopy.ID

    transaction.commit()
    # return the new id
    if pasted_id and node_pasted:
        data = DBSession.query(Node).filter_by(ID=pasted_id).first().dict()
    else:
        data = None

    return {'newId': pasted_id, 'node': data}


@view_config(route_name="node_cost", renderer='json', permission='view')
def node_cost(request):
    """ The costview is called using the address from the node to be costed.
        The node ID is sent in the request, and the total cost of that node
        is calculated recursively from it's children.
    """

    # Get the id of the node to be costed
    costid = request.matchdict['id']
    qry = DBSession.query(Node).filter_by(ID=costid).first()
    if qry == None:
        return HTTPNotFound()
    totalcost = str(qry.Total)
    transaction.commit()

    return {'Cost': totalcost}


@view_config(route_name='clientsview', renderer='json', permission='view')
def clientsview(request):
    """ The clientview returns a list in json format of all the clients
        in the server database
    """

    qry = DBSession.query(Client).all()
    clientlist = []

    for client in qry:
        clientlist.append(client.dict())
    return sorted(clientlist, key=lambda k: k['Name'].upper())


@view_config(route_name='clientview', renderer='json', permission='view')
def clientview(request):
    """ The clientview handles different cases of a single client
        depending on the http method
    """

    # if the method is delete, delete the client
    if request.method == 'DELETE':
        if not request.has_permission('edit'):
            return HTTPForbidden()
        deleteid = request.matchdict['id']

        # Deleting it from the node table deleted the object
        deletethis = DBSession.query(Client).filter_by(ID=deleteid).first()
        qry = DBSession.delete(deletethis)

        if qry == 0:
            return HTTPNotFound()
        transaction.commit()

        return HTTPOk()

    # if the method is post, add a new client
    if request.method == 'POST':
        if not request.has_permission('edit'):
            return HTTPForbidden()
        newclient = Client(Name=request.json_body['Name'],
            Address=request.json_body.get('Address', ''),
            CityID=request.json_body.get('City', None),
            StateProvince=request.json_body.get('StateProvince', ''),
            Country=request.json_body.get('Country', ''),
            Zipcode=request.json_body.get('Zipcode', ''),
            Fax=request.json_body.get('Fax', ''),
            Phone=request.json_body.get('Phone', ''),
            Cellular=request.json_body.get('Cellular', ''),
            Contact=request.json_body.get('Contact', ''))
        DBSession.add(newclient)
        DBSession.flush()
        newid = newclient.ID
        return {'newid':newid}

    # if the method is put, edit an existing client
    if request.method == 'PUT':
        if not request.has_permission('edit'):
            return HTTPForbidden()
        client = DBSession.query(
                    Client).filter_by(ID=request.matchdict['id']).first()
        client.Name=request.json_body['Name']
        client.Address=request.json_body.get('Address', '')
        client.CityID=request.json_body.get('City', None)
        client.StateProvince=request.json_body.get('StateProvince', '')
        client.Country=request.json_body.get('Country', '')
        client.Zipcode=request.json_body.get('Zipcode', '')
        client.Fax=request.json_body.get('Fax', '')
        client.Phone=request.json_body.get('Phone', '')
        client.Cellular=request.json_body.get('Cellular', '')
        client.Contact=request.json_body.get('Contact', '')

        transaction.commit()
        return HTTPOk()

    # otherwise return the selected client
    clientid = request.matchdict['id']
    client = DBSession.query(Client).filter_by(ID=clientid).first()
    return client.dict()


@view_config(route_name='suppliersview', renderer='json', permission='view')
def suppliersview(request):
    """ The supplierview returns a list in json format of all the suppliers
        in the server database
    """
    qry = DBSession.query(Supplier).all()
    supplierlist = []

    for supplier in qry:
        supplierlist.append(supplier.dict())
    return sorted(supplierlist, key=lambda k: k['Name'].upper())


@view_config(route_name='supplierview', renderer='json', permission='view')
def supplierview(request):
    """ The supplierview handles different cases of a single supplier
        depending on the http method
    """

    # if the method is delete, delete the supplier
    if request.method == 'DELETE':
        if not request.has_permission('edit'):
            return HTTPForbidden()
        deleteid = request.matchdict['id']

        # Deleting it from the node table deleted the object
        deletethis = DBSession.query(Supplier).filter_by(ID=deleteid).first()
        qry = DBSession.delete(deletethis)

        if qry == 0:
            return HTTPNotFound()
        transaction.commit()

        return HTTPOk()

    # if the method is post, add a new supplier
    if request.method == 'POST':
        if not request.has_permission('edit'):
            return HTTPForbidden()
        newsupplier = Supplier(Name=request.json_body['Name'],
            Address=request.json_body.get('Address', ''),
            CityID=request.json_body.get('City', None),
            StateProvince=request.json_body.get('StateProvince', ''),
            Country=request.json_body.get('Country', ''),
            Zipcode=request.json_body.get('Zipcode', ''),
            Fax=request.json_body.get('Fax', ''),
            Phone=request.json_body.get('Phone', ''),
            Cellular=request.json_body.get('Cellular', ''),
            Contact=request.json_body.get('Contact', ''))

        DBSession.add(newsupplier)
        DBSession.flush()
        newid = newsupplier.ID
        return {'newid':newid}

    # if the method is put, edit an existing supplier
    if request.method == 'PUT':
        if not request.has_permission('edit'):
            return HTTPForbidden()
        supplier = DBSession.query(
                    Supplier).filter_by(ID=request.matchdict['id']).first()
        supplier.Name=request.json_body['Name']
        supplier.Address=request.json_body.get('Address', '')
        supplier.CityID=request.json_body.get('City', None)
        supplier.StateProvince=request.json_body.get('StateProvince', '')
        supplier.Country=request.json_body.get('Country', '')
        supplier.Zipcode=request.json_body.get('Zipcode', '')
        supplier.Fax=request.json_body.get('Fax', '')
        supplier.Phone=request.json_body.get('Phone', '')
        supplier.Cellular=request.json_body.get('Cellular', '')
        supplier.Contact=request.json_body.get('Contact', '')
        transaction.commit()
        return HTTPOk()

    # otherwise return the selected supplier
    supplierid = request.matchdict['id']
    supplier = DBSession.query(Supplier).filter_by(ID=supplierid).first()
    return supplier.dict()


@view_config(route_name="company_information", renderer='json', permission='view')
def company_information(request):
    """ Returns all company information data
    """
    # if the method is put, edit the company information data
    if request.method == 'PUT':
        if not request.has_permission('edit'):
            return HTTPForbidden()
        company_information = DBSession.query(CompanyInformation).first()
        company_information.Name=request.json_body.get('Name', '')
        company_information.Address=request.json_body.get('Address', '')
        company_information.Tel=request.json_body.get('Tel', '')
        company_information.Fax=request.json_body.get('Fax', '')
        company_information.Cell=request.json_body.get('Cell', '')
        company_information.BankName=request.json_body.get('BankName', '')
        company_information.BranchCode=request.json_body.get('BranchCode', '')
        company_information.AccountNo=request.json_body.get('AccountNo', '')
        company_information.AccountName=request.json_body.get('AccountName', '')
        company_information.DefaultTaxrate=request.json_body.get('DefaultTaxrate', '')
        company_information.Currency=request.json_body.get('Currency', 'R')

        DBSession.flush()
        transaction.commit()
        return HTTPOk()

    # otherwise return the company information data
    qry = DBSession.query(CompanyInformation).first()
    if qry == None:
        # if the company information has never been entered, supply these defaults
        company_information = CompanyInformation(ID=0,
                                 Name='TETIUS RABE PROPERTY SERVICES',
                                 Address='173 KLEINBOS AVENUE, SOMERSET-WEST',
                                 Tel='0218511572',
                                 Fax='0218511572',
                                 Cell='0832742643',
                                 BankName='BOE BANK WORCESTER',
                                 BranchCode='440707',
                                 AccountNo='2572658703',
                                 AccountName='TR Property Services',
                                 DefaultTaxrate='14.00')
        DBSession.add(company_information)
        DBSession.flush()
        qry = DBSession.query(CompanyInformation).first()

    return {'Name': qry.Name,
            'Address': qry.Address,
            'Tel': qry.Tel,
            'Fax': qry.Fax,
            'Cell': qry.Cell,
            'BankName': qry.BankName,
            'BranchCode': qry.BranchCode,
            'AccountNo': qry.AccountNo,
            'AccountName': qry.AccountName,
            'DefaultTaxrate': qry.DefaultTaxrate,
            'Currency': qry.Currency}


@view_config(route_name='unitsview', renderer='json', permission='view')
def unitsview(request):
    """ The unitsview returns a list in json format of all the units
        in the server database
    """
    qry = DBSession.query(Unit).all()
    unitlist = []
    for unit in qry:
        unitlist.append({'Name': unit.Name,
                         'ID': unit.ID})
    return sorted(unitlist, key=lambda k: k['Name'].upper())


@view_config(route_name='unitview', renderer='json', permission='view')
def unitview(request):
    """ The unitview handles different cases for units
        depending on the http method
    """
    # if the method is delete, delete the unit, granted it is not in use by any resources
    if request.method == 'DELETE':
        if not request.has_permission('edit'):
            return HTTPForbidden()
        deleteid = request.matchdict['id']
        # Deleting it from the node table deletes the object
        deletethis = DBSession.query(Unit).filter_by(ID=deleteid).first()
        # only delete if this Unit is not in use by any Resource
        if len(deletethis.Resources) == 0:
            qry = DBSession.delete(deletethis)
            if qry == 0:
                return HTTPNotFound()
            transaction.commit()
            return {'status': 'remove'}
        return {'status': 'keep'}

    # if the method is post, add a new unit
    if request.method == 'POST':
        if not request.has_permission('edit'):
            return HTTPForbidden()
        newunit = Unit(Name=request.json_body['Name'])
        qry = DBSession.query(Unit).all()
        existing_unitlist = []
        for unit in qry:
            existing_unitlist.append(str(unit.Name).upper())
        if str(request.json_body['Name']).upper() not in existing_unitlist:
            DBSession.add(newunit)
            DBSession.flush()
            return {'newid': newunit.ID}
        return

    # if the method is put, edit an existing unit
    if request.method == 'PUT':
        if not request.has_permission('edit'):
            return HTTPForbidden()
        unit = DBSession.query(
                    Unit).filter_by(Name=request.matchdict['id']).first()
        unit.Name=request.json_body['Name']
        transaction.commit()
        return HTTPOk()

    # otherwise return the selected unit
    unitid = request.matchdict['id']
    unit = DBSession.query(Unit).filter_by(ID=unitid).first()
    return {'Name': unit.Name, 'ID': unit.ID}


@view_config(route_name='citiesview', renderer='json', permission='view')
def citiesview(request):
    """ The citiesview returns a list in json format of all the units
        in the server database
    """
    qry = DBSession.query(City).all()
    citylist = []
    for city in qry:
        citylist.append({'Name': city.Name,
                         'ID': city.ID})
    return sorted(citylist, key=lambda k: k['Name'].upper())


@view_config(route_name='cityview', renderer='json', permission='view')
def cityview(request):
    """ The cityview handles different cases for cities
        depending on the http method
    """
    # if the method is delete, delete the city
    if request.method == 'DELETE':
        if not request.has_permission('edit'):
            return HTTPForbidden()
        deleteid = request.matchdict['id']
        # Deleting it from the node table deletes the object
        deletethis = DBSession.query(City).filter_by(ID=deleteid).first()
        # only delete if this City is not in use by any other table
        if len(deletethis.Projects) == 0:
            if len(deletethis.Clients) == 0:
                if len(deletethis.Suppliers) == 0:
                    qry = DBSession.delete(deletethis)
                    if qry == 0:
                        return HTTPNotFound()
                    transaction.commit()
                    return {'status': 'remove'}
        return {'status': 'keep'}

    # if the method is post, add a new city
    if request.method == 'POST':
        if not request.has_permission('edit'):
            return HTTPForbidden()
        newcity = City(Name=request.json_body['Name'])
        qry = DBSession.query(City).all()
        existing_citylist = []
        for city in qry:
            existing_citylist.append(str(city.Name).upper())
        if str(request.json_body['Name']).upper() not in existing_citylist:
            DBSession.add(newcity)
            DBSession.flush()
            return {'newid': newcity.ID}
        return

    # if the method is put, edit an existing city
    if request.method == 'PUT':
        if not request.has_permission('edit'):
            return HTTPForbidden()
        city = DBSession.query(
                    City).filter_by(Name=request.matchdict['id']).first()
        city.Name=request.json_body['Name']
        transaction.commit()
        return HTTPOk()

    # otherwise return the selected city
    cityid = request.matchdict['id']
    city = DBSession.query(City).filter_by(ID=cityid).first()
    return {'Name': city.Name, 'ID': city.ID}


@view_config(route_name="orders_tree_view", renderer='json', permission='view')
def orders_tree_view(request):
    """ This view is for when the user requests the children of a node
        in the order tree. The nodes used by the orders use a different format
        than the projects tree view
    """

    parentid = request.matchdict['id']
    childrenlist = []

    qry = DBSession.query(Node).filter_by(ID=parentid).first()
    # build the list and only get the neccesary values
    if qry != None:
        for child in qry.Children:
            # if the child is a leaf budgetitem, add it as an orderitem
            if child.type in ('BudgetItem', 'SimpleBudgetItem') \
            and len(child.Children) == 0:
                childrenlist.append(child.order())
            elif child.type != 'ResourceCategory':
                childrenlist.append(child.dict())

    # sort childrenlist
    sorted_childrenlist = sorted(childrenlist, key=lambda k: k['Name'].upper())
    return sorted_childrenlist


@view_config(route_name='ordersview', renderer='json', permission='view')
def ordersview(request):
    """ The ordersview returns a list in json format of a section of the orders
        in the server database
    """
    paramsdict = request.params.dict_of_lists()
    paramkeys = paramsdict.keys()
    qry = DBSession.query(Order).order_by(Order.ID.desc())

    # filter the orders
    setLength = False
    if 'Project' in paramkeys:
        setLength = True
        qry = qry.filter_by(ProjectID=paramsdict['Project'][0])
    if 'Client' in paramkeys:
        setLength = True
        qry = qry.filter_by(ClientID=paramsdict['Client'][0])
    if 'Supplier' in paramkeys:
        setLength = True
        qry = qry.filter_by(SupplierID=paramsdict['Supplier'][0])
    if 'OrderNumber' in paramkeys:
        setLength = True
        qry = qry.filter(Order.ID.like(paramsdict['OrderNumber'][0]+'%'))
    if 'Status' in paramkeys:
        setLength = True
        qry = qry.filter_by(Status=paramsdict['Status'][0])

    # cut the section
    if 'start' not in paramkeys:
        start = 0
        end = -1
    else:
        start = int(paramsdict['start'][0])
        end = int(paramsdict['end'][0])
    section = qry.slice(start,end).all()
    orderlist = []
    for order in section:
        orderlist.append(order.dict())
    # check if the length needs to change
    length = None
    if setLength:
        length = qry.count()
    orderlist.append(length)
    return orderlist


@view_config(route_name='orders_filter', renderer='json', permission='view')
def orders_filter(request):
    """ Returns a list of the Projects, Clients, Suppliers used by an order
        when filtered
    """
    qry = DBSession.query(Order)
    paramsdict = request.params.dict_of_lists()
    paramkeys = paramsdict.keys()
    # filter by the selected filters
    if 'Project' in paramkeys:
        qry = qry.filter_by(ProjectID=paramsdict['Project'][0])
    if 'Client' in paramkeys:
        qry = qry.filter_by(ClientID=paramsdict['Client'][0])
    if 'Supplier' in paramkeys:
        qry = qry.filter_by(SupplierID=paramsdict['Supplier'][0])
    if 'OrderNumber' in paramkeys:
        qry = qry.filter(Order.ID.like(paramsdict['OrderNumber'][0]+'%'))
    if 'Status' in paramkeys:
        qry = qry.filter_by(Status=paramsdict['Status'][0])
    # get the unique values the other filters are to be updated with
    clients = qry.distinct(Order.ClientID).group_by(Order.ClientID)
    clientlist = []
    for client in clients:
        if client.Client:
            clientlist.append({'Name': client.Client.Name, 'ID': client.ClientID})
    suppliers = qry.distinct(Order.SupplierID).group_by(Order.SupplierID)
    supplierlist = []
    for supplier in suppliers:
        if supplier.Supplier:
            supplierlist.append({'Name': supplier.Supplier.Name, 'ID': supplier.SupplierID})
    projects = qry.distinct(Order.ProjectID).group_by(Order.ProjectID)
    projectlist = []
    for project in projects:
        if project.Project:
            projectlist.append({'Name': project.Project.Name, 'ID': project.ProjectID})
    return {'projects': sorted(projectlist, key=lambda k: k['Name'].upper()),
            'clients': sorted(clientlist, key=lambda k: k['Name'].upper()),
            'suppliers': sorted(supplierlist, key=lambda k: k['Name'].upper())}


@view_config(route_name='orders_length', renderer='json', permission='view')
def orders_length(request):
    """ Returns the number of orders in the database
    """
    rows = DBSession.query(func.count(Order.ID)).scalar()
    return {'length': rows}


@view_config(route_name='orderview', renderer='json', permission='view')
def orderview(request):
    """ The orderview handles different cases for orders
        depending on the http method
    """
    # if the method is delete, delete the order
    if request.method == 'DELETE':
        if not request.has_permission('edit'):
            return HTTPForbidden()
        deleteid = request.matchdict['id']
        # Deleting it from the table deletes the object
        deletethis = DBSession.query(Order).filter_by(ID=deleteid).first()
        # update the budgetitem ordered amounts
        for orderitem in deletethis.OrderItems:
            orderitem.BudgetItem.Ordered = (orderitem.BudgetItem.Ordered -
                                                orderitem.Total)
        qry = DBSession.delete(deletethis)
        transaction.commit()

        return HTTPOk()

    # if the method is post, add a new order
    if request.method == 'POST':
        if not request.has_permission('edit'):
            return HTTPForbidden()
        user = request.json_body.get('UserCode', '')
        auth = request.json_body.get('Authorisation', '')
        proj = request.json_body.get('ProjectID', None)
        supplier = request.json_body.get('SupplierID', None)
        address = request.json_body.get('DeliveryAddress', '')
        # the client is derived from the project
        client = DBSession.query(Project).filter_by(ID=proj).first().ClientID
        # convert to date from json format
        date = request.json_body.get('Date', None)
        if date:
            date = datetime.strptime(date, '%Y-%m-%dT%H:%M:%S.%fZ')
        neworder = Order(UserCode=user,
                            Authorisation=auth,
                            ProjectID=proj,
                            SupplierID=supplier,
                            ClientID=client,
                            DeliveryAddress=address,
                            Date=date)
        DBSession.add(neworder)
        DBSession.flush()
        # add the order items to the order
        newid = neworder.ID
        budgetitemslist = request.json_body.get('BudgetItemsList', [])
        for budgetitem in budgetitemslist:
            quantity = float(budgetitem.get('Quantity', 0))
            rate = budgetitem.get('Rate', 0)
            rate = Decimal(rate).quantize(Decimal('.01'))
            vat = budgetitem.get('VAT', 0)
            neworderitem = OrderItem(OrderID=newid,
                                    BudgetItemID=budgetitem['ID'],
                                    _Quantity=quantity,
                                    _Rate = rate,
                                    VAT=vat)
            DBSession.add(neworderitem)
        transaction.commit()
        # return the new order
        neworder = DBSession.query(Order).filter_by(ID=newid).first()
        neworder.resetTotal()
        # update the budgetitem ordered amounts
        for orderitem in neworder.OrderItems:
            orderitem.BudgetItem.Ordered = orderitem.Total
        return neworder.dict()

    # if the method is put, edit an existing order
    if request.method == 'PUT':
        if not request.has_permission('edit'):
            return HTTPForbidden()
        order = DBSession.query(
                    Order).filter_by(ID=request.matchdict['id']).first()

        user = request.json_body.get('UserCode', '')
        auth = request.json_body.get('Authorisation', '')
        proj = request.json_body.get('ProjectID', None)
        if proj == order.ProjectID:
            client = order.ClientID
        else:
            client = DBSession.query(Project).filter_by(ID=proj).first().ClientID
        supplier = request.json_body.get('SupplierID', None)
        address = request.json_body.get('DeliveryAddress', '')
        # convert to date from json format
        date = request.json_body.get('Date', None)
        if date:
            try:
                date = datetime.strptime(date, '%Y-%m-%dT%H:%M:%S.%fZ')
            except:
                date = datetime.strptime(date, "%d %B %Y")

        order.UserCode=user
        order.Authorisation=auth
        order.ProjectID=proj
        order.SupplierID=supplier
        order.ClientID=client
        order.DeliveryAddress=address
        order.Date = date

        # get a list of id's used in the orderitems
        iddict = {}
        for orderitem in order.OrderItems:
            iddict[orderitem.BudgetItemID] = orderitem.ID
        # get the list of budgetitems used in the form
        budgetitemslist = request.json_body.get('BudgetItemsList', [])
        # iterate through the new id's and add any new orders
        # remove the id from the list if it is there already
        for budgetitem in budgetitemslist:
            if budgetitem['ID'] not in iddict.keys():
                # add the new order item
                quantity = float(budgetitem.get('Quantity', 0))
                rate = budgetitem.get('Rate', 0)
                rate = Decimal(rate).quantize(Decimal('.01'))
                vat = budgetitem.get('VAT', 0)

                neworderitem = OrderItem(OrderID=order.ID,
                                        BudgetItemID=budgetitem['ID'],
                                        _Quantity=quantity,
                                        _Rate = rate,
                                        VAT=vat)
                DBSession.add(neworderitem)
            else:
                # otherwise remove the id from the list and update the
                # rate and quantity
                orderitemid = iddict[budgetitem['ID']]
                orderitem = DBSession.query(OrderItem).filter_by(
                                    ID=orderitemid).first()
                orderitem.Quantity = float(budgetitem['Quantity'])
                rate = budgetitem['Rate']
                orderitem.Rate = Decimal(rate).quantize(Decimal('.01'))
                vat = budgetitem.get('VAT', 0)
                orderitem.VAT = vat
                del iddict[budgetitem['ID']]
        # delete the leftover id's and update the ordered total
        for oldid in iddict.values():
            deletethis = DBSession.query(OrderItem).filter_by(ID=oldid).first()
            deletethis.BudgetItem.Ordered = (deletethis.BudgetItem.Ordered -
                                                deletethis.Total)
            qry = DBSession.delete(deletethis)

        transaction.commit()
        # return the edited order
        order = DBSession.query(
                    Order).filter_by(ID=request.matchdict['id']).first()
        order.resetTotal()
        # update the budgetitem ordered amounts
        for orderitem in order.OrderItems:
            orderitem.BudgetItem.Ordered = orderitem.Total
        return order.dict()

    # otherwise return the selected order
    orderid = request.matchdict['id']
    order = DBSession.query(Order).filter_by(ID=orderid).first()
    if not order:
        return HTTPInternalServerError()
    # build a list of the budgetitem used in the order from the order items
    budgetitemslist = []
    for orderitem in order.OrderItems:
        budgetitemslist.append(orderitem.dict())
    budgetitemslist = sorted(budgetitemslist, key=lambda k: k['Name'].upper())

    data = order.dict()
    data['BudgetItemsList'] = budgetitemslist
    transaction.commit()

    return data


@view_config(route_name='orderstatus', renderer='json', permission='edit')
def orderstatus(request):
    """ Perform operations on the status of an order
    """
    if request.method == 'POST':
        order = DBSession.query(Order).filter_by(
                                            ID=request.matchdict['id']).first()
        order.Status = request.json_body['status']
        transaction.commit()
        return HTTPOk()


@view_config(route_name='valuationsview', renderer='json', permission='view')
def valuationsview(request):
    """ The valuationsview returns a list in json format of a section of the
        valuations in the server database.
        It accepts optional filter parameters
    """
    paramsdict = request.params.dict_of_lists()
    paramkeys = paramsdict.keys()
    qry = DBSession.query(Valuation).order_by(Valuation.ID.desc())

    # filter by filters
    if 'Project' in paramkeys:
        qry = qry.filter_by(ProjectID=paramsdict['Project'][0])
    if 'Date' in paramkeys:
        date = ''.join(paramsdict['Date'])
        date = datetime.strptime(date, '%Y-%m-%dT%H:%M:%S.%fZ')
        qry = qry.filter_by(Date=date)
    if 'Status' in paramkeys:
        qry = qry.filter_by(Status=paramsdict['Status'][0])

    # cut the section
    if 'start' not in paramkeys:
        start = 0
        end = -1
    else:
        start = int(paramsdict['start'][0])
        end = int(paramsdict['end'][0])
    section = qry.slice(start,end).all()
    valuationlist = []
    for valuation in section:
        valuationlist.append(valuation.dict())
    return valuationlist


@view_config(route_name='valuations_filter', renderer='json', permission='view')
def valuations_filter(request):
    """ Returns a list of the Projects used by a valuation when filtered
    """
    qry = DBSession.query(Valuation)
    paramsdict = request.params.dict_of_lists()
    paramkeys = paramsdict.keys()
    # filter by the selected filters
    if 'Project' in paramkeys:
        qry = qry.filter_by(ProjectID=paramsdict['Project'][0])
    if 'Status' in paramkeys:
        qry = qry.filter_by(Status=paramsdict['Status'][0])
    # get the unique values the other filters are to be updated with
    projects = qry.distinct(Valuation.ProjectID).group_by(Valuation.ProjectID)
    projectlist = []
    for project in projects:
        if project.Project:
            projectlist.append({'Name': project.Project.Name, 'ID': project.ProjectID})
    return {'projects': sorted(projectlist, key=lambda k: k['Name'].upper())}


@view_config(route_name='valuations_length', renderer='json', permission='view')
def valuations_length(request):
    """ Returns the number of valuations in the database
    """
    rows = DBSession.query(func.count(Valuation.ID)).scalar()
    return {'length': rows}


@view_config(route_name='valuationview', renderer='json', permission='view')
def valuationview(request):
    """ The valuationview handles different cases for valuations
        depending on the http method
    """
    # if the method is delete, delete the valuation
    if request.method == 'DELETE':
        if not request.has_permission('edit'):
            return HTTPForbidden()
        deleteid = request.matchdict['id']
        # Deleting it from the table deletes the object
        deletethis = DBSession.query(Valuation).filter_by(ID=deleteid).first()
        qry = DBSession.delete(deletethis)
        if qry == 0:
            return HTTPNotFound()
        transaction.commit()

        return HTTPOk()

    # if the method is post, add a new valuation
    if request.method == 'POST':
        if not request.has_permission('edit'):
            return HTTPForbidden()
        proj = request.json_body.get('ProjectID', None)
        # convert to date from json format
        date = request.json_body.get('Date', None)
        if date:
            date = datetime.strptime(date, '%Y-%m-%dT%H:%M:%S.%fZ')

        newvaluation = Valuation(ProjectID=proj,
                                 Date=date)
        DBSession.add(newvaluation)
        DBSession.flush()
        # add the valuation items to the valuation
        newid = newvaluation.ID
        budgetgrouplist = request.json_body.get('BudgetGroupList', [])
        parentid=0
        for budgetgroup in budgetgrouplist:
            p_complete = budgetgroup.get('PercentageComplete', None)
            if p_complete:
                p_complete = float(p_complete)
            bgid = budgetgroup['ID']
            level = budgetgroup['level']
            total = budgetgroup.get('TotalBudget', None)
            if total is not None:
                total = Decimal(total).quantize(Decimal('01'))
            bg = DBSession.query(BudgetGroup).filter_by(ID=bgid).first()
            if level == '1':
                newitem = ValuationItem(ValuationID=newid,
                                        ParentID=0,
                                        BudgetGroupID=bgid,
                                        BudgetGroupTotal=total,
                                        PercentageComplete=p_complete)
                DBSession.add(newitem)
                DBSession.flush()
                parentid = newitem.ID
            # add a second level valuation item using the parent id
            # that was generated previously
            elif level == '2':
                DBSession.add(ValuationItem(ValuationID=newid,
                                            ParentID=parentid,
                                            BudgetGroupID=bgid,
                                            BudgetGroupTotal=total,
                                            PercentageComplete=p_complete))

        # add the valuation markups
        markuplist = request.json_body.get('ValuationMarkups', [])
        for markup in markuplist:
            p_complete = markup.get('PercentageComplete', None)
            if p_complete:
                p_complete = float(p_complete)
            overheadid = markup['ID']
            budgettotal = markup['TotalBudget']
            DBSession.add(ValuationMarkup(ValuationID=newid,
                                        OverheadID=overheadid,
                                        PercentageComplete=p_complete))

        transaction.commit()
        # return the new valuation
        newvaluation = DBSession.query(Valuation).filter_by(ID=newid).first()
        return newvaluation.dict()

    # if the method is put, edit an existing valuation
    if request.method == 'PUT':
        if not request.has_permission('edit'):
            return HTTPForbidden()
        vid = request.matchdict['id']
        valuation = DBSession.query(Valuation).filter_by(ID=vid).first()

        proj = request.json_body.get('ProjectID', None)
        # convert to date from json format
        date = request.json_body.get('Date', None)
        if date:
            date = datetime.strptime(date, '%Y-%m-%dT%H:%M:%S.%fZ')

        valuation.ProjectID = proj
        valuation.Date = date
        # get a list of id's used in the valuationitems
        iddict = {}
        for valuationitem in valuation.ValuationItems:
            iddict[valuationitem.BudgetGroupID] = valuationitem.ID
        # get the list of budget groups used in the slickgrid
        budgetgrouplist = request.json_body.get('BudgetGroupList', [])
        # iterate through the new id's and add any new valuations
        # remove the id from the list if it is there already
        for budgetgroup in budgetgrouplist:
            p_complete = budgetgroup.get('PercentageComplete', None)
            if p_complete:
                p_complete = float(p_complete)
            total = budgetgroup.get('TotalBudget', None)
            if total is not None:
                total = Decimal(total).quantize(Decimal('01'))
            if budgetgroup['ID'] not in iddict.keys():
                # add the new valuation item
                if budgetgroup['level'] == '1':
                    DBSession.add(ValuationItem(ValuationID=vid,
                                            ParentID=0,
                                            BudgetGroupID=budgetgroup['ID'],
                                            BudgetGroupTotal=total,
                                            PercentageComplete=p_complete))
                    DBSession.flush()
                else:
                    # find the parent of the second level valuation item
                    parent = DBSession.query(ValuationItem).filter_by(
                                ValuationID=vid,
                                BudgetGroupID=budgetgroup['ParentID']).first()
                    DBSession.add(ValuationItem(ValuationID=vid,
                                            ParentID=parent.ID,
                                            BudgetGroupID=budgetgroup['ID'],
                                            BudgetGroupTotal=total,
                                            PercentageComplete=p_complete))
            else:
                # otherwise remove the id from the list and update the
                # percentage complete & total
                item = DBSession.query(ValuationItem).filter_by(
                                    ID=iddict[budgetgroup['ID']]).first()
                item.PercentageComplete = p_complete
                item.BudgetGroupTotal = total
                del iddict[budgetgroup['ID']]
        # delete the leftover id's
        for oldid in iddict.values():
            deletethis = DBSession.query(
                            ValuationItem).filter_by(ID=oldid).first()
            DBSession.delete(deletethis)

        # go through the markups and update the percentages
        markuplist = request.json_body.get('ValuationMarkups', [])
        for markup in markuplist:
            valuationmarkup = DBSession.query(ValuationMarkup
                                            ).filter_by(ID=markup['ID']).first()
            valuationmarkup.PercentageComplete = float(markup['PercentageComplete'])
        transaction.commit()
        # return the edited valuation
        valuation = DBSession.query(Valuation).filter_by(ID=vid).first()
        return valuation.dict()

    # otherwise return the selected valuation
    valuationid = request.matchdict['id']
    valuation = DBSession.query(Valuation).filter_by(ID=valuationid).first()
    # get the date in json format
    jsondate = None
    if valuation.Date:
        jsondate = valuation.Date.isoformat()
        jsondate = jsondate + '.000Z'
    # build a list of the budgetgroups used in the valuation from the valuation
    # items
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

    # get a list of valuation markups
    markuplist = []
    for markup in valuation.MarkupList:
        data = markup.dict()
        data['AmountComplete'] = float(data['TotalBudget'])*(markup.PercentageComplete/100)
        markuplist.append(data)
    return {'ID': valuation.ID,
            'ProjectID': valuation.ProjectID,
            'BudgetGroupList': itemlist,
            'ValuationMarkups': markuplist,
            'Date': jsondate}


@view_config(route_name='usersview', renderer='json', permission='view')
def usersview(request):
    if request.method == 'POST':
        if not request.has_permission('edit'):
            return HTTPForbidden()
        # Create a new user
        username = request.json_body['username']
        password = request.json_body['password']

        # Check for existing user
        if DBSession.query(User).filter(User.username==username).count() > 0:
            return HTTPConflict('user exists')

        # create user
        user = User(username=username)
        user.set_password(password)

        # add user rights
        permissions = request.json_body.get('permissions', [])
        for right in permissions:
            permission = right.get('Permission', None)
            userright = UserRight(Function=right['Function'],
                                    Permission=permission)
            user.UserRights.append(userright)

        DBSession().merge(user)
        ProtectedFunction.invalidate_acls() # Invalidate cache

        return user.dict()

    # return a list of users
    users = DBSession().query(User).all()
    return [
        user.dict()
        for user in users]


@view_config(route_name='userview', renderer='json', permission='view')
def userview(request):
    username = request.matchdict['username']
    session = DBSession()

    try:
        user = session.query(User).filter(User.username==username).one()
    except NoResultFound:
        return HTTPNotFound('No such user')

    # edit a user
    if request.method == 'POST':
        if not request.has_permission('edit'):
            return HTTPForbidden()
        password=request.json_body.get('password', None)

        if password:
            user.set_password(password)
        permissions = request.json_body.get('permissions', [])
        for right in permissions:
            permission = right.get('Permission', None)
            userright = DBSession.query(UserRight).filter_by(UserID=user.ID,
                                            Function=right['Function']).first()
            userright.Permission = permission
            ProtectedFunction.invalidate_acls() # Invalidate cache

    # delete a user
    elif request.method == 'DELETE':
        if not request.has_permission('edit'):
            return HTTPForbidden()
        session.delete(user)
        ProtectedFunction.invalidate_acls() # Invalidate cache
        return {}

    # return the user
    return user.dict()

@view_config(route_name='userrights', renderer='json')
def userrights(request):
    """ Get the rights of this user
    """
    username = request.matchdict['username']
    user = DBSession.query(User).filter(User.username==username).first()
    permissions = {}
    if user is not None:
        for right in user.UserRights:
            permissions[right.Function] = right.Permission

    return permissions


@view_config(route_name='invoicesview', renderer='json', permission='view')
def invoicesview(request):
    """ The invoicesview returns a list in json format of all the invoices
    """
    invoicelist = []
    qry = DBSession.query(Invoice).order_by(Invoice.ID.desc())
    paramsdict = request.params.dict_of_lists()
    paramkeys = paramsdict.keys()
    if 'InvoiceNumber' in paramkeys:
        qry = qry.filter(Invoice.InvoiceNumber.like(paramsdict['InvoiceNumber'][0]+'%'))
    if 'OrderNumber' in paramkeys:
        qry = qry.filter(Invoice.OrderID.like(paramsdict['OrderNumber'][0]+'%'))
    if 'Project' in paramkeys:
        qry = qry.filter_by(ProjectID=paramsdict['Project'][0])
    if 'Client' in paramkeys:
        qry = qry.filter_by(ClientID=paramsdict['Client'][0])
    if 'Supplier' in paramkeys:
        qry = qry.filter_by(SupplierID=paramsdict['Supplier'][0])
    if 'PaymentDate' in paramkeys:
        date = ''.join(paramsdict['PaymentDate'])
        print date
        date = datetime.strptime(date, '%Y-%m-%dT%H:%M:%S.%fZ')
        qry = qry.filter_by(PaymentDate=date)
    if 'Status' in paramkeys:
        qry = qry.filter(Invoice.Status.like(paramsdict['Status'][0]+'%'))

    for invoice in qry:
        invoicelist.append(invoice.dict())
    return invoicelist


@view_config(route_name='invoices_filter', renderer='json', permission='view')
def invoices_filter(request):
    """ Returns a list of the available filters used by an invoice
        after all the filters have been applied
    """
    qry = DBSession.query(Invoice)
    paramsdict = request.params.dict_of_lists()
    paramkeys = paramsdict.keys()
    if 'InvoiceNumber' in paramkeys:
        qry = qry.filter(Invoice.InvoiceNumber.like(paramsdict['InvoiceNumber'][0]+'%'))
    if 'OrderNumber' in paramkeys:
        qry = qry.filter(Invoice.OrderID.like(paramsdict['OrderNumber'][0]+'%'))
    if 'Project' in paramkeys:
        qry = qry.filter_by(ProjectID=paramsdict['Project'][0])
    if 'Client' in paramkeys:
        qry = qry.filter_by(ClientID=paramsdict['Client'][0])
    if 'Supplier' in paramkeys:
        qry = qry.filter_by(SupplierID=paramsdict['Supplier'][0])
    if 'PaymentDate' in paramkeys:
        date = ''.join(paramsdict['PaymentDate'])
        print date
        date = datetime.strptime(date, '%Y-%m-%dT%H:%M:%S.%fZ')
        qry = qry.filter_by(PaymentDate=date)
    if 'Status' in paramkeys:
        qry = qry.filter(Invoice.Status.like(paramsdict['Status'][0]+'%'))

    # distinct does not work on hybrid expressions, manually filter lists
    projects = []
    projectslist = []
    suppliers = []
    supplierslist = []
    clients = []
    clientslist = []
    for invoice in qry:
        if invoice.ProjectID not in projects:
            projects.append(invoice.ProjectID)
            projectslist.append({'Name': invoice.ProjectName, 'ID': invoice.ProjectID})
        if invoice.ClientID not in clients:
            clients.append(invoice.ClientID)
            clientslist.append({'Name': invoice.ClientName, 'ID': invoice.ClientID})
        if invoice.SupplierID not in suppliers:
            suppliers.append(invoice.SupplierID)
            supplierslist.append({'Name': invoice.SupplierName, 'ID': invoice.SupplierID})

    return {'projects': sorted(projectslist, key=lambda k: k['Name'].upper()),
            'clients': sorted(clientslist, key=lambda k: k['Name'].upper()),
            'suppliers': sorted(supplierslist, key=lambda k: k['Name'].upper())}


@view_config(route_name='invoiceview', renderer='json', permission='view')
def invoiceview(request):
    """ The invoiceview handles different cases for individual invoices
        depending on the http method
    """
    # if the method is delete, delete the invoice
    if request.method == 'DELETE':
        if not request.has_permission('edit'):
            return HTTPForbidden()
        deleteid = request.matchdict['id']
        # Deleting it from the table deletes the object
        deletethis = DBSession.query(Invoice).filter_by(ID=deleteid).first()

        # update the budgetitem invoiced amounts
        order = DBSession.query(Order).filter_by(ID=deletethis.OrderID).first()
        for orderitem in order.OrderItems:
            orderitem.BudgetItem.Invoiced = 0

        qry = DBSession.delete(deletethis)
        if qry == 0:
            return HTTPNotFound()
        transaction.commit()

        return HTTPOk()

    # if the method is post, add a new invoice
    if request.method == 'POST':
        if not request.has_permission('edit'):
            return HTTPForbidden()
        orderid = request.json_body['OrderID']
        # convert to date from json format
        indate = request.json_body.get('Invoicedate', None)
        if indate:
            indate = datetime.strptime(indate, '%Y-%m-%dT%H:%M:%S.%fZ')
        paydate = request.json_body.get('Paymentdate', None)
        if paydate:
            paydate = datetime.strptime(paydate, '%Y-%m-%dT%H:%M:%S.%fZ')
        amount = request.json_body.get('Amount', 0)
        amount = Decimal(amount).quantize(Decimal('.01'))
        vat = request.json_body.get('VAT', 0)
        vat = Decimal(vat).quantize(Decimal('.01'))

        invoicetotal = amount + vat
        # update the budgetitem invoiced amounts
        order = DBSession.query(Order).filter_by(ID=orderid).first()
        ordertotal = order.Total

        for orderitem in order.OrderItems:
            if ordertotal > 0:
                proportion = orderitem.Total/ordertotal
                orderitem.BudgetItem.Invoiced += invoicetotal * proportion
            else:
                if not orderitem.BudgetItem.Invoiced:
                    orderitem.BudgetItem.Invoiced = 0

        newinvoice = Invoice(OrderID=orderid,
                            InvoiceNumber=request.json_body['InvoiceNumber'],
                            InvoiceDate=indate,
                            PaymentDate=paydate,
                            Amount=amount,
                            VAT=vat)
        DBSession.add(newinvoice)
        DBSession.flush()
        newid = newinvoice.ID
        transaction.commit()
        # return the new invoice
        newinvoice = DBSession.query(Invoice).filter_by(ID=newid).first()
        return newinvoice.dict()

    # if the method is put, edit an existing invoice
    if request.method == 'PUT':
        if not request.has_permission('edit'):
            return HTTPForbidden()
        invoice = DBSession.query(Invoice).filter_by(
                                            ID=request.matchdict['id']).first()
        oldtotal = invoice.Total
        indate = request.json_body.get('Invoicedate', None)
        if indate:
            indate = datetime.strptime(indate, '%Y-%m-%dT%H:%M:%S.%fZ')
            invoice.InvoiceDate = indate
        paydate = request.json_body.get('Paymentdate', None)
        if paydate:
            paydate = datetime.strptime(paydate, '%Y-%m-%dT%H:%M:%S.%fZ')
            invoice.PaymentDate = paydate
        amount = request.json_body.get('Amount', None)
        if amount:
            amount = Decimal(amount).quantize(Decimal('.01'))
            invoice.Amount = amount
        vat = request.json_body.get('VAT', None)
        if vat:
            vat = Decimal(vat).quantize(Decimal('.01'))
            invoice.VAT = vat
        invoice.InvoiceNumber = request.json_body['InvoiceNumber'],
        newtotal = invoice.Total
        # if the totals are different update the invoiced amounts
        if oldtotal != newtotal:
            order = DBSession.query(Order).filter_by(ID=invoice.OrderID).first()
            for orderitem in order.OrderItems:
                if order.Total > 0:
                    proportion = orderitem.Total/order.Total
                    orderitem.BudgetItem.Invoiced = newtotal * proportion
                else:
                    orderitem.BudgetItem.Invoiced = 0
        transaction.commit()
        # return the edited invoice
        invoice = DBSession.query(Invoice).filter_by(
                                            ID=request.matchdict['id']).first()
        return invoice.dict()

    # otherwise return the selected invoice
    invoiceid = request.matchdict['id']
    invoice = DBSession.query(Invoice).filter_by(ID=invoiceid).first()

    return invoice.dict()


@view_config(route_name='invoicestatus', renderer='json', permission='edit')
def invoicestatus(request):
    """ Perform operations on the status of an invoice
    """
    if request.method == 'POST':
        invoice = DBSession.query(Invoice).filter_by(
                                            ID=request.matchdict['id']).first()
        invoice.Status = request.json_body['status']
        transaction.commit()
        return HTTPOk()


@view_config(route_name='claim_valuations', renderer='json', permission='view')
def claim_valuations(request):
    """ Returns which valuations of a project can still be claimed
    """
    qry = DBSession.query(Valuation).filter_by(
                        ProjectID=request.params.dict_of_lists()['Project'][0]
                        ).order_by(Valuation.ID.desc()).all()

    # only add valuations that don't have claims
    vals = []
    for val in qry:
        if not val.Claim:
            vals.append(val.dict())

    return vals


@view_config(route_name='claimsview', renderer='json', permission='view')
def claimsview(request):
    """ The claimsview returns a list in json format of all the claims
    """
    claimslist = []
    qry = DBSession.query(Claim).order_by(Claim.ID.desc())
    paramsdict = request.params.dict_of_lists()
    paramkeys = paramsdict.keys()
    if 'Project' in paramkeys:
        qry = qry.filter_by(ProjectID=paramsdict['Project'][0])
    if 'Date' in paramkeys:
        date = ''.join(paramsdict['Date'])
        date = datetime.strptime(date, '%Y-%m-%dT%H:%M:%S.%fZ')
        qry = qry.filter_by(Date=date)
    if 'Status' in paramkeys:
        qry =qry.filter_by(Status=paramsdict['Status'][0])

    for claim in qry:
        claimslist.append(claim.dict())
    return claimslist


@view_config(route_name='claims_filter', renderer='json', permission='view')
def claims_filter(request):
    """ Returns a list of the Projects used by a claim when filtered
    """
    qry = DBSession.query(Claim)
    paramsdict = request.params.dict_of_lists()
    paramkeys = paramsdict.keys()
    # filter by the selected filters
    if 'Project' in paramkeys:
        qry = qry.filter_by(ProjectID=paramsdict['Project'][0])
    if 'Status' in paramkeys:
        qry = qry.filter_by(Status=paramsdict['Status'][0])
    # get the unique values the other filters are to be updated with
    projects = qry.distinct(Claim.ProjectID).group_by(Claim.ProjectID)
    projectlist = []
    for project in projects:
        if project.Project:
            projectlist.append({'Name': project.Project.Name, 'ID': project.ProjectID})
    return {'projects': sorted(projectlist, key=lambda k: k['Name'].upper())}


@view_config(route_name='claimstatus', renderer='json', permission='edit')
def claimstatus(request):
    """ Perform operations on the status of a claim
    """
    if request.method == 'POST':
        claim = DBSession.query(Claim).filter_by(
                                            ID=request.matchdict['id']).first()
        claim.Status = request.json_body['status']
        transaction.commit()
        return HTTPOk()


@view_config(route_name='claimview', renderer='json', permission='view')
def claimview(request):
    """ The claimview handles different cases for individual claims
        depending on the http method
    """
    # if the method is delete, delete the claim
    if request.method == 'DELETE':
        if not request.has_permission('edit'):
            return HTTPForbidden()
        deleteid = request.matchdict['id']
        # Deleting it from the table deletes the object
        deletethis = DBSession.query(Claim).filter_by(ID=deleteid).first()

        qry = DBSession.delete(deletethis)
        if qry == 0:
            return HTTPNotFound()
        transaction.commit()

        return HTTPOk()

    # if the method is post, add a new claim
    if request.method == 'POST':
        if not request.has_permission('edit'):
            return HTTPForbidden()
        projectid = request.json_body['ProjectID']
        # convert to date from json format
        date = request.json_body.get('Date', None)
        if date:
            date = datetime.strptime(date, '%Y-%m-%dT%H:%M:%S.%fZ')
        valuationid = request.json_body['ValuationID']

        newclaim = Claim(ProjectID=projectid,
                            Date=date,
                            ValuationID=valuationid)
        DBSession.add(newclaim)
        DBSession.flush()

        # return the new claim
        return newclaim.dict()

    # if the method is put, edit an existing claim
    if request.method == 'PUT':
        if not request.has_permission('edit'):
            return HTTPForbidden()
        claim = DBSession.query(Claim
                                ).filter_by(ID=request.matchdict['id']).first()
        claim.ProjectID = request.json_body['ProjectID']
        claim.ValuationID= request.json_body['ValuationID']
        date = request.json_body.get('Date', None)
        if date:
            date = datetime.strptime(date, '%Y-%m-%dT%H:%M:%S.%fZ')
            claim.Date = date

        transaction.commit()
        # return the edited claim
        claim = DBSession.query(Claim
                                ).filter_by(ID=request.matchdict['id']).first()
        return claim.dict()

    # otherwise return the selected claim
    claimid = request.matchdict['id']
    claim = DBSession.query(Claim).filter_by(ID=claimid).first()

    return claim.dict()

@view_config(route_name='paymentsview', renderer='json', permission='view')
def paymentsview(request):
    """ The paymentsview returns a list in json format of all the payments
    """
    paymentslist = []
    qry = DBSession.query(Payment).order_by(Payment.ID.desc())
    paramsdict = request.params.dict_of_lists()
    paramkeys = paramsdict.keys()

    if 'Project' in paramkeys:
        qry = qry.filter_by(ProjectID=paramsdict['Project'][0])
    if 'Date' in paramkeys:
        date = ''.join(paramsdict['Date'])
        date = datetime.strptime(date, '%Y-%m-%dT%H:%M:%S.%fZ')
        qry = qry.filter_by(Date=date)

    for payment in qry:
        paymentslist.append(payment.dict())
    return paymentslist


@view_config(route_name='paymentview', renderer='json', permission='view')
def paymentview(request):
    """ The paymentview handles different cases for individual payments
        depending on the http method
    """
    # if the method is delete, delete the payment
    if request.method == 'DELETE':
        if not request.has_permission('edit'):
            return HTTPForbidden()
        deleteid = request.matchdict['id']
        # Deleting it from the table deletes the object
        deletethis = DBSession.query(Payment).filter_by(ID=deleteid).first()

        qry = DBSession.delete(deletethis)
        if qry == 0:
            return HTTPNotFound()
        transaction.commit()

        return HTTPOk()

    # if the method is post, add a new payment
    if request.method == 'POST':
        if not request.has_permission('edit'):
            return HTTPForbidden()
        projectid = request.json_body['ProjectID']
        # convert to date from json format
        date = request.json_body.get('Date', None)
        if date:
            date = datetime.strptime(date, '%Y-%m-%dT%H:%M:%S.%fZ')
        refnumber = request.json_body.get('ReferenceNumber', '')
        amount = Decimal(0.00)
        if 'Amount' in request.json_body.keys():
            amount = Decimal(request.json_body['Amount']).quantize(Decimal('.01'))

        newpayment = Payment(ProjectID=projectid,
                            Date=date,
                            ReferenceNumber=refnumber,
                            Amount=amount)
        DBSession.add(newpayment)
        DBSession.flush()

        # return the new payment
        return newpayment.dict()

    # if the method is put, edit an existing payment
    if request.method == 'PUT':
        if not request.has_permission('edit'):
            return HTTPForbidden()
        payment = DBSession.query(Payment
                                ).filter_by(ID=request.matchdict['id']).first()
        payment.ProjectID = request.json_body['ProjectID']
        payment.ReferenceNumber = request.json_body.get('ReferenceNumber', '')
        amount = Decimal(0.00)
        if 'Amount' in request.json_body.keys():
            amount = Decimal(request.json_body['Amount']).quantize(Decimal('.01'))
        payment.Amount = amount
        date = request.json_body.get('Date', None)
        if date:
            date = datetime.strptime(date, '%Y-%m-%dT%H:%M:%S.%fZ')
        payment.Date = date

        transaction.commit()
        # return the edited payment
        payment = DBSession.query(Payment
                                ).filter_by(ID=request.matchdict['id']).first()
        return payment.dict()

    # otherwise return the selected payment
    paymentid = request.matchdict['id']
    payment = DBSession.query(Payment).filter_by(ID=paymentid).first()

    return payment.dict()

@view_config(route_name='currencyview', renderer='json', permission='view')
def currenciesview(request):
    """ The currencyview returns the currency sybol from company information
    """
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
    return currencies[DBSession.query(CompanyInformation).first().Currency]
