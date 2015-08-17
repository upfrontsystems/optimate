// controller for the Order data from the server
myApp.controller('ordersController', ['$scope', '$http', 'globalServerURL', '$timeout', 'SessionService',
    function($scope, $http, globalServerURL, $timeout, SessionService) {

        toggleMenu('orders');
        $scope.dateTimeNow = function() {
            var d = new Date();
            // create a timezone agnostic date by setting time info to 0 and timezone to UTC.
            date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0,0,0,0));
            $scope.date = date;
        };
        $scope.isDisabled = false;
        $scope.isCollapsed = true;
        $scope.orderFormProjectsDisabled = false;
        $scope.jsonorders = [];
        $scope.budgetItemsList = [];
        $scope.invoiceList = [];
        // Pagination variables and functions
        $scope.pageSize = 100;
        $scope.currentPage = 1;
        $scope.maxPageSize = 20;
        $scope.orderListLength = $scope.maxPageSize + 1;

        // get the user permissions
        $scope.user = {'username':SessionService.username()};
        SessionService.permissions().then(function(perm){
            $scope.user.permissions = perm;
        });

        // loading the project, client and supplier list
        $scope.clearFilters = function() {
            $scope.filters = [];
            $http.get(globalServerURL + 'projects/')
            .success(function(data) {
                $scope.projectsList = data;
            });

            $http.get(globalServerURL + 'suppliers')
            .success(function(data) {
                $scope.suppliersList = data;
            });

            $http.get(globalServerURL + 'clients')
            .success(function(data) {
                $scope.clientsList = data;
            });

            // get the length of the list of all the orders
            $http.get(globalServerURL + 'orders/length').success(function(data) {
                $scope.orderListLength = data['length'];
            });
        }
        $scope.projectsList = [];
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
                        'OrderNumber': $scope.filters.OrderNumber}
            };
            $http(req).success(function(response) {
                var length = response.pop();
                $scope.jsonorders = response;
                if (length) {
                    $scope.orderListLength = length;
                }
                console.log("Orders loaded");
            });
        }
        $scope.loadOrderSection();

        // filter the other filter options by project
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
                    $scope.suppliersList = response['suppliers'];
                }
                else if (selection == 'client') {
                    if ($scope.filters.Client == null) {
                        $scope.clientsList = response['clients'];
                    }
                    $scope.projectsList = response['projects'];
                    $scope.suppliersList = response['suppliers'];
                }
                else if (selection == 'supplier') {
                    if ($scope.filters.Supplier == null) {
                        $scope.suppliersList = response['suppliers'];
                    }
                    $scope.clientsList = response['clients'];
                    $scope.projectsList = response['projects'];
                }
                else {
                    $scope.projectsList = response['projects'];
                    $scope.clientsList = response['clients'];
                    $scope.suppliersList = response['suppliers'];
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
            // the new order is added to the list
            var high = $scope.jsonorders[0].ID + 2;
            var low = $scope.jsonorders[$scope.jsonorders.length - 1].ID + 2;
            // only need to add it if it's id falls in the current section
            if (neworder.ID > low && neworder.ID < high) {
                $scope.jsonorders.push(neworder);
                // sort by order id
                $scope.jsonorders.sort(function(a, b) {
                    var idA = a.ID;
                    var idB = b.ID;
                    return (idA > idB) ? -1 : (idA < idB) ? 1 : 0;
                });
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

        // Set the selected order and change the css
        $scope.showActionsFor = function(obj) {
            $scope.selectedOrder = obj;
            $('#order-'+obj.ID).addClass('active').siblings().removeClass('active');
        };

        // When the Add button is pressed change the state and form data
        $scope.addingState = function () {
            $scope.formData = {'NodeType': 'order'};
            $scope.isCollapsed = true;
            $scope.isDisabled = false;
            $scope.orderFormProjectsDisabled = false;
            $scope.modalState = "Add";
            $scope.budgetItemsList = [];
            $scope.dateTimeNow();
            $scope.formData['Date'] = $scope.date;
            if ($scope.selectedOrder) {
                $('#order-'+$scope.selectedOrder.ID).removeClass('active');
                $scope.selectedOrder = undefined;
            }
            $scope.saveOrderModalForm.$setPristine();
        }

        // When the edit button is pressed change the state and set the data
        $scope.editingState = function () {
            $scope.isCollapsed = true;
            $scope.isDisabled = false;
            $scope.modalState = "Edit";
            $http({
                method: 'GET',
                url: globalServerURL + 'order/' + $scope.selectedOrder.ID + '/'
            }).success(function(response) {
                $scope.formData = response;
                $scope.loadProject();
                $scope.budgetItemsList = $scope.formData.BudgetItemsList;
                $scope.date = new Date($scope.formData['Date']);
                $scope.formData.NodeType = 'order';
                if ( $scope.budgetItemsList.length != 0 ) {
                    $scope.orderFormProjectsDisabled = true;
                }
                else {
                    $scope.orderFormProjectsDisabled = false;
                }
            });
            // set each field dirty
            angular.forEach($scope.saveOrderModalForm.$error.required, function(field) {
                field.$setDirty();
            });
        }

        // Delete an order and remove from the orders list
        $scope.deleteOrder = function() {
            var deleteid = $scope.selectedOrder.ID;
            $scope.selectedOrder = undefined;
            $http({
                method: 'DELETE',
                url: globalServerURL + $scope.formData['NodeType'] + '/' + deleteid + '/'
            }).success(function () {
                var result = $.grep($scope.jsonorders, function(e) {
                    return e.ID == deleteid;
                });
                var i = $scope.jsonorders.indexOf(result[0]);
                if (i>-1) {
                    $scope.jsonorders.splice(i, 1);
                    console.log("Deleted order");
                }
            });
        };

        $scope.toggleBudgetItems = function(bi) {
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

        $scope.getReport = function (report) {
            if ( report == 'order' ) {
                var target = document.getElementsByClassName('pdf_download');
                var spinner = new Spinner().spin(target[0]);
                $http({
                    method: 'POST',
                    url: globalServerURL + 'order_report/' + $scope.selectedOrder.ID + '/'},
                    {responseType: 'arraybuffer'
                }).success(function (response, status, headers, config) {
                    spinner.stop(); // stop the spinner - ajax call complete
                    var file = new Blob([response], {type: 'application/pdf'});
                    var fileURL = URL.createObjectURL(file);
                    var result = document.getElementsByClassName("pdf_hidden_download");
                    var anchor = angular.element(result);
                    var filename_header = headers('Content-Disposition');
                    var filename = filename_header.split('filename=')[1];
                    anchor.attr({
                        href: fileURL,
                        target: '_blank',
                        download: filename
                    })[0].click();
                    // clear the anchor so that everytime a new report is linked
                    anchor.attr({
                        href: '',
                        target: '',
                        download: ''
                    });
                }).error(function(data, status, headers, config) {
                    console.log("Order pdf download error")
                });
            }
        };

    }
]);
