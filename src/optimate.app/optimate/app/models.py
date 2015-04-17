"""Models file contains resources used in the project
"""

from zope.sqlalchemy import ZopeTransactionExtension
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.ext.hybrid import hybrid_property
from decimal import *
import sqlalchemy.types as types

from sqlalchemy import (
    Table,
    Column,
    Index,
    Integer,
    Float,
    Text,
    ForeignKey,
    ForeignKeyConstraint,
)

from sqlalchemy.orm import (
    scoped_session,
    sessionmaker,
    relationship,
    backref,
)

# Build the session and base used for the project
DBSession = scoped_session(
    sessionmaker(extension=ZopeTransactionExtension('changed')))
Base = declarative_base()

class SqliteNumeric(types.TypeDecorator):
    impl = types.String
    def load_dialect_impl(self, dialect):
        return dialect.type_descriptor(types.VARCHAR(100))
    def process_bind_param(self, value, dialect):
        return str(value)
    def process_result_value(self, value, dialect):
        if value != "None":
            return Decimal(value)
        else:
            return None

Numeric = SqliteNumeric

class Node(Base):

    """ The Node class is an extrapolation of the objects used in this hierarchy
        It has ID and ParentID attributes, the ParentID refers back to the ID
        of it's parent node.
        The ID of the node is generated by default using UUID.
        It also has a Children-Parent relationship attribute.
    """

    __tablename__ = 'Node'
    ID = Column(Integer, primary_key=True)
    ParentID = Column(Integer, ForeignKey('Node.ID', ondelete='CASCADE'))
    OrderCost = Column(Numeric(12, 2), default=Decimal(0.00))
    ClaimedCost = Column(Numeric(12, 2), default=Decimal(0.00))
    RunningCost=Column(Numeric(12, 2), default=Decimal(0.00))
    IncomeRecieved=Column(Numeric(12, 2), default=Decimal(0.00))
    ClientCost=Column(Numeric(12, 2), default=Decimal(0.00))
    ProjectedProfit=Column(Numeric(12, 2), default=Decimal(0.00))
    ActualProfit=Column(Numeric(12, 2), default=Decimal(0.00))
    type = Column(Text(50))

    Children = relationship('Node',
                            cascade='all',
                            backref=backref('Parent', remote_side='Node.ID'),
                            )

    __mapper_args__ = {
        'polymorphic_identity': 'Node',
        'polymorphic_on': type
    }

    def getProjectID(self):
        parent = self.Parent
        if parent.ID == 0:
            return self.ID
        else:
            return parent.getProjectID()

    def __repr__(self):
        return '<Node(ID="%s", ParentID="%s")>' % (self.ID, self.ParentID)


