// angular module that contains all the controllers
var allControllers = angular.module('allControllers', ['config']);

// A factory that builds a shared service for the controllers for passing info
allControllers.factory('sharedService', ['$rootScope',
    function($rootScope) {
        var shared = {};

        // when a node is added to the projects treeview
        // the slickgrid should be reloaded
        shared.nodeAdded = function(currentid) {
            console.log("nodeAdded() function deprecated");
            // this.reloadSlickgrid(currentid);
        }

        shared.clearSlickgrid = function() {
            console.log("clearSlickgrid() function deprecated");
            // $rootScope.$broadcast('handleClearSlickgrid');
        }

        shared.reloadSlickgrid = function(nodeid) {
            console.log("reloadSlickgrid() function deprecated");
            // this.reloadId = nodeid;
            // $rootScope.$broadcast('handleReloadSlickgrid');
        }

        shared.reloadOrderSlickgrid = function() {
            console.log("reloadOrderSlickgrid() function deprecated");
            // $rootScope.$broadcast('handleReloadOrderSlickgrid');
        }

        shared.reloadValuationSlickgrid = function() {
            console.log("reloadValuationSlickgrid() function deprecated");
            // $rootScope.$broadcast('handleReloadValuationSlickgrid');
        }
        return shared;
}]);

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
                        // post the new client to the shared service
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

var duplicateModalController = function ($scope, $modalInstance, selections) {

    $scope.selections = selections;

    $scope.skip = function () {
        $scope.selections.overwrite = false;
        $modalInstance.close($scope.selections);
    };

    $scope.overwrite = function () {
        $scope.selections.overwrite = true;
        $modalInstance.close($scope.selections);
    };
};

angular.module('allControllers').controller('duplicateModalController', duplicateModalController);

