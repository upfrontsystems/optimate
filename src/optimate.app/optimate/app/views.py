"""
views uses pyramid and sqlalchemy to recieve requests from a user
and send responses with appropriate data
"""

import transaction
from pyramid.view import view_config
from decimal import Decimal
import timeit
from sqlalchemy.sql import collate

from pyramid.httpexceptions import (
    HTTPOk,
    HTTPFound,
    HTTPNotFound,
    HTTPInternalServerError,
    HTTPMethodNotAllowed,
    HTTPBadRequest,
    HTTPUnauthorized
)

from optimate.app.security import create_token
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


def cors_options(wrapped):
    """ Decorator that looks for an OPTIONS http call and simply returns.
        This is then handled by the response event handler. """
    def wrapper(request):
        if request.method == 'OPTIONS':
            return {"success": True}
        return wrapped(request)
    wrapper.__doc__ = wrapped.__doc__
    wrapper.__name__ = wrapped.__name__
    return wrapper


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

    # TODO authenticate the user, if not
    # return HTTPUnauthorized('Authentication failed')

    # Create token and cache it
    token = create_token(request, username)

    return {
        "access_token": token,
    }


@view_config(route_name="rootview", renderer='json')
@view_config(route_name="childview", renderer='json')
def childview(request):
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
    start = request.params.get('start')
    end = request.params.get('end')

    qry = DBSession.query(Node).filter_by(ID=parentid).first()
    # build the list and only get the neccesary values
    if qry != None:
        for child in qry.Children:
            if child.type == 'ResourceCategory':
                subitem = []
                if len(child.Children) > 0:
                    subitem = [{'Name': '...'}]

                nodetypeabbr = 'C'
                resourcecategories.append({
                    'Name': child.Name,
                    'Description': child.Description,
                    'ID': child.ID,
                    'Subitem': subitem,
                    'NodeType': child.type,
                    'NodeTypeAbbr' : nodetypeabbr
                    })
            else:
                subitem = []
                if len(child.Children) > 0:
                    subitem = [{'Name': '...'}]

                nodetypeabbr = ''
                if child.type == "Project":
                    nodetypeabbr = 'P'
                elif child.type == "Resource":
                    nodetypeabbr = 'R'
                elif child.type == "BudgetItem":
                    nodetypeabbr = 'I'
                elif child.type == "BudgetGroup":
                    nodetypeabbr = 'G'
                elif child.type == "Component":
                    nodetypeabbr = 'C'

                childrenlist.append({
                    'Name': child.Name,
                    'Description': child.Description,
                    'ID': child.ID,
                    'Subitem': subitem,
                    'NodeType': child.type,
                    'NodeTypeAbbr' : nodetypeabbr
                    })

    # sort childrenlist
    sorted_childrenlist = sorted(childrenlist, key=lambda k: k['Name'].upper())
    # sort categories
    sorted_categories = sorted(resourcecategories, key=lambda k: k['Name'].upper())

    completelist = sorted_categories + sorted_childrenlist

    try:
        start = int(start)
        end = int(end)
    except Exception:
        return completelist

    if start >= 0 and end >= 0 and start <= end:
        return completelist[int(start):int(end)]

    return completelist


@view_config(route_name="getitem", renderer='json')
@cors_options
def getitem(request):
    """ Retrieves and returns all the information of a single item
    """
    nodeid = parentid = request.matchdict['id']
    qry = DBSession.query(Node).filter_by(ID=nodeid).first()
    return qry.toDict()


@view_config(route_name="project_listing", renderer='json')
@cors_options
def project_listing(request):
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


@view_config(route_name="resource_list", renderer='json')
@cors_options
def resource_list(request):
    """ Returns a list of all the resources in the
        node's project's resourcecategory in a format
        that the related items widget can read
    """
    nodeid = request.matchdict['id']
    resourcelist = []
    # Get the current node
    currentnode = DBSession.query(Node).filter_by(ID=nodeid).first()
    # Get the parent
    rootid = currentnode.getProjectID()
    # Get the resourcecategory whos parent that is
    resourcecategory = DBSession.query(
                            ResourceCategory).filter_by(
                            ParentID=rootid).first()
    # if it doesnt exist return the empty list
    if not resourcecategory:
        return resourcelist

    data = resourcecategory.getResourcesDetail()
    resourcelist = {"http://127.0.0.1:8100": {
                        "parent_url": "",
                        "path": [ {"url": "http://127.0.0.1:8100"} ],
                        "upload_allowed": 'false',
                        "items": sorted(data, key=lambda k: k['title'].upper())
                        }
                    }
    return resourcelist


