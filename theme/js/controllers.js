function toggleMenu(itemclass) {
    $("ul.nav li").removeClass("active");
    $("li."+itemclass).toggleClass("active");
}

// controller for the Company Information data from the server
allControllers.controller('companyinformationController', ['$scope', '$http', '$modal', '$log', 'globalServerURL',
    function($scope, $http, $modal, $log, globalServerURL) {

        toggleMenu('setup');

        $http.get(globalServerURL + 'company_information').success(function(data) {
            $scope.company_information = data;
        });

        // When the edit button is pressed change the state and set the data
        $scope.editingState = function () {
            $http({
                method: 'GET',
                url: globalServerURL + 'company_information'
            }).success(function(response) {
                $scope.formData = response;
            })
            // set each field dirty
            angular.forEach($scope.EditCompanyInformationForm.$error.required, function(field) {
                field.$setDirty();
            });
        }

        // editing company information data
        $scope.save = function() {
            $http({
                method: 'PUT',
                url: globalServerURL + 'company_information',
                data: $scope.formData
            }).success(function(response) {
                $scope.company_information = $scope.formData
            });
            $scope.EditCompanyInformationForm.$setPristine();
        };

    }
]);

// controller for the Client data from the server
allControllers.controller('clientsController', ['$scope', '$http', 'globalServerURL',
    function($scope, $http, globalServerURL) {

        toggleMenu('setup');
        $scope.isDisabled = false;

        $http.get(globalServerURL + 'clients').success(function(data) {
            $scope.jsonclients = data;
        });

        // load the city list
        $scope.cityList = [{"Name": "Loading..."}];
        var req = {
            method: 'GET',
            url: globalServerURL + 'cities'
        }
        $http(req).success(function(data) {
            $scope.cityList = data;
        });

        // Adding or editing a client
        $scope.save = function() {
            // check if saving is disabled, if not disable it and save
            if (!$scope.isDisabled) {
                $scope.isDisabled = true;
                if ($scope.modalState == 'Edit') {
                    $http({
                        method: 'PUT',
                        url: globalServerURL + 'client/' + $scope.formData['ID'] + '/',
                        data: $scope.formData
                    }).success(function () {
                        $scope.handleEdited($scope.formData);
                        $scope.formData = {'NodeType': $scope.formData['NodeType']};
                    });
                }
                else {
                    $http({
                        method: 'POST',
                        url: globalServerURL + 'client/0/',
                        data: $scope.formData
                    }).success(function (response) {
                        $scope.formData['ID'] = response['newid'];
                        // post the new client
                        $scope.handleNew($scope.formData);
                        $scope.formData = {'NodeType': $scope.formData['NodeType']};
                    });
                }
            }
        };

        // add a new client to the list and sort
        $scope.handleNew = function(newclient) {
            // the new client is added to the list
            $scope.jsonclients.push(newclient);
            // sort alphabetically by client name
            $scope.jsonclients.sort(function(a, b) {
                var textA = a.Name.toUpperCase();
                var textB = b.Name.toUpperCase();
                return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
            });
            console.log ("Client added");
        }

        // listening for the handle edit client broadcast
        $scope.handleEdited = function(editedclient) {
            // search for the client and edit in the list
            var result = $.grep($scope.jsonclients, function(e) {
                return e.ID == editedclient.ID;
            });
            var i = $scope.jsonclients.indexOf(result[0]);
            $scope.jsonclients[i] = editedclient;
            $scope.jsonclients.sort(function(a, b) {
                var textA = a.Name.toUpperCase();
                var textB = b.Name.toUpperCase();
                return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
            });
            console.log ("Client edited");
        };

        // Set the selected client and change the css
        $scope.showActionsFor = function(obj) {
            $scope.selectedClient = obj;
            $('#client-'+obj.ID).addClass('active').siblings().removeClass('active');
        };

        // When the Add button is pressed change the state and form data
        $scope.addingState = function () {
            $scope.isDisabled = false;
            $scope.modalState = "Add";
            $scope.formData = {'NodeType': 'client'};
            if ($scope.selectedClient) {
                $('#client-'+$scope.selectedClient.ID).removeClass('active');
                $scope.selectedClient = undefined;
            }
            $scope.saveModalForm.$setPristine();
        }

        // When the edit button is pressed change the state and set the data
        $scope.editingState = function () {
            $scope.isDisabled = false;
            $scope.modalState = "Edit";
            $http.get(globalServerURL + 'client/' + $scope.selectedClient.ID + '/')
            .success(function(response) {
                $scope.formData = response;
                $scope.formData['NodeType'] = 'client';
            })
            // set each field dirty
            angular.forEach($scope.saveModalForm.$error.required, function(field) {
                field.$setDirty();
            });
        }

        // Delete client and remove from the clients list
        $scope.deleteClient = function() {
            var deleteid = $scope.selectedClient.ID;
            $scope.selectedClient = undefined;
            $http({
                method: 'DELETE',
                url: globalServerURL + 'client/' + deleteid + '/'
            }).success(function () {
                var result = $.grep($scope.jsonclients, function(e) {
                    return e.ID == deleteid;
                });
                var i = $scope.jsonclients.indexOf(result[0]);
                $scope.jsonclients.splice(i, 1);
                console.log("Deleted client");
            });
        };
    }
]);