// Controller for the projects and treeview
allControllers.controller('projectsController',['$scope', '$http', '$cacheFactory', 'globalServerURL', '$rootScope', 'sharedService', '$timeout', '$modal',
    function($scope, $http, $cacheFactory, globalServerURL, $rootScope, sharedService, $timeout, $modal) {

        toggleMenu('projects');
        // variable for disabling submit button after user clicked it
        $scope.isDisabled = false;
        $scope.calculatorHidden = true; // set calculator to be hidden by default
        $scope.rowsSelected = false;    // set selected rows false

        // aux function to test if we can support localstorage
        var hasStorage = (function() {
            try {
                var mod = 'modernizr';
                localStorage.setItem(mod, mod);
                localStorage.removeItem(mod);
                return true;
            }
            catch (exception) {
                return false;
            }
        }());
        // reopen projects that were previously opened upon page load
        $scope.preloadProjects = function () {
            if (hasStorage) {
                open_projects = []
                try {
                    open_projects = JSON.parse(localStorage["open_projects"])
                }
                catch (exception) {
                }
                if ( open_projects.length != 0 ) {
                    for (var i = 0; i < open_projects.length; i++) {
                        var id = open_projects[i];
                        var url = globalServerURL + 'node/' + id + '/'
                        $http.get(url).success(function(data) {
                            if (data.NodeType != 'Project'){
                                $scope.closeProject(id);
                            }
                            else{
                                $scope.projectsRoot.Subitem.push(data);
                                $scope.projectsRoot.Subitem.sort(function(a, b) {
                                    return a.Name.localeCompare(b.Name)
                                });
                            }
                        });
                    }
                }
            }
            else {
                console.log("LOCAL STORAGE NOT SUPPORTED!")
            }
        };
        // build the root for the projects in the tree
        $scope.projectsRoot = {"Name": "Root", "ID": 0, "NodeType":"Root", "Subitem": []};
        $scope.preloadProjects(); // check if anything is stored in local storage

        // load the projects used in the select project modal
        $http.get(globalServerURL + 'projects/').success(function(data) {
            $scope.projectsList = data;
        });

        // load the unit list
        $http.get(globalServerURL + 'units').success(function(data) {
            $scope.unitList = data;
            console.log("Unit list loaded");
        });

        // load the resource types
        $http.get(globalServerURL + 'resourcetypes').success(function(data) {
            $scope.restypeList = data;
            console.log("Resource Type list loaded");
        });

        // load the suppliers list
        $http.get(globalServerURL + 'suppliers').success(function(data) {
            $scope.supplierList = data;
            console.log("Resource Supplier list loaded");
        });

        // load the city list
        $http.get(globalServerURL + 'cities').success(function(data) {
            $scope.cityList = data;
            console.log("City list loaded");
        });

        // load the client list
        $http.get(globalServerURL + 'clients').success(function(data) {
            $scope.clientList = data;
            console.log("Client list loaded");
        });

        $scope.statusMessage = function(message, timeout, type) {
            $('#status_message span').text(message);
            $('#status_message span').addClass(type);
            $('#status_message').show();
            // setting timeout to 0, makes the message sticky, next non-sticky
            // message will clear it.
            if ( timeout != 0 ) {
                window.setTimeout(function () {
                    $("#status_message").hide();
                    $('#status_message span').removeClass(type);
                }, timeout);
            }
        }

        // When a new project is added to the tree
        $scope.projectAdded = function(newproject) {
            if (!(containsObject(newproject, $scope.projectsRoot.Subitem))) {
                // add the new project to the projects and role list and sort
                $scope.projectsList.push(newproject);
                $scope.projectsList.sort(function(a, b) {
                    var textA = a.Name.toUpperCase();
                    var textB = b.Name.toUpperCase();
                    return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
                });

                $scope.projectsRoot.Subitem.push(newproject);
                $scope.projectsRoot.Subitem.sort(function(a, b) {
                    var textA = a.Name.toUpperCase();
                    var textB = b.Name.toUpperCase();
                    return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
                });
                if (hasStorage) {
                    // add id of project to local storage
                    var open_projects;
                    try {
                        // attempt to add an id to open_projects storage
                        open_projects = JSON.parse(localStorage["open_projects"])
                        open_projects.push(newproject.ID);
                        localStorage["open_projects"] = JSON.stringify(open_projects);
                    }
                    catch (exception) {
                        // create a new open_projects storage as one doesnt exist
                        localStorage.setItem("open_projects", []);
                        open_projects = []
                        open_projects.push(newproject.ID);
                        localStorage["open_projects"] = JSON.stringify(open_projects);
                    }
                }
                else {
                    console.log("LOCAL STORAGE NOT SUPPORTED!")
                }
                console.log("Project added");
            }
        };

        // aux function - checks if object is already in list based on ID
        function containsObject(obj, list) {
            for (var i = 0; i < list.length; i++) {
                if (list[i].ID === obj.ID) {
                    return true;
                }
            }
            return false;
        }

        // load the project that has been selected into the tree
        $scope.loadProject = function () {
            var id = $scope.selectedProject;
            var url = globalServerURL + 'node/' + id + '/'
            $http.get(url).success(function(data) {
                if (!(containsObject(data, $scope.projectsRoot.Subitem))) {
                    // add latest select project, if not already in the list
                    $scope.projectsRoot.Subitem.push(data);
                    // sort alphabetically by project name
                    $scope.projectsRoot.Subitem.sort(function(a, b) {
                        var textA = a.Name.toUpperCase();
                        var textB = b.Name.toUpperCase();
                        return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
                    });
                    if (hasStorage) {
                        // add id of project to local storage
                        var open_projects;
                        try {
                            // attempt to add an id to open_projects storage
                            open_projects = JSON.parse(localStorage["open_projects"])
                            open_projects.push(data.ID);
                            localStorage["open_projects"] = JSON.stringify(open_projects);
                        }
                        catch (exception) {
                            // create a new open_projects storage as one doesnt exist
                            localStorage.setItem("open_projects", []);
                            open_projects = []
                            open_projects.push(data.ID);
                            localStorage["open_projects"] = JSON.stringify(open_projects);
                        }
                    }
                    else {
                        console.log("LOCAL STORAGE NOT SUPPORTED!")
                    }
                }
            });
        };

        // Close a project and remove it from the tree
        $scope.closeProject = function (project_id) {
            // clear the slickgrid
            $scope.handleClearSlickgrid();
            var result = $.grep($scope.projectsRoot.Subitem, function(e) {
                return e.ID == project_id;
            });
            var i = $scope.projectsRoot.Subitem.indexOf(result[0]);
            if (i != -1) {
                $scope.projectsRoot.Subitem.splice(i, 1);

            if (hasStorage) {
                // remove id of project that we are closing from storage
                var open_projects = JSON.parse(localStorage["open_projects"])
                var index = open_projects.indexOf(project_id);
                if (index > -1) {
                    console.log("splicing " + project_id);
                   open_projects.splice(index, 1);
                }
                localStorage["open_projects"] = JSON.stringify(open_projects);
            }
            else {
                console.log("LOCAL STORAGE NOT SUPPORTED!")
            }
            }
        };

        // functions used by the treeview
        // --------------------------------------------------------------------
        $scope.overheadList = [];
        // set the collapsed flag to false, this allows horizontal dragging
        // into any node
        $scope.$broadcast('expandAll');

        // set the allowed types to be dropped
        $scope.allowed = {};
        $scope.allowed['Project'] = ['BudgetGroup'];
        $scope.allowed['BudgetGroup'] = ['BudgetGroup', 'BudgetItem'];
        $scope.allowed['BudgetItem'] = ['BudgetItem'];
        $scope.allowed['ResourceCategory'] = ['ResourceCategory', 'Resource'];
        $scope.allowed['Resource'] = [];
        $scope.allowed['Root'] = ['Project'];
        $scope.dragOverNode = {'original': undefined};
        $scope.dragOver = function(node) {
            // check for the previous dragged over node
            if ($scope.dragOverNode.copy != undefined) {
                // reset previous to default values
                $scope.dragOverNode.copy.selected = undefined;
                var original = $scope.dragOverNode.original || {'Subitem': undefined};
                if (original.Subitem != undefined) {
                    $scope.dragOverNode.copy.Subitem = original.Subitem;
                    // $scope.dragOverNode.copy.collapsed = $scope.dragOverNode.original.collapsed;
                }
            }
            // reset original node values
            $scope.dragOverNode.original = {'Subitem': undefined};
            $scope.dragOverNode.copy = node;
            // highlight the parent destination node
            $scope.dragOverNode.copy.selected = 'selected';
            // if the current node has no children add a dummy child
            if ($scope.dragOverNode.copy.Subitem.length == 0) {
                $scope.dragOverNode.original.Subitem = [];
                // $scope.dragOverNode.original.collapsed = false;
                $scope.dragOverNode.copy.Subitem.push({'Name': '', 'NodeType': 'Default'});
                // $scope.dragOverNode.copy.collapsed = true;
            }
            // if the node is collapsed clear the children name
            // else if (!$scope.dragOverNode.copy.collapsed) {
            //     $scope.dragOverNode.original.Subitem = [{'Name': '...', 'NodeType': 'Default'}];
            //     // $scope.dragOverNode.original.collapsed = false;
            //     $scope.dragOverNode.copy.Subitem[0].Name = '';
            //     // $scope.dragOverNode.copy.collapsed = true;
            // }
        }

        // define the tree options for the ui-tree
        $scope.treeOptions = {
            // check if the dropped node can be accepted in the tree
           accept: function(sourceNodeScope, destNodesScope, destIndex) {
                var srctype = sourceNodeScope.$element.attr('data-type');
                var dsttype = destNodesScope.$element.attr('data-type') || 'Root';
                // $scope.treeOptions.draggedOver = destNodesScope.$nodeScope.$modelValue;

                // check the allowed array for the types
                if ($scope.allowed[dsttype]) {
                    if ($scope.allowed[dsttype].indexOf(srctype) > -1) {
                        // call the drag over function
                        if (destNodesScope.$nodeScope) {
                            $scope.dragOver(destNodesScope.$nodeScope.$modelValue);
                        }
                        return true;
                    }
                    else {
                        return false;
                    }
                }
                else {
                    return false;
                }
            },

            // when a node is dropped get the id's and paste in the server
            dropped: function(event) {
                // get the node ids from the model value
                if (event.dest.nodesScope.$nodeScope) {
                    var dest = event.dest.nodesScope.$nodeScope.$modelValue;
                }
                else {
                     var dest = {"ID":0}
                }
                if (event.source.nodesScope.$nodeScope)
                    var srcparent = event.source.nodesScope.$nodeScope.$modelValue.ID;
                else {
                    var srcparent = 0;
                }
                // only paste if it is not the same parent
                if (dest.ID != srcparent) {
                    var parent = event.dest.nodesScope.$nodeScope || null;
                    var destprojectid = undefined;
                    // find the project the destination node is in
                    while (parent != null) {
                        if (parent.$parentNodeScope == null) {
                            destprojectid = parent.$modelValue.ID;
                        }
                        parent = parent.$parentNodeScope;
                    }
                    // find the project the source node is in
                    var parent = event.source.nodesScope.$nodeScope || null;
                    var srcprojectid = undefined;
                    while (parent != null) {
                        if (parent.$parentNodeScope == null) {
                            srcprojectid = parent.$modelValue.ID;
                        }
                        parent = parent.$parentNodeScope;
                    }
                    // set the current node to the one dropped in
                    $scope.currentNode = dest;
                    var src = event.source.nodeScope.$modelValue;
                    // add a flag to the destination parent
                    event.source.nodeScope.$modelValue.destParent = dest.ID;
                    // if it's in the same project, cut
                    if (destprojectid == srcprojectid) {
                        $scope.currentNodeScope = event.source.nodeScope;
                        $scope.cutThisNode(src);
                        $scope.currentNode = dest;
                        $scope.pasteThisNode(dest);
                        // set the flag to indicate that this pasting operation
                        // originated from a drag operation
                        $scope.pastingFromDnd = true;
                    }
                    // otherwise paste
                    else {
                        $scope.copyThisNode(src);
                        $scope.pasteThisNode(dest);
                        // set the flag to indicate the source needs to be added
                        // back to the parent when the node drops
                        $scope.addNodeBack = true;
                        // set the flag to indicate that this pasting operation
                        // originated from a drag operation
                        $scope.pastingFromDnd = true;
                    }
                }
                // clear the drag over value
                if ($scope.dragOverNode != undefined) {
                    if ($scope.dragOverNode.copy != undefined) {
                        $scope.dragOverNode.copy.selected = undefined;
                    }
                }
                $scope.dragOverNode = {'original': undefined};
            },

            dragStart: function(event){
                // collapse the node on drag start
                event.source.nodeScope.$modelValue.collapsed = false;
                event.source.nodeScope.$modelValue.selected = undefined;
                if ($scope.currentNode){
                    $scope.currentNode.selected = undefined;
                }
            },

            dragStop: function(event) {
                if ($scope.addNodeBack) {
                    var sourceobject = event.source.nodeScope.$modelValue;
                    var parent = event.source.nodeScope.$parentNodeScope.$modelValue;
                    var start = 0;
                    // start sorting from index 1 if parent is project
                    if (parent.NodeType == 'Project') {
                        start = 1;
                    }
                    // get the index to insert the node
                    var index = $scope.locationOf(sourceobject, parent.Subitem, start);
                    parent.Subitem.splice(index, 0, sourceobject)
                    $scope.addNodeBack = false;
                }
                if ($scope.currentNode){
                    $scope.currentNode.selected = 'selected';
                }
            },
        };

        // if node head clicks, get the children of the node
        // and collapse or expand the node
        $scope.selectNodeHead = function(selectedNode) {
            // if the node is collapsed, get the data and expand the node
            if (!selectedNode.collapsed) {
                selectedNode.collapsed = true;
                var parentid = selectedNode.ID;
                $http.get(globalServerURL + 'node/' + parentid + '/children/').success(function(data) {
                    selectedNode.Subitem = data;
                    console.log("Children loaded");
                });
            }
            else {
                selectedNode.collapsed = false;
            }
        };

        // if node label clicks,
        $scope.selectNodeLabel = function(scope) {
            // reload the slickgrid
            $scope.handleReloadSlickgrid(scope.$modelValue.ID);
            // sharedService.reloadSlickgrid(scope.$modelValue.ID);
            // set the current scope
            $scope.currentNodeScope = scope;
            // remove highlight from previous node
            if ($scope.currentNode) {
                $scope.currentNode.selected = undefined;
            }
            // set highlight to selected node
            // set currentNode
            $scope.currentNode = scope.$modelValue;
            $scope.currentNode.selected = 'selected';
        };

        $scope.loadOverheads = function(projectid) {
            $http.get(globalServerURL + 'project/' + projectid + '/overheads/')
            .success(function(data) {
                $scope.overheadList = data;
                console.log("Overhead list loaded");
            });
        };

        // load the overheads a budgetitem can use
        $scope.loadBudgetItemOverheads = function(nodeid) {
            var req = {
                method: 'GET',
                url: globalServerURL + 'budgetitem/' + nodeid + '/overheads/'
            }
            $http(req).success(function(data) {
                $scope.budgetItemOverheadList = data;
                console.log("BudgetItem overhead list loaded");
            });
        }

        // delete an overhead by id
        $scope.deleteOverhead = function(overhead) {
            if (overhead.ID){
                var req = {
                    method: 'DELETE',
                    url: globalServerURL + 'overhead/' + overhead.ID + '/'
                }
                $http(req).success(function() {
                    console.log("Overhead deleted");
                });
            }
            else{
                console.log("Overhead removed");
            }
            var index = $scope.overheadList.indexOf(overhead);
            $scope.overheadList.splice(index, 1);
        }

        // add an overhead with the project id
        $scope.addOverhead = function() {
            if ($scope.newOverhead) {
                $scope.overheadList.push({'Name': $scope.newOverhead.Name,
                                        'Percentage': $scope.newOverhead.Percentage})
                $scope.newOverhead = undefined;
            }
        }

        // post the edited overheadlist to the server
        $scope.updateOverheads = function(projectid) {
            if ($scope.newOverhead) {
                $scope.addOverhead();
            }
            var req = {
                method: 'POST',
                url: globalServerURL + 'project/' + projectid + '/overheads/',
                data: {'overheadlist':$scope.overheadList}
            }
            $http(req).success(function() {
                console.log("Overheads updated");
            });
            $scope.newOverhead = undefined;
        }

        // transform the tag to a new resource-like object
        $scope.tagTransform = function (newTag) {
            var item = {
                Name: newTag,
                ID: undefined,
                Description: "",
                Rate: "0.00",
                Quantity: "0",
                Type: undefined
            };
            return item;
        };

        // search for the resources in the node's category that match the search term
        $scope.refreshResources = function(searchterm) {
            if ($scope.currentNode) {
                var req = {
                    method: 'GET',
                    url: globalServerURL + 'project/' + $scope.currentNode.ID + '/resources/',
                    params: {'search': searchterm}
                };
                $http(req).success(function(response) {
                    $scope.resourceList = response;
                });
            }
        }

        $scope.resourceSelected = function(item, nodetype) {
            if (nodetype != 'ResourcePart'){
                var $addBudgetItem = $('#addBudgetItem'),
                    $description = $addBudgetItem.find('#description');
                if (item.ID == undefined) {
                    $scope.addBudgetItemForm.has_selection = false;
                    $description.focus();
                }
                else {
                    $scope.addBudgetItemForm.has_selection = true;
                    $addBudgetItem.find('#inputQuantity').focus();
                }
            }
        };

        // load the lists used in adding/editing a budgetitem
        $scope.loadBudgetItemRelatedList = function(nodeid) {
            $scope.loadBudgetItemOverheads(nodeid);
        };

        // When the addNode button is clicked on the modal a new node
        // is added to the database
        $scope.addNode = function () {
            // check if adding is disabled, if not disable it and add the node
            if (!$scope.isDisabled) {
                $scope.isDisabled = true;
                var currentid = $scope.currentNode.ID;
                // if the node is a budgetitem set the selected data to the form
                if ($scope.formData.NodeType == 'BudgetItem' || $scope.formData.NodeType == 'SimpleBudgetItem') {
                    if ($scope.formData.selected.ID === undefined) {
                        $scope.formData.Quantity = $scope.formData.selected.Quantity;
                        $scope.formData.Rate = $scope.formData.selected.Rate;
                        $scope.formData.Name = $scope.formData.selected.Name;
                        $scope.formData.Description = $scope.formData.selected.Description;
                        $scope.formData.ResourceTypeID = $scope.formData.selected.ResourceTypeID;
                        $scope.formData.NodeType = 'SimpleBudgetItem';
                    }
                    else {
                        $scope.formData.ResourceID = $scope.formData.selected.ID;
                        $scope.formData.Quantity = $scope.formData.selected.Quantity;
                        $scope.formData['OverheadList'] = $scope.budgetItemOverheadList || [];
                        $scope.formData.NodeType = 'BudgetItem';
                    }
                }
                else if ($scope.formData.NodeType == 'ResourcePart') {
                    $scope.formData.ResourceID = $scope.formData.selected.ID;
                    $scope.formData.selected = {};
                }
                $http({
                    method: 'POST',
                    url: globalServerURL + 'node/' + currentid + '/',
                    data: $scope.formData
                }).success(function(response) {
                    $scope.formData = {'NodeType':$scope.formData.NodeType};
                    // if the node parent is the current node
                    var node = response.node;
                    if (node.ParentID == $scope.currentNode.ID) {
                        $scope.handleNew(node);
                    }
                    console.log("Node added");
                });
            }
        };

        $scope.handleNew= function(node) {
            $scope.handleReloadSlickgrid(node.ParentID)
            // expand the node if this is its first child
            if ($scope.currentNode.Subitem.length == 0) {
                $scope.currentNode.collapsed = true;
            }
            // insert the newly created node in the correct place
            var start = 0;
            if ($scope.currentNode.NodeType == 'Project') {
                start = 1;
            }
            var index = $scope.locationOf(node, $scope.currentNode.Subitem, start);
            $scope.currentNode.Subitem.splice(index, 0, node)
        };

        // Add a project to the tree and reload the projectlist
        $scope.addProject = function() {
            $scope.modalState = "Add"
            // check if adding is disabled, if not disable it and add the node
            if (!$scope.isDisabled) {
                $scope.isDisabled = true;
                $http({
                    method: 'POST',
                    url: globalServerURL + 'node/' + '0' + '/',
                    data: $scope.formData
                }).success(function (response) {
                    $scope.formData['ID'] = response['ID'];
                    $scope.formData['NodeTypeAbbr'] = 'P';
                    $scope.formData['Subitem'] = [{'Name': '...'}];
                    $scope.projectAdded($scope.formData);
                    $scope.formData = {'NodeType':$scope.formData['NodeType']};
                });
            }
        };

        $scope.locationOf = function(element, array, start, end) {
            // return the location the object should be inserted in a sorted array
            if ($scope.currentNode.Subitem.length === 0) {
                return 0;
            }

            start = start || 0;
            end = end || array.length;
            var pivot = (start + end) >> 1;
            var c = $scope.nodeCompare(element, array[pivot]);
            if (end - start <= 1) {
                return c == -1 ? pivot: pivot + 1;

            }

            switch (c) {
                case -1: return $scope.locationOf(element, array, start, pivot);
                case 0: return pivot;
                case 1: return $scope.locationOf(element, array, pivot, end);
            };
        };

        $scope.nodeCompare = function (a, b) {
            if (b) {
                if (a.Name.toUpperCase() < b.Name.toUpperCase()) return -1;
                if (a.Name.toUpperCase() > b.Name.toUpperCase()) return 1;
                return 0;
            }
            else {
                return -1;
            }
        };

        // save changes made to the node's properties
        $scope.saveNodeEdits = function() {
            if (!$scope.isDisabled) {
                $scope.isDisabled = true;
                // if the node is a budgetitem set the selected data to the form
                if ($scope.formData.NodeType == 'BudgetItem' || $scope.formData.NodeType == 'SimpleBudgetItem') {
                    $scope.formData.ResourceID = $scope.formData.selected.ID;
                    $scope.formData.Quantity = $scope.formData.selected.Quantity;
                    if ($scope.formData.ResourceID == undefined) {
                        $scope.formData.NodeType == 'SimpleBudgetItem';
                        $scope.formData.Rate = $scope.formData.selected.Rate;
                        $scope.formData.Name = $scope.formData.selected.Name;
                        $scope.formData.Description = $scope.formData.selected.Description;
                        $scope.formData.ResourceTypeID = $scope.formData.selected.ResourceTypeID;
                    }
                    else {
                        $scope.formData.NodeType == 'BudgetItem';
                        $scope.formData.Name = $scope.formData.selected.Name;
                        $scope.formData['OverheadList'] = $scope.budgetItemOverheadList || [];
                    }
                }
                else if ($scope.formData.NodeType == 'ResourcePart') {
                    $scope.formData.Name = $scope.formData.selected.Name;
                    $scope.formData.ResourceID = $scope.formData.selected.ID;
                    $scope.formData.selected = {};
                }
                var req = {
                    method: 'PUT',
                    url: globalServerURL + 'node/' + $scope.currentNode.ID + '/',
                    data: $scope.formData,
                }
                $http(req).success(function(response) {
                    console.log($scope.formData['NodeType'] + " edited")
                    // set the current node name to the name in the modal form
                    if ($scope.currentNode.Name != $scope.formData.Name) {
                        $scope.currentNode.Name = $scope.formData.Name;
                        // only sort if its not a project's resource category
                        var parent = $scope.currentNodeScope.$parentNodeScope || {'$modelValue':{'NodeType':'Project'}};
                        if (!($scope.currentNode.NodeType == 'ResourceCategory' && parent.$modelValue.NodeType == 'Project')) {
                            $scope.currentNodeScope.$parentNodesScope.$modelValue.sort(function(a, b) {
                                var textA = a.Name.toUpperCase();
                                var textB = b.Name.toUpperCase();
                                return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
                            });
                        }
                    }
                    $scope.currentNode.Description = $scope.formData.Description
                    $scope.handleReloadSlickgrid($scope.currentNode.ID);
                });
            }
        };

        // Setting the type of the node to be added
        // refresh it if the type is the same
        // $timeout is used so that the scope is refreshed and the directive
        // reloaded even if the node type is the same
        // reset the formdata to the type
        $scope.changeAddingType = function(nodetype) {
            $scope.calculatorHidden = true;
            if ($scope.addingNodeType == nodetype) {
                $scope.addingNodeType = '';
                $timeout(function() {
                    $scope.changeAddingType(nodetype);
                });
            }
            else {
                $scope.addingNodeType = nodetype;
            }
            $scope.isDisabled = false;
            $scope.modalState = "Add";
            $scope.resourceList = [];
            $scope.formData = {'NodeType': nodetype};
            $scope['add' + nodetype + 'Form'].$setPristine();
        }

        // fetch the properties of the node being edited
        // to populate the respective edit form
        $scope.editNode = function(nodeid) {
            $scope.calculatorHidden = true;
            $scope.modalState = "Edit"
            $scope.isDisabled = false;
            var req = {
                method: 'GET',
                url: globalServerURL + 'node/' + nodeid + '/'
            }
            $http(req).success(function(response) {
                var nodetype = response.NodeType;
                $scope.formData = response;
                // special case for budgetitem types
                if (nodetype == 'BudgetItem') {
                    // populate the selection
                    $scope.refreshResources(response.Name);
                    $scope.formData.selected = response;
                    $scope.formData.selected.ID = response.ResourceID
                    $scope.formData.NodeType = nodetype;
                    $scope.resourceSelected($scope.formData.selected);
                    // update overheadlist
                    $http.get(globalServerURL + 'budgetitem/' + nodeid + '/overheads/')
                    .success(function(data) {
                        $scope.budgetItemOverheadList = data;
                        var overheadlist = response['OverheadList'];
                        var arrayLength = $scope.budgetItemOverheadList.length;
                        for (var i = 0; i < arrayLength; i++) {
                            if (overheadlist.indexOf($scope.budgetItemOverheadList[i].ID) != -1) {
                                $scope.budgetItemOverheadList[i].selected = true;
                            }
                        }
                        $scope.formData['OverheadList'] = $scope.budgetItemOverheadList;
                    });
                }
                else if (nodetype == 'SimpleBudgetItem') {
                    // populate the selection
                    $scope.formData.selected = response;
                    $scope.formData.NodeType = nodetype;
                    nodetype = 'BudgetItem';
                }
                else if (nodetype == 'ResourcePart'){
                    $scope.refreshResources(response.Name);
                    $scope.formData.selected = response;
                    $scope.formData.selected.ID = response.ResourceID
                    $scope.resourceSelected($scope.formData.selected);
                    $scope.formData.NodeType = nodetype;
                }
                $scope.formData.ID = response.ID;
                // set each field dirty
                angular.forEach($scope['add' + nodetype + 'Form'].$error.required, function(field) {
                    field.$setDirty();
                });
            });
        };

        // Deleting a node. It receives the id of the node
        // The id is sent to the server to be deleted and the node
        // removed from the treemodel
        $scope.deleteThisNode = function ( nodeid ) {
            $scope.statusMessage("Deleting " + $scope.currentNode.Name, 0, 'alert-info');
            $http({
                method: 'DELETE',
                url:globalServerURL + 'node/' + nodeid + '/'
            }).success(function (response) {
                $scope.statusMessage("Deleted " + $scope.currentNode.Name, 2000, 'alert-info');
                if ($scope.currentNode.NodeType == 'Project') {
                    $scope.closeProject(nodeid);
                }
                else {
                    $scope.nodeDeleted();
                }
            }).error(function() {
                console.log("Server error");
                $scope.statusMessage("Server error.", 2000, 'alert-warning');
            });
        };

        // Function to copy a node
        $scope.copyThisNode = function(node) {
            $scope.statusMessage(node.Name + " copied.", 2000, 'alert-info');
            $scope.copiedNode = node;
            $scope.cut = false;
            console.log("Node id copied: " + node.ID);
        }

        // Function to cut a node
        // the node is removed from the tree (but not deleted)
        $scope.cutThisNode = function(node) {
            $scope.statusMessage(node.Name + " cut.", 2000, 'alert-info');
            $scope.copiedNode = node;
            console.log("Node id cut: " + node.ID);
            $scope.cut = true;
            $scope.nodeDeleted();
        }

        // handle pasting nodes
        $scope.pasteAction = function(node, selectionlist, index) {
            $http({
                method: 'POST',
                url: globalServerURL + 'node/' + node.ID + '/paste/',
                data:{'ID': $scope.copiedNode.ID,
                        'cut': $scope.cut,
                        'duplicates': selectionlist}
            }).success(function (response) {
                console.log('Success: Node pasted');
                // expand the node if this is its first child
                if ($scope.currentNode.Subitem.length == 0) {
                    $scope.currentNode.collapsed = true;
                }

                // if a project was pasted into the root
                if ($scope.copiedNode.NodeType === 'Project') {
                    var newprojectid = response.newId;
                    $scope.statusMessage($scope.copiedNode.Name + " pasted.", 1000, 'alert-info');
                    // and add it to the open projects
                    $scope.projectAdded(response.node);
                }
                else if (index !== undefined) {
                    // if we pasted the last node of the copied records
                    if (index == $scope.copiedRecords.length-1) {
                        $scope.statusMessage("Records pasted.", 2000, 'alert-info');
                        $scope.handleReloadSlickgrid(node.ID);
                        $scope.loadNodeChildren(node.ID);
                    }
                }
                else {
                    $scope.statusMessage($scope.copiedNode.Name + " pasted.", 2000, 'alert-info');
                    $scope.handleReloadSlickgrid(node.ID);
                    // insert the copied/cut node in the correct destination without reloading
                    // all the children of the parent
                    var pastednode = response['node'];
                    if (!$scope.pastingFromDnd) {
                        if (pastednode) {
                            // insert the newly created node in the correct place
                            var start = 0;
                            if ($scope.currentNode.NodeType == 'Project') {
                                start = 1;
                            }
                            var index = $scope.locationOf(pastednode, $scope.currentNode.Subitem, start);
                            $scope.currentNode.Subitem.splice(index, 0, pastednode)
                        }
                        else if (response.newId) {
                            // if the response id equals the current id
                            // it acts as a signal to reload the node
                            if (node.ID == response.newId) {
                                $scope.loadNodeChildren(node.ID);
                            }
                        }
                    }
                    // otherwise we pasted from a drop
                    else{
                        // check if the placeholder is in the parent, and remove it
                        var result = $.grep($scope.currentNode.Subitem, function(e) {
                            return e.NodeType == 'Default';
                        });
                        var index = $scope.currentNode.Subitem.indexOf(result[0]);
                        if (index>-1) {
                            $scope.currentNode.Subitem.splice(index, 1);
                            // placeholder means parent was an empty node
                            $scope.currentNode.Subitem[0] = pastednode;
                        }
                        else{
                            // find the DOM added node
                            var result = $.grep($scope.currentNode.Subitem, function(e) {
                                return e.destParent == $scope.currentNode.ID;
                            });
                            var index = $scope.currentNode.Subitem.indexOf(result[0]);
                            if (index>-1) {
                                $scope.currentNode.Subitem[index] = pastednode;
                            }
                        }
                    }
                    $scope.pastingFromDnd = false;
                }
            }).error(function() {
                console.log("Server error");
                $scope.statusMessage("Server error.", 2000, 'alert-warning');
            }).then(function() {
                if (index !== undefined) {
                    index+=1;
                    $scope.resolvePastePromise(node, index);
                }
            });
        };

        // loop over a list of duplicate resources and get the user action for each
        $scope.handleDuplicateResourceActions = function(node, duplicatelist, index) {
            var doAll = undefined;
            var overwrite = false;
            var keys = Object.keys(duplicatelist);

            var openModal = function() {
                var modalInstance = $modal.open({
                    templateUrl: 'duplicateConfirmationModal.html',
                    controller: duplicateModalController,
                    resolve: {
                        selections: function () {
                            return $scope.selections;
                        }
                    }
                });
                return modalInstance.result.then(function (selections) {
                    overwrite = selections.overwrite;
                    if (selections.doAll) {
                        doAll = selections.doAll;
                    }
                });
            };
            (function checkItems() {
                // get the first key and remove it from array
                var key = keys.shift();
                var duplicateResource = duplicatelist[key];
                if (doAll == undefined) {
                    // open the modal
                    $scope.selections = {'overwrite': overwrite,
                                        'doAll': doAll,
                                        'resourceName': duplicateResource.Name};
                    // continue when response from modal is returned
                    openModal().finally(function() {
                        selectionlist[duplicateResource.Code] = overwrite;
                        if (keys.length) {
                            checkItems();
                        }
                        else {
                            $scope.pasteAction(node, selectionlist, index);
                        }
                    });
                }
                else {
                    // skip has been selected
                    // set the overwrite to the skip value
                    selectionlist[duplicateResource.Code] = doAll;
                    if (keys.length) {
                        checkItems();
                    }
                    else {
                        $scope.pasteAction(node, selectionlist, index);
                    }
                }
            })();
        };

        // function to paste copied node into another node
        // the id is sent to the server and the node pasted there
        // the user can't paste into the same node
        $scope.pasteThisNode = function(node, index) {
            var cnode = $scope.copiedNode;
            var duplicatelist = undefined;
            var flag = false;
            if (cnode) {
                flag = true;
            }
            if (flag && (cnode.ID == node.ID)) {
                flag = false;
                console.log("You can't paste a node into itself");
                $scope.statusMessage("You can't paste a node into itself", 2000, 'alert-warning');
            }
            // check the allowed array for the types
            if (flag && ($scope.allowed[node.NodeType].indexOf(cnode.NodeType) == -1)) {
                flag = false;
                console.log("You can't paste a " + cnode.NodeType + " into a " + node.NodeType);
                $scope.statusMessage("You can't paste a " + cnode.NodeType + " into a " + node.NodeType, 2000, 'alert-warning');
                // if the index is set, paste the next record
                if (index !== undefined) {
                    index+=1;
                    $scope.resolvePastePromise(node, index);
                }
            }
            if ($scope.cut) {
                $scope.statusMessage("Busy moving...", 0, 'alert-info');
            }
            else {
                $scope.statusMessage("Busy copying...", 0, 'alert-info');
            }
            if (flag && ((cnode.NodeType == 'ResourceCategory') && (node.NodeType == 'ResourceCategory'))) {
                flag = false;
                if (cnode.ParentID == node.ID) {
                    console.log("You can't paste a Resource Category into the same list");
                    $scope.statusMessage("You can't paste a Resource Category into the same list", 2000, 'alert-warning');
                    if (index !== undefined) {
                        index+=1;
                        $scope.resolvePastePromise(node, index);
                    }
                }
                else {
                    // get the resources in the copied category
                    $http.get(globalServerURL + 'resourcecategory/' + cnode.ID + '/resources/')
                    .success(function (response) {
                        var copiedresources = response;
                        // get the resources in the destination category
                        $http.get(globalServerURL + 'resourcecategory/' + node.ID + '/allresources/')
                        .success(function (response) {
                            duplicatelist = [];
                            selectionlist = {};
                            var destinationresources = response;
                            // get a list of the duplicate resources
                            for (var d in destinationresources) {
                                for (var c in copiedresources) {
                                    if (copiedresources[c].Code == destinationresources[d].Code)
                                        duplicatelist.push(copiedresources[c]);
                                }
                            }
                            if (duplicatelist.length > 0) {
                                $scope.handleDuplicateResourceActions(node, duplicatelist, index);
                            }
                            else {
                                $scope.pasteAction(node, {}, index);
                            }
                        });
                    });
                }
            }
            if (flag) {
                $scope.pasteAction(node, {}, index);
            }
        };

        // when a node is deleted clear the slickgrid and remove it from the tree
        $scope.nodeDeleted = function() {
            $scope.currentNode = undefined;
            $scope.currentNodeScope.remove();
            $scope.handleClearSlickgrid();
        }

        // Load the children and add to the tree
        $scope.loadNodeChildren = function(parentid) {
            // if the parent id is 0 reload the projectslist
            if (parentid == 0) {
                $scope.preloadProjects();
            }
            else if ($scope.currentNode) {
                $http.get(globalServerURL + 'node/' + parentid + '/children/')
                .success(function(data) {
                    $scope.currentNode.Subitem = data;
                    console.log("Children loaded");
                });
            }
        }

        $scope.budgetgroupList = [];

        $scope.loadBudgetItemTypes = function() {
            var bitypes = [];
            for (var i in $scope.restypeList) {
                bitypes.push({Name: $scope.restypeList[i].Name, selected: true})
            }
            $scope.budgetItemTypeList = bitypes;
            $scope.printSelectedBudgetGroups = false;
            console.log("Budget Item Type list loaded");
        };

        $scope.loadSuppliers = function() {
            // load the suppliers list
            $scope.suppliersList = [{"Name": "Loading..."}];
            var req = {
                method: 'GET',
                url: globalServerURL + 'suppliers'
            }
            $http(req).success(function(data) {
                $scope.suppliersList = data;
            });
            console.log("Suppliers list loaded");
            $scope.filterBySupplier = false;
        };

        $scope.copySelectedRecords = function(node) {
            // put the id's of the selected records in an array
            if ($scope.rowsSelected) {
                $scope.toggleCopiedRecords($scope.getSelectedNodes(), false);
                $scope.copiedNode = {'NodeType': 'Records'};
                console.log("Records copied");
                $scope.statusMessage("Records copied.", 2000, 'alert-info');
            }
        };

        $scope.cutSelectedRecords = function(node) {
            // put the id's of the selected records in an array
            if ($scope.rowsSelected) {
                var selectedRows = $scope.getSelectedNodes();
                $scope.toggleCopiedRecords(selectedRows, true);
                $scope.copiedNode = {'NodeType': 'Records'};
                // remove rows from slickgrid
                $scope.cutSelectedNodes(selectedRows);
                // get node in scope and remove
                if (selectedRows[0].ID == node.ID) {
                    $scope.nodeDeleted()
                }
                else {
                    for (var i in selectedRows) {
                        var result = $.grep($scope.currentNode.Subitem, function(e) {
                            return e.ID == selectedRows[i].ID;
                        });
                        var index = $scope.currentNode.Subitem.indexOf(result[0]);
                        if (index>-1) {
                            $scope.currentNode.Subitem.splice(index, 1);
                        }
                    }
                }
                console.log("Records cut");
                $scope.statusMessage("Records cut.", 2000, 'alert-info');
            }
        };

        $scope.pasteSelectedRecords = function(node) {
            // start pasting each record
            $scope.resolvePastePromise(node, 0)
        };

        // after operation has finished on pasting a node, paste the next
        // selected node
        $scope.resolvePastePromise = function(node, index) {
            if (index < $scope.copiedRecords.length) {
                $scope.copiedNode = $scope.copiedRecords[index];
                $scope.pasteThisNode(node, index);
            }
        }

        $scope.deleteSelectedRecords = function(nodeid) {
            // all the currently selected records in the slickgrid are
            // deleted from the database and the grid is reloaded
            if ($scope.rowsSelected) {
                var selectedRows = $scope.getSelectedNodes()
                for (var i in selectedRows) {
                    $http({
                        method: 'DELETE',
                        url:globalServerURL + 'node/' + selectedRows[i].ID + '/'
                    }).success(function (response) {
                        // on the last loop reload the slickgrid and node
                        if (i == selectedRows.length-1) {
                            // if the deleted id equals the selected id
                            // simply remove it from the tree
                            if (nodeid == selectedRows[i].ID) {
                                $scope.nodeDeleted();
                            }
                            else {
                                $scope.loadNodeChildren(nodeid);
                                $scope.handleReloadSlickgrid(nodeid);
                            }
                            $scope.statusMessage("Deleted records", 2000, 'alert-info');
                            $scope.toggleRowsSelected(false);
                        }
                    });
                }
            }
        };

        $scope.toggleRowsSelected = function(rowsselected) {
            $timeout(function() {
                $scope.rowsSelected = rowsselected;
            });
        }

        $scope.toggleCopiedRecords = function(copiedrecords, cut) {
            $scope.copiedRecords = copiedrecords;
            $scope.cut = cut;
        }

        $scope.openNodeList = [];
        // load the node that has been selected into the tree for pdf printing
        $scope.loadNodeForPrinting = function (id) {
            $http.get(globalServerURL + 'node/' + id + '/')
            .success(function(data) {
                $scope.openNodeList = [data];
                $scope.selectReportNodeHead(data);
            });
        };

        $scope.getReport = function (report, nodeid) {
            var target = document.getElementsByClassName('pdf_download');
            var spinner = new Spinner().spin(target[0]);
            if ( report == 'projectbudget' ) {
                $scope.formData['BudgetItemTypeList'] = $scope.budgetItemTypeList || [];
                $scope.formData['PrintSelectedBudgerGroups'] = $scope.printSelectedBudgetGroups;
                $scope.formData['BudgetGroupList'] = $scope.budgetgroupList || [];
                var url = globalServerURL + 'project_budget_report/' + nodeid + '/'
            }
            else if ( report == 'costcomparison' ) {
                $scope.formData['PrintSelectedBudgerGroups'] = $scope.printSelectedBudgetGroups;
                $scope.formData['BudgetGroupList'] = $scope.budgetgroupList || [];
                var url = globalServerURL + 'cost_comparison_report/' + nodeid + '/'
            }
            else if ( report == 'resourcelist' ) {
                $scope.formData['FilterBySupplier'] = $scope.filterBySupplier;
                var url = globalServerURL + 'resource_list_report/' + nodeid + '/'
            }
            $http({
                method: 'POST',
                url: url,
                data: $scope.formData},
                {responseType: 'arraybuffer'
            }).success(function (response, status, headers, config) {
                spinner.stop(); // stop the spinner - ajax call complete
                $scope.budgetgroupList = [] // clear selected budget group list
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
                // clear the hidden anchor so that everytime a new report is linked
                anchor.attr({
                    href: '',
                    target: '',
                    download: ''
                });
            }).error(function(data, status, headers, config) {
                console.log("Report pdf download error")
            });
        };

        $scope.toggleBudgetgroup = function(bgroup) {
            // set the budgetgroup selected or unselected
            var flag = (bgroup.selected === true) ? undefined : true;
            bgroup.selected = flag;
            // find the budgetgroup in the budgetgroup list
            var i = $scope.budgetgroupList.map(function(e)
                { return e.id; }).indexOf(bgroup.ID);
            // if the budgetgroup is already in the list
            // and the node is deselected
            if ((i>-1) &(!flag)) {
                // remove it
                $scope.budgetgroupList.splice(i, 1);
            }
            // if the budget group is not in the list
            // and the node is being selected
            else if ((i==-1) & flag) {
                // add the budgetgroup
                $scope.budgetgroupList.push(bgroup);
            }
        }

        // if node head clicks, get the children of the node
        // and collapse or expand the node
        $scope.selectReportNodeHead = function(selectedNode) {
            // if the node is collapsed, get the data and expand the node
            if (!selectedNode.collapsed) {
                selectedNode.collapsed = true;
                var parentid = selectedNode.ID;
                $http.get(globalServerURL + "reports/tree/" + parentid + '/').success(function(data) {
                    selectedNode.Subitem = data;
                    console.log("Children loaded");
                });
            }
            else {
                selectedNode.collapsed = false;
            }
        };

        $scope.toggleCalculator = function() {
            $scope.calculatorHidden = !$scope.calculatorHidden;
        };

}]);

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
allControllers.controller('ordersController', ['$scope', '$http', 'globalServerURL', 'sharedService', '$timeout',
    function($scope, $http, globalServerURL, sharedService, $timeout) {

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
allControllers.controller('invoicesController', ['$scope', '$http', 'globalServerURL', 'sharedService', '$timeout',
    function($scope, $http, globalServerURL, sharedService, $timeout) {

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
allControllers.controller('valuationsController', ['$scope', '$http', 'globalServerURL', 'sharedService', '$timeout',
    function($scope, $http, globalServerURL, sharedService, $timeout) {

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

allControllers.run(['$cacheFactory', function($cacheFactory) {
    $cacheFactory('optimate.resources')
}]);
