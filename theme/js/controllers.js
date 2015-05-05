// angular module that contains all the controllers
var allControllers = angular.module('allControllers', []);

allControllers.value('globalServerURL', 'http://127.0.0.1:8100/');

function toggleMenu(itemclass) {
    $("ul.nav li").removeClass("active");
    $("li."+itemclass).toggleClass("active");
}

// controller for the Company Information data from the server
allControllers.controller('companyinformationController', ['$scope', '$http', '$modal', '$log', 'globalServerURL',
    function($scope, $http, $modal, $log, globalServerURL) {

        toggleMenu('setup');

        var req = {
            method: 'GET',
            url: globalServerURL +'company_information',
        };
        $http(req).success(function(data){
            $scope.company_information = data;
        });        
    }
]);

// controller for the Client data from the server
allControllers.controller('clientsController', ['$scope', '$http', '$modal', '$log', 'globalServerURL',
    function($scope, $http, $modal, $log, globalServerURL) {

        toggleMenu('setup');

        var req = {
            method: 'GET',
            url: globalServerURL +'clients',
        };
        $http(req).success(function(data){
            $scope.jsonclients = data;
        });

        $scope.addNewClient = function(){
            var postdata = {};
            postdata['Name'] = $scope.formData.inputName;
            $scope.formData.inputName = "";
            postdata['Address'] = $scope.formData.inputAddress;
            $scope.formData.inputAddress = "";
            postdata['City'] = $scope.formData.inputCity;
            $scope.formData.inputCity = "";
            postdata['StateProvince'] = $scope.formData.inputStateProvince;
            $scope.formData.inputStateProvince = "";
            postdata['Country'] = $scope.formData.inputCountry;
            $scope.formData.inputCountry = "";
            postdata['Zipcode'] = $scope.formData.inputZip;
            $scope.formData.inputZip = "";
            postdata['Fax'] = $scope.formData.inputFax;
            $scope.formData.inputFax = "";
            postdata['Phone'] = $scope.formData.inputPhone;
            $scope.formData.inputPhone = "";
            postdata['Cellular'] = $scope.formData.inputCellular;
            $scope.formData.inputCellular = "";
            postdata['Contact'] = $scope.formData.inputContact;
            $scope.formData.inputContact = "";

            $http({
                method: 'POST',
                url: globalServerURL +'0/client',
                data:postdata
            }).success(function (response) {
                postdata['ID'] = response['newid'];
                $scope.jsonclients.push(postdata);
                // sort alphabetically by client name
                $scope.jsonclients.sort(function(a, b) {
                    var textA = a.Name.toUpperCase();
                    var textB = b.Name.toUpperCase();
                    return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
                });
            });
        };

        var ModalInstanceCtrl = function ($scope, $modalInstance, editingClient, id) {
          $scope.editingClient = editingClient;

          $scope.editClient = function() {
            $http({
                method: 'PUT',
                url: globalServerURL + id + '/client',
                data:{'Name': $scope.editingClient['Name'],
                        'Address': $scope.editingClient['Address'],
                        'City': $scope.editingClient['City'],
                        'StateProvince': $scope.editingClient['StateProvince'],
                        'Country': $scope.editingClient['Country'],
                        'Zipcode': $scope.editingClient['Zipcode'],
                        'Fax': $scope.editingClient['Fax'],
                        'Phone': $scope.editingClient['Phone'],
                        'Cellular': $scope.editingClient['Cellular'],
                        'Contact': $scope.editingClient['Contact']}
            }).success(function () {
                console.log("edited");
                $scope.editingClient['Name'] = "edited";
            });
            $modalInstance.close();
          };

          $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
          };
        };

        $scope.showActionsFor = function(obj) {
            $scope.selectedClientId = obj.ID;
            $('#client-'+obj.ID).addClass('active').siblings().removeClass('active');
        };

        $scope.getEditClient = function(id) {
            var req = {
            method: 'GET',
            url: globalServerURL + id + '/client',
            };
            $http(req).success(function(data) {
                $scope.editingClient = data;
                var modalInstance = $modal.open({
                    templateUrl: 'editClientModal.html',
                    controller: ModalInstanceCtrl,
                    resolve: {
                        editingClient: function () {
                            return $scope.editingClient;
                        },
                        id: function () {
                            return id;
                        }
                    }
                });
            });
        };

        var ModalInstanceCtrl2 = function ($scope, $modalInstance, deletingClient, id) {
          $scope.deletingClient = deletingClient;

          $scope.deleteClient = function() {
            $http({
                method: 'DELETE',
                url: globalServerURL + id + '/client'
            }).success(function () {
                $("#clients .table tr.ng-scope.active").remove()                
                console.log("deleted client");
            });
            $modalInstance.close();
          };

          $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
          };
        };

        $scope.getDeleteClient = function(id) {
            var req = {
            method: 'GET',
            url: globalServerURL + id + '/client',
            };
            $http(req).success(function(data) {
                $scope.deletingClient = data;

                var modalInstance = $modal.open({
                    templateUrl: 'deleteClientModal.html',
                    controller: ModalInstanceCtrl2,
                    resolve: {
                        deletingClient: function () {
                            return $scope.deletingClient;
                        },
                        id: function () {
                            return id;
                        }
                    }
                });
            });
        };
    }
]);