// Controller for the suppliers page
allControllers.controller('suppliersController', ['$scope', '$http', 'globalServerURL',
    function($scope, $http, globalServerURL) {

        toggleMenu('setup');
        $scope.isDisabled = false;

        $http.get(globalServerURL + 'suppliers').success(function(data) {
            $scope.jsonsuppliers = data;
        });

        // load the city list
        $scope.cityList = [{"Name": "Loading..."}];
        var req = {
            method: 'GET',
            url: globalServerURL + 'cities'
        }
        $http(req).success(function(data) {
            $scope.cityList = data;
        });

        // Adding or editing a supplier
        $scope.save = function() {
            // check if saving is disabled, if not disable it and save
            if (!$scope.isDisabled) {
                $scope.isDisabled = true;
                if ($scope.modalState == 'Edit') {
                    $http({
                        method: 'PUT',
                        url: globalServerURL + 'supplier/' + $scope.formData['ID'] + '/',
                        data:$scope.formData
                    }).success(function () {
                        $scope.handleEdited($scope.formData);
                        $scope.formData = {'NodeType': $scope.formData['NodeType']};
                    });
                }
                else {
                    $http({
                        method: 'POST',
                        url: globalServerURL + 'supplier/0/',
                        data:$scope.formData
                    }).success(function (response) {
                        $scope.formData['ID'] = response['newid'];
                        // post the new supplier
                        $scope.handleNew($scope.formData);
                        $scope.formData = {'NodeType': $scope.formData['NodeType']};
                    });
                }
            }
        };

        // add a new supplier to the list and sort
        $scope.handleNew = function(newsupplier) {
            // the new supplier is added to the list
            $scope.jsonsuppliers.push(newsupplier);
            // sort alphabetically by supplier name
            $scope.jsonsuppliers.sort(function(a, b) {
                var textA = a.Name.toUpperCase();
                var textB = b.Name.toUpperCase();
                return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
            });
            console.log ("Supplier added");
        }

        // edit a supplier in the list
        $scope.handleEdited = function(editedsupplier) {
            // search for the supplier and edit in the list
            var result = $.grep($scope.jsonsuppliers, function(e) {
                return e.ID == editedsupplier.ID;
            });
            var i = $scope.jsonsuppliers.indexOf(result[0]);
            $scope.jsonsuppliers[i] = editedsupplier;
            $scope.jsonsuppliers.sort(function(a, b) {
                var textA = a.Name.toUpperCase();
                var textB = b.Name.toUpperCase();
                return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
            });
            console.log ("Supplier edited");
        };

        // Set the selected supplier and change the css
        $scope.showActionsFor = function(obj) {
            $scope.selectedSupplier = obj;
            $('#supplier-'+obj.ID).addClass('active').siblings().removeClass('active');
        };

        // When the Add button is pressed change the state and form data
        $scope.addingState = function () {
            $scope.isDisabled = false;
            $scope.modalState = "Add";
            $scope.formData = {'NodeType': 'supplier'};
            if ($scope.selectedSupplier) {
                $('#supplier-'+$scope.selectedSupplier.ID).removeClass('active');
                $scope.selectedSupplier = undefined;
            }
            $scope.saveModalForm.$setPristine();
        }

        // When the edit button is pressed change the state and set the data
        $scope.editingState = function () {
            $scope.isDisabled = false;
            $scope.modalState = "Edit";
            $http({
                method: 'GET',
                url: globalServerURL + 'supplier/' + $scope.selectedSupplier.ID + '/'
            }).success(function(response) {
                $scope.formData = response;
                $scope.formData['NodeType'] = 'supplier';
            })
            // set each field dirty
            angular.forEach($scope.saveModalForm.$error.required, function(field) {
                field.$setDirty();
            });
        }

        // Delete supplier and remove from the supplier list
        $scope.deleteSupplier = function() {
            var deleteid = $scope.selectedSupplier.ID;
            $http({
                method: 'DELETE',
                url: globalServerURL + 'supplier/' + deleteid + '/'
            }).success(function () {
                var result = $.grep($scope.jsonsuppliers, function(e) {
                    return e.ID == deleteid;
                });
                var i = $scope.jsonsuppliers.indexOf(result[0]);
                $scope.jsonsuppliers.splice(i, 1);
                console.log("Deleted supplier");
            });
        };
    }
]);

// controller for the Cities data
allControllers.controller('citiesController', ['$scope', '$http', '$modal', '$log', 'globalServerURL',
    function($scope, $http, $modal, $log, globalServerURL) {

        toggleMenu('setup');
        $scope.newCity = [];
        $http.get(globalServerURL + 'cities').success(function(data) {
            $scope.cityList = data;
        });

        // clear the city input fields
        $scope.clearInput = function() {
            $scope.newCity = [];
        }

        $scope.cityList = [];
        $scope.loadCities = function() {
            $http.get(globalServerURL + 'cities')
            .success(function(data) {
                $scope.cityList = data;
                console.log("City list loaded");
            });
        };

        // delete a city by id
        $scope.deleteCity = function(cityid, index) {
            var req = {
                method: 'DELETE',
                url: globalServerURL + 'city/' + cityid + '/',
            }
            $http(req).success(function(result) {
                if ( result.status == 'remove' ) {
                    $scope.cityList.splice(index, 1);
                    console.log("City deleted");
                }
            });
        }

        // add a city
        $scope.addCity = function() {
            if ($scope.newCity) {
                var req = {
                    method: 'POST',
                    url: globalServerURL + 'city/0/',
                    data: {'Name':$scope.newCity.Name}
                }
                $http(req).success(function() {
                    $scope.clearInput();
                    $scope.loadCities();
                    console.log("City added");
                });
            }
        }

    }
]);

// controller for the Units data
allControllers.controller('unitsController', ['$scope', '$http', '$modal', '$log', 'globalServerURL',
    function($scope, $http, $modal, $log, globalServerURL) {

        toggleMenu('setup');
        $scope.newUnit = [];
        $http.get(globalServerURL + 'units').success(function(data) {
            $scope.unitList = data;
            console.log("Unit list loaded");
        });

        // clear the unit input fields
        $scope.clearInput = function() {
            $scope.newUnit = undefined;
        }

        $scope.unitList = [];
        $scope.loadUnits = function() {
            var req = {
                method: 'GET',
                url: globalServerURL + 'units'
            }
            $http(req).success(function(data) {
                $scope.unitList = data;
                console.log("Unit list loaded");
            });
        };

        // delete a unit by id
        $scope.deleteUnit = function(unitid, index) {
            var req = {
                method: 'DELETE',
                url: globalServerURL + 'unit/' + unitid + '/',
            }
            $http(req).success(function(result) {
                if ( result.status == 'remove' ) {
                    $scope.unitList.splice(index, 1);
                    console.log("Unit deleted");
                }
            });
        }

        // add a unit
        $scope.addUnit = function() {
            if ($scope.newUnit) {
                var req = {
                    method: 'POST',
                    url: globalServerURL + 'unit/0/',
                    data: {'Name':$scope.newUnit.Name}
                }
                $http(req).success(function() {
                    $scope.clearInput();
                    $scope.loadUnits();
                    console.log("Unit added");
                });
            }
        }

    }
]);

