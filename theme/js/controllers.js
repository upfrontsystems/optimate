// angular module that contains all the controllers
var allControllers = angular.module('allControllers', []);

allControllers.value('globalServerURL', 'http://127.0.0.1:8100/');

// controller for the Client data from the server
allControllers.controller('clientsController', ['$scope', '$http', '$modal', '$log', 'globalServerURL',
    function($scope, $http, $modal, $log, globalServerURL) {

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

        $scope.deleteClient = function(id){
            var req = {
            method: 'DELETE',
            url: globalServerURL + id + '/client',
            };
            $http(req).success(function(data){
                alert("Client deleted")
            });
        };
    }
]);

// Controller for the suppliers page
allControllers.controller('suppliersController', ['$scope', '$http', '$modal', '$log', 'globalServerURL',
    function($scope, $http, $modal, $log, globalServerURL) {
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

        $scope.deleteSupplier = function(id){
            var req = {
            method: 'DELETE',
            url: globalServerURL + id + '/supplier',
            };
            $http(req).success(function(data){
                alert("Supplier deleted")
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
        // Watch for when a child is added and refresh the treeview
        $rootScope.$watch('addedChild', function() {
            if ($rootScope.addedChild){
                var nodeid = $rootScope.currentNode.ID;
                $scope.loadNodeChildren(nodeid);
                $rootScope.addedChild = false;
            }
        });

        // Deleting a node. It recieves the index of the node
        // The id is sent to the server to be deleted and the node
        // removed from the treemodel
        $scope.deleteThisNode = function ( idx ) {
            var nodeid = $scope.treeModel[idx].ID;
            $http({
                method: 'POST',
                url:globalServerURL + nodeid + '/delete'
            }).success(function (response) {
                console.log('Success: Item deleted');
                $scope.treeModel.splice(idx, 1);
            });
        };

        // Function to copy a node
        $scope.copyThisNode = function(cnode) {
            $rootScope.copiednodeid = cnode;
            console.log("Path that is copied: " + cnode);
        }

        // function to paste copied node into another node
        // the id is sent to the server and the node pasted there
        // the user cant paste into the same node
        $scope.pasteThisNode = function(nodeid) {
            if ($rootScope.copiednodeid){
                var cnodeid = $rootScope.copiednodeid;
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
                    });
                }
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
])

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

// Directive for the custom modals, the html for the relevant modal is loaded
// from the directive attribute and compiled
allControllers.directive('customModals', function ($http, $compile) {
    return {
        restrict: 'A',
        require: '?ngModel',
        transclude: true,
        scope:{
            ngModel: '='
        },
        templateUrl: '',
        controller: 'ModalInstanceCtrl',
        link: function(scope, el, attrs, transcludeFn){
            scope.formData = {'NodeType': attrs.modalType};
            $http.get(attrs.modalSrc).success(function (response) {
                $compile(response)(scope, function(compliledElement, scope){
                    el.append(compliledElement);
                });
            });
        }
    };
});

// Directive for the slickgrid
allControllers.directive('projectslickgridjs', ['globalServerURL', function(globalServerURL) {
    return {
        require: '?ngModel',
        restrict: 'E',
        replace: true,
        template: '<div></div>',
        link: function($scope, element, attrs) {

            var grid;
            var data = [];
            var cell_large = 300;
            var cell_medium = 75;
            var cell_small = 50;
            var columns = [
                    {id: "name", name: "Name", field: "name",
                     width: cell_large, cssClass: "cell-title non-editable-column"},
                    {id: "quantity", name: "Quantity", field: "quantity", cssClass: "cell editable-column",
                     width: cell_medium, editor: Slick.Editors.CustomEditor},
                    {id: "rate", name: "Rate", field: "rate",
                     width: cell_small, cssClass: "cell non-editable-column", formatter: CurrencyFormatter},
                    {id: "budg_cost", name: "Total", field: "budg_cost",
                     width: cell_medium, cssClass: "cell non-editable-column", formatter: CurrencyFormatter},
                    {id: "markup", name: "Markup", field: "markup", cssClass: "cell  editable-column",
                     width: cell_medium, formatter: MarkupFormatter, editor: Slick.Editors.CustomEditor},
                    {id: "order_cost", name: "Order Cost", field: "order_cost",
                     width: cell_medium, cssClass: "cell non-editable-column", formatter: CurrencyFormatter},
                    {id: "run_cost", name: "Run Cost", field: "run_cost",
                     width: cell_medium, cssClass: "cell non-editable-column", formatter: CurrencyFormatter},
                    {id: "claim_cost", name: "Claim Cost", field: "claim_cost",
                     width: cell_medium, cssClass: "cell non-editable-column", formatter: CurrencyFormatter},
                    {id: "income_rec", name: "Income Rec", field: "income_rec",
                     width: cell_medium, cssClass: "cell non-editable-column", formatter: CurrencyFormatter},
                    {id: "client_cost", name: "Client Cost", field: "client_cost",
                     width: cell_medium, cssClass: "cell non-editable-column", formatter: CurrencyFormatter},
                    {id: "proj_profit", name: "Proj. Profit", field: "proj_profit",
                     width: cell_medium, cssClass: "cell non-editable-column", formatter: CurrencyFormatter},
                    {id: "act_profit", name: "Act. Profit", field: "act_profit",
                     width: cell_medium, cssClass: "cell non-editable-column", formatter: CurrencyFormatter},
                ];

            var options = {
                    editable: true,
                    enableAddRow: true,
                    enableCellNavigation: true,
                    asyncEditorLoading: true,
                    autoEdit: true,
                    syncColumnCellResize: true,
                    enableColumnReorder: true,
                };

            data = []
            dataView = new Slick.Data.DataView();
            grid = new Slick.Grid("#optimate-data-grid", dataView, columns, options);
            grid.setSelectionModel(new Slick.CellSelectionModel());

            // show tooltips on hover if the cellsize is so small, that an ellipsis
            // '...' is being shown.
            autotooltips_plugin = new Slick.AutoTooltips({enableForHeaderCells: true})
            grid.registerPlugin(autotooltips_plugin);

            dataView.onRowCountChanged.subscribe(function (e, args) {
              grid.updateRowCount();
              grid.render();
            });

            dataView.onRowsChanged.subscribe(function (e, args) {
              grid.invalidateRows(args.rows);
              grid.render();
            });

            // Formatter for displaying markup
            function MarkupFormatter(row, cell, value, columnDef, dataContext) {
                if (value != undefined){
                    return value + " %";
                }
                else{
                    return "";
                }
              }

            // Formatter for displaying currencies
            function CurrencyFormatter(row, cell, value, columnDef, dataContext) {
                if (value != undefined){
                    var parts = value.toString().split(".");
                    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                    return parts.join(".");
                }
                else {
                    return "";
                }
              }

            grid.onAddNewRow.subscribe(function (e, args) {
                var item = args.item;
                grid.invalidateRow(data.length);
                data.push(item);
                grid.updateRowCount();
                grid.render();
            });

            // eventhandler to update grid data when a tree node is clicked
            $( document ).on( "click", ".treenode", function( e ) {
                var nodeid = $(this).attr('ID');
                var url = globalServerURL +'nodegridview/' + nodeid + '/'
                $.ajax({
                    url: url,
                    dataType: "json",
                    success: function(response) {
                        var newcolumns = [];
                        var data = response['list'];
                        // Get the value that indicated
                        // whether there are empty columns
                        var emptycolumns = response['emptycolumns'];
                        if (data.length > 0){
                            if (data[0]['node_type'] == 'Resource'){
                                newcolumns = [
                                    {id: "name", name: "Name", field: "name",
                                     width: cell_large, cssClass: "cell-title non-editable-column"},
                                    {id: "rate", name: "Rate", field: "rate", cssClass: "cell editable-column",
                                     width: cell_small, formatter: CurrencyFormatter, editor: Slick.Editors.Float},
                                ];

                                grid.setColumns(newcolumns);
                                dataView.beginUpdate();
                                dataView.setItems(data);
                                dataView.endUpdate();
                                grid.render();
                            }
                            else {
                                // if there will be empty columns remove them
                                if (emptycolumns){
                                    newcolumns = [
                                        {id: "name", name: "Name", field: "name",
                                         width: cell_large, cssClass: "cell-title non-editable-column"},
                                        {id: "budg_cost", name: "Total", field: "budg_cost",
                                         width: cell_medium, cssClass: "cell non-editable-column", formatter: CurrencyFormatter},
                                        {id: "order_cost", name: "Order Cost", field: "order_cost",
                                         width: cell_medium, cssClass: "cell non-editable-column", formatter: CurrencyFormatter},
                                        {id: "run_cost", name: "Run Cost", field: "run_cost",
                                         width: cell_medium, cssClass: "cell non-editable-column", formatter: CurrencyFormatter},
                                        {id: "claim_cost", name: "Claim Cost", field: "claim_cost",
                                         width: cell_medium, cssClass: "cell non-editable-column", formatter: CurrencyFormatter},
                                        {id: "income_rec", name: "Income Rec", field: "income_rec",
                                         width: cell_medium, cssClass: "cell non-editable-column", formatter: CurrencyFormatter},
                                        {id: "client_cost", name: "Client Cost", field: "client_cost",
                                         width: cell_medium, cssClass: "cell non-editable-column", formatter: CurrencyFormatter},
                                        {id: "proj_profit", name: "Proj. Profit", field: "proj_profit",
                                         width: cell_medium, cssClass: "cell non-editable-column", formatter: CurrencyFormatter},
                                        {id: "act_profit", name: "Act. Profit", field: "act_profit",
                                         width: cell_medium, cssClass: "cell non-editable-column", formatter: CurrencyFormatter},
                                    ];

                                    grid.setColumns(newcolumns);
                                    dataView.beginUpdate();
                                    dataView.setItems(data);
                                    dataView.endUpdate();
                                    grid.render();
                                }
                                // otherwise loop through the data and grey out
                                // uneditable columns
                                else {
                                    newcolumns = columns;

                                    grid.setColumns(newcolumns);
                                    dataView.beginUpdate();
                                    dataView.setItems(data);
                                    dataView.endUpdate();

                                    for (var i=0; i < data.length; i++){
                                        if (data[i]['node_type'] == 'BudgetGroup'){
                                            grid.setCellCssStyles("non-editable-cell", {
                                               i: {
                                                    quantity: 'cell non-editable-column',
                                                    markup: 'cell non-editable-column'
                                                   },
                                            });
                                        }
                                    }
                                    grid.render();
                                }
                            }
                        }
                        else {
                            newcolumns = columns;
                            grid.setColumns(newcolumns);
                            dataView.beginUpdate();
                            dataView.setItems(data);
                            dataView.endUpdate();
                            grid.render();
                        }
                        console.log("Slickgrid data loaded");
                    }
                });
            });

            // eventhandler to blank grid data when a project is closed
            $( document ).on( "click", ".close-project", function( e ) {
                dataView.beginUpdate();
                dataView.setItems([]);
                dataView.endUpdate();
                grid.render();
            });

            grid.onCellChange.subscribe(function (e, ctx) {
                var item = ctx.item
                $.ajax({
                    url: globalServerURL +'update_value/' + item.id + '/',
                    data: item,
                    dataType: "json",
                    success: function(data) {
                        console.log('id_'+ item.id + ' updated')
                    },
                });
            });
        }
    }
}]);
