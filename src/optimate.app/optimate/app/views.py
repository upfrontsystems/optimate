"""
views uses pyramid and sqlalchemy to recieve requests from a user
and send responses with appropriate data
"""

import transaction
from pyramid.view import view_config
from decimal import Decimal
import timeit

from pyramid.httpexceptions import (
    HTTPOk,
    HTTPFound,
    HTTPNotFound,
    HTTPInternalServerError,
)

from .models import (
    DBSession,
    Node,
    Project,
    BudgetGroup,
    BudgetItem,
    Component,
    ComponentType,
    ResourceCategory,
    Resource,
    Client,
    Supplier,
)


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
    start = request.params.get('start')
    end = request.params.get('end')

    qry = DBSession.query(Node).filter_by(ID=parentid).first()
    # build the list and only get the neccesary values
    if qry != None:
        if qry.type != 'ResourceCategory':
            for child in qry.Children:

                if child.type == 'ResourceCategory':
                    subitem = []
                else:
                    childqry = DBSession.query(
                                    Node).filter_by(ParentID=child.ID)
                    if childqry.count() > 0:
                        subitem = [{'Name': '...'}]
                    else:
                        subitem = []

                nodetypeabbr = ''
                if child.type == "Project":
                    nodetypeabbr = 'P'
                elif child.type == "Resource":
                    nodetypeabbr = 'R'
                elif child.type == "ResourceCategory":
                    nodetypeabbr = 'L'
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

    # return childrenlist
    sorted_childrenlist = sorted(childrenlist, key=lambda k: k['Name'])

    try:
        start = int(start)
        end = int(end)
    except Exception:
        return sorted_childrenlist

    if start >= 0 and end >= 0 and start <= end:
        return sorted_childrenlist[int(start):int(end)]

    return sorted_childrenlist


@view_config(route_name="project_listing", renderer='json')
def project_listing(request):
    """ Returns a list of all the Projects in the database
    """
    if request.method == 'OPTIONS':
        return {"success": True}
    else:
        projects = []
        # Get all the Projects in the Project table
        qry = DBSession.query(Project).all()
        # build the list and only get the neccesary values
        for project in qry:
            projects.append({'Name': project.Name,
                             'ID': project.ID})
        return sorted(projects, key=lambda k: k['Name'])


@view_config(route_name="resource_list", renderer='json')
def resource_list(request):
    """ Returns a list of all the resources in the
        node's project's resourcecategory
    """
    if request.method == 'OPTIONS':
        return {"success": True}
    else:
        nodeid = request.matchdict['id']
        resourcelist = []
        # Get the current node
        currentnode = DBSession.query(Node).filter_by(ID=nodeid).first()
        # Get the parent
        rootid = currentnode.getProjectID()
        # Get the resourcecategory whos parent that is
        resourcecategory = DBSession.query(
                                ResourceCategory).filter_by(ParentID=rootid).first()
        # build the list and only get the neccesary values
        for resource in resourcecategory.Children:
            if resource.type == 'Resource':
                resourcelist.append({'Name': resource.Name})
        return sorted(resourcelist, key=lambda k: k['Name'])


@view_config(route_name="resources", renderer='json')
def resources(request):
    """ Returns a list of all the unique resources in the database
    """
    if request.method == 'OPTIONS':
        return {"success": True}
    else:
        resources = []
        # Get all the unique Resources in the Resource table
        qry = DBSession.query(Resource.Name).distinct()
        # build the list and only get the neccesary values
        for resource in qry:
            resources.append({'Name': resource.Name})
        return sorted(resources, key=lambda k: k['Name'])


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

    # Get the griddata dict from each child and add it to the list
    for child in qry:
        childrenlist.append(child.getGridData())

    sorted_childrenlist = sorted(childrenlist, key=lambda k: k['name'])
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
            except ValueError:
                pass # do not do anything
        if request.params.get('markup') != None:
            try:
                result.Markup = (float(request.params.get('markup')))/100.0
            except ValueError:
                pass # do not do anything