allControllers.controller('usersController', ['$scope', '$http', '$modal', 'globalServerURL',
    function($scope, $http, $modal, globalServerURL) {

        toggleMenu('setup');
        $scope.users = [];

        // populate user list
        ($scope.repopulate = function() {
            $http({
                method: 'GET',
                url: globalServerURL + 'users',
            }).then(
                function(response) {
                    $scope.users = response.data;
                },
                function() {
                    alert('Error while fetching user list');
                }
            );
        })();

        $scope.selectedUser = null;
        $scope.showActionsFor = function(obj) {
            $scope.selectedUser = obj;
            for (var i in $scope.users) {
                $scope.users[i].selected = false;
            }
            obj.selected = true;
        };

        $scope.newuser = {
            username: '',
            password: '',
            roles: [
                { title: 'Administrator', selected: false }
            ]
        }
        var modalInstance = null;
        $scope.addingState = function () {
            $scope.modalState = "Add";
            $scope.newuser.password = '';
            $scope.newuser.roles.forEach(function(v) {
                v.selected = false;
            });
            if ($scope.selectedUser) {
                $scope.selectedUser.selected = false;
                $scope.selectedUser = null;
            }
            modalInstance = $modal.open({
                templateUrl: 'addUser',
                scope: $scope
            });
        };

        $scope.editingState = function () {
            $scope.modalState = "Edit";
            $scope.newuser.password = '';
            $http({
                method: 'GET',
                url: globalServerURL + 'users/' + $scope.selectedUser.username
            }).then(
                function(response) {
                    var i;
                    $scope.data = response.data;
                    for (var i in $scope.newuser.roles) {
                        var role = $scope.newuser.roles[i];
                        role.selected = (response.data.roles.indexOf(role.title) > -1);
                    }
                    modalInstance = $modal.open({
                        templateUrl: 'addUser',
                        scope: $scope
                    });
                },
                function() {
                    alert('Error while fetching user information');
                }
            );
        };

        $scope.saveUser = function() {
            var newroles = $scope.newuser.roles.map(function(v) {
                if (v.selected) {
                    return v.title;
                } else {
                    return null;
                }
            }).filter(function(v) {
                return v != null;
            });
            if ($scope.selectedUser) {
                // Update the password (and later also the roles)
                $http({
                    method: "POST",
                    url: globalServerURL + 'users/' + $scope.selectedUser.username,
                    data: {
                        password: $scope.newuser.password,
                        roles: newroles
                    }
                }).then(
                    function(response) {
                        $scope.selectedUser.roles = response.data.roles;
                        modalInstance && modalInstance.dismiss('ok');
                        modalInstance = null;
                    },
                    function() {
                        alert('Error while saving user details');
                    }
                );
            } else {
                $http({
                    method: "POST",
                    url: globalServerURL + 'users',
                    data: {
                        username: $scope.newuser.username,
                        password: $scope.newuser.password,
                        roles: newroles
                    }
                }).then(
                    function() {
                        modalInstance && modalInstance.dismiss('ok');
                        modalInstance = null;
                        $scope.repopulate();
                    },
                    function() {
                        alert('Error while saving user details');
                    }
                );
            }
        };

        $scope.deleteUser = function(user) {
            if (confirm('Are you sure you want to delete ' + user.username + '?')) {
                $http({
                    method: "DELETE",
                    url: globalServerURL + 'users/' + user.username
                }).then(
                    function() {
                        $scope.repopulate();
                    },
                    function() {
                        alert('Error deleting user');
                    }
                );
            }
        };

}]);

allControllers.controller('loginController', ['$scope', '$location', 'SessionService',
    function($scope, $location, SessionService) {
        $scope.credentials = {
            username: '',
            password: ''
        }

        $scope.login = function(e) {
            e.preventDefault();
            SessionService.login($scope.credentials.username, $scope.credentials.password).then(
                function() {
                    $location.path('/projects');
                },
                function() {
                    alert('Login failed');
                });
        }
}]);

allControllers.controller('logoutController', ['$location', 'SessionService',
    function($location, SessionService) {
        SessionService.logout();
        $location.path('/login');
}]);

allControllers.controller('navController', ['$scope', 'SessionService',
    function($scope, SessionService) {
        // Hide and show the toolbar depending on whether you're logged in.
        $scope.logged_in = SessionService.authenticated();
        $scope.username = SessionService.username();
        $scope.$on('session:changed', function(evt, username) {
            $scope.logged_in = SessionService.authenticated();
            $scope.username = SessionService.username();
        });
}]);

