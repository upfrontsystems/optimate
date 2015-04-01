"""
views uses pyramid and sqlalchemy to recieve requests from a user
and send responses with appropriate data
"""

import uuid
import transaction
from pyramid.view import view_config

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
    print "Getting children: ",
    parentid = 0
    if 'parentid' in request.matchdict:
        parentid = request.matchdict['parentid']

    childrenlist = []
    start = request.params.get('start')
    end = request.params.get('end')

    # Execute the sql query on the Node table to find the parent
    qry = DBSession.query(Node).filter_by(ID=parentid).first()
    # qry = DBSession.query(Node).filter_by(ParentID=parentid).order_by(Node.Name).all()

    # build the list and only get the neccesary values
    if qry != None:
        for value in qry.Children:
        # for value in qry:
            if value.Children:
                subitem = [{'Name': '...'}]
            else:
                subitem = []
            try:
                childrenlist.append({'Name': value.Name,
                                    'Description': value.Description,
                                    'ID': value.ID,
                                    'Subitem': subitem,
                                    'NodeType': value.type})
            except AttributeError, a:
                import pdb
                pdb.set_trace()

    # return childrenlist
    sorted_childrenlist = sorted(childrenlist, key=lambda k: k['Name'])

    print "done"
    try:
        start = int(start)
        end = int(end)
    except Exception:
        return sorted_childrenlist

    if start >= 0 and end >= 0 and start <= end:
        return sorted_childrenlist[int(start):int(end)]

    return sorted_childrenlist


@view_config(route_name="nodegridview", renderer='json')
def nodegridview(request):
    """ This view is for when the user requests the children of an item.
        The parent's id is derived from the path of the request,
        or if there is no id in the path the root id '0' is assumed.
        It extracts the children from the object,
        adds it to a list and returns it to the JSON renderer
        in a format that is acceptable to Slickgrid.
    """

    print "Getting grid data: ",
    parentid = 0
    if 'parentid' in request.matchdict:
        parentid = request.matchdict['parentid']

    childrenlist = []
    # Execute the sql query on the Node table to find the parent
    qry = DBSession.query(Node).filter_by(ID=parentid).first()

    # Add the todict version of each item to the list
    # the resource category is not shown in the grid
    if qry != None:
        for value in qry.Children:
            childrenlist.append(value.getGridData())

    sorted_childrenlist = sorted(childrenlist, key=lambda k: k['name'])

    print "done"
    return sorted_childrenlist


@view_config(route_name="update_value", renderer='json')
def update_value(request):
    """ This view recieves a node ID along with other data parameters on the
        request. It uses the node ID to select and update the node's
        corresponding data in the database. This new data is provided through
        request parameters.
        Only Resources, BudgetItems and Component type nodes can have their
        fields modified through this view, and only rate and quantity parameters
        can be updated this way.
    """
    nodeid = request.params.get('id')
    result = DBSession.query(Node).filter_by(ID=nodeid).first()
    if result.type in ['Resource', 'BudgetItem', 'Component']:
        # update the data - at the moment only rate and quantity can be modified
        if hasattr(result, 'rate'):
            result.rate = request.params.get('rate')
            transaction.commit()
        if hasattr(result, 'quantity'):
            result.rate = request.params.get('quantity')
            transaction.commit()


@view_config(route_name="addview", renderer='json')
def additemview(request):
    """ The additemview is called when a POST request is sent from the client.
        The method adds a new node with attributes as specified by the user
        to the current node.
    """

    if request.method == 'OPTIONS':
        return {"success": True}
    else:
        print "Adding node: ",
        # Get the parent to add the object to from the path
        parentid = int(request.matchdict['id'])

        # Get the data to be added to the new object from the request body
        name = request.json_body['Name']
        desc = request.json_body['Description']
        objecttype = request.json_body['NodeType']

        # Determine the type of object to be added and build it
        if objecttype == 'project':
            newnode = Project(Name=name,
                              Description=desc,
                              ParentID=parentid)
        elif objecttype == 'budgetgroup':
            newnode = BudgetGroup(Name=name,
                                  Description=desc,
                                  ParentID=parentid)
        elif objecttype == 'budgetitem':
            quantity = float(request.json_body['Quantity'])
            newnode = BudgetItem(Name=name,
                                 Description=desc,
                                 ParentID=parentid)
            newnode._Quantity = quantity
        elif objecttype == 'component':
            # Components need to reference a Resource that already exists
            # in the system
            parent = DBSession.query(Node).filter_by(ID=parentid).first()
            rootparentid = parent.getProjectID()
            resourcecategory = DBSession.query(
                    ResourceCategory).filter_by(ParentID=rootparentid).first()
            rescatid = resourcecategory.ID
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
                                            Description=resource.Description)
                    newresource._Rate = resource.Rate
                    resourcecategory.Children.append(newresource)
                    transaction.commit()
                    resource = DBSession.query(
                                Resource).filter_by(
                                ParentID=rescatid, Name=name).first()

            componenttype = int(request.json_body['ComponentType'])
            quantity = float(request.json_body['Quantity'])
            newnode = Component(ResourceID=resource.ID,
                                Type=componenttype,
                                ParentID=parentid)
            newnode._Quantity = quantity
        else:
            return HTTPInternalServerError()

        DBSession.add(newnode)
        transaction.commit()

        # reset the total of the parent
        if parentid != 0:
            recalculate = DBSession.query(Node).filter_by(ID=parentid).first()
            recalculate.resetTotal()

        transaction.commit()
        print "done"
        return HTTPOk()


