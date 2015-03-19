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

def contains_unicode(mystring):
    """ auxilary method to determine if a string contains a unicode character
    """
    try:
        mystring.decode('ascii')
    except Exception:
        # not an ascii-encoded unicode string
        return True
    else:
        # an ascii-encoded unicode string
        return False


@view_config(route_name="rootview", renderer='json')
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

    childrenlist = []

    # Execute the sql query on the Node table to find the parent
    qry = DBSession.query(Node).filter_by(ID=parentid).first()

    # Format the result into a json readable list and respond with that
    # for now display the resource category with its resources as well
    if qry.type == "ResourceCategory":
        for resource in qry.Resources:
            childrenlist.insert(len(childrenlist), {
                "Name":resource.Name,
                "Description":resource.Description,
                "Subitem":[],
                "ID":resource.ID,
                "Path": "/" + str(resource.ID)+"/"})
    else:
        for value in qry.Children:
            print "\n\n"
            if contains_unicode(value.Name):
                if u"\u02c6" in value.Name:
                    value.Name = value.Name.replace(u"\u02c6", "e")
                if u"\u2030" in value.Name:
                    value.Name = value.Name.replace(u"\u2030", "e")
            childrenlist.insert(len(childrenlist), {
                "Name":value.Name,
                "Description":value.Description,
                "Subitem":[],
                "ID":value.ID,
                "Path": "/" + str(value.ID)+"/"})

    sorted_childrenlist = sorted(childrenlist, key=lambda k: k['Name'])
    return sorted_childrenlist


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
            newnode.Quantity=quantity
            newnode.Rate=rate
        elif objecttype == 'component':
            componenttype = int(request.json_body['ComponentType'])
            quantity = float(request.json_body['Quantity'])
            rate = float(request.json_body['Rate'])
            newnode = Component(Name=name,
                                    Description=desc,
                                    Type=componenttype,
                                    ParentID=parentid)
            newnode.Quantity=quantity
            newnode.Rate=rate

        else:
            return HTTPInternalServerError()

        DBSession.add(newnode)
        transaction.commit()

        # reset the total of the parent
        if parentid!=0:
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
        return {"success" : True}
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
        return {"success" : True}
    else:
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

        # print "resetting total"
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
        return {"success" : True}
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

    qry.Rate = 1
    transaction.commit()

    return HTTPOk()