// controller for the Order data from the server
allControllers.controller('ordersController', ['$scope', '$http', 'globalServerURL', '$timeout',
    function($scope, $http, globalServerURL, $timeout) {

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
            if (!selectedNode.collapsed) {
                selectedNode.collapsed = true;
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
                selectedNode.collapsed = false;
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

// controller for the Invoice data from the server
allControllers.controller('invoicesController', ['$scope', '$http', 'globalServerURL', '$timeout',
    function($scope, $http, globalServerURL, $timeout) {

        toggleMenu('invoices');
        $scope.dateTimeNow = function() {
            var d = new Date();
            // create a timezone agnostic date by setting time info to 0 and timezone to UTC.
            date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0,0,0,0));
            $scope.idate = date;
            $scope.pdate = date;
        };
        $scope.isDisabled = false;
        $scope.jsoninvoices = [];
        $scope.invoiceList = [];

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
        }
        $scope.projectsList = [];
        $scope.suppliersList = [];
        $scope.clientsList = [];
        $scope.clearFilters();

        $scope.invoicesLengthCheck = function() {
            if ($scope.jsoninvoices.length == 0) {
               $scope.invoicesReportEnabled = false;
            }
            else {
               $scope.invoicesReportEnabled = true;
            }
        }

        $scope.loadInvoiceSection = function() {
            var req = {
                method: 'GET',
                url: globalServerURL + 'invoices',
                params: {'Project': $scope.filters.Project,
                        'Client': $scope.filters.Client,
                        'Supplier': $scope.filters.Supplier,
                        'OrderNumber': $scope.filters.OrderNumber,
                        'InvoiceNumber': $scope.filters.InvoiceNumber,
                        'PaymentDate': $scope.filters.PaymentDate,
                        'Status': $scope.filters.Status}
            };
            $http(req).success(function(response) {
                $scope.jsoninvoices = response;
                $scope.invoicesLengthCheck();
                console.log("Invoices loaded");
            });
        }
        $scope.loadInvoiceSection();

        // filter the other filter options by what is selected
        $scope.filterBy = function(selection) {
            var req = {
                method: 'GET',
                url: globalServerURL + 'invoices/filter',
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

        // search for the orders that match the search term
        $scope.refreshOrders = function(searchterm) {
            if ($scope.modalState) {
                var req = {
                    method: 'GET',
                    url: globalServerURL + 'orders',
                    params: {'OrderNumber': searchterm}
                };
                $http(req).success(function(response) {
                    response.pop();
                    console.log(response);
                    $scope.ordersList = response;
                });
            }
        };

        $scope.orderSelected = function(item) {
            console.log(item);
            $scope.formData.OrderID = item.ID;
        };

        // Adding or editing an invoice
        $scope.save = function() {
            // check if saving is disabled, if not disable it and save
            if (!$scope.isDisabled) {
                $scope.isDisabled = true;
                if ($scope.modalState == 'Edit') {
                    $http({
                        method: 'PUT',
                        url: globalServerURL + 'invoice' + '/' + $scope.formData.id + '/',
                        data: $scope.formData
                    }).success(function (response) {
                        // edit the invoice in the list
                        $scope.handleEdited(response);
                        $scope.formData = {'NodeType': 'invoice'};
                    });
                }
                else {
                    $http({
                        method: 'POST',
                        url: globalServerURL + 'invoice/0/',
                        data: $scope.formData
                    }).success(function (response) {
                        // add the new invoice to the list
                        $scope.handleNew(response);
                        $scope.formData = {'NodeType': 'invoice'};
                    });
                }
            }
        };

        // add a new invoice to the list and sort
        $scope.handleNew = function(newinvoice) {
            $scope.jsoninvoices.push(newinvoice);
            // sort by invoice id
            $scope.jsoninvoices.sort(function(a, b) {
                var idA = a.id;
                var idB = b.id;
                return (idA > idB) ? -1 : (idA < idB) ? 1 : 0;
            });
            $scope.invoicesLengthCheck();
            console.log ("Invoice added");
        }

        // handle editing an invoice
        $scope.handleEdited = function(editedinvoice) {
            // search for the invoice and edit in the list
            var result = $.grep($scope.jsoninvoices, function(e) {
                return e.id == editedinvoice.id;
            });
            var i = $scope.jsoninvoices.indexOf(result[0]);
            if (i>-1) {
                $scope.jsoninvoices[i] = editedinvoice;
            }
            console.log ("Invoice edited");
        };

        // Set the selected invoice and change the css
        $scope.showActionsFor = function(obj) {
            $scope.selectedInvoice = obj;
            $('#invoice-'+obj.id).addClass('active').siblings().removeClass('active');
        };

        // When the Add button is pressed change the state and form data
        $scope.addingState = function () {
            $scope.formData = {'NodeType': 'invoice',
                                'vat': '0.00'};
            $scope.isCollapsed = true;
            $scope.isDisabled = false;
            $scope.modalState = "Add";
            $scope.dateTimeNow();
            $scope.formData['Invoicedate'] = $scope.idate;
            $scope.formData['Paymentdate'] = $scope.pdate;
            $scope.calculatedAmounts = [{'name': 'Subtotal', 'amount': ''},
                                        {'name': 'VAT', 'amount': ''},
                                        {'name': 'Total', 'amount': ''},
                                        {'name': 'Order total', 'amount': ''}];
            if ($scope.selectedInvoice) {
                $('#invoice-'+$scope.selectedInvoice.id).removeClass('active');
                $scope.selectedInvoice = undefined;
            }
            $scope.saveInvoiceModalForm.$setPristine();
        }

        // When the edit button is pressed change the state and set the data
        $scope.editingState = function () {
            $scope.isCollapsed = true;
            $scope.isDisabled = false;
            $scope.modalState = "Edit";
            $http({
                method: 'GET',
                url: globalServerURL + 'invoice/' + $scope.selectedInvoice.id + '/'
            }).success(function(response) {
                $scope.formData = response;
                $scope.saveInvoiceModalForm.inputOrderNumber.$setValidity('default1', true);
                $scope.idate = new Date($scope.formData['Invoicedate']);
                $scope.pdate = new Date($scope.formData['Paymentdate']);
                $scope.formData['NodeType'] = 'invoice';
                $scope.calculatedAmounts = [{'name': 'Subtotal', 'amount': response.Amount},
                                        {'name': 'VAT', 'amount': response.VAT},
                                        {'name': 'Total', 'amount': response.Total},
                                        {'name': 'Order total', 'amount': response.Ordertotal}];
            });
            // set each field dirty
            angular.forEach($scope.saveInvoiceModalForm.$error.required, function(field) {
                field.$setDirty();
            });
        }

        // Delete an invoice and remove from the list
        $scope.deleteInvoice = function() {
            var deleteid = $scope.selectedInvoice.id;
            $scope.selectedInvoice = undefined;
            $http({
                method: 'DELETE',
                url: globalServerURL + 'invoice' + '/' + deleteid + '/'
            }).success(function () {
                var result = $.grep($scope.jsoninvoices, function(e) {
                    return e.id == deleteid;
                });
                var i = $scope.jsoninvoices.indexOf(result[0]);
                if (i>-1) {
                    $scope.jsoninvoices.splice(i, 1);
                    $scope.invoicesLengthCheck();
                    console.log("Deleted invoice");
                }
            });
        };

        $scope.checkOrderNumber = function() {
            // check if the order exists and set the form valid or invalid
            $http.get(globalServerURL + 'order/' + $scope.formData.OrderID + '/')
            .success(function(response) {
                $scope.saveInvoiceModalForm.inputOrderNumber.$setValidity('default1', true);
                $scope.calculatedAmounts[3].amount = response.Total
            })
            .error(function(response) {
                $scope.saveInvoiceModalForm.inputOrderNumber.$setValidity('default1', false);
            });
        };

        $scope.updateAmounts = function() {
            var subtotal = parseFloat($scope.formData.Amount);
            var vatcost = parseFloat($scope.formData.VAT) ? parseFloat($scope.formData.VAT) : 0;
            var total = subtotal + vatcost;

            var parts = subtotal.toString().split(".");
            if (parts.length > 1) {
                parts[1] = parts[1].slice(0,2);
                subtotal = parts.join('.');
            }
            else {
                subtotal = subtotal.toString() + '.00'
            }

            parts = vatcost.toString().split(".");
            if (parts.length > 1) {
                parts[1] = parts[1].slice(0,2);
                vatcost = parts.join('.');
            }
            else {
                vatcost = vatcost.toString() + '.00'
            }

            parts = total.toString().split(".");
            if (parts.length > 1) {
                parts[1] = parts[1].slice(0,2);
                total = parts.join('.');
            }
            else {
                total = total.toString() + '.00'
            }

            $scope.calculatedAmounts[0].amount = subtotal;
            $scope.calculatedAmounts[1].amount = vatcost;
            $scope.calculatedAmounts[2].amount = total;
        }

        // fetch the report filter options
        $scope.filterReportBy = function() {
            $scope.filterByProject = false;
            $scope.filterBySupplier = false;
            $scope.filterByPaymentDate = false;
            $scope.filterByStatus = false;
            var req = {
                method: 'GET',
                url: globalServerURL + 'invoices_report_filter'
            };
            $http(req).success(function(response) {
                $scope.invoiceReportProjectsList = response['projects'];
                $scope.invoiceReportSuppliersList = response['suppliers'];
                $scope.invoiceReportPaymentDateList = response['paymentdates'];
                $scope.paymentDatesExist = response['paymentdates_exist'];
                $scope.invoiceReportStatusList = response['statuses'];
                console.log("Invoice report filter options loaded")
            })
        };

        $scope.getReport = function (report) {
            if ( report == 'invoices' ) {
                var target = document.getElementsByClassName('pdf_download');
                var spinner = new Spinner().spin(target[0]);
                $scope.formData['FilterByProject'] = $scope.filterByProject;
                $scope.formData['FilterBySupplier'] = $scope.filterBySupplier;
                $scope.formData['FilterByPaymentDate'] = $scope.filterByPaymentDate;
                $scope.formData['FilterByStatus'] = $scope.filterByStatus;
                $http({
                    method: 'POST',
                    url: globalServerURL + 'invoices_report',
                    data: $scope.formData},
                    {responseType: 'arraybuffer'})
                .success(function (response, status, headers, config) {
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
                    console.log("Invoice pdf download error")
                });
            }
        };

    }
]);

// controller for the Valuation data from the server
allControllers.controller('valuationsController', ['$scope', '$http', 'globalServerURL', '$timeout',
    function($scope, $http, globalServerURL, $timeout) {

        toggleMenu('valuations');
        $scope.dateTimeNow = function() {
            var d = new Date();
            // create a timezone agnostic date by setting time info to 0 and timezone to UTC.
            date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0,0,0,0));
            $scope.date = date;
        };
        $scope.isDisabled = false;
        $scope.jsonvaluations = [];
        $scope.budgetgroupList = [];
        $scope.modalForm = [];
        // Pagination variables and functions
        $scope.pageSize = 100;
        $scope.currentPage = 1;
        $scope.maxPageSize = 20;
        $scope.valuationListLength = $scope.maxPageSize + 1;

        // get the length of the list of all the valuations
        $http.get(globalServerURL + 'valuations/length').success(function(data) {
            $scope.valuationListLength = data['length'];
        });

        $http.get(globalServerURL + 'projects/')
        .success(function(data) {
            $scope.projectsList = data;
        });

        $scope.loadValuationSection = function() {
            var start = ($scope.currentPage-1)*$scope.pageSize;
            var end = start + $scope.pageSize;
            var req = {
                method: 'GET',
                url: globalServerURL + 'valuations',
                params: {'start': start,
                        'end': end}
            };
            $http(req).success(function(response) {
                var length = response.pop();
                $scope.jsonvaluations = response;
                if (length) {
                    $scope.valuationListLength = length;
                }
                console.log("Valuations loaded");
            });
        }
        $scope.loadValuationSection();

        $scope.loadBudgetItems = function() {
            $http({
                method: 'GET',
                url: globalServerURL + 'node/' + $scope.formData['ProjectID'] + '/budgetgroups/'
            }).success(function(response) {
                $scope.budgetgroupList = response;
                console.log("BudgetItems loaded");
            });
        }

        // Adding or editing a valuation
        $scope.save = function() {
            // check if saving is disabled, if not disable it and save
            if (!$scope.isDisabled) {
                $scope.isDisabled = true;
                // set the list of checked budgetgroups
                $scope.formData['BudgetGroupList'] = $scope.budgetgroupList;
                if ($scope.modalState == 'Edit') {
                    $http({
                        method: 'PUT',
                        url: globalServerURL + $scope.formData['NodeType'] + '/' + $scope.formData['ID'] + '/',
                        data: $scope.formData
                    }).success(function (response) {
                        // edit the valuation in the list
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
                        // add the new valuation to the list
                        $scope.handleNew(response);
                        $scope.formData = {'NodeType': $scope.formData['NodeType']};
                    });
                }
            }
        };

        // add a new valuation to the list and sort
        $scope.handleNew = function(newvaluation) {
            // the new valuation is added to the list
            if ($scope.jsonvaluations.length > 1) {
                var high = $scope.jsonvaluations[0].ID + 2;
                var low = $scope.jsonvaluations[$scope.jsonvaluations.length - 1].ID + 2;
                // only need to add it if it's id falls in the current section
                if (newvaluation.ID > low && newvaluation.ID < high) {
                    $scope.jsonvaluations.push(newvaluation);
                    // sort by valuation id
                    $scope.jsonvaluations.sort(function(a, b) {
                        var idA = a.ID;
                        var idB = b.ID;
                        return (idA > idB) ? -1 : (idA < idB) ? 1 : 0;
                    });
                }
            }
            else {
                $scope.jsonvaluations.push(newvaluation);
            }
            console.log ("Valuation added");
        }

        // handle editing a valuation
        $scope.handleEdited = function(editedvaluation) {
            // search for the valuation and edit in the list
            var result = $.grep($scope.jsonvaluations, function(e) {
                return e.ID == editedvaluation.ID;
            });
            var i = $scope.jsonvaluations.indexOf(result[0]);
            if (i>-1) {
                $scope.jsonvaluations[i] = editedvaluation;
            }
            console.log ("Valuation edited");
        };

        // Set the selected valuation and change the css
        $scope.showActionsFor = function(obj) {
            $scope.selectedValuation = obj;
            $('#valuation-'+obj.ID).addClass('active').siblings().removeClass('active');
        };

        // When the Add button is pressed change the state and form data
        $scope.addingState = function () {
            $scope.formData = {'NodeType': 'valuation'};
            $scope.isDisabled = false;
            $scope.modalState = "Add";
            $scope.dateTimeNow();
            $scope.formData['Date'] = $scope.date;
            $scope.budgetgroupList = [];
            if ($scope.selectedValuation) {
                $('#valuation-'+$scope.selectedValuation.ID).removeClass('active');
                $scope.selectedValuation = undefined;
            }
            $scope.saveValuationModalForm.$setPristine();
            $('#inputProject').on('change', function(e, params) {
                $scope.loadBudgetItems();
            });
        }

        // When the edit button is pressed change the state and set the data
        $scope.editingState = function () {
            $scope.isDisabled = false;
            $scope.modalState = "Edit";
            $http({
                method: 'GET',
                url: globalServerURL + 'valuation/' + $scope.selectedValuation.ID + '/'
            }).success(function(response) {
                $scope.formData = response;
                $scope.budgetgroupList = $scope.formData['BudgetGroupList'];
                $scope.date = new Date($scope.formData['Date']);
                $scope.formData['NodeType'] = 'valuation';
            });
            // set each field dirty
            angular.forEach($scope.saveValuationModalForm.$error.required, function(field) {
                field.$setDirty();
            });
        }

        // Delete a valuation and remove from the valuations list
        $scope.deleteValuation = function() {
            var deleteid = $scope.selectedValuation.ID;
            $scope.selectedValuation = undefined;
            $http({
                method: 'DELETE',
                url: globalServerURL + $scope.formData['NodeType'] + '/' + deleteid + '/'
            }).success(function () {
                var result = $.grep($scope.jsonvaluations, function(e) {
                    return e.ID == deleteid;
                });
                var i = $scope.jsonvaluations.indexOf(result[0]);
                if (i>-1) {
                    $scope.jsonvaluations.splice(i, 1);
                    console.log("Deleted valuation");
                }
            });
        };

        $scope.getReport = function (report) {
            if ( report == 'valuation' ) {
                var target = document.getElementsByClassName('pdf_download');
                var spinner = new Spinner().spin(target[0]);
                $http({
                    method: 'POST',
                    url: globalServerURL + 'valuation_report/' + $scope.selectedValuation.ID + '/'},
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
                    console.log("Valuation pdf download error")
                });
            }
        };

    }
]);