class Project(Node):
    """ A table representing a Project in Optimate, it has an ID, Name,
        Description and ParentID that is the ID of its parent.
        It inherits from Node, and it's ID is linked to Node.ID
        It has copy and paste functions.
        It's total, ordered, and claimed attributes have properties that fire
        events
    """
    __tablename__ = 'Project'
    ID = Column(Integer,
                ForeignKey('Node.ID', ondelete='CASCADE'),
                primary_key=True)
    Name = Column(Text)
    Description = Column(Text)
    _Total = Column('Total', Numeric)

    __mapper_args__ = {
        'polymorphic_identity': 'Project',
        'inherit_condition': (ID == Node.ID),
    }

    def recalculateTotal(self):
        """recursively recalculate the total of all the node in the hierarchy
        """
        total = Decimal(0.00)
        for child in self.Children:
            total += child.recalculateTotal()
        self._Total = total.quantize(Decimal('.01'))
        return total

    def resetTotal(self):
        """return the sum of the totals of this node's children
        """
        total = Decimal(0.00)
        for child in self.Children:
            total += child.Total
        self._Total = total.quantize(Decimal('.01'))

    @hybrid_property
    def Total(self):
        """Get property total. If the Total has not been set yet, it is set to
           zero and recalculated
        """
        if self._Total == None:
            self.resetTotal()
        return self._Total.quantize(Decimal('.01'))

    @Total.setter
    def Total(self, total):
        """ Set total property.
        """
        self._Total = Decimal(total).quantize(Decimal('.01'))

    def copy(self, parentid):
        """copy returns an exact duplicate of this object,
        but with the ParentID specified.
        """
        copied = Project(Name=self.Name,
                         Description=self.Description,
                         ParentID=parentid,
                         _Total = self.Total,
                         OrderCost=self.OrderCost,
                         ClaimedCost=self.ClaimedCost,
                         RunningCost=self.RunningCost,
                         IncomeRecieved=self.IncomeRecieved,
                         ClientCost=self.ClientCost,
                         ProjectedProfit=self.ProjectedProfit,
                         ActualProfit=self.ActualProfit)

        return copied

    def paste(self, source, sourcechildren):
        """paste appends a source object to the children of this node,
           and then recursively does the same with each child of the source object.
           Reset the total when done.
        """
        self.Children.append(source)
        for child in sourcechildren:
            # The resource category is not pasted
            if child.type != 'ResourceCategory':
                source.paste(child.copy(source.ID), child.Children)
        self.resetTotal()

    def getComponents(self):
        """Returns a list of all the Components that are used in this
           project. The components are retrieved from the children of this project
        """
        componentlist = []
        for child in self.Children:
            if child.type != 'ResourceCategory':
                componentlist += child.getComponents()
        return componentlist

    def toDict(self):
        if len(self.Children) == 0:
            subitem = []
        else:
            subitem = [{'Name':''}]
        return {'name': self.Name,
                'budg_cost': self.Total,
                'order_cost': self.OrderCost,
                'run_cost': self.RunningCost,
                'claim_cost': self.ClaimedCost,
                'income_rec': self.IncomeRecieved,
                'client_cost': self.ClientCost,
                'proj_profit': self.ProjectedProfit,
                'act_profit': self.ActualProfit}

    def getGridData(self):
        return {'name': self.Name,
                'id': self.ID,
                'node_type': self.type,
                'budg_cost': str(self.Total),
                'order_cost': str(self.OrderCost),
                'run_cost': str(self.RunningCost),
                'claim_cost': str(self.ClaimedCost),
                'income_rec': str(self.IncomeRecieved),
                'client_cost': str(self.ClientCost),
                'proj_profit': str(self.ProjectedProfit),
                'act_profit': str(self.ActualProfit)}

    def __repr__(self):
        """ Return a representation of this project
        """
        return '<Project(Name="%s", ID="%s", ParentID="%s")>' % (
            self.Name, self.ID, self.ParentID)


