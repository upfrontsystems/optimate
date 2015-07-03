"""
views uses pyramid and sqlalchemy to recieve requests from a user
and send responses with appropriate data
"""

import json
import transaction
from datetime import datetime
from pyramid.view import view_config
from decimal import Decimal
from sqlalchemy.sql import collate
from sqlalchemy.orm.exc import NoResultFound
from sqlalchemy import func

from pyramid.httpexceptions import (
    HTTPOk,
    HTTPFound,
    HTTPNotFound,
    HTTPInternalServerError,
    HTTPMethodNotAllowed,
    HTTPBadRequest,
    HTTPUnauthorized,
    HTTPConflict
)

from optimate.app.security import create_token
from optimate.app.security import Administrator, Manager
from optimate.app.models import (
    DBSession,
    Node,
    Project,
    BudgetGroup,
    BudgetItem,
    Component,
    SimpleComponent,
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
    OrderItem,
    Invoice
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


@view_config(route_name="rootview", renderer='json')
@view_config(route_name="node_children", renderer='json')
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
    if qry != None:
        for child in qry.Children:
            if child.type == 'ResourceCategory':
                resourcecategories.append(child.toChildDict())
            else:
                childrenlist.append(child.toChildDict())

    # sort childrenlist
    sorted_childrenlist = sorted(childrenlist, key=lambda k: k['Name'].upper())
    # sort categories
    sorted_categories = sorted(resourcecategories, key=lambda k: k['Name'].upper())

    completelist = sorted_categories + sorted_childrenlist

    return completelist


@view_config(route_name="orders_tree_view", renderer='json')
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
            if child.type == 'Component':
                childrenlist.append(child.toOrderDict())
            elif child.type != 'ResourceCategory':
                childrenlist.append(child.toChildDict())

    # sort childrenlist
    sorted_childrenlist = sorted(childrenlist, key=lambda k: k['Name'].upper())
    return sorted_childrenlist


@view_config(route_name="nodeview", renderer='json')
def nodeview(request):
    """ Manage single operations on a node
        The operation is determined by the HTTP method
    """
    if request.method == 'POST':
        # add a node
        return additemview(request)

    if request.method == 'PUT':
        # edit a node
        return edititemview(request)

    if request.method == 'DELETE':
        # delete a node
        return deleteitemview(request)

    # otherwise return the node
    nodeid = request.matchdict['id']
    qry = DBSession.query(Node).filter_by(ID=nodeid).first()
    if qry:
        if qry.type == 'Component' or qry.type == 'SimpleComponent':
            pt = DBSession.query(Node).filter_by(ID=qry.ParentID).first().type
            if pt == 'BudgetItem':
                data = qry.toDict()
                data['Quantity'] = data['ItemQuantity']
                return data
        elif qry.type == 'BudgetItem':
            pt = DBSession.query(Node).filter_by(ID=qry.ParentID).first().type
            if pt == 'BudgetItem':
                data = qry.toDict()
                data['Quantity'] = data['ItemQuantity']
                return data
        return qry.toDict()
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
    name = request.json_body['Name']
    desc = request.json_body.get('Description', '')
    quantity = float(request.json_body.get('Quantity', 0))
    rate = request.json_body.get('Rate', 0)
    rate = Decimal(rate).quantize(Decimal('.01'))
    resourcetype = request.json_body.get('ResourceType', '')
    unit = request.json_body.get('Unit', '')
    objecttype = request.json_body['NodeType']
    city = request.json_body.get('City', '')
    client = request.json_body.get('Client', '')
    siteaddress = request.json_body.get('SiteAddress', '')
    filenumber = request.json_body.get('FileNumber', '')
    supplier = request.json_body.get('Supplier', '')
    newid = 0
    newnode = None

    # Determine the type of object to be added and build it
    if objecttype == 'Resource':
        code = request.json_body['Code']
        # check if the resource is not in the resource category
        resourcecategory = DBSession.query(
                ResourceCategory).filter_by(ID=parentid).first()
        if resourcecategory:
            if newnode in resourcecategory.Children:
                return HTTPInternalServerError()
        else:
            return HTTPInternalServerError()

        newnode = Resource(Name=name,
                            Description = desc,
                            Code=code,
                            UnitID=unit,
                            Type=resourcetype,
                            SupplierID=supplier,
                            _Rate= rate,
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
        finalcode = name+numerseq
        newnode.Code = finalcode
    elif objecttype == 'Project':
        newnode = Project(Name=name,
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
        DBSession.flush()
    elif objecttype == 'Component':
        # Components need to reference a Resource. If they don't, we create
        # a SimpleComponent instead.
        uid = request.json_body.get('uid', None)
        if uid is None:
            rate = request.json_body.get('Rate', 0)
            rate = Decimal(rate).quantize(Decimal('.01'))

            pt = DBSession.query(Node).filter_by(ID=parentid).first().type
            if pt == 'BudgetGroup':
                # In the context of budget group, you enter a Quantity and it is
                # persisted as Quantity and ItemQuantity is updated to have the
                # same value.
                itemquantity = quantity
            elif pt == 'BudgetItem':
                # quantity is persisted as ItemQuantity. Quantity is calculated by
                # the system and only visible in the slickgrid as a readonly value.
                itemquantity=quantity
                parent = DBSession.query(Node).filter_by(ID=parentid).first()
                quantity=itemquantity*parent.Quantity

            newcomp = SimpleComponent(
                ParentID=parentid,
                Name=request.json_body['Name'],
                Description=request.json_body.get('Description', None),
                _ItemQuantity=itemquantity,
                _Quantity=quantity,
                _Rate=rate,
                Type=request.json_body['ResourceType'])
            DBSession.add(newcomp)
            DBSession.flush()
        else:
            # check the resource exists
            resource = DBSession.query(Resource).filter_by(ID=uid).first()
            if not resource:
                return HTTPNotFound()

            pt = DBSession.query(Node).filter_by(ID=parentid).first().type
            if pt == 'BudgetGroup':
                # In the context of budget group, you enter a Quantity and it is
                # persisted as Quantity and ItemQuantity is updated to have the
                # same value.
                itemquantity = quantity
            elif pt == 'BudgetItem':
                # quantity is persisted as ItemQuantity. Quantity is calculated by
                # the system and only visible in the slickgrid as a readonly value.
                itemquantity=quantity
                parent = DBSession.query(Node).filter_by(ID=parentid).first()
                quantity=itemquantity*parent.Quantity

            newcomp = Component(ResourceID=resource.ID,
                            _ItemQuantity=itemquantity,
                            _Quantity=quantity,
                            ParentID=parentid)

            DBSession.add(newcomp)
            DBSession.flush()

            # get the list of overheads used in the checkboxes
            checklist = request.json_body['OverheadList']
            for record in checklist:
                if record['selected']:
                    overheadid = record['ID']
                    overhead = DBSession.query(
                                Overhead).filter_by(ID=overheadid).first()
                    newcomp.Overheads.append(overhead)

    elif objecttype == 'BudgetGroup':
        newnode = BudgetGroup(Name=name,
                        Description=desc,
                        ParentID=parentid)
    elif objecttype == 'BudgetItem':
        pt = DBSession.query(Node).filter_by(ID=parentid).first().type
        if pt == 'BudgetItem':
            # quantity is persisted as ItemQuantity. Quantity is calculated by
            # the system and only visible in the slickgrid as a readonly value.
            itemquantity=quantity
            parent = DBSession.query(Node).filter_by(ID=parentid).first()
            quantity=itemquantity*parent.Quantity
        else:
            itemquantity=quantity

        newnode = BudgetItem(Name=name,
                        Description=desc,
                        _ItemQuantity = itemquantity,
                        _Quantity = quantity,
                        ParentID=parentid)
    elif objecttype == 'ResourceCategory':
        newnode = ResourceCategory(Name=name,
                        Description=desc,
                        ParentID=parentid)
    else:
        return HTTPInternalServerError()

    if newnode:
        DBSession.add(newnode)
        DBSession.flush()
        newid = newnode.ID

    # reset the total of the parent
    if parentid != 0:
        reset = DBSession.query(Node).filter_by(ID=parentid).first()
        reset.resetTotal()

    # commit the transaction and return ok,
    # along with the id of the new node
    transaction.commit()
    return {'ID': newid}


def edititemview(request):
    """ The edittemview is called when a PUT request is sent from the client.
        The method updates the specified node with properties as specified by the user.
    """
    nodeid = request.json_body['ID']
    objecttype = request.json_body['NodeType']
    name = request.json_body['Name']
    desc = request.json_body.get('Description', '')
    quantity = float(request.json_body.get('Quantity', 0))

    # Determine the type of object to be edited
    if objecttype == 'Project':
        city = request.json_body.get('City', '')
        client = request.json_body.get('Client', '')
        siteaddress = request.json_body.get('SiteAddress', '')
        filenumber = request.json_body.get('FileNumber', '')
        project = DBSession.query(Project).filter_by(ID=nodeid).first()
        project.Name=name
        project.Description=desc
        project.ClientID=client
        project.CityID=city
        project.SiteAddress=siteaddress
        project.FileNumber=filenumber

    elif objecttype == 'Component':
        uid = request.json_body['uid']
        component = DBSession.query(Component).filter_by(ID=nodeid).first()

        # if a different resource is used, get the new resource
        if component.Resource.ID != uid:
            # A different resource was linked to this component
            rootparentid = component.getProjectID()
            resourcecategory = DBSession.query(
                ResourceCategory).filter_by(
                ParentID=rootparentid).first()
            reslist = resourcecategory.getResources()
            assert uid in [x.ID for x in reslist], "Invalid resource id"
            component.ResourceID = uid

        component.Overheads[:] = []

        # get the list of overheads used in the checkboxes
        checklist = request.json_body['OverheadList']
        newoverheads = []
        for record in checklist:
            if record['selected']:
                overheadid = record['ID']
                overhead = DBSession.query(Overhead).filter_by(ID=overheadid).first()
                newoverheads.append(overhead)
        component.Overheads = newoverheads
        component.resetTotal()

        pt = DBSession.query(Node).filter_by(ID=component.ParentID).first().type
        if pt == 'BudgetGroup':
            # In the context of budget group, you enter a Quantity and it is
            # persisted as Quantity and ItemQuantity is updated to have the
            # same value.
            component._ItemQuantity=quantity
            component._Quantity=quantity
        elif pt == 'BudgetItem':
            # quantity is persisted as ItemQuantity. Quantity is calculated by
            # the system and only visible in the slickgrid as a readonly value.
            component._ItemQuantity=quantity
            parent = DBSession.query(Node).filter_by(ID=component.ParentID).first()
            component._Quantity=component._ItemQuantity*parent.Quantity

    elif objecttype == 'SimpleComponent':
        rate = request.json_body.get('Rate', 0)
        rate = Decimal(rate).quantize(Decimal('.01'))
        component = DBSession.query(SimpleComponent).filter_by(
            ID=nodeid).first()
        component.Name = name
        component.Description = desc
        component._Rate=rate
        component.Type=request.json_body['ResourceType']

        pt = DBSession.query(Node).filter_by(ID=component.ParentID).first().type
        if pt == 'BudgetGroup':
            # In the context of budget group, you enter a Quantity and it is
            # persisted as Quantity and ItemQuantity is updated to have the
            # same value.
            component._ItemQuantity=quantity
            component._Quantity=quantity
        elif pt == 'BudgetItem':
            # quantity is persisted as ItemQuantity. Quantity is calculated by
            # the system and only visible in the slickgrid as a readonly value.
            component._ItemQuantity=quantity
            parent = DBSession.query(Node).filter_by(ID=component.ParentID).first()
            component._Quantity=component._ItemQuantity*parent.Quantity

    elif objecttype == 'BudgetGroup':
        budgetgroup = DBSession.query(BudgetGroup).filter_by(ID=nodeid).first()
        budgetgroup.Name=name
        budgetgroup.Description=desc

    elif objecttype == 'BudgetItem':
        budgetitem = DBSession.query(BudgetItem).filter_by(ID=nodeid).first()
        budgetitem.Name=name
        budgetitem.Description=desc
        budgetitem.Quantity=quantity
        budgetitem.ItemQuantity=quantity

        # however if this budgetitem is in the context of another budget item
        pt = DBSession.query(Node).filter_by(ID=component.ParentID).first().type
        if pt == 'BudgetItem':
            budgetitem._ItemQuantity=quantity
            parent = DBSession.query(Node).filter_by(ID=budgetitem.ParentID).first()
            budgetitem._Quantity=budgetitem._ItemQuantity*parent.Quantity

    elif objecttype == 'ResourceCategory':
        resourcecategory = DBSession.query(ResourceCategory).filter_by(ID=nodeid).first()
        resourcecategory.Name=name
        resourcecategory.Description=desc

    elif objecttype == 'Resource':
        rate = request.json_body.get('Rate', 0)
        rate = Decimal(rate).quantize(Decimal('.01'))
        unit = request.json_body.get('Unit', '')
        resourcetype = request.json_body.get('ResourceType', '')
        supplier = request.json_body.get('Supplier', '')
        resource = DBSession.query(Resource).filter_by(ID=nodeid).first()
        resource.Name=name
        resource.Description=desc
        resource.Code = request.json_body['Code']
        resource._Rate=rate
        resource.UnitID=request.json_body.get('Unit', '')
        resource.Type=request.json_body.get('ResourceType', '')
        resource.UnitID=unit
        resource.Type=resourcetype
        resource.SupplierID=supplier

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

    # Deleting it from the node table deleted the object
    deletethis = DBSession.query(Node).filter_by(ID=deleteid).first()
    parentid = deletethis.ParentID
    qry = DBSession.delete(deletethis)

    if qry == 0:
        return HTTPNotFound()
    transaction.commit()

    # reset the total of the parent node
    if parentid != 0:
        reset = DBSession.query(Node).filter_by(ID=parentid).first()
        reset.resetTotal()

    transaction.commit()
    return {"parentid": parentid}


@view_config(route_name="node_components", renderer='json')
def node_components(request):
    """ Retrieves and returns all the components in a node
    """
    nodeid = request.matchdict['id']
    qry = DBSession.query(Node).filter_by(ID=nodeid).first()
    componentslist = qry.getComponents()
    itemlist = []
    for comp in componentslist:
        itemlist.append(comp.toOrderDict())
    return itemlist


@view_config(route_name="projects", renderer='json')
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

@view_config(route_name="project_resources", renderer='json')
@view_config(route_name="resources", renderer='json')
def project_resources(request):
    """ Returns a list of all the resources and resource categories in the
        node's project's resourcecategory in a format
        that the related items widget can read
    """
    nodeid = request.matchdict['id']
    if request.matched_route.name == 'project_resources':
        currentnode = DBSession.query(Node).filter_by(ID=nodeid).first()
        resourcecategory = DBSession.query(ResourceCategory).filter_by(
                ParentID=currentnode.getProjectID()).first()
        if 'search' in request.params:
            resources = search_resources(resourcecategory, request.params['search'])
            return {
                "path": [{ "url": None, "title": u'Search results', "uid": None }],
                "items": [{
                    'title': item.Name,
                    'description': item.Description.strip(),
                    'rate': str(item.Rate),
                    'type': item.Type,
                    'uid': item.ID,
                    'normalized_type': item.type == 'ResourceCategory' and 'folder' or 'document',
                    'folderish': item.type == 'ResourceCategory',
                } for item in sorted(resources, key=lambda o: o.Name.upper())]
            }
    else:
        resourcecategory = DBSession.query(Node).filter_by(ID=nodeid).first()

    # if it doesnt exist return the empty list
    if not resourcecategory:
        return {
            "path": [ {"url": request.route_url('project_resources', id=nodeid)} ],
            "items": []
        }

    l = lambda i, rate, type: (rate is not None) and dict(i, rate=str(rate), type=type) or i
    items = [l({
        'title': item.Name,
        'description': item.Description.strip(),
        'uid': item.ID,
        'normalized_type': item.type == 'ResourceCategory' and 'folder' or 'document', # FIXME
        'folderish': item.type == 'ResourceCategory',
    }, getattr(
        item, 'Rate', None), getattr(
        item, 'Type', None)) for item in sorted(
        resourcecategory.Children, key=lambda o: o.Name.upper())]

    def pathlist(node):
        p = node.Parent
        if p is not None and type(p) is not Project:
            for u in pathlist(p):
                yield u
        yield (node.ID,
            getattr(node, 'Name', None),
            request.route_url('project_resources', id=node.ID))

    return {
        "path": [{
            "url": url,
            "title": title,
            "uid": uid } for uid, title, url in pathlist(resourcecategory)],
        "items": items
    }


@view_config(route_name="resourcecategory_allresources", renderer='json')
@view_config(route_name="resourcecategory_resources", renderer='json')
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
        resourcelist.append(resource.toDict())

    return resourcelist


@view_config(route_name="resourcetypes", renderer='json')
def resourcetypes(request):
    """ Returns a list of all the resource types in the database
    """
    restypelist = []
    # Get all the ResourceTypes
    qry = DBSession.query(ResourceType).all()
    # return a list of the ResourceType names
    for restype in qry:
        restypelist.append({'Name': restype.Name})
    return sorted(restypelist, key=lambda k: k['Name'].upper())


@view_config(route_name="component_overheads", renderer='json')
def component_overheads(request):
    """ Get a list of the Overheads a component can use
    """
    nodeid = request.matchdict['id']

    currentnode = DBSession.query(Node).filter_by(ID=nodeid).first()
    projectid = currentnode.getProjectID()
    overheads = DBSession.query(
                Overhead).filter_by(ProjectID=projectid).all()
    overheadlist = []
    for overhead in overheads:
        overheadlist.append({'Name': overhead.Name,
                            'ID': overhead.ID,
                            'selected': False})
    return sorted(overheadlist, key=lambda k: k['Name'].upper())


@view_config(route_name="project_overheads", renderer='json')
def project_overheads(request):
    """ Perform operations on the Overheads of a specified Project
        depending on the method
    """
    if request.method == 'GET':
        projectid = request.matchdict['id']
        overheadlist = []
        # Get all the overheads used by this project
        qry = DBSession.query(Overhead).filter_by(ProjectID=projectid)
        # build the list and only get the neccesary values
        for overhead in qry:
            overheadlist.append({'Name': overhead.Name,
                            'Percentage': str(overhead.Percentage*100.0),
                            'ID': overhead.ID})
        return sorted(overheadlist, key=lambda k: k['Name'].upper())
    elif request.method == 'POST':
        projectid = request.matchdict['id']
        name = request.json_body['Name']
        perc = (float(request.json_body.get('Percentage', 0)))/100.0
        # Build a new overhead with the data
        newoverhead = Overhead(Name = name,
                                Percentage = perc,
                                ProjectID =projectid)
        DBSession.add(newoverhead)
        transaction.commit()
        return HTTPOk()

@view_config(route_name="overheadview",renderer='json')
def overheadview(request):
    """ Perform operations on the Overheads in the database depending in the
        HTTP method
    """
    if request.method == 'DELETE':
        deleteid = request.matchdict['id']
        # Deleting it from the table deletes the object
        deletethis = DBSession.query(
            Overhead).filter_by(ID=deleteid).first()
        qry = DBSession.delete(deletethis)

        if qry == 0:
            return HTTPNotFound()
        transaction.commit()

        return HTTPOk()


@view_config(route_name="node_grid", renderer='json')
def node_grid(request):
    """ This view is for when the user requests the children of an item.
        The parent's id is from the path of the request,
        or if there is no id in the path the root id '0' is assumed.
        It extracts the children from the object,
        adds it to a list and returns it to the JSON renderer
        in the format that is used by the Slickgrid.
    """

    parentid = request.matchdict['parentid']

    childrenlist = []
    # Execute the sql query on the Node table to find the parent
    qry = DBSession.query(Node).filter_by(ParentID=parentid).all()
    node_type = DBSession.query(Node).filter_by(ID=parentid).first().type
    if qry == []:
        # if the node doesnt have any children, query for the node's data instead
        qry = DBSession.query(Node).filter_by(ID=parentid).all()

    # Filter out all the Budgetitems and Components
    # Test if the result is the same length as the query
    # Therefore there will be empty columns
    emptyresult = DBSession.query(Node).filter(
            Node.ParentID==parentid,
            Node.type != 'BudgetItem',
            Node.type != 'Component',
            Node.type != 'SimpleComponent').all()
    emptycolumns = len(emptyresult) == len(qry)

    # put the ResourceCategories in another list that is appended first
    rescatlist = []

    # Get the griddata dict from each child and add it to the list
    for child in qry:
        if child.type == 'ResourceCategory':
            rescatlist.append(child.getGridData())
        else:
            childrenlist.append(child.getGridData())

    sorted_childrenlist = sorted(childrenlist, key=lambda k: k['name'].upper())
    sorted_rescatlist = sorted(rescatlist, key=lambda k: k['name'].upper())
    sorted_childrenlist = sorted_rescatlist+sorted_childrenlist

    # if children contain no subtotal data - notify the grid
    for child in sorted_childrenlist:
        if child.has_key('sub_cost'):
            if child['sub_cost'] != None:
                return {'list': sorted_childrenlist,
                        'emptycolumns': emptycolumns,
                        'no_sub_cost' : False,
                        'type': node_type}

    return {'list': sorted_childrenlist,
            'emptycolumns': emptycolumns,
            'no_sub_cost' : True,
            'type': node_type}


@view_config(route_name="node_update_value", renderer='json')
def node_update_value(request):
    """ This view recieves a node ID along with other data parameters on the
        request. It uses the node ID to select and update the node's
        corresponding data in the database. This new data is provided through
        request parameters.
        Only Resources, BudgetItems and Component type nodes can have their
        fields modified through this view, and only rate and quantity parameters
        can be updated this way. The rate parameters can only be updated on
        Resource type nodes.
    """
    nodeid = request.matchdict['id']
    result = DBSession.query(Node).filter_by(ID=nodeid).first()
    # only a resource's rate can be modified
    if result.type == 'Resource':
        if request.json_body.get('rate') != None:
            result.Rate = request.json_body.get('rate')
            return HTTPOk()
    # a budgetitems quantity or itemquantity can be modified
    elif result.type == 'BudgetItem':
        newtotal = None
        if request.json_body.get('quantity') != None:
            result.Quantity = float(request.json_body.get('quantity'))
            newtotal = str(result.Total)
        if request.json_body.get('itemquantity') != None:
            result.ItemQuantity = float(request.json_body.get('quantity'))
            newtotal = str(result.Total)
        return {'total': newtotal, 'subtotal': None}
    # only a components itemquantity can be modified
    elif result.type == 'Component':
        if request.json_body.get('itemquantity') != None:
            result.ItemQuantity = float(request.json_body.get('itemquantity'))
            newtotal = str(result.Total)
            newsubtotal = str(result.Subtotal)
            return {'total': newtotal, 'subtotal': newsubtotal}
    # a simplecomponents itemquantity or rate can be modified
    elif result.type == 'SimpleComponent':
        if request.json_body.get('itemquantity') != None:
            result.ItemQuantity = float(request.json_body.get('itemquantity'))
        if request.json_body.get('rate') != None:
            result.Rate = request.json_body.get('rate')
        newtotal = str(result.Total)
        newsubtotal = str(result.Subtotal)
        return {'total': newtotal, 'subtotal': newsubtotal}


@view_config(route_name="node_paste", renderer='json')
def node_paste(request):
    """ The node_paste is sent the path of the node that is to be copied.
        That node is then found in the db, copied with the new parent's id,
        and added to the current node.
    """
    # Find the source object to be copied from the path in the request body
    sourceid = request.json_body["ID"]
    # Find the object to be copied to from the path
    destinationid = request.matchdict['id']
    projectid = None
    source = DBSession.query(Node).filter_by(ID=sourceid).first()
    dest = DBSession.query(Node).filter_by(ID=destinationid).first()
    parentid = dest.ID
    sourceparent = source.ParentID
    # if a project is being pasted into the root
    if parentid == 0:
        if request.json_body["cut"]:
            projectid = sourceid
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

            # Get the components that were copied
            sourcecomponents = source.getComponents()
            # copy each unique resource into the new resource category
            copiedresourceIds = {}
            for component in sourcecomponents:
                if component.ResourceID not in copiedresourceIds:
                    copiedresource = component.Resource.copy(rescatid)
                    resourcecategory.Children.append(copiedresource)
                    DBSession.flush()
                    copiedresourceIds[
                            component.Resource.ID] = copiedresource.ID

            # get the components that were pasted
            destcomponents = projectcopy.getComponents()
            # change the resource ids of components who were copied
            for component in destcomponents:
                if component.ResourceID in copiedresourceIds:
                    component.ResourceID = copiedresourceIds[
                                                component.ResourceID]
            # set the costs to zero
            projectcopy.clearCosts()
    # if we're dealing with resource categories
    elif source.type == 'ResourceCategory' and dest.type == 'ResourceCategory':
        duplicates = request.json_body.get('duplicates', {})
        if len(duplicates)> 0:
            resourcecodes = duplicates.keys()
            sourceresources = source.getResources()
            projectid = dest.getProjectID()
            resourcecategory = DBSession.query(
                    ResourceCategory).filter_by(ParentID=projectid).first()
            destresources = resourcecategory.getResources()
            newcategory = None
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
                    if not newcategory:
                        # add the source resource category to the destination category
                        newcategory = source.copy(parentid)
                        DBSession.add(newcategory)
                        DBSession.flush()
                    newcategory.paste(resource.copy(newcategory.ID), [])

            # if the source is cut, delete it
            if request.json_body["cut"]:
                deleteid = sourceid
                # Deleting it from the node table deleted the object
                deletethis = DBSession.query(
                                ResourceCategory).filter_by(ID=deleteid).first()
                qry = DBSession.delete(deletethis)

                if qry == 0:
                    return HTTPNotFound()
        # if there are no duplicates
        else:
            if request.json_body["cut"]:
                # set the source parent to the destination parent
                source.ParentID = destinationid
            else:
                # Paste the source into the destination
                dest.paste(source.copy(dest.ID), source.Children)
        transaction.commit()
    # check the node isnt being pasted into it's parent
    elif parentid != sourceparent:
        if source.type == 'Resource':
            # check the resource is not being duplicated
            projectid = dest.getProjectID()
            resourcecategory = DBSession.query(
                        ResourceCategory).filter_by(ParentID=projectid).first()
            destresources = resourcecategory.getResources()
            if source not in destresources:
                if request.json_body["cut"]:
                    source.ParentID = destinationid
                else:
                    # Paste the source into the destination
                    dest.paste(source.copy(dest.ID), source.Children)
            else:
                if request.json_body["cut"]:
                    destprojectid = dest.getProjectID()
                    sourceprojectid = source.getProjectID()
                    # if we cut and paste in the same resource category its fine
                    if destprojectid == sourceprojectid:
                        source.ParentID = destinationid
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

                # Get the components that were copied
                if source.type == 'Component':
                    sourcecomponents = [source]
                else:
                    sourcecomponents = source.getComponents()
                # copy each unique resource into the new resource category
                copiedresourceIds = {}
                for component in sourcecomponents:
                    if component.ResourceID not in copiedresourceIds:
                        copiedresource = component.Resource.copy(rescatid)
                        resourcecategory.Children.append(copiedresource)
                        DBSession.flush()
                        copiedresourceIds[
                                component.Resource.ID] = copiedresource.ID

                # get the components that were pasted
                destcomponents = dest.getComponents()
                # change the resource ids of components who were copied
                for component in destcomponents:
                    if component.ResourceID in copiedresourceIds:
                        component.ResourceID = copiedresourceIds[
                                                    component.ResourceID]

                # copy the overheads the components use into the project
                overheadids = {}
                for component in sourcecomponents:
                    newoverheads = []
                    for overhead in component.Overheads:
                        if overhead.ID not in overheadids.keys():
                            newoverhead = overhead.copy(destprojectid)
                            DBSession.add(newoverhead)
                            DBSession.flush()
                            overheadids[overhead.ID] = newoverhead
                            newoverheads.append(newoverhead)
                        else:
                            newoverheads.append(overheadids[overhead.ID])
                    component.Overheads[:] = []
                    component.Overheads = newoverheads

            # set the source parent to the destination parent
            source.ParentID = destinationid
            transaction.commit()
        else:
            # Paste the source into the destination
            dest.paste(source.copy(dest.ID), source.Children)
            DBSession.flush()
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

                # Get the components that were copied
                if source.type == 'Component':
                    sourcecomponents = [source]
                else:
                    sourcecomponents = source.getComponents()
                # copy each unique resource into the new resource category
                copiedresourceIds = {}
                for component in sourcecomponents:
                    if component.ResourceID not in copiedresourceIds:
                        copiedresource = component.Resource.copy(rescatid)
                        resourcecategory.Children.append(copiedresource)
                        DBSession.flush()
                        copiedresourceIds[
                                component.Resource.ID] = copiedresource.ID

                # get the components that were pasted
                destcomponents = dest.getComponents()
                # change the resource ids of components who were copied
                for component in destcomponents:
                    if component.ResourceID in copiedresourceIds:
                        component.ResourceID = copiedresourceIds[
                                                    component.ResourceID]

                # # copy the overheads the components use into the project
                # overheadids = {}
                # for component in sourcecomponents:
                #     for overhead in component.Overheads:
                #         if overhead.ID not in overheadids.keys():
                #             newoverhead = overhead.copy(destprojectid)
                #             DBSession.add(newoverhead)
                #             DBSession.flush()
                #             overheadids[overhead.ID] = newoverhead

                # for component in destcomponents:
                #     for overhead in component.Overheads:
                #         if overhead.ID in overheadids.keys():
                #             # replace the overhead with the copied one
    # when a node is pasted in the same level
    else:
        # can't do this for resources or resource categories
        if not (source.type == 'ResourceCategory' or source.type == 'Resource'):
            # don't do anything is the source was cut
            if not request.json_body["cut"]:
                # Paste the source into the destination
                nodecopy = source.copy(dest.ID)
                nodecopy.Name = 'Copy of ' + nodecopy.Name
                nodechildren = source.Children
                dest.paste(nodecopy, nodechildren)

    # reset the total
    if parentid != 0:
        reset = DBSession.query(Node).filter_by(ID=parentid).first()
        reset.resetTotal()

    transaction.commit()
    # if a project was pasted its new id is returned
    return{'newId': projectid}


@view_config(route_name="node_cost", renderer='json')
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


@view_config(route_name='clientsview', renderer='json')
def clientsview(request):
    """ The clientview returns a list in json format of all the clients
        in the server database
    """

    qry = DBSession.query(Client).all()
    clientlist = []

    for client in qry:
        clientlist.append(client.toDict())
    return sorted(clientlist, key=lambda k: k['Name'].upper())


@view_config(route_name='clientview', renderer='json')
def clientview(request):
    """ The clientview handles different cases of a single client
        depending on the http method
    """

    # if the method is delete, delete the client
    if request.method == 'DELETE':
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
    return client.toDict()


@view_config(route_name='suppliersview', renderer='json')
def suppliersview(request):
    """ The supplierview returns a list in json format of all the suppliers
        in the server database
    """
    qry = DBSession.query(Supplier).all()
    supplierlist = []

    for supplier in qry:
        supplierlist.append(supplier.toDict())
    return sorted(supplierlist, key=lambda k: k['Name'].upper())


@view_config(route_name='supplierview', renderer='json')
def supplierview(request):
    """ The supplierview handles different cases of a single supplier
        depending on the http method
    """

    # if the method is delete, delete the supplier
    if request.method == 'DELETE':
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
    return supplier.toDict()


@view_config(route_name="company_information", renderer='json')
def company_information(request):
    """ Returns all company information data
    """
    # if the method is put, edit the company information data
    if request.method == 'PUT':
        company_information = DBSession.query(CompanyInformation).filter_by(ID=0).first()
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

        DBSession.flush()
        transaction.commit()
        return HTTPOk()

    # otherwise return the company information data
    qry = DBSession.query(CompanyInformation).filter_by(ID=0).first()
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
        qry = DBSession.query(CompanyInformation).filter_by(ID=0).first()

    data = {'Name': qry.Name,
            'Address': qry.Address,
            'Tel': qry.Tel,
            'Fax': qry.Fax,
            'Cell': qry.Cell,
            'BankName': qry.BankName,
            'BranchCode': qry.BranchCode,
            'AccountNo': qry.AccountNo,
            'AccountName': qry.AccountName,
            'DefaultTaxrate': qry.DefaultTaxrate}
    return data


@view_config(route_name='unitsview', renderer='json')
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


@view_config(route_name='unitview', renderer='json')
def unitview(request):
    """ The unitview handles different cases for units
        depending on the http method
    """
    # if the method is delete, delete the unit, granted it is not in use by any resources
    if request.method == 'DELETE':
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
        unit = DBSession.query(
                    Unit).filter_by(Name=request.matchdict['id']).first()
        unit.Name=request.json_body['Name']
        transaction.commit()
        return HTTPOk()

    # otherwise return the selected unit
    unitid = request.matchdict['id']
    unit = DBSession.query(Unit).filter_by(ID=unitid).first()
    return {'Name': unit.Name, 'ID': unit.ID}


@view_config(route_name='citiesview', renderer='json')
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


@view_config(route_name='cityview', renderer='json')
def cityview(request):
    """ The cityview handles different cases for cities
        depending on the http method
    """
    # if the method is delete, delete the city
    if request.method == 'DELETE':
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
        city = DBSession.query(
                    City).filter_by(Name=request.matchdict['id']).first()
        city.Name=request.json_body['Name']
        transaction.commit()
        return HTTPOk()

    # otherwise return the selected city
    cityid = request.matchdict['id']
    city = DBSession.query(City).filter_by(ID=cityid).first()
    return {'Name': city.Name, 'ID': city.ID}


@view_config(route_name='ordersview', renderer='json')
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
        orderlist.append(order.toDict())
    # check if the length needs to change
    length = None
    if setLength:
        length = qry.count()
    orderlist.append(length)
    return orderlist


@view_config(route_name='orders_filter', renderer='json')
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


@view_config(route_name='orders_length', renderer='json')
def orders_length(request):
    """ Returns the number of orders in the database
    """
    rows = DBSession.query(func.count(Order.ID)).scalar()
    return {'length': rows}


@view_config(route_name='orderview', renderer='json')
def orderview(request):
    """ The orderview handles different cases for orders
        depending on the http method
    """
    # if the method is delete, delete the order
    if request.method == 'DELETE':
        deleteid = request.matchdict['id']
        # Deleting it from the table deletes the object
        deletethis = DBSession.query(Order).filter_by(ID=deleteid).first()
        # update the component ordered amounts
        for orderitem in deletethis.OrderItems:
            orderitem.Component.Ordered = (orderitem.Component.Ordered -
                                                orderitem.Total)
        qry = DBSession.delete(deletethis)
        if qry == 0:
            return HTTPNotFound()
        transaction.commit()

        return HTTPOk()

    # if the method is post, add a new order
    if request.method == 'POST':
        user = request.json_body.get('UserCode', '')
        auth = request.json_body.get('Authorisation', '')
        proj = request.json_body.get('ProjectID', None)
        supplier = request.json_body.get('SupplierID', None)
        tax = request.json_body.get('TaxRate', False)
        if tax:
            tax = 0.14
        else:
            tax = 0.0
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
                            TaxRate=tax,
                            DeliveryAddress=address,
                            Date=date)
        DBSession.add(neworder)
        DBSession.flush()
        # add the order items to the order
        newid = neworder.ID
        componentslist = request.json_body.get('ComponentsList', [])
        for component in componentslist:
            quantity = float(component.get('quantity', 0))
            rate = component.get('rate', 0)
            rate = Decimal(rate).quantize(Decimal('.01'))
            neworderitem = OrderItem(OrderID=newid,
                                    ComponentID=component['ID'],
                                    _Quantity=quantity,
                                    _Rate = rate)
            DBSession.add(neworderitem)
        transaction.commit()
        # return the new order
        neworder = DBSession.query(Order).filter_by(ID=newid).first()
        neworder.resetTotal()
        # update the component ordered amounts
        for orderitem in neworder.OrderItems:
            orderitem.Component.Ordered = orderitem.Total
        return neworder.toDict()

    # if the method is put, edit an existing order
    if request.method == 'PUT':
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
        tax = request.json_body.get('TaxRate', False)
        if tax:
            tax = 0.14
        else:
            tax = 0.0
        address = request.json_body.get('DeliveryAddress', '')
        # convert to date from json format
        date = request.json_body.get('Date', None)
        if date:
            date = datetime.strptime(date, '%Y-%m-%dT%H:%M:%S.%fZ')

        order.UserCode=user
        order.Authorisation=auth
        order.ProjectID=proj
        order.SupplierID=supplier
        order.ClientID=client
        order.TaxRate=tax
        order.DeliveryAddress=address
        order.Date = date

        # get a list of id's used in the orderitems
        iddict = {}
        for orderitem in order.OrderItems:
            iddict[orderitem.ComponentID] = orderitem.ID
        # get the list of components used in the form
        componentslist = request.json_body.get('ComponentsList', [])
        # iterate through the new id's and add any new orders
        # remove the id from the list if it is there already
        for component in componentslist:
            if component['ID'] not in iddict.keys():
                # add the new order item
                quantity = float(component.get('quantity', 0))
                rate = component.get('rate', 0)
                rate = Decimal(rate).quantize(Decimal('.01'))

                neworderitem = OrderItem(OrderID=order.ID,
                                        ComponentID=component['ID'],
                                        _Quantity=quantity,
                                        _Rate = rate)
                DBSession.add(neworderitem)
            else:
                # otherwise remove the id from the list and update the
                # rate and quantity
                orderitemid = iddict[component['ID']]
                orderitem = DBSession.query(OrderItem).filter_by(
                                    ID=orderitemid).first()
                orderitem.Quantity = float(component['quantity'])
                rate = component['rate']
                orderitem.Rate = Decimal(rate).quantize(Decimal('.01'))
                del iddict[component['ID']]
        # delete the leftover id's
        for oldid in iddict.values():
            deletethis = DBSession.query(OrderItem).filter_by(ID=oldid).first()
            qry = DBSession.delete(deletethis)

        transaction.commit()
        # return the edited order
        order = DBSession.query(
                    Order).filter_by(ID=request.matchdict['id']).first()
        order.resetTotal()
        # update the component ordered amounts
        for orderitem in order.OrderItems:
            orderitem.Component.Ordered = orderitem.Total
        return order.toDict()

    # otherwise return the selected order
    orderid = request.matchdict['id']
    order = DBSession.query(Order).filter_by(ID=orderid).first()
    # build a list of the components used in the order from the order items
    componentslist = []
    for orderitem in order.OrderItems:
        if orderitem.Component:
            componentslist.append(orderitem.toDict())

    componentslist = sorted(componentslist, key=lambda k: k['name'])
    # get the date in json format
    jsondate = None
    if order.Date:
        jsondate = order.Date.isoformat()
    total = ''
    if order.Total:
        total = str(order.Total)
    taxrate = order.TaxRate > 0

    return {'ID': order.ID,
            'ProjectID': order.ProjectID,
            'SupplierID': order.SupplierID,
            'ClientID': order.ClientID,
            'Total': total,
            'TaxRate': taxrate,
            'ComponentsList': componentslist,
            'Date': jsondate}


@view_config(route_name='usersview', renderer='json')
def usersview(request):
    if request.method == 'POST':
        # Create a new user
        username = request.json_body['username']
        password = request.json_body['password']
        roles = request.json_body.get('roles', [])

        # Check for existing user
        if DBSession.query(User).filter(User.username==username).count() > 0:
            return HTTPConflict('user exists')

        # createuser
        user = User()
        user.username = username
        user.set_password(password)

        # Ensure only valid roles can be specified
        roles = [role for role in roles if role in (Administrator, Manager)]
        user.roles = json.dumps(roles)

        DBSession().merge(user)

        return {
            'username': user.username,
            'roles': roles
        }

    users = DBSession().query(User).all()
    return [
        {
            'username': user.username,
            'roles': user.roles and json.loads(user.roles) or []
        } for user in users]


@view_config(route_name='userview', renderer='json')
def userview(request):
    username = request.matchdict['username']
    session = DBSession()

    try:
        user = session.query(User).filter(User.username==username).one()
    except NoResultFound:
        return HTTPNotFound('No such user')

    if request.method == 'POST':
        password=request.json_body['password']
        roles = request.json_body.get('roles', None)
        if password:
            user.set_password(password)
        if roles is not None:
            # Ensure only valid roles can be specified
            roles = [role for role in roles if role in (Administrator, Manager)]
            user.roles = json.dumps(roles)

    elif request.method == 'DELETE':
        session.delete(user)
        return {}

    return {
        'username': user.username,
        'roles': user.roles and json.loads(user.roles) or []
    }


@view_config(route_name='invoicesview', renderer='json')
def invoicesview(request):
    """ The invoicesview returns a list in json format of all the invoices
    """
    invoicelist = []
    qry = DBSession.query(Invoice).order_by(Invoice.InvoiceNumber).all()
    for invoice in qry:
        invoicelist.append(invoice.toDict())
    return invoicelist


@view_config(route_name='invoiceview', renderer='json')
def invoiceview(request):
    """ The invoiceview handles different cases for individual invoices
        depending on the http method
    """
    # if the method is delete, delete the invoice
    if request.method == 'DELETE':
        deleteid = request.matchdict['id']
        # Deleting it from the table deletes the object
        deletethis = DBSession.query(Invoice).filter_by(ID=deleteid).first()

        # update the component invoiced amounts
        order = DBSession.query(Order).filter_by(ID=deletethis.OrderID).first()
        for orderitem in order.OrderItems:
            orderitem.Component.Invoiced = 0

        qry = DBSession.delete(deletethis)
        if qry == 0:
            return HTTPNotFound()
        transaction.commit()

        return HTTPOk()

    # if the method is post, add a new invoice
    if request.method == 'POST':
        orderid = request.json_body['orderid']
        invoicenumber = request.json_body['invoicenumber']
        # convert to date from json format
        date = request.json_body.get('date', None)
        try:
            date = datetime.strptime(date, '%Y-%m-%dT%H:%M:%S.%fZ')
        except:
            date = None
        amount = request.json_body.get('amount', Decimal(0.00))
        amount = Decimal(amount).quantize(Decimal('.01'))
        paid = request.json_body.get('paid', False)
        print paid

        newinvoice = Invoice(OrderID=orderid,
                            InvoiceNumber=invoicenumber,
                            Date=date,
                            Amount=amount,
                            Paid=paid)
        DBSession.add(newinvoice)
        DBSession.flush()
        newid = newinvoice.ID
        # update the component invoiced amounts
        order = DBSession.query(Order).filter_by(ID=orderid).first()
        for orderitem in order.OrderItems:
            if order.Total > 0:
                proportion = orderitem.Total/order.Total
                orderitem.Component.Invoiced = amount * proportion
            else:
                orderitem.Component.Invoiced = 0
        transaction.commit()
        # return the new invoice
        newinvoice = DBSession.query(Invoice).filter_by(ID=newid).first()
        return newinvoice.toDict()

    # if the method is put, edit an existing invoice
    if request.method == 'PUT':
        invoice = DBSession.query(
                    Invoice).filter_by(ID=request.matchdict['id']).first()

        date = request.json_body.get('date', None)
        try:
            date = datetime.strptime(date, '%Y-%m-%dT%H:%M:%S.%fZ')
        except:
            date = None
        amount = request.json_body.get('amount', Decimal(0.00))
        amount = Decimal(amount).quantize(Decimal('.01'))
        paid = request.json_body.get('paid', False)

        invoice.Date = date
        oldamount = invoice.Amount
        invoice.Amount = amount
        invoice.Paid = paid

        # if the amounts are different update the invoiced amounts
        if oldamount != amount:
            order = DBSession.query(Order).filter_by(ID=invoice.OrderID).first()
            for orderitem in order.OrderItems:
                if order.Total > 0:
                    proportion = orderitem.Total/order.Total
                    orderitem.Component.Invoiced = amount * proportion
                else:
                    orderitem.Component.Invoiced = 0
        transaction.commit()
        # return the edited invoice
        invoice = DBSession.query(
                    Invoice).filter_by(ID=request.matchdict['id']).first()
        return invoice.toDict()

    # otherwise return the selected invoice
    invoiceid = request.matchdict['id']
    invoice = DBSession.query(Invoice).filter_by(ID=invoiceid).first()

    return invoice.toDict()