// controller for the Claim data from the server
allControllers.controller('claimsController', ['$scope', '$http', 'globalServerURL',
    function($scope, $http, globalServerURL) {

        toggleMenu('claims');

        $scope.isDisabled = false;
        $scope.jsonclaims = [];
        $scope.claimList = [];
        $scope.valuationsList = []

        // loading the project list
        $scope.clearFilters = function() {
            $scope.filters = [];
            $http.get(globalServerURL + 'projects/')
            .success(function(data) {
                $scope.projectsList = data;
            });
        }
        $scope.projectsList = [];
        $scope.clearFilters();

        $scope.claimsLengthCheck = function() {
            if ($scope.jsonclaims.length == 0) {
               $scope.claimsReportEnabled = false;
            }
            else {
               $scope.claimsReportEnabled = true;
            }
        }

        $scope.loadClaimSection = function() {
            var req = {
                method: 'GET',
                url: globalServerURL + 'claims',
                params: {'Project': $scope.filters.Project,
                        'Date': $scope.filters.Date}
            };
            $http(req).success(function(response) {
                $scope.jsonclaims = response;
                $scope.claimsLengthCheck();
                console.log("Claims loaded");
            });
        }
        $scope.loadClaimSection();

        // load the list of valuations based on a project
        $scope.loadProjectValuations = function(projectid) {
            if (projectid) {
                var req = {
                    method: 'GET',
                    url: globalServerURL + 'valuations',
                    params: {'Project': projectid}
                };
                $http(req).success(function(response) {
                    $scope.valuationsList = response;
                    console.log("Valuations list loaded")
                });
            }
            else {
                $scope.valuationsList = [];
            }
        }

        // Adding or editing a claim
        $scope.save = function() {
            // check if saving is disabled, if not disable it and save
            if (!$scope.isDisabled) {
                $scope.isDisabled = true;
                if ($scope.modalState == 'Edit') {
                    $http({
                        method: 'PUT',
                        url: globalServerURL + 'claim' + '/' + $scope.formData.id + '/',
                        data: $scope.formData
                    }).success(function (response) {
                        // edit the claim in the list
                        $scope.handleEdited(response);
                        $scope.formData = {'NodeType': 'claim'};
                    });
                }
                else {
                    $http({
                        method: 'POST',
                        url: globalServerURL + 'claim/0/',
                        data: $scope.formData
                    }).success(function (response) {
                        // add the new claim to the list
                        $scope.handleNew(response);
                        $scope.formData = {'NodeType': 'claim'};
                    });
                }
            }
        };

        // add a new claim to the list and sort
        $scope.handleNew = function(newclaim) {
            $scope.jsonclaims.push(newclaim);
            // sort by claim id
            $scope.jsonclaims.sort(function(a, b) {
                var idA = a.id;
                var idB = b.id;
                return (idA > idB) ? -1 : (idA < idB) ? 1 : 0;
            });
            $scope.claimsLengthCheck();
            console.log ("Claim added");
        }

        // handle editing an claim
        $scope.handleEdited = function(editedclaim) {
            // search for the claim and edit in the list
            var result = $.grep($scope.jsonclaims, function(e) {
                return e.id == editedclaim.id;
            });
            var i = $scope.jsonclaims.indexOf(result[0]);
            if (i>-1) {
                $scope.jsonclaims[i] = editedclaim;
            }
            console.log ("Claim edited");
        };

        // Set the selected claim and change the css
        $scope.showActionsFor = function(obj) {
            $scope.selectedClaim = obj;
            $('#claim-'+obj.id).addClass('active').siblings().removeClass('active');
        };

        // When the Add button is pressed change the state and form data
        $scope.addingState = function () {
            $scope.formData = {'NodeType': 'claim'};
            $scope.isCollapsed = true;
            $scope.isDisabled = false;
            $scope.modalState = "Add";
            $scope.valuationsList = [];
            if ($scope.selectedClaim) {
                $('#claim-'+$scope.selectedClaim.id).removeClass('active');
                $scope.selectedClaim = undefined;
            }
            $scope.saveClaimModalForm.$setPristine();
        }

        // When the edit button is pressed change the state and set the data
        $scope.editingState = function () {
            $scope.isCollapsed = true;
            $scope.isDisabled = false;
            $scope.modalState = "Edit";
            $http({
                method: 'GET',
                url: globalServerURL + 'claim/' + $scope.selectedClaim.id + '/'
            }).success(function(response) {
                $scope.loadProjectValuations(response.ProjectID);
                $scope.formData = response;
                $scope.formData.Date = new Date($scope.formData.Date);
                $scope.formData.NodeType = 'claim';
            });
            // set each field dirty
            angular.forEach($scope.saveClaimModalForm.$error.required, function(field) {
                field.$setDirty();
            });
        }

        // Delete a claim and remove from the list
        $scope.deleteClaim = function() {
            var deleteid = $scope.selectedClaim.id;
            $http({
                method: 'DELETE',
                url: globalServerURL + 'claim' + '/' + deleteid + '/'
            }).success(function () {
                var result = $.grep($scope.jsonclaims, function(e) {
                    return e.id == deleteid;
                });
                var i = $scope.jsonclaims.indexOf(result[0]);
                if (i>-1) {
                    $scope.jsonclaims.splice(i, 1);
                    $scope.claimsLengthCheck();
                    $scope.selectedClaim = undefined;
                    console.log("Deleted claim");
                }
            });
        };

        // fetch the report filter options
        $scope.filterReportBy = function() {
            $scope.filterByProject = false;
            $scope.filterBySupplier = false;
            $scope.filterByPaymentDate = false;
            $scope.filterByStatus = false;
            var req = {
                method: 'GET',
                url: globalServerURL + 'claims_report_filter'
            };
            $http(req).success(function(response) {
                $scope.claimReportProjectsList = response['projects'];
                console.log("Claim report filter options loaded")
            })
        };

        $scope.getReport = function (report) {
            if ( report == 'claims' ) {
                var target = document.getElementsByClassName('pdf_download');
                var spinner = new Spinner().spin(target[0]);
                $scope.formData['FilterByProject'] = $scope.filterByProject;
                $scope.formData['FilterBySupplier'] = $scope.filterBySupplier;
                $scope.formData['FilterByPaymentDate'] = $scope.filterByPaymentDate;
                $scope.formData['FilterByStatus'] = $scope.filterByStatus;
                $http({
                    method: 'POST',
                    url: globalServerURL + 'claims_report',
                    data: $scope.formData},
                    {responseType: 'arraybuffer'})
                .success(function (response, status, headers, config) {
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
                    console.log("Claim pdf download error")
                });
            }
        };

    }
]);