class BudgetGroup(Node):
    """ A table representing a BudgetGroup in Optimate, it has an ID, Name,
        Description and ParentID that is the ID of its parent.
        It inherits from Node, and it's ID is linked to Node.ID
        It has copy and paste functions.
    """
    __tablename__ = 'BudgetGroup'
    ID = Column(Integer,
                ForeignKey('Node.ID', ondelete='CASCADE'), primary_key=True)
    Description = Column(Text)
    Name = Column(Text)
    _Total = Column('Total', Numeric)

    __mapper_args__ = {
        'polymorphic_identity': 'BudgetGroup',
        'inherit_condition': (ID == Node.ID),
    }

    def recalculateTotal(self):
        """recursively recalculate the total of all the node in the hierarchy
        """
        total = Decimal(0.00)
        for child in self.Children:
            total += child.recalculateTotal()
        self._Total = total.quantize(Decimal('.01'))
        return total

    def resetTotal(self):
        """return the sum of the totals of this node's children
        """
        total = Decimal(0.00)
        for child in self.Children:
            total += child.Total
        self.Total = total.quantize(Decimal('.01'))

    @hybrid_property
    def Total(self):
        """Get the total property, reset the Total if it is None
        """
        if self._Total == None:
            self.resetTotal()
        return self._Total.quantize(Decimal('.01'))

    @Total.setter
    def Total(self, total):
        """ When the total is changed the parent's total is updated.
            If the total is none it is completely recalculated.
        """
        if self._Total == None:
            self.recalculateTotal()
        oldtotal = self.Total
        self._Total = total.quantize(Decimal('.01'))
        difference = total - oldtotal

        # update the parent with the new total
        parent = self.Parent
        if parent._Total == None:
            parent.resetTotal()
        else:
            parent.Total = parent.Total + difference

    def copy(self, parentid):
        """copy returns an exact duplicate of this object,
           but with the ParentID specified.
        """
        copied = BudgetGroup(Name=self.Name,
                             Description=self.Description,
                             ParentID=parentid,
                             _Total = self.Total,
                             OrderCost=self.OrderCost,
                             ClaimedCost=self.ClaimedCost,
                             RunningCost=self.RunningCost,
                             IncomeRecieved=self.IncomeRecieved,
                             ClientCost=self.ClientCost,
                             ProjectedProfit=self.ProjectedProfit,
                             ActualProfit=self.ActualProfit)

        return copied

    def paste(self, source, sourcechildren):
        """paste appends a source object to the children of this node,
        and then recursively does the same with each child of the source object.
        Reset the total when done
        """
        self.Children.append(source)
        for child in sourcechildren:
            # The resource category is not pasted
            if child.type != 'ResourceCategory':
                source.paste(child.copy(source.ID), child.Children)
        self.resetTotal()

    def getComponents(self):
        """Returns a list of all the Components that are used in this
           budgetgroup. The components are retrieved from it's children and
           and any component that is it's child
        """
        componentlist = []
        for child in self.Children:
            if child.type == 'Component':
                componentlist += [child]
            componentlist += child.getComponents()
        return componentlist

    def toDict(self):
        if len(self.Children) == 0:
            subitem = []
        else:
            subitem = [{'Name':''}]
        return {'name': self.Name,
                'budg_cost': self.Total,
                'order_cost': self.OrderCost,
                'run_cost': self.RunningCost,
                'claim_cost': self.ClaimedCost,
                'income_rec': self.IncomeRecieved,
                'client_cost': self.ClientCost,
                'proj_profit': self.ProjectedProfit,
                'act_profit': self.ActualProfit}

    def getGridData(self):
        return {'name': self.Name,
                'id': self.ID,
                'node_type': self.type,
                'budg_cost': str(self.Total),
                'order_cost': str(self.OrderCost),
                'run_cost': str(self.RunningCost),
                'claim_cost': str(self.ClaimedCost),
                'income_rec': str(self.IncomeRecieved),
                'client_cost': str(self.ClientCost),
                'proj_profit': str(self.ProjectedProfit),
                'act_profit': str(self.ActualProfit)}

    def __repr__(self):
        """Return a representation of this budgetgroup
        """
        return '<BudgetGroup(Name="%s", ID="%s", ParentID="%s")>' % (
            self.Name, self.ID, self.ParentID)


