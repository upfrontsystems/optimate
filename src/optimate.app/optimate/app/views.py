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
    Resource
)


@view_config(route_name="rootview", renderer='json')
@view_config(route_name="childview", renderer='json')
def childview(request):
    """
    This view is for when the user requests the children of an item.
    The parent's id is derived from the path of the request,
    or if there is no id in the path the root id '0' is assumed.
    It extracts the children from the object,
    adds it to a list and returns it to the JSON renderer
    in a format that is acceptable to angular.treeview
    """

    parentid = 0
    if 'parentid' in request.matchdict:
        parentid = request.matchdict['parentid']

    start = request.params.get('start')
    end = request.params.get('end')

    childrenlist = []

    # Execute the sql query on the Node table to find the parent
    qry = DBSession.query(Node).filter_by(ID=parentid).first()

    # Format the result into a json readable list and respond with that
    # for now display the resource category with its resources as well
    if qry != None:
        if qry.type == "ResourceCategory":
            for resource in qry.Resources:
                childrenlist.append(resource.toDict())
        else:
            for value in qry.Children:
                childrenlist.append(value.toDict())

    sorted_childrenlist = sorted(childrenlist, key=lambda k: k['Name'])

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
    """
    This view is for when the user requests the children of an item.
    The parent's id is derived from the path of the request,
    or if there is no id in the path the root id '0' is assumed.
    It extracts the children from the object,
    adds it to a list and returns it to the JSON renderer
    in a format that is acceptable to Slickgrid.
    """

    parentid = 0
    if 'parentid' in request.matchdict:
        parentid = request.matchdict['parentid']

    childrenlist = []
    # Execute the sql query on the Node table to find the parent
    qry = DBSession.query(Node).filter_by(ID=parentid).first()

    # Format the result into a json readable list and respond with that
    # for now display the resource category with its resources as well
    if qry != None:
        if qry.type == "ResourceCategory":
            for resource in qry.Resources:
                childrenlist.append(resource.toDict())
        else:
            for value in qry.Children:
                if value.toDict()['NodeType'] != "ResourceCategory":
                    childrenlist.insert(len(childrenlist), {
                    'name': value.toDict()['Name'],
                    'budg_cost': 'x',
                    'order_cost': value.toDict()['Ordered'],
                    'run_cost': 'x',
                    'claim_cost': value.toDict()['Claimed'],
                    'income_rec': 'x',
                    'client_cost': 'x',
                    'proj_profit': 'x',
                    'act_profit': 'x'})
                else:
                    childrenlist.insert(len(childrenlist), {
                    'name': value.toDict()['Name'],
                    'budg_cost': 'x',
                    'order_cost': 'x',
                    'run_cost': 'x',
                    'claim_cost': 'x',
                    'income_rec': 'x',
                    'client_cost': 'x',
                    'proj_profit': 'x',
                    'act_profit': 'x'})
    
    sorted_childrenlist = sorted(childrenlist, key=lambda k: k['name'])
    return sorted_childrenlist


@view_config(route_name="addview", renderer='json')
def additemview(request):
    """
    The additemview is called when an http POST request is sent from the client.
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
        desc = request.json_body['Description']
        objecttype = request.json_body['NodeType']

        newnode = None
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
            rate = float(request.json_body['Rate'])
            newnode = BudgetItem(Name=name,
                                 Description=desc,
                                 ParentID=parentid)
            newnode.Quantity = quantity
            # newnode.Rate = rate
        elif objecttype == 'component':
            # Components need to reference a Resource that already exists
            # in the system
            resource = DBSession.query(Resource).filter_by(Name=name).first()
            if resource == None:
                return HTTPNotFound('The resource does not exist')
            else:
                componenttype = int(request.json_body['ComponentType'])
                quantity = float(request.json_body['Quantity'])
                # rate = float(request.json_body['Rate'])
                newnode = Component(Name=name,
                                    Description=desc,
                                    Type=componenttype,
                                    ParentID=parentid)
                resource.Components.append(newnode)
                newnode.Quantity = quantity
                # newnode.Rate = rate

        else:
            return HTTPInternalServerError()

        DBSession.add(newnode)
        transaction.commit()

        # reset the total of the parent
        if parentid != 0:
            recalculate = DBSession.query(Node).filter_by(ID=parentid).first()
            recalculate.resetTotal()

        transaction.commit()

        return HTTPOk()


@view_config(route_name="deleteview", renderer='json')
def deleteitemview(request):
    """
    The deleteitemview is called using the address from the node to be deleted.
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
            recalculate = DBSession.query(Node).filter_by(ID=parentid).first()
            recalculate.resetTotal()

        transaction.commit()

        return HTTPOk()


@view_config(route_name="pasteview", renderer='json')
def pasteitemview(request):
    """
    The pasteitemview is sent the path of the node that is to be copied.
    That node is then found in the db, copied with the new parent's id,
    and added to the current node.
    """

    if request.method == 'OPTIONS':
        return {"success": True}
    else:
        # Find the source object to be copied from the path in the request body
        sourceid = request.json_body["Path"][1:-1]
        # Find the object to be copied to from the path
        destinationid = request.matchdict['id']

        # Set expire to false so that the list does not expire
        # DBSession.expire_on_commit = False

        source = DBSession.query(Node).filter_by(ID=sourceid).first()
        dest = DBSession.query(Node).filter_by(ID=destinationid).first()

        # Get a list of the components in the source
        componentlist = source.getComponents()
        # get the names of the components
        namelist = []
        for component in componentlist:
            namelist.insert(len(namelist), component.Name)
        # Get the ID of the project the destination is in
        projectid = dest.getProjectID()

        # Paste the source into the destination
        parentid = dest.ID
        dest.paste(source.copy(dest.ID), source.Children)
        transaction.commit()

        # Add the new resources to the destinations resource category
        resourcecategory = DBSession.query(
                        ResourceCategory).filter_by(ParentID=projectid).first()

        resourcecategory.addResources(namelist)

        # DBSession.expire_on_commit = True
        if parentid != 0:
            recalculate = DBSession.query(Node).filter_by(ID=parentid).first()
            recalculate.resetTotal()

        transaction.commit()

        return HTTPOk()


@view_config(route_name="costview", renderer='json')
def costview(request):
    """
    The costview is called using the address from the node to be costed.
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

        totalcost = qry.Total
        transaction.commit()

        return {'Cost': totalcost}


@view_config(route_name="testchangeview", renderer="json")
def testchangeview(request):
    """
    This is for testing purposes only. The rate of a component is changed
    so that its effect can be tested.
    """

    coid = request.matchdict['id']
    qry = DBSession.query(Component).filter_by(ID=coid).first()

    qry.Quantity = 10.0
    transaction.commit()

    return HTTPOk()