// controller for the Payment data from the server
allControllers.controller('paymentsController', ['$scope', '$http', 'globalServerURL',
    function($scope, $http, globalServerURL) {

        toggleMenu('payments');

        $scope.isDisabled = false;
        $scope.jsonpayments = [];
        $scope.paymentList = [];
        $scope.valuationsList = []

        // loading the project list
        $scope.clearFilters = function() {
            $scope.filters = [];
            $http.get(globalServerURL + 'projects/')
            .success(function(data) {
                $scope.projectsList = data;
            });
        }
        $scope.projectsList = [];
        $scope.clearFilters();

        $scope.paymentsLengthCheck = function() {
            if ($scope.jsonpayments.length == 0) {
               $scope.paymentsReportEnabled = false;
            }
            else {
               $scope.paymentsReportEnabled = true;
            }
        }

        $scope.loadPaymentSection = function() {
            var req = {
                method: 'GET',
                url: globalServerURL + 'payments',
                params: {'Project': $scope.filters.Project,
                        'Date': $scope.filters.Date}
            };
            $http(req).success(function(response) {
                $scope.jsonpayments = response;
                $scope.paymentsLengthCheck();
                console.log("Payments loaded");
            });
        }
        $scope.loadPaymentSection();

        // Adding or editing a payment
        $scope.save = function() {
            // check if saving is disabled, if not disable it and save
            if (!$scope.isDisabled) {
                $scope.isDisabled = true;
                if ($scope.modalState == 'Edit') {
                    $http({
                        method: 'PUT',
                        url: globalServerURL + 'payment' + '/' + $scope.formData.id + '/',
                        data: $scope.formData
                    }).success(function (response) {
                        // edit the payment in the list
                        $scope.handleEdited(response);
                        $scope.formData = {'NodeType': 'payment'};
                    });
                }
                else {
                    $http({
                        method: 'POST',
                        url: globalServerURL + 'payment/0/',
                        data: $scope.formData
                    }).success(function (response) {
                        // add the new payment to the list
                        $scope.handleNew(response);
                        $scope.formData = {'NodeType': 'payment'};
                    });
                }
            }
        };

        // add a new payment to the list and sort
        $scope.handleNew = function(newitem) {
            $scope.jsonpayments.push(newitem);
            // sort by id
            $scope.jsonpayments.sort(function(a, b) {
                var idA = a.id;
                var idB = b.id;
                return (idA > idB) ? -1 : (idA < idB) ? 1 : 0;
            });
            $scope.paymentsLengthCheck();
            console.log ("Payment added");
        }

        // handle editing an payment
        $scope.handleEdited = function(editeditem) {
            // search for the payment and edit in the list
            var result = $.grep($scope.jsonpayments, function(e) {
                return e.id == editeditem.id;
            });
            var i = $scope.jsonpayments.indexOf(result[0]);
            if (i>-1) {
                $scope.jsonpayments[i] = editeditem;
            }
            console.log ("Payment edited");
        };

        // Set the selected payment and change the css
        $scope.showActionsFor = function(obj) {
            $scope.selectedPayment = obj;
            $('#payment-'+obj.id).addClass('active').siblings().removeClass('active');
        };

        // When the Add button is pressed change the state and form data
        $scope.addingState = function () {
            $scope.formData = {'NodeType': 'payment'};
            var d = new Date();
            $scope.formData.Date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0,0,0,0));
            $scope.isCollapsed = true;
            $scope.isDisabled = false;
            $scope.modalState = "Add";
            $scope.valuationsList = [];
            if ($scope.selectedPayment) {
                $('#payment-'+$scope.selectedPayment.id).removeClass('active');
                $scope.selectedPayment = undefined;
            }
            $scope.savePaymentModalForm.$setPristine();
        }

        // When the edit button is pressed change the state and set the data
        $scope.editingState = function () {
            $scope.isCollapsed = true;
            $scope.isDisabled = false;
            $scope.modalState = "Edit";
            $http({
                method: 'GET',
                url: globalServerURL + 'payment/' + $scope.selectedPayment.id + '/'
            }).success(function(response) {
                $scope.formData = response;
                $scope.formData.Date = new Date($scope.formData.Date);
                $scope.formData.NodeType = 'payment';
            });
            // set each field dirty
            angular.forEach($scope.savePaymentModalForm.$error.required, function(field) {
                field.$setDirty();
            });
        }

        // Delete a payment and remove from the list
        $scope.deletePayment = function() {
            var deleteid = $scope.selectedPayment.id;
            $http({
                method: 'DELETE',
                url: globalServerURL + 'payment' + '/' + deleteid + '/'
            }).success(function () {
                var result = $.grep($scope.jsonpayments, function(e) {
                    return e.id == deleteid;
                });
                var i = $scope.jsonpayments.indexOf(result[0]);
                if (i>-1) {
                    $scope.jsonpayments.splice(i, 1);
                    $scope.paymentsLengthCheck();
                    $scope.selectedPayment = undefined;
                    console.log("Deleted payment");
                }
            });
        };

        // fetch the report filter options
        $scope.filterReportBy = function() {
            $scope.filterByProject = false;
            $scope.filterBySupplier = false;
            $scope.filterByPaymentDate = false;
            $scope.filterByStatus = false;
            var req = {
                method: 'GET',
                url: globalServerURL + 'payments_report_filter'
            };
            $http(req).success(function(response) {
                $scope.paymentReportProjectsList = response['projects'];
                console.log("Payment report filter options loaded")
            })
        };

        $scope.getReport = function (report) {
            if ( report == 'payments' ) {
                var target = document.getElementsByClassName('pdf_download');
                var spinner = new Spinner().spin(target[0]);
                $scope.formData['FilterByProject'] = $scope.filterByProject;
                $scope.formData['FilterBySupplier'] = $scope.filterBySupplier;
                $scope.formData['FilterByPaymentDate'] = $scope.filterByPaymentDate;
                $scope.formData['FilterByStatus'] = $scope.filterByStatus;
                $http({
                    method: 'POST',
                    url: globalServerURL + 'payments_report',
                    data: $scope.formData},
                    {responseType: 'arraybuffer'})
                .success(function (response, status, headers, config) {
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
                    console.log("Payment pdf download error")
                });
            }
        };

    }
]);