class BudgetItem(Node):
    """A table representing a BudgetItem in Optimate, it has an ID, Name,
       Description, Quantity, Rate and ParentID that is the ID of its parent.
    """
    __tablename__ = 'BudgetItem'
    ID = Column(Integer,
                ForeignKey('Node.ID', ondelete='CASCADE'),
                primary_key=True)
    Description = Column(Text)
    Name = Column(Text)
    Unit = Column(Text)
    _Quantity = Column('Quantity', Float)
    _Rate = Column('Rate', Numeric)
    _Total = Column('Total', Numeric)
    _Markup = Column('Markup', Float, default=0.0)

    __mapper_args__ = {
        'polymorphic_identity': 'BudgetItem',
        'inherit_condition': (ID == Node.ID),
    }

    def recalculateTotal(self):
        """recursively recalculate the total of all the nodes in the hierarchy
        """
        rate = Decimal(0.00)
        for child in self.Children:
            rate += child.recalculateTotal()
        self._Rate = rate.quantize(Decimal('.01'))
        self._Total = Decimal((1.0+self.Markup) * self.Quantity).quantize(Decimal('.01')) * self.Rate
        return self.Total

    def resetTotal(self):
        """the rate of a budgetitem is based on the totals of it's children
           and the total is equal to rate * quantity. The rate is reset, the
           total recalculated and returned
        """
        rate = Decimal(0.00)
        for child in self.Children:
            rate += child.Total
        self._Rate = rate.quantize(Decimal('.01'))
        self.Total = Decimal((1.0+self.Markup) * self.Quantity).quantize(Decimal('.01')) * self.Rate

    @hybrid_property
    def Total(self):
        """ Get the Total, if the Total is none it is reset
        """
        if self._Total == None:
            self.resetTotal()
        return self._Total.quantize(Decimal('.01'))

    @Total.setter
    def Total(self, total):
        """ Set the total, update the parent's Total with the difference
            between the old total and the new total
        """
        if self._Total == None:
            self.recalculateTotal()
        oldtotal = self.Total
        self._Total = Decimal(total).quantize(Decimal('.01'))
        difference = total - oldtotal

        # update the parent with the new total
        # since the total has changed, change the rate of any parent
        # budgetitems, and then others
        parent = self.Parent
        if parent.type == 'BudgetItem':
            parent.Rate = parent.Rate + difference
        else:
            if parent._Total == None:
                parent.resetTotal()
            else:
                parent.Total = parent.Total + difference

    @hybrid_property
    def Markup(self):
        """ Get the markup of this budgetitem
        """
        return self._Markup

    @Markup.setter
    def Markup(self, markup):
        """ Set the markup value, and change the total accordingly
        """
        self._Markup = markup
        self.Total = Decimal((1.0+self.Markup) * self.Quantity).quantize(Decimal('.01')) * self.Rate

    @hybrid_property
    def Rate(self):
        """ Get the Rate
        """
        if self._Rate == None:
            self.resetTotal()
        return self._Rate.quantize(Decimal('.01'))

    @Rate.setter
    def Rate(self, rate):
        """ Set the Rate and recalculate the total
        """
        self._Rate = Decimal(rate).quantize(Decimal('.01'))
        # when the rate changes recalculate the total
        self.Total = Decimal((1.0+self.Markup) * self.Quantity).quantize(Decimal('.01')) * self.Rate

    @hybrid_property
    def Quantity(self):
        """ Get the Quantity, if it is None set it to 0
        """
        if self._Quantity == None:
            self.Quantity = 0.0
        return self._Quantity

    @Quantity.setter
    def Quantity(self, quantity):
        """ Set the Quantity and recalculate the total
        """
        self._Quantity = quantity
        # when the quantity changes recalculate the total
        self.Total = Decimal((1.0+self.Markup) * self.Quantity).quantize(Decimal('.01')) * self.Rate

    def copy(self, parentid):
        """copy returns an exact duplicate of this object,
           but with the ParentID specified.
        """
        copied = BudgetItem(Name=self.Name,
                            Description=self.Description,
                            Unit=self.Unit,
                            ParentID=parentid,
                            _Quantity=self._Quantity,
                            _Rate=self._Rate,
                            _Total=self._Total,
                            _Markup=self._Markup,
                            OrderCost=self.OrderCost,
                            ClaimedCost=self.ClaimedCost,
                            RunningCost=self.RunningCost,
                            IncomeRecieved=self.IncomeRecieved,
                            ClientCost=self.ClientCost,
                            ProjectedProfit=self.ProjectedProfit,
                            ActualProfit=self.ActualProfit)

        return copied

    def paste(self, source, sourcechildren):
        """paste appends a source object to the children of this node,
            and then recursively does the same with each child of the source object.
            Reset the total when done
        """
        self.Children.append(source)
        for child in sourcechildren:
            # The resource category is not pasted
            if child.type != 'ResourceCategory':
                source.paste(child.copy(source.ID), child.Children)

        self.resetTotal()

    def getComponents(self):
        """Returns a list of all the Components that are used in this
           budgetitem. The components are retrieved from its children and any
           children that are components are added to it
        """
        componentlist = []
        for child in self.Children:
            if child.type == 'Component':
                componentlist += [child]
            componentlist += child.getComponents()
        return componentlist

    def toDict(self):
        """ Returns a dictionary of all the attributes of this object.
            If the object has any children a list with one element is added,
            otherwise only an empty list is added.
        """
        if len(self.Children) == 0:
            subitem = []
        else:
            subitem = [{'Name':''}]
        return {'name': self.Name,
                'budg_cost': self.Total,
                'order_cost': self.OrderCost,
                'run_cost': self.RunningCost,
                'claim_cost': self.ClaimedCost,
                'income_rec': self.IncomeRecieved,
                'client_cost': self.ClientCost,
                'proj_profit': self.ProjectedProfit,
                'act_profit': self.ActualProfit}

    def getGridData(self):
        """ Return the data needed for the slick grid in the
            required format
        """
        return {'name': self.Name,
                'id': self.ID,
                'node_type': self.type,
                'quantity': self.Quantity,
                'budg_cost': str(self.Total),
                'order_cost': str(self.OrderCost),
                'run_cost': str(self.RunningCost),
                'claim_cost': str(self.ClaimedCost),
                'income_rec': str(self.IncomeRecieved),
                'client_cost': str(self.ClientCost),
                'proj_profit': str(self.ProjectedProfit),
                'act_profit': str(self.ActualProfit)}

    def __repr__(self):
        """ return a representation of this budgetitem
        """
        return '<BudgetItem(Name="%s", ID="%s", ParentID="%s")>' % (
            self.Name, self.ID, self.ParentID)