@view_config(route_name="resourcetypes", renderer='json')
@cors_options
def resourcetypes(request):
    """ Returns a list of all the resource types in the database
    """
    restypelist = []
    # Get all the unique Resources in the Resource table
    qry = DBSession.query(ResourceType).all()
    # build the list and only get the neccesary values
    for restype in qry:
        restypelist.append({'Name': restype.Name})
    return sorted(restypelist, key=lambda k: k['Name'].upper())


@view_config(route_name="component_overheads", renderer='json')
@cors_options
def componentoverheads(request):
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


@view_config(route_name="overhead_list", renderer='json')
@cors_options
def overheadlist(request):
    """ Perform operations on the Overhead table table depending on the method
    """
    if request.method == 'GET':
        projectid = request.matchdict['id']
        overheadlist = []
        # Get all the unique Resources in the Resource table
        qry = DBSession.query(Overhead).filter_by(ProjectID=projectid)
        # build the list and only get the neccesary values
        for overhead in qry:
            overheadlist.append({'Name': overhead.Name,
                            'Percentage': overhead.Percentage*100.0,
                            'ID': overhead.ID})
        return sorted(overheadlist, key=lambda k: k['Name'].upper())
    elif request.method == 'DELETE':
        deleteid = request.matchdict['id']
        # Deleting it from the table deleted the object
        deletethis = DBSession.query(
            Overhead).filter_by(ID=deleteid).first()
        qry = DBSession.delete(deletethis)

        if qry == 0:
            return HTTPNotFound()
        transaction.commit()

        return HTTPOk()
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


@view_config(route_name="projectview", renderer='json')
def projectview(request):
    """ Return the project specified by the projectid
    """
    projectid = request.matchdict['projectid']

    project = []
    # Execute the sql query on the Node table to find the parent
    qry = DBSession.query(Project).filter_by(ID=projectid).first()
    # build the list and only get the neccesary values
    if qry != None:
        project.append({'Name': qry.Name,
                        'Description': qry.Description,
                        'ID': qry.ID,
                        'Subitem': [{'Name': '...'}],
                        'NodeType': qry.type,
                        'NodeTypeAbbr' : 'P'
                        })
    return project


@view_config(route_name="nodegridview", renderer='json')
def nodegridview(request):
    """ This view is for when the user requests the children of an item.
        The parent's id is derived from the path of the request,
        or if there is no id in the path the root id '0' is assumed.
        It extracts the children from the object,
        adds it to a list and returns it to the JSON renderer
        in a format that is acceptable to Slickgrid.
    """

    parentid = request.matchdict['parentid']

    childrenlist = []
    # Execute the sql query on the Node table to find the parent
    qry = DBSession.query(Node).filter_by(ParentID=parentid).all()

    # Filter out all the Budgetitems and Components
    # Test if the result is the same length as the query
    # Therefore there will be empty columns
    emptyresult = DBSession.query(Node).filter(Node.ParentID==parentid,
                                            Node.type != 'BudgetItem',
                                            Node.type != 'Component').all()
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
    return {'list':sorted_childrenlist, 'emptycolumns': emptycolumns}


@view_config(route_name="update_value", renderer='json')
def update_value(request):
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
    if result.type in ['Resource']:
        # update the data - only rate can be modified
        if request.params.get('rate') != None:
            try:
                result.Rate = float(request.params.get('rate'))
            except ValueError:
                pass # do not do anything
    elif result.type in ['BudgetItem', 'Component']:
        # update the data - only quantity and/or markup can be modified
        if request.params.get('quantity') != None:
            try:
                result.Quantity = float(request.params.get('quantity'))
                newtotal = str(result.Total)
                # return the new total
                return {'total': newtotal}
            except ValueError:
                pass # do not do anything