// Controller for the suppliers page
allControllers.controller('suppliersController', ['$scope', '$http', '$modal', '$log', 'globalServerURL',
    function($scope, $http, $modal, $log, globalServerURL) {

        toggleMenu('setup');

        var req = {
            method: 'GET',
            url: globalServerURL +'suppliers'
        };
        $http(req).success(function(data){
            $scope.jsonsuppliers = data;
        });

        $scope.addNewSupplier = function(){
            var postdata = {};
            postdata['Name'] = $scope.formData.inputName;
            $scope.formData.inputName = "";
            postdata['Address'] = $scope.formData.inputAddress;
            $scope.formData.inputAddress = "";
            postdata['City'] = $scope.formData.inputCity;
            $scope.formData.inputCity = "";
            postdata['StateProvince'] = $scope.formData.inputStateProvince;
            $scope.formData.inputStateProvince = "";
            postdata['Country'] = $scope.formData.inputCountry;
            $scope.formData.inputCountry = "";
            postdata['Zipcode'] = $scope.formData.inputZip;
            $scope.formData.inputZip = "";
            postdata['Fax'] = $scope.formData.inputFax;
            $scope.formData.inputFax = "";
            postdata['Phone'] = $scope.formData.inputPhone;
            $scope.formData.inputPhone = "";
            postdata['Cellular'] = $scope.formData.inputCellular;
            $scope.formData.inputCellular = "";
            postdata['Contact'] = $scope.formData.inputContact;
            $scope.formData.inputContact = "";

            $http({
                method: 'POST',
                url: globalServerURL +'supplier',
                data:postdata
            }).success(function (response) {
                postdata['ID'] = response['newid'];
                $scope.jsonsuppliers.push(postdata);
                // sort alphabetically by supplier name
                $scope.jsonsuppliers.sort(function(a, b) {
                    var textA = a.Name.toUpperCase();
                    var textB = b.Name.toUpperCase();
                    return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
                });
            });
        };

        var ModalInstanceCtrl = function ($scope, $modalInstance, editingSupplier, id) {
          $scope.editingSupplier = editingSupplier;

          $scope.editSupplier = function() {
            $http({
                method: 'PUT',
                url: globalServerURL + id + '/supplier',
                data:{'Name': $scope.editingSupplier['Name'],
                        'Address': $scope.editingSupplier['Address'],
                        'City': $scope.editingSupplier['City'],
                        'StateProvince': $scope.editingSupplier['StateProvince'],
                        'Country': $scope.editingSupplier['Country'],
                        'Zipcode': $scope.editingSupplier['Zipcode'],
                        'Fax': $scope.editingSupplier['Fax'],
                        'Phone': $scope.editingSupplier['Phone'],
                        'Cellular': $scope.editingSupplier['Cellular'],
                        'Contact': $scope.editingSupplier['Contact']}
            }).success(function () {
                console.log("edited");
            });
            $modalInstance.close();
          };

          $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
          };
        };


        $scope.showActionsFor = function(obj) {
            $scope.selectedSupplierId = obj.ID;
            $('#supplier-'+obj.ID).addClass('active').siblings().removeClass('active');
        };

        $scope.getEditSupplier = function(id) {
            var req = {
            method: 'GET',
            url: globalServerURL + id + '/supplier',
            };
            $http(req).success(function(data) {
                $scope.editingSupplier = data;

                var modalInstance = $modal.open({
                    templateUrl: 'editSupplierModal.html',
                    controller: ModalInstanceCtrl,
                    resolve: {
                        editingSupplier: function () {
                            return $scope.editingSupplier;
                        },
                        id: function () {
                            return id;
                        }
                    }
                });
            });
        };

        var ModalInstanceCtrl2 = function ($scope, $modalInstance, deletingSupplier, id) {
          $scope.deletingSupplier = deletingSupplier;

          $scope.deleteSupplier = function() {
            $http({
                method: 'DELETE',
                url: globalServerURL + id + '/supplier'
            }).success(function () {
                $("#suppliers .table tr.ng-scope.active").remove()                
                console.log("deleted supplier");
            });
            $modalInstance.close();
          };

          $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
          };
        };

        $scope.getDeleteSupplier = function(id) {
            var req = {
            method: 'GET',
            url: globalServerURL + id + '/supplier',
            };
            $http(req).success(function(data) {
                $scope.deletingSupplier = data;

                var modalInstance = $modal.open({
                    templateUrl: 'deleteSupplierModal.html',
                    controller: ModalInstanceCtrl2,
                    resolve: {
                        deletingSupplier: function () {
                            return $scope.deletingSupplier;
                        },
                        id: function () {
                            return id;
                        }
                    }
                });
            });
        };
    }
]);