@view_config(route_name="addview", renderer='json')
def additemview(request):
    """ The additemview is called when a POST request is sent from the client.
        The method adds a new node with attributes as specified by the user
        to the current node.
    """

    if request.method == 'OPTIONS':
        return {"success": True}
    else:
        # Get the parent to add the object to from the path
        parentid = int(request.matchdict['id'])
        # Get the data to be added to the new object from the request body
        name = request.json_body['Name']
        objecttype = request.json_body['NodeType']
        newid = 0

        # Determine the type of object to be added and build it
        if objecttype == 'Resource':
            rate = request.json_body['Rate']
            rate = Decimal(rate).quantize(Decimal('.01'))
            desc = request.json_body['Description']
            newnode = Resource(Name=name,
                                Description = desc,
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
        elif objecttype == 'ResourceCategory':
            desc = request.json_body['Description']
            newnode = ResourceCategory(Name=name,
                              Description=desc,
                              ParentID=parentid)

            DBSession.add(newnode)
            DBSession.flush()
            newid = newnode.ID
        else:
            if objecttype == 'Project':
                desc = request.json_body['Description']
                newnode = Project(Name=name,
                                  Description=desc,
                                  ParentID=parentid)
            elif objecttype == 'BudgetGroup':
                desc = request.json_body['Description']
                newnode = BudgetGroup(Name=name,
                                      Description=desc,
                                      ParentID=parentid)
            elif objecttype == 'BudgetItem':
                quantity = float(request.json_body['Quantity'])
                desc = request.json_body['Description']
                markup = float(request.json_body['Markup'])/100.0
                newnode = BudgetItem(Name=name,
                                     Description=desc,
                                     _Quantity = quantity,
                                     _Markup = markup,
                                     ParentID=parentid)
            elif objecttype == 'Component':
                # Components need to reference a Resource that already exists
                # in the system
                parent = DBSession.query(Node).filter_by(ID=parentid).first()
                rootparentid = parent.getProjectID()
                resourcecategory = DBSession.query(
                        ResourceCategory).filter_by(
                        ParentID=rootparentid).first()
                # if the resourcecategory does not exist create it
                try:
                    rescatid = resourcecategory.ID
                except AttributeError, a:
                    resourcecategory = ResourceCategory(Name='Resource List',
                                                Description='List of Resources',
                                                ParentID=rootparentid)
                    DBSession.add(resourcecategory)
                    DBSession.flush()
                    rescatid = resourcecategory.ID

                # get the resource used by the component
                resource = DBSession.query(
                                    Resource).filter_by(
                                    ParentID=rescatid, Name=name).first()
                # the resource does not exists in the resourcecategory
                if resource == None:
                    resource = DBSession.query(
                                        Resource).filter_by(Name=name).first()
                    if resource == None:
                        return HTTPNotFound("The resource does not exist")
                    else:
                        newresource = Resource(Name=resource.Name,
                                            Code=resource.Code,
                                            _Rate = resource.Rate,
                                            Description=resource.Description)
                        resourcecategory.Children.append(newresource)
                        DBSession.flush()
                        resource = newresource

                componenttype = int(request.json_body['ComponentType'])
                quantity = float(request.json_body['Quantity'])
                markup = float(request.json_body['Markup'])/100.0
                newnode = Component(ResourceID=resource.ID,
                                    Type=componenttype,
                                    _Quantity = quantity,
                                    _Markup = markup,
                                    ParentID=parentid)
            else:
                return HTTPInternalServerError()

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
def deleteitemview(request):
    """ The deleteitemview is called using
        the address from the node to be deleted.
        The node ID is sent in the request, and it is deleted from the tables.
    """

    if request.method == 'OPTIONS':
        return {"success": True}
    else:
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
def pasteitemview(request):
    """ The pasteitemview is sent the path of the node that is to be copied.
        That node is then found in the db, copied with the new parent's id,
        and added to the current node.
    """

    if request.method == 'OPTIONS':
        return {"success": True}
    else:
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
def costview(request):
    """ The costview is called using the address from the node to be costed.
        The node ID is sent in the request, and the total cost of that node
        is calculated recursively from it's children.
    """

    if request.method == 'OPTIONS':
        return {"success": True}
    else:
        # Get the id of the node to be costed
        costid = request.matchdict['id']
        qry = DBSession.query(Node).filter_by(ID=costid).first()

        if qry == None:
            return HTTPNotFound()
        totalcost = str(qry.Total)
        transaction.commit()

        return {'Cost': totalcost}


@view_config(route_name="company_information", renderer='json')
def company_information(request):
    """ Returns all company information data
    """
    if request.method == 'OPTIONS':
        return {"success": True}
    else:
        # XXX get the information from the database
        dummy_data = {'Name': 'TETIUS RABE PROPERTY SERVICES',
                      'Address': '173 KLEINBOS AVENUE, SOMERSET-WEST',
                      'Tel': '0218511572',
                      'Fax': '0218511572',
                      'Cell': '0832742643',
                      'Company Header': '',
                      'Order Header': '',
                      'Bank name': 'BOE BANK WORCESTER',
                      'Branch Code': '440-707',
                      'Account No': '2572658703',
                      'Account Name': 'TR Property Services',
                      'Default Taxrate': '14.00'}
        return dummy_data


@view_config(route_name='clientsview', renderer='json')
def clientsview(request):
    """ The clientview returns a list in json format of all the clients
        in the server database
    """

    if request.method == 'OPTIONS':
        return {"success": True}
    else:
        qry = DBSession.query(Client).order_by(Client.Name).all()
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
                                'Contact': client.Contact})
        return clientlist


@view_config(route_name='clientview', renderer='json')
def clientview(request):
    """ The clientview handles different cases of a single client
        depending on the http method
    """

    if request.method == 'OPTIONS':
        return {"success": True}
    # if the method is delete, delete the client
    elif request.method == 'DELETE':
        deleteid = request.matchdict['id']

        # Deleting it from the node table deleted the object
        deletethis = DBSession.query(Client).filter_by(ID=deleteid).first()
        qry = DBSession.delete(deletethis)

        if qry == 0:
            return HTTPNotFound()
        transaction.commit()

        return HTTPOk()
    # if the method is post, add a new client
    elif request.method == 'POST':
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
    elif request.method == 'PUT':
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
    else:
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
def suppliersview(request):
    """ The supplierview returns a list in json format of all the suppliers
        in the server database
    """

    if request.method == 'OPTIONS':
        return {"success": True}
    else:
        qry = DBSession.query(Supplier).order_by(Supplier.Name).all()
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
        return supplierlist


@view_config(route_name='supplierview', renderer='json')
def supplierview(request):
    """ The supplierview handles different cases of a single supplier
        depending on the http method
    """

    if request.method == 'OPTIONS':
        return {"success": True}
    # if the method is delete, delete the client
    elif request.method == 'DELETE':
        deleteid = request.matchdict['id']

        # Deleting it from the node table deleted the object
        deletethis = DBSession.query(Supplier).filter_by(ID=deleteid).first()
        qry = DBSession.delete(deletethis)

        if qry == 0:
            return HTTPNotFound()
        transaction.commit()

        return HTTPOk()
    # if the method is post, add a new supplier
    elif request.method == 'POST':
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
    # if the method is put, edit an existing client
    elif request.method == 'PUT':
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
    # otherwise return the selected client
    else:
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
