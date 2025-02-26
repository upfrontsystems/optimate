// controller for the Order data from the server
myApp.controller('ordersController', ['$scope', '$http', 'globalServerURL', '$timeout', 'SessionService', 'FileSaver',
    function($scope, $http, globalServerURL, $timeout, SessionService, FileSaver) {

        toggleMenu('orders');
        $scope.dateTimeNow = function() {
            var d = new Date();
            // create a timezone agnostic date by setting time info to 0 and timezone to UTC.
            date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0,0,0,0));
            $scope.date = date;
        };
        $scope.selectedOrders = [];
        $scope.isDisabled = false;
        $scope.isCollapsed = true;
        $scope.orderFormProjectsDisabled = false;
        $scope.jsonorders = [];
        $scope.budgetItemsList = [];
        $scope.invoiceList = [];
        $scope.selectedOrderingOn = {};
        // Pagination variables
        $scope.pageSize = 100;
        $scope.currentPage = 1;
        $scope.maxPageSize = 20;
        $scope.orderListLength = $scope.maxPageSize;
        $scope.filters = {};
        $scope.statusList = [{'Status': 'Draft'}, {'Status': 'Processed'}];
        // semaphore for the slickgrid spinner
        var semspinner = 0;
        var slickspinner = new Spinner();

        // get the user permissions
        $scope.user = {'username':SessionService.username()};
        SessionService.permissions().then(function(perm){
            $scope.user.permissions = perm;
        });
        // get the currency
        SessionService.get_currency().then(function(c){
            $scope.currency = c;
        })
        // get the company tax rate
        SessionService.get_tax_rate().then(function(c){
            $scope.taxRate = c;
        })

        // need two separate lists of suppliers
        // one used for filtering, one for adding an order
        $http.get(globalServerURL + 'suppliers')
        .success(function(data) {
            $scope.suppliersList = data;
            $scope.filteredSuppliersList = data;
        });

        // loading the project, client and supplier list
        $scope.clearFilters = function() {
            $scope.filters = {};
            $http.get(globalServerURL + 'projects/')
            .success(function(data) {
                $scope.allStates = data;
                $scope.projectsList = data;
            });

            $http.get(globalServerURL + 'clients')
            .success(function(data) {
                $scope.clientsList = data;
            });

            // get the length of the list of all the orders
            $http.get(globalServerURL + 'orders/length').success(function(data) {
                $scope.orderListLength = data['length'];
            });

            $scope.filteredSuppliersList = $scope.suppliersList;
        }
        $scope.projectsList = [];
        $scope.filteredSuppliersList = [];
        $scope.suppliersList = [];
        $scope.clientsList = [];
        $scope.clearFilters();

        $scope.loadOrderSection = function() {
            var start = ($scope.currentPage-1)*$scope.pageSize;
            var end = start + $scope.pageSize;
            var req = {
                method: 'GET',
                url: globalServerURL + 'orders',
                params: {'start':start,
                        'end': end,
                        'Project': $scope.filters.Project,
                        'Client': $scope.filters.Client,
                        'Supplier': $scope.filters.Supplier,
                        'OrderNumber': $scope.filters.OrderNumber,
                        'Status': $scope.filters.Status}
            };
            $http(req).success(function(response) {
                $scope.jsonorders = response['orders'];
                if (response['length']) {
                    $scope.orderListLength = response['length'];
                }
                console.log("Orders loaded");
            });
        }
        $scope.loadOrderSection();

        // filter the other filter options by selection
        $scope.filterBy = function(selection) {
            var req = {
                method: 'GET',
                url: globalServerURL + 'orders/filter',
                params: $scope.filters
            };
            $http(req).success(function(response) {
                if (selection == 'project') {
                    if ($scope.filters.Project == null) {
                        $scope.projectsList = response['projects'];
                    }
                    $scope.clientsList = response['clients'];
                    $scope.filteredSuppliersList = response['suppliers'];
                }
                else if (selection == 'client') {
                    if ($scope.filters.Client == null) {
                        $scope.clientsList = response['clients'];
                    }
                    $scope.projectsList = response['projects'];
                    $scope.filteredSuppliersList = response['suppliers'];
                }
                else if (selection == 'supplier') {
                    if ($scope.filters.Supplier == null) {
                        $scope.filteredSuppliersList = response['suppliers'];
                    }
                    $scope.clientsList = response['clients'];
                    $scope.projectsList = response['projects'];
                }
                else {
                    $scope.projectsList = response['projects'];
                    $scope.clientsList = response['clients'];
                    $scope.filteredSuppliersList = response['suppliers'];
                }
            })
        };

        // Adding or editing an order
        $scope.save = function() {
            // check if saving is disabled, if not disable it and save
            if (!$scope.isDisabled) {
                $scope.isDisabled = true;
                // set the list of checked budgetitems
                $scope.formData['BudgetItemsList'] = $scope.budgetItemsList;
                if ($scope.modalState == 'Edit') {
                    $http({
                        method: 'PUT',
                        url: globalServerURL + $scope.formData['NodeType'] + '/' + $scope.formData['ID'] + '/',
                        data: $scope.formData
                    }).success(function (response) {
                        // edit the order in the list
                        $scope.handleEdited(response);
                        $scope.formData = {'NodeType': $scope.formData['NodeType']};
                    });
                }
                else {
                    $http({
                        method: 'POST',
                        url: globalServerURL + $scope.formData['NodeType'] + '/0/',
                        data: $scope.formData
                    }).success(function (response) {
                        // add the new order to the list
                        $scope.handleNew(response);
                        $scope.formData = {'NodeType': $scope.formData['NodeType']};
                    });
                }
            }
        };

        // add a new order to the list and sort
        $scope.handleNew = function(neworder) {
            // reload the list if filters are applied
            if ($scope.filters){
                $scope.loadOrderSection();
            }
            else{
                $scope.jsonorders.unshift(neworder);
            }
            console.log ("Order added");
        }

        // handle editing an order
        $scope.handleEdited = function(editedorder) {
            // search for the order and edit in the list
            var result = $.grep($scope.jsonorders, function(e) {
                return e.ID == editedorder.ID;
            });
            var i = $scope.jsonorders.indexOf(result[0]);
            if (i>-1) {
                $scope.jsonorders[i] = editedorder;
            }
            console.log ("Order edited");
        };

        // When the Add button is pressed change the state and form data
        $scope.addingState = function () {
            semspinner = 0;
            $scope.formData = {'NodeType': 'order'};
            $scope.isCollapsed = true;
            $scope.isDisabled = false;
            $scope.orderingOn = undefined;
            $scope.orderFormProjectsDisabled = false;
            $scope.modalState = "Add";
            $scope.budgetItemsList = [];
            $scope.resourceList = [];
            $scope.selectedOrderingOn = {};
            $scope.dateTimeNow();
            $scope.formData['Date'] = $scope.date;
            // clear the order selection
            $scope.clearSelectedOrders();
            $scope.saveOrderModalForm.$setPristine();
        }

        // When the edit button is pressed change the state and set the data
        $scope.editingState = function () {
            semspinner = 0;
            $scope.isCollapsed = true;
            $scope.isDisabled = false;
            $scope.orderingOn = undefined;
            $scope.modalState = "Edit";
            $scope.resourceList = [];
            $scope.selectedOrderingOn = {};
            var target = document.getElementsByClassName('slick-viewport');
            var spinner = new Spinner().spin(target[0]);
            $http({
                method: 'GET',
                url: globalServerURL + 'order/' + $scope.selectedOrders[0].ID + '/'
            }).success(function(response) {
                $scope.formData = response;
                $scope.loadProject();
                $scope.budgetItemsList = $scope.formData.BudgetItemsList;
                $scope.date = new Date($scope.formData['Date']);
                $scope.formData.NodeType = 'order';
                // if the order is processed set the grid read only
                if ($scope.selectedOrders[0].Status == 'Processed'){
                    $scope.gridSetEditable(false);
                }
                if ( $scope.budgetItemsList.length != 0 ) {
                    $scope.orderFormProjectsDisabled = true;
                }
                else {
                    $scope.orderFormProjectsDisabled = false;
                }
            }).finally(function(){
                spinner.stop();
            });
            // set each field dirty
            angular.forEach($scope.saveOrderModalForm.$error.required, function(field) {
                field.$setDirty();
            });
        }

        // loop through the selected orders and delete them
        $scope.deleteOrder = function(index) {
            $http({
                method: 'DELETE',
                url: globalServerURL + 'order/' + $scope.selectedOrders[index].ID + '/'
            }).success(function () {
                console.log("Deleted order " + $scope.selectedOrders[index].ID);
                index+=1;
                if (index < $scope.selectedOrders.length){
                    $scope.deleteOrder(index);
                }
                else{
                    for (var i in $scope.selectedOrders){
                        var result = $.grep($scope.jsonorders, function(e) {
                            return e.ID == $scope.selectedOrders[i].ID;
                        });
                        var ind = $scope.jsonorders.indexOf(result[0]);
                        if (ind>-1) {
                            $scope.jsonorders[ind].selected = false;
                            $scope.jsonorders.splice(ind, 1);
                        }
                    }
                }
            });
        };

        $scope.toggleBudgetItems = function(bi) {
            semspinner+=1
            // set the budgetitem selected or unselected
            var flag = (bi.selected === true) ? undefined : true;
            bi.selected = flag;
            // find the budgetitem in the budgetitem list
            var i = $scope.budgetItemsList.map(function(e)
                { return e.id; }).indexOf(bi.ID);
            // if the budgetitem is already in the list
            // and the node is deselected
            if ((i>-1) &(!flag)) {
                // remove it
                $scope.budgetItemsList.splice(i, 1);
            }
            // if the budgetitem is not in the list
            // and the node is being selected
            else if ((i==-1) & flag) {
                // find the index to insert the node into
                var index = $scope.locationOf(bi);
                // add the budgeitem
                if (index == -1) {
                    $scope.budgetItemsList.push(bi);
                }
                else {
                    $scope.budgetItemsList.splice(index, 0, bi);
                }
            }
            semspinner-=1;
            if (semspinner == 0){
                slickspinner.stop();
            }
        }

        // remove a budgetitem from the budgetitem list
        $scope.removeBudgetItem = function(node) {
            var deleteid = node.ID;
            var result = $.grep($scope.budgetItemsList, function(e) {
                return e.id == deleteid;
            });
            var i = $scope.budgetItemsList.indexOf(result[0]);
            if (i>-1) {
                $scope.budgetItemsList.splice(i, 1);
                // loop through all the open nodes and if the checked budgetItem
                // is in it uncheck the budgetitem
                for (var i = 0; i<$scope.openProjectsList.length; i++) {
                    var subitem = $scope.openProjectsList[i].Subitem || [];
                    if (subitem.length > 0) {
                        $scope.uncheckBudgetItem(deleteid, subitem);
                    }
                }

            }
        };

        $scope.uncheckBudgetItem = function(budgetitemId, subitem) {
            for (var i = 0; i<subitem.length; i++) {
                if (subitem[i].ID == budgetitemId) {
                    subitem[i].selected = false;
                    break;
                }
                else {
                    var subsubitem = subitem[i].Subitem || [];
                    if (subsubitem.length > 0) {
                        $scope.uncheckBudgetItem(budgetitemId, subsubitem);
                    }
                }
            }
        }

        $scope.toggleNode = function(node) {
            // when a node that is not a budgetitem is selected
            // flag the node, set the selection on all its children
            // load the budgetitems in the node and toggle them in the
            // budgetitem list
            semspinner+=1
            var flag = (node.selected === true) ? undefined : true;
            node.selected = flag;
            var nodeid = node.ID;
            var subitems = node['Subitem'];
            // select the subitems
            for (var i = 0; i<subitems.length; i++) {
                subitems[i].selected = flag;
                var subsubitem = subitems[i]['Subitem'] || [];
                if (subsubitem.length > 0) {
                    $scope.toggleSubitems(subsubitem, flag);
                }
            }
            // add the budgetitem to the list
            $http.get(globalServerURL + 'node/' + nodeid + '/budgetitems/')
            .success(function(response) {
                // if the budgetitem list is empty just add all the nodes in order
                if ($scope.budgetItemsList.length == 0) {
                    $scope.budgetItemsList =response;
                }
                else {
                    for (var v = 0; v<response.length; v++) {
                        var comp = response[v];
                        // find the budgetitem in the budgetitem list
                        var i = $scope.budgetItemsList.map(function(e)
                            { return e.id; }).indexOf(comp.ID);
                        // if the budgetItem is already in the list
                        // and the node is deselected
                        if ((i>-1) &(!flag)) {
                            // remove it
                            $scope.budgetItemsList.splice(i, 1);
                        }
                        // if the budgetItem is not in the list
                        // and the node is being selected
                        else if ((i==-1) & flag) {
                            // add the budgetItem
                            var index = $scope.locationOf(comp);
                            // add the budgetItem
                            if (index == -1) {
                                $scope.budgetItemsList.push(comp);
                            }
                            else {
                                $scope.budgetItemsList.splice(index, 0, comp);
                            }
                        }
                    }
                }
            }).finally(function(){
                semspinner-=1;
                if (semspinner == 0){
                    slickspinner.stop();
                }
            });
        };

        $scope.toggleSubitems = function(subitem, selected) {
            // recursively select/unselect all the children of a node
            for (var i = 0; i<subitem.length; i++) {
                subitem[i].selected = selected;
                var subsubitem = subitem[i]['Subitem'] || [];
                if (subsubitem.length > 0) {
                    $scope.toggleSubitems(subsubitem, selected);
                }
            }
        };

        $scope.toggleBudgetItemsGrid = function() {
            $scope.isCollapsed = !$scope.isCollapsed;
            if ($scope.isCollapsed) {
                $scope.handleReloadOrderSlickgrid();
            }
            // check if project selection dropdown should be enabled/disabled
            if ( $scope.budgetItemsList.length != 0 ) {
                $scope.orderFormProjectsDisabled = true;
            }
            else {
                $scope.orderFormProjectsDisabled = false;
            }
        };

        $scope.openProjectsList = [];
        // load the project that has been selected into the tree
        $scope.loadProject = function () {
            var id = $scope.formData['ProjectID']
            $http.get(globalServerURL + 'node/' + id + '/')
            .success(function(data) {
                $scope.openProjectsList = [data];
                $scope.selectNodeHead(data);
                $scope.orderingOn = 'budget';
            });
        };

        $scope.locationOf = function(element, start, end) {
            // return the location the object should be inserted in a sorted array
            if ($scope.budgetItemsList.length === 0) {
                return -1;
            }

            start = start || 0;
            end = end || $scope.budgetItemsList.length;
            var pivot = (start + end) >> 1;
            var c = $scope.nodeCompare(element, $scope.budgetItemsList[pivot]);
            if (end - start <= 1) {
                return c == -1 ? pivot: pivot + 1;

            }
            switch (c) {
                case -1: return $scope.locationOf(element, start, pivot);
                case 0: return pivot;
                case 1: return $scope.locationOf(element, pivot, end);
            };
        };

        $scope.nodeCompare = function (a, b) {
            if (a.Name.toUpperCase() < b.Name.toUpperCase()) return -1;
            if (a.Name.toUpperCase() > b.Name.toUpperCase()) return 1;
            return 0;
        };

        // if node head clicks, get the children of the node
        // and collapse or expand the node
        $scope.selectNodeHead = function(selectedNode) {
            // if the node is collapsed, get the data and expand the node
            if (!selectedNode.expanded) {
                selectedNode.expanded = true;
                var parentid = selectedNode.ID;
                $http.get(globalServerURL + "orders/tree/" + parentid + '/').success(function(data) {
                    selectedNode.Subitem = data;
                    // check if any of the budgetItems are in the budgetItems list
                    // and select then
                    for (var i = 0; i<selectedNode.Subitem.length; i++) {
                        if (selectedNode.Subitem[i].NodeType == 'OrderItem') {
                            for (var b = 0; b<$scope.budgetItemsList.length; b++) {
                                if ($scope.budgetItemsList[b].ID == selectedNode.Subitem[i].ID) {
                                    selectedNode.Subitem[i].selected = true;
                                }
                            }
                        }
                        // for all the other node set the same state as the parent
                        else {
                            selectedNode.Subitem[i].selected = selectedNode.selected;
                        }
                    }
                    console.log("Children loaded");
                });
            }
            else {
                selectedNode.expanded = false;
            }
        };

        $scope.toggleRowsSelected = function(rowsselected) {
            $timeout(function() {
                $scope.rowsSelected = rowsselected;
            });
        }

        $scope.deleteSelectedRecords = function() {
            // all the currently selected records in the slickgrid are
            // removed from the budgetitem list
            if ($scope.rowsSelected) {
                var selectedRows = $scope.getSelectedNodes()
                for (var i in selectedRows) {
                    $scope.removeBudgetItem(selectedRows[i]);
                }
                $scope.clearSelectedRows();
            }
        };

        // process an order recursively for each selected order
        $scope.toggleOrderStatus = function(status, index){
            $http({
                method: 'POST',
                url: globalServerURL + 'order/' + $scope.selectedOrders[index].ID + '/status',
                data: {'status':status}
            }).success(function(){
                $scope.selectedOrders[index].Status = status;
                console.log("Order " + $scope.selectedOrders[index].ID + " status to " + status);
                index+=1;
                if (index < $scope.selectedOrders.length){
                    $scope.toggleOrderStatus(status, index);
                }
            })
        }

        $scope.resourceSelected = function(item) {
            $scope.selectedOrderingOn.resource = item;
        };

        // search for the resources in the node's category that match the search term
        $scope.refreshResources = function(searchterm) {
            if (searchterm){
                var req = {
                    method: 'GET',
                    url: globalServerURL + 'project/' + $scope.formData.ProjectID + '/resources/',
                    params: {'search': searchterm}
                };
                $http(req).success(function(response) {
                    // if nothing has been found, add a non-selectable option
                    if (response.length == 0){
                        response.push({'Name': 'No match found',
                                        'nothingFound': true})
                    }
                    $scope.resourceList = response;
                });
            }
        }

        // based on the user selection, load the order items
        $scope.loadSelection = function(){
            var par = undefined;
            if ($scope.orderingOn == 'resource'){
                par = {'resource': $scope.selectedOrderingOn.resource.ID};
            }
            else if ($scope.orderingOn == 'supplier'){
                par = {'supplier': $scope.selectedOrderingOn.supplier}
            }
            $scope.toggleBudgetItemsGrid();
            $scope.selectedOrderingOn = {};
            var target = document.getElementsByClassName('slick-viewport');
            slickspinner = new Spinner().spin(target[0]);

            if (par){
                semspinner+=1;
                var req = {
                    method: 'GET',
                    url: globalServerURL + 'node/' + $scope.formData.ProjectID + '/budgetitems/',
                    params : par
                }
                $http(req).success(function(response) {
                    // if the budgetitem list is empty just add all the nodes in order
                    if ($scope.budgetItemsList.length == 0) {
                        $scope.budgetItemsList = response;
                    }
                    else {
                        for (var v = 0; v<response.length; v++) {
                            var comp = response[v];
                            // find the budgetitem in the budgetitem list
                            var i = $scope.budgetItemsList.map(function(e)
                                { return e.id; }).indexOf(comp.ID);
                            // if the budgetItem is not in the list
                            if (i==-1) {
                                var index = $scope.locationOf(comp);
                                // add the budgetItem
                                if (index == -1) {
                                    $scope.budgetItemsList.push(comp);
                                }
                                else {
                                    $scope.budgetItemsList.splice(index, 0, comp);
                                }
                            }
                        }
                    }
                }).finally(function(){
                    semspinner-=1;
                    if (semspinner == 0){
                        slickspinner.stop();
                    }
                });
            }
            else{
                if (semspinner == 0){
                    slickspinner.stop();
                }
            }
        }

        // set each order selected/unselected
        $scope.toggleAllCheckboxes = function(){
            var state = $scope.selectedOrders.length != $scope.jsonorders.length;
            for (var i in $scope.jsonorders){
                $scope.jsonorders[i].selected = state;
            }
        }

        // deselect all the selected orders
        $scope.clearSelectedOrders = function(){
            if ($scope.selectedOrders.length == $scope.jsonorders.length){
                $scope.toggleAllCheckboxes();
            }
            else{
                for (var i in $scope.selectedOrders){
                    var result = $.grep($scope.jsonorders, function(e) {
                        return e.ID == $scope.selectedOrders[i].ID;
                    });
                    var ind = $scope.jsonorders.indexOf(result[0]);
                    if (ind>-1) {
                        $scope.jsonorders[ind].selected = false;
                    }
                }
            }
        }

        $scope.getReport = function (report) {
            if ( report == 'order' ) {
                var target = document.getElementsByClassName('pdf_download');
                var spinner = new Spinner().spin(target[0]);
                $http({
                    method: 'POST',
                    url: globalServerURL + 'order_report/' + $scope.selectedOrders[0].ID + '/',
                    responseType: 'arraybuffer'
                }).success(function (response, status, headers, config) {
                    var file = new Blob([response], {type: 'application/pdf'});
                    var filename_header = headers('Content-Disposition');
                    var filename = filename_header.split('filename=')[1];
                    var config = {
                      data: file,
                      filename: filename,
                    };

                    FileSaver.saveAs(config);
                }).error(function(data, status, headers, config) {
                    console.log("Order pdf download error")
                }).finally(function(){
                    spinner.stop()
                });
            }
        };

        $scope.getExcelReport = function (report) {
            if ( report == 'order' ) {
                var target = document.getElementsByClassName('excel_download');
                var spinner = new Spinner().spin(target[0]);
                $http({
                    method: 'POST',
                    url: globalServerURL + 'excel_order_report/' + $scope.selectedOrders[0].ID + '/',
                    responseType: 'arraybuffer'
                }).success(function (response, status, headers, config) {
                    var blob = new Blob([response], {
                        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                    });
                    var filename_header = headers('Content-Disposition');
                    var filename = filename_header.split('filename=')[1];
                    var config = {
                      data: blob,
                      filename: filename,
                    };

                    FileSaver.saveAs(config);
                }).error(function(data, status, headers, config) {
                    console.log("Order excel download error")
                }).finally(function(){
                    spinner.stop()
                });
            }
        };
    }
]);