// Controller for loading the list of projects
allControllers.controller('projectlistController',['$scope', '$http', 'globalServerURL',
        function($scope, $http, globalServerURL) {
            // Add a loading value to the project list while it loads
            $scope.projectsList = [{"Name": "Loading..."}];
            var req = {
                method: 'GET',
                url: globalServerURL +'project_listing',
            }
            $http(req).success(function(data) {
                $scope.projectsList = data;
            });
        }
]);

// Angular function that loads a specific project into the treeview
// upon selection from the user
allControllers.controller('treeviewController',['$scope', '$http', 'globalServerURL', '$rootScope',
    function($scope, $http, globalServerURL, $rootScope) {

        toggleMenu('projects');

        // aux function - checks if object is already in list based on ID
        function containsObject(obj, list) {
            var i;
            for (i = 0; i < list.length; i++) {
                if (list[i].ID === obj.ID) {
                    return true;
                }
            }
            return false;
        }
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
        $scope.loadProject = function () {
            var id = $('#project-select').find(":selected").val()
            var url = globalServerURL +'projectview/' + id + '/'
            var req = {
                method: 'GET',
                url: url,
            }
            $http(req).success(function(data) {
                if (!(containsObject(data[0], $scope.roleList))) {
                    // add latest select project, if not already in the list
                    $scope.roleList.push(data[0]);
                    // sort alphabetically by project name
                    $scope.roleList.sort(function(a, b) {
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
                            open_projects.push(data[0].ID);
                            localStorage["open_projects"] = JSON.stringify(open_projects);
                        }
                        catch (exception) {
                            // create a new open_projects storage as one doesnt exist
                            localStorage.setItem("open_projects", []);
                            open_projects = []
                            open_projects.push(data[0].ID);
                            localStorage["open_projects"] = JSON.stringify(open_projects);
                        }
                    }
                    else {
                        console.log("LOCAL STORAGE NOT SUPPORTED!")
                    }
                }
            });
        };
        $scope.closeProject = function (project_id) {
            var result = $.grep($scope.roleList, function(e) {
                return e.ID == project_id;
            });
            var i = $scope.roleList.indexOf(result[0]);
            if (i != -1) {
                $scope.roleList.splice(i, 1);

                if (hasStorage) {
                    // remove id of project that we are closing from storage
                    var open_projects = JSON.parse(localStorage["open_projects"])
                    var index = open_projects.indexOf(project_id);
                    if (index > -1) {
                       open_projects.splice(index, 1);
                    }
                    localStorage["open_projects"] = JSON.stringify(open_projects);
                }
                else {
                    console.log("LOCAL STORAGE NOT SUPPORTED!")
                }
                // blank the data in the info box under the treeview
                $rootScope.currentNode.ID = '';
                $rootScope.currentNode.Description = '';
                $rootScope.currentNode.NodeType = '';
                $scope.$apply() // refresh the tree so that closed project is not shown
            }
        };
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
                    var templist = []
                    for (i = 0; i < open_projects.length; i++) {
                        var id = open_projects[i];
                        var url = globalServerURL +'projectview/' + id + '/'
                        var req = {
                            method: 'GET',
                            url: url,
                        }
                        $http(req).success(function(data) {
                            templist.push(data[0]);
                        });
                    }
                    templist.sort(function(a, b) {
                                var textA = a.Name.toUpperCase();
                                var textB = b.Name.toUpperCase();
                                return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
                            });
                    $scope.roleList = templist;
                }
            }
            else {
                console.log("LOCAL STORAGE NOT SUPPORTED!")
            }
        };
        $scope.roleList = [];
        $scope.preloadProjects(); // check if anything is stored in local storage

        $scope.formData = {};

        $( document ).on( "click", "#select-project-submit", function( e ) {
            $scope.loadProject();
        });
        $( document ).on( "click", ".close-project", function( e ) {
            $scope.closeProject($(this).data("id"));
        });
    }
]);

