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
    )

test = 0

@view_config(route_name='rootview', renderer='json')
@view_config(route_name="childview", renderer='json')
def childview(request):
    """
    This view is for when the user requests the children of an item.
    The parent's id is derived from the path of the request,
    or if there is no id in the path the root id '0' is assumed.
    It extracts the children from the object,
    adds it to a list and returns it to the JSON renderer
    """

    parentid = 0
    if 'parentid' in request.matchdict:
        parentid = request.matchdict['parentid']

    print "\n\n\nIn Child view: "+ str(parentid)+"\n\n"
    childrenlist = []

    # Execute the sql query on the Node table to find all objects with that parent
    qry = DBSession.query(Node).filter_by(ParentID=parentid).all()
    # qry = DBSession.query(Node).filter_by(ID=parentid).first()

    # for value in qry.Children:
    #     childrenlist.insert(len(childrenlist), {
    #         "Name":value.Name,
    #         "Description":value.Description,
    #         "Subitem":[],
    #         "ID":value.ID,
    #         "Path": "/" + str(value.ID)+"/"})


    # Format the result into a json readable list and respond with that
    for value in qry:
        childrenlist.insert(len(childrenlist), {
            "Name":value.Name,
            "Description":value.Description,
            "Subitem":[],
            "ID":value.ID,
            "Path": "/" + str(value.ID)+"/"})

    return childrenlist


@view_config(route_name="addview", renderer='json')
def additemview(request):
    """
    The additemview is called when an http POST request is sent from the client.
    The method adds a new node with attributes as specified by the user
    to the current node.
    """

    if request.method == 'OPTIONS':
        return {"success" : True}
    else:
        # Get the parent to add the object to from the path
        parentid = request.matchdict['id']
        print "adding to item: " + str(parentid)

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
            quantity = request.json_body['Quantity']
            rate = request.json_body['Rate']
            newnode = BudgetItem(Name=name,
                                    Description=desc,
                                    ParentID=parentid,
                                    Quantity=quantity,
                                    Rate=rate)
        elif objecttype == 'component':
            componenttype = request.json_body['ComponentType']
            quantity = request.json_body['Quantity']
            rate = request.json_body['Rate']
            newnode = Component(Name=name,
                                    Description=desc,
                                    Type=componenttype,
                                    Quantity=quantity,
                                    Rate=rate,
                                    ParentID=parentid)
        else:
            return HTTPInternalServerError()

        DBSession.add(newnode)
        transaction.commit()
        temp = parentid
        print "\n\nBefore"
        print DBSession.query(Node).filter_by(ID=parentid).first().Total
        # bubble up recalculating the totals in the hierarchy
        while parentid!=0:
            recalculate = DBSession.query(Node).filter_by(ID=parentid).first()
            for child in recalculate.Children:
                child.recalculateTotal()
            parentid = recalculate.ParentID

        transaction.commit()
        print "\n\nAfter"
        print DBSession.query(Node).filter_by(ID=temp).first().Total

        return HTTPOk()

@view_config(route_name = "deleteview",renderer='json')
def deleteitemview(request):
    """
    The deleteitemview is called using the address from the node to be deleted.
    The node ID is sent in the request, and it is deleted from the tables.
    """

    if request.method == 'OPTIONS':
        return {"success" : True}
    else:
        # Get the id of the node to be deleted from the path
        deleteid = request.matchdict['id']
        print "\n\nDeleting node: " + str(deleteid) +"\n\n"

        # Deleting it from the node table deleted the object
        deletethis = DBSession.query(Node).filter_by(ID=deleteid).first()
        parentid = deletethis.ParentID
        qry = DBSession.delete(deletethis)

        if qry == 0:
            return HTTPNotFound()
        transaction.commit()
        # bubble up recalculating the totals in the hierarchy
        while parentid!=0:
            recalculate = DBSession.query(Node).filter_by(ID=parentid).first()
            recalculate.recalculateTotal()
            parentid = recalculate.ParentID

        transaction.commit()

        return HTTPOk()

@view_config(route_name = "pasteview", renderer='json')
def pasteitemview(request):
    """
    The pasteitemview is sent the path of the node that is to be copied.
    That node is then found in the db, copied with the new parent's id,
    and added to the current node.
    """

    if request.method == 'OPTIONS':
        return {"success" : True}
    else:
        print "pasting to item"
        # Find the source object to be copied from the path in the request body
        sourceid = request.json_body["Path"][1:-1]
        # Find the object to be copied to from the path
        destinationid = request.matchdict['id']

        source = DBSession.query(Node).filter_by(ID=sourceid).first()
        dest = DBSession.query(Node).filter_by(ID=destinationid).first()

        # Paste the source into the destination
        parentid = dest.ID
        dest.paste(source.copy(dest.ID), source.Children)
        transaction.commit()
        # bubble up recalculating the totals in the hierarchy
        while parentid!=0:
            recalculate = DBSession.query(Node).filter_by(ID=parentid).first()
            recalculate.recalculateTotal()
            parentid = recalculate.ParentID

        transaction.commit()

        return HTTPOk()


@view_config(route_name = "costview",renderer='json')
def costview(request):
    """
    The costview is called using the address from the node to be costed.
    The node ID is sent in the request, and the total cost of that node
    is calculated recursively from it's children.
    """

    if request.method == 'OPTIONS':
        return {"success" : True}
    else:
        print "costing"
        # Get the id of the node to be costed
        costid = request.matchdict['id']

        qry = DBSession.query(Node).filter_by(ID=costid).first()

        if qry == None:
            return HTTPNotFound()

        totalcost = qry.Total
        if totalcost == 0 or totalcost == None:
            totalcost = qry.recalculateTotal()
            if totalcost == 0:
                totalcost = qry.recalculateAll()

        transaction.commit()

        return {'Cost': totalcost}