class Component(Node):
    """A component represents a unique component in the project.
       It can be the child of a budgetitem
       It has a many-to-one relationship with Resource, which
       defines its Name, Description, and Rate.
       It has a column name Type defined by the table ComponentType.
    """
    __tablename__ = 'Component'
    ID = Column(Integer,
                ForeignKey('Node.ID', ondelete='CASCADE'),
                primary_key=True)
    ResourceID = Column(Integer, ForeignKey('Resource.ID'))
    Type = Column(Integer, ForeignKey('ComponentType.ID'))
    Unit = Column(Text)
    _Quantity = Column('Quantity', Float)
    _Total = Column('Total', Numeric)
    _Markup = Column('Markup', Float, default=0.0)

    Resource = relationship('Resource',
                            foreign_keys='Component.ResourceID',
                            backref='Components')

    __mapper_args__ = {
        'polymorphic_identity': 'Component',
        'inherit_condition': (ID == Node.ID),
    }

    def recalculateTotal(self):
        """ Recalculate the total of this Component
        """
        self._Total = Decimal((1.0+self.Markup) * self.Quantity).quantize(Decimal('.01')) * self.Rate
        return self._Total

    def resetTotal(self):
        """The total of a component is based on its rate and quantity
        """
        self._Total = Decimal((1.0+self.Markup) * self.Quantity).quantize(Decimal('.01'))* self.Rate

    @hybrid_property
    def Total(self):
        """ Get the Total, if it is None reset it
        """
        if self._Total == None:
            self.resetTotal()
        return self._Total.quantize(Decimal('.01'))

    @Total.setter
    def Total(self, total):
        """ Set the Total and update the parent with the new value
        """
        if self._Total == None:
            self.resetTotal()
        oldtotal = self.Total
        self._Total = Decimal(total).quantize(Decimal('.01'))
        difference = total - oldtotal

        # since the total has changed, change the rate of any parent
        # components, budgetitems or others
        parent = self.Parent
        if parent.type == 'BudgetItem':
            parent.Rate = parent.Rate + difference
        else:
            if parent._Total == None:
                parent.resetTotal()
            else:
                parent.Total = parent.Total + difference

    @hybrid_property
    def Name(self):
        """ Get this Components Name, which returns the Resource's Name
        """
        return self.Resource.Name

    @Name.setter
    def Name(self, name):
        """ Set this Components Name, which sets the Resource's Name
        """
        self.Resource.Name = name

    @hybrid_property
    def Description(self):
        """ Get the Description property
        """
        return self.Resource.Description

    @Description.setter
    def Description(self, description):
        """ Set the Description property
        """
        self.Resource.Description = description

    @hybrid_property
    def Markup(self):
        """ Get the markup of this component
        """
        return self._Markup

    @Markup.setter
    def Markup(self, markup):
        """ Set the markup value, and change the total accordingly
        """
        self._Markup = markup
        self.Total = Decimal((1.0+self.Markup) * self.Quantity).quantize(Decimal('.01'))* self.Rate

    @hybrid_property
    def Rate(self):
        """ Get the component's Rate, the Rate of this resource is returned
        """
        return self.Resource.Rate

    @Rate.setter
    def Rate(self, rate):
        """ The rate of the component is set by it's resource
            It triggers a reset of the total
        """
        # change the total when the rate changes
        self.Total = Decimal((1.0+self.Markup) * self.Quantity).quantize(Decimal('.01'))* self.Rate

    @hybrid_property
    def Quantity(self):
        """ Get the Quantity, if it is None set it to 0
        """
        if self._Quantity == None:
            self._Quantity = 0.0
        return self._Quantity

    @Quantity.setter
    def Quantity(self, quantity):
        """ Set the Quantity and change the total
        """
        self._Quantity = quantity
        # change the total when the quantity changes
        self.Total = Decimal((1.0+self.Markup) * self.Quantity).quantize(Decimal('.01'))* self.Rate

    def copy(self, parentid):
        """ copy returns an exact duplicate of this object,
            but with the ParentID specified.
        """
        copied = Component(ResourceID=self.ResourceID,
                            Type=self.Type,
                            Unit=self.Unit,
                            ParentID=parentid,
                            _Quantity=self._Quantity,
                            _Total=self._Total,
                            _Markup=self._Markup,
                            OrderCost=self.OrderCost,
                            ClaimedCost=self.ClaimedCost,
                            RunningCost=self.RunningCost,
                            IncomeRecieved=self.IncomeRecieved,
                            ClientCost=self.ClientCost,
                            ProjectedProfit=self.ProjectedProfit,
                            ActualProfit=self.ActualProfit)

        return copied

    def paste(self, source, sourcechildren):
        """ Paste into this Component, since Components do not have children
            nothing is added to its Children and this function does nothing
        """
        pass

    def getComponents(self):
        """ Since a Component cannot contain any other components
            an empty list is returned
        """
        return []

    def toDict(self):
        """ Return a dictionary of all the attributes of this Components
        """
        return {'name': self.Name,
                'budg_cost': self.Total,
                'order_cost': self.OrderCost,
                'run_cost': self.RunningCost,
                'claim_cost': self.ClaimedCost,
                'income_rec': self.IncomeRecieved,
                'client_cost': self.ClientCost,
                'proj_profit': self.ProjectedProfit,
                'act_profit': self.ActualProfit}

    def getGridData(self):
        """ Return a dictionary of all the data needed for the slick grid
        """
        return {'name': self.Name,
                'id': self.ID,
                'node_type': self.type,
                'quantity': self.Quantity,
                'budg_cost': str(self.Total),
                'order_cost': str(self.OrderCost),
                'run_cost': str(self.RunningCost),
                'claim_cost': str(self.ClaimedCost),
                'income_rec': str(self.IncomeRecieved),
                'client_cost': str(self.ClientCost),
                'proj_profit': str(self.ProjectedProfit),
                'act_profit': str(self.ActualProfit)}

    def __repr__(self):
        """ return a representation of this component
        """
        return '<Co(Name="%s", ID="%s", ParentID="%s")>' % (
            self.Name, self.ID, self.ParentID)