allControllers.controller('treeviewFunctionsController', ['$scope', '$http', 'globalServerURL', '$rootScope',
    function($scope, $http, globalServerURL, $rootScope) {
        // $scope.copiedId = 0;
        // Watch for when a child is added and refresh the treeview
        $rootScope.$watch('addedChild', function() {
            if ($rootScope.addedChild){
                var nodeid = $rootScope.currentNode.ID;
                $scope.loadNodeChildren(nodeid);
                $rootScope.addedChild = false;
            }
        });

        // Deleting a node. It recieves the id of the node
        // The id is sent to the server to be deleted and the node
        // removed from the treemodel
        $scope.deleteThisNode = function ( nodeid ) {
            console.log($scope.treeModel);
            // var result = $.grep($scope.treeModel, function(e) {
            //     return e.ID == nodeid;
            // });
            // var i = $scope.treeModel.indexOf(result[0]);
            $http({
                method: 'POST',
                url:globalServerURL + nodeid + '/delete'
            }).success(function (response) {
                console.log('Success: Item deleted');
                // $scope.treeModel.splice(i, 1);
            });
        };

        // Function to copy a node
        $scope.copyThisNode = function(cid) {
            if ($scope.$parent.copyThisNode) {
                $scope.$parent.copyThisNode(cid);
            }
            else{
                $scope.copiedId = cid;
                console.log("Node id copied: " + cid);
            }
        }

        $scope.getCopiedId = function(){
            if($scope.copiedId){
                return $scope.copiedId;
            }
            else{
                if ($scope.$parent.getCopiedId){
                    return $scope.$parent.getCopiedId();
                }
                else {
                    return undefined;
                }
            }
        }

        // function to paste copied node into another node
        // the id is sent to the server and the node pasted there
        // the user cant paste into the same node
        $scope.pasteThisNode = function(nodeid) {
            var cnodeid = $scope.getCopiedId();
            if (cnodeid){
                if (cnodeid == nodeid){
                    alert("You can't paste into the same node");
                }
                else {
                    $http({
                        method: 'POST',
                        url: globalServerURL + nodeid + '/paste',
                        data:{'ID': cnodeid}
                    }).success(function () {
                        console.log('Success: Node pasted');
                        $scope.loadNodeChildren(nodeid);
                    }).error(function(){
                        console.log("Server error");
                    });
                }
            }
            else{
                console.log("Id undefined");
            }
        }

        // if node head clicks, get the children of the node
        // and collapse or expand the node
        $scope.selectNodeHead = $scope.selectNodeHead || function( selectedNode ) {
            // if the node is collapsed, get the data and
            // expand the node
            if (!selectedNode.collapsed){
                selectedNode.collapsed = true;
                var parentid = selectedNode.ID;
                $http.get(globalServerURL + parentid + '/').success(function(data) {
                    console.log("Children loaded");
                    selectedNode.Subitem = data;
                });
            }
            else{
                selectedNode.collapsed = false;
            }
        };

        // if node label clicks,
        $scope.selectNodeLabel = $scope.selectNodeLabel || function(selectedNode) {
            // remove highlight from previous node
            if ($rootScope.currentNode) {
                $rootScope.currentNode.selected = undefined;
            }
            // set highlight to selected node
            selectedNode.selected = 'selected';
            // set currentNode
            $rootScope.currentNode = selectedNode;
        };

        // Load the children and add to the tree
        $scope.loadNodeChildren = function(parentid){
            $http.get(globalServerURL + parentid + '/').success(function(data) {
                console.log("Children loaded");
                $rootScope.currentNode.Subitem = data;
            });
        }
    }
]);



// Controller for the modals, handles adding new nodes
allControllers.controller('ModalInstanceCtrl', function ($scope, $rootScope, $http, globalServerURL) {
    $scope.ok = function () {
        var currentId = $rootScope.currentNode.ID;
        inputData = {'Name': $scope.formData.inputName,
                'NodeType':$scope.formData.NodeType,
                'Description': $scope.formData.inputDescription || '',
                'Quantity': $scope.formData.inputQuantity || 0,
                'Markup': $scope.formData.inputMarkup || 0,
                'ComponentType': $scope.formData.inputComponentType || 0}

        $http({
            method: 'POST',
            url: globalServerURL + currentId + '/add',
            data: inputData
        }).success(function () {
            console.log("added");
            $rootScope.addedChild = true;
        });
      };
});