@view_config(route_name="deleteview", renderer='json')
def deleteitemview(request):
    """ The deleteitemview is called using the address from the node to be deleted.
        The node ID is sent in the request, and it is deleted from the tables.
    """

    if request.method == 'OPTIONS':
        return {"success": True}
    else:
        print "Deleting node: ",
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
            recalculate = DBSession.query(Node).filter_by(ID=parentid).first()
            recalculate.resetTotal()

        transaction.commit()
        print "done"
        return HTTPOk()


@view_config(route_name="pasteview", renderer='json')
def pasteitemview(request):
    """ The pasteitemview is sent the path of the node that is to be copied.
        That node is then found in the db, copied with the new parent's id,
        and added to the current node.
    """

    if request.method == 'OPTIONS':
        return {"success": True}
    else:
        print "Pasting node: ",
        # Find the source object to be copied from the path in the request body
        sourceid = request.json_body["ID"]
        # Find the object to be copied to from the path
        destinationid = request.matchdict['id']

        # Set expire to false so that the list does not expire
        # DBSession.expire_on_commit = False

        source = DBSession.query(Node).filter_by(ID=sourceid).first()
        dest = DBSession.query(Node).filter_by(ID=destinationid).first()

        # Get a list of the components in the source
        componentlist = source.getComponents()

        # Get the ID of the project the destination is in
        projectid = dest.getProjectID()

        # Paste the source into the destination
        parentid = dest.ID
        dest.paste(source.copy(dest.ID), source.Children)
        # transaction.commit()

        # Add the new resources to the destinations resource category
        resourcecategory = DBSession.query(
                        ResourceCategory).filter_by(ParentID=projectid).first()

        resourcecategory.addResources(componentlist)

        # DBSession.expire_on_commit = True
        if parentid != 0:
            recalculate = DBSession.query(Node).filter_by(ID=parentid).first()
            recalculate.resetTotal()

        transaction.commit()
        print "done"
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
        print "Getting cost: ",
        # Get the id of the node to be costed
        costid = request.matchdict['id']
        qry = DBSession.query(Node).filter_by(ID=costid).first()

        if qry == None:
            return HTTPNotFound()

        totalcost = qry.Total
        transaction.commit()

        print "done"
        return {'Cost': totalcost}

@view_config(route_name='clientview', renderer='json')
def clientview(request):
    """ The clientview returns a list in json format of all the clients
        in the server database
    """

    if request.method == 'OPTIONS':
        return {"success": True}
    else:
        print "Get clients"
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
                                'Contact': client.Contact})
        print "done"
        return clientlist


@view_config(route_name='supplierview', renderer='json')
def supplierview(request):
    """ The supplierview returns a list in json format of all the suppliers
        in the server database
    """

    if request.method == 'OPTIONS':
        return {"success": True}
    else:
        print "Get suppliers"
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
        print "done"
        return supplierlist


@view_config(route_name="testchangequantityview", renderer="json")
def testchangequantityview(request):
    """ This is for testing purposes only. The quantity of a component is changed
        so that its effect can be tested.
    """

    coid = request.matchdict['id']
    qry = DBSession.query(Component).filter_by(ID=coid).first()

    qry.Quantity = 10.0
    transaction.commit()

    return HTTPOk()

@view_config(route_name="testchangerateview", renderer="json")
def testchangerateview(request):
    """ This is for testing purposes only. The rate of a resource is changed
        so that its effect can be tested.
    """

    projectid = request.matchdict['id']
    resourcecode = request.matchdict['resourcecode']
    resource = DBSession.query(Resource).filter_by(Code=resourcecode).first()

    resource.Rate = 15.0
    resource.Name = "newname"
    transaction.commit()

    return HTTPOk()