class ComponentType(Base):
    """ ComponentType defines the different type of component
        It only has a unique ID and a name, it does not inherit from Node
        or form path of the project hierarchy
    """
    __tablename__ = 'ComponentType'
    ID = Column(Integer, primary_key=True)
    Name = Column(Text)

    Components = relationship('Component',
                              backref=backref('TypeOf'))

    def __repr__(self):
        return '<ComponentType(Name="%s", ID="%s")>' % (
            self.Name, self.ID)


class ResourceCategory(Node):
    """ ResourceCategory represents a unique set of resources used in a project
    """
    __tablename__ = 'ResourceCategory'
    ID = Column(Integer,
                ForeignKey('Node.ID', ondelete='CASCADE'),
                primary_key=True)
    Description = Column(Text)
    Name = Column(Text)
    # Total is just a dummy column for when a project is calculating its total
    _Total = Column('Total', Numeric(12, 2), default=Decimal(0.00))

    __mapper_args__ = {
        'polymorphic_identity': 'ResourceCategory',
        'inherit_condition': (ID == Node.ID),
    }

    def recalculateTotal(self):
        return Decimal(0.00)

    @hybrid_property
    def Total(self):
        return Decimal(0.00)

    @Total.setter
    def Total(self, total):
        pass

    def addResources(self, componentlist):
        """ Add a list of components to this ResourceCategory.
            The Resource is extracted from the component, tested if it is in
            the ResourceCategory, and appended
        """
        for component in componentlist:
            # add the resource to the category
            resource = component.Resource
            if resource not in self.Children:
                self.Children.append(resource)

    def addResource(self, resource):
        """ check if the resource is already in this category and add it if not
        """
        if resource not in self.Children:
            self.Children.append(resource)
            return True
        else:
            return False

    def toDict(self):
        """ Returns a dictionary of this ResourceCategory, which only contains
            its name and a list indicating it has children or not
        """
        return {'name': self.Name,
                'budg_cost': '-',
                'order_cost': '-',
                'run_cost': '-',
                'claim_cost': '-',
                'income_rec': '-',
                'client_cost': '-',
                'proj_profit': '-',
                'act_profit': '-'}

    def getGridData(self):
        """ Returns a dictionary with the data needed for the slick grid
        """
        return {'name': self.Name,
                'id': self.ID,
                'node_type': self.type,
                'budg_cost': '-',
                'order_cost': '-',
                'run_cost': '-',
                'claim_cost': '-',
                'income_rec': '-',
                'client_cost': '-',
                'proj_profit': '-',
                'act_profit': '-'}

    def __repr__(self):
        """Return a representation of this ResourceCategory
        """
        return '<ResourceCategory(Name="%s", ID="%s")>' % (
            self.Name, self.ID)