@view_config(route_name="addview", renderer='json')
@cors_options
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
    newid = 0
    newnode = None

    # Determine the type of object to be added and build it
    if objecttype == 'Resource':
        newnode = Resource(Name=name,
                            Description = desc,
                            UnitID=unit,
                            Type=resourcetype,
                            _Rate= rate,
                            ParentID=parentid)
        # check if the resource is not in the resource category
        resourcecategory = DBSession.query(
                ResourceCategory).filter_by(ID=parentid).first()
        if resourcecategory:
            if newnode in resourcecategory.Children:
                return HTTPInternalServerError()
        else:
            return HTTPInternalServerError()

        DBSession.add(newnode)
        DBSession.flush()
        newid = newnode.ID
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
        # check if the data has an ID key
        # this signals that an existing Component is being edited
        if 'ID' in request.json_body:
            editedcomp = DBSession.query(Component).filter_by(
                        ID=request.json_body['ID']).first()
            # if the name is diffrent get the new resource
            if editedcomp.Name != name:
                rootparentid = editedcomp.getProjectID()
                resourcecategory = DBSession.query(
                    ResourceCategory).filter_by(
                    ParentID=rootparentid).first()
                reslist = resourcecategory.getResources()
                new_list = [x for x in reslist if x.Name == name]
                # get the resource used by the component
                resource = new_list[0]
                editedcomp.Resource = resource
            editedcomp._Quantity=quantity
            editedcomp.Overheads[:] = []
            newid = editedcomp.ID
            DBSession.flush()

            # get the list of overheads used in the checkboxes
            checklist = request.json_body['OverheadList']
            newoverheads = []
            for record in checklist:
                if record['selected']:
                    overheadid = record['ID']
                    overhead = DBSession.query(
                                Overhead).filter_by(ID=overheadid).first()
                    newoverheads.append(overhead)
            editedcomp.Overheads = newoverheads
            editedcomp.resetTotal()
            transaction.commit()
        else:
            # Components need to reference a Resource
            # that already exists in the resource category
            parent = DBSession.query(Node).filter_by(
                    ID=parentid).first()
            rootparentid = parent.getProjectID()
            resourcecategory = DBSession.query(
                    ResourceCategory).filter_by(
                    ParentID=rootparentid).first()

            reslist = resourcecategory.getResources()
            new_list = [x for x in reslist if x.Name == name]
            # get the resource used by the component
            resource = new_list[0]

            newcomp = Component(ResourceID=resource.ID,
                                _Quantity = quantity,
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
    else:
        if objecttype == 'BudgetGroup':
            newnode = BudgetGroup(Name=name,
                            Description=desc,
                            ParentID=parentid)
        elif objecttype == 'BudgetItem':
            newnode = BudgetItem(Name=name,
                            Description=desc,
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


@view_config(route_name="deleteview", renderer='json')
@cors_options
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


@view_config(route_name="pasteview", renderer='json')
@cors_options
def pasteitemview(request):
    """ The pasteitemview is sent the path of the node that is to be copied.
        That node is then found in the db, copied with the new parent's id,
        and added to the current node.
    """

    # Find the source object to be copied from the path in the request body
    sourceid = request.json_body["ID"]
    # Find the object to be copied to from the path
    destinationid = request.matchdict['id']

    source = DBSession.query(Node).filter_by(ID=sourceid).first()

    # if the source is to be cut and pasted into the destination
    if request.json_body["cut"]:
        # set the source parent to the destination parent
        source.ParentID = destinationid
        transaction.commit()

        if destinationid != 0:
            reset = DBSession.query(
                    Node).filter_by(ID=destinationid).first()
            reset.resetTotal()
    else:
        dest = DBSession.query(Node).filter_by(ID=destinationid).first()

        if (source.type == 'ResourceCategory' or source.type == 'Resource'):
            # Paste the source into the destination
            parentid = dest.ID
            dest.paste(source.copy(dest.ID), source.Children)
        else:
            # Get a list of the components in the source
            componentlist = source.getComponents()

            # Get the ID of the project the destination is in
            projectid = dest.getProjectID()

            # Paste the source into the destination
            parentid = dest.ID
            dest.paste(source.copy(dest.ID), source.Children)

            # Add the new resources to the destinations resource category
            resourcecategory = DBSession.query(
                            ResourceCategory).filter_by(
                            ParentID=projectid).first()
            resourcecategory.addResources(componentlist)
            transaction.commit()

            if parentid != 0:
                reset = DBSession.query(Node).filter_by(ID=parentid).first()
                reset.resetTotal()

    transaction.commit()
    return HTTPOk()


@view_config(route_name="costview", renderer='json')
@cors_options
def costview(request):
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
@cors_options
def clientsview(request):
    """ The clientview returns a list in json format of all the clients
        in the server database
    """

    qry = DBSession.query(Client).all()
    clientlist = []

    for client in qry:
        clientlist.append({'Name': client.Name,
                            'ID': client.ID,
                            'Address': client.Address,
                            'City': client.City,
                            'StateProvince': client.StateProvince,
                            'Country': client.Country,
                            'Zipcode': client.Zipcode,
                            'Phone': client.Phone,
                            'Fax': client.Fax,
                            'Cellular': client.Cellular,
                            'Contact': client.Contact,
                            'VAT': client.VAT,
                            'RegNo': client.RegNo})
    return sorted(clientlist, key=lambda k: k['Name'].upper())


@view_config(route_name='clientview', renderer='json')
@cors_options
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
            City=request.json_body.get('City', ''),
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
        client.City=request.json_body.get('City', '')
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

    clientdict = {'Name': client.Name,
                    'ID': client.ID,
                    'Address': client.Address,
                    'City': client.City,
                    'StateProvince': client.StateProvince,
                    'Country': client.Country,
                    'Zipcode': client.Zipcode,
                    'Phone': client.Phone,
                    'Fax': client.Fax,
                    'Cellular': client.Cellular,
                    'Contact': client.Contact}
    return clientdict


@view_config(route_name='suppliersview', renderer='json')
@cors_options
def suppliersview(request):
    """ The supplierview returns a list in json format of all the suppliers
        in the server database
    """
    qry = DBSession.query(Supplier).all()
    supplierlist = []

    for supplier in qry:
        supplierlist.append({'Name': supplier.Name,
                            'ID': supplier.ID,
                            'Address': supplier.Address,
                            'City': supplier.City,
                            'StateProvince': supplier.StateProvince,
                            'Country': supplier.Country,
                            'Zipcode': supplier.Zipcode,
                            'Phone': supplier.Phone,
                            'Fax': supplier.Fax,
                            'Cellular': supplier.Cellular,
                            'Contact': supplier.Contact})
    return sorted(supplierlist, key=lambda k: k['Name'].upper())


@view_config(route_name='supplierview', renderer='json')
@cors_options
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
            City=request.json_body.get('City', ''),
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
        supplier.City=request.json_body.get('City', '')
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

    supplierdict = {'Name': supplier.Name,
                    'ID': supplier.ID,
                    'Address': supplier.Address,
                    'City': supplier.City,
                    'StateProvince': supplier.StateProvince,
                    'Country': supplier.Country,
                    'Zipcode': supplier.Zipcode,
                    'Phone': supplier.Phone,
                    'Fax': supplier.Fax,
                    'Cellular': supplier.Cellular,
                    'Contact': supplier.Contact}
    return supplierdict


@view_config(route_name="company_information", renderer='json')
@cors_options
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
        transaction.commit()
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
@cors_options
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
@cors_options
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
@cors_options
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
@cors_options
def cityview(request):
    """ The cityview handles different cases for cities
        depending on the http method
    """
    # if the method is delete, delete the city
    if request.method == 'DELETE':
        deleteid = request.matchdict['id']
        # Deleting it from the node table deletes the object
        deletethis = DBSession.query(City).filter_by(ID=deleteid).first()
        # only delete if this City is not in use by any Project
        if len(deletethis.Projects) == 0:
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