class Resource(Node):
    """ Resource represents a specific resource used in Optimate
        Each resource is unique and can be referenced by multiple Components
        Resource forms part of the Node hierarchy and has a ResourceCategory
        as it's parent.
        It has a _Rate attribute with a Rate property, when the Rate changes
        the component's Totals change as well
    """
    __tablename__ = 'Resource'
    ID = Column(Integer,
                ForeignKey('Node.ID', ondelete='CASCADE'),
                primary_key=True)
    Code = Column(Text)
    Name = Column(Text)
    Description = Column(Text)
    _Rate = Column('Rate', Numeric)

    __mapper_args__ = {
            'polymorphic_identity': 'Resource',
            'inherit_condition': (ID == Node.ID),
        }

    @hybrid_property
    def Rate(self):
        """ Get the Rate of the Resource
        """
        try:
            return self._Rate.quantize(Decimal('.01'))
        except:
            import pdb
            pdb.set_trace()

    @Rate.setter
    def Rate(self, rate):
        """ Set the Resource's rate and reset the Rate of all the component's
            that reference it
        """
        self._Rate = Decimal(rate).quantize(Decimal('.01'))
        for comp in self.Components:
            comp.Rate = self.Rate

    def __eq__(self, other):
        """Test for equality, for now testing based on the name
        """
        if other == None:
            return False
        else:
            return self.Name == other.Name

    def toDict(self):
        return {'name': self.Name,
                'budg_cost': '-',
                'order_cost': '-',
                'run_cost': '-',
                'claim_cost': '-',
                'income_rec': '-',
                'client_cost': '-',
                'proj_profit': '-',
                'act_profit': '-'}

    def getGridData(self):
        return {'name': self.Name,
                'id': self.ID,
                'node_type': self.type,
                'rate': str(self.Rate),
                'budg_cost': '-',
                'order_cost': '-',
                'run_cost': '-',
                'claim_cost': '-',
                'income_rec': '-',
                'client_cost': '-',
                'proj_profit': '-',
                'act_profit': '-'}

    def __repr__(self):
        """Return a representation of this resource
        """
        return '<Resource(Name="%s", Code="%s", Rate="%f", ID="%s")>' % (
            self.Name, self.Code, self.Rate, self.ID)


class Client(Base):
    """A table containing the data relavent to a client of Optimate
    """
    __tablename__ = 'Client'
    ID = Column(Integer, primary_key=True)
    Name = Column(Text)
    Address = Column(Text)
    City = Column(Text)
    StateProvince = Column(Text)
    Country = Column(Text)
    Zipcode = Column(Text)
    Phone = Column(Text)
    Fax = Column(Text)
    Cellular = Column(Text)
    Contact = Column(Text)

    def __repr__(self):
        """Return a representation of this client
        """
        return '<Client(Name="%s", ID="%s")>' % (
            self.Name, self.ID)


class Supplier(Base):
    """A table containing the data relavent to a supplier of Optimate
    """
    __tablename__ = 'Supplier'
    ID = Column(Integer, primary_key=True)
    Name = Column(Text)
    Address = Column(Text)
    City = Column(Text)
    StateProvince = Column(Text)
    Country = Column(Text)
    Zipcode = Column(Text)
    Phone = Column(Text)
    Fax = Column(Text)
    Cellular = Column(Text)
    Contact = Column(Text)

    def __repr__(self):
        """Return a representation of this supplier
        """
        return '<Supplier(Name="%s", ID="%s")>' % (
            self.Name, self.ID)

